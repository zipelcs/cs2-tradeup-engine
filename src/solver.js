import { fr, ulp } from './f32.js';
import { landingDistribution } from './orders.js';

/**
 * Exact-step subset search.
 *
 * Picks `n` inputs from `pool` so that some insertion order lands on a float the caller accepts.
 *
 * 1. The sum window comes first. For a target t on an output range [lo, hi], the sum of the adjusted
 *    floats must fall inside a narrow window around n * (t - lo) / (hi - lo). The caller passes that
 *    window as [sumLo, sumHi].
 * 2. The pool is sorted by adjusted float and searched depth-first with prefix-sum pruning: if even
 *    the smallest remaining items overshoot the window, stop; if even the largest undershoot, skip.
 * 3. Every subset that passes the window is checked across all insertion orders. It is accepted only
 *    if some order lands exactly on an accepted float, and the witness order comes back with it.
 *
 * This is a pruned first-hit search, not branch and bound: there is no objective and no incumbent.
 * Inputs are tracked by position, so two inputs may share an id.
 *
 * @param {{id:any, adj:number}[]} pool
 * @param {number} n             inputs per contract (10, or 5 for covert to knife or glove)
 * @param {number} sumLo         adjusted-sum window
 * @param {number} sumHi
 * @param {number} lo            output skin range
 * @param {number} hi
 * @param {(f:number, landing:object)=>boolean} accept   sees the float and its {share, orders}
 * @param {number} [cap]         node budget; the result says so when it runs out
 * @returns {null | {capped:true, nodes, subsets} | {float, order, items, share, landings, ids, capped, nodes, subsets}}
 */
export function stepSolve(pool, n, sumLo, sumHi, lo, hi, accept, cap = 2e6) {
  const A = pool.slice().sort((a, b) => a.adj - b.adj);
  const N = A.length;
  if (N < n) return null;
  const pre = [0];
  for (let i = 0; i < N; i++) pre.push(pre[i] + A[i].adj);
  let nodes = 0, subsets = 0, hit = null, capped = false;
  const sel = [];
  (function dfs(i, k, sum) {
    if (hit) return;
    if (nodes++ > cap) { capped = true; return; }
    if (k === n) {
      if (sum < sumLo || sum > sumHi) return;
      subsets++;
      const L = landingDistribution(sel.map(x => fr(x.adj)), lo, hi);
      for (const l of L) {
        if (accept(l.float, l)) {
          const items = l.order.map(ix => sel[ix]);
          hit = { float: l.float, order: items.map(x => x.id), items, share: l.share, landings: L.length, ids: sel.map(x => x.id) };
          return;
        }
      }
      return;
    }
    for (let j = i; j <= N - (n - k); j++) {
      const a = A[j].adj;
      if (sum + a + (pre[j + 1 + (n - 1 - k)] - pre[j + 1]) > sumHi) break;     // smallest completion overshoots
      if (sum + a + (pre[N] - pre[N - (n - 1 - k)]) < sumLo) continue;          // largest completion undershoots
      sel.push(A[j]);
      dfs(j + 1, k + 1, sum + a);
      sel.pop();
      if (hit) return;
    }
  })(0, 0, 0);
  if (hit) return { ...hit, capped, nodes, subsets };
  return capped ? { capped: true, nodes, subsets } : null;
}

/**
 * The adjusted-sum window for a target float: every sum whose float32 mean, remapped, could land on
 * `target`. The half-width is the larger of a relative slack and three float32 steps of the target
 * mapped back to a mean, so the window keeps a real width when the target sits at the range minimum
 * (where the centre is zero and a purely relative slack would collapse it). The exact order check in
 * stepSolve is what decides.
 */
export function sumWindow(target, n, lo, hi, slack = 1e-6) {
  const mean = (target - lo) / (hi - lo);
  const steps = 3 * ulp(target > 0 ? target : hi) / (hi - lo);
  const pad = Math.max(Math.abs(mean) * slack, steps);
  return [Math.max(0, n * (mean - pad)), n * (mean + pad)];
}

/**
 * Verify a candidate from a fast float64 pre-filter against the exact order model.
 *
 * A pre-filter can report a float that no insertion order reaches (a phantom). If the claimed float
 * is reachable, the hit comes back with its witness order and share. If not, `rescue` (optional) may
 * pick a genuinely reachable landing instead (for example one that keeps the same digit pattern); if
 * it picks none, the hit is dropped and null is returned. A phantom is never passed through.
 *
 * @param {{ids:any[], float:number, lo:number, hi:number}} hit
 * @param {(id:any, index:number)=>number} adjOf     adjusted float of an input
 * @param {(landings:object[])=>object|null} [rescue]
 */
export function verifyHit(hit, adjOf, rescue) {
  const adjs = hit.ids.map((id, i) => fr(adjOf(id, i)));
  const L = landingDistribution(adjs, hit.lo, hit.hi);
  let m = L.find(l => Object.is(l.float, hit.float));
  let rescued = false;
  if (!m) {
    m = rescue ? rescue(L) : null;
    if (!m) return null;
    rescued = true;
  }
  return {
    ...hit,
    float: m.float,
    order: m.order.map(ix => hit.ids[ix]),
    orderIndex: m.order,
    share: m.share,
    landings: L.length,
    verified: true,
    rescued,
  };
}

/**
 * Why a target cannot be reached from this pool: the mean it needs, the window the pool can reach,
 * and the closest mean a greedy search plus single swaps could find.
 */
export function feasibility(adjsIn, n, needSum) {
  const adj = adjsIn.slice().sort((a, b) => a - b);
  if (adj.length < n) return null;
  const minS = adj.slice(0, n).reduce((a, b) => a + b, 0);
  const maxS = adj.slice(-n).reduce((a, b) => a + b, 0);
  const items = adj.map((a, i) => ({ a, id: i }));
  const t = needSum / n;
  const sel = items.slice().sort((x, y) => Math.abs(x.a - t) - Math.abs(y.a - t)).slice(0, n);
  const inS = new Set(sel.map(x => x.id));
  let cur = sel.reduce((s, x) => s + x.a, 0), err = Math.abs(cur - needSum), improved = true, guard = 0;
  while (improved && guard++ < 2000) {
    improved = false;
    for (let i = 0; i < n && !improved; i++) {
      for (const c of items) {
        if (inS.has(c.id)) continue;
        const ns = cur - sel[i].a + c.a;
        if (Math.abs(ns - needSum) < err - 1e-18) {
          inS.delete(sel[i].id); inS.add(c.id); sel[i] = c; cur = ns; err = Math.abs(ns - needSum); improved = true; break;
        }
      }
    }
  }
  return { minMean: minS / n, maxMean: maxS / n, bestMean: cur / n, needMean: needSum / n, gap: err / n };
}
