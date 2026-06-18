import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import GarageManager from '@/app/components/GarageManager';
import { textMatchesVehicle } from '@/lib/garage-vehicles';

export default async function GaragePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [vehicles, sessions, alerts] = await Promise.all([
    prisma.garageVehicle.findMany({
      where: { userId: user.id },
      orderBy: [{ year: 'desc' }, { make: 'asc' }, { model: 'asc' }]
    }).catch(() => []),
    prisma.searchSession.findMany({
      where: { userId: user.id, status: 'complete' },
      select: { query: true }
    }).catch(() => []),
    prisma.priceAlert.findMany({
      where: { userId: user.id },
      select: { searchQuery: true, status: true }
    }).catch(() => [])
  ]);

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
            <h1 className="mt-1 text-4xl font-bold tracking-tight text-[#111111] sm:text-5xl">My Garage</h1>
          </div>
        </div>

        <GarageManager
          initialVehicles={vehicles.map((vehicle) => ({
            ...vehicle,
            createdAt: vehicle.createdAt.toISOString(),
            updatedAt: vehicle.updatedAt.toISOString(),
            stats: {
              savedSearches: sessions.filter((session) => textMatchesVehicle(session.query, vehicle)).length,
              activePriceAlerts: alerts.filter((alert) => alert.status === 'active' && textMatchesVehicle(alert.searchQuery, vehicle)).length,
              triggeredAlerts: alerts.filter((alert) => alert.status === 'triggered' && textMatchesVehicle(alert.searchQuery, vehicle)).length
            }
          }))}
        />
      </div>
    </main>
  );
}
