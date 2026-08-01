// Doppler phase from the Steam icon.
//
// Steam's inventory payload names a Doppler or Gamma Doppler knife without its phase ("★ Karambit |
// Doppler (Factory New)"), but each phase has its own artwork, and so its own icon hash. The icon is
// therefore a fingerprint: a table from icon hash to phase resolves the phase with no extra request.
//
// The method:
//   1. Normalise the icon URL to its last path segment, without a query string.
//   2. Steam serves two artwork hashes per item (icon_url and icon_url_large) and a reference table
//      may be keyed on either, so try both.
//   3. Tolerate one side carrying a size suffix: fall back to a containment match.
//   4. If the table has nothing, read Steam's own description or tag text when it states the phase
//      outright, and remember that icon for next time.
//   5. Otherwise report the miss with the hash, so it can be diagnosed. Never guess.
//
// No phase table is bundled. A public one is timche/cs-doppler-phase (MIT); build your table from it
// (and from any second source you trust) with mergeTables(), which refuses silent conflicts.

export const PHASES = ['p1', 'p2', 'p3', 'p4', 'ruby', 'sapphire', 'blackpearl', 'emerald'];

const DESC_HINTS = [
  [/emerald/i, 'emerald'], [/ruby/i, 'ruby'], [/sapphire/i, 'sapphire'], [/black[\s_-]?pearl/i, 'blackpearl'],
  [/phase[\s_-]?1\b/i, 'p1'], [/phase[\s_-]?2\b/i, 'p2'], [/phase[\s_-]?3\b/i, 'p3'], [/phase[\s_-]?4\b/i, 'p4'],
];

/** True for item names whose phase is not in the name: Doppler and Gamma Doppler with only a wear. */
export function needsPhase(name) {
  return /\| (Gamma )?Doppler \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)/.test(String(name || ''));
}

/** Last path segment of an icon URL or hash, without a query string. */
export function iconKey(x) {
  return String(x || '').split('/').pop().split('?')[0];
}

/**
 * Merge icon -> phase tables. Later tables add entries; a key that two tables map to different phases
 * is reported in `conflicts` and left out, never silently overwritten.
 */
export function mergeTables(...tables) {
  const out = {}, conflicts = [];
  const bad = new Set();
  for (const t of tables) {
    for (const [k0, v] of Object.entries(t || {})) {
      const k = iconKey(k0);
      if (!PHASES.includes(v)) throw new Error(`unknown phase "${v}" for ${k}`);
      if (bad.has(k)) continue;
      if (k in out && out[k] !== v) { conflicts.push({ icon: k, a: out[k], b: v }); delete out[k]; bad.add(k); continue; }
      out[k] = v;
    }
  }
  return { table: out, conflicts };
}

/**
 * Resolve the phase of one inventory row.
 * @param {{name:string, icon?:string, iconLarge?:string, desc?:string}} row
 * @param {Record<string,string>} table   icon hash -> phase
 * @param {(icon:string, phase:string)=>void} [learn]  called when the phase came from the description
 * @returns {{phase:string|null, via:'icon'|'icon-partial'|'description'|'none'|'not-needed', miss?:string}}
 */
export function resolvePhase(row, table, learn) {
  if (!needsPhase(row.name)) return { phase: null, via: 'not-needed' };
  const cands = [row.icon, row.iconLarge].map(iconKey).filter(Boolean);
  for (const c of cands) if (table[c]) return { phase: table[c], via: 'icon' };
  const keys = Object.keys(table);
  for (const c of cands) {
    const hit = keys.find(k => k.includes(c) || c.includes(k));
    if (hit) return { phase: table[hit], via: 'icon-partial' };
  }
  const hay = (row.desc || '') + ' ' + (row.name || '');
  for (const [re, phase] of DESC_HINTS) {
    if (re.test(hay)) {
      if (learn && cands[0]) learn(cands[0], phase);
      return { phase, via: 'description' };
    }
  }
  return { phase: null, via: 'none', miss: (cands[0] || '').slice(0, 18) };
}
