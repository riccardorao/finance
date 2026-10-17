/* Presentazione: contesto e slide 1–12 (parte B) */
(function(root){
"use strict";
const K=root.FMK, FM=root.FM, {C,ML,MR,CW,n0,n1,n2,fM,fMs,fE,fE2,fP,fPs,fN,fNs,fMn,fMn1,fMc,MIN}=K;
const {W,H}=root.FMD;

/* ---------- contesto della storia ---------- */
function context(P,meta){
  const R=FM.run(P), pathRes=FM.path(P,R), MC=FM.monteCarlo(P,400), TOR=FM.tornado(P,"saldo"), MAT=FM.impactMatrix(P), MAP=FM.policyMap(P), SAN=FM.sanity(P,R,pathRes);
  const SC={}; FM.SCEN_ORDER.forEach(k=>{ const Q=FM.cloneP(P); FM.SCEN_KEYS.forEach(id=>Q[id]=FM.SCEN[k][id]); const r=FM.run(Q); SC[k]={P:Q,R:r,path:FM.path(Q,r)}; });
  const [key,nm]=FM.scenName(P);
  const date=new Date().toLocaleDateString("it-IT",{day:"numeric",month:"long",year:"numeric"});
  return {P,R,pathRes,MC,TOR,MAT,MAP,SAN,SC,key,name:(meta&&meta.name)||nm,meta:Object.assign({audience:"Commissione consiliare e forze politiche",author:"",date},meta||{})};
}
const cum5=S=>S.pathRes.cum[4];
const seg=(R,id)=>R.segs.find(s=>s.id===id);
function divPhrase(R,P){
  const nm={irpef:"l'addizionale IRPEF",tari:"la TARI domestica",tpl:"il trasporto pubblico"}, of={irpef:"dell'addizionale IRPEF",tari:"della TARI domestica",tpl:"del trasporto pubblico"}; const keys=String(P.order).split(",");
  const full=keys.filter(k=>R.alloc[k].cov>=.995), part=keys.filter(k=>R.alloc[k].cov>.005&&R.alloc[k].cov<.995);
  const bits=[]; if(full.length) bits.push("azzera "+full.map(k=>nm[k]).join(" e "));
  part.forEach(k=>bits.push("copre il "+n0(R.alloc[k].cov*100)+"% "+of[k]));
  return bits.length?bits.join(" e "):"non basta a finanziare gli sgravi";
}
const legal=(P,R)=>{ const maxT=Math.max(...R.segs.map(s=>s.tP90)); return {tmin:P.tmin>12?"bad":P.tmin>10?"warn":"ok",prop:maxT>12.0001?"bad":maxT>10.0001?"warn":"ok",maxT,needsLaw:P.tmin>12||maxT>12.0001||P.dayFee>0}; };

/* ---------- slide ---------- */
function s_cover(c,S,n){
  const R=S.R,P=S.P; c.info={tag:"Copertina",title:"Il Dividendo di Firenze"};
  c.rect(0,0,W,H,{fill:C.navy});
  c.rect(0,0,14,H,{fill:C.blue});
  c.t1("DOCUMENTO DI LAVORO  ·  "+S.meta.date.toUpperCase(),80,84,{font:"sansB",size:12.5,color:"#9DBCE3"});
  c.text("Il Dividendo\ndi Firenze",80,230,{font:"serifSB",size:70,color:C.white,lh:80});
  c.rect(80,330,90,4,{fill:C.blue});
  c.text("Una riforma progressiva dell'imposta di soggiorno per riportare la città ai suoi residenti",80,384,{font:"serif",size:25,color:"#D3E0F2",maxWidth:560,lh:33});
  c.text("**Scenario:** "+S.name,80,512,{size:15,color:"#C9D8EE",boldColor:C.white});
  c.text("**Per:** "+S.meta.audience+(S.meta.author?"\n**A cura di:** "+S.meta.author:""),80,538,{size:15,color:"#C9D8EE",boldColor:C.white,lh:22,maxWidth:640});
  c.text("Documento indipendente di proposta, non un atto del Comune di Firenze. I risultati sono stime di un modello con ipotesi dichiarate e modificabili.",80,650,{size:11,color:"#8FA6C4",maxWidth:620,lh:15});
  // pannello dei numeri
  c.rect(790,120,410,480,{fill:"#10325E"});
  const items=[[fM(R.net),"gettito netto per il Comune",fMs(R.dTax-R.dayFeeNet)+" sull'oggi"],[fM(R.saldo),"saldo strutturale a regime","dopo il Fondo Armonizzatore"],[fE(R.perHH),"dividendo per famiglia","ogni anno, dopo la riserva"]];
  items.forEach((it,i)=>{ const y=170+i*150; c.t1(it[0],820,y+52,{font:"serifSB",size:54,color:C.white}); c.t1(it[1],820,y+82,{font:"sansB",size:14,color:"#C9D8EE"}); c.t1(it[2],820,y+102,{size:12.5,color:"#8FA6C4"}); if(i<2) c.line(820,y+126,1170,y+126,{stroke:"#2A4C7C",sw:1}); });
}
function s_exec(c,S,n){
  const R=S.R,P=S.P,MC=S.MC, lux=seg(R,"lux"), bud=seg(R,"budget");
  const title=R.saldo>0?`Un'imposta progressiva a due componenti genera ${fM(R.net)} netti per il Comune e un dividendo di ${fE(R.perHH)} a famiglia, con effetti contenuti su presenze e occupazione`
    :`Con questi parametri la riforma non copre il Fondo Armonizzatore: serve un pavimento o un'aliquota più alti, oppure un Fondo più piccolo`;
  K.frame(c,S,n,{tag:"Sintesi",title,source:"modello Il Dividendo di Firenze; dati IRPET, Comune di Firenze, Banca d'Italia (elenco nell'allegato)",notes:"Valori annui a regime, euro correnti. Scenario: "+S.name+"."});
  const L=legal(P,R);
  const items=[
    `**Situazione.** Firenze ha ${fN(P.residents)} residenti (circa 2.000 in meno ogni anno), ${n1(P.totalNights)} milioni di notti turistiche tassate e ${n1(P.dayVisitors)} milioni di escursionisti. La tariffa fissa di €3,50–8 pesa il ${fP(bud.effOld,0)} su un posto da €${n0(bud.meanP)} e l'${n1(lux.effOld*100)}% su una suite.`,
    `**Proposta.** Imposta = max(€${n1(P.tmin).replace(",0","")}; ${n1(P.alpha*100).replace(",0","")}% del prezzo)${P.cap>0?", con tetto di €"+P.cap:""}${P.youthExempt?", esenti i cittadini UE under 30":""}${P.dayFee>0?`, più un contributo d'accesso di €${n1(P.dayFee).replace(",0","")} per gli escursionisti`:""}. Un Fondo Armonizzatore accompagna la transizione e l'avanzo va ai residenti.`,
    `**Risultato.** Il Comune incassa ${fM(R.net)} netti (${fMs(R.dTax-R.dayFeeNet)}); dopo ${fM(R.fund)} di Fondo restano ${fM(R.saldo)} di saldo. Il dividendo vale ${fE(R.perHH)} a famiglia e ${divPhrase(R,P)}.`,
    `**Costo.** Pernottamenti ${fPs(R.nChg)}, ${fN(R.jobsLost)} posti a rischio (${fN(R.jobsGained)} ricreati), perdita di efficienza ${fM(R.dwl)}. Il ${fP(R.nonResShare,0)} del costo ricade su non residenti; il saldo resta positivo in ${n0((1-MC.saldo.neg)*MC.n)} simulazioni su ${MC.n}.`,
    `**Limiti e decisione.** I visitatori-giorno cambiano solo del ${fPs(R.vdChg)}: per la decongestione servono altre leve. ${L.needsLaw?"Parte dello scenario richiede una norma nazionale; la Fase 1 è realizzabile a legislazione vigente.":"Lo scenario è realizzabile a legislazione vigente."} Si chiede un mandato per validare i dati e avviare la Fase 1.`
  ];
  let y=164; items.forEach((t,i)=>{ const r=c.text(t,ML+36,y,{size:15.4,color:C.ink,maxWidth:690,lh:21.5,boldColor:C.navy,maxH:130}); c.circle(ML+12,y-5,12,{fill:C.navy}); c.t1(String(i+1),ML+12,y-.5,{font:"sansB",size:13,color:C.white,anchor:"middle"}); y+=Math.max(r.h,26)+22; });
  const tiles=[[fM(R.net),"Gettito netto al Comune",fMs(R.dTax-R.dayFeeNet)+" sull'oggi",1],[fM(R.saldo),"Saldo strutturale","dopo il Fondo",1],[fE(R.perHH),"Dividendo per famiglia","all'anno, dopo la riserva"],[fPs(R.nChg),"Pernottamenti",n1(R.nNew/1e6)+" mln di notti"],[fN(R.toRes),"Abitazioni ai residenti",fPs(R.rentChg)+" sui canoni"],[fP(R.nonResShare,0),"Costo su non residenti","turisti e non fiorentini"]];
  tiles.forEach((t,i)=>{ const cx=830+(i%2)*200, cy=158+Math.floor(i/2)*166; K.kpi(c,cx,cy,190,156,t[0],t[1],t[2],{size:t[3]?33:31,color:t[3]?C.blue:C.navy}); });
}
function s_context(c,S,n){
  const R=S.R,P=S.P, bud=seg(R,"budget"), lux=seg(R,"lux"), yng=seg(R,"young");
  const ratio=bud.effOld/lux.effOld;
  K.frame(c,S,n,{tag:"Situazione",title:`La tariffa fissa di oggi pesa ${n1(ratio)} volte di più sul turismo economico che sul lusso`,source:"Comune di Firenze (Delibera DG/2024/00535, bollettino statistico 2025); IRPET; Federalberghi; elaborazione del modello",notes:"Aliquota effettiva = imposta ÷ (prezzo della camera + imposta), per persona e per notte, ai prezzi mediani di ciascuna tipologia."});
  K.chartTitle(c,ML,166,640,"Imposta di soggiorno attuale in % del prezzo","per tipologia di visitatore");
  K.hBars(c,ML,186,640,R.segs.map(s=>({label:s.short,v:s.effOld,b:0,color:C.blue})),{labelW:170,valW:70,rowH:66,bh:28,fmt:v=>fP(v,1)});
  const t=[[fN(P.residents),"Residenti","circa 2.000 in meno in un anno"],[n1(P.totalNights)+" mln","Notti tassate all'anno",n1(P.recordedNights)+" mln registrate, il resto non rilevato"],[n1(P.dayVisitors)+" mln","Escursionisti all'anno","non pagano l'imposta di soggiorno"],[fN(P.strUnits),"Appartamenti in affitto breve","85% degli annunci nel centro storico"]];
  t.forEach((k,i)=>K.kpi(c,760+(i%2)*232,166+Math.floor(i/2)*134,222,124,k[0],k[1],k[2],{size:30}));
  const h=K.calloutH(c,454,`Le tariffe del 2025 vanno da €3,50 a €8 per notte e non dipendono dal prezzo: un posto letto da €${n0(bud.meanP)} paga il ${fP(bud.effOld,0)} del conto, una suite da €${n0(lux.meanP)} l'${n1(lux.effOld*100)}%. La struttura è regressiva, e non incentiva a scegliere forme di turismo meno invasive.`);
  K.callout(c,760,452,454,Math.max(h,170),"Implicazione",`Le tariffe del 2025 vanno da €3,50 a €8 per notte e non dipendono dal prezzo: un posto letto da €${n0(bud.meanP)} paga il ${fP(bud.effOld,0)} del conto, una suite da €${n0(lux.meanP)} l'${n1(lux.effOld*100)}%. La struttura è regressiva e non incentiva forme di turismo meno invasive.`,{size:13.2,lh:18.5});
}
function s_proposal(c,S,n){
  const R=S.R,P=S.P, L=legal(P,R), ps=P.alpha>0?P.tmin/P.alpha:Infinity;
  K.frame(c,S,n,{tag:"La proposta",title:"Una tariffa a due componenti: un pavimento sulla pressione fisica e un'aliquota sul valore del soggiorno",source:"modello Il Dividendo di Firenze",notes:"Cerchi vuoti: tariffa attuale al prezzo mediano di ciascuna tipologia; cerchi pieni: tariffa proposta."});
  K.chartTitle(c,ML,166,700,"Imposta per notte in funzione del prezzo","€ per persona");
  K.taxFunction(c,ML,180,700,470,S);
  const x=820; let y=182;
  const blocks=[
    ["Pavimento T_min = €"+n1(P.tmin).replace(",0",""),`Pagato da ogni ospite tassabile fino a €${isFinite(ps)?n0(ps):"∞"} a persona per notte. Rende anti-economico l'affitto breve non professionale e scoraggia il turismo di massa.`],
    ["Aliquota α = "+n1(P.alpha*100).replace(",0","")+"%",`Oltre €${isFinite(ps)?n0(ps):"∞"} l'imposta è proporzionale al prezzo: colpisce alberghi di lusso, suite e ville, dove la domanda reagisce poco.`],
    [P.youthExempt?"Esenzioni":"Esenzioni limitate",P.youthExempt?"Cittadini UE under 30, minori e notti oltre la settima: turismo culturale, formativo e giovanile.":"Minori e notti oltre la settima."]
  ];
  if(P.cap>0) blocks.push(["Tetto di €"+P.cap+" per notte","Mantiene lo schema entro il limite di legge attuale."]);
  if(P.dayFee>0) blocks.push(["Contributo d'accesso €"+n1(P.dayFee).replace(",0",""),"Per gli escursionisti, con esclusione di residenti dell'area metropolitana, pendolari e studenti."]);
  blocks.forEach(b=>{ c.t1(b[0],x,y,{font:"sansB",size:14.5,color:C.navy}); const r=c.text(b[1],x,y+21,{size:13.2,color:C.ink,maxWidth:400,lh:18}); y+=r.h+40; });
  const lab={ok:"Entro il tetto di legge",warn:"Usa la maggiorazione di €2",bad:"Serve una norma nazionale"};
  const worst=L.tmin==="bad"||L.prop==="bad"?"bad":(L.tmin==="warn"||L.prop==="warn"?"warn":"ok");
  c.t1("Fattibilità giuridica",x,y+4,{font:"sansB",size:13,color:C.navy}); K.chip(c,x+138,y+4,lab[worst],worst);
  K.table(c,x,y+34,[{h:"Altre città",w:130},{h:"Struttura dell'imposta",w:270}],[
    {cells:["Amsterdam","12,5% del prezzo della camera"]},{cells:["Barcellona","€5, fino a €7,50 nei 5★, più imposta regionale"]},{cells:["Roma","per categoria, fino a €10"]},{cells:["Firenze oggi","€3,50–8 per categoria"]}],{rh:24,hh:26,size:11.6});
}
function s_effective(c,S,n){
  const R=S.R,P=S.P, bud=seg(R,"budget"), lux=seg(R,"lux"), mass=seg(R,"mass");
  K.frame(c,S,n,{tag:"La proposta",title:`L'aliquota effettiva sul lusso sale da ${fP(lux.effOld)} a ${fP(lux.effNew)}, ma sul turismo economico resta più alta (${fP(bud.effNew)})`,source:"modello Il Dividendo di Firenze",notes:"Aliquota effettiva = imposta media pagata ÷ (prezzo + imposta). Il pavimento è un prezzo sulla pressione fisica, non un'imposta sul reddito dell'ospite."});
  K.chartTitle(c,ML,166,700,"Imposta di soggiorno in % del prezzo","oggi (grigio) e dopo la riforma (blu)");
  K.hBarPairs(c,ML,184,700,R.segs.map(s=>({label:s.short,a:s.effOld,b:s.effNew})),{labelW:150,valW:90,rowH:62,bh:15,fmt:v=>fP(v,1),max:Math.max(...R.segs.map(s=>Math.max(s.effOld,s.effNew)))*1.05});
  K.chartTitle(c,820,166,400,"Imposta media pagata","€ per persona e per notte");
  K.table(c,820,176,[{h:"Tipologia",w:150},{h:"Oggi",w:80,a:"r"},{h:"Dopo",w:80,a:"r"},{h:"Δ",w:90,a:"r"}],R.segs.map(s=>[s.short,fE2(s.tOld),s.exempt?"esente":fE2(s.tAvg),s.exempt?fE2(-s.tOld):(s.tAvg-s.tOld>=0?"+":"")+fE2(s.tAvg-s.tOld)]).map(r=>({cells:r})),{rh:30,size:12.5});
  const body=`Un pavimento uguale per tutti rende l'imposta più pesante in percentuale sui prezzi bassi: è voluto, perché misura la pressione fisica (una notte è una notte), ma non è progressivo. La progressività arriva solo oltre €${P.alpha>0?n0(P.tmin/P.alpha):"∞"} a persona. Chi vuole un'imposta più sul valore che sul volume può abbassare T_min e alzare α: il modello mostra l'effetto (mappa delle scelte).`;
  const h=K.calloutH(c,400,body,{size:13,lh:18});
  K.callout(c,820,420,400,Math.min(h,236),"Implicazione",body,{size:13,lh:18});
}
function s_demand(c,S,n){
  const R=S.R,P=S.P, lux=seg(R,"lux"), bud=seg(R,"budget");
  const word=R.nChg<0?"calano del":"crescono del";
  K.frame(c,S,n,{tag:"Effetti sulla domanda",title:`Le presenze ${word} ${fP(Math.abs(R.nChg))}: il turismo economico reagisce (${fPs(bud.chg,0)}), il lusso quasi non reagisce (${fPs(lux.chg)})`,source:"modello Il Dividendo di Firenze; elasticità calibrate sulla letteratura (Banca d'Italia QEF 482; Biagi, Brandano, Pulina)",notes:"Prezzi con distribuzione log-normale attorno alla mediana di ciascuna tipologia; elasticità crescente con l'entità del rincaro; traslazione dell'imposta sull'ospite pari al "+fP(P.passThrough,0)+"."});
  K.chartTitle(c,ML,166,700,"Pernottamenti per tipologia","milioni di notti all'anno; oggi (grigio) e dopo (blu)");
  K.hBarPairs(c,ML,184,700,R.segs.map(s=>({label:s.short,a:s.nB/1e6,b:s.nN/1e6,tag:fPs(s.chg),tagColor:s.chg<0?C.orange:C.blue})),{labelW:150,valW:90,rowH:62,bh:15,fmt:v=>n2(v)});
  K.chartTitle(c,820,166,400,"Reattività della domanda","");
  K.table(c,820,176,[{h:"Tipologia",w:140},{h:"Elasticità ε",w:90,a:"r"},{h:"Verso la cintura",w:110,a:"r"},{h:"Δ notti",w:60,a:"r"}],R.segs.map(s=>({cells:[s.short,n2(s.eps*P.epsMult).replace(/^-/,MIN),fP(s.belt,0),fPs(s.chg,1)]})),{rh:30,size:12.2});
  const body=`La domanda si sposta in parte verso i comuni della cintura (${fMn(R.belt)} di notti), serviti da treno e tramvia: il ${fP(P.beltReturn,0)} di quegli ospiti torna comunque in centro di giorno. Il lusso conta per il ${fP(R.segs[4].share/P.segs.reduce((a,s)=>a+s.share,0),0)} delle notti e per il ${fP(R.segs[4].rev/R.G,0)} del gettito.`;
  K.callout(c,820,420,400,Math.min(K.calloutH(c,400,body,{size:13,lh:18}),236),"Implicazione",body,{size:13,lh:18});
}
function s_load(c,S,n){
  const R=S.R,P=S.P, acc=S.SC.accesso.R, fee0=P.dayFee<=0;
  const nights0=R.nB/365, nights1=R.nNew/365, day0=R.dayV0/365, day1=R.dayV1/365, belt1=R.beltReturned/365, tot0=R.vdB/365, tot1=R.vdN/365;
  const title=fee0?`Il carico giornaliero sulla città cambia solo del ${fPs(R.vdChg)}: gli escursionisti, ${fP(R.dayV0/R.vdB,0)} dei visitatori, non pagano l'imposta`
    :`Con il contributo d'accesso di €${n1(P.dayFee).replace(",0","")} i visitatori-giorno calano del ${fP(-R.vdChg)} e il Comune incassa ${fM(R.dayFeeNet)} in più`;
  K.frame(c,S,n,{tag:"Effetti sulla domanda",title,source:"modello Il Dividendo di Firenze; escursionisti: Federalberghi (La Nazione, 22 luglio 2026)",notes:"Visitatori-giorno = notti ÷ 365 + escursionisti ÷ 365 + ospiti della cintura che rientrano in città di giorno."});
  K.chartTitle(c,ML,166,700,"Visitatori presenti in un giorno medio","migliaia di persone");
  K.visitorBars(c,ML,200,700,S);
  K.chartTitle(c,ML,458,700,"Che cosa muove il carico","");
  K.table(c,ML,468,[{h:"Opzione",w:300},{h:"Saldo",w:100,a:"r"},{h:"Pernottamenti",w:120,a:"r"},{h:"Visitatori-giorno",w:140,a:"r"}],[
    {cells:["Solo imposta di soggiorno (scenario Centrale)",fM(S.SC.centrale.R.saldo),fPs(S.SC.centrale.R.nChg),fPs(S.SC.centrale.R.vdChg)]},
    {cells:["Con contributo d'accesso di €5 agli escursionisti",fM(acc.saldo),fPs(acc.nChg),fPs(acc.vdChg)],b:true}],{rh:32,size:12.5,hl:[1]});
  const body=`Un'imposta sul pernottamento non tocca ${fP(R.dayV0/R.vdB,0)} dei visitatori. Un contributo d'accesso, con esenzioni per residenti dell'area metropolitana e pendolari, aggiungerebbe circa ${fM(acc.dayFeeNet)} all'anno e ridurrebbe i visitatori-giorno di ${fP(Math.abs(acc.vdChg-S.SC.centrale.R.vdChg),1)} in più. Richiede una norma nazionale (precedente: Venezia).`;
  K.callout(c,820,176,400,Math.min(K.calloutH(c,400,body,{size:13.4,lh:19}),260),"Implicazione",body,{size:13.4,lh:19});
  K.kpi(c,820,456,194,130,n1(R.dayV0/1e6)+" mln","Escursionisti oggi","non pagano l'imposta di soggiorno",{size:28});
  K.kpi(c,1026,456,194,130,fM(acc.dayFeeNet),"Contributo di €5","gettito annuo stimato",{size:28,color:C.blue});
}
function s_pnl(c,S,n){
  const R=S.R,P=S.P;
  const title=R.saldo>0?`Il Comune incassa ${fM(R.net)} netti (${fMs(R.dTax-R.dayFeeNet)} sull'oggi) e, dopo il Fondo, ${fM(R.saldo)} di saldo strutturale`:`Dopo il Fondo il saldo è ${fM(R.saldo)}: il maggior gettito non basta a finanziare la transizione`;
  K.frame(c,S,n,{tag:"Conto economico del Comune",title,source:"modello Il Dividendo di Firenze; gettito 2025: Osservatorio JFC; quota allo Stato: legge di bilancio 2026",notes:"Valori annui a regime, € milioni. Le perdite collaterali comprendono TARI non domestica, IMU, addizionale IRPEF sui posti persi e canoni legati ai flussi. I risparmi sono al netto del costo dei servizi per i nuovi residenti."});
  const steps=K.pnlSteps(R);
  K.chartTitle(c,ML,166,830,"Dall'incremento di gettito al saldo strutturale","€ milioni all'anno");
  K.waterfall(c,ML+34,190,796,450,steps,{labH:64,fmt:v=>n1(v),fmtS:v=>(v>=0?"+":MIN)+n1(Math.abs(v)),axisFmt:v=>n0(v)});
  const b1=`Delle ${fM(R.G-R.base)} in più pagate dai turisti, ${fM(R.net-R.base)} restano al Comune: ${fM(R.levy)} vanno allo Stato (${fP(P.stateLevy,0)}) e ${fM(R.evasionLoss)} non vengono riscossi (${fP(P.evasion,0)}).`;
  const b2=`Il saldo finanzia il dividendo civico dopo una riserva del ${fP(P.reserve,0)} (${fM(R.reserve)}).`;
  const r1=c.text(b1,930,196,{size:13.2,color:C.ink,maxWidth:290,lh:18.5});
  c.text(b2,930,196+r1.h+18,{size:13.2,color:C.ink,maxWidth:290,lh:18.5});
  K.kpi(c,930,430,290,100,fM(R.saldo),"Saldo strutturale a regime",null,{size:34,color:C.blue});
  K.kpi(c,930,540,290,100,fM(R.pool),"Disponibile per il dividendo",fE(R.perHH)+" per famiglia",{size:30});
}
function s_who(c,S,n){
  const R=S.R,P=S.P, st=id=>R.stake.find(x=>x.id===id).v;
  K.frame(c,S,n,{tag:"Chi paga e chi riceve",title:`Il ${fP(R.nonResShare,0)} del costo ricade su non residenti; ai residenti restano ${fM(R.residentsNet)} netti, ${fE(R.residentsNet/P.residents)} a testa`,source:"modello Il Dividendo di Firenze; elaborazione su ipotesi di residenza dei gestori e dei proprietari (allegato)",notes:"Variazione annua a regime in € milioni. Ipotesi: il "+fP(P.resShareOps,0)+" di gestori e proprietari risiede a Firenze. Il Comune è contato dopo il Fondo; i beneficiari del Fondo ricevono quanto il Comune spende."});
  K.diverging(c,ML,166,790,K.stakeGroups(R),{labelW:270,rowH:29,gh:26});
  K.kpi(c,900,166,320,128,fP(R.nonResShare,0),"Quota del costo su non residenti","turisti, gestori e proprietari non fiorentini",{size:42,color:C.blue});
  K.kpi(c,900,304,320,128,fM(R.residentsNet),"Effetto netto per i residenti",fE(R.residentsNet/P.residents)+" a testa, dopo le perdite dei gestori locali",{size:38});
  K.kpi(c,900,442,320,128,fM(R.netMonetary),"Somma degli effetti monetari","= perdita di efficienza, al netto dei risparmi di spesa",{size:38,color:R.netMonetary<0?C.orange:C.blue});
  c.text("Il costo si concentra su turisti e operatori; il guadagno sui residenti è netto solo se il dividendo viene effettivamente erogato.",900,598,{size:12.2,color:C.gray,maxWidth:320,lh:16});
}
function s_efficiency(c,S,n){
  const R=S.R,P=S.P;
  K.frame(c,S,n,{tag:"Efficienza",title:isFinite(R.mcpf)?`La perdita di efficienza è ${fM(R.dwl)}: ogni euro raccolto costa ${n2(R.mcpf)} euro alla collettività`:`Con questi parametri il prelievo non aumenta: non c'è una perdita di efficienza per euro raccolto`,source:"modello Il Dividendo di Firenze",notes:"Perdita di efficienza = valore dei pernottamenti persi, al netto del costo evitato dagli operatori. Costo per euro raccolto = (maggior gettito + perdita) ÷ maggior gettito. La perdita è negativa (un guadagno) per i giovani esentati."});
  K.chartTitle(c,ML,166,700,"Perdita di efficienza per tipologia","€ milioni all'anno");
  const rows=R.segs.map(s=>({label:s.short,v:s.dwl/1e6,color:s.dwl>0?C.orange:C.blue})); if(R.dwlDay>1e4) rows.push({label:"Escursionisti",v:R.dwlDay/1e6,color:C.orange});
  K.hBars(c,ML,184,700,rows,{labelW:170,valW:70,rowH:50,bh:24,fmt:v=>(v<0?MIN:"")+n1(Math.abs(v))});
  K.kpi(c,820,166,194,130,fM(R.dwl),"Perdita di efficienza",fP(R.dwl/R.spendO,1)+" della spesa turistica",{size:32});
  K.kpi(c,1026,166,194,130,fMc(R.mcpf),"Costo di un euro raccolto","euro di costo per € incassato",{size:34,color:C.blue});
  K.kpi(c,820,306,194,130,fM(R.publicRaised),"Maggior gettito riscosso","Comune e Stato",{size:32});
  K.kpi(c,1026,306,194,130,fMn(R.lostTot-R.gained),"Notti perse nette","su "+n1(R.nB/1e6)+" mln di notti",{size:30});
  const mass=R.segs[2];
  const body=`La perdita si concentra nel mass-market (${fM(mass.dwl)}), dove la domanda è più elastica e il rincaro in percentuale più forte. Nel lusso il prelievo è alto ma i volumi restano: ${fM(R.segs[4].dwl)} di perdita su ${fM(R.segs[4].rev)} di gettito. È la logica di Ramsey: si tassa di più dove la domanda reagisce meno.`;
  K.callout(c,820,452,400,Math.min(K.calloutH(c,400,body,{size:13,lh:18}),200),"Implicazione",body,{size:13,lh:18});
}
function s_operators(c,S,n){
  const R=S.R,P=S.P;
  const tot=R.dPiHotel+R.strLandlords;
  K.frame(c,S,n,{tag:"Operatori e proprietari",title:tot<0?`Albergatori e proprietari di affitti brevi perdono ${fM(-tot)} di margine all'anno: è il costo da compensare`:`Albergatori e proprietari di affitti brevi guadagnano ${fM(tot)} di margine all'anno: il prelievo cala`,source:"modello Il Dividendo di Firenze",notes:"Variazione del margine di contribuzione degli alberghi; reddito netto dei proprietari di appartamenti, distinguendo chi resta e chi converte al lungo termine. Esclusi gli effetti sull'indotto (ristorazione e commercio)."});
  K.chartTitle(c,ML,166,640,"Variazione annua del margine","€ milioni");
  K.columns(c,ML+34,180,606,440,[{label:"Albergatori",v:R.dPiHotel/1e6},{label:"Affitti brevi: chi resta",v:R.llStay/1e6},{label:"Affitti brevi: chi converte",v:R.llSwitch/1e6},{label:"Ristorazione e commercio",v:R.dPiComp/1e6}],{fmt:v=>(v>=0?"+":MIN)+n1(Math.abs(v)),axisFmt:v=>n0(v),labH:48,maxBw:84});
  K.kpi(c,760,166,220,128,fPs(R.dPiHotel/R.hotelBaseProfit,1),"Margine operativo degli alberghi","su una base di "+fM(R.hotelBaseProfit),{size:36,color:C.orange});
  K.kpi(c,992,166,228,128,fPs(R.strLandlords/R.strNoiBase,1),"Reddito netto degli affitti brevi","su una base di "+fM(R.strNoiBase),{size:36,color:C.orange});
  const body=`Il ${fP(R.share,1)} degli appartamenti in affitto breve (${fN(R.units)}) passa alla locazione di lungo periodo; chi resta perde il ${fP(R.noiDrop,1)} del reddito netto. La garanzia sugli affitti${P.guaranteeOn?" (attiva)":" (disattivata)"} sposta la soglia di conversione e riduce il rischio percepito. Il Fondo (${fM(R.fComm+R.fTalent)} all'anno per commercio e imprese) compensa solo in parte: il resto è il prezzo della riforma.`;
  K.callout(c,760,306,460,Math.min(K.calloutH(c,460,body,{size:13.4,lh:19}),230),"Implicazione",body,{size:13.4,lh:19});
  K.table(c,760,556,[{h:"Gruppo",w:200},{h:"Base",w:90,a:"r"},{h:"Variazione",w:90,a:"r"},{h:"%",w:80,a:"r"}],[
    {cells:["Albergatori",fM(R.hotelBaseProfit),fMs(R.dPiHotel),fPs(R.dPiHotel/R.hotelBaseProfit,1)]},
    {cells:["Ristorazione e commercio",fM(R.compBase),fMs(R.dPiComp),fPs(R.dPiComp/R.compBase,1)]}],{rh:24,hh:24,size:11.6});
}
function s_housing(c,S,n){
  const R=S.R,P=S.P;
  K.frame(c,S,n,{tag:"Mercato abitativo",title:`${fN(R.toRes)} appartamenti tornano ai residenti e i canoni calano del ${fP(-R.rentChg)}: un effetto reale, ma da solo non basta`,source:"modello Il Dividendo di Firenze; canoni: Idealista (La Nazione, 11 settembre 2026); prezzi: Immobiliare.it; Banca d'Italia–IRPET (2026)",notes:"R = reddito netto dell'affitto breve ÷ reddito netto della locazione per lo stesso appartamento; distribuzione log-normale. Gli appartamenti con R tra la soglia attuale e quella nuova passano al lungo termine."});
  K.chartTitle(c,ML,166,640,"Distribuzione del premio dell'affitto breve","");
  K.densityR(c,ML,176,640,400,S);
  K.table(c,740,166,[{h:"Indicatore",w:230},{h:"Valore",w:120,a:"r"},{h:"Variazione",w:130,a:"r"}],[
    {cells:["Appartamenti riconvertiti",fN(R.units),fP(R.share,1)+" dello stock"]},
    {cells:["…che vanno a residenti",fN(R.toRes),""]},
    {cells:["Nuovi residenti (netti)",fN(R.newRes),fN(R.newResGross)+" occupanti"]},
    {cells:["Canone di locazione","€"+n1(P.rent*(1+R.rentChg))+"/m²",fPs(R.rentChg)]},
    {cells:["Risparmio annuo per famiglia in affitto",fE(-R.rentChg*R.annualRent),""]},
    {cells:["Prezzo di compravendita","€"+fN(P.price*(1+R.priceChg))+"/m²",fPs(R.priceChg)]}
  ],{rh:30,size:12.4});
  const per=-R.ownerWealth/R.ownerHomes;
  const body=`Il calo dei prezzi (${fPs(R.priceChg)}) è un effetto patrimoniale cartaceo sulle ${fN(R.ownerHomes)} famiglie proprietarie: circa ${fE(per)} a famiglia, ${fM(-R.ownerWealth)} in tutto. Si realizza solo con la vendita; migliora l'accesso di giovani e lavoratori. È il punto politicamente più delicato e va spiegato in anticipo.`;
  K.callout(c,740,392,480,Math.min(K.calloutH(c,480,body,{size:13.2,lh:18.5}),250),"Rischio politico",body,{size:13.2,lh:18.5});
}

root.FMDeckB={context,cum5,seg,divPhrase,legal,slides:[s_cover,s_exec,s_context,s_proposal,s_effective,s_demand,s_load,s_pnl,s_who,s_efficiency,s_operators,s_housing]};
})(typeof self!=="undefined"?self:this);
