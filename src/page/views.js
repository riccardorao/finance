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
  $('#mh-name').textContent = pr.manager;
  $('#mh-strategy').textContent = pr.strategy;
  $('#mh-tag').textContent = pr.tagline;
  $('#mh-aum').textContent = `${fmtEUR0(M.total)} · ${M.H.length} positions`;
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
const tfDays = (k) => { const s = M.perf.stats(k); return (s.b.t - s.a.t) / MS; };
/** Percentage with an optional annualised figure beneath for windows longer than a year. */
const retCell = (r, ann) => `${pctSpan(r, 1)}${ann != null ? `<span class="ann">${fmtSignedPct(ann, 1)} p.a.</span>` : ''}`;

function monthlyStats(months, id) {
  const r = months.map((m) => (id ? m.idx[id] : m.r));
  if (r.length < 3) return null;
  let idx = 1, peak = 1, dd = 0; r.forEach((x) => { idx *= 1 + x; peak = Math.max(peak, idx); dd = Math.min(dd, idx / peak - 1); });
  const total = idx - 1, years = r.length / 12, ann = Math.pow(idx, 1 / years) - 1, vol = std(r) * Math.sqrt(12);
  return { n: r.length, pos: r.filter((x) => x > 0).length, best: Math.max(...r), worst: Math.min(...r), vol, dd, total, ann, ratio: vol ? ann / vol : null };
}

function renderRecord() {
  const root = $('#t-record'); unmountWithin(root);
  const D = M.D, PF = M.perf, S = D.ledger.summary;
  const sel = state.idxSel.filter((id) => D.indices.some((x) => x.id === id));
  const primary = sel[0] || D.indices[0].id;
  const st = PF.stats(state.tf);
  const all = TF.map(([k]) => PF.stats(k));
  const si = all.find((s) => s.k === 'SI'), y1 = all.find((s) => s.k === '1Y');
  const ex = st.twr - st.idx[primary].twr;
  const shares = D.ledger.realised.filter((r) => r.type === 'Shares');
  const wins = shares.filter((r) => r.pl > 0).length;
  // drawdown on the time-weighted index since inception
  let peak = PF.pts[0].i, dd = 0, ddPeak = PF.pts[0].t, ddLow = PF.pts[0].t, pk = PF.pts[0].t;
  PF.pts.forEach((p) => { if (p.i > peak) { peak = p.i; pk = p.t; } const d = p.i / peak - 1; if (d < dd) { dd = d; ddPeak = pk; ddLow = p.t; } });
  const worstM = PF.months.filter((m) => !m.partial).reduce((a, m) => (m.r < a.r ? m : a), { r: 0 });
  const winMonths = PF.months.filter((m) => !m.partial && m.t > st.a.t + MS && m.t <= st.b.t + MS);
  const msYou = monthlyStats(winMonths), msIdx = monthlyStats(winMonths, primary);
  const betaCorr = winMonths.length >= 6 ? { beta: beta(winMonths.map((m) => m.r), winMonths.map((m) => m.idx[primary])), corr: corr(winMonths.map((m) => m.r), winMonths.map((m) => m.idx[primary])) } : null;
  const ym = (t) => dfmt(isoDay(t), { day: undefined });

  // waterfall: net capital to today's value
  const byType = (t) => C_sum(D.ledger.realised.filter((r) => r.type === t).map((r) => r.pl));
  const steps = [
    ['Closed share positions', byType('Shares'), `${wins} of ${shares.length} closed at a gain`],
    ['Open positions, unrealised', M.unreal, `${M.H.length} holdings at today's prices`],
    ['ETFs and ETCs', byType('ETFs & ETCs'), 'closed'],
    ['Dividends', M.incomeDiv, 'after withholding tax'],
    ['Crypto', byType('Crypto'), 'closed'],
    ['Interest and bonus', S.intTotal + S.bonTotal, ''],
    ['Platform fees', -S.feeTotal, 'subscription'],
    ['Leveraged products', byType('Leveraged & certificates'), 'turbos and mini-futures'],
  ].filter((s) => Math.abs(s[1]) >= 0.5);
  const resid = M.total - M.net - C_sum(steps.map((s) => s[1]));
  if (Math.abs(resid) >= 5) steps.push(['Booking differences', resid, 'cash timing and rounding']);
  let cum = M.net; const wf = steps.map((s) => { const a = cum; cum += s[1]; return { label: s[0], v: s[1], note: s[2], a, b: cum }; });
  const hi = Math.max(M.total, M.net, ...wf.map((w) => Math.max(w.a, w.b))) * 1.02, X = (v) => (v / hi) * 100;
  const closed = D.ledger.realised.filter((r) => r.last);
  const best = closed.slice().sort((a, b) => b.pl - a.pl).slice(0, 4), worst = closed.slice().sort((a, b) => a.pl - b.pl).slice(0, 4);

  // calendar table
  const years = Array.from(new Set(PF.months.map((m) => m.ym.slice(0, 4))));
  const heat = (r) => { if (r == null) return ''; const pc = Math.round(Math.min(1, Math.abs(r) / 0.15) * 55 + 8); return `background:color-mix(in srgb, var(${r >= 0 ? '--pos-fill' : '--neg-fill'}) ${pc}%, var(--panel))`; };

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Track record · ${esc(ym(PF.first))} to ${esc(ym(M.asOf))}</p>
    <h2>${fmtEUR0(M.net)} of net capital is worth ${fmtEUR0(M.total)}: ${fmtPct(si.mwr, 1)} a year money-weighted, ${fmtSignedPct(y1.twr, 1)} time-weighted over the last 12 months</h2></div></div>

  <div class="panel"><div class="hero">
    <div>
      <div class="muted" style="font:500 11px var(--mono);letter-spacing:.07em;text-transform:uppercase">Total value</div>
      <div class="big num" aria-live="polite">${fmtEUR(M.total)}</div>
      <div><span class="delta ${cls(st.gain)}"><span class="ar">${arrow(st.gain)}</span>${fmtSignedEUR(st.gain)} <span style="font-weight:500">· ${fmtSignedPct(st.twr, 1)} TWR</span></span> <span class="muted" style="margin-left:6px">${esc(TFL[state.tf])}</span></div>
      <div class="vs">${esc(idxName(primary))} ${fmtSignedPct(st.idx[primary].twr, 1)} over the same period: ${ex >= 0 ? 'ahead by' : 'behind by'} <b class="${cls(ex)}">${Math.abs(ex * 100).toFixed(1)} points</b> time-weighted.</div>
      <div class="asof" style="margin-top:12px">Valued ${tfmt(D.meta.asOf)} · after fees · ${fmtEUR(M.cash)} cash</div>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Money-weighted, since inception</div><div class="v ${cls(si.mwr)}">${fmtSignedPct(si.mwr, 1)}</div><div class="n">a year, on every deposit and withdrawal</div></div>
      <div class="stat"><div class="k">Time-weighted, 12 months</div><div class="v ${cls(y1.twr)}">${fmtSignedPct(y1.twr, 1)}</div><div class="n">${esc(idxName(primary))} ${fmtSignedPct(y1.idx[primary].twr, 1)}</div></div>
      <div class="stat"><div class="k">Time-weighted, since inception</div><div class="v ${cls(si.twr)}">${fmtSignedPct(si.twr, 1)}</div><div class="n">worst month ${esc(ym(worstM.t || M.asOf))}, ${fmtSignedPct(worstM.r, 0)}</div></div>
      <div class="stat"><div class="k">All-time gain</div><div class="v ${cls(D.pl.MAX)}">${fmtSignedEUR(D.pl.MAX)}</div><div class="n">${fmtEUR0(M.deposited)} in · ${fmtEUR0(M.withdrawn)} out</div></div>
      <div class="stat"><div class="k">Worst fall, time-weighted</div><div class="v neg">${fmtSignedPct(dd, 1)}</div><div class="n">${esc(ym(ddPeak))} to ${esc(ym(ddLow))}</div></div>
      <div class="stat"><div class="k">Closed share positions</div><div class="v">${wins} of ${shares.length}</div><div class="n">profitable · ${fmtSignedEUR(byType('Shares'))}</div></div>
    </div>
  </div></div>

  <div class="panel" style="margin-top:14px">
    <div class="ctrls">
      <div class="grp"><span class="lbl">Period</span><div class="seg" role="group" aria-label="Period">${TF.map(([k, l]) => `<button data-tf="${k}" aria-pressed="${k === state.tf}">${k === 'Y2025' || k === 'Y2024' ? l : k === 'SI' ? 'Since start' : k}</button>`).join('')}</div></div>
      <div class="grp"><span class="lbl">Measure</span><div class="seg" role="group" aria-label="Measure"><button data-ms="twr" aria-pressed="${state.measure === 'twr'}">Time-weighted</button><button data-ms="mwr" aria-pressed="${state.measure === 'mwr'}">Money-weighted</button></div></div>
    </div>
    <div class="ctrls"><span class="lbl">Indices</span><div class="ichips">${D.indices.map((x) => `<button data-ix="${x.id}" aria-pressed="${sel.includes(x.id)}"><i class="sw line" style="background:${IDX_COLOR[x.id]}"></i>${esc(x.name)}</button>`).join('')}</div></div>
    <h3>${state.measure === 'twr' ? 'Cumulative time-weighted return' : 'Your money against the same money in each index'} · ${esc(TFL[state.tf])}</h3>
    <p class="sub">${state.measure === 'twr' ? 'Each period is weighted equally whatever the account size, so deposits and withdrawals do not distort it. This is the figure allocators compare across managers.' : 'Portfolio value against what the starting value plus every later deposit and withdrawal would be worth in each index. This is what your actual money earned.'}</p>
    <div class="legend"><span><i class="sw line" style="background:var(--accent)"></i>Portfolio</span>${sel.map((id) => `<span><i class="sw line" style="background:${IDX_COLOR[id]}"></i>${esc(idxName(id))}</span>`).join('')}${state.measure === 'mwr' ? '<span><i class="sw line" style="background:var(--ink3)"></i>Money in</span>' : ''}</div>
    <div id="perfchart" class="chart"></div>
    <div class="row-between" style="margin-top:6px"><span class="muted small">Portfolio values are rebuilt from every trade at month-end and period-end prices; they agree with Scalable's own figures to within 1.5%.</span><button class="tablink" id="tv-perf">${state.tableView.perf ? 'Show chart' : 'View as table'}</button></div>
  </div>

  <div class="grid" style="margin-top:14px">
    <div class="panel s-12">
      <h3>Returns by period</h3><p class="sub">Time-weighted (TWR) and money-weighted (MWR), against ${esc(idxName(primary))}${sel.length > 1 ? ' and the other selected indices' : ''}</p>
      <div class="scoreboard"><table class="ret"><thead><tr><th>Period</th><th>TWR</th><th>MWR</th><th class="grp">${esc(idxName(primary))}</th><th>Same money</th>${sel.slice(1).map((id) => `<th>${esc(idxName(id))}</th>`).join('')}<th class="grp">Excess TWR</th></tr></thead><tbody>
      ${all.map((s) => { const e = s.twr - s.idx[primary].twr; const long = s.years > 1.05; return `<tr class="${s.k === state.tf ? 'sel' : ''}"><td>${esc(TFL[s.k])}</td><td class="you">${retCell(s.twr, s.twrAnn)}</td><td class="you">${long ? `${pctSpan(s.mwr, 1)}<span class="ann">p.a.</span>` : pctSpan(s.mwrPeriod, 1)}</td><td class="grp">${retCell(s.idx[primary].twr, long ? Math.pow(1 + s.idx[primary].twr, 1 / s.years) - 1 : null)}</td><td>${long ? `${pctSpan(s.idx[primary].mwr, 1)}<span class="ann">p.a.</span>` : pctSpan(periodFromAnnual(s.idx[primary].mwr, s.a.t, s.b.t), 1)}</td>${sel.slice(1).map((id) => `<td>${pctSpan(s.idx[id].twr, 1)}</td>`).join('')}<td class="grp"><b class="${cls(e)}">${(e >= 0 ? '+' : '−') + Math.abs(e * 100).toFixed(1)} pts</b></td></tr>`; }).join('')}
      </tbody></table></div>
      <p class="muted small" style="margin:10px 0 0">TWR chains the return of each sub-period between valuations, so it measures the decisions rather than the timing of deposits. MWR is the internal rate of return on the money actually invested. "Same money" gives ${esc(idxName(primary))} the same starting value and cash flows. Periods longer than a year also show the yearly rate.</p>
    </div>
    <div class="panel s-12">
      <h3>Monthly returns</h3><p class="sub">Time-weighted, month by month. The grey line under each year is ${esc(idxName(primary))}.</p>
      <div class="cal"><table><thead><tr><th></th>${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => `<th>${m}</th>`).join('')}<th>Year</th></tr></thead><tbody>
      ${years.map((y) => { const ms = PF.months.filter((m) => m.ym.startsWith(y)); const cell = (k) => ms.find((m) => +m.ym.slice(5) === k); const yr = ms.reduce((a, m) => a * (1 + m.r), 1) - 1, yb = ms.reduce((a, m) => a * (1 + m.idx[primary]), 1) - 1;
        return `<tr><td><b>${y}</b></td>${Array.from({ length: 12 }, (_, i) => { const m = cell(i + 1); return m ? `<td class="c" style="${heat(m.r)}" title="${esc(m.ym)}${m.partial ? ' (to date)' : ''}">${fmtSignedPct(m.r, 1)}</td>` : '<td></td>'; }).join('')}<td class="yr ${cls(yr)}">${fmtSignedPct(yr, 1)}</td></tr>
        <tr class="bm"><td>${esc(idxName(primary))}</td>${Array.from({ length: 12 }, (_, i) => { const m = cell(i + 1); return `<td>${m ? fmtSignedPct(m.idx[primary], 1) : ''}</td>`; }).join('')}<td class="yr">${fmtSignedPct(yb, 1)}</td></tr>`; }).join('')}
      </tbody></table></div>
      <p class="muted small" style="margin:8px 0 0">${worstM.t ? `The worst month, ${esc(ym(worstM.t))} (${fmtSignedPct(worstM.r, 0)}), came when the account was worth about ${fmtEUR0(PF.at(worstM.t - 31 * MS).v)}. Time-weighted figures that include it are dominated by it; money-weighted figures weight it by the money at stake.` : ''} Months marked "to date" are incomplete.</p>
    </div>

    <div class="panel s-6">
      <h3>Consistency · ${esc(TFL[state.tf])}</h3><p class="sub">From month-end time-weighted returns, against ${esc(idxName(primary))}</p>
      ${msYou && msIdx ? `<div class="scoreboard"><table><thead><tr><th></th><th>Portfolio</th><th>${esc(idxName(primary))}</th></tr></thead><tbody>
        <tr><td>Months</td><td>${msYou.n}</td><td>${msIdx.n}</td></tr>
        <tr><td>Positive months</td><td>${msYou.pos} (${Math.round((msYou.pos / msYou.n) * 100)}%)</td><td>${msIdx.pos} (${Math.round((msIdx.pos / msIdx.n) * 100)}%)</td></tr>
        <tr><td>Best month</td><td>${pctSpan(msYou.best, 1)}</td><td>${pctSpan(msIdx.best, 1)}</td></tr>
        <tr><td>Worst month</td><td>${pctSpan(msYou.worst, 1)}</td><td>${pctSpan(msIdx.worst, 1)}</td></tr>
        <tr><td>Volatility, yearly</td><td>${(msYou.vol * 100).toFixed(1)}%</td><td>${(msIdx.vol * 100).toFixed(1)}%</td></tr>
        <tr><td>Worst fall</td><td class="neg">${fmtSignedPct(msYou.dd, 1)}</td><td class="neg">${fmtSignedPct(msIdx.dd, 1)}</td></tr>
        <tr><td>Yearly return ÷ volatility</td><td>${fmtNum(msYou.ratio, 2)}</td><td>${fmtNum(msIdx.ratio, 2)}</td></tr>
        ${betaCorr ? `<tr><td>Beta · correlation</td><td>${fmtNum(betaCorr.beta, 2)} · ${fmtNum(betaCorr.corr, 2)}</td><td>1.00 · 1.00</td></tr>` : ''}
      </tbody></table></div>` : '<p class="muted">Needs at least three complete months. Choose a longer period.</p>'}
    </div>

    <div class="panel s-6">
      <h3>Where the ${fmtEUR0(M.total - M.net)} came from</h3><p class="sub">From net capital invested to today's value</p>
      <div class="wf">
        <div class="wf-row end"><span class="l">Net capital invested</span><span class="t"><i style="left:0;width:${X(M.net)}%"></i></span><b>${fmtEUR0(M.net)}</b></div>
        ${wf.map((w) => `<div class="wf-row"><span class="l">${esc(w.label)}<small>${esc(w.note)}</small></span><span class="t"><i class="${w.v < 0 ? 'n' : 'p'}" style="left:${X(Math.min(w.a, w.b))}%;width:${Math.max(0.4, Math.abs(X(w.b) - X(w.a)))}%"></i></span><b class="${cls(w.v)}">${w.v > 0 ? '+' : ''}${fmtEUR0(w.v)}</b></div>`).join('')}
        <div class="wf-row end"><span class="l">Value today</span><span class="t"><i style="left:0;width:${X(M.total)}%"></i></span><b>${fmtEUR0(M.total)}</b></div>
      </div>
    </div>
    <div class="panel s-12">
      <h3>Defining trades</h3><p class="sub">Largest realised gains and losses on closed positions</p>
      <div class="trades">
        <div><h4>Gains</h4><div class="lst">${best.map((r) => `<div class="li"><span class="n">${esc(r.name)}<small>${esc(dfmtS(r.last))}</small></span><b class="pos">${fmtSignedEUR(r.pl)}</b></div>`).join('')}</div></div>
        <div><h4>Losses</h4><div class="lst">${worst.map((r) => `<div class="li"><span class="n">${esc(r.name)}<small>${esc(dfmtS(r.last))}</small></span><b class="neg">${fmtSignedEUR(r.pl)}</b></div>`).join('')}</div></div>
      </div>
      <p class="muted small" style="margin:10px 0 0">The lessons drawn from the largest losses are set out under Philosophy.</p>
    </div>
  </div>`;

  $$('#t-record [data-tf]').forEach((b) => b.addEventListener('click', () => { state.tf = b.dataset.tf; renderRecord(); }));
  $$('#t-record [data-ms]').forEach((b) => b.addEventListener('click', () => { state.measure = b.dataset.ms; renderRecord(); }));
  $$('#t-record [data-ix]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.ix; state.idxSel = state.idxSel.includes(id) ? state.idxSel.filter((x) => x !== id) : state.idxSel.concat([id]);
    if (!state.idxSel.length) state.idxSel = [id];
    renderRecord();
  }));
  $('#tv-perf').addEventListener('click', () => { state.tableView.perf = !state.tableView.perf; renderRecord(); });

  // chart data: the portfolio's valuation dates plus daily index dates inside the window
  const a = st.a, b = st.b;
  const pp = PF.pts.filter((p) => p.t >= a.t && p.t <= b.t + 6 * 36e5);
  const extra = D.series.dates.map((d) => Date.parse(d + 'T21:00:00Z')).filter((t) => t > a.t && t < b.t);
  const xs = Array.from(new Set(pp.map((p) => p.t).concat(extra))).sort((x, y) => x - y);
  const you = xs.map((t) => { const p = pp.find((q) => q.t === t); return p ? p : null; });
  const fl = PF.fl.filter((f) => f[0] > a.t && f[0] <= b.t);
  let series, yFmt, tipVal;
  if (state.measure === 'twr') {
    series = [{ v: you.map((p) => (p ? (p.i / a.i - 1) * 100 : null)), color: 'var(--accent)', width: 2.5, label: 'Portfolio' }]
      .concat(sel.map((id) => ({ v: xs.map((t) => (PF.P[id](t) / PF.P[id](a.t) - 1) * 100), color: IDX_COLOR[id], width: 1.5, label: idxName(id) })));
    yFmt = (v) => Math.round(v) + '%'; tipVal = (v) => fmtSignedPct(v / 100, 1);
  } else {
    const units = (id, t) => a.v / PF.P[id](a.t) + C_sum(fl.filter((f) => f[0] <= t).map((f) => f[1] / PF.P[id](f[0])));
    series = [{ v: you.map((p) => (p ? p.v : null)), color: 'var(--accent)', width: 2.5, label: 'Portfolio' }]
      .concat(sel.map((id) => ({ v: xs.map((t) => units(id, t) * PF.P[id](t)), color: IDX_COLOR[id], width: 1.5, label: 'Same money in ' + idxName(id) })))
      .concat([{ v: xs.map((t) => a.v + C_sum(fl.filter((f) => f[0] <= t).map((f) => f[1]))), color: 'var(--ink3)', width: 1.25, dash: '4 4', label: 'Money in' }]);
    yFmt = (v) => (Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v))); tipVal = (v) => fmtEUR0(v);
  }
  mount($('#perfchart'), (h, w) => {
    if (state.tableView.perf) { h.innerHTML = tableTwin(['Date'].concat(series.map((s) => s.label)), xs.map((t, i) => [dfmt(isoDay(t))].concat(series.map((s) => (s.v[i] == null ? '–' : tipVal(s.v[i])))))); return; }
    lineChart(h, w, {
      x: xs, series, height: w < 520 ? 260 : 330, yFmt, zero: state.measure === 'twr' ? 0 : null, yMin: state.measure === 'mwr' ? 0 : null, aria: 'Portfolio against the selected indices',
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
  <div class="lede"><div><p class="kicker">Philosophy and process</p><h2>Eight to twelve stocks, each owned for a declared reason, each with a written exit</h2>
    <p>Concentration only works when every position can say why it is in the book and what would remove it. The framework borrows one specific edge from each of three investors, and the edge sets the holding period.</p></div></div>
  <div class="panel"><h3>Mandate</h3><dl class="mandate">${pr.mandate.map((m) => `<div><dt>${esc(m[0])}</dt><dd>${esc(m[1])}</dd></div>`).join('')}</dl></div>
  <div class="grid" style="margin-top:14px">
    ${Object.entries(pr.edges).map(([k, e]) => { const hs = inBook(k); return `<div class="panel s-4 edge">
      <div class="who">${esc(e.master)}</div><div class="nm">${esc(k)}</div><p>${esc(e.source)}.</p>
      <dl><div><dt>Horizon</dt><dd>${esc(e.horizon)}</dd></div><div><dt>Broken when</dt><dd>${esc(e.broken)}</dd></div></dl>
      <div class="inbook"><span class="k">In the book</span>${hs.length ? hs.map((h) => `<span class="chip">${esc(h.ticker)} <b>${(h.weight * 100).toFixed(0)}%</b></span>`).join('') : '<span class="muted">none yet</span>'}</div></div>`; }).join('')}
    <div class="panel s-6"><h3>From idea to position</h3><p class="sub">Every name goes through the same six steps</p>
      <ol class="steps">${pr.process.map((s) => `<li><b>${esc(s[0])}.</b> ${esc(s[1])}</li>`).join('')}</ol>
      <h3 style="margin-top:16px">The five criteria</h3>
      <ul class="criteria" style="margin-top:8px">${pr.criteria.map((c) => `<li><b>${esc(c[0])}</b><span>${esc(c[1])}</span></li>`).join('')}</ul></div>
    <div class="panel s-6"><h3>Cheap is not enough</h3><p class="sub">The two-axis screen applied after every reverse-DCF</p>
      <div class="axis2"><span class="ax-y">Growth the price requires</span><span class="ax-x">Forward return on capital</span><span class="hd c1">Rising</span><span class="hd c2">Flat or falling</span><span class="rl r1">Low</span><span class="rl r2">High</span>
        <div class="q good"><b>Mispricing</b>the target</div><div class="q bad"><b>Value trap</b>cheap for a reason</div><div class="q mid"><b>Fair</b>can be right for a long runway</div><div class="q bad"><b>Avoid</b></div></div>
      <h3 style="margin-top:16px">Passed on, and why</h3>
      <ul class="rejected" style="margin-top:8px">${pr.rejected.map((r) => `<li><b>${esc(r[0])}</b><span>${esc(r[1])}</span></li>`).join('')}</ul></div>
    <div class="panel s-12"><h3>What the record taught me</h3><p class="sub">Each lesson became a written rule</p>
      ${pr.lessons.map((l) => `<div class="lesson"><p>${esc(l.finding)}</p><p class="r"><span class="k">Rule</span>${esc(l.rule)}</p></div>`).join('')}</div>
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
  <div class="lede"><div><p class="kicker">Book and conviction</p><h2>${M.H.length} positions. ${declared} with a declared edge, ${kills} with a written kill-switch.</h2><p>The three largest positions are ${(top3 * 100).toFixed(0)}% of the book and ${(ai * 100).toFixed(0)}% sits in AI chips, memory and infrastructure. Analyst targets give the book ${fmtSignedPct(O.base, 0)} over 12 months; weighting bull, base and bear cases at ${PRESETS[state.preset].p.map((x) => Math.round(x * 100)).join('/')} gives ${fmtSignedPct(O.exp, 0)}. Select a position for the thesis, the exit and the evidence.</p></div></div>
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
  const R = M.risk, bench = benchOf(), pr = prOf(), O = portOutlook(pr), V = M.secValue;
  if (!R) { root.innerHTML = '<div class="panel empty">The outlook needs 12 months of prices for every position.</div>'; return; }
  const sigma = R.vol, beta = R.pBeta[bench.id], bVol = R.bVol[bench.id];
  const var95 = 1.645 * sigma * Math.sqrt(1 / 12) * V;
  const win = 10; let worstM = 0; for (let i = 0; i + win < R.bc.idx.length; i++) worstM = Math.min(worstM, R.bc.idx[i + win] / R.bc.idx[i] - 1);
  const stress = [
    ['Every stock hits its bear case', 'Lowest analyst target, or a repeat of its worst fall of the past year', O.bear],
    ['Repeat of the worst fall of the past year', `Today's mix, peak to trough between ${dfmt(R.al.dates[R.dd.peak], { year: '2-digit' })} and ${dfmt(R.al.dates[R.dd.trough], { year: '2-digit' })}`, R.dd.dd],
    [`${esc(bench.name)} falls 20%`, `At the mix's beta of ${fmtNum(beta, 2)}`, -0.2 * beta],
    ['Worst single month of the past year', 'Any rolling 10-observation window', worstM],
    ['A bad month, 1 in 20', 'One-month value at risk, 95%', -var95 / V],
  ];
  const sMax = Math.max(...stress.map((s) => Math.abs(s[2])));
  // range plot domain
  const cov = O.rows.filter((r) => r.sc);
  const dLo = Math.min(-0.1, ...cov.map((r) => r.sc.bear)), dHi = Math.max(0.1, ...cov.map((r) => r.sc.bull));
  const P = (v) => ((v - dLo) / (dHi - dLo)) * 100;
  // benchmark table
  const bc = R.bc.idx, bRet = (a) => a[a.length - 1] / a[0] - 1;
  const retsOf = (isin) => rets(R.al.p[isin]), selR = retsOf(bench.isin);
  const cmp = [{ name: 'Your mix today', ret: bRet(bc), vol: sigma, dd: R.dd.dd, beta, corr: R.pCorr[bench.id], you: true }].concat(M.D.benches.map((b) => ({ name: b.name, ret: bRet(R.al.p[b.isin]), vol: R.bVol[b.id], dd: R.bDD[b.id], beta: beta_(retsOf(b.isin), selR), corr: corr(retsOf(b.isin), selR) })));
  // realised by type
  const xs = R.al.dates.map(dayMs), bu = R.bUw[bench.id];
  const maxW = Math.max(...Object.values(R.wn), ...Object.values(R.rc));

  root.innerHTML = `
  <div class="lede"><div><p class="kicker">Risk and outlook</p><h2>${fmtSignedPct(O.exp, 0)} expected over 12 months, at ${(sigma / bVol).toFixed(1)}× the volatility of ${esc(BSHORT[bench.id])}</h2><p>Analyst targets turned into bull, base and bear cases per stock, weighted by the odds you choose. Sell-side targets lean optimistic, so the Cautious and Stress settings shift weight to the bear case. Risk statistics apply today's weights to the last 12 months of prices.</p></div>
    <div class="ctrls"><span class="lbl">Against</span><div class="seg" role="group" aria-label="Benchmark">${M.D.benches.map((b) => `<button data-rb="${b.id}" aria-pressed="${b.id === bench.id}">${esc(BSHORT[b.id] || b.name)}</button>`).join('')}</div></div></div>
  <div class="panel">
    <div class="row-between"><div><h3 style="margin:0">Next 12 months</h3><p class="sub" style="margin:2px 0 0">Analyst targets turned into three scenarios per stock, weighted by the odds you choose</p></div>
      <div class="seg" role="group" aria-label="Scenario odds">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}" aria-pressed="${k === state.preset}">${v.label}</button>`).join('')}</div></div>
    <p class="muted small" style="margin:8px 0 0">Odds of bull / base / bear: <b>${pr.map((x) => Math.round(x * 100) + '%').join(' / ')}</b>. Analyst view leans on the consensus; Cautious and Stress shift weight to the bear case, which sell-side targets tend to underplay.</p>
    <div class="kpis six" style="margin-top:10px">
      <div class="stat"><div class="k">Expected return</div><div class="v ${cls(O.exp)}">${fmtSignedPct(O.exp, 1)}</div><div class="n">${fmtSignedEUR(O.exp * V)} on ${fmtEUR0(V)}</div></div>
      <div class="stat"><div class="k">Consensus upside</div><div class="v ${cls(O.base)}">${fmtSignedPct(O.base, 1)}</div><div class="n">if every average target is met</div></div>
      <div class="stat"><div class="k">Bull · bear</div><div class="v"><span class="pos">${fmtSignedPct(O.bull, 0)}</span> <span class="muted">·</span> <span class="neg">${fmtSignedPct(O.bear, 0)}</span></div><div class="n">${fmtSignedEUR(O.bull * V)} · ${fmtSignedEUR(O.bear * V)}</div></div>
      <div class="stat"><div class="k">Volatility</div><div class="v">${(sigma * 100).toFixed(1)}%</div><div class="n">${(sigma / bVol).toFixed(1)}× ${esc(BSHORT[bench.id])}'s ${(bVol * 100).toFixed(1)}%</div></div>
      <div class="stat"><div class="k">Bad month, 1 in 20</div><div class="v neg">${fmtEUR0(-var95)}</div><div class="n">value at risk, 95%, one month</div></div>
      <div class="stat"><div class="k">Return per unit of risk</div><div class="v">${fmtNum(O.exp / sigma, 2)}</div><div class="n">expected return ÷ volatility; ${esc(BSHORT[bench.id])} ${fmtNum(REF_MU / bVol, 2)} at ${Math.round(REF_MU * 100)}%</div></div>
    </div>
  </div>

  <div class="grid" style="margin-top:14px">
    <div class="panel s-7">
      <h3>Range of outcomes for your shares</h3>
      <p class="sub">Value of today's ${fmtEUR0(V)} in shares month by month, if returns average ${fmtSignedPct(O.exp, 1)} a year with ${(sigma * 100).toFixed(0)}% volatility. Dashed: ${esc(bench.name)} at an assumed ${Math.round(REF_MU * 100)}% with its own volatility.</p>
      <div class="legend"><span><i class="sw line" style="background:var(--accent)"></i>Median</span><span><i class="sw" style="background:var(--accent);opacity:.32"></i>Middle half</span><span><i class="sw" style="background:var(--accent);opacity:.14"></i>9 in 10 outcomes</span><span><i class="sw line dash" style="color:var(--ink3)"></i>${esc(bench.name)} median</span></div>
      <div id="fan" class="chart"></div>
      <div class="row-between" style="margin-top:6px"><span class="muted small">A log-normal model on one year of prices. Real markets have fatter tails than this.</span><button class="tablink" id="tv-fan">${state.tableView.fan ? 'Show chart' : 'View as table'}</button></div>
    </div>
    <div class="panel s-5">
      <h3>Where the outlook comes from</h3>
      <p class="sub">Each stock's bear-to-bull range, with the average target and the weighted expectation</p>
      <div class="legend"><span><i class="dot neg-bg"></i>Bear</span><span><i class="tick"></i>Average target</span><span><i class="dot acc-bg"></i>Expected</span><span><i class="dot pos-bg"></i>Bull</span></div>
      <div class="rps">${O.rows.slice().sort((a, b) => (b.e || 0) * b.w - (a.e || 0) * a.w).map((r) => r.sc ? `<div class="rp-row" data-i="${r.h.isin}"><span class="nm">${esc(r.h.ticker || r.h.name)}<small>${(r.w * 100).toFixed(0)}%</small></span>
        <div class="rp"><i class="z" style="left:${P(0)}%"></i><i class="seg" style="left:${P(r.sc.bear)}%;width:${P(r.sc.bull) - P(r.sc.bear)}%"></i><i class="d bear" style="left:${P(r.sc.bear)}%"></i><i class="d bull" style="left:${P(r.sc.bull)}%"></i><i class="t" style="left:${P(r.sc.base)}%"></i><i class="d exp" style="left:${P(r.e)}%"></i></div>
        <b class="r ${cls(r.e)}">${fmtSignedPct(r.e, 0)}</b><span class="r muted">${r.e * r.w * V >= 0 ? '+' : ''}${fmtEUR0(r.e * r.w * V)}</span></div>` : `<div class="rp-row"><span class="nm">${esc(r.h.ticker || r.h.name)}<small>${(r.w * 100).toFixed(0)}%</small></span><span class="muted small">no analyst coverage</span><span></span><span></span></div>`).join('')}
        <div class="rp-axis"><span></span><div class="rp">${niceTicks(dLo, dHi, 4).filter((t) => t >= dLo && t <= dHi).map((t) => `<em style="left:${P(t)}%">${Math.round(t * 100)}%</em>`).join('')}</div><span class="r muted small">return</span><span class="r muted small">€ for you</span></div>
      </div>
    </div>

    <div class="panel s-6">
      <h3>Stress tests</h3>
      <p class="sub">What the shares would lose in each case, at today's ${fmtEUR0(V)}</p>
      <div class="lst">${stress.map((s) => `<div class="li st"><span class="n"><b>${s[0]}</b><small>${s[1]}</small></span><span class="sb"><i style="width:${(Math.abs(s[2]) / sMax) * 100}%"></i></span><b class="r neg">${fmtSignedPct(s[2], 0)}<br><span class="small">${fmtEUR0(s[2] * V)}</span></b></div>`).join('')}</div>
    </div>
    <div class="panel s-6">
      <h3>Falls from the peak</h3>
      <p class="sub">How far below its previous high each line stood over the last 12 months</p>
      <div class="legend"><span><i class="sw line" style="background:var(--accent)"></i>Your holdings</span><span><i class="sw line" style="background:var(--ink3)"></i>${esc(bench.name)}</span></div>
      <div id="ddchart" class="chart"></div>
    </div>

    <div class="panel s-12 flat">
      <div class="ph"><h3>Against the benchmarks, last 12 months</h3><p class="sub" style="margin:0">Today's mix back-cast at constant weights, next to the three index ETFs in euro. Beta and correlation are measured against ${esc(bench.name)}.</p></div>
      <div class="tbl-wrap"><table class="cmp"><thead><tr><th></th><th>Return</th><th>Volatility</th><th>Worst fall</th><th>Return ÷ volatility</th><th>Beta</th><th>Correlation</th></tr></thead><tbody>
        ${cmp.map((r) => `<tr class="${r.you ? 'sel' : ''}"><td>${r.you ? '<b>' + esc(r.name) + '</b>' : esc(r.name)}</td><td>${pctSpan(r.ret, 1)}</td><td>${(r.vol * 100).toFixed(1)}%</td><td class="neg">${fmtSignedPct(r.dd, 1)}</td><td>${fmtNum(r.ret / r.vol, 2)}</td><td>${fmtNum(r.beta, 2)}</td><td>${fmtNum(r.corr, 2)}</td></tr>`).join('')}
      </tbody></table></div>
    </div>

    <div class="panel s-5">
      <h3>Weight against share of risk</h3>
      <p class="sub">A stock that takes more risk than weight does more of the swinging</p>
      <div class="legend"><span><i class="sw" style="background:var(--line2)"></i>Weight</span><span><i class="sw" style="background:var(--accent)"></i>Share of risk</span></div>
      <div class="pairs">${M.H.filter((h) => R.wn[h.isin] != null).map((h) => `<div class="pair"><span class="pn">${esc(h.ticker || h.name)}</span><span class="bars"><i style="width:${(R.wn[h.isin] / maxW) * 100}%;background:var(--line2)"></i><i style="width:${(R.rc[h.isin] / maxW) * 100}%;background:var(--accent)"></i></span><span class="r">${(R.wn[h.isin] * 100).toFixed(0)}% → <b>${(R.rc[h.isin] * 100).toFixed(0)}%</b></span></div>`).join('')}</div>
    </div>
    <div class="panel s-7">
      <h3>How the stocks move together</h3>
      <p class="sub">Correlation of returns over 12 months. Darker cells move more closely together, so they offer less diversification.</p>
      <div class="hm" id="hm" style="grid-template-columns:minmax(44px,60px) repeat(${R.ids.length},minmax(0,1fr))"></div>
    </div>

  </div>`;

  $$('#t-risk [data-pre]').forEach((b) => b.addEventListener('click', () => { state.preset = b.dataset.pre; renderRisk(); renderBook(); }));
  $$('#t-risk [data-rb]').forEach((b) => b.addEventListener('click', () => { state.bench = b.dataset.rb; renderRisk(); }));
  $('#tv-fan').addEventListener('click', () => { state.tableView.fan = !state.tableView.fan; renderRisk(); });
  const fo = { V0: V, mu: O.exp, sigma, months: 12, t0: M.asOf, ref: { mu: REF_MU, sigma: bVol, label: BSHORT[bench.id] }, aria: 'Range of outcomes over twelve months' };
  mount($('#fan'), (host, w) => {
    if (state.tableView.fan) {
      const F = fanPoints(fo.V0, fo.mu, fo.sigma, 12), Rf = fanPoints(fo.V0, REF_MU, bVol, 12);
      const d0 = new Date(M.asOf);
      host.innerHTML = tableTwin(['Month', '5%', '25%', 'Median', '75%', '95%', `${fo.ref.label} median`], F.map((q, k) => [k === 0 ? 'Today' : mlabel(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, 1)), ...q.map(fmtEUR0), fmtEUR0(Rf[k][2])]));
      return;
    }
    fanChart(host, w, Object.assign({ height: w < 520 ? 250 : 300 }, fo));
  });
  mount($('#ddchart'), (host, w) => lineChart(host, w, {
    x: xs, series: [{ v: R.uw, color: 'var(--accent)', fill: true, fillTo: 0, fillOpacity: 0.12 }, { v: bu, color: 'var(--ink3)', width: 1.75 }], height: w < 520 ? 220 : 250, yMax: 0, zero: 0, yFmt: (v) => Math.round(v * 100) + '%', aria: 'Falls from the previous peak',
    tip: (i) => `<div class="th">${dfmt(isoDay(xs[i]))}</div>${trow('var(--accent)', 'Your holdings', fmtSignedPct(R.uw[i], 1), 1)}${trow('var(--ink3)', bench.name, fmtSignedPct(bu[i], 1), 1)}`,
  }));
  $$('#t-risk .rp-row[data-i]').forEach((el) => {
    const r = O.rows.find((x) => x.h.isin === el.dataset.i);
    const f = (e) => showTip(`<div class="th">${esc(r.h.name)} · ${(r.w * 100).toFixed(1)}% of shares</div>${trow('var(--pos)', 'Bull', fmtSignedPct(r.sc.bull, 0))}${trow('var(--ink2)', 'Average target', fmtSignedPct(r.sc.base, 0))}${trow('var(--neg)', r.sc.bearFromDD ? 'Bear (worst fall)' : 'Bear (low target)', fmtSignedPct(r.sc.bear, 0))}${trow('var(--accent)', 'Expected', `${fmtSignedPct(r.e, 1)} · ${fmtSignedEUR(r.e * r.w * V)}`)}`, e.clientX, e.clientY);
    el.addEventListener('pointermove', f); el.addEventListener('pointerleave', hideTip);
    el.addEventListener('click', () => selectHolding(r.h.isin, true));
  });
  const hm = $('#hm');
  const tk = (id) => esc(holdingBy(id).ticker || holdingBy(id).name.slice(0, 5));
  let cells = '<div class="hh"></div>' + R.ids.map((id) => `<div class="hh">${tk(id)}</div>`).join('');
  R.ids.forEach((a, i) => {
    cells += `<div class="hr">${tk(a)}</div>`;
    R.ids.forEach((b, j) => { const v = R.hm[i][j]; const pc = Math.round(Math.max(0, Math.min(1, v)) * 70); const bg = i === j ? 'var(--inset)' : `color-mix(in srgb, var(--accent) ${pc}%, var(--panel))`; cells += `<div data-a="${i}" data-b="${j}" style="background:${bg};color:${pc > 40 ? '#fff' : 'var(--ink)'}">${i === j ? '' : v.toFixed(2)}</div>`; });
  });
  hm.innerHTML = cells;
  $$('#hm [data-a]').forEach((c) => { const f = (e) => { const a = holdingBy(R.ids[+c.dataset.a]), b = holdingBy(R.ids[+c.dataset.b]); if (a === b) return; showTip(`<div class="th">${esc(a.name)} and ${esc(b.name)}</div>${trow('var(--accent)', 'Correlation', R.hm[+c.dataset.a][+c.dataset.b].toFixed(2))}`, e.clientX, e.clientY); }; c.addEventListener('pointermove', f); c.addEventListener('pointerleave', hideTip); });
}
const beta_ = (a, b) => beta(a, b);

/* ---------- notes ---------- */
function renderNotes() {
  const D = M.D, chk = (D.history.check || []).filter((c) => c.period !== 'now');
  const maxDev = chk.length ? Math.max(...chk.map((c) => Math.abs(c.pct))) : null;
  $('#notes').innerHTML = `<div class="foot">
    <h4>Method and sources</h4>
    <p><b>Data.</b> Positions, prices, gains and every transaction come from the Scalable Capital account, valued ${tfmt(D.meta.asOf)}, with transactions from ${dfmt(D.meta.ledgerFrom)}. All figures are in euro and after fees. Cost basis is first-in, first-out by custody account and matches the broker to within a euro per position.</p>
    <p><b>Value history.</b> The account's value at every month end and at the start of each period Scalable reports is rebuilt by replaying the transactions and pricing the holdings at month-end market prices (daily prices for the last year, prices from the account's own trades for small positions and crypto, and adjusted for share splits).${maxDev != null ? ` At the six dates where Scalable's own gains imply a value, the rebuilt figure is within ${maxDev.toFixed(1)}%.` : ''}</p>
    <p><b>Time-weighted return (TWR)</b> links the Modified Dietz return of each sub-period between valuations, so it is not distorted by deposits and withdrawals. <b>Money-weighted return (MWR)</b> is the internal rate of return on the starting value, every deposit and withdrawal, and the end value. <b>Same money</b> applies the same cash flows to an index ETF. Indices are the accumulating iShares ETFs on MSCI World, MSCI ACWI, S&amp;P 500, Nasdaq-100 and STOXX Europe 600, priced in euro.</p>
    <p><b>Risk and outlook.</b> Volatility, beta and drawdowns of the current book apply today's weights to the last 12 months of prices. Scenarios use sell-side 12-month targets collected on 1–2 October 2026, converted at that day's euro rate: bull is the highest target, base the average, and bear the lower of the lowest target and a repeat of the stock's worst fall of the past year. The range of outcomes is a log-normal model, and the ${Math.round(REF_MU * 100)}% index return is an assumption.</p>
    <p>Not investment advice. Past returns do not predict future returns.</p>
  </div>`;
}
