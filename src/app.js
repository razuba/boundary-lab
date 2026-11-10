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
app.get('/shipments/total', (_req, res) => {
  const totalCents = shipments.reduce((sum, shipment) => sum + shipment.charge_usd_cents, 0);
  res.json({ currency: 'USD', total_cents: totalCents });
});
app.get('/rates/daily.json', (_req, res) => res.sendFile(rateSheet));
