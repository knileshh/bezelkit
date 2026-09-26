# bezelkit hardware-spec review: Macs, desktops, browsers

Reviewed 2026-09-26 against `src/devices.js` / `src/bezel.js`. Nothing in `src/` or `index.html` was edited.
Machine-readable changes: `review/macs-desktops-browsers.json`. Side-by-side renders (current on the left, proposed on the right): `review/macs-render/*.png`. They come from `review/macs-render/compare.html`, which imports the live `src/bezel.js` and applies the JSON on top, so it will show whatever the other agents have in `src/` at the time it is loaded.

## Method: converting mm to points

Every size is in CSS px (points). For a laptop or display, the conversion is

    pt/mm = looks-like width (pt) / active-area width (mm)
    active-area width (mm) = native px / ppi × 25.4

| Device | Native / ppi | Active W × H (mm) | Default looks-like | pt/mm | Body W (mm) | Border per side = (bodyW − activeW)/2 |
|---|---|---|---|---|---|---|
| MBP 14 | 3024×1964 @254 | 302.4 × 196.4 (at 254 ppi, 1 px = 0.1 mm) | 1512×982 | **5.00** | 312.6 | 5.10 mm → **25.5 pt** |
| MBP 16 | 3456×2234 @254 | 345.6 × 223.4 | 1728×1117 | **5.00** | 355.7 | 5.05 mm → **25.3 pt** |
| Air 13 | 2560×1664 @224 | 290.3 × 188.7 | 1470×956 | **5.06** | 304.1 | 6.9 mm → **34.9 pt** |
| Air 15 | 2880×1864 @224 | 326.6 × 211.4 | 1710×1107 | **5.24** | 340.4 | 6.9 mm → **36.2 pt** |
| iMac 24 | 4480×2520 @218 | 522.0 × 293.6 | 2240×1260 | **4.29** | 547 | 12.5 mm → **53.6 pt** |
| Studio Display | 5120×2880 @218 | 596.5 × 335.6 | 2560×1440 | **4.29** | 623 | 13.25 mm → **56.9 pt** |
| Generic 15.6″ | 1920×1080 @141 | 344.2 × 193.6 | 1536×864 (125 %) | **4.46** | ~358 (typical) | ~7 mm → **~31 pt** |

Each diagonal checks out against Apple's stated size: 3606 px/254 = 14.2″, 4115/254 = 16.2″, 3053/224 = 13.6″, 3431/224 = 15.3″.

The renderer draws one side's border as `bezel + rim`, so the per-side border in the last column is the target for `bezel + rim`.

## Notch and menu-bar model (applies to all notched Macs)

- The camera band above the 16:10 area is 74 px on the 254-ppi Pros (1964 − 1890 and 2234 − 2160) and 64 px on the 224-ppi Airs. At the default resolution that band is the menu bar: 37 pt on MBP 14 (982 − 945), MBP 16 and Air 13 (956 − 918.75), and 38 pt on Air 15 (64 px × 1710/2880). The Air 13 mode pairs (1470×956 "wraps notch" and 1470×918 "below notch") come from the d.foundation memo.
- `node-mac-notch` prints real `NSScreen` output: `safeAreaInsets.top = 38`, `auxiliaryTopLeftArea = {x 0, w 790}` and `auxiliaryTopRightArea = {x 1010, w 790}` on an 1800×1169 screen. That size is the 14″ MBP "More Space" mode; it is not a 16″ mode, and notchbay mislabels it as the 16″. So the notch is 220 × 38 pt at 5.952 pt/mm, which is **37.0 × 6.4 mm**. At 1512×982 that becomes **185 × 32 pt**, which agrees with a GitHub PR author who measured 185 pt on a 14″ and with notchbay's 185 × 32. The camera housing is therefore about 6.4 mm tall inside a 7.4 mm band, so `cutout.h 32` with `safe.top 37` is correct on the 14″.
- I assumed the other notched models use the same physical housing (same camera module; one report gives `safeAreaInsets.top` 32 on an Air and another gives 34, which matches the Air 15 figure below). Scaled by each model's pt/mm:
  - MBP 16: 185 × 32
  - Air 13: 187 × 32
  - Air 15: 194 × 34 (33.5)
- Notch corner radii are roughly 4 pt at the top and 8 pt at the bottom (notchbay, low confidence). The renderer already uses `ear 4` and `r 8`.

## Device tables

Confidence levels: **H** means taken directly from a primary source or exact arithmetic on one. **M** means derived with one assumption. **L** means an estimate or a mockup convention; treat it as a design choice.

### macbook-pro-14

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen w×h | 1512×982 | keep | Apple specs 3024×1964 native; default is exactly 2× | H |
| screen.radius | 10 | keep (unverified) | no primary source found. Apple only says "rounded corners at the top", which the renderer already does | L |
| year | 2024 | 2026 | M5 Pro/Max 14″, "Year introduced: 2026" (support 126318); base M5 Oct 2025 (support 125405) | H |
| bezel | {14,14,18,14} | {t19, r19, b37, l19} | Apple's 3.5 mm borders ≈ 17.5 pt black. Side total must be 25.5 pt (table above), so bezel 19 + rim 6 | H (sides/top), L (bottom) |
| rim | 3 | 6 | the aluminium lid wall accounts for the rest of the 5.1 mm (≈1.2–1.6 mm) | M |
| lidRadius | 22 | 35 | chosen as screen r + bezel + rim so the corners are concentric; not measured | L |
| cutout | mac-notch 186×32 | mac-notch 185×32 | NSScreen derivation above | M-H |
| safe.top | 37 | keep | 982 − 945 | H |
| base | {110, 22} | keep | stylised; a real front edge is 15.5 mm ≈ 77 pt, and every mockup thins it | L |
| colors | Space Black, Silver | keep | Apple specs | H |

**Bottom bezel.** Depth minus active height is 24.8 mm. Taking 5.1 mm off for the top leaves about 19.7 mm for the chin plus the hinge region, and part of that is hidden behind the base when the lid is open. I estimated 7–10 mm visible and used 8.5 mm, which gives 42.5 pt total, so bezel.b is 37 with rim 6. This is the least certain number in the report. If someone can measure Apple's official product-bezel PNG (developer.apple.com/design/resources), use that instead.

### macbook-pro-16

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen | 1728×1117 | keep | 3456×2234 / 2 | H |
| year | 2024 | 2026 | M5 Pro/Max 16″ (apple.com/macbook-pro/specs) | H |
| bezel / rim | {14,14,18,14} / 3 | {19,19,37,19} / 6 | 5.05 mm per side = 25.3 pt | H sides, L bottom |
| lidRadius | 22 | 35 | concentric rule | L |
| cutout | 190×32 | 185×32 | same housing and same 5.0 pt/mm as the 14″, so the same pt size. The 16″ notch is not wider in points. | M |
| safe.top | 37 | keep | 1117 − 1080 | H |
| base | {120, 24} | keep | 16.8/15.5 × 22 ≈ 24, consistent with the 14″ | L |

### macbook-air-13

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen | 1470×956 | keep | the default is confirmed as 1470×956; the mode pairs 1470×956 / 1470×918 appear in the displayplacer list (d.foundation) | H |
| year | 2025 | 2026 | M5 Air (apple.com/macbook-air/specs; support 126321 says 2026 for the 15″) | H |
| bezel / rim | {14,16,20,16} / 3 | {29,29,37,29} / 6 | 304.1 − 290.3 = 13.8 mm, so 6.9 mm per side = 34.9 pt. The current frame is **about 45 % too thin** at the sides. | H sides, L bottom |
| lidRadius | 20 | 45 | concentric rule | L |
| cutout | 186×32 | 187×32 | same housing × 5.06 pt/mm | M |
| safe.top | 37 | keep | 956 − 918.75 | H |
| base | {100, 18} | {100, 16} | the Air is 11.3 mm thick against 15.5 mm for the MBP; scaled from the MBP's 22 gives 16 | L |
| colors | Sky Blue, Midnight, Starlight, Silver | keep | Apple specs (the hexes are eyeballed; Apple publishes none) | H names / L hex |

### macbook-air-15

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen | 1710×1107 | keep | the default 1710×1107 is confirmed (MacRumors thread "Why the default resolution for the MacBook Air 15 2023 is 1710x1107"). notchbay's "1710×1112" is wrong; that is a 13″ mode. | H |
| year | 2025 | 2026 | support 126321 | H |
| bezel / rim | {14,16,20,16} / 3 | {30,30,38,30} / 6 | 340.4 − 326.6 = 13.8 mm, so 6.9 mm per side = 36.2 pt | H sides, L bottom |
| lidRadius | 20 | 46 | concentric rule | L |
| cutout | 190×32 | 194×34 | 37 × 6.4 mm × 5.24 pt/mm | M |
| safe.top | 37 | **38** | 64 px band × 1710/2880 = 38.0 | M-H |
| base | {115, 19} | {115, 16} | 11.5 mm thick | L |

### laptop (generic Windows 15.6″ 1080p @125 %)

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen | 1536×864, r0, dpr 1.25 | keep | 1920/1.25 | H |
| bezel / rim | {20,12,30,12} / 2 | {34,26,58,26} / 4 | A 15.6″ panel is 344.2 mm wide. Mainstream 15.6″ bodies (IdeaPad/Inspiron/Aspire/HP 15 class) are about 358–360 mm wide, which gives about 7 mm per side ≈ 30 pt. The top needs room for the webcam (≈8.5 mm = 38 pt). A visible chin of ≈14 mm is 62 pt. The current 14 pt per side (3 mm) matches a premium XPS-class machine, not a "typical" one. | M sides, L top/bottom |
| base | {90, 18} | {90, 24} | typical thickness is 18–20 mm, thicker than the MBP's 15.5 mm, so it should not draw thinner than the MBP (22) | L |
| lidRadius / colors / camera | 10 / Graphite, Silver / d6 | keep | — | L |

If you would rather the generic laptop keep a modern thin-bezel look, use {t 26, r 18, b 44, l 18}. The proposal above is the "typical budget 15.6″" look.

### imac-24

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen | 2240×1260 | keep | 4480×2520 / 2 (apple.com/imac/specs, still M4 as of today) | H |
| year | 2024 | keep | M4, no M5 iMac yet | H |
| bezel / rim | 34 / 0 | 52 / 2 | 547 − 522 = 25 mm, so 12.5 mm per side = 53.6 pt. The current bezel is about 37 % too thin. rim 2 draws the thin coloured aluminium edge. | H total, L split |
| chin | 180 | **240** | The body without the stand is about 375 mm (user measurement of 14.76″; a ratio estimate gives 37.4 cm). 375 − 293.6 − 2 × 12.5 ≈ 56 mm ≈ 240 pt. | L-M |
| stand.w | 460 | **558** | Apple support 121557: "Stand width: 5.1 inches (13 cm)", stand depth 14.7 cm. 130 mm × 4.29 = 558. | H |
| stand.h | 360 | keep | 461 mm total − ~375 mm body ≈ 86 mm visible ≈ 369 pt, and the renderer's `sh + 16 foot` = 376. Close enough. | M |
| bezel colour (front) | #f3f3f1 | keep | the white/off-white front border is correct for every colour | M |
| colors | Blue, Green, Pink, Silver, Yellow, Orange, Purple | reorder to Apple's list: Blue, Purple, Pink, Orange, Yellow, Green, Silver (hexes unchanged, Blue still the default) | support 121557 | H names / L hex |

Apple publishes no hex values. The current hexes are plausible front/chin pastels, so treat them as eyeballed.

**Renderer note (out of scope, for the `bezel.js` owner).** `buildDesktop` draws the foot at `sw * 1.12`. Apple's iMac and Studio Display stands are one bent sheet, so the neck and foot are the same width. A multiplier of 1.0 would match. As things stand, stand.w 558 makes the foot 625 pt (146 mm).

### studio-display

| field | current | proposed | source | conf |
|---|---|---|---|---|
| screen | 2560×1440 | keep | 5120×2880 @218 | H |
| year | 2022 | 2026 | 2nd-gen Studio Display (12MP Center Stage, Desk View), shipped 11 Mar 2026. Same 623 × 478 mm body, so same geometry. | H |
| bezel / rim | 36 / 6 | 51 / 6 | 623 − 596.5 = 26.5 mm, so 13.25 mm per side = 56.9 pt. The VESA height of 362 mm gives (362 − 335.6)/2 = 13.2 mm, which confirms an even border. | H |
| stand.h | 420 | **482** | 478 mm (with stand) − 362 mm (VESA body) = 116 mm below the display = 498 pt, minus the renderer's 16 pt foot | H-M |
| stand.w | 520 | 650 | Apple gives no official width. The forum estimate is about 6″ ≈ 152 mm, and the same 24 % of body width as the iMac gives the same answer. | L |
| colors | Silver #cfd1d3 | keep | — | M |

### browser-chrome

| field | current | proposed | source | conf |
|---|---|---|---|---|
| bar | 44 | **46** | Chromium `layout_constants.cc` (main, non-touch): `kLocationBarHeight 34`, `TOOLBAR_INTERIOR_MARGIN` vertical 6, so the toolbar row is 34 + 2 × 6 = 46 | H |

Notes for the renderer (not registry fields):
- The real Chrome window also has a tab strip. `kTabHeight` is 34 + 1 overlap, plus `kTabStripPadding` 6, so the strip is 41 and the top chrome totals about 86 px at 100 % zoom (+34 with the bookmarks bar, `kBookmarkBarHeight` = 28 + 6). `buildBrowser` draws one row with no tabs, so 46 is the honest value for what it draws. If a tab strip is added later, use `bar ≈ 86`.
- The omnibox pill is hard-coded at 30 px tall with radius 15. Chrome's is 34 tall, fully rounded.
- In the light theme, Chrome's toolbar is white and the omnibox is the grey field. The current colours are the other way round (grey bar `#f1f3f4`, white pill). This is cosmetic and low priority.

### browser-safari

| field | current | proposed | source | conf |
|---|---|---|---|---|
| bar | 52 | keep | 52 pt is the macOS unified (title+toolbar) height (`NSWindow.ToolbarStyle.unified`, WWDC20 "Adopt the new look of macOS"), which is Safari's "Separate" layout with one tab and the tab bar hidden. That matches what `buildBrowser` draws (one centred field). Safari's "Compact" layout uses the `unifiedCompact` height of ≈38 pt. | M (from memory of the WWDC20 figures; macOS 26 Liquid Glass heights not re-verified) |

## Missing devices (released by 2026-09-26)

Existing entries should be updated in place rather than duplicated. MBP 14/16 M5 (Oct 2025 and 2026) and MacBook Air M5 (2026) keep the same chassis, so the only change is `year`. There is no M5 iMac as of today (apple.com/imac/specs still lists M4).

1. **macbook-neo** (A18 Pro, released 11 Mar 2026). 13.0″, 2408×1506 @219 ppi, 297.5 × 206.4 × 12.7 mm. Colours: Silver, Blush, Citrus, Indigo. **No notch**: the camera sits in an even black bezel and the top corners are rounded.
   - Default "looks like": **unverified**. Apple's specs do not list scaled resolutions. I used 1204×753 (2×) as a placeholder. Apple usually defaults to about 127 pt/in, which would be roughly 1400 pt wide on this panel, so check on hardware.
   - Border: (297.5 − 279.3)/2 = 9.1 mm per side × 4.31 pt/mm ≈ 39 pt, split as bezel 33 + rim 6.
   - Colour hexes are approximations only.
2. **studio-display-xdr** (27″ 5K mini-LED, 120 Hz, shipped 11 Mar 2026). It has the same 623 mm × 362 mm body as the Studio Display. It includes the tilt- and height-adjustable stand, and its lowest height is the same 478 mm, so the geometry is identical to the proposed `studio-display`. It is visually indistinguishable from the front (the only difference is the rear vents).
3. New Studio Display (2026): no separate entry is needed. Bump `studio-display.year` instead.

## Visual notes (renders in `review/macs-render/`)

- `mbp14.png`: the proposed MBP has visibly thicker, more realistic side and top borders and a chin about twice the side border, closer to the real product. The current frame reads like a phone-thin bezel.
- `mbp14.png` (Air 15 row) and `new.png` (Air 13 row): the Air borders are now clearly thicker than the Pro's, which matches the real difference (6.9 mm against 5.1 mm).
- `desk.png`: the iMac with bezel 52 and chin 240 has the characteristic tall chin (about 15 % of body height) and a wider stand. The Studio Display border is now noticeably heavier and matches the real 13 mm border.
- `laptop.png`: the generic laptop now reads as a mainstream 15.6″ rather than a premium ultrabook. The Chrome bar at 46 is a negligible visual change.
- `new.png`: the MacBook Neo renders correctly with the `camera` cutout and no notch.

## Sources

- https://www.apple.com/macbook-pro/specs/ and https://support.apple.com/en-us/126318 : MBP M5 Pro/Max, dimensions, 2026, rounded top corners
- https://support.apple.com/en-us/125405 : MBP 14 M5
- https://www.apple.com/macbook-air/specs/ and https://support.apple.com/en-us/126321 : Air M5, 2026
- https://forums.macrumors.com/threads/why-the-default-resolution-for-the-macbook-air-15-2023-is-1710x1107.2392843/ : Air 15 default
- https://memo.d.foundation/macbook-notch-macos-27 : Air 13 wraps/below-notch mode pairs
- https://github.com/codebytere/node-mac-notch : NSScreen safeAreaInsets and auxiliary areas output (1800×1169)
- https://github.com/netanel3000fine/RememberMyWindow/pull/22 : notch is 185 pt on a 14″ MBP
- https://notchbay.com/blog/macbook-notch-size/ : 185×32 pt (its 16″ and Air 15 rows are wrong; used only for corroboration)
- https://www.pocket-lint.com/laptops/news/apple/148466-14-inch-macbook-pro-release-date-rumours-features-price/ : 3.5 mm bezels
- https://www.apple.com/imac/specs/ and https://support.apple.com/en-us/121557 : iMac M4, stand width 13 cm, depth 14.7 cm, colours
- https://www.apple.com/studio-display/specs/ and https://www.apple.com/studio-display-xdr/specs/ : 623 / 478 / 362 mm
- https://www.apple.com/newsroom/2026/03/apple-unveils-new-studio-display-and-all-new-studio-display-xdr/
- https://www.apple.com/macbook-neo/specs/ , https://support.apple.com/en-us/126322 , https://en.wikipedia.org/wiki/MacBook_Neo
- https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/ui/layout_constants.cc : Chrome toolbar and tab constants
- https://forums.macrumors.com/threads/need-help-apple-studio-tilt-stand-dimensions.2364305/ (via search summary): Studio Display stand width estimate of about 6″
