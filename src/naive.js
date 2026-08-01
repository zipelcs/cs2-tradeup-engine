// The shapes most trade-up calculators use. They are here only so the tests and the benchmark can
// show how often each one disagrees with the game.
import { fr } from './f32.js';

const adj64 = i => (i.float - i.min) / (i.max - i.min);

/** Plain float64 lerp: lo + mean * (hi - lo). Often not even a value the game can store. */
export function naiveFloat64(inputs, out) {
  const mean = inputs.reduce((s, i) => s + adj64(i), 0) / inputs.length;
  return out.min + mean * (out.max - out.min);
}

/** float64 inside, rounded to float32 once at the end. Looks right, is wrong by up to a few steps. */
export function naiveRoundOnce(inputs, out) {
  return fr(naiveFloat64(inputs, out));
}

/** Mean rounded to float32, then a float64 lerp rounded again. Closer, still wrong. */
export function naiveRoundMean(inputs, out) {
  const mean = fr(inputs.reduce((s, i) => s + adj64(i), 0) / inputs.length);
  return fr(out.min + mean * (out.max - out.min));
}
