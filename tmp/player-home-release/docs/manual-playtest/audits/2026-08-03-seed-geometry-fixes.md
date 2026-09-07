# Seed geometry fixes — remaining violations from the 2026-08-03 coordinate audit

**Date:** 2026-08-03
**Source:** [`2026-08-03-prompt-vs-coordinates.md`](2026-08-03-prompt-vs-coordinates.md) (22 findings: 15 err / 7 warn)
**Already done before this pass:** the half-wall cluster — `zones.js` `oz-/dz-half-wall-*`
moved to 0.84 / 0.16 (ANCHORS-derived) plus the two seeds that hardcoded the old
net-front depth. That cleared 3 of the 22 findings.

**This pass:** everything else that is an unambiguous geometry error, plus the
`level`/`levels` key gap. Files touched: `src/scenario/seeds/*.json` only. No
`zones.js` change. No git operations.

---

## Lint result

The audit's runnable lint (section 8) was extracted to the session scratchpad and run
before and after. It was not added to the repo.

| Run | Findings | err | warn |
|---|---|---|---|
| Audit, as published (2026-08-03) | 22 | 15 | 7 |
| After the half-wall fix (this pass's baseline) | **19** | 12 | 7 |
| After this pass | **5** | **1** | 4 |

The single remaining error is deliberate — see [Left for a human](#left-for-a-human).
No new finding was introduced by any change here.

Remaining 4 warnings, all knowingly parked:

| ID | Seed | Why parked |
|---|---|---|
| W4 | `u13_oz_backdoor_scan_v1` "high slot" | `zones.js` `oz-high-slot` (d 0.364) and `ANCHORS.highSlotRight` (d 0.65) still disagree by 16 ft. Vocab doc open question, unsettled. |
| W5 | `u13_oz_structure_place_v1` "on the wall" | The puck sits at y 0.782 — exactly `oz-half-wall-strong`'s y, i.e. on the wall by the repo's own settled zone vocabulary. The lint's `wall` band wants y ≥ 0.84. Lint fence vs. `zones.js`, not a board defect. |
| W6 | `gvis_u9_time-and-space_1gcu` "the zone" | U7/U9 zone vocabulary is explicitly held pending a decision (`2026-08-03-OPEN-WORK.md`, content section: 6 questions held on `blue line` at U7/U9). |
| W7 | `u9_off-puck-support-offense_select_v1` "offensive zone" | Same hold. |

## Test results

| Command | Before | After |
|---|---|---|
| `npm run qa` | 28 seeds — 0 error / 7 warn-only / 21 clean | 28 seeds — **0 error / 6 warn-only / 22 clean** |
| `npm run test:positional` | 18 passed, 0 failed | 18 passed, 0 failed |
| `npm run test:scenario-families` | 4 pass, 0 fail | 4 pass, 0 fail |
| `npm run preflight` | clean | clean |
| `npm run test:branching` (branch seed touched) | pass | pass |

The warning that cleared is `u13_oddman_pass_mc_v1`'s *"no wrong selection candidate is
blocked by a defender"* — the same defect E6 describes, from the other direction. The
`u9_dz_positioning_v1` goalie warning also cleared (3 warnings on that seed → 2).

---

## Fixed

### `u9_dz_positioning_v1` — goalie on its net (E11 / E15, PC-13)

`g` `(0.05, 0.27)` → **`(0.079, 0.50)`**. It was 1.0 m behind its own goal line and
6.9 m off the net's centre line, drawn out in the corner. The prompt says "between your
check and **the net**" and the feedback says "between your check and **the goalie**";
those were two points 7 m apart, so the answer was ambiguous. They are now the same
point. Clears both existing `validators.js` warnings (`goalieInCrease`,
`goalieOnPuckToNetAngle` — recomputed expected-angle y = 0.492 vs actual 0.50).

### `u11_dz_coverage_place_v1` — the puck is now in the corner (E12, PC-7)

`carrier` `(0.18, 0.80)` → **`(0.11, 0.84)`**, `puck` `(0.182, 0.802)` →
**`(0.112, 0.842)`**. The prompt says "The puck's in your corner"; d was 0.600 (at the
dots, 6.9 m out from the goal line). Now d = 0.843. Keyed answer (`dz-point-weak`, the
open weak-side point) is untouched and unaffected — the open threat is the same man.

### `u13_breakout_position_place_v1` — the seal is now drawn (E1, PC-2) + drag length (W1)

`fc1` `(0.13, 0.74)` → **`(0.14, 0.82)`**. The prompt asserts a forechecker has sealed
the strong-side wall and the wrong-answer feedback says "that lane is gone"; no defender
was in the corridor at all. `fc1` now sits **0.018 from the D → `dz-half-wall-strong`
lane (0.81 m of ice, 0.52× the 0.035 intercept radius)** — the strong-wall outlet is
genuinely taken away — while all three keyed outlets stay open:

| Keyed outlet | Nearest blocker | Clearance |
|---|---|---|
| `ww` → `dz-half-wall-weak` | `fc1` | 0.063 (1.80×, 3.75 m) |
| `sw` → (0.11, 0.63) | `fc1` | 0.062 (1.76×, 3.66 m) |
| `c` → (0.28, 0.50) | **`fc2` 0.026 (0.75×) — pre-existing, see below** | |

Chose 0.14/0.82 over the audit's suggested (0.19, 0.86): at (0.19, 0.86) the sealer is
0.081 from the outlet lane, so the wall would still not actually be sealed and
`feedback.wrong`'s "that lane is gone" would still be untrue.

W1 (drag `c`): start `(0.38, 0.50)` → **`(0.46, 0.50)`**. The required drag was 0.100
against a 0.09 tolerance (1.11×) — the answer circle nearly covered the start. Now
0.18 = 2.0× tolerance. The target itself is unchanged, so the answer is unchanged.

### `u13_oddman_pass_mc_v1` — the defender has actually shaded (E6, PC-11)

`x1` `(0.80, 0.47)` → **`(0.785, 0.38)`**. The stem asserts "the lone defender has
stepped toward the LW side" and the feedback says "the defender's position closes the
LW lane"; the defender was dead centre (0.9 m off the royal road) with both lanes
geometrically open, so the keyed answer was not better than the decoy — the read was
unanswerable from the picture.

| Lane | Before | After |
|---|---|---|
| YOU → LW (decoy, should be blocked) | 0.087 clear | **0.0285 BLOCKED** (0.81×, 1.65 m) |
| YOU → RW (**keyed**, must be clear) | 0.069 clear | **0.137 clear** (3.93×, 5.40 m) |

Used 0.785 rather than the audit's 0.80: at x = 0.80 the LW lane clears by 0.043, still
outside the intercept radius, so the feedback's claim would remain false. **The keyed
option is unchanged** (`correct.ids = ["rw"]`, `mc.ok = 0`); the fix makes the keyed
answer correct instead of arbitrary.

### `u13_oz_structure_place_v1` — cross-ice look is now real (E4, PC-4b)

`strongD` `(0.86, 0.70)` → **`(0.895, 0.74)`**. After the half-wall fix the goalie was
clear, but the strong-side D had inherited the lane: it sat **0.018** from the
puck → `oz-half-wall-weak` line, so `feedback.right`'s promise "now your winger has the
cross-ice look" was still false. Moved net-side and toward the wall (a D pinning the
winger, which is what the board depicts). Now 0.053 (1.52×, 3.19 m). Goalie 0.077
(2.20×, 4.62 m). Keyed answer (`oz-half-wall-weak`) unchanged.

### `u13_oz_winger_wall_tf_v1` — leftover from the half-wall fix (E5, PC-4b)

Three changes:

1. `correct` `(0.90, 0.22)` → **`(0.84, 0.22)`**. This is the **old** `oz-half-wall-weak`
   value, hardcoded. Its sibling board (same `stemId`, `u13_oz_winger_wall`) resolves the
   same concept through the zone id and therefore moved with the half-wall fix; this one
   did not, so the two boards disagreed about where the weak side is. Tolerance is 0.12
   and the old centre is 0.06 from the new one, so the previously-accepted region is
   almost entirely preserved. Same answer ("the weak side they vacated"), now at the
   settled depth.
2. `weakD` `(0.84, 0.52)` → **`(0.878, 0.44)`**. The board's own copy says "The
   defenceman **is standing in the net-front**, so it's covered" — but it was drawn at
   d = 0.676, mid-zone, 3.6 m out from net-front, and sitting **0.001** from the keyed
   lane. It is now at d = 0.808 (net front), which makes the copy true and clears the
   lane at 0.037 (1.06×, 2.23 m). This also makes the deliberate difference from the
   sibling board legible: `structure_place`'s weakD is "beginning to step" (d 0.503),
   this one has arrived (d 0.808).
3. `strongD` → **`(0.895, 0.74)`**, matching the sibling.

### `u13_oz_entry_trailer_branch` node `trailer` — the shot now hits the net (E7, PC-8)

Keyed shot `(0.92, 0.42)` → **`(0.928, 0.472)`** (inside the net mouth, y 0.4695-0.5305;
was 1.5 m outside the near post). Two supporting coordinates, both asserted by the
board's own copy and previously undrawn:

- `g` `(0.94, 0.50)` → **`(0.928, 0.53)`**. The prompt says "the goalie **is sliding
  across**" and the feedback says "sliding across to cover the near side; the open net
  is the far side". The goalie was drawn dead-centre, so neither side was open and the
  keyed far-side answer was arbitrary. Now on the near post (the shooter is at y 0.636,
  below centre), leaving the far side genuinely open. Still passes `goalieInCrease` and
  `goalieOnPuckToNetAngle`.
- `dman` `(0.86, 0.60)` → **`(0.83, 0.45)`**. The route that reaches this node says
  "The D **stayed on you** — the centre is alone at the back door", but the D was drawn
  in front of the trailer, **0.032 from the corrected shot line**. Any shot that actually
  hit the net went through it. Moved back to the original carrier's side, which is what
  the route text describes.

Result: shot line clears `dman` by 0.089 (2.53×, 4.37 m) and the goalie by 0.038
(1.08×, 1.88 m).

### `u13_oz_entry_trailer_branch` node `mirror` — the shot now hits the net (E8, PC-8)

Keyed shot `(0.92, 0.40)` → **`(0.928, 0.48)`** (was 2.1 m outside the near post).
Nothing in this node's copy claims the goalie has moved, so the goalie was left at net
centre. Note for the record: the corrected shot line passes the goalie at 0.022 — but
that closest approach is **at the endpoint**, i.e. it is the puck arriving at the net
0.85 m off the goalie, which is what a shot is. The lint's PC-4 does not fire here (its
`impliesPass` gate does not match this node's copy), so it is not a lint regression, but
it is worth knowing that PC-4 cannot meaningfully evaluate a shot-on-net answer — the
goalie is always near the line by construction. See
[recommendations](#recommendations).

### `u13_oz_highslot_mc_v1` and `u13_scanning_slot_v1` — "cycling low" is now low (E13 / E14, PC-1)

`tmlow` `(0.80, 0.82)` → **`(0.833, 0.82)`**, `puck` `(0.802, 0.818)` →
**`(0.835, 0.818)`** on both boards (they share the layout). d goes 0.545 → 0.659,
comfortably past the 0.61 grey fence. Used 0.835 rather than the audit's 0.85 so all
three defenders stay clearly *below* the puck, which the copy also asserts
("the defense has collapsed below the puck" / "pulled below the puck") and which
`validators.js`'s `copyMatchesDepth` checks — at x 0.85 the third defender would have
been level with the puck. Keyed answer (`oz-high-slot`) unchanged on both.

### `u13_gap_steer_boards_mc_v1` — the gap is now a stick length (W2, PC-10)

`you` `(0.47, 0.36)` → **`(0.478, 0.335)`**. The copy says "close enough to reach the
carrier with your stick" / "within a stick length"; the gap was 3.0 m metric (stick plus
reach is ~2.0-2.5 m). Now 2.11 m. Inside position (YOU between the carrier and the
middle of the ice) is preserved. Keyed answer and `mc.ok` unchanged.

Note the anisotropy trap the audit flags: the naive normalized distance here is
meaningless. 0.01 in x is 0.6 m; 0.01 in y is 0.3 m.

### `gvis_u11_decision-making_tufb` — copy, not coordinates (E9, PC-7)

`feedback.right`: *"The LW is open in the slot — right in front of the net where goals
happen."* → **"The LW is open in the slot with a clear look at the net."**
`slot_lw` at d = 0.538 is a defensible slot read (the union-polygon check passes it), but
"right in front of the net" is a net-front claim and net front starts at d ≥ 0.78 — it
was 8 m out. Coordinates deliberately untouched: `slot_lw`'s position is shared with
`u11_oz_corner_lw_crash_v1` and both `_pending` variants, and moving it would break the
siblings. Neither `_pending` variant repeats the claim.

### `u13_oz_backdoor_scan_v1` — copy, not coordinates (W3, PC-6)

`feedback.right`: *"The **weak-side** winger is sneaking in…"* → **"The **backdoor**
winger is sneaking in…"**. The puck is at y = 0.498, 0.06 m off centre, where
strong/weak side is undefined (vocab doc §6 item 7). "Backdoor" is well-defined from a
central puck, is what `feedback.wrong` already calls the same player, and is in the seed
id. Chose this over the audit's alternative (move the puck to y ≈ 0.62) because moving
the puck would define a strong side and therefore change what "weak side" refers to.

### `level` / `levels` — the four seeds carrying only one key

| Seed | Had | Added |
|---|---|---|
| `u11_oz_corner_lw_crash_v1` | `level` only | `levels: ["U11 / Atom"]` |
| `u13_scanning_slot_v1` | `level` only | `levels: ["U13 / Peewee"]` |
| `u15_scanning_weakside_v1` | `level` only | `levels: ["U15 / Bantam"]` |
| `u9_off-puck-support-offense_select_v1` | `levels` only | `level: "U9 / Novice"` |

This matters beyond tidiness: `validators.js`'s `youngestU()` reads **`levels` only** and
returns `Infinity` when it is absent, so every age gate (`noPositionTagsOnYoungBoards`,
`skaterCountWithinAgeCap`, `advancedThemesGatedByAge`,
`noPressureMechanicsOnYoungBoards`, `difficultyCeilingByAge`) was silently skipped on the
three `level`-only seeds. All three are U11+, so nothing was actually mis-gated, but a
U7/U9 board authored the same way would have bypassed all five. The lint's PC-12 reads
`levels || level`, i.e. the other key — which is exactly the mis-banding the open-work
note describes.

Verified after the change: all four still pass `npm run qa`.

---

## Left for a human

These are the ones where a fix would change **which answer is correct**. Nothing below
was touched.

### 1. `u9_dz_positioning_v1` — "the forward parked in front of the net" (E10, PC-7) — the one remaining lint error

`check` is at `(0.27, 0.44)`, d = 0.295 — 12.2 m up-ice from the goal line, near the top
of the zone. Nobody is parked in front of this net; the entire premise of the board is
undrawn.

**The audit's suggested fix would silently invalidate the keyed answer, and that needs
saying plainly.** The audit recommends moving `check` to `(0.115, 0.46)` and states the
keyed answer "then genuinely sits between `check` and the net". It does not. Own goal
line is x = 0.0667 and the keyed placement is `(0.19, 0.47)`:

| | net | check | keyed YOU |
|---|---|---|---|
| today | 0.067 | 0.270 | **0.190** — between the net and the check ✅ |
| after the audit's fix | 0.067 | **0.115** | 0.190 — *outside* the check, on the puck side ❌ |

Applying it verbatim would key a U9 defensive-positioning board to the exact mistake it
teaches against ("Drifting toward the puck leaves your check alone in front of the net").
Worse, it would not be obvious: the corrected placement would be ≈ `(0.091, 0.48)`, which
is 0.0995 from the current keyed centre against a 0.10 tolerance — the wrong answer would
still just barely score.

**Two coherent resolutions, both a human's call:**

- **(a) Move both.** `check` → `(0.115, 0.46)` **and** the keyed placement →
  `≈ (0.091, 0.48)`, keeping YOU net-side. Preserves the net-front coverage lesson, which
  is the point of the board. Changes the correct answer, so it needs a coach's eye and
  probably a tolerance review (0.10 is very generous inside a 0.05-wide corridor).
- **(b) Move neither, reword.** Drop "parked in front of the net" from the prompt,
  `read.cue` and `feedback.wrong`, describing the check as being in the middle of the ice
  instead. Zero risk to the answer, but it turns a net-front coverage board into a
  generic one and the U9 curriculum node is `u9.defensive-side-positioning`.

I recommend (a) with a coach's sign-off, not (b) — the lesson is the reason the board
exists. Note that the seed's remaining `npm run qa` warning ("prompt says
net-front/crease but the puck … isn't at the net") is `puckLocationMatchesCopy` binding
the prompt's "in front of the net" to the *puck* rather than to `check`; it is a false
positive today and will stay one under either resolution.

### 2. `u13_breakout_position_place_v1` — `fc2` blocks the keyed centre outlet

Pre-existing, unchanged by this pass, and **not caught by any rule in the audit's lint**
(PC-4b only fires on deep cross-crease targets). The keyed placement for `c` is
`(0.28, 0.50)`, and `fc2` at `(0.22, 0.55)` sits **0.026 from the D → C lane (0.75× the
intercept radius, 1.41 m of ice)** — one of the three "outlets that beat this pressure"
is itself covered by the second forechecker.

Fixing it means either moving `fc2` (which changes which outlets are open, i.e. changes
the read) or re-keying `c` (which changes the answer). Both are hockey judgment. Flagged
rather than fixed. It is the same defect class as E4/E5 and probably belongs on the next
audit list.

### 3. `u13_oz_backdoor_scan_v1` — "the high slot" (W4)

The puck is at d = 0.267. Against `zones.js` `oz-high-slot` (d 0.364) the miss is 1.7 m;
against `ANCHORS.highSlotRight` (d 0.65) it is 6.6 m. Until the high-slot vocabulary is
settled the way the half-wall was, any move is a guess at which definition wins. When it
is settled, the clean fix is to move `you`/`puck` onto the resolved `oz-high-slot`
coordinates rather than to reword.

### 4. `u13_oz_structure_place_v1` — "on the wall" (W5)

The puck sits at y 0.782, which is exactly `oz-half-wall-strong`'s y in the settled
`zones.js`. The lint's `wall` region wants y ≥ 0.84. This is a disagreement between the
lint's fence and the repo's own settled vocabulary, not a board defect — but one of the
two should move so the discrepancy stops being re-litigated.

### 5. `gvis_u9_time-and-space_1gcu` and `u9_off-puck-support-offense_select_v1` — U9 zone vocabulary (W6, W7)

Held pending the same decision as the six `blue line` questions in
`2026-08-03-OPEN-WORK.md`.

---

## Recommendations

### Promote the goalie warning to an error — yes, with a two-tier fence

`u9_dz_positioning_v1` tripped **two** existing `validators.js` warnings
(`goalieInCrease`, `goalieOnPuckToNetAngle`) with a goalie 6.9 m off its own net centre,
and shipped. That is a process finding, not a content one, and it has a concrete cause:
**`scripts/qa-sweep.mjs` exits 0 when every finding is a warning**
(`process.exit(withErr.length ? 1 : 0)`, line 64). Warnings gate nothing. Adding more
warnings will not help.

Recommended shape — do **not** simply flip `goalieInCrease` to `err`, because a goalie
legitimately leaves the crease (out challenging, playing a puck behind the net) and a
blanket error would fail those boards:

1. **Add a new `err` rule (the audit's PC-13), narrow and unarguable.** The goalie must
   not be more than ~0.7 m behind its own goal line (`|x − goalLine| > 0.012` on the wrong
   side) and not more than ~3 m off the net's centre line (`|y − 0.5| > 0.10`). Both
   conditions describe a goalie that is not on its net at all, which is never authoring
   intent. `u9_dz_positioning_v1` failed both.
2. **Keep `goalieInCrease` and `goalieOnPuckToNetAngle` as warnings** for the marginal
   band — a goalie 1-3 m off angle is a coaching judgment, not a build failure.
3. **Skip the new rule when the goalie is a placeable item**, exactly as `goalieInCrease`
   already does.

Second-order, and arguably the more important half: **make warnings visible at the gate**.
Either have `qa-sweep` exit non-zero on a warning count above a recorded baseline, or
have the seed gate require warnings to be acknowledged per-seed the way `.passes.json`
works for video. A warning nobody has to answer for is a comment.

### Also worth doing (not done here, all outside this pass's remit)

- **Wire `positionalLanguage.js` into `schema.js`.** It is written, tested (18 passing)
  and still dead code — the only importer is its own test file. One import next to
  `runHockeyValidators`. It would have caught E13/E14 at authoring time.
- **Add the goalie to the lane check.** `schema.js` checks defenders only, and only on
  `path` answers. Three of the worst findings in the original audit were keyed `point` /
  `place` answers whose delivery ran through the goalie.
- **Gate PC-4 on the answer not being a shot on net** before promoting it into
  `validators.js`. As written it cannot pass a "tap where you shoot" board: any point
  inside the net mouth is within 0.035 of a goalie standing on its net. The `mirror` node
  above is the worked example.
- **PC-2's corridor test is loose.** It only asks that a defender be *somewhere* in the
  strong-side wall band. It would have passed `fc1` at (0.19, 0.86), which does not
  actually block the outlet lane. If PC-2 is promoted to `validators.js`, test the lane
  (`lineHitsCircle` against the outlet), not the band.
- **`fc2`-class defects need a rule.** A keyed `place` target whose delivery lane from the
  puck is blocked, at any depth and on either side of the ice — PC-4b's cross-crease +
  both-deep gate is too narrow to catch it.
