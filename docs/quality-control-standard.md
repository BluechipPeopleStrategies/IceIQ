# Shared BlueChip / RinkReads quality-control standard

Synced copy. Canonical source of truth: `C:/Users/mtsli/BlueChip/references/video/quality-control-standard.md`
— update both when either changes. Design decision:
`C:/Users/mtsli/BlueChip/docs/superpowers/specs/2026-09-19-shared-qc-standard-design.md`.

RinkReads is a BlueChip-owned brand, but this repo and `bluechip-os` stay
separate (this repo is public/Vercel-deployed; BlueChip's is private and
holds business PII). This doc is what the two projects share on purpose,
not a step toward merging the repos.

## Shared principles (both projects already practice these)

- **A passing check is not evidence of the thing that matters.** A green
  test suite proves the tests ran, not that the app builds or loads. Verify
  the actual artifact — see the build-verification gate below.
- **Scope every commit to what changed.** Already this repo's own rule
  ("stage only the files for the change at hand... never `git add -A`").
- **Staged promotion before anything goes live.** This repo's own
  content-factory gate (tactical claim → deterministic kernel → physics →
  Claude judgment → conservative staged promotion → provenance) is the same
  discipline BlueChip applies to video (proof ladder: representative
  treatment → stills → motion proof → full-cut review), just applied to
  question-bank content instead of video. No change here — recorded so it's
  legible as one shared philosophy.
- **Token discipline.** Already this repo's own rule (don't read `App.jsx`
  or the JSON banks in full; targeted ranges; snippet placeholders).

## Where this repo intentionally differs from BlueChip — do not import these

- **Push/publish authorization.** BlueChip auto-pushes after every commit
  to a deliverable doc. This repo does not: publishing/pushing follows the
  current task's explicit authorization, because this repo auto-deploys to
  production straight off `main` via Vercel. An auto-push here is an
  auto-deploy. Never adopt BlueChip's blanket auto-push habit in this repo.
- **Mandatory pre-merge review.** BlueChip requires an independent reviewer
  pass before video/content work is called done. This repo does not have an
  equivalent for code merges — considered and deliberately not adopted on
  2026-09-19 (would add real friction to a live, largely solo-shipped
  product). Revisit only if the build-verification gate below proves
  insufficient by itself.

## Build-verification gate (added 2026-09-19)

`npm run test:practice` runs unit tests only — it never parses or builds
`src/App.jsx`, the ~8,000-line entry point. **A green suite is not evidence
the app builds or loads.**

On 2026-09-07 a merge left two byte-identical `const PlayerLearningHome =
lazyWithReload(...)` declarations in `App.jsx` — git auto-merged both sides
with no conflict marker. Hard Babel parse failure on every page load. It
passed the full 648/648 suite and a repo-wide conflict-marker sweep, then
reached `origin/main` and broke production. Thomas caught it by opening the
dev server, not by any check passing or failing.

**Before any commit touching `src/` is pushed to `main`:**

1. Run `npm run build` (what Vercel actually runs — catches everything), or
   for a fast sanity check: `node -e "require('@babel/parser').parse(require('fs').readFileSync('src/App.jsx','utf8'),{sourceType:'module',plugins:['jsx']})"`
   (`@babel/preset-react` is not installed standalone — use `@babel/parser`
   with the `jsx` plugin, not `@babel/core` with presets).
2. After any merge or reconciliation touching `src/`, sweep for the known
   artifact class — duplicate top-level declarations git can silently
   auto-merge:
   `grep -oE '^const [A-Za-z0-9_]+ = lazyWithReload' src/App.jsx | awk '{print $2}' | sort | uniq -d`

This supplements, not replaces, `npm run test:practice` and the existing
AUTO-COMMIT scoping rule in `CLAUDE.md`.

## Video/content QC

Not this repo's concern directly. Any RinkReads-branded video BlueChip
produces (demo, launch piece, case study, ad) goes through BlueChip's own
four-gate system (Craft/Policy/Assets/Sync) — see the canonical doc.
