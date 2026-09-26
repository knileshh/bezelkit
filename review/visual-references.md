# bezelkit: visual reference survey

Researched 2026-09-26. This survey covers visual accuracy: finish, proportions, cutouts, corners and prior art. It does not cover spec-sheet numbers, which three other reviews handle. Where this report does give numbers, they come from rendered reference artwork (AOSP emulator skins) or simple derivations, and are marked as such. Treat them as a cross-check for the spec reviews, not as a replacement.

**Evidence captured for this report.** All files are under `D:\Development\weekend projects\bezelkit\review\_scratch\`, and the exact commands are in the appendix.
- **Our renders:** close-up and gallery screenshots, taken on a local server at port 8843 with `bz-shoot.mjs`. They are `ph1-a.png`, `ph2-a.png`, `z-*-top.png`, `z-*-bottom.png`, `mbp-full.png`, `mbpz-*.png`, `imac-full.png`, `tab-full.png`, `watch-full.png`, `old-full.png`, `idx-dev*.png` and `st-*.png`.
- **Close-up harness:** `closeup.html`, which renders any device large. Usage: `closeup.html?d=<id,id>&w=<px>&h=<px>`.
- **Google's own emulator skins:** `aosp\pixel_10_pro\` and `aosp\pixel_10\`. Each holds a `layout` file plus `back.webp` and `mask.webp` (with PNG conversions), fetched from the Android Studio source tree. Measurement crops sit next to them: `p10p_back_corner.png`, `p10p_left_antenna.png`, `p10p_hole.png` and others.

> **Headline context.** The registry is one hardware generation behind. Here is what shipped between our "current" devices and today:
> - **Apple:** iPhone 18 Pro and 18 Pro Max (smaller Dynamic Island), iPhone Duo (Apple's first foldable), iPhone 17e, Apple Watch Series 12 and Ultra 4 (all announced 9 Sep 2026). Also iPad Pro (M5), iPad Air (M4), MacBook Pro and Air (M5), and MacBook Neo.
> - **Google:** Pixel 11 and 11 Pro (12 Aug 2026).
> - **Samsung:** Galaxy S26 and S26 Ultra, and Z Fold8, Fold8 Ultra and Flip8 (22 Jul 2026).
>
> Apple's bezel page and dimensional-drawings page already list most of the Apple devices. "Outdated devices" is also the most common complaint users make about every competitor (§d). So the most noticeable "inaccuracy" a visitor will see is not a pixel, it's the default `iphone` → `iphone-17-pro` alias. The same is true for `pixel` → `pixel-10-pro` and `galaxy` → `galaxy-s25-ultra`.
> Sources:
> - [Apple Newsroom: iPhone 18 Pro](https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/)
> - [Apple Newsroom: iPhone Duo](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)
> - [MacRumors: smaller Dynamic Island](https://www.macrumors.com/2026/09/09/iphone-18-pro-features-smaller-dynamic-island/)
> - [9to5Google: Made by Google 2026](https://9to5google.com/2026/08/12/made-by-google-2026-announcements/)
> - [Samsung Newsroom: Unpacked July 2026](https://news.samsung.com/global/galaxy-unpacked-july-2026-a-first-look-at-galaxy-z-fold8-ultra-galaxy-z-fold8-and-galaxy-z-flip8)
> - [Samsung emulator skins list S26](https://developer.samsung.com/galaxy-emulator-skin/galaxy-s.html)
> - [Apple dimensional drawings](https://developer.apple.com/accessories/dimensional-drawings/)

---

## (a) References per device family, with licence notes

### Licence summary (read first)

| Source | What it is | Can bezelkit look at it? | Can bezelkit trace, copy or ship it? |
|---|---|---|---|
| **Apple Design Resources: Product Bezels** ([page](https://developer.apple.com/design/resources/)) | Photographic PNG and PSD frames. The current list covers iPhone 16, 17, 18 and Duo; iPad (A16), Air (M4), mini (A17 Pro), Pro (M5); MacBook Air M5, MacBook Pro M5, MacBook Neo; iMac; Studio Display; Watch Series 11, Ultra 2 and Ultra 3; Apple TV | Looking and measuring by eye is fine. That's how any illustrator works, and dimensions are facts | **No.** Licence §2A limits use to "solely for creating mock-ups of user interfaces designed for use in software products", and only for software that runs on Apple OSes. §2B and §2C bar embedding, redistribution and extracting "Template Content". §2D bars derivative works. The bezels are additionally covered by the App Store Marketing Artwork licence, which allows use only in connection with your App Store apps and only while you're a Developer Program member ([ADR licence PDF](https://developer.apple.com/support/downloads/terms/apple-design-resources/Apple-Design-Resources-License-20230621-English.pdf); the second licence is as described in [clodoan/skills#15](https://github.com/clodoan/skills/pull/15)). **Don't auto-trace, pixel-sample or bundle them.** A CSS re-drawing from published dimensions is original work. Keep the calibration notes in words and numbers, not overlays |
| **Apple App Store marketing guidelines** ([page](https://developer.apple.com/app-store/marketing/guidelines/)) | Rules for developers marketing their apps | n/a | Under "Unauthorized Uses", the guidelines forbid 3D renderings or any simulation of an Apple product, illustrations depicting an Apple product (except instructional material), and altering product images. They also say to always use the latest-generation devices. **Impact:** this binds bezelkit's *users* when they make App Store marketing, not the library. The README should say that a CSS frame is an illustration, and that for App Store or Apple-sanctioned marketing, users should use Apple's official bezels. The footer line "frames are original CSS drawings, not traced artwork" is the right stance; keep it true |
| **Apple accessory dimensional drawings** ([index](https://developer.apple.com/accessories/dimensional-drawings/), e.g. [iphone-17-pro.pdf](https://developer.apple.com/download/files/accessories/dimensional-drawings/iphone-17-pro.pdf)) | Engineering PDFs: outline, cutouts, button and Camera Control keep-outs, cameras. Available for iPhone 18 Pro/Pro Max, 17 line, Air, 17e, iPad Pro M5, MacBook Neo, Watch Series 12 and Ultra 4 | Yes, for measurements. They're "informational", and the sheets are marked proprietary, not to reproduce | Don't republish the drawings or screenshots of them. Numbers taken from them (mm positions) are fine to use |
| **Android Studio emulator skins (AOSP)** ([device-art-resources](https://android.googlesource.com/platform/tools/adt/idea/+/refs/heads/mirror-goog-studio-main/artwork/resources/device-art-resources/)) | Google's own front-view frame art plus a `layout` file (display px, offset, `corner_radius`) and a screen `mask.webp`. Available for Pixel 9, 9 Pro, 9 Pro XL, 9 Pro Fold, 9a, and the same five for Pixel 10 | Yes. It's open source (AOSP `platform/tools/adt/idea`, Apache-2.0 project; per-file headers not individually verified) | Measuring and learning from it is clearly fine. Copying the artwork would need Apache-2.0 attribution, and the Pixel trademark still applies. **This is the best Pixel reference available** |
| **Samsung Galaxy Emulator Skins** ([Galaxy S](https://developer.samsung.com/galaxy-emulator-skin/galaxy-s.html), [Galaxy Z](https://developer.samsung.com/galaxy-emulator-skin/galaxy-z.html)) | The same skin format. Covers S25, S25+, S25 Ultra, S25 Edge, S25 FE, S26, S26+, S26 Ultra, S26 FE, Z Fold7 and Fold8 | Yes, for measuring. The download page states no specific terms beyond Samsung Developer Terms | Don't redistribute |
| **Google device art generator** ([page](https://developer.android.com/distribute/marketing-tools/device-art-generator)) | Web tool (updated 2025-07) | Yes | Google itself advises against framed screenshots in Play listings and recommends the bare screenshot. That's useful docs copy |
| **Meta "Devices"** ([design-at-meta/tools/devices](https://www.meta.com/design-at-meta/tools/devices/)) | PNG and Sketch device set | Yes | Meta asks users not to repackage or redistribute the files as their own. The page now lists no current-generation devices and looks stale, so it's low value in 2026 |
| **Figma Community** ([device mockups hub](https://www.figma.com/community/device-mockups)) | Vector frames | Yes | Free files default to CC BY 4.0 ([Figma help](https://help.figma.com/hc/en-us/articles/360042296374-Figma-Community-copyright-and-licensing)), so adapting is allowed with attribution. Vector files are still usually traced from Apple art, so prefer them for *technique*, not geometry |
| **Sketchfab and BlenderKit** | 3D models | Yes, for depth and side profiles | Per-model licence (CC-BY, standard, royalty-free). They're fan-made, so treat their proportions as approximate |

### Per-family best references

**iPhone 17 / 17 Pro / 17 Pro Max / Air (and the now-current 18 Pro / Duo)**
1. Apple Product Bezels (iPhone 17, 18 and Duo): the canonical straight-on front view, for rim colour, bezel and rim ratio, and island. https://developer.apple.com/design/resources/
2. Apple dimensional drawings for `iphone-17-pro`, `iphone-17-pro-max`, `iphone-air`, `iphone-17`, `iphone-18-pro` and `iphone-18-pro-max`, for button and Camera Control positions. The front-camera and receiver keep-outs locate the island. https://developer.apple.com/accessories/dimensional-drawings/
3. Figma prior art built from fills, borders and shadows, the closest analogue to CSS:
   - "iPhone 17 Pro / Max / Air components (vectors)": https://www.figma.com/community/file/1547773971650027194
   - "iPhone 17, Air, 17 Pro, and 17 Pro Max Mockups/Device Frames": https://www.figma.com/community/file/1564652018971544072
4. For 3D and depth:
   - Sketchfab "iPhone 17 Pro" by Ranguel (glb): https://sketchfab.com/3d-models/iphone-17-pro-4541aa8a28324b33a2baaf81d263aaec
   - Sketchfab "iPhone 17 Pro Cosmic Orange" by JNO_Models (4K PBR): https://sketchfab.com/3d-models/apple-iphone-17-pro-cosmic-orange-caed0de5b312400eabe8ad26570e7ef5
   - BlenderKit "iPhone 17 Pro Max (Deep Blue)" by sherhn: https://www.blenderkit.com/asset-gallery-detail/4ea2c060-6fdf-48ff-a74c-c6ca2d59dbe0/

What we're likely missing or getting wrong:
- **Frame finish.**
  - 17 Pro is *brushed* 7000-series aluminium unibody, a satin finish with a soft, wide highlight ([Apple Newsroom](https://www.apple.com/newsroom/2025/09/apple-unveils-iphone-17-pro-and-iphone-17-pro-max/)).
  - Air is mirror-polished titanium: a narrow, high-contrast specular line.
  - 17 is matte aluminium.
  - iPhone Duo is mirror-polished titanium with a micro-blasted hinge cover.
  - We use one identical 135° diagonal gradient for all of them (see b-2).
- **Antenna.** The 17 Pro integrates antennas around the aluminium perimeter. US models add a mmWave window on the top edge ([MacRumors](https://www.macrumors.com/2025/09/12/iphone-17-pro-mmwave-5g-antenna-window/)), but it isn't visible straight-on. The 17 and Air show antenna bands on the sides. They're small in front view; see b-11.
- **Dynamic Island.** It's pure black on Apple's art, and the lens is essentially invisible. Our lens reads as a bright bluish bead (b-6). The iPhone 18 Pro island is smaller; Apple didn't publish dimensions, so measure it on the iPhone 18 bezel.
- **iPhone SE (3rd gen).** The FaceTime camera sits to the *left* of the earpiece, level with it, and the proximity sensor sits above. We centre the camera above the earpiece. This is from memory; verify on Apple's SE bezel or dimensional drawing.

**Pixel 10 Pro (and 10, 10 Pro XL, 10 Pro Fold, 11 series)**
1. The AOSP emulator skin `pixel_10_pro` (Google's own front art plus screen mask). Measured in this review; numbers in b-3 and b-4.
2. Figma "Google Pixel minimal device mockup frames", flat frames through Pixel 11: https://www.figma.com/community/file/828949095331405744
3. Google Store product imagery, for finish colours (Obsidian, Porcelain, Moonstone, Jade).

Visible differences we measured against the skin:
- The rim is thicker (≈8 dp vs our 5).
- The screen corner is much rounder (≈57 dp vs our 46).
- The punch-hole is about 2× larger (≈29 dp vs our 14) and lower (centre ≈33 dp from the screen top vs our 21).
- There's a thin polished-glass highlight line inside the black bezel.
- Antenna bands appear as flat matte-grey 1.3 mm slots, on the left side about 16% from the top and near the top and bottom corners.

**Galaxy S25 / S25 Ultra (now S26 / S26 Ultra)**
1. Samsung Galaxy Emulator Skins for S25, S25 Ultra, S26 and S26 Ultra: https://developer.samsung.com/galaxy-emulator-skin/galaxy-s.html. Not downloaded in this pass; it's the same format as AOSP, so the same measurement script applies.
2. Samsung Mobile Press image library (press renders): https://www.samsungmobilepress.com/
3. Figma BRIX "Samsung Galaxy S25 Ultra Free Mockups" (four generations, all colours): https://www.figma.com/community/file/933046505888926850

Likely gaps:
- S25 Ultra has a flat titanium frame with visible antenna slits and noticeably rounder corners than the S24 Ultra, so check `screen.radius: 26` against the skin mask.
- The side keys sit high on the right.
- The hole-punch should be checked against the skin, just as the Pixel one was off by 2×.

**iPads (Pro M5, Air M4, mini A17 Pro)**
1. Apple Product Bezels for iPad Pro (M5), iPad Air (M4) and iPad mini (A17 Pro).
2. Dimensional drawings `ipad-pro-11-inch-m5.pdf` and `ipad-pro-13-inch-m5.pdf`, which locate the landscape-edge camera and the buttons.

Visually our iPads are the closest to right. Uniform bezels and concentric corners both read correctly. What to check: the camera sits on the long (landscape-top) edge for Pro and Air, and on the short edge for mini (we have that). Button edges on Pro M5 need verifying against the drawing.

**MacBooks (Pro 14/16 M5, Air 13/15 M5, Neo)**
1. Apple Product Bezels for MacBook Pro M5, MacBook Air M5 and MacBook Neo, for base proportions and hinge.
2. Notch measurements from [notchbay](https://notchbay.com/blog/macbook-notch-size/):
   - The notch is ≈185 × 32 pt on the 14″ at its default 1512 × 982.
   - It's ≈12% of the screen width on every notched model.
   - Corners are ≈4 pt at the top flare and ≈8 pt at the bottom.
   - The menu bar is a few points taller than the notch. That matches our 37 pt menu bar with a 32 pt notch, so it's correct.
3. Sketchfab "MacBook Pro 14-inch M5" (free, PBR), for hinge and base depth: https://sketchfab.com/3d-models/macbook-pro-14-inch-m5-652a992f4f244122ae251f9cbb81da1e

Likely gaps:
- **Base overhang.** Our base overhangs 7% of the lid width per side, with a large elliptical underside, so it reads as a tray.
- **Hinge.** No dark hinge band is drawn.
- **Notch width.** It should scale about 12% of width. Ours is 190 pt on 1728 and 1710 pt screens (≈11%) and 186 on 1470 (12.7%).

**iMac 24″**
1. Apple Product Bezels for iMac.
2. Apple tech specs:
   - Overall 46.1 × 54.7 × 14.7 cm, stand 13 cm wide ([apple.com/imac/specs](https://www.apple.com/imac/specs/), [dimensions.com](https://www.dimensions.com/element/apple-imac-24-2021)).
   - The head is ≈37.5 cm tall without the stand ([MacRumors forum](https://forums.macrumors.com/threads/imac-24-dimensions.2405172/)).

Derived at our scale (2240 px ≈ 52.0 cm visible width, so ≈43 px/cm). All of these need verifying:

| Part | Derived | Ours |
|---|---|---|
| White bezel | ≈1.35 cm ≈ **58 px** | 34 |
| Chin | ≈5.5 cm ≈ **237 px** | 180 |
| Stand width | 13 cm ≈ **560 px** | 460 |
| Stand visible below the chin | ≈8.6 cm ≈ **370 px** | 376, correct |

- **Stand shape.** The stand is a flat, bent aluminium plate, not a cylinder, and the foot is the same sheet at the *same width*. We shade the neck as a cylinder and draw a foot 1.12× wider.
- **Colour.** The chin is the light pastel tone. The stand and back are the deeper, saturated tone.

**Apple Watch (Series 11, Ultra 3; now Series 12 and Ultra 4)**
1. Apple Product Bezels for Watch Series 11, Ultra 3 and Ultra 2.
2. Dimensional drawings, which list Series 12 (42/46 mm) and Ultra 4.

Gaps:
- The Ultra has a raised titanium **crown guard** wrapping the crown and side button. We draw a bare crown.
- The watch status-bar time is hard-coded white and disappears on light slotted content (see `watch-full.png`).

**Foldables (iPhone Duo, Pixel 10 Pro Fold, Galaxy Z Fold8 and Flip8)**
- **iPhone Duo:** Apple's bezel page already lists it. Specs: 5.4″ outer and 7.6″ inner, both displays sharing one aspect ratio, a mirror-polished titanium frame, and Touch ID in the side button ([Apple Newsroom](https://www.apple.com/newsroom/2026/09/apple-unveils-iphone-duo/)).
- **Pixel 10 Pro Fold:** AOSP skin `pixel_10_pro_fold/closed` has a 1080 × 2364 display at offset (84, 66) with `corner_radius 75`. The `default` (open) skin has a 2076 × 2152 display at offset (62, 58).
- **Galaxy Z Fold8 / Fold8 Ultra / Flip8:** Samsung skins are listed ([Galaxy Z](https://developer.samsung.com/galaxy-emulator-skin/galaxy-z.html), [SammyFans](https://www.sammyfans.com/2026/09/25/your-galaxy-fold-8-apps-are-getting-some-extra-attention/)).
- bezelkit has no foldables. The data model would need a `hinge`/`crease` part and two screens, or a `state="open|closed"` attribute.

---

## (b) Ranked visual discrepancies, with CSS-level fixes

The ranking is by how noticeable each issue is at typical embed sizes (a phone 300–450 px tall, a laptop 600–900 px wide). Evidence files are in `review/_scratch/`.

### 1. The device generation is behind (every family, most visible to users)
The default aliases point to 2025 hardware while 2026 hardware is on sale (see the headline box). Apple's own guideline tells app marketers to use the latest generation.
**Fix:** add `iphone-18-pro`, `iphone-18-pro-max`, `iphone-duo`, `pixel-11-pro`, `galaxy-s26-ultra` and `apple-watch-ultra-4`, then repoint the aliases. Keep the 17s as named IDs. The 18 Pro reuses the 17 Pro geometry except for a smaller island, so it's cheap to add.

### 2. The rim has the wrong shading model (all phones, tablets and watches)
**Evidence:** `z-iphone-17-pro-top.png` and `z-galaxy-s25-ultra-top.png` against `aosp/p10p_back_corner.png`.

**What we do.** `metal()` paints a single 135° diagonal gradient across the whole `.body`, and only the outer 4–5 px ring shows. The result is a flat ring whose brightness drifts diagonally: bright top-left, dark in the middle, bright bottom-right.

**What the real art does.** Measured across the Pixel 10 Pro skin's left rim, from outside to inside:
- a 3 px dark edge line (luminance ≈70)
- a bright specular band peaking at ≈40% across (luminance ≈236)
- a falloff to ≈70% brightness at the glass
- a 3 px black gap
- a **2 px light hairline** (the polished glass edge)
- the black bezel

In other words, the shading runs *across* the rim, like a tube, and follows the corner curve all the way round.

**Fix.** Concentric inset `box-shadow`s follow the rounded rectangle, so they can paint a cross-section profile without SVG. Lighting direction then comes from one soft vertical overlay.

```css
/* .body keeps background: <frame colour>; profile via concentric insets (values in device px) */
.body {
  background: var(--f);
  box-shadow:
    inset 0 0 0 .75px color-mix(in oklab, var(--f), black 55%),   /* outer edge line */
    inset 0 0 0 1.5px color-mix(in oklab, var(--f), white 25%),
    inset 0 0 0 2.25px color-mix(in oklab, var(--f), white 60%),  /* specular band */
    inset 0 0 0 3.25px color-mix(in oklab, var(--f), white 15%),
    inset 0 0 0 4.25px color-mix(in oklab, var(--f), black 18%),  /* falls off toward glass */
    0 2px 3px rgba(0,0,0,.18), 0 24px 48px -16px rgba(0,0,0,.34); /* existing drop shadow */
}
.body::after { content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: linear-gradient(to bottom, rgb(255 255 255 / .22), transparent 35% 65%, rgb(0 0 0 / .22));
  mix-blend-mode: soft-light; }
/* glass edge hairline, ~1px inside the rim */
.glass { box-shadow: inset 0 0 0 1px #000, inset 0 0 0 1.75px rgb(255 255 255 / .2), inset 0 0 0 2.5px #000; }
```

Scale the band stops with `rim`: generate them in `buildHandheld` as fractions of `rim`. Add a per-device `finish: 'polished'|'brushed'|'matte'`:
- **polished** (Air, Duo, Pixel Pro): narrow, high-contrast band, `white 70%`, and the dark line kept.
- **brushed** (17 Pro): wider, softer band, `white 35%`, plus the `::after` overlay at lower opacity.
- **matte** (17, S25): low contrast, `white 18%`.

### 3. Rim-to-bezel ratio (Android especially)
**Evidence:** `aosp/pixel_10_pro/layout` (display 1280 × 2856 at offset 59, 60; DPR 3.122, which confirms our 410 × 914).

Measured on the skin:
- **Pixel 10 Pro:** rim ≈25 px ≈ **8 dp**; black bezel ≈34–35 px ≈ **11 dp** on the sides and top, ≈28 px ≈ **9 dp** at the bottom.
- **Pixel 10:** rim ≈8.4 dp; bezel ≈12–14 dp.

Ours is `rim: 5, bezel: 10` (a ratio of 0.5, where the skin gives ≈0.75). At thumbnail size our frames read as "black slab with a thin wire", while the real thing reads as "metal band plus glass".

**Fix:** for the Pixel 10 Pro, set `rim: 8`, `bezel: { t: 11, r: 11, b: 9, l: 11 }`. Measure iPhones the same way against Apple's 17 and 18 bezels, by eye only (see licence). The Air's polished rim looks thinner than the 17 Pro's unibody band; keep `rim` lower on the Air.

### 4. Pixel 10 Pro screen corner and hole-punch
**Evidence:** `aosp/pixel_10_pro/mask.webp`, measured with a circle fit (see appendix).

- **Corner radius.** The mask corner is a clean circle of **≈178 px ≈ 57 dp**. Pixel 10's is ≈145 px ≈ 55 dp. Ours is 46.
  - The skin's `layout` file separately says `corner_radius 99` (≈32 dp), which contradicts its own mask. The spec reviewers should settle this, ideally with `WindowInsets.getRoundedCorner()` on a device. Visually, the mask is what Google shows.
- **Hole-punch.** The skin's camera disc is **≈29 dp across, centred ≈33 dp below the screen top** (`p10p_hole.png`). Ours is `d: 14`, centred at 21 dp. That's a 2× size error, visible even at thumbnail size. The skin's hole is a black disc with a dark-grey barrel ring and a faint violet glint, and our `lens()` is close in style.
- **Body radius.** With a 57 dp screen corner, `bodyRadius` should be concentric: 57 + 11 + 8 ≈ **76**, not 64. The current mismatch makes the bezel visibly thicker at the corners (`z-pixel-10-pro-top.png`).

**Fix:** `screen.radius: 57`, `cutout: { type:'hole', d: 29, top: 18.5 }` (top edge = 33 − 14.5), `bodyRadius` derived. Run the same mask-fit script on the Samsung skins for S25, S25 Ultra and S26.

### 5. Raster-tile seams on the screen edge
**Evidence:** `seam1.png` and `seam2.png`, which are 8× crops of `ph2-a.png` and `z-galaxy-s25-ultra-top.png`.

The anti-aliased screen edge steps by about 1 device px at regular intervals down the long sides. The breaks land at roughly 270 px intervals in the 0.9× shot, which matches Chrome's raster tile height. The cause is `overflow:hidden` plus `border-radius` on the `.screen`, inside a `scale()`d stage. Each tile anti-aliases the clip edge slightly differently, and at 1× on white content it shows up as a 1 px notch where the bezel meets the screen.

**Fix:** stop relying on the clip edge to look clean. Draw an opaque **bezel ring overlay** above the screen: a `pointer-events:none` element at `z-index` above `.content` and below `.cutout`. Give it the screen rect inflated by 1 px, `border: 1.5px solid <front colour>`, and `border-radius: r + 1.5px`. It hides whatever the clip edge does. A cheap alternative is `will-change: transform` on `.stage`, so Chrome rasterises once at the final scale. That one is untested; the overlay is the robust fix.

### 6. The Dynamic Island lens is too visible
**Evidence:** `z-iphone-17-pro-top.png`.

Our island draws a 16 pt bluish sphere with a highlight at its right end. In Apple's art the island is uniformly black, and the front camera is at most a faint darker-than-black disc. At normal sizes the lens makes the island read as a pill with a webcam.

**Fix:** in `screenCutout('island')`, either drop the lens or use `radial-gradient(circle at 40% 40%, #10141b 0 30%, #050608 60%, #000 75%)` with `opacity:.6`. Keep the brighter lens for hole-punch Androids, where a visible lens is correct.

### 7. iMac proportions and stand
**Evidence:** `imac-full.png`; derived numbers in §a.

In order of visibility:
1. The **stand is shaded as a cylinder**, with a highlight in the middle. The real stand is a flat plate, so it should look nearly flat, with a subtle top-to-bottom gradient and a slightly darker left and right edge.
2. The **foot is 1.12× wider** than the stand; the real foot is the same bent sheet at the same width. Replace it with a 6–8 px lighter "bend" line of width `sw`.
3. The **white bezel is too thin**: 34 px, where ≈58 px is derived.
4. The **chin is short**: 180 px, where ≈237 px is derived.
5. The **stand is too narrow**: 460 px, where ≈560 px is derived.
6. The **stand uses the pastel chin colour**; it should use the deeper back colour. Add a `back` entry to the colour tuple, e.g. `['Blue', chin, front, back]`.

**Fix (CSS):**
- Neck: `background: linear-gradient(to right, darken(c,14) 0 1.5%, c 6% 94%, darken(c,14) 98.5%), linear-gradient(to bottom, darken(c,22), transparent 12%)`.
- Foot: `width: sw`.

The Studio Display stand has the same cylinder shading issue.

### 8. MacBook base reads as a tray
**Evidence:** `mbp-full.png` and `mbpz-base.png`.

- `overhang: 110` px per side (7% of lid width) plus an underside radius of `W*0.045 / bh*0.9` gives a wide, boat-shaped base.
- In Apple's front-view bezel the base is only slightly wider than the lid, perspective aside. It has a flat front lip with a light top-edge highlight and a centred thumb notch (we have the notch).
- A thin **dark hinge band** is visible between the lid's bottom bezel and the base. We draw none.

**Fix:**
- Reduce `overhang` to ≈3–5% of lid width. Calibrate by eye against Apple's MacBook Pro M5 bezel.
- Flatten the underside radius to about `bh*0.5`.
- Add a hinge element: `height: 4–6px`, `width: 72% of lid`, `background: linear-gradient(#1a1a1c, #3a3b3e)`, sitting at `top: lh - 2`.
- Scale the notch width at 12.2% of `screen.w` instead of fixed 186 and 190. Spec reviewers should verify.

### 9. Squircle corners
**Evidence:** a numeric comparison; details in §e.

This is less visible than it sounds. Apple's continuous corner with nominal radius *r* is, in effect, the same circle of radius *r* with longer tangent run-outs. A plain `border-radius: r` stays within **0.78 pt at r = 62 pt** (≈1.3% of r) of Apple's curve.
- **Don't** add `corner-shape: squircle` with the same radius. That shape is ≈12 pt too square.
- Priority is low. The real accuracy lever is using the right *r* value (item 4).

### 10. Buttons are flat bars
**Evidence:** `z-iphone-17-pro-top.png` and `ph1-a.png`.

Our buttons are rectangles with a left-to-right gradient and a small radius only on the outside. Real buttons seen from the front show:
- rounded ends (the radius along the length is about the button's protrusion)
- a dark seam where they meet the frame
- a highlight on the top end cap

**Fix (in `button()`):**
- Use `border-radius: 0 ${t}px ${t}px 0 / 0 ${Math.min(len/2, t*2.5)}px ${Math.min(len/2, t*2.5)}px 0` (mirrored for the left side).
- Add `box-shadow: inset 1px 0 0 rgb(0 0 0 / .35), inset 0 1px 0 rgb(255 255 255 / .35), inset 0 -1px 0 rgb(0 0 0 / .25)`.
- Give the flush Camera Control a sapphire look: `linear-gradient(to right, darken(c,30), darken(c,10))` with a 0.5 px lighter ring. That's roughly what we have, so a minor change.

### 11. No antenna lines
**Evidence:** `aosp/p10p_left_antenna.png` and `p10p_top_center.png`.

In the Pixel skin, antenna breaks are **flat, desaturated grey slots ≈1.3 mm (≈25 px at 3.12×) long**, with no highlight. They sit on the left rim about 16% from the top, on the top and bottom rims near both corners, and at the top-centre. Samsung's titanium frames and the iPhone 17 and Air have similar small slots. In a straight-on view they're small, but they're what makes a frame read as "a real phone" at large sizes.

**Fix:** add `antennas: [{ side, at, len }]` to the registry and render tiny `div`s over the rim: `background: color-mix(in oklab, var(--f), #888 55%)`, `width: rim`, `height: len`, no gradient. Render them only when the frame height is at least ≈500 px, or accept them as sub-pixel at thumbnail size.

### 12. Watch Ultra crown guard and watch time ink
**Evidence:** `watch-full.png`.
- **Crown guard.** Add a `guard` shape to the Ultra: a rim-coloured, rounded-rectangle protrusion (≈w 8, len ≈150) behind the crown and side button, using the same rim shading.
- **Time ink.** `statusBar('watch')` hard-codes `color:#fff`. Honour `theme`, or document that watch content should be dark (watchOS is dark by design, so the default is defensible).

### 13. Minor
- **iOS home indicator.** It's 134 × 5 pt, 8 pt from the bottom, on every phone size. We use `min(35% of width, 140)`, so it's 140 on the Pro and Pro Max. **Fix:** use a constant 134 for phones.
- **iPhone SE camera position.** See §a; verify first.
- **Gallery tile on `index.html#devices`.** The iMac tile showed an empty white screen at capture time (`idx-dev1.png`), probably because of `loading="lazy"` on a 2240 px iframe. It's not a visual-accuracy issue, but it makes the gallery look broken; consider `loading="eager"` for gallery tiles.

---

## (c) Competitor table

Download figures are monthly npm downloads, pulled from the npm API on 2026-09-26.

| Name | Type | Devices current? | Fit and content handling | Strengths | User complaints | Licence | Copy / avoid |
|---|---|---|---|---|---|---|---|
| [devices.css (picturepan2)](https://github.com/picturepan2/devices.css) | Pure CSS | No. Newest is iPhone 14 Pro, Pixel 2 XL, S8 | Fixed px. "Add responsive support" is still a to-do. Last code commit 2022 | Clean minimal look; 48k/month | Not responsive (#7); a global `*` reset breaks nested HTML (#6); no continuous corners (#16); Safari iframe bug (#8); new-device requests (#10, #11) | MIT | **Copy:** the restrained style. **Avoid:** px sizing and global resets. The community fix was `calc(var(--scale)*Npx)` everywhere |
| [Marvel devices.css](https://github.com/marvelapp/devices.css) | Pure CSS | No. iPhone X era. Last commit 2017 | Fixed px; screen sizes don't match real viewports (#13, #35) | 4.0k stars; many colour variants | Responsive requests (#15, #21, #23, #24); blurry when scaled (#23); Bootstrap box-sizing clash (#18); content not clickable (#19) | MIT | **Avoid:** px and `zoom` hacks. **Copy:** colour variants per device |
| [html5-device-mockups](https://github.com/pixelsign/html5-device-mockups) | PNG frames + CSS | No (2020) | **Responsive:** `padding-bottom:%` aspect box and a %-based screen rect. The PNG frame sits in `::after` *on top*, which blocks clicks | Fluid; photoreal | Content unreachable (#21, #65, #68, #86); 3.3 MB assets (#54); Apple-logo legal question (#61) | MIT | **Copy:** a %-rect data model. **Avoid:** overlays that swallow pointer events, heavy raster, brand logos |
| [react-device-frameset](https://github.com/zheeeng/react-device-frameset) | React wrapper of Marvel | No | `width`/`height`/`zoom` props; scale keeps the original box (#20); partial scaling (#10) | **112k/month, the highest in this set.** Demand is huge even though it's stale | Next.js CSS import errors (#11, #23); Vercel build fail (#18); stuck on Marvel's device list (#6) | MIT | Proof of demand. **Avoid:** React-only packaging and an upstream device dependency |
| [react-device-mockup](https://github.com/jung-youngmin/react-device-mockup) | React, CSS | Partly (generic island, notch, SE) | px `screenWidth` (#5 asks for responsive); draws its own grey status bar **by default** | `hideStatusBar`, `transparentCamArea` | Status-bar duplication risk | MIT | **Copy:** explicit toggles. **Avoid:** a status bar on by default for images |
| [Telephone (sneas)](https://github.com/sneas/telephone) | **Web component** (closest analogue) | 2 devices (`<iphone-16-max>`, `<pixel-9-pro>`) | Inline SVG frame; slot positioned in %; ResizeObserver feeds `--width` for radii; Shadow DOM; CSP `nonce` | Zero-dependency, fluid, active (last push 2026-09-23) | Always draws a status bar; one tag per device; 3.2k/month | MIT | **Copy:** SVG and fluid sizing idea, the CSP nonce. **Avoid:** always-on status bar |
| [react-mockframe](https://github.com/mbdev3/react-mockframe) | React | **Yes.** iPhone 17, Pixel 10, S25, iPad Pro, MBP | px plus `zoom`; `hideNotch` | Newest device set | React-only; tiny (6 stars, 3.1k/month) | MIT | **Direct overlap with our device list.** Win on framework-agnostic packaging, auto-fit and accuracy |
| [Flowbite device mockups](https://flowbite.com/docs/components/device-mockups) | Tailwind snippets | No ("iPhone 12", generic Pixel) | Fixed Tailwind px; `dark:hidden` image swap | Copy-paste, zero JS | Generic, fixed size, no fit logic | MIT | **Copy:** a light/dark `src` pair |
| [MockUPhone](https://mockuphone.com) ([repo](https://github.com/oursky/mockuphone.com)) | Free image SaaS; Python and OpenCV in-browser via Pyodide | No (iPhone 15, Pixel 8, S24U) | Auto-rotates if the rotated aspect ratio fits better; contain-scales on **black bars**; homography into a 4-corner quad; mask composite | Free, no watermark, angled views | Generation failures (#132, #134, #69) | Apache-2.0 | **Copy:** the auto-rotate hint. Our edge-colour letterbox beats black bars |
| [fastlane frameit](https://docs.fastlane.tools/actions/frameit) | CLI | Lagged for years (16 and 17 frames only added in 2026-02) | Exact pixel-size match plus `offsets.json`; hard error otherwise | CI automation | Stale frames (#29653, #29920); "Unsupported screen size" (#20703) | MIT | **Copy:** a data-driven registry. **Avoid:** exact-size-only matching |
| [Shots.so](https://shots.so) | Web SaaS | Yes | Layouts adapt to the media; export resolution is tiered | Visual polish benchmark | Paywall shift claimed by a rival; unverified | Proprietary | Polish reference only |
| [Rotato](https://rotato.app) | Mac app (3D, video) | Yes | 3D render, 8K export | Animation and App Store previews | PH: Android alignment off, Figma plugin slow | Proprietary | Different category |
| [Previewed](https://previewed.app) | Web SaaS | Unclear | Templates | 3D and video | Free tier is 720p with attribution; billing complaints on PH | Proprietary | The resolution-gated free tier is a story hook |
| [Mockup World](https://www.mockupworld.co) | PSD directory | Yes (even 18 Pro concepts) | Photoshop smart objects | Photoreal | Needs Photoshop; licences vary per asset | Varies | Not web |
| [AppLaunchpad](https://theapplaunchpad.com) | App Store screenshot SaaS | Templates | Store-size templates | 1000+ templates | PH: can't export without paying; output rejected by the App Store for size; buggy | Proprietary | Evidence for store-size confusion |

**What bezelkit already does better than all of them:**
- one element for every device
- real viewports (iframes lay out at true CSS px)
- `fit="auto"` mismatch detection with an edge-colour letterbox
- chrome drawn only for live content (avoids status-bar duplication)
- safe-area CSS variables
- no framework

**Gaps to close:**
- device freshness (item b-1)
- finish realism (items b-2 and b-3)
- a documented CSP story (Telephone's `nonce`)

---

## (d) User pain points (for the landing page's "problem" story)

**About the quotes.** The competitor sub-agent collected about 45 verbatim comments of under 15 words each, from GitHub issues, Stack Overflow, Hacker News and Product Hunt. Reddit blocks automated access, so there are none from there. I've written them below as **close paraphrases with the source link**, not verbatim quotes, to stay within my own rules on reproducing third-party text. Pull the exact wording from the links when you write the landing page (each one is short and in the first comment or the title). The one verbatim quote in this report is the Apple licence clause in §a.

**Ranked by how often they came up:**

1. **Outdated devices.** This is the most common issue title across every repo.
   - An issue says iPhone 16 and 17 had no frameit support for a year or more ([fastlane#29920](https://github.com/fastlane/fastlane/issues/29920)).
   - A user calls frameit bad and unmaintained for years ([fastlane#29653](https://github.com/fastlane/fastlane/issues/29653)).
   - A user asks whether the latest iPhones will ever be added ([react-device-frameset#6](https://github.com/zheeeng/react-device-frameset/issues/6)).
   - A user requests newer Galaxy and Pixel devices ([html5-device-mockups#53](https://github.com/pixelsign/html5-device-mockups/issues/53)).
2. **Fixed pixel sizes and broken scaling.**
   - A user calls the library useless without a responsive mode ([devices.css#7](https://github.com/picturepan2/devices.css/issues/7)).
   - A user says non-responsive frames are a dealbreaker ([marvel#21](https://github.com/marvelapp/devices.css/issues/21)).
   - A user reports that scaling down still occupies the original size ([react-device-frameset#20](https://github.com/zheeeng/react-device-frameset/issues/20)).
   - A user reports that only part of the frame scales ([#10](https://github.com/zheeeng/react-device-frameset/issues/10)).
   - A Stack Overflow asker can't find a sensible way to resize a CSS device ([SO 45554370](https://stackoverflow.com/questions/45554370/resizing-css-device)).
   - A user reports blurry screens after scaling down ([marvel#23](https://github.com/marvelapp/devices.css/issues/23)).
3. **Screenshot doesn't fit the screen: aspect ratio, squish, corners, cutouts.**
   - A commenter says one screenshot in a gallery is squished ([HN 12014472](https://news.ycombinator.com/item?id=12014472)).
   - A Stack Overflow asker needs an image fitted exactly inside a mockup ([SO 79358052](https://stackoverflow.com/questions/79358052/adding-image-inside-a-mobile-mockup)).
   - A user reports the iPad viewport is wrong ([marvel#13](https://github.com/marvelapp/devices.css/issues/13)).
   - A user reports square screenshot corners overlapping a rounded bezel ([fastlane#20703](https://github.com/fastlane/fastlane/issues/20703), [device-frame-generator#125](https://github.com/f2prateek/device-frame-generator/issues/125)).
   - A user asks to toggle off the hardware Dynamic Island ([RocketSim#1038](https://github.com/AvdLee/RocketSimApp/issues/1038)).
   - A user says frames aren't continuously rounded ([devices.css#16](https://github.com/picturepan2/devices.css/issues/16)).
4. **Status bar duplicated or wrong.**
   - A commenter complains the status bar differs on every screenshot: missing, white or black ([HN 12014472](https://news.ycombinator.com/item?id=12014472)).
   - A user asks to automatically hide icons already in the screenshot's status bar; the maintainer explains overlaying a pre-made image won't work ([device-frame-generator#63](https://github.com/f2prateek/device-frame-generator/issues/63)).
   - An App Review rejection asks for non-iOS status bars to be removed from screenshots ([daccord#291](https://github.com/DaccordProject/daccord/issues/291)).
5. **Live HTML breaks inside the frame, and framework lock-in.**
   - A user can't click a button inside the screen ([SO 49629140](https://stackoverflow.com/questions/49629140/html5-device-mockups-issue)).
   - A user reports nothing inside the wrapper is reachable ([html5-device-mockups#86](https://github.com/pixelsign/html5-device-mockups/issues/86)).
   - A user reports CSS errors in Next.js ([react-device-frameset#11](https://github.com/zheeeng/react-device-frameset/issues/11)).
   - A user asks whether it works with Angular ([html5-device-mockups#75](https://github.com/pixelsign/html5-device-mockups/issues/75)).
   - A user reports a Bootstrap conflict ([marvel#18](https://github.com/marvelapp/devices.css/issues/18)).

**Honourable mention: paywalls and App Store sizes.**
- A reviewer couldn't export at all without paying ([AppLaunchpad on PH](https://www.producthunt.com/products/applaunchpad/reviews)).
- A reviewer's App Store upload was rejected for size ([same page](https://www.producthunt.com/products/applaunchpad/reviews)).
- A reviewer was upgraded to a yearly plan unexpectedly ([Previewed on PH](https://www.producthunt.com/products/previewed/reviews)).
- A commenter refuses to watermark their App Store shots ([HN 6132353](https://news.ycombinator.com/item?id=6132353)).
- A commenter says App Store screenshots look low-resolution ([HN 25653345](https://news.ycombinator.com/item?id=25653345)).

**Story angle:** "Mockup libraries are frozen in 2017–2022, sized in fixed pixels, and they stretch, crop or double up your status bar. bezelkit is one tag, true viewports, auto-fit, always current." Pain points 1 and 2 are the loudest. Pain point 3 is exactly what `fit="auto"` addresses.

---

## (e) Squircle / continuous-corner recommendation

**What Apple's shape is.** It's not a superellipse. Figma's engineers found that a smoothing value of 0.6 closely matches iOS, and that true superellipses show a small systematic error against the real shape ([Figma blog](https://www.figma.com/blog/desperately-seeking-squircles/)). The widely circulated reverse-engineered UIKit continuous-corner path (PaintCode/Sketch coefficients, not Apple-published) has three parts per corner:
- a tangent run-out starting **1.5287·r** from the corner: cubic (1.5287, 0) → (0.6699, 0.0655), with controls (1.0885, 0) and (0.8684, 0)
- an arc of radius ≈r
- the mirrored run-out

**Numeric comparison (this review).** I computed the maximum distance from that Apple curve to candidate CSS shapes at r = 62 pt (the iPhone 17 Pro display):

| CSS | Max deviation from Apple's curve |
|---|---|
| `border-radius: r` (plain circle) | **0.78 pt** |
| `border-radius: 1.05r` | 1.28 pt |
| `corner-shape: squircle` (= `superellipse(2)`) + `border-radius: r` | **11.7 pt** (far too square) |
| `corner-shape: squircle` + `border-radius: 1.8r` | 1.07 pt |
| `corner-shape: superellipse(1.7)` + `border-radius: 1.5r` | 0.91 pt |
| SVG / `clip-path: path()` with the Apple coefficients | exact, by construction |

**Takeaways:**
1. In *position*, a plain circle at the correct nominal radius is already the best cheap approximation. The difference is curvature continuity, which shows up only in highlights and reflections, and only at 3× export sizes (0.78 pt is about 2.3 px on a 1206 × 2622 export; it's sub-pixel at embed sizes).
2. Naively adding `corner-shape: squircle` makes the corners visibly *wrong*. If it's used at all, multiply the radius by ≈1.8.
3. The radius value matters more than the shape. The Pixel is off by 11 dp (b-4); that's 14× the squircle error.

**Browser support (September 2026).**

| Feature | Support | Source |
|---|---|---|
| `corner-shape` | Chrome and Edge **139+** only; Firefox and Safari at "preview" (not shipped); experimental; not Baseline; ≈65–71% of global users | [MDN BCD raw data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/corner-shape.json), [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/corner-shape), [squircle.js survey](https://squircle.js.org/blog/squircles-in-css) |
| `clip-path: path()` | Chrome 88, Firefox 72, Safari 13.1, so **Baseline widely available** | MDN BCD |
| `clip-path: shape()` | Chrome 135, Firefox 148, Safari 18.4, so newly Baseline in 2026 | MDN BCD |

Also relevant: `corner-shape` clips `overflow`, `box-shadow`, `border` and `backdrop-filter` to the shape. `clip-path` also clips, but shadows are clipped away, so shadows need `filter: drop-shadow()` on a parent.

**Recommendation for bezelkit:**
- **Default (now):** keep `border-radius` and fix the radius values. It's zero-risk and within 1 pt of Apple.
- **Opt-in exactness** (`corners="continuous"`, or on by default for Apple devices once tested): bezelkit renders the device at native CSS px inside a `scale()`d stage, so absolute-px `clip-path: path()` is fully viable. Generate one path per rect in JS and apply it to `.screen` (content clip), `.glass` and `.body`. Keep the body's drop shadow on an unclipped sibling (`filter: drop-shadow` on `.frame`), because `clip-path` removes `box-shadow`. It works in every evergreen browser. Sketch:

```js
// Continuous (Apple-style) rounded rect, UIKit reverse-engineered coefficients. r = nominal corner radius.
function continuousRect(w, h, r) {
  r = Math.min(r, Math.min(w, h) / 2 / 1.5287);           // UIKit clamps the run-out to half the side
  const k = (a) => a * r;
  const c = (x0, y0, sx, sy) => {                          // one corner; (x0,y0) = corner point, (sx,sy) = inward signs
    const P = (u, v) => `${x0 + sx * k(u)} ${y0 + sy * k(v)}`;
    return `L${P(1.52866, 0)} C${P(1.08849, 0)} ${P(0.86841, 0)} ${P(0.66993, 0.06550)} ` +
           `A${r} ${r} 0 0 ${sx * sy > 0 ? 0 : 1} ${P(0.06550, 0.66993)} ` +
           `C${P(0, 0.86841)} ${P(0, 1.08849)} ${P(0, 1.52866)}`;
  };
  // walk: top-right, bottom-right, bottom-left, top-left (swap u/v per corner as needed when implementing)
  return `M${k(1.52866)} 0 ${c(w, 0, -1, 1)} ${c(w, h, -1, -1)} ${c(0, h, 1, -1)} ${c(0, 0, 1, 1)} Z`;
}
```

This is a sketch: the per-corner u/v axis swap and the arc sweep flags need a unit test against the reference curve.

- **Progressive enhancement:** use `@supports (corner-shape: squircle) { … corner-shape: superellipse(1.7); border-radius: calc(1.5 * r) }` only if a path-free route is wanted for simple elements such as the island or buttons. Don't use it for the screen or body, because the fallback would jump from correct to wrong radius.

---

## Appendix: method and reproducibility

- **Server:** `python -m http.server 8843`, run from the repo root (background, stopped at the end).
- **Close-ups:**

  ```
  node C:\Users\knile\AppData\Local\Temp\bz-shoot.mjs "http://localhost:8843/review/_scratch/closeup.html?d=<id>&w=1100&h=2400" z-<id> 1160 640 "wait:800" "shot:top" "eval:window.scrollTo(0,1900)" "wait:400" "shot:bottom"
  ```
- **Gallery:** `index.html#devices` and `examples/states.html` at 1440 × 900.
- **AOSP skins:** fetched with `curl ".../device-art-resources/<device>/<file>?format=TEXT" | base64 -d` into `review/_scratch/aosp/`.
  - Rim and bezel bands: measured by classifying luminance along the mid-row and mid-column of `back.webp`.
  - Corner radius: fitted from `mask.webp` as R = (x+k) + √(2xk) over 13–15 samples (constant ±1.5 px, so a true circle).
  - Hole-punch: bounding box of opaque pixels near the top centre of the screen.
- **Squircle numbers:** Python, sampling Apple's reverse-engineered curve against superellipse, circle and straight-edge point sets. Maximum nearest-point distance, scaled to r = 62.
- **Apple licence text:** extracted from the ADR licence PDF (13.7k chars, §1–§10). Marketing-guideline wording is from developer.apple.com/app-store/marketing/guidelines ("Unauthorized Uses").
- **Not done:**
  - Apple bezel PNGs were **not downloaded**, per their licence gate. Compare by eye in a browser.
  - Samsung skins were not downloaded.
  - Reddit is unreachable by automation.
