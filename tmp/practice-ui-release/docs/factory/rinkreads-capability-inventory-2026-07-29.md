# RinkReads Capability Inventory — What Actually Exists

**Purpose:** ground truth for the scenario-engine ambition, so design work builds on
what is real, not what is planned. Read-only inventory, no code changed. Every count
below was measured by importing the actual modules/data, not estimated.

**Companion documents (already exist, read these too):**
`docs/factory/SCENARIO-ENGINE-DECISIONS.md` (owner-authoritative, 2026-07-29),
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md` (canonical architecture),
`docs/handoffs/2026-07-29-codex-scenario-engine-foundation-handoff.md` — which states
plainly: **"No scenario-engine implementation has started."** Everything in this
document is the pre-existing foundation that new design has to sit on top of.

---

## 1. Play/scenario engine primitives

Two separate, still-live engines coexist. **`src/play/`** (kernel-based, animated,
branching) is the newer, actively-developed one (July commits). **`src/scenario/`**
(static single-frame "boards," 5 interaction primitives) is older (June commits) but
still imported by `src/App.jsx` and the review tools — not dead code.

### `src/play/` — the animated branching-play engine

| File | What it actually does | Maturity |
|---|---|---|
| `src/play/kernels/twoOnOneKernel.js` | Parametric generator for the 2-on-1 family. Builds defender geometry from a `commit` param (`stepsUp`/`holdsMiddle`) and **asserts its own invariants numerically** (pass-lane/shot-lane distances) — throws rather than emits a wrong-answer play. 3 param axes (commit × depth × shape) × mirror × seed = 48-play expansion space. Named in the new design doc as "the reference implementation pattern" for future kernels. | proven-but-narrow (one family) |
| `src/play/noveltyGate.js` | Deduplicates candidates: an answer must "move" (different correct action, or same action landing >~13ft away) or the layout must differ >~10ft avg, else it's rejected as a clone; caps 3 kept plays per (option, rink-third) signature. | production (real gate, real numbers below) |
| `src/play/rinkAnchors.js` | Named rink landmarks (`slotRight`, `circleTopRight`, etc.) in the 200×85 ft play space, with `at()`/`mirrorX()` helpers so authors write "the slot" instead of guessing coordinates. | production |
| `src/play/motionGeometry.js` | Pure geometry: SVG path generation (2-point straight lines or Catmull-Rom splines through waypoints), motion reveal choreography/timing, and which motions render on question vs. terminal nodes (terminal nodes show faded "ghost trail" routes). Renderer-free, unit-testable. | production |
| `src/play/validateAnimatedPlay.js` | The play data contract: required node fields, exactly-one-correct-option rule, per-question-kind structural rules (verdict needs `justify`, predict-next needs `truthNext`, spot-mistake needs `mistakeActor`), watch-chain length/cycle checks, age-band kind availability. | production |
| `src/play/AnimatedPlay.jsx` (579 lines) | The renderer. Age-banded token representation (figure/token/symbol by band), age-banded text rewriting (strips `F1`/`D1`/etc. shorthand for U7-U13), coach-feedback headline + reinforcement system, per-node fixed-duration CSS transition timing (1.4s), telemetry event emission, "skip to question" for watch chains at U13+. | production |
| `src/play/playCatalog.js` | Assembles `ALL_ANIMATED_PLAYS` from hand-authored core plays + curated far-side mirrors + kernel/variant expansions. | production |
| `src/play/playFamilies.js` | Classifies plays into 7 named families with `targetVariants` goals and a coverage/warning report (`buildScenarioFamilyReport`). | production |
| `src/play/artLint.js` | Deterministic, computable-from-data-alone visual QC: token overlap at freeze, out-of-bounds points, cue-label-covers-actor, answer-leaking arrows/cues, puck-adrift. Layer 1 of the art-QC design; runs with no renderer. | production |
| `src/play/validateFactoryStandards.js` | Second validation layer enforcing authoring conventions (young-player shorthand ban, follow-up questions need `reRead`+new cue, justify-copy held to the same bar as primary asks). | production |
| `src/play/questionKinds.js` | Single source of truth for the 5 question kinds (below) — `resolveKind`, `kindSpec`, age-gating via `kindsForAge`. | production |
| `src/play/interactionProfiles.js` | Per-age-band UI profile: token style, colors, which kinds are available (U7/U9 get 2 kinds; U11+ get all 5). | production |
| `src/play/playVariants.js` | `makePlayVariant` (deep-merge patch a base play) and `mirrorPlayY` (reflect a play across the rink's long axis — free far-side variant, only 3 plays currently use it). | production |
| `src/play/prototypeTelemetry.js` | Age-group-aware text rendering for telemetry + `createQuestionTelemetrySnapshot`/`collectPlayTelemetrySnapshots`, stamps a stable signature hash per question instance. | production |
| `src/play/telemetry.js` | Client-side event log (`localStorage`, key `rinkreads_animated_play_events_v1`, capped 200 events) + `summarizeAnimatedPlayEvents` (correct/total, most-common-wrong-answer). Prototype-only — not synced to Supabase. | prototype |
| `src/play/tokenSystem.js`, `motionVocabulary.js`, `possessionChange.js`, `coachFeedbackTone.js`, `coachReinforcement.js`, `ActorTapTargets.jsx`, `CoachFeedback.jsx`, `ReadThePlay.jsx` | Supporting pieces: role→shape/label spec, motion style constants, interception/turnover validation, 12+12 warm coach headlines chosen by stable hash, session-scoped "show coach feedback" throttle, tap-target hit areas for `spot-mistake`, and the live player-facing tile (`src/play/ReadThePlay.jsx`, U11/U13 only today). | production |

**Real counts (via `node -e` import of the actual modules, 2026-07-29):**
- `ALL_ANIMATED_PLAYS`: **25 plays** (9 hand-authored core + 6 variants/mirrors + 10 additional standalone plays including verdict/predict-next/spot-mistake demonstrators).
- By family: two_on_one **12**, gap_control **3**, off_puck_support **3**, backcheck_recovery **2**, forecheck_pressure **2**, defensive_angling **2**, dz_breakout **1**. Targets are 4-6 per family — only `two_on_one` has cleared its target; the other 6 are all under.
- By age band: U13 **25**, U11 **24**, U9 **13**, U15 **13**, U18 **10**, U7 **6** (plays can carry multiple bands).
- Question kinds shipped: **5** — `read-mc`, `lane-pick`, `predict-next`, `verdict` (+justify), `spot-mistake`. Kind mix inside `two_on_one` alone: 9 read-mc, 1 verdict, 1 predict-next, 1 spot-mistake — the other 4 kinds barely reach the other 6 families.
- **Kernel throughput reality check** (`docs/factory/kernel-expansion-report.md`, generated by `npm run report:kernel-expansion`): expanding the full twoOnOne parameter space produces **48 candidates**, all validator-clean, but only **4 survive the novelty gate** against the live catalog — a 92% waste rate from parameter permutation alone. Geometric jitter alone does not scale; new kernel axes or genuinely-varied prose/geometry are required, which is exactly the gap the 2026-07-29 scenario-engine design is trying to close.

### `src/scenario/` — the older static-board engine (still live, still imported)

| File | What it does | Maturity |
|---|---|---|
| `src/scenario/schema.js` | JSDoc-typed schema for 4 interaction primitives (`point`, `path`, `selection`, `sequence`) using **normalized 0-1 coordinates**, SPADL-style action verbs (`skate`/`carry`/`pass`/`shoot`/`screen`/`check`/`backcheck`), and zone-id references. | production (schema stable) |
| `src/scenario/registry.js` | Perseus-widget-style primitive registry (`getPrimitive`/`listPrimitives`) — 5 primitives registered: path, selection, point, sequence, **place** (place.jsx exists but isn't in the schema doc's "4 primitives" comment — a small doc/code drift). | production |
| `src/scenario/zones.js` | 20 named semantic zones (`oz-slot`, `dz-corner-strong`, etc.) with normalized center + tolerance, resolved at scoring time. | production |
| `src/scenario/validators.js` (48KB, ~960 lines) | A large deterministic hockey-logic rules engine (`runHockeyValidators`) — offsides-on-entry, exactly-one-puck, odd-man-rush-is-actually-odd, shoot-targets-attacking-net, backcheck-heads-to-own-net, goalie-on-puck-to-net-angle, age-based skater/difficulty caps, and more. Each rule traces to a dated lesson in `LESSONS.md`. | production (self-improving, documented loop) |
| `src/scenario/formations/` | 3 formation generators: `odd-man-rush.js`, `oz-backdoor.js`, `nz-gap-1on1.js` — compile a formation + age into a validated board. | prototype (only 3 formations exist) |
| `src/scenario/curriculum.js` | Reads `src/data/curriculum-ledger.json` (Node-only, not bundled) to resolve a `nodeId` → age/depth/difficulty/level. | production, but only wired to this older system |
| `src/scenario/seeds/` | **27 authored/generated scenario JSON boards** (plus `_pending/` and `_retired/` subfolders) spanning U7-U15, covering dz-breakout, oz-entry, gap-steer, scanning, time-and-space, off-puck-support themes. | prototype-to-production mix (some `gvis_*` naming suggests an earlier "Game Vision" naming convention) |
| `src/scenario/LESSONS.md`, `GOLDEN-RULES-2026-06-11.md` | The self-improving rule loop this system already runs: catch → generalize → encode as a validator rule → add golden fixture → sweep the bank → record. 18 dated lessons encoded as of 2026-06-11. | production practice, directly reusable pattern |
| `src/scenario/ScenarioRenderer.jsx`, `RinkStage.jsx`, `MultiStepPlayer.jsx`, `ScenarioEditor.jsx`, `ScenarioPlayground.jsx` | Rendering + a hand-authoring editor + multi-step sequencing. `ScenarioEditor`'s force-save path is explicitly named as a legacy tool now frozen from direct writes (2026-07-29 decision). | proven-but-narrow / one path now frozen |

---

## 2. Content that already exists (real counts)

| Content type | Count | Source |
|---|---|---|
| Animated plays (`src/play`) | **25** across 7 families, 5 question kinds | `playCatalog.js` (counted live) |
| Static quiz-bank questions (`bank.json`) | **262** across 6 age bands (U7-U18) | `src/data/bank.json` |
| Image-based POV questions (`povQuestions.json`) | **280 questions over 24 images** | `src/data/povQuestions.json` (`counts` field) |
| Scenario "board" seeds (`src/scenario/seeds/`) | **27** JSON files | directory listing |
| Curriculum ledger nodes | **157** — U7:12, U9:21, U11:31, U13:31, U15:31, U18:31 | `src/data/curriculum-ledger.json` |
| Brain Gym drills | **12** | `src/cognitive-gym/CognitiveGym.jsx` DRILLS registry |

**Question-kind engine** (`docs/superpowers/plans/2026-07-08-question-kind-engine.md`):
plan matches shipped reality exactly — 5 kinds (`read-mc`, `lane-pick`, `predict-next`,
`verdict`, `spot-mistake`), U7/U9 restricted to the first 2, watch chains (`autoNext`)
added as a non-question primitive. **production**, fully tested (`test:question-kinds`,
`test:animated-play`, `test:play-engine` all green per commit history).

**Brain Gym drills** (`src/cognitive-gym/CognitiveGym.jsx`), by skill domain:

| id | Name | Skill | Build |
|---|---|---|---|
| anticipation | Read the Pass | Anticipation | canvas |
| tracking | Baylor's Pick | Awareness | canvas |
| reaction | Shoot or Hold | Reaction | canvas |
| eyesup | Eyes Up | Vision | canvas |
| snapshot | Snapshot | Memory | canvas |
| findlane | Find the Lane | Vision | canvas |
| bestoption | Best Option | Decisions | canvas |
| readnumbers | Read the Numbers | Vision | canvas |
| lateread | Late Read | Adapting | canvas |
| twothings | Two Things at Once | Focus | canvas |
| shootout | Shootout | Shot Read | canvas |
| runtheplay | Run the Play | Memory | canvas |

Shared engine (`gymEngine.js`) is genuinely reusable: `createAdaptiveLevel` (streak-based
promote/relegate, combo tracking), age-seeded starting level (`calibratedStartLevel`,
`BAND_SEED`), a real `drawRink` canvas backdrop. **production**, per-drill playtest fixes
shipped 2026-07-12, "live on `main`" playtest confirmation still pending per
`docs/roadmap/TASKS.md` NOW.

**Per-player telemetry already captured (Supabase):**

- `question_results` (migration_0010): one row per answered question — `correct`,
  `time_taken_ms`, `difficulty` (1-3), `zone` (dz/oz/nz), `skill` tag, `answered_at`.
  This is the **authoritative source for a rolling 60-140 EWMA "Hockey IQ Score."**
  RLS: player owns their rows; coach reads teammates' rows via team membership.
  **production.**
- `quiz_sessions` (schema.sql): bulk session blobs (`results` jsonb array + `score`).
- `challenge_results` (migration_0008): per-team-challenge score + results, with
  teammate-read policy powering a leaderboard.
- Client-side prototype telemetry for animated plays (`src/play/telemetry.js`) is
  **localStorage-only, not synced to Supabase** — a real gap between the play engine's
  telemetry and the quiz bank's telemetry.

---

## 3. Coach-facing infrastructure

| File | What a coach can actually do today | Maturity |
|---|---|---|
| `src/coachAnalytics.jsx` (155 lines) | Team accuracy dashboard: one big overall-accuracy number, 7-day vs. prior-7-day trend arrow, sessions-logged-this-week engagement signal, most-improved/most-stagnant player list. Reads `quiz_history` already attached to roster rows. | production |
| `src/trainingLogCoach.jsx` | Coach-visible off-ice training log per roster player (minutes, puck-touch counts), gated to TEAM tier by RLS (coach-owns-team join), not by client logic. | production |
| `src/teamChallenges.jsx` (480 lines) | Coach picks a fixed MC/TF question set, whole team takes the same quiz, coach sees a leaderboard. 3 surfaces: coach create/list/leaderboard, player card, dedicated quiz-run screen. | production |
| `src/assignments.jsx` (445 lines) | Coach-authored homework with optional per-player targeting (`target_players`); player-side completion tracking with a "new assignment" pulse badge. | production |

**Supabase schema — entitlement/team/RLS model:**

- `profiles` (role, name, level, position, `tier` column added migration_0009: FREE/PRO/FAMILY/TEAM).
- `teams` / `team_members`: coach owns teams; players join by code.
- `assignments` + `assignment_completions`, `team_challenges` + `challenge_results`:
  both follow the same clean pattern (coach CRUD scoped to `auth.uid() = coach_id`,
  player read scoped to team membership) — **this pattern is solid and reusable**.
- `question_overrides` (migration_0017): live-edit patch layer over bank questions.
  **Known RLS gap, confirmed by reading the policy directly**: insert/update policies
  check only `auth.role() = 'authenticated'` — any signed-in user can write or edit
  any question override, not just the dashboard owner.
- `profiles` update policy (schema.sql:142-144): `for update using (auth.uid() = id)`
  with **no column restriction** — confirmed a player can update their own `tier`
  column directly via the client. Entitlement gating (`src/utils/tierGate.js`,
  `canAccess()`) is enforced client-side against this same client-writable column.
  This exact gap is already named in `docs/factory/SCENARIO-ENGINE-DECISIONS.md`
  framework-fit decision #5 as something the coach-authoring MVP must close first.

**Entitlement matrix** (`src/utils/tierGate.js`): 13 feature keys
(`multipleAgeGroups`, `allQuestionFormats`, `positionFilter`, `adaptiveEngine`,
`smartGoals`, `progressSnapshots`, `fullSessionHistory`, `coachDashboard`,
`coachFeedback`, `additionalProfiles`, `weeklyChallenge`, `rinkQuestions`,
`fullSkillRating`) mapped per tier (FREE gets 2, PRO/FAMILY get most, TEAM presumably
all — file not fully read past FAMILY). **production logic, unverified enforcement**
given the RLS gap above.

---

## 4. Existing AI/LLM integration patterns already wired in the repo

**Ollama is designed, not implemented.** Every hit for `localhost:11434` /
`llama3.1` / `hermes3` / `deepseek-r1` / `nomic-embed-text` is in **docs only**
(`SCENARIO-ENGINE-DECISIONS.md`, the 2026-07-29 design spec, the handoff, `TASKS.md`).
No code in `src/` or `tools/` calls Ollama today. This is a real, honest gap between
the ambitious plan and the current codebase — worth stating plainly so design work
doesn't assume a working local-model bridge exists yet.

**Claude-driven local pipelines are real, tested, and already used at scale:**

| Tool | What it proves | Maturity |
|---|---|---|
| `tools/lib/claude-agent.mjs` | Reusable driver that shells out to the `claude` CLI non-interactively (`spawn`, `--print --model sonnet --max-budget-usd --output-format json`), with retry/backoff and JSON-envelope unwrapping. Explicitly "zero cost on a Claude Max plan." This is the exact mechanism the new scenario engine's "Claude judgment" role would use. | **production, proven** |
| `tools/scenario-author.mjs` | CLI that generates a full scenario JSON from a natural-language prompt via the same subprocess pattern, then validates + ASCII-previews it. Defaults to writing directly into `src/scenario/seeds/` — this default-write path is one of the tools explicitly frozen by the 2026-07-29 decisions. | proven-but-narrow, now partially frozen |
| `tools/source-triage.mjs` + `tools/gauntlet/source-triage-gate.mjs` | Three-stage funnel (title pre-filter → capped excerpt → full-read escalation) over scraped coaching-content transcripts, judged by a real Claude call. **Ran for real** on 2026-07-19: 114 transcripts assessed, 8 PURSUE. This is the strongest existing proof that "Claude judgment driving a local batch pipeline" already works at genuine content-curation scale, not just as a demo. | **production, run for real** |
| `tools/gauntlet/rubric.json`, `lessons.json`, `visual-rubric.json`, `visual-lessons.json` | JSON-encoded, versioned rubrics + accumulated lessons that a judging pass reads — structurally the same "self-improving ledger" pattern as `src/scenario/LESSONS.md`, applied to the visual/gauntlet QC path. | production pattern |
| `src/play/artLint.js` (Layer 1) | The deterministic, zero-token half of the art-QC design (`docs/superpowers/specs/2026-07-21-art-qc-autolearning-design.md`) — catches legibility failures from play data alone, before any model call is needed. | production |

---

## 5. Constraints and known gaps (carry forward, don't re-litigate)

- **Free-only, permanently**: no paid Anthropic/OpenAI API key, ever, per
  `docs/factory/SCENARIO-ENGINE-DECISIONS.md` Decision 1 — `.env` holds Supabase/Notion
  only.
- **`profile.tier` is client-writable** — no server-side check ties it to a real
  purchase (see §3). Already flagged as a hard blocker for the coach-authoring MVP.
- **`question_overrides` accepts writes from any authenticated user**, not just the
  dashboard owner (see §3).
- **Legacy direct-write tools are frozen** (2026-07-29 decision 9) and must not gain
  new callers: `ScenarioEditor`'s force-save path, `tools/seed-editor-plugin.mjs`
  `--force`, `tools/review-store.mjs` direct `bank.json` writes,
  `tools/scenario-author.mjs`'s default live-seed write, `scripts/generate-questions.mjs`,
  `scripts/batch-approve.mjs`, and `tools/scenario-engine-overnight.ps1` (uses
  `--dangerously-skip-permissions`, no single-instance lock — confirmed still
  **Disabled** as a Windows scheduled task).
- **Kernel throughput plateaus fast**: 48 candidates → 4 novel survivors for the one
  existing kernel (see §1). Pure parametric jitter is not a scaling strategy on its own.
- **A known false-positive bug in the gate reporting itself**: `report-kernel-expansion.mjs`
  and `test-play-kernels.mjs` read a validator result as `.errors`; the validator
  actually returns `.errs` — silently masks failures. Flagged in the decisions doc,
  not yet fixed as of this inventory.
- **Client-side telemetry (`src/play/telemetry.js`) never reaches Supabase** — it's a
  localStorage-only prototype, disconnected from the real `question_results` pipeline.
- **Claude scheduling restriction**: hockey-judgment calls may only run from an
  attended/interactive Claude session, never headless/unattended, until a supported
  headless-session handshake is proven safe — even though `tools/lib/claude-agent.mjs`
  already demonstrates a working headless pattern for lower-stakes work (source triage).
  This is a deliberate, conservative choice, not a technical limitation.

---

## 6. Product surface area beyond the scenario engine

Per `docs/roadmap/TASKS.md` (NOW/NEXT/LATER, 2026-07-29):

- **NOW (max 3 active):** Brain Gym live-on-`main` playtest confirmation still pending;
  acting on the source-triage report (8 PURSUE coaching sources); scenario-engine
  foundation + breakout-fixture calibration.
- **NEXT (sequenced):** (1) scenario/kernel engine foundation & scalability — unparked,
  gated by the design + implementation plan; (2) coach-created animated play/video MVP;
  (3) bulk batch 002 through the kind-aware factory — **blocked** on #1's acceptance
  gates; (4) native rebuild of the animated-play "scenario-inspiration" backlog; (5)
  **Daily Faceoff** (arcade shell v1 — 5 curated reads/day, calendar streak, "Backup
  Goalie" streak protection, milestone celebrations) — session wrapper over the
  *existing* catalog, no new rink primitives needed; (6) **parent/coach weekly progress
  card v1** — explicitly noted that "telemetry is already kind-aware, so the data
  exists — this is rendering + delivery"; (7) **Brain Gym Phase 2** (one-button daily
  workout, "Rink Rating" 6-domain radar, Rookie Combine placement).
- **LATER:** evidence-led curriculum/research library (Obsidian workspace already
  partially built — hub, 6 templates, 5 Bases dashboards — acquisition not yet started);
  play-engine backlog (headless still-exporter for batch QC, seeded variation); 7 seeds
  flagged for single-option rework; a goalie-reading concept gap; Brain Gym Phase 3
  (age-banded identity layer: "Practice Rink" for U7-U11, "The Combine" for U13+).

---

## Connective tissue — leverageable combinations that aren't happening yet

1. **Per-concept accuracy telemetry exists but doesn't drive content selection.**
   `question_results` already tags every answer with `difficulty`, `zone`, and `skill`
   and computes an EWMA "Hockey IQ Score" — but nothing currently reads that signal to
   choose *which scenario family or kernel depth* to serve a given player next. The
   scenario engine's calibration/promotion design and Brain Gym's per-drill adaptive
   level (`gymEngine.js`'s `createAdaptiveLevel`) are both proven difficulty controllers
   sitting right next to this data, unconnected to it.

2. **The novelty gate + art lint could gate BEFORE any model call, not just after.**
   The measured 48→4 kernel-expansion ratio proves cheap deterministic checks
   (`noveltyGate.js`, `artLint.js`) already do most of the filtering work for free. A
   scenario-engine pipeline that runs these first and only spends Claude/Ollama
   judgment on survivors would multiply effective throughput without touching model
   budget — the geometry-first architecture already exists, it's just not the front
   door of a generation pipeline yet.

3. **The "lesson ledger" pattern is proven twice, independently, and could be one
   system.** `src/scenario/LESSONS.md`'s catch→generalize→encode→regress-test→sweep
   loop and `tools/gauntlet`'s `lessons.json`/`rubric.json` files are structurally the
   same self-improving mechanism, built separately for two different QC surfaces. The
   new scenario engine's "self-verifies and updates based on its own judgment" ask
   (per the owner's verbatim request) doesn't need a new design — it needs these two
   merged into one ledger the kernel/physics/tactical layers all write to.

4. **`mirrorPlayY` is a free 2x multiplier that's barely used.** Reflecting a play
   across the rink's long axis is pure geometry (no new authoring, no model call) and
   is already wired into the catalog for exactly 3 plays. The 6 under-target families
   (gap_control, off_puck_support, forecheck_pressure, backcheck_recovery,
   defensive_angling, dz_breakout — all sitting at 1-3 of their 4-6 targets) could
   double their count today with zero new content risk.

5. **A working headless-Claude subprocess pattern already exists and has run at real
   scale** (`tools/lib/claude-agent.mjs`, proven on 114 real transcripts) — the
   scenario engine's hardest open question ("can Claude judgment run unattended
   safely?") already has a working non-scenario answer sitting in the same repo. The
   gap isn't inventing the mechanism; it's proving the same mechanism is safe enough
   for correctness-critical hockey judgment, which is exactly why Decision 8 keeps it
   attended-only for now rather than treating it as unsolved from scratch.
