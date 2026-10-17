/* Strato di disegno: un'unica descrizione delle slide, due uscite (SVG per l'anteprima, PDF vettoriale per l'export).
   Spazio di lavoro 1280×720, y verso il basso. Il PDF usa pagine 960×540 pt (16:9). */
(function(root){
"use strict";
const W=1280,H=720,PT=0.75;

/* ---------- caratteri ---------- */
const FONT_DEF={               // chiave → [file, famiglia CSS, peso]
  sans:["SS3-400","FMSans",400], sansSB:["SS3-600","FMSans",600], sansB:["SS3-700","FMSans",700],
  serif:["SF4-400","FMSerif",400], serifSB:["SF4-600","FMSerif",600]
};
const fk={}, adv={};           // fontkit per chiave; cache delle larghezze per carattere
let missing=new Set(); const warnings=[];
function b64ToBytes(b){ const s=atob(b), u=new Uint8Array(s.length); for(let i=0;i<s.length;i++) u[i]=s.charCodeAt(i); return u; }
function initFonts(b64){
  if(fk.sans) return;
  Object.keys(FONT_DEF).forEach(k=>{ const bytes=b64ToBytes(b64[FONT_DEF[k][0]]); const f=root.fontkit.create(bytes); fk[k]={font:f,upm:f.unitsPerEm,bytes,cmap:new Set()}; adv[k]={}; });
}
function fontBytes(k){ return fk[k].bytes; }
function charW(k,ch){ const a=adv[k]; let w=a[ch]; if(w!==undefined) return w;
  const f=fk[k]; const gs=f.font.glyphsForString(ch); const g=gs[0];
  if(!g||g.id===0){ missing.add(ch); w=0; } else w=g.advanceWidth/f.upm;
  a[ch]=w; return w; }
function measure(str,key,size){ let w=0; for(const ch of String(str)) w+=charW(key,ch); return w*size; }
const FALLBACK={"★":"*","✓":"v","→":"→"," ":" "," ":" "," ":" "};
function clean(s){ return String(s).replace(/[★   ]/g,c=>FALLBACK[c]); }

/* ---------- colori ---------- */
function hex(c){ const m=/^#?([0-9a-f]{6})$/i.exec(c); const n=parseInt(m[1],16); return [(n>>16)/255,((n>>8)&255)/255,(n&255)/255]; }
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const f2=x=>(Math.round(x*100)/100).toString();

/* ---------- uscita SVG ---------- */
class SvgOut{
  constructor(map){ this.p=[]; this.kind="svg"; this.map=map||null; }
  col(c,role){ if(!c||c==="none") return "none"; if(!this.map) return c; const m=this.map(c,role); return m||c; }
  rect(x,y,w,h,o){ const r=o.r||0; this.p.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}"${r?` rx="${r}"`:""} fill="${this.col(o.fill,"paint")}"${o.stroke?` stroke="${this.col(o.stroke,"paint")}" stroke-width="${o.sw||1}"`:""}${o.op!==undefined?` opacity="${o.op}"`:""}/>`); }
  line(x1,y1,x2,y2,o){ this.p.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${this.col(o.stroke,"paint")}" stroke-width="${o.sw||1}"${o.dash?` stroke-dasharray="${o.dash.join(" ")}"`:""}${o.cap?` stroke-linecap="${o.cap}"`:""}${o.op!==undefined?` opacity="${o.op}"`:""}/>`); }
  path(d,o){ this.p.push(`<path d="${d}" fill="${this.col(o.fill,"paint")}"${o.stroke?` stroke="${this.col(o.stroke,"paint")}" stroke-width="${o.sw||1}" stroke-linejoin="round" stroke-linecap="round"`:""}${o.dash?` stroke-dasharray="${o.dash.join(" ")}"`:""}${o.op!==undefined?` opacity="${o.op}"`:""}/>`); }
  circle(cx,cy,r,o){ this.p.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${this.col(o.fill,"paint")}"${o.stroke?` stroke="${this.col(o.stroke,"paint")}" stroke-width="${o.sw||1}"`:""}${o.op!==undefined?` opacity="${o.op}"`:""}/>`); }
  text(str,x,y,o){ measure(str,o.font||"sans",o.size); const d=FONT_DEF[o.font||"sans"]; const a=o.anchor==="middle"?"middle":o.anchor==="end"?"end":"start";
    this.p.push(`<text xml:space="preserve" x="${f2(x)}" y="${f2(y)}" font-family="${d[1]}" font-weight="${d[2]}" font-size="${o.size}" fill="${this.col(o.color,"text")}" text-anchor="${a}"${o.rot?` transform="rotate(${o.rot} ${f2(x)} ${f2(y)})"`:""}${o.op!==undefined?` opacity="${o.op}"`:""}>${esc(str)}</text>`); }
  done(){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="font-kerning:none;font-variant-ligatures:none;text-rendering:geometricPrecision"><rect width="${W}" height="${H}" fill="#fff"/>${this.p.join("")}</svg>`; }
  region(w,h,label){ return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(w)} ${f2(h)}" width="${f2(w)}" height="${f2(h)}" role="img" aria-label="${esc(label||"Grafico")}" style="display:block;max-width:100%;height:auto;font-kerning:none;font-variant-ligatures:none">${this.p.join("")}</svg>`; }
}

/* ---------- uscita PDF ---------- */
class PdfOut{
  constructor(page,fonts,lib){ this.page=page; this.fonts=fonts; this.L=lib; this.kind="pdf"; }
  rgb(c){ const a=hex(c); return this.L.rgb(a[0],a[1],a[2]); }
  rect(x,y,w,h,o){
    if(o.r){ return this.path(rrPath(x,y,w,h,o.r),o); }
    const opt={x:x*PT,y:(H-y-h)*PT,width:w*PT,height:h*PT};
    if(o.fill) opt.color=this.rgb(o.fill);
    if(o.stroke){ opt.borderColor=this.rgb(o.stroke); opt.borderWidth=(o.sw||1)*PT; }
    if(o.op!==undefined){ opt.opacity=o.op; opt.borderOpacity=o.op; }
    this.page.drawRectangle(opt);
  }
  line(x1,y1,x2,y2,o){
    const opt={start:{x:x1*PT,y:(H-y1)*PT},end:{x:x2*PT,y:(H-y2)*PT},thickness:(o.sw||1)*PT,color:this.rgb(o.stroke)};
    if(o.dash) opt.dashArray=o.dash.map(v=>v*PT);
    if(o.op!==undefined) opt.opacity=o.op;
    this.page.drawLine(opt);
  }
  path(d,o){
    const opt={x:0,y:H*PT,scale:PT};
    if(o.fill) opt.color=this.rgb(o.fill);
    if(o.stroke){ opt.borderColor=this.rgb(o.stroke); opt.borderWidth=(o.sw||1); if(o.dash) opt.borderDashArray=o.dash; }
    if(o.op!==undefined){ opt.opacity=o.op; opt.borderOpacity=o.op; }
    this.page.drawSvgPath(d,opt);
  }
  circle(cx,cy,r,o){
    const opt={x:cx*PT,y:(H-cy)*PT,size:r*PT};
    if(o.fill) opt.color=this.rgb(o.fill);
    if(o.stroke){ opt.borderColor=this.rgb(o.stroke); opt.borderWidth=(o.sw||1)*PT; }
    if(o.op!==undefined){ opt.opacity=o.op; opt.borderOpacity=o.op; }
    this.page.drawCircle(opt);
  }
  text(str,x,y,o){
    const key=o.font||"sans", w=measure(str,key,o.size)*PT;
    const off=o.anchor==="middle"?-w/2:o.anchor==="end"?-w:0;
    const th=-(o.rot||0)*Math.PI/180;          // sistema y verso l'alto
    const X=x*PT+off*Math.cos(th), Y=(H-y)*PT+off*Math.sin(th);
    const opt={x:X,y:Y,size:o.size*PT,font:this.fonts[key],color:this.rgb(o.color)};
    if(o.rot) opt.rotate=this.L.degrees(-(o.rot));
    if(o.op!==undefined) opt.opacity=o.op;
    this.page.drawText(str,opt);
  }
}
function rrPath(x,y,w,h,r){ r=Math.min(r,w/2,h/2);
  return `M${x+r},${y}H${x+w-r}A${r},${r} 0 0 1 ${x+w},${y+r}V${y+h-r}A${r},${r} 0 0 1 ${x+w-r},${y+h}H${x+r}A${r},${r} 0 0 1 ${x},${y+h-r}V${y+r}A${r},${r} 0 0 1 ${x+r},${y}Z`; }

/* ---------- tela ---------- */
class Canvas{
  constructor(out){ this.o=out; }
  rect(x,y,w,h,o){ if(w<0){ x+=w; w=-w; } if(h<0){ y+=h; h=-h; } this.o.rect(x,y,w,h,o||{}); }
  line(x1,y1,x2,y2,o){ this.o.line(x1,y1,x2,y2,o); }
  path(d,o){ this.o.path(d,o); }
  circle(cx,cy,r,o){ this.o.circle(cx,cy,r,o||{}); }
  measure(str,font,size){ return measure(clean(str),font||"sans",size); }
  /* testo semplice su una riga */
  t1(str,x,y,o){ this.o.text(clean(str),x,y,o); }
  /* testo con a capo automatico e **grassetto**. Restituisce {h,lines,w}. */
  text(str,x,y,o){
    o=o||{}; const size=o.size||14, font=o.font||"sans", bold=o.bold||(font.startsWith("serif")?"serifSB":"sansB"), color=o.color||"#1B2A3A", lh=o.lh||Math.round(size*1.32);
    const maxW=o.maxWidth||1e9, anchor=o.anchor||"start";
    const paras=clean(str).split("\n"); const lines=[];
    paras.forEach(par=>{
      const runs=[]; par.split("**").forEach((seg,i)=>{ if(seg) runs.push({t:seg,f:i%2?bold:font,c:i%2&&o.boldColor?o.boldColor:color}); });
      if(!runs.length){ lines.push([]); return; }
      const words=[]; runs.forEach(r=>r.t.split(/(\s+)/).forEach(tok=>{ if(tok!=="") words.push({t:tok,f:r.f,c:r.c,sp:/^\s+$/.test(tok)}); }));
      let cur=[],cw=0;
      const flush=()=>{ while(cur.length&&cur[cur.length-1].sp) cur.pop(); lines.push(cur); cur=[]; cw=0; };
      words.forEach(w=>{ const ww=measure(w.t,w.f,size);
        if(w.sp){ if(cur.length) { cur.push({...w,w:ww}); cw+=ww; } return; }
        if(cw+ww>maxW&&cur.some(z=>!z.sp)) flush();
        cur.push({...w,w:ww}); cw+=ww; });
      flush();
    });
    let maxLine=0;
    lines.forEach((ln,i)=>{
      const lw=ln.reduce((a,z)=>a+z.w,0); maxLine=Math.max(maxLine,lw);
      let cx=anchor==="middle"?x-lw/2:anchor==="end"?x-lw:x; const yy=y+i*lh;
      // fonde segmenti adiacenti con lo stesso stile
      let seg=null; const out=[];
      ln.forEach(z=>{ if(seg&&seg.f===z.f&&seg.c===z.c){ seg.t+=z.t; seg.w+=z.w; } else { if(seg) out.push(seg); seg={t:z.t,f:z.f,c:z.c,w:z.w}; } });
      if(seg) out.push(seg);
      out.forEach(s=>{ if(s.t.trim()!=="") this.o.text(s.t,cx,yy,{font:s.f,size,color:s.c,op:o.op}); cx+=s.w; });
    });
    if(o.maxH&&lines.length*lh>o.maxH+1) warnings.push("testo oltre l'altezza ("+lines.length*lh+">"+o.maxH+"): "+clean(str).slice(0,50));
    return {h:lines.length*lh,lines:lines.length,w:maxLine,lh};
  }
  /* altezza prevista senza disegnare */
  textH(str,o){ const dummy=new Canvas({text(){},rect(){},line(){},path(){},circle(){}}); return dummy.text(str,0,0,o); }
}

/* ---------- utilità numeriche ---------- */
function niceStep(x){ const e=Math.pow(10,Math.floor(Math.log10(Math.max(x,1e-12)))),f=x/e; return (f<1.5?1:f<3?2:f<7?5:10)*e; }
function ticks(lo,hi,n){ n=n||5; const st=niceStep((hi-lo)/n); const a=Math.ceil(lo/st-1e-9)*st, out=[]; for(let v=a;v<=hi+st*1e-6;v+=st) out.push(+v.toFixed(10)); return {ticks:out,step:st}; }

root.FMD={W,H,PT,FONT_DEF,initFonts,fontBytes,measure,clean,missing:()=>[...missing],warnings,SvgOut,PdfOut,Canvas,rrPath,niceStep,ticks,hex};
})(typeof self!=="undefined"?self:this);
