# Testing

`node --test`, no dependencies. Each module has its own test file, and the solvers are pure functions, so no DOM is needed. Random pools and random orders are seeded, so every run is identical.

The original tool was one HTML file and was tested by booting that file in jsdom. Those suites are not in this repository. Everything below describes what is here.

## What the fixtures show about the game

`fixtures/crafts.js` holds one published vector and three crafts made in the game. This is all the in-game evidence in the repository.

| Fixture | Inputs | What it shows |
|---|---|---|
| Reference vector (floatjitsu) | 10 | the chain lands on the published float |
| Craft K | 5 coverts into a knife | the game stored the forward prediction, which 58 of 120 orders reach |
| Craft B | 10 | forward and reversed orders predict different steps, and the game stored the forward one |
| Craft A | 10 | the game stored one step above the forward prediction: a miss |

The crafts are recorded results. The tests check the engine against the records. Nothing here can check the records against the game.

## Tests of the float engine

- Differential (`test/differential.test.js`). 20,000 seeded random contracts are compared with a second implementation that shares no code with the engine and rounds through a `Float32Array`. No mismatch is allowed, and every landing must be a float32 value.
- Properties (`test/orders.test.js`). For each recorded craft the shares sum to 1, the order counts sum to n factorial, every rebuilt click order reproduces its landing, and 300 seeded random orders all land inside the exact set. For five inputs the result equals brute force over all 120 orders.
- Ladder facts (`test/wear.test.js`). Exactly one glitched float at 0.38 and one at 0.45, none at 0.07 or 0.15.
- Cap safety (`test/settle.test.js`). On seeded pools the float64 core alone lands above a zero-margin cap in some orders. The solver's result never does, for five and ten inputs, under and over.
- Edge cases (`test/edge.test.js`). An empty contract and a NaN float throw. The planner and the glitch scan give the same answer on every call.

## Tests on real floats

`test/showcase.test.js` runs on the 302 real floats in `fixtures/showcase.json`. It replays the recorded contracts, solves the filler and over-mode examples from scratch on those floats, and fails if `examples/SHOWCASE.md` differs from what `examples/showcase.js` prints.

## Other tests

- `test/quotas.test.js` has one test per repair pass.
- `test/readme.test.js` runs the usage example from the README.
- The Monte Carlo simulator takes a seed, so its paths are pinned.

## What is not tested

- Anything that needs the original interface.
- The chained planner and the glitch scan on real items. Both are tested on synthetic pools only.
- Every price. All prices are invented samples.
- The order in which the in-game grid displays items, and what happens when an item is removed and added again. I have notes on both and no fixture for either.
