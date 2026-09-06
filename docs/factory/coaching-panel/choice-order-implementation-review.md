# Choice-order implementation review

**Reviewed:** 2026-09-06  
**Scope:** Tasks 2 and 3 of `docs/superpowers/plans/2026-09-06-question-choice-quality.md`

## Result

The earlier analytics finding is resolved. Event creation now receives the active question's option IDs, requires the displayed IDs to match that set, and does not persist the validation-only `questionOptionIds`. The regression test rejects foreign IDs.

The earlier free-reflection finding is resolved. The client omits an explain response from coaching feedback, and the server independently removes explain answers and unknown top-level context fields. The regression test covers both behaviors.

## Remaining required change

**P2 — Coaching-feedback context validation is only a top-level whitelist.** `tools/coaching-feedback-plugin.mjs` copies `actors`, `puck`, and every non-explain `answer` value without validating or projecting their nested shapes. A same-origin request can therefore persist arbitrary nested fields, including personal text, inside an allowed container such as `actors[0]`, `puck`, or a choice answer. This leaves Task 3's bounded metadata/privacy requirement dependent on the current client rather than enforced at the persistence boundary. Project actors to `{id,x,y,facing}`, puck to its expected coordinate fields, validate `view`, and validate answers according to the active question type before storing them. Add a regression with unknown nested fields and a malformed/non-ID choice answer.

## Verification

`node --test src/one-on-one/choicePresentation.test.mjs src/one-on-one/experimentalPracticeAnalytics.test.mjs tools/coaching-feedback-context.test.mjs` passed 19/19 tests.

No new ordering, source-mutation, saved-response, or rerender-stability defect was found in this recheck.

## Follow-up recheck

The nested-context portion of the P2 finding is resolved. Actors are projected to `id`, `x`, `y`, and `facing`; puck context is projected to coordinates and an optional bounded owner; view is enumerated; position answers are projected to coordinates; explain answers remain omitted; and opaque answer objects are rejected. The focused choice-presentation and feedback-context run passed 12/12 tests.

One residual part remains before the finding is fully closed: choice, multi, and sequence answer arrays are checked only as bounded strings. They are not checked against the active question's `options[].id` values. A crafted same-origin request can therefore persist arbitrary short text in `context.answer`. Require each answer ID to belong to the active question, reject duplicates where the question type does not permit them, and add a foreign-answer-ID regression. With that change, the privacy/context finding can be closed.

## Final disposition

The residual answer-validation gap is resolved. Choice, multi, and sequence answers now require unique IDs drawn from the active question's options; arbitrary short text and duplicate IDs are rejected, while an empty initial answer remains valid. The focused feedback-context suite passed 7/7 tests. The Task 2/3 review has no remaining code findings within the reviewed scope.
