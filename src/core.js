/* Pure analytics + formatting helpers. Shared by the page and the Node checks. */
const OBS_PER_YEAR = 252; // daily closes

const sum = (a) => a.reduce((s, x) => s + x, 0);
const mean = (a) => (a.length ? sum(a) / a.length : 0);
function std(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) * (x - m))) / (a.length - 1));
}
function cov(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n)), mb = mean(b.slice(0, n));
  let s = 0;
  for (let i = 0; i < n; i++) s += (a[i] - ma) * (b[i] - mb);
  return s / (n - 1);
}
const corr = (a, b) => {
  const d = std(a) * std(b);
  return d ? cov(a, b) / d : 0;
};
const beta = (a, bench) => {
  const v = cov(bench, bench);
  return v ? cov(a, bench) / v : 0;
};
const rets = (p) => {
  const r = [];
  for (let i = 1; i < p.length; i++) r.push(p[i] / p[i - 1] - 1);
  return r;
};
const annVol = (r) => std(r) * Math.sqrt(OBS_PER_YEAR);

/** Max drawdown of a price/index series: returns a negative fraction and indices. */
function maxDrawdown(p) {
  let peak = p[0], peakI = 0, worst = 0, wp = 0, wt = 0;
  for (let i = 1; i < p.length; i++) {
    if (p[i] > peak) { peak = p[i]; peakI = i; }
    const dd = p[i] / peak - 1;
    if (dd < worst) { worst = dd; wp = peakI; wt = i; }
  }
  return { dd: worst, peak: wp, trough: wt };
}
function underwater(p) {
  let peak = p[0];
  return p.map((x) => { if (x > peak) peak = x; return x / peak - 1; });
}

/** Constant-weight back-cast of today's mix. seriesByIsin: {isin:[prices]}, w: {isin:weight} */
function backcast(w, seriesByIsin, startValue = 100) {
  const ids = Object.keys(w).filter((k) => seriesByIsin[k] && seriesByIsin[k].length);
  const n = Math.min(...ids.map((k) => seriesByIsin[k].length));
  const wt = sum(ids.map((k) => w[k])) || 1;
  const R = ids.map((k) => rets(seriesByIsin[k].slice(-n)));
  const idx = [startValue], pr = [];
  for (let t = 0; t < n - 1; t++) {
    let r = 0;
    ids.forEach((k, j) => { r += (w[k] / wt) * R[j][t]; });
    pr.push(r);
    idx.push(idx[idx.length - 1] * (1 + r));
  }
  return { idx, rets: pr, ids };
}

/** Share of portfolio variance contributed by each holding. */
function riskContrib(w, seriesByIsin) {
  const ids = Object.keys(w).filter((k) => seriesByIsin[k]);
  const wt = sum(ids.map((k) => w[k])) || 1;
  const R = ids.map((k) => rets(seriesByIsin[k]));
  const n = ids.length;
  const S = ids.map((_, i) => ids.map((__, j) => cov(R[i], R[j])));
  const ww = ids.map((k) => w[k] / wt);
  const Sw = S.map((row) => sum(row.map((c, j) => c * ww[j])));
  const tot = sum(ww.map((x, i) => x * Sw[i]));
  const out = {};
  ids.forEach((k, i) => { out[k] = tot ? (ww[i] * Sw[i]) / tot : 0; });
  return { contrib: out, variance: tot, S, ids };
}

/** Modified Dietz return for a period. flows: [{t: ms, amt}] (+ in, - out). */
function modifiedDietz(pnl, vEnd, flows, t0, t1) {
  const inW = flows.filter((f) => f.t > t0 && f.t <= t1);
  const net = sum(inW.map((f) => f.amt));
  const T = t1 - t0;
  const vStart = vEnd - pnl - net;
  const wsum = sum(inW.map((f) => (f.amt * (t1 - f.t)) / T));
  const base = vStart + wsum;
  return { vStart, net, base, ret: base > 0 ? pnl / base : null };
}

/** Annualised money-weighted return (XIRR). flows: [{t, amt}] investor view: deposits negative. */
function xirr(cfs) {
  const t0 = cfs[0].t;
  const f = (r) => sum(cfs.map((c) => c.amt / Math.pow(1 + r, (c.t - t0) / (365 * 864e5))));
  let lo = -0.95, hi = 20;
  if (f(lo) * f(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(lo) * f(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Squarified treemap. items: [{key, v}] sorted desc; returns [{key, x, y, w, h}] in a w x h box. */
function treemap(items, W, H) {
  const tot = sum(items.map((i) => i.v));
  const rects = [];
  let nodes = items.filter((i) => i.v > 0).map((i) => ({ ...i, a: (i.v / tot) * W * H }));
  let x = 0, y = 0, w = W, h = H;
  const worst = (row, side) => {
    const s = sum(row.map((r) => r.a));
    const mx = Math.max(...row.map((r) => r.a)), mn = Math.min(...row.map((r) => r.a));
    return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn));
  };
  while (nodes.length) {
    const side = Math.min(w, h);
    let row = [nodes[0]], i = 1;
    while (i < nodes.length && worst(row.concat(nodes[i]), side) <= worst(row, side)) { row.push(nodes[i]); i++; }
    const s = sum(row.map((r) => r.a));
    if (w >= h) {
      const cw = s / h; let cy = y;
      row.forEach((r) => { const rh = r.a / cw; rects.push({ key: r.key, x, y: cy, w: cw, h: rh }); cy += rh; });
      x += cw; w -= cw;
    } else {
      const ch = s / w; let cx = x;
      row.forEach((r) => { const rw = r.a / ch; rects.push({ key: r.key, x: cx, y, w: rw, h: ch }); cx += rw; });
      y += ch; h -= ch;
    }
    nodes = nodes.slice(row.length);
  }
  return rects;
}


/* ---------- time- and money-weighted returns from a valuation history ----------
   points: [{t, v}] sorted, valuations; flows: [[t, amt]] external cash flows (+ in, − out). */
function twrIndex(points, flows) {
  const idx = [1], sub = [];
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k], T = b.t - a.t;
    const fl = flows.filter((f) => f[0] > a.t && f[0] <= b.t);
    const F = sum(fl.map((f) => f[1])), W = sum(fl.map((f) => (f[1] * (b.t - f[0])) / T));
    const base = a.v + W;
    const r = base > 1 ? (b.v - a.v - F) / base : 0;
    sub.push(r); idx.push(idx[k - 1] * (1 + r));
  }
  return { idx, sub };
}
/** Money-weighted rate (XIRR) over [t0, t1]: start value invested at t0, flows in between, end value out. */
function mwrWindow(v0, t0, v1, t1, flows) {
  const cfs = [{ t: t0, amt: -v0 }].concat(flows.filter((f) => f[0] > t0 && f[0] <= t1).map((f) => ({ t: f[0], amt: -f[1] }))).concat([{ t: t1, amt: v1 }]).filter((c) => Math.abs(c.amt) > 1e-9).sort((a, b) => a.t - b.t);
  return cfs.length > 1 ? xirr(cfs) : null;
}
/** Converts an annual rate to the holding-period return over [t0, t1]. */
const periodFromAnnual = (r, t0, t1) => (r == null ? null : Math.pow(1 + r, (t1 - t0) / (365 * 864e5)) - 1);

/* ---------- formatting ---------- */
const nfEUR = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' });
const nfEUR0 = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const fmtEUR = (x) => (x < 0 ? '−' : '') + nfEUR.format(Math.abs(x));
const fmtEUR0 = (x) => (x < 0 ? '−' : '') + nfEUR0.format(Math.abs(x));
const fmtSignedEUR = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + nfEUR.format(Math.abs(x));
const fmtPct = (x, d = 1) => (x == null || !isFinite(x) ? '–' : (x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(d) + '%');
const fmtSignedPct = (x, d = 1) => (x == null || !isFinite(x) ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(d) + '%');
const fmtNum = (x, d = 2) => (x == null || !isFinite(x) ? '–' : new Intl.NumberFormat('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x));

if (typeof module !== 'undefined') {
  module.exports = { twrIndex, mwrWindow, periodFromAnnual, OBS_PER_YEAR, sum, mean, std, cov, corr, beta, rets, annVol, maxDrawdown, underwater, backcast, riskContrib, modifiedDietz, xirr, treemap, fmtEUR, fmtEUR0, fmtSignedEUR, fmtPct, fmtSignedPct, fmtNum };
}
