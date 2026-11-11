# Spec: Kid Lobber (hammock trebuchet calculator)

Source: Luke's Jul 30, 2025 design session (old Claude chat, 10 messages). Luke had built an ~18-inch trebuchet that throws marbles for his kids and was *speculating* about a much larger "kid lobber" that sets a child down in a lake or pool. The calculator is a physics toy for exploring that speculation. It is not a build guide.

## Framing (non-negotiable)
- A short, visible notice on the page: this is a simplified physics toy; numbers are rough estimates; never launch a person; test only with sandbag dummies; real rides need real engineering review. Keep it light, not preachy.
- G-force and landing-zone safety are first-class outputs, not footnotes.
- Name on the page: "Kid Lobber" (subtitle: hammock-trebuchet physics). Mention the 18-inch marble trebuchet as the origin story.

## Mechanism being modeled
Hammock-style "lobber", not a snap-launch trebuchet. The rider starts already lying in a full-body sailcloth sling (like a hammock) hanging from the long arm. The counterweight drops, the arm rotates, and the rider is lifted in a smooth arc. Two modes:
1. **Pendulum swing (default, safest):** no release; rider swings and is set down / dropped near the bottom.
2. **Ballistic release:** rider released at a chosen angle and flies a lazy, high, slow arc into water. Tuned for "slow and high", never "fast and long".
Ideas from the chat worth a footnote: dock-mounted so a short landing is still water; mildly elastic tethers; a phone in a bag of rice as an accelerometer (phyphox etc.); dummy runs first; parent-operated trigger.

## Inputs (from Luke's last revision; keep these defaults)
| Param | Default | Unit | Notes |
|---|---|---|---|
| armLength | 5.0 | m | total beam length |
| armRatio | 4.0 | – | long arm : short arm |
| counterWeight | 500 | kg | |
| projectileWeight (rider) | 50 | kg | |
| slingLength | 2.5 | m | hammock suspension length |
| startAngle | 30 | ° from horizontal | arm start position |
| fulcrumHeight | 8.0 | m | pivot height above ground/water |
| releaseAngle | 45 | ° from vertical | ballistic mode only |
| enableRelease | false | bool | pendulum vs ballistic |
Add: a **landing-zone multiplier** (default 1.0x height, Luke's original ask: "how far from the target we suspect they will land, with a safety of like 1x the height of launch"; his last code used 0.5x, so expose it as a slider 0.5–2.0).

## Model (port from `docs/reference/trebuchet-rev3-luke-2025-07-30.jsx`, then clean up)
- long/short arm split by ratio; counterweight drop height from geometry (start angle, short arm); usable energy with 70% efficiency (label it a heuristic, typical 30–50% for snap trebuchets, higher for slow rotational lifts).
- arm mass ≈ 15 kg per metre; moment of inertia I = I_arm + I_cw + I_payload; ω_max from energy; v = ω·r; centripetal g = v²/r/g (+1 g for gravity at the bottom of the swing — call out which is shown).
- Ballistic: release height, vx/vy at release, time of flight to ground/water level, range, apex height, impact speed √(vx² + vy_impact²).
- Pendulum: impact speed from swing height, v = √(2gh).
- Landing zone: expected distance ± (multiplier × max height); "clear from X m to Y m from the base".
- Design warnings: rider starts below ground; swing path or counterweight hits ground; release angle beyond max swing; NaN/N/A guards.

## Safety bands (Luke's last revision; show the number AND the band, highlighted, with how far over/under)
| Metric | Safe | Caution | Danger |
|---|---|---|---|
| Peak G | < 3 g | 3–5 g | ≥ 5 g |
| Max height above water | < 5 m | 5–10 m | ≥ 10 m |
| Impact speed | < 9 m/s | 9–13 m/s | ≥ 13 m/s |
Earlier in the session Luke said the 4 g pendulum threshold "was fine" and "a 10 meter fall is way too far", so keep the bands configurable in one constants file.

## UX bugs Luke filed (must not regress)
1. Every safety number is displayed and highlighted, not just a colour.
2. Roll-up summary at top: "lands at 8.5 m ± 2.1 m at 9.1 m/s, peak 2.8 g".
3. Calculations complete before render (no undefined on first paint); checkbox is a boolean.

## Nice to have
- Side-view SVG of the frame, arm, sling and the arc with the landing zone shaded.
- Energy budget bar (PE → losses → rider KE).
- Units toggle (metric / imperial).
- Share link via URL query params.
