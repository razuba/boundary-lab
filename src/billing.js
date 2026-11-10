export async function sendQuote({ shipmentId, destination, totalCents, currency }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is required for billing');

  const response = await fetch('https://api.stripe.com/v1/quotes', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ shipmentId, destination, totalCents: String(totalCents), currency }),
    signal: AbortSignal.timeout(5000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error('Billing quote request failed');
}
