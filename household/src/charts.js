/* Small SVG charts. Colours come from CSS tokens (--in, --out, --s1, --g1..--g8) so light and dark both work.
   Every mark that carries a number has a data-tip, shown by the shared tooltip on hover or tap. */
const svgEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A progress ring: value 0..1, colour token, size in px, label in the middle.
function ring(value, color, size = 64, label = '') {
  const r = size / 2 - 5, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value || 0));
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-val" style="stroke:${color}" stroke-dasharray="${(c * v).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    ${label ? `<text x="50%" y="50%" dy="0.35em" text-anchor="middle" class="ring-label">${svgEsc(label)}</text>` : ''}</svg>`;
}

// Monthly income and spending as paired bars, rounded at the data end, with a hover target per month.
function trendChart(rows, labels) {
  const W = 680, H = 220, L = 40, B = 26, T = 10;
  const max = Math.max(1, ...rows.map((r) => Math.max(r.inc, r.out)));
  const nice = niceMax(max);
  const y = (v) => H - B - (Math.max(0, v) / nice) * (H - B - T);
  const bw = (W - L) / rows.length, w = Math.min(18, bw / 2 - 3);
  const bar = (x, v, cls) => { const top = y(v), h = H - B - top; return h <= 0 ? '' : `<path class="${cls}" d="M${x},${H - B} V${top + Math.min(4, h)} q0,-4 4,-4 h${w - 8} q4,0 4,4 V${H - B} Z"/>`; };
  const grid = [0.5, 1].map((f) => `<line x1="${L}" x2="${W}" y1="${y(nice * f)}" y2="${y(nice * f)}" class="grid"/><text x="${L - 6}" y="${y(nice * f) + 4}" text-anchor="end" class="axis">${svgEsc(labels.axis(nice * f))}</text>`).join('');
  const marks = rows.map((r, i) => {
    const cx = L + i * bw + bw / 2;
    return `<g>${bar(cx - w - 1, r.inc, 'b-in')}${bar(cx + 1, r.out, 'b-out')}
      <text x="${cx}" y="${H - 8}" text-anchor="middle" class="axis">${svgEsc(labels.month(r.month))}</text>
      <rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - B - T}" class="hit" data-tip="${svgEsc(labels.tip(r))}"/></g>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${svgEsc(labels.title)}">${grid}<line x1="${L}" x2="${W}" y1="${H - B}" y2="${H - B}" class="base"/>${marks}</svg>`;
}
function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

// A goal's possible path: 90% band, expected line, money paid in (dashed) and the target.
function fanChart(proj, target, labels) {
  const W = 680, H = 220, L = 52, B = 26, T = 14;
  const n = proj[proj.length - 1].k || 1;
  const max = niceMax(Math.max(target, ...proj.map((p) => p.hi)) * 1.05);
  const x = (k) => L + (k / n) * (W - L - 8), y = (v) => H - B - (Math.max(0, v) / max) * (H - B - T);
  const line = (f) => proj.map((p, i) => `${i ? 'L' : 'M'}${x(p.k).toFixed(1)},${y(f(p)).toFixed(1)}`).join(' ');
  const band = line((p) => p.hi) + ' ' + [...proj].reverse().map((p) => `L${x(p.k).toFixed(1)},${y(p.lo).toFixed(1)}`).join(' ') + ' Z';
  // ticks in months: every 3 or 6 months for short goals, every 1, 2 or 5 years for long ones
  const step = n <= 12 ? 3 : n <= 36 ? 6 : n <= 84 ? 12 : n <= 168 ? 24 : 60;
  const ticks = [];
  for (let k = 0; k <= n; k += step) ticks.push(k);
  const grid = [0.5, 1].map((f) => `<line x1="${L}" x2="${W}" y1="${y(max * f)}" y2="${y(max * f)}" class="grid"/><text x="${L - 6}" y="${y(max * f) + 4}" text-anchor="end" class="axis">${svgEsc(labels.axis(max * f))}</text>`).join('');
  const hits = proj.map((p, i) => {
    const x0 = i ? (x(proj[i - 1].k) + x(p.k)) / 2 : L, x1 = i < proj.length - 1 ? (x(p.k) + x(proj[i + 1].k)) / 2 : W;
    return `<rect x="${x0}" y="${T}" width="${Math.max(1, x1 - x0)}" height="${H - B - T}" class="hit" data-tip="${svgEsc(labels.tip(p))}"/>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${svgEsc(labels.title)}">${grid}
    <path d="${band}" class="fan-band"/><path d="${line((p) => p.paid)}" class="fan-paid"/><path d="${line((p) => p.mid)}" class="fan-mid"/>
    <line x1="${L}" x2="${W - 8}" y1="${y(target)}" y2="${y(target)}" class="fan-target"/><text x="${W - 10}" y="${y(target) - 6}" text-anchor="end" class="axis strong">${svgEsc(labels.target)}</text>
    <line x1="${L}" x2="${W}" y1="${H - B}" y2="${H - B}" class="base"/>
    ${ticks.map((k) => `<text x="${x(k)}" y="${H - 8}" text-anchor="middle" class="axis">${svgEsc(labels.tick(k))}</text>`).join('')}${hits}</svg>`;
}

// Shared tooltip for anything with data-tip.
function initTips() {
  const tip = document.getElementById('tip');
  const show = (el, x, y) => {
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2)) + 'px';
    tip.style.top = Math.max(8, y - r.height - 14) + 'px';
  };
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el, e.clientX, e.clientY); else tip.hidden = true;
  });
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el && e.pointerType !== 'mouse') show(el, e.clientX, e.clientY);
  });
  document.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
}
