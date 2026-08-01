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

test('the same contract has three landings; the tool reports the near miss with its share', () => {
  const sel = E.customFloat(chroma3(), 0.00666666, DOPPLER, { n: 5 });
  const L = E.landingDistribution(sel.map(x => x.adj), 0, 0.08);
  assert.equal(L.length, 3);
  assert.ok(Object.is(L[0].float, 0.0066795460879802704));
  assert.ok(Math.abs(L[0].share - 0.7) < 1e-12);
});

test('the sweep ranks every pool by distance and does not call a miss a hit', () => {
  // a deliberately tiny pool: seventeen inputs cannot reach this float
  const rows = E.customSweep(0.0088888881728, E.buildPools(chroma3(), catalogue));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].exact, false);
  assert.ok(Object.is(rows[0].float, 0.0078994277864694595));
  assert.ok(Math.abs(rows[0].diff - 9.895e-4) < 1e-6);
  const f = E.feasibility(chroma3().map(x => x.adj), 5, 5 * 0.0088888881728 / 0.08);
  assert.ok(f.minMean <= f.needMean && f.needMean <= f.maxMean, 'the mean is inside the window; the step is not reachable');
});
