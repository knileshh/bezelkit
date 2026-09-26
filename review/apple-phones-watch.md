# Apple phones and watches: spec review

Scope: `iphone-17-pro-max`, `iphone-17-pro`, `iphone-air`, `iphone-17`, `iphone-16e`, `iphone-se`,
`apple-watch-ultra`, `apple-watch-series-11`. Review date: 2026-09-26. Machine-readable patch:
`review/apple-phones-watch.json`.

## TL;DR

- **Screens, DPRs and display corner radii are right.** 62 pt for the whole 17 family and Air, 47.33 for 16e,
  0 for SE, and 50 for the Series 11 46mm. The one exception is the **Ultra**: its radius should be 54, not 44,
  and the display the entry uses (205×251) is the Ultra 1/2 display, which is no longer current.
- **Every phone body is too small.** Apple's drawings put the housing edge 2.44–2.64 mm (≈15–16 pt) outside
  the active area on the 17 family, and 3.47 mm (≈21 pt) on 16e. The registry uses bezel+rim = 13 (17 family)
  and 16 (16e).
- **Every button position is off.** Most buttons are 10–45 pt too high and too short. The worst case is the
  **Camera Control**, drawn 55–60 pt long when the real one is ≈103 pt long and sits ≈25–65 pt lower.
- **Dynamic Island top offset** should be 14 on 17 / 17 Pro / 17 Pro Max, not 11. On **iPhone Air** it should
  be 20, and Air's **safe-area top is 68, not 62**.
- **Watches:** both bodies are too small (Series 11: 242×282 → 255×295). Ultra's Action button is placed and
  sized badly (80/45 → 138/92).
- **Released since the registry was written:** iPhone 18 Pro, 18 Pro Max, 17e, iPhone Duo (foldable),
  Apple Watch Series 12 and Ultra 4 (Ultra 3 shipped in 2025). Full entries are in `_new_devices` for everything
  except the Duo; see "Missing devices".

Total: **53 field-level corrections** across the 8 devices (each button counted separately), plus 4 new entries
and 1 draft.

## Method and sources

Primary sources:

- **Apple Tech Specs** (support.apple.com): 125091 (17 Pro Max), 125090 (17 Pro), 125092 (Air), 125089 (17),
  122208 (16e), 111866 (SE 3), 125093 (Watch S11), 125095 (Ultra 3), 148590 (18 Pro), 148591 (18 Pro Max),
  126470 (17e), 148589 (Watch S12). Also apple.com/apple-watch-ultra-4/specs/ and apple.com/iphone-duo/specs/.
- **Apple Accessory Design Guidelines.** The ADG PDF (§1.1) points to the dimensional drawings at
  https://developer.apple.com/accessories/dimensional-drawings/, and every mm figure below is read from those PDFs:
  `.../dimensional-drawings/iphone-17-pro.pdf`, `iphone-17-pro-max.pdf`, `iphone-air.pdf`, `iphone-17.pdf`,
  `iphone-16e.pdf`, `iphone-17e.pdf`, `iphone-se-3rd-generation.pdf`, `iphone-18-pro.pdf`,
  `iphone-18-pro-max.pdf`, `apple-watch-series-11-46mm.pdf`, `apple-watch-series-12-46mm.pdf`,
  `apple-watch-ultra-3.pdf`, `apple-watch-ultra-4.pdf` (prefix `https://developer.apple.com/download/files/accessories`).
  There is no drawing for iPhone Duo yet.
- **Display corner radius** (`UIScreen._displayCornerRadius`): https://github.com/kylebshr/ScreenCorners (README table).

Secondary sources:

- **Safe areas:** https://useyourloaf.com/blog/iphone-17-screen-sizes/ (iOS 26), and https://safearea.info/
  (Xcode 27.1 simulator measurements, iOS 27). safearea.info also supplies watch and 18 Pro corner radii.

**Scale.** points/mm = screen.w / active-area width. This gives 6.0388 on every 460-ppi phone
(402/66.57, 440/72.86, 420/69.55, 390/64.58). That matches 460 ppi ÷ 25.4 ÷ 3 = 6.037. On SE and watches it
gives 6.410 (375/58.50, 208/32.45, 211/32.92), matching 326 ÷ 25.4 ÷ 2 = 6.417. Every mm value is multiplied by
this k.

**Bezel vs rim.** The drawings give three nested outlines: product (housing), cover glass, and display active
area. rim = (product − glass)/2 is the metal visible from the front. bezel = (glass − active)/2 is the black
glass. The renderer's body is `screen + bezel·2 + rim·2`, so it matches the product size by construction.

**Buttons.** Drawings dimension each button's centre from the product's top edge, plus a half-length ("2X").
The renderer's `at` is measured from the body top edge, so `at = (centre − half)·k` and `len = 2·half·k`.

**Visual check.** `review/apple-phones-watch-test.html` loads the registry and this JSON, and renders
current next to proposed. The screenshots are `review/apple-phones-watch-phones.png`, `-phones2.png` and
`-watches.png`. I also overlaid each Apple front-view drawing (scaled to the proposed body size) on the rendered
frame; those overlays stayed in a temp folder because the drawings are Apple-proprietary. In the overlays, the
proposed 17 Pro, Air, 16e, SE, Series 11 and Ultra all line up with the drawing outlines: housing, active area,
island or notch, and the button bumps. The current frames are visibly undersized and their buttons sit too high.

**Body corner radius.** The drawings' "corner profile" point tables give the 45° point of the housing corner.
For 17 Pro and Pro Max it is 3.80 mm; for Air, 3.78 mm. A circle through the same 45° point has radius
R = d/(1−1/√2) ≈ 12.9–13.0 mm, or ≈78 pt. The renderer's default, `radius + max(bezel) + rim` with the proposed
bezel and rim, gives 78 / 77.5 / 77.5 / 76.75 / 68. That is within 1 pt of these estimates, so **no phone except
SE needs an explicit `bodyRadius`**.

---

## iphone-17-pro-max

Derived: k = 6.039. Body 77.98 × 163.43 mm → 470.9 × 986.9 pt; depth 8.75 mm. Glass 75.58 × 161.03; active
72.86 × 158.31. So rim = 1.20 mm = 7.25 pt and bezel = 1.36 mm = 8.21 pt; the housing-to-active border is
2.56 mm = 15.46 pt. Proposed: 440 + 2·8.5 + 2·7 = **471** and 956 + 17 + 14 = **987**. Currently 466 × 982.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 440×956 r62 | unchanged | support.apple.com/en-us/125091 (2868×1320 @460 ppi, 3x); ScreenCorners (62) | high |
| dpr | 3 | unchanged | same | high |
| bezel | 8 | **8.5** | dimensional-drawings/iphone-17-pro-max.pdf (glass 75.58 vs active 72.86) | high |
| rim | 5 | **7** | same (product 77.98 vs glass 75.58) | high (total), med (split) |
| cutout | island 125×37 top 11 | island 125×37 **top 14** | drawing: island 20.76 × 6.07 mm, centre 7.91 mm from top; (7.91 − 3.035 − 2.56)·k = 13.98 | high |
| safe | 62/34 | unchanged; landscape L/R 62, bottom 20 | useyourloaf; safearea.info | high |
| Action (L) | at 175 len 34 | **at 186 len 42** | drawing: centre 34.28, half 3.45 | high |
| Vol + (L) | 245 / 64 | **259 / 68** | centre 48.43, half 5.60 | high |
| Vol − (L) | 325 / 64 | **344 / 68** | centre 62.63, half 5.60 | high |
| Side (R) | 280 / 100 | **282 / 107** | centre 55.53, half 8.85 | high |
| Camera Control (R, flush) | 560 / 60 | **624 / 103** | centre 111.82, half 8.55, protrusion 0.00 | high |
| colors | Cosmic Orange, Deep Blue, Silver | names OK; hexes are reasonable approximations | 125091 finishes: Silver, Cosmic Orange, Deep Blue | names high, hex med |

## iphone-17-pro

Derived: k = 6.0388. Body 71.85 × 150.01 × 8.75 mm → 433.9 × 905.9 pt. Glass 69.45 × 147.61; active
66.57 × 144.73. rim 1.20 mm = 7.25 pt; bezel 1.44 mm = 8.70 pt; border 2.64 mm = 15.94 pt. Proposed body
402 + 18 + 14 = **434** × **906**. Currently 428 × 900.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 402×874 r62 | unchanged | support.apple.com/en-us/125090; ScreenCorners | high |
| bezel | 8 | **9** | dimensional-drawings/iphone-17-pro.pdf | high |
| rim | 5 | **7** | same | high (total), med (split) |
| cutout | top 11 | **top 14** (w 125, h 37 unchanged) | drawing: island 20.76 × 6.07 mm, centre 7.99; (7.99 − 3.035 − 2.64)·k = 13.98 | high |
| safe | 62/34 | unchanged | useyourloaf; safearea.info | high |
| Action | 160 / 32 | **186 / 42** | centre 34.28, half 3.45 | high |
| Vol + | 225 / 60 | **259 / 68** | 48.43 / 5.60 | high |
| Vol − | 300 / 60 | **344 / 68** | 62.63 / 5.60 | high |
| Side | 255 / 95 | **282 / 107** | 55.53 / 8.85 | high |
| Camera Control | 515 / 55 | **543 / 103** | 98.40 / 8.55 (sapphire face is 17.5 × 3.4 mm, sheet 2) | high |
| colors | Deep Blue, Cosmic Orange, Silver | OK | 125090 | names high, hex med |

## iphone-air

Derived: k = 6.0387. Body 74.70 × 156.18 × 5.64 mm → 451.1 × 943.1 pt. Glass 72.42 × 153.90; active
69.55 × 151.03. rim 1.14 mm = 6.9 pt; bezel 1.435 mm = 8.7 pt. Proposed body 420 + 17 + 14 = **451** ×
**943**. Currently 444 × 936.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 420×912 r62 | unchanged | support.apple.com/en-us/125092 (2736×1260); ScreenCorners | high |
| bezel / rim | 8 / 4 | **8.5 / 7** | dimensional-drawings/iphone-air.pdf | high (total) |
| cutout | top 11 | **top 20** | island 20.76 × 6.07 mm, centre 8.92; (8.92 − 3.035 − 2.58)·k = 19.96 | high |
| safe.top | 62 | **68** | useyourloaf ("top safe area inset of 68 points"); safearea.info (68). Cross-check: island bottom 20 + 37 = 57, and Apple adds ≈11 on every other model (14 + 37 + 11 = 62) | high |
| safe.bottom | 34 | unchanged | same | high |
| Action | 165 / 32 | **185 / 42** | 34.08 / 3.45 | high |
| Vol + | 230 / 60 | **257 / 68** | 48.23 / 5.60 | high |
| Vol − | 305 / 60 | **343 / 68** | 62.43 / 5.60 | high |
| Side | 265 / 95 | **280 / 108** | 55.33 / 8.90 | high |
| Camera Control | 530 / 55 | **581 / 103** | 104.77 / 8.55 | high |
| colors | Sky Blue, Light Gold, Cloud White, Space Black | OK (Apple lists Space Black first) | 125092 | high / med |

## iphone-17

Derived: k = 6.0388 (from width). Body 71.45 × 149.61 × 7.95 mm → 431.5 × 903.4 pt. Glass 69.45 × 147.61;
active 66.57 × 144.79. rim 1.00 mm = 6.0 pt; bezel 8.5–8.7 pt. Proposed **431.5 × 903.5**; currently
430 × 902. The drawing has a small internal inconsistency: 144.79 + 2 × 2.44 ≠ 149.61 (off by 0.06 mm,
about 0.4 pt). It doesn't matter at this precision.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 402×874 r62 | unchanged | support.apple.com/en-us/125089; ScreenCorners | high |
| bezel / rim | 9 / 5 | **8.75 / 6** | dimensional-drawings/iphone-17.pdf | high (total), med (split) |
| cutout | top 11 | **top 14** | island 20.74 × 6.07, centre 7.79; (7.79 − 3.035 − 2.44)·k = 13.98 | high |
| safe | 62/34 | unchanged | useyourloaf; safearea.info | high |
| Action | 160 / 32 | **185 / 42** | 34.08 / 3.45 | high |
| Vol + | 225 / 60 | **257 / 68** | 48.23 / 5.60 | high |
| Vol − | 300 / 60 | **343 / 68** | 62.43 / 5.60 | high |
| Side | 255 / 95 | **281 / 107** | 55.32 / 8.85 | high |
| Camera Control | 515 / 55 | **541 / 103** | 98.20 / 8.55 | high |
| colors | Lavender, Sage, Mist Blue, White, Black | OK | 125089 | high / med |

## iphone-16e

Derived: k = 6.0388. Body 71.52 × 146.71 × 7.80 mm → 431.9 × 885.9 pt. Glass 69.42 × 144.61; active
64.58 × 139.77. rim 1.05 mm = 6.3 pt; bezel 2.42 mm = 14.6 pt. Proposed **432 × 886**; currently 422 × 876,
so bezels are 5 pt too thin per side.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 390×844 r47 | radius **47.33** (cosmetic) | 122208 (2532×1170); ScreenCorners (47.33) | high |
| bezel / rim | 11 / 5 | **15 / 6** | dimensional-drawings/iphone-16e.pdf | high |
| cutout | notch 162×33 | notch 162×**34** | "active area cutout" 26.79 × 5.58 mm → 161.8 × 33.7 | high |
| safe | 47/34 | unchanged (landscape 47/47, bottom 20) | safearea.info | high |
| Action | 145 / 28 | **166 / 46** | 31.28 / 3.77 | high |
| Vol + | 205 / 56 | **239 / 72** | 45.43 / 5.92 | high |
| Vol − | 275 / 56 | **324 / 72** | 59.63 / 5.92 | high |
| Side | 245 / 90 | **262 / 111** | 52.53 / 9.17 | high |
| colors | Black, White | OK | 122208 | high |

## iphone-se (3rd gen)

Derived: k = 6.410. Body 67.27 × 138.44 × 7.31 mm → 431.2 × 887.4 pt. Glass 63.81 × 134.97; active
58.50 × 104.05. Active area starts 17.19 mm from the top and 4.38 mm from each side. So side border = 28.1 pt,
top border = 110.2 pt, and bottom border (17.20 mm) = 110.3 pt. The 1.73 mm of housing outside the glass
works out to rim ≈ 11 pt. The current totals (28 / 109) are nearly right; only the split and the buttons are off.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 375×667 r0, dpr 2 | unchanged | 111866; safearea.info | high |
| bezel | t105 r24 b105 l24 | **t99 r17 b99 l17** | dimensional-drawings/iphone-se-3rd-generation.pdf | med. The 1.73 mm of housing is mostly the rounded edge, so a thinner visual rim is a legitimate style choice as long as bezel+rim stays 28 / 110. |
| rim | 4 | **11** | same | med |
| bodyRadius | 70 | **66** | corner profile 45° point ≈ 3.00 mm → R ≈ 10.2 mm | low–med |
| Ring/Silent (L) | 110 / 24 | **113 / 36** | top 17.56, length 5.61 | med (I read 17.56 as the switch's top edge) |
| Vol + (L) | 170 / 50 | **188 / 68** | centre 34.56, half 5.31 | high |
| Vol − (L) | 235 / 50 | **268 / 68** | centre 47.17, half 5.31 | high |
| Side (R) | 170 / 60 | **188 / 68** | centre 34.64, half 5.31 | high |
| colors | Midnight, Starlight (white front), (PRODUCT)RED | OK | 111866 | high |

Home button: the drawing has Ø10.90 mm (≈70 pt) centred 9.25 mm above the bottom. The renderer computes
`min(bz.b × 0.62, 66)`, which gives ≈61 pt with the proposed bezel, so it is about 13% small. See "Renderer notes".

## apple-watch-ultra

The entry is unversioned ("Apple Watch Ultra", no year), but it uses the **Ultra 1/2** display (410×502 px →
205×251 pt). Ultra 3 (2025) and Ultra 4 (2026) share a larger display, 422×514 px → **211×257 pt**, and an
identical case (both drawings: 49.14 mm tall, cover glass 35.79 × 43.07, crown Ø9.42). I propose making this
entry the current Ultra.

If the maintainers would rather keep it as Ultra 1/2: at minimum fix radius 44 → **54** (safearea.info simulator
profile). I did not re-derive the Ultra 2 buttons.

Derived: k = 6.410. Active 32.92 × 40.09 mm (Ultra 4 sheet 3); cover glass 35.79 × 43.07. The outer silhouette
is ≈41.6 mm wide without crown. I measured that from the drawing lines: the case flank is symmetric about the
glass centre, and the crown guard is excluded. Height is 49.14 mm. That gives ≈266.5 × 315.0 pt. Black glass
border ≈9.2 pt horizontally and 9.5 vertically; metal ≈18.5–19.5 pt. Proposed body 211 + 18 + 38 = **267** ×
257 + 19 + 38 = **314**. Currently 251 × 297.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| name / year | Apple Watch Ultra / – | **Apple Watch Ultra 4 / 2026** | apple.com/apple-watch-ultra-4/specs/ | high |
| screen | 205×251 r44 | **211×257 r57** | Ultra 4 specs (422×514 px, 326 ppi); drawing active 32.92 × 40.09; radius from safearea.info (simulator) | size high, radius med |
| bezel | 14 | **{t 9.5, r 9, b 9.5, l 9}** | apple-watch-ultra-3.pdf / -4.pdf | med |
| rim | 9 | **19** | same (outer width derived from drawing lines) | med |
| bodyRadius | 66 | **85** | outer corner-profile table, 45° point ≈3.9 mm → R ≈13 mm; the default formula gives 85.5 too | low–med |
| Crown (R) | at 95 len 58 w 12 | **at 86 len 60 w 14** | Ultra 4 sheet 3: crown keep-out Ø10.42 centred +6.44 mm above case centre; crown Ø9.42 | high (position), med (w) |
| Side button (R) | 175 / 50 | **169 / 72** | extents −1.71 … −12.91 mm about the centre | high |
| Action (L, orange) | 80 / 45 | **138 / 92** | extents +3.10 … −11.26 mm about the centre. Its centre label reads "18.60", which is inconsistent with those extents and looks like a drafting error, so I used the extents. | high (extents) |
| pad | r16 l6 | unchanged (crown w 14 fits) | – | – |
| colors | Natural Titanium, Black Titanium | OK | Ultra 4 finish: "Titanium case, Grade 5 Natural, Black" | high |

The crown guard isn't drawn by the renderer; that is a renderer limitation.

## apple-watch-series-11 (46mm)

Derived: k = 6.410. Case 39.76 × 46.00 mm (spec rounds to 46 × 39 × 9.7) → 254.9 × 294.9 pt. Cover glass
37.21 × 43.45; active 32.45 × 38.69, which confirms 208 × 248 pt. rim 1.275 mm = 8.2 pt; bezel 2.38 mm =
15.3 pt. Proposed **255 × 295**; currently 242 × 282.

| field | current | proposed | source | confidence |
|---|---|---|---|---|
| screen | 208×248 r50 | unchanged | support.apple.com/en-us/125093; drawing active area; safearea.info radius 50. Active-corner table 45° point ≈2.33 mm → R ≈8 mm ≈ 51 pt, consistent | high |
| bezel / rim | 12 / 5 | **15.25 / 8.25** | dimensional-drawings/apple-watch-series-11-46mm.pdf | high |
| bodyRadius | 66 | **74** | case corner table, point E (3.38, 3.38) → R ≈ 11.5 mm | med |
| Crown (R) | at 70 len 45 w 10 | **at 69 len 46 w 12** | crown centre 8.66 mm above case centre, dial Ø7.25; width with crown 41.63 → protrusion 1.87 mm = 12 pt | high |
| Side button (R) | 140 / 42 | **148 / 80** | "BUTTON −0.03 … −12.46" about the centre | high |
| colors | Jet Black, Rose Gold, Silver, Space Gray | OK (aluminium). Titanium finishes Natural, Gold and Slate are missing (optional) | 125093 | high |
| safe | 0/0 | keep 0 (watch mockups are full-bleed). watchOS itself reports 53 / 36 per safearea.info | safearea.info | – |

---

## Missing devices (released by 2026-09-26)

Apple's own pages show the current lineup (apple.com/iphone, apple.com/watch): iPhone Duo, iPhone 18 Pro /
Pro Max, iPhone Air, iPhone 17, iPhone 17e; Apple Watch Ultra 4, Series 12, SE 3. There is **no iPhone 18
(non-Pro)** and **no iPhone Air 2** yet. Full entries are in `_new_devices`.

### iphone-18-pro, iphone-18-pro-max (2026)

Housings are identical to 17 Pro / Pro Max: the drawings give the same product, glass, active area, button
centres and half-lengths. Tech specs agree: 150.0 × 71.9 × 8.75 mm and 163.4 × 78.0 × 8.75 mm, same
resolutions. The one geometric change is a **smaller Dynamic Island: 15.66 mm (Pro) / 15.68 mm (Pro Max) wide
→ 95 pt** (was 125). Height is still 6.07 mm = 37 pt, and the top offset is still 14.

Display corner radius is 62 and safe area 62 / 34 (portrait), landscape 62 / 62, bottom 20 (safearea.info
simulator). Colours are Black, Silver, Glacier and Burgundy (support 148590 / 148591). The hexes are low
confidence: I sampled them from Apple's darkly-lit product-viewer images (burgundy ≈ #5e2a33,
glacier ≈ #bcc8d6). Burgundy is listed first because it is Apple's hero colour on the page.

### iphone-17e (2026)

Its drawing is dimensionally identical to 16e: notch 26.79 × 5.58 mm, the same buttons, 71.52 × 146.71 ×
7.80 mm. Screen 390×844 @3x, r 47.33, safe 47 / 34. Tech specs (126470) list a notch display (no Dynamic
Island), an Action button and no Camera Control. Colours: Black, White, Soft Pink (the Soft Pink hex is
low confidence).

### apple-watch-series-12 (46mm, 2026)

Same display as Series 11: 416×496 px → 208×248 pt, r 50, and identical active-corner table. The case is
slightly larger (40.28 × 46.38 mm) and the cover glass much larger (38.60 × 44.84), so the metal rim is only
≈5 pt and the black border ≈19.75 pt. Crown centre is 8.26 mm above centre with a Ø7.00 dial; protrusion is
2.27 mm ≈ 14 pt. Button extents are 0.41 … 12.49 mm below centre.

Sources: dimensional-drawings/apple-watch-series-12-46mm.pdf and support 148589. Finishes: aluminium in Dark
Bronze, Light Gold, Black and Space Gray; titanium in Radiant Gold and Natural; ceramic in Pearl White and
Night Blue. The ceramic case is 47 × 41 mm, a different geometry, so I left it out. All finish hexes are low
confidence.

### Apple Watch Ultra 4 (2026)

Covered by the proposed update to `apple-watch-ultra` above. Its geometry is identical to Ultra 3. If you'd
rather keep the old entry, add an `apple-watch-ultra-4` entry with the same values instead.

### iPhone Duo (2026, foldable): draft only, not in JSON

Sourced from apple.com/iphone-duo/specs/:

- Closed 84.1 × 117.8 × 11.3 mm; open 164.6 × 117.8 × 5.2 mm; 254 g.
- Outer display 5.4″, 1398×2034 px @460 ppi → **466×678 pt @3x**.
- Inner display 7.6″, 1878×2670 px @**430** ppi. Its point size and scale factor are unpublished.
- Dynamic Island on both displays.
- Controls: volume, Camera Control, side button with Touch ID. No Action button, and no Face ID is listed.
- Finishes: Night Sky, Star White.

safearea.info lists the inner display as 669×951 pt / 2007×2853 px, which **contradicts** Apple's pixel count,
so I don't trust its Duo data. It also gives the outer corners as 8/59/59/8 (small on the hinge side) and a
37×37 occlusion; I treat those as unverified.

Apple has published no dimensional drawing for the Duo yet, and the renderer can't draw a fold. So I only offer
this outer-display draft (low confidence). At k = 6.037 the closed body is ≈507.7 × 711.1 pt, so
bezel+rim ≈ 21 pt left/right and ≈17 pt top/bottom. The hinge-side asymmetry and button positions are unknown.

```js
{ id: 'iphone-duo', name: 'iPhone Duo (outer display)', brand: 'Apple', kind: 'phone', year: 2026, dpr: 3,
  screen: { w: 466, h: 678, radius: 59 }, bezel: { t: 10, r: 14, b: 10, l: 14 }, rim: 7,
  cutout: { type: 'island', w: 95, h: 37, top: 14 },            // unverified: shape/size of outer island
  statusBar: 'ios', home: 'indicator', safe: { top: 62, bottom: 34 }, // unverified
  buttons: [],                                                   // positions unknown until Apple posts a drawing
  colors: [['Night Sky', '#23262d'], ['Star White', '#ecebe6']] }
```

Also worth noting (out of scope): **Apple Watch SE 3** (2025; drawings `apple-watch-se-3-40mm/44mm.pdf`) is not
in the registry.

---

## Notes on things that look off visually (renderer or registry-level, not fixable via fields)

1. **Landscape safe area.** `bezel.js` hardcodes `{ t: 0, r: top, b: 21, l: top }`. Apple's value is bottom
   **20** on every current Face ID iPhone. useyourloaf (iOS 26) reports a top of 20 in landscape and bottom 29
   on Air; the iOS 27 simulator (safearea.info) reports top 0 and bottom 20. For **iPhone SE** it wrongly
   produces left/right 20 in landscape, because it reuses `safe.top` = 20. SE's real landscape insets are all 0.
   An optional `safeLandscape` field would fix both.
2. **SE front details.** The earpiece is drawn 52×6 pt, but the real receiver is 11.87 × 1.20 mm ≈ 76×8 pt.
   The front camera is drawn above the earpiece, but on the real SE it is left of it: ≈68 pt left of centre, at
   about the same height (≈9.1 mm from the top). Home button: see the SE section.
3. **Notch shape (16e/17e).** The real notch has 0.82 mm (≈5 pt) outer "ear" fillets and 3.72 mm (≈22.5 pt)
   bottom corners. The renderer uses 6 and `h × 0.6` ≈ 20. It looks close enough.
4. **Continuous corners.** Apple's display and housing corners are continuous-curvature, and CSS `border-radius`
   is circular. With the proposed numbers the overlays match at the diagonal within ≈1–2 pt.
5. **Ultra crown guard** and the Series 12 ceramic case geometry are not representable. The Ultra's Action
   button colour `#f26b1d` (International Orange) is fine.
6. **Aliases** (in `devices.js`, not device fields). Consider `iphone → iphone-18-pro` and
   `watch → apple-watch-series-12` now that those are current.
7. **Colour hexes** for existing devices are plausible approximations, and I did not change them. Official names
   were all verified against Apple's Tech Specs pages.
8. **Button protrusion.** Default `w: 3` matches Apple's 0.45 mm (2.7 pt) on the 17 family and 16e, and
   0.40–0.42 mm on SE. `flush: true` for Camera Control matches its 0.00 mm protrusion.
