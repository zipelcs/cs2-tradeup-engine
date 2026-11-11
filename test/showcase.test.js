import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as E from '../src/index.js';
import { load, catalogue } from './helpers.js';
import { fixturePool } from '../examples/showcase.js';

// Real floats recorded from a larger pool. Nothing here depends on that pool: every assertion is
// computed from the floats in the fixture.
const R = load('showcase.json');
const OUT = { min: 0, max: 1 };
const adj = items => E.withAdjusted(items, catalogue);
const dist = items => E.landingDistribution(adj(items).map(x => x.adj), 0, 1);
const POOL = adj(fixturePool(R));
const CAP = R.batch.settings.cap;

test('the cap is a float32 value 13 steps under the Factory New edge', () => {
  assert.ok(E.isFloat32(CAP));
  assert.equal(E.stepsBetween(CAP, E.WEAR_EDGES[0]), 13);
  assert.ok(Object.is(CAP, E.safeCap(0, 0, 1)));
});

test('batch: 50 recorded contracts, no insertion order of any of them lands above the cap', () => {
  const B = R.batch;
  assert.equal(B.contracts.length, 50);
  const all = B.contracts.flat();
  assert.equal(new Set(all.map(x => x.id)).size, 250, 'no input used twice');
  for (const c of B.contracts) {
    const a = adj(c);
    assert.ok(a.every(x => x.adj >= B.settings.window.lo), 'the conserved range is untouched');
    assert.equal(E.breach(a, 'under', CAP, OUT), null);
    for (const l of dist(c)) {
      assert.ok(l.float <= CAP, E.show(l.float));
      assert.equal(E.wearOf(l.float), 'Factory New');
    }
  }
  const worst = Math.max(...B.contracts.flatMap(c => dist(c).map(l => l.float)));
  assert.ok(Object.is(worst, CAP), 'the best contracts sit exactly on the cap, none above it');
});

test('batch: the loop is a sequential greedy, not an optimiser', () => {
  // Re-solving the 250 recorded inputs on their own rebuilds 49 contracts, not 50: without the rest of
  // the pool the picks fall in a different order and five inputs are stranded. Pinned as it is.
  const pool = adj(R.batch.contracts.flat());
  const r = E.solveAll(pool, R.batch.settings);
  assert.equal(r.contracts.length, 49);
  assert.equal(r.leftovers.length, 5);
  for (const c of r.contracts) for (const l of E.landingDistribution(c.map(x => x.adj), 0, 1)) assert.ok(l.float <= CAP);
});

test('fillers: solved live on the fixture pool, each group inside its own range, never above the cap', () => {
  const s = R.fillers.settings;
  const pool = POOL.map(x => ({ ...x, pool: x.name === R.fillers.collection }));
  const mean = (sel, p) => { const a = sel.filter(x => x.pool === p); return a.reduce((t, x) => t + x.adj, 0) / a.length; };
  const got = {};
  for (const run of R.fillers.runs) {
    const sel = got[run.strategy] = E.solve(pool, { ...s, strategy: run.strategy });
    assert.equal(sel.filter(x => x.pool).length, 3);
    assert.ok(sel.filter(x => x.pool).every(x => x.adj >= s.window.lo && x.adj <= s.window.hi));
    assert.ok(sel.filter(x => !x.pool).every(x => x.adj >= s.fillerWindow.lo && x.adj <= s.fillerWindow.hi));
    for (const l of E.landingDistribution(sel.map(x => x.adj), 0, 1)) assert.ok(l.float <= CAP);
    // the fixture pool gives the same contract the larger pool gave
    assert.deepEqual(sel.map(x => x.id).sort(), run.items.map(x => x.id).sort());
  }
  assert.ok(mean(got.offset, false) < mean(got.bal, false), 'offset pins the fillers lower');
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
  assert.equal(E.flScore(t).score, 216);
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
  const pick = E.huntPick([...a, ...low].map(x => ({ ...x, on: true })), 5, H.bar, {});
  assert.deepEqual(pick.map(x => x.id).sort(), a.map(x => x.id).sort());
  for (const l of E.landingDistribution(pick.map(x => x.adj), 0, 1)) assert.ok(l.float <= H.bar);
  assert.ok(Math.min(...a.map(x => x.adj)) > Math.max(...low.map(x => x.adj)), 'none of the five lowest is spent');
});

test('float lab: every recorded hit lands where it says, in the order given', () => {
  for (const h of R.floatlab.hits) {
    const got = E.landingFromAdjusted(adj(h.order).map(x => x.adj), h.lo, h.hi);
    assert.ok(Object.is(got, h.float));
    assert.equal(E.flDesire(h.float, { max: h.hi }).tier, h.tier);
  }
});

test('over mode: solved live, the lowest Minimal Wear, never under its floor in any order', () => {
  const s = R.over.settings;
  assert.equal(E.stepsBetween(E.WEAR_EDGES[0], s.cap), 13);
  const sel = E.solve(POOL, s);
  assert.equal(sel.length, 5);
  const L = E.landingDistribution(sel.map(x => x.adj), 0, 1);
  for (const l of L) { assert.ok(l.float >= s.cap); assert.equal(E.wearOf(l.float), 'Minimal Wear'); }
  assert.ok(Math.max(...L.map(l => l.float)) < 0.0700002);
});

test('SHOWCASE.md is exactly what the script prints, and its tables respect the cap', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const norm = s => s.replace(/\r\n/g, '\n').trim();
  const printed = norm(execFileSync(process.execPath, ['examples/showcase.js'], { cwd: root, encoding: 'utf8' }));
  assert.equal(norm(readFileSync(new URL('../examples/SHOWCASE.md', import.meta.url), 'utf8')), printed);
  const section1 = printed.slice(printed.indexOf('## 1.'), printed.indexOf('## 2.'));
  const rows = section1.split('\n').filter(l => /^\| \d+ \|/.test(l));
  assert.equal(rows.length, 50);
  for (const r of rows) assert.ok(+r.split('|')[4] <= CAP, r);
  assert.ok(!/0\.070000(?!\d)/.test(section1), 'a rounded 0.070000 never appears in a Factory New table');
});
