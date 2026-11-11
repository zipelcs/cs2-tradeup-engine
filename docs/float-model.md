# Float model

Code: `src/f32.js`, `src/remap.js`, `src/tradeup.js`. Tests: `test/engine.test.js`, `test/wear.test.js`.

## The problem

Predict the float a trade-up produces, to the exact stored value. The game stores wear as a 32-bit float, so there is a finite ladder of values and a prediction is either on the right rung or it is wrong.

## What was tried first

From 13 June the tool computed `min + mean * (max - min)` in double precision. On 2 July predicted outputs were rounded to float32 once at the end. On 15 July the mean was formed by float32 additions in insertion order. Each step looked like the fix.

## What broke

On 15 July a solver target of 0.06999999997788109 was reported as Factory New. Stored as a float32 it is 0.07000000029802322, which is Minimal Wear. On 1 August the remaining double-precision sites were measured against the float32 chain over 200,000 random contracts. Plain double precision disagreed on 76.81% of them. Rounding once at the end was still wrong 43.82% of the time, by up to 3 steps. Rounding the mean first was wrong 21.10% of the time. Two of the wrong shapes already returned float32 values, so a check that the result is a float32 passed them.

## The design

Every operation is rounded to float32, in the order the game performs it:

1. Each input's raw float is remapped onto 0 to 1 against that skin's own caps.
2. The adjusted floats are added one at a time, in insertion order.
3. The sum is divided by the count.
4. The mean is remapped onto the output skin's caps.

`remap` is a model of the game's clamped remap, verified against in-game crafts. Credit to floatjitsu for the reference vector that locks it (`fixtures/crafts.js`) and for first showing that order matters.

The wear edges are float32 constants too. 0.07f and 0.15f sit above their decimals. 0.38f and 0.45f sit below theirs. So the largest Factory New float is 0.069999992847442627, and at 0.38 and 0.45 exactly one float reads as the better wear while the game stores the worse one. The tool had those two the wrong way round from 15 July until an in-game exterior label was checked on 1 August. The edges and the two glitched floats are now single constants (`WEAR_EDGES`, `GLITCH_FLOATS`), and `glitchFloats()` rederives them by walking the ladder.

Solver targets sit 13 steps under an edge (`safeCap`). Observed order jitter is about 2 steps.

Input floats need at least 8 decimal places. With 7 the predicted step changes.

## Method

The model was built first and then tested against crafts made in the game. One ten-input craft was chosen because forward and reversed order predict different steps. It landed on the forward prediction, which settled the order the game uses. A second craft, predicted from 68.5% of orders, landed one step higher. That miss produced the robustness verdict and its 75% threshold. The order features were labelled experimental in the tool until a live craft confirmed them.

## Evidence

The reference vector lands on 0.33839523792266846. Two real crafts are locked in `fixtures/crafts.js`. A differential test compares the engine with an independently written chain over 20,000 random contracts and allows zero mismatches.
