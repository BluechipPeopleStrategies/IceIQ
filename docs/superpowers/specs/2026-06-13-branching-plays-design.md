# Branching Plays (Phase 1) — Design

**Status:** design, ready for review · **Date:** 2026-06-13
**Origin:** Thomas's #triage review notes asking for conditional second reads —
"if the defender goes with you, hit the trailer; if he stays, shoot"
(`oz_entry_trailer`), "what should the winger do, or if the winger beats us"
(`oz_highslot`), "an iteration of what happens if certain things happen" (`d5md`).
The scripted-linear multi-step engine (2026-06-12) handles a *fixed* second read but
explicitly set branching aside. This spec adds true branching.

**Approved shape:** one **graph-of-frames** model that subsumes all three branch
styles Thomas asked for (choice-driven, first-read-routes, read-the-defender). Build
the engine + one hand-authored proof board. Generation and seed migration are later.

---

## 1. The unifying idea

A branching play is a small directed graph of **frames** (nodes). The player reads a
frame, answers, and the play follows the route that matches their answer to the next
frame, until a terminal frame ends the play. The three styles are just authoring
patterns over the same graph:

- **First-read-routes** — a frame's correct answer routes to "the line continues," the
  rest route to "see it break down, then the fix."
- **Choice-driven** — the options are tactical (pass / shoot) and each routes to its
  consequence frame.
- **Read-the-defender** — author two **entry** frames (D-goes / D-stays); the engine
  picks which one starts the play, so one board teaches both reads across replays.

The existing linear `steps[]` play is the degenerate case: a chain where each node has
exactly one unconditional route to the next.

---

## 2. Data model

A scenario gains an optional `entry` + `nodes`. It has exactly one of: flat interaction
fields, `steps[]` (linear), or `nodes` (graph).

```jsonc
{
  "id": "u13_oz_entry_trailer_branch",
  "type": "scenario",
  "nodeId": "u13.reading-the-play",      // curriculum node id (unrelated to graph nodes)
  "level": "U13 / Peewee",
  "levels": ["U13 / Peewee"],
  "themes": ["zone-entry", "decision-making"],
  "cat": "Transition",
  "stage": { "view": "right", "zone": "off-zone" },   // constant across the play
  "tip": "...", "why": "...",                          // constant across the play

  "entry": ["start"],          // 1+ start frame ids; engine picks one per play
  "nodes": {
    "start": {
      "actors": [ ... ],
      "interaction": { "kind": "mc", "prompt": "2-on-1, the D is stepping up. Best play?" },
      "mc": { "stem": "...", "opts": ["Pass to the trailer", "Shoot", "Drive wide"], "ok": 0 },
      "correct": { "kind": "mc" },        // matches interaction.kind, as today
      "feedback": { "right": "...", "wrong": "..." },
      "routes": [
        { "on": "correct", "outcome": "The D commits to you — the trailer is open.", "next": "trailer" },
        { "on": "else",    "outcome": "You forced it — the D read the shot.",        "next": "forced" }
      ]
    },
    "trailer": {                          // second read down the correct line
      "actors": [ ... ],
      "interaction": { "kind": "point", "prompt": "Trailer has it at the dot. Where's the shot?" },
      "correct": { "kind": "point", "x": 0.8, "y": 0.36, "tolerance": 0.1 },
      "feedback": { "right": "...", "wrong": "..." },
      "routes": []                        // terminal (no routes / next)
    },
    "forced": {                           // the breakdown line — still teaches the fix
      "actors": [ ... ],
      "interaction": { "kind": "mc", "prompt": "..." },
      "mc": { ... }, "correct": { "kind": "mc" },
      "feedback": { "right": "...", "wrong": "..." },
      "routes": []
    }
  }
}
```

**Node = a full frame** (`actors` / `interaction` / `correct` / `feedback`, plus optional
`mc`), exactly like a `steps[]` frame. `stage`, curriculum tags, `tip`, `why` stay at the
top level. A node's `routes` is an array of `{ on, outcome, next }`:

- `on`: `"correct"` (the player's answer was right), `"else"` (fallback / any other
  answer), or — Phase 2 — a specific option id for finer choice-driven forks. Phase 1
  supports `"correct"` and `"else"` only (covers first-read-routes and the proof board).
- `outcome`: the "what happened" line shown in the reveal beat before the next frame.
- `next`: the id of the next node, or omitted/null for terminal.

A node with empty/absent `routes` is **terminal**.

---

## 3. Engine — `src/scenario/branching.js` (new, pure)

Generalize the linear state machine to a graph. To keep one code path, a
`toGraph(scenario)` normalizes any scenario into a canonical graph so the machine never
special-cases linear vs branching vs flat:

```js
// Canonical graph: { entry: string[], nodes: { [id]: { ...frame, routes:[{on,outcome,next}] } } }
export function toGraph(scenario) {
  if (scenario.nodes && scenario.entry) return { entry: scenario.entry, nodes: scenario.nodes };
  // steps[] -> linear chain s0 -> s1 -> ... ; flat -> single terminal node.
  const steps = Array.isArray(scenario.steps) && scenario.steps.length
    ? scenario.steps
    : [{ actors: scenario.actors, interaction: scenario.interaction, correct: scenario.correct,
         feedback: scenario.feedback, tip: scenario.tip, why: scenario.why }];
  const nodes = {};
  steps.forEach((st, i) => {
    const last = i === steps.length - 1;
    nodes[`s${i}`] = { ...st, routes: last ? [] : [{ on: "else", outcome: st.outcome, next: `s${i + 1}` }] };
  });
  return { entry: ["s0"], nodes };
}
```

State machine (immutable; each fn returns new state):

```js
export function start(scenario, pickIndex = 0) {           // pickIndex selects among entry frames
  const g = toGraph(scenario);
  const id = g.entry[pickIndex % g.entry.length];
  return { scenario, graph: g, nodeId: id, path: [id], results: {} };
}
export function frameFor(state) {                           // flatten node -> synthetic flat scenario
  const node = state.graph.nodes[state.nodeId];
  const { steps, nodes, entry, ...top } = state.scenario;
  const { routes, ...frame } = node;
  return { ...top, ...frame };
}
export function currentNode(state) { return state.graph.nodes[state.nodeId]; }
export function record(state, result) {
  return { ...state, results: { ...state.results, [state.nodeId]: result } };
}
export function routeFor(state, result) {                  // which route fires for this answer
  const routes = state.graph.nodes[state.nodeId].routes || [];
  return routes.find(r => r.on === "correct" && result.ok)
      || routes.find(r => r.on === "else")
      || null;
}
export function advance(state, route) {                    // follow a route to the next node
  return { ...state, nodeId: route.next, path: [...state.path, route.next] };
}
export function isTerminal(state) { return (state.graph.nodes[state.nodeId].routes || []).length === 0; }
export function summary(state) {
  const perRead = state.path.map(id => !!(state.results[id] && state.results[id].ok));
  return { total: state.path.length, correct: perRead.filter(Boolean).length, perRead };
}
```

`frameFor` reuses the same flatten idea as `stepToScenario`, so every existing
single-frame validator/renderer works per node unchanged.

The old `multiStep.js` linear functions stay for now (back-compat); `MultiStepPlayer`
migrates to `branching.js` (it already only needs start/frame/record/advance/summary).

---

## 4. Player — `MultiStepPlayer.jsx`

Migrate from index increment to route following:

- `start(scenario, pick)` — `pick` is `0` for now; a later phase randomizes among
  `entry` for replay variety.
- After an answer, compute `routeFor(state, result)`; show the reveal beat with
  `route.outcome` and a Continue control; on Continue, `advance(state, route)`.
- When `isTerminal(state)` and answered, show the per-read summary (reuse current UI).
- The "Read N of M" header becomes "Read N" (graph length isn't known up front); keep a
  simple running count off `state.path.length`.

No change to `ScenarioRenderer` — it still renders one flat frame.

---

## 5. Review + grid rendering

`ReviewBoard.jsx` already renders `steps[]` as stacked frames. Teach it to render a
graph: stack **every node** (via `toGraph(scenario).nodes`), each as a labelled frame
("Start", "→ trailer", "→ forced"), reusing `OneBoard`. `BrowseTile` thumbnails the
**entry frame** only (`toGraph(scenario).nodes[entry[0]]`) so the grid stays light, the
same way it thumbnails step 0 today. This keeps the owner review loop working for
branching boards.

---

## 6. Validation

`validateScenario` (schema.js) gains a `nodes` branch, parallel to the `steps[]` branch:

- Exactly one of flat / `steps[]` / `nodes` (error if combined).
- `entry` is a non-empty array; every entry id exists in `nodes`.
- Each node validated as a flat scenario via the same shape-only recursion (reuse the
  `stepToScenario`-style flatten).
- Graph integrity: every `route.next` targets an existing node; every non-terminal node
  has at least one route; at least one terminal node is reachable; no node is unreachable
  from an entry (warn, not error, on orphans).

`runHockeyValidators` (validators.js) runs per node (loop `toGraph().nodes`), so geometry
checks apply to every frame. `scripts/check-seeds.mjs` already loads seeds; it picks up
node-based seeds for free once validators iterate nodes.

---

## 7. Phase 1 scope

1. `src/scenario/branching.js` — `toGraph` + graph state machine (pure, unit-tested).
2. `validateScenario` `nodes` support + graph-integrity checks.
3. `runHockeyValidators` iterates nodes (per-frame geometry).
4. `MultiStepPlayer` migrated to the graph machine (route-following + reveal).
5. `ReviewBoard` renders all graph nodes; `BrowseTile` thumbnails the entry frame.
6. **One** hand-authored proof board: `u13_oz_entry_trailer_branch` — frame 1 (2-on-1,
   D stepping up) routes `correct → trailer` (a real second read) and `else → forced`
   (the breakdown line). Validates clean.
7. Tests: `scripts/test-branching.mjs` over `branching.js` (toGraph for flat/steps/nodes,
   route following, terminal detection, summary) + a validation case for a bad graph.

## 8. Non-goals (deferred)

- Teaching the gauntlet to **generate** branching plays (separate spec).
- Randomized/cycling `entry` selection for read-the-defender replay variety (model is
  built for it via `pickIndex`; wiring the random pick + UI is Phase 2).
- Per-option route ids (`on: "<optionId>"`) for fine choice-driven forks — Phase 1 uses
  `correct`/`else`.
- Converting existing `steps[]` seeds — they keep working via `toGraph`.
- Scoring weight across paths (each read still scored independently).

## 9. Testing

- `npm run test:branching` green (pure engine).
- `npm run test:rules` still green (no regression).
- `node scripts/check-seeds.mjs u13_oz_entry_trailer_branch` → no hard errors.
- Manual: play the proof board through both the correct line (→ trailer second read) and
  the wrong line (→ forced breakdown); review it on `#browse` (entry thumbnail) and open
  it (all nodes stacked).

## 10. Open questions

1. Proof board specifics — is the 2-on-1 "pass-to-trailer = correct, routes to a second
   shooting read; shoot/drive = forced, routes to the breakdown" the right teaching line
   for U13? (Thomas's hockey call before authoring the frames.)
2. Reveal wording tone for the `outcome` beats — reuse the existing "▶ <outcome>" style.
