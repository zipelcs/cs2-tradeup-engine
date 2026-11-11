# Exact targets

Code: `src/custom.js`, `src/solver.js`. Tests: `test/custom.test.js`, `test/exact.test.js`, `test/solver.test.js`.

## The problem

Land on one named float, not near it. A birthday, a run of one digit, the single float32 that shows seven 8s.

## What was tried first

Custom Float (13 June) picks the contract whose adjusted sum is closest to the sum the target needs: a seed of the inputs nearest the per-input target, then 1-swaps and a two-pointer 2-swap. The sweep (15 July) runs that against every craftable pool in an inventory and ranks the pools by distance.

## What broke

Three things.

The budget was bound to the wrong skin. A leftover selection from another mode made a custom target on a 0 to 0.08 knife solve against a 0 to 1 range, so a target of 0.004072026 produced a contract around 0.0003 to 0.003. The budget is now always computed against the caps of the specific target (`targetAdjusted`).

Closest sum is not the target. The right sum can still land on a neighbouring step, and which step depends on the order.

A double-precision pre-filter reports phantoms: valid float32 values that no insertion order of those inputs reaches.

## The design

`stepSolve` sorts the pool by adjusted float, builds prefix sums and searches depth first for n inputs whose sum lies in a narrow window. Two bounds cut the tree. If even the smallest completion overshoots the window, the branch ends. If even the largest undershoots, the item is skipped. Every subset that survives is enumerated across all insertion orders and accepted only if some order stores a float the caller accepts. The witness order comes back with it. The node budget is explicit, and a search that runs out returns `capped: true`, so giving up never reads as "no solution".

It is a pruned first-hit search. There is no objective and no incumbent bound.

`verifyHit` is the phantom check. A candidate from a fast pre-filter is replayed against the exact landing set. If no order reaches it, it is moved onto a reachable landing the caller approves or dropped. It is never passed through.

`feasibility` explains a miss: the mean the target needs, the window the pool can reach and the closest mean found.

Two faults in the earlier public version of this layer are fixed here. `sumWindow` used a purely relative slack, which collapsed to zero width when the target was the range minimum. Inputs were tracked by id, so two inputs sharing an id broke the search. Both are covered in `test/exact.test.js`.

## Pool size

The output is a mean, so each of ten inputs carries a tenth of it. Near 0.0888 one float32 step is 7.45e-9, which leaves about 7.45e-8 of slack on any single input. A handful of inputs cannot hit a named step. The recorded estimate is about 40 candidate listings in the right float region, with 50 comfortable, and the region matters more than the count.

## Evidence

On a real pool of 893 coverts the solver landed 0.0088888881728053093 and 0.069696970283985138 exactly, each from every one of the 120 orders, and a second set for the latter that hits from 65% of orders. See `examples/SHOWCASE.md`. A seventeen-item pool cannot reach the first of those, and `test/custom.test.js` pins that the tool reports the distance instead of a hit.
