import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { synthetic } from './helpers.js';

const coll = synthetic(40, 31, 0.02, 0.30, { pool: true });
const fill = synthetic(40, 32, 0.00, 0.30, { pool: false });
const pool = [...coll, ...fill];
const count = sel => sel.filter(x => x.pool).length;
const ctx = (over = {}) => ({ n: 10, T: 0.12, objective: 'under', quotas: E.activeQuotas([{ group: 'pool', mode: 'exact', k: 4 }], 10), strategy: 'bal', ...over });

test('a rule that counts fillers is rewritten as its dual on collection inputs', () => {
  assert.deepEqual(E.activeQuotas([{ group: 'pool', count: 'filler', mode: 'exact', k: 3 }], 10), [{ tag: 'pool', mode: 'exact', k: 7 }]);
  assert.deepEqual(E.activeQuotas([{ group: 'pool', count: 'filler', mode: 'max', k: 3 }], 10), [{ tag: 'pool', mode: 'min', k: 7 }]);
  assert.deepEqual(E.activeQuotas([{ group: 'pool', count: 'filler', mode: 'min', k: 3 }], 10), [{ tag: 'pool', mode: 'max', k: 7 }]);
});

test('scoped windows: a filler below the collection minimum is still legal', () => {
  const c = E.candidates([{ id: 1, adj: 0.012, pool: false }, { id: 2, adj: 0.012, pool: true }, { id: 3, adj: 0.05, pool: true }],
    { window: { lo: 0.02, hi: 0.15 }, fillerWindow: { lo: 0.005, hi: 0.02 } });
  assert.deepEqual(c.map(x => x.id), [1, 3]);
});

test('applyFillerCap aims the collection inputs at their own target', () => {
  // fillers pinned low: the 4 collection inputs must run above the global target
  const lowFill = fill.filter(x => x.adj < 0.05);
  const shaped = E.applyFillerCap([...coll, ...lowFill], ctx());
  const kept = shaped.filter(x => x.pool);
  assert.ok(kept.length <= 8, 'k closest plus k safest');
  const closest = kept.slice(0, 4);
  assert.ok(closest.reduce((a, x) => a + x.adj, 0) / 4 > 0.12, 'collection target sits above the global target');
});

test('phase 1 trims an excess of members', () => {
  const sel = E.enforceQuotas(coll.slice(0, 10), pool, ctx());
  assert.equal(count(sel), 4);
});

test('phase 2 adds missing members', () => {
  const sel = E.enforceQuotas(fill.slice(0, 10), pool, ctx());
  assert.equal(count(sel), 4);
});

test('phase 3 repairs the budget without changing the counts, or returns null', () => {
  const high = pool.slice().sort((a, b) => b.adj - a.adj);
  const start = [...high.filter(x => x.pool).slice(0, 4), ...high.filter(x => !x.pool).slice(0, 6)];
  assert.ok(E.stats(start).mean > 0.12);
  const sel = E.enforceQuotas(start, pool, ctx());
  assert.equal(count(sel), 4);
  assert.ok(E.stats(sel).mean <= 0.12 + 1e-9);
  assert.equal(E.enforceQuotas(start, pool, ctx({ T: 0.001 })), null);
});

test('phase 4 climbs back toward the cap so no headroom is wasted', () => {
  const low = pool.slice().sort((a, b) => a.adj - b.adj);
  const start = [...low.filter(x => x.pool).slice(0, 4), ...low.filter(x => !x.pool).slice(0, 6)];
  const before = E.stats(start).mean;
  const sel = E.enforceQuotas(start, pool, ctx());
  assert.ok(E.stats(sel).mean > before + 0.05);
  assert.ok(0.12 - E.stats(sel).mean < 0.002, 'lands just under the cap');
  assert.equal(count(sel), 4);
});

test('offset pins fillers low and lets only the collection climb', () => {
  const low = pool.slice().sort((a, b) => a.adj - b.adj);
  const start = [...low.filter(x => x.pool).slice(0, 4), ...low.filter(x => !x.pool).slice(3, 9)];
  const bal = E.enforceQuotas(start, pool, ctx());
  const off = E.enforceQuotas(start, pool, ctx({ strategy: 'offset' }));
  const mean = (sel, p) => { const s = sel.filter(x => !!x.pool === p); return s.reduce((a, x) => a + x.adj, 0) / s.length; };
  assert.deepEqual(off.filter(x => !x.pool).map(x => x.adj).sort(), low.filter(x => !x.pool).slice(0, 6).map(x => x.adj).sort());
  assert.ok(mean(off, false) < mean(bal, false));
  assert.ok(mean(off, true) > mean(bal, true));
  assert.ok(E.stats(off).mean <= 0.12 + 1e-9);
});

test('phase 5 tunes an exact target inside the quota', () => {
  const start = [...coll.slice(0, 4), ...fill.slice(0, 6)];
  const sel = E.enforceQuotas(start, pool, ctx({ objective: 'exact', T: 0.1 }));
  assert.equal(count(sel), 4);
  assert.ok(Math.abs(E.stats(sel).mean - 0.1) < Math.abs(E.stats(start).mean - 0.1));
  assert.ok(Math.abs(E.stats(sel).mean - 0.1) < 1e-4);
});

test('one contract mixing both groups, each held to its own range', () => {
  const sel = E.solve(pool, { n: 10, objective: 'under', T: 0.12, window: { lo: 0.10, hi: 0.30 }, fillerWindow: { lo: 0, hi: 0.06 }, rules: [{ group: 'pool', mode: 'exact', k: 4 }], strategy: 'offset' });
  assert.equal(count(sel), 4);
  assert.ok(sel.filter(x => x.pool).every(x => x.adj >= 0.10));
  assert.ok(sel.filter(x => !x.pool).every(x => x.adj <= 0.06));
  assert.ok(E.stats(sel).mean <= 0.12 + 1e-9);
});

test('a minimum and a maximum', () => {
  const a = E.solve(pool, { n: 10, objective: 'under', T: 0.12, rules: [{ group: 'pool', mode: 'min', k: 6 }] });
  assert.ok(count(a) >= 6);
  const b = E.solve(pool, { n: 10, objective: 'under', T: 0.12, rules: [{ group: 'pool', mode: 'max', k: 2 }] });
  assert.ok(count(b) <= 2);
});
