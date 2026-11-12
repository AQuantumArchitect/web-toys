# Layer Roll word tree

`tree.json` is a single shared tree of words for all three rounds of Layer Roll: **outline**, **fill** and **details**. It is plain JSON, so you can edit it by hand.

This is **round 2**: the full structure with every leaf category filled (at least 30 words each; see [Stats](#stats)). Theme tags are still light. A later round will cluster themes.

The play page (`src/toys/layers/`) still uses its own tables. Nothing reads this file yet.

Check the tree after any edit:

```sh
node content/layer-roll/validate.mjs                  # checks + counts report
node content/layer-roll/validate.mjs --update-readme  # also refreshes the stats table below
```

`npm test` runs the same checks (`tests/layer-roll-tree.test.mjs`), and it also fails if the stats table below is out of date.

## Shape

```jsonc
{
  "version": 2,
  "rounds": ["outline", "fill", "details"],
  "tags": { "ocean": { "meaning": "one-line meaning", "use": "theme" }, ... },
  "children": [ /* top-level role nodes */ ]
}
```

The tree has exactly **3 category levels**: **role → branch → leaf category → words**. A few branches hold words directly (for example `behaviors-and-moods → together`), so they are 2 levels deep.

A **node** is a category:

| field      | required | meaning |
|------------|----------|---------|
| `id`       | yes      | Kebab-case id, unique in the whole tree. Once this PR merges, never reuse or rename an id, because later rounds and saved rolls can refer to it. |
| `label`    | yes      | What players see. |
| `slot`     | top level only, required there | `"item"` or `"modifier"`. Says which half of a layer roll this role feeds (see [Rolling](#rolling)). |
| `rounds`   | required at top level, optional below | Limits this node and everything below it to these rounds. |
| `children` | one of   | Sub-categories (nested nodes). |
| `words`    | one of   | Leaf words. A node has either `children` or `words`, never both, and neither may be empty. |
| `tags`     | no       | Theme tags. They apply to everything below this node. |

A **word** is either a plain string (`"fox"`) or an object when it needs its own tags or rounds, or is a deliberate duplicate:

```json
{ "word": "penguin", "tags": ["frozen", "ocean"] }
{ "word": "moss", "dup": true }
```

### Roles

The top level is a small set of **roles**. Each one feeds either the **item** or the **modifier** half of a layer:

| role | slot | rounds | holds |
|------|------|--------|-------|
| `subjects` | item | all | Creatures, people, plants, food, objects, machines, places, cosmos, tiny world, ideas and shapes |
| `surfaces` | item | fill, details | Materials, textures, patterns and coverings |
| `accents` | item | details | Body bits, small parts and decorations |
| `behaviors-and-moods` | modifier | outline | Moving, doing, together, resting, feelings and personalities |
| `elements-and-settings` | modifier | fill | Weather, fire and light, earth and water forces, sky events, times and seasons, situations |
| `odd-properties` | modifier | details | Senses, changes, magic effects and habits |

This follows the play spec: outline = core type + behavior, fill = surface or material + environment, details = accent + odd property. Within `surfaces`, `coverings → skins-and-coats` is narrowed to `fill`, because scales and fur cover a whole body and are too big to be a detail.

### Inheritance

- **Tags add up** as you go down. A word's tags are its own tags plus the tags of every node above it. For example, `"stegosaurus"` under `prehistoric` (tagged `ancient`) has the tag `ancient`.
- **Rounds narrow** as you go down. The closest `rounds` wins. A child may only narrow its parent's rounds, never widen them.
- **Node tags only when every word fits.** Put a tag on a node only if every word that will ever go under it fits that tag, for example `cosmos: space` or `spooky-folk: spooky`. Otherwise tag the words one by one. That's why `fish-and-sea-life` has no `ocean` tag (goldfish) and `water-places` doesn't either (waterfall).

## Rolling

Each round rolls **one item and one modifier**. To roll a slot for a round:

1. **Filter** the tree for the round and the chosen theme (see the next section). Remove words that don't qualify, and remove any category that ends up empty.
2. Take the roles whose `slot` matches. **Pick one role uniformly at random**, then one branch, then one leaf category, at each level choosing uniformly among what is left.
3. When you reach a list of words, pick one word uniformly from it.

So each round's item comes from:

- **outline:** always `subjects`
- **fill:** `subjects` or `surfaces`, 50/50
- **details:** `subjects`, `surfaces` or `accents`, 1/3 each

The modifier always comes from that round's one modifier role.

Every pick is **with replacement**: nothing gets used up, so the same word can come up again in a later roll.

Because every level is uniform, **a category's chance doesn't depend on how many words it has.** A leaf with 70 words and one with 35 come up equally often; each word in the bigger leaf is just less likely. If two siblings ever need different weights, that is something to add later, not part of this format.

Picks use the play page's existing seeded RNG, so a `?seed=` link still replays the same roll.

## Filtering by round and theme

- **Round:** keep a word if its effective `rounds` include the current round.
- **Theme:** when a theme is chosen, keep a word only if its effective tags include that theme. If no theme is chosen, keep everything.
- **Opt-out:** turning off a tag (for example `sparkly`) drops every word whose effective tags include it.
- **Empty fallback:** if filtering leaves nothing for a slot in a round, roll that slot without the theme filter rather than failing.

Choosing a theme only filters the tree. Whether the play page mixes themed and untagged words is up to the app and is not stored in the data.

## Tag vocabulary

Every tag must be declared in `tree.json` under `"tags"` as `{ "meaning": "...", "use": "theme" | "optout" | "both" }`, and every declared tag must be used somewhere. `use` says how the play page may offer it: as a **theme** to pick, as an **optout** to switch off, or **both**.

| tag | use | meaning |
|-----|-----|---------|
| `ocean` | theme | Seas, shores, reefs and the deep: anything wet and salty. |
| `space` | theme | Planets, stars, rockets and the stuff between them. |
| `forest` | theme | Woods, meadows and gardens: green, leafy, outdoors. |
| `jungle` | theme | Rainforest and tropical: steamy, tangled, bright. |
| `sky` | theme | Clouds, wind, flight and high places. |
| `underground` | theme | Caves, tunnels, mines, roots and buried things. |
| `desert` | theme | Sand, sun, dunes and dry heat. |
| `frozen` | theme | Snow, ice, cold mountains and winter. |
| `farm` | theme | Farmyards, barns, fields and the animals and crops in them. |
| `town` | theme | Streets, shops, school and everyday city life. |
| `tiny` | theme | Microscopic or miniature: things you need a magnifier for. |
| `magic` | theme | Wizards, spells, potions and creatures that don't exist. |
| `mechanical` | theme | Gears, engines, robots, gadgets and anything built from parts. |
| `spooky` | both | Kid-level creepy: ghosts, bats, cobwebs and moonlight, nothing gory. A theme, or switch it off. |
| `silly` | theme | Goofy, cartoonish, makes-you-giggle. |
| `cozy` | theme | Homes, snacks, blankets and gentle everyday things. |
| `food` | theme | Things you could eat, drink or cook. |
| `ancient` | theme | Old ruins, fossils, castles and long-ago things. |
| `sparkly` | both | Unicorns, rainbows, glitter and pastel shine. A theme, or switch it off. |

A word can have several tags. Leave a word untagged if no theme clearly fits; untagged words are the general pool. Round 2 tags only the obvious fits. Balancing and clustering themes is a later round.

There is no "blocky world" tag. The brief rules out Minecraft content, so that theme pack from the current play page is not carried over here.

## Duplicates

Each word appears once in the whole tree, in its most natural home. If a word really belongs in a second leaf too, every copy after the first (in file order) must be an object with `"dup": true`. The validator rejects any other repeat, and also rejects `dup` on a first copy.

## Content rules

- Kid-friendly only. `spooky` means friendly-ghost spooky, never gory. Nothing scary-real, and no weapons beyond storybook gear (sword, shield, bow).
- No brand names, trademarked characters, real people or religious holidays.
- Write original lists. Common words that the book *Fantasy Genesis* also uses are fine (you can't avoid "dragon"), but don't copy its tables, category layout or wording.
- No Minecraft names, mobs or items.
- **One concept per word.** A word is one thing (`lightning`, `owl`), never a ready-made combo (`lightning owl`). A plain variety is fine (`snowy owl`). Players do the mixing.
- Keep words short and drawable. Lowercase, trimmed, no leading "a" or "the".
- **Word form by role:**
  - `subjects`, `accents`: nouns, singular for things (`owl`, `teapot`). Body bits and parts that come in sets can be plural (`antlers`, `whiskers`).
  - `surfaces`: `materials` are mass nouns (`copper`, `velvet`), `textures` are adjectives (`bumpy`, `fuzzy`), `patterns` are plural or mass nouns (`stripes`, `honeycomb`), and `coverings` are plurals (`scales`, `barnacles`).
  - `behaviors-and-moods`: actions are `-ing` words or short `-ing` phrases (`tiptoeing`, `doing a cartwheel`); feelings and personalities are adjectives (`grumpy`, `curious`).
  - `elements-and-settings`: nouns (`thunderstorm`, `midnight`); `situations` are short phrases (`in a snow globe`, `upside down`).
  - `odd-properties`: short verb phrases (`glows in the dark`, `smells like toast`).

## Extending

- To add words, append them to a leaf's `words` list, then run the validator.
- To add a category, add a node with a new unique kebab-case `id`. Keep to 3 category levels.
- To add a tag, add it to `"tags"` in `tree.json` with its meaning and `use`, and add it to the table above.

## Stats

Word counts per role and per level-2 branch, generated by `node content/layer-roll/validate.mjs --update-readme`. The validator also prints per-leaf counts and words per tag per round. Counts include the 75 deliberate `dup` copies, so the number of distinct words is a little lower (6,387).

<!-- stats:start (generated by validate.mjs --update-readme) -->
| role | slot | rounds | level-2 branch | words |
|---|---|---|---|---:|
| **`subjects`** | item | outline, fill, details | *all* | **3279** |
| | | | `creatures` | 433 |
| | | | `people` | 371 |
| | | | `plants-and-fungi` | 310 |
| | | | `food` | 366 |
| | | | `objects` | 402 |
| | | | `machines-and-vehicles` | 354 |
| | | | `places` | 417 |
| | | | `cosmos` | 245 |
| | | | `tiny-world` | 221 |
| | | | `ideas-shapes-and-signs` | 160 |
| **`surfaces`** | item | fill, details | *all* | **838** |
| | | | `materials` | 304 |
| | | | `textures` | 243 |
| | | | `patterns` | 124 |
| | | | `coverings` | 167 |
| **`accents`** | item | details | *all* | **463** |
| | | | `body-bits` | 234 |
| | | | `small-parts` | 92 |
| | | | `decorations` | 137 |
| **`behaviors-and-moods`** | modifier | outline | *all* | **853** |
| | | | `moving` | 192 |
| | | | `doing` | 261 |
| | | | `together` | 52 |
| | | | `resting` | 48 |
| | | | `feelings` | 245 |
| | | | `personalities` | 55 |
| **`elements-and-settings`** | modifier | fill | *all* | **709** |
| | | | `weather` | 189 |
| | | | `fire-and-light` | 143 |
| | | | `earth-and-water-forces` | 133 |
| | | | `sky-events` | 44 |
| | | | `times-and-seasons` | 100 |
| | | | `situations` | 100 |
| **`odd-properties`** | modifier | details | *all* | **320** |
| | | | `senses` | 135 |
| | | | `changes` | 89 |
| | | | `magic-effects` | 48 |
| | | | `habits` | 48 |
| **total** | | | | **6462** |
<!-- stats:end -->
