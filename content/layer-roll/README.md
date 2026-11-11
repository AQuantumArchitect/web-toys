# Layer Roll word tree

`tree.json` is a single shared tree of words for all three rounds of Layer Roll: **outline**, **fill** and **details**. It is plain JSON, so you can edit it by hand.

This is the **round 1 structure**. Each category has only a few example words (3 to 6). Later rounds will grow each category to hundreds of words without changing the format.

The play page (`src/toys/layers/`) still uses its own tables. Nothing reads this file yet.

## Shape

```jsonc
{
  "version": 1,
  "rounds": ["outline", "fill", "details"],
  "tags": { "ocean": "one-line meaning", ... },   // the tag vocabulary
  "children": [ /* top-level nodes */ ]
}
```

A **node** is a category:

| field      | required | meaning |
|------------|----------|---------|
| `id`       | yes      | Stable kebab-case id, unique in the whole tree. Never reuse or rename an id, because later rounds and saved rolls can refer to it. |
| `label`    | yes      | What players see. |
| `children` | one of   | Sub-categories (nested nodes). |
| `words`    | one of   | Leaf words. A node has either `children` or `words`, not both. |
| `tags`     | no       | Theme tags. They apply to everything below this node. |
| `rounds`   | no       | Limits this node and everything below it to these rounds. |

A **word** is either a plain string (`"fox"`) or an object when it needs its own tags or rounds:

```json
{ "word": "penguin", "tags": ["frozen", "ocean"] }
```

The tree goes down at most **3 category levels**, for example `places → buildings → castles-and-towers → "lighthouse"`. Most branches use 2 levels.

### Inheritance

- **Tags add up** as you go down. A word's tags are its own tags plus the tags of every node above it. `"bat"` under `winged-things` (tagged `sky`) has tags `sky` and `spooky`.
- **Rounds narrow** as you go down. The closest `rounds` wins. If no node above sets `rounds`, the word can be used in all three rounds. A child should only narrow its parent's rounds, never widen them.

## Rolling

To roll one word for a round:

1. **Filter** the tree (see the next section) for the round and the chosen theme. Remove words that don't qualify, and remove any category that ends up empty.
2. Start at the top. **Pick one child uniformly at random** from what is left.
3. Keep doing that at each level until you reach a list of words, then pick one word uniformly from it.

Every pick is **with replacement**: nothing gets used up, so the same word can come up again in a later roll.

Since the choice at each level is uniform, **a category's chance doesn't depend on how many words it has**. When round 2 gives one category 400 words and another 40, both still come up equally often. Each word does become less likely as its list grows. If two siblings ever need different weights, that is something to add later, not part of this format.

Picks use the play page's existing seeded RNG, so a `?seed=` link still replays the same roll.

## Filtering by round and theme

- **Round:** keep a word if its effective `rounds` include the current round.
- **Theme:** when a theme is chosen, keep a word only if its effective tags include that theme. If no theme is chosen, keep everything.
- **Opt-out tags** (for example turning off `sparkly`): drop every word whose effective tags include that tag.
- **Empty fallback:** if filtering leaves nothing for a round, roll that round without the theme filter rather than failing.

Choosing a theme only filters the tree. Whether the play page mixes themed and untagged words (it uses about half and half today) is up to the app and is not stored in the data.

## Tag vocabulary

All tags must be listed in `tree.json` under `"tags"`. Here they are:

| tag           | meaning |
|---------------|---------|
| `ocean`       | Seas, shores, reefs and the deep: anything wet and salty. |
| `space`       | Planets, stars, rockets and the stuff between them. |
| `forest`      | Woods, meadows and gardens: green, leafy, outdoors. |
| `sky`         | Clouds, wind, flight and high places. |
| `underground` | Caves, tunnels, mines, roots and buried things. |
| `desert`      | Sand, sun, dunes and dry heat. |
| `frozen`      | Snow, ice, cold mountains and winter. |
| `magic`       | Wizards, spells, potions and creatures that don't exist. |
| `mechanical`  | Gears, engines, robots, gadgets and anything built from parts. |
| `spooky`      | Kid-level creepy: ghosts, bats, cobwebs and moonlight, nothing gory. |
| `silly`       | Goofy, cartoonish, makes-you-giggle. |
| `cozy`        | Homes, snacks, blankets and gentle everyday things. |
| `food`        | Things you could eat or cook. |
| `ancient`     | Old ruins, fossils, castles and long-ago things. |
| `sparkly`     | Unicorns, rainbows, glitter and pastel shine, so a player can switch it off. |

A word can have several tags. Leave a word untagged if no theme clearly fits. Untagged words are the general pool.

There is no "blocky world" tag. The brief rules out Minecraft content, so that theme pack from the current play page is not carried over here.

## Per-round tags

Most of the tree has no `rounds` and can come up in any round. A tree, a crab or a castle works as an outline, as a fill ("covered in tiny crabs") or as a detail. Round tags go only where something clearly belongs in one round:

| node | rounds | why |
|------|--------|-----|
| `actions` (moving, doing, resting, moods) | `outline` | The spec says behavior belongs on the outline layer. |
| `surfaces` (metal, stone, cloth, patterns, ...) | `fill`, `details` | Materials cover a shape, so they don't work as an outline. |
| `surfaces → skins-and-coats` | `fill` | Scales and fur cover a whole body, too big to be a detail. |
| `elements` (lightning, fog, sandstorm, ...) | `fill` | The spec's environment modifier lives on the mid layer. |
| `accents` (tiny parts, marks, add-ons, odd properties) | `details` | Small accents and odd properties are the fine layer. |

## Top-level branches

| id | label | holds |
|----|-------|-------|
| `creatures` | Creatures | Animals, bugs, made-up beasts |
| `people` | People and characters | Adventurers, helpers, magic folk, royals |
| `places` | Places | Buildings, natural places, strange places |
| `things` | Things | Gear, vehicles, machines, food, toys |
| `plants` | Plants and growing things | Trees, flowers, fungi |
| `actions` | Actions and moods | Outline-only behaviors and moods |
| `surfaces` | Surfaces and materials | Fill and detail materials and patterns |
| `elements` | Weather and elements | Fill-only weather and elements |
| `accents` | Small accents | Detail-only small parts, marks and odd properties |

## Content rules

- Kid-friendly only. `spooky` means friendly-ghost spooky, never gory.
- Write original lists. Common words that the book *Fantasy Genesis* also uses are fine (you can't avoid "dragon"), but don't copy its tables, category layout or wording.
- No Minecraft names, mobs or items.
- Keep things uncoupled. A word is one thing (`lightning`, `owl`), never a ready-made combo (`lightning owl`). Players do the mixing.
- Keep words short and drawable. Lowercase, singular for things (`owl`), plural for surface textures (`rivets`).

## Extending (round 2 and later)

- To add words, append them to a category's `words` list.
- To add a category, add a node with a new unique `id`.
- To add a tag, add it to `"tags"` in `tree.json` and to the table above, with its one-line meaning.
- If a word fits several categories, list it once in its most natural home. Duplicate words are allowed if really needed, but avoid them.
- Some themes (`space`, `desert`, `spooky`, `frozen`) only have a few words so far. Round 2 should build them up so every theme has enough words for all three rounds.
