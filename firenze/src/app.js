/* Console del modello: politica e transitorio, pagine dei risultati a tutto schermo, anteprima e salvataggio del PDF */
(function(){
"use strict";
const FM=window.FM, FMD=window.FMD, K=window.FMK, D=window.FMDeck;
const {C,n0,n1,n2,fM,fMs,fE,fE2,fP,fPs,fN,fNs,fMn,fMn1,fMc,MIN}=K;
const $=(s,el)=>(el||document).querySelector(s), $$=(s,el)=>[...(el||document).querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pv=(x,d)=>(d===2?n2:n1)(x).replace(/,0+$/,"");

/* ---------- caratteri (gli stessi del PDF) ---------- */
(function(){ let css=""; Object.keys(FMD.FONT_DEF).forEach(k=>{ const d=FMD.FONT_DEF[k]; css+=`@font-face{font-family:'${d[1]}';font-weight:${d[2]};font-display:block;src:url(data:font/ttf;base64,${window.FM_FONTS[d[0]]}) format('truetype')}`; });
  const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st); })();
try{ FMD.initFonts(window.FM_FONTS); }catch(e){ console.error(e); }

/* ---------- stato ---------- */
const KEY="dividendo-firenze-v4", OLD="dividendo-firenze-v3";
let P=FM.defaults();
const META={name:"",audience:"Commissione consiliare e forze politiche",author:"",appendix:true};
const UI={page:"pol",slide:0};
try{ const s=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(OLD)||"null");
  if(s&&s.P) FM.merge(P,s.P); if(s&&s.META){ Object.assign(META,s.META); if(!localStorage.getItem(KEY)) META.name=""; }
  if(s&&s.UI){ if(s.UI.page) UI.page=s.UI.page; if(s.UI.slide) UI.slide=s.UI.slide; } }catch(e){}
const policy=()=>{ const o={}; FM.LEVER_IDS.forEach(id=>o[id]=P[id]); o.plan=P.plan; return o; };
function persist(){ try{ localStorage.setItem(KEY,JSON.stringify({P:policy(),META,UI})); }catch(e){} }
const DEFNAME="Proposta di riforma";
const scenName=()=>META.name||DEFNAME;

let ver=0, R=FM.run(P); const cache={};
const memo=(k,fn)=>{ const c=cache[k]; if(c&&c.v===ver) return c.x; const x=fn(); cache[k]={v:ver,x}; return x; };
const A={
  get TL(){ return memo("tl",()=>FM.timeline(P,R)); },
  get MC(){ return memo("mc",()=>FM.monteCarlo(P,400)); },
  get TOR(){ return memo("tor",()=>FM.tornado(P,"saldo")); },
  get MAT(){ return memo("mat",()=>FM.impactMatrix(P)); },
  get MAP(){ return memo("map",()=>FM.policyMap(P)); },
  get SAN(){ return memo("san",()=>FM.sanity(P,R,A.TL)); },
  get NG(){ return memo("ng",()=>{ const Q=FM.cloneP(P); Q.guaranteeOn=false; return FM.run(Q); }); },
  get D5(){ return memo("d5",()=>{ const Q=FM.cloneP(P); Q.dayFee=P.dayFee>0?P.dayFee:5; return FM.run(Q); }); }
};
const S={ get P(){return P;}, get R(){return R;}, get MAP(){return A.MAP;}, get TL(){return A.TL;}, get name(){return scenName();}, get MC(){return A.MC;}, get TOR(){return A.TOR;}, get MAT(){return A.MAT;}, get SAN(){return A.SAN;} };
const tgtYear=()=>P.plan.start+P.plan.n-1;

/* ---------- colori dei grafici a schermo ---------- */
const CMAP={"#0B2545":"var(--navy)","#1B2A3A":"var(--ink)","#5E6B78":"var(--gray)","#C9D1D9":"var(--lgray)","#E8ECF0":"var(--xl)","#F4F6F9":"var(--panel)","#1F5FAE":"var(--blue)","#9DBCE3":"var(--lblue)","#E6EEF8":"var(--pblue)","#D0571B":"var(--orange)","#F4CDB8":"var(--lorange)","#1D6B3E":"var(--pos)","#B3261E":"var(--neg)"};
const colorMap=(c,role)=>{ const u=String(c).toUpperCase(); if(u==="#FFFFFF") return role==="text"?"var(--on-bar)":"var(--paper)"; return CMAP[u]; };

let toastT=null; function toast(t){ const el=$("#toast"); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },3200); }

/* ---------- barra superiore e indicatori ---------- */
function renderBadge(){ const b=$("#chkbadge"); const san=A.SAN; const bad=san.filter(x=>x.s==="bad").length, warn=san.filter(x=>x.s==="warn").length; b.hidden=false;
  b.className="badge "+(bad?"bad":warn?"warn":"ok"); b.textContent=bad?(bad===1?"1 verifica non superata":`${bad} verifiche non superate`):warn?(warn===1?"1 verifica da controllare":`${warn} verifiche da controllare`):`${san.length} verifiche superate`; }
function renderKpis(){
  const k=[["Gettito netto al Comune",fM(R.net+R.dayFeeNet),fMs(R.dTax)+" sull'oggi",1],["Saldo strutturale",fM(R.saldo),"dopo il Fondo",1],["Dividendo per famiglia",fE(R.perHH),"all'anno, dopo la riserva"],["Pernottamenti",fPs(R.nChg),n1(R.nNew/1e6)+" mln di notti"],
    ["Visitatori al giorno",fPs(R.vdChg),"escursionisti inclusi"],["Abitazioni ai residenti",fN(R.toRes),fN(R.newRes)+" nuovi residenti"],["Canoni",fPs(R.rentChg),"€"+n2(P.rent*(1+R.rentChg))+"/m² al mese"],["Occupazione netta",fNs(R.jobsNet),fN(R.jobsLost)+" persi, "+fN(R.jobsGained)+" creati"]];
  $("#kpis").innerHTML=k.map((x,i)=>`<div class="kpi" title="Valore annuo a regime (dal ${tgtYear()}), rispetto a oggi"><span class="l">${x[0]}${i===0?` · regime`:""}</span><span class="v${x[3]?" hot":""}">${x[1]}</span><span class="s">${x[2]}</span></div>`).join("");
}

/* ---------- componenti HTML ---------- */
const card=(t,sub,body,cls)=>`<section class="card ${cls||""}"><header><h3>${t}</h3>${sub?`<p>${sub}</p>`:""}</header>${body}</section>`;
const head=(t,sub,right)=>`<div class="phead"><div class="t"><h2>${t}</h2>${sub?`<p>${sub}</p>`:""}</div>${right||""}</div>`;
const ch=(key,label)=>`<div class="chart" data-ch="${key}" data-label="${esc(label||"Grafico")}"></div>`;
function tbl(cols,rows,o){ o=o||{};
  return `<div class="tw"><table class="tbl ${o.cls||""}"><thead><tr>${cols.map(c=>`<th class="${c.a==="l"?"l":""} ${c.cls||""}">${c.h}</th>`).join("")}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="${o.hl&&o.hl.includes(i)?"hl":""}">${r.map((x,j)=>`<td class="${cols[j]&&cols[j].a==="l"?"l":""}${cols[j]&&cols[j].w?" w":""} ${cols[j]&&cols[j].cls||""}">${x}</td>`).join("")}</tr>`).join("")}</tbody>${o.foot?`<tfoot><tr>${o.foot.map(x=>`<td>${x}</td>`).join("")}</tr></tfoot>`:""}</table></div>`; }
const seg=id=>R.segs.find(s=>s.id===id);
const md=s=>s.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");

/* ---------- controlli delle leve ---------- */
const sfx=p=>p.pct?"%":p.unit&&p.unit[0]==="€"?(p.unit==="€ mln/anno"?"€ mln":"€"):"";
const toShow=(p,v)=>p.pct?+(v*100).toFixed(2):v;
function ctl(id){ const p=FM.PMAP[id];
  if(p.bool) return `<label class="sw" for="in-${id}"><input type="checkbox" id="in-${id}" data-p="${id}"><span>${esc(p.label)}${p.hint?`<small>${esc(p.hint)}</small>`:""}</span></label>`;
  return `<div class="ctl"><div class="row"><label for="n-${id}">${esc(p.label)}${p.sym?`<span class="sym">${esc(p.sym)}</span>`:""}</label><span class="nv"><input type="number" id="n-${id}" data-n="${id}" min="${toShow(p,p.min)}" max="${toShow(p,p.max)}" step="${toShow(p,p.step)}"><span class="sfx">${sfx(p)}</span></span></div><input type="range" id="in-${id}" data-p="${id}" min="${p.min}" max="${p.max}" step="${p.step}" aria-label="${esc(p.label)}">${p.hint?`<span class="hint">${esc(p.hint)}</span>`:""}</div>`; }
function syncCtls(){
  FM.LEVER_IDS.forEach(id=>{ const p=FM.PMAP[id], i=$("#in-"+id); if(i){ if(p.bool) i.checked=!!P[id]; else if(document.activeElement!==i) i.value=P[id]; }
    const nv=$("#n-"+id); if(nv&&document.activeElement!==nv) nv.value=toShow(p,P[id]); });
}
function setLever(id,v){ const p=FM.PMAP[id]; if(!p.bool){ if(!isFinite(v)) return; v=Math.max(p.min,Math.min(p.max,v)); } P[id]=v; changed(); }

/* ---------- transitorio ---------- */
const PLAN_LAB={tmin:["Pavimento","€"],alpha:["Aliquota sul prezzo","%"],cap:["Tetto per notte","€"],u30:["Under 30 UE","€"],dayFee:["Contributo escursionisti","€"],fundCommercial:["Fondo: commercio","€ mln"],fundTalent:["Fondo: imprese e talenti","€ mln"],guaranteeOn:["Garanzia sugli affitti",""]};
const TODAY={tmin:"€3,50–8",alpha:"—",cap:"—",u30:"€5",dayFee:"—",fundCommercial:"—",fundTalent:"—",guaranteeOn:"no"};
function planHTML(){
  const n=P.plan.n, st=P.plan.start;
  let h=`<div class="tw"><table class="tbl plan"><thead><tr><th class="l">Leva</th><th>Oggi</th>`;
  for(let y=1;y<n;y++) h+=`<th class="tr">Anno ${y}<small>${st+y-1}</small></th>`;
  h+=`<th class="tgt">Obiettivo<small>dal ${st+n-1}</small></th></tr></thead><tbody>`;
  FM.PLAN_KEYS.forEach(k=>{ const p=FM.PMAP[k], lab=PLAN_LAB[k];
    h+=`<tr><td class="l">${lab[0]}</td><td>${TODAY[k]}</td>`;
    for(let y=1;y<n;y++) h+=`<td class="tr">${p.bool?`<input type="checkbox" data-plan="${k}" data-y="${y}" aria-label="${lab[0]}, anno ${st+y-1}">`:`<input type="number" data-plan="${k}" data-y="${y}" min="${toShow(p,p.min)}" max="${toShow(p,p.max)}" step="${toShow(p,p.step)}" aria-label="${lab[0]}, anno ${st+y-1}"><span class="u">${lab[1]}</span>`}</td>`;
    h+=`<td class="tgt">${p.bool?`<input type="checkbox" data-tg="${k}" aria-label="${lab[0]}, obiettivo">`:`<input type="number" data-tg="${k}" min="${toShow(p,p.min)}" max="${toShow(p,p.max)}" step="${toShow(p,p.step)}" aria-label="${lab[0]}, obiettivo"><span class="u">${lab[1]}</span>`}</td></tr>`; });
  return h+`</tbody></table></div>`;
}
function syncPlan(){
  const n=P.plan.n;
  $$("[data-plan]").forEach(el=>{ const k=el.dataset.plan, y=+el.dataset.y, p=FM.PMAP[k], v=FM.levers(P,y)[k]; if(p.bool) el.checked=!!v; else if(document.activeElement!==el) el.value=toShow(p,v); });
  $$("[data-tg]").forEach(el=>{ const k=el.dataset.tg, p=FM.PMAP[k]; if(p.bool) el.checked=!!P[k]; else if(document.activeElement!==el) el.value=toShow(p,P[k]); });
  $$("#yrs [data-n-years]").forEach(b=>b.setAttribute("aria-pressed",String(+b.dataset.nYears===n)));
  const m=$("#planmode"); if(m){ const o=FM.origin(P);
    m.innerHTML=n===1?`<span class="mode"><span class="dot"></span>La politica è operativa a regime dal ${P.plan.start}: nessun transitorio.</span>`
      :P.plan.custom?`<span class="mode"><span class="dot c"></span>Valori anno per anno personalizzati.</span> <button type="button" class="small" id="planramp">Torna alla rampa lineare</button>`
      :`<span class="mode"><span class="dot"></span>Rampa lineare da oggi all'obiettivo: si parte da un pavimento di €${pv(o.tmin)} (la tariffa media di oggi), senza aliquota né contributo, e il Fondo cresce con il gettito. Modifica una cella per personalizzare.</span>`; }
}
function setPlanCell(k,y,v){
  const p=FM.PMAP[k]; if(!p.bool){ if(!isFinite(v)) return; v=Math.max(p.min,Math.min(p.max,v)); }
  if(!P.plan.custom){ P.plan.rows=FM.rampPlan(P,P.plan.n); P.plan.custom=true; }
  P.plan.rows[k][y-1]=v; changed();
}

/* ---------- contributo d'accesso: come funzionerebbe ---------- */
function dayHow(){
  return `<div class="how"><h4>Come funzionerebbe</h4><dl>
    <dt>Chi paga</dt><dd>Chi entra in città per una visita in giornata senza dormire a Firenze. Si paga una volta per visita, qualunque sia la durata.</dd>
    <dt>Chi è esente</dt><dd>Residenti della Città metropolitana, pendolari per lavoro e studio, minori di 14 anni, persone con disabilità e accompagnatori, chi pernotta a Firenze (paga già l'imposta di soggiorno) e chi dorme nei comuni della cintura che aderiscono all'accordo metropolitano. Nel modello paga il <b id="dh-liable"></b> degli escursionisti.</dd>
    <dt>Come si paga</dt><dd>Prenotazione online con codice QR, come a Venezia; oppure insieme al biglietto del treno o del bus turistico, con il vettore che versa al Comune. I tour operator pagano per i gruppi.</dd>
    <dt>Controlli</dt><dd>Verifiche a campione agli arrivi (Santa Maria Novella, terminal dei bus turistici, parcheggi scambiatori) e nel centro UNESCO, con sanzione per chi è sprovvisto. Nel modello si perde il <b id="dh-evas"></b> del dovuto.</dd>
    <dt>Quando</dt><dd>Nel modello tutto l'anno. Si può limitare ai giorni di maggiore affollamento, come fa Venezia: gettito ed effetto sui flussi si riducono in proporzione.</dd>
    <dt>Il precedente</dt><dd>Venezia applica il contributo dal 2024 nei giorni di picco, dalle 8:30 alle 16: €5 con prenotazione anticipata, €10 negli ultimi giorni. Nel 2025, in 54 giorni, 723.497 paganti e €5,4 mln di incasso; nel 2024 i costi di gestione (circa €3 mln) hanno superato gli incassi.</dd>
    <dt>Base giuridica</dt><dd>Serve una norma nazionale: oggi il contributo è consentito solo a Venezia (art. 1, c. 1129, L. 145/2018, che rinvia all'art. 4, c. 3-bis, del D.Lgs. 23/2011).</dd>
  </dl><div class="figs" id="dayfigs"></div></div>`;
}
function dayFigs(){
  const r=A.D5, on=P.dayFee>0, fee=on?P.dayFee:5;
  const f=[[n2(R.L0/1e6)+" mln","escursionisti soggetti all'anno, su "+n1(R.dayV0/1e6)+" mln"],[n2(r.L1/1e6)+" mln",`visite pagate con €${pv(fee)}`],[fPs(r.L1/r.L0-1),"visite degli escursionisti soggetti"],[fM(r.dayFeeNet),"gettito netto all'anno"],[fPs(r.vdChg),"visitatori al giorno, con l'imposta di soggiorno scelta"]];
  $("#dh-liable").textContent=fP(P.dayLiable,0); $("#dh-evas").textContent=fP(P.dayEvasion,0);
  $("#dayfigs").innerHTML=(on?"":`<p class="hint" style="grid-column:1/-1">Contributo non attivo. Stima con €5 a visita:</p>`)+f.map(x=>`<div class="fig"><span class="v">${x[0]}</span><span class="l">${x[1]}</span></div>`).join("");
}
function fundFigs(){
  const ng=A.NG;
  const f=[[fM(R.fund),"Fondo a regime, all'anno"],[fM(R.fGuar),`garanzia sugli affitti: ${P.guaranteeOn?fNs(R.units-ng.units)+" appartamenti riconvertiti in più":"disattivata"}`],[fM(R.fTrainTotal),`riqualificazione una tantum per ${fN(R.jobsLost*P.trainCoverage)} lavoratori`],[fM(R.fComm+R.fTalent),"commercio, imprese e talenti, all'anno"]];
  $("#fundfigs").innerHTML=f.map(x=>`<div class="fig"><span class="v">${x[0]}</span><span class="l">${x[1]}</span></div>`).join("");
}
function polFigs(){
  const tl=A.TL, y1=tl.years[0], yt=tl.years.find(x=>x.y===tl.n), yl=tl.years[tl.years.length-1];
  const rows=[["Gettito netto al Comune",r=>fM(r.net+r.dayFeeNet)],["Saldo dopo il Fondo",r=>fM(r.saldo)],["Dividendo per famiglia",r=>fE(r.perHH)],["Pernottamenti",r=>fPs(r.nChg)],["Visitatori al giorno",r=>fPs(r.vdChg)],["Appartamenti riconvertiti",r=>fN(r.units)],["Canoni",r=>fPs(r.rentChg)],["Occupazione netta",r=>fNs(r.jobsNet)]];
  const cols=[{h:"",a:"l"},{h:"Primo anno<br>"+y1.year},...(tl.n>1?[{h:"Obiettivo<br>"+yt.year}]:[]),{h:"Ultimo anno<br>"+yl.year},{h:"A regime<br>&nbsp;"}];
  $("#polfigs").innerHTML=tbl(cols,rows.map(r=>[r[0],r[1](y1.R),...(tl.n>1?[r[1](yt.R)]:[]),r[1](yl.R),`<b>${r[1](R)}</b>`]))+`<p class="hint">Saldo cumulato in ${tl.H} anni: <b>${fM(yl.saldoCum)}</b>; dividendo erogato: <b>${fM(yl.divCum)}</b>; riserva accantonata: <b>${fM(yl.reserveCum)}</b>.</p>`;
}
function pgPol(){
  const n=P.plan.n;
  return head("La politica",`Scegli l'imposta, il contributo per gli escursionisti e il Fondo Armonizzatore che vuoi raggiungere, poi il percorso per arrivarci. Tutto il resto del modello è fissato sui dati (pagina «Ipotesi»).`,`<button type="button" class="small" id="polreset">Ripristina la proposta di base</button>`)
   +`<div class="gpol">`
   +card("Imposta di soggiorno","Imposta per notte e per persona = max(pavimento; aliquota × prezzo), entro il tetto. Minori e notti oltre la settima restano esenti.",ctl("tmin")+ctl("alpha")+ctl("cap")+ctl("u30")+ch("taxmini","Imposta per notte"))
   +card("Contributo d'accesso per gli escursionisti","Chi visita la città in giornata oggi non paga nulla, ma è circa un terzo delle presenze di un giorno medio.",ctl("dayFee")+dayHow())
   +card("Fondo Armonizzatore","Finanziato dal maggior gettito, accompagna chi perde dalla riforma e sostiene il ritorno delle case ai residenti.",ctl("fundCommercial")+ctl("fundTalent")+ctl("guaranteeOn")+ctl("trainCoverage")+ctl("trainCost")+`<div class="figs" id="fundfigs"></div>`)
   +`</div>`
   +card("Transitorio: come si arriva all'obiettivo",`La politica non deve essere operativa a regime dal primo giorno: scegli in quanti anni raggiungere l'obiettivo e i valori di ciascun anno. Dall'anno dell'obiettivo in poi valgono i valori della colonna evidenziata.`,
      `<div class="phead" style="align-items:center"><div class="yrs" id="yrs" role="group" aria-label="Anni per arrivare all'obiettivo"><span class="hint" style="margin-right:6px">Anni per arrivare all'obiettivo</span>${Array.from({length:FM.PLAN_MAX},(_,i)=>`<button type="button" data-n-years="${i+1}" aria-pressed="${i+1===n}">${i+1}</button>`).join("")}</div><label class="hint" style="display:flex;gap:8px;align-items:center">Primo anno <input type="number" id="planstart" min="2025" max="2040" step="1" style="width:76px"></label></div><div id="planwrap">${planHTML()}</div><div id="planmode"></div>`)
   +`<div class="g2">`+card("Il percorso anno per anno","€ milioni. Barre: saldo dopo il Fondo; linea: gettito netto al Comune. In grigio gli anni del transitorio; la linea tratteggiata è il gettito di oggi.",ch("poltrend","Percorso anno per anno"))+card("Dal primo anno al regime","Il regime è l'equilibrio di lungo periodo con i valori obiettivo.",`<div id="polfigs"></div>`)+`</div>`;
}
function updPol(){ syncCtls(); syncPlan(); dayFigs(); fundFigs(); polFigs(); const ps=$("#planstart"); if(ps&&document.activeElement!==ps) ps.value=P.plan.start; }
function bindPol(){
  const pg=$("#page");
  pg.oninput=e=>{ const t=e.target;
    if(t.dataset.n){ const p=FM.PMAP[t.dataset.n]; let v=parseFloat(t.value); if(!isFinite(v)) return; if(p.pct) v/=100; setLever(p.id,v); return; }
    if(t.dataset.p){ const p=FM.PMAP[t.dataset.p]; if(p.bool) return; setLever(p.id,parseFloat(t.value)); return; }
    if(t.dataset.tg){ const p=FM.PMAP[t.dataset.tg]; if(p.bool) return; let v=parseFloat(t.value); if(!isFinite(v)) return; if(p.pct) v/=100; setLever(p.id,v); return; }
    if(t.dataset.plan){ const p=FM.PMAP[t.dataset.plan]; if(p.bool) return; let v=parseFloat(t.value); if(!isFinite(v)) return; if(p.pct) v/=100; setPlanCell(p.id,+t.dataset.y,v); return; }
    if(t.id==="planstart"){ const v=parseInt(t.value,10); if(v>=2025&&v<=2040){ P.plan.start=v; rerenderPlan(); changed(); } } };
  pg.onchange=e=>{ const t=e.target;
    if(t.type==="checkbox"){ if(t.dataset.p) setLever(t.dataset.p,t.checked); else if(t.dataset.tg) setLever(t.dataset.tg,t.checked); else if(t.dataset.plan) setPlanCell(t.dataset.plan,+t.dataset.y,t.checked); return; }
    if(t.dataset.n||t.dataset.tg||t.dataset.plan) syncCtls(),syncPlan(); };
  pg.onclick=e=>{ const b=e.target.closest("button"); if(!b) return;
    if(b.dataset.nYears){ FM.resizePlan(P,+b.dataset.nYears); rerenderPlan(); changed(); }
    else if(b.id==="planramp"){ P.plan.custom=false; P.plan.rows=null; changed(); toast("Rampa lineare ripristinata"); }
    else if(b.id==="polreset"){ const d=FM.defaults(); FM.LEVER_IDS.forEach(id=>P[id]=d[id]); P.plan=d.plan; META.name=""; rerenderPlan(); changed(); toast("Proposta di base ripristinata"); } };
}
function rerenderPlan(){ const w=$("#planwrap"); if(w) w.innerHTML=planHTML(); }

/* ---------- grafici (gli stessi della presentazione) ---------- */
const evoKeys={};
const CH={
  tax:(c,w)=>{ const h=Math.round(Math.max(300,Math.min(460,w*.46))); K.taxFunction(c,0,0,w,h,S); return h; },
  taxmini:(c,w)=>{ const h=Math.round(Math.max(240,Math.min(320,w*.62))); K.taxFunction(c,0,0,w,h,S); return h; },
  poltrend:(c,w)=>{ const tl=A.TL, h=300; K.trend(c,0,0,w,h,{labels:tl.years.map(y=>y.year),shade:tl.n-1,series:[{type:"bar",v:tl.years.map(y=>y.R.saldo/1e6),color:C.blue,name:"Saldo dopo il Fondo"},{v:tl.years.map(y=>(y.R.net+y.R.dayFeeNet)/1e6),color:C.navy,name:"Gettito netto al Comune"}],base:P.baseRevenue,legend:true,fmt:v=>n1(v)}); return h; },
  nights:(c,w)=>K.hBarPairs(c,0,0,w,R.segs.map(s=>({label:s.short,a:s.nB/1e6,b:s.nN/1e6,tag:fPs(s.chg),tagColor:s.chg<0?C.orange:C.blue})),{labelW:Math.min(160,w*.26),valW:Math.min(120,w*.2),rowH:54,bh:14,fmt:v=>n2(v)}),
  eff:(c,w)=>K.hBarPairs(c,0,0,w,R.segs.map(s=>({label:s.short,a:s.effOld,b:s.effNew})),{labelW:Math.min(160,w*.26),valW:70,rowH:54,bh:14,fmt:v=>fP(v,1),max:Math.max(...R.segs.map(s=>Math.max(s.effOld,s.effNew)))*1.05}),
  load:(c,w)=>K.visitorBars(c,0,0,w,S),
  wf:(c,w)=>{ const h=Math.round(Math.max(340,Math.min(440,w*.4))); K.waterfall(c,34,6,w-40,h-6,K.pnlSteps(R),{labH:64,fmt:v=>n1(v),fmtS:v=>(v>=0?"+":MIN)+n1(Math.abs(v)),axisFmt:v=>n0(v)}); return h; },
  alloc:(c,w)=>{ const keys=String(P.order).split(","); const nm={irpef:"Addizionale IRPEF",tari:"TARI domestica",tpl:"Trasporto pubblico"}; return K.hBarPairs(c,0,0,w,keys.map(k=>({label:nm[k],a:R.alloc[k].cost/1e6,b:R.alloc[k].paid/1e6,tag:fP(R.alloc[k].cov,0),tagColor:R.alloc[k].cov>=.995?C.blue:C.orange})),{labelW:Math.min(150,w*.3),valW:70,rowH:58,bh:14,fmt:v=>n1(v)}); },
  stake:(c,w)=>{ const h=K.diverging(c,0,0,w,K.stakeGroups(R),{labelW:Math.min(260,w*.42),rowH:29,gh:26}); return h+4; },
  dwl:(c,w)=>{ const rows=R.segs.map(s=>({label:s.short,v:s.dwl/1e6,color:s.dwl>0?C.orange:C.blue})); if(R.dwlDay>1e4) rows.push({label:"Escursionisti",v:R.dwlDay/1e6,color:C.orange}); return K.hBars(c,0,0,w,rows,{labelW:Math.min(150,w*.3),valW:70,rowH:40,bh:20,fmt:v=>(v<0?MIN:"")+n1(Math.abs(v))}); },
  ops:(c,w)=>{ const h=330; K.columns(c,34,0,w-40,h,[{label:"Albergatori",v:R.dPiHotel/1e6},{label:"Affitti brevi: chi resta",v:R.llStay/1e6},{label:"Affitti brevi: chi converte",v:R.llSwitch/1e6},{label:"Ristorazione e commercio",v:R.dPiComp/1e6}],{fmt:v=>(v>=0?"+":MIN)+n1(Math.abs(v)),axisFmt:v=>n0(v),labH:60,maxBw:76}); return h; },
  dens:(c,w)=>{ const h=340; K.densityR(c,0,0,w,h,S); return h; },
  jobs:(c,w)=>{ const h=340; K.columns(c,40,0,w-46,h,[{label:"Posti persi nel turismo",v:-R.jobsLost},{label:"Dividendo speso in città",v:R.pool*P.mpcRes/1e6*P.jobsPerMRes},{label:"Nuovi residenti",v:R.newRes*P.newResSpend/1e6*P.jobsPerMRes},{label:"Spesa del Fondo",v:(R.fComm+R.fTalent)/1e6*P.jobsPerMRes},{label:"Saldo netto",v:R.jobsNet,c:C.navy}],{fmt:v=>(v>=0?"+":MIN)+n0(Math.abs(v)),axisFmt:v=>n0(v),labH:62,maxBw:70}); return h; },
  frontier:(c,w)=>{ const h=Math.round(Math.max(340,Math.min(480,w*.5))); K.frontier(c,0,0,w,h,S); return h; },
  tornado:(c,w)=>K.tornadoChart(c,0,0,w,K.tornadoRows(A.TOR),{labelW:Math.min(230,w*.34),rowH:36})+6,
  evo:(c,w,el)=>{ const d=K.evoDefs(S).find(x=>x.key===el.dataset.k); const h=Math.round(Math.max(230,Math.min(300,w*.62))); K.trend(c,0,0,w,h,d.o); return h; }
};
const CHMIN={wf:700,ops:440,jobs:480,tax:540,taxmini:300,frontier:500,stake:500,tornado:480,dens:440,load:480,poltrend:420,evo:300};
function paintCharts(){
  $$("[data-ch]").forEach(el=>{ const f=CH[el.dataset.ch]; if(!f) return; const w=Math.max(CHMIN[el.dataset.ch]||380,Math.floor(el.clientWidth)||380); const so=new FMD.SvgOut(colorMap); const c=new FMD.Canvas(so); let h=0; try{ h=f(c,w,el); }catch(e){ console.error(el.dataset.ch,e); } el.innerHTML=so.region(w,Math.max(40,h),el.dataset.label); });
}

/* ---------- pagine dei risultati ---------- */
const GO=id=>`data-go="${id}"`;
function pgEvo(){
  const tl=A.TL, ys=tl.years, defs=K.evoDefs(S);
  const yc=ys.map(y=>({h:String(y.year),cls:y.y<tl.n?"tr":""}));
  const row=(l,f,b)=>[b?`<b>${l}</b>`:l,...ys.map(y=>f(y))];
  const rows=[
    row("Pavimento / aliquota",y=>"€"+pv(y.L.tmin)+" / "+pv(y.L.alpha*100)+"%"),
    row("Contributo escursionisti",y=>y.L.dayFee>0?"€"+pv(y.L.dayFee):"—"),
    row("Gettito netto al Comune",y=>fM(y.R.net+y.R.dayFeeNet),1),
    row("Maggior gettito netto",y=>fMs(y.R.dTax)),
    row("Spesa del Fondo Armonizzatore",y=>fM(y.R.fund)),
    row("Saldo dopo il Fondo",y=>fM(y.R.saldo),1),
    row("Dividendo per famiglia",y=>fE(y.R.perHH),1),
    row("Riserva cumulata",y=>fM(y.reserveCum)),
    row("Pernottamenti (mln)",y=>n2(y.R.nNew/1e6)),
    row("Variazione dei pernottamenti",y=>fPs(y.R.nChg)),
    row("Escursionisti (mln)",y=>n2(y.R.dayV1/1e6)),
    row("Visitatori al giorno (mila)",y=>n1(y.R.vdN/365/1e3)),
    row("Appartamenti riconvertiti",y=>fN(y.R.units)),
    row("Nuovi residenti netti",y=>fN(y.R.newRes)),
    row("Canone (€/m² al mese)",y=>n2(P.rent*(1+y.R.rentChg))),
    row("Variazione dei canoni",y=>fPs(y.R.rentChg)),
    row("Prezzo delle case (€/m²)",y=>fN(P.price*(1+y.R.priceChg))),
    row("Posti persi nel turismo",y=>fN(y.R.jobsLost)),
    row("Posti creati dalla domanda locale",y=>fN(y.R.jobsGained)),
    row("Occupazione netta",y=>fNs(y.R.jobsNet),1)];
  const last=ys[ys.length-1];
  return head("Evoluzione nel tempo",`Anno per anno dal ${tl.start} al ${tl.start+tl.H-1}, rispetto a oggi e a parità di altre condizioni. ${tl.n>1?`In grigio i ${tl.n-1} anni di transitorio; dal ${tl.start+tl.n-1} valgono i valori obiettivo.`:"La politica è a regime dal primo anno."} Domanda e mercato abitativo si adeguano con ritardo.`)
   +`<div class="g4">`+defs.map(d=>card(d.title,d.unit,`<div class="chart" data-ch="evo" data-k="${d.key}" data-label="${esc(d.title)}"></div>`)).join("")+`</div>`
   +card("Tabella anno per anno",`Cumulato in ${tl.H} anni: saldo ${fM(last.saldoCum)}, dividendo erogato ${fM(last.divCum)}, riserva ${fM(last.reserveCum)}.`,tbl([{h:"",a:"l"},...yc],rows));
}
function effects(){
  const avgOld=P.baseRevenue*1e6/(P.totalNights*1e6*(1-P.minorShare)), avgNew=R.G/(R.nNew*(1-P.minorShare));
  const opsD=R.dPiHotel+R.strLandlords+R.dPiComp;
  const f=[
    {t:"Imposta media per notte",v:"€"+n2(avgNew),d:"oggi €"+n2(avgOld),dir:avgNew-avgOld,go:"tour"},
    {t:"Gettito lordo dell'imposta",v:fM(R.G),d:fMs(R.G-R.base)+" sull'oggi",dir:R.G-R.base,go:"bud"},
    {t:"Pernottamenti",v:fPs(R.nChg),d:n1(R.nNew/1e6)+" mln di notti",dir:R.nChg,go:"tour"},
    {t:"Surplus dei turisti",v:fMs(R.cs),d:"maggior costo e minore consumo",dir:R.cs,go:"who"}];
  const s=[
    {t:"Margini degli operatori",v:fMs(opsD),d:"alberghi, affitti brevi, commercio",dir:opsD,go:"casa"},
    {t:"Appartamenti riconvertiti",v:fN(R.units),d:fP(R.share,1)+" dello stock",dir:R.units,go:"casa"},
    {t:"Spesa turistica",v:fMs(R.dSpend),d:"valore aggiunto "+fMs(R.vaChg),dir:R.dSpend,go:"lab"},
    {t:"Occupazione netta",v:fNs(R.jobsNet),d:fN(R.jobsLost)+" persi, "+fN(R.jobsGained)+" creati",dir:R.jobsNet,go:"lab"},
    {t:"Visitatori al giorno",v:fPs(R.vdChg),d:"escursionisti inclusi",dir:R.vdChg,go:"tour"}];
  const t=[
    {t:"Canoni e prezzi",v:fPs(R.rentChg),d:"prezzi "+fPs(R.priceChg),dir:R.rentChg,go:"casa"},
    {t:"Nuovi residenti",v:fNs(R.newRes),d:"in "+fN(R.toRes)+" abitazioni",dir:R.newRes,go:"casa"},
    {t:"Comuni della cintura",v:fMs(R.beltTaxRev+R.beltProfit),d:fMn(R.belt)+" di notti spostate",dir:1,go:"who"},
    {t:"Saldo del Comune",v:fM(R.saldo),d:"dopo il Fondo",dir:R.saldo,go:"bud"},
    {t:"Dividendo per famiglia",v:fE(R.perHH),d:"all'anno, dopo la riserva",dir:R.perHH,go:"bud"},
    {t:"Costo su non residenti",v:fP(R.nonResShare,0),d:"residenti: "+fMs(R.residentsNet),dir:0,go:"who"}];
  return [f,s,t];
}
function pgOver(){
  const [f,s,t]=effects(), tl=A.TL;
  const col=(h,sub,list)=>`<div class="fxcol"><h4>${h}<small>${sub}</small></h4>${list.map(x=>`<button type="button" class="fxc ${x.dir>0?"up":x.dir<0?"dn":""}" ${GO(x.go)}><span class="t">${x.t}</span><span class="v">${x.v}</span><span class="d">${x.d}</span></button>`).join("")}</div>`;
  const lux=seg("lux"),mass=seg("mass");
  const read=[
    `**Imposta.** max(€${pv(P.tmin)}; ${pv(P.alpha*100)}% del prezzo)${P.cap>0?", tetto €"+pv(P.cap):""}; under 30 UE ${P.u30>0?"€"+pv(P.u30)+" a notte":"esenti"}${P.dayFee>0?`; €${pv(P.dayFee)} per escursionista`:""}. Obiettivo dal ${tgtYear()}${tl.n>1?` dopo ${tl.n-1} anni di transitorio`:""}.`,
    `**Gettito.** Lordo ${fM(R.G)}, netto per il Comune ${fM(R.net+R.dayFeeNet)} (${fMs(R.dTax)} sull'oggi).`,
    `**Domanda.** Pernottamenti ${fPs(R.nChg)}: mass-market ${fPs(mass.chg)}, lusso ${fPs(lux.chg)}. Visitatori al giorno ${fPs(R.vdChg)}.`,
    `**Operatori e case.** Margini ${fMs(R.dPiHotel+R.strLandlords+R.dPiComp)}; ${fN(R.units)} appartamenti convertono; canoni ${fPs(R.rentChg)}, prezzi ${fPs(R.priceChg)}.`,
    `**Comune.** Saldo ${fM(R.saldo)} dopo ${fM(R.fund)} di Fondo; dividendo ${fE(R.perHH)} a famiglia.`,
    `**Lavoro.** ${fN(R.jobsLost)} posti a rischio, ${fN(R.jobsGained)} ricreati dalla domanda locale.`,
    `**Incidenza.** ${fP(R.nonResShare,0)} del costo su non residenti; effetto netto sui residenti ${fMs(R.residentsNet)}.`].map(x=>`<li>${md(x)}</li>`).join("");
  return head("Panoramica a regime",`Effetti annui quando la politica è a regime (dal ${tgtYear()}) e domanda e mercato abitativo si sono adeguati. Clicca su una cartella per il dettaglio.`)
   +card("Mappa degli effetti","Il colore indica il segno dell'effetto: blu aumenta, arancione diminuisce.",`<div class="fx">${col("Primo ordine","prezzi e gettito, entro pochi mesi",f)}${col("Secondo ordine","mercati e lavoro, 1–3 anni",s)}${col("Terzo ordine","città e conti pubblici, 3–10 anni",t)}</div>`)
   +`<div class="g2">`+card("Chi paga e chi riceve","Variazione annua a regime, € milioni.",ch("stake","Chi paga e chi riceve"))+card("Lettura della proposta","",`<ul class="read">${read}</ul>`)+`</div>`;
}
function pgTour(){
  const rows=R.segs.map(s=>[esc(s.short),fE2(s.tOld),s.exempt?"esente":fE2(s.tAvg),fP(s.effOld,1),fP(s.effNew,1),fMn(s.nB),fMn(s.nN),fPs(s.chg),fMn(s.beltN),fM(s.cs),fM(s.dwl)]);
  return head("Turismo","Imposta, presenze e carico sulla città a regime.")
   +`<div class="g2">`+card("L'imposta per notte","Linea scura: obiettivo; tratteggi: anni del transitorio. Cerchi vuoti: tariffa attuale al prezzo mediano di ciascuna tipologia; pieni: proposta.",ch("tax","Imposta per notte"))
   +card("Carico sulla città","Visitatori presenti in un giorno medio, in migliaia."+(P.dayFee>0?` Il contributo d'accesso di €${pv(P.dayFee)} frutta ${fM(R.dayFeeNet)}.`:" Gli escursionisti non pagano l'imposta di soggiorno: per ridurli serve il contributo d'accesso (pagina «Politica»)."),ch("load","Visitatori in un giorno medio"))+`</div>`
   +card("Che cosa paga ciascuna tipologia","Aliquota effettiva = imposta ÷ (prezzo + imposta).",tbl([{h:"Tipologia",a:"l"},{h:"Imposta oggi"},{h:"Imposta dopo"},{h:"Aliquota oggi"},{h:"Aliquota dopo"},{h:"Notti oggi"},{h:"Notti dopo"},{h:"Δ notti"},{h:"Verso la cintura"},{h:"Surplus"},{h:"Perdita"}],rows,{foot:["Totale","","","","",fMn(R.nB),fMn(R.nNew),fPs(R.nChg),fMn(R.belt),fM(R.cs),fM(R.dwl)]}))
   +`<div class="g2 even">`+card("Pernottamenti per tipologia","Milioni di notti all'anno: oggi (grigio) e a regime (blu).",ch("nights","Pernottamenti per tipologia"))+card("Aliquota effettiva","Imposta in % del prezzo: oggi (grigio) e a regime (blu).",ch("eff","Aliquota effettiva"))+`</div>`;
}
function pgCasa(){
  const per=-R.ownerWealth/Math.max(1,R.ownerHomes);
  return head("Casa e operatori","Margini di alberghi, affitti brevi e commercio; riconversione degli appartamenti e mercato degli affitti a regime. L'evoluzione anno per anno è nella pagina «Evoluzione».")
   +`<div class="g2">`+card("Margini degli operatori","Variazione annua, € milioni.",ch("ops","Margini degli operatori"))
   +card("Quanto pesa","",tbl([{h:"Gruppo",a:"l"},{h:"Base"},{h:"Variazione"},{h:"%"}],[["Albergatori",fM(R.hotelBaseProfit),fMs(R.dPiHotel),fPs(R.dPiHotel/R.hotelBaseProfit,1)],["Affitti brevi",fM(R.strNoiBase),fMs(R.strLandlords),fPs(R.strLandlords/R.strNoiBase,1)],["Ristorazione e commercio",fM(R.compBase),fMs(R.dPiComp),fPs(R.dPiComp/R.compBase,1)]]))+`</div>`
   +`<div class="g2">`+card("Affitti brevi e conversioni","Premio R dell'affitto breve rispetto alla locazione: in arancione chi passa al lungo termine.",ch("dens","Distribuzione del premio R"))
   +card("Mercato abitativo","",tbl([{h:"Indicatore",a:"l"},{h:"Valore"},{h:"Variazione"}],[["Appartamenti riconvertiti",fN(R.units),fP(R.share,1)+" dello stock"],["…che vanno a residenti",fN(R.toRes),""],["Nuovi residenti netti",fN(R.newRes),fN(R.newResGross)+" occupanti"],["Canone","€"+n2(P.rent*(1+R.rentChg))+"/m²",fPs(R.rentChg)],["Risparmio per famiglia in affitto",fE(-R.rentChg*R.annualRent)+"/anno",""],["Prezzo","€"+fN(P.price*(1+R.priceChg))+"/m²",fPs(R.priceChg)],["Reddito dei proprietari di affitti brevi",fMs(R.strLandlords),fPs(R.strLandlords/R.strNoiBase,1)]])
     +`<p class="note">Il calo dei prezzi (${fPs(R.priceChg)}) è una perdita cartacea per le ${fN(R.ownerHomes)} famiglie proprietarie: circa <b>${fE(per)}</b> a famiglia. Si realizza solo con la vendita e migliora l'accesso di giovani e lavoratori.</p>`)+`</div>`;
}
function pgBud(){
  const tariHH=P.tariDomBase*1e6/P.households, irpefHH=P.incomeNew*P.irpefRate;
  const irpef=irpefHH*R.alloc.irpef.cov, tari=tariHH*R.alloc.tari.cov, tpl=2*P.passPrice*R.alloc.tpl.cov, rent=-R.rentChg*R.annualRent;
  const ng=A.NG;
  return head("Bilancio e dividendo","Conto economico del Comune a regime: dal maggior gettito al saldo che finanzia il dividendo civico.")
   +card("Dal gettito al saldo strutturale","€ milioni all'anno a regime. Il saldo è dopo il Fondo Armonizzatore e prima della riserva.",ch("wf","Cascata del conto economico"))
   +`<div class="g3">`+card("Dividendo civico",`Disponibile ${fM(R.pool)} (${fE(R.perHH)} per famiglia, ${fE(R.pool/P.residents)} per residente).`,ch("alloc","Copertura degli sgravi"))
   +card("Famiglia tipo","Due adulti in affitto in 70 m², un reddito da €40.000.",tbl([{h:"Beneficio",a:"l"},{h:"€ all'anno"}],[["Addizionale IRPEF risparmiata",fE(irpef)],["TARI risparmiata (bolletta media "+fE(tariHH)+")",fE(tari)],["Due abbonamenti al trasporto pubblico",fE(tpl)],["Canone più basso, al rinnovo",fE(rent)]],{foot:["Totale",fE(irpef+tari+tpl+rent)]}))
   +card("Fondo Armonizzatore",`${P.guaranteeOn?"Con":"Senza"} la garanzia si riconvertono ${fN(R.units)} appartamenti; ${P.guaranteeOn?"senza":"con"} sarebbero ${fN(ng.units)}.`,tbl([{h:"Linea",a:"l"},{h:"€ mln/anno"}],[["Riconversione commerciale",n1(R.fComm/1e6)],["Garanzia sugli affitti",n1(R.fGuar/1e6)],["Imprese e talenti",n1(R.fTalent/1e6)],["Riqualificazione dei lavoratori (una tantum, quando i posti si perdono)",n1(R.fTrainTotal/1e6)]],{foot:["Fondo a regime (senza la parte una tantum)",n1((R.fComm+R.fGuar+R.fTalent)/1e6)]}))+`</div>`;
}
function pgWho(){
  return head("Chi paga e chi riceve","Incidenza della riforma a regime tra turisti, operatori, proprietari, inquilini, Comune e Stato.")
   +`<div class="g2">`+card("Chi paga e chi riceve","Variazione annua a regime, € milioni. Ipotesi: il "+fP(P.resShareOps,0)+" di gestori e proprietari risiede a Firenze.",ch("stake","Chi paga e chi riceve"))
   +`<div style="display:grid;gap:16px;min-width:0">`+card("Incidenza ed efficienza","",tbl([{h:"Indicatore",a:"l"},{h:"Valore"}],[["Costo su non residenti",fP(R.nonResShare,0)],["Effetto netto per i residenti",fMs(R.residentsNet)+" ("+fE(R.residentsNet/P.residents)+" a testa)"],["Somma degli effetti monetari",fMs(R.netMonetary)],["Perdita di efficienza",fM(R.dwl)],["Costo di un euro raccolto",isFinite(R.mcpf)?n2(R.mcpf)+" euro":"n.d. (il prelievo non aumenta)"],["Maggior gettito riscosso",fM(R.publicRaised)]]))
     +card("Perdita di efficienza per tipologia","€ milioni all'anno. Un valore negativo è un guadagno.",ch("dwl","Perdita di efficienza"))+`</div></div>`;
}
function pgLab(){
  const tl=A.TL, payback=R.saldo>0?((R.naspiCost+R.fTrainTotal)/(R.saldo/12)):NaN;
  const ys=tl.years, rows=[["Posti persi (cumulati)",...ys.map(y=>fN(y.R.jobsLost))],["Posti creati",...ys.map(y=>fN(y.R.jobsGained))],["Riqualificazione nell'anno (€ mln)",...ys.map(y=>n1(y.R.fTrain/1e6))]];
  return head("Lavoro","Posti persi nel turismo, posti creati dalla domanda locale e costi di transizione.")
   +`<div class="g2">`+card("Occupazione a regime","Posti di lavoro.",ch("jobs","Occupazione a regime"))
   +card("Costi di transizione una tantum","€ milioni, distribuiti negli anni in cui i posti si perdono.",tbl([{h:"Voce",a:"l"},{h:"€ mln"}],[["Salari persi durante la disoccupazione",n1(R.wagesLostGross/1e6)],["…coperti dall'indennità (NASpI, Stato)",n1(R.naspiCost/1e6)],["…a carico dei lavoratori",n1(R.workersLoss/1e6)],["Riqualificazione (Fondo Armonizzatore)",n1(R.fTrainTotal/1e6)]],{foot:["Costo pubblico una tantum",n1((R.naspiCost+R.fTrainTotal)/1e6)]})+`<p class="note">Equivale a ${isFinite(payback)?"<b>"+n1(payback)+" mesi</b>":"molti mesi"} di saldo strutturale. I posti persi sono a bassa qualifica (retribuzione ${fE(P.wageTourism)}); la domanda locale ne ricrea una parte.</p>`)+`</div>`
   +card("Anno per anno","Con il transitorio le perdite si distribuiscono nel tempo e la riqualificazione segue.",tbl([{h:"",a:"l"},...ys.map(y=>({h:String(y.year),cls:y.y<tl.n?"tr":""}))],rows));
}
function pgRisk(){
  const mc=A.MC, mat=A.MAT;
  const f=(k,fn)=>[fn(mc[k].p10),fn(mc[k].p50),fn(mc[k].p90)];
  const mrows=[["Saldo",...f("saldo",fM)],["Gettito netto aggiuntivo",...f("dTax",fM)],["Pernottamenti",...f("nChg",v=>fPs(v))],["Abitazioni ai residenti",...f("toRes",fN)],["Canoni",...f("rentChg",v=>fPs(v))],["Dividendo per famiglia",...f("perHH",fE)],["Occupazione netta",...f("jobsNet",fNs)],["Costo su non residenti",...f("nonResShare",v=>fP(v,0))]];
  const mx=mat.cols.map((_,j)=>Math.max(1e-9,...mat.rows.map(r=>Math.abs(r.cells[j]))));
  const hrow=mat.rows.map((r,i)=>`<tr class="${i>0&&r.g!==mat.rows[i-1].g?"sep":""}"><td class="l">${esc(r.label)} <span class="hint">(${r.isAbs?"+"+pv(r.deltaLabel):"+10%"})</span></td>${r.cells.map((v,j)=>{ const t=Math.abs(v)/mx[j]; const bg=Math.abs(v)<1e-9?"transparent":`color-mix(in srgb, var(${v>=0?"--blue":"--orange"}) ${Math.round(12+60*Math.sqrt(t))}%, transparent)`; const d=mat.cols[j].d; const tx=Math.abs(v)<1e-9?"0":(v>=0?"+":MIN)+(Math.abs(v)<10&&d<1?n1(Math.abs(v)):[n0,n1,n2][Math.min(2,d)](Math.abs(v))); return `<td class="c" style="background:${bg}">${tx}</td>`; }).join("")}</tr>`).join("");
  return head("Rischi e incertezza","Quanto sono robusti i risultati a regime rispetto alle ipotesi più incerte, e come si muovono al variare delle leve.")
   +`<div class="g2">`+card("Che cosa muove il saldo","Ogni barra varia una sola ipotesi tra i valori indicati.",ch("tornado","Sensibilità del saldo"))
   +card("Intervallo di incertezza",`${mc.n} estrazioni delle ipotesi più incerte (seme fisso). Il saldo è negativo in ${n0(mc.saldo.neg*mc.n)} casi.`,tbl([{h:"Grandezza",a:"l"},{h:"P10"},{h:"Mediana"},{h:"P90"}],mrows))+`</div>`
   +`<div class="g2">`+card("Mappa delle scelte",`Saldo e riduzione delle presenze per ${A.MAP.pts.length} coppie di pavimento e aliquota; in arancione l'obiettivo, con i cerchi vuoti gli anni del transitorio.`,ch("frontier","Mappa delle scelte"))
   +card("Matrice degli effetti","Variazione di ciascun risultato per un aumento del 10% (o dell'importo indicato). In alto le leve, in basso le ipotesi di mercato. Blu: aumenta; arancione: diminuisce.",`<div class="tw"><table class="tbl heat"><thead><tr><th class="l">Leva o ipotesi</th>${mat.cols.map(c=>`<th>${esc(c.label)}<br><span class="hint">${esc(c.unit)}</span></th>`).join("")}</tr></thead><tbody>${hrow}</tbody></table></div>`)+`</div>`;
}
const KIND={dato:"cifra pubblicata da una fonte ufficiale o di stampa",stima:"valore derivato da dati",letteratura:"valore tratto da studi empirici",regola:"scelta di disegno della proposta",ipotesi:"scelta del modello, coperta dall'analisi di incertezza"};
function srcLinks(src){ if(!src) return "—"; return (Array.isArray(src)?src:[src]).map(k=>{ const i=FM.SRCI[k], s=FM.SRC[i-1]; return s?`<a href="${esc(s[2])}" target="_blank" rel="noopener" title="${esc(s[1])}">[${i}]</a>`:""; }).join(" "); }
function pgIp(){
  const segRows=P.segs.map(s=>[esc(s.name),fP(s.share,0),"€"+n0(s.price),n2(s.sigma),n2(s.eps).replace("-",MIN),"€"+n2(s.tOld),fP(s.belt,0),fP(s.apt,0),"€"+n0(s.spend)]);
  const groups=FM.GROUPS.map(g=>{ const list=FM.PARAMS.filter(p=>p.g===g.id); if(!list.length) return "";
    return card(esc(g.title),esc(g.intro),tbl([{h:"Ipotesi",a:"l"},{h:"Valore"},{h:"Tipo",a:"l"},{h:"Fonte",a:"l"},{h:"Come è stata ricavata",a:"l",w:1}],list.map(p=>[esc(p.label),`<span class="v">${esc(K.fmtParam(p,P[p.id]))}</span>`,`<span class="tag ${p.kind}">${p.kind}</span>`,srcLinks(p.src),esc(p.note||"")]),{cls:"atbl"})); }).join("");
  const cal=A.SAN.slice(0,9);
  return head("Ipotesi del modello",`Le ipotesi sono fisse: sono ricavate dai dati disponibili e calibrate in modo che il modello riproduca il gettito, le presenze e i prezzi osservati. Non si modificano a mano; la loro incertezza è misurata nella pagina «Rischi».`,`<div class="legend">${Object.keys(KIND).map(k=>`<span><span class="tag ${k}">${k}</span> ${KIND[k]}</span>`).join("")}</div>`)
   +`<div class="g2">`+card("Le cinque tipologie di visitatore","Quote delle notti, prezzi mediani per persona e per notte, elasticità al costo del soggiorno, imposta pagata oggi, quota che ripiega sulla cintura, quota in affitto breve, spesa giornaliera fuori dall'alloggio.",tbl([{h:"Tipologia",a:"l"},{h:"Quota"},{h:"Prezzo"},{h:"σ"},{h:"Elasticità"},{h:"Imposta oggi"},{h:"Cintura"},{h:"Affitto breve"},{h:"Spesa"}],segRows))
   +card("Calibrazione","Prove che le ipotesi, insieme, riproducono i dati osservati.",`<div class="chk">${cal.map(x=>`<div class="it"><span class="chip ${x.s}">${{ok:"OK",warn:"Verifica",bad:"Errore"}[x.s]}</span><div><b>${esc(x.t)}.</b> ${esc(x.d)}</div></div>`).join("")}</div>`)+`</div>`
   +groups
   +card("Fonti","Consultate tra il 15 e il 17 ottobre 2026.",`<ol class="read">${FM.SRC.map(s=>`<li><a href="${esc(s[2])}" target="_blank" rel="noopener">${esc(s[1])}</a></li>`).join("")}</ol>`);
}
function pgChk(){
  const lab={ok:"OK",warn:"Verifica",bad:"Errore"};
  return head("Verifiche numeriche","Controlli di coerenza ricalcolati a ogni modifica: calibrazione, identità contabili, conservazione dei volumi, plausibilità dei valori implicati, convergenza del percorso.")
   +card("Esito",`${A.SAN.filter(x=>x.s==="ok").length} verifiche superate su ${A.SAN.length}.`,`<div class="chk">${A.SAN.map(x=>`<div class="it"><span class="chip ${x.s}">${lab[x.s]}</span><div><b>${esc(x.t)}.</b> ${esc(x.d)}</div></div>`).join("")}</div>`);
}

/* ---------- anteprima della presentazione ---------- */
let deck=null;
function buildDeck(){
  if(deck&&deck.ver===ver&&deck.app===META.appendix&&deck.name===scenName()) return deck;
  const Sx=D.context(P,Object.assign({},META,{name:scenName()}));
  const list=D.build(Sx); const items=list.map((fn,i)=>{ const so=new FMD.SvgOut(); const c=new FMD.Canvas(so); fn(c,Sx,i+1); return {svg:so.done(),info:c.info||{tag:"",title:""}}; });
  deck={ver,app:META.appendix,name:scenName(),S:Sx,list,items}; return deck;
}
function pgDeck(){ return head("Presentazione","Anteprima delle slide che il pulsante «Salva scenario» esporta in PDF. Si aggiorna con la politica.")+`<div id="deckwrap"><div class="busy"><span class="spin"></span><span>Compongo la presentazione…</span></div></div>`; }
function paintDeck(){
  const wrap=$("#deckwrap"); if(!wrap) return;
  const d=buildDeck(); UI.slide=Math.min(UI.slide,d.items.length-1);
  wrap.innerHTML=`<div class="deckbox"><div class="sl-list" id="sllist" role="list">${d.items.map((it,i)=>`<button type="button" data-sl="${i}" aria-current="${i===UI.slide}"><span class="n">${i+1}</span><span class="tt">${esc(it.info.title||it.info.tag)}</span></button>`).join("")}</div><div style="display:grid;gap:10px;min-width:0"><div class="slide" id="slideview"></div><div class="nav"><span class="note" id="slinfo"></span><span><button type="button" id="slprev">‹ Precedente</button> <button type="button" id="slnext">Successiva ›</button> <button type="button" class="primary" id="slsave">Salva scenario (PDF)</button></span></div></div></div>`;
  const show=i=>{ UI.slide=Math.max(0,Math.min(d.items.length-1,i)); $("#slideview").innerHTML=d.items[UI.slide].svg; $("#slinfo").textContent=`Slide ${UI.slide+1} di ${d.items.length} · ${d.items[UI.slide].info.tag||"Copertina"}`; $$("#sllist button").forEach(b=>b.setAttribute("aria-current",String(+b.dataset.sl===UI.slide))); const cur=$(`#sllist button[data-sl="${UI.slide}"]`); if(cur&&cur.scrollIntoView) cur.scrollIntoView({block:"nearest"}); };
  show(UI.slide);
  $("#sllist").onclick=e=>{ const b=e.target.closest("[data-sl]"); if(b) show(+b.dataset.sl); };
  $("#slprev").onclick=()=>show(UI.slide-1); $("#slnext").onclick=()=>show(UI.slide+1); $("#slsave").onclick=openSave;
  wrap.onkeydown=e=>{ if(e.key==="ArrowRight") show(UI.slide+1); else if(e.key==="ArrowLeft") show(UI.slide-1); };
}

const PAGES=[["pol","Politica",pgPol],["evo","Evoluzione",pgEvo],["over","Panoramica",pgOver],["tour","Turismo",pgTour],["casa","Casa e operatori",pgCasa],["bud","Bilancio e dividendo",pgBud],["lab","Lavoro",pgLab],["who","Chi paga",pgWho],["risk","Rischi",pgRisk],["ip","Ipotesi",pgIp],["chk","Verifiche",pgChk],["deck","Presentazione",pgDeck]];
if(!PAGES.some(p=>p[0]===UI.page)) UI.page="pol";
function renderNav(){ $("#pages").innerHTML=PAGES.map((t,i)=>`<button type="button" role="tab" data-page="${t[0]}" aria-selected="${t[0]===UI.page}"><span class="k">${i+1}</span>${t[1]}</button>`).join(""); }
function renderPage(keepScroll){
  const t=PAGES.find(x=>x[0]===UI.page)||PAGES[0]; $$("#pages [data-page]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.page===UI.page)));
  const sy=window.scrollY; const pg=$("#page"); pg.oninput=pg.onchange=pg.onclick=null;
  pg.innerHTML=t[2](); if(UI.page==="pol"){ bindPol(); updPol(); }
  paintCharts(); if(UI.page==="deck") setTimeout(paintDeck,20);
  if(keepScroll) window.scrollTo(0,sy);
}
function goPage(id){ UI.page=id; persist(); renderPage(false); window.scrollTo({top:0}); const b=$(`#pages [data-page="${id}"]`); if(b&&b.scrollIntoView) b.scrollIntoView({block:"nearest",inline:"nearest"}); }

/* ---------- aggiornamento ---------- */
let tmr=null;
function changed(){ ver++; R=FM.run(P); persist(); renderKpis(); clearTimeout(tmr);
  if(UI.page==="pol"){ syncCtls(); syncPlan(); tmr=setTimeout(()=>{ updPol(); paintCharts(); setTimeout(renderBadge,10); },60); return; }
  const heavy=["risk","deck","chk","ip"].includes(UI.page); tmr=setTimeout(()=>{ renderPage(true); setTimeout(renderBadge,10); },heavy?140:40); }

/* ---------- salvataggio ---------- */
let dlP=Promise.resolve(null);
try{ if(window.claude&&window.claude.use) dlP=Promise.resolve(window.claude.use("downloads")).catch(()=>null); }catch(e){}
const slug=s=>String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"scenario";
const today=()=>{ const d=new Date(); return d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0"); };
async function deliver(name,data,mime){
  const dl=await Promise.race([dlP,new Promise(r=>setTimeout(()=>r(null),4000))]);
  if(dl){ try{ const r=await dl.save({filename:name,data}); return r.status||"saved"; }catch(e){ if(e&&e.code==="declined") return "declined"; if(e&&e.code==="rate_limited") throw new Error("Un'altra richiesta di salvataggio è già aperta: riprova tra un momento."); if(e&&e.code&&e.code!=="unavailable"&&e.code!=="not_granted") throw new Error(e.message||"Salvataggio non riuscito"); } }
  // fuori dal visualizzatore (file aperto in un browser): download classico
  const url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type:mime})); const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); return "saved";
}
const tick=()=>new Promise(r=>setTimeout(r,25));
function openSave(){
  $("#f-name").value=scenName(); $("#f-aud").value=META.audience; $("#f-auth").value=META.author; $("#f-app").checked=META.appendix!==false; $("#f-msg").textContent=""; $("#f-busy").hidden=true; $("#f-go").disabled=false;
  updEst(); $("#saveModal").hidden=false; $("#f-name").focus();
}
function updEst(){ const n=D.build({SAN:A.SAN,P,meta:{appendix:$("#f-app").checked}}).length; $("#f-est").textContent=`${n} slide in formato 16:9, vettoriali, con testo selezionabile.`; }
async function doSave(){
  META.name=$("#f-name").value.trim(); META.audience=$("#f-aud").value.trim()||"Commissione consiliare e forze politiche"; META.author=$("#f-auth").value.trim(); META.appendix=$("#f-app").checked; persist();
  const busy=t=>{ $("#f-busy").hidden=false; $("#f-busytxt").textContent=t; };
  $("#f-go").disabled=true; $("#f-msg").textContent="";
  try{
    busy("Calcolo percorso, incertezza e sensibilità…"); await tick();
    const Sx=D.context(P,Object.assign({},META,{name:scenName()}));
    busy("Compongo le slide e creo il PDF…"); await tick();
    const out=await D.exportPdf(Sx);
    const blob=new Blob([out.bytes],{type:"application/pdf"});
    const name=`dividendo-firenze-${slug(Sx.name)}-${today()}.pdf`;
    busy("Salvataggio…"); const st=await deliver(name,blob,"application/pdf");
    $("#f-busy").hidden=true;
    if(st==="declined") $("#f-msg").textContent="Salvataggio annullato. Puoi riprovare quando vuoi.";
    else { $("#f-msg").textContent=`PDF pronto: ${out.pages} slide, ${(blob.size/1048576).toFixed(1).replace(".",",")} MB.`; toast("PDF salvato"); }
  }catch(e){ console.error(e); $("#f-busy").hidden=true; $("#f-msg").textContent="Non è stato possibile creare il PDF: "+(e&&e.message?e.message:"errore sconosciuto"); }
  $("#f-go").disabled=false;
}
async function saveJson(){
  try{ const st=await deliver(`dividendo-firenze-politica-${slug(scenName())}-${today()}.json`,new Blob([JSON.stringify({P:policy(),META},null,1)],{type:"application/json"}),"application/json"); if(st!=="declined") $("#f-msg").textContent="Politica salvata."; }
  catch(e){ $("#f-msg").textContent=e.message||"Salvataggio non riuscito"; }
}

/* ---------- eventi ---------- */
renderNav();
$("#pages").addEventListener("click",e=>{ const b=e.target.closest("[data-page]"); if(b) goPage(b.dataset.page); });
$("#page").addEventListener("click",e=>{ const b=e.target.closest("[data-go]"); if(b) goPage(b.dataset.go); });
$("#chkbadge").onclick=()=>goPage("chk");
$("#btnSave").onclick=openSave; $("#f-cancel").onclick=()=>{ $("#saveModal").hidden=true; $("#btnSave").focus(); };
$("#f-go").onclick=doSave; $("#f-json").onclick=saveJson; $("#f-app").onchange=updEst; $("#f-imp").onclick=()=>$("#fileImport").click();
$("#saveModal").addEventListener("keydown",e=>{ if(e.key==="Escape"){ $("#saveModal").hidden=true; $("#btnSave").focus(); } });
$("#saveModal").addEventListener("click",e=>{ if(e.target.id==="saveModal") $("#saveModal").hidden=true; });
$("#fileImport").onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const o=JSON.parse(rd.result); P=FM.merge(FM.defaults(),o.P||o); if(o.META&&o.META.name) META.name=o.META.name; renderPage(false); changed(); $("#f-msg").textContent="Politica caricata."; toast("Politica caricata"); }catch(x){ toast("Il file non è un JSON valido"); } }; rd.readAsText(f); e.target.value=""; };
const fsOK=!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen);
if(fsOK){ const b=$("#btnFull"); b.hidden=false; b.onclick=()=>{ if(document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(()=>toast("Lo schermo intero non è consentito qui: usa F11")); };
  document.addEventListener("fullscreenchange",()=>{ b.textContent=document.fullscreenElement?"Esci dallo schermo intero":"Schermo intero"; }); }
const setHdr=()=>{ document.documentElement.style.setProperty("--hdr",$("#top").offsetHeight+"px"); };
let rt=null; new ResizeObserver(()=>{ clearTimeout(rt); rt=setTimeout(()=>{ setHdr(); paintCharts(); },90); }).observe($("#page"));
window.addEventListener("beforeunload",persist);

setHdr(); renderKpis(); renderPage(false); setTimeout(renderBadge,30);
window.__app={P:()=>P,R:()=>R,A,S,META,setP:(o)=>{ Object.assign(P,o); changed(); },openSave,doSave,UI,renderPage,buildDeck,goPage};
})();
