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

// ─── story: how fit=auto thinks ───
const story = {
  el: document.getElementById('storyDevice'), wrap: document.getElementById('stageWrap'), ghost: document.getElementById('ghost'),
  label: document.getElementById('ghostLabel'), note: document.getElementById('ghostNote'),
  top: document.getElementById('bandTop'), bottom: document.getElementById('bandBottom'), verdict: document.getElementById('verdict'),
  step: null, detail: null, loop: 0, wait: 0,
};
const STEPS = {
  match: () => shot(402, 874),
  long: () => shot(402, 874 * 2.8, { variant: 'long' }),
  tall: () => shot(402, 402 / 0.4),
  wide: () => shot(402, 402 * 16 / 9),
};
const VERDICT_BG = { cover: '#2e7d4f', scroll: '#2f5fa7', top: '#b5471f', contain: '#6b4fa0', pad: '#1d1a16' };
const SAFE_HTML = `<div style="min-height:100%;box-sizing:border-box;padding:14px 18px;background:#fffaf3;font:15px/1.45 system-ui,sans-serif;color:#231d17">
  <div style="display:flex;justify-content:space-between;align-items:center"><b style="font:400 32px Georgia,serif">Inbox</b><span style="padding:2px 10px;border-radius:999px;background:#d2522b;color:#fff;font-weight:600">3</span></div>
  ${['Your order shipped', 'Sam shared “Week plan”', 'Receipt from Mealwise', 'Weekly digest', 'Security alert', 'New comment', 'Invoice #2291']
    .map((t, i) => `<div style="margin-top:10px;padding:12px 14px;background:#fff;border:1px solid #eadfce;border-radius:12px"><b>${t}</b><div style="color:#8a7f72;font-size:13px">${i + 1}h ago</div></div>`).join('')}
</div>`;

function cell(i, label, value, digits = 2, suffix = '') {
  document.getElementById(`l${i}`).textContent = label;
  const el = document.getElementById(`v${i}`);
  if (typeof value !== 'number') { el.textContent = value; return; }
  const from = parseFloat(el.textContent) || 0, t0 = performance.now();
  const tick = (t) => {
    const k = reduceMotion ? 1 : Math.min(1, (t - t0) / 600), e = 1 - (1 - k) ** 3;
    el.textContent = (from + (value - from) * e).toFixed(digits) + suffix;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function setVerdict(text, key) { story.verdict.textContent = text; story.verdict.style.background = VERDICT_BG[key]; }
function screenBox() {
  const scr = story.el.shadowRoot.querySelector('.screen').getBoundingClientRect(), w = story.wrap.getBoundingClientRect();
  return { x: scr.left - w.left, y: scr.top - w.top, W: scr.width, H: scr.height };
}
function band(el, g, top, h, html, cls = '') {
  el.className = `band v1-on ${cls}`;
  Object.assign(el.style, { left: `${g.x}px`, width: `${g.W}px`, top: `${top}px`, height: `${Math.max(h, 0)}px` });
  el.firstElementChild.innerHTML = html;
}
function stopLoop() { cancelAnimationFrame(story.loop); clearTimeout(story.wait); story.ghost.classList.remove('v1-live'); }

function renderStory() {
  stopLoop();
  const { ghost } = story;
  story.top.className = story.bottom.className = 'band';
  if (story.step === 'safe') {
    ghost.style.opacity = 0;
    const g = screenBox(), spec = story.el.spec, s = g.W / spec.screen.w;
    band(story.top, g, g.y, spec.safe.top * s, `--bezel-safe-top · ${spec.safe.top}px`);
    band(story.bottom, g, g.y + g.H - spec.safe.bottom * s, spec.safe.bottom * s, `${spec.safe.bottom}px`);
    document.getElementById('op0').textContent = '·';
    document.getElementById('op1').textContent = '→';
    cell(0, 'safe top', spec.safe.top, 0, 'px');
    cell(1, 'safe bottom', spec.safe.bottom, 0, 'px');
    cell(2, 'content box', `${spec.screen.w}×${spec.screen.h - spec.safe.top - spec.safe.bottom}`);
    setVerdict('safe-area: pad', 'pad');
    return;
  }
  const d = story.detail;
  if (!d) return;
  const g = screenBox(), s = g.W / d.screen.w, imgH = g.W / d.mediaRatio;
  const top = d.fit === 'cover' || d.fit === 'contain' ? g.y + (g.H - imgH) / 2 : g.y;
  Object.assign(ghost.style, { left: `${g.x}px`, width: `${g.W}px`, top: `${top}px`, height: `${imgH}px`, opacity: 1 });
  ghost.style.setProperty('--sy', `${g.y - top}px`);
  ghost.style.setProperty('--sh', `${g.H}px`);
  ghost.style.setProperty('--hatch', d.fit === 'scroll' ? 'rgba(47,95,167,.35)' : 'rgba(210,82,43,.4)');
  story.label.textContent = `your image · ${d.media.w}×${d.media.h}`;
  story.note.textContent = d.fit === 'top' ? `bottom ${Math.round((1 - g.H / imgH) * 100)}% trimmed` : d.fit === 'scroll' ? '↕ scrolls inside the screen' : '';
  document.getElementById('op0').textContent = '÷';
  document.getElementById('op1').textContent = '=';
  cell(0, 'image', d.mediaRatio, 3);
  cell(1, 'screen', d.screenRatio, 3);
  cell(2, 'mismatch', d.mismatch, 2);
  setVerdict(`fit: ${d.fit}`, d.fit);

  if (d.fit === 'contain') {
    const cs = getComputedStyle(story.el.shadowRoot.querySelector('.media'));
    const ct = cs.getPropertyValue('--_lb-top').trim() || '#000', cb = cs.getPropertyValue('--_lb-bottom').trim() || '#000';
    band(story.top, g, g.y, top - g.y, `<i style="background:${ct}"></i>sampled top`, 'lb');
    band(story.bottom, g, top + imgH, g.y + g.H - top - imgH, `<i style="background:${cb}"></i>sampled bottom`, 'lb');
  }
  if (d.fit === 'scroll' && !reduceMotion) {
    // Let the ghost finish its transition, then drive the real scroll and the outline together.
    story.wait = setTimeout(() => {
      const media = story.el.shadowRoot.querySelector('.media');
      ghost.classList.add('v1-live');
      const t0 = performance.now();
      const tick = (t) => {
        const max = media.scrollHeight - media.clientHeight;
        const st = ((1 - Math.cos(((t - t0) / 8000) * Math.PI * 2)) / 2) * max;
        media.scrollTop = st;
        ghost.style.top = `${top - st * s}px`;
        ghost.style.setProperty('--sy', `${g.y - top + st * s}px`);
        story.loop = requestAnimationFrame(tick);
      };
      story.loop = requestAnimationFrame(tick);
    }, 850);
  }
}

function activate(step) {
  if (step === story.step) return;
  story.step = step;
  story.detail = null;
  stopLoop();
  document.querySelectorAll('.step').forEach((el) => el.classList.toggle('active', el.dataset.step === step));
  const el = story.el;
  const media = el.shadowRoot.querySelector('.media');
  if (media) media.scrollTop = 0;
  if (step === 'safe') {
    el.removeAttribute('src');
    el.setAttribute('safe-area', 'pad');
    el.setAttribute('chrome', 'on');
    el.innerHTML = SAFE_HTML;
    frame().then(() => story.step === 'safe' && renderStory());
  } else {
    el.replaceChildren();
    el.removeAttribute('safe-area');
    el.removeAttribute('chrome');
    el.setAttribute('src', STEPS[step]());
  }
}
story.el.addEventListener('bezel-fit', (e) => {
  const prev = story.detail;
  const same = prev && prev.fit === e.detail.fit && prev.media.w === e.detail.media.w && prev.media.h === e.detail.media.h;
  if (story.step === 'safe' || same) return;
  story.detail = e.detail;
  renderStory();
});
const stepObserver = new IntersectionObserver((entries) => {
  for (const en of entries) if (en.isIntersecting) activate(en.target.dataset.step);
}, { rootMargin: '-48% 0px -48% 0px' });
document.querySelectorAll('.step').forEach((el) => stepObserver.observe(el));
new ResizeObserver(() => story.step && requestAnimationFrame(renderStory)).observe(story.wrap);
new IntersectionObserver(([en]) => { if (!en.isIntersecting) stopLoop(); else if (story.step) renderStory(); }).observe(document.getElementById('storyStage'));
activate('match');

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

// ─── gallery ───
const gallery = document.getElementById('gallery');
const groups = [['phone', 'Phones', 'v1-phone'], ['foldable', 'Foldables', 'v1-tablet'], ['tablet', 'Tablets', 'v1-tablet'], ['watch', 'Watches', 'watch'], [['laptop', 'desktop'], 'Laptops & desktops', 'wide'], ['browser', 'Browser windows', 'wide']];
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    const el = en.target; io.unobserve(el);
    el.setAttribute('src', sampleFor(getDevice(el.getAttribute('device'))));
  }
}, { rootMargin: '400px' });
for (const [kinds, label, cls] of groups) {
  const list = devices.filter((d) => [].concat(kinds).includes(d.kind));
  const h = document.createElement('h3'); h.className = 'kind'; h.textContent = label;
  const grid = document.createElement('div'); grid.className = `grid ${cls}`;
  for (const d of list) {
    const tile = document.createElement('button'); tile.className = 'tile';
    tile.innerHTML = `<div class="shot"><bezel-device device="${d.id}" ${d.kind === 'browser' ? 'url="mealwise.app"' : ''}></bezel-device></div><div class="name">${d.name}</div><div class="meta">${d.id} · ${d.screen.w}×${d.screen.h}${d.dpr ? ` @${d.dpr}x` : ''}</div>`;
    tile.onclick = () => { state.device = d.id; state.color = null; sel.value = d.id; renderColors(); apply(); document.getElementById('play').scrollIntoView(); };
    io.observe(tile.querySelector('bezel-device'));
    grid.append(tile);
  }
  gallery.append(h, grid);
}
