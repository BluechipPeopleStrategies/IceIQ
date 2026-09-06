# All-scene audit and curriculum map implementation plan

**Goal:** Audit the current 200 experimental scenes, then map curriculum coverage over the same content snapshot.
**Scope:** Read-only bank audit, repeatable evidence and reviewable findings. No bulk content rewrite or deployment is implied. Preserve packet receipts, unrelated app WIP and deferred Supabase work.

- [x] Snapshot all 200 scenes / 1,600 questions with content hashes. Run identity, rounded-rink, possession, target, label and answer-contract checks; record measurements rather than treating heuristic flags as defects.
- [x] Review each scene and its questions for hockey/wording consistency using economical reviewers; root adjudicates flags and tracks all scene IDs.
- [x] Render each scene through the actual isolated-release application. Capture scene images and record canvas, viewport, label and load failures. Manually inspect all 200 phone contact-sheet images and verify report interactions; distinguish coverage from exhaustive interaction tests.
- [x] Produce a navigable audit report with per-scene evidence, confirmed defects, concerns and limits. Existing clean review labels remain historical evidence, not proof.
- [x] After audit completion, refresh the existing curriculum mapper using the audited snapshot. Add age/type/topic counts, repeated geometries, gaps and clear limits on keyword-based curriculum signals; link the audit findings.
- [x] Verify report completeness, artifact navigation and calculations. Update TASKS and commit only owned artifacts/tools.

**Validation:** 200 unique scene IDs, 1,600 unique question IDs, snapshot-bound findings, complete render manifest or explicit failure rows, no unaccounted records, inventory sums reconcile and no audit flags treated as human coach approval.
