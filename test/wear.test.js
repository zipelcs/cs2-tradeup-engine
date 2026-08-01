import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wearOf, glitchFloats, maxOfWear, WEAR_EDGES, GLITCH_FLOATS, safeCap, twins, valuesIn, nextUp, nextDown, ulp, stepsBetween, fr, outcomeOdds } from '../src/index.js';

test('0.07f and 0.15f sit above their decimals, 0.38f and 0.45f below', () => {
  assert.ok(WEAR_EDGES[0] > 0.07 && WEAR_EDGES[1] > 0.15);
  assert.ok(WEAR_EDGES[2] < 0.38 && WEAR_EDGES[3] < 0.45);
});

test('there are exactly two glitched floats, at 0.38 and 0.45', () => {
  const g = glitchFloats();
  assert.deepEqual(g.map(x => x.float), [0.3799999952316284, 0.44999998807907104]);
  assert.deepEqual(g.map(x => [x.reads, x.is]), [['Field-Tested', 'Well-Worn'], ['Well-Worn', 'Battle-Scarred']]);
});

test('the true maximum Factory New float', () => {
  assert.ok(Object.is(maxOfWear(0), 0.06999999284744263));
  assert.equal(wearOf(maxOfWear(0)), 'Factory New');
  assert.equal(wearOf(fr(0.06999999997788109)), 'Minimal Wear'); // a float64 "0.0699999..." that the game stores as MW
});

test('ladder walking is exact', () => {
  const x = fr(0.0888);
  assert.ok(nextUp(nextDown(x)) === x);
  assert.equal(stepsBetween(x, nextUp(nextUp(x))), 2);
  assert.ok(Math.abs(ulp(0.07) - 7.450580596923828e-9) < 1e-20);
});

test('only one float32 value has seven 8s after 0.00, and none has eight', () => {
  assert.deepEqual(valuesIn(0.008888888, 0.008888889), [0.008888888172805309]);
  assert.deepEqual(valuesIn(0.0088888888, 0.0088888889), []);
});

test('odds: each input carries 1/n, split across its own collection', () => {
  const next = { Riptide: ['Ocean Drive', 'Leet Museo'], Fracture: ['Printstream', 'Legion of Anubis'] };
  const all = outcomeOdds(Array(10).fill('Riptide'), next);
  assert.ok(Math.abs(all['Ocean Drive'] - 0.5) < 1e-12);
  const mixed = outcomeOdds([...Array(4).fill('Riptide'), ...Array(6).fill('Fracture')], next);
  assert.ok(Math.abs(mixed['Ocean Drive'] - 0.2) < 1e-12);
  assert.ok(Math.abs(mixed['Printstream'] - 0.3) < 1e-12);
});



test('the glitch constants agree with the ladder walk', () => {
  assert.deepEqual(GLITCH_FLOATS.map(g => [g.float, g.reads, g.is]), glitchFloats().map(g => [g.float, g.reads, g.is]));
});

test('safe solver caps sit 13 steps under the edge and refuse unreachable wears', () => {
  assert.equal(stepsBetween(safeCap(0), WEAR_EDGES[0]), 13);
  assert.equal(safeCap(0, 0.1, 0.2), null);           // a 0.10-0.20 skin can never be Factory New
  assert.equal(safeCap(0, 0, 0.05), fr(0.05));        // capped by the skin's own maximum
});

test('twins: the float32 neighbours of a target', () => {
  const t = twins(0.07);
  assert.ok(t.exact === null && t.below === maxOfWear(0) && t.above === WEAR_EDGES[0]);
  const e = twins(fr(0.38));
  assert.ok(e.exact === fr(0.38) && e.below < e.exact && e.above > e.exact);
});
