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
//   colors   [[name, frameColor, frontColor?], ...]  first entry is the default
//   solid    depth for variant="deck" | "3d" (laptops, desktops), in the same px as the screen:
//            laptop  { lid, base, depth, pro? }      lid/base thickness, base depth;
//                                                    pro = black keyboard well + speaker grilles
//            desktop { t, lift, foot: { w, d, t } }  display thickness, floor-to-display gap, foot plate

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
};

export function defineDevice(spec) {
  if (!spec || !spec.id || !spec.screen || !spec.screen.w || !spec.screen.h) {
    throw new TypeError('bezelkit: a device needs an id and screen { w, h }');
  }
  const device = Object.freeze({ kind: 'phone', brand: '', colors: [['Default', '#2b2b2e']], ...spec });
  registry.set(device.id, device);
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
});

// ─── Android phones ────────────────────────────────────────────────────────

defineDevice({
  id: 'pixel-10-pro', name: 'Pixel 10 Pro', brand: 'Google', kind: 'phone', year: 2025, dpr: 3.12,
  screen: { w: 410, h: 914, radius: 46 }, bezel: 10, rim: 5, bodyRadius: 64,
  cutout: { type: 'hole', d: 14, top: 14 }, statusBar: 'android', home: 'pill', safe: { top: 40, bottom: 24 },
  buttons: [{ side: 'right', at: 200, len: 62 }, { side: 'right', at: 300, len: 120 }],
  colors: [['Obsidian', '#2b2d31'], ['Porcelain', '#e8e3da'], ['Moonstone', '#6e7a89'], ['Jade', '#c7d9c8']],
});

defineDevice({
  id: 'galaxy-s25-ultra', name: 'Galaxy S25 Ultra', brand: 'Samsung', kind: 'phone', year: 2025, dpr: 3.5,
  screen: { w: 412, h: 891, radius: 26 }, bezel: 8, rim: 4, bodyRadius: 38,
  cutout: { type: 'hole', d: 11, top: 12 }, statusBar: 'android', home: 'pill', safe: { top: 34, bottom: 24 },
  buttons: [{ side: 'right', at: 180, len: 100 }, { side: 'right', at: 305, len: 55 }],
  colors: [['Titanium Silverblue', '#9eb0c3'], ['Titanium Black', '#2c2d2f'], ['Titanium Gray', '#8b8a86'], ['Titanium Whitesilver', '#e4e4e1']],
});

defineDevice({
  id: 'galaxy-s25', name: 'Galaxy S25', brand: 'Samsung', kind: 'phone', year: 2025, dpr: 3,
  screen: { w: 360, h: 780, radius: 38 }, bezel: 9, rim: 4, bodyRadius: 52,
  cutout: { type: 'hole', d: 10, top: 10 }, statusBar: 'android', home: 'pill', safe: { top: 30, bottom: 24 },
  buttons: [{ side: 'right', at: 175, len: 85 }, { side: 'right', at: 280, len: 50 }],
  colors: [['Icyblue', '#c9d8e6'], ['Navy', '#2b3346'], ['Mint', '#cfe5d8'], ['Silver Shadow', '#c9c9c9']],
});

defineDevice({
  id: 'android', name: 'Android (generic)', brand: 'Android', kind: 'phone', dpr: 3,
  screen: { w: 360, h: 800, radius: 26 }, bezel: { t: 12, r: 10, b: 16, l: 10 }, rim: 3, bodyRadius: 42,
  cutout: { type: 'hole', d: 12, top: 12 }, statusBar: 'android', home: 'pill', safe: { top: 32, bottom: 24 },
  buttons: [{ side: 'right', at: 130, len: 80 }, { side: 'right', at: 230, len: 50 }],
  colors: [['Graphite', '#3a3d42'], ['Blue', '#3c5a86'], ['White', '#e9e9e9']],
});

// ─── Tablets ───────────────────────────────────────────────────────────────

defineDevice({
  id: 'ipad-pro-13', name: 'iPad Pro 13″', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 1032, h: 1376, radius: 18 }, bezel: 22, rim: 4,
  cutout: { type: 'camera', side: 'left', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 940, len: 58 }, { side: 'right', at: 70, len: 48 }, { side: 'right', at: 128, len: 48 }],
  colors: [['Space Black', '#2f2f31'], ['Silver', '#dfe0e2']],
});

defineDevice({
  id: 'ipad-pro-11', name: 'iPad Pro 11″', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 834, h: 1210, radius: 18 }, bezel: 22, rim: 4,
  cutout: { type: 'camera', side: 'left', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 750, len: 55 }, { side: 'right', at: 65, len: 45 }, { side: 'right', at: 120, len: 45 }],
  colors: [['Space Black', '#2f2f31'], ['Silver', '#dfe0e2']],
});

defineDevice({
  id: 'ipad-air-11', name: 'iPad Air 11″', brand: 'Apple', kind: 'tablet', year: 2025, dpr: 2,
  screen: { w: 820, h: 1180, radius: 18 }, bezel: 24, rim: 4,
  cutout: { type: 'camera', side: 'left', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 740, len: 55 }, { side: 'right', at: 65, len: 45 }, { side: 'right', at: 120, len: 45 }],
  colors: [['Space Gray', '#5b5d62'], ['Blue', '#a8bcd0'], ['Purple', '#bdb3cf'], ['Starlight', '#e9e2d6']],
});

defineDevice({
  id: 'ipad-mini', name: 'iPad mini', brand: 'Apple', kind: 'tablet', year: 2024, dpr: 2,
  screen: { w: 744, h: 1133, radius: 21 }, bezel: 22, rim: 4,
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'ipados', home: 'indicator', safe: { top: 24, bottom: 20 },
  buttons: [{ side: 'top', at: 640, len: 50 }, { side: 'right', at: 60, len: 45 }, { side: 'right', at: 115, len: 45 }],
  colors: [['Space Gray', '#5b5d62'], ['Blue', '#a9b8cb'], ['Purple', '#b9b0c9'], ['Starlight', '#e9e2d6']],
});

defineDevice({
  id: 'galaxy-tab-s10-plus', name: 'Galaxy Tab S10+', brand: 'Samsung', kind: 'tablet', year: 2024, dpr: 2.19,
  screen: { w: 800, h: 1280, radius: 16 }, bezel: 20, rim: 3,
  cutout: { type: 'camera', side: 'left', d: 7 }, statusBar: 'android', home: 'pill', safe: { top: 28, bottom: 20 },
  buttons: [{ side: 'top', at: 620, len: 60 }, { side: 'top', at: 700, len: 40 }],
  colors: [['Moonstone Gray', '#6d7078'], ['Platinum Silver', '#d8d8d6']],
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
});

defineDevice({
  id: 'apple-watch-series-11', name: 'Apple Watch Series 11 (46mm)', brand: 'Apple', kind: 'watch', year: 2025, dpr: 2,
  screen: { w: 208, h: 248, radius: 50 }, bezel: 12, rim: 5, bodyRadius: 66, pad: { t: 0, r: 14, b: 0, l: 2 },
  statusBar: 'watch', safe: { top: 0, bottom: 0 },
  buttons: [{ side: 'right', at: 70, len: 45, w: 10, crown: true }, { side: 'right', at: 140, len: 42, w: 4 }],
  colors: [['Jet Black', '#1f1f21'], ['Rose Gold', '#e7c8b8'], ['Silver', '#d9dadc'], ['Space Gray', '#55575b']],
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
});

defineDevice({
  id: 'macbook-pro-16', name: 'MacBook Pro 16″', brand: 'Apple', kind: 'laptop', year: 2024, dpr: 2,
  screen: { w: 1728, h: 1117, radius: 10 }, bezel: { t: 14, r: 14, b: 18, l: 14 }, rim: 3, lidRadius: 22,
  cutout: { type: 'mac-notch', w: 190, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 120, h: 24 },
  // 355.7 × 248.1 × 16.8 mm at 5 px/mm; lid ≈ 5 mm, base ≈ 11.8 mm
  solid: { lid: 25, base: 59, depth: 1240, pro: true },
  colors: [['Space Black', '#2e2f32'], ['Silver', '#d4d6d8']],
});

defineDevice({
  id: 'macbook-air-13', name: 'MacBook Air 13″', brand: 'Apple', kind: 'laptop', year: 2025, dpr: 2,
  screen: { w: 1470, h: 956, radius: 10 }, bezel: { t: 14, r: 16, b: 20, l: 16 }, rim: 3, lidRadius: 20,
  cutout: { type: 'mac-notch', w: 186, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 100, h: 18 },
  // 304.1 × 215 × 11.3 mm at 5.06 px/mm; lid ≈ 3.9 mm, base ≈ 7.4 mm
  solid: { lid: 20, base: 37, depth: 1088 },
  colors: [['Sky Blue', '#c5d3df'], ['Midnight', '#2e3440'], ['Starlight', '#e3dccf'], ['Silver', '#d6d7d9']],
});

defineDevice({
  id: 'macbook-air-15', name: 'MacBook Air 15″', brand: 'Apple', kind: 'laptop', year: 2025, dpr: 2,
  screen: { w: 1710, h: 1107, radius: 10 }, bezel: { t: 14, r: 16, b: 20, l: 16 }, rim: 3, lidRadius: 20,
  cutout: { type: 'mac-notch', w: 190, h: 32 }, statusBar: 'macos', safe: { top: 37, bottom: 0 },
  base: { overhang: 115, h: 19 },
  // 340.4 × 237.6 × 11.5 mm at 5.24 px/mm; lid ≈ 3.9 mm, base ≈ 7.6 mm
  solid: { lid: 20, base: 40, depth: 1245 },
  colors: [['Sky Blue', '#c5d3df'], ['Midnight', '#2e3440'], ['Starlight', '#e3dccf'], ['Silver', '#d6d7d9']],
});

defineDevice({
  id: 'laptop', name: 'Laptop (generic, 1080p @125%)', brand: 'Windows', kind: 'laptop', dpr: 1.25,
  screen: { w: 1536, h: 864, radius: 0 }, bezel: { t: 20, r: 12, b: 30, l: 12 }, rim: 2, lidRadius: 10,
  cutout: { type: 'camera', side: 'top', d: 6 }, statusBar: null, safe: { top: 0, bottom: 0 },
  base: { overhang: 90, h: 18 },
  // typical 15.6″ ultrabook, ~350 × 235 × 18 mm at 4.46 px/mm
  solid: { lid: 27, base: 54, depth: 1050 },
  colors: [['Graphite', '#44474d'], ['Silver', '#c9ccd1']],
});

defineDevice({
  id: 'imac-24', name: 'iMac 24″', brand: 'Apple', kind: 'desktop', year: 2024, dpr: 2,
  screen: { w: 2240, h: 1260, radius: 0 }, bezel: 34, rim: 0, chin: 180, stand: { w: 460, h: 360 },
  // 547 × 461 mm, 11.5 mm thin, stand 130 × 147 mm, at 4.29 px/mm (2240 px ↔ 522 mm panel)
  solid: { t: 49, lift: 450, foot: { w: 558, d: 630, t: 22 } },
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'macos', safe: { top: 24, bottom: 0 },
  colors: [
    ['Blue', '#a9c3db', '#f3f3f1'], ['Green', '#b6cdb3', '#f3f3f1'], ['Pink', '#ecc0bd', '#f3f3f1'],
    ['Silver', '#dcdcdc', '#f3f3f1'], ['Yellow', '#f1d9a0', '#f3f3f1'], ['Orange', '#f1b996', '#f3f3f1'], ['Purple', '#c6bdd9', '#f3f3f1'],
  ],
});

defineDevice({
  id: 'studio-display', name: 'Studio Display', brand: 'Apple', kind: 'desktop', year: 2022, dpr: 2,
  screen: { w: 2560, h: 1440, radius: 0 }, bezel: 36, rim: 6, chin: 0, stand: { w: 520, h: 420 },
  // 623 × 478 mm, tilt-stand depth 168 mm, body ~31 mm deep (VESA spec), at 4.29 px/mm
  solid: { t: 133, lift: 500, foot: { w: 600, d: 720, t: 26 } },
  cutout: { type: 'camera', side: 'top', d: 8 }, statusBar: 'macos', safe: { top: 24, bottom: 0 },
  colors: [['Silver', '#cfd1d3']],
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
