# RinkReads Scenario Engine Foundation Design

**Status:** Approved architecture; written-spec review pending. Implementation
has not started.
**Approved by:** Thomas
**Date:** 2026-07-29
**Implementation branch:** `feature/shareable-beta`

## Authority and reading order

Read these documents in this order:

1. `docs/factory/SCENARIO-ENGINE-DECISIONS.md` is the owner-decision record. It
   wins if another document conflicts with it.
2. This document is the canonical architecture and boundary specification.
3. `docs/roadmap/TASKS.md` owns implementation sequence.
4. The specialized standards linked below own their narrower validation areas.

This specification reconciles the July 29 owner decisions with the current
repository. Older factory, authoring, and arcade documents remain useful
history, but they do not override this design.

## Outcome

Build a limited-input content engine that can eventually produce hundreds of
meaningfully distinct, hockey-accurate RinkReads scenarios and questions in a
working session. The engine must:

- construct the answer from approved hockey knowledge and scenario geometry;
- prove that the play is physically plausible;
- use generative judgment without making an AI its own source of hockey truth;
- preserve every generation, rejection, judgment, and promotion decision;
- stage content before it reaches the live app;
- deliver a minimal coach path to author, validate, preview, and export their
  own animated plays and videos; and
- expose a clean shared hockey core that a separate real-time arcade game can
  use later.

The first calibration fixture is the defensive-zone breakout retrieval under
pressure that is currently an uncommitted prototype. It must receive app-ready
interactive feedback before the factory is scaled.

## Non-goals for the foundation

This design does not authorize:

- a paid model API;
- an unattended service pretending the Claude session is always available;
- direct generation into `src/data/bank.json`;
- automatic Git pushes, deployments, or public releases;
- production-grade coach collaboration or rendering infrastructure beyond the
  minimal author/preview/export MVP;
- a real-time arcade hockey game, multiplayer, or netcode;
- migration of every existing scenario to a new schema; or
- a claim of "hundreds per day" before a measured benchmark proves it.

## Existing foundations to preserve

The new foundation should reuse and extend, rather than replace:

- correct-by-construction play kernels and the novelty gate from
  `docs/superpowers/specs/2026-07-21-play-kernel-engine-design.md`;
- deterministic art checks and graduated trust from
  `docs/superpowers/specs/2026-07-21-art-qc-autolearning-design.md`;
- renderer and authoring constraints from `docs/play-kernel-standards.md`;
- family-level content rules from `docs/scenario-family-standards.md`;
- accumulated validator lessons in `src/scenario/LESSONS.md` and
  `src/scenario/GOLDEN-RULES-2026-06-11.md`;
- named positions from `src/play/rinkAnchors.js`;
- waypoint curves and choreography beats from `src/play/motionGeometry.js`;
- current animated-play validation and factory checks; and
- the current live-bank composition in `src/qbLoader.js`.

The present validators prove useful geometry and hockey rules. They do not yet
constitute a time-based physics simulation.

## Supporting Markdown map

Use this map to avoid reviving an older workflow as current architecture.

| Status | Documents | Use |
|---|---|---|
| Owner and canonical | `docs/factory/SCENARIO-ENGINE-DECISIONS.md`, this specification, `docs/roadmap/TASKS.md` | Decisions, architecture, and sequence |
| Active specialized standards | `docs/play-kernel-standards.md`, `docs/scenario-family-standards.md`, `AUTHORING_STANDARDS.md`, `src/scenario/LESSONS.md`, `src/scenario/GOLDEN-RULES-2026-06-11.md` | Narrow content, renderer, question, and validator rules |
| Implemented foundation | `docs/superpowers/specs/2026-07-21-play-kernel-engine-design.md`, `docs/superpowers/specs/2026-07-21-art-qc-autolearning-design.md`, `docs/play-engine-audit.md` | Kernels, novelty, art checks, and current renderer capability |
| Reusable design history | `docs/factory/SPEC.md`, `docs/factory/2026-06-04-gauntlet-v2-design.md`, `docs/superpowers/specs/2026-06-04-curriculum-ledger-design.md`, `docs/superpowers/specs/2026-06-11-scenario-question-factory-design.md`, `docs/superpowers/specs/2026-06-13-coach-auto-revise-design.md`, `docs/specs/2026-06-16-scenario-variation-generator-design.md`, `docs/superpowers/specs/2026-07-08-animated-scenario-factory-bridge-mind-lessons.md` | Salvage proven gates and lessons; do not inherit conflicting engine or promotion choices |
| Coach UX history | `tools/dashboard-roadmap.md`, `docs/superpowers/specs/2026-06-11-question-types-coach-signoff-design.md`, `docs/superpowers/specs/2026-06-11-mobile-scenario-review-design.md`, `docs/superpowers/specs/2026-06-12-coach-pre-review-design.md`, `docs/superpowers/specs/2026-06-13-question-dashboard-design.md` | Input and review ideas only; current code targets must be re-verified |
| Legacy | `COACHES_WHITEBOARD.md`, `POV_AUTHORING.md`, `MIGRATION_REPORT.md`, `INTEGRATION_GUIDE.md`, `ADMIN_BUILD_BRIEF.md`, `ADMIN_DASHBOARD.md`, `docs/roadmap/archive/2026-05-02-routing-storage-map.md` | Historical static-image, old-bank, and old-authoring context |
| Separate product research | `docs/research/2026-07-11-content-factory-and-video-portal-research.md` | Player-footage review portal, not coach-created animation |
| Existing arcade training direction | `docs/research/2026-07-08-question-engine-research.md`, `docs/research/2026-07-08-young-age-game-mechanics.md`, `docs/proposals/2026-07-09-cognitive-gym-overhaul-design.md`, `docs/superpowers/specs/2026-07-21-shootout-first-person-redesign.md` | Controlled training shells, not the future real-time hockey game |

The future real-time arcade hockey game has no canonical design yet.

## Architecture

The controlled production flow is:

```text
approved tactical claim
  -> scenario kernel
  -> physics-constrained simulation
  -> correct answer derived from the state
  -> question-kind and prose variants
  -> deterministic gates
  -> Claude hockey and pedagogy judgment
  -> conservative tier decision
  -> staged artifact
  -> explicit local promotion
  -> live-bank composition
```

Four truth domains remain separate:

| Domain | Authority |
|---|---|
| Hockey tactics | Approved knowledge-base claim, kernel invariant, and Claude review |
| Measurable physics | Deterministic simulator and sourced physics profile |
| Teaching quality | Authoring standards, deterministic checks, and Claude review |
| Visual clarity | Renderer validation, art lint, render checks, and manual playtest |

Physics can reject an impossible tactical idea, but physics alone cannot decide
that a hockey read is strategically best. Claude can assess judgment and
pedagogy, but it cannot overrule a hard physics failure.

## Canonical scenario bundle

New generated and coach-authored work begins from a small set of separate,
versioned artifacts. Existing content does not need to be migrated before the
first vertical slice.

### `ScenarioDefinition`

The immutable renderer-independent authoring or generation input contains:

- schema version, stable scenario ID, immutable version, and content hash;
- family, tactical claim version, proof mode, age/skill profile, and sources;
- rink frame/profile and canonical physical units;
- initial actor and puck state;
- time-ordered intended actions;
- decision freeze and observable cues;
- `declaredRead`, supplied by a kernel or coach as intent;
- question-kind variants and age-translated copy; and
- generation parameters and dependency versions.

Each definition targets exactly one physics age/skill profile. A multi-age
teaching concept produces sibling definitions and traces per target profile,
even when they share geometry or copy lineage. A pass for U18 can never rescue
a U7 definition.

### `SimulationTrace`

The physics engine resolves the definition into timestamped actor, puck,
possession, and event states. It contains the solver/RNG configuration,
structured findings, a canonical trace hash, and the physically available
candidate set.

### `DecisionEvaluation`

The tactical evaluator applies the approved kernel invariants or tactical claim
to the physics-clean trace. It records `derivedRead`, all viable candidates,
the proof chain, and any ambiguity. Physics filters what can happen; this
evaluation determines which possible read is supported tactically.

If `declaredRead` and `derivedRead` disagree, the compiler does not silently
choose one. A disproven answer is a hard failure. Missing tactical evidence or
multiple unresolved reads enter review. The private draft is preserved with
the mismatch and its explanation.

### `CompiledTeachingPlay`

The compiler combines an approved definition, trace, and decision evaluation
into the immutable playback artifact consumed by player preview, coach preview,
and video export. It contains resolved keyframes or samples, event times,
question freezes, answer proof, and dependency hashes. Renderers must not
independently retime or redraw load-bearing motion.

The current `animated-play` renderer is a lossy target: actors and the puck use
a fixed transition, while waypoint and choreography timing primarily controls
route-line reveal. The first implementation plan must either add an
`animated-play-v2` keyframe/duration contract with a deterministic playback
clock or make the renderer consume `CompiledTeachingPlay` directly. A simple
conversion to current `enter`/`pos` transitions cannot claim physics or
preview/export parity.

The current `src/scenario` interaction format may receive an adapter where
appropriate. Existing v1 content can continue to render while the validated v2
path is introduced.

### `ArcadeReplay`

A future real-time game records initial state, continuous player inputs, AI
events, tick rate, RNG state, physics build, and authoritative outcome in a
separate replay artifact. A one-way projection can turn a replay moment into a
`ScenarioDefinition` and teaching trace. An authored scenario timeline is not
treated as a full real-time replay.

Level 2 is authoritative for what occurred in the game. Level 1 remains
authoritative for factory/teaching validation. A projected game moment that
cannot pass the teaching validator is queued rather than rewritten.

### Physical coordinate frame

Canonical simulation coordinates use metres and seconds in a versioned
`RinkFrame`:

- origin at centre ice;
- positive x toward the canonical right end;
- positive y toward the bottom of the canonical top-down view;
- facing angle zero along positive x and increasing clockwise;
- attacking direction stored explicitly as `+x` or `-x`;
- skater position anchored at the centre of the projected body envelope; and
- rink profile supplies boards, lines, goals, crease, and playable bounds.

Actor state includes position, velocity, facing, role, body/stick envelope,
reach, and possession. Puck state includes position, velocity, possession, and
last action.

Normalized `0..1`, the current `200x85` play space, and the legacy `600x300`
space are presentation frames. Pure adapters declare source/destination frame,
mirroring, precision, and round-trip tolerance. Adapters may reject bad
coordinates but may never clamp a physics failure into legal bounds.

## Machine-readable tactical knowledge

The engine needs a versioned machine-readable tactical knowledge base. Markdown
concept notes remain the human explanation and source narrative. The
machine-readable layer turns approved claims into executable constraints.

The canonical proposed storage is one canonicalized JSON document per claim at
`src/data/tactics/claims/<claim-id>.json`, with a generated
`src/data/tactics/index.json`. The implementation plan may refine the path, but
it must preserve one authoritative schema, deterministic key ordering, and a
stable content hash.

Each tactical claim must record:

- stable claim ID and version;
- schema version and status: `draft`, `review-required`, `approved`, `retired`,
  or `superseded`;
- proof mode: `kernel-derived` or `approved-claim-derived`;
- scenario family and phase of play;
- age and skill applicability;
- observable cues and required conditions;
- the preferred read;
- reads that become invalid under those conditions;
- exceptions and invalidating conditions;
- source references and evidence confidence;
- linked kernel invariants and validator IDs;
- approval status and approving authority;
- prior version reference (`supersedes`); and
- dependency key used by the external judgment and promotion ledger.

Claim IDs are never reused. A material change creates a new immutable version;
the old version remains addressable. The index points to the active version.
Two approved claims with overlapping conditions and incompatible reads create
a conflict record and are ineligible for generation until a human reconciles
them.

The implementation adds one validation command, provisionally
`npm run test:tactics`, that checks schema, source-reference validity, status,
approval role, version lineage, hash stability, conflicts, and linked
validators. Only Thomas or a named human coach/reviewer can approve a tactical
claim. Claude and Ollama can propose or review but cannot occupy the approving
role.

A claim is not generation-eligible merely because a model wrote it. It becomes
eligible only when:

1. `kernel-derived`: a reviewed template proves the answer from approved
   premises and its recorded invariants; or
2. `approved-claim-derived`: a cited tactical claim receives human or coach
   approval and the scenario satisfies its conditions.

Curriculum coverage and tactical truth are separate. The curriculum can ask for
more gap-control content, but it cannot decide what correct gap control is.

## Physics layer

Physics is a first-class validation authority shared by generated scenarios,
coach-authored plays, and a future arcade game.

### Fidelity level 1: scenario kinematics

The first implementation is a fast, deterministic, headless hockey-kinematics
simulator suitable for large factory batches. It validates whether the authored
sequence could happen as shown.

It must model or bound:

- rink dimensions, boards, goal lines, nets, and legal play area;
- time, distance, velocity, acceleration, deceleration, and stopping;
- skater facing, turning rate or radius, path length, and reaction delay;
- age- and skill-appropriate performance ranges;
- puck release, travel, deceleration, reception, shot, rim, and board contact;
- possession changes;
- player footprint, stick/reach envelope, lane closure, and interceptions;
- contacts and impossible actor overlap;
- chronological causality between actions; and
- whether the decision window is still open at the stated freeze.

Each physics profile independently versions:

- rink and rules geometry;
- player body, skate, stick, and reach envelopes;
- skating acceleration, speed, turning, stopping, and reaction intervals;
- puck, ice, boards, and net parameters; and
- age band and optional skill tier.

Performance profiles are ranges, not laws. For a definition's selected
age/skill profile, geometry/rules invariants, contradictory state, or motion
outside that profile's sourced conservative maximum are hard failures. Other
profiles do not rescue it. Exceeding a typical percentile while remaining
inside the selected profile's conservative bound is a soft warning. A missing
target profile is `review-required`, not an inferred default.

Hard failures include teleportation, impossible acceleration or turning,
unreachable passes, illegal bounds, inconsistent possession, impossible event
ordering, and a claimed open lane that is physically intercepted before the
puck arrives.

Unsupported phenomena such as an elevated/saucer pass, complex deflection, or
contact model not implemented at Level 1 return a stable
`UNSUPPORTED_MODEL` review result. They never receive a guessed pass or hard
failure.

Every finding is structured before it is rendered as prose. It contains:

- validator code and version;
- actor, puck, and action IDs;
- event time or interval;
- measured value, threshold/range, margin, and units;
- rink/physics profile and source versions;
- assumptions and solver version;
- severity;
- `answerImpact`: `none`, `possible`, or `changes-answer`; and
- a short human explanation.

For example:

```text
D1 reaches the passing lane 0.24 s before the puck.
F2 would need 9.8 m/s after a standing start to arrive at the authored time.
```

Soft warnings cover uncertain or coaching-dependent realism, such as a narrow
reaction window or a play that is possible only near the top of an age profile.
A private coach draft may preserve a soft warning with rationale. A hard
failure cannot be normally exported, shared, or promoted. A warning with
`answerImpact` other than `none` blocks auto-promotion.

Physics profiles must use sourced dimensions and defensible performance ranges.
The implementation must not invent one universal speed for every age. Each run
records the rink, age/skill profile, constants version, simulation version,
time-step or solver configuration, and seed.

Determinism is versioned, not implied by a seed. The solver contract must pin:

- RNG algorithm, version, initial state, and consumption order;
- fixed-step or event ordering and stable tie-breaking;
- runtime/engine version;
- floating-point and canonical quantization policy;
- coordinate-adapter precision and round-trip tolerances;
- content-addressed candidate-ID derivation; and
- canonical trace serialization and hash.

Within a pinned runtime and engine build, the quantized trace hash must be
identical. Cross-runtime comparisons use explicit versioned tolerances and
cannot auto-promote if equivalence is not proven. Golden fixtures must cover
just-inside and just-outside speed, turning, reach, interception, board, and
adapter boundaries. Clamping is forbidden in validation.

### Fidelity level 2: real-time dynamics

A later arcade game may add continuous forces, richer collisions, player
control, opponent AI, game state, and real-time puck interaction. It must share
the canonical units, rink profiles, physical constants, and replay contract,
but it is a separate runtime. The scenario factory must not wait for that
higher-fidelity engine.

## Generation and judgment split

The sanctioned free-only split is:

- **Kernels and deterministic code:** construct the load-bearing answer,
  geometry, timeline, and physics.
- **Local Ollama:** mechanical variation, classification, duplicate screening,
  embeddings, and other cheap bulk work.
- **Claude session:** hockey judgment, ambiguity review, pedagogy, adversarial
  review, and final prose judgment.

Ollama must never determine the correct hockey answer. Generated prose must
never silently change the answer established by the kernel and validated state.
If Claude judgment is unavailable, candidates can remain staged but cannot be
auto-promoted.

The promotion threshold and calibration requirements live in one versioned
policy artifact, provisionally `config/scenario-promotion-policy.json`. A
judgment record captures the Claude provider/session identifier, model and
version when exposed, reasoning configuration when exposed, rubric hash,
prompt/context manifest, tool manifest, engine commit, and calibration-corpus
version. Unavailable model metadata is recorded explicitly and disables
auto-promotion for that run.

Changing the model, rubric, context manifest, physics version, renderer timing,
or tactical schema invalidates the affected calibration until it passes the
versioned holdout again.

## Factory run envelope

Every batch creates an immutable start manifest before it creates candidates.
Completion data is appended as run events and a content-addressed summary;
neither rewrites the start manifest. Together, a run records:

- run ID, start/end time, branch, and engine commit;
- working-tree state and relevant configuration hashes;
- tactical knowledge, physics, policy, and validator versions;
- family, kernel, parameter space, seeds, and requested counts;
- raw candidates and every gate result;
- Ollama operations and model versions, when used;
- Claude session/model metadata, input/context hashes, output, rubric version,
  calibration version, and confidence;
- staging, manual-review, promotion, and recall decisions; and
- elapsed time and throughput metrics.

Runs must be resumable and idempotent. Re-running a completed step must not
duplicate candidates or promotions. A failed run preserves its evidence and
stops at the failing gate.

Generation may run in a dirty working tree for exploration only if its output
is isolated. Promotion must refuse to run from an unrecorded or mixed source
state.

### Immutable versions and append-only events

Scenario definitions, traces, decision evaluations, and compiled plays are immutable,
content-addressed versions. Judgment, queue, promotion, retirement, and recall
are append-only events that reference an artifact hash; they are not mutable
history embedded back into that artifact.

The state machine is:

```text
generated
  -> validated | rejected
  -> judged | review-required | rejected
  -> promotion-eligible | review-required
  -> staged
  -> promoted
  -> recalled | retired
```

All gate-clean items may stage automatically. Only a calibrated,
policy-eligible item may transition from staged to locally promoted without a
human action. A changed item creates a new version rather than reopening the
old one.

`review-required` resolves through an append-only human event:

- `human-approved` may move the unchanged artifact to staged with rationale;
- `human-rejected` terminates that version; or
- `revision-requested` creates a new `ScenarioDefinition` version that starts
  again at generated.

A dependency index maps each artifact version to its tactical claim, physics
profile, kernel, renderer, rubric, judge stack, promotion-policy version,
calibration-corpus version, and source versions. Recalling any dependency must
enumerate every affected promoted item and produce a reviewable
removal/rollback patch without touching unrelated content.

## Gate order

Candidates pass through gates in this order:

1. **Environment and provenance:** required versions, hashes, sources, and
   generation authority exist.
2. **Schema and domain:** IDs, actors, state, question structure, and references
   are well formed.
3. **Physics:** motion, puck travel, possession, bounds, timing, and reach are
   physically plausible.
4. **Tactical invariants:** the visible state actually makes the intended
   answer correct.
5. **Novelty:** the decision or cue changed meaningfully; mirrors and jitter do
   not masquerade as new teaching reps.
6. **Question and age standards:** prompt, options, rationale, reading level,
   answer cardinality, and accessibility pass.
7. **Visual validation:** art lint, cue visibility, reveal behavior, and render
   checks pass.
8. **Claude judgment:** hockey accuracy, ambiguity, pedagogy, and adversarial
   failure modes pass.
9. **Promotion policy:** the calibrated tier policy determines automatic
   staging, manual review, or rejection.
10. **App gate:** required tests and the relevant manual playtest pass before
    catalog release.

No later gate erases an earlier failure.

## Conservative promotion

Confidence is not enough by itself. Automatic promotion requires:

- every hard gate passing;
- an approved tactical claim;
- a calibrated kernel or template class;
- a calibrated Claude rubric;
- no unresolved warnings that can affect the answer; and
- a clean, recallable promotion record.

New kernel and template classes remain manual. Two clean capped batches across
the required age bands are a prerequisite, not sufficient calibration.
Graduation also requires:

- parameter-space boundary coverage;
- pinned adversarial physics, tactics, ambiguity, and render fixtures;
- a Thomas-reviewed calibration corpus with at least 50 decisions overall and
  at least 20 representative decisions for the template class;
- a held-out set containing at least 20 percent of the corpus and no fewer than
  10 decisions for the template class, with zero wrong-answer false approvals;
- recorded false-rejection, queue, and warning rates.

Until a template-specific graduation event is recorded, the existing
three-play/manual-playtest standard remains in force. After graduation,
instance-level auto-promotion is allowed only for the same versioned template,
physics profile, renderer, question kind, and judge stack. Each eligible batch
still receives a deterministic random sample of at least 10 percent or three
items per template, whichever is greater. One wrong-answer defect disables the
class, recalls affected items, and returns it to manual review.

Anything uncertain enters Thomas's queue with the exact gate, claim, or
assumption that needs review. A coach's own private draft can be visible to
that coach before catalog approval, but team distribution or public catalog
promotion follows the same safety gates.

Promotion is local and reversible. It does not imply push, deploy, or publish.
Generated content is never written directly over `src/data/bank.json`.

## Learning without truth drift

Every approval, rejection, override, recall, and player-reported defect becomes
an immutable judgment event. The engine can derive a candidate lesson from
those events, but it cannot make the lesson authoritative by repeating it.

Learning proposals fall into three classes:

1. **Mechanical or visual rules:** may graduate through pinned failures, golden
   tests, and measured false-positive calibration.
2. **Physics rules or constants:** require a cited physical source, a
   reproducible failing fixture, and human approval before becoming hard gates.
3. **Tactical claims:** require deterministic proof from approved premises or
   cited evidence plus human or coach approval.

Claude may propose changes to any class. It may not approve its own new
tactical claim or silently rewrite the knowledge base. Each accepted change
increments a version and keeps the prior version recallable.

## Coach-created animated play boundary

The coach-video MVP means coaches author animated plays. It is not the separate
idea of uploading player game footage for voiceover review.

The minimum product slice is:

1. choose rink, direction, and age/skill profile;
2. place players, goalie, and puck;
3. draw one or more routes, passes, or shots;
4. set action timing and the decision freeze;
5. name the options and declared read;
6. preview with tactical and physics feedback;
7. save and reopen the draft;
8. compile through the same scenario and play validation; and
9. export a shareable animated artifact.

The foundation owns the shared scenario bundle, compiler target, physics
feedback contract, validation results, and preview parity requirement. A
dedicated coach-authoring design is written after the shared record and first
compiler fixture, and before the throughput benchmark. It must settle editor
UX, permissions, draft storage, export format, rendering architecture, share
links, retention, and team/catalog distribution. The minimal editor,
save/reopen, preview, and export slice is part of the selected MVP; only the
production collaboration/rendering service is deferred.

Coach preview and exported output must use the same scenario data and timing as
the player-facing renderer. The current `COACHES_WHITEBOARD.md` is a legacy
static-image brief collection, not the coach-authoring product specification.

Before the distribution gate:

- hard-failed drafts are preview-only in the editor;
- a diagnostic file, if supported, carries an unavoidable
  `DRAFT - NOT VALIDATED` watermark and the failed checks;
- soft-warning draft exports retain warning metadata and the same watermark;
  and
- unwatermarked downloads or public/team share links are disabled.

The coach's `declaredRead` is always compared with the engine's `derivedRead`.
The editor may explain and preserve a mismatch, but it may not turn the
declared answer into validated truth.

## Future arcade hockey boundary

Current RinkReads "arcade" ideas such as Daily Faceoff, Rush Hour, Brain Gym,
Shootout, and youth mini-games remain short training shells around controlled
questions or drills.

A future original arcade hockey game is a separate product runtime because it
needs continuous input, player locomotion, puck control, opponent AI, game
rules, possession, scoring, cameras, collision handling, and potentially
multiplayer authority.

It should reuse:

- canonical metres/seconds and rink profiles;
- physics constants and deterministic random generation;
- pure geometry, reach, lane, and interception functions;
- tactical claims and scenario-family vocabulary; and
- the versioned `ScenarioDefinition`, `SimulationTrace`, and `ArcadeReplay`
  contracts.

It should not use the React animated-play timeline as its real-time physics
loop. The game can emit replay snapshots into the canonical scenario format so
an interesting game moment can later become a RinkReads teaching question.

## Scheduled runner boundary

The supported nightly runner is part of the scenario-engine foundation, but it
remains disabled until one manual run, interruption/resume, recall, and
promotion safety all pass.

When enabled explicitly, Windows Task Scheduler may start one local
orchestrator per window. The orchestrator must:

- take a single-instance lock and create the immutable run envelope first;
- use an isolated recorded source state;
- run dependency, disk, configuration, Ollama, and destination preflights;
- require a supported Claude-session handshake for judgment;
- record the available session/model/tool metadata;
- stop or leave candidates staged when Claude is unavailable;
- enforce timeouts, resumable checkpoints, and idempotent promotion;
- never substitute Ollama as hockey authority; and
- never push, deploy, publish, or bypass the manual enable switch.

Scheduling does not make Claude a 24/7 service. It provides a safe launch and
resume boundary for a session that is actually available.

## Throughput and the "hundreds per day" claim

Reports must count these separately:

- raw parameter combinations;
- validator-clean candidates;
- meaningfully distinct scenario states;
- question variants;
- Claude-approved items;
- promotion-ready items;
- manual-review items;
- rejected items by gate; and
- recalled items.

A mirror, prose change, or non-load-bearing coordinate jitter does not count as
a new scenario state. Each template registers a versioned novelty signature
covering tactical claim, decision/cue topology, answer, and minimum
geometry/time distance. The benchmark publishes the signature distribution and
all thresholds.

The scale claim is earned only when one controlled run:

- finishes within 24 elapsed hours;
- uses no more than 60 minutes of hands-on human input during the run;
- produces at least 200 meaningfully distinct, physics-clean scenario states;
- produces at least 200 promotion-ready question items;
- records hardware, runtime, models, model/session availability, and every gate
  survival count;
- separately reports pre-run human effort spent building kernels, claims,
  profiles, fixtures, and calibration data; that setup is not hidden inside or
  credited toward the 60-minute run budget;
- reports queue rate, warning rate, novelty distribution, false rejections, and
  elapsed/hands-on time; and
- audits the promotion-ready cohort whether or not local promotion is enabled:
  all items when there are fewer than 60, otherwise a
  deterministic random sample of at least 60 or 10 percent, whichever is
  greater, with zero wrong-answer false approvals.

Any wrong-answer false approval fails the benchmark, disables the affected
auto-promotion class, and triggers dependency-based recall. Until the full bar
passes, reports state measured yield without calling the engine a
hundreds-per-day system.

The first vertical slice proves one family end to end. Scale comes after the
kernel, physics, judgment, and recall path are calibrated.

## Failure behavior

The system fails closed when:

- an approved tactical source is missing;
- the answer is ambiguous;
- physics cannot reproduce the authored sequence;
- the judge is unavailable;
- a required test or render check fails;
- a promotion would mix unrecorded source changes; or
- the destination content has changed since staging.

The system preserves the run, states the reason, and queues or aborts. It never
weakens a gate, fabricates a source, substitutes local-model judgment for
Claude, or overwrites the live bank to force completion.

## Acceptance gates before scaling

The foundation is ready for a high-volume scale run only when:

- the exact breakout prototype files, source state, and content hashes are
  captured before adoption;
- one defensive-zone breakout runs through the complete pipeline;
- the same seed and versions reproduce its positions, motion, puck timing, and
  judgment inputs and canonical trace hash;
- a physically possible version passes;
- deliberately impossible skating, passing, turning, and timing variants fail
  with specific explanations;
- the tactical read remains provable after physics validation;
- `declaredRead` and `derivedRead` agreement is enforced;
- player preview, coach preview, and video output consume the same validated
  playback timing and trajectories;
- Claude can approve or reject hockey and teaching quality;
- Ollama remains limited to mechanical work;
- no generation step writes directly to the live bank;
- interrupted and resumed runs do not duplicate candidates or promotions;
- every promoted item traces to its tactical claim, physics profile, seed,
  validators, and judgment;
- one promoted item can be recalled without affecting unrelated content;
- the animated fixture passes the existing app/manual playtest gate;
- a coach can place players/puck, draw the play, set the read, receive physics
  feedback, save/reopen, preview, and export one validated animation without
  editing JSON;
- failed/unreviewed coach output cannot escape the draft/watermark boundary;
- the disabled scheduled runner can pass preflight, abort safely without
  Claude, and resume without duplicate promotion; and
- the benchmark report distinguishes scenario states from question variants.

## High-level implementation sequence

The implementation plan should sequence the work as:

1. isolate, hash, and manually assess the defensive-zone breakout prototype;
2. define the scenario bundle, `RinkFrame`, adapters, and validated playback
   timing contract;
3. implement sourced physics profiles and deterministic kinematic validation;
4. create the first schema-validated machine-readable tactical claims;
5. run one family and one coach-declared fixture through the immutable,
   resumable factory/compiler envelope;
6. add Claude judgment records, the event state machine, dependency recall, and
   conservative staged promotion;
7. write and approve the dedicated coach-authoring/video-export design against
   the proven compiler and physics contract;
8. implement the minimal coach editor, save/reopen, preview, validation, and
   protected export slice;
9. prove scheduled-runner preflight, failure, resume, and manual enable behavior;
10. run the measured throughput benchmark; and
11. write a separate arcade-game design only when that project is promoted.

This is sequencing guidance, not authorization to implement before the written
plan is reviewed.

## Documentation reconciliation

- `docs/factory/SCENARIO-ENGINE-DECISIONS.md` remains the owner authority.
- This file is the canonical architecture.
- `docs/roadmap/TASKS.md` must reflect that the July 21 scalability work was
  unparked by Thomas on July 29, subject to this foundation and its gates.
- `src/data/bank.json`, composed by `src/qbLoader.js` with scenario seeds, is
  the current live bank path. Active instructions must not point generation at
  the removed `src/data/questions.json`.
- `docs/factory/SPEC.md` is foundational history. Its current conflicts are
  resolved by the owner decisions and this file.
- `ROUTING.md` is the short current path map. The May 2 author-tool workflow is
  archived at `docs/roadmap/archive/2026-05-02-routing-storage-map.md`.
- `COACHES_WHITEBOARD.md` is legacy static-image production guidance.
- `docs/research/2026-07-11-content-factory-and-video-portal-research.md`
  describes a separate player-footage review product.
- Existing specialized standards remain active where they do not conflict with
  this authority order.
- The current uncommitted breakout prototype spans
  `src/play/plays/dzBreakoutEscapePressure.js`,
  `src/play/playCatalog.js`, `src/play/playFamilies.js`, and
  `docs/library/dz-breakout-retrieval-under-pressure.md`. The implementation
  plan must capture their exact source state and hashes before adopting them.
  The untracked `remotion/` exploration remains separate. This documentation
  change does not adopt, discard, or commit any of those files.

## Deferred decisions

These belong in follow-on implementation or product designs:

- the exact sourced skater and puck parameter sets for each profile;
- the fixed-step or event-solver implementation choice;
- coach editor route, permissions, storage, and collaboration;
- video renderer, export format, aspect ratios, and sharing;
- full real-time arcade technology and game design; and
- any live deployment.

They do not change the approved boundary: shared tactical and physics truth,
deterministic validation, Claude judgment, conservative staging, and separate
coach and arcade product surfaces.
