// Downloads the full monthly price history of the three benchmark ETFs (euro listings on Xetra) and stores
// each one's annualised growth rate (CAGR) over the longest window the three share, so they are comparable.
// The Outlook tab uses these as each benchmark's expected return.
// Output: <data dir>/index_history.json  { ISIN: { sym, from, to, years, cagr } }
// Usage:  node pipeline/fetch_index_history.js [data dir, default data/private]
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const INDEX = { IE00B4L5Y983: 'EUNL.DE', IE00B5BMR087: 'SXR8.DE', IE00B53SZB19: 'SXRV.DE' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function monthly(sym) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${sym}?range=max&interval=1mo`, { headers: UA }).catch(() => null);
    if (r && r.ok) {
      const res = (await r.json()).chart.result[0], c = res.indicators.adjclose ? res.indicators.adjclose[0].adjclose : res.indicators.quote[0].close;
      return res.timestamp.map((t, k) => [new Date(t * 1000).toISOString().slice(0, 7), c[k]]).filter((x) => x[1] != null);
    }
    await wait(1500 * (i + 1));
  }
  throw new Error('no data for ' + sym);
}
(async () => {
  const S = {};
  for (const [isin, sym] of Object.entries(INDEX)) { S[isin] = await monthly(sym); await wait(400); }
  // the accumulating ETFs reinvest dividends, so the price series is already a total return; start at the
  // second month of the youngest fund, to skip its partial first month
  const from = Object.values(S).map((s) => s[1][0]).sort().pop();
  const out = {};
  for (const [isin, s] of Object.entries(S)) {
    const a = s.find((x) => x[0] >= from), b = s[s.length - 1];
    const years = (Date.parse(b[0] + '-15') - Date.parse(a[0] + '-15')) / (365.25 * 864e5);
    out[isin] = { sym: INDEX[isin], from: a[0], to: b[0], years: +years.toFixed(2), cagr: +((b[1] / a[1]) ** (1 / years) - 1).toFixed(4) };
    console.log(isin, INDEX[isin], a[0], '→', b[0], (out[isin].cagr * 100).toFixed(1) + '% a year');
  }
  fs.writeFileSync(path.join(dir, 'index_history.json'), JSON.stringify(out, null, 1));
})();
