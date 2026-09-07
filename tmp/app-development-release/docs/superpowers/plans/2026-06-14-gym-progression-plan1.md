# Gym Progression Plan 1: Calibration + Incentives

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Cognitive Gym a smarter start (age-seeded starting level) and a visible progression layer (mastery stars, gym XP + rank, a daily goal, and badges), so the gym feels rewarding to come back to.

**Architecture:** Two pure, unit-tested modules carry the logic: `gymEngine` gains age-seed helpers, and a new `gymProgressCore.js` computes stars/XP/rank/daily-goal/badges from the data `gymStorage` already keeps (no new persistence). Calibration is applied once when the gym opens (in `CognitiveGym`), so every drill reads its seeded level through the existing `getDrill` with zero per-drill edits. The hub renders the new progression UI.

**Tech Stack:** React 18 + Vite, plain JS ES modules, localStorage (existing `gymStorage`), `node --test` + `node:assert/strict`.

---

## Scope

This plan covers the spec's Plan 1 **calibration** and **incentives** layers
(`docs/superpowers/specs/2026-06-13-gym-progression-incentives-design.md`). The third Plan 1
piece, **head-to-head challenge links**, is split into its own follow-up plan: it needs the drills
to generate deterministically from a seed, and only the Shootout drill is seedable today, so
retrofitting is a separate effort. Leaderboards/leagues remain Plan 2 (backend).

Scope: U7 / U9 / U11. `calibratedStartLevel` returns 1 (no seed) for any other band, so the code
is safe if an older band slips through.

## Design decisions (tunable constants, chosen here)

- Age-seed starting levels: U7 = 2, U9 = 4, U11 = 6 (out of the engine's 1..20). Seeds only an
  untouched drill (no sessions yet) and never lowers an existing level.
- Mastery stars per drill: bronze at level 5, silver at 10, gold at 15.
- Gym XP = career points / 10. Rank ladder by cumulative XP: Warming Up (0), Reading the Ice
  (500), Heads Up (1500), Playmaker (3500), Hockey IQ (7000).
- Daily goal: play 2 distinct drills today.
- Badges: Level Up (any drill > level 1), 7-Day Streak (longest >= 7), Tried Them All (every
  drill has a session), Gym Regular (>= 25 total sessions), Goalie Beater (>= 10 Shootout sessions).

## File structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/cognitive-gym/gymEngine.js` | `calibratedStartLevel`, `seededLevel` (pure) | Modify |
| `src/cognitive-gym/gymProgressCore.js` | Pure stars/XP/rank/daily-goal/badges | Create |
| `src/cognitive-gym/gymStorage.js` | `calibrateDrill` (seed + persist) | Modify |
| `src/cognitive-gym/CognitiveGym.jsx` | Calibrate-on-open + progression UI | Modify |
| `src/App.jsx` | Pass `ageBand` to the gym | Modify |
| `scripts/test-gym-progress.mjs` | Unit tests for the pure helpers | Create |
| `package.json` | Add `test:gym-progress` script | Modify |

---

## Task 1: Age-seed engine helpers

**Files:**
- Modify: `src/cognitive-gym/gymEngine.js`
- Create: `scripts/test-gym-progress.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-gym-progress.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { calibratedStartLevel, seededLevel } from "../src/cognitive-gym/gymEngine.js";

test("calibratedStartLevel seeds by age band, defaults to 1", () => {
  assert.equal(calibratedStartLevel("U7"), 2);
  assert.equal(calibratedStartLevel("u9"), 4);
  assert.equal(calibratedStartLevel("U11"), 6);
  assert.equal(calibratedStartLevel("U15"), 1);
  assert.equal(calibratedStartLevel(null), 1);
});

test("seededLevel seeds an untouched drill, never lowers, leaves played drills", () => {
  // untouched (no sessions) -> seeded up to the age level
  assert.equal(seededLevel({ level: 1, sessions: [] }, "U11"), 6);
  // never lower an existing higher level
  assert.equal(seededLevel({ level: 9, sessions: [] }, "U7"), 9);
  // a played drill is left alone
  assert.equal(seededLevel({ level: 3, sessions: [{ date: "2026-06-14" }] }, "U11"), 3);
  // unknown band on untouched -> stays 1
  assert.equal(seededLevel({ level: 1, sessions: [] }, "U15"), 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-gym-progress.mjs`
Expected: FAIL (calibratedStartLevel / seededLevel not exported).

- [ ] **Step 3: Add the helpers to `src/cognitive-gym/gymEngine.js`**

Append to `src/cognitive-gym/gymEngine.js` (after the existing exports):

```js
// Age-seeded starting level for a drill, so a kid begins near their real level
// instead of level 1. Unknown / older bands return 1 (no seed). U13-U18 paused.
export function calibratedStartLevel(ageBand) {
  const b = String(ageBand || "").toUpperCase();
  if (b === "U7") return 2;
  if (b === "U9") return 4;
  if (b === "U11") return 6;
  return 1;
}

// The level a drill should start at given its stored record and the age band.
// Only seeds an untouched drill (no sessions yet); never lowers an existing level.
export function seededLevel(record, ageBand) {
  const cur = (record && record.level) || 1;
  const played = record && Array.isArray(record.sessions) && record.sessions.length > 0;
  if (played) return cur;
  return Math.max(cur, calibratedStartLevel(ageBand));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-gym-progress.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/gymEngine.js scripts/test-gym-progress.mjs
git commit -m "feat(gym): age-seed helpers (calibratedStartLevel, seededLevel)"
```

---

## Task 2: Incentive compute core

**Files:**
- Create: `src/cognitive-gym/gymProgressCore.js`
- Modify: `scripts/test-gym-progress.mjs`

- [ ] **Step 1: Add the failing tests**

Append to `scripts/test-gym-progress.mjs`:

```js
import {
  starTier, xpFromPoints, rankForXp, dailyDrillsDone, earnedBadges,
} from "../src/cognitive-gym/gymProgressCore.js";

test("starTier: 0/1/2/3 at levels <5 / >=5 / >=10 / >=15", () => {
  assert.equal(starTier(1), 0);
  assert.equal(starTier(5), 1);
  assert.equal(starTier(10), 2);
  assert.equal(starTier(15), 3);
  assert.equal(starTier(20), 3);
});

test("xpFromPoints is points/10, floored at 0", () => {
  assert.equal(xpFromPoints(0), 0);
  assert.equal(xpFromPoints(950), 95);
  assert.equal(xpFromPoints(-5), 0);
});

test("rankForXp climbs the ladder and reports the next threshold", () => {
  assert.equal(rankForXp(0).name, "Warming Up");
  assert.equal(rankForXp(0).nextAt, 500);
  assert.equal(rankForXp(1500).name, "Heads Up");
  const top = rankForXp(99999);
  assert.equal(top.name, "Hockey IQ");
  assert.equal(top.nextAt, null);
});

test("dailyDrillsDone counts distinct drills played on the given day", () => {
  const records = {
    a: { sessions: [{ date: "2026-06-14T10:00:00Z" }] },
    b: { sessions: [{ date: "2026-06-13T10:00:00Z" }] },
    c: { sessions: [] },
  };
  assert.equal(dailyDrillsDone(records, "2026-06-14"), 1);
  assert.equal(dailyDrillsDone(records, "2026-06-13"), 1);
  assert.equal(dailyDrillsDone(records, "2026-01-01"), 0);
});

test("earnedBadges reflects stats and records", () => {
  const stats = { totalSessions: 30, longestStreak: 8 };
  const records = {
    x: { level: 4, sessions: [{ date: "d" }] },
    shootout: { level: 2, sessions: Array.from({ length: 10 }, () => ({ date: "d" })) },
  };
  const map = Object.fromEntries(earnedBadges(stats, records).map((b) => [b.id, b.earned]));
  assert.equal(map.weekStreak, true);
  assert.equal(map.regular, true);
  assert.equal(map.goalieBeater, true);
  assert.equal(map.allDrills, true); // every record here has a session
  assert.equal(map.firstLevelUp, false); // no drill above level 1
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-gym-progress.mjs`
Expected: FAIL (gymProgressCore.js not found).

- [ ] **Step 3: Create `src/cognitive-gym/gymProgressCore.js`**

```js
// Pure incentive/progression helpers for the Cognitive Gym. No DOM, no storage,
// so they are unit-testable in plain Node. All values are derived from data that
// gymStorage already keeps (drill levels, sessions, career points, streaks).

// Mastery star tier from a drill's level: 0 none, 1 bronze, 2 silver, 3 gold.
export const STAR_LEVELS = [5, 10, 15];
export function starTier(level) {
  let t = 0;
  for (const th of STAR_LEVELS) if ((level || 1) >= th) t += 1;
  return t;
}

// Gym XP from points (career XP is xpFromPoints over the career point total).
export function xpFromPoints(points) {
  return Math.max(0, Math.round((points || 0) / 10));
}

// Rank ladder by cumulative XP. Returns { name, index, nextAt } (nextAt null at top).
export const RANKS = [
  { name: "Warming Up", at: 0 },
  { name: "Reading the Ice", at: 500 },
  { name: "Heads Up", at: 1500 },
  { name: "Playmaker", at: 3500 },
  { name: "Hockey IQ", at: 7000 },
];
export function rankForXp(totalXp) {
  const xp = Math.max(0, totalXp || 0);
  let idx = 0;
  for (let i = 0; i < RANKS.length; i += 1) if (xp >= RANKS[i].at) idx = i;
  const next = RANKS[idx + 1] || null;
  return { name: RANKS[idx].name, index: idx, nextAt: next ? next.at : null };
}

// Distinct drills played on the given YYYY-MM-DD, for the daily goal.
export function dailyDrillsDone(records, ymd) {
  let n = 0;
  for (const id of Object.keys(records || {})) {
    const sessions = (records[id] && records[id].sessions) || [];
    if (sessions.some((s) => (s.date || "").slice(0, 10) === ymd)) n += 1;
  }
  return n;
}

// Earned badges from aggregate stats + per-drill records. Returns
// [{ id, label, earned }]. `records` is keyed by drillId.
export function earnedBadges(stats, records) {
  const recs = records || {};
  const ids = Object.keys(recs);
  const totalSessions = (stats && stats.totalSessions) || 0;
  const longest = (stats && stats.longestStreak) || 0;
  const anyLevelUp = ids.some((id) => ((recs[id] && recs[id].level) || 1) > 1);
  const allTried = ids.length > 0 && ids.every((id) => (((recs[id] && recs[id].sessions) || []).length) > 0);
  const shootoutSessions = ((recs.shootout && recs.shootout.sessions) || []).length;
  return [
    { id: "firstLevelUp", label: "Level Up", earned: anyLevelUp },
    { id: "weekStreak", label: "7-Day Streak", earned: longest >= 7 },
    { id: "allDrills", label: "Tried Them All", earned: allTried },
    { id: "regular", label: "Gym Regular", earned: totalSessions >= 25 },
    { id: "goalieBeater", label: "Goalie Beater", earned: shootoutSessions >= 10 },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-gym-progress.mjs`
Expected: PASS (7 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/gymProgressCore.js scripts/test-gym-progress.mjs
git commit -m "feat(gym): pure incentive core (stars, XP, rank, daily goal, badges)"
```

---

## Task 3: Calibrate-drill storage helper

**Files:**
- Modify: `src/cognitive-gym/gymStorage.js`

- [ ] **Step 1: Import seededLevel at the top of `gymStorage.js`**

`gymStorage.js` currently has no import of `gymEngine`. Add at the very top of the file (before
the `STORAGE_KEY` const):

```js
import { seededLevel } from "./gymEngine.js";
```

- [ ] **Step 2: Add `calibrateDrill` after `getDrill`**

Immediately after the `getDrill` function in `src/cognitive-gym/gymStorage.js`, add:

```js
// Seed an untouched drill's level from the age band (smarter start). Idempotent:
// only seeds a drill with no sessions and never lowers a level. Persists + returns.
export function calibrateDrill(playerId, drillId, ageBand) {
  const all = readAll();
  if (!all[playerId]) all[playerId] = {};
  const drill = { ...emptyDrill(), ...(all[playerId][drillId] || {}) };
  const target = seededLevel(drill, ageBand);
  if (target !== drill.level) {
    drill.level = target;
    all[playerId][drillId] = drill;
    writeAll(all);
  }
  return drill;
}
```

(`readAll`, `writeAll`, and `emptyDrill` are already defined in this module.)

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds (gymStorage importing gymEngine introduces no cycle that breaks the
build; gymEngine does not import gymStorage).

- [ ] **Step 4: Commit**

```bash
git add src/cognitive-gym/gymStorage.js
git commit -m "feat(gym): calibrateDrill seeds an untouched drill from age band"
```

---

## Task 4: Calibrate on gym open + pass age band

**Files:**
- Modify: `src/cognitive-gym/CognitiveGym.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Update CognitiveGym imports**

In `src/cognitive-gym/CognitiveGym.jsx`, change the React import:

```js
import { useState, useMemo } from "react";
```

to:

```js
import { useState, useMemo, useEffect } from "react";
```

And change the gymStorage import:

```js
import { getDrill, getStats } from "./gymStorage";
```

to:

```js
import { getDrill, getStats, calibrateDrill } from "./gymStorage";
```

- [ ] **Step 2: Accept `ageBand` and seed on open**

Change the component signature:

```js
export default function CognitiveGym({ playerId = "default", onBack }) {
```

to:

```js
export default function CognitiveGym({ playerId = "default", onBack, ageBand = null }) {
```

Then, immediately after the `records` useMemo block (the one ending with `[playerId, refresh]\n  );`), add:

```js
  // Smarter start: when the gym opens, seed every untouched drill to the age band.
  useEffect(() => {
    if (!ageBand) return;
    try {
      DRILLS.forEach((d) => calibrateDrill(playerId, d.id, ageBand));
      setRefresh((r) => r + 1); // re-read seeded levels
    } catch { /* storage unavailable */ }
  }, [playerId, ageBand]);
```

- [ ] **Step 3: Pass `ageBand` from App**

In `src/App.jsx`, find the Cognitive Gym render line (around line 8306):

```jsx
        {screen === "cogym" && <CognitiveGym playerId={player.id || "__demo__"} onBack={()=>setScreen("home")} tierKey={tier} onLocked={() => promptUpgrade("fullGym", "prospect")}/>}
```

(Note: `tierKey` and `onLocked` are accepted by the gym render but `CognitiveGym` only uses
`playerId`, `onBack`, and now `ageBand`; the extra props are harmless. Leave them.)

Change it to add `ageBand`:

```jsx
        {screen === "cogym" && <CognitiveGym playerId={player.id || "__demo__"} ageBand={player?.level || null} onBack={()=>setScreen("home")} tierKey={tier} onLocked={() => promptUpgrade("fullGym", "prospect")}/>}
```

`player.level` is the player's age group (e.g. "U11"); `calibratedStartLevel` returns 1 for
anything it does not recognize, so this is safe even if the value is unexpected.

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/CognitiveGym.jsx src/App.jsx
git commit -m "feat(gym): calibrate untouched drills on gym open (age-seeded start)"
```

---

## Task 5: Progression UI in the hub

**Files:**
- Modify: `src/cognitive-gym/CognitiveGym.jsx`

- [ ] **Step 1: Import the incentive core and compute derived values**

In `src/cognitive-gym/CognitiveGym.jsx`, add this import near the other imports:

```js
import { starTier, xpFromPoints, rankForXp, dailyDrillsDone, earnedBadges } from "./gymProgressCore";
```

Then, directly after the calibrate `useEffect` you added in Task 4, add the derived values:

```js
  const DAILY_GOAL = 2;
  const todayYmd = new Date().toISOString().slice(0, 10);
  const totalXp = xpFromPoints(stats.careerPoints || 0);
  const rank = rankForXp(totalXp);
  const goalDone = dailyDrillsDone(records, todayYmd);
  const badges = earnedBadges(stats, records);
```

- [ ] **Step 2: Add rank + daily-goal cells to the stat board**

In the `<div className="gym-stats">` block, immediately after the opening
`<div className="gym-stats">` line, insert two cells:

```jsx
          <div className="gym-stat">
            <span className="gym-stat-num">{rank.name}</span>
            <span className="gym-stat-label">rank ({totalXp} XP)</span>
          </div>
          <div className="gym-stat">
            <span className="gym-stat-num">{goalDone}/{DAILY_GOAL}</span>
            <span className="gym-stat-label">today's goal</span>
          </div>
```

- [ ] **Step 3: Add a badges row after the header**

Immediately after the closing `</header>` tag, insert:

```jsx
      <section className="gym-badges" aria-label="Badges">
        {badges.map((b) => (
          <span
            key={b.id}
            className={"gym-badge" + (b.earned ? " gym-badge-on" : "")}
            title={b.earned ? "Earned" : "Locked"}
          >
            {b.earned ? "★" : "☆"} {b.label}
          </span>
        ))}
      </section>
```

(Earned vs locked reads by the filled/empty star glyph and the title, not color alone.)

- [ ] **Step 4: Add mastery stars to each drill card**

In the grid `DRILLS.map(...)` render, find the card meta block:

```jsx
              <div className="gym-card-meta">
```

Immediately BEFORE that `<div className="gym-card-meta">` line, insert a stars line:

```jsx
              <div className="gym-card-stars" aria-label={`Mastery ${starTier(rec.level)} of 3`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < starTier(rec.level) ? "gym-star on" : "gym-star"}>
                    {i < starTier(rec.level) ? "★" : "☆"}
                  </span>
                ))}
                <span className="gym-star-tier">{["", "Bronze", "Silver", "Gold"][starTier(rec.level)]}</span>
              </div>
```

(`rec` is the per-drill record already in scope in the map. Stars read by filled/empty glyph +
the tier word, not color alone.)

- [ ] **Step 5: Add minimal styles**

Append to `src/cognitive-gym/cognitive-gym.css`:

```css
.gym-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 6px 0 14px; }
.gym-badge { font-size: 12px; padding: 3px 9px; border-radius: 999px; border: 1px solid #2a466b; color: #8aa0b8; }
.gym-badge-on { color: #14243c; background: #c9a24b; border-color: #c9a24b; font-weight: 700; }
.gym-card-stars { display: flex; align-items: center; gap: 3px; margin: 4px 0; font-size: 14px; color: #6b8294; }
.gym-card-stars .gym-star.on { color: #c9a24b; }
.gym-star-tier { margin-left: 6px; font-size: 11px; color: #8aa0b8; }
```

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

Then `npm run dev`, open the Cognitive Gym, and confirm: a rank + today's-goal cell in the stat
board, a badges row, and mastery stars on each drill card.

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/CognitiveGym.jsx src/cognitive-gym/cognitive-gym.css
git commit -m "feat(gym): progression UI (stars, rank/XP, daily goal, badges)"
```

---

## Task 6: Test script + full verify

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script**

In `package.json` `scripts`, near the other `test:*` entries, add:

```json
    "test:gym-progress": "node --test scripts/test-gym-progress.mjs",
```

- [ ] **Step 2: Run the suite + build**

Run: `npm run test:gym-progress`
Expected: PASS (7 tests).
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "test(gym): add test:gym-progress script"
```

---

## Verification (end of plan)

- [ ] `npm run test:gym-progress` passes (7 tests).
- [ ] `npm run build` succeeds.
- [ ] In the browser, a fresh profile with age U11 opens the gym and its drills start near level 6
  (not 1); the hub shows rank/XP, today's goal (n/2), a badges row, and per-drill mastery stars.

## Self-review notes

Spec coverage against `docs/superpowers/specs/2026-06-13-gym-progression-incentives-design.md`:
- Smarter start (age-seeded starting level): Tasks 1, 3, 4. (Placement first-session / faster
  promotion is deferred; age-seed is the core "smarter start" and is the headline.)
- Mastery stars: Task 2 (`starTier`) + Task 5.
- Gym XP + rank: Task 2 + Task 5.
- Daily goal + streak ring: Task 2 (`dailyDrillsDone`) + Task 5. (The existing day-streak stat
  already shows in the board; this adds the daily goal count.)
- Badges: Task 2 (`earnedBadges`) + Task 5.
- Beat-your-best (free, all tiers): already present (the board shows best streak / best session /
  career points); no new work needed.
- Head-to-head + leagues: explicitly OUT of this plan (own follow-ups), per Scope.

Type/name consistency: `calibratedStartLevel`/`seededLevel` (gymEngine) are consumed by
`calibrateDrill` (gymStorage) and tested directly. `starTier`/`xpFromPoints`/`rankForXp`/
`dailyDrillsDone`/`earnedBadges` (gymProgressCore) are consumed by CognitiveGym and tested
directly. `records` (keyed by drillId, each with `level` and `sessions`) is the shape produced by
`getDrill` and passed to the core helpers.
```
