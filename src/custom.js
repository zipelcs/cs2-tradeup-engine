// Custom Float: aim at one exact output float.

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


