import { listDevices, getDevice } from '../src/bezel.js';

// ─── sample screenshots (drawn on canvas so the demo has no binary assets) ───
const PALETTE = { bg: '#f6efe6', card: '#fffaf3', ink: '#231d17', muted: '#8a7f72', accent: '#d2522b', chip: '#e9e0d3', line: '#eadfce' };
const cache = new Map();

function shot(w, h, { scale = w > 1200 ? 1 : 2, variant = 'app' } = {}) {
  const key = `${w}x${h}@${scale}:${variant}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  g.scale(scale, scale);
  const ratio = w / h;
  if (variant === 'watch' || (ratio > 0.7 && ratio < 0.9 && w < 260)) drawWatch(g, w, h);
  else if (ratio >= 1.15 || (variant === 'long' && w >= 900)) drawDesktop(g, w, h);
  else drawPhone(g, w, h, ratio > 0.6);
  const url = c.toDataURL('image/webp', 0.9);
  cache.set(key, url);
  return url;
}

function rr(g, x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); }
function text(g, s, x, y, size, color, weight = 400, font = 'Inter, system-ui, sans-serif') { g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.fillText(s, x, y); }

function drawPhone(g, w, h, tablet) {
  const u = tablet ? w / 700 : w / 390;
  g.fillStyle = PALETTE.bg; g.fillRect(0, 0, w, h);
  // status bar baked in, like a real screenshot
  text(g, '9:41', 28 * u, 32 * u, 16 * u, PALETTE.ink, 600);
  rr(g, w - 52 * u, 21 * u, 24 * u, 12 * u, 3.5 * u, PALETTE.ink);
  const pad = 20 * u;
  text(g, 'Week', pad, 96 * u, 34 * u, PALETTE.ink, 400, '"Instrument Serif", Georgia, serif');
  rr(g, pad, 112 * u, w - pad * 2, 38 * u, 19 * u, PALETTE.card);
  text(g, 'This week', w / 2 - 38 * u, 137 * u, 16 * u, PALETTE.ink, 600);
  const meals = [['Berry Overnight Oats', 'Breakfast'], ['Grilled Cheese & Soup', 'Lunch'], ['Spaghetti & Meatballs', 'Dinner'], ['Veggie Omelette', 'Breakfast'], ['Chicken Tacos', 'Lunch'], ['Butter Chicken & Rice', 'Dinner'], ['Yogurt Bowl', 'Breakfast'], ['Falafel Wrap', 'Lunch'], ['Salmon & Greens', 'Dinner']];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday'];
  let y = 178 * u, i = 0, d = 0;
  const bottomBar = 84 * u;
  while (y < h - bottomBar - 40 * u) {
    if (i % 3 === 0) {
      if (d === 0) text(g, 'TODAY', pad, y, 11 * u, PALETTE.accent, 700);
      text(g, days[d % days.length], pad, y + 28 * u, 24 * u, PALETTE.ink, 600, 'Georgia, serif');
      rr(g, pad, y + 40 * u, 110 * u, 24 * u, 12 * u, PALETTE.chip); text(g, 'Balanced day', pad + 12 * u, y + 56 * u, 11.5 * u, PALETTE.ink, 500);
      rr(g, pad + 118 * u, y + 40 * u, 108 * u, 24 * u, 12 * u, PALETTE.chip); text(g, 'Protein strong', pad + 130 * u, y + 56 * u, 11.5 * u, PALETTE.ink, 500);
      y += 76 * u; d++;
    }
    const [name, meal] = meals[i % meals.length];
    rr(g, pad, y, w - pad * 2, 58 * u, 12 * u, PALETTE.card);
    text(g, name, pad + 14 * u, y + 26 * u, 15 * u, PALETTE.ink, 600, 'Georgia, serif');
    text(g, meal, pad + 14 * u, y + 44 * u, 12 * u, PALETTE.muted);
    rr(g, w - pad - 84 * u, y + 15 * u, 30 * u, 28 * u, 8 * u, PALETTE.bg); rr(g, w - pad - 46 * u, y + 15 * u, 30 * u, 28 * u, 8 * u, PALETTE.bg);
    y += 66 * u; i++;
  }
  // tab bar pinned to the bottom edge — makes cropping obvious
  g.fillStyle = PALETTE.card; g.fillRect(0, h - bottomBar, w, bottomBar);
  g.fillStyle = PALETTE.line; g.fillRect(0, h - bottomBar, w, 1);
  ['Today', 'Week', 'Shop', 'Trending', 'Household'].forEach((t, k) => {
    const cx = (w / 5) * (k + 0.5);
    rr(g, cx - 10 * u, h - bottomBar + 14 * u, 20 * u, 20 * u, 6 * u, k === 1 ? PALETTE.accent : '#cbbfae');
    g.font = `500 ${11 * u}px Inter, system-ui`; g.fillStyle = k === 1 ? PALETTE.accent : PALETTE.muted;
    g.fillText(t, cx - g.measureText(t).width / 2, h - bottomBar + 50 * u);
  });
  rr(g, w / 2 - 67 * u, h - 13 * u, 134 * u, 5 * u, 3 * u, PALETTE.ink);
}

function drawDesktop(g, w, h) {
  const u = w / 1440;
  g.fillStyle = PALETTE.bg; g.fillRect(0, 0, w, h);
  g.fillStyle = PALETTE.card; g.fillRect(0, 0, 240 * u, h);
  text(g, 'Mealwise', 28 * u, 58 * u, 30 * u, PALETTE.ink, 400, '"Instrument Serif", Georgia, serif');
  ['Overview', 'Week plan', 'Shopping', 'Recipes', 'Household', 'Settings'].forEach((t, k) => {
    if (k === 1) rr(g, 16 * u, (100 + k * 44) * u, 208 * u, 36 * u, 9 * u, PALETTE.chip);
    text(g, t, 32 * u, (124 + k * 44) * u, 15 * u, k === 1 ? PALETTE.ink : PALETTE.muted, k === 1 ? 600 : 400);
  });
  const x0 = 280 * u;
  text(g, 'Good morning, Sam', x0, 88 * u, 44 * u, PALETTE.ink, 400, '"Instrument Serif", Georgia, serif');
  text(g, 'Here is how your week is shaping up.', x0, 120 * u, 16 * u, PALETTE.muted);
  const cw = (w - x0 - 40 * u - 3 * 20 * u) / 4;
  [['Meals planned', '19/21'], ['Protein avg', '112 g'], ['Grocery est.', '$86'], ['Cook time', '4.2 h']].forEach(([k, v], i) => {
    const x = x0 + i * (cw + 20 * u);
    rr(g, x, 150 * u, cw, 110 * u, 14 * u, PALETTE.card);
    text(g, k, x + 20 * u, 184 * u, 14 * u, PALETTE.muted);
    text(g, v, x + 20 * u, 232 * u, 36 * u, PALETTE.ink, 600);
  });
  const chartH = Math.max(h - 300 * u - 60 * u, 120 * u);
  rr(g, x0, 290 * u, w - x0 - 40 * u, chartH, 14 * u, PALETTE.card);
  text(g, 'Calories by day', x0 + 24 * u, 330 * u, 16 * u, PALETTE.ink, 600);
  const bars = [0.62, 0.8, 0.7, 0.92, 0.55, 0.74, 0.86];
  const bw = (w - x0 - 40 * u - 100 * u) / bars.length;
  bars.forEach((b, i) => {
    const bh = (chartH - 100 * u) * b;
    rr(g, x0 + 40 * u + i * bw + bw * 0.2, 290 * u + chartH - 30 * u - bh, bw * 0.6, bh, 8 * u, i === 3 ? PALETTE.accent : '#e6c9b5');
  });
}

function drawWatch(g, w, h) {
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2 + 10, rings = [['#fa114f', 0.78], ['#a6ff00', 0.6], ['#00d8ff', 0.9]];
  rings.forEach(([col, p], i) => {
    const r = 72 - i * 20;
    g.lineWidth = 16; g.lineCap = 'round';
    g.strokeStyle = col + '33'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = col; g.beginPath(); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke();
  });
  text(g, '10:09', w - 62, 30, 17, '#fff', 600);
}

const sampleFor = (d, variant, orientation) => {
  let { w, h } = d.screen;
  if (orientation === 'landscape') [w, h] = [h, w];
  if (variant === 'long') return shot(w, h * 2.8, { variant: 'long' });
  if (variant === 'mismatch') return d.kind === 'phone' || d.kind === 'tablet' ? shot(w, w * 16 / 9) : shot(w, w * 3 / 4);
  return shot(w, h, { variant: d.kind === 'watch' ? 'watch' : 'app' });
};

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const once = (el, type, ms) => new Promise((r) => {
  const t = setTimeout(r, ms);
  el.addEventListener(type, () => { clearTimeout(t); r(); }, { once: true });
});

// ─── fit modes: four live phones ───
const MODES = [
  ['Same shape', 'Fills the screen edge to edge.', () => shot(402, 874)],
  ['Much taller', 'Full-page captures scroll inside the screen.', () => shot(402, 874 * 2.8, { variant: 'long' })],
  ['A bit taller', 'Pinned to the top, so the footer is trimmed.', () => shot(402, 402 / 0.4)],
  ['Wider', 'Letterboxed with colours sampled from its edges.', () => shot(402, 402 * 16 / 9)],
];
const VERDICT = { cover: 'cover', scroll: 'scroll', top: 'top', contain: 'letterbox' };
const modesEl = document.getElementById('fitModes');
const scrollers = [];
for (const [title, line, src] of MODES) {
  const card = document.createElement('figure');
  card.className = 'mode';
  card.innerHTML = `<div class="mode-shot"><bezel-device device="iphone-17-pro" shadow="none"></bezel-device></div>
    <figcaption><span class="mode-fit">fit=auto → …</span><b>${title}</b><span>${line}</span><small></small></figcaption>`;
  const el = card.querySelector('bezel-device');
  el.addEventListener('bezel-fit', (e) => {
    const { fit, media, mismatch } = e.detail;
    card.querySelector('.mode-fit').textContent = `fit=auto → ${VERDICT[fit] ?? fit}`;
    card.dataset.fit = fit;
    card.querySelector('small').textContent = `${media.w}×${media.h} · ${Math.abs((mismatch - 1) * 100).toFixed(0)}% off`;
    if (fit === 'scroll') scrollers.push(el);
  });
  el.setAttribute('src', src());
  modesEl.append(card);
}
// Let the "scroll" phone show that it scrolls, only while it is on screen.
let modesOn = false, t0 = 0;
function scrollTick(t) {
  if (!modesOn) return;
  t0 ||= t;
  for (const el of scrollers) {
    const m = el.shadowRoot.querySelector('.media');
    if (m) m.scrollTop = ((1 - Math.cos(((t - t0) / 7000) * Math.PI * 2)) / 2) * (m.scrollHeight - m.clientHeight);
  }
  requestAnimationFrame(scrollTick);
}
if (!reduceMotion) new IntersectionObserver(([en]) => { modesOn = en.isIntersecting; if (modesOn) requestAnimationFrame(scrollTick); }).observe(modesEl);

// ─── playground ───
const pg = document.getElementById('pg');
const state = { device: 'iphone-17-pro', color: null, source: 'sample', fit: 'auto', orientation: 'portrait', chrome: 'auto', theme: 'light', glare: 'off', custom: null, customName: null, url: '' };
const KIND_LABEL = { phone: 'Phones', foldable: 'Foldables', tablet: 'Tablets', watch: 'Watches', laptop: 'Laptops', desktop: 'Desktops', browser: 'Browser windows' };
const devices = listDevices();

const sel = document.getElementById('device');
for (const [kind, label] of Object.entries(KIND_LABEL)) {
  const og = document.createElement('optgroup'); og.label = label;
  for (const d of devices.filter((x) => x.kind === kind)) og.append(new Option(`${d.name} — ${d.screen.w}×${d.screen.h}`, d.id));
  sel.append(og);
}
sel.value = state.device;
sel.onchange = () => { state.device = sel.value; state.color = null; renderColors(); apply(); };

function renderColors() {
  const box = document.getElementById('colors');
  box.replaceChildren();
  const d = getDevice(state.device);
  d.colors.forEach(([name, hex], i) => {
    const b = document.createElement('button');
    b.title = name; b.style.background = hex;
    b.setAttribute('aria-pressed', String(state.color ? state.color === name : i === 0));
    b.onclick = () => { state.color = name; renderColors(); apply(); };
    box.append(b);
  });
}

document.querySelectorAll('.seg').forEach((seg) => {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const name = seg.dataset.name;
    state[name] = b.dataset.v;
    if (name === 'source') { state.custom = null; state.url = ''; document.getElementById('url').value = ''; }
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  });
});

const drop = document.getElementById('v1Drop'), file = document.getElementById('v1File');
drop.onclick = () => file.click();
drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('v1-over'); };
drop.ondragleave = () => drop.classList.remove('v1-over');
drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('v1-over'); useFile(e.dataTransfer.files[0]); };
file.onchange = () => useFile(file.files[0]);
function useFile(f) {
  if (!f) return;
  if (state.custom) URL.revokeObjectURL(state.custom);
  state.custom = URL.createObjectURL(f); state.customName = f.name; state.customType = f.type.startsWith('video') ? 'video' : 'image';
  state.url = ''; drop.textContent = f.name;
  apply();
}
document.getElementById('url').onchange = (e) => { state.url = e.target.value.trim(); apply(); };

const HTML_DEMO = `<div style="font:15px/1.5 system-ui;padding:calc(var(--bezel-safe-top) + 16px) 20px 20px;background:#fffaf3;min-height:100%;box-sizing:border-box">
  <h2 style="font:400 32px Georgia,serif;margin:8px 0">Hello from HTML</h2>
  <p style="color:#6f675d">This is live, slotted markup. It scrolls, clicks and uses <code>--bezel-safe-top</code> to stay clear of the island.</p>
  <button onclick="this.textContent='Clicked ✓'" style="font:600 15px system-ui;border:0;background:#d2522b;color:#fff;padding:12px 18px;border-radius:12px">Tap me</button>
  ${Array.from({ length: 8 }, (_, i) => `<div style="background:#fff;border:1px solid #eadfce;border-radius:12px;padding:14px;margin-top:12px">Card ${i + 1}</div>`).join('')}
</div>`;

function apply() {
  const d = getDevice(state.device);
  const attrs = { device: state.device };
  if (state.color && state.color !== d.colors[0][0]) attrs.color = state.color.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let src = null, srcLabel = null;
  pg.replaceChildren();
  if (state.url) { src = state.url; srcLabel = state.url; }
  else if (state.custom) { src = state.custom; srcLabel = state.customName; if (state.customType === 'video') attrs.type = 'video'; }
  else if (state.source === 'html') { pg.innerHTML = HTML_DEMO; attrs['safe-area'] = 'none'; }
  else { src = sampleFor(d, state.source, state.orientation); srcLabel = state.source === 'long' ? 'long-screenshot.png' : state.source === 'mismatch' ? 'old-16x9-screenshot.png' : 'screenshot.png'; }
  if (src) attrs.src = src;
  if (state.fit !== 'auto') attrs.fit = state.fit;
  if (state.orientation === 'landscape') attrs.orientation = 'landscape';
  if (state.chrome !== 'auto') attrs.chrome = state.chrome;
  if (state.theme === 'dark') attrs.theme = 'dark';
  if (state.glare === 'on') attrs.glare = '';

  for (const a of [...pg.attributes]) if (a.name !== 'id' && !(a.name in attrs)) pg.removeAttribute(a.name);
  for (const [k, v] of Object.entries(attrs)) pg.setAttribute(k, v);
  if (!src) document.getElementById('report').innerHTML = `Screen <b>${pg.screenSize?.w ?? d.screen.w}×${pg.screenSize?.h ?? d.screen.h}</b> CSS px · slotted HTML`;

  const shown = { ...attrs };
  if (srcLabel) shown.src = srcLabel;
  const attrStr = Object.entries(shown).map(([k, v]) => v === '' ? ` <span class="tok-attr">${k}</span>` : ` <span class="tok-attr">${k}</span>=<span class="tok-str">"${escapeHtml(v)}"</span>`).join('');
  const inner = state.source === 'html' && !src ? '\n  <span style="opacity:.6">&lt;!-- your HTML --&gt;</span>\n' : '';
  document.getElementById('snippet').innerHTML =
    `<span style="opacity:.55">&lt;!-- once, anywhere on the page --&gt;</span>\n<span class="tok-tag">&lt;script</span> <span class="tok-attr">type</span>=<span class="tok-str">"module"</span> <span class="tok-attr">src</span>=<span class="tok-str">"https://cdn.jsdelivr.net/npm/bezelkit@0/dist/bezelkit.js"</span><span class="tok-tag">&gt;&lt;/script&gt;</span>\n\n<span class="tok-tag">&lt;bezel-device</span>${attrStr}<span class="tok-tag">&gt;</span>${inner}<span class="tok-tag">&lt;/bezel-device&gt;</span>`;
}
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

pg.addEventListener('bezel-fit', (e) => {
  const { fit, media, screen, mismatch, requested } = e.detail;
  const pct = Math.abs(mismatch - 1) * 100;
  const verdict = pct <= 4 ? 'shapes match' : mismatch < 1 ? `media is ${pct.toFixed(0)}% taller` : `media is ${pct.toFixed(0)}% wider`;
  document.getElementById('report').innerHTML =
    `Media <b>${media.w}×${media.h}</b> → screen <b>${Math.round(screen.w)}×${Math.round(screen.h)}</b> · ${verdict} · fit <b>${fit}</b>${requested === 'auto' ? ' (auto)' : ''}`;
});

document.getElementById('copySnippet').onclick = (e) => {
  navigator.clipboard.writeText(document.getElementById('snippet').textContent);
  e.target.textContent = 'Copied'; setTimeout(() => (e.target.textContent = 'Copy'), 1200);
};
document.querySelectorAll('[data-copy]').forEach((b) => (b.onclick = () => { navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'copied'; setTimeout(() => (b.textContent = 'copy'), 1200); }));

renderColors();
apply();

// ─── gallery: tabs by kind, one horizontal strip ───
const gallery = document.getElementById('gallery');
const TABS = [['phone', 'Phones'], ['foldable', 'Foldables'], ['tablet', 'Tablets'], ['laptop', 'Laptops'], ['desktop', 'Desktops'], ['watch', 'Watches'], ['browser', 'Browsers']];
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const el = en.target; io.unobserve(el);
    el.setAttribute('src', sampleFor(getDevice(el.getAttribute('device'))));
  }
}, { rootMargin: '200px' });
function showKind(kind) {
  document.querySelectorAll('#galleryTabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.kind === kind)));
  gallery.dataset.kind = kind;
  gallery.replaceChildren(...devices.filter((d) => d.kind === kind).map((d) => {
    const tile = document.createElement('button'); tile.className = 'tile';
    tile.innerHTML = `<div class="shot"><bezel-device device="${d.id}" ${d.kind === 'browser' ? 'url="mealwise.app"' : ''}></bezel-device></div><div class="name">${d.name}</div><div class="meta">${d.screen.w}×${d.screen.h}${d.dpr ? ` @${d.dpr}x` : ''}</div>`;
    tile.onclick = () => { state.device = d.id; state.color = null; sel.value = d.id; renderColors(); apply(); document.getElementById('play').scrollIntoView(); };
    io.observe(tile.querySelector('bezel-device'));
    return tile;
  }));
  gallery.scrollLeft = 0;
}
const tabsEl = document.getElementById('galleryTabs');
for (const [kind, label] of TABS) {
  const n = devices.filter((d) => d.kind === kind).length;
  if (!n) continue;
  const b = document.createElement('button');
  b.setAttribute('role', 'tab'); b.dataset.kind = kind;
  b.innerHTML = `${label} <span>${n}</span>`;
  b.onclick = () => showKind(kind);
  tabsEl.append(b);
}
showKind('phone');
