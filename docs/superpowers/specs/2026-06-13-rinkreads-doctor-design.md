# RinkReads Doctor: a self-maintaining developer agent

Date: 2026-06-13
Status: Approved design, pending implementation plan
Scope: IceIQ / RinkReads codebase only (`C:\Users\mtsli\IceIQ`)

## Goal

A "developer agent" that keeps the RinkReads codebase healthy as content and code
get added and removed. It runs a deterministic health pass at most once every 24
hours, and only when RinkReads has actually been touched since the last run. When it
finds problems it surfaces them; when asked, it applies high confidence fixes on the
current branch. The design honors the standing no metered overage rule: the daily
pass is pure Node (zero LLM tokens), and the model only engages when the user runs
`/checkup` or says "fix it".

## What "broken" and "optimize" mean here

Two concerns, both tied to "things we add or remove":

1. Question bank and engine seed integrity (malformed scenarios, broken diagram
   markers, missing fields, schema drift).
2. Dead code and dependency hygiene (unused files and exports, broken imports, stale
   deps, stray backup/temp files left behind when things move).

Build, dev server, tests, and lint were explicitly out of scope for this agent.

## Non goals

- Does not run on a 24/7 cloud schedule or poll while idle.
- Does not commit to `main` or push to any remote (Vercel deploys `main`).
- Does not auto delete or auto rewrite anything on the session start pass.
- Does not flag `tools/` as dead code (that directory is a deliberate drawer of one
  off scripts).
- Does not add new npm dependencies (`knip`, `depcheck`, etc.) without a separate ask.

## Architecture

Three layers, cheapest first.

### Layer 1: deterministic doctor (free, Node)

`tools/rinkreads-doctor.mjs` orchestrates existing validators and a new scan, then
writes a report. It never calls the model.

Reuses existing tooling (runs each, captures pass/fail and parsed output):

- `npm run preflight` (`tools/preflight.mjs`): bank structural and schema checks, rink
  scene bounds and marker validity.
- `npm run qa:flagged` (`scripts/qa-sweep.mjs --warns`): quality sweep.
- `npm run gauntlet:audit` (`tools/gauntlet-audit.mjs`): bank audit.
- `npm run audit:curriculum` (`tools/curriculum-audit.mjs`): curriculum coverage.
- `npm run test:ledger` (`tools/curriculum-ledger-golden.mjs`): ledger golden test.
- `node .claude/skills/new-scenario/validate-seed.mjs <file>` over every seed in
  `src/scenario/seeds/` (wraps `tools/scenario-author/validate.mjs` `lintScenario`).

New module `tools/lib/deadcode-scan.mjs`, called by the doctor:

- Broken imports: parse every relative `import` in `src/**/*.{js,jsx}`, resolve
  against the filesystem (honor index files and `.js`/`.jsx` extensions), flag any
  that do not resolve.
- Unused files: build the import graph starting from `src/main.jsx` (entry is
  `index.html` to `src/main.jsx` to `src/App.jsx`); files under `src/` never reached
  are candidates. An allowlist covers dynamic imports and JSON data files to limit
  false positives.
- Stale deps: `package.json` dependencies never imported anywhere under `src/`;
  allowlist build time deps (vite plugins, postcss, tailwind).
- Cruft: stray `.bak`, `.ship.tmp`, and dated backup files sitting loose in
  `src/data/` (reported only, never auto removed; the `src/data/backups/` directory is
  intentional and is left alone).

Scope is `src/` only. `tools/` is excluded from dead code analysis.

Output:

- `docs/checkups/latest.md`: human readable, ranked errors then warnings then cleanup.
- `docs/checkups/latest.json`: machine readable, the file the agent reads.

Exit code mirrors health (non zero when there are hard errors) so the script is also
usable as a manual gate.

### Layer 2: trigger (free, hook)

SessionStart hook added to `IceIQ/.claude/settings.json`, written in Python to match
the existing BlueChip hook style.

Logic:

1. Read `IceIQ/.claude/.doctor-state.json` (gitignored). Compute
   `hoursSince = now - lastRun`.
2. Compute `hasActivity` = true if any tracked file under `src/`, `tools/`, or
   `src/scenario/seeds/` has `mtime > lastRun`, OR `git log` shows commits since
   `lastRun`, OR the working tree is dirty.
3. If `hoursSince >= 24` AND `hasActivity`: run `node tools/rinkreads-doctor.mjs`,
   update `lastRun`, and emit a one line `systemMessage`, for example:
   `RinkReads checkup: 2 bank errors, 3 dead files, 1 stale dep. See
   docs/checkups/latest.md; run /checkup to fix.`
4. Otherwise: do nothing, emit nothing, spend nothing.

This is the literal meaning of "every 24 hours when I have actively messed around
with RinkReads".

### Layer 3: agent and command (LLM, on demand only)

`IceIQ/.claude/agents/rinkreads-doctor.md` (tools: Read, Edit, Write, Bash, Grep,
Glob). It reads `docs/checkups/latest.json`, explains findings in plain language, and
on the user's go ahead applies only high confidence fixes:

- repair or remove a broken import,
- delete a file it has proven unreachable (after grepping for dynamic usage),
- fix malformed JSON the validators pinpoint to an exact location.

Judgment heavy items are listed but never auto changed: a scenario that lints clean
but reads wrong, a dependency that might be used dynamically, a file that is unused
now but is clearly work in progress.

Commit rules (the IceIQ policy): scope each commit to the files actually changed,
clear message plus a `Co-Authored-By` trailer, never push, never commit to `main`. If
the current branch is `main`, the agent stops and asks the user to branch first.

`IceIQ/.claude/commands/checkup.md` provides `/checkup`: force a fresh doctor run
regardless of the 24 hour gate, summarize the report, then offer to apply fixes.

## Data flow

```
SessionStart
  -> hook reads .doctor-state.json + checks activity/age
     -> (due) node tools/rinkreads-doctor.mjs
        -> runs preflight/qa/gauntlet/curriculum/ledger/seed validators
        -> runs deadcode-scan.mjs
        -> writes docs/checkups/latest.{md,json}, updates .doctor-state.json
     -> systemMessage one liner
  -> (not due) silent

/checkup or "fix it"
  -> rinkreads-doctor agent reads latest.json
     -> explains findings
     -> on approval: applies high confidence fixes, commits to current branch
```

## Error handling and false positives

- Dead code detection is inherently fuzzy, which is why the session start pass is
  report only and every fix needs the user's word.
- The scan errs toward under reporting (broad allowlists for dynamic imports, JSON
  data, and build time deps) so it does not cry wolf.
- The agent verifies each candidate before touching it (greps for dynamic usage,
  confirms unreachability) rather than trusting the scan blindly.
- `git` is the undo path; nothing is deleted without being shown first.
- If a reused validator script is missing or errors, the doctor records that check as
  "errored" in the report rather than crashing the whole pass.
- If the hook cannot run Node or read state, it fails silent (no crash on session
  start).

## Files created or changed

New:

- `tools/rinkreads-doctor.mjs`
- `tools/lib/deadcode-scan.mjs`
- `.claude/agents/rinkreads-doctor.md`
- `.claude/commands/checkup.md`
- `docs/checkups/` (generated `latest.md`, `latest.json`)

Changed:

- `.claude/settings.json` (add SessionStart hook)
- `.gitignore` (ignore `.claude/.doctor-state.json`; decide whether to track or ignore
  `docs/checkups/latest.*`)

## Open implementation details (resolve during planning)

- Exact allowlist contents for dynamic imports, JSON data files, and build time deps.
- Whether `docs/checkups/latest.*` is committed or gitignored.
- Whether the doctor should also lint `src/data/bank.json` directly or rely on
  `preflight` (which targets `src/data/questions.json`); confirm which file is the live
  bank vs a staging copy.
- npm script alias (for example `npm run doctor`) for manual runs.
