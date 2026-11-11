# Float Lab

Code: `src/floatlab-constants.js`, `src/floatlab.js`. Tests: `test/floatlab-constants.test.js`, `test/floatlab.test.js`.

## The problem

Out of everything in an inventory, find the most desirable float that can actually be crafted, and the contract that makes it. No target is given.

## What was tried first: constants, 17 June to 1 August

The first Float Lab defined targets by mathematical value. A table held the digits of pi, tau, e, the golden ratio, the square roots of 2, 3 and 5, ln 2, the Euler-Mascheroni constant, Apery's constant, Catalan's constant and log10 2. It also held the reciprocal cycles of 1/7, 1/13, 1/27 and 1/81, and the Fibonacci numbers, primes, squares, powers of 2 and triangular numbers run together as digits.

There was never a formula parser. Each entry is a digit string written after the decimal point behind zero to four leading zeros, converted to a target adjusted sum and handed to a closest-sum solver. So a contract was solved specifically to land on 0.142857142857, the expansion of one seventh. A second pass enumerated forward: sliding windows over the sorted inputs and random subsets from a small seeded generator, scored by longest prefix match against the table, with palindromes and repeats on top.

The search is sampling. It was described as exhaustive at the time and is not.

## What broke

Nothing in the code. The ranking was wrong about the market. The changelog for the build of 2 August says the old catalogue ranked floats by mathematical interest, that none of it sells a skin, and that all of it was removed.

Two mislabels are recorded from the builds that followed. 0.000069604204 was offered as a target because the catalogue still seeded loose two-digit fragments and the fast reject accepted any three repeats. 0.000133794369 was tagged as a 1337 float because meme numbers were matched anywhere in the digits.

## The design: rare floats

Tier comes from what sells (`flDesire`). Run length of a single digit is the ranking, with 6s and 8s one tier higher at equal length. The full 133742069 counts, and a repeated meme counts, but never a blend of several. The two glitched floats and a few named floats have fixed tiers. 0.0700000002 is a prize only on a skin whose cap makes Factory New impossible.

Within a tier an arithmetic score ranks the results (`flScore`):

    score = patternWeight x depthGain x coverage / sqrt(difficulty)

Pattern weight comes from a table: 100 for six 8s or 6s, 95 for the full 133742069, down to 52 for ascending digits. Depth gain is 1 + 0.85 per leading zero. Coverage is the share of shown decimals explained by the pattern or by leading zeros, and below 0.6 the result is dropped as a coincidence inside a random float. Difficulty is how many float32 steps render the same leading decimals, found by walking the ladder both ways. A difficulty of 1 means one float in the game shows that string.

The score does not override the tier. Difficulty is not sellability.

Two properties make the score more than an opinion. Difficulty can be checked by exhaustion: the float32 values around a target are few, so "only one float renders this" is a claim anyone can verify by walking the ladder, and `test/wear.test.js` does it for the seven 8s. And the coverage floor makes the tool discard its own weak results instead of ranking them low.

Targets are enumerated, not listed by hand (`flGrid`): each template at depth 0 to 5, kept only if it is a float32 step the output range can hold. A 0 to 0.08 finish is never offered 0.38.

## Evidence

`examples/SHOWCASE.md` records a search over a real 328-input pool and the exact hits on enumerated targets. The seven 8s score 216 at tier S with a difficulty of 1.
