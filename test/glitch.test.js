import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { catalogue, synthetic } from './helpers.js';

const knives = catalogue.filter(s => s.category === 'Knives');

test('targets are gated per float range, with the mean each range needs', () => {
  const t38 = E.glitchTargets(knives, 0), t45 = E.glitchTargets(knives, 1);
  const fam = (t, k) => t.families.find(f => f.min + '-' + f.max === k);
  assert.ok(Math.abs(fam(t38, '0.06-0.8').needMean - 0.4324) < 1e-4);
  assert.ok(Math.abs(fam(t45, '0.06-0.8').needMean - 0.5270) < 1e-4);
  assert.equal(fam(t38, '0-0.08'), undefined);      // a 0.00-0.08 finish can hold neither
  assert.equal(fam(t38, '0.4-1'), undefined);       // a 0.40-1.00 finish only the 0.45 one
  assert.ok(fam(t45, '0.4-1'));
});

test('the scan lands exactly on the glitched float or reports nothing', () => {
  // a synthetic pool around the mean a 0.06-0.80 output needs
  const P = { need: 5, label: 'synthetic', inputs: synthetic(70, 55, 0.33, 0.53), outs: [{ name: 'out', min: 0.06, max: 0.8 }] };
  const hits = E.glitchScan([P]);
  assert.equal(hits.length, 1);
  const h = hits[0];
  assert.ok(Object.is(h.float, Math.fround(0.38)));
  assert.ok(Object.is(E.landingFromAdjusted(h.items.map(x => x.adj), 0.06, 0.8), Math.fround(0.38)));
  const low = { need: 5, label: 'too low', inputs: synthetic(70, 56, 0, 0.1), outs: [{ name: 'out', min: 0.06, max: 0.8 }] };
  assert.deepEqual(E.glitchScan([low]), []);
});

test('the game stores the glitched float one band worse than it reads', () => {
  const f = Math.fround(0.38);
  assert.equal(E.wearOf(f), 'Well-Worn');
  assert.equal(E.decimalWearOf(f), 'Field-Tested');
  assert.equal(E.wearOf(E.nextDown(f)), 'Field-Tested'); // one step below is an ordinary float
});
