import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePhase, mergeTables, needsPhase, iconKey } from '../src/index.js';

// invented hashes: the method is under test, not any real table
const T = { aaa111: 'p2', bbb222: 'ruby', ccc333: 'emerald' };
const row = (icon, extra = {}) => ({ name: '★ Karambit | Doppler (Factory New)', icon, ...extra });

test('only Doppler names without a phase need one', () => {
  assert.ok(needsPhase('★ Karambit | Doppler (Factory New)'));
  assert.ok(needsPhase('★ Flip Knife | Gamma Doppler (Minimal Wear)'));
  assert.ok(!needsPhase('★ Karambit | Fade (Factory New)'));
  assert.deepEqual(resolvePhase({ name: 'AK-47 | Redline (Field-Tested)', icon: 'aaa111' }, T), { phase: null, via: 'not-needed' });
});

test('icon URLs are normalised to their last segment', () => {
  assert.equal(iconKey('https://example.invalid/economy/image/aaa111?size=96'), 'aaa111');
  assert.deepEqual(resolvePhase(row('https://example.invalid/economy/image/aaa111'), T), { phase: 'p2', via: 'icon' });
});

test('either artwork hash can match, and a size suffix is tolerated', () => {
  assert.equal(resolvePhase(row('zzz', { iconLarge: 'bbb222' }), T).phase, 'ruby');
  assert.deepEqual(resolvePhase(row('ccc333_large'), T), { phase: 'emerald', via: 'icon-partial' });
});

test('falls back to the description, learns the icon, and reports a true miss', () => {
  const learned = [];
  const r = resolvePhase(row('new999', { desc: 'Phase 4' }), T, (k, p) => learned.push([k, p]));
  assert.deepEqual(r, { phase: 'p4', via: 'description' });
  assert.deepEqual(learned, [['new999', 'p4']]);
  assert.deepEqual(resolvePhase(row('unknown000'), T), { phase: null, via: 'none', miss: 'unknown000' });
});

test('merging two tables reports conflicts instead of overwriting', () => {
  const { table, conflicts } = mergeTables({ a1: 'p1', b2: 'p2' }, { b2: 'p3', c3: 'sapphire' });
  assert.deepEqual(table, { a1: 'p1', c3: 'sapphire' });
  assert.deepEqual(conflicts, [{ icon: 'b2', a: 'p2', b: 'p3' }]);
  assert.throws(() => mergeTables({ x: 'phase9' }));
});
