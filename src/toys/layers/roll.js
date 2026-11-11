// Layer Roll: pure, seedable roller over plain-data tables.
// Tables live in ./tables/*.json so non-coders can extend them.
import base from './tables/base.json' with { type: 'json' };
import blocky from './tables/theme-blocky.json' with { type: 'json' };
import space from './tables/theme-space.json' with { type: 'json' };
import ocean from './tables/theme-ocean.json' with { type: 'json' };

export const baseTable = base;
export const themes = { blocky, space, ocean };
export const LAYER_IDS = ['outline', 'mid', 'fine'];

// mulberry32: tiny deterministic PRNG. Accepts a number or a string seed.
export function makeRng(seed = 0) {
  let h = 1779033703 ^ String(seed).length;
  const s = String(seed);
  // Hash strings (and numbers) to a 32-bit state.
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];

function layerIndex(layer) {
  const i = typeof layer === 'number' ? layer : LAYER_IDS.indexOf(layer);
  if (!(i >= 0 && i < LAYER_IDS.length)) throw new Error(`Unknown layer: ${layer}`);
  return i;
}

/**
 * Roll one layer: a category (independent), an item inside it, and the
 * layer's modifier (behavior / environment / odd property).
 *
 * layer: 0-2 or 'outline' | 'mid' | 'fine'
 * opts:  { theme: 'blocky'|'space'|'ocean'|null, themeMix = 0.5, locked: prevResult|null }
 * A locked result is returned untouched, without consuming rng.
 */
export function rollLayer(layer, rng, opts = {}) {
  const i = layerIndex(layer);
  if (opts.locked) return opts.locked;
  const { theme = null, themeMix = 0.5 } = opts;
  const themeTable = theme ? themes[theme] : null;
  if (theme && !themeTable) throw new Error(`Unknown theme: ${theme}`);

  const pool = (table) => {
    const l = table.layers[i];
    return { categories: Object.keys(l.categories), l };
  };
  // Each of category and modifier flips its own base/theme coin.
  const useTheme = () => Boolean(themeTable) && rng() < themeMix;

  const fromTheme = useTheme();
  const src = fromTheme ? themeTable : base;
  const { categories, l } = pool(src);
  const category = pick(rng, categories);
  const item = pick(rng, l.categories[category]);

  const modTheme = useTheme();
  const modLayer = (modTheme ? themeTable : base).layers[i];
  const modifier = pick(rng, modLayer.modifier.items);

  return {
    layer: LAYER_IDS[i],
    category,
    item,
    modifier,
    source: fromTheme ? theme : 'base',
  };
}

/** Roll all three layers. opts.locked: array of up to 3 results (or null) to keep. */
export function rollAll(rng, opts = {}) {
  const { locked = [], ...rest } = opts;
  return LAYER_IDS.map((_, i) => rollLayer(i, rng, { ...rest, locked: locked[i] || null }));
}
