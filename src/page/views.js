/* ===== page part 2: the three tabs ===== */
const benchOf = () => M.D.benches.find((b) => b.id === state.bench) || M.D.benches[0];
const holdingBy = (isin) => M.H.find((h) => h.isin === isin);
const perfOf = (h, p) => (h.perf && h.perf[p] ? h.perf[p][0] : null);
const pctSpan = (x, d = 1) => `<span class="${cls(x)} num">${fmtSignedPct(x, d)}</span>`;
const eur0Span = (x) => `<span class="${cls(x)} num">${x > 0 ? '+' : ''}${fmtEUR0(x)}</span>`;
const BSHORT = { SPX: 'S&P 500' };
const prOf = () => PRESETS[state.preset].p;
const pts = (x, d = 1) => (x == null ? '–' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(d)} pts`);

function portOutlook(pr) {
  const rows = M.H.map((h) => ({ h, w: h.value / M.secValue, sc: h.sc, e: expOf(h.sc, pr) }));
  const cov = rows.filter((r) => r.sc);
  const agg = (f) => C_sum(cov.map((r) => r.w * f(r)));
  const cover = C_sum(cov.map((r) => r.w)), k = cover > 0 ? 1 / cover : 0; // the average is taken over the positions analysts cover
  return { rows, cover, nCov: cov.length, exp: cover > 0 ? agg((r) => r.e) * k : null, base: agg((r) => r.sc.base) * k, bull: agg((r) => r.sc.bull) * k, bear: agg((r) => r.sc.bear) * k };
}

/* ---------- masthead and tabs ---------- */
function renderHeader() {
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
  $('#mh-sub').innerHTML = pill('Today', `${day >= 0 ? '+' : '−'}${fmtEUR0(Math.abs(day))}`, fmtSignedPct(dayPct, 1), cls(day))
    + (M.unreal != null ? pill('Total return', `${M.unreal >= 0 ? '+' : '−'}${fmtEUR0(Math.abs(M.unreal))}`, costAll ? fmtSignedPct(M.unreal / costAll, 1) : '', cls(M.unreal)) : '')
    + pill('Positions', String(M.H.length), D.cash != null ? `${fmtEUR0(D.cash)} cash` : '');
  const st = $('#status'); st.dataset.mode = state.mode;
  const txt = { snapshot: `Prices at ${tfmt(D.meta.asOf)}`, loading: 'Syncing with Scalable…', live: `Synced ${tfmt(D.meta.asOf)}`, error: `Prices at ${tfmt(D.meta.asOf)}` }[state.mode];
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
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label]) => `<button role="tab" id="tab-${id}" aria-controls="t-${id}" aria-selected="${id === state.tab}" tabindex="${id === state.tab ? 0 : -1}" data-tab="${id}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${TAB_ICON[id] || ''}</svg><span>${label}</span></button>`).join('');
  TABS.forEach(([id]) => { $('#t-' + id).hidden = id !== state.tab; });
  $$('#tabs [data-tab]').forEach((b) => {
    b.addEventListener('click', () => setTab(b.dataset.tab, true));
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = TABS.findIndex((t) => t[0] === state.tab), n = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length][0];
      setTab(n, true); $('#tab-' + n).focus();
    });
  });
}
function setTab(id, push) {
  if (!TABS.some((t) => t[0] === id)) return;
  state.tab = id; renderTabs(); hideTip();
  if (push) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* hash is a convenience */ } window.scrollTo({ top: 0, behavior: 'auto' }); }
}

/* =====================================================================
   TRACK RECORD
   ===================================================================== */
const IDX_COLOR = { SPX: 'var(--spx)' };
const FUND = (DATA.profile && DATA.profile.fund) || 'Freedom Fund';
const idxName = (id) => (M.D.indices.find((x) => x.id === id) || { name: id }).name;
const kpi = (k, v, c, n) => `<div class="kpi"><div class="k">${k}</div><div class="v ${c || ''}">${v}</div><div class="n">${n || ''}</div></div>`;
const vsIdx = (you, idx, name) => { const e = you - idx; return `${esc(name)} ${fmtSignedPct(idx, 1)} · <b class="${cls(e)}">${e >= 0 ? '+' : '−'}${Math.abs(e * 100).toFixed(1)} pts</b>`; };

function placeholder(root, title, text) { root.innerHTML = `<div class="panel empty"><h3>${esc(title)}</h3><p class="sub">${esc(text)}</p></div>`; }
function renderRecord() {
  const root = $('#t-record'); unmountWithin(root);
  const D = M.D, PF = M.perf;
  if (!PF) { placeholder(root, state.hist === 'pending' ? 'Rebuilding your performance history…' : 'No performance history yet', state.hist === 'pending' ? (state.progress || 'Reading your transactions and prices from Scalable Capital.') : 'Performance needs your trades and a benchmark price series, and they could not be read.'); return; }
  const sel = ['SPX'], gsel = sel; // the S&P 500 is the only benchmark
  const primary = sel[0], pName = idxName(primary); // statements always refer to the S&P 500
  const all = TF.map(([k]) => PF.stats(k));
  const g = (k) => all.find((s) => s.k === k);
  const si = g('SI'), young = PF.asOf - PF.first < 366 * 864e5; // a history shorter than a year: the 12-month figures are since the start
  const y1 = young ? si : g('1Y'), ytd = g('YTD');
  const vis0 = TF.filter(([k]) => (k !== 'Y2024' || PF.first < Date.UTC(2024, 11, 31)) && (k !== 'Y2025' || PF.first < Date.UTC(2025, 11, 31)) && (k !== '1Y' || !young));
  const vis = vis0;
  if (!vis.some((v) => v[0] === state.tf)) state.tf = 'SI';
  const st = PF.stats(state.tf);
  const twr = state.measure === 'twr';
  const closedStocks = D.ledger.realised.filter((r) => (r.type === 'Shares' || r.type === 'ETFs & ETCs') && r.last), wins = closedStocks.filter((r) => r.pl > 0).length;

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Performance · stocks and ETFs</p><h2>${FUND} is ${y1.twr >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(y1.twr), 1)} ${young ? 'since I started' : 'over the last 12 months'}, ${Math.abs((y1.twr - y1.idx[primary].twr) * 100).toFixed(1)} points ${y1.twr >= y1.idx[primary].twr ? 'ahead of' : 'behind'} ${esc(pName)}</h2></div></div>
  <div class="kpis4">
    ${kpi(young ? 'Since I started' : 'Last 12 months', fmtSignedPct(y1.twr, 1), cls(y1.twr), vsIdx(y1.twr, y1.idx[primary].twr, pName))}
    ${kpi('This year', fmtSignedPct(ytd.twr, 1), cls(ytd.twr), vsIdx(ytd.twr, ytd.idx[primary].twr, pName))}
    ${kpi('Every euro since I started', fmtSignedPct(si.mwr, 1) + '<small> a year</small>', cls(si.mwr), `${esc(pName)}: ${fmtSignedPct(si.idx[primary].mwr, 1)} a year`)}
    ${kpi('Winning calls', `${wins}<small> of ${closedStocks.length}</small>`, '', `closed positions sold at a profit`)}
  </div>

  <div class="panel" style="margin-top:14px">
    <div class="ctrls">
      <div class="seg" role="group" aria-label="Period">${vis.map(([k, l]) => `<button data-tf="${k}" aria-pressed="${k === state.tf}">${k === 'Y2025' || k === 'Y2024' ? l : k === 'SI' ? 'Max' : k}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Measure"><button data-ms="twr" aria-pressed="${twr}" title="Time-weighted: the return on the picks, however much money was in">Return on picks</button><button data-ms="mwr" aria-pressed="${!twr}" title="Money-weighted: what the actual money is worth, against the same money in the S&amp;P 500">Return on my money</button></div>
    </div>
    <div class="headline"><span class="big2 ${cls(twr ? st.twr : st.gain)}">${twr ? fmtSignedPct(st.twr, 1) : fmtSignedEUR(st.gain)}</span><span class="muted">${twr ? 'time-weighted' : `money-weighted ${st.years > 1.05 ? fmtSignedPct(st.mwr, 1) + ' a year' : fmtSignedPct(st.mwrPeriod, 1)}`} · ${state.tf === 'SI' ? 'Max, since I started' : esc(TFL[state.tf])}</span>
      <span class="idxv"><i class="sw line" style="background:var(--fund)"></i>${FUND}</span>${sel.map((id) => `<span class="idxv"><i class="sw line" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))} ${twr ? fmtSignedPct(st.idx[id].twr, 1) : fmtSignedEUR(st.idx[id].value - st.b.v + st.gain)}</span>`).join('')}</div>
    <div id="perfchart" class="chart"></div>
    <div class="row-between" style="margin-top:6px"><span class="legend">${PF.approxBefore && st.a.t < PF.approxBefore ? `<span><i class="sw line dash" style="color:var(--fund)"></i>Estimated from month-end prices, before ${esc(dfmt(isoDay(PF.approxBefore), { day: undefined }))}</span>` : ''}</span><button class="tablink" id="tv-perf">${state.tableView.perf ? 'Show chart' : 'View as table'}</button></div>
  </div>

  <div class="panel" style="margin-top:14px">
    <h3>Every period at a glance</h3>
    <div class="pbars" style="--ni:${gsel.length}">
      <div class="pb pb-h"><span class="pl"></span><span class="pt"></span><span class="pv">${FUND}</span>${gsel.map((id) => `<span class="pi">${esc(BSHORT[id] || idxName(id))}</span>`).join('')}</div>
      ${all.filter((s) => vis.some((v) => v[0] === s.k)).map((s) => { const shown = all.filter((q) => vis.some((v) => v[0] === q.k)); const mx = Math.max(...shown.map((q) => Math.max(Math.abs(q.twr), ...gsel.map((id) => Math.abs(q.idx[id].twr))))) || 1; const bar = (x) => { const w = (Math.abs(x) / mx) * 50; return x < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`; };
      return `<button class="pb${s.k === state.tf ? ' on' : ''}" data-tf="${s.k}"><span class="pl">${esc(TFL[s.k])}</span>
        <span class="pt" style="height:${10 + gsel.length * 7}px"><i class="z"></i><i class="b you" style="top:0;${bar(s.twr)}"></i>${gsel.map((id, j) => `<i class="b idx" style="top:${10 + j * 7}px;background:${IDX_COLOR[id]};${bar(s.idx[id].twr)}"></i>`).join('')}</span>
        <span class="pv ${cls(s.twr)}">${fmtSignedPct(s.twr, 1)}</span>${gsel.map((id) => { const e = s.twr - s.idx[id].twr; return `<span class="pi">${fmtSignedPct(s.idx[id].twr, 1)}<small class="${cls(e)}">${e >= 0 ? '+' : '−'}${Math.abs(e * 100).toFixed(1)} pts</small></span>`; }).join('')}</button>`; }).join('')}</div>
    <div class="legend" style="margin:10px 0 0"><span><i class="sw" style="background:var(--fund)"></i>${FUND}</span>${gsel.map((id) => `<span><i class="sw" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))}</span>`).join('')}<span><b class="pos">+</b>/<b class="neg">−</b> points ahead of or behind the S&amp;P 500</span></div>
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
      .concat(sel.map((id) => ({ v: xs.map((t) => (PF.P[id](t) / PF.P[id](a.t) - 1) * 100), color: IDX_COLOR[id], width: 1.5, label: idxName(id) })));
    yFmt = (v) => Math.round(v) + '%'; tipVal = (v) => fmtSignedPct(v / 100, 1);
  } else {
    let k = 0; const unitsCum = Object.fromEntries(sel.map((id) => [id, a.v / PF.P[id](a.t)]));
    const idxV = Object.fromEntries(sel.map((id) => [id, []])), money = [];
    let m = a.v;
    xs.forEach((t) => { while (k < fl.length && fl[k][0] <= t) { sel.forEach((id) => { unitsCum[id] += fl[k][1] / PF.P[id](fl[k][0]); }); m += fl[k][1]; k++; } sel.forEach((id) => idxV[id].push(unitsCum[id] * PF.P[id](t))); money.push(m); });
    series = [{ v: pp.map((p) => p.v), color: 'var(--fund)', width: 2.25, label: FUND, approx: true }]
      .concat(sel.map((id) => ({ v: idxV[id], color: IDX_COLOR[id], width: 1.5, label: 'Same money in ' + idxName(id) })))
      .concat([{ v: money, color: 'var(--ink3)', width: 1.25, dash: '4 4', label: 'Money in' }]);
    yFmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v))); tipVal = (v) => fmtEUR0(v);
  }
  mount($('#perfchart'), (h, w) => {
    if (state.tableView.perf) { h.innerHTML = tableTwin(['Date'].concat(series.map((s) => s.label)), xs.map((t, i) => [dfmt(isoDay(t))].concat(series.map((s) => (s.v[i] == null ? '–' : tipVal(s.v[i])))))); return; }
    lineChart(h, w, {
      x: xs, series, approxBefore: PF.approxBefore, height: w < 520 ? 280 : 380, yFmt, zero: twr ? 0 : null, yMin: twr ? null : 0, aria: FUND + ' against the S&P 500',
      tip: (i) => `<div class="th">${dfmt(isoDay(xs[i]))}</div>${series.map((s) => (s.v[i] == null ? '' : trow(s.color, s.label, tipVal(s.v[i]), 1))).join('')}`,
    });
  });
}

/* =====================================================================
   BOOK AND CONVICTION
   ===================================================================== */
const newsDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? dfmt(d, { year: undefined }) : /^\d{4}-\d{2}$/.test(d) ? dfmt(d + '-15', { day: undefined }) : String(d || ''));
function liveResearch(h) {
  if (!state.dbReady) return null;
  const c = state.commentary[h.isin];
  if (!c) return null;
  const age = (Date.now() - Date.parse(c.updatedAt)) / 864e5;
  const items = (Array.isArray(c.items) ? c.items : []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 4);
  return `<span class="chip sm${age > 2 ? ' warn' : ''}">Updated ${esc(dfmt(String(c.updatedAt).slice(0, 10), { year: undefined }))}</span>${c.headline ? `<p><b>${esc(c.headline)}</b></p>` : ''}<ul class="news">${items.map((n) => { const u = safeUrl(n.url); return `<li><time>${esc(newsDate(n.date))}</time><span>${esc(n.text)}${n.source ? ` <span class="muted">(${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n.source)}</a>` : esc(n.source)})</span>` : ''}</span></li>`; }).join('')}</ul>
    ${Array.isArray(c.watch) && c.watch.length ? `<h4>Watch next</h4><ul class="watch">${c.watch.slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
`;
}

const BOOK_PERIODS = [['1D', '1 day'], ['1W', '1 week'], ['1M', '1 month'], ['3M', '3 months'], ['6M', '6 months'], ['YTD', 'Year to date'], ['1Y', '1 year']];
const ratingCls = (r) => (/sell|under/i.test(r) ? 'neg' : /buy|outperform|overweight/i.test(r) ? 'pos' : 'hold');
function renderBook() {
  const root = $('#t-book'); unmountWithin(root);
  const V = M.secValue;
  const pc = (h, k) => { const r = perfOf(h, k); return r == null ? '<span class="muted">–</span>' : pctSpan(r, 1); };
  const bp = BOOK_PERIODS.some((p) => p[0] === state.bp) ? state.bp : '1D';
  const ytd = C_sum(M.H.map((h) => { const r = perfOf(h, 'YTD'); return r == null ? 0 : h.value - h.value / (1 + r); }));
  if (state.open && !holdingBy(state.open)) state.open = null;

  const H2 = (t, sub) => `<span class="hh"><b>${t}</b><small>${sub}</small></span>`;
  const ex = M.D.excluded && M.D.excluded.n ? M.D.excluded : null;
  root.innerHTML = `
  <div class="bar2"><div><h2>Holdings</h2><div class="chips"><span class="chip">${M.H.length} positions</span><span class="chip">${ytd >= 0 ? '+' : '−'}${fmtEUR0(Math.abs(ytd))} this year</span>${ex ? `<span class="chip muted" title="Leveraged products and crypto are kept out of every figure">${ex.n} leveraged or crypto position${ex.n > 1 ? 's' : ''} left out</span>` : ''}</div></div>
    <div class="ctl"><span class="lbl">Price change</span><div class="seg" role="group" aria-label="Price change period">${BOOK_PERIODS.map(([k, l]) => `<button data-bp="${k}" aria-pressed="${k === bp}" title="${l}">${k}</button>`).join('')}</div></div></div>
  <div class="panel flat book">
    <div class="book-h"><span>${H2('Position', 'share of portfolio')}</span><span class="c-m">${H2('Consensus', '<i class="neg">sell</i> <i>hold</i> <i class="pos">buy</i>')}</span><span>${H2('Value', 'at last close')}</span><span>${H2(bp, 'price change')}</span><span>${H2('Total return (%)', 'since bought')}</span><span class="c-m">${H2('Total return (€)', 'since bought')}</span><span class="c-m">${H2('Bull case', 'top target')}</span><span class="c-m">${H2('Bear case', '12-month downside')}</span><span></span></div>
    ${M.H.map((h) => {
      const sc = h.sc, cons = h.research && h.research.cons, open = state.open === h.isin;
      const cnt = (x) => (typeof x === 'number' && x >= 0 ? x : null), votes = cons ? [cnt(cons.sell), cnt(cons.hold), cnt(cons.buy)] : [null, null, null];
      return `<div class="posn${open ? ' open' : ''}" data-i="${h.isin}">
        <button class="pos-row" aria-expanded="${open}" aria-controls="pd-${h.isin}">
          <span class="nm">${logoTag(h.isin, h.name, null, 28)}<span class="nt"><b>${esc(h.name)}</b><small>${esc(h.ticker || '')} · ${(h.weight * 100).toFixed(1)}%</small><i class="wb"><i style="width:${Math.min(100, h.weight * 400).toFixed(1)}%"></i></i></span></span>
          <span class="n c-m votes">${votes.every((v) => v != null) ? `<span role="img" aria-label="${votes[0]} sell, ${votes[1]} hold, ${votes[2]} buy"><b class="neg">${votes[0]}</b><b>${votes[1]}</b><b class="pos">${votes[2]}</b></span>` : '<span class="muted">–</span>'}</span>
          <span class="n"><b>${fmtEUR0(h.value)}</b></span>
          <span class="n">${pc(h, bp)}</span>
          <span class="n"><b>${h.pnl != null ? pctSpan(h.pnlPct, 1) : '–'}</b></span>
          <span class="n c-m"><b>${h.pnl != null ? eur0Span(h.pnl) : '–'}</b></span>
          ${sc ? `<span class="n c-m"><span class="tag ${sc.bull >= 0 ? 'pos' : 'neg'}">${fmtSignedPct(sc.bull, 0)}</span></span><span class="n c-m"><span class="tag ${sc.bear >= 0 ? 'pos' : 'neg'}">${fmtSignedPct(sc.bear, 0)}</span></span>` : '<span class="c-m c-na"><small class="muted">no coverage</small></span>'}
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
  const st = STANCE[String(j.stance || '').toLowerCase()], age = (Date.now() - Date.parse(j.updatedAt)) / 864e5;
  const sig = (Array.isArray(j.signals) ? j.signals : []).slice(0, 5).map((x) => { const u = safeUrl(x.url); return `<li>${esc(x.text)}${x.source ? ` <span class="muted">(${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.source)}</a>` : esc(x.source)})</span>` : ''}</li>`; }).join('');
  return `<div class="judge"><div class="jh"><span class="k">Current judgement</span>${st ? `<span class="rt ${st[1]}">${st[0]}</span>` : ''}<span class="chip sm${age > 2 ? ' warn' : ''}">Reassessed ${esc(dfmt(String(j.updatedAt).slice(0, 10), { year: undefined }))}</span></div>
    ${j.assessment ? `<p>${esc(j.assessment)}</p>` : ''}${sig ? `<ul class="watch">${sig}</ul>` : ''}
</div>`;
}
function positionDetail(h) {
  const cv = { ...(h.conviction || {}) }, jd = judgementOf(h);
  if (jd) { if (jd.thesis) cv.thesis = jd.thesis; if (jd.kill) cv.kill = jd.kill; }
  const rs = h.research, sc = h.sc, c = h.comment, cons = rs && rs.cons;
  const web = liveResearch(h);
  const news = web != null ? web : c ? `<ul class="news">${c.news.slice(0, 3).map((n) => `<li><time>${esc(newsDate(n[0]))}</time><span>${esc(n[1])}</span></li>`).join('')}</ul>` : '';
  const srcs = (c ? c.sources : []).concat(cons ? [cons.src] : []).map((x) => { const u = safeUrl(x.u); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.t)}</a>` : ''; }).join('');
  return `<div class="pd">
    <div class="pd-main">
      ${cv.thesis ? `<p class="pd-thesis">${esc(cv.thesis)}</p>` : c ? `<p class="pd-thesis">${esc(c.tagline)}</p>` : ''}
      ${cv.kill ? `<div class="kill"><span class="k">Kill-switch</span><p>${esc(cv.kill)}</p></div>` : ''}
      ${judgementBlock(jd)}
      ${sc ? `<div class="cases">
        <div class="case bull"><div class="ch"><span>Bull</span><b class="pos">${fmtSignedPct(sc.bull, 0)} · €${px(sc.tBull)}</b></div><p>${rs ? esc(rs.bull) : ''}</p></div>
        <div class="case bear"><div class="ch"><span>Bear</span><b class="neg">${fmtSignedPct(sc.bear, 0)} · €${px(sc.tBear)}</b></div><p>${rs ? esc(rs.bear) : ''}${sc.bearFromDD ? ' <span class="chip sm">set by the past year\'s worst fall</span>' : ''}</p></div>
      </div>` : ''}
      ${cons ? `<p class="cons">${esc(cons.rating)}${cons.analysts ? ` · ${cons.analysts} analysts` : ''} · average target €${px(sc.tBase)} ($${fmtNum(cons.avg, 2)}), ${fmtSignedPct(sc.base, 0)} from €${px(h.price)}</p>` : ''}
    </div>
    <div class="pd-side">
      ${rs ? `<h4>${esc(rs.industry)}</h4><p>${esc(rs.market)}</p><p>${esc(rs.position)}</p><h4>Competitors</h4><p>${rs.competitors.map(esc).join(' · ')}</p>` : ''}
      ${news ? `<h4>Latest</h4>${news}` : ''}
      ${h.scalable ? `<details class="fold"><summary>Scalable's news summary</summary><p>${esc(h.scalable.short)}</p></details>` : ''}
      ${srcs ? `<div class="srcs">${srcs}</div>` : ''}
    </div>
  </div>`;
}


function selectHolding(isin) {
  state.open = isin; setTab('book', true); renderBook();
  const el = $(`#t-book .posn[data-i="${isin}"]`); if (el) el.scrollIntoView({ block: 'start' });
}

/* =====================================================================
   RISK AND OUTLOOK
   ===================================================================== */
// Outlook summary tile: the figure, a one-line verdict, a small visual, then the detail
const okTile = (k, v, c, verdict, vis, foot) => `<div class="kpi ok"><div class="k">${k}</div><div class="v ${c || ''}">${v}</div><div class="vd">${verdict}</div>${vis}<div class="n">${foot}</div></div>`;
const duoBars = (rows, f) => { const mx = Math.max(...rows.map((r) => Math.abs(r[1]))) || 1; return `<div class="duo">${rows.map(([l, x, col]) => `<div class="dr"><span class="dl">${esc(l)}</span><span class="dt"><i style="width:${(Math.abs(x) / mx) * 100}%;background:${col}"></i></span><b class="${cls(x)}">${f(x)}</b></div>`).join('')}</div>`; };
// the 25% to 75% band (dark) and the 5% to 95% band (light) on a strip, the median marked
const rangeStrip = (q) => { const lo = q(-Z95), hi = q(Z95), X = (x) => ((x - lo) / (hi - lo)) * 100;
  return `<span class="strip" role="img" aria-label="25% to 75% ${fmtSignedPct(q(-Z75), 0)} to ${fmtSignedPct(q(Z75), 0)}; 5% to 95% ${fmtSignedPct(q(-Z95), 0)} to ${fmtSignedPct(q(Z95), 0)}"><i class="b2"></i><i class="b1" style="left:${X(q(-Z75))}%;width:${X(q(Z75)) - X(q(-Z75))}%"></i>${lo < 0 && hi > 0 ? `<i class="z" style="left:${X(0)}%"></i>` : ''}<i class="md" style="left:${X(q(0))}%"></i></span>`; };
const HORIZONS = [[3, '3M', '3 months'], [6, '6M', '6 months'], [12, '1Y', '1 year'], [24, '2Y', '2 years'], [36, '3Y', '3 years']];
// standard normal distribution function (Abramowitz and Stegun 7.1.26)
function normCdf(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const e = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + e) / 2 : (1 - e) / 2;
}
function renderRisk() {
  const root = $('#t-risk'); unmountWithin(root);
  const R = M.risk, pr = prOf(), O = portOutlook(pr), V = M.secValue;
  if (!M.H.length) { placeholder(root, 'Nothing to project yet', 'The outlook needs at least one stock or ETF position.'); return; }
  if (!R || !M.D.benches.length) { placeholder(root, state.hist === 'pending' ? 'Loading your prices…' : 'Not enough price history', state.hist === 'pending' ? (state.progress || 'The outlook needs 12 months of prices for every position.') : 'The outlook needs 12 months of prices for every position and for the S&P 500.'); return; }
  const bench = M.D.benches.find((b) => b.id === 'SPX') || M.D.benches[0];
  const bName = BSHORT[bench.id] || bench.name;
  const n = state.hz, t = n / 12, hzL = HORIZONS.find((x) => x[0] === n)[2];
  const sigma = R.vol, bVol = R.bVol[bench.id], beta = R.pBeta[bench.id], rho = R.pCorr[bench.id];
  const ix = M.D.indices.find((x) => x.id === bench.id) || {};
  const bMu = ix.cagr != null ? ix.cagr : REF_MU; // the benchmark's own historical annual growth
  const bMuTxt = ix.cagr != null ? `historical pace of ${fmtSignedPct(bMu, 1)} a year from ${dfmt(ix.cagrFrom + '-15', { day: undefined })} to ${dfmt(ix.cagrTo + '-15', { day: undefined })}${ix.cagrBasis ? ` (${esc(ix.cagrBasis)}, like the analyst price targets)` : ''}` : `an assumed ${fmtSignedPct(bMu, 0)} a year`;
  const noCover = O.exp == null, expAnn = noCover ? bMu : O.exp; // no analyst targets for any holding: assume the benchmark's own pace
  const mP = Math.log(1 + expAnn) - sigma * sigma / 2, mB = Math.log(1 + bMu) - bVol * bVol / 2;
  const exp = (1 + expAnn) ** t - 1, bExp = (1 + bMu) ** t - 1;
  const q = (z) => Math.exp(mP * t + z * sigma * Math.sqrt(t)) - 1;
  const sd = Math.sqrt(Math.max(1e-9, sigma * sigma + bVol * bVol - 2 * rho * sigma * bVol) * t);
  const pBeat = normCdf(((mP - mB) * t) / sd);
  // the moment shown on the chart: the pointer or the arrow keys move it; it starts at the end of the horizon
  if (state.fkHz !== n) { state.fk = n; state.fkHz = n; }
  const k0 = Math.max(0, Math.min(n, state.fk == null ? n : state.fk));
  const FP = fanPoints(V, expAnn, sigma, n), RP = fanPoints(V, bMu, bVol, n);
  const d0 = new Date(M.asOf);
  const when = (k) => k === 0 ? 'Today' : new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, d0.getUTCDate())).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const readout = (k) => {
    state.fk = k;
    const q = FP[k], rm = RP[k][MEDIAN];
    const r = $('#fan-read'); if (r) r.innerHTML = `<span class="fr-when">${when(k)}${k ? ` · ${k} month${k > 1 ? 's' : ''}` : ''}</span>` +
      `<span class="fr"><i class="fsw bm"></i>${esc(bName)} Median <b>${fmtEUR0(rm)}</b></span>` +
      [['5%', q[0], 'b95'], ['25%', q[1], 'b75'], ['Median', q[2], 'med'], ['75%', q[3], 'b75'], ['95%', q[4], 'b95']].map(([l, x, c]) => `<span class="fr"><i class="fsw ${c}"></i>${l} <b>${fmtEUR0(x)}</b></span>`).join('');
  };
  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Outlook</p><h2>Where ${/^My /.test(FUND) ? FUND.toLowerCase() : 'the ' + FUND} could be ${n === 12 ? 'a year' : 'in ' + hzL} from now</h2></div></div>
  <div class="ctrls" style="margin-bottom:12px">
    <div class="seg" role="group" aria-label="Horizon">${HORIZONS.map(([k, l]) => `<button data-hz="${k}" aria-pressed="${k === n}">${l}</button>`).join('')}</div>
    ${noCover ? '' : `<div class="seg" role="group" aria-label="Scenario odds">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}" aria-pressed="${k === state.preset}">${v.label}</button>`).join('')}</div>`}
  </div>
  <div class="kpis4 ok4">
    ${okTile('Expected return', fmtSignedPct(exp, 0), cls(exp), bExp > 0 && exp > 0 ? `${fmtNum(exp / bExp, 1)}× the ${esc(bName)}` : `${pts(exp - bExp, 0)} vs the ${esc(bName)}`,
      duoBars([[FUND, exp, 'var(--fund)'], [bName, bExp, 'var(--spx)']], (x) => fmtSignedPct(x, 0)), `over ${hzL}`)}
    ${okTile('Likely range', `${fmtSignedPct(q(-Z75), 0)} to ${fmtSignedPct(q(Z75), 0)}`, '', 'half of outcomes land here',
      rangeStrip(q), `9 in 10: ${fmtSignedPct(q(-Z95), 0)} to ${fmtSignedPct(q(Z95), 0)}`)}
    ${okTile('Chance of beating the ' + esc(bName), Math.round(pBeat * 100) + '%', pBeat >= 0.5 ? 'pos' : 'neg', `about ${Math.round(pBeat * 10)} in 10`,
      `<span class="meter" role="img" aria-label="${Math.round(pBeat * 100)}%"><i style="width:${(pBeat * 100).toFixed(1)}%"></i><em></em></span>`, `over ${hzL}; correlation ${fmtNum(rho, 2)}`)}
    ${okTile('Risk', (sigma * 100).toFixed(0) + '%', '', `${fmtNum(sigma / bVol, 1)}× as volatile as the ${esc(bName)}`,
      duoBars([[FUND, sigma, 'var(--fund)'], [bName, bVol, 'var(--spx)']], (x) => (x * 100).toFixed(0) + '%'), `annual volatility; beta ${fmtNum(beta, 2)}`)}
  </div>
  <div class="panel" style="margin-top:14px">
    <h3>Range of outcomes, next ${hzL}</h3>
    <div class="chips assume"><span class="chip">Starts at ${fmtEUR0(V)}</span><span class="chip">Expected ${fmtSignedPct(expAnn, 0)} a year</span><span class="chip">Volatility ${(sigma * 100).toFixed(0)}% a year</span>${noCover ? '<span class="chip warn">No analyst targets: S&amp;P 500 pace assumed</span>' : `<span class="chip">Bull / base / bear odds ${pr.map((x) => Math.round(x * 100)).join(' / ')}</span>${O.cover < 0.995 ? `<span class="chip warn">Targets cover ${O.nCov} of ${M.H.length} positions</span>` : ''}`}<span class="chip"><i class="fsw bm"></i>${esc(bName)} at ${fmtSignedPct(bMu, 1)} a year since ${esc(String(ix.cagrFrom || '').slice(0, 4))}</span></div>
    <div id="fan-read" class="fread"></div>
    <div id="fan" class="chart"></div>

  </div>`;
  $$('#t-risk [data-pre]').forEach((b) => b.addEventListener('click', () => { state.preset = b.dataset.pre; renderRisk(); }));
  $$('#t-risk [data-hz]').forEach((b) => b.addEventListener('click', () => { state.hz = +b.dataset.hz; renderRisk(); }));
  readout(k0);
  const fo = { V0: V, mu: expAnn, sigma, months: n, t0: M.asOf, color: 'var(--fund)', ref: { mu: bMu, sigma: bVol, label: bName, color: IDX_COLOR[bench.id] }, aria: `Range of outcomes over ${hzL}` };
  mount($('#fan'), (host, w) => fanChart(host, w, Object.assign({ height: w < 520 ? 260 : 340, k: state.fk, onSelect: readout }, fo)));
}

/* ---------- notes ---------- */
/* =====================================================================
   OPPORTUNITIES: five stocks not yet owned that fit the mandate. Built into the page, and replaced by
   the database document opportunities/current when the research routine has written a newer one.
   ===================================================================== */
function ideasData() {
  const db = state.dbReady ? state.opportunities : null, base = M.D.opportunities;
  const ok = (o) => o && Array.isArray(o.ideas) && o.ideas.length;
  return ok(db) && (!ok(base) || String(db.asOf || '') >= String(base.asOf || '')) ? db : ok(base) ? base : null;
}
const EDGE_CLS = { Patience: 'e-pat', Informational: 'e-inf', Catalyst: 'e-cat' };
function renderIdeas() {
  const root = $('#t-ideas'); if (!root) return;
  const O = ideasData();
  if (!O) { root.innerHTML = '<p class="empty">No opportunities researched yet.</p>'; return; }
  const field = (k, v) => (v ? `<div class="if"><span class="k">${k}</span><p>${esc(v)}</p></div>` : '');
  const rest = Array.isArray(O.shortlist) ? O.shortlist.slice(0, 15) : [];
  root.innerHTML = `
  <div class="bar2"><div><h2>Opportunities</h2><div class="chips"><span class="chip">Top 5 of ${5 + rest.length} screened</span><span class="chip">Researched ${esc(dfmt(String(O.asOf).slice(0, 10)))}</span><span class="chip">New screen every Monday</span><span class="chip muted">Research, not advice</span></div></div></div>
  <div class="ideas">${O.ideas.slice(0, 5).map((x, i) => `
    <article class="idea panel">
      <div class="ih"><span class="rk">${i + 1}</span>${logoTag(x.isin, x.name, x.logo, 34)}<div><h3>${esc(x.name)} <small>${esc(x.ticker || '')}${x.exchange ? ' · ' + esc(x.exchange) : ''}</small></h3><p class="ol">${esc(x.oneLiner || '')}</p></div>${x.edge ? `<span class="edge-t">${esc(x.edge)}</span>` : ''}</div>
      ${x.upside ? `<p class="up">${esc(x.upside)}</p>` : ''}
      ${Array.isArray(x.why) && x.why.length ? `<ul class="why">${x.why.slice(0, 4).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      <div class="ifs">${field('Catalyst', x.catalyst)}${field('Valuation', x.valuation)}${field('Risks', x.risks)}${field('Kill-switch', x.kill)}${field('Why this one', x.fit)}</div>
      ${Array.isArray(x.sources) && x.sources.length ? `<div class="srcs">${x.sources.slice(0, 5).map((s) => { const u = safeUrl(s.u); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(s.t || 'Source')}</a>` : ''; }).join('')}</div>` : ''}
    </article>`).join('')}</div>
  ${rest.length ? `<div class="panel flat sl"><div class="ph"><h3>Also on this week's shortlist</h3></div>${rest.map((x, i) => `
    <div class="sl-row"><span class="sl-n">${i + 6}</span>${logoTag(x.isin, x.name, x.logo, 22)}<span class="sl-nm"><b>${esc(x.name)}</b> <small>${esc(x.ticker || '')}</small></span><span class="sl-r">${esc(x.reason || '')}</span><span class="sl-u">${esc(x.upside || '')}</span></div>`).join('')}</div>` : ''}`;
}

function renderNotes() { $('#notes').innerHTML = ''; }
