# Scenario Scale Blocker Diagnosis - 2026-09-04

## Scope

Diagnostic read-only pass requested by Thomas. This report diagnoses why RinkReads/IceIQ is not creating scenarios at scale and whether a Blender/glTF/react-three-fiber renderer would address that blocker.

No factory code or pipeline files were changed.

## Bottom Line

The blocker is not 3D rendering, and it is not a large review queue.

The real blocker is: the scenario-engine foundation exists, but the scale path is not finished/proven and the content ceiling is tactical-claim/template authoring. The old direct-write generation tools are intentionally frozen, the old overnight runner is retired, the compliant runner and throughput benchmark are still plan work, there is only one machine-readable approved tactical claim, and only one play kernel exists. That means the system can validate and record a small number of known fixtures, but it does not yet have a working, current, end-to-end path that turns many approved hockey ideas into many promotion-ready app scenarios.

If forced into the options in the prompt: this is closest to **(d) something else entirely**, with a narrower **(a) for the scale layer**. It is not "nothing was built"; Phases 0-6 were built. But the parts that would make scale real - scheduled-runner safety, parameter-space generation into `ScenarioDefinition`s, novelty/gate 5, question/visual gates, and honest throughput measurement - are not complete enough to support the "hundreds/day" claim.

## Evidence

### 1. The approved design required free-only, session-bound generation

The authoritative owner decision says the target was "hundreds of scenarios and questions a day" with limited input (`docs/factory/SCENARIO-ENGINE-DECISIONS.md:14-19`). It also explicitly forbids paid Anthropic/OpenAI generation or judgment APIs (`docs/factory/SCENARIO-ENGINE-DECISIONS.md:30-35`).

The approved split is:

- Claude Code session: hockey judgment, tactical correctness, pedagogy, final prose.
- Local Ollama: mechanical bulk work, screening, variation, dedupe.
- Ollama may never decide whether a hockey read is correct (`docs/factory/SCENARIO-ENGINE-DECISIONS.md:36-46`).

The same decision file is explicit that generation happens when a session runs, not as fake 24/7 unattended operation, and that any scheduled runner must fail closed without a supported Claude session (`docs/factory/SCENARIO-ENGINE-DECISIONS.md:48-55`).

### 2. Legacy generation/promotion tools exist, but their live-writing paths are frozen

The current decision doc freezes the direct-write legacy tools: `ScenarioEditor` force-save, `tools/seed-editor-plugin.mjs` force flag, `tools/review-store.mjs` direct `bank.json` writes, `tools/scenario-author.mjs` default live-seed writes, `scripts/generate-questions.mjs`, `scripts/batch-approve.mjs`, and the old `tools/scenario-engine-overnight.ps1` runner (`docs/factory/SCENARIO-ENGINE-DECISIONS.md:199-207`).

Current source confirms those freezes:

- `tools/scenario-author.mjs` still has a Claude-based authoring CLI and defaults to `src/scenario/seeds/<id>.json`, but the `new` write path calls `assertNotFrozen("tools/scenario-author.mjs")` before generating (`tools/scenario-author.mjs:1-19`, `tools/scenario-author.mjs:144-149`, `tools/scenario-author.mjs:209-212`).
- `tools/review-store.mjs` can still enqueue/edit queue items, but `approve()` is frozen because it writes directly into `bank.json` without a run record or recall path (`tools/review-store.mjs:30-39`, `tools/review-store.mjs:59-67`, `tools/review-store.mjs:76-85`).
- `tools/seed-editor-plugin.mjs` still defines a dev save route that would write `src/scenario/seeds/<id>.json`, but the POST save path now returns a frozen-tool lock before writing (`tools/seed-editor-plugin.mjs:1-10`, `tools/seed-editor-plugin.mjs:53-64`, `tools/seed-editor-plugin.mjs:82-84`).
- `scripts/generate-questions.mjs` is frozen before env, Supabase, or LLM work because it spent metered LLM calls and wrote directly into live seeds (`scripts/generate-questions.mjs:1-8`, `scripts/generate-questions.mjs:20-27`, `scripts/generate-questions.mjs:120-132`).
- `scripts/batch-approve.mjs` is frozen before it can move pending seeds into `src/scenario/seeds/`, because it overwrote same-ID destination files with no run record (`scripts/batch-approve.mjs:1-4`, `scripts/batch-approve.mjs:10-13`, `scripts/batch-approve.mjs:42-48`).
- `tools/scenario-engine-overnight.ps1` now hard-stops as retired, prints "Nothing ran," and points to `src/scenario-engine/factoryPipeline.js` plus `scripts/promote-scenario.mjs` instead (`tools/scenario-engine-overnight.ps1:4-29`, `tools/scenario-engine-overnight.ps1:48-76`). Its historical body shows why: it used `claude -p ... --dangerously-skip-permissions` in an unattended resume loop (`tools/scenario-engine-overnight.ps1:83-103`, `tools/scenario-engine-overnight.ps1:244-258`).

So the old tools are not the active scale answer. They mostly exist as legacy/proof tooling or read-only validators unless deliberately overridden by a human.

### 3. The replacement foundation is real, but it is not yet a complete scale factory

`src/scenario-engine/factoryPipeline.js` exists and sequences gates, but its header says gates 1-4 are real and gates 5-7 are recorded deferrals, not actual passes (`src/scenario-engine/factoryPipeline.js:1-29`). The deferred gates are novelty, question/age standards, and visual validation (`src/scenario-engine/factoryPipeline.js:38-51`).

The breakout demo proves the replacement foundation can run a small known path: Run A processed the real breakout scenario, four impossible variants, and a coach-declared two-on-one fixture; Run B reran the breakout scenario for reproducibility (`docs/factory/breakout-run-report.md:1-8`). That run proved deterministic trace/sample matching and specific physics failures (`docs/factory/breakout-run-report.md:20-34`). But the same report states gates 5-7 were explicitly deferred on every candidate (`docs/factory/breakout-run-report.md:40-48`).

The roadmap agrees with that reading: Phases 0-6 are shipped, but remaining phases are Phase 9 "compliant scheduled-runner proof" and Phase 10 "honest throughput benchmark"; autonomous overnight scaling stays disabled (`docs/roadmap/TASKS.md:18-23`).

The Phase 9/10 plan is even more direct: "there is no code path today that turns a family into a batch of validated `ScenarioDefinition`s" (`docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:115-119`). The ordered Phase 10 tasks still include creating `src/scenario-engine/generator/parameterSpace.js`, family-space generators, and the throughput benchmark runner (`docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:334-358`).

Current filesystem check confirms those planned pieces are absent today:

- `src/scenario-engine/runner/` - absent.
- `tools/scenario-engine-runner.mjs` - absent.
- `scripts/run-throughput-benchmark.mjs` - absent.
- `src/scenario-engine/generator/parameterSpace.js` - absent.

### 4. Review backlog is not the main bottleneck

Current seed inventory from the filesystem:

- Live root JSON files in `src/scenario/seeds/`: 28.
- Pending JSON files in `src/scenario/seeds/_pending/`: 2.
- Retired JSON files in `src/scenario/seeds/_retired/`: 4.

The two current pending files are both variants of the same `stemId`, `gvis_u11_decision-making_tufb`, not a large hidden queue (`src/scenario/seeds/_pending/gvis_u11_decision-making_tufb_mc_b.json:1-4`, `src/scenario/seeds/_pending/gvis_u11_decision-making_tufb_mc_b.json:109-114`; `src/scenario/seeds/_pending/gvis_u11_decision-making_tufb_truefalse_a.json:1-4`, `src/scenario/seeds/_pending/gvis_u11_decision-making_tufb_truefalse_a.json:99-104`).

The current promoted factory index contains only two promoted artifacts: one `dz_breakout` and one `two_on_one` (`docs/factory/promoted/index.json:1-18`).

There was a two-on-one ready tray from the kernel expansion report: 48 expanded, 48 validator-clean, 4 survived novelty (`docs/factory/kernel-expansion-report.md:7-21`). But the later gate-8 review did not leave a big approval backlog. It says the reviewed three-candidate batch was held, none of the three entered the catalog, and all three were rejected before manual playtest (`docs/factory/2026-07-30-kernel-batch-001-gate8-review.md:1-8`, `docs/factory/2026-07-30-kernel-batch-001-gate8-review.md:29-32`). The report also says promotion would require template-level fixes and another gate-8 pass, and that none of that was scheduled (`docs/factory/2026-07-30-kernel-batch-001-gate8-review.md:127-145`).

Conclusion: content is not mainly stuck in a giant tiered-review queue. There are a few pending/held items, but not enough to explain the stalled library. Generation/authoring throughput is the larger issue.

### 5. The strongest documented ceiling is tactical-claim and kernel/template coverage

The capability inventory says the animated play engine is real and productive, but narrow. On 2026-07-29 it counted 25 animated plays across seven families, with only `two_on_one` over target; six families were under target (`docs/factory/rinkreads-capability-inventory-2026-07-29.md:44-49`).

The same inventory says Ollama was "designed, not implemented" and that no code in `src/` or `tools/` called Ollama as of that inventory (`docs/factory/rinkreads-capability-inventory-2026-07-29.md:160-168`).

The family progression audit identifies the repeat pattern:

- Kernel coverage is absent for six of seven families; only `twoOnOneKernel.js` exists (`docs/factory/family-progression-audit-2026-07-29.md:179-180`).
- The ladder/progression check fails in every family; no family has a genuinely open, multiple-viable-read variant (`docs/factory/family-progression-audit-2026-07-29.md:181-182`).
- Live reps and mistake-mechanism feedback are generally good where content exists, so the issue is not that every authored scenario is poor (`docs/factory/family-progression-audit-2026-07-29.md:183-185`).
- Teaching-arc text often describes steps that have no implemented play behind them (`docs/factory/family-progression-audit-2026-07-29.md:185-187`).

The Phase 9/10 plan states the same blocker plainly. D1 and D6 together mean the overnight runner can only prepare candidates from tactical claims a human wrote first; the plan explicitly says the bottleneck is claim authoring, not compute (`docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:38-64`). It also says exactly one machine-readable approved tactical claim exists today and that reaching 200 distinct states likely requires many more human-approved claims (`docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:80-82`, `docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:369-385`).

Current filesystem check matches that: `docs/factory/tactics/claims/` contains one claim file, `claim_dz_breakout_retrieval_escape_pressure_v1.json`, and `src/play/kernels/` contains one kernel file, `twoOnOneKernel.js`.

## Bottleneck Classification

### (a) Factory pipeline designed but never fully built

Partly true, but too broad if stated alone.

The foundation was built: schemas, physics profiles, deterministic simulator, decision evaluation, compiled playback, run envelope, state machine, judgment records, promotion artifacts, recall, and tests are present, and the roadmap records Phases 0-6 shipped (`docs/roadmap/TASKS.md:18-23`).

But the scale components are not complete: gates 5-7 are deferred, gate 8 is attended-only, the compliant runner and throughput benchmark are still plan work, and the parameter-space generator into validated `ScenarioDefinition`s is missing (`src/scenario-engine/factoryPipeline.js:1-29`, `src/scenario-engine/gate8BlindSecondPass.js:18-21`, `docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:115-119`, `docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:334-358`).

### (b) Built but requires an attended Claude session per batch

Partly true, but not the whole bottleneck.

The design intentionally requires an attended Claude Code session for hockey judgment, and gate 8 has no headless/API-key path (`docs/factory/SCENARIO-ENGINE-DECISIONS.md:48-55`, `src/scenario-engine/gate8BlindSecondPass.js:18-21`). That limits fully promotion-ready throughput.

But the more basic issue is that the current scale generator/runner/benchmark path is not present, and the tactical-claim/template supply is tiny. So this is not merely "someone forgot to run the batch."

### (c) Generated content stuck in tiered review

Mostly false.

There are only two current pending seed files under `src/scenario/seeds/_pending/`, only two promoted factory artifacts, and the known three-candidate kernel batch was rejected/held rather than sitting approved but unpromoted (`docs/factory/promoted/index.json:1-18`, `docs/factory/2026-07-30-kernel-batch-001-gate8-review.md:1-8`, `docs/factory/2026-07-30-kernel-batch-001-gate8-review.md:29-32`).

### (d) Something else

Yes.

The practical blocker is **approved hockey-idea throughput**: machine-readable tactical claims, load-bearing kernel/template axes, and complete question-kind copy that can survive gates. The code foundation can validate and record known examples, but there is not enough approved tactical material or generator/template coverage to feed it at scale. The plan itself says the real throughput ceiling is very likely claim authoring, not compute (`docs/superpowers/plans/2026-08-03-scenario-engine-phase-9-10-plan.md:381-387`).

## Blender / 3D Assessment

A Blender-modeled rink exported as glTF and rendered with react-three-fiber would not address the identified bottleneck.

The current scenario system is already renderer-capable enough for the bottleneck at hand:

- `RinkStage.jsx` wraps the existing `RinkReadsRink` with a normalized-coordinate SVG overlay for actors and primitive interactions (`src/scenario/RinkStage.jsx:1-6`, `src/scenario/RinkStage.jsx:234-240`, `src/scenario/RinkStage.jsx:355-413`).
- `RinkReadsRink.jsx` renders the rink as an SVG with a viewBox, sanitized overlays/markers/lines, and age-aware half-ice handling (`src/RinkReadsRink.jsx:449-512`, `src/RinkReadsRink.jsx:616-620`).
- The capability inventory describes both the animated play renderer and the older static-board renderer/editor as real production or proven-narrow surfaces (`docs/factory/rinkreads-capability-inventory-2026-07-29.md:23-42`, `docs/factory/rinkreads-capability-inventory-2026-07-29.md:51-64`).

The approved architecture is also deliberately renderer-independent: `ScenarioDefinition` is the immutable authoring/generation input, and `CompiledTeachingPlay` is the artifact consumed by player preview, coach preview, and video export (`docs/superpowers/specs/2026-07-29-scenario-engine-design.md:131-143`, `docs/superpowers/specs/2026-07-29-scenario-engine-design.md:169-183`).

The spec does acknowledge renderer/timing fidelity matters. The current animated-play renderer is called a "lossy target" and must either gain a deterministic keyframe/duration contract or consume `CompiledTeachingPlay` directly before preview/export parity can be claimed (`docs/superpowers/specs/2026-07-29-scenario-engine-design.md:177-183`). But that is a playback/export fidelity issue, not the reason hundreds of scenarios are not being authored.

The spec is explicit that a later higher-fidelity real-time dynamics runtime is separate and that the scenario factory must not wait for it (`docs/superpowers/specs/2026-07-29-scenario-engine-design.md:372-378`). A Blender/Three pipeline is closer to that visualization/runtime category than to the missing tactical-claim/kernel/generator work.

Near-term, a 3D renderer would likely add work:

- build and maintain a Blender asset pipeline;
- map current 2D rink coordinates and semantic zones into 3D world coordinates;
- project taps/clicks back into 2D scoring space;
- preserve accessibility, mobile readability, and "one visible cue" discipline;
- re-run visual QA for every question type;
- add new dependencies not currently present in `package.json` (`package.json:108-117`).

None of those tasks creates new approved tactical claims, new load-bearing kernel axes, or new promotion-ready question copy.

## Recommendation

Do one thing first: **run a small, honest Phase 10-style measurement against the current single approved claim and one existing kernel/template path, and record two numbers: hours per approved tactical claim and distinct states yielded per approved claim.**

That is the highest-leverage unblock because the current evidence says the scale ceiling is probably claim/template authoring, not rendering or compute. The next build work should be the smallest path that turns an approved tactical claim plus declared load-bearing parameter axes into validated `ScenarioDefinition`s and a benchmark report, without pretending deferred gates passed.

Blender/3D should be shelved near-term. Revisit it only after the 2D/top-down factory can reliably produce and promote scenario content. At most, 3D belongs later as a presentation/video-export layer, not as the scenario-creation scale solution.
