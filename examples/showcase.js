// Runs the engine on the real floats in fixtures/showcase.json and prints examples/SHOWCASE.md.
//
//   node examples/showcase.js > examples/SHOWCASE.md
//
// The fixture holds real floats taken from a larger owned pool of coverts. The larger pool is not in
// this repository, so nothing here depends on it: every number printed below is computed by this
// script from the floats in the fixture, and test/showcase.test.js pins the same results.

import { readFileSync } from 'node:fs';
import * as E from '../src/index.js';

const load = n => JSON.parse(readFileSync(new URL('../fixtures/' + n, import.meta.url), 'utf8'));
const R = load('showcase.json'), catalogue = load('catalogue.json');
const OUT = { min: 0, max: 1 }, EDGE = E.WEAR_EDGES[0];
const adj = items => E.withAdjusted(items, catalogue);
const f = (x, d = 17) => E.show(x, d);
const pct = x => (x * 100).toFixed(1) + '%';
const dist = (items, out = OUT) => E.landingDistribution(adj(items).map(x => x.adj), out.min, out.max);
const cell = s => String(s).replace(/\|/g, '\\|');
const rows = items => items.map((x, i) => `| ${i + 1} | ${cell(x.name)} | ${f(x.float, 9)} | ${adj([x])[0].adj.toFixed(6)} |`).join('\n');
const table = items => `| click | input | float | adjusted |\n|---|---|---|---|\n${rows(items)}`;
const out = [];
const p = s => out.push(s);

/** Every distinct item in the fixture: the pool the live solves below run on. */
export function fixturePool(fixture = R) {
  const seen = new Map();
  const add = a => a.forEach(x => { if (!seen.has(x.id)) seen.set(x.id, { id: x.id, name: x.name, float: x.float }); });
  fixture.batch.contracts.forEach(add);
  fixture.fillers.runs.forEach(r => add(r.items));
  fixture.exact.forEach(x => add(x.order));
  add(fixture.hunter.items); add(fixture.hunter.lowest);
  fixture.floatlab.hits.forEach(h => add(h.order));
  add(fixture.over.items);
  return [...seen.values()];
}
const POOL = adj(fixturePool());

p('# Showcase: the engine on real floats');
p('');
p(`Target: ${R.target} (float range 0 to 1). The fixture holds ${POOL.length} real floats from an owned pool of coverts.`);
p('The full pool is not in this repository. Every number below is computed by `examples/showcase.js` from `fixtures/showcase.json`, and `test/showcase.test.js` pins the same results. There are no prices and no timings here.');

// ---- 1. batch -----------------------------------------------------------------------------------
{
  const B = R.batch, cs = B.contracts.map(c => ({ c, L: dist(c) }));
  const worst = cs.map(x => Math.max(...x.L.map(l => l.float)));
  const all = cs.flatMap(x => adj(x.c));
  p('\n## 1. Max float, 50 contracts under the Factory New edge');
  p('');
  p(`Settings: 5 inputs, objective under, cap ${f(B.settings.cap)} (13 float32 steps under the edge ${f(EDGE)}), adjusted-float window minimum ${B.settings.window.lo}.`);
  p('These 50 contracts were recorded from a Solve-all run on the larger pool. Each one is replayed here over all 120 insertion orders.');
  p('');
  p('| # | landing (most likely order) | share | worst landing over all orders | steps under the cap | mean input float |');
  p('|---|---|---|---|---|---|');
  cs.forEach((x, i) => p(`| ${i + 1} | ${f(x.L[0].float)} | ${pct(x.L[0].share)} | ${f(worst[i])} | ${E.stepsBetween(worst[i], B.settings.cap)} | ${(x.c.reduce((a, y) => a + y.float, 0) / 5).toFixed(5)} |`));
  p('');
  p(`No insertion order of any of the 50 lands above the cap: ${worst.every(w => w <= B.settings.cap)}. Highest landing ${f(Math.max(...worst))}, lowest ${f(Math.min(...worst))}.`);
  p(`Mean input float ${(all.reduce((a, x) => a + x.float, 0) / all.length).toFixed(5)}, lowest adjusted float used ${Math.min(...all.map(x => x.adj)).toFixed(5)}.`);
  const again = E.solveAll(all, B.settings);
  p('');
  p(`Solved again from those 250 inputs alone, the loop builds ${again.contracts.length} contracts and leaves ${again.leftovers.length} inputs over. It is a sequential greedy, and without the rest of the pool its picks fall in a different order.`);
}

// ---- 2. fillers ---------------------------------------------------------------------------------
{
  const F = R.fillers, s = F.settings;
  const pool = POOL.map(x => ({ ...x, pool: x.name === F.collection }));
  p('\n## 2. Fillers with their own range, both fill strategies');
  p('');
  p(`Settings: exactly ${s.rules[0].k} inputs from ${F.collection} (adjusted ${s.window.lo} to ${s.window.hi}), the rest fillers (adjusted ${s.fillerWindow.lo} to ${s.fillerWindow.hi}), same cap as above. Solved here on the ${POOL.length} fixture floats.`);
  for (const strategy of ['bal', 'offset']) {
    const sel = E.solve(pool, { ...s, strategy });
    const L = E.landingDistribution(sel.map(x => x.adj), 0, 1);
    p('');
    p(`Strategy ${strategy}: mean adjusted ${E.stats(sel).mean.toFixed(6)}, landings ${L.map(l => f(l.float) + ' at ' + pct(l.share)).join(', ')}.`);
    p('');
    p('| group | input | float | adjusted |\n|---|---|---|---|');
    sel.forEach(x => p(`| ${x.pool ? 'collection' : 'filler'} | ${cell(x.name)} | ${f(x.float, 9)} | ${x.adj.toFixed(6)} |`));
  }
}

// ---- 3. exact floats ----------------------------------------------------------------------------
p('\n## 3. Exact float32 targets');
p('');
p('Each set of five was found by Step-Solve on the larger pool and is replayed here: the click order shown stores exactly the target.');
for (const x of R.exact) {
  const L = dist(x.order), hit = L.find(l => Object.is(l.float, x.target));
  const rb = E.robustness(adj(x.order).map(y => y.adj), 0, 1, x.target);
  const sc = E.flScore(x.target), d = E.flDifficulty(x.target);
  p('');
  p(`### ${f(x.target)} (${x.label})`);
  p('');
  p(`${sc ? `Tier ${sc.tier}, score ${sc.score}. ` : ''}${d} float32 value${d > 1 ? 's show' : ' shows'} these nine decimals.`);
  p(`Share of the 120 insertion orders that land on it: ${pct(hit.share)}. Verdict: ${rb.verdict}.`);
  if (L.length > 1) p(`Other orders produce: ${L.filter(l => l !== hit).map(l => f(l.float) + ' (' + pct(l.share) + ')').join(', ')}.`);
  p('');
  p(table(x.order));
}

// ---- 4. hunter ----------------------------------------------------------------------------------
{
  const H = R.hunter, a = adj(H.items), low = adj(H.lowest);
  const pick = E.huntPick([...a, ...low].map(x => ({ ...x, on: true })), 5, H.bar, {});
  const L = E.landingDistribution(pick.map(x => x.adj), 0, 1);
  p('\n## 4. #1 Hunter, maximin pick');
  p('');
  p(`Bar: ${H.bar}. Ten inputs are offered: five very low floats that a lowest-first pick would burn, and five more. The maximin pick lands ${L.map(l => f(l.float) + ' at ' + pct(l.share)).join(', ')}.`);
  p(`Its lowest input is adjusted ${Math.min(...pick.map(x => x.adj)).toFixed(6)}. The five inputs it keeps back run from ${low[0].adj.toFixed(6)} to ${low[4].adj.toFixed(6)}.`);
  p('');
  p(table(pick));
}

// ---- 5. float lab -------------------------------------------------------------------------------
{
  p('\n## 5. Float Lab hits');
  p('');
  p('Five hits recorded from a Float Lab search on the larger pool, replayed here in the recorded order.');
  p('');
  p('| float | tier | pattern | share of orders | output range |\n|---|---|---|---|---|');
  for (const h of R.floatlab.hits) {
    const hit = dist(h.order, { min: h.lo, max: h.hi }).find(l => Object.is(l.float, h.float));
    p(`| ${f(h.float, 12)} | ${E.flDesire(h.float, { max: h.hi }).tier} | ${h.label} | ${pct(hit.share)} | ${h.lo} to ${h.hi} |`);
  }
}

// ---- 6. over mode -------------------------------------------------------------------------------
{
  const s = R.over.settings, sel = E.solve(POOL, s);
  const L = E.landingDistribution(sel.map(x => x.adj), 0, 1);
  p('\n## 6. Over mode: the lowest Minimal Wear');
  p('');
  p(`The same core on negated values, with a floor of ${f(s.cap)} (13 float32 steps above the edge). Solved here on the ${POOL.length} fixture floats. Landings ${L.map(l => f(l.float) + ' ' + E.wearOf(l.float) + ' at ' + pct(l.share)).join(', ')}.`);
  p('');
  p(table(sel));
}

p('\n## Not covered');
p('');
p('Chained crafts, the glitch scan, ten-input contracts and StatTrak are not shown on real items. The fixture holds non-StatTrak coverts only. Those paths are tested on synthetic pools.');

if (process.argv[1] && process.argv[1].endsWith('showcase.js')) console.log(out.join('\n'));
