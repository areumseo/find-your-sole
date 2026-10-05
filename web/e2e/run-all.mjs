// Builds the web app against a local API, starts both, runs every *.test.mjs
// in this folder and reports. Usage: `npm run e2e` from web/.
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.join(here, '..');
const api = path.join(web, '..', 'api');
const python = process.env.PYTHON || 'python3';
const dist = mkdtempSync(path.join(tmpdir(), 'fys-e2e-'));

const build = spawnSync('npx', ['vite', 'build', '--outDir', dist, '--emptyOutDir'], {
  cwd: web, stdio: 'inherit', env: { ...process.env, VITE_API_URL: 'http://localhost:8000' },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const servers = [
  spawn(python, ['-m', 'uvicorn', 'main:app', '--port', '8000'], {
    cwd: api, stdio: 'ignore', env: { ...process.env, ANTHROPIC_API_KEY: 'dummy-key-for-local-test' },
  }),
  spawn(python, ['-m', 'http.server', '4173', '--directory', dist], { stdio: 'ignore' }),
];
const stop = () => { servers.forEach((s) => s.kill()); rmSync(dist, { recursive: true, force: true }); };
process.on('SIGINT', () => { stop(); process.exit(130); });

await new Promise((r) => setTimeout(r, 4000));

let failed = 0;
for (const file of readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort()) {
  console.log(`\n── ${file}`);
  const r = spawnSync('node', [path.join(here, file)], { stdio: 'inherit', env: { ...process.env, E2E_BASE: 'http://localhost:4173/' } });
  if (r.status !== 0) { failed++; console.log(`✗ ${file} failed`); }
}
stop();
console.log(failed ? `\n${failed} test file(s) failed` : '\nAll e2e tests passed');
process.exit(failed ? 1 : 0);
