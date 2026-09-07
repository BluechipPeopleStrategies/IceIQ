# Branching Plays (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Steps use checkbox (`- [ ]`) tracking.

**Goal:** Add true branching to scenario plays — a graph of frames where each answer routes to the next frame — proven on one hand-authored board.

**Architecture:** A pure `branching.js` engine normalizes flat / `steps[]` / `nodes` scenarios into one canonical graph (`toGraph`) and walks it (start → answer → route → next, until terminal). Validation, the player, and the renderers all go through that one normalization. Linear `steps[]` keeps working as a single-route chain.

**Tech Stack:** Plain JSX, pure ES modules, node test scripts (the repo's test style).

**Spec:** `docs/superpowers/specs/2026-06-13-branching-plays-design.md`

---

## File Structure

- Create `src/scenario/branching.js` — pure engine (toGraph, flatten, framesOf, state machine).
- Create `scripts/test-branching.mjs` — unit tests for the engine + graph validation.
- Modify `src/scenario/schema.js` — `validateScenario` gains a `nodes` branch + graph integrity.
- Modify `src/scenario/validators.js` — `runHockeyValidators` runs per frame.
- Modify `src/scenario/MultiStepPlayer.jsx` — walk the graph by routes.
- Modify `src/review/ReviewBoard.jsx` — render every graph node; `src/review/BrowseTile.jsx` thumbnails the entry frame.
- Create `src/scenario/seeds/u13_oz_entry_trailer_branch.json` — the proof board.
- Modify `package.json` — add `test:branching`.

---

## Task 1: The branching engine (`branching.js`)

**Files:** Create `src/scenario/branching.js`, `scripts/test-branching.mjs`; modify `package.json`.

- [ ] **Step 1: Write the failing test** — `scripts/test-branching.mjs`:

```js
// Tests for src/scenario/branching.js (pure). Run: npm run test:branching
import { toGraph, flattenNode, framesOf, start, frameFor, record, routeFor, advance, isTerminal, summary } from "../src/scenario/branching.js";

let failed = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); if (!c) failed++; };

const flat = { id: "f", type: "scenario", stage: { view: "right" }, actors: [{ id: "a" }], interaction: { kind: "mc" }, correct: { kind: "mc" }, feedback: { right: "r", wrong: "w" } };
const stepped = { id: "s", type: "scenario", stage: { view: "right" }, steps: [
  { actors: [{ id: "a" }], interaction: { kind: "mc" }, correct: { kind: "mc" }, feedback: { right: "r", wrong: "w" }, outcome: "o1" },
  { actors: [{ id: "b" }], interaction: { kind: "mc" }, correct: { kind: "mc" }, feedback: { right: "r", wrong: "w" } },
] };
const branched = { id: "b", type: "scenario", stage: { view: "right" }, entry: ["start"], nodes: {
  start: { actors: [{ id: "a" }], interaction: { kind: "mc" }, correct: { kind: "mc" }, feedback: { right: "r", wrong: "w" },
    routes: [{ on: "correct", outcome: "good", next: "win" }, { on: "else", outcome: "bad", next: "lose" }] },
  win:  { actors: [{ id: "w" }], interaction: { kind: "mc" }, correct: { kind: "mc" }, feedback: { right: "r", wrong: "w" }, routes: [] },
  lose: { actors: [{ id: "l" }], interaction: { kind: "mc" }, correct: { kind: "mc" }, feedback: { right: "r", wrong: "w" }, routes: [] },
} };

// toGraph
check("toGraph flat -> 1 node", Object.keys(toGraph(flat).nodes).length === 1 && toGraph(flat).entry[0] === "s0");
check("toGraph steps -> chain", (() => { const g = toGraph(stepped); return g.nodes.s0.routes[0].next === "s1" && g.nodes.s1.routes.length === 0; })());
check("toGraph nodes -> passthrough", toGraph(branched).entry[0] === "start" && Object.keys(toGraph(branched).nodes).length === 3);

// flattenNode carries top-level + node fields, drops graph keys
const fn = flattenNode(branched, "win");
check("flattenNode has top id + stage", fn.id === "b" && fn.stage.view === "right");
check("flattenNode has node actors, no routes/nodes/entry", fn.actors[0].id === "w" && !fn.routes && !fn.nodes && !fn.entry);

// framesOf
check("framesOf flat -> 1", framesOf(flat).length === 1);
check("framesOf branched -> 3", framesOf(branched).length === 3);

// state machine: correct path
let st = start(branched);
check("start at entry", st.nodeId === "start");
check("frameFor start", frameFor(st).actors[0].id === "a");
st = record(st, { ok: true });
const rc = routeFor(st, { ok: true });
check("route correct -> win", rc.next === "win" && rc.outcome === "good");
st = advance(st, rc);
check("advanced to win", st.nodeId === "win" && isTerminal(st));
check("summary correct path", summary(st).correct === 1 && summary(st).total === 2);

// wrong path -> lose
let st2 = start(branched);
const rw = routeFor(st2, { ok: false });
check("route wrong -> lose", rw.next === "lose");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
```

Add to `package.json` scripts after `"test:browse"`:

```json
    "test:branching": "node scripts/test-branching.mjs",
```

- [ ] **Step 2: Run, expect failure** — `npm --prefix C:/Users/mtsli/IceIQ run test:branching` → FAIL (module not found).

- [ ] **Step 3: Implement `src/scenario/branching.js`:**

```js
// Branching scenario engine. A play is a graph of frames (nodes); each answer
// follows a route to the next node until a terminal node. Pure (no React) so it
// is unit-testable and importable by validators. Normalizes flat / steps[] /
// nodes scenarios into ONE canonical graph so nothing downstream special-cases.

// Canonical graph: { entry: string[], nodes: { [id]: { ...frame, routes:[{on,outcome,next}] } } }
export function toGraph(scenario) {
  if (scenario && scenario.nodes && scenario.entry) {
    return { entry: scenario.entry.slice(), nodes: scenario.nodes };
  }
  const steps = Array.isArray(scenario?.steps) && scenario.steps.length
    ? scenario.steps
    : [{ actors: scenario?.actors, interaction: scenario?.interaction, correct: scenario?.correct,
         feedback: scenario?.feedback, tip: scenario?.tip, why: scenario?.why }];
  const nodes = {};
  steps.forEach((st, i) => {
    const last = i === steps.length - 1;
    nodes[`s${i}`] = { ...st, routes: last ? [] : [{ on: "else", outcome: st.outcome, next: `s${i + 1}` }] };
  });
  return { entry: ["s0"], nodes };
}

// Synthetic flat scenario for one node: top-level fields (minus graph keys)
// overlaid with the node's own frame fields (minus routes). Reused by the
// player, the renderers, and per-frame validation.
export function flattenNode(scenario, nodeId) {
  const node = toGraph(scenario).nodes[nodeId];
  const { steps, nodes, entry, ...top } = scenario;
  const { routes, ...frame } = node;
  return { ...top, ...frame };
}

// Every frame of a scenario as a flat scenario (for validation/rendering).
export function framesOf(scenario) {
  return Object.keys(toGraph(scenario).nodes).map((id) => flattenNode(scenario, id));
}

// ---- progression state machine (immutable) ----
export function start(scenario, pickIndex = 0) {
  const graph = toGraph(scenario);
  const id = graph.entry[pickIndex % graph.entry.length];
  return { scenario, graph, nodeId: id, path: [id], results: {} };
}
export function frameFor(state) { return flattenNode(state.scenario, state.nodeId); }
export function currentNode(state) { return state.graph.nodes[state.nodeId]; }
export function record(state, result) {
  return { ...state, results: { ...state.results, [state.nodeId]: result } };
}
export function routeFor(state, result) {
  const routes = state.graph.nodes[state.nodeId].routes || [];
  return routes.find((r) => r.on === "correct" && result && result.ok)
      || routes.find((r) => r.on === "else")
      || null;
}
export function advance(state, route) {
  return { ...state, nodeId: route.next, path: [...state.path, route.next] };
}
export function isTerminal(state) { return (state.graph.nodes[state.nodeId].routes || []).length === 0; }
export function summary(state) {
  const perRead = state.path.map((id) => !!(state.results[id] && state.results[id].ok));
  return { total: state.path.length, correct: perRead.filter(Boolean).length, perRead };
}
```

- [ ] **Step 4: Run, expect pass** — `npm --prefix C:/Users/mtsli/IceIQ run test:branching` → All passed.

- [ ] **Step 5: Commit** — `git add src/scenario/branching.js scripts/test-branching.mjs package.json && git commit -m "feat(scenario): branching engine (toGraph + graph state machine)"`

---

## Task 2: Graph validation in `schema.js`

**Files:** Modify `src/scenario/schema.js`; extend `scripts/test-branching.mjs`.

- [ ] **Step 1: Add validation tests** to `test-branching.mjs` (before the final summary print):

```js
import { validateScenario } from "../src/scenario/schema.js";
const good = branched;
check("validate good graph ok", validateScenario(good).ok);
const danglingNext = { ...branched, nodes: { ...branched.nodes, start: { ...branched.nodes.start, routes: [{ on: "correct", next: "nope" }, { on: "else", next: "lose" }] } } };
check("validate dangling next -> error", !validateScenario(danglingNext).ok);
const badEntry = { ...branched, entry: ["missing"] };
check("validate bad entry -> error", !validateScenario(badEntry).ok);
const combined = { ...branched, steps: [{}], };
check("validate nodes+steps -> error", !validateScenario(combined).ok);
```

- [ ] **Step 2: Run, expect failure** (nodes branch not handled yet → `validate good graph ok` likely fails or dangling passes).

- [ ] **Step 3: Implement** — in `src/scenario/schema.js`, add a `nodes` branch in `validateScenario`, right after the existing `steps[]` block (after line ~232). Also import `flattenNode` alongside the existing `stepToScenario` import (line 186):

```js
import { stepToScenario } from "./multiStep.js";
import { flattenNode } from "./branching.js";
```

```js
  if (s.nodes || s.entry) {
    if (s.steps || s.interaction || s.actors || s.correct) {
      errs.push("a scenario has EITHER flat fields OR steps[] OR nodes{}, not a mix");
    }
    if (!s.nodes || typeof s.nodes !== "object") errs.push("nodes must be an object");
    if (!Array.isArray(s.entry) || !s.entry.length) errs.push("entry must be a non-empty array of node ids");
    const ids = new Set(Object.keys(s.nodes || {}));
    for (const e of (Array.isArray(s.entry) ? s.entry : [])) {
      if (!ids.has(e)) errs.push(`entry "${e}" is not a node`);
    }
    let terminals = 0;
    for (const [id, node] of Object.entries(s.nodes || {})) {
      const routes = Array.isArray(node.routes) ? node.routes : [];
      if (routes.length === 0) terminals++;
      for (const r of routes) {
        if (!r || !r.next) { errs.push(`node "${id}" has a route with no next`); continue; }
        if (!ids.has(r.next)) errs.push(`node "${id}" routes to missing node "${r.next}"`);
      }
      const r = validateScenario(flattenNode(s, id), { _shapeOnly: true });
      if (!r.ok) r.errs.forEach((e) => errs.push(`node "${id}": ${e}`));
    }
    if (terminals === 0) errs.push("graph has no terminal node (every node routes onward)");
    return { ok: errs.length === 0, errs, warns };
  }
```

Note: `flattenNode` strips `nodes`/`entry`, so the recursive `validateScenario(..., {_shapeOnly:true})` sees a flat frame and won't recurse back into this branch.

- [ ] **Step 4: Run, expect pass** — `npm --prefix C:/Users/mtsli/IceIQ run test:branching` → All passed.

- [ ] **Step 5: Commit** — `git add src/scenario/schema.js scripts/test-branching.mjs && git commit -m "feat(scenario): validate branching graphs (entry/nodes/routes integrity)"`

---

## Task 3: Per-frame hockey validation

**Files:** Modify `src/scenario/validators.js`.

- [ ] **Step 1:** In `src/scenario/validators.js`, import frame extraction at the top:

```js
import { framesOf } from "./branching.js";
```

- [ ] **Step 2:** Refactor `runHockeyValidators` (line 915) to run the existing rule loop per frame. Rename the current body to a local `runFlat`, then iterate:

```js
function runFlat(scenario) {
  const errs = [];
  const warns = [];
  for (const rule of rules) {
    let result;
    try { result = rule(scenario); }
    catch (e) { errs.push(`validator "${rule.name}" threw: ${e.message}`); continue; }
    if (!result) continue;
    if (result.kind === "err") errs.push(result.msg);
    else if (result.kind === "warn") warns.push(result.msg);
  }
  return { errs, warns };
}

export function runHockeyValidators(scenario) {
  if (scenario && (scenario.steps || scenario.nodes)) {
    const errs = [], warns = [];
    framesOf(scenario).forEach((f, i) => {
      const r = runFlat(f);
      r.errs.forEach((e) => errs.push(`frame[${i}]: ${e}`));
      r.warns.forEach((w) => warns.push(`frame[${i}]: ${w}`));
    });
    return { errs, warns };
  }
  return runFlat(scenario);
}
```

- [ ] **Step 3: Verify no regression** — `npm --prefix C:/Users/mtsli/IceIQ run test:rules` → still passes; `node scripts/check-seeds.mjs` → existing seeds unchanged (flat seeds go through `runFlat` exactly as before).

- [ ] **Step 4: Commit** — `git add src/scenario/validators.js && git commit -m "feat(scenario): run hockey validators per frame for steps/nodes plays"`

---

## Task 4: Player walks the graph (`MultiStepPlayer.jsx`)

**Files:** Modify `src/scenario/MultiStepPlayer.jsx`.

- [ ] **Step 1:** Replace the imports + body to use `branching.js` (route-following instead of index increment). Full new file:

```jsx
// Plays a branching (or linear, or flat) scenario: renders each frame with
// ScenarioRenderer (as a synthetic flat scenario), shows a reveal beat (the
// route's outcome + Continue), follows the route to the next node, and ends with
// a per-read summary. All graph logic lives in branching.js.
import { useState } from "react";
import ScenarioRenderer from "./ScenarioRenderer.jsx";
import { start, frameFor, record, routeFor, advance, isTerminal, summary } from "./branching.js";
import { C, FONT, Card } from "../shared.jsx";

export default function MultiStepPlayer({ scenario, playerId, onAnswer }) {
  const [state, setState] = useState(() => start(scenario));
  const [pending, setPending] = useState(null); // the route to follow on Continue, or null

  const done = isTerminal(state) && pending === null && state.results[state.nodeId];
  if (done) {
    const s = summary(state);
    return (
      <Card style={{ background: C.dimmest, border: `1px solid ${C.border}` }}>
        <div style={{ fontWeight: 800, color: C.gold, marginBottom: ".4rem" }}>Play complete</div>
        <div style={{ fontSize: 14, color: C.white }}>You read {s.correct} of {s.total} correctly.</div>
        <div style={{ display: "flex", gap: ".4rem", marginTop: ".5rem", flexWrap: "wrap" }}>
          {s.perRead.map((ok, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 800, color: ok ? C.green : C.red }}>{ok ? "✓" : "✗"} read {i + 1}</span>
          ))}
        </div>
      </Card>
    );
  }

  const frame = frameFor(state);

  function handleAnswer(result) {
    if (pending !== null || state.results[state.nodeId]) return;
    const st2 = record(state, result);
    const route = routeFor(st2, result);
    setState(st2);
    setPending(route);                 // null route on a terminal node
    onAnswer?.({ ...result, nodeId: state.nodeId });
  }
  function advanceNext() {
    if (!pending) return;
    setState((st) => advance(st, pending));
    setPending(null);
  }

  const answered = !!state.results[state.nodeId];
  return (
    <div>
      <div style={{ fontSize: 11, color: C.dimmer, fontFamily: FONT.body, marginBottom: ".3rem" }}>
        Read {state.path.length}
      </div>
      <ScenarioRenderer scenario={frame} playerId={playerId} onAnswer={handleAnswer} />
      {answered && pending && (
        <Card style={{ marginTop: ".6rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
          {pending.outcome && <div style={{ fontSize: 13, color: C.white, marginBottom: ".5rem" }}>▶ {pending.outcome}</div>}
          <button onClick={advanceNext}
            style={{ width: "100%", padding: ".7rem", borderRadius: 10, border: "none", background: C.gradientPrimary,
              color: C.bg, fontFamily: FONT.body, fontWeight: 800, cursor: "pointer" }}>Continue →</button>
        </Card>
      )}
    </div>
  );
}
```

`ScenarioRenderer` already delegates to `MultiStepPlayer` when `scenario.steps` is present (line ~191); add `|| scenario.nodes` to that condition so branching scenarios route here too.

- [ ] **Step 2:** In `src/scenario/ScenarioRenderer.jsx`, find the dispatch (around line 191):

```jsx
  if (Array.isArray(scenario.steps) && scenario.steps.length) {
    return <MultiStepPlayer scenario={scenario} playerId={playerId} onAnswer={onAnswer} />;
```

change the guard to also catch graphs:

```jsx
  if ((Array.isArray(scenario.steps) && scenario.steps.length) || (scenario.nodes && scenario.entry)) {
    return <MultiStepPlayer scenario={scenario} playerId={playerId} onAnswer={onAnswer} />;
```

- [ ] **Step 3: Build** — `npm --prefix C:/Users/mtsli/IceIQ run build` → compiles.

- [ ] **Step 4: Commit** — `git add src/scenario/MultiStepPlayer.jsx src/scenario/ScenarioRenderer.jsx && git commit -m "feat(scenario): MultiStepPlayer walks branching graphs by route"`

---

## Task 5: Review + grid render graph frames

**Files:** Modify `src/review/ReviewBoard.jsx`, `src/review/BrowseTile.jsx`.

- [ ] **Step 1:** In `src/review/ReviewBoard.jsx`, import the frame helpers and render graph nodes. Add at top:

```jsx
import { toGraph, flattenNode } from "../scenario/branching.js";
```

In the default `ReviewBoard` export, before the `steps[]` check, add a `nodes` case that stacks every node frame:

```jsx
  if (scenario.nodes && scenario.entry) {
    const ids = Object.keys(toGraph(scenario).nodes);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: ".9rem" }}>
        {ids.map((id) => (
          <OneBoard key={id} scenario={flattenNode(scenario, id)} label={`Frame · ${id}`} />
        ))}
      </div>
    );
  }
```

- [ ] **Step 2:** In `src/review/BrowseTile.jsx`, thumbnail the entry frame for graph boards. Where `board` is derived (the multi-step line added earlier), extend it:

```jsx
  const board = (scenario.nodes && scenario.entry)
    ? flattenNode(scenario, toGraph(scenario).entry[0])
    : (Array.isArray(scenario.steps) && scenario.steps.length) ? stepToScenario(scenario, 0) : scenario;
```

and add the import:

```jsx
import { toGraph, flattenNode } from "../scenario/branching.js";
```

- [ ] **Step 3: Build** — `npm --prefix C:/Users/mtsli/IceIQ run build` → compiles.

- [ ] **Step 4: Commit** — `git add src/review/ReviewBoard.jsx src/review/BrowseTile.jsx && git commit -m "feat(review): render branching-graph frames in board + grid"`

---

## Task 6: The proof board

**Files:** Create `src/scenario/seeds/u13_oz_entry_trailer_branch.json`.

- [ ] **Step 1:** Author the seed — a 2-on-1 where the first read routes to a second read (correct) or a breakdown (wrong). Coordinates are right-side off-zone (net at x≈0.92). Frame 1 is an MC; routes `correct → trailer` (a point second read) and `else → forced` (an MC breakdown, terminal).

```json
{
  "id": "u13_oz_entry_trailer_branch",
  "type": "scenario",
  "nodeId": "u13.reading-the-play",
  "level": "U13 / Peewee",
  "levels": ["U13 / Peewee"],
  "themes": ["zone-entry", "decision-making", "2-on-1"],
  "cat": "Transition",
  "stage": { "view": "right", "zone": "off-zone" },
  "tip": "On a 2-on-1, read the defenceman. If they take you, the pass is there; if they sag to the pass, take it yourself.",
  "why": "The defender can only take one threat. Reading which one they commit to tells you whether to shoot or pass.",
  "entry": ["start"],
  "nodes": {
    "start": {
      "actors": [
        { "id": "you", "kind": "player", "x": 0.7, "y": 0.32, "tag": "RW" },
        { "id": "puck", "kind": "puck", "x": 0.702, "y": 0.318 },
        { "id": "trailer", "kind": "teammate", "x": 0.72, "y": 0.66, "tag": "C" },
        { "id": "dman", "kind": "defender", "x": 0.8, "y": 0.4 },
        { "id": "g", "kind": "goalie", "x": 0.918, "y": 0.5 }
      ],
      "interaction": { "kind": "mc", "prompt": "2-on-1, you're carrying wide. The lone D steps across to take YOU. Best play?" },
      "mc": { "stem": "2-on-1 off the rush. The lone defenceman steps across to take you, the puck carrier. What's your best read?",
        "opts": ["Slide it across to the trailing centre", "Shoot far pad right now", "Drive harder to the net and force the D"], "ok": 0 },
      "correct": { "kind": "mc" },
      "feedback": { "right": "Yes. The D committed to you, so the backdoor is wide open. Move it across.",
        "wrong": "The D already took you — forcing a shot or driving into them lets the one defender win. The trailer is the open man." },
      "routes": [
        { "on": "correct", "outcome": "The D stayed on you — the centre is alone at the back door.", "next": "trailer" },
        { "on": "else", "outcome": "You forced it into the lone D, who broke up the play.", "next": "forced" }
      ]
    },
    "trailer": {
      "actors": [
        { "id": "trailer", "kind": "player", "x": 0.78, "y": 0.62, "tag": "C" },
        { "id": "puck", "kind": "puck", "x": 0.782, "y": 0.618 },
        { "id": "dman", "kind": "defender", "x": 0.8, "y": 0.36 },
        { "id": "g", "kind": "goalie", "x": 0.918, "y": 0.52 }
      ],
      "interaction": { "kind": "point", "prompt": "The pass is on your tape at the back door and the goalie is sliding across. Tap where you shoot." },
      "correct": { "kind": "point", "x": 0.9, "y": 0.4, "tolerance": 0.1 },
      "feedback": { "right": "Yes — shoot into the open far side before the goalie recovers.", "wrong": "The goalie is sliding across; the open net is the far side, not where they already are." },
      "routes": []
    },
    "forced": {
      "actors": [
        { "id": "you", "kind": "player", "x": 0.82, "y": 0.42, "tag": "RW" },
        { "id": "puck", "kind": "puck", "x": 0.83, "y": 0.45 },
        { "id": "dman", "kind": "defender", "x": 0.83, "y": 0.44 },
        { "id": "g", "kind": "goalie", "x": 0.918, "y": 0.5 }
      ],
      "interaction": { "kind": "mc", "prompt": "The D broke it up. Next time on a 2-on-1 where the D takes the carrier, what should you do?" },
      "mc": { "stem": "The D took you and broke up the play. On a 2-on-1 when the lone D commits to the puck carrier, the right read is:",
        "opts": ["Pass to the open trailer", "Shoot into the defender", "Skate it into the corner"], "ok": 0 },
      "correct": { "kind": "mc" },
      "feedback": { "right": "Right — when the D takes you, the trailer is the open man.", "wrong": "When the D commits to you, forcing your own shot plays into the one defender. The trailer is open." },
      "routes": []
    }
  }
}
```

- [ ] **Step 2: Validate** — `node scripts/check-seeds.mjs u13_oz_entry_trailer_branch` → no hard errors (per-frame geometry now runs via Task 3). Fix any flagged frame coords.

- [ ] **Step 3: Commit** — `git add src/scenario/seeds/u13_oz_entry_trailer_branch.json && git commit -m "feat(seeds): branching proof board — 2-on-1 trailer read"`

---

## Final review

- `npm run test:branching`, `npm run test:rules`, `npm run test:review`, `npm run test:browse` all green.
- `node scripts/check-seeds.mjs` → no hard errors across all seeds.
- Manual: open `#browse`, find `u13_oz_entry_trailer_branch` (entry-frame thumbnail), open it (all three frames stacked). In the player, take the correct first read → trailer second read; take a wrong first read → forced breakdown. Confirm the reveal "▶ outcome" beat and Continue work, and the per-read summary shows.
- The 2-on-1 teaching line + frame coords are Thomas's hockey call — verify on the grid and flag any frame to adjust.
