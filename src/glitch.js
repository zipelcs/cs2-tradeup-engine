// Glitch-wear scan: craft a float the game classifies one band worse than its digits read.
//
// Matching is exact float32 equality. There is no tolerance window: one step below the glitched
// float is an ordinary item.

import { GLITCH_FLOATS } from './tradeup.js';
import { stepSolve } from './solver.js';

/**
 * Which skins can hold a glitched float, grouped by float range, with the mean adjusted float a
 * contract needs to land it. A 0.00-0.08 finish holds neither; a 0.40-1.00 finish only the 0.45 one.
 * @param {object[]} skins   catalogue entries (pass the knives and gloves, or any outputs)
 * @param {number} [which]   0 for the 0.38 float, 1 for the 0.45 float
 */
export function glitchTargets(skins, which = 0) {
  const g = GLITCH_FLOATS[which], fams = new Map();
  for (const s of skins) {
    if (!(s.max > s.min) || !(g.float > s.min && g.float < s.max)) continue;
    const k = s.min + '-' + s.max;
    if (!fams.has(k)) fams.set(k, { min: s.min, max: s.max, needMean: (g.float - s.min) / (s.max - s.min), skins: [] });
    fams.get(k).skins.push(s.name);
  }
  return { glitch: g, families: [...fams.values()] };
}

/**
 * Scan craftable pools for a contract that lands exactly on a glitched float.
 * @param {object[]} pools   from custom.buildPools
 * @param {{which?:number, cap?:number, budget?:number}} [opts]  cap: nodes per search; budget: nodes in total
 */
export function glitchScan(pools, opts = {}) {
  const g = GLITCH_FLOATS[opts.which || 0], hits = [], cap = opts.cap || 7e5;
  let left = opts.budget || 2e7; // total node budget, so a scan is deterministic
  for (const P of pools) {
    if (left <= 0) break;
    const fams = {};
    for (const o of P.outs) {
      if (o.max > o.min && g.float > o.min && g.float < o.max) {
        const k = o.min + '|' + o.max;
        (fams[k] = fams[k] || { lo: o.min, hi: o.max, outs: [] }).outs.push(o.name);
      }
    }
    for (const G of Object.values(fams)) {
      const m = (g.float - G.lo) / (G.hi - G.lo), eps = 3 * 1.2e-7 / (G.hi - G.lo);
      if (left <= 0) break;
      const hit = stepSolve(P.inputs, P.need, (m - eps) * P.need, (m + eps) * P.need, G.lo, G.hi, v => Object.is(v, g.float), Math.min(cap, left));
      if (hit) left -= hit.nodes;
      if (hit && hit.float != null) hits.push({ pool: P.label, outs: G.outs, lo: G.lo, hi: G.hi, ...hit });
    }
  }
  return hits;
}
