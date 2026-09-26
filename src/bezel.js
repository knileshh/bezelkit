// bezelkit — <bezel-device>: accurate, responsive device frames that fit your content.
// Zero dependencies. MIT.
import { getDevice, listDevices, defineDevice } from './devices.js';

export { getDevice, listDevices, defineDevice };

const ATTRS = ['device', 'color', 'orientation', 'src', 'type', 'fit', 'chrome', 'safe-area', 'theme', 'url', 'viewport', 'glare', 'shadow', 'alt', 'side', 'stack', 'logo'];
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
.back { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.back > * { position: absolute; box-sizing: border-box; }
.device, .back { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
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

// ─── back panels ───────────────────────────────────────────────────────────
// Drawn as seen from behind, in the same W×H box as the front: padding and side buttons are
// mirrored, so a rotateY(180deg) turn lands the outline exactly on the front's. Camera geometry
// lives in each device's `back` entry (see devices.js); coordinates are px from the body's
// top-left corner as seen from behind.

const SIDES = ['front', 'back', 'both'];
const FINISH = {
  glass: (c) => `linear-gradient(160deg, ${lighten(c, 9)} 0%, ${c} 42%, ${darken(c, 7)} 100%)`,
  gloss: (c) => `linear-gradient(160deg, ${lighten(c, 22)} 0%, ${c} 30%, ${darken(c, 12)} 72%, ${lighten(c, 6)} 100%)`,
  aluminium: (c) => `linear-gradient(135deg, ${lighten(c, 16)} 0%, ${c} 35%, ${darken(c, 9)} 75%, ${lighten(c, 4)} 100%)`,
  titanium: (c) => `linear-gradient(135deg, ${lighten(c, 14)} 0%, ${darken(c, 5)} 45%, ${lighten(c, 7)} 100%)`,
  polished: metal,
  dark: () => 'radial-gradient(120% 90% at 30% 20%, #34353b 0%, #111114 55%, #050506 100%)',
};
const SHEEN = { glass: 0.1, gloss: 0.24, aluminium: 0.08, titanium: 0.1, polished: 0.14, dark: 0.12 };
const RAISED = '0 1px 1.5px rgba(0,0,0,.3), 0 6px 14px -6px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.3), inset 0 -1px 1px rgba(0,0,0,.18)';
const finish = (f, c) => (FINISH[f] ?? FINISH.glass)(c);
const sheen = (f) => { const a = SHEEN[f] ?? 0.1; return `linear-gradient(115deg, rgba(255,255,255,${a}) 0%, rgba(255,255,255,${a * 0.3}) 28%, transparent 46%, rgba(255,255,255,${a * 0.35}) 74%, transparent 90%)`; };
const backTint = (d, color) => d.colors.find(([n]) => n === color.name)?.[3] ?? color.frame;

// Raised module (plateau, bar, bump) or flush window; { x, y, w, h, r, tone?, fill?, flat? }.
function plate(p, c, x0, y0, fallback) {
  const fill = p.fill ?? finish(p.tone ?? fallback, c);
  const r = typeof p.r === 'number' ? `${p.r}px` : p.r ?? '0';
  return div('plate', `left:${x0 + p.x}px;top:${y0 + p.y}px;width:${p.w}px;height:${p.h}px;border-radius:${r};background:${fill};box-shadow:${p.flat ? 'inset 0 0 0 1px rgba(0,0,0,.07), inset 0 1px 2px rgba(0,0,0,.1)' : RAISED}`);
}

// One element of a camera module, centred on (x, y); { x, y, d, kind: lens|flash|lidar|sensor|mic }.
function part({ x, y, d = 16, kind = 'lens' }, x0, y0, c) {
  const at = `left:${x0 + x - d / 2}px;top:${y0 + y - d / 2}px;width:${d}px;height:${d}px;border-radius:50%`;
  switch (kind) {
    case 'flash': return div('flash', `${at};background:radial-gradient(circle, #fbf8ef 0 34%, #e6dfcc 56%, #c2baa5 74%, ${darken(c, 22)} 80%, ${darken(c, 40)} 100%)`);
    case 'lidar': return div('lidar', `${at};background:radial-gradient(circle at 42% 38%, #34353c 0 16%, #0d0d10 60%, ${darken(c, 25)} 68%, ${darken(c, 45)} 100%)`);
    case 'sensor': return div('sensor', `${at};background:radial-gradient(circle at 44% 40%, #2c2d34 0 34%, #131317 56%, #3a3b42 68%, #101013 100%)`);
    case 'mic': return div('mic', `${at};background:#060607;box-shadow:inset 0 1px 1px rgba(0,0,0,.8), 0 1px 0 rgba(255,255,255,.18)`);
    default: {
      const g = d * 0.5;
      return div('lens', `${at};background:radial-gradient(circle, #0a0b0e 0 69%, #2a2b30 71%, ${lighten(c, 30)} 75%, ${c} 86%, ${darken(c, 30)} 97%);box-shadow:0 2px 5px rgba(0,0,0,.35), 0 0 0 .5px ${darken(c, 40)}`,
        `<div style="position:absolute;left:${(d - g) / 2}px;top:${(d - g) / 2}px;width:${g}px;height:${g}px;border-radius:50%;background:radial-gradient(circle at 36% 32%, rgba(170,195,255,.55) 0 7%, transparent 16%), radial-gradient(circle at 64% 68%, rgba(150,95,230,.32) 0 9%, transparent 24%), radial-gradient(circle, #1b2030 0 16%, #07080c 46%, #000 72%, #1a1b20 100%)"></div>`);
    }
  }
}

function camera(cam, c, ring, x0, y0, fallback) {
  return (cam.plates ?? []).map((p) => plate(p, c, x0, y0, fallback)).join('') + (cam.parts ?? []).map((p) => part(p, x0, y0, ring)).join('');
}

// Neutral placeholder only: brand logos are trademarks and are never drawn.
const logoMark = (logo, cx, cy, s, c) => logo !== 'dot' ? '' :
  div('logo', `left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle at 40% 35%, ${lighten(c, 16)}, ${darken(c, 6)});box-shadow:inset 0 1px 1px rgba(255,255,255,.25), inset 0 -1px 1px rgba(0,0,0,.14)`);

// Used when a device has no back.camera entry (e.g. defineDevice() without one).
function defaultCamera(kind, bw, bh) {
  const m = Math.min(bw, bh);
  if (kind === 'watch') {
    const D = m * 0.74, cx = bw / 2, cy = bh / 2;
    return { plates: [{ x: cx - D / 2, y: cy - D / 2, w: D, h: D, r: '50%', tone: 'dark' }], parts: [{ x: cx, y: cy, d: D * 0.2, kind: 'sensor' }] };
  }
  const d = Math.max(m * (kind === 'tablet' ? 0.055 : 0.16), 18);
  return { parts: [{ x: d, y: d, d }, { x: d * 2.1, y: d * 0.8, d: d * 0.28, kind: 'flash' }] };
}

function backHandheld(d, color, screen, logo) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 8), rim = d.rim ?? 4, p = box(d.pad ?? 4);
  const bw = w + bz.l + bz.r + rim * 2, bh = h + bz.t + bz.b + rim * 2;
  const br = d.bodyRadius ?? (d.screen.radius ?? 0) + Math.max(bz.l, bz.t) + rim;
  const x0 = p.r, y0 = p.t; // from behind, the front's right padding is on the left
  const spec = d.back ?? {}, fin = spec.finish ?? 'glass', c = backTint(d, color);
  const swap = { left: 'right', right: 'left' };
  const inner = `left:${x0 + rim}px;top:${y0 + rim}px;width:${bw - rim * 2}px;height:${bh - rim * 2}px;border-radius:${Math.max(br - rim, 0)}px`;

  let f = (d.buttons ?? []).map((b) => button(swap[b.side] ? { ...b, side: swap[b.side] } : { ...b, at: bw - b.at - b.len }, x0, y0, bw, bh, color.frame)).join('');
  f += div('body', `left:${x0}px;top:${y0}px;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${metal(color.frame)}`);
  f += div('panel', `${inner};background:${finish(fin, c)}`);
  if (spec.window) f += plate({ flat: true, ...spec.window }, c, x0, y0, 'glass');
  f += div('sheen', `${inner};background:${sheen(fin)}`);
  f += camera(spec.camera ?? defaultCamera(d.kind, bw, bh), c, color.frame, x0, y0, fin);
  return f + logoMark(logo, x0 + bw / 2, y0 + (spec.logo?.y ?? bh / 2), Math.min(bw, bh) * 0.11, c);
}

function backLaptop(d, color, screen, logo) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 14), rim = d.rim ?? 2, lr = d.lidRadius ?? 18;
  const lw = w + bz.l + bz.r + rim * 2, lh = h + bz.t + bz.b + rim * 2;
  const ov = d.base?.overhang ?? Math.round(lw * 0.07), bh = d.base?.h ?? 18, W = lw + ov * 2;
  const fin = d.back?.finish ?? 'aluminium', c = backTint(d, color);
  const lid = `left:${ov}px;top:0;width:${lw}px;height:${lh}px;border-radius:${lr}px ${lr}px 6px 6px`;

  // From behind the lid is nearest, so the base's rear edge sits under it.
  let f = div('body', `left:0;top:${lh - 1}px;width:${W}px;height:${bh + 1}px;border-radius:3px 3px ${W * 0.045}px ${W * 0.045}px / 3px 3px ${bh * 0.9}px ${bh * 0.9}px;background:linear-gradient(to bottom, ${darken(c, 14)}, ${darken(c, 34)})`);
  f += div('body', `${lid};background:${finish(fin, c)}`);
  f += div('sheen', `${lid};background:${sheen(fin)}`);
  f += div('hinge', `left:${ov + lw * 0.1}px;top:${lh - 9}px;width:${lw * 0.8}px;height:9px;border-radius:0 0 5px 5px;background:linear-gradient(${darken(c, 40)}, ${darken(c, 58)})`);
  return f + logoMark(logo, ov + lw / 2, d.back?.logo?.y ?? lh / 2, lh * 0.1, c);
}

function backDesktop(d, color, screen, logo) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 34), rim = d.rim ?? 0, chin = d.chin ?? 0;
  const sw = d.stand?.w ?? 440, sh = d.stand?.h ?? 360, foot = 16, br = 26;
  const bw = w + bz.l + bz.r + rim * 2, bh = h + bz.t + bz.b + chin + rim * 2;
  const fin = d.back?.finish ?? 'aluminium', c = backTint(d, color);
  const top = d.back?.stand ?? bh * 0.45; // where the stand meets the back

  let f = div('body', `left:0;top:0;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${finish(fin, c)}`);
  f += div('sheen', `left:0;top:0;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${sheen(fin)}`);
  f += div('neck', `left:${(bw - sw) / 2}px;top:${top}px;width:${sw}px;height:${bh + sh - top}px;border-radius:${sw * 0.04}px ${sw * 0.04}px 0 0;background:linear-gradient(to bottom, rgba(0,0,0,.18), transparent 8%), linear-gradient(to right, ${darken(c, 14)}, ${c} 6%, ${lighten(c, 8)} 50%, ${c} 94%, ${darken(c, 14)});box-shadow:0 6px 18px -6px rgba(0,0,0,.35)`);
  f += div('body', `left:${(bw - sw * 1.12) / 2}px;top:${bh + sh}px;width:${sw * 1.12}px;height:${foot}px;border-radius:3px 3px 10px 10px;background:linear-gradient(${lighten(c, 16)}, ${darken(c, 22)})`);
  return f + logoMark(logo, bw / 2, d.back?.logo?.y ?? bh * 0.27, bh * 0.09, c);
}

const BACKS = { phone: backHandheld, tablet: backHandheld, watch: backHandheld, laptop: backLaptop, desktop: backDesktop };

// Transforms for each face. `turn(a, back)` is the flip keyframe at angle a (deg), pivoting on the
// centre and scaled so the near edge never pokes out of the box under perspective.
function placeSides(side, stack, kind, L, TW, TH, landscape) {
  const land = landscape ? `translateY(${L.W}px) rotate(-90deg)` : '';
  const flat = `translateX(${TW}px) scaleX(-1) ${land} translateX(${L.W}px) scaleX(-1)`; // back, seen from behind
  const cx = TW / 2, cy = TH / 2, per = TW * 3;
  const turn = (a, back) => {
    const s = per / (per + cx * Math.abs(Math.sin((a * Math.PI) / 180)));
    return `translate(${cx}px, ${cy}px) perspective(${per}px) rotateY(${a}deg) scale(${s}) translate(${-cx}px, ${-cy}px) ${land} ${back ? `translateX(${L.W}px) rotateY(180deg)` : ''}`;
  };
  if (side !== 'both') return { side, W: TW, H: TH, front: land, back: flat, turn };

  // Stacked hero shot: the back peeks out from one side, tilted, with the front overlapping it.
  const dir = stack === 'right' ? 1 : -1;
  const [kx, ky, deg] = kind === 'desktop' ? [0.36, -0.07, 0] : TW > TH ? [0.34, -0.12, 3] : [0.5, -0.05, 7]; // desktops stand level
  const rad = (deg * Math.PI) / 180;
  const bw = TW * Math.cos(rad) + TH * Math.sin(rad), bh = TW * Math.sin(rad) + TH * Math.cos(rad);
  const ox = dir * kx * TW, oy = ky * TH; // back centre relative to the front's
  const x0 = Math.min(-cx, ox - bw / 2), y0 = Math.min(-cy, oy - bh / 2);
  return {
    side, turn, W: Math.max(cx, ox + bw / 2) - x0, H: Math.max(cy, oy + bh / 2) - y0,
    front: `translate(${-cx - x0}px, ${-cy - y0}px) ${land}`,
    back: `translate(${ox - x0}px, ${oy - y0}px) rotate(${dir * deg}deg) translate(${-cx}px, ${-cy}px) ${flat}`,
  };
}

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
  #back; #side = null; #hasBack = false; #turns = []; #waiters = [];

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLES}</style><style></style>
      <div class="stage" part="stage"><div class="back" part="back" aria-hidden="true"></div><div class="device" part="device">
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
    this.#back = q('.back');
  }

  connectedCallback() {
    this.#render();
    this.#ro ??= new ResizeObserver(() => this.#scale());
    this.#ro.observe(this);
  }

  disconnectedCallback() { this.#ro?.disconnect(); }

  attributeChangedCallback() {
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

  /** Turn the device over (or to `side`). Resolves with the new side once the turn has finished. */
  flip(side) {
    const next = side ?? (this.getAttribute('side') === 'back' ? 'front' : 'back');
    if (!this.isConnected) { this.setAttribute('side', next); return Promise.resolve(next); }
    return new Promise((res) => { this.#waiters.push(res); this.setAttribute('side', next); });
  }

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

    const L = BUILDERS[d.kind](d, color, screen, { theme, url: attr('url') });
    const [lw, lh] = landscape ? [screen.h, screen.w] : [screen.w, screen.h];
    const [TW, TH] = landscape ? [L.H, L.W] : [L.W, L.H];
    const S = this.#sides(d, color, screen, L, TW, TH, landscape); // back panel; S.W × S.H includes a stacked back
    this.#size = { W: S.W, H: S.H };

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
    this.#dyn.textContent = `:host { aspect-ratio: ${S.W} / ${S.H}; }`;
    Object.assign(this.#stage.style, { width: `${S.W}px`, height: `${S.H}px` });
    Object.assign(this.#device.style, { width: `${L.W}px`, height: `${L.H}px`, transform: S.front, visibility: S.side === 'back' ? 'hidden' : '' });
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

    this.#renderMedia(src);
    this.#applyFit();
    this.#scale();
    this.#turn(S);
  }

  // Back panel + placement of both faces. The back is only built once a side other than front is asked for.
  #sides(d, color, screen, L, TW, TH, landscape) {
    const build = BACKS[d.kind];
    const want = build ? SIDES.find((s) => s === this.getAttribute('side')) ?? 'front' : 'front';
    this.#hasBack ||= want !== 'front';
    const S = placeSides(want, this.getAttribute('stack'), d.kind, L, TW, TH, landscape);
    this.#back.innerHTML = build && this.#hasBack ? build(d, color, screen, this.getAttribute('logo')) : '';
    Object.assign(this.#back.style, { width: `${L.W}px`, height: `${L.H}px`, transform: S.back, visibility: want === 'front' ? 'hidden' : '' });
    return S;
  }

  // Animate front ↔ back with a rotateY turn; any other change applies instantly.
  #turn(S) {
    const prev = this.#side;
    this.#side = S.side;
    const flip = prev !== S.side && [prev, S.side].every((s) => s === 'front' || s === 'back');
    const live = this.#turns.filter((a) => a.playState === 'running');
    if (flip && live.length) { live.forEach((a) => a.reverse()); return; } // turned back mid-flip
    this.#turns.forEach((a) => a.cancel());
    this.#turns = [];
    if (!flip || !this.#device.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return this.#settle(flip);
    const from = prev === 'front' ? 0 : 180, n = 12;
    const frames = (back) => Array.from({ length: n + 1 }, (_, i) => ({ transform: S.turn(from + (180 * i) / n, back), visibility: 'visible' }));
    const opts = { duration: 800, easing: 'cubic-bezier(.62,0,.28,1)' };
    this.#turns = [this.#device.animate(frames(false), opts), this.#back.animate(frames(true), opts)];
    Promise.all(this.#turns.map((a) => a.finished)).then(() => this.#settle(true), () => {});
  }

  #settle(flipped) {
    this.#waiters.splice(0).forEach((res) => res(this.#side));
    if (flipped) this.dispatchEvent(new CustomEvent('bezel-flip', { bubbles: true, detail: { side: this.#side } }));
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
