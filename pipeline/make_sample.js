// Writes a complete, entirely synthetic data directory (data/sample) so the pipeline and the tests run
// without anyone's personal account data. Prices are seeded random walks; the account, trades and
// profile are invented. Holdings reuse the ISINs of the research notes so the qualitative pages fill in.
// Usage: node pipeline/make_sample.js [out dir, default data/sample]
const fs = require('fs');
const path = require('path');
const out = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'sample'));
fs.mkdirSync(out, { recursive: true });
const STOCKS = require('../research/stocks.js');

let seed = 20240206;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const DAY = 864e5;
const asOf = Date.UTC(2026, 9, 1, 20, 15);

// every second weekday for the last 12 months, plus month ends back to Dec 2023
const daily = []; for (let t = Date.UTC(2025, 9, 2), k = 0; t <= Date.UTC(2026, 9, 1); t += DAY) { const wd = new Date(t).getUTCDay(); if (wd && wd < 6 && k++ % 2 === 0) daily.push(iso(t)); }
if (daily[daily.length - 1] !== '2026-10-01') daily.push('2026-10-01');
const monthly = []; for (let y = 2023, m = 11; y < 2026 || m <= 8; m++) { if (m > 11) { m = 0; y++; } monthly.push(iso(Date.UTC(y, m + 1, 0))); }
monthly.push('2026-10-01');

const META = {
  US67066G1040: ['NVIDIA', 'NVDA', 'Information Technology', 'Semiconductors', 'AI chips & memory', 0.55],
  US8740391003: ['TSMC', 'TSM', 'Information Technology', 'Semiconductor foundry', 'AI chips & memory', 0.4],
  US02079K3059: ['Alphabet', 'GOOGL', 'Communication Services', 'Internet & cloud', 'AI platforms & infrastructure', 0.32],
  US5324571083: ['Eli Lilly', 'LLY', 'Health Care', 'Pharmaceuticals', 'Healthcare', 0.28],
  US5951121038: ['Micron', 'MU', 'Information Technology', 'Memory semiconductors', 'AI chips & memory', 0.6],
  US92537N1081: ['Vertiv', 'VRT', 'Industrials', 'Data-centre power & cooling', 'AI platforms & infrastructure', 0.5],
  CA2926717083: ['Energy Fuels', 'UUUU', 'Energy', 'Uranium & rare earths', 'Critical minerals', 0.7],
  US5533681012: ['MP Materials', 'MP', 'Materials', 'Rare earths', 'Critical minerals', 0.65],
};
const BENCH = [['MSCI', 'MSCI World', 'IE00B4L5Y983', 'iShares Core MSCI World (Acc)', 0.12], ['SPX', 'S&P 500', 'IE00B5BMR087', 'iShares Core S&P 500 (Acc)', 0.14], ['NDX', 'Nasdaq-100', 'IE00B53SZB19', 'iShares Nasdaq 100 (Acc)', 0.2]];

// one random walk per security across the monthly-then-daily calendar; the daily part feeds series.json
function walk(vol, drift, start) {
  const pts = []; let p = start;
  const cal = monthly.filter((d) => d < daily[0]).map((d) => [d, 1 / 12]).concat(daily.map((d) => [d, 2 / 252]));
  for (const [d, dt] of cal) { p *= Math.exp((drift - vol * vol / 2) * dt + vol * Math.sqrt(dt) * gauss()); pts.push([d, +p.toFixed(3)]); }
  return pts;
}
const ser = {}, isins = Object.keys(META).concat(BENCH.map((b) => b[2]));
Object.keys(META).forEach((i) => { ser[i] = walk(META[i][5], 0.25, 20 + rnd() * 200); });
BENCH.forEach((b) => { ser[b[2]] = walk(b[4], 0.09, 100); });
const at = (i, d) => { const s = ser[i]; let best = s[0][1]; for (const [dd, p] of s) { if (dd <= d) best = p; else break; } return best; };
const last = (i) => ser[i][ser[i].length - 1][1];

// synthetic account: monthly deposits, buys spread over time, two closed example positions, dividends
const tx = [];
const add = (date, kind, isin, qty, amt) => tx.push([date + 'T10:00', 'S', kind, isin || '', qty == null ? '' : qty, amt == null ? '' : amt.toFixed(2)].join(','));
for (let y = 2024, m = 1; y < 2026 || m <= 8; m++) { if (m > 11) { m = 0; y++; } add(iso(Date.UTC(y, m, 6)), 'dep', null, null, 650); }
add('2025-06-02', 'wdr', null, null, 3000);
const buys = { US67066G1040: ['2024-05-23', '2025-04-08'], US8740391003: ['2024-07-01'], US02079K3059: ['2024-09-02', '2025-03-03'], US5324571083: ['2024-11-04'], US5951121038: ['2026-09-04'], US92537N1081: ['2026-09-07'], CA2926717083: ['2026-08-07'], US5533681012: ['2026-09-11'] };
const budget = { US67066G1040: 3500, US8740391003: 3000, US02079K3059: 3000, US5324571083: 2500, US5951121038: 1800, US92537N1081: 1400, CA2926717083: 1200, US5533681012: 600 };
const pos = {};
for (const [i, ds] of Object.entries(buys)) for (const d of ds) { const p = at(i, d) * (ser[i][0][0] > d ? 1 : 1); const q = Math.max(1, Math.round(budget[i] / ds.length / p)); add(d, 'buy', i, q, q * p); pos[i] = (pos[i] || 0) + q; }
add('2024-03-04', 'buy', 'XS0000000011', 40, 2000); add('2025-02-03', 'sell', 'XS0000000011', 40, 2460);
add('2025-01-06', 'buy', 'XS0000000022', 30, 1500); add('2025-05-05', 'sell', 'XS0000000022', 30, 1290);
add('2025-11-14', 'buy', 'DE000BB00001', 100, 1000); add('2025-11-20', 'sell', 'DE000BB00001', 100, 420);
add('2025-06-15', 'div', 'US8740391003', null, 6.4); add('2025-12-15', 'div', 'US02079K3059', null, 4.1); add('2026-03-15', 'fee', null, null, 2.99);
tx.sort();
fs.writeFileSync(path.join(out, 'tx.csv'), 'date,cust,kind,isin,qty,amt\n' + tx.join('\n') + '\n');
fs.writeFileSync(path.join(out, 'names.json'), JSON.stringify({ ...Object.fromEntries(Object.entries(META).map(([k, v]) => [k, v[0]])), XS0000000011: 'Example Industrial (sample)', XS0000000022: 'Example Retailer (sample)', DE000BB00001: 'Example Long Turbo (sample)' }, null, 1));

// cost per holding from the synthetic buys
const cost = {}; tx.forEach((l) => { const [, , k, i, q, a] = l.split(','); if (k === 'buy' && META[i]) cost[i] = (cost[i] || 0) + +a; });
const startOf = { '1D': '2026-09-29', '1W': '2026-09-24', '1M': '2026-09-01', '3M': '2026-07-01', '6M': '2026-04-01', YTD: '2025-12-31', '1Y': '2025-10-01', MAX: '2025-10-02' };
const perf = (i, q) => { const o = {}; for (const [k, d] of Object.entries(startOf)) { const p0 = at(i, d); o[k] = [+(last(i) / p0 - 1).toFixed(4), +(last(i) - p0).toFixed(3)]; } if (q) o.SB = [+((q * last(i)) / cost[i] - 1).toFixed(4), +(q * last(i) - cost[i]).toFixed(2)]; return o; };
const holdings = Object.keys(META).map((i) => ({ isin: i, qty: pos[i], price: last(i), quoteMid: last(i), perf: perf(i, pos[i]), name: META[i][0], long: META[i][0], ticker: META[i][1], sector: META[i][2], industry: META[i][3], theme: META[i][4], region: 'United States', ccy: 'USD', scalableNews: null }));
const sec = holdings.reduce((s, h) => s + h.qty * h.price, 0);
const SIGN = { dep: 1, wdr: -1, buy: -1, sell: 1, div: 1, fee: -1 };
const cash = +tx.reduce((s, l) => { const [, , k, , , a] = l.split(','); return s + (SIGN[k] || 0) * +a; }, 0).toFixed(2);
const net = tx.reduce((s, l) => { const [, , k, , , a] = l.split(','); return s + (k === 'dep' ? +a : k === 'wdr' ? -a : 0); }, 0);
const total = +(sec + cash).toFixed(2);
const pl = Object.fromEntries(Object.keys(startOf).filter((k) => k !== 'MAX').map((k) => [k, +holdings.reduce((s, h) => s + h.qty * (h.price - at(h.isin, startOf[k])), 0).toFixed(2)]));
pl.MAX = +(total - net).toFixed(2);
// research targets are anchored to the sample prices so upside percentages stay as in the notes
holdings.forEach((h) => { if (STOCKS[h.isin]) h.quoteMid = h.price; });
const snapshot = {
  meta: { asOf: new Date(asOf).toISOString().replace('.000', ''), ledgerFrom: '2024-02-06', ledgerTo: '2026-10-01', account: 'Sample account', ccy: 'EUR' },
  total, cash, pl, holdings,
  benches: BENCH.map(([id, name, isin, etf]) => ({ id, name, isin, etf, perf: perf(isin) })),
};
fs.writeFileSync(path.join(out, 'snapshot.json'), JSON.stringify(snapshot, null, 1));
fs.writeFileSync(path.join(out, 'series.json'), JSON.stringify({ dates: daily, ref: 'synthetic', p: Object.fromEntries(isins.map((i) => [i, daily.map((d) => at(i, d))])) }));
const bm = monthly.filter((d) => d < daily[0]).concat(['2026-10-01']);
fs.writeFileSync(path.join(out, 'bench_monthly.json'), JSON.stringify({ source: 'synthetic sample', dates: bm, p: Object.fromEntries(BENCH.map((b) => [b[2], bm.map((d) => at(b[2], d))])) }));

const profile = JSON.parse(fs.readFileSync(path.join(__dirname, 'profile.template.json'), 'utf8'));
fs.writeFileSync(path.join(out, 'profile.json'), JSON.stringify(profile, null, 1));
console.log('sample written to', path.relative(process.cwd(), out), '·', holdings.length, 'holdings · value', total, '· net', net);
