// Builds the single-file app: app/wealth.html with the market data (app/market.json, from fetch_market.js) and the
// latest opportunities screen (data/private/opportunities.json, public-company research only) built in.
// Usage: node app/build.js [out, default dist/wealth.html]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, 'dist', 'wealth.html'));
const safe = (s) => s.replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
const market = fs.readFileSync(path.join(__dirname, 'market.json'), 'utf8');
const rf = path.join(root, 'data', 'private', 'opportunities.json');
const research = fs.existsSync(rf) ? fs.readFileSync(rf, 'utf8') : 'null';
const html = fs.readFileSync(path.join(__dirname, 'wealth.html'), 'utf8').replace('/*__MARKET__*/null', safe(market)).replace('/*__RESEARCH__*/null', safe(research));
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, html);
console.log('wrote', path.relative(process.cwd(), out), (html.length / 1024).toFixed(1) + ' KB');
