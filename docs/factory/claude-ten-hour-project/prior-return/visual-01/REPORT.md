# visual-01 report

Reviewer: Claude Sonnet 5, this session. **NOT qualified to clear** (4/8 known calibration defects missed -- see `output/calibration/reconciliation.json`). Every verdict here is provisional, pending qualified (human or requalified) review.

## Targets: 5/5 inspected

| questionId | verdict | blind==key | desktop 1365x900 | phone 390x844 | interaction tested |
|---|---|---|---|---|---|
| exp26-u9-003-q3 | no-defect-found-in-this-unqualified-pass | yes | done | done (2 shots) | yes, correct + incorrect |
| exp26-u9-007-q5 | no-defect-found-in-this-unqualified-pass | yes | done | done | yes, correct |
| exp26b-u9-003-q5 | no-defect-found-in-this-unqualified-pass | yes | done | done | no (representative sampling) |
| exp26b-u9-004-q5 | no-defect-found-in-this-unqualified-pass | yes | done | done | no (representative sampling) |
| exp26b-u9-005-q5 | no-defect-found-in-this-unqualified-pass | yes | done | done | no (representative sampling) |

## What was actually checked

- Hash/version identity for all 5 targets verified against the pinned sourceCommit's live composed bank (`output/verify-hashes.mjs`) -- 0 mismatches.
- Production wording at `ice-iq.vercel.app` matched the source-commit JSON verbatim for all 5 (checked while reading each rendered question) -- no stale-baseline holds.
- All 5 blind answers (solved from manifest + blind.json only, before opening after-solve.json) matched the authored key exactly.
- Real screenshots captured at both required viewports for all 5; two of the five phone captures needed a second scrolled shot to show the full scene (per assignment allowance for mobile).
- Two representative interactive tests run against the live app (one multi-select, one single-choice), each with both a correct and an incorrect submission, confirming the app's own scoring/feedback text matches the authored explanation.

## Findings

None rise to `repair`. Two notes for Codex, not defects:

1. **3D-rink accessibility fallback text.** The accessibility tree on every one of these 5 questions reports "This browser cannot display the 3D rink," even though the actual rendered screenshot displays correctly (a 2D/broadcast-style top-down render). This may be a headless-Chromium WebGL limitation specific to this review environment rather than a real user-facing defect -- flagging so Codex can check whether real users (or other automated checks) ever see the literal fallback text instead of the scene.
2. **Portrait camera crop changes apparent up/down without changing the front/behind read.** On `exp26b-u9-005-q5`, the phone crop shows a visually different arrangement (Gold1 appears higher, Navy2 lower) than the desktop crop, but the YOU-relative front/behind relationship the question actually asks about reads the same on both. Not a defect here, but worth a spot-check elsewhere in the bank in case a future question ever asks about screen-relative position rather than facing-relative position on a scene where portrait/landscape crops diverge more.

## Second review

Dispatched to the `hockey-authority` subagent (same model family/vendor as this session -- disclosed, not independent in the strict sense OPERATING-CHARTER.md asks for). Results land in `output/visual-01/second-review.json` when returned.

## Limitations

- Camera-angle variation (Rink side / Behind net / Overhead) was not exhaustively cycled for any of these 5; only the default Broadcast camera was captured, since none of the scene evidence needed here depended on an obscured default view.
- No claim of human-coach approval. No live change requested or made.
