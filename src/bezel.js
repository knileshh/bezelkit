// bezelkit — <bezel-device>: accurate, responsive device frames that fit your content.
// Zero dependencies. MIT.
import { getDevice, listDevices, defineDevice } from './devices.js';

export { getDevice, listDevices, defineDevice };

const ATTRS = ['device', 'color', 'orientation', 'src', 'type', 'fit', 'chrome', 'safe-area', 'theme', 'url', 'viewport', 'glare', 'shadow', 'alt', 'side', 'stack', 'logo'];
const FOLD_ATTRS = ['folded', 'cover-src', 'fold-angle', 'fold-box'];
const FITS = ['auto', 'cover', 'top', 'contain', 'scroll', 'fill', 'none'];
const IMG_RE = /(^data:image\/)|\.(png|jpe?g|webp|gif|avif|svg|bmp)([?#]|$)/i;
const VID_RE = /(^data:video\/)|\.(mp4|webm|mov|m4v|ogv)([?#]|$)/i;
// Single quotes only: this is interpolated into style="…" attributes.
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, system-ui, sans-serif";
const DEFAULT_FRONT = '#050506';
// Hex, named colours and colour functions with numeric arguments only: no var(), url() or quotes.
const SAFE_COLOR = /^(#[0-9a-f]{3,8}|[a-z]{3,30}|(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([\d\s.,%/+-]*(deg|turn|rad)?[\d\s.,%/+-]*\))$/i;

// H1: allow only schemes that can't run script in the host page.
function safeSrc(src) {
  if (!src) return null;
  try {
    const u = new URL(src, document.baseURI);
    if (u.protocol === 'http:' || u.protocol === 'https:' || u.protocol === 'blob:') return src;
    if (u.protocol === 'data:' && /^data:(image|video)\//i.test(src)) return src;
  } catch { /* fall through */ }
  console.warn(`bezelkit: refusing to load src with an unsupported scheme: ${String(src).slice(0, 40)}`);
  return null;
}

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

// Foldable layers, added only to foldable instances. Cover media reuses the .media fit rules.
const FOLD_STYLES = `
.fleaf { position: absolute; transform-style: preserve-3d; }
.fface { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.fface > *, .fwrap > * { position: absolute; box-sizing: border-box; }
.fwrap { left: 0; top: 0; }
.fshade { inset: 0; background: #000; opacity: 0; pointer-events: none; z-index: 6; }
.fedge { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.fcover { overflow: hidden; background: var(--bezel-screen-bg, #000); isolation: isolate; transform-origin: 0 0; }
.fcontent { position: absolute; left: 0; top: 0; transform-origin: 0 0; overflow: hidden; background: var(--bezel-safe-bg, var(--_safe-bg)); }
${STYLES.split('\n').filter((l) => l.startsWith('.media')).join('\n').replaceAll('.media', '.fmedia')}
.fchrome, .fcut, .fsheen, .ffx { position: absolute; inset: 0; pointer-events: none; }
.fchrome > *, .fcut > * { position: absolute; box-sizing: border-box; }
.fchrome { z-index: 2; } .fcut { z-index: 3; } .fsheen { z-index: 4; } .ffx { z-index: 5; }
`;
const ease = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const kindOf = (src) => (IMG_RE.test(src) || src.startsWith('blob:') ? 'image' : VID_RE.test(src) ? 'video' : 'iframe');

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
    if (SAFE_COLOR.test(value) && globalThis.CSS?.supports?.('color', value)) {
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
  const cx = cut.left ?? (w - (cut.w ?? cut.d ?? 0)) / 2;
  switch (cut.type) {
    case 'island-v': { // vertical Dynamic Island in the top-right corner (iPhone Duo)
      const x = w - cut.right - cut.w;
      return div('island', `left:${x}px;top:${cut.top}px;width:${cut.w}px;height:${cut.h}px;border-radius:${cut.w / 2}px;background:#000`) +
        div('lens', `left:${x + cut.w * 0.28}px;top:${cut.top + cut.w * 0.28}px;${lens(cut.w * 0.44)}`);
    }
    case 'flexcam': { // rear cameras the cover screen wraps around (Galaxy Z Flip)
      const d = cut.d, g = cut.gap ?? 8, ring = `;box-shadow:0 0 0 3px #2b2d31, 0 0 0 4.5px #8a8d93`;
      return div('cams', `left:${cut.left - 5}px;top:${cut.top - 5}px;width:${d * 2 + g + 10}px;height:${d + 10}px;border-radius:${d / 2 + 5}px;background:#000`) +
        div('lens', `left:${cut.left}px;top:${cut.top}px;${lens(d)}${ring}`) + div('lens', `left:${cut.left + d + g}px;top:${cut.top}px;${lens(d)}${ring}`);
    }
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

// ─── foldables ─────────────────────────────────────────────────────────────
// The body is sized from mm so the inner and cover displays share one physical scale.
// `frame` is the half that stays put; `fold` carries the moving half (the "leaf"): its front (the other half
// of the inner display) and its back (the cover display), both in leaf coordinates. The back is laid out as
// seen when closed, with the hinge on its left (book) or top (flip) edge.
function buildFoldable(d, color, screen) {
  const { w, h } = screen, cv = d.cover, c = color.frame;
  const book = d.fold !== 'flip', k = d.ppi / (d.dpr * 25.4), rim = d.rim ?? 3, pad = 4;
  const [ow, oh, od] = d.body.open, BW = ow * k, BH = oh * k;
  const r = d.screen.radius ?? 0, br = d.bodyRadius ?? r + Math.min(BW - w, BH - h) / 2, gr = Math.max(br - rim, 0);
  const sx = pad + (BW - w) / 2, sy = pad + (BH - h) / 2;
  const lw = book ? BW / 2 : BW, lh = book ? BH : BH / 2;
  const st = book ? { x: pad + lw, y: pad } : { x: pad, y: pad + lh };
  const skin = (x, y) => `background:${metal(c)} ${-x}px ${-y}px / ${BW}px ${BH}px`;
  const hr = 'var(--_hr, 0px)';
  const corners = (a, b, cc, dd) => `border-radius:${a} ${b} ${cc} ${dd}`;
  const btns = (d.buttons ?? []).map((b) => button(b, book ? pad : 0, book ? pad : 0, BW, BH, c)).join('');
  const R = `${br}px`, G = `${gr}px`;
  const leafR = book ? corners(R, 0, 0, R) : corners(R, R, 0, 0);

  let f = book ? btns : '';
  f += div('body', `left:${pad}px;top:${pad}px;width:${lw}px;height:${lh}px;${leafR};background:transparent;opacity:var(--_lsh, 1)`);
  f += div('body', `left:${st.x}px;top:${st.y}px;width:${lw}px;height:${lh}px;${skin(st.x - pad, st.y - pad)};${book ? corners(hr, R, R, hr) : corners(hr, hr, R, R)}`);
  f += div('glass', book
    ? `left:${st.x}px;top:${st.y + rim}px;width:${lw - rim}px;height:${lh - rim * 2}px;${corners(hr, G, G, hr)};background:${color.front}`
    : `left:${st.x + rim}px;top:${st.y}px;width:${lw - rim * 2}px;height:${lh - rim}px;${corners(hr, hr, G, G)};background:${color.front}`);

  let front = book ? '' : btns;
  front += div('lbody', `left:0;top:0;width:${lw}px;height:${lh}px;${leafR};${skin(0, 0)}`);
  front += div('glass', book
    ? `left:${rim}px;top:${rim}px;width:${lw - rim}px;height:${lh - rim * 2}px;${corners(G, 0, 0, G)};background:${color.front}`
    : `left:${rim}px;top:${rim}px;width:${lw - rim * 2}px;height:${lh - rim}px;${corners(G, G, 0, 0)};background:${color.front}`);

  // Back: hinge-side corners are softer, like the spine of a closed device.
  const sr = `${br * 0.55}px`, sg = `${Math.max(br * 0.55 - rim, 0)}px`;
  const backR = book ? corners(sr, R, R, sr) : corners(sr, sr, R, R);
  let back = div('lbody', `left:0;top:0;width:${lw}px;height:${lh}px;${backR};background:${metal(c)}`);
  back += div('glass', `left:${rim}px;top:${rim}px;width:${lw - rim * 2}px;height:${lh - rim * 2}px;${book ? corners(sg, G, G, sg) : corners(sg, sg, G, G)};background:${color.front}`);
  back += div('spine', book
    ? `left:0;top:${br}px;width:${rim + 1}px;height:${lh - br * 2}px;background:linear-gradient(to right, ${darken(c, 35)}, ${lighten(c, 10)})`
    : `left:${br}px;top:0;width:${lw - br * 2}px;height:${rim + 1}px;background:linear-gradient(${darken(c, 35)}, ${lighten(c, 10)})`);

  const cs = k / (cv.ppi / ((cv.dpr ?? d.dpr) * 25.4));
  return {
    W: BW + pad * 2, H: BH + pad * 2, frame: f, screen: { x: sx, y: sy, w, h, radius: `${r}px` }, cutout: screenCutout(d.cutout, w),
    fold: {
      book, BW, BH, pad, br, front, back, leafR, backR, t: od * k, sx, sy, w, h,
      leaf: { x: pad, y: pad, w: lw, h: lh }, hinge: book ? pad + lw : pad + lh,
      cover: { x: (lw - cv.w * cs) / 2, y: (lh - cv.h * cs) / 2, s: cs },
      edge: `background:linear-gradient(${book ? 'to right' : 'to bottom'}, ${darken(c, 30)}, ${lighten(c, 25)} 45%, ${darken(c, 10)})`,
    },
  };
}
BUILDERS.foldable = buildFoldable;

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
      const right = cut?.left > lw * 0.85 ? lw - cut.left + 12 : 20; // keep icons clear of a corner camera
      return div('sb', `left:24px;top:${cy}px;transform:translateY(-50%);font:500 14px/1 Roboto, ${FONT};color:${ink}`, '9:41') +
        div('sb', `right:${right}px;top:${cy}px;transform:translateY(-50%) scale(.82);transform-origin:right center`, icons);
    }
    case 'ios-side': { // iPhone Duo: status bar runs down the trailing edge, below the vertical island
      const cx = lw - safe.r / 2, top = cut?.type === 'island-v' ? cut.top + cut.h + 14 : 18;
      return div('sb', `left:${cx}px;top:${top}px;transform:translateX(-50%);font:600 14px/1 ${FONT};color:${ink}`, '9:41') +
        `<div class="icons" style="left:${cx}px;top:${top + 24}px;transform:translateX(-50%) scale(.78);transform-origin:50% 0;flex-direction:column;gap:9px;color:${ink}">${ICON.signal}${ICON.wifi}${ICON.battery}</div>`;
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
  static observedAttributes = [...ATTRS, ...FOLD_ATTRS];

  #stage; #device; #frame; #screen; #content; #media; #chrome; #cutout; #dyn;
  #size = { W: 0, H: 0 };
  #box = { w: 0, h: 0 };
  #mediaKey = null;
  #fitKey = null;
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

  #onDefine = (e) => { if (getDevice(this.getAttribute('device') || 'iphone-17-pro')?.id === e.detail.id) this.#render(); };

  connectedCallback() {
    addEventListener('bezelkit:define', this.#onDefine);
    this.#render();
    this.#ro ??= new ResizeObserver(() => this.#scale());
    this.#ro.observe(this);
  }

  disconnectedCallback() { this.#ro?.disconnect(); removeEventListener('bezelkit:define', this.#onDefine); }

  attributeChangedCallback(name) {
    if (this.#fold && (name === 'folded' || name === 'fold-angle')) return void this.#foldTo(this.#foldTarget(), this.#foldOpts);
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
  /** Current hinge angle in degrees (180 = flat open, 0 = closed), mid-animation included. */
  get hingeAngle() { return this.#fold ? this.#fold.angle : 180; }

  /** Foldables: close onto the cover display. Resolves with `true` once the animation ends. */
  fold(opts) { return this.#foldSet(true, opts); }
  /** Foldables: open to the inner display (or to `fold-angle`). Resolves with `false` once the animation ends. */
  unfold(opts) { return this.#foldSet(false, opts); }
  toggleFold(opts) { return this.#foldSet(!this.hasAttribute('folded'), opts); }

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
    const landscape = attr('orientation') === 'landscape' && (d.kind === 'phone' || d.kind === 'tablet' || d.kind === 'foldable');
    const rotatesChrome = landscape && (d.kind === 'phone' || d.fold === 'flip');

    let screen = { w: d.screen.w, h: d.screen.h };
    const vp = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(attr('viewport') ?? '');
    if (vp && d.kind === 'browser') screen = { w: +vp[1], h: +vp[2] };

    const L = BUILDERS[d.kind](d, color, screen, { theme, url: attr('url') });
    const [lw, lh] = landscape ? [screen.h, screen.w] : [screen.w, screen.h];
    const [TW, TH] = landscape ? [L.H, L.W] : [L.W, L.H];
    const S = this.#sides(d, color, screen, L, TW, TH, landscape); // back panel; S.W × S.H includes a stacked back
    this.#size = { W: S.W, H: S.H };

    // media kind
    const src = safeSrc(attr('src'));
    const type = attr('type');
    this.#kind = !src ? 'slot' : type && ['image', 'video', 'iframe'].includes(type) ? type : IMG_RE.test(src) || src.startsWith('blob:') ? 'image' : VID_RE.test(src) ? 'video' : 'iframe';
    const interactive = this.#kind === 'slot' || this.#kind === 'iframe';

    const chromeAttr = attr('chrome') ?? 'auto';
    const chromeOn = chromeAttr === 'on' || (chromeAttr === 'auto' && interactive);
    const safeAttr = attr('safe-area') ?? 'auto';
    const pad = safeAttr === 'pad' || (safeAttr === 'auto' && interactive);

    const st = d.safe?.top ?? 0, sb = d.safe?.bottom ?? 0;
    const safe = rotatesChrome ? { t: 0, r: st, b: sb ? 21 : 0, l: st } : { t: st, r: d.safe?.right ?? 0, b: sb, l: d.safe?.left ?? 0 };
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
    this.#foldRender(d, L, landscape);
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
    const fitKey = media && `${this.#mediaKey}|${fit}|${media.w}x${media.h}|${this.#box.w}x${this.#box.h}`;
    if (media && fitKey !== this.#fitKey) {
      this.#fitKey = fitKey;
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

  // ─── foldables ───────────────────────────────────────────────────────────
  // The inner screen stays the persistent .screen, on the static half. The moving half (leaf) is a 3D slab
  // whose front shows a clone of the inner screen clipped to its half, and whose back holds the cover screen.
  // Everything is a pure function of the hinge angle (#foldPose), so fold-angle poses and animation frames match.

  #fold = null;
  #foldOpts = undefined;

  #foldSet(on, opts) {
    this.#foldOpts = opts;
    this.toggleAttribute('folded', on); // runs #foldTo synchronously via attributeChangedCallback
    this.#foldOpts = undefined;
    return this.#fold ? this.#fold.done : Promise.resolve(on);
  }

  #foldTarget() {
    if (this.hasAttribute('folded')) return 0;
    const a = parseFloat(this.getAttribute('fold-angle'));
    return Number.isFinite(a) ? Math.min(Math.max(a, 0), 180) : 180;
  }

  #foldRender(d, L, landscape) {
    if (!L.fold) return this.#foldTeardown();
    const g = { ...L.fold, W: L.W, H: L.H, land: landscape, rot: landscape ? `translateY(${L.W}px) rotate(-90deg)` : '', fixed: this.getAttribute('fold-box') === 'fixed' };
    g.persp = Math.max(g.BW, g.BH) * 3.2;
    let f = this.#fold;
    if (!f) {
      f = this.#fold = { angle: this.#foldTarget(), raf: 0, waiters: [], anim: null, key: null, natural: null };
      f.done = Promise.resolve(f.angle === 0);
      f.style = Object.assign(document.createElement('style'), { textContent: FOLD_STYLES });
      f.aspect = document.createElement('style');
      f.leaf = Object.assign(document.createElement('div'), { className: 'fleaf' });
      f.leaf.setAttribute('part', 'fold-leaf');
      f.leaf.innerHTML = `<div class="fface ffront"><div class="fwrap" aria-hidden="true"></div><div class="fshade"></div></div>
        <div class="fface fback"><div class="fwrap" aria-hidden="true"></div>
          <div class="fcover" part="cover-screen"><div class="fcontent" part="cover-content"><div class="fmedia" part="cover-media"></div><div class="fchrome" aria-hidden="true"></div></div>
          <div class="fcut" aria-hidden="true"></div><div class="fsheen"></div></div><div class="fshade"></div></div>
        <div class="fedge"></div>`;
      const q = (s) => f.leaf.querySelector(s);
      Object.assign(f, {
        front: q('.ffront'), back: q('.fback'), fwrap: q('.ffront .fwrap'), bwrap: q('.fback .fwrap'), fshade: q('.ffront .fshade'), bshade: q('.fback .fshade'),
        cover: q('.fcover'), ccontent: q('.fcontent'), cmedia: q('.fmedia'), cchrome: q('.fchrome'), ccut: q('.fcut'), sheen: q('.fsheen'), edge: q('.fedge'),
        fx: Object.assign(document.createElement('div'), { className: 'ffx' }),
      });
      this.shadowRoot.append(f.style, f.aspect);
      this.#device.insertBefore(f.leaf, this.#screen);
    }
    this.#screen.append(f.fx);
    f.g = g;
    Object.assign(f.leaf.style, { left: `${g.leaf.x}px`, top: `${g.leaf.y}px`, width: `${g.leaf.w}px`, height: `${g.leaf.h}px`, transformOrigin: g.book ? '100% 50%' : '50% 100%' });
    f.fwrap.innerHTML = g.front;
    f.bwrap.innerHTML = g.back;
    f.fshade.setAttribute('style', g.leafR);
    f.bshade.setAttribute('style', g.backR);
    const ei = g.br * 0.7; // the straight part of the free edge, between its rounded corners
    f.edge.setAttribute('style', `${g.edge};${g.book ? `top:${ei}px;height:${g.leaf.h - ei * 2}px;transform:rotateY(90deg)` : `left:${ei}px;width:${g.leaf.w - ei * 2}px;transform:rotateX(-90deg)`}`);
    f.mirror?.remove();
    f.mirror = null;
    this.#foldCover(d, g);
    this.#foldPose(f.anim ? f.angle : this.#foldTarget());
  }

  #foldCover(d, g) {
    const f = this.#fold, cv = d.cover, attr = (n) => this.getAttribute(n);
    const theme = attr('theme') === 'dark' ? 'dark' : 'light';
    const csrc = safeSrc(attr('cover-src')), src = csrc ?? safeSrc(attr('src'));
    const kind = csrc ? kindOf(csrc) : this.querySelector(':scope > [slot="cover"]') ? 'slot' : this.#kind === 'slot' ? 'share' : this.#kind;
    const interactive = kind === 'slot' || kind === 'share' || kind === 'iframe';
    const chromeAttr = attr('chrome') ?? 'auto', safeAttr = attr('safe-area') ?? 'auto';
    const chromeOn = chromeAttr === 'on' || (chromeAttr === 'auto' && interactive);
    const pad = safeAttr === 'pad' || (safeAttr === 'auto' && interactive);
    const [lw, lh] = g.land ? [cv.h, cv.w] : [cv.w, cv.h];
    const cs = cv.safe ?? {}, st = cs.top ?? 0, sb = cs.bottom ?? 0;
    const safe = g.land ? { t: 0, r: st, b: sb ? 21 : 0, l: st } : { t: st, r: cs.right ?? 0, b: sb, l: cs.left ?? 0 };
    const inset = pad ? safe : { t: 0, r: 0, b: 0, l: 0 };
    f.cbox = { w: lw - inset.l - inset.r, h: lh - inset.t - inset.b };

    Object.assign(f.cover.style, { left: `${g.cover.x}px`, top: `${g.cover.y}px`, width: `${cv.w}px`, height: `${cv.h}px`, borderRadius: `${cv.radius ?? 0}px`, transform: `scale(${g.cover.s})` });
    Object.assign(f.ccontent.style, { width: `${lw}px`, height: `${lh}px`, transform: g.land ? `translateX(${cv.w}px) rotate(90deg)` : '' });
    f.ccontent.style.setProperty('--_safe-bg', theme === 'dark' ? '#000' : '#fff');
    const m = f.cmedia;
    Object.assign(m.style, { top: `${inset.t}px`, right: `${inset.r}px`, bottom: `${inset.b}px`, left: `${inset.l}px` });
    for (const [k, v] of Object.entries({ top: safe.t, right: safe.r, bottom: safe.b, left: safe.l })) m.style.setProperty(`--bezel-safe-${k}`, pad ? '0px' : `${v}px`);
    m.style.setProperty('--bezel-screen-width', `${f.cbox.w}px`);
    m.style.setProperty('--bezel-screen-height', `${f.cbox.h}px`);
    const cd = { ...d, cutout: cv.cutout, statusBar: cv.statusBar ?? d.statusBar, home: 'home' in cv ? cv.home : d.home };
    f.cchrome.innerHTML = chromeOn ? (g.land ? '' : statusBar(cd, lw, safe, theme)) + homeIndicator(cd, lw, lh, theme) : '';
    f.ccut.innerHTML = screenCutout(cv.cutout, cv.w);

    const key = `${kind}|${src}`;
    if (key !== f.key) {
      this.#foldSlotHome();
      Object.assign(f, { key, kind, natural: null });
      m.classList.toggle('slot', kind === 'slot' || kind === 'share');
      m.style.removeProperty('--_lb-top'); m.style.removeProperty('--_lb-bottom');
      if (kind === 'slot') m.innerHTML = '<slot name="cover"></slot>';
      else if (kind === 'share') m.replaceChildren(); // the default <slot> moves here while closed
      else {
        const el = document.createElement(kind === 'image' ? 'img' : kind);
        el.setAttribute('part', `cover-${kind}`);
        if (kind === 'image') {
          el.decoding = 'async';
          if (!/^(data|blob):/.test(src)) el.crossOrigin = 'anonymous';
          el.onload = () => m.firstElementChild === el && this.#foldNatural(el.naturalWidth, el.naturalHeight, el);
          el.onerror = () => { if (el.crossOrigin) { el.removeAttribute('crossorigin'); el.src = src; } };
        } else if (kind === 'video') {
          Object.assign(el, { autoplay: true, muted: true, loop: true, playsInline: true });
          el.onloadedmetadata = () => m.firstElementChild === el && this.#foldNatural(el.videoWidth, el.videoHeight);
        }
        el.src = src;
        m.replaceChildren(el);
      }
    }
    const el = m.firstElementChild, alt = attr('alt');
    if (el instanceof HTMLImageElement) el.alt = alt ?? '';
    else if (el instanceof HTMLIFrameElement) el.title = alt ?? 'Embedded page';
    this.#foldFit();
  }

  #foldNatural(w, h, img) {
    const f = this.#fold;
    if (!f) return;
    f.natural = { w, h };
    const edges = img && sampleEdges(img);
    if (edges) { f.cmedia.style.setProperty('--_lb-top', edges.top); f.cmedia.style.setProperty('--_lb-bottom', edges.bottom); }
    this.#foldFit();
  }

  #foldFit() {
    const f = this.#fold, req = FITS.includes(this.getAttribute('fit')) ? this.getAttribute('fit') : 'auto';
    f.cmedia.dataset.fit = f.kind === 'image' || f.kind === 'video' ? resolveFit(req, f.kind, f.natural, f.cbox) : 'cover';
  }

  // Put a shared default <slot> back on the inner screen (or drop it if that screen has its own now).
  #foldSlotHome() {
    const s = this.#fold?.cmedia.querySelector('slot:not([name])');
    if (s) this.#kind === 'slot' && !this.#media.querySelector('slot') ? this.#media.append(s) : s.remove();
  }

  #foldTeardown() {
    const f = this.#fold;
    if (!f) return;
    cancelAnimationFrame(f.raf);
    this.#foldSlotHome();
    for (const n of [f.leaf, f.fx, f.style, f.aspect]) n.remove();
    Object.assign(this.#screen.style, { clipPath: '', visibility: '' });
    this.#screen.inert = false;
    this.#frame.style.removeProperty('--_hr');
    this.#frame.style.removeProperty('--_lsh');
    this.#fold = null;
    f.waiters.splice(0).forEach((r) => r(false));
  }

  #foldTo(target, opts) {
    const f = this.#fold, from = f.angle, run = (f.run = {});
    cancelAnimationFrame(f.raf);
    clearTimeout(f.timer);
    const done = (f.done = new Promise((r) => f.waiters.push(r)));
    const settle = () => f.waiters.splice(0).forEach((r) => r(target === 0));
    if (from === target && !f.anim) return settle(), done;
    const fire = (phase) => this.dispatchEvent(new CustomEvent('bezel-fold', { bubbles: true, detail: { phase, folded: target === 0, from, to: target } }));
    const end = () => { f.anim = null; this.#foldPose(target); fire('end'); settle(); };
    fire('start');
    const dur = opts?.duration ?? 820 * Math.max(Math.abs(target - from) / 180, 0.4);
    if (!(dur > 0) || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return end(), done;
    let t0 = null, tick = performance.now();
    const step = (now) => {
      t0 ??= now;
      tick = performance.now();
      const p = Math.min((now - t0) / dur, 1);
      f.anim = { from, to: target, p };
      if (p >= 1) return end();
      this.#foldPose(from + (target - from) * ease(p));
      f.raf = requestAnimationFrame(step);
    };
    // rAF stalls in hidden tabs; finish anyway so the promise settles and the end state lands.
    const guard = () => { if (f.run === run && f.anim) performance.now() - tick > 200 ? (cancelAnimationFrame(f.raf), end()) : (f.timer = setTimeout(guard, 250)); };
    f.anim = { from, to: target, p: 0 };
    f.raf = requestAnimationFrame(step);
    f.timer = setTimeout(guard, dur + 250);
    return done;
  }

  #foldPose(a) {
    const f = this.#fold, g = f.g;
    const th = 180 - a, rad = (th * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
    const e = (1 - cos) / 2, split = a < 180, closed = a <= 0, tz = g.t * sin;
    f.angle = a;

    // The leaf: perspective only while in motion, so rest poses stay pixel-exact.
    const rot = g.book ? `rotateY(${th}deg)` : `rotateX(${-th}deg)`;
    f.leaf.style.transform = !split ? '' : closed ? rot : `perspective(${g.persp}px) ${rot}`;
    f.leaf.style.zIndex = split ? '1' : '';
    f.back.style.transform = `${g.book ? 'rotateY' : 'rotateX'}(180deg) translateZ(${tz}px)`;
    f.edge.style[g.book ? 'width' : 'height'] = `${tz}px`;
    f.fshade.style.opacity = 0.7 * e;
    f.bshade.style.opacity = 0.7 * (1 - e);
    const sx = 130 - 160 * Math.max(0, (th - 90) / 90);
    f.sheen.style.background = th > 90 && th < 180 ? `linear-gradient(105deg, transparent ${sx - 22}%, rgba(255,255,255,${0.22 * sin}) ${sx}%, transparent ${sx + 22}%)` : '';

    // The static half: clip the inner screen to it, add the crease and the leaf's shadow.
    const hx = g.hinge - (g.book ? g.sx : g.sy), dir = g.book ? 'to right' : 'to bottom';
    Object.assign(this.#screen.style, { clipPath: split ? (g.book ? `inset(0 0 0 ${hx}px)` : `inset(${hx}px 0 0 0)`) : '', visibility: closed ? 'hidden' : '' });
    this.#screen.inert = closed;
    f.cover.inert = !closed;
    this.#frame.style.setProperty('--_hr', `${g.br * 0.55 * Math.max(0, 1 - a / 60)}px`);
    this.#frame.style.setProperty('--_lsh', `${Math.max(0, 1 - e * 6)}`);
    const an = f.anim, live = this.#kind === 'image' || this.#kind === 'video';
    // Iframes and slotted HTML can't be cloned onto the leaf, so the inner display switches off on the way.
    const dim = live || !an || (an.from !== 0 && an.to !== 0) ? 0 : Math.min((an.to === 0 ? an.p : 1 - an.p) / 0.15, 1);
    const ca = 0.06 + 0.22 * sin, k = 'var(--bezel-crease, 1)';
    const crease = `linear-gradient(${dir}, transparent ${hx - 18}px, rgba(0,0,0,calc(${ca} * ${k})) ${hx - 1}px, rgba(255,255,255,calc(${ca * 0.45} * ${k})) ${hx + 2}px, transparent ${hx + 18}px)`;
    const ws = ((g.book ? g.BW : g.BH) / 2) * (0.15 + 0.85 * e);
    f.fx.style.background = split ? `${crease}, linear-gradient(${dir}, rgba(0,0,0,${0.5 * e}) ${hx}px, transparent ${hx + ws}px)` : crease;
    f.fx.style.backgroundColor = `rgba(0,0,0,${dim})`;

    if (split && !closed && !f.mirror) this.#foldMirror();
    else if ((!split || closed) && f.mirror) { f.mirror.remove(); f.mirror = null; }
    if (f.mirror) { f.mfx.style.background = crease; f.mfx.style.backgroundColor = `rgba(0,0,0,${dim})`; }

    if (f.kind === 'share') { // one default slot, on whichever display faces the viewer
      const slots = [...this.shadowRoot.querySelectorAll('slot:not([name])')], s = slots.pop();
      slots.forEach((x) => x.remove());
      const home = a < 90 ? f.cmedia : this.#media;
      if (s && s.parentNode !== home) home.append(s);
    }

    // Host box follows the visible body (or stays at the open size with fold-box="fixed").
    const x0 = g.book ? (e * g.BW) / 2 : 0, y0 = g.book ? 0 : (e * g.BH) / 2;
    let r = { x: x0, y: y0, w: g.W - x0, h: g.H - y0 };
    if (g.land) r = { x: r.y, y: g.W - r.x - r.w, w: r.h, h: r.w };
    const bw = g.fixed ? (g.land ? g.H : g.W) : r.w, bh = g.fixed ? (g.land ? g.W : g.H) : r.h;
    this.#device.style.transform = `translate(${(bw - r.w) / 2 - r.x}px, ${(bh - r.h) / 2 - r.y}px) ${g.rot}`;
    Object.assign(this.#stage.style, { width: `${bw}px`, height: `${bh}px` });
    this.#size = { W: bw, H: bh };
    f.aspect.textContent = `:host { aspect-ratio: ${bw} / ${bh}; }`;
    this.#scale();
  }

  #foldMirror() {
    const f = this.#fold, g = f.g, m = this.#screen.cloneNode(true);
    m.querySelectorAll('slot, iframe, .ffx').forEach((n) => n.remove());
    m.classList.add('fmirror');
    m.removeAttribute('part');
    m.setAttribute('aria-hidden', 'true');
    m.inert = true;
    const hx = g.hinge - (g.book ? g.sx : g.sy), cut = (g.book ? g.w : g.h) - hx - 0.5;
    Object.assign(m.style, { left: `${g.sx - g.leaf.x}px`, top: `${g.sy - g.leaf.y}px`, visibility: '', clipPath: g.book ? `inset(0 ${cut}px 0 0)` : `inset(0 0 ${cut}px 0)` });
    const v = this.#media.querySelector('video'), mv = m.querySelector('video');
    if (v && mv) { mv.muted = true; mv.currentTime = v.currentTime; mv.play?.().catch(() => {}); }
    f.mfx = Object.assign(document.createElement('div'), { className: 'ffx' });
    m.append(f.mfx);
    f.front.insertBefore(m, f.fshade);
    const mm = m.querySelector('.media');
    if (mm) mm.scrollTop = this.#media.scrollTop;
    f.mirror = m;
  }
}

function resolveDevice(id) {
  const d = getDevice(id || 'iphone-17-pro');
  if (d) return d;
  console.warn(`bezelkit: unknown device "${id}". Available: ${listDevices().map((x) => x.id).join(', ')}`);
  return getDevice('iphone-17-pro');
}

// Reflect attributes as camelCase properties: el.safeArea = 'pad', el.device = 'pixel-10-pro'
for (const name of [...ATTRS, ...FOLD_ATTRS]) {
  const prop = name.replace(/-(\w)/g, (_, c) => c.toUpperCase());
  Object.defineProperty(BezelDevice.prototype, prop, {
    get() { return this.getAttribute(name); },
    set(v) { v == null || v === false ? this.removeAttribute(name) : this.setAttribute(name, v === true ? '' : v); },
    configurable: true,
  });
}

Object.defineProperty(BezelDevice.prototype, 'folded', {
  get() { return this.hasAttribute('folded'); },
  set(v) { this.toggleAttribute('folded', !!v && v !== 'false'); },
  configurable: true,
});

if (!customElements.get('bezel-device')) customElements.define('bezel-device', BezelDevice);
