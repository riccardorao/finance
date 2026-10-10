/* Reading what the bank gives you, in the browser: CSV, XLSX, "Excel" files that are really HTML tables,
   statement PDFs, and the app's own backup file. Nothing is uploaded anywhere. */

async function readText(buf) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { return new TextDecoder('windows-1252').decode(buf); }
}

/* ---------- XLSX: a zip of XML files, unpacked with the browser's own DecompressionStream ---------- */
async function unzip(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('zip');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
    files[name] = { method, data: u8.subarray(start, start + csize) };
    p += 46 + nl + xl + cl;
  }
  return async (name) => {
    const f = files[name];
    if (!f) return null;
    if (f.method === 0) return dec.decode(f.data);
    const stream = new Blob([f.data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  };
}

async function readXlsx(buf) {
  const get = await unzip(buf);
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');
  const ss = await get('xl/sharedStrings.xml');
  const shared = ss ? [...xml(ss).getElementsByTagName('si')].map((si) => [...si.getElementsByTagName('t')].map((t) => t.textContent).join('')) : [];
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const wb = await get('xl/workbook.xml'), rels = await get('xl/_rels/workbook.xml.rels');
  if (wb && rels) {
    const first = xml(wb).getElementsByTagName('sheet')[0];
    const rid = first && (first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
    const rel = [...xml(rels).getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === rid);
    if (rel) sheetPath = 'xl/' + rel.getAttribute('Target').replace(/^\/?xl\//, '').replace(/^\//, '');
  }
  const sheet = await get(sheetPath);
  if (!sheet) throw new Error('sheet');
  const rows = [];
  const colIdx = (ref) => { let n = 0; for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  for (const r of xml(sheet).getElementsByTagName('row')) {
    const row = [];
    for (const c of r.getElementsByTagName('c')) {
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0];
      let val = '';
      if (t === 's') val = shared[+v.textContent] || '';
      else if (t === 'inlineStr') val = [...c.getElementsByTagName('t')].map((x) => x.textContent).join('');
      else if (t === 'str' || t === 'b') val = v ? v.textContent : '';
      else if (v) val = Number(v.textContent);
      row[colIdx(c.getAttribute('r') || 'A1')] = val;
    }
    rows.push(Array.from(row, (x) => (x == null ? '' : x)));
  }
  return rows.filter((r) => r.some((c) => c !== '' && c != null));
}

function readHtmlTable(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const tables = [...doc.querySelectorAll('table')];
  if (!tables.length) return null;
  const rowsOf = (t) => [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th,td')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()));
  const best = tables.map(rowsOf).sort((a, b) => b.length - a.length)[0];
  // Keep any text before the table: banks often put the account name there.
  const pre = (doc.body ? doc.body.textContent : '').slice(0, 400).replace(/\s+/g, ' ');
  return [[pre]].concat(best).filter((r) => r.some((c) => c));
}

/* ---------- PDF: pdf.js is fetched from cdnjs only when a PDF is opened ---------- */
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let pdfjsReady = null;
function loadPdfjs() {
  if (pdfjsReady) return pdfjsReady;
  pdfjsReady = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PDFJS + 'pdf.min.js';
    s.onload = async () => {
      try {
        const w = await fetch(PDFJS + 'pdf.worker.min.js').then((r) => r.blob());
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(w);
      } catch (e) { /* pdf.js falls back to running in the page */ }
      resolve(window.pdfjsLib);
    };
    s.onerror = () => { pdfjsReady = null; reject(new Error('pdfjs')); };
    document.head.appendChild(s);
  });
  return pdfjsReady;
}
async function readPdfLines(buf) {
  const lib = await loadPdfjs();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const byY = new Map();
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y).push({ s: it.str, x: it.transform[4] });
    }
    [...byY.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => lines.push({ items: items.sort((a, b) => a.x - b.x) }));
  }
  return lines;
}

// Reads one file and says what it is. Returns
// { kind: 'table', rows, map } | { kind: 'backup', state } | { kind: 'pdf', txns } | { kind: 'error', msg }
async function readBankFile(file) {
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 8));
  const name = file.name.toLowerCase();
  try {
    if (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46) {
      const lines = await readPdfLines(buf);
      const txns = txnsFromPdfLines(lines);
      return txns.length ? { kind: 'pdf', txns } : { kind: 'error', msg: 'err.pdfEmpty' };
    }
    if (head[0] === 0x50 && head[1] === 0x4b) {
      const rows = await readXlsx(buf);
      return tableResult(rows);
    }
    if (head[0] === 0xd0 && head[1] === 0xcf) return { kind: 'error', msg: 'err.oldXls' };
    const text = await readText(buf);
    const trimmed = text.replace(/^﻿/, '').trimStart();
    if (trimmed.startsWith('{')) {
      const obj = JSON.parse(trimmed);
      return obj.format === 'household-backup' ? { kind: 'backup', state: obj.state } : { kind: 'error', msg: 'err.unknown' };
    }
    if (trimmed.startsWith('<')) {
      const rows = readHtmlTable(text);
      return rows ? tableResult(rows) : { kind: 'error', msg: 'err.unknown' };
    }
    if (/\.(ofx|qif)$/.test(name)) return { kind: 'error', msg: 'err.unknown' };
    return tableResult(parseCSV(text));
  } catch (e) {
    console.warn(e);
    return { kind: 'error', msg: e.message === 'pdfjs' ? 'err.pdfOffline' : 'err.unknown' };
  }
}
function tableResult(rows) {
  const map = detectTable(rows);
  return { kind: 'table', rows, map };
}
