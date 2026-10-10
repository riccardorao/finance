// Goals and savings maths. Run: node --test 'household/tests/*.test.js'
const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/core.js');
const P = require('../src/plan.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('compounding and the payment that reaches a target', () => {
  assert.strictEqual(P.futureValue(0, 10000, 0, 12), 120000);
  near(P.futureValue(100000, 0, 0.06, 12), 106168, 1);
  const pmt = P.requiredMonthly(1000000, 100000, 0.04, 60);
  near(P.futureValue(100000, pmt, 0.04, 60), 1000000, 1);
  assert.strictEqual(P.requiredMonthly(100, 500, 0.03, 12), 0, 'already there');
  assert.strictEqual(P.monthsToTarget(120000, 0, 10000, 0), 12);
  assert.strictEqual(P.monthsToTarget(1e12, 0, 1, 0), Infinity);
});

test('chance of reaching: 50% at the expected return, higher with a cushion', () => {
  near(P.normCdf(0), 0.5, 1e-6);
  near(P.normCdf(1.645), 0.95, 1e-3);
  const prof = P.PROFILES.find((p) => p.id === 'balanced');
  const pmt = P.requiredMonthly(2000000, 0, prof.r, 96);
  near(P.chanceOfReaching(2000000, 0, pmt, prof, 96), 0.5, 0.01);
  assert.ok(P.chanceOfReaching(2000000, 0, pmt * 1.2, prof, 96) > 0.75);
  assert.strictEqual(P.chanceOfReaching(100, 200, 0, prof, 12), 1);
});

test('profile follows the horizon', () => {
  assert.deepStrictEqual([12, 36, 84, 180].map(P.profileForMonths), ['liquidity', 'prudent', 'balanced', 'growth']);
});

test('the plan funds goals by priority until the money runs out, sized for a 3-in-4 chance', () => {
  const s = C.makeDemo('2026-10-10');
  const plan = P.planGoals(s, '2026-10-10');
  assert.strictEqual(plan.rows[0].goal.type, 'emergency', 'high priority first');
  for (const r of plan.rows) if (r.planned >= r.need - 1) assert.ok(r.chance >= 0.74, `${r.goal.name} ${r.chance}`);
  s.plan.monthly = 20000; // only €200 a month available
  const tight = P.planGoals(s, '2026-10-10');
  assert.ok(tight.rows.reduce((a, r) => a + r.planned, 0) <= 20000 + 1);
  assert.ok(tight.rows.some((r) => r.status === 'short'));
  // inflation-linked goals grow
  const car = tight.rows.find((r) => r.goal.type === 'car');
  assert.ok(car.target > car.goal.target);
});

test('savings opportunities come from the data, adjust with the household’s percentage, and feed capacity', () => {
  const s = C.makeDemo('2026-10-10');
  const opps = P.opportunities(s, '2026-10-10');
  const kinds = new Set(opps.map((o) => o.kind));
  for (const k of ['cancel', 'phone', 'energy', 'fees', 'trim']) assert.ok(kinds.has(k), k);
  const trim = opps.find((o) => o.kind === 'trim');
  s.plan.oppPct = { [trim.id]: 50 };
  const again = P.opportunities(s, '2026-10-10').find((o) => o.id === trim.id);
  near(again.annual, trim.base * 0.5, 1);
  const before = P.capacity(s, '2026-10-10').monthly;
  s.plan.adopted[again.id] = { annual: again.annual };
  near(P.capacity(s, '2026-10-10').monthly - before, again.annual / 12, 1);
});

test('projection band widens around the expected path', () => {
  const prof = P.PROFILES.find((p) => p.id === 'growth');
  const pr = P.projection(100000, 20000, prof, 120);
  const last = pr[pr.length - 1];
  assert.strictEqual(last.k, 120);
  assert.ok(last.lo < last.mid && last.mid < last.hi);
  assert.strictEqual(last.paid, 100000 + 20000 * 120);
});
