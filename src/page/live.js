/* ===== page part 3: live refresh from the Scalable Capital connector, boot ===== */
const SERVER = 'Scalable Capital';
const TFMAP = { INTRADAY: '1D', ONE_WEEK: '1W', ONE_MONTH: '1M', THREE_MONTHS: '3M', SIX_MONTHS: '6M', YEAR_TO_DATE: 'YTD', ONE_YEAR: '1Y', MAX: 'MAX', SINCE_BUY: 'SB' };
let MCP = null, DATA_SNAP = null, DB = null, HIST_READY = Promise.resolve(null);

function prepare(D) {
  if (!D.ser) { D.ser = {}; Object.keys(D.series.p).forEach((id) => { D.ser[id] = { d: D.series.dates, p: D.series.p[id] }; }); }
  return D;
}
function explain(err) {
  const c = err && err.code;
  if (c === 'needs_reauth' || c === 'server_not_connected') return 'Reconnect Scalable Capital in claude.ai under Settings, Connectors.';
  if (c === 'not_in_manifest' || c === 'consent_required' || c === 'not_granted') return 'Live data was not allowed for this page. Choose Refresh to be asked again.';
  if (c === 'selection_required') return 'Choose which Scalable Capital connector to use.';
  if (c === 'server_unavailable' || c === 'upstream_error' || c === 'rate_limited') return 'Scalable did not answer. Try again in a moment.';
  if (c === 'tool_error') return 'Scalable reported an error' + (err.message ? ': ' + String(err.message).slice(0, 80) : '.');
  return 'Live refresh did not complete.';
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function callRead(tool, input) {
  const go = () => MCP.callTool(SERVER, tool, input || {}, { cache: false }).then((r) => { let p = r && r.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* keep text */ } } return p; });
  try { return await go(); } catch (e) { if (e && e.retryable) { await wait(Math.min(e.retryAfterMs || 1200, 3000) + Math.random() * 400); return go(); } throw e; }
}
const mapPerf = (arr) => { const o = {}; (arr || []).forEach((p) => { const k = TFMAP[p.timeframe]; if (k) o[k] = [p.performance, p.simpleAbsoluteReturn]; }); return o; };

async function liveRefresh() {
  if (!MCP || state.mode === 'loading') return;
  state.mode = 'loading'; state.statusMsg = ''; renderHeader();
  try {
    const [h, o, c] = await Promise.allSettled([callRead('get_portfolio_holdings'), callRead('get_portfolio_overview', { includeYearToDate: true }), callRead('get_portfolio_cash_breakdown')]);
    if (h.status !== 'fulfilled') throw h.reason;
    const feed = ((h.value && h.value.holdings) || []).filter((x) => x.position && x.position.filled > 0);
    if (!feed.length) throw { code: 'tool_error', message: 'no positions returned' };
    const benchIsins = DATA_SNAP.benches.map((b) => b.isin);
    const holdIsins = feed.map((f) => f.isin);
    const all = holdIsins.concat(benchIsins);
    const [qs, ns] = await Promise.all([Promise.allSettled(all.map((i) => callRead('get_security_quote', { isin: i }))), Promise.allSettled(holdIsins.map((i) => callRead('get_security_news', { isin: i, locale: 'en_US' })))]);
    let failed = [o, c].filter((x) => x.status !== 'fulfilled').length;
    const quotes = {};
    all.forEach((i, k) => { if (qs[k].status === 'fulfilled' && qs[k].value && qs[k].value.security && qs[k].value.security.quote) quotes[i] = qs[k].value.security.quote; else failed++; });
    const news = {};
    holdIsins.forEach((i, k) => { if (ns[k].status === 'fulfilled' && ns[k].value) news[i] = ns[k].value; else failed++; });
    const D2 = JSON.parse(JSON.stringify(DATA_SNAP));
    // positions
    D2.holdings = feed.map((f) => {
      const old = D2.holdings.find((x) => x.isin === f.isin);
      const q = quotes[f.isin];
      const perf = q ? mapPerf(q.performances) : (old && old.perf) || {};
      const price = q ? q.midPrice : (f.currentQuote && f.currentQuote.midPrice) || (old && old.price);
      const qty = f.position.filled;
      let cost = old && old.cost != null ? old.cost * (qty / old.qty) : null;
      if (q && perf.SB) cost = qty * q.midPrice - perf.SB[1];
      const base = old ? { ...old } : { isin: f.isin, name: f.name, ticker: '', research: null, conviction: null, sector: 'Unclassified', industry: '', theme: 'Unclassified', region: 'Unclassified', ccy: '', lots: [], events: [], divs: [], comment: null, scalable: null, perf: {} };
      const nv = news[f.isin];
      let scalable = base.scalable || null;
      if (nv) {
        const sm = nv.summary || {};
        scalable = sm.short ? { short: sm.short, long: String(sm.long || sm.short).replace(/\*\*/g, ''), at: sm.lastUpdatedAt || '', sources: (nv.sources || []).map((x) => [x.headline, String(x.publicationTimeUtc || '').slice(0, 10)]) } : null;
      }
      return { ...base, qty, price, cost: cost != null ? +cost.toFixed(2) : null, perf, scalable };
    });
    // totals, cash, period P&L
    const secValue = D2.holdings.reduce((s, x) => s + x.qty * x.price, 0);
    if (c.status === 'fulfilled' && c.value && c.value.cash) D2.cash = c.value.cash.cashBalance;
    if (o.status === 'fulfilled' && o.value && o.value.valuation) {
      D2.total = o.value.valuation.total;
      if (o.value.timestamps && o.value.timestamps.valuationTimestampUtc) D2.meta.asOf = o.value.timestamps.valuationTimestampUtc;
      (o.value.performance || []).forEach((p) => { const k = TFMAP[p.timeframe]; if (k && k !== 'SB') D2.pl[k] = p.simpleAbsoluteReturn; });
    } else D2.total = secValue + D2.cash;
    // benchmarks
    D2.benches.forEach((b) => { const q = quotes[b.isin]; if (q) b.perf = mapPerf(q.performances); });
    DATA_ACTIVE = D2;
    render();
    // the stored history stops at the last build: rebuild the days since from this account's own transactions and prices
    const secs = {}; all.forEach((i, k) => { if (qs[k].status === 'fulfilled' && qs[k].value) secs[i] = qs[k].value; });
    if (!(await extendHistory({ holdings: h.value, overview: o.status === 'fulfilled' ? o.value : null, cash: c.status === 'fulfilled' ? c.value : null, secs }))) failed++;
    state.mode = 'live'; state.statusMsg = failed ? `${failed} ${failed === 1 ? 'item' : 'items'} kept from the snapshot` : '';
    render();
  } catch (err) {
    state.mode = 'error'; state.statusMsg = explain(err); renderHeader();
  }
}

/* ---------- history since the last build ----------
   The stored history ends when the page was built. On every open the days since are rebuilt from the account's own
   transactions and Scalable's price charts (the viewer edition's method, src/client/feed.js), and the stored daily
   history is kept up to the build date. Returns false when the connector could not supply them. */
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k]); } catch (e) { out[k] = null; } } }));
  return out;
}
const HIST_DOC = 'history/stocks', HIST_MARGIN = 14 * 864e5; // rebuild a fortnight back, to catch late-booked transactions
async function loadStoredHistory() {
  try {
    const db = window.claude && window.claude.use ? await window.claude.use('db') : null;
    if (!db) return null;
    DB = db;
    const snap = await db.doc(HIST_DOC).get();
    const d = snap && snap.exists ? snap.data() : null;
    const h = d && d.json ? JSON.parse(d.json) : null;
    return h && Array.isArray(h.points) && h.points.length > 1 && Array.isArray(h.external) ? h : null;
  } catch (e) { return null; }
}
async function extendHistory(raw) {
  // base: the history saved by the last refresh when it runs later than the page's own, so the join moves forward each time
  const stored = await HIST_READY, emb = DATA_ACTIVE.history, last = (h) => h.points[h.points.length - 1][0];
  const base = stored && last(stored) > last(emb) ? stored : emb;
  DATA_ACTIVE.history = base; // shows even if the rebuild below fails
  const cut = last(base) - HIST_MARGIN;
  try {
    const tx = []; let cursor = null, pages = 0;
    do {
      const r = await callRead('list_portfolio_transactions', Object.assign({ pageSize: 100 }, cursor ? { cursor } : {}));
      (r && r.transactions || []).forEach((x) => tx.push(x));
      cursor = r && r.page && r.page.nextCursor; pages++;
    } while (cursor && pages < 60);
    const asOf = Date.parse((raw.overview && raw.overview.timestamps && raw.overview.timestamps.valuationTimestampUtc) || new Date().toISOString());
    const plan = Feed.chartPlan(tx, raw.holdings, null, asOf);
    const jobs = []; plan.forEach((p) => { jobs.push([p.isin, 'max']); if (p.daily) jobs.push([p.isin, 'one_year']); if (p.recent) jobs.push([p.isin, 'six_months']); });
    const charts = {};
    await pool(jobs, 6, async ([isin, tf]) => {
      const r = await callRead('get_security_chart', { isin, timeframe: tf });
      let pts = (r && r.dataPoints) || [];
      if (r && r.closingReferencePoint) pts = [{ midPrice: r.closingReferencePoint.midPrice, timestampUtc: r.closingReferencePoint.timestampUtc }].concat(pts);
      (charts[isin] = charts[isin] || {})[tf === 'max' ? 'monthly' : tf === 'six_months' ? 'six' : 'one'] = pts;
    });
    Object.values(charts).forEach((c) => { c.daily = Feed.mergeDaily(c.one, c.six); });
    const T = Feed.build({ holdings: raw.holdings, overview: raw.overview, cash: raw.cash, quotes: raw.secs, news: {}, transactions: tx, charts, static: { types: DATA.types || {}, indices: [], research: {}, comments: {}, profile: {} } });
    if (!T.history) return keepBase(base, asOf);
    const tp = T.history.points, te = T.history.external;
    const lastStored = base.points.filter((p) => p[0] <= cut).slice(-1)[0], atCut = tp.filter((p) => p[0] <= cut).slice(-1)[0];
    const off = lastStored && atCut ? lastStored[2] - atCut[2] : 0; // keep the cumulative flows continuous across the join
    DATA_ACTIVE.history = { ...base,
      points: base.points.filter((p) => p[0] <= cut).concat(tp.filter((p) => p[0] > cut).map((p) => [p[0], p[1], +(p[2] + off).toFixed(2)])),
      external: base.external.filter((f) => f[0] <= cut).concat(te.filter((f) => f[0] > cut)) };
    saveHistory(DATA_ACTIVE.history);
    return true;
  } catch (e) { return keepBase(base, Date.now()); }
}
function keepBase(base, asOf) { // a saved history must never run past the live valuation
  DATA_ACTIVE.history = { ...base, points: base.points.filter((p) => p[0] <= asOf), external: base.external.filter((f) => f[0] <= asOf) };
  return false;
}
async function saveHistory(h) { // owner-only write; viewers without the right simply skip it
  try {
    if (!DB) return;
    const json = JSON.stringify(h);
    if (json.length > 800000) return;
    await DB.doc(HIST_DOC).set({ json, lastT: h.points[h.points.length - 1][0], updatedAt: new Date().toISOString() });
  } catch (e) { /* the page still works from what it just built */ }
}

/* ---------- boot ---------- */
async function watchResearch() {
  try {
    const db = window.claude && window.claude.use ? await window.claude.use('db') : null;
    if (!db) return;
    state.dbReady = true;
    db.collection('commentary').onSnapshot((snap) => {
      const o = {}; snap.docs.forEach((d) => { if (d.exists) o[d.id] = d.data(); });
      state.commentary = o; if (M) renderBook();
    }, () => { state.dbReady = false; if (M) renderBook(); });
    if (M) renderBook();
  } catch (e) { /* research block stays hidden */ }
}
function render() {
  M = buildModel(DATA_ACTIVE);
  renderHeader(); renderTabs(); renderRecord(); renderBook(); renderRisk(); renderNotes();
}
async function boot() {
  DATA_SNAP = prepare(DATA); DATA_ACTIVE = DATA_SNAP;
  // always open on the Portfolio tab, whatever the link's hash or the last visit
  state.tab = 'book';
  try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* hash is a convenience */ }
  render();
  window.addEventListener('hashchange', () => setTab(location.hash.slice(1), false));
  HIST_READY = loadStoredHistory();
  watchResearch();
  $('#btn-refresh').addEventListener('click', liveRefresh);
  try {
    const mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null;
    if (mcp) { MCP = mcp; state.canLive = true; renderHeader(); liveRefresh(); }
  } catch (e) { /* stay on the snapshot */ }
}
boot();
