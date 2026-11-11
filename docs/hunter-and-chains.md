# Hunter and chained crafts

Code: `src/hunter.js`, `src/chain.js`. Tests: `test/hunter.test.js`, `test/chain.test.js`.

## #1 Hunter

### The problem

Beat a record float on a target skin from owned inventory, without spending the best copies to do it. Two objectives and one hard constraint: get under a bar, spend as little float quality as possible, and keep at least one input that can actually produce the target.

### What was tried first

The first build (14 June, early afternoon) reused the listing solver in its cheapest mode. A cheapest-first pick has no reason to protect low floats, and its answers were visibly worse: one very low float carrying four fillers.

### The design

`canBeTarget` decides whether a skin can be the output of any contract. A knife or glove needs a case that holds coverts. Any other skin needs a tier below it in a shared collection.

`huntPick` is a maximin, added the same afternoon. It seeds with the n lowest adjusted floats, which is the most feasible set there is. It then raises the single lowest input by the smallest amount that keeps the mean under the bar, and restarts. The set ends up clustered just under the bar, so the best copies are the first to be kept back. Two guards hold throughout: never pass the bar, never drop the last input that can produce the target. Lowest and highest modes were added on 16 June as separate simple paths.

### Evidence

On the seventeen-item Chroma 3 fixture the pick keeps the five best copies and uses the five worst. Those five land on two floats two steps apart, from 60% and 40% of the 120 orders, so the tool reports both. `test/hunter.test.js` pins this.

## Chained crafts

### The problem

Four of the five coverts are in hand and no fifth exists at the float the target needs. Make the fifth first, from ten Classifieds.

### What makes it hard

The covert that the first contract produces is random. A plan that is right for one drop is not a plan. It has to say, for every covert that could drop, what float that covert will have, whether the target is still reachable and which order to click.

### The design

`planChain` converts the target to the mean the final five must produce. For each case with at least four owned coverts and each collection with at least ten owned Classifieds, it computes the window of means the Classified contract can reach, picks four coverts whose sum leaves a fifth input inside that window, and solves the ten Classifieds toward that fifth float. For each landing of the Classified contract it remaps the result onto every possible covert's caps, adjusts it again against those caps, and enumerates the final contract. The stage 1 landing that lets the most branches finish is kept. Branches that miss are reported with their nearest reachable float.

### Limits

It takes the first feasible set of four coverts, aims in double precision before verifying in float32, and returns one plan. The original also took the first ten Classifieds inside the sum window and only then checked the branches, so a plan depended on that first set happening to land. The port makes the branch check the accept test of the search, under the same node budget. The planner is tested on a synthetic inventory only.
