/* ===== page part 1: helpers, state, model and chart toolkit ===== */
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MS = 864e5;
const PERIODS = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y'];
const PLABEL = { '1D': 'Today', '1W': '1 week', '1M': '1 month', '3M': '3 months', '6M': '6 months', YTD: 'Year to date', '1Y': '1 year', MAX: 'Since Feb 2024' };
const cls = (x) => (x > 0 ? 'pos' : x < 0 ? 'neg' : '');
const arrow = (x) => (x > 0 ? '▲' : x < 0 ? '▼' : '◆');
const dfmt = (s, o) => new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('en-GB', Object.assign({ day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }, o || {}));
const dfmtS = (s) => dfmt(s, { year: '2-digit' });
const tfmt = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const qtyFmt = (q) => (Math.abs(q - Math.round(q)) < 1e-9 ? String(Math.round(q)) : fmtNum(q, 4));
const px = (x) => (x >= 100 ? fmtNum(x, 2) : x >= 10 ? fmtNum(x, 2) : fmtNum(x, 3));
const dayMs = (s) => Date.parse(s.length === 10 ? s + 'T12:00:00Z' : s.length === 16 ? s + ':00Z' : s);

/* ---------- state ---------- */
const TABS = [['record', 'Performance'], ['book', 'Portfolio'], ['risk', 'Outlook']];
const state = { tab: 'record', bench: 'MSCI', tf: '1Y', measure: 'twr', hz: 12, obench: 'SPX', open: null, preset: 'analyst', mode: 'snapshot', statusMsg: '', tableView: {}, commentary: {}, dbReady: false };
/* scenario probabilities: bull, base, bear */
const PRESETS = { analyst: { label: 'Consensus', p: [0.25, 0.5, 0.25] }, cautious: { label: 'Cautious', p: [0.15, 0.45, 0.4] }, stress: { label: 'Stress', p: [0.05, 0.35, 0.6] } };
const REF_MU = 0.07; // assumed long-run annual return for the benchmark reference
let DATA_ACTIVE = null; // snapshot or live-merged
/* The public build (pipeline/build_public.js): money rescaled so the stock book is 100 today, picks
   anonymised, per-stock risk shipped as book totals. PUB switches the few places that show money. */
const PUB = typeof DATA !== 'undefined' && !!(DATA && DATA.public);
const money0 = (v) => (PUB ? fmtNum(v, 1) : fmtEUR0(v));
let M = null; // derived model

/* ---------- period maths ---------- */
function periodStart(p, asOf, firstFlow) {
  const d = new Date(asOf), y = d.getUTCFullYear(), mo = d.getUTCMonth(), da = d.getUTCDate();
  const at = (yy, mm, dd) => Date.UTC(yy, mm, dd, 20, 0, 0);
  switch (p) {
    case '1D': { let t = at(y, mo, da - 1); const wd = new Date(t).getUTCDay(); if (wd === 0) t -= 2 * MS; else if (wd === 6) t -= MS; return t; }
    case '1W': return at(y, mo, da - 7);
    case '1M': return at(y, mo - 1, da);
    case '3M': return at(y, mo - 3, da);
    case '6M': return at(y, mo - 6, da);
    case 'YTD': return at(y - 1, 11, 31);
    case '1Y': return at(y - 1, mo, da - 1);
    default: return firstFlow;
  }
}

/* ---------- model ---------- */
function alignSeries(ser, ids) {
  // intersect dates across ids; ser[id] = {d:[YYYY-MM-DD], p:[...]}
  let common = null;
  for (const id of ids) {
    const s = ser[id];
    if (!s) return null;
    const set = new Set(s.d);
    common = common ? common.filter((d) => set.has(d)) : s.d.slice();
  }
  if (!common || common.length < 20) return null;
  const out = { dates: common, p: {} };
  for (const id of ids) {
    const m = new Map(ser[id].d.map((d, i) => [d, ser[id].p[i]]));
    out.p[id] = common.map((d) => m.get(d));
  }
  return out;
}

function buildModel(D) {
  const asOf = Date.parse(D.meta.asOf);
  const H = D.holdings.map((h) => {
    const value = h.qty * h.price;
    const pnl = h.cost != null ? value - h.cost : null;
    return { ...h, value, avg: h.cost != null ? h.cost / h.qty : null, pnl, pnlPct: h.cost ? pnl / h.cost : null };
  }).sort((a, b) => b.value - a.value);
  const secValue = C_sum(H.map((h) => h.value));
  H.forEach((h) => { h.weight = h.value / secValue; });
  const total = D.total;
  const flows = D.flows.map((f) => ({ t: dayMs(f.d), amt: f.a, k: f.k })).sort((a, b) => a.t - b.t);
  const firstFlow = flows[0].t;
  // series
  const SER = D.ser; // per-isin {d,p}
  const hIds = H.filter((h) => SER[h.isin] && SER[h.isin].p.length >= 20).map((h) => h.isin), bIds = D.benches.map((b) => b.isin);
  const al = alignSeries(SER, hIds.concat(bIds));
  // returns & risk
  let risk = null;
  if (al && !PUB) {
    const w = Object.fromEntries(H.filter((h) => hIds.includes(h.isin)).map((h) => [h.isin, h.value]));
    const wtot = C_sum(Object.values(w));
    const wn = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / wtot]));
    const bc = backcast(wn, al.p, 100);
    const retsH = Object.fromEntries(hIds.map((id) => [id, rets(al.p[id])]));
    const retsB = Object.fromEntries(bIds.map((id) => [id, rets(al.p[id])]));
    const rc = riskContrib(wn, al.p);
    const hm = hIds.map((a) => hIds.map((b) => (a === b ? 1 : corr(retsH[a], retsH[b]))));
    risk = {
      al, wn, bc, vol: annVol(bc.rets), dd: maxDrawdown(bc.idx), uw: underwater(bc.idx),
      hVol: Object.fromEntries(hIds.map((id) => [id, annVol(retsH[id])])),
      hDD: Object.fromEntries(hIds.map((id) => [id, maxDrawdown(al.p[id]).dd])),
      hBeta: Object.fromEntries(D.benches.map((b) => [b.id, Object.fromEntries(hIds.map((id) => [id, beta(retsH[id], retsB[b.isin])]))])),
      pBeta: Object.fromEntries(D.benches.map((b) => [b.id, beta(bc.rets, retsB[b.isin])])),
      pCorr: Object.fromEntries(D.benches.map((b) => [b.id, corr(bc.rets, retsB[b.isin])])),
      bVol: Object.fromEntries(D.benches.map((b) => [b.id, annVol(retsB[b.isin])])),
      bDD: Object.fromEntries(D.benches.map((b) => [b.id, maxDrawdown(al.p[b.isin]).dd])),
      bUw: Object.fromEntries(D.benches.map((b) => [b.id, underwater(al.p[b.isin])])),
      bIdx: Object.fromEntries(D.benches.map((b) => [b.id, al.p[b.isin].map((v) => (v / al.p[b.isin][0]) * 100)])),
      rc: rc.contrib, hm, ids: hIds,
    };
  }
  if (PUB) risk = Object.assign({}, D.public.risk); // computed from the full data by build_public.js
  // period table
  const rows = {};
  for (const p of PERIODS) {
    const t0 = periodStart(p, asOf, firstFlow);
    const md = modifiedDietz(D.pl[p], total, flows, t0, asOf);
    rows[p] = { p, pnl: D.pl[p], ret: md.ret, vStart: md.vStart, net: md.net, t0, bench: Object.fromEntries(D.benches.map((b) => [b.id, b.perf[p] ? b.perf[p][0] : null])) };
  }
  const cfs = flows.map((f) => ({ t: f.t, amt: -f.amt })).concat([{ t: asOf, amt: total }]).sort((a, b) => a.t - b.t);
  const irr = xirr(cfs);
  rows.MAX = { p: 'MAX', pnl: D.pl.MAX, ret: irr, t0: firstFlow, annual: true };
  // anchors for value chart
  const netAt = (t) => C_sum(flows.filter((f) => f.t <= t).map((f) => f.amt));
  const anchors = ['1Y', 'YTD', '6M', '3M', '1M', '1W', '1D'].map((p) => { const t = rows[p].t0; return { t, v: netAt(t) + D.pl.MAX - D.pl[p], p }; });
  anchors.push({ t: asOf, v: total, p: 'now' });
  const deposited = C_sum(flows.filter((f) => f.amt > 0 && f.k !== 'bon').map((f) => f.amt));
  const withdrawn = -C_sum(flows.filter((f) => f.amt < 0).map((f) => f.amt));
  const unreal = C_sum(H.filter((h) => h.pnl != null).map((h) => h.pnl));
  const L = D.ledger.summary;
  const incomeDiv = C_sum(D.ledger.divAll.map((d) => d[2]));
  const hhi = C_sum(H.map((h) => (h.value / secValue) ** 2));
  H.forEach((h) => { h.sc = PUB ? h.scPre || null : scenarios(h, risk); });
  const lev = C_sum(D.ledger.realised.filter((r) => r.type === 'Leveraged & certificates').map((r) => r.pl));
  const perf = perfModel(D, asOf, D.history.scope === 'stocks' ? secValue : total);
  return { D, asOf, H, total, lev, perf, cash: D.cash, secValue, flows, firstFlow, risk, rows, irr, anchors, deposited, withdrawn, net: deposited - withdrawn, unreal, realised: L.realisedTotal + L.realisedCrypto, incomeDiv, hhi, effN: 1 / hhi };
}
const C_sum = (a) => a.reduce((s, x) => s + x, 0);

/* ---------- track record: time- and money-weighted returns ----------
   The valuation history is rebuilt from the ledger and market prices (pipeline/history.js); the last point is
   replaced by the current value so a live refresh moves it. Index prices: daily where the 12-month series
   covers the date, month-end before that, interpolated geometrically in between. */
const TF = [['1M', '1 month'], ['3M', '3 months'], ['6M', '6 months'], ['YTD', 'Year to date'], ['1Y', '1 year'], ['Y2025', '2025'], ['Y2024', '2024'], ['SI', 'Max']];
const TFL = Object.fromEntries(TF);
function indexPriceFn(D, isin) {
  const dd = D.indexDaily && D.indexDaily[isin];
  const daily = dd ? dd.d.map((d, i) => [Date.parse(d + 'T21:00:00Z'), dd.p[i]]) : D.ser[isin] ? D.ser[isin].d.map((d, i) => [Date.parse(d + 'T21:00:00Z'), D.ser[isin].p[i]]) : [];
  const first = daily.length ? daily[0][0] : Infinity;
  const m = D.benchMonthly[isin];
  let pts = [];
  if (m) { const [y, mo] = m.start.split('-').map(Number); pts = m.p.map((p, k) => [Date.UTC(y, mo - 1 + k + 1, 0, 21), p]).filter((x) => x[0] < first); }
  pts = pts.concat(daily);
  // last close on or before t (binary search)
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pts[mid][0] <= t + 36e5) lo = mid; else hi = mid - 1; }
    return pts[lo][1];
  };
}
function perfModel(D, asOf, total) {
  const pts = D.history.points.map(([t, v, net]) => ({ t, v, net }));
  const fl = D.history.external;
  const last = pts[pts.length - 1];
  if (Math.abs(last.t - asOf) < 2 * MS) { last.t = Math.max(last.t, asOf); last.v = total; } else pts.push({ t: asOf, v: total, net: last.net });
  const T = twrIndex(pts, fl);
  pts.forEach((p, i) => { p.i = T.idx[i]; });
  const P = Object.fromEntries(D.indices.map((x) => [x.id, indexPriceFn(D, x.isin)]));
  const first = pts[1] ? pts[0].t : asOf;
  const ye = (y) => Date.UTC(y, 11, 31, 21);
  const at = (t) => { let best = pts[0]; for (const p of pts) { if (p.t <= t + 6 * 36e5) best = p; else break; } return best; };
  const win = (k) => {
    const t1 = asOf;
    switch (k) {
      case 'Y2024': return [first, ye(2024)];
      case 'Y2025': return [ye(2024), ye(2025)];
      case 'SI': return [first, t1];
      default: return [periodStart(k, asOf, first), t1];
    }
  };
  const flowsIn = (t0, t1) => fl.filter((f) => f[0] > t0 && f[0] <= t1);
  function stats(k) {
    const [t0, t1] = win(k), a = at(t0), b = at(t1);
    const years = (b.t - a.t) / (365 * MS);
    const twr = b.i / a.i - 1;
    const mwr = mwrWindow(a.v, a.t, b.v, b.t, fl);
    const gain = b.v - a.v - C_sum(flowsIn(a.t, b.t).map((f) => f[1]));
    const idx = {};
    D.indices.forEach((x) => {
      const p = P[x.id], p0 = p(a.t), p1 = p(b.t);
      let units = a.v / p0; flowsIn(a.t, b.t).forEach((f) => { units += f[1] / p(f[0]); });
      const vEnd = units * p1;
      idx[x.id] = { twr: p1 / p0 - 1, mwr: mwrWindow(a.v, a.t, vEnd, b.t, fl), value: vEnd };
    });
    return { k, a, b, years, twr, twrAnn: years > 1.05 ? Math.pow(1 + twr, 1 / years) - 1 : null, mwr, mwrPeriod: years > 1.05 ? null : periodFromAnnual(mwr, a.t, b.t), gain, idx };
  }
  // month-end returns for the calendar table and the consistency statistics
  const months = [];
  const isME = (t) => new Date(t + MS).getUTCDate() === 1;
  const seen = new Set();
  const meU = [pts[0]].concat(pts.filter((p) => isME(p.t)), [pts[pts.length - 1]]).filter((p) => { const key = p === pts[0] ? 'start' : new Date(p.t).toISOString().slice(0, 7); if (seen.has(key)) return false; seen.add(key); return true; });
  for (let j = 1; j < meU.length; j++) {
    const a = meU[j - 1], b = meU[j];
    months.push({ t: b.t, ym: new Date(b.t).toISOString().slice(0, 7), r: b.i / a.i - 1, idx: Object.fromEntries(D.indices.map((x) => [x.id, P[x.id](b.t) / P[x.id](a.t) - 1])), partial: !isME(b.t) });
  }
  return { pts, fl, P, win, stats, at, months, first };
}

/* 12-month scenarios per holding from sell-side targets. Targets are in dollars; they are converted at the
   euro/dollar rate implied when the research was taken (refEur / refUsd), so the upside is currency-neutral.
   Bear is the lower of the lowest analyst target and a repeat of the stock's worst fall of the past year. */
function scenarios(h, risk) {
  const r = h.research; if (!r || !r.cons || !r.refEur || !h.price) return null;
  const c = r.cons, k = r.refEur / c.refUsd, now = h.price;
  const dd = risk && risk.hDD[h.isin] != null ? risk.hDD[h.isin] : null;
  const tLow = c.low * k, tBase = c.avg * k, tBull = c.high * k;
  const low = tLow / now - 1, base = tBase / now - 1, bull = tBull / now - 1;
  const bear = dd != null ? Math.min(low, dd) : low;
  return { bull, base, bear, low, tBull, tBase, tLow, tBear: now * (1 + bear), bearFromDD: dd != null && dd < low, dd };
}
const expOf = (sc, pr) => (sc ? pr[0] * sc.bull + pr[1] * sc.base + pr[2] * sc.bear : null);

const safeUrl = (u) => (/^https:\/\/[^\s"'<>]+$/.test(u || '') ? u : null);

/* ---------- tooltip ---------- */
const tip = { el: null };
function showTip(html, cx, cy) {
  if (!tip.el) tip.el = $('#tip');
  const el = tip.el; el.innerHTML = html; el.classList.add('on');
  const r = el.getBoundingClientRect(), W = window.innerWidth;
  let x = cx + 14, y = cy + 14;
  if (x + r.width > W - 8) x = cx - r.width - 14;
  if (x < 8) x = 8;
  if (y + r.height > window.innerHeight - 8) y = cy - r.height - 14;
  el.style.left = x + 'px'; el.style.top = Math.max(8, y) + 'px';
}
const hideTip = () => { if (tip.el || (tip.el = $('#tip'))) tip.el.classList.remove('on'); };
const trow = (color, label, val, line) => `<div class="tr"><span><i class="sw${line ? ' line' : ''}" style="background:${color}"></i>${esc(label)}</span><b>${val}</b></div>`;

/* ---------- chart mounting ---------- */
const mounts = new Map();
const ro = new ResizeObserver((entries) => entries.forEach((e) => { const h = e.target; const w = Math.round(e.contentRect.width); if (mounts.has(h) && h._w !== w) drawHost(h); }));
function drawHost(h) { const fn = mounts.get(h); if (!fn) return; h._w = Math.round(h.clientWidth); if (h._w < 120) return; fn(h, h._w); }
function mount(host, fn) { if (!host) return; if (!mounts.has(host)) ro.observe(host); mounts.set(host, fn); drawHost(host); }
function unmountWithin(root) { mounts.forEach((_, h) => { if (root.contains(h)) { ro.unobserve(h); mounts.delete(h); } }); }

/* ---------- scales ---------- */
function niceNum(r, round) {
  const e = Math.floor(Math.log10(r)), f = r / Math.pow(10, e);
  let nf;
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10; else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * Math.pow(10, e);
}
function niceTicks(lo, hi, n) {
  if (!(hi > lo)) { hi = lo + 1; }
  const step = niceNum((hi - lo) / Math.max(1, n - 1), true);
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  const t = [];
  for (let v = a; v <= b + step / 2; v += step) t.push(+v.toFixed(10));
  return t;
}
function monthTicks(x0, x1, maxN) {
  const out = [];
  const d = new Date(x0); let y = d.getUTCFullYear(), m = d.getUTCMonth() + (d.getUTCDate() > 1 ? 1 : 0);
  const all = [];
  for (;;) { const t = Date.UTC(y, m, 1); if (t > x1) break; all.push(t); m++; if (m > 11) { m = 0; y++; } }
  const step = Math.max(1, Math.ceil(all.length / maxN));
  for (let i = 0; i < all.length; i += step) out.push(all[i]);
  return out;
}
const mlabel = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

/* ---------- line chart ---------- */
function lineChart(host, w, o) {
  const h = o.height || 260, m = Object.assign({ l: 46, r: 16, t: 10, b: 26 }, o.m || {});
  const iw = w - m.l - m.r, ih = h - m.t - m.b;
  const xs = o.x;
  const x0 = o.xMin != null ? o.xMin : xs[0], x1 = o.xMax != null ? o.xMax : xs[xs.length - 1];
  let lo = Infinity, hi = -Infinity;
  o.series.forEach((s) => s.v.forEach((v) => { if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; } }));
  (o.hlines || []).forEach((l) => { lo = Math.min(lo, l.y); hi = Math.max(hi, l.y); });
  if (o.yMin != null) lo = o.yMin;
  if (o.yMax != null) hi = o.yMax;
  const ticks = niceTicks(lo, hi, o.yTicks || 5);
  const ymin = o.yMin != null ? Math.min(o.yMin, ticks[0]) : ticks[0], ymax = ticks[ticks.length - 1];
  const X = (t) => m.l + ((t - x0) / (x1 - x0 || 1)) * iw;
  const Y = (v) => m.t + (1 - (v - ymin) / (ymax - ymin || 1)) * ih;
  let g = '';
  ticks.forEach((tv) => { const y = Math.round(Y(tv)) + 0.5; g += `<line class="gl" x1="${m.l}" x2="${m.l + iw}" y1="${y}" y2="${y}"/><text x="${m.l - 8}" y="${y + 4}" text-anchor="end">${esc(o.yFmt ? o.yFmt(tv) : tv)}</text>`; });
  if (o.zero != null) { const y = Math.round(Y(o.zero)) + 0.5; g += `<line class="base" x1="${m.l}" x2="${m.l + iw}" y1="${y}" y2="${y}"/>`; }
  (o.xTicks || monthTicks(x0, x1, Math.max(3, Math.floor(iw / 78)))).forEach((t) => { const x = X(t); g += `<text x="${x}" y="${h - 6}" text-anchor="middle">${esc((o.xFmt || mlabel)(t))}</text>`; });
  if (o.band) g += `<rect x="${X(o.band.x0)}" y="${m.t}" width="${Math.max(2, X(Math.min(o.band.x1, x1)) - X(o.band.x0))}" height="${ih}" fill="var(--accent-soft)"/>`;
  (o.hlines || []).forEach((l) => { const y = Y(l.y); g += `<line x1="${m.l}" x2="${m.l + iw}" y1="${y}" y2="${y}" stroke="${l.color || 'var(--ink3)'}" stroke-width="1" stroke-dasharray="${l.dash === false ? '' : '4 3'}"/><text x="${m.l + iw}" y="${y - 5}" text-anchor="end" style="fill:${l.color || 'var(--ink3)'}">${esc(l.label)}</text>`; });
  const endLabels = [];
  o.series.forEach((s) => {
    const pts = []; s.v.forEach((v, i) => { if (v != null) pts.push([X(xs[i]), Y(v)]); });
    if (!pts.length) return;
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    if (s.fill) g += `<path d="${path}L${pts[pts.length - 1][0].toFixed(1)} ${Y(Math.max(ymin, Math.min(ymax, s.fillTo != null ? s.fillTo : ymin))).toFixed(1)}L${pts[0][0].toFixed(1)} ${Y(Math.max(ymin, Math.min(ymax, s.fillTo != null ? s.fillTo : ymin))).toFixed(1)}Z" fill="${s.color}" opacity="${s.fillOpacity || 0.1}"/>`;
    g += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" stroke-linejoin="round" stroke-linecap="round"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`;
    if (s.dots) pts.forEach((p) => { g += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="${s.color}" stroke="var(--panel)" stroke-width="2"/>`; });
    else { const e = pts[pts.length - 1]; g += `<circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="4" fill="${s.color}" stroke="var(--panel)" stroke-width="2"/>`; }
    if (s.endLabel) { const e = pts[pts.length - 1]; endLabels.push({ x: e[0] + 8, y: e[1] + 4, t: s.endLabel, c: s.labelColor || s.color }); }
  });
  endLabels.sort((a, b) => a.y - b.y).forEach((l, i, a) => { if (i && l.y - a[i - 1].y < 14) l.y = a[i - 1].y + 14; g += `<text x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" style="fill:${l.c};font-weight:600">${esc(l.t)}</text>`; });
  (o.markers || []).forEach((mk) => {
    const x = X(mk.x), y = Y(mk.y);
    if (x < m.l - 1 || x > m.l + iw + 1) return;
    const c = mk.color || 'var(--ink)';
    const shape = mk.shape === 'up' ? `M${x} ${y - 7}L${x + 6} ${y + 4}L${x - 6} ${y + 4}Z` : `M${x} ${y + 7}L${x + 6} ${y - 4}L${x - 6} ${y - 4}Z`;
    g += `<path d="${shape}" fill="${c}" stroke="var(--panel)" stroke-width="1.5"><title>${esc(mk.title || '')}</title></path>`;
  });
  g += `<line class="xh" id="xh" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" style="display:none"/>`;
  o.series.forEach((s, i) => { g += `<circle id="xd${i}" r="4.5" fill="${s.color}" stroke="var(--panel)" stroke-width="2" style="display:none"/>`; });
  g += `<rect id="ov" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" tabindex="0" role="img" aria-label="${esc(o.aria || 'Chart')}"/>`;
  host.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="false">${g}</svg>`;
  const svg = host.firstChild, ov = svg.querySelector('#ov'), xh = svg.querySelector('#xh');
  const dots = o.series.map((_, i) => svg.querySelector('#xd' + i));
  let cur = -1;
  const show = (i, cx, cy) => {
    cur = i;
    const xx = X(xs[i]);
    xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.style.display = '';
    o.series.forEach((s, k) => { const v = s.v[i]; if (v == null) dots[k].style.display = 'none'; else { dots[k].setAttribute('cx', xx); dots[k].setAttribute('cy', Y(v)); dots[k].style.display = ''; } });
    const r = svg.getBoundingClientRect();
    showTip(o.tip(i), cx != null ? cx : r.left + xx, cy != null ? cy : r.top + m.t + 20);
  };
  const near = (clientX) => {
    const r = svg.getBoundingClientRect(); const t = x0 + ((clientX - r.left - m.l) / (iw || 1)) * (x1 - x0);
    let best = 0, bd = Infinity;
    const eligible = o.snapSeries != null ? xs.map((_, i) => (o.series[o.snapSeries].v[i] != null ? i : -1)).filter((i) => i >= 0) : xs.map((_, i) => i);
    for (const i of eligible) { const d = Math.abs(xs[i] - t); if (d < bd) { bd = d; best = i; } }
    return best;
  };
  ov.addEventListener('pointermove', (e) => show(near(e.clientX), e.clientX, e.clientY));
  ov.addEventListener('pointerdown', (e) => show(near(e.clientX), e.clientX, e.clientY));
  const leave = () => { xh.style.display = 'none'; dots.forEach((d) => (d.style.display = 'none')); hideTip(); };
  ov.addEventListener('pointerleave', leave);
  ov.addEventListener('blur', leave);
  ov.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const base = cur < 0 ? xs.length - 1 : cur;
    show(Math.max(0, Math.min(xs.length - 1, base + (e.key === 'ArrowRight' ? 1 : -1))));
  });
  return { X, Y };
}

/* ---------- sparkline ---------- */
function spark(vals, w, h, color, ref) {
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = 2;
  const X = (i) => pad + (i / (vals.length - 1)) * (w - 2 * pad), Y = (v) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - 2 * pad);
  const d = vals.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
  const last = vals.length - 1;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" style="display:block"><path d="${d}L${X(last).toFixed(1)} ${h}L${X(0).toFixed(1)} ${h}Z" fill="${color}" opacity=".1"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><circle cx="${X(last).toFixed(1)}" cy="${Y(vals[last]).toFixed(1)}" r="2.6" fill="${color}"/></svg>`;
}

/* ---------- table view twin ---------- */
function tableTwin(head, rowsArr) {
  return `<div class="scoreboard" style="max-height:320px;overflow:auto"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rowsArr.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------- fan chart: log-normal range of outcomes ---------- */
const isoDay = (t) => new Date(t).toISOString().slice(0, 10);
const Zq = [-1.645, -0.674, 0, 0.674, 1.645];
function fanPoints(V0, mu, sigma, steps, perYear = 12) {
  const m = Math.log(1 + mu) - (sigma * sigma) / 2;
  return Array.from({ length: steps + 1 }, (_, k) => { const t = k / perYear; return Zq.map((z) => V0 * Math.exp(m * t + z * sigma * Math.sqrt(t))); });
}
function fanChart(host, w, o) {
  const h = o.height || 290, m = { l: 50, r: 16, t: 12, b: 26 }, C = o.color || 'var(--accent)', RC = o.ref.color || 'var(--ink3)';
  const iw = w - m.l - m.r, ih = h - m.t - m.b, N = o.months;
  const F = fanPoints(o.V0, o.mu, o.sigma, N), Rf = fanPoints(o.V0, o.ref.mu, o.ref.sigma, N).map((q) => q[2]);
  // drawn on a finer grid than the monthly tooltip points, so short horizons curve smoothly
  const S = 10, FF = fanPoints(o.V0, o.mu, o.sigma, N * S, 12 * S), RF = fanPoints(o.V0, o.ref.mu, o.ref.sigma, N * S, 12 * S).map((q) => q[2]);
  const lo = Math.min(...F.map((q) => q[0]), ...Rf), hi = Math.max(...F.map((q) => q[4]), ...Rf);
  const ticks = niceTicks(lo, hi, 5), y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = (k) => m.l + (k / N) * iw, Y = (v) => m.t + (1 - (v - y0) / (y1 - y0 || 1)) * ih;
  const XF = (j) => X(j / S);
  const area = (a, b) => FF.map((q, j) => `${j ? 'L' : 'M'}${XF(j).toFixed(1)} ${Y(q[a]).toFixed(1)}`).join('') + FF.slice().reverse().map((q, j) => `L${XF(N * S - j).toFixed(1)} ${Y(q[b]).toFixed(1)}`).join('') + 'Z';
  const path = (arr) => arr.map((v, j) => `${j ? 'L' : 'M'}${XF(j).toFixed(1)} ${Y(v).toFixed(1)}`).join('');
  const d0 = new Date(o.t0), mt = (k) => Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + k, d0.getUTCDate());
  let g = '';
  ticks.forEach((tv) => { const y = Math.round(Y(tv)) + 0.5; g += `<line class="gl" x1="${m.l}" x2="${m.l + iw}" y1="${y}" y2="${y}"/><text x="${m.l - 8}" y="${y + 4}" text-anchor="end">${PUB ? Math.round(tv) : Math.round(tv / 1000) + 'k'}</text>`; });
  const step = N <= 6 ? 1 : N <= 12 ? (iw < 380 ? 4 : 2) : (iw < 380 ? 6 : 3);
  for (let k = 0; k <= N; k += step) g += `<text x="${X(k)}" y="${h - 6}" text-anchor="middle">${k === 0 ? 'Today' : esc(mlabel(mt(k)))}</text>`;
  const yb = Math.round(Y(o.V0)) + 0.5;
  g += `<line class="base" x1="${m.l}" x2="${m.l + iw}" y1="${yb}" y2="${yb}" stroke-dasharray="2 3"/>`;
  g += `<path d="${area(4, 0)}" fill="${C}" opacity="0.11"/><path d="${area(3, 1)}" fill="${C}" opacity="0.2"/>`;
  g += `<path d="${path(RF)}" fill="none" stroke="${RC}" stroke-width="1.75" stroke-dasharray="5 4"/>`;
  g += `<path d="${path(FF.map((q) => q[2]))}" fill="none" stroke="${C}" stroke-width="2.25"/>`;
  [0, 2, 4].forEach((j) => { const v = F[N][j]; g += `<text x="${X(N) - 4}" y="${Y(v) + (j === 0 ? 14 : j === 4 ? -6 : -6)}" text-anchor="end" style="fill:var(--ink2);font-weight:600">${['5%', '', '95%'][j / 2]}${j === 2 ? '' : ' · '}${money0(v)}</text>`; });
  g += `<line class="xh" id="fxh" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" style="display:none"/><rect id="fov" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent" tabindex="0" role="img" aria-label="${esc(o.aria)}"/>`;
  host.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${g}</svg>`;
  const svg = host.firstChild, ov = svg.querySelector('#fov'), xh = svg.querySelector('#fxh');
  let cur = -1;
  const show = (k, cx, cy) => {
    cur = k; const xx = X(k); xh.setAttribute('x1', xx); xh.setAttribute('x2', xx); xh.style.display = '';
    const q = F[k], r = svg.getBoundingClientRect();
    showTip(`<div class="th">${k === 0 ? 'Today' : dfmt(isoDay(mt(k))) + ` · ${k} month${k > 1 ? 's' : ''}`}</div>${trow(C, '1 in 20 better than', money0(q[4]))}${trow(C, 'Middle half', `${money0(q[1])} – ${money0(q[3])}`)}${trow(C, 'Median', money0(q[2]), 1)}${trow(C, '1 in 20 worse than', money0(q[0]))}${trow(RC, o.ref.label + ' median', money0(Rf[k]), 1)}`, cx != null ? cx : r.left + xx, cy != null ? cy : r.top + m.t + 20);
  };
  const near = (cx) => { const r = svg.getBoundingClientRect(); return Math.max(0, Math.min(N, Math.round(((cx - r.left - m.l) / iw) * N))); };
  ov.addEventListener('pointermove', (e) => show(near(e.clientX), e.clientX, e.clientY));
  ov.addEventListener('pointerdown', (e) => show(near(e.clientX), e.clientX, e.clientY));
  const leave = () => { xh.style.display = 'none'; hideTip(); };
  ov.addEventListener('pointerleave', leave); ov.addEventListener('blur', leave);
  ov.addEventListener('keydown', (e) => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); show(Math.max(0, Math.min(N, (cur < 0 ? N : cur) + (e.key === 'ArrowRight' ? 1 : -1)))); });
  return F;
}

