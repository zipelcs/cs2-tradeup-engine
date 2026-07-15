import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { synthetic } from './helpers.js';

const OUT = { min: 0, max: 1 };
const pool = synthetic(120, 61, 0.0, 0.2);

test('exactFloat lands on one float32 step and returns a click order that hits', () => {
  const t = E.landingFromAdjusted(pool.slice(10, 15).map(x => x.adj), 0, 1); // reachable by construction
  const h = E.exactFloat(pool, 5, t, OUT);
  assert.ok(h && h.float != null);
  assert.ok(Object.is(E.landingFromAdjusted(h.items.map(x => x.adj), 0, 1), t));
  assert.ok(h.nodes > 0 && h.subsets > 0);
  assert.ok(Math.abs(h.share + h.others.reduce((a, o) => a + o.share, 0) - 1) < 1e-12);
});

test('share bounds filter the hit', () => {
  const t = E.fr(0.0666666);
  const any = E.exactFloat(pool, 5, t, OUT);
  assert.ok(any && any.share > 0);
  const strong = E.exactFloat(pool, 5, t, OUT, { minShare: any.share });
  assert.ok(strong.share >= any.share);
  const all = E.exactFloat(pool, 5, t, OUT, { minShare: 1 });
  if (all) { assert.equal(all.share, 1); assert.equal(all.landings, 1); }
  const weak = E.exactFloat(pool, 5, t, OUT, { maxShare: 0.5 });
  if (weak && weak.float != null) assert.ok(weak.share <= 0.5);
});

test('the sum window keeps a width when the target is the range minimum', () => {
  const [lo, hi] = E.sumWindow(0.06, 10, 0.06, 0.8);
  assert.equal(lo, 0);
  assert.ok(hi > 0, 'a purely relative slack collapses to [0, 0] here');
  const [a, b] = E.sumWindow(0.25, 10, 0, 1);
  assert.ok(a < 2.5 && 2.5 < b);
  // an all-zero contract lands on the minimum and is found through that window
  const zeros = Array.from({ length: 12 }, (_, i) => ({ id: i, adj: 0 }));
  const h = E.exactFloat(zeros, 10, E.fr(0.06), { min: 0.06, max: 0.8 });
  assert.ok(h && Object.is(h.float, E.fr(0.06)));
});

test('inputs that share an id are still told apart', () => {
  const same = pool.map(x => ({ ...x, id: 'dup' }));
  const t = E.landingFromAdjusted(same.slice(20, 25).map(x => x.adj), 0, 1);
  const h = E.exactFloat(same, 5, t, OUT);
  assert.ok(Object.is(E.landingFromAdjusted(h.items.map(x => x.adj), 0, 1), t));
  assert.equal(new Set(h.items).size, 5);
});

test('a truncated search says capped; it never reads as no solution', () => {
  const r = E.exactFloat(pool, 5, E.fr(0.0666666), OUT, { cap: 20 });
  assert.equal(r.capped, true);
  assert.equal(r.float, undefined);
});
