// Listing Solver: the cheapest n inputs whose mean adjusted float meets a threshold.
//
// A candidate is { name, float, adj, cost, on, own? }:
//   cost  price from whatever source the caller plugs in; an unpriced input costs Infinity, never zero
//   on    true when this input can actually produce the target skin
//   own   true for an item already owned (counts toward the owned minimum and maximum)

const ec = c => (c.cost > 0 ? c.cost : Infinity);
const keyOf = c => c.name + '|' + c.float;

/**
 * Pick n inputs meeting the float threshold with at least one on-target input.
 * @param {object[]} cands
 * @param {number} n
 * @param {number} T                   threshold mean adjusted float
 * @param {'under'|'over'} dir
 * @param {'cheap'|'odds'} [mode]      'cheap' minimises cost; 'odds' maximises on-target count, then cost
 * @param {Set<string>} [keep]         pinned inputs (name|float), never swapped out
 * @param {{min:number,max:number}} [own]  bounds on the number of owned inputs
 */
export function lsPick(cands, n, T, dir, mode = 'cheap', keep = new Set(), own = { min: 0, max: Infinity }) {
  const ok = s => (dir === 'over' ? s >= T * n - 1e-12 : s <= T * n + 1e-12);
  const cheapish = mode === 'cheap';
  const onCount = sel => sel.filter(c => c.on).length;
  const ownCnt = s => s.filter(c => c.own).length;
  const ownSwapOK = (s, i, c) => { const after = ownCnt(s) - (s[i].own ? 1 : 0) + (c.own ? 1 : 0); return after >= own.min && after <= own.max; };

  // seed -> feasibility repair (largest float gain per swap) -> cost improvement (first improving swap)
  function build(primarySort, filt) {
    let pool = cands.slice();
    if (filt) pool = pool.filter(filt);
    if (pool.length < n) return null;
    pool.sort(primarySort);
    const kept = pool.filter(c => keep.has(keyOf(c))).slice(0, n);
    const ownSeed = own.min > 0 ? pool.filter(c => c.own && !kept.includes(c)).slice(0, own.min) : [];
    const sel = kept.concat(ownSeed);
    let ownN = ownCnt(sel);
    for (const c of pool) {
      if (sel.length >= n) break;
      if (sel.includes(c)) continue;
      if (c.own && ownN >= own.max) continue;
      sel.push(c); if (c.own) ownN++;
    }
    if (sel.length < n) return null;
    const locked = sel.map((c, i) => i < kept.length);
    if (!sel.some(c => c.on)) {
      const ot = pool.filter(c => c.on).sort((a, b) => ec(a) - ec(b))[0];
      if (!ot) return null;
      let wi = -1;
      for (let i = 0; i < n; i++) { if (locked[i]) continue; if (wi < 0 || ec(sel[i]) > ec(sel[wi])) wi = i; }
      if (wi < 0) return null;
      sel[wi] = ot;
    }
    let sum = sel.reduce((a, c) => a + c.adj, 0), guard = 0;
    while (!ok(sum) && guard++ < 600) {
      let bi = -1, bj = -1, best = 1e-12;
      for (let i = 0; i < n; i++) {
        if (locked[i]) continue;
        for (let j = 0; j < pool.length; j++) {
          const c = pool[j];
          if (sel.includes(c)) continue;
          if (sel[i].on && !c.on && onCount(sel) <= 1) continue; // never drop the last on-target input
          if (!ownSwapOK(sel, i, c)) continue;
          const g = (dir === 'over' ? 1 : -1) * (c.adj - sel[i].adj);
          if (g > best) { best = g; bi = i; bj = j; }
        }
      }
      if (bi < 0) break;
      sum += pool[bj].adj - sel[bi].adj; sel[bi] = pool[bj];
    }
    if (!ok(sum)) return null;
    let imp = true; guard = 0;
    while (imp && guard++ < 400) {
      imp = false;
      for (let i = 0; i < n; i++) {
        if (locked[i]) continue;
        for (const c of pool) {
          if (sel.includes(c)) continue;
          if (sel[i].on && !c.on && onCount(sel) <= 1) continue;
          if (!ownSwapOK(sel, i, c)) continue;
          const ns = sum - sel[i].adj + c.adj;
          if (!ok(ns)) continue;
          const better = cheapish ? ec(c) < ec(sel[i]) : ((c.on && !sel[i].on) || (c.on === sel[i].on && ec(c) < ec(sel[i])));
          if (better) { sum = ns; sel[i] = c; imp = true; }
        }
      }
    }
    return sel;
  }

  const costSort = cheapish ? (a, b) => ec(a) - ec(b) : (a, b) => (b.on - a.on) || (ec(a) - ec(b));
  let sel = build(costSort);
  return sel || null;
}

/** Total cost of a selection (Infinity when any input is unpriced). */
export function totalCost(sel) {
  return sel.reduce((a, c) => a + ec(c), 0);
}

