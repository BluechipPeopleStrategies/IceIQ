# RinkReads continuation — September 17, 2026

## Completed this session

Resumed C:/Users/mtsli/IceIQ on qa/2026-09-10-pass, intake commit 78936bc. The branch was 17 commits ahead of local main (dd9607b), with no commits unique to main. Existing untracked browser captures, Blender script and nested worktree were preserved.

Corrected the curriculum report's manual-review counters to count only U11 rows present in the report. A new-question fixture exposed the old behavior: a report containing one new question incorrectly claimed 53 manually verified genuine matches from the historical ledger. It now reports zero manual reviews for that fixture. The real catalog currently has 412 U11 questions, 54 rule/manual-ledger changed-cue matches, and 53 matches from the saved manual ledger. The additional automatic match is draft26-u11-cause-001-q2. These are classification counts, not new coaching approval or exhaustive semantic coverage. Existing manual verdicts remain unchanged.

Replaced the obsolete test assumption that all matches must already be manually reviewed with row-level checks of every saved verdict and separate automatic matches. Registered test:curriculum-matrix in package.json so the normal test sweep includes this suite.

Corrected TASKS.md against current Git/history and the followthrough closure: merge 2918736 already exists; feedback retry fix 63788f6 is present; older-age animated pivot/match-speed content invalidates the prior product-wide absence claim; the historical U11 count was reversed in the roadmap.

## Fresh verification

- All 61 pre-existing test:* commands exited 0; production build exited 0. Practice suite: 649 tests passed. These suites overlap, so their counts are not summed.
- Additional curriculum/feedback run initially failed 1 of 29 tests, revealing the obsolete equality assumption.
- New isolated fixture failed before the counter fix (53 versus expected 0).
- After the correction: 30 focused curriculum/feedback tests passed.
- Newly registered test:curriculum-matrix: 21 passed, zero failures.
- git diff --check passed. Build retains chunk-size/mixed-import warnings.
- No fresh browser inspection, remote-state check, merge, push, deployment or database change. This session changes an offline report, tests and roadmap; it does not change player UI or question payloads.

Raw logs and Qwen request/response files are saved under the active Codex task's work/ directory; verification.json records each command exit code.

## Next bounded teaching batch

Use the already-existing companion scenes draft26-u7-vocab-001, draft26-u7-vocab-002, draft26-u11-cause-001 and draft26-u11-cause-002. Their experimental release is documented in docs/factory/companion-lessons-8/RELEASE.md. Do not confuse that published companion batch with the ten held draft revisions in docs/factory/followthrough-close/draft-adjudication.json.

1. Bind a fresh calibration packet to exact current scene/question identities and renders for those four scenes.
2. Review U7 vocabulary against visible landmarks and U11 changes against the actual stated cue; preserve per-option explanations and ungraded status where evidence is insufficient.
3. Obtain the required qualified/human calibration before mastery admission or bulk family generation. Existing experimental availability is not that approval.

QA publication remains a separate review of the exact branch payload and current remote state. Shared 3D redesign, Hockey Authority qualification, Supabase and auth recovery remain outside this completed batch.

## Delegation receipt

Local model: qwen3.8-huihui:27b, confirmed via localhost:11434/api/tags. First bounded task supplied only roadmap excerpts and a historical followthrough extract (8K context, 900-token output cap); request timed out after 180 seconds with no returned draft. One corrective retry supplied a compact verified-facts brief (2K context, 250-token cap, thinking disabled); completed successfully. Result: work/qwen-retry-result.json. Accepted the recommendation to reconcile stale status; did not act on its automatic local-main merge suggestion. Codex independently checked source files, history and tests and made the narrow correction. No Claude or Codex worker launched. Local savings are unmeasured; no subscription-allowance inference.