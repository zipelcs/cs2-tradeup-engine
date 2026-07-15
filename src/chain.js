// Chained two-stage crafts: make the missing fifth covert first.
//
// Stage 1 crafts ten Classifieds of one collection into a Covert. Stage 2 uses that Covert as the
// fifth input of a five-covert contract aimed at one exact float on a knife or glove. The covert that
// stage 1 produces is random, so the plan is a decision table: for every covert that could drop, its
// float, whether the target is still reachable, and the click order to use.
//
// Limits, stated plainly: it takes the first feasible set of four coverts instead of searching over
// them, aims in float64 before verifying in float32, and returns one plan.
//
// One change from the original: the original took the first ten Classifieds inside the sum window and
// only then checked the branches, so a plan depended on that first set happening to land. Here the
// branch check is the accept test of the search, under the same node budget.

import { fr } from './f32.js';
import { remap } from './remap.js';
import { adjust } from './tradeup.js';
import { landingDistribution } from './orders.js';
import { stepSolve } from './solver.js';
import { byName, isGold, collSkins } from './catalogue.js';

/**
 * @param {object} target       catalogue entry of the knife or glove
 * @param {number} targetFloat
 * @param {object[]} items      owned items { id, name, float, adj }
 * @param {object[]} catalogue
 * @param {{budgetMs?:number, capFour?:number, capTen?:number}} [opts]
 * @returns {null | {crate, coll, target, four, ten, tenOrder, tenShare, branches, covered}}
 */
export function planChain(target, targetFloat, items, catalogue, opts = {}) {
  if (!(target.max > target.min) || targetFloat < target.min || targetFloat > target.max) return null;
  const t = fr(targetFloat);
  const mStar = (t - target.min) / (target.max - target.min); // mean the final five must produce
  const idx = byName(catalogue), t0 = Date.now(), budget = opts.budgetMs || 9000;
  for (const crate of target.crates || []) {
    const covs = items.filter(it => {
      const d = idx.get(it.name);
      return it.adj != null && d && d.rarity === 'Covert' && !isGold(d) && (d.crates || []).includes(crate);
    });
    if (covs.length < 4) continue;
    const colls = new Set(covs.flatMap(c => idx.get(c.name).collections || []));
    for (const cl of colls) {
      if (Date.now() - t0 > budget) return null;
      const branchCoverts = collSkins(catalogue, cl, 'Covert').filter(s => s.max > s.min);
      if (!branchCoverts.length) continue;
      const pinks = items.filter(it => {
        const d = idx.get(it.name);
        return it.adj != null && d && d.rarity === 'Classified' && (d.collections || []).includes(cl);
      });
      if (pinks.length < 10) continue;
      // the window of means the Classified contract can reach
      const pAdj = pinks.map(p => p.adj).sort((a, b) => a - b);
      const pMin = pAdj.slice(0, 10).reduce((a, b) => a + b, 0) / 10, pMax = pAdj.slice(-10).reduce((a, b) => a + b, 0) / 10;
      // four coverts whose sum leaves a fifth input inside that window
      const four = stepSolve(covs, 4, 5 * mStar - 4e-7 - pMax, 5 * mStar + 4e-7 - pMin, 0, 1, () => true, opts.capFour || 4e5);
      if (!four || !four.items) continue;
      const sel4 = four.items, sum4 = sel4.reduce((a, c) => a + c.adj, 0);
      const want = 5 * mStar - sum4; // adjusted float the fifth covert needs (float64 aim)
      // what each possible covert drop does to the final contract, for one stage 1 landing
      const branchesFor = mean32 => branchCoverts.map(B => {
        const raw = remap(mean32, 0, 1, fr(B.min), fr(B.max)); // on a 0-1 output the landing is the mean
        const adj5 = adjust(raw, B.min, B.max);
        const L = landingDistribution(sel4.map(c => fr(c.adj)).concat([adj5]), target.min, target.max);
        const hit = L.find(l => Object.is(l.float, t));
        const near = L.reduce((x, l) => (Math.abs(l.float - t) < Math.abs(x.float - t) ? l : x), L[0]);
        return { skin: B.name, float: raw, ok: !!hit, order: hit ? hit.order : null, share: hit ? hit.share : 0, nearest: near.float };
      });
      // ten Classifieds whose mean is the fifth float, accepted only when some drop finishes the craft
      const ten = stepSolve(pinks, 10, (want - 3e-7) * 10, (want + 3e-7) * 10, 0, 1, f => branchesFor(f).some(x => x.ok), opts.capTen || 1.2e6);
      if (!ten || !ten.items) continue;
      const tenSel = ten.items;
      // every distinct landing of that Classified contract, scored by how many branches still finish
      let best = null;
      for (const pl of landingDistribution(tenSel.map(p => fr(p.adj)), 0, 1)) {
        const branches = branchesFor(pl.float);
        const covered = branches.filter(x => x.ok).length;
        if (!best || covered > best.covered) best = { pl, branches, covered };
      }
      if (!best || !best.covered) continue;
      return {
        crate, coll: cl, target: t, four: sel4, ten: tenSel,
        tenOrder: best.pl.order.map(i => tenSel[i]), tenShare: best.pl.share,
        branches: best.branches, covered: best.covered,
      };
    }
  }
  return null;
}
