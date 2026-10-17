/* Console del modello: stato, parametri, schede dei risultati, anteprima e salvataggio del PDF */
(function(){
"use strict";
const FM=window.FM, FMD=window.FMD, K=window.FMK, D=window.FMDeck;
const {C,n0,n1,n2,fM,fMs,fE,fE2,fP,fPs,fN,fNs,fMn,fMn1,fMc,MIN}=K;
const $=(s,el)=>(el||document).querySelector(s), $$=(s,el)=>[...(el||document).querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- caratteri (gli stessi del PDF) ---------- */
(function(){ let css=""; Object.keys(FMD.FONT_DEF).forEach(k=>{ const d=FMD.FONT_DEF[k]; css+=`@font-face{font-family:'${d[1]}';font-weight:${d[2]};font-display:block;src:url(data:font/ttf;base64,${window.FM_FONTS[d[0]]}) format('truetype')}`; });
  const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st); })();
try{ FMD.initFonts(window.FM_FONTS); }catch(e){ console.error(e); }

/* ---------- stato ---------- */
const KEY="dividendo-firenze-v3";
let P=FM.defaults();
const META={name:"",audience:"Commissione consiliare e forze politiche",author:"",appendix:true};
const UI={tab:"over",ptab:"leve",slide:0};
try{ const s=JSON.parse(localStorage.getItem(KEY)||"null"); if(s&&s.P) FM.merge(P,s.P); if(s&&s.META) Object.assign(META,s.META); if(s&&s.UI) Object.assign(UI,s.UI); }catch(e){}
function persist(){ try{ localStorage.setItem(KEY,JSON.stringify({P,META,UI})); }catch(e){} }
const DEF=FM.defaults();

let ver=0, R=FM.run(P); const cache={};
const memo=(k,fn)=>{ const c=cache[k]; if(c&&c.v===ver) return c.x; const x=fn(); cache[k]={v:ver,x}; return x; };
const A={
  get path(){ return memo("path",()=>FM.path(P,R)); },
  get MC(){ return memo("mc",()=>FM.monteCarlo(P,400)); },
  get TOR(){ return memo("tor",()=>FM.tornado(P,"saldo")); },
  get MAT(){ return memo("mat",()=>FM.impactMatrix(P)); },
  get MAP(){ return memo("map",()=>FM.policyMap(P)); },
  get SAN(){ return memo("san",()=>FM.sanity(P,R,A.path)); },
  get NG(){ return memo("ng",()=>{ const Q=FM.cloneP(P); Q.guaranteeOn=false; return FM.run(Q); }); },
  get SC(){ return memo("sc",()=>{ const o={}; FM.SCEN_ORDER.forEach(k=>{ const Q=FM.cloneP(P); FM.SCEN_KEYS.forEach(id=>Q[id]=FM.SCEN[k][id]); const r=FM.run(Q); o[k]={P:Q,R:r,path:FM.path(Q,r)}; }); return o; }); }
};
const S={ get P(){return P;}, get R(){return R;}, get MAP(){return A.MAP;}, get SC(){return A.SC;}, get key(){return FM.scenName(P)[0];}, get name(){return scenLabel();}, get pathRes(){return A.path;}, get MC(){return A.MC;}, get TOR(){return A.TOR;}, get MAT(){return A.MAT;}, get SAN(){return A.SAN;} };
const scenLabel=()=>META.name||FM.scenName(P)[1];

/* ---------- mappa dei colori per i grafici a schermo ---------- */
const CMAP={"#0B2545":"var(--navy)","#1B2A3A":"var(--ink)","#5E6B78":"var(--gray)","#C9D1D9":"var(--lgray)","#E8ECF0":"var(--xl)","#F4F6F9":"var(--panel)","#1F5FAE":"var(--blue)","#9DBCE3":"var(--lblue)","#E6EEF8":"var(--pblue)","#D0571B":"var(--orange)","#F4CDB8":"var(--lorange)","#1D6B3E":"var(--pos)","#B3261E":"var(--neg)"};
const colorMap=(c,role)=>{ const u=String(c).toUpperCase(); if(u==="#FFFFFF") return role==="text"?"var(--on-bar)":"var(--paper)"; return CMAP[u]; };

/* ---------- toast ---------- */
let toastT=null; function toast(t){ const el=$("#toast"); el.textContent=t; el.hidden=false; clearTimeout(toastT); toastT=setTimeout(()=>{ el.hidden=true; },3200); }

/* ---------- barra superiore ---------- */
function renderScen(){
  $("#scenbtns").innerHTML=FM.SCEN_ORDER.map(k=>`<button type="button" data-scen="${k}" aria-pressed="false">${esc(FM.SCEN[k].name)}</button>`).join(" ");
  $$("#scenbtns [data-scen]").forEach(b=>b.addEventListener("click",()=>{ const s=FM.SCEN[b.dataset.scen]; FM.SCEN_KEYS.forEach(k=>P[k]=s[k]); META.name=""; syncPanel(); changed(); }));
}
function markScen(){ const [k,n]=FM.scenName(P); $$("#scenbtns [data-scen]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.scen===k?"true":"false")); const sb=$("#scenname"); sb.hidden=!!k; sb.className="badge warn"; sb.textContent="Scenario personalizzato"; }
function renderBadge(){ const b=$("#chkbadge"); const san=A.SAN; const bad=san.filter(x=>x.s==="bad").length, warn=san.filter(x=>x.s==="warn").length; b.hidden=false;
  b.className="badge "+(bad?"bad":warn?"warn":"ok"); b.textContent=bad?`${bad} verifiche non superate`:warn?`${warn} verifiche da controllare`:`${san.length} verifiche superate`; }

/* ---------- indicatori ---------- */
function renderKpis(){
  const k=[["Gettito netto al Comune",fM(R.net),fMs(R.dTax-R.dayFeeNet)+" sull'oggi",1],["Saldo strutturale",fM(R.saldo),"dopo il Fondo",1],["Dividendo per famiglia",fE(R.perHH),"all'anno, dopo la riserva"],["Pernottamenti",fPs(R.nChg),n1(R.nNew/1e6)+" mln di notti"],
    ["Abitazioni ai residenti",fN(R.toRes),fPs(R.rentChg)+" sui canoni"],["Occupazione netta",fNs(R.jobsNet),fN(R.jobsLost)+" persi, "+fN(R.jobsGained)+" creati"],["Visitatori-giorno",fPs(R.vdChg),"escursionisti inclusi"],["Costo su non residenti",fP(R.nonResShare,0),"residenti: "+fMs(R.residentsNet)]];
  $("#kpis").innerHTML=k.map(x=>`<div class="kpi"><span class="l">${x[0]}</span><span class="v${x[3]?" hot":""}">${x[1]}</span><span class="s">${x[2]}</span></div>`).join("");
}

/* ---------- pannello dei parametri ---------- */
const LEVE=FM.PARAMS.filter(p=>p.g==="leve");
function fmtLever(p,v){ if(p.bool) return v?"Sì":"No"; if(p.select) return ""; if(p.id==="cap") return v>0?"€"+n0(v):"nessuno"; if(p.pct) return fP(v,p.step<.01?1:0).replace(/,0%/,"%"); if(p.unit==="€/notte"||p.unit==="€/visita") return "€"+n1(v).replace(/,0$/,""); if(p.unit==="€ mln/anno") return "€"+n1(v).replace(/,0$/,"")+" mln"; if(p.unit==="×") return n2(v)+"×"; return n2(v); }
function buildLeve(){
  let html="",cur="";
  LEVE.forEach(p=>{
    if(p.sub!==cur){ if(cur) html+="</div>"; cur=p.sub; html+=`<div class="grp"><span class="eyebrow">${esc(cur)}</span>`; }
    if(p.bool) html+=`<label class="sw" for="in-${p.id}"><input type="checkbox" id="in-${p.id}" data-p="${p.id}"><span>${esc(p.label)}</span></label>`;
    else if(p.select) html+=`<div class="ctl"><label for="in-${p.id}">${esc(p.label)}</label><select id="in-${p.id}" data-p="${p.id}">${p.select.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select></div>`;
    else html+=`<div class="ctl"><div class="row"><label for="in-${p.id}">${esc(p.label)}</label><span class="val" id="v-${p.id}"></span></div><input type="range" id="in-${p.id}" data-p="${p.id}" min="${p.min}" max="${p.max}" step="${p.step}">${p.hint?`<span class="hint">${esc(p.hint)}</span>`:""}</div>`;
  });
  return html+"</div>";
}
const SEGCOLS=[["share","Quota notti",1,1],["price","Prezzo €",0,5],["sigma","σ",0,.05],["eps","Elasticità",0,.05],["tOld","Imposta oggi €",0,.5],["belt","Cintura",1,5],["apt","Affitto breve",1,5],["spend","Spesa €",0,5]];
function buildIpotesi(){
  const groups=[...new Set(FM.PARAMS.filter(p=>p.g!=="leve").map(p=>p.g))];
  let html=`<input type="search" id="asearch" placeholder="Cerca un'ipotesi" aria-label="Cerca un'ipotesi" style="margin-bottom:6px">`;
  html+=`<details class="ag" open data-g="Tipologie"><summary>Tipologie di visitatore</summary><div class="segtbl"><table><thead><tr><th>Tipologia</th>${SEGCOLS.map(c=>`<th>${c[1]}${c[2]?" %":""}</th>`).join("")}</tr></thead><tbody>${P.segs.map((s,i)=>`<tr><td>${esc(s.short)}</td>${SEGCOLS.map(c=>`<td><input type="number" id="sg-${i}-${c[0]}" data-s="${i}" data-k="${c[0]}" step="${c[3]}" aria-label="${esc(s.short)}: ${c[1]}"></td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="hint" style="margin-top:6px">Quote riscalate al 100%. Elasticità rispetto al costo per notte. Cintura: quota delle notti perse che si sposta nei comuni vicini.</p></details>`;
  groups.forEach(g=>{
    html+=`<details class="ag" data-g="${esc(g)}"><summary>${esc(g)}</summary>`+FM.PARAMS.filter(p=>p.g===g).map(p=>{ const st=p.pct?p.step*100:p.step;
      return `<div class="arow" data-id="${p.id}" data-t="${esc((p.label+" "+(p.note||"")).toLowerCase())}"><label for="as-${p.id}">${esc(p.label)}${p.note?`<small>${esc(p.note)}</small>`:""}</label><span class="in"><input type="number" id="as-${p.id}" data-a="${p.id}" step="${+st.toFixed(4)}"><span class="u">${esc(p.unit&&p.unit!=="unità"?p.unit:"")}</span></span><span class="meta"><span class="tag ${p.kind}">${p.kind}</span>${p.src?`<span>fonte [${FM.SRCI[p.src]}]</span>`:""}</span></div>`; }).join("")+`</details>`;
  });
  return html;
}
function syncPanel(){
  LEVE.forEach(p=>{ const i=$("#in-"+p.id); if(!i) return; if(p.bool) i.checked=!!P[p.id]; else i.value=P[p.id]; const v=$("#v-"+p.id); if(v) v.textContent=fmtLever(p,P[p.id]); });
  let mod=0;
  FM.PARAMS.filter(p=>p.g!=="leve").forEach(p=>{ const i=$("#as-"+p.id); if(!i) return; const shown=p.pct?+(P[p.id]*100).toFixed(3):P[p.id]; if(document.activeElement!==i) i.value=shown; const m=Math.abs(P[p.id]-DEF[p.id])>1e-12; i.closest(".arow").classList.toggle("mod",m); if(m) mod++; });
  P.segs.forEach((s,i)=>SEGCOLS.forEach(c=>{ const el=$(`#sg-${i}-${c[0]}`); if(el&&document.activeElement!==el) el.value=c[2]?+(s[c[0]]*100).toFixed(2):s[c[0]]; const m=Math.abs(s[c[0]]-DEF.segs[i][c[0]])>1e-12; if(el) el.style.borderColor=m?"var(--blue)":""; if(m) mod++; }));
  $("#modcnt").textContent=mod?`(${mod})`:"";
}
function showPanel(which){ UI.ptab=which; $("#pt-leve").setAttribute("aria-selected",which==="leve"); $("#pt-ip").setAttribute("aria-selected",which==="ip"); $("#pbody").innerHTML=which==="leve"?buildLeve():buildIpotesi(); bindPanel(); syncPanel(); persist(); }
function bindPanel(){
  const b=$("#pbody");
  if(UI.ptab==="leve"){ b.oninput=e=>{ const id=e.target.dataset.p; if(!id) return; const p=FM.PMAP[id]; P[id]=p.bool?e.target.checked:(p.select?e.target.value:parseFloat(e.target.value)); META.name=""; const v=$("#v-"+id); if(v) v.textContent=fmtLever(p,P[id]); changed(); }; b.onchange=null; }
  else {
    b.oninput=null;
    b.onchange=e=>{ const t=e.target;
      if(t.dataset.a){ const p=FM.PMAP[t.dataset.a]; let v=parseFloat(t.value); if(!isFinite(v)) return syncPanel(); if(p.pct) v/=100; P[p.id]=v; META.name=""; changed(); syncPanel(); }
      else if(t.dataset.s!==undefined){ const col=SEGCOLS.find(c=>c[0]===t.dataset.k); let v=parseFloat(t.value); if(!isFinite(v)) return syncPanel(); if(col[2]) v/=100; P.segs[+t.dataset.s][t.dataset.k]=v; META.name=""; changed(); syncPanel(); } };
    const q=$("#asearch"); q.oninput=()=>{ const s=q.value.trim().toLowerCase(); $$(".arow",b).forEach(r=>{ r.style.display=!s||r.dataset.t.includes(s)?"":"none"; }); if(s) $$("details.ag",b).forEach(d=>{ d.open=true; }); };
  }
}

/* ---------- componenti HTML ---------- */
const card=(t,sub,body,cls)=>`<section class="card ${cls||""}"><header><h3>${t}</h3>${sub?`<p>${sub}</p>`:""}</header>${body}</section>`;
const ch=(key,label)=>`<div class="chart" data-ch="${key}" data-label="${esc(label||"Grafico")}"></div>`;
function tbl(cols,rows,o){ o=o||{};
  return `<div class="tw"><table class="tbl ${o.cls||""}"><thead><tr>${cols.map(c=>`<th class="${c.a==="l"?"l":""}">${c.h}</th>`).join("")}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="${o.hl&&o.hl.includes(i)?"hl":""}">${r.map((x,j)=>`<td class="${cols[j]&&cols[j].a==="l"?"l":""}${cols[j]&&cols[j].w?" w":""}">${x}</td>`).join("")}</tr>`).join("")}</tbody>${o.foot?`<tfoot><tr>${o.foot.map(x=>`<td>${x}</td>`).join("")}</tr></tfoot>`:""}</table></div>`; }
const seg=id=>R.segs.find(s=>s.id===id);

/* ---------- grafici (gli stessi della presentazione) ---------- */
const CH={
  tax:(c,w)=>{ const h=Math.round(Math.max(300,Math.min(430,w*.5))); K.taxFunction(c,0,0,w,h,S); return h; },
  nights:(c,w)=>K.hBarPairs(c,0,0,w,R.segs.map(s=>({label:s.short,a:s.nB/1e6,b:s.nN/1e6,tag:fPs(s.chg),tagColor:s.chg<0?C.orange:C.blue})),{labelW:Math.min(160,w*.26),valW:Math.min(120,w*.2),rowH:54,bh:14,fmt:v=>n2(v)}),
  eff:(c,w)=>K.hBarPairs(c,0,0,w,R.segs.map(s=>({label:s.short,a:s.effOld,b:s.effNew})),{labelW:Math.min(160,w*.26),valW:70,rowH:54,bh:14,fmt:v=>fP(v,1),max:Math.max(...R.segs.map(s=>Math.max(s.effOld,s.effNew)))*1.05}),
  load:(c,w)=>K.visitorBars(c,0,0,w,S),
  wf:(c,w)=>{ const h=Math.round(Math.max(340,Math.min(430,w*.46))); K.waterfall(c,34,6,w-40,h-6,K.pnlSteps(R),{labH:64,fmt:v=>n1(v),fmtS:v=>(v>=0?"+":MIN)+n1(Math.abs(v)),axisFmt:v=>n0(v)}); return h; },
  alloc:(c,w)=>{ const keys=String(P.order).split(","); const nm={irpef:"Addizionale IRPEF",tari:"TARI domestica",tpl:"Trasporto pubblico"}; return K.hBarPairs(c,0,0,w,keys.map(k=>({label:nm[k],a:R.alloc[k].cost/1e6,b:R.alloc[k].paid/1e6,tag:fP(R.alloc[k].cov,0),tagColor:R.alloc[k].cov>=.995?C.blue:C.orange})),{labelW:Math.min(150,w*.3),valW:70,rowH:58,bh:14,fmt:v=>n1(v)}); },
  stake:(c,w)=>{ const h=K.diverging(c,0,0,w,K.stakeGroups(R),{labelW:Math.min(260,w*.42),rowH:29,gh:26}); return h+4; },
  dwl:(c,w)=>{ const rows=R.segs.map(s=>({label:s.short,v:s.dwl/1e6,color:s.dwl>0?C.orange:C.blue})); if(R.dwlDay>1e4) rows.push({label:"Escursionisti",v:R.dwlDay/1e6,color:C.orange}); return K.hBars(c,0,0,w,rows,{labelW:Math.min(150,w*.3),valW:70,rowH:40,bh:20,fmt:v=>(v<0?MIN:"")+n1(Math.abs(v))}); },
  ops:(c,w)=>{ const h=330; K.columns(c,34,0,w-40,h,[{label:"Albergatori",v:R.dPiHotel/1e6},{label:"Affitti brevi: chi resta",v:R.llStay/1e6},{label:"Affitti brevi: chi converte",v:R.llSwitch/1e6},{label:"Ristorazione e commercio",v:R.dPiComp/1e6}],{fmt:v=>(v>=0?"+":MIN)+n1(Math.abs(v)),axisFmt:v=>n0(v),labH:60,maxBw:76}); return h; },
  dens:(c,w)=>{ const h=340; K.densityR(c,0,0,w,h,S); return h; },
  jobs:(c,w)=>{ const h=340; K.columns(c,40,0,w-46,h,[{label:"Posti persi nel turismo",v:-R.jobsLost},{label:"Dividendo speso in città",v:R.pool*P.mpcRes/1e6*P.jobsPerMRes},{label:"Nuovi residenti",v:R.newRes*P.newResSpend/1e6*P.jobsPerMRes},{label:"Spesa del Fondo",v:(R.fComm+R.fTalent)/1e6*P.jobsPerMRes},{label:"Saldo netto",v:R.jobsNet,c:C.navy}],{fmt:v=>(v>=0?"+":MIN)+n0(Math.abs(v)),axisFmt:v=>n0(v),labH:62,maxBw:70}); return h; },
  path:(c,w)=>{ const h=300; K.columns(c,36,0,w-42,h,A.path.yearly.map((v,i)=>({label:"Anno "+(i+1),v:v/1e6})),{fmt:v=>n1(v),axisFmt:v=>n0(v),labH:44,maxBw:80}); return h; },
  frontier:(c,w)=>{ const h=Math.round(Math.max(340,Math.min(460,w*.5))); K.frontier(c,0,0,w,h,S); return h; },
  tornado:(c,w)=>K.tornadoChart(c,0,0,w,K.tornadoRows(A.TOR),{labelW:Math.min(230,w*.34),rowH:36})+6
};
const CHMIN={wf:700,ops:440,jobs:480,tax:540,frontier:500,stake:500,tornado:480,dens:440,load:480,path:420};
function paintCharts(){
  $$("[data-ch]").forEach(el=>{ const f=CH[el.dataset.ch]; if(!f) return; const w=Math.max(CHMIN[el.dataset.ch]||380,Math.floor(el.clientWidth)||380); const so=new FMD.SvgOut(colorMap); const c=new FMD.Canvas(so); let h=0; try{ h=f(c,w); }catch(e){ console.error(el.dataset.ch,e); } el.innerHTML=so.region(w,Math.max(40,h),el.dataset.label); });
}

/* ---------- schede ---------- */
const GO=id=>`data-go="${id}"`;
function effects(){
  const avgOld=P.baseRevenue*1e6/(P.totalNights*1e6*(1-P.minorShare)), avgNew=R.G/(R.nNew*(1-P.minorShare));
  const opsD=R.dPiHotel+R.strLandlords+R.dPiComp;
  const f=[
    {t:"Imposta media per notte",v:"€"+n2(avgNew),d:"oggi €"+n2(avgOld),dir:avgNew-avgOld,go:"tour"},
    {t:"Gettito lordo dell'imposta",v:fM(R.G),d:fMs(R.G-R.base)+" sull'oggi",dir:R.G-R.base,go:"bud"},
    {t:"Pernottamenti",v:fPs(R.nChg),d:n1(R.nNew/1e6)+" mln di notti",dir:R.nChg,go:"tour"},
    {t:"Surplus dei turisti",v:fMs(R.cs),d:"maggior costo e minore consumo",dir:R.cs,go:"who"}];
  const s=[
    {t:"Margini degli operatori",v:fMs(opsD),d:"alberghi, affitti brevi, commercio",dir:opsD,go:"ops"},
    {t:"Appartamenti riconvertiti",v:fN(R.toRes),d:fP(R.share,1)+" dello stock",dir:R.toRes,go:"ops"},
    {t:"Spesa turistica",v:fMs(R.dSpend),d:"valore aggiunto "+fMs(R.vaChg),dir:R.dSpend,go:"lab"},
    {t:"Occupazione netta",v:fNs(R.jobsNet),d:fN(R.jobsLost)+" persi, "+fN(R.jobsGained)+" creati",dir:R.jobsNet,go:"lab"},
    {t:"Visitatori-giorno",v:fPs(R.vdChg),d:"escursionisti inclusi",dir:R.vdChg,go:"tour"}];
  const t=[
    {t:"Canoni e prezzi",v:fPs(R.rentChg),d:"prezzi "+fPs(R.priceChg),dir:R.rentChg,go:"ops"},
    {t:"Nuovi residenti",v:fNs(R.newRes),d:"in "+fN(R.toRes)+" abitazioni",dir:R.newRes,go:"ops"},
    {t:"Comuni della cintura",v:fMs(R.beltTaxRev+R.beltProfit),d:fMn(R.belt)+" di notti spostate",dir:1,go:"who"},
    {t:"Saldo del Comune",v:fM(R.saldo),d:"dopo il Fondo",dir:R.saldo,go:"bud"},
    {t:"Dividendo per famiglia",v:fE(R.perHH),d:"all'anno, dopo la riserva",dir:R.perHH,go:"bud"},
    {t:"Costo su non residenti",v:fP(R.nonResShare,0),d:"residenti: "+fMs(R.residentsNet),dir:0,go:"who"}];
  return [f,s,t];
}
function tabOver(){
  const [f,s,t]=effects();
  const col=(h,sub,list)=>`<div class="fxcol"><h4>${h}<small>${sub}</small></h4>${list.map(x=>`<button type="button" class="fxc ${x.dir>0?"up":x.dir<0?"dn":""}" ${GO(x.go)}><span class="t">${x.t}</span><span class="v">${x.v}</span><span class="d">${x.d}</span></button>`).join("")}</div>`;
  const seg4=seg("budget"),lux=seg("lux"),mass=seg("mass");
  const read=[
    `**Imposta.** max(€${n1(P.tmin).replace(",0","")}; ${n1(P.alpha*100).replace(",0","")}% del prezzo): gettito lordo ${fM(R.G)}, netto per il Comune ${fM(R.net)} (${fMs(R.dTax-R.dayFeeNet)}).`,
    `**Domanda.** Pernottamenti ${fPs(R.nChg)}: mass-market ${fPs(mass.chg)}, lusso ${fPs(lux.chg)}. Visitatori-giorno ${fPs(R.vdChg)}.`,
    `**Operatori e case.** Margini ${fMs(R.dPiHotel+R.strLandlords+R.dPiComp)}; ${fN(R.units)} appartamenti convertono; canoni ${fPs(R.rentChg)}, prezzi ${fPs(R.priceChg)}.`,
    `**Comune.** Saldo ${fM(R.saldo)} dopo ${fM(R.fund)} di Fondo; dividendo ${fE(R.perHH)} a famiglia.`,
    `**Lavoro.** ${fN(R.jobsLost)} posti a rischio, ${fN(R.jobsGained)} ricreati dalla domanda locale.`,
    `**Incidenza.** ${fP(R.nonResShare,0)} del costo su non residenti; effetto netto sui residenti ${fMs(R.residentsNet)}.`].map(x=>`<li>${x.replace(/\*\*(.+?)\*\*/g,"<b>$1</b>")}</li>`).join("");
  return card("Mappa degli effetti","Ogni cartella è un fattore del modello e si aggiorna a ogni modifica dei parametri. Il colore indica il segno dell'effetto; clicca per aprire il dettaglio.",`<div class="fx">${col("Primo ordine","prezzi e gettito, entro pochi mesi",f)}${col("Secondo ordine","mercati e lavoro, 1–3 anni",s)}${col("Terzo ordine","città e conti pubblici, 3–10 anni",t)}</div>`)
   +`<div class="two">`+card("Chi paga e chi riceve","Variazione annua a regime, € milioni.",ch("stake","Chi paga e chi riceve"))+card("Lettura dello scenario","",`<ul class="read">${read}</ul>`)+`</div>`;
}
function tabTour(){
  const rows=R.segs.map(s=>[esc(s.short),fE2(s.tOld),s.exempt?"esente":fE2(s.tAvg),fP(s.effOld,1),fP(s.effNew,1),fMn(s.nB),fMn(s.nN),fPs(s.chg),fMn(s.beltN),fM(s.cs),fM(s.dwl)]);
  return card("L'imposta per notte","Pavimento, aliquota e prezzi: cerchi vuoti = tariffa attuale al prezzo mediano, pieni = proposta.",ch("tax","Imposta per notte"))
   +card("Che cosa paga ciascuna tipologia","Aliquota effettiva = imposta ÷ (prezzo + imposta).",tbl([{h:"Tipologia",a:"l"},{h:"Imposta oggi"},{h:"Imposta dopo"},{h:"Aliquota oggi"},{h:"Aliquota dopo"},{h:"Notti oggi"},{h:"Notti dopo"},{h:"Δ notti"},{h:"Verso la cintura"},{h:"Surplus"},{h:"Perdita"}],rows,{foot:["Totale","","","","",fMn(R.nB),fMn(R.nNew),fPs(R.nChg),fMn(R.belt),fM(R.cs),fM(R.dwl)]}))
   +`<div class="two even">`+card("Pernottamenti per tipologia","Milioni di notti all'anno: oggi (grigio) e dopo la riforma (blu).",ch("nights","Pernottamenti per tipologia"))+card("Aliquota effettiva","Imposta in % del prezzo: oggi (grigio) e dopo (blu).",ch("eff","Aliquota effettiva"))+`</div>`
   +card("Carico sulla città","Visitatori presenti in un giorno medio, in migliaia."+(P.dayFee>0?` Il contributo d'accesso di €${n1(P.dayFee).replace(",0","")} frutta ${fM(R.dayFeeNet)}.`:" Gli escursionisti non pagano l'imposta di soggiorno: per ridurli serve il contributo d'accesso (leva «Disegno dell'imposta»)."),ch("load","Visitatori in un giorno medio"));
}
function tabOps(){
  const per=-R.ownerWealth/Math.max(1,R.ownerHomes);
  return `<div class="two">`+card("Margini degli operatori","Variazione annua, € milioni.",ch("ops","Margini degli operatori"))
   +card("Quanto pesa","",tbl([{h:"Gruppo",a:"l"},{h:"Base"},{h:"Variazione"},{h:"%"}],[["Albergatori",fM(R.hotelBaseProfit),fMs(R.dPiHotel),fPs(R.dPiHotel/R.hotelBaseProfit,1)],["Affitti brevi",fM(R.strNoiBase),fMs(R.strLandlords),fPs(R.strLandlords/R.strNoiBase,1)],["Ristorazione e commercio",fM(R.compBase),fMs(R.dPiComp),fPs(R.dPiComp/R.compBase,1)]]))+`</div>`
   +`<div class="two">`+card("Affitti brevi e conversioni","Premio R dell'affitto breve rispetto alla locazione: in arancione chi passa al lungo termine.",ch("dens","Distribuzione del premio R"))
   +card("Mercato abitativo","",tbl([{h:"Indicatore",a:"l"},{h:"Valore"},{h:"Variazione"}],[["Appartamenti riconvertiti",fN(R.units),fP(R.share,1)+" dello stock"],["…che vanno a residenti",fN(R.toRes),""],["Nuovi residenti netti",fN(R.newRes),fN(R.newResGross)+" occupanti"],["Canone","€"+n2(P.rent*(1+R.rentChg))+"/m²",fPs(R.rentChg)],["Risparmio per famiglia in affitto",fE(-R.rentChg*R.annualRent)+"/anno",""],["Prezzo","€"+fN(P.price*(1+R.priceChg))+"/m²",fPs(R.priceChg)],["Reddito dei proprietari di affitti brevi",fMs(R.strLandlords),fPs(R.strLandlords/R.strNoiBase,1)]]))+`</div>`
   +card("Effetto patrimoniale","",`<p class="note">Il calo dei prezzi (${fPs(R.priceChg)}) è una perdita cartacea per le ${fN(R.ownerHomes)} famiglie proprietarie: circa <b>${fE(per)}</b> a famiglia, ${fM(-R.ownerWealth)} in tutto. Si realizza solo con la vendita e migliora l'accesso di giovani e lavoratori. È il punto politicamente più delicato.</p>`);
}
function tabBud(){
  const tariHH=P.tariDomBase*1e6/P.households, irpefHH=P.incomeNew*P.irpefRate;
  const irpef=irpefHH*R.alloc.irpef.cov, tari=tariHH*R.alloc.tari.cov, tpl=2*P.passPrice*R.alloc.tpl.cov, rent=-R.rentChg*R.annualRent;
  const ng=A.NG;
  return card("Dal gettito al saldo strutturale","€ milioni all'anno a regime. Il saldo è dopo il Fondo Armonizzatore e prima della riserva.",ch("wf","Cascata del conto economico"))
   +`<div class="two even">`+card("Dividendo civico",`Disponibile ${fM(R.pool)} (${fE(R.perHH)} per famiglia, ${fE(R.pool/P.residents)} per residente).`,ch("alloc","Copertura degli sgravi"))
   +card("Famiglia tipo","Due adulti in affitto in 70 m², un reddito da €40.000.",tbl([{h:"Beneficio",a:"l"},{h:"€ all'anno"}],[["Addizionale IRPEF risparmiata",fE(irpef)],["TARI risparmiata (bolletta media "+fE(tariHH)+")",fE(tari)],["Due abbonamenti al trasporto pubblico",fE(tpl)],["Canone più basso, al rinnovo",fE(rent)]],{foot:["Totale",fE(irpef+tari+tpl+rent)]}))+`</div>`
   +card("Fondo Armonizzatore",`${P.guaranteeOn?"Con":"Senza"} la garanzia si riconvertono ${fN(R.units)} appartamenti; ${P.guaranteeOn?"senza":"con"} sarebbero ${fN(ng.units)}.`,tbl([{h:"Linea",a:"l"},{h:"€ mln/anno"}],[["Riconversione commerciale",n1(R.fComm/1e6)],["Garanzia sugli affitti",n1(R.fGuar/1e6)],["Imprese e talenti",n1(R.fTalent/1e6)],["Transizione dei lavoratori (una tantum, anni 1–3)",n1(R.fTrainTotal/1e6)]],{foot:["Fondo a regime",n1(R.fund/1e6)]}));
}
function tabWho(){
  return `<div class="two">`+card("Chi paga e chi riceve","Variazione annua a regime, € milioni. Ipotesi: il "+fP(P.resShareOps,0)+" di gestori e proprietari risiede a Firenze.",ch("stake","Chi paga e chi riceve"))
   +card("Incidenza ed efficienza","",tbl([{h:"Indicatore",a:"l"},{h:"Valore"}],[["Costo su non residenti",fP(R.nonResShare,0)],["Effetto netto per i residenti",fMs(R.residentsNet)+" ("+fE(R.residentsNet/P.residents)+" a testa)"],["Somma degli effetti monetari",fMs(R.netMonetary)],["Perdita di efficienza",fM(R.dwl)],["Costo di un euro raccolto",isFinite(R.mcpf)?n2(R.mcpf)+" euro":"n.d. (il prelievo non aumenta)"],["Maggior gettito riscosso",fM(R.publicRaised)]]))+`</div>`
   +card("Perdita di efficienza per tipologia","€ milioni all'anno. Un valore negativo è un guadagno (giovani esentati).",ch("dwl","Perdita di efficienza"));
}
function tabLab(){
  const payback=R.saldo>0?((R.naspiCost+R.fTrainTotal)/(R.saldo/12)):NaN;
  return `<div class="two">`+card("Occupazione a regime","Posti di lavoro.",ch("jobs","Occupazione a regime"))
   +card("Costi di transizione una tantum","Anni 1–3, € milioni.",tbl([{h:"Voce",a:"l"},{h:"€ mln"}],[["Salari persi durante la disoccupazione",n1(R.wagesLostGross/1e6)],["…coperti dall'indennità (NASpI, Stato)",n1(R.naspiCost/1e6)],["…a carico dei lavoratori",n1(R.workersLoss/1e6)],["Riqualificazione (Fondo Armonizzatore)",n1(R.fTrainTotal/1e6)]],{foot:["Costo pubblico una tantum",n1((R.naspiCost+R.fTrainTotal)/1e6)]})+`<p class="note">Equivale a ${isFinite(payback)?"<b>"+n1(payback)+" mesi</b>":"molti mesi"} di saldo strutturale. I posti persi sono a bassa qualifica (retribuzione ${fE(P.wageTourism)}); la domanda locale ne ricrea circa un terzo.</p>`)+`</div>`;
}
function tabPath(){
  const pr=A.path, sc=A.SC, ks=FM.SCEN_ORDER, cur=S.key;
  const lg=(Pq,Rq)=>{ const maxT=Math.max(...Rq.segs.map(s=>s.tP90)); return (Pq.tmin>12||maxT>12.0001||Pq.dayFee>0)?"Norma nazionale":(Pq.tmin>10||maxT>10.0001?"Maggiorazione €2":"Vigente"); };
  const row=(l,fn,b)=>[`<span${b?' style="font-weight:700"':""}>${l}</span>`,...ks.map(k=>fn(sc[k].R,sc[k].P))];
  const rows=[row("Pavimento / aliquota",(r,p)=>"€"+n1(p.tmin).replace(",0","")+" / "+n1(p.alpha*100).replace(",0","")+"%"+(p.cap>0?" (tetto €"+p.cap+")":"")),row("Contributo d'accesso",(r,p)=>p.dayFee>0?"€"+n1(p.dayFee).replace(",0","")+" a visita":"—"),row("Gettito netto al Comune",r=>fM(r.net),1),row("Saldo strutturale",r=>fM(r.saldo),1),row("Dividendo per famiglia",r=>fE(r.perHH)),row("Pernottamenti",r=>fPs(r.nChg)),row("Visitatori-giorno",r=>fPs(r.vdChg)),row("Abitazioni ai residenti",r=>fN(r.toRes)),row("Canoni",r=>fPs(r.rentChg)),row("Occupazione netta",r=>fNs(r.jobsNet)),row("Costo su non residenti",r=>fP(r.nonResShare,0)),row("Perdita di efficienza",r=>fM(r.dwl)),row("Base giuridica",(r,p)=>lg(p,r))];
  const cols=[{h:"",a:"l"},...ks.map(k=>({h:esc(FM.SCEN[k].name)+(k===cur?" ●":"")}))];
  return `<div class="two">`+card("Saldo strutturale nei primi cinque anni","€ milioni. La domanda si adegua in un anno, le conversioni in tre o quattro; la riqualificazione dei lavoratori pesa sui primi tre anni.",ch("path","Saldo nei primi cinque anni")+tbl([{h:"",a:"l"},...pr.yearly.map((_,i)=>({h:"Anno "+(i+1)}))],[["Saldo annuo",...pr.yearly.map(v=>n1(v/1e6))]],{foot:["Saldo cumulato",...pr.cum.map(v=>n1(v/1e6))]}))
   +card("Mappa delle scelte","Saldo e riduzione delle presenze per 60 coppie di pavimento e aliquota; i punti scuri sono gli scenari.",ch("frontier","Mappa delle scelte"))+`</div>`
   +card("Scenari a confronto","Stesse ipotesi di mercato; cambiano solo le leve. ● = scenario attuale.",tbl(cols,rows));
}
function tabSens(){
  const mc=A.MC, mat=A.MAT;
  const f=(k,fn)=>[fn(mc[k].p10),fn(mc[k].p50),fn(mc[k].p90)];
  const mrows=[["Saldo",...f("saldo",fM)],["Gettito netto aggiuntivo",...f("dTax",fM)],["Pernottamenti",...f("nChg",v=>fPs(v))],["Abitazioni ai residenti",...f("toRes",fN)],["Canoni",...f("rentChg",v=>fPs(v))],["Dividendo per famiglia",...f("perHH",fE)],["Occupazione netta",...f("jobsNet",fNs)],["Costo su non residenti",...f("nonResShare",v=>fP(v,0))]];
  const mx=mat.cols.map((_,j)=>Math.max(1e-9,...mat.rows.map(r=>Math.abs(r.cells[j]))));
  const hrow=mat.rows.map(r=>`<tr><td class="l">${esc(r.label)} <span class="hint">(${r.isAbs?"+"+n1(r.deltaLabel).replace(",0",""):"+10%"})</span></td>${r.cells.map((v,j)=>{ const t=Math.abs(v)/mx[j]; const bg=Math.abs(v)<1e-9?"transparent":`color-mix(in srgb, var(${v>=0?"--blue":"--orange"}) ${Math.round(12+60*Math.sqrt(t))}%, transparent)`; const d=mat.cols[j].d; const tx=Math.abs(v)<1e-9?"0":(v>=0?"+":MIN)+(Math.abs(v)<10&&d<1?n1(Math.abs(v)):[n0,n1,n2][Math.min(2,d)](Math.abs(v))); return `<td class="c" style="background:${bg}">${tx}</td>`; }).join("")}</tr>`).join("");
  return `<div class="two">`+card("Che cosa muove il saldo","Ogni barra varia una sola ipotesi tra i valori indicati.",ch("tornado","Sensibilità del saldo"))
   +card("Intervallo di incertezza",`${mc.n} estrazioni delle ipotesi più incerte (seme fisso). Il saldo è negativo in ${n0(mc.saldo.neg*mc.n)} casi.`,tbl([{h:"Grandezza",a:"l"},{h:"P10"},{h:"Mediana"},{h:"P90"}],mrows))+`</div>`
   +card("Matrice degli effetti","Variazione di ciascun risultato per un aumento del 10% della leva (o dell'importo indicato). Blu: aumenta; arancione: diminuisce.",`<div class="tw"><table class="tbl heat"><thead><tr><th class="l">Leva</th>${mat.cols.map(c=>`<th>${esc(c.label)}<br><span class="hint">${esc(c.unit)}</span></th>`).join("")}</tr></thead><tbody>${hrow}</tbody></table></div>`);
}
function tabChk(){
  const lab={ok:"OK",warn:"Verifica",bad:"Errore"};
  return card("Verifiche numeriche","Controlli di coerenza ricalcolati a ogni modifica: calibrazione, identità contabili, conservazione dei volumi, plausibilità dei valori implicati.",`<div class="chk">${A.SAN.map(x=>`<div class="it"><span class="chip ${x.s}">${lab[x.s]}</span><div><b>${esc(x.t)}.</b> ${esc(x.d)}</div></div>`).join("")}</div>`);
}

/* ---------- anteprima della presentazione ---------- */
let deck=null; // {ver,S,list,items}
function buildDeck(){
  if(deck&&deck.ver===ver&&deck.app===META.appendix) return deck;
  const Sx=D.context(P,Object.assign({},META,{name:META.name||FM.scenName(P)[1]}));
  const list=D.build(Sx); const items=list.map((fn,i)=>{ const so=new FMD.SvgOut(); const c=new FMD.Canvas(so); fn(c,Sx,i+1); return {svg:so.done(),info:c.info||{tag:"",title:""}}; });
  deck={ver,app:META.appendix,S:Sx,list,items}; return deck;
}
function tabDeck(){
  return card("Presentazione","Anteprima delle slide che il pulsante «Salva scenario» esporta in PDF. Si aggiorna con i parametri.",`<div id="deckwrap"><div class="busy"><span class="spin"></span><span>Compongo la presentazione…</span></div></div>`);
}
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

const TABS=[["over","Panoramica",tabOver],["tour","Turismo",tabTour],["ops","Operatori e casa",tabOps],["bud","Bilancio e dividendo",tabBud],["who","Chi paga",tabWho],["lab","Lavoro",tabLab],["path","Percorso e scenari",tabPath],["sens","Sensibilità",tabSens],["chk","Verifiche",tabChk],["deck","Presentazione",tabDeck]];
function renderTabs(){ $("#tabs").innerHTML=TABS.map(t=>`<button type="button" role="tab" data-tab="${t[0]}" aria-selected="${t[0]===UI.tab}">${t[1]}</button>`).join(""); }
function renderTab(){
  const t=TABS.find(x=>x[0]===UI.tab)||TABS[0]; $$("#tabs [data-tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===UI.tab)));
  const sy=window.scrollY; $("#tabbody").innerHTML=t[2](); paintCharts(); if(UI.tab==="deck") setTimeout(paintDeck,20); window.scrollTo(0,sy);
}

/* ---------- aggiornamento ---------- */
let tmr=null;
function changed(){ ver++; R=FM.run(P); persist(); renderKpis(); markScen(); clearTimeout(tmr); const heavy=["sens","path","deck","chk"].includes(UI.tab); tmr=setTimeout(()=>{ renderTab(); setTimeout(renderBadge,10); },heavy?140:40); }

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
  $("#f-name").value=META.name||FM.scenName(P)[1]; $("#f-aud").value=META.audience; $("#f-auth").value=META.author; $("#f-app").checked=META.appendix!==false; $("#f-msg").textContent=""; $("#f-busy").hidden=true; $("#f-go").disabled=false;
  updEst(); $("#saveModal").hidden=false; $("#f-name").focus();
}
function updEst(){ const n=D.build({SAN:A.SAN,meta:{appendix:$("#f-app").checked}}).length; $("#f-est").textContent=`${n} slide in formato 16:9, vettoriali, con testo selezionabile.`; }
async function doSave(){
  META.name=$("#f-name").value.trim(); META.audience=$("#f-aud").value.trim()||"Commissione consiliare e forze politiche"; META.author=$("#f-auth").value.trim(); META.appendix=$("#f-app").checked; persist();
  const busy=t=>{ $("#f-busy").hidden=false; $("#f-busytxt").textContent=t; };
  $("#f-go").disabled=true; $("#f-msg").textContent="";
  try{
    busy("Calcolo incertezza e sensibilità…"); await tick();
    const Sx=D.context(P,Object.assign({},META,{name:META.name||FM.scenName(P)[1]}));
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
  try{ const st=await deliver(`dividendo-firenze-parametri-${slug(META.name||FM.scenName(P)[1])}-${today()}.json`,new Blob([JSON.stringify(P,null,1)],{type:"application/json"}),"application/json"); if(st!=="declined"){ $("#f-msg").textContent="Parametri salvati."; } }
  catch(e){ $("#f-msg").textContent=e.message||"Salvataggio non riuscito"; }
}

/* ---------- eventi ---------- */
renderScen(); renderTabs();
$("#tabs").addEventListener("click",e=>{ const b=e.target.closest("[data-tab]"); if(!b) return; UI.tab=b.dataset.tab; persist(); renderTab(); });
$("#tabbody").addEventListener("click",e=>{ const b=e.target.closest("[data-go]"); if(b){ UI.tab=b.dataset.go; persist(); renderTab(); window.scrollTo({top:0}); } });
$("#ptoggle").onclick=()=>{ const o=!$(".params").classList.contains("open"); $(".params").classList.toggle("open",o); $("#ptoggle").setAttribute("aria-expanded",String(o)); };
$("#pt-leve").onclick=()=>showPanel("leve"); $("#pt-ip").onclick=()=>showPanel("ip");
$("#chkbadge").onclick=()=>{ UI.tab="chk"; persist(); renderTab(); };
$("#btnSave").onclick=openSave; $("#f-cancel").onclick=()=>{ $("#saveModal").hidden=true; $("#btnSave").focus(); };
$("#f-go").onclick=doSave; $("#f-json").onclick=saveJson; $("#f-app").onchange=updEst;
$("#saveModal").addEventListener("keydown",e=>{ if(e.key==="Escape"){ $("#saveModal").hidden=true; $("#btnSave").focus(); } });
$("#saveModal").addEventListener("click",e=>{ if(e.target.id==="saveModal") $("#saveModal").hidden=true; });
$("#btnReset").onclick=()=>{ P=FM.defaults(); META.name=""; showPanel(UI.ptab); changed(); toast("Parametri ripristinati"); };
$("#btnExport").onclick=async()=>{ try{ await deliver(`dividendo-firenze-parametri-${today()}.json`,new Blob([JSON.stringify(P,null,1)],{type:"application/json"}),"application/json"); }catch(e){ toast(e.message||"Salvataggio non riuscito"); } };
$("#btnImport").onclick=()=>$("#fileImport").click();
$("#fileImport").onchange=e=>{ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const o=JSON.parse(rd.result); P=FM.merge(FM.defaults(),o.P||o); META.name=""; showPanel(UI.ptab); changed(); toast("Parametri importati"); }catch(x){ toast("Il file non è un JSON valido"); } }; rd.readAsText(f); e.target.value=""; };
let rt=null; new ResizeObserver(()=>{ clearTimeout(rt); rt=setTimeout(paintCharts,90); }).observe($("#tabbody"));
window.addEventListener("beforeunload",persist);

showPanel(UI.ptab); markScen(); renderKpis(); renderTab(); setTimeout(renderBadge,30);
window.__app={P:()=>P,R:()=>R,A,S,META,setP:(o)=>{ Object.assign(P,o); changed(); syncPanel(); },openSave,doSave,UI,renderTab,buildDeck};
})();
