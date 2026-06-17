'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadCapture() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [manufacturer, setManufacturer] = useState('Any');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manufacturerGroups = [
    {
      label: 'Standard',
      options: [
        'Any',
        'Acura',
        'Alfa Romeo',
        'Audi',
        'BMW',
        'Buick',
        'Cadillac',
        'Chevrolet',
        'Chrysler',
        'Citroën',
        'Changan',
        'Chery',
        'Dongfeng',
        'Dodge',
        'Fiat',
        'Foton',
        'Ford',
        'GAC',
        'Geely',
        'Great Wall',
        'Genesis',
        'GMC',
        'Haval',
        'Hongqi',
        'Honda',
        'Hyundai',
        'Infiniti',
        'JAC',
        'Jetour',
        'Jaguar',
        'Jeep',
        'Leapmotor',
        'Li Auto',
        'Lynk & Co',
        'Kia',
        'Maxus',
        'MG',
        'NIO',
        'Ora',
        'Lexus',
        'Land Rover',
        'Lincoln',
        'Roewe',
        'Mazda',
        'Mercedes-Benz',
        'Mini',
        'Polestar',
        'Mitsubishi',
        'XPeng',
        'Zeekr',
        'Zotye',
        'Wuling',
        'Nissan',
        'BYD',
        'BAIC',
        'Bestune',
        'Peugeot',
        'Porsche',
        'Ram',
        'Renault',
        'Subaru',
        'Tank',
        'Suzuki',
        'Tesla',
        'Voyah',
        'Toyota',
        'Volkswagen',
        'Volvo'
      ]
    },
    {
      label: 'Super / Hypercar',
      options: [
        'Aston Martin',
        'Bentley',
        'Bugatti',
        'Ferrari',
        'Koenigsegg',
        'Lamborghini',
        'McLaren',
        'Pagani',
        'Rimac',
        'SSC',
        'Zenvo',
        'Gordon Murray',
        'Hennessey',
        'Lotus',
        'Maserati',
        'Pininfarina'
      ]
    },
    {
      label: 'Classic Cars',
      options: [
        'AC',
        'Abarth',
        'Alvis',
        'Armstrong Siddeley',
        'Auburn',
        'Austin-Healey',
        'Auto Union',
        'Borgward',
        'Bristol',
        'Checker',
        'Cord',
        'Daimler',
        'DeSoto',
        'Duesenberg',
        'Facel Vega',
        'Frazer',
        'Hudson',
        'Hupmobile',
        'Jensen',
        'Kaiser',
        'Lancia',
        'MGA',
        'MGB',
        'Morris',
        'Nash',
        'NSU',
        'Opel',
        'Packard',
        'Pierce-Arrow',
        'Rambler',
        'Reliant',
        'Riley',
        'Singer',
        'Sunbeam',
        'Talbot',
        'Triumph',
        'Wolseley'
      ]
    },
    {
      label: 'Defunct / Discontinued',
      options: ['Daewoo', 'Eagle', 'Geo', 'Holden', 'Hummer', 'Mercury', 'Oldsmobile', 'Pontiac', 'Plymouth', 'Rover', 'Saab', 'Saturn', 'Scion']
    }
  ];

  const hasSearchInput = useMemo(() => Boolean(file) || query.trim().length > 0, [file, query]);
  const ctaCopy = loading
    ? 'Searching...'
    : file
      ? 'Find Matching Parts'
      : query.trim()
        ? 'Search Parts'
        : 'Find Best Prices';

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setError(null);
    setFile(selected);
    setFileName(selected?.name ?? '');
    setPreview(selected ? URL.createObjectURL(selected) : null);
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleSubmit = async () => {
    if (!file && !query.trim()) {
      setError('Please add an image or type a product name.');
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData();
    if (file) formData.append('image', file);
    if (query.trim()) {
      const composedQuery =
        manufacturer !== 'Any' ? `${manufacturer} ${query.trim()}` : query.trim();
      formData.append('query', composedQuery);
    }

    try {
      const response = await fetch('/api/search', { method: 'POST', body: formData });
      const raw = await response.text();
      const json = raw ? JSON.parse(raw) : null;
      if (!response.ok) {
        throw new Error(json?.error || 'Upload failed.');
      }
      if (!json?.sessionId) {
        throw new Error('Search did not return a session id.');
      }
      router.push(`/results/${json.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!loading) {
      void handleSubmit();
    }
  };

  return (
    <div className="rounded-[24px] bg-[#f8f9f6] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_18px_55px_-42px_rgba(38,38,38,0.8)] sm:p-4 lg:p-5">
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#262626]/70">PART NAME OR OEM NUMBER</span>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Audi A6 hydraulic pump or 4Z7323167"
              className="h-11 w-full rounded-[22px] bg-white px-4 text-[15px] font-medium text-[#262626] shadow-[0_10px_32px_-28px_rgba(38,38,38,0.7)] ring-1 ring-black/10 outline-none transition placeholder:font-normal placeholder:text-[#262626]/50 focus:shadow-[0_16px_42px_-32px_rgba(15,247,208,0.8)] focus:ring-2 focus:ring-[#0FF7D0]/50"
            />
          </label>

          <div className="grid gap-2.5 md:grid-cols-[minmax(0,360px)_auto] md:items-end md:justify-start">
            <label className="flex min-w-0 flex-col gap-0.5 md:w-[360px]">
              <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#262626]/60">Manufacturer</span>
              <select
                value={manufacturer}
                onChange={(event) => setManufacturer(event.target.value)}
                className="select-cta h-11 w-full rounded-[22px] bg-white px-4 text-sm font-medium text-[#262626] shadow-sm ring-1 ring-black/10 outline-none transition focus:ring-2 focus:ring-[#0FF7D0]/40"
              >
                {manufacturerGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className={[
                'inline-flex h-11 w-full items-center justify-center rounded-[22px] px-4 text-xs font-bold uppercase tracking-[0.18em] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#0FF7D0]/55 focus:ring-offset-2 focus:ring-offset-[#f8f9f6] disabled:cursor-wait disabled:opacity-70 md:w-auto md:min-w-[210px]',
                hasSearchInput
                  ? 'bg-[#111111] text-white shadow-[0_14px_28px_-18px_rgba(17,17,17,0.95)] enabled:hover:-translate-y-0.5 enabled:hover:bg-[#0b0b0b] enabled:hover:shadow-[0_16px_34px_-20px_rgba(15,247,208,0.65)] enabled:hover:ring-2 enabled:hover:ring-[#0FF7D0]/35'
                  : 'bg-[#0FF7D0] text-[#07181b] shadow-sm enabled:hover:bg-[#0CC6A6] enabled:hover:shadow-[0_12px_28px_-22px_rgba(15,247,208,0.85)]'
              ].join(' ')}
              disabled={loading}
            >
              {ctaCopy}
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#262626]/70">SEARCH BY PHOTO</span>
          <label className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-[22px] bg-white px-4 text-xs font-medium uppercase tracking-[0.16em] text-[#262626] shadow-sm ring-1 ring-black/10 transition hover:bg-[#0FF7D0]/10 hover:text-[#0CC6A6] hover:ring-[#0FF7D0]/35">
            Upload
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
          {preview && (
            <div className="mt-2 overflow-hidden rounded-2xl bg-[#fbfcfa] ring-1 ring-black/5">
              <Image
                src={preview}
                alt="Preview"
                width={300}
                height={150}
                sizes="(max-width: 1024px) 100vw, 300px"
                unoptimized
                className="aspect-[2/1] w-full object-contain bg-white"
              />
            </div>
          )}
          {fileName && <p className="truncate text-xs font-normal text-[#262626]/50">{fileName}</p>}
        </div>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-normal text-[#262626]/50">
        <span>Tip: Include the OEM number, fitment, or upload a clear part photo when available.</span>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
