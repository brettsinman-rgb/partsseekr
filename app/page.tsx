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
import { sanitizeUrl } from '@/lib/utils';
import { getVehicleImage } from '@/lib/garage-vehicles';

type PreviousSearchItem = {
  id: string;
  createdAt: Date;
  title: string;
  image: string;
  productUrl: string;
};

type GaragePreviewItem = {
  id: string;
  make: string;
  model: string;
  year: number;
  series?: string | null;
  engine?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
};

const HOME_HISTORY_LIMIT = 6;

async function getGaragePreview(userId?: string): Promise<GaragePreviewItem[]> {
  if (!userId) return [];

  return prisma.garageVehicle.findMany({
    where: { userId },
    orderBy: [{ updatedAt: 'desc' }, { year: 'desc' }],
    take: 3,
    select: {
      id: true,
      make: true,
      model: true,
      year: true,
      series: true,
      engine: true,
      badge: true,
      imageUrl: true
    }
  }).catch(() => []);
}

async function getPreviousSearches(): Promise<PreviousSearchItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If no user is logged in, we no longer show IP-based history
  if (!user) {
    return [];
  }

  const mapSessionToItem = (
    session: { createdAt: Date; results: PreviousSearchItem[]; clicks?: Array<{ result?: PreviousSearchItem | null }> }
  ): PreviousSearchItem | null => {
    const mostRecentViewedResult = session.clicks?.[0]?.result ?? null;
    const fallbackTopResult = session.results[0] ?? null;
    const chosenResult = mostRecentViewedResult ?? fallbackTopResult;
    const productUrl = sanitizeUrl(chosenResult?.productUrl);
    if (!chosenResult || !productUrl) return null;
    return {
      id: chosenResult.id,
      createdAt: session.createdAt,
      title: chosenResult.title,
      image: chosenResult.image,
      productUrl
    };
  };

  try {
    noStore();
    
    // Privacy Logic: Show only searches for this userId
    const whereClause = { userId: user.id, status: 'complete' };

    const dbSessions = await prisma.searchSession.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: HOME_HISTORY_LIMIT,
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

    const devItems = getLatestDevSessions(HOME_HISTORY_LIMIT)
      .filter((session) => session.status === 'complete')
      .map((session) => {
        const topResult = [...session.results]
          .sort((a, b) => b.matchScore - a.matchScore || a.price - b.price)[0];
        const productUrl = sanitizeUrl(topResult?.productUrl);
        if (!topResult || !productUrl) return null;
        return {
          id: topResult.id,
          createdAt: session.createdAt,
          title: topResult.title,
          image: topResult.image,
          productUrl
        };
      })
      .filter((item): item is PreviousSearchItem => Boolean(item));

    return [...dbItems, ...devItems]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, HOME_HISTORY_LIMIT);
  } catch {
    return getLatestDevSessions(HOME_HISTORY_LIMIT)
      .filter((session) => session.status === 'complete')
      .map((session) => {
        const topResult = [...session.results]
          .sort((a, b) => b.matchScore - a.matchScore || a.price - b.price)[0];
        const productUrl = sanitizeUrl(topResult?.productUrl);
        if (!topResult || !productUrl) return null;
        return {
          id: topResult.id,
          createdAt: session.createdAt,
          title: topResult.title,
          image: topResult.image,
          productUrl
        };
      })
      .filter((item): item is PreviousSearchItem => Boolean(item))
      .slice(0, HOME_HISTORY_LIMIT);
  }
}

export default async function Home() {
  const previousSearches = await getPreviousSearches();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const garageVehicles = await getGaragePreview(user?.id);

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
              <Link
                href="/auth/signup"
                className="inline-block rounded-sm bg-[#0FF7D0] px-3 py-1.5 text-sm font-medium leading-6 text-[#111111] transition hover:bg-[#0CC6A6] sm:text-[15px]"
              >
                Save searches, create Price Alerts and build your Garage. <span className="underline-offset-4 hover:underline">Create a free account</span> →
              </Link>
            </section>
          )}
          {user && garageVehicles.length > 0 && (
            <section className="rounded-[32px] bg-white/86 p-5 shadow-[0_22px_70px_-55px_rgba(17,17,17,0.65)] ring-1 ring-black/5 fade-up fade-up-delay-1">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0CC6A6]">My Garage</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#262626]">Your saved vehicles</h2>
                </div>
                <Link href="/garage" className="inline-flex h-10 items-center justify-center rounded-full bg-[#111111] px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#0FF7D0] hover:text-[#07181b]">
                  Manage Garage
                </Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {garageVehicles.map((vehicle) => (
                  <article key={vehicle.id} className="overflow-hidden rounded-[26px] bg-[#f8f9f6] p-3 ring-1 ring-black/5">
                    <div className="relative h-28 overflow-hidden rounded-[22px] bg-[#111111]">
                      <Image src={getVehicleImage(vehicle)} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-black/14 to-black/24" />
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0CC6A6]">{vehicle.year}</p>
                      <h3 className="mt-1 truncate text-lg font-bold text-[#111111]">{vehicle.make} {vehicle.model}</h3>
                      {(vehicle.badge || vehicle.series) && (
                        <p className="mt-1 truncate text-xs font-semibold text-[#262626]/55">{[vehicle.badge, vehicle.series].filter(Boolean).join(' / ')}</p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          {user && previousSearches.length > 0 && (
            <section className="rounded-3xl border border-[#0FF7D0] bg-white/80 px-4 py-5 shadow-soft fade-up fade-up-delay-1 sm:px-6">
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
              <div className="grid min-w-0 grid-cols-2 gap-3 max-[339px]:grid-cols-1 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
                {previousSearches.map((item, index) => (
                  <article
                    key={item.id}
                    className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#0FF7D0] bg-white transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-34px_rgba(17,17,17,0.75)] ${index === 5 ? 'lg:hidden' : ''}`}
                  >
                    <div className="relative h-24 w-full bg-white max-[339px]:h-36 sm:h-32">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 339px) 100vw, (max-width: 767px) 50vw, (max-width: 1023px) 33vw, 20vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2 p-2.5 max-[339px]:p-3 sm:p-3">
                      <h3 className="min-h-[40px] text-[12px] font-semibold leading-snug text-[#262626] line-clamp-2 sm:text-sm">{item.title}</h3>
                      <p className="text-[10px] font-medium text-[#262626]/62">
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
                        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-[#0FF7D0]/90 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#07181b] transition hover:bg-[#0FF7D0] sm:px-4 sm:text-[11px] sm:tracking-[0.18em]"
                      >
                        View listing
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
          <div className="rounded-3xl border border-white/[0.05] bg-[linear-gradient(180deg,#242424_0%,#202020_50%,#1c1c1c_100%)] px-6 py-10 shadow-[0_10px_30px_rgba(0,0,0,0.15)] fade-up fade-up-delay-1">
            <div className="mx-auto max-w-3xl text-center">
              <p className="display-font text-xl font-semibold text-white md:text-2xl">
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
