# Question Choice Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Independent reviewer assignments follow the owner's existing coaching-review direction; do not launch an unbounded full-bank agent run. Steps use checkbox syntax for tracking.

**Goal:** Remove answer-position shortcuts and repair weak choices through bounded, source-bound coaching reviews while keeping Thomas's feedback optional.

**Architecture:** Keep immutable authored questions separate from their displayed choice order. Run content repairs through frozen packets, independent review, exact-hash application and regenerated manifests. Extend existing local analytics and administrator tooling rather than introducing a new backend.

**Tech Stack:** React/Vite, JavaScript, Node test runner, JSON receipts, existing local feedback service, Git/Vercel.

**Spec:** `docs/factory/coaching-panel/OPERATING-CHARTER.md`, `docs/factory/coaching-panel/FEEDBACK-WORKFLOW.md`, and owner-approved quality direction recorded in `docs/roadmap/TASKS.md`. Read `CLAUDE.md` and `ROUTING.md` before execution. This plan proposes the display-order implementation below; it does not certify staged question drafts.

## Global constraints

- Work in `C:\Users\mtsli\IceIQ\tmp\packets-production-release`, branch `codex/net-overlap-repairs`; preserve unrelated untracked files and root-checkout work.
- Thomas provides optional observations, not required reviews, replacement wording or batch approvals.
- Preserve scene/coaching distinctions. Agreement with a coaching suggestion is not objective correctness or mastery.
- Supabase, authenticated shared feedback and calibrated placement scoring are outside this plan.
- Do not count shuffled choices as new questions, situations or curriculum coverage.
- Preserve option IDs, source versions, historical snapshots, source receipts and failed-review evidence.
- Use North American youth fundamentals, puck management, time/space and flexible responsibilities. Explicitly state hypothetical changes; never infer motion, gaze, timing or successful passes from a static frame.
- Lexical flags are review candidates, not defects. A legitimate safety instruction can contain “never.”
- No bulk generation. Review at most five scenes per packet. Failed reviewer calibration means advisory output and escalation, not self-certification.

## Baseline and sequence

Production `a075efe` was verified September 6. Audit commit `5f38fad` is local. Frozen inputs: `docs/factory/coaching-panel/choice-quality-2026-09-06/{audit.json,snapshot.json,staged-repairs.json}`.

The inventory covers 200 scenes and 1,600 authored questions: 83 wording candidates and 508 single-choice questions. Correct answers appear first in 357/508 (70.3%). U9 has 64 first, 16 second and zero third-position answers. Five U13 replacements are staged, not applied or independently cleared.

Execution order: Task 1 first; Tasks 2 and 3 implement one display feature; Task 4 runs one complete content batch; Task 5 enables the remaining bounded queue; Task 6 verifies and releases each independently ready increment. No task makes human feedback a prerequisite.

### Task 1: Qualify the five existing repair candidates

**Files:** Read frozen audit folder above, `pilot-2026-09-06/HISTORICAL-CHECKS.md`, `OPERATING-CHARTER.md`; create `choice-quality-review-01/` beneath `docs/factory/coaching-panel/`. Reuse `tools/coaching-panel-review.mjs` and its current return contract.

**Interfaces:** Input is five exact current question identities plus full scenes. Output is a versioned packet containing manifest, blind judgments, keyed review, option-specific reasons, independent final-payload verdicts and adjudication.

- [ ] Check local feedback inbox/dispositions first. Match feedback to its recorded hash; stale comments remain historical.
- [ ] Recalculate all five before hashes against `readBankFiles().bank`. On mismatch, freeze a new packet revision instead of silently updating the old one.
- [ ] Prepare blind questions without answers/explanations/references; retain complete actor/possession setup. Save historical calibration separately from its key.
- [ ] Assign a qualified reviewer the blind task before revealing keyed material. Luna may prepare/check structure; it must not clear hockey judgments after its prior calibration failure. Use a stronger reviewer for substantive judgments and independent final-payload checks.
- [ ] Review every option, actor label and hypothetical. Challenge whether the revisions merely replace one easy verbal cue with another. Check age demand, useful alternatives, duplicated task patterns and whether the image still contributes to the read.
- [ ] Require an independent check of every changed payload, including all plausible alternatives. Store disagreement and amendments rather than overwriting verdicts.
- [ ] Validate completeness using `node tools/coaching-panel-review.mjs <manifest> <lead-review> <second-review>` with actual packet paths. Return `retain`, `repair`, or `hold` per question, with exact hashes and explicit missing evidence.
- [ ] Commit packet evidence. A hold proceeds to an agent-owned investigation queue; it does not become homework for Thomas.

**Acceptance:** Five complete dispositions; each proposed application has exact final-payload review. Structural validation alone cannot clear the batch.

### Task 2: Stable, answer-independent display ordering

**Files:** Create `src/one-on-one/choicePresentation.js` and `choicePresentation.test.mjs`; modify `ExperimentalPractice.jsx` only at option rendering. Add `src/one-on-one/choiceOrderExceptions.json` for explicit hash-bound exclusions discovered during review.

**Interfaces:** `presentChoices(question, {contentHash, seed, preserveOrder})` returns a new option array. `seed` is a persisted browser-local presentation seed, separate from account identity. The helper must never inspect `question.answer`.

```js
// Intended usage; retain q itself for response checking and source identity.
const displayed = presentChoices(q, {contentHash, seed, preserveOrder});
// ResponseControls renders displayed; selected values remain option IDs.
```

- [ ] Write tests first: same identity/seed produces the same order; changing answers does not change order; original data is untouched; IDs appear exactly once; sequence/explain/position types keep their existing behavior.
- [ ] Inspect choice/multi text for order dependencies, including “above,” “both,” referenced letters and deliberate numeric order. Store necessary exceptions keyed by question ID plus hash; changed content cannot inherit a stale exception automatically.
- [ ] Implement a small deterministic seeded Fisher–Yates permutation for eligible choice/multi questions. Use a versioned algorithm string such as `choice-order-v1`. Do not use a random comparator or reroll on render/retry.
- [ ] Reuse the browser seed after reload; handle storage failure with a stable in-memory fallback. Changing camera, board view or answer must not change order.
- [ ] Integrate the helper without altering `q.options`, keyed answers, export catalog or content hashes. Keep selection/checking in `experimentalBankCore.js` unchanged.
- [ ] Test statistical behavior over a fixed, sufficiently large set of deterministic seeds and three-option fixtures. Check for meaningful position skew, not exact thirds in a small sample. Do not claim mathematical balancing of every age cohort from randomization alone.
- [ ] Run `node --test src/one-on-one/choicePresentation.test.mjs src/one-on-one/experimentalBankCore.test.mjs`, then commit.

**Acceptance:** Identical answers receive identical feedback regardless of displayed order; no repeated-answer shortcut is imposed by authored option position. Existing saved responses still resolve by ID.

### Task 3: Capture presented choices for diagnosis

**Files:** Modify `src/one-on-one/experimentalPracticeAnalytics.js`, its existing test file, `ExperimentalPractice.jsx` and `CoachingFeedbackPanel.jsx`/context validator only where current schemas require it.

**Interfaces:** Optional metadata fields `shownOptionIds: string[]` and `choiceOrderVersion: 'choice-order-v1'` on view/check context. Old events without these fields stay valid. No account identifiers, written reflections or additional personal data.

```js
const presentationMeta = {
  shownOptionIds: displayed.map(option => option.id),
  choiceOrderVersion: 'choice-order-v1'
};
```

- [ ] Add tests for serialization/restoration, rejected duplicate/oversized arrays and compatibility with existing events. Validate IDs against the active question at event creation, not just their string shape.
- [ ] Extend normalization explicitly so the existing whitelist does not silently discard the fields. Preserve calibration exclusion and scene-only correctness rules.
- [ ] Attach the actual displayed order to a submitted local feedback context. Reviewers must reconstruct what the learner saw even though authored order is unchanged.
- [ ] Verify exports contain bounded IDs/order version, no text response or personal identifiers. Failed analytics persistence must never stop answering.
- [ ] Run analytics/context tests and the production feedback-boundary check after a build. Commit.

**Acceptance:** A displayed answer can be traced by stable option ID and presentation order without turning coaching agreement into accuracy data.

### Task 4: Apply only independently cleared content repairs

**Files:** Create `tools/apply-choice-quality-repairs.mjs` and its test. Modify only cleared files under `src/one-on-one/experimental-bank/` and `experimental-expansion/`; update relevant `docs/factory/curriculum-bindings/{junior,senior}.json`. Create immutable application receipts under the packet directory.

**Interfaces:** `prepareChoiceRepairs(bankFiles, packet)` returns a validated set of intended file writes and before/after identities; no writes on missing approval evidence, stale hash or invalid payload. A separate apply step consumes that exact prepared set.

```js
// Required preparation invariant, before any mutation:
assert.equal(questionContentHash(currentScene, currentQuestion), edit.beforeHash);
assert.equal(finalReview.contentHash, edit.afterHash);
assert.equal(finalReview.verdict, 'retain'); // validated packet contract
```

- [ ] Add failure tests for one stale edit in a multi-edit batch, missing independent review, duplicate IDs, invalid answers and mismatched base/addition versions. Assert zero writes for failed preparation.
- [ ] Stage all proposed files, validate the composed bank, then write them with a recoverable receipt. Do not claim a multi-file filesystem transaction; record enough state to resume or revert an interrupted write.
- [ ] Bump each affected scenario once per batch; update matching addition `scenarioVersion`. Do not modify unrelated questions or their scenes.
- [ ] Rebuild `tools/build-question-catalog.mjs`, `tools/build-experimental-curriculum-bindings.mjs` and any coverage artifact whose inputs changed. Verify the entire current manifest against composed content.
- [ ] Preserve old reviews as old reviews. Confirm changed content cannot retain a current approval through a stale hash/version.
- [ ] Run bank, repair-application and historical-follow-up tests; derive archive assertions from intended receipts where possible rather than changing counts blindly.
- [ ] Commit the cleared source changes, generated dependencies and application receipt together.

**Acceptance:** Every applied question is attributable to a checked replacement, every current identity matches, and every historical comment remains resolvable. Held questions remain unchanged.

### Task 5: Agent-owned queue for the remaining candidates

**Files:** Extend `tools/build-choice-quality-audit.mjs` via a new report revision; add `tools/choice-quality-dispositions.mjs` and tests; extend `docs/factory/coaching-panel/admin.html` with a local queue link/summary.

**Interfaces:** Append-only dispositions keyed by `{questionId, contentHash}` with status `unreviewed|investigating|retain|repair-staged|applied|hold`, reason and evidence paths. `applied` requires an application receipt and after hash.

- [ ] Prioritize U11–U18 reading/decision tasks, then younger-age ambiguity and remaining wording candidates. Group by at most five complete scenes, not arbitrary detached questions.
- [ ] Add tests rejecting unreceipted `applied`, stale dispositions attached to new content, and illegal status values. A source change creates a new pending identity.
- [ ] Show current source, issue, proposed replacement and agent disposition together. Preserve optional free-text feedback; remove any requirement that Thomas approve every row.
- [ ] Distinguish wording flags, confirmed defects, retained legitimate wording and unresolved cases in totals. Include a small non-flagged sample in each review cycle to test what the lexical detector misses; record the sample-selection rule.
- [ ] After each batch, refresh the audit in a new revision and reconcile original candidates rather than deleting them. Review age/type repetition and curriculum purpose as well as phrases.
- [ ] Repeat Tasks 1 and 4 for each bounded batch. Report progress and specific agent-owned holds; never label the whole bank reviewed because the lexical queue is empty.
- [ ] Commit queue/report changes and evidence for each batch.

**Acceptance:** Feedback and review results become traceable work without owner QA obligations. No scheduled/background process or external model API spending is introduced.

### Task 6: Verify and release ready increments

**Files:** Update `docs/roadmap/TASKS.md`; create a dated release receipt under `docs/factory/coaching-panel/`. Use existing production Git/Vercel flow.

- [ ] Run targeted new tests plus `node --test tools/coaching-*.test.mjs src/one-on-one/experimentalBankCore.test.mjs src/one-on-one/experimentalBankCatalog.test.mjs`.
- [ ] Run `npm run build` and `node tools/check-feedback-release-boundary.mjs`. Existing size warnings are reported, not disguised as test failures or silently waived new regressions.
- [ ] Browser-check an eligible choice, multi-select, preserved-order exception, sequence and older saved answer. Verify order is stable through retry, camera change, refresh and 3D/overhead switch. Check a narrow viewport for clipped choice text.
- [ ] Verify each repaired prompt with its scene, all response branches and relevant hypothetical cues. Compare browser content to the exact application receipt.
- [ ] Commit only owned work, inspect the diff against fresh origin/main and deploy the ready increment under the owner's existing release authorization. Never force-push over concurrent changes.
- [ ] Confirm Vercel success for the exact SHA, refresh the production alias, verify visible changed behavior and confirm local-only endpoints remain unavailable.
- [ ] Record deployment identity, tested limits and rollback target. Rollback uses the last verified deployment; do not erase review or user-feedback history.

**Acceptance:** Ready display changes and cleared content can ship separately. Draft placement scoring and shared admin/Supabase do not become release dependencies.

## Completion and limits

This plan is complete when stable choice presentation is verified, all 83 original candidates have an evidenced disposition, cleared repairs are applied, and live checks match release receipts. Holds may remain only with specific unresolved evidence; they are not described as repaired. Review of 83 candidates does not certify every one of the 1,600 questions, and the inventory is not an empirical measure of learning quality.

Plan self-review: source identity/history is covered in Tasks 1/4/5; hockey and age quality in Tasks 1/5; position bias in Task 2; observation data in Task 3; optional user feedback in Task 5; release verification in Task 6. Supabase, mastery and new curriculum generation are explicitly excluded. No implementation was performed as part of writing this plan.

## Execution progress (September 6)

- Task 1: two reviews completed; root disposition holds all five drafts. Calibration gaps and exact issues preserved. No application clearance.
- Tasks 2/3: implementation and independent code review completed locally; 52 combined tests pass. Single/multi browser stability verified. Remaining release checks listed in CHOICE-ORDER-IMPLEMENTATION.md.
- Task 4: no question applied, since no draft cleared the content gate.
- Task 5: initial exact-hash queue saved (five holds, 78 unreviewed); queue interface and further content batches remain.
- Task 6: build/boundary pass locally; new implementation not deployed. Production remains a075efe.
