// Assembles the page's data object from a data directory and the shared research notes.
// Inputs  (in the data dir): snapshot.json, ledger.json (from ledger.js), history.json (from history.js),
//                            prices_daily.json (or series.json), prices_monthly.json, profile.json
// Inputs  (shared):          research/stocks.js, research/comments.js
// Output: <data dir>/data.json
// Usage:  node pipeline/build_data.js [data dir, default data/private]
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const SNAP = rd('snapshot.json');
const L = rd('ledger.json');
const PD = fs.existsSync(path.join(dir, 'prices_daily.json')) ? rd('prices_daily.json') : null;
// Daily price series for the last 12 months (holdings and the risk benchmarks), carried forward over holidays.
function dailySeries(isins, asOfDay) {
  const from = new Date(Date.parse(asOfDay) - 366 * 864e5).toISOString().slice(0, 10);
  const dates = Array.from(new Set(isins.flatMap((i) => (PD[i] ? PD[i].d : [])).filter((d) => d >= from && d <= asOfDay))).sort();
  const p = {};
  isins.forEach((i) => {
    if (!PD[i]) return;
    const m = new Map(PD[i].d.map((d, k) => [d, PD[i].p[k]]));
    let last = null; const before = PD[i].d.filter((d) => d < from); if (before.length) last = m.get(before[before.length - 1]);
    p[i] = dates.map((d) => { if (m.has(d)) last = m.get(d); return last; });
    if (p[i].some((x) => x == null)) delete p[i];
  });
  return { dates, ref: 'daily closes (Yahoo Finance), euro', p };
}
const S = PD ? dailySeries(SNAP.holdings.map((h) => h.isin).concat(SNAP.benches.map((b) => b.isin)), SNAP.meta.asOf.slice(0, 10)) : rd('series.json');
const PM = fs.existsSync(path.join(dir, 'prices_monthly.json')) ? rd('prices_monthly.json') : {};
const HIST = rd('history.json');
// Benchmarks offered on the Performance tab (accumulating iShares ETFs in euro).
const INDICES = [
  { id: 'MSCI', name: 'MSCI World', isin: 'IE00B4L5Y983', etf: 'iShares Core MSCI World' },
  { id: 'SPX', name: 'S&P 500', isin: 'IE00B5BMR087', etf: 'iShares Core S&P 500' },
  { id: 'NDX', name: 'Nasdaq-100', isin: 'IE00B53SZB19', etf: 'iShares Nasdaq 100' },
].filter((x) => PM[x.isin] || (PD && PD[x.isin]));
// Long-run annualised growth of each benchmark (pipeline/fetch_index_history.js), the Outlook's expected return.
const IH = fs.existsSync(path.join(dir, 'index_history.json')) ? rd('index_history.json') : {};
INDICES.forEach((x) => { const h = IH[x.isin]; if (h) Object.assign(x, { cagr: h.cagr, cagrFrom: h.from, cagrTo: h.to, cagrBasis: h.basis }); });
const PROFILE = rd('profile.json');
const STOCKS = require('../research/stocks.js');
const COMMENTS = require('../research/comments.js');

const d10 = (s) => s.slice(0, 10);
// Instrument type for the realised-results bridge. Optional <data>/types.json overrides by ISIN
// (for leveraged ETPs that do not carry an issuer prefix, for example).
const TYPES = fs.existsSync(path.join(dir, 'types.json')) ? rd('types.json') : {};
const { instrumentType } = require('./holdings_history.js');
const type = (isin) => instrumentType(isin, TYPES);

const holdings = SNAP.holdings.map((f) => {
  const pos = L.positions[f.isin] || { cost: null, lots: [] };
  const n = f.scalableNews;
  return {
    isin: f.isin, name: f.name, long: f.long, ticker: f.ticker, sector: f.sector, industry: f.industry, theme: f.theme, region: f.region, ccy: f.ccy, note: f.note,
    qty: f.qty, price: f.price, cost: pos.cost != null ? +pos.cost.toFixed(2) : null, perf: f.perf,
    lots: pos.lots.map((l) => ({ d: d10(l.date), q: +l.qty.toFixed(6), c: +l.cost.toFixed(2) })),
    events: (L.events[f.isin] || []).map((e) => ({ d: e.date, s: e.side, q: e.qty, a: +e.amt.toFixed(2) })),
    divs: L.income.div.filter((x) => x.isin === f.isin).map((x) => [d10(x.date), x.amt]),
    scalable: n ? { short: n.short, long: n.long, at: n.at, sources: n.sources } : null,
    comment: COMMENTS[f.isin] || null,
    research: STOCKS[f.isin] ? { ...STOCKS[f.isin], refEur: f.quoteMid || f.price, at: d10(SNAP.meta.asOf) } : null,
    conviction: PROFILE.positions[f.isin] || null,
  };
});

const names = L.names;
const realised = Object.entries(L.realised).map(([k, o]) => {
  const ev = L.events[k] || [];
  const closes = ev.filter((e) => e.side !== 'BUY');
  return { id: k, name: names[k] || k, type: type(k), pl: +o.pl.toFixed(2), proceeds: +o.proceeds.toFixed(2), first: d10(ev[0].date), last: closes.length ? d10(closes[closes.length - 1].date) : null };
}).sort((a, b) => b.pl - a.pl);

const DATA = {
  meta: SNAP.meta,
  total: SNAP.total, cash: SNAP.cash, pl: SNAP.pl,
  holdings, benches: SNAP.benches,
  series: { dates: S.dates, ref: S.ref, p: S.p },
  indices: INDICES,
  benchMonthly: Object.fromEntries(INDICES.map((x) => [x.isin, PM[x.isin]])),
  indexDaily: PD ? Object.fromEntries(INDICES.filter((x) => PD[x.isin]).map((x) => [x.isin, { d: PD[x.isin].d, p: PD[x.isin].p }])) : {},
  // the Track record uses the stock book only; the whole-account history is kept for the reconciliation note
  history: HIST.stocks ? { points: HIST.stocks.points, external: HIST.stocks.external, check: HIST.check, scope: 'stocks' } : { points: HIST.points.map((p) => [p.t, p.v, p.net]), external: HIST.external, check: HIST.check, scope: 'account' },
  flows: L.flows.map((f) => ({ d: f.date.slice(0, 16), a: +f.amt.toFixed(2), k: f.kind })),
  ledger: {
    summary: Object.fromEntries(Object.entries(L.summary).map(([k, v]) => [k, +(+v).toFixed(2)])),
    realised,
    divAll: L.income.div.map((x) => [d10(x.date), x.isin, x.amt]),
  },
  profile: { ...PROFILE, positions: undefined },
};
fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(DATA));
console.log('data.json', (fs.statSync(path.join(dir, 'data.json')).size / 1024).toFixed(1) + ' KB,', holdings.length, 'holdings,', realised.length, 'closed instruments');
