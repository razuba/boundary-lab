import fetch from 'node-fetch';
import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The dispatch export contains three unquoted columns and integer charges in US cents.
const manifest = readFileSync(new URL('../fixtures/shipments.csv', import.meta.url), 'utf8');
const shipments = manifest.trim().split(/\r?\n/).slice(1).map((row) => {
  const [id, destination, cents] = row.split(',');
  return { id, destination, charge_usd_cents: Number(cents) };
});
const rateSheet = fileURLToPath(new URL('../fixtures/daily-rates.json', import.meta.url));

export const app = express();
app.get('/shipments', (_req, res) => res.json(shipments));
app.get('/shipments/total', async (req, res) => {
  const total = shipments.reduce((sum, shipment) => sum + shipment.charge_usd_cents, 0);
  const currency = req.query.currency ?? 'USD';
  if (currency === 'USD') return res.json({ currency, total_cents: total });
  if (!['EUR', 'CAD'].includes(currency)) return res.status(400).json({ error: 'Unsupported currency' });
  try {
    const url = process.env.RATES_URL || `http://127.0.0.1:${process.env.PORT || 4300}/rates/daily.json`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('Rate feed unavailable');
    const { date, base, rates } = await response.json();
    if (base !== 'USD' || !Number.isFinite(rates?.[currency]) || rates[currency] <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid rate sheet');
    return res.json({ currency, total_cents: Math.round(total * rates[currency]), date });
  } catch {
    return res.status(502).json({ error: 'Rate feed unavailable' });
  }
});
app.get('/rates/daily.json', (_req, res) => res.sendFile(rateSheet));
