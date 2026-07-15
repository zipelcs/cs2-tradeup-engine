// Glitch-wear scan: craft a float the game classifies one band worse than its digits read.
//
// Matching is exact float32 equality. There is no tolerance window: one step below the glitched
// float is an ordinary item.

import { fr } from './f32.js';
// the last-known pair of edge floats; which band the game stores them in was settled later
const GLITCH_FLOATS = [{ edge: 0.38, float: fr(0.38) }, { edge: 0.45, float: fr(0.45) }];

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

