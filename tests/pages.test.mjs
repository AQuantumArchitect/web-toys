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

test('every toy has a screenshot, an OG image and meta descriptions', async () => {
  const { readFileSync } = await import('node:fs');
  const root = (p) => new URL(`../${p}`, import.meta.url);
  assert.ok(existsSync(root('public/og.png')));
  for (const p of pages) {
    assert.ok(existsSync(root(`public${p.shot}`)), `${p.slug} screenshot`);
    assert.ok(existsSync(root(`public/og-${p.slug}.png`)), `${p.slug} OG image`);
    const html = readFileSync(root(`${p.slug}/index.html`), 'utf8');
    assert.match(html, /<meta name="description" content="[^"]{20,}[^."]\."/);
    assert.doesNotMatch(html, /\.\./);
    assert.match(html, new RegExp(`og-${p.slug}\\.png`));
  }
});
