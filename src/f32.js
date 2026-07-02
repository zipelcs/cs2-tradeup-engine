// IEEE-754 single precision helpers. CS2 stores paint wear as a float32, so every value the game can
// hold is one rung of a discrete ladder. These helpers walk that ladder exactly.

export const fr = Math.fround;

const view = new DataView(new ArrayBuffer(4));

/** Raw 32-bit pattern of a float32 value. */
export function bits(x) {
  view.setFloat32(0, x);
  return view.getUint32(0);
}

/** float32 value of a 32-bit pattern. */
export function fromBits(u) {
  view.setUint32(0, u >>> 0);
  return view.getFloat32(0);
}

/** True when x is exactly representable as a float32 (a value the game could store). */
export function isFloat32(x) {
  return Object.is(fr(x), x);
}

/** The next float32 above x. */
export function nextUp(x) {
  x = fr(x);
  if (Number.isNaN(x) || x === Infinity) return x;
  if (x === 0) return fromBits(1);
  return x > 0 ? fromBits(bits(x) + 1) : fromBits(bits(x) - 1);
}

/** The next float32 below x. */
export function nextDown(x) {
  return -nextUp(-x);
}

/** Distance to the next float32 above |x|: the size of one step at that magnitude. */
export function ulp(x) {
  const a = fr(Math.abs(x));
  return nextUp(a) - a;
}

/** Number of float32 steps from a to b (both positive). */
export function stepsBetween(a, b) {
  return bits(fr(b)) - bits(fr(a));
}

/** Every float32 value in [lo, hi), for positive bounds. Refuses ranges wider than `limit` steps. */
export function valuesIn(lo, hi, limit = 1e6) {
  let u = bits(fr(lo));
  if (fromBits(u) < lo) u++;
  const out = [];
  while (fromBits(u) < hi) {
    out.push(fromBits(u));
    u++;
    if (out.length > limit) throw new RangeError(`more than ${limit} float32 values in [${lo}, ${hi})`);
  }
  return out;
}

/**
 * The float printed to `digits` significant digits (17 by default). Seventeen digits identify a
 * float32 exactly once it is widened to a double; this is not the shortest round-trip form.
 */
export function show(x, digits = 17) {
  return Number(x).toPrecision(digits);
}

/**
 * The float32 neighbours of a target: the largest step below it and the smallest step above it.
 * When x is itself a float32, `exact` is x and the neighbours are one step either side.
 */
export function twins(x) {
  const f = fr(x);
  if (f === x) return { exact: f, below: nextDown(f), above: nextUp(f) };
  return f < x ? { exact: null, below: f, above: nextUp(f) } : { exact: null, below: nextDown(f), above: f };
}
