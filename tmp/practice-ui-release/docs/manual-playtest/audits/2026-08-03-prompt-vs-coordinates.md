# Audit — prompt text vs. rendered coordinates

**Date:** 2026-08-03
**Scope:** every seed in `src/scenario/seeds/` including `_pending/`, excluding `_retired/`.
**Trigger:** CONTENT-5, CONTENT-7, CONTENT-8 (session 1) and S2-11, S2-22, S2-23 (session 2)
— four separate reports of the same defect class, which makes it a lint rather than four patches.
**Corpus:** 30 files / 34 frames (branch nodes and multi-step frames counted separately).
**Result:** **22 findings — 15 errors, 7 warnings — across 13 of the 28 top-level seeds.**

Nothing in this repo was modified. This document is the only file produced.

---

## 0. Confidence in the coordinate model — read this first

A wrong coordinate model would make every finding below worthless, so it is stated
up front with its confidence rating.

**High confidence (safe to fail a build on):**

| Landmark | Normalized | Source |
|---|---|---|
| Rink | 60 m x 30 m IIHF, aspect 2.0 | `src/RinkReadsRink.jsx` `RINK_DIMENSIONS` |
| x axis | 0 = left boards, 1 = right boards; **1.0 x-unit = 60 m** | `src/scenario/schema.js` lines 8-12 |
| y axis | 0 = top boards, 1 = bottom boards; **1.0 y-unit = 30 m** | same |
| Right goal line | **0.93333** = (60-4)/60 | `RINK_DIMENSIONS`, goal line 4 m from the end |
| Right blue line | **0.64500** = (60-4-17.3)/60 | goal-line-to-blue 17.3 m |
| Left blue / goal line | 0.35500 / 0.06667 | mirror |
| Zone depth `Z` | **0.28833** of x | derived |
| Depth fraction `d` | `(x - 0.645) / 0.28833` right end; mirrored left. 0 at the blue line, 1 at the goal line, >1 behind the net | `src/scenario/positionalLanguage.js` lines 22-33 |
| End-zone faceoff dot lines | y = 0.2667 and 0.7333 | `docs/references/rink-area-vocabulary.md` sec.1 |
| Right net mouth | x 0.9333-0.952, y **0.4695-0.5305** (1.83 m of a 30 m sheet) | same |
| Engine pass-intercept radius | 0.035 normalized | `validators.js:14`, `schema.js:203` |

These are cross-checked three ways: `positionalLanguage.js` derives the same two
constants from the same arithmetic and its test file asserts them
(`positionalLanguage.test.mjs` lines 18-22); `docs/references/rink-area-vocabulary.md`
sec.1 tabulates the full set; and `validators.js` hard-codes 0.645/0.355 in
`noOffsides` and `offsidesOnEntry`. All three agree. **Confidence: high.**

**Medium confidence (warn, do not fail):** the band fences. `d <= 0.30` for "high"
is explicitly a judgment call with no line on the ice (vocab doc sec.2b); `d >= 0.69`
for "low" is the dot line and matches regulation to within 0.5%. Every check below
applies the doc's mandated **+/-0.08 grey band** and passes anything inside it.

**Low confidence / deliberately NOT validated:**

- **The half-wall.** Three incompatible in-repo definitions (`ANCHORS` d~0.68,
  `zones.js` d~0.88, `RinkReadsRink`'s `half-wall-off` preset d~0.17-0.35, in the
  middle of the ice). The vocab doc says do not validate until settled. I did not.
  Where a finding below touches a `*-half-wall-*` zone it is flagged as a
  **vocabulary** problem, not a containment failure.
- **The high slot.** `zones.js` `oz-high-slot` (x 0.75, d 0.364) and `ANCHORS.highSlotRight`
  (d 0.65) disagree by 16 ft. High-slot checks are **warn only** and say so.
- **The crease.** `RinkReadsRink`'s `Crease()` returns `null` — not drawn at all in this
  frame. Nothing is validated against it; net-front is used instead.
- **Anything needing motion, facing, handedness, or a third dimension.**

**One caveat that affects every distance number below.** The frame is anisotropic:
0.01 in x is 0.6 m, 0.01 in y is 0.3 m. The engine's own scorer uses **raw normalized**
distance (`lineHitsCircle`, radius 0.035), so lane checks are reported in normalized
units to match what the engine will actually do, with the metric equivalent in
brackets for hockey judgment. Do not convert normalized coords to feet via `x * 200` —
that misplaces the blue line by 4 ft and distorts lateral distance by ~18%.

---

## 1. What `positionalLanguage.js` already covers

Read in full (`src/scenario/positionalLanguage.js`, 115 lines, plus its 93-line test).

**Covers:**

1. `zoneDepth(x, view)` — the portable depth fraction `d`, keyed off `stage.view`,
   correct at both ends. This is the right primitive and everything below reuses it.
2. Exactly **two depth bands**: `high` (core `d<=0.30`, grey to 0.38) and `low`
   (core `d>=0.69`, grey to 0.61).
3. Exactly **four phrases**: `up high in the zone`, `at the top of the zone`,
   `down/low in the zone`, `down low` (with a negative lookahead excluding "low side").
4. **One subject**, resolved as: the actor tagged `YOU`/id `you`, else the
   `puckCarrier`. It never considers any other actor, and never the keyed answer.
5. Correctly **excludes** three non-spatial senses of high/low (shot placement,
   role, quality) — proven by four test cases.
6. Text scanned: `interaction.prompt`, `interaction.q`, `prompt`, `sit`, `q`.

**Does not cover — the whole gap this audit fills:**

| Not covered | Consequence |
|---|---|
| Any subject other than YOU / the carrier | "the LW is in front of the net" is never checked |
| The **keyed answer** as a subject | "drop low" / "relocate to the weak side" is never checked |
| `feedback.right` / `feedback.wrong` / `mc.stem` / `read.cue` | most spatial claims in this corpus live in feedback, not the prompt |
| Named **spots** (slot, corner, net front, point, behind the net, wall) | only two depth bands exist |
| **Premise** claims ("a forechecker has sealed…", "the D has shaded toward…") | the situation the prompt asserts is never compared to the board |
| **Relational** claims ("you are first forechecker") | never checked |
| **Lane** geometry against the **goalie** | `schema.js:291-315` checks defenders on `path` answers only; the goalie is checked by nothing, anywhere |
| `point` and `place` answers | the existing lane check is `path`-only |
| Offside | `validators.js` has `noOffsides`/`offsidesOnEntry`, but only for `stage.zone` off-zone/neutral with a left/right view; the gym drills have no rink model at all |
| Anisotropy | no distance check anywhere accounts for 60 m x vs 30 m y |

It is also **not wired into the seed pipeline**: `schema.js` imports
`runHockeyValidators` from `validators.js` but never imports
`validatePositionalLanguage`. Grep confirms the only importer is its own test file.
So even the two bands it does cover are not enforced on authoring today.

---

## 2. The checks

Thirteen rules. Each names the prompt vocabulary it keys off, the geometric
predicate, and its severity. `err` = the copy asserts something the coordinates
contradict. `warn` = judgment fence or a known in-repo vocabulary conflict.

| ID | Prompt vocabulary | Geometric assertion | Sev |
|---|---|---|---|
| **PC-1** | `up high in the zone`, `top of the zone`, `high forward`, `down low`, `low in the zone`, `cycling (the puck) low`, `drop low`, `in deep` | subject's `d` inside the claimed band incl. grey; subject = keyed answer if a destination verb precedes, else the nearest bound referent | err |
| **PC-2** | `sealed … wall` | a defender exists in the strong-side wall corridor (within 6 m of that wall, between the carrier and the up-wall outlet) | err |
| **PC-3** | `first forechecker`, `F1 … forecheck` | no teammate is closer to the puck carrier than YOU (metric distance) | err |
| **PC-4** | `one-timer`, `cross-ice`, `passing lane`, `feed`, `in stride`, `move it across/backdoor` | the segment puck -> keyed answer clears **the goalie** and every defender by the engine's own 0.035 | err |
| **PC-4b** | *(no vocabulary needed)* keyed answer is cross-ice (opposite side of y=0.5, >0.25 apart) and both ends deep (`d>0.60`) | same segment check — a deep cross-ice relocation is only worth anything if a puck can reach it | err |
| **PC-5** | *(attacking scene)* | no attacker past the blue line while the puck is still outside it | err |
| **PC-6** | `strong-side`, `weak-side` | keyed weak-side answer is on the opposite side of y=0.5 from the puck; and the puck is not within 1.8 m of centre (where the call is meaningless) | err / warn |
| **PC-7** | `corner`, `net front` / `in front of the net` / `doorstep` / `in tight`, `high slot`, `the slot`, `at the point`, `behind the net`, `on the wall` / `on the boards` | subject contained in the named region, using the **union** slot polygon and the doc's grey bands; skipped entirely when the sentence is a region-**emptiness** claim ("the slot is wide open") | err (highslot/wall: warn) |
| **PC-8** | `where you shoot`, `shooting lane`, `open far side` | a keyed shot point within 0.06 of the goal line must land inside the net mouth (y 0.4695-0.5305) | err |
| **PC-9** | *(place drills)* | a draggable actor starts more than 1.5x its tolerance from its target, or the move is invisible | err / warn |
| **PC-10** | `stick length`, `gap is tight`, `reach … with your stick` | nearest opponent within ~2.5 m, measured **metrically** | warn |
| **PC-11** | `stepped/shaded/cheated/committed toward <X>` | the nearest defender is actually displaced toward X (same side of centre, >1.8 m off it) | err |
| **PC-12** | `blue line`, `the zone`, `neutral zone`, `at the point`, `half-wall`, `high slot` on a U7/U9 board | Hockey Canada plays U7 cross-ice and U9 half-ice — that ice does not exist in their game | warn |
| **PC-13** | *(goalie placement)* | the goalie is not >0.7 m behind its own goal line and not >3 m off the net's centre line | err |

**Subject resolution** is the single largest false-positive risk (vocab doc sec.6
item 10) and the rules are deliberately conservative about it: bind only to the last
explicit referent in the 70 characters before the phrase, and **skip when there is
none — never guess**. Possessive `your …` ("your team", "your job", "your check",
"your teammate") never binds to YOU, and "the goalie"/"the net" never bind at all
(they are landmarks a claim is measured against). `tip` and `why` are excluded from
spatial claims entirely — they are generic coaching maxims about the concept, not
assertions about this board. Applying these three constraints took the run from 41
raw hits to 22 real ones.

---

## 3. The four reported instances, resolved

| # | Reported as | Found by | Verdict |
|---|---|---|---|
| 1 | CONTENT-5 — `u13_breakout_position_place_v1`, "sealed your strong-side wall" | **PC-2** + **PC-9** + **PC-4b** | Confirmed, and it is three separate defects stacked |
| 2 | CONTENT-7 — `u15_scanning_weakside_v1`, one-timer through the goalie | **PC-4** / **PC-4b** | Confirmed exactly, and it recurs on **two more seeds** nobody has reported |
| 3 | S2-11 — "you are first forechecker" but YOU is F2 | **PC-3**, zero hits in seeds | Confirmed, but the defect is **not in a seed** — see sec.5 |
| 4 | S2-22 / S2-23 — gym drills would be offside | **PC-5**, zero hits in seeds | Confirmed, but the defect is **structural in the gym engine** — see sec.6 |

Instances 3 and 4 produced no seed findings because they do not live in the seed
corpus. That is a finding, not a miss: the seed bank has one validator layer
(`validators.js`), the animated plays have a different frame and no positional
validator, and the Cognitive Gym has **no rink model at all**.

---

## 4. Violations in the seed corpus

### ERRORS

#### E1 — `u13_breakout_position_place_v1` — the sealed wall is not drawn (CONTENT-5)

`src/scenario/seeds/u13_breakout_position_place_v1.json:26` (prompt), `:15` (fc1), `:11` (read.cue)
Rule **PC-2**.

> "A forechecker has sealed your strong-side wall. Drag your three forwards to the outlets that beat this pressure."

The puck is at `(0.072, 0.852)` — own corner, strong side = bottom. The strong-side
wall corridor runs y >= 0.80, x from 0.072 up-ice. **No defender is in it.**
`fc1` sits at `(0.13, 0.74)`, which is **3.2 m inboard of the wall** and above the
up-wall lane; `fc2` is at `(0.22, 0.55)`, in the middle of the ice. The lane from the
D to the strong-side outlet (`dz-half-wall-strong`, 0.10/0.78) is **open** — `fc1`
misses it by 0.050, well outside the 0.035 intercept radius. The declared decoy at
`(0.10, 0.78)` is likewise uncontested by the sealer.

This is exactly the product owner's read: *"They haven't actually sealed it in the image."*

**Corrected coordinate:** move `fc1` to **`(0.19, 0.86)`** — on the wall, between
the carrier and the up-wall outlet. That makes the seal visible and puts `fc1`
0.031 from the D-to-strong-outlet lane, i.e. genuinely blocking it.
**Or** reword the prompt to "A forechecker is pressuring your D from the middle."

#### E2 — `u13_breakout_position_place_v1` — the keyed breakout pass crosses your own crease

`src/scenario/seeds/u13_breakout_position_place_v1.json:31` (keyed placement)
Rule **PC-4b**.

The keyed answer sends `ww` to `dz-half-wall-weak` = `(0.10, 0.22)`. The delivery
line from the puck `(0.072, 0.852)` to that point passes the goalie at `(0.06, 0.50)`
by **0.028 (1.7 m of lateral ice)** — inside the engine's own 0.035 intercept
radius, and straight across the front of your own net. The board is teaching the
one pass every coach forbids in the defensive zone.

**Corrected coordinate:** key `ww` to a weak-side spot **up-ice of the crease**, e.g.
**`(0.21, 0.28)`** (`d ~= 0.50`), so the outlet crosses above the goalie rather than
through the goal mouth. This also fixes the `dz-half-wall-weak` vocabulary problem —
that zone id sits at net-front depth, not half-wall depth (vocab doc sec.7).

#### E3 — `u15_scanning_weakside_v1` — the one-timer pass goes through the goalie (CONTENT-7)

`src/scenario/seeds/u15_scanning_weakside_v1.json:80` (prompt), `:84` (keyed answer)
Rules **PC-4** and **PC-4b**.

> "Tap the weak-side ice you should relocate to so you are an open one-timer option."

Puck `(0.902, 0.802)`. Keyed answer `oz-half-wall-weak` = `(0.90, 0.22)`. That is a
near-vertical line at x ~= 0.901. The goalie sits at `(0.918, 0.50)` — **0.017 off it
(1.0 m of lateral ice)**, half the engine's own intercept radius. No defender is on
the lane; the goalie alone kills it. The product owner's words —
*"the winger would never be able to make this pass for a one-timer because it would
have to go right through the goalie"* — are geometrically exact.

Second-order: from `(0.90, 0.22)` the shooting angle to the net at `(0.9333, 0.50)`
is essentially along the goal line, so even a completed pass is not a one-timer look.

**Corrected coordinate:** key the answer to **`(0.789, 0.28)`** (`d ~= 0.50`, weak-side
mid-zone). The pass then crosses ~4.5 m above the crease and the receive point has a
real shooting angle. Since the keyed answer is a `zoneId`, either replace it with an
explicit `{x, y}` or fix `oz-half-wall-weak` itself — it is currently at net-front
depth (`x 0.90`), which is the same in-repo bug.

#### E4 — `u13_oz_structure_place_v1` — same crease-crossing pass, unreported

`src/scenario/seeds/u13_oz_structure_place_v1.json:78` (prompt), `:80` (keyed answer), `:90` (feedback)
Rule **PC-4b**.

> feedback.right: "…now your winger has the **cross-ice look**."

Puck `(0.902, 0.782)` -> keyed `oz-half-wall-weak` `(0.90, 0.22)`, goalie `(0.918, 0.50)`
at **0.017 (1.0 m)**. Identical geometry to E3. The feedback explicitly promises the
cross-ice pass that the goalie is standing in.
**Corrected coordinate:** same as E3 — receive point at **`(0.789, 0.28)`**.

#### E5 — `u13_oz_winger_wall_tf_v1` — same crease-crossing pass, third instance

`src/scenario/seeds/u13_oz_winger_wall_tf_v1.json:66` (prompt), `:68` (keyed answer)
Rule **PC-4b**.

Puck `(0.902, 0.782)` -> keyed `(0.90, 0.22)`, goalie `(0.918, 0.50)` at **0.017 (1.0 m)**.
Note this seed and E4 are the same board with different interaction kinds, so the
defect was cloned. **Corrected coordinate:** `(0.789, 0.28)`.

> **E3/E4/E5 together are the real story of CONTENT-7.** It is not one bad seed, it
> is a repeated authoring pattern: "weak side" gets keyed to `oz-half-wall-weak`
> (x 0.90), which sits at net-front depth, so every weak-side relocation from a deep
> strong-side puck draws a line through the goal mouth. Fixing `zones.js`'s
> `oz-half-wall-*`/`dz-half-wall-*` entries to real half-wall depth (`d ~= 0.5`,
> i.e. `x ~= 0.79` / `0.21`) fixes all four of E2-E5 at once.

#### E6 — `u13_oddman_pass_mc_v1` — the defender has not shaded anywhere

`src/scenario/seeds/u13_oddman_pass_mc_v1.json:78` (mc.stem), `:50` (x1), `:88` (feedback)
Rule **PC-11**.

> mc.stem: "The lone defender **has stepped toward the LW side** of the zone."
> feedback.right: "when they **shade to your left teammate**, the right-side teammate is wide open"

The lone defender `x1` is at `(0.80, 0.47)` — **dead centre**, 0.9 m off the royal
road. `lw` is at `(0.78, 0.30)`, `rw` at `(0.80, 0.72)`. The defender is 5.1 m from
the LW lane and 7.5 m from the RW lane; both passing lanes are geometrically clear
(0.069 and 0.087 from `x1`, versus the 0.035 threshold). The keyed answer (RW) is
therefore not better than the decoy — the board makes the read unanswerable from the
picture, exactly like CONTENT-5.

**Corrected coordinate:** move `x1` to **`(0.80, 0.38)`**. That puts it 0.023 from
the you->LW lane (blocked) and 0.13 from the you->RW lane (clear), so the stem's
premise is drawn and the keyed answer becomes the only clear option.

#### E7 — `u13_oz_entry_trailer_branch` node `trailer` — keyed shot misses the net

`src/scenario/seeds/u13_oz_entry_trailer_branch.json:131` (prompt), `:133` (keyed answer)
Rule **PC-8**.

> "The pass is on your tape at the back door and the goalie is sliding across. Tap where you shoot."

Keyed target `(0.92, 0.42)`. The net mouth spans y **0.4695-0.5305**. The keyed
point is **1.5 m outside the near post** — the "correct" answer is a shot wide of
the net. (The 0.10 tolerance means a tap on the actual net also scores, so this
reads as authoring drift rather than a scoring bug, but the answer the app will
show as correct is off the net.)
**Corrected coordinate:** **`(0.928, 0.48)`** — inside the mouth, far side from a
goalie sliding from y 0.50.

#### E8 — `u13_oz_entry_trailer_branch` node `mirror` — keyed shot misses the net by more

`src/scenario/seeds/u13_oz_entry_trailer_branch.json:~190` (node `mirror` correct)
Rule **PC-8**.

> feedback.right: "the D is shading the trailer's lane. Your **shooting lane is open. Shoot.**"

Keyed target `(0.92, 0.40)` — **2.1 m outside the near post**.
**Corrected coordinate:** **`(0.928, 0.48)`**.

#### E9 — `gvis_u11_decision-making_tufb` — "in front of the net" is 8 m from the net

`src/scenario/seeds/gvis_u11_decision-making_tufb.json:92` (feedback), `:36` (slot_lw)
Rule **PC-7 netfront**.

> feedback.right: "The LW is open in the slot — **right in front of the net where goals happen**."

`slot_lw` is at `(0.80, 0.40)` -> `d = 0.538`, i.e. **mid-zone**, 8.0 m out from the
goal line and 3 m off the middle. It is defensibly "in the slot" under the wider
union definition (the check passes that), but "right in front of the net" is a
net-front claim and net front starts at `d >= 0.78`.

**Fix — copy, not coordinates.** The geometry is a reasonable slot read; the
feedback oversells it. Reword to "The LW is open in the slot with a clear look at
the net." Moving the actor instead would break the sibling boards
`u11_oz_corner_lw_crash_v1` and both `_pending` variants, which share these coords.

#### E10 — `u9_dz_positioning_v1` — the "forward parked in front of the net" is at the blue line

`src/scenario/seeds/u9_dz_positioning_v1.json:69` (prompt), `:29` (check), `:83` (feedback)
Rule **PC-7 netfront**.

> "Your job is the forward **parked in front of the net**."

The actor named — `check` — is at `(0.27, 0.44)` -> `d = 0.295`, which is **12.2 m
up-ice from the goal line**, near the top of the zone. Nobody is parked in front of
this net. The entire premise of a U9 defensive-positioning board is undrawn.

**Corrected coordinate:** move `check` to **`(0.115, 0.46)`** (`d ~= 0.83`, net front,
inside the middle lane). The keyed answer `(0.19, 0.47)` then genuinely sits between
`check` and the net; today it sits between `check` and the net only by accident.

#### E11 — `u9_dz_positioning_v1` — the goalie is in the corner, not the net

`src/scenario/seeds/u9_dz_positioning_v1.json:56`
Rule **PC-13**.

Goalie `g` at `(0.05, 0.27)`. The left goal line is x = 0.0667 and the net mouth
spans y 0.4695-0.5305. This goalie is **1.0 m behind the goal line and 6.9 m off the
net's centre** — drawn out in the corner. `validators.js`'s existing `goalieInCrease`
rule does flag it as a warn (x is in [0.05, 0.12] but |y-0.5| = 0.23), so this has
been visible and unfixed.

The prompt says "keeps you **between your check and the net**" and the feedback says
"between your check and **the goalie**" — those are two different points on this board,
7 m apart, which makes the answer ambiguous.

**Corrected coordinate:** **`(0.079, 0.50)`**.

#### E12 — `u11_dz_coverage_place_v1` — the puck is not in the corner

`src/scenario/seeds/u11_dz_coverage_place_v1.json:89` (prompt), `:35` (puck)
Rule **PC-7 corner**.

> "The puck's in **your corner**."

Puck `(0.182, 0.802)` -> `d = 0.600`. That is at the faceoff dots, **6.9 m out from
the goal line** and 6 m off the boards — the half-wall/boards, not the corner. A
corner needs `d >= 0.80` (grey 0.72).

`validators.js`'s existing `puckLocationMatchesCopy` passes this because its
threshold is `depth > 0.35` in raw x, which at this end permits anything up to
`d = 1.2`. That rule's fence is far too loose to catch corner claims; `d` is the
right measure.

**Corrected coordinate:** move the puck (and `carrier` with it) to **`(0.11, 0.84)`**
(`d ~= 0.85`, genuine corner). Keep the pair within 0.01 of each other.

#### E13 / E14 — `u13_oz_highslot_mc_v1` and `u13_scanning_slot_v1` — "cycling low" is mid-zone

`u13_oz_highslot_mc_v1.json:76` (prompt) / `:83` (stem), puck at `:37`
`u13_scanning_slot_v1.json:80` (prompt), puck at `:41`
Rule **PC-1 low**.

> "Your team is **cycling low** …" / "Your team is **cycling the puck low**."

Puck `(0.802, 0.818)` -> `d = 0.545` on both. The "low" band needs `d >= 0.69`, grey
to 0.61. The puck is **1.1 m above even the grey fence**, i.e. just above the dot
line rather than below it.

These two are the mildest errors in the set — 1.1 m — and a reviewer may reasonably
downgrade them. They are reported because the fix is free.

**Corrected coordinate:** move the puck and `tmlow` together to **x = 0.85**
(`d = 0.71`, below the dots). Check `x1` at `(0.88, 0.72)` stays clear of the new
`you`->`oz-high-slot` lane afterwards.

#### E15 — `u9_dz_positioning_v1` also fails `goalieOnPuckToNetAngle`

Covered by E11; listed here because two existing `validators.js` rules
(`goalieInCrease`, `goalieOnPuckToNetAngle`) both flag it today and it shipped anyway.
That is a **process** finding: warnings in this pipeline are not gating anything.

### WARNINGS

| ID | Seed | file:line | Clause | Geometry | Fix |
|---|---|---|---|---|---|
| W1 | `u13_breakout_position_place_v1` | `:19`, `:32` | drag `c` | `c` starts `(0.38, 0.50)`, target `(0.28, 0.50)` tol **0.09**; distance **0.100** = 1.11x tolerance. The correct move is 0.6 m longer than the answer circle | This is the owner's *"the players are already kind of in the correct spot"*. Start `c` at `(0.46, 0.50)` or shrink tol to 0.05 |
| W2 | `u13_gap_steer_boards_mc_v1` | `:46`, `:55` | "close enough to reach the carrier with your stick" / "within a stick length" | `you (0.47, 0.36)` to `carrier (0.50, 0.28)` = **3.0 m** metric (1.8 m in x, 2.4 m in y). Stick + reach is ~2.0-2.5 m | Move `you` to `(0.485, 0.32)` -> 1.5 m. Note the naive normalized distance (0.085) is meaningless here — this is the anisotropy trap |
| W3 | `u13_oz_backdoor_scan_v1` | `:20`, `:27` | "the **weak-side** winger" | puck at y **0.498** — 0.06 m off centre. Strong/weak side is undefined when the puck is central (vocab doc sec.6 item 7) | Move the puck to y ~= 0.62 so "weak side" (top) has a referent, or drop the wording |
| W4 | `u13_oz_backdoor_scan_v1` | `:13`, `:20` | "You catch the puck **in the high slot**" | puck `(0.722, 0.498)` -> `d = 0.267`. Against `zones.js`'s `oz-high-slot` (`d 0.364`) the miss is 1.7 m; against `ANCHORS.highSlotRight` (`d 0.65`) it is 6.6 m | Warn only until the two vocabularies are reconciled. If `ANCHORS` wins, move to x ~= 0.83 |
| W5 | `u13_oz_structure_place_v1` | `:38`, `:78` | "your winger has the puck **on the wall**" | puck `(0.902, 0.782)` — **6.5 m off the boards** and at goal-line depth (`d 0.891`). That is the corner/goal-line area | Either move the puck to y ~= 0.88 (genuinely on the wall) or call it "below the goal line" |
| W6 | `gvis_u9_time-and-space_1gcu` | `:68` | "as you enter **the zone**" | U9 board. Hockey Canada plays U9 half-ice — there is no blue line in their game | "as you skate up the ice" |
| W7 | `u9_off-puck-support-offense_select_v1` | `:68` | "in the **offensive zone**" | same | "down near their net" |

### Deliberately NOT flagged (fence-marginal — recorded so nobody re-litigates them)

- `gvis_u11_decision-making_tufb`, `u11_oz_corner_lw_crash_v1`, and both `_pending`
  variants: "in the corner" with the puck at `(0.932, 0.698)`. `d = 0.995` (on the
  goal line) but y = 0.698 is 0.06 m inside the dot lane. Inside the grey band. Pass.
- `u11_oz_corner_lw_crash_v1`: "X1 has stepped up to cover the slot" with `x1` at
  `(0.75, 0.35)`, `d = 0.365`. Inside the union slot's grey band at its very top
  edge. Pass, but note the sibling board `gvis_u11_decision-making_tufb` puts the
  same actor at `(0.87, 0.33)` — the two boards disagree about where "the slot" is.
- `gvis_u11_time-and-space_d5md`: "the RW down low", `rw` at `d = 0.607` versus a
  0.61 grey fence. Miss of 0.05 m. Suppressed by the 0.02 fence tolerance.
- `u13_oz_entry_trailer_v1`: `trailer` at x 0.62 is behind the blue line while the
  puck is at 0.72 inside it. Legal (puck entered first), correctly not flagged by PC-5.

---

## 5. Instance 3 (S2-11, "you are first forechecker") — not a seed

PC-3 returned **zero hits across all 34 seed frames** because the board in the
12:08:59 screenshot is not a seed. It is
**`src/play/plays/forecheckPressure.js`** — an `animated-play`, in the **other**
coordinate frame (`space: { units: "rink-200x85" }`, 200 x 85 ft), which no
positional validator touches.

`forecheckPressure.js:26-31`, node `forecheck`:

```
q:     "You are first forechecker. How should you pressure the puck carrier?"
enter: { P1: [118, 67], A1: [154, 55], A2: [172, 27], D1: [148, 31], G: [187, 42] }
pos:   { P1: [150, 55], A1: [164, 51], A2: [171, 27], D1: [157, 32], G: [187, 42] }
```

| Frame | YOU (`P1`) to carrier (`A1`) | Teammate `D1` to carrier | Verdict |
|---|---|---|---|
| `enter` (what the screenshot shows) | **37.9 ft** | **24.7 ft** | YOU is **F2** |
| `pos` (after the skate motion resolves) | 14.6 ft | 20.3 ft | YOU is F1 |

The screenshot matches the `enter` frame exactly — YOU on the blue line, an
unlabelled blue teammate mid-zone between YOU and `A1`. So the prompt is true of the
frame the player *ends* on and false of the frame the question is *asked* on. That is
a distinct sub-defect worth naming: **a relational claim must hold on the frame the
question is asked on**, and this play asks on `enter` while the copy describes `pos`.

Also confirmed from the same screenshot: the puck carrier `A1` sits at
`[164, 51]` — inside the faceoff circle, in the slot. The owner's second remark
(*"they're in a scoring position there. It's not really pushing them to the wall"*)
is geometrically right: the `forcedWall` outcome moves `A1` to `[168, 63]`, which is
still 8 ft inside the dot line and 22 ft off the boards, so "forced a predictable
wall play" is not what the board shows either.

**Fixes:**
1. Ask the question on a frame where the claim is true — either set `enter` for `P1`
   to `[128, 60]` and `D1` to `[160, 28]` (pulling the teammate behind YOU), or
2. Reword to "You are the **second** forechecker (F2). Your partner has the puck
   carrier. How do you support?", or
3. Move the `freeze`/`ask` to fire on `pos` rather than `enter`.

For `forcedWall`, move `A1` to `[172, 74]` so "forced to the wall" is actually drawn.

**Structural recommendation:** the animated-play frame has `validateAnchorFidelity.js`
for *point* fidelity but no prompt-vs-coordinate layer at all. PC-1/PC-3/PC-7 are
frame-portable if expressed in `d` and width fractions (which is why the vocab doc
defines them that way) and should be run over `src/play/plays/` too.

---

## 6. Instance 4 (S2-22 / S2-23, offside gym drills) — structural, not content

PC-5 also returned **zero seed hits**. The two drills named have no seed and no rink
model; the offside is generated at runtime and is close to unavoidable.

**The rink is drawn horizontally.** `src/cognitive-gym/gymEngine.js:142-143`:

```js
ctx.fillRect(W * 0.33 - 2.5, 0, 5, H);   // blue line
ctx.fillRect(W * 0.67 - 2.5, 0, 5, H);   // blue line
```

Blue lines at x = 0.33W and 0.67W, goal lines at 0.08W / 0.92W (`gymEngine.js:153`).
So the ice runs **left-to-right**.

**Run the Play** (`src/cognitive-gym/runThePlayCore.js:33-48`) places skaters by
uniform rejection sampling over the entire padded canvas:

```js
const x = pad + rng() * (W - 2 * pad);
const y = pad + rng() * (H - 2 * pad);
```

There is no puck, no attacking direction, no blue-line term. `makeSequence`
(`:52-60`) then chains passes between arbitrary skaters. Consequences:

- Any sequence step from a skater at x < 0.33W to one at x > 0.67W is a pass into
  the offensive zone with receivers already there — the reported offside.
- A step from x ~= 0.05W to x ~= 0.95W is a **190-ft pass**, which is the owner's
  *"we don't really want to shoot something 200 feet."*

**Late Read** (`src/cognitive-gym/lateReadCore.js:82, 100-106`) is worse, because it
plays the drill on the **wrong axis**:

```js
const you = { x: W / 2, y: H * 0.86 };            // :82
const spot = freeSpot(teammates, pad, H * 0.62);  // :104  teammates in the UPPER 62%
```

YOU is at x = W/2 — literally standing on the red centre line — and teammates are
scattered across the **full width** but only the upper 62% of the **height**. The
drill's intended axis is bottom-to-top ("the cue arrows from YOU run up the ice",
per the comment on `:98-99`), but the drawn sheet's axis is left-to-right. So:

- Every teammate at x > 0.67W or x < 0.33W is in an end zone while YOU (and the
  puck) are in the neutral zone. With teammate x uniform, that is **~66% per
  teammate**, so with 3-5 teammates **~96% of trials contain at least one offside
  receiver**. That matches *"again we have a couple of players offside."*
- The cue arrows run vertically across a horizontal rink, which is very likely also
  behind *"the positioning of the players doesn't really make sense."*

**Fix (either drill):** give the generator a rink model. The minimum viable version:

1. Add an attack direction and a puck (`you` holds it).
2. Constrain receiver sampling: `x_receiver <= blueLine` unless the puck is already
   past it — i.e. reuse the exact predicate in `validators.js:176-192` (`noOffsides`)
   against normalized x.
3. Cap pass length at a plausible maximum (~60 ft = 0.30W) so no sequence step is a
   rink-length bomb.
4. For **Late Read** specifically, rotate the whole trial 90 degrees: put YOU at
   `(W * 0.15, H / 2)` and sample teammates in `x in [pad, 0.62W]`. That aligns the
   drill's axis with the drawn rink and makes the offside constraint expressible at
   all. This is a one-line-per-coordinate change in `makeTrial`, and both cores are
   already pure and unit-testable.

---

## 7. Recommendation

1. **Wire `positionalLanguage.js` into `schema.js`.** It is written, tested, and
   dead code today. One import next to `runHockeyValidators`.
2. **Fix `zones.js` first.** `oz-half-wall-*` / `dz-half-wall-*` at x 0.90 / 0.10 is
   net-front depth, and it is the single cause of E2, E3, E4 and E5. Moving those
   four entries to `d ~= 0.5` (x 0.789 / 0.211) fixes four errors and one whole
   defect class at once.
3. **Add the goalie to the lane check.** `schema.js:291-315` checks defenders only,
   and only on `path` answers. Three of the five worst findings here are a keyed
   answer whose pass goes through the goalie on a `point` or `place` answer.
4. **Promote PC-2, PC-3, PC-4/4b, PC-8, PC-11, PC-13 to `err` rules in
   `validators.js`**; PC-1 and PC-7 belong in `positionalLanguage.js` alongside the
   two bands already there. PC-5 belongs in the gym generator, not the seed lint.
5. **Make warnings gate something.** `u9_dz_positioning_v1` trips two existing
   validator warnings today and shipped anyway.
6. **Split the seed-frame question from the answer-frame question.** Section 5's
   defect (a claim true of `pos` and false of `enter`) is invisible to any rule that
   validates only one frame.

---

## 8. The lint, runnable

Read-only. Reads `src/scenario/zones.js` for zone resolution and every seed JSON;
writes nothing; exits 1 if any error-severity finding is present.

Save as `tools/prompt-vs-coords.mjs` and run `node tools/prompt-vs-coords.mjs .`
from the repo root.

```js
#!/usr/bin/env node
// prompt-vs-coords.mjs — lint scenario PROMPT VOCABULARY against RENDERED COORDINATES.
// Read-only. Run: node prompt-vs-coords.mjs [repoRoot]
import { readdirSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve as presolve } from "node:path";

const ROOT = process.argv[2] || ".";
const { ZONES } = await import(pathToFileURL(presolve(ROOT, "src/scenario/zones.js")).href);

// ── COORDINATE MODEL ────────────────────────────────────────────────────────
// Frame B (the ONLY frame seeds use): src/RinkReadsRink.jsx, 60m x 30m IIHF,
// normalized 0..1. x left->right, y top->bottom. Derivations in
// docs/references/rink-area-vocabulary.md sec.1.
const GOAL_R = (60 - 4) / 60;                 // 0.93333  right goal line
const BLUE_R = (60 - 4 - 17.3) / 60;          // 0.64500  right blue line
const Z      = GOAL_R - BLUE_R;               // 0.28833  zone depth
const NET_Y0 = 0.4695, NET_Y1 = 0.5305;       // net mouth (1.83m of a 30m sheet)
const MX = 60, MY = 30;                       // metres per normalized unit
const INTERCEPT = 0.035;                      // the engine's own intercept radius

const metres = (a, b) => Math.hypot((a.x - b.x) * MX, (a.y - b.y) * MY);
const endOf = (st) => { const v = st?.view; return (v === "right" || v === "full") ? "right" : (v === "left" ? "left" : null); };
// d = 0 at the blue line, 1 at the goal line, >1 behind the net.
const depth = (x, end) => end === "left" ? ((1 - BLUE_R) - x) / Z : (x - BLUE_R) / Z;
const goalX = (end) => end === "left" ? 1 - GOAL_R : GOAL_R;
function segDist(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, l2 = abx * abx + aby * aby;
  let t = l2 ? ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

// ── NAMED SPOTS. `grey` is the tolerance a validator MUST pass (vocab doc 2b).
const SPOTS = {
  corner:   { sev: "err",  grey: (D, y) => D >= 0.72 && (y <= 0.32 || y >= 0.68), desc: "deep (d>=0.80, grey 0.72) AND wide (outside the dot lane)" },
  netfront: { sev: "err",  grey: (D, y) => D >= 0.70 && Math.abs(y - 0.5) <= 0.20, desc: "net front: d>=0.78 (grey 0.70), within 6m of the middle" },
  highslot: { sev: "warn", grey: (D, y) => D >= 0.31 && D <= 0.80 && Math.abs(y - 0.5) <= 0.18, desc: "high slot: d 0.39-0.72 (grey 0.31-0.80), middle lane" },
  slot:     { sev: "err",  grey: (D, y) => D >= 0.31 && D <= 1.05 && Math.abs(y - 0.5) <= 0.27, desc: "union slot: d 0.39-1.02 (grey 0.31), inside the dot lane" },
  point:    { sev: "err",  grey: (D, y) => D <= 0.22 && Math.abs(y - 0.5) >= 0.10, desc: "the point: d<=0.15 (grey 0.22), off the middle lane" },
  behindnet:{ sev: "err",  grey: (D) => D > 0.97, desc: "past the goal line (d>1.00, grey 0.97)" },
  wall:     { sev: "warn", grey: (D, y) => y <= 0.16 || y >= 0.84, desc: "within ~3.5m of the side boards (grey 4.8m)" },
};
const SPOT_RE = [
  ["corner",    /\b(?:in|from|into)\s+(?:the|your|a|one|that|this|\w+-side)\s+corner\b|\bcorner\s+with\s+the\s+puck\b/i],
  ["netfront",  /\bnet[- ]front\b|\bin\s+front\s+of\s+the\s+net\b|\bdoorstep\b|\bin\s+tight\b|\blow\s+slot\b/i],
  ["highslot",  /\bhigh\s+slot\b/i],
  ["slot",      /\b(?:in|into)\s+the\s+slot\b|\bthe\s+slot\b/i],
  ["point",     /\bat\s+the\s+point\b|\bthe\s+point\s+lane\b/i],
  ["behindnet", /\bbehind\s+the\s+net\b|\bbelow\s+the\s+goal\s+line\b/i],
  ["wall",      /\bon\s+the\s+(?:half[- ])?wall\b|\bup\s+the\s+wall\b|\bon\s+the\s+boards\b|\balong\s+the\s+boards\b/i],
];
// Depth bands. Extends src/scenario/positionalLanguage.js CLAIMS; every pattern
// still requires an unambiguous depth sense (never a bare "high"/"low").
const DEPTH = [
  ["high", /\b(?:up\s+)?high\s+in\s+the\s+zone\b|\bat\s+the\s+top\s+of\s+the\s+zone\b|\bhigh\s+forward\b|\bF3\s+up\s+high\b/i, 0.38],
  ["low",  /\b(?:down\s+)?low\s+in\s+the\s+zone\b|\bdown\s+low\b(?!\s+side)|\bcycling\s+(?:the\s+puck\s+)?low\b|\bpuck\s+low\b|\blow\s+on\s+the\s+strong\s+side\b|\bdrop\s+low\b|\bin\s+deep\b/i, 0.61],
];

// ── LOAD SEEDS (excluding _retired) ─────────────────────────────────────────
const DIR = presolve(ROOT, "src/scenario/seeds");
const files = [];
for (const f of readdirSync(DIR)) if (f.endsWith(".json")) files.push([`${DIR}/${f}`, f]);
for (const f of readdirSync(`${DIR}/_pending`)) if (f.endsWith(".json")) files.push([`${DIR}/_pending/${f}`, `_pending/${f}`]);

const findings = [];
let frameCount = 0;

for (const [path, name] of files) {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split("\n");
  const lineOf = (n) => { const i = lines.findIndex((l) => l.includes(n)); return i < 0 ? "?" : i + 1; };
  const s = JSON.parse(raw);
  const frames = s.steps ? s.steps.map((st, i) => [`steps[${i}]`, { ...s, ...st }])
    : s.nodes ? Object.entries(s.nodes).map(([k, n]) => [`node ${k}`, { ...s, ...n }])
      : [["", s]];

  for (const [frameLabel, F] of frames) {
    frameCount++;
    const A = F.actors || s.actors || [];
    const by = Object.fromEntries(A.map((a) => [a.id, a]));
    const player = A.find((a) => a.kind === "player");
    const puck = A.find((a) => a.kind === "puck");
    const goalie = A.find((a) => a.kind === "goalie");
    const defs = A.filter((a) => a.kind === "defender");
    const mates = A.filter((a) => a.kind === "teammate");
    const stage = F.stage || s.stage || {};
    const end = endOf(stage);
    const ASK = [F.interaction?.prompt || "", F.mc?.stem || ""].join(" ");
    // BOARD text only: prompt / stem / feedback / read.cue. `tip` and `why` are
    // generic coaching maxims about the CONCEPT, not claims about this board, so
    // spatial claims are never read out of them (they caused pure false positives).
    const BOARD = [F.interaction?.prompt || "", F.mc?.stem || "", F.feedback?.right || "", F.feedback?.wrong || "", F.read?.cue || ""].join(" ");

    // ── SUBJECT BINDING ─────────────────────────────────────────────────────
    // The vocabulary doc (sec.6 item 10) calls resolving the subject of a spatial
    // claim the most likely source of false positives. So: bind ONLY to the last
    // explicit referent in the 70 chars before the phrase, and SKIP when there
    // isn't one. Never guess. Deliberately NARROW; excluded on purpose:
    //   possessive "your ..." — "your team", "your job", "your teammate", "your
    //     check" all name someone OTHER than the player; binding them to YOU was
    //     the single largest false-positive source.
    //   "the goalie" / "the net" — landmarks a claim is measured AGAINST, never
    //     the subject of one.
    const BINDERS = [
      [/\b(LW|RW|LD|RD|F3)\b/g, (mt) => A.find((a) => a.tag === mt[1])],
      [/\b(?:the\s+)?puck\b/gi, () => puck],
      [/\b(?:your\s+|our\s+)?team\b/gi, () => puck],   // team possession = where the puck is
      [/\byou\b|\byourself\b|\byoure\b/gi, () => player],
      [/\bcarrier\b|\bpuck[- ]carrier\b/gi, () => A.find((a) => puck && metres(a, puck) < 3 && a.kind !== "puck")],
      // a bare word that IS an actor id ("your check", "tmwall")
      [/\b([a-z][a-z0-9_]{2,})\b/gi, (mt) => by[mt[1].toLowerCase()]],
    ];
    // "the slot is wide open", "the high slot they vacated" are claims about a
    // region being EMPTY, not about an actor being in it. Containment must not fire.
    const EMPTINESS = /\b(is|was|stays|remains|sits)\s+(wide\s+)?(open|empty|vacated|available|there)\b|\bthey\s+vacated\b|\bvacated\b|\bwide\s+open\b/i;
    function bindSubject(sentence, idx, phrase = "") {
      // The phrase itself can name its own subject ("the puck low", "puck on the wall").
      if (/\bpuck\b/i.test(phrase) && puck) return { subj: puck, why: "the puck" };
      const win = sentence.slice(Math.max(0, idx - 70), idx);
      let best = null, bestAt = -1, why = "";
      for (const [re, get] of BINDERS) {
        re.lastIndex = 0; let mt;
        while ((mt = re.exec(win))) {
          const got = get(mt);
          if (got && mt.index > bestAt) { best = got; bestAt = mt.index; why = mt[0].trim(); }
        }
      }
      return best ? { subj: best, why } : null;
    }
    const rep = (code, sev, clause, geom, fix, line) =>
      findings.push({ seed: s.id, file: name, frame: frameLabel, code, sev, clause, geom, fix, line });
    const resolveT = (t) => {
      if (!t) return null;
      if (typeof t.x === "number") return { x: t.x, y: t.y, tol: t.tolerance ?? 0.05 };
      if (t.zoneId && ZONES[t.zoneId]) return { x: ZONES[t.zoneId].x, y: ZONES[t.zoneId].y, tol: t.tolerance ?? ZONES[t.zoneId].tol, zid: t.zoneId };
      return null;
    };
    const target = F.correct?.kind === "point" ? resolveT(F.correct) : null;

    // ── PC-1  depth-band claim vs the subject's d
    // A depth word is either DESCRIPTIVE ("you have the puck up high in the zone"
    // -> the actor) or a DESTINATION ("drop low", "relocate down low" -> the keyed
    // answer). Bind accordingly; skip when neither resolves.
    const DEST_RE = /\b(drop|go|get|relocate|move|fill|skate|slide|swing)\b/i;
    if (end) for (const [band, re, grey] of DEPTH) {
      for (const sent of BOARD.split(/(?<=[.!?])\s+/)) {
        const mm = sent.match(re); if (!mm) continue;
        const pre = sent.slice(Math.max(0, mm.index - 25), mm.index);
        let subj = null, why = "";
        if (DEST_RE.test(pre) && target) { subj = target; why = "keyed destination"; }
        if (!subj) { const b = bindSubject(sent, mm.index, mm[0]); if (b) { subj = b.subj; why = `referent "${b.why}"`; } }
        if (!subj) continue;
        const D = depth(subj.x, end);
        const miss = band === "high" ? D - grey : grey - D;
        if (miss <= 0.02) continue;               // on the fence -> never fail (vocab doc sec.2b)
        rep("PC-1 depth-band", "err", `"${mm[0]}"  [sentence: ${sent.trim().slice(0, 110)}]`,
          `${subj.id || `keyed target (${subj.x},${subj.y})`} [${why}] at x=${subj.x} -> d=${D.toFixed(3)} (0=blue line, 1=goal line); "${band}" needs d ${band === "high" ? "<=" : ">="} ${grey} including the grey band — out by ${miss.toFixed(3)} of zone depth (${(miss * 17.3).toFixed(1)}m)`,
          band === "high"
            ? `move it to x=${(end === "left" ? (1 - BLUE_R) - 0.25 * Z : BLUE_R + 0.25 * Z).toFixed(3)}, or reword to "in the middle of the zone"`
            : `move it to x=${(end === "left" ? (1 - BLUE_R) - 0.78 * Z : BLUE_R + 0.78 * Z).toFixed(3)} (below the dots), or drop the depth word`,
          lineOf(subj.id ? `"id": "${subj.id}"` : `"correct"`));
      }
    }

    // ── PC-2  "a forechecker has sealed the strong-side wall" needs a sealer there
    if (/\bseal(?:ed|s|ing)?\b[^.]{0,40}\bwall\b|\bwall\b[^.]{0,30}\bseal(?:ed)?\b/i.test(BOARD) && puck && end) {
      const wallY = puck.y > 0.5 ? 1 : 0;               // strong side = the puck's side
      const upIce = end === "left" ? 1 : -1;            // away from your own goal line
      const sealers = defs.filter((a) => Math.abs(a.y - wallY) <= 0.20 &&
        (upIce > 0 ? (a.x > puck.x && a.x < puck.x + 0.35) : (a.x < puck.x && a.x > puck.x - 0.35)));
      if (!sealers.length) {
        rep("PC-2 seal-not-drawn", "err", `"${(BOARD.match(/[^.]*seal[^.]*\./i) || [""])[0].trim()}"`,
          `no defender sits in the strong-side wall corridor (|y-${wallY}| <= 0.20 i.e. within 6m of that wall, x between the puck at ${puck.x} and ${(puck.x + upIce * 0.35).toFixed(2)}). Defenders: ${defs.map((x) => `${x.id}(${x.x},${x.y})`).join(", ")}`,
          `move one defender onto that wall: y ~= ${(wallY ? 0.86 : 0.14).toFixed(2)}, x ~= ${(puck.x + upIce * 0.12).toFixed(2)} (between the carrier and the up-wall outlet)`,
          lineOf(`"prompt"`));
      }
    }

    // ── PC-3  "you are first forechecker" => no teammate is closer to the carrier
    if (/\bfirst\s+forechecker\b|\bF1\b[^.]{0,20}forecheck/i.test(BOARD) && player) {
      const carrier = puck ? (defs.slice().sort((a, b) => metres(a, puck) - metres(b, puck))[0] || puck) : null;
      if (carrier) {
        const mine = metres(player, carrier);
        const nearer = mates.filter((t) => metres(t, carrier) < mine);
        if (nearer.length) {
          rep("PC-3 not-actually-F1", "err", `"first forechecker"`,
            `YOU (${player.id}) is ${mine.toFixed(1)}m from the carrier ${carrier.id}; ${nearer.map((t) => `${t.id} is ${metres(t, carrier).toFixed(1)}m`).join(", ")}`,
            `pull ${nearer.map((t) => t.id).join("/")} back behind YOU, or reword the prompt to F2`,
            lineOf(`"prompt"`));
        }
      }
    }

    // ── PC-4  the keyed pass must clear the GOALIE as well as the defenders.
    // schema.js checks defenders on `path` interactions only; nothing anywhere
    // checks the goalie, and nothing checks `point` answers at all.
    const impliesPass = /one[- ]timer|cross[- ]ice|pass(?:ing)?\s+(?:lane|look|to)|feed\b|in stride|move it (?:across|backdoor)|the pass\b|receive/i.test(BOARD);
    if (impliesPass && target) {
      const src = puck || player;
      if (src) {
        const bl = [];
        if (goalie && segDist(goalie, src, target) < INTERCEPT) bl.push(["GOALIE", goalie, segDist(goalie, src, target)]);
        for (const dd of defs) if (segDist(dd, src, target) < INTERCEPT) bl.push(["defender", dd, segDist(dd, src, target)]);
        if (bl.length) {
          rep("PC-4 lane-blocked", "err",
            `"${((BOARD.match(/[^.]*(one-timer|cross-ice|passing lane|feed|backdoor|in stride)[^.]*\./i) || [""])[0]).trim().slice(0, 170)}"`,
            `the line from the puck (${src.x},${src.y}) to the keyed answer ${target.zid || `(${target.x},${target.y})`} passes ${bl.map((b) => `${b[0]} "${b[1].id}" at (${b[1].x},${b[1].y}) by only ${b[2].toFixed(3)} (${(b[2] * MX).toFixed(1)}m of lateral ice)`).join("; ")} — inside the engine intercept radius ${INTERCEPT}`,
            `re-key the target so the pass does not cross the crease, or move the receive point up-ice`,
            lineOf(`"correct"`));
        }
      }
    }

    // ── PC-4b  CROSS-CREASE RELOCATION. A keyed answer that sits deep on the far
    // side of the ice from the puck is only worth anything if a puck can get
    // there. Fires without needing a pass word in the copy, because "tap the open
    // ice to attack" implies the same delivery. Also covers `place` answers.
    {
      const targets = [];
      if (target) targets.push(target);
      for (const p of (F.correct?.placements || [])) { const t = resolveT(p); if (t) targets.push({ ...t, id: p.id }); }
      const src = puck;
      if (src && end) for (const t of targets) {
        const crossCrease = (t.y > 0.5) !== (src.y > 0.5) && Math.abs(t.y - src.y) > 0.25;
        const bothDeep = depth(src.x, end) > 0.60 && depth(t.x, end) > 0.60;
        if (!(crossCrease && bothDeep)) continue;
        const bl = [];
        if (goalie && segDist(goalie, src, t) < INTERCEPT) bl.push(["GOALIE", goalie, segDist(goalie, src, t)]);
        for (const dd of defs) if (segDist(dd, src, t) < INTERCEPT) bl.push(["defender", dd, segDist(dd, src, t)]);
        if (bl.length) {
          rep("PC-4b cross-crease-lane", "err", `keyed answer ${t.zid || t.id || `(${t.x},${t.y})`} is cross-ice and deep`,
            `the delivery line from the puck (${src.x},${src.y}) to it passes ${bl.map((b) => `${b[0]} "${b[1].id}" at (${b[1].x},${b[1].y}) by only ${b[2].toFixed(3)} (${(b[2] * MX).toFixed(1)}m of lateral ice)`).join("; ")} — inside the engine intercept radius ${INTERCEPT}. The pass would have to go through the crease`,
            `pull the receive point up-ice (d ~= 0.45-0.55, x ~= ${(end === "left" ? (1 - BLUE_R) - 0.5 * Z : BLUE_R + 0.5 * Z).toFixed(3)}) so the pass crosses ABOVE the goalie`,
            lineOf(`"correct"`));
        }
      }
    }

    // ── PC-13  the goalie must be on its own goal line and in its net
    if (goalie && end) {
      const gx = goalX(end);
      // A goalie sitting a little inside the net mouth is normal drafting; only
      // flag it past 0.7m behind the line, or off the net's centre line.
      const behind = end === "left" ? (goalie.x < gx - 0.012) : (goalie.x > gx + 0.012);
      const offCentre = Math.abs(goalie.y - 0.5) > 0.10;
      if (behind || offCentre) {
        rep("PC-13 goalie-off-net", "err", "goalie placement",
          `goalie "${goalie.id}" at (${goalie.x},${goalie.y}); the goal line is x=${gx.toFixed(4)} and the net mouth spans y ${NET_Y0}-${NET_Y1}. ${behind ? `It is ${(Math.abs(goalie.x - gx) * MX).toFixed(1)}m BEHIND the goal line (drawn inside the net). ` : ""}${offCentre ? `It is ${(Math.abs(goalie.y - 0.5) * MY).toFixed(1)}m off the centre of the net.` : ""}`,
          `place the goalie just in front of the line at x ~= ${(end === "left" ? gx + 0.012 : gx - 0.012).toFixed(3)}, y ~= 0.50`,
          lineOf(`"id": "${goalie.id}"`));
      }
    }

    // ── PC-5  offside: an attacker past the blue line with the puck still outside
    {
      const dir = end || (stage.attackDir === "right" ? "right" : stage.attackDir === "left" ? "left" : null);
      if (dir && puck) {
        const blue = dir === "right" ? BLUE_R : 1 - BLUE_R;
        const inOZ = (x) => dir === "right" ? x > blue + 0.005 : x < blue - 0.005;
        if (!inOZ(puck.x)) {
          const off = A.filter((a) => (a.kind === "player" || a.kind === "teammate") && inOZ(a.x));
          if (off.length) {
            rep("PC-5 offside", "err", "attacking scene",
              `puck x=${puck.x} is outside the blue line (${blue.toFixed(3)}) but ${off.map((a) => `${a.id} x=${a.x}`).join(", ")} ${off.length > 1 ? "are" : "is"} inside`,
              `pull them back behind x=${blue.toFixed(3)}, or carry the puck in first`,
              lineOf(`"id": "${off[0].id}"`));
          }
        }
      }
    }

    // ── PC-6  strong / weak side must be keyed to the puck's y
    if (puck) {
      const central = Math.abs(puck.y - 0.5) < 0.06;
      const cl = BOARD.match(/\b(strong|weak)[- ]side\b/i);
      if (cl && central) {
        rep("PC-6 strong-weak-undefined", "warn", `"${cl[0]}"`,
          `the puck is at y=${puck.y}, within 1.8m of centre — strong/weak side is undefined there`,
          `move the puck clearly to one side (|y-0.5| > 0.10) or drop the wording`, lineOf(`"prompt"`));
      }
      if (target && /weak[- ]side/i.test(BOARD) && !central && (target.y > 0.5) === (puck.y > 0.5)) {
        rep("PC-6 weakside-wrong", "err", `"weak-side"`,
          `puck y=${puck.y} but the keyed weak-side target y=${target.y} is on the same side of centre`,
          `mirror the target to y=${(1 - target.y).toFixed(2)}`, lineOf(`"correct"`));
      }
    }

    // ── PC-7  named-spot containment (subject resolved conservatively)
    if (end) for (const [spot, re] of SPOT_RE) {
      const S = SPOTS[spot];
      for (const sent of BOARD.split(/(?<=[.!?])\s+/)) {
        const hit = sent.match(re); if (!hit) continue;
        const post = sent.slice(hit.index, hit.index + hit[0].length + 30);
        if (EMPTINESS.test(post)) continue;        // region-emptiness claim, not containment
        const pre = sent.slice(Math.max(0, hit.index - 25), hit.index);
        let subj = null, why = "";
        if (DEST_RE.test(pre) && target) { subj = target; why = "keyed destination"; }
        if (!subj) { const b = bindSubject(sent, hit.index, hit[0]); if (b) { subj = b.subj; why = `referent "${b.why}"`; } }
        if (!subj) continue;                       // no resolvable referent -> never guess
        const D = depth(subj.x, end);
        if (S.grey(D, subj.y)) continue;
        rep(`PC-7 spot:${spot}`, S.sev, `"${hit[0]}"  [sentence: ${sent.trim().slice(0, 110)}]`,
          `subject ${subj.id || `keyed target (${subj.x},${subj.y})`} [${why}] at (${subj.x},${subj.y}) -> d=${D.toFixed(3)}; "${spot}" requires ${S.desc}`,
          `move it into the region, or rename the spot`, lineOf(subj.id ? `"id": "${subj.id}"` : `"correct"`));
      }
    }

    // ── PC-8  a keyed "tap where you shoot" must land inside the net mouth
    if (target && /\bwhere (?:you|to) shoot\b|\bshooting lane\b|\bShoot\b|\bopen (?:far )?side\b/i.test(BOARD) && end
        && Math.abs(target.x - goalX(end)) < 0.06) {
      const gx = goalX(end);
      if (!(Math.abs(target.x - gx) < 0.03 && target.y >= NET_Y0 - 0.01 && target.y <= NET_Y1 + 0.01)) {
        rep("PC-8 shot-off-net", "err", `"tap where you shoot"`,
          `keyed target (${target.x},${target.y}); the net mouth is x=${gx.toFixed(3)}, y ${NET_Y0}-${NET_Y1}. The keyed point is ${(Math.min(Math.abs(target.y - NET_Y0), Math.abs(target.y - NET_Y1)) * MY).toFixed(1)}m outside the nearest post`,
          `key y inside ${NET_Y0}-${NET_Y1} (e.g. 0.48 for the far side)`, lineOf(`"correct"`));
      }
    }

    // ── PC-9  a placement whose start is barely outside tolerance is invisible
    if (F.interaction?.kind === "place") for (const p of (F.correct?.placements || [])) {
      const a = by[p.id], t = resolveT(p); if (!a || !t) continue;
      const dist = Math.hypot(a.x - t.x, a.y - t.y);
      if (dist <= t.tol * 1.5) {
        rep("PC-9 move-invisible", dist <= t.tol ? "err" : "warn", `drag "${p.id}"`,
          `${p.id} starts (${a.x},${a.y}); target ${t.zid || `(${t.x},${t.y})`} tol ${t.tol}; distance ${dist.toFixed(3)} = ${(dist / t.tol).toFixed(2)}x the tolerance`,
          `start it at least 2x the tolerance away, or shrink tol to <= ${(dist / 2).toFixed(3)}`,
          lineOf(`"id": "${p.id}"`));
      }
    }

    // ── PC-10  "within a stick length" must be within stick reach (~2.5m)
    if (/\bstick\s+length\b|\breach the carrier with your stick\b|\bgap is tight\b/i.test(BOARD) && player) {
      const c = defs.slice().sort((a, b) => metres(a, player) - metres(b, player))[0];
      if (c && metres(c, player) > 2.5) {
        rep("PC-10 reach-claim", "warn", `"tight gap / stick length"`,
          `nearest opponent ${c.id} is ${metres(c, player).toFixed(1)}m away (x-axis 60m, y-axis 30m); stick + reach is ~2.0-2.5m`,
          `close the gap to <= 2.5m`, lineOf(`"id": "${player.id}"`));
      }
    }

    // ── PC-11  "shaded / stepped toward X" must actually be drawn
    {
      const mm = BOARD.match(/\b(?:has\s+)?(?:stepped|shaded|shades|cheated|committed)\s+(?:hard\s+)?(?:toward|to|towards)\s+(?:the\s+)?(LW|RW|LD|RD|puck|wall|net|slot)\b/i);
      if (mm && defs.length) {
        const key = mm[1].toUpperCase();
        const ref = key === "PUCK" ? puck : A.find((a) => a.tag === key);
        if (ref) {
          const near = defs.map((dd) => ({ dd, dist: metres(dd, ref) })).sort((a, b) => a.dist - b.dist)[0];
          if (!(Math.sign(near.dd.y - 0.5) === Math.sign(ref.y - 0.5) && Math.abs(near.dd.y - 0.5) > 0.06)) {
            rep("PC-11 shade-not-drawn", "err", `"${mm[0]}"`,
              `nearest defender ${near.dd.id} at (${near.dd.x},${near.dd.y}); ${key} at (${ref.x},${ref.y}) — the defender is not displaced toward ${key} (|y-0.5| = ${Math.abs(near.dd.y - 0.5).toFixed(3)})`,
              `move ${near.dd.id} to y ~= ${(ref.y > 0.5 ? 0.62 : 0.38).toFixed(2)} so the shade is visible`,
              lineOf(`"id": "${near.dd.id}"`));
          }
        }
      }
    }

    // ── PC-12  zone vocabulary on a U7/U9 board (Hockey Canada: cross-/half-ice)
    {
      const u = Math.min(...[].concat(s.levels || s.level || []).map((l) => { const q = String(l).match(/U\s*(\d+)/i); return q ? +q[1] : Infinity; }), Infinity);
      if (u <= 10) {
        const mm = BOARD.match(/\bblue\s+line\b|\bthe\s+zone\b|\boffensive\s+zone\b|\bdefensive\s+zone\b|\bneutral\s+zone\b|\bat the point\b|\bhalf[- ]wall\b|\bhigh\s+slot\b/i);
        if (mm) {
          rep("PC-12 young-zone-vocab", "warn", `"${mm[0]}"`,
            `U${u} board; Hockey Canada plays U7 cross-ice and U9 half-ice — no blue line, point or neutral zone exists in their game`,
            `use net-relative language instead`, lineOf(`"prompt"`));
        }
      }
    }
  }
}

// dedupe: prompt and mc.stem often repeat the same clause on one board
const seen = new Set();
for (let i = findings.length - 1; i >= 0; i--) {
  const k = `${findings[i].seed}|${findings[i].frame}|${findings[i].code}|${findings[i].geom}`;
  if (seen.has(k)) findings.splice(i, 1); else seen.add(k);
}
const ord = { err: 0, warn: 1 };
findings.sort((a, b) => (ord[a.sev] - ord[b.sev]) || a.file.localeCompare(b.file) || a.code.localeCompare(b.code));
console.log(`FILES ${files.length}  FRAMES ${frameCount}  FINDINGS ${findings.length} (err ${findings.filter((f) => f.sev === "err").length}, warn ${findings.filter((f) => f.sev === "warn").length})\n`);
for (const f of findings) {
  console.log(`[${f.sev.toUpperCase()}] ${f.code}\n  ${f.file}:${f.line}${f.frame ? `  (${f.frame})` : ""}   seed=${f.seed}\n  CLAUSE : ${f.clause}\n  GEOM   : ${f.geom}\n  FIX    : ${f.fix}\n`);
}
process.exit(findings.some((f) => f.sev === "err") ? 1 : 0);
```

Expected output on the corpus as of 2026-08-03:
`FILES 30  FRAMES 34  FINDINGS 22 (err 15, warn 7)`.

**Note on the `file:line` numbers the script prints.** `lineOf` finds the first
matching token in the file, which is approximate for actors that appear more than
once. The line numbers cited in section 4 above were verified by hand against each
file and are exact; treat the script's as a pointer, and tighten it with a real JSON
position parser before committing it.

---

## 9. Limitations of this lint

Stated so the scope stays honest and nobody over-trusts a green run.

1. **Subject resolution is heuristic.** It skips rather than guesses, so it
   under-reports. Claims whose referent is an untagged noun ("your winger", "the
   opponent", "the D") are silently not checked unless that noun happens to be an
   actor id.
2. **Single-frame only.** Section 5's defect — a claim true on `pos` and false on
   `enter` — is invisible to it. Multi-frame plays need a rule that knows which
   frame the question is asked on.
3. **It cannot judge tactical aptness.** Containment is checkable; whether the named
   spot is the *right* spot to name is not.
4. **The half-wall is unvalidated** by design, and it is implicated in four of the
   fifteen errors. Settle the three in-repo definitions and this lint gets sharper.
5. **It does not run on `src/play/plays/` or `src/cognitive-gym/`**, which is where
   two of the four reported instances actually live.
6. **`lineHitsCircle` semantics are copied from the engine**, including its
   anisotropy. A lane that clears the goalie by 0.036 normalized clears by 2.2 m in
   x but only 1.1 m in y. Both are reported; a coach should read the metric one.
