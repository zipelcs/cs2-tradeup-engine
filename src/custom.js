// Custom Float: aim at one exact output float.

import { fr } from './f32.js';
import { landingDistribution } from './orders.js';
import { stepSolve, sumWindow } from './solver.js';
import { byName, isGold, goldPool, collSkins, nextRarity } from './catalogue.js';
import { solve, targetAdjusted } from './maxfloat.js';

/**
 * The contract whose mean adjusted float is closest to the one the target needs.
 * @param {object[]} items   inputs with adj
 * @param {number} target    output float
 * @param {{min:number,max:number}} out  the target skin's caps
 * @param {object} [opts]    n, window, rules and the rest of maxfloat.solve
 */
export function customFloat(items, target, out, opts = {}) {
  const T = targetAdjusted(target, out, 'exact');
  return solve(items, { ...opts, objective: 'exact', T });
}

/**
 * Standalone closest-sum solver: n inputs whose adjusted sum is closest to T. Seed with the n inputs
 * individually closest to T/n, then single swaps until none improves. Deterministic.
 * @param {{id:any, adj:number}[]} inputs
 */
export function closestSum(inputs, n, T) {
  if (inputs.length < n) return null;
  const tgt = T / n;
  const sel = inputs.slice().sort((a, b) => Math.abs(a.adj - tgt) - Math.abs(b.adj - tgt)).slice(0, n);
  const inSel = new Set(sel);
  let cur = sel.reduce((s, x) => s + x.adj, 0), err = Math.abs(cur - T), guard = 0, improved = true;
  while (improved && guard++ < 1200) {
    improved = false;
    for (let i = 0; i < n && !improved; i++) {
      for (const c of inputs) {
        if (inSel.has(c)) continue;
        const ns = cur - sel[i].adj + c.adj;
        if (Math.abs(ns - T) < err - 1e-15) {
          inSel.delete(sel[i]); inSel.add(c); sel[i] = c; cur = ns; err = Math.abs(ns - T); improved = true; break;
        }
      }
    }
  }
  return { sel, sum: cur };
}

/**
 * Every craftable pool in an inventory: at least 5 coverts of one case (into that case's knives and
 * gloves), or at least 10 items of one collection and rarity (into the next rarity).
 * @param {object[]} items      owned items with name and adj
 * @param {object[]} catalogue
 * @returns {{need:number, label:string, inputs:object[], outs:object[]}[]}
 */
export function buildPools(items, catalogue) {
  const idx = byName(catalogue), pools = [];
  const byCase = {}, byCR = {};
  for (const it of items) {
    if (it.adj == null) continue;
    const d = idx.get(it.name);
    if (!d || isGold(d)) continue;
    if (d.rarity === 'Covert') {
      for (const c of d.crates || []) (byCase[c] = byCase[c] || []).push(it);
    } else if (nextRarity(d.rarity)) {
      for (const cl of d.collections || []) {
        const key = cl + '|' + d.rarity;
        (byCR[key] = byCR[key] || { cl, rar: d.rarity, ins: [] }).ins.push(it);
      }
    }
  }
  for (const c of Object.keys(byCase)) {
    if (byCase[c].length < 5) continue;
    const outs = goldPool(catalogue, c);
    if (outs.length) pools.push({ need: 5, label: c, inputs: byCase[c], outs });
  }
  for (const key of Object.keys(byCR)) {
    const g = byCR[key];
    if (g.ins.length < 10) continue;
    const outs = collSkins(catalogue, g.cl, nextRarity(g.rar));
    if (outs.length) pools.push({ need: 10, label: g.cl + ' ' + g.rar, inputs: g.ins, outs });
  }
  return pools;
}

/**
 * The sweep: which of my pools can make this float at all?
 *
 * Takes one target, groups each pool's outcomes by float range, runs the closest-sum solver on each
 * group, enumerates every insertion order of the result, and ranks the pools by distance from the
 * target with exact hits first.
 * @param {number} target
 * @param {object[]} pools   from buildPools
 */
export function customSweep(target, pools) {
  const rows = [];
  for (const P of pools) {
    const groups = {};
    for (const o of P.outs) {
      if (!(o.max > o.min) || target < o.min || target > o.max) continue;
      const k = o.min + '|' + o.max;
      (groups[k] = groups[k] || { lo: o.min, hi: o.max, outs: [] }).outs.push(o);
    }
    for (const G of Object.values(groups)) {
      const T = (target - G.lo) / (G.hi - G.lo) * P.need;
      const sol = closestSum(P.inputs, P.need, T);
      if (!sol) continue;
      const L = landingDistribution(sol.sel.map(x => x.adj), G.lo, G.hi);
      let best = null;
      for (const l of L) { const d = Math.abs(l.float - target); if (!best || d < best.d) best = { d, l }; }
      rows.push({
        pool: P.label, need: P.need, outs: G.outs, lo: G.lo, hi: G.hi,
        order: best.l.order.map(i => sol.sel[i]), float: best.l.float, share: best.l.share,
        landings: L.length, diff: best.d, exact: Object.is(best.l.float, fr(target)),
      });
    }
  }
  rows.sort((a, b) => (b.exact ? 1 : 0) - (a.exact ? 1 : 0) || a.diff - b.diff);
  return rows;
}

/**
 * Land exactly on one float32 step.
 *
 * Step-Solve over the pool with the sum window of the target, accepting only that exact float. The
 * result carries the chosen inputs in a click order that hits, the share of all orders that hit, the
 * other landings, and how much of the search space was visited.
 * @param {{id:any, adj:number}[]} inputs
 * @param {number} n
 * @param {number} target     must be a float32 value
 * @param {{min:number,max:number}} out
 * @param {{cap?:number, minShare?:number, maxShare?:number, slack?:number}} [opts]  share bounds filter the hit
 */
export function exactFloat(inputs, n, target, out, opts = {}) {
  const t = fr(target);
  const [sumLo, sumHi] = sumWindow(t, n, out.min, out.max, opts.slack);
  const minShare = opts.minShare || 0, maxShare = opts.maxShare == null ? 1 : opts.maxShare;
  const accept = (f, l) => Object.is(f, t) && l.share >= minShare && l.share <= maxShare;
  const hit = stepSolve(inputs, n, sumLo, sumHi, out.min, out.max, accept, opts.cap);
  if (!hit || hit.float == null) return hit;
  const L = landingDistribution(hit.items.map(x => x.adj), out.min, out.max);
  return { ...hit, others: L.filter(l => !Object.is(l.float, t)).map(l => ({ float: l.float, share: l.share })) };
}
