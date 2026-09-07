# Multi-Step Scenarios (true in-play reads) Design

**Status:** design, ready for review · **Date:** 2026-06-12
**Origin:** Thomas's #triage feedback (theme ③): several questions need a second-order read
("if the defender stays vs goes with you," "after the shot or pass, what next"). The scenario
engine is single-step today, so this is a new capability. It is also the proper fix for the
single-option problem (theme ①): a scripted second read turns a thin question into a genuine
sequence.

**Scope:** Phase 1 only (the format + engine + one hand-authored proof seed). Teaching the
gauntlet to GENERATE multi-step plays is a separate, later spec.

---

## 1. What a multi-step play is

One scenario that runs as a short sequence of frames. The player makes a read, sees what
happened, the scene evolves to the next frame, and reads again. The evolution is scripted by
the author (each frame is drawn outright), NOT generated from the player's choice. (Choice-
driven branching was explicitly set aside as too heavy.)

```text
[Frame 1: you enter, D stepping up]   -> "tap your best option"  -> tap -> grade
        v  reveal: step feedback + "The D went with you — the trailer is open"
[Frame 2: D has committed, trailer late]  -> "now what?"  -> tap -> grade
        v  final: read 1 result + read 2 result   (each read scored independently)
```

The play ALWAYS runs every frame (decided 2026-06-12): even a wrong first read shows the
correct outcome and continues, so every play teaches the whole sequence. Each read is scored
independently.

---

## 2. Data model

A scenario gains an optional `steps[]` array. Each step is a full frame: its own `actors`,
`interaction`, `correct`, and `feedback`, plus an `outcome` caption (the "what happened" line
shown in the reveal before the next frame). `stage`, curriculum tags, `tip`, and `why` stay at
the top level (constant across the play). The final step has no `outcome` (it ends the play).

```jsonc
{
  "id": "u13_oz_entry_trailer_v2",
  "type": "scenario",
  "nodeId": "u13.reading-the-play",
  "level": "U13 / Peewee",
  "levels": ["U13 / Peewee"],
  "themes": ["zone-entry", "decision-making"],
  "cat": "Transition",
  "difficulty": 2,
  "stage": { "view": "right", "zone": "off-zone" },
  "steps": [
    {
      "actors": [ /* frame 1 */ ],
      "interaction": { "kind": "selection", "prompt": "...", "from": ["..."] },
      "correct": { "kind": "selection", "ids": ["..."] },
      "feedback": { "right": "...", "wrong": "..." },
      "outcome": "The D committed to you, so the cross-ice lane closed."
    },
    {
      "actors": [ /* frame 2: evolved */ ],
      "interaction": { "kind": "point", "prompt": "...", },
      "correct": { "kind": "point", "x": 0.0, "y": 0.0, "tolerance": 0.08 },
      "feedback": { "right": "...", "wrong": "..." }
    }
  ],
  "tip": "...",
  "why": "..."
}
```

**Chosen representation: full-scene-per-step.** The author draws each frame's complete
`actors` list. The rejected alternative (a base scene plus per-step position deltas) saves some
authoring redundancy but adds engine complexity and is harder to validate; full-scene is
simpler in the renderer, the validator, and authoring, and Thomas already authors whole boards.

**Backward compatible.** A scenario WITHOUT `steps` (every one of the 23 current seeds) is
treated as a one-step play. No existing content changes.

---

## 3. Engine surface

Each piece is a focused unit that reuses the existing single-step machinery; the only new
behavior is sequencing plus the reveal beat.

- **`src/scenario/schema.js`** — add the optional `steps[]` to the schema. `validateScenario`
  validates each step's `actors` / `interaction` / `correct` with the SAME per-scene rules used
  today. With no `steps`, it validates the flat scenario exactly as now. A scenario may have
  EITHER the flat interaction fields OR `steps`, never both.
- **`src/scenario/multiStep.js` (new) — the step-progression state machine.** Pure logic, no
  DOM: holds `stepIndex`, the per-step results array, `current()`, `answer(result)`,
  `advance()`, `isComplete()`, and `summary()`. This is the unit under test.
- **`src/scenario/MultiStepPlayer.jsx` (new) — a thin player component.** Drives the state
  machine: renders `steps[stepIndex].actors` + its interaction through the EXISTING primitive
  renderers, grades with the EXISTING scorers, shows the reveal (the step's `feedback` for the
  answer given + its `outcome` + a Continue control), advances, and renders a final per-step
  summary when complete. Adds only sequencing and the reveal; no new primitive logic.
- **`src/scenario/ScenarioRenderer.jsx` (modify)** — dispatch: if a scenario has `steps`, render
  `MultiStepPlayer`; otherwise the current single-step path, unchanged.
- **`src/scenario/validators.js` + `tools/scenario-author/validate.mjs` (lintScenario)** —
  iterate `steps` and run the current per-scene rules (overlap, goal-side-defender, age markers,
  difficulty floor, etc.) on each frame. A flat scenario lints exactly as today.
- **Scorers** — reused unchanged; called once per step.
- **`src/qbLoader.js` / bank** — a multi-step scenario is still one `type:"scenario"` bank item;
  the loader passes it through with no change.

---

## 4. Telemetry

Record each step's correctness, not just a single play-level pass, so empirical difficulty and
the review signals still work at the granularity of each read. Concretely: add a `step_index`
field (default `0` for single-step plays) to the existing per-answer record that already keys on
`question_id`, so every read is one row. The play-level result ("both reads correct") is derived
from those rows. This is the whole Phase 1 telemetry change; richer per-step analytics can come
with Phase 2.

---

## 5. Testing

- **State machine (pure unit tests):** advance through steps; a wrong early read still advances
  and is recorded wrong; `summary()` reflects each step's result; `isComplete()` fires only
  after the last step.
- **Validation:** a multi-step scenario with a bad frame (e.g. overlapping actors in step 2, or
  a step-2 answer that does not grade) fails lint; a clean one passes.
- **Backward compatibility:** an existing flat seed (no `steps`) still validates and plays as a
  one-step scenario, unchanged.
- **Scorer reuse:** each step grades with the existing per-primitive scorer.
- **Proof seed:** rebuild `u13_oz_entry_trailer` as a 2-step play (`_v2`) and confirm it lints,
  plays through both reads, reveals the outcome between them, and reports per-step results.

---

## 6. Decisions locked (2026-06-12)

- **Shape:** true multi-step (one play, scene evolves between reads), NOT choice-driven
  branching and NOT separate "variant family" seeds.
- **Evolution:** scripted by the author; each step carries its full scene (full-scene-per-step).
- **Step-1 handling:** always continue and show the correct outcome, whatever the player
  answered; each read scored independently.
- **Backward compatibility:** `steps` is optional; flat scenarios are one-step. No existing seed
  changes.
- **Scope:** Phase 1 = format + state machine + player + per-step lint + per-step telemetry +
  one hand-authored proof seed. Gauntlet GENERATION of multi-step plays is a separate later
  spec (Phase 2).

---

## 7. Out of scope (this spec)

- Choice-driven / conditional branching (a real decision tree).
- Gauntlet generation of multi-step plays and the decision-richness gate applied per step
  (Phase 2).
- The goalie-reading concept (theme ④) — its own design; note that a goalie read is a natural
  multi-step use case ("goalie set -> pass to move them; goalie bit -> shoot the open side").
- Animated transitions between frames; Phase 1 uses a render of the next frame with the
  `outcome` caption and a Continue control (no tweening required).
