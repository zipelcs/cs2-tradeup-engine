import { readFileSync } from 'node:fs';
import { withAdjusted } from '../src/index.js';

export const load = name => JSON.parse(readFileSync(new URL('../fixtures/' + name, import.meta.url), 'utf8'));
export const catalogue = load('catalogue.json');
export const skin = name => catalogue.find(s => s.name === name);

/** The 17 owned Chroma 3 coverts, with adjusted floats. */
export const chroma3 = () => withAdjusted(load('chroma3-pool.json'), catalogue);

/** A seeded pool of n inputs spread over [lo, hi) in adjusted float. Synthetic. */
export function synthetic(n, seed = 7, lo = 0, hi = 1, extra = {}) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  return Array.from({ length: n }, (_, i) => ({ id: 'S' + seed + '-' + i, adj: Math.fround(lo + rnd() * (hi - lo)), ...extra }));
}
