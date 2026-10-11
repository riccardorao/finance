// Renders the viewer edition in Chromium against a mocked Scalable Capital connector (data/sample/feed.json).
// Checks: opens on Portfolio whatever the link says, every tab fills in from the viewer's own account, nothing
// personal is built into the page, no console errors, no sideways scroll, and the degraded states read sensibly.
// Usage: node tests/viewer.js [page, default dist/viewer-sample.html] [feed, default data/sample/feed.json] [out dir]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const mock = require('./mock_mcp.js');
const root = path.join(__dirname, '..');
const pageFile = path.resolve(process.argv[2] || path.join(root, 'dist', 'viewer-sample.html'));
const feed = JSON.parse(fs.readFileSync(path.resolve(process.argv[3] || path.join(root, 'data', 'sample', 'feed.json')), 'utf8'));
const outDir = path.resolve(process.argv[4] || path.join(root, 'test-output', 'viewer'));
fs.mkdirSync(outDir, { recursive: true });
const html = fs.readFileSync(pageFile, 'utf8');
const wrapped = path.join(outDir, '_wrapped.html');
fs.writeFileSync(wrapped, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#f9f9f7}[hidden]{display:none!important}</style></head><body>${html}</body></html>`);
const fails = [];
const check = (c, msg) => { if (!c) fails.push(msg); };

async function run(name, mode, width, fn) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_BLOCKED/.test(m.text())) errs.push(m.text()); });
  await p.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await p.addInitScript(mock(feed, mode));
  await p.goto('file://' + wrapped + '#risk'); // a hash must not override the Portfolio start tab
  await fn(p);
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  check(o.sw <= o.w, `${name}: horizontal overflow ${o.sw} > ${o.w}`);
  await p.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true });
  errs.forEach((e) => fails.push(`${name}: ${e}`));
  await browser.close();
  console.log(name, 'done');
}
const loaded = (p) => p.waitForFunction(() => document.getElementById('status').dataset.mode !== 'loading', null, { timeout: 20000 });

(async () => {
  check(!/Riccardo|riccardo|Freedom Fund/.test(html.replace(/\(DATA\.profile && DATA\.profile\.fund\) \|\| 'Freedom Fund'/, '')), 'the page contains personal strings');
  for (const [name, width] of [['ok-desktop', 1280], ['ok-phone', 400]]) {
    await run(name, 'ok', width, async (p) => {
      await p.waitForSelector('#t-book .pos-row', { timeout: 20000 });
      check(!(await p.evaluate(() => document.getElementById('t-book').hidden)), `${name}: did not open on Portfolio`);
      await loaded(p);
      const rows = await p.$$eval('#t-book .pos-row', (r) => r.length);
      check(rows === feed.holdings.holdings.length, `${name}: ${rows} rows, expected ${feed.holdings.holdings.length}`);
      const val = await p.$eval('#mh-value', (e) => e.textContent);
      check(/€2[0-9],[0-9]{3}/.test(val), `${name}: header value ${val}`);
      await p.click('#tab-record'); await p.waitForSelector('#perfchart svg', { timeout: 5000 }).catch(() => fails.push(`${name}: no performance chart`));
      const lede = await p.$eval('#t-record .lede h2', (e) => e.textContent).catch(() => '');
      check(/My portfolio is (up|down)/.test(lede), `${name}: lede "${lede}"`);
      await p.click('#tab-risk'); await p.waitForSelector('#fan svg', { timeout: 5000 }).catch(() => fails.push(`${name}: no outlook chart`));
      await p.click('#tab-book');
    });
  }
  await run('partial', 'partial', 1280, async (p) => { await p.waitForSelector('#t-book .pos-row', { timeout: 20000 }); await loaded(p); const st = await p.$eval('#status-text', (e) => e.textContent); check(/no price history|could not be read/.test(st), 'partial: status ' + st); });
  await run('denied', 'denied', 1280, async (p) => { await loaded(p); const st = await p.$eval('#status-text', (e) => e.textContent); check(/not allowed/.test(st), 'denied: status ' + st); });
  await run('no-mcp', 'none', 1280, async (p) => { await p.waitForFunction(() => /Open this page in claude.ai/.test(document.body.textContent), null, { timeout: 15000 }); });
  await run('multi', 'multi', 1280, async (p) => { await p.waitForSelector('[data-pf]', { timeout: 15000 }); await p.click('[data-pf="A"]'); await p.waitForSelector('#t-book .pos-row', { timeout: 20000 }); await loaded(p); });
  if (fails.length) { console.error('FAILED\n  ' + fails.join('\n  ')); process.exit(1); }
  console.log('viewer edition ok');
})();
