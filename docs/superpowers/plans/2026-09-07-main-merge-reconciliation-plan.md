# `main` merge reconciliation — scope and plan

**Status:** scoped, not started. Written 2026-09-07 after Hockey Authority's one-on-one
tactics review surfaced an in-progress, unresolved `git merge` on `main` that predates
and is unrelated to that review's actual scope.

## What's actually on disk right now

- Local `main` (HEAD `d85b02c`, "Capture remaining active workspace changes") and
  `origin/main` (`cd200c6`, "Publish eight companion lessons in experimental practice")
  diverged from a common ancestor `f1f4306` ("fix(content): integrate independently
  reviewed Claude calibration") by **94 commits combined** — 48 local-only, 46
  origin-only.
- Something (not a person, not either of the two agents that just ran — this predates
  both) already attempted `git merge origin/main` into local `main` and left it
  half-done: `.git/MERGE_HEAD` is present, **34 files carry unresolved `UU` conflict
  markers**, and `npm run test:practice` currently fails outright on literal
  `<<<<<<< HEAD` syntax errors.
- **Nothing is at risk of being lost.** Every commit on both sides is a real, addressable
  commit (`d85b02c` and `cd200c6`), so this is fully recoverable at any point — worst
  case, `git merge --abort` returns to a clean `d85b02c` with zero data loss. Tag both
  tips before starting work anyway, as a zero-cost rollback point:
  `git tag pre-reconcile-local-main d85b02c && git tag pre-reconcile-origin-main cd200c6`.

## Likely root cause (worth understanding, not worth fixing today)

Local `main`'s unique commits read like the `claude/ten-hour-followthrough` and
five-hour visual-review assignments' packet-adjudication work landed directly on `main`
locally without ever being pushed — `docs/roadmap/TASKS.md`'s own (conflicted) content
says that followthrough was "Not pushed to `main` — isolated branch/worktree only,
awaiting Codex/Thomas review," yet local `main`'s history contains exactly that
work's commit pattern (`fix: adjudicate packet N...`). Meanwhile `origin/main` received
a **different** independent repair pass on the same packets (`fix: release
independently repaired packet N...`) from elsewhere. Two branches did the same
packet-review job over the same window and never synced. Worth a process fix later
(should packet-adjudication assignments push as they go?) — out of scope for this plan.

## The 34 conflicted files, by what they actually need

**Tier 1 — pure regeneration, no manual merge (4 files).** Confirmed by reading the
generators: `tools/build-question-catalog.mjs` writes `catalog.json`, `catalog.csv`,
and `current-content-manifest.json`; `tools/build-curriculum-coverage.mjs` writes
`coverage.json`. Both read the source bank files via `tools/experimental-bank-files.mjs`.
Once Tier 2 and Tier 3 below are resolved, take either side as a throwaway placeholder
for these four, delete/regenerate via `node tools/build-question-catalog.mjs` and the
coverage builder, and commit the real output. Do not hand-merge these diffs — a
3000-line JSON diff merge is pure noise next to just regenerating it correctly.
Verify `catalog.html` and `curriculum-map/index.html` (1-2 line diffs each) are also
generated wrappers before treating them the same way.

**Tier 2 — generator logic, real code (1 file).** `tools/build-curriculum-coverage.mjs`
itself has a genuine logic diff (5 lines local vs. 32 lines origin) — origin changed the
generator's behavior, not just its output. This needs an actual code read/merge before
Tier 1 can regenerate correctly.

**Tier 3 — content banks needing real hockey-content adjudication (10 files).**
`src/one-on-one/experimental-bank/{u9,u11,u13,u15,u18}.json` and
`src/one-on-one/experimental-expansion/{u9,u11,u13,u15,u18}-{additions,scenarios}.json`.
Both sides independently re-ran packet adjudication over the same packet numbers
(07 through 40) and got different results — this is the real work, and it's a content
question, not a git-mechanics one. Approach: diff each packet's local vs. origin final
answer/text/rationale; where they agree, trivial; where they disagree, that's a genuine
hockey-content question and needs the same evidence-backed treatment Hockey Authority
already gave the U15/defender/MC content in
`docs/hockey-authority/one-on-one-tactics-review-2026-09-07.md` — likely another
Hockey Authority pass scoped specifically to "local vs. origin disagreements," not a
full re-review, plus Thomas's call on any that come back as a genuine judgment split.

**Tier 4 — hand-written source/UI files (7 files), resolve file-by-file on who did
more/newer work, verified the way I already worked through `GuidedCurriculum.jsx`:**
- `src/one-on-one/GuidedCurriculum.jsx` — **take local.** Local rebuilt the whole lesson
  flow (3D motion, the U15 position-answer mode) and already includes an equivalent
  fix to what origin patched (both independently demote this content from
  "mastered/points" to "historical/explored, no mastery" language). Origin's 5-line
  patch is a surgical fix to the *old* flow that local already replaced.
- `src/one-on-one/ExperimentalPractice.jsx` — **opposite of the above:** origin made
  the larger change here (48 insertions vs. local's 2). Take origin as the base, then
  confirm local's 2-line change isn't something origin's version dropped before
  discarding it.
- `src/one-on-one/PracticeHub.jsx`, `PracticeLibrary.jsx` — comparable-sized changes on
  both sides (13 vs. 12, 47 vs. 29 lines) — these need an actual 3-way read, not a
  pick-a-side guess; likely genuinely additive changes from each side that both need to
  survive.
- `src/one-on-one/Skater.jsx` — local *removed* 105 lines, origin only touched 9. Find
  out why local deleted so much before assuming it's safe to keep local's version —
  could be a legitimate simplification or could be losing something origin still needs.
- `src/one-on-one/experimentalPracticeAnalytics.js`, `tools/coaching-followup-history.test.mjs`
  — small, additive-looking diffs on both sides; likely a straightforward manual merge.

**Tier 5 — append-only docs/logs (4 files), resolve as a union, not a pick.**
`docs/factory/research/question-review/packets-37-40-review.md`,
`docs/one-on-one/2026-09-06-packets-35-36-production.md`,
`docs/factory/research/question-review/followup/review.html`, and
`docs/roadmap/TASKS.md` — these are narrative status logs where both sides added
different entries for the same date range. Keep both sides' entries in chronological
order rather than discarding either. `TASKS.md` specifically needs its "Last updated"
section rewritten as one coherent reconciled status (it currently has two competing
narratives fighting inside conflict markers), and once resolved, add a new NOW-tier
line item recording this reconciliation project itself with a link to this file.

## Recommended sequencing

1. Tag both tips (see above) — done before anything else, zero cost.
2. Tier 5 (docs/logs) — cheap, no judgment risk, makes the rest of the merge legible.
3. Tier 4 (hand-written code) — file-by-file, as scoped above.
4. Tier 3 (content banks) — the real work; likely its own Hockey Authority pass plus
   Thomas's call on genuine disagreements. Size this generously; it's the bulk of the
   actual judgment in this whole project.
5. Tier 2 (coverage generator logic) — needed before Tier 1 can run correctly.
6. Tier 1 (regenerate catalogs/coverage/manifest) — mechanical, once 2 and 3 are settled.
7. Full verification: `npm run test:practice`, `npm run doctor`, and whatever else
   `package.json` runs for this area; confirm zero conflict markers remain
   (`git diff --check`) and the build succeeds before completing the merge commit.
8. Complete the merge commit on local `main`. **Do not push to `origin/main`** without
   Thomas's explicit review first, regardless of how clean it looks locally — this
   reconciles two independent efforts touching real content, and a push is exactly the
   kind of action the standing git rules gate on a human look first.
9. Re-run the one-on-one coach MVP review
   (`docs/one-on-one-mvp-review-2026-09-07.md`) against the reconciled files — file
   contents will have changed from what that review actually tested.
10. Re-verify the two hockey-content defects Hockey Authority already found
    (`docs/hockey-authority/one-on-one-tactics-review-2026-09-07.md`) survived or were
    fixed by the reconciliation, since they live inside Tier 3 files.

## Sizing

Tiers 1, 2, and 5 are mechanical — hours, not days. Tier 4 is a careful afternoon.
**Tier 3 is the real cost** — ten files' worth of independently re-adjudicated hockey
content, packet by packet, is comparable in scope to the five/ten-hour followthrough
assignments already run on this repo. Scope it as its own multi-hour assignment, not a
quick pass alongside other work.
