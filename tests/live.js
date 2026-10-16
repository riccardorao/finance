// Exercises the live paths with a mocked window.claude: a Scalable refresh (a price move, a new position,
// optionally a failed chart or a refused permission) and the daily web-research store, including hostile
// text and a javascript: link that must not render as a link.
// Usage: node tests/live.js [ok|partial|denied] [data dir, default data/private] [wrapped page, default test-output/_wrapped.html]
// Run tests/render.js first: it writes the wrapped page.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const scenario = process.argv[2] || 'ok';
const DATA = JSON.parse(fs.readFileSync(path.join(path.resolve(process.argv[3] || path.join(root, 'data', 'private')), 'data.json'), 'utf8'));
const FIRST = DATA.holdings[0].isin, LAST = DATA.holdings[DATA.holdings.length - 1].isin;
const TFR = { '1D': 'INTRADAY', '1W': 'ONE_WEEK', '1M': 'ONE_MONTH', '3M': 'THREE_MONTHS', '6M': 'SIX_MONTHS', YTD: 'YEAR_TO_DATE', '1Y': 'ONE_YEAR', MAX: 'MAX', SB: 'SINCE_BUY' };
const BUMP = { [FIRST]: 1.05 };

const payloads = {
  get_portfolio_holdings: () => ({ holdings: DATA.holdings.map((h) => ({ isin: h.isin, name: h.name, currentQuote: { midPrice: h.price * (BUMP[h.isin] || 1) }, position: { filled: h.qty } })).concat([{ isin: 'US0000000001', name: 'New Co', currentQuote: { midPrice: 50 }, position: { filled: 10 } }]) }),
  get_portfolio_overview: () => ({ valuation: { total: DATA.total + 700 }, timestamps: { valuationTimestampUtc: '2026-10-02T09:00:00.000Z' }, performance: Object.entries(DATA.pl).map(([k, v]) => ({ timeframe: TFR[k], simpleAbsoluteReturn: v + 10 })) }),
  get_portfolio_cash_breakdown: () => ({ cash: { cashBalance: 12.34 } }),
  list_portfolio_transactions: () => ({ page: { nextCursor: null }, transactions: ledgerTransactions() }),
  get_security_chart: (input) => chartPayload(input.isin, input.timeframe),
};
// the account's own transactions, in the connector's shape, from tx.csv (a recent sale is left out so the test has a gap to fill)
function ledgerTransactions() {
  const names = JSON.parse(fs.readFileSync(path.join(path.resolve(process.argv[3] || path.join(root, 'data', 'private')), 'names.json'), 'utf8'));
  const lines = fs.readFileSync(path.join(path.resolve(process.argv[3] || path.join(root, 'data', 'private')), 'tx.csv'), 'utf8').trim().split('\n').slice(1);
  const out = [];
  lines.forEach((l, n) => {
    const [date, cust, kind, isin, qty, amt] = l.split(','); const t = date.length === 16 ? date + ':00.000Z' : date + '.000Z';
    const base = { id: 'T' + n, status: 'SETTLED', currency: 'EUR', isCancellation: false, lastEventAt: t, custodian: cust === 'B' ? 'BAADER' : 'SCALABLE', description: names[isin] || '', nonTradeSecurity: null, eltif: null };
    if (kind === 'buy' || kind === 'sell') out.push({ ...base, kind: 'security', category: 'SECURITY_TRANSACTION', security: { isin, transactionType: 'SINGLE', quantity: qty, amount: String(kind === 'buy' ? -amt : +amt), side: kind.toUpperCase() }, cash: null });
    else if (kind === 'div') out.push({ ...base, kind: 'cash', category: 'CASH_TRANSACTION', security: null, cash: { relatedIsin: isin, transactionType: 'DISTRIBUTION', amount: amt } });
    else if (kind === 'dep' || kind === 'wdr') out.push({ ...base, kind: 'cash', category: 'CASH_TRANSACTION', security: null, cash: { relatedIsin: null, transactionType: kind === 'dep' ? 'DEPOSIT' : 'WITHDRAWAL', amount: String(kind === 'dep' ? amt : -amt) } });
  });
  return out.sort((a, b) => (a.lastEventAt < b.lastEventAt ? 1 : -1));
}
// price charts in the connector's shape: six months daily, a year every second day, the max as month ends
function chartPayload(isin, timeframe) {
  const pd = JSON.parse(fs.readFileSync(path.join(path.resolve(process.argv[3] || path.join(root, 'data', 'private')), 'prices_daily.json'), 'utf8'));
  const o = pd[isin]; if (!o) return { isin, timeframe, currency: 'EUR', closingReferencePoint: null, dataPoints: [] };
  const pts = o.d.map((d, i) => ({ d, p: o.p[i] })), last = Date.parse(pts[pts.length - 1].d + 'T20:00:00Z');
  const mk = (a) => a.map((x) => ({ midPrice: x.p, timestampUtc: x.d + 'T20:59:00.000Z' }));
  let sel;
  if (timeframe === 'six_months') sel = pts.filter((x) => Date.parse(x.d) > last - 183 * 864e5);
  else if (timeframe === 'one_year') sel = pts.filter((x) => Date.parse(x.d) > last - 366 * 864e5).filter((_, i) => i % 2 === 0);
  else sel = pts.filter((x, i) => i === pts.length - 1 || x.d.slice(0, 7) !== pts[i + 1].d.slice(0, 7));
  const first = sel.shift();
  return { isin, timeframe, currency: 'EUR', closingReferencePoint: first ? { midPrice: first.p, timestampUtc: first.d + 'T20:00:00Z' } : null, dataPoints: mk(sel) };
}
function quote(isin) {
  const h = DATA.holdings.find((x) => x.isin === isin), b = DATA.benches.find((x) => x.isin === isin);
  if (!h && !b) return { security: { isin, quote: { midPrice: 50, performances: [{ timeframe: 'SINCE_BUY', performance: 0.1, simpleAbsoluteReturn: 50 }] } } };
  const perf = (h || b).perf;
  return { security: { isin, quote: { midPrice: h ? h.price * (BUMP[isin] || 1) : 100, performances: Object.entries(perf).map(([k, v]) => ({ timeframe: TFR[k], performance: v[0], simpleAbsoluteReturn: v[1] })) } } };
}
function chart(isin) {
  const p = DATA.series.p[isin] || DATA.series.p[FIRST];
  return { isin, dataPoints: DATA.series.dates.map((d, i) => ({ midPrice: p[i], timestampUtc: d + 'T20:59:00.000Z' })) };
}

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errs.push(m.text()); });
  await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  let store = null, saves = 0;
  await page.exposeFunction('__dbget', async () => store);
  await page.exposeFunction('__dbset', async (d) => { store = d; saves++; });
  await page.exposeFunction('__call', async (server, tool, input) => {
    if (scenario === 'denied') throw { code: 'not_in_manifest' };
    if (server !== 'Scalable Capital') throw { code: 'server_not_connected' };
    if (tool === 'get_security_news') { if (scenario === 'partial' && input.isin === LAST) throw { code: 'server_unavailable' }; return { payload: { summary: input.isin === FIRST ? { short: 'LIVE NEWS SHORT', long: 'Long text', lastUpdatedAt: '2026-10-02T08:00:00Z' } : {}, sources: [] } }; }
    if (tool === 'get_security_quote') return { payload: quote(input.isin) };
    if (tool === 'get_security_chart') return { payload: chart(input.isin) };
    if (payloads[tool]) return { payload: payloads[tool]() };
    throw { code: 'bad_request' };
  });
  await page.addInitScript((first) => {
    const jdocs = [{ id: first, exists: true, data: () => ({ updatedAt: new Date().toISOString(), stance: 'strengthened', thesis: 'JUDGED THESIS', kill: 'JUDGED KILL', assessment: 'Assess <i>x</i>', signals: [{ text: 'Sig one', source: 'Co', url: 'javascript:1' }] }) }];
    const docs = [{ id: first, exists: true, data: () => ({ updatedAt: new Date().toISOString(), headline: 'Test headline <b>x</b>', items: [{ date: '2026-10-01', text: 'Item one <script>', source: 'Src', url: 'https://example.com/a' }, { date: '2026-09-30', text: 'Bad link', source: 'Evil', url: 'javascript:alert(1)' }] }) }];
    window.claude = { use: async (n) => (n === 'mcp' ? { callTool: (s, t, i) => window.__call(s, t, i) } : n === 'db' ? { doc: () => ({ get: async () => { const d = await window.__dbget(); return { exists: !!d, data: () => d }; }, set: (d) => window.__dbset(d) }), collection: (c) => ({ onSnapshot: (next) => { setTimeout(() => next({ docs: c === 'judgement' ? jdocs : docs }), 50); return () => {}; } }) } : null) };
  }, FIRST);
  await page.goto('file://' + path.resolve(process.argv[4] || path.join(root, 'test-output', '_wrapped.html')));
  await page.waitForTimeout(1500);
  const lastOf = (d) => { const pts = JSON.parse(d.json).points; return new Date(pts[pts.length - 1][0]).toISOString().slice(0, 10); };
  const firstSave = store ? lastOf(store) : null;
  let reload = null;
  if (scenario === 'ok') { // a second open must start from the saved history and still reach today
    await page.reload(); await page.waitForTimeout(1500);
    reload = { saves, saved: store ? lastOf(store) : null, historyTo: await page.evaluate(() => { const p = M.perf.pts; return new Date(p[p.length - 1].t).toISOString().slice(0, 10); }) };
  }
  await page.click('#tab-book');
  await page.click(`#t-book .posn[data-i="${FIRST}"] .pos-row`);
  await page.waitForTimeout(200);
  const out = await page.evaluate(() => ({
    latest: ((document.querySelector('#t-book .pd-side') || {}).innerText || '').split('\n').filter((l) => /Test headline|Item one|Bad link|LATEST/i.test(l)),
    links: [...document.querySelectorAll('#t-book .news a')].map((a) => a.href),
    judged: (() => { const t = (document.querySelector('#t-book .pd') || {}).innerText || ''; return /JUDGED THESIS/.test(t) && /JUDGED KILL/.test(t) && /strengthened/i.test(t) && !/draft/i.test(t) && /Assess <i>x<\/i>/.test(t); })(),
    cols: [...document.querySelectorAll('#t-book .book-h span')].map((e) => e.textContent).join('|'),
    injected: document.querySelectorAll('#t-book .news script, #t-book .pd-side b b').length,
    status: document.getElementById('status-text').textContent,
    // the performance history must run to the refresh date, not stop at the last build
    historyTo: (() => { const p = M.perf.pts; return new Date(p[p.length - 1].t).toISOString().slice(0, 10); })(),
    historyFrom: (() => { const p = M.perf.pts; return new Date(p[0].t).toISOString().slice(0, 10); })(),
    book: document.getElementById('mh-value').textContent,
    rows: [...document.querySelectorAll('#t-book .pos-row')].map((r) => r.querySelector('.nm b').textContent + ' ' + r.querySelector('.n b').textContent + ' ' + r.querySelector('.cons').textContent.trim()),
  }));
  console.log(scenario, 'saved', firstSave, JSON.stringify(reload), JSON.stringify(out, null, 1), errs.length ? '\nERRORS ' + errs.join('\n') : '\nno errors');
  const bad = errs.length || (scenario === 'ok' && (!out.judged || !/Bear\|Base\|Bull/.test(out.cols))) || out.injected || out.links.some((l) => !l.startsWith('https:')) || (scenario === 'ok' && (out.historyTo !== '2026-10-02' || firstSave !== '2026-10-02' || reload.saves < 2 || reload.historyTo !== '2026-10-02')) || (scenario !== 'ok' && saves > 0 && scenario === 'denied');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
