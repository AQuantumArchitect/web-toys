import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeLobber } from '../src/toys/trebuchet/physics.js';
import { DEFAULT_PARAMS } from '../src/toys/trebuchet/constants.js';
import { NOTICE, fromQuery, toQuery, marginText, summaryLine, fmt } from '../src/toys/trebuchet/ui.js';

test('notice says the important things in plain words, and the page renders it', () => {
  const text = Object.values(NOTICE).join(' ');
  for (const w of ['physics toy', 'rough estimates', 'Never launch a person', 'sandbag', 'real engineering review', '18-inch marble trebuchet'])
    assert.ok(text.includes(w), w);
  const page = readFileSync(new URL('../src/Lobber.jsx', import.meta.url), 'utf8');
  assert.ok(page.includes('{NOTICE.rules}') && page.includes('{NOTICE.origin}'));
  assert.ok(page.indexOf('Safety notice') < page.indexOf('data-testid="summary"'), 'notice comes before the summary');
});

test('URL state round-trips and survives garbage', () => {
  const params = { ...DEFAULT_PARAMS, counterWeight: 300, enableRelease: true, releaseAngle: 20 };
  const back = fromQuery(toQuery(params, 'imperial'));
  assert.deepEqual(back.params, params);
  assert.equal(back.system, 'imperial');
  assert.deepEqual(fromQuery('').params, DEFAULT_PARAMS);
  assert.deepEqual(fromQuery('?armLength=abc&counterWeight=&fulcrumHeight=9999').params.armLength, DEFAULT_PARAMS.armLength);
  assert.equal(fromQuery('?fulcrumHeight=9999').params.fulcrumHeight, 15);
});

test('margins say how far over/under the band edge', () => {
  const r = computeLobber(DEFAULT_PARAMS);
  const txt = marginText('peakG', { value: 4, level: 'caution', caution: 3, danger: 5 }, 'metric');
  assert.match(txt, /1.0 g over the caution edge/);
  assert.match(txt, /1.0 g under danger/);
  assert.match(marginText('impactSpeed', { value: 15, level: 'danger', caution: 9, danger: 13 }, 'metric'), /2.0 m\/s over the danger edge/);
  assert.match(marginText('maxHeight', r.bands.maxHeight, 'imperial'), /ft/);
});

test('summary line has landing, spread, speed and g; imperial converts', () => {
  const r = computeLobber(DEFAULT_PARAMS);
  assert.match(summaryLine(r, 'metric'), /^Lands at [\d.]+ m ± [\d.]+ m at [\d.]+ m\/s, peak [\d.]+ g$/);
  assert.match(summaryLine(r, 'imperial'), /ft ± .* ft at .* ft\/s/);
  assert.equal(fmt(1, 'length', 'imperial'), '3.3 ft');
  assert.equal(fmt(NaN, 'length', 'metric'), 'N/A');
});

test('marginText says "right at" when the safe margin is float noise', () => {
  const t = marginText('maxHeight', { value: 5 - 1e-9, level: 'safe', caution: 5, danger: 8 }, 'metric');
  assert.match(t, /^right at the caution edge \(5\.0 m\)$/);
  assert.doesNotMatch(t, /0\.000/);
});
