import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the usage example in the README runs and prints what it describes', () => {
  const code = readme.match(/```js\n([\s\S]*?)```/)[1];
  assert.equal(code.split('\n').filter(l => l.trim()).length, 10, 'ten lines of code');
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/);
  assert.match(out[0], /^0\.\d{17,} Minimal Wear$/);
  const counts = out.slice(1).map(l => +l.match(/ (\d+) of 120 orders click [1-5]( [1-5]){4}$/)[1]);
  assert.equal(counts.reduce((a, b) => a + b, 0), 120);
});

test('the README keeps its opening line, its History section and its pointers', () => {
  const lines = readme.split('\n');
  assert.equal(lines[2], 'OPENING: Oliver writes this.');
  assert.equal(lines[4], '## History');
  assert.ok(readme.includes('docs/pricing.md') && readme.includes('docs/float-model.md'));
});

test('every percentage in the notes is printed by bench/accuracy.js', () => {
  const bench = execFileSync(process.execPath, ['bench/accuracy.js'], { cwd: root, encoding: 'utf8' });
  const printed = new Set(bench.match(/\d+(\.\d+)?%/g));
  const docs = ['README.md', 'docs/float-model.md', 'docs/insertion-order.md', 'docs/max-float-solver.md', 'docs/exact-targets.md',
    'docs/float-lab.md', 'docs/hunter-and-chains.md', 'docs/pricing.md', 'docs/parsers.md', 'docs/testing.md'];
  for (const d of docs) {
    const text = readFileSync(new URL('../' + d, import.meta.url), 'utf8');
    for (const p of text.match(/\d+(\.\d+)?%/g) || []) {
      if (p === '75%') continue; // the FRAGILE threshold, a constant in src/robustness.js
      assert.ok(printed.has(p), `${d} quotes ${p}, which the bench does not print`);
    }
  }
});
