import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../src/index.js';

// Invented listings. Costs are sample numbers, not market prices.
function listings() {
  let s = 5;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
  const out = [];
  for (let i = 0; i < 40; i++) {
    const adj = 0.02 + rnd() * 0.5;
    out.push({ name: 'Sample Covert ' + 'ABC'[i % 3], float: +adj.toFixed(6), adj, cost: +(95 - 160 * adj + rnd() * 12).toFixed(2), on: i % 3 === 0 });
  }
  return out;
}

test('meets the threshold with at least one on-target input', () => {
  const sel = E.lsPick(listings(), 10, 0.2, 'under');
  assert.equal(sel.length, 10);
  assert.ok(sel.reduce((a, c) => a + c.adj, 0) <= 0.2 * 10 + 1e-12);
  assert.ok(sel.some(c => c.on));
});

test('an unpriced input never wins on price', () => {
  const c = listings();
  c.push({ name: 'Sample Covert A', float: 0.01, adj: 0.01, cost: 0, on: true });
  const sel = E.lsPick(c, 10, 0.2, 'under');
  assert.ok(!sel.some(x => !(x.cost > 0)));
  assert.equal(E.totalCost([{ cost: 0 }]), Infinity);
});

test('pinned inputs stay and the owned count respects its bounds', () => {
  const c = listings().map((x, i) => ({ ...x, own: i < 6 }));
  const pin = c[20], keep = new Set([pin.name + '|' + pin.float]);
  const sel = E.lsPick(c, 10, 0.25, 'under', 'cheap', keep, { min: 2, max: 3 });
  assert.ok(sel.includes(pin));
  const own = sel.filter(x => x.own).length;
  assert.ok(own >= 2 && own <= 3);
});

test('odds mode prefers on-target inputs', () => {
  const cheap = E.lsPick(listings(), 10, 0.3, 'under', 'cheap');
  const odds = E.lsPick(listings(), 10, 0.3, 'under', 'odds');
  assert.ok(odds.filter(c => c.on).length >= cheap.filter(c => c.on).length);
});

test('a failed solve names the single swap that would fix it', () => {
  const c = listings().filter(x => x.adj > 0.1);
  assert.equal(E.lsPick(c, 10, 0.1, 'under'), null);
  const fix = E.lsSuggestFix(c, 10, 0.1, 'under');
  assert.ok(fix && fix.needAdj < fix.replace.adj && fix.cmp === '<=');
  assert.equal(E.lsSuggestFix(listings(), 10, 0.4, 'under'), null); // reachable: nothing to suggest
});

test('three seeds: the feasible-only seed recovers the cheap set the cost seed is stranded away from', () => {
  // Cheap items sit just over the threshold, a few dear low floats pull a cost-first seed feasible.
  // One-at-a-time swaps then cannot leave them without breaching the ceiling.
  const c = [];
  for (let i = 0; i < 10; i++) c.push({ name: 'Sample Covert A', float: 0.21 + i * 1e-4, adj: 0.21 + i * 1e-4, cost: 10, on: true });
  for (let i = 0; i < 10; i++) c.push({ name: 'Sample Covert B', float: 0.19 + i * 1e-4, adj: 0.19 + i * 1e-4, cost: 14, on: true });
  for (let i = 0; i < 4; i++) c.push({ name: 'Sample Covert C', float: 0.02 + i * 1e-4, adj: 0.02 + i * 1e-4, cost: 60, on: true });
  const sel = E.lsPick(c, 10, 0.2, 'under');
  assert.ok(sel.reduce((a, x) => a + x.adj, 0) <= 2 + 1e-12);
  assert.ok(E.totalCost(sel) <= 140, 'no dearer than ten of the 14 skin');
  assert.ok(!sel.some(x => x.cost === 60), 'none of the dear low floats');
});
