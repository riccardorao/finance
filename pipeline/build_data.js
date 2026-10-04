// Assembles the page's data object from a data directory and the shared research notes.
// Inputs  (in the data dir): snapshot.json, ledger.json (from ledger.js), series.json, bench_monthly.json, profile.json
// Inputs  (shared):          research/stocks.js, research/comments.js
// Output: <data dir>/data.json
// Usage:  node pipeline/build_data.js [data dir, default data/private]
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const rd = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const SNAP = rd('snapshot.json');
const L = rd('ledger.json');
const S = rd('series.json');
const BM = rd('bench_monthly.json');
const PROFILE = rd('profile.json');
const STOCKS = require('../research/stocks.js');
const COMMENTS = require('../research/comments.js');

const d10 = (s) => s.slice(0, 10);
// Instrument type for the realised-results bridge. Optional <data>/types.json overrides by ISIN
// (for leveraged ETPs that do not carry an issuer prefix, for example).
const TYPES = fs.existsSync(path.join(dir, 'types.json')) ? rd('types.json') : {};
const type = (isin) => TYPES[isin] || (['BTC', 'ETH', 'ADA', 'SOL'].includes(isin) ? 'Crypto' : /^DE000BB/.test(isin) ? 'Leveraged & certificates' : /^(IE|LU)/.test(isin) ? 'ETFs & ETCs' : 'Shares');

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
  benchMonthly: { dates: BM.dates, p: BM.p },
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
