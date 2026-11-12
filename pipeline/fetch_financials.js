// Latest reported results per company: the last fiscal quarter and the last fiscal year, from stockanalysis.com's
// income-statement and cash-flow pages (figures in the company's reporting currency).
// Usage: node pipeline/fetch_financials.js <out.json> <ISIN:TICKER[:PATH]> ...   PATH overrides "stocks/<ticker>"
const fs = require('fs');
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const KEYS = ['datekey', 'fiscalYear', 'fiscalQuarter', 'revenue', 'grossMargin', 'operatingMargin', 'epsdil', 'netinccmn', 'fcf'];
async function page(url) { for (let i = 0; i < 3; i++) { const r = await fetch(url, { headers: UA }).catch(() => null); if (r && r.ok) return r.text(); await new Promise((s) => setTimeout(s, 1500 * (i + 1))); } return null; }
function arrays(html) {
  const out = {};
  KEYS.forEach((k) => {
    const m = new RegExp(`[,{]${k}:\\[([^\\]]*)\\]`).exec(html); if (!m) return;
    out[k] = m[1].split(',').map((x) => { x = x.trim(); if (x === 'null' || x === '') return null; if (x[0] === '"') return x.slice(1, -1); return Number(x); });
  });
  const c = /financialCurrency:"([A-Z]{3})"/.exec(html) || /currency:"([A-Z]{3})"/.exec(html);
  out.currency = c ? c[1] : 'USD';
  return out;
}
const growth = (a, b) => (a != null && b != null && b !== 0 ? +(a / Math.abs(b) - (b < 0 ? -1 : 1)).toFixed(4) : null);
function pick(d, i, j) {
  if (!d.datekey || d.datekey[i] == null) return null;
  const g = (k) => (d[k] ? d[k][i] : null), p = (k) => (d[k] && j != null ? d[k][j] : null);
  return { end: d.datekey[i], fy: g('fiscalYear'), fq: g('fiscalQuarter'), rev: g('revenue'), revYoY: growth(g('revenue'), p('revenue')), gm: g('grossMargin'), om: g('operatingMargin'),
    eps: g('epsdil'), epsYoY: growth(g('epsdil'), p('epsdil')), ni: g('netinccmn'), fcf: g('fcf'), revP: p('revenue'), epsP: p('epsdil'), pend: d.datekey[j] || null };
}
(async () => {
  const [out, ...ids] = process.argv.slice(2);
  const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  for (const id of ids) {
    if (process.env.SKIP_DONE && res[id.split(':')[0]] && res[id.split(':')[0]].q && res[id.split(':')[0]].q.revP !== undefined) continue;
    const [isin, ticker, path] = id.split(':'), base = `https://stockanalysis.com/${path || 'stocks/' + ticker.toLowerCase()}`;
    const [qa, qc, ya, yc] = await Promise.all([page(`${base}/financials/?p=quarterly`), page(`${base}/financials/cash-flow-statement/?p=quarterly`), page(`${base}/financials/`), page(`${base}/financials/cash-flow-statement/`)]);
    if (!qa || !ya) { console.log(isin, ticker, 'no data'); continue; }
    delete res[isin];
    const Q = arrays(qa), Y = arrays(ya), QC = qc ? arrays(qc) : {}, YC = yc ? arrays(yc) : {};
    if (QC.fcf) Q.fcf = QC.fcf; if (YC.fcf) Y.fcf = YC.fcf;
    // the annual page can open with a trailing-twelve-month column: skip it
    let yi = 0; while (Y.fiscalYear && Y.fiscalYear[yi] != null && !/^\d{4}$/.test(String(Y.fiscalYear[yi]))) yi++;
    const qj = Q.fiscalQuarter ? Q.fiscalQuarter.findIndex((x, k) => k > 0 && x === Q.fiscalQuarter[0] && +Q.fiscalYear[k] === +Q.fiscalYear[0] - 1) : -1;
    res[isin] = { ticker, ccy: Q.currency || Y.currency, src: `${base}/financials/`, q: pick(Q, 0, qj >= 0 ? qj : 4), y: pick(Y, yi, yi + 1), at: new Date().toISOString().slice(0, 10) };
    const r = res[isin];
    console.log(ticker.padEnd(6), r.ccy, 'Q', r.q && `${r.q.fq} FY${r.q.fy} ${r.q.end} rev ${(r.q.rev / 1e9).toFixed(2)}B ${r.q.revYoY} om ${r.q.om} eps ${r.q.eps} ${r.q.epsYoY} fcf ${r.q.fcf && (r.q.fcf / 1e9).toFixed(2)}`, '| Y', r.y && `FY${r.y.fy} ${r.y.end} rev ${(r.y.rev / 1e9).toFixed(2)}B ${r.y.revYoY} eps ${r.y.eps}`);
    await new Promise((s) => setTimeout(s, 500));
  }
  fs.writeFileSync(out, JSON.stringify(res));
})();
