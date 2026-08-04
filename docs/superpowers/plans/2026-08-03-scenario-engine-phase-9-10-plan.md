# Scenario Engine — Phase 9 (compliant scheduled-runner proof) and Phase 10 (honest throughput benchmark)

**Date:** 2026-08-03
**Status:** Implementation plan, written for review. Nothing here is authorized until Thomas reviews the decisions table below.
**Canonical spec:** `docs/superpowers/specs/2026-07-29-scenario-engine-design.md`
**Owner authority:** `docs/factory/SCENARIO-ENGINE-DECISIONS.md`
**Predecessor plan:** `docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md` (Phases 0-10; Phases 0-6 shipped, 7-8 parked, 9-10 sketched in about 60 lines each). This document replaces those two sketches with the real plan.
**Why now:** the validated-motion/played-motion defect closed today (`22e49ac`, plus the acceleration half already closed 2026-08-01). `docs/roadmap/TASKS.md` records both halves closed and both phases unblocked.

---

## Hard constraints (restated, because they bind every task below)

1. **The Windows scheduled task stays `Disabled` for the whole of both phases.** Verified 2026-08-03: `RinkReads-ScenarioEngine-Overnight`, `State: Disabled`, `Settings.Enabled: False`, trigger 22:00 daily. Enabling it is a separate decision this plan does not make and does not recommend making at the end of Phase 9.
2. **No step spends money without explicit approval.** Exactly one gate genuinely requires paid API spend: gate 5 (novelty / Semantic Sibling Review). The free alternative is laid out in Decision D2 and in the Phase 10 task list. Everything else in both phases runs on local compute plus an attended Claude Code session.
3. **No gate may be weakened to make a benchmark pass.** If the benchmark cannot clear the spec's bar, the report says so and states the shortfall. That is the expected outcome, not a failure of the plan. See "Stated uncertainty".
4. **Nothing is pushed, deployed, published, or written into live app content.** `src/data/bank.json`, `src/play/playCatalog.js`, and `src/play/playFamilies.js` are never touched by either phase. `scripts/promote-scenario.mjs` already enforces this by generating a reviewable report instead of editing those files.

---

## Decisions that need Thomas (read this section, skip the rest if short on time)

These are open questions the plan cannot answer for him. Each row states the default the plan will follow if he says nothing, so silence is safe but not silent.

| # | Decision | Why the plan cannot decide it | Default if unanswered |
|---|---|---|---|
| **D1** | Does a headless `claude` CLI invocation count as "a supported Claude session" for gate 8 judgment? | The 2026-07-29 handoff flagged this as pending owner choice 8 and it was never answered. `src/scenario-engine/gate8BlindSecondPass.js`'s header states flatly that both passes "MUST be invoked from an attended Claude Code session... this module has no headless/API-key path and is not meant to run in CI." A runner that could judge headlessly is a materially different product than one that cannot. | **No.** The runner does deterministic and local-model preparation only; every candidate stops at `staged` and waits for an attended session. This is also the handoff's own recommendation. |
| **D2** | Gate 5 (novelty / SSR): authorize paid Claude API spend, run it attended in-session per batch, or leave it deferred through Phase 10? | `src/scenario-engine/factoryPipeline.js` records gate 5 as DEFERRED because its design doc requires spend that is "explicitly marked not authorized." But the benchmark is required to "publish the signature distribution and all thresholds," and novelty is the whole point of "meaningfully distinct". A benchmark with gate 5 still deferred reports a number the spec does not accept. | **Attended, in-session, free.** SSR batches at ~40 candidates per call, so a 48-candidate family is 2 calls; that is tractable inside a normal Claude Code session with Thomas present. Cost: it consumes hands-on human minutes, which then land in the benchmark denominator, which is correct and is the point. |
| **D3** | Adopt `src/play/noveltyGate.js`'s existing `answerSignature()` as the versioned novelty signature, or build the one the spec describes? | The spec requires a signature "covering tactical claim, decision/cue topology, answer, and minimum geometry/time distance." `answerSignature()` is `correct-option-id : vertical-third-band`, which has no claim dimension and no time dimension. This was flagged as Judgment Call 3 in the foundation plan and never resolved. | **Build the spec's version, `novelty-signature-v1`, in Phase 10 Task 2.** Keep `answerSignature()` untouched as the free geometric backstop it already is. |
| **D4** | What counts as one "promotion-ready question item"? | `scripts/promote-scenario.mjs`'s own `buildCatalogDiffReport` states that "the per-option copy, icons, and wrong-answer text a real catalog play needs are outside `CompiledTeachingPlay`'s schema and require human authoring." So an engine artifact that clears every gate is still not an app-ready question. Counting them as such would be the single largest dishonesty available in Phase 10. | **A promotion-ready item is one that has cleared gates 1-9 AND carries complete `questionKindVariants` copy.** The benchmark reports the two counts separately so the gap is visible rather than papered over. |
| **D5** | Do sibling definitions across age profiles count as distinct scenario states? | Six profiles exist (`u7` through `u18`). One geometry re-targeted at six profiles produces six `ScenarioDefinition`s that the spec explicitly requires to be separate artifacts, and they genuinely validate independently. Whether they are six *teaching states* is a hockey question, not an engineering one. | **No.** Age siblings count once in the "meaningfully distinct scenario states" line and are reported separately as an age-coverage multiplier. Counting them would let one authored idea become six with zero new teaching. |
| **D6** | How many families does the benchmark run against, and who authors their tactical claims? | Exactly one machine-readable approved claim exists today (`docs/factory/tactics/claims/claim_dz_breakout_retrieval_escape_pressure_v1.json`). The spec forbids Claude from approving its own tactical claims. Reaching 200 distinct states almost certainly needs many more claims, and every one of them needs Thomas or a named coach. | **The benchmark runs against whatever claims exist when it starts, and reports the shortfall honestly.** No claim gets auto-approved to inflate the number. |
| **D7** | What happens to the registered Windows task at the end of Phase 9? | Three defensible options: leave it Disabled and pointed at the now-frozen old script (fails loudly if ever run, which is arguably a feature), repoint it at the new runner while leaving it Disabled, or unregister it. Only Thomas should decide which risk he prefers. | **Leave it Disabled, pointed at the old script, with the old script frozen so it refuses to run.** No task registration is touched at all. |
| **D8** | Who signs gate 10 (the app / manual-playtest gate) for benchmark items, and at what granularity? | The spec makes gate 10 "required tests and the relevant manual playtest pass before catalog release" and keeps a three-play manual standard until a template class graduates. At 200 items that is not a per-item human pass. The graduation path exists but no template class has graduated. | **Per template class, sampled per the spec's own audit rule** (all items under 60, otherwise the greater of 60 or 10 percent). The benchmark reports gate 10 as unsatisfied for everything outside the sample, rather than claiming it. |

---

## State of play — three things a reader coming back after a month will get wrong

Verified against the working tree on 2026-08-03. `npm run test:scenario-engine` is green (24 test files, all passing, run just now). The scenario-engine code is present on the currently checked-out branch, `main`; `docs/roadmap/TASKS.md` still describes the working branch as `feature/shareable-beta`, which is stale.

### 1. Four of the ten gates are real. Three are recorded DEFERRED. Three are outside the pipeline entirely.

`src/scenario-engine/factoryPipeline.js` exports `runCandidateThroughGates1to7`. The name overstates it. Here is what actually runs:

| Gate | Spec name | Status in code | Evidence |
|---|---|---|---|
| 1 | Environment and provenance | **Implemented.** Checks `engineCommit`, `branch`, and a non-empty `versions` map on the run manifest. | `runGate1Environment` |
| 2 | Schema and domain | **Implemented.** Full `validateScenarioDefinition`. | `runGate2Schema` |
| 3 | Physics | **Implemented.** Real Level-1 simulate, writes the full trace as a content-addressed blob, fails on hard findings. | `runGate3Physics`, `src/scenario-engine/physics/simulator.js` |
| 4 | Tactical invariants | **Implemented.** `evaluateDecision` then `compareDeclaredToDerived`; anything other than `agree` stops the candidate. | `runGate4Tactical` |
| 5 | Novelty | **DEFERRED, on the record.** Emits a `gate-skipped` event with the reason: the Semantic Sibling Review design "requires real Claude API spend and is explicitly unauthorized." | `DEFERRED_GATES[0]`, `recordDeferredGates` |
| 6 | Question and age standards | **DEFERRED, on the record.** No `ScenarioDefinition`-shaped validator exists. | `DEFERRED_GATES[1]` |
| 7 | Visual validation | **DEFERRED, on the record.** Same reason. | `DEFERRED_GATES[2]` |
| 8 | Claude judgment | **Partially built, and attended-only.** `gate8BlindSecondPass.js` implements the two-pass combination rule and `judgmentRecord.js` implements the record format with a mechanically enforced auto-promotion invariant. Neither can run unattended: the module's header says so explicitly. | `gate8BlindSecondPass.js` lines 19-21 |
| 9 | Promotion policy | **A policy document plus one enforced invariant, not a general enforcement module.** `docs/factory/scenario-promotion-policy.json` holds the calibration bar. The only code that reads it is `scripts/run-phase6-state-machine-demo.mjs`. The one invariant that *is* mechanically enforced everywhere is `judgmentRecord.js`'s rule that incomplete metadata forces `autoPromotionEligible: false`. | grep for `scenario-promotion-policy`: two hits, both the demo script |
| 10 | App gate | **Not wired into the engine at all.** The engine pipeline stops at compilation. `scripts/promote-scenario.mjs` writes a promoted-artifact record and a reviewable catalog-diff report; applying it is a separate human step. Inference: gate 10 today means the pre-existing `check:bulk` / three-play manual playtest standard, which is a legacy-path process, not an engine step. | `promotedArtifact.js` header, `promote-scenario.mjs` header |

The important, easily-missed part: the deferrals are **honest, not silent**. Every candidate's own `events.jsonl` carries three `gate-skipped` records with reasons. A run that reports "clean" while gates 5-7 are deferred is not lying to you if you read the event log, and is lying to you if you read only a summary. Phase 10's report format has to make this impossible to misread. See dishonesty mode DM-2.

### 2. The engine path has no parametric generator, and the 48 → 4 baseline did not come from it

Two separate things are being conflated whenever someone says "the engine produces 48 candidates and 4 survive."

**What the engine actually does today:** `runCandidateThroughGates1to7` takes exactly one hand-authored `ScenarioDefinition` at a time. `scripts/run-breakout-factory-demo.mjs` feeds it six of them: the real breakout, four deliberately-impossible variants, and one coach-declared two-on-one fixture. All six are hand-written JavaScript objects. `startRun()` accepts a `parameterSpace` argument and records it in the manifest, but nothing in `src/scenario-engine/` ever generates from one. Grep for `parameterSpace` in the engine returns two hits, both inside `factoryRun.js`, both just storing the value.

**Where 48 → 4 came from:** `scripts/report-kernel-expansion.mjs`, which calls `expandTwoOnOneFamily()` from `src/play/kernels/twoOnOneKernel.js`, validates with `validateAnimatedPlay` + `validateFactoryStandards` + `artLint`, and filters with `src/play/noveltyGate.js`. That is the **legacy animated-play path**: 200x85-foot presentation coordinates, no metres, no seconds, no simulator, no `RinkFrame`, no `SimulationTrace`. The current `docs/factory/kernel-expansion-report.md` reads 48 candidates, 48 validator-clean, 4 novel survivors. Those 48 objects have never been near the validated physics.

And the 48 is itself soft. `expandTwoOnOneFamily` iterates 2 commits x 3 depths x 2 shapes x 2 mirrors x 2 seeds = 48. Mirror is a reflection and seed drives a plus-or-minus-2-foot jitter that the kernel's own comment calls "non-load-bearing only." Strip both and the family's real parameter space is **2 x 3 x 2 = 12 combinations**. The novelty gate then found 4 of those 12 genuinely distinct against the live catalog. That is the honest baseline, and it is the arithmetic that drives the whole "Stated uncertainty" section below.

Consequence for Phase 10: **there is no code path today that turns a family into a batch of validated `ScenarioDefinition`s.** Building one is a Phase 10 prerequisite (Task 1), not something the benchmark can assume.

### 3. The registered scheduled task points at the old, non-compliant script

Verified live today:

```
TaskName : RinkReads-ScenarioEngine-Overnight
State    : Disabled
Action   : powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\mtsli\IceIQ\tools\scenario-engine-overnight.ps1"
Trigger  : daily 22:00, StartBoundary 2026-07-29T22:00:00-06:00
Settings.Enabled : False
```

`tools/scenario-engine-overnight.ps1` is the script the 2026-07-29 audit said not to patch around: `--dangerously-skip-permissions`, works in the live repo rather than an isolated recorded source state, a mutable DONE sentinel, resume via global `--continue`, no run envelope, no lock, no handshake, no preflight, no timeout, no idempotent promotion, and a prompt that instructs Claude to update its own learned knowledge. It also still contains the whole original overnight build prompt, which asks for "hundreds of scenarios and questions a day" as a definition of done. That prompt is the thing the entire foundation design exists to replace.

Partial good news the reader should not miss: **the legacy-freeze work is already 5/6 done.** `tools/lib/frozen-tools.mjs` exists and `assertNotFrozen` is wired into `tools/seed-editor-plugin.mjs` (the save endpoint, which is what `ScenarioEditor`'s Force save button actually posts to, so the UI button is a dead control rather than a live hazard), `tools/review-store.mjs`, `tools/scenario-author.mjs`, `scripts/generate-questions.mjs`, and `scripts/batch-approve.mjs`. Each refuses to run and prints where the job lives now, with `RINKREADS_ALLOW_FROZEN=1` as a deliberate human override.

The one that is **not** guarded is `tools/scenario-engine-overnight.ps1` itself. It has no freeze, no `exit 1`, nothing. If that task were ever enabled, or if anyone ran the script by hand, it would do exactly what it did in July. Phase 9 Task 1 closes that.

---

## Phase 9 — compliant scheduled-runner proof

**Goal:** build a runner that satisfies every bullet of the spec's "Scheduled runner boundary," and prove every one of those properties without enabling anything, without a real overnight run, and without a Claude session being present.

### The design principle that makes this provable

> The runner is a **dependency-injected library function first and a CLI second.**

A runner written as a PowerShell script or a top-level `main()` can only be tested by running it, and running it overnight is the exact thing this phase is not allowed to do. A runner written as `runFactoryBatch(config, ports)` where `ports` is a bag of injected collaborators can be tested by calling it with fakes, in a unit test, in milliseconds, with the scheduled task untouched and no Claude session required.

The injected ports (`ports` object, all required, no defaults, so a caller can never accidentally get the real one):

| Port | Real implementation | Fake used in proofs |
|---|---|---|
| `clock` | `Date.now` | fixed / advanceable clock |
| `runStore` | `factoryRun.js` (`startRun`, `appendEvent`, `writeBlob`, `finishRun`, `resumeRun`) | same module, pointed at a temp dir |
| `lock` | `acquireLock` / `releaseLock` | a fake that can be pre-held to simulate contention |
| `sourceState` | `getGitInfo`-equivalent reader | a fake returning clean / dirty trees on demand |
| `preflight` | real disk, dependency, config, Ollama, destination probes | fakes that fail one probe at a time |
| `claudeSession` | handshake against an attended session | fakes returning available / unavailable / partial-metadata |
| `ollama` | HTTP probe at `localhost:11434` | fake returning up / down |
| `promoter` | `scripts/promote-scenario.mjs`'s `promoteScenario` | a recording fake that counts invocations |
| `pipeline` | `runCandidateThroughGates1to7` | a fake that can be made to hang (for timeouts) or throw |
| `publisher` | **there is no real one** | a fake that records any attempt, so a test can assert zero attempts |

The last row is the trick worth keeping. To prove "never push, deploy, or publish," inject a publisher port that the production wiring never populates and that the proof populates with a spy. Any call is a test failure. This proves the negative without needing to trust a code review.

### Property-by-property proof table

Every property below is quoted from the spec's "Scheduled runner boundary," "Failure behavior," or "Acceptance gates before scaling" sections. None of them require the scheduled task to be enabled.

| # | Spec requirement (quoted) | How it is proven without enabling anything | Acceptance check |
|---|---|---|---|
| P1 | "take a single-instance lock and create the immutable run envelope first" | Call `runFactoryBatch` with a fake lock that records call order against the `runStore.startRun` call. Assert lock precedes candidate creation. Note `startRun` already acquires the lock internally *after* creating the run dir but *before* writing `start.json`; the proof asserts against real observed order, not assumed order. | Ordered call log: `mkdir` -> `acquireLock` -> `start.json` -> first candidate event. Zero candidate events before `start.json` exists on disk. |
| P2 | second instance must not proceed | Pre-create `run.lock` in the temp run dir, then call the runner. `acquireLock` throws EEXIST with the holder's pid/hostname. | The runner exits non-zero, appends no events, and the error names the existing holder. |
| P3 | "use an isolated recorded source state" | Fake `sourceState` returns a dirty tree with a known `dirtyDiffHash`. Assert the value lands in `start.json` verbatim and that a promotion attempt from a dirty tree refuses. | `start.json.workingTree.clean === false`, `dirtyDiffHash` present; the promoter fake records zero calls. |
| P4 | "run dependency, disk, configuration, Ollama, and destination preflights" | Five separate proofs, each with exactly one probe failing and the other four passing. | For each: the runner stops before any candidate work, and the failing probe's name appears in the recorded reason. A run that fails preflight still has a `start.json` (evidence is preserved) but no candidate events. |
| P5 | "require a supported Claude-session handshake for judgment" | Fake `claudeSession` returns unavailable. The runner must still run gates 1-4 (they need no session) and must not attempt gate 8. | Gate 1-4 events present; zero gate-8 events; a recorded `judgment-unavailable` event naming the handshake result. |
| P6 | "record the available session/model/tool metadata" | Fake returns partial metadata (`model: null`). Build a judgment record from it. | `judgmentRecord.js` already forces `metadataComplete: false` and `autoPromotionEligible: false` mechanically and its validator rejects a record that claims otherwise. The proof asserts the runner never overrides this. |
| P7 | "stop or leave candidates staged when Claude is unavailable" | Same fake as P5, run to completion. | Every candidate's terminal state is `staged`. Zero transitions to `promoted`. `stateMachine.js`'s legal-transition graph is checked globally across all run dirs, so this cannot be bypassed by starting a new run. |
| P8 | "enforce timeouts" | Fake `pipeline` that never resolves. Injected `clock` advances past the configured bound. | The runner aborts the candidate with a recorded timeout reason, releases the lock, and writes `end.json`. No partial promotion. |
| P9 | "resumable checkpoints" | Run with a fake pipeline that throws on candidate 3 of 5. Then resume the same `runId`. | `resumeRun` reacquires the lock; candidates 1-2 are not re-run (`findGateEvent` short-circuits them and returns the cached result); candidates 3-5 complete. Total gate events for candidates 1-2 stay at their first-attempt count. |
| P10 | "idempotent promotion" | Call the promoter fake twice with identical content, then once with changed content. | First call writes; second is a no-op (`writePromotedArtifact` returns `wrote: false`, matched by `recordHash`); third throws rather than overwriting. This behaviour is already implemented and unit-tested in `promotedArtifact.test.mjs`; the Phase 9 proof asserts the *runner* preserves it. |
| P11 | "never substitute Ollama as hockey authority" | Fake `ollama` returns a confident hockey verdict for every call. Fake `claudeSession` unavailable. | Zero judgment records with `provider` naming Ollama; `judgmentRecord.js`'s validator has no Ollama-shaped path; candidates remain `staged`. The proof asserts the runner has no code path from an Ollama response to a gate-4 or gate-8 outcome. |
| P12 | "never push, deploy, publish, or bypass the manual enable switch" | Spy `publisher` port (see above). Full happy-path run with everything available. | Spy records zero calls. Additionally: a grep-based test asserts the runner source contains no `git push`, no `vercel`, no `Enable-ScheduledTask`, and no `Register-ScheduledTask`. |
| P13 | "a failed run preserves its evidence and stops at the failing gate" | Fake physics profile that makes gate 3 hard-fail. | `events.jsonl` retains the `gate-failed` record with `hardFailureCodes`, the trace blob is still on disk and readable, and no gate-4 event was appended. |
| P14 | Acceptance gate: "the disabled scheduled runner can pass preflight, abort safely without Claude, and resume without duplicate promotion" | Single end-to-end proof composing P4 (all probes pass), P5/P7 (no Claude), P9/P10 (interrupt, resume, promote once). | One test file that runs the composed scenario and asserts the promoted index contains exactly one entry for the artifact afterwards. |
| P15 | The Windows task is untouched | Assert before and after the phase. | `Get-ScheduledTask -TaskName 'RinkReads-ScenarioEngine-Overnight'` still reports `State: Disabled`, and the action string is byte-identical to the one recorded in this document. |

Two properties in the spec's list are **not** provable in Phase 9 and are called out rather than faked:

- **"Generation may run in a dirty working tree for exploration only if its output is isolated."** P3 proves the refusal-to-promote half. Proving the isolation half properly needs a run against a genuinely separate checkout, which is Phase 10 Task 5's job (the benchmark run itself should use a clean recorded state).
- **The manual enable switch itself.** There is no switch yet, because there is nothing to enable. Phase 9 Task 6 adds one (an explicit config flag defaulting to off, checked at the top of the CLI entry point) so that the property has something to guard, and proves the CLI refuses to do anything when it is off.

### Phase 9 ordered tasks

**Task 9.1 — Freeze the old runner.**
Add a top-of-script guard to `tools/scenario-engine-overnight.ps1` that prints the same message shape as `tools/lib/frozen-tools.mjs` and exits 1 unless `$env:RINKREADS_ALLOW_FROZEN` is set. Add a matching entry to the `FROZEN` map in `tools/lib/frozen-tools.mjs` (as documentation of the sixth frozen tool, even though PowerShell cannot import it) naming what it did and where the job lives now.
*Files:* `tools/scenario-engine-overnight.ps1` (modify, ~15 lines at top), `tools/lib/frozen-tools.mjs` (modify, one map entry).
*Acceptance:* running the script by hand prints the freeze message and exits 1; `RINKREADS_ALLOW_FROZEN=1` still lets a human run it deliberately; the scheduled task is not modified.

**Task 9.2 — Write the port contract.**
Define the `ports` shape and a `makeRealPorts()` factory. No behaviour yet. This is the seam every later task depends on, so it lands first and alone.
*Files:* `src/scenario-engine/runner/ports.js` (create).
*Acceptance:* `makeRealPorts()` returns an object with every key in the table above; `runFactoryBatch` (next task) throws a named error if any port is missing, so a caller can never silently get a partial bag.

**Task 9.3 — Build `runFactoryBatch(config, ports)`.**
The whole orchestrator as one pure-ish library function: preflight, envelope, per-candidate loop through `runCandidateThroughGates1to7`, gate-8 handshake attempt, state transitions, promotion, `finishRun`. No `process.argv`, no `console.log` as control flow, no direct `fs` outside the injected `runStore`.
*Files:* `src/scenario-engine/runner/runFactoryBatch.js` (create).
*Acceptance:* `npm run test:scenario-engine` still green; the new module imports nothing from `node:child_process` and nothing from `tools/`.

**Task 9.4 — Prove P1 through P13 with fakes.**
One test file, one describe-block per property, each named with its P-number so the table above stays traceable.
*Files:* `src/scenario-engine/runner/runFactoryBatch.test.mjs` (create), fakes in `src/scenario-engine/runner/fakes.js` (create).
*Acceptance:* every P1-P13 row has a passing assertion; the file is added to the `test:scenario-engine` chain in `package.json`.

**Task 9.5 — Prove P14 (the composed acceptance gate).**
The interrupt-resume-promote-once scenario end to end against a temp run root.
*Files:* `src/scenario-engine/runner/resumeIdempotency.test.mjs` (create).
*Acceptance:* after the composed run, the regenerated promoted index has exactly one entry for the artifact, and the artifact's global state history contains exactly one `promoted` transition.

**Task 9.6 — CLI entry point plus the manual enable switch.**
A thin `tools/scenario-engine-runner.mjs` that parses arguments, builds real ports, checks an explicit enable flag (default off, read from a config file, never from an environment variable alone), and calls `runFactoryBatch`. It is a shell, not logic.
*Files:* `tools/scenario-engine-runner.mjs` (create), `docs/factory/runner-config.json` (create, with the enable flag set to `false`).
*Acceptance:* invoked with the flag off, it prints why it did nothing and exits 0 without creating a run directory. Invoked with the flag on and `--dry-run`, it completes a real local run against the breakout fixture with the scheduled task still Disabled.

**Task 9.7 — Re-verify the scheduled task and record it.**
*Files:* none (a verification step whose output goes in the Phase 9 completion note).
*Acceptance:* P15 holds; the recorded action string matches this document.

**Phase 9 exit gate:** P1-P15 all demonstrated. The old script refuses to run. The Windows task is still Disabled and still points where it pointed. Nothing was pushed, deployed, or published, and the publisher spy proves it rather than a reviewer asserting it.

---

## Phase 10 — the honest throughput benchmark

### What to measure, and in what unit

The spec's bar is absolute: at least 200 meaningfully distinct physics-clean scenario states and at least 200 promotion-ready question items, inside 24 elapsed hours, using no more than 60 minutes of hands-on human input during the run, with pre-run setup effort reported separately.

The benchmark should report that bar **and** a rate, and the rate's unit should be:

> **distinct, physics-clean, gate-8-judged scenario states per hands-on human hour.**

The argument for putting human time in the denominator:

1. **Gate 8 is attended by design.** `gate8BlindSecondPass.js` says so in its header, and D1's default keeps it that way. Two independent blind passes per candidate, run by a human-attended session, is the throughput ceiling for anything that reaches `promotion-ready`. A unit denominated in wall-clock hours hides that entirely: an overnight run that produces 500 staged candidates and zero judged ones would look like a triumph.
2. **The spec already implies it.** It caps hands-on input at 60 minutes and separately forbids folding setup into that budget. Those two rules only make sense if human time is the scarce resource being measured.
3. **Compute is free here and human attention is not.** The whole architecture is free-only local compute plus an attended session. Any unit denominated in CPU time or wall-clock is measuring the abundant input.
4. **It is the unit that makes the answer actionable.** If the rate is 4 states per human hour, the question "can we get to hundreds?" has a concrete answer (50 hours), and the follow-up question ("which step eats the hour?") has a concrete target.

Report the rate three ways so the bottleneck is visible rather than averaged away: states per human hour **during the run**, states per human hour **including setup**, and states per human hour **including claim authoring**. If the three numbers differ by an order of magnitude, that spread is the single most useful output of the whole benchmark.

### The full funnel the spec requires

Counted and reported separately, never rolled up into one headline:

1. Raw parameter combinations (before any de-duplication, before mirrors and seeds are stripped).
2. Load-bearing parameter combinations (after non-load-bearing axes are excluded, with the exclusion list published).
3. Validator-clean candidates (gates 1-4 passed).
4. Meaningfully distinct scenario states (gate 5 verdict, per `novelty-signature-v1`).
5. Question variants (derived from `questionKindVariants`; a state with three question kinds is one state and three variants).
6. Claude-approved items (gate 8, both blind passes agreeing).
7. Promotion-ready items (gates 1-9 clear AND complete question copy, per D4).
8. Manual-review items (anything routed to `review-required`, by cause).
9. Rejected items by gate (gate 3 physics, gate 4 tactical, gate 5 novelty, gate 8 judgment, each separately).
10. Recalled items.

Plus, per the spec's own list: hardware, runtime, models, model/session availability, every gate survival count, queue rate, warning rate, the novelty-signature distribution with all thresholds, false-rejection count, elapsed time, hands-on time, and pre-run human effort reported separately and not credited against the 60-minute budget.

Plus one line the spec does not name but this repo needs: **gates recorded as DEFERRED, with their reasons, printed in the report header rather than a footnote.**

---

## What would make Phase 10 dishonest

This is the most important section in this document. Every failure mode below flatters the result while breaking no rule that anyone wrote down. Each gets a design defence that is a mechanical check, not a promise to be careful.

**DM-1. Counting mirrors, seeds, and jitter as distinct states.**
*How it flatters:* `expandTwoOnOneFamily` already turns 12 real combinations into 48 by multiplying in a reflection and a plus-or-minus-2-foot jitter. Do that across four families and 200 arrives without a single new hockey idea. The spec names this exact failure: "A mirror, prose change, or non-load-bearing coordinate jitter does not count as a new scenario state."
*Defence:* the generator (Task 10.1) declares each axis as `loadBearing: true|false` in the family's own parameter-space definition, and the benchmark reports counts 1 and 2 separately, with the excluded axes listed by name. `novelty-signature-v1` (Task 10.2) has no mirror or seed dimension by construction, so two mirrored candidates produce the same signature and collide. The existing `noveltyGate.js` geometric backstop runs veto-only on top.
*Check:* an adversarial fixture, `mirrorsAndSeedsOnly`, that expands one combination into 16 pure mirror/seed clones. The benchmark must report 1 distinct state. A run reporting 16 fails the phase.

**DM-2. Reporting "clean" while gates 5, 6, and 7 are DEFERRED.**
*How it flatters:* "48 candidates, 48 validator-clean" is a true sentence today and means "passed the four gates we built." A reader hears "passed validation." The kernel-expansion report already carries this ambiguity, and `docs/roadmap/TASKS.md` already had to add a warning that the ready tray "remains evidence/staging, not proof that its candidates are physics-clean or promotion-ready."
*Defence:* the report never prints an unqualified "clean." Every count carries the gate set it cleared, written as an explicit gate list (`gates 1-4 pass, gates 5-7 deferred`). The report's first section is a deferred-gate table generated from `DEFERRED_GATES` at run time, so it cannot go stale relative to the code. If D2 lands as "attended SSR," gate 5 stops being deferred and the header changes automatically.
*Check:* a report-generator test asserting that no count label in the output contains the word "clean" without an adjacent gate list.

**DM-3. Warm caches or resumed runs inflating throughput.**
*How it flatters:* `writeBlob` is content-addressed and a genuine no-op on a repeat write. `findGateEvent` returns a cached gate result for any candidate that already ran in a resumed attempt. A second run over the same candidates therefore completes almost instantly and produces a full set of "passed" outcomes without doing any work. Timed naively, that is an infinite throughput rate.
*Defence:* the benchmark run must be a **fresh run ID against an empty run root**, and the report records `resumedFromPriorAttempt` (already returned by `runCandidateThroughGates1to7`) for every candidate. Any candidate with that flag set is excluded from the timing numerator and reported in its own line.
*Check:* the report asserts `resumedFromPriorAttempt === false` for 100 percent of counted candidates, and states the run root was empty at start (`listRuns()` length recorded before and after).

**DM-4. One fixture reused, so novelty is trivially satisfied.**
*How it flatters:* novelty is measured against a pool. Run one family against an empty pool and the first candidate is always novel. Run the same authored idea under six age profiles and each is "new" to a naive comparator. The current demo script runs the real breakout scenario through two independent runs to prove reproducibility, which is correct for that purpose and would be catastrophic if counted as two states.
*Defence:* the novelty pool is seeded with the **live catalog plus every artifact already in `docs/factory/promoted/`** before the benchmark starts, exactly the way `report-kernel-expansion.mjs` already seeds `filterNovel` with `ALL_ANIMATED_PLAYS`. Age siblings collapse to one state per D5. The benchmark reports the number of distinct source *definitions* alongside the number of distinct states, so a 200/1 ratio is visible on the face of the report.
*Check:* the report includes a `distinctSourceDefinitions` count and a `statesPerSourceDefinition` ratio. Any ratio above the family's declared `targetVariants` is flagged in the report itself.

**DM-5. Excluding the human judgment step from the denominator.**
*How it flatters:* if gate 8's two attended blind passes are treated as "review, not run time," a 20-hour unattended generation phase plus 15 hours of Thomas's judgment reports as 20 hours elapsed and 0 minutes hands-on. This is the single easiest way to make the spec's 60-minute cap appear satisfied.
*Defence:* hands-on time is defined as **every minute a human or an attended Claude session is required for the run to progress**, which explicitly includes both gate-8 blind passes, every gate-5 SSR batch call under D2, and every `review-required` resolution. The runner timestamps the start and end of each attended step in `events.jsonl`, so the denominator is computed from the event log rather than from anyone's recollection.
*Check:* the report derives hands-on minutes only from `attended-step-start` / `attended-step-end` event pairs. A run with zero attended events and a non-zero promotion count is a failed benchmark by definition, because promotion requires gate 8 and gate 8 requires attendance.

**DM-6. Folding setup time into the run.**
*How it flatters:* the run looks fast because the eight hours spent authoring the tactical claims, physics profiles, fixtures, and calibration data happened "before." The spec forbids this in as many words: setup "is not hidden inside or credited toward the 60-minute run budget."
*Defence:* a pre-run effort ledger (`docs/factory/benchmark-<date>-setup-ledger.md`) written *before* the run starts, listing each setup activity, who did it, and how long it took. The benchmark report reproduces the ledger's total in its headline block, adjacent to the run's own hands-on total, never summed with it.
*Check:* the report fails to generate if the setup ledger is missing or its total is zero. Zero setup is not a plausible value and should be treated as an unfilled form, not a fast start.

**DM-7. Counting unjudged candidates as promotion-ready.**
*How it flatters:* gates 1-4 are automated and fast. It is entirely possible to produce hundreds of `staged` candidates overnight. Calling those "promotion-ready" converts a compute result into a content result for free.
*Defence:* "promotion-ready" is defined per D4 as gates 1-9 clear plus complete question copy, and the state machine already makes `staged` and `promotion-eligible` distinct states with a checked transition graph. `judgmentRecord.js` already forces `autoPromotionEligible: false` on incomplete metadata, and the calibration bar in `docs/factory/scenario-promotion-policy.json` (50 reviewed decisions overall, 20 per template class, 20 percent holdout with at least 10 per class, zero wrong-answer false approvals) is not met by any template class today, so nothing can legitimately be auto-promotion-eligible in this benchmark at all.
*Check:* the report derives the promotion-ready count from `globalCurrentState()` per artifact, not from a local tally. Any artifact counted as promotion-ready without a valid judgment record with a matching `artifactHash` is a report-generation error, not a warning.

**DM-8. Treating an identity hash as proof of reproducibility.**
*How it flatters:* `canonicalTraceHash` is derived from definition ID, version, content hash, profile ID, and simulator version. It matches across two runs given the same inputs **regardless of whether the simulator actually produced the same output**. Citing it as reproducibility evidence proves that the inputs were the same, which nobody doubted.
*Defence:* this is already understood in the codebase and must not be lost. `scripts/run-breakout-factory-demo.mjs` calls it out directly: citing the identity hash "is decorative, not substantive (caught by Phase 5's adversarial review, 2026-07-31)." The substantive check is the gate-3 blob's `traceHash`, which is a content hash over the full trace including samples and findings, plus a direct sample-array comparison. The benchmark uses the same two checks and labels the identity hashes as identity hashes wherever it prints them.
*Check:* the benchmark's reproducibility section reports full-content trace hash equality and raw sample equality as the primary evidence, with identity hashes in a clearly-labelled secondary row, mirroring the existing `breakout-run-report.md` layout.

**DM-9 (additional). Age-profile fan-out.**
*How it flatters:* six physics profiles exist. One authored geometry becomes six validated definitions with no new hockey. The spec requires them to be separate artifacts, which makes the inflation feel principled.
*Defence:* D5's default. Age siblings count once in the states line and are reported as a separate coverage multiplier.
*Check:* the state count keys on the novelty signature, which has no profile dimension; profile coverage is its own reported column.

**DM-10 (additional). Judging with the session that generated.**
*How it flatters:* if gate 8's two "blind" passes are run inside the same context that just produced the candidate, agreement is nearly guaranteed and the agreement rate looks like a quality signal. `gate8BlindSecondPass.js`'s own header warns that agreement is "never treated as a confidence score or promotion evidence on its own."
*Defence:* the second pass must receive only the artifact and the rubric, with no visibility into the first pass's verdict or reasoning, and the judgment records must show distinct `sessionId` values. The report publishes the raw agree-pass / agree-fail / needs-human split so a suspiciously high agreement rate is visible rather than buried.
*Check:* a report assertion that no artifact has two judgment records sharing a `sessionId`.

**DM-11 (additional). Counting already-shipped content as engine output.**
*How it flatters:* the breakout fixture was adapted from a play that is already live in `src/play/playCatalog.js`. `promote-scenario.mjs` handles this correctly today, reporting that the promotion's job "is proving the factory pipeline validates and traces that ALREADY-SHIPPED content, not inserting a duplicate." A benchmark that counts it as new production would be counting the catalog twice.
*Defence:* the report separates `newlyProduced` from `validatedExisting` using `buildCatalogDiffReport`'s `alreadyLive` flag.
*Check:* every counted artifact carries an `alreadyLive` boolean; the headline count uses only `alreadyLive === false`.

### Phase 10 ordered tasks

**Task 10.1 — Build the parametric generator for the engine path.**
The missing piece named in state-of-play item 2: something that takes a family's parameter-space definition plus an approved tactical claim and emits validated `ScenarioDefinition`s in metres and seconds. Each axis declares `loadBearing`. This is real new code and it is the prerequisite for everything else in Phase 10.
*Files:* `src/scenario-engine/generator/parameterSpace.js` (create), `src/scenario-engine/generator/familySpaces/<family>.js` (create, one per benchmarked family), tests alongside.
*Acceptance:* generating from the `dz_breakout` space produces definitions that pass `validateScenarioDefinition` and reach compilation through the unmodified `runCandidateThroughGates1to7`; the `mirrorsAndSeedsOnly` adversarial fixture from DM-1 collapses to one state.

**Task 10.2 — Implement `novelty-signature-v1`.**
Per D3: tactical claim ID plus decision/cue topology plus derived answer plus a minimum geometry and time distance. Versioned, hashed, published with its thresholds.
*Files:* `src/scenario-engine/noveltySignature.js` (create), test alongside.
*Acceptance:* two mirrored candidates share a signature; two candidates whose correct read differs never do; the thresholds are constants in the module and are printed by the benchmark report.

**Task 10.3 — Wire gate 5 per D2.**
If attended SSR: `src/play/semanticNoveltyGate.js` per the FINAL viable design's section 6, with the free `filterNovel` backstop wired veto-only, and `attended-step-start` / `attended-step-end` events around each batch call. If deferred: leave `DEFERRED_GATES` untouched and let the report header say so. **This is the one step that would require paid API spend if Thomas chooses the API route instead. The free alternative is the attended in-session route, which costs human minutes rather than dollars, and those minutes correctly land in the benchmark denominator.**
*Files:* `src/play/semanticNoveltyGate.js` (create), `src/scenario-engine/factoryPipeline.js` (modify, gate 5 only).
*Acceptance:* the deferred-gate list shrinks by exactly one entry, and gate 5's verdicts appear as real events with attended-step timestamps.

**Task 10.4 — Build the benchmark report generator.**
Every count in the funnel, derived from the event log and the global state machine rather than from in-memory tallies, with the DM-1 through DM-11 checks implemented as assertions that fail report generation rather than as prose warnings.
*Files:* `scripts/run-throughput-benchmark.mjs` (create), `src/scenario-engine/benchmarkReport.js` (create), test alongside.
*Acceptance:* run against the existing six-candidate breakout demo data, the generator produces a report whose every number can be traced back to a specific event in a specific `events.jsonl`; every DM check is exercised by a fixture that should trip it.

**Task 10.5 — Write the setup ledger, then run the benchmark.**
Ledger first, before any generation, per DM-6. Then one controlled run, fresh run root, clean recorded source state, attended for gate 5 (if D2 says so) and gate 8, wall clock recorded.
*Files:* `docs/factory/benchmark-<date>-setup-ledger.md` (create), `docs/factory/benchmark-<date>.md` (create).
*Acceptance:* the report exists, the ledger is non-zero, and the report states plainly whether the spec's bar was met.

**Task 10.6 — Audit the promotion-ready cohort.**
Per the spec: all items if fewer than 60, otherwise a deterministic random sample of at least 60 or 10 percent, whichever is greater. Zero wrong-answer false approvals. Any wrong-answer false approval fails the benchmark outright, disables the affected auto-promotion class, and triggers dependency-based recall via `src/scenario-engine/recall.js`.
*Acceptance:* the sample is deterministic (seed recorded), the audit outcome is in the report, and a wrong-answer finding actually triggers the recall path rather than being noted.

**Phase 10 exit gate:** the report exists and is honest about whether the bar was met. If not met, it names the exact numbers that fell short and why, and no gate was weakened to move any of them.

---

## Stated uncertainty

Written plainly, because a plan that only states its confident parts is not a plan.

### Whether the spec's scale bar is reachable at all

The arithmetic is not encouraging, and it should be on the table before anyone spends a week on Phase 10.

**What is measured, not assumed:**
- `twoOnOneKernel.js`'s parameter space is 2 commits x 3 depths x 2 shapes = **12 load-bearing combinations** (the mirror and seed axes are declared non-load-bearing in the kernel's own comments).
- Of the 48 expanded candidates (12 x mirror x seed), `noveltyGate.js` kept **4** against the live catalog. `docs/factory/kernel-expansion-report.md` has the full pruning log.
- `src/play/playFamilies.js` declares **7 families**, with `targetVariants` of 6 for `two_on_one` and 4 for each of the other six. **The declared teaching-arc targets sum to 30 distinct variants across the entire family taxonomy as it exists today.**
- Exactly **one** machine-readable approved tactical claim exists: `claim_dz_breakout_retrieval_escape_pressure_v1.json`.

**What follows, as inference rather than measurement:** if a mature family yields something between 4 and 12 genuinely distinct states, reaching 200 needs somewhere between roughly 17 and 50 families. The repo has 7, and their own declared targets sum to 30. So the 200-state bar is not a compute problem and is not a generator problem. It is a **content-authoring problem**, and specifically a *tactical-claim-authoring* problem, because the spec is unambiguous that "Only Thomas or a named human coach/reviewer can approve a tactical claim. Claude and Ollama can propose or review but cannot occupy the approving role."

The honest conclusion the plan is willing to state: **the real throughput ceiling is very likely claim authoring, not compute.** If that is true, then the most valuable single number Phase 10 can produce is not "states per day." It is **hours of Thomas's time per approved tactical claim**, and **states yielded per approved claim**. Those two numbers together answer the actual business question, and neither of them requires clearing the 200 bar to be useful. Task 10.5's setup ledger is designed to capture the first one whether or not the benchmark clears anything.

The FINAL viable design already says the same thing from a different angle, in its own residual-risk section: "SSR's grounding is only as good as the human-authored claim prose and teaching-arc text it reads... a real 'someone has to write it down first' cost." And it names a concrete instance: `two_on_one`'s kernel has decision axes for only 2 of its own 6 named teaching-arc reads. The other 4 exist only as separately hand-authored plays. That is the shape of the ceiling in miniature.

### Other things this plan is genuinely unsure about

- **Whether question-kind variants can legitimately close the gap on the second bar.** The spec asks for 200 distinct states *and* 200 promotion-ready question items. If 5 question kinds apply to a state, 40 states could yield 200 items. That is legitimate arithmetic for the items line and completely illegitimate for the states line, and the spec's insistence on counting them separately is exactly why. But whether all 5 kinds genuinely apply to a given state is a hockey and pedagogy question this plan cannot answer.
- **Whether the 60-minute hands-on cap is compatible with attended gate 8 at any meaningful volume.** Two blind passes per candidate, attended, at 200 candidates is not a 60-minute activity by any estimate this plan can defend. Either the cap assumes a graduated template class with instance-level auto-promotion (which requires calibration that does not exist yet), or the cap and the volume are in tension in the spec itself. Phase 10 should measure the per-candidate attended cost and let the number settle the argument. This plan does not propose changing the cap.
- **Whether gate 6 and gate 7 can stay deferred through a benchmark.** They are deferred for a defensible reason (no `ScenarioDefinition`-shaped validator exists for either) but "question and age standards" and "visual validation" are not decorative gates for content that is supposed to be app-ready. The report will state their status prominently. Whether a benchmark with two structural gates deferred means anything is Thomas's call, and is arguably a ninth decision.
- **Whether Phase 8 (coach MVP) being parked invalidates the original sequencing.** The foundation plan made Phase 10 depend on Phase 8. `docs/roadmap/TASKS.md` has since recorded that the throughput benchmark is "no longer gated on the coach-authoring MVP" and that the coach MVP is parked. This plan follows TASKS.md. If that reading is wrong, Phase 10 should not start.

---

## What this plan explicitly does not do

- Enable the Windows scheduled task, or modify its registration in any way.
- Spend money. The only spend-shaped step is gate 5, and its default resolution is the free attended route.
- Weaken, skip, or reclassify any gate to improve a number.
- Push, deploy, publish, merge, or write into `src/data/bank.json`, `src/play/playCatalog.js`, or `src/play/playFamilies.js`.
- Resume, patch, or salvage `tools/scenario-engine-overnight.ps1`. Task 9.1 freezes it.
- Approve any tactical claim. Claude cannot occupy that role, and no task here tries to.
- Unpark the coach MVP or the team portal.
- Declare the engine a "hundreds per day" system. Per the spec: "Until the full bar passes, reports state measured yield without calling the engine a hundreds-per-day system."
