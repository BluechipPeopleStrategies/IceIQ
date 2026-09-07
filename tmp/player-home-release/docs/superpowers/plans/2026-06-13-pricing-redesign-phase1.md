# Pricing Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tested logic foundation for the new RinkReads pricing model (Rookie free floor, full-access trial, Prospect and Pro annual tiers), gate the Cognitive Gym to a single free daily drill, and resolve tiers trial-aware, all behind a `PRICING_V2` flag so the live experience is untouched until go-live.

**Architecture:** Pure logic modules (no DOM, no storage) carry the rules and are unit tested with Node's built-in test runner, mirroring the existing `cognitive-gym/*Core.js` pattern. Thin localStorage wrappers adapt them to the browser. The live app changes behavior only through the existing `canAccess()` pipeline and the `resolveTier()` hook, both flipped on by a single `PRICING_V2` constant that defaults to `false`.

**Tech Stack:** React 18 + Vite, plain JavaScript (ES modules, `"type": "module"`), localStorage persistence, `node --test` + `node:assert/strict` for unit tests.

---

## Scope of this plan

In scope:
- Restructure `src/config/pricing.js` to Rookie / Prospect / Pro / Team (Family removed).
- New trial logic (`trialCore.js` pure + `trialState.js` localStorage wrapper): 14 days OR 30 reads, whichever first.
- Extend `src/utils/tierGate.js`: new tier feature sets, `fullGym`, `competitiveLayer`, `masteryAnalytics` keys, prospect/pro upgrade targets, Family removal.
- Cognitive Gym free-hook gating (`gymAccessCore.js` pure + wiring in `CognitiveGym.jsx`): one rotating free drill per day for the floor.
- `resolveTier()` becomes trial-aware behind `PRICING_V2`; trial read counting wired at the answer-batch site.
- Display-name and upgrade-label cleanups for the new tier names.

Deferred to follow-up plans (NOT in this plan):
- The marketing paywall and tier-picker UI redesign, and the in-app upsell teasers (locked-feature previews).
- Building the Pro-only competitive features (Puzzle Rush, leaderboards, leagues, head to head) and mastery analytics (advanced gym levels, mastery heatmap, performance graphs, deep reports). This plan only defines and gates their feature keys.
- Phase 2 real enforcement: Supabase account-bound entitlement and Stripe annual subscription.
- Flipping `PRICING_V2` to `true` and turning `ALL_AGES_MODE` off (the go-live switch), which happens when Phase 2 lands.

## File structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/config/pricing.js` | Single source of truth for tiers, prices, display names, trial constants | Rewrite |
| `src/utils/trialCore.js` | Pure trial-window math (no storage/DOM) | Create |
| `src/utils/trialState.js` | localStorage wrapper around trialCore | Create |
| `src/utils/tierGate.js` | Feature gating: tier feature sets, `canAccess`, upgrade targets | Modify |
| `src/utils/profiles.js` | Profile limits (drop Family suggestion) | Modify |
| `src/cognitive-gym/gymAccessCore.js` | Pure daily free-drill rotation + access rule | Create |
| `src/cognitive-gym/CognitiveGym.jsx` | Gym hub: lock non-free drills for the floor | Modify |
| `src/App.jsx` | `resolveTier` trial-awareness, trial read counting, tier-name labels | Modify |
| `scripts/test-pricing.mjs` | Unit tests for pricing shape | Create |
| `scripts/test-trial-state.mjs` | Unit tests for trial trip logic | Create |
| `scripts/test-tier-gate.mjs` | Unit tests for tier feature gating | Create |
| `scripts/test-gym-access.mjs` | Unit tests for gym free-drill rotation | Create |
| `package.json` | Add `test:pricing` script | Modify |

---

## Task 1: Restructure pricing.js

**Files:**
- Modify: `src/config/pricing.js` (full rewrite)
- Create: `scripts/test-pricing.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-pricing.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  TIERS, TIER_ORDER, FREE, PROSPECT, PRO, TEAM, tierDisplayName,
  TRIAL_DAYS, TRIAL_READS,
} from "../src/config/pricing.js";

test("four tiers in order, Family removed", () => {
  assert.deepEqual(TIER_ORDER, ["FREE", "PROSPECT", "PRO", "TEAM"]);
  assert.equal(TIERS.FAMILY, undefined);
  assert.ok(TIERS.PROSPECT && TIERS.PRO);
});

test("free floor is free, paid rungs are annual, Pro is recommended", () => {
  assert.equal(FREE.price, 0);
  assert.equal(PROSPECT.billing, "annual");
  assert.equal(PRO.billing, "annual");
  assert.equal(PRO.recommended, true);
  assert.equal(TEAM.billing, "season");
});

test("internal key for the floor stays FREE, display name is Rookie", () => {
  assert.equal(FREE.name, "FREE");
  assert.equal(tierDisplayName("FREE"), "Rookie");
  assert.equal(tierDisplayName("PROSPECT"), "Prospect");
  assert.equal(tierDisplayName("PRO"), "Pro");
  assert.equal(tierDisplayName("TEAM"), "Team");
});

test("trial constants are 14 days / 30 reads", () => {
  assert.equal(TRIAL_DAYS, 14);
  assert.equal(TRIAL_READS, 30);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-pricing.mjs`
Expected: FAIL (current pricing.js exports FAMILY, has no PROSPECT, no tierDisplayName, no TRIAL_* exports).

- [ ] **Step 3: Rewrite `src/config/pricing.js`**

Replace the entire file with:

```js
// RinkReads pricing tiers, single source of truth.
// Model: a thin permanent free floor (Rookie) plus a full-access trial that
// decays to the floor, plus an annual subscription with two paid rungs
// (Prospect, then Pro). Team stays seasonal for coaches. Prices in CAD.
// Design: docs/superpowers/specs/2026-06-13-pricing-redesign-design.md

// The internal key for the free floor stays "FREE" so the many existing FREE
// comparisons keep working. Its marketing name is "Rookie".
export const FREE = {
  name: "FREE",
  displayName: "Rookie",
  price: 0,
  billing: "free",
  profiles: 1,
};

// The full trainer: everything you need to develop. First paid rung.
export const PROSPECT = {
  name: "PROSPECT",
  displayName: "Prospect",
  annualCAD: 79.99,
  billing: "annual",
  profiles: 1,
};

// The full trainer plus the competitive and mastery layer. Top rung, the one
// every young player wants, badged Recommended in the picker.
export const PRO = {
  name: "PRO",
  displayName: "Pro",
  annualCAD: 99.99,
  billing: "annual",
  recommended: true,
  profiles: 1,
};

// Coaches and associations. Stays seasonal because rosters reset each year.
export const TEAM = {
  name: "TEAM",
  displayName: "Team",
  seasonCAD: 249.99,
  billing: "season",
  seasonStart: "September",
  seasonEnd: "March",
  seasonExpiryDate: "April 1",
  reenrollmentPromptDate: "August 15",
  maxPlayers: 20,
};

export const TIERS = { FREE, PROSPECT, PRO, TEAM };
export const TIER_ORDER = ["FREE", "PROSPECT", "PRO", "TEAM"];

// Trial window (full Pro-level access). Whichever limit trips first ends it.
export { TRIAL_DAYS, TRIAL_READS } from "../utils/trialCore.js";

// Marketing display name for a tier key. Falls back to "Rookie".
export function tierDisplayName(key) {
  const t = TIERS[String(key || "").toUpperCase()];
  return (t && t.displayName) || "Rookie";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-pricing.mjs`
Expected: PASS (4 tests). Note: this depends on Task 2 creating `trialCore.js` for the re-export. If run before Task 2, the import fails. Do Task 2 first if you hit a module-not-found error, then re-run.

- [ ] **Step 5: Commit**

```bash
git add src/config/pricing.js scripts/test-pricing.mjs
git commit -m "feat(pricing): restructure tiers to Rookie/Prospect/Pro, drop Family"
```

---

## Task 2: Pure trial-window logic (trialCore)

**Files:**
- Create: `src/utils/trialCore.js`
- Create: `scripts/test-trial-state.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-trial-state.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { trialStatus, TRIAL_DAYS, TRIAL_READS } from "../src/utils/trialCore.js";

const DAY = 24 * 60 * 60 * 1000;

test("not started: inactive with full allowance", () => {
  const s = trialStatus(null, 1000);
  assert.equal(s.started, false);
  assert.equal(s.active, false);
  assert.equal(s.reason, "not_started");
  assert.equal(s.daysLeft, TRIAL_DAYS);
  assert.equal(s.readsLeft, TRIAL_READS);
});

test("fresh start is active and counts a day down", () => {
  const s = trialStatus({ startedAt: 0, reads: 0 }, 1 * DAY);
  assert.equal(s.active, true);
  assert.equal(s.daysLeft, TRIAL_DAYS - 1);
  assert.equal(s.readsLeft, TRIAL_READS);
});

test("expires on time at TRIAL_DAYS", () => {
  const s = trialStatus({ startedAt: 0, reads: 0 }, TRIAL_DAYS * DAY);
  assert.equal(s.active, false);
  assert.equal(s.reason, "time_expired");
});

test("expires on reads at the cap", () => {
  const s = trialStatus({ startedAt: 0, reads: TRIAL_READS }, 1 * DAY);
  assert.equal(s.active, false);
  assert.equal(s.reason, "reads_expired");
});

test("whichever first: reads cap trips before the time window", () => {
  const s = trialStatus({ startedAt: 0, reads: TRIAL_READS }, 2 * DAY);
  assert.equal(s.active, false);
  assert.equal(s.reason, "reads_expired");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-trial-state.mjs`
Expected: FAIL with module-not-found (trialCore.js does not exist yet).

- [ ] **Step 3: Create `src/utils/trialCore.js`**

```js
// Pure trial-window logic for the Rookie to Pro trial. No storage, no DOM, so
// it is unit testable in plain Node (mirrors cognitive-gym/*Core.js).
//
// The trial grants full Pro access until EITHER the day window OR the read cap
// is reached, whichever comes first.

export const TRIAL_DAYS = 14;
export const TRIAL_READS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// state shape: { startedAt: number(ms) | null, reads: number }
export function trialStatus(state, nowMs, opts = {}) {
  const days = opts.days != null ? opts.days : TRIAL_DAYS;
  const reads = opts.reads != null ? opts.reads : TRIAL_READS;

  if (!state || !state.startedAt) {
    return { started: false, active: false, daysLeft: days, readsLeft: reads, reason: "not_started" };
  }

  const usedReads = state.reads || 0;
  const elapsedDays = Math.floor((nowMs - state.startedAt) / DAY_MS);
  const daysLeft = Math.max(0, days - elapsedDays);
  const readsLeft = Math.max(0, reads - usedReads);

  const timeUp = elapsedDays >= days;
  const readsUp = usedReads >= reads;
  if (timeUp || readsUp) {
    return { started: true, active: false, daysLeft, readsLeft, reason: readsUp ? "reads_expired" : "time_expired" };
  }
  return { started: true, active: true, daysLeft, readsLeft, reason: "active" };
}
```

Note on precedence: when both limits trip in the same call, `reads_expired` is reported first. The tests assert this.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-trial-state.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/trialCore.js scripts/test-trial-state.mjs
git commit -m "feat(pricing): pure trial-window logic (14 days or 30 reads)"
```

---

## Task 3: localStorage wrapper for trial state

**Files:**
- Create: `src/utils/trialState.js`

This is a thin browser adapter. It is exercised in the app, not unit tested (it touches localStorage). Keep it minimal so the pure core in Task 2 holds all the logic.

- [ ] **Step 1: Create `src/utils/trialState.js`**

```js
// localStorage-backed wrapper around trialCore. Phase 1 only; Phase 2 swaps the
// read/write for a Supabase-backed entitlement (same public surface).
import { lsGetJSON, lsSetJSON } from "./storage.js";
import { trialStatus } from "./trialCore.js";

const KEY = "rinkreads_trial_v1";

function read() {
  const s = lsGetJSON(KEY, { startedAt: null, reads: 0 });
  return s && typeof s === "object" ? s : { startedAt: null, reads: 0 };
}
function write(s) { lsSetJSON(KEY, s); }

// Start the trial clock on first use. Idempotent: never restarts an existing trial.
export function startTrialIfNeeded(nowMs = Date.now()) {
  const s = read();
  if (!s.startedAt) write({ startedAt: nowMs, reads: 0 });
}

// Count completed reads toward the cap. No-op until the trial has started.
export function recordTrialReads(n = 1) {
  const s = read();
  if (!s.startedAt) return;
  write({ startedAt: s.startedAt, reads: (s.reads || 0) + n });
}

export function getTrialStatus(nowMs = Date.now()) {
  return trialStatus(read(), nowMs);
}

export function isTrialActive(nowMs = Date.now()) {
  return getTrialStatus(nowMs).active;
}
```

- [ ] **Step 2: Verify it imports cleanly**

Run: `node --input-type=module -e "import('./src/utils/trialState.js').then(m => console.log(Object.keys(m).sort().join(',')))"`
Expected output: `getTrialStatus,isTrialActive,recordTrialReads,startTrialIfNeeded`
(This confirms `lsGetJSON`/`lsSetJSON` exist in `src/utils/storage.js` and the module loads. They are already imported by `profiles.js` and `questionOfDay.jsx`, so they exist.)

- [ ] **Step 3: Commit**

```bash
git add src/utils/trialState.js
git commit -m "feat(pricing): localStorage wrapper for trial state"
```

---

## Task 4: Extend tierGate with new tiers and feature keys

**Files:**
- Modify: `src/utils/tierGate.js`
- Create: `scripts/test-tier-gate.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-tier-gate.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { tierAllows, canAccess } from "../src/utils/tierGate.js";

test("Rookie floor allows goal-setting but not the trainer features", () => {
  assert.equal(tierAllows("smartGoals", "FREE"), true);
  assert.equal(tierAllows("positionFilter", "FREE"), false);
  assert.equal(tierAllows("adaptiveEngine", "FREE"), false);
  assert.equal(tierAllows("fullGym", "FREE"), false);
});

test("Prospect is the full trainer, without the competitive/mastery layer", () => {
  assert.equal(tierAllows("adaptiveEngine", "PROSPECT"), true);
  assert.equal(tierAllows("fullSessionHistory", "PROSPECT"), true);
  assert.equal(tierAllows("fullGym", "PROSPECT"), true);
  assert.equal(tierAllows("competitiveLayer", "PROSPECT"), false);
  assert.equal(tierAllows("masteryAnalytics", "PROSPECT"), false);
});

test("Pro adds the competitive + mastery layer", () => {
  assert.equal(tierAllows("competitiveLayer", "PRO"), true);
  assert.equal(tierAllows("masteryAnalytics", "PRO"), true);
});

test("upgrade targets point at the right rung", () => {
  assert.equal(canAccess("adaptiveEngine", "FREE").upgradeTarget, "prospect");
  assert.equal(canAccess("fullGym", "FREE").upgradeTarget, "prospect");
  assert.equal(canAccess("competitiveLayer", "PROSPECT").upgradeTarget, "pro");
  assert.equal(canAccess("coachDashboard", "PRO").upgradeTarget, "team");
});

test("removed Family tier falls back to the floor set", () => {
  assert.equal(tierAllows("adaptiveEngine", "FAMILY"), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-tier-gate.mjs`
Expected: FAIL (no `tierAllows` export; `fullGym`/`competitiveLayer`/`masteryAnalytics` unknown; upgrade targets are still `pro`/`family`).

- [ ] **Step 3: Edit `src/utils/tierGate.js`**

3a. Remove the now-unused `profiles` import. Change:

```js
import { TIERS } from "../config/pricing";
import * as deviceLock from "./deviceLock";
import * as profiles from "./profiles";
import { isReadOnly as seasonIsReadOnly } from "./seasonPass";
```

to:

```js
import { TIERS } from "../config/pricing";
import * as deviceLock from "./deviceLock";
import { isReadOnly as seasonIsReadOnly } from "./seasonPass";
```

3b. Replace the `FEATURE_KEYS` array with:

```js
const FEATURE_KEYS = [
  "multipleAgeGroups",
  "allQuestionFormats",
  "positionFilter",
  "adaptiveEngine",
  "smartGoals",
  "progressSnapshots",
  "fullSessionHistory",
  "coachDashboard",
  "coachFeedback",
  "weeklyChallenge",
  "rinkQuestions",
  "fullSkillRating",
  "fullGym",          // all 10 Cognitive Gym drills (floor gets one rotating drill/day)
  "competitiveLayer", // Pro: Puzzle Rush, leaderboards, leagues, head to head
  "masteryAnalytics", // Pro: advanced gym levels, mastery heatmap, performance graphs, deep reports
];
```

3c. Replace the entire `TIER_FEATURES` object with:

```js
// Per-tier allow list. Anything not listed is denied. Internal key "FREE" is
// the Rookie floor.
const TIER_FEATURES = {
  FREE: new Set([
    // Goal setting is free: the First-Six onboarding walks every new user through
    // setting their first development goal. The full trainer is Prospect and up.
    "smartGoals",
  ]),
  PROSPECT: new Set([
    "multipleAgeGroups",
    "allQuestionFormats",
    "positionFilter",
    "adaptiveEngine",
    "smartGoals",
    "progressSnapshots",
    "fullSessionHistory",
    "weeklyChallenge",
    "coachFeedback",
    "rinkQuestions",
    "fullSkillRating",
    "fullGym",
  ]),
  PRO: new Set([
    "multipleAgeGroups",
    "allQuestionFormats",
    "positionFilter",
    "adaptiveEngine",
    "smartGoals",
    "progressSnapshots",
    "fullSessionHistory",
    "weeklyChallenge",
    "coachFeedback",
    "rinkQuestions",
    "fullSkillRating",
    "fullGym",
    "competitiveLayer",
    "masteryAnalytics",
  ]),
  TEAM: new Set([
    "multipleAgeGroups",
    "allQuestionFormats",
    "positionFilter",
    "adaptiveEngine",
    "smartGoals",
    "progressSnapshots",
    "fullSessionHistory",
    "coachDashboard",
    "weeklyChallenge",
    "coachFeedback",
    "rinkQuestions",
    "fullSkillRating",
    "fullGym",
    "competitiveLayer",
    "masteryAnalytics",
  ]),
};
```

3d. Replace the `UPGRADE_TARGET` object with:

```js
// When a feature is denied, which tier should the user upgrade to?
const UPGRADE_TARGET = {
  multipleAgeGroups:  "prospect",
  allQuestionFormats: "prospect",
  positionFilter:     "prospect",
  adaptiveEngine:     "prospect",
  smartGoals:         "prospect",
  progressSnapshots:  "prospect",
  fullSessionHistory: "prospect",
  weeklyChallenge:    "prospect",
  coachFeedback:      "prospect",
  rinkQuestions:      "prospect",
  fullSkillRating:    "prospect",
  fullGym:            "prospect",
  competitiveLayer:   "pro",
  masteryAnalytics:   "pro",
  coachDashboard:     "team",
};
```

3e. Replace the `UPGRADE_MESSAGES` object with:

```js
const UPGRADE_MESSAGES = {
  multipleAgeGroups:  "Train every age group with RinkReads Prospect",
  allQuestionFormats: "Unlock every question format with RinkReads Prospect",
  positionFilter:     "Filter questions by position with RinkReads Prospect",
  adaptiveEngine:     "Let RinkReads adapt to your level with Prospect",
  smartGoals:         "Set development goals with RinkReads Prospect",
  progressSnapshots:  "See full progress snapshots with RinkReads Prospect",
  fullSessionHistory: "Unlock full session history with RinkReads Prospect",
  weeklyChallenge:    "Compete in weekly challenges with RinkReads Prospect",
  coachFeedback:      "See ratings and notes from your coaches with RinkReads Prospect",
  rinkQuestions:      "Unlock every rink scenario with RinkReads Prospect",
  fullSkillRating:    "Rate every skill in your development profile with RinkReads Prospect",
  fullGym:            "Unlock the full Cognitive Gym with RinkReads Prospect",
  competitiveLayer:   "Climb the leaderboards and leagues with RinkReads Pro",
  masteryAnalytics:   "Track mastery and performance over time with RinkReads Pro",
  coachDashboard:     "Track your full roster with RinkReads Team",
};
```

3f. Add a pure `tierAllows` export. Insert immediately above the `canAccess` function:

```js
/**
 * Pure check: does this tier key's allow list include the feature?
 * Unknown tiers fall back to the FREE (Rookie) floor set.
 */
export function tierAllows(feature, tierKey) {
  const set = TIER_FEATURES[tierKey] || TIER_FEATURES.FREE;
  return set.has(feature);
}
```

3g. In `canAccess`, use `tierAllows` and delete the `additionalProfiles` special-case. Change the body from:

```js
  const tierSet = TIER_FEATURES[tier] || TIER_FEATURES.FREE;
  const allowed = tierSet.has(feature);
```

to:

```js
  const allowed = tierAllows(feature, tier);
```

Then delete this entire block (the additionalProfiles special-case):

```js
  // Special-case: additionalProfiles also gated by actual profile count
  if (feature === "additionalProfiles") {
    const existing = profiles.getProfiles().length;
    const limit = profiles.getProfileLimit(tier);
    if (existing >= limit) {
      return {
        allowed: false,
        reason: "profile_limit_reached",
        upgradeTarget: limit < 3 ? "family" : null,
        extra: { currentCount: existing, limit },
      };
    }
  }
```

Leave the `multipleAgeGroups` deviceLock special-case and the TEAM `seasonIsReadOnly` logic unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-tier-gate.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/tierGate.js scripts/test-tier-gate.mjs
git commit -m "feat(pricing): tierGate for Prospect/Pro + fullGym/competitive/mastery, drop Family"
```

---

## Task 5: Drop the Family suggestion from profiles

**Files:**
- Modify: `src/utils/profiles.js`

Family is removed, so `createProfile` should no longer suggest the Family tier when the single-profile limit is hit.

- [ ] **Step 1: Edit `createProfile` in `src/utils/profiles.js`**

Change:

```js
    return {
      ok: false,
      reason: "upgrade_required",
      suggestedTier: limit < 3 ? "FAMILY" : null,
      currentLimit: limit,
    };
```

to:

```js
    return {
      ok: false,
      reason: "profile_limit_reached",
      suggestedTier: null, // Family tier dropped; single profile per account
      currentLimit: limit,
    };
```

- [ ] **Step 2: Verify the module still loads**

Run: `node --input-type=module -e "import('./src/utils/profiles.js').then(m => console.log(typeof m.createProfile))"`
Expected output: `function`

- [ ] **Step 3: Commit**

```bash
git add src/utils/profiles.js
git commit -m "chore(pricing): drop Family suggestion from profile limit path"
```

---

## Task 6: Pure gym free-drill rotation (gymAccessCore)

**Files:**
- Create: `src/cognitive-gym/gymAccessCore.js`
- Create: `scripts/test-gym-access.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-gym-access.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  freeDrillIndexForDay, freeDrillIdForDay, isFreeDrillForDay,
} from "../src/cognitive-gym/gymAccessCore.js";

const IDS = ["a", "b", "c", "d"];

test("rotation advances one drill per day and wraps", () => {
  const d0 = freeDrillIndexForDay("2026-01-01", 4);
  const d1 = freeDrillIndexForDay("2026-01-02", 4);
  assert.equal((d0 + 1) % 4, d1);
});

test("index is stable for the same day", () => {
  assert.equal(freeDrillIndexForDay("2026-01-01", 4), freeDrillIndexForDay("2026-01-01", 4));
});

test("free drill id is one of the registry ids", () => {
  const id = freeDrillIdForDay("2026-01-01", IDS);
  assert.ok(IDS.includes(id));
});

test("isFreeDrillForDay: only today's rotating drill is free", () => {
  const free = freeDrillIdForDay("2026-01-01", IDS);
  assert.equal(isFreeDrillForDay(free, "2026-01-01", IDS), true);
  const locked = IDS.find((id) => id !== free);
  assert.equal(isFreeDrillForDay(locked, "2026-01-01", IDS), false);
});

test("empty registry is safe", () => {
  assert.equal(freeDrillIdForDay("2026-01-01", []), null);
  assert.equal(freeDrillIndexForDay("2026-01-01", 0), 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/test-gym-access.mjs`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Create `src/cognitive-gym/gymAccessCore.js`**

```js
// Pure logic for the Cognitive Gym free hook. No DOM, no storage, unit testable.
// The Rookie floor gets ONE drill per day, rotating through the full registry by
// date so a free user samples variety across a week. Paid tiers get all drills
// (gated by the "fullGym" feature in tierGate).

// Stable day number from a YYYY-MM-DD string. Rotates one drill per UTC day.
export function freeDrillIndexForDay(ymd, drillCount) {
  if (!drillCount) return 0;
  const dayNum = Math.floor(Date.parse(ymd + "T00:00:00Z") / 86400000);
  return ((dayNum % drillCount) + drillCount) % drillCount;
}

// Today's single free drill id, given the registry ids in order.
export function freeDrillIdForDay(ymd, drillIds) {
  if (!drillIds || !drillIds.length) return null;
  return drillIds[freeDrillIndexForDay(ymd, drillIds.length)];
}

// Is this drill the free one for the given day?
export function isFreeDrillForDay(drillId, ymd, drillIds) {
  return drillId != null && drillId === freeDrillIdForDay(ymd, drillIds);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/test-gym-access.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cognitive-gym/gymAccessCore.js scripts/test-gym-access.mjs
git commit -m "feat(gym): pure daily free-drill rotation for the Rookie floor"
```

---

## Task 7: Gate the Cognitive Gym in the hub UI

**Files:**
- Modify: `src/cognitive-gym/CognitiveGym.jsx`

The hub currently renders every drill as an open button. Lock the non-free drills for the floor and route a locked tap to an upgrade prompt. Paid access comes from the `fullGym` feature; the single free drill comes from the rotation.

- [ ] **Step 1: Add imports at the top of `CognitiveGym.jsx`**

After the existing `import { getDrill, getStats } from "./gymStorage";` line, add:

```js
import { freeDrillIdForDay } from "./gymAccessCore";
import { canAccess } from "../utils/tierGate";
```

- [ ] **Step 2: Accept the tier + lock callback as props**

Change the component signature:

```js
export default function CognitiveGym({ playerId = "default", onBack }) {
```

to:

```js
export default function CognitiveGym({ playerId = "default", onBack, tierKey = "FREE", onLocked }) {
```

- [ ] **Step 3: Compute access once, inside the component body**

Immediately after the `const stats = useMemo(...)` / `const records = useMemo(...)` block (before the `if (activeId)` return), add:

```js
  const drillIds = useMemo(() => DRILLS.map((d) => d.id), []);
  const ymd = new Date().toISOString().slice(0, 10);
  const fullGym = canAccess("fullGym", tierKey).allowed;
  const freeDrillId = freeDrillIdForDay(ymd, drillIds);
  const isLocked = (id) => !fullGym && id !== freeDrillId;
```

- [ ] **Step 4: Lock the drill cards**

In the `DRILLS.map((d) => { ... })` block that renders `<button className="gym-drill-card" ...>`, replace the button's `onClick` and add a locked state. Change:

```jsx
            <button
              key={d.id}
              type="button"
              className="gym-drill-card"
              onClick={() => setActiveId(d.id)}
            >
              <span className="gym-skill-tag">{d.skill}</span>
```

to:

```jsx
            <button
              key={d.id}
              type="button"
              className={"gym-drill-card" + (isLocked(d.id) ? " gym-drill-locked" : "")}
              onClick={() => (isLocked(d.id) ? onLocked && onLocked(d) : setActiveId(d.id))}
            >
              {isLocked(d.id) && <span className="gym-lock-badge" aria-label="Locked">🔒</span>}
              <span className="gym-skill-tag">{d.skill}</span>
```

(The `gym-drill-locked` and `gym-lock-badge` classes can be styled later in `cognitive-gym.css`; unstyled, the lock emoji and click behavior already communicate the gate. Use an icon plus the word "Locked" via `aria-label`, never color alone, per the project accessibility rule.)

- [ ] **Step 5: Pass the props from the render site in `App.jsx`**

In `src/App.jsx`, change the Cognitive Gym render (currently around line 8306):

```jsx
        {screen === "cogym" && <CognitiveGym playerId={player.id || "__demo__"} onBack={()=>setScreen("home")}/>}
```

to:

```jsx
        {screen === "cogym" && <CognitiveGym playerId={player.id || "__demo__"} onBack={()=>setScreen("home")} tierKey={tier} onLocked={() => promptUpgrade("fullGym", "prospect")}/>}
```

(`tier` is the resolved tier from `const tier = resolveTier({ profile, demoMode })` and `promptUpgrade` is defined in the same component, both already in scope here.)

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no errors referencing `CognitiveGym`, `gymAccessCore`, or `tierGate`.

- [ ] **Step 7: Commit**

```bash
git add src/cognitive-gym/CognitiveGym.jsx src/App.jsx
git commit -m "feat(gym): lock non-free drills for the Rookie floor with upgrade prompt"
```

---

## Task 8: Make resolveTier trial-aware behind PRICING_V2

**Files:**
- Modify: `src/App.jsx`

This is the switch that activates the new model. Default OFF so the live experience is unchanged.

- [ ] **Step 1: Add the imports and flag**

Add to the import block near the other `./utils` imports at the top of `App.jsx`:

```js
import { isTrialActive, startTrialIfNeeded, recordTrialReads } from "./utils/trialState";
```

Then, directly above the `function resolveTier(args = {}) {` definition, add the flag:

```js
// Flip to true at go-live (Phase 2). When on, the new pricing model is enforced:
// the Rookie floor bites, and full Pro access comes only from the active trial.
// When off, the legacy ALL_AGES_MODE behavior stands. See
// docs/superpowers/plans/2026-06-13-pricing-redesign-phase1.md
const PRICING_V2 = false;
```

- [ ] **Step 2: Make resolveTier honor the trial under the flag**

Change `resolveTier`:

```js
function resolveTier(args = {}) {
  const t = resolveTierRaw(args);
  // ALL_AGES_MODE (temporary): floor FREE up to PRO so the single login is the
  // full Pro experience ...
  return ALL_AGES_MODE && t === "FREE" ? "PRO" : t;
}
```

to:

```js
function resolveTier(args = {}) {
  const t = resolveTierRaw(args);
  if (PRICING_V2) {
    // New model: full Pro access only during the active trial; otherwise the
    // resolved tier stands (FREE = Rookie floor) so gating bites.
    if (t === "FREE" && isTrialActive()) return "PRO";
    return t;
  }
  return ALL_AGES_MODE && t === "FREE" ? "PRO" : t;
}
```

- [ ] **Step 3: Update the two hardcoded tier-string arrays in resolveTierRaw**

In `resolveTierRaw`, change both occurrences of:

```js
["FREE","PRO","FAMILY","TEAM"]
```

to:

```js
["FREE","PROSPECT","PRO","TEAM"]
```

(There are two: the localStorage override check and the `profile.tier` check.)

- [ ] **Step 4: Start the trial on boot under the flag**

Find the boot effect: `useEffect(() => { try { checkSeasonReset(); } catch {} }, []);` and change it to:

```js
  useEffect(() => {
    try { checkSeasonReset(); } catch {}
    if (PRICING_V2) { try { startTrialIfNeeded(); } catch {} }
  }, []);
```

- [ ] **Step 5: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. With `PRICING_V2 = false`, runtime behavior is identical to today (the new imports are referenced but inert).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat(pricing): trial-aware resolveTier behind PRICING_V2 flag (default off)"
```

---

## Task 9: Count reads toward the trial cap

**Files:**
- Modify: `src/App.jsx`

Increment the trial read counter when a batch of answered questions is recorded. A "read" is one completed question/scenario.

- [ ] **Step 1: Wire recordTrialReads at the answer-batch site**

Find the line (currently around 8030):

```js
      SB.recordQuestionAnswersBatch(results.map(r => ({ questionId: r.id, correct: r.ok })));
```

Change it to:

```js
      SB.recordQuestionAnswersBatch(results.map(r => ({ questionId: r.id, correct: r.ok })));
      if (PRICING_V2) { try { recordTrialReads(results.length); } catch {} }
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. With the flag off this line is inert.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(pricing): count completed reads toward the trial cap (behind flag)"
```

---

## Task 10: Update tier-name labels for the upgrade prompt

**Files:**
- Modify: `src/App.jsx`

The upgrade modal computes a display tier name from the upgrade target. The old code special-cased "family"; targets are now `prospect`, `pro`, `team`.

- [ ] **Step 1: Replace the family ternary**

Find (around line 3893):

```js
  const tierName = upgradeTarget === "family" ? "Family" : upgradeTarget === "team" ? "Team" : "Pro";
```

Change to:

```js
  const tierName = upgradeTarget
    ? upgradeTarget.charAt(0).toUpperCase() + upgradeTarget.slice(1)
    : "Prospect";
```

(This yields "Prospect", "Pro", or "Team" from the target string. The other label site, around line 8437, already uses `target.charAt(0).toUpperCase() + target.slice(1)` and needs no change.)

- [ ] **Step 2: Let Prospect users see the Pro upsell preview**

Find (around line 1287):

```js
  const showProPreview = (demoMode || subscriptionTier === "FREE") && subscriptionTier !== "PRO" && subscriptionTier !== "TEAM";
```

Change to:

```js
  const showProPreview = (demoMode || subscriptionTier === "FREE" || subscriptionTier === "PROSPECT") && subscriptionTier !== "PRO" && subscriptionTier !== "TEAM";
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat(pricing): upgrade labels for Prospect/Pro/Team, Prospect sees Pro upsell"
```

---

## Task 11: Add the test:pricing npm script and run the full suite

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the script**

In `package.json` `scripts`, add (place it near the other `test:*` entries):

```json
    "test:pricing": "node --test scripts/test-pricing.mjs scripts/test-trial-state.mjs scripts/test-tier-gate.mjs scripts/test-gym-access.mjs",
```

- [ ] **Step 2: Run the full pricing suite**

Run: `npm run test:pricing`
Expected: all four files pass. Summary shows `tests 19  pass 19  fail 0` (4 + 5 + 5 + 5).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "test(pricing): add test:pricing script for the new pricing modules"
```

---

## Verification (end of plan)

- [ ] `npm run test:pricing` passes (19 tests).
- [ ] `npm run build` succeeds.
- [ ] With `PRICING_V2 = false` (default), the running app behaves exactly as before (manually confirm: Cognitive Gym opens all drills, no paywall changes).
- [ ] Temporarily set `PRICING_V2 = true` in a local edit and confirm in the browser: a fresh profile has full access (trial active), the Cognitive Gym shows one unlocked drill plus locked drills after the trial decays (simulate by clearing `rinkreads_trial_v1` and setting a past `startedAt`). Revert `PRICING_V2` to `false` before finishing.

## Self-review notes

Spec coverage check against `docs/superpowers/specs/2026-06-13-pricing-redesign-design.md`:
- Tier ladder (Rookie/Prospect/Pro/Team), prices, Family dropped: Task 1.
- Trial 14 days / 30 reads, whichever first: Tasks 2, 3, 9.
- Trial decays to floor, full Pro access during trial: Task 8.
- Heavy gating / feature matrix: Task 4.
- Gym free hook (one rotating drill/day): Tasks 6, 7.
- Phase 1 localStorage prototype, no payment: all tasks; `PRICING_V2` keeps it inert until go-live.
- Daily Read floor: already satisfied by the existing Question of the Day (one per day per age group), so no new task is required; noted here so it is not mistaken for a gap.
- Deferred by design (own future plans): paywall/tier-picker UI redesign and upsell teasers, the actual competitive/mastery feature builds, and Phase 2 (Supabase entitlement + Stripe annual subscription). Listed under "Scope of this plan".
