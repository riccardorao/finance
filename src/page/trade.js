/* ===== page part 3: sending orders to Scalable Capital =====
   Three steps, each its own click: fill in the ticket, review Scalable's own preview (every field shown exactly as
   Scalable returns it, every required statement shown in full and ticked separately), then confirm. The submission
   from the preview is passed back unchanged, exactly once: nothing is retried, and an unclear outcome is reported as
   unclear. Scalable's own app link is offered only when this page stopped the order before anything was sent. */
const TRADE_ACKS = ['acknowledge_appropriateness_warning', 'accept_unsuitable'];
const tradeState = { open: false };

async function callTrade(tool, input) { // no retry: an order call is made once
  const r = await MCP.callTool(SERVER, tool, input, { cache: false });
  let p = r && r.payload; if (typeof p === 'string') { try { p = JSON.parse(p); } catch (e) { /* keep text */ } }
  return p;
}
function openTrade(isin, side, name, opts) {
  const h = DATA_ACTIVE.holdings.find((x) => x.isin === isin);
  Object.assign(tradeState, { open: true, step: 'ticket', isin, side, name: name || (h && h.name) || isin, held: h ? h.qty : 0, price: h ? h.price : (opts && opts.price) || null,
    form: { mode: 'shares', shares: side === 'sell' && h ? String(h.qty) : '', amount: '', type: 'market', limit: '', stop: '', trailType: 'percentage', trail: '5', venue: '' },
    preview: null, acks: {}, result: null, error: null, msg: '' });
  renderTrade();
}
function closeTrade() { tradeState.open = false; renderTrade(); }
const humanKey = (k) => String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
// Scalable's review, field by field, with the values exactly as returned
function reviewHtml(v, depth) {
  if (v == null) return '<span class="muted">–</span>';
  if (Array.isArray(v)) return v.length ? `<ul class="rv-l">${v.map((x) => `<li>${reviewHtml(x, depth + 1)}</li>`).join('')}</ul>` : '<span class="muted">–</span>';
  if (typeof v === 'object') return `<dl class="rv${depth ? ' sub' : ''}">${Object.entries(v).map(([k, x]) => `<div><dt>${esc(humanKey(k))}</dt><dd>${reviewHtml(x, depth + 1)}</dd></div>`).join('')}</dl>`;
  return esc(String(v));
}
// the statements Scalable requires, with their full text, wherever the preview carries them
function findAcks(p) {
  const out = {}, walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    const id = o.id || o.acknowledgementId || o.key;
    const text = o.text || o.statement || o.message || o.description || o.label || o.title;
    if (TRADE_ACKS.includes(id) && typeof text === 'string' && text.trim()) out[id] = [o.title && o.title !== text ? o.title : '', text].filter(Boolean).join('\n\n');
    Object.values(o).forEach(walk);
  };
  walk(p); return out;
}
function findExpiry(p) {
  let t = null; const walk = (o) => { if (!o || typeof o !== 'object') return; Object.entries(o).forEach(([k, v]) => { if (/expir/i.test(k) && typeof v === 'string' && !isNaN(Date.parse(v))) t = Date.parse(v); else walk(v); }); };
  walk(p); return t;
}
function orderInput() {
  const f = tradeState.form, side = tradeState.side;
  const order = f.type === 'market' ? { type: 'market' } : f.type === 'limit' ? { type: 'limit', limitPrice: f.limit } : f.type === 'stop' ? { type: 'stop', stopPrice: f.stop } : { type: 'trailing-stop', trail: { type: f.trailType, distance: f.trail } };
  const quantity = side === 'buy' && f.mode === 'amount' ? { mode: 'amount', amount: f.amount } : { mode: 'shares', shares: f.shares };
  const input = { isin: tradeState.isin, quantity, order }; if (f.venue) input.venue = f.venue;
  return input;
}
function ticketProblem() {
  const f = tradeState.form, pos = (x) => +x > 0;
  if (tradeState.side === 'buy' && f.mode === 'amount') { if (!pos(f.amount)) return 'Enter the amount in euro.'; }
  else if (!pos(f.shares)) return 'Enter the number of shares.';
  else if (tradeState.side === 'buy' && !/^\d+$/.test(String(f.shares).trim())) return 'Buy whole shares, or switch to an amount in euro.';
  if (tradeState.side === 'sell' && +f.shares > tradeState.held + 1e-9) return `You hold ${tradeState.held} shares.`;
  if (f.type === 'limit' && !pos(f.limit)) return 'Enter the limit price.';
  if (f.type === 'stop' && !pos(f.stop)) return 'Enter the stop price.';
  if (f.type === 'trailing-stop' && !pos(f.trail)) return 'Enter the trailing distance.';
  return '';
}
async function reviewOrder() {
  const bad = ticketProblem(); if (bad) { tradeState.msg = bad; renderTrade(); return; }
  tradeState.step = 'loading'; tradeState.msg = ''; renderTrade();
  try {
    const p = await callTrade(tradeState.side === 'buy' ? 'preview_buy_order' : 'preview_sell_order', orderInput());
    if (!p || !p.submission) throw { message: (p && (p.message || p.error)) || 'Scalable did not return a review for this order.' };
    tradeState.preview = p; tradeState.acks = {}; tradeState.step = 'review';
  } catch (e) { tradeState.step = 'ticket'; tradeState.msg = (e && e.message) || 'Scalable could not review this order.'; }
  renderTrade();
}
async function sendOrder() {
  const p = tradeState.preview, need = (p.submission.confirmationContext && p.submission.confirmationContext.requiredAcknowledgementIds) || [];
  const exp = findExpiry(p);
  if (exp && Date.now() > exp) { tradeState.step = 'ticket'; tradeState.msg = 'That review has expired, so nothing was sent. Review the order again.'; tradeState.preview = null; renderTrade(); return; }
  if (!need.every((id) => tradeState.acks[id])) return;
  tradeState.step = 'sending'; renderTrade();
  try {
    const r = await callTrade(tradeState.side === 'buy' ? 'submit_buy_order' : 'submit_sell_order', { submission: p.submission, acknowledgementIds: need.slice() });
    tradeState.result = r || {}; tradeState.step = 'done';
    setTimeout(() => { if (typeof liveRefresh === 'function') liveRefresh(); }, 4000);
  } catch (e) {
    const code = (e && e.code) || '';
    const before = /not_granted|not_in_manifest|denied|declined|consent|blocked/i.test(code); // stopped on this side, before anything went to Scalable
    const rejected = /trade_acknowledgement_required|expired|invalid_confirmation|confirmation/i.test(code);
    tradeState.step = 'error';
    tradeState.error = before ? { kind: 'blocked', text: 'Nothing was sent: the order was stopped before it reached Scalable.' }
      : rejected ? { kind: 'rejected', text: 'Scalable did not place the order: ' + ((e && e.message) || code) + '. Review it again to try once more.' }
      : { kind: 'unknown', text: 'It is not clear whether the order reached Scalable. Check your orders in the Scalable app before placing it again.' };
  }
  renderTrade();
}
function renderTrade() {
  let root = document.getElementById('trade');
  if (!root) { root = document.createElement('div'); root.id = 'trade'; document.body.appendChild(root); }
  if (!tradeState.open) { root.innerHTML = ''; root.hidden = true; return; }
  root.hidden = false;
  const T = tradeState, f = T.form, buy = T.side === 'buy';
  const est = T.price && f.mode === 'shares' && +f.shares > 0 ? +f.shares * T.price : null;
  let body = '';
  if (T.step === 'ticket' || T.step === 'loading') {
    body = `<div class="tk-seg seg" role="group" aria-label="Side"><button data-side="buy" aria-pressed="${buy}">Buy</button><button data-side="sell" aria-pressed="${!buy}" ${T.held ? '' : 'disabled'}>Sell</button></div>
      <div class="tk-grid">
        ${buy ? `<label class="tk-f"><span>Size by</span><select id="tk-mode"><option value="shares" ${f.mode === 'shares' ? 'selected' : ''}>Shares</option><option value="amount" ${f.mode === 'amount' ? 'selected' : ''}>Amount in €</option></select></label>` : ''}
        ${buy && f.mode === 'amount' ? `<label class="tk-f"><span>Amount (€)</span><input id="tk-amount" inputmode="decimal" value="${esc(f.amount)}" placeholder="1000"></label>` : `<label class="tk-f"><span>Shares${!buy ? ` <small>of ${T.held}</small>` : ''}</span><input id="tk-shares" inputmode="decimal" value="${esc(f.shares)}" placeholder="10"></label>`}
        <label class="tk-f"><span>Order type</span><select id="tk-type">${[['market', 'Market'], ['limit', 'Limit'], ['stop', 'Stop']].concat(buy ? [] : [['trailing-stop', 'Trailing stop']]).map(([k, l]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${f.type === 'limit' ? `<label class="tk-f"><span>Limit price (€)</span><input id="tk-limit" inputmode="decimal" value="${esc(f.limit)}"></label>` : ''}
        ${f.type === 'stop' ? `<label class="tk-f"><span>Stop price (€)</span><input id="tk-stop" inputmode="decimal" value="${esc(f.stop)}"></label>` : ''}
        ${f.type === 'trailing-stop' ? `<label class="tk-f"><span>Trail by</span><select id="tk-trailtype"><option value="percentage" ${f.trailType === 'percentage' ? 'selected' : ''}>%</option><option value="amount" ${f.trailType === 'amount' ? 'selected' : ''}>€</option></select></label><label class="tk-f"><span>Distance</span><input id="tk-trail" inputmode="decimal" value="${esc(f.trail)}"></label>` : ''}
        <label class="tk-f"><span>Venue</span><select id="tk-venue"><option value="">Portfolio default</option><option value="gettex" ${f.venue === 'gettex' ? 'selected' : ''}>gettex</option><option value="xetra" ${f.venue === 'xetra' ? 'selected' : ''}>Xetra</option><option value="eix" ${f.venue === 'eix' ? 'selected' : ''}>EIX</option></select></label>
      </div>
      <div class="tk-sum">${T.price ? `<span>Last price <b>€${T.price.toFixed(2)}</b></span>` : ''}${est ? `<span>About <b>${fmtEUR0(est)}</b></span>` : ''}</div>
      ${T.msg ? `<p class="tk-msg">${esc(T.msg)}</p>` : ''}
      <div class="tk-act"><button class="btn" data-tk="close">Cancel</button><button class="btn primary" data-tk="review" ${T.step === 'loading' ? 'disabled' : ''}>${T.step === 'loading' ? 'Asking Scalable…' : 'Review order'}</button></div>`;
  } else if (T.step === 'review' || T.step === 'sending') {
    const p = T.preview, need = (p.submission.confirmationContext && p.submission.confirmationContext.requiredAcknowledgementIds) || [], texts = findAcks(p);
    const missing = need.filter((id) => !texts[id]), exp = findExpiry(p);
    const ready = !missing.length && need.every((id) => T.acks[id]);
    body = `<p class="tk-note">This is Scalable's review of the order. Nothing has been sent yet.${exp ? ` It is valid until ${new Date(exp).toLocaleTimeString('en-GB')}.` : ''}</p>
      <div class="tk-review">${reviewHtml(p.userReview != null ? p.userReview : p, 0)}</div>
      ${need.filter((id) => texts[id]).map((id) => `<label class="tk-ack"><input type="checkbox" data-ack="${esc(id)}" ${T.acks[id] ? 'checked' : ''}><span>${esc(texts[id]).replace(/\n/g, '<br>')}</span></label>`).join('')}
      ${missing.length ? `<p class="tk-msg">Scalable asks you to accept a statement this page cannot show in full, so the order stops here and nothing was sent.${p.brokerHandoff && safeUrl(p.brokerHandoff.url) ? ` You can place it in the Scalable app instead: <a href="${esc(safeUrl(p.brokerHandoff.url))}" target="_blank" rel="noopener noreferrer">open Scalable</a>. That starts a fresh review there.` : ''}</p>` : ''}
      <div class="tk-act"><button class="btn" data-tk="back" ${T.step === 'sending' ? 'disabled' : ''}>Change order</button><button class="btn ${buy ? 'buy' : 'sell'}" data-tk="send" ${ready && T.step !== 'sending' ? '' : 'disabled'}>${T.step === 'sending' ? 'Sending…' : `Confirm and send ${buy ? 'buy' : 'sell'} order`}</button></div>`;
  } else if (T.step === 'done') {
    const r = T.result || {};
    body = `<p class="tk-ok">Order sent to Scalable Capital.</p><dl class="rv">${r.transactionReference ? `<div><dt>Scalable reference</dt><dd>${esc(r.transactionReference)}</dd></div>` : '<div><dt>Scalable reference</dt><dd>Shows in the Scalable app shortly</dd></div>'}${r.orderId ? `<div><dt>Order ID</dt><dd>${esc(r.orderId)}</dd></div>` : ''}${r.status ? `<div><dt>Status</dt><dd>${esc(r.status)}</dd></div>` : ''}</dl>
      <div class="tk-act"><button class="btn primary" data-tk="close">Done</button></div>`;
  } else if (T.step === 'error') {
    const e = T.error, hand = e.kind === 'blocked' && T.preview && T.preview.brokerHandoff && safeUrl(T.preview.brokerHandoff.url);
    body = `<p class="tk-msg">${esc(e.text)}</p>${hand ? `<p class="tk-note">You can place it in the Scalable app instead, with a fresh review there: <a href="${esc(hand)}" target="_blank" rel="noopener noreferrer">open Scalable</a>.</p>` : ''}
      <div class="tk-act"><button class="btn" data-tk="close">Close</button>${e.kind === 'rejected' ? '<button class="btn primary" data-tk="again">Review again</button>' : ''}</div>`;
  }
  root.innerHTML = `<div class="tk-back" data-tk="close"></div><div class="tk" role="dialog" aria-modal="true" aria-labelledby="tk-h">
    <div class="tk-hd"><div><span class="lbl">${buy ? 'Buy' : 'Sell'} · Scalable Capital</span><h3 id="tk-h">${esc(T.name)}</h3></div><button class="tk-x" data-tk="close" aria-label="Close">×</button></div>${body}</div>`;
  const bind = (id, k) => { const el = document.getElementById(id); if (el) el.addEventListener('input', () => { T.form[k] = el.value.trim(); if (k === 'mode' || k === 'type' || k === 'trailType') renderTrade(); else { T.msg = ''; const s = root.querySelector('.tk-sum'); if (s) { const est2 = T.price && T.form.mode === 'shares' && +T.form.shares > 0 ? +T.form.shares * T.price : null; s.innerHTML = `${T.price ? `<span>Last price <b>€${T.price.toFixed(2)}</b></span>` : ''}${est2 ? `<span>About <b>${fmtEUR0(est2)}</b></span>` : ''}`; } } }); };
  [['tk-mode', 'mode'], ['tk-amount', 'amount'], ['tk-shares', 'shares'], ['tk-type', 'type'], ['tk-limit', 'limit'], ['tk-stop', 'stop'], ['tk-trailtype', 'trailType'], ['tk-trail', 'trail'], ['tk-venue', 'venue']].forEach(([id, k]) => bind(id, k));
  root.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => { T.side = b.dataset.side; if (T.side === 'sell') { T.form.mode = 'shares'; T.form.shares = String(T.held); if (T.form.type === 'trailing-stop') T.form.type = 'market'; } else if (T.form.type === 'trailing-stop') T.form.type = 'market'; T.msg = ''; renderTrade(); }));
  root.querySelectorAll('[data-ack]').forEach((c) => c.addEventListener('change', () => { T.acks[c.dataset.ack] = c.checked; renderTrade(); }));
  root.querySelectorAll('[data-tk]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.tk;
    if (a === 'close') { if (T.step !== 'sending' && T.step !== 'loading') closeTrade(); }
    else if (a === 'review') reviewOrder();
    else if (a === 'back') { T.step = 'ticket'; T.preview = null; renderTrade(); }
    else if (a === 'send') sendOrder();
    else if (a === 'again') { T.step = 'ticket'; T.preview = null; T.error = null; renderTrade(); }
  }));
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tradeState.open && tradeState.step !== 'sending') closeTrade(); });
// buttons anywhere on the page that open the ticket
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-trade]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  openTrade(b.dataset.isin, b.dataset.trade, b.dataset.name);
});
