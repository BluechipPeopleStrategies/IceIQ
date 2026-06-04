# Founder Review Dashboard — Implementation Plan (dashboard-first slice)

**Goal:** Build the owner-only `#review` dashboard where forwarded questions render exactly as a player sees them, with Approve → `bank.json` / Send back / Edit / Reject, so questions can reach the currently-empty bank before the gauntlet exists.

**Spec:** `docs/superpowers/specs/2026-06-04-founder-approval-layer-design.md` (§5, §6, §9 dashboard-first slice).

**Architecture:** Browser app is static (no backend), so writes go through a **dev-only Vite middleware** (`fs`-backed) active during `npm run dev` — exactly where an owner review tool runs. The fs logic lives in a pure, unit-tested `tools/review-store.mjs`; the Vite plugin is a thin HTTP shell. The dashboard reuses the app's real renderers via an extracted `QuestionPlayerView`.

**Tech:** Node ESM, React+Vite, plain JS/JSX. Test = `.mjs` asserts (repo convention).

## Files
- Create `tools/review-store.mjs` — pure fs ops: `loadQueue`, `approve`, `reject`, `sendBack`, `editItem` (take explicit file paths; return results; append to log).
- Create `tools/review-store.test.mjs` — unit tests against temp files.
- Create `tools/review-server-plugin.mjs` — Vite plugin: `configureServer` adds `GET /__review/queue`, `POST /__review/{approve,reject,sendback,edit}`; delegates to review-store; **dev only**.
- Modify `vite.config.js` — register the plugin.
- Create `src/data/review-queue.json` — `{ items: [...] }` with ~4 real questions tagged to ledger nodeIds + proxyVerdicts.
- Create `src/data/review-log.jsonl` — append-only decision log (starts empty).
- Modify `src/App.jsx` — extract `QuestionPlayerView` from `QuestionPreviewPage` (render dispatch for a question object); add `ReviewDashboard` + `#review` route.

## Data shapes
review-queue.json:
```
{ "items": [ { "question": {<bank-schema q incl. id, nodeId, levels[], type, sit/opts/ok …>},
              "gateHistory": {"coachPanel":"pass"},
              "proxyVerdict": {"decision":"forward","scores":{"brand":0.9,"learner":0.88,"strategy":0.82},"rationale":"…"},
              "queuedAt":"2026-06-04" } ] }
```
review-log.jsonl: one JSON object per line: `{ts?, action, id, level?, note?, by:"founder"}` (ts injected by caller; tests pass a fixed ts).

## Endpoint behaviour (review-store)
- `approve(paths, id)` → find item in queue; push `item.question` into `bank.json` under each level in `question.levels[]` (dedupe by id; default level from nodeId age if levels missing); remove from queue; append log `{action:"approve",id,levels}`. Returns `{ok, bankCount}`.
- `reject(paths, id, note)` → remove from queue; append log.
- `sendBack(paths, id, note)` → remove from queue; append log (note required).
- `editItem(paths, id, question)` → replace queue item's `question`; append log.
- `loadQueue(paths)` → parsed queue.
All tolerate missing files (empty bank `{}`); all write pretty JSON.

## Tasks (TDD where it pays)
1. **review-store + test.** Write `review-store.test.mjs` against temp dir fixtures (approve moves to bank under levels, dedupes, removes from queue, logs; reject/sendback remove+log; edit replaces). Implement `review-store.mjs`. Run `node tools/review-store.test.mjs` → 0 failed. Commit.
2. **Vite plugin + wire.** Thin HTTP shell calling review-store with the repo's `src/data/*` paths; JSON body parse; dev-only. Register in `vite.config.js`. `npm run build` still green (plugin only affects dev server). Commit.
3. **Sample queue.** Author `src/data/review-queue.json` with 4 real MC questions tagged to ledger nodeIds (e.g. `u9.passing`, `u11.decision-making`, `u11.odd-man-reads`, `u13.gap-control`), each with levels[] + proxyVerdict. Create empty `review-log.jsonl`. Validate JSON parses. Commit.
4. **QuestionPlayerView extract.** Pull the render dispatch (isRinkQ→RinkReadsRinkQuestion / multi→MultiMCQuestion / else→QuestionPreviewFallback) out of `QuestionPreviewPage` into `QuestionPlayerView({question,onAnswer})`; repoint QuestionPreviewPage at it. Build green; `#q=<id>` still works. Commit.
5. **ReviewDashboard + route.** `#review` route → component: `fetch('/__review/queue')`, list items, each shows QuestionPlayerView + proxyVerdict panel + 4 actions (Approve/Send back/Edit/Reject) posting to endpoints, optimistic remove on success. Owner-only (endpoints exist only in dev). Build green. Commit.
6. **Verify end-to-end.** node test green; `npm run build` green; `npm run dev` smoke: load `#review`, Approve one item → confirm it lands in `bank.json` and disappears from queue, log appended. Commit any fixes.
7. **Merge** to main (after green), per finishing-a-development-branch.

## Notes
- The endpoints are dev-only by design; production build has no `/__review/*`. The dashboard is an owner tool.
- Approving is what first un-empties the live app (EmptyBankScreen → real questions).
