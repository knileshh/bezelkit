// Hero motion graphic (GSAP). Renders into <section id="hero">.
//
// Storyboard (one ~11.8 s loop):
//   1  a flat "Stride" screenshot drops onto the stage with its pixel dimensions
//   2  a generic mockup closes around it: squashed into 9:16, then cropped with a notch over the header
//   3  it snaps into a real <bezel-device device="iphone-17-pro">, fit="auto" → cover
//   4  the same app sweeps through Pixel → iPad (landscape) → MacBook (deck) → Watch, each a real
//      <bezel-device>, with dimension lines showing the real CSS viewport
//   5  a code chip types the tag, with the device value retyped in sync
// Every frame on the stage is a real <bezel-device>. Only the "typical mockup" is fake.
import { listDevices, getDevice } from '../src/bezel.js';

const GSAP_URL = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/+esm';
const hero = document.getElementById('hero');
const RM = document.documentElement.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ─── sample screenshots, drawn on canvas (same "Stride" app as the scroll story) ─────────────
const A = { bg: '#f3f2ee', card: '#ffffff', ink: '#101114', muted: '#7b7e86', line: '#e3e1db', accent: '#5b4bff', track: '#e8e5ff', bar: '#d9d6ce', chip: '#ecebe5', soft: '#eef0ff' };
const F = (wt, px) => `${wt} ${px}px Archivo, system-ui, sans-serif`;
function rr(g, x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); }
function circle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function txt(g, s, x, y, font, color, align = 'left') { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
function ring(g, x, y, r, lw, p, track = A.track, col = A.accent) {
  g.lineCap = 'round'; g.lineWidth = lw;
  g.strokeStyle = track; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = col; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke();
}
function route(g, x, y, s) {
  g.strokeStyle = A.accent; g.lineWidth = 2.6 * s; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(x + 10 * s, y + 38 * s); g.bezierCurveTo(x + 4 * s, y + 18 * s, x + 26 * s, y + 30 * s, x + 24 * s, y + 14 * s); g.bezierCurveTo(x + 22 * s, y + 4 * s, x + 44 * s, y + 8 * s, x + 42 * s, y + 24 * s); g.stroke();
  circle(g, x + 42 * s, y + 24 * s, 3.4 * s, A.accent);
}
function bars(g, x, y, w, h, vals, today, labels = 'MTWTFSS') {
  const step = w / vals.length, bw = Math.min(22, step * 0.55);
  vals.forEach((v, i) => {
    const bh = Math.max(6, h * v), cx = x + step * (i + 0.5);
    rr(g, cx - bw / 2, y + h - bh, bw, bh, Math.min(8, bw / 2), i === today ? A.accent : A.bar);
    if (labels) txt(g, labels[i % labels.length], cx, y + h + 20, F(500, 11), A.muted, 'center');
  });
}
function battery(g, x, y) {
  g.strokeStyle = 'rgba(16,17,20,.38)'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(x, y, 26, 12.5, 4); g.stroke();
  rr(g, x + 2, y + 2, 19, 8.5, 2.5, A.ink); rr(g, x + 27.5, y + 4, 2, 4.5, 1, 'rgba(16,17,20,.38)');
}
function iosStatus(g) {
  txt(g, '9:41', 38, 35, F(650, 17), A.ink);
  for (let i = 0; i < 4; i++) rr(g, 298 + i * 6, 34 - (4 + i * 2.6), 4, 4 + i * 2.6, 1, A.ink);
  g.strokeStyle = A.ink; g.lineWidth = 2.2; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(333, 35, 3 + i * 4, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
  battery(g, 349, 24);
}
function androidStatus(g, W) {
  txt(g, '9:41', 30, 38, F(550, 15), A.ink);
  g.fillStyle = A.ink; g.beginPath(); g.moveTo(W - 78, 38); g.lineTo(W - 62, 38); g.lineTo(W - 62, 24); g.closePath(); g.fill();
  rr(g, W - 50, 24, 8, 15, 2, A.ink); rr(g, W - 47, 22, 2, 2, 1, A.ink);
}
function tabIcon(g, k, cx, cy, col) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (k === 0) { g.arc(cx, cy, 10, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, 10, -Math.PI / 2, Math.PI * 0.9); g.lineWidth = 4; g.stroke(); }
  else if (k === 1) { g.moveTo(cx - 12, cy); g.lineTo(cx - 5, cy); g.lineTo(cx - 1, cy - 8); g.lineTo(cx + 4, cy + 8); g.lineTo(cx + 7, cy); g.lineTo(cx + 12, cy); g.stroke(); }
  else if (k === 2) { g.roundRect(cx - 10, cy - 9, 20, 19, 4); g.stroke(); g.beginPath(); g.moveTo(cx - 10, cy - 3); g.lineTo(cx + 10, cy - 3); g.stroke(); }
  else { g.arc(cx, cy - 4, 5, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy + 12, 10, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); }
}

function drawPhone(g, w, h, os = 'ios') {
  const u = w / 402, W = 402, H = h / u;
  g.save(); g.scale(u, u);
  g.fillStyle = A.bg; g.fillRect(0, 0, W, H);
  if (os === 'ios') iosStatus(g); else androidStatus(g, W);
  circle(g, 40, 88, 18, '#dcd7ff'); txt(g, 'A', 40, 94, F(700, 16), A.accent, 'center');
  txt(g, 'Today', 201, 94, F(650, 17), A.ink, 'center');
  circle(g, 362, 88, 18, A.chip); rr(g, 356, 80, 12, 12, 5, A.ink); rr(g, 354, 90, 16, 3, 1.5, A.ink); circle(g, 362, 96, 2.2, A.ink);
  txt(g, 'Good morning, Ana', 20, 150, F(760, 30), A.ink);
  txt(g, 'Tuesday, 26 September', 20, 176, F(450, 15), A.muted);
  rr(g, 16, 196, 370, 300, 28, A.card);
  ring(g, 201, 322, 88, 20, 0.78);
  txt(g, '6.2', 201, 336, F(780, 46), A.ink, 'center');
  txt(g, 'of 8 km today', 201, 362, F(450, 14), A.muted, 'center');
  [['24:40', 'time'], ['4′33″', 'pace'], ['412', 'kcal']].forEach(([v, l], i) => {
    const x = 76 + i * 125; txt(g, v, x, 452, F(700, 18), A.ink, 'center'); txt(g, l, x, 472, F(450, 12), A.muted, 'center');
  });
  rr(g, 16, 508, 370, 150, 24, A.card);
  txt(g, 'This week', 36, 540, F(650, 15), A.ink); txt(g, '31.4 km', 366, 540, F(650, 15), A.accent, 'right');
  bars(g, 36, 560, 330, 64, [0.45, 0.7, 0.3, 0.85, 0.55, 0.95, 0.18], 5);
  const runs = [['Riverside loop', '5.4 km · 24:40 · Sunday'], ['Hill repeats', '7.1 km · 36:02 · Friday'], ['Easy shakeout', '3.2 km · 17:15 · Thursday'], ['Long run', '14.8 km · 1:12:40 · Tuesday']];
  const tb = H - 98;
  let y = 670;
  for (let i = 0; y + 84 <= tb + 60 && i < runs.length; i++, y += 94) {
    rr(g, 16, y, 370, 84, 22, A.card);
    rr(g, 32, y + 16, 52, 52, 14, A.soft); route(g, 36, y + 20, 1);
    txt(g, runs[i][0], 98, y + 37, F(650, 16), A.ink); txt(g, runs[i][1], 98, y + 59, F(450, 13), A.muted);
    txt(g, '›', 362, y + 50, F(400, 26), '#b6b8be', 'center');
  }
  g.fillStyle = 'rgba(255,255,255,.97)'; g.fillRect(0, tb, W, 98);
  g.fillStyle = A.line; g.fillRect(0, tb, W, 1);
  ['Today', 'Runs', 'Plans', 'You'].forEach((t, k) => {
    const cx = (W / 8) * (2 * k + 1), col = k === 0 ? A.accent : A.muted;
    tabIcon(g, k, cx, tb + 24, col);
    txt(g, t, cx, tb + 54, F(550, 11), col, 'center');
  });
  rr(g, W / 2 - 67, H - 13, (os === 'ios' ? 134 : 108), 5, 3, A.ink);
  g.restore();
}

// Wide layouts: a MacBook (menu bar, `top` = notch-height menu bar) or an iPad in landscape (status bar).
function drawWide(g, w, h, { top = 24, mode = 'mac' } = {}) {
  const u = w / 1440, W = 1440, H = h / u, m = top / u;
  g.save(); g.scale(u, u);
  g.fillStyle = A.bg; g.fillRect(0, 0, W, H);
  if (mode === 'mac') {
    g.fillStyle = '#e8e6e1'; g.fillRect(0, 0, W, m);
    txt(g, 'Stride', 22, m / 2 + 5, F(760, 14), A.ink);
    ['File', 'Edit', 'View', 'Window', 'Help'].forEach((t, i) => txt(g, t, 96 + i * 66, m / 2 + 5, F(500, 13.5), A.ink));
    txt(g, 'Tue 26 Sep  9:41', W - 22, m / 2 + 5, F(550, 13.5), A.ink, 'right');
  } else {
    txt(g, '9:41  Tue 26 Sep', 30, m / 2 + 7, F(600, 16), A.ink);
    battery(g, W - 62, m / 2 - 4);
  }
  const y0 = m;
  g.fillStyle = '#ebe9e4'; g.fillRect(0, y0, 240, H - y0);
  txt(g, 'Stride', 30, y0 + 56, F(820, 26), A.ink);
  ['Today', 'Runs', 'Plans', 'Routes', 'Shoes', 'Settings'].forEach((t, k) => {
    if (k === 0) rr(g, 16, y0 + 90 + k * 44, 208, 36, 10, A.card);
    txt(g, t, 34, y0 + 114 + k * 44, F(k === 0 ? 650 : 450, 15), k === 0 ? A.ink : A.muted);
  });
  const x0 = 280, cw = W - x0 - 40;
  txt(g, 'Good morning, Ana', x0, y0 + 78, F(760, 42), A.ink);
  txt(g, 'Tuesday, 26 September · 12-day streak', x0, y0 + 108, F(450, 16), A.muted);
  const sw = (cw - 60) / 4;
  [['This week', '31.4 km'], ['Avg pace', '4′41″'], ['Streak', '12 days'], ['Next up', 'Tempo 6 km']].forEach(([k, v], i) => {
    const x = x0 + i * (sw + 20); rr(g, x, y0 + 134, sw, 108, 18, A.card);
    txt(g, k, x + 22, y0 + 170, F(450, 14), A.muted); txt(g, v, x + 22, y0 + 216, F(740, 32), i === 0 ? A.accent : A.ink);
  });
  const ch = Math.min(430, Math.max(260, H - y0 - 262 - 40));
  rr(g, x0, y0 + 262, 380, ch, 22, A.card);
  const rc = Math.min(120, ch / 2 - 60);
  ring(g, x0 + 190, y0 + 262 + ch / 2 - 10, rc, 24, 0.78);
  txt(g, '6.2', x0 + 190, y0 + 262 + ch / 2 + 6, F(780, 52), A.ink, 'center');
  txt(g, 'of 8 km today', x0 + 190, y0 + 262 + ch / 2 + 34, F(450, 15), A.muted, 'center');
  const bx = x0 + 400, bwid = W - 40 - bx;
  rr(g, bx, y0 + 262, bwid, ch, 22, A.card);
  txt(g, 'Distance, last 14 days', bx + 28, y0 + 302, F(650, 17), A.ink); txt(g, '58.9 km', bx + bwid - 28, y0 + 302, F(650, 17), A.accent, 'right');
  bars(g, bx + 28, y0 + 330, bwid - 56, ch - 110, [0.4, 0.62, 0.2, 0.75, 0.5, 0.9, 0.15, 0.45, 0.7, 0.3, 0.85, 0.55, 0.95, 0.18], 12, 'MTWTFSS');
  g.restore();
}

function drawWatch(g, w, h) {
  const u = w / 211, W = 211, H = h / u;
  g.save(); g.scale(u, u);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  txt(g, 'Stride', 26, 36, F(700, 15), '#a9a1ff');
  txt(g, '9:41', W - 24, 36, F(650, 15), '#fff', 'right');
  ring(g, W / 2, 124, 58, 15, 0.78, '#2a2560', '#7b6dff');
  txt(g, '6.2', W / 2, 134, F(780, 36), '#fff', 'center');
  txt(g, 'KM', W / 2, 154, F(650, 11), '#9a9da5', 'center');
  txt(g, '4′33″', 44, 218, F(700, 17), '#fff', 'center'); txt(g, 'PACE', 44, 234, F(600, 9.5), '#8a8d94', 'center');
  txt(g, '24:40', W / 2, 218, F(700, 17), '#fff', 'center'); txt(g, 'TIME', W / 2, 234, F(600, 9.5), '#8a8d94', 'center');
  txt(g, '152', W - 44, 218, F(700, 17), '#ff6b7f', 'center'); txt(g, 'BPM', W - 44, 234, F(600, 9.5), '#8a8d94', 'center');
  g.restore();
}

function render(w, h, scale, draw) {
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale);
  draw(g, w, h);
  return new Promise((res) => c.toBlob((b) => res({ url: URL.createObjectURL(b), w: c.width, h: c.height }), 'image/png'));
}

// ─── the cast ───────────────────────────────────────────────────────────────
// box: where the element sits inside the device area (fractions: top, right, bottom, left).
const CAST = [
  { key: 'iphone', id: 'iphone-17-pro', color: 'cosmic-orange', attrs: {}, box: [0, 0, 0, 0], shot: (d) => render(d.screen.w, d.screen.h, 3, (g, w, h) => drawPhone(g, w, h, 'ios')) },
  { key: 'pixel', id: 'pixel-10-pro', color: 'porcelain', attrs: {}, box: [0.02, 0, 0, 0], shot: (d) => render(d.screen.w, d.screen.h, 2.5, (g, w, h) => drawPhone(g, w, h, 'android')) },
  { key: 'ipad', id: 'ipad-pro-11', color: 'silver', attrs: { orientation: 'landscape' }, box: [0.1, 0, 0.08, 0], shot: (d) => render(d.screen.h, d.screen.w, 1.5, (g, w, h) => drawWide(g, w, h, { mode: 'ipad', top: 24 })) },
  { key: 'mac', id: 'macbook-pro-14', color: null, attrs: { variant: 'deck' }, box: [0.08, 0, 0.04, 0], shot: (d) => render(d.screen.w, d.screen.h, 1.2, (g, w, h) => drawWide(g, w, h, { mode: 'mac', top: d.safe?.top ?? 24 })) },
  { key: 'watch', id: 'apple-watch-ultra', color: null, attrs: {}, box: [0.2, 0.2, 0.2, 0.2], shot: (d) => render(d.screen.w, d.screen.h, 2, drawWatch) },
];
for (const c of CAST) c.d = getDevice(c.id);

const codeTokens = (c) => [['p', '<'], ['t', 'bezel-device'], ...[['device', c.id], ...Object.entries(c.attrs)].flatMap(([k, v]) => [['', ' '], ['a', k], ['p', '="'], ['s', v], ['p', '"']]), ['p', '>']];
const codeChars = (c) => codeTokens(c).flatMap(([cls, s]) => [...s].map((ch) => [cls, ch]));
const codeHTML = (chars) => {
  let out = '', cur = null;
  for (const [cls, ch] of chars) {
    if (cls !== cur) { if (cur !== null) out += '</span>'; out += `<span class="c-${cls || 'w'}">`; cur = cls; }
    out += esc(ch);
  }
  return cur === null ? '' : out + '</span>';
};
const dims = (d, land) => (land ? [d.screen.h, d.screen.w] : [d.screen.w, d.screen.h]);

// ─── DOM ────────────────────────────────────────────────────────────────────
const count = listDevices().length;
const devTag = (c) => `<bezel-device device="${c.id}"${c.color ? ` color="${c.color}"` : ''}${Object.entries(c.attrs).map(([k, v]) => ` ${k}="${v}"`).join('')} alt="The Stride app in a ${c.d.name}${c.attrs.orientation ? ', landscape' : ''}"></bezel-device>`;
const dimHTML = (w, h, unit = '') => `<div class="hx-dim"><div class="d-top"><i></i><span>${w}${unit}</span></div><div class="d-side"><i></i><span>${h}${unit}</span></div></div>`;

hero.innerHTML = `
<div class="hx${RM ? ' hx-rm' : ''}">
  <div class="hx-copy">
    <p class="hx-kick"><i></i>&lt;bezel-device&gt; · <span class="hx-os">open source · </span>zero dependencies</p>
    <h1 class="hx-title" id="heroTitle" data-v="${new URLSearchParams(location.search).get('h') || 'a'}"><span class="l1">Screenshot in.</span><span class="l2">Mockup out.</span></h1>
    <p class="hx-sub">Drop a screenshot into any phone, tablet, laptop or watch. It fits perfectly. One HTML tag, ${count} devices, free.</p>
    <div class="hx-actions">
      <a class="hx-btn hx-primary" href="#play">Try it with your screenshot<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
      <button class="hx-btn hx-ai" type="button" aria-label="Copy a prompt for your AI assistant"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c.4 2.9 1.6 4.1 4.5 4.5-2.9.4-4.1 1.6-4.5 4.5-.4-2.9-1.6-4.1-4.5-4.5 2.9-.4 4.1-1.6 4.5-4.5zM12.6 10.2c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2z" fill="currentColor"/></svg><span class="hx-ai-t">Copy prompt for your AI</span></button>
    </div>
    <p class="hx-star">Paste it into Claude, ChatGPT or Cursor · <a href="https://github.com/knileshh/bezelkit">★ Star on GitHub</a></p>
  </div>
  <div class="hx-stage" role="img" aria-label="A running-app screenshot is squashed and covered by a generic mockup's notch, then fitted correctly into a real iPhone 17 Pro frame, then shown in a Pixel 10 Pro, an iPad Pro in landscape, a MacBook Pro and an Apple Watch Ultra.">
    <div class="hx-glow" aria-hidden="true"><i class="g-bad"></i><i class="g-ok"></i></div>
    <div class="hx-area" aria-hidden="true">
      ${CAST.map((c) => {
        const [w, h] = dims(c.d, c.attrs.orientation === 'landscape');
        const b = c.box.map((v) => `${v * 100}%`);
        return `<div class="hx-shot" data-k="${c.key}"><div class="hx-box" style="inset:${b[0]} ${b[1]} ${b[2]} ${b[3]}">${devTag(c)}</div>${dimHTML(w, h)}${c.key === 'iphone' ? `
          <div class="hx-fake">
            ${dimHTML('1206', '2622', ' px').replace('hx-dim', 'hx-dim hx-cdim')}
            <div class="hx-mbody"></div>
            <div class="hx-card"><div class="hx-cshadow"></div><div class="hx-win"><img class="hx-img" alt=""></div></div>
            <div class="hx-notch"></div>
          </div>
          <div class="hx-tag bad" data-t="squash"><b><em>✕</em>Squashed</b><span>forced into a 9:16 screen</span></div><i class="hx-lead bad" data-t="squash"></i>
          <div class="hx-tag bad" data-t="notch"><b><em>✕</em>Notch over the header</b><span>cropped, then covered</span></div><i class="hx-lead bad" data-t="notch"></i>
          <div class="hx-tag ok" data-t="ok"><b><em>✓</em><code>fit="auto" → <span class="hx-okfit">cover</span></code></b><span>same shape, header clear</span></div><i class="hx-lead ok" data-t="ok"></i>` : ''}</div>`;
// ─── headline: size it so "Screenshot in." fills the text column on one line ───
{
  const title = document.getElementById('heroTitle'), col = title?.parentElement;
  const fit = () => {
    if (!title || !col) return;
    title.style.fontSize = '100px';
    const w = Math.max(...[...title.children].map((l) => l.getBoundingClientRect().width));
    const max = innerWidth < 760 ? 92 : 170;
    title.style.fontSize = `${Math.min(max, Math.floor((col.clientWidth / w) * 100 * 0.98))}px`;
  };
  fit();
  document.fonts?.ready.then(fit);
  new ResizeObserver(fit).observe(col);
}

      }).join('')}
    </div>
    <div class="hx-foot" aria-hidden="true">
      <div class="hx-caps">
        <p class="hx-cap" data-c="file"><b>screenshot.png</b><span>1206 × 2622 px</span></p>
        <p class="hx-cap bad" data-c="mock"><b>A typical mockup</b><span>generic 9:16 screen</span></p>
        ${CAST.map((c) => { const [w, h] = dims(c.d, c.attrs.orientation === 'landscape'); return `<p class="hx-cap" data-c="${c.key}"><b>${c.d.name.replace(/\s*\(.*\)$/, '')}${c.attrs.orientation ? ' · landscape' : ''}</b><span>${w} × ${h} · fit → <em data-fit="${c.key}">cover</em></span></p>`; }).join('')}
      </div>
      <div class="hx-code"><code></code><i class="hx-caret"></i></div>
    </div>
  </div>
</div>`;

const $ = (s, r = hero) => r.querySelector(s);
const $$ = (s, r = hero) => [...r.querySelectorAll(s)];
const stage = $('.hx-stage'), area = $('.hx-area'), code = $('.hx-code code');
const shotEl = (k) => $(`.hx-shot[data-k="${k}"]`);
const devEl = (k) => $(`.hx-shot[data-k="${k}"] bezel-device`);
const cap = (k) => $(`.hx-cap[data-c="${k}"]`);
const tag = (t) => $$(`[data-t="${t}"]`);

// copy a ready-made prompt for AI assistants
const AI_PROMPT = `Add device mockups to my project with bezelkit (https://bezelkit.dev).
First read https://bezelkit.dev/llms-full.txt and follow its "Rules for assistants".
For each screenshot, pick the device whose native pixel size matches, keep fit="auto", set alt text, and load the component once (the CDN script for plain HTML, or npm i bezelkit if the project uses a bundler).

My screenshots / page: `;
const ai = $('.hx-ai'), aiT = $('.hx-ai-t');
ai.addEventListener('click', async () => {
  const ok = await navigator.clipboard?.writeText(AI_PROMPT).then(() => true, () => false);
  ai.classList.add('done');
  if (!ok) window.prompt('Copy this prompt for your AI assistant:', AI_PROMPT);
  aiT.textContent = ok ? 'Copied. Paste it into your AI' : 'Copy prompt for your AI';
  clearTimeout(ai.t); ai.t = setTimeout(() => { ai.classList.remove('done'); aiT.textContent = 'Copy prompt for your AI'; }, 2200);
});

// real fit results, straight from the component
for (const c of CAST) devEl(c.key).addEventListener('bezel-fit', (e) => {
  $$(`[data-fit="${c.key}"]`).forEach((n) => (n.textContent = e.detail.fit));
  if (c.key === 'iphone') $('.hx-okfit').textContent = e.detail.fit;
});

// ─── geometry: measure each real frame, then place the fake mockup, dims and tags from it ───
const STD = 16 / 9;
let geo = null;
function measure() {
  const a = area.getBoundingClientRect();
  if (!a.width || !a.height) return;
  const rel = (n) => { const r = n.getBoundingClientRect(); return { x: r.left - a.left, y: r.top - a.top, w: r.width, h: r.height }; };
  const px = (v) => `${v.toFixed(2)}px`;
  for (const c of CAST) {
    const el = shotEl(c.key), dev = devEl(c.key), R = dev.shadowRoot;
    const scrN = R?.querySelector('.screen'), devN = R?.querySelector('.device');
    if (!scrN || !devN) return;
    const prev = el.style.transform; el.style.transform = 'none';
    const s = rel(scrN), d = rel(devN);
    el.style.transform = prev;
    if (!s.w) return;
    const dim = $('.hx-dim:not(.hx-cdim)', el);
    place(dim, s, d);
    if (c.key === 'iphone') geo = { s, d, k: s.w / c.d.screen.w, aw: a.width, ah: a.height };
  }
  const { s, d, k } = geo, f = $('.hx-fake');
  const nh = s.w * STD, dy = (s.h - nh) / 2, bz = 16 * k;
  const set = (o) => Object.entries(o).forEach(([n, v]) => f.style.setProperty(`--${n}`, typeof v === 'number' ? px(v) : v));
  set({ sx: s.x, sy: s.y, sw: s.w, sh: s.h, dy, k: String(k), bx: s.x - bz, by: s.y + dy - bz, bw: s.w + 2 * bz, bh: nh + 2 * bz, nx: s.x + s.w / 2 - 78 * k, ny: s.y + dy, nw: 156 * k, nhh: 31 * k });
  place($('.hx-cdim'), s, s);
  // tags: to the left of the device (using the empty column gap) with a leader into the problem,
  // or over the screen when the stage is stacked under the copy
  const st = stage.getBoundingClientRect(), copy = $('.hx-copy');
  let copyRight = -Infinity;
  for (const n of [...copy.children].filter((n) => !n.matches('.hx-actions'))) { // tags sit above the buttons
    const r = document.createRange(); r.selectNodeContents(n);
    copyRight = Math.max(copyRight, r.getBoundingClientRect().right);
  }
  const side = copyRight < st.left; // copy sits beside the stage, not above it
  const leftLimit = (side ? copyRight + 28 : st.left + 4) - a.left;
  const room = d.x - 18 - leftLimit;
  const wide = room >= 210;
  stage.classList.toggle('hx-narrow', !wide);
  const q = nh / s.h, cy = s.y + s.h / 2;
  const pts = {
    squash: [s.x + 104 * k, cy + (s.y + 322 * k - cy) * q],
    notch: [s.x + s.w / 2 - 78 * k, s.y + dy + 15 * k],
    ok: [s.x + 160 * k, s.y + 88 * k],
  };
  for (const [t, [x, y]] of Object.entries(pts)) {
    const [tg, ld] = tag(t);
    if (wide) {
      Object.assign(tg.style, { left: '', right: px(a.width - (d.x - 18)), top: px(y), bottom: '', maxWidth: px(Math.min(300, room)) });
      Object.assign(ld.style, { left: px(d.x - 18), top: px(y), width: px(x - (d.x - 18)) });
    } else {
      const ty = t === 'squash' ? s.y + s.h * 0.62 : t === 'notch' ? s.y + dy + 130 * k : s.y + s.h * 0.62;
      Object.assign(tg.style, { right: '', left: px(s.x + s.w / 2), top: px(ty), bottom: '', maxWidth: px(a.width + 40) });
    }
  }
}
function place(dim, s, d) {
  const gap = Math.max(10, Math.min(18, d.w * 0.05));
  const top = $('.d-top', dim), side = $('.d-side', dim);
  Object.assign(top.style, { left: `${s.x}px`, top: `${d.y - gap}px`, width: `${s.w}px`, height: `${s.y - d.y + gap}px` });
  Object.assign(side.style, { left: `${s.x + s.w}px`, top: `${s.y}px`, width: `${d.x + d.w - s.x - s.w + gap}px`, height: `${s.h}px` });
}
let mq = 0;
const remeasure = () => { cancelAnimationFrame(mq); mq = requestAnimationFrame(() => requestAnimationFrame(measure)); };
const ro = new ResizeObserver(remeasure);
ro.observe(area);
CAST.forEach((c) => ro.observe(devEl(c.key)));

// ─── screenshots (rendered once), then the timeline ────────────────────────
await Promise.race([Promise.all(['780 30px Archivo', '650 15px Archivo', '450 15px Archivo'].map((f) => document.fonts.load(f))), sleep(2500)]).catch(() => {});
const shots = await Promise.all(CAST.map((c) => c.shot(c.d)));
CAST.forEach((c, i) => devEl(c.key).setAttribute('src', shots[i].url));
$('.hx-img').src = shots[0].url;
remeasure();

let gsap = null;
if (!RM) gsap = await import(GSAP_URL).then((m) => m.gsap || m.default).catch((err) => { console.warn('bezelkit: GSAP failed to load; showing the static hero.', err); return null; });
if (!gsap) staticComposition();
else build(gsap);

function staticComposition() {
  hero.querySelector('.hx').classList.add('hx-still');
  code.innerHTML = codeHTML(codeChars(CAST[0]));
  // a small row of the other frames under the phone
  const row = document.createElement('div');
  row.className = 'hx-row';
  row.setAttribute('aria-hidden', 'true');
  row.innerHTML = CAST.slice(1).map((c) => { const [w, h] = dims(c.d, c.attrs.orientation === 'landscape'); return `<figure data-k="${c.key}"><div>${devTag(c)}</div><figcaption>${w} × ${h}</figcaption></figure>`; }).join('');
  row.querySelectorAll('bezel-device').forEach((el, i) => el.setAttribute('src', shots[i + 1].url));
  stage.append(row);
  remeasure();
}

function build(gsap) {
  const q = STD / (874 / 402); // 9:16 height ÷ real height = 0.818
  const fake = $('.hx-fake'), card = $('.hx-card'), cshadow = $('.hx-cshadow'), win = $('.hx-win'), img = $('.hx-img'), body = $('.hx-mbody'), notch = $('.hx-notch'), cdim = $('.hx-cdim');
  const iphone = devEl('iphone'), glowBad = $('.g-bad'), glowOk = $('.g-ok'), chip = $('.hx-code');
  const shots = CAST.map((c) => shotEl(c.key));
  const dimsOf = (k) => $('.hx-dim:not(.hx-cdim)', shotEl(k));
  const tl = gsap.timeline({ repeat: -1, defaults: { ease: 'power3.out', duration: 0.5 } });
  window.__heroTL = tl;

  // one caption/tag in, one out
  const show = (els, at, d = 0.35) => tl.fromTo(els, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: d, immediateRender: false }, at);
  const hide = (els, at, d = 0.25) => tl.to(els, { autoAlpha: 0, y: -4, duration: d, ease: 'power2.in' }, at);
  const lead = (t, at) => {
    const [tg, ld] = tag(t);
    tl.fromTo(ld, { scaleX: 0, autoAlpha: 1 }, { scaleX: 1, autoAlpha: 1, duration: 0.35, ease: 'power2.inOut', immediateRender: false }, at);
    tl.fromTo(tg, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.35, immediateRender: false }, at + 0.15);
  };
  const unlead = (t, at) => tl.to(tag(t), { autoAlpha: 0, duration: 0.2, ease: 'power1.in' }, at);
  const dimIn = (el, at) => {
    tl.fromTo($$('.d-top i, .d-side i', el), { scale: 0 }, { scale: 1, duration: 0.45, ease: 'power2.inOut', immediateRender: false }, at);
    tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, at);
    tl.fromTo($$('span', el), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, immediateRender: false }, at + 0.25);
  };
  let typed = null;
  const type = (to, at, cps = 44) => {
    const from = typed ? codeChars(typed) : [], dest = codeChars(to);
    let p = 0;
    while (p < from.length && p < dest.length && from[p][1] === dest[p][1]) p++;
    const del = from.length - p, add = dest.length - p, dur = del / 110 + add / cps, o = { t: 0 };
    tl.fromTo(o, { t: 0 }, {
      t: 1, duration: dur, ease: 'none', immediateRender: false,
      onUpdate() {
        const n = o.t * (del + add);
        code.innerHTML = codeHTML(n < del ? from.slice(0, from.length - Math.floor(n)) : dest.slice(0, p + Math.floor(n - del)));
      },
    }, at);
    typed = to;
    return dur;
  };

  // t = 0: reset
  tl.set([...shots.slice(1), ...$$('.hx-cap'), ...$$('.hx-tag'), ...$$('.hx-dim'), chip], { autoAlpha: 0 }, 0)
    .set($$('.hx-lead'), { scaleX: 0, autoAlpha: 0 }, 0)
    .set(shots, { x: 0, scale: 1 }, 0)
    .set(shots[0], { autoAlpha: 1 }, 0)
    .set(iphone, { autoAlpha: 0 }, 0)
    .set(fake, { autoAlpha: 1 }, 0)
    .set(win, { '--c': 0, '--r': 12, autoAlpha: 1 }, 0)
    .set(card, { autoAlpha: 0 }, 0)
    .set(cshadow, { autoAlpha: 1 }, 0)
    .set(img, { scaleY: 1 }, 0)
    .set([body, notch], { autoAlpha: 0 }, 0)
    .set(notch, { yPercent: -110 }, 0)
    .set([glowBad, glowOk], { autoAlpha: 0 }, 0)
    .add(() => (code.innerHTML = ''), 0);

  // 1 · the screenshot drops onto the stage
  tl.fromTo(card, { y: -46, rotation: -2.5, scale: 1.04, autoAlpha: 0 }, { y: 0, rotation: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: 'back.out(1.25)', immediateRender: false }, 0.1);
  dimIn(cdim, 0.55);
  show(cap('file'), 0.5);

  // 2 · a typical mockup closes around it and breaks it
  const M = 1.6;
  hide(cdim, M - 0.2, 0.2);
  hide(cap('file'), M - 0.1, 0.2);
  tl.fromTo(body, { autoAlpha: 0, scale: 1.14 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power4.out', immediateRender: false }, M);
  tl.to(win, { '--c': 1, '--r': 30, duration: 0.55, ease: 'power3.inOut' }, M + 0.05);
  tl.to(img, { scaleY: q, duration: 0.55, ease: 'power3.inOut' }, M + 0.05);
  tl.to(glowBad, { autoAlpha: 1, duration: 0.6 }, M);
  tl.to(cshadow, { autoAlpha: 0, duration: 0.3 }, M);
  show(cap('mock'), M + 0.2);
  lead('squash', M + 0.55);
  // …then crops to fill and drops a notch on the header
  const N = M + 1.95;
  unlead('squash', N - 0.1);
  tl.to(img, { scaleY: 1, duration: 0.45, ease: 'power2.inOut' }, N);
  tl.fromTo(notch, { autoAlpha: 1, yPercent: -110 }, { yPercent: 0, duration: 0.4, ease: 'back.out(2.2)', immediateRender: false }, N + 0.3);
  lead('notch', N + 0.5);

  // 3 · snap into a real iPhone 17 Pro
  const S = N + 1.95;
  unlead('notch', S - 0.1);
  hide(cap('mock'), S - 0.1, 0.2);
  tl.to(notch, { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: 'power2.in' }, S);
  tl.to(body, { autoAlpha: 0, scale: 1.06, duration: 0.4, ease: 'power2.in' }, S);
  tl.to(win, { '--c': 0, '--r': 62, duration: 0.55, ease: 'expo.out' }, S + 0.05);
  tl.fromTo(iphone, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, S + 0.1);
  tl.fromTo(shots[0], { scale: 0.975 }, { scale: 1, duration: 0.7, ease: 'back.out(3)', immediateRender: false }, S + 0.15);
  tl.to(win, { autoAlpha: 0, duration: 0.3, ease: 'power1.inOut' }, S + 0.45);
  tl.to(glowBad, { autoAlpha: 0, duration: 0.6 }, S);
  tl.to(glowOk, { autoAlpha: 1, duration: 0.8 }, S + 0.1);
  lead('ok', S + 0.45);
  dimIn(dimsOf('iphone'), S + 0.5);
  show(cap('iphone'), S + 0.35);
  tl.fromTo(chip, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.35, immediateRender: false }, S + 0.4);
  type(CAST[0], S + 0.4, 40);

  // 4 · the same app, through other real frames
  let t = S + 2.1;
  for (let i = 1; i < CAST.length; i++) {
    const prev = CAST[i - 1].key, c = CAST[i];
    if (i === 1) unlead('ok', t - 0.15);
    tl.to(shots[i - 1], { autoAlpha: 0, x: -36, scale: 0.97, duration: 0.4, ease: 'power2.in' }, t);
    hide(cap(prev), t, 0.2);
    tl.fromTo(shots[i], { autoAlpha: 0, x: 44, scale: 0.97 }, { autoAlpha: 1, x: 0, scale: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, t + 0.25);
    dimIn(dimsOf(c.key), t + 0.55);
    show(cap(c.key), t + 0.35);
    type(c, t + 0.1);
    t += c.key === 'mac' ? 1.45 : 1.3;
  }
  // out, and loop
  const last = CAST[CAST.length - 1].key;
  tl.to(shots[CAST.length - 1], { autoAlpha: 0, scale: 0.96, duration: 0.4, ease: 'power2.in' }, t);
  hide([cap(last), chip], t, 0.3);
  tl.to(glowOk, { autoAlpha: 0, duration: 0.4 }, t);
  tl.set({}, {}, t + 0.6);

  // play only while the hero is on screen and the tab is visible
  let inView = true;
  const sync = () => (inView && !document.hidden ? tl.resume() : tl.pause());
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; hero.classList.toggle('hx-off', !inView); sync(); }, { threshold: 0.05 }).observe(hero);
  document.addEventListener('visibilitychange', sync);
}

