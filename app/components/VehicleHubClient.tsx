'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { manufacturerLogo, vehicleDisplayName, vehicleSearchPrefix, type GarageVehicleStats } from '@/lib/garage-vehicles';

type VehicleHubVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  series?: string | null;
  engine?: string | null;
  badge?: string | null;
  imageUrl?: string | null;
};

type VehicleAlert = {
  id: string;
  searchQuery: string;
  currentLowestPrice?: number | null;
  targetPrice?: number | null;
  currency: string;
  status: string;
  lastCheckedAt?: string | Date | null;
  triggeredPrice?: number | null;
  triggeredProductUrl?: string | null;
};

type VehicleSearch = {
  id: string;
  query: string | null;
  createdAt: string;
};

const POPULAR_PARTS = [
  { name: 'Brake Pads', category: 'Braking', icon: 'disc' },
  { name: 'Brake Rotors', category: 'Braking', icon: 'disc' },
  { name: 'Headlights', category: 'Lighting', icon: 'light' },
  { name: 'Tail Lights', category: 'Lighting', icon: 'light' },
  { name: 'Battery', category: 'Electrical', icon: 'bolt' },
  { name: 'Oil Filter', category: 'Service', icon: 'filter' },
  { name: 'Air Filter', category: 'Service', icon: 'filter' },
  { name: 'Fuel Filter', category: 'Fuel', icon: 'filter' },
  { name: 'Wiper Blades', category: 'Visibility', icon: 'wiper' },
  { name: 'Alternator', category: 'Electrical', icon: 'bolt' },
  { name: 'Starter Motor', category: 'Electrical', icon: 'bolt' },
  { name: 'Turbocharger', category: 'Performance', icon: 'turbo' }
];

function formatPrice(value: number | null | undefined, currency = 'USD') {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatCheckedDate(value: string | Date | null | undefined) {
  if (!value) return 'Not checked yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not checked yet';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function VehicleHeroImage({ vehicle }: { vehicle: VehicleHubVehicle }) {
  const logo = manufacturerLogo(vehicle.make);

  if (vehicle.imageUrl) {
    return <Image src={vehicle.imageUrl} alt={vehicleDisplayName(vehicle)} fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover" />;
  }

  return (
    <div className="relative flex h-full min-h-[240px] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#101010_0%,#181a18_52%,#0b2a25_100%)] px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(15,247,208,0.18),transparent_36%)]" />
      <div className="absolute bottom-8 left-1/2 h-24 w-[78%] -translate-x-1/2 rounded-full bg-[#0FF7D0]/10 blur-3xl" />
      <svg viewBox="0 0 420 150" className="absolute bottom-10 left-1/2 w-[88%] -translate-x-1/2 text-white/10" fill="none" aria-hidden="true">
        <path d="M64 95c24-38 50-55 91-55h95c43 0 77 20 110 55h28c12 0 22 10 22 22v6H14v-6c0-12 10-22 22-22h28Z" fill="currentColor" />
        <circle cx="121" cy="120" r="22" fill="#111111" />
        <circle cx="318" cy="120" r="22" fill="#111111" />
      </svg>
      <div className="relative flex h-28 w-28 items-center justify-center rounded-[34px] bg-white/8 ring-1 ring-white/12 backdrop-blur">
        {logo ? (
          <Image src={logo} alt={`${vehicle.make} logo`} fill sizes="112px" className="object-contain p-6" />
        ) : (
          <span className="text-4xl font-bold text-[#0FF7D0]">{vehicle.make.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
    </div>
  );
}

function PartIcon({ icon }: { icon: string }) {
  if (icon === 'light') {
    return <path d="M4 12h8l6-5v10l-6-5H4Zm0 0H2m18-4 2-1m-2 9 2 1" />;
  }
  if (icon === 'bolt') {
    return <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />;
  }
  if (icon === 'filter') {
    return <path d="M4 5h16M7 12h10M10 19h4" />;
  }
  if (icon === 'wiper') {
    return <path d="M4 18c7-9 13-11 16-12M4 18h16M8 18l8-8" />;
  }
  if (icon === 'turbo') {
    return <path d="M12 7a5 5 0 1 0 5 5h4a9 9 0 1 1-9-9v4Zm5 5h4m-4 0 3-3m-3 3 3 3" />;
  }
  return <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />;
}

function shortPartName(query: string, prefix: string) {
  return query.replace(prefix, '').trim() || query;
}

async function readApiJson(response: Response) {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text) as { error?: string; sessionId?: string; alert?: VehicleAlert; checked?: number; triggered?: number };
  } catch {
    return null;
  }
}

export default function VehicleHubClient({
  vehicle,
  stats,
  alerts,
  searches
}: {
  vehicle: VehicleHubVehicle;
  stats: GarageVehicleStats;
  alerts: VehicleAlert[];
  searches: VehicleSearch[];
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [alertPartName, setAlertPartName] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [alertItems, setAlertItems] = useState(alerts);
  const [message, setMessage] = useState<string | null>(null);
  const [searchingPart, setSearchingPart] = useState<string | null>(null);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [checkingAlerts, setCheckingAlerts] = useState(false);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [deletingAlertId, setDeletingAlertId] = useState<string | null>(null);
  const searchPrefix = vehicleSearchPrefix(vehicle);
  const activeAlerts = alertItems.filter((alert) => alert.status === 'active').slice(0, 3);
  const triggeredAlerts = alertItems.filter((alert) => alert.status === 'triggered').slice(0, 3);
  const recentSearches = searches.filter((search) => search.query).slice(0, 5);

  const launchSearch = async (part: string) => {
    const term = part.trim();
    if (!term) return;
    setMessage(null);
    setSearchingPart(term);

    const formData = new FormData();
    formData.append('query', `${searchPrefix} ${term}`.trim());
    try {
      const response = await fetch('/api/search', { method: 'POST', body: formData });
      const json = await readApiJson(response);
      if (!response.ok || !json?.sessionId) {
        setMessage(json?.error || 'Could not start that vehicle-specific search. Please try again.');
        return;
      }
      router.push(`/results/${json.sessionId}`);
    } catch {
      setMessage('Could not start that vehicle-specific search. Please try again.');
    } finally {
      setSearchingPart(null);
    }
  };

  const createAlertForPart = async (partName: string, targetPriceValue: string | null = null) => {
    setMessage(null);
    const trimmedPartName = partName.trim();
    if (!trimmedPartName) {
      setMessage('Enter a part name to create a vehicle-specific Price Alert.');
      return false;
    }
    try {
      const response = await fetch(`/api/garage/${vehicle.id}/price-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partName: trimmedPartName,
          targetPrice: targetPriceValue?.trim() ? Number(targetPriceValue) : null
        })
      });
      const json = await readApiJson(response);
      if (!response.ok || !json?.alert) {
        setMessage(json?.error || 'Could not create that Price Alert. Please try again.');
        return false;
      }
      setAlertItems((current) => [json.alert as VehicleAlert, ...current]);
      setMessage('Price Alert created for this vehicle.');
      return true;
    } catch {
      setMessage('Could not create that Price Alert. Please try again.');
      return false;
    }
  };

  const createAlert = async () => {
    setCreatingAlert(true);
    try {
      const created = await createAlertForPart(alertPartName, targetPrice);
      if (created) {
        setAlertPartName('');
        setTargetPrice('');
      }
    } finally {
      setCreatingAlert(false);
    }
  };

  const updateAlertStatus = async (id: string, status: 'active' | 'paused') => {
    setMessage(null);
    setUpdatingAlertId(id);
    try {
      const response = await fetch(`/api/price-alerts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await readApiJson(response);
      if (!response.ok || !json?.alert) {
        setMessage(json?.error || 'Could not update that Price Alert.');
        return;
      }
      setAlertItems((current) => current.map((alert) => (alert.id === id ? { ...alert, status } : alert)));
    } catch {
      setMessage('Could not update that Price Alert.');
    } finally {
      setUpdatingAlertId(null);
    }
  };

  const deleteAlert = async (id: string) => {
    setMessage(null);
    setDeletingAlertId(id);
    try {
      const response = await fetch(`/api/price-alerts/${id}`, { method: 'DELETE' });
      const json = await readApiJson(response);
      if (!response.ok) {
        setMessage(json?.error || 'Could not remove that Price Alert.');
        return;
      }
      setAlertItems((current) => current.filter((alert) => alert.id !== id));
    } catch {
      setMessage('Could not remove that Price Alert.');
    } finally {
      setDeletingAlertId(null);
    }
  };

  const checkVehicleAlerts = async () => {
    setMessage(null);
    setCheckingAlerts(true);
    try {
      const response = await fetch(`/api/garage/${vehicle.id}/price-alerts/check`, { method: 'POST' });
      const json = await readApiJson(response);
      if (!response.ok) {
        setMessage(json?.error || 'Could not check Vehicle Hub Price Alerts.');
        return;
      }
      const checked = json?.checked ?? 0;
      const triggered = json?.triggered ?? 0;
      setMessage(
        checked === 0
          ? 'No active Vehicle Hub Price Alerts need checking right now.'
          : triggered > 0
            ? `${triggered} Price Alert triggered. Refresh this page to see the latest alert status.`
            : 'Vehicle Hub Price Alerts checked. Refresh this page to see the latest prices.'
      );
    } catch {
      setMessage('Could not check Vehicle Hub Price Alerts.');
    } finally {
      setCheckingAlerts(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-[30px] bg-[#111111] text-white shadow-[0_24px_80px_-56px_rgba(17,17,17,0.9)] sm:rounded-[34px]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
          <div className="relative min-h-[240px] bg-[#151515] sm:min-h-[280px]">
            <VehicleHeroImage vehicle={vehicle} />
          </div>
          <div className="p-5 sm:p-7 lg:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/garage" className="text-xs font-bold uppercase tracking-[0.18em] text-[#0FF7D0]">Back to My Garage</Link>
              <span className="rounded-full bg-white/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Vehicle Hub</span>
            </div>
            <p className="mt-8 text-[12px] font-bold uppercase tracking-[0.2em] text-white/46">{vehicle.year}</p>
            <h1 className="mt-2 break-words text-[32px] font-bold leading-tight tracking-tight sm:text-5xl">{vehicle.make} {vehicle.model}</h1>
            {(vehicle.badge || vehicle.series || vehicle.engine) && (
              <p className="mt-3 text-lg font-medium text-white/68">{[vehicle.badge, vehicle.series, vehicle.engine].filter(Boolean).join(' / ')}</p>
            )}
            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['Active Price Alerts', stats.activePriceAlerts],
                ['Saved Searches', stats.savedSearches],
                ['Triggered Alerts', stats.triggeredAlerts]
              ].map(([label, value]) => (
                <div key={label} className="rounded-[20px] bg-white/7 p-3.5 ring-1 ring-white/10">
                  <p className="text-2xl font-bold text-[#0FF7D0]">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-white/52">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-white/92 p-5 shadow-[0_20px_70px_-58px_rgba(17,17,17,0.8)] ring-1 ring-black/5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0CC6A6]">Smart Search</p>
            <h2 className="mt-1 text-2xl font-bold text-[#111111]">Find parts for this vehicle</h2>
          </div>
            <p className="max-w-full break-words text-xs font-semibold text-[#262626]/45">Vehicle fitment added automatically: {searchPrefix}</p>
        </div>
        <form
          className="mt-5 flex flex-col gap-3 rounded-[26px] bg-[#f8f9f6] p-2 ring-1 ring-black/5 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void launchSearch(searchTerm);
          }}
        >
          <input aria-label={`Search parts for ${vehicle.make} ${vehicle.model}`} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={`Try headlight, brake pads, oil filter...`} className="h-12 flex-1 rounded-full bg-white px-5 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
          <button type="submit" disabled={!searchTerm.trim() || searchingPart !== null} className="h-12 rounded-full bg-[#111111] px-6 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#0FF7D0] hover:text-[#07181b] disabled:cursor-not-allowed disabled:bg-[#262626]/25 disabled:text-white">{searchingPart ? 'Searching...' : 'Search This Vehicle'}</button>
        </form>
        {message && <p role="status" className="mt-3 text-sm font-semibold text-[#262626]/65">{message}</p>}
      </section>

      <section className="rounded-[30px] bg-white/82 p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0CC6A6]">Popular Parts</p>
            <h2 className="mt-1 text-2xl font-bold text-[#111111]">Quick-search common jobs</h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2.5 min-[460px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {POPULAR_PARTS.map((part) => (
            <button key={part.name} type="button" disabled={searchingPart !== null} onClick={() => void launchSearch(part.name)} className="group rounded-[20px] bg-[#f8f9f6] p-3.5 text-left shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_45px_-34px_rgba(17,17,17,0.8)] hover:ring-[#0FF7D0]/50 disabled:cursor-not-allowed disabled:opacity-60">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#111111] ring-1 ring-black/5 transition group-hover:bg-[#0FF7D0]">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <PartIcon icon={part.icon} />
                </svg>
              </div>
              <p className="text-sm font-bold leading-5 text-[#111111]">{part.name}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0CC6A6]">{part.category}</p>
              <p className="mt-1.5 text-[11px] font-medium leading-4 text-[#262626]/50">Search for this vehicle</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[32px] bg-white/90 p-5 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0CC6A6]">Price Alerts</p>
              <h2 className="mt-1 text-2xl font-bold text-[#111111]">Track prices for this vehicle</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#262626]/45">{alertItems.length} alerts</span>
              <button type="button" disabled={checkingAlerts || alertItems.length === 0} onClick={() => void checkVehicleAlerts()} className="h-9 rounded-full border border-[#262626]/12 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#262626] transition hover:border-[#0FF7D0]/60 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{checkingAlerts ? 'Checking...' : 'Check Now'}</button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {alertItems.length === 0 ? (
              <p className="rounded-[22px] bg-[#f8f9f6] p-4 text-sm font-medium text-[#262626]/55">Create an alert for a part and PartsSeekr will watch for matching listings at your target price.</p>
            ) : alertItems.map((alert) => (
              <article key={alert.id} className="rounded-[24px] bg-[#f8f9f6] p-4 ring-1 ring-black/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words font-bold text-[#111111]">{shortPartName(alert.searchQuery, searchPrefix)}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#262626]/52">{alert.status}</span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-[#262626]/55">Target: {formatPrice(alert.targetPrice, alert.currency)}</p>
                    <p className="mt-1 text-xs font-semibold text-[#262626]/55">Current: {alert.currentLowestPrice == null ? 'Current price not available yet' : formatPrice(alert.currentLowestPrice, alert.currency)}</p>
                    <p className="mt-1 text-xs font-medium text-[#262626]/45">Last checked: {formatCheckedDate(alert.lastCheckedAt)}</p>
                    <p className="mt-2 text-xs font-medium text-[#262626]/45">PartsSeekr monitors this alert for your saved vehicle.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={updatingAlertId === alert.id || deletingAlertId === alert.id} onClick={() => updateAlertStatus(alert.id, alert.status === 'active' ? 'paused' : 'active')} className="h-9 rounded-full border border-[#262626]/12 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#262626] transition hover:border-[#0FF7D0]/60 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{updatingAlertId === alert.id ? 'Updating...' : alert.status === 'active' ? 'Pause Alert' : 'Resume Alert'}</button>
                    <button type="button" disabled={updatingAlertId === alert.id || deletingAlertId === alert.id} onClick={() => deleteAlert(alert.id)} className="h-9 rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">{deletingAlertId === alert.id ? 'Removing...' : 'Remove'}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] bg-white/90 p-5 shadow-sm ring-1 ring-black/5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0CC6A6]">Create Price Alert</p>
          <h2 className="mt-1 text-xl font-bold text-[#111111]">Watch a part price</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-[#262626]/55">We will attach this alert to {vehicle.make} {vehicle.model} automatically.</p>
          <div className="mt-4 space-y-3">
            <input aria-label="Part name for price alert" value={alertPartName} onChange={(event) => setAlertPartName(event.target.value)} placeholder="Part name, e.g. headlight" className="h-11 w-full rounded-full bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            <input aria-label="Target price for price alert" value={targetPrice} onChange={(event) => setTargetPrice(event.target.value)} type="number" min="0" step="0.01" placeholder="Target price" className="h-11 w-full rounded-full bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            <button type="button" disabled={creatingAlert || !alertPartName.trim()} onClick={createAlert} className="h-11 w-full rounded-full bg-[#0FF7D0] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#07181b] transition hover:bg-[#0CC6A6] disabled:cursor-not-allowed disabled:bg-[#262626]/18 disabled:text-[#262626]/45">{creatingAlert ? 'Creating...' : 'Create Price Alert'}</button>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-white/86 p-5 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0CC6A6]">Vehicle Activity</p>
            <h2 className="mt-1 text-2xl font-bold text-[#111111]">Recent activity for this vehicle</h2>
          </div>
          <p className="text-xs font-semibold text-[#262626]/45">Alerts, triggered deals and searches</p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[24px] bg-[#f8f9f6] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#111111]">Active Price Alerts</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#262626]/45">{activeAlerts.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {activeAlerts.length === 0 ? (
                <p className="text-sm font-medium leading-6 text-[#262626]/52">No active alerts yet.</p>
              ) : activeAlerts.map((alert) => (
                <article key={alert.id} className="border-t border-black/5 pt-3 first:border-t-0 first:pt-0">
                  <p className="break-words text-sm font-bold text-[#111111]">{shortPartName(alert.searchQuery, searchPrefix)}</p>
                  <p className="mt-1 text-xs font-medium text-[#262626]/52">Target: {formatPrice(alert.targetPrice, alert.currency)}</p>
                  <p className="mt-1 text-xs font-medium text-[#262626]/52">Current: {alert.currentLowestPrice == null ? 'Not available yet' : formatPrice(alert.currentLowestPrice, alert.currency)}</p>
                  <p className="mt-1 text-xs font-medium text-[#262626]/42">Last checked: {formatCheckedDate(alert.lastCheckedAt)}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f8f9f6] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#111111]">Triggered Alerts</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#262626]/45">{triggeredAlerts.length}</span>
            </div>
            <div className="mt-3 space-y-3">
              {triggeredAlerts.length === 0 ? (
                <p className="text-sm font-medium leading-6 text-[#262626]/52">No triggered alerts yet.</p>
              ) : triggeredAlerts.map((alert) => (
                <article key={alert.id} className="border-t border-black/5 pt-3 first:border-t-0 first:pt-0">
                  <p className="break-words text-sm font-bold text-[#111111]">{shortPartName(alert.searchQuery, searchPrefix)}</p>
                  <p className="mt-1 text-xs font-medium text-[#262626]/52">Triggered: {formatPrice(alert.triggeredPrice, alert.currency)}</p>
                  {alert.triggeredProductUrl ? (
                    <a href={alert.triggeredProductUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-bold text-[#0CC6A6] hover:text-[#111111]">View deal</a>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] bg-[#f8f9f6] p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#111111]">Recent Searches</h3>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#262626]/45">{recentSearches.length}</span>
            </div>
            <div className="mt-3 space-y-2">
              {recentSearches.length === 0 ? (
                <p className="text-sm font-medium leading-6 text-[#262626]/52">No recent vehicle searches.</p>
              ) : recentSearches.map((search) => (
                <button key={search.id} type="button" disabled={searchingPart !== null || !search.query} onClick={() => search.query && void launchSearch(search.query.replace(searchPrefix, '').trim() || search.query)} className="block w-full border-t border-black/5 pt-2 text-left first:border-t-0 first:pt-0 disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="block break-words text-sm font-bold text-[#111111]">{shortPartName(search.query ?? '', searchPrefix)}</span>
                  <span className="mt-1 block text-xs font-medium text-[#262626]/42">{new Date(search.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
