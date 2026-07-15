import { fr, nextUp, nextDown } from './f32.js';

/**
 * Adjusted float: an input's raw wear as a fraction of its OWN skin's float range.
 * A 0.10 on a 0.00-0.50 skin contributes 0.20; the same 0.10 on a 0.00-1.00 skin contributes 0.10.
 */
export function adjust(raw, skinMin, skinMax) {
  if (!(skinMax > skinMin)) return 0;
  return Math.min(1, Math.max(0, (raw - skinMin) / (skinMax - skinMin)));
}

/** Mean of adjusted floats exactly as the game forms it: float32 adds in insertion order, then a float32 divide. */
export function meanAdjusted(adjs) {
  let s = fr(0);
  for (const a of adjs) s = fr(s + fr(a));
  return fr(s / fr(adjs.length));
}

/** Output float from adjusted inputs, in the order given, onto the output skin's [min, max]. */
export function landingFromAdjusted(adjs, outMin, outMax) {
  const m = meanAdjusted(adjs);
  const f = Math.min(outMax, Math.max(outMin, outMin + m * (outMax - outMin)));
  return Math.fround(f); // outputs snap to real float32 steps
}

/**
 * Output float of a trade-up.
 * @param {{float:number,min:number,max:number}[]} inputs  in insertion order (slot 1 = first added)
 * @param {{min:number,max:number}} output                  the output skin's float range
 */
export function landing(inputs, output) {
  return landingFromAdjusted(inputs.map(i => adjust(i.float, i.min, i.max)), output.min, output.max);
}

// ---- wear ---------------------------------------------------------------------------------------

export const WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
export const DECIMAL_EDGES = [0.07, 0.15, 0.38, 0.45];
/** Wear band of a float. */
export function wearOf(f) {
  const i = DECIMAL_EDGES.findIndex(e => f < e);
  return WEARS[i < 0 ? 4 : i];
}

/**
 * A solver target that keeps a safety margin below a wear edge: `margin` float32 steps under the edge
 * (13 by default; observed order jitter is about 2 steps). Returns null when the output skin's range
 * cannot reach that wear at all, so a 0.10-0.20 skin is never offered as Factory New.
 */
export function safeCap(index, outMin, outMax, margin = 13) {
  const edge = fr(DECIMAL_EDGES[index]);
  let cap = edge;
  for (let k = 0; k < margin; k++) cap = nextDown(cap);
  if (outMin != null && outMax != null && outMax > outMin) {
    if (fr(outMin) >= edge) return null;
    cap = Math.min(cap, fr(outMax));
    if (cap <= fr(outMin)) return null;
  }
  return cap;
}

// ---- odds ---------------------------------------------------------------------------------------

/**
 * Outcome odds. Each input contributes 1/n of the probability, split evenly across the next-rarity
 * skins of its own collection. Which skin you get is random; only the float is deterministic.
 * @param {string[]} inputCollections  collection of each input
 * @param {Record<string,string[]>} nextRarity  collection -> skins one rarity up
 */
export function outcomeOdds(inputCollections, nextRarity) {
  const n = inputCollections.length, odds = {};
  for (const col of inputCollections) {
    const outs = nextRarity[col];
    if (!outs || !outs.length) throw new Error(`no next-rarity outcomes for ${col}`);
    for (const skin of outs) odds[skin] = (odds[skin] || 0) + 1 / n / outs.length;
  }
  return odds;
}
