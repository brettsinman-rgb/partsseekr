import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { prisma } from '@/lib/db';
import { getProviders } from '@/lib/providers';
import { dedupeResults, normalizeCandidates, sortResults } from '@/lib/normalize';
import { buildSearchQueryPlan } from '@/lib/search-query';
import { hashBuffer, hashString, sanitizeUrl } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';
import { uploadToSupabase } from '@/lib/storage';
import { createDevSession, saveDevResults, updateDevSessionStatus } from '@/lib/dev-session-store';
import { createClient } from '@/lib/supabase/server';

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp'];

export const runtime = 'nodejs';

async function resolveFinalUrl(url: string) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // Increased to 5s
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal
    }).catch(async () => {
      return fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    });
    clearTimeout(timeout);
    const finalUrl = response?.url ?? url;
    if (finalUrl !== url) {
      console.log(`[Search] Resolved URL: ${url} -> ${finalUrl}`);
    }
    return finalUrl;
  } catch (e) {
    console.log(`[Search] Failed to resolve URL: ${url} - ${e instanceof Error ? e.message : 'Unknown error'}`);
    return url;
  }
}

function shouldResolveUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (host.includes('serpapi.com')) return true;
    if (host.includes('google.com') || host.includes('googleusercontent.com')) return true;
    if (parsed.pathname.includes('/url')) return true;
    return false;
  } catch {
    return false;
  }
}

function getClientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);
  const rate = rateLimit(ip);

  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('image');
  const query = String(formData.get('query') ?? '').trim();
  const country = String(formData.get('country') ?? '').trim();

  if ((!file || !(file instanceof File)) && !query) {
    return NextResponse.json({ error: 'Provide an image or a search query.' }, { status: 400 });
  }

  if (file instanceof File) {
    if (file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Video files are not supported. Please upload a JPG, PNG, or WebP image.' }, { status: 400 });
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Use JPG, PNG, or WebP.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large. Max size is 8MB.' }, { status: 400 });
    }
  }

  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : null;
  const imageBase64 = buffer ? buffer.toString('base64') : undefined;
  const imageHash = buffer ? hashBuffer(buffer) : hashString(`text:${query.toLowerCase()}`);

  const origin = process.env.NEXT_PUBLIC_BASE_URL ?? new URL(request.url).origin;
  let imageUrl = `/placeholder.svg`;

  // Get authenticated user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Ensure user exists in local DB if authenticated
  if (user) {
    try {
      // First, try to find the user by email to handle ID mismatches
      const existingUser = await prisma.user.findUnique({
        where: { email: user.email! }
      });

      if (existingUser) {
        if (existingUser.id !== user.id) {
          // If ID changed (e.g. Supabase account recreation), update the record
          // We use a transaction to ensure sessions are preserved if possible, 
          // but since ID is a PK and FK target, we update it directly.
          await prisma.user.update({
            where: { email: user.email! },
            data: { id: user.id }
          });
        } else {
          // ID matches, just update email if needed (though it should be the same)
          await prisma.user.update({
            where: { id: user.id },
            data: { email: user.email! }
          });
        }
      } else {
        // No user with this email, safe to create
        await prisma.user.create({
          data: { id: user.id, email: user.email! }
        });
      }
    } catch (e) {
      console.error('Failed to sync user to local DB:', e);
      // We don't throw here to allow anonymous-like search if DB sync fails,
      // but the subsequent session creation might still fail if it tries to use user.id
    }
  }

  if (buffer && file instanceof File) {
    const filename = `${imageHash}-${Date.now()}.${file.type.split('/')[1]}`;
    const uploadedUrl = await uploadToSupabase(buffer, filename, file.type);
    if (uploadedUrl) {
      imageUrl = uploadedUrl;
    } else {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, filename);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${filename}`;
    }
  }

  let sessionId: string | null = null;
  let useDatabase = true;

  try {
    let session: { id: string };
    try {
      const dbSession = await prisma.searchSession.create({
        data: {
          userId: user?.id || null,
          imageUrl,
          imageHash,
          query: query || null,
          country: country || null,
          userAgent: request.headers.get('user-agent'),
          ipHash: ip === 'unknown' ? null : hashString(ip),
          status: 'processing'
        }
      });
      session = { id: dbSession.id };
      useDatabase = true;
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Database unavailable.');
      }
      const devSession = createDevSession({
        imageUrl,
        query: query || null,
        country: country || null,
        status: 'processing'
      });
      session = { id: devSession.id };
      useDatabase = false;
    }
    sessionId = session.id;

    const providers = getProviders().filter((provider) => {
      if (provider.id === 'ebay') {
        return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
      }
      if (provider.id === 'aliexpress') {
        return Boolean(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET && process.env.ALIEXPRESS_TRACK_ID);
      }
      return true;
    });
    if (providers.length === 0) {
      if (useDatabase) {
        await prisma.searchSession.update({ where: { id: session.id }, data: { status: 'failed' } });
      } else {
        updateDevSessionStatus(session.id, 'failed');
      }
      return NextResponse.json({ error: 'No search providers are configured.' }, { status: 500 });
    }
    const searchOptions = {
      country: country && country !== 'WORLD' ? country : undefined
    };
    const queryPlan = query ? buildSearchQueryPlan(query) : null;
    if (queryPlan) {
      console.log(
        `[Search] Query classified as ${queryPlan.kind}; variants: ${queryPlan.variants.join(' | ')}`
      );
    }
    const providerResults = await Promise.all(
      providers.map(async (provider) => {
        try {
          const candidates = queryPlan
            ? (
                await Promise.all(
                  queryPlan.variants.map((variant) => provider.searchByText?.(variant, searchOptions) ?? [])
                )
              ).flat()
            : (await provider.searchByImage?.(imageUrl, searchOptions, imageBase64)) ?? [];
          
          console.log(`[Search] Provider ${provider.id} returned ${candidates.length} candidates`);
          
          const candidateLookup = new Map<string, (typeof candidates)[number]>();
          for (const candidate of candidates) {
            if (candidate.productUrl && !candidateLookup.has(candidate.productUrl)) {
              candidateLookup.set(candidate.productUrl, candidate);
            }
          }
          const uniqueCandidates = Array.from(candidateLookup.values());

          const normalized = normalizeCandidates(uniqueCandidates, queryPlan?.original).map((item) => ({
            ...item,
            providerId: provider.id
          }));
          
          console.log(`[Search] Provider ${provider.id} has ${normalized.length} normalized results`);
          
          const raw = uniqueCandidates
            .filter((item) => item.productUrl)
            .map((item) => [item.productUrl as string, item.raw] as const);
          return { providerId: provider.id, normalized, raw };
        } catch (e) {
          console.error(`[Search] Provider ${provider.id} failed:`, e);
          return { providerId: provider.id, normalized: [], raw: [] };
        }
      })
    );

    const combined = dedupeResults(
      providerResults.flatMap((item) => item.normalized)
    );
    console.log(`[Search] Combined results after dedupe: ${combined.length}`);

    const sorted = sortResults(combined, 'best')
      .map((item) => ({ ...item, productUrl: sanitizeUrl(item.productUrl) }))
      .filter((item) => item.productUrl);

    const finalResults = await Promise.all(
      sorted.map(async (item) => {
        if (!item.productUrl) return item;
        const resolvedUrl = shouldResolveUrl(item.productUrl)
          ? await resolveFinalUrl(item.productUrl)
          : item.productUrl;
        return { ...item, productUrl: resolvedUrl };
      })
    );
    console.log(`[Search] Results after URL resolution: ${finalResults.length}`);

    const filteredResults = finalResults.filter((item) => {
      if (!item.productUrl) return false;
      try {
        const parsed = new URL(item.productUrl);
        // Only filter out actual Google search result pages
        if (parsed.hostname.includes('google.com') && parsed.pathname.includes('/search')) {
          return false;
        }
        // Allow redirects that are likely direct product links
        if (parsed.hostname.includes('google.com') && parsed.pathname.includes('/url')) {
          const urlParam = parsed.searchParams.get('q') || parsed.searchParams.get('url');
          if (urlParam && !urlParam.includes('google.com/search')) {
             return true;
          }
          return false;
        }
        return true;
      } catch {
        return false;
      }
    });
    console.log(`[Search] Final filtered results: ${filteredResults.length}`);

    const resultsToSave = filteredResults.length > 0 ? filteredResults : finalResults;

    if (resultsToSave.length === 0) {
      console.log(`[Search] No results to save. providerResults count: ${providerResults.reduce((acc, p) => acc + p.normalized.length, 0)}, finalResults count: ${finalResults.length}, filteredResults count: ${filteredResults.length}`);
      if (useDatabase) {
        await prisma.searchSession.update({ where: { id: session.id }, data: { status: 'empty' } });
      } else {
        updateDevSessionStatus(session.id, 'empty');
      }
      return NextResponse.json({ sessionId: session.id });
    }

    console.log(`[Search] Saving ${resultsToSave.length} results to session ${session.id}`);

    const rawLookup = new Map<string, unknown>();
    for (const providerResult of providerResults) {
      for (const [url, raw] of providerResult.raw) {
        rawLookup.set(`${providerResult.providerId}:${url}`, raw);
      }
    }

    if (useDatabase) {
      await prisma.searchResult.createMany({
        data: resultsToSave.map((item) => ({
          sessionId: session.id,
          title: item.title,
          brand: item.brand,
          image: item.image,
          store: item.store,
          price: item.price,
          currency: item.currency,
          shippingPrice: item.shippingPrice,
          condition: item.condition,
          availability: item.availability,
          rating: item.rating,
          reviewCount: item.reviewCount,
          marketplace: (item as { marketplace?: string }).marketplace,
          productUrl: item.productUrl as string,
          matchScore: item.matchScore,
          rawProvider: (item as { providerId?: string }).providerId ?? 'unknown',
          rawJson: JSON.stringify(
            rawLookup.get(`${(item as { providerId?: string }).providerId}:${item.productUrl}`) ?? {}
          )
        }))
      });

      await prisma.searchSession.update({ where: { id: session.id }, data: { status: 'complete' } });
    } else {
      saveDevResults(
        session.id,
        resultsToSave.map((item) => ({
          id: `${session.id}-${Math.random().toString(36).slice(2, 10)}`,
          sessionId: session.id,
          title: item.title,
          brand: item.brand ?? null,
          image: item.image,
          store: item.store,
          price: item.price,
          currency: item.currency,
          shippingPrice: item.shippingPrice ?? null,
          condition: item.condition ?? null,
          availability: item.availability ?? null,
          rating: item.rating ?? null,
          reviewCount: item.reviewCount ?? null,
          marketplace: (item as { marketplace?: string }).marketplace ?? null,
          productUrl: item.productUrl as string,
          matchScore: item.matchScore,
          rawProvider: (item as { providerId?: string }).providerId ?? 'unknown',
          rawJson: JSON.stringify(
            rawLookup.get(`${(item as { providerId?: string }).providerId}:${item.productUrl}`) ?? {}
          )
        }))
      );
      updateDevSessionStatus(session.id, 'complete');
    }

    return NextResponse.json({ sessionId: session.id });
  } catch {
    if (sessionId) {
      if (useDatabase) {
        await prisma.searchSession.update({ where: { id: sessionId }, data: { status: 'failed' } }).catch(() => {});
      } else {
        updateDevSessionStatus(sessionId, 'failed');
      }
      return NextResponse.json({ error: 'Search provider failed. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ error: 'Database unavailable. Check DATABASE_URL and Supabase credentials.' }, { status: 503 });
  }
}
