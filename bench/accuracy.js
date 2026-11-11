// How often do common calculator shapes disagree with the float32 chain, and how often does input
// order matter? Seeded, so every run prints the same numbers.
//
//   node bench/accuracy.js [contracts] [orderContracts]
//
// Every percentage quoted in docs/ comes from this script at its default sizes. The comparison is
// against this repository's own chain, not against the game: it measures how far the shortcut
// formulas drift from the model, and the model's standing against the game is the fixtures in
// fixtures/crafts.js.
import { fr, isFloat32, stepsBetween, landing, adjust, landingDistribution } from '../src/index.js';
import { naiveFloat64, naiveRoundOnce, naiveRoundMean } from '../src/naive.js';
import { CRAFT_A, CRAFT_B, CRAFT_K, toInputs } from '../fixtures/crafts.js';

let seed = 0x5eed1234;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
// Float ranges that occur in the game.
const RANGES = [[0, 1], [0, 0.8], [0, 0.7], [0, 0.65], [0, 0.6], [0, 0.57], [0, 0.5], [0.06, 0.8], [0, 0.4], [0.1, 1]];
const pick = a => a[Math.floor(rand() * a.length)];
const contract = () => {
  const inputs = Array.from({ length: 10 }, () => { const [min, max] = pick(RANGES); return { float: fr(min + rand() * (max - min)), min, max }; });
  const [min, max] = pick(RANGES);
  return { inputs, output: { min, max } };
};

const N = +process.argv[2] || 200000, M = +process.argv[3] || 5000;
const naive = { 'float64 lerp': naiveFloat64, 'float64, rounded once at the end': naiveRoundOnce, 'mean rounded, then lerp rounded': naiveRoundMean };
const wrong = Object.fromEntries(Object.keys(naive).map(k => [k, { differ: 0, notF32: 0, maxSteps: 0 }]));
for (let t = 0; t < N; t++) {
  const c = contract(), exact = landing(c.inputs, c.output);
  for (const [k, f] of Object.entries(naive)) {
    const v = f(c.inputs, c.output), w = wrong[k];
    if (!Object.is(v, exact)) { w.differ++; if (!isFloat32(v)) w.notF32++; w.maxSteps = Math.max(w.maxSteps, Math.abs(stepsBetween(exact, fr(v)))); }
  }
}
console.log(`\n${N.toLocaleString('en-US')} random 10-input contracts, compared with the float32 chain\n`);
console.log('method'.padEnd(36), 'differs'.padStart(8), 'not a float32'.padStart(15), 'worst miss (float32 steps)'.padStart(28));
for (const [k, w] of Object.entries(wrong)) console.log(k.padEnd(36), `${(100 * w.differ / N).toFixed(2)}%`.padStart(8), `${(100 * w.notF32 / N).toFixed(2)}%`.padStart(15), String(w.maxSteps).padStart(28));

// Insertion order: exact distribution over all 3,628,800 orders, per contract.
let sensitive = 0, fragile = 0;
const hist = {};
for (let t = 0; t < M; t++) {
  const c = contract(), d = landingDistribution(c.inputs.map(i => adjust(i.float, i.min, i.max)), c.output.min, c.output.max);
  hist[d.length] = (hist[d.length] || 0) + 1;
  if (d.length > 1) sensitive++;
  if (d[0].share < 0.75) fragile++;
}
console.log(`\n${M.toLocaleString('en-US')} random 10-input contracts, every insertion order enumerated exactly\n`);
console.log(`order changes the stored float:          ${(100 * sensitive / M).toFixed(1)}% of contracts`);
console.log(`most common landing under 75% of orders: ${(100 * fragile / M).toFixed(1)}%`);
console.log(`distinct landings per contract:          ${Object.entries(hist).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}: ${(100 * v / M).toFixed(1)}%`).join(', ')}`);

// The recorded crafts: exact order shares.
console.log('\nrecorded crafts, share of insertion orders behind each landing\n');
for (const [name, c] of [['craft A', CRAFT_A], ['craft B', CRAFT_B], ['craft K', CRAFT_K]]) {
  const d = landingDistribution(toInputs(c).map(i => adjust(i.float, i.min, i.max)), c.output.min, c.output.max);
  console.log(`${name}: ${d.map(l => `${l.float.toPrecision(17)} ${(100 * l.share).toFixed(3)}%`).join(', ')}`);
}
