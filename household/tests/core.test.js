// Unit tests for the parsing, categorising and checking logic. Run: node --test household/tests/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../src/core.js');

test('amounts in Italian and English formats', () => {
  assert.strictEqual(C.parseAmount('1.234,56'), 123456);
  assert.strictEqual(C.parseAmount('-1.234,56'), -123456);
  assert.strictEqual(C.parseAmount('1,234.56'), 123456);
  assert.strictEqual(C.parseAmount('12,00-'), -1200);
  assert.strictEqual(C.parseAmount('(45,10)'), -4510);
  assert.strictEqual(C.parseAmount('€ 7,5'), 750);
  assert.strictEqual(C.parseAmount('−13,99 €'), -1399);
  assert.strictEqual(C.parseAmount('+400,00'), 40000);
  assert.strictEqual(C.parseAmount('1.234'), 123400, 'a lone dot with three digits is a thousands separator');
  assert.strictEqual(C.parseAmount('12.5', false), 1250);
  assert.strictEqual(C.parseAmount(-12.3), -1230);
  assert.strictEqual(C.parseAmount(-0.125), -13, 'halves round away from zero');
  assert.strictEqual(C.parseAmount('abc'), null);
  assert.strictEqual(C.parseAmount(''), null);
});

test('dates', () => {
  assert.strictEqual(C.parseDate('31/12/2026'), '2026-12-31');
  assert.strictEqual(C.parseDate('01.02.26'), '2026-02-01');
  assert.strictEqual(C.parseDate('2026-03-04'), '2026-03-04');
  assert.strictEqual(C.parseDate('12/31/2026', 'mdy'), '2026-12-31');
  assert.strictEqual(C.parseDate('5 mar 2026'), '2026-03-05');
  assert.strictEqual(C.parseDate('5 settembre 2026'), '2026-09-05');
  assert.strictEqual(C.parseDate(46022), '2025-12-31', 'Excel serial');
  assert.strictEqual(C.parseDate('31/02/2026'), null);
  assert.strictEqual(C.parseDate('Totale'), null);
});

test('merchant keys group the same payee', () => {
  const a = C.merchantKey('PAGAMENTO POS 13/07 ESSELUNGA SPA MILANO CARTA *1234');
  const b = C.merchantKey('PAGAMENTO POS 02/08 ESSELUNGA SPA MILANO CARTA *1234');
  assert.strictEqual(a, b);
  assert.match(a, /^ESSELUNGA/);
  assert.match(C.merchantKey('ADDEBITO DIRETTO SDD ENEL ENERGIA SPA BOLLETTA N. 1234567'), /^ENEL ENERGIA/);
});

test('built-in categories, with word boundaries and signs', () => {
  const cat = (desc, amt) => C.categorise({ desc, amt }, []).cat;
  assert.strictEqual(cat('ACCREDITO PENSIONE INPS RATEO 07/2026', 168540), 'pensione');
  assert.strictEqual(cat('VERSAMENTO CONTRIBUTI INPS COLF', -30000), 'altro', 'INPS only means pension when money comes in');
  assert.strictEqual(cat('PAGAMENTO POS ESSELUNGA SPA', -5000), 'spesa');
  assert.strictEqual(cat('ADDEBITO SDD ENEL ENERGIA', -9000), 'casa');
  assert.strictEqual(cat('ENI STATION 4412', -6000), 'trasporti');
  assert.strictEqual(cat('SERVIZI GENERALI', -6000), 'assicurazioni', 'GENERALI is an insurer');
  assert.strictEqual(cat('PAGAMENTO POS SERVIZIO TECNICO', -6000), 'altro', 'ENI must not match inside SERVIZIO');
  assert.strictEqual(cat('CANONE RAI', -9000), 'tasse');
  assert.strictEqual(cat('CANONE MENSILE CONTO', -600), 'banca');
  assert.strictEqual(cat('IMPOSTA DI BOLLO E/C', -855), 'banca');
  assert.strictEqual(cat('NETFLIX.COM', -1399), 'abbonamenti');
  assert.strictEqual(cat('APPLE.COM/BILL', -299), 'abbonamenti');
  assert.strictEqual(cat('PRELIEVO BANCOMAT ATM 0042', -15000), 'contanti');
  assert.strictEqual(cat('BONIFICO DA MARIO ROSSI', 5000), 'entrate_altre');
});

test('user rules come first and are applied to similar movements', () => {
  const rules = [{ words: ['FARMACIA'], cat: 'famiglia' }];
  assert.strictEqual(C.categorise({ desc: 'FARMACIA COMUNALE', amt: -100 }, rules).cat, 'famiglia');
  const s = C.emptyState();
  s.accounts.push({ id: 'a', name: 'A', checkpoints: [] });
  C.mergeImport(s, 'a', [{ date: '2026-01-02', desc: 'PAGAMENTO POS BOTTEGA LUCIA', amt: -2000 }], { file: 'x' });
  assert.strictEqual(s.txns[0].cat, 'altro');
  s.rules.push({ words: [C.merchantKey('PAGAMENTO POS BOTTEGA LUCIA')], cat: 'spesa', sign: 'out' });
  C.recategorise(s);
  assert.strictEqual(s.txns[0].cat, 'spesa');
});

test('BCC-style CSV: preamble, header, running balance, final total row', () => {
  const rows = C.parseCSV(fs.readFileSync(path.join(__dirname, '..', 'sample', 'bcc-movimenti-esempio.csv'), 'latin1'));
  const map = C.detectTable(rows);
  assert.ok(map, 'header found');
  assert.strictEqual(map.bank, 'BCC');
  assert.strictEqual(rows[map.headerRow][0], 'Data contabile');
  const { txns, skipped } = C.rowsToTxns(rows, map);
  assert.strictEqual(txns.length, 14);
  assert.deepStrictEqual(skipped, []);
  assert.strictEqual(txns[0].amt, 168540);
  assert.strictEqual(txns[3].desc, 'ADDEBITO DIRETTO SDD ENEL ENERGIA SPA BOLLETTA');
  assert.deepStrictEqual(C.checkpointsFromFile(txns), [{ date: '2026-06-30', bal: 350000, src: 'file' }, { date: '2026-09-30', bal: 702566, src: 'file' }]);
  assert.deepStrictEqual(C.checkpointsFromFile([...txns].reverse()), C.checkpointsFromFile(txns), 'newest-first files give the same balances');
});

test('separate money-in and money-out columns, comma CSV, quoted cells', () => {
  const csv = 'Data,Descrizione,Uscite,Entrate\n"02/03/2026","Spesa, Conad","45,10",\n03/03/2026,Rimborso,,"12,00"\n';
  const rows = C.parseCSV(csv);
  const map = C.detectTable(rows);
  const { txns } = C.rowsToTxns(rows, map);
  assert.deepStrictEqual(txns.map((t) => [t.date, t.desc, t.amt]), [['2026-03-02', 'Spesa, Conad', -4510], ['2026-03-03', 'Rimborso', 1200]]);
});

test('re-importing an overlapping file adds nothing twice, but keeps genuine same-day repeats', () => {
  const s = C.emptyState();
  s.accounts.push({ id: 'a', name: 'A', checkpoints: [] });
  const one = [{ date: '2026-01-02', desc: 'CAFFE', amt: -120 }, { date: '2026-01-02', desc: 'CAFFE', amt: -120 }, { date: '2026-01-03', desc: 'X', amt: -500 }];
  const r1 = C.mergeImport(s, 'a', one, { file: '1' });
  assert.strictEqual(r1.added, 3);
  const r2 = C.mergeImport(s, 'a', one.concat([{ date: '2026-01-04', desc: 'Y', amt: -700 }]), { file: '2' });
  assert.deepStrictEqual([r2.added, r2.dup], [1, 3]);
  // the same movement arriving from the bank link with a different description is recognised
  const r3 = C.mergeImport(s, 'a', [{ date: '2026-01-05', desc: 'Y - CARD 1234', amt: -700 }], { file: 'bank', kind: 'bank' });
  assert.deepStrictEqual([r3.added, r3.fuzzy], [0, 1]);
  assert.strictEqual(C.undoImport(s, r2.id), 1);
  assert.strictEqual(s.txns.length, 3);
});

test('transfers between own accounts are paired and left out of totals', () => {
  const s = C.emptyState();
  s.accounts.push({ id: 'a', name: 'A', checkpoints: [] }, { id: 'b', name: 'B', checkpoints: [] });
  C.mergeImport(s, 'a', [{ date: '2026-02-03', desc: 'BONIFICO A MARIO ROSSI', amt: -40000 }, { date: '2026-02-04', desc: 'PAGAMENTO POS CONAD', amt: -3000 }], { file: 'a' });
  const r = C.mergeImport(s, 'b', [{ date: '2026-02-04', desc: 'Ricarica da IBAN', amt: 40000 }], { file: 'b' });
  assert.strictEqual(r.transfers, 1);
  const m = C.monthly(s)['2026-02'];
  assert.deepStrictEqual([m.inc, m.out], [0, 3000]);
});

test('statement PDF lines (Hype layout guess)', () => {
  const L = (...items) => ({ items: items.map(([s, x]) => ({ s, x })) });
  const lines = [
    L(['Estratto conto HYPE', 40]),
    L(['Data', 40], ['Descrizione', 120], ['Entrate', 400], ['Uscite', 480]),
    L(['04/07/2026', 40], ['Ricarica da IBAN', 120], ['400,00', 400]),
    L(['10/07/2026', 40], ['NETFLIX.COM', 120], ['13,99', 480]),
    L(['Amsterdam NL', 120]),
    L(['22/07/2026', 40], ['PIZZERIA DA MARIO', 120], ['-38,00 €', 480]),
    L(['Pagina 1 di 2', 300]),
    L(['Saldo finale', 40], ['312,50', 480]),
  ];
  const tx = C.txnsFromPdfLines(lines);
  assert.deepStrictEqual(tx.map((t) => [t.date, t.desc, t.amt]), [
    ['2026-07-04', 'Ricarica da IBAN', 40000],
    ['2026-07-10', 'NETFLIX.COM Amsterdam NL', -1399],
    ['2026-07-22', 'PIZZERIA DA MARIO', -3800],
  ]);
  // without column headers the sign is a guess and is flagged
  const guess = C.txnsFromPdfLines([L(['10/07/2026', 40], ['NETFLIX.COM', 120], ['13,99', 480])]);
  assert.strictEqual(guess[0].signGuess, true);
});

test('bank-link JSON', () => {
  const obj = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sample', 'hype-collegamento-esempio.json'), 'utf8'));
  const accs = C.fromSyncJson(obj);
  assert.strictEqual(accs.length, 1);
  assert.strictEqual(accs[0].txns.length, 9);
  assert.deepStrictEqual(accs[0].checkpoint, { date: '2026-09-30', bal: 31250, src: 'bank' });
  assert.strictEqual(C.fromSyncJson({ format: 'other' }), null);
});

test('reconciliation flags a gap between two known balances', () => {
  const s = C.emptyState();
  s.accounts.push({ id: 'a', name: 'BCC', checkpoints: [{ date: '2026-01-31', bal: 100000, src: 'manual' }, { date: '2026-02-28', bal: 90000, src: 'manual' }] });
  C.mergeImport(s, 'a', [{ date: '2026-02-10', desc: 'X', amt: -5000 }], { file: 'x' });
  const f = C.runChecks(s, '2026-03-01').find((x) => x.key === 'chk.recon');
  assert.ok(f, 'reconciliation finding');
  assert.strictEqual(f.p.diff, -5000);
  C.mergeImport(s, 'a', [{ date: '2026-02-20', desc: 'Y', amt: -5000 }], { file: 'y' });
  assert.ok(C.runChecks(s, '2026-03-01').some((x) => x.key === 'chk.reconOk'));
});

test('recurring payments: period, price rise, missing pension', () => {
  const s = C.emptyState();
  s.accounts.push({ id: 'a', name: 'BCC', checkpoints: [] });
  const tx = [];
  for (let m = 1; m <= 8; m++) {
    const mm = String(m).padStart(2, '0');
    tx.push({ date: `2026-${mm}-08`, desc: 'ADDEBITO SDD TIM SPA FATTURA', amt: m < 8 ? -2990 : -3490 });
    if (m < 8) tx.push({ date: `2026-${mm}-01`, desc: 'ACCREDITO PENSIONE INPS', amt: 150000 });
  }
  tx.push({ date: '2026-08-20', desc: 'PAGAMENTO POS CONAD', amt: -3000 });
  C.mergeImport(s, 'a', tx, { file: 'x' });
  const rec = C.findRecurring(s);
  const tim = rec.find((r) => /Tim/.test(r.name));
  assert.strictEqual(tim.period, 'monthly');
  assert.ok(Math.abs(tim.change - (3490 / 2990 - 1)) < 1e-9);
  const checks = C.runChecks(s, '2026-08-21');
  assert.ok(checks.some((f) => f.key === 'chk.rise'));
  const miss = checks.find((f) => f.key === 'chk.missIn');
  assert.ok(miss, 'the August pension is missing');
  assert.strictEqual(miss.level, 'alert');
});

test('dismissed findings stay hidden; demo data produces findings and suggestions', () => {
  const s = C.makeDemo('2026-10-10');
  const f = C.runChecks(s, '2026-10-10');
  const keys = new Set(f.map((x) => x.key));
  for (const k of ['chk.stale', 'chk.backupNever', 'chk.rise', 'chk.dup', 'chk.big', 'chk.reconOk']) assert.ok(keys.has(k), k);
  s.dismissed[f[0].id] = '2026-10-10';
  assert.ok(!C.runChecks(s, '2026-10-10').some((x) => x.id === f[0].id));
  const sug = new Set(C.suggest(s, '2026-10-10').map((x) => x.key));
  for (const k of ['sug.saving', 'sug.subs', 'sug.fees', 'sug.bollo', 'sug.budget']) assert.ok(sug.has(k), k);
});

test('migrating an older or partial saved state', () => {
  const s = C.migrate({ txns: [], accounts: [] });
  assert.strictEqual(s.version, C.SCHEMA_VERSION);
  assert.deepStrictEqual(s.rules, []);
  assert.ok(s.categories.custom);
});
