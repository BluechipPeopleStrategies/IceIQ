# In-App Playtest Feedback (dev-bypass)

Date: 2026-06-13
Status: Design approved, ready for implementation plan
Author: brainstorming session (Thomas + Claude)

## Context

While playtesting RinkReads (the Cognitive Gym drills and the scenario/reads side), the owner
wants to leave feedback in the moment, from inside the running app, and have it uploaded to the
server. The app already has a dev-bypass mode (`src/utils/devBypass.js`, LS flag
`rinkreads_dev_bypass`, secret URL `?devbypass=puck`) used by the owner for testing, and a
Supabase backend (`src/supabase.js`) with existing client-write feedback patterns
(`recordQuizFeedback` into `quiz_feedback`).

The existing `quiz_feedback` table only accepts inserts from an authenticated user
(`auth.uid() = player_id`), so an anonymous dev-bypass session cannot write to it. The owner
confirmed they playtest while signed in as the owner account, which lets a secure, owner-scoped
insert work. Migrations here are applied by hand (pasted into the Supabase dashboard); the latest
security-hardening migration (0018) is flagged as unsynced, so a new table must ship its own RLS.

## Goals

1. A feedback button available inside the running app while dev-bypass is on, on every screen.
2. One tap captures a typed note plus auto-context, a category, and a screenshot of the game,
   and uploads it to Supabase, with a clear success/failure confirmation.
3. Secure by default: only the owner (either of two allowed emails) can write or read this feedback.
4. Close the loop: the feedback comes back to the dev session (Claude) via a pull script, so it is
   acted on like chat feedback, not left sitting in a table.

## Non-goals (v1)

- No anonymous or public feedback path. Writing requires the authenticated owner.
- No `html2canvas`-style full-screen capture (would need a new dependency). Screenshots are
  canvas-only (the gym drills); see Screenshot handling.
- No in-app feedback viewer. The owner reads entries in the Supabase dashboard for now. An
  in-app dev viewer is an easy follow-up, deliberately out of v1.

## Architecture

### Component: `FeedbackWidget`
A single React component mounted once at the app root. It renders **only when dev-bypass is on**
(`isDevBypassEnabled() || import.meta.env.DEV`); otherwise it returns null, so normal users never
see it. UI:
- A small floating button fixed bottom-right.
- Tapping opens a panel with: a textarea (the note), category chips
  (bug / idea / difficulty / art-visual / copy), an "include screenshot" toggle (on by default,
  disabled with a hint when no game canvas is present), a Send button, and a status line.
- On send it builds the payload, uploads, and shows "Sent" on success or the error message on
  failure. The panel stays open on failure so the note is not lost.

The dev-bypass check is a UI gate only. The real security gate is RLS (owner-only), so even if the
button were shown, a non-owner could not write.

### Pure helpers (unit-testable): `feedbackContext.js`
- `sanitizeNote(note)`: trim and cap at 2000 chars; empty becomes null.
- `buildFeedbackContext({ screen, drillTitle, version, viewport, userAgent, nowIso })`: returns a
  normalized context object (omitting empty fields). No DOM access; the widget passes values in.
- `CATEGORIES`: the allowed category list; `isCategory(x)` validates.

### Screenshot capture (in the widget, not unit-tested)
At send time, if "include screenshot" is on, find the active game canvas
(`document.querySelector("canvas.gym-canvas")`, falling back to the first `<canvas>`), draw it to
an offscreen canvas downscaled to max 720px wide, and encode `toDataURL("image/jpeg", 0.7)`. The
gym canvases are drawn from shapes and text (no cross-origin images), so they are not tainted and
`toDataURL` is safe. If no canvas is present, no screenshot is attached.

### Server helper: `savePlaytestFeedback(payload)` in `supabase.js`
A write (not fire-and-forget): inserts a row and RETURNS `{ ok: true, data }` or
`{ ok: false, error }` so the widget can confirm to the user. Reads the current user id from
`supabase.auth.getUser()` for `author_id`. Returns `{ ok: false, error: "offline" }` when
`supabase` is null (env missing) so the widget can disable Send with a clear note.

## Data model

New migration `supabase/migration_0019_playtest_feedback.sql` (idempotent, owner runs it in the
dashboard):

```sql
-- Migration 0019: playtest_feedback (in-app dev-bypass feedback while playtesting).
-- Owner-only insert and read. Paste into Supabase Dashboard -> SQL Editor -> Run. Idempotent.
create table if not exists public.playtest_feedback (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  screen      text,
  drill       text,
  category    text,
  note        text,
  context     jsonb,
  screenshot  text,          -- downscaled JPEG dataURL (inline; dev-only, low volume)
  app_version text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_playtest_feedback_created
  on public.playtest_feedback(created_at desc);

alter table public.playtest_feedback enable row level security;

-- Owner emails allowed to write and read. Keep BOTH lists in sync.
-- Replace the BlueChip placeholder below with the real address before running.
drop policy if exists "owner inserts playtest feedback" on public.playtest_feedback;
create policy "owner inserts playtest feedback" on public.playtest_feedback
  for insert with check (
    auth.jwt() ->> 'email' in ('mtslifka@gmail.com', 'thomas@bluechip.example')
  );

drop policy if exists "owner reads playtest feedback" on public.playtest_feedback;
create policy "owner reads playtest feedback" on public.playtest_feedback
  for select using (
    auth.jwt() ->> 'email' in ('mtslifka@gmail.com', 'thomas@bluechip.example')
  );
```

Both owner emails are allowed (the Gmail and the BlueChip address) so the owner can be signed in
under either identity. `thomas@bluechip.example` is a placeholder: replace it with the real
BlueChip address (in BOTH the insert and select policies) before running the migration. The
email-claim sentinel matches the pattern already used by `quiz_feedback` (migration 0011) and the
admin policies (migration 0004). The service-role pull script (below) bypasses RLS, so it reads
all rows regardless of these email lists.

## Data flow

1. Owner enables dev-bypass (local `import.meta.env.DEV`, or `?devbypass=puck` in a deploy) and is
   signed in as the owner.
2. The floating button appears. Owner plays a drill, taps Feedback, types a note, picks a
   category, leaves the screenshot toggle on.
3. On Send: the widget runs `sanitizeNote`, `buildFeedbackContext` (screen from App props,
   drill title scraped from `.gym-drill-title`, `VERSION`, viewport, UA, ISO timestamp), captures
   the canvas JPEG if present, and calls `savePlaytestFeedback`.
4. `savePlaytestFeedback` inserts the row (RLS enforces owner-only). It returns ok/error.
5. The widget shows "Sent" and clears, or shows the error and keeps the note.
6. Closing the loop: at the start of a dev session, `npm run pull-feedback` fetches recent rows
   (service-role key, bypasses RLS), writes a markdown worklist and saves each screenshot to a
   file, so Claude reads the notes and acts on them like chat feedback. The Supabase dashboard
   remains available for manual browsing.

## Error handling

- Supabase not configured (`supabase` null): Send is disabled with "Server not configured" so the
  owner is not misled into thinking it uploaded.
- Insert error (RLS, network): surfaced verbatim in the status line; the panel and note persist.
- `toDataURL` failure or no canvas: feedback still sends, with `screenshot` null.

## Closing the loop: pull-feedback (the Claude-facing path)

`scripts/pull-feedback.mjs` mirrors the existing `scripts/pull-reviews.mjs` and
`scripts/pull-requests.mjs`: it loads `.env`, builds a Supabase client with the
`SUPABASE_SERVICE_ROLE_KEY` (which bypasses RLS, so it reads every row regardless of the owner
email lists), and pulls recent `playtest_feedback`. It then:

- Writes a markdown worklist to `docs/playtest-feedback-worklist.md` (most recent first): for each
  entry, the created date, category, screen/drill, the note, and the key context fields.
- Saves any inline screenshot dataURL to `docs/feedback-shots/<id>.jpg` and links it from the
  worklist, so the image can be opened.
- Prints a short summary (how many new entries) to the console.

Run with `npm run pull-feedback`. This is how playtest feedback reaches the dev loop: tap Feedback
in the game, it uploads, and next session the script surfaces it for action. It can later feed the
RinkReads Doctor `/checkup` (out of v1 scope, noted as an open item).

## Files

| File | Responsibility | Action |
|------|----------------|--------|
| `supabase/migration_0019_playtest_feedback.sql` | The table + owner-only RLS | Create |
| `src/supabase.js` | `savePlaytestFeedback()` write helper | Modify |
| `src/devtools/feedbackContext.js` | Pure: sanitizeNote, buildFeedbackContext, CATEGORIES | Create |
| `src/devtools/FeedbackWidget.jsx` | The dev-bypass-gated floating widget + screenshot capture | Create |
| `src/devtools/feedback-widget.css` | Widget styles | Create |
| `src/App.jsx` | Mount `<FeedbackWidget screen={screen} />` at the app root | Modify |
| `scripts/pull-feedback.mjs` | Service-role pull: recent feedback to a worklist + saved screenshots | Create |
| `package.json` | Add `pull-feedback` script | Modify |
| `scripts/test-feedback.mjs` | Unit tests for the pure helpers | Create |

## Testing

Plain `node --test` (repo convention), pure helpers only:
- `sanitizeNote`: trims, caps at 2000 chars, empty becomes null.
- `buildFeedbackContext`: includes screen/drill/version/viewport/UA/timestamp, omits empty fields,
  output is JSON-serializable.
- `isCategory`: accepts the five categories, rejects others.

The screenshot capture (canvas/DOM) and the Supabase insert (network/RLS) are verified by
playtesting: enable dev-bypass while signed in as owner, send a feedback note from a drill, and
confirm the row (with screenshot and context) appears in the dashboard.

## Open items

- Fill the real BlueChip owner email into migration 0019 (both policies) in place of the
  `thomas@bluechip.example` placeholder before running it.
- Later, feed `pull-feedback` output into the RinkReads Doctor `/checkup` loop so playtest notes
  surface automatically in the health pass.
- Whether to add a tiny in-app "feedback log" viewer later (owner-read RLS already allows it).
- If screenshots get large or frequent, graduate from inline JPEG to a Supabase Storage bucket.
- Confirm migration 0019 is run in the live Supabase project before relying on uploads in a
  deploy (local dev still needs the table to exist in the connected project).
