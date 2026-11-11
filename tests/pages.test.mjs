import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { pages } from '../src/pages.js';

test('landing lists both toys', () => {
  assert.deepEqual(pages.map((p) => p.slug), ['trebuchet', 'layers']);
});

test('every toy has an entry HTML page and well-formed fields', () => {
  for (const p of pages) {
    assert.ok(p.name && p.pitch, `${p.slug} needs name and pitch`);
    assert.equal(p.path, `/${p.slug}/`);
    assert.ok(existsSync(new URL(`../${p.slug}/index.html`, import.meta.url)));
  }
});
