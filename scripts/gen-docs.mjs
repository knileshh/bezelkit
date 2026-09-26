// Generates the machine-readable docs from the device registry, so they can't drift from the code:
//   devices.json   every device: id, kind, viewport, native pixels, finishes…
//   llms-full.txt  docs/llms-full.md with the device tables filled in
import { readFileSync, writeFileSync } from 'node:fs';
import { listDevices } from '../src/devices.js';

const url = (p) => new URL(p, import.meta.url);
const { version } = JSON.parse(readFileSync(url('../package.json'), 'utf8'));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const native = (s, dpr) => (dpr ? `${Math.round(s.w * dpr)}×${Math.round(s.h * dpr)}` : '—');

const devices = listDevices().map((d) => ({
  id: d.id,
  name: d.name,
  brand: d.brand || undefined,
  kind: d.kind,
  year: d.year,
  status: d.status,
  viewport: { w: d.screen.w, h: d.screen.h },
  dpr: d.dpr,
  native: d.dpr ? { w: Math.round(d.screen.w * d.dpr), h: Math.round(d.screen.h * d.dpr) } : undefined,
  cover: d.cover ? { w: d.cover.w, h: d.cover.h } : undefined,
  colors: (d.colors ?? []).map(([name]) => ({ name, value: slug(name) })),
  back: !!d.back || undefined,
  variants: d.kind === 'laptop' || d.kind === 'desktop' ? ['flat', 'deck', '3d'] : undefined,
}));

writeFileSync(url('../devices.json'), JSON.stringify({ version, generated: new Date().toISOString().slice(0, 10), devices }, null, 2) + '\n');

const KINDS = [['phone', 'Phones'], ['foldable', 'Foldables'], ['tablet', 'Tablets'], ['watch', 'Watches'], ['laptop', 'Laptops'], ['desktop', 'Desktops'], ['browser', 'Browser windows']];
const tables = KINDS.map(([kind, label]) => {
  const rows = listDevices().filter((d) => d.kind === kind);
  if (!rows.length) return '';
  const extra = kind === 'foldable' ? ' | cover (CSS px)' : '';
  const head = `### ${label}\n\n| id | name | viewport (CSS px) | DPR | native px${extra} | finishes (\`color\` values) |\n|---|---|---|---|---|${kind === 'foldable' ? '---|' : ''}---|\n`;
  return head + rows.map((d) => {
    const cover = kind === 'foldable' ? ` | ${d.cover ? `${d.cover.w}×${d.cover.h}` : '—'}` : '';
    const colors = (d.colors ?? []).map(([n]) => `\`${slug(n)}\``).join(', ');
    return `| \`${d.id}\` | ${d.name}${d.status ? ` (${d.status})` : ''} | ${d.screen.w}×${d.screen.h} | ${d.dpr ?? '—'} | ${native(d.screen, d.dpr)}${cover} | ${colors} |`;
  }).join('\n') + '\n';
}).filter(Boolean).join('\n');

const md = readFileSync(url('../docs/llms-full.md'), 'utf8')
  .replace('{{DEVICES}}', tables)
  .replace('{{DATE}}', new Date().toISOString().slice(0, 10))
  .replace('{{VERSION}}', version)
  .replace('{{COUNT}}', String(devices.length));
writeFileSync(url('../llms-full.txt'), md);
console.log(`devices.json + llms-full.txt written (${devices.length} devices)`);
