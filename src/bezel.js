// bezelkit — <bezel-device>: accurate, responsive device frames that fit your content.
// Zero dependencies. MIT.
import { getDevice, listDevices, defineDevice } from './devices.js';

export { getDevice, listDevices, defineDevice };

const ATTRS = ['device', 'color', 'orientation', 'src', 'type', 'fit', 'chrome', 'safe-area', 'theme', 'url', 'viewport', 'glare', 'shadow', 'alt'];
const FITS = ['auto', 'cover', 'top', 'contain', 'scroll', 'fill', 'none'];
const IMG_RE = /(^data:image\/)|\.(png|jpe?g|webp|gif|avif|svg|bmp)([?#]|$)/i;
const VID_RE = /(^data:video\/)|\.(mp4|webm|mov|m4v|ogv)([?#]|$)/i;
// Single quotes only: this is interpolated into style="…" attributes.
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif";
const DEFAULT_FRONT = '#050506';

const STYLES = `
:host { display: block; position: relative; width: 100%; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
:host([hidden]) { display: none; }
.stage, .device { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.frame > * { position: absolute; box-sizing: border-box; }
:host(:not([shadow="none"])) .body { box-shadow: 0 2px 3px rgba(0,0,0,.18), 0 24px 48px -16px rgba(0,0,0,.34), 0 50px 90px -40px rgba(0,0,0,.3); }
.screen { position: absolute; overflow: hidden; background: var(--bezel-screen-bg, #000); isolation: isolate; }
.content { position: absolute; left: 0; top: 0; transform-origin: 0 0; overflow: hidden; background: var(--bezel-safe-bg, var(--_safe-bg)); }
.media { position: absolute; overflow: hidden; }
.media > img, .media > video, .media > iframe { display: block; width: 100%; height: 100%; border: 0; }
.media[data-fit="cover"] > * { object-fit: cover; }
.media[data-fit="top"] > * { object-fit: cover; object-position: top; }
.media[data-fit="contain"] { background: linear-gradient(var(--_lb-top, #000) 50%, var(--_lb-bottom, #000) 50%); }
.media[data-fit="contain"] > * { object-fit: contain; }
.media[data-fit="fill"] > * { object-fit: fill; }
.media[data-fit="none"] > * { object-fit: none; }
.media[data-fit="scroll"], .media.slot { overflow-y: auto; scrollbar-width: none; overscroll-behavior: contain; }
.media[data-fit="scroll"]::-webkit-scrollbar, .media.slot::-webkit-scrollbar { display: none; }
.media[data-fit="scroll"] > img { height: auto; }
::slotted(img), ::slotted(video) { display: block; width: 100%; height: 100%; object-fit: cover; }
.chrome, .cutout, .glare { position: absolute; inset: 0; pointer-events: none; }
.chrome > *, .cutout > * { position: absolute; box-sizing: border-box; }
.chrome { z-index: 2; } .cutout { z-index: 3; } .glare { z-index: 4; display: none; }
:host([glare]:not([glare="false"])) .glare { display: block; background: linear-gradient(115deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.05) 26%, transparent 40%); }
.icons { display: flex; align-items: center; justify-content: center; gap: 6px; }
.icons svg { display: block; fill: currentColor; }
`;

const ICON = {
  signal: '<svg width="18" height="12" viewBox="0 0 18 12"><rect y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" width="3" height="12" rx="1"/></svg>',
  wifi: '<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.6 5.5 9a3.5 3.5 0 0 1 5 0z"/><path d="M8 5.5c1.8 0 3.5.7 4.7 1.9l-1.4 1.4A4.7 4.7 0 0 0 8 7.4a4.7 4.7 0 0 0-3.3 1.4L3.3 7.4A6.6 6.6 0 0 1 8 5.5z"/><path d="M8 1.6c2.9 0 5.7 1.1 7.7 3.2l-1.4 1.4A8.9 8.9 0 0 0 8 3.5c-2.4 0-4.6.9-6.3 2.7L.3 4.8A10.8 10.8 0 0 1 8 1.6z"/></svg>',
  battery: '<svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" opacity=".4"/></svg>',
  lock: '<svg width="10" height="12" viewBox="0 0 10 12"><path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5H9v7H1V5zm1.2 0h2.6V3.5a1.3 1.3 0 0 0-2.6 0z"/></svg>',
};

// ─── helpers ───────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const box = (v) => (typeof v === 'number' ? { t: v, r: v, b: v, l: v } : { t: 0, r: 0, b: 0, l: 0, ...v });
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
const lighten = (c, p) => `color-mix(in oklab, ${c}, white ${p}%)`;
const darken = (c, p) => `color-mix(in oklab, ${c}, black ${p}%)`;
const metal = (c) =>
  `linear-gradient(135deg, ${lighten(c, 38)} 0%, ${c} 18%, ${darken(c, 22)} 48%, ${c} 80%, ${lighten(c, 30)} 100%)`;
const div = (cls, style, inner = '') => `<div class="${cls}" style="${style}">${inner}</div>`;
const lens = (d) => `border-radius:50%;background:radial-gradient(circle at 35% 35%, #33455a 0 14%, #0b0d12 46%, #000 70%);width:${d}px;height:${d}px`;

function resolveColor(device, value) {
  const [defName, defFrame, defFront] = device.colors[0];
  if (value) {
    const hit = device.colors.find(([name]) => slug(name) === slug(value));
    if (hit) return { name: hit[0], frame: hit[1], front: hit[2] ?? DEFAULT_FRONT };
    if (globalThis.CSS?.supports?.('color', value)) {
      return { name: value, frame: value, front: defFront ?? DEFAULT_FRONT };
    }
  }
  return { name: defName, frame: defFrame, front: defFront ?? DEFAULT_FRONT };
}

function button(b, x0, y0, bw, bh, color) {
  const t = b.flush ? 1.5 : (b.w ?? 3);
  const bg = b.color ?? (b.crown
    ? `repeating-linear-gradient(to bottom, ${darken(color, 25)} 0 2px, ${lighten(color, 15)} 2px 4px)`
    : `linear-gradient(to right, ${darken(color, 20)}, ${lighten(color, 20)}, ${darken(color, 15)})`);
  const r = Math.min(t, 3);
  if (b.side === 'top') {
    return div('btn', `left:${x0 + b.at}px;top:${y0 - t}px;width:${b.len}px;height:${t + 1}px;border-radius:${r}px ${r}px 0 0;background:${bg}`);
  }
  const left = b.side === 'left' ? x0 - t : x0 + bw - 1;
  const radius = b.side === 'left' ? `${r}px 0 0 ${r}px` : `0 ${r}px ${r}px 0`;
  return div('btn', `left:${left}px;top:${y0 + b.at}px;width:${t + 1}px;height:${b.len}px;border-radius:${radius};background:${bg}`);
}

// Camera dot sitting in a bezel, centred on one side of the rectangle (x, y, w, h).
function bezelCamera(cut, x, y, w, h, bz) {
  if (!cut || cut.type !== 'camera') return '';
  const d = cut.d ?? 8;
  if (cut.side === 'left') return div('cam', `left:${x + (bz.l - d) / 2}px;top:${y + (h - d) / 2}px;${lens(d)}`);
  return div('cam', `left:${x + (w - d) / 2}px;top:${y + (bz.t - d) / 2}px;${lens(d)}`);
}

// Cut-outs that overlap the screen, in screen coordinates.
function screenCutout(cut, w) {
  if (!cut) return '';
  const cx = (w - (cut.w ?? cut.d ?? 0)) / 2;
  switch (cut.type) {
    case 'island':
      return div('island', `left:${cx}px;top:${cut.top}px;width:${cut.w}px;height:${cut.h}px;border-radius:${cut.h / 2}px;background:#000`) +
        div('lens', `left:${cx + cut.w - cut.h * 0.78}px;top:${cut.top + cut.h * 0.28}px;${lens(cut.h * 0.44)}`);
    case 'notch':
    case 'mac-notch': {
      const ear = cut.type === 'notch' ? 6 : 4;
      const r = cut.type === 'notch' ? cut.h * 0.6 : 8;
      return div('notch', `left:${cx}px;top:0;width:${cut.w}px;height:${cut.h}px;border-radius:0 0 ${r}px ${r}px;background:#000`) +
        div('ear', `left:${cx - ear}px;top:0;width:${ear}px;height:${ear}px;background:radial-gradient(circle at 0 100%, transparent ${ear}px, #000 ${ear + 0.5}px)`) +
        div('ear', `left:${cx + cut.w}px;top:0;width:${ear}px;height:${ear}px;background:radial-gradient(circle at 100% 100%, transparent ${ear}px, #000 ${ear + 0.5}px)`) +
        div('lens', `left:${w / 2 + (cut.type === 'notch' ? 30 : -4)}px;top:${cut.h / 2 - 4}px;${lens(8)}`);
    }
    case 'hole':
      return div('hole', `left:${cx}px;top:${cut.top}px;${lens(cut.d)};box-shadow:0 0 0 1px #000`);
    default:
      return '';
  }
}

// ─── frame builders ────────────────────────────────────────────────────────
// Each returns { W, H, frame, screen: { x, y, w, h, radius }, cutout }.

function buildHandheld(d, color, screen) {
  const { w, h } = screen;
  const r = d.screen.radius ?? 0;
  const bz = box(d.bezel ?? 8), rim = d.rim ?? 4, pad = box(d.pad ?? 4);
  const bw = w + bz.l + bz.r + rim * 2, bh = h + bz.t + bz.b + rim * 2;
  const br = d.bodyRadius ?? r + Math.max(bz.l, bz.t) + rim;
  const x0 = pad.l, y0 = pad.t, gx = x0 + rim, gy = y0 + rim;

  let f = (d.buttons ?? []).map((b) => button(b, x0, y0, bw, bh, color.frame)).join('');
  f += div('body', `left:${x0}px;top:${y0}px;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${metal(color.frame)}`);
  f += div('glass', `left:${gx}px;top:${gy}px;width:${bw - rim * 2}px;height:${bh - rim * 2}px;border-radius:${Math.max(br - rim, 0)}px;background:${color.front};box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)`);
  f += bezelCamera(d.cutout, gx, gy, bw - rim * 2, bh - rim * 2, bz);

  if (d.earpiece) {
    const cx = gx + (bw - rim * 2) / 2;
    f += div('ear', `left:${cx - 26}px;top:${gy + bz.t / 2 - 3}px;width:52px;height:6px;border-radius:3px;background:#1a1b1e;box-shadow:inset 0 1px 1px #000`);
    f += div('cam', `left:${cx - 3}px;top:${gy + bz.t / 2 - 26}px;${lens(8)}`);
  }
  if (d.home === 'button') {
    const s = Math.min(bz.b * 0.62, 66);
    f += div('home', `left:${gx + (bw - rim * 2 - s) / 2}px;top:${gy + bz.t + h + (bz.b - s) / 2}px;width:${s}px;height:${s}px;border-radius:50%;border:3px solid ${lighten(color.frame, 12)};background:${color.front}`);
  }
  return { W: bw + pad.l + pad.r, H: bh + pad.t + pad.b, frame: f, screen: { x: gx + bz.l, y: gy + bz.t, w, h, radius: `${r}px` }, cutout: screenCutout(d.cutout, w) };
}

function buildLaptop(d, color, screen) {
  const { w, h } = screen;
  const r = d.screen.radius ?? 0;
  const bz = box(d.bezel ?? 14), rim = d.rim ?? 2, lr = d.lidRadius ?? 18;
  const lw = w + bz.l + bz.r + rim * 2, lh = h + bz.t + bz.b + rim * 2;
  const ov = d.base?.overhang ?? Math.round(lw * 0.07), bh = d.base?.h ?? 18;
  const W = lw + ov * 2, H = lh + bh;
  const c = color.frame;

  let f = div('body', `left:${ov}px;top:0;width:${lw}px;height:${lh}px;border-radius:${lr}px ${lr}px 6px 6px;background:${metal(c)}`);
  f += div('glass', `left:${ov + rim}px;top:${rim}px;width:${lw - rim * 2}px;height:${lh - rim * 2}px;border-radius:${lr - rim}px ${lr - rim}px 4px 4px;background:${color.front}`);
  f += bezelCamera(d.cutout, ov + rim, rim, lw - rim * 2, lh - rim * 2, bz);
  f += div('body', `left:0;top:${lh - 1}px;width:${W}px;height:${bh + 1}px;border-radius:3px 3px ${W * 0.045}px ${W * 0.045}px / 3px 3px ${bh * 0.9}px ${bh * 0.9}px;background:linear-gradient(to bottom, ${lighten(c, 30)} 0, ${c} 30%, ${darken(c, 28)} 100%)`);
  f += div('lip', `left:${W / 2 - W * 0.07}px;top:${lh}px;width:${W * 0.14}px;height:${bh * 0.38}px;border-radius:0 0 ${bh * 0.5}px ${bh * 0.5}px;background:${darken(c, 16)}`);
  return { W, H, frame: f, screen: { x: ov + rim + bz.l, y: rim + bz.t, w, h, radius: `${r}px ${r}px 0 0` }, cutout: screenCutout(d.cutout, w) };
}

function buildDesktop(d, color, screen) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 34), rim = d.rim ?? 0, chin = d.chin ?? 0;
  const sw = d.stand?.w ?? 440, sh = d.stand?.h ?? 360, foot = 16, br = 26;
  const bw = w + bz.l + bz.r + rim * 2, glassH = h + bz.t + bz.b, bh = glassH + rim * 2 + chin;
  const c = color.frame;

  let f = div('neck', `left:${(bw - sw) / 2}px;top:${bh - 30}px;width:${sw}px;height:${sh + 30}px;background:linear-gradient(to right, ${darken(c, 25)}, ${c} 20%, ${lighten(c, 25)} 50%, ${c} 80%, ${darken(c, 25)})`);
  f += div('body', `left:${(bw - sw * 1.12) / 2}px;top:${bh + sh}px;width:${sw * 1.12}px;height:${foot}px;border-radius:3px 3px 10px 10px;background:linear-gradient(${lighten(c, 20)}, ${darken(c, 20)})`);
  f += div('body', `left:0;top:0;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${chin ? c : metal(c)}`);
  f += div('glass', `left:${rim}px;top:${rim}px;width:${bw - rim * 2}px;height:${glassH}px;border-radius:${chin ? `${br - rim}px ${br - rim}px 0 0` : `${br - rim}px`};background:${color.front}`);
  f += bezelCamera(d.cutout, rim, rim, bw - rim * 2, glassH, bz);
  return { W: bw, H: bh + sh + foot, frame: f, screen: { x: rim + bz.l, y: rim + bz.t, w, h, radius: '0' }, cutout: '' };
}

function buildBrowser(d, _color, screen, { theme, url }) {
  const { w, h } = screen;
  const bar = d.bar ?? 44, dark = theme === 'dark';
  const W = w + 2, H = h + bar + 2;
  const ink = dark ? '#e8e8ea' : '#3c3c43';
  const barBg = dark ? '#2a2a2e' : d.colors[0][1];
  const pill = dark ? '#1b1b1e' : '#ffffff';
  const host = esc(url || 'example.com');

  let f = div('body', `left:0;top:0;width:${W}px;height:${H}px;border-radius:12px;background:${barBg};border:1px solid ${dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.14)'}`);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((dot, i) => {
    f += div('dot', `left:${16 + i * 20}px;top:${bar / 2 - 6}px;width:12px;height:12px;border-radius:50%;background:${dot};box-shadow:inset 0 0 0 .5px rgba(0,0,0,.2)`);
  });
  const text = `font:13px/1 ${FONT};color:${ink};display:flex;align-items:center;gap:6px;white-space:nowrap;overflow:hidden`;
  if (d.style === 'safari') {
    const pw = Math.min(560, w * 0.46);
    f += div('url', `left:${(W - pw) / 2}px;top:${(bar - 30) / 2}px;width:${pw}px;height:30px;border-radius:8px;background:${dark ? '#3a3a3f' : '#e8e8ed'};justify-content:center;${text}`, `<span style="opacity:.55;display:flex">${ICON.lock}</span>${host}`);
  } else {
    f += div('nav', `left:92px;top:${bar / 2 - 8}px;${text};opacity:.55;font-size:16px;gap:18px`, '←<span>→</span><span>↻</span>');
    f += div('url', `left:178px;top:${(bar - 30) / 2}px;width:${Math.max(W - 238, 120)}px;height:30px;border-radius:15px;background:${pill};padding:0 14px;${text}`, `<span style="opacity:.55;display:flex">${ICON.lock}</span>${host}`);
  }
  return { W, H, frame: f, screen: { x: 1, y: bar + 1, w, h, radius: '0 0 11px 11px' }, cutout: '' };
}

const BUILDERS = { phone: buildHandheld, tablet: buildHandheld, watch: buildHandheld, laptop: buildLaptop, desktop: buildDesktop, browser: buildBrowser };

// ─── solid variants: variant="deck" (2.5D) and variant="3d" ────────────────
// Laptops and desktops only; "flat" (the default) is the builders above, untouched.
// Units match the screen px; real proportions live in each device's `solid` spec.

// Pushed rather than written into the ATTRS literal so parallel edits to that line merge cleanly.
ATTRS.push('variant', 'rotate-x', 'rotate-y', 'lid-angle', 'interactive');

const SOLID_CSS = `
.s3 > *, .f3 > * { position: absolute; box-sizing: border-box; }
.s3 > i, .f3 > i { background: linear-gradient(#2a2a2e, #161619); box-shadow: 0 1px 1px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.09); }
:host([shadow="none"]) .shadow3 { display: none; }
.device.v3d, .v3d .frame, .g3 { transform-style: preserve-3d; }
.v3d .frame, .g3, .f3, .v3d .screen { transform-origin: 0 0; }
.g3, .f3 { position: absolute; left: 0; top: 0; }
.f3, .v3d .screen { backface-visibility: hidden; }
:host([interactive]:not([interactive="false"])) .v3d { cursor: grab; }
:host([variant="3d"][interactive]:not([interactive="false"])) { touch-action: pan-y; }
.v3d.grabbing { cursor: grabbing; }
`;

const RX_RANGE = [-15, 75]; // tilt clamp while dragging
const rad = (a) => (a * Math.PI) / 180;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const num = (v, def) => (v == null || v === '' || !Number.isFinite(+v) ? def : +v);
const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rotX = ([x, y, z], a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [x, y * c - z * s, y * s + z * c]; };
const rotY = ([x, y, z], a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [x * c + z * s, y, -x * s + z * c]; };
const box8 = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [z0, z1].map((z) => [x, y, z])));

function readPose(el, kind) {
  const a = (n) => el.getAttribute(n), laptop = kind === 'laptop';
  return {
    rx: clamp(num(a('rotate-x'), laptop ? 18 : 10), -90, 90),
    ry: num(a('rotate-y'), -28),
    lidMax: laptop ? clamp(num(a('lid-angle'), 105), 0, 135) : 0,
    interactive: el.hasAttribute('interactive') && a('interactive') !== 'false',
  };
}

const laptopSolid = (d, lw) => ({ lid: 22, base: 44, depth: Math.round(lw * 0.7), pro: false, ...d.solid });
function desktopSolid(d, bw) {
  const s = d.solid ?? {}, f = s.foot ?? {};
  return { t: s.t ?? 40, lift: s.lift ?? (d.stand?.h ?? 360) + 16, fw: f.w ?? d.stand?.w ?? 440, fd: f.d ?? Math.round(bw * 0.27), ft: f.t ?? 22 };
}

// A plan (w × depth) drawn upright, then tipped back about its top edge so it reads as a horizontal
// surface seen from slightly above. k = how much wider the near edge looks than the far edge.
function tip(depth, k, a = 79) {
  const s = Math.sin(rad(a)), c = Math.cos(rad(a)), P = (depth * s * k) / (k - 1);
  return {
    tf: `perspective(${P}px) rotateX(${a}deg)`,
    proj: (v) => (v * c * P) / (P - v * s), // projected y of plan row v
  };
}

// Keyboard deck: full-height function row, inverted-T arrows, trackpad; `pro` adds the black
// well and speaker grilles of the 14/16″ MacBook Pro. Keys are <i> so the look lives in CSS.
const KEYROWS = [[1.5, ...Array(12).fill(1), 1], [...Array(13).fill(1), 1.5], [1.5, ...Array(13).fill(1)],
  [1.8, ...Array(11).fill(1), 1.7], [2.3, ...Array(10).fill(1), 2.2], [1, 1, 1, 1.25, 5, 1.25, 1, -1, -2, -1]];
function deckSurface(w, D, c, pro) {
  const kw = w * 0.86, u = kw / 14.5, g = u * 0.14, kx = (w - kw) / 2, ky = D * 0.055, kh = 6 * u, hh = (u - g) / 2 - g / 4;
  const key = (x, y, a, b) => `<i style="left:${x}px;top:${y}px;width:${a}px;height:${b}px;border-radius:${u * 0.12}px"></i>`;
  let s = div('well', `left:${kx - g}px;top:${ky - g}px;width:${kw + g * 2}px;height:${kh + g * 2}px;border-radius:${u * 0.22}px;background:${pro ? '#060607' : darken(c, 14)};box-shadow:inset 0 2px 3px rgba(0,0,0,.4)`);
  KEYROWS.forEach((row, i) => {
    let x = kx;
    const y = ky + i * u + g / 2;
    for (const k of row) {
      if (k > 0) s += key(x + g / 2, y, k * u - g, u - g);
      else s += (k === -2 ? key(x + g / 2, y, u - g, hh) : '') + key(x + g / 2, y + hh + g / 2, u - g, hh);
      x += k > 0 ? k * u : u;
    }
  });
  if (pro) {
    const gw = kx * 0.5, dot = 'radial-gradient(circle, rgba(0,0,0,.6) 0 1.6px, transparent 2.2px) 0 0 / 7px 7px';
    s += div('grille', `left:${(kx - gw) / 2}px;top:${ky}px;width:${gw}px;height:${kh}px;background:${dot}`);
    s += div('grille', `left:${w - (kx + gw) / 2}px;top:${ky}px;width:${gw}px;height:${kh}px;background:${dot}`);
  }
  const tw = w * 0.46, ty = ky + kh + D * 0.035;
  s += div('trackpad', `left:${(w - tw) / 2}px;top:${ty}px;width:${tw}px;height:${D * 0.94 - ty}px;border-radius:${u * 0.28}px;background:linear-gradient(${lighten(c, 5)}, ${c});box-shadow:inset 0 0 0 1.5px ${darken(c, 14)}, inset 0 2px 0 ${lighten(c, 12)}`);
  return s;
}

// A horizontal slab (w × depth plan, t thick, plan corner radius R) seen from slightly above:
// the tipped plan is the top, a flat band under its near edge is the front face. Sides are
// out of view, as they are for a centred camera.
function deckSlab(left, top, w, depth, k, R, t, c, topBg, inner = '') {
  const T = tip(depth, k), dh = T.proj(depth), rv = dh - T.proj(depth - R), rk = R * k;
  const html = div('front', `left:${left + (w - w * k) / 2}px;top:${top + dh - rv}px;width:${w * k}px;height:${t + rv}px;border-radius:0 0 ${rk}px ${rk}px / 0 0 ${rv}px ${rv}px;background:linear-gradient(${lighten(c, 30)} ${rv}px, ${lighten(c, 8)} ${rv + t * 0.3}px, ${darken(c, 18)} ${rv + t * 0.8}px, ${darken(c, 40)})`) +
    div('s3', `left:${left}px;top:${top}px;width:${w}px;height:${depth}px;border-radius:10px 10px ${R}px ${R}px;transform-origin:50% 0;transform:${T.tf};background:${topBg}`, inner);
  return { html, dh };
}

function buildLaptopDeck(d, color, screen) {
  const { w, h } = screen;
  const r = d.screen.radius ?? 0;
  const bz = box(d.bezel ?? 14), rim = d.rim ?? 2, lr = d.lidRadius ?? 18;
  const lw = w + bz.l + bz.r + rim * 2, lh = h + bz.t + bz.b + rim * 2;
  const ov = d.base?.overhang ?? Math.round(lw * 0.07), S = laptopSolid(d, lw);
  const c = color.frame, W = lw + ov * 2, D = S.depth, ft = S.base, y0 = lh - 6;
  const base = deckSlab(ov, y0, lw, D, W / lw, lr * 1.8, ft, c, `linear-gradient(${darken(c, 12)}, ${c} 9%, ${lighten(c, 7)})`,
    deckSurface(lw, D, c, S.pro) +
    div('hinge', `left:0;top:0;width:${lw}px;height:${D * 0.07}px;border-radius:10px 10px 0 0;background:linear-gradient(rgba(0,0,0,.4), transparent)`) +
    div('scoop', `left:${lw * 0.44}px;top:${D * 0.975}px;width:${lw * 0.12}px;height:${D * 0.025}px;border-radius:50% 50% 0 0 / 100% 100% 0 0;background:linear-gradient(${darken(c, 34)}, ${darken(c, 12)})`));
  const fy = y0 + base.dh;

  let f = div('shadow3', `left:${W * 0.02}px;top:${fy + ft * 0.5}px;width:${W * 0.96}px;height:${ft}px;border-radius:50%;background:rgba(0,0,0,.55);filter:blur(${ft * 0.4}px)`);
  f += base.html;
  f += div('body', `left:${ov}px;top:0;width:${lw}px;height:${lh}px;border-radius:${lr}px ${lr}px 6px 6px;background:${metal(c)}`);
  f += div('glass', `left:${ov + rim}px;top:${rim}px;width:${lw - rim * 2}px;height:${lh - rim * 2}px;border-radius:${lr - rim}px ${lr - rim}px 4px 4px;background:${color.front}`);
  f += bezelCamera(d.cutout, ov + rim, rim, lw - rim * 2, lh - rim * 2, bz);
  return { W, H: fy + ft + 6, frame: f, screen: { x: ov + rim + bz.l, y: rim + bz.t, w, h, radius: `${r}px ${r}px 0 0` }, cutout: screenCutout(d.cutout, w) };
}

function buildDesktopDeck(d, color, screen) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 34), rim = d.rim ?? 0, chin = d.chin ?? 0, br = 26;
  const bw = w + bz.l + bz.r + rim * 2, glassH = h + bz.t + bz.b, bh = glassH + rim * 2 + chin;
  const c = color.frame, S = desktopSolid(d, bw), { fw, fd, ft } = S, k = 1.12;
  const tt = Math.max(4, Math.round(S.t * 0.2)), fx = (bw - fw) / 2, floor = tt + bh + S.lift, ny = tt + bh - 40;
  const fy = floor - ft - tip(fd, k).proj(fd);
  const foot = deckSlab(fx, fy, fw, fd, k, fw * 0.07, ft, c, `linear-gradient(${darken(c, 16)}, ${c} 30%, ${lighten(c, 10)})`);

  let f = div('shadow3', `left:${fx - fw * 0.06}px;top:${floor - ft * 1.3}px;width:${fw * k * 1.07}px;height:${ft * 2.2}px;border-radius:50%;background:rgba(0,0,0,.5);filter:blur(${ft * 0.6}px)`);
  f += div('neck', `left:${fx}px;top:${ny}px;width:${fw}px;height:${fy - ny + 4}px;background:linear-gradient(rgba(0,0,0,.3), transparent 30%, transparent calc(100% - 22px), rgba(255,255,255,.3) calc(100% - 8px), rgba(0,0,0,.1)), linear-gradient(to right, ${darken(c, 18)}, ${c} 3%, ${lighten(c, 6)} 50%, ${c} 97%, ${darken(c, 18)})`);
  f += foot.html;
  // A copy of the display raised by its (foreshortened) thickness shows the top edge.
  f += div('edge', `left:0;top:0;width:${bw}px;height:${bh}px;border-radius:${br}px;background:linear-gradient(${lighten(c, 26)}, ${darken(c, 8)} ${tt * 2}px)`);
  f += div('body', `left:0;top:${tt}px;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${chin ? c : metal(c)}`);
  f += div('glass', `left:${rim}px;top:${tt + rim}px;width:${bw - rim * 2}px;height:${glassH}px;border-radius:${chin ? `${br - rim}px ${br - rim}px 0 0` : `${br - rim}px`};background:${color.front}`);
  f += bezelCamera(d.cutout, rim, tt + rim, bw - rim * 2, glassH, bz);
  return { W: bw, H: floor + 6, frame: f, screen: { x: rim + bz.l, y: tt + rim + bz.t, w, h, radius: '0' }, cutout: '' };
}

// True 3D. Model space: x right, y down, z toward the viewer (CSS axes). Faces are flat divs
// centred on the origin and placed by transforms; .frame carries the camera and the live .screen
// layer gets the same camera plus the transform of the face it sits on, so it is never re-created.
const face = (cls, w, h, tf, style, inner = '') =>
  `<div class="f3 ${cls}" style="width:${w}px;height:${h}px;transform:${tf} translate(${-w / 2}px,${-h / 2}px);${style}">${inner}</div>`;
const g3 = (tf, inner, cls = '') => `<div class="g3 ${cls}" style="transform:${tf}">${inner}</div>`;
const shade = (c, t) => (t >= 0 ? lighten(c, Math.round(t * 24)) : darken(c, Math.round(-t * 34)));

// Rounded-rectangle extrusion w × h × t centred on the origin, front face at z = +t/2.
// Edges are strips around the outline (4 per corner arc), shaded by how much they face `light`
// (an in-plane angle: -90 = the slab's top edge).
function slab(w, h, t, r, o) {
  const R = Math.min(r, w / 2, h / 2), hx = w / 2 - R, hy = h / 2 - R, light = o.light ?? -90;
  const strip = (x, y, phi, len) => face('edge', len + 0.8, t, `translate3d(${x}px,${y}px,0) rotateZ(${phi + 90}deg) rotateX(90deg)`, `background:${shade(o.edge, Math.cos(rad(phi - light)))}`);
  let s = face('front', w, h, `translateZ(${t / 2}px)`, `border-radius:${R}px;background:${o.front}`, o.inner ?? '');
  s += face('back', w, h, `rotateY(180deg) translateZ(${t / 2}px)`, `border-radius:${R}px;background:${o.back}`, o.backInner ?? '');
  if (hx > 0) s += strip(0, -h / 2, -90, hx * 2) + strip(0, h / 2, 90, hx * 2);
  if (hy > 0) s += strip(w / 2, 0, 0, hy * 2) + strip(-w / 2, 0, 180, hy * 2);
  if (R > 0) {
    const n = 4, seg = 2 * R * Math.tan(Math.PI / (4 * n));
    for (const [cx, cy, a0] of [[hx, -hy, -90], [hx, hy, 0], [-hx, hy, 90], [-hx, -hy, 180]]) {
      for (let i = 0; i < n; i++) {
        const phi = a0 + ((i + 0.5) * 90) / n;
        s += strip(cx + R * Math.cos(rad(phi)), cy + R * Math.sin(rad(phi)), phi, seg);
      }
    }
  }
  return s;
}

// Fit the projected model in a box. Covers the whole lid sweep (0…lid-angle) so open()/close()
// never clip, and with `interactive` every reachable camera angle so dragging never re-lays out.
function camera3d(points, P, pose) {
  const m = pose.lidMax;
  const all = [...new Set(m ? [0, m / 3, (m * 2) / 3, Math.min(90, m), m] : [0])].flatMap(points);
  const lo = [0, 1, 2].map((i) => Math.min(...all.map((p) => p[i])));
  const hi = [0, 1, 2].map((i) => Math.max(...all.map((p) => p[i])));
  const c = lo.map((v, i) => (v + hi[i]) / 2);
  const cams = [];
  if (pose.interactive) for (let rx = RX_RANGE[0]; rx <= RX_RANGE[1]; rx += 15) for (let ry = -180; ry < 180; ry += 15) cams.push([rx, ry]);
  else cams.push([pose.rx, pose.ry]);
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [rx, ry] of cams) {
    for (const p of all) {
      const q = rotX(rotY([p[0] - c[0], p[1] - c[1], p[2] - c[2]], ry), -rx), f = P / (P - q[2]);
      x0 = Math.min(x0, q[0] * f); x1 = Math.max(x1, q[0] * f); y0 = Math.min(y0, q[1] * f); y1 = Math.max(y1, q[1] * f);
    }
  }
  const pad = Math.max(x1 - x0, y1 - y0) * 0.025;
  return { W: x1 - x0 + pad * 2, H: y1 - y0 + pad * 2, ox: pad - x0, oy: pad - y0, c, P };
}

function buildLaptop3d(d, color, screen, { pose }) {
  const { w, h } = screen;
  const r = d.screen.radius ?? 0;
  const bz = box(d.bezel ?? 14), rim = d.rim ?? 2, lr = d.lidRadius ?? 18;
  const lw = w + bz.l + bz.r + rim * 2, lh = h + bz.t + bz.b + rim * 2;
  const S = laptopSolid(d, lw), c = color.frame, D = S.depth, Tb = S.base, Tl = S.lid, gap = 2;
  // The real lid is as deep as the base; the part below the flat drawing is its hinge-side chin.
  const ld = Math.max(lh, D - 6), gh = lh - rim * 2 + (ld - lh) * 0.55;
  // Lid modelled upright (screen face at z = 0, bottom edge on the hinge), then swung about the hinge.
  const lid = (a) => `translate3d(0,${-gap}px,0) rotateX(${a - 90}deg)`;
  const points = (a) => [...box8(-lw / 2, lw / 2, 0, Tb, 0, D),
    ...box8(-lw / 2, lw / 2, -ld, 0, -Tl, 0).map((p) => { const q = rotX(p, a - 90); return [q[0], q[1] - gap, q[2]]; })];
  const cam = camera3d(points, Math.max(lw, D) * 3, pose);

  let f = face('shadow3', lw * 1.14, D * 1.22, `translate3d(0,${Tb + 1}px,${D / 2}px) rotateX(90deg)`, 'background:radial-gradient(closest-side, rgba(0,0,0,.45), rgba(0,0,0,.2) 55%, transparent)');
  f += g3(`translate3d(0,${Tb / 2}px,${D / 2}px) rotateX(90deg)`, slab(lw, D, Tb, lr, {
    front: `linear-gradient(${darken(c, 6)}, ${c} 12%, ${lighten(c, 6)})`, inner: deckSurface(lw, D, c, S.pro),
    back: darken(c, 22), edge: c, light: 90,
    backInner: [0.1, 0.9].flatMap((x) => [0.1, 0.9].map((y) => div('foot', `left:${lw * x - 22}px;top:${D * y - 22}px;width:44px;height:44px;border-radius:50%;background:#18181a`))).join(''),
  }));
  f += g3(lid(pose.lidMax), g3(`translate3d(0,${-ld / 2}px,${-Tl / 2}px)`, slab(lw, ld, Tl, lr, {
    front: metal(c), edge: c, light: -90,
    inner: div('glass', `left:${rim}px;top:${rim}px;width:${lw - rim * 2}px;height:${gh}px;border-radius:${lr - rim}px ${lr - rim}px 6px 6px;background:${color.front}`) + bezelCamera(d.cutout, rim, rim, lw - rim * 2, gh, bz),
    back: `linear-gradient(200deg, ${lighten(c, 16)}, ${c} 45%, ${darken(c, 10)})`,
  })), 'lid3');
  return {
    W: cam.W, H: cam.H, frame: f, screen: { x: 0, y: 0, w, h, radius: `${r}px ${r}px 0 0` }, cutout: screenCutout(d.cutout, w),
    three: { ...cam, lid, screen: (a) => `${lid(a)} translate3d(${-lw / 2 + rim + bz.l}px,${-ld + rim + bz.t}px,1px)` },
  };
}

function buildDesktop3d(d, color, screen, { pose }) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 34), rim = d.rim ?? 0, chin = d.chin ?? 0, br = 26;
  const bw = w + bz.l + bz.r + rim * 2, glassH = h + bz.t + bz.b, bh = glassH + rim * 2 + chin;
  const c = color.frame, S = desktopSolid(d, bw), { fw, fd, ft } = S, Td = S.t, F = S.lift;
  const zf = Math.round(fd * 0.06); // the foot's front edge pokes out just past the glass
  // Neck: a plate from the back of the foot up to the middle of the display's back. It stops just
  // behind the back face: intersecting planes make Chrome's depth sort leave specks.
  const nb = [F - ft - ft * 0.3, zf - fd + ft * 1.5], nt = [-bh * 0.42, -Td - ft / 2 - 1];
  const ny = nb[0] - nt[0], nz = nt[1] - nb[1], tilt = (Math.atan2(nz, ny) * 180) / Math.PI;
  const points = () => [...box8(-bw / 2, bw / 2, -bh, 0, -Td, 0), ...box8(-fw / 2, fw / 2, F - ft, F, zf - fd, zf)];
  const cam = camera3d(points, bw * 3, pose);

  let f = face('shadow3', fw * 1.5, fd * 1.3, `translate3d(0,${F + 1}px,${zf - fd / 2}px) rotateX(90deg)`, 'background:radial-gradient(closest-side, rgba(0,0,0,.4), rgba(0,0,0,.16) 55%, transparent)');
  f += g3(`translate3d(0,${(nb[0] + nt[0]) / 2}px,${(nb[1] + nt[1]) / 2}px) rotateX(${-tilt}deg)`, slab(fw, Math.hypot(ny, nz), ft, 0, {
    front: `linear-gradient(${darken(c, 12)}, ${lighten(c, 8)})`, back: darken(c, 8), edge: c, light: -90,
  }));
  f += g3(`translate3d(0,${F - ft / 2}px,${zf - fd / 2}px) rotateX(90deg)`, slab(fw, fd, ft, fw * 0.07, {
    front: `linear-gradient(${darken(c, 10)}, ${lighten(c, 8)})`, back: darken(c, 25), edge: c, light: 90,
  }));
  f += g3(`translate3d(0,${-bh / 2}px,${-Td / 2}px)`, slab(bw, bh, Td, br, {
    front: chin ? c : metal(c), edge: c, light: -90,
    inner: div('glass', `left:${rim}px;top:${rim}px;width:${bw - rim * 2}px;height:${glassH}px;border-radius:${chin ? `${br - rim}px ${br - rim}px 0 0` : `${br - rim}px`};background:${color.front}`) + bezelCamera(d.cutout, rim, rim, bw - rim * 2, glassH, bz),
    back: `linear-gradient(200deg, ${lighten(c, 14)}, ${c} 50%, ${darken(c, 8)})`,
  }));
  return {
    W: cam.W, H: cam.H, frame: f, screen: { x: 0, y: 0, w, h, radius: '0' }, cutout: '',
    three: { ...cam, lid: null, screen: () => `translate3d(${-bw / 2 + rim + bz.l}px,${-bh + rim + bz.t}px,1px)` },
  };
}

const VARIANTS = {
  laptop: { deck: buildLaptopDeck, '3d': buildLaptop3d },
  desktop: { deck: buildDesktopDeck, '3d': buildDesktop3d },
};

// ─── status bar & home indicator (logical, upright coordinates) ────────────

function statusBar(d, lw, safe, theme) {
  const ink = theme === 'dark' ? '#fff' : '#000';
  const cut = d.cutout;
  const icons = `<div class="icons" style="color:${ink}">${ICON.signal}${ICON.wifi}${ICON.battery}</div>`;
  switch (d.statusBar) {
    case 'ios': {
      const cw = cut?.w ?? 0;
      const cy = cut?.type === 'island' ? cut.top + cut.h / 2 : cut?.type === 'notch' ? cut.h / 2 + 3 : safe.t / 2;
      const ear = (lw - cw) / 2, fs = safe.t >= 40 ? 17 : 12;
      return div('sb', `left:0;width:${ear}px;top:${cy}px;transform:translateY(-50%);text-align:center;font:600 ${fs}px/1 ${FONT};color:${ink}`, '9:41') +
        `<div class="icons" style="left:${lw - ear}px;width:${ear}px;top:${cy}px;transform:translateY(-50%) scale(${fs / 17});color:${ink}">${ICON.signal}${ICON.wifi}${ICON.battery}</div>`;
    }
    case 'android': {
      const cy = cut?.type === 'hole' ? cut.top + cut.d / 2 : 14;
      return div('sb', `left:24px;top:${cy}px;transform:translateY(-50%);font:500 14px/1 Roboto, ${FONT};color:${ink}`, '9:41') +
        div('sb', `right:20px;top:${cy}px;transform:translateY(-50%) scale(.82);transform-origin:right center`, icons);
    }
    case 'ipados':
      return div('sb', `left:22px;top:12px;transform:translateY(-50%);font:600 13px/1 ${FONT};color:${ink}`, '9:41&nbsp;&nbsp;<span style="font-weight:500">Sat Sep 26</span>') +
        div('sb', `right:22px;top:12px;transform:translateY(-50%) scale(.8);transform-origin:right center`, icons);
    case 'macos': {
      const menu = ['Finder', 'File', 'Edit', 'View', 'Go', 'Window', 'Help'].map((m, i) => `<span style="font-weight:${i ? 400 : 700}">${m}</span>`).join('');
      const text = `font:13px/1 ${FONT};color:${ink};display:flex;gap:18px;align-items:center`;
      return div('menubar', `left:0;top:0;width:${lw}px;height:${safe.t}px;background:${theme === 'dark' ? 'rgba(30,30,32,.7)' : 'rgba(255,255,255,.72)'};backdrop-filter:blur(20px)`) +
        div('sb', `left:18px;top:${safe.t / 2}px;transform:translateY(-50%);${text}`, menu) +
        div('sb', `right:18px;top:${safe.t / 2}px;transform:translateY(-50%);${text}`, 'Sat Sep 26&nbsp; 9:41');
    }
    case 'watch':
      return div('sb', `right:24px;top:14px;font:600 16px/1 ${FONT};color:#fff`, '10:09');
    default:
      return '';
  }
}

function homeIndicator(d, lw, lh, theme) {
  const ink = theme === 'dark' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.85)';
  if (d.home === 'indicator') {
    const w = d.kind === 'tablet' ? Math.min(lw * 0.3, 320) : Math.min(lw * 0.35, 140);
    return div('home', `left:${(lw - w) / 2}px;top:${lh - 13}px;width:${w}px;height:5px;border-radius:3px;background:${ink}`);
  }
  if (d.home === 'pill') {
    return div('home', `left:${(lw - 108) / 2}px;top:${lh - 12}px;width:108px;height:4px;border-radius:2px;background:${ink}`);
  }
  return '';
}

// ─── fit logic ─────────────────────────────────────────────────────────────
// Pure so it can be unit-tested and reused by other tooling.
export function resolveFit(requested, kind, media, box) {
  if (requested && requested !== 'auto') return requested === 'scroll' && kind !== 'image' ? 'contain' : requested;
  if (!media || !box.w || !box.h) return 'cover';
  const q = (media.w / media.h) / (box.w / box.h);
  if (Math.abs(q - 1) <= 0.04) return 'cover';        // same shape: crop at most a few px
  if (q < 1) return kind === 'image' && q < 0.85 ? 'scroll' : 'top'; // taller: long screenshot / keep the top
  return 'contain';                                   // wider: letterbox with sampled edge colours
}

function sampleEdges(img) {
  try {
    const c = document.createElement('canvas');
    c.width = 8; c.height = 32;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, 8, 32);
    const avg = (y) => {
      const p = g.getImageData(0, y, 8, 1).data;
      let r = 0, gg = 0, b = 0;
      for (let i = 0; i < p.length; i += 4) { r += p[i]; gg += p[i + 1]; b += p[i + 2]; }
      return `rgb(${Math.round(r / 8)} ${Math.round(gg / 8)} ${Math.round(b / 8)})`;
    };
    return { top: avg(0), bottom: avg(31) };
  } catch {
    return null; // cross-origin image without CORS: fall back to black bars
  }
}

// ─── element ───────────────────────────────────────────────────────────────

export class BezelDevice extends HTMLElement {
  static observedAttributes = ATTRS;

  #stage; #device; #frame; #screen; #content; #media; #chrome; #cutout; #dyn;
  #size = { W: 0, H: 0 };
  #box = { w: 0, h: 0 };
  #mediaKey = null;
  #kind = 'slot';
  #natural = null;
  #fit = 'cover';
  #queued = false;
  #ro = null;
  // variant="3d" state: live camera/lid (drag and open()/close() change these without re-rendering)
  #three = null; #lidEl = null; #rx = 0; #ry = 0; #lid = 0; #lidMax = null; #poseKey = ''; #anim = null; #spin = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLES}${SOLID_CSS}</style><style></style>
      <div class="stage" part="stage"><div class="device" part="device">
        <div class="frame" part="frame" aria-hidden="true"></div>
        <div class="screen" part="screen">
          <div class="content" part="content"><div class="media" part="media"></div><div class="chrome" aria-hidden="true"></div></div>
          <div class="cutout" aria-hidden="true"></div><div class="glare" aria-hidden="true"></div>
        </div>
      </div></div>`;
    const q = (s) => root.querySelector(s);
    this.#dyn = root.querySelectorAll('style')[1];
    this.#stage = q('.stage'); this.#device = q('.device'); this.#frame = q('.frame'); this.#screen = q('.screen');
    this.#content = q('.content'); this.#media = q('.media'); this.#chrome = q('.chrome'); this.#cutout = q('.cutout');
    this.addEventListener('pointerdown', (e) => this.#grab(e));
  }

  connectedCallback() {
    this.#render();
    this.#ro ??= new ResizeObserver(() => this.#scale());
    this.#ro.observe(this);
  }

  disconnectedCallback() { this.#ro?.disconnect(); this.#spin?.stop(); }

  attributeChangedCallback(name) {
    if (name === 'rotate-x' || name === 'rotate-y') this.#poseKey = ''; // re-aim a dragged camera
    if (!this.isConnected || this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => { this.#queued = false; this.#render(); });
  }

  /** The device spec currently rendered. */
  get spec() { return resolveDevice(this.getAttribute('device')); }
  /** The fit mode actually applied after `fit="auto"` resolution. */
  get resolvedFit() { return this.#fit; }
  /** Screen size in CSS px, in the current orientation (the space your content gets). */
  get screenSize() { return { ...this.#box }; }
  /** Live camera and lid angles of variant="3d" (they drift from the attributes while dragging/animating). */
  get pose() { return { rotateX: this.#rx, rotateY: this.#ry, lidAngle: this.#lid }; }
  /** Swing a variant="3d" laptop lid open to `lid-angle`. Resolves when it settles. */
  open() { return this.#swing(this.#lidMax ?? 105); }
  /** Swing a variant="3d" laptop lid shut. Resolves when it settles. */
  close() { return this.#swing(0); }

  #render() {
    const d = this.spec;
    const attr = (n) => this.getAttribute(n);
    const theme = attr('theme') === 'dark' ? 'dark' : 'light';
    const color = resolveColor(d, attr('color'));
    const landscape = attr('orientation') === 'landscape' && (d.kind === 'phone' || d.kind === 'tablet');
    const rotatesChrome = landscape && d.kind === 'phone';

    let screen = { w: d.screen.w, h: d.screen.h };
    const vp = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(attr('viewport') ?? '');
    if (vp && d.kind === 'browser') screen = { w: +vp[1], h: +vp[2] };

    const pose = readPose(this, d.kind);
    const L = (VARIANTS[d.kind]?.[attr('variant')] ?? BUILDERS[d.kind])(d, color, screen, { theme, url: attr('url'), pose });
    const [lw, lh] = landscape ? [screen.h, screen.w] : [screen.w, screen.h];
    const [TW, TH] = landscape ? [L.H, L.W] : [L.W, L.H];
    this.#size = { W: TW, H: TH };

    // media kind
    const src = attr('src');
    const type = attr('type');
    this.#kind = !src ? 'slot' : type && ['image', 'video', 'iframe'].includes(type) ? type : IMG_RE.test(src) || src.startsWith('blob:') ? 'image' : VID_RE.test(src) ? 'video' : 'iframe';
    const interactive = this.#kind === 'slot' || this.#kind === 'iframe';

    const chromeAttr = attr('chrome') ?? 'auto';
    const chromeOn = chromeAttr === 'on' || (chromeAttr === 'auto' && interactive);
    const safeAttr = attr('safe-area') ?? 'auto';
    const pad = safeAttr === 'pad' || (safeAttr === 'auto' && interactive);

    const st = d.safe?.top ?? 0, sb = d.safe?.bottom ?? 0;
    const safe = rotatesChrome ? { t: 0, r: st, b: sb ? 21 : 0, l: st } : { t: st, r: 0, b: sb, l: 0 };
    const inset = pad ? safe : { t: 0, r: 0, b: 0, l: 0 };
    this.#box = { w: lw - inset.l - inset.r, h: lh - inset.t - inset.b };

    // geometry
    this.#dyn.textContent = `:host { aspect-ratio: ${TW} / ${TH}; }`;
    Object.assign(this.#stage.style, { width: `${TW}px`, height: `${TH}px` });
    Object.assign(this.#device.style, { width: `${L.W}px`, height: `${L.H}px`, transform: landscape ? `translateY(${L.W}px) rotate(-90deg)` : '' });
    this.#frame.innerHTML = L.frame;
    Object.assign(this.#screen.style, { left: `${L.screen.x}px`, top: `${L.screen.y}px`, width: `${screen.w}px`, height: `${screen.h}px`, borderRadius: L.screen.radius });
    Object.assign(this.#content.style, { width: `${lw}px`, height: `${lh}px`, transform: landscape ? `translateX(${screen.w}px) rotate(90deg)` : '' });
    this.#content.style.setProperty('--_safe-bg', theme === 'dark' ? '#000' : '#fff');
    Object.assign(this.#media.style, { top: `${inset.t}px`, right: `${inset.r}px`, bottom: `${inset.b}px`, left: `${inset.l}px` });
    for (const [k, v] of Object.entries({ top: safe.t, right: safe.r, bottom: safe.b, left: safe.l })) {
      this.#media.style.setProperty(`--bezel-safe-${k}`, pad ? '0px' : `${v}px`);
    }
    this.#media.style.setProperty('--bezel-screen-width', `${this.#box.w}px`);
    this.#media.style.setProperty('--bezel-screen-height', `${this.#box.h}px`);
    // iOS/Android hide the status bar in landscape; the home indicator stays.
    this.#chrome.innerHTML = chromeOn ? (rotatesChrome ? '' : statusBar(d, lw, safe, theme)) + homeIndicator(d, lw, lh, theme) : '';
    this.#cutout.innerHTML = L.cutout;
    this.#solid(L.three, pose);

    this.#renderMedia(src);
    this.#applyFit();
    this.#scale();
  }

  #renderMedia(src) {
    const key = `${this.#kind}|${src}`;
    const m = this.#media;
    if (key !== this.#mediaKey) {
      this.#mediaKey = key;
      this.#natural = null;
      m.classList.toggle('slot', this.#kind === 'slot');
      m.style.removeProperty('--_lb-top'); m.style.removeProperty('--_lb-bottom');
      if (this.#kind === 'slot') {
        m.innerHTML = '<slot></slot>';
      } else if (this.#kind === 'image') {
        const img = new Image();
        img.decoding = 'async';
        img.setAttribute('part', 'image');
        if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
        // Ignore late loads from an element that has since been replaced by a newer src.
        img.onload = () => m.firstElementChild === img && this.#onNatural(img.naturalWidth, img.naturalHeight, img);
        img.onerror = () => {
          // Retry once without CORS — the image still shows, we just can't sample edge colours.
          if (img.crossOrigin) { img.removeAttribute('crossorigin'); img.src = src; }
        };
        img.src = src;
        m.replaceChildren(img);
      } else if (this.#kind === 'video') {
        const v = document.createElement('video');
        Object.assign(v, { src, autoplay: true, muted: true, loop: true, playsInline: true });
        v.setAttribute('part', 'video');
        v.onloadedmetadata = () => m.firstElementChild === v && this.#onNatural(v.videoWidth, v.videoHeight);
        m.replaceChildren(v);
      } else {
        const f = document.createElement('iframe');
        f.setAttribute('part', 'iframe');
        f.loading = 'lazy';
        f.src = src;
        m.replaceChildren(f);
      }
    }
    const el = m.firstElementChild;
    const alt = this.getAttribute('alt');
    if (el instanceof HTMLImageElement) el.alt = alt ?? '';
    else if (el instanceof HTMLIFrameElement) el.title = alt ?? 'Embedded page';
  }

  #onNatural(w, h, img) {
    this.#natural = { w, h };
    if (img) {
      const edges = sampleEdges(img);
      if (edges) {
        this.#media.style.setProperty('--_lb-top', edges.top);
        this.#media.style.setProperty('--_lb-bottom', edges.bottom);
      }
    }
    this.#applyFit();
  }

  #applyFit() {
    const req = FITS.includes(this.getAttribute('fit')) ? this.getAttribute('fit') : 'auto';
    const media = this.#kind === 'image' || this.#kind === 'video' ? this.#natural : null;
    const fit = this.#kind === 'image' || this.#kind === 'video' ? resolveFit(req, this.#kind, media, this.#box) : 'cover';
    this.#fit = fit;
    this.#media.dataset.fit = fit;
    if (media) {
      const mediaRatio = media.w / media.h, screenRatio = this.#box.w / this.#box.h;
      this.dispatchEvent(new CustomEvent('bezel-fit', {
        bubbles: true,
        detail: { requested: req, fit, media: { ...media }, screen: { ...this.#box }, mediaRatio, screenRatio, mismatch: mediaRatio / screenRatio },
      }));
    }
  }

  // ── variant="3d": camera, lid and drag ──
  #solid(three, pose) {
    const key = `${pose.rx}|${pose.ry}`;
    if (key !== this.#poseKey || !pose.interactive) { this.#poseKey = key; this.#rx = pose.rx; this.#ry = pose.ry; }
    if (pose.lidMax !== this.#lidMax) { this.#lidMax = pose.lidMax; if (!this.#anim) this.#lid = pose.lidMax; }
    if (!three) this.#spin?.stop();
    this.#three = three ?? null;
    this.#lidEl = this.#frame.querySelector('.lid3');
    this.#pose();
  }

  #pose() {
    const t = this.#three, dv = this.#device;
    dv.classList.toggle('v3d', !!t);
    if (!t) {
      if (dv.style.perspective) this.#frame.style.transform = this.#screen.style.transform = dv.style.perspective = dv.style.perspectiveOrigin = '';
      return;
    }
    const cam = `translate3d(${t.ox}px,${t.oy}px,0) rotateX(${-this.#rx}deg) rotateY(${this.#ry}deg) translate3d(${-t.c[0]}px,${-t.c[1]}px,${-t.c[2]}px)`;
    Object.assign(dv.style, { perspective: `${t.P}px`, perspectiveOrigin: `${t.ox}px ${t.oy}px` });
    this.#frame.style.transform = cam;
    this.#screen.style.transform = `${cam} ${t.screen(this.#lid)}`;
    if (this.#lidEl && t.lid) this.#lidEl.style.transform = t.lid(this.#lid);
  }

  #swing(to) {
    this.#anim?.end();
    const from = this.#lid, lidded = !!this.#three?.lid;
    const settle = () => this.dispatchEvent(new CustomEvent('bezel-lid', { bubbles: true, detail: { angle: this.#lid, open: this.#lid > 0 } }));
    if (!lidded || reducedMotion() || from === to || !this.isConnected) {
      this.#lid = to; this.#pose(); settle();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const t0 = performance.now(), dur = 280 + Math.abs(to - from) * 7;
      const a = { raf: 0, end: () => { cancelAnimationFrame(a.raf); if (this.#anim === a) this.#anim = null; resolve(); } };
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1), e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
        this.#lid = from + (to - from) * e; this.#pose();
        if (p < 1) a.raf = requestAnimationFrame(step); else { a.end(); settle(); }
      };
      this.#anim = a; a.raf = requestAnimationFrame(step);
    });
  }

  #grab(e) {
    const on = this.getAttribute('interactive');
    if (!this.#three || on == null || on === 'false' || e.button > 0) return;
    // Leave live screens (slotted HTML, iframes) usable: drag from the body, not the glass.
    if ((this.#kind === 'slot' || this.#kind === 'iframe') && e.composedPath().includes(this.#screen)) return;
    e.preventDefault();
    this.#spin?.stop();
    try { this.setPointerCapture(e.pointerId); } catch {} // synthetic events have no live pointer
    this.#device.classList.add('grabbing');
    const k = 0.4; // deg per CSS px
    let lx = e.clientX, ly = e.clientY, lt = e.timeStamp, vx = 0, vy = 0;
    const move = (ev) => {
      const dt = Math.max(ev.timeStamp - lt, 1), dx = (ev.clientX - lx) * k, dy = (ev.clientY - ly) * k;
      lx = ev.clientX; ly = ev.clientY; lt = ev.timeStamp;
      vx = 0.7 * (dx / dt) + 0.3 * vx; vy = 0.7 * (dy / dt) + 0.3 * vy;
      this.#turn(dx, dy);
    };
    const up = (ev) => {
      for (const [n, fn] of [['pointermove', move], ['pointerup', up], ['pointercancel', up]]) this.removeEventListener(n, fn);
      this.#device.classList.remove('grabbing');
      if (ev.type === 'pointerup' && ev.timeStamp - lt < 80 && !reducedMotion()) this.#coast(vx, vy);
    };
    for (const [n, fn] of [['pointermove', move], ['pointerup', up], ['pointercancel', up]]) this.addEventListener(n, fn);
  }

  #turn(dx, dy) {
    this.#ry = (((this.#ry + dx + 180) % 360) + 360) % 360 - 180;
    this.#rx = clamp(this.#rx + dy, ...RX_RANGE);
    this.#pose();
  }

  // Inertia after a fling: velocity in deg/ms decays ~6% per 16 ms frame.
  #coast(vx, vy) {
    let last = performance.now();
    const spin = { raf: 0, stop: () => { cancelAnimationFrame(spin.raf); if (this.#spin === spin) this.#spin = null; } };
    const step = (now) => {
      const dt = Math.min(now - last, 48), f = 0.94 ** (dt / 16);
      last = now; vx *= f; vy *= f;
      this.#turn(vx * dt, vy * dt);
      if (Math.hypot(vx, vy) > 0.004) spin.raf = requestAnimationFrame(step); else spin.stop();
    };
    this.#spin = spin; spin.raf = requestAnimationFrame(step);
  }

  #scale() {
    const { W, H } = this.#size;
    const cw = this.clientWidth, ch = this.clientHeight;
    if (!W || !cw) return;
    const s = Math.min(cw / W, ch ? ch / H : Infinity);
    const x = (cw - W * s) / 2, y = ch ? (ch - H * s) / 2 : 0;
    this.#stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }
}

function resolveDevice(id) {
  const d = getDevice(id || 'iphone-17-pro');
  if (d) return d;
  console.warn(`bezelkit: unknown device "${id}". Available: ${listDevices().map((x) => x.id).join(', ')}`);
  return getDevice('iphone-17-pro');
}

// Reflect attributes as camelCase properties: el.safeArea = 'pad', el.device = 'pixel-10-pro'
for (const name of ATTRS) {
  const prop = name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  Object.defineProperty(BezelDevice.prototype, prop, {
    get() { return this.getAttribute(name); },
    set(v) { v == null || v === false ? this.removeAttribute(name) : this.setAttribute(name, v === true ? '' : v); },
    configurable: true,
  });
}

if (!customElements.get('bezel-device')) customElements.define('bezel-device', BezelDevice);
