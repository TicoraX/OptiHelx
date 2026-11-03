// node --test src/lib/status.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeStatus } from './status.js';

test('clave igual conserva la referencia previa', () => {
  const prev = { a: { n: 1 }, b: { n: 2 } };
  const out = mergeStatus(prev, { a: { n: 1 }, b: { n: 2 } });
  assert.equal(out.a, prev.a);
  assert.equal(out.b, prev.b);
});

test('clave cambiada recibe referencia nueva y las demas se conservan', () => {
  const prev = { a: { n: 1 }, b: { n: 2 } };
  const next = { a: { n: 1 }, b: { n: 3 } };
  const out = mergeStatus(prev, next);
  assert.equal(out.a, prev.a);
  assert.equal(out.b, next.b);
  assert.deepEqual(out.b, { n: 3 });
});

test('clave nueva entra y clave eliminada sale', () => {
  const prev = { a: { n: 1 }, gone: { n: 9 } };
  const next = { a: { n: 1 }, fresh: { n: 5 } };
  const out = mergeStatus(prev, next);
  assert.equal(out.a, prev.a);
  assert.equal(out.fresh, next.fresh);
  assert.ok(!('gone' in out));
});

test('sin estado previo devuelve el nuevo', () => {
  const next = { a: 1 };
  assert.equal(mergeStatus(null, next), next);
});
