# Rink area vocabulary

**Status:** reference / proposal. Written 2026-08-02 to support a positional-language
validator (`docs/factory/2026-08-02-playtest-findings.md` item 4: a prompt saying
"You have the puck up high in the zone" over geometry that puts the player mid-zone).

**What this is.** `src/play/rinkAnchors.js` names *points*. Copy names *areas*. This
document defines the areas numerically so that a validator can answer "is this actor
actually in the slot / up high / down low?" and map prompt language onto the answer.

**What this is not.** It does not change any code, and none of the regions below are
implemented anywhere yet. Where the codebase already disagrees with itself, this
document says so rather than picking a winner silently (see
[Known internal inconsistencies](#known-internal-inconsistencies)).

Terminology is grounded in common North American coaching usage and the sources listed
at the end. Everything numeric is derived from this repo's own drawn geometry, not from
the NHL rulebook, because the app's rink is what the player actually sees. Where the
app's geometry departs from regulation in a way that matters, it is flagged.

---

## 1. The two coordinate frames (read this first)

There are **two different rinks in this repo**, and the bug that prompted this document
lives in the second one. A validator that assumes one frame will be silently wrong on
half the content.

### Frame A: the feet frame (`rink-200x85`)

- Defined by `src/play/rinkAnchors.js`: `RINK = { length: 200, width: 85, midY: 42.5 }`.
- Origin top-left, x increases toward the right-hand net, y increases downward.
- Drawn by `src/play/AnimatedPlay.jsx`'s `RinkBackdrop()` (viewBox `0 0 200 85`).
- Used by: the play kernel (`src/play/plays/`, `src/play/kernels/`), `mirrorPlayY`,
  `validateAnchorFidelity.js`, and — re-centred into metres — `src/scenario-engine/rinkFrame.js`.
- This is an NHL-proportioned rink (200 x 85 ft, aspect 2.353).

Landmarks, taken directly from `RinkBackdrop()`:

| Landmark | Feet-frame value |
|---|---|
| Inner face of boards | x = 2 and x = 198; y = 2 and y = 83; corner radius 27 |
| Left goal line | x = 11.0 to 11.7 (`ANCHORS` uses 11.7 via `mirrorX`) |
| Left blue line | x = 74 to 76 (centre 75) |
| Centre red line | x = 99.2 to 100.8 (centre 100) |
| Right blue line | x = 124 to 126 (centre 125) |
| Right goal line | x = 188.3 to 189.0 (`ANCHORS.goalLineRight` = 188.3) |
| Right net | x = 189 to 193, y = 39 to 46 |
| Right crease (drawn) | arc (188.3, 38) to (188.3, 47), r = 6, bulging to x ≈ 186.3 |
| End-zone faceoff circles | centres (31, 22) (31, 63) (169, 22) (169, 63), r = 13 |
| Centre circle | (100, 42.5), r = 13 |
| Neutral-zone faceoff dots | **not drawn** |

**Zone depth (either end): 63.3 ft** from blue-line centre to goal line.

### Frame B: the normalized scenario frame

- Actors in `src/scenario/seeds/*.json` carry `x`, `y` in 0..1.
- Rendered by `src/scenario/RinkStage.jsx` over `src/RinkReadsRink.jsx`, whose
  `RINK_DIMENSIONS` describe a **60 m x 30 m IIHF-proportioned rink** (600 x 300 px at
  10 px/m, aspect 2.0), not a 200 x 85 ft rink.
- `src/scenario/zones.js` names semantic spots in this frame.

Landmarks, converted from `RINK_DIMENSIONS` to 0..1:

| Landmark | Normalized | Naive `x * 200` (ft) | Feet-frame actual | Δ |
|---|---|---|---|---|
| Left goal line | 0.0667 | 13.3 | 11.7 | +1.6 |
| Left blue line | 0.3550 | 71.0 | 75.0 | -4.0 |
| Centre | 0.5000 | 100.0 | 100.0 | 0 |
| Right blue line | 0.6450 | 129.0 | 125.0 | +4.0 |
| Right goal line | 0.9333 | 186.7 | 188.3 | -1.6 |
| End dot x (right) | 0.8333 | 166.7 | 169.0 | -2.3 |
| End dot y | 0.2667 / 0.7333 | 22.7 / 62.3 | 22 / 63 | ±0.7 |
| NZ dot x | 0.38 / 0.62 | 76 / 124 | not drawn | n/a |
| Right net | x 0.9333-0.952, y 0.4695-0.5305 | — | x 189-193, y 39-46 | — |
| Crease | **not drawn** (`Crease()` returns `null`) | — | drawn, ~2 ft deep | — |
| Faceoff circle rings & hash marks | **not drawn** (dot only) | — | drawn, r = 13 | — |

### The portable measure: zone-depth fraction `d`

Because the two frames disagree by up to 4 ft on the blue line, do **not** validate depth
language by converting normalized coords to feet. Use the fraction of zone depth, which
is exact in both frames:

```
Right end:  d = (x - X_blue_right) / (X_goal_right - X_blue_right)
Left  end:  d = (X_blue_left - x)  / (X_blue_left  - X_goal_left)

Feet frame:        X_blue = 125 / 75,      X_goal = 188.3 / 11.7
Normalized frame:  X_blue = 0.645 / 0.355, X_goal = 0.9333 / 0.0667
```

`d = 0` at the blue line, `d = 1` at the goal line, `d > 1` behind the goal line.

**`d` keys to the nearest goal line, not to attacking direction.** "High" means near the
blue line and "low" means near the goal line in *both* the defensive and the offensive
zone. That makes depth language checkable without resolving which team is attacking,
which matters because the repo resolves that inconsistently: `validators.js`'s
`attackingNetX(view)` derives it from `stage.view` alone, while `stage.zone` carries it
separately, and for a `view: "left"` + `zone: "def-zone"` board those two do not agree
about whose net is on screen.

### Lateral (y) conversion is lossy

Frame B's rink is relatively **~18% wider** than Frame A's (aspect 2.0 vs 2.353). A
normalized y of 0.16 sits 4.8 m off the boards in the rendered rink but only 4.14 m off
in the feet frame. Define lateral thresholds as **fractions of rink width**, never as
feet converted from a normalized value. Distance, angle, and pass-length checks are
distorted between the frames and should be computed within one frame only.

---

## 2. Named areas

All regions below are stated for the **right end** in the feet frame. Mirror to the left
end with `x → 200 - x` (exactly the `mirrorX` in `rinkAnchors.js`); every name and
definition is unchanged by that reflection.

Each area carries a **confidence** rating for validation purposes:

- **A** — safe to fail a build on. Geometry is unambiguous and coaches agree.
- **B** — safe to warn on. Definition is standard but the fences are judgment calls.
- **C** — describe only. Genuinely contested; a validator will produce false failures.

### 2a. Zones

| Name | Definition | Feet-frame region | Normalized region | Anchors inside | Conf. |
|---|---|---|---|---|---|
| **Right end zone** | Everything beyond the right blue line. | x ≥ 126 | x ≥ 0.6522 | every `*Right` anchor | A |
| **Left end zone** | Everything beyond the left blue line. | x ≤ 74 | x ≤ 0.3478 | (mirror) | A |
| **Neutral zone** | Between the blue lines. | 76 ≤ x ≤ 124 | 0.3622 ≤ x ≤ 0.6378 | `centerIce` (100, 42.5), `neutralTop` (100, 20), `neutralBottom` (100, 65) | A |
| **Defensive zone** | The end zone containing your own net. | as above, end selected by `stage.zone` / `view` | — | — | B |
| **Offensive / attacking zone** | The end zone containing their net. | as above | — | — | B |

Notes:

- The blue line is **2 ft wide** (124 to 126). Treat 124 ≤ x ≤ 126 (normalized
  0.6378 to 0.6522) as a dead band and never fail a zone claim inside it. Puck-over-line
  rules (which edge counts) are a rulebook matter this vocabulary does not model.
- "Defensive" and "offensive" are role labels, not places. The same physical ice is
  both, depending on who has it. Only `zone` + `view` on the board resolve it, so a
  validator should read them rather than infer from x.

### 2b. Depth bands within an end zone

These are the bands the live bug is about. They are pure depth (x); y is unconstrained.

| Name | Definition | `d` core | `d` grey band | Feet (right end) | Anchors inside | Conf. |
|---|---|---|---|---|---|---|
| **High / up high / top of the zone** | Near the blue line, well above the tops of the circles. | 0 ≤ d ≤ 0.30 | 0.30–0.38 | 125 to 144 (grey to 149) | `blueLineRightMid` (126, 42.5) d=0.02; `pointTopRight` (131, 22) and `pointBottomRight` (131, 63) d=0.09 | B |
| **Mid-zone / the middle of the zone** | Between the high band and the dots; half-wall depth. | 0.30 ≤ d ≤ 0.69 | 0.22–0.38 and 0.61–0.77 | 144 to 169 | `highSlotRight` (166, 42.5) d=0.65; `wallTopRight` (168, 14) / `wallBottomRight` (168, 71) d=0.68 | B |
| **Low / down low / below the dots** | From the dots to the end boards. | d ≥ 0.69 | 0.61–0.77 | 169 to 198 | `circleTopRight` / `circleBottomRight` (169, ±) d=0.70; `slotRight` (176, 42.5) d=0.81; `cornerTopRight` (184, 17) / `cornerBottomRight` (184, 68) d=0.93; `netFrontRight` (184.5, 42.5) d=0.94; `goalieRight` (187, 42) d=0.98; `goalLineRight` (188.3, 42.5) d=1.00 | B |
| **Behind the net / below the goal line** | Past the goal line. | d > 1.00 | 0.97–1.03 | x > 188.3 | `behindNetRight` (192.5, 42.5) d=1.07 | A |

**Where the fences come from.** The low fence at `d = 0.69` is the faceoff dots. That is
not arbitrary: the app draws the dots 19.3 ft from the goal line, and regulation puts
them at 20 ft of a 64 ft zone depth (d = 0.6875), so the app and the rulebook agree to
within half a percent. "Below the dots" is standard coaching shorthand for down low.
The high fence at `d = 0.30` is a **judgment call** — there is no line on the ice there.
It sits comfortably above the tops of the circles (d ≈ 0.49 in this app, 0.45
regulation), which is the nearest real landmark. Anything you would call "up high" is
above the circles; the 0.30 figure just puts a number on "clearly above".

**Grey bands are mandatory.** A validator must pass anything inside a grey band. The
bands are ±0.08 of zone depth (about ±5 ft), which is the same order as
`validateAnchorFidelity.js`'s existing `DEFAULT_POINT_TOLERANCE = 5`.

**"High slot" is not in the "high" band, and that is correct.** The high slot is high
*relative to the slot*, not high in the zone. `highSlotRight` sits at d = 0.65, well past
mid-zone. This is exactly the confusion that produced the live bug, so it is worth
stating in the validator's own error message.

### 2c. Specific spots

| Name | Definition | Feet-frame region (right end) | Anchors inside | Conf. |
|---|---|---|---|---|
| **The slot** (app's own polygon) | The scoring area in front of the net, between the circles. | Quadrilateral (169, 22) → (188.3, 34) → (188.3, 51) → (169, 63). Converted from `RinkReadsRink`'s `slot` preset. | `slotRight` (176, 42.5); `netFrontRight` (184.5, 42.5); `goalieRight` (187, 42) | C |
| **The slot** (wider common definition) | Same, but extended out to the tops of the circles. | Quadrilateral (156, 22) → (188.3, 34) → (188.3, 51) → (156, 63) | adds `highSlotRight` (166, 42.5) | C |
| **High slot** | Middle lane, from the dots up to the tops of the circles. | 156 ≤ x ≤ 172, 33 ≤ y ≤ 52 | `highSlotRight` (166, 42.5) | B |
| **Low slot / net front / "in tight"** | Middle lane from the crease out to the hash marks. | Quadrilateral (174, 34) → (188.3, 37) → (188.3, 48) → (174, 51). From `RinkReadsRink`'s `low-slot` preset. | `netFrontRight` (184.5, 42.5); `slotRight` (176, 42.5) | B |
| **The crease** | The goalie's painted area. | Drawn: x 186.3–188.3, y 38–47 (only ~2 ft deep). Regulation would be x 182.3–188.3, y 38.5–46.5. | none | C |
| **The point** | Where a defender stands at the blue line, off the middle. | 125 ≤ x ≤ 137, and (8 ≤ y ≤ 30 or 55 ≤ y ≤ 77) | `pointTopRight` (131, 22); `pointBottomRight` (131, 63) | A |
| **The corner** | The rounded end of the rink, outside the circles and low. | x ≥ 178, and (y ≤ 22 or y ≥ 63), inside the 27 ft corner radius | `cornerTopRight` (184, 17); `cornerBottomRight` (184, 68) | B |
| **The half-wall** | The boards midway between the blue line and the goal line. | 148 ≤ x ≤ 168, and (y ≤ 12 or y ≥ 73) | *none.* `wallTopRight` (168, 14) sits at the very low edge and 12 ft off the boards. | C |
| **The wall / the boards** | Play against the side boards, any depth. | Point-to-segment distance ≤ 10 to `WALL_SEGMENTS.right.top` (168, 14)→(184, 17) or `.bottom` (168, 71)→(184, 68). Already implemented in `rinkAnchors.js`. | `wallTopRight`; `wallBottomRight`; `cornerTopRight`; `cornerBottomRight` | A |
| **Behind the net** (strict) | Directly behind the goal, not just past the goal line. | x ≥ 193, 33 ≤ y ≤ 52 | `behindNetRight` (192.5, 42.5) — sits **on** the net's back edge (net is x 189–193), i.e. exactly on the boundary | B |
| **Faceoff circle (end zone)** | The 13 ft ring around an end-zone dot. | distance to (169, 22) or (169, 63) ≤ 13 | `circleTopRight`; `circleBottomRight`; `wallTopRight` / `wallBottomRight` fall just outside (dist 13.6) | A |
| **Faceoff dot** | The dot itself. | within 3 ft of (169, 22), (169, 63), (31, 22), (31, 63), (100, 42.5) | `circleTopRight`; `circleBottomRight` | A |
| **Top of the circles** | The point on a circle nearest the blue line. | x = 156 at y = 22 and y = 63; "at the top of the circles" ≈ 152 ≤ x ≤ 160 | none | B |
| **Centre ice** | Strictly the centre dot / centre circle; loosely the whole neutral zone. | Strict: distance to (100, 42.5) ≤ 13. Loose: the neutral zone. | `centerIce` (100, 42.5) | C |

### 2d. Lines and lanes

| Name | Definition | Feet-frame region | Anchors | Conf. |
|---|---|---|---|---|
| **Blue line** | The 2 ft blue stripes. | 124 ≤ x ≤ 126 (right), 74 ≤ x ≤ 76 (left). "At the blue line" ≈ 121 ≤ x ≤ 129. | `blueLineRightMid` (126, 42.5) | A |
| **Goal line** | The red line across the goal mouth. | 188.3 ≤ x ≤ 189.0 (right), 11.0 ≤ x ≤ 11.7 (left). Drawn only from y = 9 to y = 76. | `goalLineRight` (188.3, 42.5) | A |
| **Centre red line** | The red line at centre ice. | 99.2 ≤ x ≤ 100.8 | `centerIce` | A |
| **Boards / the wall** | The perimeter. | within 10 ft of the inner face: y ≤ 12, y ≥ 73, x ≤ 12, x ≥ 188 | all wall and corner anchors | A |
| **Middle lane / the dots lane / the middle** | The strip between the two dot lines. | 22 ≤ y ≤ 63 | `slotRight`, `highSlotRight`, `netFrontRight`, `centerIce`, `blueLineRightMid`, `behindNetRight`, `goalieRight` | B |
| **Outside lane / wing lane / the outside** | Outside the dot lines. | y < 22 or y > 63 | `pointTopRight`/`pointBottomRight`, `circleTopRight`/`circleBottomRight`, `wallTopRight`/`wallBottomRight`, `cornerTopRight`/`cornerBottomRight`, `neutralTop`/`neutralBottom` | B |
| **Strong side / weak side** | The side of the ice the puck is on, and the far side. | Computable only with the puck's y: strong side = same side of `midY = 42.5` as the puck. **`zones.js` instead hard-codes strong = bottom (y ≈ 0.78) and weak = top (y ≈ 0.22).** | — | C |
| **Home plate / the house** | The high-danger scoring area: goal line out to the tops of the circles, widening from the posts. | Same polygon as the wider slot definition above. Not a separate region. | as wider slot | C |
| **Royal road** | The imaginary centre line the goalie tracks across. | y = 42.5 | `centerIce`, `slotRight`, `netFrontRight`, `goalLineRight`, `behindNetRight` | B |

---

## 3. Copy synonyms

The phrases below are what actually appears in this repo's prompts, options, feedback and
tips (grepped across `src/data/bank.json`, `src/data/povQuestions.json`,
`src/scenario/seeds/`, `src/play/plays/`, `src/play/kernels/`). A validator maps a matched
phrase to the region, then tests containment.

### Standard (U13+) copy

| Region | Phrases in use |
|---|---|
| High / up high | "up high", "high in the zone", "up top", "at the top of the zone", "the high forward", "F3 high", "stay high" |
| Mid-zone | "mid-zone", "the middle of the zone", "at the half-wall", "on the wall" |
| Low / down low | "down low", "low in the zone", "below the dots", "low on the strong side", "in deep" |
| Behind the net | "behind the net", "below the goal line", "behind the cage" |
| The point | "the point", "at the point", "up at the point", "the D at the point", "walking the line", "the blue line" |
| Slot | "the slot", "in the slot", "the middle", "the scoring area", "the house", "home plate" |
| High slot | "the high slot", "the top of the slot", "the bumper" (1-3-1 power play only) |
| Low slot / net front | "net front", "the net front", "in front of the net", "in tight", "the low slot", "the doorstep", "back post", "backdoor" |
| Crease | "the crease", "the blue paint", "the paint" |
| Corner | "the corner", "in the corner", "the far corner" |
| Half-wall | "the half-wall", "the half wall", "the wall", "the boards" |
| Wall / boards | "the wall", "the boards", "along the boards", "on the wall", "rimmed around the boards" |
| Faceoff circle | "the circle", "the faceoff circle", "the top of the circles", "the hash marks", "the dot" |
| Blue line | "the blue line", "at the line", "the offensive blue line" |
| Goal line | "the goal line", "below the goal line", "goal-line extended" |
| Centre ice | "centre ice", "center ice", "the centre dot", "the middle of the ice" |
| Middle lane | "the middle", "the middle lane", "the dot lane", "inside", "the middle of the ice" |
| Outside lane | "the outside", "wide", "down the wing", "the perimeter", "off the wall" |

### Kid-facing (`youngQ` / `youngT` / `youngLabel`, U7-U11)

The young variants in the repo deliberately avoid all of the jargon above. This is the
existing house style and should be preserved: **no "the point", "the slot", "half-wall",
"the high slot", "blue line" or "F3" in young copy.** What is actually used:

| Region | Young phrases in use |
|---|---|
| Slot / middle lane | "the middle", "the open middle", "inside", "go inside and help", "stay in the middle" |
| Net front | "in front of the net", "go out in front of the net" |
| Behind the net | "behind the net", "wait behind the net", "chase behind", "follow behind" |
| Corner | "the corner", "skate away to the corner" |
| Wall / boards | "the wall", "go to the wall", "race to the wall up ahead" |
| Outside lane | "outside", "go outside" |
| Own end | "your goalie", "back into your goalie", "back way in" |
| High / low | **not used spatially.** Depth language is expressed as "up ahead", "back", "away from the net", "close to the net". |

Two hazards in the young vocabulary specifically:

- **"low side" and "far side" appear in `youngT` as width words**, not depth words (e.g.
  "The one already coming fast, low side"). A validator that maps "low" to the depth
  band will mis-handle these. Match "down low" / "low in the zone", not bare "low".
- **"the wall" is used for both the boards and the half-wall.** Only the boards sense is
  reliably checkable.

---

## 4. Handedness and mirroring

Three mirror transforms exist:

| Transform | File | Operation | Frame |
|---|---|---|---|
| `mirrorX(point)` | `src/play/rinkAnchors.js` | x → 200 - x (reflect across centre ice) | feet |
| `mirrorPlayY(play)` | `src/play/playVariants.js` | y → 85 - y (reflect across the long axis) | feet |
| `mirrorView(p)` | `src/scenario/formations/geometry.js` | x → 1 - x | normalized |

### What survives a mirror

**Invariant under `mirrorX` / `mirrorView` (end-to-end reflection):** every name in this
document. Depth language (high, low, point, slot, corner, behind the net, half-wall) is
defined relative to *that end's* goal line, so it reads identically at either end. This
is why `d` is defined per-end rather than globally.

**Invariant under `mirrorPlayY` (side-to-side reflection):** all depth language, plus
slot / high slot / net front / crease / centre ice, because they straddle `midY`. The
paired anchors swap: `circleTopRight` ↔ `circleBottomRight`, `cornerTopRight` ↔
`cornerBottomRight`, `wallTopRight` ↔ `wallBottomRight`, `pointTopRight` ↔
`pointBottomRight`, `neutralTop` ↔ `neutralBottom`.

### What does not survive a mirror

These are direction-dependent. Copy containing them cannot be reused across a mirrored
variant without rewriting, and a validator should flag their presence on any play that
has a `variantOf` mirror sibling:

- **Side names:** "left wing", "right wing", "left point", "right point", "the left
  side", "the top of the screen", "the near side" / "the far side".
- **Off-wing / strong side / weak side.** Strong side follows the puck, so the *name* is
  invariant but the *y* is not. `zones.js` hard-codes strong = bottom, so mirroring a
  scenario built from `zoneId`s silently inverts strong and weak.
- **Goalie-relative:** "glove side", "blocker side", "short side", "far pad". The
  `mirrorPlayY` docstring already notes that mirroring turns glove-side reads into
  blocker-side reads.
- **Player-relative:** "forehand", "backhand", "your left", "your right", "over your
  shoulder". These depend on the player's handedness and facing, neither of which the
  frame models for most actors (`actor.facing` exists in `RinkStage` but is rarely set).
- **"Backdoor"** means the weak-side back post. The concept mirrors cleanly; any copy
  that spells out *which* post does not.

### Which end is "yours"

`stage.zone` (`def-zone` / `neutral` / `off-zone`) names the end's role; `stage.view`
(`left` / `right` / `neutral` / `full`) crops the render. In the current seeds the two
travel together (`view: "left"` boards are all `def-zone`, `view: "right"` boards are all
`off-zone`), but nothing enforces that, and `validators.js`'s `attackingNetX()` derives
attacking direction from `view` alone. **Depth validation should not use either.** Key
`d` to whichever goal line is nearer the actor and the question disappears.

---

## 5. Where the terminology is genuinely contested

These are not gaps in research. Coaches disagree, and a validator built on the contested
reading will emit false failures. Rated **C** above.

1. **How far out the slot extends.** The common definition runs the slot from the net out
   to the *tops of the circles* (Wikipedia, Ice Hockey Moms). This app's own `slot`
   preset in `RinkReadsRink.jsx` runs it only to the *dots*, 13 ft shallower. Both are
   defensible. **Recommendation:** validate against the *union* (the wider polygon) so a
   correct-but-generous "in the slot" never fails, and never assert the negative
   ("not in the slot") from geometry alone.

2. **Whether the slot is bounded by the circles or by the posts.** "Between the faceoff
   circles" can mean between their *centres* (a 41 ft strip) or between their *inner
   edges* (a 15 ft strip). Most diagrams draw a trapezoid widening from the posts, which
   is neither. The polygon in this document is the trapezoid.

3. **Whether "high" always means toward the blue line.** In zone play, yes, in both ends.
   But three other senses are live in this repo's copy:
   - *shot placement*: "shoot for high glove or low blocker" (`povQuestions.json`),
   - *role*: "the high forward (F3)" (`bank.json`, `u15_scanning_weakside_v1.json`),
   - *quality*: "low-percentage play", "high-danger area".
   
   A string-matching validator must exclude all three or it will fire constantly.

4. **Where the half-wall is.** Textbook: midway between the blue line and the goal line
   (d ≈ 0.5, x ≈ 157). This repo places it at d ≈ 0.68 (`ANCHORS.wallTopRight`) and at
   d ≈ 0.88 (`zones.js` `oz-half-wall-*`), and `RinkReadsRink`'s `half-wall-off` preset
   places it at d ≈ 0.17–0.35 *in the middle of the ice, nowhere near the boards*. Three
   incompatible definitions inside one repo. **Do not validate "half-wall" until this is
   settled.**

   > **ESCALATED 2026-08-03 — this is no longer only a naming problem, and it now
   > needs a decision rather than a deferral.**
   >
   > The seed audit
   > ([`audits/2026-08-03-prompt-vs-coordinates.md`](../manual-playtest/audits/2026-08-03-prompt-vs-coordinates.md))
   > found that because `oz-/dz-half-wall-*` sit at **net-front depth**, four boards
   > key a "correct" answer that routes the puck **through the goalie** — the pass
   > line passes within 1.0 m of the keeper, inside the engine's own 0.035 intercept
   > radius:
   >
   > - `u15_scanning_weakside_v1` (the instance Thomas reported at [16:21])
   > - `u13_oz_structure_place_v1`
   > - `u13_oz_winger_wall_tf_v1`
   > - `u13_breakout_position_place_v1` — **worst case: it teaches a U13 to pass
   >   across the front of their own crease**
   >
   > Only the first was ever reported. The other three are the same defect, unreported.
   > That makes this the project's own worst-defect category — a wrong "correct answer"
   > reaching a child — not a vocabulary tidy-up.
   >
   > **NOT fixed unilaterally, deliberately.** Moving a zone coordinate changes the
   > keyed answer of every scenario referencing it, which is a hockey judgment call and
   > is explicitly outside the standing proactive-fix license. It needs Thomas's call.
   >
   > **Recommendation:** adopt the `ANCHORS` set, which §"anchor comparison" below
   > already argues is the better-grounded vocabulary for slot and high slot. For the
   > half-wall that puts it near the faceoff-dot depth against the boards — roughly
   > `x 0.82 / 0.18` rather than `0.90 / 0.10`, keeping `y 0.78 / 0.22`. One edit to
   > four `zones.js` entries corrects all four boards at once. Every scenario
   > referencing those zones must then be re-verified, since their keyed answers move.

5. **Where the corner starts.** Some coaches count everything below the goal line;
   others count from the bottom of the circles. This repo's `cornerTopRight` sits 4 ft
   *above* the goal line, i.e. the looser reading.

6. **Centre ice.** Strictly the centre dot and circle; colloquially the whole neutral
   zone. "He picked it up at centre ice" almost always means the latter.

7. **"Down low" for a defenceman vs a forward.** For a D in their own end, "low" often
   means below the goal line. For a forward in the offensive zone, "low" starts around
   the dots. Same word, different fence, by role.

8. **Age dependence — this one is structural.** Hockey Canada plays U7 **cross-ice** and
   U9 **half-ice** (max 100 x 85). There is no blue line in their game, no point, no
   neutral zone. Zone and point language is not merely jargon at those ages, it describes
   ice they never play on. `RinkStage.jsx` already suppresses position tags for U7/U9;
   the same gate should apply to zone vocabulary. For U7/U9 boards, validate only
   net-relative language (in front of the net, behind the net, the corner, the wall, the
   middle).

---

## 6. What is NOT safely checkable from coordinates

A validator that promises these will produce noise. Listing them so the scope stays
honest.

1. **Anything needing a third dimension.** "Top corner", "upstairs", "high glove", "along
   the ice", "roof it", "the puck was in the air". The frame is 2D. No z, no puck height.

2. **Anything needing facing or handedness.** "Forehand", "backhand", "on your strong
   side", "over your shoulder", "your left". `actor.facing` is optional and mostly unset,
   and shooter handedness is not modelled at all.

3. **Anything needing motion.** "Coming down the wing", "driving wide", "cutting to the
   middle", "the trailer", "skating back", "already coming fast". A seed is a static
   frame with no velocity. (`src/scenario-engine/physics/` has tracks, but seeds do not
   use them.) Multi-node plays have per-node positions, so a claim can only ever be
   checked against the node it appears on — never across nodes.

4. **Relational judgments.** "Open", "covered", "has time and space", "no one near",
   "under pressure". `validators.js` already approximates some of these
   (`lineHitsCircle`, `PASS_INTERCEPT_RADIUS = 0.035`), but "open" is a coaching call
   about closing speed and stick position, not a distance threshold.

5. **The crease.** `RinkReadsRink`'s `Crease()` returns `null`, so in the scenario frame
   the crease is not drawn at all. In the feet frame it is drawn only ~2 ft deep instead
   of 6. "In the crease" cannot be validated in either frame; use net-front instead.

6. **The circles and hash marks in the scenario frame.** `FaceoffCircle` renders a dot
   only (rings and hash marks were deliberately removed). Copy that says "at the top of
   the circles" or "at the hash marks" is asking a player to read a landmark that is not
   on screen. That is a *copy* problem the validator can flag by presence, but the
   geometry test itself would pass.

7. **Strong side / weak side, when the puck is central.** Within a few feet of
   `midY = 42.5` the call is meaningless. Also unreliable whenever `zones.js`'s
   hard-coded strong = bottom convention is what produced the coordinates.

8. **Zone claims near a blue line.** The line is 2 ft wide and the two frames disagree by
   4 ft on where it is. Inside x ∈ [120, 130] (right) the call is not trustworthy.

9. **Whether the named area is the *right* area to name.** Containment is checkable;
   tactical aptness is not. "You're in the slot" can be geometrically true and still the
   wrong thing to say about the read.

10. **Which actor the copy refers to.** "You have the puck up high" implicates the
    `player` actor; "your winger is down low" implicates a specific teammate. Resolving
    the subject of a spatial claim is an NLP problem, not a geometry one, and is the most
    likely source of false positives in a naive implementation.

---

## 7. Known internal inconsistencies

Found while writing this. All are pre-existing; none are fixed here.

**`zones.js` and `ANCHORS` disagree on the same names.** Converting `zones.js`'s
normalized offensive-zone entries to the feet frame via `d`:

| Term | `ANCHORS` (ft) | `zones.js` → ft | Δ (ft) | Verdict |
|---|---|---|---|---|
| point | 131 | 137 | 6 | tolerable |
| net front | 184.5 | 181.0 | 3.5 | fine |
| corner | 184 | 187.5 | 3.5 | fine |
| **slot** | 176 | 163.4 | **12.6** | `zones.js`'s "slot" is roughly where the high slot is |
| **high slot** | 166 | 150.0 | **16.0** | `zones.js`'s "high slot" is above the tops of the circles |
| **half-wall** | 168 | 181.0 | **13.0** | `zones.js`'s "half-wall" is at net-front depth |

`validateAnchorFidelity.js` uses `DEFAULT_POINT_TOLERANCE = 5`. The bottom three exceed
it by 2–3x, so the two vocabularies are not interchangeable and a validator must pick
one. **`ANCHORS` is the better-grounded set** for slot and high slot: `slotRight` is
12.3 ft out from the goal line (low slot, crease-to-hash-marks) and `highSlotRight` is
22.3 ft out (just above the dots, dots-to-tops-of-circles). Both match the standard
definitions. `zones.js`'s versions are shifted one step high.

**`zones.js` `oz-half-wall-*` and `oz-net-front` sit at identical depth** (x = 0.90 for
both, differing only in y). A half-wall at net-front depth is not a half-wall.
Mirrored identically in the `dz-*` entries.

**`RinkReadsRink`'s `half-wall-off` preset** is a box at x 417–447 px, y 110–190 px —
high in the zone and in the *middle* of the ice, not against the boards. It appears to
be unrelated to any half-wall.

**`RinkReadsRink`'s `points-off` preset** covers the entire top and bottom third of the
offensive zone from the blue line to the goal line. That is the outside lanes, not the
points.

**`ANCHORS.behindNetRight` (192.5, 42.5) sits on the net's back edge** (the net is drawn
x 189–193), leaving only 5 ft of ice between it and the end boards. It is on the boundary
of the region it names.

**Rink proportions differ between the two frames** (200x85 ft vs 60x30 m). Everything in
section 1 follows from this. It is not obviously wrong — the scenario rink is IIHF-sized
and the play rink is NHL-sized — but nothing in the code acknowledges it.

---

## 8. Worked example: the live bug

`src/scenario/seeds/gvis_u11_time-and-space_4we8.json`, `stage: { view: "right",
zone: "off-zone" }`, prompt: *"You have the puck up high in the zone."*

| Actor | Normalized x | `d` | Band | Reading |
|---|---|---|---|---|
| `you` (YOU, has puck) | 0.80 | **0.538** | mid-zone | claimed "up high" |
| `t1` (LW) | 0.66 | 0.052 | high | at the top point |
| `t2` (RW) | 0.86 | 0.746 | low | down low |

The claim requires `d ≤ 0.30` (grey to 0.38). The actor is at `d = 0.538`, which is
0.16 of zone depth outside the grey band — about 10 ft in the feet frame, twice the
existing anchor tolerance. This is a clean, unambiguous fail with margin, which is what
makes it a good first test case.

The geometry is fine; only the copy is wrong. Accurate copy would be along the lines of
"You have the puck in the middle of the zone," with the LW up at the blue line and the RW
down low. (This document does not make that edit — item 4 in the playtest findings is
flagged as wanting a human eye.)

---

## 9. Recommended validation order

Build in tiers. Each tier is a separate, shippable step.

**Tier 1 — build this first.** High confidence, unambiguous geometry, real findings
behind it.

- Depth bands: high / mid / low / behind the net, via `d` with the ±0.08 grey band.
- Behind the net vs. in front of the net (`d` above or below 1.0).
- Zone membership (defensive / neutral / offensive), with the blue-line dead band.
- The point (a genuinely tight region, and heavily used in copy).
- Wall / boards proximity, reusing the existing `distanceToSegment` + tolerance 10.

Tier 1 alone would have caught the live bug.

**Tier 2 — after Tier 1 has run clean over the catalog.** Standard definitions, softer
fences. Emit warnings, not errors.

- Slot, using the *union* polygon.
- High slot, low slot / net front.
- Corner, faceoff circle, faceoff dot, blue line, goal line.
- Middle lane vs outside lane.

**Tier 3 — do not build yet.**

- Half-wall (three conflicting definitions in-repo; settle them first).
- Strong side / weak side (needs the puck, and `zones.js`'s hard-coded convention
  fights it).
- Crease (not drawn in one frame, decorative in the other).
- Centre ice (strict vs loose sense).

**Cross-cutting rules for any tier.**

- Compute in one frame. Use `d` and width fractions, never feet converted from normalized.
- Never assert a negative from geometry alone. Flag "copy says X, geometry says not-X",
  and never "geometry says Y, so the copy should say Y".
- Exclude the non-spatial senses of "high" and "low" (shot placement, role, percentage)
  before matching.
- Skip zone/point/blue-line vocabulary entirely on U7/U9 boards; check only net-relative
  terms there.
- Warn (do not fail) when copy names a landmark the renderer does not draw: the circles,
  the hash marks, the crease, the neutral-zone dots.

---

## Sources

External, for terminology:

- [Ice hockey rink — Wikipedia](https://en.wikipedia.org/wiki/Ice_hockey_rink) — NHL and IIHF dimensions, goal line 11 ft from the end boards, blue lines 75 ft, end-zone faceoff spots 20 ft from the goal line and 22 ft off centre, 15 ft circle radius, 28 ft corner radius.
- [Slot (ice hockey) — Wikipedia](https://en.wikipedia.org/wiki/Slot_(ice_hockey)) — slot, high slot (tops of the circles to the hash marks), low slot (crease to the hash marks).
- [Rink Terminology — Greg Revak, Hockey IQ Newsletter](https://hockeysarsenal.substack.com/p/rink-terminology) — house / home plate, dot lane, point, half-wall, elbow, royal road, hash marks.
- [What is the Slot in Hockey — Ice Hockey Moms](https://icehockeymoms.com/what-is-the-slot-in-hockey-a-comprehensive-guide-for-parents/) — parent-facing slot definition; half-wall as midway between the blue line and the goal line.
- [Rule 103: Division of Ice Surface — USA Hockey](https://www.usahockeyrulebook.com/page/7617/rule-103-division-of-ice-surface) — zone definitions and line specifications.
- [Under-7 cross-ice game play rules — Hockey Canada](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-7/associations/game-play-rules) and [Under-9 half-ice game play rules](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-9/associations/game-play-rules) — U7 cross-ice, U9 half-ice at a maximum of 100 x 85, which is why zone vocabulary does not apply at those ages.

In-repo, for geometry (everything numeric above is derived from these, not from the
rulebook):

- `src/play/rinkAnchors.js` — `RINK`, `ANCHORS`, `WALL_SEGMENTS`, `mirrorX`, `distanceToSegment`.
- `src/play/AnimatedPlay.jsx` — `RinkBackdrop()`, the drawn 200x85 backdrop; `VIEWS`.
- `src/play/validateAnchorFidelity.js` — existing tolerances (5 point, 10 segment) and their derivation.
- `src/play/playVariants.js` — `mirrorPlayY`, and the note that mirroring flips glove-side to blocker-side.
- `src/RinkReadsRink.jsx` — `RINK_DIMENSIONS`, `ZONE_PRESETS` (`slot`, `low-slot`, `points-off`, `corners-off`, `half-wall-off`), `FaceoffCircle`, `Crease`.
- `src/scenario/RinkStage.jsx` — normalized-to-pixel plotting, `computeViewBox`, U7/U9 tag suppression.
- `src/scenario/zones.js` — the semantic `zoneId` vocabulary.
- `src/scenario/validators.js` — `actorOnStage` view crops, `attackingNetX`, `youngestU`, `lineHitsCircle`.
- `src/scenario/formations/geometry.js` — `mirrorView`, `wideY`, `CREASE_RIGHT` / `CREASE_LEFT`.
- `src/scenario-engine/rinkFrame.js` — the metric frame and `feetPointToRinkFrame()`.
- `docs/factory/2026-08-02-playtest-findings.md` — the originating bug.
