import { prisma } from '@/lib/db';
import { getProviders } from '@/lib/providers';
import { normalizeCandidates, sortResults } from '@/lib/normalize';
import { buildSearchQueryPlan } from '@/lib/search-query';
import { sanitizeUrl } from '@/lib/utils';
import { sendPriceAlertEmail } from '@/lib/price-alert-notifications';

export type LowestPriceMatch = {
  price: number;
  currency: string;
  title: string;
  productUrl: string;
  image?: string | null;
  result: PriceComparableResult;
};

type PriceComparableResult = {
  title: string;
  price: number;
  currency: string;
  shippingPrice?: number | null;
  productUrl: string;
  image?: string | null;
};

function enabledTextProviders() {
  return getProviders().filter((provider) => {
    if (!provider.searchByText) return false;
    if (provider.id === 'ebay') {
      return Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
    }
    if (provider.id === 'aliexpress') {
      return Boolean(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET && process.env.ALIEXPRESS_TRACK_ID);
    }
    return true;
  });
}

function effectivePrice(result: PriceComparableResult) {
  return result.price + (result.shippingPrice ?? 0);
}

export function findLowestResult<T extends PriceComparableResult>(results: T[]): LowestPriceMatch | null {
  const cheapest = [...results]
    .filter((result) => result.productUrl && Number.isFinite(result.price))
    .sort((a, b) => effectivePrice(a) - effectivePrice(b))[0];

  if (!cheapest) return null;

  return {
    price: effectivePrice(cheapest),
    currency: cheapest.currency,
    title: cheapest.title,
    productUrl: cheapest.productUrl,
    image: cheapest.image,
    result: cheapest
  };
}

export async function runPriceAlertSearch(searchQuery: string, manufacturer?: string | null) {
  const query =
    manufacturer && !searchQuery.toLowerCase().startsWith(manufacturer.toLowerCase())
      ? `${manufacturer} ${searchQuery}`.trim()
      : searchQuery;
  const queryPlan = buildSearchQueryPlan(query);
  const providers = enabledTextProviders();
  const candidates = await Promise.all(
    providers.map(async (provider) => {
      try {
        const batches = await Promise.all(
          queryPlan.variants.map((variant) => provider.searchByText?.(variant, {}) ?? [])
        );
        return batches.flat();
      } catch (error) {
        console.error(`[PriceAlert] Provider ${provider.id} failed:`, error);
        return [];
      }
    })
  );

  const uniqueCandidates = new Map<string, (typeof candidates)[number][number]>();
  for (const candidate of candidates.flat()) {
    const productUrl = sanitizeUrl(candidate.productUrl);
    if (productUrl && !uniqueCandidates.has(productUrl)) {
      uniqueCandidates.set(productUrl, { ...candidate, productUrl });
    }
  }

  const normalized = normalizeCandidates(Array.from(uniqueCandidates.values()), queryPlan.original);
  return sortResults(normalized, 'best');
}

export async function checkPriceAlert(alertId: string) {
  const alert = await prisma.priceAlert.findUnique({
    where: { id: alertId },
    include: { user: { select: { email: true } } }
  });
  if (!alert || alert.status !== 'active') return null;

  const results = await runPriceAlertSearch(alert.searchQuery, alert.manufacturer);
  const lowest = findLowestResult(results);
  const now = new Date();

  if (!lowest) {
    return prisma.priceAlert.update({
      where: { id: alert.id },
      data: { lastCheckedAt: now }
    });
  }

  const triggered = alert.targetPrice != null
    ? lowest.currency === alert.currency && lowest.price <= alert.targetPrice
    : alert.currentLowestPrice != null && lowest.currency === alert.currency && lowest.price < alert.currentLowestPrice;

  const updated = await prisma.priceAlert.update({
    where: { id: alert.id },
    data: {
      currentLowestPrice: lowest.price,
      currency: lowest.currency,
      lastCheckedAt: now,
      lastResultTitle: lowest.title,
      lastResultUrl: lowest.productUrl,
      lastResultPrice: lowest.price,
      lastResultImage: lowest.image,
      triggeredPrice: triggered ? lowest.price : alert.triggeredPrice,
      triggeredProductTitle: triggered ? lowest.title : alert.triggeredProductTitle,
      triggeredProductUrl: triggered ? lowest.productUrl : alert.triggeredProductUrl,
      triggeredProductImage: triggered ? lowest.image : alert.triggeredProductImage,
      notificationType: triggered ? 'in_app,email' : alert.notificationType,
      notificationStatus: triggered ? 'pending' : alert.notificationStatus,
      status: triggered ? 'triggered' : alert.status,
      triggeredAt: triggered ? now : alert.triggeredAt
    }
  });

  if (triggered) {
    const email = await sendPriceAlertEmail({
      to: alert.user.email,
      searchQuery: alert.searchQuery,
      productTitle: lowest.title,
      price: lowest.price,
      currency: lowest.currency,
      productUrl: lowest.productUrl
    }).catch(() => ({ status: 'failed' as const }));

    if (email.status === 'sent') {
      return prisma.priceAlert.update({
        where: { id: alert.id },
        data: { notificationSentAt: now }
      });
    }
  }

  return updated;
}
