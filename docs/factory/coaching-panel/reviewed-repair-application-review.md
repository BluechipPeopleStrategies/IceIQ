# Reviewed question repair application review

Scope: read-only review of `tools/apply-reviewed-question-repairs.mjs` and `tools/reviewed-question-repairs.mjs` in the production-release worktree. No repair packet was applied.

## Findings

### Medium — source ownership is inferred from IDs, not guarded explicitly

`apply-reviewed-question-repairs.mjs` walks every original, expansion, and additions file and mutates any row whose scenario ID appears in `pack.changes`. The later `composeExperimentalBank(...) === next` assertion checks the aggregate result, but it does not assert that each changed scenario/question came from its intended source file or that the scenario ID occurs exactly once across source pools. A duplicate or stale copy could therefore be rewritten in more than one source file before composition fails, or be accepted if the duplicate produces the same composed payload.

Add an explicit preflight owner inventory keyed by scenario/question ID, require exactly one owner for every changed item, and write only that owner file. Assert the same inventory immediately before writing.

### Medium — the independent and root approvals are role-only, not reviewer-distinct

`prepareReviewedRepairs` accepts any adjudication with `role === 'independent'` and any with `role === 'root'`, and rejects non-`approve` rows, but it does not require distinct reviewer identity, adjudication IDs, or an immutable review receipt hash. A single actor could satisfy both role checks by supplying two rows.

Require stable reviewer IDs and distinct IDs across the two approvals, and bind the approvals to the packet/change hash before allowing `--apply`.

### Low — receipt failure can leave an exclusive receipt behind after rollback

The apply path writes all source files, reads the composed bank back, then creates `application-receipt.json` with `wx`. If receipt creation partially creates a file and then throws, the catch restores source files but does not remove the receipt. The next run then fails the initial `existsSync(receiptPath)` guard even though the source write was rolled back.

On failure, remove the receipt if this invocation created it, or write the receipt to a temporary path and rename it into place only after all checks pass.

## Checks performed

- Default mode is dry-run; `--apply` is required for writes.
- Current scenario version, before payload, before hash, after hash, question ID/type, resulting bank validity, and composed-bank equality are guarded.
- Existing receipt presence blocks reapplication.
- Best-effort source restoration is present, but is not a crash-safe transaction.

## Recheck after patch

The three findings above are resolved in the current files:

- The application path now inventories each changed question's unique source owner, asserts the scenario/question relationship, requires exactly one owner for every repair, and validates composed output before writes.
- Pure preparation now requires non-empty `reviewerId` values for both approvals and rejects identical independent/root identities.
- Receipt creation uses an exclusive file descriptor and tracks whether this invocation created the receipt; rollback removes only that receipt when creation or close fails.

`node --test tools/reviewed-question-repairs.test.mjs` passes all 3 tests. Reviewer IDs are input assertions, not authentication: this workflow verifies that two distinct identity strings are present, not that those strings identify real people or independent processes.
