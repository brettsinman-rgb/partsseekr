'use client';

import { useState } from 'react';
import Link from 'next/link';

function formatPrice(value: number, currency: string) {
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

export default function PriceAlertButton({
  sessionId,
  query,
  currentLowestPrice,
  currency
}: {
  sessionId: string;
  query?: string | null;
  currentLowestPrice?: number | null;
  currency?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const canCreate = Boolean(query && currentLowestPrice != null && currency);

  const createAlert = async () => {
    if (!canCreate) return;
    setLoading(true);
    setMessage(null);
    setRequiresAuth(false);

    try {
      const response = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          targetPrice: targetPrice.trim() ? Number(targetPrice) : null
        })
      });
      const json = await response.json();
      if (response.status === 401) {
        setRequiresAuth(true);
        setMessage(json.error || 'Sign in to create a price alert.');
        return;
      }
      if (!response.ok) throw new Error(json.error || 'Unable to create price alert.');
      setMessage('Price alert saved.');
      setTargetPrice('');
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create price alert.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={!canCreate}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center justify-center rounded-full border border-[#262626]/15 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#262626] shadow-sm transition hover:border-[#0FF7D0]/50 hover:bg-[#0FF7D0]/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Watch Price
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-[min(320px,calc(100vw-2rem))] rounded-3xl border border-[#0FF7D0]/20 bg-white p-4 text-[#262626] shadow-xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#262626]/55">Price alert</p>
          <p className="mt-1 text-sm font-semibold">{query}</p>
          {currentLowestPrice != null && currency ? (
            <p className="mt-1 text-xs text-[#262626]/60">
              Current lowest: {formatPrice(currentLowestPrice, currency)}
            </p>
          ) : null}
          <label className="mt-4 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">
              Target price optional
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={targetPrice}
              onChange={(event) => setTargetPrice(event.target.value)}
              placeholder={currentLowestPrice != null ? currentLowestPrice.toFixed(2) : '0.00'}
              className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 transition focus:ring-2 focus:ring-[#0FF7D0]/45"
            />
          </label>
          <button
            type="button"
            onClick={createAlert}
            disabled={loading}
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#0FF7D0] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Set alert'}
          </button>
        </div>
      )}

      {message && (
        <div className="absolute right-0 top-12 z-40 w-[min(320px,calc(100vw-2rem))] rounded-2xl border border-[#0FF7D0]/20 bg-white p-4 text-sm shadow-xl">
          <p className="font-medium text-[#262626]">{message}</p>
          {requiresAuth && (
            <div className="mt-3 flex gap-2">
              <Link href="/auth/login" className="rounded-full bg-[#111111] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white">
                Sign in
              </Link>
              <Link href="/auth/signup" className="rounded-full border border-[#262626]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#262626]">
                Create account
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
