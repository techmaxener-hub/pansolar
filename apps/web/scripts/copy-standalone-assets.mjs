import { cpSync, existsSync, rmSync, mkdirSync, readdirSync, lstatSync, realpathSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

// next build's `output: 'standalone'` traces only the server runtime into
// .next/standalone — it does not copy .next/static (client JS/CSS) or
// public/ into that tree, so those must be copied in manually or the
// deployed server runs with no client assets.
const webDir = dirname(fileURLToPath(import.meta.url)) + '/..';
const nextDir = join(webDir, '.next');
const standaloneDir = join(nextDir, 'standalone');

// mkdirSync(dir, { recursive: true }) — and cpSync's own internal use of
// it — assumes every ancestor that already exists is a real, traversable
// directory. That assumption broke on Hostinger's own build host: next
// build's standalone step tried to place each runtime dependency by
// symlinking it in (see the longer note below) and that host restricts
// symlinks that cross out of the website's document root, a narrower
// version of the same privilege problem hit locally on Windows — leaving
// .next/standalone/node_modules itself as a dangling symlink rather than
// a plain missing path. Recursive mkdir sees an entry already there and
// doesn't descend past it, so creating anything beneath it fails with
// ENOENT (confirmed there: "mkdir .../standalone/node_modules/pg"). Walk
// the ancestor chain ourselves and clear anything occupying it that isn't
// already a real directory, and use this everywhere a directory needs to
// exist in the output tree instead of trusting recursive mkdir/cpSync.
function ensureDir(dir) {
  const parent = dirname(dir);
  if (parent !== dir) ensureDir(parent);
  let entryStat;
  try {
    entryStat = lstatSync(dir);
  } catch {
    mkdirSync(dir);
    return;
  }
  if (entryStat.isDirectory() && !entryStat.isSymbolicLink()) return;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir);
}
ensureDir(standaloneDir);

const staticSrc = join(webDir, '.next/static');
const staticDest = join(standaloneDir, '.next/static');
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log(`Copied .next/static -> ${staticDest}`);
}

const publicSrc = join(webDir, 'public');
const publicDest = join(standaloneDir, 'public');
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log(`Copied public/ -> ${publicDest}`);
}

// next build's own standalone-output step places each required top-level
// package under standalone/node_modules by *symlinking* it in (cheaper than
// copying, since a package like "next" itself has thousands of files). That
// requires a privilege Windows does not grant by default (Developer Mode /
// SeCreateSymbolicLinkPrivilege) — without it, next build only logs an
// "EPERM: operation not permitted, symlink ..." warning per package and
// silently leaves standalone/node_modules without it. Confirmed on this
// machine: the resulting server.js immediately crashed with "Cannot find
// module 'next'" — next itself never made it into the output.
//
// next build also writes, next to every server entrypoint, a Node File
// Trace manifest (*.nft.json) — the fully-resolved list of every real file
// that entrypoint needs. That's the same information the symlink step is
// built from, so read it directly and copy the referenced packages in as
// real directories instead of symlinking them. This needs no special
// privilege and behaves identically on every platform (a real copy is a
// superset-safe stand-in for a symlink here — pnpm's own store copies are
// themselves hardlinks, not further symlinks, so this is a shallow, cheap
// operation, not a duplication of installed disk space).
//
// The trace is best-effort, though: it's static analysis, so a module
// reached only through a runtime-computed require() — confirmed for
// "react-dom" (next requires a subpath like "react-dom/server.browser",
// picked by environment at runtime) and for "@swc/helpers" (pulled in by
// SWC's own compiled-in interop helpers, not a literal require() next's
// source contains) — is invisible to it and never appears in any
// *.nft.json. So on top of what the trace finds, every package this app's
// own package.json declares as a direct dependency is included
// unconditionally, and every copied package's own declared dependencies
// are pulled in too, recursively — the same transitive closure Node's own
// module resolution would walk, which is exactly what turned up the rest
// of this gap in testing ("pg" depends on "pg-types" etc., none of which
// were literal require() targets in any traced file either).
function findNftFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const stat = lstatSync(p);
    if (stat.isDirectory()) findNftFiles(p, out);
    else if (name.endsWith('.nft.json')) out.push(p);
  }
  return out;
}

// A copied package can itself contain internal symlinks (e.g. a peer
// dependency linked into its private node_modules), and node's own
// cpSync — even with `recursive: true` — recreates every symlink it meets
// mid-traversal as a symlink at the destination rather than copying its
// target (confirmed here: copying "pg" this way crashed with the same
// EPERM a moment after the top-level copy of "pg" itself was made to
// avoid exactly that). So walk and copy manually instead of delegating
// the recursion to cpSync, resolving every symlink — at any depth — to
// its real target before copying, and never calling the symlink syscall
// at all.
function copyDereferencing(src, dest) {
  const stat = lstatSync(src);
  if (stat.isSymbolicLink()) {
    let real;
    try {
      real = realpathSync(src);
    } catch {
      // Dangling symlink (e.g. an optional dependency that was never
      // actually installed) — nothing to copy, skip it.
      return;
    }
    copyDereferencing(real, dest);
    return;
  }
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const name of readdirSync(src)) {
      copyDereferencing(join(src, name), join(dest, name));
    }
  } else {
    cpSync(src, dest);
  }
}

const nodeModulesDir = join(standaloneDir, 'node_modules');
const ensured = new Set();

// require.resolve(`${dep}/package.json`) breaks on any package whose own
// package.json declares an "exports" map that doesn't explicitly list
// "./package.json" as a subpath (confirmed for pg-pool, clsx, client-only,
// among others here) — modern "exports" blocks resolving anything it
// doesn't list, regardless of whether the file exists on disk. Resolve the
// package's real entry file instead (unaffected — that's the very path
// "exports" is meant to allow) and walk up from there to the nearest
// package.json, which is always the package's own root.
function resolvePackageRoot(req, depName) {
  let dir = dirname(req.resolve(depName));
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no package.json found above ${req.resolve(depName)}`);
    dir = parent;
  }
  return dir;
}

function ensurePackage(pkgRoot, pkgId) {
  if (ensured.has(pkgId) || !existsSync(pkgRoot)) return;
  ensured.add(pkgId);
  const dest = join(nodeModulesDir, pkgId);
  if (!existsSync(dest)) {
    copyDereferencing(pkgRoot, dest);
  }
  let pkgJson;
  try {
    pkgJson = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'));
  } catch {
    return;
  }
  const pkgRequire = createRequire(pathToFileURL(join(pkgRoot, 'package.json')));
  for (const depName of Object.keys(pkgJson.dependencies ?? {})) {
    try {
      ensurePackage(resolvePackageRoot(pkgRequire, depName), depName);
    } catch (err) {
      console.log(`Could not resolve ${pkgId}'s dependency ${depName}: ${err.message}`);
    }
  }
}

const nftFiles = [
  join(nextDir, 'next-server.js.nft.json'),
  join(nextDir, 'next-minimal-server.js.nft.json'),
  ...findNftFiles(join(nextDir, 'server')),
].filter(existsSync);

for (const nftFile of nftFiles) {
  const { files } = JSON.parse(readFileSync(nftFile, 'utf8'));
  const nftDir = dirname(nftFile);
  for (const relPath of files) {
    const absPath = resolve(nftDir, relPath);
    const parts = absPath.split(sep);
    const idx = parts.lastIndexOf('node_modules');
    if (idx === -1) continue; // project source or a generated manifest, not a dependency
    const pkgParts = parts[idx + 1]?.startsWith('@')
      ? parts.slice(idx + 1, idx + 3)
      : parts.slice(idx + 1, idx + 2);
    const pkgId = pkgParts.join('/');
    const pkgRoot = parts.slice(0, idx + 1 + pkgParts.length).join(sep);
    ensurePackage(pkgRoot, pkgId);
  }
}

const appRequire = createRequire(pathToFileURL(join(webDir, 'package.json')));
const appPkg = JSON.parse(readFileSync(join(webDir, 'package.json'), 'utf8'));
for (const depName of Object.keys(appPkg.dependencies ?? {})) {
  if (depName.startsWith('@solaros/')) continue; // transpiled/bundled inline, see transpilePackages above
  try {
    ensurePackage(resolvePackageRoot(appRequire, depName), depName);
  } catch (err) {
    console.log(`Could not resolve this app's own dependency ${depName}: ${err.message}`);
  }
}
console.log(`Copied ${ensured.size} runtime packages -> ${nodeModulesDir}`);

// Passenger-based hosts (e.g. Hostinger) that deploy the plain `.next`
// build directory expect a `server.js` directly at its root. With tracing
// rooted at this app's own directory (see next.config.mjs) and
// node_modules now fully real (no symlinks left to corrupt), copy the
// standalone unit's contents up one level — giving the same
// output_directory value these hosts already deploy cleanly (.next) a
// working, self-contained entry point at its root.
for (const name of readdirSync(standaloneDir)) {
  cpSync(join(standaloneDir, name), join(webDir, '.next', name), { recursive: true });
}
// Remove the now-copied source so exactly one server.js exists in the
// output tree — a duplicate (nested) one previously made a host's deploy
// step pick the wrong copy, isolated from the node_modules it needs.
rmSync(standaloneDir, { recursive: true, force: true });
console.log(`Flattened standalone unit into ${join(webDir, '.next')}`);
