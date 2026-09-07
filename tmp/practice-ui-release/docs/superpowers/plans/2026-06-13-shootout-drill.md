# Shootout Drill ("Pick Your Spot") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Cognitive Gym drill where the player reads which part of the net is open and taps it before the goalie covers it, with difficulty that grows the goalie's coverage and closes the open holes faster as levels climb.

**Architecture:** A pure `shootoutCore.js` (level-to-parameter math, a deterministic shot generator, cell geometry, and scoring) carries all logic and is unit tested with `node --test`, mirroring `bestOptionCore.js`. A canvas component `ShootoutDrill.jsx` mirrors `BestOptionDrill.jsx`: it reads the stored adaptive level, runs a per-shot clock loop, hit-tests taps against net cells, and saves the session through the existing `gymStorage` pipeline. The drill is registered in the `DRILLS` array in `CognitiveGym.jsx`.

**Tech Stack:** React 18 + Vite, plain JavaScript ES modules, HTML canvas, `node --test` + `node:assert/strict`. Reuses `gymEngine.js` (`createAdaptiveLevel`, `setupCanvas`, `pointerPos`, `levelT`, `lerp`), `gymPoints.js` (`gradedPoints`), and `gymStorage.js` (`getDrill`, `saveSession`).

---

## Scope

This plan builds only the Shootout drill, self-contained, shippable on its own. It uses the
existing per-drill adaptive level (starts at level 1 like every other drill). The age-seeded
calibration described in `docs/superpowers/specs/2026-06-13-gym-progression-incentives-design.md`
is a separate plan and will layer onto this drill later with no changes required here.

Scope: U7 / U9 / U11. The difficulty curve is tuned so level 1 is trivially easy (one covered
cell, generous clock, nothing closes) for the youngest, and high levels are tight for U11.

## File structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/cognitive-gym/shootoutCore.js` | Pure: level-to-param math, cell geometry, shot generator, scoring | Create |
| `src/cognitive-gym/ShootoutDrill.jsx` | Canvas drill: clock loop, tap hit-test, session save | Create |
| `src/cognitive-gym/CognitiveGym.jsx` | Register the drill in `DRILLS` | Modify |
| `scripts/test-shootout.mjs` | Unit tests for `shootoutCore` | Create |
| `package.json` | Add `test:shootout` script | Modify |

---

## Task 1: Core difficulty parameters

**Files:**
- Create: `src/cognitive-gym/shootoutCore.js`
- Create: `scripts/test-shootout.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-shootout.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  shotClockMs, coveredAtStartCount, closesDuringShotCount, holeOpenMs,
  EASY_CLOCK_MS, HARD_CLOCK_MS, EASY_HOLE_MS, HARD_HOLE_MS,
} from "../src/cognitive-gym/shootoutCore.js";

// Deterministic PRNG for later tasks.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
globalThis.__mulberry32 = mulberry32; // reused by later test blocks in this file

test("shot clock shrinks with level", () => {
  assert.equal(shotClockMs(1), EASY_CLOCK_MS);
  assert.equal(shotClockMs(20), HARD_CLOCK_MS);
  assert.ok(shotClockMs(1) > shotClockMs(10));
  assert.ok(shotClockMs(10) > shotClockMs(20));
});

test("goalie covers more cells at higher levels", () => {
  assert.equal(coveredAtStartCount(1), 1);
  assert.equal(coveredAtStartCount(20), 4);
  assert.ok(coveredAtStartCount(10) >= coveredAtStartCount(1));
});

test("more cells close mid-shot at higher levels", () => {
  assert.equal(closesDuringShotCount(1), 0);
  assert.equal(closesDuringShotCount(20), 2);
});

test("hole-open window shrinks, and faster at the top (pow curve)", () => {
  assert.equal(holeOpenMs(1), EASY_HOLE_MS);
  assert.equal(holeOpenMs(20), HARD_HOLE_MS);
  const dropLow = holeOpenMs(1) - holeOpenMs(10);
  const dropHigh = holeOpenMs(10) - holeOpenMs(20);
  assert.ok(dropHigh > dropLow, "window should drop faster at high levels");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-shootout.mjs`
Expected: FAIL with module-not-found (`shootoutCore.js` does not exist).

- [ ] **Step 3: Create `src/cognitive-gym/shootoutCore.js` with the parameter helpers**

```js
// src/cognitive-gym/shootoutCore.js
// Pure helpers for the Shootout drill ("Pick Your Spot"): read the open part of
// the net and shoot it before the goalie covers it. No DOM, no canvas, so it is
// unit-testable in plain Node (mirrors bestOptionCore.js).
import { levelT, lerp } from "./gymEngine.js";
import { gradedPoints } from "./gymPoints.js";

// Per-shot clock (ms): even an open cell must be hit before this expires.
export const EASY_CLOCK_MS = 2600;
export const HARD_CLOCK_MS = 900;
// How long a CLOSING hole stays open (ms) before the goalie covers it. The pow
// curve below makes this shrink slowly early and fast at high levels, so the
// goalie effectively gets bigger faster the better you get.
export const EASY_HOLE_MS = 2200;
export const HARD_HOLE_MS = 550;
// Cells the goalie covers at the start of the shot (out of 6).
export const EASY_COVERED = 1;
export const HARD_COVERED = 4;
// Additional cells that close DURING the shot.
export const EASY_CLOSES = 0;
export const HARD_CLOSES = 2;

export function shotClockMs(level) {
  return Math.round(lerp(EASY_CLOCK_MS, HARD_CLOCK_MS, levelT(level)));
}
export function coveredAtStartCount(level) {
  return Math.round(lerp(EASY_COVERED, HARD_COVERED, levelT(level)));
}
export function closesDuringShotCount(level) {
  return Math.round(lerp(EASY_CLOSES, HARD_CLOSES, levelT(level)));
}
export function holeOpenMs(level) {
  return Math.round(lerp(EASY_HOLE_MS, HARD_HOLE_MS, Math.pow(levelT(level), 1.5)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-shootout.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/shootoutCore.js scripts/test-shootout.mjs
git commit -m "feat(shootout): core difficulty parameters (coverage, clock, hole window)"
```

---

## Task 2: Net cell geometry

**Files:**
- Modify: `src/cognitive-gym/shootoutCore.js`
- Modify: `scripts/test-shootout.mjs`

- [ ] **Step 1: Add the failing tests**

Append to `scripts/test-shootout.mjs`:

```js
import {
  CELL_IDS, CELL_LAYOUT, cellRects, cellAtPoint,
} from "../src/cognitive-gym/shootoutCore.js";

test("net has six named cells", () => {
  assert.equal(CELL_IDS.length, 6);
  assert.ok(CELL_IDS.includes("fiveHole"));
  assert.ok(CELL_IDS.includes("gloveHi"));
});

test("cellRects tiles the net with six non-overlapping rects", () => {
  const net = { x: 0, y: 0, w: 300, h: 200 };
  const rects = cellRects(net);
  assert.equal(rects.length, 6);
  // top-left cell starts at the net origin
  const tl = rects.find((r) => r.id === "gloveHi");
  assert.equal(tl.x, 0);
  assert.equal(tl.y, 0);
  assert.equal(tl.w, 100);
  assert.equal(tl.h, 100);
  // bottom-right cell ends at the net's far corner
  const br = rects.find((r) => r.id === "blkrLo");
  assert.equal(br.x, 200);
  assert.equal(br.y, 100);
});

test("cellAtPoint maps a point to its cell, or null when outside", () => {
  const net = { x: 0, y: 0, w: 300, h: 200 };
  const rects = cellRects(net);
  assert.equal(cellAtPoint(rects, 50, 50), "gloveHi");
  assert.equal(cellAtPoint(rects, 150, 150), "fiveHole");
  assert.equal(cellAtPoint(rects, 999, 999), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-shootout.mjs`
Expected: FAIL (CELL_IDS / cellRects / cellAtPoint not exported).

- [ ] **Step 3: Add cell geometry to `shootoutCore.js`**

Append to `src/cognitive-gym/shootoutCore.js`:

```js
// The net is a 3-column by 2-row grid of tap targets. Big, forgiving cells.
export const CELL_LAYOUT = [
  { id: "gloveHi", col: 0, row: 0 },
  { id: "midHi",   col: 1, row: 0 },
  { id: "blkrHi",  col: 2, row: 0 },
  { id: "gloveLo", col: 0, row: 1 },
  { id: "fiveHole", col: 1, row: 1 },
  { id: "blkrLo",  col: 2, row: 1 },
];
export const CELL_IDS = CELL_LAYOUT.map((c) => c.id);
const COLS = 3;
const ROWS = 2;

// Pixel rects for each cell given a net rectangle { x, y, w, h }.
export function cellRects(net) {
  const cw = net.w / COLS;
  const ch = net.h / ROWS;
  return CELL_LAYOUT.map((c) => ({
    id: c.id,
    x: net.x + c.col * cw,
    y: net.y + c.row * ch,
    w: cw,
    h: ch,
  }));
}

// Which cell id contains the point, or null if none.
export function cellAtPoint(rects, px, py) {
  for (const r of rects) {
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return r.id;
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-shootout.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/shootoutCore.js scripts/test-shootout.mjs
git commit -m "feat(shootout): 3x2 net cell geometry + point hit-test"
```

---

## Task 3: Shot generator

**Files:**
- Modify: `src/cognitive-gym/shootoutCore.js`
- Modify: `scripts/test-shootout.mjs`

- [ ] **Step 1: Add the failing tests**

Append to `scripts/test-shootout.mjs`:

```js
import { makeShot, pickN } from "../src/cognitive-gym/shootoutCore.js";

test("pickN returns n distinct items deterministically", () => {
  const rng = globalThis.__mulberry32(7);
  const got = pickN(["a", "b", "c", "d"], 2, rng);
  assert.equal(got.length, 2);
  assert.notEqual(got[0], got[1]);
});

test("makeShot: coverage and open counts match the level params", () => {
  const shot = makeShot(1, { rng: globalThis.__mulberry32(1) });
  assert.equal(shot.coveredAtStart.length, 1); // coveredAtStartCount(1)
  assert.equal(shot.openAtStart.length, 5);
  assert.equal(shot.closeSchedule.length, 0); // closesDuringShotCount(1) === 0
});

test("makeShot: at the top level at least one cell stays open all shot", () => {
  const shot = makeShot(20, { rng: globalThis.__mulberry32(3) });
  const closingIds = new Set(shot.closeSchedule.map((c) => c.cellId));
  const alwaysOpen = shot.openAtStart.filter((id) => !closingIds.has(id));
  assert.ok(alwaysOpen.length >= 1, "a scorable cell must always remain");
});

test("makeShot is deterministic for a given seed", () => {
  const a = makeShot(15, { rng: globalThis.__mulberry32(42) });
  const b = makeShot(15, { rng: globalThis.__mulberry32(42) });
  assert.deepEqual(a, b);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-shootout.mjs`
Expected: FAIL (makeShot / pickN not exported).

- [ ] **Step 3: Add the generator to `shootoutCore.js`**

Append to `src/cognitive-gym/shootoutCore.js`:

```js
// Deterministic pick of n distinct items from arr using rng.
export function pickN(arr, n, rng = Math.random) {
  const pool = arr.slice();
  const out = [];
  const k = Math.max(0, Math.min(n, pool.length));
  for (let i = 0; i < k; i += 1) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

// Build a shot for a level. `rng` is injectable so tests (and the head-to-head
// challenge link) are deterministic. Returns:
// { level, coveredAtStart:[id], openAtStart:[id], closeSchedule:[{cellId,atMs}], shotClockMs }
// Invariant: at least one cell is never covered, so a goal is always possible.
export function makeShot(level, { rng = Math.random } = {}) {
  const covered = pickN(CELL_IDS, coveredAtStartCount(level), rng);
  const open = CELL_IDS.filter((id) => !covered.includes(id));
  const closesN = Math.min(closesDuringShotCount(level), Math.max(0, open.length - 1));
  const closing = pickN(open, closesN, rng);
  const clock = shotClockMs(level);
  const hole = holeOpenMs(level);
  const closeSchedule = closing.map((cellId, i) => ({
    cellId,
    atMs: Math.round(closesN <= 1 ? hole : lerp(hole, clock * 0.9, i / (closesN - 1))),
  }));
  return { level, coveredAtStart: covered, openAtStart: open, closeSchedule, shotClockMs: clock };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-shootout.mjs`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/shootoutCore.js scripts/test-shootout.mjs
git commit -m "feat(shootout): deterministic shot generator with always-open invariant"
```

---

## Task 4: Open-state check and scoring

**Files:**
- Modify: `src/cognitive-gym/shootoutCore.js`
- Modify: `scripts/test-shootout.mjs`

- [ ] **Step 1: Add the failing tests**

Append to `scripts/test-shootout.mjs`:

```js
import { isCellOpenAt, scoreShot } from "../src/cognitive-gym/shootoutCore.js";

// A hand-built shot so the assertions do not depend on the generator's RNG.
const SHOT = {
  level: 10,
  coveredAtStart: ["midHi"],
  openAtStart: ["gloveHi", "blkrHi", "gloveLo", "fiveHole", "blkrLo"],
  closeSchedule: [{ cellId: "blkrLo", atMs: 600 }],
  shotClockMs: 1500,
};

test("isCellOpenAt: covered cell is never open", () => {
  assert.equal(isCellOpenAt(SHOT, "midHi", 0), false);
});
test("isCellOpenAt: a closing cell is open before atMs, closed after", () => {
  assert.equal(isCellOpenAt(SHOT, "blkrLo", 500), true);
  assert.equal(isCellOpenAt(SHOT, "blkrLo", 600), false);
});
test("isCellOpenAt: a plain open cell stays open", () => {
  assert.equal(isCellOpenAt(SHOT, "gloveHi", 1400), true);
});

test("scoreShot: open cell in time is a goal worth points", () => {
  const r = scoreShot("gloveHi", 200, SHOT);
  assert.equal(r.success, true);
  assert.ok(r.points > 0);
});
test("scoreShot: covered cell is a save worth zero", () => {
  assert.deepEqual(scoreShot("midHi", 200, SHOT), { success: false, points: 0, normElapsed: 200 / 1500 });
});
test("scoreShot: tapping a hole after it closed is a save", () => {
  assert.equal(scoreShot("blkrLo", 700, SHOT).success, false);
});
test("scoreShot: a tap after the clock expired is a save", () => {
  assert.equal(scoreShot("gloveHi", 1600, SHOT).success, false);
});
test("scoreShot: null (no tap) is a save", () => {
  assert.equal(scoreShot(null, 1600, SHOT).success, false);
});
test("scoreShot: a faster goal scores more than a slower one", () => {
  assert.ok(scoreShot("gloveHi", 100, SHOT).points > scoreShot("gloveHi", 1400, SHOT).points);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-shootout.mjs`
Expected: FAIL (isCellOpenAt / scoreShot not exported).

- [ ] **Step 3: Add open-state and scoring to `shootoutCore.js`**

Append to `src/cognitive-gym/shootoutCore.js`:

```js
// Is the cell open (scorable) at tapMs? Covered-at-start cells are never open;
// a closing cell is open only before its atMs.
export function isCellOpenAt(shot, cellId, tapMs) {
  if (!CELL_IDS.includes(cellId)) return false;
  if (shot.coveredAtStart.includes(cellId)) return false;
  const sched = shot.closeSchedule.find((c) => c.cellId === cellId);
  if (sched && tapMs >= sched.atMs) return false;
  return true;
}

// Score a tap. Goal only when an open cell is tapped in time. Points reward
// speed: feed gradedPoints a normalized value tapMs/shotClockMs (0 = instant ->
// max). A covered/closed cell, a miss, or an expired clock is 0.
// Returns { success, points, normElapsed }.
export function scoreShot(cellId, tapMs, shot) {
  const clock = shot.shotClockMs || 1;
  const norm = Math.min(Math.max(tapMs / clock, 0), 1);
  const inTime = tapMs <= shot.shotClockMs;
  const success = cellId != null && inTime && isCellOpenAt(shot, cellId, tapMs);
  if (!success) return { success: false, points: 0, normElapsed: norm };
  return { success: true, points: gradedPoints(norm), normElapsed: norm };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-shootout.mjs`
Expected: PASS (20 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/shootoutCore.js scripts/test-shootout.mjs
git commit -m "feat(shootout): open-state check + speed-weighted scoring"
```

---

## Task 5: The drill component

**Files:**
- Create: `src/cognitive-gym/ShootoutDrill.jsx`

This mirrors `BestOptionDrill.jsx` (same phase/stage lifecycle, same engine and storage
wiring) but the tap target is the canvas net, and cells close over time.

- [ ] **Step 1: Create `src/cognitive-gym/ShootoutDrill.jsx`**

```jsx
import { useRef, useState, useCallback, useEffect } from "react";
import { createAdaptiveLevel, setupCanvas, pointerPos } from "./gymEngine";
import { getDrill, saveSession } from "./gymStorage";
import { makeShot, scoreShot, cellRects, cellAtPoint } from "./shootoutCore";

// "Pick Your Spot" — read the open net and shoot it before the goalie covers it.
// The net is a 3x2 grid of cells. The goalie covers some at the start (saves);
// open cells show a target ring. Tap Go, then tap an open cell before the shot
// clock runs out. Higher levels cover more cells, close more holes mid-shot, and
// shrink the clock, so the open window gets smaller fast.

const REPS = 10;
const REVEAL_HOLD_MS = 1400;

export default function ShootoutDrill({ playerId = "default", onExit }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const sceneRef = useRef({});
  const timersRef = useRef([]);
  const rafRef = useRef(0);
  const pointsRef = useRef(0);

  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [rep, setRep] = useState(0);
  const [hits, setHits] = useState(0);
  const [level, setLevel] = useState(() => getDrill(playerId, "shootout").level);
  const [points, setPoints] = useState(0);
  const [stage, setStage] = useState("ready"); // ready | live | reveal
  const [last, setLast] = useState(null);
  const [saved, setSaved] = useState(null);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }
  function schedule(fn, ms) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  function computeNet(W, H) {
    const w = W * 0.74;
    const h = H * 0.5;
    return { x: (W - w) / 2, y: H * 0.2, w, h };
  }

  // Covered at the given elapsed time? (covered-at-start, or closed since).
  function coveredNow(shot, id, elapsedMs) {
    if (shot.coveredAtStart.includes(id)) return true;
    const sc = shot.closeSchedule.find((c) => c.cellId === id);
    return !!(sc && elapsedMs >= sc.atMs);
  }

  // A covered cell: dark goalie pad with a "G" so it reads by shape + label.
  function drawGoalieCell(ctx, r) {
    ctx.save();
    ctx.fillStyle = "#2b3a47";
    ctx.fillRect(r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    ctx.fillStyle = "#f4f9fc";
    ctx.font = `700 ${Math.round(Math.min(r.w, r.h) * 0.4)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("G", r.x + r.w / 2, r.y + r.h / 2);
    ctx.restore();
  }
  // An open cell: a target ring so it reads by shape, not color alone.
  function drawOpenCell(ctx, r) {
    ctx.save();
    ctx.strokeStyle = "#1f9d55";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  const render = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc.ctx) return;
    const { ctx, W, H, net, rects, shot } = sc;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f9fc";
    ctx.fillRect(0, 0, W, H);
    // net frame
    ctx.strokeStyle = "#c8102e";
    ctx.lineWidth = 4;
    ctx.strokeRect(net.x, net.y, net.w, net.h);
    // grid lines
    ctx.strokeStyle = "rgba(11,27,43,0.12)";
    ctx.lineWidth = 1;
    for (let c = 1; c < 3; c += 1) {
      ctx.beginPath();
      ctx.moveTo(net.x + (net.w / 3) * c, net.y);
      ctx.lineTo(net.x + (net.w / 3) * c, net.y + net.h);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(net.x, net.y + net.h / 2);
    ctx.lineTo(net.x + net.w, net.y + net.h / 2);
    ctx.stroke();

    if (!shot) return;
    const elapsed =
      sc.stage === "live" && sc.startTs != null
        ? Math.min(performance.now() - sc.startTs, shot.shotClockMs)
        : sc.frozenElapsed != null
        ? sc.frozenElapsed
        : 0;

    rects.forEach((r) => {
      if (coveredNow(shot, r.id, elapsed)) drawGoalieCell(ctx, r);
      else drawOpenCell(ctx, r);
    });

    // reveal: mark the tapped cell with a check (goal) or X (save)
    if (sc.stage === "reveal" && sc.tappedId) {
      const r = rects.find((x) => x.id === sc.tappedId);
      if (r) {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        if (sc.result && sc.result.success) {
          ctx.strokeStyle = "#1f9d55";
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.3, r.y + r.h * 0.55);
          ctx.lineTo(r.x + r.w * 0.45, r.y + r.h * 0.7);
          ctx.lineTo(r.x + r.w * 0.7, r.y + r.h * 0.32);
          ctx.stroke();
        } else {
          ctx.strokeStyle = "#c8102e";
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.32, r.y + r.h * 0.32);
          ctx.lineTo(r.x + r.w * 0.68, r.y + r.h * 0.68);
          ctx.moveTo(r.x + r.w * 0.68, r.y + r.h * 0.32);
          ctx.lineTo(r.x + r.w * 0.32, r.y + r.h * 0.68);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // live: a shrinking countdown bar under the net
    if (sc.stage === "live" && sc.startTs != null) {
      const frac = 1 - elapsed / shot.shotClockMs;
      ctx.fillStyle = "rgba(11,27,43,0.12)";
      ctx.fillRect(net.x, net.y + net.h + 10, net.w, 8);
      ctx.fillStyle = frac > 0.33 ? "#1b6cb0" : "#e8590c";
      ctx.fillRect(net.x, net.y + net.h + 10, net.w * Math.max(0, frac), 8);
    }
  }, []);

  const tick = useCallback(() => {
    const sc = sceneRef.current;
    if (sc.stage !== "live" || sc.resolved) return;
    render();
    if (performance.now() - sc.startTs >= sc.shot.shotClockMs) {
      resolveShot(null); // clock expired, no tap
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  const startRep = useCallback((repIndex) => {
    const canvas = canvasRef.current;
    const host = rootRef.current;
    if (!canvas || !host) return;
    clearTimers();
    const { ctx, W, H } = setupCanvas(canvas, host);
    const net = computeNet(W, H);
    const shot = makeShot(engineRef.current.level);
    sceneRef.current = {
      ctx, W, H, net,
      rects: cellRects(net),
      shot,
      stage: "ready",
      startTs: null,
      resolved: false,
      tappedId: null,
      result: null,
      frozenElapsed: 0,
      repIndex,
    };
    setStage("ready");
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render]);

  function go() {
    const sc = sceneRef.current;
    if (!sc.ctx || sc.resolved || sc.stage !== "ready") return;
    sc.stage = "live";
    sc.startTs = performance.now();
    setStage("live");
    rafRef.current = requestAnimationFrame(tick);
  }

  const resolveRep = useCallback(
    (success) => {
      pointsRef.current += sceneRef.current.result ? sceneRef.current.result.points : 0;
      setPoints(pointsRef.current);
      const lvl = engineRef.current.record(success);
      setLevel(lvl);
      if (success) setHits((h) => h + 1);
      const next = sceneRef.current.repIndex + 1;
      schedule(() => {
        if (next >= REPS) setPhase("done");
        else {
          setRep(next);
          startRep(next);
        }
      }, REVEAL_HOLD_MS);
    },
    [startRep]
  );

  const resolveShot = useCallback(
    (cellId) => {
      const sc = sceneRef.current;
      if (sc.resolved || sc.stage !== "live") return;
      const elapsed = sc.startTs != null ? performance.now() - sc.startTs : sc.shot.shotClockMs + 1;
      const result = scoreShot(cellId, elapsed, sc.shot);
      sc.resolved = true;
      sc.stage = "reveal";
      sc.tappedId = cellId;
      sc.result = result;
      sc.frozenElapsed = Math.min(elapsed, sc.shot.shotClockMs);
      clearTimers();
      setStage("reveal");
      setLast({ success: result.success, repPoints: result.points, expired: cellId == null });
      render();
      resolveRep(result.success);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [render, resolveRep]
  );

  function onCanvasTap(evt) {
    const sc = sceneRef.current;
    if (sc.stage !== "live") return;
    const p = pointerPos(evt, canvasRef.current);
    const id = cellAtPoint(sc.rects, p.x, p.y);
    if (!id) return;
    resolveShot(id);
  }

  function start() {
    const d = getDrill(playerId, "shootout");
    engineRef.current = createAdaptiveLevel(d.level, {
      startUps: d.streak.ups,
      startDowns: d.streak.downs,
    });
    setHits(0);
    setRep(0);
    setLast(null);
    setSaved(null);
    pointsRef.current = 0;
    setPoints(0);
    setPhase("playing");
    requestAnimationFrame(() => startRep(0));
  }

  useEffect(() => {
    if (phase === "done" && !saved) {
      const score = Math.round((hits / REPS) * 100);
      const record = saveSession(playerId, "shootout", {
        score,
        points: pointsRef.current,
        level: engineRef.current.level,
        streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
      });
      setSaved(record);
    }
  }, [phase, saved, hits, playerId]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const canvas = canvasRef.current;
      const host = rootRef.current;
      const sc = sceneRef.current;
      if (!canvas || !host || !sc.shot) return;
      const { ctx, W, H } = setupCanvas(canvas, host);
      const net = computeNet(W, H);
      sc.ctx = ctx;
      sc.W = W;
      sc.H = H;
      sc.net = net;
      sc.rects = cellRects(net);
      render();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, render]);

  useEffect(() => () => clearTimers(), []);

  const hint = {
    ready: "Tap Go, then tap an open spot (a target ring) before the goalie covers it.",
    live: "Shoot an open spot. The goalie covers the blocked ones and closes more.",
    reveal: last
      ? last.success
        ? `Goal! +${last.repPoints}`
        : last.expired
        ? "Too slow, the goalie covered it."
        : "Saved. That spot was covered. Read the open net."
      : "",
  }[stage];

  return (
    <div className="gym-drill" ref={rootRef}>
      {phase !== "intro" && <h2 className="gym-drill-title">Pick Your Spot</h2>}
      <div className="gym-drill-bar">
        <button className="gym-btn gym-btn-ghost" onClick={onExit}>
          Back
        </button>
        {phase === "playing" && (
          <button className="gym-btn gym-btn-ghost" onClick={start}>
            Restart
          </button>
        )}
        <span className="gym-chip">Level {level}</span>
        {phase === "playing" && (
          <span className="gym-chip">
            Shot {Math.min(rep + 1, REPS)} / {REPS}
          </span>
        )}
        {phase === "playing" && (
          <span className="gym-chip">
            {engineRef.current ? `${engineRef.current.toPromote} to level up` : ""}
          </span>
        )}
        {phase === "playing" && <span className="gym-chip">{points} pts</span>}
      </div>

      {phase === "intro" && (
        <div className="gym-card">
          <h2>Pick Your Spot</h2>
          <svg viewBox="0 0 280 150" width="100%" style={{ maxWidth: 280, display: "block", margin: "0 auto 14px", borderRadius: 10 }} aria-hidden="true">
            <rect width="280" height="150" rx="8" fill="#eaf4fb" />
            <rect x="60" y="30" width="160" height="90" fill="none" stroke="#c8102e" strokeWidth="3" />
            <line x1="113" y1="30" x2="113" y2="120" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="166" y1="30" x2="166" y2="120" stroke="#0b1b2b" strokeOpacity="0.15" />
            <line x1="60" y1="75" x2="220" y2="75" stroke="#0b1b2b" strokeOpacity="0.15" />
            <rect x="63" y="33" width="47" height="39" fill="#2b3a47" />
            <circle cx="193" cy="52" r="13" fill="none" stroke="#1f9d55" strokeWidth="3" />
            <circle cx="140" cy="97" r="13" fill="none" stroke="#1f9d55" strokeWidth="3" />
          </svg>
          <p className="gym-goal"><strong>Your goal:</strong> shoot where the goalie is not. Tap an open part of the net before he covers it.</p>
          <p>
            <strong>The game:</strong> the net is split into spots. The goalie covers some of them
            (the dark pads), and the open spots have a target ring. Tap Go, then tap an open spot
            before the clock runs out. The higher your level, the more the goalie covers, the
            faster the open spots close, and the shorter the clock. Read the open net and pick your
            spot fast.
          </p>
          <div className="gym-trains">
            <strong>Why it matters</strong>
            <span>
              Goal scorers do not just shoot hard, they shoot where the goalie is not. Training
              your eyes to find the open part of the net fast is how you beat a goalie who is set,
              and how you get a shot off before the window closes.
            </span>
          </div>
          <button className="gym-btn" onClick={start}>
            Start
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="gym-canvas"
        onPointerDown={onCanvasTap}
        style={{ display: phase === "playing" ? "block" : "none" }}
      />

      {phase === "playing" && stage === "ready" && (
        <div className="gym-row" style={{ marginBottom: 10 }}>
          <button className="gym-btn" onClick={go}>
            Go
          </button>
        </div>
      )}

      {phase === "playing" && (
        <p className="gym-hint" aria-live="polite">
          {hint}
        </p>
      )}

      {phase === "done" && (
        <div className="gym-card">
          <h2>Session complete</h2>
          <div className="gym-score">{points}</div>
          <p>
            {points} points. {hits} of {REPS} goals. Level {level}.
            {saved && (saved.bestPoints || 0) <= points && points > 0 ? " New best." : ""}
          </p>
          <div className="gym-row">
            <button className="gym-btn" onClick={start}>
              Go again
            </button>
            <button className="gym-btn gym-btn-ghost" onClick={onExit}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no errors referencing `ShootoutDrill` or `shootoutCore`.

- [ ] **Step 3: Commit**

```bash
git add src/cognitive-gym/ShootoutDrill.jsx
git commit -m "feat(shootout): canvas drill component (tap the open net before it closes)"
```

---

## Task 6: Register the drill in the gym

**Files:**
- Modify: `src/cognitive-gym/CognitiveGym.jsx`

- [ ] **Step 1: Import the component**

After the existing `import TwoThingsDrill from "./TwoThingsDrill";` line in `CognitiveGym.jsx`, add:

```js
import ShootoutDrill from "./ShootoutDrill";
```

- [ ] **Step 2: Add the registry entry**

In the `DRILLS` array, after the last entry (the `twothings` object, which ends with `component: TwoThingsDrill,` and a closing `},`), add a new entry before the closing `];`:

```js
  {
    id: "shootout",
    name: "Pick Your Spot",
    skill: "Shot Read",
    blurb: "Find the open net and shoot it before the goalie covers it.",
    goal: "Read which part of the net is open and shoot there before the goalie takes it away.",
    why: "Goal scorers do not just shoot hard, they shoot where the goalie is not. Training your eyes to find the open part of the net fast is how you beat a goalie who is set and get the shot off before the window closes.",
    trains: "Reading the goalie, shot selection, shooting before the lane closes",
    build: "canvas",
    component: ShootoutDrill,
  },
```

- [ ] **Step 3: Verify the build and the drill appears**

Run: `npm run build`
Expected: build succeeds.

Then run `npm run dev`, open the app, go to the Cognitive Gym, and confirm a "Pick Your Spot"
card appears in the grid, opens, and a shot is playable (tap an open ring to score, watch the
goalie cover cells as levels rise after a few good sessions).

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/CognitiveGym.jsx
git commit -m "feat(shootout): register Pick Your Spot in the Cognitive Gym"
```

---

## Task 7: Test script and full suite

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script**

In `package.json` `scripts`, near the other `test:*` entries, add:

```json
    "test:shootout": "node --test scripts/test-shootout.mjs",
```

- [ ] **Step 2: Run the suite**

Run: `npm run test:shootout`
Expected: PASS, summary `tests 20  pass 20  fail 0`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "test(shootout): add test:shootout script"
```

---

## Verification (end of plan)

- [ ] `npm run test:shootout` passes (20 tests).
- [ ] `npm run build` succeeds.
- [ ] In the browser: the drill appears in the gym, a shot is playable, tapping an open ring
  scores a goal, tapping a covered pad is a save, the countdown bar empties, and at higher levels
  the goalie covers more cells and the open holes close sooner.

## Self-review notes

Spec coverage against `docs/superpowers/specs/2026-06-13-shootout-drill-design.md`:
- 3x2 cell net, goalie covers some, tap open cell: Tasks 2, 3, 5.
- Difficulty on three axes (coverage grows, holes close faster, clock shrinks) with the
  pow(t, 1.5) hole curve: Task 1 (params + curve test) and Task 3 (schedule).
- Always at least one scorable cell: Task 3 invariant + test.
- Scoring (goal/save/closed/expired, speed-weighted): Task 4.
- Deterministic given a seed (for the future head-to-head challenge link): Task 3 test.
- Mirrors existing drill structure and reuses the engine/storage: Task 5.
- Registered as gym drill 11: Task 6.
- Age scaling: handled by the difficulty curve plus the per-drill adaptive level; the age-seeded
  starting level is explicitly deferred to the gym-progression plan (noted in Scope).
- Naming "Pick Your Spot": Task 6 registry entry (final name still an open item in the spec).
```
