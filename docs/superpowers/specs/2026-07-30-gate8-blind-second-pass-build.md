# Gate 8 blind second-pass agreement — build record

**Status:** Real, working infrastructure. Not wired into the (not-yet-built)
Phase 1-6 scenario-engine pipeline — that pipeline doesn't exist yet, only
Phase 0 has been built. This is Priority 1 from
`docs/superpowers/specs/2026-07-30-tactical-judgment-trust-design.md`, built
as standalone, reusable infrastructure that Phase 6 can adopt directly when
it's built, and usable right now, live, independent of that timeline.

## What was built

- `src/scenario-engine/gate8Rubric.js` — the fixed, versioned rubric
  (`gate8-hockey-judgment-v1`), embedding `docs/scenario-family-standards.md`'s
  Decision-Training Principles and Variant Rules verbatim (the same governing
  document gate 5's SSR rubric already quotes from — one source of truth for
  both gates). Judges four dimensions, matching the canonical spec's gate-8
  definition exactly: hockey accuracy, ambiguity, pedagogy, adversarial
  failure modes.
- `src/scenario-engine/gate8BlindSecondPass.js` — `normalizeVerdict()`
  (deterministic post-processing: a malformed, incomplete, or
  any-dimension-uncertain verdict is never silently treated as a pass) and
  `combineBlindPasses()` (the actual agreement rule: only two independently
  clean passes clear a candidate for the existing calibration-tier
  evaluation; anything else — a fail, an uncertainty, or a disagreement
  between the two passes — routes to Thomas's queue with both full verdicts
  attached, minority-veto, never averaged, never majority-voted).
- `src/scenario-engine/gate8BlindSecondPass.test.mjs` — 18 tests, all
  passing, proving the combination logic's safety properties directly: a
  single malformed pass can never be outvoted into a pass; uncertainty never
  clears silently; disagreement always routes to a human, never gets
  averaged.

## What it deliberately does not do

Per the design doc's own caution: this does not treat agreement as a
confidence score, and does not auto-promote anything by itself. Agreement
only ever *widens eligibility* for the calibration-tier bar that already
exists (50 decisions, 20/template, 20%+10 holdout, zero wrong-answer false
approvals) — it never substitutes for it.

Both passes must run from an attended Claude Code session (framework-fit
decision 8) — there is no headless/API path here, and none should be added.

## Live proof — results

Ran genuinely independent blind passes (two Claude Code Agent-tool dispatches
per case, each with zero visibility into the other's reasoning or verdict)
against two cases, then ran both real verdict pairs through the actual
`combineBlindPasses()` code (not narrated by hand).

### Case 1 — the real, current `dz_breakout` breakout play, unmodified

**Result: `needs-human` (disagreement).** Pass A returned a clean pass on all
four dimensions. Pass B independently found a real adversarial-guessability
issue: the two wrong-answer tap zones sit close to the opposing defenders'
actual positions (`into_pressure`'s zone is 5.7 units from F1; `through_the_slot`'s
zone is 15.0 units from F2, the closest of any zone to F2), while the correct
zone is by far the closest to the friendly support winger W1 (16.6 units, vs
36.1 for the remaining wrong zone) — meaning a player could plausibly tap the
correct answer via "avoid the zone near a red dot, go toward the zone near
the blue dot" without ever reasoning about which side the forechecker
committed to, the actual concept being taught.

**Independently re-verified, not taken on faith:** recomputed all four
cited distances by hand from the real coordinates (F1 [183,64], F2 [162,42],
W1 [172,16], and the four real zone centers) — every number Pass B cited
matches exactly (5.66, 15.01, 16.64, 36.09 vs. the reported 5.7, 15.0, 16.6,
36.1).

This is a genuine, previously-undetected finding on the single most
scrutinized scenario in the whole session — audited, geometry-corrected, and
manually reviewed multiple times tonight, and still missed by a single pass
(Pass A) and by every human/AI review that happened earlier. It surfaced only
because a second, independent pass was required to agree before treating the
scenario as clean. This is not a proposed fix — flagging it, not touching the
play's zone placement, since that's a content decision.

### Case 2 — the same play with one deliberate flaw injected

`into_pressure`'s `no` field replaced with `"That's not the correct choice."`
(a direct, isolated violation of "Mistakes are data — never just mark it
incorrect," changing exactly one field so detection is a clean signal, not
confounded with unrelated content quality).

**Result: `agree-fail` (both passes independently rejected it).** Both passes,
with zero visibility into each other, caught the exact same defect, cited the
exact same field, and both explicitly quoted the standard's "never just mark
it incorrect" language as the violated rule. Confidence: high on both passes.

### What this proves

- The mechanism does not rubber-stamp: a clean-looking, heavily-reviewed
  scenario still triggered a real, verified disagreement on its first live
  run.
- The mechanism reliably catches a real, isolated pedagogy defect: two
  independent passes converged on the identical root cause without seeing
  each other's reasoning.
- The combination code (`combineBlindPasses`) classified both real cases
  correctly on the first run, with no adjustment needed after the fact.
