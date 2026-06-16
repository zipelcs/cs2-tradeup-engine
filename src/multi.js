// Several contracts from one pool.
//
// This is a sequential greedy with an exclusion set. Solve one contract, add its items to `used`,
// solve again against what is left, stop at the first failure. There is no joint allocation across
// contracts, no backtracking and no matching: the first contract takes what suits it best and the
// later ones get the remainder. The results are only re-sorted afterwards.

import { solve, stats } from './maxfloat.js';

const af = c => +c.adj;

/**
 * Build up to `count` contracts without using an item twice.
 * @param {object[]} items
 * @param {object} opts     as for maxfloat.solve
 * @param {number} [count]  how many to build (capped at 50)
 * @param {boolean} [all]   Solve-all: keep going until the pool cannot make another (capped at 500)
 * @returns {{contracts:object[][], requested:number, capped:boolean, used:Set, leftovers:object[]}}
 */
export function multiContract(items, opts, count = 5, all = false) {
  const requested = Math.max(1, count | 0);
  const K = all ? 500 : Math.min(50, requested);
  const used = new Set(), taken = new Set(), res = [];
  for (let k = 0; k < K; k++) {
    const sel = solve(items.filter(it => !taken.has(it)), opts);
    if (!sel) break;
    sel.forEach(c => { taken.add(c); if (c.id != null) used.add(c.id); });
    res.push(sel);
  }
  // best first: 'under' closest beneath the cap first, 'over' closest above, 'exact' smallest error
  const S = sel => stats(sel).sum, obj = opts.objective || 'under';
  if (obj === 'under') res.sort((a, b) => S(b) - S(a));
  else if (obj === 'over') res.sort((a, b) => S(a) - S(b));
  else if (obj === 'exact') { const T = opts.T * opts.n; res.sort((a, b) => Math.abs(S(a) - T) - Math.abs(S(b) - T)); }
  return {
    contracts: res,
    requested,
    capped: all ? res.length === 500 : requested > 50,
    used,
    leftovers: items.filter(it => !taken.has(it)),
  };
}

/** Solve-all: the same loop until the pool runs out. */
export function solveAll(items, opts) {
  return multiContract(items, opts, 500, true);
}

/**
 * Diversify: spread a contract across more collections.
 *
 * Odds are per collection, so a contract from one collection can only produce that collection's
 * outputs. Repeatedly take a slot from the most over-represented collection and swap it for the
 * cheapest candidate from a collection not yet present, as long as the contract stays inside its
 * float budget. The only copy of a collection is never removed. Greedy; one swap per pass.
 *
 * Items carry `coll` (their collection) and optionally `cost`. Without costs the tie-break is
 * closeness to the target sum.
 *
 * @param {object[]} sel     the current contract
 * @param {object[]} cands   swap candidates, each with coll and adj
 * @param {{objective:string, T:number}} ctx
 * @returns {{sel:object[], swaps:number, collections:number}}
 */
export function diversify(sel, cands, ctx) {
  sel = sel.slice();
  const n = sel.length, obj = ctx.objective || 'under', T = ctx.T * n;
  let sum = sel.reduce((a, c) => a + af(c), 0);
  const cost = c => (c.cost > 0 ? c.cost : 0);
  const count = () => { const m = {}; for (const s of sel) if (s.coll) m[s.coll] = (m[s.coll] || 0) + 1; return m; };
  const feasibleAfter = (oldAF, newAF) => {
    const ns = sum - oldAF + newAF;
    if (obj === 'none') return true;
    if (obj === 'over') return ns >= T - 1e-9;
    if (obj === 'exact') return Math.abs(ns - T) <= Math.abs(sum - T) + 1e-12;
    return ns <= T + 1e-9;
  };
  const inSel = new Set(sel);
  let swaps = 0, progress = true;
  while (progress) {
    progress = false;
    const present = count();
    const order = sel.map((_, i) => i).sort((a, b) => (present[sel[b].coll] || 0) - (present[sel[a].coll] || 0));
    for (const i of order) {
      const cur = sel[i];
      if (cur.coll && (present[cur.coll] || 0) <= 1) continue;
      let best = null;
      for (const c of cands) {
        if (!c.coll || inSel.has(c) || present[c.coll]) continue;
        if (!feasibleAfter(af(cur), af(c))) continue;
        if (!best || cost(c) < cost(best) ||
          (cost(c) === cost(best) && Math.abs(sum - af(cur) + af(c) - T) < Math.abs(sum - af(cur) + af(best) - T))) best = c;
      }
      if (best) {
        sum = sum - af(cur) + af(best);
        inSel.delete(cur); inSel.add(best);
        sel[i] = best; swaps++; progress = true;
        break;
      }
    }
  }
  return { sel, swaps, collections: Object.keys(count()).length };
}
