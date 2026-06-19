'use client';

import Image from 'next/image';
import type { ResultItem } from './ResultsClient';

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

function safeExternalHref(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : '#';
  } catch {
    return '#';
  }
}

async function trackClick(sessionId: string, resultId: string) {
  const payload = JSON.stringify({ sessionId, resultId });
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/click', blob);
  } else {
    fetch('/api/click', { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
  }
}

function renderStars(rating?: number | null) {
  if (rating == null || rating <= 0) return null;
  const percentage = Math.min(100, (rating / 5) * 100);
  return (
    <div className="flex items-center gap-2 text-[11px] text-[#262626]/70">
      <div className="relative inline-block text-[14px] leading-none">
        <span className="text-[#262626]/25">★★★★★</span>
        <span
          className="absolute left-0 top-0 overflow-hidden text-[#262626]"
          style={{ width: `${percentage}%` }}
        >
          ★★★★★
        </span>
      </div>
      <span>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function ProductCard({
  result,
  sessionId,
  isBest
}: {
  result: ResultItem;
  sessionId: string;
  isBest?: boolean;
}) {
  const shippingText =
    result.shippingPrice == null
      ? 'Shipping unknown'
      : result.shippingPrice === 0
        ? 'FREE'
        : formatPrice(result.shippingPrice, result.currency);
  const condition = result.condition ?? 'Used';
  const productUrl = safeExternalHref(result.productUrl);

  return (
    <div
      className={[
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lg sm:rounded-3xl',
        isBest ? 'best-price-glow border-[#0FF7D0]' : 'border-[#0FF7D0]'
      ].join(' ')}
    >
      <div className="relative h-36 w-full bg-white min-[480px]:h-28 sm:h-40 lg:h-48">
        <Image
          src={result.image}
          alt={result.title}
          fill
          className="object-cover"
          sizes="(max-width: 479px) 100vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-5">
        <div className="min-h-[68px] min-w-0 sm:min-h-[72px]">
          <p className="truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-[#262626]/70 sm:text-[11px] sm:tracking-[0.2em]">
            {result.store}
          </p>
          <h3 className="mt-1.5 text-[13px] font-semibold leading-snug text-[#262626] line-clamp-2 sm:mt-2 sm:text-sm">
            {result.title}
          </h3>
          <div className="mt-1">{renderStars(result.rating)}</div>
        </div>
        <div className="rounded-2xl border border-[#0FF7D0] bg-[#ebebe3] p-2.5 text-[11px] text-[#262626]/70 sm:p-3 sm:text-xs">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
            <span className="text-[8px] uppercase tracking-[0.14em] text-[#262626]/70 sm:text-[10px] sm:tracking-[0.2em]">Price</span>
            <span className="min-w-0 text-right font-semibold leading-snug text-[#262626]">{formatPrice(result.price, result.currency)}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 sm:mt-2">
            <span className="text-[8px] uppercase tracking-[0.14em] text-[#262626]/70 sm:text-[10px] sm:tracking-[0.2em]">Shipping</span>
            <span className="min-w-0 text-right leading-snug">{shippingText}</span>
          </div>
          <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 sm:mt-2">
            <span className="text-[8px] uppercase tracking-[0.14em] text-[#262626]/70 sm:text-[10px] sm:tracking-[0.2em]">Condition</span>
            <span className="min-w-0 text-right capitalize leading-snug">{condition}</span>
          </div>
          {result.availability ? (
            <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 sm:mt-2">
              <span className="text-[8px] uppercase tracking-[0.14em] text-[#262626]/70 sm:text-[10px] sm:tracking-[0.2em]">Availability</span>
              <span className="min-w-0 text-right capitalize leading-snug">{result.availability}</span>
            </div>
          ) : null}
        </div>
        <a
          href={productUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            if (productUrl === '#') {
              event.preventDefault();
              return;
            }
            trackClick(sessionId, result.id);
          }}
          className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-[#0FF7D0]/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#07181b] transition group-hover:bg-[#0FF7D0] sm:px-4 sm:text-[11px] sm:tracking-[0.2em]"
        >
          Buy now
        </a>
      </div>
    </div>
  );
}
