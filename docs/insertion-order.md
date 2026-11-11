# Insertion order

Code: `src/orders.js`, `src/robustness.js`. Tests: `test/orders.test.js`, `test/robustness.test.js`.

Float32 addition is not associative. The game adds the adjusted floats one at a time in the order the items were put into the contract, so the same ten items in a different order can store a different float. floatjitsu showed this first.

## An example

Craft B in `fixtures/crafts.js` is a real ten-input contract. Its 3,628,800 orders produce four different floats:

| Landing | Share of orders |
|---|---|
| 0.21492148935794830 | 49.434% |
| 0.21492151916027069 | 35.948% |
| 0.21492147445678711 | 14.354% |
| 0.21492144465446472 | 0.263% |

My first version sampled random orders. On this craft the sample showed three landings. The fourth is rare enough that a few hundred random orders often contain none of it, so I enumerate every order instead.

## Counting every order

`landingDistribution` counts all orders without visiting them one by one. The state is the set of inputs already added, as a bitmask, together with the float32 bit pattern of the running sum. The value is the number of orders that reach that state. The partial sum has to be part of the state because the additions do not commute.

Ten inputs have 1,024 masks. Each mask holds only a handful of distinct sums, because float32 addition is lossy and many orders of the same subset round to the same partial sum. The rounding that makes order matter is also what keeps the table small. I key the table on the raw bit pattern of the sum, so two sums merge only when they are the same float. A click order is rebuilt for every landing.

For five inputs `test/orders.test.js` compares the result with brute force over all 120 orders. For the recorded crafts it checks that the shares sum to 1, that every rebuilt order reproduces its landing, and that 300 seeded random orders all land inside the exact set.

On 5,000 seeded random ten-input contracts, order changes the stored float in 99.7% of them, and the most common landing has under 75% of the orders in 65.7% of them (`bench/accuracy.js`). Random contracts spread their inputs over many ranges, so treat those two figures as an upper end.

## Which order the game uses

Slot 1 is the first item added. Craft B settles this as far as one craft can: its forward order and its reversed order predict different steps, and the game stored the forward one. My notes from that craft say the in-game grid showed the items newest first. I have no fixture for the display order.

## The robustness verdict

Craft A was predicted from 68.501% of its orders. The game stored the next step up, which 31.271% of orders reach. The items were consumed, so I cannot say which order was actually clicked.

My first fragility metric perturbed each input by one to four float32 steps and counted what moved the landing. A one-step change on one input moves nearly every landing, so everything read fragile. `robustness` still reports that number and does not use it.

The verdict uses the order share. One landing only is ROBUST. A share under 0.75 is FRAGILE, and so is a contract with look-alike inputs. Look-alikes show the same digits at the precision the grid displays and differ in their float32 bits, so they can be clicked in the wrong order without anyone noticing. Bit-identical inputs are not look-alikes, because swapping them cannot change the sum. The 0.75 line is a choice I made after craft A, and a single miss is thin evidence for it.
