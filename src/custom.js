// Custom Float: aim at one exact output float.

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



