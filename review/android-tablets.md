# bezelkit hardware review: Android phones + tablets

Reviewed 2026-09-26 against `src/devices.js` / `src/bezel.js` (`buildHandheld`, `bezelCamera`, `screenCutout`).
Scope: `pixel-10-pro`, `galaxy-s25-ultra`, `galaxy-s25`, `android`, `galaxy-tab-s10-plus`, `ipad-pro-13`, `ipad-pro-11`, `ipad-air-11`, `ipad-mini`, plus devices released since then. Foldables are out of scope.

Machine-readable fixes: `review/android-tablets.json`. It lists only the changed fields, plus `_new_devices`.
Test harness: `review/android-tablets-test.html`, served at `http://127.0.0.1:8797/review/android-tablets-test.html?group=0..5|land|new`.
Renders: `review/android-tablets-render/*.png`. They show current and proposed side by side. A dashed magenta box marks the body size worked out from the mm dimensions.

**Totals:** 53 field-level corrections across 8 devices, 3 renderer or registry issues outside the device fields, and 6 proposed new devices.

## Method

- **Geometry.** The renderer draws body width as `bw = screen.w + bezel.l + bezel.r + 2·rim` (same for height). The target is `mm × (viewport width ÷ active-area width in mm)`. Active-area width comes from the Apple drawing when there is one, otherwise from the manufacturer's diagonal, resolution and ppi.
- **iPads.** I read the Apple Accessory Design Guidelines dimensional drawings (M5 Pro, M4 Air, A17 Pro mini) in Chrome's PDF viewer. Corner radii come from the drawings' vector paths: I parsed the PDF content streams and took the 45° point of each corner curve, R = offset ÷ (1 − 1/√2). Button and camera sides come from Apple's Support "hardware features" diagrams.
- **Pixel.** I used Google's AOSP device overlay for the Pixel 9 Pro (`caiman`). Its panel, size and body are the same as the Pixel 10 Pro. Google stopped publishing Pixel device trees in 2025, so no Pixel 10 tree exists.
- **Samsung.** No primary source exists for cut-outs or buttons. I used Samsung's mm specs and measured the official renders on GSMArena with pixel analysis in a canvas. Confidence is lower than for the iPads and Pixel.
- **Default settings I assume.**
  - Pixel: Display size at default, Screen resolution at default "High resolution".
  - Samsung phones: Screen resolution FHD+ (the default), Screen zoom at the default (middle) step.
  - Samsung tablets: default.
  - The dp viewport does not change with the resolution setting on either brand, because density scales with it. Only `devicePixelRatio` changes.

---

## pixel-10-pro

Derivation:
- Active area: 1280 px ÷ 495 ppi = 2.586″ = 65.68 mm.
- Scale: 427 dp ÷ 65.68 mm = 6.50 px/mm.
- Body target: 72.0 × 152.8 mm → 468.1 × 993.3 px.
- Proposed body: 427 + 2·15 + 2·5 = 467 by 952 + 40 = 992. Current renders 440 × 944 (Δ −9.5 / −9.8 against its own 410-wide scale).

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen.w × h | 410 × 914 | **427 × 952** | AOSP `caiman` overlay: `status_bar_height_portrait` = 68dp and cutout rect height = 204 px (at full resolution), so 204 ÷ 68 = DPR 3.0 exactly. That gives 1280/3 × 2856/3. Pixel 9 (`tokay`) checks out the same way: 173 px ÷ 66dp = 2.625, the known 412-wide device. [config.xml](https://android.googlesource.com/device/google/caimito/+/refs/heads/main/caiman/overlay/frameworks/base/core/res/res/values/config.xml), [yesviz Pixel 9 Pro 427×952](https://yesviz.com/devices/google-pixel-9-pro/). Conflicting: [webmobilefirst](https://www.webmobilefirst.com/en/devices/google-pixel-10-pro-2026/) says 410×912 @3.125. | medium. Pixel 10 Pro reuses the 9 Pro panel, but no Pixel 10 tree exists. Please confirm `screen.width` on a device. |
| dpr | 3.12 | **2.25** | Pixel Pro ships at "High resolution" 960×2142 by default ([Digital Trends](https://www.digitaltrends.com/phones/first-things-to-do-with-your-google-pixel-9/)), and 960/427 = 2.25. It is 3.0 at Full resolution. | medium |
| screen.radius | 46 | **52** | `rounded_corner_radius` = 157 px ÷ 3 = 52.3 dp. This is what Android's `RoundedCorner` API reports. [dimens.xml](https://android.googlesource.com/device/google/caimito/+/refs/heads/main/caiman/overlay/frameworks/base/core/res/res/values/dimens.xml). The 45° point of `config_mainDisplayShape` corresponds to a 59 dp circle, so the actual curve is a squircle. | high (for 9 Pro) |
| bezel | 10 | **15** | Derivation above (bezel + rim = 20.5 per side, uniform) | high |
| rim | 5 | 5 (no change) | GSMArena render shows about 1.4 mm of polished frame | low |
| bodyRadius | 64 | **72** | 52 + 20 = 72, concentric. The render agrees. | low–medium |
| cutout | hole d 14, top 14 | **hole d 32, top 18** | `config_mainBuiltInDisplayCutout` = circle r 49 px at (640, 102), with `config_fillMainBuiltInDisplayCutout=true`. That makes a 32.7 dp black disc centred 34 dp down. The GSMArena render gives about 28–29 dp. | medium–high |
| safe.top | 40 | **68** | `status_bar_height_portrait` 68dp, "Align to camera cutout's height" | high (for 9 Pro) |
| safe.bottom | 24 | 24 (no change) | AOSP gestural overlay `navigation_bar_height` 24dp | high |
| buttons | right 200/62, right 300/120 | **right 278/75 (power), right 400/132 (volume)** | GSMArena official render side view, luminance profile. Power runs 42.8–54.4 mm, volume 61.7–82.0 mm (body = 436 image px = 152.8 mm). | medium (±3 mm) |
| colors | Obsidian, Porcelain, Moonstone, Jade | no change | [Google Store](https://store.google.com/product/pixel_10_pro_specs) | high |

Visual notes:
- The current frame is too narrow and short for its viewport (its bezels are about 4 mm too thin).
- The hole is far too small. The real Pixel Pro status bar is tall, as tall relative to the screen as an iPhone's island area.
- The pill: AOSP `navigation_handle_bottom` = 10dp, but the renderer puts the 4dp handle 8dp from the bottom (`top: lh-12`). A renderer nit, 2 px.

## galaxy-s25-ultra

Derivation:
- Active area: 1440 px ÷ ~498 ppi = 73.45 mm, which matches Samsung's "6.9″ full rectangle".
- Scale: 384 ÷ 73.45 = 5.228 px/mm.
- Body target: 77.6 × 162.8 mm ([Samsung](https://www.samsung.com/ca/smartphones/galaxy-s25-ultra/specs/)) → 405.7 × 851.1 px.
- Proposed: 384 + 14 + 8 = 406 by 832 + 12 + 8 = 852.
- The current frame was proportionally right at 412 (body 436 × 915, target 435 × 913). The problem is the viewport.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen.w × h | 412 × 891 | **384 × 832** | The default Screen zoom on Ultras gives 384 dp (1440/3.75 at QHD+, or 1080/2.8125 at FHD+). S24 Ultra is listed at 384×832 @2.8125 ([webmobilefirst](https://www.webmobilefirst.com/en/devices/samsung-galaxy-s24-ultra-2024/)), and S25 Ultra at 384-wide ([viewpo](https://viewpo.io/tools/device-viewports/samsung-galaxy-s25-ultra/)). 412×891 is the smaller Screen zoom step (DPR 2.625 at FHD+ / 3.5 at QHD+). | medium–high |
| dpr | 3.5 | **2.8125** | FHD+ is the out-of-box resolution (1080/384). It is 3.75 at QHD+. | medium–high |
| screen.radius | 26 | **24** | Scaled 26 × 384/412. No primary value found. | low |
| bezel | 8 | **{t:6, r:7, b:6, l:7}** | Derivation above: 10.9 px per side horizontally, 9.6 vertically | high |
| bodyRadius | 38 | **35** | Scaled to the new dp. The render suggests a slightly tighter corner, but it's too coarse to trust. | low |
| cutout | hole d 11, top 12 | **hole d 17, top 8** | GSMArena official render: the hole is 3.4 mm across and its top is 1.5 mm below the active area | medium–low |
| buttons | right 180/100, right 305/55 | **right 161/110 (volume), right 322/59 (side key)** | Render side view: volume 30.8–51.8 mm, side key 61.6–72.9 mm. Both on the right, volume above the key (already correct). | medium |
| safe | 34 / 24 | no change | The hole now spans 8–25 dp, so 34 still covers it | low |
| colors | Titanium Silverblue / Black / Gray / Whitesilver | no change (online-only: Titanium Jetblack, Jadegreen, Pinkgold) | Samsung | high |

Registry note: `back` coordinates (for example `logo.y: 820`) are body px. Once the body goes from 915 to 852 tall, scale them by 0.932.

## galaxy-s25

Derivation:
- Active area: 6.2″ 1080×2340 at 416 ppi → 65.94 mm wide.
- Scale: 360 ÷ 65.94 = 5.46 px/mm.
- Body target: 70.5 × 146.9 mm → 384.9 × 802.0 px.
- Current body 386 × 806. Proposed 384 × 802.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen / dpr | 360 × 780, r 38, @3 | no change | 1080/3 at the default density | high (viewport), low (radius) |
| bezel | 9 | **{t:7, r:8, b:7, l:8}** | Derivation above | high |
| cutout | hole d 10, top 10 | **hole d 18, top 10** | [GSMArena render](https://www.gsmarena.com/samsung_galaxy_s25-pictures-13610.php): hole about 3.4 mm, top 1.8 mm below the active area | medium–low |
| buttons | right 175/85, right 280/50 | **right 149/106, right 307/54** | Render: volume 27.2–46.7 mm, side key about 56–66 mm | medium |
| safe.top | 30 | no change, but see note | The hole bottom is now at 28 dp. A larger value (about 36) may be closer to One UI. I found no primary source. | low |
| colors | Icyblue, Navy, Mint, Silver Shadow | no change | Samsung | high |

## android (generic)

The fields are fine as a generic 360 × 800 phone. There is a **registry bug, not a field change**: `aliases.android = 'pixel-10-pro'`, and `getDevice(id)` applies the alias first. So `getDevice('android')`, and `<bezel-device device="android">`, resolve to the Pixel. The generic entry with `id: 'android'` can never be rendered, even though `listDevices()` lists it. The gallery in `index.html` renders tiles with `device="${d.id}"`, so its "Android (generic)" tile actually shows a Pixel 10 Pro. The test page confirms this. Fix: drop the `android` alias, or rename the generic id (for example `android-generic`) and point the alias at it. Confidence: high (reproduced).

Optional, low confidence: a typical 6.5″ 20:9 phone is about 74 mm wide, which gives about 16.5 px of bezel + rim per side. The current total is 13. The hole (12 dp ≈ 2.3 mm) is small for a mid-range phone; about 16 is more typical. I left both unchanged in the JSON.

## galaxy-tab-s10-plus

Derivation:
- Active area: 12.4″ 2800×1752 = 266.4 ppi → 167.05 mm wide.
- Scale: 876 ÷ 167.05 = 5.244 px/mm.
- Body target: 185.4 × 285.4 mm → 972.2 × 1496.6 px.
- Proposed: 876 + 96 = 972 by 1400 + 96 = 1496.
- At the current 800-wide viewport the target would be 888 × 1367; the frame renders 846 × 1326. **The bezels are about half their real size either way.**

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen.w × h | 800 × 1280 | **876 × 1400** | Samsung Tab S uses a 2.0 density (the 11″ Tab S7/S9 report 800×1280 @2, per [1440px](https://1440px.com/screen-sizes/samsung-galaxy-tab-s9/)). 1752/2 = 876 ([phone-simulator](https://phone-simulator.com/devices/samsung-galaxy-tab-s10-plus)). The current 2.19 (350 dpi) is not a density Samsung uses. | low–medium. Verify on a device. |
| dpr | 2.19 | **2** | as above | low–medium |
| bezel | 20 | **45** | Derivation above (48.2 per side minus rim 3) | high (in mm; the px value follows the viewport) |
| cutout | camera left | **camera side: 'right'** | Front camera is centred on the landscape long edge ([GSMArena render](https://fdn2.gsmarena.com/vv/pics/samsung/samsung-galaxy-tab-s10-plus-2.jpg)). The renderer rotates landscape −90°, so the portrait *right* edge becomes the top. With 'left', landscape frames show the camera on the bottom edge. **Needs renderer support; see Renderer notes.** | high (side) |
| buttons | top 620/60, top 700/40 | **right 233/53 (power), right 342/113 (volume)** | Landscape render: both keys on the top long edge near the left corner. Power runs 44.5–54.6 mm, volume 65.2–86.7 mm. In portrait that is the right edge, near the top. | medium |
| radius, safe, colors | 16; 28/20; Moonstone Gray, Platinum Silver | no change | [Samsung colours](https://www.samsung.com) | radius low |

Registry note: `back` coordinates should be scaled by 1.095 if the 876 viewport is adopted.

## ipad-pro-13 (now M5, same body as M4)

Sources: [dimensional drawing](https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-pro-13-inch-m5.pdf), [Apple Support hardware diagram](https://support.apple.com/guide/ipad/ipad-pro-13-inch-m5-ipad84f213e7/ipados), [specs](https://www.apple.com/ipad-pro/specs/), [year 2025](https://support.apple.com/en-us/108043).

Derivation:
- The drawing gives 215.53 × 281.58 mm overall and a 199.14 × 265.19 mm active area.
- Scale: 1032 ÷ 199.14 = 5.182 px/mm (1376 ÷ 265.19 = 5.189).
- Body target: 1116.9 × 1459.2 px. Current 1084 × 1428. Proposed 1032 + 2·38 + 2·4 = 1116 by 1460.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| name / year | iPad Pro 13″ / 2024 | **iPad Pro 13″ (M5) / 2025** | Apple 108043 | high |
| bezel | 22 | **38** (bezel + rim 42.5 per side = 8.2 mm) | drawing | high |
| screen.radius | 18 | **26** | The active-area corner in the drawing is a 45°-equivalent circle of 5.1–5.5 drawing units, about 30 pt. I calibrated against the known nominal values: the same method gives 20.7 for the Air (nominal 18) and 24.4 for the mini (nominal 21.5), a factor of about 1.14. So about 26 pt nominal; use 30 if you want CSS circles to match visually. 18 is the pre-2024 Pro value. | medium–low |
| bodyRadius | (formula 44) | **80** | Outer housing corner, 45° method: 15.4 mm | medium |
| cutout | camera left | **camera side: 'right'** | Support diagram: in portrait the front camera is at the middle of the right edge, the landscape edge. The drawing puts the sensor cluster at 119.8–156.2 mm down the right edge, centred on 140.79 mm = half the height. | high |
| buttons | top 940/58; right 70/48; right 128/48 | **top 982/63; right 100/52; right 163/52** | Drawing: top button 12.06 mm long, its near end 13.98 mm from the right edge (so it starts at 189.49 mm). Volume + at 19.33 mm and − at 31.39 mm from the top edge, both 10.06 mm, on the right edge. | high |
| rim, safe, colors, dpr | 4; 24/20; Space Black, Silver; 2 | no change | Apple | high |

## ipad-pro-11 (M5)

Sources: [drawing](https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-pro-11-inch-m5.pdf). The drawing notes it is compatible with the M4. [Support diagram](https://support.apple.com/guide/ipad/ipad-pro-11-inch-m5-ipad46738ed0/ipados).

Derivation:
- The drawing gives 177.51 × 249.70 mm overall and a 160.13 × 232.32 mm active area.
- Scale: 834 ÷ 160.13 = 5.208 (1210 ÷ 232.32 = 5.208).
- Body target: 924.5 × 1300.5 px. Current 886 × 1262 (−38.5 / −38.5). Proposed 924 × 1300.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| name / year | iPad Pro 11″ / 2024 | **iPad Pro 11″ (M5) / 2025** | Apple | high |
| bezel | 22 | **41** (bezel + rim 45.2 = 8.69 mm) | drawing | high |
| screen.radius | 18 | **26** | Same corner geometry as the 13″ (5.13 drawing units on both) | medium–low |
| bodyRadius | (formula 44) | **75** | Outer housing 45° method: 14.4 mm | medium |
| cutout | camera left | **camera side: 'right'** | Sensor cluster 103.65–140.30 mm down the right edge, centred on 124.85 mm = half the height | high |
| buttons | top 750/55; right 65/45; right 120/45 | **top 789/63; right 101/52; right 163/52** | Drawing: top button 12.06 mm long, 13.98 mm from the right edge. Volume at 19.33 and 31.39 mm, 10.06 mm long. I verified these against the drawing's side view at 5.3 px/mm. | high |

## ipad-air-11 (now M4, March 2026)

Sources: [drawing](https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-air-11-inch-m4.pdf), [Support diagram](https://support.apple.com/guide/ipad/ipad-air-11-inch-m4-ipad507cbe11/ipados), [specs](https://www.apple.com/ipad-air/specs/), [newsroom](https://www.apple.com/newsroom/2026/03/apple-introduces-the-new-ipad-air-powered-by-m4/).

Derivation:
- The drawing gives 178.52 × 247.64 mm overall, a 158.44 × 227.56 mm active area, and 10.04 mm of bezel per side.
- Scale: 820 ÷ 158.44 = 5.175 (1180 ÷ 227.56 = 5.185).
- Body target: 923.9 × 1281.7 px. Current 876 × 1236. Proposed 924 × 1284.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| name / year | iPad Air 11″ / 2025 | **iPad Air 11″ (M4) / 2026** | Apple 108043 / newsroom | high |
| bezel | 24 | **48** | drawing (10.04 mm ≈ 52 px incl. rim) | high |
| bodyRadius | (formula 46) | **61** | Outer corner 45° method: about 11.7 mm | medium |
| cutout | camera left | **camera side: 'right'** | FC at 114.32 mm from the top on the right edge, which is 9.5 mm (about 49 px) above centre. The renderer can only centre it. | high (side) |
| buttons | top 740/55; right 65/45; right 120/45 | **top 770/89; right 101/52; right 163/52** | Drawing: the Touch ID top button is 17.12 mm long, its near end 12.69 mm from the right edge (starts at 148.71 mm). Volume + at 19.49 mm and − at 31.55 mm, 10.06 mm long. | high |
| radius | 18 | no change | Nominal `_displayCornerRadius` is 18. The drawing gives 20.7 as a circle. | medium |
| colors | Space Gray, Blue, Purple, Starlight | no change | Apple | high |

## ipad-mini (A17 Pro, 2024, still current)

Sources: [drawing](https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-mini-a17-pro.pdf), [Support diagram](https://support.apple.com/guide/ipad/ipadminia17pro-ipad66ed6260/ipados), [specs](https://www.apple.com/ipad-mini/specs/).

Derivation:
- The drawing gives 134.75 × 195.43 mm overall and a 117.06 × 177.74 mm active area. The bezel is 8.845 mm on all four sides.
- Scale: 744 ÷ 117.06 = 6.356 (1133 ÷ 177.74 = 6.374).
- Body target: 856.4 × 1242.1 px. Current 796 × 1185. Proposed 856 × 1245.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| name | iPad mini | **iPad mini (A17 Pro)** | Apple | high |
| bezel | 22 | **52** | drawing | high |
| bodyRadius | (formula 47) | **81** | Outer housing 45° method: 12.7 mm | medium |
| buttons | top 640/50; **right** 60/45; **right** 115/45 | **top 82/64; top 158/64; top 668/109** (all on the top edge) | Apple spec: "Top: Volume buttons … Top button with Touch ID". Support diagram: volume top-left, camera centre, top button top-right. Drawing: 2× 10.06 mm volume buttons starting 12.82 and 24.88 mm from the left corner. The 17.12 mm sleep/wake button's near end is 12.69 mm from the right corner. The drawing's top view is drawn mirrored; the rear-camera bump sits on the same side as the button there. | high |
| cutout | camera top | no change (correct) | spec: front camera at the top centre | high |
| radius | 21 | no change (nominal 21.5) | | medium |

---

## Renderer notes (for whoever owns `src/bezel.js`)

1. **`bezelCamera` has no `'right'` branch.** Anything other than `'left'` draws the dot at the top centre. Every current iPad Pro/Air and Galaxy Tab has the front camera on the portrait **right** edge, so the −90° landscape rotation puts it on top. The existing `'left'` values put it on the bottom edge in landscape; see `android-tablets-render/landscape.png` and `landscape-camera-zoom.png`. Suggested branch:
   ```js
   if (cut.side === 'right') return div('cam', `left:${x + w - bz.r + (bz.r - d) / 2}px;top:${y + (h - d) / 2}px;${lens(d)}`);
   ```
   An optional `cut.at` (px from top) would place the iPad Air camera correctly (114 mm, not the centre). The test page previews the right-side dot with a post-render shim.
2. **`android` alias shadows the generic `android` device.** See the android section.
3. **Changing the body size shifts `back.*` coordinates**, which are body px. Rescale for `galaxy-s25-ultra` (×0.932) and `galaxy-tab-s10-plus` (×1.095). The iPad and Pixel backs grow, so their camera coordinates measured from the top-left stay valid.
4. Android pill: AOSP places the 108×4 dp handle 10 dp above the bottom edge (`navigation_handle_bottom`). The renderer uses 8.

## Proposed new devices (full entries in `_new_devices`)

| id | released | key facts | source | confidence |
|---|---|---|---|---|
| `pixel-11-pro` | 2026-08-20 | 152.7 × 71.9 mm, 6.3″ 1280×2856 (the Pixel 10 Pro panel), so 427×952 @2.25, body 467×992 (target 467.4×992.7). Colours Obsidian, Fog, Canyon, Olive (hexes approximate). The buttons reuse the 10 Pro measurements. | [Google blog](https://blog.google/products-and-platforms/devices/pixel/google-pixel-11-pro-xl/), [GSMArena](https://www.gsmarena.com/google_pixel_11_pro_5g-14801.php) | medium (viewport inherits the 10 Pro uncertainty) |
| `pixel-11` | 2026-08-20 | 152.8 × 72.0 mm, 6.3″ 1080×2424 at 420 dpi, so 412×924 @2.625. Radius 50, hole d 32 top 17, status 66 (Pixel 9 `tokay` AOSP values, same panel). Frost, Pistachio, Hibiscus, Obsidian. | [GSMArena](https://www.gsmarena.com/google_pixel_11_5g-14799.php), [AOSP tokay](https://android.googlesource.com/device/google/caimito/+/refs/heads/main/tokay/overlay/frameworks/base/core/res/res/values/config.xml) | medium |
| `galaxy-s26-ultra` | 2026-03 | 163.6 × 78.1 × 7.9 mm, 6.9″ 1440×3120, so 384×832 @2.8125 (same rules as the S25 Ultra), body 408×856 (target 408.3×855.3). Aluminium frame, not titanium. Colours Black, Cobalt Violet, Sky Blue, White, plus online-only Silver Shadow and Pink Gold. | [Samsung newsroom](https://news.samsung.com/global/samsung-unveils-galaxy-s26-series-the-most-intuitive-galaxy-ai-phone-yet), [GSMArena](https://www.gsmarena.com/samsung_galaxy_s26_ultra_5g-14320.php) | medium (buttons/hole low) |
| `galaxy-s26` | 2026-03 | 149.6 × 71.7 × 7.2 mm, 6.3″ 1080×2340 at 411 ppi, so 360×780 @3, body 386×806 (target 386.8×806.9) | [GSMArena](https://www.gsmarena.com/samsung_galaxy_s26_5g-14456.php) | medium (buttons/hole low) |
| `galaxy-tab-s11` | 2025-09 | 253.8 × 165.3 × 5.5 mm, 11″ 2560×1600, so 800×1280 @2, body 892×1372 (target 892.9×1371.0). Camera on the portrait right edge. Gray, Silver. | [Samsung US newsroom](https://news.samsung.com/us/samsung-unveils-galaxy-tab-s11-series/), [GSMArena](https://m.gsmarena.com/samsung_galaxy_tab_s11_5g-14058.php) | medium (buttons low: copied from the S10+ mm) |
| `ipad-air-13` | 2026-03 | 214.9 × 280.6 mm, 2048×2732 at 264 ppi, so 1024×1366, body 1116×1458 (target 1116.8×1458.2). Volume at 19.49/31.55 mm; Touch ID button 17.12 mm long, 12.69 mm from the corner. | [drawing](https://developer.apple.com/download/files/accessories/dimensional-drawings/ipad-air-13-inch-m4.pdf), [specs](https://www.apple.com/ipad-air/specs/) | high (geometry), medium (radii) |

Not proposed:
- Galaxy S26+, Pixel 10/11 Pro XL and Galaxy Tab S11 Ultra: same method, lower priority. The S11 Ultra has a teardrop notch that the renderer can't draw.
- iPad Pro M5: an in-place update of the existing entries (name and year above), not a new device.

Alias suggestion: point `pixel` at `pixel-11-pro` and `galaxy` at `galaxy-s26-ultra` once they are added.

## Open uncertainties, in order of importance

1. **Pixel 10 Pro viewport.** 427 (DPR 3 in the AOSP 9 Pro evidence, yesviz) versus 410 (webmobilefirst, which claims a 3.125 measurement). One `screen.width` / `devicePixelRatio` reading on a real device settles it. If it's 410, keep the old w/h and scale my other Pixel dp values by 0.96.
2. **Galaxy Tab S10+ viewport.** 876 versus 800. No primary source.
3. **Samsung display and body corner radii, hole size, status-bar height.** Render-derived or scaled only.
4. **iPad Pro display radius.** 26 is a nominal value inferred from a calibrated drawing measurement; Apple doesn't publish the M4/M5 value.
