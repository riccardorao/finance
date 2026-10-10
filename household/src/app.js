/* The page: eight sections, one state object, every change saved straight away. */
let S = emptyState();
const UI = { tab: 'home', month: null, f: { q: '', acc: '', cat: '', month: '', ids: null, extra: false }, limit: 100, draft: null, result: null, open: null, goalOpen: null, onb: { banks: [], cash: true } };
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
  k: (c) => { const x = c / 100; return x >= 1e6 ? (x / 1e6).toLocaleString(loc(), { maximumFractionDigits: 1 }) + 'M' : x >= 1000 ? Math.round(x / 1000) + 'k' : String(Math.round(x)); },
  date: (iso) => (iso ? new Date(iso.slice(0, 10) + 'T12:00:00Z').toLocaleDateString(loc(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''),
  short: (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString(loc(), { day: 'numeric', month: 'short', timeZone: 'UTC' }),
  month: (ym) => new Date(ym.slice(0, 7) + '-15T12:00:00Z').toLocaleDateString(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  mon: (ym) => new Date(ym + '-15T12:00:00Z').toLocaleDateString(loc(), { month: 'short', timeZone: 'UTC' }),
  pct: (x) => Math.round(x * 100) + '%',
  cat: (id) => { const c = catById(S, id); return c[S.lang] || c.it || c.label || id; },
  list: (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + (S.lang === 'en' ? ' and ' : ' e ') + a[a.length - 1]),
};
const catIcon = (id) => catById(S, id).icon || '•';
const accName = (id) => (S.accounts.find((a) => a.id === id) || { name: '?' }).name;
const goalColor = (g) => `var(--g${(Math.max(0, S.goals.findIndex((x) => x.id === g.id)) % 8) + 1})`;
const goalIcon = (g) => (GOAL_TYPES.find((x) => x.id === g.type) || GOAL_TYPES[GOAL_TYPES.length - 1]).icon;

/* ---------- icons (24px line icons) ---------- */
const ICON = {
  home: '<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  moves: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  budget: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  save: '<path d="M5 11a7 6 0 0 1 13-2h2v4l-2 1-1 3h-3v-2h-4v2H7l-1-3a5 5 0 0 1-1-3z"/><path d="M10 6.5h3"/><circle cx="15" cy="10" r=".6"/>',
  goals: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  checks: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  import: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 14v5h16v-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
};
const icon = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;

/* ---------- saving ---------- */
let saving = Promise.resolve();
function commit() {
  saving = saving.then(() => Store.save(S)).then(() => renderStatus());
  render();
}

/* ---------- shell ---------- */
const TABS = ['home', 'moves', 'budget', 'save', 'goals', 'checks', 'import', 'settings'];
function render() {
  document.documentElement.lang = S.lang;
  document.title = t('appName');
  const onboarding = !S.profile.onboarded && !S.txns.length;
  $('#brand-name').textContent = S.profile.name || t('appName');
  $('#brand-sub').textContent = S.profile.name ? t('appName') : t('tagline');
  const findings = S.txns.length ? runChecks(S, today()) : [];
  const urgent = findings.filter((f) => f.level === 'alert' || f.level === 'warn').length;
  $('#nav').hidden = onboarding;
  $('#nav-list').innerHTML = TABS.map((k) => `<button class="nav-item" id="tab-${k}" aria-current="${UI.tab === k ? 'page' : 'false'}" data-act="tab" data-tab="${k}">${icon(k)}<span>${esc(t('nav.' + k))}</span>${k === 'checks' && urgent ? `<b class="badge">${urgent}</b>` : ''}</button>`).join('');
  $('#banner').innerHTML = S.demo ? `<div class="banner"><span>🧪 ${esc(t('demoBanner'))}</span><button class="btn small" data-act="clear-demo">${esc(t('demoClear'))}</button></div>` : '';
  const views = { home: viewHome, moves: viewMoves, budget: viewBudget, save: viewSave, goals: viewGoals, checks: viewChecks, import: viewImport, settings: viewSettings };
  $('#main').innerHTML = onboarding ? viewOnboarding() : views[UI.tab](findings);
  renderStatus();
}
function renderStatus() {
  const m = Store.mode();
  $('#status').innerHTML = m === 'memory' ? `<span class="warn-text">${esc(t('savedMemory'))}</span>` : `🔒 ${esc(t('savedLocal'))}`;
}
const card = (title, sub, body, cls = '') => `<section class="card ${cls}">${title ? `<h3>${title}</h3>` : ''}${sub ? `<p class="sub">${sub}</p>` : ''}${body}</section>`;

/* ---------- onboarding ---------- */
function viewOnboarding() {
  const chips = BANKS.map((b) => `<button class="chip ${UI.onb.banks.includes(b.id) ? 'on' : ''}" data-act="onb-bank" data-bank="${b.id}" aria-pressed="${UI.onb.banks.includes(b.id)}">${esc(b.name)}</button>`).join('');
  return `<section class="onb">
    <div class="onb-hero"><div class="onb-mark" aria-hidden="true">${icon('home')}</div><h2>${esc(t('onb.title'))}</h2><p>${esc(t('onb.body'))}</p></div>
    <div class="card">
      <label class="field">${esc(t('onb.name'))}<input type="text" id="onb-name" placeholder="${esc(t('onb.namePh'))}" maxlength="40"></label>
      <p class="field-label">${esc(t('onb.banks'))}</p><div class="chips">${chips}</div>
      <label class="field">${esc(t('onb.other'))}<input type="text" id="onb-other" maxlength="40"></label>
      <label class="check"><input type="checkbox" id="onb-cash" ${UI.onb.cash ? 'checked' : ''}> ${esc(t('onb.cash'))}</label>
      <div class="actions"><button class="btn primary big" data-act="onb-start">${esc(t('onb.start'))} →</button></div>
      <div class="actions"><button class="link" data-act="demo">🧪 ${esc(t('onb.demo'))}</button><button class="link" data-act="restore">💾 ${esc(t('onb.restore'))}</button>
      <button class="link" data-act="lang" data-lang="${S.lang === 'it' ? 'en' : 'it'}">${S.lang === 'it' ? 'English' : 'Italiano'}</button></div>
    </div></section>`;
}

/* ---------- overview ---------- */
function currentMonth() {
  if (UI.month) return UI.month;
  const m = monthOf(today());
  return S.txns.some((x) => monthOf(x.date) === m) ? m : monthOf(lastDate(S.txns) || today());
}
function viewHome(findings) {
  if (!S.txns.length) {
    return card(esc(t('imp.title')), esc(t('imp.formats')), `<div class="actions"><button class="btn primary big" data-act="tab" data-tab="import">${icon('import')} ${esc(t('imp.title'))}</button><button class="btn" data-act="demo">🧪 ${esc(t('onb.demo'))}</button></div>`);
  }
  const month = currentMonth();
  const mm = monthly(S);
  const cur = mm[month] || { inc: 0, out: 0, extra: 0, cats: {} };
  const prev = monthsRange(addMonths(month, -12), addMonths(month, -1)).filter((k) => mm[k]);
  const avg = (f) => (prev.length ? prev.reduce((s, k) => s + f(mm[k]), 0) / prev.length : null);
  const isNow = month === monthOf(today());
  const left = cur.inc - cur.out;
  const rate = cur.inc > 0 ? Math.max(0, left / cur.inc) : 0;
  const stat = (label, val, avgV, cls, extra) => `<div class="hero-stat"><span>${esc(label)}</span><b class="${cls}">${esc(F.eur(val, 0))}</b>
    <small>${extra ? esc(extra) + ' · ' : ''}${avgV != null ? esc(isNow ? `${t('avg12')} ${F.eur(avgV, 0)}` : t('vsAvg', { d: val - avgV })) : ''}</small></div>`;
  const hero = `<section class="hero">
    <div class="hero-top"><button class="hero-nav" data-act="month" data-d="-1" aria-label="‹">‹</button>
      <div><p class="hero-label">${esc(isNow ? t('hero.left') : t('hero.leftPast', { month }))}${isNow ? ` · ${esc(t('soFar', { day: +today().slice(8, 10) }))}` : ''}</p>
      <p class="hero-big">${esc(F.eur(left, 0))}</p></div>
      <button class="hero-nav" data-act="month" data-d="1" aria-label="›" ${month >= monthOf(today()) ? 'disabled' : ''}>›</button></div>
    <div class="hero-row">${stat(t('income'), cur.inc, avg((r) => r.inc), '')}${stat(t('spending'), cur.out, avg((r) => r.out), '', cur.extra ? `${t('extraSpending')} ${F.eur(cur.extra, 0)}` : '')}
      <div class="hero-ring">${ring(rate, '#fff', 74, F.pct(rate))}<small>${esc(t('hero.saveRate'))}</small></div></div>
    <p class="hero-month">${esc(F.month(month))}</p></section>`;

  const urgent = findings.filter((f) => f.level === 'alert' || f.level === 'warn').slice(0, 3);
  const { avg: cavg } = categoryAverages(S, month, 12);
  const outCats = Object.keys({ ...cur.cats, ...cavg }).filter((c) => catKind(S, c) === 'out' && ((cur.cats[c] || 0) < 0 || (!isNow && (cavg[c] || 0) < -1000)));
  outCats.sort((a, b) => (cur.cats[a] || 0) - (cur.cats[b] || 0) || (cavg[a] || 0) - (cavg[b] || 0));
  const max = Math.max(1, ...outCats.map((c) => Math.max(-(cur.cats[c] || 0), -(cavg[c] || 0), S.budgets[c] || 0)));
  const bars = outCats.slice(0, 10).map((c) => {
    const v = -(cur.cats[c] || 0), a = -(cavg[c] || 0), b = S.budgets[c] || 0;
    return `<button class="cat-row" data-act="filter-cat" data-cat="${esc(c)}" data-month="${month}" data-tip="${esc(`${F.cat(c)}: ${F.eur(v, 0)} · ${t('avg12')} ${F.eur(a, 0)}${b ? ` · budget ${F.eur(b, 0)}` : ''}`)}">
      <span class="cat-name"><span class="cat-ico">${catIcon(c)}</span>${esc(F.cat(c))}</span>
      <span class="cat-bar"><span class="fill ${b && v > b ? 'over' : ''}" style="width:${(v / max * 100).toFixed(1)}%"></span>${a > 0 ? `<span class="tick" style="left:${(a / max * 100).toFixed(1)}%"></span>` : ''}</span>
      <span class="cat-val">${esc(F.eur(v, 0))}</span></button>`;
  }).join('');
  const rows = monthsRange(addMonths(month, -11), month).map((k) => ({ month: k, inc: (mm[k] || {}).inc || 0, out: (mm[k] || {}).out || 0 }));
  const trend = trendChart(rows, { title: t('trend'), axis: (v) => F.k(v), month: (k) => F.mon(k), tip: (r) => `${F.month(r.month)}: ${t('income')} ${F.eur(r.inc, 0)} · ${t('spending')} ${F.eur(r.out, 0)}` });

  const plan = planGoals(S, today());
  const goals = plan.rows.slice(0, 4).map((r) => `<button class="mini-goal" data-act="goal-open" data-id="${r.goal.id}">${ring(r.progress, goalColor(r.goal), 52, F.pct(r.progress))}<span><b>${goalIcon(r.goal)} ${esc(r.goal.name)}</b><small>${esc(t('goal.saved', { saved: r.goal.saved, target: r.target }))}</small><em class="pill ${r.status}">${esc(t('status.' + r.status))}</em></span></button>`).join('');
  const opps = opportunities(S, today());
  const oppTotal = opps.filter((o) => o.kind !== 'idle').reduce((s, o) => s + o.annual, 0);
  const bals = balances(S);
  const accs = S.accounts.filter((a) => a.id !== CASH_ACC || bals[a.id]).map((a) => {
    const b = bals[a.id];
    return `<div class="acc"><span class="acc-name">${esc(a.name)}</span>${b ? `<b>${esc(F.eur(b.bal, 2))}</b><small>${esc(t('balanceAt', { date: b.date }))}</small>` : `<small>${esc(t('noBalance'))}</small>`}</div>`;
  }).join('');
  return `${hero}
  <div class="grid2">
    <div>
      ${urgent.length ? card(esc(t('attention')), '', urgent.map(findingHtml).join('') + `<button class="link" data-act="tab" data-tab="checks">${esc(t('seeAll'))} →</button>`) : ''}
      ${card(esc(t('byCategory')), esc(t('byCategorySub', { month: F.month(month) })), `<div class="cats">${bars}</div>`)}
    </div>
    <div>
      ${card(esc(t('home.goals')), '', goals || `<p class="sub">${esc(t('home.goalsNone'))}</p>`, 'goals-mini') .replace('</section>', `<button class="link" data-act="tab" data-tab="goals">${esc(t('home.goalsCta'))} →</button></section>`)}
      ${oppTotal > 0 ? `<section class="card promo"><h3>💡 ${esc(t('home.save'))}</h3><p>${esc(t('home.saveSub', { annual: oppTotal }))}</p><button class="btn" data-act="tab" data-tab="save">${esc(t('home.saveCta'))} →</button></section>` : ''}
      ${accs ? card(esc(t('accounts')), '', `<div class="accs">${accs}</div>`) : ''}
    </div>
  </div>
  ${card(esc(t('trend')), esc(t('trendSub')), `<div class="legend"><span><i class="sw b-in"></i>${esc(t('income'))}</span><span><i class="sw b-out"></i>${esc(t('spending'))}</span></div>${trend}
    <details class="mapping"><summary>${esc(t('table'))}</summary><div class="table-wrap"><table class="table"><thead><tr><th></th><th class="num">${esc(t('income'))}</th><th class="num">${esc(t('spending'))}</th><th class="num">${esc(t('left'))}</th></tr></thead>
    <tbody>${rows.slice().reverse().map((r) => `<tr><td>${esc(F.month(r.month))}</td><td class="num">${esc(F.eur(r.inc, 0))}</td><td class="num">${esc(F.eur(r.out, 0))}</td><td class="num">${esc(F.eur(r.inc - r.out, 0))}</td></tr>`).join('')}</tbody></table></div></details>`)}`;
}

/* ---------- transactions ---------- */
function filtered() {
  const f = UI.f, q = normDesc(f.q);
  return S.txns.filter((x) => (!f.ids || f.ids.has(x.id)) && (!f.extra || x.extra) && (!f.acc || x.acc === f.acc) && (!f.cat || x.cat === f.cat) && (!f.month || monthOf(x.date) === f.month) && (!q || normDesc(x.desc + ' ' + (x.note || '')).includes(q)));
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
    const tags = [x.extra && ['extra', t('moves.isExtra')], x.excl && ['', t('moves.excluded')], x.catSrc === 'transfer' && ['', t('moves.transfer')], x.src === 'manual' && ['', t('moves.manual')], x.signGuess && ['warn', t('moves.signGuess')]].filter(Boolean);
    return `<div class="tx ${x.excl ? 'excl' : ''} ${open ? 'open' : ''}" data-id="${x.id}">
      <button class="tx-main" data-act="open" data-id="${x.id}" aria-expanded="${open}">
        <span class="tx-ico" aria-hidden="true">${catIcon(x.cat)}</span>
        <span class="tx-desc">${esc(x.desc)}<small>${esc(F.short(x.date))} · ${esc(accName(x.acc))}${tags.map(([c, g]) => ` <b class="tag ${c}">${esc(g)}</b>`).join('')}</small>${x.note ? `<small class="note">✎ ${esc(x.note)}</small>` : ''}</span>
        <span class="tx-amt ${x.amt > 0 ? 'pos' : ''}">${esc(F.signed(x.amt))}</span></button>
      <label class="tx-cat"><span class="sr">${esc(t('category'))}</span><select data-act="set-cat" data-id="${x.id}">${catOptions(x.cat)}</select></label>
      ${open ? `<div class="tx-more">
        <label class="field">${esc(t('moves.note'))}<input type="text" data-act="note" data-id="${x.id}" value="${esc(x.note || '')}" maxlength="140"></label>
        ${x.amt < 0 ? `<p class="sub">${esc(t('moves.extraHint'))}</p>` : ''}
        <div class="actions">${x.amt < 0 ? `<button class="btn ${x.extra ? 'on' : ''}" data-act="toggle-extra" data-id="${x.id}">${esc(t(x.extra ? 'moves.notExtra' : 'moves.extra'))}</button>` : ''}
        <button class="btn" data-act="excl" data-id="${x.id}">${esc(t(x.excl ? 'moves.include' : 'moves.exclude'))}</button>
        ${x.signGuess || x.src === 'pdf' ? `<button class="btn" data-act="flip" data-id="${x.id}">${esc(t('moves.flip'))}</button>` : ''}
        ${x.src === 'manual' ? `<button class="btn danger" data-act="del" data-id="${x.id}">${esc(t('moves.delete'))}</button>` : ''}</div></div>` : ''}
    </div>`;
  }).join('');
  return card('', '', `
    <div class="filters">
      <input type="search" id="q" placeholder="${esc(t('moves.search'))}" value="${esc(UI.f.q)}" aria-label="${esc(t('moves.search'))}">
      <select data-act="f-acc" aria-label="${esc(t('account'))}"><option value="">${esc(t('moves.allAcc'))}</option>${S.accounts.map((a) => `<option value="${a.id}" ${UI.f.acc === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
      <select data-act="f-cat" aria-label="${esc(t('category'))}"><option value="">${esc(t('moves.allCat'))}</option>${catOptions(UI.f.cat)}</select>
      <select data-act="f-month" aria-label="${esc(t('moves.all'))}"><option value="">${esc(t('moves.all'))}</option>${months.map((m) => `<option value="${m}" ${UI.f.month === m ? 'selected' : ''}>${esc(F.month(m))}</option>`).join('')}</select>
    </div>
    <div class="moves-head"><div class="chips"><button class="chip ${UI.f.extra ? 'on' : ''}" data-act="f-extra">${esc(t('moves.onlyExtra'))}</button>${UI.f.ids ? `<button class="chip on" data-act="clear-ids">🔎 ${UI.f.ids.size} ✕</button>` : ''}</div>
      <button class="btn primary" data-act="manual">＋ ${esc(t('moves.add'))}</button></div>
    <p class="sub">${esc(t('moves.count', { n: list.length, inc, out }))}</p>
    <div class="txs">${rows || `<p class="sub">${esc(t('moves.none'))}</p>`}</div>
    ${list.length > UI.limit ? `<button class="btn wide" data-act="more">${esc(t('moves.more'))}</button>` : ''}`);
}

/* ---------- budget ---------- */
function viewBudget() {
  const month = monthOf(today());
  const cur = monthly(S, null, { ordinary: true })[month] || { cats: {} };
  const { avg } = categoryAverages(S, month, 6);
  let tb = 0, ts = 0;
  const rows = allCategories(S).filter((c) => c.kind === 'out').map((c) => {
    const spent = -(cur.cats[c.id] || 0), b = S.budgets[c.id] || 0, a = -(avg[c.id] || 0);
    tb += b; ts += spent;
    return `<div class="bud">
      <span class="cat-name"><span class="cat-ico">${c.icon || ''}</span>${esc(F.cat(c.id))}<small>${a > 0 ? esc(t('budget.avg', { avg: a })) : ''}</small></span>
      <label class="bud-in"><span class="sr">${esc(F.cat(c.id))}</span>€ <input type="number" min="0" step="10" inputmode="numeric" data-act="budget" data-cat="${c.id}" value="${b ? b / 100 : ''}" placeholder="${esc(t('budget.none'))}"></label>
      <span class="bud-bar">${b ? `<span class="cat-bar"><span class="fill ${spent > b ? 'over' : ''}" style="width:${Math.min(100, spent / b * 100).toFixed(1)}%"></span></span><small>${esc(t('budget.spent', { spent, budget: b }))}</small>` : spent ? `<small>${esc(F.eur(spent, 0))}</small>` : ''}</span></div>`;
  }).join('');
  return card(`${esc(t('budget.title'))} · ${esc(F.month(month))}`, esc(t('budget.sub')), `<button class="btn" data-act="suggest-budget">✨ ${esc(t('budget.suggest'))}</button>
    <div class="buds">${rows}<div class="bud total"><span class="cat-name">${esc(t('budget.total'))}</span><span class="bud-in">${tb ? esc(F.eur(tb, 0)) : ''}</span><span class="bud-bar"><small>${esc(F.eur(ts, 0))}</small></span></div></div>`);
}

/* ---------- savings: opportunities, one-offs, cash ---------- */
const OPP_ICON = { cancel: '📺', phone: '📱', energy: '⚡', insurance: '🛡️', fees: '🏦', trim: '✂️', cash: '💶', idle: '📈' };
function viewSave() {
  const opps = opportunities(S, today());
  const pot = opps.filter((o) => o.kind !== 'idle').reduce((s, o) => s + o.annual, 0);
  const adopted = Object.values(S.plan.adopted || {}).reduce((s, a) => s + (a.annual || 0), 0);
  const tiles = `<div class="tiles"><div class="tile"><span>${esc(t('save.total'))}</span><b>${esc(F.eur(pot, 0))}</b><small>${esc(t('save.perYear'))}</small></div>
    <div class="tile accent"><span>${esc(t('save.adopted'))}</span><b>${esc(F.eur(adopted, 0))}</b><small>${esc(t('save.perYear'))} · ${esc(F.eur(adopted / 12, 0))} ${esc(t('save.perMonth'))} → ${esc(t('nav.goals'))}</small></div></div>`;
  const cards = opps.map((o) => `<div class="opp ${o.adopted ? 'adopted' : ''}">
    <span class="opp-ico" aria-hidden="true">${OPP_ICON[o.kind] || '💡'}</span>
    <div class="opp-body"><p>${esc(t('opp.' + o.kind, { ...o.p, period: o.p.period ? t('period.' + o.p.period) : '' }))}</p>
      ${o.pct != null ? `<label class="slider"><input type="range" min="5" max="${o.kind === 'fees' ? 100 : 50}" step="5" value="${o.pct}" data-act="opp-pct" data-id="${esc(o.id)}" aria-label="%"><span>${o.pct}%</span></label>` : ''}
      ${o.ids ? `<button class="link" data-act="show-ids" data-ids="${o.ids.join(',')}">${esc(t('show'))}</button>` : ''}</div>
    <div class="opp-val"><b>${esc(F.eur(o.annual, 0))}</b><small>${esc(o.kind === 'idle' ? t('opp.idleNote') : t('save.perYear'))}</small>
      <button class="btn small ${o.adopted ? 'on' : ''}" data-act="adopt" data-id="${esc(o.id)}" data-annual="${o.annual}" aria-pressed="${o.adopted}">${esc(t(o.adopted ? 'save.adoptedBtn' : 'save.adopt'))}</button></div></div>`).join('');

  const yearAgo = addDays(today(), -365);
  const extras = S.txns.filter((x) => x.extra && x.date > yearAgo && x.amt < 0);
  const extraTotal = -extras.reduce((s, x) => s + x.amt, 0);
  const extrasBody = extras.length ? `<p>${esc(t('save.extrasYear', { total: extraTotal, monthly: extraTotal / 12 }))}</p>
    <div class="list">${extras.slice(0, 8).map((x) => `<div class="li"><span>${catIcon(x.cat)} ${esc(x.desc)}<small>${esc(F.date(x.date))}</small></span><b>${esc(F.eur(-x.amt, 0))}</b></div>`).join('')}</div>
    <button class="link" data-act="show-extra">${esc(t('show'))} →</button>` : `<p class="sub">${esc(t('save.extrasNone'))}</p>`;

  const mm = monthly(S);
  const last = monthsRange(addMonths(monthOf(today()), -3), monthOf(today())).filter((k) => mm[k]);
  const cashRows = last.map((k) => `<tr><td>${esc(F.month(k))}</td><td class="num">${esc(F.eur(mm[k].cashW, 0))}</td><td class="num">${esc(F.eur(mm[k].cashR, 0))}</td><td class="num">${esc(F.eur(mm[k].cashLeft, 0))}</td></tr>`).join('');
  const split = S.cash.split || {};
  const splitCats = ['spesa', 'ristoranti', 'trasporti', 'famiglia', 'svago', 'shopping', 'salute', 'altro'];
  const cashBody = `<div class="table-wrap"><table class="table"><thead><tr><th></th><th class="num">${esc(t('cash.withdrawn'))}</th><th class="num">${esc(t('cash.recorded'))}</th><th class="num">${esc(t('cash.unknown'))}</th></tr></thead><tbody>${cashRows}</tbody></table></div>
    <button class="btn" data-act="manual" data-cash="1">＋ ${esc(t('cash.add'))}</button>
    <p class="field-label">${esc(t('cash.split'))}</p><p class="sub">${esc(t('cash.splitHint'))}</p>
    <div class="split">${splitCats.map((c) => `<label>${catIcon(c)} ${esc(F.cat(c))}<span><input type="number" min="0" max="100" step="5" data-act="cash-split" data-cat="${c}" value="${split[c] || ''}" placeholder="0">%</span></label>`).join('')}</div>`;

  return card(esc(t('save.title')), esc(t('save.sub')), tiles + (cards ? `<div class="opps">${cards}</div>` : `<p class="sub">${esc(t('save.none'))}</p>`)) +
    `<div class="grid2">${card(esc(t('save.extrasTitle')), esc(t('save.extrasSub')), extrasBody)}${card(esc(t('cash.title')), esc(t('cash.sub')), cashBody)}</div>`;
}

/* ---------- goals ---------- */
function viewGoals() {
  const plan = planGoals(S, today());
  const cap = plan.capacity;
  const used = plan.rows.reduce((s, r) => s + r.planned, 0);
  const total = Math.max(cap.monthly, plan.needTotal, 1);
  const seg = plan.rows.filter((r) => r.planned > 0).map((r) => `<span style="width:${(r.planned / total * 100).toFixed(2)}%;background:${goalColor(r.goal)}" data-tip="${esc(`${r.goal.name}: ${F.eur(r.planned, 0)}`)}"></span>`).join('');
  const short = plan.needTotal - cap.monthly;
  const capCard = `<section class="card cap">
    <div class="cap-top"><div><span class="field-label">${esc(t('goals.capacity'))}</span><p class="cap-big">${esc(F.eur(cap.monthly, 0))} <small>${esc(t('save.perMonth'))}</small></p>
      <small class="sub">${esc(cap.manual ? t('goals.capacityManual') : t('goals.capacityAuto', { months: cap.months, adopted: cap.adopted }))}</small></div>
      <div class="cap-edit"><label class="sr" for="cap-in">${esc(t('goals.setCapacity'))}</label><input id="cap-in" type="number" min="0" step="50" placeholder="${Math.round(cap.monthly / 100)}" value="${cap.manual ? Math.round(cap.monthly / 100) : ''}"><button class="btn small" data-act="cap-set">${esc(t('goals.setCapacity'))}</button>
      ${cap.manual ? `<button class="link" data-act="cap-auto">${esc(t('goals.autoCapacity'))}</button>` : ''}</div></div>
    <div class="alloc" role="img" aria-label="${esc(t('goals.needed'))}">${seg}</div>
    <div class="cap-row"><span>${esc(t('goals.needed'))}: <b>${esc(F.eur(plan.needTotal, 0))}</b></span>${short > 0 ? `<span class="neg">${esc(t('goals.missing'))}: <b>${esc(F.eur(short, 0))}</b></span>` : `<span>${esc(t('goals.spare'))}: <b>${esc(F.eur(cap.monthly - used, 0))}</b></span>`}</div></section>`;
  const hasEmergency = S.goals.some((g) => g.type === 'emergency');
  const emAmt = emergencyTarget(S, today());
  const emCard = !hasEmergency && emAmt > 0 ? `<div class="finding info"><span class="f-icon">🛟</span><div class="f-body"><p>${esc(t('goals.emergency', { amt: emAmt }))}</p><div class="f-actions"><button class="btn small primary" data-act="goal-emergency" data-amt="${emAmt}">${esc(t('goals.emergencyCta'))}</button></div></div></div>` : '';
  const cards = plan.rows.map((r) => goalCard(r)).join('');
  return `<section class="card"><div class="head-row"><div><h3>${esc(t('goals.title'))}</h3><p class="sub">${esc(t('goals.sub'))}</p></div><button class="btn primary" data-act="goal-new">＋ ${esc(t('goals.add'))}</button></div>${emCard}</section>
    ${capCard}<div class="goals">${cards || card('', '', `<p class="sub">${esc(t('goals.none'))}</p>`)}</div>
    <p class="disclaimer">${esc(t('goals.disclaimer'))}</p>`;
}
function goalCard(r) {
  const g = r.goal, open = UI.goalOpen === g.id;
  const etaDate = r.eta === Infinity ? null : addMonths(monthOf(today()), r.eta);
  let fix = '';
  if (r.status === 'short' || r.status === 'tight') {
    const later = r.eta === Infinity ? addMonths(g.date, 120) : etaDate;
    fix = `<p class="fix">${esc(t('goal.fix', { need: r.need, later, smaller: Math.floor(r.fv / 10000) * 10000 }))}</p>`;
  }
  const proj = open && r.n > 0 ? projection(g.saved || 0, r.planned, r.profile, r.n) : null;
  const chart = proj ? `<div class="goal-chart"><h4>${esc(t('goal.projTitle'))}</h4><p class="sub">${esc(t('goal.projSub'))}</p>${fanChart(proj, r.target, {
    title: t('goal.projTitle'), axis: (v) => F.k(v), tick: (k) => (r.n <= 36 ? F.mon(addMonths(monthOf(today()), k)) + ' ' + addMonths(monthOf(today()), k).slice(2, 4) : addMonths(monthOf(today()), k).slice(0, 4)), target: F.eur(r.target, 0),
    tip: (p) => `${F.month(addMonths(monthOf(today()), p.k))}: ${F.eur(p.mid, 0)} (${F.eur(p.lo, 0)} – ${F.eur(p.hi, 0)}) · ${F.eur(p.paid, 0)}`,
  })}</div>` : '';
  return `<article class="goal" style="--gc:${goalColor(g)}">
    <button class="goal-head" data-act="goal-open" data-id="${g.id}" aria-expanded="${open}">
      ${ring(r.progress, goalColor(g), 76, F.pct(r.progress))}
      <span class="goal-title"><b>${goalIcon(g)} ${esc(g.name)}</b><small>${esc(t('goal.saved', { saved: g.saved || 0, target: r.target }))} · ${esc(t('goal.by', { date: g.date }))}</small>
        ${g.real ? `<small>${esc(t('goal.real', { base: g.target }))}</small>` : ''}</span>
      <span class="goal-side"><em class="pill ${r.status}">${esc(t('status.' + r.status))}</em><b>${esc(t('goal.monthly', { amt: r.planned }))}</b></span></button>
    <div class="goal-body">
      <div class="goal-facts"><div><span class="field-label">${esc(t('goal.where'))}</span><p><b>${r.profile.icon} ${esc(t('prof.' + r.profile.id))}</b> · ${esc((r.profile.r * 100).toLocaleString(loc(), { maximumFractionDigits: 1 }))}%</p><small class="sub">${esc(t('profd.' + r.profile.id))}</small></div>
        <div><p>${esc(t('goal.chance', { chance: r.chance }))}</p><p class="sub">${esc(t('goal.eta', { eta: r.eta, date: etaDate || g.date }))}</p>${fix}</div></div>
      ${chart}
      <div class="actions"><input type="number" min="0" step="10" id="pay-${g.id}" placeholder="${esc(t('goal.addPh'))}" aria-label="${esc(t('goal.addPh'))}"><button class="btn" data-act="goal-pay" data-id="${g.id}">${esc(t('goal.add'))}</button>
        <button class="btn" data-act="goal-edit" data-id="${g.id}">${esc(t('edit'))}</button><button class="btn danger" data-act="goal-del" data-id="${g.id}">${esc(t('remove'))}</button></div>
    </div></article>`;
}
function goalDialog(g) {
  g = g || { id: '', name: '', type: 'other', target: 0, date: addMonths(monthOf(today()), 36), saved: 0, monthly: null, profile: 'auto', priority: 2, real: false };
  modal(`<h3>${esc(t('goalform.title'))}</h3><div class="form-grid">
    <label class="field">${esc(t('goalform.name'))}<input type="text" id="gf-name" value="${esc(g.name)}" maxlength="40"></label>
    <label class="field">${esc(t('goalform.type'))}<select id="gf-type">${GOAL_TYPES.map((x) => `<option value="${x.id}" ${x.id === g.type ? 'selected' : ''}>${x.icon} ${esc(t('gt.' + x.id))}</option>`).join('')}</select></label>
    <label class="field">${esc(t('goalform.target'))}<input type="number" id="gf-target" min="0" step="100" value="${g.target ? g.target / 100 : ''}"></label>
    <label class="field">${esc(t('goalform.date'))}<input type="month" id="gf-date" value="${g.date}"></label>
    <label class="field">${esc(t('goalform.saved'))}<input type="number" id="gf-saved" min="0" step="100" value="${g.saved ? g.saved / 100 : ''}"></label>
    <label class="field">${esc(t('goalform.priority'))}<select id="gf-prio">${[1, 2, 3].map((p) => `<option value="${p}" ${p === g.priority ? 'selected' : ''}>${esc(t('prio.' + p))}</option>`).join('')}</select></label>
    <label class="field">${esc(t('goalform.profile'))}<select id="gf-prof"><option value="auto">${esc(t('goalform.auto'))}</option>${PROFILES.map((p) => `<option value="${p.id}" ${p.id === g.profile ? 'selected' : ''}>${p.icon} ${esc(t('prof.' + p.id))}</option>`).join('')}</select></label>
    <label class="field">${esc(t('goalform.monthly'))}<input type="number" id="gf-monthly" min="0" step="10" value="${g.monthly != null ? g.monthly / 100 : ''}"></label></div>
    <label class="check"><input type="checkbox" id="gf-real" ${g.real ? 'checked' : ''}> ${esc(t('goalform.real'))}</label>
    <div class="actions"><button class="btn primary" data-act="goal-save" data-id="${g.id}">${esc(t('save'))}</button><button class="btn" data-act="modal-close">${esc(t('cancel'))}</button></div>`);
}

/* ---------- checks ---------- */
const LEVEL_ICON = { alert: '⛔', warn: '⚠️', info: '💡', ok: '✅' };
function findingHtml(f) {
  return `<div class="finding ${f.level}"><span class="f-icon" aria-hidden="true">${LEVEL_ICON[f.level]}</span><div class="f-body"><p>${esc(t(f.key, f.p))}</p>
    <div class="f-actions">${f.ids && f.ids.length ? `<button class="link" data-act="show-ids" data-ids="${f.ids.join(',')}">${esc(t('show'))}</button>` : ''}
    ${f.act === 'extra' ? `<button class="link" data-act="mark-extra" data-ids="${f.ids.join(',')}">${esc(t('markExtra'))}</button>` : ''}
    ${f.level !== 'ok' ? `<button class="link" data-act="dismiss" data-fid="${esc(f.id)}">${esc(t('dismiss'))}</button>` : ''}</div></div></div>`;
}
function viewChecks(findings) {
  const sugs = suggest(S, today());
  const rec = findRecurring(S);
  const hidden = Object.keys(S.dismissed).length;
  const imports = [...S.imports].reverse().map((i) => `<div class="li"><span>${esc(i.file || i.kind)}<small>${esc(t('imp.row', { ...i, acc: accName(i.acc) }))}</small></span><button class="btn small" data-act="undo" data-imp="${i.id}">${esc(t('undo'))}</button></div>`).join('');
  return card(esc(t('checks.title')), esc(t('checks.sub')), (findings.length ? findings.map(findingHtml).join('') : `<p>${esc(t('allGood'))}</p>`) + (hidden ? `<button class="link" data-act="undismiss">${esc(t('restoreDismissed', { n: hidden }))}</button>` : '')) +
    card(esc(t('checks.sugTitle')), esc(t('checks.sugSub')), sugs.map(findingHtml).join('') || `<p>${esc(t('allGood'))}</p>`) +
    card(esc(t('checks.recTitle')), esc(t('checks.recSub')), `<div class="list">${rec.map((r) => `<button class="li rec ${r.stopped ? 'stopped' : ''}" data-act="show-ids" data-ids="${r.ids.join(',')}"><span>${catIcon(r.cat)} ${esc(r.name)}${r.sign > 0 ? ` <b class="tag">${esc(t('rec.in'))}</b>` : ''}${r.stopped ? ` <b class="tag">${esc(t('rec.stopped'))}</b>` : ''}<small>${esc(accName(r.acc))}</small></span><span class="rec-val">${esc(t('rec.row', { ...r, period: t('period.' + r.period) }))}</span></button>`).join('')}</div>`) +
    card(esc(t('checks.importsTitle')), esc(t('checks.importsSub')), `<div class="list">${imports}</div>`);
}

/* ---------- import ---------- */
function bankTips() {
  const chosen = new Set((S.profile.banks || []).concat(S.accounts.map((a) => normDesc(a.bank || a.name))));
  const tips = BANKS.filter((b) => b.tip && (chosen.has(b.id) || [...chosen].some((c) => c && normDesc(b.name) && String(c).includes(normDesc(b.name)))));
  return (tips.length ? tips : BANKS.filter((b) => b.tip).slice(0, 2)).map((b) => `<li>🏦 ${esc(b.tip[S.lang] || b.tip.it)}</li>`).join('');
}
function viewImport() {
  const d = UI.draft;
  if (UI.result) {
    return card(`✅ ${esc(t('imp.done', UI.result))}`, '', `<div class="actions"><button class="btn primary" data-act="backup">💾 ${esc(t('imp.backupNow'))}</button><button class="btn" data-act="imp-again">${esc(t('imp.again'))}</button><button class="btn" data-act="tab" data-tab="home">${esc(t('nav.home'))}</button></div>`);
  }
  if (!d) {
    return card(esc(t('imp.title')), '', `<label class="drop" id="drop"><span class="drop-icon" aria-hidden="true">${icon('import')}</span><span>${esc(t('imp.drop'))} <u>${esc(t('imp.choose'))}</u></span><small>${esc(t('imp.formats'))}</small>
      <input type="file" id="imp-file" accept=".csv,.txt,.xlsx,.xls,.pdf,.json,.htm,.html"></label>`) +
      card(esc(t('imp.howTitle')), '', `<ul class="how"><li>💻 ${esc(t('imp.howGeneric'))}</li>${bankTips()}<li>🔁 ${esc(t('imp.overlap'))}</li></ul>`);
  }
  if (d.kind === 'error') return card('', '', `<p class="warn-text">${esc(t(d.msg))}</p><button class="btn" data-act="imp-again">${esc(t('imp.again'))}</button>`);
  if (d.kind === 'backup') return card(esc(t('imp.backupFound')), '', `<div class="actions"><button class="btn danger" data-act="restore-draft">${esc(t('imp.restore'))}</button><button class="btn" data-act="imp-again">${esc(t('cancel'))}</button></div>`);
  const accSelect = (sel) => `<select data-act="draft-acc">${S.accounts.filter((a) => a.id !== CASH_ACC).map((a) => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}<option value="__new" ${sel === '__new' ? 'selected' : ''}>${esc(t('imp.newAccount'))}</option></select>`;
  const parsed = d.kind === 'pdf' ? { txns: d.txns, skipped: [] } : d.map ? rowsToTxns(d.rows, d.map) : { txns: [], skipped: [] };
  d.parsed = parsed;
  const prev = parsed.txns.slice(0, 8).map((x) => `<tr><td>${esc(F.date(x.date))}</td><td>${esc(x.desc)}</td><td class="num ${x.amt > 0 ? 'pos' : ''}">${esc(F.signed(x.amt))}${x.signGuess ? ' ?' : ''}</td>${x.bal != null ? `<td class="num">${esc(F.eur(x.bal, 2))}</td>` : ''}</tr>`).join('');
  let mapping = '';
  if (d.kind === 'table') {
    const m = d.map || { headerRow: 0, date: -1, vdate: -1, desc: [], amt: -1, debit: -1, credit: -1, bal: -1, decimalComma: true, dateOrder: 'dmy' };
    const cols = (d.rows[m.headerRow] || []).map((h, i) => `${i + 1}. ${String(h).slice(0, 30)}`);
    const sel = (field, val, k) => `<label class="field">${esc(t('col.' + field))}<select data-act="map" data-field="${field}" ${k != null ? `data-k="${k}"` : ''}><option value="-1">${esc(t('col.none'))}</option>${cols.map((c, i) => `<option value="${i}" ${val === i ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`;
    mapping = `<details class="mapping" ${d.map ? '' : 'open'}><summary>${esc(t('imp.columns'))}</summary><p class="sub">${esc(d.map ? t('imp.columnsHint') : t('err.noColumns'))}</p>
      <div class="form-grid"><label class="field">${esc(t('imp.headerRow'))}<input type="number" min="1" max="${d.rows.length}" value="${m.headerRow + 1}" data-act="map" data-field="headerRow"></label>
      ${sel('date', m.date)}${sel('desc', m.desc[0], 0)}${sel('desc', m.desc[1], 1)}${sel('amt', m.amt)}${sel('debit', m.debit)}${sel('credit', m.credit)}${sel('bal', m.bal)}${sel('vdate', m.vdate)}
      <label class="field">${esc(t('imp.dateOrder'))}<select data-act="map" data-field="dateOrder"><option value="dmy" ${m.dateOrder !== 'mdy' ? 'selected' : ''}>31/12/2026</option><option value="mdy" ${m.dateOrder === 'mdy' ? 'selected' : ''}>12/31/2026</option></select></label></div></details>`;
  }
  return card(`${esc(t('imp.preview'))}: ${esc(d.file)}`, '', `${d.kind === 'pdf' ? `<p class="warn-text">${esc(t('imp.pdfNote'))}</p>` : ''}
    <div class="actions"><label class="field">${esc(t('imp.toAccount'))} ${accSelect(d.target)}</label>${d.target === '__new' ? `<label class="field">${esc(t('imp.accountName'))}<input type="text" data-act="draft-name" value="${esc(d.newName || '')}"></label>` : ''}</div>
    ${mapping}<p class="sub">${esc(t('imp.rows', { n: parsed.txns.length, skipped: parsed.skipped.length }))}</p>
    <div class="table-wrap"><table class="table"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('description'))}</th><th class="num">${esc(t('amount'))}</th>${parsed.txns[0] && parsed.txns[0].bal != null ? `<th class="num">${esc(t('col.bal'))}</th>` : ''}</tr></thead><tbody>${prev}</tbody></table></div>
    <div class="actions"><button class="btn primary big" data-act="imp-go" ${parsed.txns.length ? '' : 'disabled'}>${esc(t('imp.confirm'))} (${parsed.txns.length})</button><button class="btn" data-act="imp-again">${esc(t('cancel'))}</button></div>`);
}
function guessAccount(bank, name) {
  const n = normDesc(name || ''), b = normDesc(bank || '');
  const a = S.accounts.find((x) => x.id !== CASH_ACC && ((b && normDesc(x.bank) === b) || (n && normDesc(x.name).includes(n)) || (b && normDesc(x.name).includes(b))));
  return a ? a.id : (S.accounts.filter((x) => x.id !== CASH_ACC).length === 1 && !b && !n ? S.accounts.find((x) => x.id !== CASH_ACC).id : '__new');
}
async function handleFile(file) {
  const r = await readBankFile(file);
  const d = { ...r, file: file.name };
  const fromName = BANKS.find((b) => normDesc(file.name).includes(normDesc(b.name)));
  if (r.kind === 'table') {
    const sig = r.map ? r.map.columns.join('|') : null;
    if (sig && S.mappings[sig]) { d.map = { ...r.map, ...S.mappings[sig], headerRow: r.map.headerRow }; d.target = S.accounts.some((a) => a.id === S.mappings[sig].acc) ? S.mappings[sig].acc : null; }
    const bank = (r.map && r.map.bank) || (fromName && fromName.name) || '';
    if (!d.target) d.target = guessAccount(bank, bank);
    d.newName = bank;
    d.bank = bank;
  }
  if (r.kind === 'pdf') { const bank = fromName ? fromName.name : ''; d.target = guessAccount(bank, bank); d.newName = bank; d.bank = bank; }
  UI.draft = d; UI.result = null;
  render();
}
function ensureAccount(target, name, bank) {
  if (target && target !== '__new') return target;
  const id = 'acc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  S.accounts.push({ id, name: (name || bank || (S.lang === 'en' ? 'Account' : 'Conto')).trim(), bank: bank || '', checkpoints: [] });
  return id;
}
function runImport() {
  const d = UI.draft;
  const id = ensureAccount(d.target, d.newName, d.bank);
  if (d.kind === 'table' && d.map) S.mappings[d.map.columns.join('|')] = { ...d.map, acc: id };
  const r = mergeImport(S, id, d.parsed.txns, { file: d.file, kind: d.kind === 'pdf' ? 'pdf' : 'file', checkpoints: d.kind === 'table' ? checkpointsFromFile(d.parsed.txns) : [] });
  UI.draft = null; UI.result = r;
  commit();
}

/* ---------- settings ---------- */
function viewSettings() {
  const accs = S.accounts.map((a) => {
    const cps = (a.checkpoints || []).slice(-3).reverse();
    return `<div class="set-acc"><input type="text" value="${esc(a.name)}" data-act="acc-name" data-acc="${a.id}" aria-label="${esc(t('account'))}">
      <div class="actions"><label class="field">${esc(t('set.balanceToday'))} €<input type="number" step="0.01" id="bal-${a.id}"></label><label class="field">${esc(t('set.balanceDate'))}<input type="date" id="bald-${a.id}" value="${today()}"></label><button class="btn" data-act="add-bal" data-acc="${a.id}">${esc(t('set.addBalance'))}</button></div>
      <small class="sub">${cps.map((c) => `${esc(F.date(c.date))}: ${esc(F.eur(c.bal, 2))}`).join(' · ')}</small>
      <button class="link danger" data-act="del-acc" data-acc="${a.id}">${esc(t('set.deleteAcc'))}</button></div>`;
  }).join('');
  const rules = S.rules.map((r, i) => `<div class="li"><span><b>${esc(r.words.join(', '))}</b> → ${catIcon(r.cat)} ${esc(F.cat(r.cat))}${r.sign ? ` (${r.sign === 'in' ? '+' : '−'})` : ''}</span><button class="link danger" data-act="del-rule" data-i="${i}">✕</button></div>`).join('');
  const cats = allCategories(S).filter((c) => c.kind !== 'move').map((c) => `<label class="cat-edit">${c.icon || ''} <input type="text" value="${esc(c[S.lang] || c.it || c.label)}" data-act="cat-label" data-cat="${c.id}"></label>`).join('');
  const rets = PROFILES.map((p) => `<label class="field">${p.icon} ${esc(t('prof.' + p.id))} %<input type="number" step="0.1" min="-5" max="15" data-act="plan-ret" data-prof="${p.id}" value="${(profileById(S, p.id).r * 100).toFixed(1)}"></label>`).join('');
  return card(esc(t('set.profile')), '', `<div class="form-grid"><label class="field">${esc(t('onb.name'))}<input type="text" data-act="prof-name" value="${esc(S.profile.name || '')}" maxlength="40"></label>
      <div class="field">${esc(t('set.language'))}<div class="actions"><button class="btn ${S.lang === 'it' ? 'primary' : ''}" data-act="lang" data-lang="it">Italiano</button><button class="btn ${S.lang === 'en' ? 'primary' : ''}" data-act="lang" data-lang="en">English</button></div></div></div>`) +
    card(esc(t('set.accounts')), esc(t('set.accountsSub')), accs + `<div class="actions"><input type="text" id="acc-new" placeholder="${esc(t('imp.accountName'))}"><button class="btn" data-act="add-acc">${esc(t('set.addAccount'))}</button></div>`) +
    card(esc(t('set.backup')), esc(t('set.backupSub')), `<p>${esc(t('set.lastBackup', { date: S.lastBackup }))}</p><div class="actions"><button class="btn primary" data-act="backup">💾 ${esc(t('set.download'))}</button><button class="btn" data-act="restore">${esc(t('set.restore'))}</button></div>`) +
    card(esc(t('set.plan')), esc(t('set.planSub')), `<div class="form-grid">${rets}<label class="field">${esc(t('set.inflation'))}<input type="number" step="0.1" min="0" max="15" data-act="plan-infl" value="${((S.plan.inflation != null ? S.plan.inflation : 0.02) * 100).toFixed(1)}"></label></div>`) +
    card(esc(t('set.rules')), esc(t('set.rulesSub')), `<div class="list">${rules || `<p class="sub">${esc(t('set.noRules'))}</p>`}</div>
      <div class="actions"><input type="text" id="rule-words" placeholder="${esc(t('set.ruleWords'))}"><select id="rule-cat">${catOptions('spesa')}</select><button class="btn" data-act="add-rule">${esc(t('set.addRule'))}</button></div>
      <button class="link" data-act="reapply">${esc(t('set.reapply'))}</button>`) +
    card(esc(t('set.categories')), esc(t('set.catSub')), `<div class="cat-grid">${cats}</div>
      <div class="actions"><input type="text" id="cat-new" placeholder="${esc(t('set.catName'))}"><select id="cat-kind"><option value="out">${esc(t('set.catKindOut'))}</option><option value="in">${esc(t('set.catKindIn'))}</option></select><button class="btn" data-act="add-cat">${esc(t('set.addCat'))}</button></div>`) +
    card(esc(t('set.danger')), esc(t('set.storage', { mode: Store.mode() })), `<button class="btn danger" data-act="reset">${esc(t('set.reset'))}</button>`);
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
  if (!key || key.length < 3 || tx.src === 'manual') return;
  UI.pendingRule = { words: [key], cat: tx.cat, sign: tx.amt > 0 ? 'in' : 'out' };
  modal(`<p>${esc(t('moves.applySimilar', { key, cat: F.cat(tx.cat) }))}</p><div class="actions"><button class="btn primary" data-act="rule-yes">${esc(t('moves.yesAll'))}</button><button class="btn" data-act="modal-close">${esc(t('moves.justThis'))}</button></div>`);
}
function manualDialog(cash) {
  const accs = S.accounts.filter((a) => a.id !== CASH_ACC);
  modal(`<h3>${esc(t('manual.title'))}</h3><div class="form-grid">
    <label class="field">${esc(t('manual.kind'))}<select id="m-kind"><option value="out">${esc(t('manual.out'))}</option><option value="in">${esc(t('manual.in'))}</option></select></label>
    <label class="field">${esc(t('manual.where'))}<select id="m-acc"><option value="${CASH_ACC}">💶 ${esc(t('manual.cash'))}</option>${cash ? '' : accs.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></label>
    <label class="field">${esc(t('date'))}<input type="date" id="m-date" value="${today()}"></label>
    <label class="field">${esc(t('amount'))} €<input type="number" step="0.01" min="0" id="m-amt" inputmode="decimal"></label>
    <label class="field">${esc(t('description'))}<input type="text" id="m-desc" maxlength="80"></label>
    <label class="field">${esc(t('category'))}<select id="m-cat">${catOptions('spesa')}</select></label></div>
    <label class="check"><input type="checkbox" id="m-extra"> ${esc(t('manual.extra'))}</label>
    <div class="actions"><button class="btn primary" data-act="manual-save">${esc(t('save'))}</button><button class="btn" data-act="modal-close">${esc(t('cancel'))}</button></div>`);
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
const txById = (id) => S.txns.find((q) => q.id === id);
const centsOf = (sel) => { const v = parseFloat($(sel).value); return isFinite(v) ? Math.round(v * 100) : null; };

/* ---------- events ---------- */
const ACTIONS = {
  tab: (el) => { UI.tab = el.dataset.tab; if (UI.tab !== 'import') UI.result = null; render(); window.scrollTo(0, 0); },
  demo: () => { const lang = S.lang; S = makeDemo(today()); S.lang = lang; UI.tab = 'home'; commit(); },
  'clear-demo': () => { const lang = S.lang; S = emptyState(); S.lang = lang; UI.tab = 'home'; commit(); },
  restore: () => pickFile(async (f) => { const r = await readBankFile(f); if (r.kind === 'backup') { S = migrate(r.state); S.profile.onboarded = true; commit(); } else { S.profile.onboarded = true; UI.tab = 'import'; handleFile(f); } }),
  'onb-bank': (el) => { const b = el.dataset.bank, l = UI.onb.banks; UI.onb.banks = l.includes(b) ? l.filter((x) => x !== b) : l.concat(b); const name = $('#onb-name').value, other = $('#onb-other').value; render(); $('#onb-name').value = name; $('#onb-other').value = other; },
  'onb-start': () => {
    S.profile.name = $('#onb-name').value.trim();
    S.profile.banks = UI.onb.banks;
    S.cash.track = $('#onb-cash').checked;
    const other = $('#onb-other').value.trim();
    for (const id of UI.onb.banks) { const b = BANKS.find((x) => x.id === id); ensureAccount('__new', b.name, b.name); }
    if (other) ensureAccount('__new', other, other);
    if (S.cash.track && !S.accounts.some((a) => a.id === CASH_ACC)) S.accounts.push({ id: CASH_ACC, name: t('manual.cash'), bank: '', checkpoints: [] });
    S.profile.onboarded = true; UI.tab = 'import';
    commit();
  },
  month: (el) => { UI.month = addMonths(currentMonth(), +el.dataset.d); render(); },
  'filter-cat': (el) => { UI.f = { q: '', acc: '', cat: el.dataset.cat, month: el.dataset.month, ids: null, extra: false }; UI.tab = 'moves'; render(); },
  open: (el) => { UI.open = UI.open === el.dataset.id ? null : el.dataset.id; render(); },
  more: () => { UI.limit += 200; render(); },
  'clear-ids': () => { UI.f.ids = null; render(); },
  'f-extra': () => { UI.f.extra = !UI.f.extra; render(); },
  'show-extra': () => { UI.f = { q: '', acc: '', cat: '', month: '', ids: null, extra: true }; UI.tab = 'moves'; render(); window.scrollTo(0, 0); },
  'show-ids': (el) => { UI.f = { q: '', acc: '', cat: '', month: '', ids: new Set(el.dataset.ids.split(',')), extra: false }; UI.tab = 'moves'; render(); window.scrollTo(0, 0); },
  'mark-extra': (el) => { for (const id of el.dataset.ids.split(',')) { const x = txById(id); if (x) x.extra = true; } commit(); },
  'toggle-extra': (el) => { const x = txById(el.dataset.id); x.extra = !x.extra; commit(); },
  dismiss: (el) => { S.dismissed[el.dataset.fid] = today(); commit(); },
  undismiss: () => { S.dismissed = {}; commit(); },
  excl: (el) => { const x = txById(el.dataset.id); x.excl = !x.excl; commit(); },
  flip: (el) => { const x = txById(el.dataset.id); x.amt = -x.amt; delete x.signGuess; if (x.catSrc !== 'user') { const c = categorise(x, S.rules); x.cat = c.cat; x.catSrc = c.src; } commit(); },
  del: (el) => { S.txns = S.txns.filter((q) => q.id !== el.dataset.id); commit(); },
  manual: (el) => manualDialog(el.dataset.cash),
  'manual-save': () => {
    const amt = centsOf('#m-amt'), date = $('#m-date').value, acc = $('#m-acc').value;
    if (!amt || !date) return;
    if (acc === CASH_ACC && !S.accounts.some((a) => a.id === CASH_ACC)) S.accounts.push({ id: CASH_ACC, name: t('manual.cash'), bank: '', checkpoints: [] });
    const out = $('#m-kind').value === 'out';
    S.txns.push({ id: 'm' + Date.now().toString(36), acc, date, desc: $('#m-desc').value || F.cat($('#m-cat').value), amt: out ? -Math.abs(amt) : Math.abs(amt), cat: $('#m-cat').value, catSrc: 'user', src: 'manual', extra: out && $('#m-extra').checked });
    S.txns.sort((a, b) => b.date.localeCompare(a.date));
    closeModal(); commit();
  },
  'modal-close': () => closeModal(),
  'rule-yes': () => { S.rules.push(UI.pendingRule); recategorise(S); closeModal(); commit(); },
  'suggest-budget': () => { const s = suggestBudgets(S, today()); for (const [c, v] of Object.entries(s)) if (!S.budgets[c]) S.budgets[c] = v; commit(); },
  adopt: (el) => { const id = el.dataset.id; if (S.plan.adopted[id]) delete S.plan.adopted[id]; else S.plan.adopted[id] = { annual: +el.dataset.annual, at: today() }; commit(); },
  'cap-set': () => { const v = centsOf('#cap-in'); S.plan.monthly = v != null && v >= 0 ? v : null; commit(); },
  'cap-auto': () => { S.plan.monthly = null; commit(); },
  'goal-new': () => goalDialog(),
  'goal-edit': (el) => goalDialog(S.goals.find((g) => g.id === el.dataset.id)),
  'goal-open': (el) => { UI.goalOpen = UI.goalOpen === el.dataset.id ? null : el.dataset.id; if (UI.tab !== 'goals') { UI.tab = 'goals'; window.scrollTo(0, 0); } render(); },
  'goal-emergency': (el) => { S.goals.unshift({ id: 'g_' + Date.now().toString(36), name: t('gt.emergency'), type: 'emergency', target: +el.dataset.amt, date: addMonths(monthOf(today()), 18), saved: 0, monthly: null, profile: 'auto', priority: 1, real: false }); commit(); },
  'goal-save': (el) => {
    const target = centsOf('#gf-target'), date = $('#gf-date').value;
    if (!target || !/^\d{4}-\d{2}$/.test(date)) return;
    const mo = centsOf('#gf-monthly');
    const g = { id: el.dataset.id || 'g_' + Date.now().toString(36), name: $('#gf-name').value.trim() || t('gt.' + $('#gf-type').value), type: $('#gf-type').value, target, date, saved: centsOf('#gf-saved') || 0, monthly: mo, profile: $('#gf-prof').value, priority: +$('#gf-prio').value, real: $('#gf-real').checked };
    const i = S.goals.findIndex((x) => x.id === g.id);
    if (i >= 0) S.goals[i] = { ...S.goals[i], ...g }; else S.goals.push(g);
    UI.goalOpen = g.id;
    closeModal(); commit();
  },
  'goal-pay': (el) => { const g = S.goals.find((x) => x.id === el.dataset.id), v = centsOf('#pay-' + g.id); if (!v) return; g.saved = (g.saved || 0) + v; (g.log = g.log || []).push({ date: today(), amt: v }); commit(); },
  'goal-del': (el) => { if (confirm(t('remove') + '?')) { S.goals = S.goals.filter((g) => g.id !== el.dataset.id); commit(); } },
  'imp-again': () => { UI.draft = null; UI.result = null; render(); },
  'imp-go': () => runImport(),
  'restore-draft': () => { if (confirm(t('imp.restore') + '?')) { S = migrate(UI.draft.state); UI.draft = null; UI.tab = 'home'; commit(); } },
  undo: (el) => { if (confirm(t('undoConfirm'))) { undoImport(S, el.dataset.imp); commit(); } },
  backup: () => downloadBackup(),
  'add-bal': (el) => {
    const id = el.dataset.acc, v = centsOf('#bal-' + id), d = $('#bald-' + id).value;
    if (v == null || !d) return;
    const a = S.accounts.find((x) => x.id === id);
    a.checkpoints = (a.checkpoints || []).filter((c) => c.date !== d).concat([{ date: d, bal: v, src: 'manual' }]).sort((x, y) => x.date.localeCompare(y.date));
    commit();
  },
  'add-acc': () => { const n = $('#acc-new').value.trim(); if (n) { ensureAccount('__new', n, n); commit(); } },
  'del-acc': (el) => { if (confirm(t('set.deleteAccConfirm'))) { S.accounts = S.accounts.filter((a) => a.id !== el.dataset.acc); S.txns = S.txns.filter((x) => x.acc !== el.dataset.acc); commit(); } },
  'del-rule': (el) => { S.rules.splice(+el.dataset.i, 1); recategorise(S); commit(); },
  'add-rule': () => { const w = $('#rule-words').value.trim(); if (!w) return; S.rules.push({ words: [w.toUpperCase()], cat: $('#rule-cat').value }); recategorise(S); commit(); },
  reapply: () => { recategorise(S); commit(); },
  'add-cat': () => { const name = $('#cat-new').value.trim(); if (!name) return; S.categories.custom.push({ id: 'c_' + Date.now().toString(36), kind: $('#cat-kind').value, it: name, en: name, icon: '🏷️' }); commit(); },
  lang: (el) => { S.lang = el.dataset.lang; commit(); },
  reset: () => { if (confirm(t('set.resetConfirm'))) { const lang = S.lang; S = emptyState(); S.lang = lang; UI.tab = 'home'; commit(); } },
};
const CHANGES = {
  'set-cat': (el) => { const x = txById(el.dataset.id); x.cat = el.value; x.catSrc = 'user'; commit(); askRule(x); },
  note: (el) => { const x = txById(el.dataset.id); x.note = el.value.trim(); commit(); },
  'f-acc': (el) => { UI.f.acc = el.value; UI.limit = 100; render(); },
  'f-cat': (el) => { UI.f.cat = el.value; UI.limit = 100; render(); },
  'f-month': (el) => { UI.f.month = el.value; UI.limit = 100; render(); },
  budget: (el) => { const v = parseFloat(el.value); if (v > 0) S.budgets[el.dataset.cat] = Math.round(v * 100); else delete S.budgets[el.dataset.cat]; commit(); },
  'acc-name': (el) => { const a = S.accounts.find((x) => x.id === el.dataset.acc); if (el.value.trim()) a.name = el.value.trim(); commit(); },
  'prof-name': (el) => { S.profile.name = el.value.trim(); commit(); },
  'cat-label': (el) => {
    const c = S.categories.custom.find((x) => x.id === el.dataset.cat);
    if (c) { c.it = c.en = el.value.trim() || c.it; } else if (el.value.trim()) S.categories.labels[el.dataset.cat] = el.value.trim();
    commit();
  },
  'opp-pct': (el) => {
    S.plan.oppPct = S.plan.oppPct || {};
    S.plan.oppPct[el.dataset.id] = +el.value;
    const o = opportunities(S, today()).find((x) => x.id === el.dataset.id);
    if (o && S.plan.adopted[o.id]) S.plan.adopted[o.id].annual = o.annual;
    commit();
  },
  'cash-split': (el) => { const v = Math.max(0, Math.min(100, +el.value || 0)); if (v) S.cash.split[el.dataset.cat] = v; else delete S.cash.split[el.dataset.cat]; commit(); },
  'plan-ret': (el) => { const v = parseFloat(el.value); if (isFinite(v)) { S.plan.returns = S.plan.returns || {}; S.plan.returns[el.dataset.prof] = v / 100; commit(); } },
  'plan-infl': (el) => { const v = parseFloat(el.value); if (isFinite(v)) { S.plan.inflation = v / 100; commit(); } },
  'draft-acc': (el) => { UI.draft.target = el.value; render(); },
  'draft-name': (el) => { UI.draft.newName = el.value; },
  map: (el) => {
    const d = UI.draft;
    d.map = d.map || { headerRow: 0, date: -1, vdate: -1, desc: [], amt: -1, debit: -1, credit: -1, bal: -1, decimalComma: true, dateOrder: 'dmy', columns: [] };
    const f = el.dataset.field;
    if (f === 'headerRow') d.map.headerRow = Math.max(0, (+el.value || 1) - 1);
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
document.addEventListener('input', (e) => {
  if (e.target.dataset && e.target.dataset.act === 'opp-pct') { const s = e.target.nextElementSibling; if (s) s.textContent = e.target.value + '%'; }
});
let qTimer;
document.addEventListener('input', (e) => {
  if (e.target.id !== 'q') return;
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { UI.f.q = e.target.value; UI.limit = 100; const pos = e.target.selectionStart; render(); const q = $('#q'); q.focus(); q.setSelectionRange(pos, pos); }, 200);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
document.addEventListener('dragover', (e) => { e.preventDefault(); const d = $('#drop'); if (d) d.classList.add('over'); });
document.addEventListener('dragleave', () => { const d = $('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', (e) => {
  if (!e.dataTransfer || !e.dataTransfer.files.length) return;
  e.preventDefault();
  S.profile.onboarded = true;
  UI.tab = 'import';
  handleFile(e.dataTransfer.files[0]);
});

/* ---------- start ---------- */
(async () => {
  const saved = await Store.load();
  S = saved ? migrate(saved) : emptyState();
  if (saved && saved.txns && saved.txns.length) S.profile.onboarded = true;
  if (!saved && /^en/i.test(navigator.language || '')) S.lang = 'en';
  initTips();
  render();
})();
