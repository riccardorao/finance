// Rebuilds positions, FIFO cost basis, realised P&L, income and flows from <data>/tx.csv,
// checks them against the connector snapshot and writes <data>/ledger.json.
// Usage: node pipeline/ledger.js [data dir, default data/private]
const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'private'));
const NAMES = JSON.parse(fs.readFileSync(path.join(dir, 'names.json'), 'utf8'));
const SNAP = JSON.parse(fs.readFileSync(path.join(dir, 'snapshot.json'), 'utf8'));

const rows = fs.readFileSync(path.join(dir, 'tx.csv'), 'utf8').trim().split('\n').slice(1).map((l, i) => {
  const [date, cust, kind, isin, qty, amt] = l.split(',');
  return { i, date, cust, kind, isin, qty: qty === '' ? null : +qty, amt: amt === '' ? null : +amt };
});
rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.i - b.i));

const lots = {};        // isin -> [{date, qty, cost, cust}]
const realised = {};    // isin -> {pl, proceeds, cost}
const events = {};      // isin -> [{date, side, qty, amt, pl}]
const flows = [];       // external flows
const income = { div: [], fee: [], int: [], bon: [] };
const eps = 1e-9;
const warn = [];

function consume(key, qty, cust) {
  const L = lots[key] || (lots[key] = []);
  let need = qty, cost = 0;
  const pick = (filter) => {
    for (const lot of L) {
      if (need <= eps) break;
      if (lot.qty <= eps || !filter(lot)) continue;
      const take = Math.min(lot.qty, need);
      const part = lot.cost * (take / lot.qty);
      cost += part; lot.cost -= part; lot.qty -= take; need -= take;
    }
  };
  pick((l) => l.cust === cust);
  pick(() => true);
  if (need > 1e-6) warn.push(`short ${key} by ${need}`);
  lots[key] = L.filter((l) => l.qty > eps);
  return cost;
}

for (const r of rows) {
  const d = r.date;
  switch (r.kind) {
    case 'buy': case 'cbuy': {
      (lots[r.isin] || (lots[r.isin] = [])).push({ date: d, qty: r.qty, cost: r.amt, cust: r.cust });
      (events[r.isin] || (events[r.isin] = [])).push({ date: d, side: 'BUY', qty: r.qty, amt: r.amt });
      break;
    }
    case 'sell': case 'csell': case 'exp': {
      const proceeds = r.kind === 'exp' ? 0 : r.amt;
      const cost = consume(r.isin, r.qty, r.cust);
      const o = realised[r.isin] || (realised[r.isin] = { pl: 0, proceeds: 0, cost: 0 });
      o.pl += proceeds - cost; o.proceeds += proceeds; o.cost += cost;
      (events[r.isin] || (events[r.isin] = [])).push({ date: d, side: r.kind === 'exp' ? 'EXPIRED' : 'SELL', qty: r.qty, amt: proceeds, pl: proceeds - cost });
      break;
    }
    case 'tout': { // move lots from Baader to Scalable custody, keeping cost and date
      let need = r.qty;
      const L = lots[r.isin] || [];
      const out = [];
      for (const lot of L) {
        if (need <= eps) break;
        if (lot.cust !== 'B') continue;
        const take = Math.min(lot.qty, need);
        const part = lot.cost * (take / lot.qty);
        out.push({ date: lot.date, qty: take, cost: part, cust: 'S' });
        lot.cost -= part; lot.qty -= take; need -= take;
      }
      if (need > 1e-6) warn.push(`transfer short ${r.isin} ${need}`);
      lots[r.isin] = L.filter((l) => l.qty > eps).concat(out).sort((a, b) => (a.date < b.date ? -1 : 1));
      break;
    }
    case 'dep': flows.push({ date: d, amt: r.amt, kind: 'dep' }); break;
    case 'wdr': flows.push({ date: d, amt: -r.amt, kind: 'wdr' }); break;
    case 'xin': flows.push({ date: d, amt: r.amt, kind: 'xin' }); break;
    case 'xout': flows.push({ date: d, amt: -r.amt, kind: 'xout' }); break;
    case 'div': income.div.push({ date: d, isin: r.isin, amt: r.amt }); break;
    case 'fee': income.fee.push({ date: d, amt: r.amt }); break;
    case 'int': income.int.push({ date: d, amt: r.amt }); break;
    case 'bon': income.bon.push({ date: d, amt: r.amt }); break;
    default: warn.push('unknown kind ' + r.kind);
  }
}

// ---- checks against the live feed
const HOLD = Object.fromEntries(SNAP.holdings.map((h) => [h.isin, [h.qty, h.price]]));
const SINCE_BUY = Object.fromEntries(SNAP.holdings.map((h) => [h.isin, h.perf.SB[1]])); // Scalable's own unrealised P&L
const QUOTE = Object.fromEntries(SNAP.holdings.map((h) => [h.isin, h.quoteMid || h.price])); // price that P&L was measured at

const out = { positions: {}, warn };
let unrealised = 0, valueNow = 0;
console.log('\nPOSITION CHECK (ledger vs Scalable)');
console.log('isin          name                 qty  ledgerQty  cost(FIFO)  impliedCost(Scalable)  diff');
for (const [isin, [q, p]] of Object.entries(HOLD)) {
  const L = lots[isin] || [];
  const lq = L.reduce((s, l) => s + l.qty, 0);
  const cost = L.reduce((s, l) => s + l.cost, 0);
  const implied = q * QUOTE[isin] - SINCE_BUY[isin];
  console.log(isin.padEnd(13), (NAMES[isin] || '').padEnd(20), String(q).padStart(4), lq.toFixed(4).padStart(10), cost.toFixed(2).padStart(11), implied.toFixed(2).padStart(14), (cost - implied).toFixed(2).padStart(10));
  out.positions[isin] = { qty: lq, cost, lots: L };
  unrealised += q * p - cost; valueNow += q * p;
}
// anything else still open?
const stray = Object.entries(lots).filter(([k, L]) => !HOLD[k] && L.reduce((s, l) => s + l.qty, 0) > 1e-4);
console.log('\nOther open lots (should be dust only):');
for (const [k, L] of stray) console.log(' ', k, NAMES[k] || '', L.reduce((s, l) => s + l.qty, 0), L.reduce((s, l) => s + l.cost, 0).toFixed(2));

// ---- realised
let realisedTotal = 0, realisedCrypto = 0;
for (const [k, o] of Object.entries(realised)) { if (['BTC', 'ETH', 'ADA', 'SOL'].includes(k)) realisedCrypto += o.pl; else realisedTotal += o.pl; }
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const divTotal = sum(income.div, (x) => x.amt), feeTotal = sum(income.fee, (x) => x.amt), intTotal = sum(income.int, (x) => x.amt), bonTotal = sum(income.bon, (x) => x.amt);
const dep = sum(flows.filter((f) => f.kind === 'dep'), (f) => f.amt), wdr = sum(flows.filter((f) => f.kind === 'wdr'), (f) => f.amt);
const xin = sum(flows.filter((f) => f.kind === 'xin'), (f) => f.amt), xout = sum(flows.filter((f) => f.kind === 'xout'), (f) => f.amt);
const net = dep + wdr + xin + xout;
const cash = SNAP.cash;
const total = valueNow + cash;

console.log('\nTOTALS');
console.log({ deposits: dep, withdrawals: wdr, internalIn: xin, internalOut: xout, netContributed: net, valueNow: valueNow.toFixed(2), total: total.toFixed(2) });
console.log({ realisedStocksEtfsDerivs: realisedTotal.toFixed(2), realisedCrypto: realisedCrypto.toFixed(2), unrealisedFIFO: unrealised.toFixed(2), unrealisedScalable: Object.values(SINCE_BUY).reduce((a, b) => a + b, 0).toFixed(2), dividends: divTotal.toFixed(2), fees: feeTotal.toFixed(2), interest: intTotal.toFixed(2), bonus: bonTotal });
const plFromFlows = total - net;
const plFromParts = realisedTotal + realisedCrypto + unrealised + divTotal - feeTotal + intTotal;
console.log('\nRECONCILIATION (all-time P&L)');
console.log('Scalable reported MAX P&L        :', SNAP.pl.MAX);
console.log('Value - net contributed          :', plFromFlows.toFixed(2));
console.log('realised+unrealised+div-fees+int :', plFromParts.toFixed(2));
console.log('  + bonus                        :', (plFromParts + bonTotal).toFixed(2));
console.log('residual flows-vs-parts          :', (plFromFlows - plFromParts).toFixed(2));
console.log('warnings:', warn);

out.summary = { dep, wdr, xin, xout, net, realisedTotal, realisedCrypto, unrealised, divTotal, feeTotal, intTotal, bonTotal, total, valueNow };
out.realised = realised; out.events = events; out.flows = flows; out.income = income; out.names = NAMES;
fs.writeFileSync(path.join(dir, 'ledger.json'), JSON.stringify(out, null, 1));
