# Hunter and chained crafts

Code: `src/hunter.js`, `src/chain.js`. Tests: `test/hunter.test.js`, `test/settle.test.js`, `test/chain.test.js`.

## #1 Hunter

The job is to beat a record float on a target skin from owned inventory without spending the best copies. The contract has to get under a bar, it should spend as little float quality as possible, and it must keep at least one input that can produce the target.

My first build on 14 June reused the listing solver in its cheapest mode. A cheapest-first pick has no reason to protect low floats, and its answers showed it: one very low float carrying four fillers. I replaced it the same afternoon.

`canBeTarget` decides whether a skin can be the output of any contract. A knife or glove needs a case that holds coverts. Any other skin needs a tier below it in a shared collection.

`huntPick` is a maximin. It seeds with the n lowest adjusted floats, which is the most feasible set there is. It then raises the single lowest input by the smallest amount that keeps the mean under the bar, and restarts. The set ends up clustered just under the bar, so the best copies are the first to be kept back. It never drops the last input that can produce the target. Lowest and highest modes are separate simple paths.

The pick budgets the mean in float64. `huntSolve` then runs the same float32 check as the Max Float solver: every insertion order must land at or under the record, and the pick is stepped down until that holds.

On the seventeen-item Chroma 3 fixture the pick keeps the five best copies and uses the five worst. Those five land on two floats two steps apart, from 72 and 48 of the 120 orders, and the tool reports both (`test/hunter.test.js`).

## Chained crafts

Four of the five coverts are in hand and no fifth exists at the float the target needs. The plan is to make the fifth first, from ten Classifieds.

The covert that the first contract produces is random. So the plan has to be a table: for every covert that could drop, the float it will have, whether the target is still reachable, and which order to click.

`planChain` works through these steps:

1. Convert the target to the mean the final five must produce.
2. For each case with at least four owned coverts and each collection with at least ten owned Classifieds, compute the window of means the Classified contract can reach.
3. Pick four coverts whose sum leaves a fifth input inside that window.
4. Solve the ten Classifieds toward that fifth float. A set is accepted only if at least one possible drop finishes the craft.
5. For each landing of the Classified contract, remap the result onto every possible covert's caps, adjust it again against those caps, and enumerate the final contract.
6. Keep the first-stage landing that lets the most branches finish. Branches that miss are reported with their nearest reachable float.

The planner takes the first feasible set of four coverts, aims in double precision before it verifies in float32, and returns one plan. Its budgets are node counts and a count of collections tried. It never reads the clock, so the same call always gives the same plan.

In the original, step 4 took the first ten Classifieds inside the sum window and checked the branches afterwards, so a plan depended on that first set happening to land. Here the branch check is the accept test of the search.

I have tested the planner on a synthetic inventory only. Every branch it marks reachable replays to the exact target in `test/chain.test.js`. It has not been run on real items.
