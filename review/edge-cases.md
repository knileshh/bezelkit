# bezelkit: adversarial edge-case audit

**Scope:** `src/bezel.js`, `src/devices.js`, `README.md`, `examples/states.html` (v0.1.0).
**Snapshot tested:** `src/bezel.js` sha1 `7a87311c…`, `src/devices.js` sha1 `bca47c92…`. A frozen copy is in
`review/edge-cases/snapshot/`, and every `bezel.js:NNN` line reference below points at it. Live `src/` was
byte-identical during testing. Near the end, another agent rewrote `src/bezel.js` (now 677 lines, sha1 `769f9e46…`),
so I re-ran the `h.js`-based pages with `?live`. **C2, H1, H2, H5, M1, M2, M5, M11 and L1 still reproduce** on the
new code, with identical results. Line numbers in the live file will differ. Any `h.js` repro page runs against live
`src/` if you add `?live` to its URL.

**Harness** (everything is under `D:\Development\weekend projects\bezelkit\review\edge-cases\`):
- `server.py` is a static server with extras: an X-Frame-Options route, a jsDelivr-style extension-less entry point, an
  extension-less image route, delayed modules and a request log. Run it from the repo root with
  `python review/edge-cases/server.py 8837`. Port 8791 was taken by another agent's `http.server`.
- `cdp.mjs` is a zero-dependency Chrome DevTools Protocol driver (Node 24, headless Chrome). It captures console and
  exception output, emulates media features (forced colors, reduced motion), and produces print-to-PDF output, AX-tree
  dumps and screenshots. Run it as `node review/edge-cases/cdp.mjs <url> --shot shots/x.png [--media …] [--ax]`.
- `h.js` holds the shared helpers. Results are written to `window.__result` and a `<pre>`.
- Evidence screenshots are in `review/edge-cases/shots/`.

Totals: **2 Critical, 5 High, 13 Medium, 16 Low.** There's also a list of probes that found no bug, and a
missing-tests list at the end.

---

## Critical

### C1. The README's CDN snippet can't work: `./devices.js` resolves to an unrelated npm package
- **Scenario:** the one-line install in the README, `<script type="module" src="https://cdn.jsdelivr.net/npm/bezelkit">`.
- **Evidence:** `curl -sI https://cdn.jsdelivr.net/npm/lit` returns **200** with the main file's contents. jsDelivr
  does not redirect (unpkg, by contrast, returns `302 → /lit@3.3.3/index.js`). That makes the module's base URL
  `https://cdn.jsdelivr.net/npm/bezelkit`, and `import … from './devices.js'` (`bezel.js:3`) resolves to
  **`https://cdn.jsdelivr.net/npm/devices.js`**. That URL is a different package that already exists on npm: `devices.js@0.2.4`,
  "handle media devices (webcam, microphone) with node.js", which is CommonJS. Pinning a version doesn't help:
  `new URL('./devices.js', 'https://cdn.jsdelivr.net/npm/bezelkit@0.1.0')` gives the same URL.
- **Repro:** [`cdn-entry.html`](edge-cases/cdn-entry.html). `server.py` serves `/npm/bezelkit` and `/npm/devices.js`
  the same way jsDelivr does.
  - Observed: `SyntaxError: The requested module './devices.js' does not provide an export named 'defineDevice'`,
    and `customElements.get('bezel-device') === undefined`. Nothing renders (`shots/cdn-entry.png`).
  - Supply-chain risk: whoever controls the `devices.js` npm name could publish an ESM file that exports
    `getDevice/listDevices/defineDevice`. That code would then run on every site using the README snippet.
- **Expected:** the snippet loads the component.
- **Fix:** do one of the following, ideally all three:
  1. Ship a single-file build with no relative imports, and point the CDN fields at it:
     ```jsonc
     // package.json
     "main": "./dist/bezelkit.js",
     "module": "./dist/bezelkit.js",
     "jsdelivr": "./dist/bezelkit.js",
     "unpkg": "./dist/bezelkit.js",
     "exports": { ".": "./dist/bezelkit.js", "./devices": "./src/devices.js", "./package.json": "./package.json" },
     ```
     To avoid adding a build step, `dist/bezelkit.js` can be `cat src/devices.js src/bezel.js` with the
     `import` line removed. A 5-line node script does it.
  2. Until then, change the README to use a full path (`…/npm/bezelkit@0.1/src/bezel.js`) or the `/+esm` endpoint
     (`https://cdn.jsdelivr.net/npm/bezelkit@0.1/+esm`). jsDelivr's Rollup bundling resolves the relative import there.
  3. Add a CI smoke test that loads the published tarball through a jsDelivr-shaped URL. `server.py` already does this.

### C2. The `color` attribute breaks out of `style="…"`: HTML injection and XSS inside the shadow root
- **Scenario:** `color` goes through `resolveColor()` (`bezel.js:62-72`). A value is accepted if
  `CSS.supports('color', value)`. **Any `var()` or `env()` expression passes that check**, because its fallback may
  contain arbitrary tokens, including strings holding `"` and `<`. The value then reaches `metal()`, `lighten()` and
  `darken()` (`bezel.js:55-58`) and is interpolated **unescaped** into `style="…"` by `div()` (`bezel.js:59`), with
  the result assigned via `this.#frame.innerHTML` (`bezel.js:373`). Other sinks: `button()` (`:76-78`), the home
  button (`:143`), the laptop and desktop builders (`:157-175`).
- **Repro:** [`xss-color.html`](edge-cases/xss-color.html)
  ```html
  <bezel-device color='var(--x,"><img src=x onerror="window.__pwned=document.domain">)'></bezel-device>
  ```
  - Observed: `CSS.supports(color, payload) = true`, an injected `<img>` exists inside `.frame`, and
    **`window.__pwned === "localhost"`**, so the handler executed. The broken `<img>` icons are visible in
    `shots/xss-color.png`. Any sanitizer that allows the (legacy, allowlisted) HTML `color` attribute, as DOMPurify
    does by default, passes the payload straight through. So does any CMS or markdown pipeline that lets authors
    write `<bezel-device color=…>`.
- **Expected:** the value is treated as data. At worst the colour is invalid and the default finish is used.
- **Fix:** do both parts.
  1. Validate the colour strictly. This also fixes L14 (`color="inherit"`, which currently makes the frame invisible):
     ```js
     const CSS_WIDE = /^(inherit|initial|unset|revert|revert-layer|currentcolor)$/i;
     function safeColor(v) {
       if (!v || /[<>"'`;{}\\]|\b(var|env|attr|url)\s*\(/i.test(v) || CSS_WIDE.test(v.trim())) return null;
       return CSS.supports('color', v) ? v.trim() : null;
     }
     // resolveColor: if (safeColor(value)) return { name: value, frame: safeColor(value), … }
     ```
     If the project wants to support theming colours such as `color="var(--brand)"` (it currently works, see the third
     device in the screenshot), accept only an exact `^var\(--[\w-]+\)$`.
  2. The structural fix is to stop building frame markup as HTML strings. Create elements and set styles through
     CSSOM (`el.style.setProperty('background', v)`). A hostile value can then only fail to parse as CSS, and it
     can never become markup. The same change fixes H2 and H3.

---

## High

### H1. `src="javascript:…"` becomes a same-origin iframe that runs in the host page
- **Scenario:** any `src` without an image or video extension is routed to an `<iframe>` (`bezel.js:356`,
  `:421-426`), and there's no protocol check and no `sandbox`.
- **Repro:** [`xss-src-javascript.html`](edge-cases/xss-src-javascript.html). Setting
  `src="javascript:parent.__pwned=parent.document.cookie"` gives `parent.__pwned === "session=secret123"`.
- **Expected:** reject non-network schemes, or at least sandbox the frame. The attribute is called `src`, and
  sanitizers that don't know the element won't treat it as a URL sink.
- **Fix:**
  ```js
  const SAFE = new Set(['http:', 'https:', 'blob:', 'data:']);
  function safeSrc(src) {
    try { const u = new URL(src, document.baseURI);
      if (!SAFE.has(u.protocol)) return null;
      if (u.protocol === 'data:' && !/^data:(image|video)\//i.test(src)) return null; // no data:text/html frames
      return u.href; } catch { return null; }
  }
  ```
  Also add opt-in pass-through attributes `sandbox`, `allow` and `referrerpolicy` for the iframe (see L10).

### H2. A strict CSP (`style-src 'self'`) breaks the component completely
- **Scenario:** a site with no `'unsafe-inline'` in `style-src`. This is common for enterprise sites and anything
  that follows a "strict CSP" guide.
- **Root cause:** the core styles are an inline `<style>` in `root.innerHTML` (`bezel.js:301`). The aspect ratio is
  another inline `<style>` (`#dyn`, `:310`, `:370`). Every frame part is a `style="…"` attribute created through
  `innerHTML` (`div()` `:59`, plus `:211-233`). CSP blocks all three.
- **Repro:** [`csp-style.html`](edge-cases/csp-style.html)
  - Observed: 50+ `Applying inline style violates … 'style-src 'self''` errors. `:host` computes to
    `display: inline`. `.body` gets `position: static` and no background. `#scale` bails out because
    `clientWidth === 0` on an inline element, so the stage is never transformed. The result is a raw 1:1 iframe and
    screenshot spilling across the page (`shots/csp-style.png`).
- **Proof that the fix works under the same CSP:** [`csp-fix-proof.html`](edge-cases/csp-fix-proof.html) shows that
  `<style>` in the shadow root and `style=""` via innerHTML are both blocked, while **`adoptedStyleSheets` and
  `el.style.cssText` both apply**.
- **Fix:**
  ```js
  const SHEET = new CSSStyleSheet(); SHEET.replaceSync(STYLES);           // once per module
  // constructor:
  this.#ratio = new CSSStyleSheet();
  root.adoptedStyleSheets = [SHEET, this.#ratio];
  // #render: this.#ratio.replaceSync(`:host{aspect-ratio:${TW}/${TH}}`)  (or this.style.aspectRatio, CSSOM)
  // parts: const el = document.createElement('div'); el.className = cls; el.style.cssText = style;
  ```
  `div()` could return nodes, with `frame.replaceChildren(...nodes)`. As a stopgap, the README should document
  `'unsafe-inline'` as a requirement.

### H3. Trusted Types (`require-trusted-types-for 'script'`) makes the constructor throw
- **Repro:** [`trusted-types.html`](edge-cases/trusted-types.html)
  - Observed: `TypeError: Failed to set the 'innerHTML' property on 'ShadowRoot': This document requires
    'TrustedHTML' assignment. at new BezelDevice (bezel.js:301)`. Every instance, including
    `document.createElement('bezel-device')`, gets an empty shadow root (`shots/trusted-types.png`). The later
    `innerHTML` sinks (`:373`, `:384`, `:385`, `:401`) would throw too.
- **Fix:** use the same DOM-building refactor as H2, with `replaceChildren()` instead of `innerHTML`. Or, as a minimum,
  create a named policy
  (`trustedTypes?.createPolicy('bezelkit', { createHTML: (s) => s })`). That's only acceptable once C2 is fixed,
  because the policy would otherwise launder the injection.

### H4. `defineDevice()` in a second script (the README flow) renders the wrong device, permanently
- **Scenario:** markup `<bezel-device device="my-kiosk">`, then `<script type=module src=bezel.js>`, then a second
  `<script type=module>` that calls `defineDevice({ id: 'my-kiosk', … })`. This is the README's "Custom devices"
  snippet as a page author would write it.
- **Root cause:** `customElements.define` (`bezel.js:489`) upgrades existing elements **synchronously**, and
  `connectedCallback` renders immediately (`:315-316`). The unknown id falls back to the iPhone (`:472-477`), and
  nothing ever re-renders when the registry changes (`devices.js:36-43`).
- **Repro:** [`custom-device-two-scripts.html`](edge-cases/custom-device-two-scripts.html)
  - Observed: 2× `bezelkit: unknown device "my-kiosk"` warnings. `screenSize = 402×778` (the iPhone) and
    `aspect-ratio: 436 / 908`, while **`el.spec.id === 'my-kiosk'`**, so the getter disagrees with what's on screen.
  - In the same module graph ([`custom-device-one-module.html`](edge-cases/custom-device-one-module.html)) the result
    is correct only by accident: the duplicate microtask render from L1 happens to run after `defineDevice`. A
    spurious warning is still logged.
- **Fix:** keep a set of live instances and re-render the affected ones when a device is defined. Also warn only
  after a microtask:
  ```js
  // devices.js
  const listeners = new Set();
  export const onDefine = (fn) => (listeners.add(fn), () => listeners.delete(fn));
  export function defineDevice(spec) { …; registry.set(device.id, device); listeners.forEach((fn) => fn(device.id)); return device; }
  // bezel.js
  const live = new Set();
  onDefine((id) => live.forEach((el) => el.getAttribute('device') === id && el.requestRender()));
  connectedCallback() { live.add(this); … }  disconnectedCallback() { live.delete(this); … }
  ```

### H5. `bezel-fit` fires on every render; a listener that writes any observed attribute locks up the page
- **Root cause:** `#applyFit()` (`bezel.js:447-460`) dispatches whenever natural size is known, and `#render()` calls
  it every time (`:388`). `attributeChangedCallback` (`:323-327`) doesn't compare `oldValue` and `newValue`, and a
  same-value `setAttribute` still triggers it. So the cycle is listener → setAttribute → microtask render → event →
  listener. It never yields, because each step runs in a microtask.
- **Repro:** [`lifecycle.html`](edge-cases/lifecycle.html)
  - Section F: **7 cosmetic attribute changes** (`glare`, `theme`, `color`, `shadow`, `alt`) produce **7 `bezel-fit`
    events**, where 0 are expected. In `perf30.html`, toggling `glare` on 30 devices fires 30 events.
  - Section G: `el.addEventListener('bezel-fit', e => e.target.setAttribute('fit', e.detail.fit))` fired **2000
    events in 626 ms without yielding a single macrotask**. The test stops at a cap of 2000; without the cap, the tab
    hangs. A realistic trigger is `e => (el.glare = e.detail.mismatch > 1.05)`.
- **Expected:** one event per media load, or per change of the *resolved* fit.
- **Fix:**
  ```js
  attributeChangedCallback(name, oldV, newV) { if (oldV === newV || !this.isConnected || this.#queued) return; … }
  // #applyFit: only dispatch when something the event describes changed
  const sig = `${fit}|${media?.w}x${media?.h}|${this.#box.w}x${this.#box.h}`;
  if (media && sig !== this.#lastFitSig) { this.#lastFitSig = sig; this.dispatchEvent(…); }
  ```

---

## Medium

### M1. Shrink-to-fit or zero-width hosts draw an unscaled, full-size device over the page
- **Scenario:** the host sits in an `inline-block`, a `position:absolute` wrapper, a float or table cell, or is given
  `width:0` or `display:contents`. `:host{width:100%}` (`bezel.js:16`) resolves to 0, and `#scale()` returns early
  when `!cw` (`:465`). The stage keeps no transform, so the device renders at 1:1 CSS px (a 436×908 iPhone, a
  1700 px MacBook) on top of the surrounding content.
- **Repro:** [`layout.html`](edge-cases/layout.html), cells 4, 5, 11 and 14 (`shots/layout.png`). Measured: host
  `0×0`, drawn device `436×908` (`ib`), `448×952` (`zero`), `394×814` (`abs`), `436×908` (`contents`).
- **Fix:** give the host an intrinsic size and never leave the stage unscaled:
  ```css
  :host { display:block; width:100%; min-width: 0; contain: layout; overflow: clip; overflow-clip-margin: 60px; }
  :host { width: var(--bezel-width, 100%); }            /* document, e.g. --bezel-width: 320px */
  ```
  ```js
  #scale() { … if (!W) return; if (!cw) { this.#stage.style.transform = 'scale(0)'; return; } … }
  ```
  Alternatively, use `contain-intrinsic-size`/`min-width: 200px` as an intrinsic fallback, so shrink-to-fit parents
  get a sane default.

### M2. Host `padding` is ignored and the device is drawn over it
- **Root cause:** `.stage` is `position:absolute; left:0; top:0` (`bezel.js:18`), which is the padding-box origin, and
  `#scale` sizes it to `clientWidth/clientHeight` (`:464`), which are padding-box sizes too.
- **Repro:** `layout.html` cell 1 (`padding:30px`). The content box starts at `(49,83)`, but the drawn device is at
  `(19,53)` with the full 176×367 border-box size, covering the red padding band. `border` (cell 2) is handled
  correctly.
- **Fix:** place and scale inside the content box.
  ```js
  #scale() {
    const cs = getComputedStyle(this);
    const pl = parseFloat(cs.paddingLeft), pt = parseFloat(cs.paddingTop);
    const cw = this.clientWidth - pl - parseFloat(cs.paddingRight);
    const ch = this.clientHeight - pt - parseFloat(cs.paddingBottom);
    … this.#stage.style.transform = `translate(${pl + x}px, ${pt + y}px) scale(${s})`;
  }
  ```
  Better still, read `entry.contentBoxSize` in the ResizeObserver callback, which also fixes L13's integer rounding.
  Note that `aspect-ratio` applies to the border box (`box-sizing:border-box`), so with padding the content box
  ratio differs slightly. `min()` already copes with that.

### M3. Media-type sniffing misroutes common URLs, silently
- **Root cause:** `bezel.js:9-10` and `:356`. The type is decided only by the file extension, and every `blob:` URL is
  treated as an image.
- **Repro:** [`noext.html`](edge-cases/noext.html) (`shots/noext-xfo.png`) and [`content.html`](edge-cases/content.html) #7.
  - An extension-less CDN image (`/cdn-image/a1b2c3`, the same shape as Cloudinary, Unsplash, imgix and GitHub
    `user-attachments` URLs) becomes an `IFRAME`. The image shows at 1206 px natural size, cropped top-left, with a
    synthetic status bar and safe-area padding applied. Next.js `/_next/image?url=%2Fshot.png&w=1080` fails too,
    because `.png` is followed by `&`.
  - A `blob:` video without `type` becomes an `IMG` with `naturalWidth 0`. The screen is blank, and there's no event.
- **Fix:** match the extension anywhere in the path or query, and on failure fall back instead of guessing once:
  ```js
  const IMG_RE = /(^data:image\/)|\.(a?png|jpe?g|jfif|webp|gif|avif|svg|bmp|ico|heic)(?=$|[?#&])/i;
  // image kind: on error of a blob:/extension-less URL, retry as <video>; if that fails, emit bezel-error
  ```
  Document `type="image"` prominently for CDN URLs.

### M4. Load failures have no signal, and cross-origin images cost two requests plus a red console error
- **Root cause:** `img.onerror` (`bezel.js:409-412`) retries once without CORS, then does nothing. No event is fired,
  there's no fallback UI, and `bezel-fit` never fires. The first request always uses CORS mode (`:406`), so every
  CORS-less cross-origin image logs
  `Access to image … has been blocked by CORS policy` and is downloaded twice.
- **Repro:** `content.html`. `requests.log` shows `missing.png?b mode=cors` followed by `mode=no-cors`, and the same
  pair for `wide.png?xo` from `127.0.0.1`. The broken image leaves a blank screen with only a tiny broken-image glyph
  (`shots/content.png` #2). The retry does **not** loop, because `crossOrigin` becomes `null` after
  `removeAttribute` (verified).
- **Fix:**
  ```js
  img.onerror = () => {
    if (m.firstElementChild !== img) return;                    // stale element: don't refetch
    if (img.crossOrigin) { img.removeAttribute('crossorigin'); img.src = src; return; }
    this.dispatchEvent(new CustomEvent('bezel-error', { bubbles: true, detail: { src, kind: 'image' } }));
    m.dataset.state = 'error';                                  // style hook for a placeholder
  };
  ```
  Only set `crossOrigin` for same-origin URLs or when the author opts in (`crossorigin` attribute). Edge sampling of
  foreign images is a nice-to-have, and it shouldn't cost a second download plus a console error on every site.

### M5. Properties set before upgrade are lost (the lazy-property problem)
- **Root cause:** the accessors live on the prototype (`bezel.js:480-487`). A framework, or plain code, that sets
  `el.device = …` before `customElements.define` creates an own property that shadows the accessor forever.
- **Repro:** `lifecycle.html` section C. `pre.device='pixel-10-pro'; pre.src='img/wide.png'` is set before load.
  After upgrade: `getAttribute('device') === null`, `Object.hasOwn(pre,'device') === true`, the element renders the
  **iPhone in slot mode**, and the `src` is ignored.
- **Fix:** add the standard `#upgradeProperty` step in the constructor or `connectedCallback`:
  ```js
  for (const name of ATTRS) { const p = camel(name);
    if (Object.hasOwn(this, p)) { const v = this[p]; delete this[p]; this[p] = v; } }
  ```

### M6. Two copies of the module means two device registries
- **Scenario:** the element is loaded from a CDN tag while the app bundle carries its own copy (or two bundles each
  carry one). `customElements.get` stops the second copy from defining the element (`bezel.js:489`), but
  `defineDevice` from the second copy writes into **its own** `registry` Map (`devices.js:22`).
- **Repro:** [`two-copies.html`](edge-cases/two-copies.html). `B.getDevice('my-kiosk') = true`,
  `A.getDevice('my-kiosk') = false`, 3× unknown-device warnings, and a rendered iPhone. `el instanceof B.BezelDevice`
  is `false`.
- **Fix:** share the registry through the global symbol registry, and warn about duplicates:
  ```js
  const registry = (globalThis[Symbol.for('bezelkit.registry')] ??= new Map());
  if (customElements.get('bezel-device') && customElements.get('bezel-device') !== BezelDevice)
    console.warn('bezelkit: loaded twice; using the first definition');
  ```

### M7. Before upgrade (SSR, Astro, slow networks) the page shows unstyled content and a large layout shift
- **Repro:** [`fouc.html`](edge-cases/fouc.html), with the module delayed 2.5 s (`shots/fouc-before.png` vs
  `shots/fouc-after.png`). Before upgrade: `display:inline`, host heights `[0, 87]`, and the slotted HTML (with a
  live `Sign up` button) is shown raw and unframed. After upgrade: heights `[458, 468]`, and the following paragraph
  jumps **156 px → 536 px**.
- **Root cause:** all sizing is inside the shadow root. The aspect ratio is only known in JS (`bezel.js:370`).
- **Fix:** document a pre-upgrade stylesheet, and emit the ratio as an attribute during SSR:
  ```css
  bezel-device:not(:defined) { display:block; aspect-ratio: var(--bezel-ratio, 436 / 908); visibility:hidden; }
  ```
  Also export `ratioOf(deviceId, orientation)` so SSR integrations (an Astro component, a React wrapper) can write
  `style="--bezel-ratio: 436/908"`. Declarative Shadow DOM output is another option. The open mode already works;
  see M13.

### M8. Forced colors (Windows High Contrast) remove the frames
- **Repro:** [`forced-colors.html`](edge-cases/forced-colors.html) with `--media forced-colors=active`
  (`shots/forced-colors-active.png` vs `-off.png`). The phone and laptop bodies vanish. The slotted Pixel has no
  visible boundary, just floating text on Canvas, and `.glass` is forced to Canvas.
- **Root cause:** the frame is drawn entirely with `background`/`box-shadow` (`bezel.js:132-143`, `:157-175`), and
  forced colors rewrites or drops those.
- **Fix:** the frame is decorative imagery (and `aria-hidden`), so opt it out and add a structural outline:
  ```css
  @media (forced-colors: active) {
    .frame, .cutout, .chrome { forced-color-adjust: none; }
    .screen { outline: 2px solid CanvasText; }
  }
  ```

### M9. Video ignores reduced motion, can't be paused, and is unlabelled
- **Root cause:** `bezel.js:416-420`. The video always sets `autoplay` and `loop`, has no controls, and `alt` is
  applied only to `<img>` and `<iframe>` (`:430-432`).
- **Repro:** `content.html` #11 run with `prefers-reduced-motion: reduce`: the result is `paused:false`,
  `controls:false` and `ariaLabel:null`. [`a11y.html`](edge-cases/a11y.html) `--ax` shows the video exposed as a bare
  `Video` node with **no name**, even with `alt="Onboarding animation"`. Looping motion longer than 5 s with no pause
  control fails WCAG 2.2.2.
- **Fix:**
  ```js
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  Object.assign(v, { muted: true, defaultMuted: true, loop: true, playsInline: true, autoplay: !reduce });
  v.setAttribute('muted', '');                      // iOS Safari autoplay heuristics look at the attribute
  if (alt) v.setAttribute('aria-label', alt); else v.setAttribute('aria-hidden', 'true');
  // opt-in `controls` attribute passthrough; pause on click when no controls
  ```

### M10. Print uses the screen scale
- **Repro:** [`print.html`](edge-cases/print.html) via `Page.printToPDF` (`shots/print.pdf`). The print-media
  listener logged `clientWidth 734` but still `scale(0.542226)`, which was computed for the 958 px screen host. The
  device is about 30 % wider than its box on paper. The ResizeObserver doesn't run during print layout.
- **Fix:** rescale when the print media query changes. The listener runs against print layout, and the log above
  shows print-sized `clientWidth` inside it. Longer term, make scaling CSS-only (for example
  `container-type: inline-size` on the host plus geometry expressed in `calc(100cqw / W * n)`):
  ```js
  matchMedia('print').addEventListener('change', () => this.#scale());
  addEventListener('beforeprint', () => this.#scale());
  ```

### M11. `defineDevice()` accepts specs that crash or NaN at render
- **Repro:** [`misc.html`](edge-cases/misc.html)
  - `kind:'foldable'` is accepted, then `TypeError: BUILDERS[d.kind] is not a function` at `bezel.js:348`.
  - `colors: []` is accepted, because the spread overrides the default (`devices.js:40`). Then
    `TypeError: undefined is not iterable` in `resolveColor` (`bezel.js:63`).
  - `cutout:{type:'island'}` without `w`/`h` is accepted, and the frame HTML contains `NaN`.
  - Built-in ids can be silently overwritten (`defineDevice({id:'iphone-17-pro', screen:{w:1,h:1}})`), and live
    elements don't re-render (see H4).
- **Fix:** validate in `defineDevice` and throw a `TypeError` that names the field:
  ```js
  const KINDS = ['phone','tablet','watch','laptop','desktop','browser'];
  if (!KINDS.includes(spec.kind ?? 'phone')) throw new TypeError(`bezelkit: kind must be one of ${KINDS}`);
  if (spec.colors && !spec.colors.length) throw new TypeError('bezelkit: colors needs at least one entry');
  ```

### M12. No TypeScript or JSX types, and framework property naming is SSR-fragile
- **Evidence:** no `.d.ts` in `files`, and no `types` in `package.json`/`exports`. TSX users get
  `Property 'bezel-device' does not exist on type 'JSX.IntrinsicElements'`, and `document.querySelector('bezel-device')`
  is typed as `Element`, not `BezelDevice`. This one is from analysis; it wasn't executed.
- In React 19, the client sets `safeArea="pad"` as a property, because `'safeArea' in el` is true after upgrade.
  SSR, though, serializes it as the attribute `safeArea`, which HTML lowercases to `safearea` and the component
  doesn't observe. The first paint is therefore wrong until hydration. `glare={true}`/`{false}` work, because the
  setter maps booleans (`bezel.js:484`). Vue needs `compilerOptions.isCustomElement` (undocumented).
- **Fix:** ship `bezel.d.ts` with `HTMLElementTagNameMap`, a React `JSX.IntrinsicElements` augmentation and
  `HTMLElementEventMap['bezel-fit']`. Document that SSR users should use dash-case attributes (`safe-area`).

### M13. A `shadowrootmode="closed"` Declarative Shadow DOM makes the constructor throw
- **Repro:** `misc.html`. `NotSupportedError: … requested mode does not match the existing declarative shadow root's
  mode` at `new BezelDevice`. The element stays un-`:defined`. The open-mode DSD case works: its content is replaced.
- **Fix:** `const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' })`, or reuse
  `this.attachInternals().shadowRoot`. Document that SSR output must use `open`.

---

## Low

### L1. Every upgraded element renders twice, and every attribute change rebuilds everything
- Upgrade calls `attributeChangedCallback` while the element is connected, which queues a microtask render
  (`bezel.js:323-326`), and then `connectedCallback` renders synchronously (`:316`).
- `lifecycle.html` A: 3 markup elements produce **7** frame `innerHTML` writes. `perf30.html`: **60** writes and
  **90** `clientWidth` reads (forced layouts) for 30 elements, with a 76 ms synchronous upgrade.
- CSS-only attributes (`glare`, `shadow`, `alt`) rebuild the frame, chrome and cutout (`perf30`: 30 rebuilds for one
  `glare` toggle). The same value set 10× gives 10 rebuilds (`lifecycle.html` I).
- **Fix:** skip the `attributeChangedCallback` render until `connectedCallback` has run once (`#connected` flag). Add
  the `oldV === newV` guard. Group the attributes into "geometry" (`device, orientation, viewport, color, theme, url,
  chrome, safe-area`) versus "media" (`src, type, fit, alt`), and let `glare`/`shadow` stay pure CSS with no
  re-render. Share one ResizeObserver across instances.

### L2. RTL mirrors the status bar and browser toolbar
- `rtl.html` (`shots/rtl.png`): under `dir=rtl` the battery ends up left of the signal icon, and the Chrome nav reads
  `↻ → ←` with the URL right-aligned and the lock after it. The frame inherits `direction`, so the flex rows at
  `bezel.js:39`, `:193-199` and `:211-223` mirror.
- **Fix:** `.frame, .chrome, .cutout { direction: ltr; }`. Slotted content should keep inheriting the author's
  direction.

### L3. Letterbox colour sampling is naive
- A transparent PNG gets `--_lb-top: rgb(0 0 0)`, because alpha is ignored at `bezel.js:271-275` (`content.html` #9).
- A tall image with `fit="contain"` (pillarbox, bars left and right) still uses the top/bottom 50 % split gradient
  (`:27`), so each side bar is half one colour and half the other (`content.html` #10, the MacBook).
- An SVG with no intrinsic size reports 300×150 and gets letterboxed instead of filling the screen (`content.html` #3).
- **Fix:** weight by alpha, and fall back to `--bezel-screen-bg` when mostly transparent. Sample columns for
  pillarboxing (`q < 1` with `fit=contain`). Treat `naturalWidth/Height === 300/150` on `.svg` as "no intrinsic
  size", and use `fill` for it.

### L4. `resolveFit` edge semantics (`bezel.js:256-263`)
- From `fit-matrix.html`: the exact ±4 % boundaries are excluded by floating-point error (`q=0.96 → top`,
  `q=1.04 → contain`).
- `{w:0,h:0}` media gives `contain`, and the event's `mismatch` is `NaN` (`null` in JSON). This happens for
  audio-only `.mp4` (`content.html` #8).
- A negative box (safe insets larger than the screen on a custom device) gives `scroll`.
- `resolveFit('bogus')` returns `'bogus'`, and `'COVER'` passes through, because the export has no validation.
- **Fix:** add `const EPS = 1e-9`, compare `<= 0.04 + EPS`, return `'contain'` when `!(q > 0 && isFinite(q))`, and
  normalise or validate `requested` inside the exported function.

### L5. Height-only sizing wastes width
- `:host{width:100%}` means a `height:160px` device in a flex row still claims a flex share of the width, not its
  aspect-ratio width (`layout.html` #3: host 108 px wide, device drawn 77 px).
- **Fix:** document `width:auto` together with the height. Or drop `width:100%` for
  `inline-size: var(--bezel-width, 100%)` and let authors set `--bezel-width: auto`, so the ratio can transfer.

### L6. Reflected-property and attribute-parsing quirks
- `el.glare` returns `""` (falsy) when glare is on (`bezel.js:483`).
- `glare="0"` turns glare on, and only `glare="false"` turns it off (`:38`). `shadow` only understands `"none"`.
- Device ids, `fit`, `orientation`, `theme` and `type` are case- and whitespace-sensitive
  (`device="iPhone-17-Pro"` falls back to the iPhone 17 Pro only by coincidence, with 3 warnings; `misc.html`).
- **Fix:** make boolean getters return `hasAttribute(name) && getAttribute(name) !== 'false'`, and
  `.trim().toLowerCase()` all enum attributes.

### L7. Moving the element rebuilds it and reloads the iframe
- An `appendChild` move reloads the iframe (`lifecycle.html` D: `__loads` 1 → 2) and re-renders. That's platform
  behaviour. `Element.moveBefore()` keeps the iframe alive (2 → 2) but still re-renders, because there's no
  `connectedMoveCallback`. The ResizeObserver re-attaches correctly (`scale(0.73348)` after moving into a 320 px box).
- **Fix:** add `connectedMoveCallback() { this.#scale(); }`, and document "use `moveBefore` to keep iframe/video
  state".

### L8. The block host breaks inline contexts
- `<p>Before <bezel-device style="width:60px"> after</p>` splits the paragraph (`layout.html` #13).
- **Fix:** document `display:inline-block` as the way to use it inline.

### L9. `safe-area="pad"` with an exact device screenshot crops the bottom 11 %
- `auto` picks `top` against the padded 402×778 box (`fit-matrix.html`, `shots/fit-matrix.png`).
- **Fix:** when padding media, resolve `fit` against the unpadded screen, or default to `contain` with sampled bars.

### L10. The iframe has no pass-through attributes, and blocked pages look broken
- There's no `sandbox`, `allow` (autoplay, fullscreen, clipboard), `referrerpolicy` or `loading` override
  (`bezel.js:422-426`).
- An `X-Frame-Options: DENY` page shows Chrome's grey "refused to connect" glyph under a synthetic status bar
  (`shots/noext-xfo.png`, third device). This can't be detected cross-origin, because `load` still fires.
- **Fix:** add pass-through attributes, and add a README note that sites sending `X-Frame-Options`/`frame-ancestors`
  can't be embedded; use a screenshot instead.

### L11. `viewport` is unbounded
- `viewport="30000x30000"` lays out a 30002×30046 px stage plus a 30000 px iframe (`misc.html`). `0x0` is accepted too.
- **Fix:** clamp to 200–4096 on each axis.

### L12. The `spec` getter re-resolves and warns on every access
- `get spec()` calls `resolveDevice` (`bezel.js:330`, `:472-477`), which logs the unknown-device warning each time.
  It also disagrees with the rendered device (H4).
- **Fix:** cache the resolved spec per render, and warn once per id.

### L13. Integer `clientWidth` rounding
- `#scale` uses integer `clientWidth/clientHeight` (`bezel.js:464`), so fractional hosts render up to 1 px short, with
  a sub-pixel `translate` offset visible in every transform in `layout.html`.
- **Fix:** use `ResizeObserver` `contentBoxSize` or `getBoundingClientRect()`.

### L14. `color="inherit"` / `initial` / `currentcolor` makes the frame invisible
- `CSS.supports` accepts these keywords, but `color-mix(in oklab, inherit, …)` is invalid, so `.body` gets
  `background-image: none` (`xss-color.html`, the second device). The fix is covered by C2's `safeColor`.

### L15. Packaging details
- `sideEffects` lists only `bezel.js`, but `devices.js` registers devices at module evaluation. That's fine today
  because it's always imported through `bezel.js`, but `import 'bezelkit/devices'` alone would be tree-shaken away.
- There's no `"./package.json"` export, which some tooling reads.
- `color-mix()` has no fallback. On pre-2023 engines (Chrome < 111, Safari < 16.2) the whole `background`
  declaration drops and the frames go transparent.
- **Fix:** add `"sideEffects": ["./src/*.js"]`, add the export, and emit a `background-color` fallback before each
  gradient.

### L16. Accessibility defaults
- The host has no role or name. Screenshots default to `alt=""` (silently decorative: the wide image in `a11y.html`
  is absent from the AX tree). The iframe's default title is a generic "Embedded page".
- With `fit=scroll`, the scroller hides its scrollbar and isn't focusable (`tabIndex -1`), so keyboard and
  no-wheel users get no affordance.
- **Fix:** default the iframe title to the `url` or host name, and add `tabindex="0"` plus
  `aria-label` on the scroller when `fit=scroll`. Consider a `console.info` in dev when `src` is an image without
  `alt`.

---

## Probed and found OK
- **`img.onerror` retry doesn't loop.** It makes at most 2 requests, because `crossOrigin` is `null` after
  `removeAttribute`.
- **A tainted canvas is handled.** `sampleEdges` catches the error and the bars fall back to black.
- **Rapid `src` changes are fine.** 15 changes across tasks settle on the last image with the right natural size
  (`lifecycle.html` H), and stale `onload` is ignored (`bezel.js:408`).
- **`display:none` → shown works.** The ResizeObserver fires and the device scales correctly (`lifecycle.html` E).
- **The `hidden` attribute works:** it gives `display:none`.
- **Ancestor transforms and CSS `zoom` are fine** (`layout.html` #7-8). So is 40 px width (#6).
- **`url` is escaped.** A `url='"><img onerror>'` payload is inert (`misc.html`).
- **`viewport` is digit-only.** The regex blocks injection.
- **Large `data:` URLs are fine.** A 2.7 MB `src` adds no measurable re-render cost (225 ms vs 235 ms for 50
  renders), and `IMG_RE` on a 20 MB `data:video` takes 8 ms (`dataurl.html`).
- **An 8000×16000 JPEG loads and fits.** The resolved fit is `contain`.
- **Elements created with `createElement` before their attributes are set, and elements from `innerHTML` before
  define,** both render once connected.
- **Open-mode Declarative Shadow DOM works.** The server content is replaced.
- **The border box is handled.** `border` on the host is accounted for correctly.
- **No ResizeObserver loop errors appeared** in any layout test, and a resize storm over 30 instances took about
  16 ms per frame.

---

## Missing tests

**Unit tests (no DOM, or happy-dom). Export the pure helpers first.**
1. `resolveFit`: table-driven. Cover the exact ±4 % boundaries (see L4), 0.85 scroll/top, image vs video, `0×0`
   and `w×0` media, zero and negative boxes, `requested` validation and case, and `scroll` for video → `contain`.
2. `safeColor` / `resolveColor`: finish-name slugs (`cosmic-orange`, `(PRODUCT)RED` → `productred`), hex, `rgb()`,
   CSS-wide keywords, and **every C2 payload shape** (`var(--x,"…")`, `env(x,"…")`, unterminated strings, `;`, `<`).
3. Media-kind detection: `.png?v=2`, `.PNG#x`, `.png&w=`, extension-less CDN URLs, `blob:` with and without `type`,
   `data:image/svg+xml`, `data:video/mp4`, `data:text/html` (must not frame), and `javascript:` / `vbscript:`
   (must be rejected).
4. `defineDevice` validation: bad `kind`, empty `colors`, cutout without size, redefinition.
5. Viewport parsing: `1440x900`, `1440×900`, `1440 x 900`, `0x0`, and huge values (clamping).

**DOM and lifecycle tests (Web Test Runner or Playwright component tests):**
6. Exactly **one** render on upgrade, and none for a same-value attribute set (L1).
7. `bezel-fit` fires once per load and never for cosmetic changes. A listener that sets an attribute must terminate
   (H5).
8. `defineDevice` after upgrade re-renders matching elements (H4). Two module copies share the registry (M6).
9. Lazy-property upgrade (M5). Move with `appendChild` and `moveBefore` (L7).
10. Strict-CSP page and Trusted-Types page render identically to the normal page (H2, H3).
11. CDN smoke test: load `npm pack` output through a jsDelivr-shaped extension-less URL (C1).
12. `bezel-error` fires for a 404 and for a CORS-less cross-origin image (M4).

**Visual snapshots (Playwright `toHaveScreenshot`, one project per browser):**
13. `examples/states.html` at 1280 px and 390 px widths, in light and dark.
14. `layout.html` cells: padding, border, inline-block, width 0, 40 px, and a grid with `minmax(0,1fr)`.
15. `forced-colors: active`, `prefers-reduced-motion: reduce`, `dir=rtl`, and print media.
16. The fit matrix: exact, tall 0.9, long, wide, and pillarbox, for each of phone, tablet, laptop and browser, in
    portrait and landscape, with and without `safe-area="pad"`.
