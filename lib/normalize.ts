import type { NormalizedResult, ProviderCandidate } from './providers/types';
import { extractPartNumbers } from './search-query';

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeAlnum(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function jaccardSimilarity(a: string, b: string): number {
  const aTokens = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const bTokens = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (!aTokens.size || !bTokens.size) return 0;
  const intersection = [...aTokens].filter((t) => bTokens.has(t)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function priceClose(a?: number, b?: number) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= Math.max(3, a * 0.05);
}

const SAFE_DOMAINS = [
  'rockauto.', 'autozone.', 'carparts.', 'partsgeek.',
  'advanceautoparts.', 'oreillyauto.', 'napaonline.', 'summitracing.', 
  'jegs.', 'fcpeuro.', 'ecstuning.', 'pelicanparts.', 'europarts.', 
  'buyautoparts.', 'parts.com', 'mopar.com', 'ford.com', 'gmparts.',
  'genuineparts', 'autoparts', 'carid.', 'autopartswarehouse.',
  'car-part.', 'lkqcorp.', 'stockwiseauto.', '1aauto.', 'hollanderparts.'
];

const GENERAL_MARKETPLACES = ['ebay.', 'amazon.', 'marketplace', 'etsy.', 'aliexpress'];

const BANNED_DOMAINS = [
  'target.com', 'walmart.com', 'macys.com', 'nordstrom.com', 'nike.com',
  'adidas.com', 'zappos.com', 'redbubble.com', 'teepublic.com',
  'spreadshirt.com', 'cafepress.com', 'zazzle.com', 'temu.com', 'shein.com',
  'bestbuy.com', 'kohls.com', 'ralphlauren.com', 'gap.com', 'oldnavy.com'
];

function getRelevanceScore(title: string, productUrl: string, query?: string): number {
  const normalizedTitle = ` ${title.toLowerCase()} `;
  const normalizedUrl = productUrl.toLowerCase();
  
  const mechanicalVerifiers = [
    'assembly', 'fitment', 'oem', 'replacement', 'liter', 'cylinder', 'v6', 'v8', 'v4', 'turbo', 
    'diesel', 'engine', 'brake pad', 'brake rotor', 'strut', 'shock absorber', 'gasket', 'seal', 
    'alternator', 'starter', 'radiator', 'exhaust manifold', 'catalytic converter', 'clutch', 
    'differential', 'cv joint', 'wheel hub', 'control arm', 'tie rod', 'ball joint',
    'spark plug', 'fuel injector', 'fuel pump', 'air filter', 'oil filter', 'timing belt',
    'serpentine belt', 'drive belt', 'transmission', 'gearbox', 'piston', 'ring', 'crankshaft',
    'camshaft', 'valve cover', 'cylinder head', 'intake manifold', 'throttle body',
    'headlight', 'taillight', 'headlamp', 'taillamp', 'bumper', 'grille', 'fender', 'fenders', 'side mirror',
    'door handle', 'window regulator', 'wiper motor', 'wiper blade', 'car part', 'auto part', 'spare part',
    'wheel', 'tire', 'rim', 'alloy', 'lug nut', 'brake', 'suspension', 'coilover', 'spring',
    'muffler', 'exhaust', 'tailpipe', 'intercooler', 'manifold', 'sensor', 'ecu', 'module',
    'switch', 'relay', 'fuse', 'battery', 'cable', 'harness', 'lamp', 'bulb', 'lens',
    'mirror', 'glass', 'windshield', 'hood', 'bonnet', 'trunk', 'boot lid', 'door',
    'seat', 'steering', 'dash', 'console', 'trim', 'molding', 'badge', 'emblem',
    'part', 'component', 'unit', 'accessory', 'kit', 'repair', 'rebuild', 'mount',
    'hose', 'pipe', 'line', 'belt', 'pulley', 'tensioner', 'pump', 'tank', 'reservoir',
    'fog light', 'fog lamp', 'marker light', 'side marker', 'turn signal', 'indicator',
    'roof rack', 'tow bar', 'hitch', 'bull bar', 'grille guard', 'skid plate',
    'spoiler', 'wing', 'body kit', 'diffuser', 'side skirt', 'fender flare',
    'engine mount', 'transmission mount', 'strut mount', 'bushings', 'control module',
    'abs sensor', 'oxygen sensor', 'o2 sensor', 'maf sensor', 'map sensor', 'crank sensor',
    'cam sensor', 'knock sensor', 'temp sensor', 'oil pressure', 'fuel rail', 'fuel line'
  ];

  const negativeKeywords = [
    'toy', 'shirt', 'shoe', 'clothing', 'apparel', 'poster', 'sticker', 'keychain', 'diecast', 'model', 
    'book', 'manual', 'magazine', 'dvd', 'game', 'sneaker', 'trainer', 'boot', 'sandal', 'sock', 
    'pant', 'jacket', 'hoodie', 'hat', 'cap', 'watch', 'phone', 'laptop', 'camera',
    'nike', 'jordan', 'adidas', 'puma', 'reebok', 'dunk', 'air force', 'yeezy', 'max air',
    'polo', 'ralph lauren', 'jersey', 'tee', 't-shirt', 'crewneck', 'v-neck', 'denim', 'jeans',
    'dress', 'suit', 'perfume', 'cologne', 'gucci', 'prada', 'luxury', 'fashion',
    'bag', 'purse', 'handbag', 'crossbody', 'shoulder bag', 'tote', 'wallet', 'clutch bag',
    'necklace', 'bracelet', 'jewelry', 'earring', 'michael kors', 'lululemon', 'ann taylor',
    'coach', 'hermes', 'chanel', 'louis vuitton', 'fossil', 'kate spade',
    'timex', 'casio', 'seiko', 'rolex', 'citizen', 'omega', 'tissot', 'cartier', 'automatic watch',
    'tent', 'camping', 'outdoor', 'hiking', 'backpack', 'sleeping bag', 'torch', 'flashlight'
  ];

  // 1. INSTANT BLOCK: Banned Domains or Fashion Keywords
  if (BANNED_DOMAINS.some(domain => normalizedUrl.includes(domain))) return 0;
  
  // Use regex for whole-word matching on negative keywords
  for (const word of negativeKeywords) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(normalizedTitle)) return 0;
  }

  let score = 0.35; // Increased base score

  // 2. DOMAIN CHECK
  const isSafeDomain = SAFE_DOMAINS.some(domain => normalizedUrl.includes(domain));
  const isGeneralMarket = GENERAL_MARKETPLACES.some(domain => normalizedUrl.includes(domain));

  if (isSafeDomain) score += 0.35;
  if (isGeneralMarket) score += 0.15; // Increased boost for general markets

  // 3. MECHANICAL VERIFICATION (Whole Word Only)
  let mechanicalMatchCount = 0;
  for (const word of mechanicalVerifiers) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(normalizedTitle)) {
      score += 0.25;
      mechanicalMatchCount++;
    }
  }
  
  // Automotive keywords boost
  const autoKeywords = ['car', 'truck', 'vehicle', 'auto', 'motor', 'engine', 'automotive', 'pickup', 'suv', 'sedan', 'coupe'];
  for (const word of autoKeywords) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(normalizedTitle)) {
      score += 0.1; // Increased boost
    }
  }
  
  // Brand names boost
  const brands = [
    'toyota', 'honda', 'ford', 'chevrolet', 'bmw', 'mercedes', 'audi', 'nissan', 
    'hyundai', 'kia', 'mazda', 'lexus', 'volkswagen', 'subaru', 'porsche', 'ferrari',
    'lamborghini', 'mitsubishi', 'dodge', 'jeep', 'chrysler', 'buick', 'cadillac',
    'gmc', 'ram', 'tesla', 'volvo', 'jaguar', 'land rover', 'mini', 'fiat', 'alfa romeo',
    'acura', 'infiniti', 'lincoln', 'mazerati', 'bentley', 'aston martin', 'rolls royce',
    'mclaren', 'lotus', 'genesis', 'isuzu', 'suzuki', 'daihatsu', 'holden', 'hsv', 'fpv'
  ];
  for (const brand of brands) {
    const regex = new RegExp(`\\b${brand}\\b`, 'i');
    if (regex.test(normalizedTitle)) {
      score += 0.15; // Increased boost
      break; 
    }
  }
  const partNumberRegex = /\b([A-Z0-9]{3,}[ -][A-Z0-9]{3,}[ -][A-Z0-9]{2,})\b|\b[A-Z0-9]{7,}\b/i;
  const compactTitle = normalizeAlnum(title);
  const looksLikePartNumber = partNumberRegex.test(normalizedTitle);
  if (looksLikePartNumber) {
    score += 0.4;
  }

  // 5. QUERY SIMILARITY BOOST
  if (query) {
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (queryWords.length > 0) {
      let matchCount = 0;
      for (const word of queryWords) {
        if (normalizedTitle.toLowerCase().includes(word)) matchCount++;
      }
      score += (matchCount / queryWords.length) * 0.3;
    }
  }

  // 6. THE "IRON-CLAD" RULE:
  // If we have a part number query, we MUST have a match for the part number in the title.
  const queryPartNumbers = query ? extractPartNumbers(query) : [];
  if (queryPartNumbers.length > 0) {
    if (!queryPartNumbers.some((partNumber) => compactTitle.includes(partNumber.toLowerCase()))) {
      return 0; // Reject if part number not in title
    }
    score += 0.45;
    // Require automotive context unless the title itself contains a part-number-shaped token.
    const hasAutoKeyword = autoKeywords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(normalizedTitle));
    const hasBrand = brands.some(brand => new RegExp(`\\b${brand}\\b`, 'i').test(normalizedTitle));
    if (mechanicalMatchCount === 0 && !hasAutoKeyword && !hasBrand && !looksLikePartNumber) {
      return 0; // Reject non-automotive item for part number query
    }
  }

  // General Iron-Clad rule for non-part-number queries
  if (!isSafeDomain && mechanicalMatchCount === 0 && !looksLikePartNumber) {
    const hasAutoKeyword = autoKeywords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(normalizedTitle));
    const hasBrand = brands.some(brand => new RegExp(`\\b${brand}\\b`, 'i').test(normalizedTitle));
    if (!normalizedTitle.includes('car part') && !normalizedTitle.includes('auto part') && !normalizedTitle.includes('part number') && !hasAutoKeyword && !hasBrand) {
      return 0;
    }
  }

  const finalScore = Math.min(Math.max(score, 0), 1);
  return finalScore;
}

export function normalizeCondition(value?: string | null): string {
  if (!value) return 'Used';
  const normalized = value.trim().toLowerCase();
  
  const newKeywords = ['new', 'nuovo', 'neu', 'nuevo', 'neuf', '1000', 'brand new', 'new other'];
  if (newKeywords.some(kw => normalized.includes(kw))) return 'New';
  
  return 'Used';
}

export function normalizeCandidates(candidates: ProviderCandidate[], query?: string): NormalizedResult[] {
  const results: NormalizedResult[] = [];

  for (const candidate of candidates) {
    if (!candidate.productUrl || !candidate.title || !candidate.image) {
      continue;
    }
    if (candidate.price == null || !candidate.currency) {
      continue;
    }
    
    let storeHost = '';
    try {
      storeHost = new URL(candidate.productUrl).hostname.replace('www.', '');
    } catch {
      continue;
    }

    const relevanceScore = getRelevanceScore(candidate.title, candidate.productUrl, query);
    
    // STRICT FILTER: Threshold lowered to 0.20
    if (relevanceScore < 0.20) {
      continue;
    }

    const combinedScore = (candidate.matchScore ?? 0.5) * 0.6 + relevanceScore * 0.4;

    results.push({
      title: candidate.title,
      brand: candidate.brand,
      image: candidate.image,
      store: candidate.store ?? storeHost,
      price: candidate.price,
      currency: candidate.currency,
      shippingPrice: candidate.shippingPrice,
      condition: normalizeCondition(candidate.condition),
      availability: candidate.availability,
      rating: candidate.rating,
      reviewCount: candidate.reviewCount,
      marketplace: candidate.marketplace,
      productUrl: candidate.productUrl,
      matchScore: combinedScore
    });
  }

  return dedupeResults(results);
}

export function dedupeResults<T extends NormalizedResult>(results: T[]): T[] {
  const deduped: T[] = [];

  for (const item of results) {
    const hostname = new URL(item.productUrl).hostname;
    const match = deduped.find((existing) => {
      const sameHost = new URL(existing.productUrl).hostname === hostname;
      const similarTitle = jaccardSimilarity(existing.title, item.title) >= 0.6;
      const closePrice = priceClose(existing.price, item.price);
      return sameHost && similarTitle && closePrice;
    });

    if (!match) {
      deduped.push(item);
    }
  }

  return deduped;
}

export function sortResults(results: NormalizedResult[], mode: 'cheapest' | 'expensive' | 'best') {
  const withEffective = results.map((result, index) => ({
    ...result,
    effectivePrice: result.price + (result.shippingPrice ?? 0),
    index
  }));

  const sorted = withEffective.sort((a, b) => {
    if (mode === 'best') {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    }

    if (mode === 'expensive') {
      if (b.effectivePrice !== a.effectivePrice) return b.effectivePrice - a.effectivePrice;
    } else {
      if (a.effectivePrice !== b.effectivePrice) return a.effectivePrice - b.effectivePrice;
    }

    return a.index - b.index;
  });

  return sorted.map((item) => {
    const copy = { ...item } as NormalizedResult & { effectivePrice?: number; index?: number };
    delete copy.effectivePrice;
    delete copy.index;
    return copy;
  });
}
