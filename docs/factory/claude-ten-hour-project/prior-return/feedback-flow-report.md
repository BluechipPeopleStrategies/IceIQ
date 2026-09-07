# Work 3: feedback-to-repair workflow — evidence report

Reviewer: Claude Sonnet 5 (claude-sonnet-5), this session. Provisional findings only (this session's own calibration failed 4/8 -- see `output/calibration/reconciliation.json` -- so any hockey-content judgment elsewhere in this run is provisional; this report is about workflow/engineering behavior, which the calibration failure does not bear on).

**Environment used**: the same isolated git worktree used for the entire assignment (`C:\Users\mtsli\IceIQ\.worktrees\claude-visual-review-60`), detached HEAD at `sourceCommit f1f5667bc5daa7ac7edae010e36b8c87873e6645`, running its own local Vite dev server on port 5199 (already running from earlier in this session; confirmed listening on `[::1]:5199`, not `127.0.0.1`, which is why an earlier `curl 127.0.0.1:5199` check misleadingly reported down -- see "gotcha" note below). **This server and its `tmp/coaching-feedback/` inbox are entirely local to this worktree.** They are not the same filesystem path, dev server process, or storage as any other checkout, and no request in this test run left `localhost`. Thomas's real feedback inbox (in the main IceIQ checkout or any deployed instance) was never read, written, or contacted.

## What was inspected (read-only)

- `tools/coaching-feedback-plugin.mjs` -- the Vite middleware serving `/__coaching-feedback` (GET history, POST new note, POST `?action=comment` for admin-only internal notes).
- `tools/update-coaching-feedback.mjs` -- CLI that appends a disposition (`investigating`/`changed`/`needs-context`/`no-change`) to `dispositions.jsonl`, keyed to a feedback receipt id.
- `tools/coaching-feedback-plugin.test.mjs`, `tools/coaching-feedback-context.test.mjs`, `tools/coaching-feedback-views.test.mjs` -- existing unit test suites.
- `docs/factory/coaching-panel/FEEDBACK-WORKFLOW.md` -- the authoritative process doc (Sept 6 revision: Thomas does not review/approve; Codex investigates and repairs on its own judgment, using feedback as evidence not instruction).
- `docs/factory/coaching-panel/admin.html` and `decisions.html` -- the two UI surfaces (admin desk vs. the in-app "leave a thought" notebook).

## What was tested (live, in the isolated worktree only)

1. **Existing automated test suites**: ran `node --test` against all three `coaching-feedback-*.test.mjs` files. **11/11 passed**, 0 failures.
2. **Live end-to-end submission**: computed a real content hash for a real live-bank question (`exp26-u7-001-q1`, via `readBankFiles()` + `questionContentHash()`, the same tooling used throughout this assignment's Work 1 hash verification) and POSTed a clearly-labeled synthetic note (`"WORK3-TEST: ..."`) to `/__coaching-feedback`. Response: `{"saved":true,"id":"2389ca23-..."}`. Confirmed the receipt landed **only** in `<this-worktree>/tmp/coaching-feedback/inbox.jsonl`, with the exact scenario id, version, content hash, note, tags and question snapshot recorded, matching the code's documented contract.
3. **Owner-scoped GET views**: confirmed three distinct response shapes from the same endpoint:
   - `?view=admin` (with same-origin headers): full record, every field, including the raw `questionSnapshot`.
   - Player GET with the matching `x-feedback-owner` header: reduced projection (`id`, `note`, `questionId`, `receivedAt`, `status`, `updates` with only `publicSummary`-bearing updates) -- exactly matches `playerFeedbackView()`'s documented behavior.
   - Player GET with a **different** owner header: empty `notes: []` -- confirms per-owner isolation actually works, not just documented.
4. **Disposition recording**: wrote a disposition JSON (`status: "no-change"`, both an internal `summary` and a `publicSummary`) and ran `node tools/update-coaching-feedback.mjs`. Confirmed:
   - Admin view now shows the full disposition (`summary`, `publicSummary`, `beforeHash`, `recordedAt`).
   - Player view shows **only** `{status, summary: publicSummary}` -- the internal `summary` text never reaches the player-facing JSON. This is a real, verified privacy boundary, not just a doc claim.
5. **Internal-only admin comment**: POSTed to `?action=comment`. Confirmed it's appended to `dispositions.jsonl` with `status: "internal-note"`, appears in the admin view's `internalNotes`, and **never appears** in the player view under any status. Verified by direct comparison of both JSON responses side by side.
6. **Negative-path validation** (all behaved as documented):
   - Stale/wrong `contentHash` on submission -> rejected with `"Question changed. Reload before sending. Your note remains saved."`
   - Cross-origin `Origin` header -> rejected with HTTP 403 `"Local same-origin requests only."`
   - Empty/whitespace-only note -> rejected with `"Add a note of 1–4000 characters."`
7. **UI verification via Playwright** (isolated automated-testing browser context, not Thomas's personal browser, per this assignment's environment): navigated to `admin.html`, clicked "Refresh inbox", and confirmed the test note renders correctly end-to-end in the real UI -- status badge "No change needed", the note text, the tag, the disposition summary, the `"Player update:"` line (publicSummary only), and the `"Administrator thought:"` line (the internal comment) all appear exactly as the API returned them. Screenshot saved and hashed: `output/work3-feedback-flow/screenshots/admin-panel-with-test-note.png` (sha256 `eec8ca483abd51068cf65808c7d1517cb7fbbbaa64fa09f8a6cf7a72fbd2ad23`). Also navigated to `decisions.html` and confirmed it renders its five staged revised-question examples and the general-feedback form correctly, with no console errors beyond an unrelated `favicon.ico` 404.

## Findings

### Positive: the documented privacy/scoping boundaries actually hold
The single most important thing this assignment asked Work 3 to check -- whether the feedback workflow behaves as documented, especially around what a player can and cannot see -- held up under live testing, not just code reading. Owner-scoped player views, the admin/internal-note separation, and the same-origin/hash-staleness guards all worked exactly as `FEEDBACK-WORKFLOW.md` and the source describe. No defect found here.

### Finding 1 (low-severity, verified): `tmp/` is not gitignored anywhere in this repo
Checked `.gitignore` in this worktree (identical to the tracked repo `.gitignore`, since it's a tracked file): it has no `tmp/` entry. `git status` reports `tmp/` as untracked (`??`), meaning a `git add -A` or `git add .` in a checkout that has ever run this feedback workflow **would stage real coach/player feedback notes** -- including exact scene positions, question text, and free-text notes -- for commit. This is a real, currently-true gap (confirmed by reading the actual `.gitignore` in this session, not assumed), not a hypothetical. It does not affect this assignment's own boundaries (I never ran `git add`), but it is a concrete repair-worthy item for whoever owns this repo's `.gitignore`.
**Suggested fix**: add `/tmp/` (or `/tmp/coaching-feedback/`) to `.gitignore`.

### Finding 2 (informational, not a defect): dev server bind address gotcha
The already-running Vite dev server for this worktree bound to `[::1]:5199` (IPv6 loopback) rather than `127.0.0.1:5199` (IPv4). A `curl http://127.0.0.1:5199` check returned connection-refused even though the server was healthy and answering on `localhost`/`[::1]`. Worth knowing for any future session testing this same local-only endpoint pattern -- use `localhost`, not a hardcoded `127.0.0.1`, when probing it.

### Scope note: what this pass did NOT do
- Did not exercise the actual in-app "Leave a thought" widget inside the practice-arena player UI (the one described in `FEEDBACK-WORKFLOW.md`'s "Experimental questions now include Leave a thought and My feedback history" paragraph) by clicking through a live question in the arena itself; verification here was via `admin.html`, `decisions.html`, and direct API calls, which exercise the same server-side contract the in-arena widget also calls. If a future pass wants pixel-level UI verification of that specific widget, that is additional, not yet done, work.
- Did not test the Supabase/production feedback path -- correctly out of scope per this assignment's explicit boundary ("do not resume Supabase").
- Did not modify, delete, or file a real disposition against any real (non-synthetic) feedback entry, because none existed in this fresh isolated worktree to begin with.

## Test artifacts left behind (all confined to this worktree, all clearly labeled synthetic)

- `tmp/coaching-feedback/inbox.jsonl` -- one synthetic receipt, note text begins `"WORK3-TEST: isolated worktree end-to-end feedback submission check, not real coach feedback."`
- `tmp/coaching-feedback/dispositions.jsonl` -- one synthetic disposition (`no-change`) and one synthetic internal comment, both clearly labeled `WORK3-TEST` in their text.
- These are left in place, not deleted, as the verification trail for this report (consistent with this assignment's "do not invent work, keep exact evidence" requirement) -- an intact record beats an unverifiable claim of having tested something. They live only in this disposable worktree's `tmp/` (confirmed untracked/uncommitted) and were never near any production or Thomas-facing storage.
- `output/work3-feedback-flow/screenshots/admin-panel-with-test-note.png` -- real screenshot, sha256 recorded above.
