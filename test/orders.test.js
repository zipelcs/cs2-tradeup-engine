import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landingDistribution, adjust, landingFromAdjusted } from '../src/index.js';
import { CRAFT_A, CRAFT_B, toInputs } from '../fixtures/crafts.js';

const adjsOf = c => toInputs(c).map(i => adjust(i.float, i.min, i.max));
const FACT10 = 3628800;

test('craft A: exact distribution over all 3,628,800 orders', () => {
  const d = landingDistribution(adjsOf(CRAFT_A), 0, 0.7);
  assert.equal(d.reduce((s, x) => s + x.orders, 0), FACT10);
  assert.equal(d.length, CRAFT_A.landings);
  assert.ok(Math.abs(d[0].share - CRAFT_A.topShare) < 5e-6, `top share ${d[0].share}`);
  assert.ok(Object.is(d[0].float, CRAFT_A.forward));
});

test('craft B: four landings, not the three a sampler reported', () => {
  const d = landingDistribution(adjsOf(CRAFT_B), 0, 0.7);
  assert.equal(d.reduce((s, x) => s + x.orders, 0), FACT10);
  assert.deepEqual(d.map(x => Math.round(x.share * 1e5) / 1e5), CRAFT_B.shares);
});

test('every landing comes with a witness order that reproduces it', () => {
  const adjs = adjsOf(CRAFT_B);
  for (const l of landingDistribution(adjs, 0, 0.7)) {
    assert.equal(new Set(l.order).size, adjs.length);
    assert.ok(Object.is(landingFromAdjusted(l.order.map(i => adjs[i]), 0, 0.7), l.float));
  }
});

test('order-free input (all equal) has one landing', () => {
  const d = landingDistribution(Array(10).fill(0.25), 0, 1);
  assert.equal(d.length, 1);
  assert.equal(d[0].share, 1);
});

