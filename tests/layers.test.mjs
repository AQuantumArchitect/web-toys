import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeRng, rollLayer, rollAll, baseTable, themes } from '../src/toys/layers/roll.js';

const tablesDir = new URL('../src/toys/layers/tables/', import.meta.url);
const base = JSON.parse(readFileSync(new URL('base.json', tablesDir), 'utf8'));

test('same seed gives the same result; different seeds differ', () => {
  assert.deepEqual(rollAll(makeRng('abc')), rollAll(makeRng('abc')));
  assert.deepEqual(rollAll(makeRng(42), { theme: 'space' }), rollAll(makeRng(42), { theme: 'space' }));
  const seen = new Set();
  for (let s = 0; s < 20; s++) seen.add(JSON.stringify(rollAll(makeRng(s))));
  assert.ok(seen.size > 15);
});

test('rollAll returns exactly 3 layers, in order', () => {
  const r = rollAll(makeRng(1));
  assert.equal(r.length, 3);
  assert.deepEqual(r.map((x) => x.layer), ['outline', 'mid', 'fine']);
  for (const x of r) assert.ok(x.category && x.item && x.modifier);
});

test('rolled values come from the tables', () => {
  for (let s = 0; s < 50; s++) {
    rollAll(makeRng(s)).forEach((x, i) => {
      const l = baseTable.layers[i];
      assert.ok(l.categories[x.category].includes(x.item));
      assert.ok(l.modifier.items.includes(x.modifier));
    });
  }
});

test('categories roll independently (all categories reachable)', () => {
  const rng = makeRng(7);
  const hit = new Set();
  for (let n = 0; n < 500; n++) hit.add(rollLayer('outline', rng).category);
  assert.equal(hit.size, Object.keys(base.layers[0].categories).length);
});

test('lock keeps a layer; re-roll changes the others', () => {
  const first = rollAll(makeRng(5));
  const again = rollAll(makeRng(99), { locked: [first[0], null, first[2]] });
  assert.deepEqual(again[0], first[0]);
  assert.deepEqual(again[2], first[2]);
  assert.equal(again[1].layer, 'mid');
  assert.deepEqual(rollLayer(0, makeRng(1), { locked: first[0] }), first[0]);
});

test('theme mixes roughly half base, half theme', () => {
  const rng = makeRng(3);
  let themed = 0;
  const N = 2000;
  for (let n = 0; n < N; n++) if (rollLayer(1, rng, { theme: 'ocean' }).source === 'ocean') themed++;
  assert.ok(themed / N > 0.4 && themed / N < 0.6, `ratio ${themed / N}`);
  for (let n = 0; n < 100; n++) assert.equal(rollLayer(0, rng).source, 'base');
});

test('every table meets the size minimums', () => {
  assert.equal(base.layers.length, 3);
  for (const l of base.layers) {
    const cats = Object.entries(l.categories);
    assert.ok(cats.length >= 8, `${l.id} categories`);
    for (const [c, items] of cats) assert.ok(items.length >= 8, `${l.id}/${c}`);
    assert.ok(l.modifier.items.length >= 8, `${l.id} modifier`);
  }
  for (const [name, t] of Object.entries(themes)) {
    assert.equal(t.layers.length, 3, name);
    for (const l of t.layers) {
      assert.ok(Object.keys(l.categories).length >= 2, `${name} ${l.id}`);
      for (const [c, items] of Object.entries(l.categories)) assert.ok(items.length >= 8, `${name}/${c}`);
      assert.ok(l.modifier.items.length >= 8, `${name} ${l.id} modifier`);
    }
  }
});

test('outline includes non-creature core types', () => {
  const all = Object.values(base.layers[0].categories).flat();
  for (const w of ['castle', 'cave', 'robot', 'portal', 'sailing ship', 'mountain', 'sword', 'altar'])
    assert.ok(all.includes(w), w);
});

const allTables = [['base', base], ...Object.entries(themes)];
const strings = (l) => [...Object.values(l.categories).flat(), ...l.modifier.items];

test('no item string appears in two different layers', () => {
  const owner = new Map();
  for (const [name, t] of allTables)
    t.layers.forEach((l) => {
      for (const s of strings(l)) {
        const k = s.toLowerCase();
        assert.ok(!owner.has(k) || owner.get(k) === l.id, `"${s}" in ${owner.get(k)} and ${l.id} (${name})`);
        owner.set(k, l.id);
      }
    });
});

test('no duplicate items inside a layer', () => {
  for (const [name, t] of allTables)
    for (const l of t.layers) {
      const s = strings(l).map((x) => x.toLowerCase());
      assert.equal(new Set(s).size, s.length, `${name} ${l.id}`);
    }
});

test('kid-safety deny-list', () => {
  const deny = ['blood', 'gore', 'kill', 'dead', 'death', 'die', 'gun', 'bomb', 'drug', 'beer', 'wine', 'sexy', 'nude',
    'naked', 'skull', 'murder', 'suicide', 'unicorn', 'rainbow', 'minecraft', 'enderman', 'creeper', 'zombie', 'steve',
    'fantasy genesis'];
  const re = new RegExp(`\\b(${deny.join('|')})`, 'i');
  for (const [name, t] of allTables) {
    for (const l of t.layers) for (const s of strings(l)) assert.ok(!re.test(s), `${name}: "${s}"`);
    for (const l of t.layers) for (const c of Object.keys(l.categories)) assert.ok(!re.test(c), `${name}: "${c}"`);
  }
});
