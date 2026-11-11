import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { load, catalogue } from './helpers.js';

// Recorded runs on a real pool. The fixture holds only the inputs each run used.
const R = load('showcase.json');
const OUT = { min: 0, max: 1 };
const adj = items => E.withAdjusted(items, catalogue);
const dist = items => E.landingDistribution(adj(items).map(x => x.adj), 0, 1);

test('batch: 50 contracts, every one Factory New in every insertion order', () => {
  const B = R.batch;
  assert.equal(B.contracts.length, 50);
  assert.equal(B.supported, 128);
  assert.equal(B.supportedWithoutConserve, 175);
  assert.equal(B.conserved, 145);
  const all = B.contracts.flat();
  assert.equal(new Set(all.map(x => x.id)).size, 250, 'no input used twice');
  for (const c of B.contracts) {
    const a = adj(c);
    assert.ok(a.every(x => x.adj >= 0.02), 'the conserved range is untouched');
    assert.ok(a.reduce((s, x) => s + x.adj, 0) <= B.settings.T * 5 + 1e-12);
    for (const l of dist(c)) assert.equal(E.wearOf(l.float), 'Factory New');
  }
  assert.ok(Object.is(dist(B.contracts[0])[0].float, 0.069999903440475464));
  const worst = Math.max(...B.contracts.flatMap(c => dist(c).map(l => l.float)));
  assert.ok(Object.is(worst, 0.069999910891056061));
  assert.ok(worst < E.WEAR_EDGES[0]);
});

test('batch: the loop is a sequential greedy, not an optimiser', () => {
  // Re-solving the 250 recorded inputs on their own rebuilds 49 contracts, not 50: without the rest of
  // the pool the picks fall in a different order and five inputs are stranded. Pinned as it is.
  const pool = adj(R.batch.contracts.flat());
  const r = E.solveAll(pool, { n: 5, objective: 'under', T: R.batch.settings.T, window: R.batch.settings.window });
  assert.equal(r.contracts.length, 49);
  assert.equal(r.leftovers.length, 5);
  for (const c of r.contracts) for (const l of E.landingDistribution(c.map(x => x.adj), 0, 1)) assert.equal(E.wearOf(l.float), 'Factory New');
});

test('fillers: three collection inputs and two fillers, each group inside its own range', () => {
  const s = R.fillers.settings;
  for (const run of R.fillers.runs) {
    const a = adj(run.items).map((x, i) => ({ ...x, pool: run.items[i].pool }));
    assert.equal(a.filter(x => x.pool).length, 3);
    assert.ok(a.filter(x => x.pool).every(x => x.adj >= s.window.lo && x.adj <= s.window.hi));
    assert.ok(a.filter(x => !x.pool).every(x => x.adj >= s.fillerWindow.lo && x.adj <= s.fillerWindow.hi));
    assert.ok(dist(run.items).every(l => E.wearOf(l.float) === 'Factory New'));
    const again = E.solve(a, { ...s, strategy: run.strategy });
    assert.deepEqual(again.map(x => x.id).sort(), a.map(x => x.id).sort());
  }
  const mean = (run, p) => { const a = adj(run.items).filter((x, i) => run.items[i].pool === p); return a.reduce((s, x) => s + x.adj, 0) / a.length; };
  const [bal, off] = R.fillers.runs;
  assert.ok(mean(off, false) < mean(bal, false), 'offset pins the fillers lower');
});

const exact = label => R.exact.find(x => x.label === label);

test('0.0696969 on the Karambit: one set where every order hits, one where 65% do', () => {
  const t = 0.069696970283985138;
  const robust = exact('0.0696969 run of 69s'), fragile = exact('0.0696969 fragile');
  assert.ok(Object.is(robust.target, t) && Object.is(fragile.target, t));
  const a = dist(robust.order);
  assert.equal(a.length, 1);
  assert.ok(Object.is(a[0].float, t) && a[0].share === 1 && a[0].orders === 120);
  assert.equal(E.robustness(adj(robust.order).map(x => x.adj), 0, 1, t).verdict, 'ROBUST');
  const b = dist(fragile.order);
  assert.equal(b.length, 3);
  assert.ok(Object.is(b[0].float, t) && Math.abs(b[0].share - 0.65) < 1e-12);
  assert.deepEqual(b.slice(1).map(l => l.float), [0.069696977734565735, 0.069696962833404541]);
  assert.deepEqual(b.slice(1).map(l => Math.round(l.share * 100)), [20, 15]);
  assert.equal(E.robustness(adj(fragile.order).map(x => x.adj), 0, 1, t).verdict, 'FRAGILE');
  // the recorded click order is one that hits
  assert.ok(Object.is(E.landing(adj(fragile.order), OUT), t));
  assert.equal(E.wearOf(t), 'Factory New');
});

test('the seven 8s: 0.0088888881728 exactly, from every order', () => {
  const x = exact('seven 8s'), t = 0.0088888881728053093;
  assert.ok(Object.is(x.target, t));
  const L = dist(x.order);
  assert.equal(L.length, 1);
  assert.ok(Object.is(L[0].float, t));
  assert.equal(E.flDifficulty(t), 1, 'the only float32 that shows seven 8s');
  assert.equal(E.flScore(t).tier, 'S');
});

test('every recorded exact hit replays, and Step-Solve finds it again from the recorded inputs', () => {
  assert.ok(R.exact.length >= 5);
  for (const x of R.exact) {
    assert.ok(Object.is(E.landing(adj(x.order), OUT), x.target), x.label);
    const L = dist(x.order), hit = L.find(l => Object.is(l.float, x.target));
    assert.ok(Math.abs(hit.share - x.share) < 1e-12, x.label);
    assert.equal(L.length, x.landings);
    const h = E.exactFloat(adj(x.order), 5, x.target, OUT);
    assert.ok(h && Object.is(h.float, x.target), x.label);
  }
});

test('hunter: the maximin beats the bar and keeps the lowest floats back', () => {
  const H = R.hunter, a = adj(H.items), low = adj(H.lowest);
  for (const l of dist(H.items)) assert.ok(l.float <= H.bar);
  assert.ok(Math.min(...a.map(x => x.adj)) > Math.max(...low.map(x => x.adj)), 'none of the five best copies is spent');
  assert.ok(H.keptBelow >= 5);
  const pick = E.huntPick([...a, ...low].map(x => ({ ...x, on: true })), 5, H.bar, {});
  assert.deepEqual(pick.map(x => x.id).sort(), a.map(x => x.id).sort());
});

test('float lab: every recorded hit lands where it says, in the order given', () => {
  for (const h of R.floatlab.hits) {
    const got = E.landingFromAdjusted(adj(h.order).map(x => x.adj), h.lo, h.hi);
    assert.ok(Object.is(got, h.float));
    assert.equal(E.flDesire(h.float, { max: h.hi }).tier, h.tier);
  }
});

test('over mode: the lowest Minimal Wear, never Factory New', () => {
  const L = dist(R.over.items);
  for (const l of L) assert.equal(E.wearOf(l.float), 'Minimal Wear');
  assert.ok(Math.max(...L.map(l => l.float)) < 0.0700002);
});
