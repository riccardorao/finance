// Downloads the long-run monthly history of the three benchmark indices and stores each one's annualised
// growth rate (CAGR) from January 1989 to today. The Outlook tab uses these as each benchmark's expected return.
// The ETFs on the page only start in 2009-10, so the long run uses the indices themselves (Yahoo Finance):
// price indices in US dollars, which exclude dividends, like the analyst price targets they are compared with.
// Output: <data dir>/index_history.json  { ISIN: { sym, from, to, years, cagr, basis } }
// Usage:  node pipeline/fetch_index_history.js [data dir, default data/private] [from YYYY-MM, default 1989-01]
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const FROM = process.argv[3] || '1989-01';
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
// ETF ISIN on the page -> index it tracks
const INDEX = { IE00B4L5Y983: '^990100-USD-STRD', IE00B5BMR087: '^GSPC', IE00B53SZB19: '^NDX' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// last daily close on or before day t (ms), and the latest price
async function closes(sym, t) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?period1=${Math.floor(t / 1000) - 20 * 86400}&period2=${Math.floor(t / 1000) + 86400}&interval=1d`, { headers: UA }).catch(() => null);
    if (r && r.ok) {
      const res = (await r.json()).chart.result[0], c = res.indicators.quote[0].close;
      const rows = (res.timestamp || []).map((x, k) => [x * 1000, c[k]]).filter((x) => x[1] != null && x[0] <= t + 864e5);
      if (!rows.length) throw new Error(`${sym} has no close before ${new Date(t).toISOString().slice(0, 10)}`);
      return { start: rows[rows.length - 1], end: [res.meta.regularMarketTime * 1000, res.meta.regularMarketPrice] };
    }
    await wait(1500 * (i + 1));
  }
  throw new Error('no data for ' + sym);
}
(async () => {
  const out = {};
  // start at the last close before FROM, so the window covers FROM in full
  const t0 = Date.UTC(+FROM.slice(0, 4), +FROM.slice(5, 7) - 1, 1) - 864e5;
  for (const [isin, sym] of Object.entries(INDEX)) {
    const { start, end } = await closes(sym, t0); await wait(400);
    const years = (end[0] - start[0]) / (365.25 * 864e5);
    const day = (x) => new Date(x).toISOString().slice(0, 10);
    out[isin] = { sym, from: FROM, to: day(end[0]).slice(0, 7), start: [day(start[0]), +start[1].toFixed(2)], end: [day(end[0]), +end[1].toFixed(2)], years: +years.toFixed(2), cagr: +((end[1] / start[1]) ** (1 / years) - 1).toFixed(4), basis: 'price index in US dollars, excluding dividends' };
    console.log(isin, sym, out[isin].start.join(' '), '→', out[isin].end.join(' '), (out[isin].cagr * 100).toFixed(1) + '% a year');
  }
  fs.writeFileSync(path.join(dir, 'index_history.json'), JSON.stringify(out, null, 1));
})();
