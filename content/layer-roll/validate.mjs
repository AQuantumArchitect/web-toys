#!/usr/bin/env node
// Checks content/layer-roll/tree.json and prints word counts.
//
//   node content/layer-roll/validate.mjs                 check + counts report
//   node content/layer-roll/validate.mjs --update-readme also rewrite the README stats table
//
// No dependencies. tests/layer-roll-tree.test.mjs imports validateTree() so CI runs it.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const TREE_URL = new URL('./tree.json', import.meta.url);
export const README_URL = new URL('./README.md', import.meta.url);

export const ROUNDS = ['outline', 'fill', 'details'];
export const SLOTS = ['item', 'modifier'];
export const TAG_USES = ['theme', 'optout', 'both'];
export const MAX_DEPTH = 3;
export const MIN_LEAF_WORDS = 30;
export const MIN_BRANCHES_PER_ROUND_SLOT = 3;

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NODE_KEYS = new Set(['id', 'label', 'slot', 'rounds', 'tags', 'children', 'words']);
const WORD_KEYS = new Set(['word', 'tags', 'rounds', 'dup']);

export function loadTree(url = TREE_URL) {
  return JSON.parse(readFileSync(url, 'utf8'));
}

/**
 * Validate a parsed tree. Returns { errors: string[], stats }.
 * stats: { total, roles: [{ id, slot, rounds, count, branches: [{ id, count, leaves: [{ id, count }] }] }],
 *          tagRounds: { tag: { outline, fill, details } }, roundSlot: { round: { slot: branchCount } } }
 */
export function validateTree(tree) {
  const errors = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);

  if (!tree || typeof tree !== 'object') return { errors: ['tree: not an object'], stats: null };
  if (JSON.stringify(tree.rounds) !== JSON.stringify(ROUNDS)) err('tree', `"rounds" must be ${JSON.stringify(ROUNDS)}`);

  const declared = tree.tags && typeof tree.tags === 'object' ? tree.tags : {};
  if (!tree.tags) err('tree', 'missing "tags"');
  for (const [tag, def] of Object.entries(declared)) {
    if (!KEBAB.test(tag)) err(`tag ${tag}`, 'not kebab-case');
    if (!def || typeof def.meaning !== 'string' || !def.meaning.trim()) err(`tag ${tag}`, 'needs a "meaning"');
    if (!def || !TAG_USES.includes(def.use)) err(`tag ${tag}`, `"use" must be one of ${TAG_USES.join(', ')}`);
  }
  const usedTags = new Set();
  const checkTags = (where, tags) => {
    if (tags === undefined) return [];
    if (!Array.isArray(tags) || tags.length === 0) {
      err(where, '"tags" must be a non-empty array');
      return [];
    }
    for (const t of tags) {
      if (!Object.hasOwn(declared, t)) err(where, `undeclared tag "${t}"`);
      usedTags.add(t);
    }
    if (new Set(tags).size !== tags.length) err(where, 'repeated tag');
    return tags;
  };
  const checkRounds = (where, rounds, parent) => {
    if (rounds === undefined) return parent;
    if (!Array.isArray(rounds) || rounds.length === 0) {
      err(where, '"rounds" must be a non-empty array');
      return parent;
    }
    for (const r of rounds) {
      if (!ROUNDS.includes(r)) err(where, `unknown round "${r}"`);
      else if (!parent.includes(r)) err(where, `round "${r}" widens its parent's rounds`);
    }
    return rounds.filter((r) => parent.includes(r));
  };

  const ids = new Set();
  const firstSeen = new Map(); // word -> leaf id of first copy
  const tagRounds = {};
  for (const t of Object.keys(declared)) tagRounds[t] = Object.fromEntries(ROUNDS.map((r) => [r, 0]));
  // per role/branch: which rounds have at least one word
  const roles = [];
  let total = 0;

  // Walk a node. Returns { count, roundsWithWords:Set }.
  function walk(node, depth, path, inherited, sink) {
    const where = path.length ? path.join(' > ') : '(root)';
    if (!node || typeof node !== 'object' || Array.isArray(node)) {
      err(where, 'node must be an object');
      return { count: 0, rounds: new Set() };
    }
    for (const k of Object.keys(node)) if (!NODE_KEYS.has(k)) err(where, `unknown field "${k}"`);
    if (typeof node.id !== 'string' || !node.id) err(where, 'missing "id"');
    else {
      if (!KEBAB.test(node.id)) err(where, `id "${node.id}" is not kebab-case`);
      if (ids.has(node.id)) err(where, `duplicate id "${node.id}"`);
      ids.add(node.id);
    }
    if (typeof node.label !== 'string' || !node.label.trim()) err(where, 'missing "label"');
    if (depth > MAX_DEPTH) err(where, `deeper than ${MAX_DEPTH} category levels`);
    if (depth === 1) {
      if (!SLOTS.includes(node.slot)) err(where, `top-level node needs "slot" (${SLOTS.join(' or ')})`);
      if (node.rounds === undefined) err(where, 'top-level node needs "rounds"');
    } else if (node.slot !== undefined) err(where, '"slot" is only allowed on top-level nodes');

    const tags = [...inherited.tags, ...checkTags(where, node.tags)];
    const rounds = checkRounds(where, node.rounds, inherited.rounds);
    const hasChildren = node.children !== undefined;
    const hasWords = node.words !== undefined;
    const out = { count: 0, rounds: new Set() };

    if (hasChildren === hasWords) {
      err(where, 'needs exactly one of "children" or "words"');
      return out;
    }
    if (hasChildren) {
      if (!Array.isArray(node.children) || node.children.length === 0) {
        err(where, '"children" must be a non-empty array');
        return out;
      }
      for (const child of node.children) {
        const childSink = depth === 1 ? { id: child?.id, count: 0, leaves: [] } : sink;
        const r = walk(child, depth + 1, [...path, child?.id ?? '?'], { tags, rounds }, childSink);
        if (depth === 1) {
          childSink.count = r.count;
          childSink.rounds = r.rounds;
          sink.branches.push(childSink);
        }
        out.count += r.count;
        r.rounds.forEach((x) => out.rounds.add(x));
      }
      return out;
    }

    // leaf
    if (!Array.isArray(node.words) || node.words.length === 0) {
      err(where, '"words" must be a non-empty array');
      return out;
    }
    if (depth === 1) err(where, 'a top-level role must have children');
    const inLeaf = new Set();
    for (const w of node.words) {
      const isObj = w && typeof w === 'object' && !Array.isArray(w);
      const word = isObj ? w.word : w;
      const wWhere = `${where} > "${word}"`;
      if (typeof word !== 'string' || !word) {
        err(where, `bad word entry ${JSON.stringify(w)}`);
        continue;
      }
      if (word !== word.trim()) err(wWhere, 'not trimmed');
      if (word !== word.toLowerCase()) err(wWhere, 'not lowercase');
      if (/\s{2,}/.test(word)) err(wWhere, 'double space');
      let wTags = tags;
      let wRounds = rounds;
      if (isObj) {
        for (const k of Object.keys(w)) if (!WORD_KEYS.has(k)) err(wWhere, `unknown field "${k}"`);
        if (w.dup !== undefined && w.dup !== true) err(wWhere, '"dup" must be true when present');
        if (w.tags === undefined && w.rounds === undefined && w.dup === undefined) err(wWhere, 'object word with nothing but "word"; use a plain string');
        wTags = [...tags, ...checkTags(wWhere, w.tags)];
        wRounds = checkRounds(wWhere, w.rounds, rounds);
      }
      if (inLeaf.has(word)) err(wWhere, 'repeated in the same leaf');
      inLeaf.add(word);
      if (firstSeen.has(word)) {
        if (!(isObj && w.dup === true)) err(wWhere, `duplicate of the word in "${firstSeen.get(word)}"; drop it or mark "dup": true`);
      } else {
        if (isObj && w.dup === true) err(wWhere, 'marked "dup" but this is the first copy');
        firstSeen.set(word, node.id);
      }
      for (const t of new Set(wTags)) if (tagRounds[t]) for (const r of wRounds) tagRounds[t][r]++;
      wRounds.forEach((r) => out.rounds.add(r));
      out.count++;
    }
    if (node.words.length < MIN_LEAF_WORDS) err(where, `only ${node.words.length} words (need at least ${MIN_LEAF_WORDS})`);
    if (sink?.leaves) sink.leaves.push({ id: node.id, count: node.words.length });
    return out;
  }

  if (!Array.isArray(tree.children) || tree.children.length === 0) err('tree', '"children" must be a non-empty array');
  else {
    for (const role of tree.children) {
      const sink = { id: role?.id, slot: role?.slot, rounds: role?.rounds, count: 0, branches: [] };
      const r = walk(role, 1, [role?.id ?? '?'], { tags: [], rounds: ROUNDS }, sink);
      sink.count = r.count;
      total += r.count;
      roles.push(sink);
    }
  }

  for (const t of Object.keys(declared)) if (!usedTags.has(t)) err(`tag ${t}`, 'declared but never used');

  const roundSlot = {};
  for (const round of ROUNDS) {
    roundSlot[round] = {};
    for (const slot of SLOTS) {
      const n = roles
        .filter((r) => r.slot === slot)
        .flatMap((r) => r.branches)
        .filter((b) => b.rounds?.has(round)).length;
      roundSlot[round][slot] = n;
      if (n < MIN_BRANCHES_PER_ROUND_SLOT) err('tree', `${round} × ${slot}: only ${n} non-empty branches (need ${MIN_BRANCHES_PER_ROUND_SLOT})`);
    }
  }

  return { errors, stats: { total, roles, tagRounds, roundSlot } };
}

export function formatReport(stats) {
  const lines = [];
  const pad = (s, n) => String(s).padEnd(n);
  const num = (s, n = 6) => String(s).padStart(n);
  lines.push(`Total words: ${stats.total}`, '');
  for (const role of stats.roles) {
    lines.push(`${role.id}  (${role.slot}; ${role.rounds?.join(', ')})  ${role.count}`);
    for (const b of role.branches) {
      lines.push(`  ${pad(b.id, 30)}${num(b.count)}`);
      for (const l of b.leaves) if (l.id !== b.id) lines.push(`    ${pad(l.id, 28)}${num(l.count)}`);
    }
    lines.push('');
  }
  lines.push('Branches per round × slot (after round filtering):');
  for (const [round, slots] of Object.entries(stats.roundSlot)) {
    lines.push(`  ${pad(round, 10)}${Object.entries(slots).map(([s, n]) => `${s} ${n}`).join('   ')}`);
  }
  lines.push('', `Words per tag per round:`, `  ${pad('tag', 14)}${ROUNDS.map((r) => num(r, 9)).join('')}`);
  for (const [tag, counts] of Object.entries(stats.tagRounds)) {
    lines.push(`  ${pad(tag, 14)}${ROUNDS.map((r) => num(counts[r], 9)).join('')}`);
  }
  return lines.join('\n');
}

export function statsMarkdown(stats) {
  const rows = ['| role | slot | rounds | level-2 branch | words |', '|---|---|---|---|---:|'];
  for (const role of stats.roles) {
    rows.push(`| **\`${role.id}\`** | ${role.slot} | ${role.rounds?.join(', ')} | *all* | **${role.count}** |`);
    for (const b of role.branches) rows.push(`| | | | \`${b.id}\` | ${b.count} |`);
  }
  rows.push(`| **total** | | | | **${stats.total}** |`);
  return rows.join('\n');
}

const START = '<!-- stats:start (generated by validate.mjs --update-readme) -->';
const END = '<!-- stats:end -->';

export function readmeWithStats(readme, stats) {
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (a < 0 || b < a) throw new Error('README is missing the stats markers');
  return `${readme.slice(0, a + START.length)}\n${statsMarkdown(stats)}\n${readme.slice(b)}`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let tree;
  try {
    tree = loadTree();
  } catch (e) {
    console.error(`tree.json is not valid JSON: ${e.message}`);
    process.exit(1);
  }
  const { errors, stats } = validateTree(tree);
  if (stats) console.log(formatReport(stats));
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (process.argv.includes('--update-readme')) {
    const readme = readFileSync(README_URL, 'utf8');
    writeFileSync(README_URL, readmeWithStats(readme, stats));
    console.log('\nREADME stats table updated.');
  }
  console.log('\nOK');
}
