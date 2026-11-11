import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';

// A synthetic catalogue and inventory: one case, one collection, two possible covert drops.
const CAT = [
  { name: 'Knife', category: 'Knives', rarity: 'Covert', min: 0, max: 0.08, collections: [], crates: ['Case X'] },
  { name: 'Covert One', category: 'Rifles', rarity: 'Covert', min: 0, max: 1, collections: ['Coll X'], crates: ['Case X'] },
  { name: 'Covert Two', category: 'Rifles', rarity: 'Covert', min: 0, max: 0.5, collections: ['Coll X'], crates: ['Case X'] },
  { name: 'Pink One', category: 'Rifles', rarity: 'Classified', min: 0, max: 1, collections: ['Coll X'], crates: ['Case X'] },
  { name: 'Pink Two', category: 'Pistols', rarity: 'Classified', min: 0, max: 0.7, collections: ['Coll X'], crates: ['Case X'] },
];
let s = 123;
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
const raw = [];
for (let i = 0; i < 6; i++) raw.push({ id: 'cov' + i, name: i % 2 ? 'Covert One' : 'Covert Two', float: 0.02 + rnd() * 0.1 });
for (let i = 0; i < 40; i++) raw.push({ id: 'pink' + i, name: i % 2 ? 'Pink One' : 'Pink Two', float: 0.01 + rnd() * 0.25 });
const items = E.withAdjusted(raw, CAT), knife = CAT[0];

// a target the chain can reach by construction: four coverts plus a fifth made from ten pinks
const four = items.filter(x => x.id.startsWith('cov')).slice(0, 4), ten = items.filter(x => x.id.startsWith('pink')).slice(0, 10);
const mean32 = E.meanAdjusted(ten.map(x => x.adj));
const drop = E.remap(mean32, 0, 1, 0, 1); // if "Covert One" drops
const TARGET = E.landingFromAdjusted([...four.map(x => x.adj), E.adjust(drop, 0, 1)], 0, 0.08);

test('plans both stages and returns a branch table for every possible drop', () => {
  const plan = E.planChain(knife, TARGET, items, CAT);
  assert.ok(plan, 'no plan');
  assert.equal(plan.four.length, 4);
  assert.equal(plan.ten.length, 10);
  assert.equal(plan.branches.length, 2);
  assert.ok(plan.covered >= 1);
  assert.deepEqual(plan.branches.map(b => b.skin).sort(), ['Covert One', 'Covert Two']);
});

test('every branch marked reachable replays to the exact target', () => {
  const plan = E.planChain(knife, TARGET, items, CAT);
  const stage1 = E.meanAdjusted(plan.tenOrder.map(x => x.adj));
  for (const b of plan.branches) {
    const def = CAT.find(c => c.name === b.skin);
    assert.ok(Object.is(b.float, E.remap(stage1, 0, 1, E.fr(def.min), E.fr(def.max))), 'stage 1 float for this drop');
    const five = [...plan.four.map(x => x.adj), E.adjust(b.float, def.min, def.max)];
    if (b.ok) {
      assert.ok(Object.is(E.landingFromAdjusted(b.order.map(i => five[i]), knife.min, knife.max), plan.target));
      assert.ok(b.share > 0);
    } else {
      assert.ok(!E.landingDistribution(five, knife.min, knife.max).some(l => Object.is(l.float, plan.target)));
      assert.ok(Number.isFinite(b.nearest));
    }
  }
});

test('no plan without four coverts and ten classifieds, or outside the target range', () => {
  assert.equal(E.planChain(knife, TARGET, items.filter(x => !x.id.startsWith('pink')), CAT), null);
  assert.equal(E.planChain(knife, TARGET, items.filter(x => x.id.startsWith('pink')), CAT), null);
  assert.equal(E.planChain(knife, 0.5, items, CAT), null);
});

test('the planner is deterministic: the same call gives the same plan, and budgets are counts', () => {
  const a = E.planChain(knife, TARGET, items, CAT), b = E.planChain(knife, TARGET, items, CAT);
  assert.deepEqual(a, b);
  assert.equal(E.planChain(knife, TARGET, items, CAT, { capTen: 1 }), null); // one node is not enough
});
