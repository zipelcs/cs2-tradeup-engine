import { fr, bits, fromBits } from './f32.js';
import { remap } from './remap.js';

/**
 * Exact landing distribution over every insertion order.
 *
 * float32 addition is not associative, so the order you place items in the contract can change the
 * stored float, usually by a few adjacent steps. Ten inputs have 10! = 3,628,800 orders. A sample of
 * them can miss a rare landing, so this enumerates them all with a subset DP instead of brute force:
 *
 *   state  = (bitmask of inputs already added, float32 bit pattern of the running sum)
 *   value  = number of orders that reach that state
 *
 * There are 2^n masks and only a handful of distinct partial sums per mask, so 10 inputs take a few
 * milliseconds instead of 3.6 million chain evaluations. A witness order is reconstructed for every
 * distinct landing, so each result comes with an exact click order.
 *
 * @param {number[]} adjs   adjusted floats of the inputs
 * @param {number} outMin   output skin range
 * @param {number} outMax
 * @returns {{float:number, orders:number, share:number, order:number[]}[]}  sorted by share, descending
 */
export function landingDistribution(adjs, outMin, outMax) {
  if (!Array.isArray(adjs) || adjs.length === 0) throw new RangeError('landingDistribution needs at least one input');
  if (adjs.some(x => !Number.isFinite(+x))) throw new RangeError('landingDistribution needs finite adjusted floats');
  const n = adjs.length;
  if (n > 16) throw new RangeError('subset DP is meant for trade-up sizes (5 or 10 inputs)');
  const a = adjs.map(fr), full = (1 << n) - 1;
  const dp = new Array(1 << n);
  dp[0] = new Map([[bits(0), 1]]);
  for (let mask = 0; mask < full; mask++) {
    const from = dp[mask];
    if (!from) continue;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      const to = dp[mask | (1 << i)] || (dp[mask | (1 << i)] = new Map());
      for (const [sb, count] of from) {
        const k = bits(fr(fromBits(sb) + a[i]));
        to.set(k, (to.get(k) || 0) + count);
      }
    }
  }
  let total = 0;
  const byLanding = new Map();
  for (const [sb, count] of dp[full]) {
    total += count;
    const f = remap(fr(fromBits(sb) / fr(n)), 0, 1, fr(outMin), fr(outMax));
    const e = byLanding.get(f) || { float: f, orders: 0, sums: [] };
    e.orders += count;
    e.sums.push(sb);
    byLanding.set(f, e);
  }
  const witness = sb => {
    const order = [];
    let mask = full, s = sb;
    while (mask) {
      let stepped = false;
      for (let i = 0; i < n && !stepped; i++) {
        if (!(mask & (1 << i))) continue;
        const prev = dp[mask ^ (1 << i)];
        if (!prev) continue;
        for (const p of prev.keys()) {
          if (bits(fr(fromBits(p) + a[i])) === s) { order.push(i); mask ^= 1 << i; s = p; stepped = true; break; }
        }
      }
      if (!stepped) throw new Error('witness reconstruction failed');
    }
    return order.reverse();
  };
  return [...byLanding.values()]
    .map(e => ({ float: e.float, orders: e.orders, share: e.orders / total, order: witness(e.sums[0]) }))
    .sort((x, y) => y.orders - x.orders);
}

/** Share of insertion orders that land exactly on `target`. */
export function shareOf(adjs, outMin, outMax, target) {
  const hit = landingDistribution(adjs, outMin, outMax).find(d => Object.is(d.float, fr(target)));
  return hit ? hit.share : 0;
}
