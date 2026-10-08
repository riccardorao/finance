/* ===== page part 2: the three tabs ===== */
const benchOf = () => M.D.benches.find((b) => b.id === state.bench) || M.D.benches[0];
const holdingBy = (isin) => M.H.find((h) => h.isin === isin);
const perfOf = (h, p) => (h.perf && h.perf[p] ? h.perf[p][0] : null);
const pctSpan = (x, d = 1) => `<span class="${cls(x)} num">${fmtSignedPct(x, d)}</span>`;
const eur0Span = (x) => `<span class="${cls(x)} num">${x > 0 ? '+' : ''}${fmtEUR0(x)}</span>`;
const BSHORT = { MSCI: 'MSCI World', SPX: 'S&P 500', NDX: 'Nasdaq-100' };
const prOf = () => PRESETS[state.preset].p;
const pts = (x, d = 1) => (x == null ? '–' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(d)} pts`);

function portOutlook(pr) {
  const rows = M.H.map((h) => ({ h, w: h.value / M.secValue, sc: h.sc, e: expOf(h.sc, pr) }));
  const cov = rows.filter((r) => r.sc);
  const agg = (f) => C_sum(cov.map((r) => r.w * f(r)));
  return { rows, cover: C_sum(cov.map((r) => r.w)), exp: agg((r) => r.e), base: agg((r) => r.sc.base), bull: agg((r) => r.sc.bull), bear: agg((r) => r.sc.bear) };
}

/* ---------- masthead and tabs ---------- */
function renderHeader() {
  const D = M.D, pr = D.profile;
  if (PUB) return renderHeaderPublic();
  $('#mh-name').textContent = 'Equity Portfolio Dashboard';
  $('#mh-strategy').textContent = pr.manager;
  const day = C_sum(M.H.map((h) => { const r = perfOf(h, '1D'); return r == null ? 0 : h.value - h.value / (1 + r); }));
  const dayPct = day / (M.secValue - day);
  $('#mh-value').textContent = fmtEUR0(M.secValue);
  $('#mh-sub').innerHTML = `${M.H.length} positions · today <span class="${cls(day)}">${day >= 0 ? '+' : ''}${fmtEUR0(day)} (${fmtSignedPct(dayPct, 1)})</span>${M.unreal != null ? ` · unrealised <span class="${cls(M.unreal)}">${M.unreal >= 0 ? '+' : ''}${fmtEUR0(M.unreal)}</span>` : ''}`;
  const st = $('#status'); st.dataset.mode = state.mode;
  const txt = { snapshot: `Snapshot ${tfmt(D.meta.asOf)}`, loading: 'Refreshing from Scalable…', live: `Live ${tfmt(D.meta.asOf)}`, error: `Snapshot ${tfmt(D.meta.asOf)}` }[state.mode];
  $('#status-text').textContent = txt + (state.statusMsg ? ' · ' + state.statusMsg : '');
  $('#btn-refresh').disabled = state.mode === 'loading';
  $('#btn-refresh').hidden = !state.canLive;
}
function renderHeaderPublic() {
  const D = M.D, y1 = M.perf.stats('1Y'), d = D.public.day, u = D.public.unreal;
  $('#mh-name').textContent = 'Equity Portfolio Dashboard';
  $('#mh-strategy').textContent = D.profile.manager;
  $('#mh-value').innerHTML = `<span class="${cls(y1.twr)}">${fmtSignedPct(y1.twr, 1)}</span><small class="aum-k">12 months</small>`;
  $('#mh-sub').innerHTML = `${D.public.n} positions · today <span class="${cls(d)}">${fmtSignedPct(d, 1)}</span>${u != null ? ` · unrealised <span class="${cls(u)}">${fmtSignedPct(u, 1)}</span>` : ''}`;
  $('#status').dataset.mode = 'snapshot';
  $('#status-text').textContent = `As of ${tfmt(D.meta.asOf)}`;
  $('#btn-refresh').hidden = true;
}
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(([id, label]) => `<button role="tab" id="tab-${id}" aria-controls="t-${id}" aria-selected="${id === state.tab}" tabindex="${id === state.tab ? 0 : -1}" data-tab="${id}">${label}</button>`).join('');
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
  try { localStorage.setItem('pm-tab', id); } catch (e) { /* storage is optional */ }
}

/* =====================================================================
   TRACK RECORD
   ===================================================================== */
const IDX_COLOR = { MSCI: 'var(--msci)', SPX: 'var(--spx)', NDX: 'var(--ndx)' };
const FUND = 'Freedom Fund';
const idxName = (id) => (M.D.indices.find((x) => x.id === id) || { name: id }).name;
const kpi = (k, v, c, n) => `<div class="kpi"><div class="k">${k}</div><div class="v ${c || ''}">${v}</div><div class="n">${n || ''}</div></div>`;
// money-weighted return over a window: a yearly rate beyond a year, the period's own rate within one
const pubMwr = (st, x) => (st.years > 1.05 ? x.mwr : periodFromAnnual(x.mwr, st.a.t, st.b.t));
const vsIdx = (you, idx, name) => { const e = you - idx; return `${esc(name)} ${fmtSignedPct(idx, 1)} · <b class="${cls(e)}">${e >= 0 ? '+' : '−'}${Math.abs(e * 100).toFixed(1)} pts</b>`; };

function renderRecord() {
  const root = $('#t-record'); unmountWithin(root);
  const D = M.D, PF = M.perf;
  const sel = ['SPX', 'NDX', 'MSCI'].filter((id) => D.indices.some((x) => x.id === id)), gsel = sel; // every benchmark is always shown
  const primary = sel[0], pName = idxName(primary); // statements always refer to the S&P 500
  const st = PF.stats(state.tf);
  const all = TF.map(([k]) => PF.stats(k));
  const g = (k) => all.find((s) => s.k === k);
  const y1 = g('1Y'), ytd = g('YTD'), si = g('SI');
  const twr = state.measure === 'twr';
  const closedStocks = D.ledger.realised.filter((r) => (r.type === 'Shares' || r.type === 'ETFs & ETCs') && r.last), wins = closedStocks.filter((r) => r.pl > 0).length;

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Performance · stocks and ETFs</p><h2>${FUND} is ${y1.twr >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(y1.twr), 1)} over the last 12 months, ${Math.abs((y1.twr - y1.idx[primary].twr) * 100).toFixed(1)} points ${y1.twr >= y1.idx[primary].twr ? 'ahead of' : 'behind'} ${esc(pName)}</h2></div></div>
  <div class="kpis4">
    ${kpi('Last 12 months', fmtSignedPct(y1.twr, 1), cls(y1.twr), vsIdx(y1.twr, y1.idx[primary].twr, pName))}
    ${kpi('This year', fmtSignedPct(ytd.twr, 1), cls(ytd.twr), vsIdx(ytd.twr, ytd.idx[primary].twr, pName))}
    ${kpi('Every euro since I started', fmtSignedPct(si.mwr, 1) + '<small> a year</small>', cls(si.mwr), `the same money in ${esc(pName)}: ${fmtSignedPct(si.idx[primary].mwr, 1)} a year`)}
    ${kpi('Winning calls', `${wins}<small> of ${closedStocks.length}</small>`, '', `closed stock and ETF positions sold at a profit`)}
  </div>

  <div class="panel" style="margin-top:14px">
    <div class="ctrls">
      <div class="seg" role="group" aria-label="Period">${TF.map(([k, l]) => `<button data-tf="${k}" aria-pressed="${k === state.tf}">${k === 'Y2025' || k === 'Y2024' ? l : k === 'SI' ? 'Max' : k}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Measure"><button data-ms="twr" aria-pressed="${twr}">Time-weighted</button><button data-ms="mwr" aria-pressed="${!twr}">Money-weighted</button></div>
    </div>
    <div class="headline"><span class="big2 ${cls(twr ? st.twr : PUB ? pubMwr(st, st) : st.gain)}">${twr ? fmtSignedPct(st.twr, 1) : PUB ? fmtSignedPct(pubMwr(st, st), 1) : fmtSignedEUR(st.gain)}</span><span class="muted">${twr ? 'time-weighted' : `money-weighted ${st.years > 1.05 ? fmtSignedPct(st.mwr, 1) + ' a year' : fmtSignedPct(st.mwrPeriod, 1)}`} · ${state.tf === 'SI' ? 'Max, since I started' : esc(TFL[state.tf])}</span>
      <span class="idxv"><i class="sw line" style="background:var(--fund)"></i>${FUND}</span>${sel.map((id) => `<span class="idxv"><i class="sw line" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))} ${twr ? fmtSignedPct(st.idx[id].twr, 1) : PUB ? fmtSignedPct(pubMwr(st, st.idx[id]), 1) : fmtSignedEUR(st.idx[id].value - st.b.v + st.gain)}</span>`).join('')}</div>
    <div id="perfchart" class="chart"></div>
    <div class="row-between" style="margin-top:6px"><span class="muted small">${twr ? 'Time-weighted: the return on my picks, however much money was in at the time.' : 'Money-weighted: what my actual money is worth, against putting the same money in each index on the same days.' + (PUB ? ' Scaled so the portfolio today is 100.' : '')}</span><button class="tablink" id="tv-perf">${state.tableView.perf ? 'Show chart' : 'View as table'}</button></div>
  </div>

  <div class="panel" style="margin-top:14px">
    <h3>Every period at a glance</h3><p class="sub">Time-weighted return for each period against the three indices. Click a row to chart it.</p>
    <div class="pbars" style="--ni:${gsel.length}">
      <div class="pb pb-h"><span class="pl"></span><span class="pt"></span><span class="pv">${FUND}</span>${gsel.map((id) => `<span class="pi">${esc(BSHORT[id] || idxName(id))}</span>`).join('')}</div>
      ${all.map((s) => { const mx = Math.max(...all.map((q) => Math.max(Math.abs(q.twr), ...gsel.map((id) => Math.abs(q.idx[id].twr))))) || 1; const bar = (x) => { const w = (Math.abs(x) / mx) * 50; return x < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`; };
      return `<button class="pb${s.k === state.tf ? ' on' : ''}" data-tf="${s.k}"><span class="pl">${esc(TFL[s.k])}</span>
        <span class="pt" style="height:${10 + gsel.length * 7}px"><i class="z"></i><i class="b you" style="top:0;${bar(s.twr)}"></i>${gsel.map((id, j) => `<i class="b idx" style="top:${10 + j * 7}px;background:${IDX_COLOR[id]};${bar(s.idx[id].twr)}"></i>`).join('')}</span>
        <span class="pv ${cls(s.twr)}">${fmtSignedPct(s.twr, 1)}</span>${gsel.map((id) => { const e = s.twr - s.idx[id].twr; return `<span class="pi">${fmtSignedPct(s.idx[id].twr, 1)}<small class="${cls(e)}">${e >= 0 ? '+' : '−'}${Math.abs(e * 100).toFixed(1)} pts</small></span>`; }).join('')}</button>`; }).join('')}</div>
    <div class="legend" style="margin:10px 0 0"><span><i class="sw" style="background:var(--fund)"></i>${FUND}</span>${gsel.map((id) => `<span><i class="sw" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))}</span>`).join('')}<span class="muted">Under each index: points the fund is ahead (+) or behind (−)</span></div>
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
    series = [{ v: pp.map((p) => (p.i / a.i - 1) * 100), color: 'var(--fund)', width: 2.25, label: FUND, fill: true, fillTo: 0, fillOpacity: 0.08 }]
      .concat(sel.map((id) => ({ v: xs.map((t) => (PF.P[id](t) / PF.P[id](a.t) - 1) * 100), color: IDX_COLOR[id], width: 1.5, label: idxName(id) })));
    yFmt = (v) => Math.round(v) + '%'; tipVal = (v) => fmtSignedPct(v / 100, 1);
  } else {
    let k = 0; const unitsCum = Object.fromEntries(sel.map((id) => [id, a.v / PF.P[id](a.t)]));
    const idxV = Object.fromEntries(sel.map((id) => [id, []])), money = [];
    let m = a.v;
    xs.forEach((t) => { while (k < fl.length && fl[k][0] <= t) { sel.forEach((id) => { unitsCum[id] += fl[k][1] / PF.P[id](fl[k][0]); }); m += fl[k][1]; k++; } sel.forEach((id) => idxV[id].push(unitsCum[id] * PF.P[id](t))); money.push(m); });
    series = [{ v: pp.map((p) => p.v), color: 'var(--fund)', width: 2.25, label: FUND }]
      .concat(sel.map((id) => ({ v: idxV[id], color: IDX_COLOR[id], width: 1.5, label: 'Same money in ' + idxName(id) })))
      .concat([{ v: money, color: 'var(--ink3)', width: 1.25, dash: '4 4', label: 'Money in' }]);
    yFmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v))); tipVal = (v) => money0(v);
  }
  mount($('#perfchart'), (h, w) => {
    if (state.tableView.perf) { h.innerHTML = tableTwin(['Date'].concat(series.map((s) => s.label)), xs.map((t, i) => [dfmt(isoDay(t))].concat(series.map((s) => (s.v[i] == null ? '–' : tipVal(s.v[i])))))); return; }
    lineChart(h, w, {
      x: xs, series, height: w < 520 ? 280 : 380, yFmt, zero: twr ? 0 : null, yMin: twr ? null : 0, aria: 'Freedom Fund against the S&P 500, Nasdaq-100 and MSCI World',
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
  return `${c.headline ? `<p><b>${esc(c.headline)}</b></p>` : ''}<ul class="news">${items.map((n) => { const u = safeUrl(n.url); return `<li><time>${esc(newsDate(n.date))}</time><span>${esc(n.text)}${n.source ? ` <span class="muted">(${u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n.source)}</a>` : esc(n.source)})</span>` : ''}</span></li>`; }).join('')}</ul>
    ${Array.isArray(c.watch) && c.watch.length ? `<h4>Watch next</h4><ul class="watch">${c.watch.slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
    <p class="foot-n">Web research ${esc(tfmt(c.updatedAt))}${age > 2 ? `, ${Math.floor(age)} days old` : ''}.</p>`;
}

const ratingCls = (r) => (/sell|under/i.test(r) ? 'neg' : /buy|outperform|overweight/i.test(r) ? 'pos' : 'hold');
function renderBook() {
  if (PUB) return renderBookPublic();
  const root = $('#t-book'); unmountWithin(root);
  const V = M.secValue;
  const cov = M.H.filter((h) => h.sc);
  const dLo = Math.min(-0.2, ...cov.map((h) => h.sc.bear)), dHi = Math.max(0.2, ...cov.map((h) => h.sc.bull));
  const PX = (v) => 19 + ((v - dLo) / (dHi - dLo)) * 62; // the outer fifths hold the bear and bull labels
  const pc = (h, k) => { const r = perfOf(h, k); return r == null ? '<span class="muted">–</span>' : pctSpan(r, 1); };
  const ytd = C_sum(M.H.map((h) => { const r = perfOf(h, 'YTD'); return r == null ? 0 : h.value - h.value / (1 + r); }));
  if (state.open && !holdingBy(state.open)) state.open = null;

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Portfolio</p><h2>What I own: ${M.H.length} positions worth ${fmtEUR0(V)}, ${ytd >= 0 ? 'up' : 'down'} ${fmtEUR0(Math.abs(ytd))} this year</h2><p>Tap a stock to see why I own it, what would make me sell, and the bull and bear case.</p></div></div>
  <div class="panel flat">
    <div class="book-h"><span>Position</span><span>Weight</span><span class="c-d">1D</span><span class="c-d">YTD</span><span>1Y</span><span class="c-m">Unrealised €</span><span>Unrealised %</span><span class="c-m c-rng">12-month target range</span><span class="c-m">Analysts</span><span></span></div>
    ${M.H.map((h) => {
      const sc = h.sc, cons = h.research && h.research.cons, open = state.open === h.isin;
      const mid = sc ? expOf(sc, PRESETS.analyst.p) : null; // 25% bear, 50% average target, 25% bull
      return `<div class="posn${open ? ' open' : ''}" data-i="${h.isin}">
        <button class="pos-row" aria-expanded="${open}" aria-controls="pd-${h.isin}">
          <span class="nm"><b>${esc(h.name)}</b><small>${esc(h.ticker || '')}</small></span>
          <span class="n"><b>${(h.weight * 100).toFixed(1)}%</b></span>
          <span class="n c-d">${pc(h, '1D')}</span>
          <span class="n c-d">${pc(h, 'YTD')}</span>
          <span class="n">${pc(h, '1Y')}</span>
          <span class="n c-m">${h.pnl != null ? eur0Span(h.pnl) : '–'}</span>
          <span class="n">${h.pnl != null ? pctSpan(h.pnlPct, 1) : '–'}</span>
          <span class="c-m c-rng">${sc ? `<span class="rng" role="img" aria-label="Bear ${fmtSignedPct(sc.bear, 0)}, weighted ${fmtSignedPct(mid, 0)}, bull ${fmtSignedPct(sc.bull, 0)}"><i class="z" style="left:${PX(0)}%"></i><i class="seg" style="left:${PX(sc.bear)}%;width:${PX(sc.bull) - PX(sc.bear)}%"></i><i class="d bear" style="left:${PX(sc.bear)}%"></i><i class="t" style="left:${PX(mid)}%"></i><i class="d bull" style="left:${PX(sc.bull)}%"></i><em class="lb neg" style="right:calc(${100 - PX(sc.bear)}% + 7px)">${fmtSignedPct(sc.bear, 0)}</em><em class="lb bs" style="left:${PX(mid)}%">${fmtSignedPct(mid, 0)}</em><em class="lb pos" style="left:calc(${PX(sc.bull)}% + 7px)">${fmtSignedPct(sc.bull, 0)}</em></span>` : '<small class="muted">no analyst coverage</small>'}</span>
          <span class="c-m cons">${cons && sc ? `<span class="rt ${ratingCls(cons.rating)}">${esc(cons.rating)}</span><small>target <b class="${cls(sc.base)}">${fmtSignedPct(sc.base, 0)}</b></small>` : '<small class="muted">–</small>'}</span>
          <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="pos-d" id="pd-${h.isin}" ${open ? '' : 'hidden'}>${open ? positionDetail(h) : ''}</div>
      </div>`;
    }).join('')}
    <div class="book-f"><span class="foot-n">Weight: share of the portfolio today. 1D, YTD and 1Y: change in the share price in euro over one day, this year and one year. Unrealised: gain or loss on what I still hold, against what I paid. 12-month target range: red dot the bear case, green dot the bull case (the highest analyst target), black tick the weighted outcome (25% bear, 50% average analyst target, 25% bull), all against today's price. Analysts: consensus rating and the upside to the average 12-month target.</span></div>
  </div>`;

  $$('#t-book .pos-row').forEach((b) => b.addEventListener('click', () => {
    const id = b.parentElement.dataset.i;
    state.open = state.open === id ? null : id; renderBook();
    if (state.open) { const el = $(`#t-book .posn[data-i="${id}"]`); if (el && el.getBoundingClientRect().top < 80) el.scrollIntoView({ block: 'start' }); }
  }));
}
/* The public Portfolio tab: the same book without the names. Each pick keeps sector, a broad region,
   weight, unrealised gain and the 12-month range; who they are, and why, is what a subscription buys. */
function renderBookPublic() {
  const root = $('#t-book'); unmountWithin(root);
  const U = M.D.public.unlock || {};
  const cov = M.H.filter((h) => h.sc);
  const dLo = Math.min(-0.2, ...cov.map((h) => h.sc.bear)), dHi = Math.max(0.2, ...cov.map((h) => h.sc.bull));
  const PX = (v) => 19 + ((v - dLo) / (dHi - dLo)) * 62;
  const sectors = {}; M.H.forEach((h) => { sectors[h.sector] = (sectors[h.sector] || 0) + h.weight; });
  const href = safeUrl(U.href) || (/^mailto:[^\s"'<>]+$/.test(U.href || '') ? U.href : null);
  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Portfolio</p><h2>What I own: ${M.H.length} positions. The names are for subscribers.</h2><p>Weights, sectors, gains and the 12-month range are the real ones; which company each pick is, and why I own it, is not on this page.</p></div></div>
  <div class="pub-wrap">
  <div class="panel flat">
    <div class="pub-h"><span>Pick</span><span>Sector</span><span class="c-m">Region</span><span>Weight</span><span>Unrealised</span><span class="c-m c-rng">12-month range</span></div>
    ${M.H.map((h) => { const sc = h.sc, mid = sc ? expOf(sc, PRESETS.analyst.p) : null;
      return `<div class="pub-r">
        <span class="nm"><b>${esc(h.name)}</b><i class="lock" aria-label="Name for subscribers"></i></span>
        <span>${esc(h.sector)}</span>
        <span class="c-m muted">${esc(h.region)}</span>
        <span class="n"><b>${(h.weight * 100).toFixed(1)}%</b></span>
        <span class="n">${h.pnl != null ? pctSpan(h.pnlPct, 1) : '–'}</span>
        <span class="c-m c-rng">${sc ? `<span class="rng" role="img" aria-label="Bear ${fmtSignedPct(sc.bear, 0)}, weighted ${fmtSignedPct(mid, 0)}, bull ${fmtSignedPct(sc.bull, 0)}"><i class="z" style="left:${PX(0)}%"></i><i class="seg" style="left:${PX(sc.bear)}%;width:${PX(sc.bull) - PX(sc.bear)}%"></i><i class="d bear" style="left:${PX(sc.bear)}%"></i><i class="t" style="left:${PX(mid)}%"></i><i class="d bull" style="left:${PX(sc.bull)}%"></i><em class="lb neg" style="right:calc(${100 - PX(sc.bear)}% + 7px)">${fmtSignedPct(sc.bear, 0)}</em><em class="lb bs" style="left:${PX(mid)}%">${fmtSignedPct(mid, 0)}</em><em class="lb pos" style="left:calc(${PX(sc.bull)}% + 7px)">${fmtSignedPct(sc.bull, 0)}</em></span>` : '<small class="muted">no analyst coverage</small>'}</span>
      </div>`; }).join('')}
    <div class="book-f"><span class="foot-n">Weight: share of the stock portfolio today. Unrealised: gain or loss on what I still hold, against what I paid. 12-month range: red dot the bear case, green dot the bull case (the highest analyst target), black tick the weighted outcome (25% bear, 50% average analyst target, 25% bull), rounded to a whole per cent. Region is broad on purpose.</span></div>
  </div>
  <aside class="panel pub-unlock">
    <p class="kicker">Subscription</p>
    <h3 class="pub-t">The picks, by name</h3>
    ${U.price ? `<p class="pub-price">${esc(U.price)}</p>` : ''}
    <ul class="pub-l">
      <li>Every position by name, with its weight and entry</li>
      <li>Why I own it, and the kill-switch that would make me sell</li>
      <li>Bull and bear case, analyst consensus and targets</li>
      <li>Buys and sells as I make them</li>
    </ul>
    ${href ? `<a class="pub-cta" href="${esc(href)}"${/^https:/.test(href) ? ' target="_blank" rel="noopener"' : ''}>Subscribe</a>` : ''}
    <p class="foot-n">My own portfolio, shown as it is. Not investment advice and not a recommendation to buy or sell anything.</p>
    <h4 class="pub-s">By sector</h4>
    <div class="pub-sec">${Object.entries(sectors).sort((a, b) => b[1] - a[1]).map(([k, w]) => `<div><span>${esc(k)}</span><i style="width:${(w * 100).toFixed(1)}%"></i><b>${(w * 100).toFixed(0)}%</b></div>`).join('')}</div>
  </aside>
  </div>`;
}
function positionDetail(h) {
  const cv = h.conviction || {}, rs = h.research, sc = h.sc, c = h.comment, cons = rs && rs.cons;
  const web = liveResearch(h);
  const news = web != null ? web : c ? `<ul class="news">${c.news.slice(0, 3).map((n) => `<li><time>${esc(newsDate(n[0]))}</time><span>${esc(n[1])}</span></li>`).join('')}</ul>` : '';
  const srcs = (c ? c.sources : []).concat(cons ? [cons.src] : []).map((x) => { const u = safeUrl(x.u); return u ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(x.t)}</a>` : ''; }).join('');
  return `<div class="pd">
    <div class="pd-main">
      ${cv.thesis ? `<p class="pd-thesis">${esc(cv.thesis)}</p>` : c ? `<p class="pd-thesis">${esc(c.tagline)}</p>` : ''}
      <div class="kill"><span class="k">Kill-switch${cv.killDraft ? ' <em>draft</em>' : ''}</span><p>${cv.kill ? esc(cv.kill) : 'Not written yet.'}</p></div>
      ${sc ? `<div class="cases">
        <div class="case bull"><div class="ch"><span>Bull</span><b class="pos">${fmtSignedPct(sc.bull, 0)} · €${px(sc.tBull)}</b></div><p>${rs ? esc(rs.bull) : ''}</p></div>
        <div class="case bear"><div class="ch"><span>Bear</span><b class="neg">${fmtSignedPct(sc.bear, 0)} · €${px(sc.tBear)}</b></div><p>${rs ? esc(rs.bear) : ''}${sc.bearFromDD ? ' <span class="muted">(Bear price is a repeat of the worst fall of the past year, which is lower than any analyst target.)</span>' : ''}</p></div>
      </div>` : ''}
      ${cons ? `<p class="cons">${esc(cons.rating)}${cons.analysts ? ` · ${cons.analysts} analysts` : ''} · average target €${px(sc.tBase)} ($${fmtNum(cons.avg, 2)}), ${fmtSignedPct(sc.base, 0)} from €${px(h.price)}${cons.refNote ? ` · ${esc(cons.refNote)}` : ''}</p>` : ''}
    </div>
    <div class="pd-side">
      ${rs ? `<h4>${esc(rs.industry)}</h4><p>${esc(rs.market)}</p><p>${esc(rs.position)}</p><h4>Competitors</h4><p>${rs.competitors.map(esc).join(' · ')}</p>` : ''}
      <h4>Position</h4><p>${qtyFmt(h.qty)} shares at €${h.avg != null ? px(h.avg) : '–'} average cost, worth ${fmtEUR0(h.value)}. ${h.pnl != null ? `Gain since bought ${fmtSignedEUR(h.pnl)}.` : ''}</p>
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
  if (!R) { root.innerHTML = '<div class="panel empty">The outlook needs 12 months of prices for every position.</div>'; return; }
  const bench = M.D.benches.find((b) => b.id === state.obench) || M.D.benches[0];
  const bName = BSHORT[bench.id] || bench.name;
  const n = state.hz, t = n / 12, hzL = HORIZONS.find((x) => x[0] === n)[2];
  const sigma = R.vol, bVol = R.bVol[bench.id], beta = R.pBeta[bench.id], rho = R.pCorr[bench.id];
  const ix = M.D.indices.find((x) => x.id === bench.id) || {};
  const bMu = ix.cagr != null ? ix.cagr : REF_MU; // the benchmark's own historical annual growth
  const bMuTxt = ix.cagr != null ? `its historical pace of ${fmtSignedPct(bMu, 1)} a year from ${dfmt(ix.cagrFrom + '-15', { day: undefined })} to ${dfmt(ix.cagrTo + '-15', { day: undefined })}${ix.cagrBasis ? ` (${esc(ix.cagrBasis)}, like the analyst price targets)` : ''}` : `an assumed ${fmtSignedPct(bMu, 0)} a year`;
  const mP = Math.log(1 + O.exp) - sigma * sigma / 2, mB = Math.log(1 + bMu) - bVol * bVol / 2;
  const exp = (1 + O.exp) ** t - 1, bExp = (1 + bMu) ** t - 1;
  const q = (z) => Math.exp(mP * t + z * sigma * Math.sqrt(t)) - 1;
  const sd = Math.sqrt(Math.max(1e-9, sigma * sigma + bVol * bVol - 2 * rho * sigma * bVol) * t);
  const pBeat = normCdf(((mP - mB) * t) / sd);
  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Outlook</p><h2>Where the ${FUND} could be ${n === 12 ? 'a year' : 'in ' + hzL} from now</h2></div></div>
  <div class="ctrls" style="margin-bottom:12px">
    <div class="seg" role="group" aria-label="Horizon">${HORIZONS.map(([k, l]) => `<button data-hz="${k}" aria-pressed="${k === n}">${l}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Benchmark">${['SPX', 'NDX', 'MSCI'].filter((id) => M.D.benches.some((b) => b.id === id)).map((id) => `<button data-ob="${id}" aria-pressed="${id === bench.id}">${esc(BSHORT[id])}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Scenario odds">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}" aria-pressed="${k === state.preset}">${v.label}</button>`).join('')}</div>
  </div>
  <div class="kpis4">
    ${kpi('Expected, ' + hzL, fmtSignedPct(exp, 0), cls(exp), `${PUB ? '' : `${exp >= 0 ? '+' : ''}${fmtEUR0(exp * V)} · `}${esc(bName)} ${fmtSignedPct(bExp, 0)} at its historical pace`)}
    ${kpi('9 in 10 outcomes', `<span class="${cls(q(-1.645))}">${fmtSignedPct(q(-1.645), 0)}</span> <span class="muted">to</span> <span class="${cls(q(1.645))}">${fmtSignedPct(q(1.645), 0)}</span>`, '', PUB ? `if the portfolio is 100 today: ${money0(V * (1 + q(-1.645)))} to ${money0(V * (1 + q(1.645)))}` : `${fmtEUR0(V * (1 + q(-1.645)))} to ${fmtEUR0(V * (1 + q(1.645)))}`)}
    ${kpi('Chance of beating ' + esc(bName), Math.round(pBeat * 100) + '%', pBeat >= 0.5 ? 'pos' : 'neg', `over ${hzL}, correlation ${fmtNum(rho, 2)}`)}
    ${kpi('Volatility', (sigma * 100).toFixed(0) + '%', '', `${esc(bName)} ${(bVol * 100).toFixed(0)}% · beta ${fmtNum(beta, 2)}`)}
  </div>
  <div class="panel" style="margin-top:14px">
    <h3>Range of outcomes, next ${hzL}</h3><p class="sub">${PUB ? 'The portfolio is 100 today.' : `The fund is worth ${fmtEUR0(V)} today.`} Shaded: 9 in 10 outcomes and the middle half. Dashed: ${esc(bName)} growing at ${bMuTxt}, with its own volatility. Odds ${pr.map((x) => Math.round(x * 100)).join('/')} (bull/base/bear)${n > 12 ? '; beyond 12 months the expected return is assumed to repeat' : ''}.</p>
    <div id="fan" class="chart"></div>
  </div>`;
  $$('#t-risk [data-pre]').forEach((b) => b.addEventListener('click', () => { state.preset = b.dataset.pre; renderRisk(); }));
  $$('#t-risk [data-hz]').forEach((b) => b.addEventListener('click', () => { state.hz = +b.dataset.hz; renderRisk(); }));
  $$('#t-risk [data-ob]').forEach((b) => b.addEventListener('click', () => { state.obench = b.dataset.ob; renderRisk(); }));
  const fo = { V0: V, mu: O.exp, sigma, months: n, t0: M.asOf, color: 'var(--fund)', ref: { mu: bMu, sigma: bVol, label: bName, color: IDX_COLOR[bench.id] }, aria: `Range of outcomes over ${hzL}` };
  mount($('#fan'), (host, w) => fanChart(host, w, Object.assign({ height: w < 520 ? 260 : 340 }, fo)));
}

/* ---------- notes ---------- */
function renderNotes() {
  const D = M.D;
  $('#notes').innerHTML = `<div class="foot">
    <p><b>How the numbers work.</b> Only stocks and ETFs (including ETCs) count. Crypto and leveraged products I traded are left out: money moving into or out of them is treated as if it left or joined the portfolio, so their gains and losses do not touch these figures. Dividends count as return; platform fees are left out. The daily value of the portfolio is rebuilt from every trade and daily closing prices in euro (Scalable Capital account, valued ${tfmt(D.meta.asOf)}). Time-weighted return measures the picks regardless of how much money was in; money-weighted return measures what the actual money earned. ${PUB ? 'One speculative trade is also left out: it was a one-off, not a pick.' : 'GameStop is also left out: it was a one-off speculative trade, not a pick.'} Benchmarks are the iShares MSCI World, S&P 500 and Nasdaq-100 ETFs in euro. The outlook is a simple model built on analyst targets and past volatility, not a forecast. Not investment advice.</p>${PUB ? `<p><b>What this public version leaves out.</b> No euro amounts: money is rescaled so the stock portfolio is 100 today, which leaves every return, weight and scenario as it is. No names: picks are lettered by weight, regions are broad, and per-stock prices, trades and analyst targets are not in the page at all, so they cannot be read from its source either. Risk figures are computed from the full data and shown for the portfolio as a whole.</p>` : ''}
  </div>`;
}
