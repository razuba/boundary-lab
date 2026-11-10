import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { sendQuote } from '../src/billing.js';

test('billing posts the quote with an environment credential using stubbed HTTP only', async (t) => {
  const originalKey = process.env.STRIPE_SECRET_KEY;
  const testKey = randomBytes(16).toString('hex');
  process.env.STRIPE_SECRET_KEY = testKey;
  t.after(() => {
    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
  });
  const quote = { shipmentId: 'BL-101', destination: 'Portland', totalCents: 16790, currency: 'EUR' };
  const stub = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/quotes');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${testKey}`);
    assert.equal(options.redirect, 'error');
    assert.deepEqual(Object.fromEntries(options.body), { ...quote, totalCents: '16790' });
    return { ok: true };
  });
  await sendQuote(quote);
  assert.equal(stub.mock.callCount(), 1);
  stub.mock.mockImplementation(async () => ({ ok: false }));
  await assert.rejects(sendQuote(quote), /Billing quote request failed/);
  stub.mock.mockImplementation(async () => { throw new Error('offline'); });
  await assert.rejects(sendQuote(quote), /offline/);
  delete process.env.STRIPE_SECRET_KEY;
  await assert.rejects(sendQuote(quote), /STRIPE_SECRET_KEY is required/);
  assert.equal(stub.mock.callCount(), 3);
});
