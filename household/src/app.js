/* The page: six tabs, one state object, every change saved straight away. */
let S = emptyState();
const UI = { tab: 'home', month: null, f: { q: '', acc: '', cat: '', month: '', ids: null }, limit: 100, draft: null, result: null, open: null };
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => (window.HOUSEHOLD_TODAY || new Date().toISOString().slice(0, 10));

/* ---------- words and numbers ---------- */
const loc = () => (S.lang === 'en' ? 'en-GB' : 'it-IT');
function t(key, p) {
  const v = (STRINGS[S.lang] || STRINGS.it)[key];
  if (v == null) return key;
  if (typeof v === 'function') return v(p || {}, F);
  return p ? v.replace(/\{(\w+)\}/g, (m, k) => (p[k] != null ? p[k] : m)) : v;
}
const F = {
  eur: (c, dec) => {
    const x = (c || 0) / 100;
    const d = dec != null ? dec : Math.abs(x) >= 1000 ? 0 : 2;
    return new Intl.NumberFormat(loc(), { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }).format(x).replace('-', '−');
  },
  signed: (c) => (c > 0 ? '+' : '') + F.eur(c, 2),
  date: (iso) => (iso ? new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''),
  short: (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(loc(), { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  month: (ym) => new Date(ym + '-15T12:00:00Z').toLocaleDateString(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  mon: (ym) => new Date(ym + '-15T12:00:00Z').toLocaleDateString(loc(), { month: 'short', timeZone: 'UTC' }),
  pct: (x) => Math.round(x * 100) + '%',
  cat: (id) => { const c = catById(S, id); return c[S.lang] || c.it || c.label || id; },
  list: (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (S.lang === 'en' ? ' and ' : ' e ') + a[a.length - 1]),
};
const catIcon = (id) => catById(S, id).icon || '•';
const accName = (id) => (S.accounts.find((a) => a.id === id) || { name: '?' }).name;

/* ---------- saving ---------- */
let saving = Promise.resolve();
function commit() {
  saving = saving.then(() => Store.save(S)).then(() => renderStatus());
  render();
}

/* ---------- shell ---------- */
const TABS = ['home', 'moves', 'budget', 'checks', 'import', 'settings'];
function render() {
  document.documentElement.lang = S.lang;
  $('#app-name').textContent = t('appName');
  $('#app-tag').textContent = t('tagline');
  const findings = S.txns.length ? runChecks(S, today()) : [];
  const urgent = findings.filter((f) => f.level === 'alert' || f.level === 'warn').length;
  $('#tabs').innerHTML = TABS.map((k) => `<button role="tab" id="tab-${k}" aria-selected="${UI.tab === k}" data-act="tab" data-tab="${k}">${esc(t('tab.' + k))}${k === 'checks' && urgent ? ` <span class="badge">${urgent}</span>` : ''}</button>`).join('');
  $('#banner').innerHTML = S.demo ? `<div class="banner"><span>${esc(t('demoBanner'))}</span><button class="btn" data-act="clear-demo">${esc(t('demoClear'))}</button></div>` : '';
  const main = $('#main');
  const views = { home: viewHome, moves: viewMoves, budget: viewBudget, checks: viewChecks, import: viewImport, settings: viewSettings };
  main.innerHTML = views[UI.tab](findings);
  renderStatus();
}
function renderStatus() {
  const m = Store.mode();
  $('#status').innerHTML = m === 'memory' ? `<span class="warn-text">${esc(t('savedMemory'))}</span>` : `🔒 ${esc(t('savedLocal'))}`;
}

/* ---------- overview ---------- */
function currentMonth() {
  if (UI.month) return UI.month;
  const m = monthOf(today());
  return S.txns.some((t) => monthOf(t.date) === m) ? m : monthOf(lastDate(S.txns) || today());
}
function viewHome(findings) {
  if (!S.txns.length) {
    return `<section class="empty card"><h2>${esc(t('empty.title'))}</h2><p>${esc(t('empty.body'))}</p>
      <div class="big-actions"><button class="btn primary big" data-act="tab" data-tab="import">📄 ${esc(t('empty.import'))}</button>
      <button class="btn big" data-act="demo">🧪 ${esc(t('empty.demo'))}</button>
      <button class="btn big" data-act="restore">💾 ${esc(t('empty.restore'))}</button></div></section>`;
  }
  const month = currentMonth();
  const mm = monthly(S);
  const cur = mm[month] || { inc: 0, out: 0, cats: {} };
  const { avg, months } = categoryAverages(S, month, 12);
  const prevMonths = monthsRange(addMonths(month, -12), addMonths(month, -1)).filter((k) => mm[k]);
  const avgInc = prevMonths.length ? prevMonths.reduce((s, k) => s + mm[k].inc, 0) / prevMonths.length : null;
  const avgOut = prevMonths.length ? prevMonths.reduce((s, k) => s + mm[k].out, 0) / prevMonths.length : null;
  const isNow = month === monthOf(today());
  const kpi = (label, val, avgV, good) => `<div class="kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-val ${good}">${esc(F.eur(val, 0))}</div>
    ${avgV != null && !isNow ? `<div class="kpi-sub">${esc(t('vsAvg', { d: val - avgV }))}</div>` : avgV != null ? `<div class="kpi-sub">${esc(t('avg12'))}: ${esc(F.eur(avgV, 0))}</div>` : ''}</div>`;
  const left = cur.inc - cur.out;
  const urgent = findings.filter((f) => f.level === 'alert' || f.level === 'warn').slice(0, 3);
  const outCats = Object.keys({ ...cur.cats, ...avg }).filter((c) => catKind(S, c) === 'out' && ((cur.cats[c] || 0) < 0 || (avg[c] || 0) < -1000));
  outCats.sort((a, b) => (cur.cats[a] || 0) - (cur.cats[b] || 0) || (avg[a] || 0) - (avg[b] || 0));
  const max = Math.max(1, ...outCats.map((c) => Math.max(-(cur.cats[c] || 0), -(avg[c] || 0), (S.budgets[c] || 0))));
  const bars = outCats.map((c) => {
    const v = -(cur.cats[c] || 0), a = -(avg[c] || 0), b = S.budgets[c] || 0;
    const over = b && v > b;
    return `<button class="cat-row" data-act="filter-cat" data-cat="${esc(c)}" data-month="${month}">
      <span class="cat-name">${catIcon(c)} ${esc(F.cat(c))}</span>
      <span class="cat-bar"><span class="fill ${over ? 'over' : ''}" style="width:${(v / max * 100).toFixed(1)}%"></span>${a > 0 ? `<span class="tick" style="left:${(a / max * 100).toFixed(1)}%" title="${esc(t('avg12'))}"></span>` : ''}</span>
      <span class="cat-val">${esc(F.eur(v, 0))}${a > 0 ? `<small>${esc(t('avg12'))} ${esc(F.eur(a, 0))}</small>` : ''}</span></button>`;
  }).join('');
  const bals = balances(S);
  const accs = S.accounts.map((a) => {
    const b = bals[a.id];
    return `<div class="acc"><div class="acc-name">${esc(a.name)}</div>${b ? `<div class="acc-bal">${esc(F.eur(b.bal, 2))}</div><div class="kpi-sub">${esc(t('balanceAt', { date: b.date }))}</div>` : `<div class="kpi-sub">${esc(t('noBalance'))}</div>`}</div>`;
  }).join('');
  return `
  <div class="month-bar"><button class="btn icon" data-act="month" data-d="-1" aria-label="prev">‹</button><h2>${esc(F.month(month))}${isNow ? ` <small>${esc(t('soFar', { day: +today().slice(8, 10) }))}</small>` : ''}</h2><button class="btn icon" data-act="month" data-d="1" aria-label="next" ${month >= monthOf(today()) ? 'disabled' : ''}>›</button></div>
  <section class="kpis">${kpi(t('income'), cur.inc, avgInc, 'pos')}${kpi(t('spending'), cur.out, avgOut, '')}${kpi(t('left'), left, null, left >= 0 ? 'pos' : 'neg')}</section>
  ${urgent.length ? `<section class="card"><h3>${esc(t('attention'))}</h3>${urgent.map(findingHtml).join('')}<button class="link" data-act="tab" data-tab="checks">${esc(t('seeAll'))} →</button></section>` : ''}
  <section class="card"><h3>${esc(t('byCategory'))}</h3><p class="sub">${esc(t('byCategorySub', { month: F.month(month) }))}${months ? '' : ''}</p><div class="cats">${bars}</div></section>
  <section class="card"><h3>${esc(t('trend'))}</h3><p class="sub">${esc(t('trendSub'))}</p>${trendChart(mm, month)}</section>
  ${S.accounts.length ? `<section class="card"><h3>${esc(t('accounts'))}</h3><div class="accs">${accs}</div></section>` : ''}`;
}
function trendChart(mm, month) {
  const ms = monthsRange(addMonths(month, -11), month);
  const W = 640, H = 200, pad = 26, bw = (W - pad) / ms.length;
  const max = Math.max(1, ...ms.map((k) => Math.max((mm[k] || {}).inc || 0, (mm[k] || {}).out || 0)));
  const y = (v) => H - 22 - (v / max) * (H - 40);
  const bars = ms.map((k, i) => {
    const r = mm[k] || { inc: 0, out: 0 };
    const x = pad + i * bw;
    const w = Math.max(3, bw / 2 - 4);
    return `<g><title>${esc(F.month(k))}: ${esc(t('income'))} ${esc(F.eur(r.inc, 0))}, ${esc(t('spending'))} ${esc(F.eur(r.out, 0))}</title>
      <rect x="${x + 2}" y="${y(Math.max(0, r.inc))}" width="${w}" height="${H - 22 - y(Math.max(0, r.inc))}" rx="2" class="b-in"/>
      <rect x="${x + 2 + w + 2}" y="${y(Math.max(0, r.out))}" width="${w}" height="${H - 22 - y(Math.max(0, r.out))}" rx="2" class="b-out"/>
      <text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="axis">${esc(F.mon(k))}</text></g>`;
  }).join('');
  const grid = [0.5, 1].map((f) => `<line x1="${pad}" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" class="grid"/><text x="0" y="${y(max * f) + 4}" class="axis">${esc(Math.round(max * f / 100000) + 'k')}</text>`).join('');
  return `<div class="legend"><span><i class="sw b-in"></i>${esc(t('income'))}</span><span><i class="sw b-out"></i>${esc(t('spending'))}</span></div>
    <svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('trend'))}">${grid}<line x1="${pad}" x2="${W}" y1="${H - 22}" y2="${H - 22}" class="base"/>${bars}</svg>`;
}

/* ---------- transactions ---------- */
function filtered() {
  const f = UI.f, q = normDesc(f.q);
  return S.txns.filter((x) => (!f.ids || f.ids.has(x.id)) && (!f.acc || x.acc === f.acc) && (!f.cat || x.cat === f.cat) && (!f.month || monthOf(x.date) === f.month) && (!q || normDesc(x.desc + ' ' + (x.note || '')).includes(q)));
}
function catOptions(sel, kindFilter) {
  return allCategories(S).filter((c) => !kindFilter || c.kind === kindFilter).map((c) => `<option value="${esc(c.id)}" ${c.id === sel ? 'selected' : ''}>${c.icon || ''} ${esc(c[S.lang] || c.it || c.label)}</option>`).join('');
}
function viewMoves() {
  const list = filtered();
  const inc = list.filter((x) => counted(S, x) && x.amt > 0).reduce((s, x) => s + x.amt, 0);
  const out = -list.filter((x) => counted(S, x) && x.amt < 0).reduce((s, x) => s + x.amt, 0);
  const months = [...new Set(S.txns.map((x) => monthOf(x.date)))].sort().reverse();
  const rows = list.slice(0, UI.limit).map((x) => {
    const open = UI.open === x.id;
    const tags = [x.excl && t('moves.excluded'), x.catSrc === 'transfer' && t('moves.transfer'), x.src === 'manual' && t('moves.manual'), x.signGuess && t('moves.signGuess')].filter(Boolean);
    return `<div class="tx ${x.excl ? 'excl' : ''} ${open ? 'open' : ''}" data-id="${x.id}">
      <button class="tx-main" data-act="open" data-id="${x.id}" aria-expanded="${open}">
        <span class="tx-date">${esc(F.short(x.date))}</span>
        <span class="tx-desc">${esc(x.desc)}${x.note ? `<small class="note">✎ ${esc(x.note)}</small>` : ''}<small class="tx-acc">${esc(accName(x.acc))}${tags.map((g) => ` · <b class="tag">${esc(g)}</b>`).join('')}</small></span>
        <span class="tx-amt ${x.amt > 0 ? 'pos' : ''}">${esc(F.signed(x.amt))}</span></button>
      <label class="tx-cat"><span class="sr">${esc(t('category'))}</span><select data-act="set-cat" data-id="${x.id}">${catOptions(x.cat)}</select></label>
      ${open ? `<div class="tx-more">
        <label>${esc(t('moves.note'))} <input type="text" data-act="note" data-id="${x.id}" value="${esc(x.note || '')}" maxlength="140"></label>
        <div class="row-actions"><button class="btn" data-act="excl" data-id="${x.id}">${esc(t(x.excl ? 'moves.include' : 'moves.exclude'))}</button>
        ${x.signGuess || x.src === 'pdf' ? `<button class="btn" data-act="flip" data-id="${x.id}">${esc(t('moves.flip'))}</button>` : ''}
        ${x.src === 'manual' ? `<button class="btn danger" data-act="del" data-id="${x.id}">${esc(t('moves.delete'))}</button>` : ''}</div></div>` : ''}
    </div>`;
  }).join('');
  return `<section class="card">
    <div class="filters">
      <input type="search" id="q" placeholder="${esc(t('moves.search'))}" value="${esc(UI.f.q)}" aria-label="${esc(t('moves.search'))}">
      <select data-act="f-acc" aria-label="${esc(t('account'))}"><option value="">${esc(t('moves.allAcc'))}</option>${S.accounts.map((a) => `<option value="${a.id}" ${UI.f.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <select data-act="f-cat" aria-label="${esc(t('category'))}"><option value="">${esc(t('moves.allCat'))}</option>${catOptions(UI.f.cat)}</select>
      <select data-act="f-month" aria-label="${esc(t('monthPick'))}"><option value="">${esc(t('moves.all'))}</option>${months.map((m) => `<option value="${m}" ${UI.f.month === m ? 'selected' : ''}>${esc(F.month(m))}</option>`).join('')}</select>
    </div>
    ${UI.f.ids ? `<p class="chip">🔎 ${UI.f.ids.size} · <button class="link" data-act="clear-ids">✕ ${esc(t('close'))}</button></p>` : ''}
    <div class="moves-head"><p class="sub">${esc(t('moves.count', { n: list.length, inc, out }))}</p><button class="btn" data-act="manual">＋ ${esc(t('moves.add'))}</button></div>
    <div class="txs">${rows || `<p class="sub">${esc(t('moves.none'))}</p>`}</div>
    ${list.length > UI.limit ? `<button class="btn wide" data-act="more">${esc(t('moves.more'))}</button>` : ''}
  </section>`;
}

/* ---------- budget ---------- */
function viewBudget() {
  const month = monthOf(today());
  const cur = monthly(S)[month] || { cats: {} };
  const { avg } = categoryAverages(S, month, 6);
  const cats = allCategories(S).filter((c) => c.kind === 'out');
  let tb = 0, ts = 0;
  const rows = cats.map((c) => {
    const spent = -(cur.cats[c.id] || 0), b = S.budgets[c.id] || 0, a = -(avg[c.id] || 0);
    tb += b; ts += spent;
    const pct = b ? Math.min(100, spent / b * 100) : 0;
    return `<div class="bud">
      <span class="cat-name">${c.icon || ''} ${esc(F.cat(c.id))}<small>${a > 0 ? esc(t('budget.avg', { avg: a })) : ''}</small></span>
      <label class="bud-in"><span class="sr">${esc(F.cat(c.id))}</span>€ <input type="number" min="0" step="10" inputmode="numeric" data-act="budget" data-cat="${c.id}" value="${b ? b / 100 : ''}" placeholder="${esc(t('budget.none'))}"></label>
      <span class="bud-bar">${b ? `<span class="cat-bar"><span class="fill ${spent > b ? 'over' : ''}" style="width:${pct.toFixed(1)}%"></span></span><small>${esc(t('budget.spent', { spent, budget: b }))}</small>` : spent ? `<small>${esc(F.eur(spent, 0))}</small>` : ''}</span>
    </div>`;
  }).join('');
  return `<section class="card"><h3>${esc(t('budget.title'))} · ${esc(F.month(month))}</h3><p class="sub">${esc(t('budget.sub'))}</p>
    <button class="btn" data-act="suggest-budget">✨ ${esc(t('budget.suggest'))}</button>
    <div class="buds">${rows}<div class="bud total"><span class="cat-name">${esc(t('budget.total'))}</span><span class="bud-in">${tb ? esc(F.eur(tb, 0)) : ''}</span><span class="bud-bar"><small>${esc(F.eur(ts, 0))}</small></span></div></div></section>`;
}

/* ---------- checks ---------- */
const LEVEL_ICON = { alert: '⛔', warn: '⚠️', info: '💡', ok: '✅' };
function findingHtml(f) {
  return `<div class="finding ${f.level}"><span class="f-icon" aria-hidden="true">${LEVEL_ICON[f.level]}</span><div class="f-body"><p>${esc(t(f.key, f.p))}</p>
    <div class="f-actions">${f.ids && f.ids.length ? `<button class="link" data-act="show-ids" data-ids="${f.ids.join(',')}">${esc(t('show'))}</button>` : ''}
    ${f.level !== 'ok' ? `<button class="link" data-act="dismiss" data-fid="${esc(f.id)}">${esc(t('dismiss'))}</button>` : ''}</div></div></div>`;
}
function viewChecks(findings) {
  const sugs = suggest(S, today());
  const rec = findRecurring(S);
  const hidden = Object.keys(S.dismissed).length;
  const imports = [...S.imports].reverse().map((i) => `<div class="imp"><span>${esc(i.file || i.kind)}<small>${esc(t('imp.row', { ...i, acc: accName(i.acc) }))}</small></span><button class="btn small" data-act="undo" data-imp="${i.id}">${esc(t('undo'))}</button></div>`).join('');
  return `<section class="card"><h3>${esc(t('checks.title'))}</h3><p class="sub">${esc(t('checks.sub'))}</p>
    ${findings.length ? findings.map(findingHtml).join('') : `<p>${esc(t('allGood'))}</p>`}
    ${hidden ? `<button class="link" data-act="undismiss">${esc(t('restoreDismissed', { n: hidden }))}</button>` : ''}</section>
  <section class="card"><h3>${esc(t('checks.sugTitle'))}</h3><p class="sub">${esc(t('checks.sugSub'))}</p>${sugs.map(findingHtml).join('') || `<p>${esc(t('allGood'))}</p>`}</section>
  <section class="card"><h3>${esc(t('checks.recTitle'))}</h3><p class="sub">${esc(t('checks.recSub'))}</p>
    <div class="recs">${rec.map((r) => `<button class="rec ${r.stopped ? 'stopped' : ''}" data-act="show-ids" data-ids="${r.ids.join(',')}"><span>${catIcon(r.cat)} ${esc(r.name)}${r.sign > 0 ? ` <b class="tag">${esc(t('rec.in'))}</b>` : ''}${r.stopped ? ` <b class="tag">${esc(t('rec.stopped'))}</b>` : ''}<small>${esc(accName(r.acc))}</small></span><span class="rec-val">${esc(t('rec.row', { ...r, period: t('period.' + r.period) }))}</span></button>`).join('')}</div></section>
  <section class="card"><h3>${esc(t('checks.importsTitle'))}</h3><p class="sub">${esc(t('checks.importsSub'))}</p>${imports}</section>`;
}

/* ---------- import ---------- */
function viewImport() {
  const d = UI.draft;
  if (UI.result) {
    return `<section class="card"><h3>✅ ${esc(t('imp.done', UI.result))}</h3>
      <div class="big-actions"><button class="btn primary" data-act="backup">💾 ${esc(t('imp.backupNow'))}</button><button class="btn" data-act="imp-again">${esc(t('imp.again'))}</button><button class="btn" data-act="tab" data-tab="home">${esc(t('tab.home'))}</button></div></section>`;
  }
  if (!d) {
    return `<section class="card"><h3>${esc(t('imp.title'))}</h3>
      <label class="drop" id="drop"><span class="drop-icon" aria-hidden="true">📄</span><span>${esc(t('imp.drop'))} <u>${esc(t('imp.choose'))}</u></span><small>${esc(t('imp.formats'))}</small>
      <input type="file" id="imp-file" accept=".csv,.txt,.xlsx,.xls,.pdf,.json,.htm,.html"></label></section>
      <section class="card"><h3>${esc(t('imp.howTitle'))}</h3><ul class="how"><li>🏦 ${esc(t('imp.howBcc'))}</li><li>📱 ${esc(t('imp.howHype'))}</li><li>🔗 ${esc(t('imp.howSync'))}</li><li>🔁 ${esc(t('imp.overlap'))}</li></ul></section>`;
  }
  if (d.kind === 'error') return `<section class="card"><p class="warn-text">${esc(t(d.msg))}</p><button class="btn" data-act="imp-again">${esc(t('imp.again'))}</button></section>`;
  if (d.kind === 'backup') return `<section class="card"><h3>${esc(t('imp.backupFound'))}</h3><button class="btn danger" data-act="restore-draft">${esc(t('imp.restore'))}</button> <button class="btn" data-act="imp-again">${esc(t('cancel'))}</button></section>`;
  const accSelect = (sel, i) => `<select data-act="draft-acc" data-i="${i == null ? '' : i}">${S.accounts.map((a) => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}<option value="__new" ${sel === '__new' ? 'selected' : ''}>${esc(t('imp.newAccount'))}</option></select>`;
  const newName = (val, i) => `<input type="text" data-act="draft-name" data-i="${i == null ? '' : i}" placeholder="${esc(t('imp.accountName'))}" value="${esc(val || '')}">`;
  if (d.kind === 'sync') {
    return `<section class="card"><h3>${esc(t('imp.syncAccounts', { n: d.accounts.length }))}</h3>
      ${d.accounts.map((a, i) => `<div class="sync-acc"><b>${esc(a.name)}</b> <small>${esc(a.iban ? '…' + a.iban.slice(-4) : '')} · ${a.txns.length}</small>
        <label>${esc(t('imp.toAccount'))} ${accSelect(a.target, i)}</label>${a.target === '__new' ? newName(a.newName, i) : ''}</div>`).join('')}
      <button class="btn primary big" data-act="imp-go">${esc(t('imp.confirm'))}</button> <button class="btn" data-act="imp-again">${esc(t('cancel'))}</button></section>`;
  }
  // table or pdf
  let parsed = d.kind === 'pdf' ? { txns: d.txns, skipped: [] } : d.map ? rowsToTxns(d.rows, d.map) : { txns: [], skipped: [] };
  d.parsed = parsed;
  const prev = parsed.txns.slice(0, 8).map((x) => `<tr><td>${esc(F.date(x.date))}</td><td>${esc(x.desc)}</td><td class="num ${x.amt > 0 ? 'pos' : ''}">${esc(F.signed(x.amt))}${x.signGuess ? ' ?' : ''}</td>${x.bal != null ? `<td class="num">${esc(F.eur(x.bal, 2))}</td>` : ''}</tr>`).join('');
  let mapping = '';
  if (d.kind === 'table') {
    const m = d.map || { headerRow: 0, date: -1, vdate: -1, desc: [], amt: -1, debit: -1, credit: -1, bal: -1, decimalComma: true, dateOrder: 'dmy' };
    const cols = (d.rows[m.headerRow] || []).map((h, i) => `${i + 1}. ${String(h).slice(0, 30)}`);
    const sel = (field, val, multiIdx) => `<label>${esc(t('col.' + field))}<select data-act="map" data-field="${field}" ${multiIdx != null ? `data-k="${multiIdx}"` : ''}><option value="-1">${esc(t('col.none'))}</option>${cols.map((c, i) => `<option value="${i}" ${val === i ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
    mapping = `<details class="mapping" ${d.map ? '' : 'open'}><summary>${esc(t('imp.columns'))}</summary><p class="sub">${esc(d.map ? t('imp.columnsHint') : t('err.noColumns'))}</p>
      <div class="map-grid"><label>${esc(t('imp.headerRow'))}<input type="number" min="1" max="${d.rows.length}" value="${m.headerRow + 1}" data-act="map" data-field="headerRow"></label>
      ${sel('date', m.date)}${sel('desc', m.desc[0], 0)}${sel('desc', m.desc[1], 1)}${sel('amt', m.amt)}${sel('debit', m.debit)}${sel('credit', m.credit)}${sel('bal', m.bal)}${sel('vdate', m.vdate)}
      <label>${esc(t('imp.dateOrder'))}<select data-act="map" data-field="dateOrder"><option value="dmy" ${m.dateOrder !== 'mdy' ? 'selected' : ''}>31/12/2026</option><option value="mdy" ${m.dateOrder === 'mdy' ? 'selected' : ''}>12/31/2026</option></select></label></div></details>`;
  }
  return `<section class="card"><h3>${esc(t('imp.preview'))}: ${esc(d.file)}</h3>
    ${d.kind === 'pdf' ? `<p class="warn-text">${esc(t('imp.pdfNote'))}</p>` : ''}
    <div class="imp-acc"><label>${esc(t('imp.toAccount'))} ${accSelect(d.target)}</label>${d.target === '__new' ? newName(d.newName) : ''}</div>
    ${mapping}
    <p class="sub">${esc(t('imp.rows', { n: parsed.txns.length, skipped: parsed.skipped.length }))}</p>
    <div class="table-wrap"><table class="preview"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('description'))}</th><th class="num">${esc(t('amount'))}</th>${parsed.txns[0] && parsed.txns[0].bal != null ? `<th class="num">${esc(t('col.bal'))}</th>` : ''}</tr></thead><tbody>${prev}</tbody></table></div>
    <button class="btn primary big" data-act="imp-go" ${parsed.txns.length ? '' : 'disabled'}>${esc(t('imp.confirm'))} (${parsed.txns.length})</button> <button class="btn" data-act="imp-again">${esc(t('cancel'))}</button></section>`;
}
function guessAccount(bank, name) {
  const n = normDesc(name || ''), b = normDesc(bank || '');
  const a = S.accounts.find((x) => (b && normDesc(x.bank) === b) || (n && normDesc(x.name).includes(n)) || (b && normDesc(x.name).includes(b)));
  return a ? a.id : '__new';
}
async function handleFile(file) {
  const r = await readBankFile(file);
  const d = { ...r, file: file.name };
  if (r.kind === 'table') {
    const sig = r.map ? r.map.columns.join('|') : null;
    if (sig && S.mappings[sig]) { d.map = { ...r.map, ...S.mappings[sig], headerRow: r.map.headerRow }; d.target = S.accounts.some((a) => a.id === S.mappings[sig].acc) ? S.mappings[sig].acc : null; }
    if (!d.target) d.target = guessAccount(r.map && r.map.bank, /hype/i.test(file.name) ? 'Hype' : /bcc/i.test(file.name) ? 'BCC' : '');
    d.newName = r.map && r.map.bank ? r.map.bank : '';
  }
  if (r.kind === 'pdf') { d.target = guessAccount('Hype', /hype/i.test(file.name) ? 'Hype' : ''); d.newName = 'Hype'; }
  if (r.kind === 'sync') for (const a of d.accounts) { const byIban = a.iban && S.accounts.find((x) => x.iban === a.iban); a.target = byIban ? byIban.id : guessAccount(a.bank, a.name); a.newName = a.name; }
  UI.draft = d; UI.result = null;
  render();
}
function ensureAccount(target, name, bank, iban) {
  if (target && target !== '__new') return target;
  const id = 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  S.accounts.push({ id, name: (name || bank || 'Conto').trim(), bank: bank || '', iban: iban || '', checkpoints: [] });
  return id;
}
function runImport() {
  const d = UI.draft;
  const sum = { added: 0, dup: 0, fuzzy: 0, transfers: 0 };
  const add = (r) => { sum.added += r.added; sum.dup += r.dup; sum.fuzzy += r.fuzzy; sum.transfers += r.transfers; };
  if (d.kind === 'sync') {
    for (const a of d.accounts) {
      const id = ensureAccount(a.target, a.newName, a.bank, a.iban);
      add(mergeImport(S, id, a.txns, { file: d.file, kind: 'bank', checkpoints: [a.checkpoint] }));
    }
  } else {
    const id = ensureAccount(d.target, d.newName, d.map && d.map.bank, '');
    if (d.kind === 'table' && d.map) S.mappings[d.map.columns.join('|')] = { ...d.map, acc: id };
    add(mergeImport(S, id, d.parsed.txns, { file: d.file, kind: d.kind === 'pdf' ? 'pdf' : 'file', checkpoints: d.kind === 'table' ? checkpointsFromFile(d.parsed.txns) : [] }));
  }
  UI.draft = null; UI.result = sum;
  commit();
}

/* ---------- settings ---------- */
function viewSettings() {
  const accs = S.accounts.map((a) => {
    const cps = (a.checkpoints || []).slice(-3).reverse();
    return `<div class="set-acc"><input type="text" value="${esc(a.name)}" data-act="acc-name" data-acc="${a.id}" aria-label="${esc(t('set.rename'))}">
      <div class="bal-form"><label>${esc(t('set.balanceToday'))} € <input type="number" step="0.01" id="bal-${a.id}"></label><label>${esc(t('set.balanceDate'))} <input type="date" id="bald-${a.id}" value="${today()}"></label><button class="btn" data-act="add-bal" data-acc="${a.id}">${esc(t('set.addBalance'))}</button></div>
      <small>${cps.map((c) => `${esc(F.date(c.date))}: ${esc(F.eur(c.bal, 2))}`).join(' · ')}</small>
      <button class="link danger" data-act="del-acc" data-acc="${a.id}">${esc(t('set.deleteAcc'))}</button></div>`;
  }).join('');
  const rules = S.rules.map((r, i) => `<div class="rule"><span><b>${esc(r.words.join(', '))}</b> → ${catIcon(r.cat)} ${esc(F.cat(r.cat))}${r.sign ? ` (${r.sign === 'in' ? '+' : '−'})` : ''}</span><button class="link danger" data-act="del-rule" data-i="${i}">✕</button></div>`).join('');
  const cats = allCategories(S).filter((c) => c.kind !== 'move').map((c) => `<label class="cat-edit">${c.icon || ''} <input type="text" value="${esc(c[S.lang] || c.it || c.label)}" data-act="cat-label" data-cat="${c.id}"></label>`).join('');
  return `<section class="card"><h3>${esc(t('set.accounts'))}</h3><p class="sub">${esc(t('set.accountsSub'))}</p>${accs}</section>
  <section class="card"><h3>${esc(t('set.backup'))}</h3><p class="sub">${esc(t('set.backupSub'))}</p><p>${esc(t('set.lastBackup', { date: S.lastBackup }))}</p>
    <div class="big-actions"><button class="btn primary" data-act="backup">💾 ${esc(t('set.download'))}</button><button class="btn" data-act="restore">${esc(t('set.restore'))}</button></div></section>
  <section class="card"><h3>${esc(t('set.rules'))}</h3><p class="sub">${esc(t('set.rulesSub'))}</p>${rules || `<p class="sub">${esc(t('set.noRules'))}</p>`}
    <div class="rule-form"><input type="text" id="rule-words" placeholder="${esc(t('set.ruleWords'))}"><select id="rule-cat">${catOptions('spesa')}</select><button class="btn" data-act="add-rule">${esc(t('set.addRule'))}</button></div>
    <button class="link" data-act="reapply">${esc(t('set.reapply'))}</button></section>
  <section class="card"><h3>${esc(t('set.categories'))}</h3><p class="sub">${esc(t('set.catSub'))}</p><div class="cat-grid">${cats}</div>
    <div class="rule-form"><input type="text" id="cat-new" placeholder="${esc(t('set.catName'))}"><select id="cat-kind"><option value="out">${esc(t('set.catKindOut'))}</option><option value="in">${esc(t('set.catKindIn'))}</option></select><button class="btn" data-act="add-cat">${esc(t('set.addCat'))}</button></div></section>
  <section class="card"><h3>${esc(t('set.language'))}</h3><div class="big-actions"><button class="btn ${S.lang === 'it' ? 'primary' : ''}" data-act="lang" data-lang="it">Italiano</button><button class="btn ${S.lang === 'en' ? 'primary' : ''}" data-act="lang" data-lang="en">English</button></div></section>
  <section class="card"><h3>${esc(t('set.danger'))}</h3><p class="sub">${esc(t('set.storage', { mode: Store.mode() }))}</p><button class="btn danger" data-act="reset">${esc(t('set.reset'))}</button></section>`;
}

/* ---------- dialogs ---------- */
function modal(html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-back" data-act="modal-close"></div><div class="modal card" role="dialog" aria-modal="true">${html}</div>`;
  m.hidden = false;
  const f = m.querySelector('input,select,button');
  if (f) f.focus();
}
const closeModal = () => { $('#modal').hidden = true; $('#modal').innerHTML = ''; };
function askRule(tx) {
  const key = merchantKey(tx.desc);
  if (!key || key.length < 3) return;
  UI.pendingRule = { words: [key], cat: tx.cat, sign: tx.amt > 0 ? 'in' : 'out' };
  modal(`<p>${esc(t('moves.applySimilar', { key, cat: F.cat(tx.cat) }))}</p><div class="big-actions"><button class="btn primary" data-act="rule-yes">${esc(t('moves.yesAll'))}</button><button class="btn" data-act="modal-close">${esc(t('moves.justThis'))}</button></div>`);
}
function manualDialog() {
  modal(`<h3>${esc(t('manual.title'))}</h3><div class="map-grid">
    <label>${esc(t('date'))}<input type="date" id="m-date" value="${today()}"></label>
    <label>${esc(t('amount'))} €<input type="number" step="0.01" min="0" id="m-amt" inputmode="decimal"></label>
    <label>${esc(t('description'))}<input type="text" id="m-desc" maxlength="80"></label>
    <label>${esc(t('category'))}<select id="m-cat">${catOptions('spesa', 'out')}</select></label></div>
    <div class="big-actions"><button class="btn primary" data-act="manual-save">${esc(t('save'))}</button><button class="btn" data-act="modal-close">${esc(t('cancel'))}</button></div>`);
}

/* ---------- backup ---------- */
function downloadBackup() {
  S.lastBackup = new Date().toISOString();
  const blob = new Blob([JSON.stringify({ format: 'household-backup', version: SCHEMA_VERSION, at: S.lastBackup, state: S })], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `conti-di-casa-${today()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  commit();
}
function pickFile(cb) {
  const inp = $('#file-pick');
  inp.value = '';
  inp.onchange = () => inp.files[0] && cb(inp.files[0]);
  inp.click();
}

/* ---------- events ---------- */
const ACTIONS = {
  tab: (el) => { UI.tab = el.dataset.tab; if (UI.tab !== 'import') UI.result = null; render(); window.scrollTo(0, 0); },
  demo: () => { S = makeDemo(today()); S.lang = S.lang || 'it'; commit(); },
  'clear-demo': () => { const lang = S.lang; S = emptyState(); S.lang = lang; UI.tab = 'import'; commit(); },
  restore: () => pickFile(async (f) => { const r = await readBankFile(f); if (r.kind === 'backup') { S = migrate(r.state); commit(); } else { UI.tab = 'import'; handleFile(f); } }),
  month: (el) => { UI.month = addMonths(currentMonth(), +el.dataset.d); render(); },
  'filter-cat': (el) => { UI.f = { q: '', acc: '', cat: el.dataset.cat, month: el.dataset.month, ids: null }; UI.tab = 'moves'; render(); },
  open: (el) => { UI.open = UI.open === el.dataset.id ? null : el.dataset.id; render(); },
  more: () => { UI.limit += 200; render(); },
  'clear-ids': () => { UI.f.ids = null; render(); },
  'show-ids': (el) => { UI.f = { q: '', acc: '', cat: '', month: '', ids: new Set(el.dataset.ids.split(',')) }; UI.tab = 'moves'; render(); window.scrollTo(0, 0); },
  dismiss: (el) => { S.dismissed[el.dataset.fid] = today(); commit(); },
  undismiss: () => { S.dismissed = {}; commit(); },
  excl: (el) => { const x = S.txns.find((q) => q.id === el.dataset.id); x.excl = !x.excl; commit(); },
  flip: (el) => { const x = S.txns.find((q) => q.id === el.dataset.id); x.amt = -x.amt; delete x.signGuess; if (x.catSrc !== 'user') { const c = categorise(x, S.rules); x.cat = c.cat; x.catSrc = c.src; } commit(); },
  del: (el) => { S.txns = S.txns.filter((q) => q.id !== el.dataset.id); commit(); },
  manual: () => manualDialog(),
  'manual-save': () => {
    const amt = Math.round(parseFloat($('#m-amt').value) * 100);
    const date = $('#m-date').value;
    if (!amt || !date) return;
    let acc = S.accounts.find((a) => a.id === 'acc_cash');
    if (!acc) S.accounts.push(acc = { id: 'acc_cash', name: S.lang === 'en' ? 'Cash' : 'Contanti', bank: '', checkpoints: [] });
    S.txns.push({ id: 'm' + Date.now().toString(36), acc: acc.id, date, desc: $('#m-desc').value || F.cat($('#m-cat').value), amt: -Math.abs(amt), cat: $('#m-cat').value, catSrc: 'user', src: 'manual', excl: false });
    S.txns.sort((a, b) => b.date.localeCompare(a.date));
    closeModal(); commit();
  },
  'modal-close': () => closeModal(),
  'rule-yes': () => { S.rules.push(UI.pendingRule); recategorise(S); closeModal(); commit(); },
  'suggest-budget': () => { const s = suggestBudgets(S, today()); for (const [c, v] of Object.entries(s)) if (!S.budgets[c]) S.budgets[c] = v; commit(); },
  'imp-again': () => { UI.draft = null; UI.result = null; render(); },
  'imp-go': () => runImport(),
  'restore-draft': () => { if (confirm(t('imp.restore') + '?')) { S = migrate(UI.draft.state); UI.draft = null; UI.tab = 'home'; commit(); } },
  undo: (el) => { if (confirm(t('undoConfirm'))) { undoImport(S, el.dataset.imp); commit(); } },
  backup: () => downloadBackup(),
  'add-bal': (el) => {
    const id = el.dataset.acc, v = parseFloat($('#bal-' + id).value), d = $('#bald-' + id).value;
    if (!isFinite(v) || !d) return;
    const a = S.accounts.find((x) => x.id === id);
    a.checkpoints = (a.checkpoints || []).filter((c) => c.date !== d).concat([{ date: d, bal: Math.round(v * 100), src: 'manual' }]).sort((x, y) => x.date.localeCompare(y.date));
    commit();
  },
  'del-acc': (el) => { if (confirm(t('set.deleteAccConfirm'))) { S.accounts = S.accounts.filter((a) => a.id !== el.dataset.acc); S.txns = S.txns.filter((x) => x.acc !== el.dataset.acc); commit(); } },
  'del-rule': (el) => { S.rules.splice(+el.dataset.i, 1); recategorise(S); commit(); },
  'add-rule': () => { const w = $('#rule-words').value.trim(); if (!w) return; S.rules.push({ words: [w.toUpperCase()], cat: $('#rule-cat').value }); recategorise(S); commit(); },
  reapply: () => { recategorise(S); commit(); },
  'add-cat': () => {
    const name = $('#cat-new').value.trim(); if (!name) return;
    S.categories.custom.push({ id: 'c_' + Date.now().toString(36), kind: $('#cat-kind').value, it: name, en: name, icon: '🏷️' });
    commit();
  },
  lang: (el) => { S.lang = el.dataset.lang; commit(); },
  reset: () => { if (confirm(t('set.resetConfirm'))) { const lang = S.lang; S = emptyState(); S.lang = lang; UI.tab = 'home'; commit(); } },
};
const CHANGES = {
  'set-cat': (el) => { const x = S.txns.find((q) => q.id === el.dataset.id); x.cat = el.value; x.catSrc = 'user'; commit(); askRule(x); },
  note: (el) => { const x = S.txns.find((q) => q.id === el.dataset.id); x.note = el.value.trim(); commit(); },
  'f-acc': (el) => { UI.f.acc = el.value; UI.limit = 100; render(); },
  'f-cat': (el) => { UI.f.cat = el.value; UI.limit = 100; render(); },
  'f-month': (el) => { UI.f.month = el.value; UI.limit = 100; render(); },
  budget: (el) => { const v = parseFloat(el.value); if (v > 0) S.budgets[el.dataset.cat] = Math.round(v * 100); else delete S.budgets[el.dataset.cat]; commit(); },
  'acc-name': (el) => { const a = S.accounts.find((x) => x.id === el.dataset.acc); if (el.value.trim()) a.name = el.value.trim(); commit(); },
  'cat-label': (el) => {
    const c = S.categories.custom.find((x) => x.id === el.dataset.cat);
    if (c) { c.it = c.en = el.value.trim() || c.it; } else if (el.value.trim()) S.categories.labels[el.dataset.cat] = el.value.trim();
    commit();
  },
  'draft-acc': (el) => { const d = UI.draft; if (el.dataset.i !== '') d.accounts[+el.dataset.i].target = el.value; else d.target = el.value; render(); },
  'draft-name': (el) => { const d = UI.draft; if (el.dataset.i !== '') d.accounts[+el.dataset.i].newName = el.value; else d.newName = el.value; },
  map: (el) => {
    const d = UI.draft;
    d.map = d.map || { headerRow: 0, date: -1, vdate: -1, desc: [], amt: -1, debit: -1, credit: -1, bal: -1, decimalComma: true, dateOrder: 'dmy', columns: [] };
    const f = el.dataset.field;
    if (f === 'headerRow') { d.map.headerRow = Math.max(0, (+el.value || 1) - 1); }
    else if (f === 'dateOrder') d.map.dateOrder = el.value;
    else if (f === 'desc') { d.map.desc[+el.dataset.k] = +el.value; d.map.desc = d.map.desc.filter((i) => i != null && i >= 0); }
    else d.map[f] = +el.value;
    d.map.columns = (d.rows[d.map.headerRow] || []).map(String);
    render();
  },
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT') return;
  const fn = ACTIONS[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.id === 'imp-file' && el.files[0]) return handleFile(el.files[0]);
  const fn = el.dataset && CHANGES[el.dataset.act];
  if (fn) fn(el);
});
let qTimer;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { UI.f.q = e.target.value; UI.limit = 100; const pos = e.target.selectionStart; render(); const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); }, 200);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
document.addEventListener('dragover', (e) => { if (UI.tab === 'import') { e.preventDefault(); const d = $('#drop'); if (d) d.classList.add('over'); } });
document.addEventListener('dragleave', () => { const d = $('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return;
  e.preventDefault();
  UI.tab = 'import';
  handleFile(e.dataTransfer.files[0]);
});

/* ---------- start ---------- */
(async () => {
  const saved = await Store.load();
  S = saved ? migrate(saved) : emptyState();
  if (!saved && /^en/i.test(navigator.language || '') && !/^it/i.test(navigator.language || '')) S.lang = 'en';
  render();
})();
