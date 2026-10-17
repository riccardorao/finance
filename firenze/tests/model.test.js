/* Verifica numerica del modello: node firenze/tests/model.test.js
   Controlla, per ogni scenario e per alcuni valori estremi, che le identità contabili reggano,
   che nessun risultato sia NaN e che le verifiche automatiche dell'Allegato D siano superate. */
const FM = require("../src/model.js");
let failed = 0;
const fail = (m) => { failed++; console.error("FALLITO:", m); };
const finite = (o, path, label) => Object.entries(o).forEach(([k, v]) => {
  if (typeof v === "number" && !isFinite(v) && k !== "mcpf") fail(`${label}: ${path}${k} non è finito`);
  else if (v && typeof v === "object" && !Array.isArray(v)) finite(v, path + k + ".", label);
});
const scenarios = FM.SCEN_ORDER.map((k) => [k, FM.SCEN[k]]);
for (const [k, s] of scenarios) {
  const P = FM.defaults(); FM.SCEN_KEYS.forEach((id) => (P[id] = s[id]));
  const R = FM.run(P), path = FM.path(P, R), san = FM.sanity(P, R, path);
  finite(R, "", k);
  san.filter((x) => x.s === "bad").forEach((x) => fail(`${k}: ${x.t} – ${x.d}`));
  if (Math.abs(R.stake.reduce((a, x) => a + x.v, 0) - R.netMonetary) > 1) fail(`${k}: somma dei portatori di interesse`);
  console.log(`${k.padEnd(10)} saldo ${(R.saldo / 1e6).toFixed(1).padStart(6)} mln · dividendo €${Math.round(R.perHH)} · verifiche ${san.filter((x) => x.s === "ok").length}/${san.length}`);
}
const extremes = [{ tmin: 3, alpha: 0 }, { tmin: 30, alpha: 0.2 }, { tmin: 30, alpha: 0.2, cap: 5, dayFee: 15 }, { tmin: 12, alpha: 0.08, passThrough: 0.4, epsMult: 1.6, evasion: 0.4, stateLevy: 0.5 },
  { tmin: 100, alpha: 0 }, { tmin: 3, alpha: 1 }, { tmin: 100, alpha: 1 }, { tmin: 100, alpha: 1, cap: 100 }, { tmin: 60, alpha: 0.5, dayFee: 15 }];
extremes.forEach((e, i) => {
  const P = Object.assign(FM.defaults(), e), R = FM.run(P), san = FM.sanity(P, R, FM.path(P, R));
  finite(R, "", "estremo " + i);
  san.filter((x) => x.s === "bad").forEach((x) => fail(`estremo ${i}: ${x.t}`));
});
const mc = FM.monteCarlo(FM.defaults(), 400);
if (!(mc.saldo.p10 > 0)) fail("lo scenario Centrale dovrebbe avere saldo positivo nel 90% delle simulazioni");
console.log(failed ? `\n${failed} controlli falliti` : "\nTutti i controlli superati");
process.exit(failed ? 1 : 0);
