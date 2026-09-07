# Task A summary: verify the previous return

`intake-verification.json` in this folder holds the full detail. This is the short version.

## Counts

240 individual claims were checked across the 60 questions (4 claim types each: identity,
scenario-version-and-payload-hash, screenshot-metadata, review-verdict-consistency):

- **Verified: 180** (identity, hash, and verdict-consistency claims — all 60 x 3 types).
- **Partial: 60** (screenshot-evidence claims, all 60 — see below; capped at partial by design).
- **Contradicted: 0.**
- **Unavailable: 0.**

At the file level, all 66 `included:true` entries in `PRIOR-EVIDENCE-INVENTORY.json` reproduced
their claimed byte size and sha256 exactly, and all 123 `included:false` entries (122 screenshot
PNGs + one helper script, `verify-hashes.mjs`) are confirmed absent-as-expected, not missing.

## Biggest concrete issue found

No hash, ID, or file-integrity contradiction anywhere in the 60 questions or the evidence
inventory. The one real, verifiable finding is a **naming-convention drift** inside packet
visual-01 only: the first question reviewed (`exp26-u9-003-q3`) used bare screenshot filenames
and got an extra third screenshot, the next four questions in that packet used a
`visual-01_`-prefixed filename, and every later packet (visual-02 through visual-11) settled on
an abbreviated `vNN_` prefix. These files still resolve and their hashes still agree between
`review.json` and the inventory — cosmetic, not a data-integrity defect, but worth flagging
rather than normalizing away. See `duplicateScreenshotDetection.namingConventionObservation`.

Also preserved as fact per the assignment: both the lead and second reviewer missed 4 of 8
historical calibration cases each, and 3 of those 4 misses overlap between them
(`exp26-u11-011-q8`, `exp26-u11-012-q5`, `exp26-u11-016-q1`) — the two passes share blind spots
rather than independently corroborating each other, and the second reviewer explicitly disclosed
no browser access, so the hash-verification claims for visual-01 ultimately rest on the lead
reviewer's unavailable `verify-hashes.mjs` script alone until this task's independent recompute.

## Explicitly not done

- **No screenshot was visually inspected.** All 122 PNGs are absent from this worktree, the
  reference worktree, and the local copy under `docs/factory/claude-ten-hour-project/` — only
  their filenames and declared hashes exist anywhere accessible to this task. The "24 images
  across 12 pairs" inspection requirement is out of scope here and is listed as a follow-up.
- **No hockey-correctness judgment.** All verdict/blindMatchesKey/highRisk fields were only
  checked for internal consistency across files, never re-graded for accuracy.
- **No geometry recomputation**, including finite-segment-vs-infinite-line distance questions.
- **No reviewer qualification is claimed or restored.** Both reviewers remain documented as
  NOT QUALIFIED.

Full path: [`intake-verification.json`](./intake-verification.json)
