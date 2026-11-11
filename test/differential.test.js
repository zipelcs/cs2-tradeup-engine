import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landing } from '../src/index.js';

// A second implementation of the chain, written without the engine. It imports nothing from src/ and
// never calls Math.fround. Every intermediate value is stored into a Float32Array cell, and the typed
// array does the rounding to single precision. The clamp is written as branches, not min and max.
const R = new Float32Array(6), S = new Float32Array(2);

function remapRef(val, A, B, C, D) {
  R[0] = val; R[1] = A; R[2] = B; R[3] = C; R[4] = D;
  if (R[1] === R[2]) return R[0] - R[2] >= 0 ? R[4] : R[3];
  R[5] = R[0] - R[1];
  R[1] = R[2] - R[1];
  R[5] = R[5] / R[1];
  if (R[5] < 0) R[5] = 0; else if (R[5] > 1) R[5] = 1;
  R[4] = R[4] - R[3];
  R[5] = R[4] * R[5];
  R[5] = R[3] + R[5];
  return R[5];
}

function landingRef(inputs, output) {
  S[0] = 0;
  for (const i of inputs) {
    S[1] = remapRef(i.float, i.min, i.max, 0, 1);
    S[0] = S[0] + S[1];
  }
  S[1] = inputs.length;
  S[0] = S[0] / S[1];
  return remapRef(S[0], 0, 1, output.min, output.max);
}

test('the reference is not the engine: it reproduces the published vector on its own', () => {
  const floats = [0.3666255176067352294921875, 0.377684891223907470703125, 0.358720242977142333984375, 0.2542461454868316650390625,
    0.374294698238372802734375, 0.35603535175323486328125, 0.23788045346736907958984375, 0.325074136257171630859375,
    0.375528275966644287109375, 0.3578624725341796875];
  const got = landingRef(floats.map(f => ({ float: f, min: 0.06, max: 0.8 })), { min: 0.06, max: 0.8 });
  assert.ok(Object.is(got, 0.33839523792266846), String(got));
});

test('differential: 20,000 random contracts, the engine and the Float32Array reference agree bit for bit', () => {
  let seed = 42;
  const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  const RANGES = [[0, 1], [0, 0.7], [0.06, 0.8], [0.1, 0.38], [0.14, 0.65], [0.4, 1.0], [0, 0.08], [0, 0.5], [0, 0.57], [0, 0.92]];
  const pick = () => RANGES[Math.floor(rnd() * RANGES.length)];
  const one = new Float32Array(1);
  let mismatches = 0, notF32 = 0, distinct = new Set();
  for (let k = 0; k < 20000; k++) {
    const [lo, hi] = pick();
    const n = rnd() < 0.5 ? 10 : 5;
    const inputs = [];
    for (let i = 0; i < n; i++) {
      const [min, max] = pick();
      // one in fifty inputs sits outside its own range, so the clamp is exercised too
      const raw = rnd() < 0.02 ? rnd() : min + rnd() * (max - min);
      inputs.push({ float: raw, min, max });
    }
    const got = landing(inputs, { min: lo, max: hi });
    if (!Object.is(got, landingRef(inputs, { min: lo, max: hi }))) mismatches++;
    one[0] = got;
    if (!Object.is(one[0], got)) notF32++;
    distinct.add(got);
  }
  assert.equal(mismatches, 0);
  assert.equal(notF32, 0);
  assert.ok(distinct.size > 15000, 'the contracts are not all landing on the same few values');
});
