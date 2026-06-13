import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { chroma3, synthetic } from './helpers.js';

const DOPPLER = { min: 0, max: 0.08 };
const MAX_FN = 0.069999992847442627;
const ids = sel => sel.map(x => x.id).sort();

test('the budget is per target skin', () => {
  assert.ok(Math.abs(E.targetAdjusted(0.07, DOPPLER) - 0.875) < 1e-9);
  assert.ok(Math.abs(E.targetAdjusted(0.07, { min: 0, max: 1 }) - 0.07) < 1e-12);
  assert.equal(E.targetAdjusted(0.05, { min: 0.06, max: 0.8 }), 0); // below the floor: impossible
  // several outcomes: bind on the worst reachable one, skip the one whose floor is above the target
  assert.ok(Math.abs(E.targetAdjusted(0.07, [DOPPLER, { min: 0, max: 1 }, { min: 0.1, max: 0.9 }]) - 0.07) < 1e-12);
});

test('max float on the Chroma 3 pool burns the five worst floats and keeps the rest', () => {
  const pool = chroma3(), T = E.targetAdjusted(MAX_FN, DOPPLER);
  const sel = E.solve(pool, { n: 5, objective: 'under', T });
  assert.deepEqual(ids(sel), ['c13', 'c14', 'c15', 'c16', 'c17']);
  assert.ok(E.stats(sel).sum <= T * 5);
  assert.ok(Math.abs(E.stats(sel).mean - 0.5752107262611389) < 1e-6);
});


test('underCore: greedy with a feasibility test, never over budget', () => {
  const pool = synthetic(60, 3, 0, 0.5);
  for (const budget of [1.1, 2.3, 3]) {
    const sel = E.underCore(pool, 10, budget);
    assert.equal(new Set(sel).size, 10);
    assert.ok(E.stats(sel).sum <= budget + 1e-12);
    // no single unused item can replace a selected one and still fit: the 1-swap pass is exhausted
    const cur = E.stats(sel).sum;
    for (const s of sel) for (const c of pool) {
      if (sel.includes(c) || c.adj <= s.adj) continue;
      assert.ok(cur - s.adj + c.adj > budget, 'an improving 1-swap was left on the table');
    }
  }
  assert.equal(E.underCore(pool, 10, 0.001), null);
});

test('over mode is the same core on negated values', () => {
  const pool = synthetic(60, 5, 0, 0.5);
  const sel = E.solve(pool, { n: 10, objective: 'over', T: 0.3 });
  assert.ok(E.stats(sel).mean >= 0.3 - 1e-12);
  assert.ok(E.stats(sel).mean < 0.31, 'lands just above the target, not far above');
  assert.equal(E.solve(pool, { n: 10, objective: 'over', T: 0.6 }), null);
});

test('a window conserves a range: nothing under the minimum is ever used', () => {
  const pool = synthetic(80, 11, 0, 0.3);
  const sel = E.solve(pool, { n: 10, objective: 'under', T: 0.1, window: { lo: 0.05 } });
  assert.ok(sel.every(x => x.adj >= 0.05));
  assert.ok(E.stats(sel).mean <= 0.1 + 1e-12);
});

test('duplicate ids do not confuse the solver', () => {
  const pool = synthetic(30, 9, 0, 0.4).map(x => ({ ...x, id: 'same' }));
  const sel = E.solve(pool, { n: 10, objective: 'under', T: 0.2 });
  assert.equal(new Set(sel).size, 10);
  assert.ok(E.stats(sel).mean <= 0.2 + 1e-12);
});

test('exactly k from the collection', () => {
  const pool = [...synthetic(30, 21, 0, 0.3, { pool: true }), ...synthetic(30, 22, 0, 0.3, { pool: false })];
  const sel = E.solve(pool, { n: 10, objective: 'under', T: 0.15, rules: [{ group: 'pool', mode: 'exact', k: 3 }] });
  assert.equal(sel.filter(x => x.pool).length, 3);
});
