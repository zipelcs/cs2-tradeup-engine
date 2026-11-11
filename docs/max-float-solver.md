# Max float solver

Code: `src/maxfloat.js`, `src/multi.js`. Tests: `test/maxfloat.test.js`, `test/settle.test.js`, `test/quotas.test.js`, `test/multi.test.js`.

Any mean under the Factory New edge gives the same Factory New output. A contract that lands far under the edge has spent low floats for nothing. This solver lands as close under a ceiling as it can, using the worst inputs that still fit.

## Pipeline

`solve` runs these steps in order:

1. `candidates` drops every input outside its adjusted-float window.
2. `applyFillerCap` shapes the pool when a quota caps a group.
3. `underCore` picks the contract against a float64 budget.
4. `enforceQuotas` forces the group counts and repairs what that broke.
5. `settle` checks every insertion order in float32 and steps the contract down until none passes the cap.

It is a greedy with repair passes. Every loop has an iteration budget, and the solver can return nothing when a feasible contract exists.

## The core

`underCore` walks the pool from the highest adjusted float down. It takes an item only if the smallest unused items could still complete the contract under the budget beside it. Without that look-ahead a plain greedy takes high items early and cannot finish. Two local passes follow. A 1-swap raises any selected item as far as the budget allows. A 2-swap scans the sorted pool with two pointers for the unused pair that best fills the room left by a selected pair.

Over mode is the same function on negated values and a negated budget. Exact mode (`exactCore`) uses the same two swaps to minimise the distance to a target sum, and its 2-swap takes the first improving pair.

## The float32 check

The core budgets the adjusted sum in float64. The game forms the mean with float32 additions in insertion order. A sum that fits the float64 budget can therefore land above the cap in some orders. `test/settle.test.js` shows this on seeded pools, where the core alone breaches a zero-margin cap on some ten-input contracts.

`settle` closes that gap. It enumerates every insertion order of the selected contract with `landingDistribution`. If any order lands past the cap, it makes the smallest swap that lowers the sum: one selected input for the nearest lower unused input with the same group membership. It repeats until no order breaches, and returns nothing if the pool runs out of swaps. Over mode steps up the same way.

Pass `out` and `cap` to `solve` for the check to run on the real output range. Without them it checks the float32 mean against `T`, which is exact for a 0 to 1 output only.

The tests cover the largest Minimal Wear float and the largest Field-Tested float with no margin at all, on five and ten inputs, and the 50 contracts in `examples/SHOWCASE.md`.

## Windows and conserve ranges

Every candidate must sit inside an adjusted-float window, and inputs outside it are never offered. I use windows on every craft. They stop a record float being burned beside a 0.002, and they make the solver combine inputs of roughly the same rarity.

Fillers have a window of their own. An earlier build applied the collection window to every input, so a legal filler below the collection minimum made the whole solve fail. The check is now scoped per group (`test/quotas.test.js`).

## Quotas

A rule says exactly, at least or at most k inputs from the target's collection, or from a second group. A rule that counts fillers is rewritten as its dual on collection inputs: at most F fillers is at least n minus F collection inputs.

`applyFillerCap` gives the collection inputs their own target, `(T * n - need * fillerMean) / k`, because fillers pinned low force the collection inputs higher for the output to stay on target. `fillerMean` comes from the best fillers actually in the pool. I first used the midpoint of the filler window, and a very wide window made that target meaningless. The k closest members are kept together with the k safest, since the closest alone could overshoot the budget and fail the solve.

`enforceQuotas` runs five passes: trim excess members, add missing ones, repair the budget with same-membership swaps, climb back toward the cap, and tune an exact target. The first version could only add members, and it once returned an "exactly N" contract over the cap. The repair pass came from that, along with the rule that the solver returns no contract before it returns one that breaks the cap. I added the climb later, after the fallbacks left contracts well under the cap with headroom unused.

The original trimmed only for "exactly" rules, so it could reject an "at most" rule after the pool shaping offered 2k members. This version trims for "at most" as well.

## Fill strategies

Balanced keeps every input close to the target. Offset pins the fillers to their lowest available floats and lets only the collection inputs climb. I use offset when a collection has expensive inputs: with three collection inputs and two cheap fillers, it costs less to pull the float down with the fillers than to burn expensive collection items at low floats.

## Several contracts

`multiContract` and `solveAll` are a loop: solve one contract, exclude its items, solve again, stop at the first failure. The results are sorted best first afterwards. There is no joint allocation and no backtracking. `test/showcase.test.js` pins a case where the loop rebuilds 49 contracts from inputs that made 50 inside a larger pool.

`generations` in `src/catalogue.js` groups cases by an identical gold output pool. The groups decide where fillers may come from and define the second rule group.
