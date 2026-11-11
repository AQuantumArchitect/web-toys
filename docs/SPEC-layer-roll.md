# Spec: Layer Roll (three-layer pass-the-paper drawing game)

Source: Luke's Aug 26 and Sep 17, 2025 family sessions (old Claude chats). Played with his kids at the table: everyone draws an **outline** from one rolled theme, passes the paper, the next person adds **mid details** from a second roll, passes again, and the next adds **fine details** from a third roll. Inspired by Chuck Lukacs's book *Fantasy Genesis* and by Exquisite Corpse / Telestrations.

## IP rule
Do not copy word lists, table layouts or text from *Fantasy Genesis* (the book is copyrighted) and do not call the toy "Fantasy Genesis" or use Minecraft names, mobs or logos. Write original tables. A one-line credit is fine: "Inspired by the layered-prompt idea in Chuck Lukacs's *Fantasy Genesis*."

## Rules Luke set while iterating (all must hold)
1. **One concept per layer.** Three results total (outline, mid, fine). Nine was too many.
2. **Roll All** rolls all three layers (an early bug rolled only stage 3).
3. **Tables two levels deep:** roll a category, then roll inside its sub-table.
4. **Uncoupled categories.** "Lightning" and "bird" are separate rolls the player melds; never pre-baked combos like "Lightning Bird".
5. **Behavior / action belongs on the outline layer** (stage 1), not in fine details.
6. **Mid details** are about surface, structure and material (e.g. scales, bark, rivets, moss); **fine details** are small accents (e.g. runes, buttons, freckles, tiny windows).
7. **Not just creatures.** Outline core types must include things like warrior, castle, tree, cave, weapon, machine, portal, altar, ship, mountain, vehicle, plant, building, as well as animals.
8. **Kid-friendly** content (his kids pick themes; one asked for no unicorns/rainbows, so offer a theme toggle rather than hard-coding).
9. Variety: results should feel very different from each other; avoid samey outputs.

## Structure
- Layer 1 Outline: Core type (category → item) + Behavior/action.
- Layer 2 Mid detail: Surface/material (category → item) + Environment/element modifier.
- Layer 3 Fine detail: Accent (category → item) + Magical/odd property.
- Each layer rolls its own category independently; per-layer re-roll and lock.
- Optional theme packs (on top of the base tables, ~half base / half theme): "Blocky world" (generic voxel-game flavor: blocks, pickaxes, torches, ores, creepy cube monsters, no trademarked names), "Space", "Ocean". Default: base only.

## Play modes
- **Party / rotate mode:** shows only the current layer big enough for a table; "Pass the paper" button reveals the next layer; a player count (2–8) and a round counter.
- **Solo mode:** all three at once.
- Seeded RNG with a shareable URL (`?seed=`), so a roll can be replayed.
- Copy-to-clipboard text: "Outline: a tree, sprinting. Mid: covered in rivets, under a waterfall. Fine: tiny glowing buttons, hums when touched."

## Size target
Each sub-table at least 8 items; at least 8 categories per layer. Keep tables in plain JSON/JS data files so non-coders can extend them.
