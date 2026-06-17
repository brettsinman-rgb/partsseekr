'use client';

import { useEffect, useState } from 'react';

type TriggeredPriceAlert = {
  id: string;
  searchQuery: string;
  currency: string;
  notificationStatus?: string | null;
  triggeredPrice?: number | null;
  triggeredProductTitle?: string | null;
  triggeredProductUrl?: string | null;
  triggeredProductImage?: string | null;
};

function formatPrice(value?: number | null, currency?: string | null) {
  if (value == null || !Number.isFinite(value)) return 'your target price';
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

function safeExternalHref(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as { alerts?: TriggeredPriceAlert[] };
  } catch {
    return null;
  }
}

export default function PriceAlertNotifications() {
  const [alert, setAlert] = useState<TriggeredPriceAlert | null>(null);

  useEffect(() => {
    let active = true;

    const loadAlerts = async () => {
      const response = await fetch('/api/price-alerts', { cache: 'no-store' }).catch(() => null);
      if (!response || response.status === 401 || !response.ok) return;

      const json = await readJson(response);
      const triggered = json?.alerts?.find(
        (item) => item.notificationStatus === 'pending' && item.triggeredPrice != null
      );

      if (active && triggered) setAlert(triggered);
    };

    void loadAlerts();

    return () => {
      active = false;
    };
  }, []);

  const dismiss = async () => {
    const current = alert;
    setAlert(null);
    if (!current) return;

    await fetch(`/api/price-alerts/${current.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationStatus: 'dismissed' })
    }).catch(() => {});
  };

  if (!alert) return null;

  const productUrl = safeExternalHref(alert.triggeredProductUrl);

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] rounded-[28px] border border-[#0FF7D0]/25 bg-white p-4 text-[#111111] shadow-[0_24px_80px_-40px_rgba(17,17,17,0.55)]">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0FF7D0]/16 text-[#0CC6A6]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#0CC6A6]">Price Alert</p>
          <h2 className="mt-1 text-sm font-bold text-[#111111]">
            A matching part is now available for {formatPrice(alert.triggeredPrice, alert.currency)}.
          </h2>
          <p className="mt-1 line-clamp-2 text-xs font-medium text-[#262626]/62">
            {alert.triggeredProductTitle || alert.searchQuery}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {productUrl ? (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#0FF7D0] hover:text-[#07181b]"
              >
                Buy now
              </a>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex h-9 items-center rounded-full border border-[#262626]/12 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#262626] transition hover:border-[#0FF7D0]/55 hover:bg-[#0FF7D0]/10"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
