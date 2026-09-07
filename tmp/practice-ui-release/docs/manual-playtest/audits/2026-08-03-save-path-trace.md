# Save-path trace — First-Six data loss (S2-SAVE, SHELL-4, SHELL-6)

Static trace of every write behind the First-Six quests, done against the working
tree on 2026-08-03. Read-only: no source file was modified, nothing was run.

Findings sources: [session 1](../2026-08-03-playtest-findings.md) (SHELL-4, SHELL-6),
[session 2](../2026-08-03-playtest-findings-session2.md) (S2-SAVE, S2-4).

---

## Summary

The hypothesis is **directionally right but names the wrong variable**. The dividing
line is not "explicit Save button vs save-on-change" — it is **which store is
authoritative**. `player.selfRatings`, `player.goals` and `player.quizHistory` live
in React state whose only durable home is Supabase; there is no localStorage
write-through anywhere ([`src/App.jsx:8293`](../../../src/App.jsx#L8293),
[`:8301`](../../../src/App.jsx#L8301), [`:8314`](../../../src/App.jsx#L8314) — the
complete list of `setPlayer` call sites contains no persistence). The training log
survived because it writes localStorage **first and synchronously**
([`src/utils/trainingLog.js:29`](../../../src/utils/trainingLog.js#L29)) and treats
Supabase as an un-awaited background dual-write
([`:33-35`](../../../src/utils/trainingLog.js#L33-L35)) that cannot block or fail
the save.

Three defects compound on top of that. (1) Every explicit-save handler `await`s an
**unbounded** Supabase call before `setScreen("home")`, so a stalled request strands
the UI forever — that is SHELL-4 ("Saving…" on skill 6 of 6) and S2-4 ("saving
doesn't take you anywhere") wearing two masks, and it also guarantees the write never
landed. (2) Failures are swallowed by `catch(e){console.error(e)}` and the app then
navigates as if it succeeded, so a lost write is indistinguishable from a good one.
(3) The auth subscriber calls `loadUser` on **every** session-bearing auth event
without filtering by event type ([`src/App.jsx:8156-8162`](../../../src/App.jsx#L8156-L8162)),
and `loadUser` unconditionally replaces `player` with the server copy
([`:8227`](../../../src/App.jsx#L8227)) — so a routine token refresh silently reverts
unsynced local state **without a page reload**.

---

## Per-path table

| Path | Entry point | Where the write goes | Awaited? | On failure | On hang | What the home screen reads back |
|---|---|---|---|---|---|---|
| **Self-ratings (`rate6`)** | [`screens.jsx:1698-1709`](../../../src/screens.jsx#L1698-L1709) → [`App.jsx:8292-8298`](../../../src/App.jsx#L8292-L8298) | React `player.selfRatings` + `self_ratings` upsert ([`supabase.js:383-391`](../../../src/supabase.js#L383-L391)). **No localStorage.** | Yes — `await SB.saveSelfRatings` blocks `setScreen("home")` | `console.error`, then navigates home as if saved. Data exists in React state only until the next `loadUser`. | Button sits on "Saving…" forever (`.finally` at [`screens.jsx:1707`](../../../src/screens.jsx#L1707) never runs). No timeout, no retry, no escape. **SHELL-4.** | `player.selfRatings` ([`App.jsx:307`](../../../src/App.jsx#L307)) — i.e. the volatile store |
| **Goals (`goal1`)** | [`App.jsx:3977-3988`](../../../src/App.jsx#L3977-L3988) → [`:8300-8310`](../../../src/App.jsx#L8300-L8310) | React `player.goals` + per-category `goals` upsert ([`supabase.js:353-367`](../../../src/supabase.js#L353-L367)). **No localStorage.** | Yes — sequential `await` in a `for` loop, blocks `setScreen("home")` | `console.error`; the loop aborts on the first throw so later categories are never attempted; navigates home anyway | Stays on the SMART Goals screen indefinitely. **S2-4** is this exact symptom. | `player.goals` ([`App.jsx:321`](../../../src/App.jsx#L321)) |
| **Quiz (`quiz1`)** | [`App.jsx:8234-8290`](../../../src/App.jsx#L8234-L8290) | React `player.quizHistory` + `quiz_sessions` **insert** ([`supabase.js:308-315`](../../../src/supabase.js#L308-L315)) | Yes, but wrapped so `setScreen("results")` still runs | `console.error`; results screen shows anyway | `setScreen("results")` never fires — contributes to SHELL-1's "frozen post-quiz screen" | `player.quizHistory` ([`App.jsx:310`](../../../src/App.jsx#L310)), via `tierLimitedPlayer` ([`:8558`](../../../src/App.jsx#L8558), caps FREE at 5 — still ≥ 1, so harmless here) |
| **Profile / settings** | [`App.jsx:5853`](../../../src/App.jsx#L5853) (`useState({...player})`) → [`:8312-8328`](../../../src/App.jsx#L8312-L8328) | React `player` + `profiles` update ([`supabase.js:201-210`](../../../src/supabase.js#L201-L210)) | Yes | `console.error`, navigates home | Stuck on Profile | Not a quest; but navigating away before Save discards everything. **SHELL-6.** |
| **Insights (`read3`)** | [`widgets.jsx:26-36`](../../../src/widgets.jsx#L26-L36) / [`screens.jsx:1780-1792`](../../../src/screens.jsx#L1780-L1792) | `localStorage["rinkreads_insights_read_v1"]`, written synchronously. Not player-scoped. | n/a | n/a | n/a | `flags.insightsRead.size` ([`App.jsx:314`](../../../src/App.jsx#L314), read at [`:293`](../../../src/App.jsx#L293)) |
| **Training log (`train1`) — the one that works** | [`widgets.jsx:159-180`](../../../src/widgets.jsx#L159-L180) → [`utils/trainingLog.js:12-36`](../../../src/utils/trainingLog.js#L12-L36) | **localStorage first** (`:29`), then an un-awaited `saveTrainingSessionRemote` (`:33-35`, itself a silent try/catch at [`supabase.js:650-668`](../../../src/supabase.js#L650-L668)) | **No** — `logSession` is synchronous and nothing is gated on the network | LS write already done; remote failure is invisible and harmless | Impossible to hang the UI — nothing awaits | `localStorage["rinkreads_training_log"][player.id].sessions.length`, read directly ([`App.jsx:326-336`](../../../src/App.jsx#L326-L336)) |
| **Parent assessment** | [`screens.jsx:911`](../../../src/screens.jsx#L911) | `saveParentRatings` → localStorage (correct), **plus** [`App.jsx:8623`](../../../src/App.jsx#L8623) which sets React state only | No | Fine (LS already written) | n/a | Not a quest |

Note the shape of that table: **the three quests Thomas lost are exactly the three
that read `player`. The two that survived are exactly the two that read
localStorage.** That is the whole diagnosis in one line.

---

## Root causes

### RC-1 — `player` has no durable local store; Supabase is the only one, and it is written last

`setPlayer` is called at ten sites ([`App.jsx:7995`](../../../src/App.jsx#L7995),
`8033`, `8061`, `8163`, `8227`, `8239`, `8293`, `8301`, `8314`, `8623`). **None of
them writes localStorage.** A repo-wide search for a player cache key
(`rinkreads_player`, `player_cache`) returns nothing. The only rehydration is
[`loadUser` → `:8227`](../../../src/App.jsx#L8227), which rebuilds `player` purely
from `getPlayerSessions` / `getPlayerGoals` / `getSelfRatings`.

So the durability of every First-Six answer is exactly the durability of one
un-retried, un-timed-out, error-swallowed HTTP request. Compare
[`trainingLog.js:29`](../../../src/utils/trainingLog.js#L29): `lsSetJSON` runs
before the network is even mentioned, and the remote call at `:33-35` is not
awaited and not checked.

**This alone explains S2-SAVE.** It is not the Save button. A save-on-change
version of the skills screen that still wrote only to React + Supabase would lose
data the same way.

### RC-2 — navigation is gated on an unbounded network round-trip

[`App.jsx:8295`](../../../src/App.jsx#L8295), [`:8305`](../../../src/App.jsx#L8305),
[`:8317`](../../../src/App.jsx#L8317) all `await` before `setScreen`. There is no
`AbortController`, no `Promise.race` timeout, and no global fetch timeout on the
client ([`supabase.js:31-42`](../../../src/supabase.js#L31-L42) sets only `auth`
options). The single timeout in the whole module is the 12s race hand-rolled around
`signUp` ([`supabase.js:51-57`](../../../src/supabase.js#L51-L57)) — proof the team
already hit this class of bug once and fixed it in one place only.

Consequences, both observed:
- [`screens.jsx:1705-1707`](../../../src/screens.jsx#L1705-L1707) clears `saving` in
  `.finally()`. A promise that never settles never runs `.finally()`. **"Saving…"
  forever on skill 6 of 6 = SHELL-4.**
- `handleGoalsSave` never reaches `setScreen("home")`. **"Saving doesn't take you
  anywhere" = S2-4.** These were filed as two separate tickets; they are one bug.

A hang is strictly worse than a rejection here, because the write also never lands —
so RC-1 then destroys the data at the next load.

### RC-3 — failure is silent and is followed by a success-shaped navigation

```js
try { await SB.saveSelfRatings(player.id, ratings); } catch(e) { console.error(e); }
setScreen("home");
```
[`App.jsx:8294-8297`](../../../src/App.jsx#L8294-L8297). Identical shape at
[`:8302-8309`](../../../src/App.jsx#L8302-L8309) and
[`:8315-8326`](../../../src/App.jsx#L8315-L8326). The user is returned to Home — the
universal "done" signal in this app — for a write that failed. There is no toast, no
retry, no pending-write queue, and nothing surfaces in the UI. Thomas could not have
known anything went wrong until the quest list disagreed with him 20 minutes later.

Secondary: `handleGoalsSave`'s loop is inside the `try`, so the **first** category
that throws aborts the remaining categories
([`App.jsx:8303-8307`](../../../src/App.jsx#L8303-L8307)).

### RC-4 — any auth event re-fetches and clobbers `player`, with no reload required

[`supabase.js:108-111`](../../../src/supabase.js#L108-L111) discards the event name:

```js
return supabase.auth.onAuthStateChange((_event, session) => callback(session));
```

and the subscriber ([`App.jsx:8156-8162`](../../../src/App.jsx#L8156-L8162)) calls
`loadUser` for **any** event that carries a session — `TOKEN_REFRESHED`,
`USER_UPDATED`, and the repeat `SIGNED_IN` that supabase-js v2 emits on tab
focus/visibility. `loadUser` then overwrites the whole object at
[`:8227`](../../../src/App.jsx#L8227) and resets `totalSessions` at
[`:8230`](../../../src/App.jsx#L8230).

This is a data-loss path that does not need a page reload at all: rate six skills →
the write fails or is still in flight → the access token refreshes → `selfRatings`
reverts to the server's `{}`. It is also a plausible contributor to S2-SESSIONS,
since `totalSessions` gets re-derived mid-session.

The file already documents one bad interaction with this subscriber
([`App.jsx:8144-8155`](../../../src/App.jsx#L8144-L8155), the signUp deadlock). This
is a second one.

### RC-5 — quest progress is computed from two different stores

[`computeQuestProgress`](../../../src/App.jsx#L302-L336):

- `rate6` → `player.selfRatings` (volatile) — [`:307`](../../../src/App.jsx#L307)
- `quiz1` → `player.quizHistory` (volatile) — [`:310`](../../../src/App.jsx#L310)
- `goal1` → `player.goals` (volatile) — [`:321`](../../../src/App.jsx#L321)
- `read3` → localStorage (durable) — [`:314`](../../../src/App.jsx#L314)
- `train1` → localStorage, read by raw key — [`:326-336`](../../../src/App.jsx#L326-L336)

Fixing RC-1 fixes this by construction (the merged `player` becomes durable), but
the split is worth naming because it is why the symptom looked arbitrary.

### RC-6 — partial progress is never written at all

`SkillsOnboarding.advance()` ([`screens.jsx:1698-1709`](../../../src/screens.jsx#L1698-L1709))
calls `onSave` **only** when `idx + 1 === total`. Ratings 1–5 exist solely in the
component's `useState` until the sixth answer. Abandon at skill 3, hit Back, or hit
the SHELL-4 hang, and all of it is gone — it was never written anywhere, not even to
React's `player`. `GoalsScreen` has the same property: `goals` is local state until
`handleSaveGoal` ([`App.jsx:3977`](../../../src/App.jsx#L3977)), and `Profile` holds
`useState({...player})` ([`:5853`](../../../src/App.jsx#L5853)) until Save — that is
SHELL-6 exactly.

### RC-7 — on FREE tier, one "Skip" makes `rate6` permanently unsatisfiable

`FREE_SKILL_IDS` for U11 is exactly six ids
([`data/constants.js:189`](../../../src/data/constants.js#L189)), and
[`screens.jsx:1689-1691`](../../../src/screens.jsx#L1689-L1691) picks
`min(6, pool.length)` = 6 from that pool. The quest target is 6
([`App.jsx:159`](../../../src/App.jsx#L159)) and progress counts truthy values
([`:307`](../../../src/App.jsx#L307)). `advance(null)` — the "Skip →" button at
[`screens.jsx:1752`](../../../src/screens.jsx#L1752) — records nothing. So a FREE
U11 player who skips even one skill can reach at most 5 of 6, forever, with no path
to 6/6 anywhere in the UI.

This is a real second cause of "Rate yourself on 6 skills" never clearing, and it is
independent of the persistence bug.

### RC-8 — `handleProfileSave` spreads a stale snapshot over live state

[`App.jsx:8313`](../../../src/App.jsx#L8313): `const updated = {...player, ...settings}`
where `settings` is `Profile`'s `s`, initialised once from `{...player}` at mount
([`:5853`](../../../src/App.jsx#L5853)). `s` therefore carries a full copy of
`selfRatings`, `goals` and `quizHistory` frozen at mount time. If `player` changes
while Profile is open (an in-flight save landing, or RC-4's `loadUser`), pressing
Save writes the stale copies back over the fresh ones. Only six fields are actually
sent to Supabase ([`:8318-8323`](../../../src/App.jsx#L8318-L8323)); the rest of the
spread is pure collateral.

### RC-9 — both losing writes use `upsert` with no explicit `onConflict`

[`supabase.js:389`](../../../src/supabase.js#L389) and
[`:356-363`](../../../src/supabase.js#L356-L363). PostgREST infers the primary key,
and the schema's PKs are the right ones — `goals (player_id, category)`
([`schema.sql:72`](../../../supabase/schema.sql#L72)) and
`self_ratings (player_id, skill_id)` ([`:83`](../../../supabase/schema.sql#L83)) — so
this *should* work. But note that the only surviving write in the group,
`saveQuizSession`, uses a plain `.insert()`
([`supabase.js:310-312`](../../../src/supabase.js#L310-L312)), and every other upsert
in the module passes `onConflict` explicitly
([`:1049`](../../../src/supabase.js#L1049), [`:1104`](../../../src/supabase.js#L1104),
[`:82`](../../../src/supabase.js#L82)). These two are the outliers. Making the
conflict target explicit costs nothing and removes a variable.

### RC-10 — the migration files and the live database have already drifted

Not a cause I can pin, but it must be ruled out before anything else is trusted.
[`migration_0022:250-257`](../../../supabase/migration_0022_rls_privilege_hardening.sql#L250-L257)
records, verified live on 2026-08-02, that five tables in the migration history **do
not exist in production**, including `training_sessions` (which is why
`saveTrainingSessionRemote` silently no-ops) and `question_results` (the 404s on
load). The comment lists the tables it verified as present — `goals` and
`self_ratings` are not on either list, so their live status is **unknown**.

If either table is missing or its RLS/grants drifted, every symptom in this report
follows immediately and RC-1 turns it into permanent loss. Confirm before shipping
anything else (read-only, safe to paste into the Supabase SQL editor):

```sql
select to_regclass('public.goals')             as goals,
       to_regclass('public.self_ratings')      as self_ratings,
       to_regclass('public.quiz_sessions')     as quiz_sessions,
       to_regclass('public.training_sessions') as training_sessions;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('goals','self_ratings');
```

A 60-second browser check that separates "write failed" from "read-back failed":
open DevTools → Network, filter on `self_ratings`, complete the Rate-yourself flow,
and read the status of the `POST /rest/v1/self_ratings` request. A 4xx says the
write is being rejected (RC-10 / RLS); a request that never resolves says RC-2; a
201 with the data still gone on reload says the read-back path.

---

## Resolved after the trace was written

**The session was NOT in demo mode or dev bypass.** Settled from evidence already in
the recordings, so the "confirm this before spending effort elsewhere" caveat below
is closed: the demo path returns a session length of **7** unconditionally
(`isDemo ? 7 : …`, now `sessionQuestionCount`). The headers Thomas saw across both
sessions were "Question 4 of 5", "Question 6 of 5", "Question 6 of 10" and "Question
5 of 10" — the first-time value (5) and the configured `sessionLength` value (10).
Never 7. He was signed in against live Supabase, and RC-1 through RC-10 stand as the
explanation.

**RC-5 confirmed visually.** Screenshot `12:06:12` shows the Home screen mid-scroll
with three quest states side by side: "Practice · 30 min · 2026-08-03" rendered from
the training log (localStorage — survived), "Question of the Day ✓ Done" (survived),
and "First Five · Player — Next up: Rate yourself on 6 skills, **0/6**" (player state
— lost, despite all six being answered). That is the two-store split in one frame.

Note also that the quest group is labelled **"First Five · Player"** in the UI, not
"First Six" as the playtest notes call it. Worth reconciling the naming.

## What I could not determine

- **Why `read3` reset.** `rinkreads_insights_read_v1` is plain localStorage and is
  **not** player-scoped ([`App.jsx:256`](../../../src/App.jsx#L256),
  [`:293`](../../../src/App.jsx#L293)); both writers append correctly
  ([`widgets.jsx:29-33`](../../../src/widgets.jsx#L29-L33),
  [`screens.jsx:1783-1788`](../../../src/screens.jsx#L1783-L1788)) and all 132
  insights carry a `stat` key. It should have survived the reload. Two candidates I
  cannot separate from the code: (a) fewer than three cards were actually expanded —
  the widget only marks on expand, and Thomas may have read them on the Home carousel
  without opening three distinct ones; (b) `exitDemo` **deletes** the key when the
  snapshot it restores is empty ([`App.jsx:8011-8016`](../../../src/App.jsx#L8011-L8016)),
  so any pass through the preview flow wipes real read history. (b) is a genuine bug
  regardless of whether it fired here.
- **Whether the writes were rejected or hung.** Static reading cannot tell these
  apart. SHELL-4 and S2-4 are both hang-shaped (the UI never advanced), which points
  at a stall rather than a 4xx, but the Network-tab check above settles it in a
  minute.
- **Which mode the session ran in.** `enterDevBypass` sets `demoMode = true`
  ([`App.jsx:8058`](../../../src/App.jsx#L8058)), which makes **all four** handlers
  skip Supabase entirely (`if (!demoMode)`) and guarantees total loss on reload,
  since `getDevProfile` stores no ratings, goals or history
  ([`devBypass.js:48-51`](../../../src/utils/devBypass.js#L48-L51)). Player demo has
  been removed ([`App.jsx:7956-7958`](../../../src/App.jsx#L7956-L7958)) so a real
  signup is the likely path, but if the session was on `?devbypass=1` then *that* is
  the whole explanation and RC-1 is merely how it stayed broken. Worth confirming
  before spending effort elsewhere.
- **Whether `quizHistory` genuinely persisted.** S2-SESSIONS' "nine of nine" was
  observed at [02:11], before the reload at [02:41], so it may have been in-memory
  only. I have no post-reload observation of the quiz count.

---

## Proposed fixes

Ordered by leverage. Fixes 1–3 together remove the data loss; 4–8 remove the
individual traps. Nothing below has been applied.

### Fix 1 — write-through local cache for `player` (RC-1, RC-5)

New file `src/utils/playerCache.js`:

```js
import { lsGetJSON, lsSetJSON } from "./storage.js";

const KEY = "rinkreads_player_cache_v1";

// Fields the user can change from inside the app. Anything not listed stays
// server-owned (id, isAdmin, birthYear, signupMode...).
const FIELDS = [
  "selfRatings", "goals", "quizHistory", "parentRatings",
  "name", "level", "position", "season", "sessionLength", "colorblind",
];

export function cachePlayer(player) {
  if (!player?.id) return;
  const all = lsGetJSON(KEY, {});
  const slot = { ...(all[player.id] || {}) };
  for (const f of FIELDS) if (player[f] !== undefined) slot[f] = player[f];
  slot.__updatedAt = Date.now();
  all[player.id] = slot;
  lsSetJSON(KEY, all);
}

export function readCachedPlayer(playerId) {
  if (!playerId) return null;
  return lsGetJSON(KEY, {})[playerId] || null;
}

// Merge the local cache OVER the server copy. Local wins, because the cache is
// written synchronously at the moment of the user's action while the server
// copy may be missing a write that failed, timed out, or is still in flight.
// Maps merge key-by-key so a server row the cache never saw is not dropped.
export function mergeCachedPlayer(serverPlayer) {
  const cached = readCachedPlayer(serverPlayer?.id);
  if (!cached) return serverPlayer;
  const out = { ...serverPlayer };
  for (const f of FIELDS) {
    if (cached[f] === undefined) continue;
    if (f === "selfRatings" || f === "goals" || f === "parentRatings") {
      out[f] = { ...(serverPlayer[f] || {}), ...(cached[f] || {}) };
    } else if (f === "quizHistory") {
      const s = serverPlayer.quizHistory || [];
      const c = cached.quizHistory || [];
      out.quizHistory = c.length > s.length ? c : s;
    } else {
      out[f] = cached[f];
    }
  }
  return out;
}
```

Then in `src/App.jsx`, one helper next to the handlers (~line 8290):

```js
// Durable-first: localStorage is written synchronously, before any network
// call and before any navigation. Supabase becomes a sync target, not the
// system of record. Same shape as utils/trainingLog.js, which is the only
// First-Six write that has never lost data.
function commitPlayer(next) {
  cachePlayer(next);
  setPlayer(next);
  return next;
}
```

and at [`App.jsx:8227`](../../../src/App.jsx#L8227):

```js
-      setPlayer(enriched);
+      setPlayer(mergeCachedPlayer(enriched));
```

### Fix 2 — bound every write, never gate navigation on it (RC-2, RC-3)

New file `src/utils/withTimeout.js`:

```js
export const WRITE_TIMEOUT_MS = 8000;

export function withTimeout(promise, ms = WRITE_TIMEOUT_MS, label = "write") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
```

Replace [`App.jsx:8292-8328`](../../../src/App.jsx#L8292-L8328) wholesale:

```js
async function handleSkillsSave(ratings, { navigate = true } = {}) {
  // 1. Durable + visible FIRST. Nothing below can undo this.
  commitPlayer({ ...player, selfRatings: ratings });
  if (navigate) setScreen("home");
  if (demoMode) return;
  // 2. Sync. Bounded, and its failure is reported, never swallowed.
  try {
    await withTimeout(SB.saveSelfRatings(player.id, ratings), 8000, "saveSelfRatings");
  } catch (e) {
    console.error(e);
    toast.show({
      title: "Saved on this device",
      body: "We could not reach the server just now — it will sync next time you open the app.",
      icon: "⚠️",
    });
  }
}

async function handleGoalsSave(goals, { navigate = true } = {}) {
  commitPlayer({ ...player, goals });
  if (navigate) setScreen("home");
  if (demoMode) return;
  // Per-category try/catch: one bad category must not abandon the rest.
  const failed = [];
  for (const [cat, g] of Object.entries(goals)) {
    if (!g?.goal) continue;
    try { await withTimeout(SB.saveGoal(player.id, cat, g), 8000, `saveGoal(${cat})`); }
    catch (e) { console.error(e); failed.push(cat); }
  }
  if (failed.length) {
    toast.show({
      title: "Saved on this device",
      body: `${failed.join(", ")} will sync next time you open the app.`,
      icon: "⚠️",
    });
  }
}

async function handleProfileSave(settings, { navigate = true } = {}) {
  // Whitelist rather than spread: `settings` is a snapshot taken when the
  // Profile screen mounted and still carries stale selfRatings/goals/history.
  // Spreading it reverts anything saved while Profile was open. (RC-8)
  const PATCHABLE = ["name", "level", "position", "season", "sessionLength", "colorblind"];
  const patch = {};
  for (const f of PATCHABLE) if (settings[f] !== undefined) patch[f] = settings[f];
  commitPlayer({ ...player, ...patch });
  if (navigate) setScreen("home");
  if (demoMode) return;
  try {
    await withTimeout(SB.updateProfile(player.id, {
      name: patch.name, level: patch.level, position: patch.position,
      season: patch.season, session_length: patch.sessionLength,
      colorblind: patch.colorblind,
    }), 8000, "updateProfile");
  } catch (e) {
    console.error(e);
    toast.show({ title: "Saved on this device", body: "Settings will sync shortly.", icon: "⚠️" });
  }
}
```

Also drop the now-duplicated navigation at [`App.jsx:8569`](../../../src/App.jsx#L8569):

```jsx
-onSave={async (r)=>{ await handleSkillsSave(r); setScreen("home"); }}
+onSave={(r, opts) => handleSkillsSave(r, { navigate: opts?.final !== false })}
```

### Fix 3 — save after every answer, and never let "Saving…" stick (RC-2, RC-6, RC-7)

[`src/screens.jsx:1698-1709`](../../../src/screens.jsx#L1698-L1709):

```js
  function advance(val) {
    // A skip is an answer ("doesn't apply"), not a hole. Recording it as n/a
    // keeps the 6-of-6 quest reachable: on FREE the U11 pool is exactly six
    // skills (data/constants.js:189), so one silent skip previously made
    // "Rate yourself on 6 skills" permanently unsatisfiable. (RC-7)
    const next = { ...ratings, [current.id]: val != null ? val : "n/a" };
    setRatings(next);
    const merged = { ...(player.selfRatings || {}), ...next };
    if (idx + 1 < total) {
      setIdx(idx + 1);
      // Persist every answer. onSave merges, so quitting at skill 3 keeps 3
      // ratings instead of 0. Fire-and-forget: never block the next card.
      Promise.resolve(onSave(merged, { final: false })).catch(() => {});
    } else {
      setSaving(true);
      // Hard ceiling. The old code cleared `saving` only in .finally(), which
      // never runs for a promise that never settles — that was SHELL-4.
      const bail = setTimeout(() => setSaving(false), 8000);
      Promise.resolve(onSave(merged, { final: true }))
        .catch(() => {})
        .finally(() => { clearTimeout(bail); setSaving(false); });
    }
  }
```

### Fix 4 — stop re-loading (and clobbering) `player` on routine auth events (RC-4)

[`src/supabase.js:108-111`](../../../src/supabase.js#L108-L111) — pass the event through:

```js
 export function onAuthChange(callback) {
   if (!supabase) return { subscription: { unsubscribe: () => {} } };
-  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
+  return supabase.auth.onAuthStateChange((event, session) => callback(session, event));
 }
```

[`src/App.jsx:8137-8164`](../../../src/App.jsx#L8137-L8164) — filter, and skip when
the user has not changed:

```js
+  // Set of events that mean "a different user is now signed in". Everything
+  // else (TOKEN_REFRESHED, and the repeat SIGNED_IN supabase-js emits on tab
+  // focus) must NOT re-fetch: loadUser replaces `player` wholesale, so a
+  // background refresh would silently revert any state not yet synced.
+  const RELOAD_EVENTS = new Set(["INITIAL_SESSION", "SIGNED_IN", "USER_UPDATED"]);
+  const loadedUserIdRef = useRef(null);
   ...
-    const { data } = SB.onAuthChange((session) => {
+    const { data } = SB.onAuthChange((session, event) => {
       if (!mounted || demoModeRef.current) return;
       if (session?.user) {
         setUserEmail(session.user.email || null);
+        if (!RELOAD_EVENTS.has(event)) return;
+        if (loadedUserIdRef.current === session.user.id) return;
+        loadedUserIdRef.current = session.user.id;
         setTimeout(() => {
           if (!mounted || demoModeRef.current) return;
           loadUser(session.user.id).catch((e) => console.error("loadUser after auth change failed:", e));
         }, 0);
       }
-      else { setProfile(null); setPlayer(null); setUserEmail(null); }
+      else { loadedUserIdRef.current = null; setProfile(null); setPlayer(null); setUserEmail(null); }
     });
```

### Fix 5 — auto-save the Profile screen (RC-6 / SHELL-6)

[`src/App.jsx:5853-5854`](../../../src/App.jsx#L5853-L5854):

```js
   const [s, setS] = useState({...player});
-  const upd = k => v => setS(p => ({...p,[k]:v}));
+  const saveTimer = useRef(null);
+  // Save-on-change, matching the training log — the one screen in this app
+  // that has never lost data. The Save button stays as reassurance, not as
+  // the commit. Debounced so typing a name is one write, not twelve.
+  const upd = k => v => setS(p => {
+    const next = { ...p, [k]: v };
+    clearTimeout(saveTimer.current);
+    saveTimer.current = setTimeout(() => onSave(next, { navigate: false }), 600);
+    return next;
+  });
+  useEffect(() => () => clearTimeout(saveTimer.current), []);
```

The same treatment applies to `GoalsScreen`: call
`onSave(goals, { navigate: false })` from a debounced effect on `goals`, and leave
`handleSaveGoal` as the explicit "done, take me home" action (which also answers
S2-4 and lets the three redundant Save affordances of S2-3 collapse to one).

### Fix 6 — make the conflict target explicit (RC-9)

[`src/supabase.js:389`](../../../src/supabase.js#L389):

```js
-  const { error } = await supabase.from("self_ratings").upsert(rows);
+  const { error } = await supabase.from("self_ratings")
+    .upsert(rows, { onConflict: "player_id,skill_id" });
```

[`src/supabase.js:355-364`](../../../src/supabase.js#L355-L364):

```js
   const { data, error } = await supabase.from("goals")
     .upsert({
       player_id: playerId,
       category,
       goal: goalData.goal,
       s: goalData.S, m: goalData.M, a: goalData.A, r: goalData.R, t: goalData.T,
       completed: !!goalData.completed,
       updated_at: new Date().toISOString(),
-    })
+    }, { onConflict: "player_id,category" })
     .select().single();
```

### Fix 7 — a global ceiling so no Supabase call can hang forever (RC-2, defence in depth)

[`src/supabase.js:31-42`](../../../src/supabase.js#L31-L42):

```js
 export const supabase = (url && key) ? createClient(url, key, {
   auth: {
     persistSession: true,
     autoRefreshToken: true,
     detectSessionInUrl: true,
     lock: async (_name, _acquireTimeout, fn) => fn(),
   },
+  // Nothing in this app should wait on the network indefinitely. Without
+  // this, a stalled request leaves the UI on "Saving…" with no error and no
+  // escape (playtest 2026-08-03, SHELL-4 / S2-4). Callers still apply their
+  // own tighter per-write timeout; this is the backstop.
+  global: {
+    fetch: (input, init = {}) => {
+      if (init.signal) return fetch(input, init);
+      const ctrl = new AbortController();
+      const t = setTimeout(() => ctrl.abort(), 15000);
+      return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
+    },
+  },
 }) : null;
```

### Fix 8 — stop `exitDemo` deleting real insight-read history (read3 candidate (b))

[`src/App.jsx:8011-8016`](../../../src/App.jsx#L8011-L8016) removes the key when the
snapshot is empty, which is indistinguishable from "the user had no history before
the preview" and "the snapshot itself failed". Prefer restoring only what the
preview added:

```js
       const snap = window.localStorage.getItem("rinkreads_preview_snap_insights_v1");
       if (snap !== null) {
-        if (snap) window.localStorage.setItem("rinkreads_insights_read_v1", snap);
-        else window.localStorage.removeItem("rinkreads_insights_read_v1");
+        // Restore the pre-preview list verbatim. Never remove the key: an
+        // empty snapshot may mean the snapshot failed, and deleting on that
+        // basis destroys real progress.
+        window.localStorage.setItem("rinkreads_insights_read_v1", snap || "[]");
         window.localStorage.removeItem("rinkreads_preview_snap_insights_v1");
       }
```

---

## Suggested order of work

1. Run the two SQL checks in RC-10 and the Network-tab check. If `goals` or
   `self_ratings` is missing or rejecting writes, that is the immediate cause and
   everything below is hardening.
2. Confirm whether the playtest ran under `?devbypass=1` (RC-4 in "could not
   determine"). If it did, `demoMode = true` skipped every Supabase write by design.
3. Fixes 1 + 2 + 3 — these end the data loss whatever the answer to 1 and 2 is.
4. Fix 4 — closes the no-reload-required variant.
5. Fixes 5–8 — the individual traps.

One naming note, unrelated to the bug: `QUESTS_PLAYER`
([`App.jsx:158-164`](../../../src/App.jsx#L158-L164)) holds **five** entries and its
comment calls it "First-Five", while the findings and the UI copy call it the
First-Six. Worth reconciling so the two documents describe the same thing.
