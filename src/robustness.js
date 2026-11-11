import { fr, nextUp, nextDown } from './f32.js';
import { landingFromAdjusted } from './tradeup.js';
import { landingDistribution } from './orders.js';

/**
 * How safe is a predicted landing to actually craft?
 *
 * A prediction can be exactly right and the craft can still miss: a tiny error in one input float, or
 * two look-alike copies placed in the wrong order, lands you on the neighbouring step. A real craft
 * predicted from 68.5% of orders was stored one step higher, which is where the 0.75 line came from.
 *
 * Measured:
 *   share  - fraction of insertion orders that reach this exact float (what decides fragility)
 *   nLand  - number of distinct landings across all orders
 *   dupes  - look-alike inputs: they show the same digits at the precision the contract grid displays
 *            but differ in their float32 bits, so they can be clicked in the wrong order unnoticed.
 *            Bit-identical inputs are not look-alikes: swapping them cannot change the sum.
 *   ulps   - smallest single-input error, in float32 steps (1-4, 5 = survived +/-4), that moves it
 *
 * Verdict:
 *   ROBUST   one landing only, so order cannot cost you the craft
 *   FRAGILE  look-alike inputs, or more than a quarter of orders miss
 *   OK       otherwise
 *
 * ulps is reported but not used in the verdict: a 1-step change on one input moves almost every
 * landing, so as a gate it flags everything and signals nothing.
 *
 * @param {number[]} adjs
 * @param {number} lo
 * @param {number} hi
 * @param {number} [target]
 * @param {{shown?:number}} [opts]  decimals the grid displays (default 9)
 */
export function robustness(adjs, lo, hi, target, opts = {}) {
  if (!adjs || !adjs.length || !(hi > lo)) return null;
  const shown = opts.shown == null ? 9 : opts.shown;
  const a = adjs.map(fr);
  const base = target != null ? fr(target) : landingFromAdjusted(a, lo, hi);

  const step = (x, d) => { let v = x; for (let k = 0; k < Math.abs(d); k++) v = d > 0 ? nextUp(v) : nextDown(v); return v; };
  let worst = Infinity;
  for (let i = 0; i < a.length; i++) {
    for (let d = 1; d <= 4; d++) {
      let moved = false;
      for (const sgn of [-1, 1]) {
        const c = a.slice();
        c[i] = step(a[i], sgn * d);
        if (!Object.is(landingFromAdjusted(c, lo, hi), base)) { moved = true; break; }
      }
      if (moved) { worst = Math.min(worst, d); break; }
    }
  }
  if (!Number.isFinite(worst)) worst = 5;

  // group by displayed digits; a group is a look-alike group only if it holds more than one bit pattern
  const groups = new Map();
  for (const x of a) {
    const k = x.toFixed(shown);
    if (!groups.has(k)) groups.set(k, new Set());
    groups.get(k).add(x);
  }
  let dupes = 0;
  for (const g of groups.values()) if (g.size > 1) dupes += g.size - 1;

  const L = landingDistribution(a, lo, hi);
  const mine = L.find(l => Object.is(l.float, base));
  const share = mine ? mine.share : 0;
  const nLand = L.length;

  let verdict;
  if (nLand === 1) verdict = 'ROBUST';
  else if (dupes > 0 || share < 0.75) verdict = 'FRAGILE';
  else verdict = 'OK';
  return { ulps: worst, dupes, share, nLand, verdict };
}
