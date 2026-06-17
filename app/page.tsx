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
          <div className="relative overflow-hidden rounded-[32px] border border-[#5ec2a4] bg-white/80 p-5 sm:p-10 shadow-soft backdrop-blur fade-up">
            <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#81dcc1]/10 blur-3xl" />
            <div className="absolute -right-20 top-10 h-40 w-40 rounded-full bg-[#81dcc1]/10 blur-3xl" />
            <div className="relative flex flex-col gap-5 text-center sm:text-left">
              <div className="mx-auto w-[250px]">
                <div className="relative h-[80px] w-full">
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
              <AdSlot
                size="970x250"
                mobileSize="320x100"
                placement="home-hero-banner"
                className="mt-2 pb-[15px]"
              />
              <h1 className="text-xl font-semibold leading-[1.35] text-[#262626] sm:text-2xl md:text-4xl">
                <span className="text-2xl sm:text-3xl md:text-5xl">Searching for an OEM part?</span>
                <span className="mt-2 block font-medium">Parts Seekr discovers the best pricing for you instantly.</span>
              </h1>
              <p className="max-w-2xl text-[15px] text-[#5ec2a4] md:text-[17px]">
                Upload the vehicle part image or add the an OEM part number and let <span className="font-bold">Parts Seekr</span> scan the web for verified parts, delivering trusted listings with the best prices, intelligently sorted by best value.
              </p>
              
              {!user && (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2 text-[11px] font-bold uppercase tracking-widest text-[#262626]/50">
                  <div className="flex items-center gap-2 bg-[#81dcc1]/10 px-3 py-1.5 rounded-full border border-[#81dcc1]/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#5ec2a4]"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
                    Save History
                  </div>
                  <div className="flex items-center gap-2 bg-[#81dcc1]/10 px-3 py-1.5 rounded-full border border-[#81dcc1]/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#5ec2a4]"><path d="m21 21-4.3-4.3"/><circle cx="11" cy="11" r="8"/></svg>
                    Track Prices
                  </div>
                  <div className="flex items-center gap-2 bg-[#81dcc1]/10 px-3 py-1.5 rounded-full border border-[#81dcc1]/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#5ec2a4]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Secure Auth
                  </div>
                </div>
              )}
            </div>
            <div className="relative mt-10">
              <UploadCapture />
            </div>
          </div>
          {(previousSearches.length > 0 || !user) && (
            <section className="rounded-3xl border border-[#5ec2a4] bg-white/80 px-6 py-5 shadow-soft fade-up fade-up-delay-1">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#262626]/70">
                    {user ? 'Your' : 'Search'} history
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-[#262626]">
                    {user ? 'Continue your search' : 'Save your results'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {previousSearches.map((item) => (
                  <article
                    key={item.id}
                    className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#5ec2a4] bg-white"
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
                        className="mt-auto inline-flex items-center justify-center rounded-full bg-[#81dcc1]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#5ec2a4]"
                      >
                        View listing
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              {!user && (
                <div className={`mt-8 rounded-[2rem] border border-dashed border-[#5ec2a4]/30 bg-[#81dcc1]/5 p-8 transition-all hover:bg-[#81dcc1]/8 group ${previousSearches.length > 0 ? 'mt-12' : ''}`}>
                  <div className="flex flex-col md:flex-row items-center gap-10">
                    <div className="flex flex-col items-center gap-3 min-w-[160px]">
                      <div className="h-16 w-16 rounded-full bg-[#5ec2a4] flex items-center justify-center text-white shadow-[0_8px_20px_-4px_rgba(94,194,164,0.4)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/></svg>
                      </div>
                      <h3 className="text-[13px] font-black uppercase tracking-[0.2em] text-[#262626]">Save History</h3>
                    </div>
                    
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-[18px] font-bold text-[#262626] leading-tight">
                        Sync your searches across all devices.
                      </p>
                      <p className="mt-1.5 text-[14px] text-[#262626]/50 font-medium">
                        Join Parts Seekr to keep your results safe and accessible anywhere.
                      </p>
                    </div>
                    
                    <div className="flex flex-row items-center gap-3 sm:gap-4">
                      <Link 
                        href="/auth/signup" 
                        className="bg-[#262626] text-white px-6 sm:px-10 py-4 rounded-full text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] transition-all hover:bg-black hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:translate-y-0 whitespace-nowrap"
                      >
                        Join Now
                      </Link>
                      <Link 
                        href="/auth/login" 
                        className="bg-white border border-[#262626]/10 text-[#262626] px-6 sm:px-10 py-4 rounded-full text-[10px] sm:text-[12px] font-black uppercase tracking-[0.2em] transition-all hover:bg-gray-50 hover:shadow-lg hover:-translate-y-1 active:translate-y-0 whitespace-nowrap"
                      >
                        Sign In
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
          <AdSlot size="970x250" mobileSize="320x100" placement="home-mid-banner" className="py-2" />
          <div className="rounded-3xl border border-[#5ec2a4] bg-white/80 px-6 py-10 shadow-soft fade-up fade-up-delay-1">
            <div className="mx-auto max-w-3xl text-center">
              <p className="display-font text-xl font-semibold text-[#262626] md:text-2xl">
                We scour <span className="font-bold text-[#5ec2a4]">hundreds of parts from trusted sellers</span>, so you can get back to chasing that oil leak.
              </p>
            </div>
          </div>
          <AutoBrandTicker />
        </div>
      </div>
    </main>
  );
}
