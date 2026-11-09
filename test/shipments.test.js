import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';
import { app } from '../src/app.js';

let server;
let base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.RATES_URL = base + '/rates/daily.json';
});
after(() => new Promise((resolve) => server.close(resolve)));

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

test('quotes EUR and CAD in cents at the local feed date', async () => {
  for (const [currency, total_cents] of [['EUR', 57500], ['CAD', 86250]]) {
    const response = await fetch(`${base}/shipments/total?currency=${currency}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { currency, total_cents, date: '2026-11-09' });
  }
});

test('rejects an unsupported currency', async () => {
  assert.equal((await fetch(`${base}/shipments/total?currency=JPY`)).status, 400);
});
