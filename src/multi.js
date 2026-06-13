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
 * @returns {{contracts:object[][], requested:number, capped:boolean, used:Set, leftovers:object[]}}
 */
export function multiContract(items, opts, count = 5) {
  const requested = Math.max(1, count | 0);
  const K = Math.min(50, requested);
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
    capped: requested > 50,
    used,
    leftovers: items.filter(it => !taken.has(it)),
  };
}


