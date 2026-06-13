// Skin catalogue helpers. A catalogue is a plain array of
//   { name, rarity, category, min, max, collections: string[], crates: string[] }
// and nothing here reads anything else. Float caps, rarities and case membership are public game data.

import { adjust } from './tradeup.js';

export const RARITIES = ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert'];

export const isGold = s => s.category === 'Knives' || s.category === 'Gloves';

/** The rarity one step up, or null at the top. */
export function nextRarity(r) {
  const i = RARITIES.indexOf(r);
  return i >= 0 && i < RARITIES.length - 1 ? RARITIES[i + 1] : null;
}

/** Index a catalogue by name. */
export function byName(catalogue) {
  return new Map(catalogue.map(s => [s.name, s]));
}

/** Skins of one rarity in a collection (knives and gloves excluded). */
export function collSkins(catalogue, coll, rarity) {
  return catalogue.filter(s => !isGold(s) && s.rarity === rarity && (s.collections || []).includes(coll));
}

/** The coverts a case contains (the inputs of a five-covert contract). */
export function covertsOfCase(catalogue, crate) {
  return catalogue.filter(s => !isGold(s) && s.rarity === 'Covert' && (s.crates || []).includes(crate));
}

/** The knives and gloves a case can produce. */
export function goldPool(catalogue, crate) {
  return catalogue.filter(s => isGold(s) && (s.crates || []).includes(crate));
}

/** What an input skin can turn into: the gold pool of its cases for a covert, else the next rarity of its collections. */
export function outcomesFor(catalogue, skin) {
  if (isGold(skin)) return [];
  if (skin.rarity === 'Covert') {
    const seen = new Set(), out = [];
    for (const c of skin.crates || []) for (const g of goldPool(catalogue, c)) if (!seen.has(g.name)) { seen.add(g.name); out.push(g); }
    return out;
  }
  const nr = nextRarity(skin.rarity);
  if (!nr) return [];
  const out = [];
  for (const c of skin.collections || []) out.push(...collSkins(catalogue, c, nr));
  return out;
}

/**
 * Generations: cases grouped by an identical gold output pool. Two cases that drop exactly the same
 * knives are interchangeable as far as the output is concerned, so their coverts form one input group.
 * The key is the sorted list of gold names. One pass.
 */
export function generations(catalogue) {
  const crates = [...new Set(catalogue.flatMap(s => (isGold(s) ? s.crates || [] : [])))];
  const groups = new Map();
  for (const crate of crates) {
    const key = goldPool(catalogue, crate).map(g => g.name).sort().join('|');
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, { cases: [], gold: key.split('|') });
    groups.get(key).cases.push(crate);
  }
  return [...groups.values()];
}

/** Attach the adjusted float (and the skin's caps) to owned items of the form { id, name, float }. */
export function withAdjusted(items, catalogue) {
  const idx = byName(catalogue), out = [];
  for (const it of items) {
    const d = idx.get(it.name);
    if (!d || !(d.max > d.min)) continue;
    out.push({ ...it, min: d.min, max: d.max, adj: adjust(it.float, d.min, d.max) });
  }
  return out;
}
