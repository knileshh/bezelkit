import { listDevices, getDevice } from '../src/bezel.js';

const RM = document.documentElement.classList.contains('rm');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── sample screenshots, drawn on canvas (no image assets) ───────────────────
const A = { bg: '#f3f2ee', card: '#ffffff', ink: '#101114', muted: '#7b7e86', line: '#e3e1db', accent: '#5b4bff', track: '#e8e5ff', bar: '#d9d6ce', chip: '#ecebe5', soft: '#eef0ff' };
const F = (wt, px) => `${wt} ${px}px Archivo, system-ui, sans-serif`;
function rr(g, x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); }
function circle(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill(); }
function txt(g, s, x, y, font, color, align = 'left') { g.font = font; g.fillStyle = color; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left'; }
function ring(g, x, y, r, lw, p) {
  g.lineCap = 'round'; g.lineWidth = lw;
  g.strokeStyle = A.track; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = A.accent; g.beginPath(); g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); g.stroke();
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
function iosStatus(g, W) {
  txt(g, '9:41', 38, 35, F(650, 17), A.ink);
  for (let i = 0; i < 4; i++) rr(g, 298 + i * 6, 34 - (4 + i * 2.6), 4, 4 + i * 2.6, 1, A.ink);
  g.strokeStyle = A.ink; g.lineWidth = 2.2; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(333, 35, 3 + i * 4, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke(); }
  g.strokeStyle = 'rgba(16,17,20,.38)'; g.lineWidth = 1.2; g.beginPath(); g.roundRect(349, 24, 26, 12.5, 4); g.stroke();
  rr(g, 351, 26, 19, 8.5, 2.5, A.ink); rr(g, 376.5, 28, 2, 4.5, 1, 'rgba(16,17,20,.38)');
}
function tabIcon(g, k, cx, cy, col) {
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (k === 0) { g.arc(cx, cy, 10, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy, 10, -Math.PI / 2, Math.PI * 0.9); g.lineWidth = 4; g.stroke(); }
  else if (k === 1) { g.moveTo(cx - 12, cy); g.lineTo(cx - 5, cy); g.lineTo(cx - 1, cy - 8); g.lineTo(cx + 4, cy + 8); g.lineTo(cx + 7, cy); g.lineTo(cx + 12, cy); g.stroke(); }
  else if (k === 2) { g.roundRect(cx - 10, cy - 9, 20, 19, 4); g.stroke(); g.beginPath(); g.moveTo(cx - 10, cy - 3); g.lineTo(cx + 10, cy - 3); g.stroke(); }
  else { g.arc(cx, cy - 4, 5, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(cx, cy + 12, 10, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke(); }
}

function drawPhone(g, w, h) {
  const u = w / 402, W = 402, H = h / u;
  g.save(); g.scale(u, u);
  g.fillStyle = A.bg; g.fillRect(0, 0, W, H);
  iosStatus(g, W);
  // header row: sits right where a painted-on notch lands after a crop
  circle(g, 40, 88, 18, '#dcd7ff'); txt(g, 'A', 40, 94, F(700, 16), A.accent, 'center');
  txt(g, 'Today', 201, 94, F(650, 17), A.ink, 'center');
  circle(g, 362, 88, 18, A.chip); rr(g, 356, 80, 12, 12, 5, A.ink); rr(g, 354, 90, 16, 3, 1.5, A.ink); circle(g, 362, 96, 2.2, A.ink);
  txt(g, 'Good morning, Ana', 20, 150, F(760, 30), A.ink);
  txt(g, 'Tuesday, 26 September', 20, 176, F(450, 15), A.muted);
  // the ring: circles make squashing obvious
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
  // tab bar pinned to the bottom edge, so a crop is easy to see
  g.fillStyle = 'rgba(255,255,255,.97)'; g.fillRect(0, tb, W, 98);
  g.fillStyle = A.line; g.fillRect(0, tb, W, 1);
  ['Today', 'Runs', 'Plans', 'You'].forEach((t, k) => {
    const cx = (W / 8) * (2 * k + 1), col = k === 0 ? A.accent : A.muted;
    tabIcon(g, k, cx, tb + 24, col);
    txt(g, t, cx, tb + 54, F(550, 11), col, 'center');
  });
  rr(g, W / 2 - 67, H - 13, 134, 5, 3, A.ink);
  g.restore();
}

function drawTablet(g, w, h) {
  const u = w / 834, W = 834, H = h / u;
  g.save(); g.scale(u, u);
  g.fillStyle = A.bg; g.fillRect(0, 0, W, H);
  txt(g, '9:41  Tue 26 Sep', 26, 22, F(600, 13), A.ink);
  rr(g, W - 52, 12, 24, 11, 3.5, A.ink);
  rr(g, W / 2 - 176, 40, 352, 44, 22, A.card);
  ['Today', 'Runs', 'Plans', 'You'].forEach((t, k) => {
    const cx = W / 2 - 132 + k * 88;
    if (k === 0) rr(g, cx - 38, 45, 76, 34, 17, A.track);
    txt(g, t, cx, 67, F(600, 14), k === 0 ? A.accent : A.muted, 'center');
  });
  txt(g, 'Good morning, Ana', 32, 150, F(760, 40), A.ink);
  txt(g, 'Tuesday, 26 September · 12-day streak', 32, 180, F(450, 16), A.muted);
  rr(g, 32, 210, 372, 410, 32, A.card);
  ring(g, 218, 386, 118, 26, 0.78);
  txt(g, '6.2', 218, 402, F(780, 58), A.ink, 'center'); txt(g, 'of 8 km today', 218, 432, F(450, 16), A.muted, 'center');
  [['24:40', 'time'], ['4′33″', 'pace'], ['412', 'kcal']].forEach(([v, l], i) => { const x = 98 + i * 120; txt(g, v, x, 572, F(700, 19), A.ink, 'center'); txt(g, l, x, 594, F(450, 13), A.muted, 'center'); });
  rr(g, 428, 210, 374, 196, 28, A.card);
  txt(g, 'This week', 452, 246, F(650, 16), A.ink); txt(g, '31.4 km', 778, 246, F(650, 16), A.accent, 'right');
  bars(g, 452, 272, 326, 86, [0.45, 0.7, 0.3, 0.85, 0.55, 0.95, 0.18], 5);
  rr(g, 428, 424, 374, 196, 28, A.card);
  txt(g, 'NEXT UP', 452, 460, F(650, 12), A.accent); txt(g, 'Tempo 6 km', 452, 496, F(740, 28), A.ink); txt(g, 'Thursday · 07:00 · 4′20″ target', 452, 522, F(450, 14), A.muted);
  ['Warm-up 1 km', '4 km tempo', 'Cool-down'].forEach((t, i) => { const x = 452 + [0, 118, 222][i]; rr(g, x, 552, [108, 96, 90][i], 32, 16, A.chip); txt(g, t, x + 12, 573, F(500, 12.5), A.ink); });
  txt(g, 'Recent runs', 32, 672, F(720, 22), A.ink);
  const runs = [['Riverside loop', '5.4 km · 24:40', 'Sun'], ['Hill repeats', '7.1 km · 36:02', 'Fri'], ['Easy shakeout', '3.2 km · 17:15', 'Thu'], ['Long run', '14.8 km · 1:12:40', 'Tue'], ['Track 400s', '6.0 km · 28:30', 'Mon'], ['Recovery jog', '4.1 km · 23:05', 'Sat']];
  for (let i = 0, y = 692; y + 76 < H - 28; i++, y += 86) {
    const r = runs[i % runs.length];
    rr(g, 32, y, 770, 76, 22, A.card); rr(g, 48, y + 14, 48, 48, 14, A.soft); route(g, 50, y + 16, 0.92);
    txt(g, r[0], 112, y + 34, F(650, 17), A.ink); txt(g, r[1], 112, y + 56, F(450, 14), A.muted); txt(g, r[2], 778, y + 45, F(600, 15), A.muted, 'right');
  }
  rr(g, W / 2 - 150, H - 10, 300, 5, 3, A.ink);
  g.restore();
}

function drawDesktop(g, w, h, top = 24) {
  const u = w / 1440, W = 1440, H = h / u, mb = Math.max(24, top) / u * (u > 1.2 ? 1 : 1);
  g.save(); g.scale(u, u);
  g.fillStyle = A.bg; g.fillRect(0, 0, W, H);
  const m = top / u;
  g.fillStyle = '#e8e6e1'; g.fillRect(0, 0, W, m);
  txt(g, 'Stride', 22, m / 2 + 5, F(760, 14), A.ink);
  ['File', 'Edit', 'View', 'Window', 'Help'].forEach((t, i) => txt(g, t, 84 + i * 58, m / 2 + 5, F(500, 13.5), A.ink));
  txt(g, 'Tue 26 Sep  9:41', W - 22, m / 2 + 5, F(550, 13.5), A.ink, 'right');
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
  const ch = Math.max(260, H - y0 - 262 - 40);
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

const shots = new Map();
function shot(w, h, kind, scale, top) {
  const key = `${w}x${h}:${kind}@${scale}`;
  if (shots.has(key)) return shots.get(key);
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale); c.height = Math.round(h * scale);
  const g = c.getContext('2d'); g.scale(scale, scale);
  if (kind === 'tablet') drawTablet(g, w, h);
  else if (kind === 'desktop') drawDesktop(g, w, h, top);
  else drawPhone(g, w, h);
  const url = c.toDataURL('image/webp', 0.92);
  shots.set(key, url);
  return url;
}
const shotFor = (d) => {
  const { w, h } = d.screen;
  if (d.kind === 'tablet') return shot(w, h, 'tablet', 1.5);
  if (d.kind === 'laptop' || d.kind === 'desktop' || d.kind === 'browser') return shot(w, h, 'desktop', w > 1800 ? 0.9 : 1.2, d.safe?.top ?? 24);
  return shot(w, h, 'phone', 2);
};

await Promise.race([Promise.all(['780 30px Archivo', '650 15px Archivo', '450 15px Archivo'].map((f) => document.fonts.load(f))), sleep(2500)]).catch(() => {});
const HERO = shot(402, 874, 'phone', 3); // 1206 × 2622, a real iPhone 17 Pro screenshot size

// ─── the breaking mockup ─────────────────────────────────────────────────────
class Mock {
  constructor(wrap, { callouts = false } = {}) {
    this.wrap = wrap;
    this.real = wrap.querySelector('bezel-device');
    this.real.setAttribute('src', HERO);
    const m = document.createElement('div');
    m.className = 'mock'; m.setAttribute('aria-hidden', 'true'); m.dataset.state = 'intro';
    m.innerHTML = `<img class="m-ghost" alt="" src="${HERO}"><div class="m-body"></div><div class="m-screen"><img class="m-img" alt="" src="${HERO}"><div class="m-sb"><span>9:41</span><i></i></div></div><div class="m-notch"></div>`;
    wrap.append(m);
    this.m = m;
    if (callouts) { this.cos = document.createElement('div'); this.cos.className = 'cos'; this.cos.dataset.state = 'intro'; wrap.append(this.cos); }
    const ro = new ResizeObserver(() => requestAnimationFrame(() => requestAnimationFrame(() => this.layout())));
    ro.observe(this.real);
    this.real.addEventListener('bezel-fit', (e) => { this.fit = e.detail; this.layout(); });
  }
  layout() {
    const R = this.real.shadowRoot, box = this.wrap.getBoundingClientRect();
    const scr = R?.querySelector('.screen');
    if (!scr || !box.width) return;
    const rel = (n) => { const r = n.getBoundingClientRect(); return { x: r.left - box.left, y: r.top - box.top, w: r.width, h: r.height }; };
    const s = rel(scr);
    if (!s.w) return;
    const k = s.w / this.real.spec.screen.w;
    const bodyEl = R.querySelector('.frame .body'), islEl = R.querySelector('.cutout > *');
    const b = bodyEl ? rel(bodyEl) : { x: s.x - 13 * k, y: s.y - 13 * k, w: s.w + 26 * k, h: s.h + 26 * k };
    const i = islEl ? rel(islEl) : { x: s.x + s.w / 2 - 62 * k, y: s.y + 11 * k, w: 125 * k, h: 37 * k };
    const nh = s.w * 16 / 9, dy = (s.h - nh) / 2, bz = 15 * k;
    const v = {
      k, q: nh / s.h, sx: s.x, sy: s.y, sw: s.w, sh: s.h, dy,
      rr: (parseFloat(scr.style.borderRadius) || 60) * k,
      bx: b.x, by: b.y, bw: b.w, bh: b.h, br: (parseFloat(bodyEl?.style.borderRadius) || 70) * k,
      nbx: s.x - bz, nby: s.y + dy - bz, nbw: s.w + 2 * bz, nbh: nh + 2 * bz,
      nx: s.x + s.w / 2 - 80 * k, ny: s.y + dy, nw: 160 * k, nhh: 30 * k,
      ix: i.x, iy: i.y, iw: i.w, ih: i.h,
    };
    for (const [key, val] of Object.entries(v)) this.m.style.setProperty(`--${key}`, key === 'k' || key === 'q' ? String(val) : `${val}px`);
    this.m.dataset.ready = '';
    if (this.cos) this.callouts(v);
  }
  callouts(v) {
    const { k } = v, L = Math.max(v.bx + v.bw, v.nbx + v.nbw) + 44, P = [], T = [];
    const lead = (st, x1, y1, cls = '') => P.push(`<path data-for="${st}" class="${cls}" d="M${x1} ${y1}H${L - 10}"/><circle data-for="${st}" class="${cls}" cx="${x1}" cy="${y1}" r="2.2" fill="currentColor"/>`);
    const lab = (st, y, html, cls = '') => T.push(`<div class="co ${cls}" data-for="${st}" style="left:${L}px;top:${y}px">${html}</div>`);
    const f = this.fit;
    const dims = f ? `${f.media.w} × ${f.media.h}` : '1206 × 2622';
    // intro: this is the screenshot, untouched
    let y = v.sy + v.sh * 0.2; lead('intro', v.sx + v.sw + 10, y, 'ok'); lab('intro', y, `<b>screenshot.png</b>${dims} px · 19.5:9`, 'ok');
    // squash: the true shape vs the mockup's 9:16 box
    P.push(`<rect data-for="squash" class="dash" x="${v.sx}" y="${v.sy}" width="${v.sw}" height="${v.sh}" rx="${v.rr}"/>`);
    y = v.sy + 6; lead('squash', v.sx + v.sw - v.rr * 0.3, y); lab('squash', y, '<b>your screenshot</b>402 × 874 pt');
    y = v.sy + v.sh / 2; lead('squash', v.nbx + v.nbw, y); lab('squash', y, '<b>mockup screen</b>402 × 715 pt · 9:16<br>image at 82% height');
    // double: two status bars
    const cx = v.sx + 50 * k, cy = v.sy + v.dy + 22 * k;
    P.push(`<ellipse data-for="double" cx="${cx}" cy="${cy}" rx="${34 * k}" ry="${16 * k}"/>`);
    lead('double', cx + 34 * k, cy); lab('double', cy, '<b>two status bars</b>frame’s 9:41 over yours');
    // slice: bands that fall off each end
    const bx = v.nbx + v.nbw + 12;
    P.push(`<path data-for="slice" d="M${bx - 5} ${v.sy}H${bx}V${v.sy + v.dy}H${bx - 5}M${bx - 5} ${v.sy + v.sh - v.dy}H${bx}V${v.sy + v.sh}H${bx - 5}"/>`);
    y = v.sy + v.dy / 2; lead('slice', bx, y); lab('slice', y, '<b>−80 pt</b>status bar, header');
    y = v.sy + v.sh - v.dy / 2; lead('slice', bx, y); lab('slice', y, '<b>−80 pt</b>tab bar');
    // cover: the notch sits on "Today"
    const nx = v.sx + v.sw / 2, ny = v.sy + v.dy + 15 * k;
    P.push(`<ellipse data-for="cover" cx="${nx}" cy="${ny}" rx="${104 * k}" ry="${30 * k}"/>`);
    lead('cover', nx + 104 * k, ny); lab('cover', ny, '<b>notch over header</b>the “Today” title is under it');
    // fit: what bezelkit actually decided (from the bezel-fit event)
    y = v.sy + v.sh * 0.3; lead('fit', v.sx + v.sw + 10, y, 'ok');
    const diff = f ? Math.abs(f.mismatch - 1) * 100 : 0;
    lab('fit', y, `<b>fit="auto" → ${f?.fit ?? 'cover'}</b>${dims} px on ${f ? `${f.screen.w} × ${f.screen.h}` : '402 × 874'} pt<br>shape difference ${diff.toFixed(1)}% · maps 1:1 @3x`, 'ok');
    this.cos.innerHTML = `<svg aria-hidden="true">${P.join('')}</svg>${T.join('')}`;
    $$('svg .ok', this.cos).forEach((n) => n.setAttribute('color', 'rgb(255 212 168)'));
    $$('svg :not(.ok)', this.cos).forEach((n) => n.getAttribute('fill') && n.setAttribute('color', '#ff4263'));
  }
  set(state) {
    this.m.dataset.state = state;
    if (this.cos) this.cos.dataset.state = state;
    clearTimeout(this.t);
    if (state === 'fit') this.t = setTimeout(() => this.wrap.classList.add('is-real'), RM ? 0 : 900);
    else this.wrap.classList.remove('is-real');
    if (RM && state === 'fit') this.wrap.classList.add('is-real');
  }
}

// ─── scene: fit ──────────────────────────────────────────────────────────────
const fitScene = $('#fit'), fitStage = $('.stage', fitScene);
const STEPS = [['intro', 0], ['squash', 0.1], ['double', 0.26], ['slice', 0.42], ['cover', 0.57], ['fit', 0.71]];
let fitState = null, mock;
function setFit(s) {
  if (s === fitState) return;
  fitState = s;
  fitStage.dataset.state = s;
  mock.set(s);
  $$('.say', fitStage).forEach((el) => el.classList.toggle('on', el.dataset.s === s));
  const idx = STEPS.findIndex(([n]) => n === s);
  $$('.rail li', fitStage).forEach((li) => {
    const j = STEPS.findIndex(([n]) => n === li.dataset.s);
    li.classList.toggle('on', j === idx); li.classList.toggle('done', j < idx);
  });
}
if (!RM) {
  mock = new Mock($('#fitWrap'), { callouts: true });
  setFit('intro');
} else {
  $('#fitWrap').remove();
  const grid = $('#sheetGrid');
  for (const s of ['squash', 'double', 'slice', 'cover', 'fit']) {
    const say = $(`.say[data-s="${s}"]`, fitStage);
    const fig = document.createElement('figure');
    fig.className = 'sheet-card';
    fig.innerHTML = `<div class="rigs"><div class="wrap"><bezel-device class="real" device="iphone-17-pro"></bezel-device></div></div>`;
    const cap = document.createElement('figcaption');
    cap.className = 'say on';
    cap.append(...[...say.children].map((n) => n.cloneNode(true)));
    const h = $('h2', cap); if (h) { h.classList.remove('h-big'); h.classList.add('word'); h.textContent = h.textContent.replace(/,\s*/, ', '); }
    fig.append(cap); grid.append(fig);
    new Mock($('.wrap', fig)).set(s);
  }
}

// ─── scene: lineup ───────────────────────────────────────────────────────────
const LINEUP = [['iphone-17-pro', 'cosmic-orange'], ['pixel-10-pro'], ['galaxy-s25-ultra'], ['ipad-pro-11'], ['macbook-pro-14'], ['imac-24']];
const track = $('#track'), lineHead = $('.line-head');
const all = listDevices();
$('#devCount').textContent = all.length;
for (const [id, color] of LINEUP) {
  const d = getDevice(id);
  if (!d) continue;
  const fig = document.createElement('figure');
  fig.className = `dev ${d.kind}`;
  fig.innerHTML = `<bezel-device device="${d.id}" ${color ? `color="${color}"` : ''} alt="${d.name}"></bezel-device><figcaption><b>${d.name}</b><span>${d.screen.w} × ${d.screen.h}${d.dpr ? ` @${+d.dpr.toFixed(2)}x` : ''}</span></figcaption>`;
  $('bezel-device', fig).setAttribute('src', shotFor(d));
  track.append(fig);
}
{
  const KIND = { phone: 'Phones', foldable: 'Foldables', tablet: 'Tablets', watch: 'Watches', laptop: 'Laptops', desktop: 'Desktops', browser: 'Browsers' };
  const groups = new Map();
  for (const d of all) { const k = KIND[d.kind] ?? d.kind; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d.name.replace(/^Browser \((.*)\)$/, '$1').replace(/\s*\(.*\)$/, '')); }
  const roster = document.createElement('div');
  roster.className = 'roster';
  roster.innerHTML = `<h3>And the rest of the ${all.length}.</h3><dl>${[...groups].map(([k, v]) => `<dt>${k}</dt><dd>${v.join(', ')}</dd>`).join('')}</dl>`;
  track.append(roster);
}
let lineItems = [], lineSpan = [0, 0];
function measureLine() {
  lineItems = [...track.children].map((el) => ({ el, c: el.offsetLeft + el.offsetWidth / 2 }));
  if (!lineItems.length) return;
  const vw = innerWidth, first = lineItems[0].c, last = lineItems[lineItems.length - 1].c;
  lineSpan = [vw * (vw < 760 ? 0.5 : 0.7) - first, vw * 0.5 - last];
}
function lineUpdate(p) {
  if (!lineItems.length) measureLine();
  const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2; // ease in-out, slow at both ends
  const x = lerp(lineSpan[0], lineSpan[1], clamp((p - 0.04) / 0.9) * 0.15 + clamp((e - 0.02) / 0.96) * 0.85);
  track.style.transform = `translate3d(${x}px,0,0)`;
  const hv = clamp((p - 0.1) / 0.1);
  lineHead.style.opacity = (1 - hv).toFixed(3);
  lineHead.style.transform = `translateY(${(-24 * hv).toFixed(1)}px)`;
  lineHead.style.visibility = hv >= 1 ? 'hidden' : '';
  const vw = innerWidth;
  for (const it of lineItems) {
    const a = Math.min(Math.abs((it.c + x - vw / 2) / (vw * 0.62)), 1.3);
    it.el.style.opacity = (1 - a * 0.3).toFixed(3);
    it.el.style.transform = `scale(${(1 - a * 0.06).toFixed(4)})`;
  }
}

// ─── scene: flip ─────────────────────────────────────────────────────────────
const flipOne = $('#flipOne'), flipBoth = $('#flipBoth'), flipRig = $('#flipRig');
const phone = getDevice('iphone-17-pro');
flipOne.setAttribute('src', HERO); flipBoth.setAttribute('src', HERO);
const slug = (n) => n.toLowerCase().replace(/\s+/g, '-');
const fin = $('#finishes');
for (const [name, hex] of phone.colors) {
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.color = slug(name);
  b.setAttribute('aria-pressed', String(slug(name) === 'cosmic-orange'));
  b.innerHTML = `<i style="background:${hex}"></i>${name}`;
  b.addEventListener('click', () => {
    $$('button', fin).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    flipBoth.setAttribute('color', b.dataset.color); flipOne.setAttribute('color', b.dataset.color);
  });
  fin.append(b);
}
$('#turnBtn').addEventListener('click', () => flipBoth.setAttribute('side', flipBoth.getAttribute('side') === 'both' ? 'back' : 'both'));
let flipPhase = -1;
function flipUpdate(p) {
  const ph = p < 0.28 ? 0 : p < 0.6 ? 1 : 2;
  if (ph === flipPhase) return;
  flipPhase = ph;
  flipOne.flip(ph === 0 ? 'front' : 'back');
  flipRig.classList.toggle('stacked', ph === 2);
  $$('.s-flip .say').forEach((el) => el.classList.toggle('on', ph === 2 ? el.dataset.f === '2' : el.dataset.f === '0'));
}

// ─── scene: code ─────────────────────────────────────────────────────────────
const codeScene = $('#install'), tokens = $$('.tk', codeScene), cDev = $('#cDev'), liveDev = $('#liveDev'), liveCap = $('#liveCap');
const CYCLE = ['iphone-17-pro', 'pixel-10-pro', 'ipad-pro-11', 'macbook-pro-14', 'galaxy-s25-ultra'];
let cyc = 0, cycTimer = null;
function showLive(id) {
  const d = getDevice(id);
  liveDev.setAttribute('device', id); liveDev.setAttribute('src', shotFor(d));
  liveCap.textContent = `${id} · ${d.screen.w} × ${d.screen.h}`;
}
showLive(CYCLE[0]);
async function cycleStep() {
  cyc = (cyc + 1) % CYCLE.length;
  cDev.classList.add('swap'); liveDev.classList.add('swap');
  await sleep(280);
  cDev.textContent = CYCLE[cyc]; showLive(CYCLE[cyc]);
  cDev.classList.remove('swap'); liveDev.classList.remove('swap');
}
function codeUpdate(p) {
  const n = Math.round(clamp((p - 0.04) / 0.46) * tokens.length);
  tokens.forEach((t, i) => t.classList.toggle('on', i < n));
  const done = p > 0.52;
  codeScene.classList.toggle('done', done);
  const cycling = done && p < 0.999;
  if (cycling && !cycTimer) cycTimer = setInterval(cycleStep, 2400);
  if (!cycling && cycTimer) { clearInterval(cycTimer); cycTimer = null; }
}

// ─── CTA: your own screenshot ───────────────────────────────────────────────
const dropDev = $('#dropDev'), readout = $('#readout'), drop = $('#drop');
dropDev.setAttribute('src', HERO);
const WHY = {
  cover: 'Same shape, so it fills the screen edge to edge.',
  top: 'A little taller than the screen, so it keeps the top.',
  scroll: 'A long screenshot, so it scrolls inside the screen.',
  contain: 'Wider than the screen, so it is letterboxed with its own edge colours.',
};
let custom = false;
dropDev.addEventListener('bezel-fit', (e) => {
  if (!custom) return;
  const f = e.detail;
  readout.innerHTML = `${f.media.w} × ${f.media.h} on a ${f.screen.w} × ${f.screen.h} screen · <b>fit: ${f.fit}</b><br>${WHY[f.fit] ?? ''}`;
});
function useFile(file) {
  if (!file) return;
  custom = true;
  dropDev.setAttribute('type', file.type.startsWith('video/') ? 'video' : 'image');
  dropDev.setAttribute('src', URL.createObjectURL(file));
  readout.textContent = 'Measuring…';
}
$('#file').addEventListener('change', (e) => useFile(e.target.files[0]));
$('label[for="file"]').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#file').click(); } });
drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); useFile(e.dataTransfer.files[0]); });
const TAG = `<script type="module" src="https://cdn.jsdelivr.net/npm/bezelkit@0/dist/bezelkit.js"><\/script>\n<bezel-device device="iphone-17-pro" src="screenshot.png"></bezel-device>`;
$$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const label = b.textContent;
  try { await navigator.clipboard.writeText(TAG); b.textContent = 'Copied'; } catch { b.textContent = 'Copy failed'; }
  setTimeout(() => (b.textContent = label), 1600);
}));

// ─── scroll engine ───────────────────────────────────────────────────────────
const SCENES = [
  { el: fitScene, update: (p) => { let s = 'intro'; for (const [n, t] of STEPS) if (p >= t) s = n; setFit(s); } },
  { el: $('#lineup'), update: lineUpdate, smooth: 0.075 }, // eased toward the scroll position
  { el: $('#flip'), update: flipUpdate },
  { el: codeScene, update: codeUpdate },
];
if (RM) {
  tokens.forEach((t) => t.classList.add('on'));
  codeScene.classList.add('done');
  flipRig.classList.add('stacked');
  $$('.s-flip .say').forEach((el) => el.classList.toggle('on', el.dataset.f === '2'));
} else {
  let queued = false;
  const tick = () => {
    queued = false;
    const vh = innerHeight;
    for (const s of SCENES) {
      const r = s.el.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 1.5) { if (s === SCENES[3] && cycTimer) codeUpdate(1); continue; }
      const len = r.height - vh;
      const p = len > 0 ? clamp(-r.top / len) : r.top < 0 ? 1 : 0;
      if (s.smooth) { s.target = p; glide(s); continue; }
      if (s.p !== p) { s.p = p; s.update(p); }
    }
  };
  // Smoothed scenes chase their scroll target a little each frame, so wheel steps become one continuous glide.
  const glide = (s) => {
    if (s.gliding) return;
    s.gliding = true;
    const step = () => {
      const cur = s.p < 0 || s.p == null ? s.target : s.p;
      const next = Math.abs(s.target - cur) < 0.0004 ? s.target : cur + (s.target - cur) * s.smooth;
      s.p = next; s.update(next);
      if (next !== s.target) requestAnimationFrame(step); else s.gliding = false;
    };
    requestAnimationFrame(step);
  };
  const req = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', () => { measureLine(); SCENES.forEach((s) => (s.p = -1)); req(); });
  new ResizeObserver(() => { measureLine(); SCENES[1].p = -1; req(); }).observe(track);
  tick();
}
