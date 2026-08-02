import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { synthetic } from './helpers.js';

const fr = Math.fround;

test('run length is the ranking; 6s and 8s get one tier more', () => {
  assert.equal(E.flTierForRun(4, '3'), 'C');
  assert.equal(E.flTierForRun(4, '8'), 'B');
  assert.equal(E.flTierForRun(6, '3'), 'A');
  assert.equal(E.flTierForRun(6, '6'), 'S');
  assert.equal(E.flTierForRun(2, '8'), null);
  assert.equal(E.flDesire(fr(0.0088888881728)).tier, 'S');
  assert.equal(E.flDesire(0.2953817), null);
});

test('only a repeated meme counts, never a blend', () => {
  assert.equal(E.flMemeRepeat('133742069').exact, true);
  assert.deepEqual(E.flMemeRepeat('42042019'), { m: '420', reps: 2, exact: false });
  assert.equal(E.flMemeRepeat('420691337'), null);
  assert.equal(E.flDesire(0.000133742069).tier, 'S');
});

test('the two glitched floats and the capped 0.07', () => {
  assert.equal(E.flDesire(fr(0.38)).glitch, true);
  assert.equal(E.flDesire(fr(0.45)).glitch, true);
  assert.ok(!E.flDesire(0.37999996).glitch); // one step off is an ordinary float, no tolerance
  assert.equal(E.flDesire(fr(0.07), { max: 0.08 }).tier, 'A');
  assert.equal(E.flDesire(fr(0.07), { max: 1 }).tier, 'D');
});


test('the catalogue holds the seven categories and nothing from the constants era', () => {
  const cat = E.flCatalogue(0, 1);
  assert.ok(cat.some(c => c.label === '133742069'));
  assert.ok(cat.some(c => c.label === 'glitched 0.38'));
  assert.ok(!cat.some(c => Math.abs(c.value - 0.142857142857) < 1e-6));
  assert.ok(!cat.some(c => Math.abs(c.value - 0.31415926) < 1e-6));
});

test('a pool search returns verified hits with a click order, and counts what it dropped', () => {
  const P = { need: 5, label: 'synthetic pool', inputs: synthetic(80, 91, 0.0, 0.3), outs: [{ name: 'out', min: 0, max: 0.08 }] };
  const r = E.flSearch(P, { trials: 30000 });
  assert.ok(r.hits.length > 0);
  assert.equal(r.stats.found, r.stats.verified + r.stats.dropped + r.stats.capped);
  for (const h of r.hits.slice(0, 20)) {
    assert.ok(Object.is(E.landingFromAdjusted(h.items.map(x => x.adj), h.lo, h.hi), h.float), 'the order shown lands the float shown');
    assert.ok(h.share > 0 && h.share <= 1);
    assert.ok(E.flDesire(h.float, { max: h.hi }));
  }
  assert.deepEqual(E.flSearch(P, { trials: 30000 }).hits.map(h => h.float), r.hits.map(h => h.float));
});
