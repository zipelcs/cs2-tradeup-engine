# Float Lab

Code: `src/floatlab.js`, `src/floatlab-constants.js`. Tests: `test/floatlab.test.js`, `test/floatlab-constants.test.js`.

Float Lab answers one question with no target given: out of everything in an inventory, which desirable float can be crafted, and from which contract?

There are two versions in this repository. The current one ranks floats by what sells. The first one ranked them by mathematical value, and I removed it from the tool on 2 August. I kept its code here as `floatlab-constants.js` so the account below can be checked against it.

## Rare floats (current)

The tier comes from `flDesire`. Run length of a single digit is the ranking, and 6s and 8s rank one tier higher at equal length. The full 133742069 counts, and so does a repeated meme number. A blend of several does not. The two glitched floats and a few named floats have fixed tiers. 0.0700000002 counts only on a skin whose cap makes Factory New impossible.

Inside a tier, `flScore` orders the results:

    score = patternWeight x depthGain x coverage / sqrt(difficulty)

- Pattern weight comes from a table: 100 for six 8s or 6s, 95 for the full 133742069, down to 52 for ascending digits.
- Depth gain is 1 + 0.85 per leading zero.
- Coverage is the share of shown decimals explained by the pattern or by leading zeros. Below 0.6 the result is dropped as a coincidence inside a random float.
- Difficulty is how many float32 steps render the same leading decimals, found by walking the ladder both ways.

The weights are my judgement. Difficulty is a count anyone can repeat: the float32 values around a target are few, and `test/wear.test.js` walks them to show that exactly one float shows seven 8s after 0.00. That float scores 216 at tier S. The score orders results inside a tier and never moves a float to another tier, because a float that is hard to hit is not always one that sells.

Targets are enumerated by `flGrid`: each template at depth 0 to 5, kept only if it is a float32 step the output range can hold. A 0 to 0.08 finish is never offered 0.38.

## Constants (17 June to 1 August, removed)

The first Float Lab held a table of digit strings: pi, tau, e, the golden ratio, some square roots and logarithms, the reciprocal cycles of 1/7, 1/13, 1/27 and 1/81, and sequences such as the Fibonacci numbers and primes run together. Each entry was written after the decimal point behind zero to four leading zeros, converted to a target adjusted sum and handed to a closest-sum solver. A second pass scored sliding windows and seeded random subsets by longest prefix match against the table.

There was never a formula parser. The search is sampling, and at the time I described it as exhaustive, which was wrong.

The code worked and the ranking was the fault. Nobody pays more for the digits of pi on a skin. I removed the whole catalogue and rebuilt the ranking around floats that do sell.

## On real floats

`examples/SHOWCASE.md` replays five hits from a Float Lab search on a larger pool, each in its recorded click order. `test/floatlab.test.js` runs the search itself on a synthetic pool and checks that every hit it returns is verified with a click order.
