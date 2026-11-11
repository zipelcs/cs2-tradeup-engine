// Contracts with known results. Raw floats as listed; every input skin range here starts at 0.
// What each one shows is stated on it. REFERENCE is a published vector. Crafts A, B and K were made
// in the game; their results are recorded here as noted at the time, and nothing in this repository
// can re-check them against the game.

/** Reference vector: ten inputs on a 0.06-0.80 skin into a 0.06-0.80 output. */
export const REFERENCE = {
  range: { min: 0.06, max: 0.8 },
  floats: [0.3666255176067352294921875, 0.377684891223907470703125, 0.358720242977142333984375, 0.2542461454868316650390625,
    0.374294698238372802734375, 0.35603535175323486328125, 0.23788045346736907958984375, 0.325074136257171630859375,
    0.375528275966644287109375, 0.3578624725341796875],
  expected: 0.33839523792266846,
};

/** Craft A: ten Mil-Specs into M4A1-S | Night Terror (0.00-0.70), in insertion order. [raw, skinMax] */
export const CRAFT_A = {
  output: { min: 0, max: 0.7 },
  inputs: [[0.10166881978511801, 1.0], [0.0567903183400631, 0.57], [0.06954421103000639, 0.7], [0.0999834835529327, 1.0],
    [0.100407302379608, 1.0], [0.0563701577484608, 0.57], [0.0572693720459938, 0.57], [0.0985879600048065, 1.0],
    [0.0688928812742233, 0.7], [0.098256453871727, 1.0]],
  forward: 0.069696970283985138,
  naiveFloat64: 0.069696971951869469,
  topShare: 0.68501,
  landings: 3,
  // What the game stored: one float32 step above the forward prediction. The model missed this craft.
  // The value is one of the three landings the model gives these inputs, reached by 31.271% of orders.
  actual: 0.069696977734565735,
  actualShare: 0.31271,
};

/** Craft B: same output. Forward and reversed orders land on different float32 steps; the game matched forward. */
export const CRAFT_B = {
  output: { min: 0, max: 0.7 },
  inputs: [[0.109022900462151, 0.9], [0.33809772133827198, 1.0], [0.32645791769027699, 1.0], [0.33586907386779802, 0.9],
    [0.65672135353088401, 1.0], [0.30270063877105702, 1.0], [0.13954624533653301, 1.0], [0.238659352064133, 1.0],
    [0.125483497977257, 0.57], [0.31828758120536799, 0.9]],
  forward: 0.2149214893579483,
  reversed: 0.21492151916027069,
  shares: [0.49434, 0.35948, 0.14354, 0.00263],
};

/**
 * Craft K: five coverts into a knife with a 0.06-0.80 range, in insertion order. [raw, skinMax]
 * The game stored the forward prediction. 58 of the 120 orders reach it; the other 62 land one step lower.
 */
export const CRAFT_K = {
  output: { min: 0.06, max: 0.8 },
  inputs: [[0.0006474579568020999431610107421875, 0.92], [0.34433734416961669921875, 0.5], [0.12195612490177154541015625, 0.5],
    [0.0125242331996560009674072265625, 0.92], [0.000197309651412069797515869140625, 0.5]],
  forward: 0.20020020008087158203125,
  orders: 58,
  landings: 2,
};

export const toInputs = c => c.inputs.map(([float, max]) => ({ float, min: 0, max }));
