# SGS Question Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reproducible actor-tap, multiple-choice and true/false observations to the existing three-read SGS positioning sequence, with Learning and Challenge feedback timing.

**Architecture:** A pure comprehension module derives questions from actual canonical read-entry freezes and records typed responses. An atomic mixed envelope wraps the unchanged positioning draft; the shared scene separates actor-answer selection from movement permissions. The two delivery modes change feedback timing, not the three-read causal sequence or answer truth.

**Tech Stack:** Existing React/Vite, plain JavaScript/JSX, R3F and tactical SVG views, `node:test`, device-local storage. No new dependency or paid API.

**Spec:** [SGS question variety and delivery](../specs/2026-09-05-sgs-question-variety.md).

## Implementation checkpoint — September 5

See the [rink presentation and mixed-read review](../../one-on-one/2026-09-05-rink-presentation-and-mixed-review.md) for the current implementation and actual local verification. Mixed observations, atomic persistence/archives and feedback timing are implemented; 1v1 Learning and phone 3v3 Challenge flows were reviewed. Final whole-suite/build rerun and Shootout artwork verification remain pending at that checkpoint. The task checkboxes below remain a procedure, not a retroactive claim that every listed check ran.

## Global Constraints

- **Owner update, September 5:** positioning explanations are optional. A chosen position can complete a read without text, with no penalty. Preserve omitted versus supplied explanations in saves/exports. Earlier procedure wording about a position-and-reason submission means a position plus any explanation provided; mandatory-reason validation is superseded. Verify all three reads with empty explanations and exact reload.

- This is a separate preview at `?arena=sgs&sgs=mixed#practice-arena`; no live-bank admission.
- Keep the three existing visible continuation reads. Observation prompts are checks within those reads, not extra hockey decisions.
- Learning feedback appears after each position-and-reason submission. Challenge feedback appears only after all three reads are complete.
- Factual correctness is not tactical positioning correctness. No AI judgment, keyword grade, nearest-dot score or physics approval is added.
- True/false responses are booleans. Actor/MC responses use stable IDs, not option indices.
- Direct actor-answer selection must never enable moving an otherwise frozen actor.
- Do not rewrite, migrate or remove original workshop v1 records. New mixed storage uses its own namespace.
- Restore and replay keep the seed, questions, option order, reasons and canonical states stable.
- Follow current repository release instructions: scoped stage/commit, relevant tests and build before push. No broad `git add`.

## File boundaries

| Files | Responsibility |
| --- | --- |
| `src/one-on-one/sgsComprehensionCore.js`, `.test.mjs` | Deterministic factual families, question contracts, answer records, validated restore and feedback policy. |
| `src/one-on-one/sgsMixedDraft.js`, `.test.mjs` | Atomic mixed envelope, seed counter, observation-before-position lifecycle and independent storage keys. |
| `src/one-on-one/ScenarioWorkshop.jsx`, `.css`, `.test.mjs` | Mixed preview mode, actual controls, pause/reveal/continuation UI, persistence and export. Preserve regular positioning and U7 discovery. |
| `src/visuals/ScenarioRinkView.jsx`, `ScenarioRink3D.jsx`; `src/one-on-one/CoachQuestionLab.jsx` | Read-only actor answer hooks in the shared 3D and tactical boards, distinct from editing. |
| `docs/roadmap/TASKS.md`, `docs/one-on-one/verification.md` | Integrator records current scope and actual verification, without inflating draft or approval counts. |

The source/spec writer edits only the two question-variety documents. Runtime, UI, shared-renderer and release owners keep their file boundaries separate while implementation proceeds.

### Task 1: Pure questions and typed factual records

**Interfaces:**

```js
createComprehensionAttempt({ candidateId, seed, mode })
comprehensionReadContext(positioningSession, readIndex)
questionForRead({ attempt, readIndex, state, previousState })
recordComprehensionAnswer(attempt, {
  question, state, previousState, readIndex, response, inputMethod, reason,
})
restoreComprehensionAttempt(raw, { positioningSession })
comprehensionFeedback(attempt, { positioningSession })
```

Commands return new values and throw on invalid input. Restore returns a validated copy or `null`. `seed` is a uint32; `mode` is `learning` or `challenge`. A question exposes ID, format, variant ID, prompt, options, instruction, source references and its exact freeze binding; it exposes no answer key or feedback. Records store the actual response and `rink-tap`, `button` or `keyboard` input method.

- [ ] Add failing tests for reproducibility and variety. Across seeds 0–71, each attempt must use all three formats once; each format must have multiple applicable factual families. Compare repeated generation by deep equality, not merely question count.
- [ ] Add failing typed-response and binding tests. `true`, `false` are valid TF values; `"true"`, `1`, `null`, unknown actor/option IDs, changed prompts and stale freeze bindings are rejected.

```js
const candidateId = 'positioning-3v3-001-v1';
const session = createPositioningSession(candidateId);
const attempt = createComprehensionAttempt({ candidateId, seed: 4, mode: 'learning' });
const context = comprehensionReadContext(session, 0);
const question = questionForRead({ attempt, readIndex: 0, ...context });
assert.equal(question.format, 'tf');
assert.throws(() => recordComprehensionAnswer(attempt, {
  ...context, question, readIndex: 0, response: 'true', inputMethod: 'button',
}), /boolean/i);
assert.equal('expectedResponse' in question || 'feedback' in question, false);
```

- [ ] Run `node --test src/one-on-one/sgsComprehensionCore.test.mjs`; confirm failures describe the missing contracts.
- [ ] Implement the seven source-bound factual families described in the spec. Require previous visited freezes for comparisons; require an actual ownership change for “received”; never invent a receiver during flight. Shuffle option order deterministically while preserving IDs.
- [ ] Add Learning and Challenge reveal tests around actual `positioningSession.answers.length` and final phase. Before position submission, Learning returns no result for that read; before complete, Challenge returns no results.
- [ ] Re-run the core tests, then `node --test src/one-on-one/positioningSequenceCore.test.mjs`. Inspect failures without changing canonical positioning behavior to accommodate the observation generator.

### Task 2: Atomic mixed drafts and isolated persistence

**Interfaces:**

```js
createMixedDraft({ candidateId, seed, mode })
restoreMixedDraft(raw, candidateId)
mixedStorageKey(playerId, candidateId)
mixedSeedKey(playerId)
nextMixedSeed(storedCounter, minimumPreviousSeed)
recordMixedObservation(draft, { response, inputMethod, reason })
moveMixedPlayer(draft, point)
submitMixedPosition(draft)
```

The mixed contract is `{version:'rinkreads-sgs-mixed-v1', positioning, comprehension}`. `positioning` is the unchanged `{version,session,reason,paused}` workshop draft. The new namespace is `rinkreads_sgs_mixed_v1:<encoded-player>:<candidate>`; a separate per-player counter supplies new attempt seeds. This is a second independent workshop contract, not a migration of the first contract's records.

- [ ] Add failing tests for exact atomic restore, cross-candidate rejection, extra fields, copied records from another seed, skipped observations, changed answer payloads and invalid inner drafts.
- [ ] Add the observation-before-placement regression test:

```js
const candidateId = 'positioning-1v1-009-v1';
const draft = createMixedDraft({ candidateId, seed: 0, mode: 'learning' });
assert.throws(() => moveMixedPlayer(draft, { x: 27, y: -6 }), /observation/i);
const context = comprehensionReadContext(draft.positioning.session, 0);
const question = questionForRead({ attempt: draft.comprehension, readIndex: 0, ...context });
const observed = recordMixedObservation(draft, {
  response: question.options[0].id, inputMethod: 'button',
});
assert.deepEqual(observed.positioning, draft.positioning);
assert.equal(observed.comprehension.records.length, 1);
```

- [ ] Run `node --test src/one-on-one/sgsMixedDraft.test.mjs`; verify the missing lifecycle boundary fails.
- [ ] Implement the wrapper through the existing pure positioning commands. Record the observation first; keep its entry freeze fixed during the subsequent move. Require a valid observation for the current read before accepting position submission.
- [ ] Test a completed three-read attempt, partial observation, chosen point before submission, paused playback, exact reason restoration, malformed counters and uint32 exhaustion. Counters must not silently wrap and reuse an attempt identity.
- [ ] Run both new core suites. Verify the regular workshop storage key and v1 restore code have no migration or deletion path introduced.

### Task 3: Read-only actor answers in 3D and tactical views

**Interfaces:** Extend the shared scene with `selectableIds` and `onActorAnswer(actorId)`. Retain `editableIds`/`onMove` for independent movement permissions. The actor-answer callback records a choice only.

- [ ] Add a regression test where the carrier is selectable for observation but is absent from `editableIds`; activating the carrier calls the answer handler once and never the movement handler.
- [ ] Add a test for an unknown answer actor and for answer input disabled during camera adjustment or playback. No silent MC replacement keeps a “tap” instruction.
- [ ] Implement accessible actor answer targets in both views. Reuse stable actor IDs, visible selection and touch-safe completion; do not answer on a scroll, canceled gesture or duplicate synthesized click.
- [ ] Check mouse, touch and keyboard in the actual scene. Rotate the camera, then select the same actor; confirm identical IDs and unchanged coordinates. Trigger the existing graphics fallback and finish the same question on the tactical view.
- [ ] Run the relevant shared-visual and workshop suites. Use actual pointer/keyboard browser checks for behavior that a source assertion cannot establish.

### Task 4: Mixed delivery and per-read feedback

**Files:** `ScenarioWorkshop.jsx`, `.css`, `.test.mjs`, consuming Tasks 1–3. The existing v1 `PositioningLesson` and discovery mode remain independent.

- [ ] Add a mixed-mode entry and Learning/Challenge choice. Initialize or restore one mixed envelope for the current player/candidate. A new attempt advances the seed; reloading or switching camera does not.
- [ ] Render the public question only. Actor-tap uses `onActorAnswer`; MC uses stable option IDs; true/false sends each option's boolean `value`. A neutral selection acknowledgement appears without a hidden answer key in rendered copy, colour, labels or accessibility text.
- [ ] After observation, expose existing isolated positioning controls and reason input. Preserve rejected illustration attempts and explain the real guard; do not call an impossible continuation tactically wrong.
- [ ] After position submission in Learning, pause and display factual feedback plus the learner's saved decision/reason. Provide explicit **Watch next part** before continuation. At read three, present the complete review.
- [ ] In Challenge, run the same continuations while withholding factual correctness/explanations until the third positioning read completes. The final review contains all three observation records and positioning reasons with separate labels.
- [ ] Add UI tests for the feedback boundary and persisted mode. Test rendering a TF false value without converting it to an option ID or treating it as missing.
- [ ] Persist/export the entire mixed envelope atomically. On restore, reopen an unfinished animation paused. Keep the normal positioning v1 key byte-for-byte unchanged in an integration fixture.

### Task 5: Verify the learner flow and record honest scope

- [ ] Run `node --test src/one-on-one/sgsComprehensionCore.test.mjs src/one-on-one/sgsMixedDraft.test.mjs src/one-on-one/ScenarioWorkshop.test.mjs` and inspect each result.
- [ ] Run `npm run test:practice` and `npm run build`. Record real pass counts and any material warning; do not infer production readiness from an unexecuted command.
- [ ] In a QA player namespace, complete Learning and Challenge on a 390 px phone viewport and desktop. Cover all three response formats, one false claim, both early and final feedback boundaries, pause/reload, new-attempt variation and JSON export.
- [ ] Check 1v1 and 3v3 causal continuity and a dense 5v5 observation. In 3v3, receiver questions appear only after the actual pass arrives. Compare visible puck/player identities against the prompt and stored record.
- [ ] Verify canonical v1 data and unrelated user records remain unchanged; check horizontal overflow, keyboard focus, scroll cancellation and the fallback actor-answer path.
- [ ] Record results and unresolved limitations in the verification document and canonical roadmap. Keep the other nine matrix rows marked as existing elsewhere or planned for SGS; do not describe them as implemented by this slice.
- [ ] Stage only the reviewed implementation, tests and documentation paths. Commit with the required Codex co-author trailer; push only after relevant tests and build pass. Verify the deployed mixed preview and matching current artifacts before describing it as live.

## Completion boundary

This plan is complete when the three new factual formats operate with varied, reproducible questions and both delivery modes inside the existing three-read preview. Completion does not mean twelve SGS formats, automatic tactical grading, validated skating physics, new age-band rollout or curriculum admission. The twelve-format matrix remains the source-backed expansion map.
