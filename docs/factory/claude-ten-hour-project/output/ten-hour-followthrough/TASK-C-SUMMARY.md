# Task C summary: draft revisions

**Status: draft-not-reviewed / provisional-needs-qualified-review for everything below. No mastery credit, coaching clearance, or automatic promotion granted.**

## 1. The 10-vs-12 count defect (stated first)

`prior-return/REPORT-BACK-TO-CODEX.md` (line 112) claims "4 lesson briefs, 12 draft26-* question drafts." The actual `questionDrafts` array in `prior-return/curriculum-drafts.json` has **10** entries, not 12 — the file's own `totalDraftCount.questionDrafts` field (12) is wrong against its own array. The 4 `lessonBriefs` are correctly counted. Distribution: skating (2), U7-vocab (2), U9-receiving (2), U11-cause-effect (4). Treated as a real defect, not silently patched (see `draft-revisions.json`'s `countDefect`).

## 2. What happened to the 10

All 10 are **revised** (none withdrawn). Each had a concrete defect against the schema the live bank actually uses (`src/one-on-one/experimentalBankCore.js`), separate from content quality: 3 had coordinates entirely off the rink (up to ~2.9x past the real board bound); all 10 lacked the mandatory `puck` object; 2 had no actor at all, which the schema forbids; 1 used the `position` type for a premise (tap a landmark) that type can't express, since `position` always moves a named actor under non-objective grading — changed to `choice`; 2 rendered a "hypothetical" as an actual moved defender, breaking the family's own "no motion from a static pose" rule and schema-impossible (see §4) — fixed by pinning that actor to baseline and stating the change in prompt text only. One distractor was reworded for asserting unrendered future motion. Full detail (before/after, sha256 of each original, sources, geometry, schema checks) is in `draft-revisions.json`.

## 3. New drafts: none added

The imbalance (2 each for three briefs vs. 4 for cause-effect) is real, but no new drafts were added: the under-represented briefs had real, fixable structural defects worth the full effort on their own, and fixing those was judged higher-value than adding unreviewed content, with no qualified reviewer available. Explicit and discretionary, not a claim the imbalance is resolved.

## 4. Most important schema-uncertainty resolved

**One scenario = one setup, shared by every question on it — no way to render two different freezes under a single scenarioId.** Resolves `curriculum-gap-plan.json`'s own gap #7 uncertainty in the negative: both U11 cause-and-effect pairs moved their "hypothetical" actor's coordinates between q1 and q2, which the schema can't support. Fixed by keeping the render fixed and stating the change only in prompt text, matching the bank's real "Imagine/Suppose" questions. Runner-up: `explain`-type questions have **no accepted-answer or grading mechanism** — the `explanation` field is fixed coaching text shown regardless of the answer, so the plan to author an "acceptable-answer set" for that type described something that doesn't exist.

## Also corrected

Citation swap: the U9-receiving source (`hc-u9-half-ice-rules`) has no passing/receiving content on re-fetch; replaced with `hc-u9-skills` ("Moving Passing and Receiving"). Magnitude check: "F1 slides two steps" claimed ~1.5-2m to close a ~6m gap — reworded. Every revision is **schema-partial, not schema-complete**: the live bank needs 6-10 questions per scenario across ≥4 types; every draft here has 1-2 — an open requirement, not manufactured volume.

Outputs: `draft-revisions.json` (10 entries), `source-ledger.json` (6 independently re-verified Hockey Canada sources, fetched and read in full this session), this summary.
