import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepSolve, sumWindow, verifyHit, feasibility, landingFromAdjusted, fr } from '../src/index.js';

// a synthetic pool of 30 adjusted floats, seeded
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const pool = Array.from({ length: 30 }, (_, i) => ({ id: 'L' + i, adj: fr(0.05 + rnd() * 0.3) }));
const byId = Object.fromEntries(pool.map(x => [x.id, x.adj]));

test('finds a subset whose witness order lands exactly on a reachable target', () => {
  // the target is a real landing of some ten-subset, so it is reachable by construction
  const target = landingFromAdjusted(pool.slice(3, 13).map(x => x.adj), 0, 0.7);
  const [lo, hi] = sumWindow(target, 10, 0, 0.7);
  const hit = stepSolve(pool, 10, lo, hi, 0, 0.7, f => Object.is(f, target));
  assert.ok(hit && !hit.capped, 'no hit');
  assert.ok(Object.is(landingFromAdjusted(hit.order.map(id => byId[id]), 0, 0.7), target));
  assert.equal(new Set(hit.ids).size, 10);
  assert.ok(hit.share > 0 && hit.share <= 1 && hit.landings >= 1);
});

test('an impossible window returns null, and a tiny node budget says it was capped', () => {
  assert.equal(stepSolve(pool, 10, 100, 101, 0, 0.7, () => true), null);
  assert.equal(stepSolve(pool, 10, 0, 100, 0, 0.7, () => false, 50).capped, true);
});

test('verifyHit keeps a reachable float, drops a phantom, and can rescue onto a real landing', () => {
  const ids = pool.slice(0, 10).map(x => x.id);
  const real = landingFromAdjusted(ids.map(id => byId[id]), 0, 0.7);
  const ok = verifyHit({ ids, float: real, lo: 0, hi: 0.7 }, id => byId[id]);
  assert.ok(ok.verified && !ok.rescued && Object.is(ok.float, real));
  const phantom = real + 1e-12; // a float64 value no insertion order can store
  assert.equal(verifyHit({ ids, float: phantom, lo: 0, hi: 0.7 }, id => byId[id]), null);
  const rescued = verifyHit({ ids, float: phantom, lo: 0, hi: 0.7 }, id => byId[id], L => L[0]);
  assert.ok(rescued.rescued && Object.is(fr(rescued.float), rescued.float));
});

test('feasibility explains the reachable window', () => {
  const f = feasibility(pool.map(x => x.adj), 10, 10 * 0.9);
  assert.ok(f.maxMean < 0.9 && f.gap > 0);
  assert.ok(f.minMean <= f.bestMean && f.bestMean <= f.maxMean);
});
