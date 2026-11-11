# Exact targets

Code: `src/custom.js`, `src/solver.js`. Tests: `test/custom.test.js`, `test/exact.test.js`, `test/solver.test.js`.

The goal here is one named float: a birthday, a run of one digit, the single float32 that shows seven 8s.

## Closest sum, and why it is not enough

Custom Float picks the contract whose adjusted sum is closest to the sum the target needs. It seeds with the inputs nearest the per-input target, then runs 1-swaps and a two-pointer 2-swap. `customSweep` runs a closest-sum solver against every craftable pool in an inventory and ranks the pools by distance.

The right sum can still land on a neighbouring step, and which step depends on the order. `test/custom.test.js` pins a contract with three landings where the tool reports the near miss and its share. A double-precision filter can also report a float32 value that no insertion order of those inputs reaches. I call that a phantom.

One early bug belongs here. A leftover selection from another mode made a custom target on a 0 to 0.08 knife solve against a 0 to 1 range. The budget is now always computed against the caps of the specific target (`targetAdjusted`).

## Step-Solve

`stepSolve` sorts the pool by adjusted float, builds prefix sums and searches depth first for n inputs whose sum lies in a narrow window. Two bounds cut the tree. If the smallest completion overshoots the window, the branch ends. If the largest undershoots, the item is skipped. Every subset that survives is enumerated across all insertion orders and accepted only if some order stores a float the caller accepts. The click order comes back with it.

It is a pruned first-hit search with no objective and no incumbent bound. The node budget is explicit. A search that runs out returns `capped: true`, and the tests check that this is never reported as a plain miss.

`verifyHit` is the phantom check. A candidate from a fast filter is replayed against the exact landing set. If no order reaches it, it is moved onto a reachable landing the caller approves, or dropped.

`feasibility` explains a miss with the mean the target needs, the window the pool can reach and the closest mean found.

Two faults in my earlier public version of this layer are fixed here, and `test/exact.test.js` covers both. `sumWindow` used a purely relative slack, which collapsed to zero width when the target was the range minimum. Inputs were tracked by id, so two inputs sharing an id broke the search.

## How much room there is

The output is a mean, so each of ten inputs carries a tenth of it. Near 0.0888 one float32 step is 2^-27, about 7.45e-9. That leaves about 7.45e-8 of slack on any single input. A handful of inputs will rarely hit a named step. The pool has to be dense in the right float region.

## Results on real floats

`examples/SHOWCASE.md` replays six sets of five real inputs that land exactly on named floats, including 0.0088888881728053093 and 0.069696970283985138. The sets were found on a larger pool that is not in this repository. The replay shows that the sets hit and how many orders hit. It does not show the search that found them. On the seventeen-item Chroma 3 fixture the first of those targets is out of reach, and `test/custom.test.js` pins that the tool reports the distance.
