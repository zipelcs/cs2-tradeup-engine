import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { chroma3, synthetic } from './helpers.js';

const T = E.targetAdjusted(0.069999992847442627, { min: 0, max: 0.08 });

test('xN never uses an item twice and sorts best first', () => {
  const pool = synthetic(120, 13, 0, 0.3);
  const r = E.multiContract(pool, { n: 10, objective: 'under', T: 0.1 }, 6);
  assert.equal(r.contracts.length, 6);
  const all = r.contracts.flat();
  assert.equal(new Set(all).size, 60);
  const sums = r.contracts.map(c => E.stats(c).sum);
  assert.deepEqual(sums, sums.slice().sort((a, b) => b - a));
  assert.ok(sums.every(s => s <= 1 + 1e-9));
  assert.equal(r.leftovers.length, 60);
});

test('xN is capped at 50 and says so', () => {
  const r = E.multiContract(synthetic(30, 14, 0, 0.3), { n: 10, objective: 'under', T: 0.2 }, 80);
  assert.equal(r.capped, true);
  assert.equal(r.contracts.length, 3);
});

test('Solve-all on the Chroma 3 pool: three contracts, then the pool runs out', () => {
  const r = E.solveAll(chroma3(), { n: 5, objective: 'under', T });
  assert.equal(r.contracts.length, 3);
  assert.equal(r.leftovers.length, 2);
  assert.deepEqual(r.contracts[0].map(x => x.id).sort(), ['c13', 'c14', 'c15', 'c16', 'c17']);
});

test('it is a sequential greedy: the first contract is the single-contract answer', () => {
  const pool = synthetic(90, 15, 0, 0.3), opts = { n: 10, objective: 'under', T: 0.1 };
  const one = E.solve(pool, opts), many = E.solveAll(pool, opts);
  assert.deepEqual(many.contracts[0].map(x => x.id).sort(), one.map(x => x.id).sort());
});

test('Diversify spreads a contract across collections inside the budget', () => {
  const sel = synthetic(10, 16, 0.05, 0.10).map(x => ({ ...x, coll: 'A' }));
  const cands = ['B', 'C', 'D', 'E'].flatMap((c, i) => synthetic(6, 40 + i, 0.02, 0.2).map(x => ({ ...x, coll: c })));
  const before = E.stats(sel).sum, budget = 0.1;
  const r = E.diversify(sel, cands, { objective: 'under', T: budget });
  assert.ok(r.swaps >= 3 && r.collections >= 4);
  assert.ok(E.stats(r.sel).sum <= budget * 10 + 1e-9);
  assert.ok(r.sel.some(x => x.coll === 'A'), 'the original collection is never removed entirely');
  assert.equal(new Set(r.sel).size, 10);
  assert.ok(before <= budget * 10);
});

test('Diversify refuses a swap that breaks the cap', () => {
  const sel = synthetic(10, 17, 0.09, 0.10).map(x => ({ ...x, coll: 'A' }));
  const cands = synthetic(6, 50, 0.5, 0.9).map(x => ({ ...x, coll: 'B' }));
  assert.equal(E.diversify(sel, cands, { objective: 'under', T: 0.1 }).swaps, 0);
});
