import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ClearHistoryButton from '@/app/components/ClearHistoryButton'
import PriceAlertsPanel from '@/app/components/PriceAlertsPanel'

function normalizeImageUrl(url?: string | null) {
  if (!url) return '/placeholder.svg'
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '/placeholder.svg'
      }
      if (parsed.pathname === '/placeholder.svg' || parsed.pathname.startsWith('/uploads/')) {
        return parsed.pathname
      }
      return parsed.toString()
    } catch {
      return '/placeholder.svg'
    }
  }
  return url.startsWith('/') ? url : '/placeholder.svg'
}

function queryKey(value?: string | null) {
  return value?.trim().toLowerCase() ?? ''
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const [sessionsResult, priceAlertsResult] = await Promise.allSettled([
    prisma.searchSession.findMany({
      where: {
        userId: user.id,
        status: 'complete'
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        results: {
          take: 1,
          orderBy: [{ matchScore: 'desc' }, { price: 'asc' }]
        }
      }
    }),
    prisma.priceAlert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
  ])

  const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : []
  const priceAlerts = priceAlertsResult.status === 'fulfilled' ? priceAlertsResult.value : []
  const priceAlertsError = priceAlertsResult.status === 'rejected'
  const topResultImagesByQuery = new Map(
    sessions
      .filter((session) => session.query && session.results[0]?.image)
      .map((session) => [queryKey(session.query), session.results[0].image])
  )

  return (
    <main className="min-h-screen bg-[#f4f5ef] px-4 py-10 text-[#111111] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="group mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#111111]/62 transition-colors hover:text-[#0CC6A6]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-1"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Home
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0CC6A6]">PartsSeekr account</p>
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#111111] sm:text-5xl">My Searches</h1>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex items-center gap-3 rounded-[22px] bg-white/78 px-5 py-3 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase leading-none tracking-[0.18em] text-[#262626]/42">Total Searches</span>
                <span className="mt-1 text-2xl font-bold text-[#111111]">{sessions.length}</span>
              </div>
              <div className="mx-2 h-8 w-px bg-[#262626]/8" />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0FF7D0]/14 text-[#0CC6A6]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
            </div>
            {sessions.length > 0 && <ClearHistoryButton />}
          </div>
        </div>

        <PriceAlertsPanel
          loadError={priceAlertsError ? 'Price alerts could not be loaded right now.' : null}
          alerts={priceAlerts.map((alert) => ({
            ...alert,
            createdAt: alert.createdAt.toISOString(),
            updatedAt: alert.updatedAt.toISOString(),
            lastCheckedAt: alert.lastCheckedAt?.toISOString() ?? null,
            triggeredAt: alert.triggeredAt?.toISOString() ?? null,
            notificationSentAt: alert.notificationSentAt?.toISOString() ?? null,
            savedResultImage: topResultImagesByQuery.get(queryKey(alert.searchQuery)) ?? null
          }))}
        />

        <section className="border-t border-[#262626]/8 pt-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#262626]/45">Search History</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Saved searches</h2>
            </div>
            {sessions.length > 0 && (
              <p className="text-sm font-medium text-[#262626]/50">Recent completed part searches</p>
            )}
          </div>

          {sessions.length === 0 ? (
          <div className="fade-up rounded-[30px] bg-white/78 p-12 text-center shadow-sm ring-1 ring-black/5 sm:p-16">
            <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#0FF7D0]/12 text-[#0CC6A6]">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-[#111111]">No searches yet</h2>
            <p className="mx-auto mb-10 max-w-sm text-sm leading-relaxed text-[#262626]/55">
              Your recent vehicle part searches will appear here once you start exploring.
            </p>
            <Link 
              href="/" 
              className="inline-flex items-center gap-3 rounded-full bg-[#111111] px-8 py-3 text-sm font-bold text-white shadow-[0_18px_38px_-24px_rgba(17,17,17,0.9)] transition-all hover:bg-[#0f0f0f] active:scale-[0.98]"
            >
              Start Your First Search
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {sessions.map((session, idx) => (
              <Link 
                key={session.id} 
                href={`/results/${session.id}`}
                className="fade-up group relative flex items-center gap-4 rounded-[24px] bg-white/82 p-4 shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-42px_rgba(17,17,17,0.65)] hover:ring-[#0FF7D0]/45 sm:gap-5"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-[18px] bg-[#f8f9f6] shadow-inner ring-1 ring-black/5 transition-transform duration-500 group-hover:scale-[1.03] sm:h-24 sm:w-24">
                  <Image 
                    src={normalizeImageUrl(session.results[0]?.image || session.imageUrl)} 
                    alt={session.query || 'Search image'} 
                    fill 
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                </div>
                
                <div className="min-w-0 flex-1 pr-1 sm:pr-4">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[#0FF7D0]/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#0CC6A6]">
                      {session.query ? 'Text Search' : 'Visual Search'}
                    </span>
                    <span className="text-[11px] font-medium text-[#262626]/42">
                      {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <h3 className="mb-2 truncate text-base font-bold text-[#111111] transition-colors group-hover:text-[#0CC6A6] sm:text-lg">
                    {session.query || 'Parts Match Analysis'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[#262626]/55">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0CC6A6]"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      {session.results.length} Matches
                    </div>
                    {session.country && (
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-[#262626]/55">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0CC6A6]"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        {session.country}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-[#f8f9f6] text-[#262626]/25 transition-all duration-300 group-hover:bg-[#111111] group-hover:text-white sm:flex">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </Link>
            ))}
          </div>
        )}
        </section>
      </div>
    </main>
  )
}
