# Task A output moved

`assignment.json` step 4 says outputs go in `output/ten-hour-followthrough/` at the worktree
root (this directory). The orchestrating session's actual instructions for Task A, however,
named the nested path `docs/factory/claude-ten-hour-project/output/ten-hour-followthrough/`
explicitly. That path also matches where the rest of the ten-hour project's input package
(`prior-return/`, `prior-packets/`, `PRIOR-EVIDENCE-INVENTORY.json`, `START-HERE.md`,
`assignment.json`) was copied into this worktree, so Task A's deliverables were written there
instead, to keep inputs and outputs together:

- `docs/factory/claude-ten-hour-project/output/ten-hour-followthrough/intake-verification.json`
- `docs/factory/claude-ten-hour-project/output/ten-hour-followthrough/TASK-A-SUMMARY.md`
- `docs/factory/claude-ten-hour-project/output/ten-hour-followthrough/verify-intake.mjs` (the
  verification script that generated intake-verification.json; reruns cleanly with `node
  verify-intake.mjs` from that directory)

This directory (`output/ten-hour-followthrough/` at the worktree root) is left empty except for
this note so a future session checking either location finds a pointer instead of nothing. If a
later task (B-F) uses this root-level directory per assignment.json's own convention, that is
independent of Task A and does not need to move.
