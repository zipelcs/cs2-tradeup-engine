// Float Lab, first stage (17 June to 1 August): targets defined by mathematical value.
//
// There was never a formula parser. A target is the digit string of a named constant, sequence or
// reciprocal cycle, written after the decimal point behind zero to four leading zeros, converted to a
// target adjusted sum and handed to the closest-sum solver. This catalogue was replaced by the
// rare-float scorer in floatlab.js, because none of it sells a skin. It is kept as the first stage.

import { closestSum } from './custom.js';
import { landingFromAdjusted } from './tradeup.js';

export const CONSTANT_TARGETS = [
  ['31415926535897', 'pi'], ['62831853071795', 'tau'], ['27182818284590', 'e'], ['16180339887498', 'golden ratio'],
  ['14142135623730', 'sqrt 2'], ['17320508075688', 'sqrt 3'], ['22360679774997', 'sqrt 5'], ['69314718055994', 'ln 2'],
  ['57721566490153', 'Euler-Mascheroni'], ['12020569031595', 'Apery zeta(3)'], ['91596559417721', 'Catalan'], ['30102999566398', 'log10 2'],
  ['142857142857', '1/7 cycle'], ['012345679012', '1/81'], ['076923076923', '1/13 cycle'], ['037037037037', '1/27 cycle'],
  ['112358132134', 'Fibonacci'], ['235711131719', 'primes'], ['149162536496', 'squares'], ['124816326412', 'powers of 2'], ['136101521283', 'triangular'],
  ['123456789', 'ascending'], ['987654321', 'descending'], ['246802468', 'evens'], ['135791357', 'odds'], ['369369369', '369'],
  ['1729', 'Ramanujan'], ['6174', 'Kaprekar'],
];

const rep = (s, n) => { let o = ''; while (o.length < n) o += s; return o.slice(0, n); };

/** Significant digits after the decimal point, and how many zeros lead them. */
export function sigOf(fv, dp = 12) {
  const dec = fv.toFixed(dp).split('.')[1] || '';
  let lead = 0;
  while (lead < dec.length && dec[lead] === '0') lead++;
  return { sig: dec.slice(lead).replace(/0+$/, ''), lead };
}

/**
 * Score a float by its longest prefix match against the catalogue, plus runs and palindromes.
 * @returns {{score:number, label:string, len:number}}
 */
export function constantScore(fv) {
  const { sig, lead } = sigOf(fv), L = sig.length || 1;
  let best = { score: 0, label: '', len: 0 };
  const take = (sc, label, len) => { if (sc > best.score) best = { score: Math.round(sc), label, len }; };
  if (lead >= 4) take(45 + lead * 7, lead + ' leading zeros', lead);
  if (sig) {
    let run = 0;
    while (run < L && sig[run] === sig[0]) run++;
    if (run >= 3) take(60 * Math.pow(run / L, 1.3) + run * 8, run + 'x ' + sig[0], run);
  }
  if (L >= 5 && sig === sig.split('').reverse().join('')) take(55 + L * 3, 'palindrome', L);
  for (const [digits, label] of CONSTANT_TARGETS) {
    let m = 0;
    while (m < digits.length && m < sig.length && digits[m] === sig[m]) m++;
    if (m >= 4) take(40 * Math.pow(m / L, 1.1) + m * 7, label, m);
  }
  return best;
}

/**
 * Candidate target floats inside an output range: every catalogue entry at 0 to `maxLead` leading
 * zeros.
 */
export function constantCatalogue(fvMin, fvMax, maxLead = 4) {
  const out = [], seen = new Set();
  for (const [digits, label] of CONSTANT_TARGETS) {
    for (let k = 0; k <= maxLead; k++) {
      const dec = (rep('0', k) + digits).slice(0, 14);
      let v = +('0.' + dec);
      if (!(v > 0) || v < fvMin - 1e-12 || v > fvMax + 1e-12) continue;
      const key = v.toFixed(14);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ value: v, label, score: constantScore(v).score || 1 });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Search one pool for constant floats: a targeted pass that aims the closest-sum solver at each
 * catalogue value, then forward enumeration over sliding windows of the sorted inputs and over
 * random n-subsets drawn by a partial Fisher-Yates shuffle from a small LCG, seeded from the pool
 * label so a run is reproducible. Sampling, not exhaustive.
 * @param {{need:number, label:string, inputs:object[], outs:object[]}} P  a pool from buildPools
 * @param {{trials?:number, minLen?:number}} [opts]
 */
export function constantSearch(P, opts = {}) {
  const n = P.need, A = P.inputs, M = A.length, results = [];
  if (M < n) return results;
  const minLen = opts.minLen || 5;
  const groups = {};
  for (const o of P.outs) {
    if (!(o.max > o.min)) continue;
    const k = o.min + '|' + o.max;
    (groups[k] = groups[k] || { min: o.min, max: o.max, outs: [] }).outs.push(o.name);
  }
  const G = Object.values(groups);
  const record = sel => {
    for (const g of G) {
      const got = landingFromAdjusted(sel.map(x => x.adj), g.min, g.max);
      const cs = constantScore(got);
      if (cs.len < minLen) continue;
      results.push({ float: got, label: cs.label, len: cs.len, score: cs.score, outs: g.outs, lo: g.min, hi: g.max, items: sel.slice() });
    }
  };
  for (const g of G) {
    for (const c of constantCatalogue(g.min, g.max)) {
      const sol = closestSum(A, n, ((c.value - g.min) / (g.max - g.min)) * n);
      if (sol) record(sol.sel);
    }
  }
  const sorted = A.slice().sort((a, b) => a.adj - b.adj);
  for (let i = 0; i + n <= sorted.length; i++) record(sorted.slice(i, i + n));
  let seed = ((P.label.length * 131 + n) >>> 0) || 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const per = Math.min(opts.trials || 120000, 40000 + M * 120);
  const idx = A.map((_, i) => i);
  for (let t = 0; t < per; t++) {
    const sel = [];
    for (let k = 0; k < n; k++) {
      const sw = k + ((rnd() * (M - k)) | 0);
      const tmp = idx[k]; idx[k] = idx[sw]; idx[sw] = tmp;
      sel.push(A[idx[k]]);
    }
    record(sel);
  }
  const best = new Map();
  for (const r of results) {
    const k = r.float.toFixed(8) + '|' + r.outs[0];
    const ex = best.get(k);
    if (!ex || r.len > ex.len || (r.len === ex.len && r.score > ex.score)) best.set(k, r);
  }
  return [...best.values()].sort((a, b) => b.len - a.len || b.score - a.score);
}
