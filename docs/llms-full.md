# bezelkit — full reference for AI assistants

> bezelkit is a zero-dependency web component, `<bezel-device>`, that draws accurate device frames (iPhone, Pixel, Galaxy, foldables, iPad, MacBook, iMac, Apple Watch, browser windows) in pure CSS and fits a screenshot, video, live URL or your own HTML into the screen correctly. Screens use each device's real CSS viewport. MIT licensed. Website: https://www.bezelkit.dev

This file is written for LLMs and coding agents. It is complete: you should not need any other page to use bezelkit correctly. Generated from the source on {{DATE}} (v{{VERSION}}, {{COUNT}} devices).

## Install

CDN, no build step (recommended for plain HTML, CMSs, docs sites, Webflow/Framer embeds):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/bezelkit@0/dist/bezelkit.js"></script>
```

npm (bundlers, frameworks):

```sh
npm i bezelkit
```

```js
import 'bezelkit';                                   // registers <bezel-device>
import { defineDevice, listDevices, getDevice } from 'bezelkit';
```

The package is an ES module. Importing it has one side effect: it defines the `bezel-device` custom element (safe to import twice). TypeScript types ship in `index.d.ts`.

## Minimal usage

```html
<bezel-device device="iphone-17-pro" src="screenshot.png" alt="Home screen"></bezel-device>
```

That is all. The element scales to the width you give it and keeps the device's aspect ratio.

## How to choose the right device for a screenshot

1. Read the screenshot's pixel size, e.g. 1206 × 2622.
2. Find the device in the table below whose **native pixels** match (or whose aspect ratio matches). 1206 × 2622 → `iphone-17-pro` / `iphone-18-pro` (402 × 874 @3x).
3. If nothing matches exactly, pick the device the product targets and keep `fit="auto"` (the default); bezelkit will letterbox, pin or scroll instead of stretching.
4. Use `orientation="landscape"` for landscape phone/tablet screenshots.
5. Desktop web screenshots → a browser frame (`browser-chrome`, `browser-safari`, with `viewport="1440x900"` to match) or a laptop (`macbook-pro-14`, 1512 × 982 CSS px = 3024 × 1964 native).

## Sizing rules (important)

- Give it a **width** (`style="width:320px"`, `width:100%` of a column, etc.). Height follows from the aspect ratio.
- Give it a **width and a height** and it fits inside that box, centred.
- In CSS Grid use `grid-template-columns: repeat(n, minmax(0, 1fr))`, not plain `1fr` (plain `1fr` lets the element's aspect ratio widen the column).
- It is a block-level element (`display:block`). Don't wrap it in shrink-to-fit parents without a width.

## Attributes

Every attribute is also a camelCase property (`el.safeArea = 'pad'`). Boolean attributes are present/absent.

| Attribute | Values | Default | What it does |
|---|---|---|---|
| `device` | a device id or alias (see tables) | `iphone-17-pro` | Which frame to draw. Aliases: `iphone`, `android`, `pixel`, `galaxy`, `ipad`, `macbook`, `imac`, `watch`, `browser`, `fold`, `flip`. |
| `src` | image / video / URL | — | Content for the screen. Type is detected from the extension (`.png .jpg .jpeg .webp .gif .avif .svg`, `.mp4 .webm .mov`); anything else becomes a live `<iframe>` at the device's true viewport. Only `http(s):`, `blob:`, and `data:image|video` are accepted. Omit `src` to slot your own HTML. |
| `type` | `image` `video` `iframe` | auto | Force the content type (needed for `blob:` videos or extension-less image URLs). |
| `fit` | `auto` `cover` `top` `contain` `scroll` `fill` `none` | `auto` | How media fills the screen. See "fit=auto" below. Never use `fill` unless the user asks for stretching. |
| `color` | finish name or CSS colour | first finish | Official finish names are listed per device (use lowercase-hyphenated, e.g. `cosmic-orange`, `deep-blue`) or any plain CSS colour (`#ff5a36`, `rgb(…)`). |
| `orientation` | `portrait` `landscape` | `portrait` | Phones, tablets, foldables. Content rotates with the device so it stays upright. |
| `chrome` | `auto` `on` `off` | `auto` | Draw a synthetic status bar + home indicator. `auto` = on for HTML/iframes, off for screenshots (which already contain their own). |
| `safe-area` | `auto` `pad` `none` | `auto` | `pad` keeps content clear of the notch/island and home indicator. `auto` = pad for HTML/iframes, none for media. |
| `theme` | `light` `dark` | `light` | Status-bar ink, safe-area fill, browser toolbar. |
| `url` | text | `example.com` | Address-bar text (browser frames). |
| `viewport` | `WxH`, e.g. `1440x900` | device default | Window size (browser frames only). |
| `glare` | boolean | off | Subtle screen reflection. |
| `shadow` | `none` | drop shadow | `shadow="none"` removes the drop shadow. |
| `alt` | text | — | Alt text for the image, or the iframe title. Always set it for accessibility. |
| `side` | `front` `back` `both` | `front` | `back` draws the rear (camera, finish). `both` = product shot with the back tilted behind the front. Changing it animates a 3D flip. |
| `stack` | `left` `right` | `left` | With `side="both"`: which side the back peeks out from. |
| `logo` | `none` `dot` | `none` | Brand logos are never drawn; `dot` adds a neutral placeholder on the back. |
| `variant` | `flat` `deck` `3d` | `flat` | Laptops/desktops only. `deck` = open laptop seen slightly from above with keyboard deck; `3d` = true CSS 3D model. |
| `rotate-x` `rotate-y` | degrees | 18 / −28 | Camera angle for `variant="3d"`. |
| `lid-angle` | 0–135 | 105 | Laptop lid opening for `variant="3d"`. |
| `interactive` | boolean | off | `variant="3d"`: drag to rotate with inertia. |
| `folded` | boolean | off | Foldables: show the closed state (cover screen). Toggling animates. |
| `cover-src` | image / video / URL | `src` | Foldables: content for the outer (cover) screen. Or slot children with `slot="cover"`. |
| `fold-angle` | 0–180 | 180 | Foldables: half-open "flex" pose. |
| `fold-box` | `pose` `fixed` | `pose` | `fixed` keeps the element's box at the open size so the page doesn't move while folding. |

## Methods, properties, events

| Member | Returns | Notes |
|---|---|---|
| `el.flip(side?)` | `Promise<'front'\|'back'>` | Turn the device over (≈800 ms). |
| `el.fold(opts?)` / `el.unfold(opts?)` / `el.toggleFold(opts?)` | `Promise<boolean>` | Foldables. `opts.duration` in ms. |
| `el.open()` / `el.close()` | `Promise<void>` | `variant="3d"` laptop lid. |
| `el.spec` | device object | The resolved device definition. |
| `el.resolvedFit` | string | The fit actually applied after `auto`. |
| `el.screenSize` | `{ w, h }` | CSS px available to content in the current orientation. |
| `el.hingeAngle` / `el.pose` / `el.folded` | — | Live fold angle, 3D camera pose, folded state. |

Events (all bubble):

- `bezel-fit` — `{ requested, fit, media: {w,h}, screen: {w,h}, mediaRatio, screenRatio, mismatch }`. Fires when media loads or when the fit/box actually changes. Use it to warn about screenshots from the wrong device (`Math.abs(mismatch - 1) > 0.04`).
- `bezel-flip` — `{ side }` after a flip.
- `bezel-fold` — `{ phase: 'start'|'end', folded, from, to }`.
- `bezel-lid` — `{ angle, open }` when a 3D lid settles.

## fit="auto" (the default)

q = (media width / media height) ÷ (screen width / screen height)

| Condition | Result |
|---|---|
| \|q − 1\| ≤ 0.04 (same shape) | `cover` — fills the screen, crops at most a few px |
| q < 0.85 (image much taller, e.g. a full-page capture) | `scroll` — full width, scrolls inside the screen (images only) |
| 0.85 ≤ q < 0.96 (a bit taller) | `top` — anchored top, bottom trimmed |
| q > 1.04 (image wider) | `contain` — centred, bands painted with colours sampled from the image's own top/bottom rows |

## Styling hooks

- Parts: `::part(frame)`, `::part(screen)`, `::part(content)`, `::part(media)`, `::part(image)`, `::part(video)`, `::part(iframe)`, `::part(back)`, foldables: `::part(cover-screen)`, `::part(fold-leaf)`.
- CSS variables on the host: `--bezel-screen-bg`, `--bezel-safe-bg`, `--bezel-crease` (foldables).
- Slotted HTML receives `--bezel-safe-top`, `--bezel-safe-right`, `--bezel-safe-bottom`, `--bezel-safe-left`, `--bezel-screen-width`, `--bezel-screen-height` (like `env(safe-area-inset-*)`).

## Recipes

Landscape tablet:
```html
<bezel-device device="ipad-pro-11" orientation="landscape" src="dashboard.png" alt="Dashboard"></bezel-device>
```

Live website at the true phone viewport (the site must allow framing; X-Frame-Options/CSP frame-ancestors can block it):
```html
<bezel-device device="pixel-10-pro" src="https://example.com"></bezel-device>
```

Your own HTML, clear of the Dynamic Island:
```html
<bezel-device device="iphone-17-pro" safe-area="pad">
  <main style="padding:16px">…</main>
</bezel-device>
```

Full-page scrolling screenshot:
```html
<bezel-device device="iphone-17-pro" src="long-page.png"></bezel-device>   <!-- fit=auto → scroll -->
```

Product shot, front + back, a specific finish:
```html
<bezel-device device="iphone-17-pro" side="both" color="cosmic-orange" src="app.png"></bezel-device>
```

Foldable, closed, with a separate cover screenshot:
```html
<bezel-device device="galaxy-z-fold7" folded src="inner.png" cover-src="cover.png"></bezel-device>
<script type="module">document.querySelector('bezel-device').unfold();</script>
```

3D laptop you can drag:
```html
<bezel-device device="macbook-pro-14" variant="3d" interactive src="app.png"></bezel-device>
```

Warn when a screenshot doesn't match:
```js
document.addEventListener('bezel-fit', (e) => {
  if (Math.abs(e.detail.mismatch - 1) > 0.04) console.warn(`${e.target.getAttribute('device')}: screenshot is ${e.detail.media.w}×${e.detail.media.h}, fit=${e.detail.fit}`);
});
```

Custom device:
```js
import { defineDevice } from 'bezelkit';
defineDevice({ id: 'my-kiosk', name: 'Kiosk', kind: 'tablet', screen: { w: 1080, h: 1920, radius: 0 }, bezel: 40, rim: 6, colors: [['Graphite', '#3a3d42']] });
```

## Frameworks

- **React 19**: use the tag directly: `<bezel-device device="iphone-17-pro" src={url} fit="auto" />`. Boolean attributes: `glare=""` or `interactive=""`; methods via `ref` (`ref.current.flip()`). Import `'bezelkit'` once in a client component (`'use client'` in Next.js App Router; custom elements need the browser).
- **Vue 3**: `app.config.compilerOptions.isCustomElement = (tag) => tag === 'bezel-device'` (or `vite.config` `vue({ template: { compilerOptions: { isCustomElement: … } } })`), then `<bezel-device :src="url" device="pixel-10-pro" />`.
- **Svelte**: works as-is: `<bezel-device device="ipad-mini" src={url} />`.
- **Astro**: `<script>import 'bezelkit';</script>` in the page, then use the tag in markup.
- **Markdown/MDX, WordPress, Webflow, Framer, Notion-style embeds**: paste the CDN `<script>` once and the tag wherever needed.

## Limitations (be honest with users)

- Pages with a strict Content-Security-Policy that forbids inline styles (`style-src` without `'unsafe-inline'`) or that enforce Trusted Types are **not supported yet**; the frame won't render.
- Cross-origin images without CORS headers still display, but letterbox colours can't be sampled (black bars are used).
- Live iframes are subject to the target site's framing policy.
- Frames are original CSS drawings based on published dimensions; they are not Apple/Google/Samsung artwork. For App Store marketing, Apple requires its official product images.

## Rules for assistants generating code with bezelkit

1. Always load the component once (CDN script or `import 'bezelkit'`) before using the tag.
2. Match the device to the screenshot's native resolution using the table below; don't guess sizes.
3. Leave `fit` at `auto` unless the user asks otherwise. Never use `fit="fill"` for real screenshots.
4. Don't add a separate status bar image: screenshots already have one, and `chrome="auto"` handles HTML.
5. Always set `alt`.
6. Set a width on the element (or its container); in grids use `minmax(0, 1fr)`.
7. Use ids from the table exactly; unknown ids fall back to `iphone-17-pro` with a console warning.

## Devices

`native` = CSS viewport × DPR, i.e. the pixel size of a full-screen screenshot from that device (±1 px from rounding).

{{DEVICES}}
