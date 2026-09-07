# RinkReads Daily Tracker — design

**Status:** design, approved by Thomas 2026-07-12 · **Date:** 2026-07-12
**Precedent:** BlueChip's `tools/daily-tracker/` (separate repo) — same philosophy
("keep it simple," Notion/canonical-source stays authoritative, no full markdown
editor), different implementation (Node instead of Python, TASKS.md instead of a
Notion database).
**Goal:** A local, standalone dashboard that shows RinkReads' `docs/roadmap/TASKS.md`
as a Today / This Week / Later / Waiting / Done view, and lets Thomas remove, add,
and move items between sections without hand-editing markdown — while TASKS.md stays
the single canonical source of truth (no second task list to keep in sync).

---

## 1. Why this exists

Thomas already has a working daily tracker for BlueChip (`tools/daily-tracker/` in
the BlueChip repo): a standalone HTML dashboard with local storage and an optional
Notion sync. He asked whether he could have "a BlueChip daily dashboard tracker and
a RinkReads" — two separate, independent tools, not one shared dashboard. RinkReads
has no Notion Tasks database equivalent to sync against (its Notion presence is a
one-way page mirror of `TASKS.md`, not a queryable database of task rows), so the
natural canonical source for a RinkReads tracker is `TASKS.md` itself.

## 2. Scope

**In scope:**

- Parsing `TASKS.md` into a structured view (NOW/NEXT/LATER/PARKING LOT/Changelog).
- Displaying that structure as five sections: Today, This Week, Later, Waiting, Done.
- Three edit actions — remove, add, move between sections — that write back to the
  real `TASKS.md` file on disk, via a small local Node server.
- Backups before every write.

**Out of scope (this spec):**

- Any Notion sync. `TASKS.md`'s existing one-way page mirror is untouched.
- Editing an item's internal formatting (title/description/links) — items are
  opaque text blocks; only whole-item add/remove/move is supported.
- Auto-generating Changelog entries. Marking something done just removes it from
  its section; writing a good changelog line stays a Thomas-and-Claude-Code
  activity in a normal session, the same as today.
- Drag-to-reorder within a section.
- Any connection to the BlueChip tracker. Fully separate tool, separate repo,
  separate port, no shared code.

## 3. TASKS.md → dashboard mapping

| TASKS.md section | Dashboard bucket | Editable? |
|---|---|---|
| `## 🔵 NOW` | **Today** | yes |
| `## 🟢 NEXT` | **This Week** | yes |
| `## ⚪ LATER` | **Later** | yes |
| `## 🅿️ PARKING LOT` | **Waiting** | yes |
| `## Changelog` | **Done** | read-only |

The header block (title, **Last updated**, **Scope**, **Branch**, **Notion
mirror** lines, and the `---` separator) is preserved verbatim on every write —
the tracker never edits it.

## 4. Parsing model

Each section is a flat list of items. An item is everything from one top-level
list marker (`- ` or `N. `) up to (but not including) the next top-level list
marker or the next `## ` heading — in practice, in the current file, that's
exactly one bullet's full text (title + description), since no section currently
uses multi-line sub-bullets. The parser does not look inside an item's markdown
(bold, links, inline code) — it is stored and round-tripped as an opaque string.
This is deliberate: it means every item the tracker does *not* touch this session
is byte-for-byte identical in the rewritten file, so diffs stay small and
predictable, and there's no risk of the tool "fixing" formatting it doesn't
understand.

NEXT's numbered list (`1.`, `2.`, ...) is renumbered on write if items were
added, removed, or reordered by a move, so it stays a clean sequential list — the
other sections' `-` bullets need no renumbering.

## 5. Edit actions

- **Remove** — deletes one item from its section's list. Used for both "this is
  done" and "this isn't happening, drop it."
- **Add** — appends a new item (raw text Thomas types, in the tracker's textarea)
  to the end of a section's list. If the text isn't already wrapped as
  `**Title.** description`, it's inserted as-typed — no attempt to auto-format a
  title out of it.
- **Move** — removes the item from its source section and appends it to a target
  section. Implemented as remove + add, not a special third operation.

All three actions operate on the in-memory parsed structure client-side; nothing
touches disk until Thomas clicks **Save**, which POSTs the whole structure back.

## 6. Safety

- **Backup before write:** every `POST /api/tasks` copies the current `TASKS.md`
  to `docs/roadmap/.tracker-backups/TASKS.md.<ISO-timestamp>.bak` before
  overwriting. Backups accumulate; pruning old ones is a manual/future concern,
  not handled here.
- **NOW max-3 warning:** if a move or add would leave Today (NOW) with more than
  3 items, the UI shows a non-blocking warning (matches TASKS.md's own stated
  rule, "NOW — active front (max 3)") but does not prevent the save — Thomas may
  have a real reason to exceed it briefly.
- **Read-modify-write on load, not on every keystroke:** the server only writes
  when Thomas clicks Save, sending the full current structure. This v1 does
  **not** detect a concurrent edit — if `TASKS.md` changes on disk after the
  tracker loaded it (e.g. a Claude Code session edits it in the same window),
  Save will silently overwrite those changes. Known limitation, deferred to
  §10, not solved here.

## 7. Server API

Plain `node:http`, zero new dependencies (`node:fs`, `node:path`, `node:url` only
— same convention as `tools/gauntlet/` in this repo).

- `GET /api/tasks` → reads `docs/roadmap/TASKS.md`, parses per §4, returns JSON:
  `{ meta: { headerRaw: string }, now: string[], next: string[], later: string[],
  parking: string[], changelog: string[] }`. `headerRaw` is the untouched header
  block (title through the `---` separator) as one string, round-tripped verbatim.
- `POST /api/tasks` → body is the same shape (Thomas's edited version, `changelog`
  ignored/read-only). Backs up per §6, re-serializes each section back into
  markdown (renumbering NEXT), writes the file, returns the fresh parse of what
  was just written (so the client's view matches disk exactly, not just its own
  optimistic state).
- Static file serving for `rinkreads-daily-tracker.html` itself, so opening
  `http://127.0.0.1:8788/` in a browser is the whole "how do I start this" story
  once the server's running.

## 8. Client (HTML/JS, no framework, no build step)

Single HTML file, inline `<script>`/`<style>`, matching the BlueChip tracker's own
"no new dependencies" pattern. On load, `fetch('/api/tasks')`, render five
sections as cards with items listed underneath. Each item has a small "remove"
control and a "move to..." dropdown (target section). An "add" input pinned to
the bottom of each editable section. A single **Save** button POSTs the whole
current state; on success, re-renders from the server's returned fresh parse (not
the client's own optimistic state) so the UI always reflects what's actually on
disk after a save.

## 9. Testing

- **Parser round-trip test:** parse the real `docs/roadmap/TASKS.md`, re-serialize
  immediately with no edits, assert byte-for-byte (or whitespace-normalized)
  equality with the original — this is the core correctness guarantee for "the
  tool never corrupts what it doesn't touch."
- **Parser section-count test:** assert the parsed `now`/`next`/`later`/`parking`
  arrays have the expected item counts against the real file (a coarse sanity
  check, not exact-content assertions, so it doesn't need updating every time
  TASKS.md's content changes — only if a section is added/removed structurally).
- **Add/remove/move unit tests:** on a small in-memory fixture (not the real
  file), assert each of the three operations produces the expected structure,
  including NEXT renumbering after a move.
- **Server integration test:** spin up the server against a temp copy of
  TASKS.md (never the real file), exercise GET then POST then GET again,
  assert the backup file was created and the round-trip content matches.
- **Manual smoke test:** Thomas opens the real tracker once, adds a throwaway
  test item, removes it, confirms `git diff docs/roadmap/TASKS.md` shows no
  unexpected changes to anything else.

## 10. Open item for a later pass (not blocking this build)

Concurrent-edit detection (§6) — right now, if TASKS.md changes on disk between
when the tracker loaded it and when Thomas clicks Save, Save will silently
overwrite those changes with the tracker's (stale) view. Given Thomas and Claude
Code both edit this file, and the tracker isn't meant to be left open for hours,
this is a real but low-probability risk for v1 — flagged here rather than solved,
so it doesn't get lost. A future pass could have the server compare the file's
current mtime/hash against what GET returned and reject a stale Save with a
"reload and retry" error.

## 11. Decisions locked (2026-07-12)

- **Two fully separate tools.** No shared code or data with the BlueChip tracker.
  This one lives entirely in the IceIQ repo.
- **TASKS.md is canonical.** No Notion database, no second task list.
- **Editable, writes back to the real file** — via a local Node server (Approach
  A over the File System Access API, for reliable any-browser support and to
  reuse a pattern already proven by the BlueChip tracker).
- **Narrow edit surface:** remove / add / move only. No inline markdown editing,
  no auto-generated changelog prose, no drag-to-reorder.
- **Items are opaque strings.** The parser never looks inside an item's
  formatting — this is what guarantees untouched items round-trip exactly.
- **Backup before every write**, plus a soft (non-blocking) NOW-max-3 warning.
- **Port `127.0.0.1:8788`** (distinct from BlueChip's `8787`, so both can run
  at once).
