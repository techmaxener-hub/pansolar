import { cpSync, existsSync } from 'node:fs';
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
