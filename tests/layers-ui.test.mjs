import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, rollAll } from '../src/toys/layers/roll.js';
import { summaryText, readUrl } from '../src/toys/layers/ui.js';

test('summary is one line with all three layers', () => {
  const t = summaryText(rollAll(makeRng('x')));
  assert.match(t, /^Outline: .* Mid: .* Fine: .*\.$/);
  assert.ok(!t.includes('\n'));
});

test('readUrl parses seed and ignores unknown themes', () => {
  assert.deepEqual(readUrl('?seed=abc&theme=space'), { seed: 'abc', theme: 'space' });
  assert.deepEqual(readUrl('?theme=nope'), { seed: '', theme: '' });
});
