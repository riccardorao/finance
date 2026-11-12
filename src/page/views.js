/* ===== page part 2: the tabs ===== */
const benchOf = () => M.D.benches.find((b) => b.id === state.bench) || M.D.benches[0];
const holdingBy = (isin) => M.H.find((h) => h.isin === isin);
const perfOf = (h, p) => (h.perf && h.perf[p] ? h.perf[p][0] : null);
const pctSpan = (x, d = 1) => `<span class="${cls(x)} num">${fmtSignedPct(x, d)}</span>`;
const eur0Span = (x) => `<span class="${cls(x)} num">${x > 0 ? '+' : ''}${fmtEUR0(x)}</span>`;
const BSHORT = { SPX: 'S&P 500' };
const prOf = () => PRESETS[state.preset].p;
const ptsTxt = (x, d = 1) => (x == null ? '–' : tl('{x} pts', { x: `${x >= 0 ? '+' : '−'}${fmtNum(Math.abs(x * 100), d)}` }));
const pctTxt = (x, d = 0) => fmtPct(x, d);

function portOutlook(pr) {
  const rows = M.H.map((h) => ({ h, w: h.value / M.secValue, sc: h.sc, e: expOf(h.sc, pr) }));
  const cov = rows.filter((r) => r.sc);
  const agg = (f) => C_sum(cov.map((r) => r.w * f(r)));
  const cover = C_sum(cov.map((r) => r.w)), k = cover > 0 ? 1 / cover : 0; // the average is taken over the positions analysts cover
  return { rows, cover, nCov: cov.length, exp: cover > 0 ? agg((r) => r.e) * k : null, base: agg((r) => r.sc.base) * k, bull: agg((r) => r.sc.bull) * k, bear: agg((r) => r.sc.bear) * k };
}

/* ---------- header, navigation and preferences ---------- */
function renderHeader() {
  const lbl = document.querySelector('.worth .lbl'); if (lbl) lbl.textContent = tl('Portfolio value');
  const rb = $('#btn-refresh'); if (rb) rb.textContent = tl('Refresh');
  if (!M) { // viewer edition, before the data arrives
    $('#mh-name').textContent = 'Equity Portfolio Dashboard'; $('#mh-strategy').textContent = ''; $('#mh-value').textContent = '–'; $('#mh-sub').textContent = '';
    $('#status').dataset.mode = state.mode; $('#status-text').textContent = state.statusMsg || ''; $('#btn-refresh').hidden = true; return;
  }
  const D = M.D, pr = D.profile;
  $('#mh-name').textContent = 'Equity Portfolio Dashboard';
  $('#mh-strategy').textContent = pr.manager || '';
  const day = C_sum(M.H.map((h) => { const r = perfOf(h, '1D'); return r == null ? 0 : h.value - h.value / (1 + r); }));
  const dayPct = day / (M.secValue - day);
  $('#mh-value').textContent = fmtEUR0(M.secValue);
  const pill = (k, v, sub, c) => `<div class="pill"><span class="lbl">${k}</span><b class="${c || ''}">${v}</b>${sub ? `<small class="${c || ''}">${sub}</small>` : ''}</div>`;
  const costAll = C_sum(M.H.filter((h) => h.cost != null).map((h) => h.cost));
  const sEur = (x) => `${x >= 0 ? '+' : '−'}${fmtEUR0(Math.abs(x))}`;
  $('#mh-sub').innerHTML = pill(tl('Today'), sEur(day), fmtSignedPct(dayPct, 1), cls(day))
    + (M.unreal != null ? pill(tl('Total return'), sEur(M.unreal), costAll ? fmtSignedPct(M.unreal / costAll, 1) : '', cls(M.unreal)) : '')
    + pill(tl('Positions'), String(M.H.length), D.cash != null ? tl('{x} cash', { x: fmtEUR0(D.cash) }) : '');
  const st = $('#status'); st.dataset.mode = state.mode;
  const txt = { snapshot: tl('Prices at {d}', { d: tfmt(D.meta.asOf) }), loading: tl('Syncing with Scalable…'), live: tl('Synced {d}', { d: tfmt(D.meta.asOf) }), error: tl('Prices at {d}', { d: tfmt(D.meta.asOf) }) }[state.mode];
  $('#status-text').textContent = txt + (state.statusMsg ? ' · ' + state.statusMsg : '');
  $('#btn-refresh').disabled = state.mode === 'loading';
  $('#btn-refresh').hidden = !state.canLive;
}
const TAB_ICON = {
  book: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  record: '<path d="M4 18l5-6 4 3 7-9"/><path d="M15 6h5v5"/>',
  risk: '<path d="M4 12c4 0 6-6 8-6s4 12 8 12"/><path d="M4 18h16" opacity=".4"/>',
  ideas: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
};
const ICON_SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
const ICON_MOON = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';
function renderPrefs() {
  const el = $('#prefs'); if (!el) return;
  const dark = isDark();
  el.innerHTML = `<div class="seg seg-sm" role="group" aria-label="${tl('Language')}">${Object.keys(LANGS).map((l) => `<button data-lang="${l}" aria-pressed="${l === LANG}" title="${LANGS[l]}">${l.toUpperCase()}</button>`).join('')}</div>
    <button class="icon-btn" id="theme-btn" aria-label="${tl(dark ? 'Switch to light mode' : 'Switch to dark mode')}" title="${tl(dark ? 'Switch to light mode' : 'Switch to dark mode')}"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${dark ? ICON_SUN : ICON_MOON}</svg></button>`;
  $$('#prefs [data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('#theme-btn').addEventListener('click', toggleTheme);
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label]) => `<button role="tab" id="tab-${id}" aria-controls="t-${id}" aria-selected="${id === state.tab}" tabindex="${id === state.tab ? 0 : -1}" data-tab="${id}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TAB_ICON[id] || ''}</svg><span>${tl(label)}</span></button>`).join('');
  TABS.forEach(([id]) => { $('#t-' + id).hidden = id !== state.tab; });
  $$('#tabs [data-tab]').forEach((b) => {
    b.addEventListener('click', () => setTab(b.dataset.tab, true));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = TABS.findIndex((x) => x[0] === state.tab), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
      setTab(n, true); $('#tab-' + n).focus();
    });
  });
  renderPrefs();
}
function setTab(id, push) {
  if (!TABS.some((x) => x[0] === id)) return;
  state.tab = id; renderTabs(); hideTip();
  if (push) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* hash is a convenience */ } window.scrollTo({ top: 0, behavior: 'auto' }); }
}
// everything on screen again, after a change of language
function rerenderAll() {
  renderHeader(); renderTabs();
  if (!M) return;
  [renderRecord, renderBook, renderRisk, renderIdeas, renderNotes].forEach((f) => { try { f(); } catch (e) { /* a tab without data keeps its placeholder */ } });
  if (typeof tradeState !== 'undefined' && tradeState.open) renderTrade();
}

/* =====================================================================
   PERFORMANCE
   ===================================================================== */
const IDX_COLOR = { SPX: 'var(--spx)' };
const FUND = (DATA.profile && DATA.profile.fund) || 'Freedom Fund';
const idxName = (id) => (M.D.indices.find((x) => x.id === id) || { name: id }).name;
const kpi = (k, v, c, n) => `<div class="kpi"><div class="k">${k}</div><div class="v ${c || ''}">${v}</div><div class="n">${n || ''}</div></div>`;
const vsIdx = (you, idx, name) => { const e = you - idx; return `${esc(name)} ${fmtSignedPct(idx, 1)} · <b class="${cls(e)}">${ptsTxt(e, 1)}</b>`; };
const tfLabels = () => ({ '1M': tl('1 month'), '3M': tl('3 months'), '6M': tl('6 months'), YTD: tl('Year to date'), '1Y': tl('1 year'), Y2025: '2025', Y2024: '2024', SI: tl('Since I started') });

function placeholder(root, title, text) { root.innerHTML = `<div class="panel empty"><h3>${esc(title)}</h3><p class="sub">${esc(text)}</p></div>`; }
function renderRecord() {
  const root = $('#t-record'); unmountWithin(root);
  const D = M.D, PF = M.perf, L = tfLabels();
  if (!PF) { placeholder(root, state.hist === 'pending' ? tl('Rebuilding your performance history…') : tl('No performance history yet'), state.hist === 'pending' ? (state.progress || tl('Reading your transactions and prices from Scalable Capital.')) : tl('Performance needs your trades and a benchmark price series, and they could not be read.')); return; }
  const sel = ['SPX'], gsel = sel; // the S&P 500 is the only benchmark
  const primary = sel[0], pName = idxName(primary);
  const all = TF.map(([k]) => PF.stats(k));
  const g = (k) => all.find((s) => s.k === k);
  const si = g('SI'), young = PF.asOf - PF.first < 366 * 864e5; // a history shorter than a year: the 12-month figures are since the start
  const y1 = young ? si : g('1Y'), ytd = g('YTD');
  const vis = TF.filter(([k]) => (k !== 'Y2024' || PF.first < Date.UTC(2024, 11, 31)) && (k !== 'Y2025' || PF.first < Date.UTC(2025, 11, 31)) && (k !== '1Y' || !young));
  if (!vis.some((v) => v[0] === state.tf)) state.tf = 'SI';
  const st = PF.stats(state.tf);
  const twr = state.measure === 'twr';
  const closedStocks = D.ledger.realised.filter((r) => (r.type === 'Shares' || r.type === 'ETFs & ETCs') && r.last), wins = closedStocks.filter((r) => r.pl > 0).length;
  const gap = y1.twr - y1.idx[primary].twr;

  root.innerHTML = `
  <div class="bar2"><div><h2>${tl('Performance')}</h2><p class="lead">${tl(gap >= 0 ? '{f}: {x} {when}, {p} points ahead of the {b}' : '{f}: {x} {when}, {p} points behind the {b}', { f: FUND, x: fmtSignedPct(y1.twr, 1), when: tl(young ? 'since I started' : 'over the last 12 months'), p: fmtNum(Math.abs(gap * 100), 1), b: esc(pName) })}</p></div></div>
  <div class="kpis4">
    ${kpi(young ? tl('Since I started') : tl('Last 12 months'), fmtSignedPct(y1.twr, 1), cls(y1.twr), vsIdx(y1.twr, y1.idx[primary].twr, pName))}
    ${kpi(tl('This year'), fmtSignedPct(ytd.twr, 1), cls(ytd.twr), vsIdx(ytd.twr, ytd.idx[primary].twr, pName))}
    ${kpi(tl('Every euro since I started'), fmtSignedPct(si.mwr, 1) + `<small> ${tl('a year')}</small>`, cls(si.mwr), `${esc(pName)}: ${fmtSignedPct(si.idx[primary].mwr, 1)} ${tl('a year')}`)}
    ${kpi(tl('Winning calls'), `${wins}<small> ${tl('of {n}', { n: closedStocks.length })}</small>`, '', tl('Closed positions sold at a profit'))}
  </div>

  <div class="panel" style="margin-top:16px">
    <div class="ctrls">
      <div class="seg" role="group" aria-label="${tl('Period')}">${vis.map(([k]) => `<button data-tf="${k}" aria-pressed="${k === state.tf}">${k === 'Y2025' || k === 'Y2024' ? L[k] : k === 'SI' ? 'Max' : k}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="${tl('Measure')}"><button data-ms="twr" aria-pressed="${twr}" title="${tl('Time-weighted: the return on the picks, however much money was in')}">${tl('Return on picks')}</button><button data-ms="mwr" aria-pressed="${!twr}" title="${tl('Money-weighted: what the actual money is worth, against the same money in the S&P 500')}">${tl('Return on my money')}</button></div>
    </div>
    <div class="headline"><span class="big2 ${cls(twr ? st.twr : st.gain)}">${twr ? fmtSignedPct(st.twr, 1) : fmtSignedEUR(st.gain)}</span><span class="muted">${twr ? tl('Time-weighted') : tl('Money-weighted, {x}', { x: st.years > 1.05 ? `${fmtSignedPct(st.mwr, 1)} ${tl('a year')}` : fmtSignedPct(st.mwrPeriod, 1) })} · ${esc(L[state.tf])}</span>
      <span class="idxv"><i class="sw line" style="background:var(--fund)"></i>${FUND}</span>${sel.map((id) => `<span class="idxv"><i class="sw line" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))} ${twr ? fmtSignedPct(st.idx[id].twr, 1) : fmtSignedEUR(st.idx[id].value - st.b.v + st.gain)}</span>`).join('')}</div>
    <div id="perfchart" class="chart"></div>
    <div class="row-between" style="margin-top:8px"><span class="legend">${PF.approxBefore && st.a.t < PF.approxBefore ? `<span><i class="sw line dash" style="color:var(--fund)"></i>${tl('Estimated from month-end prices, before {d}', { d: esc(dfmt(isoDay(PF.approxBefore), { day: undefined })) })}</span>` : ''}</span><button class="tablink" id="tv-perf">${state.tableView.perf ? tl('Show chart') : tl('View as table')}</button></div>
  </div>

  <div class="panel" style="margin-top:16px">
    <h3>${tl('Every period at a glance')}</h3>
    <div class="pbars" style="--ni:${gsel.length}">
      <div class="pb pb-h"><span class="pl"></span><span class="pt"></span><span class="pv">${FUND}</span>${gsel.map((id) => `<span class="pi">${esc(BSHORT[id] || idxName(id))}</span>`).join('')}</div>
      ${all.filter((s) => vis.some((v) => v[0] === s.k)).map((s) => { const shown = all.filter((q) => vis.some((v) => v[0] === q.k)); const mx = Math.max(...shown.map((q) => Math.max(Math.abs(q.twr), ...gsel.map((id) => Math.abs(q.idx[id].twr))))) || 1; const bar = (x) => { const w = (Math.abs(x) / mx) * 50; return x < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`; };
      return `<button class="pb${s.k === state.tf ? ' on' : ''}" data-tf="${s.k}"><span class="pl">${esc(L[s.k])}</span>
        <span class="pt" style="height:${10 + gsel.length * 7}px"><i class="z"></i><i class="b you" style="top:0;${bar(s.twr)}"></i>${gsel.map((id, j) => `<i class="b idx" style="top:${10 + j * 7}px;background:${IDX_COLOR[id]};${bar(s.idx[id].twr)}"></i>`).join('')}</span>
        <span class="pv ${cls(s.twr)}">${fmtSignedPct(s.twr, 1)}</span>${gsel.map((id) => { const e = s.twr - s.idx[id].twr; return `<span class="pi">${fmtSignedPct(s.idx[id].twr, 1)}<small class="${cls(e)}">${ptsTxt(e, 1)}</small></span>`; }).join('')}</button>`; }).join('')}</div>
    <div class="legend" style="margin:12px 0 0"><span><i class="sw" style="background:var(--fund)"></i>${FUND}</span>${gsel.map((id) => `<span><i class="sw" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))}</span>`).join('')}<span>${tl('Points ahead (+) or behind (−) the S&P 500')}</span></div>
  </div>`;

  $$('#t-record [data-tf]').forEach((b) => b.addEventListener('click', () => { state.tf = b.dataset.tf; renderRecord(); }));
  $$('#t-record [data-ms]').forEach((b) => b.addEventListener('click', () => { state.measure = b.dataset.ms; renderRecord(); }));
  $('#tv-perf').addEventListener('click', () => { state.tableView.perf = !state.tableView.perf; renderRecord(); });

  const a = st.a, b = st.b;
  const pp = PF.pts.filter((p) => p.t >= a.t && p.t <= b.t + 6 * 36e5);
  const xs = pp.map((p) => p.t);
  const fl = PF.fl.filter((f) => f[0] > a.t && f[0] <= b.t);
  let series, yFmt, tipVal;
  if (twr) {
    series = [{ v: pp.map((p) => (p.i / a.i - 1) * 100), color: 'var(--fund)', width: 2.25, label: FUND, fill: true, fillTo: 0, fillOpacity: 0.08, approx: true }]
      .concat(sel.map((id) => ({ v: xs.map((x) => (PF.P[id](x) / PF.P[id](a.t) - 1) * 100), color: IDX_COLOR[id], width: 1.5, label: idxName(id) })));
    yFmt = (v) => Math.round(v) + '%'; tipVal = (v) => fmtSignedPct(v / 100, 1);
  } else {
    let k = 0; const unitsCum = Object.fromEntries(sel.map((id) => [id, a.v / PF.P[id](a.t)]));
    const idxV = Object.fromEntries(sel.map((id) => [id, []])), money = [];
    let m = a.v;
    xs.forEach((x) => { while (k < fl.length && fl[k][0] <= x) { sel.forEach((id) => { unitsCum[id] += fl[k][1] / PF.P[id](fl[k][0]); }); m += fl[k][1]; k++; } sel.forEach((id) => idxV[id].push(unitsCum[id] * PF.P[id](x))); money.push(m); });
    series = [{ v: pp.map((p) => p.v), color: 'var(--fund)', width: 2.25, label: FUND, approx: true }]
      .concat(sel.map((id) => ({ v: idxV[id], color: IDX_COLOR[id], width: 1.5, label: tl('Same money in {b}', { b: idxName(id) }) })))
      .concat([{ v: money, color: 'var(--ink3)', width: 1.25, dash: '4 4', label: tl('Money in') }]);
    yFmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v))); tipVal = (v) => fmtEUR0(v);
  }
  mount($('#perfchart'), (h, w) => {
    if (state.tableView.perf) { h.innerHTML = tableTwin([tl('Date')].concat(series.map((s) => s.label)), xs.map((x, i) => [dfmt(isoDay(x))].concat(series.map((s) => (s.v[i] == null ? '–' : tipVal(s.v[i])))))); return; }
    lineChart(h, w, {
      x: xs, series, approxBefore: PF.approxBefore, height: w < 520 ? 280 : 380, yFmt, zero: twr ? 0 : null, yMin: twr ? null : 0, aria: tl('{f} against the S&P 500', { f: FUND }),
      tip: (i) => `<div class="th">${dfmt(isoDay(xs[i]))}</div>${series.map((s) => (s.v[i] == null ? '' : trow(s.color, s.label, tipVal(s.v[i]), 1))).join('')}`,
    });
  });
}

/* =====================================================================
   PORTFOLIO
   ===================================================================== */
const newsDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? dfmt(d, { year: undefined }) : /^\d{4}-\d{2}$/.test(d) ? dfmt(d + '-15', { day: undefined }) : String(d || ''));
const ageChip = (iso, key) => { const age = (Date.now() - Date.parse(iso)) / 864e5; return `<span class="chip sm${age > 2 ? ' warn' : ''}">${tl(key, { d: esc(dfmt(String(iso).slice(0, 10), { year: undefined })) })}</span>`; };
const srcLink = (src, url) => { const u = safeUrl(url); return src ? ` <span class="muted">${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(src)}</a>` : esc(src)}</span>` : ''; };
function liveResearch(h) {
  if (!state.dbReady) return null;
  const c = state.commentary[h.isin];
  if (!c) return null;
  const items = (Array.isArray(c.items) ? c.items : []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 3);
  return `${c.headline ? `<p class="hl"><b>${esc(c.headline)}</b></p>` : ''}<ul class="news">${items.map((n) => `<li><time>${esc(newsDate(n.date))}</time><span>${esc(n.text)}${srcLink(n.source, n.url)}</span></li>`).join('')}</ul>
    ${Array.isArray(c.watch) && c.watch.length ? `<h4>${tl('Watch next')}</h4><ul class="watch">${c.watch.slice(0, 2).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}`;
}

const BOOK_PERIODS = [['1D', '1 day'], ['1W', '1 week'], ['1M', '1 month'], ['3M', '3 months'], ['6M', '6 months'], ['YTD', 'Year to date'], ['1Y', '1 year']];
function renderBook() {
  const root = $('#t-book'); unmountWithin(root);
  const pc = (h, k) => { const r = perfOf(h, k); return r == null ? '<span class="muted">–</span>' : pctSpan(r, 1); };
  const bp = BOOK_PERIODS.some((p) => p[0] === state.bp) ? state.bp : '1D';
  const ytd = C_sum(M.H.map((h) => { const r = perfOf(h, 'YTD'); return r == null ? 0 : h.value - h.value / (1 + r); }));
  if (state.open && !holdingBy(state.open)) state.open = null;
  const H2 = (x, sub) => `<span class="hh"><b>${x}</b><small>${sub}</small></span>`;
  const ex = M.D.excluded && M.D.excluded.n ? M.D.excluded : null;
  root.innerHTML = `
  <div class="bar2"><div><h2>${tl('Holdings')}</h2><div class="chips"><span class="chip">${tl('{n} positions', { n: M.H.length })}</span><span class="chip">${tl('{x} this year', { x: `${ytd >= 0 ? '+' : '−'}${fmtEUR0(Math.abs(ytd))}` })}</span>${ex ? `<span class="chip muted">${tl(ex.n > 1 ? '{n} leveraged or crypto positions left out' : '{n} leveraged or crypto position left out', { n: ex.n })}</span>` : ''}</div></div>
    <div class="ctl"><span class="lbl">${tl('Price change')}</span><div class="seg" role="group" aria-label="${tl('Price change')}">${BOOK_PERIODS.map(([k, l]) => `<button data-bp="${k}" aria-pressed="${k === bp}" title="${tl(l)}">${k}</button>`).join('')}</div></div></div>
  <div class="panel flat book">
    <div class="book-h"><span>${H2(tl('Position'), tl('Share of portfolio'))}</span><span class="c-m">${H2(tl('Consensus'), `<i class="neg">${tl('Sell')}</i> · <i>${tl('Hold')}</i> · <i class="pos">${tl('Buy')}</i>`)}</span><span>${H2(tl('Value'), tl('At last close'))}</span><span>${H2(bp, tl('Price change'))}</span><span>${H2(tl('Total return (%)'), tl('Since bought'))}</span><span class="c-m">${H2(tl('Total return (€)'), tl('Since bought'))}</span><span class="c-m">${H2(tl('Bull case'), tl('Top target'))}</span><span class="c-m">${H2(tl('Bear case'), tl('12-month downside'))}</span><span></span></div>
    ${M.H.map((h) => {
      const sc = h.sc, cons = h.research && h.research.cons, open = state.open === h.isin;
      const cnt = (x) => (typeof x === 'number' && x >= 0 ? x : null), votes = cons ? [cnt(cons.sell), cnt(cons.hold), cnt(cons.buy)] : [null, null, null];
      return `<div class="posn${open ? ' open' : ''}" data-i="${h.isin}">
        <button class="pos-row" aria-expanded="${open}" aria-controls="pd-${h.isin}">
          <span class="nm">${logoTag(h.isin, h.name, null, 30)}<span class="nt"><b>${esc(h.name)}</b><small>${esc(h.ticker || '')} · ${fmtPct(h.weight, 1)}</small><i class="wb"><i style="width:${Math.min(100, h.weight * 400).toFixed(1)}%"></i></i></span></span>
          <span class="n c-m votes">${votes.every((v) => v != null) ? `<span role="img" aria-label="${tl('{s} sell, {h} hold, {b} buy', { s: votes[0], h: votes[1], b: votes[2] })}"><b class="neg">${votes[0]}</b><b>${votes[1]}</b><b class="pos">${votes[2]}</b></span>` : '<span class="muted">–</span>'}</span>
          <span class="n"><b>${fmtEUR0(h.value)}</b></span>
          <span class="n">${pc(h, bp)}</span>
          <span class="n"><b>${h.pnl != null ? pctSpan(h.pnlPct, 1) : '–'}</b></span>
          <span class="n c-m"><b>${h.pnl != null ? eur0Span(h.pnl) : '–'}</b></span>
          ${sc ? `<span class="n c-m"><span class="tag ${sc.bull >= 0 ? 'pos' : 'neg'}">${fmtSignedPct(sc.bull, 0)}</span></span><span class="n c-m"><span class="tag ${sc.bear >= 0 ? 'pos' : 'neg'}">${fmtSignedPct(sc.bear, 0)}</span></span>` : `<span class="c-m c-na"><small class="muted">${tl('No coverage')}</small></span>`}
          <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="pos-d" id="pd-${h.isin}" ${open ? '' : 'hidden'}>${open ? positionDetail(h) : ''}</div>
      </div>`;
    }).join('')}
  </div>`;

  $$('#t-book [data-bp]').forEach((b) => b.addEventListener('click', () => { state.bp = b.dataset.bp; renderBook(); }));
  $$('#t-book .pos-row').forEach((b) => b.addEventListener('click', () => {
    const id = b.parentElement.dataset.i;
    state.open = state.open === id ? null : id; renderBook();
    if (state.open) { const el = $(`#t-book .posn[data-i="${id}"]`); if (el && el.getBoundingClientRect().top < 80) el.scrollIntoView({ block: 'start' }); }
  }));
}
// the judgement the research routine rewrites from news, releases, filings and statements; it overrides the stored thesis
function judgementOf(h) {
  const j = state.dbReady ? state.judgement[h.isin] : null;
  if (!j || (!j.thesis && !j.kill && !j.assessment)) return null;
  return j;
}
const STANCE = { intact: ['Intact', 'hold'], strengthened: ['Strengthened', 'pos'], weakened: ['Weakened', 'neg'], review: ['Under review', 'neg'] };
function judgementBlock(j) {
  if (!j) return '';
  const st = STANCE[String(j.stance || '').toLowerCase()];
  const sig = (Array.isArray(j.signals) ? j.signals : []).slice(0, 5);
  return `<section class="judge"><div class="jh"><span class="k">${tl('Current judgement')}</span>${st ? `<span class="rt ${st[1]}">${tl(st[0])}</span>` : ''}${j.updatedAt ? ageChip(j.updatedAt, 'Reassessed {d}') : ''}</div>
    ${j.assessment ? `<p>${esc(j.assessment)}</p>` : ''}
    ${sig.length ? `<details class="fold"><summary>${tl('Evidence ({n})', { n: sig.length })}</summary><ul class="watch">${sig.map((x) => `<li>${esc(x.text)}${srcLink(x.source, x.url)}</li>`).join('')}</ul></details>` : ''}
  </section>`;
}

/* ---------- reported results: last quarter and last fiscal year ---------- */
const CCY_SYM = { USD: '$', EUR: '€', TWD: 'NT$', KRW: '₩', CAD: 'C$', GBP: '£', JPY: '¥', CHF: 'CHF ', SEK: 'SEK ', DKK: 'DKK ' };
function bigMoney(x, ccy) {
  if (x == null || !isFinite(x)) return '–';
  const a = Math.abs(x), sg = x < 0 ? '−' : '', sym = CCY_SYM[ccy] || ccy + ' ';
  const [v, u] = a >= 1e12 && LANG === 'en' ? [a / 1e12, 'tn'] : a >= 1e9 ? [a / 1e9, LANG === 'it' ? ' mld' : 'bn'] : a >= 1e6 ? [a / 1e6, LANG === 'it' ? ' mln' : 'm'] : [a, ''];
  return `${sg}${sym}${fmtNum(v, !u ? 0 : v >= 100 ? 0 : 1)}${u}`;
}
const epsMoney = (x, ccy) => (x == null || !isFinite(x) ? '–' : `${x < 0 ? '−' : ''}${CCY_SYM[ccy] || ccy + ' '}${fmtNum(Math.abs(x), ccy === 'KRW' || ccy === 'JPY' ? 0 : 2)}`);
// change on the same period a year earlier; for losses, words instead of a percentage that means nothing
function yoy(a, b) {
  if (a == null || b == null || !isFinite(a) || !isFinite(b) || b === 0) return '';
  if (a >= 0 && b > 0) { const g = a / b - 1; return `<small class="${cls(g)}">${fmtSignedPct(g, 0)} ${tl('y/y')}</small>`; }
  if (a < 0 && b < 0) return `<small class="${a > b ? 'pos' : 'neg'}">${tl(a > b ? 'Loss narrowed' : 'Loss widened')}</small>`;
  return a < 0 ? `<small class="neg">${tl('Swung to a loss')}</small>` : `<small class="pos">${tl('Back to profit')}</small>`;
}
function finCard(f, kind, ccy) {
  if (!f) return '';
  const cell = (k, v, sub) => `<div class="fc"><span class="k">${k}</span><b>${v}</b>${sub || ''}</div>`;
  return `<div class="fin-c"><div class="fin-h"><b>${tl(kind === 'q' ? 'Last quarter' : 'Last fiscal year')}</b><span>${kind === 'q' ? `${esc(f.fq || '')} FY${esc(f.fy || '')}` : `FY${esc(f.fy || '')}`} · ${tl('To {d}', { d: esc(dfmt(f.end)) })}</span></div>
    <div class="fin-g">
      ${cell(tl('Revenue'), bigMoney(f.rev, ccy), yoy(f.rev, f.revP))}
      ${cell(tl('Op. margin'), f.om == null ? '–' : `<span class="${f.om < 0 ? 'neg' : ''}">${fmtPct(f.om, 1)}</span>`, f.gm != null ? `<small>${tl('Gross {x}', { x: fmtPct(f.gm, 1) })}</small>` : '')}
      ${cell(tl('EPS (diluted)'), epsMoney(f.eps, ccy), yoy(f.eps, f.epsP))}
      ${cell(tl('Free cash flow'), `<span class="${f.fcf < 0 ? 'neg' : ''}">${bigMoney(f.fcf, ccy)}</span>`, f.fcf != null && f.rev ? `<small>${tl('{x} of revenue', { x: fmtPct(f.fcf / f.rev, 0) })}</small>` : '')}
    </div></div>`;
}
function finBlock(isin) {
  const F = M.D.financials && M.D.financials[isin];
  if (!F || (!F.q && !F.y)) return '';
  const u = safeUrl(F.src);
  return `<section class="fin"><div class="sec-t"><h4>${tl('Results')}</h4>${u ? `<a class="src" href="${esc(u)}" target="_blank" rel="noopener noreferrer">${tl('Source')}</a>` : ''}</div><div class="fin-row">${finCard(F.q, 'q', F.ccy)}${finCard(F.y, 'y', F.ccy)}</div></section>`;
}
// one line for the opportunity cards: the last quarter at a glance
function finLine(isin) {
  const F = M.D.financials && M.D.financials[isin], f = F && F.q;
  if (!f) return '';
  const bit = (k, v, sub) => `<span><span class="k">${k}</span> <b>${v}</b>${sub ? ' ' + sub : ''}</span>`;
  return `<div class="finline"><span class="fl-h">${tl('Last quarter')} · ${esc(f.fq || '')} FY${esc(f.fy || '')}</span>${bit(tl('Revenue'), bigMoney(f.rev, F.ccy), yoy(f.rev, f.revP))}${bit(tl('Operating margin'), fmtPct(f.om, 1))}${bit(tl('EPS'), epsMoney(f.eps, F.ccy), yoy(f.eps, f.epsP))}</div>`;
}

function positionDetail(h) {
  const cv = { ...(h.conviction || {}) }, jd = judgementOf(h);
  if (jd) { if (jd.thesis) cv.thesis = jd.thesis; if (jd.kill) cv.kill = jd.kill; }
  const rs = h.research, sc = h.sc, c = h.comment, cons = rs && rs.cons;
  const web = liveResearch(h);
  const news = web != null ? web : c ? `<ul class="news">${c.news.slice(0, 3).map((n) => `<li><time>${esc(newsDate(n[0]))}</time><span>${esc(n[1])}</span></li>`).join('')}</ul>` : '';
  const newsAt = web != null && state.commentary[h.isin] && state.commentary[h.isin].updatedAt;
  const srcs = (c ? c.sources : []).concat(cons && cons.src ? [cons.src] : []).map((x) => { const u = safeUrl(x.u); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.t)}</a>` : ''; }).join('');
  const act = canTrade() ? `<div class="pd-act"><button class="btn buy" data-trade="buy" data-isin="${esc(h.isin)}" data-name="${esc(h.name)}">${tl('Buy more')}</button><button class="btn sell" data-trade="sell" data-isin="${esc(h.isin)}" data-name="${esc(h.name)}">${tl('Sell')}</button></div>` : '';
  const thesis = cv.thesis || (c && c.tagline) || '';
  return `<div class="pd">
    <div class="pd-head">${thesis ? `<p class="pd-thesis">${esc(thesis)}</p>` : '<span></span>'}${act}</div>
    ${finBlock(h.isin)}
    <div class="pd-cols">
      <div class="pd-main">
        ${cv.kill ? `<section class="kill"><span class="k">${tl('Kill-switch')}</span><p>${esc(cv.kill)}</p></section>` : ''}
        ${judgementBlock(jd)}
        ${sc ? `<section class="cases">
          <div class="case bull"><div class="ch"><span>${tl('Bull case')}</span><b class="pos">${fmtSignedPct(sc.bull, 0)} · ${fmtEUR(sc.tBull)}</b></div><p>${rs ? esc(rs.bull) : ''}</p></div>
          <div class="case bear"><div class="ch"><span>${tl('Bear case')}</span><b class="neg">${fmtSignedPct(sc.bear, 0)} · ${fmtEUR(sc.tBear)}</b></div><p>${rs ? esc(rs.bear) : ''}</p>${sc.bearFromDD ? `<span class="chip sm">${tl("Set by the past year's worst fall")}</span>` : ''}</div>
        </section>` : ''}
        ${cons && sc ? `<p class="cons"><span class="rt ${/sell|under/i.test(cons.rating) ? 'neg' : /buy|outperform|overweight/i.test(cons.rating) ? 'pos' : 'hold'}">${esc(cons.rating)}</span> ${cons.analysts ? tl('{n} analysts', { n: cons.analysts }) + ' · ' : ''}${tl('Average target {t}, {u} from {p}', { t: fmtEUR(sc.tBase), u: fmtSignedPct(sc.base, 0), p: fmtEUR(h.price) })}</p>` : ''}
      </div>
      <div class="pd-side">
        ${news ? `<div class="sec-t"><h4>${tl('Latest')}</h4>${newsAt ? ageChip(newsAt, 'Updated {d}') : ''}</div>${news}` : ''}
        ${rs ? `<details class="fold"><summary>${tl('Company profile')}</summary><p><b>${esc(rs.industry)}</b></p><p>${esc(rs.market)}</p><p>${esc(rs.position)}</p><p><span class="k">${tl('Competitors')}</span> ${rs.competitors.map(esc).join(' · ')}</p></details>` : ''}
        ${h.scalable ? `<details class="fold"><summary>${tl("Scalable's news summary")}</summary><p>${esc(h.scalable.short)}</p></details>` : ''}
        ${srcs ? `<details class="fold"><summary>${tl('Sources')}</summary><div class="srcs">${srcs}</div></details>` : ''}
      </div>
    </div>
  </div>`;
}

function selectHolding(isin) {
  state.open = isin; setTab('book', true); renderBook();
  const el = $(`#t-book .posn[data-i="${isin}"]`); if (el) el.scrollIntoView({ block: 'start' });
}

/* =====================================================================
   OUTLOOK
   ===================================================================== */
// Outlook summary tile: the figure, a one-line verdict, a small visual, then the detail
const okTile = (k, v, c, verdict, vis, foot) => `<div class="kpi ok"><div class="k">${k}</div><div class="v ${c || ''}">${v}</div><div class="vd">${verdict}</div>${vis}<div class="n">${foot}</div></div>`;
const duoBars = (rows, f) => { const mx = Math.max(...rows.map((r) => Math.abs(r[1]))) || 1; return `<div class="duo">${rows.map(([l, x, col]) => `<div class="dr"><span class="dl">${esc(l)}</span><span class="dt"><i style="width:${(Math.abs(x) / mx) * 100}%;background:${col}"></i></span><b class="${cls(x)}">${f(x)}</b></div>`).join('')}</div>`; };
// the 25% to 75% band (dark) and the 5% to 95% band (light) on a strip, the median marked
const rangeStrip = (q) => { const lo = q(-Z95), hi = q(Z95), X = (x) => ((x - lo) / (hi - lo)) * 100;
  return `<span class="strip" role="img" aria-label="25%–75%: ${fmtSignedPct(q(-Z75), 0)} / ${fmtSignedPct(q(Z75), 0)}; 5%–95%: ${fmtSignedPct(q(-Z95), 0)} / ${fmtSignedPct(q(Z95), 0)}"><i class="b2"></i><i class="b1" style="left:${X(q(-Z75))}%;width:${X(q(Z75)) - X(q(-Z75))}%"></i>${lo < 0 && hi > 0 ? `<i class="z" style="left:${X(0)}%"></i>` : ''}<i class="md" style="left:${X(q(0))}%"></i></span>`; };
const HORIZONS = [[3, '3M', '3 months'], [6, '6M', '6 months'], [12, '1Y', '1 year'], [24, '2Y', '2 years'], [36, '3Y', '3 years']];
// standard normal distribution function (Abramowitz and Stegun 7.1.26)
function normCdf(z) {
  const u = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const e = 1 - (((((1.061405429 * u - 1.453152027) * u) + 1.421413741) * u - 0.284496736) * u + 0.254829592) * u * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}
function renderRisk() {
  const root = $('#t-risk'); unmountWithin(root);
  const R = M.risk, pr = prOf(), O = portOutlook(pr), V = M.secValue;
  if (!M.H.length) { placeholder(root, tl('Nothing to project yet'), tl('The outlook needs at least one stock or ETF position.')); return; }
  if (!R || !M.D.benches.length) { placeholder(root, state.hist === 'pending' ? tl('Loading your prices…') : tl('Not enough price history'), state.hist === 'pending' ? (state.progress || tl('The outlook needs 12 months of prices for every position.')) : tl('The outlook needs 12 months of prices for every position and for the S&P 500.')); return; }
  const bench = M.D.benches.find((b) => b.id === 'SPX') || M.D.benches[0];
  const bName = BSHORT[bench.id] || bench.name;
  const n = state.hz, yrs = n / 12, hzL = tl(HORIZONS.find((x) => x[0] === n)[2]);
  const sigma = R.vol, bVol = R.bVol[bench.id], beta = R.pBeta[bench.id], rho = R.pCorr[bench.id];
  const ix = M.D.indices.find((x) => x.id === bench.id) || {};
  const bMu = ix.cagr != null ? ix.cagr : REF_MU; // the benchmark's own historical annual growth
  const noCover = O.exp == null, expAnn = noCover ? bMu : O.exp; // no analyst targets for any holding: assume the benchmark's own pace
  const mP = Math.log(1 + expAnn) - sigma * sigma / 2, mB = Math.log(1 + bMu) - bVol * bVol / 2;
  const exp = (1 + expAnn) ** yrs - 1, bExp = (1 + bMu) ** yrs - 1;
  const q = (z) => Math.exp(mP * yrs + z * sigma * Math.sqrt(yrs)) - 1;
  const sd = Math.sqrt(Math.max(1e-9, sigma * sigma + bVol * bVol - 2 * rho * sigma * bVol) * yrs);
  const pBeat = normCdf(((mP - mB) * yrs) / sd);
  // the moment shown on the chart: the pointer or the arrow keys move it; it starts at the end of the horizon
  if (state.fkHz !== n) { state.fk = n; state.fkHz = n; }
  const k0 = Math.max(0, Math.min(n, state.fk == null ? n : state.fk));
  const FP = fanPoints(V, expAnn, sigma, n), RP = fanPoints(V, bMu, bVol, n);
  const d0 = new Date(M.asOf);
  const when = (k) => (k === 0 ? tl('Today') : new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, d0.getUTCDate())).toLocaleDateString(LOC(), { month: 'short', year: 'numeric', timeZone: 'UTC' }));
  const readout = (k) => {
    state.fk = k;
    const qq = FP[k], rm = RP[k][MEDIAN];
    const r = $('#fan-read'); if (r) r.innerHTML = `<span class="fr-when">${when(k)}${k ? ` · ${tl(k > 1 ? '{n} months' : '{n} month', { n: k })}` : ''}</span>` +
      `<span class="fr"><i class="fsw bm"></i>${tl('{b} median', { b: esc(bName) })} <b>${fmtEUR0(rm)}</b></span>` +
      [['5%', qq[0], 'b95'], ['25%', qq[1], 'b75'], [tl('Median'), qq[2], 'med'], ['75%', qq[3], 'b75'], ['95%', qq[4], 'b95']].map(([l, x, c]) => `<span class="fr"><i class="fsw ${c}"></i>${l} <b>${fmtEUR0(x)}</b></span>`).join('');
  };
  root.innerHTML = `
  <div class="bar2"><div><h2>${tl('Outlook')}</h2><p class="lead">${tl(n === 12 ? 'Where {f} could be a year from now' : 'Where {f} could be in {h}', { f: FUND, h: hzL })}</p></div></div>
  <div class="ctrls" style="margin-bottom:14px">
    <div class="seg" role="group" aria-label="${tl('Horizon')}">${HORIZONS.map(([k, l]) => `<button data-hz="${k}" aria-pressed="${k === n}">${l}</button>`).join('')}</div>
    ${noCover ? '' : `<div class="seg" role="group" aria-label="${tl('Scenario odds')}">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}" aria-pressed="${k === state.preset}">${tl(v.label)}</button>`).join('')}</div>`}
  </div>
  <div class="kpis4 ok4">
    ${okTile(tl('Expected return'), fmtSignedPct(exp, 0), cls(exp), bExp > 0 && exp > 0 ? tl('{x}× the {b}', { x: fmtNum(exp / bExp, 1), b: esc(bName) }) : tl('{p} against the {b}', { p: ptsTxt(exp - bExp, 0), b: esc(bName) }),
      duoBars([[FUND, exp, 'var(--fund)'], [bName, bExp, 'var(--spx)']], (x) => fmtSignedPct(x, 0)), tl('Over {h}', { h: hzL }))}
    ${okTile(tl('Likely range'), tl('{a} to {b}', { a: fmtSignedPct(q(-Z75), 0), b: fmtSignedPct(q(Z75), 0) }), '', tl('Half of outcomes land here'),
      rangeStrip(q), tl('9 in 10: {a} to {b}', { a: fmtSignedPct(q(-Z95), 0), b: fmtSignedPct(q(Z95), 0) }))}
    ${okTile(tl('Chance of beating the {b}', { b: esc(bName) }), Math.round(pBeat * 100) + '%', pBeat >= 0.5 ? 'pos' : 'neg', tl('About {n} in 10', { n: Math.round(pBeat * 10) }),
      `<span class="meter" role="img" aria-label="${Math.round(pBeat * 100)}%"><i style="width:${(pBeat * 100).toFixed(1)}%"></i><em></em></span>`, tl('Over {h} · Correlation {c}', { h: hzL, c: fmtNum(rho, 2) }))}
    ${okTile(tl('Risk'), pctTxt(sigma, 0), '', tl('{x}× as volatile as the {b}', { x: fmtNum(sigma / bVol, 1), b: esc(bName) }),
      duoBars([[FUND, sigma, 'var(--fund)'], [bName, bVol, 'var(--spx)']], (x) => pctTxt(x, 0)), tl('Annual volatility · Beta {b}', { b: fmtNum(beta, 2) }))}
  </div>
  <div class="panel" style="margin-top:16px">
    <h3>${tl('Range of outcomes, next {h}', { h: hzL })}</h3>
    <div class="chips assume"><span class="chip">${tl('Starts at {v}', { v: fmtEUR0(V) })}</span><span class="chip">${tl('Expected {x} a year', { x: fmtSignedPct(expAnn, 0) })}</span><span class="chip">${tl('Volatility {x} a year', { x: pctTxt(sigma, 0) })}</span>${noCover ? `<span class="chip warn">${tl('No analyst targets: S&P 500 pace assumed')}</span>` : `<span class="chip">${tl('Bull / base / bear odds {o}', { o: pr.map((x) => Math.round(x * 100)).join(' / ') })}</span>${O.cover < 0.995 ? `<span class="chip warn">${tl('Targets cover {n} of {m} positions', { n: O.nCov, m: M.H.length })}</span>` : ''}`}<span class="chip"><i class="fsw bm"></i>${tl('{b} at {x} a year since {y}', { b: esc(bName), x: fmtSignedPct(bMu, 1), y: esc(String(ix.cagrFrom || '').slice(0, 4)) })}</span></div>
    <div id="fan-read" class="fread"></div>
    <div id="fan" class="chart"></div>
  </div>`;
  $$('#t-risk [data-pre]').forEach((b) => b.addEventListener('click', () => { state.preset = b.dataset.pre; renderRisk(); }));
  $$('#t-risk [data-hz]').forEach((b) => b.addEventListener('click', () => { state.hz = +b.dataset.hz; renderRisk(); }));
  readout(k0);
  const fo = { V0: V, mu: expAnn, sigma, months: n, t0: M.asOf, color: 'var(--fund)', ref: { mu: bMu, sigma: bVol, label: bName, color: IDX_COLOR[bench.id] }, aria: tl('Range of outcomes, next {h}', { h: hzL }) };
  mount($('#fan'), (host, w) => fanChart(host, w, Object.assign({ height: w < 520 ? 260 : 340, k: state.fk, onSelect: readout }, fo)));
}

/* =====================================================================
   OPPORTUNITIES: stocks not yet owned. Built into the page, and replaced by the database document
   opportunities/current when the weekly screen has written a newer one.
   ===================================================================== */
function ideasData() {
  const db = state.dbReady ? state.opportunities : null, base = M.D.opportunities;
  const ok = (o) => o && Array.isArray(o.ideas) && o.ideas.length;
  return ok(db) && (!ok(base) || String(db.asOf || '') >= String(base.asOf || '')) ? db : ok(base) ? base : null;
}
// orders are offered only where the page carries the order ticket (the personal edition) and the connector answers
const canTrade = () => state.canLive && typeof openTrade === 'function';
const noCons = (x) => String(x || '').split(/;\s*/).filter((c) => !/consensus|price target|analyst target|upside/i.test(c)).join('; ');
const peBand = (x) => (x == null ? '' : x < 15 ? 'good' : x <= 30 ? 'ok' : 'hi');
const pegBand = (x) => (x == null ? '' : x < 1 ? 'good' : x <= 2 ? 'ok' : 'hi');
const mult = (x, d) => (x == null ? tl('N/A') : fmtNum(+x, d));
const capFirst = (s) => String(s || '').replace(/^\s*([a-z])/, (m, c) => m.replace(c, c.toUpperCase()));
function renderIdeas() {
  const root = $('#t-ideas'); if (!root) return;
  const O = ideasData();
  if (!O) { root.innerHTML = `<p class="empty">${tl('No opportunities researched yet.')}</p>`; return; }
  const field = (k, v) => (v ? `<div class="if"><span class="k">${k}</span><p>${esc(capFirst(v))}</p></div>` : '');
  const rest = Array.isArray(O.shortlist) ? O.shortlist.slice(0, 15) : [];
  const buy = (x) => (canTrade() && x.isin ? `<button class="btn buy sm" data-trade="buy" data-isin="${esc(x.isin)}" data-name="${esc(x.name)}">${tl('Buy')}</button>` : '');
  root.innerHTML = `
  <div class="bar2"><div><h2>${tl('Opportunities')}</h2><div class="chips"><span class="chip">${tl('Top 5 of {n} screened', { n: 5 + rest.length })}</span><span class="chip">${tl('Researched {d}', { d: esc(dfmt(String(O.asOf).slice(0, 10))) })}</span><span class="chip">${tl('New screen every Monday')}</span></div></div>
    <div class="chips"><span class="chip"><i class="mb good"></i>${tl('Cheap')}</span><span class="chip"><i class="mb ok"></i>${tl('Fair')}</span><span class="chip"><i class="mb hi"></i>${tl('Demanding')}</span></div></div>
  <div class="ideas">${O.ideas.slice(0, 5).map((x, i) => `
    <article class="idea panel">
      <div class="ih"><span class="rk">${i + 1}</span>${logoTag(x.isin, x.name, x.logo, 36)}<div><h3>${esc(x.name)} <small>${esc(x.ticker || '')}</small></h3><p class="ol">${esc(capFirst(x.oneLiner || ''))}</p></div>${x.edge ? `<span class="edge-t">${tl(x.edge)}</span>` : ''}</div>
      <div class="mx"><div class="m ${peBand(x.fwdPE)}"><span class="k">${tl('Forward P/E')}</span><b>${mult(x.fwdPE, 1)}</b><small>${tl("Price ÷ next year's earnings")}</small></div><div class="m ${pegBand(x.peg)}"><span class="k">PEG</span><b>${mult(x.peg, 2)}</b><small>${tl('P/E ÷ earnings growth · Under 1 is cheap')}</small></div>${buy(x)}</div>
      ${finLine(x.isin)}
      ${Array.isArray(x.why) && x.why.length ? `<ul class="why">${x.why.map(noCons).filter(Boolean).slice(0, 3).map((w) => `<li>${esc(capFirst(w))}</li>`).join('')}</ul>` : ''}
      ${x.catalyst ? `<div class="cat"><span class="k">${tl('Catalyst')}</span><p>${esc(capFirst(x.catalyst))}</p></div>` : ''}
      ${x.risks || x.kill ? `<details class="fold"><summary>${tl('Risks and kill-switch')}</summary><div class="ifs">${field(tl('Risks'), x.risks)}${field(tl('Kill-switch'), x.kill)}</div></details>` : ''}
    </article>`).join('')}</div>
  ${rest.length ? `<div class="panel flat sl"><div class="sl-h"><span></span><span></span><span>${tl('Also screened this week')}</span><span></span><span>${tl('Fwd P/E')}</span><span>PEG</span><span></span></div>${rest.map((x, i) => `
    <div class="sl-row"><span class="sl-n">${i + 6}</span>${logoTag(x.isin, x.name, x.logo, 24)}<span class="sl-nm"><b>${esc(x.name)}</b> <small>${esc(x.ticker || '')}</small></span><span class="sl-r">${esc(capFirst(noCons(x.reason)))}</span><span class="sl-m ${peBand(x.fwdPE)}">${mult(x.fwdPE, 1)}</span><span class="sl-m ${pegBand(x.peg)}">${mult(x.peg, 2)}</span><span>${buy(x)}</span></div>`).join('')}</div>` : ''}`;
}

function renderNotes() { $('#notes').innerHTML = ''; }
