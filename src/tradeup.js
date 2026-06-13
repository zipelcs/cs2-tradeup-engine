
/**
 * Adjusted float: an input's raw wear as a fraction of its OWN skin's float range.
 * A 0.10 on a 0.00-0.50 skin contributes 0.20; the same 0.10 on a 0.00-1.00 skin contributes 0.10.
 */
export function adjust(raw, skinMin, skinMax) {
  if (!(skinMax > skinMin)) return 0;
  return Math.min(1, Math.max(0, (raw - skinMin) / (skinMax - skinMin)));
}

/** Mean of the adjusted floats. */
export function meanAdjusted(adjs) {
  return adjs.reduce((s, a) => s + a, 0) / adjs.length;
}

/** Output float from adjusted inputs, in the order given, onto the output skin's [min, max]. */
export function landingFromAdjusted(adjs, outMin, outMax) {
  const m = meanAdjusted(adjs);
  const f = Math.min(outMax, Math.max(outMin, outMin + m * (outMax - outMin)));
  return f;
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
