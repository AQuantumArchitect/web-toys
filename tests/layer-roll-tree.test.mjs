import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  loadTree,
  validateTree,
  readmeWithStats,
  README_URL,
  MIN_LEAF_WORDS,
} from '../content/layer-roll/validate.mjs';

const tree = loadTree();

test('layer roll tree passes the validator', () => {
  const { errors } = validateTree(tree);
  assert.deepEqual(errors, []);
});

test('README stats table is up to date (run validate.mjs --update-readme)', () => {
  const { stats } = validateTree(tree);
  const readme = readFileSync(README_URL, 'utf8');
  assert.equal(readmeWithStats(readme, stats), readme);
});

// Small synthetic trees to prove the validator catches what it should.
const words = (prefix, n = MIN_LEAF_WORDS) => Array.from({ length: n }, (_, i) => `${prefix} ${i}`);
function tiny() {
  const role = (id, slot, rounds) => ({
    id,
    label: id,
    slot,
    rounds,
    children: ['a', 'b', 'c'].map((x) => ({ id: `${id}-${x}`, label: x, words: words(`${id}-${x}`) })),
  });
  return {
    rounds: ['outline', 'fill', 'details'],
    tags: { sky: { meaning: 'up high', use: 'theme' } },
    children: [
      role('things', 'item', ['outline', 'fill', 'details']),
      Object.assign(role('moods', 'modifier', ['outline', 'fill', 'details']), { tags: ['sky'] }),
    ],
  };
}
const errorsOf = (t) => validateTree(t).errors.join('\n');

test('synthetic baseline is valid', () => {
  assert.deepEqual(validateTree(tiny()).errors, []);
});

test('catches duplicates unless marked dup', () => {
  const t = tiny();
  t.children[0].children[1].words[0] = 'things-a 0';
  assert.match(errorsOf(t), /duplicate of the word/);
  t.children[0].children[1].words[0] = { word: 'things-a 0', dup: true };
  assert.deepEqual(validateTree(t).errors, []);
  t.children[0].children[0].words[0] = { word: 'things-a 0', dup: true };
  assert.match(errorsOf(t), /first copy/);
});

test('catches structure problems', () => {
  let t = tiny();
  delete t.children[0].slot;
  assert.match(errorsOf(t), /needs "slot"/);

  t = tiny();
  t.children[0].children[0].rounds = ['outline'];
  t.children[0].rounds = ['fill'];
  assert.match(errorsOf(t), /widens/);

  t = tiny();
  t.children[0].children[0].children = [];
  assert.match(errorsOf(t), /exactly one of/);

  t = tiny();
  t.children[0].children[2].id = 'Things C';
  assert.match(errorsOf(t), /kebab-case/);

  t = tiny();
  t.children[0].children[2].id = 'things-a';
  assert.match(errorsOf(t), /duplicate id/);

  t = tiny();
  t.children[0].children[0].words.pop();
  assert.match(errorsOf(t), /need at least/);

  t = tiny();
  t.children[0].children[0].words[0] = 'Owl ';
  assert.match(errorsOf(t), /not trimmed/);
  assert.match(errorsOf(t), /not lowercase/);

  t = tiny();
  const leaf = t.children[0].children[0];
  t.children[0].children[0] = { id: 'deep', label: 'deep', children: [{ id: 'deeper', label: 'x', children: [leaf] }] };
  assert.match(errorsOf(t), /deeper than 3/);
});

test('catches tag problems and thin round × slot coverage', () => {
  let t = tiny();
  t.tags.extra = { meaning: 'never used', use: 'optout' };
  assert.match(errorsOf(t), /declared but never used/);

  t = tiny();
  t.children[0].children[0].words[0] = { word: 'x', tags: ['nope'] };
  assert.match(errorsOf(t), /undeclared tag/);

  t = tiny();
  t.tags.sky.use = 'sometimes';
  assert.match(errorsOf(t), /"use" must be/);

  t = tiny();
  t.children[1].rounds = ['outline'];
  assert.match(errorsOf(t), /fill × modifier: only 0/);
});
