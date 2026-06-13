import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { chroma3, synthetic } from './helpers.js';

const T = E.targetAdjusted(0.069999992847442627, { min: 0, max: 0.08 });

test('xN never uses an item twice and sorts best first', () => {
  const pool = synthetic(120, 13, 0, 0.3);
  const r = E.multiContract(pool, { n: 10, objective: 'under', T: 0.1 }, 6);
  assert.equal(r.contracts.length, 6);
  const all = r.contracts.flat();
  assert.equal(new Set(all).size, 60);
  const sums = r.contracts.map(c => E.stats(c).sum);
  assert.deepEqual(sums, sums.slice().sort((a, b) => b - a));
  assert.ok(sums.every(s => s <= 1 + 1e-9));
  assert.equal(r.leftovers.length, 60);
});

test('xN is capped at 50 and says so', () => {
  const r = E.multiContract(synthetic(30, 14, 0, 0.3), { n: 10, objective: 'under', T: 0.2 }, 80);
  assert.equal(r.capped, true);
  assert.equal(r.contracts.length, 3);
});


