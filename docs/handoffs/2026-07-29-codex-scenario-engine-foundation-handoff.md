# Claude Handoff: RinkReads Scenario Engine Foundation and Physics Fit Audit

**Prepared:** 2026-07-29

**For:** Claude Code

**Project:** RinkReads / IceIQ

**Repository:** `C:\Users\mtsli\IceIQ`

**Branch:** `feature/shareable-beta`

**Status:** Foundation architecture documented and hardened. Current-framework
fit audit complete. No scenario-engine implementation has started.

**Owner authority:**
`docs/factory/SCENARIO-ENGINE-DECISIONS.md`

**Canonical architecture:**
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md`

## Your Assignment

Continue from the approved scenario-engine foundation without restarting the
architecture discussion.

Before implementing anything:

1. Read the current repo instructions and authority documents listed below.
2. Inspect the current worktree and preserve the unrelated/uncommitted Claude
   prototype exactly as found.
3. Confirm Thomas's remaining owner choices in this handoff.
4. Write a reviewed implementation plan before changing runtime code.

Do not push, deploy, publish, enable a scheduled task, use a paid model API, or
write generated content directly into the live bank, live scenario seeds, or
the animated-play catalog.

## Read Order

Read these in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `ROUTING.md`
4. `docs/factory/SCENARIO-ENGINE-DECISIONS.md`
5. `docs/superpowers/specs/2026-07-29-scenario-engine-design.md`
6. `docs/roadmap/TASKS.md`
7. This handoff

For specialized implementation work, also read:

- `docs/play-kernel-standards.md`
- `docs/scenario-family-standards.md`
- `AUTHORING_STANDARDS.md`
- `src/scenario/LESSONS.md`
- `src/scenario/GOLDEN-RULES-2026-06-11.md`
- `docs/superpowers/specs/2026-07-21-play-kernel-engine-design.md`
- `docs/superpowers/specs/2026-07-21-art-qc-autolearning-design.md`

## What Thomas Asked For

Thomas asked for a scenario engine that can eventually:

- mass-produce meaningful, accurate hockey questions with limited input;
- realistically create hundreds of useful scenario/question items in a
  controlled batch;
- use generative AI judgment without inventing hockey truth;
- maintain an approved, updateable tactical knowledge base;
- self-check and learn without approving its own new tactical claims;
- let coaches create their own animated plays and shareable videos;
- include a first-class physics layer so plays make sense in time and space;
- share hockey and physics foundations with a future arcade hockey game without
  forcing all products into one runtime.

Thomas also set these hard constraints:

- no paid Anthropic or OpenAI API;
- Claude Code subscription sessions provide hockey and pedagogy judgment;
- local Ollama performs mechanical work only;
- Ollama never decides the correct hockey answer;
- high-confidence automatic promotion is permitted only after formal
  calibration;
- uncertain work goes to Thomas with the exact reason;
- physics hard failures cannot be overridden by Claude;
- no direct writes from generation into live app content;
- no push, deployment, publication, or public sharing without confirmation.

## What Codex Did

Codex completed two documentation-only commits and then performed a read-only
fit audit against the current code, data paths, tests, local model service, and
Windows scheduler.

No scenario-engine runtime code, package dependency, Supabase schema, service,
or scheduled task was changed.

### Commit 1: `8569676 docs: define scenario engine foundation`

This commit created the first reconciled foundation.

#### New canonical design

Created:

`docs/superpowers/specs/2026-07-29-scenario-engine-design.md`

The design established this controlled production flow:

```text
approved tactical claim
  -> correct-by-construction scenario kernel
  -> deterministic physics-constrained simulation
  -> correct answer derived from validated state
  -> question-kind and prose variants
  -> deterministic gates
  -> Claude hockey and pedagogy judgment
  -> conservative tier decision
  -> immutable staged artifact
  -> explicit local promotion
  -> live app composition
```

It separated four truth domains:

| Domain | Authority |
|---|---|
| Hockey tactics | Approved claim, kernel invariant, and Claude judgment |
| Measurable physics | Deterministic simulator and sourced physics profile |
| Teaching quality | Standards, deterministic checks, and Claude judgment |
| Visual clarity | Renderer checks, art lint, and manual playtest |

It also established:

- a renderer-independent canonical scenario record;
- physical units in metres and seconds;
- adapters to current RinkReads presentation coordinate systems;
- versioned tactical claims with human approval;
- fast deterministic Level-1 hockey kinematics;
- a separate future Level-2 real-time game runtime;
- the free-only Claude/Ollama role split;
- immutable, resumable, idempotent batch evidence;
- ten ordered promotion gates;
- conservative, local, recallable promotion;
- a protected coach-authored play/video boundary;
- honest throughput accounting;
- fail-closed behavior;
- the defensive-zone breakout as the first calibration candidate;
- a sequence that proves one vertical slice before scaling.

#### Reconciled owner decisions

Updated:

`docs/factory/SCENARIO-ENGINE-DECISIONS.md`

Changes included:

- made the owner-decision file explicitly authoritative;
- replaced "engine self-judgment" with deterministic gates plus calibrated
  Claude judgment;
- kept new kernels and template classes manual until calibrated;
- added physics as a first-class truth layer;
- added the shared-core/separate-runtime boundary;
- clarified that physics can reject impossible plays but cannot select the best
  tactic by itself;
- clarified that `COACHES_WHITEBOARD.md` is legacy static-image guidance.

#### Corrected repo context and routing

Updated:

- `CLAUDE.md`
- `ROUTING.md`
- `docs/factory/SPEC.md`
- `COACHES_WHITEBOARD.md`
- `docs/roadmap/TASKS.md`

These changes:

- removed stale claims that the app had an empty bank;
- recorded the verified live composition from `src/data/bank.json` and
  `src/scenario/seeds/*.json` through `src/qbLoader.js`;
- stated that current scenario validators are static geometry/hockey checks,
  not time-based physics;
- demoted the June image-first factory spec to useful history;
- retired instructions targeting removed `questions.json` and
  `factoryQuestions.json`;
- moved scenario-engine foundation work into the active roadmap;
- recorded that throughput must be measured, not assumed.

### Commit 2: `f3472f9 docs: harden scenario engine contracts`

The second commit converted the broad design into stricter contracts and
failure behavior.

#### Canonical immutable artifacts

The design now distinguishes:

1. `ScenarioDefinition`
2. `SimulationTrace`
3. `DecisionEvaluation`
4. `CompiledTeachingPlay`
5. Future `ArcadeReplay`

Important rules:

- one `ScenarioDefinition` targets one physics age/skill profile;
- every artifact has an immutable version and stable content hash;
- a coach or kernel supplies `declaredRead` as intent;
- the engine independently calculates `derivedRead`;
- a mismatch cannot silently become validated truth;
- renderers must consume validated timing and trajectories;
- renderers cannot independently retime load-bearing motion.

#### Physical coordinate and timing contract

The canonical `RinkFrame` uses:

- metres and seconds;
- origin at centre ice;
- explicit attack direction;
- explicit rink/profile version;
- explicit conversion adapters.

Current normalized `0..1`, animated `200x85`, and legacy `600x300` spaces are
presentation frames only. Physics cannot be calculated directly in those
frames, and an adapter cannot clamp a physical failure into legal bounds.

#### Physics model

The first physics implementation is a deterministic, headless Level-1 hockey
kinematics simulator.

It must model or conservatively bound:

- rink, boards, goal lines, nets, and legal play area;
- time, distance, velocity, acceleration, deceleration, and stopping;
- facing, turning rate/radius, path length, and reaction delay;
- age/skill performance ranges;
- puck release, travel, deceleration, reception, shot, rim, and board contact;
- possession changes;
- player footprint, stick/reach envelope, lane closure, and interceptions;
- actor overlap and chronological causality;
- whether the decision window remains open at the authored freeze.

Hard failures include:

- teleportation;
- impossible acceleration, turning, or stopping;
- unreachable passes;
- illegal bounds;
- inconsistent possession;
- impossible event ordering;
- a claimed open lane intercepted before puck arrival.

An unimplemented phenomenon returns `UNSUPPORTED_MODEL` and requires review. It
does not receive a guessed pass or fail result.

All physics findings are structured and record measured values, thresholds,
units, profile/source versions, affected actors/actions, severity, and answer
impact.

Exact skating and puck parameters remain an implementation research choice.
They must be sourced. Claude and Ollama may not invent authoritative values.

#### Tactical knowledge contract

The design requires machine-readable, versioned tactical claims with:

- stable IDs and hashes;
- conditions and conclusions;
- source references and evidence confidence;
- linked kernel/validator invariants;
- approval status and named human approving authority;
- supersession/version lineage;
- conflict detection;
- a deterministic tactics test suite.

Markdown files in `docs/library/` remain useful human-facing evidence notes.
They are not, by themselves, the machine-readable approval ledger.

Claude and Ollama may propose or review claims. Only Thomas or a named human
coach/reviewer can approve a new tactical claim.

#### Immutable factory, judgment, and recall

Every batch must create its immutable start manifest before candidates.
Completion is append-only run events plus a content-addressed summary.

The event state machine is:

```text
generated
  -> validated | rejected
  -> judged | review-required | rejected
  -> promotion-eligible | review-required
  -> staged
  -> promoted
  -> recalled | retired
```

Changing content creates a new artifact version. It does not rewrite the old
version or its history.

A dependency index links promoted artifacts to:

- tactical claim;
- physics profile;
- kernel/template;
- renderer;
- rubric and judge stack;
- promotion policy;
- calibration corpus;
- source versions.

Recalling a dependency must produce a reviewable patch that removes affected
items without touching unrelated content.

#### Conservative calibration

Two clean capped batches are necessary but not sufficient.

Template graduation additionally requires:

- parameter-space boundary coverage;
- adversarial physics, tactics, ambiguity, and render fixtures;
- at least 50 Thomas-reviewed decisions overall;
- at least 20 representative decisions for that template class;
- a held-out set of at least 20 percent and at least 10 class decisions;
- zero wrong-answer false approvals;
- recorded false-rejection, queue, and warning rates.

After graduation, every eligible batch still receives a deterministic sample of
at least 10 percent or three items per template, whichever is greater.

One wrong-answer defect disables that class and triggers dependency-based
recall.

#### Coach authoring and video boundary

The selected MVP is a coach creation tool, not simply catalog export.

The coach must be able to:

- place players, goalie, and puck;
- draw routes, passes, and shots;
- set action timing and the decision freeze;
- state the intended read and answer options;
- receive structured physics/tactical feedback;
- compare declared and derived reads;
- save and reopen a draft;
- preview through the same validated playback contract;
- export one protected shareable animation.

Hard-failed work remains preview-only. Diagnostic output must be visibly marked
`DRAFT - NOT VALIDATED`. Unwatermarked, team, or catalog distribution requires
the designated validation tier.

#### Runner and throughput boundary

The supported future runner must:

- acquire a single-instance lock;
- create an immutable run envelope first;
- use isolated, recorded source state;
- preflight dependencies, disk, configuration, Ollama, and destinations;
- require a supported Claude-session handshake;
- record available model/session/tool metadata;
- fail staged when Claude judgment is unavailable;
- use timeouts, resumable checkpoints, and idempotent promotion;
- never push, deploy, publish, or bypass manual enablement.

The scale claim is not earned until one controlled run:

- completes within 24 elapsed hours;
- uses no more than 60 minutes of hands-on human input during the run;
- produces at least 200 meaningfully distinct physics-clean scenario states;
- produces at least 200 promotion-ready question items;
- reports every gate survival count and model/runtime detail;
- separately reports pre-run human setup effort;
- audits the promotion-ready cohort with zero wrong-answer false approvals.

#### Roadmap and routing hardening

Updated:

- `docs/roadmap/TASKS.md`
- `ROUTING.md`
- `AGENTS.md`
- `CLAUDE.md`

Created:

`docs/roadmap/archive/2026-05-02-routing-storage-map.md`

The final authority hierarchy is:

1. `docs/factory/SCENARIO-ENGINE-DECISIONS.md` - Thomas's owner authority.
2. `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` - canonical
   architecture and contracts.
3. `docs/roadmap/TASKS.md` - priority and sequence only.
4. `CLAUDE.md` - broad current repo context.
5. `ROUTING.md` - short current path map.
6. Specialized standards - authoritative only in their narrow, non-conflicting
   areas.

Historical status:

- `docs/factory/SPEC.md` is June image-first implementation history.
- `COACHES_WHITEBOARD.md` is a static-image recipe collection.
- The May 2 author/storage route is archived.
- Removed `questions.json` and `factoryQuestions.json` are not destinations.

The roadmap now places:

1. scenario-engine foundation and breakout calibration;
2. protected coach author/video MVP;
3. bulk batch 002, blocked by foundation acceptance;
4. later content and game work.

The coach MVP intentionally comes before the final throughput benchmark.

## Current-Framework Fit Audit

After the documentation commits, Codex audited the canonical design against
current runtime, storage, promotion, validation, authoring, authentication, and
automation code.

### What fits and should be reused

- React 18, Vite 5, and plain JavaScript can support a pure deterministic
  Level-1 simulator without a new game-engine dependency.
- `src/play/kernels/twoOnOneKernel.js` is a valid correct-by-construction
  generation pattern.
- `src/play/noveltyGate.js` is a useful start for meaningful-variation checks.
- The five animated question kinds and their branching/teaching behavior remain
  useful consumers.
- `rinkAnchors.js`, waypoint curves, and choreography vocabulary remain useful
  authoring tools.
- The unified scenario interaction primitives remain useful learner
  interaction/UI consumers.
- Current schema, hockey-geometry, copy, accessibility, art, and manual
  playtest rules remain useful non-physics gates.
- Current live bank composition can remain unchanged initially.
- The existing TEAM coach dashboard is the best product home for a future
  `Create a play` feature.
- Existing team ownership and assignment RLS provide a starting pattern.
- Existing Browse/Triage/Admin surfaces provide review UX ideas.
- A future real-time arcade game can share domain contracts while remaining a
  separate runtime.

### Two current scenario systems

The app currently has two parallel systems:

1. `src/play/*`
   - player-facing animated plays;
   - presentation coordinates around `200x85`;
   - hand-imported JavaScript catalog;
   - branching teaching nodes;
   - fixed-duration browser/CSS animation.

2. `src/scenario/*`
   - interactive scenario questions;
   - normalized `0..1` coordinates;
   - primitive registry and seed JSON;
   - static frame/geometry validation;
   - live composition through `qbLoader`.

Neither should become the canonical physics truth.

The canonical scenario/physics/compiler layer should sit above both. Existing
formats become adapters or consumers.

### Current playback does not preserve physics

`src/play/AnimatedPlay.jsx` currently:

- schedules route reveal and entry with fixed browser timers;
- gives every actor and the puck the same 1.4-second CSS transition;
- moves actors between endpoints rather than along validated trajectories;
- uses waypoint/sequence timing mainly to reveal route lines.

`src/scenario/primitives/path.jsx` also uses a fixed replay duration and walks
point indices rather than validated metric arc length.

Therefore:

- v1 playback can remain for legacy content;
- it cannot claim validated physics timing;
- new preview/export playback must consume `CompiledTeachingPlay` with one
  deterministic clock;
- an `animated-play-v2` compatibility adapter is optional, but the compiled
  artifact remains authoritative.

### Existing validators are not physics

Current scenario validators primarily inspect snapshots, geometry, text, and
hockey logic.

Some calculations use raw normalized coordinates even though x and y later
scale differently. Those thresholds are axis-dependent and cannot be reused as
physical distance, speed, reach, or interception calculations.

Current animated validation also:

- does not enforce rink bounds for every coordinate;
- accepts no explicit time-series state;
- warns/falls back on unknown motion kinds;
- allows some permissive legacy behavior.

Preserve that behavior only for legacy v1 content. The canonical path must fail
closed or return an explicit `UNSUPPORTED_MODEL`/review result.

### Direct-write and mutable-history conflicts

Several active legacy tools violate the new staging boundary:

- `ScenarioEditor` exposes `Force save` and writes directly to
  `src/scenario/seeds/`.
- `tools/seed-editor-plugin.mjs` accepts `force` and writes invalid seeds.
- `tools/review-store.mjs` writes approved questions directly into `bank.json`.
- `tools/scenario-author.mjs` defaults to writing live scenario seeds.
- `scripts/generate-questions.mjs` writes live scenario seeds.
- `scripts/batch-approve.mjs` deletes an existing same-ID destination before
  moving the replacement.
- older factory tools still target removed `questions.json` or
  `factoryQuestions.json`.

These paths must not be reused for the new engine.

All producers should write immutable run artifacts into isolated staging. One
promotion service/CLI should append events and generate a reviewable,
idempotent patch or manifest.

### Kernel report false-positive defect

`validateAnimatedPlay()` returns:

```js
{ ok, errs, warns }
```

However:

- `scripts/report-kernel-expansion.mjs` reads `a.errors`;
- `scripts/test-play-kernels.mjs` also asserts `result.errors`.

The current reported `48/48 validator-clean` baseline therefore does not prove
that animated-play validation passed.

Fix this property mismatch before trusting the kernel report for calibration or
promotion.

### Manual playtest evidence gap

`docs/play-kernel-standards.md` requires:

- a current three-play batch cap;
- `check:bulk`;
- manual review across U7/U9, U11/U13, and U15/U18.

`scripts/check-bulk-gate.mjs` runs automated commands and prints `Ready`, but
does not require a signed/artifact-hashed manual playtest event.

The July 10 question-kind gate is owner-approved. Treat it as UI-kind
certification only, not template-class physics/tactical calibration.

The original 2-on-1 animated-play checklist still contains unchecked items.

### Coach authoring and authorization gaps

`src/scenario/ScenarioEditor.jsx` is a developer seed fixer, not the coach MVP.
It:

- stores static normalized coordinates;
- edits declared correct targets directly;
- has no action timing;
- has no physics trace;
- has no independent derived read;
- has no protected draft database;
- permits force-save;
- has no export/share boundary.

The `#scenarios` route is returned before normal authentication and is not a
safe paid coach surface.

Current entitlement handling is also insufficient for paid authoring:

- the app accepts `profile.tier` as the tier;
- current profile RLS allows a user to update their own row;
- current helpers accept broad profile patches;
- `question_overrides` permits writes by any authenticated user.

Do not reuse these as the server authority or coach approval ledger.

Coach authoring needs:

- server-owned active TEAM entitlement;
- coach role;
- team ownership;
- dedicated RLS;
- immutable saved/compiled versions;
- private drafts;
- explicit share grants;
- protected export.

### Tactical knowledge gap

`docs/library/*.md`, `sourceRef`, and the curriculum ledger are useful evidence
and curriculum inputs.

The repo does not yet contain:

- machine-readable approved tactical claims;
- approval/conflict/version validation;
- a tactics index;
- `test:tactics`;
- dependency-based tactical recall.

Recommendation: keep the authoritative claims in a build/factory-only
directory outside the browser bundle. Compile only approved claim IDs,
versions, and sanitized proof references into app artifacts.

### Promotion and provenance gap

The repo does not yet contain:

- immutable definitions, traces, evaluations, or compiled plays;
- append-only run/judgment/promotion/recall events;
- a content-addressed artifact store;
- a dependency index;
- a versioned promotion policy;
- a calibration corpus;
- an idempotent promoter for seeds or the animated catalog;
- a data-driven manifest for generated animated plays.

Recommendation:

- filesystem-first immutable run artifacts for the foundation;
- `start.json`, append-only `events.jsonl`, hashed blobs, generated indexes,
  atomic writes, and a single-instance lock;
- data-driven promoted JSON plus a deterministic generated manifest;
- Supabase for protected coach draft/product storage, not as the first factory
  run ledger.

### Claude/Ollama gap

Local Ollama is installed and running. The live check found:

- `deepseek-r1:8b`
- `llama3.1:8b`
- `hermes3:8b`
- `nomic-embed-text:latest`

Other local coding models are also present.

There is no implemented scenario-engine Ollama adapter yet.

The Claude Code CLI is installed (`2.1.206`). Existing repo wrappers invoke the
headless `claude` CLI and pass a budget guardrail, but they do not implement the
new supported-session handshake, complete judgment metadata, calibration
identity, or fail-closed runner contract.

Thomas must decide whether a supported subscription-authenticated headless
Claude CLI invocation counts as "the Claude Code session itself."

Until that is explicitly settled and proven:

- scheduled work may perform deterministic/Ollama preparation only;
- Claude hockey judgment should run from an active supported session;
- candidates remain staged when judgment is unavailable.

### Existing overnight runner is not compliant

`tools/scenario-engine-overnight.ps1` currently:

- uses `--dangerously-skip-permissions`;
- works in the current repo instead of isolated recorded source state;
- uses a mutable done sentinel;
- resumes through global `--continue`;
- has no immutable start envelope;
- has no single-instance lock;
- has no supported session handshake record;
- lacks full preflight, bounded pass timeout, idempotent promotion, and recall
  proof;
- instructs Claude to update its own learned knowledge.

Do not patch around the edges or enable it.

The live Windows task:

`RinkReads-ScenarioEngine-Overnight`

was verified on 2026-07-29 as:

- state: `Disabled`;
- enabled: `False`.

No task setting was changed.

### Remotion state

The untracked `remotion/` directory currently contains package metadata,
lockfile, dependencies, and `node_modules`, but no working composition or
rendering source.

It uses React 19 while the main app uses React 18.

Treat it as a disposable experiment until Thomas approves:

- isolated package/workspace boundary;
- exact input schema;
- React compatibility;
- renderer tests;
- output format;
- licensing/deployment model.

## Focused Verification Performed

The following current v1 suites were run through `npm.cmd`:

- `test:animated-play`: 3 passed, 0 failed;
- `test:play-engine`: 25 passed, 0 failed;
- `test:play-kernels`: 13 passed, 0 failed;
- `test:question-kinds`: 48 passed, 0 failed.

These tests confirm current v1 behavior. They do not prove physics readiness.

The kernel suite's animated-validator assertion is a false positive because of
the `errors` versus `errs` property mismatch described above.

No current suite covers:

- metric physics profiles;
- acceleration, stopping, or turning boundaries;
- puck travel/reception;
- deterministic trace hashes;
- possession across time;
- actor/puck keyframe parity;
- declared/derived read agreement;
- preview/export equality;
- immutable run events;
- dependency recall.

PowerShell execution-policy note:

- `npm.ps1` was blocked, while `npm.cmd` worked;
- `claude.ps1` was blocked, while `claude.cmd --version` worked.

Use the `.cmd` shims from PowerShell where required.

## Owner Choices Still Pending

Thomas has not yet explicitly approved the following recommended defaults.
Do not silently treat them as settled.

### 1. Canonical playback

**Recommendation:** `CompiledTeachingPlay` is authoritative. Player preview,
coach preview, and video export consume it through one deterministic clock.
Keep v1 unchanged and add a compatibility adapter only where useful.

### 2. Promoted catalog and event format

**Recommendation:** content-addressed promoted JSON plus a deterministic
generated manifest. Use a filesystem-first immutable run/event ledger. Never
have promotion hand-edit `playCatalog.js` or `bank.json`.

### 3. Tactical knowledge location

**Recommendation:** keep authoritative tactical claims outside `src/` in a
build/factory-only store. Compile only approved proof references into the app.

### 4. Coach MVP product surface

**Recommendation:** add `Create a play` inside the existing TEAM coach
dashboard, initially for allowlisted authenticated coaches.

### 5. Coach authorization and ownership

**Recommendation:** server-owned active TEAM entitlement plus coach role, team
ownership, and dedicated RLS. One owning coach and one team per draft for MVP.
Defer assistant-coach collaboration.

### 6. Coach editor and storage

**Recommendation:** top-down schematic editor with explicit hockey actions,
durations, freeze, options, and declared read. Store canonical drafts in
Supabase with optimistic hash/revision checks and immutable saved versions.
Use local autosave only for crash recovery.

### 7. Video export

**Recommendation:** isolated Remotion/Node worker consuming the exact compiled
artifact. First output: branded 1080p 16:9 MP4. Private storage and signed team
links. No anonymous public links in the MVP.

### 8. Claude scheduling

**Recommendation:** schedule deterministic/Ollama preparation only. Run Claude
judgment from an active supported session until Thomas explicitly approves and
the project proves a supported headless subscription-session handshake.

### 9. Manual graduation and legacy tools

**Recommendation:** treat the July 10 approval as question-kind UI
certification. Keep the three-play/all-band manual standard for new
kernels/templates. Freeze direct-write legacy generators, old editors, mutable
promoters, and the existing runner. Reuse isolated UX/validation ideas only.

Thomas can approve the full recommended set by saying:

`Approve 1-9`

Or he can name the numbers he wants changed.

## Current Git and Worktree State

Before this handoff commit:

- branch: `feature/shareable-beta`;
- ahead of `origin/feature/shareable-beta` by two documentation commits;
- no push occurred;
- HEAD: `f3472f9 docs: harden scenario engine contracts`.

Existing unrelated/uncommitted Claude work remains:

```text
 M src/play/playCatalog.js
 M src/play/playFamilies.js
?? docs/library/dz-breakout-retrieval-under-pressure.md
?? remotion/
?? src/play/plays/dzBreakoutEscapePressure.js
```

Do not use `git add .`, `git add -A`, reset, clean, or checkout these files.

The breakout work is a promising v1 prototype, not yet the physics authority.
Before adopting it:

1. record the exact source state and hashes;
2. verify the tactical source and approval status;
3. adapt it into the canonical scenario bundle;
4. create physically possible and deliberately impossible fixtures;
5. validate declared and derived reads;
6. pass player preview/manual playtest through the timing-faithful path.

## What Is Not Done

The following have not been implemented:

- scenario artifact schemas;
- coordinate adapters;
- physics profiles or simulator;
- physics tests and boundary fixtures;
- machine-readable tactical claims;
- tactics validator/index;
- immutable factory run store;
- Ollama adapter;
- Claude session handshake;
- judgment/calibration records;
- promotion policy;
- dependency recall;
- timing-faithful renderer;
- coach editor;
- protected draft storage;
- video exporter;
- safe scheduled runner;
- measured scale benchmark.

The documentation is the approved foundation, not proof that the engine exists.

## Recommended Next Sequence for Claude

Do not skip directly to mass generation.

### Step 0: Confirm owner choices

Ask Thomas to approve or modify choices 1-9 above.

If Thomas approves the recommendations, record them in the owner-decision file
and keep the canonical design aligned.

### Step 1: Fix immediate false-safety defects

Before using current reports as evidence:

- change kernel report/test consumption from `errors` to `errs`;
- add a deliberately invalid kernel fixture proving the validator gate fails;
- rerun the focused suites and regenerate the kernel report;
- do not mix this fix with the uncommitted breakout prototype.

### Step 2: Write the implementation plan

Create a reviewed plan under:

`docs/superpowers/plans/`

The plan should use test-driven vertical slices and cover, in order:

1. capture/hash the breakout prototype;
2. canonical artifact schemas and canonical serialization;
3. `RinkFrame` and presentation adapters;
4. sourced physics profiles;
5. deterministic Level-1 simulator and structured findings;
6. declared/derived read evaluation;
7. timing-faithful compiled playback;
8. machine-readable tactical claims and tests;
9. immutable run/events/dependencies;
10. Claude/Ollama boundaries and judgment records;
11. staged promotion and recall;
12. dedicated coach-authoring/export design;
13. protected coach MVP;
14. safe runner proof;
15. measured scale benchmark.

Do not implement before the plan is reviewed.

### Step 3: Prove one vertical slice

Use the defensive-zone breakout as the first manually assessed fixture only
after preserving its exact source.

Prove:

- identical seed/version inputs reproduce the same trace hash;
- one realistic version passes;
- impossible skating, passing, turning, and timing variants fail with measured
  explanations;
- the tactical answer remains justified;
- declared and derived reads agree;
- player preview, coach preview, and export use the same timing/trajectories;
- no generation step writes live content;
- one promotion can be recalled without collateral changes.

### Step 4: Design and build the coach MVP

After the shared compiler and first fixture work:

- write the dedicated coach authoring/video design;
- settle route, permissions, storage, rendering, export, sharing, and retention;
- build the minimal protected slice;
- keep unvalidated output private and visibly marked.

### Step 5: Prove the runner

Only after manual foundation success:

- build a new fail-closed orchestrator;
- prove preflight, lock, interruption, resume, idempotency, unavailable-Claude
  behavior, promotion safety, and recall;
- keep Windows scheduling disabled until Thomas approves enablement.

### Step 6: Run the scale benchmark

Only after the foundation and coach MVP acceptance gates pass:

- generate and validate one controlled family expansion;
- distinguish raw combinations, meaningful states, question variants,
  promotion-ready items, queue items, and rejections;
- publish measured yield without claiming hundreds/day until the full benchmark
  passes.

## Safety and Scope Rules

- Preserve current bank and scenario content.
- Never restore removed `questions.json` or `factoryQuestions.json`.
- Never generate directly into live app paths.
- Never let Claude or Ollama override a hard physics failure.
- Never let Ollama decide hockey correctness.
- Never let AI approve its own new tactical claim.
- Never treat a confidence number as proof.
- Never count mirror/prose/jitter clones as new scenario states.
- Never bypass manual calibration for new template classes.
- Never expose unvalidated coach output without an unavoidable draft marker.
- Never enable, push, deploy, publish, or create public links without Thomas's
  confirmation.

## Handoff Instruction

Start by reading the authority documents and inspecting the live worktree.
Present Thomas with any true contradiction between this handoff and current
code before changing architecture.

If choices 1-9 are approved, write the implementation plan. Do not resume the
old overnight script, do not edit the uncommitted breakout prototype before
hashing it, and do not start a bulk run.

The next success condition is not "hundreds of generated questions." It is one
source-backed breakout scenario that is reproducible, physically valid,
tactically justified, timing-faithful across player/coach/video output,
staged safely, and individually recallable.
