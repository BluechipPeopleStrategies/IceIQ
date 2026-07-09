# RinkReads backlog

Open work parked for later (captured 2026-06-12). Ordered roughly by readiness.
All current work is on branch `feat/board-mc-questions` (not yet merged).

## 1. Finish the multi-step-scenarios branch
- **Status:** built + committed; awaiting a final play-test sign-off, then a branch-wrap decision (merge / PR).
- Multi-step engine (Phase 1) is done: `src/scenario/multiStep.js`, `MultiStepPlayer.jsx`, `steps[]` validation in `schema.js` + `lintScenario`, proof seed `src/scenario/seeds/u13_oz_entry_trailer_v2.json`.
- Review surfaces extended: KEEP/REVISE/RETIRE + comment on the `#q=<id>` preview; `#triage` deck + `reviewCore` (`hasBoard`/`boardHash`) + `ReviewBoard` now handle `steps[]`.
- Spec: `docs/superpowers/specs/2026-06-12-multistep-scenarios-design.md` · Plan: `docs/superpowers/plans/2026-06-12-multistep-scenarios.md`.
- **Next:** Thomas plays through `#q=u13_oz_entry_trailer_v2` and the `#triage` deck; then wrap the branch.

## 2. Multi-step Phase 2: gauntlet generation
- Teach the gauntlet visual creator to GENERATE multi-step plays, with the decision-richness gate applied per step. Its own spec/plan.
- Deferred deliberately so Phase 1 stayed focused. See the spec's "Out of scope" + "Phase 2" notes.

## 3. step_index telemetry persistence
- `MultiStepPlayer` already emits `stepIndex` in its `onAnswer` payload, but persisting it needs a Supabase migration to add a `step_index` column (default 0) to the per-answer record. Until then the field is emitted but ignored downstream.

## 4. Goalie-reading concept (theme 4 from triage)
- No curriculum concept exists for reading the goalie (shoot vs pass on every touch). Thomas asked for it in triage (`u13_oddman_pass`, `u13_oz_backdoor_scan`).
- Needs: a new ledger concept/node + a way to represent goalie state (set vs moving), then scenarios. A natural multi-step use case ("goalie set -> pass to move them; goalie bit -> shoot"). Design not started.

## 5. Rework the single-option seeds (theme 1 from triage)
- The decision-richness gate (now calibrated to Thomas's standard via `tools/gauntlet/decision-calibration.json`) flags these as one-option and returns concrete rework ideas. Rework them, likely as multi-step plays or with genuinely tempting distractors.
- Seeds: `gvis_u11_reading-the-play_b633`, `u13_nz_regroup_hinge_v1`, `u13_gap_pivot_match_mc_v1`, `u13_gap_stepup_mc_v1`, `u13_dz_breakout_rim_v1`, `u11_dz_breakout_center_support_v1`, `u13_gap_pinch_forecheck_mc_v1`.

## 6. U7 time-and-space support content
- `u7_time_space_open_ice_mc_v1`: Thomas wants it to teach principles about where to go to support (time and space). Note: U7 stays generic-players (no position labels) by decision; that part is settled.

## Already tracked elsewhere
- **Sign-in flash bug** (auth-gate render race; fix = show a loading state until the session resolves). Captured in memory `project-rinkreads-signin-flash`. Not blocking.
- **Coach audit** of the post-wipe seeds: report at `docs/factory/coach-runs/audit-2026-06-12.md`; the coordinate/optical + answer-mismatch fixes from Thomas's triage are committed.
