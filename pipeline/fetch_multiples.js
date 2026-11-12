// Reads forward P/E and PEG ratio for each ticker from stockanalysis.com's statistics pages.
// Usage: node pipeline/fetch_multiples.js <in opportunities.json> (writes fwdPE and peg into it)
const fs = require('fs');
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const URL = { ASML: 'https://stockanalysis.com/stocks/asml/statistics/', ENR: 'https://stockanalysis.com/quote/etr/ENR/statistics/', CCJ: 'https://stockanalysis.com/stocks/ccj/statistics/' };
async function stats(tk) {
  const u = URL[tk] || `https://stockanalysis.com/stocks/${tk.toLowerCase()}/statistics/`;
  const r = await fetch(u, { headers: UA }).catch(() => null); if (!r || !r.ok) return {};
  const t = (await r.text()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const num = (re) => { const m = re.exec(t); return m && m[1] !== 'n/a' ? +m[1].replace(/,/g, '') : null; };
  return { fwdPE: num(/Forward PE ([\d.,]+|n\/a)/), peg: num(/PEG Ratio ([\d.,]+|n\/a)/), url: u };
}
(async () => {
  const f = process.argv[2], O = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const x of O.ideas.concat(O.shortlist)) {
    const s = await stats(x.ticker); x.fwdPE = s.fwdPE; x.peg = s.peg; x.multiplesSrc = s.url;
    console.log(x.ticker.padEnd(6), 'fwd P/E', s.fwdPE, 'PEG', s.peg);
    await new Promise((r) => setTimeout(r, 400));
  }
  fs.writeFileSync(f, JSON.stringify(O));
})();
