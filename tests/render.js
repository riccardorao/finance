// Renders the built page in Chromium the way the Artifact host wraps it, clicks through every tab,
// reports console errors and horizontal overflow, and saves one screenshot per tab and viewport.
// Usage: node tests/render.js [page, default dist/portfolio.html] [out dir, default test-output]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const page = path.resolve(process.argv[2] || path.join(root, 'dist', 'portfolio.html'));
const outDir = path.resolve(process.argv[3] || path.join(root, 'test-output'));
fs.mkdirSync(outDir, { recursive: true });
const wrapped = path.join(outDir, '_wrapped.html');
fs.writeFileSync(wrapped, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif;background:#f9f9f7}img{max-width:100%}[hidden]{display:none!important}</style></head><body>${fs.readFileSync(page, 'utf8')}</body></html>`);
const TABS = ['book', 'record', 'risk'];
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let failed = 0;
  for (const c of [{ name: 'desktop', w: 1280, scheme: 'light' }, { name: 'dark', w: 1280, scheme: 'dark' }, { name: 'phone', w: 400, scheme: 'light' }]) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: 900 }, colorScheme: c.scheme });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_BLOCKED/.test(m.text())) errs.push(m.text()); });
    await p.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
    await p.goto('file://' + wrapped + '#risk'); // a hash must not override the Portfolio start tab
    await p.waitForTimeout(500);
    if (await p.evaluate(() => document.getElementById('t-book').hidden)) errs.push('page did not open on the Portfolio tab');
    for (const t of TABS) {
      await p.click(`#tab-${t}`);
      if (t === 'book') await p.click('#t-book .pos-row');
      await p.waitForTimeout(250);
      const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth, h: document.documentElement.scrollHeight }));
      if (o.sw > o.w) { errs.push(`horizontal overflow on ${t}: ${o.sw} > ${o.w}`); }
      await p.screenshot({ path: path.join(outDir, `${c.name}-${t}.png`), fullPage: true });
    }
    console.log(c.name, errs.length ? 'ERRORS\n  ' + errs.join('\n  ') : 'ok');
    failed += errs.length;
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
