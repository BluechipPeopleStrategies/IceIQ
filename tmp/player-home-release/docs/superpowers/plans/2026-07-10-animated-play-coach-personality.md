# Animated-Play Coach Personality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reuse the existing RinkReads coach personalities in animated-play feedback with bounded, session-stable variable reinforcement.

**Architecture:** Extract coach data and pure selection helpers from `App.jsx` into `coachPersonas.js`, then import them back into the main quiz and into animated plays. Add a pure reinforcement state machine with a session-storage adapter. Render coach spotlights only after scheduled answers while preserving explicit correctness and teaching copy on every answer.

**Tech Stack:** React 18, plain JavaScript/JSX, browser sessionStorage, Node test runner.

## Global Constraints

- Do not add dependencies or new coach personalities.
- Preserve existing coach wording, portraits, roles, tilts, and quiz behavior.
- Incorrect answers and the first correct answer always show a coach.
- Later correct spotlights have deterministic gaps of two to four correct answers; no gap exceeds four.
- Reprocessing the same answer event does not advance state twice.
- Correctness and teaching explanations display on every answer.
- Coach feedback never appears before an answer.

---

### Task 1: Extract the shared coach-personality model

**Files:**
- Create: `src/coachPersonas.js`
- Modify: `src/App.jsx`
- Test: `scripts/test-coach-personas.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `COACH_PERSONAS`, `getAgeTier(level)`, `getDemoCoachRoster(level, position)`, `getCoachForQuestion(question, level, position)`, and `coachReaction(coach, correct, level, reactionIndex)`.

- [ ] **Step 1: Write failing extraction tests**

Create `scripts/test-coach-personas.mjs` asserting four IDs, stable assignment,
multi-coach distribution, and correct/incorrect pool selection:

```js
assert.deepEqual(COACH_PERSONAS.map((coach) => coach.id), ["kincaid", "danno", "marques", "kowalski"]);
assert.equal(getCoachForQuestion({ id: "play:a" }, "U11").id, getCoachForQuestion({ id: "play:a" }, "U11").id);
assert.ok(new Set(["a", "b", "c", "d", "e"].map((id) => getCoachForQuestion({ id }, "U11").id)).size > 1);
assert.ok(getCoachForQuestion({ id: "x" }, "U11"));
assert.equal(typeof coachReaction(COACH_PERSONAS[0], true, "U11", 0), "string");
assert.equal(typeof coachReaction(COACH_PERSONAS[0], false, "U11", 0), "string");
```

Add `"test:coach-personas": "node --test scripts/test-coach-personas.mjs"`.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:coach-personas`

Expected: FAIL because `coachPersonas.js` does not exist.

- [ ] **Step 3: Move the existing data and helpers**

Move `getAgeTier`, `COACH_PERSONAS`, `DEMO_ROSTERS`,
`getDemoCoachRoster`, and `getCoachForQuestion` from `App.jsx` unchanged.
Add:

```js
export function coachReaction(coach, correct, level, reactionIndex = 0) {
  const tier = getAgeTier(level);
  const pool = (correct ? coach?.flavorCorrect : coach?.flavorIncorrect)?.[tier] || [];
  return pool.length ? pool[Math.abs(reactionIndex) % pool.length] : (correct ? "Correct." : "Reset.");
}
```

Import the moved exports in `App.jsx`. Keep `CAT_TO_TILT` in the shared module
because assignment depends on it.

- [ ] **Step 4: Run tests and commit**

Run `npm run test:coach-personas` and `npm run build`; expect PASS.

Commit the four files with `git commit -m "refactor: share coach personality model"`.

---

### Task 2: Implement bounded reinforcement scheduling

**Files:**
- Create: `src/play/coachReinforcement.js`
- Test: `scripts/test-coach-reinforcement.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `initialCoachReinforcement(seed)`, `applyCoachAnswer(state, event) -> { state, showCoach }`, `loadCoachReinforcement(storage)`, and `saveCoachReinforcement(storage, state)`.

- [ ] **Step 1: Write failing schedule tests**

Test first correct, all incorrect, duplicate event IDs, gap bounds, and storage
round-trip across at least 30 correct events.

```js
let state = initialCoachReinforcement("session-a");
let result = applyCoachAnswer(state, { id: "1", correct: true });
assert.equal(result.showCoach, true);
state = result.state;
assert.equal(applyCoachAnswer(state, { id: "1", correct: true }).state.correctSinceCoach, state.correctSinceCoach);
assert.equal(applyCoachAnswer(state, { id: "wrong", correct: false }).showCoach, true);
```

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:coach-reinforcement`

Expected: FAIL because the module is missing.

- [ ] **Step 3: Implement the pure state machine**

State shape:

```js
{ seed, spotlightCount: 0, firstCorrectShown: false, correctSinceCoach: 0, nextGap: 2, handledIds: [] }
```

Derive each next gap from a stable string hash of `${seed}:${spotlightCount}` as
`2 + (hash % 3)`. Keep the last 100 handled IDs. Incorrect answers always set
`showCoach: true` but do not reset the correct gap; first correct shows and
resets; later correct answers show when `correctSinceCoach >= nextGap`.

Use storage key `rinkreads_coach_reinforcement_v1`. Parse failures return a new
state rather than crashing.

- [ ] **Step 4: Run tests and commit**

Run `npm run test:coach-reinforcement`; expect PASS. Commit with
`git commit -m "feat(play): add bounded coach reinforcement"`.

---

### Task 3: Render scheduled coach spotlights in animated feedback

**Files:**
- Create: `src/play/CoachFeedback.jsx`
- Modify: `src/play/AnimatedPlay.jsx`
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- `CoachFeedback({ coach, reaction, correct, explanation })` renders the spotlight.
- `AnimatedPlay` consumes the shared coach model and reinforcement adapter.

- [ ] **Step 1: Write failing source-contract tests**

Assert `CoachFeedback` contains coach image/name/role, `role="status"`, explicit
status, reaction, and explanation. Assert `AnimatedPlay` calls
`applyCoachAnswer` inside `choose`, stores `showCoach`, and renders
`CoachFeedback` only on terminal feedback.

- [ ] **Step 2: Run and verify RED**

Run: `npm run test:question-kinds`

Expected: FAIL because the component and integration are missing.

- [ ] **Step 3: Implement feedback integration**

Resolve coach from `{ id: `${play.id}:${nodeId}`, cat: play.coachCategory }` and
`ageBand`. Use event ID `${play.id}:${nodeId}:${opt.id}`. Load and update the
reinforcement state once in `choose`, save it, and store a feedback snapshot:

```js
{ showCoach, coach, reaction: coachReaction(coach, !!opt.ok, ageBand, result.state.spotlightCount) }
```

Always render the existing correctness/explanation card. When `showCoach` is
true, wrap that content with `CoachFeedback`; otherwise use the compact generic
card. Clear the snapshot on replay.

- [ ] **Step 4: Run tests and commit**

Run `npm run test:question-kinds`, `npm run test:coach-personas`,
`npm run test:coach-reinforcement`, and `npm run build`; expect PASS.

Commit with `git commit -m "feat(play): add scheduled coach feedback"`.

---

### Task 4: Verify catalog-wide behavior

**Files:**
- Modify only prior files if verification exposes a tested defect.

- [ ] **Step 1: Run fresh verification**

Run all new tests plus `test:animated-play`, `test:play-engine`,
`test:play-telemetry`, `test:prototype-telemetry`, and `npm run build`.

- [ ] **Step 2: Manual playtest**

Verify an incorrect answer always shows a coach, first correct shows a coach,
subsequent correct answers sometimes use compact feedback, replay does not
reroll the same answer, and the hockey explanation always appears.

- [ ] **Step 3: Inspect diff and status**

Run `git diff --check 8ddde24..HEAD` and `git status --short --branch`. Do not
touch unrelated files.
