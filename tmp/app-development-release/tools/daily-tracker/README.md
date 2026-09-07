# RinkReads Daily Tracker

A local dashboard for `docs/roadmap/TASKS.md`. Separate from and unrelated to
BlueChip's daily tracker (different repo, different port, no shared code).

## Files

- `rinkreads-daily-tracker.html` — the dashboard UI (served by the local server, not opened directly via `file://`).
- `rinkreads-server.mjs` — local server (`127.0.0.1:8788`), reads/writes `docs/roadmap/TASKS.md`.
- `rinkreads-tasks-parser.mjs` / `rinkreads-tasks-ops.mjs` — pure parse/serialize and remove/add/move logic (unit-tested).
- `start-rinkreads-tracker.cmd` — double-click to start the server.

## Use it

1. Run `npm run daily-tracker` (or double-click `start-rinkreads-tracker.cmd`).
2. Open `http://127.0.0.1:8788/`.
3. Remove, add, or move items. Nothing writes to disk until you click **Save**.

TASKS.md stays the one canonical source — this tracker reads and writes the
real file directly, with a timestamped backup in
`docs/roadmap/.tracker-backups/` before every save.

## What it does NOT do

- No Notion sync.
- No editing an item's internal text/formatting — only whole-item remove, add,
  and move between sections.
- No auto-generated Changelog entries — marking something done just removes
  it from its section; write the actual changelog line the normal way (in a
  Claude Code session, or by hand).
- No concurrent-edit detection yet — if TASKS.md changes on disk after the
  tracker loaded it, Save will overwrite those changes. Don't leave the
  tracker open for hours while also editing TASKS.md elsewhere.
