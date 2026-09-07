# Task D — Feedback workflow, tested in isolation

**Scope:** `tools/coaching-feedback-plugin.mjs`, `tools/update-coaching-feedback.mjs`, `src/one-on-one/CoachingFeedbackPanel.jsx`, `docs/factory/coaching-panel/admin.html`. Worked entirely inside `C:/Users/mtsli/IceIQ/.worktrees/claude-ten-hour-followthrough` on branch `claude/ten-hour-followthrough`. No git add/commit/push performed (per instructions — the change below is left staged-in-working-tree only). No real inbox, no Supabase, no production endpoint touched. All test data is synthetic and clearly labeled `SYNTHETIC` in the note text.

## At a glance

| Area | Status |
|---|---|
| Reported `.gitignore` issue | **Confirmed and fixed** |
| Existing unit tests (11 feedback tests + 485 broader practice tests) | **All passing**, before and after the fix |
| Player submit → admin intake → internal note → disposition → player sees status | **Confirmed working end-to-end** (server-level; browser UI not reachable, see Blockers) |
| Cross-user leakage | **Confirmed NOT leaking** |
| Stale question hash | **Confirmed correctly rejected** |
| Empty note | **Confirmed correctly rejected** |
| Cross-origin request | **Confirmed correctly blocked (403)** |
| Double submit | **Observed: server allows it (no dedup); UI already guards against the click path** — not treated as a defect, see below |
| Production release boundary | **Confirmed excluded** (`node tools/check-feedback-release-boundary.mjs` → PASS against a real `npm run build`) |
| Real-browser UI testing (mobile keyboard/focus, visible success/error states, localStorage draft reload) | **Blocked all session** — Playwright MCP browser was held by a concurrent session the entire time; never obtained access. Everything above marked "confirmed" was verified by driving the actual local server endpoint directly (same requests, same validation code, same file-backed storage the browser would use), not by clicking through a rendered page. See Blockers section for exact detail. |

## 1. Reproduced the reported `.gitignore` issue

`tools/coaching-feedback-plugin.mjs` writes every submitted note and disposition to `<repo-root>/tmp/coaching-feedback/{inbox,dispositions}.jsonl`. `tools/update-coaching-feedback.mjs` reads/writes the same path. Neither `tmp/` nor `tmp/coaching-feedback/` appeared anywhere in `.gitignore`.

Reproduction:
```
mkdir -p tmp/coaching-feedback
touch tmp/coaching-feedback/inbox.jsonl tmp/coaching-feedback/dispositions.jsonl
git check-ignore -v tmp/coaching-feedback/inbox.jsonl   # exit 1 — not ignored
git status --short                                       # ?? tmp/  — untracked, would be swept up by `git add -A`/`git add .`
```
`git log --all --diff-filter=A --name-only -- "tmp/*"` returned nothing — no file under `tmp/` was ever actually committed in this repo's history, so this was a live exposure risk, not an already-tracked leak. **No files needed to be untracked or removed.**

Fix — narrowly scoped ignore rule added to `.gitignore` (only file changed for this item):
```diff
+# Local coaching-feedback dev inbox (tools/coaching-feedback-plugin.mjs writes
+# receipts + dispositions here; never a production/Supabase path, but was
+# untracked-and-unignored, one `git add -A`/`git add .` away from committing
+# real player feedback text to the repo). Ignoring does not affect any file
+# already tracked; nothing under tmp/ was ever committed (verified 2026-09-07).
+/tmp/coaching-feedback/
```
Verified after the fix: `git check-ignore -v` now matches both files; `git status --short` no longer lists `tmp/coaching-feedback/`; `git ls-files | grep '^tmp/'` returns nothing (confirms no pre-existing tracked file was affected). Scoped to `/tmp/coaching-feedback/` specifically rather than all of `tmp/`, because a repo-wide search showed no other code writes into a repo-relative `tmp/` path (the two other `tmp/`-looking references, in `scripts/qc-grid.mjs` and `scripts/board-svg.mjs`, write to the OS temp dir `C:/tmp`, unrelated).

**File changed:** `.gitignore` (one hunk, shown above).

## 2. Existing tests

```
node --test tools/coaching-feedback-plugin.test.mjs tools/coaching-feedback-context.test.mjs tools/coaching-feedback-views.test.mjs
→ tests 11, pass 11, fail 0
```
Also ran the broader adjacent suite for regressions from the `.gitignore` change (there should be none — it's not code — but confirmed anyway):
```
npm run test:practice
→ tests 485, pass 485, fail 0
```

## 3. Disposable synthetic inbox + dedicated dev server

- The plugin hard-codes its storage path to `<repo-root>/tmp/coaching-feedback/` (not configurable without a code change I judged out of scope). Since that path is (a) never used in production, (b) now git-ignored, and (c) populated only by whatever this session wrote to it, I used it as the disposable synthetic inbox rather than forking the plugin to point elsewhere — forking it would have meant testing code paths the real app doesn't exercise. Started the run with the directory empty and cleared it again afterward (see "Cleanup").
- Dev server: `npm run dev -- --port 5179 --strictPort`, started fresh from this worktree (this worktree has no `node_modules`; ran `npm install` inside it — did not touch the main checkout's `node_modules`). Chose 5179 to avoid the default 5173 in case another session was using it. Confirmed `curl http://localhost:5179/` → 200 before testing, stopped it cleanly at the end (`TaskStop`).
- Every synthetic note/disposition contains the literal string `SYNTHETIC` so nothing could be mistaken for real feedback. A saved sample is in `task-d-evidence/synthetic-inbox-sample.jsonl` / `synthetic-dispositions-sample.jsonl` for reference; the actual `tmp/coaching-feedback/` files were deleted after the run.

## 4. End-to-end flow — actual results

**How this was actually tested:** the Playwright MCP browser tool was unavailable for the entire session (see Blockers) — every `browser_navigate`/`browser_tabs` call failed with "Browser is already in use ... use --isolated," meaning another concurrent Claude session held the one shared browser profile the whole time. I did not fabricate browser interaction. Instead I drove `http://localhost:5179/__coaching-feedback` directly with the same HTTP requests, headers, and content-hash computation the real `CoachingFeedbackPanel.jsx` performs (reused `makeScene()` from `src/one-on-one/experimentalBankCore.js` to derive the exact same `scene` object the component receives as a prop, and the identical SHA-256-over-`{scene,question}` hash it sends). This exercises the real server-side validation, storage, and player/admin projection logic — the same code the browser would call — but it is **not** a rendered-page click-through, so nothing about visible UI copy, focus order, or on-screen success/error banners was directly observed (their existence in the source was checked by reading the code — see §6).

Test script and full raw output preserved at `task-d-evidence/feedback-e2e-test.mjs` (reproducible — reads the real experimental bank, so results will vary slightly by scenario version if the bank changes, but the pass/fail behavior is deterministic given the same bank state).

| # | Check | Actual result |
|---|---|---|
| 1 | Player submits real "Leave a thought" content (correct scenario/question/hash/context, from the live experimental bank's first scenario `exp26-u7-001` / `exp26-u7-001-q1`) | **Pass.** `POST /__coaching-feedback` → `200 {saved:true,id:...}`. First attempt (before reusing `makeScene()`) failed with `Invalid scene point` — traced to my own test harness sending `s.setup.puck` (`{owner:"home-skater-1"}`, no `x`/`y`) instead of the derived scene the component actually computes via `makeScene()`, which fills in `puck.x/y` from the owning actor's position and facing. Not a product defect — the real component never sends the raw setup object. Documented here so the distinction is clear. |
| 2 | Admin intake sees it | **Pass.** `GET /__coaching-feedback?view=admin` returns the full record: exact `scenarioId`, `scenarioVersion`, `afterHash`, `questionSnapshot`, `context` (actor positions/facing, puck), `tags`, `ownerId`. Enough for an admin to recommend a fix with exact scene/question identity, per the task's requirement. |
| 3 | Admin adds an internal-only note | **Pass.** `POST /__coaching-feedback?action=comment` → `200 {saved:true}`. |
| 4 | Internal note stays out of the player's view | **Pass.** Player GET for the same owner, taken after the internal note was saved, shows no `internalNotes` and no new `updates` entry — the internal note is admin-only, exactly as `CoachingFeedbackPanel.jsx`'s player projection (`playerFeedbackView`) is written to do. |
| 5 | Admin records a disposition via `node tools/update-coaching-feedback.mjs <file>.json`, status `changed`, with a `publicSummary` | **Pass.** CLI accepted it (`Follow-up recorded for <id>`). |
| 6 | Matching player's view reflects the returned status | **Pass — this is the item the prior report explicitly left untested, now closed.** The player GET for that owner now shows `"status":"changed"` and `"updates":[{"status":"changed","summary":"Thanks, fixed: moved a player so the passing lane is clear now."}]` — exactly the `publicSummary` text, not the internal `summary`/`evidence` fields (which stayed admin-only). |
| 7 | Second disposition, status `needs-context`, **no** `publicSummary` supplied | **Pass.** The matching player's view shows `"status":"needs-context"` with an empty `updates` array — confirms a disposition with no public text correctly shows nothing extra to the player, rather than leaking the internal summary by accident. |
| 8 | Another owner's view (cross-user leakage) | **Pass — no leak.** Two distinct synthetic owner tokens (`synthetic-owner-alpha-0001`, `synthetic-owner-beta-0002`) each submitted feedback on the same question. Owner A's `GET` returns only A's notes; Owner B's `GET` returns only B's note. The admin view (no owner header) sees both, as designed. |
| 9 | Stale question hash | **Pass — correctly rejected.** Submitting with a hash that doesn't match the live question → `400 {"error":"Question changed. Reload before sending. Your note remains saved."}`. |
| 10 | Empty note | **Pass — correctly rejected.** Whitespace-only note → `400 {"error":"Add a note of 1–4000 characters."}`. |
| 11 | Cross-origin request | **Pass — correctly blocked.** `Origin: http://evil.example.com` against the same-origin dev server → `403 "Local same-origin requests only."` |
| 12 | Double submit (same content, fired concurrently) | **Observed, not a fix candidate.** The server has no de-duplication — both requests succeeded and created two separate entries with distinct IDs and near-identical timestamps (14ms apart in the test run). However, `CoachingFeedbackPanel.jsx`'s Send button is `disabled={busy||!note.trim()}` and `busy` is set for the duration of the request — a real user clicking twice through the actual UI can't trigger this; it only happens via direct concurrent API calls, which isn't the shipped path. Given the feedback is explicitly meant to be a lightweight, low-stakes note (not a formal record), and the admin view already groups by question so duplicates are visually adjacent and easy to disregard, I did not add server-side dedup — that would be a behavior change nobody asked for, on a path only reachable by bypassing the UI entirely. Flagging as an accepted, low-severity gap rather than a fix. |
| 13 | Reload persistence (server-side history) | **Pass, for the part testable this way.** Because the "history" the player/admin views show is read fresh from the `.jsonl` files on every `GET`, a page reload (which just re-runs that same `GET`) will always show current state — this was proven by repeated `GET`s across the whole test run returning consistent, updated data. The other half — an **unsent draft** surviving a reload via `localStorage` (`CoachingFeedbackPanel.jsx`'s `draftKey`/`localStorage.setItem`) — genuinely needs a real browser tab and was **not** verified this session; see Blockers. |

## 5. Release boundary

```
npm run build            # production build, this worktree only
node tools/check-feedback-release-boundary.mjs
→ PASS: local feedback endpoint, browser-owner transport and administrator HTML excluded from production build.
```
Confirms `/__coaching-feedback`, the `X-Feedback-Owner` header string, and `docs/factory/coaching-panel/admin.html` are all absent from `dist/`. This matches the code-level guard already in `ExperimentalPractice.jsx` (`import.meta.env.DEV ? <CoachingFeedbackPanel .../> : ...`), which Vite dead-code-eliminates in production builds. The `dist/` folder used for this check was removed afterward (it's already `.gitignore`d under the existing `dist/` rule, so it was never at risk of being committed either way).

## 6. Mobile keyboard/focus + UI copy

- **UI copy — checked by reading source, matches intent.** `CoachingFeedbackPanel.jsx`: the widget is labeled "Leave a thought" and states outright "No review or rewrite needed. A quick observation is enough." The hint text explains the scene/answer are captured automatically "so you don't have to explain the whole scene." Submit states are distinct and human-readable: `"Saving your thought…"` while busy, `"Received. We'll investigate during the next work pass."` on success, `"Not sent. <reason>. Your draft is still here."` on failure (draft is preserved either way). This reads as a low-stakes, non-formal ask, consistent with the task's requirement that it never resemble a rewrite/approval request.
- **Mobile keyboard/focus behavior — blocked, not run.** This needs an actual rendered page with viewport/device emulation (Playwright's mobile emulation), which was unavailable all session (see Blockers). I did check the CSS (`CoachingFeedbackPanel.css`) for obvious static red flags: tag buttons are `min-height:36px` (workable, on the low end of the ~44px touch-target guidance), and the textarea doesn't set an explicit `font-size`, so if the effective computed size on a real device were under 16px it could trigger iOS Safari's auto-zoom-on-focus — I could not confirm the actual computed value without a live browser, so this is flagged as **unverified, not a confirmed defect**. No fix was made for it since I could not reproduce it.

## Defects reproduced and fixed

| # | Defect | Before | Fix | Evidence after |
|---|---|---|---|---|
| 1 | `tmp/coaching-feedback/` (real feedback receipts + dispositions storage) had no `.gitignore` entry — one `git add -A`/`git add .` away from committing player feedback text | `git check-ignore -v tmp/coaching-feedback/inbox.jsonl` → exit 1 (not ignored); `git status --short` → `?? tmp/` | Added `/tmp/coaching-feedback/` to `.gitignore` (see diff in §1) | `git check-ignore -v` now matches both `.jsonl` files; `git status --short` no longer surfaces them; `git ls-files \| grep '^tmp/'` empty (nothing pre-existing was untracked/removed); 11/11 feedback tests and 485/485 practice tests still pass |

No other reproduced, in-scope defect required a code change. The "invalid scene point" failure in my first test pass (§4, row 1) turned out to be a bug in my own test harness (feeding raw `setup.puck` instead of the derived scene), not in the product — corrected and re-verified, documented rather than "fixed" since there was nothing in the shipped code to fix.

**Files changed for Task D:** `.gitignore` only.

## Blockers (exact cause, not worked around by fabricating results)

1. **Playwright MCP browser access — blocked for the entire session.** Every call (`browser_tabs list`, `browser_navigate`) returned: `Error: Browser is already in use for C:\Users\mtsli\AppData\Local\ms-playwright-mcp\mcp-chrome-7281ec7, use --isolated to run multiple instances of the same browser`. This is the shared-profile conflict called out in this task's own instructions — another concurrent Claude session/agent was actively driving that same browser profile. Retried at the start, mid-session, and again at the end (four attempts total, spread across the whole run); never got a window. Per instructions I did not force-close it and did not fabricate browser results. What this blocks specifically, left unresolved:
   - Real click-through of the "Leave a thought" widget and `admin.html` in an actual rendered page (I exercised the identical underlying HTTP calls and validation code directly instead — see §4 for exactly what that does and doesn't prove).
   - Mobile viewport/device emulation and real keyboard/focus behavior (§6).
   - Verifying an **unsent draft** survives a real page reload via `localStorage` (the server-side history's reload-survival was confirmed; the client-only draft was not).
   - Visually confirming the success/error message actually renders on screen as styled (the code path and exact copy were confirmed by reading the source; not visually observed).
2. No other blockers. `npm install`, `npm run dev`, `npm run build`, and all `node --test` runs completed without issue inside this worktree.

## Out of scope (per instructions, not attempted)

Authentication redesign, Supabase integration/migration, production inbox changes, large UI overhauls, server-side double-submit deduplication (see §4 row 12 for why it wasn't treated as in-scope), and any change to the "flag" widget in `src/one-on-one/PlacementFeedback.jsx` / the client-only review-triage mechanism in `ExperimentalPractice.jsx` (`recordFlag`/`onFlag`) — that's a separate, already production-safe (localStorage-only, no server call) mechanism from `tools/coaching-feedback-plugin.mjs` and wasn't named in this task's scope.

## Evidence index

- `.gitignore` — the one code change, diff shown in §1.
- `task-d-evidence/feedback-e2e-test.mjs` — the exact script run against the dev server for §4.
- `task-d-evidence/synthetic-inbox-sample.jsonl`, `synthetic-dispositions-sample.jsonl` — a saved copy of the synthetic data produced during the run (every line contains `SYNTHETIC`). The live `tmp/coaching-feedback/` directory itself was cleared after the run.
- `task-d-evidence/disposition-changed-example.json`, `disposition-needs-context-example.json` — the two disposition files fed to `tools/update-coaching-feedback.mjs` in §4.

## Cleanup performed

- `tmp/coaching-feedback/inbox.jsonl` and `dispositions.jsonl` deleted (synthetic data no longer needed once captured above).
- Test harness files removed from `tmp/` after being copied into `task-d-evidence/`.
- Dev server (port 5179) stopped cleanly via `TaskStop`.
- Production `dist/` build (used only for the release-boundary check) removed.
- No git add/commit/push was performed at any point.
