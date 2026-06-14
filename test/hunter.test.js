import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';
import { chroma3, catalogue, skin } from './helpers.js';

const KNIFE = skin('★ Karambit | Doppler (Phase 1)');
const BAR = 0.069999992847442627; // the largest Factory New float

test('canBeTarget: a knife needs a case with coverts, a skin needs a tier below it', () => {
  assert.equal(E.canBeTarget(catalogue, KNIFE), true);
  assert.equal(E.canBeTarget(catalogue, { name: 'x', category: 'Knives', min: 0, max: 1, crates: ['No Such Case'] }), false);
  assert.equal(E.canBeTarget(catalogue, { name: 'y', rarity: 'Covert', min: 0, max: 1, collections: ['The Chroma 3 Collection'] }), false); // no Classified in this catalogue
  assert.equal(E.canBeTarget(catalogue, { ...KNIFE, max: 0 }), false);
});

test('candidates are one tier below the target and flagged when they can produce it', () => {
  const { cands, n } = E.huntCandidates(KNIFE, chroma3(), catalogue);
  assert.equal(n, 5);
  assert.equal(cands.length, 17);
  assert.ok(cands.every(c => c.on));
});

test('the maximin keeps the five best copies back', () => {
  const r = E.huntSolve(KNIFE, BAR, chroma3(), catalogue);
  assert.ok(r.ok);
  assert.deepEqual(r.sel.map(x => x.id).sort(), ['c13', 'c14', 'c15', 'c16', 'c17']);
  const kept = chroma3().filter(x => !r.sel.some(s => s.id === x.id)).sort((a, b) => a.adj - b.adj).slice(0, 5).map(x => x.id);
  assert.deepEqual(kept, ['c1', 'c2', 'c3', 'c4', 'c5']);
  assert.ok(r.sel.reduce((a, c) => a + c.adj, 0) <= r.T * 5 + 1e-12);
});

test('maximin never passes the bar and raises the floor as far as it can', () => {
  const r = E.huntSolve(KNIFE, 0.02, chroma3(), catalogue);
  assert.ok(r.ok);
  const sum = r.sel.reduce((a, c) => a + c.adj, 0);
  assert.ok(sum <= r.T * 5 + 1e-12);
  const lowest5 = chroma3().sort((a, b) => a.adj - b.adj).slice(0, 5);
  assert.ok(Math.min(...r.sel.map(x => x.adj)) >= Math.min(...lowest5.map(x => x.adj)));
  assert.ok(sum > lowest5.reduce((a, c) => a + c.adj, 0), 'spends less float quality than the five lowest');
});

test('an impossible record says why', () => {
  assert.equal(E.huntSolve(KNIFE, 0.0001, chroma3(), catalogue).ok, false);
  assert.equal(E.huntSolve({ ...KNIFE, min: 0.06 }, 0.05, chroma3(), catalogue).ok, false);
});


