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
- give coaches a future path to author their own animated plays and videos; and
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
- a full coach-facing editor or production video-rendering service;
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

## Canonical scenario record

New generated and coach-authored work should begin from one versioned,
renderer-independent scenario record. Existing content does not need to be
migrated before the first vertical slice.

The record must contain:

- a schema version and stable scenario ID;
- family, tactical claim ID, age/skill profile, and source references;
- rink profile and canonical physical units;
- initial actor and puck state;
- a time-ordered event or action timeline;
- the decision freeze and observable cues;
- the correct read and its machine-checkable justification;
- question-kind variants and age-translated copy;
- complete provenance and generation parameters; and
- validation, judgment, staging, promotion, and recall history.

Canonical simulation coordinates use metres and seconds. Actor state includes
position, velocity, facing, role, physical envelope, reach, and possession.
Puck state includes position, velocity, possession, and last action.

Adapters translate this record into:

- the existing `animated-play` format for the current player experience;
- the current `src/scenario` interaction format where appropriate;
- a future coach preview and video-render input; and
- a future arcade replay or teaching-moment snapshot.

Normalized `0..1` coordinates and the current `200x85` play-rendering space are
presentation formats, not physics units.

## Machine-readable tactical knowledge

The engine needs a versioned machine-readable tactical knowledge base. Markdown
concept notes remain the human explanation and source narrative. The
machine-readable layer turns approved claims into executable constraints.

Each tactical claim must record:

- stable claim ID and version;
- scenario family and phase of play;
- age and skill applicability;
- observable cues and required conditions;
- the preferred read;
- reads that become invalid under those conditions;
- exceptions and invalidating conditions;
- source references and evidence confidence;
- linked kernel invariants and validator IDs;
- approval status and approving authority;
- revision history; and
- any promotion or recall history tied to the claim.

A claim is not generation-eligible merely because a model wrote it. It becomes
eligible only when:

1. a deterministic kernel proves the answer from already approved premises; or
2. a cited tactical claim receives human or coach approval.

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

Hard failures include teleportation, impossible acceleration or turning,
unreachable passes, illegal bounds, inconsistent possession, impossible event
ordering, and a claimed open lane that is physically intercepted before the
puck arrives.

Every failure must be explainable. For example:

```text
D1 reaches the passing lane 0.24 s before the puck.
F2 would need 9.8 m/s after a standing start to arrive at the authored time.
```

Soft warnings cover uncertain or coaching-dependent realism, such as a narrow
reaction window or a play that is possible only near the top of an age profile.
A private coach draft may preserve a soft warning with rationale. A hard
failure cannot be promoted to a team or public catalog.

Physics profiles must use sourced dimensions and defensible performance ranges.
The implementation must not invent one universal speed for every age. Each run
records the rink, age/skill profile, constants version, simulation version,
time-step or solver configuration, and seed.

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

## Factory run envelope

Every batch creates an immutable run envelope before it creates candidates. A
run records:

- run ID, start/end time, branch, and engine commit;
- working-tree state and relevant configuration hashes;
- tactical knowledge, physics, policy, and validator versions;
- family, kernel, parameter space, seeds, and requested counts;
- raw candidates and every gate result;
- Ollama operations and model versions, when used;
- Claude judgment input, output, rubric version, and confidence;
- staging, manual-review, promotion, and recall decisions; and
- elapsed time and throughput metrics.

Runs must be resumable and idempotent. Re-running a completed step must not
duplicate candidates or promotions. A failed run preserves its evidence and
stops at the failing gate.

Generation may run in a dirty working tree for exploration only if its output
is isolated. Promotion must refuse to run from an unrecorded or mixed source
state.

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

New kernel and template classes remain manual until they complete at least two
clean batches and the required app playtests. Calibrated instances may later
earn high-confidence automatic local promotion.

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

The eventual minimal authoring flow is:

1. choose rink, direction, and age/skill profile;
2. place players, goalie, and puck;
3. draw one or more routes, passes, or shots;
4. set action timing and the decision freeze;
5. name the options and correct read;
6. preview with tactical and physics feedback;
7. save and reopen the draft;
8. compile through the same scenario and play validation; and
9. export a shareable animated artifact.

The foundation owns the shared scenario record, compiler target, physics
feedback contract, validation results, and preview parity requirement. A
dedicated follow-on coach-authoring design must settle editor UX, permissions,
draft storage, export format, rendering architecture, share links, retention,
and team/catalog distribution.

Coach preview and exported output must use the same scenario data and timing as
the player-facing renderer. The current `COACHES_WHITEBOARD.md` is a legacy
static-image brief collection, not the coach-authoring product specification.

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
- the scenario/replay document.

It should not use the React animated-play timeline as its real-time physics
loop. The game can emit replay snapshots into the canonical scenario format so
an interesting game moment can later become a RinkReads teaching question.

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
a new scenario state.

The scale claim is earned only when one controlled session produces at least
200 meaningfully distinct, physics-clean scenario states and at least 200
promotion-ready question items, with elapsed time, gate survival, queue rate,
and a sampled false-approval audit recorded. Until then, reports state measured
yield without calling the engine a hundreds-per-day system.

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

The foundation is ready for its first scale plan only when:

- one defensive-zone breakout runs through the complete pipeline;
- the same seed and versions reproduce its positions, motion, puck timing, and
  judgment inputs;
- a physically possible version passes;
- deliberately impossible skating, passing, turning, and timing variants fail
  with specific explanations;
- the tactical read remains provable after physics validation;
- Claude can approve or reject hockey and teaching quality;
- Ollama remains limited to mechanical work;
- no generation step writes directly to the live bank;
- interrupted and resumed runs do not duplicate candidates or promotions;
- every promoted item traces to its tactical claim, physics profile, seed,
  validators, and judgment;
- one promoted item can be recalled without affecting unrelated content;
- the animated fixture passes the existing app/manual playtest gate;
- a sample coach-authored draft can compile into the same validated record and
  current animated-play target; and
- the benchmark report distinguishes scenario states from question variants.

## High-level implementation sequence

The implementation plan should sequence the work as:

1. isolate and manually assess the current defensive-zone breakout prototype;
2. define the canonical scenario record and coordinate adapters;
3. implement sourced physics profiles and deterministic kinematic validation;
4. create the first machine-readable tactical claims;
5. run one family through an immutable, resumable factory envelope;
6. add Claude judgment records and conservative staged promotion;
7. prove recall and failure behavior;
8. run the measured throughput benchmark;
9. write the dedicated coach-authoring and video-export design; and
10. write a separate arcade-game design only when that project is promoted.

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
- `COACHES_WHITEBOARD.md` is legacy static-image production guidance.
- `docs/research/2026-07-11-content-factory-and-video-portal-research.md`
  describes a separate player-footage review product.
- Existing specialized standards remain active where they do not conflict with
  this authority order.
- The current uncommitted breakout prototype and Remotion exploration must be
  preserved and reviewed separately; this documentation change does not adopt,
  discard, or commit them.

## Deferred decisions

These belong in follow-on implementation or product designs:

- the exact sourced skater and puck parameter sets for each profile;
- the fixed-step or event-solver implementation choice;
- coach editor route, permissions, storage, and collaboration;
- video renderer, export format, aspect ratios, and sharing;
- full real-time arcade technology and game design; and
- any live deployment or autonomous scheduling.

They do not change the approved boundary: shared tactical and physics truth,
deterministic validation, Claude judgment, conservative staging, and separate
coach and arcade product surfaces.
