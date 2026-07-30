# Kernel batch review — twoOnOne, 3 candidates — NOT promoted

**Status:** reviewed, held. None of the 3 candidates below are in the
catalog. This is a review record, not a batch plan awaiting execution — per
`docs/play-kernel-standards.md`'s Bulk-Assisted Creation Rule, promotion
requires the batch to pass validation, build, telemetry, scenario-family
tests, and manual playtest review for all three age tiers. This batch didn't
get that far: gate 8 rejected all three before manual playtest was reached.

## What this was

Three novel, validator-clean, novelty-gate-passing candidates from the
`twoOnOne` kernel's ready tray (`docs/factory/kernel-expansion-report.md`),
selected to cover both `commit` branches (`stepsUp`, `holdsMiddle`) and both
`shape` variants (`trailer`, `backPost`):

- `k2v1_steps_up_d0_trailer_s1`
- `k2v1_holds_middle_d0_backpost_far_s1`
- `k2v1_holds_middle_d0_trailer_s1`

Each went through the gate-8 blind second-pass mechanism built earlier
tonight (`src/scenario-engine/gate8Rubric.js`,
`gate8BlindSecondPass.js`): two independent agents, no visibility into each
other's reasoning, judging hockey accuracy / ambiguity / pedagogy /
adversarial failure modes. Both passes must independently agree clean before
a candidate is even eligible for the separate calibration-tier bar gate 9
owns — agreement is never treated as promotion evidence on its own.

## Result: agree-fail, all three

Both independent passes rejected every candidate. That's a clean, working
gate — it caught real, specific, quotable problems, not vague unease.

## What was systemic (affects the kernel generator, not one instance)

**1. Positional answer-key leak — fixed tonight, catalog-wide, separately
from this batch.** Both blind passes on all three candidates independently
found the same thing: `HOLDS_MIDDLE_OPTS` and `STEPS_UP_OPTS`
(`src/play/kernels/twoOnOneKernel.js`) hard-code the correct option at array
index 1 of 4, with no shuffle anywhere in the render path. Checking the
*live* catalog confirmed this wasn't kernel-only: the hand-authored plays
those templates were copied from (`twoOnOneRead.js`, `defenderHoldsMiddle.js`,
and their variants) carry the identical fixed-position pattern, and a
catalog-wide scan found 62% of all question nodes put the correct answer
*first*, with the entire odd-man-reads family at position *two* — together,
22 of 26 real question nodes (85%) solvable by "try button 1, then button 2,"
zero hockey reading required. This is now fixed at the render layer, not
per-play: `AnimatedPlay.jsx` shuffles `ask.opts` display order per
node/judge-step (`shuffledOptions()` + `displayOpts` memo), so it protects
every existing and future button-answer play, kernel-generated or
hand-authored, without touching content. 4 new tests cover it directly
(`scripts/test-question-kinds.mjs`). This finding is the reason gate 8 was
worth running before promotion — it would have shipped 3 more instances of
a bug that already existed in the live catalog.

**2. Mirror-transform silently corrupts unmirrored fields — fixed tonight,
catalog-wide.** One pass traced `mirrorPlayY()`/`mirrorNodeY()`
(`src/play/playVariants.js`) and found it flips `enter`/`pos`/`puck`/
`freeze.y`/`motions[].from,to,via`/`overlays[].y`/`cue.y`, but never touches
`enterPuck` or `possessionChange.counterTo`. Confirmed by direct source
read: true gap, not a misreading. Confirmed harmless *today* — none of the
three currently-mirrored live plays (`twoOnOneRead.js`, `offPuckSupport.js`,
`defensiveAngling.js`) use either field — but the moment anyone mirrors a
play that does (several non-mirrored plays already do, and so do all three
kernel candidates in this batch), the mirror would silently produce
self-contradicting coordinates with no validator catching it
(`validatePossessionChange()` checks the blocked-motion endpoint against
`enter`, never `counterTo` against `pos`). Fixed: both fields now flip
correctly, with a synthetic-fixture regression test since no live play yet
exercises the gap (`scripts/test-play-engine.mjs`).

**3. Missing wrong-answer feedback fields — kernel template gap, not fixed.**
Two of the four options in `HOLDS_MIDDLE_OPTS` (`wait`, `skate_corner`) carry
only `no`, no `why`/`youngWhy` — confirmed to degrade gracefully in the
renderer (falls back to `no`), so not a rendering bug, but a real
authoring-richness gap inherited by every play this branch of the kernel
generates.

**4. D1's own commitment — the entire lesson — has no visible motion entry.**
Confirmed by source read: neither kernel branch emits a `motions` entry for
D1's `enter`→`pos` displacement (12+ ft in these instances), even though
`docs/library/odd-man-reads.md`'s own authoring notes say "the defender's
motion must be visible before the freeze." The renderer's generic 1.4s CSS
transform still moves the token, so it isn't a hard freeze/teleport, but D1
is the only moving actor without an explicit route overlay — inherited from
the hand-authored source the kernel was templated from
(`defenderHoldsMiddle.js`), not unique to generated output.

**5. Citation doesn't support the claim it's attached to.** For the
`holdsMiddle` branch specifically: `sourceRef.cite`'s exact sentence does not
appear anywhere in the cited doc (`docs/library/odd-man-reads.md` — grepped,
zero matches), and `sourceRef.url` is a generic USA Hockey small-area-games
landing page shared verbatim across both kernel branches, not a page
specific to either claim.

## What was per-instance, not systemic

- `k2v1_steps_up_d0_trailer_s1`: `pass_backdoor` option mislabeled — a real
  "backdoor" pass is a feed to a player who's snuck in behind the defense,
  not the ~27ft lateral/cross-ice feed this geometry actually depicts (both
  passes independently caught the mismatch between the id/label and the
  coordinates). Shared "turnover" outcome node gives identical feedback for
  two different wrong reads (`deke_middle` vs. `delay_wait`), so a player who
  deked gets told they hesitated.
- `k2v1_holds_middle_d0_trailer_s1` and the `backpost_far` sibling: missing
  `youngQ` on the question stem even though `ageBands` includes U9 — the
  sibling `stepsUp` branch has one, this branch doesn't, so U9 sees the
  identical adult-register sentence as U13.
- Minor keyword leak flagged independently on two candidates: the correct
  option's own text contains "open," the literal complement of the question
  stem's "takes away the pass" framing — a softer, secondary tell layered on
  top of the now-fixed positional one.

## Why this wasn't pushed through anyway

Two of the five systemic findings (positional leak, mirror corruption) are
mechanical, verifiable, and now fixed for the whole catalog — squarely
inside the standing proactive-fix mandate for RinkReads. The rest (citation
accuracy, missing age-band copy, mislabeled pass terminology, weak
wrong-answer feedback) are content-authorship calls, not code bugs, and
authoring that content well is exactly the judgment this session has
consistently deferred to Thomas rather than generating unilaterally.
Promoting 3 candidates gate 8 already rejected — even after the mechanical
fixes — would mean shipping content two independent review passes each
flagged specific, quotable problems with.

## What promotion would actually require

1. Fix `HOLDS_MIDDLE_OPTS`'s missing `why`/`youngWhy` on `wait`/
   `skate_corner`, add a D1 motion entry to both kernel branches, add
   `youngQ` to the `holdsMiddle` branch's `rush` node, and get a real
   citation (or a narrower `sourceRef.cite` that the existing doc actually
   supports) — all kernel-template-level, so a fix there propagates to every
   future candidate from this kernel, not just these three.
2. Rename/reword `pass_backdoor` (id and copy) to match what the geometry
   actually depicts, or add a genuine backdoor-shape variant that earns the
   name.
3. Give `deke_middle` and `delay_wait` distinct terminal feedback instead of
   sharing `turnover`.
4. Re-run gate 8's blind double-pass on the corrected candidates. Only then
   does manual playtest review (the batch template's own explicit gate) make
   sense to spend on them.

None of this is scheduled — it's the next step if and when Thomas wants to
push this specific batch forward.
