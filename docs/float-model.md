# Float model

Code: `src/f32.js`, `src/remap.js`, `src/tradeup.js`. Tests: `test/engine.test.js`, `test/wear.test.js`, `test/differential.test.js`.

The game stores wear as a 32-bit float. There is a finite ladder of values, and a prediction is either on the right rung or wrong. This note describes the chain I use to predict the rung, what I measured about the shortcuts, and what the chain has been checked against.

## The chain

Every operation is rounded to float32, in this order:

1. Each input's raw float is remapped onto 0 to 1 against that skin's own caps.
2. The adjusted floats are added one at a time, in insertion order.
3. The sum is divided by the count.
4. The mean is remapped onto the output skin's caps.

`remap` is my model of the game's clamped remap. floatjitsu published the reference vector that locks it (`fixtures/crafts.js`) and first showed that order matters.

## Wear edges

The edges are float32 constants too. 0.07f and 0.15f sit above their decimals, and 0.38f and 0.45f sit below theirs. Two things follow. The largest Factory New float is 0.069999992847442627. At 0.38 and at 0.45 exactly one float reads as the better wear in decimal digits while the float32 comparison puts it in the worse one. `test/wear.test.js` finds those two by walking the ladder and finds none at 0.07 or 0.15.

For two weeks in July I had those two floats the wrong way round. On 1 August I read the exterior label of a 0.38 item in the game and it said Well-Worn. That observation is in my notes only. There is no fixture for it here, so the classification in this repository rests on the float32 comparison and the ladder walk.

One early bug shows why the edge has to be a float32. A solver target of 0.06999999997788109 was reported as Factory New. That number is not a float32 value. Stored, it becomes 0.07000000029802322, which is the edge itself and Minimal Wear (`test/edge.test.js`).

`safeCap` gives the solvers a target 13 steps under an edge. The margin is a starting point. The Max Float solver still checks every insertion order against the cap in float32 (see [max-float-solver.md](max-float-solver.md)).

## How the model got here

I started on 13 June with `min + mean * (max - min)` in double precision. On 2 July I rounded the predicted output to float32 once at the end. On 15 July I formed the mean with float32 additions in insertion order. On 1 August I replaced the remaining double-precision sites with the full chain.

`bench/accuracy.js` measures the shortcut formulas against the chain on 200,000 seeded random ten-input contracts:

| Formula | Differs from the chain | Worst miss |
|---|---|---|
| float64 lerp | 100.00%, and never a float32 value | 4 steps |
| float64 inside, rounded once at the end | 51.43% | 4 steps |
| mean rounded to float32, then a rounded lerp | 51.44% | 4 steps |

The last two return float32 values, so a check that the result is a float32 passes them. Only a comparison of the whole chain catches them.

The bench compares formulas with my chain. It says nothing about the game.

## What the chain has been checked against

Four fixtures in `fixtures/crafts.js`:

- The published reference vector lands on 0.33839523792266846.
- Craft K, five coverts into a knife. The game stored 0.20020020008087158, which is the forward prediction.
- Craft B, ten inputs. Forward order and reversed order predict different steps. The game stored the forward one. That craft is why I treat slot 1 as the first item added.
- Craft A, ten inputs. The game stored 0.069696977734565735, one step above the forward prediction. The model missed it.

So the model has two exact hits and one miss on recorded crafts. The crafts are recorded results. Nothing in this repository can check them against the game again.

`test/differential.test.js` compares the engine with a second implementation over 20,000 seeded random contracts and allows no mismatch. The second implementation imports nothing from `src/` and never calls `Math.fround`. It stores every intermediate value into a `Float32Array` cell and lets the typed array do the rounding.

## Input precision

Rounding the inputs of the three recorded crafts to 7 decimals moves each prediction by one step. At 8 decimals the two ten-input crafts are right and the five-input craft is still one step off. At 9 decimals all three are right. I use 9 or more.
