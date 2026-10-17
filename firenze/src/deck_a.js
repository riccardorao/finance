/* Presentazione: formattazione, componenti e grafici (parte A) */
(function(root){
"use strict";
const {W,H}=root.FMD;
const ML=60, MR=60, CW=W-ML-MR;
const C={navy:"#0B2545",ink:"#1B2A3A",gray:"#5E6B78",lgray:"#C9D1D9",xl:"#E8ECF0",panel:"#F4F6F9",blue:"#1F5FAE",lblue:"#9DBCE3",pblue:"#E6EEF8",orange:"#D0571B",lorange:"#F4CDB8",pos:"#1D6B3E",neg:"#B3261E",white:"#FFFFFF"};

/* ---------- formattazione it-IT ---------- */
const mk=d=>{ try{ return new Intl.NumberFormat("it-IT",{minimumFractionDigits:d,maximumFractionDigits:d,useGrouping:"always"}); }catch(e){ return new Intl.NumberFormat("it-IT",{minimumFractionDigits:d,maximumFractionDigits:d}); } };
const NF=[mk(0),mk(1),mk(2),mk(3)];
const n0=x=>NF[0].format(Math.round(x)), n1=x=>NF[1].format(x), n2=x=>NF[2].format(x);
const MIN="−";
const sg=x=>x<0?MIN:"";
const fM=(x,d)=>{ const a=Math.abs(x); const s=x<-500?MIN:""; if(a<95e3&&a>0) return s+"€"+n0(a/1e3)+" mila"; const v=d!==undefined?NF[d].format(a/1e6):(a>=1e8?NF[0]:NF[1]).format(a/1e6); return s+"€"+v+" mln"; };
const fMs=x=>{ const a=Math.abs(x); const s=x>=0?"+":MIN; if(a<95e3) return s+"€"+n0(a/1e3)+" mila"; return s+"€"+n1(a/1e6)+" mln"; };
const fE=x=>(x<0?MIN:"")+"€"+n0(Math.abs(x));
const fE2=x=>(x<0?MIN:"")+"€"+n2(Math.abs(x));
const fP=(x,d=1)=>NF[d].format(x*100)+"%";
const fPs=(x,d=1)=>(x>=0?"+":MIN)+NF[d].format(Math.abs(x*100))+"%";
const fN=x=>(x<0?MIN:"")+n0(Math.abs(x));
const fNs=x=>(x>=0?"+":MIN)+n0(Math.abs(x));
const fMn=x=>n2(x/1e6)+" mln";
const fMn1=x=>n1(x/1e6)+" mln";
const fMc=x=>isFinite(x)?n2(x):"n.d.";

/* ---------- componenti ---------- */
function frame(c,S,n,o){
  c.info={tag:o.tag,title:o.title};
  c.rect(0,0,W,H,{fill:C.white});
  c.t1(o.tag.toUpperCase(),ML,40,{font:"sansB",size:11.5,color:C.blue});
  let size=27,lh=33; const probe=sz=>c.textH(o.title,{font:"serifSB",size:sz,maxWidth:1130,lh:Math.round(sz*1.22)}).lines;
  while(probe(size)>2&&size>21) size-=1.5;
  lh=Math.round(size*1.22);
  c.text(o.title,ML,76,{font:"serifSB",size,color:C.navy,maxWidth:1130,lh});
  c.line(ML,130,W-MR,130,{stroke:C.lgray,sw:1});
  c.line(ML,672,W-MR,672,{stroke:C.xl,sw:1});
  let y=689; (o.notes?[o.notes]:[]).concat(o.source?["Fonte: "+o.source]:[]).forEach(t=>{ const r=c.text(t,ML,y,{size:9.5,color:C.gray,maxWidth:960,lh:12.5}); y+=r.h+1; });
  c.t1("Il Dividendo di Firenze  ·  "+S.name,W-MR-26,698,{size:9.5,color:C.gray,anchor:"end"});
  c.t1(String(n),W-MR,698,{font:"sansB",size:11,color:C.navy,anchor:"end"});
}
function callout(c,x,y,w,h,head,body,o){ o=o||{};
  c.rect(x,y,w,h,{fill:C.pblue}); c.rect(x,y,4,h,{fill:C.navy});
  c.t1(head.toUpperCase(),x+20,y+26,{font:"sansB",size:11,color:C.blue});
  c.text(body,x+20,y+51,{size:o.size||14,color:C.ink,maxWidth:w-40,lh:o.lh||19.5});
}
function calloutH(c,w,body,o){ o=o||{}; const r=c.textH(body,{size:o.size||14,maxWidth:w-40,lh:o.lh||19.5}); return r.h+68; }
function kpi(c,x,y,w,h,value,label,sub,o){ o=o||{}; const size=o.size||32;
  c.rect(x,y,w,h,{fill:o.fill||C.panel});
  const lh=c.textH(label,{size:11.5,maxWidth:w-32,lh:14}), sh=sub?c.textH(sub,{size:11.5,maxWidth:w-32,lh:13.5}):{h:0};
  const block=lh.h+10+size*.95+(sub?8+sh.h:0), top=Math.max(14,(h-block)/2);
  c.text(label,x+16,y+top+11,{font:"sansB",size:11.5,color:C.gray,maxWidth:w-32,lh:14});
  const vy=y+top+lh.h+10+size*.8; c.t1(value,x+16,vy,{font:"serifSB",size,color:o.color||C.navy});
  if(sub) c.text(sub,x+16,vy+8+12,{size:11.5,color:C.gray,maxWidth:w-32,lh:13.5});
}
function bullets(c,x,y,w,items,o){ o=o||{}; const size=o.size||14.5, gap=o.gap||10, lh=o.lh||Math.round(size*1.36); let yy=y;
  items.forEach(t=>{ c.rect(x,yy-size*.62,6,6,{fill:o.color||C.blue}); const r=c.text(t,x+18,yy,{size,color:C.ink,maxWidth:w-18,lh}); yy+=r.h+gap; });
  return yy-y-gap; }
function numbered(c,x,y,w,items,o){ o=o||{}; const size=o.size||14.5, gap=o.gap||14, lh=Math.round(size*1.36); let yy=y;
  items.forEach((t,i)=>{ c.circle(x+11,yy-size*.32,11,{fill:C.navy}); c.t1(String(i+1),x+11,yy-size*.32+4.5,{font:"sansB",size:12.5,color:C.white,anchor:"middle"}); const r=c.text(t,x+34,yy,{size,color:C.ink,maxWidth:w-34,lh}); yy+=Math.max(r.h,24)+gap; });
  return yy-y-gap; }
function chartTitle(c,x,y,w,title,unit){
  c.t1(title,x,y,{font:"sansB",size:14,color:C.navy});
  if(unit){ const tw=c.measure(title,"sansB",14); c.t1("  "+unit,x+tw,y,{size:12.5,color:C.gray}); }
  c.line(x,y+9,x+w,y+9,{stroke:C.navy,sw:1.2});
}
/* tabella: cols [{h,w,a}] ; rows array di array (stringa | {t,b,c,fill,f}) ; o: {rh,hh,size,hl:[indici],fills} */
function table(c,x,y,cols,rows,o){ o=o||{}; const rh=o.rh||27, hh=o.hh||30, size=o.size||12.5;
  const tw=cols.reduce((a,k)=>a+k.w,0);
  const cellX=(k,i,ccx)=>k.a==="r"?ccx+k.w-8:k.a==="c"?ccx+k.w/2:ccx+8;
  const an=k=>k.a==="r"?"end":k.a==="c"?"middle":"start";
  let cx=x; cols.forEach((k,i)=>{ if(k.h){ const r=c.text(k.h,cellX(k,i,cx),y+hh-10-(c.textH(k.h,{font:"sansB",size:size-1,maxWidth:k.w-14,lh:13}).lines-1)*13,{font:"sansB",size:size-1,color:C.navy,anchor:an(k),maxWidth:k.w-14,lh:13}); } cx+=k.w; });
  c.line(x,y+hh,x+tw,y+hh,{stroke:C.navy,sw:1.4});
  let yy=y+hh;
  rows.forEach((row,ri)=>{
    const isHl=o.hl&&o.hl.includes(ri), fill=(row.fill)||(isHl?C.pblue:null);
    const rhi=row.rh||rh;
    if(fill) c.rect(x,yy,tw,rhi,{fill});
    let cx2=x;
    const cells=row.cells||row;
    cols.forEach((k,i)=>{ const cell=cells[i]; const t=typeof cell==="object"&&cell!==null?cell.t:cell; if(t===undefined||t===null||t==="") { cx2+=k.w; return; }
      const b=(typeof cell==="object"&&cell.b)||row.b||false, col=(typeof cell==="object"&&cell.c)||row.c||C.ink;
      c.text(String(t),cellX(k,i,cx2),yy+rhi/2+4.3,{font:b?"sansB":"sans",size,color:col,anchor:an(k),maxWidth:k.w-14,lh:size*1.25});
      cx2+=k.w; });
    yy+=rhi;
    c.line(x,yy,x+tw,yy,{stroke:ri===rows.length-1?C.navy:C.xl,sw:ri===rows.length-1?1:.8});
  });
  return yy; }
function chip(c,x,y,label,kind){ const col=kind==="ok"?C.pos:kind==="bad"?C.neg:"#8A5A00"; const w=c.measure(label,"sansB",10.5)+16;
  c.rect(x,y-12,w,18,{stroke:col,sw:1.2,r:9}); c.t1(label,x+8,y+1,{font:"sansB",size:10.5,color:col}); return w; }

/* ---------- grafici ---------- */
/* barre orizzontali a coppie (oggi / dopo) */
function hBarPairs(c,x,y,w,rows,o){ o=o||{};
  const labelW=o.labelW||200, valW=o.valW||110, rowH=o.rowH||46, bh=o.bh||12, bx=x+labelW, bw=w-labelW-valW;
  const max=o.max||Math.max(...rows.map(r=>Math.max(r.a||0,r.b||0)))*1.03;
  const X=v=>bx+Math.max(0,v)/max*bw;
  rows.forEach((r,i)=>{ const yy=y+i*rowH;
    c.text(r.label,x,yy+rowH/2+(r.sub?-1:5),{size:13.5,font:"sansSB",color:C.ink,maxWidth:labelW-14,lh:15});
    if(r.sub) c.t1(r.sub,x,yy+rowH/2+15,{size:11,color:C.gray});
    c.rect(bx,yy+rowH/2-bh-1.5,Math.max(1,X(r.a)-bx),bh,{fill:C.lgray});
    c.rect(bx,yy+rowH/2+1.5,Math.max(1,X(r.b)-bx),bh,{fill:o.color||C.blue});
    const ex=Math.max(X(r.a),X(r.b))+8;
    c.t1(o.fmt?o.fmt(r.a):String(r.a),X(r.a)+8,yy+rowH/2-bh/2+1.5,{size:11.5,color:C.gray});
    c.t1((o.fmt?o.fmt(r.b):String(r.b)),X(r.b)+8,yy+rowH/2+bh/2+5.5,{font:"sansB",size:12.5,color:C.navy});
    if(r.tag) c.t1(r.tag,x+w,yy+rowH/2+5,{font:"sansB",size:12.5,color:r.tagColor||C.navy,anchor:"end"});
    if(i<rows.length-1) c.line(x,yy+rowH,x+w,yy+rowH,{stroke:C.xl,sw:.8});
  });
  return rows.length*rowH;
}
/* barre semplici orizzontali (una serie), valori anche negativi */
function hBars(c,x,y,w,rows,o){ o=o||{};
  const labelW=o.labelW||220, valW=o.valW||90, rowH=o.rowH||34, bh=o.bh||16, bx=x+labelW, bw=w-labelW-valW;
  const vmin=Math.min(0,...rows.map(r=>r.v)), vmax=Math.max(0,...rows.map(r=>r.v)); const span=(vmax-vmin)||1;
  const X=v=>bx+(v-vmin)/span*bw;
  const zero=X(0);
  rows.forEach((r,i)=>{ const yy=y+i*rowH;
    c.text(r.label,x,yy+rowH/2+4.5,{size:13,font:r.b?"sansB":"sans",color:C.ink,maxWidth:labelW-12,lh:14});
    const x1=Math.min(zero,X(r.v)), wd=Math.abs(X(r.v)-zero);
    c.rect(x1,yy+(rowH-bh)/2,Math.max(1,wd),bh,{fill:r.color||(r.v<0?C.orange:C.blue)});
    const lab=o.fmt?o.fmt(r.v):String(r.v);
    if(r.v>=0) c.t1(lab,X(r.v)+7,yy+rowH/2+4.5,{font:"sansB",size:12.5,color:C.navy}); else c.t1(lab,X(r.v)-7,yy+rowH/2+4.5,{font:"sansB",size:12.5,color:C.navy,anchor:"end"});
  });
  if(vmin<0) c.line(zero,y,zero,y+rows.length*rowH,{stroke:C.gray,sw:1});
  return rows.length*rowH;
}
/* barre divergenti con gruppi */
function diverging(c,x,y,w,groups,o){ o=o||{};
  const labelW=o.labelW||250, rowH=o.rowH||31, gh=o.gh||26, bh=o.bh||17;
  const all=groups.flatMap(g=>g.rows); const vmin=Math.min(0,...all.map(r=>r.v)), vmax=Math.max(0,...all.map(r=>r.v));
  const bx=x+labelW, bw=w-labelW-8, padL=64, padR=64; const span=(vmax-vmin)||1; const sc=(bw-padL-padR)/span;
  const zero=bx+padL+(-vmin)*sc;
  let yy=y; const ys=[];
  groups.forEach(g=>{
    c.t1(g.title.toUpperCase(),x,yy+16,{font:"sansB",size:11,color:C.blue}); c.line(x,yy+22,x+w,yy+22,{stroke:C.lgray,sw:.8}); yy+=gh;
    g.rows.forEach(r=>{
      c.text(r.label,x,yy+rowH/2+4.5,{size:13,color:C.ink,maxWidth:labelW-14,lh:14});
      const wd=Math.abs(r.v)*sc, x1=r.v<0?zero-wd:zero;
      c.rect(x1,yy+(rowH-bh)/2,Math.max(1,wd),bh,{fill:r.color||(r.v<0?C.orange:C.blue)});
      const lab=fMs(r.v).replace(/ mln/,"");
      if(r.v>=0) c.t1(fMs(r.v),x1+wd+7,yy+rowH/2+4.5,{font:"sansB",size:12.5,color:C.navy}); else c.t1(fMs(r.v),x1-7,yy+rowH/2+4.5,{font:"sansB",size:12.5,color:C.navy,anchor:"end"});
      yy+=rowH; });
    yy+=6;
  });
  c.line(zero,y+gh-2,zero,yy-6,{stroke:C.gray,sw:1});
  return yy-y;
}
/* cascata verticale: steps [{label,v,t:'d'|'s'}] */
function waterfall(c,x,y,w,h,steps,o){ o=o||{};
  const labH=o.labH||70, top=26, plotH=h-labH-top, n=steps.length, colW=w/n, bw=Math.min(colW*.62,64);
  let cum=0; const pts=steps.map(s=>{ if(s.t==="s"){ return {s,a:0,b:s.v!==undefined?s.v:cum,tot:true}; } const a=cum; cum+=s.v; return {s,a,b:cum}; });
  pts.forEach(p=>{ if(p.tot) cum=p.b; });
  const lo=Math.min(0,...pts.map(p=>Math.min(p.a,p.b))), hi=Math.max(0,...pts.map(p=>Math.max(p.a,p.b)));
  const span=(hi-lo)||1, Y=v=>y+top+(hi-v)/span*plotH;
  const tk=root.FMD.ticks(lo,hi,4);
  tk.ticks.forEach(t=>{ c.line(x,Y(t),x+w,Y(t),{stroke:C.xl,sw:.8}); c.t1(o.axisFmt?o.axisFmt(t):String(t),x-8,Y(t)+4,{size:10.5,color:C.gray,anchor:"end"}); });
  c.line(x,Y(0),x+w,Y(0),{stroke:C.gray,sw:1});
  pts.forEach((p,i)=>{ const cx=x+colW*i+colW/2, x0=cx-bw/2, ya=Y(p.a), yb=Y(p.b);
    const up=p.b>=p.a, col=p.tot?C.navy:(up?C.blue:C.orange);
    const yt=Math.min(ya,yb), hh=Math.max(1.5,Math.abs(ya-yb));
    c.rect(x0,yt,bw,hh,{fill:col});
    const val=p.tot?o.fmt(p.b):o.fmtS(p.s.v);
    if(p.tot||up) c.t1(val,cx,yt-7,{font:"sansB",size:12.5,color:C.navy,anchor:"middle"}); else c.t1(val,cx,yt+hh+15,{font:"sansB",size:12.5,color:C.navy,anchor:"middle"});
    if(i<pts.length-1){ const nx=x+colW*(i+1)+colW/2-bw/2; c.line(x0+bw,Y(p.b),nx,Y(p.b),{stroke:C.gray,sw:.8,dash:[3,3]}); }
    c.text(p.s.label,cx,y+h-labH+18,{size:11.5,color:p.tot?C.navy:C.ink,font:p.tot?"sansB":"sans",anchor:"middle",maxWidth:colW-8,lh:13.5});
  });
}
/* colonne verticali: cols [{label,v,c?}] */
function columns(c,x,y,w,h,cols,o){ o=o||{};
  const n=cols.length, colW=w/n, bw=Math.min(colW*.58,o.maxBw||90), top=24, labH=Math.max(o.labH||56,56), plotH=h-top-labH;
  const lo=Math.min(0,...cols.map(k=>k.v)), hi=Math.max(0,...cols.map(k=>k.v)); const span=(hi-lo)||1; const Y=v=>y+top+(hi-v)/span*plotH;
  const tk=root.FMD.ticks(lo,hi,4);
  tk.ticks.forEach(t=>{ c.line(x,Y(t),x+w,Y(t),{stroke:C.xl,sw:.8}); c.t1(o.axisFmt?o.axisFmt(t):String(t),x-8,Y(t)+4,{size:10.5,color:C.gray,anchor:"end"}); });
  c.line(x,Y(0),x+w,Y(0),{stroke:C.gray,sw:1});
  cols.forEach((k,i)=>{ const cx=x+colW*i+colW/2; const y0=Y(0), y1=Y(k.v), yt=Math.min(y0,y1), hh=Math.max(1.5,Math.abs(y0-y1));
    c.rect(cx-bw/2,yt,bw,hh,{fill:k.c||(k.v<0?C.orange:C.blue)});
    const lab=o.fmt(k.v); if(k.v>=0) c.t1(lab,cx,yt-7,{font:"sansB",size:12.5,color:C.navy,anchor:"middle"}); else c.t1(lab,cx,yt+hh+15,{font:"sansB",size:12.5,color:C.navy,anchor:"middle"});
    c.text(k.label,cx,y+h-labH+38,{size:12,color:C.ink,anchor:"middle",maxWidth:colW-6,lh:13.5});
  });
}
/* funzione d'imposta, scale logaritmiche */
function taxFunction(c,x,y,w,h,S){
  const P=S.P,R=S.R, m={l:46,r:12,t:12,b:40}, px=x+m.l, pw=w-m.l-m.r, py=y+m.t, ph=h-m.t-m.b;
  const x0=Math.log(20),x1=Math.log(1500),y0=Math.log(2); const capV=P.cap>0?P.cap:P.alpha*1500; const yMax=Math.max(60,capV*1.15,P.tmin*1.6), y1=Math.log(yMax);
  const X=v=>px+(Math.log(v)-x0)/(x1-x0)*pw, Y=v=>py+ph-(Math.log(Math.max(2,v))-y0)/(y1-y0)*ph;
  [20,50,100,200,500,1000].forEach(t=>{ c.line(X(t),py,X(t),py+ph,{stroke:C.xl,sw:.8}); c.t1("€"+n0(t),X(t),py+ph+17,{size:10.5,color:C.gray,anchor:"middle"}); });
  [2,5,10,20,50,100,200,500,1000,2000].filter(t=>t<=yMax).forEach(t=>{ c.line(px,Y(t),px+pw,Y(t),{stroke:C.xl,sw:.8}); c.t1("€"+n0(t),px-7,Y(t)+4,{size:10.5,color:C.gray,anchor:"end"}); });
  c.t1("Prezzo della camera per persona e per notte (scala logaritmica)",px+pw/2,py+ph+34,{size:11,color:C.gray,anchor:"middle"});
  c.t1("Imposta per notte",x+10,py+ph/2,{size:11,color:C.gray,anchor:"middle",rot:-90});
  // tariffa attuale: scalini medi per tipologia come linea tratteggiata
  const curve=Q=>{ let d=""; for(let i=0;i<=140;i++){ const p=Math.exp(x0+(x1-x0)*i/140); d+=(i?"L":"M")+X(p).toFixed(1)+","+Y(root.FM.taxNew(Q,p)).toFixed(1); } return d; };
  const n=P.plan?P.plan.n:1;
  // etichette degli anni all'estremo destro, dove le curve si separano (o al centro se coincidono)
  const pe=Math.exp(x1-.02*(x1-x0)), lab=[];
  for(let yy=1;yy<n;yy++){ const L=root.FM.levers(P,yy); c.path(curve(L),{stroke:C.lblue,sw:1.4,dash:[5,4]}); lab.push({t:String(P.plan.start+yy-1),y:Y(root.FM.taxNew(L,pe)),b:0}); }
  c.path(curve(P),{stroke:C.navy,sw:2.6});
  if(n>1){ lab.push({t:"Obiettivo",y:Y(root.FM.taxNew(P,pe)),b:1}); let last=1e9; lab.sort((a,b)=>b.y-a.y).forEach(l=>{ const yy=Math.min(l.y+14,last-12); c.t1(l.t,X(pe),yy,{font:l.b?"sansB":"sans",size:10.5,color:l.b?C.navy:C.gray,anchor:"end"}); last=yy; }); }
  const ps=P.alpha>0?P.tmin/P.alpha:Infinity;
  if(ps>20&&ps<1500&&(!(P.cap>0)||P.cap>P.tmin)){ c.line(X(ps),Y(P.tmin),X(ps),py+ph,{stroke:C.navy,sw:1,dash:[4,4]}); c.t1("p* = €"+n0(ps),X(ps)+6,Y(P.tmin)+17,{font:"sansB",size:11.5,color:C.navy}); }
  const off={young:[-10,-12,"end"],budget:[-10,-12,"end"],mass:[-7,-14,"end"],upper:[-8,-14,"end"],lux:[-12,-10,"end"]};
  R.segs.forEach((s,i)=>{ const cx=X(s.price), yo=Y(s.tOld), yn=s.exempt?Y(2):Y(s.tMed);
    c.line(cx,yo,cx,yn,{stroke:C.blue,sw:1.6,dash:s.exempt?[3,3]:null});
    c.circle(cx,yo,5,{fill:C.white,stroke:C.gray,sw:1.8});
    c.circle(cx,yn,6,{fill:C.blue,stroke:C.white,sw:1.5});
    const o=off[s.id]; c.t1(s.short+(s.exempt?" · esente":s.youth?" · €"+n1(s.tMed).replace(/,0$/,""):""),cx+o[0],yn+o[1],{font:"sansB",size:11.5,color:C.blue,anchor:o[2]});
  });
}
/* distribuzione del premio R */
function densityR(c,x,y,w,h,S){
  const P=S.P,R=S.R,m={l:8,r:8,t:44,b:36}, px=x+m.l, pw=w-m.l-m.r, py=y+m.t, ph=h-m.t-m.b; const lo=.4,hi=3.6;
  const X=v=>px+(v-lo)/(hi-lo)*pw;
  const pdf=v=>{const z=(Math.log(v)-Math.log(P.strPremium))/P.premSigma;return Math.exp(-z*z/2)/(v*P.premSigma*Math.sqrt(2*Math.PI));};
  let ym=0; for(let i=0;i<=200;i++) ym=Math.max(ym,pdf(lo+(hi-lo)*i/200)); const Y=v=>py+ph-v/ym*ph;
  const area=(a,b)=>{ a=Math.max(lo,a); b=Math.min(hi,b); if(b<=a) return ""; let d=`M${X(a).toFixed(1)},${Y(0).toFixed(1)}`; for(let i=0;i<=80;i++){ const v=a+(b-a)*i/80; d+=`L${X(v).toFixed(1)},${Y(pdf(v)).toFixed(1)}`; } return d+`L${X(b).toFixed(1)},${Y(0).toFixed(1)}Z`; };
  [.5,1,1.5,2,2.5,3,3.5].forEach(t=>c.t1(n1(t)+"×",X(t),py+ph+16,{size:10.5,color:C.gray,anchor:"middle"}));
  c.t1("R = reddito netto dell'affitto breve ÷ reddito netto della locazione",px+pw/2,py+ph+31,{size:11,color:C.gray,anchor:"middle"});
  c.path(area(R.c0,hi),{fill:C.lgray});
  c.path(area(R.c0,R.thr),{fill:C.orange});
  let d=""; for(let i=0;i<=160;i++){ const v=lo+(hi-lo)*i/160; d+=(i?"L":"M")+X(v).toFixed(1)+","+Y(pdf(v)).toFixed(1); }
  c.path(d,{stroke:C.gray,sw:1.4}); c.line(px,Y(0),px+pw,Y(0),{stroke:C.gray,sw:1});
  c.line(X(R.c0),py-14,X(R.c0),Y(0),{stroke:C.navy,sw:1,dash:[3,3]});
  c.t1("Soglia oggi "+n2(R.c0)+"×",X(R.c0)-6,py-18,{size:11.5,color:C.navy,anchor:"end"});
  if(R.thr>R.c0+.005){ c.line(X(R.thr),py-4,X(R.thr),Y(0),{stroke:C.orange,sw:1.6}); c.t1("Dopo la riforma "+n2(R.thr)+"×",X(R.thr)+6,py-8,{font:"sansB",size:11.5,color:C.orange}); }
  c.t1("Convertono: "+fN(R.units)+" appartamenti",X(Math.min(hi,(R.c0+R.thr)/2))+(R.thr-R.c0<.3?44:0),py+ph*0.5,{font:"sansB",size:11.5,color:C.orange,anchor:"start"});
}
/* tornado */
function tornadoChart(c,x,y,w,rows,o){ o=o||{};
  const labelW=o.labelW||230, rowH=o.rowH||34, top=26, n=rows.length;
  const base=rows[0].base; const lo=Math.min(base,...rows.map(r=>Math.min(r.lo,r.hi))), hi=Math.max(base,...rows.map(r=>Math.max(r.lo,r.hi))); const pad=(hi-lo)*.2||1e6;
  const bx=x+labelW, bw=w-labelW-70; const X=v=>bx+(v-lo+pad)/((hi-lo)+2*pad)*bw;
  c.line(X(base),y+top-8,X(base),y+top+n*rowH,{stroke:C.navy,sw:1.5});
  c.t1("Scenario: "+fM(base),X(base),y+top-14,{font:"sansB",size:12,color:C.navy,anchor:"middle"});
  rows.forEach((r,i)=>{ const yy=y+top+i*rowH;
    c.text(r.label,x,yy+rowH/2+4.5,{size:13,color:C.ink,maxWidth:labelW-14,lh:14});
    [[r.lo,r.loL],[r.hi,r.hiL]].forEach(([v,l])=>{ const x1=X(Math.min(v,base)), x2=X(Math.max(v,base));
      c.rect(x1,yy+7,Math.max(1,x2-x1),rowH-14,{fill:v>=base?C.blue:C.orange});
      if(v>=base) c.t1(l,x2+6,yy+rowH/2+4,{size:11.5,color:C.gray}); else c.t1(l,x1-6,yy+rowH/2+4,{size:11.5,color:C.gray,anchor:"end"}); });
    if(i<n-1) c.line(x,yy+rowH,x+w-70,yy+rowH,{stroke:C.xl,sw:.6});
  });
  return top+n*rowH;
}
/* mappa delle scelte: gettito (saldo) vs variazione dei pernottamenti */
function frontier(c,x,y,w,h,S){
  const m={l:56,r:16,t:16,b:46}, px=x+m.l, pw=w-m.l-m.r, py=y+m.t, ph=h-m.t-m.b;
  const pts=S.MAP.pts; const xs=pts.map(p=>-p.nChg*100), ys=pts.map(p=>p.saldo/1e6);
  const xmax=Math.max(...xs)*1.06, xmin=Math.min(0,Math.min(...xs)*1.1), ymax=Math.max(...ys)*1.08, ymin=Math.min(0,Math.min(...ys)*1.1);
  const X=v=>px+(v-xmin)/(xmax-xmin)*pw, Y=v=>py+ph-(v-ymin)/(ymax-ymin)*ph;
  const tx=root.FMD.ticks(xmin,xmax,5), ty=root.FMD.ticks(ymin,ymax,5);
  tx.ticks.forEach(t=>{ c.line(X(t),py,X(t),py+ph,{stroke:C.xl,sw:.8}); c.t1(n0(t)+"%",X(t),py+ph+17,{size:10.5,color:C.gray,anchor:"middle"}); });
  ty.ticks.forEach(t=>{ c.line(px,Y(t),px+pw,Y(t),{stroke:C.xl,sw:.8}); c.t1(n0(t),px-8,Y(t)+4,{size:10.5,color:C.gray,anchor:"end"}); });
  c.t1("Riduzione dei pernottamenti",px+pw/2,py+ph+36,{size:11.5,color:C.gray,anchor:"middle"});
  c.t1("Saldo strutturale, € mln",x+12,py+ph/2,{size:11.5,color:C.gray,anchor:"middle",rot:-90});
  // linee per aliquota alpha
  let lastLy=-1e9; S.MAP.aList.slice().reverse().forEach(a=>{ const row=pts.filter(p=>p.a===a).sort((p,q)=>p.t-q.t); let d=""; row.forEach((p,i)=>{ d+=(i?"L":"M")+X(-p.nChg*100).toFixed(1)+","+Y(p.saldo/1e6).toFixed(1); });
    c.path(d,{stroke:C.lblue,sw:1.2,op:.9});
    const last=row[row.length-1]; const ly=Y(last.saldo/1e6); if(ly>lastLy+14){ c.t1("α "+n0(a*100)+"%",X(-last.nChg*100)+6,ly+4,{size:10.5,color:C.gray}); lastLy=ly; } });
  pts.forEach(p=>c.circle(X(-p.nChg*100),Y(p.saldo/1e6),2.6,{fill:C.lblue}));
  // percorso del transitorio: ogni anno valutato a regime con le leve di quell'anno
  const pp=S.MAP.plan||[];
  if(pp.length>1){ let d=""; pp.forEach((p,i)=>{ d+=(i?"L":"M")+X(-p.nChg*100).toFixed(1)+","+Y(p.saldo/1e6).toFixed(1); }); c.path(d,{stroke:C.navy,sw:1.4,dash:[4,3]});
    pp.slice(0,-1).forEach(p=>{ const cx=X(-p.nChg*100), cy=Y(p.saldo/1e6); c.circle(cx,cy,5.5,{fill:C.white,stroke:C.navy,sw:1.6}); c.t1(String(p.year),cx-9,cy+4,{size:10.5,color:C.navy,anchor:"end"}); }); }
  const cx=X(-S.R.nChg*100), cy=Y(S.R.saldo/1e6); c.circle(cx,cy,8,{fill:C.orange,stroke:C.white,sw:1.5}); c.t1("Obiettivo",cx+12,cy-10,{font:"sansB",size:12,color:C.orange});
}
/* tabella a mappa di calore (matrice degli effetti) */
function heat(c,x,y,mat,o){ o=o||{};
  const labelW=o.labelW||210, colW=(o.w-labelW)/mat.cols.length, rowH=o.rowH||30, hh=o.hh||58;
  mat.cols.forEach((col,j)=>{ const cx=x+labelW+colW*j+colW/2; c.text(col.label,cx,y+hh-26-(c.textH(col.label,{font:"sansB",size:11,maxWidth:colW-8,lh:12.5}).lines-1)*12.5,{font:"sansB",size:11,color:C.navy,anchor:"middle",maxWidth:colW-8,lh:12.5}); c.t1("("+col.unit+")",cx,y+hh-6,{size:10,color:C.gray,anchor:"middle"}); });
  c.line(x,y+hh,x+o.w,y+hh,{stroke:C.navy,sw:1.4});
  const mx=mat.cols.map((_,j)=>Math.max(1e-9,...mat.rows.map(r=>Math.abs(r.cells[j]))));
  mat.rows.forEach((r,i)=>{ const yy=y+hh+i*rowH;
    c.text(r.label,x,yy+rowH/2+4.3,{size:12.5,font:"sansSB",color:C.ink,maxWidth:labelW-10,lh:13});
    c.t1(r.isAbs?("+"+n1(r.deltaLabel).replace(",0","")):"+10%",x+labelW-8,yy+rowH/2+4.3,{size:10,color:C.gray,anchor:"end"});
    r.cells.forEach((v,j)=>{ const cx=x+labelW+colW*j; const t=Math.abs(v)/mx[j]; const col=v>=0?C.blue:C.orange;
      if(Math.abs(v)>1e-9) c.rect(cx+2,yy+2,colW-4,rowH-4,{fill:col,op:.1+.62*Math.sqrt(t)});
      const d=mat.cols[j].d; const s=(v>=0?"+":MIN)+NF[Math.min(3,Math.max(0,Math.abs(v)<10&&d<1?1:d))].format(Math.abs(v));
      c.t1(Math.abs(v)<1e-9?"0":s,cx+colW/2,yy+rowH/2+4.3,{size:11.5,font:t>.55?"sansB":"sans",color:t>.62?C.white:C.ink,anchor:"middle"}); });
    c.line(x,yy+rowH,x+o.w,yy+rowH,{stroke:C.xl,sw:.6});
  });
  return hh+mat.rows.length*rowH;
}
/* diagramma di Gantt per le fasi */
function gantt(c,x,y,w,rows,o){ o=o||{};
  const labelW=o.labelW||250, cols=o.cols, cw=(w-labelW)/cols.length, rh=o.rowH||40, hh=30;
  cols.forEach((t,i)=>{ c.t1(t,x+labelW+cw*i+cw/2,y+19,{font:"sansB",size:11.5,color:C.navy,anchor:"middle"}); if(i>0) c.line(x+labelW+cw*i,y+2,x+labelW+cw*i,y+hh+rows.length*rh,{stroke:C.xl,sw:.8}); });
  c.line(x,y+hh,x+w,y+hh,{stroke:C.navy,sw:1.4});
  rows.forEach((r,i)=>{ const yy=y+hh+i*rh;
    c.text(r.label,x,yy+rh/2+4.3,{size:12.5,font:r.b?"sansB":"sans",color:C.ink,maxWidth:labelW-14,lh:14});
    (r.bars||[{from:r.from,to:r.to,color:r.color,text:r.text}]).forEach(b=>{ c.rect(x+labelW+cw*b.from+3,yy+9,cw*(b.to-b.from)-6,rh-18,{fill:b.color||C.blue,r:3}); if(b.text) c.t1(b.text,x+labelW+cw*b.from+11,yy+rh/2+4,{size:11,font:"sansB",color:b.color===C.lblue?C.navy:C.white}); });
    if(r.ms!==undefined){ const mx=x+labelW+cw*r.ms; c.path(`M${mx},${yy+rh/2-8} L${mx+8},${yy+rh/2} L${mx},${yy+rh/2+8} L${mx-8},${yy+rh/2} Z`,{fill:C.orange}); }
    c.line(x,yy+rh,x+w,yy+rh,{stroke:C.xl,sw:.6});
  });
  return hh+rows.length*rh;
}

/* serie annuale: o.labels [anni], o.series [{v:[],color,name,type:'line'|'bar',dash}], o.base (valore di oggi), o.shade (anni di transitorio), o.fmt, o.axisFmt */
function trend(c,x,y,w,h,o){
  const labels=o.labels, n=labels.length, m={l:o.ml!==undefined?o.ml:46,r:o.mr!==undefined?o.mr:62,t:o.legend?30:16,b:26};
  const px=x+m.l, pw=w-m.l-m.r, py=y+m.t, ph=h-m.t-m.b, slot=pw/n, X=i=>px+slot*(i+.5);
  const vals=o.series.flatMap(s=>s.v).concat(o.base!==undefined?[o.base]:[]).filter(v=>isFinite(v));
  let lo=Math.min(...vals), hi=Math.max(...vals);
  if(o.zero!==false){ lo=Math.min(0,lo); hi=Math.max(0,hi); }
  if(hi-lo<1e-9){ const a=Math.abs(hi)||1; hi+=a*.1; lo-=o.zero!==false&&lo>=0?0:a*.1; }
  const span=hi-lo; hi+=span*.1; if(!(o.zero!==false&&lo===0)) lo-=span*.1;
  const tk=root.FMD.ticks(lo,hi,4), Y=v=>py+(hi-v)/(hi-lo)*ph;
  if(o.shade>0){ c.rect(px,py,slot*o.shade,ph,{fill:C.panel}); c.t1("Transitorio",px+6,py+13,{font:"sansB",size:10,color:C.gray}); }
  tk.ticks.forEach(t=>{ c.line(px,Y(t),px+pw,Y(t),{stroke:C.xl,sw:.8}); c.t1(o.axisFmt?o.axisFmt(t):n0(t),px-7,Y(t)+4,{size:10,color:C.gray,anchor:"end"}); });
  if(lo<0&&hi>0) c.line(px,Y(0),px+pw,Y(0),{stroke:C.gray,sw:1});
  const step=n>12&&pw<520?3:n>8&&pw<420?2:1;
  labels.forEach((l,i)=>{ if(i%step===0) c.t1(String(l),X(i),py+ph+17,{size:10.5,color:C.gray,anchor:"middle"}); });
  if(o.base!==undefined){ c.line(px,Y(o.base),px+pw,Y(o.base),{stroke:C.gray,sw:1.1,dash:[4,3]}); c.t1("oggi",px+pw+5,Y(o.base)+4,{size:10,color:C.gray}); }
  const bars=o.series.filter(s=>s.type==="bar"), nb=bars.length, bw=Math.min(slot*.62/Math.max(1,nb),nb>1?18:30);
  bars.forEach((s,j)=>{ s.v.forEach((v,i)=>{ if(!isFinite(v)) return; const cx=X(i)-bw*nb/2+bw*j, y0=Y(Math.max(lo,Math.min(hi,0))), y1=Y(v); c.rect(cx+.5,Math.min(y0,y1),bw-1,Math.max(1,Math.abs(y1-y0)),{fill:s.color||C.blue}); }); });
  const ends=[];
  o.series.filter(s=>s.type!=="bar").forEach(s=>{ let d=""; s.v.forEach((v,i)=>{ if(isFinite(v)) d+=(d?"L":"M")+X(i).toFixed(1)+","+Y(v).toFixed(1); });
    c.path(d,{stroke:s.color||C.blue,sw:s.sw||2.2,dash:s.dash});
    s.v.forEach((v,i)=>{ if(isFinite(v)&&(n<=12||i===n-1)) c.circle(X(i),Y(v),s.dash?2:2.8,{fill:s.color||C.blue}); });
    const lv=s.v[n-1]; if(isFinite(lv)&&!o.noEnd) ends.push({y:Y(lv),t:o.fmt?o.fmt(lv):n1(lv),c:s.color||C.blue}); });
  bars.forEach(s=>{ const lv=s.v[n-1]; if(isFinite(lv)&&!o.noEnd&&o.endBars) ends.push({y:Y(lv),t:o.fmt?o.fmt(lv):n1(lv),c:s.color||C.blue}); });
  ends.sort((a,b)=>a.y-b.y); let last=-1e9; ends.forEach(e=>{ const yy=Math.max(e.y+4,last+13); c.t1(e.t,px+pw+(o.base!==undefined?30:6),yy,{font:"sansB",size:11,color:e.c}); last=yy; });
  if(o.legend){ let lx=px; o.series.forEach(s=>{ if(!s.name) return; if(s.type==="bar") c.rect(lx,y+6,10,10,{fill:s.color||C.blue}); else c.line(lx,y+11,lx+14,y+11,{stroke:s.color||C.blue,sw:2.4,dash:s.dash}); c.t1(s.name,lx+(s.type==="bar"?14:18),y+15,{size:10.5,color:C.ink}); lx+=(s.type==="bar"?14:18)+c.measure(s.name,"sans",10.5)+16; }); }
  return h;
}

/* ---------- costruttori condivisi tra slide e console ---------- */
/* serie dell'evoluzione nel tempo, condivise tra console e presentazione */
function evoDefs(S){
  const TL=S.TL,P=S.P,ys=TL.years,v=f=>ys.map(f),R=S.R;
  return [
    {key:"rev",title:"Gettito netto al Comune",unit:"€ mln all'anno",o:{series:[{v:v(y=>(y.R.net+y.R.dayFeeNet)/1e6),color:C.blue}],base:P.baseRevenue,zero:false,fmt:v=>n1(v)}},
    {key:"saldo",title:"Saldo e Fondo Armonizzatore",unit:"€ mln all'anno",o:{series:[{type:"bar",v:v(y=>y.R.saldo/1e6),color:C.blue,name:"Saldo"},{v:v(y=>y.R.fund/1e6),color:C.orange,name:"Spesa del Fondo"}],legend:true,fmt:v=>n1(v)}},
    {key:"div",title:"Dividendo per famiglia",unit:"€ all'anno",o:{series:[{v:v(y=>y.R.perHH),color:C.blue}],fmt:v=>fE(v)}},
    {key:"nights",title:"Pernottamenti",unit:"milioni di notti",o:{series:[{v:v(y=>y.R.nNew/1e6),color:C.blue}],base:R.nB/1e6,zero:false,fmt:v=>n2(v),axisFmt:v=>n1(v)}},
    {key:"vd",title:"Visitatori in un giorno medio",unit:"migliaia di persone",o:{series:[{v:v(y=>y.R.vdN/365/1e3),color:C.blue,name:"Totale"},{v:v(y=>y.R.dayV1/365/1e3),color:C.navy,dash:[4,3],name:"di cui escursionisti"}],base:R.vdB/365/1e3,legend:true,fmt:v=>n1(v)}},
    {key:"homes",title:"Case tornate ai residenti",unit:"abitazioni e persone",o:{series:[{type:"bar",v:v(y=>y.R.toRes),color:C.blue,name:"Abitazioni"},{v:v(y=>y.R.newRes),color:C.navy,name:"Nuovi residenti netti"}],legend:true,fmt:v=>n0(v),endBars:true}},
    {key:"rent",title:"Canone medio richiesto",unit:"€/m² al mese",o:{series:[{v:v(y=>P.rent*(1+y.R.rentChg)),color:C.blue}],base:P.rent,zero:false,fmt:v=>"€"+n2(v),axisFmt:v=>n1(v)}},
    {key:"jobs",title:"Occupazione",unit:"posti di lavoro rispetto a oggi",o:{series:[{type:"bar",v:v(y=>-y.R.jobsLost),color:C.orange,name:"Persi"},{type:"bar",v:v(y=>y.R.jobsGained),color:C.lblue,name:"Creati"},{v:v(y=>y.R.jobsNet),color:C.navy,name:"Saldo"}],legend:true,fmt:v=>(v<0?MIN:"+")+n0(Math.abs(v))}}
  ].map(d=>(d.o.labels=ys.map(y=>y.year),d.o.shade=TL.n-1,d));
}
/* valore di un'ipotesi con la sua unità */
function fmtParam(p,v){
  if(p.bool) return v?"Sì":"No";
  if(p.select){ const o=p.select.find(x=>x[0]===v); return o?o[1]:String(v); }
  if(p.pct){ const x=v*100; return (Math.abs(x-Math.round(x))<1e-9?n0(x):Math.abs(x*10-Math.round(x*10))<1e-9?n1(x):n2(x))+"%"; }
  const mag=a=>Math.abs(a)>=100?n0(a):(Math.abs(a)<10&&a%1?n2(a):n1(a).replace(/,0$/,""));
  const val=(v<0?MIN:"")+mag(Math.abs(v)); const u=p.unit||"";
  if(u[0]==="€"){ const rest=u.slice(1).trim(); return "€"+val+(rest?(rest[0]==="/"?rest:" "+rest):""); }
  return val+(u&&u!=="unità"?" "+u:"");
}
function pnlSteps(R){
  const steps=[{label:"Maggior gettito lordo",v:(R.G-R.base)/1e6},{label:"Evasione",v:-R.evasionLoss/1e6},{label:"Quota allo Stato",v:-R.levy/1e6}];
  if(R.dayFeeNet>0) steps.push({label:"Contributo d'accesso",v:R.dayFeeNet/1e6});
  steps.push({label:"Incremento netto",t:"s"},{label:"Perdite collaterali",v:-R.collateral/1e6},{label:"Risparmi netti",v:R.savings/1e6},{label:"Prima del Fondo",t:"s"},{label:"Fondo: commercio",v:-R.fComm/1e6},{label:"Fondo: garanzia affitti",v:-R.fGuar/1e6},{label:"Fondo: imprese e talenti",v:-R.fTalent/1e6});
  if(R.fTrain>0) steps.push({label:"Fondo: riqualificazione",v:-R.fTrain/1e6});
  steps.push({label:"Saldo strutturale",t:"s"});
  return steps;
}
function stakeGroups(R){
  const g=(t,ids)=>({title:t,rows:ids.map(id=>{ const x=R.stake.find(z=>z.id===id); return {label:x.label,v:x.v}; })});
  return [g("Pagano",["tour","hotel","str","comp","llong"]),g("Fuga di gettito",["evas"]),g("Ricevono",["tenant","com","fund","state","belt"])];
}
function tornadoRows(T){
  return T.map(t=>{ const f=u=>v=>u==="%"?fP(v,0):u==="%1"?fP(v,1):u==="€"?"€"+n0(v):u==="×"?n2(v)+"×":u==="κ"?n1(v):u==="mln"?n1(v)+" mln":"€"+n0(v)+" mln"; return {...t,loL:f(t.unit)(t.loX),hiL:f(t.unit)(t.hiX)}; });
}
function visitorBars(c,x,y,w,S){
  const R=S.R, nights0=R.nB/365, nights1=R.nNew/365, day0=R.dayV0/365, day1=R.dayV1/365, belt1=R.beltReturned/365, tot0=R.vdB/365, tot1=R.vdN/365;
  const rows=[["Oggi",[nights0,day0,0],tot0],["Dopo la riforma",[nights1,day1,belt1],tot1]];
  const bx=x+150, bw=w-150-110, max=tot0*1.02; const X=v=>bx+v/max*bw; const cols=[C.navy,C.lblue,C.blue]; const names=["Pernottanti","Escursionisti","Ospiti della cintura"];
  rows.forEach((r,i)=>{ const yy=y+i*76; c.t1(r[0],x,yy+32,{font:"sansB",size:14,color:C.navy}); let a0=0;
    r[1].forEach((v,j)=>{ if(v<=0) return; c.rect(X(a0),yy,X(a0+v)-X(a0)-1.5,56,{fill:cols[j]}); if(X(a0+v)-X(a0)>60) c.t1(n1(v/1e3)+"",X(a0)+(X(a0+v)-X(a0))/2,yy+34,{font:"sansB",size:13,color:j===1?C.navy:C.white,anchor:"middle"}); a0+=v; });
    c.t1(n1(r[2]/1e3)+" mila",X(a0)+10,yy+34,{font:"sansB",size:14,color:C.navy}); });
  names.forEach((nm,j)=>{ const lx=x+150+j*Math.min(190,(w-150)/3); c.rect(lx,y+152,12,12,{fill:cols[j]}); c.t1(nm,lx+18,y+163,{size:12.5,color:C.ink}); });
  return 170;
}
root.FMK={evoDefs,fmtParam,trend,fMc,pnlSteps,stakeGroups,tornadoRows,visitorBars,C,ML,MR,CW,n0,n1,n2,fM,fMs,fE,fE2,fP,fPs,fN,fNs,fMn,fMn1,MIN,frame,callout,calloutH,kpi,bullets,numbered,chartTitle,table,chip,hBarPairs,hBars,diverging,waterfall,columns,taxFunction,densityR,tornadoChart,frontier,heat,gantt};
})(typeof self!=="undefined"?self:this);
