# RinkReads / IceIQ — Codex context

This repo's full context lives in `CLAUDE.md` (architecture, pricing, tiers,
question bank, scenario engine) and `ROUTING.md` (single source of truth for
every asset: bank, images, Supabase, symlinks). Read both before making
non-trivial changes — the same conventions apply regardless of which agent
(Claude Code or Codex) is doing the work.

## Canonical task list

`docs/roadmap/TASKS.md` is the one living priority/sequencing list, scope =
app build + content factory. Treat it as source of truth; after any RinkReads
work, keep it current (bump "Last updated" + add a changelog line). Dated
snapshots are archived under `docs/roadmap/archive/` — don't resurrect them.

## Second Brain sync (automatic — no action needed)

A `Stop` hook (`~/.codex/hooks.json` + `tools/second-brain-sync.mjs`) fires
after every Codex turn in this repo and appends any new commits since the
last check to Thomas's Obsidian vault at
`C:\Users\mtsli\SecondBrain\2-Areas\RinkReads.md` (section "Commit log
(auto-synced)"). Commits touching `docs/superpowers/specs/`,
`docs/superpowers/plans/`, or `docs/roadmap/TASKS.md` are flagged inline as
the file that carries the actual decision.

This means: **commit your work** (don't leave it staged/uncommitted) if you
want it to show up in the second brain — the hook only sees `git log`, not
the working tree. No separate action is needed to "capture" a session; the
commit itself is the capture.

## Specs & plans

Design specs live in `docs/superpowers/specs/`, implementation plans in
`docs/superpowers/plans/`. These are the durable record of *why*, not just
*what* — the second-brain sync surfaces them but does not replace them.
