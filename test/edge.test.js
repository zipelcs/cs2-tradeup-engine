import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../src/index.js';
import { synthetic } from './helpers.js';
import { CRAFT_A, CRAFT_B, CRAFT_K, toInputs } from '../fixtures/crafts.js';

test('landingDistribution refuses an empty contract and non-finite inputs', () => {
  assert.throws(() => E.landingDistribution([], 0, 1), RangeError);
  assert.throws(() => E.landingDistribution([0.1, NaN], 0, 1), RangeError);
  assert.throws(() => E.landingDistribution(undefined, 0, 1), RangeError);
  assert.throws(() => E.meanAdjusted([]), RangeError);
  assert.throws(() => E.shareOf([], 0, 1, 0.5), RangeError);
});

test('wearOf refuses NaN and non-numbers instead of answering Battle-Scarred', () => {
  assert.throws(() => E.wearOf(NaN), RangeError);
  assert.throws(() => E.wearOf(undefined), RangeError);
  assert.throws(() => E.wearOf('0.05'), RangeError);
  assert.throws(() => E.decimalWearOf(NaN), RangeError);
  assert.equal(E.wearOf(1), 'Battle-Scarred');
  assert.equal(E.wearOf(0), 'Factory New');
});

test('robustness returns null for an empty contract', () => {
  assert.equal(E.robustness([], 0, 1), null);
});

test('the planner and the glitch scan do not read the clock', () => {
  for (const f of ['chain.js', 'glitch.js', 'solver.js', 'maxfloat.js', 'orders.js']) {
    const src = readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
    assert.ok(!/Date\.now|performance\.now|Math\.random/.test(src), f);
  }
});

test('glitch scan: the node budget decides, and the same call gives the same answer', () => {
  const P = { need: 5, label: 'synthetic', inputs: synthetic(70, 55, 0.33, 0.53), outs: [{ name: 'out', min: 0.06, max: 0.8 }] };
  const a = E.glitchScan([P]), b = E.glitchScan([P]);
  assert.equal(a.length, 1);
  assert.deepEqual(a, b);
  assert.deepEqual(E.glitchScan([P], { budget: 10 }), []);          // out of budget before a hit
  assert.deepEqual(E.glitchScan([P, P], { budget: a[0].nodes + 1 }).length, 1); // the second pool is never searched
});

test('a float64 solver target just under 0.07 is stored as the edge itself, which is Minimal Wear', () => {
  const target = 0.06999999997788109; // not a float32 value
  assert.ok(!E.isFloat32(target));
  assert.ok(Object.is(Math.fround(target), E.WEAR_EDGES[0]));
  assert.equal(E.wearOf(Math.fround(target)), 'Minimal Wear');
  assert.equal(E.decimalWearOf(target), 'Factory New'); // what a decimal comparison says
});

test('input precision: seven decimals move all three recorded crafts by a step, nine move none', () => {
  const at = (c, dp) => E.landing(toInputs(c).map(i => ({ ...i, float: +i.float.toFixed(dp) })), c.output);
  for (const c of [CRAFT_A, CRAFT_B, CRAFT_K]) {
    assert.equal(Math.abs(E.stepsBetween(c.forward, at(c, 7))), 1);
    assert.ok(Object.is(at(c, 9), c.forward));
  }
  // eight is enough for the two ten-input crafts and not for the five-input one
  assert.ok(Object.is(at(CRAFT_A, 8), CRAFT_A.forward) && Object.is(at(CRAFT_B, 8), CRAFT_B.forward));
  assert.equal(Math.abs(E.stepsBetween(CRAFT_K.forward, at(CRAFT_K, 8))), 1);
});

test('one float32 step near 0.0888 is 2^-27, so ten inputs share about 7.45e-8 of slack', () => {
  assert.equal(E.ulp(0.0888), 2 ** -27);
});
