import { test } from 'node:test';
import assert from 'node:assert/strict';
import { robustness, adjust, landingFromAdjusted, fr, nextUp } from '../src/index.js';
import { CRAFT_A, toInputs } from '../fixtures/crafts.js';

const adjsOf = c => toInputs(c).map(i => adjust(i.float, i.min, i.max));

test('craft A (predicted at a 68.5% share, missed by one step) reads FRAGILE', () => {
  const r = robustness(adjsOf(CRAFT_A), 0, 0.7);
  assert.equal(r.verdict, 'FRAGILE');
  assert.equal(r.nLand, 3);
  assert.ok(Math.abs(r.share - 0.68501) < 0.001, `share ${r.share}`);
});

test('a contract of ten well-separated floats is not FRAGILE', () => {
  const spread = Array.from({ length: 10 }, (_, i) => adjust(0.02 + i * 0.07, 0, 1));
  assert.notEqual(robustness(spread, 0, 1).verdict, 'FRAGILE');
});

test('one landing only reads ROBUST; bit-identical inputs are not look-alikes', () => {
  const r = robustness(Array(10).fill(fr(0.25)), 0, 1);
  assert.equal(r.verdict, 'ROBUST');
  assert.equal(r.dupes, 0); // swapping identical inputs cannot change the sum
});

test('look-alikes show the same digits but differ in float32 bits, and make a contract FRAGILE', () => {
  const a = fr(0.123456789), b = nextUp(a);
  assert.equal(a.toFixed(6), b.toFixed(6));
  assert.notEqual(a, b);
  const adjs = [a, b, fr(0.31), fr(0.07), fr(0.55), fr(0.42), fr(0.18), fr(0.66), fr(0.09), fr(0.27)];
  const coarse = robustness(adjs, 0, 1, undefined, { shown: 6 });
  assert.equal(coarse.dupes, 1);
  if (coarse.nLand > 1) assert.equal(coarse.verdict, 'FRAGILE');
  assert.equal(robustness(adjs, 0, 1, undefined, { shown: 12 }).dupes, 0); // enough digits to tell them apart
});

test('chain equality over 20,000 random contracts against an independent reference', () => {
  // written separately from src/, so a change to the engine cannot also change the reference
  const ref = (val, A, B, C, D) => {
    if (A === B) return val - B >= 0 ? D : C;
    let c = fr(fr(val - A) / fr(B - A));
    c = Math.min(1, Math.max(0, c));
    return fr(fr(C) + fr(fr(D - C) * c));
  };
  const chain = (adjs, lo, hi) => {
    let s = fr(0);
    for (const a of adjs) s = fr(s + fr(a));
    return ref(fr(s / fr(adjs.length)), 0, 1, fr(lo), fr(hi));
  };
  let seed = 42;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const RANGES = [[0, 1], [0, 0.7], [0.06, 0.8], [0.1, 0.38], [0.14, 0.65], [0.4, 1.0]];
  const CAPS = [1.0, 0.7, 0.57, 0.9, 0.5, 0.8];
  let mismatches = 0, notF32 = 0;
  for (let k = 0; k < 20000; k++) {
    const [lo, hi] = RANGES[Math.floor(rnd() * RANGES.length)];
    const n = rnd() < 0.5 ? 10 : 5;
    const adjs = [];
    for (let i = 0; i < n; i++) { const c = CAPS[Math.floor(rnd() * CAPS.length)]; adjs.push(adjust(rnd() * c, 0, c)); }
    const got = landingFromAdjusted(adjs, lo, hi);
    if (!Object.is(got, chain(adjs, lo, hi))) mismatches++;
    if (!Object.is(got, fr(got))) notF32++;
  }
  assert.equal(mismatches, 0);
  assert.equal(notF32, 0);
});
