import { fr } from './f32.js';

/**
 * RemapValClamped, as the game runs it: map `val` from [A, B] onto [C, D], clamped to [0, 1] in the
 * middle. Every operation is rounded to float32, the clamp included. Rounding once at the end gives a
 * different answer on a large share of random contracts; bench/accuracy.js measures it.
 */
export function remap(val, A, B, C, D) {
  if (A === B) return val - B >= 0 ? D : C;
  let c = fr(fr(val - A) / fr(B - A));
  c = Math.min(1, Math.max(0, c));
  return fr(fr(C) + fr(fr(D - C) * c));
}
