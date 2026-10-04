// Downloads daily closing prices in euro for every instrument the account has held and for the indices,
// from Yahoo Finance's public chart endpoint. Symbols are found by ISIN search (cached in symbols.json,
// which can be edited by hand); non-euro listings are converted at the daily ECB-style FX close.
// Output: <data dir>/prices_daily.json  { ISIN: { sym, ccy, d: [YYYY-MM-DD], p: [EUR] } }
// Usage: node pipeline/fetch_daily.js [data dir, default data/private] [from YYYY-MM-DD, default first trade]
const fs = require('fs');
const path = require('path');
const { loadTx } = require('./holdings_history.js');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const HOST = 'https://query2.finance.yahoo.com';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers: UA }).catch(() => null);
    if (r && r.ok) return r.json();
    await wait(1500 * (i + 1));
  }
  return null;
}
const symFile = path.join(dir, 'symbols.json');
const SYM = fs.existsSync(symFile) ? JSON.parse(fs.readFileSync(symFile, 'utf8')) : {};
const CRYPTO = { BTC: 'BTC-EUR', ETH: 'ETH-EUR', SOL: 'SOL-EUR', ADA: 'ADA-EUR' };
const PREF = ['.DE', '.F', '.MI', '.PA', '.AS', '.L', '.CO', ''];
async function resolve(isin) {
  if (SYM[isin] !== undefined) return SYM[isin];
  if (CRYPTO[isin]) return (SYM[isin] = CRYPTO[isin]);
  const j = await get(`${HOST}/v1/finance/search?q=${isin}&quotesCount=10&newsCount=0`);
  const q = ((j && j.quotes) || []).filter((x) => x.symbol);
  const rank = (s) => { const i = PREF.findIndex((p) => (p ? s.endsWith(p) : !s.includes('.'))); return i < 0 ? 99 : i; };
  q.sort((a, b) => rank(a.symbol) - rank(b.symbol));
  SYM[isin] = q.length ? q[0].symbol : null;
  await wait(400);
  return SYM[isin];
}
async function chart(sym, p1, p2) {
  const j = await get(`${HOST}/v8/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d&events=split`);
  const r = j && j.chart && j.chart.result && j.chart.result[0];
  if (!r || !r.timestamp) return null;
  const c = r.indicators.quote[0].close, out = { ccy: r.meta.currency, d: [], p: [] };
  r.timestamp.forEach((t, i) => { if (c[i] != null) { out.d.push(new Date((t + r.meta.gmtoffset) * 1000).toISOString().slice(0, 10)); out.p.push(c[i]); } });
  return out;
}
(async () => {
  const tx = loadTx(dir);
  const from = process.argv[3] || tx[0].date.slice(0, 10);
  const p1 = Math.floor(Date.parse(from + 'T00:00:00Z') / 1000) - 10 * 86400, p2 = Math.floor(Date.now() / 1000);
  const INDEX = ['IE00B4L5Y983', 'IE00B6R52259', 'IE00B5BMR087', 'IE00B53SZB19', 'DE000A2QP4B6'];
  const isins = Array.from(new Set(tx.filter((r) => r.isin && /buy|sell|exp/.test(r.kind)).map((r) => r.isin).concat(INDEX)));
  const fx = {};
  const toEur = async (ccy) => {
    if (ccy === 'EUR') return null;
    if (fx[ccy]) return fx[ccy];
    const base = ccy === 'GBp' ? 'GBP' : ccy === 'ZAc' ? 'ZAR' : ccy;
    const s = await chart(`EUR${base}=X`, p1, p2); await wait(300);
    fx[ccy] = s ? { m: new Map(s.d.map((d, i) => [d, s.p[i]])), div: ccy === 'GBp' ? 100 : 1 } : null;
    return fx[ccy];
  };
  const out = {}, missing = [];
  for (const isin of isins) {
    const sym = await resolve(isin);
    if (!sym) { missing.push(isin); continue; }
    const s = await chart(sym, p1, p2); await wait(300);
    if (!s || s.d.length < 5) { missing.push(isin + ' ' + sym); continue; }
    const f = await toEur(s.ccy);
    let last = null;
    const p = s.d.map((d, i) => { if (!f) return s.p[i]; const r = f.m.get(d) || last; if (f.m.get(d)) last = f.m.get(d); return r ? s.p[i] / f.div / r : null; });
    const keep = p.map((x, i) => x != null);
    out[isin] = { sym, ccy: s.ccy, d: s.d.filter((_, i) => keep[i]), p: p.filter((_, i) => keep[i]).map((x) => +x.toFixed(4)) };
    process.stdout.write(`${isin} ${sym} ${s.ccy} ${out[isin].d.length}\n`);
  }
  fs.writeFileSync(symFile, JSON.stringify(SYM, null, 1));
  fs.writeFileSync(path.join(dir, 'prices_daily.json'), JSON.stringify(out));
  console.log('done', Object.keys(out).length, 'series; missing:', missing.join(', ') || 'none');
})();
