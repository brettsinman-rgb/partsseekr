export type GarageVehicleStats = {
  activePriceAlerts: number;
  savedSearches: number;
  triggeredAlerts: number;
};

const MANUFACTURER_LOGOS: Record<string, string> = {
  aston: '/logos/Aston.png',
  'aston martin': '/logos/Aston.png',
  audi: '/logos/Audi.png',
  bmw: '/logos/BMW.png',
  hsv: '/logos/HSV.png',
  jag: '/logos/Jag.png',
  jaguar: '/logos/Jag.png',
  lambo: '/logos/Lambo.png',
  lamborghini: '/logos/Lambo.png',
  nissan: '/logos/Nissan.png',
  porsche: '/logos/Porsche.png',
  volvo: '/logos/Volvo.png'
};

export function manufacturerLogo(make?: string | null) {
  if (!make) return null;
  return MANUFACTURER_LOGOS[make.trim().toLowerCase()] ?? null;
}

export function vehicleMatchText(vehicle: { make: string; model: string }) {
  return `${vehicle.make} ${vehicle.model}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function textMatchesVehicle(text: string | null | undefined, vehicle: { make: string; model: string }) {
  if (!text) return false;
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const make = vehicle.make.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const model = vehicle.model.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return Boolean(make && model && normalizedText.includes(make) && normalizedText.includes(model));
}
