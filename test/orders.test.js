import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landingDistribution, adjust, landingFromAdjusted, stepsBetween } from '../src/index.js';
import { CRAFT_A, CRAFT_B, CRAFT_K, toInputs } from '../fixtures/crafts.js';

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

// ---- properties -----------------------------------------------------------------------------------

const CRAFTS = [['A', CRAFT_A], ['B', CRAFT_B], ['K', CRAFT_K]];

test('property: the shares of every craft sum to 1 and the order counts sum to n!', () => {
  for (const [name, c] of CRAFTS) {
    const d = landingDistribution(adjsOf(c), c.output.min, c.output.max);
    const fact = c.inputs.length === 10 ? FACT10 : 120;
    assert.equal(d.reduce((s, x) => s + x.orders, 0), fact, name);
    assert.ok(Math.abs(d.reduce((s, x) => s + x.share, 0) - 1) < 1e-12, name);
  }
});

test('property: every witness order of every craft reproduces its landing', () => {
  for (const [name, c] of CRAFTS) {
    const adjs = adjsOf(c);
    for (const l of landingDistribution(adjs, c.output.min, c.output.max)) {
      assert.deepEqual(l.order.slice().sort((a, b) => a - b), adjs.map((_, i) => i), name);
      assert.ok(Object.is(landingFromAdjusted(l.order.map(i => adjs[i]), c.output.min, c.output.max), l.float), name);
    }
  }
});

test('property: 300 seeded random orders per craft all land inside the exact set', () => {
  let s = 20260715;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  for (const [name, c] of CRAFTS) {
    const adjs = adjsOf(c);
    const exact = new Set(landingDistribution(adjs, c.output.min, c.output.max).map(l => l.float));
    const seen = new Set();
    for (let t = 0; t < 300; t++) {
      const o = adjs.slice();
      for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
      const f = landingFromAdjusted(o, c.output.min, c.output.max);
      assert.ok(exact.has(f), name);
      seen.add(f);
    }
    assert.ok(seen.size > 1, name + ': the random orders reach more than one landing');
  }
});

test('property: for five inputs the DP equals brute force over all 120 orders', () => {
  const adjs = adjsOf(CRAFT_K), counts = new Map();
  const walk = (rest, picked) => {
    if (!rest.length) { const f = landingFromAdjusted(picked, 0.06, 0.8); counts.set(f, (counts.get(f) || 0) + 1); return; }
    rest.forEach((x, i) => walk(rest.filter((_, j) => j !== i), [...picked, x]));
  };
  walk(adjs, []);
  const d = landingDistribution(adjs, 0.06, 0.8);
  assert.equal(d.length, counts.size);
  for (const l of d) assert.equal(counts.get(l.float), l.orders);
});

// ---- what the recorded crafts show ------------------------------------------------------------------

test('craft K: the forward order gives the float the game stored, from 58 of 120 orders', () => {
  const adjs = adjsOf(CRAFT_K);
  assert.ok(Object.is(landingFromAdjusted(adjs, 0.06, 0.8), CRAFT_K.forward));
  const d = landingDistribution(adjs, 0.06, 0.8);
  assert.equal(d.length, CRAFT_K.landings);
  assert.equal(d.find(l => Object.is(l.float, CRAFT_K.forward)).orders, CRAFT_K.orders);
});

test('craft A: the game stored the step above the forward prediction, which 31.3% of orders reach', () => {
  const d = landingDistribution(adjsOf(CRAFT_A), 0, 0.7);
  assert.equal(stepsBetween(CRAFT_A.forward, CRAFT_A.actual), 1);
  assert.notEqual(landingFromAdjusted(adjsOf(CRAFT_A), 0, 0.7), CRAFT_A.actual); // the model missed
  const hit = d.find(l => Object.is(l.float, CRAFT_A.actual));
  assert.ok(hit && Math.abs(hit.share - CRAFT_A.actualShare) < 5e-6, String(hit && hit.share));
});
