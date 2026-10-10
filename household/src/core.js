/* Household finance core: parsing bank exports, categorising, checks and suggestions.
   Pure functions shared by the page and the Node tests. Amounts are integer cents; dates are 'YYYY-MM-DD'. */

const SCHEMA_VERSION = 1;

/* ---------- categories ---------- */
// kind: 'in' (income), 'out' (spending), 'move' (transfers between own accounts, left out of every total)
const CATEGORIES = [
  { id: 'pensione', kind: 'in', it: 'Pensione', en: 'Pension', icon: '🏛️' },
  { id: 'stipendio', kind: 'in', it: 'Stipendio', en: 'Salary', icon: '💼' },
  { id: 'rimborsi', kind: 'in', it: 'Rimborsi', en: 'Refunds', icon: '↩️' },
  { id: 'entrate_altre', kind: 'in', it: 'Altre entrate', en: 'Other income', icon: '➕' },
  { id: 'spesa', kind: 'out', it: 'Spesa alimentare', en: 'Groceries', icon: '🛒' },
  { id: 'casa', kind: 'out', it: 'Casa e bollette', en: 'Home and bills', icon: '🏠' },
  { id: 'telefono', kind: 'out', it: 'Telefono e internet', en: 'Phone and internet', icon: '📱' },
  { id: 'trasporti', kind: 'out', it: 'Auto e trasporti', en: 'Car and transport', icon: '🚗' },
  { id: 'salute', kind: 'out', it: 'Salute', en: 'Health', icon: '💊' },
  { id: 'assicurazioni', kind: 'out', it: 'Assicurazioni', en: 'Insurance', icon: '🛡️' },
  { id: 'tasse', kind: 'out', it: 'Tasse e imposte', en: 'Taxes', icon: '🧾' },
  { id: 'banca', kind: 'out', it: 'Costi bancari', en: 'Bank charges', icon: '🏦' },
  { id: 'abbonamenti', kind: 'out', it: 'Abbonamenti', en: 'Subscriptions', icon: '📺' },
  { id: 'ristoranti', kind: 'out', it: 'Ristoranti e bar', en: 'Eating out', icon: '🍽️' },
  { id: 'shopping', kind: 'out', it: 'Acquisti', en: 'Shopping', icon: '🛍️' },
  { id: 'svago', kind: 'out', it: 'Svago e viaggi', en: 'Leisure and travel', icon: '✈️' },
  { id: 'famiglia', kind: 'out', it: 'Famiglia e regali', en: 'Family and gifts', icon: '🎁' },
  { id: 'contanti', kind: 'out', it: 'Prelievi contanti', en: 'Cash withdrawals', icon: '💶' },
  { id: 'altro', kind: 'out', it: 'Altre spese', en: 'Other spending', icon: '📦' },
  { id: 'giroconto', kind: 'move', it: 'Trasferimenti tra i propri conti', en: 'Transfers between own accounts', icon: '🔁' },
];

// Built-in rules, checked in order after the user's own rules. A word ending in * matches any word that starts with it.
// sign: 'in' only for money coming in, 'out' only for money going out.
const DEFAULT_RULES = [
  { cat: 'giroconto', words: ['GIROCONTO', 'GIRO CONTO', 'RICARICA HYPE', 'TRASFERIMENTO TRA CONTI'] },
  { cat: 'pensione', sign: 'in', words: ['PENSIONE', 'PENSIONI', 'INPS', 'INPDAP', 'RATEO PENSION*'] },
  { cat: 'stipendio', sign: 'in', words: ['STIPENDIO', 'EMOLUMENT*', 'RETRIBUZIONE', 'CEDOLINO'] },
  { cat: 'rimborsi', sign: 'in', words: ['RIMBORSO', 'RIMBORSI', 'STORNO', 'RESO', 'CASHBACK'] },
  { cat: 'tasse', words: ['CANONE RAI', 'F24', 'IMU', 'TARI', 'AGENZIA ENTRATE', 'AGENZIA DELLE ENTRATE', 'BOLLO AUTO', 'TASSA AUTOMOBILISTICA', 'PAGOPA', 'PAGO PA', 'TASSA', 'TRIBUTI', 'ADDIZIONALE'] },
  { cat: 'banca', sign: 'out', words: ['COMMISSION*', 'CANONE', 'SPESE TENUTA', 'SPESE CONTO', 'SPESE FISSE', 'IMPOSTA DI BOLLO', 'IMPOSTA BOLLO', 'BOLLO E C', 'BOLLO SU E C', 'COMPETENZE', 'SPESE INVIO', 'SPESE BONIFICO', 'SPESE ESTRATTO', 'INTERESSI PASSIVI', 'SPESE DI GESTIONE', 'SPESE LIQUIDAZIONE'] },
  { cat: 'entrate_altre', sign: 'in', words: ['INTERESSI CREDITORI', 'COMPETENZE', 'DIVIDEND*', 'CEDOLA'] },
  { cat: 'contanti', sign: 'out', words: ['PRELIEVO', 'PRELIEVI', 'PREL', 'PRELEV*', 'BANCOMAT CONTANTI', 'ATM WITHDRAWAL'] },
  { cat: 'abbonamenti', words: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'PRIME VIDEO', 'DISNEY*', 'DAZN', 'SKY', 'NOW TV', 'NOWTV', 'APPLE COM BILL', 'ITUNES', 'ICLOUD', 'YOUTUBE*', 'GOOGLE ONE', 'GOOGLE STORAGE', 'PARAMOUNT*', 'TIMVISION', 'AUDIBLE', 'INFINITY*', 'KINDLE UNLIMITED'] },
  { cat: 'telefono', words: ['TIM', 'TELECOM', 'VODAFONE', 'WINDTRE', 'WIND TRE', 'WIND', 'ILIAD', 'FASTWEB', 'HO MOBILE', 'KENA', 'POSTEMOBILE', 'POSTE MOBILE', 'VERY MOBILE', 'LINKEM', 'EOLO', 'TISCALI', 'COOPVOCE'] },
  { cat: 'casa', words: ['ENEL', 'ENEL ENERGIA', 'HERA', 'HERACOMM', 'A2A', 'IREN', 'EDISON', 'PLENITUDE', 'ENI PLENITUDE', 'SORGENIA', 'ACEA', 'ACQUEDOTTO', 'ENGIE', 'ILLUMIA', 'SERVIZIO IDRICO', 'CONDOMINIO', 'AMMINISTRAZIONE CONDOMIN*', 'AFFITTO', 'CANONE LOCAZIONE', 'MUTUO', 'RATA MUTUO', 'IKEA', 'LEROY MERLIN', 'BRICO*', 'OBI', 'FERRAMENTA', 'ITALGAS', 'ESTRA', 'AGSM', 'DOLOMITI ENERGIA', 'ALPERIA', 'GAS', 'LUCE'] },
  { cat: 'assicurazioni', words: ['ASSICURAZ*', 'ASSICURA', 'GENERALI', 'UNIPOL', 'UNIPOLSAI', 'ALLIANZ', 'AXA', 'REALE MUTUA', 'CATTOLICA', 'ZURICH', 'GROUPAMA', 'VITTORIA', 'POSTE ASSICURA', 'SARA', 'POLIZZA', 'PRIMA IT', 'LINEAR', 'GENIALLOYD', 'VERTI', 'CONTE IT'] },
  { cat: 'salute', words: ['FARMACIA', 'FARMACIE', 'PARAFARMACIA', 'MEDIC*', 'OSPEDAL*', 'ASL', 'ATS', 'ASST', 'AUSL', 'TICKET', 'DENTIST*', 'ODONTOIATR*', 'OTTIC*', 'LABORATORIO ANALISI', 'ANALISI CLINICHE', 'POLIAMBULATORIO', 'CLINICA', 'FISIOTERAP*', 'SANITAR*', 'CENTRO DIAGNOSTICO'] },
  { cat: 'spesa', words: ['ESSELUNGA', 'CONAD', 'COOP', 'IPERCOOP', 'CARREFOUR', 'LIDL', 'EUROSPIN', 'PAM', 'PANORAMA', 'DESPAR', 'INTERSPAR', 'SPAR', 'EUROSPAR', 'MD', 'PENNY', 'ALDI', 'TIGROS', 'BENNET', 'IPER', 'FAMILA', 'CRAI', 'SIGMA', 'DECO', 'IL GIGANTE', 'U2', 'SUPERMERCAT*', 'ALIMENTARI', 'PANIFICIO', 'MACELLERIA', 'FRUTTA', 'ORTOFRUTTA', 'PESCHERIA', 'NATURASI', 'ARD DISCOUNT', 'IN S MERCATO', 'TODIS', 'SELEX', 'SISA', 'CONAD SUPERSTORE', 'DESPAR', 'GALASSIA', 'POLI', 'MIGROSS', 'UNES', 'CARREFOUR MARKET', 'LILLAPOIS', 'PRIX', 'MERCATO'] },
  { cat: 'trasporti', words: ['ENI', 'ENILIVE', 'ENI LIVE', 'Q8', 'IP', 'TAMOIL', 'ESSO', 'API', 'SHELL', 'TOTALERG', 'ERG', 'CARBURANT*', 'DISTRIBUTORE', 'TELEPASS', 'AUTOSTRAD*', 'PEDAGGI*', 'TRENITALIA', 'ITALO', 'TRENORD', 'ATM', 'ATAC', 'GTT', 'PARCHEGG*', 'PARKING', 'EASYPARK', 'MECCANIC*', 'GOMMIST*', 'AUTOFFICINA', 'CARROZZERIA', 'REVISIONE', 'UBER', 'TAXI', 'FREE NOW', 'FLIXBUS'] },
  { cat: 'ristoranti', words: ['RISTORANT*', 'PIZZERI*', 'TRATTORIA', 'OSTERIA', 'BAR', 'CAFFE*', 'CAFE', 'GELATERI*', 'PASTICCERI*', 'MCDONALD*', 'MC DONALD*', 'BURGER KING', 'AUTOGRILL', 'JUST EAT', 'DELIVEROO', 'GLOVO', 'SUSHI', 'ROSTICCERI*', 'AGRITURISMO', 'ENOTECA', 'BIRRERIA', 'PANINOTECA'] },
  { cat: 'svago', words: ['CINEMA', 'TEATRO', 'BOOKING*', 'AIRBNB', 'RYANAIR', 'EASYJET', 'ITA AIRWAYS', 'ALITALIA', 'VOLOTEA', 'WIZZ', 'HOTEL', 'ALBERGO', 'MUSEO', 'PALESTRA', 'PISCINA', 'EXPEDIA', 'TICKETONE', 'VIVATICKET', 'VIAGG*', 'TERME', 'LOTTOMATICA', 'SISAL'] },
  { cat: 'famiglia', words: ['REGALO', 'REGALI', 'VETERINAR*', 'ARCAPLANET', 'ISOLA DEI TESORI', 'ZOOPLUS', 'ASILO', 'SCUOLA', 'PARROCCHIA', 'OFFERTA', 'FIORAIO', 'FIORI', 'GIOCATTOL*', 'TOYS'] },
  { cat: 'shopping', words: ['AMAZON', 'AMZN', 'ZALANDO', 'EBAY', 'DECATHLON', 'MEDIAWORLD', 'MEDIA WORLD', 'UNIEURO', 'EURONICS', 'EXPERT', 'ZARA', 'H M', 'OVS', 'COIN', 'TEMU', 'SHEIN', 'ALIEXPRESS', 'PAYPAL', 'LIBRERIA', 'FELTRINELLI', 'MONDADORI', 'TABACCHI', 'TABACCHERIA', 'PRIMARK', 'CALZEDONIA', 'INTIMISSIMI', 'TEZENIS', 'BENETTON', 'UPIM', 'ACQUA E SAPONE', 'TIGOTA', 'DM DROGERIE', 'DOUGLAS', 'SEPHORA', 'PROFUMERIA', 'ABBIGLIAMENTO', 'CALZATURE', 'MERCERIA', 'OTTICA'] },
];

const catById = (state, id) => allCategories(state).find((c) => c.id === id) || CATEGORIES.find((c) => c.id === 'altro');
function allCategories(state) {
  const custom = (state && state.categories && state.categories.custom) || [];
  const renamed = (state && state.categories && state.categories.labels) || {};
  return CATEGORIES.map((c) => (renamed[c.id] ? { ...c, it: renamed[c.id], en: renamed[c.id] } : c)).concat(custom);
}
const catKind = (state, id) => catById(state, id).kind;

/* ---------- text ---------- */
function normDesc(s) {
  return String(s == null ? '' : s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]+/g, ' ').trim();
}

const PREFIXES = [
  /^(PAGAMENTO|PAGAM|PAG|ACQUISTO|OPERAZIONE|OP)( (POS|CARTA|CON CARTA|TRAMITE|POS|CONTACTLESS|APPLE PAY|GOOGLE PAY|ONLINE|ELETTRONICO|ESERCENTE|DI|DEBIT|DEBITO|VISA|MASTERCARD|MAESTRO|BANCOMAT|PAGOBANCOMAT|INTERNET|E COMMERCE|CIRCUITO))+/,
  /^(ADDEBITO|ADD|ADDEB)( (DIRETTO|DIRETTI|SDD|SEPA|RID|CORE|B2B|PREAUTORIZZATO|UTENZE|CARTA|DI))*/,
  /^(SDD|RID|SEPA DIRECT DEBIT)( CORE)?/,
  /^(BONIFICO|BONIF|BON|BONIFICI)( (SEPA|SCT|ISTANTANEO|INST|ESTERO|A VOSTRO FAVORE|A VS FAVORE|VOSTRO FAVORE|IN ENTRATA|IN USCITA|RICEVUTO|DISPOSTO|ESEGUITO|DA|A|DI|PER|ORDINANTE|BENEFICIARIO|FAVORE|ONLINE|INTERNET|EUR))*/,
  /^(VS |VOSTRA )?DISPOSIZIONE( DI)?/,
  /^(ACCREDITO|ACCR)( (EMOLUMENTI|BONIFICO|DA|DI|SEPA|CARTA|PENSIONE|STIPENDIO))*/,
  /^(PRELIEVO|PRELIEVI|PREL)( (BANCOMAT|ATM|CONTANTI|CARTA|SPORTELLO|PRESSO|CIRCUITO))*/,
  /^(RICARICA|PAGAMENTO UTENZE|UTENZE|ADDEBITO CARTA)/,
];
const NOISE = new Set(['DEL', 'DELLA', 'DI', 'DA', 'IL', 'LA', 'LO', 'A', 'AL', 'E', 'ORE', 'CARTA', 'CARD', 'N', 'NR', 'NUM', 'RIF', 'CRO', 'TRN', 'ID', 'MANDATO', 'CID', 'EUR', 'EURO', 'ITA', 'IT', 'SPA', 'SRL', 'SNC', 'SAS', 'S', 'P', 'R', 'L', 'C', 'COD', 'CODICE', 'DATA', 'VAL', 'VALUTA', 'PRESSO', 'IN', 'PER', 'FAVORE', 'BENEF', 'ORD', 'CAUSALE', 'INFO', 'CLI', 'UNICO', 'DEBITORE', 'CREDITORE', 'END', 'TO', 'END TO', 'NOTPROVIDED', 'IBAN', 'BIC', 'ADDEBITO']);

// A short, stable merchant name for grouping (recurring payments, "apply to similar", duplicates).
function merchantKey(desc) {
  let s = normDesc(desc);
  for (let pass = 0; pass < 2; pass++) for (const re of PREFIXES) s = s.replace(re, '').trim();
  const words = s.split(' ').filter((w) => w && !NOISE.has(w) && !/\d/.test(w) && w.length > 1);
  const k = words.slice(0, 3).join(' ');
  return k || normDesc(desc).slice(0, 24);
}
const titleCase = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

/* ---------- rules ---------- */
const reCache = new Map();
function wordRe(words) {
  const key = words.join('|');
  if (reCache.has(key)) return reCache.get(key);
  const alt = words.map((w) => {
    const n = normDesc(w.replace(/\*$/, ''));
    return n.replace(/ /g, ' ') + (w.endsWith('*') ? '[A-Z0-9]*' : '');
  }).filter(Boolean).join('|');
  const re = new RegExp('(?:^| )(?:' + alt + ')(?: |$)');
  reCache.set(key, re);
  return re;
}
const ruleMatches = (rule, t, nd) =>
  (!rule.sign || (rule.sign === 'in' ? t.amt > 0 : t.amt < 0)) && (!rule.acc || rule.acc === t.acc) && wordRe(rule.words).test(nd);

// User rules first (newest first), then the built-in ones; anything left goes to Other income / Other spending.
function categorise(t, userRules) {
  const nd = normDesc(t.desc);
  for (let i = (userRules || []).length - 1; i >= 0; i--) if (ruleMatches(userRules[i], t, nd)) return { cat: userRules[i].cat, src: 'rule' };
  for (const r of DEFAULT_RULES) if (ruleMatches(r, t, nd)) return { cat: r.cat, src: 'auto' };
  return { cat: t.amt > 0 ? 'entrate_altre' : 'altro', src: 'default' };
}
// Re-applies the rules to every transaction the user has not set by hand. Transfer pairs are found afterwards.
function recategorise(state) {
  for (const t of state.txns) {
    if (t.catSrc === 'user') continue;
    const c = categorise(t, state.rules);
    t.cat = c.cat; t.catSrc = c.src;
  }
  detectTransfers(state.txns);
  return state;
}

/* ---------- numbers and dates ---------- */
function parseAmount(v, decimalComma) {
  if (typeof v === 'number') return isFinite(v) ? Math.sign(v) * Math.round(Math.abs(v) * 100) : null;
  let s = String(v == null ? '' : v).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/−/g, '-').replace(/EUR|€|\s| /gi, '');
  if (/-$/.test(s)) { neg = !neg; s = s.slice(0, -1); }
  if (/^\+/.test(s)) s = s.slice(1);
  if (/^-/.test(s)) { neg = !neg; s = s.slice(1); }
  if (!/^[\d.,']+$/.test(s)) return null;
  s = s.replace(/'/g, '');
  const lastC = s.lastIndexOf(','), lastD = s.lastIndexOf('.');
  let dec = decimalComma == null ? (lastC > lastD ? ',' : lastD > lastC && !(lastC < 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) ? '.' : ',') : decimalComma ? ',' : '.';
  if (lastC >= 0 && lastD >= 0) dec = lastC > lastD ? ',' : '.';
  const thou = dec === ',' ? '.' : ',';
  s = s.split(thou).join('');
  if (dec === ',') s = s.replace(',', '.');
  const x = parseFloat(s);
  if (!isFinite(x)) return null;
  return Math.round((neg ? -x : x) * 100);
}

const MONTHS_IT = { GEN: 1, GENN: 1, GENNAIO: 1, FEB: 2, FEBBRAIO: 2, MAR: 3, MARZO: 3, APR: 4, APRILE: 4, MAG: 5, MAGGIO: 5, GIU: 6, GIUGNO: 6, LUG: 7, LUGLIO: 7, AGO: 8, AGOSTO: 8, SET: 9, SETT: 9, SETTEMBRE: 9, OTT: 10, OTTOBRE: 10, NOV: 11, NOVEMBRE: 11, DIC: 12, DICEMBRE: 12, JAN: 1, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, DEC: 12 };
const pad2 = (n) => String(n).padStart(2, '0');
function ymd(y, m, d) {
  if (y < 100) y += y < 70 ? 2000 : 1900;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}
// order: 'dmy' (Italian default), 'mdy' or 'ymd'
function parseDate(v, order) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(String(v).trim())) {
    const n = Number(v);
    if (n > 20000 && n < 80000) { // Excel serial date
      const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 864e5);
      return dt.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (m) return order === 'mdy' ? ymd(+m[3], +m[1], +m[2]) : ymd(+m[3], +m[2], +m[1]);
  m = normDesc(s).match(/^(\d{1,2}) ([A-Z]{3,9}) (\d{2,4})\b/);
  if (m && MONTHS_IT[m[2]]) return ymd(+m[3], MONTHS_IT[m[2]], +m[1]);
  m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) return ymd(+m[3], +m[2], +m[1]);
  return null;
}
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const monthOf = (iso) => iso.slice(0, 7);
function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const k = y * 12 + (m - 1) + n;
  return `${Math.floor(k / 12)}-${pad2((k % 12) + 1)}`;
}
const monthsRange = (a, b) => { const out = []; for (let m = a; m <= b; m = addMonths(m, 1)) out.push(m); return out; };
const daysInMonth = (ym) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();

/* ---------- tables (CSV, spreadsheets) ---------- */
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');
  const sample = text.split(/\r?\n/).slice(0, 30);
  const score = (d) => sample.map((l) => l.split(d).length - 1).filter((n) => n > 0).length * 100 + sample.reduce((s, l) => s + l.split(d).length - 1, 0);
  const delim = [';', '\t', ',', '|'].reduce((best, d) => (score(d) > score(best) ? d : best), ';');
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += ch;
    } else if (ch === '"' && cell.trim() === '') { q = true; cell = ''; }
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => (typeof c === 'string' ? c.trim() : c))).filter((r) => r.some((c) => c !== '' && c != null));
}

const HEADERS = {
  date: ['data contabile', 'data operazione', 'data registrazione', 'data movimento', 'data', 'booking date', 'date', 'data op', 'data contab', 'data transazione', 'giorno'],
  vdate: ['data valuta', 'valuta', 'value date', 'data val'],
  desc: ['descrizione', 'descrizione operazione', 'causale', 'causale abi', 'dettagli', 'dettaglio', 'description', 'operazione', 'descrizione estesa', 'beneficiario', 'esercente', 'controparte', 'note', 'motivo', 'tipologia', 'descrizione movimento', 'concetto'],
  amt: ['importo', 'importo eur', 'importo (eur)', 'importo euro', 'amount', 'ammontare', 'importo in euro', 'valore'],
  debit: ['uscite', 'dare', 'addebiti', 'addebito', 'debit', 'importo dare', 'uscita', 'importo addebito', 'movimenti dare'],
  credit: ['entrate', 'avere', 'accrediti', 'accredito', 'credit', 'importo avere', 'entrata', 'importo accredito', 'movimenti avere'],
  bal: ['saldo', 'saldo contabile', 'balance', 'saldo progressivo', 'saldo disponibile'],
};
const hnorm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9()]+/g, ' ').trim();
function headerField(h) {
  const n = hnorm(h);
  if (!n) return null;
  for (const f of ['vdate', 'debit', 'credit', 'bal', 'amt', 'date', 'desc']) if (HEADERS[f].includes(n)) return f;
  for (const f of ['vdate', 'debit', 'credit', 'bal', 'date', 'amt', 'desc']) if (HEADERS[f].some((k) => k.length > 3 && n.startsWith(k))) return f;
  return null;
}

// Finds the header row and maps columns; returns null when nothing looks like a bank export.
function detectTable(rows) {
  let best = null;
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const fields = rows[r].map(headerField);
    const has = (f) => fields.includes(f);
    const score = (has('date') ? 2 : 0) + (has('amt') || has('debit') || has('credit') ? 2 : 0) + (has('desc') ? 1 : 0) + (has('vdate') ? 0.5 : 0);
    if (score >= 4 && (!best || score > best.score)) best = { r, fields, score };
  }
  if (!best) return null;
  const map = { headerRow: best.r, date: -1, vdate: -1, desc: [], amt: -1, debit: -1, credit: -1, bal: -1 };
  best.fields.forEach((f, i) => {
    if (!f) return;
    if (f === 'desc') map.desc.push(i);
    else if (map[f] === -1) map[f] = i;
  });
  if (map.date === -1 && map.vdate !== -1) { map.date = map.vdate; map.vdate = -1; }
  const body = rows.slice(best.r + 1, best.r + 200);
  const vals = (i) => (i < 0 ? [] : body.map((r) => r[i]).filter((v) => v != null && v !== ''));
  const amountVals = [map.amt, map.debit, map.credit, map.bal].flatMap(vals).filter((v) => typeof v === 'string');
  map.decimalComma = amountVals.some((v) => /,\d{1,2}\s*-?\s*$/.test(v.replace(/€|EUR/gi, '').trim())) || !amountVals.some((v) => /\.\d{1,2}\s*-?$/.test(v.trim()));
  const dv = vals(map.date).filter((v) => typeof v === 'string');
  const parts = dv.map((v) => v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]\d{2,4}/)).filter(Boolean);
  map.dateOrder = parts.some((p) => +p[2] > 12) && !parts.some((p) => +p[1] > 12) ? 'mdy' : 'dmy';
  const pre = rows.slice(0, best.r).flat().join(' ').toUpperCase();
  map.bank = /HYPE/.test(pre) ? 'Hype' : /BCC|CREDITO COOPERATIVO|CASSA RURALE|RAIFFEISEN|RELAX BANKING|INBANK|ICCREA/.test(pre) ? 'BCC' : '';
  map.columns = rows[best.r].map((h) => String(h == null ? '' : h));
  return map;
}

// Turns table rows into transactions with the given column map. Bad rows are reported, not guessed.
function rowsToTxns(rows, map) {
  const out = [], skipped = [];
  for (let r = map.headerRow + 1; r < rows.length; r++) {
    const row = rows[r];
    const get = (i) => (i >= 0 ? row[i] : null);
    const date = parseDate(get(map.date), map.dateOrder);
    let amt = null;
    if (map.amt >= 0) amt = parseAmount(get(map.amt), map.decimalComma);
    if (amt == null && (map.debit >= 0 || map.credit >= 0)) {
      const d = parseAmount(get(map.debit), map.decimalComma), c = parseAmount(get(map.credit), map.decimalComma);
      if (d != null || c != null) amt = (c ? Math.abs(c) : 0) - (d ? Math.abs(d) : 0);
    }
    const desc = map.desc.map(get).filter((x) => x != null && String(x).trim() !== '').map(String).join(' · ');
    const isTotal = /^(totale|saldo|total)/i.test(String(get(map.desc[0]) || '')) || /saldo (iniziale|finale|contabile)/i.test(row.join(' '));
    if (!date || amt == null || amt === 0 || isTotal) {
      if (row.some((c) => c !== '' && c != null) && !isTotal) skipped.push(r + 1);
      continue;
    }
    const t = { date, desc: desc || '—', amt };
    const vd = parseDate(get(map.vdate), map.dateOrder);
    if (vd) t.vdate = vd;
    const bal = parseAmount(get(map.bal), map.decimalComma);
    if (bal != null) t.bal = bal;
    out.push(t);
  }
  return { txns: out, skipped };
}

// Balances a file with a running-balance column proves: the closing balance after its latest movement, and the
// opening balance (end of the day before its earliest movement). Together they let the checks reconcile.
function checkpointsFromFile(txns) {
  const withBal = txns.filter((t) => t.bal != null);
  if (!withBal.length) return [];
  const descending = withBal[0].date > withBal[withBal.length - 1].date;
  const chrono = descending ? [...withBal].reverse() : withBal; // file order within a day is kept
  const first = chrono[0], last = chrono[chrono.length - 1];
  const out = [{ date: addDays(first.date, -1), bal: first.bal - first.amt, src: 'file' }];
  if (last !== first || last.date !== out[0].date) out.push({ date: last.date, bal: last.bal, src: 'file' });
  return out;
}

/* ---------- statement PDFs (Hype and others), line heuristics ---------- */
// lines: [{ items: [{ s: 'text', x: 123 }] }] from a PDF text layer, one per printed line, items left to right.
const AMOUNT_TOKEN = /^[+\-−]?\s?€?\s?\d{1,3}(?:[.\s]\d{3})*,\d{2}\s?€?$|^[+\-−]?\s?€?\s?\d+,\d{2}\s?€?$/;
const DATE_TOKEN = /^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/;
const DATE_WORDS = /^(\d{1,2}) (GEN|FEB|MAR|APR|MAG|GIU|LUG|AGO|SET|OTT|NOV|DIC)[A-Z]* (\d{4})/;
function txnsFromPdfLines(lines) {
  const cols = {};
  const out = [];
  let cur = null, extra = 0;
  const finish = () => { if (cur && cur.amt != null) out.push(cur); cur = null; };
  for (const line of lines) {
    const items = line.items.filter((i) => i.s && i.s.trim());
    if (!items.length) continue;
    const text = items.map((i) => i.s.trim()).join(' ');
    const up = normDesc(text);
    if (/(^| )(ENTRATE|USCITE|ACCREDITI|ADDEBITI|DARE|AVERE)( |$)/.test(up) && !DATE_TOKEN.test(text)) {
      for (const i of items) {
        const w = normDesc(i.s);
        if (/^(ENTRATE|ACCREDITI|AVERE)$/.test(w)) cols.in = i.x;
        if (/^(USCITE|ADDEBITI|DARE)$/.test(w)) cols.out = i.x;
        if (/^SALDO/.test(w)) cols.bal = i.x;
      }
      continue;
    }
    if (/SALDO (INIZIALE|FINALE|CONTABILE|DISPONIBILE)|TOTALE|PAGINA \d|PAG \d/.test(up)) { finish(); continue; }
    const words = up.match(DATE_WORDS);
    const m = text.match(DATE_TOKEN);
    const date = m ? parseDate(m[1]) : words ? parseDate(words[0]) : null;
    const amts = items.filter((i) => AMOUNT_TOKEN.test(i.s.trim()));
    const textItems = items.filter((i) => !AMOUNT_TOKEN.test(i.s.trim()) && !DATE_TOKEN.test(i.s.trim()) && !DATE_WORDS.test(normDesc(i.s)));
    const descPart = textItems.map((i) => i.s.trim()).join(' ').replace(DATE_WORDS, '').trim();
    if (date) {
      finish();
      const secondDate = items.slice(1).map((i) => i.s.trim().match(DATE_TOKEN)).find(Boolean);
      cur = { date, desc: descPart, amt: null };
      if (secondDate) cur.vdate = parseDate(secondDate[1]);
      extra = 0;
    } else if (cur && !amts.length && descPart && extra < 2) {
      cur.desc = (cur.desc + ' ' + descPart).trim(); extra++;
      continue;
    }
    if (cur && cur.amt == null && amts.length) {
      let pick = amts[0];
      if (cols.bal != null && amts.length > 1) pick = amts.reduce((a, b) => (Math.abs(a.x - cols.bal) > Math.abs(b.x - cols.bal) ? a : b));
      const raw = pick.s.trim();
      let v = parseAmount(raw, true);
      const explicit = /^[+\-−]/.test(raw) || /-$/.test(raw);
      if (!explicit) {
        if (cols.in != null && cols.out != null) v = Math.abs(pick.x - cols.out) <= Math.abs(pick.x - cols.in) ? -Math.abs(v) : Math.abs(v);
        else { v = -Math.abs(v); cur.signGuess = true; }
      }
      cur.amt = v;
      if (!date && descPart) cur.desc = (cur.desc + ' ' + descPart).trim();
    }
  }
  finish();
  return out.filter((t) => t.amt !== 0).map((t) => ({ ...t, desc: t.desc || '—' }));
}

/* ---------- the household JSON format (bank sync output and backups) ---------- */
// { format: 'household-transactions', version: 1, accounts: [{ name, bank, iban, balance: { date, amount }, transactions: [{ date, vdate, desc, amount, ref }] }] }
function fromSyncJson(obj) {
  if (!obj || obj.format !== 'household-transactions' || !Array.isArray(obj.accounts)) return null;
  return obj.accounts.map((a) => ({
    name: a.name || a.iban || 'Conto', bank: a.bank || '', iban: a.iban || '',
    checkpoint: a.balance && a.balance.date ? { date: a.balance.date, bal: Math.round(Number(a.balance.amount) * 100), src: 'bank' } : null,
    txns: (a.transactions || []).map((t) => ({ date: t.date, vdate: t.vdate || undefined, desc: t.desc || '—', amt: Math.round(Number(t.amount) * 100), ref: t.ref || undefined }))
      .filter((t) => parseDate(t.date) && t.amt),
  }));
}

/* ---------- import ---------- */
// cyrb53: a fast 53-bit string hash, enough to tell transactions apart.
function hash(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
// The same movement exported twice gets the same id; two identical movements on one day stay apart by their rank.
function assignIds(accId, txns) {
  const seen = {};
  return txns.map((t) => {
    const base = `${accId}|${t.date}|${t.amt}|${normDesc(t.desc).replace(/ /g, '')}`;
    seen[base] = (seen[base] || 0) + 1;
    return { ...t, id: hash(base + '|' + seen[base]) };
  });
}

function emptyState() {
  return { version: SCHEMA_VERSION, lang: 'it', accounts: [], txns: [], rules: [], categories: { custom: [], labels: {}, hidden: [] }, budgets: {}, imports: [], dismissed: {}, mappings: {}, lastBackup: null, created: new Date().toISOString() };
}
// Brings an older saved state up to the current schema. Add a step here whenever the shape changes.
function migrate(s) {
  if (!s || typeof s !== 'object') return emptyState();
  const base = emptyState();
  for (const k of Object.keys(base)) if (s[k] == null) s[k] = base[k];
  s.categories = { ...base.categories, ...s.categories };
  // v1 is the first version; future steps go here, e.g. if (s.version < 2) { ...; s.version = 2; }
  s.version = SCHEMA_VERSION;
  return s;
}

function newId(prefix) { return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// Merges parsed transactions into an account. Exact repeats are skipped; a movement with the same amount within
// two days that came in through a different channel (file vs bank link vs PDF) is treated as the same one.
function mergeImport(state, accId, txns, meta) {
  const src = meta.kind || 'file';
  const withIds = assignIds(accId, txns);
  const byId = new Set(state.txns.map((t) => t.id));
  const existing = state.txns.filter((t) => t.acc === accId);
  const used = new Set();
  const imp = { id: newId('imp'), at: new Date().toISOString(), file: meta.file || '', acc: accId, kind: src, added: 0, dup: 0, fuzzy: 0 };
  const added = [];
  for (const t of withIds) {
    if (byId.has(t.id)) { imp.dup++; continue; }
    const twin = existing.find((e) => !used.has(e.id) && e.src !== src && e.amt === t.amt && Math.abs(daysBetween(e.date, t.date)) <= 2);
    if (twin) { used.add(twin.id); imp.fuzzy++; continue; }
    const c = categorise({ ...t, acc: accId }, state.rules);
    const nt = { id: t.id, acc: accId, date: t.date, desc: t.desc, amt: t.amt, cat: c.cat, catSrc: c.src, imp: imp.id, src };
    if (t.vdate) nt.vdate = t.vdate;
    if (t.ref) nt.ref = t.ref;
    if (t.signGuess) nt.signGuess = true;
    state.txns.push(nt); byId.add(t.id); added.push(nt);
  }
  imp.added = added.length;
  if (added.length) {
    const ds = added.map((t) => t.date).sort();
    imp.from = ds[0]; imp.to = ds[ds.length - 1];
  }
  const acc = state.accounts.find((a) => a.id === accId);
  const cps = (meta.checkpoints || []).filter(Boolean);
  if (cps.length && acc) {
    const dates = new Set(cps.map((c) => c.date));
    acc.checkpoints = (acc.checkpoints || []).filter((c) => !dates.has(c.date) || c.src === 'manual').concat(cps.map((c) => ({ ...c, imp: imp.id })));
    acc.checkpoints.sort((a, b) => a.date.localeCompare(b.date));
  }
  state.txns.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  imp.transfers = detectTransfers(state.txns);
  state.imports.push(imp);
  return imp;
}
function undoImport(state, impId) {
  const before = state.txns.length;
  state.txns = state.txns.filter((t) => t.imp !== impId);
  for (const a of state.accounts) a.checkpoints = (a.checkpoints || []).filter((c) => c.imp !== impId);
  state.imports = state.imports.filter((i) => i.id !== impId);
  for (const t of state.txns) if (t.catSrc === 'transfer') { const c = categorise(t, state.rules); t.cat = c.cat; t.catSrc = c.src; }
  detectTransfers(state.txns);
  return before - state.txns.length;
}

// Pairs a payment out of one account with the same amount arriving in another within three days.
function detectTransfers(txns) {
  const free = txns.filter((t) => t.catSrc !== 'user' && t.catSrc !== 'transfer' && Math.abs(t.amt) >= 1000);
  const ins = free.filter((t) => t.amt > 0);
  const taken = new Set();
  let n = 0;
  for (const o of free) {
    if (o.amt >= 0) continue;
    const match = ins.find((i) => !taken.has(i.id) && i.acc !== o.acc && i.amt === -o.amt && Math.abs(daysBetween(o.date, i.date)) <= 3);
    if (!match) continue;
    taken.add(match.id);
    o.cat = match.cat = 'giroconto';
    o.catSrc = match.catSrc = 'transfer';
    o.pair = match.id; match.pair = o.id;
    n++;
  }
  return n;
}

/* ---------- aggregates ---------- */
const counted = (state, t) => !t.excl && catKind(state, t.cat) !== 'move';
function monthly(state, accFilter) {
  const m = {};
  for (const t of state.txns) {
    if (!counted(state, t) || (accFilter && t.acc !== accFilter)) continue;
    const k = monthOf(t.date);
    const r = (m[k] = m[k] || { month: k, inc: 0, out: 0, cats: {} });
    if (catKind(state, t.cat) === 'in') r.inc += t.amt; else r.out -= t.amt;
    r.cats[t.cat] = (r.cats[t.cat] || 0) + t.amt;
  }
  return m;
}
const lastDate = (txns) => txns.reduce((d, t) => (t.date > d ? t.date : d), '');
const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
const meanOf = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

// Average monthly spending per category over the n full months before `month`.
function categoryAverages(state, month, n = 12) {
  const m = monthly(state);
  const months = monthsRange(addMonths(month, -n), addMonths(month, -1)).filter((k) => m[k]);
  const avg = {};
  for (const k of months) for (const [c, v] of Object.entries(m[k].cats)) avg[c] = (avg[c] || 0) + v / months.length;
  return { avg, months: months.length };
}

function balances(state, asOf) {
  const out = {};
  for (const a of state.accounts) {
    const cps = (a.checkpoints || []).filter((c) => !asOf || c.date <= asOf);
    if (!cps.length) continue;
    const cp = cps[cps.length - 1];
    const after = state.txns.filter((t) => t.acc === a.id && t.date > cp.date && (!asOf || t.date <= asOf)).reduce((s, t) => s + t.amt, 0);
    out[a.id] = { bal: cp.bal + after, date: asOf || lastDate(state.txns.filter((t) => t.acc === a.id)) || cp.date, from: cp };
  }
  return out;
}
// Daily balances for one account, walked back from its latest checkpoint.
function averageBalance(state, accId, from, to) {
  const a = state.accounts.find((x) => x.id === accId);
  const cps = (a && a.checkpoints) || [];
  if (!cps.length) return null;
  const cp = cps[cps.length - 1];
  const tx = state.txns.filter((t) => t.acc === accId);
  const byDay = {};
  for (const t of tx) byDay[t.date] = (byDay[t.date] || 0) + t.amt;
  let bal = cp.bal;
  for (const t of tx) if (t.date > cp.date && t.date <= to) bal += t.amt;
  let d = to, total = 0, n = 0;
  if (cp.date > to) for (const t of tx) if (t.date > to && t.date <= cp.date) bal += t.amt;
  while (d >= from) { total += bal; n++; bal -= byDay[d] || 0; d = addDays(d, -1); }
  return n ? total / n : null;
}

/* ---------- recurring payments ---------- */
const PERIODS = [
  { id: 'monthly', days: 30.4, lo: 25, hi: 36, perYear: 12 },
  { id: 'bimonthly', days: 61, lo: 52, hi: 70, perYear: 6 },
  { id: 'quarterly', days: 91, lo: 80, hi: 102, perYear: 4 },
  { id: 'halfyearly', days: 182, lo: 165, hi: 200, perYear: 2 },
  { id: 'yearly', days: 365, lo: 340, hi: 390, perYear: 1 },
];
const NOT_RECURRING = new Set(['spesa', 'ristoranti', 'contanti', 'shopping', 'svago', 'giroconto']);
function findRecurring(state) {
  const groups = {};
  for (const t of state.txns) {
    if (t.excl || NOT_RECURRING.has(t.cat) || (t.cat === 'trasporti' && !/TELEPASS|ASSIC|BOLLO/.test(normDesc(t.desc)))) continue;
    const key = t.acc + '|' + merchantKey(t.desc) + '|' + (t.amt < 0 ? '-' : '+');
    (groups[key] = groups[key] || []).push(t);
  }
  const accLast = {};
  for (const t of state.txns) if (!accLast[t.acc] || t.date > accLast[t.acc]) accLast[t.acc] = t.date;
  const out = [];
  for (const [key, list] of Object.entries(groups)) {
    if (list.length < 3) continue;
    list.sort((a, b) => a.date.localeCompare(b.date));
    // several charges on one day count once (e.g. split bills)
    const days = [];
    for (const t of list) { const l = days[days.length - 1]; if (l && l.date === t.date) l.amt += t.amt; else days.push({ date: t.date, amt: t.amt, ids: [t.id] }); }
    if (days.length < 3) continue;
    const gaps = days.slice(1).map((d, i) => daysBetween(days[i].date, d.date));
    const mg = median(gaps);
    const p = PERIODS.find((x) => mg >= x.lo && mg <= x.hi);
    if (!p) continue;
    const regular = gaps.filter((g) => g >= p.lo * 0.7 && g <= p.hi * 1.4).length;
    if (regular < gaps.length * 0.7) continue;
    const amts = days.map((d) => Math.abs(d.amt));
    const typical = median(amts);
    const cv = Math.sqrt(meanOf(amts.map((a) => (a - meanOf(amts)) ** 2))) / (meanOf(amts) || 1);
    if (cv > 0.6) continue;
    const last = days[days.length - 1];
    const prev = amts.slice(0, -1);
    const prevCv = Math.sqrt(meanOf(prev.map((a) => (a - meanOf(prev)) ** 2))) / (meanOf(prev) || 1);
    let change = null;
    if (prevCv < 0.1 && Math.abs(last.amt) - median(prev) >= 100) change = Math.abs(last.amt) / median(prev) - 1;
    else if (amts.length >= 6) {
      const a = meanOf(amts.slice(-3)), b = meanOf(amts.slice(-6, -3));
      if (a - b >= 300) change = a / b - 1;
    }
    const acc = key.split('|')[0];
    const next = addDays(last.date, Math.round(Math.max(mg, p.lo)));
    const tol = Math.max(7, Math.round(p.days * 0.25));
    const sample = list[list.length - 1];
    out.push({
      key, acc, name: titleCase(merchantKey(sample.desc)), cat: sample.cat, sign: sample.amt < 0 ? -1 : 1, period: p.id, perYear: p.perYear,
      typical, last: Math.abs(last.amt), lastDate: last.date, firstDate: days[0].date, count: days.length, annual: typical * p.perYear,
      change: change != null && change >= 0.1 ? change : null, next,
      missing: accLast[acc] > addDays(next, tol) && daysBetween(next, accLast[acc]) < p.days * 2 + tol,
      stopped: accLast[acc] > addDays(next, tol) && daysBetween(next, accLast[acc]) >= p.days * 2 + tol,
      ids: list.map((t) => t.id),
    });
  }
  return out.sort((a, b) => b.annual - a.annual);
}

/* ---------- checks (looking back) ---------- */
// Each finding: { id (stable, for "dismiss"), level: 'alert' | 'warn' | 'info', key (text id), p (params), ids (transactions) }
function runChecks(state, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const out = [];
  const tx = state.txns;
  const accName = (id) => (state.accounts.find((a) => a.id === id) || { name: '?' }).name;

  // 1. Freshness: when were movements last imported?
  for (const a of state.accounts) {
    const ld = lastDate(tx.filter((t) => t.acc === a.id));
    if (ld && daysBetween(ld, today) > 40) out.push({ id: 'stale|' + a.id + '|' + ld, level: 'warn', key: 'chk.stale', p: { acc: a.name, date: ld, days: daysBetween(ld, today) } });
  }
  // 2. Backup
  if (tx.length && (!state.lastBackup || daysBetween(state.lastBackup.slice(0, 10), today) > 30)) out.push({ id: 'backup|' + (state.lastBackup || 'never').slice(0, 7), level: 'warn', key: state.lastBackup ? 'chk.backupOld' : 'chk.backupNever', p: { date: state.lastBackup && state.lastBackup.slice(0, 10) } });

  // 3. Months with no movements at all inside an account's history
  for (const a of state.accounts) {
    const at = tx.filter((t) => t.acc === a.id);
    if (at.length < 5) continue;
    const ms = new Set(at.map((t) => monthOf(t.date)));
    const gaps = monthsRange([...ms].sort()[0], monthOf(lastDate(at))).filter((m) => !ms.has(m));
    if (gaps.length) out.push({ id: 'gap|' + a.id + '|' + gaps.join(','), level: 'warn', key: 'chk.gap', p: { acc: a.name, months: gaps } });
  }

  // 4. Balance reconciliation between checkpoints
  for (const a of state.accounts) {
    const cps = a.checkpoints || [];
    for (let i = 1; i < cps.length; i++) {
      const A = cps[i - 1], B = cps[i];
      const flow = tx.filter((t) => t.acc === a.id && t.date > A.date && t.date <= B.date).reduce((s, t) => s + t.amt, 0);
      const diff = B.bal - (A.bal + flow);
      if (Math.abs(diff) > 1) out.push({ id: `rec|${a.id}|${A.date}|${B.date}|${diff}`, level: 'alert', key: 'chk.recon', p: { acc: a.name, from: A.date, to: B.date, diff } });
    }
    if (cps.length >= 2 && !out.some((f) => f.id.startsWith('rec|' + a.id))) out.push({ id: 'recok|' + a.id + '|' + cps[cps.length - 1].date, level: 'ok', key: 'chk.reconOk', p: { acc: a.name, n: cps.length, from: cps[0].date, to: cps[cps.length - 1].date } });
  }

  // 5. Possible double charges
  const recent = tx.filter((t) => t.amt <= -500 && catKind(state, t.cat) === 'out' && daysBetween(t.date, today) <= 120);
  const seenPair = new Set();
  for (let i = 0; i < recent.length; i++) for (let j = i + 1; j < recent.length; j++) {
    const a = recent[i], b = recent[j];
    if (a.acc !== b.acc || a.amt !== b.amt || Math.abs(daysBetween(a.date, b.date)) > 1 || merchantKey(a.desc) !== merchantKey(b.desc)) continue;
    const k = [a.id, b.id].sort().join('+');
    if (seenPair.has(k)) continue;
    seenPair.add(k);
    out.push({ id: 'dup|' + k, level: 'warn', key: 'chk.dup', p: { name: titleCase(merchantKey(a.desc)), amt: -a.amt, date: a.date, acc: accName(a.acc) }, ids: [a.id, b.id] });
  }

  // 6. Unusually large spending in the last 60 days
  const yearAgo = addDays(today, -365);
  for (const t of tx) {
    if (t.amt >= 0 || catKind(state, t.cat) !== 'out' || daysBetween(t.date, today) > 60 || ['tasse', 'assicurazioni', 'casa'].includes(t.cat) && t.amt > -50000) continue;
    const peers = tx.filter((x) => x.cat === t.cat && x.id !== t.id && x.amt < 0 && x.date >= yearAgo).map((x) => -x.amt);
    if (peers.length < 5) continue;
    const med = median(peers);
    if (-t.amt >= Math.max(25000, med * 4)) out.push({ id: 'big|' + t.id, level: 'info', key: 'chk.big', p: { desc: t.desc, amt: -t.amt, date: t.date, times: Math.round(-t.amt / med) }, ids: [t.id] });
  }

  // 7. Recurring: price rises, late or missing payments, new ones
  const rec = findRecurring(state);
  for (const r of rec) {
    if (r.sign < 0 && r.change) out.push({ id: `rise|${r.key}|${r.lastDate}`, level: 'warn', key: 'chk.rise', p: { name: r.name, pct: r.change, from: r.typical, to: r.last, annual: r.last * r.perYear - r.typical * r.perYear }, ids: r.ids.slice(-2) });
    if (r.missing) out.push({ id: `miss|${r.key}|${r.next}`, level: r.sign > 0 ? 'alert' : 'info', key: r.sign > 0 ? 'chk.missIn' : 'chk.missOut', p: { name: r.name, next: r.next, amt: r.typical, acc: accName(r.acc) } });
    if (daysBetween(r.firstDate, today) <= 150 && r.sign < 0) out.push({ id: 'new|' + r.key, level: 'info', key: 'chk.newRec', p: { name: r.name, amt: r.typical, annual: r.annual } });
  }

  // 8. Movements the rules could not place
  const unc = tx.filter((t) => t.catSrc === 'default' && daysBetween(t.date, today) <= 90);
  if (unc.length >= 5) out.push({ id: 'unc|' + monthOf(today) + '|' + Math.floor(unc.length / 10), level: 'info', key: 'chk.uncat', p: { n: unc.length }, ids: unc.map((t) => t.id) });

  // 9. PDF rows whose sign was guessed
  const guess = tx.filter((t) => t.signGuess);
  if (guess.length) out.push({ id: 'sign|' + guess.length, level: 'warn', key: 'chk.signGuess', p: { n: guess.length }, ids: guess.map((t) => t.id) });

  // 10. Budgets this month
  const month = monthOf(today);
  const cur = monthly(state)[month];
  if (cur) for (const [c, b] of Object.entries(state.budgets || {})) {
    if (!b) continue;
    const spent = -(cur.cats[c] || 0);
    const day = +today.slice(8, 10), dim = daysInMonth(month);
    if (spent > b) out.push({ id: `bud|${c}|${month}`, level: 'warn', key: 'chk.budgetOver', p: { cat: c, spent, budget: b } });
    else if (day >= 7 && spent / day * dim > b * 1.15) out.push({ id: `budp|${c}|${month}`, level: 'info', key: 'chk.budgetPace', p: { cat: c, spent, budget: b, proj: Math.round(spent / day * dim) } });
  }
  const order = { alert: 0, warn: 1, info: 2, ok: 3 };
  return out.filter((f) => !state.dismissed[f.id]).sort((a, b) => order[a.level] - order[b.level]);
}

/* ---------- suggestions (looking forward) ---------- */
function suggest(state, today) {
  today = today || new Date().toISOString().slice(0, 10);
  const out = [];
  const tx = state.txns;
  if (!tx.length) return out;
  const yearAgo = addDays(today, -365);
  const lastYear = tx.filter((t) => t.date > yearAgo && counted(state, t));
  const firstDate = tx.reduce((d, t) => (t.date < d ? t.date : d), today);
  const span = Math.min(12, Math.max(1, daysBetween(firstDate > yearAgo ? firstDate : yearAgo, today) / 30.4)); // months of data in the window
  const inc = lastYear.filter((t) => catKind(state, t.cat) === 'in').reduce((s, t) => s + t.amt, 0);
  const outT = -lastYear.filter((t) => catKind(state, t.cat) === 'out').reduce((s, t) => s + t.amt, 0);
  const monthlyOut = outT / span;

  // Savings rate
  if (inc > 0) out.push({ id: 'save', level: inc - outT >= 0 ? 'ok' : 'warn', key: inc - outT >= 0 ? 'sug.saving' : 'sug.deficit', p: { rate: (inc - outT) / inc, monthly: (inc - outT) / span, months: Math.round(span) } });

  // Subscriptions and recurring costs
  const rec = findRecurring(state).filter((r) => r.sign < 0 && !r.stopped);
  const subs = rec.filter((r) => r.cat === 'abbonamenti' || r.cat === 'telefono');
  if (subs.length) out.push({ id: 'subs', level: 'info', key: 'sug.subs', p: { n: subs.length, annual: subs.reduce((s, r) => s + r.annual, 0), list: subs.map((r) => `${r.name} (${r.typical / 100 | 0}€)`).slice(0, 6) } });
  const util = rec.filter((r) => r.cat === 'casa' && r.change);
  if (util.length) out.push({ id: 'util', level: 'info', key: 'sug.utilities', p: { names: util.map((r) => r.name) } });

  // Bank charges per account
  const fees = {};
  for (const t of lastYear) if (t.cat === 'banca') fees[t.acc] = (fees[t.acc] || 0) - t.amt;
  for (const [acc, f] of Object.entries(fees)) {
    if (f >= 4000) out.push({ id: 'fees|' + acc, level: 'info', key: 'sug.fees', p: { acc: (state.accounts.find((a) => a.id === acc) || {}).name, amt: f } });
  }

  // Stamp duty: €34.20 a year on each current account whose average balance exceeds €5,000
  for (const a of state.accounts) {
    const avg = averageBalance(state, a.id, yearAgo, today);
    if (avg != null && avg > 500000) out.push({ id: 'bollo|' + a.id, level: 'info', key: 'sug.bollo', p: { acc: a.name, avg } });
  }

  // Idle cash
  const bals = balances(state);
  const total = Object.values(bals).reduce((s, b) => s + b.bal, 0);
  if (Object.keys(bals).length && monthlyOut > 0 && total > monthlyOut * 6 + 1000000) out.push({ id: 'idle', level: 'info', key: 'sug.idle', p: { total, cushion: monthlyOut * 6, extra: total - monthlyOut * 6 } });

  // Categories growing faster than usual: last 3 full months vs the 9 before
  const m = monthly(state);
  const thisM = monthOf(today);
  const last3 = monthsRange(addMonths(thisM, -3), addMonths(thisM, -1)).filter((k) => m[k]);
  const prev9 = monthsRange(addMonths(thisM, -12), addMonths(thisM, -4)).filter((k) => m[k]);
  if (last3.length === 3 && prev9.length >= 6) {
    const cats = new Set(Object.values(m).flatMap((r) => Object.keys(r.cats)));
    for (const c of cats) {
      if (catKind(state, c) !== 'out' || c === 'altro') continue;
      const a = -meanOf(last3.map((k) => m[k].cats[c] || 0)), b = -meanOf(prev9.map((k) => m[k].cats[c] || 0));
      if (b > 2000 && a > b * 1.25 && a - b >= 3000) out.push({ id: `grow|${c}|${thisM}`, level: 'info', key: 'sug.grow', p: { cat: c, now: a, before: b, pct: a / b - 1 } });
    }
  }

  // Cash: hard to track when it is a large share of spending
  const cash = -lastYear.filter((t) => t.cat === 'contanti').reduce((s, t) => s + t.amt, 0);
  if (outT > 0 && cash / outT > 0.2) out.push({ id: 'cash', level: 'info', key: 'sug.cash', p: { share: cash / outT, amt: cash / span } });

  // Budgets not set yet
  if (!Object.values(state.budgets || {}).some(Boolean) && Object.keys(m).length >= 3) out.push({ id: 'budget', level: 'info', key: 'sug.budget', p: {} });
  return out.filter((f) => !state.dismissed[f.id]);
}

// Suggested monthly budget per category: the average of the last 6 full months, rounded up to €10.
function suggestBudgets(state, today) {
  const month = monthOf(today || new Date().toISOString().slice(0, 10));
  const { avg } = categoryAverages(state, month, 6);
  const out = {};
  for (const [c, v] of Object.entries(avg)) if (catKind(state, c) === 'out' && v < -1000) out[c] = Math.ceil(-v / 1000) * 1000;
  return out;
}

/* ---------- demo data ---------- */
// A synthetic couple of pensioners with a BCC current account and a Hype card. Not real data.
function makeDemo(today) {
  today = today || new Date().toISOString().slice(0, 10);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const s = emptyState();
  s.accounts = [{ id: 'acc_bcc', name: 'BCC conto corrente', bank: 'BCC', checkpoints: [] }, { id: 'acc_hype', name: 'Hype', bank: 'Hype', checkpoints: [] }];
  const bcc = [], hype = [];
  const start = addMonths(monthOf(today), -17);
  const months = monthsRange(start, monthOf(today));
  const d = (m, day) => `${m}-${pad2(Math.min(day, daysInMonth(m)))}`;
  months.forEach((m, i) => {
    const isLast = m === monthOf(today);
    const lim = (day) => !isLast || d(m, day) <= today;
    if (lim(1)) bcc.push({ date: d(m, 1), desc: 'ACCREDITO PENSIONE INPS RATEO ' + m.slice(5) + '/' + m.slice(0, 4), amt: 168540 });
    if (lim(1)) bcc.push({ date: d(m, 1), desc: 'BONIFICO A VOSTRO FAVORE INPS PENSIONE MARIA ROSSI', amt: 112030 });
    if (lim(3)) bcc.push({ date: d(m, 3), desc: 'GIROCONTO VERSO HYPE RICARICA', amt: -40000 });
    if (lim(4)) hype.push({ date: d(m, 4), desc: 'Ricarica da IBAN IT** BCC', amt: 40000 });
    if (lim(5)) bcc.push({ date: d(m, 5), desc: 'ADDEBITO SDD CONDOMINIO VIA ROMA 12', amt: -12000 });
    if (i % 2 === 0 && lim(12)) bcc.push({ date: d(m, 12), desc: 'ADDEBITO DIRETTO SDD ENEL ENERGIA SPA BOLLETTA', amt: -Math.round((i >= 12 ? 11800 : 9400) + rnd() * 1200) });
    if (i % 2 === 1 && lim(16)) bcc.push({ date: d(m, 16), desc: 'ADDEBITO SDD HERA COMM GAS', amt: -Math.round((m.slice(5) < '04' || m.slice(5) > '10' ? 16000 : 6000) + rnd() * 2000) });
    if (lim(8)) bcc.push({ date: d(m, 8), desc: 'ADDEBITO SDD TIM SPA FATTURA', amt: i >= 14 ? -3290 : -2990 });
    if (lim(10)) hype.push({ date: d(m, 10), desc: 'NETFLIX.COM', amt: -1399 });
    if (i >= 13 && lim(20)) hype.push({ date: d(m, 20), desc: 'DAZN Limited', amt: -3499 });
    if (lim(28)) bcc.push({ date: d(m, 28), desc: 'CANONE MENSILE CONTO', amt: -600 });
    if ((m.slice(5) === '03' || m.slice(5) === '06' || m.slice(5) === '09' || m.slice(5) === '12') && lim(30)) bcc.push({ date: d(m, 30), desc: 'IMPOSTA DI BOLLO E/C', amt: -855 });
    if (m.slice(5) === '06' && lim(16)) bcc.push({ date: d(m, 16), desc: 'PAGAMENTO F24 IMU ACCONTO', amt: -41200 });
    if (m.slice(5) === '04' && lim(18)) bcc.push({ date: d(m, 18), desc: 'ADDEBITO SDD GENERALI ITALIA POLIZZA AUTO', amt: -46300 });
    if (m.slice(5) === '01' && lim(25)) bcc.push({ date: d(m, 25), desc: 'PAGOPA BOLLO AUTO REGIONE', amt: -19800 });
    for (let w = 0; w < 4; w++) {
      const day = 2 + w * 7 + Math.floor(rnd() * 4);
      if (!lim(day)) continue;
      const shop = ['ESSELUNGA', 'CONAD SUPERSTORE', 'LIDL ITALIA', 'COOP ALLEANZA'][Math.floor(rnd() * 4)];
      (rnd() < 0.6 ? bcc : hype).push({ date: d(m, day), desc: `PAGAMENTO POS ${pad2(day)}/${m.slice(5)} ${shop} CARTA *1234`, amt: -Math.round(4500 + rnd() * 6000) });
    }
    if (lim(14)) bcc.push({ date: d(m, 14), desc: 'PAGAMENTO POS FARMACIA COMUNALE 2', amt: -Math.round(1500 + rnd() * 3500) });
    if (lim(19)) hype.push({ date: d(m, 19), desc: 'ENI STATION 4412', amt: -Math.round(5000 + rnd() * 2000) });
    if (lim(22)) hype.push({ date: d(m, 22), desc: rnd() < 0.5 ? 'PIZZERIA DA MARIO' : 'BAR CENTRALE', amt: -Math.round(1800 + rnd() * 4000) });
    if (lim(17)) bcc.push({ date: d(m, 17), desc: 'PRELIEVO BANCOMAT ATM 0042', amt: -15000 });
    if (rnd() < 0.5 && lim(24)) hype.push({ date: d(m, 24), desc: 'AMAZON EU SARL', amt: -Math.round(1500 + rnd() * 6000) });
  });
  // a double charge and an unusual expense, so the checks have something to show
  const recentM = addMonths(monthOf(today), -1), olderM = addMonths(monthOf(today), -2);
  hype.push({ date: d(olderM, 21), desc: 'TELEPASS SPA', amt: -2410 }, { date: d(olderM, 21), desc: 'TELEPASS SPA', amt: -2410 });
  bcc.push({ date: d(recentM, 9), desc: 'BONIFICO A FAVORE DI STUDIO DENTISTICO BIANCHI', amt: -95000 });
  const sortAsc = (a) => a.sort((x, y) => x.date.localeCompare(y.date));
  sortAsc(bcc); sortAsc(hype);
  // running balance on the BCC file, so reconciliation can work
  let bal = 1240000;
  for (const t of bcc) { bal += t.amt; t.bal = bal; }
  const half = Math.floor(bcc.length / 2);
  mergeImport(s, 'acc_bcc', bcc.slice(0, half), { file: 'demo-bcc-1.csv', checkpoints: checkpointsFromFile(bcc.slice(0, half)) });
  mergeImport(s, 'acc_bcc', bcc.slice(half - 5), { file: 'demo-bcc-2.csv', checkpoints: checkpointsFromFile(bcc.slice(half - 5)) });
  mergeImport(s, 'acc_hype', hype.filter((t) => t.date < addDays(today, -45)), { file: 'demo-hype.pdf', kind: 'pdf' });
  s.accounts[1].checkpoints.push({ date: lastDate(s.txns.filter((t) => t.acc === 'acc_hype')), bal: 31250, src: 'manual' });
  s.demo = true;
  return s;
}

if (typeof module !== 'undefined') {
  module.exports = { SCHEMA_VERSION, CATEGORIES, DEFAULT_RULES, allCategories, catById, catKind, normDesc, merchantKey, titleCase, categorise, recategorise, parseAmount, parseDate, addDays, daysBetween, monthOf, addMonths, monthsRange, daysInMonth, parseCSV, detectTable, rowsToTxns, checkpointsFromFile, txnsFromPdfLines, fromSyncJson, hash, assignIds, emptyState, migrate, mergeImport, undoImport, detectTransfers, monthly, categoryAverages, balances, averageBalance, findRecurring, runChecks, suggest, suggestBudgets, makeDemo, lastDate, median };
}
