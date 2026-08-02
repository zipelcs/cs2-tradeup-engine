// Float Lab, second stage: a rare-float solver.
//
// It takes no target. It ranks what a pool can craft by what actually sells: long runs of one digit,
// 6s and 8s first, the full 133742069, a repeated meme, a few named floats and the two glitched
// floats. The tier encodes sellability. From the second build on, an arithmetic score ranks within
// a tier.

import { fr, bits, fromBits } from './f32.js';
import { landingFromAdjusted } from './tradeup.js';
import { closestSum } from './custom.js';
import { verifyHit } from './solver.js';

const GLITCH_38 = fr(0.38), GLITCH_45 = fr(0.45), F007 = fr(0.07);

/** Decimals of a float: leading zeros, the significant digits after them, and the whole string. */
export function flSig(fv, dp = 12) {
  const s = (+fv).toFixed(dp).replace(/^0\./, '').replace(/0+$/, '');
  let lead = 0;
  while (lead < s.length && s[lead] === '0') lead++;
  return { lead, sig: s.slice(lead), all: s };
}

/** Longest run of one digit anywhere in the digits. */
export function flDigitRun(sig) {
  if (!sig) return { d: '', n: 0, at: 0 };
  let best = { d: sig[0], n: 1, at: 0 }, cur = 1;
  for (let i = 1; i <= sig.length; i++) {
    if (i < sig.length && sig[i] === sig[i - 1]) cur++;
    else { if (cur > best.n) best = { d: sig[i - 1], n: cur, at: i - cur }; cur = 1; }
  }
  return best;
}

/** Only a repeated meme counts, never a blend of several. */
export function flMemeRepeat(sig) {
  if (sig.indexOf('133742069') === 0) return { m: '133742069', reps: 1, exact: true };
  let out = null;
  for (const [m, min] of [['1337', 2], ['420', 2], ['69', 3]]) {
    let reps = 0, i = 0;
    while (sig.slice(i, i + m.length) === m) { reps++; i += m.length; }
    if (reps >= min && (!out || reps * m.length > out.reps * out.m.length)) out = { m, reps, exact: false };
  }
  return out;
}

function flSeq(s) {
  if (s.length < 6) return null;
  let up = true, dn = true;
  for (let i = 1; i < s.length; i++) {
    if (+s[i] !== (+s[i - 1] + 1) % 10) up = false;
    if (+s[i] !== (+s[i - 1] + 9) % 10) dn = false;
  }
  return up ? 'ascending' : dn ? 'descending' : null;
}

function flAlternating(s) {
  if (s.length < 6 || s[0] === s[1]) return false;
  for (let i = 0; i < s.length; i++) if (s[i] !== (i % 2 ? s[1] : s[0])) return false;
  return true;
}

export const FL_ORDER = ['D', 'C', 'B', 'A', 'S'];
const bump = (t, by) => FL_ORDER[Math.min(FL_ORDER.length - 1, Math.max(0, FL_ORDER.indexOf(t) + by))];
export const tierRank = t => FL_ORDER.indexOf(t) + 1;

/** Run length is the ranking. 6s and 8s get one tier more because they sell fastest. */
export function flTierForRun(n, digit) {
  let t = n >= 8 ? 'S' : n >= 6 ? 'A' : n >= 5 ? 'B' : n >= 4 ? 'C' : n >= 3 ? 'D' : null;
  if (t && (digit === '6' || digit === '8')) t = bump(t, 1);
  return t;
}

/**
 * The sellability tier of a float, or null when it is not special.
 * @param {number} fv
 * @param {{max?:number}} [ctx]  the output skin's cap, which decides whether 0.07 matters
 */
export function flDesire(fv, ctx = {}) {
  fv = +fv;
  if (!Number.isFinite(fv) || fv <= 0) return null;
  const { sig, lead } = flSig(fv, 12);
  const run = flDigitRun(sig), meme = flMemeRepeat(sig);
  const T = (tier, label, extra) => ({ tier, label, fv, run, ...extra });
  if (Object.is(fv, GLITCH_38)) return T('B', 'glitched float 0.38', { glitch: true });
  if (Object.is(fv, GLITCH_45)) return T('B', 'glitched float 0.45', { glitch: true });
  if (sig.indexOf('9112001') === 0 && lead === 1) return T('A', '0.09112001');
  if (Object.is(fv, F007)) {
    // only a prize on a skin that cannot be Factory New; elsewhere a plain Factory New sells for more
    return ctx.max != null && ctx.max <= 0.09 ? T('A', '0.0700000002 on a capped skin') : T('D', '0.0700000002');
  }
  if (meme && meme.exact) return T('S', '133742069', { meme });
  if (meme) return T(lead >= 2 ? 'S' : 'A', meme.m + ' x' + meme.reps, { meme });
  let rt = flTierForRun(run.n, run.d);
  if (rt) {
    if (lead >= 3 && run.n >= 4) rt = bump(rt, 1);
    return T(rt, run.n + 'x ' + run.d, { runLen: run.n, runDigit: run.d });
  }
  const sq = flSeq(sig);
  if (sq) return T('D', sq);
  if (flAlternating(sig)) return T('D', 'alternating ' + sig.slice(0, 2));
  if (Object.is(fv, fr(0.25)) || Object.is(fv, fr(0.5)) || Object.is(fv, fr(0.75))) return T('D', 'exact ' + fv);
  return null;
}

// ---- the arithmetic behind the tier -------------------------------------------------------------
//
//   score = patternWeight x depthGain(leading zeros) x coverage / sqrt(difficulty)
//
// The score does not replace the tier. Difficulty is not sellability: a one-step-wide 1337 is harder
// to hit than a forty-step-wide run of 8s and still sells slower. Tier sorts first.

export const FL_TEMPLATES = [
  { t: '888888', w: 100, d: '8-rep' }, { t: '666666', w: 100, d: '6-rep' },
  { t: '88888', w: 92, d: '8-rep' }, { t: '66666', w: 92, d: '6-rep' },
  { t: '8888', w: 80, d: '8-rep' }, { t: '6666', w: 80, d: '6-rep' },
  { t: '133742069', w: 95, d: '1337-420-69' }, { t: '1337420', w: 82, d: '1337-420' }, { t: '42069', w: 72, d: '420-69' },
  { t: '1337', w: 64, d: '1337' }, { t: '69420', w: 70, d: '69-420' }, { t: '9112001', w: 78, d: '9/11' },
  { t: '777777', w: 70, d: '7-rep' }, { t: '999999', w: 66, d: '9-rep' }, { t: '111111', w: 60, d: '1-rep' },
  { t: '123456789', w: 52, d: 'ascending' }, { t: '987654321', w: 52, d: 'descending' },
];
export const FL_MAX_DEPTH = 5;
export const FL_COVERAGE_FLOOR = 0.6;

/** Share of the shown decimals explained by the pattern or by leading zeros. */
export function flCoverage(fv, template, depth, dp = 10) {
  const s = (+fv).toFixed(dp).replace(/^0\./, '');
  if (!s.length) return 0;
  return (Math.min(depth, s.length) + Math.min(template.length, Math.max(0, s.length - depth))) / s.length;
}

/**
 * How many float32 steps render the same leading decimals, found by walking the ladder both ways.
 * 1 means only one float in the game shows this string.
 */
export function flDifficulty(fv, dp = 9) {
  const key = (+fv).toFixed(dp), c = bits(fr(fv));
  let n = 1;
  for (let k = 1; k <= 60; k++) { if (fromBits(c + k).toFixed(dp) !== key) break; n++; }
  for (let k = 1; k <= 60; k++) { if (fromBits(c - k).toFixed(dp) !== key) break; n++; }
  return n;
}

export const flDepthGain = d => 1 + d * 0.85;

/**
 * The score with every term exposed. `coincidence` is true below the coverage floor: a pattern
 * buried in an otherwise random float is not a rare float, and such a result is dropped.
 */
export function flScore(fv, ctx = {}) {
  const d = flDesire(fv, ctx);
  if (!d) return null;
  const o = flSig(fv, 12);
  const tpl = FL_TEMPLATES.find(t => o.sig.indexOf(t.t) === 0) || FL_TEMPLATES.find(t => o.sig.indexOf(t.t) > -1) || { t: o.sig.slice(0, 6), w: 40, d: 'pattern' };
  const coverage = flCoverage(fv, tpl.t, o.lead), difficulty = flDifficulty(fv);
  return {
    tier: d.tier, label: d.label, depth: o.lead, coverage, difficulty, template: tpl.d, weight: tpl.w,
    score: Math.round(tpl.w * flDepthGain(o.lead) * coverage / Math.sqrt(difficulty)),
    coincidence: coverage < FL_COVERAGE_FLOOR,
  };
}

/**
 * Enumerated targets: every template at depth 0 to 5, kept only when it is a real float32 step that
 * the output range can hold and that clears the coverage floor. The two glitched floats sit outside
 * the grid as fixed values. Sorted by tier, then score.
 */
export function flGrid(fvMin, fvMax) {
  const out = [], seen = new Set();
  for (const tpl of FL_TEMPLATES) {
    for (let d = 0; d <= FL_MAX_DEPTH; d++) {
      const v = fr(+('0.' + ('0'.repeat(d) + tpl.t).slice(0, 10)));
      if (!(v > 0) || v < fvMin - 1e-12 || v > fvMax + 1e-12 || seen.has(v)) continue;
      const sc = flScore(v, { max: fvMax });
      if (!sc || sc.coincidence) continue;
      seen.add(v);
      out.push({ fv: v, template: tpl.d, depth: d, score: sc.score, tier: sc.tier, difficulty: sc.difficulty, coverage: sc.coverage, label: sc.label });
    }
  }
  for (const g of [GLITCH_38, GLITCH_45]) {
    if (g >= fvMin && g <= fvMax) out.push({ fv: g, template: 'glitched float', depth: null, score: 500, tier: 'S', difficulty: 1, coverage: 1, label: 'glitched float', glitch: true });
  }
  return out.sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || b.score - a.score);
}

/**
 * Targets the seven categories allow inside an output range: single-digit runs 4 to 10 long at up to
 * 4 leading zeros, repeated two-digit pairs, the full 133742069, repeated memes, 0.09112001 and the
 * two glitched floats. Each must be a float32 step the range can hold.
 */
export function flCatalogue(fvMin, fvMax) {
  const out = [], seen = new Set();
  const push = (v, label) => {
    v = fr(v);
    if (!(v > 0) || v < fvMin - 1e-12 || v > fvMax + 1e-12 || seen.has(v)) return;
    seen.add(v); out.push({ value: v, label });
  };
  for (const d of '123456789') for (let len = 4; len <= 10; len++) for (let lead = 0; lead <= 4; lead++) push(+('0.' + '0'.repeat(lead) + d.repeat(len)), len + 'x ' + d);
  for (const p of ['12', '13', '21', '69', '37', '24', '36', '48', '16', '18']) for (let r = 3; r <= 5; r++) for (let lead = 0; lead <= 3; lead++) push(+('0.' + '0'.repeat(lead) + p.repeat(r)), p + ' x' + r);
  for (let lead = 0; lead <= 4; lead++) {
    const z = '0.' + '0'.repeat(lead);
    push(+(z + '133742069'), '133742069'); push(+(z + '420420420'), '420 x3');
    push(+(z + '696969696'), '69 x4'); push(+(z + '133713371'), '1337 x2');
  }
  push(0.09112001, '0.09112001');
  push(GLITCH_38, 'glitched 0.38'); push(GLITCH_45, 'glitched 0.45');
  return out;
}

const FAST = /(\d)\1{3}|(\d{2})\2{2}|133742069|420420|696969|13371337|9112001|123456789|987654321/;

/**
 * Search one pool for rare floats. Two generators, then verification:
 *   targeted  aim the closest-sum solver at each catalogue value
 *   forward   sliding windows over the sorted inputs, and random n-subsets from a seeded LCG
 * Every hit is then checked against the exact landing set. A value no insertion order reaches is
 * moved onto a reachable landing that still carries a pattern, or dropped. The counts of what was
 * found, verified and dropped come back with the hits. Sampling, not exhaustive.
 * @param {{need:number, label:string, inputs:object[], outs:object[]}} P  a pool from custom.buildPools
 * @param {{trials?:number, limit?:number}} [opts]
 */
export function flSearch(P, opts = {}) {
  const n = P.need, A = P.inputs, M = A.length, results = [];
  if (M < n) return { hits: [], stats: { found: 0, verified: 0, dropped: 0, capped: 0 } };
  const groups = {};
  for (const o of P.outs) {
    if (!(o.max > o.min)) continue;
    const k = o.min + '|' + o.max;
    (groups[k] = groups[k] || { min: o.min, max: o.max, outs: [] }).outs.push(o.name);
  }
  const G = Object.values(groups);
  const rank = (fv, g) => {
    const s = flScore(fv, { max: g.max });
    return s && !s.coincidence ? { tier: s.tier, label: s.label, score: s.score, detail: s } : null;
  };
  const record = (sel, g, fast) => {
    const got = landingFromAdjusted(sel.map(x => x.adj), g.min, g.max);
    if (fast && !FAST.test(got.toFixed(11).slice(2))) return;
    const r = rank(got, g);
    if (r) results.push({ float: got, ...r, outs: g.outs, lo: g.min, hi: g.max, items: sel.slice() });
  };
  for (const g of G) {
    for (const c of flCatalogue(g.min, g.max)) {
      const sol = closestSum(A, n, ((c.value - g.min) / (g.max - g.min)) * n);
      if (sol) record(sol.sel, g, false);
    }
  }
  const sorted = A.slice().sort((a, b) => a.adj - b.adj);
  for (let i = 0; i + n <= sorted.length; i++) for (const g of G) record(sorted.slice(i, i + n), g, true);
  let seed = ((P.label.length * 131 + n) >>> 0) || 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const per = Math.min(opts.trials || 120000, 40000 + M * 120);
  const idx = A.map((_, i) => i);
  for (let t = 0; t < per; t++) {
    const sel = [];
    for (let k = 0; k < n; k++) {
      const sw = k + ((rnd() * (M - k)) | 0);
      const tmp = idx[k]; idx[k] = idx[sw]; idx[sw] = tmp;
      sel.push(A[idx[k]]);
    }
    for (const g of G) record(sel, g, true);
  }
  const best = new Map();
  for (const r of results) {
    const k = r.float.toFixed(8) + '|' + r.outs[0];
    const ex = best.get(k);
    if (!ex || tierRank(r.tier) > tierRank(ex.tier) || (r.tier === ex.tier && r.score > ex.score)) best.set(k, r);
  }
  const order = (a, b) => tierRank(b.tier) - tierRank(a.tier) || b.score - a.score;
  const found = [...best.values()].sort(order);
  const limit = opts.limit || 300, considered = found.slice(0, limit);
  const hits = [];
  for (const h of considered) {
    const v = verifyHit({ ids: h.items.map(x => x.id), float: h.float, lo: h.lo, hi: h.hi }, (id, i) => h.items[i].adj, L => {
      let pick = null;
      for (const l of L) { const r = rank(l.float, { max: h.hi }); if (r && (!pick || order(r, pick.r) < 0)) pick = { l, r }; }
      if (pick) Object.assign(h, pick.r);
      return pick && pick.l;
    });
    if (!v) continue;
    hits.push({ ...h, float: v.float, items: v.orderIndex.map(i => h.items[i]), share: v.share, landings: v.landings, rescued: v.rescued });
  }
  return { hits: hits.sort(order), stats: { found: found.length, verified: hits.length, dropped: considered.length - hits.length, capped: Math.max(0, found.length - limit) } };
}
