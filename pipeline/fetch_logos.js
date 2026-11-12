// Downloads a small square logo per instrument and stores it as a data URI, so the page needs no image host.
// Source: Parqet's logo service by ISIN (64 px tiles), else Financial Modeling Prep by ticker, resized with
// ImageMagick when it is installed. Instruments without a logo get none; the page then draws a monogram.
// Usage: node pipeline/fetch_logos.js <out.json> <ISIN[:TICKER]> ...
const fs = require('fs');
const { execFileSync } = require('child_process');
const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36' };
const png = (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
async function grab(url) { const r = await fetch(url, { headers: UA }).catch(() => null); if (!r || !r.ok) return null; const b = Buffer.from(await r.arrayBuffer()); return png(b) ? b : null; }
function shrink(b) {
  try { return execFileSync('convert', ['png:-', '-resize', '64x64', '-strip', 'png:-'], { input: b }); } catch (e) { return b.length < 16000 ? b : null; }
}
(async () => {
  const [out, ...ids] = process.argv.slice(2);
  const res = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  for (const id of ids) {
    const [isin, ticker] = id.split(':');
    if (res[isin]) continue;
    let b = await grab(`https://assets.parqet.com/logos/isin/${isin}?format=png&size=64`);
    if (!b && ticker) { const f = await grab(`https://financialmodelingprep.com/image-stock/${encodeURIComponent(ticker)}.png`); b = f && shrink(f); }
    if (b) res[isin] = 'data:image/png;base64,' + b.toString('base64');
    console.log(isin, ticker || '', b ? b.length + ' B' : 'none');
  }
  fs.writeFileSync(out, JSON.stringify(res));
})();
