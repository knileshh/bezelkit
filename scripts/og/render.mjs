// Renders scripts/og/og.html to assets/og-image.{png,jpg} at exactly 1200×630 with headless Chrome.
// Usage: serve the repo root on a port, then `node scripts/og/render.mjs http://localhost:8766`.
// Set CHROME to your Chrome/Edge binary if it isn't in the default Windows location.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] || 'http://localhost:8766';
const chromePath = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'bk-og-'))}`, '--window-size=1200,630', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', (m) => { const msg = JSON.parse(m.data); if (pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `${base}/scripts/og/og.html` });
for (let i = 0; i < 60; i++) {
  await sleep(250);
  const r = await send('Runtime.evaluate', { expression: 'document.body?.dataset.ready === "1"', returnByValue: true });
  if (r.result?.result?.value) break;
}
const out = new URL('../../assets/', import.meta.url);
const clip = { x: 0, y: 0, width: 1200, height: 630, scale: 1 };
const png = await send('Page.captureScreenshot', { format: 'png', clip });
const jpg = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90, clip });
writeFileSync(new URL('og-image.png', out), Buffer.from(png.result.data, 'base64'));
writeFileSync(new URL('og-image.jpg', out), Buffer.from(jpg.result.data, 'base64'));
for (const f of ['og-image.png', 'og-image.jpg']) console.log(f, Math.round(statSync(new URL(f, out)).size / 1024), 'KB');
ws.close(); chrome.kill();
process.exit(0);
