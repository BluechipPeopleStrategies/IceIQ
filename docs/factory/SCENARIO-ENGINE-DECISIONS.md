# Scenario Engine — Owner Decisions (2026-07-29)

**Status:** AUTHORITATIVE. Where this file and
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md` disagree, **this file wins**.
The companion specification records the reconciled architecture and must remain aligned
to these owner decisions, not the other way round.

Decided by Thomas, 2026-07-29, ahead of the overnight autonomous build.

---

## The ask, verbatim

> "Review all of my RinkReads stuff around scenario creation. Create a scenario engine
> that will allow for the mass production of content for the training app with limited
> input needed. In addition, build this out so that coaches can create videos. I just
> want to get to a minimal viable product. Do not stop until you have an engine that can
> realistically create hundreds of scenarios and questions a day that would then go into
> the app."

> "Really tighten the app up so we can have generative AI use judgment to create hockey
> questions that are meaningful and accurate for people to answer."

> "Do not stop until you have hockey strategies and tactics that can be used in
> questions, and self-verifies and updates based on the judgment that it would create
> for itself."

---

## Decision 1 — What powers generation and hockey judgment: FREE ONLY

**No paid API. No Anthropic or OpenAI key.** `.env` holds Supabase and Notion only, and
it stays that way. Do not add a paid provider, do not write code whose primary path
requires one, and do not tell Thomas the engine needs one.

The two sanctioned engines:

| Role | Runs on | Why |
|---|---|---|
| Hockey judgment, tactical correctness, pedagogy, final prose | **The Claude Code session itself** (this agent, plus its subagents) | Best judgment available, already paid for by subscription, no marginal cost |
| Bulk mechanical work — prose variation, deduplication, first-pass screening, embedding/dedupe, cheap classification | **Local Ollama** at `http://localhost:11434` (`llama3.1:8b`, `hermes3:8b`, `deepseek-r1:8b`, `nomic-embed-text`) | Free, unlimited, always on, good enough for mechanical passes |

**Hard rule on the split:** an 8B local model must NEVER be the authority on whether a
hockey read is correct. It screens, varies, and dedupes. Correctness is decided by kernel
geometry (correct-by-construction) or by the Claude session's judgment against the
knowledge base — never by Ollama.

**Consequence to design around honestly:** generation happens when a session runs, not
24/7 unattended. So "hundreds per day" means a batch run must be able to produce hundreds
in one sitting. Design for high-yield batch throughput, and build the runner so a
scheduled nightly session can execute it. The runner must require a supported Claude
session handshake and fail closed when judgment is unavailable. It may never substitute
Ollama for hockey judgment. Keep scheduled execution disabled until the preflight,
single-run, resume, and safety gates are explicitly approved. Do not fake unattended
operation.

## Decision 2 — Coach video MVP: COACHES BUILD THEIR OWN PLAY

Not "export a play from the catalog." The MVP is an **authoring tool**: a coach places
players on a rink, draws routes and passes, sets the read and the correct answer, and the
engine renders it to a shareable video.

This is the bigger build and Thomas chose it knowingly. Build toward the coach as a
*creator*, not a consumer. Reuse the existing play engine, `rinkAnchors.js`, waypoint
curves, and choreography beats as the render target — the coach's drawing should compile
down to the same play format the engine already animates, so authored plays flow into the
same pipeline, gates, and catalog as generated ones.

MVP scope is genuinely minimal: place players, draw a route or two, mark the read, name
the options, preview, export. Polish is not the goal tonight; a working end-to-end path
from a coach's drawing to a playable/exportable artifact is.

The coach's marked answer is declared intent, not automatic truth. The compiler must
derive the physically and tactically supported read independently and surface any
disagreement before export.

Unapproved work stays private and visibly marked as a draft. Hard physics or tactical
failures block normal export and sharing. An optional diagnostic export must carry an
unavoidable "DRAFT - NOT VALIDATED" mark and the failed checks. Unwatermarked or public
sharing requires the designated validation tier.

`COACHES_WHITEBOARD.md` is a legacy static-image brief collection. It can supply visual
recipes, but it is not the coach-authoring product specification.

## Decision 3 — Review posture: TIERED AUTO-APPROVE

The deterministic gates and calibrated Claude judgment decide the tier:

- **High confidence, calibrated template, clears every gate** → auto-promote
  locally into the app.
- **Anything less than certain** → Thomas's review queue, **with the reason stated** —
  which gate was borderline, which tactical claim the engine could not fully justify.

New kernel and template classes remain manual until calibration earns a stricter
instance-level auto-promotion path. Two clean small batches are necessary but not
sufficient; the versioned promotion policy also requires boundary coverage, adversarial
fixtures, a held-out Thomas-reviewed set, and zero wrong-answer false approvals.

Thomas reviews the interesting ones, not all of them. The engine's job is to make the
queue high-yield, not to bypass it.

**The confidence threshold must be conservative and must be tunable in one place.** Start
strict: when in doubt, queue it. A wrong "correct answer" reaching a child is the worst
defect this system can produce, and it is worse than a queue that is slightly too long.
The auto-approve rate can be raised later, from evidence, once the judge is calibrated
against Thomas's actual accept/reject decisions.

Auto-promoted items must remain individually reversible: record which engine version,
knowledge-base version, and judgment promoted each item, so a bad tier can be recalled.

## Decision 4 — Physics is a first-class truth layer

Every generated or coach-authored play must make sense in time and space, not only as a
static diagram. The shared foundation must validate skating paths, acceleration, turning,
stopping, reaction windows, puck travel, possession, reach, lane interception, legal
bounds, and chronological causality against a sourced rink and age/skill profile.

Hard physics failures cannot be overruled by Claude or by confidence scoring. Physics can
prove that a play is impossible, but it does not decide which physically possible hockey
read is tactically best. Tactical correctness still comes from an approved claim or
kernel plus Claude judgment.

Start with a fast deterministic kinematics layer for factory and coach-authoring work.
A later real-time arcade game may add higher-fidelity dynamics while sharing the same
units, profiles, physical constants, and replay contract.

## Decision 5 — Shared core, separate product runtimes

The scenario factory, coach-authoring surface, and future arcade hockey game share the
hockey domain model, tactical knowledge, physics contracts, and replay format. They do
not share one product runtime.

The coach MVP compiles a private authored draft into the shared validated playback
contract and the animated-play renderer. The current fixed-duration v1 renderer is
lossy; it must gain timing-faithful keyframes/durations or consume the validated trace
directly before preview/export parity can be claimed. The coach can see the private
draft immediately; team distribution and catalog promotion still pass the safety gates.

The future physics-based arcade hockey game is separate from existing RinkReads arcade
training shells and from the React animated-play timeline. It requires its own design
before implementation.

---

## Standing guardrails for the overnight build

- No `git push`, no PR, no merge to `master`/`main`, no deploy, nothing posted or sent.
  Thomas reviews in the morning.
- Never overwrite `src/data/bank.json` or `src/data/povQuestions.json` in place with
  generated content. Stage, then promote through the existing gate.
- Never weaken, skip, or delete an existing test or gate to make something pass.
- Never ship a question whose correctness the engine cannot justify from the knowledge
  base or from kernel geometry.
- Work on `feature/shareable-beta` or a local branch off it.

## Open implementation choices

- Which tactical families to seed after the breakout calibration fixture. Regenerate the
  current family-coverage report before choosing; do not rely on the July 21 counts.
  The existing `2-on-1` kernel remains the reference implementation pattern.

---

## Framework-fit decisions (2026-07-29, approved ahead of the implementation plan)

Codex ran a read-only fit audit of the design above against the existing codebase
(`docs/handoffs/2026-07-29-codex-scenario-engine-foundation-handoff.md`) and surfaced nine
concrete conflicts needing an owner call before a plan could be written. Thomas approved
all nine as recommended, verbatim "Approve 1-9," 2026-07-29. These are now binding on the
implementation plan, same authority tier as Decisions 1-5 above.

1. **Canonical playback** — `CompiledTeachingPlay` is the one authoritative source for
   timing. Player, coach preview, and video export all read the same deterministic clock.
   The current v1 `AnimatedPlay.jsx` (fixed 1.4s CSS transitions) stays as-is; only a thin
   adapter bridges old to new. No rewrite of the live renderer.
2. **Promoted catalog format** — new content-addressed promoted-artifact JSON plus an
   append-only run/event ledger on the filesystem. `playCatalog.js` and `bank.json` are
   never hand-edited again; promotion becomes a scripted, idempotent step.
3. **Tactical knowledge location** — approved tactical claims live in a factory-only store
   outside `src/`. Only approved claim IDs get compiled into the shipped app; unapproved
   claims never reach product code.
4. **Coach MVP product surface** — "Create a play" ships inside the existing TEAM coach
   dashboard, not a new standalone surface, gated to an allowlist of coaches initially.
5. **Coach authorization and ownership** — server-owned active TEAM entitlement check +
   coach role + team ownership + dedicated RLS policies, closing the current gap where
   `profile.tier` is client-writable and `question_overrides` accepts writes from any
   authenticated user. One owning coach and one team per draft for MVP; assistant-coach
   collaboration is deferred.
6. **Coach editor and storage** — top-down schematic editor (place actors/puck, draw
   routes, set timing/freeze/declared-read) storing drafts in Supabase with optimistic
   hash/revision checks; saved versions are immutable once finalized.
7. **Video export** — isolated Remotion/Node worker consuming the compiled artifact.
   First output is a private 1080p 16:9 MP4 behind signed team-only links. No anonymous
   public export in the MVP.
8. **Claude scheduling** — Claude's hockey-judgment step runs only from an active,
   supported Claude session (present/attended), never headless/unattended, until a
   supported headless subscription-session handshake is explicitly proven safe.
   Deterministic physics and Ollama mechanical variation may still run on a schedule.
9. **Manual graduation and legacy freeze** — the July 10 question-kind approval certifies
   the UI only, not the engine; the existing three-play/all-band manual graduation
   standard still applies to new kernels/templates. All direct-write legacy tools are
   frozen effective now: `ScenarioEditor`'s force-save path, `tools/seed-editor-plugin.mjs`
   `force` flag, `tools/review-store.mjs` direct `bank.json` writes, `tools/scenario-author.mjs`
   default live-seed writes, `scripts/generate-questions.mjs`, `scripts/batch-approve.mjs`,
   and the current `tools/scenario-engine-overnight.ps1` runner (uses
   `--dangerously-skip-permissions`, no single-instance lock). None of these write live
   product data again until the new pipeline replaces them.

**Known bugs to fix regardless of the plan's scope** (independent of the nine decisions):

- `report-kernel-expansion.mjs` and `test-play-kernels.mjs` read a validator result
  property as `.errors`; the validator actually returns `.errs`. This is a silent
  false-positive in existing gate reporting — fix the property name and add a
  deliberately-invalid fixture that proves the gate actually fails when it should.
- The uncommitted defensive-zone breakout fixture must be hashed and its source state
  recorded *before* any adaptation toward the new pipeline — it is the one proof case the
  whole foundation's "does this work end-to-end" claim depends on.

**Windows task `RinkReads-ScenarioEngine-Overnight`:** confirmed still `Disabled`
(`Enabled: False`) as of this audit. Nothing was changed. Do not enable or patch it; a
compliant replacement runner is part of the implementation plan.

---

## Curriculum/teaching-progression decision (2026-07-29, approved)

Chris Oliver's Basketball Decision Training methodology (constraints-led coaching,
Blocked→Random practice progression — sourced from public Basketball Immersion
material, not assumed from name recognition) is now the governing philosophy for how
scenario families sequence their teaching arc. Full grounding, the four translated
principles, the five-question rubric, and a worked-example audit of `two_on_one`'s
real arc:
`docs/superpowers/specs/2026-07-29-decision-training-curriculum-philosophy-design.md`.

Incorporated into `docs/scenario-family-standards.md` (2026-07-29 edit): a new
"Decision-Training Principles" section governs; "Family Completion" and "Recommended
Development Order" updated so a family's final variant must be genuinely more open
(multiple viable reads requiring live discrimination) rather than merely another cue
variant at the same openness level. "Variant Rules" is unchanged — it remains valid
cue-hygiene and is still the section quoted verbatim into the scenario-family
templating FINAL design's semantic-novelty rubric prompt, so that technical design is
unaffected by this edit.

**Where this decision and any earlier family-design guidance conflict, this decision
takes precedence** — Thomas's explicit direction: "incorporate this into the existing
framework, with this new approach taking precedence."

**What this does not do:** it does not change any existing family's actual content
(teachingArc arrays, implemented plays) — it changes the standard new or audited
families are measured against. The worked-example audit found `two_on_one`'s current
six-entry arc reads as "one decision tested six ways" (two parallel forced reads, then
four robustness wrinkles) rather than a real constrain→open ladder — that finding is
recorded, but retrofitting `two_on_one` or any other existing family is a separate,
not-yet-authorized follow-on task, not something this decision does on its own.
