'use client';

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
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#0FF7D0] bg-white p-5 shadow-soft md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'cheapest', label: 'Cheapest' },
          { id: 'best', label: 'Best match' }
        ].map((option) => (
          <button
            key={option.id}
            onClick={() => setSortMode(option.id as Props['sortMode'])}
            className={clsx(
              'rounded-full border px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]',
              sortMode === option.id
                ? 'border-[#0FF7D0] bg-[#0FF7D0] text-[#020617]'
                : 'border-[#0FF7D0]/30 text-[#020617] hover:border-[#0FF7D0]/60'
            )}
          >
            {option.label}
          </button>
        ))}
        <label className="sr-only" htmlFor="condition-pill-select">
          Condition
        </label>
        <select
          id="condition-pill-select"
          value={condition}
          onChange={(event) => setCondition(event.target.value)}
          className="select-cta select-cta-pill rounded-full border border-[#0FF7D0]/30 bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#020617] hover:border-[#0FF7D0]/60"
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
          className="select-cta select-cta-pill rounded-full border border-[#0FF7D0]/30 bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#020617] hover:border-[#0FF7D0]/60"
        >
          <option value="all">Currency: All</option>
          {currencyOptions.map((option) => (
            <option key={option} value={option}>
              {`Currency: ${option}`}
            </option>
          ))}
        </select>
      </div>
      {regionOptions.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-[#020617]">
          <span className="w-full text-[11px] font-semibold uppercase tracking-[0.2em]">Regions</span>
          {regionOptions.map((region) => {
            const checked = selectedRegions.includes(region.id);
            return (
              <label key={region.id} className="flex items-center gap-2 rounded-full border border-[#0FF7D0]/30 px-3 py-1">
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
                  className="h-3 w-3 rounded border-[#0FF7D0]/40 bg-white text-[#0FF7D0] focus:ring-[#0FF7D0]"
                />
                {region.label}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
