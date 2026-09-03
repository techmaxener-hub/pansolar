import { cpSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// next build's `output: 'standalone'` traces only the server runtime into
// .next/standalone/apps/web — it does not copy .next/static (client JS/CSS)
// or public/ into that tree, so those must be copied in manually or the
// deployed server runs with no client assets.
const webDir = dirname(fileURLToPath(import.meta.url)) + '/..';
const standaloneAppDir = join(webDir, '.next/standalone/apps/web');

const staticSrc = join(webDir, '.next/static');
const staticDest = join(standaloneAppDir, '.next/static');
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log(`Copied .next/static -> ${staticDest}`);
}

const publicSrc = join(webDir, 'public');
const publicDest = join(standaloneAppDir, 'public');
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log(`Copied public/ -> ${publicDest}`);
}

// Next's own standalone output (.next/standalone/apps/web/server.js, its
// node_modules, and its nested .next/ manifest) is deliberately relocatable
// as a whole unit — the symlinks pnpm/Next wire up inside it are relative
// and only resolve correctly as long as that unit's internal structure
// stays intact together. Earlier attempts that dereferenced or flattened
// individual entries broke peer-dependency siblings (e.g. next's own
// node_modules/styled-jsx), crashing the deployed server at startup.
//
// Passenger-based hosts (e.g. Hostinger) that deploy the plain `.next`
// build directory expect a `server.js` directly at its root, so add a
// thin wrapper there instead of moving anything — __dirname inside the
// real server.js is intrinsic to that file, so requiring it from here
// changes into the right directory exactly as running it directly would.
const wrapperPath = join(webDir, '.next/server.js');
writeFileSync(wrapperPath, "require('./standalone/apps/web/server.js');\n");
console.log(`Wrote entry point -> ${wrapperPath}`);
