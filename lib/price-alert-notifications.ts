type PriceAlertEmailInput = {
  to?: string | null;
  searchQuery: string;
  productTitle: string;
  price: number;
  currency: string;
  productUrl: string;
};

function formatPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export async function sendPriceAlertEmail(input: PriceAlertEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PRICE_ALERT_EMAIL_FROM;

  if (!apiKey || !from || !input.to) {
    return { status: 'skipped' as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: `PartsSeekr Price Alert: ${formatPrice(input.price, input.currency)}`,
      text: [
        `A matching part is now available for ${formatPrice(input.price, input.currency)}.`,
        '',
        input.productTitle,
        `Search: ${input.searchQuery}`,
        input.productUrl
      ].join('\n')
    })
  });

  if (!response.ok) {
    return { status: 'failed' as const };
  }

  return { status: 'sent' as const };
}
