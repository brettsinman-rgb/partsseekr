export type QueryKind = 'partNumber' | 'descriptive' | 'mixed';

export type SearchQueryPlan = {
  original: string;
  kind: QueryKind;
  partNumbers: string[];
  variants: string[];
};

const PART_NUMBER_REGEX = /\b(?=[A-Z0-9 -]*\d)(?:[A-Z0-9]{2,}[ -]){1,}[A-Z0-9]{2,}\b|\b(?=[A-Z0-9]*\d)[A-Z0-9]{7,}\b/gi;

const AUTOMOTIVE_BRANDS = [
  'acura', 'alfa', 'aston', 'audi', 'bentley', 'bmw', 'buick', 'cadillac', 'chevrolet',
  'chrysler', 'daihatsu', 'dodge', 'ferrari', 'fiat', 'ford', 'genesis', 'gmc', 'holden',
  'honda', 'hsv', 'hyundai', 'infiniti', 'isuzu', 'jaguar', 'jeep', 'kia', 'lamborghini',
  'land', 'lexus', 'lincoln', 'lotus', 'mazda', 'mclaren', 'mercedes', 'mini',
  'mitsubishi', 'nissan', 'porsche', 'ram', 'rolls', 'subaru', 'suzuki', 'tesla',
  'toyota', 'volkswagen', 'volvo'
];

const PART_START_WORDS = [
  'abs', 'airbag', 'alternator', 'axle', 'ball', 'belt', 'brake', 'bumper', 'caliper',
  'camshaft', 'catalytic', 'clutch', 'compressor', 'control', 'converter', 'coolant',
  'crankshaft', 'cv', 'differential', 'door', 'ecu', 'engine', 'exhaust', 'fender',
  'filter', 'fuel', 'gasket', 'grille', 'headlight', 'headlamp', 'hood', 'hydraulic',
  'injector', 'lamp', 'light', 'maf', 'mirror', 'module', 'motor', 'mount', 'oil',
  'oxygen', 'pump', 'rack', 'radiator', 'regulator', 'relay', 'reservoir', 'rotor',
  'sensor', 'shock', 'starter', 'steering', 'strut', 'suspension', 'switch', 'tail',
  'taillight', 'thermostat', 'throttle', 'tie', 'timing', 'transmission', 'turbo',
  'valve', 'water', 'wheel', 'window', 'wiper'
];

const PART_CONTEXT_VARIANTS: Array<{ phrase: string; variants: string[] }> = [
  { phrase: 'hydraulic pump', variants: ['suspension hydraulic pump', 'power steering hydraulic pump'] },
  { phrase: 'pump', variants: ['replacement pump'] },
  { phrase: 'control module', variants: ['ecu control module', 'electronic control module'] },
  { phrase: 'sensor', variants: ['replacement sensor'] },
  { phrase: 'headlight', variants: ['headlamp headlight'] },
  { phrase: 'taillight', variants: ['tail lamp taillight'] }
];

function compactPartNumber(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isLikelyPartNumberCandidate(value: string) {
  const compacted = compactPartNumber(value);
  if (compacted.length < 7 || !/\d/.test(compacted)) return false;

  const segments = value
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  return !segments.some((segment) => /^[A-Z]+$/.test(segment) && segment.length > 3);
}

function uniquePush(values: string[], value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return;
  const key = normalized.toLowerCase();
  if (!values.some((existing) => existing.toLowerCase() === key)) {
    values.push(normalized);
  }
}

export function extractPartNumbers(query: string): string[] {
  const matches = query.match(PART_NUMBER_REGEX) ?? [];
  const compacted = matches.filter(isLikelyPartNumberCandidate).map(compactPartNumber);
  return Array.from(new Set(compacted));
}

function removePartNumbers(query: string, partNumbers: string[]) {
  let descriptive = query;
  for (const partNumber of partNumbers) {
    const pattern = partNumber.split('').join('[^A-Z0-9]*');
    descriptive = descriptive.replace(new RegExp(pattern, 'gi'), ' ');
  }
  return descriptive.replace(/\s+/g, ' ').trim();
}

function findPartStart(tokens: string[]) {
  const index = tokens.findIndex((token) => PART_START_WORDS.includes(token));
  return index >= 0 ? index : Math.max(0, tokens.length - 2);
}

function contextualPartVariants(partWords: string[]) {
  const part = partWords.join(' ');
  const variants: string[] = [];
  for (const entry of PART_CONTEXT_VARIANTS) {
    if (part.includes(entry.phrase)) {
      for (const variant of entry.variants) uniquePush(variants, variant);
    }
  }
  return variants;
}

function descriptiveVariants(query: string) {
  const variants: string[] = [];
  uniquePush(variants, query);

  const words = query
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const lowerWords = words.map((word) => word.toLowerCase());
  if (words.length < 2) return variants;

  const partStart = findPartStart(lowerWords);
  const vehicleWords = words.slice(0, partStart);
  const partWords = words.slice(partStart);
  const lowerVehicleWords = lowerWords.slice(0, partStart);
  const brandIndex = lowerVehicleWords.findIndex((word) => AUTOMOTIVE_BRANDS.includes(word));
  const brand = brandIndex >= 0 ? words[brandIndex] : vehicleWords[0];
  const modelWords = brandIndex >= 0 ? vehicleWords.slice(brandIndex + 1) : vehicleWords.slice(1);
  const part = partWords.map((word) => word.toLowerCase()).join(' ');

  if (!part) return variants;

  for (const contextualPart of contextualPartVariants(partWords.map((word) => word.toLowerCase()))) {
    uniquePush(variants, [...vehicleWords, contextualPart].join(' '));
  }

  if (brand && modelWords.length > 0) {
    uniquePush(variants, [brand, modelWords[modelWords.length - 1], part].join(' '));
    uniquePush(variants, [brand, modelWords[0], part].join(' '));
    uniquePush(variants, [brand, part].join(' '));
  }

  uniquePush(variants, `${query} OEM`);
  uniquePush(variants, `${query} replacement`);

  return variants.slice(0, 8);
}

export function buildSearchQueryPlan(query: string): SearchQueryPlan {
  const original = query.replace(/\s+/g, ' ').trim();
  const partNumbers = extractPartNumbers(original);
  const descriptive = removePartNumbers(original, partNumbers);
  const kind: QueryKind =
    partNumbers.length > 0 && descriptive.length > 0
      ? 'mixed'
      : partNumbers.length > 0
        ? 'partNumber'
        : 'descriptive';

  const variants: string[] = [];
  uniquePush(variants, original);

  if (kind === 'partNumber') {
    for (const partNumber of partNumbers) uniquePush(variants, partNumber);
  } else {
    for (const variant of descriptiveVariants(descriptive || original)) uniquePush(variants, variant);
    if (kind === 'mixed') {
      for (const partNumber of partNumbers) uniquePush(variants, partNumber);
    }
  }

  return {
    original,
    kind,
    partNumbers,
    variants: variants.slice(0, kind === 'partNumber' ? 3 : 8)
  };
}
