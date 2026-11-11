// Max-Float Target and the selection core shared by Custom Float.
//
// Everything here works on adjusted floats. An item is { id, adj, pool?, g2?, cost? }:
//   adj   adjusted float (see tradeup.adjust)
//   pool  true when the item belongs to the target's own collection; false marks a filler
//   g2    true when the item belongs to the optional second rule group
// Selection is tracked by object identity, so two items may share an id without confusing the solver.
//
// None of this is an optimiser. It is a greedy with a feasibility test, local swaps and repair passes,
// all bounded by iteration guards. It can return null when a feasible answer exists.
//
// The cores budget the adjusted sum in float64. That is a pre-filter only. The game forms the mean
// with float32 additions in insertion order, so a float64 sum that fits the budget can still land
// above the cap in some orders. solve() therefore finishes with settle(), which enumerates every
// insertion order in float32 and swaps inputs until no order breaches the cap.

import { landingDistribution } from './orders.js';

const af = c => +c.adj;
const sumOf = sel => sel.reduce((a, c) => a + af(c), 0);

/**
 * The adjusted-float budget for a target output float, against the caps of the specific target skin.
 * The same 0.07 is a different budget on a 0.00-0.08 skin than on a 0.00-1.00 skin.
 * With several possible outcomes and no single target, pass them all: the budget binds on the worst
 * reachable one and skips outcomes whose floor is already above the target.
 * @param {number} target                       output float
 * @param {{min:number,max:number}|{min:number,max:number}[]} out
 * @param {'under'|'over'|'exact'} [objective]
 */
export function targetAdjusted(target, out, objective = 'under') {
  const one = g => {
    if (objective === 'over') return Math.max(0, Math.min(1, (Math.max(target, g.min) - g.min) / (g.max - g.min)));
    if (target <= g.min) return 0;
    return Math.max(0, Math.min(1, (Math.min(target, g.max) - g.min) / (g.max - g.min)));
  };
  if (!Array.isArray(out)) return out.max > out.min ? one(out) : target;
  if (objective === 'over') return out.reduce((m, o) => (o.max > o.min ? Math.max(m, one(o)) : m), 0);
  let m = null;
  for (const o of out) {
    if (target <= o.min || o.max <= o.min) continue;
    const v = one(o);
    m = m == null ? v : Math.min(m, v);
  }
  return m == null ? 0 : m;
}

/**
 * The maximise-under-budget core: n items whose adjusted sum is as high as possible without
 * exceeding `budget`.
 *
 * 1. Greedy from the top with a feasibility test: walk from the highest adjusted float down and take
 *    an item only if the (need - 1) smallest unused items still fit beneath the budget beside it.
 * 2. 1-swap: raise any selected item as far as the budget allows.
 * 3. 2-swap: for each selected pair, scan the sorted pool with two pointers for the unused pair that
 *    best fills the remaining room. This escapes the local optimum a 1-swap gets stuck in.
 */
export function underCore(poolIn, n, budget) {
  const pool = poolIn.slice().sort((a, b) => af(a) - af(b));
  const sel = [], taken = new Set();
  let need = n, bsum = 0;
  for (let i = pool.length - 1; i >= 0 && sel.length < n; i--) {
    const c = pool[i];
    let smin = 0, cnt = 0;
    for (let j = 0; j < pool.length && cnt < need - 1; j++) {
      if (j === i || taken.has(pool[j])) continue;
      smin += af(pool[j]); cnt++;
    }
    if (cnt < need - 1) continue;
    if (bsum + af(c) + smin <= budget + 1e-15) { sel.push(c); taken.add(c); bsum += af(c); need--; }
  }
  for (let j = 0; j < pool.length && sel.length < n; j++) {
    if (!taken.has(pool[j])) { sel.push(pool[j]); taken.add(pool[j]); bsum += af(pool[j]); }
  }
  if (sel.length < n || bsum > budget + 1e-12) return null;
  let improved = true, guard = 0;
  while (improved && guard++ < 800) {
    improved = false;
    sel.sort((a, b) => af(a) - af(b));
    const cur = sumOf(sel), inSel = new Set(sel);
    for (let s = 0; s < sel.length && !improved; s++) {
      for (let j = pool.length - 1; j >= 0; j--) {
        const c = pool[j];
        if (inSel.has(c) || af(c) <= af(sel[s])) continue;
        if (cur - af(sel[s]) + af(c) <= budget + 1e-15) { sel[s] = c; improved = true; break; }
      }
    }
    if (improved) continue;
    pair: for (let i = 0; i < sel.length; i++) for (let j = i + 1; j < sel.length; j++) {
      const room = budget - (cur - af(sel[i]) - af(sel[j]));
      let lo = 0, hi = pool.length - 1, bestPair = null, bestSum = af(sel[i]) + af(sel[j]);
      while (lo < hi) {
        const a = pool[lo], b = pool[hi];
        if (inSel.has(a)) { lo++; continue; }
        if (inSel.has(b)) { hi--; continue; }
        const ps = af(a) + af(b);
        if (ps <= room + 1e-15) { if (ps > bestSum + 1e-18) { bestPair = [a, b]; bestSum = ps; } lo++; } else hi--;
      }
      if (bestPair) { sel[i] = bestPair[0]; sel[j] = bestPair[1]; improved = true; break pair; }
    }
  }
  return sel;
}

/**
 * Minimise |sum - T|: seed with the n items individually closest to T/n, then 1-swap, then a
 * two-pointer 2-swap that takes the first improving pair.
 */
export function exactCore(poolIn, n, T) {
  const pool = poolIn.slice().sort((a, b) => Math.abs(af(a) - T / n) - Math.abs(af(b) - T / n));
  if (pool.length < n) return null;
  const sel = pool.slice(0, n);
  const sorted = pool.slice().sort((a, b) => af(a) - af(b));
  let improved = true, guard = 0;
  while (improved && guard++ < 1200) {
    improved = false;
    const cur = sumOf(sel), err = Math.abs(cur - T), inSel = new Set(sel);
    outer: for (let s = 0; s < n; s++) {
      for (const c of pool) {
        if (inSel.has(c)) continue;
        if (Math.abs(cur - af(sel[s]) + af(c) - T) < err - 1e-18) { sel[s] = c; improved = true; break outer; }
      }
    }
    if (improved) continue;
    pair: for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const want = af(sel[i]) + af(sel[j]) + (T - cur);
      let lo = 0, hi = sorted.length - 1;
      while (lo < hi) {
        const a = sorted[lo], b = sorted[hi];
        if (inSel.has(a)) { lo++; continue; }
        if (inSel.has(b)) { hi--; continue; }
        const ps = af(a) + af(b);
        if (Math.abs(cur - af(sel[i]) - af(sel[j]) + ps - T) < err - 1e-18) { sel[i] = a; sel[j] = b; improved = true; break pair; }
        if (ps < want) lo++; else hi--;
      }
    }
  }
  return sel;
}

// ---- candidate windows --------------------------------------------------------------------------

/**
 * The candidate pool. `window` is the adjusted-float band allowed for collection inputs.
 * `fillerWindow` is a separate band for fillers (items with pool === false).
 * An item outside its band is never offered to the solver, which is how a range is conserved:
 * a window minimum of 0.02 keeps every input under 0.02 out of every contract.
 * @param {object[]} items
 * @param {{window?:{lo?:number,hi?:number}, fillerWindow?:{lo?:number,hi?:number}, exclude?:Set}} [opts]
 */
export function candidates(items, opts = {}) {
  const w = opts.window || {}, ex = opts.exclude;
  const wf = opts.fillerWindow || {};
  const inside = (a, b) => (b.lo == null || a >= b.lo) && (b.hi == null || a <= b.hi);
  return items.filter(it => {
    if (ex && ex.has(it.id)) return false;
    if (it.adj == null) return false;
    return inside(af(it), it.pool === false ? wf : w);
  });
}

// ---- quotas -------------------------------------------------------------------------------------

/**
 * Normalise the group rules. A rule is { group: 'pool' | 'g2', mode: 'min' | 'max' | 'exact', k }.
 * A rule may count fillers instead ({ group: 'pool', count: 'filler', ... }). It is rewritten as the
 * dual rule on collection inputs: "exactly F fillers" is "exactly n - F collection", "at most F
 * fillers" is "at least n - F collection", and "at least F fillers" is "at most n - F collection".
 */
export function activeQuotas(rules, n) {
  const q = [];
  for (const r of rules || []) {
    const tag = r.group === 'g2' ? 'g2' : 'pool';
    if (tag === 'pool' && r.count === 'filler') {
      const k = Math.max(0, Math.min(n, n - r.k));
      q.push({ tag, mode: r.mode === 'max' ? 'min' : r.mode === 'min' ? 'max' : 'exact', k });
      continue;
    }
    q.push({ tag, mode: r.mode, k: r.k });
  }
  return q;
}

/** Does a selection satisfy the rules? `strict` also enforces exact and minimum counts. */
export function quotaOK(sel, quotas, strict) {
  for (const q of quotas) {
    const c = sel.filter(x => x[q.tag]).length;
    if (q.mode === 'max' && c > q.k) return false;
    if (q.mode === 'exact' && (strict ? c !== q.k : c > q.k)) return false;
    if (q.mode === 'min' && strict && c < q.k) return false;
  }
  return true;
}

/**
 * Shape the candidate pool so a greedy seed respects the quotas: keep the best k of each capped group.
 * The k collection inputs aim at a collection-specific target, not the global one. When fillers are
 * pinned low the collection inputs must run higher for the output to still land on target:
 *   collTgt = (T * n - need * fillerMean) / k
 * with fillerMean estimated from the best fillers actually available. Alongside the k closest, the
 * k safest members are kept as feasibility fallbacks.
 */
export function applyFillerCap(pool, ctx) {
  const { n, T, quotas } = ctx;
  let out = pool;
  const over = ctx.objective === 'over';
  for (const q of quotas) {
    if (q.mode === 'min') continue; // a minimum needs the full pool available
    const k = q.k, need = Math.max(0, n - k);
    const fill = out.filter(c => !c[q.tag]).map(af).sort((a, b) => (over ? b - a : a - b)).slice(0, need);
    const fillerMean = fill.length ? fill.reduce((a, b) => a + b, 0) / fill.length : T;
    const collTgt = Math.max(0, Math.min(1, k > 0 ? (T * n - need * fillerMean) / k : T));
    const inG = out.filter(c => c[q.tag]).sort((a, b) => Math.abs(af(a) - collTgt) - Math.abs(af(b) - collTgt));
    const rest = out.filter(c => !c[q.tag]);
    const kept = inG.slice(0, k), keptSet = new Set(kept);
    const safe = out.filter(c => c[q.tag] && !keptSet.has(c)).sort((a, b) => (over ? af(b) - af(a) : af(a) - af(b))).slice(0, k);
    out = kept.concat(safe).concat(rest);
  }
  return out;
}

/**
 * Force the quota counts onto a selection, then repair what that broke. Five ordered passes; each one
 * preserves what the previous one established, and membership counts never change after pass 2.
 *
 *   1. trim     too many group members: swap the worst one for the best non-member
 *   2. add      too few: bring in the member that best fits the direction, drop the worst non-member
 *   3. repair   the swaps may have pushed the sum past the budget: same-membership swaps, best gain first
 *   4. climb    push the sum back toward the budget so no headroom is wasted ("offset" pins fillers to
 *               their extreme first, so only collection inputs climb)
 *   5. tune     exact objective only: same-membership swaps that minimise |sum - target|
 *
 * Returns null, not a contract that silently breaks the cap or the rule.
 */
export function enforceQuotas(sel, pool, ctx) {
  if (!sel) return sel;
  sel = sel.slice();
  const { n, T, quotas, objective: obj } = ctx, budget = T * n;
  const dir = obj === 'over' ? 1 : -1;
  const same = (a, b) => quotas.every(q => !!a[q.tag] === !!b[q.tag]);
  for (const q of quotas) {
    let cnt = sel.filter(c => c[q.tag]).length, guard = 0;
    // The original trimmed only for 'exact', so a 'max' rule could be rejected after the pool shaping
    // offered 2k members. This port trims for 'max' as well.
    if (q.mode === 'exact' || q.mode === 'max') {
      let g2 = 0;
      while (cnt > q.k && g2++ < 40) {
        const inSel = new Set(sel);
        const repl = pool.filter(c => !c[q.tag] && !inSel.has(c)).sort((a, b) => (obj === 'over' ? af(b) - af(a) : af(a) - af(b)))[0];
        let di = -1, w = null;
        for (let i = 0; i < sel.length; i++) {
          if (!sel[i][q.tag]) continue;
          const v = obj === 'over' ? -af(sel[i]) : af(sel[i]);
          if (di < 0 || v > w) { w = v; di = i; }
        }
        if (!repl || di < 0) return null;
        sel[di] = repl; cnt--;
      }
    }
    if (q.mode === 'max') continue;
    while (cnt < q.k && guard++ < 40) {
      const inSel = new Set(sel);
      const add = pool.filter(c => c[q.tag] && !inSel.has(c)).sort((a, b) => dir * (af(b) - af(a)))[0];
      let dropIx = -1, worst = null;
      for (let i = 0; i < sel.length; i++) {
        if (sel[i][q.tag]) continue;
        const v = dir * af(sel[i]);
        if (dropIx < 0 || v > worst) { worst = v; dropIx = i; }
      }
      if (!add || dropIx < 0) return null;
      sel[dropIx] = add; cnt++;
    }
    const have = sel.filter(c => c[q.tag]).length;
    if (q.mode === 'exact' && have !== q.k) return null;
    if (q.mode === 'min' && have < q.k) return null;
  }
  if (obj === 'under' || obj === 'over') {
    const within = () => (obj === 'under' ? sumOf(sel) <= budget + 1e-9 : sumOf(sel) >= budget - 1e-9);
    let guard = 0;
    while (!within() && guard++ < 300) {
      const inSel = new Set(sel);
      let bi = -1, bestGain = 1e-12, bestRepl = null;
      for (let i = 0; i < sel.length; i++) {
        for (const r of pool) {
          if (inSel.has(r) || !same(r, sel[i])) continue;
          const gain = obj === 'under' ? af(sel[i]) - af(r) : af(r) - af(sel[i]);
          if (gain > bestGain) { bestGain = gain; bi = i; bestRepl = r; }
        }
      }
      if (bi < 0) break;
      sel[bi] = bestRepl;
    }
    if (!within()) return null;
    if (ctx.strategy === 'offset' && quotas.some(q => q.tag === 'pool')) {
      let g0 = 0, moved = true;
      while (moved && g0++ < 200) {
        moved = false;
        const inSel = new Set(sel);
        for (let i = 0; i < sel.length; i++) {
          const c0 = sel[i];
          if (c0.pool) continue;
          const r = pool.filter(c => !c.pool && !inSel.has(c) && same(c, c0)).sort((a, b) => (obj === 'under' ? af(a) - af(b) : af(b) - af(a)))[0];
          if (r && (obj === 'under' ? af(r) < af(c0) - 1e-15 : af(r) > af(c0) + 1e-15)) { sel[i] = r; moved = true; break; }
        }
      }
    }
    let guard2 = 0, improved = true;
    while (improved && guard2++ < 600) {
      improved = false;
      const cur = sumOf(sel);
      if (obj === 'under' && budget - cur < 1e-9) break;
      if (obj === 'over' && cur - budget < 1e-9) break;
      const inSel = new Set(sel);
      let bi = -1, bestRepl = null, bestGain = 1e-15;
      for (let i = 0; i < sel.length; i++) {
        const c0 = sel[i];
        if (ctx.strategy === 'offset' && !c0.pool) continue;
        for (const r of pool) {
          if (inSel.has(r) || !same(r, c0)) continue;
          const nsum = cur - af(c0) + af(r);
          if (obj === 'under' ? nsum > budget + 1e-12 : nsum < budget - 1e-12) continue;
          const gain = obj === 'under' ? af(r) - af(c0) : af(c0) - af(r);
          if (gain > bestGain) { bestGain = gain; bi = i; bestRepl = r; }
        }
      }
      if (bi >= 0) { sel[bi] = bestRepl; improved = true; }
    }
  }
  if (obj === 'exact') {
    let guard = 0, improved = true;
    while (improved && guard++ < 400) {
      improved = false;
      const inSel = new Set(sel), s = sumOf(sel);
      let bestD = Math.abs(s - budget), bi = -1, bestRepl = null;
      for (let i = 0; i < sel.length; i++) {
        for (const r of pool) {
          if (inSel.has(r) || !same(r, sel[i])) continue;
          const nd = Math.abs(s - af(sel[i]) + af(r) - budget);
          if (nd < bestD - 1e-12) { bestD = nd; bi = i; bestRepl = r; }
        }
      }
      if (bi < 0) break;
      sel[bi] = bestRepl; improved = true;
    }
  }
  return sel;
}

// ---- float32 check ------------------------------------------------------------------------------

/**
 * The worst landing of a selection over every insertion order, in float32, against each output range.
 * Returns the landing furthest past the cap in the direction of the objective (highest for 'under',
 * lowest for 'over'), or null when no order breaches the cap.
 * @param {object[]} sel
 * @param {'under'|'over'} objective
 * @param {number} cap                                   output float the landings must not pass
 * @param {{min:number,max:number}|{min:number,max:number}[]} [out]  output range(s), 0 to 1 by default
 */
export function breach(sel, objective, cap, out = { min: 0, max: 1 }) {
  const adjs = sel.map(af);
  let worst = null;
  for (const o of Array.isArray(out) ? out : [out]) {
    if (!(o.max > o.min)) continue;
    // an outcome that can never reach the cap is skipped, as targetAdjusted skips it
    if (objective === 'under' ? cap <= o.min : cap > o.max) continue;
    for (const l of landingDistribution(adjs, o.min, o.max)) {
      if (objective === 'under' ? l.float > cap : l.float < cap) {
        if (worst == null || (objective === 'under' ? l.float > worst : l.float < worst)) worst = l.float;
      }
    }
  }
  return worst;
}

/**
 * Step a selection away from the cap until no insertion order breaches it. Each step is the swap
 * that moves the adjusted sum by the least: one selected input for the nearest unused input on the
 * safe side with the same group membership. The sum moves strictly one way, so the loop ends; it is
 * also bounded by an iteration budget. Returns null when the pool runs out of swaps.
 * @param {object[]} sel
 * @param {object[]} pool    every candidate the solver was offered
 * @param {{objective:'under'|'over', cap:number, out?:object|object[], same?:(r:object, cur:object)=>boolean, budget?:number}} ctx
 */
export function settle(sel, pool, ctx) {
  const under = ctx.objective !== 'over', same = ctx.same || (() => true);
  sel = sel.slice();
  for (let step = 0; step <= (ctx.budget || 400); step++) {
    if (breach(sel, under ? 'under' : 'over', ctx.cap, ctx.out) == null) return sel;
    const inSel = new Set(sel);
    let bi = -1, bestRepl = null, bestD = Infinity;
    for (let i = 0; i < sel.length; i++) {
      for (const r of pool) {
        if (inSel.has(r) || !same(r, sel[i])) continue;
        const d = under ? af(sel[i]) - af(r) : af(r) - af(sel[i]);
        if (d > 0 && d < bestD) { bestD = d; bi = i; bestRepl = r; }
      }
    }
    if (bi < 0) return null;
    sel[bi] = bestRepl;
  }
  return null;
}

// ---- entry point --------------------------------------------------------------------------------

/**
 * Solve one contract.
 *
 * @param {object[]} items  owned inputs, each with an adjusted float
 * @param {object} opts
 *   n          inputs per contract (10, or 5 for covert to knife or glove)
 *   objective  'under'  as high as possible without passing the target (Max Float)
 *              'over'   as low as possible without dropping under it (the same core on negated values)
 *              'exact'  as close to the target as possible (Custom Float)
 *              'none'   no float target: the n cheapest
 *   T          target mean adjusted float (see targetAdjusted)
 *   out, cap   the output range (or ranges) and the output float no insertion order may pass. With
 *              both given, 'under' and 'over' results are checked against that cap in float32 over
 *              every insertion order. Without them the float32 mean itself is checked against T,
 *              which is exact for a 0 to 1 output. Pass them for any other range.
 *   window, fillerWindow, exclude   see candidates()
 *   rules      group rules, see activeQuotas()
 *   strategy   'bal' or 'offset'
 * @returns {object[]|null} the selected items, or null
 */
export function solve(items, opts) {
  const n = opts.n, obj = opts.objective || 'under', T = opts.T;
  const ctx = { n, T, objective: obj, quotas: activeQuotas(opts.rules, n), strategy: opts.strategy || 'bal' };
  const full = candidates(items, opts);
  if (full.length < n) return null;
  if (obj === 'none') {
    return full.slice().sort((a, b) => (a.cost || 0) - (b.cost || 0)).slice(0, n);
  }
  const pool = applyFillerCap(full, ctx);
  if (pool.length < n) return null;
  let sel;
  if (obj === 'exact') {
    sel = enforceQuotas(exactCore(pool, n, T * n), full, ctx);
  } else if (obj === 'over') {
    // exact mirror of the under core: negate every value and the budget
    const neg = pool.map(c => ({ adj: -af(c), src: c }));
    const got = underCore(neg, n, -T * n);
    sel = got && enforceQuotas(got.map(c => c.src), full, ctx);
    if (sel && sumOf(sel) < T * n - 1e-15) return null;
  } else {
    sel = enforceQuotas(underCore(pool, n, T * n), full, ctx);
  }
  if (!sel || !quotaOK(sel, ctx.quotas, true)) return null;
  if (obj === 'under' || obj === 'over') {
    const checked = opts.out != null && opts.cap != null;
    sel = settle(sel, full, {
      objective: obj,
      cap: checked ? opts.cap : T,
      out: checked ? opts.out : { min: 0, max: 1 },
      same: (r, cur) => ctx.quotas.every(q => !!r[q.tag] === !!cur[q.tag]),
    });
    if (!sel || !quotaOK(sel, ctx.quotas, true)) return null;
  }
  return sel;
}

/** Sum and mean of the adjusted floats of a selection. */
export function stats(sel) {
  const sum = sumOf(sel);
  return { sum, mean: sum / sel.length };
}
