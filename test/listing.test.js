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


