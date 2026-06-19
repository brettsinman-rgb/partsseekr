'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

type Props = {
  sortMode: 'cheapest' | 'best';
  setSortMode: (value: 'cheapest' | 'best') => void;
  condition: string;
  setCondition: (value: string) => void;
  currency: string;
  setCurrency: (value: string) => void;
  regionOptions: { id: string; label: string }[];
  selectedRegions: string[];
  setSelectedRegions: (value: string[]) => void;
  currencyOptions: string[];
  conditionOptions: string[];
};

export default function SortFilterBar({
  sortMode,
  setSortMode,
  condition,
  setCondition,
  currency,
  setCurrency,
  regionOptions,
  selectedRegions,
  setSelectedRegions,
  currencyOptions,
  conditionOptions
}: Props) {
  const [regionsOpen, setRegionsOpen] = useState(false);
  const regionMenuRef = useRef<HTMLDivElement>(null);
  const allRegionIds = regionOptions.map((region) => region.id);
  const selectedCount = selectedRegions.length;
  const allRegionsSelected = regionOptions.length > 0 && selectedCount === regionOptions.length;
  const selectedRegion = selectedCount === 1
    ? regionOptions.find((region) => region.id === selectedRegions[0])
    : null;
  const regionLabel = allRegionsSelected
    ? 'Regions: All'
    : selectedRegion
      ? `Region: ${selectedRegion.label}`
      : `Regions: ${selectedCount} selected`;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!regionMenuRef.current?.contains(event.target as Node)) {
        setRegionsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRegionsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 rounded-2xl border border-[#0FF7D0] bg-white p-3 shadow-soft sm:gap-3 sm:p-4">
      <div className="inline-flex shrink-0 overflow-hidden rounded-full border border-[#0FF7D0]/30 bg-[#f8f9f6] p-1">
        {[
          { id: 'cheapest', label: 'Cheapest' },
          { id: 'best', label: 'Best Match' }
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setSortMode(option.id as Props['sortMode'])}
            className={clsx(
              'rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:px-4 sm:text-[11px] sm:tracking-[0.18em]',
              sortMode === option.id
                ? 'bg-[#0FF7D0] text-[#020617] shadow-sm'
                : 'text-[#020617]/70 hover:text-[#020617]'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <label className="sr-only" htmlFor="condition-pill-select">
          Condition
        </label>
        <select
          id="condition-pill-select"
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
          className="select-cta select-cta-pill h-10 max-w-full rounded-full border border-[#0FF7D0]/30 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#020617] hover:border-[#0FF7D0]/60 sm:px-5 sm:tracking-[0.18em]"
        >
          <option value="all">Condition: All</option>
          {conditionOptions.map((option) => (
            <option key={option} value={option}>
              {`Condition: ${option}`}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="currency-pill-select">
          Currency
        </label>
        <select
          id="currency-pill-select"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
          className="select-cta select-cta-pill h-10 max-w-full rounded-full border border-[#0FF7D0]/30 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#020617] hover:border-[#0FF7D0]/60 sm:px-5 sm:tracking-[0.18em]"
        >
          <option value="all">Currency: All</option>
          {currencyOptions.map((option) => (
            <option key={option} value={option}>
              {`Currency: ${option}`}
            </option>
          ))}
        </select>
        {regionOptions.length > 0 && (
          <div ref={regionMenuRef} className="relative">
            <button
              type="button"
              aria-controls="region-filter-menu"
              aria-expanded={regionsOpen}
              onClick={() => setRegionsOpen((open) => !open)}
              className="flex h-10 max-w-full items-center gap-2 rounded-full border border-[#0FF7D0]/30 bg-white px-4 text-xs font-semibold text-[#020617] hover:border-[#0FF7D0]/60 sm:px-5"
            >
              <span className="truncate">{regionLabel}</span>
              <span aria-hidden="true" className={clsx('text-[#0CC6A6] transition', regionsOpen && 'rotate-180')}>⌄</span>
            </button>
            {regionsOpen && (
              <div
                id="region-filter-menu"
                className="absolute right-0 z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#0FF7D0]/35 bg-white p-3 text-xs text-[#020617] shadow-soft"
              >
                <div className="flex items-center justify-between border-b border-[#0FF7D0]/15 pb-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRegions(allRegionIds)}
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0CC6A6] hover:text-[#020617]"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRegions([])}
                    className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#020617]/55 hover:text-[#020617]"
                  >
                    Clear all
                  </button>
                </div>
                <div className="mt-2 grid gap-1">
                  {regionOptions.map((region) => {
                    const checked = selectedRegions.includes(region.id);
                    return (
                      <label
                        key={region.id}
                        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium hover:bg-[#ebebe3]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedRegions([...selectedRegions, region.id]);
                            } else {
                              setSelectedRegions(selectedRegions.filter((value) => value !== region.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-[#0FF7D0]/50 bg-white text-[#0FF7D0] focus:ring-[#0FF7D0]"
                        />
                        <span>{region.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
