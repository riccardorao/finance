/* ===== page part 3 (viewer edition): everything comes from the viewer's own Scalable Capital account =====
   Nothing personal is built into this page. On open it asks the connector for the viewer's holdings, quotes,
   transactions and price charts, and Feed.build() turns the answers into the data object the views draw. */
const SERVER = 'Scalable Capital';
const STATIC = DATA.static || {};
let MCP = null, PFID = null, LOADING = false;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function explain(err) {
  const c = err && err.code;
  if (c === 'needs_reauth' || c === 'server_not_connected') return 'Connect Scalable Capital in claude.ai under Settings, Connectors, then reload this page.';
  if (c === 'not_in_manifest' || c === 'consent_required' || c === 'not_granted') return 'Reading your Scalable Capital account was not allowed for this page. Choose Refresh to be asked again.';
  if (c === 'selection_required') return 'Choose which Scalable Capital connector to use.';
  if (c === 'blocked_by_policy' || c === 'approval_required') return 'Your organisation does not allow this page to read Scalable Capital.';
  if (c === 'server_unavailable' || c === 'upstream_error' || c === 'rate_limited') return 'Scalable did not answer. Try again in a moment.';
  if (c === 'tool_error') return 'Scalable reported an error' + (err.message ? ': ' + String(err.message).slice(0, 80) : '.');
  return 'Your Scalable Capital data could not be read.';
}
async function callRead(tool, input) {
  const args = Object.assign({}, input || {}); if (PFID) args.portfolioId = PFID;
  const go = () => MCP.callTool(SERVER, tool, args, { cache: false }).then((r) => { let p = r && r.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* keep text */ } } return p; });
  try { return await go(); } catch (e) { if (e && e.retryable) { await wait(Math.min(e.retryAfterMs || 1200, 3000) + Math.random() * 400); return go(); } throw e; }
}
async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { __err: e }; } } }));
  return out;
}
function prepare(D) {
  D.ser = {}; Object.keys(D.series.p).forEach((id) => { D.ser[id] = { d: D.series.dates, p: D.series.p[id] }; });
  return D;
}

/* ---------- screens before and while the data loads ---------- */
function showAll(title, text) { ['#t-book', '#t-record', '#t-risk'].forEach((id) => placeholder($(id), title, text)); $('#notes').innerHTML = ''; }
function renderPicker(ids) {
  const root = $('#t-book');
  root.innerHTML = `<div class="panel empty"><h3>Choose a portfolio</h3><p class="sub">Your Scalable Capital login has more than one portfolio.</p><div class="seg" role="group" aria-label="Portfolio">${ids.map((id, i) => `<button data-pf="${esc(id)}" aria-pressed="false">Portfolio ${i + 1}</button>`).join('')}</div></div>`;
  $$('#t-book [data-pf]').forEach((b) => b.addEventListener('click', () => { PFID = b.dataset.pf; loadAll(); }));
}

function render() {
  const D = DATA_ACTIVE;
  if (!D.holdings.length) { M = null; renderHeader(); renderTabs(); showAll('No stock or ETF positions found', 'This page shows the shares and ETFs in your Scalable Capital portfolio. Crypto and leveraged products are left out.'); return; }
  M = buildModel(D);
  renderHeader(); renderTabs(); renderRecord(); renderBook(); renderRisk(); renderNotes();
}

/* ---------- load ---------- */
async function loadAll() {
  if (!MCP || LOADING) return;
  LOADING = true; state.mode = 'loading'; state.statusMsg = 'Reading your portfolio'; state.progress = ''; state.hist = 'pending'; renderHeader();
  if (!M) showAll('Reading your Scalable Capital account…', 'Your holdings and prices first, then your transaction history.');
  try {
    // 1. which portfolio
    if (!PFID) {
      const pf = await callRead('list_accessible_portfolios');
      const ids = ((pf && pf.portfolios) || []).map((x) => x.portfolioId);
      if (ids.length > 1 && !(pf.resolution && /resolved/.test(pf.resolution.status || ''))) { state.mode = 'snapshot'; state.statusMsg = 'Choose a portfolio'; renderHeader(); renderPicker(ids); LOADING = false; return; }
    }
    // 2. positions, valuation, cash
    const [h, o, c] = await Promise.allSettled([callRead('get_portfolio_holdings'), callRead('get_portfolio_overview'), callRead('get_portfolio_cash_breakdown')]);
    if (h.status !== 'fulfilled') throw h.reason;
    const feed = ((h.value && h.value.holdings) || []).filter((x) => x.position && x.position.filled > 0);
    const bench = (STATIC.indices || [])[0];
    const isins = feed.map((f) => f.isin).concat(bench ? [bench.isin] : []);
    let failed = [o, c].filter((x) => x.status !== 'fulfilled').length;
    const [qs, ns] = await Promise.all([
      pool(isins, 6, (i) => callRead('get_security_quote', { isin: i })),
      pool(feed.map((f) => f.isin), 6, (i) => callRead('get_security_news', { isin: i, locale: 'en_US' })),
    ]);
    const quotes = {}, news = {};
    isins.forEach((i, k) => { if (qs[k] && !qs[k].__err && qs[k].security) quotes[i] = qs[k]; else failed++; });
    feed.forEach((f, k) => { if (ns[k] && !ns[k].__err) news[f.isin] = ns[k]; });
    const raw = { holdings: h.value, overview: o.status === 'fulfilled' ? o.value : null, cash: c.status === 'fulfilled' ? c.value : null, quotes, news, transactions: [], charts: {}, static: STATIC };
    DATA_ACTIVE = prepare(Feed.build(raw));
    state.mode = 'loading'; state.statusMsg = 'Rebuilding your history'; render();
    // 3. transactions, then price charts for everything ever traded
    const tx = []; let cursor = null, pages = 0;
    do {
      const r = await callRead('list_portfolio_transactions', Object.assign({ pageSize: 100 }, cursor ? { cursor } : {}));
      (r && r.transactions || []).forEach((x) => tx.push(x));
      cursor = r && r.page && r.page.nextCursor; pages++;
      state.progress = `Read ${tx.length} transactions…`; if (!M || !M.perf) showAllHist();
    } while (cursor && pages < 60);
    const plan = Feed.chartPlan(tx, h.value, bench && bench.isin, Date.parse((raw.overview && raw.overview.timestamps && raw.overview.timestamps.valuationTimestampUtc) || Date.now()));
    const jobs = []; plan.forEach((p) => { jobs.push([p.isin, 'max']); if (p.daily) jobs.push([p.isin, 'one_year']); });
    let done = 0, chartFailed = 0; const charts = {};
    await pool(jobs, 6, async ([isin, tf]) => {
      try {
        const r = await callRead('get_security_chart', { isin, timeframe: tf });
        let pts = (r && r.dataPoints) || [];
        if (tf === 'one_year' && r && r.closingReferencePoint) pts = [{ midPrice: r.closingReferencePoint.midPrice, timestampUtc: r.closingReferencePoint.timestampUtc }].concat(pts);
        (charts[isin] = charts[isin] || {})[tf === 'max' ? 'monthly' : 'daily'] = pts;
      } catch (e) { chartFailed++; }
      done++; state.progress = `Loading prices… ${done} of ${jobs.length}`; if (done % 8 === 0) { state.statusMsg = state.progress; renderHeader(); if (!M || !M.perf) showAllHist(); }
    });
    DATA_ACTIVE = prepare(Feed.build({ ...raw, transactions: tx, charts }));
    state.hist = DATA_ACTIVE.history ? 'ready' : 'none';
    state.mode = 'live';
    const D = DATA_ACTIVE, fx = D.diag.splitsFixed.length;
    state.statusMsg = [failed ? `${failed} ${failed === 1 ? 'item' : 'items'} could not be read` : '', chartFailed ? `no price history for ${chartFailed} ${chartFailed === 1 ? 'series' : 'series'}, your trade prices used instead` : '', fx ? `share splits found in ${fx} ${fx === 1 ? 'position' : 'positions'}` : ''].filter(Boolean).join(' · ');
    render();
  } catch (err) {
    state.mode = 'error'; state.statusMsg = explain(err); state.hist = state.hist === 'ready' ? 'ready' : 'none';
    if (!M) { renderHeader(); showAll('Your portfolio could not be loaded', explain(err)); } else { renderHeader(); renderRecord(); }
  } finally { LOADING = false; }
}
function showAllHist() { if ($('#t-record')) placeholder($('#t-record'), 'Rebuilding your performance history…', state.progress); }

async function boot() {
  state.tab = 'book';
  try { if (location.hash) history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* hash is a convenience */ }
  state.mode = 'loading'; state.statusMsg = 'Connecting to Scalable Capital…'; renderHeader(); renderTabs();
  showAll('Connecting to Scalable Capital…', 'This page reads your own account when it opens. Nothing is stored.');
  window.addEventListener('hashchange', () => setTab(location.hash.slice(1), false));
  $('#btn-refresh').addEventListener('click', () => { if (MCP) { LOADING = false; loadAll(); } });
  let mcp = null;
  try { mcp = window.claude && window.claude.use ? await window.claude.use('mcp') : null; } catch (e) { mcp = null; }
  if (!mcp) { state.mode = 'error'; state.statusMsg = 'Not connected'; renderHeader(); showAll('Open this page in claude.ai', 'It shows your own Scalable Capital portfolio, so it needs the Scalable Capital connector that claude.ai provides. Add the connector under Settings, Connectors, then reopen the page.'); return; }
  MCP = mcp; state.canLive = true;
  loadAll();
}
boot();
