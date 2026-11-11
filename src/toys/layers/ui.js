// Small pure helpers for the Layer Roll page (kept out of the JSX so tests can import them).
import { themes } from './roll.js';

const LABELS = ['Outline', 'Mid', 'Fine'];

/** One-line summary: "Outline: a tree, sprinting. Mid: ..." */
export function summaryText(results) {
  return results.map((r, i) => `${LABELS[i]}: ${r.item}, ${r.modifier}.`).join(' ');
}

export function newSeed() {
  return Math.random().toString(36).slice(2, 8);
}

/** Parse ?seed= and ?theme= from a location.search string. */
export function readUrl(search) {
  const p = new URLSearchParams(search);
  const theme = p.get('theme');
  return { seed: p.get('seed') || '', theme: theme && themes[theme] ? theme : '' };
}

export function writeUrl(seed, theme) {
  const p = new URLSearchParams({ seed });
  if (theme) p.set('theme', theme);
  window.history.replaceState(null, '', `?${p}`);
}
