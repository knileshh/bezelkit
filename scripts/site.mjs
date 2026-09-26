// Assembles the deployable website into public/ (what Vercel serves).
// Run after `npm run build` so dist/, devices.json and llms-full.txt exist.
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const out = new URL('../public/', import.meta.url);
const SHIP = ['index.html', 'site', 'src', 'assets', 'examples', 'dist', 'llms.txt', 'llms-full.txt', 'devices.json', 'index.d.ts', 'LICENSE', 'README.md'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const p of SHIP) {
  const from = new URL(p, root);
  if (!existsSync(from)) throw new Error(`site: missing ${p} (run npm run build first)`);
  cpSync(from, new URL(p, out), { recursive: true, filter: (src) => !/[\\/]shots([\\/]|$)/.test(src) });
}
console.log(`public/ assembled (${SHIP.length} entries)`);
