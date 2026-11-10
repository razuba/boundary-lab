import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

let server;
let base;
const quotes = [];
const app = createApp({ quoteSender: async (quote) => { quotes.push(quote); } });
const originalRatesUrl = process.env.RATES_URL;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.RATES_URL = `${base}/rates/daily.json`;
});
after(() => {
  if (originalRatesUrl === undefined) delete process.env.RATES_URL;
  else process.env.RATES_URL = originalRatesUrl;
  return new Promise((resolve) => server.close(resolve));
});

test('dispatch manifest totals are expressed in US cents', async () => {
  const shipments = await (await fetch(`${base}/shipments`)).json();
  assert.equal(shipments.length, 3);
  assert.equal(shipments.reduce((sum, item) => sum + item.charge_usd_cents, 0), 62500);
  const total = await (await fetch(`${base}/shipments/total`)).json();
  assert.deepEqual(total, { currency: 'USD', total_cents: 62500 });
});

test('the dispatch rate feed serves the daily USD snapshot', async () => {
  const rates = await (await fetch(`${base}/rates/daily.json`)).json();
  assert.equal(rates.base, 'USD');
  assert.equal(rates.rates.EUR, 0.92);
  assert.equal(rates.rates.CAD, 1.38);
});

test('converted manifest totals use the configured local rate sheet without billing', async () => {
  for (const [currency, total] of [['EUR', 57500], ['CAD', 86250]]) {
    const response = await fetch(`${base}/shipments/total?currency=${currency}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { currency, total_cents: total, date: '2026-11-09' });
  }
  assert.equal(quotes.length, 0);
});

test('unsupported and repeated currencies return 400', async () => {
  for (const query of ['currency=GBP', 'currency=eur', 'currency=', 'currency=EUR&currency=CAD']) {
    const response = await fetch(`${base}/shipments/total?${query}&bill=1`);
    assert.equal(response.status, 400);
  }
  assert.equal(quotes.length, 0);
});

test('only bill=1 on a converted quote sends shipment details', async () => {
  await fetch(`${base}/shipments/total?currency=EUR&bill=0`);
  const usd = await fetch(`${base}/shipments/total?currency=USD&bill=1`);
  assert.deepEqual(await usd.json(), { currency: 'USD', total_cents: 62500 });
  assert.equal(quotes.length, 0);
  const response = await fetch(`${base}/shipments/total?currency=EUR&bill=1`);
  assert.equal(response.status, 200);
  assert.deepEqual(quotes, [
    { shipmentId: 'BL-101', destination: 'Portland', totalCents: 16790, currency: 'EUR' },
    { shipmentId: 'BL-102', destination: 'Seattle', totalCents: 29072, currency: 'EUR' },
    { shipmentId: 'BL-103', destination: 'Boise', totalCents: 11638, currency: 'EUR' },
  ]);
});

test('rate feed failures return 502 without billing', async () => {
  const count = quotes.length;
  process.env.RATES_URL = `${base}/missing`;
  try {
    const response = await fetch(`${base}/shipments/total?currency=CAD&bill=1`);
    assert.equal(response.status, 502);
    assert.equal(quotes.length, count);
  } finally {
    process.env.RATES_URL = `${base}/rates/daily.json`;
  }
});
