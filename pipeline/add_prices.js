// Appends month-end prices (from get_security_chart, timeframe max) to <data>/prices_monthly.json.
// Usage: node pipeline/add_prices.js <data dir> <ISIN> <first month YYYY-MM> <comma-separated prices>
// The last point of each calendar month is taken as its month-end price.
const fs = require('fs'); const path = require('path');
const [dir, isin, start, list] = process.argv.slice(2);
const f = path.join(dir, 'prices_monthly.json');
const o = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
const p = list.split(',').map(Number);
if (p.some((x) => !(x > 0))) throw new Error('bad price in list');
o[isin] = { start, p };
fs.writeFileSync(f, JSON.stringify(o));
const [y, m] = start.split('-').map(Number); const e = new Date(Date.UTC(y, m - 1 + p.length - 1, 1)).toISOString().slice(0, 7);
console.log(isin, start, '→', e, p.length, 'months');
