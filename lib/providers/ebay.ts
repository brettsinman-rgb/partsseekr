import type { ProviderCandidate, ProviderSearchOptions, SearchProvider } from './types';

const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID;
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET;
const EBAY_CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID;
const EBAY_DEFAULT_MARKETPLACE = process.env.EBAY_MARKETPLACE_ID || 'EBAY_MOTOR';

let cachedToken: { token: string; expiresAt: number } | null = null;

type EbayTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type EbayItemSummary = {
  image?: { imageUrl?: string };
  thumbnailImages?: Array<{ imageUrl?: string }>;
  price?: { value?: string; currency?: string };
  shippingOptions?: Array<{ shippingCost?: { value?: string; currency?: string } }>;
  itemWebUrl?: string;
  itemAffiliateWebUrl?: string;
  itemHref?: string;
  title?: string;
  brand?: string;
  seller?: { username?: string };
  condition?: string;
  estimatedAvailabilityStatus?: string;
  matchScore?: number;
};

function base64Credentials() {
  if (!EBAY_CLIENT_ID || !EBAY_CLIENT_SECRET) return null;
  return Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString('base64');
}

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const credentials = base64Credentials();
  if (!credentials) return null;

  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope'
    })
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'No error body');
    console.error('eBay Auth failed:', response.status, response.statusText, errorBody);
    return null;
  }
  const json = (await response.json()) as EbayTokenResponse;
  if (!json.access_token) return null;

  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 7200) * 1000
  };

  return json.access_token;
}

function marketplaceFromCountry(country?: string) {
  if (!country || country === 'WORLD') return EBAY_DEFAULT_MARKETPLACE;
  const map: Record<string, string> = {
    AUS: 'EBAY_AU',
    AU: 'EBAY_AU',
    USA: 'EBAY_US',
    US: 'EBAY_US',
    GBR: 'EBAY_GB',
    GB: 'EBAY_GB',
    CAN: 'EBAY_CA',
    CA: 'EBAY_CA',
    NZL: 'EBAY_NZ',
    NZ: 'EBAY_NZ',
    DEU: 'EBAY_DE',
    DE: 'EBAY_DE',
    FRA: 'EBAY_FR',
    FR: 'EBAY_FR',
    EU: 'EBAY_DE'
  };
  return map[country] ?? EBAY_DEFAULT_MARKETPLACE;
}

async function searchByMarketplace(query: string, marketplaceId: string, token: string) {
  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  
  const negativeKeywords = ' -shoe -sneaker -clothing -nike -adidas -apparel -toy -shirt -boot -trainer -jordan -dunk -yeezy';
  const refinedQuery = `${query}${negativeKeywords}`;
    
  url.searchParams.set('q', refinedQuery);
  url.searchParams.set('limit', '50');
  url.searchParams.set('auto_correct', 'KEYWORD');
  // Category 6000 is for eBay Motors
  url.searchParams.set('category_ids', '6000');
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
      ...(EBAY_CAMPAIGN_ID ? { 
        'X-EBAY-C-ENDUSERCTX': `affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=partseekr-001,contextId=partseekr-001` 
      } : {})
    }
  });

  if (!response.ok) return [];
  const json = (await response.json()) as { itemSummaries?: EbayItemSummary[] };
  const items = Array.isArray(json.itemSummaries) ? json.itemSummaries : [];
  return items.map((item, idx) => normalizeItem(item, marketplaceId, idx)).filter(Boolean) as ProviderCandidate[];
}

export function cleanEbayOutboundUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase().includes('ebay')) {
      parsed.searchParams.delete('_skw');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function normalizeItem(item: EbayItemSummary, marketplaceId: string, index: number): ProviderCandidate | null {
  const imageUrl = item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || '';
  const priceValue = item.price?.value ? Number(item.price.value) : undefined;
  const currency = item.price?.currency || undefined;
  const shippingCost = item.shippingOptions?.[0]?.shippingCost?.value;
  const shippingCurrency = item.shippingOptions?.[0]?.shippingCost?.currency;
  const shippingValue = shippingCost ? Number(shippingCost) : undefined;

  const rawProductUrl = item.itemAffiliateWebUrl || item.itemWebUrl || item.itemHref || undefined;
  const productUrl = rawProductUrl ? cleanEbayOutboundUrl(rawProductUrl) : undefined;

  if (!item.title || !imageUrl || !priceValue || !currency || !productUrl) return null;

  return {
    title: item.title,
    brand: item.brand || undefined,
    image: imageUrl,
    store: item.seller?.username || 'ebay.com',
    price: priceValue,
    currency,
    shippingPrice: shippingCurrency === currency ? shippingValue : shippingValue,
    condition: item.condition || undefined,
    availability: item.estimatedAvailabilityStatus || undefined,
    marketplace: marketplaceId,
    productUrl,
    matchScore: typeof item.matchScore === 'number' ? item.matchScore : Math.max(0, 1 - index / 100),
    raw: item
  };
}

export const ebayProvider: SearchProvider = {
  id: 'ebay',
  name: 'eBay Motors',
  async searchByImage(imageUrl: string, options?: ProviderSearchOptions, imageBase64?: string) {
    const token = await getAccessToken();
    if (!token || !imageBase64) return [];

    const marketplaceId = marketplaceFromCountry(options?.country);
    const marketplaces =
      !options?.country || options.country === 'WORLD'
        ? ['EBAY_AU', 'EBAY_US', 'EBAY_GB', 'EBAY_DE', 'EBAY_CA']
        : [marketplaceId];

    const results: ProviderCandidate[] = [];

    const marketResults = await Promise.all(
      marketplaces.map(async (market) => {
        const response = await fetch('https://api.ebay.com/buy/browse/v1/item_summary/search_by_image?limit=50', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-MARKETPLACE-ID': market,
            ...(EBAY_CAMPAIGN_ID ? { 
              'X-EBAY-C-ENDUSERCTX': `affiliateCampaignId=${EBAY_CAMPAIGN_ID},affiliateReferenceId=partseekr-001,contextId=partseekr-001` 
            } : {})
          },
          body: JSON.stringify({ image: imageBase64 })
        });

        if (!response.ok) return [];
        const json = (await response.json()) as { itemSummaries?: EbayItemSummary[] };
        const items = Array.isArray(json.itemSummaries) ? json.itemSummaries : [];
        return items.map((item, idx) => normalizeItem(item, market, idx)).filter(Boolean) as ProviderCandidate[];
      })
    );

    for (const res of marketResults) {
      results.push(...res);
    }

    return results;
  },
  async searchByText(query: string, options?: ProviderSearchOptions) {
    const token = await getAccessToken();
    if (!token) return [];

    const marketplaceId = marketplaceFromCountry(options?.country);
    
    // If a specific country is requested (not WORLD/undefined), only search that marketplace
    if (options?.country && options.country !== 'WORLD') {
      return await searchByMarketplace(query, marketplaceId, token);
    }

    // Otherwise, search all requested marketplaces in parallel
    const marketplaces = ["EBAY_AU", "EBAY_US", "EBAY_GB", "EBAY_DE", "EBAY_CA"];
    
    const results = await Promise.all(
      marketplaces.map((market) => searchByMarketplace(query, market, token))
    );

    return results.flat();
  }
};
