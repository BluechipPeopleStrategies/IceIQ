# RinkReads Admin Dashboard — Architecture

Living doc for the unified admin dashboard. Sessions 1 (foundation) and 2
(Questions tab) are in; Sessions 3 (Images library) and 4 (Stats / Trash /
engine wiring) still to come.

> The full original specification is in [ADMIN_BUILD_BRIEF.md](ADMIN_BUILD_BRIEF.md).
> This file documents what actually shipped and how to operate it.

## Quick start

```bash
# 1. Apply the schema (one-time, run in Supabase Dashboard → SQL Editor)
#    File: supabase/migration_0012_admin_schema.sql

# 2. Grant yourself admin access (uses service-role key, looks up by email)
npm run admin:grant -- you@email.com

# 3. Migrate the existing 700+ text questions
npm run admin:migrate-text -- --dry-run   # preview
npm run admin:migrate-text                # write

# 4. (When ready) Migrate the POV image content from Notion
#    Drop the export at data/pov-export.json, then:
npm run admin:migrate-pov -- --dry-run
npm run admin:migrate-pov

# 5. Visit /#admin in the running app while signed in as the admin user
```

## Schema

Full SQL: [supabase/migration_0012_admin_schema.sql](supabase/migration_0012_admin_schema.sql).

### `profiles.is_admin`

Added via `alter table … add column if not exists`. The existing `profiles`
table already keys off `auth.users(id)` and stores `role` (`player`/`coach`),
`name`, etc. Admin status is orthogonal to role — a coach or a player profile
can carry `is_admin = true`.

### `pov_images`

One row per generated image. Variants A/B/C/D of an archetype are 4 distinct
rows (per the locked design decision in the brief). Image-level fields
(`read_trigger`, `generation_tool`, `full_prompt`, etc.) live here so they
aren't duplicated across the questions that reference the image.

Soft delete via `killed_at timestamptz`. `status` workflow:
`Draft → Generated → Testing → Approved → Live` (plus `Killed`).

### `questions`

Single table for both legacy text questions and POV image questions.

| Column            | Notes                                                         |
|-------------------|---------------------------------------------------------------|
| `id`              | Stable, human-readable. e.g. `u9q42` or `u11_2v1_001a1`       |
| `type`            | `'text'` (legacy bank) or `'pov_image'` (Notion-sourced)      |
| `linked_image_id` | FK to `pov_images.id` (set null on image delete)              |
| `age_groups`      | `text[]` — multi-age supported (`['U7','U9']`)                |
| `format`          | `Multiple Choice` / `True/False` / `Hotspot` / `Multi-Select` / `Open Response` / `Sequence` |
| `concepts`        | `text[]` — taxonomy tags (e.g. `['Pass vs Shoot']`)            |
| `legacy_source`   | `jsonb` — original `questions.json` row, preserved for rink-type questions |
| `status`          | `Draft` / `Approved` / `Live` / `Flagged` / `Killed`           |

GIN indexes on `age_groups` and `concepts` for fast filtering by tag.

#### Why `legacy_source`?

This is the only deliberate deviation from the brief. The legacy bank
contains ~67 rink-interactive questions (`zone-click`, `drag-target`,
`hot-spots`, `lane-select`, etc.) whose schemas don't map cleanly onto the
brief's `format` enum. Rather than drop them or invent extra columns we
don't yet need, the migration preserves the original row inside
`legacy_source`. Session 4 (engine integration) reads back the structured
fields when rendering those questions live.

For non-rink questions the migration script also stores the original row in
`legacy_source` so the round-trip is lossless.

### Triggers

Both new tables share `set_updated_at()`. `created_at` defaults to `now()`,
`updated_at` is bumped on every UPDATE.

## Authorization & RLS

Every table has RLS enabled. Two policies per table:

1. **Read-published**: any authenticated user can `SELECT` rows where
   `status = 'Live' and killed_at is null`. This is what the live RinkReads
   app uses in session 4 when the engine starts pulling questions from
   Supabase instead of the bundled JSON.
2. **Admin-all**: any `auth.uid()` whose profile has `is_admin = true` can
   do anything (`SELECT`, `INSERT`, `UPDATE`, `DELETE`). Wrapped in
   `EXISTS (...)` so the JWT only needs to know the user id.

Service-role key bypasses RLS, so the migration scripts run regardless of
who's authenticated.

### Granting admin

```bash
npm run admin:grant -- you@email.com           # grant
npm run admin:grant -- you@email.com --revoke  # revoke
npm run admin:grant -- --list                  # list current admins
```

The script uses `auth.admin.listUsers()` (service role) to look up the
auth user by email, then upserts the profile row with `is_admin = true`.
If no profile row exists yet it creates a minimal one with `role = coach`
(arbitrary — the app will let the user fix it later).

## Routing

The admin shell mounts on the hash route `#admin`. The base RinkReads app
uses hash-based routing throughout (see existing `#parents`, `#coaches`,
`#players` flows in [src/App.jsx](src/App.jsx)). The brief's React Router
snippet is therefore inapplicable — this codebase has no router dependency.

| User-facing URL          | Internal `screen` value | Component                                          |
|--------------------------|-------------------------|----------------------------------------------------|
| `/#admin`                | `admin-dashboard`       | [src/admin.jsx](src/admin.jsx) — `AdminLayout`     |
| `/#parents`              | `parents`               | `ParentsPage` (existing)                           |
| (button on profile page) | `admin`                 | `AdminReports` (existing question-reports tool — unrelated) |

`AdminRoute` is the auth guard. Three states:
- `loading` — fetching profile; renders a centered spinner-ish line.
- `denied` — calls `onDenied(reason)` so the parent can `setScreen("home")`
  and clear the hash. Renders nothing in the meantime to avoid a flash.
- `ok` — renders children and passes `{ profile, email }` down.

## Migration scripts

All three live in [scripts/](scripts/) and follow the existing convention
(`.mjs`, manual `loadEnv()`, service-role client, batched upserts with
`onConflict: "id", ignoreDuplicates: true`).

### `migrate-text-to-supabase.mjs`

Reads `src/data/questions.json`, normalizes the legacy shape (`sit` → `question_text`,
`opts[]` → `options[{label,text}]`, `ok` index → letter, `d` → difficulty
enum, `levels[]` → `age_groups[]`, etc.), and inserts as `type='text'`,
`status='Live'`. The original row is preserved in `legacy_source`.

Idempotent: `on conflict (id) do nothing`. Re-run after editing
`questions.json` to import only the new rows.

Format mapping table:

| `questions.json` `type`         | New `format`       |
|---------------------------------|--------------------|
| (none / `mc` / `next` / `mistake` / `pov-pick` / `pov-mc`) | `Multiple Choice` |
| `tf`                            | `True/False`       |
| `seq` / `sequence-rink`         | `Sequence`         |
| `multi`                         | `Multi-Select`     |
| `hot-spots`                     | `Hotspot`          |
| `zone-click`, `drag-target`, `drag-place`, `multi-tap`, `lane-select`, `path-draw` | `Multiple Choice` (placeholder; full rink shape preserved in `legacy_source`) |

### `migrate-pov-to-supabase.mjs`

Skeleton ready to consume the Notion JSON export. Default file location is
`data/pov-export.json` (override via `--file=<path>`). When the file is
missing the script exits with the expected JSON shape printed inline so
the next person doesn't have to dig through this doc.

### `grant-admin.mjs`

Documented above under "Granting admin."

## Files added/modified in Session 1

**New:**
- [supabase/migration_0012_admin_schema.sql](supabase/migration_0012_admin_schema.sql)
- [scripts/grant-admin.mjs](scripts/grant-admin.mjs)
- [scripts/migrate-text-to-supabase.mjs](scripts/migrate-text-to-supabase.mjs)
- [scripts/migrate-pov-to-supabase.mjs](scripts/migrate-pov-to-supabase.mjs)
- [src/admin.jsx](src/admin.jsx) — `AdminRoute` + `AdminLayout`
- [ADMIN_BUILD_BRIEF.md](ADMIN_BUILD_BRIEF.md) (the original spec, saved to repo root)
- [ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md) (this file)

**Modified:**
- [src/App.jsx](src/App.jsx) — imports `admin.jsx`, adds `#admin` hash dispatch, adds `screen === "admin-dashboard"` render branch, excludes the dashboard from `BottomNav`
- [package.json](package.json) — adds `admin:grant`, `admin:migrate-text`, `admin:migrate-pov` scripts

## Deviations from the brief

| Brief said                                  | Built instead                                                              | Why |
|---------------------------------------------|----------------------------------------------------------------------------|-----|
| `<Route path="/admin/*">` via React Router  | `#admin` hash route, dispatched in App.jsx                                 | No `react-router-dom` in `package.json`; matches existing `#parents` pattern |
| Tailwind classes                            | Inline styles using the existing `C` color tokens from `shared.jsx`        | Tailwind isn't installed; CLAUDE.md says inline/style-block |
| `src/admin/AdminRoute.jsx` + `src/admin/AdminLayout.jsx` | Single `src/admin.jsx` exporting both                          | Matches the flat `src/` layout (`screens.jsx`, `widgets.jsx`, etc.) |
| `supabase/migrations/YYYYMMDDHHMMSS_*.sql`  | `supabase/migration_0012_admin_schema.sql`                                 | Matches existing flat naming in `supabase/` |
| `<h1>IceIQ Admin</h1>`                      | `RinkReads Admin`                                                          | App is RinkReads (CLAUDE.md) — IceIQ is the working-directory name only |
| Recreate `profiles` table                   | `alter table profiles add column is_admin`                                 | Profiles table already exists in `schema.sql` — adding a column is non-destructive |
| `questions` table per brief                 | + a `legacy_source jsonb` column                                           | ~67 rink-type legacy questions don't fit the `format` enum cleanly; preserving the source row makes session-4 rehydration trivial |

## Session 2 — Questions tab

Lives in [src/admin.jsx](src/admin.jsx). All UI is one file; format-specific
editors are sibling components (no further file split until session 4 starts
sharing them with the engine).

### What it does

- **Stat strip** — Total / Live / Approved / Draft / Flagged / Killed counts
  plus Text/POV split, computed from the unfiltered set.
- **Search** — case-insensitive substring match across `id`, `question_text`,
  `explanation`, every option's `text`, and `concepts[]`.
- **Filters** — chip rows for status, age (single-age filter, but rows store
  `age_groups[]`), format, type. Plus a "Show killed" toggle (off by default;
  killed rows are hidden so the live workspace stays clean).
- **Grouping** — `flat` / `by image` / `by age`. Image grouping uses
  `linked_image_id` and labels with `archetype · variant · id` from the
  `pov_images` lookup; rows without a linked image bucket into "Text-only".
- **Row** — collapsed: checkbox, id, status pill, type pill (POV/text), format,
  age chips, difficulty, 2-line text preview. Click expands.
- **Editor** — inline. Format-agnostic top: question text, age groups
  (multi-select chips), difficulty, format dropdown. Format-specific body
  dispatches off `row.format`:
  - **Multiple Choice** — option list, click letter to mark correct, add/remove
    rows; auto-relabels A/B/C…
  - **Multi-Select** — same UI but the correct-letter button toggles into a
    set; persisted as comma-joined `"A,C"`.
  - **True/False** — two pill buttons writing `correct_answer = "True"|"False"`.
  - **Hotspot** — three numeric fields (x, y, radius) writing
    `hotspot_coords = {x,y,radius}` (% of image, 0–100).
  - **Open Response** — free-form expected-answer textarea + an
    `is_auto_graded` checkbox.
  - **Sequence** — ordered list with up/down/remove + add. Items can be plain
    strings or `{text}` shapes (legacy data may use objects); the editor
    reads `item.text || item` and writes back as the typed shape.
  - Below the body: explanation, concepts (comma-separated → `text[]`),
    flag-reason (only shown when status is `Flagged`).
- **Status workflow** — five buttons under the editor (Draft / Approved /
  Live / Flagged / Kill). Active status outlined.
- **Soft delete + undo** — clicking Kill (single or bulk) sets
  `status='Killed'` + `killed_at = now()`. A toast pops at the bottom-center
  with a 30-second countdown and an Undo button. Undo restores each affected
  row's prior `status` + `killed_at` (per-row, since prior statuses can
  differ in the bulk case).
- **Bulk actions** — checkbox-select rows, sticky bar at top shows the
  selection count and one-click status changes (including Kill, which routes
  through the same undo flow).

### Persistence

All writes go through new helpers in [src/supabase.js](src/supabase.js):

- `listAdminQuestions()` — full table, ordered for stable grouping.
- `listAdminPovImages()` — full table, used for the image-group lookup.
- `updateAdminQuestion(id, patch)` — debounced 600ms inside the editor; only
  whitelisted columns (`QUESTION_PATCH_COLUMNS`) are forwarded so the editor
  can hand it the whole row without leaking server-managed fields like
  `created_at`/`legacy_source`.
- `bulkUpdateAdminQuestions(ids, patch)` — single round-trip via `.in("id",ids)`.
- `killAdminQuestion(id)` / `unkillAdminQuestion(id, restoreStatus)` — thin
  wrappers around `updateAdminQuestion` with the `Killed` status + `killed_at`
  semantics. Undo bypasses these and uses `updateAdminQuestion` directly so
  it can restore each row's specific prior status.

Reads/writes are all gated by the `questions_admin_all` RLS policy; service
role is **not** used in the UI (the dashboard runs as the signed-in admin
user via the anon-key client).

### Things deliberately not in Session 2

- **Hard delete + Trash recovery view** — that's Session 4. Killed rows are
  hidden by default but visible via the toggle, so admins can still see
  what's been killed if they want to.
- **Image creation / upload** — Session 3. The Questions tab can read and
  link to existing `pov_images` rows but can't author or upload images.
- **Stats dashboard** — Session 4.
- **Engine wiring** — the live RinkReads quiz engine still reads from the
  bundled `questions.json` via `qbLoader.js`. Session 4 flips it to read
  from `questions` (status='Live', killed_at IS NULL).
- **Pagination beyond Load-more** — soft cap of 150 visible rows; click to
  load the next 150. Adequate for the current ~700-row corpus.
- **Optimistic-conflict resolution** — last-writer-wins. Two admins editing
  the same row at the same time will clobber each other's changes; not a
  problem at one-admin scale.

### Files modified

- [src/admin.jsx](src/admin.jsx) — added `QuestionsTab` and helpers; layout
  shell now dispatches to it when `tab === "questions"`.
- [src/supabase.js](src/supabase.js) — added `listAdminQuestions`,
  `listAdminPovImages`, `updateAdminQuestion`, `bulkUpdateAdminQuestions`,
  `killAdminQuestion`, `unkillAdminQuestion`.

## Coming in later sessions

- **Session 3 — Images tab:** library view, image editor with prompt history, read-clarity test, Supabase Storage upload.
- **Session 4 — Stats + Trash + engine wiring:** stats dashboard, trash recovery, hard delete with confirmation, switching the live engine over from `questions.json` to the Supabase `questions` table (via the `Live + non-killed` RLS read policy).

## Operations notes

- **`review_questions` is not deprecated yet.** Keep it; the seed/pull
  scripts still work. Session 4 will reconcile and (if desired) drop it.
- **Anon-key client used by the app** (`src/supabase.js`) cannot read the
  new tables for non-admin users until session 4 flips the engine over —
  RLS allows reads only on `Live + non-killed`, which is fine.
- **Service-role key** is required for all three scripts and lives in
  `.env` as `SUPABASE_SERVICE_ROLE_KEY`. Never commit it.
