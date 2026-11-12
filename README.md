# cs2-tradeup-engine

Trade-up solvers for Counter-Strike 2 on an exact float32 engine.

Built between June and August 2026 and moved into this repository in November, so the early commits are dated by the build they come from.

## What it does

- Predicts the stored float of a trade-up with float32 arithmetic at every step. The model reproduces a published reference vector and two recorded in-game crafts exactly. It missed a third recorded craft by one float32 step.
- Counts every insertion order exactly: the share of orders behind each landing, with a click order for each.
- Builds contracts that land just under a wear edge from the worst inputs that still fit, with conserve ranges, filler ranges and group quotas. Every result is checked in float32 over all insertion orders before it is returned.
- Lands on one exact float32 value and says how many orders reach it.
- Picks the contract that beats a record float while keeping the best copies back.
- Ranks the rare floats a pool can craft, and plans a two-stage craft when the fifth input has to be made first.

## Usage

```js
import { landing, landingDistribution, adjust, wearOf, show } from './src/index.js';

const inputs = [0.031, 0.044, 0.052, 0.038, 0.047].map(float => ({ float, min: 0, max: 0.4 }));
const knife = { min: 0, max: 1 };

const float = landing(inputs, knife); // the stored float32 for this click order
console.log(show(float), wearOf(float));

const adjs = inputs.map(i => adjust(i.float, i.min, i.max));
for (const l of landingDistribution(adjs, knife.min, knife.max)) {
  const clicks = l.order.map(i => i + 1).join(' ');
  console.log(show(l.float), l.orders + ' of 120 orders', 'click', clicks);
}
```

## What it does not do

- The solvers are greedy passes with repair and local search, not a proven optimum.
- It does not ship prices or fetch data. Any cost in the tests is invented, and pools are plain JSON.
- It does not guarantee a craft. A landing reached by fewer than all orders can miss. The one recorded craft that missed was predicted from 68.501% of orders.

## Run

Node 18 or later, no dependencies.

    npm test
    node examples/showcase.js
    node bench/accuracy.js

## Modules

| Module | What it holds |
|---|---|
| `f32`, `remap`, `tradeup` | float32 ladder, remap, landings, wear edges, safe caps |
| `orders`, `robustness` | landing distribution over all orders, fragility verdict |
| `solver` | Step-Solve, phantom check, feasibility report |
| `maxfloat` | Max Float core, over and exact modes, windows, quotas, repair passes, the float32 check |
| `custom` | Custom Float, closest sum, pool builder, sweep, exact float |
| `multi` | xN, Solve-all, Diversify |
| `hunter` | target check and the maximin pick |
| `floatlab-constants`, `floatlab` | constant targets, then the rare-float tiers and score |
| `chain`, `glitch` | two-stage planner, glitch-wear targets and scan |
| `listing` | cheapest inputs against a threshold, behind a cost you supply |
| `catalogue`, `phase` | catalogue helpers, Doppler phase lookup |

## Notes and examples

There is one note per subsystem in [docs/](docs/). Start with the [float model](docs/float-model.md), then [insertion order](docs/insertion-order.md) and [testing](docs/testing.md).

[examples/SHOWCASE.md](examples/SHOWCASE.md) runs the engine on real floats. `bench/accuracy.js` prints every percentage the notes quote.

## Credit and licence

floatjitsu, for the reference vector and for first showing that insertion order changes the result.

The source is published to be read. See [LICENSE](LICENSE).
