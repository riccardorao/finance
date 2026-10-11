/* ===== client: turns one viewer's Scalable Capital responses into the page's data object =====
   Runs in the browser (viewer edition) and in Node (tests). Nothing here is personal data: it only
   describes how to read the connector's responses. The pipeline/ scripts do the same job for a tx.csv. */
const Feed = (() => {
  const DAY = 864e5;
  const num = (x) => (x == null || x === '' ? 0 : +x);
  const day = (t) => new Date(t).toISOString().slice(0, 10);
  const TFMAP = { INTRADAY: '1D', ONE_WEEK: '1W', ONE_MONTH: '1M', THREE_MONTHS: '3M', SIX_MONTHS: '6M', YEAR_TO_DATE: 'YTD', ONE_YEAR: '1Y', MAX: 'MAX', SINCE_BUY: 'SB' };
  const mapPerf = (arr) => { const o = {}; (arr || []).forEach((p) => { const k = TFMAP[p.timeframe]; if (k) o[k] = [p.performance, p.simpleAbsoluteReturn]; }); return o; };

  /* ---------- instrument class: the equity book is shares plus ETFs and ETCs ---------- */
  const LEVER = /\b(turbo|mini[- ]?future|open end|knock[- ]?out|warrant|hebel|leverage[d]?|faktor|factor|call|put|bull|bear|certificate|zertifikat)\b|\b(long|short)\s+\d/i;
  function classOf(isin, desc, securityType) {
    const st = String(securityType || '').toUpperCase();
    if (/CRYPTO|COIN/.test(st)) return 'Crypto';
    if (/DERIV|WARRANT|KNOCK|CERT|TURBO|FACTOR|LEVER|MINI|OPTION|FUTURE|STRUCT/.test(st)) return 'Leveraged & certificates';
    if (/ETF|ETC|ETN|FUND/.test(st)) return 'ETFs & ETCs';
    if (/STOCK|SHARE|EQUITY/.test(st)) return 'Shares';
    if (/^DE000BB/.test(isin) || LEVER.test(desc || '')) return 'Leveraged & certificates';
    if (/^(IE|LU)/.test(isin)) return 'ETFs & ETCs';
    return 'Shares';
  }
  const inBook = (cls) => cls === 'Shares' || cls === 'ETFs & ETCs';

  /* ---------- transactions -> ledger rows (the same kinds as pipeline/tx.csv) ----------
     buy sell div exp tout, plus dep/wdr for completeness. Crypto is skipped; unknown cash types are ignored
     because they never touch the equity book. */
  function txRows(list) {
    const rows = []; const warn = [];
    const ins = [], outs = [];
    list.forEach((x, i) => {
      if (x.status && !/SETTLED|FILLED/i.test(x.status)) return;
      if (x.isCancellation) return;
      const t = Date.parse(x.lastEventAt);
      if (!isFinite(t)) return;
      const base = { i, t, desc: x.description || '', cust: /BAADER/i.test(x.custodian || '') ? 'B' : 'S' };
      if (x.kind === 'security' && x.security) {
        const s = x.security, q = Math.abs(num(s.quantity)), a = Math.abs(num(s.amount));
        if (!s.isin || !q) return;
        rows.push({ ...base, kind: String(s.side).toUpperCase() === 'SELL' ? 'sell' : 'buy', isin: s.isin, qty: q, amt: a });
      } else if (x.kind === 'cash' && x.cash) {
        const c = x.cash, ty = String(c.transactionType || '').toUpperCase(), a = num(c.amount);
        if (ty === 'DISTRIBUTION' && c.relatedIsin) rows.push({ ...base, kind: 'div', isin: c.relatedIsin, qty: 0, amt: Math.abs(a) });
        else if (ty === 'DEPOSIT') rows.push({ ...base, kind: 'dep', isin: null, qty: 0, amt: Math.abs(a) });
        else if (ty === 'WITHDRAWAL') rows.push({ ...base, kind: 'wdr', isin: null, qty: 0, amt: Math.abs(a) });
      } else if (x.kind === 'non_trade_security' && x.nonTradeSecurity) {
        const n = x.nonTradeSecurity, ty = String(n.transactionType || '').toUpperCase(), q = Math.abs(num(n.quantity)), a = Math.abs(num(n.amount));
        if (!n.isin || !q) return;
        const r = { ...base, isin: n.isin, qty: q, amt: a };
        if (ty === 'TRANSFER_IN') ins.push(r);
        else if (ty === 'TRANSFER_OUT') outs.push(r);
        else if (/_IN$/.test(ty)) rows.push({ ...r, kind: 'buy' });        // corporate actions that add shares
        else if (/_OUT$/.test(ty)) rows.push({ ...r, kind: 'exp', amt: 0 }); // swaps, expiries: shares leave with no proceeds
        else warn.push('non-trade ' + ty);
      }
    });
    // a transfer out that pairs with a transfer in (same instrument and quantity, within a week) moves between
    // custody accounts and keeps its cost; an unpaired one leaves the account, an unpaired one in arrives with its value
    const usedIn = new Set();
    outs.forEach((o) => {
      const m = ins.find((r) => !usedIn.has(r) && r.isin === o.isin && Math.abs(r.qty - o.qty) < 1e-6 && Math.abs(r.t - o.t) <= 7 * DAY);
      if (m) { usedIn.add(m); rows.push({ ...o, kind: 'tout' }); } else rows.push({ ...o, kind: 'sell' });
    });
    ins.forEach((r) => { if (!usedIn.has(r)) rows.push({ ...r, kind: 'buy' }); });
    rows.sort((a, b) => a.t - b.t || a.i - b.i);
    return { rows, warn };
  }

  /* ---------- prices ---------- */
  // series are [[t, price]] sorted by t
  function lastClose(pts, t, maxAge = 7 * DAY) {
    if (!pts || !pts.length || t < pts[0][0] - 3 * DAY) return null;
    if (t < pts[0][0]) return pts[0][1];
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (pts[mid][0] <= t + 36e5) lo = mid; else hi = mid - 1; }
    return t - pts[lo][0] > maxAge ? null : pts[lo][1];
  }
  function geo(pts, t) {
    if (!pts || !pts.length || t < pts[0][0] - 3 * DAY || t > pts[pts.length - 1][0] + 40 * DAY) return null;
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [a, pa] = pts[i - 1], [b, pb] = pts[i]; return Math.exp(Math.log(pa) + ((t - a) / (b - a)) * (Math.log(pb) - Math.log(pa))); }
    return pts[pts.length - 1][1];
  }
  const toPts = (arr) => (arr || []).map((p) => [Date.parse(p.timestampUtc), p.midPrice]).filter((p) => isFinite(p[0]) && p[1] > 0).sort((a, b) => a[0] - b[0]);

  function priceFn(charts, rows) {
    const daily = {}, monthly = {}, trades = {};
    Object.entries(charts || {}).forEach(([isin, c]) => { daily[isin] = toPts(c.daily); monthly[isin] = toPts(c.monthly); });
    rows.forEach((r) => { if (r.qty && r.amt && /buy|sell/.test(r.kind)) (trades[r.isin] = trades[r.isin] || []).push([r.t, r.amt / r.qty]); });
    const nearTrade = (isin, t) => {
      const L = trades[isin]; if (!L) return null;
      let before = null, after = null;
      for (const x of L) { if (x[0] <= t) before = x; else { after = x; break; } }
      if (before && after) return before[1] + ((t - before[0]) / (after[0] - before[0])) * (after[1] - before[1]);
      return (before || after)[1];
    };
    // chartOnly: used to compare trade prices against the market (split detection), never falls back to trades
    return (isin, t, chartOnly) => {
      let p = lastClose(daily[isin], t);
      if (p == null) p = geo(monthly[isin], t);
      if (p == null && !chartOnly) p = nearTrade(isin, t);
      return p;
    };
  }

  /* ---------- split detection ----------
     Chart prices are split-adjusted; the share counts in old trades are not. A trade whose price sits at a clean
     multiple (2, 3, 4, 5, 10, 20 ... or the inverse) of the market price that day was made before a split. */
  const NICE = [2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 100].flatMap((n) => [n, 1 / n]);
  function splitFactors(rows, price, finalQty) {
    const byIsin = {};
    rows.forEach((r) => { if (/^(buy|sell|exp|tout)$/.test(r.kind)) (byIsin[r.isin] = byIsin[r.isin] || []).push(r); });
    const factor = new Map(); const fixed = [];
    for (const [isin, rs] of Object.entries(byIsin)) {
      const f = new Map();
      rs.forEach((r) => {
        if (!/buy|sell/.test(r.kind) || !(r.qty > 0 && r.amt > 0)) return;
        const cp = price(isin, r.t, true); if (!cp) return;
        const ratio = r.amt / r.qty / cp;
        if (ratio > 1.75 || ratio < 1 / 1.75) {
          let best = 1, bd = 9; for (const n of NICE) { const d = Math.abs(Math.log(ratio / n)); if (d < bd) { bd = d; best = n; } }
          if (bd < 0.2) f.set(r, best);
        }
      });
      if (!f.size) continue;
      const run = (use) => { let q = 0, minQ = 0; rs.forEach((r) => { const k = use && f.has(r) ? f.get(r) : 1; if (r.kind === 'buy') q += r.qty * k; else if (/sell|exp|tout/.test(r.kind) && r.kind !== 'tout') q -= r.qty * k; minQ = Math.min(minQ, q); }); return { q, minQ }; };
      const target = finalQty[isin] || 0, a = run(false), b = run(true);
      const fit = (x) => Math.abs(x.q - target) <= 1e-6 + 1e-3 * Math.max(1, target) && x.minQ > -1e-6;
      if (fit(b) && !fit(a)) { f.forEach((v, r) => factor.set(r, v)); fixed.push(isin); }
    }
    return { factor, fixed };
  }

  /* ---------- FIFO ledger: realised results and cost, per instrument ---------- */
  function ledger(rows, names, classes, qtyOf) {
    const lots = {}, realised = {}, events = {}, divAll = [];
    const eps = 1e-9;
    const consume = (isin, qty) => {
      const L = lots[isin] || []; let need = qty, cost = 0;
      for (const lot of L) { if (need <= eps) break; if (lot.qty <= eps) continue; const take = Math.min(lot.qty, need), part = lot.cost * (take / lot.qty); cost += part; lot.cost -= part; lot.qty -= take; need -= take; }
      lots[isin] = L.filter((l) => l.qty > eps);
      return cost;
    };
    rows.forEach((r) => {
      const q = qtyOf(r);
      if (r.kind === 'buy') { (lots[r.isin] = lots[r.isin] || []).push({ date: r.t, qty: q, cost: r.amt, cust: r.cust }); (events[r.isin] = events[r.isin] || []).push({ t: r.t, side: 'BUY' }); }
      else if (r.kind === 'sell' || r.kind === 'exp') {
        const proceeds = r.kind === 'exp' ? 0 : r.amt, cost = consume(r.isin, q);
        const o = realised[r.isin] || (realised[r.isin] = { pl: 0, proceeds: 0 });
        o.pl += proceeds - cost; o.proceeds += proceeds;
        (events[r.isin] = events[r.isin] || []).push({ t: r.t, side: r.kind === 'exp' ? 'EXPIRED' : 'SELL' });
      } else if (r.kind === 'tout') { /* moves between custody accounts: cost and date stay with the lots */ }
      else if (r.kind === 'div') divAll.push([day(r.t), r.isin, r.amt]);
    });
    const out = Object.entries(realised).map(([isin, o]) => {
      const ev = events[isin] || [], closes = ev.filter((e) => e.side !== 'BUY');
      return { id: isin, name: names[isin] || isin, type: classes[isin] || 'Shares', pl: +o.pl.toFixed(2), proceeds: +o.proceeds.toFixed(2), first: day(ev[0].t), last: closes.length ? day(closes[closes.length - 1].t) : null };
    }).sort((a, b) => b.pl - a.pl);
    const cost = {}; Object.entries(lots).forEach(([isin, L]) => { cost[isin] = L.reduce((s, l) => s + l.cost, 0); });
    return { realised: out, divAll, cost };
  }

  /* ---------- the equity book's value history ----------
     Daily on weekdays for the last 14 months, month ends before that. Money moving into the book (buys) counts as
     an inflow; sales and dividends as an outflow; cash, fees, crypto and leveraged products are outside the book. */
  function history(rows, price, asOf, book, qtyOf) {
    const brows = rows.filter((r) => book(r.isin) && /^(buy|sell|exp|tout|div)$/.test(r.kind));
    if (!brows.some((r) => r.kind === 'buy')) return null;
    const first = brows.find((r) => r.kind === 'buy').t;
    const dates = new Set();
    const d0 = new Date(first);
    for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth(); ; m++) { const t = Date.UTC(y, m + 1, 0, 21); if (t >= asOf) break; if (t > first) dates.add(t); }
    const from = Math.max(first, asOf - 430 * DAY);
    for (let t = Date.UTC(new Date(from).getUTCFullYear(), new Date(from).getUTCMonth(), new Date(from).getUTCDate(), 21); t < asOf; t += DAY) { const wd = new Date(t).getUTCDay(); if (wd > 0 && wd < 6) dates.add(t); }
    const o = new Date(asOf), at = (y, m, d) => Date.UTC(y, m, d, 20);
    [at(o.getUTCFullYear(), o.getUTCMonth(), o.getUTCDate() - 7), at(o.getUTCFullYear(), o.getUTCMonth() - 1, o.getUTCDate()), at(o.getUTCFullYear(), o.getUTCMonth() - 3, o.getUTCDate()), at(o.getUTCFullYear(), o.getUTCMonth() - 6, o.getUTCDate()), at(o.getUTCFullYear() - 1, 11, 31), at(o.getUTCFullYear() - 1, o.getUTCMonth(), o.getUTCDate() - 1)].forEach((t) => { if (t > first && t < asOf) dates.add(t); });
    dates.add(asOf);
    const sorted = Array.from(dates).sort((a, b) => a - b);
    const flows = brows.filter((r) => /buy|sell|div/.test(r.kind)).map((r) => [r.t, +((r.kind === 'buy' ? 1 : -1) * r.amt).toFixed(2)]);
    const qty = {}; let ri = 0, fi = 0, cum = 0;
    const points = [[first - 1, 0, 0]];
    sorted.forEach((t) => {
      while (ri < brows.length && brows[ri].t <= t) { const r = brows[ri++]; if (r.kind === 'buy') qty[r.isin] = (qty[r.isin] || 0) + qtyOf(r); else if (r.kind === 'sell' || r.kind === 'exp') qty[r.isin] = (qty[r.isin] || 0) - qtyOf(r); }
      while (fi < flows.length && flows[fi][0] <= t) cum += flows[fi++][1];
      let v = 0;
      for (const [isin, q] of Object.entries(qty)) { if (q < 1e-6) continue; const p = price(isin, t); if (p != null) v += q * p; }
      points.push([t, +v.toFixed(2), +cum.toFixed(2)]);
    });
    return { points, external: flows, qtyNow: qty };
  }

  /* ---------- daily closes for the last 12 months, carried over holidays (the risk model's input) ---------- */
  function dailySeries(charts, isins, asOf) {
    const from = asOf - 366 * DAY, lim = day(asOf);
    const pts = {}; isins.forEach((i) => { pts[i] = toPts((charts[i] || {}).daily); });
    const dates = Array.from(new Set(isins.flatMap((i) => pts[i].map((p) => day(p[0]))).filter((d) => Date.parse(d) >= from && d <= lim))).sort();
    const p = {};
    isins.forEach((i) => {
      if (!pts[i].length) return;
      const m = new Map(pts[i].map((x) => [day(x[0]), x[1]]));
      let last = null; const before = pts[i].filter((x) => day(x[0]) < dates[0]); if (before.length) last = before[before.length - 1][1];
      const arr = dates.map((d) => { if (m.has(d)) last = m.get(d); return last; });
      if (!arr.some((x) => x == null)) p[i] = arr;
    });
    return { dates, ref: 'daily closes (Scalable Capital), euro', p };
  }

  // month-end closes as the page's { start: 'YYYY-MM', p: [...] } (consecutive months, gaps filled forward)
  function monthlySeries(arr) {
    const pts = toPts(arr); if (!pts.length) return null;
    const key = (t) => new Date(t).toISOString().slice(0, 7);
    const m = new Map(pts.map((x) => [key(x[0]), x[1]]));
    const start = key(pts[0][0]), end = key(pts[pts.length - 1][0]);
    const p = []; let [y, mo] = start.split('-').map(Number), last = null;
    for (;;) { const k = `${y}-${String(mo).padStart(2, '0')}`; if (m.has(k)) last = m.get(k); p.push(last); if (k === end) break; mo++; if (mo > 12) { mo = 1; y++; } }
    return { start, p };
  }

  /* ---------- which price series to fetch ----------
     Every stock or ETF the account ever traded, plus the benchmark. A one-year (daily) chart only where the
     position was held within the last year; the max chart (month ends) for all. */
  function chartPlan(transactions, holdingsFeed, benchIsin, asOf) {
    const { rows } = txRows(transactions || []);
    const names = {}; (transactions || []).forEach((x) => { const s = x.security || x.nonTradeSecurity; if (s && s.isin && x.description) names[s.isin] = x.description; });
    const plan = {};
    rows.forEach((r) => { if (!r.isin || !/^(buy|sell|exp|tout)$/.test(r.kind)) return; if (!inBook(classOf(r.isin, names[r.isin] || r.desc, null))) return; const p = plan[r.isin] || (plan[r.isin] = { isin: r.isin, daily: false }); if (r.t > asOf - 380 * DAY) p.daily = true; });
    ((holdingsFeed && holdingsFeed.holdings) || []).forEach((f) => { if (f.position && f.position.filled > 0) plan[f.isin] = { isin: f.isin, daily: true }; });
    if (benchIsin) plan[benchIsin] = { isin: benchIsin, daily: true };
    return Object.values(plan);
  }

  /* ---------- everything together ---------- */
  function build(raw) {
    const S = raw.static || {};
    const asOf = Date.parse((raw.overview && raw.overview.timestamps && raw.overview.timestamps.valuationTimestampUtc) || raw.asOf || new Date().toISOString());
    const { rows, warn } = txRows(raw.transactions || []);
    const names = {};
    (raw.transactions || []).forEach((x) => { const isin = (x.security || x.nonTradeSecurity || x.cash || {}).isin || (x.cash && x.cash.relatedIsin); if (isin && x.description) names[isin] = x.description; });
    const feed = ((raw.holdings && raw.holdings.holdings) || []).filter((x) => x.position && x.position.filled > 0);
    feed.forEach((f) => { if (f.name) names[f.isin] = f.name; });
    // classes: broker's own type for current positions, name and ISIN heuristics for closed ones
    const classes = {};
    rows.forEach((r) => { if (r.isin && !classes[r.isin]) classes[r.isin] = classOf(r.isin, names[r.isin], null); });
    feed.forEach((f) => { const q = raw.quotes && raw.quotes[f.isin] && raw.quotes[f.isin].security; classes[f.isin] = classOf(f.isin, f.name, q && q.securityType); });
    const bookSet = (isin) => inBook(classes[isin] || 'Shares');
    const price = priceFn(raw.charts, rows);
    const finalQty = {}; feed.forEach((f) => { finalQty[f.isin] = f.position.filled; });
    const { factor, fixed } = splitFactors(rows.filter((r) => bookSet(r.isin)), price, finalQty);
    const qtyOf = (r) => r.qty * (factor.get(r) || 1);
    const L = ledger(rows.filter((r) => bookSet(r.isin) || r.kind === 'dep' || r.kind === 'wdr'), names, classes, qtyOf);
    const H = history(rows, price, asOf, bookSet, qtyOf);
    const quotes = raw.quotes || {};
    const holdings = []; const excluded = { n: 0, value: 0 };
    feed.forEach((f) => {
      const qs = quotes[f.isin] && quotes[f.isin].security, q = qs && qs.quote;
      const px = q ? q.midPrice : f.currentQuote && f.currentQuote.midPrice;
      if (!bookSet(f.isin)) { excluded.n++; excluded.value += f.position.filled * (px || 0); return; }
      if (!px) return;
      const perf = q ? mapPerf(q.performances) : {};
      const qty = f.position.filled;
      let cost = perf.SB ? qty * px - perf.SB[1] : L.cost[f.isin] != null ? L.cost[f.isin] : null; // the broker's own unrealised figure first
      const nv = raw.news && raw.news[f.isin];
      const sm = nv && nv.summary;
      const scalable = sm && sm.short ? { short: sm.short, long: String(sm.long || sm.short).replace(/\*\*/g, ''), at: sm.lastUpdatedAt || '', sources: (nv.sources || []).map((x) => [x.headline, String(x.publicationTimeUtc || '').slice(0, 10)]) } : null;
      const rs = (S.research || {})[f.isin];
      holdings.push({
        isin: f.isin, name: (qs && qs.name) || f.name, long: '', ticker: '', sector: 'Unclassified', industry: '', theme: 'Unclassified', region: 'Unclassified', ccy: (q && q.currency) || 'EUR', note: '',
        qty, price: px, cost: cost != null ? +cost.toFixed(2) : null, perf, lots: [], events: [], divs: [],
        scalable, comment: (S.comments || {})[f.isin] || null, research: rs ? { ...rs, at: day(asOf) } : null, conviction: null,
      });
    });
    const bench = (S.indices || [])[0];
    const bq = bench && quotes[bench.isin] && quotes[bench.isin].security && quotes[bench.isin].security.quote;
    const bc = bench && (raw.charts || {})[bench.isin];
    const indices = bench && bc ? [{ ...bench }] : [];
    const benches = bench && bq ? [{ id: bench.id, name: bench.name, isin: bench.isin, etf: bench.etf, perf: mapPerf(bq.performances) }] : [];
    const seriesIsins = holdings.map((h) => h.isin).concat(bench && bc ? [bench.isin] : []);
    const series = dailySeries(raw.charts || {}, seriesIsins, asOf);
    const secValue = holdings.reduce((s, h) => s + h.qty * h.price, 0);
    const cash = raw.cash && raw.cash.cash ? num(raw.cash.cash.cashBalance) : 0;
    const total = raw.overview && raw.overview.valuation ? num(raw.overview.valuation.total) : secValue + cash;
    const bd = bench && bc ? toPts(bc.daily) : [];
    return {
      meta: { asOf: new Date(asOf).toISOString() },
      total, cash, pl: {},
      holdings, benches, excluded,
      series: { dates: series.dates, ref: series.ref, p: series.p },
      indices,
      benchMonthly: bench && bc ? { [bench.isin]: monthlySeries(bc.monthly) } : {},
      indexDaily: bench && bc ? { [bench.isin]: { d: bd.map((p) => day(p[0])), p: bd.map((p) => p[1]) } } : {},
      history: H ? { points: H.points, external: H.external, scope: 'stocks', check: [] } : null,
      flows: [],
      ledger: { summary: {}, realised: L.realised, divAll: L.divAll },
      profile: { ...(S.profile || {}) },
      diag: { rows: rows.length, warn, splitsFixed: fixed, historyQty: H ? H.qtyNow : {} },
    };
  }

  return { chartPlan, txRows, classOf, inBook, priceFn, splitFactors, ledger, history, dailySeries, monthlySeries, build, mapPerf, TFMAP };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Feed;
