/* Il Dividendo di Firenze · modello micro-economico
   Modulo puro (nessun accesso al DOM): gira nel browser e in Node per i test.
   Unità: euro all'anno a regime, salvo dove indicato. */
(function(root,factory){ if(typeof module==="object"&&module.exports) module.exports=factory(); else root.FM=factory(); })(typeof self!=="undefined"?self:this,function(){
"use strict";

/* ---------- fonti ---------- */
const SRC=[
  ["irpet","IRPET, Federalismo in Toscana 4/2025: gettito dell'imposta di soggiorno per comune (Firenze 2024: €76,9 mln; 2023: circa €72 mln su 9,2 mln di presenze)","https://www.irpet.it/wp-content/uploads/2025/12/Art.-1-Federalismo-in-Toscana-4_2025.pdf"],
  ["jfc","Osservatorio JFC, via Chekin: gettito 2025 di circa €82 mln; tariffe della Delibera DG/2024/00535","https://chekin.com/it/blog/tassa-di-soggiorno-a-firenze/"],
  ["iommi","IRPET (S. Iommi), Città e turismo, maggio 2025: presenze di Firenze sottostimate per le locazioni brevi","https://www.irpet.it/wp-content/uploads/2025/05/Iommi_Evento-ALI-citta-e-turismo.pdf"],
  ["airbnb","L'Indipendente, 27 maggio 2026: 12.211 annunci Airbnb a Firenze, 85% nel centro","https://www.lindipendente.online/2026/05/27/firenze-e-la-prima-citta-a-limitare-gli-affitti-turistici-anche-fuori-dal-centro-storico/"],
  ["bdi","Banca d'Italia–IRPET, Turismo e mercato immobiliare, marzo 2026","https://www.irpet.it/wp-content/uploads/2026/02/Turismo-e-mercato-immobiliare.pdf"],
  ["rent","La Nazione, 11 settembre 2026 (Idealista): canoni richiesti ad agosto 2026, €21,7/m² in città e €24,6/m² nel centro","https://www.lanazione.it/economia/case-affitto-firenze-prezzi-d8moonhp"],
  ["price","La Nazione, 27 dicembre 2024 (Immobiliare.it Insights): prezzo medio di compravendita oltre €4.500/m² nel 2025","https://www.lanazione.it/economia/mercato-immobiliare-2025-b6ymxkmn"],
  ["tari","La Nazione: piano finanziario TARI, €129,6 mln (2025) → €135,8 mln (2026)","https://www.lanazione.it/firenze/economia/tari-firenze-yfjovybv"],
  ["pop","Comune di Firenze, bollettino statistico di dicembre 2025: 363.737 residenti al 30 novembre 2025","https://www.comune.firenze.it/istruzione/system/files/attachments/bollettino_dicembre2025.pdf"],
  ["day","La Nazione, 22 luglio 2026: 5,6 milioni di escursionisti all'anno secondo Federalberghi","https://www.lanazione.it/firenze/cronaca/estate-gli-affari-tengono-moderata-e6c4fc70"],
  ["irpef","CISL, nota sulle addizionali comunali IRPEF, luglio 2025: Firenze 0,2%, esenzione fino a €25.000","https://www.cisl.it/wp-content/uploads/2025/07/ALL-Nota-addizionale-comunale.pdf"],
  ["cap","Informazione Fiscale: tetto di €10 per notte per i capoluoghi con presenze oltre 20 volte i residenti (art. 4, c. 1-bis, D.Lgs. 23/2011)","https://www.informazionefiscale.it/imposta-di-soggiorno-aumento-quali-comuni"],
  ["levy","Avvenire, ottobre 2025: proroga al 2026 della maggiorazione di €2 e 30% del maggior gettito allo Stato","https://www.avvenire.it/attualita/cambia-tra-le-proteste-la-tassa-di-soggiorno-cosa-finanziera_98465"],
  ["ams","TravelMole: Amsterdam, 12,5% del prezzo della camera, media €18,45 a notte (2025)","https://www.travelmole.com/news/amsterdam-highest-tourist-taxes-europe"],
  ["bcn","Ulysse, Taxes de séjour en Europe 2026: Barcellona, Amsterdam e altre città","https://ulysse.com/news/taxes-sejour-europe-2026-guide-ville-par-ville"],
  ["biagi","Biagi, Brandano, Pulina, Tourism taxation: a synthetic control method for policy evaluation (CRENoS)","https://crenos.unica.it/crenos/publications/tourism-taxation-synthetic-control-method-policy-evaluation"],
  ["elast","Banca d'Italia, QEF n. 482 (2019): elasticità della domanda turistica estera ai prezzi tra −0,5 e −0,7","https://www.bancaditalia.it/pubblicazioni/qef/2019-0482/index.html"],
  ["budget","La Nazione: bilancio di previsione 2025 del Comune, €861 mln di spesa corrente","https://www.lanazione.it/firenze/cronaca/firenze-futuro-prossima-bilancio-2025-tra-68ee9aa1"],
  ["imu","Legge 208/2015, art. 1, c. 53: IMU ridotta del 25% sulle abitazioni locate a canone concordato","https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2015-12-28;208"],
  ["kayak","Kayak: tariffa media di una camera doppia a Firenze di circa €253 a notte (indicativa)","https://www.kayak.it/Hotel-a-Firenze.25345.hotel.ksp"],
  ["cst26","Comune di Firenze, Commissione consiliare, verbale n. 35 del 23 giugno 2026 (dati ISTAT presentati dal Centro Studi Turistici): 11,52 mln di presenze nel 2025, locazioni turistiche incluse","https://commissioni.comune.fi.it/sites/commissioni.comune.fi.it/files/verbali/2026/07/Verbale%20N%C2%B0%2035%20del%2023.6.2026_signed.pdf"],
  ["cstday","Comune di Firenze, comunicato del 5 dicembre 2025 (Centro Studi Turistici, dati di telefonia mobile): circa 8 mln di escursionisti all'anno","https://www.comune.firenze.it/riscossioneonline/novita/area-stampa/comunicati-stampa/turismo-dati-cst-nel-2025-firenze-aumento-arrivi-71-presenze"],
  ["irpettur","IRPET, Rapporto sul turismo in Toscana 2025 (luglio 2026): spesa media giornaliera di €133, €174 per gli stranieri","https://www.irpet.it/wp-content/uploads/2026/07/IRPET_Rapporto-Turismo-in-Toscana-2025.pdf"],
  ["hotstats","Hospitality Net, 1° ottobre 2026 (dati HotStats): alberghi italiani, margine operativo lordo 42,8%, margine dipartimentale 63,9%","https://www.hospitalitynet.org/news/4134689/beyond-the-top-line-italys-secret-profit-recipe"],
  ["iab","Inside Airbnb, Firenze, rilevazione del 19 settembre 2026: 13.571 annunci, di cui 11.271 abitazioni intere","https://data.insideairbnb.com/italy/toscana/florence/2026-09-19/data/listings.csv.gz"],
  ["abitare","IRPET (Agnoletti), Abitare Firenze, 22 maggio 2026: 12.211 unità in affitto breve; ricavo medio €38.148 all'anno, occupazione 77%","https://www.irpet.it/wp-content/uploads/2026/05/Presentazione_AbitareFIRENZE_22maggio2026_agnoletti.pdf"],
  ["boll26","Comune di Firenze, bollettino mensile di statistica n. 182, aprile 2026: 188.634 famiglie e 363.410 residenti al 31 marzo 2026","https://www.comune.firenze.it/riscossioneonline/system/files/attachments/bollettino_aprile2026.pdf"],
  ["cens11","Comune di Firenze, bollettino di statistica, settembre 2012 (censimento 2011): 69,8% delle abitazioni occupate in proprietà, 21,7% in affitto","https://www.comune.fi.it/system/files/2019-02/bollettino_set_12.pdf"],
  ["idealista","Idealista, report su canoni e prezzi a Firenze (2026): prezzo richiesto €4.622/m² ad aprile 2026","https://www.idealista.it/sala-stampa/report-prezzo-immobile/affitto/toscana/firenze-provincia/firenze/"],
  ["tari26","Comune di Firenze, tabelle TARI 2026 (allegato del 28 luglio 2026): €135,8 mln, 35% a carico delle utenze domestiche","https://www.comune.firenze.it/system/files/2026-07/2026-07-28_allegato_tabelle_tari_firenze.pdf"],
  ["bil26","Città metropolitana di Firenze, presentazione del bilancio di previsione 2026–2028 del Comune: €890 mln di spesa corrente; imposta di soggiorno €84,9 mln","https://met.cittametropolitana.fi.it/public/misc/20251209145950258.pdf"],
  ["rend24","Comune di Firenze, Rendiconto 2024, vol. 3: €11,3 mln di addizionale IRPEF incassati","https://amministrazionetrasparente.comune.firenze.it/system/files/2025-05/Rendiconto%202024%20-%20Vol.%203%20-%20Relazione%20sulla%20gestione.pdf"],
  ["cstimp","Centro Studi Turistici di Firenze e IRPET, L'impatto economico del turismo nella Città metropolitana di Firenze (2019): 41.464 unità di lavoro per €3,4 mld di spesa","https://www.fi.camcom.gov.it/sites/default/files/uploads/Promozione_Assistenza_Imprese/Contributi_Camera_Commercio/Impatto_economico_turismo_Area%20Metropolitana2019%20DEFINITIVO.pdf"],
  ["naspi","Ministero del Lavoro, NASpI: 75% della retribuzione fino alla soglia (€1.456,72 nel 2026) e 25% oltre, entro un massimale di €1.584,70","https://www.lavoro.gov.it/temi-e-priorita/ammortizzatori-sociali/focus-on/Indennita-disoccupazione/NASPI/Pagine/naspi.aspx"],
  ["mef","MEF, Dipartimento delle Finanze: disciplina dell'imposta di soggiorno; maggiorazione fino a €2 prorogata al 2026 (L. 199/2025)","https://www.finanze.gov.it/it/fiscalita/fiscalita-regionale-e-locale/TARI-Imposta-di-soggiorno-e-altri-tributi-comunali/imposta-di-soggiorno/Disciplina-del-tributo/"],
  ["venezia","Comune di Venezia, conferenza stampa del 24 ottobre 2024 sul contributo di accesso: bilancio della sperimentazione","https://cda.ve.it/data/files/ConferenzaStampa24Ottobre2024.pdf"]
];
const SRCI=Object.fromEntries(SRC.map((s,i)=>[s[0],i+1]));

/* ---------- tipologie di visitatore ---------- */
const SEG0=[
  {id:"young", name:"Giovani UE under 30, studenti, ricercatori", short:"Giovani U30 UE", share:.12, price:45, sigma:.35, eps:-1.0, tOld:5.0, belt:.20, apt:.40, spend:45, youth:true},
  {id:"budget",name:"Backpacker ed extra-UE a budget ridotto",    short:"Budget",         share:.08, price:38, sigma:.35, eps:-1.4, tOld:4.0, belt:.60, apt:.20, spend:40},
  {id:"mass",  name:"Mass-market in appartamento e hotel di fascia media", short:"Mass-market", share:.46, price:70, sigma:.35, eps:-1.0, tOld:6.0, belt:.50, apt:.60, spend:80},
  {id:"upper", name:"Culturale medio-alto (4★, boutique B&B)",     short:"Medio-alto",     share:.27, price:150,sigma:.30, eps:-0.6, tOld:7.0, belt:.30, apt:.25, spend:130},
  {id:"lux",   name:"Lusso e Ultra-HNWI (5★, suite, ville)",       short:"Lusso",          share:.07, price:520,sigma:.45, eps:-0.2, tOld:8.0, belt:.05, apt:.10, spend:380}
];
const SEGNUM=["share","price","sigma","eps","tOld","belt","apt","spend"];

/* ---------- parametri ---------- */
// g:"leve" = leve di politica (le sole modificabili); altrimenti gruppo di ipotesi in sola lettura.
// kind: dato (cifra pubblicata) | stima (derivata da dati) | letteratura (da studi) | regola (scelta di disegno) | ipotesi (scelta del modello, coperta dall'analisi di sensibilità). pct: mostrato ×100.
const PARAMS=[
  {id:"tmin",g:"leve",sub:"Imposta di soggiorno",label:"Pavimento",sym:"T_min",v:12,min:0,max:100,step:.5,unit:"€/notte",hint:"Importo minimo per notte e per persona, uguale per tutti gli ospiti tassabili."},
  {id:"alpha",g:"leve",sub:"Imposta di soggiorno",label:"Aliquota sul prezzo",sym:"α",v:.08,min:0,max:1,step:.005,pct:1,unit:"% del prezzo",hint:"Si applica quando α × prezzo supera il pavimento: oltre quel prezzo l'imposta cresce con il valore del soggiorno."},
  {id:"cap",g:"leve",sub:"Imposta di soggiorno",label:"Tetto per notte",v:0,min:0,max:100,step:1,unit:"€/notte",hint:"0 = nessun tetto. La legge consente oggi al massimo €10 (€12 con la maggiorazione 2026)."},
  {id:"u30",g:"leve",sub:"Imposta di soggiorno",label:"Imposta per i cittadini UE under 30",v:0,min:0,max:50,step:.5,unit:"€/notte",hint:"Importo fisso per notte; 0 = esenti. Si applica al posto di pavimento e aliquota."},
  {id:"dayFee",g:"leve",sub:"Contributo d'accesso",label:"Contributo per escursionista",v:0,min:0,max:20,step:.5,unit:"€/visita",hint:"Pagato una volta per visita da chi entra in città senza pernottare; 0 = non previsto."},
  {id:"fundCommercial",g:"leve",sub:"Fondo Armonizzatore",label:"Riconversione commerciale",v:6,min:0,max:40,step:.5,unit:"€ mln/anno",hint:"Botteghe, librerie, servizi di vicinato al posto del commercio solo turistico."},
  {id:"fundTalent",g:"leve",sub:"Fondo Armonizzatore",label:"Imprese e talenti",v:8,min:0,max:40,step:.5,unit:"€ mln/anno",hint:"Ricerca, tecnologia, manifattura avanzata."},
  {id:"guaranteeOn",g:"leve",sub:"Fondo Armonizzatore",label:"Garanzia pubblica sugli affitti a residenti",v:true,bool:1,hint:"Il Fondo copre la morosità dei contratti di lungo periodo a residenti: riduce il rischio percepito dai proprietari."},
  {id:"trainCoverage",g:"leve",sub:"Fondo Armonizzatore",label:"Lavoratori in riqualificazione",v:.6,min:0,max:1,step:.05,pct:1,unit:"% dei posti persi",hint:"Quota dei lavoratori del turismo che perdono il posto e seguono un percorso finanziato dal Fondo."},
  {id:"trainCost",g:"leve",sub:"Fondo Armonizzatore",label:"Costo della riqualificazione",v:4000,min:0,max:15000,step:250,unit:"€/lavoratore",hint:"Formazione e ricollocamento; spesa una tantum nell'anno in cui il posto si perde."},

  {id:"passThrough",g:"Mercato e riscossione",label:"Traslazione dell'imposta sull'ospite",v:.85,step:.05,pct:1,unit:"%",kind:"letteratura",note:"Studi sulle imposte alberghiere: circa l'85% dell'imposta ricade sull'ospite, il resto sul gestore."},
  {id:"epsMult",g:"Mercato e riscossione",label:"Moltiplicatore delle elasticità",v:0.8,step:.05,unit:"×",kind:"letteratura",src:["elast", "biagi"],note:"Porta l'elasticità media ponderata a circa −0,7: estremo prudente dell'intervallo −0,3/−0,7 suggerito per Firenze (l'introduzione dell'imposta non ha avuto effetti misurabili sugli arrivi internazionali); la letteratura internazionale di lungo periodo indica circa −1."},
  {id:"evasion",g:"Mercato e riscossione",label:"Evasione sul maggior gettito",v:.10,step:.01,pct:1,unit:"%",kind:"ipotesi",note:"Quota del maggior gettito persa per dichiarazioni infedeli e abusivismo."},
  {id:"stateLevy",g:"Mercato e riscossione",label:"Quota del maggior gettito allo Stato",v:.30,step:.05,pct:1,unit:"%",kind:"dato",src:["levy", "mef"],note:"Legge di bilancio 2026: 30% del maggior gettito."},

  {id:"baseRevenue",g:"Turismo",label:"Gettito attuale dell'imposta",v:82,step:.5,unit:"€ mln",kind:"stima",src:["jfc", "irpet", "bil26"],note:"Stima 2025 (oltre €82 mln); consuntivo 2024 €76,9 mln; previsione 2026 €84,9 mln."},
  {id:"totalNights",g:"Turismo",label:"Notti tassate all'anno",v:13.5,step:.1,unit:"mln",kind:"stima",src:["cst26", "iab"],note:"11,52 mln di presenze ISTAT nel 2025 con le locazioni turistiche, più 1–2 mln di notti in affitto breve non rilevate (stima su Inside Airbnb); coerente con gettito ÷ tariffa media attuale (€6,1)."},
  {id:"recordedNights",g:"Turismo",label:"Presenze registrate (ISTAT)",v:11.5,step:.1,unit:"mln",kind:"dato",src:"cst26",note:"Presenze ISTAT 2025, locazioni turistiche incluse; servono al requisito di legge delle 20 volte i residenti."},
  {id:"minorShare",g:"Turismo",label:"Notti di minori esenti",v:.08,step:.01,pct:1,unit:"%",kind:"ipotesi",note:"Gli under 12 sono esenti: circa una notte su dodici in una città d'arte con forte presenza di famiglie."},
  {id:"epsConvex",g:"Turismo",label:"Aumento dell'elasticità per rincari forti",v:3,step:.25,unit:"κ",kind:"ipotesi",note:"Elasticità = ε·(1 + κ·|Δ log prezzo|): con rincari ampi i visitatori valutano altre destinazioni. Senza questo termine il gettito crescerebbe senza limite."},
  {id:"dayVisitors",g:"Turismo",label:"Escursionisti all'anno",v:8,step:.1,unit:"mln",kind:"stima",src:["cstday", "day"],note:"Stima del Comune su dati di telefonia mobile; Federalberghi indica 5,6 mln. Variato tra 5,6 e 8 mln nell'analisi di incertezza."},
  {id:"dayCost",g:"Turismo",label:"Costo medio di una gita giornaliera",v:60,step:5,unit:"€",kind:"ipotesi",note:"Treno, pranzo, ingressi."},
  {id:"dayElast",g:"Turismo",label:"Elasticità degli escursionisti al costo",v:-.6,step:.05,unit:"",kind:"ipotesi",note:"Una gita costa circa €60: un contributo di €5 è un rincaro dell'8%, cui corrisponde un calo delle visite di circa il 5%."},
  {id:"dayLiable",g:"Turismo",label:"Escursionisti soggetti al contributo",v:0.65,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Esclusi residenti della Città metropolitana, pendolari per lavoro e studio, minori di 14 anni: i dati di telefonia contano anche i visitatori toscani."},
  {id:"dayEvasion",g:"Turismo",label:"Mancata riscossione del contributo",v:.15,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Controlli a campione come a Venezia (circa 140 addetti al giorno, sanzioni da €50 a €300): si assume che sfugga una visita su sette."},
  {id:"daySpend",g:"Turismo",label:"Spesa di un escursionista in città",v:60,step:5,unit:"€",kind:"stima",src:"irpettur",note:"Un turista spende in media €133 al giorno in Toscana, alloggio incluso; un escursionista non paga l'alloggio."},
  {id:"beltReturn",g:"Turismo",label:"Ospiti della cintura che tornano in centro",v:.85,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Chi dorme a Scandicci, Sesto o Bagno a Ripoli viene a Firenze per visitarla: rientra quasi sempre in centro di giorno."},
  {id:"beltPriceRatio",g:"Turismo",label:"Prezzo in cintura rispetto a Firenze",v:.6,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Le strutture della cintura costano in media il 40% in meno di quelle del capoluogo."},
  {id:"beltTax",g:"Turismo",label:"Imposta media nei comuni della cintura",v:2.5,step:.5,unit:"€/notte",kind:"ipotesi",note:"Tariffe dei comuni della cintura, tra €1 e €5 per notte."},

  {id:"cmHotel",g:"Operatori",label:"Margine di contribuzione degli alberghi",v:.65,step:.05,pct:1,unit:"%",kind:"stima",src:"hotstats",note:"Quota del ricavo che resta dopo i costi variabili; HotStats indica un margine dipartimentale del 63,9% per gli alberghi italiani."},
  {id:"hotelMargin",g:"Operatori",label:"Margine operativo lordo degli alberghi",v:0.36,step:.05,pct:1,unit:"%",kind:"stima",src:"hotstats",note:"HotStats: 42,8% per gli alberghi italiani di fascia alta; 25–32% per gli indipendenti ben gestiti. Media per l'offerta fiorentina."},
  {id:"cmComp",g:"Operatori",label:"Margine su ristorazione e commercio",v:.30,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Sulla spesa complementare dei visitatori."},
  {id:"resShareOps",g:"Operatori",label:"Gestori e proprietari residenti a Firenze",v:.65,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Serve a stimare quanta parte del costo ricade su non residenti."},

  {id:"strUnits",g:"Casa",label:"Appartamenti interi in affitto breve",v:12200,step:100,unit:"unità",kind:"dato",src:["abitare", "iab"],note:"12.211 unità in affitto breve registrate (IRPET 2026); Inside Airbnb conta 11.271 abitazioni intere annunciate."},
  {id:"strPremium",g:"Casa",label:"Premio mediano dell'affitto breve R",v:1.3,step:.05,unit:"×",kind:"stima",src:"abitare",note:"Reddito netto da affitto breve ÷ reddito netto da locazione. Circa 1,0–1,1 per un appartamento tipo (ricavi medi €38.148, IRPET), oltre 1,5 nel centro e per i gestori professionali."},
  {id:"premSigma",g:"Casa",label:"Dispersione di R",v:.35,step:.05,unit:"σ",kind:"ipotesi",note:"Dispersione tra appartamenti: un R di 1,0 per gli appartamenti periferici e oltre 2 nel nucleo UNESCO."},
  {id:"riskDiscount",g:"Casa",label:"Sconto per il rischio sulla locazione",v:.15,step:.01,pct:1,unit:"%",kind:"ipotesi",note:"Morosità, tempi di sfratto, perdita di flessibilità."},
  {id:"guaranteeCut",g:"Casa",label:"Sconto eliminato dalla garanzia",v:.5,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Una garanzia pubblica copre la morosità, ma non i tempi di rilascio e la perdita di flessibilità: elimina metà dello sconto per il rischio."},
  {id:"noiMargin",g:"Casa",label:"Margine netto dell'affitto breve",v:.5,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Reddito netto ÷ ricavi lordi."},
  {id:"varCost",g:"Casa",label:"Costi variabili sui ricavi",v:.3,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Commissioni di piattaforma, pulizie, utenze: scendono con i ricavi."},
  {id:"netYield",g:"Casa",label:"Reddito netto della locazione ÷ canone lordo",v:.75,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Dopo cedolare secca, IMU e manutenzione."},
  {id:"toResidential",g:"Casa",label:"Appartamenti riconvertiti che vanno a residenti",v:.85,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Il resto va a studenti e lavoratori temporanei non residenti o resta sfitto."},
  {id:"rentalStock",g:"Casa",label:"Stock in locazione a lungo termine",v:45000,step:1000,unit:"unità",kind:"stima",src:"cens11",note:"21,7% delle famiglie (circa 41.000) più studenti e lavoratori non residenti in affitto."},
  {id:"ownerShare",g:"Casa",label:"Famiglie proprietarie della propria abitazione",v:0.7,step:.02,pct:1,unit:"%",kind:"dato",src:"cens11",note:"Censimento 2011: 69,8% in proprietà, 21,7% in affitto, 8,5% altro titolo."},
  {id:"elD",g:"Casa",label:"Elasticità della domanda di locazione",v:.6,step:.05,unit:"",kind:"ipotesi",note:"Elasticità di breve-medio periodo della domanda di locazione ai canoni (letteratura: 0,4–0,8)."},
  {id:"elS",g:"Casa",label:"Elasticità dell'altra offerta",v:.3,step:.05,unit:"",kind:"ipotesi",note:"Risposta del resto dell'offerta in affitto ai canoni: bassa in una città con pochi spazi edificabili."},
  {id:"strCapShare",g:"Casa",label:"Quota del prezzo che capitalizza l'affitto breve",v:.12,step:.01,pct:1,unit:"%",kind:"ipotesi",note:"Media cittadina; molto più alta nel nucleo UNESCO."},
  {id:"rent",g:"Casa",label:"Canone richiesto",v:21.7,step:.1,unit:"€/m² mese",kind:"dato",src:"rent",note:"Canone richiesto medio in città ad agosto 2026."},
  {id:"price",g:"Casa",label:"Prezzo di compravendita",v:4650,step:50,unit:"€/m²",kind:"stima",src:["price", "idealista"],note:"Prezzi richiesti 2026: €4.622/m² (Idealista), €4.733/m² (Immobiliare.it)."},
  {id:"unitSize",g:"Casa",label:"Superficie tipo",v:70,step:5,unit:"m²",kind:"ipotesi",note:"Superficie tipica di un appartamento in affitto breve nel centro."},
  {id:"hhSize",g:"Casa",label:"Persone per appartamento riconvertito",v:2,step:.1,unit:"persone",kind:"ipotesi",note:"Dimensione media delle famiglie fiorentine circa 1,9 persone."},
  {id:"netNewShare",g:"Casa",label:"Occupanti nuovi per la città",v:.6,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Gli altri sono residenti che si spostano in città."},
  {id:"defaultRate",g:"Casa",label:"Morosità attesa sui contratti garantiti",v:.04,step:.005,pct:1,unit:"% del canone",kind:"ipotesi",note:"Morosità sui contratti di lungo periodo a canone concordato: il costo atteso della garanzia."},

  {id:"jobsPerM",g:"Lavoro",label:"Occupati per €1 mln di spesa turistica",v:10,step:1,unit:"addetti",kind:"stima",src:"cstimp",note:"12,2 unità di lavoro per €1 mln di spesa turistica nel 2018, circa 10 ai prezzi del 2026 (indotto incluso)."},
  {id:"vaRatio",g:"Lavoro",label:"Valore aggiunto ÷ spesa turistica",v:.45,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Quota di valore aggiunto diretto per euro di spesa; IRPET stima 0,67 includendo l'indotto regionale."},
  {id:"wageTourism",g:"Lavoro",label:"Retribuzione annua dei lavoratori del turismo",v:27000,step:500,unit:"€",kind:"ipotesi",note:"Costo annuo di un'unità di lavoro a tempo pieno; INPS registra €11.233 per lavoratore su 183 giornate retribuite."},
  {id:"workerResShare",g:"Lavoro",label:"Posti persi occupati da residenti",v:.4,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Il Comune ha circa il 37% della popolazione metropolitana; molti addetti vivono nella cintura."},
  {id:"above25Tourism",g:"Lavoro",label:"…di cui sopra €25.000",v:.15,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"I lavoratori del turismo hanno redditi bassi (INPS: €11.233 medi all'anno): pochi superano la soglia di esenzione dell'addizionale."},
  {id:"spellMonths",g:"Lavoro",label:"Durata media della disoccupazione",v:6,step:1,unit:"mesi",kind:"ipotesi",note:"Il 24% dei lavoratori del turismo riceve la NASpI (IRPET 2026); durata media di una disoccupazione breve."},
  {id:"trainSpellCut",g:"Lavoro",label:"Riduzione della durata con la riqualificazione",v:.4,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Effetto dei programmi di ricollocamento sulla durata della disoccupazione (valutazioni dei programmi attivi: 20–40%)."},
  {id:"naspiRate",g:"Lavoro",label:"Quota del salario coperta dall'indennità (NASpI)",v:.6,step:.05,pct:1,unit:"%",kind:"ipotesi",src:"naspi",note:"75% della retribuzione fino a €1.456,72 e 25% oltre; media su un anno con la riduzione dal sesto mese. Costo a carico dello Stato."},
  {id:"mpcRes",g:"Lavoro",label:"Quota del dividendo spesa in città",v:.7,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Il dividendo è uno sgravio su tributi e trasporti: in gran parte speso in consumi locali."},
  {id:"jobsPerMRes",g:"Lavoro",label:"Occupati per €1 mln di domanda locale",v:8,step:1,unit:"addetti",kind:"stima",note:"La domanda locale delle famiglie attiva meno lavoro della spesa turistica: 6–9 addetti per €1 mln."},
  {id:"newResSpend",g:"Lavoro",label:"Spesa locale annua di un nuovo residente",v:14000,step:500,unit:"€",kind:"ipotesi",note:"Spesa annua in negozi, servizi e ristorazione cittadina di un residente."},

  {id:"residents",g:"Finanza comunale",label:"Residenti",v:363410,step:100,unit:"persone",kind:"dato",src:"boll26",note:"Residenti al 31 marzo 2026."},
  {id:"households",g:"Finanza comunale",label:"Famiglie",v:188634,step:1000,unit:"",kind:"dato",src:"boll26",note:"Famiglie anagrafiche al 31 marzo 2026."},
  {id:"tariCost",g:"Finanza comunale",label:"Costo del servizio rifiuti",v:135.8,step:.1,unit:"€ mln",kind:"dato",src:["tari", "tari26"],note:"Piano economico finanziario 2026."},
  {id:"tariTouristShare",g:"Finanza comunale",label:"Rifiuti attribuibili ai visitatori",v:.18,step:.01,pct:1,unit:"%",kind:"ipotesi",note:"I visitatori sono circa il 14% delle persone presenti in un giorno medio e producono più rifiuti pro capite in strada."},
  {id:"tariVariable",g:"Finanza comunale",label:"Quota variabile del costo rifiuti",v:.6,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Quota del costo che scende se cala il carico (raccolta, spazzamento straordinario)."},
  {id:"tariGap",g:"Finanza comunale",label:"Differenza TARI non domestica / domestica",v:450,step:10,unit:"€/unità",kind:"ipotesi",note:"Differenza annua tra tariffa non domestica (attività ricettiva) e domestica per un appartamento tipo."},
  {id:"tariNonDomShare",g:"Finanza comunale",label:"Affitti brevi con TARI non domestica",v:.5,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Gestori professionali; gli altri pagano già la tariffa domestica."},
  {id:"imuPerUnit",g:"Finanza comunale",label:"IMU su un appartamento locato",v:1500,step:50,unit:"€/anno",kind:"ipotesi",note:"Aliquota ordinaria 1,06% sulla base imponibile di un appartamento tipo locato."},
  {id:"concordatoShare",g:"Finanza comunale",label:"Riconversioni a canone concordato",v:.6,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Il canone concordato offre cedolare secca al 10% e IMU ridotta: è la scelta prevalente per chi passa al lungo termine."},
  {id:"concordatoCut",g:"Finanza comunale",label:"Riduzione IMU per canone concordato",v:.25,step:.05,pct:1,unit:"%",kind:"dato",src:"imu"},
  {id:"irpefRate",g:"Finanza comunale",label:"Aliquota addizionale IRPEF",v:.002,step:.0005,pct:1,unit:"%",kind:"dato",src:"irpef",note:"Esenti i redditi fino a €25.000."},
  {id:"irpefBase",g:"Finanza comunale",label:"Gettito addizionale IRPEF",v:11.3,step:.5,unit:"€ mln",kind:"dato",src:"rend24",note:"Incassi 2024; aliquota 0,2% con esenzione fino a €25.000."},
  {id:"tariDomBase",g:"Finanza comunale",label:"TARI pagata dalle famiglie",v:47.5,step:1,unit:"€ mln",kind:"stima",src:"tari26",note:"35% del piano finanziario 2026 a carico delle utenze domestiche."},
  {id:"tplBase",g:"Finanza comunale",label:"Costo del trasporto gratuito per i residenti",v:32.5,step:1,unit:"€ mln",kind:"stima",note:"≈ 95.000 abbonati × €343, rimborsati al gestore."},
  {id:"passPrice",g:"Finanza comunale",label:"Abbonamento annuale",v:343,step:10,unit:"€",kind:"dato",note:"Abbonamento annuale urbano ordinario dal 1° agosto 2026 (€342,80)."},
  {id:"incomeNew",g:"Finanza comunale",label:"Reddito dei nuovi residenti",v:40000,step:1000,unit:"€",kind:"ipotesi",note:"Reddito medio di un contribuente fiorentino sopra la soglia di esenzione."},
  {id:"adultTaxpayerShare",g:"Finanza comunale",label:"Nuovi residenti contribuenti",v:.6,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Quota di adulti con reddito tra i nuovi residenti."},
  {id:"above25Share",g:"Finanza comunale",label:"…di cui sopra €25.000",v:.55,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Quota dei contribuenti fiorentini con reddito superiore a €25.000."},
  {id:"feesBase",g:"Finanza comunale",label:"Canoni legati ai flussi",v:28,step:1,unit:"€ mln",kind:"ipotesi",note:"Dehors, ZTL bus turistici, sosta a pagamento."},
  {id:"feesElast",g:"Finanza comunale",label:"Sensibilità dei canoni ai visitatori",v:.7,step:.05,unit:"",kind:"ipotesi",note:"Dehors, ZTL bus turistici e sosta seguono quasi in proporzione il numero di visitatori."},
  {id:"touristCost",g:"Finanza comunale",label:"Spesa corrente legata al carico turistico",v:53,step:1,unit:"€ mln",kind:"stima",src:"bil26",note:"Spazzamento straordinario, manutenzione, sicurezza: circa 6% di €890 mln di spesa corrente."},
  {id:"costVariable",g:"Finanza comunale",label:"…quota che varia con i visitatori",v:.5,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Metà della spesa legata al turismo è fissa (personale e contratti), metà varia con i flussi."},
  {id:"marginalCost",g:"Finanza comunale",label:"Costo marginale dei servizi per nuovo residente",v:350,step:25,unit:"€/anno",kind:"ipotesi",note:"Costo dei servizi comunali per un residente in più, al netto di quelli già dimensionati (scuole, trasporti, rifiuti)."},

  {id:"reserve",g:"Dividendo civico",label:"Riserva prudenziale",v:.15,step:.05,pct:1,unit:"% del saldo",kind:"regola",note:"Accantonata ogni anno contro un cattivo anno turistico, prima di erogare il dividendo."},
  {id:"order",g:"Dividendo civico",label:"Ordine degli sgravi",v:"irpef,tari,tpl",kind:"regola",select:[["irpef,tari,tpl","Addizionale IRPEF → TARI → trasporti"]],note:"Prima l'addizionale IRPEF (sgravio più visibile e meno costoso), poi la TARI domestica, poi il trasporto pubblico gratuito."},

  {id:"demandAdj",g:"Dinamica",label:"Adeguamento della domanda nel primo anno",v:.7,step:.05,pct:1,unit:"%",kind:"ipotesi",note:"Quota della reazione di lungo periodo che si manifesta nell'anno della variazione: prenotazioni anticipate, pacchetti e contratti con i tour operator."},
  {id:"convSpeed",g:"Dinamica",label:"Velocità delle riconversioni",v:.4,step:.05,pct:1,unit:"% all'anno",kind:"ipotesi",note:"Ogni anno si chiude questa quota della distanza tra appartamenti riconvertiti e livello di equilibrio: ristrutturazioni, scadenze e prenotazioni già in calendario."}
];
const PMAP=Object.fromEntries(PARAMS.map(p=>[p.id,p]));
// gruppi di ipotesi, nell'ordine in cui sono presentati
const GROUPS=[
  {id:"Turismo",title:"Domanda turistica",intro:"Quanti visitatori arrivano, quanto pagano oggi e come reagiscono al prezzo. Gettito e presenze sono dati ufficiali; i comportamenti vengono dalla letteratura empirica e sono calibrati in modo da riprodurre il gettito osservato."},
  {id:"Mercato e riscossione",title:"Mercato e riscossione",intro:"Come l'imposta si ripartisce tra ospite e gestore e quanta parte del maggior gettito resta davvero al Comune."},
  {id:"Operatori",title:"Operatori",intro:"Margini di alberghi, ristorazione e commercio: servono a misurare chi sopporta il costo della riforma."},
  {id:"Casa",title:"Casa",intro:"Quando conviene a un proprietario passare dall'affitto breve alla locazione a residenti, e che cosa succede a canoni e prezzi quando lo fa."},
  {id:"Lavoro",title:"Lavoro",intro:"Posti di lavoro legati alla spesa turistica, durata della disoccupazione e domanda locale creata da dividendo e nuovi residenti."},
  {id:"Finanza comunale",title:"Finanza comunale",intro:"Le voci del bilancio comunale toccate dalla riforma: tributi collaterali, costi dei servizi legati ai flussi, sgravi finanziati dal dividendo."},
  {id:"Dividendo civico",title:"Regole del dividendo",intro:"Regole di destinazione del saldo, fissate nella proposta."},
  {id:"Dinamica",title:"Dinamica nel tempo",intro:"Velocità con cui domanda e mercato abitativo si adeguano: determinano il percorso anno per anno, non il risultato a regime."}
];
const LEVER_IDS=PARAMS.filter(p=>p.g==="leve").map(p=>p.id);

/* ---------- politica nel tempo ---------- */
// Leve che possono cambiare anno per anno; le altre leve del Fondo valgono per tutto il programma.
const PLAN_KEYS=["tmin","alpha","cap","u30","dayFee","fundCommercial","fundTalent","guaranteeOn"];
const RAMP_KEYS=["tmin","alpha","dayFee","fundCommercial","fundTalent"];   // in rampa lineare; le altre restano al valore obiettivo
const HORIZON=10, PLAN_MAX=8;
const rnd=(k,v)=>k==="alpha"?Math.round(v*1000)/1000:Math.round(v*2)/2;
// punto di partenza della rampa: la tariffa media di oggi come pavimento, senza aliquota, contributo e Fondo
function origin(P){ const tot=P.segs.reduce((a,s)=>a+s.share,0)||1; const avg=P.segs.reduce((a,s)=>a+s.share/tot*s.tOld,0);
  return {tmin:Math.round(avg*2)/2,alpha:0,dayFee:0,fundCommercial:0,fundTalent:0}; }
function rampPlan(P,n){ const o=origin(P), rows={}; PLAN_KEYS.forEach(k=>rows[k]=[]);
  for(let y=1;y<n;y++) PLAN_KEYS.forEach(k=>rows[k].push(RAMP_KEYS.includes(k)?rnd(k,o[k]+(P[k]-o[k])*y/n):P[k]));
  return rows; }
// leve in vigore nell'anno y (1 = primo anno); dall'anno n in poi valgono gli obiettivi
function levers(P,y){ const pl=P.plan||{n:1}, L={}; PLAN_KEYS.forEach(k=>L[k]=P[k]);
  if(y<pl.n){ const rows=pl.custom&&pl.rows?pl.rows:rampPlan(P,pl.n); PLAN_KEYS.forEach(k=>{ const v=rows[k]&&rows[k][y-1]; if(v!==undefined&&v!==null) L[k]=v; }); }
  return L; }
function resizePlan(P,n){ n=clamp(Math.round(n),1,PLAN_MAX); const pl=P.plan, ramp=rampPlan(P,n);
  if(pl.custom&&pl.rows){ const rows={}; PLAN_KEYS.forEach(k=>{ rows[k]=ramp[k].map((v,i)=>pl.rows[k]&&pl.rows[k][i]!==undefined&&i<pl.n-1?pl.rows[k][i]:v); }); pl.rows=rows; }
  pl.n=n; return P; }

/* ---------- stato ---------- */
function defaults(){ const P={}; PARAMS.forEach(p=>P[p.id]=p.v); P.segs=SEG0.map(s=>({...s})); P.plan={n:3,start:2027,custom:false,rows:null}; return P; }
const clonePlan=pl=>({...pl,rows:pl.rows?Object.fromEntries(Object.entries(pl.rows).map(([k,v])=>[k,v.slice()])):null});
const cloneP=P=>({...P,segs:P.segs.map(s=>({...s})),plan:clonePlan(P.plan||{n:1,start:2027,custom:false,rows:null})});
function merge(base,o){
  if(!o||typeof o!=="object") return base;
  // dalle versioni precedenti si recuperano solo le leve: le ipotesi sono fisse
  LEVER_IDS.forEach(id=>{ const p=PMAP[id]; const v=o[id]; if(v!==undefined&&typeof v===typeof p.v&&(typeof p.v!=="number"||isFinite(v))) base[id]=typeof v==="number"?clamp(v,p.min,p.max):v; });
  if(o.youthExempt===false&&o.u30===undefined) base.u30=5;
  const pl=o.plan;
  if(pl&&typeof pl==="object"){ const n=clamp(Math.round(+pl.n||1),1,PLAN_MAX); base.plan={n,start:clamp(Math.round(+pl.start||2027),2025,2040),custom:!!pl.custom,rows:null};
    if(pl.custom&&pl.rows&&typeof pl.rows==="object"){ const ramp=rampPlan(base,n), rows={};
      PLAN_KEYS.forEach(k=>{ const p=PMAP[k]; rows[k]=ramp[k].map((v,i)=>{ const x=Array.isArray(pl.rows[k])?pl.rows[k][i]:undefined; if(p.bool) return typeof x==="boolean"?x:v; return typeof x==="number"&&isFinite(x)?clamp(x,p.min,p.max):v; }); });
      base.plan.rows=rows; } else base.plan.custom=false; }
  return base;
}

/* ---------- matematica ---------- */
function invNorm(p){const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416],pl=.02425;let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);}
function normCdf(x){ if(x===Infinity) return 1; if(x===-Infinity) return 0; const z=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*z);const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-z*z);return x>=0?(1+y)/2:(1-y)/2;}
const NQ=41, Z=Array.from({length:NQ},(_,i)=>invNorm((i+.5)/NQ));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const taxNew=(P,p)=>{ let t=Math.max(P.tmin,P.alpha*p); if(P.cap>0) t=Math.min(t,P.cap); return t; };
// probabilità e media parziale di una lognormale LN(mu,sigma) sull'intervallo (a,b)
function lnPartial(mu,sigma,a,b){
  const la=a<=0?-Infinity:Math.log(a), lb=b===Infinity?Infinity:Math.log(b), m=Math.exp(mu+sigma*sigma/2);
  const F=x=>normCdf((x-mu)/sigma), G=x=>normCdf((x-mu-sigma*sigma)/sigma);
  return {prob:Math.max(0,F(lb)-F(la)), mean:Math.max(0,m*(G(lb)-G(la)))};
}

/* ---------- il modello ---------- */
// ph: fase (domanda e conversioni a regime = 1). opt.sq: tariffe attuali, per la verifica di calibrazione.
// ph.prevD / ph.prevUnits: stato dell'anno precedente nel percorso; ph.maxLost: posti già persi (per la riqualificazione una tantum).
function run(P,ph,opt){
  ph=ph||{demand:1,conv:1}; opt=opt||{};
  const dArr=[]; let jq=0;
  const segs=P.segs, tot=segs.reduce((a,s)=>a+s.share,0)||1;
  const NB=P.totalNights*1e6, minor=P.minorShare, base=P.baseRevenue*1e6;
  let theo=0; segs.forEach(s=>theo+=NB*s.share/tot*(1-minor)*s.tOld);
  const k=theo>0?base/theo:1;
  const cmA=1-P.varCost, cmH=P.cmHotel;
  const R={k,segs:[]};
  const A={G:0,n1:0,cs:0,dwl:0,piH0:0,piH1:0,piA0:0,piA1:0,revA0:0,revA1:0,revH0:0,revH1:0,accO:0,accN:0,othO:0,othN:0,belt:0,beltRev:0,beltSpend:0,gained:0,lost:0};
  segs.forEach((s,i)=>{
    const nB=NB*s.share/tot, yo=!opt.sq&&!!s.youth, tY=yo?(P.cap>0?Math.min(P.u30,P.cap):P.u30):0, ex=yo&&tY<=0;
    const a={n:0,rev:0,tW:0,cs:0,dwl:0,pW:0,pW0:0,lost:0,belt:0};
    for(const z of Z){
      const p=s.price*Math.exp(s.sigma*z);
      const tN=opt.sq?s.tOld:(yo?tY:taxNew(P,p));
      const dT=tN-s.tOld;
      const pNet=Math.max(p*.5,p-(1-P.passThrough)*dT);
      const g0=p+s.tOld, g1=pNet+tN;
      const lr=Math.log(g1/g0);
      const dS=Math.exp(s.eps*P.epsMult*(1+P.epsConvex*Math.abs(lr))*lr), d0=ph.prevD?ph.prevD[jq]:1;
      const d=d0+(dS-d0)*ph.demand; dArr[jq++]=d;
      const q0=nB/NQ, q1=q0*d;
      const te0=s.tOld*(1-minor)*k, te1=tN*(1-minor)*k;     // imposta effettiva per notte (esenti e calibrazione inclusi)
      const g0e=p+te0, g1e=pNet+te1;
      const vcH=(1-cmH)*p, vcA=(1-cmA)*p, vc=(1-s.apt)*vcH+s.apt*vcA;
      a.n+=q1; a.rev+=q1*te1; a.tW+=tN*q1; a.pW+=q1*p; a.pW0+=q0*p;
      a.cs+=-(g1e-g0e)*(q0+q1)/2;
      a.dwl+=(q0-q1)*((g0e+g1e)/2-vc);
      A.piH0+=(1-s.apt)*q0*(p-vcH); A.piH1+=(1-s.apt)*q1*(pNet-vcH);
      A.piA0+=s.apt*q0*(p-vcA);     A.piA1+=s.apt*q1*(pNet-vcA);
      A.revA0+=s.apt*q0*p; A.revA1+=s.apt*q1*pNet; A.revH0+=(1-s.apt)*q0*p; A.revH1+=(1-s.apt)*q1*pNet;
      A.accO+=q0*p; A.accN+=q1*pNet;
      if(q0>q1){ const l=q0-q1; a.lost+=l; a.belt+=l*s.belt; A.beltRev+=l*s.belt*p*P.beltPriceRatio; }
      else A.gained+=q1-q0;
    }
    const revOld=nB*(1-minor)*s.tOld*k;
    const meanP0=a.pW0/nB, meanP1=a.n>0?a.pW/a.n:0;
    R.segs.push({...s,i,nB,nN:a.n,chg:a.n/nB-1,tAvg:a.n>0?a.tW/a.n:0,
      tMed:opt.sq?s.tOld:(yo?tY:taxNew(P,s.price)),
      tP90:opt.sq?s.tOld:(yo?tY:taxNew(P,s.price*Math.exp(s.sigma*1.2816))),
      rev:a.rev,revOld,lost:a.lost,beltN:a.belt,exempt:ex,youth:yo,cs:a.cs,dwl:a.dwl,
      meanP:meanP0, effOld:s.tOld/(meanP0+s.tOld), effNew:a.n>0?(a.tW/a.n)/(meanP1+a.tW/a.n):0});
    A.G+=a.rev; A.n1+=a.n; A.cs+=a.cs; A.dwl+=a.dwl; A.belt+=a.belt; A.lost+=a.lost;
    A.othO+=nB*s.spend; A.othN+=a.n*s.spend;
  });
  const G=A.G, nNew=A.n1;
  /* imposta di soggiorno */
  const incr=G-base, evasionLoss=P.evasion*Math.max(0,incr), Gn=G-evasionLoss;
  const levy=P.stateLevy*Math.max(0,Gn-base), net=Gn-levy;
  /* escursionisti e contributo d'accesso */
  const dayV0=P.dayVisitors*1e6, L0=dayV0*P.dayLiable, Nl=dayV0-L0, fee=opt.sq?0:P.dayFee;
  const ratio=fee>0?(P.dayCost+fee)/P.dayCost:1;
  const L1=L0*Math.pow(ratio,P.dayElast), dayV1=Nl+L1;
  const dayFeeAssessed=fee*L1, dayFeeLoss=dayFeeAssessed*P.dayEvasion, dayFeeNet=dayFeeAssessed-dayFeeLoss;
  const csDay=-fee*(L0+L1)/2;
  /* visitatori e spesa */
  const beltReturned=A.belt*P.beltReturn;
  const vdB=NB+dayV0, vdN=nNew+dayV1+beltReturned, vdChg=vdN/vdB-1;
  let beltSpendTot=0; segs.forEach((s,i)=>{ beltSpendTot+=R.segs[i].beltN*P.beltReturn*s.spend*.6; });
  const spendO=A.accO+A.othO+dayV0*P.daySpend;
  const spendN=A.accN+A.othN+beltSpendTot+dayV1*P.daySpend;
  const dSpend=spendN-spendO;
  const dComp=(A.othN-A.othO)+beltSpendTot+(dayV1-dayV0)*P.daySpend;
  const dPiComp=P.cmComp*dComp;
  const compBase=P.cmComp*(A.othO+dayV0*P.daySpend);
  const jobsLost=Math.max(0,-dSpend/1e6*P.jobsPerM), vaChg=dSpend*P.vaRatio;
  /* operatori ricettivi */
  const dPiHotel=A.piH1-A.piH0, dPiAptContr=A.piA1-A.piA0;
  const hotelBaseProfit=P.hotelMargin*A.revH0;
  const noiBase=P.noiMargin*A.revA0;
  const noiDrop=noiBase>0?clamp(-dPiAptContr/noiBase,-.5,.95):0;
  /* case: soglia di conversione degli affitti brevi */
  const mu=Math.log(P.strPremium), sg=P.premSigma;
  const c0=1-P.riskDiscount, c1=1-P.riskDiscount*(1-(P.guaranteeOn&&!opt.sq?P.guaranteeCut:0));
  const thr=c1/(1-noiDrop);
  const pOut=normCdf((Math.log(c0)-mu)/sg), stockP=1-pOut;
  const sw=thr>c0?lnPartial(mu,sg,c0,thr):{prob:0,mean:0}, st=lnPartial(mu,sg,Math.max(thr,c0),Infinity), all=lnPartial(mu,sg,c0,Infinity);
  const shareStar=stockP>0?sw.prob/stockP:0, unitsStar=P.strUnits*shareStar;
  const units=clamp(ph.prevUnits!==undefined?ph.prevUnits+(unitsStar-ph.prevUnits)*ph.conv:unitsStar*ph.conv,0,P.strUnits);
  const convF=unitsStar>0?Math.min(1,units/unitsStar):0, share=units/P.strUnits, toRes=units*P.toResidential;
  const newResGross=toRes*.95*P.hhSize, newRes=newResGross*P.netNewShare;
  const rentChg=-(toRes/P.rentalStock)/(P.elD+P.elS);
  const priceChg=rentChg-P.strCapShare*Math.max(0,noiDrop)*(ph.prevUnits!==undefined?convF:ph.conv);
  const annualRent=P.rent*P.unitSize*12, Lnet=annualRent*P.netYield;
  const scale=stockP>0?P.strUnits/stockP:0;
  const llSwitch=Lnet*scale*(c1*sw.prob-sw.mean)*(unitsStar>0?units/unitsStar:0);
  const llStay=-noiDrop*Lnet*scale*st.mean;
  const strLandlords=llSwitch+llStay;                    // variazione del reddito dei proprietari di affitti brevi
  const strNoiBase=Lnet*scale*all.mean;                  // reddito netto implicito dalla distribuzione di R
  const tenantGain=-rentChg*P.rentalStock*annualRent;
  const ownerHomes=P.households*P.ownerShare;
  const ownerWealth=ownerHomes*P.unitSize*P.price*priceChg;
  /* voci fiscali collaterali e risparmi del Comune */
  const tariLoss=units*P.tariNonDomShare*P.tariGap;
  const tariSaving=P.tariCost*1e6*P.tariTouristShare*P.tariVariable*(-vdChg);
  const imuLoss=toRes*P.imuPerUnit*P.concordatoShare*P.concordatoCut;
  const irpefJobs=jobsLost*P.workerResShare*P.above25Tourism*P.wageTourism*P.irpefRate;
  const irpefNew=newRes*P.adultTaxpayerShare*P.above25Share*P.incomeNew*P.irpefRate;
  const feesLoss=P.feesBase*1e6*P.feesElast*(-vdChg);
  const opSaving=P.touristCost*1e6*P.costVariable*(-vdChg);
  const newResCost=newRes*P.marginalCost;
  const dTax=net-base+dayFeeNet;
  const collateral=tariLoss+imuLoss+irpefJobs+feesLoss;
  const savings=opSaving+tariSaving+irpefNew-newResCost;
  /* fondo */
  const fComm=opt.sq?0:P.fundCommercial*1e6, fTalent=opt.sq?0:P.fundTalent*1e6;
  const fGuar=P.guaranteeOn&&!opt.sq?toRes*annualRent*P.defaultRate:0;
  const fTrainTotal=jobsLost*P.trainCost*P.trainCoverage;          // a regime: costo complessivo una tantum
  const fTrain=ph.maxLost!==undefined?Math.max(0,jobsLost-ph.maxLost)*P.trainCost*P.trainCoverage:0;
  const fund=fComm+fTalent+fGuar+fTrain;
  const saldo=dTax-collateral+savings-fund;
  const reserve=Math.max(0,saldo)*P.reserve, pool=Math.max(0,saldo-reserve);
  const costs={irpef:P.irpefBase*1e6,tari:P.tariDomBase*1e6,tpl:P.tplBase*1e6};
  let left=pool; const alloc={};
  String(P.order).split(",").forEach(key=>{ const a=Math.min(left,costs[key]); alloc[key]={cost:costs[key],paid:a,cov:costs[key]>0?a/costs[key]:0}; left-=a; });
  /* lavoro */
  const jobsGained=((pool*P.mpcRes)+newRes*P.newResSpend+fComm+fTalent)/1e6*P.jobsPerMRes;
  const jobsNet=jobsGained-jobsLost;
  const wagesLostGross=jobsLost*P.wageTourism*(P.spellMonths/12)*(1-P.trainCoverage*P.trainSpellCut);
  const naspiCost=wagesLostGross*P.naspiRate, workersLoss=wagesLostGross-naspiCost;
  /* cintura metropolitana */
  const beltTaxRev=A.belt*P.beltTax, beltProfit=A.beltRev*cmH;
  /* benessere: chi paga e chi riceve */
  const cs=A.cs+csDay;
  const dwlDay=(L0-L1)*(fee/2+P.daySpend*P.cmComp);
  const dwl=A.dwl+dwlDay;
  const st_=[
    {id:"tour",  label:"Turisti ed escursionisti",              v:cs,                       res:0, kind:"paga"},
    {id:"hotel", label:"Albergatori",                            v:dPiHotel,                 res:P.resShareOps, kind:"paga"},
    {id:"str",   label:"Proprietari di affitti brevi",           v:strLandlords,             res:P.resShareOps, kind:"paga"},
    {id:"comp",  label:"Ristorazione e commercio",               v:dPiComp,                  res:P.resShareOps, kind:"paga"},
    {id:"llong", label:"Proprietari di affitti a lungo termine", v:-tenantGain,              res:P.resShareOps, kind:"paga"},
    {id:"evas",  label:"Imposta non riscossa (evasione)",        v:evasionLoss+dayFeeLoss,   res:0, kind:"neutro"},
    {id:"tenant",label:"Inquilini (canoni più bassi)",           v:tenantGain,               res:1, kind:"riceve"},
    {id:"com",   label:"Comune (saldo, poi dividendo civico)",   v:saldo,                    res:1, kind:"riceve"},
    {id:"fund",  label:"Beneficiari del Fondo Armonizzatore",    v:fund,                     res:1, kind:"riceve"},
    {id:"state", label:"Stato (quota del maggior gettito)",      v:levy,                     res:0, kind:"riceve"},
    {id:"belt",  label:"Comuni e operatori della cintura",       v:beltTaxRev+beltProfit,    res:0, kind:"riceve"}
  ];
  const netMonetary=st_.reduce((a,x)=>a+x.v,0);
  const burden=st_.filter(x=>x.v<0&&x.kind==="paga"), burdenTot=burden.reduce((a,x)=>a-x.v,0);
  const burdenNonRes=burden.reduce((a,x)=>a-x.v*(1-x.res),0);
  const nonResShare=burdenTot>0?burdenNonRes/burdenTot:0;
  const residentsNet=(dTax-collateral+savings)+tenantGain+P.resShareOps*(dPiHotel+strLandlords+dPiComp+evasionLoss+dayFeeLoss-tenantGain);
  const publicRaised=(Gn-base)+dayFeeNet;                 // maggior gettito riscosso (Comune + Stato)
  const mcpf=publicRaised>0?(publicRaised+Math.max(0,dwl))/publicRaised:NaN;
  Object.assign(R,{G,base,incr,evasionLoss,Gn,levy,net,dTax,nB:NB,nNew,nChg:nNew/NB-1,gained:A.gained,lostTot:A.lost,belt:A.belt,beltReturned,
    vdB,vdN,vdChg,dayV0,dayV1,L0,L1,fee,dayFeeAssessed,dayFeeNet,dayFeeLoss,csDay,
    spendO,spendN,dSpend,dComp,jobsLost,vaChg,accO:A.accO,
    dPiHotel,dPiAptContr,hotelBaseProfit,compBase,noiBase,noiDrop,revA0:A.revA0,revH0:A.revH0,
    c0,c1,thr,share,shareStar,unitsStar,units,dArr,toRes,newResGross,newRes,rentChg,priceChg,annualRent,Lnet,strLandlords,llSwitch,llStay,strNoiBase,tenantGain,ownerHomes,ownerWealth,
    tariLoss,tariSaving,imuLoss,irpefJobs,irpefNew,feesLoss,opSaving,newResCost,
    fComm,fTalent,fGuar,fTrain,fund,collateral,savings,saldo,reserve,pool,alloc,surplus:left,perHH:pool/P.households,
    jobsGained,jobsNet,wagesLostGross,naspiCost,workersLoss,fTrainTotal,
    beltTaxRev,beltProfit,cs,dwl,dwlDay,stake:st_,netMonetary,burdenTot,burdenNonRes,nonResShare,residentsNet,publicRaised,mcpf,dPiComp,aptStockNoi:A.piA0});
  return R;
}

/* ---------- percorso anno per anno ---------- */
// Ogni anno: leve dell'anno, domanda che si adegua con ritardo, riconversioni che convergono all'equilibrio, riqualificazione quando i posti si perdono.
function timeline(P,R0){
  R0=R0||run(P);
  const pl=P.plan||{n:1,start:2027}, H=Math.max(HORIZON,pl.n+3), years=[];
  let prevD=null, prevUnits=0, maxLost=0, reserveCum=0, saldoCum=0, divCum=0;
  for(let y=1;y<=H;y++){
    const L=levers(P,y), Q=Object.assign({},P,L);
    const r=run(Q,{demand:P.demandAdj,conv:P.convSpeed,prevD,prevUnits,maxLost});
    prevD=r.dArr; prevUnits=r.units; maxLost=Math.max(maxLost,r.jobsLost);
    reserveCum+=r.reserve; saldoCum+=r.saldo; divCum+=r.pool;
    years.push({y,year:pl.start+y-1,target:y>=pl.n,L,R:r,reserveCum,saldoCum,divCum});
  }
  return {n:pl.n,H,start:pl.start,years,R0};
}

/* ---------- analisi: sensibilità, incertezza, mappa ---------- */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const MC_KEYS=["saldo","dTax","nChg","toRes","rentChg","perHH","jobsNet","dwl","nonResShare","vdChg"];
function monteCarlo(P,n){
  n=n||400;
  const rnd=mulberry(20261016), U=(a,b)=>a+(b-a)*rnd(), out={}; MC_KEYS.forEach(k=>out[k]=[]);
  for(let i=0;i<n;i++){ const Q=cloneP(P);
    Q.epsMult=P.epsMult*U(.7,1.3); Q.passThrough=U(.7,1); Q.evasion=clamp(P.evasion*U(.5,2),0,.4); Q.strPremium=U(1.05,1.6); Q.totalNights=U(12.5,14.5); Q.dayVisitors=U(5.6,8);
    Q.segs[4].price=P.segs[4].price*U(.8,1.2); Q.touristCost=U(35,75); Q.noiMargin=U(.4,.6); Q.riskDiscount=U(.1,.2);
    Q.strUnits=U(11000,13500); Q.epsConvex=U(2,5);
    const r=run(Q); MC_KEYS.forEach(k=>out[k].push(r[k])); }
  const q=(arr,p)=>{ const s=[...arr].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor(p*s.length))]; };
  const res={n}; MC_KEYS.forEach(k=>res[k]={p10:q(out[k],.1),p50:q(out[k],.5),p90:q(out[k],.9),neg:out[k].filter(v=>v<0).length/n}); return res;
}
const TORNADO_DEF=[
  ["Reattività della domanda","epsMult",P=>P.epsMult*.7,P=>P.epsMult*1.3,"×"],
  ["Elasticità crescente con il rincaro","epsConvex",()=>1,()=>5,"κ"],
  ["Traslazione sull'ospite","passThrough",()=>.6,()=>1,"%"],
  ["Evasione sul maggior gettito","evasion",()=>0,()=>.25,"%"],
  ["Quota del maggior gettito allo Stato","stateLevy",()=>0,()=>.5,"%"],
  ["Prezzo mediano del lusso","lux",P=>P.segs[4].price*.75,P=>P.segs[4].price*1.25,"€"],
  ["Notti tassate","totalNights",P=>P.totalNights*.85,P=>P.totalNights*1.15,"mln"],
  ["Spesa legata ai visitatori","touristCost",P=>P.touristCost*.6,P=>P.touristCost*1.4,"€mln"],
  ["Premio mediano dell'affitto breve","strPremium",()=>1.05,()=>1.6,"×"]
];
function tornado(P,metric){
  metric=metric||"saldo"; const base=run(P)[metric];
  return TORNADO_DEF.map(d=>{ const at=v=>{ const Q=cloneP(P); if(d[1]==="lux") Q.segs[4].price=v; else Q[d[1]]=v; return run(Q)[metric]; };
    const lo=d[2](P),hi=d[3](P); const a=at(lo),c=at(hi); return {label:d[0],id:d[1],lo:a,hi:c,loX:lo,hiX:hi,unit:d[4],range:Math.abs(c-a)}; }).sort((x,y)=>y.range-x.range).map(d=>({...d,base}));
}
const MATRIX_LEVERS=[
  {id:"tmin",label:"Pavimento",rel:.1,g:"leva"},
  {id:"alpha",label:"Aliquota sul prezzo",rel:.1,g:"leva"},
  {id:"u30",label:"Imposta under 30",abs:1,g:"leva"},
  {id:"dayFee",label:"Contributo d'accesso",abs:1,g:"leva"},
  {id:"fundCommercial",label:"Fondo: commercio",rel:.1,g:"leva"},
  {id:"fundTalent",label:"Fondo: imprese e talenti",rel:.1,g:"leva"},
  {id:"passThrough",label:"Traslazione sull'ospite",rel:.1,g:"ipotesi"},
  {id:"epsMult",label:"Reattività della domanda",rel:.1,g:"ipotesi"},
  {id:"evasion",label:"Evasione",rel:.1,g:"ipotesi"},
  {id:"strPremium",label:"Premio affitto breve R",rel:.1,g:"ipotesi"}
];
const MATRIX_OUT=[
  {id:"net",label:"Gettito netto al Comune",unit:"€ mln",f:v=>v/1e6,d:1},
  {id:"saldo",label:"Saldo strutturale",unit:"€ mln",f:v=>v/1e6,d:1},
  {id:"perHH",label:"Dividendo per famiglia",unit:"€",f:v=>v,d:0},
  {id:"nChg",label:"Pernottamenti",unit:"punti %",f:v=>v*100,d:2},
  {id:"vdChg",label:"Visitatori-giorno",unit:"punti %",f:v=>v*100,d:2},
  {id:"toRes",label:"Abitazioni ai residenti",unit:"unità",f:v=>v,d:0},
  {id:"rentChg",label:"Canoni",unit:"punti %",f:v=>v*100,d:2},
  {id:"jobsNet",label:"Occupazione netta",unit:"posti",f:v=>v,d:0},
  {id:"dwl",label:"Costo di efficienza",unit:"€ mln",f:v=>v/1e6,d:1},
  {id:"nonResShare",label:"Costo su non residenti",unit:"punti %",f:v=>v*100,d:1}
];
function impactMatrix(P){
  const b=run(P);
  const rows=MATRIX_LEVERS.map(L=>{
    const Q=cloneP(P); const x0=P[L.id]; const x1=L.abs!==undefined?x0+L.abs:(x0===0?L.rel:x0*(1+L.rel)); Q[L.id]=x1;
    const r=run(Q);
    return {id:L.id,label:L.label,g:L.g,x0,x1,deltaLabel:L.abs!==undefined?L.abs:L.rel,isAbs:L.abs!==undefined,cells:MATRIX_OUT.map(o=>o.f(r[o.id])-o.f(b[o.id]))};
  });
  return {rows,cols:MATRIX_OUT,base:MATRIX_OUT.map(o=>o.f(b[o.id]))};
}
function policyMap(P,tList,aList){
  const wide=P.tmin>30||P.alpha>.2;
  tList=tList||(wide?[4,8,12,16,20,30,40,60,80,100]:[6,8,10,12,14,16,18,20,24,28]); aList=aList||(wide?[0,.05,.1,.2,.4,.6,.8,1]:[0,.04,.08,.12,.16,.2]);
  const pts=[]; tList.forEach(t=>aList.forEach(a=>{ const Q=cloneP(P); Q.tmin=t; Q.alpha=a; Q.cap=0; const r=run(Q);
    pts.push({t,a,saldo:r.saldo,net:r.net,nChg:r.nChg,vdChg:r.vdChg,perHH:r.perHH,toRes:r.toRes}); }));
  const n=P.plan?P.plan.n:1, plan=[];
  for(let y=1;y<=n;y++){ const Q=Object.assign(cloneP(P),levers(P,y)); const r=y===n?run(P):run(Q); plan.push({y,year:(P.plan?P.plan.start:2027)+y-1,saldo:r.saldo,nChg:r.nChg}); }
  return {pts,tList,aList,plan};
}
function laffer(P){
  let bt=[P.tmin,-Infinity]; for(let t=4;t<=100;t+=1){ const Q=cloneP(P); Q.tmin=t; const r=run(Q); if(r.net>bt[1]) bt=[t,r.net]; }
  let ba=[P.alpha,-Infinity]; for(let a=0;a<=1.0001;a+=.02){ const Q=cloneP(P); Q.alpha=a; const r=run(Q); if(r.net>ba[1]) ba=[a,r.net]; }
  return {tmin:bt,alpha:ba};
}

/* ---------- verifiche numeriche ---------- */
function sanity(P,R,pathRes){
  const out=[]; const add=(ok,t,d)=>out.push({s:ok===true?"ok":ok===false?"bad":"warn",t,d});
  const S=run(P,null,{sq:true});
  const sh=P.segs.reduce((a,s)=>a+s.share,0);
  const NFm=d=>new Intl.NumberFormat("it-IT",{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:"always"});
  const sgn=x=>x<0?"\u2212":"";
  const fm=x=>sgn(x)+"€"+NFm(1).format(Math.abs(x)/1e6)+" mln";
  const pc=(x,d=1)=>sgn(x)+NFm(d).format(Math.abs(x)*100)+"%";
  const n2=(x,d=2)=>sgn(x)+NFm(d).format(Math.abs(x));
  add(Math.abs(S.G-S.base)/S.base<.001&&Math.abs(S.nChg)<1e-9,"Calibrazione",`Con le tariffe attuali il modello restituisce ${fm(S.G)} contro ${fm(S.base)} osservati, senza variazione dei pernottamenti.`);
  add(Math.abs(sh-1)<.005?true:null,"Quote delle tipologie",`Somma delle quote ${pc(sh)}${Math.abs(sh-1)<.005?"":": il modello le riscala al 100%"}.`);
  const avgT=P.baseRevenue*1e6/(P.totalNights*1e6*(1-P.minorShare));
  add(avgT>=3.5&&avgT<=8,"Imposta media implicita",`€${n2(avgT)} per notte tassabile, dentro l'intervallo delle tariffe attuali (€3,50–€8).`);
  add(R.k>.85&&R.k<1.15?true:null,"Coefficiente di calibrazione",`k = ${n2(R.k)}: notti, quote e tariffe sono coerenti con il gettito osservato (atteso tra 0,85 e 1,15).`);
  const pp=R.accO/R.nB;
  add(pp*1.8>150&&pp*1.8<350?true:null,"Prezzo medio implicito",`€${Math.round(pp)} a persona, circa €${Math.round(pp*1.8)} per camera doppia; i comparatori indicano circa €253 [${SRCI.kayak}].`);
  const spendDay=R.spendO/(R.nB+R.dayV0);
  add(spendDay>60&&spendDay<350?true:null,"Spesa turistica implicita",`${fm(R.spendO)} all'anno, €${Math.round(spendDay)} per visitatore-giorno.`);
  const occ=(R.revA0/P.strUnits)>0?(R.segs.reduce((a,s)=>a+s.nB*s.apt,0)/(P.strUnits*365*1.9)):0;
  add(occ>.45&&occ<.8?true:null,"Occupazione implicita degli appartamenti",`${pc(occ,0)} dei giorni (con 1,9 ospiti per notte): plausibile tra 50% e 75%.`);
  const impliedNoi=R.noiBase/P.strUnits, condMean=lnPartial(Math.log(P.strPremium),P.premSigma,R.c0,Infinity), Rimpl=impliedNoi/R.Lnet, Rcond=condMean.mean/Math.max(1e-9,condMean.prob);
  add(Math.abs(Rimpl/Rcond-1)<.3?true:null,"Coerenza del premio R",`Dai ricavi: €${Math.round(impliedNoi).toLocaleString("it-IT")} di reddito netto per appartamento, cioè R = ${n2(Rimpl)} contro ${n2(Rcond)} atteso dalla distribuzione.`);
  // identità del conto economico
  const wf=R.dTax-R.collateral+R.savings-R.fund;
  add(Math.abs(wf-R.saldo)<1,"Identità del conto economico",`Incremento netto − perdite collaterali + risparmi − Fondo = ${fm(R.saldo)}.`);
  add(Math.abs((R.nB-R.nNew)-(R.lostTot-R.gained))<1,"Conservazione dei pernottamenti",`Notti perse ${n2(R.lostTot/1e6)} mln meno guadagnate ${n2(R.gained/1e6)} mln = ${n2((R.nB-R.nNew)/1e6)} mln.`);
  // identità del benessere: ΔCS + ΔΠ operatori + evasione + ΔImposta assessed = −DWL (solo imposta di soggiorno)
  const tourCs=R.segs.reduce((a,s)=>a+s.cs,0), dPiOps=R.dPiHotel+R.dPiAptContr;
  const lhs=tourCs+dPiOps+R.evasionLoss+(R.Gn-R.base);
  const dwlT=R.segs.reduce((a,s)=>a+s.dwl,0);
  add(Math.abs(lhs+dwlT)<Math.max(1e3,Math.abs(dwlT)*1e-6),"Identità del benessere",`Variazione del surplus dei turisti, degli operatori e del gettito = −perdita secca: ${fm(lhs)} contro ${fm(-dwlT)}.`);
  if(R.G>=R.base) add(R.dwl>=-1,"Segno della perdita secca",`Perdita secca ${fm(R.dwl)}: non negativa, come richiede la teoria per un'imposta che aumenta e riduce i volumi.`);
  else add(true,"Segno della perdita secca",`Con questi parametri l'imposta cala rispetto a oggi: la perdita secca ${fm(R.dwl)} è negativa perché è un guadagno di efficienza.`);
  const taxSplit=(R.G-R.base)-(R.Gn-R.base)-R.evasionLoss;
  add(Math.abs(taxSplit)<1&&Math.abs((R.Gn-R.base)-R.levy-(R.net-R.base))<1,"Ripartizione del maggior gettito",`Maggior gettito ${fm(R.G-R.base)} = Comune ${fm(R.net-R.base)} + Stato ${fm(R.levy)} + non riscosso ${fm(R.evasionLoss)}.`);
  add(Math.abs(R.tenantGain+R.stake.find(x=>x.id==="llong").v)<1,"Trasferimento tra inquilini e proprietari",`I canoni più bassi (${fm(R.tenantGain)}) sono un trasferimento: la somma è zero.`);
  add(Math.abs(R.stake.reduce((a,x)=>a+x.v,0)-R.netMonetary)<1,"Somma dei portatori di interesse",`Somma degli effetti monetari ${fm(R.netMonetary)}.`);
  if(pathRes){ const last=pathRes.years[pathRes.years.length-1].R, gap=R.units>50?Math.abs(last.units/R.units-1):Math.abs(last.units-R.units)/Math.max(1,P.strUnits);
    add(gap<.08?true:null,"Convergenza del percorso",`Nell'ultimo anno simulato (${pathRes.start+pathRes.H-1}) gli appartamenti riconvertiti sono ${Math.round(last.units).toLocaleString("it-IT")} contro ${Math.round(R.units).toLocaleString("it-IT")} a regime; il saldo è ${fm(last.saldo)} contro ${fm(R.saldo)}.`);
    const t1=pathRes.years.find(x=>x.y===pathRes.n), t0=pathRes.years[0];
    add(Math.abs(t0.R.nNew-R.nB)<=Math.abs(R.nNew-R.nB)+1e-6||pathRes.n===1?true:null,"Gradualità del transitorio",pathRes.n>1?`Nel primo anno i pernottamenti variano del ${pc(t0.R.nChg)}, nell'anno ${t1?t1.year:""} (obiettivo) del ${pc(t1?t1.R.nChg:R.nChg)}: il transitorio attenua l'impatto iniziale.`:`La politica entra in vigore a regime dal primo anno: nel primo anno i pernottamenti variano del ${pc(t0.R.nChg)}.`); }
  const L=laffer(P);
  add(P.tmin<L.tmin[0]?true:null,"Curva di Laffer: pavimento",L.tmin[0]>=100?`Tra €4 e €100 il gettito netto continua a crescere con il pavimento: la proposta (€${n2(P.tmin,1)}) è lontano dal punto in cui un rincaro riduce il gettito. Oltre €20–30 il modello è un'estrapolazione: il limite vero è politico e di decongestione.`:`A parità di aliquota il gettito netto è massimo con un pavimento di circa €${L.tmin[0]}; la proposta usa €${n2(P.tmin,1)}.`);
  add(P.alpha<L.alpha[0]-1e-9?true:null,"Curva di Laffer: aliquota",L.alpha[0]>=.99?`Tra 0% e 100% il gettito netto continua a crescere con l'aliquota, perché la domanda di lusso è poco elastica; la proposta usa ${pc(P.alpha)}.`:`A parità di pavimento il gettito netto è massimo con un'aliquota di circa ${pc(L.alpha[0],0)}; la proposta usa ${pc(P.alpha)}.`);
  const avgDp=R.segs.reduce((a,s)=>a+s.nB*((s.exempt?0:s.tAvg)-s.tOld)*P.passThrough,0), avgG=R.segs.reduce((a,s)=>a+s.nB*(s.meanP+s.tOld),0);
  const impl=avgDp!==0?R.nChg/(avgDp/avgG):0;
  add(impl<0&&impl>-1.5?true:null,"Elasticità complessiva implicita",`${n2(impl)}: variazione dei pernottamenti ÷ variazione media del costo. Riferimento: −0,5/−0,7 per la spesa turistica [${SRCI.elast}]; a Firenze l'introduzione dell'imposta non ha avuto effetti misurabili [${SRCI.biagi}].`);
  add(Math.abs(R.rentChg)<=.1?true:null,"Campo di validità del modello abitativo",`Variazione dei canoni ${pc(R.rentChg)}: l'approssimazione lineare è affidabile entro ±10%.`);
  add(R.share<=.5?true:null,"Quota di stock riconvertita",`${pc(R.share)} degli affitti brevi: entro il limite di plausibilità del 50%.`);
  if(P.tmin>30||P.alpha>.2||P.cap>30) add(null,"Campo di calibrazione",`Pavimento €${n2(P.tmin,1)}, aliquota ${pc(P.alpha)}: oltre i valori vicini a quelli osservati (circa €30 e 20%) le elasticità sono un'estrapolazione e i risultati vanno letti come ordini di grandezza.`);
  add(R.nonResShare>=0&&R.nonResShare<=1,"Quota del costo su non residenti",`${pc(R.nonResShare,0)} del costo ricade su non residenti (turisti e proprietari non fiorentini).`);
  return out;
}

return {SRC,SRCI,SEG0,SEGNUM,PARAMS,PMAP,GROUPS,LEVER_IDS,PLAN_KEYS,RAMP_KEYS,HORIZON,PLAN_MAX,NQ,defaults,cloneP,merge,origin,rampPlan,levers,resizePlan,run,timeline,monteCarlo,tornado,impactMatrix,MATRIX_OUT,MATRIX_LEVERS,policyMap,laffer,sanity,taxNew,lnPartial,normCdf,clamp,MC_KEYS};
});
