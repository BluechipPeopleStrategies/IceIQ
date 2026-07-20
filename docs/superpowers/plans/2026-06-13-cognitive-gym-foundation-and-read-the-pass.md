# Cognitive Gym Foundation + Read the Pass Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a graded points system, a unified earn/relegate leveling model, and the intro template to the Cognitive Gym, then rework Read the Pass to use graded scoring, a bigger gold bar, a much smaller success window, and travel in all four directions.

**Architecture:** Add small pure modules (`gymPoints.js`, `anticipationCore.js`) and extend the existing pure-ish modules (`gymEngine.js`, `gymStorage.js`) so all scoring/leveling logic is unit-testable with the project's plain-Node test scripts. The React drill components consume these and are play-tested. This is the first shippable increment; the 5 new games follow in a later plan.

**Tech Stack:** React (hooks), HTML canvas 2D, plain `localStorage`, plain-Node test scripts (`node scripts/test-*.mjs`). No new dependencies.

**Source spec:** `docs/superpowers/specs/2026-06-13-cognitive-gym-expansion-design.md`

---

## File structure

- Create `src/cognitive-gym/gymPoints.js` — graded points curve (pure).
- Create `src/cognitive-gym/anticipationCore.js` — Read the Pass direction + scoring helpers (pure).
- Modify `src/cognitive-gym/gymEngine.js` — `createAdaptiveLevel` gains streak seeding + progress getters.
- Modify `src/cognitive-gym/gymStorage.js` — persist `streak`, store session `points`, add `careerPointsFromDrills`, extend `getStats`.
- Modify `src/cognitive-gym/CognitiveGym.jsx` — registry `goal`/`why`/`build` fields, gym-wide intro block, career-points stat, level-progress on cards.
- Modify `src/cognitive-gym/AnticipationDrill.jsx` — graded points, bigger bar, smaller window, 4 directions, leveling progress, persist streak.
- Modify `src/cognitive-gym/TrackingDrill.jsx`, `src/cognitive-gym/ReactionDrill.jsx` — adopt the intro template (goal/why) and persist streak.
- Create `scripts/test-gym.mjs` — golden tests for the pure modules.
- Modify `package.json` — add `"test:gym": "node scripts/test-gym.mjs"`.

---

## Task 1: Points curve module

**Files:**
- Create: `src/cognitive-gym/gymPoints.js`
- Test: `scripts/test-gym.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write the module**

```js
// src/cognitive-gym/gymPoints.js
// Graded scoring for the Cognitive Gym, GeoGuessr-style: closer is worth more.
// Pure and dependency-free so it is unit-testable without a browser.

export const MAX_REP = 1000; // points for a perfect, bang-on rep
export const DECAY = 0.12;   // smaller = points fall off faster with error

// Points for one rep given a NORMALIZED error in [0, 1] (0 = exact).
// Exponential decay: exact -> MAX_REP, larger error -> smoothly toward 0.
export function gradedPoints(normError, { maxRep = MAX_REP, decay = DECAY } = {}) {
  const e = Math.min(Math.max(normError, 0), 1);
  return Math.round(maxRep * Math.exp(-e / decay));
}
```

- [ ] **Step 2: Write the failing test**

```js
// scripts/test-gym.mjs
import { gradedPoints, MAX_REP } from "../src/cognitive-gym/gymPoints.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// gradedPoints
check("exact gives max", gradedPoints(0) === MAX_REP);
check("clamps negative error to max", gradedPoints(-0.5) === MAX_REP);
check("error past 1 same as 1", gradedPoints(2) === gradedPoints(1));
check("monotonic decreasing", gradedPoints(0.05) > gradedPoints(0.2) && gradedPoints(0.2) > gradedPoints(0.6));
check("bang-on beats barely-right", gradedPoints(0) > gradedPoints(0.05));

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Register the script**

In `package.json` scripts, after `"test:browse": ...` add:

```json
    "test:gym": "node scripts/test-gym.mjs",
```

- [ ] **Step 4: Run the test**

Run: `npm run test:gym`
Expected: all PASS, "All passed".

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/gymPoints.js scripts/test-gym.mjs package.json
git commit -m "feat(gym): graded GeoGuessr-style points curve + tests"
```

---

## Task 2: Leveling — streak seeding + progress getters

**Files:**
- Modify: `src/cognitive-gym/gymEngine.js:8-41` (`createAdaptiveLevel`)
- Test: `scripts/test-gym.mjs`

- [ ] **Step 1: Replace `createAdaptiveLevel`**

```js
// src/cognitive-gym/gymEngine.js
export function createAdaptiveLevel(startLevel = 1, opts = {}) {
  const {
    maxLevel = 20,
    upStreak = 3,
    downStreak = 2,
    startUps = 0,
    startDowns = 0,
  } = opts;
  let level = Math.min(Math.max(startLevel, 1), maxLevel);
  let ups = Math.min(Math.max(startUps, 0), upStreak - 1);
  let downs = Math.min(Math.max(startDowns, 0), downStreak - 1);
  return {
    get level() { return level; },
    get ups() { return ups; },
    get downs() { return downs; },
    // consecutive same-result reps still needed to promote / relegate
    get toPromote() { return Math.max(1, upStreak - ups); },
    get toRelegate() { return Math.max(1, downStreak - downs); },
    record(success) {
      if (success) {
        ups += 1;
        downs = 0;
        if (ups >= upStreak && level < maxLevel) { level += 1; ups = 0; }
      } else {
        downs += 1;
        ups = 0;
        if (downs >= downStreak && level > 1) { level -= 1; downs = 0; }
      }
      return level;
    },
    snapshot() { return { level, ups, downs }; },
    reset(to = 1) { level = Math.min(Math.max(to, 1), maxLevel); ups = 0; downs = 0; },
  };
}
```

- [ ] **Step 2: Add tests to `scripts/test-gym.mjs`**

Add after the import line:

```js
import { createAdaptiveLevel } from "../src/cognitive-gym/gymEngine.js";
```

Add before the final summary block:

```js
// leveling: earn promotion, relegation, mixed resets, seeding, clamps
const up3 = createAdaptiveLevel(5);
up3.record(true); up3.record(true);
check("two wins not yet promoted", up3.level === 5 && up3.toPromote === 1);
check("third win promotes", up3.record(true) === 6 && up3.ups === 0);

const down = createAdaptiveLevel(5);
down.record(false);
check("one loss not yet relegated", down.level === 5 && down.toRelegate === 1);
check("second loss relegates", down.record(false) === 4);

const mix = createAdaptiveLevel(5);
mix.record(true); mix.record(true); mix.record(false);
check("a loss resets the up-streak", mix.ups === 0 && mix.level === 5);

const seeded = createAdaptiveLevel(7, { startUps: 2 });
check("seeded streak promotes on first win", seeded.record(true) === 8);

const floor = createAdaptiveLevel(1);
check("cannot relegate below 1", floor.record(false) === 1 && floor.record(false) === 1);
const ceil = createAdaptiveLevel(20);
check("cannot promote above max", ceil.record(true) === 20 && ceil.record(true) === 20 && ceil.record(true) === 20);
```

- [ ] **Step 3: Run the test**

Run: `npm run test:gym`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/gymEngine.js scripts/test-gym.mjs
git commit -m "feat(gym): adaptive level seeding + promote/relegate progress getters"
```

---

## Task 3: Storage — persist streak, store points, career points

**Files:**
- Modify: `src/cognitive-gym/gymStorage.js`
- Test: `scripts/test-gym.mjs`

- [ ] **Step 1: Update `emptyDrill`, `getDrill`, `saveSession`; add `careerPointsFromDrills`; extend `getStats`**

Replace the `emptyDrill` line and `getDrill`/`saveSession`/`getStats` with:

```js
const emptyDrill = () => ({ level: 1, streak: { ups: 0, downs: 0 }, best: 0, bestPoints: 0, sessions: [] });

// Read one drill's record, normalized so older records gain the new fields.
export function getDrill(playerId, drillId) {
  const all = readAll();
  const stored = (all[playerId] && all[playerId][drillId]) || {};
  return { ...emptyDrill(), ...stored, streak: { ...emptyDrill().streak, ...(stored.streak || {}) } };
}

// Append a completed session, update level + streak + best + bestPoints, persist.
// Session history is capped at the most recent 200 entries.
export function saveSession(playerId, drillId, session) {
  const all = readAll();
  if (!all[playerId]) all[playerId] = {};
  const drill = { ...emptyDrill(), ...(all[playerId][drillId] || {}) };
  drill.level = session.level;
  drill.streak = session.streak || { ups: 0, downs: 0 };
  drill.best = Math.max(drill.best, Math.round(session.score));
  drill.bestPoints = Math.max(drill.bestPoints || 0, Math.round(session.points || 0));
  drill.sessions.push({
    date: new Date().toISOString(),
    score: Math.round(session.score),
    points: Math.round(session.points || 0),
    level: session.level,
    meta: session.meta || null,
  });
  if (drill.sessions.length > 200) drill.sessions = drill.sessions.slice(-200);
  all[playerId][drillId] = drill;
  writeAll(all);
  return drill;
}

// Sum points across all sessions of all drills. Pure; legacy point-less
// sessions count as 0. Exported for testing and reuse.
export function careerPointsFromDrills(drills) {
  let total = 0;
  for (const d of Object.values(drills || {})) {
    for (const s of d.sessions || []) total += s.points || 0;
  }
  return total;
}
```

In `getStats`, change the final `return` to include career points:

```js
  return {
    totalSessions,
    daysTrained: days.size,
    streak,
    careerPoints: careerPointsFromDrills(drills),
  };
```

- [ ] **Step 2: Add a test for `careerPointsFromDrills`**

Add to `scripts/test-gym.mjs` imports:

```js
import { careerPointsFromDrills } from "../src/cognitive-gym/gymStorage.js";
```

Add before the summary:

```js
const drills = {
  anticipation: { sessions: [{ points: 800 }, { points: 600 }] },
  tracking: { sessions: [{ points: 400 }, {}] }, // legacy session, no points
};
check("career points sums and ignores missing", careerPointsFromDrills(drills) === 1800);
check("career points empty is 0", careerPointsFromDrills({}) === 0);
```

NOTE: `gymStorage.js` references `localStorage` at module load only inside functions, so importing it in Node is safe as long as the test does not call `readAll`-backed functions. `careerPointsFromDrills` is pure and does not touch storage.

- [ ] **Step 3: Run the test**

Run: `npm run test:gym`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/gymStorage.js scripts/test-gym.mjs
git commit -m "feat(gym): persist streak + session points, add career-points aggregate"
```

---

## Task 4: Read the Pass core — directions + graded scoring (pure)

**Files:**
- Create: `src/cognitive-gym/anticipationCore.js`
- Test: `scripts/test-gym.mjs`

- [ ] **Step 1: Write the module**

```js
// src/cognitive-gym/anticipationCore.js
// Pure helpers for Read the Pass: travel direction geometry and graded scoring.
import { gradedPoints } from "./gymPoints.js";

export const DIRECTIONS = ["lr", "rl", "tb", "bt"];

// Which axis the GUESS varies along. Horizontal travel (lr/rl) crosses a
// VERTICAL gold bar, so the guess varies in Y. Vertical travel (tb/bt) crosses
// a HORIZONTAL bar, so the guess varies in X.
export function guessAxis(dir) {
  return dir === "lr" || dir === "rl" ? "y" : "x";
}

// Grade one guess along the cross-line.
//   guess, cross : coordinate along the guess axis (px)
//   span         : rink size along that axis (px) used to normalize error
//   tolerance    : success window radius (px)
// Returns { success, error, points }.
export function scorePass(guess, cross, span, tolerance) {
  const error = Math.abs(guess - cross);
  const success = error <= tolerance;
  const points = gradedPoints(span > 0 ? error / span : 1);
  return { success, error, points };
}
```

- [ ] **Step 2: Add tests**

Add to imports in `scripts/test-gym.mjs`:

```js
import { DIRECTIONS, guessAxis, scorePass } from "../src/cognitive-gym/anticipationCore.js";
```

Add before the summary:

```js
check("four directions", DIRECTIONS.length === 4 && DIRECTIONS.join() === "lr,rl,tb,bt");
check("horizontal travel guesses in Y", guessAxis("lr") === "y" && guessAxis("rl") === "y");
check("vertical travel guesses in X", guessAxis("tb") === "x" && guessAxis("bt") === "x");

const bang = scorePass(100, 100, 300, 10);
check("bang-on is success with max points", bang.success && bang.points === 1000);
const inside = scorePass(108, 100, 300, 10);
check("inside window but off scores less than bang-on", inside.success && inside.points < 1000);
const outside = scorePass(140, 100, 300, 10);
check("outside window fails", !outside.success);
const near = scorePass(105, 100, 300, 10);
const far = scorePass(118, 100, 300, 10);
check("closer scores higher", near.points > far.points);
```

- [ ] **Step 3: Run the test**

Run: `npm run test:gym`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/anticipationCore.js scripts/test-gym.mjs
git commit -m "feat(gym): Read the Pass direction + graded-scoring helpers + tests"
```

---

## Task 5: Registry fields + gym-wide intro + career stat + card progress

**Files:**
- Modify: `src/cognitive-gym/CognitiveGym.jsx`

This task is UI; verify by play-test (open the gym hub in the running dev server).

- [ ] **Step 1: Extend each `DRILLS` entry with `goal`, `why`, `build`**

For the three existing entries add fields (keep `blurb`/`trains`). Example for anticipation:

```js
  {
    id: "anticipation",
    name: "Read the Pass",
    skill: "Anticipation",
    blurb: "Predict where a hidden puck crosses the line.",
    goal: "Call where the puck is going before it gets there.",
    why: "This is reading a pass early, picking off a lane, and arriving where the puck will be instead of chasing where it was.",
    trains: "Reading plays, picking off passes, judging bank passes",
    build: "canvas",
    component: AnticipationDrill,
  },
```

Add `goal`, `why`, `build: "canvas"` to `tracking` and `reaction` similarly (use their existing `trains` text to write `why` in plain, warm language; no em dashes).

- [ ] **Step 2: Add the gym-wide intro block above the grid**

In the hub return, immediately after `</header>` and before `<div className="gym-grid">`, insert:

```jsx
      <section className="gym-about">
        <h2>What this is</h2>
        <p>
          The Cognitive Gym trains the part of your game that happens between the
          ears: anticipation, awareness, and fast, clean decisions. Short
          sessions, a few times a week, and the level climbs as you do.
        </p>
        <ul>
          <li>Keep sessions short. Two or three a week beats one long grind.</li>
          <li>Each game adapts. String good reps together and you move up.</li>
          <li>Slip and you drop back a level, so every rep counts.</li>
        </ul>
      </section>
```

- [ ] **Step 3: Add a career-points stat**

In the `.gym-stats` row, after the existing three `.gym-stat` blocks, add:

```jsx
          <div className="gym-stat">
            <span className="gym-stat-num">{stats.careerPoints ?? 0}</span>
            <span className="gym-stat-label">points</span>
          </div>
```

- [ ] **Step 4: Show level progress on each card**

Replace the `.gym-card-meta` block inside the card map with:

```jsx
              <div className="gym-card-meta">
                <span>Lvl {rec.level}</span>
                <span>Best {rec.bestPoints || rec.best}</span>
                <span>
                  {last
                    ? `Last ${new Date(last.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    : "Not played yet"}
                </span>
              </div>
```

- [ ] **Step 5: Add minimal styles**

Append to `src/cognitive-gym/cognitive-gym.css`:

```css
.gym-about {
  background: var(--gym-panel);
  border: 1px solid #1e3f5f;
  border-radius: var(--gym-radius);
  padding: 14px 16px;
  margin: 0 0 18px;
  max-width: 640px;
}
.gym-about h2 { margin: 0 0 6px; font-size: 1.05rem; }
.gym-about p { margin: 0 0 8px; color: var(--gym-muted); font-size: 0.9rem; line-height: 1.45; }
.gym-about ul { margin: 0; padding-left: 18px; color: var(--gym-text); font-size: 0.85rem; line-height: 1.5; }
```

- [ ] **Step 6: Play-test**

Open `http://localhost:5175/` -> Cognitive Gym (via dev panel or in-app). Expected: the "What this is" block shows above the grid, a "points" stat shows in the header, cards show level + best points.

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/CognitiveGym.jsx src/cognitive-gym/cognitive-gym.css
git commit -m "feat(gym): registry goal/why/build, gym-wide intro, career-points stat"
```

---

## Task 6: Intro template on all three existing drills

**Files:**
- Modify: `src/cognitive-gym/AnticipationDrill.jsx`, `TrackingDrill.jsx`, `ReactionDrill.jsx` (intro JSX only)

The drills do not import the registry, so pass `goal`/`why` as the intro copy directly in each. Keep "The game:" mechanics; add a "Your goal:" line first and a warmer "why" block.

- [ ] **Step 1: Update each intro card**

In each drill's `phase === "intro"` block, make the first paragraph the goal and keep mechanics second. Example for `AnticipationDrill.jsx` (replace the intro `<p>` and `.gym-trains`):

```jsx
          <p className="gym-goal"><strong>Your goal:</strong> call where the puck is going before it gets there.</p>
          <p>
            <strong>The game:</strong> a puck launches across the ice, then
            disappears partway. Track its angle and speed in your head, then tap
            the gold bar where it will cross. It can come from any side. Blue
            marker means you read it, orange means you missed.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Reading a pass early is how you pick off a lane, beat a player to
              the spot, and arrive where the puck will be instead of chasing
              where it was.
            </span>
          </div>
```

Do the equivalent for `TrackingDrill.jsx` and `ReactionDrill.jsx`: add a `gym-goal` line, keep mechanics, reword the callout heading to "Why it matters" in warm, plain language.

- [ ] **Step 2: Add the goal style**

Append to `cognitive-gym.css`:

```css
.gym-goal { color: var(--gym-gold); font-weight: 600; margin: 0 0 10px; }
```

- [ ] **Step 3: Play-test each intro**

Open each game's intro screen. Expected: "Your goal:" line is first and clear; mechanics follow; "Why it matters" reads in plain language.

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/AnticipationDrill.jsx src/cognitive-gym/TrackingDrill.jsx src/cognitive-gym/ReactionDrill.jsx src/cognitive-gym/cognitive-gym.css
git commit -m "feat(gym): goal-first intro template across the three drills"
```

---

## Task 7: Read the Pass — bigger bar, smaller window, 4 directions

**Files:**
- Modify: `src/cognitive-gym/AnticipationDrill.jsx` (`buildTrajectory` + `loop` + `handleGuess`)

Geometry/render is play-tested. Replace `buildTrajectory` with a direction-aware version that emits absolute points and a cross coordinate along the guess axis.

- [ ] **Step 1: Replace `buildTrajectory`**

```js
import { DIRECTIONS, guessAxis, scorePass } from "./anticipationCore";
// ...keep existing imports...

const BAR = 22; // gold bar thickness in px (was a 4px line) — bigger target

function pickDirection() {
  return DIRECTIONS[Math.floor(rand(0, DIRECTIONS.length))];
}

// Build the full puck path for a round in a random direction. `motion` is the
// travel axis; the gold bar sits on the exit edge; the guess varies along the
// other axis. Difficulty raises speed, hides earlier, and shrinks tolerance.
function buildTrajectory(W, H, level, dir = pickDirection()) {
  const t = levelT(level);
  const r = 8;
  const motion = dir === "lr" || dir === "rl" ? "x" : "y";
  const motionSpan = motion === "x" ? W : H;
  const crossSpan = motion === "x" ? H : W;
  const speed = motionSpan * lerp(0.35, 0.9, t);
  const maxAngle = lerp(20, 50, t) * (Math.PI / 180);
  const angle = rand(-maxAngle, maxAngle);

  // start/exit positions along the motion axis
  const lo = 24;
  const hi = motionSpan - 36;
  const forward = dir === "lr" || dir === "tb";
  let m = forward ? lo : hi;            // motion coord
  let c = rand(crossSpan * 0.2, crossSpan * 0.8); // cross coord
  const exitM = forward ? hi : lo;
  const vMotion = (forward ? 1 : -1) * Math.cos(angle) * speed;
  let vCross = Math.sin(angle) * speed;

  const DT = 1 / 120;
  let time = 0;
  const pts = [];
  const push = () => {
    // map (m, c) back to absolute (x, y)
    const x = motion === "x" ? m : c;
    const y = motion === "x" ? c : m;
    pts.push({ x, y, t: time });
  };
  push();
  const done = () => (forward ? m >= exitM : m <= exitM);
  while (!done() && time < 20) {
    m += vMotion * DT;
    c += vCross * DT;
    time += DT;
    if (c < r) { c = 2 * r - c; vCross = -vCross; }
    else if (c > crossSpan - r) { c = 2 * (crossSpan - r) - c; vCross = -vCross; }
    push();
  }

  const hideFrac = lerp(0.55, 0.25, t); // fraction of the path still visible
  return {
    pts,
    motion,                          // "x" | "y"
    axis: guessAxis(dir),            // "y" | "x" — where the guess varies
    exitM,                           // motion-axis coordinate of the gold bar
    crossPos: c,                     // guess-axis coordinate of the true crossing
    crossT: time,
    hideM: forward ? lo + (hi - lo) * hideFrac : hi - (hi - lo) * hideFrac,
    forward,
    tolerance: crossSpan * lerp(0.075, 0.02, t), // MUCH smaller success window
    crossSpan,
    r,
  };
}
```

- [ ] **Step 2: Update `loop` to draw the bar and puck for both orientations**

Replace the gold-line draw and the live/hide/reveal puck logic so it uses `traj.motion`. Key changes:

```js
      // gold crossing BAR on the exit edge (thick, more target area)
      ctx.fillStyle = "#f2b705";
      if (traj.motion === "x") ctx.fillRect(traj.exitM - BAR / 2, 0, BAR, H);
      else ctx.fillRect(0, traj.exitM - BAR / 2, W, BAR);
```

For the live phase, hide the puck once it passes `hideM` along the motion axis (compare `pt.x`/`pt.y` per `traj.motion`):

```js
        const m = traj.motion === "x" ? pt.x : pt.y;
        const past = traj.forward ? m > traj.hideM : m < traj.hideM;
        if (!past) drawPuck(ctx, pt.x, pt.y, traj.r);
        else { /* draw the faint mask band over the hidden stretch (oriented by motion) */ }
```

For the guess marker and tolerance ring at reveal, place them on the bar using the guess axis:

```js
        const gx = traj.motion === "x" ? traj.exitM : sc.guessC;
        const gy = traj.motion === "x" ? sc.guessC : traj.exitM;
        // marker at (gx, gy); faint line from guess to true crossing for "how close was I"
```

(Exact mask-band and reveal drawing are tuned in play-test; keep the existing 3x-speed reveal, now along the motion axis.)

- [ ] **Step 3: Update `handleGuess` to score with `scorePass`**

```js
  function handleGuess(evt) {
    const sc = sceneRef.current;
    if (phase !== "playing" || !sc.traj || sc.revealStart !== null) return;
    evt.preventDefault();
    const pos = pointerPos(evt, canvasRef.current);
    const traj = sc.traj;
    const guessC = traj.axis === "y" ? Math.min(Math.max(pos.y, 0), sc.H)
                                     : Math.min(Math.max(pos.x, 0), sc.W);
    const { success, points } = scorePass(guessC, traj.crossPos, traj.crossSpan, traj.tolerance);
    sc.guessC = guessC;
    sc.result = success ? "hit" : "miss";
    sc.repPoints = points;
    sc.frozenIdx = Math.min(Math.floor((performance.now() - sc.startedAt) / 1000 / (1 / 120)), traj.pts.length - 1);
    sc.revealStart = performance.now();
  }
```

- [ ] **Step 4: Play-test directions**

Open Read the Pass, play several reps. Expected: pucks arrive from left, right, top, and bottom across reps; the gold bar is a thick band on the exit edge; the success ring is visibly smaller than before.

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/AnticipationDrill.jsx
git commit -m "feat(gym): Read the Pass travels all 4 directions, bigger bar, smaller window"
```

---

## Task 8: Read the Pass — graded points, leveling progress, persist streak

**Files:**
- Modify: `src/cognitive-gym/AnticipationDrill.jsx` (`resolveRound`, points accumulation, `start`, done screen, drill-bar)

- [ ] **Step 1: Accumulate session points**

Add a points ref and state. Near the other `useState`s add:

```js
  const [points, setPoints] = useState(0);
  const pointsRef = useRef(0);
```

In `resolveRound`, add the rep points before advancing:

```js
    pointsRef.current += sceneRef.current.repPoints || 0;
    setPoints(pointsRef.current);
```

- [ ] **Step 2: Seed and persist the streak**

In `start`, seed the engine from the stored streak:

```js
  function start() {
    const d = getDrill(playerId, "anticipation");
    engineRef.current = createAdaptiveLevel(d.level, { startUps: d.streak.ups, startDowns: d.streak.downs });
    setHits(0); setRound(0); setSaved(null);
    pointsRef.current = 0; setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startRound(0));
  }
```

In the `phase === "done"` save effect, write points + streak:

```js
  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / ROUNDS) * 100);
      const record = saveSession(playerId, "anticipation", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
    }
  }, [phase, saved, hits, playerId]);
```

- [ ] **Step 3: Show points float + leveling progress**

Add a per-rep points float in the reveal (drawn text near the guess marker), and a progress chip in the drill bar:

```jsx
        {phase === "playing" && (
          <span className="gym-chip">
            {engineRef.current ? `${engineRef.current.toPromote} to level up` : ""}
          </span>
        )}
```

- [ ] **Step 4: Update the done screen to lead with points**

```jsx
      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <div className="gym-score">{points}</div>
          <p>
            {points} points. {hits} of {ROUNDS} reads inside the window. Level {level}.
          </p>
          <div className="gym-row">
            <button className="gym-btn" onClick={start}>Go again</button>
            <button className="gym-btn gym-btn-ghost" onClick={onExit}>Done</button>
          </div>
        </div>
      )}
```

- [ ] **Step 5: Play-test the full loop**

Play a full 8-rep session. Expected: points accumulate (closer taps score more), "N to level up" counts down, a clean streak promotes, misses relegate, and reopening the game resumes the level + streak.

- [ ] **Step 6: Commit**

```bash
git add src/cognitive-gym/AnticipationDrill.jsx
git commit -m "feat(gym): Read the Pass graded points, level progress, persistent streak"
```

---

## Self-review notes

- **Spec coverage:** points system (Tasks 1, 8) ✓; unified leveling + persistence + visible progress (Tasks 2, 5, 8) ✓; intro overhaul gym-wide + goal + why (Tasks 5, 6) ✓; Read the Pass bigger bar + smaller window + graded + all directions (Tasks 4, 7, 8) ✓. The 5 new games are explicitly out of scope for this plan (next plan).
- **Type consistency:** `gradedPoints`, `scorePass`, `guessAxis`, `createAdaptiveLevel` getters (`ups`/`downs`/`toPromote`), and the storage `streak`/`points`/`bestPoints`/`careerPointsFromDrills` names are used consistently across tasks.
- **Tuning flagged:** BAR thickness, tolerance fractions, DECAY, and reveal drawing are starting values to adjust in play-test, per the spec's open questions.
