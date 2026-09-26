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

// Apple phone geometry: bezel + rim, button positions and island offsets are read from Apple's
// accessory dimensional drawings (developer.apple.com/accessories/dimensional-drawings) at
// 6.039 pt/mm (460 ppi, 3x) or 6.41 pt/mm (326 ppi, 2x). `at`/`len` are from the body's top edge.
const island = { type: 'island', w: 125, h: 37, top: 14 };

// ─── Apple phones ──────────────────────────────────────────────────────────

defineDevice({
  id: 'iphone-17-pro-max', name: 'iPhone 17 Pro Max', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 440, h: 956, radius: 62 }, bezel: 8.5, rim: 7,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 186, len: 42 }, { side: 'left', at: 259, len: 68 }, { side: 'left', at: 344, len: 68 },
    { side: 'right', at: 282, len: 107 }, { side: 'right', at: 624, len: 103, flush: true },
  ],
  colors: [['Cosmic Orange', '#c8652f'], ['Deep Blue', '#353f55'], ['Silver', '#dcdcda']],
  // Full-width aluminium plateau: triple camera left, flash + LiDAR right; Ceramic Shield window below.
  back: {
    finish: 'aluminium', logo: { y: 613 },
    window: { x: 26.5, y: 323.5, w: 418, h: 593, r: 18 },
    camera: {
      plates: [{ x: 0, y: 0, w: 471, h: 285.5, r: '75px 75px 12px 12px' }],
      parts: [
        { x: 93, y: 86.5, d: 104.5 }, { x: 93, y: 199, d: 104.5 }, { x: 198, y: 142.5, d: 104.5 },
        { x: 396, y: 92.5, d: 32, kind: 'flash' }, { x: 396, y: 142.5, d: 7, kind: 'mic' }, { x: 396, y: 193, d: 34, kind: 'lidar' },
      ],
    },
  },
});

defineDevice({
  id: 'iphone-17-pro', name: 'iPhone 17 Pro', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 402, h: 874, radius: 62 }, bezel: 9, rim: 7,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 186, len: 42 }, { side: 'left', at: 259, len: 68 }, { side: 'left', at: 344, len: 68 },
    { side: 'right', at: 282, len: 107 }, { side: 'right', at: 543, len: 103, flush: true },
  ],
  colors: [['Deep Blue', '#353f55'], ['Cosmic Orange', '#c8652f'], ['Silver', '#dcdcda']],
  back: {
    finish: 'aluminium', logo: { y: 563.5 },
    window: { x: 24.5, y: 298, w: 385, h: 543.5, r: 16 },
    camera: {
      plates: [{ x: 0, y: 0, w: 434, h: 263.5, r: '75px 75px 12px 12px' }],
      parts: [
        { x: 85, y: 78.5, d: 96.5 }, { x: 85, y: 183, d: 96.5 }, { x: 182.5, y: 131, d: 96.5 },
        { x: 365, y: 84.5, d: 30, kind: 'flash' }, { x: 365, y: 131, d: 7, kind: 'mic' }, { x: 365, y: 177, d: 32, kind: 'lidar' },
      ],
    },
  },
});

defineDevice({
  id: 'iphone-air', name: 'iPhone Air', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 420, h: 912, radius: 62 }, bezel: 8.5, rim: 7,
  cutout: { ...island, top: 20 }, statusBar: 'ios', home: 'indicator', safe: { top: 68, bottom: 34 },
  buttons: [
    { side: 'left', at: 185, len: 42 }, { side: 'left', at: 257, len: 68 }, { side: 'left', at: 343, len: 68 },
    { side: 'right', at: 280, len: 108 }, { side: 'right', at: 581, len: 103, flush: true },
  ],
  colors: [['Sky Blue', '#c9d8e6'], ['Light Gold', '#e6d8bd'], ['Cloud White', '#efeee9'], ['Space Black', '#232326']],
  // Stadium-shaped plateau across the top holding the single 48MP Fusion camera and flash.
  back: {
    finish: 'glass', logo: { y: 503.5 },
    camera: {
      plates: [{ x: 20.5, y: 22, w: 410, h: 121, r: 60.5 }],
      parts: [{ x: 83.5, y: 82.5, d: 86.5 }, { x: 168.5, y: 82.5, d: 24, kind: 'flash' }, { x: 203, y: 82.5, d: 6, kind: 'mic' }],
    },
  },
});

defineDevice({
  id: 'iphone-17', name: 'iPhone 17', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 402, h: 874, radius: 62 }, bezel: 8.75, rim: 6,
  cutout: island, statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 },
  buttons: [
    { side: 'left', at: 185, len: 42 }, { side: 'left', at: 257, len: 68 }, { side: 'left', at: 343, len: 68 },
    { side: 'right', at: 281, len: 107 }, { side: 'right', at: 541, len: 103, flush: true },
  ],
  colors: [['Lavender', '#c9bddb'], ['Sage', '#b6c4a6'], ['Mist Blue', '#a8bbcf'], ['White', '#f1f1ef'], ['Black', '#28282b']],
  // Vertical pill bump with two lenses; flash and mic outside it.
  back: {
    finish: 'glass', logo: { y: 452 },
    camera: {
      plates: [{ x: 26, y: 26, w: 106.5, h: 212.5, r: 53 }],
      parts: [{ x: 79.5, y: 79, d: 84 }, { x: 79.5, y: 185.5, d: 84 }, { x: 160.5, y: 68, d: 24, kind: 'flash' }, { x: 160.5, y: 104, d: 6, kind: 'mic' }],
    },
  },
});

defineDevice({
  id: 'iphone-16e', name: 'iPhone 16e', brand: 'Apple', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 390, h: 844, radius: 47.33 }, bezel: 15, rim: 6,
  cutout: { type: 'notch', w: 162, h: 34 }, statusBar: 'ios', home: 'indicator', safe: { top: 47, bottom: 34 },
  buttons: [
    { side: 'left', at: 166, len: 46 }, { side: 'left', at: 239, len: 72 }, { side: 'left', at: 324, len: 72 },
    { side: 'right', at: 262, len: 111 },
  ],
  colors: [['Black', '#2a2a2c'], ['White', '#f1f1ef']],
  back: {
    finish: 'glass', logo: { y: 443 },
    camera: { parts: [{ x: 73.5, y: 73, d: 79 }, { x: 145.5, y: 60.5, d: 22.5, kind: 'flash' }, { x: 145.5, y: 93, d: 5, kind: 'mic' }] },
  },
});

defineDevice({
  id: 'iphone-se', name: 'iPhone SE (3rd gen)', brand: 'Apple', kind: 'phone', year: 2022, dpr: 2,
  screen: { w: 375, h: 667, radius: 0 }, bezel: { t: 99, r: 17, b: 99, l: 17 }, rim: 11, bodyRadius: 70,
  earpiece: true, statusBar: 'ios', home: 'button', safe: { top: 20, bottom: 0 },
  buttons: [
    { side: 'left', at: 113, len: 36 }, { side: 'left', at: 188, len: 68 }, { side: 'left', at: 268, len: 68 },
    { side: 'right', at: 188, len: 68 },
  ],
  colors: [['Midnight', '#262b31'], ['Starlight', '#ece6db', '#f6f5f2'], ['(PRODUCT)RED', '#b1121d']],
  back: {
    finish: 'gloss', logo: { y: 400 },
    camera: { parts: [{ x: 62, y: 60, d: 50 }, { x: 96, y: 60, d: 5, kind: 'mic' }, { x: 126, y: 60, d: 24, kind: 'flash' }] },
  },
});

// ─── Android phones ────────────────────────────────────────────────────────

// The 410×914 @3.12 viewport is kept: sources conflict on 410 vs 427 (AOSP caiman overlay, which is the
// Pixel 9 Pro), so bezel, corner, hole, status bar and buttons are the review's 427-scale numbers × 0.96.
// Body 72.0 × 152.8 mm → 449 × 953 px.
defineDevice({
  id: 'pixel-10-pro', name: 'Pixel 10 Pro', brand: 'Google', kind: 'phone', year: 2025, dpr: 3.12,
  screen: { w: 410, h: 914, radius: 50 }, bezel: 14.5, rim: 5, bodyRadius: 69,
  cutout: { type: 'hole', d: 31, top: 17 }, statusBar: 'android', home: 'pill', safe: { top: 65, bottom: 24 },
  buttons: [{ side: 'right', at: 267, len: 72 }, { side: 'right', at: 384, len: 127 }],
  colors: [['Obsidian', '#2b2d31'], ['Porcelain', '#e8e3da'], ['Moonstone', '#6e7a89'], ['Jade', '#c7d9c8']],
  // Polished camera bar ("visor") with a black glass window: three cameras, flash and sensor.
  back: {
    finish: 'glass', logo: { y: 646 },
    camera: {
      plates: [{ x: 22.5, y: 52.5, w: 404, h: 107, r: 54, tone: 'polished' }, { x: 32.5, y: 62.5, w: 384, h: 87, r: 43.5, tone: 'dark' }],
      parts: [
        { x: 85.5, y: 106, d: 68.5 }, { x: 167.5, y: 106, d: 68.5 }, { x: 249, y: 106, d: 62.5 },
        { x: 324.5, y: 106, d: 22, kind: 'flash' }, { x: 363.5, y: 106, d: 14, kind: 'sensor' },
      ],
    },
  },
});

// Default Screen zoom: 384 dp wide (1080 / 2.8125 at the out-of-box FHD+). 412×891 is the smaller zoom step.
// Body 77.6 × 162.8 mm → 406 × 852. Radii are the old values rescaled to the new dp.
defineDevice({
  id: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra', brand: 'Samsung', kind: 'phone', year: 2025, dpr: 2.8125,
  screen: { w: 384, h: 832, radius: 24 }, bezel: { t: 6, r: 7, b: 6, l: 7 }, rim: 4, bodyRadius: 35,
  cutout: { type: 'hole', d: 10, top: 11 }, statusBar: 'android', home: 'pill', safe: { top: 34, bottom: 24 },
  buttons: [{ side: 'right', at: 161, len: 110 }, { side: 'right', at: 322, len: 59 }],
  colors: [['Titanium Silverblue', '#9eb0c3'], ['Titanium Black', '#2c2d2f'], ['Titanium Gray', '#8b8a86'], ['Titanium Whitesilver', '#e4e4e1']],
  // Floating rings: ultra-wide, wide and 3x in a column; 5x periscope and laser AF beside, then the flash.
  back: {
    finish: 'glass', logo: { y: 763.5 },
    camera: {
      parts: [
        { x: 61.5, y: 67, d: 72.5 }, { x: 61.5, y: 149, d: 72.5 }, { x: 61.5, y: 231, d: 72.5 },
        { x: 136, y: 104.5, d: 56 }, { x: 136, y: 167.5, d: 28, kind: 'sensor' }, { x: 136, y: 210.5, d: 18.5, kind: 'flash' },
      ],
    },
  },
});

defineDevice({
  id: 'galaxy-s25', name: 'Galaxy S25', brand: 'Samsung', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 360, h: 780, radius: 38 }, bezel: { t: 7, r: 8, b: 7, l: 8 }, rim: 4, bodyRadius: 52,
  cutout: { type: 'hole', d: 10, top: 10 }, statusBar: 'android', home: 'pill', safe: { top: 30, bottom: 24 },
  buttons: [{ side: 'right', at: 149, len: 106 }, { side: 'right', at: 307, len: 54 }],
  colors: [['Icyblue', '#c9d8e6'], ['Navy', '#2b3346'], ['Mint', '#cfe5d8'], ['Silver Shadow', '#c9c9c9']],
  back: {
    finish: 'glass', logo: { y: 716.5 },
    camera: { parts: [{ x: 57.5, y: 61.5, d: 63.5 }, { x: 57.5, y: 135.5, d: 63.5 }, { x: 57.5, y: 209, d: 63.5 }, { x: 117.5, y: 61.5, d: 16, kind: 'flash' }] },
  },
});

defineDevice({
  id: 'android-generic', name: 'Android (generic)', brand: 'Android', kind: 'phone', dpr: 3,
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
// iPad bezels, body corners and buttons come from Apple's dimensional drawings (M5 Pro, M4 Air, A17 Pro mini).
// Pro and Air have the front camera on the portrait right edge, so it sits on top in landscape.

defineDevice({
  id: 'ipad-pro-13', name: 'iPad Pro 13″ (M5)', brand: 'Apple', kind: 'tablet', year: 2025, dpr: 2,
  screen: { w: 1032, h: 1376, radius: 18 }, bezel: 38, rim: 4, bodyRadius: 80,
  cutout: { type: 'camera', side: 'right', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 982, len: 63 }, { side: 'right', at: 100, len: 52 }, { side: 'right', at: 163, len: 52 }],
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
  id: 'ipad-pro-11', name: 'iPad Pro 11″ (M5)', brand: 'Apple', kind: 'tablet', year: 2025, dpr: 2,
  screen: { w: 834, h: 1210, radius: 18 }, bezel: 41, rim: 4, bodyRadius: 75,
  cutout: { type: 'camera', side: 'right', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 789, len: 63 }, { side: 'right', at: 101, len: 52 }, { side: 'right', at: 163, len: 52 }],
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
  id: 'ipad-air-11', name: 'iPad Air 11″ (M4)', brand: 'Apple', kind: 'tablet', year: 2026, dpr: 2,
  screen: { w: 820, h: 1180, radius: 18 }, bezel: 48, rim: 4, bodyRadius: 61,
  cutout: { type: 'camera', side: 'right', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 770, len: 89 }, { side: 'right', at: 101, len: 52 }, { side: 'right', at: 163, len: 52 }],
  colors: [['Space Gray', '#5b5d62'], ['Blue', '#a8bcd0'], ['Purple', '#bdb3cf'], ['Starlight', '#e9e2d6']],
  back: { finish: 'aluminium', camera: { parts: [{ x: 56, y: 56, d: 50 }, { x: 56, y: 96, d: 5, kind: 'mic' }] } }, // no flash on iPad Air
});

defineDevice({
  id: 'ipad-mini', name: 'iPad mini (A17 Pro)', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 744, h: 1133, radius: 21 }, bezel: 52, rim: 4, bodyRadius: 81,
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  // Volume buttons and the Touch ID top button are all on the top edge.
  buttons: [{ side: 'top', at: 82, len: 64 }, { side: 'top', at: 158, len: 64 }, { side: 'top', at: 668, len: 109 }],
  colors: [['Space Gray', '#5b5d62'], ['Blue', '#a9b8cb'], ['Purple', '#b9b0c9'], ['Starlight', '#e9e2d6']],
  back: { finish: 'aluminium', camera: { parts: [{ x: 56, y: 56, d: 52 }, { x: 104, y: 56, d: 20, kind: 'flash' }, { x: 104, y: 84, d: 5, kind: 'mic' }] } },
});

// The 800×1280 viewport is kept (876×1400 @2 is unverified). Bezel and keys are the review's mm figures at
// this viewport's 4.79 px/mm: body 185.4 × 285.4 mm → 888 × 1368. Keys sit on the landscape top edge.
defineDevice({
  id: 'galaxy-tab-s10-plus', name: 'Galaxy Tab S10+', brand: 'Samsung', kind: 'tablet', year: 2024, dpr: 2.19,
  screen: { w: 800, h: 1280, radius: 16 }, bezel: 41, rim: 3,
  cutout: { type: 'camera', side: 'right', d: 7 }, statusBar: 'android', home: 'pill', safe: { top: 28, bottom: 20 },
  buttons: [{ side: 'right', at: 213, len: 48 }, { side: 'right', at: 312, len: 103 }],
  colors: [['Moonstone Gray', '#6d7078'], ['Platinum Silver', '#d8d8d6']],
  back: { finish: 'aluminium', camera: { parts: [{ x: 52, y: 54, d: 46 }, { x: 52, y: 110, d: 40 }, { x: 98, y: 54, d: 14, kind: 'flash' }] } },
});

// ─── Watches ───────────────────────────────────────────────────────────────

// Watch geometry is from Apple's dimensional drawings at 6.41 pt/mm (326 ppi, 2x).
// The id stays `apple-watch-ultra` and tracks the current Ultra: Ultra 3 and Ultra 4 share this case and display.
defineDevice({
  id: 'apple-watch-ultra', name: 'Apple Watch Ultra 4', brand: 'Apple', kind: 'watch', year: 2026, dpr: 2,
  screen: { w: 211, h: 257, radius: 57 }, bezel: { t: 9.5, r: 9, b: 9.5, l: 9 }, rim: 19, bodyRadius: 85, pad: { t: 0, r: 16, b: 0, l: 6 },
  statusBar: 'watch', safe: { top: 0, bottom: 0 },
  buttons: [
    { side: 'right', at: 86, len: 60, w: 14, crown: true }, { side: 'right', at: 169, len: 72, w: 5 },
    { side: 'left', at: 138, len: 92, w: 5, color: '#f26b1d' },
  ],
  colors: [['Natural Titanium', '#c9c3b7'], ['Black Titanium', '#2a2a2b']],
  // Sensor dome: dark crystal with a ring and photodiode windows.
  back: {
    finish: 'titanium',
    camera: {
      plates: [{ x: 32.5, y: 56, w: 202, h: 202, r: '50%', tone: 'dark' }, { x: 78, y: 101.5, w: 111, h: 111, r: '50%', tone: 'dark' }],
      parts: [{ x: 133.5, y: 157, d: 27.5, kind: 'sensor' }, { x: 133.5, y: 122, d: 12.5, kind: 'sensor' }, { x: 133.5, y: 192, d: 12.5, kind: 'sensor' }, { x: 98.5, y: 157, d: 12.5, kind: 'sensor' }, { x: 168.5, y: 157, d: 12.5, kind: 'sensor' }],
    },
  },
});

defineDevice({
  id: 'apple-watch-series-11', name: 'Apple Watch Series 11 (46mm)', brand: 'Apple', kind: 'watch', year: 2025, dpr: 2,
  screen: { w: 208, h: 248, radius: 50 }, bezel: 15.25, rim: 8.25, bodyRadius: 74, pad: { t: 0, r: 14, b: 0, l: 2 },
  statusBar: 'watch', safe: { top: 0, bottom: 0 },
  buttons: [{ side: 'right', at: 69, len: 46, w: 12, crown: true }, { side: 'right', at: 148, len: 80, w: 4 }],
  colors: [['Jet Black', '#1f1f21'], ['Rose Gold', '#e7c8b8'], ['Silver', '#d9dadc'], ['Space Gray', '#55575b']],
  back: {
    finish: 'aluminium',
    camera: {
      plates: [{ x: 28, y: 48, w: 199, h: 199, r: '50%', tone: 'dark' }, { x: 72, y: 92, w: 111, h: 111, r: '50%', tone: 'dark' }],
      parts: [{ x: 127.5, y: 147.5, d: 27, kind: 'sensor' }, { x: 127.5, y: 113, d: 12.5, kind: 'sensor' }, { x: 127.5, y: 182, d: 12.5, kind: 'sensor' }, { x: 92.5, y: 147.5, d: 12.5, kind: 'sensor' }, { x: 162.5, y: 147.5, d: 12.5, kind: 'sensor' }],
    },
  },
});

// ─── Laptops & desktops ────────────────────────────────────────────────────

defineDevice({
  id: 'macbook-pro-14', name: 'MacBook Pro 14″', brand: 'Apple', kind: 'laptop', year: 2026, dpr: 2,
  // 5.1 mm lid border per side at 5 pt/mm = bezel 19 + rim 6; the visible chin (bottom) is an estimate
  screen: { w: 1512, h: 982, radius: 10 }, bezel: { t: 19, r: 19, b: 37, l: 19 }, rim: 6, lidRadius: 22,
  cutout: { type: 'mac-notch', w: 185, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 110, h: 22 },
  // 312.6 × 221.2 × 15.5 mm at 5 px/mm (1512 px ↔ 302 mm panel); lid ≈ 4.9 mm, base ≈ 10.6 mm
  solid: { lid: 25, base: 53, depth: 1106, pro: true },
  colors: [['Space Black', '#2e2f32'], ['Silver', '#d4d6d8']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'macbook-pro-16', name: 'MacBook Pro 16″', brand: 'Apple', kind: 'laptop', year: 2026, dpr: 2,
  screen: { w: 1728, h: 1117, radius: 10 }, bezel: { t: 19, r: 19, b: 37, l: 19 }, rim: 6, lidRadius: 22,
  cutout: { type: 'mac-notch', w: 185, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 120, h: 24 },
  // 355.7 × 248.1 × 16.8 mm at 5 px/mm; lid ≈ 5 mm, base ≈ 11.8 mm
  solid: { lid: 25, base: 59, depth: 1240, pro: true },
  colors: [['Space Black', '#2e2f32'], ['Silver', '#d4d6d8']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'macbook-air-13', name: 'MacBook Air 13″', brand: 'Apple', kind: 'laptop', year: 2026, dpr: 2,
  // 6.9 mm lid border per side at 5.06 pt/mm = bezel 29 + rim 6
  screen: { w: 1470, h: 956, radius: 10 }, bezel: { t: 29, r: 29, b: 37, l: 29 }, rim: 6, lidRadius: 20,
  cutout: { type: 'mac-notch', w: 187, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 100, h: 18 },
  // 304.1 × 215 × 11.3 mm at 5.06 px/mm; lid ≈ 3.9 mm, base ≈ 7.4 mm
  solid: { lid: 20, base: 37, depth: 1088 },
  colors: [['Sky Blue', '#c5d3df'], ['Midnight', '#2e3440'], ['Starlight', '#e3dccf'], ['Silver', '#d6d7d9']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'macbook-air-15', name: 'MacBook Air 15″', brand: 'Apple', kind: 'laptop', year: 2026, dpr: 2,
  // 6.9 mm lid border per side at 5.24 pt/mm = bezel 30 + rim 6; 64 px camera band → 38 pt menu bar
  screen: { w: 1710, h: 1107, radius: 10 }, bezel: { t: 30, r: 30, b: 38, l: 30 }, rim: 6, lidRadius: 20,
  cutout: { type: 'mac-notch', w: 194, h: 34 }, statusBar: 'macos', safe: { top: 38, bottom: 0 },
  base: { overhang: 115, h: 19 },
  // 340.4 × 237.6 × 11.5 mm at 5.24 px/mm; lid ≈ 3.9 mm, base ≈ 7.6 mm
  solid: { lid: 20, base: 40, depth: 1245 },
  colors: [['Sky Blue', '#c5d3df'], ['Midnight', '#2e3440'], ['Starlight', '#e3dccf'], ['Silver', '#d6d7d9']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'laptop', name: 'Laptop (generic, 1080p @125%)', brand: 'Windows', kind: 'laptop', dpr: 1.25,
  // mainstream 15.6″ body (~358 mm wide): ~7 mm per side, room for the webcam on top, a visible chin
  screen: { w: 1536, h: 864, radius: 0 }, bezel: { t: 34, r: 26, b: 58, l: 26 }, rim: 4, lidRadius: 10,
  cutout: { type: 'camera', side: 'top', d: 6 }, statusBar: null, safe: { top: 0, bottom: 0 },
  base: { overhang: 90, h: 18 },
  // typical 15.6″ ultrabook, ~350 × 235 × 18 mm at 4.46 px/mm
  solid: { lid: 27, base: 54, depth: 1050 },
  colors: [['Graphite', '#44474d'], ['Silver', '#c9ccd1']],
  back: { finish: 'aluminium' },
});

defineDevice({
  id: 'imac-24', name: 'iMac 24″', brand: 'Apple', kind: 'desktop', year: 2024, dpr: 2,
  // 547 × 461 mm, 11.5 mm thin, stand 130 × 147 mm, at 4.29 px/mm (2240 px ↔ 522 mm panel): 12.5 mm border
  screen: { w: 2240, h: 1260, radius: 0 }, bezel: 52, rim: 2, chin: 180, stand: { w: 558, h: 360 },
  solid: { t: 49, lift: 450, foot: { w: 558, d: 630, t: 22 } },
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'macos', safe: { top: 24, bottom: 0 },
  colors: [ // Apple's order (support 121557)
    ['Blue', '#a9c3db', '#f3f3f1', '#5d8fc0'], ['Purple', '#c6bdd9', '#f3f3f1', '#8f7fbf'], ['Pink', '#ecc0bd', '#f3f3f1', '#df8a8a'],
    ['Orange', '#f1b996', '#f3f3f1', '#ec8a55'], ['Yellow', '#f1d9a0', '#f3f3f1', '#eab94c'], ['Green', '#b6cdb3', '#f3f3f1', '#5f9670'], ['Silver', '#dcdcdc', '#f3f3f1', '#c9cacc'],
  ],
  back: { finish: 'aluminium', stand: 657 }, // the back is a deeper shade than the pastel front (4th colour)
});

defineDevice({
  id: 'studio-display', name: 'Studio Display', brand: 'Apple', kind: 'desktop', year: 2026, dpr: 2,
  // 623 × 478 mm, tilt-stand depth 168 mm, body ~31 mm deep (VESA spec), at 4.29 px/mm: 13.25 mm border,
  // 478 − 362 mm (VESA body) = 116 mm under the display
  screen: { w: 2560, h: 1440, radius: 0 }, bezel: 51, rim: 6, chin: 0, stand: { w: 520, h: 482 },
  solid: { t: 133, lift: 500, foot: { w: 600, d: 720, t: 26 } },
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'macos', safe: { top: 24, bottom: 0 },
  colors: [['Silver', '#cfd1d3']],
  back: { finish: 'aluminium', stand: 714 },
});

// ─── Browser windows ───────────────────────────────────────────────────────
// Size is adjustable per element with viewport="1440x900".

defineDevice({
  id: 'browser-chrome', name: 'Browser (Chrome-style)', brand: 'Web', kind: 'browser', style: 'chrome',
  screen: { w: 1280, h: 800, radius: 0 }, bar: 46, colors: [['Light', '#f1f3f4']], // Chromium toolbar: 34 + 2 × 6
});

defineDevice({
  id: 'browser-safari', name: 'Browser (Safari-style)', brand: 'Web', kind: 'browser', style: 'safari',
  screen: { w: 1280, h: 800, radius: 0 }, bar: 52, colors: [['Light', '#f5f5f7']],
});
