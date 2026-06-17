import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { synthetic } from './helpers.js';

test('the catalogue writes constants as digit strings behind leading zeros', () => {
  const cat = E.constantCatalogue(0, 1);
  const near = (label, v) => cat.some(c => c.label === label && Math.abs(c.value - v) < 1e-7);
  assert.ok(near('pi', 0.31415926535897));
  assert.ok(near('pi', 0.0031415926535897));
  assert.ok(near('1/7 cycle', 0.142857142857));
  assert.ok(near('e', 0.27182818284590));
  assert.ok(near('Apery zeta(3)', 0.12020569031595));
});

test('targets are gated by the output range', () => {
  const cat = E.constantCatalogue(0, 0.08);
  assert.ok(cat.length > 0 && cat.every(c => c.value <= 0.08));
  assert.ok(!cat.some(c => Math.abs(c.value - 0.31415926535897) < 1e-7));
});

test('the score ranks by longest prefix match', () => {
  assert.equal(E.constantScore(0.3141592).label, 'pi');
  assert.ok(E.constantScore(0.31415926).score > E.constantScore(0.31417).score);
  assert.equal(E.constantScore(0.0142857).label, '1/7 cycle');
  assert.equal(E.constantScore(0.1234321).label, 'palindrome');
  assert.equal(E.constantScore(0.2953817).score, 0);
});

test('a pool is searched toward the constants, and the search is repeatable', () => {
  const P = { need: 10, label: 'synthetic pool', inputs: synthetic(60, 77, 0.05, 0.6), outs: [{ name: 'out', min: 0, max: 1 }] };
  const a = E.constantSearch(P, { trials: 20000, minLen: 4 }), b = E.constantSearch(P, { trials: 20000, minLen: 4 });
  assert.ok(a.length > 0);
  assert.deepEqual(a.map(h => h.float), b.map(h => h.float));
  const top = a[0];
  assert.ok(top.len >= 4);
  assert.equal(E.landingFromAdjusted(top.items.map(x => x.adj), 0, 1), top.float);
});
