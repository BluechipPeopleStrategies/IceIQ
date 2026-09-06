# Curriculum coverage report — 2026-09-05

This is a count and instrumentation report, not a quality or learning-outcome
claim. It uses the current worktree composition described by `src/qbLoader.js`:
`src/data/bank.json` plus JSON files in `src/scenario/seeds/`. Re-run the
reproducible snapshot with:

```text
node scripts/report-curriculum-coverage.mjs
```

## Current-source catalog

The current worktree composition contains **290 unique IDs**: **262** rows
from the current main bank and **28** scenario-seed rows. This source-tree
count does not prove that a deployed build currently serves every row. The six age totals follow the runtime loader: bank rows use their containing age group; scenario seeds use their declared levels and are deduplicated against that group. The age totals currently add to 290.

| Age | Rows | Curriculum-node proxy* | Types | Category coverage |
|---|---:|---:|---|---|
| U7 | 40 | 6 | mc 19, mistake 5, next 7, scenario 1, tf 8 | Defensive Play 5; Hockey Sense 11; Offensive Play 11; Puck Skills 4; Transition & Compete 9 |
| U9 | 34 | 9 | mc 16, mistake 4, next 4, scenario 4, tf 6 | Defensive Play 1; Hockey Sense 31; Offensive Play 1; Puck Skills 1 |
| U11 | 166 | 33 | mc 156, scenario 10 | Breakout 1; Defensive Play 26; Hockey Sense 32; Offensive Play 35; Offensive Zone 1; Puck Skills 26; Skating & Movement 20; Transition & Compete 25 |
| U13 | 38 | 12 | mc 11, mistake 4, next 4, scenario 12, seq 2, tf 5 | Breakout 1; Defensive Play 6; Hockey Sense 13; Offensive Play 9; Offensive Zone 1; Puck Skills 2; Regroup 1; Transition 3; Transition & Compete 2 |
| U15 | 11 | 7 | mc 1, mistake 3, next 2, scenario 1, seq 1, tf 3 | Defensive Play 2; Hockey Sense 4; Offensive Play 2; Transition & Compete 3 |
| U18 | 1 | 1 | mc 1 | Hockey Sense 1 |

\* “Curriculum-node proxy” uses `nodeId` where authored and otherwise the row
ID. It is not a count of distinct tactical situations: generated variants can
share a node, while missing node IDs prevent grouping. The U11 bank is
especially volume-heavy: most concept groups have five generated rows, with
shooting at six. That makes its 166 rows poor evidence of 166 distinct
situations.

## Concept and age gaps

The bank’s older U11 rows carry stable concept IDs across all 31 curriculum
concepts; most U7/U9/U13/U15/U18 bank rows do not carry `conceptId` or
`concepts`, so the lower-age concept picture is partly inferred from seed
`nodeId`s and category labels. That missing tagging is itself a coverage-data
gap.

Concrete underrepresented areas by current-source count:

- **U18:** one MC row, one Hockey Sense category, and one curriculum-node proxy.
  No live TF, sequence, mistake, next, or scenario-seed row is assigned to U18.
- **U15:** 11 rows across seven curriculum-node proxies; no live Puck Skills or Skating &
  Movement category row.
- **U9:** 34 rows, but 31 are labelled Hockey Sense; Puck Skills, Defensive
  Play, and Offensive Play each have one row. This is a tagging/content mix
  gap, not proof that the questions are educationally weak.
- **U7:** six curriculum-node proxies behind 40 rows, with the rows concentrated in four
  generated concepts (`decision-making`, `time-and-space`,
  `reading-the-play`, and `creativity-under-pressure`).
- **Type progression:** U11 has no live non-MC bank rows and only ten scenario
  rows; U18 has MC only. Sequence, mistake, and next formats are absent from
  U18 and sparse at U15.

The six ledger domains (`src/data/curriculum-ledger.json`) include Skating &
Movement, Puck Skills, Hockey Sense, Offensive Play, Defensive Play, and
Transition & Compete. The current bank’s older rows cover all six at U11, but
the age-level counts above show that this breadth is not carried forward to
U15/U18. Counts do not establish whether a domain is taught well or at the
right difficulty.

## Approved versus experimental/staged material

## Experimental 200-scenario bank

The isolated experimental composition is assembled by
`tools/experimental-bank-files.mjs` and
`src/one-on-one/experimentalExpansionCore.js`: 100 original scenarios, 100
new scenarios, and 100 additive scenario extensions compose to **200 scenarios
and 1,600 questions**. It is explicitly isolated from `qbLoader.js`, marked
`experimental-not-approved` in the export path, and must not be added to the
approved/current-source totals above.

Normal practice enables the non-`explain` questions and keeps one explain
question per scenario as an **optional reflection**. That yields **1,300
non-reflection practice questions plus 200 optional reflections, or 1,500 visible prompts**. The authored type totals
and enabled counts are:

| Age | Scenarios | Questions | Non-reflection practice | Optional reflections | Authored types |
|---|---:|---:|---:|---:|---|
| U7 | 20 | 160 | 130 | 20 | choice 56, multi 26, position 28, sequence 20, explain 30* |
| U9 | 30 | 240 | 195 | 30 | choice 79, multi 46, position 43, sequence 27, explain 45* |
| U11 | 50 | 400 | 325 | 50 | choice 125, multi 75, position 75, sequence 50, explain 75* |
| U13 | 50 | 400 | 325 | 50 | choice 124, multi 76, position 75, sequence 50, explain 75* |
| U15 | 30 | 240 | 195 | 30 | choice 73, multi 47, position 45, sequence 30, explain 45* |
| U18 | 20 | 160 | 130 | 20 | choice 50, multi 30, position 30, sequence 20, explain 30* |

\* Type totals are authored totals. Some scenarios contain more than one
`explain` prompt, while normal practice exposes one optional reflection;
therefore authored explain totals (300) exceed the 200 enabled reflection
slots. Counts use the runtime `selectPracticeQuestions` helper, not authored totals minus a guessed number of reflections. The script also emits topic-to-scenario counts for each age without
expanding the report into a giant catalog.

The experimental schema carries age, version, family, topic, objective, tags,
sources, and per-question type and answer basis. It does not carry a stable
`conceptId` binding to the six-domain curriculum ledger. Its topic/family
vocabulary is also not normalized to those domains, so an age/topic count is
not evidence of complete curriculum binding. The scenario count is a
curriculum-node proxy only; it must not be described as a count of distinct
tactical situations.

## Approved versus experimental/staged material

The current-source count above treats only the runtime bank and scenario seeds as
approved/live. `docs/ai-pipeline/_queue-bank.json` has **32 staged rows** (U7
16, U11 8, U13 8); `docs/ai-pipeline/_reviewed-bank.json` has **172 staged
rows**. They are not added to live coverage: 24 queue IDs and 86 reviewed IDs
already overlap live IDs, so summing them would double-count content. These
files also do not provide a runtime promotion/status field that would justify
calling every staged row approved.

The 25 entries in `src/play/playCatalog.js` are a separate animated-play
catalog, not additional bank questions. Their `ageBands` make them playable
across age bands, but they do not carry the bank’s `cat`/concept tagging, so
they are reported separately rather than mixed into the table.

## What current telemetry can and cannot answer

The durable quiz-session shape assembled in `App.jsx` stores a session with
`results`, `score`, and a timestamp (plus `sessionLength` for the Supabase
write). Each result normally stores `id`, `cat`, `ok`, `d`, `type`, and often
`speedBonus`; timeout rows add `timedOut`. This supports counts and outcomes by
question ID, category, difficulty, and type for saved sessions.

The current schema does **not** persist a catalog/bank version or content
snapshot with a session. An ID can therefore be looked up against today’s
content but cannot prove what wording, answer, concept tags, or approval state
the player saw at attempt time. Historical results also do not carry a
historical age/level or position; those remain profile/context fields and can
change.

Question flags persist `questionId`, level, reason, and optional detail, but no
catalog version. The reflection journal is local-only and keyed by question ID:
it stores reason, timestamp, and the caller-supplied category (`qcat`), with no
player/session/age/version linkage. It can support a lightweight current
question-level reflection count, not an auditable cohort or curriculum result.

Animated-play telemetry is a separate bounded local log (last 200 events). It
stores `playId`, `nodeId`, event, answer IDs, correctness, elapsed milliseconds,
and optional kind/judgment fields. It has no player ID, age band, catalog
version, session ID, or reflection linkage, so it cannot currently support
age-specific play coverage or longitudinal outcome claims.

Experimental practice telemetry is richer: each local event carries
`scenarioId`, `scenarioVersion`, `questionId`, optional `contentHash`, question
basis/type, and event-specific attempt/retry, view-association, scene-match,
reflection-skip, flag-category, or camera-action fields. This supports
version-aware local practice reports and distinguishes checks from optional
reflection skips. The separate attempt records are keyed by player and
scenario version and preserve response/review state.

The experimental analytics state still has an anonymous local session ID and a
global device key, not a player ID or server receipt. New events now retain the authored scenario age band, topic and family. The insights view groups question views by authored age and topic; older events remain explicitly unknown rather than being assigned today's metadata. This is lesson exposure, not a verified player-age cohort. Attempt
records have no event time, outcome history, or catalog-release identity. It
can report what this browser recorded for a versioned question, but cannot
establish deployed reach, distinct tactical situations encountered,
player-age-specific outcomes across players, experimental-versus-approved exposure,
or educational quality.
