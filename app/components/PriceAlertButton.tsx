'use client';

import { useEffect, useState } from 'react';
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

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as { error?: string; message?: string; alert?: unknown };
  } catch {
    return null;
  }
}

function responseErrorMessage(json: { error?: string; message?: string } | null) {
  if (process.env.NODE_ENV !== 'production') {
    return json?.message || json?.error || 'Could not create price alert. Please try again.';
  }

  return json?.error || 'Could not create price alert. Please try again.';
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
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [requiresAuth, setRequiresAuth] = useState(false);

  const canCreate = Boolean(query && currentLowestPrice != null && currency);

  useEffect(() => {
    if (!message || messageType !== 'success') return;

    const timeout = window.setTimeout(() => {
      setMessage(null);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [message, messageType]);

  const createAlert = async () => {
    if (!canCreate) return;
    setLoading(true);
    setMessage(null);
    setMessageType('error');
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
      const json = await readJsonResponse(response);
      if (response.status === 401) {
        setRequiresAuth(true);
        setMessageType('error');
        setMessage(json?.error || json?.message || 'Sign in to create a price alert.');
        return;
      }
      if (!response.ok) {
        throw new Error(responseErrorMessage(json));
      }
      if (!json?.alert) {
        throw new Error('Could not create price alert. Please try again.');
      }
      setMessageType('success');
      setMessage("We'll notify you when this part reaches your target price.");
      setTargetPrice('');
      setOpen(false);
    } catch (error) {
      setMessageType('error');
      setMessage(error instanceof Error ? error.message : 'Could not create price alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        disabled={!canCreate}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center justify-center rounded-full border border-[#262626]/15 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#262626] shadow-sm transition hover:border-[#0FF7D0]/50 hover:bg-[#0FF7D0]/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Price Alert
      </button>

      {open && (
        <div className="fixed left-1/2 top-24 z-50 max-h-[calc(100vh-7rem)] w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-y-auto rounded-3xl border border-[#0FF7D0]/20 bg-white p-4 text-[#262626] shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:max-h-none sm:w-[320px] sm:max-w-[320px] sm:translate-x-0 sm:overflow-visible">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#262626]/55">Price Alert</p>
          <p className="mt-1 text-sm font-semibold">{query}</p>
          <p className="mt-2 text-xs leading-5 text-[#262626]/58">
            Get alerted when this part drops to your target price.
          </p>
          {currentLowestPrice != null && currency ? (
            <p className="mt-1 text-xs text-[#262626]/60">
              Current lowest: {formatPrice(currentLowestPrice, currency)}
            </p>
          ) : null}
          <label className="mt-4 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">
              Target price
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
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#0FF7D0] hover:text-[#07181b] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Set alert'}
          </button>
        </div>
      )}

      {message && (
        <div
          className={[
            'fixed left-1/2 top-24 z-50 w-[calc(100vw-32px)] max-w-[calc(100vw-32px)] -translate-x-1/2 animate-[toast-enter_180ms_ease-out] rounded-2xl p-4 text-sm shadow-xl transition-opacity sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[320px] sm:max-w-[320px] sm:translate-x-0',
            messageType === 'success'
              ? 'border border-[#0CC6A6]/25 bg-[#0FF7D0] text-[#111111]'
              : 'border border-red-100 bg-white text-[#262626]'
          ].join(' ')}
        >
          <p className="flex items-start gap-2 font-medium">
            {messageType === 'success' && (
              <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#111111]/10 text-[#111111]" aria-hidden="true">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            <span>{message}</span>
          </p>
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
