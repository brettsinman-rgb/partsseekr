'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ResultsGrid from './ResultsGrid';
import SortFilterBar from './SortFilterBar';
import LoadingSkeleton from './LoadingSkeleton';
import AdSlot from './AdSlot';
import UserMenu from './UserMenu';
import PriceAlertButton from './PriceAlertButton';

export type ResultItem = {
  id: string;
  sessionId: string;
  title: string;
  brand?: string | null;
  image: string;
  store: string;
  price: number;
  currency: string;
  shippingPrice?: number | null;
  condition?: string | null;
  availability?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  marketplace?: string | null;
  productUrl: string;
  matchScore: number;
};

type SessionPayload = {
  id: string;
  imageUrl: string;
  query?: string | null;
  country?: string | null;
  status: string;
  createdAt: string;
  results: ResultItem[];
};

export default function ResultsClient({ sessionId }: { sessionId: string }) {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'cheapest' | 'best'>('best');
  const [condition, setCondition] = useState('all');
  const [currency, setCurrency] = useState('all');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/search/${sessionId}`, { cache: 'no-store' });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Unable to load results.');
        if (!active) return;
        setSession(json);
        setLoading(json.status === 'processing');
        if (json.status === 'processing') {
          timer = setTimeout(fetchSession, 2000);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setLoading(false);
      }
    };

    fetchSession();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [sessionId]);

  const currencyOptions = useMemo(() => {
    if (!session) return [];
    return Array.from(new Set(session.results.map((item) => item.currency))).sort();
  }, [session]);

  const conditionOptions = useMemo(() => {
    if (!session) return [];
    return Array.from(new Set(session.results.map((item) => item.condition))).filter(Boolean).sort() as string[];
  }, [session]);

  const regionOptions = useMemo(() => {
    if (!session) return [] as { id: string; label: string }[];
    const ids = Array.from(
      new Set(
        session.results
          .map((item) => item.marketplace)
          .filter((value): value is string => Boolean(value))
      )
    );
    const labelMap: Record<string, string> = {
      EBAY_US: 'United States',
      EBAY_MOTOR: 'Motors (US)',
      EBAY_GB: 'United Kingdom',
      EBAY_AU: 'Australia',
      EBAY_CA: 'Canada',
      EBAY_DE: 'Germany',
      EBAY_FR: 'France',
      EBAY_IT: 'Italy',
      EBAY_ES: 'Spain'
    };
    return ids
      .map((id) => ({ id, label: labelMap[id] ?? (id.startsWith('EBAY_') ? id.replace('EBAY_', '') : id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [session]);

  useEffect(() => {
    if (regionOptions.length > 0 && selectedRegions.length === 0) {
      setSelectedRegions(regionOptions.map((option) => option.id));
    }
  }, [regionOptions]);

  const filtered = useMemo(() => {
    if (!session) return [] as ResultItem[];
    let results = [...session.results];

    if (currency !== 'all') results = results.filter((item) => item.currency === currency);
    if (condition !== 'all') {
      results = results.filter((item) => item.condition === condition);
    }
    // If some but not all regions are selected, filter. If all or none, show all.
    if (selectedRegions.length > 0 && selectedRegions.length < regionOptions.length) {
      results = results.filter((item) => item.marketplace && selectedRegions.includes(item.marketplace));
    }

    const withEffective = results.map((item, index) => ({
      ...item,
      effectivePrice: item.price + (item.shippingPrice ?? 0),
      index
    }));

    const sorted = withEffective.sort((a, b) => {
      if (sortMode === 'best') {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      }

      if (a.effectivePrice !== b.effectivePrice) return a.effectivePrice - b.effectivePrice;

      return a.index - b.index;
    });

    return sorted.map((item) => {
      const copy = { ...item } as ResultItem & { effectivePrice?: number; index?: number };
      delete copy.effectivePrice;
      delete copy.index;
      return copy;
    });
  }, [session, currency, condition, sortMode, selectedRegions, regionOptions.length]);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-10">
        <LoadingSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-soft">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!session) return null;

  const isEmpty = session.status === 'empty' || session.results.length === 0;
  const isFailed = session.status === 'failed';
  const lowestResult = session.results
    .filter((item) => Number.isFinite(item.price))
    .map((item) => ({
      price: item.price + (item.shippingPrice ?? 0),
      currency: item.currency
    }))
    .sort((a, b) => a.price - b.price)[0];

  return (
    <main className="min-h-screen px-6 pb-16">
      <div className="sticky top-0 z-20 border-b border-[#0FF7D0]/20 bg-[#ebebe3] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              aria-label="Go to PartsSeekr homepage"
              className="block h-14 w-14 overflow-hidden rounded-2xl border border-[#0FF7D0] bg-white shadow-sm"
            >
              <Image
                src="/logos/PS-Favicon.png"
                alt="Parts Seekr icon"
                width={56}
                height={56}
                className="h-full w-full bg-white object-contain p-1"
              />
            </Link>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#262626]/70">Search results</p>
              <p className="text-xs text-[#262626]/70">
                {session.query ? `“${session.query}”` : new Date(session.createdAt).toLocaleString()}
                {session.country ? ` · ${session.country}` : ''}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <PriceAlertButton
              sessionId={session.id}
              query={session.query}
              currentLowestPrice={lowestResult?.price ?? null}
              currency={lowestResult?.currency ?? null}
            />
            <button
              className="rounded-full border border-[#262626] bg-[#262626] px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#1f1f1f]"
              onClick={() => (window.location.href = '/')}
            >
              New search
            </button>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 max-w-6xl">
        <AdSlot
          size="970x250"
          mobileSize="320x100"
          placement="results-top-banner"
          className="mb-6"
        />
        <SortFilterBar
          sortMode={sortMode}
          setSortMode={setSortMode}
          condition={condition}
          setCondition={setCondition}
          currency={currency}
          setCurrency={setCurrency}
          regionOptions={regionOptions}
          selectedRegions={selectedRegions}
          setSelectedRegions={setSelectedRegions}
          currencyOptions={currencyOptions}
          conditionOptions={conditionOptions}
        />

        {isFailed ? (
          <div className="mt-10 rounded-3xl border border-dashed border-[#0FF7D0] bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-[#262626]">Search provider unavailable</h2>
            <p className="mt-2 text-sm text-[#262626]/70">
              Please try again in a moment or upload a different photo.
            </p>
          </div>
        ) : isEmpty ? (
          <div className="mt-10 rounded-3xl border border-dashed border-[#0FF7D0] bg-white p-10 text-center fade-up">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#ebebe3]">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect x="8" y="12" width="32" height="24" rx="6" stroke="#0FF7D0" strokeWidth="2" />
                <circle cx="24" cy="24" r="7" stroke="#0FF7D0" strokeWidth="2" />
                <path d="M16 12L20 8H28L32 12" stroke="#0FF7D0" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#262626]">No exact matches found</h2>
            <p className="mt-2 text-sm text-[#262626]/70">
              Try a new photo, crop tighter around the product, or include a label/logo for better results.
            </p>
          </div>
        ) : (
          <ResultsGrid sessionId={session.id} results={filtered} />
        )}
        <AdSlot
          size="970x250"
          mobileSize="320x100"
          placement="results-bottom-banner"
          className="mt-8"
        />
      </div>
    </main>
  );
}
