# Task B summary: reproducible curriculum map

Generation command: `node tools/build-full-curriculum-matrix.mjs` (also regenerates
`docs/factory/curriculum-map/` via the pre-existing `node tools/build-curriculum-coverage.mjs`,
unchanged behavior, now exporting `DOMAIN_RULES`/`AGE_ORDER`/`geometryHash` for reuse).

## Catalogs found (not just the experimental bank)

Inspected `build-curriculum-coverage.mjs`, `build-experimental-curriculum-bindings.mjs`,
`build-question-catalog.mjs`, `src/qbLoader.js`, and `src/App.jsx` git history. Four LIVE
catalogs exist:

1. **experimental-bank** (1600 q / 200 scenarios) — the one the old tool covered.
2. **legacy-live-bank** (`src/data/bank.json`, 262 q) — the genuinely separate static
   per-age bank, loaded by `src/qbLoader.js`, used across App.jsx/PlayerLearningHome/
   LearningWorlds/PracticeLibrary/questionOfDay/review/screens/speedRound/teamChallenges.
   Rows carry an explicit `nodeId` into the ledger — stronger evidence than any keyword.
3. **scenario-engine-seed** (`src/scenario/seeds/*.json`, 28 rows) — merged into the live
   bank at runtime; some have drifted `nodeId`s no longer matching the locked ledger.
4. **pov-questions** (`src/data/povQuestions.json`, 280 q) — authored, but an exhaustive
   grep of `src/**/*.{js,jsx}` found zero importers/fetches. Not reachable in the app today.

Excluded, with reasons in `curriculum-matrix.json` meta: `scene-manifest.json` (asset
registry, not questions), `questions.json.ship.tmp` (dead per `deadcode-scan.test.mjs`),
`src/cognitive-gym/` (untagged drills, a different content type).

## U15/U18 Skating & Movement: MISSING CONTENT (high confidence)

Zero skating-movement matches at U15/U18 in **every** catalog above, using both explicit
bindings (legacy-bank `nodeId`, scenario-seed `nodeId`) and the loosest keyword signal
(prone to false positives like "edge") — the most generous method still finds nothing.
The ledger itself (`curriculum-ledger.json`, locked 2026-06-04) targets depth **R**
("refinement... at speed under random/opposed conditions") for all four skating-movement
concepts at U15 **and** U18 — the taxonomy expects this content to continue past U13 by
design. This rules out "missing mapping" (a mapping fix would need something to point at)
and "missing navigation" (nothing exists to be unreachable). Verdict: genuine content gap.

## U11 cause-and-effect: the naive count undercounted a real pattern

Prior claim (`prior-return/curriculum-gap-plan.json` #4): 14/400 (3.5%) "Imagine/Suppose"
prompts, called "a proportional dip." Explicit rule instead (`tools/lib/curriculum-changed-cue.mjs`):
a question counts only if it both (1) narrates/hypothesizes a concrete actor/puck state
change and (2) asks the learner to update/reconsider a read because of it — excluding
placement instructions, sequence-arrangement prompts, and already-fixed scene facts.
**Exhaustive, not sampled**: a two-pass regex swept all 400 U11 prompts for candidate
markers (171 found); every candidate was hand-read and classified (64 needed a call beyond
trivial exclusion). Result: **53/400 (13.3%)** genuine questions already exist — almost 4x
the naive count. The real gap: the pattern is scattered/unnamed, not its own family.

## Ranked gap backlog (8 items, `report.gapBacklog`)

1. U15/U18 skating-movement (missing-content, high) — unchanged small pilot.
2. U11 changed-cue family (missing-mapping-of-real-pattern, medium-high) — name it, don't
   pad volume; U13's 0.5% naive rate deserves the same hand-check, not done here.
3. pov-questions orphaned catalog (missing-navigation-exposure, high) — Codex/Thomas call.
4. Scenario-seed `nodeId` drift (missing-mapping, medium) — cleanup, not authoring.
5–8. Carried forward unverified (U7 vocabulary, U9 receive-on-the-move, U13
   coverage-match, goalie-observation-track), confidence: low.

## Tests

`tools/build-full-curriculum-matrix.test.mjs` — 17 passing: rule unit tests, per-catalog
fixture tests (drift/duplicate/unknown/reflection), real-data invariants (count
reconciliation, no duplicate IDs, unmapped-consistency, U15/U18 zero-guard, CSV shape). One
real bug found+fixed: `loadExperimentalRows` could report `mappingMethod:'unmapped'` while
still carrying a domain id from a keyword-only signal; now consistent.
