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
.ring { position: absolute; box-sizing: border-box; pointer-events: none; }
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
// Inside a Dynamic Island the camera is barely darker-than-black on Apple's art, not a visible bead.
const islandLens = (d) => `border-radius:50%;background:radial-gradient(circle at 40% 40%, #10141b 0 30%, #050608 60%, #000 75%);opacity:.6;width:${d}px;height:${d}px`;

// Rim cross-section, drawn over the .body: concentric inset bands (outer dark line, specular band, falloff
// toward the glass) that follow the rounded outline like a tube, then one soft top-lit/bottom-dark overlay.
function rimShade(x, y, w, h, r, rim, c) {
  const at = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;pointer-events:none`;
  const band = (f, col) => `inset 0 0 0 ${+(rim * f).toFixed(2)}px ${col}`;
  return div('rimband', `${at};box-shadow:${[band(0.15, darken(c, 55)), band(0.3, lighten(c, 25)), band(0.45, lighten(c, 50)), band(0.65, lighten(c, 14)), band(0.85, darken(c, 16))].join(', ')}`) +
    div('rimlight', `${at};background:linear-gradient(to bottom, rgba(255,255,255,.16), transparent 30% 70%, rgba(0,0,0,.16))`);
}
// Black glass meets the rim with a dark edge and a faint polished hairline.
const glassEdge = (front) => `box-shadow:inset 0 0 0 1px ${darken(front, 60)}, inset 0 0 0 1.75px rgba(255,255,255,.18)`;

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
  // Rounded end caps (radius across = protrusion, along = ~2.5× that), a dark seam against the frame and a
  // lit leading end. Crowns stay squarer. The first px of each button sits under the body.
  const r = b.crown ? Math.min(t, 4) : t, e = b.crown ? r : Math.min(b.len / 2, t * 2.5);
  const lit = 'rgba(255,255,255,.35)', dim = 'rgba(0,0,0,.25)', seam = 'rgba(0,0,0,.35)';
  if (b.side === 'top') {
    return div('btn', `left:${x0 + b.at}px;top:${y0 - t}px;width:${b.len}px;height:${t + 1}px;border-radius:${e}px ${e}px 0 0 / ${r}px ${r}px 0 0;background:${bg};box-shadow:inset 0 -2px 0 ${seam}, inset 1px 0 0 ${lit}, inset -1px 0 0 ${dim}`);
  }
  const L = b.side === 'left', left = L ? x0 - t : x0 + bw - 1;
  const radius = L ? `${r}px 0 0 ${r}px / ${e}px 0 0 ${e}px` : `0 ${r}px ${r}px 0 / 0 ${e}px ${e}px 0`;
  return div('btn', `left:${left}px;top:${y0 + b.at}px;width:${t + 1}px;height:${b.len}px;border-radius:${radius};background:${bg};box-shadow:inset ${L ? -2 : 2}px 0 0 ${seam}, inset 0 1px 0 ${lit}, inset 0 -1px 0 ${dim}`);
}

// Camera dot sitting in a bezel, centred on one side of the rectangle (x, y, w, h).
function bezelCamera(cut, x, y, w, h, bz) {
  if (!cut || cut.type !== 'camera') return '';
  const d = cut.d ?? 8;
  if (cut.side === 'left') return div('cam', `left:${x + (bz.l - d) / 2}px;top:${y + (h - d) / 2}px;${lens(d)}`);
  // 'right' = the landscape top edge of iPad Pro/Air and Galaxy Tab (landscape turns the frame -90°)
  if (cut.side === 'right') return div('cam', `left:${x + w - bz.r + (bz.r - d) / 2}px;top:${y + (h - d) / 2}px;${lens(d)}`);
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
        div('lens', `left:${x + cut.w * 0.28}px;top:${cut.top + cut.w * 0.28}px;${islandLens(cut.w * 0.44)}`);
    }
    case 'flexcam': { // rear cameras the cover screen wraps around (Galaxy Z Flip)
      const d = cut.d, g = cut.gap ?? 8, ring = `;box-shadow:0 0 0 3px #2b2d31, 0 0 0 4.5px #8a8d93`;
      return div('cams', `left:${cut.left - 5}px;top:${cut.top - 5}px;width:${d * 2 + g + 10}px;height:${d + 10}px;border-radius:${d / 2 + 5}px;background:#000`) +
        div('lens', `left:${cut.left}px;top:${cut.top}px;${lens(d)}${ring}`) + div('lens', `left:${cut.left + d + g}px;top:${cut.top}px;${lens(d)}${ring}`);
    }
    case 'island':
      return div('island', `left:${cx}px;top:${cut.top}px;width:${cut.w}px;height:${cut.h}px;border-radius:${cut.h / 2}px;background:#000`) +
        div('lens', `left:${cx + cut.w - cut.h * 0.78}px;top:${cut.top + cut.h * 0.28}px;${islandLens(cut.h * 0.44)}`);
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
  f += rimShade(x0, y0, bw, bh, br, rim, color.frame);
  f += div('glass', `left:${gx}px;top:${gy}px;width:${bw - rim * 2}px;height:${bh - rim * 2}px;border-radius:${Math.max(br - rim, 0)}px;background:${color.front};${glassEdge(color.front)}`);
  f += bezelCamera(d.cutout, gx, gy, bw - rim * 2, bh - rim * 2, bz);

  if (d.earpiece) { // iPhone SE: 76 × 8 pt receiver, FaceTime camera level with it on the left
    const cx = gx + (bw - rim * 2) / 2, cy = gy + bz.t / 2;
    f += div('ear', `left:${cx - 38}px;top:${cy - 4}px;width:76px;height:8px;border-radius:4px;background:#1a1b1e;box-shadow:inset 0 1px 1px #000`);
    f += div('cam', `left:${cx - 68 - 5}px;top:${cy - 5}px;${lens(10)}`);
  }
  if (d.home === 'button') { // SE: Ø 10.9 mm ≈ 70 pt, ~0.64 of the bottom border
    const s = (bz.b + rim) * 0.64;
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

// iMac / Studio Display stand: a flat plate (slightly darker side edges), not a cylinder.
const plateEdges = (c) => `linear-gradient(to right, ${darken(c, 14)} 0 1.5%, ${c} 6% 94%, ${darken(c, 14)} 98.5%)`;
const standPlate = (c) => `linear-gradient(to bottom, ${darken(c, 22)}, transparent 12%), ${plateEdges(c)}`;
const standFoot = (c) => `linear-gradient(${lighten(c, 24)}, ${lighten(c, 8)} 40%, ${darken(c, 16)})`;

function buildDesktop(d, color, screen) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 34), rim = d.rim ?? 0, chin = d.chin ?? 0;
  const sw = d.stand?.w ?? 440, sh = d.stand?.h ?? 360, foot = 16, br = 26;
  const bw = w + bz.l + bz.r + rim * 2, glassH = h + bz.t + bz.b, bh = glassH + rim * 2 + chin;
  const c = color.frame, sc = backTint(d, color); // the stand is the back's (deeper) colour when there is one

  // One bent aluminium sheet: a flat neck and a foot of the same width, with a lighter bend line.
  let f = div('neck', `left:${(bw - sw) / 2}px;top:${bh - 30}px;width:${sw}px;height:${sh + 30}px;background:${standPlate(sc)}`);
  f += div('body', `left:${(bw - sw) / 2}px;top:${bh + sh}px;width:${sw}px;height:${foot}px;border-radius:0 0 4px 4px;background:${standFoot(sc)}`);
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
    f += div('url', `left:178px;top:${(bar - 34) / 2}px;width:${Math.max(W - 238, 120)}px;height:34px;border-radius:17px;background:${pill};padding:0 14px;${text}`, `<span style="opacity:.55;display:flex">${ICON.lock}</span>${host}`);
  }
  return { W, H, frame: f, screen: { x: 1, y: bar + 1, w, h, radius: '0 0 11px 11px' }, cutout: '' };
}

const BUILDERS = { phone: buildHandheld, tablet: buildHandheld, watch: buildHandheld, laptop: buildLaptop, desktop: buildDesktop, browser: buildBrowser };

// ─── back panels ───────────────────────────────────────────────────────────
// Drawn as seen from behind, in the same W×H box as the front: padding and side buttons are
// mirrored, so a rotateY(180deg) turn lands the outline exactly on the front's. Camera geometry
// lives in each device's `back` entry (see devices.js); coordinates are px from the body's
// top-left corner as seen from behind.
//
// Lighting: every back shares one key light, a softbox up and to the left. Speculars sit at KEY,
// chamfers and bevels are lit on their top-left edges and shaded on their bottom-right ones, and
// raised parts cast their shadow down and slightly right (CAST). Lenses, flash, LiDAR, mic and sensors
// are classed divs styled by BACK_CSS from two custom properties (--d diameter, --r ring metal), so
// their many gradient layers are written once per shadow root, not once per element.

const SIDES = ['front', 'back', 'both'];
const KEY = '22% 10%';
const CAST = [0.3, 1];
const px = (v) => `${+v.toFixed(2)}px`;
const cast = (z, a, spread = 0) => `${px(z * CAST[0])} ${px(z * CAST[1])} ${px(z * 1.4)} ${px(-z * spread)} rgba(0,0,0,${a})`;
const dz = (k) => `calc(var(--d) * ${k})`;

const BACK_CSS = `
.back .bclip { overflow: hidden; }
.back .bclip > *, .back .lens > i, .back .flash > i, .back .lidar > i { position: absolute; box-sizing: border-box; }
.back .lens, .back .lens > i, .back .lens > i::before, .back .lens > i::after, .back .flash, .back .flash > i,
.back .lidar, .back .lidar > i, .back .mic, .back .sensor { border-radius: 50%; }
.back .lens > i::before, .back .lens > i::after { content: ''; position: absolute; }
.back .lens {
  --hi: color-mix(in oklab, var(--r), white 48%); --lo: color-mix(in oklab, var(--r), black 52%);
  background:
    radial-gradient(closest-side, transparent 78%, rgba(255,255,255,.34) 80.5%, transparent 85% 91%, rgba(0,0,0,.32) 99%),
    conic-gradient(from -45deg, var(--hi), var(--r) 12%, var(--lo) 25%, var(--r) 38%, color-mix(in oklab, var(--r), white 30%) 50%, var(--r) 62%, var(--lo) 75%, var(--r) 88%, var(--hi));
  box-shadow: ${dz(0.025)} ${dz(0.07)} ${dz(0.09)} rgba(0,0,0,.42), 0 0 0 ${dz(0.008)} var(--lo),
    inset ${dz(0.012)} ${dz(0.018)} ${dz(0.014)} rgba(255,255,255,.5), inset ${dz(-0.012)} ${dz(-0.018)} ${dz(0.018)} rgba(0,0,0,.4);
}
.back .lens > i {
  inset: 11%;
  background: radial-gradient(closest-side, #050608 0 20%, #2a3040 21.5%, #0a0b10 24% 37%, #20232d 38.5%, #08090c 41% 56%, #1c1e25 57.5%, #09090b 60% 80%, #17181c 83%, #030304 88%);
  box-shadow: inset 0 0 0 ${dz(0.012)} #000, inset ${dz(0.01)} ${dz(0.05)} ${dz(0.08)} rgba(0,0,0,.85);
}
.back .lens > i::after {
  inset: 30%;
  background: radial-gradient(circle at 36% 32%, rgba(120,150,255,.55) 0 8%, transparent 26%), radial-gradient(circle at 66% 70%, rgba(165,90,230,.4) 0 10%, transparent 32%), radial-gradient(closest-side, #16203a 0 30%, #070912 66%, #000);
  box-shadow: 0 0 0 ${dz(0.006)} rgba(140,150,185,.35);
}
.back .lens > i::before {
  inset: 0; z-index: 1;
  background:
    radial-gradient(circle at 31% 27%, rgba(255,255,255,.95) 0 1.3%, rgba(255,255,255,.35) 2.6%, transparent 5%),
    radial-gradient(ellipse 62% 40% at 32% 24%, rgba(170,190,255,.2), transparent 70%),
    radial-gradient(ellipse 80% 55% at 30% 18%, rgba(255,255,255,.07), transparent 66%),
    radial-gradient(ellipse 50% 32% at 70% 80%, rgba(180,100,240,.16), transparent 72%),
    radial-gradient(closest-side, transparent 90%, rgba(255,255,255,.07) 97%, transparent);
}
.back .flash, .back .lidar {
  background: color-mix(in oklab, var(--r), black 38%);
  box-shadow: inset 0 ${dz(0.04)} ${dz(0.05)} rgba(0,0,0,.55), 0 ${dz(0.03)} 0 rgba(255,255,255,.28), 0 ${dz(-0.02)} 0 rgba(0,0,0,.2);
}
.back .flash > i {
  inset: 9%;
  background:
    radial-gradient(circle at 32% 28%, rgba(255,255,255,.95) 0 5%, rgba(255,255,255,0) 16%),
    radial-gradient(circle, rgba(140,110,50,.2) 0 22%, transparent 32%) 0 0 / ${dz(0.11)} ${dz(0.11)},
    radial-gradient(closest-side, #fffbf1, #f5ead0 55%, #e3d3ab 85%, #c9b88e);
  box-shadow: inset 0 ${dz(0.06)} ${dz(0.08)} rgba(80,60,20,.35);
}
.back .lidar > i {
  inset: 8%;
  background:
    radial-gradient(circle at 32% 28%, rgba(255,255,255,.6) 0 3%, transparent 9%),
    radial-gradient(ellipse 60% 40% at 34% 26%, rgba(160,175,220,.14), transparent 70%),
    radial-gradient(closest-side, transparent 54%, #0b0b0e 62%, #17181c 86%, #050506 96%),
    radial-gradient(circle, rgba(150,160,200,.3) 0 30%, transparent 45%) 0 0 / ${dz(0.09)} ${dz(0.09)},
    #0a0a0c;
  box-shadow: inset 0 ${dz(0.04)} ${dz(0.06)} rgba(0,0,0,.8);
}
.back .mic {
  background: radial-gradient(closest-side at 50% 60%, #000 0 50%, #151517);
  box-shadow: inset 0 ${dz(0.2)} ${dz(0.25)} #000, 0 ${dz(0.12)} 0 rgba(255,255,255,.3), 0 ${dz(-0.1)} 0 rgba(0,0,0,.25);
}
.back .sensor {
  background: radial-gradient(circle at 34% 30%, rgba(255,255,255,.45) 0 5%, transparent 14%), radial-gradient(closest-side, #1f2026 0 50%, #0c0c0f 72%, #34353c 84%, #0a0a0c 96%);
  box-shadow: inset 0 ${dz(0.06)} ${dz(0.08)} rgba(0,0,0,.7), 0 ${dz(0.04)} 0 rgba(255,255,255,.12);
}
`;

const FINISH = {
  glass: (c) => `linear-gradient(160deg, ${lighten(c, 9)} 0%, ${c} 42%, ${darken(c, 7)} 100%)`,
  gloss: (c) => `linear-gradient(160deg, ${lighten(c, 22)} 0%, ${c} 30%, ${darken(c, 12)} 72%, ${lighten(c, 6)} 100%)`,
  aluminium: (c) => `linear-gradient(160deg, ${lighten(c, 12)} 0%, ${c} 38%, ${darken(c, 8)} 100%)`,
  titanium: (c) => `linear-gradient(135deg, ${lighten(c, 14)} 0%, ${darken(c, 5)} 45%, ${lighten(c, 7)} 100%)`,
  polished: metal,
  dark: () => 'radial-gradient(120% 90% at 30% 20%, #34353b 0%, #111114 55%, #050506 100%)',
};
// [broad soft highlight toward the key, reflection band]: matte finishes get one soft falloff,
// glossy ones a crisp softbox band as well.
const SHEEN = { glass: [0.14, 0.06], gloss: [0.26, 0.24], aluminium: [0.15, 0.045], titanium: [0.14, 0.06], polished: [0.2, 0.14], dark: [0.12, 0.1] };
const finish = (f, c) => (FINISH[f] ?? FINISH.glass)(c);
// Inset matte glass (the Pro's Ceramic Shield window): flatter than the metal around it.
const satin = (c) => `linear-gradient(160deg, ${lighten(c, 4)} 0%, ${c} 40%, ${darken(c, 6)} 100%)`;
function sheen(f) {
  const [a, b] = SHEEN[f] ?? SHEEN.glass;
  const band = f === 'gloss' || f === 'polished'
    ? `linear-gradient(112deg, transparent 20%, rgba(255,255,255,${b}) 26% 31%, rgba(255,255,255,${b * 0.2}) 35%, transparent 42% 70%, rgba(255,255,255,${b * 0.35}) 75%, transparent 82%)`
    : `linear-gradient(112deg, transparent 28%, rgba(255,255,255,${b}) 45%, transparent 63%)`;
  return `radial-gradient(140% 75% at ${KEY}, rgba(255,255,255,${a}), rgba(255,255,255,${a * 0.3}) 40%, transparent 70%), ${band}, linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.07))`;
}
// The back rolling over into the sides: lit along the top-left edge, shaded along the bottom-right.
const roll = (s, a = 1) => `inset ${px(s * 0.55)} ${px(s * 0.7)} ${px(s * 1.1)} ${px(-s * 0.45)} rgba(255,255,255,${0.28 * a}), ` +
  `inset ${px(-s * 0.5)} ${px(-s * 0.8)} ${px(s * 1.5)} ${px(-s * 0.45)} rgba(0,0,0,${0.22 * a}), inset 0 0 ${px(s * 0.5)} rgba(0,0,0,${0.1 * a})`;
const backTint = (d, color) => d.colors.find(([n]) => n === color.name)?.[3] ?? color.frame;

// Raised module (plateau, bar, bump), flush window or domed crystal, in body coordinates:
// { x, y, w, h, r, tone?, fill?, flat?, z?, edge?: 'polished', dome?, rings? }. Drawn inside a
// body-shaped clip so cast shadows never spill past the silhouette.
function plate(p, c, fallback) {
  const fill = p.fill ?? finish(p.tone ?? fallback, c);
  const r = typeof p.r === 'number' ? `${p.r}px` : p.r ?? '0';
  const at = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px;border-radius:${r}`;
  if (p.flat) { // flush inset panel: a fine dark seam, the aluminium lip lit on its far side
    return div('window', `${at};background:radial-gradient(90% 60% at ${KEY}, rgba(255,255,255,.05), transparent 70%), ${fill};box-shadow:0 0 0 .75px ${darken(c, 34)}, 0 0 0 1.6px rgba(255,255,255,.16), inset .75px 1px 1.25px rgba(0,0,0,.16), inset -.5px -.75px .5px rgba(255,255,255,.12)`);
  }
  const dark = p.tone === 'dark', z = p.z ?? (dark ? 2 : 5), e = (k) => px(z * k);
  if (p.dome) { // glossy convex crystal: softbox reflection up-left, dark falloff, a thin rim light down-right
    const rings = p.rings ? `repeating-radial-gradient(circle, rgba(255,255,255,.045) 0 .8px, transparent .8px ${p.rings}px), ` : '';
    return div('plate', `${at};background:radial-gradient(ellipse 36% 22% at 33% 23%, rgba(255,255,255,${p.rings ? 0.14 : 0.24}), rgba(255,255,255,.05) 55%, transparent 76%), ${rings}radial-gradient(closest-side at 44% 40%, #34353b, #17171a 58%, #08080a 90%, #121215);` +
      `box-shadow:inset -.75px -1px 0 rgba(255,255,255,.14), inset ${e(0.2)} ${e(0.3)} ${e(0.4)} ${e(-0.1)} rgba(255,255,255,.16), inset ${e(-0.2)} ${e(-0.35)} ${e(0.5)} ${e(-0.1)} rgba(0,0,0,.6), 0 0 0 .75px #000, ${cast(z * 0.5, 0.4)}, ${cast(z, 0.25, 0.2)}`);
  }
  const polish = p.edge === 'polished' ? `, inset 0 0 0 ${e(0.25)} ${lighten(c, 50)}, inset 0 0 0 ${e(0.45)} ${lighten(c, 12)}` : '';
  // Top-to-bottom: the polished roll on the lower edge, the lit and shaded chamfers, then outside the
  // plate a hairline seam, a tight contact shadow and a soft cast shadow onto the body.
  const bs = `inset 0 -.75px 0 rgba(255,255,255,${dark ? 0.12 : 0.34}), ` +
    `inset ${e(0.2)} ${e(0.26)} ${e(0.3)} ${e(-0.06)} rgba(255,255,255,${dark ? 0.2 : 0.42}), ` +
    `inset ${e(-0.16)} ${e(-0.3)} ${e(0.4)} ${e(-0.06)} rgba(0,0,0,${dark ? 0.55 : 0.24})${polish}, ` +
    `0 0 0 .6px ${darken(c, 45)}, ${cast(z * 0.3, 0.38)}, ${cast(z, 0.36, 0.2)}, ${cast(z * 2.2, 0.14, 0.3)}`;
  const spec = dark ? 0.08 : polish ? 0.2 : 0.14;
  return div('plate', `${at};background:radial-gradient(80% 90% at ${KEY}, rgba(255,255,255,${spec}), transparent 72%), ${fill};box-shadow:${bs}`);
}

// One element of a camera module, centred on (x, y); { x, y, d, kind: lens|flash|lidar|sensor|mic }.
function part({ x, y, d = 16, kind = 'lens' }, x0, y0, c) {
  const at = `left:${x0 + x - d / 2}px;top:${y0 + y - d / 2}px;width:${d}px;height:${d}px;--d:${d}px;--r:${c}`;
  return kind === 'sensor' || kind === 'mic' ? div(kind, at) : div(kind === 'flash' || kind === 'lidar' ? kind : 'lens', at, '<i></i>');
}

// Plates go in a body-shaped clip (x0, y0, bw, bh, br); parts are drawn later, over the rim shading.
function camera(cam, c, ring, [x0, y0, bw, bh, br], fallback) {
  const plates = (cam.plates ?? []).map((p) => plate(p, c, fallback)).join('');
  return {
    plates: plates ? div('bclip', `left:${x0}px;top:${y0}px;width:${bw}px;height:${bh}px;border-radius:${br}px`, plates) : '',
    parts: (cam.parts ?? []).map((p) => part(p, x0, y0, ring)).join(''),
  };
}

// Side buttons seen from behind: a rounded profile across the protrusion (dark seam at the body, lit
// where it faces the key light) and a soft cast shadow. The flush Camera Control keeps the front look.
function backButton(b, x0, y0, bw, c) {
  if (b.flush) return button(b, x0, y0, bw, 0, c);
  const t = b.w ?? 3, top = b.side === 'top', L = b.side === 'left', base = b.color ?? c;
  const r = b.crown ? Math.min(t, 4) : t, e = b.crown ? r : Math.min(b.len / 2, t * 2.5);
  const along = top ? 'to right' : 'to bottom';
  const prof = `linear-gradient(${top ? 'to top' : L ? 'to left' : 'to right'}, ${darken(base, 45)} 0, ${darken(base, 8)} 28%, ${lighten(base, top || L ? 34 : 16)} 56%, ${base} 76%, ${darken(base, 32)} 100%)`;
  const knurl = b.crown ? `repeating-linear-gradient(${along}, rgba(0,0,0,.3) 0 1.2px, rgba(255,255,255,.14) 1.2px 2.6px), ` : '';
  const bg = `linear-gradient(${along}, rgba(255,255,255,.25), transparent 22% 78%, rgba(0,0,0,.22)), ${knurl}${prof}`;
  const shadow = cast(t * 0.6, 0.3);
  if (top) return div('btn', `left:${x0 + b.at}px;top:${y0 - t}px;width:${b.len}px;height:${t + 1}px;border-radius:${e}px ${e}px 0 0 / ${r}px ${r}px 0 0;background:${bg};box-shadow:${shadow}`);
  const radius = L ? `${r}px 0 0 ${r}px / ${e}px 0 0 ${e}px` : `0 ${r}px ${r}px 0 / 0 ${e}px ${e}px 0`;
  return div('btn', `left:${L ? x0 - t : x0 + bw - 1}px;top:${y0 + b.at}px;width:${t + 1}px;height:${b.len}px;border-radius:${radius};background:${bg};box-shadow:${shadow}`);
}

// rimShade's tube bands, with its top-lit/bottom-dark overlay folded into the same ring (offset insets)
// so nothing washes over the panel inside it.
function backRim(x, y, w, h, r, rim, c) {
  const band = (f, col) => `inset 0 0 0 ${px(rim * f)} ${col}`;
  return div('rimband', `left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${r}px;box-shadow:inset 0 ${px(rim * 0.5)} ${px(rim * 0.5)} ${px(-rim * 0.1)} rgba(255,255,255,.2), inset 0 ${px(-rim * 0.5)} ${px(rim * 0.5)} ${px(-rim * 0.1)} rgba(0,0,0,.2), ` +
    [band(0.15, darken(c, 55)), band(0.3, lighten(c, 25)), band(0.45, lighten(c, 50)), band(0.65, lighten(c, 14)), band(0.85, darken(c, 16))].join(', '));
}

// Watch band slots across the top and bottom of the case, each with its release button inboard.
function bandSlots(s, x0, y0, bw, bh, c) {
  const w = s.w ?? bw * 0.58, h = s.h ?? bh * 0.03, y = s.y ?? bh * 0.028, x = x0 + (bw - w) / 2;
  const bw2 = s.button ?? w * 0.3, bh2 = h * 0.8, gap = h * 0.7;
  const slot = (top) => div('slot', `left:${x}px;top:${top}px;width:${w}px;height:${h}px;border-radius:${h / 2}px;background:linear-gradient(to right, rgba(0,0,0,.5), transparent 12% 88%, rgba(0,0,0,.5)), linear-gradient(#020203, #0e0e10 60%, #26262a);box-shadow:inset 0 ${px(h * 0.25)} ${px(h * 0.3)} #000, 0 .75px 0 rgba(255,255,255,.3), 0 -.5px 0 rgba(0,0,0,.3)`);
  const btn = (top) => div('release', `left:${x0 + (bw - bw2) / 2}px;top:${top}px;width:${bw2}px;height:${bh2}px;border-radius:${bh2 / 2}px;background:linear-gradient(${lighten(c, 22)}, ${c} 55%, ${darken(c, 18)});box-shadow:0 0 0 .75px ${darken(c, 45)}, inset 0 .75px 0 rgba(255,255,255,.4), ${cast(1.5, 0.3)}`);
  return slot(y0 + y) + btn(y0 + y + h + gap) + slot(y0 + bh - y - h) + btn(y0 + bh - y - h - gap - bh2);
}

// Neutral placeholder only: brand logos are trademarks and are never drawn.
const logoMark = (logo, cx, cy, s, c) => logo !== 'dot' ? '' :
  div('logo', `left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;border-radius:50%;background:radial-gradient(circle at 40% 35%, ${lighten(c, 16)}, ${darken(c, 6)});box-shadow:inset 0 1px 1px rgba(255,255,255,.25), inset 0 -1px 1px rgba(0,0,0,.14)`);

// Used when a device has no back.camera entry (e.g. defineDevice() without one).
function defaultCamera(kind, bw, bh) {
  const m = Math.min(bw, bh);
  if (kind === 'watch') {
    const D = m * 0.74, cx = bw / 2, cy = bh / 2;
    return { plates: [{ x: cx - D / 2, y: cy - D / 2, w: D, h: D, r: '50%', tone: 'dark', dome: true, z: 6 }], parts: [{ x: cx, y: cy, d: D * 0.2, kind: 'sensor' }] };
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
  const s = Math.max(rim, Math.min(bw, bh) * 0.018); // edge roll width

  let f = (d.buttons ?? []).map((b) => backButton(swap[b.side] ? { ...b, side: swap[b.side] } : { ...b, at: bw - b.at - b.len }, x0, y0, bw, color.frame)).join('');
  f += div('body', `left:${x0}px;top:${y0}px;width:${bw}px;height:${bh}px;border-radius:${br}px;background:${metal(color.frame)}`);
  f += div('panel', `${inner};background:${finish(fin, c)};box-shadow:${roll(s)}`);
  if (spec.window) f += div('bclip', `left:${x0}px;top:${y0}px;width:${bw}px;height:${bh}px`, plate({ flat: true, fill: satin(c), ...spec.window }, c, 'glass'));
  f += div('sheen', `${inner};background:${sheen(fin)}`);
  const cam = camera(spec.camera ?? defaultCamera(d.kind, bw, bh), c, color.frame, [x0, y0, bw, bh, br], fin);
  // The rim is shaded after the plates, so a full-width plateau rolls over the sides like the body does.
  f += cam.plates + backRim(x0, y0, bw, bh, br, rim, color.frame);
  if (d.kind === 'watch') f += bandSlots(spec.slots ?? {}, x0, y0, bw, bh, color.frame);
  f += cam.parts;
  return f + logoMark(logo, x0 + bw / 2, y0 + (spec.logo?.y ?? bh / 2), Math.min(bw, bh) * 0.11, c);
}

function backLaptop(d, color, screen, logo) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 14), rim = d.rim ?? 2, lr = d.lidRadius ?? 18;
  const lw = w + bz.l + bz.r + rim * 2, lh = h + bz.t + bz.b + rim * 2;
  const ov = d.base?.overhang ?? Math.round(lw * 0.07), bh = d.base?.h ?? 18, W = lw + ov * 2;
  const fin = d.back?.finish ?? 'aluminium', c = backTint(d, color);
  const lid = `left:${ov}px;top:0;width:${lw}px;height:${lh}px;border-radius:${lr}px ${lr}px 6px 6px`;
  const hw = lw * 0.86, hh = Math.max(bh * 0.85, 12);

  // From behind the lid is nearest, so the base's rear edge sits under it.
  let f = div('body', `left:0;top:${lh - 1}px;width:${W}px;height:${bh + 1}px;border-radius:3px 3px ${W * 0.045}px ${W * 0.045}px / 3px 3px ${bh * 0.9}px ${bh * 0.9}px;background:linear-gradient(to bottom, ${darken(c, 30)}, ${darken(c, 8)} 30%, ${darken(c, 20)} 75%, ${darken(c, 45)})`);
  f += div('body', `${lid};background:${finish(fin, c)}`);
  // Anisotropic sheen: a finely brushed surface stretches the softbox's reflection across the grain into
  // a tall soft streak, over a broad falloff. No fine line texture: it aliases into moiré once scaled down.
  f += div('sheen', `${lid};background:radial-gradient(20% 90% at 30% 22%, rgba(255,255,255,.13), rgba(255,255,255,.04) 50%, transparent 76%), radial-gradient(120% 60% at ${KEY}, rgba(255,255,255,.09), transparent 70%), linear-gradient(to bottom, rgba(255,255,255,.06), transparent 10% 62%, rgba(0,0,0,.1) 90%, rgba(0,0,0,.2));box-shadow:${roll(lw * 0.006)}, inset 0 1px 0 rgba(255,255,255,.3)`);
  // Hinge barrel along the lid's lower edge, a shade darker than the lid.
  f += div('hinge', `left:${ov + (lw - hw) / 2}px;top:${lh - hh * 0.55}px;width:${hw}px;height:${hh}px;border-radius:${hh / 2}px;background:linear-gradient(to bottom, ${darken(c, 55)} 0, ${darken(c, 30)} 22%, ${darken(c, 6)} 48%, ${darken(c, 24)} 74%, ${darken(c, 55)});box-shadow:0 0 0 .75px ${darken(c, 60)}, ${cast(hh * 0.3, 0.3)}`);
  return f + logoMark(logo, ov + lw / 2, d.back?.logo?.y ?? lh / 2, lh * 0.1, c);
}

function backDesktop(d, color, screen, logo) {
  const { w, h } = screen;
  const bz = box(d.bezel ?? 34), rim = d.rim ?? 0, chin = d.chin ?? 0;
  const sw = d.stand?.w ?? 440, sh = d.stand?.h ?? 360, foot = 16, br = 26;
  const bw = w + bz.l + bz.r + rim * 2, bh = h + bz.t + bz.b + chin + rim * 2;
  const fin = d.back?.finish ?? 'aluminium', c = backTint(d, color);
  const top = d.back?.stand ?? bh * 0.45; // where the stand meets the back
  const sx = (bw - sw) / 2, sr = sw * 0.04, cap = sw * 0.09;
  const all = `left:0;top:0;width:${bw}px;height:${bh}px;border-radius:${br}px`;

  let f = div('body', `${all};background:${finish(fin, c)};box-shadow:${roll(bw * 0.006)}`);
  f += div('sheen', `${all};background:${sheen(fin)}`);
  // The stand leans back from its hinge, so it shades the back beside and below the joint (clipped to the body).
  f += div('bclip', all, div('standshadow', `left:${sx}px;top:${top}px;width:${sw}px;height:${bh}px;border-radius:${sr}px;box-shadow:${cast(sw * 0.08, 0.38, 0.05)}, 0 0 ${px(sw * 0.03)} rgba(0,0,0,.24)`));
  f += div('neck', `left:${sx}px;top:${top}px;width:${sw}px;height:${bh + sh - top}px;border-radius:${sr}px ${sr}px 0 0;background:linear-gradient(to bottom, rgba(0,0,0,.22), transparent ${cap * 1.8}px, transparent 55%, rgba(255,255,255,.1) 92%, rgba(0,0,0,.06)), linear-gradient(to right, ${lighten(c, 16)} 0, ${lighten(c, 7)} 5%, ${lighten(c, 4)} 50%, ${darken(c, 2)} 94%, ${darken(c, 16)});box-shadow:inset ${px(sw * 0.005)} 0 0 ${lighten(c, 26)}, inset ${px(-sw * 0.005)} 0 0 ${darken(c, 24)}`);
  // Hinge cap where the plate enters the back: a rounded barrel with a lit top edge.
  f += div('hinge', `left:${sx}px;top:${top}px;width:${sw}px;height:${cap}px;border-radius:${sr}px ${sr}px ${cap * 0.3}px ${cap * 0.3}px;background:linear-gradient(to bottom, ${lighten(c, 30)}, ${lighten(c, 8)} 30%, ${darken(c, 6)} 70%, ${darken(c, 28)});box-shadow:0 0 0 .75px ${darken(c, 35)}, 0 ${px(cap * 0.12)} ${px(cap * 0.2)} rgba(0,0,0,.22)`);
  f += div('body', `left:${sx}px;top:${bh + sh}px;width:${sw}px;height:${foot}px;border-radius:0 0 4px 4px;background:${standFoot(c)}`);
  return f + logoMark(logo, bw / 2, d.back?.logo?.y ?? bh * 0.27, bh * 0.09, c);
}

// Every back builder's markup starts with the shared stylesheet (a <style> anywhere in a shadow root
// applies to the whole root; identical sheets are shared by the engine).
const withCss = (fn) => (...a) => `<style>${BACK_CSS}</style>${fn(...a)}`;
const BACKS = { phone: withCss(backHandheld), tablet: withCss(backHandheld), watch: withCss(backHandheld), laptop: withCss(backLaptop), desktop: withCss(backDesktop) };

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
  const c = color.frame, sc = backTint(d, color), S = desktopSolid(d, bw), { fw, fd, ft } = S, k = 1.12;
  const tt = Math.max(4, Math.round(S.t * 0.2)), fx = (bw - fw) / 2, floor = tt + bh + S.lift, ny = tt + bh - 40;
  const fy = floor - ft - tip(fd, k).proj(fd);
  const foot = deckSlab(fx, fy, fw, fd, k, fw * 0.07, ft, sc, `linear-gradient(${darken(sc, 16)}, ${sc} 30%, ${lighten(sc, 10)})`);

  let f = div('shadow3', `left:${fx - fw * 0.06}px;top:${floor - ft * 1.3}px;width:${fw * k * 1.07}px;height:${ft * 2.2}px;border-radius:50%;background:rgba(0,0,0,.5);filter:blur(${ft * 0.6}px)`);
  f += div('neck', `left:${fx}px;top:${ny}px;width:${fw}px;height:${fy - ny + 4}px;background:linear-gradient(rgba(0,0,0,.3), transparent 30%, transparent calc(100% - 22px), rgba(255,255,255,.3) calc(100% - 8px), rgba(0,0,0,.1)), ${plateEdges(sc)}`);
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
  const c = color.frame, sc = backTint(d, color), S = desktopSolid(d, bw), { fw, fd, ft } = S, Td = S.t, F = S.lift;
  const zf = Math.round(fd * 0.06); // the foot's front edge pokes out just past the glass
  // Neck: a plate from the back of the foot up to the middle of the display's back. It stops just
  // behind the back face: intersecting planes make Chrome's depth sort leave specks.
  const nb = [F - ft - ft * 0.3, zf - fd + ft * 1.5], nt = [-bh * 0.42, -Td - ft / 2 - 1];
  const ny = nb[0] - nt[0], nz = nt[1] - nb[1], tilt = (Math.atan2(nz, ny) * 180) / Math.PI;
  const points = () => [...box8(-bw / 2, bw / 2, -bh, 0, -Td, 0), ...box8(-fw / 2, fw / 2, F - ft, F, zf - fd, zf)];
  const cam = camera3d(points, bw * 3, pose);

  let f = face('shadow3', fw * 1.5, fd * 1.3, `translate3d(0,${F + 1}px,${zf - fd / 2}px) rotateX(90deg)`, 'background:radial-gradient(closest-side, rgba(0,0,0,.4), rgba(0,0,0,.16) 55%, transparent)');
  f += g3(`translate3d(0,${(nb[0] + nt[0]) / 2}px,${(nb[1] + nt[1]) / 2}px) rotateX(${-tilt}deg)`, slab(fw, Math.hypot(ny, nz), ft, 0, {
    front: `linear-gradient(${darken(sc, 12)}, ${lighten(sc, 8)})`, back: darken(sc, 8), edge: sc, light: -90,
  }));
  f += g3(`translate3d(0,${F - ft / 2}px,${zf - fd / 2}px) rotateX(90deg)`, slab(fw, fd, ft, fw * 0.07, {
    front: `linear-gradient(${darken(sc, 10)}, ${lighten(sc, 8)})`, back: darken(sc, 25), edge: sc, light: 90,
  }));
  f += g3(`translate3d(0,${-bh / 2}px,${-Td / 2}px)`, slab(bw, bh, Td, br, {
    front: chin ? c : metal(c), edge: c, light: -90,
    inner: div('glass', `left:${rim}px;top:${rim}px;width:${bw - rim * 2}px;height:${glassH}px;border-radius:${chin ? `${br - rim}px ${br - rim}px 0 0` : `${br - rim}px`};background:${color.front}`) + bezelCamera(d.cutout, rim, rim, bw - rim * 2, glassH, bz),
    back: `linear-gradient(200deg, ${lighten(sc, 14)}, ${sc} 50%, ${darken(sc, 8)})`,
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
  if (d.home === 'indicator') { // iOS: 134 × 5 pt, 8 pt from the bottom, on every iPhone
    const w = d.kind === 'tablet' ? Math.min(lw * 0.3, 320) : 134;
    return div('home', `left:${(lw - w) / 2}px;top:${lh - 13}px;width:${w}px;height:5px;border-radius:3px;background:${ink}`);
  }
  if (d.home === 'pill') { // AOSP gesture handle: 108 × 4 dp, 10 dp from the bottom
    return div('home', `left:${(lw - 108) / 2}px;top:${lh - 14}px;width:108px;height:4px;border-radius:2px;background:${ink}`);
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

  #stage; #device; #frame; #screen; #content; #media; #chrome; #cutout; #ring; #dyn;
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
  // variant="3d" state: live camera/lid (drag and open()/close() change these without re-rendering)
  #three = null; #lidEl = null; #rx = 0; #ry = 0; #lid = 0; #lidMax = null; #poseKey = ''; #anim = null; #spin = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLES}${SOLID_CSS}</style><style></style>
      <div class="stage" part="stage"><div class="back" part="back" aria-hidden="true"></div><div class="device" part="device">
        <div class="frame" part="frame" aria-hidden="true"></div>
        <div class="screen" part="screen">
          <div class="content" part="content"><div class="media" part="media"></div><div class="chrome" aria-hidden="true"></div></div>
          <div class="cutout" aria-hidden="true"></div><div class="glare" aria-hidden="true"></div>
        </div>
        <div class="ring" aria-hidden="true"></div>
      </div></div>`;
    const q = (s) => root.querySelector(s);
    this.#dyn = root.querySelectorAll('style')[1];
    this.#stage = q('.stage'); this.#device = q('.device'); this.#frame = q('.frame'); this.#screen = q('.screen');
    this.#content = q('.content'); this.#media = q('.media'); this.#chrome = q('.chrome'); this.#cutout = q('.cutout');
    this.#back = q('.back'); this.#ring = q('.ring');
    this.addEventListener('pointerdown', (e) => this.#grab(e));
  }

  #onDefine = (e) => { if (getDevice(this.getAttribute('device') || 'iphone-17-pro')?.id === e.detail.id) this.#render(); };

  connectedCallback() {
    addEventListener('bezelkit:define', this.#onDefine);
    this.#render();
    this.#ro ??= new ResizeObserver(() => this.#scale());
    this.#ro.observe(this);
  }

  disconnectedCallback() { this.#ro?.disconnect(); this.#spin?.stop(); removeEventListener('bezelkit:define', this.#onDefine); }

  attributeChangedCallback(name) {
    if (this.#fold && (name === 'folded' || name === 'fold-angle')) return void this.#foldTo(this.#foldTarget(), this.#foldOpts);
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
    const landscape = attr('orientation') === 'landscape' && (d.kind === 'phone' || d.kind === 'tablet' || d.kind === 'foldable');
    const rotatesChrome = landscape && (d.kind === 'phone' || d.fold === 'flip');

    let screen = { w: d.screen.w, h: d.screen.h };
    const vp = /^(\d+)\s*[x×]\s*(\d+)$/i.exec(attr('viewport') ?? '');
    if (vp && d.kind === 'browser') screen = { w: +vp[1], h: +vp[2] };

    const pose = readPose(this, d.kind);
    const L = (VARIANTS[d.kind]?.[attr('variant')] ?? BUILDERS[d.kind])(d, color, screen, { theme, url: attr('url'), pose });
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
    // Landscape: the home indicator keeps 20 at the bottom; only a notch/island/hole gets side insets (not the SE).
    const side = d.cutout && d.cutout.type !== 'camera' ? st : 0;
    const safe = rotatesChrome ? { t: 0, r: side, b: sb ? 20 : 0, l: side } : { t: st, r: d.safe?.right ?? 0, b: sb, l: d.safe?.left ?? 0 };
    const inset = pad ? safe : { t: 0, r: 0, b: 0, l: 0 };
    this.#box = { w: lw - inset.l - inset.r, h: lh - inset.t - inset.b };

    // geometry
    this.#dyn.textContent = `:host { aspect-ratio: ${S.W} / ${S.H}; }`;
    Object.assign(this.#stage.style, { width: `${S.W}px`, height: `${S.H}px` });
    Object.assign(this.#device.style, { width: `${L.W}px`, height: `${L.H}px`, transform: S.front, visibility: S.side === 'back' ? 'hidden' : '' });
    this.#frame.innerHTML = L.frame;
    Object.assign(this.#screen.style, { left: `${L.screen.x}px`, top: `${L.screen.y}px`, width: `${screen.w}px`, height: `${screen.h}px`, borderRadius: L.screen.radius });
    // A thin bezel-coloured ring over the screen edge hides the 1 px seams a scaled overflow clip leaves
    // between raster tiles. Not on browsers (no bezel), foldables (split screen) or variant="3d" (the screen moves).
    const ring = !L.fold && !L.three && d.kind !== 'browser';
    Object.assign(this.#ring.style, ring ? {
      display: '', left: `${L.screen.x - 1}px`, top: `${L.screen.y - 1}px`, width: `${screen.w + 2}px`, height: `${screen.h + 2}px`,
      borderRadius: L.screen.radius.replace(/[\d.]+px/g, (v) => `${parseFloat(v) + 1}px`), border: `1.5px solid ${color.front}`,
    } : { display: 'none' });
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
      this.#orbit(dx, dy);
    };
    const up = (ev) => {
      for (const [n, fn] of [['pointermove', move], ['pointerup', up], ['pointercancel', up]]) this.removeEventListener(n, fn);
      this.#device.classList.remove('grabbing');
      if (ev.type === 'pointerup' && ev.timeStamp - lt < 80 && !reducedMotion()) this.#coast(vx, vy);
    };
    for (const [n, fn] of [['pointermove', move], ['pointerup', up], ['pointercancel', up]]) this.addEventListener(n, fn);
  }

  #orbit(dx, dy) {
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
      this.#orbit(vx * dt, vy * dt);
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
    const side = cv.cutout && cv.cutout.type !== 'camera' ? st : 0;
    const safe = g.land ? { t: 0, r: side, b: sb ? 20 : 0, l: side } : { t: st, r: cs.right ?? 0, b: sb, l: cs.left ?? 0 };
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
