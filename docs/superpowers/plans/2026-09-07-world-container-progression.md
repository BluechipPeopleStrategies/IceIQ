# Worlds as Container and Progression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the six hockey worlds the container for the whole player learning path, with one Start button inside a world, worlds opened by challenges, recurring comprehension checks gating new territory, and peripheral features revealed gradually.

**Architecture:** All progression rules live in pure `*Core.js` modules with no React and no direct storage access (storage is passed in), each with a `*.test.mjs` beside it. React components consume those modules. The existing `player-learning` route and its `arena`/`age`/`world` params are extended rather than replaced. The existing spaced mastery system is reused as the depth layer; no second progression system is built.

**Tech Stack:** React 18 + Vite, plain JavaScript/JSX (no TypeScript), `node:test` + `node:assert/strict`, localStorage via `src/utils/storage.js`.

**Spec:** `docs/superpowers/specs/2026-09-07-world-container-progression-design.md`

## Global Constraints

- Plain JavaScript and JSX only. No TypeScript. No new npm dependencies.
- Pure core modules: no React imports, no direct `localStorage` access. Storage values are passed in as arguments and returned as plain data.
- Tests are `*.test.mjs` beside the module, using `node:test` and `node:assert/strict`. Follow the repo's existing pattern of importing the module under test via `existsSync` + dynamic import so the test file runs (and fails clearly) before the module exists.
- **Never rename a persisted storage key, persisted field name, or question id.** Renaming a persisted key silently orphans every existing saved practice record.
- Display copy uses American spelling: "practice", "practiced", "practicing".
- Run `npm run test:practice` for the unit suite. **Verification also requires `npm run build`**, because that suite never parses or builds `App.jsx`; on 2026-09-07 a green 648-test suite coexisted with an app that could not load.
- New storage keys follow the existing naming shape: `rinkreads_<thing>_v1:<encodeURIComponent(playerId)>`.
- World order is fixed: `skating-movement`, `puck-skills`, `hockey-sense`, `offensive-play`, `defensive-play`, `transition-compete`.

---

## File Structure

**Create:**
- `src/one-on-one/worldUnlockCore.js` + `.test.mjs` — which worlds are open, challenge availability, challenge results
- `src/one-on-one/comprehensionCheckCore.js` + `.test.mjs` — when a check is due, how it is composed, pass bars, what it blocks
- `src/one-on-one/worldSessionCore.js` + `.test.mjs` — what Start serves next inside a world
- `src/player/disclosureCore.js` + `.test.mjs` — qualifying sessions and the reveal ladder
- `src/player/progressionStorage.js` — thin adapters mapping the above to localStorage keys
- `scripts/report-progression-pacing.mjs` — content pacing report
- `src/one-on-one/WorldChallenge.jsx` — challenge flow UI
- `src/one-on-one/ComprehensionCheck.jsx` — check flow UI
- `src/player/worldBackdrop.css` — faint world art layer

**Modify:**
- `src/player/playerLearningHomeCore.js` — `HOME_ACTIONS` entries
- `src/player/PlayerLearningHome.jsx` + `.css` — worlds grid as entry, lock states, hero button removal
- `src/one-on-one/PracticeHub.jsx` — world mode, single Start, tab hiding
- `src/App.jsx` — home navigation ids
- `package.json` — one new report script

---

### Task 1: American spelling in display copy

Independent of everything else. Ships alone.

**Files:**
- Modify: `src/player/playerLearningHomeCore.js`, `src/player/PlayerLearningHome.jsx`, `src/one-on-one/PracticeHub.jsx`, and any other file with British spelling in a user-visible string
- Test: `src/player/copySpelling.test.mjs` (create)

**Interfaces:**
- Consumes: nothing
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Find every occurrence, separating copy from keys**

```bash
grep -rn "practise\|practising\|practised" src/ --include=*.js --include=*.jsx
```

Read each hit and classify it. Change it **only** if it is a user-visible string. Do **not** change it if it is a storage key, a persisted JSON field name, a question id, or a CSS class name. If any hit is a persisted field, leave it and note it in the commit message.

- [ ] **Step 2: Write the failing guard test**

```js
// src/player/copySpelling.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test('user-visible copy uses American spelling', () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    if (!/\.(js|jsx)$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const [index, line] of text.split('\n').entries()) {
      if (/practis(e|ing|ed)/i.test(line)) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, []);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test src/player/copySpelling.test.mjs`
Expected: FAIL, listing every remaining British spelling.

- [ ] **Step 4: Apply the copy changes**

In `src/player/playerLearningHomeCore.js` line 9, change the `practice` action title:

```js
  { id: 'practice', title: 'Practice a read', description: 'Choose the next play or move a player into useful space.', icon: 'position' },
```

In `src/player/PlayerLearningHome.jsx`, change the hero button label and the "More ways to practise" heading:

```jsx
<button type="button" className="plh-button" onClick={() => navigate('practice')}>Practice a read <span aria-hidden="true">→</span></button>
```

```jsx
<nav className="plh-other-ways" aria-label="More ways to practice"><span>More ways to practice</span>
```

Also update "Groups practised" to "Groups practiced", "Keep practising each concept" to "Keep practicing each concept", and the same in the `plh-requirements` details text. Apply the equivalent changes to every remaining hit from Step 1.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test src/player/copySpelling.test.mjs`
Expected: PASS

- [ ] **Step 6: Run the full suite and build**

```bash
npm run test:practice
npm run build
```

Expected: suite green, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/ 
git commit -m "fix(copy): use American spelling in player-facing text"
```

---

### Task 2: Progression pacing report

Independent of everything else. Tells content work which age bands are starving.

**Files:**
- Create: `scripts/report-progression-pacing.mjs`
- Modify: `package.json`
- Test: `scripts/test-progression-pacing.mjs` (create)

**Interfaces:**
- Consumes: `readBankFiles` from `tools/experimental-bank-files.mjs`
- Produces: `pacingRows(bank, options)` → array of `{ ageBand, scenarios, questions, freshSessions, freshWeeks, sustainsTarget }`

- [ ] **Step 1: Write the failing test**

```js
// scripts/test-progression-pacing.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./report-progression-pacing.mjs', import.meta.url);
const mod = existsSync(modulePath) ? await import(modulePath.href) : {};

test('pacing rows convert question counts into sessions and weeks', () => {
  assert.equal(typeof mod.pacingRows, 'function', 'report needs a pacingRows export');
  const bank = [
    { ageBand: 'U9', questions: new Array(20).fill(0).map((_, i) => ({ id: `a${i}` })) },
    { ageBand: 'U9', questions: new Array(30).fill(0).map((_, i) => ({ id: `b${i}` })) },
    { ageBand: 'U18', questions: new Array(10).fill(0).map((_, i) => ({ id: `c${i}` })) },
  ];
  const rows = mod.pacingRows(bank, { questionsPerSession: 10, sessionsPerWeek: 2.5, targetWeeks: 12 });
  const u9 = rows.find(row => row.ageBand === 'U9');
  assert.equal(u9.questions, 50);
  assert.equal(u9.scenarios, 2);
  assert.equal(u9.freshSessions, 5);
  assert.equal(u9.freshWeeks, 2);
  assert.equal(u9.sustainsTarget, false);
  const u18 = rows.find(row => row.ageBand === 'U18');
  assert.equal(u18.questions, 10);
  assert.equal(u18.sustainsTarget, false);
});

test('a band with enough content sustains the target', () => {
  const bank = [{ ageBand: 'U11', questions: new Array(300).fill(0).map((_, i) => ({ id: `q${i}` })) }];
  const rows = mod.pacingRows(bank, { questionsPerSession: 10, sessionsPerWeek: 2.5, targetWeeks: 12 });
  assert.equal(rows[0].freshSessions, 30);
  assert.equal(rows[0].freshWeeks, 12);
  assert.equal(rows[0].sustainsTarget, true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test scripts/test-progression-pacing.mjs`
Expected: FAIL with "report needs a pacingRows export"

- [ ] **Step 3: Write the implementation**

```js
// scripts/report-progression-pacing.mjs
// Reports how long the current bank sustains fresh questions per age band.
// This is the signal for when there is enough content to raise the pacing
// target, and which bands are starving.
import { readBankFiles } from '../tools/experimental-bank-files.mjs';

export const PACING_DEFAULTS = Object.freeze({ questionsPerSession: 10, sessionsPerWeek: 2.5, targetWeeks: 12 });

export function pacingRows(bank, options = {}) {
  const { questionsPerSession, sessionsPerWeek, targetWeeks } = { ...PACING_DEFAULTS, ...options };
  const byAge = new Map();
  for (const scenario of bank) {
    const row = byAge.get(scenario.ageBand) || { ageBand: scenario.ageBand, scenarios: 0, questions: 0 };
    row.scenarios += 1;
    row.questions += scenario.questions.length;
    byAge.set(scenario.ageBand, row);
  }
  return [...byAge.values()].map(row => {
    const freshSessions = Math.floor(row.questions / questionsPerSession);
    const freshWeeks = Math.floor(freshSessions / sessionsPerWeek);
    return { ...row, freshSessions, freshWeeks, sustainsTarget: freshWeeks >= targetWeeks };
  }).sort((a, b) => a.ageBand.localeCompare(b.ageBand));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const { bank } = readBankFiles();
  const rows = pacingRows(bank);
  console.log(`Pacing at ${PACING_DEFAULTS.questionsPerSession} questions/session, ${PACING_DEFAULTS.sessionsPerWeek} sessions/week, target ${PACING_DEFAULTS.targetWeeks} weeks:\n`);
  for (const row of rows) {
    console.log(`  ${row.ageBand.padEnd(4)} ${String(row.questions).padStart(4)} questions  ${String(row.freshSessions).padStart(3)} sessions  ~${String(row.freshWeeks).padStart(2)} weeks  ${row.sustainsTarget ? 'ok' : 'SHORT'}`);
  }
  const short = rows.filter(row => !row.sustainsTarget).map(row => row.ageBand);
  console.log(short.length ? `\nBands short of target: ${short.join(', ')}` : '\nAll bands sustain the target.');
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/test-progression-pacing.mjs`
Expected: PASS

- [ ] **Step 5: Add the npm script**

In `package.json`, beside the other `report:` entries:

```json
    "report:progression-pacing": "node scripts/report-progression-pacing.mjs",
```

- [ ] **Step 6: Run it against real content**

Run: `npm run report:progression-pacing`
Expected: a table of six bands. U9 and U18 should report SHORT at a 12 week target. Record the actual output in the commit message.

- [ ] **Step 7: Commit**

```bash
git add scripts/report-progression-pacing.mjs scripts/test-progression-pacing.mjs package.json
git commit -m "feat(content): add progression pacing report"
```

---

### Task 3: World unlock core

**Files:**
- Create: `src/one-on-one/worldUnlockCore.js`
- Test: `src/one-on-one/worldUnlockCore.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `WORLD_ORDER: string[]`
  - `CHALLENGE_UNLOCK_THRESHOLD: 5`, `CHALLENGE_SIZE: 5`
  - `emptyUnlockProgress(): {version:1, seen:{}, passed:[]}`
  - `challengePassBar(questionCount): number`
  - `unlockedWorlds(progress, availability): string[]`
  - `challengeStatus(progress, availability, worldId): {available, seen, needed, size, passBar}`
  - `recordSeen(progress, worldId, questionId): progress`
  - `recordChallengeResult(progress, worldId, correct, total): {progress, passed}`
  - `availability` is `{ [worldId]: questionCount }`

- [ ] **Step 1: Write the failing test**

```js
// src/one-on-one/worldUnlockCore.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./worldUnlockCore.js', import.meta.url);
const core = existsSync(modulePath) ? await import(modulePath.href) : {};
const require = () => assert.equal(typeof core.unlockedWorlds, 'function', 'world unlocking needs a pure core');

const FULL = { 'skating-movement': 40, 'puck-skills': 40, 'hockey-sense': 40, 'offensive-play': 40, 'defensive-play': 40, 'transition-compete': 40 };

test('only the first world is open on a fresh profile', () => {
  require();
  assert.deepEqual(core.unlockedWorlds(core.emptyUnlockProgress(), FULL), ['skating-movement']);
});

test('the challenge opens only after five distinct questions in that world', () => {
  let progress = core.emptyUnlockProgress();
  for (const id of ['q1', 'q2', 'q3', 'q4']) progress = core.recordSeen(progress, 'skating-movement', id);
  assert.equal(core.challengeStatus(progress, FULL, 'skating-movement').available, false);
  progress = core.recordSeen(progress, 'skating-movement', 'q5');
  const status = core.challengeStatus(progress, FULL, 'skating-movement');
  assert.equal(status.available, true);
  assert.equal(status.seen, 5);
  assert.equal(status.passBar, 4);
});

test('repeating one question never opens the challenge', () => {
  let progress = core.emptyUnlockProgress();
  for (let i = 0; i < 10; i += 1) progress = core.recordSeen(progress, 'skating-movement', 'same');
  assert.equal(core.challengeStatus(progress, FULL, 'skating-movement').seen, 1);
  assert.equal(core.challengeStatus(progress, FULL, 'skating-movement').available, false);
});

test('passing a challenge opens the next world and only the next', () => {
  let progress = core.emptyUnlockProgress();
  const result = core.recordChallengeResult(progress, 'skating-movement', 4, 5);
  assert.equal(result.passed, true);
  assert.deepEqual(core.unlockedWorlds(result.progress, FULL), ['skating-movement', 'puck-skills']);
});

test('failing a challenge opens nothing and never revokes', () => {
  let progress = core.recordChallengeResult(core.emptyUnlockProgress(), 'skating-movement', 4, 5).progress;
  const failed = core.recordChallengeResult(progress, 'puck-skills', 2, 5);
  assert.equal(failed.passed, false);
  assert.deepEqual(core.unlockedWorlds(failed.progress, FULL), ['skating-movement', 'puck-skills']);
});

test('a world with fewer than five questions uses an all-but-one bar', () => {
  assert.equal(core.challengePassBar(5), 4);
  assert.equal(core.challengePassBar(4), 3);
  assert.equal(core.challengePassBar(2), 1);
  assert.equal(core.challengePassBar(1), 1);
});

test('a small world opens its challenge once every available question is seen', () => {
  const availability = { ...FULL, 'skating-movement': 3 };
  let progress = core.emptyUnlockProgress();
  for (const id of ['q1', 'q2']) progress = core.recordSeen(progress, 'skating-movement', id);
  assert.equal(core.challengeStatus(progress, availability, 'skating-movement').available, false);
  progress = core.recordSeen(progress, 'skating-movement', 'q3');
  const status = core.challengeStatus(progress, availability, 'skating-movement');
  assert.equal(status.available, true);
  assert.equal(status.size, 3);
  assert.equal(status.passBar, 2);
});

test('a world with no questions at this band cannot gate and is skipped', () => {
  const availability = { ...FULL, 'puck-skills': 0 };
  const progress = core.recordChallengeResult(core.emptyUnlockProgress(), 'skating-movement', 4, 5).progress;
  assert.deepEqual(core.unlockedWorlds(progress, availability), ['skating-movement', 'puck-skills', 'hockey-sense']);
});

test('at least one world is open even with no content anywhere', () => {
  const empty = Object.fromEntries(core.WORLD_ORDER.map(id => [id, 0]));
  assert.ok(core.unlockedWorlds(core.emptyUnlockProgress(), empty).length >= 1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/one-on-one/worldUnlockCore.test.mjs`
Expected: FAIL with "world unlocking needs a pure core"

- [ ] **Step 3: Write the implementation**

```js
// src/one-on-one/worldUnlockCore.js
// Pure world unlock rules. No React, no storage: callers pass the persisted
// progress object in and store whatever comes back.
//
// A world opens when the previous world's challenge is passed. A world with no
// questions at the current age band cannot act as a gate, so it is skipped
// rather than dead-ending the chain; content coverage is genuinely uneven
// across bands.

export const WORLD_ORDER = Object.freeze([
  'skating-movement', 'puck-skills', 'hockey-sense',
  'offensive-play', 'defensive-play', 'transition-compete',
]);

export const CHALLENGE_UNLOCK_THRESHOLD = 5;
export const CHALLENGE_SIZE = 5;

export function emptyUnlockProgress() { return { version: 1, seen: {}, passed: [] }; }

const seenIn = (progress, worldId) => progress?.seen?.[worldId] || [];

export function challengePassBar(questionCount) {
  return Math.max(1, questionCount - 1);
}

export function challengeStatus(progress, availability, worldId) {
  const available = Number(availability?.[worldId]) || 0;
  const size = Math.min(CHALLENGE_SIZE, available);
  const needed = Math.min(CHALLENGE_UNLOCK_THRESHOLD, available);
  const seen = seenIn(progress, worldId).length;
  return { available: available > 0 && seen >= needed, seen, needed, size, passBar: challengePassBar(size) };
}

export function recordSeen(progress, worldId, questionId) {
  const current = seenIn(progress, worldId);
  if (current.includes(questionId)) return progress;
  return { ...progress, seen: { ...progress.seen, [worldId]: [...current, questionId] } };
}

export function recordChallengeResult(progress, worldId, correct, total) {
  const passed = correct >= challengePassBar(total);
  if (!passed || progress.passed.includes(worldId)) return { progress, passed };
  return { progress: { ...progress, passed: [...progress.passed, worldId] }, passed };
}

export function unlockedWorlds(progress, availability) {
  const unlocked = [WORLD_ORDER[0]];
  for (let index = 0; index < WORLD_ORDER.length - 1; index += 1) {
    const current = WORLD_ORDER[index];
    const hasContent = (Number(availability?.[current]) || 0) > 0;
    // A world without content cannot be a gate, so it never blocks the chain.
    if (progress?.passed?.includes(current) || !hasContent) unlocked.push(WORLD_ORDER[index + 1]);
    else break;
  }
  return unlocked;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/one-on-one/worldUnlockCore.test.mjs`
Expected: PASS, 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/one-on-one/worldUnlockCore.js src/one-on-one/worldUnlockCore.test.mjs
git commit -m "feat(progression): add pure world unlock core"
```

---

### Task 4: Comprehension check core

**Files:**
- Create: `src/one-on-one/comprehensionCheckCore.js`
- Test: `src/one-on-one/comprehensionCheckCore.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `CHECK_SIZE: 10`, `CHECK_DUE_ITEMS: 8`
  - `emptyCheckState(): {version:1, lastPassedAt:null, due:false, failedConcepts:[]}`
  - `checkPassBar(count): number`
  - `isCheckDue(state, dueItemCount): boolean`
  - `composeCheck(learned, size): string[]` where `learned` is `[{questionId, conceptId, weak:boolean, dueAt:number}]`
  - `recordCheckResult(state, {correct, total, missedConcepts, now}): {state, passed}`
  - `advancementBlocked(state): boolean`

- [ ] **Step 1: Write the failing test**

```js
// src/one-on-one/comprehensionCheckCore.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./comprehensionCheckCore.js', import.meta.url);
const core = existsSync(modulePath) ? await import(modulePath.href) : {};
const require = () => assert.equal(typeof core.isCheckDue, 'function', 'comprehension checks need a pure core');

test('a check comes due on accumulated due items, not a session count', () => {
  require();
  const state = core.emptyCheckState();
  assert.equal(core.isCheckDue(state, 7), false);
  assert.equal(core.isCheckDue(state, 8), true);
});

test('a fresh profile never blocks advancement', () => {
  assert.equal(core.advancementBlocked(core.emptyCheckState()), false);
});

test('a due check blocks advancement until passed', () => {
  let state = { ...core.emptyCheckState(), due: true };
  assert.equal(core.advancementBlocked(state), true);
  const passed = core.recordCheckResult(state, { correct: 8, total: 10, missedConcepts: [], now: 1000 });
  assert.equal(passed.passed, true);
  assert.equal(core.advancementBlocked(passed.state), false);
  assert.equal(passed.state.lastPassedAt, 1000);
});

test('failing keeps the block and records the missed concepts for review', () => {
  const state = { ...core.emptyCheckState(), due: true };
  const failed = core.recordCheckResult(state, { correct: 5, total: 10, missedConcepts: ['scanning', 'passing'], now: 1000 });
  assert.equal(failed.passed, false);
  assert.equal(core.advancementBlocked(failed.state), true);
  assert.deepEqual(failed.state.failedConcepts, ['scanning', 'passing']);
});

test('the pass bar is all but two with a floor of one', () => {
  assert.equal(core.checkPassBar(10), 8);
  assert.equal(core.checkPassBar(6), 4);
  assert.equal(core.checkPassBar(2), 1);
  assert.equal(core.checkPassBar(1), 1);
});

test('composition prefers weak and due items, and never repeats a question', () => {
  const learned = [
    { questionId: 'a', conceptId: 'c1', weak: false, dueAt: 500 },
    { questionId: 'b', conceptId: 'c2', weak: true, dueAt: 900 },
    { questionId: 'c', conceptId: 'c3', weak: false, dueAt: 100 },
    { questionId: 'd', conceptId: 'c4', weak: true, dueAt: 200 },
  ];
  const picked = core.composeCheck(learned, 2);
  assert.equal(picked.length, 2);
  assert.equal(new Set(picked).size, 2);
  assert.ok(picked.includes('d'), 'weak and most overdue should be picked first');
  assert.ok(picked.includes('b'), 'the other weak item should come before non-weak ones');
});

test('composition returns everything when fewer learned items exist than the size', () => {
  const learned = [{ questionId: 'a', conceptId: 'c1', weak: false, dueAt: 1 }];
  assert.deepEqual(core.composeCheck(learned, 10), ['a']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/one-on-one/comprehensionCheckCore.test.mjs`
Expected: FAIL with "comprehension checks need a pure core"

- [ ] **Step 3: Write the implementation**

```js
// src/one-on-one/comprehensionCheckCore.js
// Recurring cumulative retention check. Distinct from the per-world challenge:
// the challenge asks "have you learned this world" and opens the next one; this
// asks "does it still stick" and blocks new territory only.
//
// Due-ness comes from how many previously learned items have come due under the
// spaced schedule, not from a session counter, because retention decays with
// time rather than with sessions.

export const CHECK_SIZE = 10;
export const CHECK_DUE_ITEMS = 8;

export function emptyCheckState() { return { version: 1, lastPassedAt: null, due: false, failedConcepts: [] }; }

export function checkPassBar(count) { return Math.max(1, count - 2); }

export function isCheckDue(state, dueItemCount) {
  return state?.due === true || (Number(dueItemCount) || 0) >= CHECK_DUE_ITEMS;
}

export function advancementBlocked(state) { return state?.due === true; }

export function composeCheck(learned, size = CHECK_SIZE) {
  const ranked = [...learned].sort((a, b) => (Number(b.weak) - Number(a.weak)) || (a.dueAt - b.dueAt));
  return ranked.slice(0, Math.min(size, ranked.length)).map(item => item.questionId);
}

export function recordCheckResult(state, { correct, total, missedConcepts = [], now }) {
  const passed = correct >= checkPassBar(total);
  return {
    passed,
    state: passed
      ? { ...state, due: false, failedConcepts: [], lastPassedAt: now }
      : { ...state, due: true, failedConcepts: [...missedConcepts] },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/one-on-one/comprehensionCheckCore.test.mjs`
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/one-on-one/comprehensionCheckCore.js src/one-on-one/comprehensionCheckCore.test.mjs
git commit -m "feat(progression): add pure comprehension check core"
```

---

### Task 5: Progressive disclosure core

**Files:**
- Create: `src/player/disclosureCore.js`
- Test: `src/player/disclosureCore.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `SESSION_GAP_MS: 1800000`
  - `DISCLOSURE_LADDER: [{session, features:[]}]`
  - `emptyDisclosureState(): {version:1, sessions:0, lastSessionAt:null}`
  - `recordAnsweredQuestion(state, now): state`
  - `visibleFeatures(state, {showEverything}): Set<string>`
  - Feature ids: `progress`, `stars`, `brain`, `play`, `training`, `goals`, `library`, `guided`, `discover`

- [ ] **Step 1: Write the failing test**

```js
// src/player/disclosureCore.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./disclosureCore.js', import.meta.url);
const core = existsSync(modulePath) ? await import(modulePath.href) : {};
const require = () => assert.equal(typeof core.visibleFeatures, 'function', 'disclosure needs a pure core');

const MINUTE = 60_000;

test('a visit with no answered question never counts', () => {
  require();
  const state = core.emptyDisclosureState();
  assert.equal(state.sessions, 0);
  assert.equal(core.visibleFeatures(state, {}).size, 0);
});

test('answering counts one session, and repeat answers inside the gap do not add more', () => {
  let state = core.recordAnsweredQuestion(core.emptyDisclosureState(), 0);
  assert.equal(state.sessions, 1);
  state = core.recordAnsweredQuestion(state, 5 * MINUTE);
  assert.equal(state.sessions, 1, 'same sitting stays one session');
  state = core.recordAnsweredQuestion(state, 40 * MINUTE);
  assert.equal(state.sessions, 2, 'a gap over thirty minutes starts a new session');
});

test('features arrive on their ladder step and never disappear', () => {
  let state = core.emptyDisclosureState();
  let now = 0;
  const advance = () => { now += 40 * MINUTE; state = core.recordAnsweredQuestion(state, now); };
  advance();
  assert.ok(core.visibleFeatures(state, {}).has('progress'));
  assert.ok(!core.visibleFeatures(state, {}).has('brain'));
  advance(); advance();
  const atThree = core.visibleFeatures(state, {});
  assert.ok(atThree.has('brain') && atThree.has('play'));
  assert.ok(atThree.has('progress'), 'earlier reveals persist');
});

test('the show-everything switch reveals all features immediately', () => {
  const visible = core.visibleFeatures(core.emptyDisclosureState(), { showEverything: true });
  for (const id of ['progress', 'stars', 'brain', 'play', 'training', 'goals', 'library', 'guided', 'discover']) {
    assert.ok(visible.has(id), `${id} should be visible`);
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/player/disclosureCore.test.mjs`
Expected: FAIL with "disclosure needs a pure core"

- [ ] **Step 3: Write the implementation**

```js
// src/player/disclosureCore.js
// Peripheral features appear across the first several real sessions rather than
// all at once. A session only counts when a question was actually answered:
// counting raw app opens would reveal "See your progress" to a player who has
// answered nothing, and would let the whole interface be unlocked in an
// afternoon without learning anything.

export const SESSION_GAP_MS = 30 * 60 * 1000;

export const DISCLOSURE_LADDER = Object.freeze([
  { session: 1, features: ['progress'] },
  { session: 2, features: ['stars'] },
  { session: 3, features: ['brain', 'play'] },
  { session: 4, features: ['training'] },
  { session: 5, features: ['goals'] },
  { session: 6, features: ['library', 'guided', 'discover'] },
]);

export const ALL_FEATURES = Object.freeze(DISCLOSURE_LADDER.flatMap(step => step.features));

export function emptyDisclosureState() { return { version: 1, sessions: 0, lastSessionAt: null }; }

export function recordAnsweredQuestion(state, now) {
  const last = state?.lastSessionAt;
  const isNewSession = last === null || last === undefined || (now - last) >= SESSION_GAP_MS;
  return isNewSession
    ? { ...state, sessions: (state.sessions || 0) + 1, lastSessionAt: now }
    : { ...state, lastSessionAt: now };
}

export function visibleFeatures(state, { showEverything = false } = {}) {
  if (showEverything) return new Set(ALL_FEATURES);
  const sessions = state?.sessions || 0;
  return new Set(DISCLOSURE_LADDER.filter(step => sessions >= step.session).flatMap(step => step.features));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/player/disclosureCore.test.mjs`
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/player/disclosureCore.js src/player/disclosureCore.test.mjs
git commit -m "feat(progression): add pure progressive disclosure core"
```

---

### Task 6: Progression storage adapters

**Files:**
- Create: `src/player/progressionStorage.js`
- Test: `src/player/progressionStorage.test.mjs`

**Interfaces:**
- Consumes: `emptyUnlockProgress` (Task 3), `emptyCheckState` (Task 4), `emptyDisclosureState` (Task 5), `lsGetJSON`/`lsSet` from `src/utils/storage.js`
- Produces:
  - `unlockStorageKey(playerId, ageBand): string`
  - `checkStorageKey(playerId, ageBand): string`
  - `disclosureStorageKey(playerId): string`
  - `readUnlockProgress(raw)`, `readCheckState(raw)`, `readDisclosureState(raw)` — each takes a raw string and returns a valid object, falling back to empty on corrupt input

- [ ] **Step 1: Write the failing test**

```js
// src/player/progressionStorage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./progressionStorage.js', import.meta.url);
const store = existsSync(modulePath) ? await import(modulePath.href) : {};
const require = () => assert.equal(typeof store.unlockStorageKey, 'function', 'progression needs storage adapters');

test('unlock and check state are keyed per player and per age band', () => {
  require();
  assert.notEqual(store.unlockStorageKey('p1', 'U9'), store.unlockStorageKey('p1', 'U11'));
  assert.notEqual(store.unlockStorageKey('p1', 'U9'), store.unlockStorageKey('p2', 'U9'));
  assert.notEqual(store.checkStorageKey('p1', 'U9'), store.checkStorageKey('p1', 'U11'));
});

test('disclosure is keyed per player only, so aging up does not re-onboard', () => {
  assert.equal(store.disclosureStorageKey('p1'), store.disclosureStorageKey('p1'));
  assert.notEqual(store.disclosureStorageKey('p1'), store.disclosureStorageKey('p2'));
  assert.ok(!store.disclosureStorageKey('p1').includes('U9'));
});

test('player ids are encoded so an odd id cannot break the key', () => {
  assert.ok(store.unlockStorageKey('a b/c', 'U9').includes(encodeURIComponent('a b/c')));
});

test('corrupt stored values fall back to empty state rather than throwing', () => {
  assert.deepEqual(store.readUnlockProgress('not json').passed, []);
  assert.deepEqual(store.readCheckState('{{{').failedConcepts, []);
  assert.equal(store.readDisclosureState(null).sessions, 0);
});

test('valid stored values round-trip', () => {
  const raw = JSON.stringify({ version: 1, seen: { 'puck-skills': ['q1'] }, passed: ['skating-movement'] });
  assert.deepEqual(store.readUnlockProgress(raw).passed, ['skating-movement']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/player/progressionStorage.test.mjs`
Expected: FAIL with "progression needs storage adapters"

- [ ] **Step 3: Write the implementation**

```js
// src/player/progressionStorage.js
// Thin storage adapters for progression state. Keys follow the existing shape
// used by masteryStorageKey. Unlock and check state are per age band because a
// new band is a fresh progression; disclosure is per player only, because
// onboarding is about the person and aging up should not re-introduce the
// interface.
import { emptyUnlockProgress } from '../one-on-one/worldUnlockCore.js';
import { emptyCheckState } from '../one-on-one/comprehensionCheckCore.js';
import { emptyDisclosureState } from './disclosureCore.js';

const id = value => encodeURIComponent(value || 'practice-preview');

export const unlockStorageKey = (playerId, ageBand) => `rinkreads_world_unlock_v1:${id(playerId)}:${ageBand}`;
export const checkStorageKey = (playerId, ageBand) => `rinkreads_comprehension_v1:${id(playerId)}:${ageBand}`;
export const disclosureStorageKey = playerId => `rinkreads_disclosure_v1:${id(playerId)}`;

function parse(raw, fallback) {
  if (!raw) return fallback();
  try {
    const value = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value) ? { ...fallback(), ...value } : fallback();
  } catch { return fallback(); }
}

export const readUnlockProgress = raw => parse(raw, emptyUnlockProgress);
export const readCheckState = raw => parse(raw, emptyCheckState);
export const readDisclosureState = raw => parse(raw, emptyDisclosureState);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/player/progressionStorage.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/player/progressionStorage.js src/player/progressionStorage.test.mjs
git commit -m "feat(progression): add progression storage adapters"
```

---

### Task 7: World session sequencing core

What the single Start button serves next.

**Files:**
- Create: `src/one-on-one/worldSessionCore.js`
- Test: `src/one-on-one/worldSessionCore.test.mjs`

**Interfaces:**
- Consumes: `selectPracticeQuestions` from `src/one-on-one/practiceQuestionSelection.js`
- Produces: `nextInWorld({worldScenarios, seenQuestionIds, metConceptIds})` → `{kind:'teach', conceptId}` or `{kind:'question', scenario, question}` or `{kind:'review'}`

- [ ] **Step 1: Write the failing test**

```js
// src/one-on-one/worldSessionCore.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = new URL('./worldSessionCore.js', import.meta.url);
const core = existsSync(modulePath) ? await import(modulePath.href) : {};
const require = () => assert.equal(typeof core.nextInWorld, 'function', 'the Start flow needs a pure sequencer');

const scenario = (id, conceptId, questionIds) => ({
  id, conceptId, version: 1,
  questions: questionIds.map(qid => ({ id: qid, type: 'choice' })),
});

test('an unmet concept is taught before its questions are asked', () => {
  require();
  const next = core.nextInWorld({
    worldScenarios: [scenario('s1', 'scanning', ['q1', 'q2'])],
    seenQuestionIds: [], metConceptIds: [],
  });
  assert.deepEqual(next, { kind: 'teach', conceptId: 'scanning' });
});

test('once the concept is met, an unseen question is served', () => {
  const next = core.nextInWorld({
    worldScenarios: [scenario('s1', 'scanning', ['q1', 'q2'])],
    seenQuestionIds: [], metConceptIds: ['scanning'],
  });
  assert.equal(next.kind, 'question');
  assert.equal(next.question.id, 'q1');
  assert.equal(next.scenario.id, 's1');
});

test('seen questions are skipped in favour of unseen ones', () => {
  const next = core.nextInWorld({
    worldScenarios: [scenario('s1', 'scanning', ['q1', 'q2'])],
    seenQuestionIds: ['q1'], metConceptIds: ['scanning'],
  });
  assert.equal(next.question.id, 'q2');
});

test('when everything has been seen the sequencer asks for review, never a dead end', () => {
  const next = core.nextInWorld({
    worldScenarios: [scenario('s1', 'scanning', ['q1'])],
    seenQuestionIds: ['q1'], metConceptIds: ['scanning'],
  });
  assert.deepEqual(next, { kind: 'review' });
});

test('an empty world asks for review rather than throwing', () => {
  assert.deepEqual(core.nextInWorld({ worldScenarios: [], seenQuestionIds: [], metConceptIds: [] }), { kind: 'review' });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/one-on-one/worldSessionCore.test.mjs`
Expected: FAIL with "the Start flow needs a pure sequencer"

- [ ] **Step 3: Write the implementation**

```js
// src/one-on-one/worldSessionCore.js
// Decides what the single Start button serves next inside a world. Composes with
// selectPracticeQuestions, which chooses questions *within* one scenario; picking
// which scenario comes next is this module's job.
//
// Running out of fresh material returns {kind:'review'} rather than nothing, so
// the UI can shift to honest review framing instead of showing a dead end.
import { selectPracticeQuestions } from './practiceQuestionSelection.js';

export function nextInWorld({ worldScenarios = [], seenQuestionIds = [], metConceptIds = [] }) {
  const seen = new Set(seenQuestionIds);
  const met = new Set(metConceptIds);
  for (const scenario of worldScenarios) {
    const questions = selectPracticeQuestions(scenario);
    const unseen = questions.filter(question => !seen.has(question.id));
    if (!unseen.length) continue;
    if (scenario.conceptId && !met.has(scenario.conceptId)) return { kind: 'teach', conceptId: scenario.conceptId };
    return { kind: 'question', scenario, question: unseen[0] };
  }
  return { kind: 'review' };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/one-on-one/worldSessionCore.test.mjs`
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/one-on-one/worldSessionCore.js src/one-on-one/worldSessionCore.test.mjs
git commit -m "feat(progression): add world session sequencer"
```

---

### Task 8: Home page restructure

**Files:**
- Modify: `src/player/playerLearningHomeCore.js:7-14` (`HOME_ACTIONS`)
- Modify: `src/player/PlayerLearningHome.jsx:25-26` (default selection), `:36` (hero actions), `:51-53` (world grid), `:60` (action grid)
- Modify: `src/player/PlayerLearningHome.css`
- Test: `src/player/playerLearningHome.test.mjs` (create)

**Interfaces:**
- Consumes: `unlockedWorlds` (Task 3), `visibleFeatures` (Task 5), `readUnlockProgress`/`unlockStorageKey` (Task 6)
- Produces: `HOME_ACTIONS` without `learn`, `practice` or `experimental` entries

- [ ] **Step 1: Write the failing test**

```js
// src/player/playerLearningHome.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { HOME_ACTIONS } from './playerLearningHomeCore.js';

test('the home action grid no longer duplicates the world path or exposes experimental scenarios', () => {
  const ids = HOME_ACTIONS.map(action => action.id);
  assert.ok(!ids.includes('learn'), 'learn is now inside a world');
  assert.ok(!ids.includes('practice'), 'practice is now inside a world');
  assert.ok(!ids.includes('experimental'), 'experimental scenarios are part of the in-world mix');
  assert.deepEqual(ids, ['goals', 'training', 'progress']);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/player/playerLearningHome.test.mjs`
Expected: FAIL, ids still contain learn/practice/experimental

- [ ] **Step 3: Trim HOME_ACTIONS**

Replace `src/player/playerLearningHomeCore.js` lines 7 to 14 with:

```js
// Learn and practice are no longer destinations: they are steps inside a world,
// reached from the worlds grid. Experimental scenarios are part of the in-world
// question mix rather than a separate place a player chooses to go.
export const HOME_ACTIONS = [
  { id: 'goals', title: 'Set a hockey goal', description: 'Choose something to work on and keep your plan close.', icon: 'goal' },
  { id: 'training', title: 'Log your training', description: 'Keep track of practices, games and extra work.', icon: 'calendar' },
  { id: 'progress', title: 'See your progress', description: 'Look back at your recorded reads and practice.', icon: 'progress' },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/player/playerLearningHome.test.mjs`
Expected: PASS

- [ ] **Step 5: Remove the hero buttons**

In `src/player/PlayerLearningHome.jsx`, delete the `plh-hero-actions` div on line 36 entirely. The hero keeps its eyebrow, heading and intro paragraph.

- [ ] **Step 6: Default the selected world to the first unlocked one**

Replace lines 25 to 26 with:

```jsx
  const unlocked = unlockedWorlds(unlockProgress, availability);
  const [selection, setSelection] = useState({ playerId: model.playerId, worldId: unlocked[0] });
  const world = worlds.find(item => item.id === (selection.playerId === model.playerId ? selection.worldId : unlocked[0])) || worlds[0];
```

Add at the top of the file:

```jsx
import { unlockedWorlds } from '../one-on-one/worldUnlockCore.js';
```

`unlockProgress` and `availability` are passed in as props by the parent (wired in Task 9); default them to `emptyUnlockProgress()` and `{}` so the component still renders standalone.

- [ ] **Step 7: Render locked worlds**

Replace the world grid button on line 51 so a locked world is disabled and states its condition. A locked world keeps its art and name, dimmed, and always names the next step, because a bare locked box is annoying whereas a locked box that tells you what opens it is motivating.

```jsx
{worlds.map(item => {
  const isUnlocked = unlocked.includes(item.id);
  const previous = WORLD_ORDER[WORLD_ORDER.indexOf(item.id) - 1];
  const previousName = worlds.find(world => world.id === previous)?.name || 'the previous world';
  return <button type="button" className={`plh-world plh-glass${item.id === world.id ? ' is-selected' : ''}${isUnlocked ? '' : ' is-locked'}`}
    style={worldStyle(item)} key={item.id} data-world-id={item.id} disabled={!isUnlocked}
    aria-pressed={item.id === world.id} aria-controls={regionId}
    onClick={() => setSelection({ playerId: model.playerId, worldId: item.id })}>
    <span className="plh-world-art" aria-hidden="true" />
    <span className="plh-world-copy">
      <span className="plh-domain">{item.domainName}</span><strong>{item.name}</strong>
      <span className="plh-world-description">{isUnlocked ? item.subtitle : `Pass the ${previousName} challenge to open this.`}</span>
      <span className="plh-world-foot">{isUnlocked ? (item.missions.length ? `${item.missions.length} learning focuses` : `${band} foundations`) : 'Locked'}
        <span>{isUnlocked ? (item.id === world.id ? 'Selected' : 'Explore') : '🔒'} <span aria-hidden="true">↗</span></span></span>
    </span>
  </button>;
})}
```

Import `WORLD_ORDER` alongside `unlockedWorlds`.

- [ ] **Step 8: Gate the action grid and the other-ways nav on disclosure**

On line 60, filter `HOME_ACTIONS` by visible features, and do the same for the `plh-other-ways` nav on line 61:

```jsx
{HOME_ACTIONS.filter(action => visible.has(action.id)).map(action => ...
```

```jsx
{[['play', 'Play'], ['brain', 'Brain Gym'], ['quiz', 'Take a quiz']].filter(([id]) => visible.has(id) || id === 'quiz').map(...
```

`visible` is a `Set` passed in as a prop, defaulting to a set containing everything so the component renders standalone.

- [ ] **Step 9: Add locked styling**

Append to `src/player/PlayerLearningHome.css`:

```css
.plh-root .plh-world.is-locked{opacity:.55;cursor:default}
.plh-root .plh-world.is-locked:hover{border-color:var(--plh-border,#ffffff29);transform:none}
.plh-root .plh-world.is-locked .plh-world-art{filter:grayscale(.6)}
```

- [ ] **Step 10: Verify**

```bash
npm run test:practice
npm run build
```

Expected: suite green, build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/player/
git commit -m "feat(home): make the worlds grid the entry point with locked states"
```

---

### Task 9: World mode in Practice Arena

**Files:**
- Modify: `src/one-on-one/PracticeHub.jsx:19` (TABS), `:29-43` (component and header)
- Test: `src/one-on-one/practiceHubWorldMode.test.mjs` (create)

**Interfaces:**
- Consumes: `initialHubNavigation` (existing, line 20), `nextInWorld` (Task 7)
- Produces: `isWorldMode(navigation): boolean`, exported from `PracticeHub.jsx`

- [ ] **Step 1: Write the failing test**

```js
// src/one-on-one/practiceHubWorldMode.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { initialHubNavigation, isWorldMode } from './PracticeHub.jsx';

test('a world param puts the hub in world mode', () => {
  const navigation = initialHubNavigation('?arena=worlds&age=U9&world=offensive-play');
  assert.equal(navigation.worldId, 'offensive-play');
  assert.equal(isWorldMode(navigation), true);
});

test('without a world param the hub stays in its normal tabbed mode', () => {
  assert.equal(isWorldMode(initialHubNavigation('?arena=worlds&age=U9')), false);
});

test('an unknown world id is ignored rather than trusted', () => {
  assert.equal(isWorldMode(initialHubNavigation('?arena=worlds&world=not-a-world')), false);
});
```

Note: this test imports a `.jsx` file. If the runner cannot parse JSX, move `isWorldMode` into `worldSessionCore.js` instead and import it from there, adjusting this test's import path. Prefer that if it fails.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/one-on-one/practiceHubWorldMode.test.mjs`
Expected: FAIL, `isWorldMode` is not exported

- [ ] **Step 3: Add the predicate**

In `src/one-on-one/PracticeHub.jsx`, after `initialHubNavigation`:

```jsx
// A world in context turns the arena into that world: the tab bar is hidden and
// the player gets one Start flow, rather than choosing among five tabs and their
// sub-navigations.
export function isWorldMode(navigation) { return Boolean(navigation?.worldId); }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/one-on-one/practiceHubWorldMode.test.mjs`
Expected: PASS

- [ ] **Step 5: Hide the tab bar in world mode**

Replace the `<nav aria-label="RinkReads arena">` inside the header on line 43 so it renders only when not in world mode, and show the world name instead:

```jsx
{worldMode
  ? <span className="pf-world-name">{JOURNEY_WORLDS[navigation.worldId]?.name}</span>
  : <nav aria-label="RinkReads arena">{TABS.map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setError('')}}>{label}</button>)}</nav>}
```

Add `const worldMode = isWorldMode(navigation);` beside `const tab = navigation.tab;` on line 32.

- [ ] **Step 6: Render the single Start flow in world mode**

Before the existing `{tab==='practice'&&...}` block, add a world-mode branch that short-circuits the tab rendering:

```jsx
{worldMode
  ? <WorldSession playerId={player?.id||'practice-preview'} ageBand={learningAge} worldId={navigation.worldId} />
  : <>{/* existing tab blocks stay exactly as they are, moved inside this fragment */}</>}
```

Create `src/one-on-one/WorldSession.jsx` holding the Start button and the flow driven by `nextInWorld`. It renders `ReadSequence`, `ScenarioWorkshop`, `GuidedCurriculum` or `ExperimentalPractice` depending on what the sequencer returns, so those components are reused rather than rewritten.

- [ ] **Step 7: Verify**

```bash
npm run test:practice
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/one-on-one/
git commit -m "feat(arena): add world mode with a single Start flow"
```

---

### Task 10: World Challenge

**Files:**
- Create: `src/one-on-one/WorldChallenge.jsx`
- Modify: `src/one-on-one/WorldSession.jsx`
- Test: covered by Task 3's core tests plus a build check

**Interfaces:**
- Consumes: `challengeStatus`, `recordChallengeResult` (Task 3)
- Produces: `<WorldChallenge worldId ageBand questions onComplete />`, calling `onComplete({correct, total})`

- [ ] **Step 1: Build the component**

```jsx
// src/one-on-one/WorldChallenge.jsx
// The gate that opens the next world. Retries are unlimited and free with a
// fresh mix each attempt; after two failures the result names the concepts that
// were missed and offers to practice them, because a bare repeated "no" teaches
// a kid nothing.
import { useState } from 'react';
import { challengePassBar } from './worldUnlockCore.js';

export default function WorldChallenge({ worldName, questions, attempts = 0, onComplete, onPracticeConcepts }) {
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState([]);
  const total = questions.length;
  const passBar = challengePassBar(total);
  const done = index >= total;

  function answer(isCorrect, conceptId) {
    if (isCorrect) setCorrect(value => value + 1);
    else setMissed(list => (list.includes(conceptId) ? list : [...list, conceptId]));
    setIndex(value => value + 1);
  }

  if (done) {
    const passed = correct >= passBar;
    return <section className="wc-result" role="status">
      <h2>{passed ? `${worldName} complete.` : 'Not yet.'}</h2>
      <p>{correct} of {total} correct. You need {passBar}.</p>
      {!passed && attempts >= 1 && missed.length > 0 && (
        <>
          <p>These are the reads to work on: {missed.join(', ')}.</p>
          <button type="button" onClick={() => onPracticeConcepts(missed)}>Practice these reads</button>
        </>
      )}
      <button type="button" onClick={() => onComplete({ correct, total })}>{passed ? 'Open the next world' : 'Try again'}</button>
    </section>;
  }

  return <section className="wc-question">
    <p className="wc-progress">Question {index + 1} of {total}</p>
    {/* Render the current question via the existing question components,
        calling answer(isCorrect, conceptId) when the player responds. */}
  </section>;
}
```

- [ ] **Step 2: Wire it into WorldSession**

When `challengeStatus(...).available` is true and the player has not passed that world, offer the challenge as the next thing Start serves. On `onComplete`, call `recordChallengeResult` and persist via the Task 6 adapter.

- [ ] **Step 3: Verify**

```bash
npm run test:practice
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/one-on-one/
git commit -m "feat(progression): add the World Challenge gate"
```

---

### Task 11: Comprehension check flow

**Files:**
- Create: `src/one-on-one/ComprehensionCheck.jsx`
- Modify: `src/one-on-one/WorldSession.jsx`, `src/player/PlayerLearningHome.jsx`

**Interfaces:**
- Consumes: `isCheckDue`, `composeCheck`, `recordCheckResult`, `advancementBlocked` (Task 4)
- Produces: `<ComprehensionCheck questions onComplete />`

- [ ] **Step 1: Build the component**

Mirror `WorldChallenge.jsx` structurally, with the check's own copy: "Let's see what stuck", ten questions, pass bar from `checkPassBar`. On failure it lists the missed concepts and links straight to practising them.

- [ ] **Step 2: Block new territory while due**

In `PlayerLearningHome.jsx`, when `advancementBlocked(checkState)` is true, render locked worlds as locked regardless of unlock progress, with the reason "Pass the check to open new worlds", and surface the check as the primary call to action. Worlds already open stay fully playable, and review is always available. This is the "cannot move forward, never a dead end" rule.

- [ ] **Step 3: Verify**

```bash
npm run test:practice
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat(progression): add recurring comprehension checks"
```

---

### Task 12: World backdrop

**Files:**
- Create: `src/player/worldBackdrop.css`
- Modify: `src/one-on-one/WorldSession.jsx`

**Interfaces:**
- Consumes: the world's `art` index from `JOURNEY_WORLDS`
- Produces: a `.world-backdrop` element positioned by `--wb-art-position`

- [ ] **Step 1: Add the stylesheet**

Reuses the existing sprite and the same positioning math as the world cards, so there is no new asset and no extra image request.

```css
/* src/player/worldBackdrop.css */
/* The world's art, faint, behind in-world question screens only. It sits behind
   the page chrome and never behind the rink board: the rink diagrams are the
   teaching content and must stay fully legible. */
.world-backdrop{position:fixed;inset:0;z-index:-2;pointer-events:none;
  background-image:url('/assets/journey/worlds-v1.png');
  background-size:300% 200%;background-position:var(--wb-art-position);
  background-repeat:no-repeat;opacity:.10}
.world-backdrop::after{content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,#0a1930d9,#0a1930f2)}
@media (prefers-reduced-transparency:reduce){.world-backdrop{display:none}}
```

- [ ] **Step 2: Render it in world mode only**

In `WorldSession.jsx`:

```jsx
const art = JOURNEY_WORLDS[worldId]?.art ?? 0;
const backdropStyle = { '--wb-art-position': `${(art % 3) * 50}% ${Math.floor(art / 3) * 100}%` };
// ...
<div className="world-backdrop" style={backdropStyle} aria-hidden="true" />
```

Do **not** render it in Brain Gym, Play, Coach Lab or quizzes. The presence of world art is the signal that you are inside a world.

- [ ] **Step 3: Verify legibility on real frames, not by eye**

Start the dev server, enter a world at phone width, and capture frames of a question screen with a rink diagram visible.

```bash
npm run dev
```

Check that the rink board, caption text and answer buttons are all clearly readable. If contrast is marginal, lower `opacity` in steps of `.02` and re-check. **Show the frames for review before treating this task as done.** The opacity number is chosen from what the frames look like, not from what sounds right.

- [ ] **Step 4: Commit**

```bash
git add src/player/worldBackdrop.css src/one-on-one/WorldSession.jsx
git commit -m "feat(worlds): add faint world art backdrop inside worlds"
```

---

### Task 13: Disclosure wiring and the Show everything switch

**Files:**
- Modify: `src/player/PlayerLearningHome.jsx`, `src/App.jsx` (settings area)

**Interfaces:**
- Consumes: `recordAnsweredQuestion`, `visibleFeatures` (Task 5), `disclosureStorageKey`, `readDisclosureState` (Task 6)

- [ ] **Step 1: Record a qualifying session when a question is answered**

Wherever an answer is recorded in the in-world flow, also call `recordAnsweredQuestion(state, Date.now())` and persist it. Only an actual answered question counts; opening the app does not.

- [ ] **Step 2: Pass visible features into the home page**

Read the disclosure state, compute `visibleFeatures(state, { showEverything })`, and pass the resulting `Set` into `PlayerLearningHomeView` as the `visible` prop used in Task 8.

- [ ] **Step 3: Add the settings switch**

In the profile/settings screen, add a checkbox labelled "Show everything", persisted at `rinkreads_show_everything_v1:<playerId>`, default off, described as: "Reveal every activity now instead of unlocking them as you play."

- [ ] **Step 4: Verify**

```bash
npm run test:practice
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat(onboarding): reveal peripheral features across early sessions"
```

---

### Task 14: Final verification

- [ ] **Step 1: Full unit suite**

Run: `npm run test:practice`
Expected: all green, including the new unlock, check, disclosure, storage, sequencer and spelling tests.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: succeeds. This is not optional: the unit suite never parses `App.jsx`.

- [ ] **Step 3: Duplicate declaration sweep**

```bash
grep -oE '^const [A-Za-z0-9_]+ = lazyWithReload' src/App.jsx | awk '{print $2}' | sort | uniq -d
```

Expected: no output.

- [ ] **Step 4: Walk the real flow as a U9 player**

Start the dev server, enter via Dev bypass as U9 / Novice, and confirm: only Frozen Trails is open; the home page shows no Learn or Practice buttons and no Experimental card; entering a world shows one Start button and no tab bar; the backdrop is visible but the rink stays legible; five distinct questions opens the challenge; passing it opens Passing Springs.

- [ ] **Step 5: Pacing report**

Run: `npm run report:progression-pacing`
Record the output. It names which bands need content.

- [ ] **Step 6: Commit any fixes and stop**

Do not push. Report results for review.

---

## Self-review findings (read before executing)

This plan was checked against the spec after writing. Recording what is solid and what
is not, because an executor deserves to know which parts are load bearing.

**Solid and ready to execute: Tasks 1 to 7.** Every step has real test code and real
implementation code, and each pure core is independently testable. These carry the actual
progression rules and can be built and verified without any UI existing.

**Thinner and needing detail before execution: Tasks 8 to 13.** The UI tasks name exact
files and lines and give the key code, but three steps fall short of the standard:
Task 9 Step 6 and Task 10 Step 1 gesture at rendering "via the existing question
components" without showing it, and Task 11 Step 1 says to mirror Task 10 rather than
repeating the code. **Recommendation: execute Tasks 1 to 7 first, then write a second
plan for the UI against the cores that now exist.** The component shapes will be far
easier to specify concretely once `nextInWorld` and `challengeStatus` are real.

**Spec requirements with no task yet, to be covered by that second plan:**

1. **The pacing constant must actually drive mastery requirements.** Task 2 defines
   `targetWeeks` for the report only, which makes it decorative. A shared constants
   module should be the single source both the report and the mastery policy read, so
   raising the target genuinely lengthens the arc. Until that exists, the spec's pacing
   test ("the configured target constant actually drives the mastery requirements rather
   than being decorative") cannot pass.
2. **Review-mode framing when fresh content runs out.** `nextInWorld` returns
   `{kind:'review'}`, but no task builds the honest "You have seen every read here, now
   let's make them stick" presentation. Without it the sequencer's graceful degradation
   has nowhere to land, which is the exact dead end the spec forbids.
3. **Stars on world cards** from the existing mastery record are specified but have no
   task.
4. **Removing Experimental scenarios from the Practice tab sub-navigation**
   (`PracticeHub.jsx:45`) is implied but never made a step. Task 8 only removes it from
   the home action grid.
