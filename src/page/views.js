/* ===== page part 2: the four tabs ===== */
const benchOf = () => M.D.benches.find((b) => b.id === state.bench) || M.D.benches[0];
const holdingBy = (isin) => M.H.find((h) => h.isin === isin);
const perfOf = (h, p) => (h.perf && h.perf[p] ? h.perf[p][0] : null);
const pctSpan = (x, d = 1) => `<span class="${cls(x)} num">${fmtSignedPct(x, d)}</span>`;
const eur0Span = (x) => `<span class="${cls(x)} num">${x > 0 ? '+' : ''}${fmtEUR0(x)}</span>`;
const BSHORT = { MSCI: 'MSCI World', SPX: 'S&P 500', NDX: 'Nasdaq-100', ACWI: 'MSCI ACWI', STOXX: 'STOXX 600' };
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
  $('#mh-name').textContent = 'Equity Portfolio Dashboard';
  $('#mh-strategy').textContent = pr.manager;
  $('#mh-tag').textContent = pr.tagline;
  $('#mh-aum').textContent = `${fmtEUR0(M.secValue)} in ${M.H.length} stocks`;
  const st = $('#status'); st.dataset.mode = state.mode;
  const txt = { snapshot: `Snapshot ${tfmt(D.meta.asOf)}`, loading: 'Refreshing from Scalable…', live: `Live ${tfmt(D.meta.asOf)}`, error: `Snapshot ${tfmt(D.meta.asOf)}` }[state.mode];
  $('#status-text').textContent = txt + (state.statusMsg ? ' · ' + state.statusMsg : '');
  $('#btn-refresh').disabled = state.mode === 'loading';
  $('#btn-refresh').hidden = !state.canLive;
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
const IDX_COLOR = { MSCI: 'var(--c2)', ACWI: 'var(--c3)', SPX: 'var(--c7)', NDX: 'var(--c4)', STOXX: 'var(--c5)' };
const idxName = (id) => (M.D.indices.find((x) => x.id === id) || { name: id }).name;
const kpi = (k, v, c, n) => `<div class="kpi"><div class="k">${k}</div><div class="v ${c || ''}">${v}</div><div class="n">${n || ''}</div></div>`;
const vsIdx = (you, idx, name) => { const e = you - idx; return `${esc(name)} ${fmtSignedPct(idx, 1)} · <b class="${cls(e)}">${e >= 0 ? '+' : '−'}${Math.abs(e * 100).toFixed(1)} pts</b>`; };

function renderRecord() {
  const root = $('#t-record'); unmountWithin(root);
  const D = M.D, PF = M.perf;
  const sel = state.idxSel.filter((id) => D.indices.some((x) => x.id === id));
  const primary = sel[0] || D.indices[0].id, pName = idxName(primary);
  const st = PF.stats(state.tf);
  const all = TF.map(([k]) => PF.stats(k));
  const g = (k) => all.find((s) => s.k === k);
  const y1 = g('1Y'), ytd = g('YTD'), si = g('SI');
  const twr = state.measure === 'twr';
  const closedStocks = D.ledger.realised.filter((r) => r.type === 'Shares' && r.last), wins = closedStocks.filter((r) => r.pl > 0).length;

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Performance · stocks only</p><h2>My stock picks are ${y1.twr >= 0 ? 'up' : 'down'} ${fmtPct(Math.abs(y1.twr), 1)} over the last 12 months, ${Math.abs((y1.twr - y1.idx[primary].twr) * 100).toFixed(1)} points ${y1.twr >= y1.idx[primary].twr ? 'ahead of' : 'behind'} ${esc(pName)}</h2></div></div>
  <div class="kpis4">
    ${kpi('Last 12 months', fmtSignedPct(y1.twr, 1), cls(y1.twr), vsIdx(y1.twr, y1.idx[primary].twr, pName))}
    ${kpi('This year', fmtSignedPct(ytd.twr, 1), cls(ytd.twr), vsIdx(ytd.twr, ytd.idx[primary].twr, pName))}
    ${kpi('Every euro since I started', fmtSignedPct(si.mwr, 1) + '<small> a year</small>', cls(si.mwr), `the same money in ${esc(pName)}: ${fmtSignedPct(si.idx[primary].mwr, 1)} a year`)}
    ${kpi('Winning calls', `${wins}<small> of ${closedStocks.length}</small>`, '', `closed stock positions sold at a profit`)}
  </div>

  <div class="panel" style="margin-top:14px">
    <div class="ctrls">
      <div class="seg" role="group" aria-label="Period">${TF.map(([k, l]) => `<button data-tf="${k}" aria-pressed="${k === state.tf}">${k === 'Y2025' || k === 'Y2024' ? l : k === 'SI' ? 'Since start' : k}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Measure"><button data-ms="twr" aria-pressed="${twr}">Time-weighted</button><button data-ms="mwr" aria-pressed="${!twr}">Money-weighted</button></div>
    </div>
    <div class="ichips">${D.indices.map((x) => `<button data-ix="${x.id}" aria-pressed="${sel.includes(x.id)}"><i class="sw line" style="background:${IDX_COLOR[x.id]}"></i>${esc(x.name)}</button>`).join('')}</div>
    <div class="headline"><span class="big2 ${cls(twr ? st.twr : st.gain)}">${twr ? fmtSignedPct(st.twr, 1) : fmtSignedEUR(st.gain)}</span><span class="muted">${twr ? 'time-weighted' : `money-weighted ${st.years > 1.05 ? fmtSignedPct(st.mwr, 1) + ' a year' : fmtSignedPct(st.mwrPeriod, 1)}`} · ${esc(TFL[state.tf])}</span>
      ${sel.map((id) => `<span class="idxv"><i class="sw line" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))} ${twr ? fmtSignedPct(st.idx[id].twr, 1) : fmtSignedEUR(st.idx[id].value - st.b.v + st.gain)}</span>`).join('')}</div>
    <div id="perfchart" class="chart"></div>
    <div class="row-between" style="margin-top:6px"><span class="muted small">${twr ? 'Time-weighted: the return on my picks, however much money was in at the time.' : 'Money-weighted: what my actual money is worth, against putting the same money in each index on the same days.'}</span><button class="tablink" id="tv-perf">${state.tableView.perf ? 'Show chart' : 'View as table'}</button></div>
  </div>

  <div class="panel" style="margin-top:14px">
    <h3>Every period at a glance</h3><p class="sub">My stocks (blue) against ${esc(pName)}. Click a row to chart it.</p>
    <div class="pbars">${all.map((s) => { const e = s.twr - s.idx[primary].twr; const mx = Math.max(...all.map((q) => Math.max(Math.abs(q.twr), Math.abs(q.idx[primary].twr)))) || 1; const w = (x) => (Math.abs(x) / mx) * 50;
      return `<button class="pb${s.k === state.tf ? ' on' : ''}" data-tf="${s.k}"><span class="pl">${esc(TFL[s.k])}</span>
        <span class="pt"><i class="z"></i><i class="b you ${s.twr < 0 ? 'neg' : ''}" style="${s.twr < 0 ? `right:50%;width:${w(s.twr)}%` : `left:50%;width:${w(s.twr)}%`}"></i><i class="b idx" style="background:${IDX_COLOR[primary]};${s.idx[primary].twr < 0 ? `right:50%;width:${w(s.idx[primary].twr)}%` : `left:50%;width:${w(s.idx[primary].twr)}%`}"></i></span>
        <span class="pv ${cls(s.twr)}">${fmtSignedPct(s.twr, 1)}</span><span class="pe ${cls(e)}">${e >= 0 ? '+' : '−'}${Math.abs(e * 100).toFixed(1)}</span></button>`; }).join('')}</div>
    <div class="legend" style="margin:10px 0 0"><span><i class="sw" style="background:var(--accent)"></i>My stocks</span><span><i class="sw" style="background:${IDX_COLOR[primary]}"></i>${esc(pName)}</span><span class="muted">Right column: points ahead (+) or behind (−)</span></div>
  </div>`;

  $$('#t-record [data-tf]').forEach((b) => b.addEventListener('click', () => { state.tf = b.dataset.tf; renderRecord(); }));
  $$('#t-record [data-ms]').forEach((b) => b.addEventListener('click', () => { state.measure = b.dataset.ms; renderRecord(); }));
  $$('#t-record [data-ix]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.ix; state.idxSel = state.idxSel.includes(id) ? state.idxSel.filter((x) => x !== id) : state.idxSel.concat([id]);
    if (!state.idxSel.length) state.idxSel = [id];
    renderRecord();
  }));
  $('#tv-perf').addEventListener('click', () => { state.tableView.perf = !state.tableView.perf; renderRecord(); });

  const a = st.a, b = st.b;
  const pp = PF.pts.filter((p) => p.t >= a.t && p.t <= b.t + 6 * 36e5);
  const xs = pp.map((p) => p.t);
  const fl = PF.fl.filter((f) => f[0] > a.t && f[0] <= b.t);
  let series, yFmt, tipVal;
  if (twr) {
    series = [{ v: pp.map((p) => (p.i / a.i - 1) * 100), color: 'var(--accent)', width: 2.25, label: 'My stocks', fill: true, fillTo: 0, fillOpacity: 0.08 }]
      .concat(sel.map((id) => ({ v: xs.map((t) => (PF.P[id](t) / PF.P[id](a.t) - 1) * 100), color: IDX_COLOR[id], width: 1.5, label: idxName(id) })));
    yFmt = (v) => Math.round(v) + '%'; tipVal = (v) => fmtSignedPct(v / 100, 1);
  } else {
    let k = 0; const unitsCum = Object.fromEntries(sel.map((id) => [id, a.v / PF.P[id](a.t)]));
    const idxV = Object.fromEntries(sel.map((id) => [id, []])), money = [];
    let m = a.v;
    xs.forEach((t) => { while (k < fl.length && fl[k][0] <= t) { sel.forEach((id) => { unitsCum[id] += fl[k][1] / PF.P[id](fl[k][0]); }); m += fl[k][1]; k++; } sel.forEach((id) => idxV[id].push(unitsCum[id] * PF.P[id](t))); money.push(m); });
    series = [{ v: pp.map((p) => p.v), color: 'var(--accent)', width: 2.25, label: 'My stocks' }]
      .concat(sel.map((id) => ({ v: idxV[id], color: IDX_COLOR[id], width: 1.5, label: 'Same money in ' + idxName(id) })))
      .concat([{ v: money, color: 'var(--ink3)', width: 1.25, dash: '4 4', label: 'Money in' }]);
    yFmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v))); tipVal = (v) => fmtEUR0(v);
  }
  mount($('#perfchart'), (h, w) => {
    if (state.tableView.perf) { h.innerHTML = tableTwin(['Date'].concat(series.map((s) => s.label)), xs.map((t, i) => [dfmt(isoDay(t))].concat(series.map((s) => (s.v[i] == null ? '–' : tipVal(s.v[i])))))); return; }
    lineChart(h, w, {
      x: xs, series, height: w < 520 ? 280 : 380, yFmt, zero: twr ? 0 : null, yMin: twr ? null : 0, aria: 'Portfolio against the selected indices',
      tip: (i) => `<div class="th">${dfmt(isoDay(xs[i]))}</div>${series.map((s) => (s.v[i] == null ? '' : trow(s.color, s.label, tipVal(s.v[i]), 1))).join('')}`,
    });
  });
}

/* =====================================================================
   PHILOSOPHY AND PROCESS
   ===================================================================== */
function renderPhilosophy() {
  const root = $('#t-philosophy');
  const pr = M.D.profile;
  const inBook = (edge) => M.H.filter((h) => h.conviction && h.conviction.edge === edge);
  root.innerHTML = `
  <div class="lede"><div><p class="kicker">How I invest</p><h2>Eight to twelve stocks. Each one needs a reason to be in, and a written reason to get out.</h2></div></div>
  <div class="mchips">${pr.mandate.map((m) => `<span><b>${esc(m[0])}</b>${esc(m[1])}</span>`).join('')}</div>
  <div class="grid" style="margin-top:14px">
    ${Object.entries(pr.edges).map(([k, e]) => { const hs = inBook(k); return `<div class="panel s-4 edge">
      <div class="who">${esc(e.master)}</div><div class="nm">${esc(k)}</div><p>${esc(e.source)}.</p>
      <div class="kv"><span>Holding period</span><b>${esc(e.horizon)}</b></div>
      <div class="inbook">${hs.length ? hs.map((h) => `<span class="chip">${esc(h.ticker)} <b>${(h.weight * 100).toFixed(0)}%</b></span>`).join('') : '<span class="muted">none held</span>'}</div></div>`; }).join('')}
    <div class="panel s-6"><h3>How a stock gets in</h3><ol class="flow">${pr.process.map((s) => `<li>${esc(s[0])}</li>`).join('')}</ol></div>
    <div class="panel s-6"><h3>Lessons I paid for</h3><ul class="rules">${pr.lessons.map((l) => `<li>${esc(l.rule)}</li>`).join('')}</ul></div>
  </div>`;
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
const edgeChip = (cv) => (cv && cv.edge ? `<span class="edge-chip">${esc(cv.edge)}</span>` : `<span class="edge-chip todo">Edge to declare</span>`);

function renderBook() {
  const root = $('#t-book'); unmountWithin(root);
  const pr = prOf(), O = portOutlook(pr), V = M.secValue;
  const declared = M.H.filter((h) => h.conviction && h.conviction.edge).length;
  const kills = M.H.filter((h) => h.conviction && h.conviction.kill).length;
  const top3 = C_sum(M.H.slice(0, 3).map((h) => h.value)) / V;
  const ai = C_sum(M.H.filter((h) => /AI/.test(h.theme || '')).map((h) => h.value)) / V;
  const cov = O.rows.filter((r) => r.sc);
  const dLo = Math.min(-0.2, ...cov.map((r) => r.sc.bear)), dHi = Math.max(0.2, ...cov.map((r) => r.sc.bull));
  const PX = (v) => ((v - dLo) / (dHi - dLo)) * 100;
  const wMax = Math.max(...M.H.map((h) => Math.max(h.weight, ((h.conviction && h.conviction.target) || 0) / 100)));
  if (state.open && !holdingBy(state.open)) state.open = null;

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Portfolio</p><h2>What I own and why: ${M.H.length} stocks</h2><p>Tap a stock to see why I own it, what would make me sell, and the bull and bear case.</p></div></div>
  <div class="panel flat">
    <div class="book-h"><span>Position</span><span>Weight</span><span class="hs">Since bought</span><span class="hs2">12-month range: bear, average target, bull</span><span>Expected</span></div>
    ${M.H.map((h) => {
      const cv = h.conviction, sc = h.sc, e = expOf(sc, pr), open = state.open === h.isin;
      const tgt = cv && cv.target ? cv.target / 100 : null;
      return `<div class="posn${open ? ' open' : ''}" data-i="${h.isin}">
        <button class="pos-row" aria-expanded="${open}" aria-controls="pd-${h.isin}">
          <span class="nm"><b>${esc(h.name)}</b><small>${esc(h.ticker || '')}</small>${edgeChip(cv)}</span>
          <span class="wt"><b>${(h.weight * 100).toFixed(1)}%</b><span class="wbar"><i style="width:${(h.weight / wMax) * 100}%"></i>${tgt ? `<em style="left:${(tgt / wMax) * 100}%" title="Target ${cv.target}%"></em>` : ''}</span><small>${tgt ? `target ${cv.target}%` : 'no target'}</small></span>
          <span class="hs">${h.pnl != null ? `${pctSpan(h.pnlPct, 0)}<small>${eur0Span(h.pnl)}</small>` : '–'}</span>
          <span class="hs2">${sc ? `<span class="rng"><i class="z" style="left:${PX(0)}%"></i><i class="seg" style="left:${PX(sc.bear)}%;width:${PX(sc.bull) - PX(sc.bear)}%"></i><i class="d bear" style="left:${PX(sc.bear)}%"></i><i class="t" style="left:${PX(sc.base)}%"></i><i class="d bull" style="left:${PX(sc.bull)}%"></i></span><small class="rng-l"><span class="neg">${fmtSignedPct(sc.bear, 0)}</span><span>${fmtSignedPct(sc.base, 0)}</span><span class="pos">${fmtSignedPct(sc.bull, 0)}</span></small>` : '<small class="muted">no analyst coverage</small>'}</span>
          <span class="ex">${e != null ? `<b class="${cls(e)}">${fmtSignedPct(e, 0)}</b><small>${eur0Span(e * h.value)}</small>` : '–'}</span>
          <span class="chev" aria-hidden="true"></span>
        </button>
        <div class="pos-d" id="pd-${h.isin}" ${open ? '' : 'hidden'}>${open ? positionDetail(h) : ''}</div>
      </div>`;
    }).join('')}
    <div class="book-f"><span class="foot-n">Weight bar: today. Gold tick: target weight in the model book. Expected uses the ${esc(PRESETS[state.preset].label.toLowerCase())} odds set under Risk and outlook.</span></div>
  </div>`;

  $$('#t-book .pos-row').forEach((b) => b.addEventListener('click', () => {
    const id = b.parentElement.dataset.i;
    state.open = state.open === id ? null : id; renderBook();
    if (state.open) { const el = $(`#t-book .posn[data-i="${id}"]`); if (el && el.getBoundingClientRect().top < 80) el.scrollIntoView({ block: 'start' }); }
  }));
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
      ${cv.note ? `<p class="flag">${esc(cv.note)}</p>` : ''}
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
function renderRisk() {
  const root = $('#t-risk'); unmountWithin(root);
  const R = M.risk, pr = prOf(), O = portOutlook(pr), V = M.secValue;
  if (!R) { root.innerHTML = '<div class="panel empty">The outlook needs 12 months of prices for every position.</div>'; return; }
  const bench = M.D.benches.find((b) => b.id === 'MSCI') || M.D.benches[0];
  const sigma = R.vol, bVol = R.bVol[bench.id], beta = R.pBeta[bench.id];
  const var95 = 1.645 * sigma * Math.sqrt(1 / 12) * V;
  const stress = [
    ['Every stock hits its bear case', O.bear],
    [`MSCI World falls 20% (beta ${fmtNum(beta, 1)})`, -0.2 * beta],
    ['Repeat of the worst fall of the past year', R.dd.dd],
    ['A bad month, 1 in 20', -var95 / V],
  ];
  const sMax = Math.max(...stress.map((s) => Math.abs(s[1])));
  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Outlook</p><h2>Where the portfolio could be a year from now</h2><p>Built from analyst price targets, which tend to be optimistic, so try the Cautious and Stress settings too.</p></div>
    <div class="seg" role="group" aria-label="Scenario odds">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}" aria-pressed="${k === state.preset}">${v.label}</button>`).join('')}</div></div>
  <div class="kpis4">
    ${kpi('Expected, 12 months', fmtSignedPct(O.exp, 0), cls(O.exp), `${O.exp >= 0 ? '+' : ''}${fmtEUR0(O.exp * V)} · odds ${pr.map((x) => Math.round(x * 100)).join('/')}`)}
    ${kpi('Bull · bear', `<span class="pos">${fmtSignedPct(O.bull, 0)}</span> <span class="muted">·</span> <span class="neg">${fmtSignedPct(O.bear, 0)}</span>`, '', 'if every stock hits its scenario')}
    ${kpi('Volatility', (sigma * 100).toFixed(0) + '%', '', `MSCI World ${(bVol * 100).toFixed(0)}%`)}
    ${kpi('Bad month, 1 in 20', fmtEUR0(-var95), 'neg', 'one-month value at risk, 95%')}
  </div>
  <div class="grid" style="margin-top:14px">
    <div class="panel s-7">
      <h3>Range of outcomes, next 12 months</h3><p class="sub">Shares worth ${fmtEUR0(V)} today. Shaded: 9 in 10 outcomes and the middle half. Dashed: MSCI World at 7% a year.</p>
      <div id="fan" class="chart"></div>
    </div>
    <div class="panel s-5">
      <h3>Stress tests</h3><p class="sub">Loss on today's shares</p>
      <div class="stress">${stress.map((s) => `<div class="st"><span class="l">${s[0]}</span><span class="t"><i style="width:${(Math.abs(s[1]) / sMax) * 100}%"></i></span><b class="neg">${fmtSignedPct(s[1], 0)}<small>${fmtEUR0(s[1] * V)}</small></b></div>`).join('')}</div>
    </div>
  </div>`;
  $$('#t-risk [data-pre]').forEach((b) => b.addEventListener('click', () => { state.preset = b.dataset.pre; renderRisk(); renderBook(); }));
  const fo = { V0: V, mu: O.exp, sigma, months: 12, t0: M.asOf, ref: { mu: REF_MU, sigma: bVol, label: 'MSCI World' }, aria: 'Range of outcomes over twelve months' };
  mount($('#fan'), (host, w) => fanChart(host, w, Object.assign({ height: w < 520 ? 250 : 300 }, fo)));
}

/* ---------- notes ---------- */
function renderNotes() {
  const D = M.D;
  $('#notes').innerHTML = `<div class="foot">
    <p><b>How the numbers work.</b> Only individual stocks count. Crypto, ETFs and leveraged products I traded are left out: money moving into or out of them is treated as if it left or joined the stock portfolio, so their gains and losses do not touch these figures. Stock dividends count as return; platform fees are left out. The daily value of the stock portfolio is rebuilt from every trade and daily closing prices in euro (Scalable Capital account, valued ${tfmt(D.meta.asOf)}). Time-weighted return measures the picks regardless of how much money was in; money-weighted return measures what the actual money earned. Indices are iShares ETFs in euro. Not investment advice.</p>
  </div>`;
}
