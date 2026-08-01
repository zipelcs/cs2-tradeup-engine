import { fr, nextUp, nextDown } from './f32.js';
import { remap } from './remap.js';

/**
 * Adjusted float: an input's raw wear as a fraction of its OWN skin's float range.
 * A 0.10 on a 0.00-0.50 skin contributes 0.20; the same 0.10 on a 0.00-1.00 skin contributes 0.10.
 */
export function adjust(raw, skinMin, skinMax) {
  return remap(fr(raw), fr(skinMin), fr(skinMax), 0, 1);
}

/** Mean of adjusted floats exactly as the game forms it: float32 adds in insertion order, then a float32 divide. */
export function meanAdjusted(adjs) {
  let s = fr(0);
  for (const a of adjs) s = fr(s + fr(a));
  return fr(s / fr(adjs.length));
}

/** Output float from adjusted inputs, in the order given, onto the output skin's [min, max]. */
export function landingFromAdjusted(adjs, outMin, outMax) {
  return remap(meanAdjusted(adjs), 0, 1, fr(outMin), fr(outMax));
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
/** The game compares against float32 constants. 0.07f and 0.15f sit above their decimals; 0.38f and 0.45f sit below. */
export const WEAR_EDGES = DECIMAL_EDGES.map(fr);

/** Wear the game assigns to a float32 value. */
export function wearOf(f) {
  const i = WEAR_EDGES.findIndex(e => f < e);
  return WEARS[i < 0 ? 4 : i];
}

/** Wear a naive tool assigns by comparing against the decimal edges. */
export function decimalWearOf(f) {
  const i = DECIMAL_EDGES.findIndex(e => f < e);
  return WEARS[i < 0 ? 4 : i];
}

/**
 * Glitched floats: values the game classifies differently from what their digits say. They exist only
 * where the float32 edge sits below its decimal. Found by enumerating the ladder around every edge.
 */
export function glitchFloats(radius = 64) {
  const out = [];
  for (const edge of WEAR_EDGES) {
    let v = edge;
    for (let k = 0; k < radius; k++) v = nextDown(v);
    for (let k = 0; k < 2 * radius; k++, v = nextUp(v)) {
      if (wearOf(v) !== decimalWearOf(v)) out.push({ float: v, reads: decimalWearOf(v), is: wearOf(v) });
    }
  }
  return out;
}

/**
 * The two glitched floats as constants. Stored as the upper band, read as the lower one. The first was
 * confirmed on an in-game exterior label; glitchFloats() re-derives both from the ladder.
 */
export const GLITCH_FLOATS = [
  { edge: 0.38, float: fr(0.38), reads: 'Field-Tested', is: 'Well-Worn' },
  { edge: 0.45, float: fr(0.45), reads: 'Well-Worn', is: 'Battle-Scarred' },
];

/** Largest float32 the game still calls Factory New (and likewise for the other bands). */
export function maxOfWear(index) {
  return nextDown(WEAR_EDGES[index]);
}

/**
 * A solver target that keeps a safety margin below a wear edge: `margin` float32 steps under the edge
 * (13 by default; observed order jitter is about 2 steps). Returns null when the output skin's range
 * cannot reach that wear at all, so a 0.10-0.20 skin is never offered as Factory New.
 */
export function safeCap(index, outMin, outMax, margin = 13) {
  const edge = WEAR_EDGES[index];
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
