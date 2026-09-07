# Practice points and Game Sense

**Date:** 2026-09-05  
**Status:** proposal for Thomas's review. This document changes no scoring, saved records, database rows, content admission or player entitlement.

## Recommendation

Connect practice to Game Sense through **evidence of decisions**, not a points conversion. Keep the child's earned practice points. Use the concepts they practise to offer a fresh, age-appropriate Game Sense check. A successful retry still earns the existing practice reward; demonstrating the concept in another situation supplies different evidence.

The smallest safe bridge is a **“Try this in a new play”** action after practice. It opens a reviewed question set for that concept and records first responses separately from rehearsal. Initially this can feed the existing quiz route and its existing session score, with no extra practice bonus added to GS. A subsequent, versioned Game Sense projection can use the richer evidence after its competency mapping and scoring policy have been reviewed.

This gives practice a visible purpose now without pretending that 1,000 practice points represent a particular hockey ability, or that a correct screen answer proves on-ice performance.

## What exists in the current worktree

| Surface | Current calculation and call path | Durable evidence available | Boundary |
| --- | --- | --- | --- |
| Guided curriculum | `GuidedCurriculum.jsx` → `scoreCurriculumQuestion` → `recordCurriculumAnswer`; `curriculumStats` awards `QUESTION_POINTS = 100` per distinct question ever answered correctly. | `rinkreads_guided_curriculum_v1:<playerId>` stores `{version:1, answers:{[questionId]:{attempted,firstCorrect,mastered}}}`. | The pack is `draft-for-review`; all lesson `approvedClaimId` values are currently null. First-correct is a useful local summary, not a timestamped first exposure or an assessment record. |
| Source practice library | `PracticeLibrary.jsx` → `SourceQuestion.onCredit` → `creditLesson` in `lessonCore.js`. | `rinkreads_practice_lessons_v1:<playerId>` stores `{[age + ':' + questionId]:{firstCorrect,mastered,points}}`; points are 100 once, not 100 per successful repeat. | Attempts, exact answers, source versions, exposure and dates are absent. Animated plays in this library do not call `creditLesson` or receive these library points. |
| Quiz session score | `App.jsx:handleQuizFinish` → `calcWeightedIQ(results)`. Accuracy is weighted by the existing difficulty weights `{1:1,2:1.5,3:2.2}`. | A history entry is `{results,score,date}`. Normal result rows contain `{id,cat,ok,d,type,speedBonus}` and sometimes `skipped`. | This is the latest-session GS calculation used on home/results/history surfaces. It is not the same formula as the competency report below. Speed bonus does not enter `calcWeightedIQ`. |
| Competency Game Sense report | `utils/gameSense.js:calcCompetencyScores` → `calcGameSenseScore`; used by `screens.jsx:GameSenseReportScreen`, trends and related coach views. | Reads `player.quizHistory[].results`. | Five competency percentages are averaged equally; an unobserved competency currently becomes zero. The report unlocks after three quiz sessions. Neither rule establishes adequate evidence per competency. |
| Skill Path rewards | `handleQuizFinish` → `path/pathProgress.js:recordNodeResult`. | `rinkreads_path_v1` → player → age band → `{xp,done:{[nodeId]:{stars,bestPct,reps,ts}}}`. | XP can rise on repeated correct lessons. Its reward-only behaviour is legitimate motivation, not an independent GS measurement. Do not import that XP as score. |
| Mixed SGS reads | `recordMixedObservation` → `recordComprehensionAnswer`; positioning uses `submitMixedPosition` → `submitPositioningRead`. | `sgsMixedDraft.js` retains a versioned active attempt, seed and archives. Observation records include the exact question, response, input method, optional reason, read index, `beforeState` and `previousState`. Position records include actor, origin, point, optional reason and before-state. | `matchesFact` checks a visible fact. It does not certify tactical positioning, scanning behaviour or an explanation. The generated positioning scenarios remain discussion drafts. |
| U15 drag exercise | `curriculumPositionCore.js` evaluates a separately registered position variant and restores its source-bound attempt. | Separate variant/attempt data, positions, input method, optional reason and recomputable exercise result. | Its authored region and geometric tolerances are an explicit coach-review draft. “Good area for this exercise” is not approved tactical mastery and does not award the original MC points. |
| Animated-play telemetry | `play/telemetry.js:logAnimatedPlayEvent`. | A device-level, capped 200-event list has `at`, `playId`, `nodeId`, event, answer ID, correctness, milliseconds and some verdict fields. | No player ID or complete attempt identity; bounded history can discard first exposure. It cannot be used as a personal historical GS ledger. |

Guided learning currently presents 24 MC questions, one per lesson; the paired 24 TF questions remain in the source and saved-history allowlist. Existing TF points are included in the total even though those questions are deferred from the current flow. Preserve them.

The quiz saves locally first through `commitPlayer` → `utils/playerCache.js:cachePlayer`; `SB.saveQuizSession` then inserts into `quiz_sessions` through `src/supabase.js`. The cache merges quiz history by taking the longer history, not by event identity. Do not append practice records to that history or change its merge policy as a shortcut: it also drives session limits, badges, streaks, Journey, coach history and reports.

### A prerequisite: current competency mapping does not cover current IDs

`getQuestionCompetency` recognises old IDs such as `u11q1` using regular expressions. A read-only inventory of the current `src/data/bank.json` found **262 questions and zero IDs matching those mappings**. There are also 28 scenario-seed files with newer IDs. Of the 262 bank questions, 156 have `conceptId`; all have `cat` and `d`.

There is a separate rule that counts every `type: "next"` result toward leadership. The bank contains 17 such questions. That rule can therefore populate leadership even while other competencies remain empty; the question format is not sufficient evidence of leadership. These findings explain why simply copying practice answers into quiz history would give a misleading result.

There are also two distinct taxonomies: the curriculum ledger's six domains and the report's five competencies. They must be mapped deliberately, not joined by similar names. Historical data may still contain valid old IDs; preserve the legacy resolver and its historical outputs while introducing an explicit mapping for future evidence.

## What should count

| Evidence | Practice reward | Proposed GS treatment |
| --- | --- | --- |
| Child corrects a wrong answer after feedback | Keep the existing once-per-question mastery points. | Record successful learning. Do not replace the earlier response or claim a fresh decision. |
| Same board, different wording, shuffled options or another input format | Keep existing rewards; avoid awarding the same legacy question twice. | Same decision identity. Format variety is useful practice, not a new tactical situation. |
| First recorded response to a reviewed, previously unseen decision freeze | Existing reward rules remain independent. | Candidate assessment evidence, with a recorded source version, exposure history and competency mapping. A wrong first response remains in the denominator. |
| Fresh situation where the relevant defender, lane or support cue actually changes | Practice reward remains separate. | Candidate evidence of applying the concept in a new situation. Tag the changed cue explicitly; do not infer transfer from a new seed or camera angle. |
| Later revisit to the same read | Keep the reward; never remove points for a mistake. | Record retention separately from fresh-situation accuracy. It is not another independent fresh example. |
| SGS carrier/actor/distance observation | A future observation reward would need its own explicit rule. None is added here. | At most evidence of identifying that visible fact. Not a tactical decision grade, and not evidence of head scanning. |
| Draft positioning region, unconstrained coach placement or optional explanation | Preserve the attempt and feedback. | Coaching evidence only until that exact rubric and acceptable-answer set pass review. Empty explanation is missing evidence, never wrong or penalised. |
| U7 faceoff-circle/blue-line discovery | Celebrate the age-appropriate learning task. | Rink knowledge, not a higher-age tactical score. The competency mapping must say exactly what was tested. |

Learning mode keeps feedback after each completed read. Challenge mode keeps answers, correctness and aggregates hidden until the whole play finishes. An assessment may record data earlier internally, but must not leak it through point changes or a progress accuracy counter. Several connected reads from one play are correlated; they must not automatically count as three independent demonstrations of the same competency.

## Explicit mapping and content eligibility

Add a reviewed, versioned registry, proposed at `src/data/game-sense-evidence-map.json`. Each entry binds an exact source question/variant and content hash to:

- age band and position scope;
- curriculum concept and ledger domain;
- **one primary assessed competency**, with optional descriptive secondary tags;
- the kind of evidence actually requested: `rink-knowledge`, `observation`, `tactical-decision`, `positioning` or `explanation`;
- a decision-family ID, a semantic decision ID, and an authored changed-cue signature;
- the source answer/rubric version and review record;
- eligibility: `reviewed-assessment`, `learning-only`, `draft` or `unmapped`.

One primary competency prevents one easy answer from inflating multiple score domains. Secondary tags can still inform coaching. For example, off-puck support may primarily assess positioning, while an odd-man pass/shoot read may primarily assess decision-making. A source-based scanning question may assess recognition of information or awareness; it cannot prove physical scanning. These examples are **proposed mappings requiring item-level review**, not a blanket automatic map of every question with that concept.

The ledger already supplies `conceptId`, `domainId`, age nodes and Introduce/Develop/Refine depth. It supplies context for the mapping, not a GS weighting formula. A category-only legacy record remains visible but must not receive an invented concept or competency. Being present in the live bank is also distinct from possessing a new assessment-review record. Start the new path with a small explicit allowlist of reviewed source hashes.

## Smallest implementable bridge

1. **Keep both existing practice point stores intact.** Show the child's practice total and concept coverage beside the current GS, with a short explanation: “Practice builds the habit. A new play shows how you use it.” Never sum library and guided totals without preserving which source awarded them.
2. **Offer a new-play check from a practised concept.** Build an explicit list of reviewed, age-appropriate question IDs; use the existing quiz selection path only after that list is verified. `App.jsx:buildQueue` currently falls back to the full pool when a focus concept has no matches. This bridge must not silently use that fallback. If no eligible fresh read exists, keep practising and show that a new check is not yet available.
3. **Capture prospective evidence at the actual submission boundary.** Use a new append-only sidecar; do not change the original question's correct answer or overwrite old progress. A normal quiz still gets one existing result row per question. Multi-step plays contribute only their completed combined quiz result to the old score.
4. **Present new evidence beside GS before changing its formula.** For example: “Open-ice support: 3 new reads checked; 2 correct first time; practised again after feedback.” Counts come from eligible events and include unsuccessful checks. Call this application in new situations, not proven on-ice transfer.
5. **Introduce a versioned GS projection after review.** The new projection may use competency-level fresh decisions, changed-cue coverage and later retention. Its calibration, minimum coverage and combination with the existing score require an explicit policy. Run it in a comparison preview first; do not replace existing numbers during this bridge.

The first launch can leave the current session-score formula unchanged: the **new quiz decisions** affect it through the route that already does so. Practice points themselves add no score. This is useful even before a richer aggregate GS is approved. The old competency-report defect should be repaired as a separately tested mapping/version change, with historical before/after visibility rather than a silent recalculation.

## Proposed APIs and evidence shape

These are proposed interfaces, not available runtime exports. Keep scoring functions pure and storage at the caller boundary.

```js
resolveEvidenceBinding({ source, registry });
// => reviewed exact binding, or { eligibility: 'unmapped', reason }

planFreshGameSenseCheck({ playerId, ageBand, conceptId, registry, exposures });
// => { questionIds, bindings, status: 'ready' | 'no-reviewed-fresh-read' }
// No full-bank fallback; no invented variant when the pool is exhausted.

createPracticeEvidence({ attempt, binding, presented, response, result });
// => immutable event, or a specific validation error

appendPracticeEvidence(ledger, event);
// => new ledger; exact duplicate is a no-op, conflicting same ID is rejected

summarizePracticeEvidence({ events, bindings, policy });
// => practice/first-response/changed-cue/retention counts, exclusions,
//    coverage and a versioned projection only when policy enables it
```

Example event shape; every value below is a field requirement, not a fabricated saved result:

```js
{
  version: 'rinkreads-practice-evidence-v1',
  eventId, playerId, attemptId, readId,
  occurredAt, // timestamp of this recorded event, not a guessed past date
  source: {
    surface, sourceId, contentHash, contentVersion,
    answerVersion, reviewId, eligibility
  },
  binding: {
    mappingVersion, ageBand, conceptId, domainId, primaryCompetency,
    evidenceKind, decisionFamilyId, semanticDecisionId, cueSignature
  },
  delivery: {
    mode, format, variantId, seed, inputMethod,
    freezeHash, previousFreezeHash, linkedReadIndex
  },
  exposure: {
    firstSeenAt, priorExposures, priorSubmissions,
    feedbackSeenBeforeResponse, assistanceUsed,
    historyScope: 'recorded-on-this-device' // until a verified sync exists
  },
  response: { value, reason: '' }, // optional text; no omission penalty
  result: {
    status: 'graded' | 'ungraded',
    correct: true | false | null,
    evaluatorVersion, rubricId
  },
  derivedEligibility: {
    freshDecision, changedCue, retention,
    scoreEligible, exclusionReasons
  }
}
```

`derivedEligibility` is recomputed from the trusted binding, actual events and policy on restore; never accept an imported `scoreEligible:true` as authority. `correct` is also recomputed for deterministic reviewed keys/rubrics. Preserve scene/answer evidence in the existing attempt and reference its exact freeze hash; do not duplicate entire scenes into every score event. Store any factual, position and explanation grades separately rather than collapsing them to a single `ok`.

Create an attempt identity before the first response; persist it across reloads and use a unique ID independent of the presentation seed. Each submitted read has one event identity. Record presentation only when the actual rink/question is available. A replay does not create a new attempt. Viewing feedback is exposure even when the child did not submit a correct answer. Observation, placement and final play completion remain distinct events so a partial play cannot silently become a completed assessment.

For a fresh challenge, cross-check exposure across practice, quiz, connected reads and reviewed source variants. Unknown old exposure is `unknown`, not zero. A newly recorded changed-cue question can qualify only under the reviewed semantic-identity policy; shuffled options, team-colour swaps, rotation, altered labels and another format alone do not qualify. No client-only scheme can guarantee a child has never seen a play elsewhere or prevent a cleared browser from losing exposure history; show the actual history scope.

Proposed local key: `rinkreads_practice_evidence_v1:<encodedPlayerId>`. Existing local keys stay byte-for-byte unchanged by migration. The initial ledger is per player and device, explicitly excluding preview/demo identities from account assessment. Cross-device sync needs its own reviewed persistence and RLS change; no current API stores this shape. Do not send children's free text to a new service as part of this bridge.

## Historical migration and scoring safeguards

- Existing quiz history, saved session scores, curriculum/library points, path XP and earned badges remain. Preserve an immutable legacy score view when introducing a new calculation; a new score is labelled with its version and evidence window. Preserving earned rewards does not mean promising that any future assessment score can never decrease.
- Import old practice summaries only as `legacy-practice-summary` references with `firstCorrect` and `mastered`; timestamp, exact response, exposure, content version and approval are unknown. Do not manufacture individual attempts from a 100-point balance. Existing `firstCorrect:false` remains false after a correct retry.
- Old quiz history is one saved result per question per session, not a complete first-response log. In particular `upsertResult` replaces a skipped/wrong placeholder when the child answers later. Do not relabel those rows as pristine first attempts.
- Preserve wrong first responses, withdrawals and uncompleted checks. Do not allow selective import of only successful attempts to make a new accuracy projection. New checkpoints must distinguish an abandoned check from an answered wrong read; the abandonment treatment belongs in the reviewed policy.
- Do not call `handleQuizFinish` once per observation/position/sequence step. It advances session counts, streaks, limits and multiple reward systems. Existing `complete:false` handling must remain.
- A sparse competency is “not enough evidence” in the proposed new view, not zero ability. Minimum sample/coverage rules, retention interval, source difficulty calibration, domain weights and score blending are **not approved or selected by this document**. The projection remains disabled until a versioned policy supplies them.
- Do not award GS for typing a longer explanation, speed on untimed U7/U9 learning tasks, matching the coach's exact pixel, or selecting a statistically common answer. A model's encouragement is not an assessment rubric.

## Concrete acceptance checks before implementation release

1. Load historical quiz, guided, source-library and mixed-SGS fixtures; the bridge changes none of their original saved bytes or existing totals. Deferred TF rewards remain.
2. Wrong → feedback → correct on one question produces one existing 100-point mastery credit, retains the wrong first-response evidence, and creates no fresh-decision credit on retry.
3. Reword, shuffle, recolour, rotate or change answer format for the same semantic decision: still one decision identity. An authored changed defender cue has a distinct reviewed signature and can be reported separately.
4. Duplicate callbacks/reload/tab sync cannot double-credit one event; conflicting IDs fail visibly without replacing the saved record.
5. Draft curriculum/position rubrics, unknown bindings, changed content hashes and local factual SGS grades never enter tactical GS. A missing optional reason never changes a valid result.
6. No score/accuracy leak during Challenge reads 1–2. Renderer unavailable time produces no submission; restoring a paused play does not manufacture a response.
7. Fresh-check selection stays in the chosen age/concept and exact reviewed allowlist, applies current killed-question exclusions and availability limits, and returns a clear empty-pool state instead of another topic.
8. Test every mapped item against its concept, primary competency, source version and actual question behaviour. Include `next` questions that are tactical decisions and must not become leadership solely through format.
9. Keep the old score fixture outputs stable. Show the proposed mapping/projection beside them with its own label and known coverage. No production migration or claim of cross-device sync is part of this proposal.

## Decision for Thomas

Recommended direction: **earned practice points stay; new, reviewed decisions can affect Game Sense; retries demonstrate learning and retain their rewards.** The near-term work is the prospective evidence bridge and a small reviewed fresh-check pool, not a points exchange rate.

Before a new combined GS number goes live, choose which single definition it should represent: latest-session performance, or accumulated evidence across competencies. I recommend the latter for the main long-term GS, with a separately labelled “This session” result. Its weights and minimum evidence rules should be reviewed using real sample histories before replacing either existing calculation.

## Team measurement follow-up

The landing “Team IQ by concept” values are hardcoded sample numbers. The actual team card averages positive player competency percentages over all fetched history; it currently excludes measured zeros from its average while counting missing competency evidence in its below-60% figure. It has no distinct-read minimum, first-attempt weighting or concept-level calculation. These are prerequisites for a trustworthy team projection, not reasons to convert practice points into that formula.

The [detailed coach measurement view](../../one-on-one/team-iq-measurement.md) and its [standalone HTML](../../one-on-one/team-iq-measurement.html) document the exact call paths, a worked fixture evaluated with current functions, and the proposed concept drilldown. Coach ratings remain separate from quiz-derived figures. No team aggregation or threshold was changed.

## Sources and scope of verification

This proposal is based on the current local implementation, not production database inspection or a claim of measured learning efficacy. The 262-question/28-seed inventory was read from files on 2026-09-05; deployed content and historical player records were not queried. No scoring code was changed or feature tests claimed.

- [Current Game Sense utilities](../../../src/utils/gameSense.js), [quiz handlers and score](../../../src/App.jsx), [quiz-result bookkeeping](../../../src/utils/quizResults.js), [session persistence](../../../src/supabase.js), [durable player cache](../../../src/utils/playerCache.js).
- [Guided curriculum scoring](../../../src/one-on-one/curriculumCore.js), [guided flow](../../../src/one-on-one/GuidedCurriculum.jsx), [draft source status](../../../src/one-on-one/curriculum-draft.json), [library scoring](../../../src/one-on-one/lessonCore.js), [library flow](../../../src/one-on-one/PracticeLibrary.jsx), [Skill Path progress](../../../src/path/pathProgress.js).
- [Mixed attempt/archives](../../../src/one-on-one/sgsMixedDraft.js), [factual observation records](../../../src/one-on-one/sgsComprehensionCore.js), [positioning records](../../../src/one-on-one/positioningSequenceCore.js), [draft position rubric](../../../src/one-on-one/curriculumPositionCore.js), [animated telemetry](../../../src/play/telemetry.js).
- [Curriculum ledger](../../../src/data/curriculum-ledger.json), [live-bank composition](../../../src/qbLoader.js), [question variety and twelve-format source matrix](2026-09-05-sgs-question-variety.md), [decision-training design](2026-07-29-decision-training-curriculum-philosophy-design.md), [owner engine decisions](../../factory/SCENARIO-ENGINE-DECISIONS.md), [canonical engine architecture](2026-07-29-scenario-engine-design.md).

The older decision-training document is design history. Its blanket live/timed framing does not override Thomas's current U7 visual discovery, untimed learning, optional reasons or source-bound mixed formats. Its useful distinction here is repeated practice versus a meaningfully changed decision, not a promise of transfer.
