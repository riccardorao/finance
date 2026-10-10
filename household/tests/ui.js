// Drives the built page in Chromium: demo data through every tab at desktop, dark and phone widths, then a real
// import round (BCC CSV, the same data as XLSX, the bank-link JSON), a category correction that becomes a rule,
// a backup download and a reload. Fails on console errors or sideways scrolling.
// Usage: node household/tests/ui.js [page, default dist/household.html] [out dir, default test-output/household]
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const root = path.join(__dirname, '..', '..');
const page = path.resolve(process.argv[2] || path.join(root, 'dist', 'household.html'));
const outDir = path.resolve(process.argv[3] || path.join(root, 'test-output', 'household'));
const sample = path.join(__dirname, '..', 'sample');
fs.mkdirSync(outDir, { recursive: true });
const TODAY = '2026-10-10';
const TABS = ['home', 'moves', 'budget', 'checks', 'import', 'settings'];

// A minimal XLSX (shared strings, numbers as numbers, dates as Excel serials) built from the sample CSV.
function zip(files) {
  const parts = [], central = [];
  let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text), comp = zlib.deflateRawSync(data), nm = Buffer.from(name), crc = zlib.crc32(data);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(nm.length, 26);
    const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nm.length, 28); cd.writeUInt32LE(off, 42);
    parts.push(local, nm, comp); central.push(cd, nm);
    off += 30 + nm.length + comp.length;
  }
  const cdBuf = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}
function makeXlsx(csvPath, out) {
  const rows = fs.readFileSync(csvPath, 'latin1').split(/\r?\n/).filter(Boolean).map((l) => l.split(';'));
  const strings = [];
  const si = (s) => { let i = strings.indexOf(s); if (i < 0) { i = strings.length; strings.push(s); } return i; };
  const col = (i) => String.fromCharCode(65 + i);
  const serial = (d) => { const [dd, mm, yy] = d.split('/').map(Number); return (Date.UTC(yy, mm - 1, dd) - Date.UTC(1899, 11, 30)) / 864e5; };
  const xmlEsc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const sheetRows = rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
    const ref = col(ci) + (ri + 1);
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(c)) return `<c r="${ref}"><v>${serial(c)}</v></c>`;
    if (/^-?[\d.]+,\d{2}$/.test(c)) return `<c r="${ref}"><v>${Number(c.replace(/\./g, '').replace(',', '.'))}</v></c>`;
    return c ? `<c r="${ref}" t="s"><v>${si(c)}</v></c>` : '';
  }).join('')}</row>`).join('');
  fs.writeFileSync(out, zip({
    '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/workbook.xml': '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Movimenti" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/sharedStrings.xml': `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings.map((s) => `<si><t>${xmlEsc(s)}</t></si>`).join('')}</sst>`,
    'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
  }));
}

(async () => {
  const xlsx = path.join(outDir, 'bcc-movimenti-esempio.xlsx');
  makeXlsx(path.join(sample, 'bcc-movimenti-esempio.csv'), xlsx);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  let failed = 0;
  const fail = (msg) => { console.log('  FAIL', msg); failed++; };
  const watch = (p, errs) => {
    p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  };
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  // 1. Demo data through every tab
  for (const c of [{ name: 'desktop', w: 1200, scheme: 'light' }, { name: 'dark', w: 1200, scheme: 'dark' }, { name: 'phone', w: 390, scheme: 'light' }]) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: 900 }, colorScheme: c.scheme, locale: 'it-IT' });
    await ctx.addInitScript((d) => { window.HOUSEHOLD_TODAY = d; }, TODAY);
    const p = await ctx.newPage();
    const errs = [];
    watch(p, errs);
    await p.goto('file://' + page);
    await p.click('[data-act="demo"]');
    for (const tab of TABS) {
      await p.click(`#tab-${tab}`);
      if (tab === 'moves') await p.click('.tx-main');
      await p.waitForTimeout(150);
      if (await overflow(p)) errs.push(`horizontal overflow on ${tab}`);
      await p.screenshot({ path: path.join(outDir, `${c.name}-${tab}.png`), fullPage: true });
    }
    console.log(c.name, errs.length ? 'ERRORS\n  ' + errs.join('\n  ') : 'ok');
    failed += errs.length;
    await ctx.close();
  }

  // 2. A real import round, starting empty
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true, locale: 'it-IT' });
  await ctx.addInitScript((d) => { window.HOUSEHOLD_TODAY = d; }, TODAY);
  const p = await ctx.newPage();
  const errs = [];
  watch(p, errs);
  await p.goto('file://' + page);
  const importFile = async (file, accountName) => {
    await p.click('#tab-import');
    if (await p.$('[data-act="imp-again"]')) await p.click('[data-act="imp-again"]');
    await p.setInputFiles('#imp-file', file);
    await p.waitForSelector('[data-act="imp-go"]');
    if (accountName) await p.fill('[data-act="draft-name"]', accountName);
    await p.click('[data-act="imp-go"]');
    return (await p.textContent('#main h3')).trim();
  };
  let msg = await importFile(path.join(sample, 'bcc-movimenti-esempio.csv'), 'BCC conto');
  console.log('  csv:', msg);
  if (!/14 movimenti nuovi/.test(msg)) fail('CSV should add 14');
  msg = await importFile(path.join(sample, 'bcc-movimenti-esempio.csv'));
  console.log('  csv again:', msg);
  if (!/0 movimenti nuovi, 14 già presenti/.test(msg)) fail('re-import should skip 14');
  msg = await importFile(xlsx);
  console.log('  xlsx:', msg);
  if (!/0 movimenti nuovi, 14 già presenti/.test(msg)) fail('XLSX of the same data should match the CSV exactly');
  msg = await importFile(path.join(sample, 'hype-collegamento-esempio.json'));
  console.log('  json:', msg);
  if (!/9 movimenti nuovi.*2 trasferimenti/.test(msg)) fail('bank-link JSON should add 9 and pair 2 transfers');

  // checks after import: reconciliation and double charge
  await p.click('#tab-checks');
  const checks = await p.textContent('#main');
  if (!/i saldi tornano/.test(checks)) fail('BCC balances should reconcile');
  if (!/Possibile addebito doppio: Telepass/.test(checks)) fail('Telepass double charge should be flagged');
  if (!/Netflix.*aumentato|Netflix/.test(checks)) console.log('  note: Netflix rise not detected (only 3 payments)');

  // correcting a category offers a rule, which then applies to similar movements
  await p.click('#tab-moves');
  await p.fill('#q', 'farmacia');
  await p.waitForTimeout(400);
  await p.selectOption('select[data-act="set-cat"]', 'famiglia');
  await p.click('[data-act="rule-yes"]');
  const rules = await p.evaluate(() => S.rules.length);
  if (rules !== 1) fail('a rule should have been created');

  // backup download, then reload: data persists
  await p.click('#tab-settings');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-act="backup"]')]);
  const backup = JSON.parse(fs.readFileSync(await dl.path(), 'utf8'));
  if (backup.format !== 'household-backup' || backup.state.txns.length !== 23) fail('backup should hold 23 transactions, got ' + backup.state.txns.length);
  await p.waitForTimeout(300);
  await p.reload();
  await p.waitForTimeout(300);
  const after = await p.evaluate(() => S.txns.length);
  if (after !== 23) fail('after reload expected 23 transactions, got ' + after);
  await p.click('#tab-home');
  await p.screenshot({ path: path.join(outDir, 'imported-home.png'), fullPage: true });
  if (errs.length) { console.log('import ERRORS\n  ' + errs.join('\n  ')); failed += errs.length; } else console.log('import round ok');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
