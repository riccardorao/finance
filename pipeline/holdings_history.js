// Replays tx.csv into holdings and cash at given dates. Shared by the history builder and its checks.
const fs = require('fs');
const path = require('path');
function loadTx(dir) {
  return fs.readFileSync(path.join(dir, 'tx.csv'), 'utf8').trim().split('\n').slice(1).map((l, i) => {
    const [date, cust, kind, isin, qty, amt] = l.split(',');
    return { i, date, t: Date.parse(date.length === 16 ? date + ':00Z' : date), cust, kind, isin, qty: qty === '' ? 0 : +qty, amt: amt === '' ? 0 : +amt };
  }).sort((a, b) => a.t - b.t || a.i - b.i);
}
// cash effect of each kind (euro), quantity effect of each kind
const CASH = { buy: -1, cbuy: -1, sell: 1, csell: 1, exp: 0, dep: 1, wdr: -1, xin: 1, xout: -1, div: 1, fee: -1, int: 1, bon: 1, tout: 0 };
const QTY = { buy: 1, cbuy: 1, sell: -1, csell: -1, exp: -1 };
/** Returns a function state(t) -> { cash, qty: {isin: q} } for any time t (inclusive of trades at t). */
function replay(tx) {
  return (t) => {
    let cash = 0; const qty = {};
    for (const r of tx) { if (r.t > t) break; cash += (CASH[r.kind] || 0) * r.amt; if (QTY[r.kind]) qty[r.isin] = (qty[r.isin] || 0) + QTY[r.kind] * r.qty; }
    for (const k of Object.keys(qty)) if (Math.abs(qty[k]) < 1e-6) delete qty[k];
    return { cash, qty };
  };
}
/** Instrument class used to carve the stock book out of the account. types: optional {isin: type} overrides. */
const instrumentType = (isin, types = {}) => types[isin] || (['BTC', 'ETH', 'ADA', 'SOL'].includes(isin) ? 'Crypto' : /^DE000BB/.test(isin) ? 'Leveraged & certificates' : /^(IE|LU)/.test(isin) ? 'ETFs & ETCs' : 'Shares');
module.exports = { loadTx, replay, instrumentType, CASH, QTY };
