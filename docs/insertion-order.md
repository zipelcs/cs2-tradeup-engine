# Insertion order

Code: `src/orders.js`, `src/robustness.js`. Tests: `test/orders.test.js`, `test/robustness.test.js`.

## The problem

Float32 addition is not associative. The game adds the adjusted floats one at a time in the order the items were put into the contract, so the same items in a different order can store a different float. floatjitsu showed this first. The question for a solver is how likely each landing is and which order produces it.

## What was tried first

Random sampling of orders. It gave plausible shares.

## What broke

The sampled shares were wrong. One real ten-input craft sampled at 65.5% for its top landing; the exact figure is 68.501%. A second sampled as three landings at 59.7, 34.1 and 6.2 percent. It has four, at 49.434, 35.948, 14.354 and 0.263 percent. The fourth was invisible to the sampler.

## The design

`landingDistribution` enumerates every order exactly without visiting them one by one. The state is the set of inputs already added, as a bitmask, together with the float32 bit pattern of the running sum. The value is the number of orders that reach that state. The partial sum has to be part of the state because the additions do not commute. There are 1,024 masks for ten inputs and only a handful of distinct sums per mask, so 3,628,800 orders reduce to a few thousand transitions.

Why it stays small is the real point. Float32 addition is lossy: many different orders of the same subset round to the same partial sum. The same rounding that makes the order matter also collapses the orders into few states. Keying the table on the raw IEEE bit pattern of the sum makes that collapse exact, with no tolerance and no approximation. A witness order is rebuilt for every distinct landing, so each landing comes with an exact click order.

## Three hazards when crafting

Slot 1 is the first item added. The in-game grid shows the items newest first, which is cosmetic. A real craft added in printed order 1 to 10 was displayed 10 to 1 and landed on the forward prediction; the reversed order predicts the neighbouring step.

Removing an item and adding it back appends it to the end of the real sequence, although the screen looks unchanged. This follows from the model and has not been isolated by a craft of its own.

A majority is not safety. A contract whose predicted float was reached by 68.5% of all orders landed one step higher in game. The items were consumed, so the cause cannot be recovered.

## Robustness

The first metric perturbed each input by one to four float32 steps and counted what moved the landing. A one-step change on one input moves nearly every landing, so everything read fragile and the metric said nothing. The verdict now rests on the share of orders: one landing only is ROBUST, a share under 75% is FRAGILE, and so is a contract with look-alike inputs. Look-alikes show the same digits at the precision the grid displays but differ in float32 bits. Bit-identical inputs are not look-alikes, because swapping them cannot change the sum.

## Evidence

Both crafts and their exact shares are pinned in `test/orders.test.js`. Every witness order is replayed through the chain and must reproduce its landing.
