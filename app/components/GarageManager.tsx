'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { manufacturerLogo, type GarageVehicleStats } from '@/lib/garage-vehicles';

export type GarageVehicleItem = {
  id: string;
  make: string;
  model: string;
  year: number;
  series?: string | null;
  engine?: string | null;
  badge?: string | null;
  createdAt?: string;
  updatedAt?: string;
  stats?: GarageVehicleStats;
};

type GarageFormState = {
  make: string;
  model: string;
  year: string;
  series: string;
  engine: string;
  badge: string;
};

const emptyForm: GarageFormState = {
  make: '',
  model: '',
  year: '',
  series: '',
  engine: '',
  badge: ''
};

function formFromVehicle(vehicle: GarageVehicleItem): GarageFormState {
  return {
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    series: vehicle.series ?? '',
    engine: vehicle.engine ?? '',
    badge: vehicle.badge ?? ''
  };
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as { error?: string; vehicle?: GarageVehicleItem };
  } catch {
    return null;
  }
}

function VehicleVisual({ vehicle }: { vehicle: GarageVehicleItem }) {
  const logo = manufacturerLogo(vehicle.make);

  return (
    <div className="relative h-36 overflow-hidden rounded-[26px] bg-[#111111] p-5 sm:h-40">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(15,247,208,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_42%)]" />
      <div className="absolute bottom-4 left-5 right-5 h-px bg-[#0FF7D0]/45" />
      {logo ? (
        <div className="relative z-10 flex h-full items-center justify-center">
          <div className="relative h-20 w-32 opacity-95">
            <Image src={logo} alt={`${vehicle.make} logo`} fill sizes="128px" className="object-contain" />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full items-end justify-center text-[#0FF7D0]/72">
          <svg viewBox="0 0 260 96" className="h-24 w-full" fill="none" aria-hidden="true">
            <path d="M34 60c12-23 26-34 50-34h56c24 0 45 13 64 34h18c8 0 14 6 14 14v4H22v-4c0-8 5-14 12-14Z" stroke="currentColor" strokeWidth="6" strokeLinejoin="round" />
            <path d="M83 28 66 58M147 28l31 30" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <circle cx="72" cy="78" r="13" stroke="currentColor" strokeWidth="6" />
            <circle cx="194" cy="78" r="13" stroke="currentColor" strokeWidth="6" />
          </svg>
        </div>
      )}
      <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#111111]">
        {vehicle.year}
      </div>
    </div>
  );
}

export default function GarageManager({ initialVehicles }: { initialVehicles: GarageVehicleItem[] }) {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [form, setForm] = useState<GarageFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(initialVehicles.length === 0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateForm = (key: keyof GarageFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
    setMessage(null);
  };

  const submitVehicle = async () => {
    setLoading(true);
    setMessage(null);

    const response = await fetch(editingId ? `/api/garage/${editingId}` : '/api/garage', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        year: Number(form.year)
      })
    }).catch(() => null);

    if (!response) {
      setMessage('Could not save vehicle. Please try again.');
      setLoading(false);
      return;
    }

    const json = await readJson(response);
    if (!response.ok || !json?.vehicle) {
      setMessage(json?.error || 'Could not save vehicle. Please try again.');
      setLoading(false);
      return;
    }

    setVehicles((current) =>
      editingId
        ? current.map((vehicle) => (vehicle.id === editingId ? { ...vehicle, ...json.vehicle } as GarageVehicleItem : vehicle))
        : [{ ...(json.vehicle as GarageVehicleItem), stats: { activePriceAlerts: 0, savedSearches: 0, triggeredAlerts: 0 } }, ...current]
    );
    setLoading(false);
    resetForm();
  };

  const editVehicle = (vehicle: GarageVehicleItem) => {
    setEditingId(vehicle.id);
    setForm(formFromVehicle(vehicle));
    setOpen(true);
    setMessage(null);
  };

  const removeVehicle = async (id: string) => {
    const response = await fetch(`/api/garage/${id}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      setMessage('Could not remove vehicle. Please try again.');
      return;
    }
    setVehicles((current) => current.filter((vehicle) => vehicle.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] bg-white/82 p-5 shadow-sm ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0CC6A6]">Saved vehicles</p>
          <h2 className="mt-1 text-2xl font-bold text-[#111111]">{vehicles.length} in your garage</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setEditingId(null);
            setForm(emptyForm);
          }}
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#111111] px-5 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-[#0FF7D0] hover:text-[#07181b]"
        >
          + Add Vehicle
        </button>
      </div>

      {open && (
        <div className="rounded-[28px] bg-white p-5 shadow-[0_22px_70px_-55px_rgba(17,17,17,0.55)] ring-1 ring-[#0FF7D0]/20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">Make</span>
              <input value={form.make} onChange={(event) => updateForm('make', event.target.value)} className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">Model</span>
              <input value={form.model} onChange={(event) => updateForm('model', event.target.value)} className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">Year</span>
              <input type="number" value={form.year} onChange={(event) => updateForm('year', event.target.value)} className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">Series</span>
              <input value={form.series} onChange={(event) => updateForm('series', event.target.value)} className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">Engine</span>
              <input value={form.engine} onChange={(event) => updateForm('engine', event.target.value)} className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#262626]/55">Badge</span>
              <input value={form.badge} onChange={(event) => updateForm('badge', event.target.value)} className="mt-1 h-11 w-full rounded-[22px] bg-[#f8f9f6] px-4 text-sm font-medium outline-none ring-1 ring-black/10 focus:ring-2 focus:ring-[#0FF7D0]/45" />
            </label>
          </div>
          {message && <p className="mt-4 text-sm font-medium text-red-600">{message}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={submitVehicle} disabled={loading} className="h-10 rounded-full bg-[#0FF7D0] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#07181b] transition hover:bg-[#0CC6A6] disabled:cursor-wait disabled:opacity-60">
              {loading ? 'Saving...' : editingId ? 'Save Changes' : 'Add Vehicle'}
            </button>
            <button type="button" onClick={resetForm} className="h-10 rounded-full border border-[#262626]/12 px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#262626] transition hover:border-[#0FF7D0]/60 hover:bg-[#0FF7D0]/10">
              Cancel
            </button>
          </div>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="rounded-[30px] bg-white/78 p-12 text-center shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold text-[#111111]">No vehicles saved yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#262626]/55">
            Add your vehicle details so PartsSeekr can keep your searches organised around the cars you actually maintain.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {vehicles.map((vehicle) => (
            <article key={vehicle.id} className="group overflow-hidden rounded-[32px] bg-white/90 p-3 shadow-[0_22px_70px_-55px_rgba(17,17,17,0.7)] ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_28px_80px_-52px_rgba(17,17,17,0.75)]">
              <VehicleVisual vehicle={vehicle} />
              <div className="p-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0CC6A6]">{vehicle.year}</p>
                    <h3 className="mt-1 truncate text-2xl font-bold tracking-tight text-[#111111]">{vehicle.make} {vehicle.model}</h3>
                    {(vehicle.badge || vehicle.series) && (
                      <p className="mt-1 text-sm font-semibold text-[#262626]/58">{[vehicle.badge, vehicle.series].filter(Boolean).join(' / ')}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[#262626]/58">
                      {vehicle.engine && <span className="rounded-full bg-[#f8f9f6] px-3 py-1">{vehicle.engine}</span>}
                      {!vehicle.engine && !vehicle.badge && !vehicle.series && <span className="rounded-full bg-[#f8f9f6] px-3 py-1">Vehicle profile</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-[18px] bg-[#f8f9f6] p-3">
                    <p className="text-lg font-bold text-[#111111]">{vehicle.stats?.activePriceAlerts ?? 0}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-[#262626]/45">Active Alerts</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8f9f6] p-3">
                    <p className="text-lg font-bold text-[#111111]">{vehicle.stats?.savedSearches ?? 0}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-[#262626]/45">Saved Searches</p>
                  </div>
                  <div className="rounded-[18px] bg-[#f8f9f6] p-3">
                    <p className="text-lg font-bold text-[#111111]">{vehicle.stats?.triggeredAlerts ?? 0}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase leading-4 tracking-[0.12em] text-[#262626]/45">Triggered</p>
                  </div>
                </div>

                <div className="mt-5 rounded-[20px] border border-dashed border-[#262626]/10 bg-white/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#262626]/40">Recommendations</p>
                  <p className="mt-1 text-xs font-medium text-[#262626]/45">Coming soon for this vehicle.</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/?vehicle=${encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model}`)}`} className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[#0FF7D0] hover:text-[#07181b]">
                    View Parts
                  </Link>
                  <button type="button" onClick={() => editVehicle(vehicle)} className="h-9 rounded-full border border-[#262626]/12 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#262626] transition hover:border-[#0FF7D0]/60 hover:bg-[#0FF7D0]/10">
                    Edit
                  </button>
                  <button type="button" onClick={() => removeVehicle(vehicle.id)} className="h-9 rounded-full bg-[#111111] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-red-600">
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
