# Critical coaching review — experimental 100

September 5, 2026. User-selected approach: lower-cost GPT-5.6 Luna reviewers at medium reasoning; one full review of every question, with an independent second review of all flags and high-risk questions. This is an AI coaching audit, not a credentialed coach's approval.

| Coverage | Result |
|---|---:|
| Original scenarios | 100 |
| Questions reviewed in full | 600 |
| Independent second reviews | 127 |
| High-risk questions included in the second pass | 53 |
| Questions flagged in the first pass | 81 |
| Confirmed repairs, independently rechecked | 4 |
| Questions with a teaching-design flag or suggestion | 55 |
| Questions with no open AI finding | 545 |

## What changed

Three prompts allowed two defensible updates while offering a single keyed choice. `exp26-u13-014-q5`, `exp26-u15-010-q5` and `exp26-u15-013-q5` now ask for two checks and accept both in a multi-select. This supports the owner's preference for conditional alternatives rather than false certainty.

`exp26-u9-014-q6` replaces “charging” wording with a question about giving the restarting player room. Its explanation names the Hockey Canada U9 half-ice three-metre retreat and warns against applying that specific restart to every North American program. The scenario remains explicitly scoped to that model. All four scenario versions advanced to 2; all four revised questions passed the independent recheck.

## What remains flagged

A final individual check narrowed the broad 79-question sequence flag to 55 items: one scanning-order concern and 54 optional teaching-variety improvements. Twenty-four flags were rejected, including a question that was actually multi-select and questions where the stated event order was a valid learning target. The remaining questions are queued for editorial judgment about scenario-specific learning value. The recurring scan / act / recheck routine may be useful as a discussion aid, but its repetition is weak question-bank variety. The recommended next pass retains sequencing where order is the actual skill and uses changing cues, competing priorities or conditional branches elsewhere. This queue is a teaching-design concern, not proof that every suggested sequence is tactically wrong.

The first reviewers incorrectly described these suggestions as mandatory scored sequences. The independent review checked the implementation: coaching-basis responses return no correctness score, and options are shuffled. Those scoring claims were rejected. A separate flag demanding skating-speed evidence for a static U9 placement question was also rejected; the question does not claim to simulate the skate.

## How to inspect and revise

Open the local app at `?arena=experimental&review=triage#practice-arena`. The workshop offers Browse grid and Triage deck, exact question IDs, current-version flags, source notes, a link back to the rink, before/after text editing, structural checks, and a downloadable revision draft. Practice responses and local flags are isolated by player and question version. Saving a workshop draft does not change the serving bank. Existing approved-bank review routes remain at `#browse` and `#triage`.

The first reports and second-pass adjudications are retained as receipts. `catalog-review.json` contains the reconciled 600-row manifest used by the workshop; `revisions.json` records the four before/after changes. `reviewed-question-manifest.json` hashes the original scenario context plus each question. The audit checks that the current bank has no unreviewed content changes beyond the four independently rechecked revisions.

Run `node tools/audit-experimental-coaching.mjs` from the repository root to validate coverage, revision hashes and the current queue. It fails if required coverage is missing or current content has changed without a matching recheck.

## Review boundaries

The rubric emphasizes puck management, fundamentals, scanning, time and space, flexible responsibilities and defensible alternatives. It does not claim a universal positionless system. Current rule differences must be named rather than silently assuming NHL, Canadian or US youth rules are interchangeable.

All 100 scenarios remain experimental and outside approved-bank/mastery admission. The review examined question text, answer logic, age fit, sources and canonical geometry. It does not establish all rendered scenes, animation physics, on-ice transfer, measured question frequency or human-coach approval. The purchased Jack Han book was unavailable; public descriptions support topic inspiration only.
