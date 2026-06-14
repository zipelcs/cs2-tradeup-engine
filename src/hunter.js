// #1 Hunter: beat a record float on a target skin from owned inventory, spending as little float
// quality as possible.

import { RARITIES, isGold, covertsOfCase, outcomesFor, byName } from './catalogue.js';
import { lsPick } from './listing.js';

/** Can this skin be the output of any contract at all? */
export function canBeTarget(catalogue, s) {
  if (!s || !(s.max > s.min)) return false;
  if (isGold(s)) return (s.crates || []).some(c => covertsOfCase(catalogue, c).length > 0);
  const ri = RARITIES.indexOf(s.rarity);
  if (ri <= 0) return false;
  const need = RARITIES[ri - 1];
  const colls = new Set([...(s.collections || []), ...(s.crates || [])]);
  return catalogue.some(x => !isGold(x) && x.rarity === need && [...(x.collections || []), ...(x.crates || [])].some(c => colls.has(c)));
}

/**
 * Eligible inputs for a target: exactly one tier below it, able to be traded up, inside the float
 * window, and flagged `on` when they can actually produce the target.
 * @param {object} target        catalogue entry
 * @param {object[]} items       owned items with name and adj
 * @param {object[]} catalogue
 * @param {{floMin?:number, floMax?:number, exclude?:Set}} [opts]
 */
export function huntCandidates(target, items, catalogue, opts = {}) {
  const gold = isGold(target);
  const need = gold ? 'Covert' : RARITIES[RARITIES.indexOf(target.rarity) - 1];
  const idx = byName(catalogue), cands = [];
  for (const it of items) {
    if (opts.exclude && opts.exclude.has(it.id)) continue;
    if (it.adj == null) continue;
    const d = idx.get(it.name);
    if (!d || d.rarity !== need || isGold(d)) continue;
    const outs = outcomesFor(catalogue, d);
    if (!outs.length) continue;
    if (opts.floMin != null && it.adj < opts.floMin) continue;
    if (opts.floMax != null && it.adj > opts.floMax) continue;
    cands.push({ ...it, on: outs.some(o => o.name === target.name), own: true });
  }
  return { cands, n: gold ? 5 : 10, need, gold };
}

/**
 * Pick the contract.
 *
 * Float-preserving mode is a maximin. Seed with the n lowest adjusted floats, the most feasible set
 * there is. Then repeatedly raise the single lowest input by the smallest amount that keeps the mean
 * under the bar, and restart. The result clusters just under the bar instead of one very low float
 * carrying four fillers, so the best copies are the first to be kept back.
 * Two guards: never pass the bar, never drop the last input that can produce the target.
 *
 * @param {object[]} cands   from huntCandidates
 * @param {number} n
 * @param {number} T         the bar, as a mean adjusted float
 * @param {{preserve?:boolean}} [opts]
 */
export function huntPick(cands, n, T, opts = {}) {
  const preserve = opts.preserve !== false;
  if (!preserve) return lsPick(cands, n, T, 'under', 'cheap');
  const cap = T * n, ok = s => s <= cap + 1e-12, onCount = s => s.filter(c => c.on).length;
  const pool = cands.slice().sort((a, b) => a.adj - b.adj);
  if (pool.length < n) return null;
  const sel = pool.slice(0, n);
  if (!sel.some(c => c.on)) {
    const ot = pool.filter(c => c.on)[0];
    if (!ot) return null;
    let wi = 0;
    for (let i = 1; i < n; i++) if (!sel[i].on && sel[i].adj > sel[wi].adj) wi = i;
    sel[wi] = ot;
  }
  let sum = sel.reduce((a, c) => a + c.adj, 0);
  if (!ok(sum)) return null; // cannot beat the bar even with the lowest floats
  let guard = 0, changed = true;
  while (changed && guard++ < 4000) {
    changed = false;
    const order = sel.map((c, i) => i).sort((a, b) => sel[a].adj - sel[b].adj);
    for (const i of order) {
      let best = null;
      for (const c of pool) {
        if (sel.includes(c)) continue;
        if (c.adj <= sel[i].adj) continue;
        if (sel[i].on && !c.on && onCount(sel) <= 1) continue;
        const ns = sum - sel[i].adj + c.adj;
        if (!ok(ns)) continue;
        if (!best || c.adj < best.adj || (c.adj === best.adj && (c.cost || 0) < (best.cost || 0))) best = c;
      }
      if (best) { sum = sum - sel[i].adj + best.adj; sel[i] = best; changed = true; break; }
    }
  }
  return sel;
}

/**
 * Solve one record: the threshold is the record minus an optional margin.
 * @returns {{ok:true, sel, n, T}|{ok:false, why:string}}
 */
export function huntSolve(target, record, items, catalogue, opts = {}) {
  const threshold = record - (opts.margin || 0);
  if (threshold < target.min) return { ok: false, why: 'the threshold is below the floor of the target skin' };
  const { cands, n } = huntCandidates(target, items, catalogue, opts);
  if (!cands.some(c => c.on)) return { ok: false, why: 'no input can produce the target' };
  if (cands.length < n) return { ok: false, why: `need ${n} inputs, ${cands.length} eligible` };
  const T = (threshold - target.min) / (target.max - target.min);
  const sel = huntPick(cands, n, T, opts);
  if (!sel) return { ok: false, why: 'the inventory cannot average low enough to beat the record' };
  return { ok: true, sel, n, T };
}
