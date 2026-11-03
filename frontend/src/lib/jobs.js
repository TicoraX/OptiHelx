// Store de operaciones SSE a nivel de modulo: vive fuera del arbol de rutas,
// asi navegar no aborta ni "olvida" un escaneo o una accion en curso.
// Solo cancel() (boton Cancelar) aborta.
import { useSyncExternalStore } from 'react';
import { API_BASE } from '../config.js';

const SCAN_TIMEOUT_MS = 330000;
const ACTION_TIMEOUT_MS = 660000;
const RATE_LIMIT_MSG = 'Demasiadas solicitudes: se alcanzó el límite de escaneos. Espera unos minutos y reintenta.';

export const SCAN_ALL = 'scanAll';
export const IDLE = Object.freeze({ status: 'idle', error: null, logs: [], progress: null, startedAt: null, finishedAt: null });

const jobs = new Map(); // clave -> snapshot inmutable (se reemplaza en cada cambio)
const controllers = new Map(); // clave -> AbortController del job en curso
const inflight = new Map(); // clave -> promesa del job en curso
const listeners = new Set();
let onFinished = null;
let scanAllCancelled = false;
let currentScanKey = null;

const emit = () => listeners.forEach((l) => l());
const patch = (key, fields) => {
  jobs.set(key, { ...(jobs.get(key) ?? IDLE), ...fields });
  emit();
};
const appendLog = (key, entry) => patch(key, { logs: [...jobs.get(key).logs, entry] });

export const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const getJob = (key) => jobs.get(key) ?? IDLE;
export const setOnJobFinished = (fn) => { onFinished = fn; };
export const clearError = (key) => {
  if (getJob(key).status === 'error') patch(key, { status: 'idle', error: null });
};
export const resetForTests = () => {
  jobs.clear(); controllers.clear(); inflight.clear(); listeners.clear();
  onFinished = null; scanAllCancelled = false; currentScanKey = null;
};

export const useJob = (key) => useSyncExternalStore(subscribe, () => getJob(key));
// Devuelve un booleano: snapshot estable sin crear objetos nuevos.
export const useAnyRunning = (prefix) => useSyncExternalStore(subscribe, () => {
  for (const [k, j] of jobs) if (k.startsWith(prefix) && j.status === 'running') return true;
  return false;
});

async function httpErrorMessage(res) {
  if (res.status === 429) return RATE_LIMIT_MSG;
  const body = await res.json().catch(() => null);
  return body?.error || `El servidor respondió ${res.status}`;
}

// Lee el stream SSE y devuelve el evento done (o null) y el ultimo texto de error.
// Un stream que termina sin done es un error: nunca cuenta como exito.
async function consumeStream(key, res) {
  const reader = res.body?.getReader();
  if (!reader) throw new Error('No se pudo inicializar la lectura del stream SSE');
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let event = 'message';
  let data = [];
  let done = null;
  let errorText = null;

  const handle = (name, payload) => {
    if (name === 'progress') {
      patch(key, { progress: JSON.parse(payload) });
    } else if (name === 'output') {
      appendLog(key, { type: 'output', text: payload });
    } else if (name === 'error') {
      errorText = payload;
    } else if (name === 'done') {
      done = JSON.parse(payload);
    }
  };
  const flush = () => {
    if (data.length > 0) handle(event, data.join('\n'));
    event = 'message';
    data = [];
  };
  const line = (raw) => {
    const t = raw.trim();
    if (!t) flush();
    else if (t.startsWith('event:')) event = t.slice(6).trim();
    else if (t.startsWith('data:')) data.push(t.slice(5).trim());
  };

  while (true) {
    const { done: eof, value } = await reader.read();
    if (eof) {
      if (buffer) line(buffer);
      flush();
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    lines.forEach(line);
  }
  return { done, errorText };
}

function runJob(key, endpoint, body, { notify = true } = {}) {
  if (inflight.has(key)) return inflight.get(key);

  const ctrl = new AbortController();
  controllers.set(key, ctrl);
  let reason = null;
  const timeoutMs = endpoint.startsWith('/action/') ? ACTION_TIMEOUT_MS : SCAN_TIMEOUT_MS;
  const timer = setTimeout(() => { reason = 'timeout'; ctrl.abort(); }, timeoutMs);
  ctrl.signal.addEventListener('abort', () => { reason ??= 'cancel'; });

  patch(key, {
    status: 'running', error: null, progress: null, startedAt: Date.now(), finishedAt: null,
    logs: [{ type: 'system', text: `[SISTEMA] Iniciando ejecucion de ${endpoint.startsWith('/scan/') ? 'escaneo' : 'acciones'}...` }],
  });

  const promise = (async () => {
    let failure = null;
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(await httpErrorMessage(res));
      const { done, errorText } = await consumeStream(key, res);
      if (!done) {
        failure = errorText || 'El servidor cerró la conexión sin terminar la operación.';
      } else if (done.exitCode !== 0) {
        const code = done.exitCode ?? 'desconocido';
        failure = errorText || `Proceso terminado con código de salida: ${code}.`;
        if (done.timedOut) failure += ' (excedió el tiempo límite)';
      } else {
        appendLog(key, { type: 'system', text: '\n[SISTEMA] Proceso completado exitosamente.' });
      }
    } catch (err) {
      if (reason === 'cancel') {
        appendLog(key, { type: 'system', text: '\n[SISTEMA] Operación cancelada por el operador.' });
      } else if (reason === 'timeout') {
        failure = 'Tiempo de espera agotado: la operación excedió el límite.';
      } else {
        failure = err.message;
      }
    } finally {
      clearTimeout(timer);
      controllers.delete(key);
      inflight.delete(key);
    }

    if (failure) appendLog(key, { type: 'error', text: `[ERROR] ${failure}` });
    patch(key, {
      status: failure ? 'error' : reason === 'cancel' ? 'idle' : 'done',
      error: failure, progress: null, finishedAt: Date.now(),
    });
    if (notify) onFinished?.(key);
    return getJob(key);
  })();

  inflight.set(key, promise);
  return promise;
}

export const startScan = (module, body = {}) => runJob(`scan:${module}`, `/scan/${module}`, body);

// Un escaneo lanzado desde ReportViewer comparte clave con el del dashboard;
// las acciones van en `run:<module>`.
export const startRun = (module, endpoint, body) => {
  const kind = endpoint.startsWith('/scan/') ? 'scan' : 'run';
  return runJob(`${kind}:${module}`, endpoint, body);
};

export function cancel(key) {
  if (key === SCAN_ALL) {
    scanAllCancelled = true;
    if (currentScanKey) controllers.get(currentScanKey)?.abort();
    return;
  }
  controllers.get(key)?.abort();
}

export function scanAll(modules) {
  if (inflight.has(SCAN_ALL)) return inflight.get(SCAN_ALL);
  if (modules.length === 0) return Promise.resolve(getJob(SCAN_ALL));
  scanAllCancelled = false;
  patch(SCAN_ALL, {
    status: 'running', error: null, startedAt: Date.now(), finishedAt: null,
    current: 0, total: modules.length, module: null, errors: {},
  });

  const promise = (async () => {
    const errors = {};
    for (let i = 0; i < modules.length && !scanAllCancelled; i++) {
      const m = modules[i];
      currentScanKey = `scan:${m}`;
      patch(SCAN_ALL, { current: i + 1, module: m });
      const result = await runJob(currentScanKey, `/scan/${m}`, {}, { notify: false });
      if (result.status === 'error') errors[m] = result.error;
    }
    currentScanKey = null;
    const failed = Object.keys(errors);
    const error = failed.length ? `${failed.length} de ${modules.length} módulos fallaron: ${failed.join(', ')}` : null;
    inflight.delete(SCAN_ALL);
    patch(SCAN_ALL, {
      status: scanAllCancelled ? 'idle' : error ? 'error' : 'done',
      error, errors, finishedAt: Date.now(),
    });
    onFinished?.(SCAN_ALL);
    return getJob(SCAN_ALL);
  })();
  inflight.set(SCAN_ALL, promise);
  return promise;
}
