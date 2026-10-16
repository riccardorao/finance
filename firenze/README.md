# Il Dividendo di Firenze

| File | What it is |
|---|---|
| `dividendo-firenze-it.html` | Italian white-paper edition: interactive on screen, A4 layout when printed (Stampa → Salva come PDF) |
| `white-paper-dividendo-firenze.pdf` | A4 PDF of the Italian white paper, central scenario (26 pages) |
| `dividendo-firenze.html` | English simulator, same model and numbers |

`dividendo-firenze.html` is a single-page, offline simulator of a proposed reform of Florence's tourist tax
(*imposta di soggiorno*): a progressive tariff `t = max(T_min, α · p_night)`, an exemption for EU citizens under 30,
and a "civic dividend" that returns the net surplus to residents through lower local taxes and free transit.

Open the file in a browser. Levers on the left change the tax design and market response; every input in the
*Assumptions* section can be edited and is tagged as published data, a third-party estimate or a model assumption,
with links to sources. Edits persist in the browser's local storage.

What the model covers:

1. **Tax function** – new tariff per visitor persona against today's flat tariffs (Delibera DG/2024/00535).
2. **Demand** – five personas with log-normal nightly prices and constant price elasticities; partial pass-through;
   displacement to the metropolitan belt.
3. **Municipal account** – calibrated to 2025 revenue (≈ €82m), extra evasion, the 30% State levy on extra revenue,
   collateral effects on TARI, IMU, IRPEF surcharge and fees, operating savings, Fondo Armonizzatore.
4. **Housing** – short-let owners switch to long lets when the reform pushes short-let net income below long-let
   income after a risk discount; rent and price effects from the supply shock.
5. **Civic dividend**, five-year transition path, first/second/third-order effects, sensitivity tornado and
   legal-feasibility checks.

Annex C of the Italian edition runs automatic numerical checks on every change: calibration to 2025 revenue,
the accounting identity of the waterfall, conservation of overnight stays, direction of effects, convergence
of the five-year path, the Laffer scan and the implied elasticity. The uncertainty table uses 400 seeded
Monte Carlo draws.

To regenerate the PDF for another scenario, open the Italian HTML in a browser and print to PDF; the print
stylesheet lays it out on A4.

All figures are estimates under stated assumptions, for discussion.
