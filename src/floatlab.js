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
    const d = flDesire(fv, { max: g.max });
    return d ? { tier: d.tier, label: d.label, score: 0 } : null;
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
