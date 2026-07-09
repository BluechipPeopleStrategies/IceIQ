# RinkReads — Task List

**Last updated:** 2026-07-09 (later) · Gym Phase 1 built + verified; owner gate + push decision queued as tasks; gym Phase 2/3 sequenced explicitly.

**Scope:** RinkReads **app build + content factory**. Launch/distribution (sending the beta, marketing) and the separate BlueChip business are **out of scope** — parked at the bottom. Priority = position in this list. A new idea that isn't here goes to the **Parking Lot** first, then gets promoted on purpose — that's the scope-creep guard.

**Branch:** `feature/shareable-beta`

---

## 🔵 NOW — active front (max 3)

- **Manual playtest gate — question kinds, cycle 1.** 10-min checklist at `docs/manual-playtest/question-kinds-cycle1.md`. Play the 3 proof plays at U11/U13 + regression spot-checks, and make the two embedded design calls (predict-next red-flash: keep or neutralize; verdict: hard cut vs judge-feedback beat). One clean pass unlocks the factory for predict-next + verdict. *Unblocks NEXT #2.* Requires `#playtest` locally (`VITE_ENABLE_DEV_BYPASS=1` in `.env.local`, already set on this machine).
- **Cognitive Gym Phase 1 — owner gate (build is DONE).** All 9 plan tasks built, tested (test:gym-phase1 9/9, test:gym-progress 7/7, test:gym green, prod build green) and committed on `feature/shareable-beta` 2026-07-09. Remaining, Thomas, ~10 min: play one session of each of the 11 drills at a U11 profile and check (a) rep sounds + level-up jingle + session fanfare fire, (b) untouched drills start at level 6, not 1, (c) no negative points anywhere (Shoot or Hold errors read 0), (d) miss feedback reads in feet not px (Eyes Up, Snapshot), (e) the 🔇 mute chip silences everything and survives reload. Then decide whether to push the branch (nothing is pushed). Spec: `docs/proposals/2026-07-09-cognitive-gym-overhaul-design.md` · Plan: `docs/superpowers/plans/2026-07-09-cognitive-gym-phase1-fix-and-juice.md`.

## 🟢 NEXT — sequenced, in order

1. **Wire animated plays into the player-facing app.** New kinds are invisible until something consumes `playsForAge()`. Smallest honest version: a "Read the Play" tile for U11/U13 (skill-path node or Challenges hub entry) serving the animated catalog by profile age band. Small spec → plan → build. *Do before mass-producing content so real kids see the kinds early.* Size: small.
2. **Bulk batch 002 through the kind-aware factory.** `npm run report:next-variants` recommends a kind per family (verdict is the gap in 5 families). Standard 3-play batch via `check:bulk` + batch-plan template, aimed at the thinnest families (gap_control 1/4, backcheck_recovery 2/4, forecheck_pressure 2/4). First batch exercising the new kinds. *Blocked-by: NOW playtest gate (opens predict-next + verdict).* Size: days.
3. **Spot-mistake playtest #2 → open its factory gate.** Second clean playtest of spot-mistake (One Defensible Mistake Rule needs two). Then all five kinds are bulk-eligible. *Blocked-by: NEXT #2 (batch 002).* Size: 10 min + build.
4. **Cycle 2 — Daily Faceoff (arcade shell v1).** First game mode: 5 curated reads/day per band, calendar streak, earned "Backup Goalie" streak protection (never purchasable; "paused" not "lost"), milestone celebrations at 3/7/14/30. Session wrapper over the existing catalog, no new rink primitives. Spec → plan → build. *Owns the calendar streak — gym Phase 2 waits on this so the streak has ONE owner.* Size: weeks.
5. **Parent/coach weekly progress card v1.** Days played, accuracy by concept/family, streak state, printable milestone badges. Telemetry is already kind-aware, so the data exists — this is rendering + delivery. Ships alongside/right after Daily Faceoff so the streak has an adult witness. Size: days.
6. **Cognitive Gym Phase 2 — Today's Practice + Rink Rating.** One-button daily workout (3 auto-picked drills: weakest domain, strongest, rotating third; ~5–8 min; hard stop with rest framing), Rink Rating headline score over 6 hockey-named domains with a Rink Map radar, Rookie Combine placement flow, 6 starter drills + 5 earned unlocks, staircase tuned to ~85% success. *Blocked-by: NEXT #4 (Daily Faceoff owns the calendar streak; Today's Practice credits it, never a second streak).* Spec: Phase 2 section of `docs/proposals/2026-07-09-cognitive-gym-overhaul-design.md`; plan written when its turn comes. Size: weeks.

## ⚪ LATER — in scope, not yet sequenced

- **Multi-step Phase 2: gauntlet generation** — teach the gauntlet visual creator to GENERATE multi-step plays, decision-richness gate per step. Own spec/plan. (from backlog)
- **Rework single-option seeds (triage theme 1)** — decision-richness gate flags 7 seeds as one-option with concrete rework ideas: `gvis_u11_reading-the-play_b633`, `u13_nz_regroup_hinge_v1`, `u13_gap_pivot_match_mc_v1`, `u13_gap_stepup_mc_v1`, `u13_dz_breakout_rim_v1`, `u11_dz_breakout_center_support_v1`, `u13_gap_pinch_forecheck_mc_v1`.
- **Goalie-reading concept (triage theme 4)** — new ledger concept/node + goalie-state representation (set vs moving), then scenarios. Natural multi-step use case.
- **U7 time-and-space support content** — `u7_time_space_open_ice_mc_v1` to teach where to go to support (time + space). U7 stays generic-players (settled).
- **step_index telemetry persistence** — `MultiStepPlayer` emits `stepIndex` but persisting needs a Supabase migration (add `step_index` column, default 0). Emitted but ignored downstream until then.
- **Sign-in flash bug** — auth-gate render race; UI briefly bounces to login before recognizing the session. Cosmetic, deferred 2026-06-12. Memory: `project-rinkreads-signin-flash`. Fix = loading state until session resolves.
- **Fast-follows from final review** — `resolveKind` null-for-watch-nodes, justify-copy lint, judge-why copy surfacing.
- **On-deck game modes** — Rush Hour (time attack, needs the gentle timer), young-age DRAG mini-games (Cover the Pass, Set the Forecheck), mascot pass (the sound pass shipped with gym Phase 1).
- **Cognitive Gym Phase 3 — age-banded identity layer.** U7–U11 "Practice Rink" (near-zero text, ghost-hand demos, no fail states, sticker collectibles, station path) + U13+ "The Combine" (athlete dashboard: trends, personal bests, Backup Goalie streak repair) + hockey-native stimulus swaps (Shoot or Hold light → net-opens vs ref's-arm-up; Two Things shapes → coach's bench signals; Baylor's Pick ⚽🐰🐻 → pucks/jerseys). Rides with the parent/coach card (NEXT #5) and the mascot pass. Spec: Phase 3 section of `docs/proposals/2026-07-09-cognitive-gym-overhaul-design.md`.
- **Verify multi-step-scenarios branch state** — old `feat/board-mc-questions` work (multi-step engine Phase 1) was built + awaiting play-test sign-off as of 2026-06-12; confirm whether it merged or was superseded by `feature/shareable-beta` before acting on it.

## 🅿️ PARKING LOT — out of current scope (captured, not sequenced)

- **Send the beta link to real users** — LAUNCH/distribution. Smoke pass is done + auth confirmed working; this is a timing/channel judgment call, not a build task. Out per current scope.
- **Marketing / distribution of RinkReads** generally — out per current scope.
- *(New ideas land here first, then get promoted into NEXT/LATER on purpose.)*

## Changelog

- **2026-07-09 (later)** — Gym Phase 1 built, tested, committed (8 gym commits); NOW entry converted to the owner's 10-min gate + push decision. Gym Phase 2 added as NEXT #6 (blocked by Daily Faceoff, one streak owner); gym Phase 3 spelled out in LATER; sound pass marked shipped.
- **2026-07-09** — Created. Folded `2026-07-09-next-7.md` + `docs/BACKLOG.md` into one living doc; archived the dated next-7, session-handoff, and backlog to `docs/roadmap/archive/`. Beta-send moved to Parking Lot (launch, out of scope). Playtest gate + Gym Phase 1 set as NOW.
