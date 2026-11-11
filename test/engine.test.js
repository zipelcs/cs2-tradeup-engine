import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landing, adjust, isFloat32, fr } from '../src/index.js';
import { naiveFloat64 } from '../src/naive.js';
import { REFERENCE, CRAFT_A, CRAFT_B, CRAFT_K, toInputs } from '../fixtures/crafts.js';

test('reference vector lands on the exact float32', () => {
  const r = REFERENCE.range;
  const got = landing(REFERENCE.floats.map(f => ({ float: f, min: r.min, max: r.max })), r);
  assert.ok(Object.is(got, REFERENCE.expected), `got ${got}`);
});

test('craft A, forward order', () => {
  assert.ok(Object.is(landing(toInputs(CRAFT_A), CRAFT_A.output), CRAFT_A.forward));
});

test('craft B: forward and reversed land on different steps', () => {
  const fwd = landing(toInputs(CRAFT_B), CRAFT_B.output);
  const rev = landing(toInputs(CRAFT_B).reverse(), CRAFT_B.output);
  assert.ok(Object.is(fwd, CRAFT_B.forward), `forward ${fwd}`);
  assert.ok(Object.is(rev, CRAFT_B.reversed), `reversed ${rev}`);
  assert.notEqual(fwd, rev);
});

test('every landing is a value the game can store', () => {
  assert.ok(isFloat32(landing(toInputs(CRAFT_A), CRAFT_A.output)));
});

test('a float64 calculator misses craft A, and its answer is not even a float32', () => {
  const naive = naiveFloat64(toInputs(CRAFT_A), CRAFT_A.output);
  assert.ok(Math.abs(naive - CRAFT_A.naiveFloat64) < 1e-15, `naive ${naive}`);
  assert.ok(!isFloat32(naive));
});

test('adjusted floats are relative to each skin', () => {
  assert.equal(adjust(0.1, 0, 0.5), fr(0.2));
  assert.equal(adjust(0.1, 0, 1), fr(0.1));
  assert.equal(adjust(0.9, 0.06, 0.8), 1); // clamped
});



test('craft K: five coverts into a knife, the forward order gives the float the game stored', () => {
  assert.ok(Object.is(landing(toInputs(CRAFT_K), CRAFT_K.output), CRAFT_K.forward));
});

test('craft A: the game stored one step above the forward prediction', () => {
  assert.notEqual(landing(toInputs(CRAFT_A), CRAFT_A.output), CRAFT_A.actual);
  assert.ok(isFloat32(CRAFT_A.actual));
});
