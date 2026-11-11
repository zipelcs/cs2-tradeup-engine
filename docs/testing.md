# Testing

## In the original tool

The tool is one HTML file, so it was tested by booting the whole file inside jsdom with scripts enabled and a stubbed `fetch` that serves synthetic tables. No network, database or keys. There are 145 suites of that kind. A syntax gate extracts the largest script block and checks it before any suite runs.

A separate auditor looks for dead controls. It boots the app in jsdom on stub data, visits every tab, calls every `onclick` handler it finds, and reports anything that throws or has no handler behind it. In a single-file tool edited by text patches, a button whose function was deleted or renamed is the failure a syntax check cannot see.

The tests that carry the float engine:

- A differential test. 20,000 random contracts are compared against an independently written chain. Zero mismatches are allowed and every landing must be a float32 value. This replaced a weaker gate after two wrong formulas turned out to return float32 values and passed an "is it a float32" check.
- Property tests. Random insertion orders must all land inside the exact landing set, every witness order must reproduce its landing, and the shares must sum to 1.
- Locked vectors. A reference vector from floatjitsu and two real crafts, one of which separates forward order from reversed.
- Ladder facts. Exactly one glitched float at 0.38 and one at 0.45, none at 0.07 or 0.15.

Weaknesses, as found: the suites used a home-made pass counter and no framework, hard-coded temporary paths, and unseeded random tests. The runner looked like a total regression on Windows until it was found that Node and the shell resolved the temporary folder to different places.

## In game

Predictions were checked against crafts made in the game. A five-covert knife craft was reproduced bit for bit. A ten-input craft landed on the forward prediction and not on the reversed one, which is what established that slot 1 is added first. Another ten-input craft, predicted from 68.5% of orders, landed one step higher. That miss set the 75% threshold. The 0.38 glitched float was read off an in-game exterior label, which reversed what the tool had claimed for two weeks.

## In this repository

`node --test`, no dependencies. Each module has its own test file. The solvers are pure functions here, so no DOM is needed.

- The differential test and both crafts are carried over (`test/robustness.test.js`, `test/orders.test.js`, `test/engine.test.js`).
- Random pools are seeded, so every run is identical.
- The Monte Carlo simulator takes a seed, which the original did not.
- `test/showcase.test.js` replays recorded runs on real floats and pins each result.
- `test/quotas.test.js` has one test per repair phase.

What is not tested here: anything that needs the original interface, and the chained planner on real items.
