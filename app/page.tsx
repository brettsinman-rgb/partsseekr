import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import UploadCapture from '@/app/components/UploadCapture';
import AutoBrandTicker from '@/app/components/AutoBrandTicker';
import AdSlot from '@/app/components/AdSlot';
import UserMenu from '@/app/components/UserMenu';
import { prisma } from '@/lib/db';
import { getLatestDevSessions } from '@/lib/dev-session-store';
import { createClient } from '@/lib/supabase/server';
import { hashString } from '@/lib/utils';

type PreviousSearchItem = {
  id: string;
  createdAt: Date;
  title: string;
  image: string;
  productUrl: string;
};

function getClientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return headers.get('x-real-ip') ?? 'unknown';
}

async function getPreviousSearches(): Promise<PreviousSearchItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If no user is logged in, we no longer show IP-based history
  if (!user) {
    return [];
  }

  const headerList = await headers();
  const ip = getClientIp(headerList);
  const ipHash = ip === 'unknown' ? null : hashString(ip);

  const mapSessionToItem = (
    session: { createdAt: Date; results: PreviousSearchItem[]; clicks?: Array<{ result?: PreviousSearchItem | null }> }
  ): PreviousSearchItem | null => {
    const mostRecentViewedResult = session.clicks?.[0]?.result ?? null;
    const fallbackTopResult = session.results[0] ?? null;
    const chosenResult = mostRecentViewedResult ?? fallbackTopResult;
    if (!chosenResult?.productUrl) return null;
    return {
      id: chosenResult.id,
      createdAt: session.createdAt,
      title: chosenResult.title,
      image: chosenResult.image,
      productUrl: chosenResult.productUrl
    };
  };

  try {
    noStore();
    
    // Privacy Logic: Show only searches for this userId
    const whereClause = { userId: user.id, status: 'complete' };

    const dbSessions = await prisma.searchSession.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        clicks: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            result: {
              select: {
                id: true,
                title: true,
                image: true,
                productUrl: true
              }
            }
          }
        },
        results: {
          take: 1,
          orderBy: [{ matchScore: 'desc' }, { price: 'asc' }],
          select: {
            id: true,
            title: true,
            image: true,
            productUrl: true
          }
        }
      }
    });

    const dbItems = dbSessions
      .map((session) =>
        mapSessionToItem({
          createdAt: session.createdAt,
          clicks: session.clicks.map((click) => ({
            result: click.result
              ? {
                  id: click.result.id,
                  createdAt: session.createdAt,
                  title: click.result.title,
                  image: click.result.image,
                  productUrl: click.result.productUrl
                }
              : null
          })),
          results: session.results.map((result) => ({
            id: result.id,
            createdAt: session.createdAt,
            title: result.title,
            image: result.image,
            productUrl: result.productUrl
          }))
        })
      )
      .filter((item): item is PreviousSearchItem => Boolean(item));

    const devItems = getLatestDevSessions(5)
      .filter((session) => session.status === 'complete')
      .map((session) => {
        const topResult = [...session.results]
          .sort((a, b) => b.matchScore - a.matchScore || a.price - b.price)[0];
        if (!topResult?.productUrl) return null;
        return {
          id: topResult.id,
          createdAt: session.createdAt,
          title: topResult.title,
          image: topResult.image,
          productUrl: topResult.productUrl
        };
      })
      .filter((item): item is PreviousSearchItem => Boolean(item));

    return [...dbItems, ...devItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);
  } catch {
    return getLatestDevSessions(5)
      .filter((session) => session.status === 'complete')
      .map((session) => {
        const topResult = [...session.results]
          .sort((a, b) => b.matchScore - a.matchScore || a.price - b.price)[0];
        if (!topResult?.productUrl) return null;
        return {
          id: topResult.id,
          createdAt: session.createdAt,
          title: topResult.title,
          image: topResult.image,
          productUrl: topResult.productUrl
        };
      })
      .filter((item): item is PreviousSearchItem => Boolean(item))
      .slice(0, 5);
  }
}

export default async function Home() {
  const previousSearches = await getPreviousSearches();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-end mb-6">
          <UserMenu />
        </div>
        <div className="flex flex-col gap-10">
          <div className="relative overflow-hidden rounded-[28px] bg-white/90 p-4 shadow-[0_24px_80px_-44px_rgba(38,38,38,0.55)] ring-1 ring-black/5 backdrop-blur fade-up sm:p-6 lg:p-8">
            <div className="relative flex flex-col items-center gap-4 text-center">
              <div className="mx-auto w-[190px] sm:w-[220px]">
                <div className="relative h-[58px] w-full sm:h-[68px]">
                  <Image
                    src="/logos/PartsSeekr-Logo.png"
                    alt="Parts Seekr logo"
                    fill
                    sizes="250px"
                    className="object-contain"
                    priority
                  />
                </div>
              </div>
              <h1 className="max-w-4xl text-[28px] font-bold leading-[1.12] text-[#262626] sm:text-4xl md:text-[46px]">
                Searching for an OEM part?
              </h1>
              <p className="max-w-3xl text-[18px] font-medium leading-[1.22] text-[#262626] sm:text-2xl md:text-[30px]">
                Parts Seekr discovers the best pricing instantly.
              </p>
              <p className="max-w-2xl text-sm font-normal leading-6 text-[#262626]/70 md:text-[15px]">
                Search by part name, OEM number, or vehicle description. <span className="font-bold text-[#0FF7D0]">Parts Seekr</span> scans verified listings and sorts the best prices by value.
              </p>
            </div>
            <div className="relative mt-6">
              <UploadCapture />
            </div>
          </div>
          {!user && (
            <section className="flex min-h-[76px] items-center justify-center px-4 text-center fade-up fade-up-delay-1">
              <p className="max-w-3xl text-sm font-normal leading-6 text-[#262626]/65 sm:text-[15px]">
                Save searches, track prices and access results across all devices.{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-[#262626] underline decoration-[#0FF7D0]/45 underline-offset-4 transition hover:text-[#0CC6A6] hover:decoration-[#0FF7D0]"
                >
                  Create a free account →
                </Link>
              </p>
            </section>
          )}
          {user && previousSearches.length > 0 && (
            <section className="rounded-3xl border border-[#0FF7D0] bg-white/80 px-6 py-5 shadow-soft fade-up fade-up-delay-1">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#262626]/70">
                    Your history
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#262626]">
                    Continue your search
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {previousSearches.map((item) => (
                  <article
                    key={item.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#0FF7D0] bg-white"
                  >
                    <div className="relative h-32 w-full bg-white">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-3">
                      <h3 className="line-clamp-2 text-sm font-semibold text-[#262626]">{item.title}</h3>
                      <p className="text-[10px] text-[#262626]/70">
                        {new Intl.DateTimeFormat(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        }).format(item.createdAt)}
                      </p>
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center justify-center rounded-full bg-[#0FF7D0]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#0FF7D0]"
                      >
                        View listing
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className="rounded-3xl border border-[#0FF7D0] bg-white/80 px-6 py-10 shadow-soft fade-up fade-up-delay-1">
            <div className="mx-auto max-w-3xl text-center">
              <p className="display-font text-xl font-semibold text-[#262626] md:text-2xl">
                We scour <span className="font-bold text-[#0FF7D0]">hundreds of parts from trusted sellers</span>, so you can get back to chasing that oil leak.
              </p>
            </div>
          </div>
          <AdSlot size="970x250" mobileSize="320x100" placement="home-mid-banner" className="py-2" />
          <AutoBrandTicker />
        </div>
      </div>
    </main>
  );
}
