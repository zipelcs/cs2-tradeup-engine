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
 * An item outside its band is never offered to the solver, which is how a range is conserved:
 * a window minimum of 0.02 keeps every input under 0.02 out of every contract.
 * @param {object[]} items
 * @param {{window?:{lo?:number,hi?:number}, fillerWindow?:{lo?:number,hi?:number}, exclude?:Set}} [opts]
 */
export function candidates(items, opts = {}) {
  const w = opts.window || {}, ex = opts.exclude;
  const inside = (a, b) => (b.lo == null || a >= b.lo) && (b.hi == null || a <= b.hi);
  return items.filter(it => {
    if (ex && ex.has(it.id)) return false;
    if (it.adj == null) return false;
    return inside(af(it), w);
  });
}

// ---- quotas -------------------------------------------------------------------------------------

/**
 * Normalise the group rules. A rule is { group: 'pool' | 'g2', mode: 'min' | 'max' | 'exact', k }.
 */
export function activeQuotas(rules, n) {
  const q = [];
  for (const r of rules || []) {
    const tag = r.group === 'g2' ? 'g2' : 'pool';
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
  }
  return true;
}

/**
 * Shape the candidate pool so a greedy seed respects the quotas: keep the best k of each capped group.
 */
export function applyFillerCap(pool, ctx) {
  const { n, T, quotas } = ctx;
  let out = pool;
  for (const q of quotas) {
    const inG = out.filter(c => c[q.tag]).sort((a, b) => Math.abs(af(a) - T) - Math.abs(af(b) - T));
    out = inG.slice(0, q.k).concat(out.filter(c => !c[q.tag]));
  }
  return out;
}

/** Force "exactly k" counts by swapping members in for non-members. Null when it cannot. */
export function enforceQuotas(sel, pool, ctx) {
  if (!sel) return sel;
  sel = sel.slice();
  for (const q of ctx.quotas) {
    if (q.mode !== 'exact') continue;
    let c = sel.filter(x => x[q.tag]).length, guard = 0;
    while (c < q.k && guard++ < 20) {
      const inSel = new Set(sel);
      const add = pool.filter(x => x[q.tag] && !inSel.has(x)).sort((a, b) => (a.cost || 0) - (b.cost || 0))[0];
      const dropIx = sel.findIndex(x => !x[q.tag]);
      if (!add || dropIx < 0) return null;
      sel[dropIx] = add; c++;
    }
    if (sel.filter(x => x[q.tag]).length !== q.k) return null;
  }
  return sel;
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
  return sel;
}

/** Sum and mean of the adjusted floats of a selection. */
export function stats(sel) {
  const sum = sumOf(sel);
  return { sum, mean: sum / sel.length };
}
