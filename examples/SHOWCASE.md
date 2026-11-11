# Showcase: recorded runs on a real pool

Target: ★ Karambit | Case Hardened (float range 0 to 1). Pool: 893 owned non-StatTrak coverts from the cases that drop it.
Only the inputs each run used are in `fixtures/showcase.json`. Every result below is pinned in `test/showcase.test.js`.
Runtimes are from the run on the full pool. Prices, where they appear, are invented samples.

## 1. Max float, 50 contracts under the Factory New edge

Settings: 5 inputs, objective under, cap 0.069999903440475464 (13 float32 steps under the edge 0.070000000298023224), adjusted-float window minimum 0.02.
The window conserves every input under adjusted 0.02: 145 of them, none used.
The pool supports 128 such contracts (175 with no window). Solving all of them took 38 ms. The first 50, best first:

| # | landing (most likely order) | share | worst landing over all orders | gap to the edge | mean input float |
|---|---|---|---|---|---|
| 1 | 0.069999903440475464 | 93.3% | 0.069999910891056061 | 8.94e-8 | 0.03499 |
| 2 | 0.069999903440475464 | 83.3% | 0.069999910891056061 | 8.94e-8 | 0.03917 |
| 3 | 0.069999903440475464 | 90.0% | 0.069999910891056061 | 8.94e-8 | 0.04151 |
| 4 | 0.069999903440475464 | 90.0% | 0.069999910891056061 | 8.94e-8 | 0.03520 |
| 5 | 0.069999903440475464 | 48.3% | 0.069999910891056061 | 8.94e-8 | 0.04360 |
| 6 | 0.069999903440475464 | 66.7% | 0.069999903440475464 | 9.69e-8 | 0.03579 |
| 7 | 0.069999903440475464 | 80.0% | 0.069999910891056061 | 8.94e-8 | 0.08124 |
| 8 | 0.069999903440475464 | 50.0% | 0.069999910891056061 | 8.94e-8 | 0.03281 |
| 9 | 0.069999895989894867 | 46.7% | 0.069999910891056061 | 8.94e-8 | 0.03652 |
| 10 | 0.069999903440475464 | 90.0% | 0.069999910891056061 | 8.94e-8 | 0.03289 |
| 11 | 0.069999903440475464 | 100.0% | 0.069999903440475464 | 9.69e-8 | 0.03706 |
| 12 | 0.069999903440475464 | 70.0% | 0.069999910891056061 | 8.94e-8 | 0.03781 |
| 13 | 0.069999903440475464 | 75.0% | 0.069999910891056061 | 8.94e-8 | 0.03187 |
| 14 | 0.069999903440475464 | 83.3% | 0.069999903440475464 | 9.69e-8 | 0.03844 |
| 15 | 0.069999903440475464 | 90.0% | 0.069999903440475464 | 9.69e-8 | 0.03239 |
| 16 | 0.069999895989894867 | 50.0% | 0.069999903440475464 | 9.69e-8 | 0.04131 |
| 17 | 0.069999903440475464 | 65.0% | 0.069999910891056061 | 8.94e-8 | 0.03539 |
| 18 | 0.069999895989894867 | 50.0% | 0.069999903440475464 | 9.69e-8 | 0.03496 |
| 19 | 0.069999895989894867 | 60.0% | 0.069999910891056061 | 8.94e-8 | 0.03316 |
| 20 | 0.069999895989894867 | 73.3% | 0.069999903440475464 | 9.69e-8 | 0.04156 |
| 21 | 0.069999895989894867 | 83.3% | 0.069999903440475464 | 9.69e-8 | 0.03673 |
| 22 | 0.069999903440475464 | 68.3% | 0.069999903440475464 | 9.69e-8 | 0.03601 |
| 23 | 0.069999903440475464 | 65.0% | 0.069999903440475464 | 9.69e-8 | 0.04248 |
| 24 | 0.069999895989894867 | 86.7% | 0.069999903440475464 | 9.69e-8 | 0.03061 |
| 25 | 0.069999895989894867 | 86.7% | 0.069999903440475464 | 9.69e-8 | 0.03985 |
| 26 | 0.069999895989894867 | 81.7% | 0.069999903440475464 | 9.69e-8 | 0.04440 |
| 27 | 0.069999895989894867 | 70.0% | 0.069999895989894867 | 1.04e-7 | 0.04072 |
| 28 | 0.069999895989894867 | 90.0% | 0.069999903440475464 | 9.69e-8 | 0.03092 |
| 29 | 0.069999895989894867 | 93.3% | 0.069999903440475464 | 9.69e-8 | 0.03203 |
| 30 | 0.069999895989894867 | 90.0% | 0.069999903440475464 | 9.69e-8 | 0.04052 |
| 31 | 0.069999895989894867 | 100.0% | 0.069999895989894867 | 1.04e-7 | 0.04070 |
| 32 | 0.069999895989894867 | 80.0% | 0.069999895989894867 | 1.04e-7 | 0.04265 |
| 33 | 0.069999888539314270 | 65.0% | 0.069999895989894867 | 1.04e-7 | 0.04259 |
| 34 | 0.069999895989894867 | 85.0% | 0.069999895989894867 | 1.04e-7 | 0.05350 |
| 35 | 0.069999895989894867 | 86.7% | 0.069999895989894867 | 1.04e-7 | 0.03046 |
| 36 | 0.069999895989894867 | 85.0% | 0.069999903440475464 | 9.69e-8 | 0.04400 |
| 37 | 0.069999888539314270 | 73.3% | 0.069999895989894867 | 1.04e-7 | 0.03812 |
| 38 | 0.069999895989894867 | 88.3% | 0.069999895989894867 | 1.04e-7 | 0.03362 |
| 39 | 0.069999888539314270 | 91.7% | 0.069999895989894867 | 1.04e-7 | 0.03722 |
| 40 | 0.069999888539314270 | 85.0% | 0.069999895989894867 | 1.04e-7 | 0.03892 |
| 41 | 0.069999888539314270 | 88.3% | 0.069999895989894867 | 1.04e-7 | 0.08391 |
| 42 | 0.069999888539314270 | 90.0% | 0.069999895989894867 | 1.04e-7 | 0.02965 |
| 43 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 1.12e-7 | 0.04648 |
| 44 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 1.12e-7 | 0.05250 |
| 45 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 1.12e-7 | 0.03884 |
| 46 | 0.069999888539314270 | 90.0% | 0.069999895989894867 | 1.04e-7 | 0.04091 |
| 47 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 1.12e-7 | 0.03600 |
| 48 | 0.069999888539314270 | 96.7% | 0.069999895989894867 | 1.04e-7 | 0.04489 |
| 49 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 1.12e-7 | 0.03428 |
| 50 | 0.069999888539314270 | 100.0% | 0.069999888539314270 | 1.12e-7 | 0.04689 |

All 50 are Factory New in every insertion order: true. Highest landing 0.069999910891056061, lowest 0.069999888539314270.
Mean input float 0.04016, lowest adjusted float used 0.02176.

Comparison, with an invented input price (lower float costs more): a casual batch that aims every contract at 0.061 instead.

| | max float | casual at 0.061 |
|---|---|---|
| mean landing | 0.070000 | 0.061000 |
| input value per contract (invented) | 174.09 | 183.58 |
| input value over 50 contracts (invented) | 8704 | 9179 |
| inputs under adjusted 0.02 still unused | 145 | 126 |
| further Factory New contracts the leftovers fund | 125 | 125 |

Saving: 475 (5.2%) in invented units. Both methods leave room for the same number of further contracts on this pool; the difference is which inputs are left.

## 2. Fillers with their own range, both fill strategies

Settings: exactly 3 inputs from R8 Revolver | Fade (adjusted 0.05 to 0.2), the rest fillers (adjusted 0.02 to 0.06), same cap as above.

Strategy bal (0.7 ms): mean adjusted 0.069998, landings 0.069997712969779968 at 100.0%.

| group | input | float | adjusted |
|---|---|---|---|
| filler | Sawed-Off | The Kraken | 0.00870521646 | 0.021763 |
| filler | Sawed-Off | The Kraken | 0.00874235854 | 0.021856 |
| collection | R8 Revolver | Fade | 0.0406292863 | 0.101573 |
| collection | R8 Revolver | Fade | 0.0408908129 | 0.102227 |
| collection | R8 Revolver | Fade | 0.0410277545 | 0.102569 |

Strategy offset (0.6 ms): mean adjusted 0.069986, landings 0.069986104965209961 at 80.0%, 0.069986112415790558 at 20.0%.

| group | input | float | adjusted |
|---|---|---|---|
| filler | CZ75-Auto | Victoria | 0.0151436878 | 0.020192 |
| filler | Sawed-Off | The Kraken | 0.00829971023 | 0.020749 |
| collection | R8 Revolver | Fade | 0.0406292863 | 0.101573 |
| collection | R8 Revolver | Fade | 0.0419388339 | 0.104847 |
| collection | R8 Revolver | Fade | 0.0410277545 | 0.102569 |

## 3. Exact float32 targets

Each row is one Step-Solve run: five inputs chosen so that some insertion order stores exactly the target.

### 0.069696970283985138 (0.0696969 run of 69s)

Tier A, score 52, 1 float32 step wide. 628 candidate inputs, 2253823 search nodes, 5072 subsets order-checked, 474.8 ms.
Share of the 120 insertion orders that land on it: 100.0%. Verdict: ROBUST.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | R8 Revolver | Fade | 0.0383107029 | 0.095777 |
| 2 | R8 Revolver | Fade | 0.0377144776 | 0.094286 |
| 3 | R8 Revolver | Fade | 0.0350812413 | 0.087703 |
| 4 | Sawed-Off | The Kraken | 0.0162533373 | 0.040633 |
| 5 | CZ75-Auto | Victoria | 0.0225640759 | 0.030085 |

### 0.069696970283985138 (0.0696969 fragile)

Tier A, score 52, 1 float32 step wide. 628 candidate inputs, 6855 search nodes, 12 subsets order-checked, 3.3 ms.
Share of the 120 insertion orders that land on it: 65.0%. Verdict: FRAGILE.
Other orders produce: 0.069696977734565735 (20.0%), 0.069696962833404541 (15.0%).

| click | input | float | adjusted |
|---|---|---|---|
| 1 | Sawed-Off | The Kraken | 0.0441115871 | 0.110279 |
| 2 | R8 Revolver | Fade | 0.0390972681 | 0.097743 |
| 3 | R8 Revolver | Fade | 0.0321154557 | 0.080289 |
| 4 | CZ75-Auto | Victoria | 0.0225664787 | 0.030089 |
| 5 | CZ75-Auto | Victoria | 0.0225640759 | 0.030085 |

### 0.0088888881728053093 (seven 8s)

Tier S, score 216, 1 float32 step wide. 197 candidate inputs, 23297 search nodes, 7 subsets order-checked, 5.8 ms.
Share of the 120 insertion orders that land on it: 100.0%. Verdict: ROBUST.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | CZ75-Auto | Victoria | 0.0224066563 | 0.029876 |
| 2 | Sawed-Off | The Kraken | 0.00368575496 | 0.009214 |
| 3 | SSG 08 | Blood in the Water | 0.0607218705 | 0.005156 |
| 4 | SSG 08 | Blood in the Water | 0.0600258633 | 0.000185 |
| 5 | AWP | Asiimov | 0.180011109 | 0.000014 |

### 0.088888801634311676 (S 8-rep depth 1)

Tier S, score 130, 1 float32 step wide. 445 candidate inputs, 15704 search nodes, 7 subsets order-checked, 4.8 ms.
Share of the 120 insertion orders that land on it: 36.7%. Verdict: FRAGILE.
Other orders produce: 0.088888809084892273 (63.3%).

| click | input | float | adjusted |
|---|---|---|---|
| 1 | SSG 08 | Blood in the Water | 0.0799966753 | 0.142833 |
| 2 | Sawed-Off | The Kraken | 0.0384578332 | 0.096145 |
| 3 | Sawed-Off | The Kraken | 0.0236015730 | 0.059004 |
| 4 | R8 Revolver | Fade | 0.0349981487 | 0.087495 |
| 5 | R8 Revolver | Fade | 0.0235866979 | 0.058967 |

### 0.066666603088378906 (S 6-rep depth 1)

Tier S, score 130, 1 float32 step wide. 592 candidate inputs, 11487 search nodes, 14 subsets order-checked, 5.2 ms.
Share of the 120 insertion orders that land on it: 88.3%. Verdict: OK.
Other orders produce: 0.066666595637798309 (11.7%).

| click | input | float | adjusted |
|---|---|---|---|
| 1 | R8 Revolver | Fade | 0.0461775176 | 0.115444 |
| 2 | R8 Revolver | Fade | 0.0373175554 | 0.093294 |
| 3 | CZ75-Auto | Victoria | 0.0382672139 | 0.051023 |
| 4 | P2000 | Fire Elemental | 0.0220818818 | 0.036803 |
| 5 | Sawed-Off | The Kraken | 0.0147076948 | 0.036769 |

### 0.00099999899975955486 (S 9-rep depth 3)

Tier S, score 70, 9 float32 steps wide. 423 candidate inputs, 24197 search nodes, 2 subsets order-checked, 1.6 ms.
Share of the 120 insertion orders that land on it: 100.0%. Verdict: ROBUST.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | R8 Revolver | Fade | 0.000882067427 | 0.002205 |
| 2 | R8 Revolver | Fade | 0.000791767903 | 0.001979 |
| 3 | R8 Revolver | Fade | 0.000199583694 | 0.000499 |
| 4 | R8 Revolver | Fade | 0.0000902347456 | 0.000226 |
| 5 | AWP | Asiimov | 0.180074513 | 0.000091 |

## 4. #1 Hunter, maximin pick

Bar: 0.002. The maximin set lands 0.0019828516524285078 at 100.0% (2.9 ms).
Its lowest input is adjusted 0.001675; 40 lower inputs stay unused. The five lowest inputs in the pool, which a lowest-first pick would burn, run from 0.000014 to 0.000163.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | Sawed-Off | The Kraken | 0.000669991248 | 0.001675 |
| 2 | R8 Revolver | Fade | 0.000882067427 | 0.002205 |
| 3 | R8 Revolver | Fade | 0.000763757154 | 0.001909 |
| 4 | R8 Revolver | Fade | 0.000791767903 | 0.001979 |
| 5 | R8 Revolver | Fade | 0.000858119689 | 0.002145 |

## 5. Float Lab search

Pool CS:GO Weapon Case 3, 328 inputs, no target given. Found 1432 patterned landings, order-verified the top 300, dropped 0 as unreachable, 1132 beyond the display cap. 110 ms.

| float | tier | pattern | score | share of orders | output range |
|---|---|---|---|---|---|
| 0.00438266666606 | S | 6x 6 | 153 | 100.0% | 0 to 0.08 |
| 0.0597886666656 | S | 6x 6 | 130 | 100.0% | 0 to 1 |
| 0.0666666179895 | S | 6x 6 | 130 | 100.0% | 0 to 1 |
| 0.00506666628644 | A | 5x 6 | 123 | 25.0% | 0 to 0.08 |
| 0.00395888881758 | A | 5x 8 | 123 | 86.7% | 0 to 0.08 |

## 6. Over mode: the lowest Minimal Wear

The same core on negated values. Landings 0.070000097155570984 Minimal Wear at 63.3%, 0.070000104606151581 Minimal Wear at 36.7%.

| click | input | float | adjusted |
|---|---|---|---|
| 1 | AK-47 | Jaguar | 0.237116426 | 0.237116 |
| 2 | Sawed-Off | The Kraken | 0.0225095358 | 0.056274 |
| 3 | P2000 | Fire Elemental | 0.0315790325 | 0.052632 |
| 4 | R8 Revolver | Fade | 0.00158599939 | 0.003965 |
| 5 | AWP | Asiimov | 0.180011109 | 0.000014 |

## What these runs could not do

- 0.00066666601924225688 (S 6-rep depth 3): no order of any five of the 422 candidate inputs lands on it.
- 0.00088888802565634251 (S 8-rep depth 3): no order of any five of the 422 candidate inputs lands on it.
- 0.00066666002385318279 (S 6-rep depth 3): no order of any five of the 422 candidate inputs lands on it.
- 0.000066666601924225688 (S 6-rep depth 4): no order of any five of the 415 candidate inputs lands on it.
- 0.000088888802565634251 (S 8-rep depth 4): no order of any five of the 416 candidate inputs lands on it.
- 0.0000088888000391307287 (S 8-rep depth 5): no order of any five of the 415 candidate inputs lands on it.
- 0.0000066665998019743711 (S 6-rep depth 5): no order of any five of the 415 candidate inputs lands on it.
- Glitch scan: no contract in this pool reaches the 0.38 glitched float. The pool is almost entirely low floats and a 0.06 to 0.80 knife needs a mean adjusted float of 0.4324.
- Chained crafts, ten-input contracts and StatTrak were not run on real items: this extract holds non-StatTrak coverts only. They are tested on synthetic pools.
