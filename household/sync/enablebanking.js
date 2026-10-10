#!/usr/bin/env node
// Downloads transactions straight from the bank through Enable Banking (EU PSD2 open banking), and writes them
// as a household-transactions JSON file for the app's Import tab. Read-only: PSD2 account access cannot move money.
//
// One-off setup (see household/README.md): create a free "restricted" production application at enablebanking.com,
// link your own BCC and Hype accounts there, then save household/private/enablebanking.json:
//   { "appId": "<application id>", "keyFile": "household/private/<application id>.pem", "redirectUrl": "https://example.com/callback" }
//
// Usage:
//   node household/sync/enablebanking.js banks [search]       list Italian banks Enable Banking knows (e.g. "bcc", "hype")
//   node household/sync/enablebanking.js link "<bank name>"   authorise a bank in the browser (repeat every ~90-180 days)
//   node household/sync/enablebanking.js fetch [--days 120]   download transactions and balances for every linked account
//   node household/sync/enablebanking.js status               show linked accounts and when consent expires
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const API = 'https://api.enablebanking.com';
const PRIV = path.join(__dirname, '..', 'private');
const CONFIG = path.join(PRIV, 'enablebanking.json');
const SESSIONS = path.join(PRIV, 'sessions.json');

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt(appId, privateKeyPem, now = Math.floor(Date.now() / 1000)) {
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'RS256', kid: appId }));
  const body = b64url(JSON.stringify({ iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 }));
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + body).sign(privateKeyPem);
  return `${head}.${body}.${b64url(sig)}`;
}

function loadConfig() {
  if (!fs.existsSync(CONFIG)) {
    console.error(`Missing ${path.relative(process.cwd(), CONFIG)}. See household/README.md, "Bank link".`);
    process.exit(1);
  }
  const c = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
  c.key = fs.readFileSync(path.resolve(c.keyFile), 'utf8');
  c.country = c.country || 'IT';
  return c;
}
async function api(cfg, method, url, body) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: 'Bearer ' + jwt(cfg.appId, cfg.key), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}
const readSessions = () => (fs.existsSync(SESSIONS) ? JSON.parse(fs.readFileSync(SESSIONS, 'utf8')) : []);
const writeSessions = (s) => { fs.mkdirSync(PRIV, { recursive: true }); fs.writeFileSync(SESSIONS, JSON.stringify(s, null, 2), { mode: 0o600 }); };
const ask = (q) => new Promise((resolve) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (a) => { rl.close(); resolve(a.trim()); }); });

/* ---------- mapping, kept pure for the tests ---------- */
function mapTransaction(t) {
  const out = t.credit_debit_indicator === 'DBIT';
  const amount = Math.abs(Number(t.transaction_amount && t.transaction_amount.amount)) * (out ? -1 : 1);
  const party = out ? t.creditor && t.creditor.name : t.debtor && t.debtor.name;
  const remit = Array.isArray(t.remittance_information) ? t.remittance_information.join(' ') : t.remittance_information || '';
  const desc = [party, remit, t.note].filter(Boolean).join(' · ').replace(/\s+/g, ' ').trim() || (t.bank_transaction_code && t.bank_transaction_code.description) || '—';
  return { date: t.booking_date || t.value_date || t.transaction_date, vdate: t.value_date || undefined, desc, amount: amount.toFixed(2), ref: t.entry_reference || t.transaction_id || undefined };
}
function pickBalance(balances) {
  const order = ['CLBD', 'ITBD', 'CLAV', 'ITAV', 'XPCD', 'OTHR'];
  const list = (balances || []).filter((b) => b.balance_amount);
  list.sort((a, b) => (order.indexOf(a.balance_type) + 99) % 99 - (order.indexOf(b.balance_type) + 99) % 99);
  const b = list[0];
  return b ? { date: b.reference_date || new Date().toISOString().slice(0, 10), amount: Number(b.balance_amount.amount).toFixed(2) } : null;
}

/* ---------- commands ---------- */
async function banks(cfg, search) {
  const r = await api(cfg, 'GET', `/aspsps?country=${cfg.country}`);
  const q = (search || '').toLowerCase();
  const list = (r.aspsps || []).filter((a) => !q || a.name.toLowerCase().includes(q));
  for (const a of list) console.log(`${a.name}${a.maximum_consent_validity ? `   (consent up to ${Math.round(a.maximum_consent_validity / 86400)} days)` : ''}`);
  if (!list.length) console.log('No bank matches. Try a shorter search, e.g. "credito cooperativo" or "sella".');
}
async function link(cfg, name) {
  if (!name) throw new Error('Give the bank name exactly as `banks` prints it.');
  const r = await api(cfg, 'GET', `/aspsps?country=${cfg.country}`);
  const aspsp = (r.aspsps || []).find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (!aspsp) throw new Error(`Unknown bank "${name}". Run: banks ${name.split(' ')[0]}`);
  const days = Math.min(180, aspsp.maximum_consent_validity ? Math.floor(aspsp.maximum_consent_validity / 86400) : 90);
  const validUntil = new Date(Date.now() + days * 864e5).toISOString();
  const state = crypto.randomUUID();
  const auth = await api(cfg, 'POST', '/auth', { access: { valid_until: validUntil }, aspsp: { name: aspsp.name, country: cfg.country }, state, redirect_url: cfg.redirectUrl, psu_type: 'personal' });
  console.log('\n1. Open this link and log in to the bank as usual (with its app or SMS code):\n\n   ' + auth.url + '\n');
  console.log(`2. The bank sends you to ${cfg.redirectUrl}?code=... The page may not load: that is fine.`);
  const back = await ask('3. Paste the full address from the browser bar here: ');
  const u = new URL(back);
  if (u.searchParams.get('state') && u.searchParams.get('state') !== state) throw new Error('The state does not match this request. Start again.');
  const code = u.searchParams.get('code');
  if (!code) throw new Error('No code in that address: ' + (u.searchParams.get('error_description') || u.searchParams.get('error') || 'unknown error'));
  const session = await api(cfg, 'POST', '/sessions', { code });
  const sessions = readSessions().filter((s) => s.bank !== aspsp.name);
  sessions.push({ id: session.session_id, bank: aspsp.name, validUntil, accounts: (session.accounts || []).map((a) => ({ uid: a.uid, iban: a.account_id && a.account_id.iban, name: a.name || a.product || aspsp.name, currency: a.currency })) });
  writeSessions(sessions);
  console.log(`\nLinked ${aspsp.name}: ${(session.accounts || []).length} account(s), consent valid until ${validUntil.slice(0, 10)}.`);
}
async function fetchAll(cfg, days) {
  const sessions = readSessions();
  if (!sessions.length) throw new Error('No bank linked yet. Run: link "<bank name>"');
  const from = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
  const out = { format: 'household-transactions', version: 1, generated: new Date().toISOString(), source: 'enablebanking', accounts: [] };
  for (const s of sessions) {
    if (new Date(s.validUntil) < new Date()) { console.warn(`! ${s.bank}: consent expired on ${s.validUntil.slice(0, 10)}. Run link again.`); continue; }
    for (const a of s.accounts) {
      const txns = [];
      let key = null, pages = 0;
      do {
        const q = new URLSearchParams({ date_from: from, transaction_status: 'BOOK' });
        if (key) q.set('continuation_key', key);
        const r = await api(cfg, 'GET', `/accounts/${encodeURIComponent(a.uid)}/transactions?${q}`);
        for (const t of r.transactions || []) if (!t.status || t.status === 'BOOK') txns.push(mapTransaction(t));
        key = r.continuation_key || null;
      } while (key && ++pages < 50);
      let balance = null;
      try { balance = pickBalance((await api(cfg, 'GET', `/accounts/${encodeURIComponent(a.uid)}/balances`)).balances); } catch (e) { console.warn(`! ${s.bank}: no balance (${e.message.slice(0, 80)})`); }
      out.accounts.push({ name: a.name, bank: /hype/i.test(s.bank) ? 'Hype' : /credito cooperativo|bcc|cassa rurale|raiffeisen/i.test(s.bank) ? 'BCC' : s.bank, iban: a.iban || '', balance, transactions: txns.filter((t) => t.date) });
      console.log(`${s.bank} ${a.iban ? '…' + a.iban.slice(-4) : ''}: ${txns.length} transactions since ${from}${balance ? `, balance ${balance.amount} on ${balance.date}` : ''}`);
      const left = Math.round((new Date(s.validUntil) - Date.now()) / 864e5);
      if (left < 14) console.warn(`! ${s.bank}: consent ends in ${left} days. Run link again soon.`);
    }
  }
  fs.mkdirSync(PRIV, { recursive: true });
  const file = path.join(PRIV, `movimenti-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 1), { mode: 0o600 });
  console.log(`\nWrote ${path.relative(process.cwd(), file)}. Open the app, tab Importa, and drop this file in.`);
}
function status() {
  const sessions = readSessions();
  if (!sessions.length) return console.log('No bank linked yet.');
  for (const s of sessions) console.log(`${s.bank}: ${s.accounts.length} account(s), consent until ${s.validUntil.slice(0, 10)}`);
}

if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  const daysArg = rest.indexOf('--days');
  (async () => {
    if (cmd === 'status') return status();
    const cfg = loadConfig();
    if (cmd === 'banks') return banks(cfg, rest.join(' '));
    if (cmd === 'link') return link(cfg, rest.join(' '));
    if (cmd === 'fetch') return fetchAll(cfg, daysArg >= 0 ? +rest[daysArg + 1] : 120);
    console.log('Commands: banks [search] | link "<bank name>" | fetch [--days 120] | status');
  })().catch((e) => { console.error('Error:', e.message); process.exit(1); });
}
module.exports = { jwt, mapTransaction, pickBalance };
