// Cancelacion y single-flight de los trabajos SSE. Usa un handler de escaneo
// inyectado que lanza un `node` inerte: no toca Windows.
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import http from 'http';
import { execFileSync } from 'child_process';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const dataDir = mkdtempSync(join(tmpdir(), 'optihelx-jobs-'));
process.env.OPTIHELX_DATA_DIR = dataDir;
process.env.CLI_MODE = 'true';

const { app, SCAN_HANDLERS } = await import('../server.js');
const { spawnCapture } = await import('../lib/shared.js');

const pidFile = join(dataDir, 'child.pid');
const sleeper = `require('fs').writeFileSync(${JSON.stringify(pidFile)},String(process.pid));setTimeout(()=>{},60000)`;
const isAlive = (pid) => execFileSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], { encoding: 'utf-8' }).includes(String(pid));
const waitFor = async (fn, ms = 10000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (fn()) return; await new Promise((r) => setTimeout(r, 50)); }
  throw new Error('timeout esperando condicion');
};

let server;
let port;
const post = (path, onResponse) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path, method: 'POST', headers: { 'content-type': 'application/json' } }, (res) => {
    onResponse?.(res, req);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('close', () => resolve({ status: res.statusCode, body }));
  });
  req.on('error', reject);
  req.end('{}');
});

describe('trabajos SSE', () => {
  before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    port = server.address().port;
  });
  after(() => {
    server.closeAllConnections?.();
    server.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('desconexion: mata al hijo vivo', async () => {
    SCAN_HANDLERS.ram = () => spawnCapture('node', ['-e', sleeper], 120000);
    const p = post('/api/scan/ram', (_res, req) => {
      waitFor(() => existsSync(pidFile)).then(() => req.destroy());
    });
    await waitFor(() => existsSync(pidFile));
    const pid = Number(readFileSync(pidFile, 'utf-8'));
    assert.ok(isAlive(pid), 'el hijo debe estar vivo antes de cortar');
    await p.catch(() => {});
    await waitFor(() => !isAlive(pid), 8000);
    assert.equal(isAlive(pid), false);
  });

  it('409 con uno en curso y vuelve a aceptar tras el done', async () => {
    let release;
    SCAN_HANDLERS.ram = () => new Promise((r) => { release = r; });
    let first;
    const p1 = post('/api/scan/ram', (res) => { first = res; });
    await waitFor(() => release);
    const dup = await post('/api/scan/ram');
    assert.equal(dup.status, 409);
    assert.match(JSON.parse(dup.body).error, /en curso/);
    // otro modulo no se bloquea
    SCAN_HANDLERS.power = async () => {};
    assert.equal((await post('/api/scan/power')).status, 200);
    release();
    const r1 = await p1;
    assert.match(r1.body, /"exitCode":0/);
    SCAN_HANDLERS.ram = async () => {};
    assert.equal((await post('/api/scan/ram')).status, 200);
    assert.ok(first);
  });
});
