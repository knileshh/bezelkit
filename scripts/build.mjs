// Bundles src/devices.js + src/bezel.js into one ES module with no relative imports,
// so CDN URLs like https://cdn.jsdelivr.net/npm/bezelkit work without resolving ./devices.js.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const devices = read('../src/devices.js');
const bezel = read('../src/bezel.js')
  .replace(/^import \{[^}]+\} from '\.\/devices\.js';\n/m, '')
  .replace(/^export \{ getDevice, listDevices, defineDevice \};\n/m, '');

if (/from '\.\//.test(bezel)) throw new Error('build: unexpected relative import left in bezel.js');
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist/bezelkit.js', import.meta.url), `/*! bezelkit v${version} · MIT · https://www.bezelkit.dev */\n${devices}\n${bezel}`);
console.log(`dist/bezelkit.js written (v${version})`);
