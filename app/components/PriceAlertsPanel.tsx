'use client';

import Image from 'next/image';
import { useState } from 'react';

type PriceAlertItem = {
  id: string;
  searchQuery: string;
  manufacturer?: string | null;
  currentLowestPrice?: number | null;
  targetPrice?: number | null;
  currency: string;
  status: string;
  createdAt: Date | string;
  lastCheckedAt?: Date | string | null;
  savedResultImage?: string | null;
  lastResultImage?: string | null;
  triggeredPrice?: number | null;
  triggeredProductTitle?: string | null;
  triggeredProductUrl?: string | null;
  triggeredProductImage?: string | null;
};

function formatPrice(value: number | null | undefined, currency?: string | null) {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  const safeCurrency = currency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: safeCurrency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${safeCurrency} ${value.toFixed(2)}`;
  }
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Not checked yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not checked yet';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function normalizeImageUrl(url?: string | null) {
  if (!url) return '/logos/PS-Favicon.png';
  if (url.startsWith('http')) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return '/logos/PS-Favicon.png';
      }
      if (parsed.pathname === '/placeholder.svg' || parsed.pathname.startsWith('/uploads/')) {
        return parsed.pathname;
      }
      return parsed.toString();
    } catch {
      return '/logos/PS-Favicon.png';
    }
  }
  return url.startsWith('/') ? url : '/logos/PS-Favicon.png';
}

function statusClass(status: string) {
  if (status === 'triggered') return 'bg-[#111111] text-white';
  if (status === 'paused') return 'bg-[#262626]/8 text-[#262626]/60';
  return 'bg-[#0FF7D0]/18 text-[#0CC6A6]';
}

function alertThumbnail(alert: PriceAlertItem) {
  return normalizeImageUrl(
    alert.savedResultImage ||
      alert.lastResultImage ||
      alert.triggeredProductImage
  );
}

export default function PriceAlertsPanel({
  alerts,
  loadError
}: {
  alerts?: PriceAlertItem[];
  loadError?: string | null;
}) {
  const [items, setItems] = useState(alerts ?? []);

  const updateStatus = async (id: string, status: 'active' | 'paused') => {
    const response = await fetch(`/api/price-alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) return;
    const json = await response.json();
    if (!json?.alert) return;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...json.alert } : item)));
  };

  const removeAlert = async (id: string) => {
    const response = await fetch(`/api/price-alerts/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <section className="mb-12 overflow-hidden rounded-[28px] border border-[#0FF7D0]/25 bg-[#0FF7D0]/8 p-4 shadow-[0_22px_70px_-55px_rgba(17,17,17,0.55)] sm:p-5">
      <div className="flex flex-col gap-2 border-b border-[#0CC6A6]/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0CC6A6]">Price Alerts</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#111111]">Price Alerts</h2>
        </div>
        <p className="text-sm font-medium text-[#262626]/55">{items.length} saved price alerts</p>
      </div>

      {loadError ? (
        <div className="mt-4 rounded-[22px] bg-white/70 p-4 text-sm font-medium text-[#262626]/55 ring-1 ring-white">
          {loadError}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-[22px] bg-white/70 p-4 text-sm font-medium text-[#262626]/55 ring-1 ring-white">
          Create a Price Alert from a search results page to get notified when a matching part reaches your target price.
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((alert) => (
            <article key={alert.id} className="rounded-[22px] bg-white/82 p-3 shadow-sm ring-1 ring-white/80">
              <div className="grid gap-3 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center">
                <div className="relative h-[76px] w-[76px] overflow-hidden rounded-[18px] bg-[#f8f9f6] ring-1 ring-black/5">
                  <Image
                    src={alertThumbnail(alert)}
                    alt={alert.searchQuery}
                    fill
                    sizes="76px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${statusClass(alert.status)}`}>
                      {alert.status || 'active'}
                    </span>
                    <span className="text-xs font-medium text-[#262626]/45">Checked: {formatDate(alert.lastCheckedAt)}</span>
                  </div>
                  <h3 className="mt-2 truncate text-base font-bold text-[#111111]">{alert.searchQuery || 'Price Alert'}</h3>
                  <div className="mt-2 grid gap-1 text-xs font-semibold text-[#262626]/58 sm:grid-cols-2">
                    <span>Current lowest: {formatPrice(alert.currentLowestPrice, alert.currency)}</span>
                    <span>Target: {formatPrice(alert.targetPrice, alert.currency)}</span>
                  </div>
                </div>

                <div className="flex gap-2 sm:flex-col sm:items-stretch">
                  <button
                    type="button"
                    onClick={() => updateStatus(alert.id, alert.status === 'active' ? 'paused' : 'active')}
                    className="h-9 flex-1 rounded-full border border-[#262626]/10 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#262626] transition hover:border-[#0FF7D0]/70 hover:bg-[#0FF7D0]/10 sm:flex-none"
                  >
                    {alert.status === 'active' ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAlert(alert.id)}
                    className="h-9 flex-1 rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-red-600 sm:flex-none"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
