// Rolls a built data.json forward to a later close when the raw ledger is not at hand and no trades happened since
// the last build: daily closes in euro come from Yahoo Finance (same symbol rules as fetch_daily.js), quantities and
// costs stay as built, and the cash distributions since then are passed in a small JSON file.
// Usage: node pipeline/roll_forward.js <data dir> <to YYYY-MM-DD> <events.json>
//   events.json: { "cash": 18.82, "dividends": [["2026-10-09", "US8740391003", 11.61], ...] }
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2]);
const TO = process.argv[3];
const EV = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const D = JSON.parse(fs.readFileSync(path.join(dir, 'data.json'), 'utf8'));
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const HOST = 'https://query2.finance.yahoo.com';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) { for (let i = 0; i < 4; i++) { const r = await fetch(url, { headers: UA }).catch(() => null); if (r && r.ok) return r.json(); await wait(1500 * (i + 1)); } return null; }
const PREF = ['.DE', '.F', '.MI', '.PA', '.AS', '.L', '.CO', ''];
async function resolve(isin) {
  const j = await get(`${HOST}/v1/finance/search?q=${isin}&quotesCount=10&newsCount=0`);
  const q = ((j && j.quotes) || []).filter((x) => x.symbol);
  const rank = (s) => { const i = PREF.findIndex((p) => (p ? s.endsWith(p) : !s.includes('.'))); return i < 0 ? 99 : i; };
  q.sort((a, b) => rank(a.symbol) - rank(b.symbol));
  return q.map((x) => x.symbol);
}
async function chart(sym, from, to) {
  const p1 = Math.floor(Date.parse(from + 'T00:00:00Z') / 1000), p2 = Math.floor(Date.parse(to + 'T23:59:59Z') / 1000) + 86400;
  const j = await get(`${HOST}/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d`);
  const r = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r || !r.timestamp) return null;
  const c = r.indicators.quote[0].close, m = new Map();
  r.timestamp.forEach((t, i) => { if (c[i] != null) m.set(new Date((t + r.meta.gmtoffset) * 1000).toISOString().slice(0, 10), c[i]); });
  return { ccy: r.meta.currency, m };
}
const day = (t) => new Date(t).toISOString().slice(0, 10);
(async () => {
  const S = D.series, last = S.dates[S.dates.length - 1];
  const from = day(Date.parse(last) - 20 * 864e5);
  const isins = Object.keys(S.p);
  const fxS = await chart('EURUSD=X', from, TO);
  const got = {};
  for (const isin of isins) {
    const h = D.holdings.find((x) => x.isin === isin), syms = (await resolve(isin)).concat(h && h.ticker ? [h.ticker] : []); await wait(300);
    let best = null;
    for (const sym of syms.slice(0, 4)) {
      const c = await chart(sym, from, TO); await wait(300);
      if (!c || !c.m.has(last)) continue;
      let k = 1; if (c.ccy === 'USD') { if (!fxS.m.has(last)) continue; } else if (c.ccy !== 'EUR') continue;
      const eur = (d, v) => (c.ccy === 'USD' ? v / (fxS.m.get(d) || [...fxS.m].filter((x) => x[0] <= d).pop()[1]) : v);
      const ratio = eur(last, c.m.get(last)) / S.p[isin][S.p[isin].length - 1];
      const score = Math.abs(Math.log(ratio));
      if (!best || score < best.score) best = { sym, c, eur, ratio, score };
      if (score < 0.01) break;
    }
    if (!best || best.score > 0.05) throw new Error(`${isin}: no listing matches the stored closes (best ${best && best.sym} ratio ${best && best.ratio})`);
    got[isin] = best; console.log(isin, best.sym, best.c.ccy, 'join ratio', best.ratio.toFixed(4));
  }
  // new trading days: those of the benchmark listing after the last stored day, up to TO
  const bench = D.benches[0].isin;
  const newDays = [...got[bench].c.m.keys()].filter((d) => d > last && d <= TO).sort();
  if (!newDays.length) throw new Error('no new closes');
  const px = {};
  isins.forEach((isin) => { const g = got[isin]; let prev = S.p[isin][S.p[isin].length - 1]; px[isin] = newDays.map((d) => { const v = g.c.m.get(d); if (v != null) prev = +g.eur(d, v).toFixed(4); return prev; }); });
  // series: append, then keep the trailing year
  S.dates = S.dates.concat(newDays); isins.forEach((isin) => { S.p[isin] = S.p[isin].concat(px[isin]); });
  const cut = day(Date.parse(TO) - 366 * 864e5), k0 = S.dates.findIndex((d) => d > cut);
  if (k0 > 0) { S.dates = S.dates.slice(k0); isins.forEach((isin) => { S.p[isin] = S.p[isin].slice(k0); }); }
  // benchmark daily history and month ends
  const idd = D.indexDaily[bench];
  newDays.forEach((d, i) => { if (d > idd.d[idd.d.length - 1]) { idd.d.push(d); idd.p.push(px[bench][i]); } });
  const bm = D.benchMonthly[bench], [by, bmo] = bm.start.split('-').map(Number);
  for (;;) {
    const end = new Date(Date.UTC(by, bmo - 1 + bm.p.length + 1, 0)).toISOString().slice(0, 10);
    if (end >= TO) break;
    const k = idd.d.filter((d) => d <= end).length - 1; bm.p.push(idd.p[k]);
  }
  // valuation history of the stock book: same quantities, new closes; dividends leave the book
  const H = D.history, qty = Object.fromEntries(D.holdings.map((h) => [h.isin, h.qty]));
  const asOfT = Date.parse(D.meta.asOf);
  const divs = (EV.dividends || []).filter((x) => Date.parse(x[0] + 'T12:00:00Z') > asOfT && x[0] <= TO);
  let cum = H.points[H.points.length - 1][2];
  newDays.forEach((d, i) => {
    const t = Date.parse(d + 'T21:00:00Z');
    divs.filter((x) => x[0] <= d && !x.done).forEach((x) => { x.done = true; cum = +(cum - x[2]).toFixed(2); H.external.push([Date.parse(x[0] + 'T00:00:00Z'), -x[2]]); });
    const v = isins.filter((id) => qty[id]).reduce((s, id) => s + qty[id] * px[id][i], 0);
    H.points.push([t, +v.toFixed(2), cum]);
  });
  // holdings: price, period changes per share, dividends
  const at = (isin, d) => { const k = S.dates.filter((x) => x <= d).length - 1; return k >= 0 ? S.p[isin][k] : null; };
  const back = (months, days) => { const t = new Date(TO + 'T12:00:00Z'); if (months) t.setUTCMonth(t.getUTCMonth() - months); if (days) t.setUTCDate(t.getUTCDate() - days); return day(t); };
  const prevDay = S.dates[S.dates.length - 2];
  const REF = { '1D': prevDay, '1W': back(0, 7), '1M': back(1), '3M': back(3), '6M': back(6), YTD: `${+TO.slice(0, 4) - 1}-12-31`, '1Y': back(12) };
  const perfOf = (isin, now, old) => { const p = { ...(old || {}) }; Object.entries(REF).forEach(([k, d]) => { const a = at(isin, d); if (a) p[k] = [+(now / a - 1).toFixed(4), +(now - a).toFixed(4)]; }); return p; };
  D.holdings.forEach((h) => {
    const now = px[h.isin] ? px[h.isin][px[h.isin].length - 1] : h.price;
    h.price = now; h.perf = perfOf(h.isin, now, h.perf);
    if (h.cost) h.perf.SB = [+(h.qty * now / h.cost - 1).toFixed(4), +(h.qty * now - h.cost).toFixed(2)];
    divs.filter((x) => x[1] === h.isin).forEach((x) => h.divs.push([x[0], x[2]]));
    h.scalable = null; // the news summary was for the old date
  });
  D.benches.forEach((b) => { const now = px[b.isin][px[b.isin].length - 1]; b.perf = perfOf(b.isin, now, b.perf); });
  // totals and the account's period results, from the rebuilt history
  const secValue = D.holdings.reduce((s, h) => s + h.qty * h.price, 0);
  D.cash = EV.cash; D.total = +(secValue + D.cash).toFixed(2);
  const P = H.points, vAt = (d) => { const t = Date.parse(d + 'T21:00:00Z'); let r = P[0]; for (const p of P) if (p[0] <= t + 36e5) r = p; return r; };
  const end = P[P.length - 1];
  Object.entries(REF).forEach(([k, d]) => { const s = vAt(d); D.pl[k] = +((end[1] - s[1]) - (end[2] - s[2])).toFixed(2); });
  const L = D.ledger && D.ledger.summary;
  if (L) { const dv = divs.reduce((s, x) => s + x[2], 0); L.divTotal = +(L.divTotal + dv).toFixed(2); L.valueNow = +secValue.toFixed(2); L.total = D.total; L.unrealised = +D.holdings.reduce((s, h) => s + (h.cost != null ? h.qty * h.price - h.cost : 0), 0).toFixed(2); }
  D.meta.asOf = TO + 'T21:00:00Z'; D.meta.ledgerTo = TO;
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(D));
  console.log('rolled to', TO, 'days', newDays.length, 'book', secValue.toFixed(2), 'total', D.total, 'pl', JSON.stringify(D.pl));
})().catch((e) => { console.error(e.message); process.exit(1); });
