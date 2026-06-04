# Visual Question Track + 4-Coach Geometry Panel — Design Spec

**Status:** approved 2026-06-04. Adds drawn-on-ice (scenario) questions to the gauntlet and a
4-coach visual-geometry panel that reviews the picture after the hockey coaches review the read.

## Context

The gauntlet generator currently makes **text-only** multiple-choice questions. The original
product vision (and what the user keeps asking to see) is the **visual** question: the play drawn
on a top-down rink, where a kid sees the situation and taps the read. This was the deferred
"geometry" path. The trigger for building it now: a hand-drawn mockup had bad geometry (teammate
positioned behind the puck carrier, defender off to the side of the net) — exactly the class of
flaw a dedicated visual review must catch. So this spec builds **two coupled pieces**:

- **A — Visual question generation:** the gauntlet authors *scenario* questions (players at real
  rink coordinates) using the engine that already exists, tags them to a ledger node, and routes
  them through gates into the review queue / bank.
- **B — Visual geometry panel:** a 4-coach debating panel (one perfectionist, one antagonistic,
  one spatial-realism, one kid-clarity) that reviews only the picture/positions, after the hockey
  coach panel approves the read.

B is meaningless without A, so they ship together (build order in §7).

## Decisions (locked in brainstorming 2026-06-04)

- **Order is sequential, hockey first:** hockey coach panel (the read) → THEN visual panel (the
  picture). Rationale: get the hockey/read right before perfecting geometry; parallel risked
  conflicting rework (a geometry fix changes the read, a read fix moves players).
- **Visual panel = 4 coaches, all must pass:** Perfectionist · Antagonistic · Spatial-realism ·
  Kid-clarity. Same machinery as the hockey panel (blind round → debate → unanimous "perfect" →
  rework → drop+learn). Then → Head Coach.
- **Visual coaches reason from coordinates** (each actor's x,y vs puck and net) plus a generated
  ASCII depiction — no multimodal/image input needed.
- **Build A + B together.**

## Architecture

A second track inside `tools/gauntlet-run.mjs`, selected by `--visual`. The text track is
unchanged. Reuses the existing scenario engine and the panel/debate/drop-learn machinery.

```
G0  Create (visual)  — author a Scenario (actors at normalized rink coords,
     interaction, correct read), tagged with nodeId. Reuses the scenario-author
     authoring approach (claude CLI) so output is engine-shaped.
 ↓
G1-3 Deterministic   — the engine's own validators: validateScenario (shape,
     coords in [0,1], no overlapping actors, defender-interception) +
     runHockeyValidators (40 hockey-logic rules) + scorer self-test + dedupe.
 ↓
G4  Curriculum confirmer (1 agent) — one concept, age load, follows the node.
 ↓
G7  HOCKEY coach panel (3 agents, debate → unanimous) — is the READ correct
     given the positions? (reuses the text track's PANEL_LENSES, prompts fed the
     scenario geometry instead of MC options)
 ↓
G7.5 VISUAL geometry panel (4 agents, debate → unanimous)        ★ NEW
     Perfectionist · Antagonistic · Spatial-realism · Kid-clarity.
     Judges ONLY the picture: are players where they'd really be for this play,
     is the read visible, unambiguous, legible, on-brand/colorblind-safe?
 ↓
G8  Head Coach → review queue → #review (renders the scenario) → bank
```

Any gate failure → rework loop back to the creator (cap `--rounds`). After the cap → **drop +
learn**: hockey-read failures distill into the existing text/read lessons; **geometry failures
distill into a separate visual-lessons store** fed back into the *visual creator* prompt.

### The 4 visual lenses

| Coach | Judges |
|---|---|
| **Perfectionist** | Every position exact; truly excellent or nothing. Spacing, alignment, the read drawn cleanly. |
| **Antagonistic** | Actively tries to break it: ambiguity, a misleading angle, a player who "wouldn't be there," two plausible reads. |
| **Spatial-realism** | Does each actor sit where they'd *actually* be for this exact play, relative to the puck and the net? (Catches teammate-behind / defender-to-the-side.) |
| **Kid-clarity** | Would a child of this age instantly understand the situation and *see* the read from the picture alone? Legible tokens, not crowded. |

Each returns `{verdict:"PASS"|"REVISE","critique":[...]}`; unanimous PASS advances; debate rounds
share peers' critiques (perfectionist/antagonistic hold the line). Identical control flow to
`runPanel` in the text track.

## Components / files

**Reuse (no rewrite):**
- Scenario engine: `src/scenario/schema.js` (`validateScenario`, `RINK_W/RINK_H`, `denorm`),
  `src/scenario/validators.js` (`runHockeyValidators`), `src/scenario/ScenarioRenderer.jsx`.
- Scenario authoring pattern: `tools/scenario-author.mjs` + `tools/scenario-author/prompt.js` /
  `validate.mjs` (already authors+validates scenario JSON via the claude CLI).
- Gauntlet machinery: `runAgent` (`tools/lib/claude-agent.mjs`), the panel/debate/drop-learn
  control flow in `tools/gauntlet-run.mjs`, the lessons store (`tools/gauntlet/lessons.mjs`),
  ledger reader, review-store.

**Create:**
- `tools/gauntlet/ascii-rink.mjs` — pure: `asciiRink(scenario)` → a small text grid of actor
  positions (for the visual coach prompts). Unit-tested. (May reuse `tools/scenario-author/ascii.mjs`.)
- `tools/gauntlet/visual-prompts.mjs` — `buildVisualCreatorPrompt`, `VISUAL_LENSES` (the 4),
  `buildVisualCoachPrompt({scenario, ascii, lens, others})`, `buildVisualLessonExtractorPrompt`.
- `tools/gauntlet/visual-lessons.json` — separate lessons store for geometry rules (starts empty).

**Modify:**
- `tools/gauntlet-run.mjs` — `--visual` flag; a `generateVisualOne()` that authors a scenario,
  runs engine-validate → curriculum → hockey panel → `runVisualPanel()` (4 lenses, debate) → head
  coach → queue; visual drop+learn into `visual-lessons.json`.
- `src/App.jsx` — extend `QuestionPlayerView` to render `type:"scenario"` via `ScenarioRenderer`
  (so `#review` and `#q=` show drawn questions, not just text). Small, isolated change.
- review-queue item `question` carries the full scenario object (already supported by `enqueue`).

## How agents see geometry

The visual creator emits normalized coords. `asciiRink(scenario)` turns those into a compact text
map (net on the right, blue/goal lines, tokens YOU/T/D/G at their cells). The visual coach prompts
include both the raw coords and the ASCII, plus the read. This is enough to judge realism and
clarity without rendering pixels. The human still sees the real rendered rink in `#review`.

## Testing / verification

- **Unit:** `ascii-rink.test.mjs` (coords → expected grid); `visual-prompts.test.mjs` (4 lenses
  exist incl. perfectionist+antagonistic; prompts embed coords/ascii/peer-critiques). Existing
  text-track tests stay green.
- **Mock:** `--visual --mock` runs the full visual control flow with canned verdicts (happy path
  queues a scenario; `--mock-fail` drops + writes a visual lesson). Forced-fail exercises drop+learn.
- **Live smoke:** `--visual --node u11.decision-making` → a real scenario authored, engine-valid,
  panels run; inspect the queued scenario's coords for sane geometry.
- **App:** `#review` renders the queued scenario on the rink (verify a kid-accurate picture); `npm
  run build` green; `npm run test:ledger` VALID.

## Build order (two reviewable stages)

1. **Stage 1 — generation + render:** visual creator + engine validate + dedupe → queue, and
   `QuestionPlayerView` renders scenarios. *Deliverable: a real drawn question you can see in
   `#review`.* (No new panels yet; reuse existing hockey panel + head coach minimally or `--fast`.)
2. **Stage 2 — the panels:** the 4-coach visual panel + the hockey panel adapted to scenario
   geometry + drop+learn into `visual-lessons.json`. *Deliverable: drawn questions only reach you
   after clearing both panels.*

## Cost

A visual question ≈ creator + curriculum + (3 hockey coaches × debate) + (4 visual coaches ×
debate) + head coach ≈ 10–18+ `claude` calls. Free on Max, slow. `--fast`/`--mock` remain.

## Out of scope
- The geometric **solver** as answer key (correct-by-construction): the scenario engine has a
  scorer; wiring it as the deterministic G1 answer-key for generated scenarios is a later
  enhancement. For now the hockey panel is the read authority (as in the text track).
- The founder-proxy gate (separate spec). Auto-routing text-vs-visual by age/type (manual
  `--visual` for now). Animated/multi-keyframe scenes.
