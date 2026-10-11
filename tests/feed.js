// Unit checks for the viewer edition's browser-side pipeline (src/client/feed.js) on the synthetic sample:
// the history it rebuilds from connector-shaped responses must match the tx.csv pipeline's own output where both
// use the same prices, and share splits in old trades must be found.
const Feed = require('../src/client/feed.js');
const raw = require('../data/sample/feed.json');
const D0 = require('../data/sample/data.json');
const charts = Object.fromEntries(Object.entries(raw.charts).map(([i, c]) => [i, { daily: c.one_year, monthly: c.max }]));
const fails = [];
const check = (c, m) => { if (!c) fails.push(m); };
const D = Feed.build({ ...raw, charts, static: { indices: D0.indices } });
check(D.holdings.length === D0.holdings.length, 'holdings count');
D.holdings.forEach((h) => { const o = D0.holdings.find((x) => x.isin === h.isin); check(o && Math.abs(h.cost - o.cost) < 0.01, `cost ${h.isin}: ${h.cost} vs ${o && o.cost}`); });
const m0 = new Map(D0.history.points.map((p) => [p[0], p]));
let n = 0; for (const p of D.history.points) { if (p[0] < Date.parse('2025-10-03')) continue; const q = m0.get(p[0]); if (!q) continue; n++; check(Math.abs(p[1] - q[1]) <= 0.01 + 1e-6 * q[1], `value at ${new Date(p[0]).toISOString()}: ${p[1]} vs ${q[1]}`); check(p[2] === q[2], 'cumulative flows differ'); }
check(n > 200, 'too few comparable points: ' + n);
check(D.ledger.realised.filter((r) => r.type !== 'Leveraged & certificates').length === D0.ledger.realised.filter((r) => r.type !== 'Leveraged & certificates').length, 'realised rows');
// a 4:1 split: the old trades carry a quarter of today's share count, at four times the (adjusted) chart price
const old = raw.transactions.map((x) => (x.security && x.security.isin === 'US67066G1040' && x.lastEventAt < '2025-06-01' ? { ...x, security: { ...x.security, quantity: String(+x.security.quantity / 4) } } : x));
const E = Feed.build({ ...raw, charts, transactions: old, static: { indices: D0.indices } });
check(E.diag.splitsFixed.join() === 'US67066G1040', 'split not found: ' + E.diag.splitsFixed);
check(Math.abs(E.history.points[100][1] - D.history.points[100][1]) < 1, 'split-corrected history differs');
// a leveraged product and a crypto trade never enter the book
check(!D.diag.historyQty['DE000BB00001'], 'leveraged product in the book');
if (fails.length) { console.error('FAILED\n  ' + fails.slice(0, 10).join('\n  ')); process.exit(1); }
console.log('feed ok');
