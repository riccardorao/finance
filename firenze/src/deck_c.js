/* Presentazione: slide 13–23, allegati e costruzione del PDF (parte C) */
(function(root){
"use strict";
const K=root.FMK, FM=root.FM, B=root.FMDeckB, {C,ML,MR,CW,n0,n1,n2,fM,fMs,fE,fE2,fP,fPs,fN,fNs,fMn,fMn1,fMc,MIN}=K;
const {W,H}=root.FMD;
const seg=B.seg, legal=B.legal;
const num=(x,d=1)=>(d===0?n0:d===1?n1:n2)(x);
const pv=(x,d)=>num(x,d===undefined?1:d).replace(/,0$/,"");

function s_labor(c,S,n){
  const R=S.R,P=S.P;
  const payback=R.saldo>0?((R.naspiCost+R.fTrainTotal)/(R.saldo/12)):NaN;
  K.frame(c,S,n,{tag:"Lavoro e economia locale",title:`${fN(R.jobsLost)} posti a rischio, ${fN(R.jobsGained)} ricreati dalla domanda locale: il Fondo accompagna i lavoratori negli anni in cui i posti si perdono`,source:"modello Il Dividendo di Firenze; occupati per € di spesa: ipotesi del modello (accommodation e ristorazione ≈ 12–15 per € mln)",notes:"Posti persi = riduzione della spesa turistica × occupati per milione. Posti creati = dividendo speso in città, spesa dei nuovi residenti e spesa del Fondo × occupati per milione di domanda locale."});
  K.chartTitle(c,ML,166,660,"Occupazione a regime","posti di lavoro");
  K.columns(c,ML+38,180,622,450,[
    {label:"Posti persi nel turismo",v:-R.jobsLost},
    {label:"Dividendo speso in città",v:R.pool*P.mpcRes/1e6*P.jobsPerMRes},
    {label:"Nuovi residenti",v:R.newRes*P.newResSpend/1e6*P.jobsPerMRes},
    {label:"Spesa del Fondo",v:(R.fComm+R.fTalent)/1e6*P.jobsPerMRes},
    {label:"Saldo netto",v:R.jobsNet,c:C.navy}],{fmt:v=>(v>=0?"+":MIN)+n0(Math.abs(v)),axisFmt:v=>n0(v),labH:62,maxBw:76});
  K.chartTitle(c,760,166,460,"Costi di transizione una tantum","€ milioni, negli anni delle perdite");
  K.table(c,760,176,[{h:"Voce",w:310},{h:"€ mln",w:100,a:"r"}],[
    {cells:["Salari persi durante la disoccupazione",n1(R.wagesLostGross/1e6)]},
    {cells:["…coperti dall'indennità (NASpI, Stato)",n1(R.naspiCost/1e6)]},
    {cells:["…a carico dei lavoratori",n1(R.workersLoss/1e6)]},
    {cells:["Riqualificazione (Fondo Armonizzatore)",n1(R.fTrainTotal/1e6)],b:true},
    {cells:["Costo pubblico una tantum (Stato e Fondo)",n1((R.naspiCost+R.fTrainTotal)/1e6)],b:true}],{rh:30,size:12.4,hl:[4]});
  const body=`I posti persi sono in gran parte a bassa qualifica (retribuzione annua di ${fE(P.wageTourism)}). Il costo pubblico di transizione equivale a ${isFinite(payback)?n1(payback)+" mesi":"molti mesi"} di saldo strutturale. La domanda locale ricrea circa un terzo dei posti: il resto richiede riqualificazione e ricollocamento, finanziati dal Fondo (${fP(P.trainCoverage,0)} dei lavoratori coinvolti).`;
  K.callout(c,760,396,460,Math.min(K.calloutH(c,460,body,{size:13.2,lh:18.5}),250),"Implicazione",body,{size:13.2,lh:18.5});
}
function s_fund(c,S,n){
  const R=S.R,P=S.P, ng=S.NG;
  K.frame(c,S,n,{tag:"Fondo Armonizzatore",title:`Il Fondo Armonizzatore vale ${fM(R.fund)} all'anno a regime e ${fM(R.fTrainTotal)} una tantum per la transizione dei lavoratori`,source:"modello Il Dividendo di Firenze",notes:"Il Fondo è alimentato dal saldo del maggior gettito, non dal bilancio ordinario. Gli indicatori sono proposte di monitoraggio."});
  K.table(c,ML,166,[{h:"Linea d'intervento",w:250},{h:"Obiettivo",w:430},{h:"€ mln/anno",w:130,a:"r"},{h:"Indicatore di risultato",w:350}],[
    {cells:["Riconversione commerciale","Esercizi di vicinato, botteghe artigiane e librerie al posto del commercio solo turistico; incentivi fiscali e contributi",n1(R.fComm/1e6),"Nuove aperture di vicinato nel centro; chiusure di insegne seriali"],rh:58},
    {cells:["Transizione dei lavoratori","Riqualificazione e ricollocamento degli addetti a bassa qualifica colpiti dalla contrazione",n1(R.fTrainTotal/1e6)+" (una tantum)","Lavoratori ricollocati entro dodici mesi"],rh:58},
    {cells:["Garanzia sugli affitti di lungo periodo","Fideiussione pubblica a favore dei proprietari che affittano a residenti, per azzerare il rischio di morosità",n1(R.fGuar/1e6),"Contratti garantiti; tasso di morosità"],rh:58},
    {cells:["Imprese e talenti","Agevolazioni per insediamenti in settori ad alta intensità di conoscenza: ricerca, tecnologia, manifattura avanzata",n1(R.fTalent/1e6),"Imprese insediate; addetti qualificati"],rh:58},
    {cells:[{t:"Totale a regime",b:true},"",{t:n1(R.fund/1e6),b:true},""],rh:34,fill:C.pblue}],{size:12.5,hh:32});
  const b1=`${P.guaranteeOn?"Con":"Senza"} la garanzia si riconvertono ${fN(R.units)} appartamenti; ${P.guaranteeOn?"senza":"con"} sarebbero ${fN(ng.units)}. ${P.guaranteeOn?"La garanzia costa "+fM(R.fGuar)+" all'anno a fronte di +"+fN(R.units-ng.units)+" appartamenti riconvertiti: è la linea più efficiente per euro speso.":""}`;
  K.callout(c,ML,470,560,Math.min(K.calloutH(c,560,b1,{size:13.2,lh:18.5}),180),"La garanzia sugli affitti",b1,{size:13.2,lh:18.5});
  const b2=`Le due linee di intervento sul tessuto economico (${fM(R.fComm+R.fTalent)} all'anno) sono le più incerte: producono effetti solo se nuovi residenti e imprese creano domanda di vicinato. Per questo vanno vincolate a obiettivi misurabili e rivalutate dopo due anni.`;
  K.callout(c,660,470,560,Math.min(K.calloutH(c,560,b2,{size:13.2,lh:18.5}),180),"Il punto debole",b2,{size:13.2,lh:18.5});
}
function s_dividend(c,S,n){
  const R=S.R,P=S.P, keys=String(P.order).split(",");
  const nm={irpef:"Azzeramento dell'addizionale IRPEF",tari:"Riduzione della TARI domestica",tpl:"Trasporto pubblico gratuito per i residenti"};
  K.frame(c,S,n,{tag:"Dividendo civico",title:`Il dividendo civico vale ${fE(R.perHH)} a famiglia all'anno: ${B.divPhrase(R,P)}`,source:"modello Il Dividendo di Firenze; TARI: piano finanziario 2026; addizionale IRPEF: CISL (2025)",notes:"Il dividendo è erogato nell'ordine di priorità scelto, dopo la riserva prudenziale del "+fP(P.reserve,0)+". Famiglia tipo: due adulti in affitto in 70 m², un reddito da €40.000."});
  K.chartTitle(c,ML,166,640,"Copertura degli sgravi","€ milioni all'anno; costo pieno (grigio) e coperto (blu)");
  K.hBarPairs(c,ML,184,640,keys.map(k=>({label:nm[k],a:R.alloc[k].cost/1e6,b:R.alloc[k].paid/1e6,tag:fP(R.alloc[k].cov,0),tagColor:R.alloc[k].cov>=.995?C.blue:C.orange})),{labelW:210,valW:84,rowH:78,bh:18,fmt:v=>n1(v)});
  c.text(`Disponibile: ${fM(R.pool)} (saldo ${fM(R.saldo)} meno riserva ${fM(R.reserve)}). ${R.surplus>1e5?"Non allocato: "+fM(R.surplus)+".":""}`,ML,432,{size:13,color:C.gray,maxWidth:630,lh:18});
  K.chartTitle(c,ML,486,640,"Se cambia l'ordine di priorità","copertura degli sgravi");
  const orders=[["irpef,tari,tpl","IRPEF → TARI → trasporti"],["tari,irpef,tpl","TARI → IRPEF → trasporti"],["tpl,tari,irpef","Trasporti → TARI → IRPEF"],["tari,tpl,irpef","TARI → trasporti → IRPEF"]];
  K.table(c,ML,496,[{h:"Ordine",w:250},{h:"IRPEF",w:130,a:"r"},{h:"TARI",w:130,a:"r"},{h:"Trasporti",w:130,a:"r"}],orders.map(o=>{ const Q=FM.cloneP(P); Q.order=o[0]; const r=FM.run(Q); return {cells:[o[1],fP(r.alloc.irpef.cov,0),fP(r.alloc.tari.cov,0),fP(r.alloc.tpl.cov,0)],b:o[0]===String(P.order)}; }),{rh:26,hh:26,size:12,hl:orders.map(o=>o[0]).indexOf(String(P.order))>=0?[orders.map(o=>o[0]).indexOf(String(P.order))]:[]});
  const tariHH=P.tariDomBase*1e6/P.households, irpefHH=P.incomeNew*P.irpefRate;
  const irpef=irpefHH*R.alloc.irpef.cov, tari=tariHH*R.alloc.tari.cov, tpl=2*P.passPrice*R.alloc.tpl.cov, rent=-R.rentChg*R.annualRent;
  K.chartTitle(c,760,166,460,"Famiglia tipo","€ all'anno");
  K.table(c,760,176,[{h:"Beneficio",w:340},{h:"€",w:120,a:"r"}],[
    {cells:["Addizionale IRPEF risparmiata",fE(irpef)]},
    {cells:["TARI risparmiata (bolletta media "+fE(tariHH)+")",fE(tari)]},
    {cells:["Due abbonamenti al trasporto pubblico",fE(tpl)]},
    {cells:["Canone più basso, al rinnovo del contratto",fE(rent)]},
    {cells:[{t:"Totale annuo",b:true},{t:fE(irpef+tari+tpl+rent),b:true}],fill:C.pblue,rh:34}],{rh:32,size:12.6});
  const body=`Il dividendo è la contropartita visibile della riforma: ${fE(R.perHH)} a famiglia in media, ${fE(R.pool/P.residents)} per residente. Lega i servizi al turismo, quindi anche ai suoi cicli: la riserva del ${fP(P.reserve,0)} serve ad assorbire un cattivo anno senza tagliare gli sgravi.`;
  K.callout(c,760,420,460,Math.min(K.calloutH(c,460,body,{size:13.2,lh:18.5}),220),"Implicazione",body,{size:13.2,lh:18.5});
}
function s_plan(c,S,n){
  const P=S.P,R=S.R,TL=S.TL,N=TL.n,st=TL.start, y1=TL.years[0].R;
  const title=N>1?`Un transitorio di ${N-1} ${N-1===1?"anno":"anni"} porta la riforma a regime nel ${st+N-1}: il primo anno i pernottamenti variano del ${fPs(y1.nChg)}, a regime del ${fPs(R.nChg)}`
    :`La riforma entra in vigore a regime dal ${st}, senza transitorio: il primo anno i pernottamenti variano del ${fPs(y1.nChg)}`;
  K.frame(c,S,n,{tag:"La politica nel tempo",title,source:"modello Il Dividendo di Firenze",notes:"Valori in vigore in ciascun anno. Dall'anno dell'obiettivo in poi valgono i valori obiettivo. Rampa lineare: si parte dalla tariffa media di oggi come pavimento, senza aliquota né contributo; il Fondo cresce con il gettito."});
  const lab={tmin:"Pavimento",alpha:"Aliquota sul prezzo",cap:"Tetto per notte",u30:"Under 30 UE",dayFee:"Contributo escursionisti",fundCommercial:"Fondo: commercio",fundTalent:"Fondo: imprese e talenti",guaranteeOn:"Garanzia sugli affitti"};
  const today={tmin:"€3,50–8",alpha:"—",cap:"—",u30:"€5",dayFee:"—",fundCommercial:"—",fundTalent:"—",guaranteeOn:"no"};
  const fmtv=(k,v)=>k==="guaranteeOn"?(v?"sì":"no"):k==="alpha"?pv(v*100)+"%":k==="cap"?(v>0?"€"+pv(v):"nessuno"):(k==="dayFee"||k==="u30")&&v<=0?(k==="u30"?"esenti":"—"):k.startsWith("fund")?"€"+pv(v)+" mln":"€"+pv(v);
  const cw=Math.min(170,(CW-330)/N);
  const cols=[{h:"Leva",w:210},{h:"Oggi",w:120,a:"r"}];
  for(let y=1;y<=N;y++) cols.push({h:y<N?String(st+y-1):"Obiettivo "+(st+N-1),w:cw,a:"r"});
  const rows=FM.PLAN_KEYS.map(k=>({cells:[lab[k],today[k],...Array.from({length:N},(_,i)=>{ const v=FM.levers(P,i+1)[k]; return i===N-1?{t:fmtv(k,v),b:true}:fmtv(k,v); })]}));
  const yEnd=K.table(c,ML,160,cols,rows,{rh:26,hh:28,size:12.4});
  c.rect(ML+330+cw*(N-1),160,cw,yEnd-160,{stroke:C.blue,sw:1.6});
  const y0=yEnd+34;
  K.chartTitle(c,ML,y0,560,"Saldo e gettito anno per anno","€ milioni");
  K.trend(c,ML,y0+12,560,Math.max(170,650-y0-12),{labels:TL.years.map(y=>y.year),shade:N-1,series:[{type:"bar",v:TL.years.map(y=>y.R.saldo/1e6),color:C.blue,name:"Saldo dopo il Fondo"},{v:TL.years.map(y=>(y.R.net+y.R.dayFeeNet)/1e6),color:C.navy,name:"Gettito netto al Comune"}],base:P.baseRevenue,legend:true,fmt:v=>n1(v)});
  const last=TL.years[TL.years.length-1];
  K.kpi(c,660,y0,180,96,fM(y1.saldo),"Saldo nel primo anno",String(st),{size:25});
  K.kpi(c,850,y0,180,96,fM(R.saldo),"Saldo a regime","dal "+(st+N-1),{size:25,color:C.blue});
  K.kpi(c,1040,y0,180,96,fM(last.saldoCum),"Saldo cumulato",TL.H+" anni",{size:25});
  const body=N>1?`Il transitorio dà tempo a operatori e tour operator di adeguare listini e contratti, e al Comune di verificare il gettito effettivo prima di erogare il dividendo pieno. Il costo è un minor saldo nei primi anni.`:`Senza transitorio il gettito arriva subito, ma l'impatto su presenze e lavoro si concentra nel primo anno e non c'è tempo per correggere la tariffa con i dati reali.`;
  K.callout(c,660,y0+106,560,Math.max(K.calloutH(c,560,body,{size:12.6,lh:17}),40),"Implicazione",body,{size:12.6,lh:17});
}
function evoTable(c,S,y,rows){
  const TL=S.TL, ys=TL.years, w=(CW-230)/ys.length;
  return K.table(c,ML,y,[{h:"",w:230},...ys.map(yy=>({h:String(yy.year),w,a:"r"}))],rows.map(r=>({cells:[r[0],...ys.map(r[1])],b:r[2]})),{rh:25,hh:26,size:11.4});
}
function s_evoFin(c,S,n){
  const R=S.R,TL=S.TL,last=TL.years[TL.years.length-1], d=K.evoDefs(S), D_=k=>d.find(x=>x.key===k);
  const neg=TL.years.filter(y=>y.R.saldo<0).map(y=>y.year);
  K.frame(c,S,n,{tag:"Evoluzione nel tempo",title:`Il saldo cumula ${fM(last.saldoCum)} in ${TL.H} anni e a regime vale ${fM(R.saldo)} all'anno, ${fE(R.perHH)} di dividendo per famiglia`+(neg.length?`; negativo nel ${neg.join(", ")}`:""),source:"modello Il Dividendo di Firenze",notes:`Anni ${TL.start}–${TL.start+TL.H-1}; in grigio il transitorio. La domanda si adegua per il ${fP(S.P.demandAdj,0)} nell'anno della variazione; la riqualificazione dei lavoratori è spesa quando i posti si perdono. Linea tratteggiata: valore di oggi.`});
  [["rev",ML],["saldo",ML+392],["div",ML+784]].forEach(([k,x])=>{ const e=D_(k); K.chartTitle(c,x,166,376,e.title,e.unit); K.trend(c,x,180,376,250,Object.assign({},e.o,{ml:40,mr:54})); });
  evoTable(c,S,452,[["Gettito netto al Comune",y=>fM(y.R.net+y.R.dayFeeNet),true],["Spesa del Fondo Armonizzatore",y=>fM(y.R.fund)],["Saldo dopo il Fondo",y=>fM(y.R.saldo),true],["Dividendo per famiglia",y=>fE(y.R.perHH)],["Riserva cumulata",y=>fM(y.reserveCum)],["Saldo cumulato",y=>fM(y.saldoCum)]]);
}
function s_evoCity(c,S,n){
  const R=S.R,TL=S.TL, d=K.evoDefs(S), D_=k=>d.find(x=>x.key===k);
  const y90=TL.years.find(y=>R.units>1&&y.R.units>=.9*R.units);
  K.frame(c,S,n,{tag:"Evoluzione nel tempo",title:`A regime pernottamenti ${fPs(R.nChg)}, canoni ${fPs(R.rentChg)} e ${fN(R.toRes)} case ai residenti`+(y90?`: il mercato abitativo arriva al 90% dell'effetto nel ${y90.year}`:""),source:"modello Il Dividendo di Firenze",notes:`Ogni anno si chiude il ${fP(S.P.convSpeed,0)} della distanza tra appartamenti riconvertiti e livello di equilibrio. Valori rispetto a oggi, a parità di altre condizioni. In grigio gli anni di transitorio; linea tratteggiata: oggi.`});
  const g=[["nights",ML,166],["vd",ML+392,166],["rent",ML+784,166],["homes",ML,418],["jobs",ML+392,418]];
  g.forEach(([k,x,y])=>{ const e=D_(k); K.chartTitle(c,x,y,376,e.title,e.unit); K.trend(c,x,y+12,376,226,Object.assign({},e.o,{ml:40,mr:54})); });
  const body=`I flussi reagiscono subito; case e canoni seguono più lentamente, perché le riconversioni richiedono la scadenza delle prenotazioni e lavori di adeguamento. Il dividendo arriva prima dei benefici sul mercato della casa: è la contropartita visibile nei primi anni.`;
  K.callout(c,ML+784,418,376,Math.min(K.calloutH(c,376,body,{size:12.8,lh:17.5}),238),"Implicazione",body,{size:12.8,lh:17.5});
}
function s_daypass(c,S,n){
  const R=S.R,P=S.P;
  K.frame(c,S,n,{tag:"Contributo d'accesso",title:`Come funzionerebbe il contributo d'accesso: €${pv(P.dayFee)} per visita a chi entra in città senza pernottare, ${fM(R.dayFeeNet)} netti all'anno`,source:"modello Il Dividendo di Firenze; escursionisti: Comune di Firenze e Centro Studi Turistici (dati di telefonia mobile); precedente: Comune di Venezia",notes:`Escursionisti soggetti: ${fP(P.dayLiable,0)} del totale; mancata riscossione: ${fP(P.dayEvasion,0)}; elasticità delle visite al costo della gita (€${n0(P.dayCost)}): ${n2(P.dayElast).replace("-",MIN)}.`});
  K.numbered(c,ML,180,680,[
    "**Chi paga.** Chi entra in città per una visita in giornata senza dormire a Firenze, una volta per visita.",
    "**Esenzioni.** Residenti della Città metropolitana, pendolari per lavoro e studio, minori di 14 anni, persone con disabilità, chi pernotta a Firenze o nei comuni della cintura aderenti all'accordo metropolitano.",
    "**Pagamento.** Prenotazione online con codice QR, oppure insieme al biglietto del treno o del bus turistico, con il vettore che versa al Comune; i tour operator pagano per i gruppi.",
    "**Controlli.** Verifiche a campione agli arrivi (Santa Maria Novella, terminal dei bus turistici, parcheggi scambiatori) e nel centro UNESCO, con sanzioni.",
    "**Calendario.** Tutto l'anno nel modello; in alternativa solo nei giorni di picco, come a Venezia, con gettito ed effetto ridotti in proporzione.",
    "**Base giuridica e precedente.** Serve una norma nazionale: oggi il contributo è consentito solo a Venezia (art. 1, c. 1129, L. 145/2018). Nel 2025 Venezia lo ha applicato in 54 giorni: 723.497 paganti, €5,4 mln."],{size:13.2,gap:12});
  K.kpi(c,800,166,200,124,n2(R.L0/1e6)+" mln","Escursionisti soggetti","su "+n1(R.dayV0/1e6)+" mln all'anno",{size:28});
  K.kpi(c,1020,166,200,124,n2(R.L1/1e6)+" mln","Visite pagate",fPs(R.L1/R.L0-1)+" rispetto a oggi",{size:28});
  K.kpi(c,800,302,200,124,fM(R.dayFeeNet),"Gettito netto","dopo la mancata riscossione",{size:28,color:C.blue});
  K.kpi(c,1020,302,200,124,fPs(R.vdChg),"Visitatori al giorno","insieme all'imposta di soggiorno",{size:28});
  const body=`Il contributo è l'unica leva che agisce sugli escursionisti, circa un terzo delle presenze giornaliere. Il gettito è modesto rispetto all'imposta di soggiorno e la riscossione ha un costo: a Venezia, nel 2024, ha superato gli incassi. La valutazione di Ca' Foscari indica che il valore sta soprattutto nella prenotazione, che produce dati giornalieri sugli arrivi e permette di governare i giorni di picco.`;
  K.callout(c,800,442,420,Math.min(K.calloutH(c,420,body,{size:13,lh:18}),210),"Implicazione",body,{size:13,lh:18});
}
function s_frontier(c,S,n){
  const mp=S.MAP, tL=mp.tList, aL=mp.aList;
  K.frame(c,S,n,{tag:"Le scelte",title:"Più gettito significa meno presenze, con rendimenti decrescenti: la mappa mostra dove si colloca la proposta e il suo percorso",source:"modello Il Dividendo di Firenze",notes:`Ogni punto è una coppia (pavimento, aliquota) con pavimento da €${tL[0]} a €${tL[tL.length-1]} e aliquota da ${n0(aL[0]*100)}% a ${n0(aL[aL.length-1]*100)}%, senza tetto. Le linee uniscono i punti con la stessa aliquota.`});
  K.chartTitle(c,ML,166,760,"Saldo strutturale e riduzione dei pernottamenti",`${mp.pts.length} combinazioni di pavimento e aliquota`);
  K.frontier(c,ML,180,760,470,S);
  const body=`A parità di riduzione delle presenze, alzare l'aliquota sul lusso rende di più che alzare il pavimento: la domanda di fascia alta reagisce meno. Oltre un certo livello del pavimento le presenze calano molto più del gettito cresce. La scelta politica è quanto spingere sulla decongestione e quanto sul gettito.`;
  K.callout(c,860,176,360,Math.min(K.calloutH(c,360,body,{size:13.2,lh:18.5}),300),"Come leggere la mappa",body,{size:13.2,lh:18.5});
  const pp=mp.plan||[];
  c.t1(pp.length>1?"Il percorso, valutato a regime":"La proposta",860,500,{font:"sansB",size:13,color:C.navy});
  let y=522; pp.slice(-6).forEach((p,i,a)=>{ c.t1(String(p.year)+(i===a.length-1?" (obiettivo)":""),860,y,{size:12.5,color:C.ink,font:i===a.length-1?"sansB":"sans"}); c.t1(fM(p.saldo)+"  ·  "+fPs(p.nChg),1220,y,{size:12.5,color:C.gray,anchor:"end"}); y+=22; });
}
function s_risk(c,S,n){
  const R=S.R,MC=S.MC,T=S.TOR;
  const ph={epsMult:"la reattività della domanda",epsConvex:"l'elasticità crescente",passThrough:"la traslazione sull'ospite",evasion:"l'evasione",stateLevy:"la quota allo Stato",lux:"il prezzo del lusso",totalNights:"il numero di notti",touristCost:"la spesa legata ai visitatori",strPremium:"il premio dell'affitto breve"};
  const top=T.slice(0,2).map(t=>ph[t.id]||t.label).join(" e ");
  K.frame(c,S,n,{tag:"Rischi e incertezza",title:MC.saldo.neg<.005?`Il saldo resta positivo in ${n0((1-MC.saldo.neg)*MC.n)} simulazioni su ${MC.n} (${fM(MC.saldo.p10)}–${fM(MC.saldo.p90)}); contano di più ${top}`:`Il saldo è negativo in ${n0(MC.saldo.neg*MC.n)} simulazioni su ${MC.n}: pesano soprattutto ${top}`,source:"modello Il Dividendo di Firenze",notes:"Simulazione: "+MC.n+" estrazioni con seme fisso delle ipotesi più incerte (reattività della domanda ±30%, traslazione 70–100%, evasione 0,5–2 volte, premio R 1,3–1,8, notti 13–15 mln, prezzo del lusso ±20%, spesa pubblica €35–75 mln, margine e sconto per il rischio, appartamenti 10.500–14.500). P10/P90 = 10° e 90° percentile."});
  K.chartTitle(c,ML,166,700,"Che cosa muove il saldo","ogni barra varia una sola ipotesi");
  const rows=K.tornadoRows(T);
  K.tornadoChart(c,ML,176,700,rows,{labelW:220,rowH:40});
  K.chartTitle(c,800,166,420,"Intervallo di incertezza","10° · mediana · 90° percentile");
  const mc=(k,f)=>[f(MC[k].p10),f(MC[k].p50),f(MC[k].p90)];
  K.table(c,800,176,[{h:"Grandezza",w:160},{h:"P10",w:86,a:"r"},{h:"Mediana",w:90,a:"r"},{h:"P90",w:84,a:"r"}],[
    {cells:["Saldo",...mc("saldo",fM)],b:true},{cells:["Gettito netto aggiuntivo",...mc("dTax",fM)]},{cells:["Pernottamenti",...mc("nChg",v=>fPs(v))]},{cells:["Abitazioni ai residenti",...mc("toRes",fN)]},{cells:["Canoni",...mc("rentChg",v=>fPs(v))]},{cells:["Dividendo per famiglia",...mc("perHH",fE)]},{cells:["Occupazione netta",...mc("jobsNet",fNs)]},{cells:["Costo su non residenti",...mc("nonResShare",v=>fP(v,0))]}],{rh:29,size:12});
  const body=`Il risultato dipende soprattutto da quanto gli ospiti scaricano l'imposta sui gestori e da quanto reagisce la domanda. Sono i primi dati da chiedere a uffici e piattaforme: dichiarazioni dei gestori per fascia di prezzo e dati DAC7.`;
  K.callout(c,800,452,420,Math.min(K.calloutH(c,420,body,{size:13,lh:18}),190),"Implicazione",body,{size:13,lh:18});
}
function s_matrix(c,S,n){
  K.frame(c,S,n,{tag:"Rischi e incertezza",title:"Matrice degli effetti: ogni leva sposta più risultati contemporaneamente",source:"modello Il Dividendo di Firenze",notes:"Variazione di ciascun risultato (nell'unità indicata) per un aumento del 10% della leva (o dell'importo indicato per contributo d'accesso, quota allo Stato e riserva). Blu: il risultato aumenta; arancione: diminuisce. L'intensità è proporzionale alla variazione relativa nella colonna."});
  const h=K.heat(c,ML,162,S.MAT,{w:CW,labelW:200,rowH:34,hh:62});
  c.text("**Lettura.** Il pavimento e l'aliquota muovono insieme gettito, presenze e dividendo; la traslazione sull'ospite e la reattività della domanda sono i parametri di mercato più influenti sul risultato fiscale; il contributo d'accesso è l'unica leva che riduce visitatori-giorno in modo sensibile.",ML,162+h+22,{size:13.4,color:C.ink,maxWidth:1100,lh:19,boldColor:C.navy});
}
function s_legal(c,S,n){
  const R=S.R,P=S.P,L=legal(P,R);
  const title=L.needsLaw?"Per i parametri scelti serve una norma nazionale: la Fase 1 parte comunque a legislazione vigente":"La proposta è realizzabile a legislazione vigente, con un percorso in tre fasi";
  K.frame(c,S,n,{tag:"Fattibilità e percorso",title,source:"D.Lgs. 23/2011, art. 4, c. 1-bis (Informazione Fiscale); legge di bilancio 2026 (Avvenire); Banca d'Italia–IRPET",notes:"Le valutazioni giuridiche sono preliminari e vanno confermate da un parere dell'Avvocatura comunale."});
  const items=[
    [L.tmin,"Pavimento",L.tmin==="ok"?`€${pv(P.tmin)} è entro il tetto di €10 consentito ai capoluoghi con presenze oltre 20 volte i residenti.`:L.tmin==="warn"?`€${pv(P.tmin)} usa la maggiorazione di €2, prevista per il 2026 e da confermare; il 30% del maggior gettito va allo Stato.`:`€${pv(P.tmin)} supera il tetto (€10, più €2 di maggiorazione): serve una norma nazionale.`],
    [L.prop,"Aliquota proporzionale",L.prop==="ok"?"Rispetta il tetto per notte.":L.prop==="warn"?"Rispetta il tetto solo con la maggiorazione di €2.":`Un ospite del lusso su dieci pagherebbe almeno ${fE2(L.maxT)} a notte: oltre il tetto, serve una norma.`],
    [P.u30<P.tmin?"warn":"ok","Tariffa per cittadini UE under 30",P.u30<P.tmin?(P.u30<=0?"Esenzione":"Tariffa ridotta di €"+pv(P.u30))+" legata alla cittadinanza: non sperimentata, va coperta da un parere. Un'agevolazione per sola età o per tessera studente è più sicura.":"Nessuna agevolazione legata alla cittadinanza."],
    [P.stateLevy>0?"warn":"ok","Quota allo Stato",P.stateLevy>0?`Il ${fP(P.stateLevy,0)} del maggior gettito (${fM(R.levy)}) esce dal bilancio: va chiarito se si applica anche a una struttura tariffaria nuova.`:"Nessuna quota allo Stato."],
    [P.dayFee>0?"bad":"ok","Contributo d'accesso",P.dayFee>0?"Richiede una norma nazionale, come il contributo di Venezia.":"Non previsto."]
  ];
  const lab={ok:"OK",warn:"Verificare",bad:"Norma"};
  let y=176; items.forEach(it=>{ K.chip(c,ML,y+2,lab[it[0]],it[0]); c.t1(it[1],ML+92,y+2,{font:"sansB",size:13.5,color:C.navy}); const r=c.text(it[2],ML+92,y+22,{size:12.6,color:C.ink,maxWidth:420,lh:17}); y+=r.h+32; });
  K.chartTitle(c,640,166,580,"Percorso in tre fasi","");
  const vg=S.V.phase1;
  K.kpi(c,ML,486,274,124,fM(vg.saldo),"Fase 1 a legislazione vigente","tetto di €10 per notte, senza contributo; dividendo "+fE(vg.perHH),{size:30});
  K.kpi(c,344,486,274,124,fM(R.saldo),L.needsLaw?"Proposta completa, con norma":"Proposta completa","a regime; dividendo "+fE(R.perHH),{size:30,color:C.blue});
  K.gantt(c,640,176,580,[
    {label:"Mandato tecnico e dati",b:true,bars:[{from:0,to:2,color:C.navy,text:"Validazione"}]},
    {label:"Fase 1: delibera a legislazione vigente",b:true,bars:[{from:1,to:2,color:C.blue,text:"Atto"},{from:2,to:7,color:C.lblue,text:"In vigore"}]},
    {label:"Fondo di garanzia e Fondo Armonizzatore",bars:[{from:2,to:5,color:C.blue,text:"Avvio"}]},
    {label:"Accordo metropolitano",bars:[{from:1,to:4,color:C.blue,text:"Negoziato"}]},
    {label:"Fase 2: proposta normativa (ANCI, Parlamento)",b:true,bars:[{from:2,to:6,color:C.blue,text:"Iter"}]},
    {label:"Fase 3: tariffa completa e dividendo a regime",b:true,bars:[{from:5,to:7,color:C.navy,text:"A regime"}]},
    {label:"Valutazione indipendente",bars:[{from:6,to:7,color:C.orange}]}
  ],{labelW:230,cols:["T4 2026","T1 2027","T2 2027","T3 2027","T4 2027","2028","2029"],rowH:44});
}
function s_kpi(c,S,n){
  const R=S.R,P=S.P;
  K.frame(c,S,n,{tag:"Governance",title:"Dodici indicatori per governare la riforma e correggerla in corsa",source:"modello Il Dividendo di Firenze; fonti dei dati: Comune di Firenze, ISTAT, Regione Toscana, piattaforme (DAC7), Agenzia delle Entrate, INPS",notes:"Gli obiettivi sono i valori a regime della proposta; la verifica trimestrale confronta l'andamento con il percorso anno per anno e attiva le correzioni."});
  const avgT=R.G/R.nNew;
  const rows=[
    ["Gettito dell'imposta riscosso",fM(P.baseRevenue*1e6),fM(R.Gn),"Tesoreria comunale; piattaforme","Mensile"],
    ["Imposta media per notte tassata","€"+n2(P.baseRevenue*1e6/(P.totalNights*1e6*(1-P.minorShare))),"€"+n2(R.G/(R.nNew*(1-P.minorShare))),"Dichiarazioni dei gestori","Trimestrale"],
    ["Notti tassate",n1(P.totalNights)+" mln",n1(R.nNew/1e6)+" mln","ISTAT; Regione; DAC7","Trimestrale"],
    ["Imposta non riscossa (quota del maggior gettito)","—","≤ "+fP(P.evasion,0),"Incrocio CIN–piattaforme","Semestrale"],
    ["Appartamenti in affitto breve",fN(P.strUnits),fN(P.strUnits-R.units),"Banca dati strutture; CIN","Trimestrale"],
    ["Contratti di lungo periodo da riconversione","0","+"+fN(R.toRes),"Agenzia delle Entrate; Comune","Semestrale"],
    ["Canone medio richiesto","€"+n1(P.rent)+"/m²","€"+n1(P.rent*(1+R.rentChg))+"/m²","Osservatori immobiliari","Trimestrale"],
    ["Nuovi residenti","—","+"+fN(R.newRes),"Anagrafe comunale","Annuale"],
    ["Posti di lavoro a rischio nel turismo","—","−"+fN(R.jobsLost)+" (ricollocati: "+fP(P.trainCoverage,0)+")","INPS; Centri per l'impiego","Trimestrale"],
    ["Visitatori presenti in un giorno medio",n1(R.vdB/365/1e3)+" mila",n1(R.vdN/365/1e3)+" mila","Celle telefoniche; ISTAT","Mensile"],
    ["Dividendo erogato per famiglia","—",fE(R.perHH),"Bilancio comunale","Annuale"],
    ["Riserva prudenziale","—",fM(R.reserve),"Bilancio comunale","Annuale"]
  ].map(r=>({cells:r}));
  K.table(c,ML,162,[{h:"Indicatore",w:330},{h:"Oggi",w:150,a:"r"},{h:"Obiettivo a regime",w:210,a:"r"},{h:"Fonte del dato",w:310},{h:"Frequenza",w:160}],rows,{rh:38,hh:32,size:12.4});
}
function s_decisions(c,S,n){
  const R=S.R,P=S.P,L=legal(P,R);
  K.frame(c,S,n,{tag:"Decisioni",title:"Cinque decisioni alla Commissione e un calendario a 90 giorni",source:"modello Il Dividendo di Firenze",notes:"I tempi sono indicativi e dipendono dal calendario di bilancio del Comune."});
  numbered(c,ML,176,640,[
    "**Mandato tecnico** agli uffici (Risorse finanziarie, Statistica, Fiscalità locale) per validare il modello con dati amministrativi: dichiarazioni dei gestori per fascia di prezzo, codici CIN, dati delle piattaforme (DAC7), anagrafe.",
    "**Fase 1 a legislazione vigente**: delibera tariffaria graduata in proporzione al prezzo entro il tetto di €10 per notte, esenzione per età under 30, istituzione del Fondo di garanzia per gli affitti a lungo termine.",
    "**Iniziativa istituzionale** (ANCI, parlamentari) per modificare l'art. 4 del D.Lgs. 23/2011: aliquota proporzionale al prezzo oltre il tetto nelle città ad alta intensità turistica e chiarimento sulla quota del maggior gettito allo Stato.",
    "**Accordo metropolitano** con i comuni della cintura su tariffe e regole per gli affitti brevi, per evitare lo spostamento dei flussi.",
    "**Vincolo di destinazione**: Fondo Armonizzatore e dividendo civico con bilancio separato e rendicontazione pubblica annuale."],{size:15.2,gap:22});
  function numbered(c,x,y,w,items,o){ K.numbered(c,x,y,w,items,o); }
  const cols=[["Entro 30 giorni",["Costituzione del gruppo tecnico","Richiesta dei dati a piattaforme e uffici","Parere dell'Avvocatura sull'esenzione per età"]],["Entro 60 giorni",["Validazione del modello e delle ipotesi","Bozza di delibera di Fase 1","Primo confronto con ANCI e gruppi parlamentari"]],["Entro 90 giorni",["Presentazione della proposta definitiva","Avvio dell'accordo con i comuni della cintura","Calendario della consultazione con le categorie"]]];
  cols.forEach((k,i)=>{ const x=760+i*154; c.rect(x,176,146,34,{fill:C.navy}); c.t1(k[0],x+10,198,{font:"sansB",size:12.5,color:C.white}); let y=232; k[1].forEach(t=>{ const r=c.text(t,x+2,y,{size:12.4,color:C.ink,maxWidth:140,lh:16.5}); y+=r.h+16; }); });
  K.kpi(c,760,470,226,130,fM(R.saldo),"Saldo strutturale a regime","dal "+B.tgtYear(S),{size:30,color:C.blue});
  K.kpi(c,994,470,226,130,fE(R.perHH),"Dividendo per famiglia","all'anno, dopo la riserva",{size:30});
}

/* ---------- allegati ---------- */
function s_divider(c,S,n){
  c.info={tag:"Allegati",title:"Ipotesi, metodo, verifiche e fonti"};
  c.rect(0,0,W,H,{fill:C.navy}); c.rect(0,0,14,H,{fill:C.blue});
  c.t1("ALLEGATI",80,300,{font:"sansB",size:14,color:"#9DBCE3"});
  c.text("Ipotesi, metodo,\nverifiche e fonti",80,370,{font:"serifSB",size:54,color:C.white,lh:62});
  c.text("Tutti i numeri della presentazione derivano dalle ipotesi qui elencate. Sono fisse, ricavate dai dati e calibrate sul gettito osservato; ciascuna porta il tipo (dato, stima, letteratura, regola, ipotesi) e la fonte.",80,520,{size:16,color:"#C9D8EE",maxWidth:640,lh:23});
  c.t1(String(n),W-MR,698,{font:"sansB",size:11,color:"#8FA6C4",anchor:"end"});
}
function s_personas(c,S,n){
  const P=S.P,R=S.R;
  K.frame(c,S,n,{tag:"Allegato A",title:"Le cinque tipologie di visitatore e i parametri di comportamento",source:"modello Il Dividendo di Firenze; elasticità calibrate sulla letteratura (Banca d'Italia QEF 482; Biagi, Brandano, Pulina)",notes:"Quote sul totale dei pernottamenti (riscalate al 100%). Prezzi per persona e per notte al netto dell'imposta, con distribuzione log-normale di dispersione σ. Elasticità rispetto al costo complessivo per notte, moltiplicata per la reattività della domanda ("+n2(P.epsMult)+"×)."});
  const tot=P.segs.reduce((a,s)=>a+s.share,0);
  K.table(c,ML,164,[{h:"Tipologia",w:340},{h:"Quota notti",w:94,a:"r"},{h:"Prezzo mediano",w:108,a:"r"},{h:"Dispersione σ",w:104,a:"r"},{h:"Elasticità ε",w:98,a:"r"},{h:"Imposta oggi",w:104,a:"r"},{h:"Verso la cintura",w:108,a:"r"},{h:"In affitto breve",w:104,a:"r"}],
    P.segs.map(s=>({cells:[s.name,fP(s.share/tot,0),"€"+n0(s.price),n2(s.sigma),n2(s.eps).replace("-",MIN),"€"+n2(s.tOld),fP(s.belt,0),fP(s.apt,0)]})),{rh:42,hh:40,size:12.2});
  c.text("**Come si legge.** La tipologia «Lusso» ha una quota piccola delle notti (7%) ma un prezzo mediano di €520 a persona e un'elasticità molto bassa: per questo un'aliquota proporzionale rende molto con pochi effetti sui volumi. Il «Budget» ha un'elasticità alta e una forte propensione a spostarsi nella cintura.",ML,456,{size:13.4,color:C.ink,maxWidth:1100,lh:19,boldColor:C.navy});
}
const fmtParam=K.fmtParam;
function s_assump(c,S,n,idx,total,list){
  K.frame(c,S,n,{tag:"Allegato B · ipotesi e fonti ("+(idx+1)+"/"+total+")",title:idx===0?"Ipotesi del modello: dati, stime e scelte":"Ipotesi del modello (continua)",source:"vedi l'elenco delle fonti; i numeri tra parentesi quadre rimandano a quell'elenco",notes:"Dato: cifra pubblicata. Stima: valore derivato da dati. Letteratura: da studi empirici. Regola: scelta di disegno della proposta. Ipotesi: scelta del modello, coperta dall'analisi di incertezza."});
  const half=Math.ceil(list.length/2);
  [list.slice(0,half),list.slice(half)].forEach((rows,ci)=>{
    const x=ML+ci*586;
    K.table(c,x,160,[{h:"Ipotesi",w:300},{h:"Valore",w:110,a:"r"},{h:"Tipo",w:76,a:"c"},{h:"Fonte",w:90}],rows.map(p=>p.head?{cells:[{t:p.head,b:true,c:C.blue}],fill:C.pblue}:{cells:[p.label,fmtParam(p,S.P[p.id]),p.kind,p.src?(Array.isArray(p.src)?p.src:[p.src]).map(k=>"["+FM.SRCI[k]+"]").join(" "):"—"]}),{rh:21.5,hh:26,size:10.2});
  });
}
function s_method(c,S,n){
  K.frame(c,S,n,{tag:"Allegato C",title:"Come funziona il modello: dall'imposta ai portatori di interesse",source:"modello Il Dividendo di Firenze",notes:"Modello di equilibrio parziale, annuale, per una sola città. Non modella la risposta dell'offerta alberghiera, la concorrenza con altre città d'arte, i cambi né l'effetto moltiplicativo del dividendo sulla spesa locale."});
  const eq=[
    ["Imposta","t(p) = min( tetto ; max( T_min ; α·p ) ),  t = 0 per gli esenti"],
    ["Prezzo netto del gestore","p′ = p − (1 − θ)·(t_nuova − t_attuale),  θ = traslazione sull'ospite"],
    ["Pernottamenti","q₁ = q₀ · exp[ ε·m·(1 + κ·|Δ ln g|)·Δ ln g ],  g = p′ + t"],
    ["Calibrazione","k = G₀ ÷ Σ q₀·(1 − s_minori)·t_attuale"],
    ["Gettito lordo e netto","G = k·Σ q₁·(1 − s_minori)·t_nuova;  N = G − e·ΔG − λ·(ΔG − e·ΔG)"],
    ["Surplus dei turisti","ΔCS = −Σ (g₁ − g₀)·(q₀ + q₁)/2"],
    ["Perdita di efficienza","DWL = Σ (q₀ − q₁)·[ (g₀ + g₁)/2 − costo variabile ]"],
    ["Conversione degli affitti","R·(1 − ΔNOI) < 1 − δ·(1 − g),  R ~ lognormale(mediana, σ)"],
    ["Canoni","Δr = −(U ÷ S) ÷ (ε_domanda + ε_offerta)"],
    ["Saldo a regime","S = (N − G₀ + contributo) − perdite collaterali + risparmi − Fondo"],
    ["Percorso anno per anno","q_t = q_(t−1) + λ·(q*_t − q_(t−1));  U_t = U_(t−1) + μ·(U*_t − U_(t−1))"]
  ];
  let y=164; eq.forEach(e=>{ c.t1(e[0],ML,y+4,{font:"sansB",size:12.8,color:C.navy}); c.t1(e[1],ML+210,y+4,{size:13,color:C.ink}); c.line(ML,y+17,ML+700,y+17,{stroke:C.xl,sw:.8}); y+=38; });
  const notes=["Ogni tipologia è rappresentata da 41 quantili della distribuzione dei prezzi: il passaggio dal pavimento all'aliquota avviene dentro la tipologia.","La calibrazione riproduce esattamente il gettito 2025 con le tariffe attuali; il coefficiente k assorbe tetto delle sette notti, altre esenzioni e adempimento.","L'identità ΔCS + ΔΠ operatori + gettito = −DWL è verificata a ogni calcolo (allegato D).","La simulazione di incertezza estrae 400 volte le ipotesi più incerte con seme fisso.","Nel percorso anno per anno la domanda si adegua con ritardo (λ) e le riconversioni convergono all'equilibrio a velocità μ; la riqualificazione è spesa quando i posti si perdono."];
  bulletsRight(c,810,170,410,notes);
  function bulletsRight(c,x,y,w,items){ K.bullets(c,x,y,w,items,{size:13,gap:14}); }
}
function s_checks(c,S,n,idx,total,list){
  K.frame(c,S,n,{tag:"Allegato D · verifiche numeriche ("+(idx+1)+"/"+total+")",title:idx===0?"Il modello supera tutte le verifiche di coerenza numerica":"Verifiche di coerenza numerica (continua)",source:"modello Il Dividendo di Firenze; le verifiche sono ricalcolate a ogni variazione della politica",notes:"OK: verifica superata. Verifica: valore da controllare ma non errato. Errore: incoerenza di calcolo."});
  const lab={ok:"OK",warn:"Verifica",bad:"Errore"};
  let y=162; list.forEach(s=>{ const r=c.textH(s.d,{size:11.6,maxWidth:760,lh:15}); const rh=Math.max(32,r.h+22);
    K.chip(c,ML,y+17,lab[s.s],s.s); c.t1(s.t,ML+84,y+17,{font:"sansB",size:12.8,color:C.navy}); c.text(s.d,ML+84,y+34,{size:11.6,color:C.ink,maxWidth:1040,lh:15}); y+=Math.max(rh,Math.max(32,c.textH(s.d,{size:11.6,maxWidth:1040,lh:15}).h+26)); c.line(ML,y-4,W-MR,y-4,{stroke:C.xl,sw:.7}); });
}
function s_sources(c,S,n){
  K.frame(c,S,n,{tag:"Allegato E",title:"Fonti",source:"consultate tra il 15 e il 17 ottobre 2026; le cifre dei quotidiani sono a loro volta tratte da fonti indicate negli articoli",notes:""});
  const half=Math.ceil(FM.SRC.length/2);
  [FM.SRC.slice(0,half),FM.SRC.slice(half)].forEach((list,ci)=>{ let y=164; const x=ML+ci*586;
    list.forEach((s,i)=>{ const idx=ci*half+i+1; c.t1("["+idx+"]",x,y,{font:"sansB",size:11,color:C.blue}); const r=c.text(s[1],x+34,y,{size:10.8,color:C.ink,maxWidth:520,lh:13.6}); const u=c.text(s[2].replace(/^https?:\/\//,""),x+34,y+r.h+1,{size:9,color:C.gray,maxWidth:520,lh:11.5}); y+=r.h+u.h+12; }); });
}

/* ---------- composizione ---------- */
function build(S){
  const params=[]; FM.GROUPS.forEach(g=>{ const l=FM.PARAMS.filter(p=>p.g===g.id&&p.kind); if(l.length){ params.push({head:g.title}); params.push(...l); } });
  const per=44; const aChunks=[]; for(let i=0;i<params.length;i+=per) aChunks.push(params.slice(i,i+per));
  const SAN=S.SAN||[], half=Math.ceil(SAN.length/2), sanA=SAN.slice(0,half), sanB=SAN.slice(half);
  const b=B.slides, fee=S.P&&S.P.dayFee>0;
  const list=[].concat([b[0],b[1],b[2],b[3],s_plan,b[4],b[5],b[6]],fee?[s_daypass]:[],[b[7],s_evoFin,b[8],b[9],b[10],b[11],s_evoCity,s_labor,s_fund,s_dividend,s_frontier,s_risk,s_matrix,s_legal,s_kpi,s_decisions,s_divider,s_personas],
    aChunks.map((ch,i)=>(c,S2,n)=>s_assump(c,S2,n,i,aChunks.length,ch)),
    [s_method,(c,S2,n)=>s_checks(c,S2,n,0,2,sanA),(c,S2,n)=>s_checks(c,S2,n,1,2,sanB),s_sources]);
  if(S.meta&&S.meta.appendix===false) return list.slice(0,list.indexOf(s_divider));
  return list;
}
function context(P,meta){ const S=B.context(P,meta); const Q=FM.cloneP(P); Q.guaranteeOn=false; S.NG=FM.run(Q); return S; }
function renderSvg(S,i,list){ list=list||build(S); const so=new root.FMD.SvgOut(); list[i](new root.FMD.Canvas(so),S,i+1); return so.done(); }
async function exportPdf(S){
  const L=root.PDFLib; const doc=await L.PDFDocument.create(); doc.registerFontkit(root.fontkit);
  const fonts={}; for(const k of Object.keys(root.FMD.FONT_DEF)) fonts[k]=await doc.embedFont(root.FMD.fontBytes(k),{subset:true});
  const list=build(S);
  list.forEach((fn,i)=>{ const page=doc.addPage([960,540]); const out=new root.FMD.PdfOut(page,fonts,L); fn(new root.FMD.Canvas(out),S,i+1); });
  doc.setTitle("Il Dividendo di Firenze · "+S.name,{showInWindowTitleBar:true}); doc.setSubject("Riforma progressiva dell'imposta di soggiorno: proposta e modello micro-economico");
  doc.setAuthor(S.meta.author||"Il Dividendo di Firenze"); doc.setKeywords(["Firenze","imposta di soggiorno","dividendo civico","modello micro-economico"]); doc.setCreator("Il Dividendo di Firenze · modello interattivo"); doc.setProducer("pdf-lib");
  doc.setCreationDate(new Date()); doc.setModificationDate(new Date());
  return {bytes:await doc.save(),pages:list.length};
}
root.FMDeck={context,build,renderSvg,exportPdf};
})(typeof self!=="undefined"?self:this);
