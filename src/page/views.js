/* ===== page part 2: the four tabs ===== */
const benchOf = () => M.D.benches.find((b) => b.id === state.bench) || M.D.benches[0];
const holdingBy = (isin) => M.H.find((h) => h.isin === isin);
const perfOf = (h, p) => (h.perf && h.perf[p] ? h.perf[p][0] : null);
const pctSpan = (x, d = 1) => `<span class="${cls(x)} num">${fmtSignedPct(x, d)}</span>`;
const eur0Span = (x) => `<span class="${cls(x)} num">${x > 0 ? '+' : ''}${fmtEUR0(x)}</span>`;
const BSHORT = { MSCI: 'MSCI World', SPX: 'S&P 500', NDX: 'Nasdaq-100' };
const prOf = () => PRESETS[state.preset].p;
const pts = (x, d = 1) => (x == null ? '–' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(d)} pts`);
const kEUR = (x) => '€' + (Math.abs(x) / 1000).toFixed(1) + 'k';

function portOutlook(pr) {
  const rows = M.H.map((h) => ({ h, w: h.value / M.secValue, sc: h.sc, e: expOf(h.sc, pr) }));
  const cov = rows.filter((r) => r.sc);
  const agg = (f) => C_sum(cov.map((r) => r.w * f(r)));
  return { rows, cover: C_sum(cov.map((r) => r.w)), exp: agg((r) => r.e), base: agg((r) => r.sc.base), bull: agg((r) => r.sc.bull), bear: agg((r) => r.sc.bear) };
}
function lede(kicker, thesis, deck) {
  return `<header class="lede"><p class="kicker">${kicker}</p><h2 class="thesis">${thesis}</h2>${deck ? `<p class="deck">${deck}</p>` : ''}</header>`;
}
const statStrip = (items) => `<div class="strip">${items.map((s) => `<div class="fig"><div class="k">${s[0]}</div><div class="v ${s[2] || ''}">${s[1]}</div><div class="n">${s[3] || ''}</div></div>`).join('')}</div>`;

/* ---------- masthead and tabs ---------- */
function renderHeader() {
  const D = M.D, pr = D.profile;
  $('#mh-name').textContent = pr.manager;
  $('#mh-strategy').textContent = pr.strategy;
  $('#mh-tag').textContent = pr.tagline;
  $('#mh-aum').innerHTML = `${fmtEUR0(M.total)} <span>book · ${M.H.length} positions</span>`;
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
function renderRecord() {
  const root = $('#t-record'); unmountWithin(root);
  const D = M.D, P = M.pme, S = D.ledger.summary, b = benchOf();
  const msci = P.bench.MSCI, pb = P.bench[b.id];
  const R = M.rows;
  const ex = (p) => (R[p].ret != null && R[p].bench.MSCI != null ? R[p].ret - R[p].bench.MSCI : null);
  const shares = D.ledger.realised.filter((r) => r.type === 'Shares');
  const wins = shares.filter((r) => r.pl > 0).length;
  const from = dfmt(isoDay(M.firstFlow), { day: undefined });
  const levRows = D.ledger.realised.filter((r) => r.type === 'Leveraged & certificates' && r.last);
  const levWhen = levRows.length ? dfmt(levRows.map((r) => r.last).sort()[levRows.length - 1], { day: undefined }) : '';

  // index-equivalent rows
  const cmp = [
    { name: 'The portfolio', value: P.you.value, irr: P.you.irr, you: true },
    { name: `Without the leveraged trades${levWhen ? ' (last closed ' + levWhen + ')' : ''}`, value: P.exLev.value, irr: P.exLev.irr, pro: true },
  ].filter((r) => !r.pro || M.lev < 0).concat(D.benches.filter((x) => P.bench[x.id]).map((x) => ({ name: `Same money in ${BSHORT[x.id] || x.name}`, value: P.bench[x.id].value, irr: P.bench[x.id].irr, id: x.id })));
  const beatEx = D.benches.filter((x) => P.bench[x.id] && P.exLev.value > P.bench[x.id].value).map((x) => BSHORT[x.id]);
  const lostEx = D.benches.filter((x) => P.bench[x.id] && P.exLev.value <= P.bench[x.id].value).map((x) => BSHORT[x.id]);
  const gap = P.you.value - msci.value;
  const join = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const story = (`Mirroring every deposit and withdrawal into MSCI World on the same day would be worth <b>${fmtEUR0(msci.value)}</b> today, ${fmtPct(msci.irr, 1)} a year: ${gap < 0 ? `${fmtEUR0(-gap)} more than the portfolio` : `${fmtEUR0(gap)} less than the portfolio`}.`
    + (M.lev < 0 ? ` Leveraged trades lost ${fmtEUR0(-M.lev)}${gap < 0 && M.lev < gap ? ', more than the whole gap' : ''}. Without them the book would stand at <b>${fmtEUR0(P.exLev.value)}</b>, ${fmtPct(P.exLev.irr, 1)} a year${beatEx.length ? `, ahead of ${join(beatEx)}` : ''}${lostEx.length ? `${beatEx.length ? ' and' : ','} behind ${join(lostEx)}` : ''}. Leverage has since been written out of the mandate.` : ''));

  // waterfall: from net capital to today's value
  const byType = (t) => C_sum(D.ledger.realised.filter((r) => r.type === t).map((r) => r.pl));
  const steps = [
    ['Closed share positions', byType('Shares'), `${wins} of ${shares.length} closed at a gain`],
    ['Open positions, unrealised', M.unreal, `${M.H.length} holdings at today's prices`],
    ['ETFs and ETCs', byType('ETFs & ETCs'), 'thematic and country ETFs, closed'],
    ['Dividends', M.incomeDiv, 'after withholding tax'],
    ['Crypto', byType('Crypto'), 'closed'],
    ['Interest and bonus', S.intTotal + S.bonTotal, ''],
    ['Platform fees', -S.feeTotal, 'subscription'],
    ['Leveraged products', byType('Leveraged & certificates'), `turbos and mini-futures${levWhen ? ', ' + levWhen : ''}`],
  ].filter((s) => Math.abs(s[1]) >= 0.5);
  const resid = M.total - M.net - C_sum(steps.map((s) => s[1]));
  if (Math.abs(resid) >= 5) steps.push(['Booking differences', resid, 'cash timing and rounding']);
  let cum = M.net; const wf = steps.map((s) => { const a = cum; cum += s[1]; return { label: s[0], v: s[1], note: s[2], a, b: cum }; });
  const hi = Math.max(M.total, M.net, ...wf.map((w) => Math.max(w.a, w.b))) * 1.02;
  const X = (v) => (v / hi) * 100;

  root.innerHTML = `
  ${lede(`Track record · ${from} to ${dfmt(isoDay(M.asOf), { day: undefined })}`,
    `${fmtEUR0(M.net)} of net capital has become ${fmtEUR0(M.total)}: ${fmtPct(M.irr, 1)} a year, money-weighted.`,
    `Every figure is after fees and after ${fmtEUR0(M.withdrawn)} of withdrawals, taken from the broker's own records. The comparison below gives the index the same deposits on the same days, which is how an allocator would check it.`)}
  ${statStrip([
    ['Since inception', fmtPct(M.irr, 1), 'pos', `a year · ${fmtSignedEUR(D.pl.MAX)} in total`],
    ['Last 6 months', pts(ex('6M')), cls(ex('6M')), `${fmtSignedPct(R['6M'].ret, 1)} against ${fmtSignedPct(R['6M'].bench.MSCI, 1)} for MSCI World`],
    ['Year to date', pts(ex('YTD')), cls(ex('YTD')), `${fmtSignedPct(R.YTD.ret, 1)} against ${fmtSignedPct(R.YTD.bench.MSCI, 1)}`],
    ['Closed share positions', `${wins} of ${shares.length}`, '', `profitable · ${fmtSignedEUR(byType('Shares'))} realised`],
  ])}

  <section class="sheet">
    <div class="sheet-h"><div><h3>The same money in the index</h3><p class="sub">Value today and money-weighted annual return on identical cash flows since ${dfmt(isoDay(M.firstFlow))}</p></div></div>
    <div class="split">
      <div class="tbl-wrap"><table class="cmp"><thead><tr><th></th><th>Value today</th><th>A year</th><th>Against the portfolio</th></tr></thead><tbody>
        ${cmp.map((r) => `<tr class="${r.you ? 'you' : r.pro ? 'pro' : ''}"><td>${esc(r.name)}</td><td>${fmtEUR0(r.value)}</td><td>${fmtPct(r.irr, 1)}</td><td>${r.you ? '' : eur0Span(P.you.value - r.value)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="prose">${story}</p>
    </div>
    <div class="row-between chart-h"><div class="legend"><span><i class="sw line" style="background:var(--accent)"></i>Portfolio value</span><span><i class="sw line" style="background:var(--ink3)"></i>Same money in ${esc(BSHORT[b.id])}</span><span><i class="sw line dash" style="color:var(--ink3)"></i>Net capital invested</span></div>
      <div class="seg" role="group" aria-label="Index">${D.benches.filter((x) => P.bench[x.id]).map((x) => `<button data-b="${x.id}" aria-pressed="${x.id === b.id}">${esc(BSHORT[x.id])}</button>`).join('')}</div></div>
    <div id="pmechart" class="chart"></div>
    <div class="row-between"><span class="foot-n">Scalable reports the portfolio's value only at period ends over the last year, so its line starts in ${dfmt(isoDay(M.anchors[0].t), { day: undefined })}.</span><button class="tablink" id="tv-pme">${state.tableView.pme ? 'Show chart' : 'View as table'}</button></div>
  </section>

  <div class="two">
    <section class="sheet">
      <h3>Returns by period</h3><p class="sub">Money-weighted, against the MSCI World ETF in euro</p>
      <div class="tbl-wrap"><table class="periods"><thead><tr><th>Period</th><th>Portfolio</th><th>MSCI World</th><th>Excess</th></tr></thead><tbody>
      ${['1M', '3M', '6M', 'YTD', '1Y'].map((p) => { const e = ex(p); return `<tr><td>${PLABEL[p]}</td><td>${pctSpan(R[p].ret, 1)}</td><td>${pctSpan(R[p].bench.MSCI, 1)}</td><td><span class="xb"><i class="${e < 0 ? 'n' : 'p'}" style="width:${Math.min(100, Math.abs(e || 0) / 0.12 * 100)}%"></i></span><b class="${cls(e)}">${pts(e)}</b></td></tr>`; }).join('')}
      <tr class="tot"><td>Since ${esc(from)}, a year</td><td>${pctSpan(M.irr, 1)}</td><td>${pctSpan(msci.irr, 1)}</td><td><span class="xb"><i class="${M.irr < msci.irr ? 'n' : 'p'}" style="width:${Math.min(100, Math.abs(M.irr - msci.irr) / 0.12 * 100)}%"></i></span><b class="${cls(M.irr - msci.irr)}">${pts(M.irr - msci.irr)}</b></td></tr>
      </tbody></table></div>
      ${M.lev < 0 ? `<p class="foot-n">Periods that include ${esc(levWhen)} carry the ${fmtEUR0(-M.lev)} leverage loss. Shorter periods since then are the cleanest read of the current process.</p>` : ''}
    </section>
    <section class="sheet">
      <h3>Where the ${fmtEUR0(M.total - M.net)} came from</h3><p class="sub">From net capital invested to today's value</p>
      <div class="wf">
        <div class="wf-row end"><span class="l">Net capital invested</span><span class="t"><i style="left:0;width:${X(M.net)}%"></i></span><b>${fmtEUR0(M.net)}</b></div>
        ${wf.map((w) => `<div class="wf-row"><span class="l">${esc(w.label)}<small>${esc(w.note)}</small></span><span class="t"><i class="${w.v < 0 ? 'n' : 'p'}" style="left:${X(Math.min(w.a, w.b))}%;width:${Math.max(0.4, Math.abs(X(w.b) - X(w.a)))}%"></i></span><b class="${cls(w.v)}">${w.v > 0 ? '+' : ''}${fmtEUR0(w.v)}</b></div>`).join('')}
        <div class="wf-row end"><span class="l">Value today</span><span class="t"><i style="left:0;width:${X(M.total)}%"></i></span><b>${fmtEUR0(M.total)}</b></div>
      </div>
    </section>
  </div>`;

  $$('#t-record [data-b]').forEach((x) => x.addEventListener('click', () => { state.bench = x.dataset.b; renderRecord(); }));
  $('#tv-pme').addEventListener('click', () => { state.tableView.pme = !state.tableView.pme; renderRecord(); });
  const anch = M.anchors.slice().sort((a, b2) => a.t - b2.t);
  const xs = Array.from(new Set(P.months.concat(anch.map((a) => a.t)))).sort((a, b2) => a - b2);
  const bv = xs.map((t) => pb.at(t)), nv = xs.map((t) => P.netAt(t)), yv = xs.map((t) => { const a = anch.find((q) => q.t === t); return a ? a.v : null; });
  mount($('#pmechart'), (h, w) => {
    if (state.tableView.pme) { h.innerHTML = tableTwin(['Date', 'Net capital', `Same money in ${BSHORT[b.id]}`, 'Portfolio'], xs.map((t, i) => [dfmt(isoDay(t)), fmtEUR0(nv[i]), fmtEUR0(bv[i]), yv[i] != null ? fmtEUR0(yv[i]) : '–'])); return; }
    lineChart(h, w, {
      x: xs, series: [{ v: nv, color: 'var(--ink3)', width: 1.25, dash: '4 4' }, { v: bv, color: 'var(--ink3)', width: 1.75 }, { v: yv, color: 'var(--accent)', width: 2.5, dots: true }],
      height: w < 520 ? 240 : 300, yMin: 0, yFmt: (v) => (v >= 1000 ? Math.round(v / 1000) + 'k' : String(v)), aria: 'Portfolio value against the same cash flows invested in the index',
      tip: (i) => `<div class="th">${dfmt(isoDay(xs[i]))}</div>${yv[i] != null ? trow('var(--accent)', 'Portfolio', fmtEUR0(yv[i]), 1) : ''}${trow('var(--ink3)', BSHORT[b.id], fmtEUR0(bv[i]), 1)}${trow('var(--ink3)', 'Net capital', fmtEUR0(nv[i]))}`,
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
  ${lede('Philosophy and process', 'Eight to twelve stocks, each owned for a declared reason, each with a written exit.', 'Concentration only works when every position can say why it is in the book and what would remove it. The framework borrows one specific edge from each of three investors, and the edge sets the holding period.')}
  <section class="sheet"><h3>Mandate</h3>
    <dl class="mandate">${pr.mandate.map((m) => `<div><dt>${esc(m[0])}</dt><dd>${esc(m[1])}</dd></div>`).join('')}</dl>
  </section>
  <div class="edges">${Object.entries(pr.edges).map(([k, e]) => { const hs = inBook(k); return `<section class="sheet edge">
    <p class="kicker">${esc(e.master)}</p><h3 class="edge-name">${esc(k)}</h3>
    <p>${esc(e.source)}.</p>
    <dl><div><dt>Horizon</dt><dd>${esc(e.horizon)}</dd></div><div><dt>Broken when</dt><dd>${esc(e.broken)}</dd></div></dl>
    <div class="inbook"><span class="k">In the book</span>${hs.length ? hs.map((h) => `<span class="chip">${esc(h.ticker)} <b>${(h.weight * 100).toFixed(0)}%</b></span>`).join('') : '<span class="muted">none yet</span>'}</div>
  </section>`; }).join('')}</div>
  <div class="two">
    <section class="sheet"><h3>From idea to position</h3><p class="sub">Every name goes through the same six steps</p>
      <ol class="steps">${pr.process.map((s) => `<li><b>${esc(s[0])}.</b> ${esc(s[1])}</li>`).join('')}</ol>
      <h4>The five criteria</h4>
      <ul class="criteria">${pr.criteria.map((c) => `<li><b>${esc(c[0])}</b><span>${esc(c[1])}</span></li>`).join('')}</ul>
    </section>
    <section class="sheet"><h3>Cheap is not enough</h3><p class="sub">The two-axis screen applied after every reverse-DCF</p>
      <div class="axis2">
        <span class="ax-y">Growth the price requires</span><span class="ax-x">Forward return on capital</span>
        <span class="hd c1">Rising</span><span class="hd c2">Flat or falling</span>
        <span class="rl r1">Low</span><span class="rl r2">High</span>
        <div class="q good"><b>Mispricing</b>the target</div><div class="q bad"><b>Value trap</b>cheap for a reason</div>
        <div class="q mid"><b>Fair</b>can be right for a long runway</div><div class="q bad"><b>Avoid</b></div>
      </div>
      <h4>Passed on, and why</h4>
      <ul class="rejected">${pr.rejected.map((r) => `<li><b>${esc(r[0])}</b><span>${esc(r[1])}</span></li>`).join('')}</ul>
    </section>
  </div>
  <section class="sheet"><h3>What the record taught me</h3><p class="sub">Each lesson became a written rule</p>
    <div class="lessons">${pr.lessons.map((l) => `<div class="lesson"><p class="f">${esc(l.finding)}</p><p class="r"><span class="k">Rule</span>${esc(l.rule)}</p></div>`).join('')}</div>
  </section>`;
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
  const pipe = M.D.profile.pipeline || [];
  if (state.open && !holdingBy(state.open)) state.open = null;

  root.innerHTML = `
  ${lede('Book and conviction', `${M.H.length} positions. ${declared} with a declared edge, ${kills} with a written kill-switch.`,
    `The three largest positions are ${(top3 * 100).toFixed(0)}% of the book and ${(ai * 100).toFixed(0)}% sits in AI chips, memory and infrastructure. Analyst targets give the book ${fmtSignedPct(O.base, 0)} over 12 months; weighting bull, base and bear cases at ${PRESETS[state.preset].p.map((x) => Math.round(x * 100)).join('/')} gives ${fmtSignedPct(O.exp, 0)}. Select a position for the thesis, the exit and the evidence.`)}
  <section class="sheet flush">
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
  </section>
  ${pipe.length ? `<section class="sheet"><h3>Pipeline</h3><p class="sub">Approved by the process with a target weight, waiting for an entry or a reverse-DCF</p>
    <div class="pipe">${pipe.map((p) => `<span class="chip">${esc(p[0])} <b>${p[1]}%</b> <span class="muted">${esc(p[2])}</span></span>`).join('')}</div></section>` : ''}`;

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

/* =====================================================================
   RISK AND OUTLOOK
   ===================================================================== */
function renderRisk() {
  const root = $('#t-risk'); unmountWithin(root);
  const R = M.risk, pr = prOf(), O = portOutlook(pr), V = M.secValue;
  if (!R) { root.innerHTML = lede('Risk and outlook', 'Risk statistics need 12 months of prices for every position.', ''); return; }
  const msci = M.D.benches.find((b) => b.id === 'MSCI') || M.D.benches[0];
  const sigma = R.vol, beta = R.pBeta[msci.id], bVol = R.bVol[msci.id];
  const var95 = 1.645 * sigma * Math.sqrt(1 / 12) * V;
  const win = 10; let worstM = 0; for (let i = 0; i + win < R.bc.idx.length; i++) worstM = Math.min(worstM, R.bc.idx[i + win] / R.bc.idx[i] - 1);
  const stress = [
    ['Every stock hits its bear case', 'lowest analyst target, or a repeat of its worst fall of the past year', O.bear],
    ['MSCI World falls 20%', `at the book's beta of ${fmtNum(beta, 2)}`, -0.2 * beta],
    ['Repeat of the worst fall of the past year', `${dfmt(R.al.dates[R.dd.peak], { year: '2-digit' })} to ${dfmt(R.al.dates[R.dd.trough], { year: '2-digit' })}, at today's weights`, R.dd.dd],
    ['Worst month of the past year', 'any rolling one-month window', worstM],
    ['A bad month, 1 in 20', 'one-month value at risk at 95%', -var95 / V],
  ];
  const sMax = Math.max(...stress.map((s) => Math.abs(s[2])));
  const themes = {}; M.H.forEach((h) => { if (R.wn[h.isin] == null) return; const t = themes[h.theme || 'Other'] || (themes[h.theme || 'Other'] = { w: 0, r: 0, n: [] }); t.w += R.wn[h.isin]; t.r += R.rc[h.isin]; t.n.push(h.ticker); });
  const th = Object.entries(themes).sort((a, b) => b[1].r - a[1].r);
  const effW = 1 / C_sum(Object.values(R.wn).map((x) => x * x));
  root.innerHTML = `
  ${lede('Risk and outlook', `${fmtSignedPct(O.exp, 0)} expected over 12 months, with a 1-in-20 bad month costing ${fmtEUR0(var95)}.`,
    `The book runs at ${(sigma / bVol).toFixed(1)} times the volatility of MSCI World with a beta of ${fmtNum(beta, 1)}. That is the price of concentration, and it is why every position carries a written exit. Expected returns come from analyst targets, which tend to be optimistic, so the odds can be shifted towards the bear case.`)}
  <div class="row-between preset"><span class="k">Odds of bull, base and bear</span><div class="seg" role="group" aria-label="Scenario odds">${Object.entries(PRESETS).map(([k, v]) => `<button data-pre="${k}" aria-pressed="${k === state.preset}">${v.label} <span class="muted">${v.p.map((x) => Math.round(x * 100)).join('/')}</span></button>`).join('')}</div></div>
  ${statStrip([
    ['Expected return, 12 months', fmtSignedPct(O.exp, 1), cls(O.exp), `${fmtSignedEUR(O.exp * V)} · consensus alone ${fmtSignedPct(O.base, 0)}`],
    ['Volatility', (sigma * 100).toFixed(1) + '%', '', `MSCI World ${(bVol * 100).toFixed(1)}%`],
    ['Worst fall, past year', fmtSignedPct(R.dd.dd, 1), 'neg', `MSCI World ${fmtSignedPct(R.bDD[msci.id], 1)}`],
    ['Return per unit of risk', fmtNum(O.exp / sigma, 2), '', `MSCI World ${fmtNum(REF_MU / bVol, 2)} at an assumed ${Math.round(REF_MU * 100)}%`],
  ])}
  <section class="sheet">
    <h3>Range of outcomes for the next 12 months</h3><p class="sub">Today's ${fmtEUR0(V)} in shares, if returns average ${fmtSignedPct(O.exp, 1)} a year at ${(sigma * 100).toFixed(0)}% volatility. Dashed: MSCI World at ${Math.round(REF_MU * 100)}% with its own volatility.</p>
    <div class="legend"><span><i class="sw line" style="background:var(--accent)"></i>Median</span><span><i class="sw" style="background:var(--accent);opacity:.35"></i>Middle half</span><span><i class="sw" style="background:var(--accent);opacity:.15"></i>9 in 10 outcomes</span><span><i class="sw line dash" style="color:var(--ink3)"></i>MSCI World median</span></div>
    <div id="fan" class="chart"></div>
    <div class="row-between"><span class="foot-n">A log-normal model on one year of prices. Real markets have fatter tails.</span><button class="tablink" id="tv-fan">${state.tableView.fan ? 'Show chart' : 'View as table'}</button></div>
  </section>
  <div class="two">
    <section class="sheet"><h3>Stress tests</h3><p class="sub">Loss on today's ${fmtEUR0(V)} in shares</p>
      <div class="stress">${stress.map((s) => `<div class="st"><span class="l"><b>${s[0]}</b><small>${s[1]}</small></span><span class="t"><i style="width:${(Math.abs(s[2]) / sMax) * 100}%"></i></span><b class="neg">${fmtSignedPct(s[2], 0)}<small>${fmtEUR0(s[2] * V)}</small></b></div>`).join('')}</div>
    </section>
    <section class="sheet"><h3>Where the risk sits</h3><p class="sub">Share of capital against share of portfolio variance, by theme · ${fmtNum(effW, 1)} effective positions by weight</p>
      <div class="tbl-wrap"><table class="themes"><thead><tr><th>Theme</th><th>Capital</th><th>Risk</th></tr></thead><tbody>
      ${th.map(([k, t]) => `<tr><td>${esc(k)}<small>${t.n.map(esc).join(' · ')}</small></td><td><span class="tb"><i class="w" style="width:${t.w * 100}%"></i></span>${(t.w * 100).toFixed(0)}%</td><td><span class="tb"><i class="r" style="width:${t.r * 100}%"></i></span><b>${(t.r * 100).toFixed(0)}%</b></td></tr>`).join('')}
      </tbody></table></div>
      <p class="foot-n">Correlation with MSCI World ${fmtNum(R.pCorr[msci.id], 2)}. Every holding is a dollar listing, so the euro-dollar rate moves the whole book.</p>
    </section>
  </div>`;
  $$('#t-risk [data-pre]').forEach((b) => b.addEventListener('click', () => { state.preset = b.dataset.pre; renderRisk(); renderBook(); }));
  $('#tv-fan').addEventListener('click', () => { state.tableView.fan = !state.tableView.fan; renderRisk(); });
  const fo = { V0: V, mu: O.exp, sigma, months: 12, t0: M.asOf, ref: { mu: REF_MU, sigma: bVol, label: 'MSCI World' }, aria: 'Range of outcomes over twelve months' };
  mount($('#fan'), (host, w) => {
    if (state.tableView.fan) {
      const F = fanPoints(fo.V0, fo.mu, fo.sigma, 12), Rf = fanPoints(fo.V0, REF_MU, bVol, 12), d0 = new Date(M.asOf);
      host.innerHTML = tableTwin(['Month', '5%', '25%', 'Median', '75%', '95%', 'MSCI World median'], F.map((q, k) => [k === 0 ? 'Today' : mlabel(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, 1)), ...q.map(fmtEUR0), fmtEUR0(Rf[k][2])]));
      return;
    }
    fanChart(host, w, Object.assign({ height: w < 520 ? 250 : 300 }, fo));
  });
}

/* ---------- notes ---------- */
function renderNotes() {
  const D = M.D;
  $('#notes').innerHTML = `<div class="foot">
    <h4>Method and sources</h4>
    <p>Positions, prices, period returns and transactions come from the Scalable Capital account, valued ${tfmt(D.meta.asOf)}, with every transaction from ${dfmt(D.meta.ledgerFrom)}. All figures are in euro and after fees. Cost basis is first-in, first-out by custody account and matches the broker to within a euro per position; the rebuilt ledger agrees with the broker's all-time gain to within 0.5%.</p>
    <p>Period returns are the broker's gain divided by the starting value plus time-weighted deposits and withdrawals (Modified Dietz). The since-inception rate is an internal rate of return on every cash flow. The index comparison mirrors each cash flow into the iShares MSCI World, S&amp;P 500 or Nasdaq-100 ETF on the same day, using daily prices for the last year and month-end prices before that. The figure without the leverage trades adds back their realised loss and ignores what that capital would have earned since, so it understates rather than flatters.</p>
    <p>Volatility, beta and drawdowns apply today's weights to the last 12 months of prices. Scenarios use sell-side 12-month targets collected on 1–2 October 2026, converted at that day's euro rate: bull is the highest target, base the average, bear the lower of the lowest target and a repeat of the stock's worst fall of the past year.</p>
    <p>Not investment advice. Past returns do not predict future returns.</p>
  </div>`;
}
