# Multi-Step Scenarios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one scenario run as a short sequence of frames — the player reads, sees what happened, the scene evolves, and they read again — without rewriting any existing single-step machinery.

**Architecture:** A scenario gains an optional `steps[]` array (full scene per step). The unifying trick: each step is treated as a synthetic flat scenario `{...topLevelFields, ...step}`, so validation, linting, and rendering all REUSE the existing single-step code per frame. A small pure state machine sequences the steps; a thin player component drives it, reusing `ScenarioRenderer` for each frame plus a reveal beat between frames. Flat scenarios (no `steps`) are unchanged — they're a 1-step play.

**Tech Stack:** Node ESM + React (Vite, plain JSX). Pure logic is unit-tested with the repo's plain-node `ok()` harness (run via `node path/file.test.mjs`); JSX is not unit-tested (no test runner), so all logic lives in testable pure modules.

---

## File Structure

| File | Responsibility | New/Modify |
|------|----------------|------------|
| `src/scenario/multiStep.js` | Pure: `normalizeSteps`, `stepToScenario`, and the step-progression state machine (`start`/`record`/`next`/`currentStep`/`isComplete`/`summary`) | **New** |
| `src/scenario/multiStep.test.mjs` | Unit tests for the above (plain-node `ok()` harness) | **New** |
| `src/scenario/schema.js` | `validateScenario` validates `steps[]` (each step via the synthetic-scenario recursion); rejects flat+steps together | Modify |
| `src/scenario/schema-multistep.test.mjs` | Tests `validateScenario` on multi-step scenarios | **New** |
| `tools/scenario-author/validate.mjs` | `lintScenario` lints each step (synthetic-scenario per frame) and aggregates | Modify |
| `scripts/test-rules.mjs` | Add multi-step lint golden cases | Modify |
| `src/scenario/MultiStepPlayer.jsx` | Thin player: drives the state machine, renders each frame via `ScenarioRenderer`, shows the reveal (`outcome` + Continue) + final summary | **New** |
| `src/scenario/ScenarioRenderer.jsx` | Dispatch: if `scenario.steps`, render `MultiStepPlayer`; else current path | Modify |
| `src/scenario/seeds/u13_oz_entry_trailer_v2.json` | Proof seed: a 2-step play | **New** |

---

## Task 1: The `multiStep.js` pure module (normalize + synthetic step + state machine)

**Files:**
- Create: `src/scenario/multiStep.js`
- Create: `src/scenario/multiStep.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/scenario/multiStep.test.mjs`:
```js
#!/usr/bin/env node
// Run: node src/scenario/multiStep.test.mjs
import { normalizeSteps, stepToScenario, start, record, next, currentStep, isComplete, summary } from "./multiStep.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// A flat (single-step) scenario normalizes to one step
const flat = { id: "f", type: "scenario", nodeId: "u11.x", stage: { view: "right", zone: "off-zone" },
  actors: [{ id: "you", kind: "player", x: 0.7, y: 0.5 }], interaction: { kind: "point", prompt: "tap" },
  correct: { kind: "point", x: 0.7, y: 0.3, tolerance: 0.08 }, feedback: { right: "y", wrong: "n" } };
ok("flat -> 1 step", normalizeSteps(flat).length === 1);

// A multi-step scenario normalizes to its steps
const multi = { id: "m", type: "scenario", nodeId: "u13.x", stage: { view: "right", zone: "off-zone" },
  steps: [
    { actors: [{ id: "you", kind: "player", x: 0.7, y: 0.5 }], interaction: { kind: "selection", prompt: "p1", from: ["you"] }, correct: { kind: "selection", ids: ["you"] }, feedback: { right: "r1", wrong: "w1" }, outcome: "happened" },
    { actors: [{ id: "you", kind: "player", x: 0.7, y: 0.3 }], interaction: { kind: "point", prompt: "p2" }, correct: { kind: "point", x: 0.7, y: 0.3, tolerance: 0.08 }, feedback: { right: "r2", wrong: "w2" } },
  ] };
ok("multi -> 2 steps", normalizeSteps(multi).length === 2);

// stepToScenario merges top-level fields with a step and drops `steps`
const s0 = stepToScenario(multi, 0);
ok("stepToScenario carries id+stage+nodeId", s0.id === "m" && s0.stage.view === "right" && s0.nodeId === "u13.x");
ok("stepToScenario inlines the step's interaction", s0.interaction.prompt === "p1");
ok("stepToScenario has no steps key", !("steps" in s0));

// State machine: advance through both steps, recording results
let st = start(multi);
ok("starts at step 0", currentStep(st).interaction.prompt === "p1");
ok("not complete at start", isComplete(st) === false);
st = record(st, { ok: false, reason: "wrong" }); // wrong first read still advances
st = next(st);
ok("advances to step 1", currentStep(st).interaction.prompt === "p2");
ok("still not complete", isComplete(st) === false);
st = record(st, { ok: true, reason: "ok" });
st = next(st);
ok("complete after last step", isComplete(st) === true);
const sm = summary(st);
ok("summary counts steps", sm.total === 2 && sm.correct === 1);
ok("summary keeps per-step results", sm.perStep[0] === false && sm.perStep[1] === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node src/scenario/multiStep.test.mjs`
Expected: FAIL (`multiStep.js` does not exist).

- [ ] **Step 3: Implement `multiStep.js`**

Create `src/scenario/multiStep.js`:
```js
// Multi-step scenario support. A scenario MAY carry a steps[] array (each entry
// a full frame: actors / interaction / correct / feedback / outcome). The whole
// design rests on one idea: each step is validated and rendered as a synthetic
// FLAT scenario (top-level fields + the step's fields, minus steps), so all the
// existing single-step machinery is reused per frame. A flat scenario is a
// one-step play. This module is pure (no React) so it is unit-testable.

// The steps of a scenario: its steps[] if present, else the flat scenario as one step.
export function normalizeSteps(scenario) {
  if (Array.isArray(scenario.steps) && scenario.steps.length) return scenario.steps;
  const { actors, interaction, correct, feedback, tip, why } = scenario;
  return [{ actors, interaction, correct, feedback, tip, why }];
}

// Build the synthetic flat scenario for step i: top-level fields (minus steps)
// overlaid with the step's own fields. Used by validation, lint, and the player.
export function stepToScenario(scenario, i) {
  const step = normalizeSteps(scenario)[i];
  const { steps, ...top } = scenario;
  return { ...top, ...step };
}

// ---- progression state machine (immutable; each fn returns a new state) ----
export function start(scenario) {
  return { scenario, steps: normalizeSteps(scenario), index: 0, results: [] };
}
export function currentStep(state) { return state.steps[state.index]; }
export function record(state, result) {
  const results = state.results.slice();
  results[state.index] = result;
  return { ...state, results };
}
export function next(state) { return { ...state, index: state.index + 1 }; }
export function isComplete(state) { return state.index >= state.steps.length; }
export function summary(state) {
  const perStep = state.steps.map((_, i) => !!(state.results[i] && state.results[i].ok));
  return { total: state.steps.length, correct: perStep.filter(Boolean).length, perStep };
}
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node src/scenario/multiStep.test.mjs`
Expected: PASS (all assertions, `0 failed`).

- [ ] **Step 5: Commit**
```
git add src/scenario/multiStep.js src/scenario/multiStep.test.mjs
git commit -m "feat(scenario): multiStep.js — normalize/synthetic-step + progression state machine"
```

---

## Task 2: Validate `steps[]` in `schema.js`

**Files:**
- Modify: `src/scenario/schema.js` (`validateScenario`, around line 215)
- Create: `src/scenario/schema-multistep.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/scenario/schema-multistep.test.mjs`:
```js
#!/usr/bin/env node
// Run: node src/scenario/schema-multistep.test.mjs
import { validateScenario } from "./schema.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const baseStep = (extra = {}) => ({
  actors: [{ id: "you", kind: "player", x: 0.7, y: 0.5 }, { id: "t", kind: "teammate", x: 0.6, y: 0.3 }],
  interaction: { kind: "selection", prompt: "tap the open one", from: ["you", "t"] },
  correct: { kind: "selection", ids: ["t"] }, feedback: { right: "yes", wrong: "no" }, ...extra,
});
const multi = (steps) => ({ id: "m", type: "scenario", stage: { view: "right", zone: "off-zone" }, steps });

ok("valid 2-step passes", validateScenario(multi([baseStep({ outcome: "x" }), baseStep()])).ok === true);

// a bad step fails, with the step index in the error
const bad = validateScenario(multi([baseStep(), { ...baseStep(), interaction: { kind: "nope" } }]));
ok("bad step fails", bad.ok === false);
ok("error names the step", bad.errs.some(e => /step\s*\[?1/i.test(e)));

// flat + steps together is rejected
const both = { id: "b", type: "scenario", stage: { view: "right", zone: "off-zone" },
  interaction: { kind: "point", prompt: "p" }, correct: { kind: "point", x: 0.5, y: 0.5, tolerance: 0.08 },
  feedback: { right: "y", wrong: "n" }, actors: [{ id: "you", kind: "player", x: 0.5, y: 0.5 }],
  steps: [baseStep()] };
ok("flat + steps rejected", validateScenario(both).ok === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, verify it fails**

Run: `node src/scenario/schema-multistep.test.mjs`
Expected: FAIL (multi-step scenarios currently fail because `validateScenario` requires a flat `actors`/`interaction`).

- [ ] **Step 3: Implement the steps branch**

In `src/scenario/schema.js`, add an import at the top of the file (after the existing imports near the top):
```js
import { stepToScenario } from "./multiStep.js";
```
Then in `validateScenario(s)` (line 215), immediately after the `type`/`id` checks and before the `stage`/`actors` validation (i.e. right after the `if (!s.id) errs.push("missing id");` line), insert the multi-step branch:
```js
  if (Array.isArray(s.steps)) {
    if (s.interaction || s.actors || s.correct) {
      errs.push("a scenario has EITHER flat interaction fields OR steps[], not both");
    }
    if (!s.steps.length) errs.push("steps[] must not be empty");
    s.steps.forEach((_, i) => {
      const r = validateScenario(stepToScenario(s, i));
      if (!r.ok) r.errs.forEach((e) => errs.push(`step[${i}]: ${e}`));
    });
    return { ok: errs.length === 0, errs, warns };
  }
```
(The recursion validates each synthetic flat frame with the full existing ruleset, then returns early so the flat-path checks below don't run on a step-less wrapper.)

- [ ] **Step 4: Run it, verify it passes**

Run: `node src/scenario/schema-multistep.test.mjs`
Expected: PASS (`0 failed`).

- [ ] **Step 5: Confirm no regression on flat scenarios**

Run: `node scripts/test-rules.mjs`
Expected: `23/23 passed` (unchanged — flat scenarios never hit the new branch).

- [ ] **Step 6: Commit**
```
git add src/scenario/schema.js src/scenario/schema-multistep.test.mjs
git commit -m "feat(scenario): validateScenario validates steps[] per-frame (synthetic recursion)"
```

---

## Task 3: Lint `steps[]` per frame in `lintScenario`

**Files:**
- Modify: `tools/scenario-author/validate.mjs` (`lintScenario`, top of the function ~line 14)
- Modify: `scripts/test-rules.mjs` (add cases)

- [ ] **Step 1: Write the failing test**

In `scripts/test-rules.mjs`, find the `cases` array (it starts `const cases = [`) and add these two entries inside it (after the first `GOOD seed passes` entry is fine):
```js
  {
    name: "multi-step: both clean frames pass",
    seed: (() => {
      const s = clone();
      const frame = () => ({ actors: JSON.parse(JSON.stringify(s.actors)), interaction: s.interaction, correct: s.correct, feedback: s.feedback });
      return { id: s.id, type: "scenario", nodeId: s.nodeId, levels: s.levels, themes: s.themes, cat: s.cat, difficulty: s.difficulty, stage: s.stage, steps: [ { ...frame(), outcome: "x" }, frame() ] };
    })(),
    expectOk: true,
  },
  {
    name: "multi-step: an overlapping actor in step 2 fails with step index",
    seed: (() => {
      const s = clone();
      const frame = () => ({ actors: JSON.parse(JSON.stringify(s.actors)), interaction: s.interaction, correct: s.correct, feedback: s.feedback });
      const bad = frame(); bad.actors[1].x = bad.actors[0].x; bad.actors[1].y = bad.actors[0].y; // force overlap
      return { id: s.id, type: "scenario", nodeId: s.nodeId, levels: s.levels, themes: s.themes, cat: s.cat, difficulty: s.difficulty, stage: s.stage, steps: [ { ...frame(), outcome: "x" }, bad ] };
    })(),
    expectErr: "step[1]",
  },
```

- [ ] **Step 2: Run it, verify the new cases fail**

Run: `node scripts/test-rules.mjs`
Expected: the two new cases FAIL (lintScenario doesn't understand `steps` yet — the clean one errors and the bad one doesn't carry `step[1]`).

- [ ] **Step 3: Implement the steps branch in `lintScenario`**

In `tools/scenario-author/validate.mjs`, add an import near the other imports at the top:
```js
import { stepToScenario } from "../../src/scenario/multiStep.js";
```
Then at the very start of `export function lintScenario(scenario) {` (before the existing `const v = validateScenario(scenario);` line), insert:
```js
  if (Array.isArray(scenario.steps)) {
    // Validate structure across all frames first.
    const v0 = validateScenario(scenario);
    if (!v0.ok) return { ok: false, errs: v0.errs, warns: v0.warns || [] };
    // Then run the full hockey lint on each frame (synthetic flat scenario).
    const errs = [];
    scenario.steps.forEach((_, i) => {
      const r = lintScenario(stepToScenario(scenario, i));
      if (!r.ok) r.errs.forEach((e) => errs.push(`step[${i}]: ${e}`));
    });
    return { ok: errs.length === 0, errs, warns: [] };
  }
```

- [ ] **Step 4: Run it, verify it passes**

Run: `node scripts/test-rules.mjs`
Expected: all cases pass, including the two new multi-step ones, and the existing `23/23` (now more) all green.

- [ ] **Step 5: Commit**
```
git add tools/scenario-author/validate.mjs scripts/test-rules.mjs
git commit -m "feat(scenario): lintScenario lints multi-step frames per step"
```

---

## Task 4: The proof seed (2-step entry trailer)

**Files:**
- Create: `src/scenario/seeds/u13_oz_entry_trailer_v2.json`

- [ ] **Step 1: Write the seed**

Create `src/scenario/seeds/u13_oz_entry_trailer_v2.json`:
```json
{
  "id": "u13_oz_entry_trailer_v2",
  "type": "scenario",
  "nodeId": "u13.reading-the-play",
  "level": "U13 / Peewee",
  "levels": ["U13 / Peewee"],
  "themes": ["zone-entry", "decision-making", "delay"],
  "cat": "Transition",
  "difficulty": 2,
  "stage": { "view": "right", "zone": "off-zone" },
  "steps": [
    {
      "actors": [
        { "id": "you", "kind": "player",   "x": 0.72, "y": 0.45, "tag": "YOU" },
        { "id": "puck","kind": "puck",     "x": 0.722,"y": 0.448 },
        { "id": "c",   "kind": "teammate", "x": 0.60, "y": 0.52, "tag": "C" },
        { "id": "rw",  "kind": "teammate", "x": 0.84, "y": 0.74, "tag": "RW" },
        { "id": "ld",  "kind": "teammate", "x": 0.66, "y": 0.22, "tag": "LD" },
        { "id": "d1",  "kind": "defender", "x": 0.80, "y": 0.50, "tag": "" },
        { "id": "g",   "kind": "goalie",   "x": 0.918,"y": 0.50, "tag": "" }
      ],
      "interaction": { "kind": "selection", "prompt": "You carry in and the D steps up to challenge. Tap the option that makes the D commit so you can attack the space behind.", "from": ["c", "rw", "ld"], "order": "any" },
      "correct": { "kind": "selection", "ids": ["c"] },
      "feedback": {
        "right": "Delay to the trailing center. Holding the puck a beat draws the D to you and opens the ice the trailer is skating into.",
        "wrong": "The RW is covered wide and the point is a passive bail-out. Make the D respect you first — drop to the center coming late with speed."
      },
      "outcome": "The D committed to you, and the center broke into the high slot with speed."
    },
    {
      "actors": [
        { "id": "you", "kind": "player",   "x": 0.74, "y": 0.46, "tag": "YOU" },
        { "id": "puck","kind": "puck",     "x": 0.742,"y": 0.458 },
        { "id": "c",   "kind": "teammate", "x": 0.72, "y": 0.30, "tag": "C" },
        { "id": "rw",  "kind": "teammate", "x": 0.86, "y": 0.74, "tag": "RW" },
        { "id": "d1",  "kind": "defender", "x": 0.80, "y": 0.55, "tag": "" },
        { "id": "g",   "kind": "goalie",   "x": 0.918,"y": 0.50, "tag": "" }
      ],
      "interaction": { "kind": "point", "prompt": "The D bit. Hit the trailing center in stride — tap where to put the puck." },
      "correct": { "kind": "point", "x": 0.70, "y": 0.26, "tolerance": 0.08 },
      "feedback": {
        "right": "Lead the center into the high slot. The puck arrives where they're skating, not where they are, for a clean shot.",
        "wrong": "Passing behind the trailer kills their speed. Lead them into the space the D just vacated."
      }
    }
  ],
  "tip": "Make the defender commit, then attack the ice they leave behind.",
  "why": "A delay-and-drop turns a contested entry into a clean look: the first read draws the defender, the second hits the trailer in the space that opens."
}
```

- [ ] **Step 2: Lint the seed**

Run:
```
node -e "import('./tools/scenario-author/validate.mjs').then(async ({lintScenario})=>{const fs=await import('node:fs');const s=JSON.parse(fs.readFileSync('src/scenario/seeds/u13_oz_entry_trailer_v2.json','utf8'));const v=lintScenario(s);console.log(v.ok?'LINT OK':'LINT FAIL -> '+(v.errs||[]).join('; '));})"
```
Expected: `LINT OK`. If a frame fails, the error names the frame (`step[0]`/`step[1]`) and the rule. The rules to satisfy per frame: no two skaters within 0.05 on BOTH axes; an off-zone frame needs at least one defender goal-side of the puck (x greater than the puck's x for a right view); teammates not ahead of the puck while the puck is right at the blue line. Adjust the offending coordinate by ~0.03–0.05 and re-run until `LINT OK`. Do not change the teaching content, only the flagged coordinate.

- [ ] **Step 3: Commit**
```
git add src/scenario/seeds/u13_oz_entry_trailer_v2.json
git commit -m "content(scenario): u13_oz_entry_trailer_v2 — first 2-step proof seed"
```

---

## Task 5: `MultiStepPlayer.jsx` (sequences ScenarioRenderer + reveal + summary)

**Files:**
- Create: `src/scenario/MultiStepPlayer.jsx`

This component has no unit test (JSX; the repo has no React test runner). All branching logic it relies on is already tested in `multiStep.js`. It is verified manually in Task 7.

- [ ] **Step 1: Implement the component**

Create `src/scenario/MultiStepPlayer.jsx`:
```jsx
// Plays a multi-step scenario: renders each frame with the existing
// ScenarioRenderer (as a synthetic flat scenario), then a reveal beat
// (the step's `outcome` + a Continue control), then the next frame, and
// a final per-step summary. All sequencing logic lives in multiStep.js.
import { useState } from "react";
import ScenarioRenderer from "./ScenarioRenderer.jsx";
import { start, stepToScenario, currentStep, record, next, isComplete, summary } from "./multiStep.js";
import { C, FONT, Card } from "../shared.jsx";

export default function MultiStepPlayer({ scenario, playerId, onAnswer }) {
  const [state, setState] = useState(() => start(scenario));
  const [answered, setAnswered] = useState(false);

  if (isComplete(state)) {
    const s = summary(state);
    return (
      <Card style={{ background: C.dimmest, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 800, color: C.gold, marginBottom: ".4rem" }}>Play complete</div>
        <div style={{ fontSize: 14, color: C.white }}>You read {s.correct} of {s.total} correctly.</div>
        <div style={{ display: "flex", gap: ".4rem", marginTop: ".5rem" }}>
          {s.perStep.map((okStep, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 800, color: okStep ? C.green : C.red }}>
              {okStep ? "✓" : "✗"} read {i + 1}
            </span>
          ))}
        </div>
      </Card>
    );
  }

  const frame = stepToScenario(state, state.index);
  const step = currentStep(state);
  const total = state.steps.length;

  function handleAnswer(result) {
    if (answered) return;
    setState((st) => record(st, result));
    setAnswered(true);
    onAnswer?.({ ...result, stepIndex: state.index });
  }
  function advance() {
    setAnswered(false);
    setState((st) => next(st));
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: C.dimmer, fontFamily: FONT.body, marginBottom: ".3rem" }}>
        Read {state.index + 1} of {total}
      </div>
      <ScenarioRenderer scenario={frame} playerId={playerId} onAnswer={handleAnswer} />
      {answered && (
        <Card style={{ marginTop: ".6rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
          {step.outcome && <div style={{ fontSize: 13, color: C.white, marginBottom: ".5rem" }}>▶ {step.outcome}</div>}
          <button onClick={advance}
            style={{ width: "100%", padding: ".7rem", borderRadius: 10, border: "none", background: C.gradientPrimary,
              color: C.bg, fontFamily: FONT.body, fontWeight: 800, cursor: "pointer" }}>
            {state.index + 1 < total ? "Continue →" : "See result →"}
          </button>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Sanity-check it parses (build)**

Run: `npx vite build 2>&1 | tail -5` (or, if a dev server is already running, confirm no HMR error in its output).
Expected: build succeeds with no syntax/import error for `MultiStepPlayer.jsx`. (Functional verification is Task 7.)

- [ ] **Step 3: Commit**
```
git add src/scenario/MultiStepPlayer.jsx
git commit -m "feat(scenario): MultiStepPlayer — sequences frames + reveal + summary"
```

---

## Task 6: Dispatch multi-step in `ScenarioRenderer`

**Files:**
- Modify: `src/scenario/ScenarioRenderer.jsx` (the `ScenarioRenderer` default export, after the `useState`/`useEffect` hooks, before `validateScenario` is called)

- [ ] **Step 1: Add the dispatch**

In `src/scenario/ScenarioRenderer.jsx`, add the import near the top with the other imports:
```js
import MultiStepPlayer from "./MultiStepPlayer.jsx";
```
Then inside `export default function ScenarioRenderer({ scenario, playerId, mode, onAnswer }) {`, as the FIRST statement of the function body (before the existing `const [result, setResult] = useState(null);`), add:
```js
  if (Array.isArray(scenario?.steps)) {
    return <MultiStepPlayer scenario={scenario} playerId={playerId} onAnswer={onAnswer} />;
  }
```
This is safe from recursion: `MultiStepPlayer` renders each frame via `stepToScenario`, which strips `steps`, so the nested `ScenarioRenderer` always takes the normal single-step path.

(Note: React hooks must run unconditionally, but this early return runs before any hook in the synthetic-frame path because the multi-step wrapper never uses the hooks below it — it returns first. The wrapper scenario and a frame scenario are different objects, so no single render both early-returns and runs hooks.)

- [ ] **Step 2: Build to confirm no parse/import error**

Run: `npx vite build 2>&1 | tail -5`
Expected: build succeeds.

- [ ] **Step 3: Commit**
```
git add src/scenario/ScenarioRenderer.jsx
git commit -m "feat(scenario): ScenarioRenderer dispatches multi-step plays to MultiStepPlayer"
```

---

## Task 7: Manual verification in the running app

**Files:** none (runtime verification).

- [ ] **Step 1: Make the proof seed reachable**

The dev server (port 5173) serves the bank via `qbLoader`. Confirm the new seed loads: open the app and navigate to the review deck `http://localhost:5173/#triage` (signed in as the owner). The `u13_oz_entry_trailer_v2` board should appear in the deck. If the bank is cached, hard-refresh (Ctrl+Shift+R) to clear the `qbLoader` cache.

- [ ] **Step 2: Play it through**

On that board, confirm the full flow:
- "Read 1 of 2" shows; the frame-1 selection is tappable.
- After answering, the right/wrong feedback shows AND a purple card with the `outcome` line ("The D committed to you…") + a "Continue →" button appears.
- Continue advances to frame 2 ("Read 2 of 2"); the evolved scene (center now high) renders; the point interaction works.
- After answering frame 2, a "See result →" button appears; tapping it shows "Play complete — You read N of 2 correctly" with ✓/✗ per read.
- Answering frame 1 WRONG still advances (always-continue) and the result reflects the miss.

- [ ] **Step 3: Confirm a flat seed is unaffected**

In the same deck, open any existing single-step seed (e.g. `u13_oddman_pass_mc_v1`) and confirm it plays exactly as before (no "Read 1 of N", no reveal/Continue) — proving backward compatibility.

- [ ] **Step 4: Report**

Report the play-through result to Thomas (it's the proof the format works end-to-end). No commit.

---

## Self-Review

**Spec coverage:**
- `steps[]` full-scene-per-step + backward-compat → Tasks 1 (normalize/synthetic), 2 (schema validates steps; flat still 1-step). ✓
- Pure state machine + thin player reusing renderers/scorers → Task 1 (machine, tested), Task 5 (player reuses `ScenarioRenderer`), Task 6 (dispatch). ✓
- Always-continue / show-outcome / per-step scoring → Task 1 (`record` advances even on wrong; `summary` per-step), Task 5 (reveal + Continue + summary). ✓
- Per-step lint → Task 3. ✓
- Per-step telemetry (`stepIndex` on the answer) → Task 5 passes `stepIndex` in `onAnswer` (the DB `step_index` column add is a noted Phase-1 tail; the client now emits it). ✓
- Proof seed (entry_trailer 2-step) → Task 4, verified Task 7. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code; the seed coordinate-fix step gives the exact rules + adjustment size rather than "fix it." ✓

**Type/name consistency:** `normalizeSteps`/`stepToScenario`/`start`/`record`/`next`/`currentStep`/`isComplete`/`summary` are defined in Task 1 and used with those exact names in Tasks 2, 3, 5, 6. The state shape (`{ scenario, steps, index, results }`) is consistent. `onAnswer({...result, stepIndex})` matches `ScenarioRenderer`'s existing `onAnswer` contract. ✓

**Note on telemetry DB column:** persisting `step_index` to Supabase (a migration on the per-answer table) is intentionally left as a small follow-up; the client already emits it via `onAnswer`, so nothing downstream breaks in the meantime (the field is simply ignored until the column exists).
