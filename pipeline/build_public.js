// Builds the public page: the real track record, with no euro amount and no name of a stock in it.
//
// The page is meant to be published openly while the picks themselves are kept for subscribers. Hiding
// them in the page is not enough: anything in the page's data can be read in its source. So the public
// data is generated without them, and this script checks its own output before writing it.
//
//   - Money is rescaled so the stock book is worth 100 today. Every return, weight and scenario is
//     unchanged by that (they are ratios); every euro amount disappears.
//   - Holdings become "Pick A", "Pick B"... ordered by weight. What stays per pick: GICS sector, a broad
//     region, weight, unrealised gain in per cent, and the 12-month bear / average-target / bull outcome,
//     rounded to a whole per cent. What goes: name, ticker, ISIN, industry and theme, quantities, real
//     prices and price history, lots and trades, dividends, analyst targets, thesis, kill-switch, news.
//     The daily price history in particular would let anyone match a pick against the market.
//   - The risk figures that need per-stock prices (volatility, beta, correlation of the book) are
//     computed here from the full data and shipped as totals for the whole book.
//   - Closed positions keep only their category, dates and the sign and size of the result (rescaled).
//
// Usage: node pipeline/build_public.js <data.json> <out.html> [--unlock <url>] [--price <text>]
//   data.json  the full data object built by build_data.js (data/private/data.json)
//   --unlock   where "Subscribe" leads: a payment link, or a mailto: until there is one
//   --price    the price as shown, e.g. "€999 a year"
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [inFile, outFile] = pos;
if (!inFile || !outFile) { console.error('usage: node pipeline/build_public.js <data.json> <out.html> [--unlock <url>] [--price <text>]'); process.exit(1); }
const unlock = { href: opt('--unlock', ''), price: opt('--price', '') };
if (unlock.href && !/^(https:\/\/|mailto:)[^\s"'<>]+$/.test(unlock.href)) { console.error('--unlock must be an https:// or mailto: link'); process.exit(1); }

const D = JSON.parse(fs.readFileSync(inFile, 'utf8'));
if (D.public) { console.error('input is already a public build'); process.exit(1); }

/* ---------- the page's own model, run here on the full data ---------- */
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const ctx = vm.createContext({
  DATA: null, console,
  ResizeObserver: class { observe() {} unobserve() {} },
  document: { querySelector: () => null, querySelectorAll: () => [] },
  window: {}, localStorage: { getItem: () => null, setItem() {} },
});
vm.runInContext(rd('src/core.js') + '\n' + rd('src/page/model.js') + '\n;globalThis.__m = { buildModel, PRESETS, expOf };', ctx);
const { buildModel, PRESETS, expOf } = ctx.__m;
const full = JSON.parse(JSON.stringify(D));
full.ser = {}; Object.keys(full.series.p).forEach((id) => { full.ser[id] = { d: full.series.dates, p: full.series.p[id] }; });
const M = buildModel(full);
if (!M.risk) { console.error('the model has no risk figures: every holding needs 12 months of prices'); process.exit(1); }

/* ---------- rescale: the stock book is 100 today ---------- */
const k = 100 / M.secValue;
const s = (x) => (x == null ? x : +(x * k).toFixed(4));
const r1 = (x) => (x == null ? null : Math.round(x * 100) / 100); // to a whole per cent, as a fraction

const REGION = (r) => (/united states|canada|america/i.test(r || '') ? 'North America'
  : /taiwan|korea|japan|china|hong kong|india|singapore|asia/i.test(r || '') ? 'Asia'
  : /./.test(r || '') ? 'Europe' : 'Other');
const LETTER = (i) => String.fromCharCode(65 + i);

const holdings = M.H.map((h, i) => ({
  isin: 'P' + (i + 1), name: 'Pick ' + LETTER(i), ticker: '', sector: h.sector || 'Other', industry: '', theme: '',
  region: REGION(h.region), ccy: '', note: '',
  // a notional unit price of 100, so value = qty * price is the rescaled weight and no real price survives
  qty: +(h.value * k / 100).toFixed(6), price: 100, cost: h.cost != null ? s(h.cost) : null,
  perf: {}, lots: [], events: [], divs: [], scalable: null, comment: null, research: null, conviction: null,
  scPre: h.sc ? { bull: r1(h.sc.bull), base: r1(h.sc.base), bear: r1(h.sc.bear) } : null,
}));

const day = M.H.reduce((t, h) => { const r = h.perf && h.perf['1D'] ? h.perf['1D'][0] : null; return t + (r == null ? 0 : h.value - h.value / (1 + r)); }, 0);
const benchIsins = new Set(D.benches.map((b) => b.isin));
const R = M.risk;

const P = {
  meta: { asOf: D.meta.asOf, ledgerFrom: D.meta.ledgerFrom, ledgerTo: D.meta.ledgerTo, account: 'Scalable Capital Broker' },
  total: s(D.total), cash: s(D.cash),
  pl: Object.fromEntries(Object.entries(D.pl).map(([p, v]) => [p, s(v)])),
  holdings,
  benches: D.benches,
  series: { dates: D.series.dates, ref: D.series.ref, p: Object.fromEntries(Object.entries(D.series.p).filter(([id]) => benchIsins.has(id))) },
  indices: D.indices, benchMonthly: D.benchMonthly, indexDaily: D.indexDaily,
  history: { points: D.history.points.map(([t, v, n]) => [t, s(v), s(n)]), external: D.history.external.map(([t, a]) => [t, s(a)]), check: [], scope: D.history.scope },
  flows: D.flows.map((f) => ({ d: f.d, a: s(f.a), k: f.k })),
  ledger: {
    summary: Object.fromEntries(Object.entries(D.ledger.summary).map(([key, v]) => [key, s(v)])),
    realised: D.ledger.realised.map((r, i) => ({ id: 'C' + (i + 1), name: 'Closed position', type: r.type, pl: s(r.pl), proceeds: s(r.proceeds), first: r.first, last: r.last })),
    divAll: D.ledger.divAll.map(([d, , a]) => [d, '', s(a)]),
  },
  profile: { manager: D.profile.manager, strategy: D.profile.strategy, tagline: D.profile.tagline },
  public: {
    n: M.H.length,
    day: day / (M.secValue - day),
    unreal: M.unreal != null ? M.unreal / (M.secValue - M.unreal) : null,
    risk: { vol: R.vol, pBeta: R.pBeta, pCorr: R.pCorr, bVol: R.bVol },
    unlock,
  },
};

/* ---------- check before writing: nothing that names a stock, no euro ---------- */
const json = JSON.stringify(P);
// the subscription price is the one euro figure meant to be on the page; everything else is checked
const checked = JSON.stringify({ ...P, public: { ...P.public, unlock: null } });
const forbidden = new Set();
D.holdings.forEach((h) => [h.name, h.long, h.ticker, h.isin].forEach((x) => x && forbidden.add(x)));
D.ledger.realised.forEach((r) => [r.id, r.name].forEach((x) => x && forbidden.add(x)));
D.ledger.divAll.forEach(([, isin]) => isin && forbidden.add(isin));
const leaks = [...forbidden].filter((x) => String(x).length >= 3 && json.includes(String(x)));
if (/€|\bEUR\b/.test(checked)) leaks.push('a euro sign or EUR');
if (leaks.length) { console.error('ABORT: the public data still contains:', leaks.join(', ')); process.exit(1); }

/* ---------- page: the same assembly as build_page.js, with the public data ---------- */
const scripts = ['src/core.js', 'src/page/model.js', 'src/page/views.js', 'src/page/live.js'].map(rd).join('\n');
const body = `
<div class="app">
  <header class="top">
    <div class="brand"><h1 id="mh-name">Equity Portfolio Dashboard</h1><p id="mh-strategy"></p><div class="aum" id="mh-value"></div><p class="aum-sub" id="mh-sub"></p></div>
    <div class="status" id="status" data-mode="snapshot" role="status"><span class="dot"></span><span id="status-text"></span><button class="btn" id="btn-refresh" hidden>Refresh</button></div>
  </header>
  <div class="bar"><nav class="tabs" id="tabs" role="tablist" aria-label="Sections"></nav></div>
  <section class="tabpage" id="t-record" role="tabpanel" aria-labelledby="tab-record"></section>
  <section class="tabpage" id="t-book" role="tabpanel" aria-labelledby="tab-book" hidden></section>
  <section class="tabpage" id="t-risk" role="tabpanel" aria-labelledby="tab-risk" hidden></section>
  <div id="notes"></div>
</div>
<div id="tip" role="tooltip"></div>`;
const safe = json.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
const html = `<title>Equity Portfolio Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${rd('src/page/style.css')}
</style>
${body}
<script>
const DATA = ${safe};
${scripts}
</script>
`;
fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
fs.writeFileSync(outFile, html);
console.log('wrote', path.relative(process.cwd(), path.resolve(outFile)), (html.length / 1024).toFixed(1) + ' KB,', holdings.length, 'picks,', P.ledger.realised.length, 'closed positions, checked for', forbidden.size, 'names and ids');
