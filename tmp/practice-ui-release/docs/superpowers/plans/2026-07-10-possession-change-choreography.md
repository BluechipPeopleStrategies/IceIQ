# Possession-Change Choreography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Animate defenders stepping into passes, gaining the puck, and countering while applying the same contract to clear turnover outcomes elsewhere in the animated-play catalog.

**Architecture:** Add generic puck entry-to-position animation alongside existing actor `enter` animation, and validate small `possessionChange` metadata on nodes. Use staged watch/replay nodes for the flat-support proof play; use the same enter-to-counter contract on clear terminal turnover nodes in three existing plays. A targeted audit identifies explicit pass interceptions that lack metadata without interpreting every play.

**Tech Stack:** React 18, plain JavaScript/JSX, SVG transitions, Node test runner (`node:test`).

## Global Constraints

- Do not add dependencies or a general animation timeline engine.
- Keep answer targets stationary.
- Show defender movement before or while the pass is intercepted.
- Move the puck with the defender during the counter stage.
- Post-answer replay is slower than the opening watch sequence.
- Apply catalog changes only to explicit opponent-possession outcomes; leave ambiguous lane-closing outcomes unchanged.
- Preserve correctness banners, telemetry, accessibility, and reduced-motion behavior.

---

### Task 1: Animate puck entry positions generically

**Files:**
- Modify: `src/play/AnimatedPlay.jsx`
- Modify: `src/play/validateAnimatedPlay.js`
- Test: `scripts/test-play-engine.mjs`

**Interfaces:**
- Consumes: optional node field `enterPuck: [number, number]`.
- Produces: `displayedPuck = !entered && node.enterPuck ? node.enterPuck : node.puck`.

- [ ] **Step 1: Write failing renderer and validation tests**

Add tests that assert malformed `enterPuck` fails validation and that the renderer uses the entry puck until the node enters:

```js
it("validates and renders puck entry positions", () => {
  const bad = withStartMotions([]);
  bad.nodes[bad.start].enterPuck = [12];
  assert.ok(validateAnimatedPlay(bad).errs.some((error) => error.includes("enterPuck")));

  const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
  assert.ok(src.includes("const displayedPuck = (!entered && node.enterPuck) ? node.enterPuck : node.puck;"));
});
```

Import `readFileSync` in `test-play-engine.mjs`.

- [ ] **Step 2: Run the engine test and verify RED**

Run: `npm run test:play-engine`

Expected: FAIL because `enterPuck` is not validated or rendered.

- [ ] **Step 3: Implement puck entry-to-position animation**

In `validateAnimatedPlay.js`, add:

```js
if (node.enterPuck && !isPoint(node.enterPuck)) {
  errs.push(`node ${nodeId} enterPuck must be [x,y]`);
}
```

In `AnimatedPlay.jsx`, replace the direct puck assignment with:

```js
const displayedPuck = (!entered && node.enterPuck) ? node.enterPuck : node.puck;
```

Render `displayedPuck` using the existing puck SVG transition.

- [ ] **Step 4: Run focused verification and commit**

Run:

```powershell
npm run test:play-engine
npm run test:animated-play
npm run build
```

Expected: all commands PASS.

Commit:

```powershell
git add src/play/AnimatedPlay.jsx src/play/validateAnimatedPlay.js scripts/test-play-engine.mjs
git commit -m "feat(play): animate puck possession changes"
```

---

### Task 2: Add and validate the possession-change contract

**Files:**
- Create: `src/play/possessionChange.js`
- Modify: `src/play/validateAnimatedPlay.js`
- Test: `scripts/test-play-engine.mjs`

**Interfaces:**
- Produces: `validatePossessionChange(node, actorIds) -> string[]`.
- Produces: `explicitInterceptionNodes(play) -> Array<{ playId, nodeId }>` for targeted audit reporting.

- [ ] **Step 1: Write failing contract tests**

Add tests for missing actors, missing `enterPuck`, and a valid counter node:

```js
it("requires explicit possession-change geometry", async () => {
  const { validatePossessionChange } = await import("../src/play/possessionChange.js");
  const actorIds = new Set(["D1"]);
  assert.deepEqual(validatePossessionChange({
    possessionChange: { kind: "interception", fromTeam: "home", toActor: "D1", counterTo: [136, 43] },
    enter: { D1: [147, 44] },
    pos: { D1: [136, 43] },
    enterPuck: [144.5, 45],
    puck: [133.5, 44],
    motions: [{ kind: "blocked", from: [146, 58], to: [147, 44] }],
  }, actorIds), []);

  assert.ok(validatePossessionChange({
    possessionChange: { kind: "interception", toActor: "missing", counterTo: [136, 43] },
    pos: {},
  }, actorIds).some((error) => error.includes("unknown actor")));
});
```

- [ ] **Step 2: Run the engine test and verify RED**

Run: `npm run test:play-engine`

Expected: FAIL because `possessionChange.js` does not exist.

- [ ] **Step 3: Implement the pure validator and audit helper**

`validatePossessionChange` must check:

```js
export function validatePossessionChange(node, actorIds) {
  const change = node?.possessionChange;
  if (!change) return [];
  const errors = [];
  if (change.kind !== "interception") errors.push("kind must be interception");
  if (!actorIds.has(change.toActor)) errors.push(`unknown actor ${change.toActor}`);
  if (!Array.isArray(change.counterTo) || change.counterTo.length !== 2) errors.push("counterTo must be [x,y]");
  if (!node.enter?.[change.toActor]) errors.push("counter node needs defender enter position");
  if (!node.pos?.[change.toActor]) errors.push("counter node needs defender final position");
  if (!node.enterPuck || !node.puck) errors.push("counter node needs enterPuck and puck");
  if (!node.motions?.some((motion) => motion.kind === "blocked" && motion.to?.every((n, i) => n === node.enter[change.toActor][i]))) {
    errors.push("blocked route must end at defender entry position");
  }
  return errors;
}
```

`explicitInterceptionNodes` scans only terminal/question text matching
`breaks up the pass|forced pass|picked off|checker was waiting for that pass`
and returns matches without `possessionChange`.

Call `validatePossessionChange` from `validateAnimatedPlay` and prefix errors
with the node id.

- [ ] **Step 4: Run tests and commit**

Run:

```powershell
npm run test:play-engine
npm run test:question-kinds
```

Expected: both commands PASS.

Commit:

```powershell
git add src/play/possessionChange.js src/play/validateAnimatedPlay.js scripts/test-play-engine.mjs
git commit -m "feat(play): validate possession-change choreography"
```

---

### Task 3: Stage the flat-support opening and slow replay

**Files:**
- Modify: `src/play/plays/spotMistakeFlatSupport.js`
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- Consumes: watch-chain `autoNext`, `enterPuck`, and `possessionChange` contract.
- Produces: opening nodes `watch`, `intercept`, `counter`, `spot`; replay nodes `replayRead`, `replayIntercept`, `rewind`.

- [ ] **Step 1: Write failing sequence tests**

Assert exact routes and timing:

```js
it("stages the interception and counter before the question and in slow replay", () => {
  const nodes = SPOT_MISTAKE_FLAT_SUPPORT.nodes;
  assert.equal(nodes.watch.autoNext.next, "intercept");
  assert.equal(nodes.intercept.autoNext.next, "counter");
  assert.equal(nodes.counter.autoNext.next, "spot");
  assert.equal(nodes.spot.ask.opts.every((option) => option.next === "replayRead"), true);
  assert.equal(nodes.replayRead.autoNext.next, "replayIntercept");
  assert.equal(nodes.replayIntercept.autoNext.next, "rewind");
  assert.ok(nodes.replayRead.autoNext.ms > nodes.watch.autoNext.ms);
  assert.ok(nodes.replayIntercept.autoNext.ms > nodes.intercept.autoNext.ms);
  assert.deepEqual(nodes.counter.pos.D1, nodes.counter.possessionChange.counterTo);
  assert.deepEqual(nodes.rewind.pos.D1, nodes.rewind.possessionChange.counterTo);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:question-kinds`

Expected: FAIL because the staged nodes do not exist.

- [ ] **Step 3: Author the opening chain**

Use these beats:

```js
watch:      { autoNext: { next: "intercept", ms: 700 },  D1: [154,44] -> [149,44], puck stays with F1 }
intercept:  { autoNext: { next: "counter", ms: 650 }, D1: [149,44] -> [147,44], enterPuck: [146,58], puck: [144.5,45], blocked route }
counter:    { autoNext: { next: "spot", ms: 750 }, D1: [147,44] -> [136,43], enterPuck: [144.5,45], puck: [133.5,44], possessionChange metadata }
spot:       frozen counter-complete positions and actor-tap question
```

- [ ] **Step 4: Author the slow replay chain**

Route every spot answer to `replayRead`. Use `1000 ms` for `replayRead`,
`1100 ms` for `replayIntercept`, and let terminal `rewind` animate D1 and the
puck from interception to counter positions. Attach the `Flat` cue to the
support skater and preserve `pickedOption` feedback.

- [ ] **Step 5: Run tests and commit**

Run:

```powershell
npm run test:question-kinds
npm run test:play-engine
npm run test:play-telemetry
```

Expected: all commands PASS.

Commit:

```powershell
git add src/play/plays/spotMistakeFlatSupport.js scripts/test-question-kinds.mjs
git commit -m "feat(play): stage interception and counter replay"
```

---

### Task 4: Apply the contract to clear catalog matches

**Files:**
- Modify: `src/play/plays/defenderHoldsMiddle.js`
- Modify: `src/play/plays/twoOnOnePassLaneRemoved.js`
- Modify: `src/play/plays/twoOnOneSupportTooFlat.js`
- Test: `scripts/test-play-engine.mjs`

**Interfaces:**
- Consumes: `explicitInterceptionNodes`, `enterPuck`, and `possessionChange` validation.
- Produces: zero unaudited explicit-interception nodes in the catalog.

- [ ] **Step 1: Write the failing catalog audit**

```js
it("choreographs every explicit pass interception in the catalog", async () => {
  const { explicitInterceptionNodes } = await import("../src/play/possessionChange.js");
  const missing = ALL_ANIMATED_PLAYS.flatMap(explicitInterceptionNodes);
  assert.deepEqual(missing, []);
});
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:play-engine`

Expected: FAIL listing the explicit interception nodes without metadata.

- [ ] **Step 3: Convert only the listed clear matches**

For each listed terminal node, keep the existing interception position as the
defender/puck entry position, move the defender and puck toward neutral ice in
`pos`/`puck`, add matching `enter`/`enterPuck`, and retain the blocked route
ending at the defender entry position. Use these exact geometry pairs:

- `defenderHoldsMiddle.forcedPass`: D1 enters at `[160, 39]`, counters to
  `[150, 40]`; puck enters at `[160, 39]` and counters to `[147.5, 41]`.
- `twoOnOnePassLaneRemoved.turnover`: D1 enters at `[158, 39]`, counters to
  `[148, 40]`; puck enters at `[158, 39]` and counters to `[145.5, 41]`.
- `twoOnOneSupportTooFlat.turnover`: D1 enters at `[159, 44]`, counters to
  `[149, 44]`; puck enters at `[159, 44]` and counters to `[146.5, 45]`.

Each node receives `possessionChange: { kind: "interception", fromTeam:
"home", toActor: "D1", counterTo: node.pos.D1 }` authored with the literal
counter coordinate above.

Do not modify generic `turnover` nodes whose copy only says a lane closes or a
chance fades.

- [ ] **Step 4: Run the catalog suite and commit**

Run:

```powershell
npm run test:play-engine
npm run test:question-kinds
npm run test:animated-play
```

Expected: all commands PASS and the catalog audit returns `[]`.

Commit:

```powershell
git add src/play/plays/defenderHoldsMiddle.js src/play/plays/twoOnOnePassLaneRemoved.js src/play/plays/twoOnOneSupportTooFlat.js scripts/test-play-engine.mjs
git commit -m "feat(play): animate catalog pass interceptions"
```

---

### Task 5: Verify the catalog and local playtest

**Files:**
- Modify only files already listed if verification exposes a defect.

- [ ] **Step 1: Run fresh automated verification**

```powershell
npm run test:question-kinds
npm run test:animated-play
npm run test:prototype-telemetry
npm run test:play-engine
npm run test:play-telemetry
npm run build
git diff --check 8ddde24..HEAD
```

Expected: all commands exit `0`.

- [ ] **Step 2: Verify the flat-support play at U7 and U11**

Open `http://127.0.0.1:5174/#playtest` and verify normal-speed opening,
stationary tap targets, slow replay, puck possession, counter movement, result
banner, and `Flat` cue.

- [ ] **Step 3: Spot-check converted catalog plays**

Verify each converted terminal consequence shows the defender start at the
interception point and carry the puck toward neutral ice without changing the
question's hockey conclusion.

- [ ] **Step 4: Commit only if verification required a tested correction**

Stage only the affected files, rerun Step 1, and use:

```powershell
git commit -m "fix(play): finish possession-change verification"
```

If no correction is needed, do not create an empty commit.
