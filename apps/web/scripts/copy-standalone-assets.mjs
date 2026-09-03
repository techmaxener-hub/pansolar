import { cpSync, existsSync, readdirSync, lstatSync, rmSync, realpathSync } from 'node:fs';
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

// In a pnpm monorepo, Next nests server.js under .next/standalone/apps/web
// but hoists node_modules (and workspace packages like @solaros/db) one
// level up at .next/standalone/, wired back in via relative symlinks. Hosts
// that deploy this folder as a standalone, self-contained unit (e.g.
// Hostinger's Passenger runtime) need every dependency physically inside
// it — so replace each symlink with the real files it points to.
function dereferenceSymlinks(dir) {
  for (const name of readdirSync(dir)) {
    const entryPath = join(dir, name);
    const stat = lstatSync(entryPath);
    if (stat.isSymbolicLink()) {
      const real = realpathSync(entryPath);
      rmSync(entryPath, { recursive: true, force: true });
      cpSync(real, entryPath, { recursive: true });
    } else if (stat.isDirectory()) {
      dereferenceSymlinks(entryPath);
    }
  }
}

const nodeModulesDest = join(standaloneAppDir, 'node_modules');
if (existsSync(nodeModulesDest)) {
  dereferenceSymlinks(nodeModulesDest);
  console.log(`Dereferenced node_modules symlinks -> ${nodeModulesDest}`);
}

// Passenger-based hosts (e.g. Hostinger) that deploy the plain `.next`
// build directory expect a `server.js` directly at its root — that's not
// something a plain `next build` produces. Flatten the self-contained
// standalone unit (server.js, its own node_modules, package.json, and its
// nested runtime manifest under .next/) into the top level of `.next/` so
// the same output_directory these hosts already recognize as a valid Next
// build also contains a working, self-contained entry point.
const outerNextDir = join(webDir, '.next');
for (const name of readdirSync(standaloneAppDir)) {
  cpSync(join(standaloneAppDir, name), join(outerNextDir, name), { recursive: true });
}
console.log(`Flattened standalone server into ${outerNextDir}`);
