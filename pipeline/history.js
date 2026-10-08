// Rebuilds the account's value history from the transaction ledger and market prices, then validates it
// against the period-start values implied by the broker's own gains.
// Inputs (data dir): tx.csv, snapshot.json, prices_daily.json (daily closes, from fetch_daily.js),
//                    series.json (daily, last year), prices_monthly.json (month ends),
//                    splits.json (optional)
// Output: <data dir>/history.json  { points: [{ t, v, cash, net, src }], check: [...] }
// Usage: node pipeline/history.js [data dir, default data/private]
const fs = require('fs');
const path = require('path');
const { loadTx, replay, instrumentType } = require('./holdings_history.js');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const SNAP = rd('snapshot.json'), S = rd('series.json');
const PM = fs.existsSync(path.join(dir, 'prices_monthly.json')) ? rd('prices_monthly.json') : {};
const PD = fs.existsSync(path.join(dir, 'prices_daily.json')) ? rd('prices_daily.json') : {};
const tx = loadTx(dir), state = replay(tx);
// Chart prices are split-adjusted; ledger quantities before a split are not. splits.json: {isin: [[YYYY-MM-DD, ratio]]}
const SPLITS = fs.existsSync(path.join(dir, 'splits.json')) ? rd('splits.json') : {};
const splitFactor = (isin, t) => (SPLITS[isin] || []).reduce((f, [d, r]) => (t < Date.parse(d + 'T00:00:00Z') ? f * r : f), 1);
const asOf = Date.parse(SNAP.meta.asOf);
const DAY = 864e5;
const monthEnd = (y, m) => Date.UTC(y, m + 1, 0, 21); // m: 0-based

// price sources ---------------------------------------------------------------
// daily closes: the full-history daily file first, then the 12-month series from the broker
const daily = {};
for (const [isin, p] of Object.entries(S.p)) daily[isin] = S.dates.map((d, i) => [Date.parse(d + 'T21:00:00Z'), p[i]]);
for (const [isin, o] of Object.entries(PD)) daily[isin] = o.d.map((d, i) => [Date.parse(d + 'T21:00:00Z'), o.p[i]]);
// last close on or before t (no look-ahead), within a week
const lastClose = (pts, t) => {
  if (!pts || !pts.length || t < pts[0][0] - 3 * DAY || t > pts[pts.length - 1][0] + 7 * DAY) return null;
  let lo = 0, hi = pts.length - 1; if (t < pts[0][0]) return pts[0][1];
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pts[mid][0] <= t + 36e5) lo = mid; else hi = mid - 1; }
  return t - pts[lo][0] > 7 * DAY ? null : pts[lo][1];
};
const monthly = {};
for (const [isin, o] of Object.entries(PM)) {
  const [y, m] = o.start.split('-').map(Number);
  monthly[isin] = o.p.map((p, k) => [monthEnd(y, m - 1 + k), p]);
}
const trades = {};
tx.forEach((r) => { if (r.qty && r.amt && /buy|sell/.test(r.kind)) (trades[r.isin] = trades[r.isin] || []).push([r.t, r.amt / r.qty]); });
const geo = (pts, t) => {
  if (!pts || !pts.length || t < pts[0][0] - 3 * DAY || t > pts[pts.length - 1][0] + 3 * DAY) return null;
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [a, pa] = pts[i - 1], [b, pb] = pts[i]; return Math.exp(Math.log(pa) + ((t - a) / (b - a)) * (Math.log(pb) - Math.log(pa))); }
  return pts[pts.length - 1][1];
};
const nearTrade = (isin, t) => {
  const L = trades[isin]; if (!L) return null;
  let before = null, after = null;
  for (const x of L) { if (x[0] <= t) before = x; else { after = x; break; } }
  if (before && after) return before[1] + ((t - before[0]) / (after[0] - before[0])) * (after[1] - before[1]);
  return (before || after)[1];
};
const used = {};
function price(isin, t) {
  let p = lastClose(daily[isin], t), src = 'daily';
  if (p == null) { p = geo(monthly[isin], t); src = 'monthly'; }
  if (p != null) p *= splitFactor(isin, t);
  if (p == null) { p = nearTrade(isin, t); src = 'trades'; }
  used[src] = (used[src] || 0) + 1;
  return { p, src };
}
function valueAt(t) {
  const s = state(t); let v = s.cash; const fromTrades = [];
  for (const [isin, q] of Object.entries(s.qty)) {
    const { p, src } = price(isin, t);
    if (p == null) { fromTrades.push(isin + ' (no price)'); continue; }
    v += q * p; if (src === 'trades') fromTrades.push(isin);
  }
  return { v, cash: s.cash, approx: fromTrades };
}
const external = tx.filter((r) => ['dep', 'wdr', 'xin', 'xout'].includes(r.kind)).map((r) => ({ t: r.t, a: (['dep', 'xin'].includes(r.kind) ? 1 : -1) * r.amt }));
const netAt = (t) => external.filter((f) => f.t <= t).reduce((s, f) => s + f.a, 0);

// valuation dates: every month end, the broker's period starts, and the valuation time
const first = external[0].t;
const dates = new Set();
for (let y = new Date(first).getUTCFullYear(), m = new Date(first).getUTCMonth(); ; m++) { const t = monthEnd(y, m); if (t >= asOf) break; dates.add(t); }
for (let t = Date.UTC(new Date(first).getUTCFullYear(), new Date(first).getUTCMonth(), new Date(first).getUTCDate(), 21); t < asOf; t += DAY) { const wd = new Date(t).getUTCDay(); if (wd > 0 && wd < 6) dates.add(t); }
const d = new Date(asOf), at = (yy, mm, dd) => Date.UTC(yy, mm, dd, 20);
const starts = { '1W': at(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 7), '1M': at(d.getUTCFullYear(), d.getUTCMonth() - 1, d.getUTCDate()), '3M': at(d.getUTCFullYear(), d.getUTCMonth() - 3, d.getUTCDate()), '6M': at(d.getUTCFullYear(), d.getUTCMonth() - 6, d.getUTCDate()), YTD: at(d.getUTCFullYear() - 1, 11, 31), '1Y': at(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate() - 1) };
Object.values(starts).forEach((t) => dates.add(t));
dates.add(asOf);
const points = [{ t: first - 1, v: 0, cash: 0, net: 0 }].concat(Array.from(dates).sort((a, b) => a - b).map((t) => { const x = valueAt(t); return { t, v: +x.v.toFixed(2), cash: +x.cash.toFixed(2), net: +netAt(t).toFixed(2), approx: x.approx.length ? x.approx : undefined }; }));

// validation against the broker: value at a period start = net at start + all-time gain − period gain
const check = Object.entries(starts).map(([k, t]) => {
  const broker = netAt(t) + SNAP.pl.MAX - SNAP.pl[k];
  const rebuilt = points.find((p) => p.t === t).v;
  return { period: k, date: new Date(t).toISOString().slice(0, 10), broker: +broker.toFixed(0), rebuilt: +rebuilt.toFixed(0), diff: +(rebuilt - broker).toFixed(0), pct: +((rebuilt / broker - 1) * 100).toFixed(2) };
});
check.push({ period: 'now', date: SNAP.meta.asOf.slice(0, 10), broker: SNAP.total, rebuilt: points[points.length - 1].v, diff: +(points[points.length - 1].v - SNAP.total).toFixed(0), pct: +((points[points.length - 1].v / SNAP.total - 1) * 100).toFixed(2) });
// ---- equity book (carve-out): individual shares plus ETFs/ETCs. Crypto and leveraged products are left out;
// money moving between the stock book and the rest of the account counts as an external flow, and stock
// dividends count as income paid out of the book. Cash is not part of the book.
const TYPES = fs.existsSync(path.join(dir, 'types.json')) ? rd('types.json') : {};
const BOOK = ['Shares', 'ETFs & ETCs'];
const isStock = (isin) => isin && BOOK.includes(instrumentType(isin, TYPES));
const sleeveFlows = tx.filter((r) => isStock(r.isin) && ['buy', 'sell', 'div'].includes(r.kind)).map((r) => [r.t, +((r.kind === 'buy' ? 1 : -1) * r.amt).toFixed(2)]);
function stockValueAt(t) {
  const s = state(t); let v = 0;
  for (const [isin, q] of Object.entries(s.qty)) { if (!isStock(isin)) continue; const { p } = price(isin, t); if (p != null) v += q * p; }
  return v;
}
let cumF = 0, fi = 0;
const sleevePoints = points.map((p) => { while (fi < sleeveFlows.length && sleeveFlows[fi][0] <= p.t) cumF += sleeveFlows[fi++][1]; return [p.t, +stockValueAt(p.t).toFixed(2), +cumF.toFixed(2)]; });
const stockNow = SNAP.holdings.filter((h) => isStock(h.isin)).reduce((a, h) => a + h.qty * h.price, 0);
console.log('stock book now: rebuilt', sleevePoints[sleevePoints.length - 1][1].toFixed(0), 'broker', stockNow.toFixed(0));
fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify({ points, check, external: external.map((f) => [f.t, +f.a.toFixed(2)]), stocks: { points: sleevePoints, external: sleeveFlows } }));
console.table(check);
console.log('price sources used:', used);
const approxMonths = points.filter((p) => p.approx && new Date(p.t + DAY).getUTCDate() === 1);
console.log('valuations with trade-price fallbacks:', approxMonths.length, 'e.g.', approxMonths.slice(0, 4).map((p) => new Date(p.t).toISOString().slice(0, 7) + ' ' + p.approx.join('/')).join(' | '));
console.log('min cash', Math.min(...points.map((p) => p.cash)).toFixed(0));
