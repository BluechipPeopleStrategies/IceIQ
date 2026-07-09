# Cognitive Gym Phase 1 (Fix + Juice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shipped Cognitive Gym beta-ready: fix the dead age-calibration, put all 11 drills on the same graded scoring scale, and add sound/celebration/kid-readable feedback — no new dependencies.

**Architecture:** All changes live in `src/cognitive-gym/`. Two new pure modules (`gymBand.js`, audio cue spec inside `gymAudio.js`), two new drill-core scoring functions, one shared FX component file (`gymFx.jsx`), and hook points added to the existing adaptive engine so drills get audio for free. Storage shape is unchanged (additive only).

**Tech Stack:** React 18 + Vite, plain JS/JSX, canvas, WebAudio (no assets), localStorage, `node --test` for pure-module tests.

## Where this sits (roadmap + plan lineage)

- **Spec:** `docs/proposals/2026-07-09-cognitive-gym-overhaul-design.md` (Phase 1 section). Phases 2–3 are NOT in this plan.
- **Roadmap:** slots after item 2 (playtest gate) of `docs/roadmap/2026-07-09-next-7.md`; must never block item 1 (share the beta). This plan absorbs the "sound pass" half of the roadmap's on-deck "mascot + sound pass" item (gym side only). Mascots are Phase 3.
- **Prior gym plans:** builds on `docs/superpowers/plans/2026-06-14-gym-progression-plan1.md` (which added the age-seed this plan fixes — the seed matches bare `"U7"/"U9"/"U11"` but `App.jsx:8433` passes `player.level` division strings like `"U11 / Atom"`, so it never fires) and `docs/superpowers/specs/2026-06-13-cognitive-gym-expansion-design.md` (which added graded points to 9 of 11 drills — this plan finishes the other 2).
- **MVP:** per `docs/factory/MVP-VIABILITY.md` the gym is retention mechanic #7, post-MVP. Phase 1 is beta hygiene only.
- **Deferred (unchanged by this plan):** leaderboards/leagues stay parked with pricing Phase 2 per `docs/superpowers/specs/2026-06-13-gym-progression-incentives-design.md`.

## Global Constraints

- No new npm dependencies (owner standing rule).
- No sound files/assets: all audio is WebAudio-synthesized.
- Copy rules: warm voice, no em dashes, no on-ice performance claims ("trains and tracks the skills hockey minds use", never "makes you better on the ice").
- Points scale: 0–1000 per rep/shift, matching `gymPoints.gradedPoints`. No negative session totals.
- Storage keys: existing `rinkreads_gym_v1` untouched; new key `rinkreads_gym_muted` only.
- Tests: `node --test scripts/test-gym-phase1.mjs`, plus keep `npm run test:gym-progress` green (expectations change in Task 1).
- Branch: work on `feature/shareable-beta` (current). Commit per task, no push.

---

### Task 1: `gymBand.js` — band resolution + extended seeds (the bug fix)

**Files:**
- Create: `src/cognitive-gym/gymBand.js`
- Modify: `src/cognitive-gym/gymEngine.js:200-217` (`calibratedStartLevel`)
- Modify: `scripts/test-gym-progress.mjs:5-22` (update stale expectations)
- Create: `scripts/test-gym-phase1.mjs`
- Modify: `package.json` (add `"test:gym-phase1": "node --test scripts/test-gym-phase1.mjs"` beside `test:gym-progress`)

**Interfaces:**
- Produces: `resolveBand(levelString) -> "U7"|"U9"|"U11"|"U13"|"U15"|"U18"|null` and `calibratedStartLevel(anyLevelString) -> 1..8` (now accepts full division strings).

- [ ] **Step 1: Write the failing tests** (new file `scripts/test-gym-phase1.mjs`)

```js
import test from "node:test";
import assert from "node:assert/strict";
import { resolveBand } from "../src/cognitive-gym/gymBand.js";
import { calibratedStartLevel } from "../src/cognitive-gym/gymEngine.js";

test("resolveBand parses division strings, bare bands, and names", () => {
  assert.equal(resolveBand("U11 / Atom"), "U11");
  assert.equal(resolveBand("u9"), "U9");
  assert.equal(resolveBand("U18 / Midget"), "U18");
  assert.equal(resolveBand("Atom"), "U11");      // name-only fallback
  assert.equal(resolveBand("Peewee"), "U13");
  assert.equal(resolveBand(""), null);
  assert.equal(resolveBand(null), null);
  assert.equal(resolveBand("U12"), null);        // not a real band
});

test("calibratedStartLevel seeds every band from full division strings", () => {
  assert.equal(calibratedStartLevel("U7 / Initiation"), 2);
  assert.equal(calibratedStartLevel("U9 / Novice"), 4);
  assert.equal(calibratedStartLevel("U11 / Atom"), 6);
  assert.equal(calibratedStartLevel("U13 / Peewee"), 7);
  assert.equal(calibratedStartLevel("U15 / Bantam"), 8);
  assert.equal(calibratedStartLevel("U18 / Midget"), 8);
  assert.equal(calibratedStartLevel(null), 1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: FAIL, `Cannot find module .../gymBand.js`

- [ ] **Step 3: Implement `gymBand.js`**

```js
// Resolve the player's division string to a gym age-band key.
// `player.level` arrives as strings like "U11 / Atom" (see utils/ageGroup.js);
// this is the ONE place that turns any of those into a bare band key.

const BANDS = ["U7", "U9", "U11", "U13", "U15", "U18"];
const NAME_TO_BAND = {
  initiation: "U7",
  novice: "U9",
  atom: "U11",
  peewee: "U13",
  bantam: "U15",
  midget: "U18",
};

export function resolveBand(levelString) {
  const s = String(levelString || "").trim();
  if (!s) return null;
  const m = s.match(/u\s*(\d{1,2})/i);
  if (m) {
    const key = `U${m[1]}`;
    if (BANDS.includes(key)) return key;
  }
  const lower = s.toLowerCase();
  for (const name of Object.keys(NAME_TO_BAND)) {
    if (lower.includes(name)) return NAME_TO_BAND[name];
  }
  return null;
}
```

- [ ] **Step 4: Rewrite `calibratedStartLevel` in `gymEngine.js`**

Replace the existing function (lines 200–208) and add the import at the top of the file:

```js
import { resolveBand } from "./gymBand.js";

// Age-seeded starting level for a drill, so a kid begins near their real level
// instead of level 1. Accepts full division strings ("U11 / Atom") — resolution
// happens in gymBand.js. Unknown bands return 1 (no seed).
const BAND_SEED = { U7: 2, U9: 4, U11: 6, U13: 7, U15: 8, U18: 8 };
export function calibratedStartLevel(ageBand) {
  return BAND_SEED[resolveBand(ageBand)] || 1;
}
```

(`seededLevel` below it is unchanged — it already funnels through `calibratedStartLevel`.)

- [ ] **Step 5: Update stale expectations in `scripts/test-gym-progress.mjs`**

In the first test, change `assert.equal(calibratedStartLevel("U15"), 1);` to `assert.equal(calibratedStartLevel("U15"), 8);`. In the second test, change `assert.equal(seededLevel({ level: 1, sessions: [] }, "U15"), 1);` to `assert.equal(seededLevel({ level: 1, sessions: [] }, "U15"), 8);` and update its comment from `// unknown band on untouched -> stays 1` to `// U15 now seeds too (Phase 1 extended the seed table)`.

- [ ] **Step 6: Run both suites**

Run: `node --test scripts/test-gym-phase1.mjs && npm run test:gym-progress`
Expected: both PASS

- [ ] **Step 7: Add the npm script and commit**

```bash
git add src/cognitive-gym/gymBand.js src/cognitive-gym/gymEngine.js scripts/test-gym-phase1.mjs scripts/test-gym-progress.mjs package.json
git commit -m "fix(gym): age calibration now resolves real division strings; seeds extended to U13-U18"
```

---

### Task 2: adaptive-engine result hooks (audio's plumbing)

**Files:**
- Modify: `src/cognitive-gym/gymEngine.js:9-42` (`createAdaptiveLevel`)
- Modify: `scripts/test-gym-phase1.mjs` (append tests)

**Interfaces:**
- Produces: `createAdaptiveLevel(startLevel, { onResult?, onChange? })` — `onResult(success)` fires on every `record()`; `onChange(newLevel, delta)` fires only on promote (+1) / relegate (-1). Task 5's `gymCueHooks()` returns exactly this pair; Task 7 spreads it into every drill.

- [ ] **Step 1: Write the failing test** (append to `scripts/test-gym-phase1.mjs`)

```js
import { createAdaptiveLevel } from "../src/cognitive-gym/gymEngine.js";

test("createAdaptiveLevel fires onResult every rep and onChange on promote/relegate", () => {
  const results = [];
  const changes = [];
  const eng = createAdaptiveLevel(2, {
    onResult: (s) => results.push(s),
    onChange: (lvl, d) => changes.push([lvl, d]),
  });
  eng.record(true); eng.record(true); eng.record(true);   // promote to 3
  eng.record(false); eng.record(false);                    // relegate to 2
  assert.deepEqual(results, [true, true, true, false, false]);
  assert.deepEqual(changes, [[3, 1], [2, -1]]);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: the new test FAILS (`changes` stays empty)

- [ ] **Step 3: Implement in `createAdaptiveLevel`**

Destructure the new options alongside the existing ones (`maxLevel`, `upStreak`, ...): add `onResult = null, onChange = null`. Then in `record(success)`, add the calls:

```js
    record(success) {
      if (onResult) { try { onResult(success); } catch { /* cue failure never breaks a rep */ } }
      if (success) {
        ups += 1;
        downs = 0;
        if (ups >= upStreak && level < maxLevel) {
          level += 1; ups = 0;
          if (onChange) { try { onChange(level, 1); } catch { /* ignore */ } }
        }
      } else {
        downs += 1;
        ups = 0;
        if (downs >= downStreak && level > 1) {
          level -= 1; downs = 0;
          if (onChange) { try { onChange(level, -1); } catch { /* ignore */ } }
        }
      }
      return level;
    },
```

- [ ] **Step 4: Run tests**

Run: `node --test scripts/test-gym-phase1.mjs && npm run test:gym-progress`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/gymEngine.js scripts/test-gym-phase1.mjs
git commit -m "feat(gym): onResult/onChange hooks in the adaptive engine"
```

---

### Task 3: Reaction drill graded scoring

**Files:**
- Create: `src/cognitive-gym/reactionCore.js`
- Modify: `src/cognitive-gym/ReactionDrill.jsx` (scoring at lines 60-73, 96-136; labels 185-194; done card 281-298; intro copy 249-251)
- Modify: `scripts/test-gym-phase1.mjs` (append tests)

**Interfaces:**
- Consumes: `gradedPoints` from `gymPoints.js`.
- Produces: `reactionPoints({ kind, rt, windowMs }) -> number` where kind is `"hit" | "hold" | "early" | "slow" | "falseAlarm" | "missedGo"`.

- [ ] **Step 1: Write the failing tests** (append)

```js
import { reactionPoints, RT_FLOOR_MS, HOLD_POINTS } from "../src/cognitive-gym/reactionCore.js";

test("reactionPoints: graded hits, flat holds, zero for errors", () => {
  // instant tap = max points; floor keeps humanly-fast taps near the top
  assert.equal(reactionPoints({ kind: "hit", rt: RT_FLOOR_MS, windowMs: 900 }), 1000);
  const mid = reactionPoints({ kind: "hit", rt: 500, windowMs: 900 });
  assert.ok(mid > 0 && mid < 1000);
  // slower rt earns less
  assert.ok(
    reactionPoints({ kind: "hit", rt: 700, windowMs: 900 }) <
    reactionPoints({ kind: "hit", rt: 400, windowMs: 900 })
  );
  assert.equal(reactionPoints({ kind: "hold" }), HOLD_POINTS);
  for (const kind of ["early", "slow", "falseAlarm", "missedGo"]) {
    assert.equal(reactionPoints({ kind }), 0);
  }
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: FAIL, `Cannot find module .../reactionCore.js`

- [ ] **Step 3: Implement `reactionCore.js`**

```js
// Pure scoring for the Shoot or Hold drill, on the gym's shared 0-1000 scale.
// A hit is graded by reaction time (faster = more, like the other speed
// drills); a clean hold earns a flat reward; every error kind earns 0 so a
// session can never go negative (kid-safe scoring, no -3 turnovers).

import { gradedPoints } from "./gymPoints.js";

export const RT_FLOOR_MS = 180; // ~human floor; taps at/below it score max
export const HOLD_POINTS = 350;

export function reactionPoints({ kind, rt = 0, windowMs = 900 }) {
  if (kind === "hit") {
    const e = Math.max(0, rt - RT_FLOOR_MS) / Math.max(1, windowMs);
    return gradedPoints(e);
  }
  if (kind === "hold") return HOLD_POINTS;
  return 0;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: PASS

- [ ] **Step 5: Wire into `ReactionDrill.jsx`**

Add the import: `import { reactionPoints } from "./reactionCore";`

Replace every point mutation (six sites) so each outcome awards `reactionPoints`:

- line 64 (`missedGo`, shown SHOOT never tapped): `setPoints((p) => p + reactionPoints({ kind: "missedGo" }));`
- line 70 (correct hold): `setPoints((p) => p + reactionPoints({ kind: "hold" }));`
- line 106 (tapped early): `setPoints((p) => p + reactionPoints({ kind: "early" }));`
- line 120 (hit, `rt` and `tr.windowMs` in scope): `setPoints((p) => p + reactionPoints({ kind: "hit", rt, windowMs: tr.windowMs }));`
- line 125 (too slow): `setPoints((p) => p + reactionPoints({ kind: "slow" }));`
- line 133 (tapped orange): `setPoints((p) => p + reactionPoints({ kind: "falseAlarm" }));`

Also update the state comment on line 27 to `// graded 0-1000 per trial (reactionCore)`.

Update the feedback labels (lines 185–194) to hockey language without the +/- integers:

```js
  const label = {
    wait: "Ready...",
    go: "SHOOT",
    nogo: "HOLD",
    early: "Jumped early",
    hit: rts.length ? `${rts[rts.length - 1]} ms — shot away!` : "Shot away!",
    miss: "Too slow, window closed",
    held: "Good hold",
    falseAlarm: "Turnover! That was a HOLD",
  }[light];
```

Update the intro sentence (lines 249–251) from "Tapping on orange is a turnover and costs triple. Tapping before the light or too slow also counts against you." to "Tapping on orange is a turnover and earns nothing. Fast, clean shots earn the big points." Update the done-card line 286 from `{points} points.` to `{points} points.` (unchanged text, but verify it reads sensibly with larger totals).

- [ ] **Step 6: Manual smoke**

Run: `npm run dev`, open the gym → Shoot or Hold, play one session.
Expected: hits show a few hundred points each, orange taps add 0 (never negative), session saves.

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/reactionCore.js src/cognitive-gym/ReactionDrill.jsx scripts/test-gym-phase1.mjs
git commit -m "feat(gym): Shoot or Hold on the shared graded points scale"
```

---

### Task 4: Tracking drill graded scoring

**Files:**
- Create: `src/cognitive-gym/trackingCore.js`
- Modify: `src/cognitive-gym/TrackingDrill.jsx` (`resolveShift` lines 110-133, save effect lines 379-391, done card, points chip)
- Modify: `scripts/test-gym-phase1.mjs` (append tests)

**Interfaces:**
- Produces: `shiftPoints(correctCount, targets, gotBall) -> number` (0–1000 per shift).

- [ ] **Step 1: Write the failing tests** (append)

```js
import { shiftPoints } from "../src/cognitive-gym/trackingCore.js";

test("shiftPoints: linear base, perfect bonus, ball bonus, max 1000", () => {
  assert.equal(shiftPoints(0, 3, false), 0);
  assert.equal(shiftPoints(1, 3, false), 200);
  assert.equal(shiftPoints(2, 3, false), 400);
  assert.equal(shiftPoints(3, 3, false), 750);        // 600 base + 150 perfect
  assert.equal(shiftPoints(3, 3, true), 1000);        // + 250 ball
  assert.equal(shiftPoints(1, 3, true), 450);         // ball counts even when imperfect
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: FAIL, module not found

- [ ] **Step 3: Implement `trackingCore.js`**

```js
// Pure scoring for the Baylor's Pick tracking drill on the shared 0-1000
// per-shift scale: 200 per tracked teammate, +150 for a perfect shift,
// +250 for calling the ball carrier. Perfect shift with the ball = 1000.

export const POINTS_PER_TARGET = 200;
export const PERFECT_BONUS = 150;
export const BALL_BONUS = 250;

export function shiftPoints(correctCount, targets, gotBall) {
  const base = Math.max(0, correctCount) * POINTS_PER_TARGET;
  const perfect = correctCount >= targets ? PERFECT_BONUS : 0;
  const ball = gotBall ? BALL_BONUS : 0;
  return base + perfect + ball;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: PASS

- [ ] **Step 5: Wire into `TrackingDrill.jsx`**

Add imports: `import { shiftPoints } from "./trackingCore";`. Add a points state next to the existing ones: `const [points, setPoints] = useState(0);` and reset it in `start()` (`setPoints(0);` beside `setBonus(0)` at line 373).

In `resolveShift` (after line 116 `if (got) setBonus((b) => b + 1);`) add:

```js
      setPoints((p) => p + shiftPoints(correctCount, TARGETS, got));
```

In the save effect (lines 379–391), change `points: bonus,` to `points,` and add ball pickups to meta so the old signal isn't lost:

```js
        saveSession(playerId, "tracking", {
          score,
          level: engineRef.current.level,
          points,
          meta: { ballPickups: bonus },
          streak: { ups: engineRef.current.ups, downs: engineRef.current.downs },
        })
```

Also add `points` to that effect's dependency array. In the done card, show `{points}` as the big `gym-score` number (with the ball count in the summary line), and add a `{points} pts` chip during play, matching the other drills' pattern (`{phase === "playing" && <span className="gym-chip">{points} pts</span>}` in the drill bar).

- [ ] **Step 6: Manual smoke**

Run: `npm run dev`, play one Baylor's Pick session.
Expected: points climb by hundreds per shift; career points on the hub move accordingly.

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/trackingCore.js src/cognitive-gym/TrackingDrill.jsx scripts/test-gym-phase1.mjs
git commit -m "feat(gym): Baylor's Pick on the shared graded points scale"
```

---

### Task 5: `gymAudio.js` — synthesized cues + mute toggle

**Files:**
- Create: `src/cognitive-gym/gymAudio.js`
- Modify: `src/cognitive-gym/CognitiveGym.jsx` (mute chip in the header, around line 197)
- Modify: `src/cognitive-gym/cognitive-gym.css` (chip style reuse — no new classes needed beyond `.gym-mute`)
- Modify: `scripts/test-gym-phase1.mjs` (append tests for the pure parts)

**Interfaces:**
- Produces: `cue(name)` for `"go"|"hit"|"perfect"|"miss"|"levelUp"|"fanfare"`; `isMuted()/setMuted(bool)`; `gymCueHooks() -> { onResult, onChange }` (feeds Task 2's engine options); `CUES` (exported spec, pure, for tests).

- [ ] **Step 1: Write the failing tests** (append)

```js
import { CUES, gymCueHooks } from "../src/cognitive-gym/gymAudio.js";

test("CUES: every cue is a non-empty list of {freq, dur, at} notes", () => {
  for (const name of ["tap", "go", "hit", "perfect", "miss", "levelUp", "fanfare"]) {
    assert.ok(Array.isArray(CUES[name]) && CUES[name].length > 0, name);
    for (const n of CUES[name]) {
      assert.ok(n.freq > 0 && n.dur > 0 && n.at >= 0);
    }
  }
});

test("gymCueHooks returns engine-shaped callbacks", () => {
  const hooks = gymCueHooks();
  assert.equal(typeof hooks.onResult, "function");
  assert.equal(typeof hooks.onChange, "function");
  // callable without an AudioContext (node) — must not throw
  hooks.onResult(true);
  hooks.onChange(5, 1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: FAIL, module not found

- [ ] **Step 3: Implement `gymAudio.js`**

```js
// Synthesized audio cues for the Cognitive Gym. No sound files: short
// oscillator notes through one lazily-created AudioContext (created on first
// cue, which always follows a user gesture — a tap — so autoplay rules pass).
// Everything is wrapped so a missing/blocked AudioContext can never break play.

const MUTE_KEY = "rinkreads_gym_muted";

// Cue spec: name -> notes [{ freq (Hz), dur (s), at (s offset) }].
// Exported for tests; the player below just reads it.
export const CUES = {
  tap: [{ freq: 660, dur: 0.05, at: 0 }],
  go: [{ freq: 880, dur: 0.09, at: 0 }],
  hit: [{ freq: 523, dur: 0.08, at: 0 }, { freq: 784, dur: 0.1, at: 0.07 }],
  perfect: [
    { freq: 659, dur: 0.08, at: 0 },
    { freq: 880, dur: 0.08, at: 0.07 },
    { freq: 1047, dur: 0.14, at: 0.14 },
  ],
  miss: [{ freq: 233, dur: 0.12, at: 0 }],
  levelUp: [
    { freq: 523, dur: 0.1, at: 0 },
    { freq: 659, dur: 0.1, at: 0.09 },
    { freq: 784, dur: 0.16, at: 0.18 },
  ],
  fanfare: [
    { freq: 523, dur: 0.12, at: 0 },
    { freq: 659, dur: 0.12, at: 0.11 },
    { freq: 784, dur: 0.12, at: 0.22 },
    { freq: 1047, dur: 0.28, at: 0.33 },
  ],
};

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}
export function setMuted(muted) {
  try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch { /* unavailable */ }
}

let ctx = null;
function audioCtx() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Reward haptic on mobile: a short buzz for the win moments only.
const HAPTIC_CUES = { hit: 15, perfect: 25, levelUp: [20, 40, 20], fanfare: [20, 40, 40] };
function buzz(name) {
  try {
    const pattern = HAPTIC_CUES[name];
    if (pattern && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch { /* haptics are best-effort */ }
}

export function cue(name) {
  if (isMuted()) return;
  buzz(name);
  const notes = CUES[name];
  if (!notes) return;
  try {
    const ac = audioCtx();
    if (!ac) return;
    const t0 = ac.currentTime;
    for (const n of notes) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "triangle";
      osc.frequency.value = n.freq;
      gain.gain.setValueAtTime(0.0001, t0 + n.at);
      gain.gain.exponentialRampToValueAtTime(0.12, t0 + n.at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
      osc.connect(gain).connect(ac.destination);
      osc.start(t0 + n.at);
      osc.stop(t0 + n.at + n.dur + 0.02);
    }
  } catch { /* audio must never break a rep */ }
}

// Ready-made hooks for createAdaptiveLevel: rep feedback + level-up jingle.
export function gymCueHooks() {
  return {
    onResult: (success) => cue(success ? "hit" : "miss"),
    onChange: (_level, delta) => { if (delta > 0) cue("levelUp"); },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: PASS (the `cue()` path is browser-only; hooks no-op cleanly under node)

- [ ] **Step 5: Add the mute chip to the hub header**

In `CognitiveGym.jsx`: import `{ isMuted, setMuted }` from `./gymAudio`, add state `const [muted, setMutedState] = useState(() => isMuted());`, and inside `<header className="gym-header">` right after the `<h1>` add:

```jsx
        <button
          type="button"
          className="gym-btn gym-btn-ghost gym-mute"
          aria-pressed={muted}
          onClick={() => { setMuted(!muted); setMutedState(!muted); }}
        >
          {muted ? "🔇 Sound off" : "🔊 Sound on"}
        </button>
```

Add to `cognitive-gym.css`: `.gym-mute { float: right; font-size: 0.85rem; }`

- [ ] **Step 6: Manual smoke**

Run: `npm run dev` — toggle the chip; reload; the setting persists.

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/gymAudio.js src/cognitive-gym/CognitiveGym.jsx src/cognitive-gym/cognitive-gym.css scripts/test-gym-phase1.mjs
git commit -m "feat(gym): synthesized audio cues + persisted mute toggle"
```

---

### Task 6: `gymFx.jsx` — score count-up, confetti, best-session labels

**Files:**
- Create: `src/cognitive-gym/gymFx.jsx`
- Modify: `src/cognitive-gym/gymProgressCore.js` (add `sessionRankLabel`)
- Modify: `src/cognitive-gym/cognitive-gym.css` (keyframes)
- Modify: `scripts/test-gym-phase1.mjs` (append tests)

**Interfaces:**
- Produces: `sessionRankLabel(sessions, points) -> "First session!" | "Personal best!" | "Top 5 session" | null` (pure, in gymProgressCore); `<ScoreCount value={n} />` (rAF count-up rendering `<div className="gym-score">`); `<ConfettiBurst fire={bool} />`.

- [ ] **Step 1: Write the failing tests** (append)

```js
import { sessionRankLabel } from "../src/cognitive-gym/gymProgressCore.js";

test("sessionRankLabel ranks the just-saved session against history", () => {
  // sessions INCLUDE the just-saved one (gymStorage.saveSession appends first)
  assert.equal(sessionRankLabel([{ points: 500 }], 500), "First session!");
  assert.equal(
    sessionRankLabel([{ points: 300 }, { points: 500 }], 500),
    "Personal best!"
  );
  // ties with an old best still celebrate
  assert.equal(
    sessionRankLabel([{ points: 500 }, { points: 500 }], 500),
    "Personal best!"
  );
  const history = [900, 800, 700, 600, 500, 400].map((p) => ({ points: p }));
  assert.equal(sessionRankLabel([...history, { points: 650 }], 650), "Top 5 session");
  assert.equal(sessionRankLabel([...history, { points: 100 }], 100), null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: FAIL, `sessionRankLabel` not exported

- [ ] **Step 3: Implement `sessionRankLabel` in `gymProgressCore.js`** (append)

```js
// Label for the just-finished session vs the drill's history. `sessions` is
// the drill's session list INCLUDING the one just saved (saveSession appends
// before the results card renders). Returns null when there is nothing to brag
// about — the card shows no tag rather than a hollow one.
export function sessionRankLabel(sessions, points) {
  const all = sessions || [];
  const prior = all.slice(0, -1).map((s) => s.points || 0);
  if (prior.length === 0) return "First session!";
  if (points >= Math.max(...prior)) return "Personal best!";
  const top = [...prior].sort((a, b) => b - a).slice(0, 4);
  if (points >= (top[top.length - 1] ?? 0)) return "Top 5 session";
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `node --test scripts/test-gym-phase1.mjs && npm run test:gym-progress`
Expected: PASS

- [ ] **Step 5: Implement `gymFx.jsx`**

```jsx
import { useEffect, useRef, useState } from "react";

// Shared celebration FX for drill results cards. Pure presentation: no
// storage, no audio (gymAudio owns sound), safe to render anywhere.

// Counts up from 0 to `value` over ~700ms with an ease-out curve.
export function ScoreCount({ value }) {
  const [shown, setShown] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    const target = Math.max(0, Math.round(value || 0));
    const t0 = performance.now();
    const dur = 700;
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - t) * (1 - t);
      setShown(Math.round(target * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);
  return <div className="gym-score gym-score-pop">{shown}</div>;
}

// A one-shot burst of 14 CSS-animated flecks in the brand gold/blue.
const FLECKS = Array.from({ length: 14 }, (_, i) => i);
export function ConfettiBurst({ fire }) {
  if (!fire) return null;
  return (
    <div className="gym-confetti" aria-hidden="true">
      {FLECKS.map((i) => (
        <span
          key={i}
          className="gym-fleck"
          style={{
            left: `${6 + i * 6.5}%`,
            background: i % 3 === 0 ? "#f2b705" : i % 3 === 1 ? "#1b6cb0" : "#ffffff",
            animationDelay: `${(i % 5) * 60}ms`,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Add the keyframes to `cognitive-gym.css`** (append at end)

```css
/* Phase 1 juice: results-card celebration */
@keyframes gym-pop {
  0% { transform: scale(0.6); opacity: 0; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.gym-score-pop { animation: gym-pop 0.45s ease-out; }

.gym-confetti { position: relative; height: 0; }
@keyframes gym-fleck-fall {
  0% { transform: translateY(-8px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(74px) rotate(260deg); opacity: 0; }
}
.gym-fleck {
  position: absolute;
  top: -6px;
  width: 7px;
  height: 11px;
  border-radius: 2px;
  animation: gym-fleck-fall 0.9s ease-in forwards;
}

.gym-best {
  color: var(--gym-gold, #f2b705);
  font-weight: 700;
  margin: 4px 0 0;
}
```

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/gymFx.jsx src/cognitive-gym/gymProgressCore.js src/cognitive-gym/cognitive-gym.css scripts/test-gym-phase1.mjs
git commit -m "feat(gym): score count-up, confetti burst, and best-session labels"
```

---

### Task 7: wire juice into all 11 drills (table-driven sweep)

**Files:**
- Modify: all 11 `src/cognitive-gym/*Drill.jsx`

**Interfaces:**
- Consumes: `gymCueHooks`/`cue` (Task 5), `ScoreCount`/`ConfettiBurst` (Task 6), `sessionRankLabel` (Task 6), engine hooks (Task 2).

The same four edits repeat in every drill; find anchors with
`grep -n "createAdaptiveLevel\|className=\"gym-score\"\|phase === \"done\" && !saved" src/cognitive-gym/*Drill.jsx`.

- [ ] **Step 1: Per drill, apply the four-edit pattern**

Imports (top of each drill):

```js
import { cue, gymCueHooks } from "./gymAudio";
import { ScoreCount, ConfettiBurst } from "./gymFx";
import { sessionRankLabel } from "./gymProgressCore";
```

Edit A — rep + level-up sounds: every drill has exactly one `createAdaptiveLevel(...)` call in its `start()`. Spread the cue hooks into its options object; where the call has no options (ReactionDrill line 156), add one:

```js
engineRef.current = createAdaptiveLevel(d.level, {
  startUps: d.streak.ups,
  startDowns: d.streak.downs,
  ...gymCueHooks(),
});
```

ReactionDrill is the one drill whose call has no options object and no `d` variable; there it becomes:

```js
engineRef.current = createAdaptiveLevel(getDrill(playerId, "reaction").level, { ...gymCueHooks() });
```

Edit B — session fanfare: in each drill's save effect (`phase === "done" && !saved`), add `cue("fanfare");` immediately after the `setSaved(...)` call.

Edit C — results celebration: in each done card, replace the raw score div (`<div className="gym-score">{points}</div>` — Reaction's shows a percentage; use `{points}` there too now that Task 3 made points meaningful) with:

```jsx
<ScoreCount value={points} />
<ConfettiBurst fire={!!bestLabel} />
{bestLabel && <p className="gym-best">{bestLabel}</p>}
```

and above each done card's `return`-adjacent scope add:

```js
const bestLabel =
  phase === "done" && saved ? sessionRankLabel(saved.sessions, Math.round(points)) : null;
```

Edit D — Reaction only: an audible go-signal. In `startTrial` (ReactionDrill line 56), right after `setLight(isGo ? "go" : "nogo");` add `if (isGo) cue("go");`.

Checklist (Edit A/B/C apply to every file):

- [ ] AnticipationDrill.jsx
- [ ] TrackingDrill.jsx
- [ ] ReactionDrill.jsx (+ Edit D)
- [ ] EyesUpDrill.jsx
- [ ] SnapshotDrill.jsx
- [ ] FindLaneDrill.jsx
- [ ] BestOptionDrill.jsx
- [ ] ReadNumbersDrill.jsx
- [ ] LateReadDrill.jsx
- [ ] TwoThingsDrill.jsx
- [ ] ShootoutDrill.jsx

- [ ] **Step 2: Verify no drill was missed**

Run: `grep -L "gymCueHooks" src/cognitive-gym/*Drill.jsx`
Expected: no output (every drill imports the hooks)

- [ ] **Step 3: Manual smoke**

Run: `npm run dev` — play one session each of three drills (one canvas, Reaction, Tracking).
Expected: rep sounds, level-up jingle when promoted, fanfare + count-up on the results card, confetti + gold label on a personal best, silence when muted.

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/*Drill.jsx
git commit -m "feat(gym): audio cues, count-up, confetti, and PB labels across all 11 drills"
```

---

### Task 8: feet-not-pixels + hockey feedback language

**Files:**
- Modify: `src/cognitive-gym/eyesUpCore.js:87-96` (`scoreTap`)
- Modify: `src/cognitive-gym/snapshotCore.js:87-96` (`scoreTap`)
- Modify: `src/cognitive-gym/EyesUpDrill.jsx:237,374-376`
- Modify: `src/cognitive-gym/SnapshotDrill.jsx:273,344-345`
- Modify: `scripts/test-gym-phase1.mjs` (append tests)

**Interfaces:**
- Consumes: `RINK_LENGTH_FT`, `RINK_WIDTH_FT` from `anticipationCore.js`.
- Produces: both `scoreTap`s additionally return `distFt` (miss distance in real rink feet).

- [ ] **Step 1: Write the failing tests** (append)

```js
import { scoreTap as eyesUpScoreTap } from "../src/cognitive-gym/eyesUpCore.js";
import { scoreTap as snapshotScoreTap } from "../src/cognitive-gym/snapshotCore.js";

test("scoreTap returns real-feet miss distance (200ft x 85ft rink)", () => {
  // canvas 800x496; tap 80px right of the flash = 80 * (200/800) = 20 ft
  const r1 = eyesUpScoreTap({ x: 480, y: 100 }, { x: 400, y: 100, hitR: 30 }, 800, 496);
  assert.equal(Math.round(r1.distFt), 20);
  // 62px below = 62 * (85/496) ≈ 10.6 ft
  const r2 = snapshotScoreTap({ x: 400, y: 162 }, { x: 400, y: 100, hitR: 30 }, 800, 496);
  assert.equal(Math.round(r2.distFt), 11);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: FAIL (`distFt` undefined)

- [ ] **Step 3: Add `distFt` to both cores**

In BOTH `eyesUpCore.js` and `snapshotCore.js`, add the import at the top: `import { RINK_LENGTH_FT, RINK_WIDTH_FT } from "./anticipationCore.js";` and inside `scoreTap`, after `distPx` is computed, add:

```js
  const distFt = Math.sqrt(
    Math.pow(dx * (RINK_LENGTH_FT / (W || 1)), 2) +
    Math.pow(dy * (RINK_WIDTH_FT / (H || 1)), 2)
  );
```

and include it in the return: `return { success, normError, distPx, distFt, points };` (update each function's doc comment line "Returns { ... }" to match).

- [ ] **Step 4: Run tests**

Run: `node --test scripts/test-gym-phase1.mjs`
Expected: PASS

- [ ] **Step 5: Surface feet in both drills**

`EyesUpDrill.jsx:237` — add `distFt` to the state:

```js
setLast({ success: result.success, distFt: Math.round(result.distFt), repPoints: result.points });
```

`EyesUpDrill.jsx:374-376` — replace the px hint lines:

```jsx
          {last
            ? last.success
              ? `Eyes up, you caught it! +${last.repPoints} (${last.distFt} ft off the spot)`
              : `Just missed — ${last.distFt} ft away. Eyes on the center puck.`
            : "Eyes on the center puck. Tap where the teammate flashes."}
```

`SnapshotDrill.jsx:273` — same `setLast` change as above.

`SnapshotDrill.jsx:344-345` — replace with:

```jsx
        ? `Found the open man! +${last.repPoints} (${last.distFt} ft off)`
        : `Not quite — ${last.distFt} ft away. The gold ring shows where he was.`
```

(Also update the `// { success, distPx, repPoints }` state comments at EyesUpDrill.jsx:39 and SnapshotDrill.jsx:37 to `distFt`.)

- [ ] **Step 6: Manual smoke + full suite**

Run: `npm run dev` (both drills show "ft" feedback), then `node --test scripts/test-gym-phase1.mjs && npm run test:gym-progress`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/eyesUpCore.js src/cognitive-gym/snapshotCore.js src/cognitive-gym/EyesUpDrill.jsx src/cognitive-gym/SnapshotDrill.jsx scripts/test-gym-phase1.mjs
git commit -m "feat(gym): miss distances in real rink feet with hockey feedback lines"
```

---

### Task 9: README refresh + full verification

**Files:**
- Modify: `src/cognitive-gym/README.md`

- [ ] **Step 1: Update the stale README**

It still documents 3 drills. Update: the drill table lists all 11 (id, player-facing name, skill, one-line format); the storage section mentions `rinkreads_gym_muted`; add one paragraph on Phase 1 modules (`gymBand.js` band resolution, `gymAudio.js` cues, `gymFx.jsx` celebration, `reactionCore.js`/`trackingCore.js` scoring) and a pointer to the spec (`docs/proposals/2026-07-09-cognitive-gym-overhaul-design.md`). Keep the marketing-language guardrail section verbatim.

- [ ] **Step 2: Full verify**

Run: `node --test scripts/test-gym-phase1.mjs && npm run test:gym-progress && npm run test:gym && npm run build`
Expected: all PASS, build clean

- [ ] **Step 3: Manual gate (owner)**

Play one full session of every drill at a U11 profile: sounds fire, no negative points anywhere, new profiles start at seeded levels (U11 → level 6 on untouched drills), mute silences everything.

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/README.md
git commit -m "docs(gym): README matches the 11-drill Phase 1 gym"
```
