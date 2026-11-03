// node --test src/lib/jobs.test.js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startScan, startRun, cancel, scanAll, getJob, subscribe, setOnJobFinished, resetForTests, SCAN_ALL } from './jobs.js';

const enc = new TextEncoder();
const sse = (event, data) => `event: ${event}\ndata: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;
const OK = [sse('output', 'hola'), sse('progress', { step: 1, total: 2 }), sse('done', { exitCode: 0, timedOut: false })];

// Respuesta con cuerpo SSE; si `hold` existe, el stream queda abierto hasta hold.release() o abort.
function sseResponse(chunks, signal, hold) {
  const stream = new ReadableStream({
    async start(c) {
      for (const ch of chunks) c.enqueue(enc.encode(ch));
      if (hold) {
        await new Promise((resolve) => {
          hold.release = resolve;
          signal.addEventListener('abort', resolve, { once: true });
        });
        if (signal.aborted) { c.error(new DOMException('abort', 'AbortError')); return; }
      }
      c.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

let calls;
function fakeFetch(handler) {
  calls = [];
  globalThis.fetch = async (url, opts) => {
    calls.push(url);
    return handler(url, opts, calls.length);
  };
}

beforeEach(() => { resetForTests(); });

test('ciclo idle -> running -> done con logs y progreso', async () => {
  fakeFetch((u, o) => sseResponse(OK, o.signal));
  const seen = [];
  subscribe(() => seen.push(getJob('scan:cleanup').status));
  assert.equal(getJob('scan:cleanup').status, 'idle');
  const p = startScan('cleanup');
  assert.equal(getJob('scan:cleanup').status, 'running');
  const job = await p;
  assert.equal(job.status, 'done');
  assert.equal(job.error, null);
  assert.ok(job.logs.some((l) => l.type === 'output' && l.text === 'hola'));
  assert.ok(seen.includes('running') && seen.at(-1) === 'done');
});

test('done con exitCode 1 queda en error con el mensaje del evento error', async () => {
  fakeFetch((u, o) => sseResponse([sse('error', 'boom'), sse('done', { exitCode: 1, timedOut: false })], o.signal));
  const job = await startScan('cleanup');
  assert.equal(job.status, 'error');
  assert.match(job.error, /boom/);
});

test('stream sin done no cuenta como exito', async () => {
  fakeFetch((u, o) => sseResponse([sse('output', 'x')], o.signal));
  const job = await startScan('cleanup');
  assert.equal(job.status, 'error');
});

test('HTTP 429 queda en error legible', async () => {
  fakeFetch(() => new Response('{}', { status: 429 }));
  const job = await startScan('cleanup');
  assert.equal(job.status, 'error');
  assert.match(job.error, /Demasiadas solicitudes/);
});

test('desuscribir (desmontar) no aborta el job', async () => {
  const hold = {};
  fakeFetch((u, o) => sseResponse([sse('output', 'a')], o.signal, hold));
  const unsub = subscribe(() => {});
  const p = startScan('cleanup');
  await new Promise((r) => setTimeout(r, 10));
  unsub();
  assert.equal(getJob('scan:cleanup').status, 'running');
  hold.release();
  // el cierre del stream sin done es error, pero lo importante: no fue cancelado
  const job = await p;
  assert.ok(!job.logs.some((l) => /cancelada/.test(l.text)));
});

test('cancel aborta y deja el job en reposo', async () => {
  fakeFetch((u, o) => sseResponse([sse('output', 'a')], o.signal, {}));
  const p = startScan('cleanup');
  await new Promise((r) => setTimeout(r, 10));
  cancel('scan:cleanup');
  const job = await p;
  assert.equal(job.status, 'idle');
  assert.ok(job.logs.some((l) => /cancelada/.test(l.text)));
});

test('startScan doble lanza un solo fetch', async () => {
  const hold = {};
  fakeFetch((u, o) => sseResponse(OK, o.signal, hold));
  const a = startScan('cleanup');
  const b = startScan('cleanup');
  assert.equal(a, b);
  await new Promise((r) => setTimeout(r, 10));
  hold.release();
  await a;
  assert.equal(calls.length, 1);
});

test('startRun usa la clave run:<modulo> y notifica al terminar', async () => {
  fakeFetch((u, o) => sseResponse(OK, o.signal));
  const finished = [];
  setOnJobFinished((k) => finished.push(k));
  const job = await startRun('cleanup', '/action/cleanup', { dryRun: true });
  assert.equal(job.status, 'done');
  assert.equal(getJob('run:cleanup').status, 'done');
  assert.deepEqual(finished, ['run:cleanup']);
});

test('scanAll avanza la cola, registra el error por modulo y sigue', async () => {
  fakeFetch((u, o) => (u.endsWith('/scan/b')
    ? sseResponse([sse('done', { exitCode: 1, timedOut: false })], o.signal)
    : sseResponse(OK, o.signal)));
  const finished = [];
  setOnJobFinished((k) => finished.push(k));
  const r = await scanAll(['a', 'b', 'c']);
  assert.equal(calls.length, 3);
  assert.equal(r.status, 'error');
  assert.deepEqual(Object.keys(r.errors), ['b']);
  assert.equal(getJob('scan:c').status, 'done');
  assert.deepEqual(finished, [SCAN_ALL]);
});

test('scanAll se cancela entero', async () => {
  fakeFetch((u, o) => sseResponse([sse('output', 'a')], o.signal, {}));
  const p = scanAll(['a', 'b', 'c']);
  await new Promise((r) => setTimeout(r, 10));
  cancel(SCAN_ALL);
  const r = await p;
  assert.equal(r.status, 'idle');
  assert.equal(calls.length, 1);
  assert.equal(getJob('scan:b').status, 'idle');
});

test('progress mal formado se ignora y no tumba el job', async () => {
  fakeFetch((u, o) => sseResponse([sse('progress', '{no es json'), sse('output', 'sigue'), sse('done', { exitCode: 0, timedOut: false })], o.signal));
  const job = await startScan('cleanup');
  assert.equal(job.status, 'done');
  assert.equal(job.error, null);
  assert.ok(job.logs.some((l) => l.text === 'sigue'));
});

test('done mal formado sigue siendo error', async () => {
  fakeFetch((u, o) => sseResponse([sse('done', '{roto')], o.signal));
  const job = await startScan('cleanup');
  assert.equal(job.status, 'error');
});
