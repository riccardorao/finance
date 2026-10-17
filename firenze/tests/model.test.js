/* Verifica numerica del modello: node firenze/tests/model.test.js
   Controlla, per la politica di base, per diversi transitori e per valori estremi delle leve,
   che le identità contabili reggano, che nessun risultato sia NaN e che le verifiche automatiche siano superate. */
const FM = require("../src/model.js");
let failed = 0;
const fail = (m) => { failed++; console.error("FALLITO:", m); };
const finite = (o, path, label) => Object.entries(o).forEach(([k, v]) => {
  if (typeof v === "number" && !isFinite(v) && k !== "mcpf") fail(`${label}: ${path}${k} non è finito`);
  else if (v && typeof v === "object" && !Array.isArray(v)) finite(v, path + k + ".", label);
});
function check(label, P) {
  const R = FM.run(P), tl = FM.timeline(P, R), san = FM.sanity(P, R, tl);
  finite(R, "", label);
  tl.years.forEach((y) => {
    finite(y.R, "", `${label} anno ${y.year}`);
    const wf = y.R.dTax - y.R.collateral + y.R.savings - y.R.fund;
    if (Math.abs(wf - y.R.saldo) > 1) fail(`${label} anno ${y.year}: identità del conto economico`);
    if (y.R.units < -1e-9 || y.R.units > P.strUnits + 1e-6) fail(`${label} anno ${y.year}: riconversioni fuori campo`);
  });
  san.filter((x) => x.s === "bad").forEach((x) => fail(`${label}: ${x.t} – ${x.d}`));
  if (Math.abs(R.stake.reduce((a, x) => a + x.v, 0) - R.netMonetary) > 1) fail(`${label}: somma dei portatori di interesse`);
  return { R, tl, san };
}
// politica di base e transitori da 1 a 8 anni
for (let n = 1; n <= FM.PLAN_MAX; n++) {
  const P = FM.defaults(); FM.resizePlan(P, n);
  const { R, tl, san } = check(`transitorio ${n}`, P);
  const y1 = tl.years[0].R, last = tl.years[tl.years.length - 1].R;
  console.log(`transitorio ${n}: anno 1 saldo ${(y1.saldo / 1e6).toFixed(1).padStart(6)} · regime ${(R.saldo / 1e6).toFixed(1)} · ultimo anno ${(last.saldo / 1e6).toFixed(1)} mln · verifiche ${san.filter((x) => x.s === "ok").length}/${san.length}`);
  if (n > 1 && Math.abs(y1.nChg) > Math.abs(R.nChg) + 1e-9) fail(`transitorio ${n}: il primo anno non dovrebbe essere più duro del regime`);
}
// percorso personalizzato, con un anno di riduzione e la garanzia spenta
{
  const P = FM.defaults(); FM.resizePlan(P, 4); P.plan.custom = true; P.plan.rows = FM.rampPlan(P, 4);
  P.plan.rows.tmin = [20, 6, 9]; P.plan.rows.guaranteeOn = [false, true, true]; P.plan.rows.dayFee = [0, 3, 5];
  check("personalizzato", P);
  const back = FM.merge(FM.defaults(), JSON.parse(JSON.stringify(P)));
  if (back.plan.rows.tmin[0] !== 20 || back.plan.n !== 4) fail("il piano personalizzato non sopravvive al salvataggio");
}
// valori estremi delle leve
const extremes = [{ tmin: 0, alpha: 0 }, { tmin: 3, alpha: 0 }, { tmin: 30, alpha: 0.2 }, { tmin: 30, alpha: 0.2, cap: 5, dayFee: 20 },
  { tmin: 100, alpha: 0 }, { tmin: 3, alpha: 1 }, { tmin: 100, alpha: 1 }, { tmin: 100, alpha: 1, cap: 100 }, { tmin: 60, alpha: 0.5, dayFee: 15, u30: 50 },
  { u30: 20 }, { fundCommercial: 40, fundTalent: 40, trainCost: 15000, trainCoverage: 1 }, { guaranteeOn: false, trainCoverage: 0 }];
extremes.forEach((e, i) => { const P = Object.assign(FM.defaults(), e); FM.resizePlan(P, 1 + (i % 5)); check("estremo " + i, P); });
const mc = FM.monteCarlo(FM.defaults(), 400);
if (!(mc.saldo.p10 > 0)) fail("la politica di base dovrebbe avere saldo positivo nel 90% delle simulazioni");
console.log(failed ? `\n${failed} controlli falliti` : "\nTutti i controlli superati");
process.exit(failed ? 1 : 0);
