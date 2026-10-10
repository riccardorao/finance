/* Planning: savings opportunities found in the data, and medium-to-long-term goals with a monthly plan.
   Pure functions shared by the page and the Node tests. Amounts in cents; rates are yearly fractions.
   The figures are illustrations under stated assumptions, not financial advice. */

// Four broad ways to hold money for a goal, by how long it can stay put. Returns are yearly, net of costs and tax,
// before inflation; volatility is the yearly standard deviation. Users can change the return in Settings.
const PROFILES = [
  { id: 'liquidity', maxYears: 2, r: 0.02, vol: 0.005, icon: '💧' },
  { id: 'prudent', maxYears: 5, r: 0.03, vol: 0.04, icon: '🛡️' },
  { id: 'balanced', maxYears: 10, r: 0.045, vol: 0.09, icon: '⚖️' },
  { id: 'growth', maxYears: 99, r: 0.06, vol: 0.15, icon: '🌱' },
];
const GOAL_TYPES = [
  { id: 'emergency', icon: '🛟' }, { id: 'home', icon: '🏡' }, { id: 'car', icon: '🚗' }, { id: 'travel', icon: '✈️' },
  { id: 'family', icon: '👨‍👩‍👧' }, { id: 'study', icon: '🎓' }, { id: 'retirement', icon: '🌅' }, { id: 'health', icon: '🩺' }, { id: 'other', icon: '⭐' },
];
const profileById = (state, id) => {
  const p = PROFILES.find((x) => x.id === id) || PROFILES[0];
  const r = state && state.plan && state.plan.returns && state.plan.returns[p.id];
  return r != null && isFinite(r) ? { ...p, r } : p;
};

const monthsUntil = (from, ym) => {
  const [y0, m0] = from.slice(0, 7).split('-').map(Number), [y1, m1] = ym.split('-').map(Number);
  return (y1 - y0) * 12 + (m1 - m0);
};
const profileForMonths = (months) => PROFILES.find((p) => months <= p.maxYears * 12).id;

// Value after n months: starting pot pv plus a monthly payment pmt, compounding monthly at yearly rate r.
function futureValue(pv, pmt, r, n) {
  const i = r / 12;
  if (n <= 0) return pv;
  if (Math.abs(i) < 1e-12) return pv + pmt * n;
  const g = Math.pow(1 + i, n);
  return pv * g + pmt * (g - 1) / i;
}
// Monthly payment that turns pv into target in n months at rate r (never negative).
function requiredMonthly(target, pv, r, n) {
  if (n <= 0) return Math.max(0, target - pv);
  const i = r / 12, g = Math.pow(1 + i, n);
  const pmt = Math.abs(i) < 1e-12 ? (target - pv) / n : (target - pv * g) * i / (g - 1);
  return Math.max(0, pmt);
}
// Months needed to reach target with pmt a month (Infinity if never within 100 years).
function monthsToTarget(target, pv, pmt, r) {
  if (pv >= target) return 0;
  for (let n = 1; n <= 1200; n++) if (futureValue(pv, pmt, r, n) >= target) return n;
  return Infinity;
}
// Standard normal CDF (Abramowitz-Stegun 7.1.26).
function normCdf(x) {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + (x >= 0 ? y : -y));
}
// The yearly return that would exactly reach target, found by bisection.
function impliedRate(target, pv, pmt, n) {
  let lo = -0.5, hi = 0.5;
  if (futureValue(pv, pmt, hi, n) < target) return Infinity;
  if (futureValue(pv, pmt, lo, n) >= target) return -Infinity;
  for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2; if (futureValue(pv, pmt, mid, n) >= target) hi = mid; else lo = mid; }
  return hi;
}
// Rough chance of reaching target: the average yearly return over the horizon is taken as normal around r with
// spread vol/sqrt(years). It ignores the order of returns, which is good enough for a guide.
function chanceOfReaching(target, pv, pmt, profile, n) {
  if (pv >= target) return 1;
  const need = impliedRate(target, pv, pmt, n);
  if (need === Infinity) return 0;
  if (need === -Infinity) return 1;
  const years = Math.max(n / 12, 1 / 12);
  const sd = profile.vol / Math.sqrt(years);
  if (sd < 1e-6) return profile.r >= need ? 1 : 0;
  return normCdf((profile.r - need) / sd);
}
// Yearly path with a central line and a 90% range (5th and 95th percentile of the average return).
function projection(pv, pmt, profile, n) {
  const pts = [];
  const step = Math.max(1, Math.round(n / 24));
  for (let k = 0; k <= n; k += step) pts.push(k);
  if (pts[pts.length - 1] !== n) pts.push(n);
  return pts.map((k) => {
    const years = Math.max(k / 12, 1 / 12);
    const sd = profile.vol / Math.sqrt(years);
    return { k, mid: futureValue(pv, pmt, profile.r, k), lo: futureValue(pv, pmt, profile.r - 1.645 * sd, k), hi: futureValue(pv, pmt, profile.r + 1.645 * sd, k), paid: pv + pmt * k };
  });
}

/* ---------- what the household can put aside ---------- */
// Average monthly surplus over the last 12 months (income minus all spending, one-offs included), the average
// one-off spending, and the yearly savings the household has decided to make (adopted opportunities).
function capacity(state, today) {
  const m = monthly(state);
  const cur = monthOf(today);
  const months = monthsRange(addMonths(cur, -12), addMonths(cur, -1)).filter((k) => m[k]);
  const avg = (f) => (months.length ? months.reduce((s, k) => s + f(m[k]), 0) / months.length : 0);
  const surplus = avg((r) => r.inc - r.out);
  const extra = avg((r) => r.extra);
  const adopted = Object.values((state.plan && state.plan.adopted) || {}).reduce((s, a) => s + (a.annual || 0), 0) / 12;
  const manual = state.plan && state.plan.monthly;
  const monthlyAvail = manual != null ? manual : Math.max(0, surplus) + adopted;
  return { surplus, extra, adopted, months: months.length, monthly: monthlyAvail, manual: manual != null, spend: avg((r) => r.out - r.extra) };
}

/* ---------- goals ---------- */
// Each goal: { id, name, type, target, date: 'YYYY-MM', saved, monthly (null = let the plan decide), profile ('auto' or an id), priority 1-3, real }
// The plan funds goals in order (priority, then date): each receives what it needs to stay on track until the
// money available each month runs out.
function planGoals(state, today) {
  const cap = capacity(state, today);
  const infl = state.plan && state.plan.inflation != null ? state.plan.inflation : 0.02;
  let left = cap.monthly;
  const goals = [...(state.goals || [])].sort((a, b) => (a.priority || 2) - (b.priority || 2) || a.date.localeCompare(b.date));
  const rows = goals.map((g) => {
    const n = Math.max(0, monthsUntil(today, g.date));
    const prof = profileById(state, !g.profile || g.profile === 'auto' ? profileForMonths(n) : g.profile);
    const target = g.real ? Math.round(g.target * Math.pow(1 + infl, n / 12)) : g.target;
    // Sized for a 3-in-4 chance: the monthly payment that reaches the target at the 25th-percentile return.
    const safeRate = prof.r - 0.674 * prof.vol / Math.sqrt(Math.max(n / 12, 1 / 12));
    const need = requiredMonthly(target, g.saved || 0, safeRate, n);
    const plannedMonthly = g.monthly != null ? g.monthly : Math.min(need, Math.max(0, left));
    left -= plannedMonthly;
    const fv = futureValue(g.saved || 0, plannedMonthly, prof.r, n);
    const chance = chanceOfReaching(target, g.saved || 0, plannedMonthly, prof, n);
    const eta = monthsToTarget(target, g.saved || 0, plannedMonthly, prof.r);
    const status = (g.saved || 0) >= target ? 'done' : chance >= 0.7 ? 'ok' : chance >= 0.4 ? 'tight' : 'short';
    return { goal: g, n, profile: prof, target, need, planned: plannedMonthly, fv, chance, eta, status, progress: Math.min(1, (g.saved || 0) / (target || 1)) };
  });
  const needTotal = rows.reduce((s, r) => s + (r.status === 'done' ? 0 : r.need), 0);
  return { rows, capacity: cap, needTotal, spare: cap.monthly - rows.reduce((s, r) => s + r.planned, 0) };
}
// A sensible first goal: six months of ordinary spending set aside.
function emergencyTarget(state, today) {
  const c = capacity(state, today);
  return Math.ceil((c.spend * 6) / 50000) * 50000;
}

/* ---------- savings opportunities ---------- */
// Each: { id, kind, p (text parameters), annual (cents a year at the default setting), pct (adjustable share or null), ids }
const DISCRETIONARY = { ristoranti: 0.25, shopping: 0.2, svago: 0.15, spesa: 0.08, trasporti: 0.1, famiglia: 0.1, altro: 0.1 };
const ENERGY = /ENEL|HERA|A2A|IREN|EDISON|PLENITUDE|SORGENIA|ACEA|ENGIE|ILLUMIA|ITALGAS|ESTRA|AGSM|ALPERIA|DOLOMITI| GAS|LUCE|ENERGIA/;
function opportunities(state, today) {
  const out = [];
  const yearAgo = addDays(today, -365);
  const tx = state.txns.filter((t) => t.date > yearAgo && counted(state, t));
  const firstDate = state.txns.reduce((d, t) => (t.date < d ? t.date : d), today);
  const months = Math.min(12, Math.max(1, daysBetween(firstDate > yearAgo ? firstDate : yearAgo, today) / 30.4));
  const rec = findRecurring(state).filter((r) => r.sign < 0 && !r.stopped);

  for (const r of rec.filter((x) => x.cat === 'abbonamenti')) out.push({ id: 'sub|' + r.key, kind: 'cancel', p: { name: r.name, typical: r.typical, period: r.period }, annual: r.annual, pct: null, ids: r.ids });
  // About €10 a month buys a generous mobile or €25 a home internet plan today; anything well above may be worth a look.
  for (const r of rec.filter((x) => x.cat === 'telefono' && (x.typical * x.perYear) / 12 > 1500)) {
    const fair = (/FIBRA|FASTWEB|ADSL|CASA|LINEA FISSA|EOLO|LINKEM/.test(normDesc(r.name)) ? 2500 : 1000) * 12;
    out.push({ id: 'phone|' + r.key, kind: 'phone', p: { name: r.name, typical: r.typical }, annual: Math.max(0, r.annual - fair), pct: null, ids: r.ids });
  }
  const energy = rec.filter((x) => x.cat === 'casa' && ENERGY.test(' ' + normDesc(x.name)));
  if (energy.length) {
    const annual = energy.reduce((s, r) => s + r.annual, 0);
    out.push({ id: 'energy', kind: 'energy', p: { names: energy.map((r) => r.name), annual }, annual: Math.round(annual * 0.15), pct: 15, ids: energy.flatMap((r) => r.ids) });
  }
  const ins = -tx.filter((t) => t.cat === 'assicurazioni').reduce((s, t) => s + t.amt, 0) * (12 / months);
  if (ins >= 30000) out.push({ id: 'insurance', kind: 'insurance', p: { annual: ins }, annual: Math.round(ins * 0.1), pct: 10 });
  const fees = -tx.filter((t) => t.cat === 'banca').reduce((s, t) => s + t.amt, 0) * (12 / months);
  if (fees >= 3000) out.push({ id: 'fees', kind: 'fees', p: { annual: fees }, annual: Math.round(fees * 0.7), pct: 70 });
  for (const [cat, pct] of Object.entries(DISCRETIONARY)) {
    const spent = -tx.filter((t) => t.cat === cat && !t.extra).reduce((s, t) => s + t.amt, 0) * (12 / months);
    if (spent >= 60000) out.push({ id: 'trim|' + cat, kind: 'trim', p: { cat, annual: spent, monthly: spent / 12 }, annual: Math.round(spent * pct), pct: Math.round(pct * 100) });
  }
  const cash = -tx.filter((t) => t.cat === 'contanti').reduce((s, t) => s + t.amt, 0) * (12 / months);
  if (cash >= 60000) out.push({ id: 'cash', kind: 'cash', p: { annual: cash }, annual: Math.round(cash * 0.1), pct: 10 });
  // Money sitting idle beyond a 6-month cushion could earn something in a deposit account (about 2-3% gross today).
  const bals = balances(state);
  const total = Object.values(bals).reduce((s, b) => s + b.bal, 0);
  const cushion = capacity(state, today).spend * 6;
  if (Object.keys(bals).length && total - cushion > 500000) out.push({ id: 'idle', kind: 'idle', p: { extra: total - cushion }, annual: Math.round((total - cushion) * 0.02), pct: null });
  // Adjustable opportunities follow the household's own percentage (state.plan.oppPct); adopted ones feed the goals.
  const adopted = (state.plan && state.plan.adopted) || {}, pcts = (state.plan && state.plan.oppPct) || {};
  for (const o of out) {
    o.adopted = !!adopted[o.id];
    o.base = o.pct != null ? Math.round(o.annual / (o.pct / 100)) : o.annual;
    if (o.pct != null && pcts[o.id] != null) { o.pct = pcts[o.id]; o.annual = Math.round(o.base * o.pct / 100); }
  }
  return out.filter((o) => o.base >= 1000).sort((a, b) => b.base - a.base);
}

if (typeof module !== 'undefined') {
  const core = require('./core.js');
  Object.assign(globalThis, core);
  module.exports = { PROFILES, GOAL_TYPES, profileById, monthsUntil, profileForMonths, futureValue, requiredMonthly, monthsToTarget, normCdf, impliedRate, chanceOfReaching, projection, capacity, planGoals, emergencyTarget, opportunities };
}
