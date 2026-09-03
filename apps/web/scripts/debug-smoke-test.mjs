import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Copy the deployable .next into an isolated directory with no sibling
// apps/web/node_modules present, so this smoke test reflects what actually
// happens on the host (which deploys output_directory alone, in isolation)
// rather than resolution that only succeeds because the original build
// directory's node_modules happens to still be sitting next to it.
const isolated = mkdtempSync(join(tmpdir(), 'deploy-smoke-'));
cpSync('.next', join(isolated, 'app'), { recursive: true });
console.log(`Isolated copy at ${isolated}/app`);

const port = 3999;
const child = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1' },
  cwd: join(isolated, 'app'),
});

let output = '';
child.stdout.on('data', (d) => (output += d));
child.stderr.on('data', (d) => (output += d));

const timeout = setTimeout(() => {
  console.log('SMOKE_TEST_TIMEOUT');
  console.log('--- captured output ---');
  console.log(output);
  child.kill();
  process.exit(1);
}, 8000);

setTimeout(() => {
  get(`http://127.0.0.1:${port}/`, (res) => {
    clearTimeout(timeout);
    console.log(`SMOKE_TEST_STATUS:${res.statusCode}`);
    console.log('--- captured output ---');
    console.log(output);
    child.kill();
    process.exit(res.statusCode && res.statusCode < 500 ? 0 : 1);
  }).on('error', (err) => {
    clearTimeout(timeout);
    console.log(`SMOKE_TEST_REQUEST_ERROR:${err.message}`);
    console.log('--- captured output ---');
    console.log(output);
    child.kill();
    process.exit(1);
  });
}, 3000);
