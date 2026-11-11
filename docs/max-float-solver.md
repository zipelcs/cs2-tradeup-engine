# Max float solver

Code: `src/maxfloat.js`, `src/multi.js`. Tests: `test/maxfloat.test.js`, `test/quotas.test.js`, `test/multi.test.js`.

## The problem

A contract's output wear depends on the mean adjusted float of its inputs. Any mean under the Factory New edge gives the same Factory New output. Landing far under the edge is therefore waste: the output is no better and low floats that could have been sold or used elsewhere are gone. The solver has to land as close under a ceiling as it can, using the worst inputs that still fit.

## The core

`underCore` walks the pool from the highest adjusted float down. It takes an item only if the smallest unused items could still complete the contract under the budget beside it. That look-ahead is what stops a plain greedy from painting itself into a corner. Two local passes follow. A 1-swap raises any selected item as far as the budget allows. A 2-swap scans the sorted pool with two pointers for the unused pair that best fills the room left by a selected pair, which escapes the optimum a 1-swap stops at.

Over mode is the same function. Every value and the budget are negated, so "as low as possible without dropping under" becomes "as high as possible without passing". Exact mode (`exactCore`) uses the same 1-swap and two-pointer 2-swap to minimise the distance to a target sum.

None of this is an optimiser. Every loop has an iteration guard, the 2-swap in exact mode takes the first improving pair, and the solver can return nothing when a feasible contract exists.

## Windows and conserve ranges

Every candidate must sit inside an adjusted-float window. Inputs outside it are never offered, which is how a range is conserved. Oliver's stated reason: the windows apply to every craft, they stop a record float being burned beside a 0.002, and they make the solver combine inputs of roughly the same rarity instead of a 0.00004 with a 0.002.

Fillers have a window of their own. Build v55 applied the collection window to every input. A legal filler at 0.012 with a collection window of 0.02 to 0.15 then rejected the whole contract and the tool reported that no contract was solvable. Build v56 scoped the check: collection window for collection inputs, filler window for fillers.

## Quotas

A rule says exactly, at least or at most k inputs from the target's collection, or from a second group. A rule that counts fillers is rewritten as its dual on collection inputs: at most F fillers is at least n minus F collection inputs.

`applyFillerCap` shapes the pool before the greedy runs. From v53 the collection inputs aim at their own target, `(T * n - need * fillerMean) / k`, because fillers pinned low force the collection inputs higher for the output to stay on target. From v54 `fillerMean` comes from the best fillers actually in the pool. The midpoint of the window had been used, and a window as wide as 0.00005 to 1 made the collection target meaningless. From v56 the k closest members are kept together with the k safest, because keeping only the closest could overshoot the budget by a hair and fail the whole solve.

`enforceQuotas` then runs five ordered passes: trim excess members, add missing ones, repair the budget with same-membership swaps, climb back toward the cap, and tune an exact target. The first version could only add, and on 16 June an "exactly N" contract was reported with an input over the cap at 0.073. The repair pass and the rule "return no contract instead of one that breaks the cap" came from that. The climb is v57. The v56 fallbacks made more solves succeed but left contracts landing at 0.065 or 0.032 with the headroom unused. A related bug from the same day, not the cause of v53: a knife needing a mean of 0.013 was given inputs averaging 0.018 and came out at 0.073.

One deliberate difference from the original: it trimmed only for "exactly" rules, so an "at most" rule could be rejected after the pool shaping offered 2k members. The port trims for "at most" as well.

## Fill strategies

Balanced keeps every input close to the target. Offset pins the fillers to their lowest available floats first and lets only the collection inputs climb. Oliver's stated reason: some collections have very expensive inputs. With three collection inputs and two cheap fillers whose low floats cost little, it is cheaper to pull the float down with the fillers than to burn expensive collection items at low floats.

## Generations

`generations` in `src/catalogue.js` groups cases by an identical gold output pool, keyed on the sorted list of knife and glove names. The groups decide where fillers may come from and define the second rule group. Whether a covert can be an input at all is decided separately, by whether its own case feeds a gold pool.

## Several contracts

`multiContract` and `solveAll` are a loop: solve one contract, exclude its items, solve again, stop at the first failure. The results are sorted best first afterwards. There is no joint allocation and no backtracking. `test/showcase.test.js` pins a case where the loop rebuilds 49 contracts from inputs that are known to make 50. One early Solve-all run produced more than 268 contracts and crashed the page, which is why the original gained a CSV export and a cap on how many contracts it draws.

## Evidence

On a real pool of 893 coverts the loop built 128 Factory New contracts with the range under adjusted 0.02 untouched. See `examples/SHOWCASE.md`.
