# Direct-Manipulation Question Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure animated-play prompts that tell a learner to tap or manipulate the rink always provide the matching direct interaction instead of silently rendering multiple-choice buttons.

**Architecture:** Centralize age-aware kind resolution in `questionKinds.js`, preserving direct-manipulation kinds instead of degrading them to `read-mc`. Render spot-mistake actor targets through a focused helper with generous pointer and keyboard hit areas, and validate prompt verbs against the resolved answer contract before plays ship.

**Tech Stack:** React 18, Vite 5, plain JavaScript/JSX, SVG, Node test runner (`node:test`).

## Global Constraints

- Do not add dependencies.
- Direct-manipulation wording must never fall back to an unrelated answer mode.
- Each eligible actor receives an invisible touch target larger than the visible token.
- Mouse, touch, and keyboard input must reach the same answer path.
- Single-answer actor taps submit immediately through the existing answer and telemetry path.
- Do not render duplicate answer buttons for direct actor-selection questions.
- Missing actor references and direct-manipulation verbs paired with button answers are validation errors.
- Keep edits focused on the animated-play path; do not redesign unified scenario primitives or add free-form movement.

---

### Task 1: Preserve direct-manipulation kinds during age resolution

**Files:**
- Modify: `src/play/questionKinds.js`
- Modify: `src/play/AnimatedPlay.jsx`
- Modify: `src/play/prototypeTelemetry.js`
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- Consumes: `resolveKind(node)`, `kindSpec(kind)`, and `kindsForAge(ageBand)`.
- Produces: `resolveKindForAge(node, ageBand) -> string|null`, used by rendering and telemetry.

- [ ] **Step 1: Write the failing age-resolution tests**

Add `resolveKindForAge` to the imports and add assertions proving a U7 preview preserves `spot-mistake`, while unsupported button-based `predict-next` retains the existing `read-mc` fallback:

```js
it("never degrades direct manipulation to buttons", () => {
  const spotNode = Object.values(SPOT_MISTAKE_FLAT_SUPPORT.nodes)
    .find((node) => node.ask?.kind === "spot-mistake");
  assert.equal(resolveKindForAge(spotNode, "U7"), "spot-mistake");

  const predictNode = Object.values(PREDICT_TWO_ON_ONE_DEFENDER_STEP.nodes)
    .find((node) => node.ask?.kind === "predict-next");
  assert.equal(resolveKindForAge(predictNode, "U11"), "read-mc");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:question-kinds`

Expected: FAIL because `resolveKindForAge` is not exported.

- [ ] **Step 3: Implement centralized resolution**

In `questionKinds.js`, import `kindsForAge` and add:

```js
const DIRECT_ANSWER_MODES = new Set(["rink-actors", "rink-zones"]);

export function resolveKindForAge(node, ageBand) {
  const authoredKind = resolveKind(node);
  if (!authoredKind) return null;
  if (kindsForAge(ageBand).includes(authoredKind)) return authoredKind;
  if (DIRECT_ANSWER_MODES.has(kindSpec(authoredKind)?.answer)) return authoredKind;
  return "read-mc";
}
```

Replace the inline profile fallback in `AnimatedPlay.jsx` with
`resolveKindForAge(node, ageBand)`. Replace equivalent fallback logic in
`prototypeTelemetry.js` so telemetry records the interaction the learner
actually receives.

- [ ] **Step 4: Run focused and adjacent tests and verify GREEN**

Run:

```powershell
npm run test:question-kinds
npm run test:prototype-telemetry
```

Expected: both commands PASS with no new warnings.

- [ ] **Step 5: Commit Task 1**

```powershell
git add src/play/questionKinds.js src/play/AnimatedPlay.jsx src/play/prototypeTelemetry.js scripts/test-question-kinds.mjs
git commit -m "fix(play): preserve direct interaction kinds"
```

---

### Task 2: Make actor selection generous and accessible

**Files:**
- Create: `src/play/ActorTapTargets.jsx`
- Modify: `src/play/AnimatedPlay.jsx`
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- Consumes: `options`, `positions`, `picked`, and `onChoose(option, index)`.
- Produces: `ActorTapTargets` SVG component with one accessible target per valid `actorId`.

- [ ] **Step 1: Write failing renderer-contract tests**

Add a source-contract test that reads `ActorTapTargets.jsx` and verifies the
generous radius, accessible button semantics, and one activation callback:

```js
it("renders generous accessible actor tap targets", () => {
  const src = readFileSync(new URL("../src/play/ActorTapTargets.jsx", import.meta.url), "utf8");
  assert.match(src, /HIT_RADIUS\s*=\s*8/);
  assert.ok(src.includes('role="button"'));
  assert.ok(src.includes('tabIndex={disabled ? -1 : 0}'));
  assert.ok(src.includes('aria-label={option.t}'));
  assert.ok(src.includes('data-actor-id={option.actorId}'));
  assert.ok(src.includes('key === "Enter" || key === " "'));
});
```

Update the existing hit-test-order test to assert that `<ActorTapTargets` is
rendered after actor tokens and the puck.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:question-kinds`

Expected: FAIL because `src/play/ActorTapTargets.jsx` does not exist.

- [ ] **Step 3: Implement the SVG target component**

Create `ActorTapTargets.jsx` with a fixed rink-unit radius of `8`, an invisible
circle for hit testing, a visible selected ring, and shared activation logic:

```jsx
const HIT_RADIUS = 8;
const SELECTED_RADIUS = 6.5;

export function ActorTapTargets({ options = [], positions = {}, picked = null, disabled = false, onChoose }) {
  return options.map((option, index) => {
    const point = positions[option.actorId];
    if (!point) return null;
    const activate = () => {
      if (!disabled) onChoose?.(option, index);
    };
    return (
      <g
        key={option.id}
        data-actor-id={option.actorId}
        transform={`translate(${point[0]},${point[1]})`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={option.t}
        onClick={activate}
        onKeyDown={(event) => {
          const key = event.key;
          if (key === "Enter" || key === " ") {
            event.preventDefault();
            activate();
          }
        }}
        style={{ cursor: disabled ? "default" : "pointer", outline: "none" }}
      >
        <circle r={HIT_RADIUS} fill="transparent" pointerEvents="all" />
        {picked === index && (
          <circle r={SELECTED_RADIUS} fill="none" stroke="#C9A24B" strokeWidth="1.4" />
        )}
      </g>
    );
  });
}
```

Import the component into `AnimatedPlay.jsx` and replace the inline
`spot-mistake` target map with:

```jsx
{!node.terminal && kind === "spot-mistake" && (
  <ActorTapTargets
    options={node.ask.opts}
    positions={positions}
    picked={picked}
    disabled={picked !== null}
    onChoose={choose}
  />
)}
```

Keep it after the actor and puck elements so the invisible circles receive the
pointer event. Use only `onClick` plus keyboard activation; pointer-generated
click events avoid separate touch/click double submission.

- [ ] **Step 4: Run focused tests and build**

Run:

```powershell
npm run test:question-kinds
npm run build
```

Expected: tests PASS and Vite build exits `0` without JSX errors.

- [ ] **Step 5: Commit Task 2**

```powershell
git add src/play/ActorTapTargets.jsx src/play/AnimatedPlay.jsx scripts/test-question-kinds.mjs
git commit -m "feat(play): add accessible actor tap targets"
```

---

### Task 3: Reject prompt and answer-mode mismatches

**Files:**
- Modify: `src/play/questionKinds.js`
- Modify: `src/play/validateAnimatedPlay.js`
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- Consumes: question prompt text and `kindSpec(kind).answer`.
- Produces: `validatePromptAnswerContract(prompt, kind) -> string|null`.

- [ ] **Step 1: Write failing semantic-contract tests**

Add:

```js
it("rejects direct-manipulation wording for button answers", () => {
  assert.match(
    validatePromptAnswerContract("Tap the skater who made the wrong read.", "read-mc"),
    /requires a direct rink interaction/
  );
  assert.match(
    validatePromptAnswerContract("Move the skater into support.", "read-mc"),
    /requires a direct rink interaction/
  );
  assert.equal(
    validatePromptAnswerContract("Which skater made the wrong read?", "read-mc"),
    null
  );
  assert.equal(
    validatePromptAnswerContract("Tap the skater who made the wrong read.", "spot-mistake"),
    null
  );
});
```

Also clone a valid play, change an MC prompt to `"Tap the best answer."`, and
assert `validateAnimatedPlay` returns an error containing the node id.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm run test:question-kinds`

Expected: FAIL because `validatePromptAnswerContract` is not exported.

- [ ] **Step 3: Implement the semantic validator**

In `questionKinds.js`, add:

```js
const DIRECT_PROMPT = /\b(tap|click|drag|move|skate|draw|trace|pass|shoot)\b/i;
const DIRECT_ANSWER_MODES_FOR_COPY = new Set(["rink-actors", "rink-zones"]);

export function validatePromptAnswerContract(prompt, kind) {
  if (!DIRECT_PROMPT.test(String(prompt || ""))) return null;
  if (DIRECT_ANSWER_MODES_FOR_COPY.has(kindSpec(kind)?.answer)) return null;
  return `prompt requests direct rink interaction but ${kind || "unknown"} renders ${kindSpec(kind)?.answer || "no answer mode"}`;
}
```

In `validateAnimatedPlay.js`, validate `node.ask?.q || node.q` against the
authored kind. Push an error formatted as
`node ${nodeId} ${contractError}` when the helper returns a message.

- [ ] **Step 4: Run validation tests and the complete play suite**

Run:

```powershell
npm run test:question-kinds
npm run test:animated-play
npm run test:play-engine
npm run test:play-telemetry
```

Expected: all commands PASS. Existing valid plays produce no new contract
errors.

- [ ] **Step 5: Commit Task 3**

```powershell
git add src/play/questionKinds.js src/play/validateAnimatedPlay.js scripts/test-question-kinds.mjs
git commit -m "test(play): enforce prompt interaction semantics"
```

---

### Task 4: Verify the playtest behavior end to end

**Files:**
- Modify only if verification exposes a defect in the files already listed.

**Interfaces:**
- Consumes: completed direct-kind resolution, actor target rendering, and semantic validation.
- Produces: verified `#playtest` behavior for the flat-support spot-mistake play.

- [ ] **Step 1: Run the complete targeted verification set**

Run:

```powershell
npm run test:question-kinds
npm run test:animated-play
npm run test:prototype-telemetry
npm run test:play-engine
npm run test:play-telemetry
npm run build
```

Expected: every command exits `0`.

- [ ] **Step 2: Manually verify the local playtest**

Open `http://localhost:5173/#playtest`, select
`2-on-1: Spot the wrong read`, and choose the U7 playground profile.

Verify:

- The prompt still says `Tap that skater.`
- No multiple-choice answer buttons appear.
- Each answer skater can be selected by tapping slightly outside its visible token.
- Keyboard focus reaches each eligible skater, and Enter/Space selects it.
- The selected skater receives a visible ring.
- Tapping the support skater follows the correct reveal path.
- Tapping another eligible skater follows the existing teaching-note path.

- [ ] **Step 3: Inspect the final diff and status**

Run:

```powershell
git diff --check HEAD~3..HEAD
git status --short --branch
```

Expected: no whitespace errors; unrelated pre-existing untracked files remain
untouched.

- [ ] **Step 4: Record verification if a final adjustment was required**

If verification required an in-scope code correction, repeat the failing test,
minimal fix, and green test cycle, then commit only those files:

```powershell
git add src/play/questionKinds.js src/play/AnimatedPlay.jsx src/play/ActorTapTargets.jsx src/play/prototypeTelemetry.js src/play/validateAnimatedPlay.js scripts/test-question-kinds.mjs
git commit -m "fix(play): complete direct tap verification"
```

If no correction was required, do not create an empty commit.
