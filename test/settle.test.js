import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { chroma3, catalogue, skin } from './helpers.js';

const fr = Math.fround;
const seeded = (seed, size, hi) => {
  let s = (seed * 7919) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  return Array.from({ length: size }, (_, i) => ({ id: seed + '-' + i, adj: fr(rnd() * hi) }));
};
const landings = (sel, out) => E.landingDistribution(sel.map(x => x.adj), out.min, out.max).map(l => l.float);

// Each case: inputs per contract, pool size, top of the adjusted range, wear index of the cap, output range.
const CASES = [
  [10, 300, 0.3, 1, { min: 0, max: 1 }],        // largest Minimal Wear float, zero margin
  [10, 300, 0.5, 2, { min: 0.06, max: 0.8 }],   // largest Field-Tested float on a 0.06 to 0.80 skin
  [5, 400, 0.3, 1, { min: 0, max: 1 }],
  [5, 300, 1, 0, { min: 0, max: 0.08 }],        // largest Factory New float on a 0 to 0.08 skin
];

test('the float64 core alone lands above the cap in some insertion orders', () => {
  // this is the fault the float32 check exists for: the budget holds in float64 and the game disagrees
  let breaches = 0;
  for (const [n, size, hi, wear, out] of CASES.slice(0, 2)) {
    for (let seed = 1; seed <= 40; seed++) {
      const cap = E.maxOfWear(wear), T = E.targetAdjusted(cap, out);
      const core = E.underCore(seeded(seed, size, hi), n, T * n);
      assert.ok(E.stats(core).sum <= T * n + 1e-12, 'inside its float64 budget');
      if (E.breach(core, 'under', cap, out) != null) breaches++;
    }
  }
  assert.ok(breaches > 0, 'no breach found, so this test proves nothing');
});

test('under: no insertion order of a solved contract lands above the cap, with zero margin', () => {
  for (const [n, size, hi, wear, out] of CASES) {
    for (let seed = 1; seed <= 40; seed++) {
      const cap = E.maxOfWear(wear), T = E.targetAdjusted(cap, out);
      const sel = E.solve(seeded(seed, size, hi), { n, objective: 'under', T, cap, out });
      assert.ok(sel, 'a contract exists');
      assert.equal(new Set(sel).size, n);
      for (const f of landings(sel, out)) {
        assert.ok(f <= cap, `${E.show(f)} above ${E.show(cap)} (n ${n}, seed ${seed})`);
        assert.equal(E.wearOf(f), E.WEARS[wear]);
      }
    }
  }
});

test('under: without out and cap the float32 mean itself never passes T', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const T = E.maxOfWear(1);
    const sel = E.solve(seeded(seed, 300, 0.3), { n: 10, objective: 'under', T });
    for (const f of landings(sel, { min: 0, max: 1 })) assert.ok(f <= T);
  }
});

test('over: no insertion order lands under the floor', () => {
  const out = { min: 0, max: 1 }, floor = E.WEAR_EDGES[0]; // the smallest Minimal Wear float, zero margin
  for (let seed = 1; seed <= 40; seed++) {
    const sel = E.solve(seeded(seed, 300, 0.3), { n: 10, objective: 'over', T: floor, cap: floor, out });
    assert.ok(sel);
    for (const f of landings(sel, out)) {
      assert.ok(f >= floor, E.show(f));
      assert.equal(E.wearOf(f), 'Minimal Wear');
    }
  }
});

test('the step down keeps quota counts and windows', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const pool = seeded(seed, 300, 0.3).map((x, i) => ({ ...x, pool: i % 2 === 0 }));
    const cap = E.maxOfWear(1), out = { min: 0, max: 1 };
    const sel = E.solve(pool, { n: 10, objective: 'under', T: cap, cap, out, window: { lo: 0.05 }, fillerWindow: { lo: 0.02 }, rules: [{ group: 'pool', mode: 'exact', k: 4 }] });
    assert.ok(sel);
    assert.equal(sel.filter(x => x.pool).length, 4);
    assert.ok(sel.every(x => x.adj >= (x.pool ? 0.05 : 0.02)));
    assert.equal(E.breach(sel, 'under', cap, out), null);
  }
});

test('settle returns null when the pool has nothing lower to swap in', () => {
  const sel = [0.5, 0.5, 0.5, 0.5, 0.5].map((adj, i) => ({ id: i, adj }));
  assert.equal(E.settle(sel, sel, { objective: 'under', cap: 0.4 }), null);
  assert.deepEqual(E.settle(sel, sel, { objective: 'under', cap: 0.5 }), sel);
});

test('breach reports the worst landing and skips outcomes the cap cannot reach', () => {
  const sel = [0.5, 0.5, 0.5, 0.5, 0.5].map((adj, i) => ({ id: i, adj }));
  assert.equal(E.breach(sel, 'under', 0.5), null);
  assert.equal(E.breach(sel, 'under', 0.4), 0.5);
  assert.equal(E.breach(sel, 'over', 0.6), 0.5);
  assert.equal(E.breach(sel, 'under', 0.05, { min: 0.06, max: 0.8 }), null); // floor above the cap
});

test('hunter: the pick stays at or under the record in every insertion order', () => {
  const knife = skin('★ Karambit | Doppler (Phase 1)');
  for (const bar of [0.069999992847442627, 0.05, 0.03, 0.02, 0.012]) {
    const r = E.huntSolve(knife, bar, chroma3(), catalogue);
    if (!r.ok) continue;
    for (const f of landings(r.sel, knife)) assert.ok(f <= bar, `${E.show(f)} above ${bar}`);
  }
  let checked = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const cands = seeded(seed, 200, 0.3).map(x => ({ ...x, name: 'Sample Covert', on: true }));
    const target = { name: 't', min: 0, max: 1 }, bar = 0.1;
    const pick = E.huntPick(cands, 10, bar, {});
    const sel = E.settle(pick, cands, { objective: 'under', cap: bar, out: target });
    for (const f of landings(sel, target)) assert.ok(f <= bar);
    checked++;
  }
  assert.equal(checked, 30);
});
