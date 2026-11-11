# cs2-tradeup-engine

OPENING: Oliver writes this.

## What it does

- Predicts the stored float of a trade-up with float32 arithmetic at every step, on a model of the game's clamped remap verified against in-game crafts.
- Counts every insertion order exactly: the share of orders behind each landing, with a click order for each.
- Builds contracts that land just under a wear edge from the worst inputs that still fit, with conserve ranges, filler ranges and group quotas.
- Lands on one exact float32 value and says how many orders reach it.
- Picks the contract that beats a record float while keeping the best copies back.
- Ranks the rare floats a pool can craft, and plans a two-stage craft when the fifth input has to be made first.
- Prices floats from a purchase history and scores contracts by expected value, behind a price function you supply.

## What it does not do

- It does not optimise. The solvers are greedy passes with repair and local search. Several contracts from one pool are a sequential loop with an exclusion set.
- It does not ship prices or fetch data. Every price here is an invented sample, and pools are plain JSON.
- It does not guarantee a craft. A landing reached by fewer than all orders can miss, and one real craft at 68.5% did.
- It does not carry the original commit history. The tool was built as a single HTML file from June to August 2026, and this repository was assembled from those builds in November 2026. Each commit carries the file time of the build its code first appeared in. The tests, notes and examples were written during the assembly.

## Run

Node 18 or later, no dependencies.

    npm test
    node examples/showcase.js

## Modules

| Module | What it holds |
|---|---|
| `f32`, `remap`, `tradeup` | float32 ladder, remap, landings, wear edges, safe caps |
| `orders`, `robustness` | landing distribution over all orders, fragility verdict |
| `solver` | Step-Solve, phantom check, feasibility report |
| `maxfloat` | Max Float core, over and exact modes, windows, quotas, repair passes |
| `custom` | Custom Float, closest sum, pool builder, sweep, exact float |
| `multi` | xN, Solve-all, Diversify |
| `hunter` | target check and the maximin pick |
| `floatlab-constants`, `floatlab` | constant targets, then the rare-float tiers and score |
| `chain`, `glitch` | two-stage planner, glitch-wear targets and scan |
| `listing`, `profit`, `montecarlo`, `premium`, `patterns` | tools behind a price function |
| `parsers` | purchase text parsers, multi-page import |
| `catalogue`, `names`, `phase` | catalogue helpers, name resolver, Doppler phase lookup |

## Design notes

One note per subsystem in [docs/](docs/): what was tried first, what broke and what replaced it. Start with [the float model](docs/float-model.md) and [insertion order](docs/insertion-order.md).

Recorded runs on real floats are in [examples/SHOWCASE.md](examples/SHOWCASE.md).

## Credit and licence

floatjitsu, for the reference vector and for first showing that insertion order changes the result.

The fade seed calculation in `patterns` is a port of chescos/csgo-fade-percentage-calculator (MIT). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The source is published to be read. See [LICENSE](LICENSE).
