// Replays the recorded runs in fixtures/showcase.json through the engine and prints examples/SHOWCASE.md.
//
//   node examples/showcase.js > examples/SHOWCASE.md
//
// The fixture holds real floats: the items each run used, taken from an owned pool of 893 coverts.
// The full pool is not in this repository. Timings and pool-wide counts were recorded when the runs
// were made on the full pool; everything else below is recomputed here from the floats.

import { readFileSync } from 'node:fs';
import * as E from '../src/index.js';

const load = n => JSON.parse(readFileSync(new URL('../fixtures/' + n, import.meta.url), 'utf8'));
const R = load('showcase.json'), catalogue = load('catalogue.json');
const OUT = { min: 0, max: 1 }, EDGE = E.WEAR_EDGES[0];
const adj = items => E.withAdjusted(items, catalogue);
const f = (x, d = 17) => E.show(x, d);
const pct = x => (x * 100).toFixed(1) + '%';
const dist = (items, out = OUT) => E.landingDistribution(adj(items).map(x => x.adj), out.min, out.max);
const rows = items => items.map((x, i) => `| ${i + 1} | ${x.name} | ${f(x.float, 9)} | ${adj([x])[0].adj.toFixed(6)} |`).join('\n');
const table = items => `| click | input | float | adjusted |\n|---|---|---|---|\n${rows(items)}`;
const out = [];
const p = s => out.push(s);

// INVENTED sample price by adjusted float: a lower float costs more. Not a market price.
export const samplePriceByFloat = a => 30 * (1 + 2 * Math.pow(1 - Math.min(a, 0.07) / 0.07, 2));

p('# Showcase: recorded runs on a real pool');
p('');
p(`Target: ${R.target} (float range 0 to 1). Pool: ${R.pool.size} owned non-StatTrak coverts from the cases that drop it.`);
p('Only the inputs each run used are in `fixtures/showcase.json`. Every result below is pinned in `test/showcase.test.js`.');
p('Runtimes are from the run on the full pool. Prices, where they appear, are invented samples.');

// ---- 1. batch -----------------------------------------------------------------------------------
{
  const B = R.batch, cs = B.contracts.map(c => ({ c, L: dist(c) }));
  const worst = cs.map(x => Math.max(...x.L.map(l => l.float)));
  const all = cs.flatMap(x => adj(x.c));
  p('\n## 1. Max float, 50 contracts under the Factory New edge');
  p('');
  p(`Settings: 5 inputs, objective under, cap ${f(B.settings.cap)} (13 float32 steps under the edge ${f(EDGE)}), adjusted-float window minimum ${B.settings.window.lo}.`);
  p(`The window conserves every input under adjusted ${B.settings.window.lo}: ${B.conserved} of them, none used.`);
  p(`The pool supports ${B.supported} such contracts (${B.supportedWithoutConserve} with no window). Solving all of them took ${B.ms.toFixed(0)} ms. The first 50, best first:`);
  p('');
  p('| # | landing (most likely order) | share | worst landing over all orders | gap to the edge | mean input float |');
  p('|---|---|---|---|---|---|');
  cs.forEach((x, i) => p(`| ${i + 1} | ${f(x.L[0].float)} | ${pct(x.L[0].share)} | ${f(worst[i])} | ${(EDGE - worst[i]).toExponential(2)} | ${(x.c.reduce((a, y) => a + y.float, 0) / 5).toFixed(5)} |`));
  p('');
  p(`All 50 are Factory New in every insertion order: ${worst.every(w => E.wearOf(w) === 'Factory New')}. Highest landing ${f(Math.max(...worst))}, lowest ${f(Math.min(...worst))}.`);
  p(`Mean input float ${(all.reduce((a, x) => a + x.float, 0) / all.length).toFixed(5)}, lowest adjusted float used ${Math.min(...all.map(x => x.adj)).toFixed(5)}.`);
  const C = B.compare, mine = cs.reduce((a, x) => a + adj(x.c).reduce((s, y) => s + samplePriceByFloat(y.adj), 0), 0);
  p('');
  p(`Comparison, with an invented input price (lower float costs more): a casual batch that aims every contract at ${C.casualTarget} instead.`);
  p('');
  p('| | max float | casual at ' + C.casualTarget + ' |');
  p('|---|---|---|');
  p(`| mean landing | ${C.maxMeanLanding.toFixed(6)} | ${C.casualMeanLanding.toFixed(6)} |`);
  p(`| input value per contract (invented) | ${(mine / 50).toFixed(2)} | ${(C.valueCasual / 50).toFixed(2)} |`);
  p(`| input value over 50 contracts (invented) | ${mine.toFixed(0)} | ${C.valueCasual.toFixed(0)} |`);
  p(`| inputs under adjusted 0.02 still unused | ${C.lowLeftMax} | ${C.lowLeftCasual} |`);
  p(`| further Factory New contracts the leftovers fund | ${C.extraAfterMax} | ${C.extraAfterCasual} |`);
  p('');
  p(`Saving: ${(C.valueCasual - mine).toFixed(0)} (${((1 - mine / C.valueCasual) * 100).toFixed(1)}%) in invented units. Both methods leave room for the same number of further contracts on this pool; the difference is which inputs are left.`);
}

// ---- 2. fillers ---------------------------------------------------------------------------------
{
  const F = R.fillers, s = F.settings;
  p('\n## 2. Fillers with their own range, both fill strategies');
  p('');
  p(`Settings: exactly ${s.rules[0].k} inputs from ${F.collection} (adjusted ${s.window.lo} to ${s.window.hi}), the rest fillers (adjusted ${s.fillerWindow.lo} to ${s.fillerWindow.hi}), same cap as above.`);
  for (const run of F.runs) {
    const L = dist(run.items), a = adj(run.items);
    p('');
    p(`Strategy ${run.strategy} (${run.ms.toFixed(1)} ms): mean adjusted ${(a.reduce((x, y) => x + y.adj, 0) / 5).toFixed(6)}, landings ${L.map(l => f(l.float) + ' at ' + pct(l.share)).join(', ')}.`);
    p('');
    p('| group | input | float | adjusted |\n|---|---|---|---|');
    run.items.forEach((x, i) => p(`| ${x.pool ? 'collection' : 'filler'} | ${x.name} | ${f(x.float, 9)} | ${a[i].adj.toFixed(6)} |`));
  }
}

// ---- 3. exact floats ----------------------------------------------------------------------------
p('\n## 3. Exact float32 targets');
p('');
p('Each row is one Step-Solve run: five inputs chosen so that some insertion order stores exactly the target.');
for (const x of R.exact) {
  const L = dist(x.order), hit = L.find(l => Object.is(l.float, x.target));
  const rb = E.robustness(adj(x.order).map(y => y.adj), 0, 1, x.target);
  p('');
  p(`### ${f(x.target)} (${x.label})`);
  p('');
  p(`Tier ${x.tier}, score ${x.score}, ${x.difficulty} float32 step${x.difficulty > 1 ? 's' : ''} wide. ${x.candidates} candidate inputs, ${x.nodes} search nodes, ${x.subsets} subsets order-checked, ${x.ms.toFixed(1)} ms.`);
  p(`Share of the 120 insertion orders that land on it: ${pct(hit.share)}. Verdict: ${rb.verdict}.`);
  if (L.length > 1) p(`Other orders produce: ${L.filter(l => l !== hit).map(l => f(l.float) + ' (' + pct(l.share) + ')').join(', ')}.`);
  p('');
  p(table(x.order));
}

// ---- 4. hunter ----------------------------------------------------------------------------------
{
  const H = R.hunter, L = dist(H.items), a = adj(H.items), low = adj(H.lowest);
  p('\n## 4. #1 Hunter, maximin pick');
  p('');
  p(`Bar: ${H.bar}. The maximin set lands ${L.map(l => f(l.float) + ' at ' + pct(l.share)).join(', ')} (${H.ms.toFixed(1)} ms).`);
  p(`Its lowest input is adjusted ${Math.min(...a.map(x => x.adj)).toFixed(6)}; ${H.keptBelow} lower inputs stay unused. The five lowest inputs in the pool, which a lowest-first pick would burn, run from ${low[0].adj.toFixed(6)} to ${low[4].adj.toFixed(6)}.`);
  p('');
  p(table(H.items));
}

// ---- 5. float lab -------------------------------------------------------------------------------
{
  const F = R.floatlab;
  p('\n## 5. Float Lab search');
  p('');
  p(`Pool ${F.pool}, ${F.inputs} inputs, no target given. Found ${F.stats.found} patterned landings, order-verified the top ${F.stats.verified}, dropped ${F.stats.dropped} as unreachable, ${F.stats.capped} beyond the display cap. ${F.ms.toFixed(0)} ms.`);
  p('');
  p('| float | tier | pattern | score | share of orders | output range |\n|---|---|---|---|---|---|');
  for (const h of F.hits) p(`| ${f(h.float, 12)} | ${h.tier} | ${h.label} | ${h.score} | ${pct(h.share)} | ${h.lo} to ${h.hi} |`);
}

// ---- 6. over mode -------------------------------------------------------------------------------
if (R.over) {
  const L = dist(R.over.items);
  p('\n## 6. Over mode: the lowest Minimal Wear');
  p('');
  p(`The same core on negated values. Landings ${L.map(l => f(l.float) + ' ' + E.wearOf(l.float) + ' at ' + pct(l.share)).join(', ')}.`);
  p('');
  p(table(R.over.items));
}

// ---- what did not work --------------------------------------------------------------------------
p('\n## What these runs could not do');
p('');
for (const m of R.exactMisses) p(`- ${f(m.target)} (${m.label}): no order of any five of the ${m.candidates} candidate inputs lands on it${m.capped ? ' within the node budget' : ''}.`);
p(`- Glitch scan: ${R.glitch ? 'hit' : 'no contract in this pool reaches the 0.38 glitched float. The pool is almost entirely low floats and a 0.06 to 0.80 knife needs a mean adjusted float of 0.4324'}.`);
p('- Chained crafts, ten-input contracts and StatTrak were not run on real items: this extract holds non-StatTrak coverts only. They are tested on synthetic pools.');

if (process.argv[1] && process.argv[1].endsWith('showcase.js')) console.log(out.join('\n'));
