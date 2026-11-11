# Showcase: the engine on real floats

Target: ★ Karambit | Case Hardened (float range 0 to 1). The fixture holds 302 real floats from an owned pool of coverts.
The full pool is not in this repository. Every number below is computed by `examples/showcase.js` from `fixtures/showcase.json`, and `test/showcase.test.js` pins the same results. There are no prices and no timings here.

## 1. Max float, 50 contracts under the Factory New edge

Settings: 5 inputs, objective under, cap 0.069999903440475464 (13 float32 steps under the edge 0.070000000298023224), adjusted-float window minimum 0.02.
These 50 contracts were recorded from a Solve-all run on the larger pool. Each one is replayed here over all 120 insertion orders.

| # | landing (most likely order) | share | worst landing over all orders | steps under the cap | mean input float |
|---|---|---|---|---|---|
| 1 | 0.069999903440475464 | 68.3% | 0.069999903440475464 | 0 | 0.04262 |
| 2 | 0.069999903440475464 | 90.0% | 0.069999903440475464 | 0 | 0.03239 |
| 3 | 0.069999903440475464 | 86.7% | 0.069999903440475464 | 0 | 0.05343 |
| 4 | 0.069999895989894867 | 73.3% | 0.069999903440475464 | 0 | 0.04156 |
| 5 | 0.069999895989894867 | 83.3% | 0.069999903440475464 | 0 | 0.03673 |
| 6 | 0.069999903440475464 | 65.0% | 0.069999903440475464 | 0 | 0.04248 |
| 7 | 0.069999895989894867 | 95.0% | 0.069999903440475464 | 0 | 0.04518 |
| 8 | 0.069999895989894867 | 73.3% | 0.069999903440475464 | 0 | 0.04236 |
| 9 | 0.069999895989894867 | 65.0% | 0.069999903440475464 | 0 | 0.04157 |
| 10 | 0.069999895989894867 | 63.3% | 0.069999903440475464 | 0 | 0.03577 |
| 11 | 0.069999895989894867 | 81.7% | 0.069999903440475464 | 0 | 0.04440 |
| 12 | 0.069999895989894867 | 95.0% | 0.069999903440475464 | 0 | 0.03642 |
| 13 | 0.069999895989894867 | 91.7% | 0.069999903440475464 | 0 | 0.03450 |
| 14 | 0.069999895989894867 | 78.3% | 0.069999903440475464 | 0 | 0.04396 |
| 15 | 0.069999895989894867 | 75.0% | 0.069999903440475464 | 0 | 0.03441 |
| 16 | 0.069999895989894867 | 93.3% | 0.069999903440475464 | 0 | 0.03203 |
| 17 | 0.069999895989894867 | 100.0% | 0.069999895989894867 | 1 | 0.04070 |
| 18 | 0.069999895989894867 | 73.3% | 0.069999895989894867 | 1 | 0.04167 |
| 19 | 0.069999888539314270 | 65.0% | 0.069999895989894867 | 1 | 0.04259 |
| 20 | 0.069999895989894867 | 85.0% | 0.069999895989894867 | 1 | 0.05350 |
| 21 | 0.069999895989894867 | 85.0% | 0.069999903440475464 | 0 | 0.04400 |
| 22 | 0.069999895989894867 | 90.0% | 0.069999895989894867 | 1 | 0.03594 |
| 23 | 0.069999895989894867 | 70.0% | 0.069999895989894867 | 1 | 0.03790 |
| 24 | 0.069999895989894867 | 75.0% | 0.069999895989894867 | 1 | 0.04368 |
| 25 | 0.069999895989894867 | 50.0% | 0.069999895989894867 | 1 | 0.04012 |
| 26 | 0.069999888539314270 | 73.3% | 0.069999895989894867 | 1 | 0.03812 |
| 27 | 0.069999895989894867 | 78.3% | 0.069999895989894867 | 1 | 0.04082 |
| 28 | 0.069999895989894867 | 88.3% | 0.069999895989894867 | 1 | 0.03362 |
| 29 | 0.069999895989894867 | 100.0% | 0.069999895989894867 | 1 | 0.03133 |
| 30 | 0.069999888539314270 | 66.7% | 0.069999895989894867 | 1 | 0.03733 |
| 31 | 0.069999895989894867 | 51.7% | 0.069999895989894867 | 1 | 0.03864 |
| 32 | 0.069999888539314270 | 85.0% | 0.069999895989894867 | 1 | 0.04615 |
| 33 | 0.069999888539314270 | 60.0% | 0.069999895989894867 | 1 | 0.05009 |
| 34 | 0.069999888539314270 | 80.0% | 0.069999895989894867 | 1 | 0.04892 |
| 35 | 0.069999888539314270 | 88.3% | 0.069999895989894867 | 1 | 0.04638 |
| 36 | 0.069999888539314270 | 88.3% | 0.069999895989894867 | 1 | 0.04656 |
| 37 | 0.069999888539314270 | 90.0% | 0.069999895989894867 | 1 | 0.02965 |
| 38 | 0.069999888539314270 | 96.7% | 0.069999895989894867 | 1 | 0.03423 |
| 39 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 2 | 0.05250 |
| 40 | 0.069999888539314270 | 93.3% | 0.069999895989894867 | 1 | 0.03551 |
| 41 | 0.069999888539314270 | 96.7% | 0.069999895989894867 | 1 | 0.04489 |
| 42 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 2 | 0.03239 |
| 43 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 2 | 0.04625 |
| 44 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 2 | 0.04371 |
| 45 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 2 | 0.03642 |
| 46 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 2 | 0.08019 |
| 47 | 0.069999888539314270 | 81.7% | 0.069999888539314270 | 2 | 0.03169 |
| 48 | 0.069999881088733673 | 50.0% | 0.069999888539314270 | 2 | 0.04580 |
| 49 | 0.069999888539314270 | 78.3% | 0.069999888539314270 | 2 | 0.03775 |
| 50 | 0.069999888539314270 | 81.7% | 0.069999888539314270 | 2 | 0.04071 |

No insertion order of any of the 50 lands above the cap: true. Highest landing 0.069999903440475464, lowest 0.069999888539314270.
Mean input float 0.04139, lowest adjusted float used 0.02354.

Solved again from those 250 inputs alone, the loop builds 49 contracts and leaves 5 inputs over. It is a sequential greedy, and without the rest of the pool its picks fall in a different order.

## 2. Fillers with their own range, both fill strategies

Settings: exactly 3 inputs from R8 Revolver | Fade (adjusted 0.05 to 0.2), the rest fillers (adjusted 0.02 to 0.06), same cap as above. Solved here on the 302 fixture floats.

Strategy bal: mean adjusted 0.069998, landings 0.069997712969779968 at 100.0%.

| group | input | float | adjusted |
|---|---|---|---|
| filler | Sawed-Off \| The Kraken | 0.00870521646 | 0.021763 |
| filler | Sawed-Off \| The Kraken | 0.00874235854 | 0.021856 |
| collection | R8 Revolver \| Fade | 0.0406292863 | 0.101573 |
| collection | R8 Revolver \| Fade | 0.0408908129 | 0.102227 |
| collection | R8 Revolver \| Fade | 0.0410277545 | 0.102569 |

Strategy offset: mean adjusted 0.069986, landings 0.069986104965209961 at 80.0%, 0.069986112415790558 at 20.0%.

| group | input | float | adjusted |
|---|---|---|---|
| filler | CZ75-Auto \| Victoria | 0.0151436878 | 0.020192 |
| filler | Sawed-Off \| The Kraken | 0.00829971023 | 0.020749 |
| collection | R8 Revolver \| Fade | 0.0406292863 | 0.101573 |
| collection | R8 Revolver \| Fade | 0.0419388339 | 0.104847 |
| collection | R8 Revolver \| Fade | 0.0410277545 | 0.102569 |

## 3. Exact float32 targets

Each set of five was found by Step-Solve on the larger pool and is replayed here: the click order shown stores exactly the target.

### 0.069696970283985138 (0.0696969 run of 69s)

Tier A, score 52. 1 float32 value shows these nine decimals.
Share of the 120 insertion orders that land on it: 100.0%. Verdict: ROBUST.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | R8 Revolver \| Fade | 0.0383107029 | 0.095777 |
| 2 | R8 Revolver \| Fade | 0.0377144776 | 0.094286 |
| 3 | R8 Revolver \| Fade | 0.0350812413 | 0.087703 |
| 4 | Sawed-Off \| The Kraken | 0.0162533373 | 0.040633 |
| 5 | CZ75-Auto \| Victoria | 0.0225640759 | 0.030085 |

### 0.069696970283985138 (0.0696969 fragile)

Tier A, score 52. 1 float32 value shows these nine decimals.
Share of the 120 insertion orders that land on it: 65.0%. Verdict: FRAGILE.
Other orders produce: 0.069696977734565735 (20.0%), 0.069696962833404541 (15.0%).

| click | input | float | adjusted |
|---|---|---|---|
| 1 | Sawed-Off \| The Kraken | 0.0441115871 | 0.110279 |
| 2 | R8 Revolver \| Fade | 0.0390972681 | 0.097743 |
| 3 | R8 Revolver \| Fade | 0.0321154557 | 0.080289 |
| 4 | CZ75-Auto \| Victoria | 0.0225664787 | 0.030089 |
| 5 | CZ75-Auto \| Victoria | 0.0225640759 | 0.030085 |

### 0.0088888881728053093 (seven 8s)

Tier S, score 216. 1 float32 value shows these nine decimals.
Share of the 120 insertion orders that land on it: 100.0%. Verdict: ROBUST.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | CZ75-Auto \| Victoria | 0.0224066563 | 0.029876 |
| 2 | Sawed-Off \| The Kraken | 0.00368575496 | 0.009214 |
| 3 | SSG 08 \| Blood in the Water | 0.0607218705 | 0.005156 |
| 4 | SSG 08 \| Blood in the Water | 0.0600258633 | 0.000185 |
| 5 | AWP \| Asiimov | 0.180011109 | 0.000014 |

### 0.088888801634311676 (S 8-rep depth 1)

Tier S, score 130. 1 float32 value shows these nine decimals.
Share of the 120 insertion orders that land on it: 36.7%. Verdict: FRAGILE.
Other orders produce: 0.088888809084892273 (63.3%).

| click | input | float | adjusted |
|---|---|---|---|
| 1 | SSG 08 \| Blood in the Water | 0.0799966753 | 0.142833 |
| 2 | Sawed-Off \| The Kraken | 0.0384578332 | 0.096145 |
| 3 | Sawed-Off \| The Kraken | 0.0236015730 | 0.059004 |
| 4 | R8 Revolver \| Fade | 0.0349981487 | 0.087495 |
| 5 | R8 Revolver \| Fade | 0.0235866979 | 0.058967 |

### 0.066666603088378906 (S 6-rep depth 1)

Tier S, score 130. 1 float32 value shows these nine decimals.
Share of the 120 insertion orders that land on it: 88.3%. Verdict: OK.
Other orders produce: 0.066666595637798309 (11.7%).

| click | input | float | adjusted |
|---|---|---|---|
| 1 | R8 Revolver \| Fade | 0.0461775176 | 0.115444 |
| 2 | R8 Revolver \| Fade | 0.0373175554 | 0.093294 |
| 3 | CZ75-Auto \| Victoria | 0.0382672139 | 0.051023 |
| 4 | P2000 \| Fire Elemental | 0.0220818818 | 0.036803 |
| 5 | Sawed-Off \| The Kraken | 0.0147076948 | 0.036769 |

### 0.00099999899975955486 (S 9-rep depth 3)

Tier S, score 70. 9 float32 values show these nine decimals.
Share of the 120 insertion orders that land on it: 100.0%. Verdict: ROBUST.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | R8 Revolver \| Fade | 0.000882067427 | 0.002205 |
| 2 | R8 Revolver \| Fade | 0.000791767903 | 0.001979 |
| 3 | R8 Revolver \| Fade | 0.000199583694 | 0.000499 |
| 4 | R8 Revolver \| Fade | 0.0000902347456 | 0.000226 |
| 5 | AWP \| Asiimov | 0.180074513 | 0.000091 |

## 4. #1 Hunter, maximin pick

Bar: 0.002. Ten inputs are offered: five very low floats that a lowest-first pick would burn, and five more. The maximin pick lands 0.0019828516524285078 at 100.0%.
Its lowest input is adjusted 0.001675. The five inputs it keeps back run from 0.000014 to 0.000163.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | Sawed-Off \| The Kraken | 0.000669991248 | 0.001675 |
| 2 | R8 Revolver \| Fade | 0.000763757154 | 0.001909 |
| 3 | R8 Revolver \| Fade | 0.000791767903 | 0.001979 |
| 4 | R8 Revolver \| Fade | 0.000858119689 | 0.002145 |
| 5 | R8 Revolver \| Fade | 0.000882067427 | 0.002205 |

## 5. Float Lab hits

Five hits recorded from a Float Lab search on the larger pool, replayed here in the recorded order.

| float | tier | pattern | share of orders | output range |
|---|---|---|---|---|
| 0.00438266666606 | S | 6x 6 | 100.0% | 0 to 0.08 |
| 0.0597886666656 | S | 6x 6 | 100.0% | 0 to 1 |
| 0.0666666179895 | S | 6x 6 | 100.0% | 0 to 1 |
| 0.00506666628644 | A | 5x 6 | 25.0% | 0 to 0.08 |
| 0.00395888881758 | A | 5x 8 | 86.7% | 0 to 0.08 |

## 6. Over mode: the lowest Minimal Wear

The same core on negated values, with a floor of 0.070000097155570984 (13 float32 steps above the edge). Solved here on the 302 fixture floats. Landings 0.070000134408473969 Minimal Wear at 81.7%, 0.070000141859054565 Minimal Wear at 11.7%, 0.070000126957893372 Minimal Wear at 6.7%.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | CZ75-Auto \| Victoria | 0.0857700408 | 0.114360 |
| 2 | R8 Revolver \| Fade | 0.0442067198 | 0.110517 |
| 3 | CZ75-Auto \| Victoria | 0.0516175367 | 0.068823 |
| 4 | CZ75-Auto \| Victoria | 0.0422151834 | 0.056287 |
| 5 | AWP \| Asiimov | 0.180011109 | 0.000014 |

## Not covered

Chained crafts, the glitch scan, ten-input contracts and StatTrak are not shown on real items. The fixture holds non-StatTrak coverts only. Those paths are tested on synthetic pools.
