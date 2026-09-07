# Spot-Mistake Interception Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the flat-support 2-on-1 visibly show the defender stealing the attempted pass in the question and rewind frames.

**Architecture:** Keep the change in the proof play's authored node data. Move the defender onto the F1-to-F2 segment, place the puck on the defender's stick side, and add the existing `blocked` motion to the question and rewind nodes. The renderer already treats a blocked route included on a question node as an explicit completed-event review, so no shared renderer switch is needed.

**Tech Stack:** Plain JavaScript play objects, SVG animated-play renderer, Node test runner (`node:test`).

## Global Constraints

- Do not add dependencies.
- Keep the support skater flat with the puck carrier.
- Communicate the turnover with geometry, puck position, and the interruption mark, not red alone.
- Do not change other 2-on-1 plays or the hockey conclusion.
- Preserve actor IDs so existing tap targets remain aligned.

---

### Task 1: Author the exaggerated interception geometry

**Files:**
- Modify: `src/play/plays/spotMistakeFlatSupport.js`
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- Consumes: existing `blocked` motion rendering and `SPOT_MISTAKE_FLAT_SUPPORT` node shape.
- Produces: `spot` and `rewind` frames where D1 is at `[147, 44]`, the stolen puck is at `[144.5, 45]`, and the attempted pass ends at D1.

- [ ] **Step 1: Write failing geometry tests**

Import `SPOT_MISTAKE_FLAT_SUPPORT` and add:

```js
it("puts the defender and stolen puck directly in the failed pass lane", () => {
  const { spot, rewind } = SPOT_MISTAKE_FLAT_SUPPORT.nodes;
  assert.deepEqual(spot.pos.D1, [147, 44]);
  assert.deepEqual(spot.puck, [144.5, 45]);
  assert.deepEqual(rewind.pos.D1, [147, 44]);
  assert.deepEqual(rewind.puck, [144.5, 45]);

  for (const node of [spot, rewind]) {
    const blocked = node.motions.find((motion) => motion.kind === "blocked");
    assert.deepEqual(blocked.from, [146, 58]);
    assert.deepEqual(blocked.to, [147, 44]);
    assert.equal(blocked.label, "picked off");
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:question-kinds`

Expected: FAIL because the current defender coordinates, puck coordinates, and node motions do not match.

- [ ] **Step 3: Update the play data**

Set `D1: [147, 44]` and `puck: [144.5, 45]` in `spot` and `rewind`. Add this motion to both nodes:

```js
motions: [
  { kind: "blocked", from: [146, 58], to: [147, 44], label: "picked off" },
],
```

Update the watch node's final D1 position and blocked-motion endpoint to
`[147, 44]` so the animation lands on the frozen interception.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
npm run test:question-kinds
npm run test:play-engine
npm run test:animated-play
```

Expected: all commands PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/play/plays/spotMistakeFlatSupport.js scripts/test-question-kinds.mjs
git commit -m "fix(play): exaggerate flat-support interception"
```

---

### Task 2: Verify the visual teaching frame

**Files:**
- Modify only the Task 1 files if verification reveals a geometry defect.

**Interfaces:**
- Consumes: the completed play data.
- Produces: verified local `#playtest` behavior at U7 and U11.

- [ ] **Step 1: Run fresh automated verification**

Run:

```powershell
npm run test:question-kinds
npm run test:play-engine
npm run test:animated-play
npm run build
git diff --check HEAD~1..HEAD
```

Expected: all commands exit `0`.

- [ ] **Step 2: Manually inspect the running playtest**

Open `http://127.0.0.1:5174/#playtest`, select
`2-on-1: Spot the wrong read`, and verify at U7 and U11:

- D1 is centered in the lane between F1 and F2.
- The puck is visibly on D1's stick side.
- The red blocked route ends at D1 and includes the interruption mark.
- F2 remains flat with F1.
- Tapping F1, F2, and D1 still selects the intended actor.
- Correct and incorrect result banners still appear before the rewind summary.

- [ ] **Step 3: Commit only if manual verification required a correction**

If an in-scope adjustment is necessary, first add a failing geometry assertion,
then make the minimal data correction and rerun Task 2 Step 1. Commit with:

```powershell
git add src/play/plays/spotMistakeFlatSupport.js scripts/test-question-kinds.mjs
git commit -m "fix(play): tune interception teaching frame"
```

If no correction is necessary, do not create an empty commit.
