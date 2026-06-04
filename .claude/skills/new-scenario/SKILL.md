---
name: new-scenario
description: Use when authoring a new RinkReads interactive question for the unified scenario engine (src/scenario/), creating or editing a seed in src/scenario/seeds/, or when the user runs /new-scenario.
---

# Authoring a RinkReads Scenario Seed

## Overview
A scenario is one interactive hockey "read": a rink scene (actors at normalized 0–1 coords) + one interaction + the correct answer + feedback. Seeds live as JSON in `src/scenario/seeds/*.json` and are **auto-merged into the live bank** by `qbLoader.js` (no edit to questions.json). Schema/typedefs: `src/scenario/schema.js`. Validator rules: `src/scenario/validators.js`.

**Core principle:** the engine is strict on purpose. A scenario that isn't a *real read* (no wrong-but-tempting option, a pass into a blocked lane, a difficulty that doesn't match complexity) is **rejected**, not warned. Author against the rules below or the seed won't pass.

## Iron rule: never ship without validating
After writing the seed, run the validator and only ship on `OK`:
```
node .claude/skills/new-scenario/validate-seed.mjs src/scenario/seeds/<id>.json
```
It runs schema checks + hockey-logic rules + a scorer self-test (replays your `correct` answer through the real scorer — if it doesn't grade as correct, the scenario is internally inconsistent). `err:` = must fix. `warn:` = look, may override.

## Coordinate system
- All actor `x,y` are **normalized 0..1**. `x`: defending end `0..0.5`, offensive end `0.5..1`. `y`: top boards `0` → bottom boards `1`. Center ice ≈ `(0.5, 0.5)`.
- Prefer **semantic zone IDs** over raw coords for the answer target — see `src/scenario/zones.js` (e.g. `oz-slot`, `dz-corner-strong`, `neutral-center`, `oz-half-wall-strong`). Use `{ "zoneId": "oz-slot" }`. Numeric `{x,y}` is allowed when no zone fits.
- Goalie sits in the crease: right end ≈ `(0.918, 0.5)`, left end ≈ `(0.082, 0.5)`.

## The four interaction primitives
| kind | user does | `interaction` fields | `correct` shape |
|------|-----------|----------------------|-----------------|
| `point` | taps one spot | `prompt` | `{kind:"point", zoneId}` or `{kind:"point", x, y}` |
| `selection` | picks teammate(s) | `prompt`, `from:[ids]`, `order:"any"\|"ordered"` | `{kind:"selection", ids:[...]}` |
| `sequence` | taps actors in order | `prompt`, `from:[ids]` | `{kind:"sequence", ids:[...]}` (≥2, ordered) |
| `path` | draws a line from the player | `prompt`, `verb`, `from:<player id>` | `{kind:"path", end:{zoneId|x,y}, waypoints?}` |

`path.verb` ∈ `skate carry pass shoot screen check backcheck`.

## Required structure (every seed)
```json
{
  "id": "u11_forecheck_angle_v1",
  "type": "scenario",
  "level": "U11 / Atom",
  "themes": ["forecheck", "angling"],
  "cat": "Forechecking",
  "difficulty": 2,
  "stage": { "view": "right", "zone": "off-zone" },
  "actors": [ /* exactly one kind:"player" (the YOU) + a puck + teammates/defenders/goalie */ ],
  "interaction": { /* see table */ },
  "correct": { /* kind MUST equal interaction.kind */ },
  "feedback": { "right": "...", "wrong": "..." },
  "tip": "one transferable cue",
  "why": "the teaching point"
}
```
- `id`: unique, snake_case, ends `_vN`. Filename = `<id>.json`.
- `level` is one of the exact display names (or use `levels:[...]` for multi-age): `"U7 / Initiation"`, `"U9 / Novice"`, `"U11 / Atom"`, `"U13 / Peewee"`, `"U15 / Bantam"`, `"U18 / Midget"`.
- `themes` come from this controlled vocabulary (off-vocab themes warn): `forecheck backcheck breakout regroup transition power-play penalty-kill even-strength offensive-zone defensive-zone-coverage neutral-zone zone-entry zone-exit face-off net-front cycle 1-on-1 2-on-1 3-on-2 odd-man-rush decision-making vision puck-support positioning pass-selection shot-selection gap-control angling scan memory anticipate react`.

## Hard rules the validator enforces (author to these)
- **Exactly one `player` actor** (the "YOU" POV). No more, no fewer.
- `correct.kind` **must match** `interaction.kind`.
- `interaction.prompt` ≥ **25 chars** (actually frame the read).
- **Goalie required** when `stage.zone` is `off-zone` or `def-zone`.
- **Defender minimums:** `def-zone` ≥2, `off-zone` ≥1 (≥3 if `power-play`), `neutral` ≥1.
- **On-stage:** for `view:"right"` every actor `x≥0.45`; `"left"` `x≤0.55`; `"neutral"` `0.30–0.70`. Off-stage actors never render → error.
- **No overlaps:** skaters must be ≥0.025 apart (puck may sit on its carrier).
- **selection:** `from` ≥2, every id is a real actor, `correct.ids` is a non-empty subset, and **not every candidate is correct** (there must be a wrong option).
- **sequence:** `from` ≥2, `correct.ids` ≥2, subset of `from`.
- **path:** `from` must be the `player`; the straight correct lane (player → `correct.end`) must **not** pass within **0.035** of any defender (`INTERCEPT_RADIUS`); path must be longer than the target tolerance.
- **path + verb `pass`:** must include a **tempting-but-blocked alternative** — another teammate that (a) is **>0.10 away** from the correct target AND (b) has a defender within 0.035 of the player→teammate lane. A blocked teammate sitting too close to the correct receiver does NOT count. So: put your decoy teammate clearly elsewhere, with a defender squarely in its lane.
- **difficulty floor:** counts **all non-puck actors** (the goalie included) as "skaters." ≥7 → ≥2; ≥9 → 3; `timer` → ≥2; `scanWindow` → 3; power-play/penalty-kill → ≥2. (A 6-skater scene + goalie = 7 → forces difficulty ≥2.)

**Geometry cheat:** a lane from A→B "hits" defender D if D is within **0.035** of the segment AB. To block a lane, drop a defender ~0.01–0.03 off it; to keep the correct lane clean, keep every defender >0.035 from it.

## Worked example (`path` + `pass` — validates clean)
The hardest primitive to get right. Note: correct lane `you → oz-half-wall-strong (RW)` is clear of both defenders; the tempting cross-ice lane `you → lw` is intercepted by `x1`.
```json
{
  "id": "u13_oz_entry_pass_v1",
  "type": "scenario",
  "level": "U13 / Peewee",
  "themes": ["zone-entry", "pass-selection", "vision", "decision-making"],
  "cat": "Transition",
  "difficulty": 2,
  "stage": { "view": "right", "zone": "off-zone" },
  "actors": [
    { "id": "you",  "kind": "player",   "x": 0.600, "y": 0.500, "tag": "YOU" },
    { "id": "puck", "kind": "puck",     "x": 0.602, "y": 0.498 },
    { "id": "rw",   "kind": "teammate", "x": 0.900, "y": 0.780, "tag": "RW" },
    { "id": "lw",   "kind": "teammate", "x": 0.850, "y": 0.220, "tag": "LW" },
    { "id": "c",    "kind": "teammate", "x": 0.720, "y": 0.500, "tag": "C"  },
    { "id": "x1",   "kind": "defender", "x": 0.740, "y": 0.360 },
    { "id": "x2",   "kind": "defender", "x": 0.780, "y": 0.500 },
    { "id": "g",    "kind": "goalie",   "x": 0.918, "y": 0.500 }
  ],
  "interaction": {
    "kind": "path", "verb": "pass", "from": "you",
    "prompt": "You carry the puck over the blue line into the zone. Draw the pass to the open teammate."
  },
  "correct": { "kind": "path", "end": { "zoneId": "oz-half-wall-strong" } },
  "feedback": {
    "right": "Strong-side wall to the RW. Both defenders collapsed to the middle, leaving the RW alone down the boards.",
    "wrong": "The weak-side LW is tempting, but X1 sits in that cross-ice lane and picks it off. The RW on the strong wall is the only clean option."
  },
  "tip": "On a zone entry, pass to the lane that's OPEN, not to the player who looks most dangerous.",
  "why": "Both D pinch middle, so the cross-ice pass gets intercepted but the strong-side boards open up."
}
```

## Workflow
1. Pick **age + concept + primitive** and a single read worth teaching.
2. Lay out the scene: place the `player` (YOU) + puck, the correct option, and at least one wrong-but-tempting option (covered teammate / blocked lane). Keep everyone on-stage for the chosen `view`.
3. Write `interaction`, then `correct` (matching kind). Prefer `zoneId` targets.
4. Write `feedback.right` / `feedback.wrong` that name *why* (not just "correct"); add `tip` (transferable) and `why` (the lesson). `tip` must differ from `feedback.right`.
5. Save as `src/scenario/seeds/<id>.json`.
6. **Validate** (command above). Fix every `err:`; resolve or consciously accept each `warn:`. Ship only on `OK`.

## Common mistakes (these are why the validator exists)
| Mistake | Fix |
|---------|-----|
| Only the right answer is on the board | Add a tempting-but-covered option; pass scenarios REQUIRE a blocked alternative. |
| Correct pass lane runs through a defender | Move the defender off the line, or pick a different open target. |
| Author by proximity ("nearest teammate") | The right read is who has *space*, not who's closest. |
| `difficulty:1` with 9 actors + timer | Raise difficulty to the complexity floor. |
| Actor off-stage for the view | Keep all actors within the view's x-range. |
| `correct.kind` ≠ `interaction.kind` | They must be identical. |
| Guessing pixel coords | Use a `zoneId` from `zones.js`. |
