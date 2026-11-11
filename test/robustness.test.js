import { test } from 'node:test';
import assert from 'node:assert/strict';
import { robustness, adjust, fr, nextUp } from '../src/index.js';
import { CRAFT_A, toInputs } from '../fixtures/crafts.js';

const adjsOf = c => toInputs(c).map(i => adjust(i.float, i.min, i.max));

test('craft A (predicted from 68.5% of orders, stored one step higher) reads FRAGILE', () => {
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
  assert.equal(coarse.nLand, 4);
  assert.equal(coarse.verdict, 'FRAGILE');
  assert.equal(robustness(adjs, 0, 1, undefined, { shown: 12 }).dupes, 0); // enough digits to tell them apart
});

