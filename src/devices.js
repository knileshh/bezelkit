// Device registry.
//
// Units are CSS px: Apple "points" / Android "dp" — the viewport a real browser on that device
// reports. So an <iframe> inside a frame renders exactly like the page would on the device,
// and a 3x screenshot (e.g. 1206×2622) maps 1:1 onto a 402×874 screen.
//
// Screen sizes come from published viewport tables. Corner radii, bezel widths and button
// positions are measured estimates; PRs with better numbers are welcome (see CONTRIBUTING).
//
// Shape of a device:
//   id, name, brand, kind: 'phone' | 'tablet' | 'watch' | 'laptop' | 'desktop' | 'browser'
//   screen   { w, h, radius }            viewport + display corner radius
//   bezel    number | { t, r, b, l }      black glass between screen and frame
//   rim      number                        metal frame thickness
//   cutout   { type: 'island'|'notch'|'hole'|'camera'|'mac-notch', ... }
//   safe     { top, bottom }              safe-area insets in portrait
//   statusBar 'ios'|'android'|'ipados'|'macos'|'watch'|null
//   home     'indicator'|'pill'|'button'|null
//   buttons  [{ side: 'left'|'right'|'top', at, len, w?, flush?, crown?, color? }]
//   colors   [[name, frameColor, frontColor?, backColor?], ...]  first entry is the default
//   solid    depth for variant="deck" | "3d" (laptops, desktops), in the same px as the screen:
//            laptop  { lid, base, depth, pro? }      lid/base thickness, base depth;
//                                                    pro = black keyboard well + speaker grilles
//            desktop { t, lift, foot: { w, d, t } }  display thickness, floor-to-display gap, foot plate
//   back     { finish, camera, window?, logo?, stand? }   the rear, for side="back" / "both"
//     finish  'glass' (matte) | 'gloss' | 'aluminium' | 'titanium' | 'polished'
//     camera  { plates: [{ x, y, w, h, r, tone?, fill? }], parts: [{ x, y, d, kind? }] }
//             plates are raised modules (plateau, bar, bump) drawn in order; tone is a finish
//             name or 'dark'. parts are centred circles: kind 'lens' (default) | 'flash' |
//             'lidar' | 'sensor' | 'mic'.
//     window  { x, y, w, h, r, tone? }  a flush inset panel of another finish
//     logo    { y }  centre of the neutral logo="dot" placeholder (brand logos are never drawn)
//     stand   y where a desktop's stand meets the back
//   Back coordinates are px from the body's top-left corner as seen from BEHIND, so a phone's
//   camera sits top-left. Body = screen + bezels + 2 × rim, about 6 px per mm on phones
//   (body width in px ÷ real width in mm gives the scale for other devices).
//
// Foldables (kind: 'foldable') add:
//   fold     'book' (vertical hinge, the left half closes over the right) | 'flip' (horizontal hinge,
//            the top half closes over the bottom)
//   ppi      inner display density; with dpr it sets the physical scale (CSS px per mm) of the body
//   body     { open: [w, h, depth], folded: [w, h, depth] }  in mm, from the maker's spec sheet
//   cover    { w, h, radius, ppi, dpr?, cutout, safe, statusBar?, home? }  the outer display, in its own
//            CSS px; it is drawn on the back of the moving half at the same physical scale as `screen`
//   `screen` is the inner (main) display. `safe` may also carry `left`/`right`.
//   Foldables have no `back`: the cover display is their other face.

const registry = new Map();

const aliases = {
  iphone: 'iphone-17-pro',
  android: 'pixel-10-pro',
  pixel: 'pixel-10-pro',
  galaxy: 'galaxy-s25-ultra',
  ipad: 'ipad-pro-11',
  macbook: 'macbook-pro-14',
  imac: 'imac-24',
  watch: 'apple-watch-series-11',
  browser: 'browser-chrome',
  fold: 'galaxy-z-fold7',
  flip: 'galaxy-z-flip7',
};

export function defineDevice(spec) {
  if (!spec || !spec.id || !spec.screen || !spec.screen.w || !spec.screen.h) {
    throw new TypeError('bezelkit: a device needs an id and screen { w, h }');
  }
  const device = Object.freeze({ kind: 'phone', brand: '', colors: [['Default', '#2b2b2e']], ...spec });
  registry.set(device.id, device);
  globalThis.dispatchEvent?.(new CustomEvent('bezelkit:define', { detail: { id: device.id } }));
  return device;
}

export const getDevice = (id) => registry.get(aliases[id] ?? id);
export const listDevices = () => [...registry.values()];

const island = { type: 'island', w: 125, h: 37, top: 11 };

// ─── Apple phones ──────────────────────────────────────────────────────────

defineDevice({
  id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 440, h: 956, radius: 62 }, bezel: 8, rim: 5,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 175, len: 34 }, { side: 'left', at: 245, len: 64 }, { side: 'left', at: 325, len: 64 },
    { side: 'right', at: 280, len: 100 }, { side: 'right', at: 560, len: 60, flush: true },
  ],
  colors: [['Cosmic Orange', '#c8652f'], ['Deep Blue', '#353f55'], ['Silver', '#dcdcda']],
  // Full-width aluminium plateau: triple camera left, flash + LiDAR right; Ceramic Shield window below.
  back: {
    finish: 'aluminium', logo: { y: 610 },
    window: { x: 26, y: 322, w: 414, h: 590, r: 18 },
    camera: {
      plates: [{ x: 0, y: 0, w: 466, h: 284, r: '75px 75px 12px 12px' }],
      parts: [
        { x: 92, y: 86, d: 104 }, { x: 92, y: 198, d: 104 }, { x: 196, y: 142, d: 104 },
        { x: 392, y: 92, d: 32, kind: 'flash' }, { x: 392, y: 142, d: 7, kind: 'mic' }, { x: 392, y: 192, d: 34, kind: 'lidar' },
      ],
    },
  },
});

defineDevice({
  id: 'iphone-17-pro', name: 'iPhone 17 Pro', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 402, h: 874, radius: 62 }, bezel: 8, rim: 5,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 160, len: 32 }, { side: 'left', at: 225, len: 60 }, { side: 'left', at: 300, len: 60 },
    { side: 'right', at: 255, len: 95 }, { side: 'right', at: 515, len: 55, flush: true },
  ],
  colors: [['Deep Blue', '#353f55'], ['Cosmic Orange', '#c8652f'], ['Silver', '#dcdcda']],
  back: {
    finish: 'aluminium', logo: { y: 560 },
    window: { x: 24, y: 296, w: 380, h: 540, r: 16 },
    camera: {
      plates: [{ x: 0, y: 0, w: 428, h: 262, r: '75px 75px 12px 12px' }],
      parts: [
        { x: 84, y: 78, d: 96 }, { x: 84, y: 182, d: 96 }, { x: 180, y: 130, d: 96 },
        { x: 360, y: 84, d: 30, kind: 'flash' }, { x: 360, y: 130, d: 7, kind: 'mic' }, { x: 360, y: 176, d: 32, kind: 'lidar' },
      ],
    },
  },
});

defineDevice({
  id: 'iphone-air', name: 'iPhone Air', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 420, h: 912, radius: 62 }, bezel: 8, rim: 4,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 165, len: 32 }, { side: 'left', at: 230, len: 60 }, { side: 'left', at: 305, len: 60 },
    { side: 'right', at: 265, len: 95 }, { side: 'right', at: 530, len: 55, flush: true },
  ],
  colors: [['Sky Blue', '#c9d8e6'], ['Light Gold', '#e6d8bd'], ['Cloud White', '#efeee9'], ['Space Black', '#232326']],
  // Stadium-shaped plateau across the top holding the single 48MP Fusion camera and flash.
  back: {
    finish: 'glass', logo: { y: 500 },
    camera: {
      plates: [{ x: 20, y: 22, w: 404, h: 120, r: 60 }],
      parts: [{ x: 82, y: 82, d: 86 }, { x: 166, y: 82, d: 24, kind: 'flash' }, { x: 200, y: 82, d: 6, kind: 'mic' }],
    },
  },
});

defineDevice({
  id: 'iphone-17', name: 'iPhone 17', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 402, h: 874, radius: 62 }, bezel: 9, rim: 5,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 160, len: 32 }, { side: 'left', at: 225, len: 60 }, { side: 'left', at: 300, len: 60 },
    { side: 'right', at: 255, len: 95 }, { side: 'right', at: 515, len: 55, flush: true },
  ],
  colors: [['Lavender', '#c9bddb'], ['Sage', '#b6c4a6'], ['Mist Blue', '#a8bbcf'], ['White', '#f1f1ef'], ['Black', '#28282b']],
  // Vertical pill bump with two lenses; flash and mic outside it.
  back: {
    finish: 'glass', logo: { y: 451 },
    camera: {
      plates: [{ x: 26, y: 26, w: 106, h: 212, r: 53 }],
      parts: [{ x: 79, y: 79, d: 84 }, { x: 79, y: 185, d: 84 }, { x: 160, y: 68, d: 24, kind: 'flash' }, { x: 160, y: 104, d: 6, kind: 'mic' }],
    },
  },
});

defineDevice({
  id: 'iphone-16e', name: 'iPhone 16e', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 390, h: 844, radius: 47 }, bezel: 11, rim: 5,
  cutout: { type: 'notch', w: 162, h: 33 }, statusBar: 'ios', home: 'indicator', safe: { top: 47, bottom: 34 },
  buttons: [
    { side: 'left', at: 145, len: 28 }, { side: 'left', at: 205, len: 56 }, { side: 'left', at: 275, len: 56 },
    { side: 'right', at: 245, len: 90 },
  ],
  colors: [['Black', '#2a2a2c'], ['White', '#f1f1ef']],
  back: {
    finish: 'glass', logo: { y: 438 },
    camera: { parts: [{ x: 72, y: 72, d: 78 }, { x: 142, y: 60, d: 22, kind: 'flash' }, { x: 142, y: 92, d: 5, kind: 'mic' }] },
  },
});

defineDevice({
  id: 'iphone-se', name: 'iPhone SE (3rd gen)', brand: 'Apple', kind: 'phone', year: 2022, dpr: 2,
  screen: { w: 375, h: 667, radius: 0 }, bezel: { t: 105, r: 24, b: 105, l: 24 }, rim: 4, bodyRadius: 70,
  earpiece: true, statusBar: 'ios', home: 'button', safe: { top: 20, bottom: 0 },
  buttons: [
    { side: 'left', at: 110, len: 24 }, { side: 'left', at: 170, len: 50 }, { side: 'left', at: 235, len: 50 },
    { side: 'right', at: 170, len: 60 },
  ],
  colors: [['Midnight', '#262b31'], ['Starlight', '#ece6db', '#f6f5f2'], ['(PRODUCT)RED', '#b1121d']],
  back: {
    finish: 'gloss', logo: { y: 400 },
    camera: { parts: [{ x: 62, y: 60, d: 50 }, { x: 96, y: 60, d: 5, kind: 'mic' }, { x: 126, y: 60, d: 24, kind: 'flash' }] },
  },
});

// ─── Android phones ────────────────────────────────────────────────────────

defineDevice({
  id: 'pixel-10-pro', name: 'Pixel 10 Pro', brand: 'Google', kind: 'phone', year: 2025, dpr: 3.12,
  screen: { w: 410, h: 914, radius: 46 }, bezel: 10, rim: 5, bodyRadius: 64,
  cutout: { type: 'hole', d: 14, top: 14 }, statusBar: 'android', home: 'pill', safe: { top: 40, bottom: 24 },
  buttons: [{ side: 'right', at: 200, len: 62 }, { side: 'right', at: 300, len: 120 }],
  colors: [['Obsidian', '#2b2d31'], ['Porcelain', '#e8e3da'], ['Moonstone', '#6e7a89'], ['Jade', '#c7d9c8']],
  // Polished camera bar ("visor") with a black glass window: three cameras, flash and sensor.
  back: {
    finish: 'glass', logo: { y: 640 },
    camera: {
      plates: [{ x: 22, y: 52, w: 396, h: 106, r: 53, tone: 'polished' }, { x: 32, y: 62, w: 376, h: 86, r: 43, tone: 'dark' }],
      parts: [
        { x: 84, y: 105, d: 68 }, { x: 164, y: 105, d: 68 }, { x: 244, y: 105, d: 62 },
        { x: 318, y: 105, d: 22, kind: 'flash' }, { x: 356, y: 105, d: 14, kind: 'sensor' },
      ],
    },
  },
});

defineDevice({
  id: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra', brand: 'Samsung', kind: 'phone', year: 2025, dpr: 3.5,
  screen: { w: 412, h: 891, radius: 26 }, bezel: 8, rim: 4, bodyRadius: 38,
  cutout: { type: 'hole', d: 11, top: 12 }, statusBar: 'android', home: 'pill', safe: { top: 34, bottom: 24 },
  buttons: [{ side: 'right', at: 180, len: 100 }, { side: 'right', at: 305, len: 55 }],
  colors: [['Titanium Silverblue', '#9eb0c3'], ['Titanium Black', '#2c2d2f'], ['Titanium Gray', '#8b8a86'], ['Titanium Whitesilver', '#e4e4e1']],
  // Floating rings: ultra-wide, wide and 3x in a column; 5x periscope and laser AF beside, then the flash.
  back: {
    finish: 'glass', logo: { y: 820 },
    camera: {
      parts: [
        { x: 66, y: 72, d: 78 }, { x: 66, y: 160, d: 78 }, { x: 66, y: 248, d: 78 },
        { x: 146, y: 112, d: 60 }, { x: 146, y: 180, d: 30, kind: 'sensor' }, { x: 146, y: 226, d: 20, kind: 'flash' },
      ],
    },
  },
});

defineDevice({
  id: 'galaxy-s25', name: 'Galaxy S25', brand: 'Samsung', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 360, h: 780, radius: 38 }, bezel: 9, rim: 4, bodyRadius: 52,
  cutout: { type: 'hole', d: 10, top: 10 }, statusBar: 'android', home: 'pill', safe: { top: 30, bottom: 24 },
  buttons: [{ side: 'right', at: 175, len: 85 }, { side: 'right', at: 280, len: 50 }],
  colors: [['Icyblue', '#c9d8e6'], ['Navy', '#2b3346'], ['Mint', '#cfe5d8'], ['Silver Shadow', '#c9c9c9']],
  back: {
    finish: 'glass', logo: { y: 720 },
    camera: { parts: [{ x: 58, y: 62, d: 64 }, { x: 58, y: 136, d: 64 }, { x: 58, y: 210, d: 64 }, { x: 118, y: 62, d: 16, kind: 'flash' }] },
  },
});

defineDevice({
  id: 'android', name: 'Android (generic)', brand: 'Android', kind: 'phone', dpr: 3,
  screen: { w: 360, h: 800, radius: 26 }, bezel: { t: 12, r: 10, b: 16, l: 10 }, rim: 3, bodyRadius: 42,
  cutout: { type: 'hole', d: 12, top: 12 }, statusBar: 'android', home: 'pill', safe: { top: 32, bottom: 24 },
  buttons: [{ side: 'right', at: 130, len: 80 }, { side: 'right', at: 230, len: 50 }],
  colors: [['Graphite', '#3a3d42'], ['Blue', '#3c5a86'], ['White', '#e9e9e9']],
  back: {
    finish: 'glass',
    camera: {
      plates: [{ x: 28, y: 28, w: 84, h: 150, r: 26, tone: 'dark' }],
      parts: [{ x: 70, y: 68, d: 56 }, { x: 70, y: 132, d: 50 }, { x: 138, y: 58, d: 18, kind: 'flash' }],
    },
  },
});

// ─── Foldables ─────────────────────────────────────────────────────────────
// Resolutions, ppi, body sizes and colour names are official. No maker publishes CSS viewports for
// these, so w/h are derived as resolution ÷ dpr (Android 420dpi = 2.625, iOS 3x) and rounded.
// Radii, bezels, button positions, safe areas and hex values are estimates.

// samsung.com/levant/smartphones/galaxy-z-fold7/specs, en.wikipedia.org/wiki/Samsung_Galaxy_Z_Fold_7
// Inner 1968×2184 @ 368 ppi, cover 1080×2520 @ 422 ppi. Hole-punch returns on the inner display, top of the
// right half (9to5google.com/2025/06/28/galaxy-z-fold-7-leak-unfolded-hole-punch-camera).
defineDevice({
  id: 'galaxy-z-fold7', name: 'Galaxy Z Fold7', brand: 'Samsung', kind: 'foldable', fold: 'book', year: 2025, dpr: 2.625, ppi: 368,
  screen: { w: 750, h: 832, radius: 20 }, rim: 3,
  cutout: { type: 'hole', d: 11, top: 13, left: 557 }, statusBar: 'android', home: 'pill', safe: { top: 36, bottom: 24 },
  cover: { w: 411, h: 960, radius: 34, ppi: 422, cutout: { type: 'hole', d: 11, top: 12 }, safe: { top: 34, bottom: 24 } },
  body: { open: [143.2, 158.4, 4.2], folded: [72.8, 158.4, 8.9] },
  buttons: [{ side: 'right', at: 190, len: 95 }, { side: 'right', at: 305, len: 62 }],
  colors: [['Blue Shadow', '#3b4a64'], ['Silver Shadow', '#b8bcc3'], ['Jetblack', '#202124'], ['Mint', '#c1dcd1']],
});

// samsung.com/levant/smartphones/galaxy-z-flip7/specs, en.wikipedia.org/wiki/Samsung_Galaxy_Z_Flip_7
// Main 1080×2520 @ 397 ppi, FlexWindow 948×1048 (4.1″ → ~345 ppi, derived). The FlexWindow wraps edge to edge
// around the two rear cameras (news.samsung.com/us, Flip7 launch), which sit bottom-left when closed.
defineDevice({
  id: 'galaxy-z-flip7', name: 'Galaxy Z Flip7', brand: 'Samsung', kind: 'foldable', fold: 'flip', year: 2025, dpr: 2.625, ppi: 397,
  screen: { w: 411, h: 960, radius: 30 }, rim: 3,
  cutout: { type: 'hole', d: 11, top: 14 }, statusBar: 'android', home: 'pill', safe: { top: 36, bottom: 24 },
  cover: { w: 361, h: 399, radius: 46, ppi: 345, cutout: { type: 'flexcam', d: 54, left: 12, top: 333, gap: 10 }, safe: { top: 28, bottom: 0 }, home: null },
  body: { open: [75.2, 166.7, 6.5], folded: [75.2, 85.5, 13.7] },
  buttons: [{ side: 'right', at: 300, len: 88 }, { side: 'right', at: 400, len: 56 }],
  colors: [['Blue Shadow', '#3c4e6c'], ['Jetblack', '#1d1e21'], ['Coralred', '#e0665a'], ['Mint', '#b8dccc']],
});

// store.google.com/product/pixel_10_pro_fold_specs, gsmarena.com/google_pixel_10_pro_fold-14014.php
// Inner 2076×2152 @ 373 ppi (camera top-right), outer 1080×2364 @ 408 ppi (camera top-centre).
defineDevice({
  id: 'pixel-10-pro-fold', name: 'Pixel 10 Pro Fold', brand: 'Google', kind: 'foldable', fold: 'book', year: 2025, dpr: 2.625, ppi: 373,
  screen: { w: 791, h: 820, radius: 24 }, rim: 4,
  cutout: { type: 'hole', d: 12, top: 14, left: 764 }, statusBar: 'android', home: 'pill', safe: { top: 40, bottom: 24 },
  cover: { w: 411, h: 901, radius: 40, ppi: 408, cutout: { type: 'hole', d: 12, top: 14 }, safe: { top: 40, bottom: 24 } },
  body: { open: [150.4, 155.2, 5.2], folded: [76.3, 155.2, 10.8] },
  buttons: [{ side: 'right', at: 170, len: 62 }, { side: 'right', at: 250, len: 110 }],
  colors: [['Moonstone', '#6e7a89'], ['Jade', '#c7d9c8']],
});

// Official (announced 2026-09-09): apple.com/newsroom/2026/09/apple-unveils-iphone-duo, apple.com/iphone-duo/specs,
// developer.apple.com/design/human-interface-guidelines/designing-for-iphone-duo
// A wide "passport" book fold: inner 1878×2670 @ 430 ppi is landscape when open (164.6 × 117.8 mm), outer
// 1398×2034 @ 460 ppi. Points aren't published; 890×626 and 466×678 assume 3x. The inner FaceTime camera is
// under the display; the outer camera sits top-right in a vertical Dynamic Island, with the status bar and
// toolbars on the trailing edge. Island size and side-rail widths are estimates.
defineDevice({
  id: 'iphone-duo', name: 'iPhone Duo', brand: 'Apple', kind: 'foldable', fold: 'book', year: 2026, dpr: 3, ppi: 430,
  screen: { w: 890, h: 626, radius: 36 }, rim: 4,
  cutout: null, statusBar: 'ios-side', home: 'indicator', safe: { top: 0, bottom: 20, right: 44 },
  cover: { w: 466, h: 678, radius: 50, ppi: 460, cutout: { type: 'island-v', w: 36, h: 92, top: 14, right: 11 }, safe: { top: 0, bottom: 20, right: 58 } },
  body: { open: [164.6, 117.8, 5.2], folded: [84.1, 117.8, 11.3] },
  buttons: [{ side: 'top', at: 690, len: 64 }, { side: 'right', at: 110, len: 70 }],
  colors: [['Night Sky', '#243149'], ['Star White', '#ecebe6']],
});

// ─── Tablets ───────────────────────────────────────────────────────────────

defineDevice({
  id: 'ipad-pro-13', name: 'iPad Pro 13″', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 1032, h: 1376, radius: 18 }, bezel: 22, rim: 4,
  cutout: { type: 'camera', side: 'left', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 940, len: 58 }, { side: 'right', at: 70, len: 48 }, { side: 'right', at: 128, len: 48 }],
  colors: [['Space Black', '#2f2f31'], ['Silver', '#dfe0e2']],
  // Camera bump: wide lens, Adaptive True Tone flash, LiDAR, ambient light sensor, mic.
  back: {
    finish: 'aluminium',
    camera: {
      plates: [{ x: 32, y: 32, w: 132, h: 132, r: 38 }],
      parts: [{ x: 72, y: 72, d: 64 }, { x: 128, y: 70, d: 22, kind: 'flash' }, { x: 126, y: 124, d: 38, kind: 'lidar' }, { x: 72, y: 128, d: 10, kind: 'sensor' }, { x: 100, y: 100, d: 5, kind: 'mic' }],
    },
  },
});

defineDevice({
  id: 'ipad-pro-11', name: 'iPad Pro 11″', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 834, h: 1210, radius: 18 }, bezel: 22, rim: 4,
  cutout: { type: 'camera', side: 'left', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 750, len: 55 }, { side: 'right', at: 65, len: 45 }, { side: 'right', at: 120, len: 45 }],
  colors: [['Space Black', '#2f2f31'], ['Silver', '#dfe0e2']],
  back: {
    finish: 'aluminium',
    camera: {
      plates: [{ x: 32, y: 32, w: 132, h: 132, r: 38 }],
      parts: [{ x: 72, y: 72, d: 64 }, { x: 128, y: 70, d: 22, kind: 'flash' }, { x: 126, y: 124, d: 38, kind: 'lidar' }, { x: 72, y: 128, d: 10, kind: 'sensor' }, { x: 100, y: 100, d: 5, kind: 'mic' }],
    },
  },
});

defineDevice({
  id: 'ipad-air-11', name: 'iPad Air 11″', brand: 'Apple', kind: 'tablet', year: 2025, dpr: 2,
  screen: { w: 820, h: 1180, radius: 18 }, bezel: 24, rim: 4,
  cutout: { type: 'camera', side: 'left', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 740, len: 55 }, { side: 'right', at: 65, len: 45 }, { side: 'right', at: 120, len: 45 }],
  colors: [['Space Gray', '#5b5d62'], ['Blue', '#a8bcd0'], ['Purple', '#bdb3cf'], ['Starlight', '#e9e2d6']],
  back: { finish: 'aluminium', camera: { parts: [{ x: 56, y: 56, d: 50 }, { x: 56, y: 96, d: 5, kind: 'mic' }] } }, // no flash on iPad Air
});

defineDevice({
  id: 'ipad-mini', name: 'iPad mini', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 744, h: 1133, radius: 21 }, bezel: 22, rim: 4,
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 640, len: 50 }, { side: 'right', at: 60, len: 45 }, { side: 'right', at: 115, len: 45 }],
  colors: [['Space Gray', '#5b5d62'], ['Blue', '#a9b8cb'], ['Purple', '#b9b0c9'], ['Starlight', '#e9e2d6']],
  back: { finish: 'aluminium', camera: { parts: [{ x: 56, y: 56, d: 52 }, { x: 104, y: 56, d: 20, kind: 'flash' }, { x: 104, y: 84, d: 5, kind: 'mic' }] } },
});

defineDevice({
  id: 'galaxy-tab-s10-plus', name: 'Galaxy Tab S10+', brand: 'Samsung', kind: 'tablet', year: 2024, dpr: 2.19,
  screen: { w: 800, h: 1280, radius: 16 }, bezel: 20, rim: 3,
  cutout: { type: 'camera', side: 'left', d: 7 }, statusBar: 'android', home: 'pill', safe: { top: 28, bottom: 20 },
  buttons: [{ side: 'top', at: 620, len: 60 }, { side: 'top', at: 700, len: 40 }],
  colors: [['Moonstone Gray', '#6d7078'], ['Platinum Silver', '#d8d8d6']],
  back: { finish: 'aluminium', camera: { parts: [{ x: 52, y: 54, d: 46 }, { x: 52, y: 110, d: 40 }, { x: 98, y: 54, d: 14, kind: 'flash' }] } },
});

// ─── Watches ───────────────────────────────────────────────────────────────

defineDevice({
  id: 'apple-watch-ultra', name: 'Apple Watch Ultra', brand: 'Apple', kind: 'watch', dpr: 2,
  screen: { w: 205, h: 251, radius: 44 }, bezel: 14, rim: 9, bodyRadius: 66, pad: { t: 0, r: 16, b: 0, l: 6 },
  statusBar: 'watch', safe: { top: 0, bottom: 0 },
  buttons: [
    { side: 'right', at: 95, len: 58, w: 12, crown: true }, { side: 'right', at: 175, len: 50, w: 5 },
    { side: 'left', at: 80, len: 45, w: 5, color: '#f26b1d' },
  ],
  colors: [['Natural Titanium', '#c9c3b7'], ['Black Titanium', '#2a2a2b']],
  // Sensor dome: dark crystal with a ring and photodiode windows.
  back: {
    finish: 'titanium',
    camera: {
      plates: [{ x: 30, y: 53, w: 191, h: 191, r: '50%', tone: 'dark' }, { x: 73, y: 96, w: 105, h: 105, r: '50%', tone: 'dark' }],
      parts: [{ x: 125, y: 148, d: 26, kind: 'sensor' }, { x: 125, y: 115, d: 12, kind: 'sensor' }, { x: 125, y: 181, d: 12, kind: 'sensor' }, { x: 92, y: 148, d: 12, kind: 'sensor' }, { x: 158, y: 148, d: 12, kind: 'sensor' }],
    },
  },
});

defineDevice({
  id: 'apple-watch-series-11', name: 'Apple Watch Series 11 (46mm)', brand: 'Apple', kind: 'watch', year: 2025, dpr: 2,
  screen: { w: 208, h: 248, radius: 50 }, bezel: 12, rim: 5, bodyRadius: 66, pad: { t: 0, r: 14, b: 0, l: 2 },
  statusBar: 'watch', safe: { top: 0, bottom: 0 },
  buttons: [{ side: 'right', at: 70, len: 45, w: 10, crown: true }, { side: 'right', at: 140, len: 42, w: 4 }],
  colors: [['Jet Black', '#1f1f21'], ['Rose Gold', '#e7c8b8'], ['Silver', '#d9dadc'], ['Space Gray', '#55575b']],
  back: {
    finish: 'aluminium',
    camera: {
      plates: [{ x: 26, y: 46, w: 190, h: 190, r: '50%', tone: 'dark' }, { x: 68, y: 88, w: 106, h: 106, r: '50%', tone: 'dark' }],
      parts: [{ x: 121, y: 141, d: 26, kind: 'sensor' }, { x: 121, y: 108, d: 12, kind: 'sensor' }, { x: 121, y: 174, d: 12, kind: 'sensor' }, { x: 88, y: 141, d: 12, kind: 'sensor' }, { x: 154, y: 141, d: 12, kind: 'sensor' }],
    },
  },
});

// ─── Laptops & desktops ────────────────────────────────────────────────────

defineDevice({
  id: 'macbook-pro-14', name: 'MacBook Pro 14″', brand: 'Apple', kind: 'laptop', year: 2024, dpr: 2,
  screen: { w: 1512, h: 982, radius: 10 }, bezel: { t: 14, r: 14, b: 18, l: 14 }, rim: 3, lidRadius: 22,
  cutout: { type: 'mac-notch', w: 186, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 110, h: 22 },
  // 312.6 × 221.2 × 15.5 mm at 5 px/mm (1512 px ↔ 302 mm panel); lid ≈ 4.9 mm, base ≈ 10.6 mm
  solid: { lid: 25, base: 53, depth: 1106, pro: true },
  colors: [['Space Black', '#2e2f32'], ['Silver', '#d4d6d8']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'macbook-pro-16', name: 'MacBook Pro 16″', brand: 'Apple', kind: 'laptop', year: 2024, dpr: 2,
  screen: { w: 1728, h: 1117, radius: 10 }, bezel: { t: 14, r: 14, b: 18, l: 14 }, rim: 3, lidRadius: 22,
  cutout: { type: 'mac-notch', w: 190, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 120, h: 24 },
  // 355.7 × 248.1 × 16.8 mm at 5 px/mm; lid ≈ 5 mm, base ≈ 11.8 mm
  solid: { lid: 25, base: 59, depth: 1240, pro: true },
  colors: [['Space Black', '#2e2f32'], ['Silver', '#d4d6d8']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'macbook-air-13', name: 'MacBook Air 13″', brand: 'Apple', kind: 'laptop', year: 2025, dpr: 2,
  screen: { w: 1470, h: 956, radius: 10 }, bezel: { t: 14, r: 16, b: 20, l: 16 }, rim: 3, lidRadius: 20,
  cutout: { type: 'mac-notch', w: 186, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 100, h: 18 },
  // 304.1 × 215 × 11.3 mm at 5.06 px/mm; lid ≈ 3.9 mm, base ≈ 7.4 mm
  solid: { lid: 20, base: 37, depth: 1088 },
  colors: [['Sky Blue', '#c5d3df'], ['Midnight', '#2e3440'], ['Starlight', '#e3dccf'], ['Silver', '#d6d7d9']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'macbook-air-15', name: 'MacBook Air 15″', brand: 'Apple', kind: 'laptop', year: 2025, dpr: 2,
  screen: { w: 1710, h: 1107, radius: 10 }, bezel: { t: 14, r: 16, b: 20, l: 16 }, rim: 3, lidRadius: 20,
  cutout: { type: 'mac-notch', w: 190, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 115, h: 19 },
  // 340.4 × 237.6 × 11.5 mm at 5.24 px/mm; lid ≈ 3.9 mm, base ≈ 7.6 mm
  solid: { lid: 20, base: 40, depth: 1245 },
  colors: [['Sky Blue', '#c5d3df'], ['Midnight', '#2e3440'], ['Starlight', '#e3dccf'], ['Silver', '#d6d7d9']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'laptop', name: 'Laptop (generic, 1080p @125%)', brand: 'Windows', kind: 'laptop', dpr: 1.25,
  screen: { w: 1536, h: 864, radius: 0 }, bezel: { t: 20, r: 12, b: 30, l: 12 }, rim: 2, lidRadius: 10,
  cutout: { type: 'camera', side: 'top', d: 6 }, statusBar: null, safe: { top: 0, bottom: 0 },
  base: { overhang: 90, h: 18 },
  // typical 15.6″ ultrabook, ~350 × 235 × 18 mm at 4.46 px/mm
  solid: { lid: 27, base: 54, depth: 1050 },
  colors: [['Graphite', '#44474d'], ['Silver', '#c9ccd1']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'imac-24', name: 'iMac 24″', brand: 'Apple', kind: 'desktop', year: 2024, dpr: 2,
  screen: { w: 2240, h: 1260, radius: 0 }, bezel: 34, rim: 0, chin: 180, stand: { w: 460, h: 360 },
  // 547 × 461 mm, 11.5 mm thin, stand 130 × 147 mm, at 4.29 px/mm (2240 px ↔ 522 mm panel)
  solid: { t: 49, lift: 450, foot: { w: 558, d: 630, t: 22 } },
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'macos', safe: { top: 24, bottom: 0 },
  colors: [
    ['Blue', '#a9c3db', '#f3f3f1', '#5d8fc0'], ['Green', '#b6cdb3', '#f3f3f1', '#5f9670'], ['Pink', '#ecc0bd', '#f3f3f1', '#df8a8a'],
    ['Silver', '#dcdcdc', '#f3f3f1', '#c9cacc'], ['Yellow', '#f1d9a0', '#f3f3f1', '#eab94c'], ['Orange', '#f1b996', '#f3f3f1', '#ec8a55'], ['Purple', '#c6bdd9', '#f3f3f1', '#8f7fbf'],
  ],
  back: { finish: 'aluminium', stand: 640 }, // the back is a deeper shade than the pastel front (4th colour)
});

defineDevice({
  id: 'studio-display', name: 'Studio Display', brand: 'Apple', kind: 'desktop', year: 2022, dpr: 2,
  screen: { w: 2560, h: 1440, radius: 0 }, bezel: 36, rim: 6, chin: 0, stand: { w: 520, h: 420 },
  // 623 × 478 mm, tilt-stand depth 168 mm, body ~31 mm deep (VESA spec), at 4.29 px/mm
  solid: { t: 133, lift: 500, foot: { w: 600, d: 720, t: 26 } },
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'macos', safe: { top: 24, bottom: 0 },
  colors: [['Silver', '#cfd1d3']],
  back: { finish: 'aluminium', stand: 700 },
});

// ─── Browser windows ───────────────────────────────────────────────────────
// Size is adjustable per element with viewport="1440x900".

defineDevice({
  id: 'browser-chrome', name: 'Browser (Chrome-style)', brand: 'Web', kind: 'browser', style: 'chrome',
  screen: { w: 1280, h: 800, radius: 0 }, bar: 44, colors: [['Light', '#f1f3f4']],
});

defineDevice({
  id: 'browser-safari', name: 'Browser (Safari-style)', brand: 'Web', kind: 'browser', style: 'safari',
  screen: { w: 1280, h: 800, radius: 0 }, bar: 52, colors: [['Light', '#f5f5f7']],
});
