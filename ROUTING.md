# Routing & Storage Map

A definitive map of where every piece of data lives — local disk, browser
storage, GitHub, Supabase, Notion. Audit completed 2026-05-02.

## TL;DR

There is exactly **one source of truth for each thing**:

| Asset                | Lives at (single source of truth)                                |
|----------------------|------------------------------------------------------------------|
| Live question bank   | `IceIQ/src/data/questions.json`                                  |
| Legacy archive       | `IceIQ/src/data/questions.legacy.json` (read-only)               |
| Mining candidates    | `IceIQ/src/data/questions.legacy-candidates.json`                |
| Question images      | `IceIQ/public/assets/images/`                                    |
| Coach portraits      | `IceIQ/public/assets/coaches/`                                   |
| Rink scene PNGs      | `rinkreads-author/public/assets/scenes/`                         |
| Sprite sheets        | `rinkreads-author/public/assets/sprites/`                        |
| Player data, ratings | Supabase                                                         |

The "RinkReads Workspace" folder is a set of **symlinks** — convenience
aliases pointing back at IceIQ / rinkreads-author. No data lives there.

## Local repo paths

| Repo               | Path                                | GitHub                                                          |
|--------------------|-------------------------------------|-----------------------------------------------------------------|
| IceIQ (player app) | `c:/Users/mtsli/IceIQ`              | `BluechipPeopleStrategies/IceIQ`                                |
| rinkreads-author   | `c:/Users/mtsli/Projects/rinkreads-author` | `BluechipPeopleStrategies/rinkreads-author`              |

Quarantined stale clones live at `c:/Users/mtsli/_archive-stale-iceiq/` —
these are the old `Documents/IceIQ` and `Projects/IceIQ` copies plus
stale `Downloads/questions*.json` snapshots from past Save & Ship downloads.
Safe to delete via Recycle Bin if disk space is needed.

## RinkReads Workspace symlinks

`c:/Users/mtsli/Projects/RinkReads Workspace/` is a curated landing pad. All
numbered sub-folders (except #1) are **symlinks**:

```
1. Inbox (drop new images here)        ← real folder, triage area
2. Live Question Images                → IceIQ/public/assets/images/
3. Rink Scenes                         → rinkreads-author/public/assets/scenes/
4. Sprite Sheets                       → rinkreads-author/public/assets/sprites/
5. Coach Portraits                     → IceIQ/public/assets/coaches/
6. Reference Pictures                  → IceIQ/Pictures/
7. Active Bank (questions.json)        → IceIQ/src/data/
8. Docs (Curriculum + Standards)       → IceIQ/
```

If a link breaks, recreate it with `mklink /D` from cmd.exe (run as admin).

## Browser-side storage (rinkreads-author)

The author tool runs in your browser at localhost during dev. It stores work
in two places **on your computer's browser profile** (not on a server):

| Where      | What                                    | Survives… |
|------------|-----------------------------------------|-----------|
| IndexedDB  | `rinkreads_questions_draft` (active bank with edits + uploaded images) | Browser restarts. Cleared by Reload-from-disk button or DevTools Storage clear |
| IndexedDB  | `fsa-handles` (FSA handles for `questions.json` + images dir) | Browser restarts; needs re-auth across browsers |
| localStorage | `rinkreads_compose_request/result`, `rinkreads_scenarios`, `rinkreads_scene_bg_id`, scene scale prefs, `rinkreads_auto_push`, `rinkreads_live_player_url`, `rinkreads_tracker_scope`, `rinkreads_author_meta_v*` | Browser restarts; small (UI prefs) |

**Critical understanding:** IndexedDB and localStorage are **not synced anywhere**.
If you nuke browser storage, your in-flight authoring work is gone.
Therefore:
- Save & Ship writes through to disk (FSA) → safe.
- Auto-ship-on-upload (committed `0003f49`) writes uploaded PNGs to disk
  immediately if the images dir handle is connected → safe.
- Reload from disk **clears IDB drafts before re-reading** → check for
  unsaved data URLs first (the safety guard does this).

## File System Access (FSA) handles

When you click the 📄 / 📁 badges in the rinkreads-author header, you grant
the browser permission to read/write specific paths on disk. The handles
are persisted in IndexedDB so the binding survives browser restarts.

You should bind:
- 📄 questions.json → `IceIQ/src/data/questions.json`
- 📁 images dir → `IceIQ/public/assets/images/`

If you bind them to anything else (e.g. one of the symlinks, or worse, a
stale clone), the author tool reads/writes the wrong file. The stale-clone
gotcha that hit on 2026-05-01 led to deleting `Documents/IceIQ/` and
`Projects/IceIQ/` so the file picker can no longer accidentally bind there.

## Cloud / external services

### Supabase

URL + ANON_KEY are public-by-design (Vite bakes `VITE_SUPABASE_*` into the
client bundle — that's how Supabase auth/anon access works). Row-level
security in the DB is the actual gate.

- `SUPABASE_SERVICE_ROLE_KEY` is in `.env` only and is **only** read by
  scripts in `scripts/` and `tools/`. Confirmed: never embedded in `dist/`.
- Tables in use (client-readable per RLS):

  ```
  profiles, teams, team_members, team_challenges, challenge_results
  assignments, assignment_completions
  questions, question_results, question_stats, question_reports
  pov_images, review_questions
  goals, training_sessions, self_ratings, coach_ratings
  quiz_sessions, quiz_feedback
  ```

- Storage bucket: `pov-images` (used by `scripts/upload-pov-images-to-storage.mjs`)
- Migrations checked in at `supabase/migration_*.sql` (10 files, 0002–0011)

### Notion

Read-only integration. Token (`NOTION_TOKEN`) lives in `.env` and is **only**
used by `scripts/export-pov-from-notion.mjs`. It never reaches the client
bundle (the only mention in `src/App.jsx` is a comment, not a usage).

### GitHub

Two remotes, both at `BluechipPeopleStrategies`:
- `IceIQ` (this repo)
- `rinkreads-author`

The rinkreads-author dev server exposes `/__/git-push` (vite middleware) —
that's the auto-ship endpoint that runs `git add -A && git commit && git push`
inside `c:\Users\mtsli\IceIQ` whenever you Save & Ship with auto-push enabled.
That's why you see the `author ship: ...` commits in IceIQ's history. The
endpoint is dev-only; production builds don't include it.

### GitHub Actions

`/.github/workflows/reset-demo-accounts.yml` — runs Mondays 06:00 UTC.
Resets the three demo logins (free / pro / coach) using
`SUPABASE_SERVICE_ROLE_KEY` from repo secrets. Manual trigger via Actions tab.

## Hosting (production)

No `vercel.json` / `netlify.toml` / `static.json` checked in. If the app is
deployed publicly, that's configured outside this repo (e.g., GitHub Pages
build action you set up in Settings, or a Vercel project pointed at the
repo). Worth confirming before public launch — currently the only "deploy"
path I can see is the manual `npm run build` that drops into `dist/`.

## Save flow during authoring

Step-by-step trace for "I uploaded an image, what happens":

1. Browser file picker reads the file → `FileReader.readAsDataURL` → data URL
2. `handleImageUpload` patches `bank.<question>.media.url = data:URL`
3. **NEW (commit 0003f49):** if 📁 images-dir handle bound, write the PNG
   directly to disk via FSA (`getFileHandle({create:true})` + `createWritable`)
   AND stamp `_lastShippedDataUrl` so the safety guard treats it as on-disk.
4. IDB auto-save (debounced 600ms) persists the bank to `rinkreads_questions_draft`
5. On 🚀 Save & Ship: bank is normalized → exported JSON has
   `media.url = /assets/images/<filename>` → written to `questions.json` via FSA
6. Auto-push hits `/__/git-push` → IceIQ commit + push

**If 📁 isn't bound:** step 3 is skipped, image lives only in IDB until
Save & Ship downloads the PNG. This is the "lost-image" risk class — toast
warning surfaces this on upload.

## What was cleaned during this audit (2026-05-02)

- Moved 6 stale `Downloads/questions*.json` files (~3.6MB) →
  `_archive-stale-iceiq/Downloads-stale-questions/`
- Deleted 9 `povQuestions.json.*.bak` files in `IceIQ/src/data/` (~3MB freed —
  these were old `sync:pov` backups, not in git history)
- (Earlier in the same session) Quarantined `Documents/IceIQ/` and
  `Projects/IceIQ/` to `_archive-stale-iceiq/` so the FSA picker can't
  accidentally bind to a stale clone

## Confidence checks you can run any time

```bash
# Where does my bank live?
find /c/Users/mtsli -name "questions.json" -not -path "*node_modules*" -not -path "*archive*"
# Should return exactly: c:/Users/mtsli/IceIQ/src/data/questions.json

# Are secrets in any built bundle?
grep -rl "SERVICE_ROLE\|NOTION_TOKEN" dist/
# Should return nothing

# Is .env tracked?
git ls-files .env
# Should return nothing
```
