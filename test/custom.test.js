import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { chroma3, synthetic, catalogue } from './helpers.js';

const DOPPLER = { min: 0, max: 0.08 };

test('custom float picks the contract closest to the target sum', () => {
  const sel = E.customFloat(chroma3(), 0.00666666, DOPPLER, { n: 5 });
  assert.deepEqual(sel.map(x => x.id).sort(), ['c1', 'c2', 'c3', 'c6', 'c7']);
  assert.ok(Math.abs(E.stats(sel).sum - 0.417471664) < 1e-6);
});

test('exactCore gets closer than its seed', () => {
  const pool = synthetic(50, 4, 0, 0.6), T = 2.5;
  const seed = pool.slice().sort((a, b) => Math.abs(a.adj - T / 10) - Math.abs(b.adj - T / 10)).slice(0, 10);
  const sel = E.exactCore(pool, 10, T);
  assert.ok(Math.abs(E.stats(sel).sum - T) <= Math.abs(E.stats(seed).sum - T));
  assert.ok(Math.abs(E.stats(sel).sum - T) < 1e-4);
});

test('closestSum and the craftable pools of an inventory', () => {
  const pools = E.buildPools(chroma3(), catalogue);
  assert.equal(pools.length, 1);
  assert.equal(pools[0].need, 5);
  assert.equal(pools[0].inputs.length, 17);
  assert.ok(pools[0].outs.some(o => o.name.includes('Karambit | Doppler')));
  const sol = E.closestSum(pools[0].inputs, 5, 0.41666625);
  assert.ok(Math.abs(sol.sum - 0.417471664) < 1e-6);
});

