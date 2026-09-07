# How team Game Sense is measured

**Coach review · 5 September 2026**  
**Scope:** current code audit and proposed measurement detail. No player data was queried and no scores were changed. [Open the standalone visual explanation](team-iq-measurement.html).

The landing-page **“Team IQ by concept”** card is an illustration, not a live measurement. Its team name, 16-player roster, five percentages and “9 of 16 players below 50%” sentence are fixed sample values. The actual coach dashboard calculates different, broader **competency** averages from saved quiz answers. It does not yet calculate the concept rows pictured in that card.

## The sample card

| Sample label | Displayed value | Where it comes from |
| --- | ---: | --- |
| Decision-Making | 72% | Hardcoded example |
| Compete | 88% | Hardcoded example |
| D-zone Coverage | 41% | Hardcoded example |
| Breakouts | 64% | Hardcoded example |
| Net-Front | 58% | Hardcoded example |

These values are not generated from a 16-player dataset. The red focus choice and “below 50%” claim are also fixed. They should be labelled as sample data until a real concept-level calculation exists.

## The live calculation, step by step

1. **Record a quiz answer.** Normal rows preserve question ID, category, correct/incorrect, difficulty, question type and speed bonus. Session history adds a score and completion date. Original selected answers, content versions, exposure and full first-attempt histories are generally not preserved in these rows.
2. **Map each ID to a competency.** The current resolver checks old ID patterns and assigns the first matching competency: positioning, decision-making, awareness, tempo control or leadership. It does not look up the current question's `conceptId`. Separately, any `type: "next"` row is counted toward leadership, even if it also mapped elsewhere.
3. **Calculate each player's competency accuracy.** For a mapped competency: `round(100 × correct answer rows ÷ all answer rows)`. Every stored repeat contributes equally. No difficulty, speed, age normalization, first-attempt bonus, time decay or coaching rating is included in this calculation. No matching answers returns 0, indistinguishable from measured 0% in this output.
4. **Calculate the team average.** Take the rounded player percentages **greater than zero**, average them with equal player weight, then round again. A player with one correct answer can have the same weight as a player with 40 attempts. A player who got every relevant answer wrong is currently excluded from the average, as is a player without relevant answers.
5. **Pick the focus.** Choose the lowest team competency among those with a positive contributing score. Count active players whose returned score in that competency is below the fixed 60% threshold. That count also includes active players with no relevant answers because their returned score is zero.

The last two steps contain a missing-data defect. An actual 0% needs to remain a measured result; no evidence needs a separate state. An accuracy threshold is also not, by itself, evidence of an age-standardized “developmental level.”

## A worked example using the current functions

This is an invented teaching dataset, evaluated with the actual local scoring functions. It is not a real team. The positioning rows deliberately use old recognised ID `u11q1`; Drew's separate awareness rows use `u11q16`.

| Player | Positioning answers | Player percentage | Current team-average treatment |
| --- | --- | ---: | --- |
| Alex | 3 correct / 4 recorded attempts | 75% | Included |
| Blair | 1 correct / 1 attempt | 100% | Included with the same weight as Alex |
| Casey | 0 correct / 4 attempts | 0% | **Excluded, despite measured evidence** |
| Drew | No positioning answers; 1/2 awareness answers | No positioning evidence; function returns 0 | Excluded |
| Ellis | No quizzes | No evidence | Excluded from active players |

**Current positioning result: `round((75 + 100) / 2) = 88%`.**

For comparison only, equal-player averaging that includes Casey's measured zero would be `round((75 + 100 + 0) / 3) = 58%`. Pooling all positioning answer rows would be `round(4 / 9 × 100) = 44%`. These answer different questions and are not new implemented formulas. The example shows why the denominator and weighting must be visible and chosen deliberately.

The same current calculation identifies **awareness at 50%** as weakest and reports **4 of 4 active players below 60%**, even though only Drew answered an awareness question. Alex, Blair and Casey have missing awareness evidence, not measured underperformance. A roster containing only Casey returns `activePlayers: 0` in the empty-populated-competency branch despite Casey's four attempts. That is another consequence of treating zero as absent.

## What currently influences the number

| Question | Current answer |
| --- | --- |
| Is it concept-level? | No. Five broad competencies using old ID patterns. The screenshot's five concept labels are illustrative. |
| First attempt versus repeat? | Equal weight for every saved result row across sessions. Historical skip placeholders can be replaced by later answers within a session; this is not a complete first-response log. |
| Time window? | All fetched quiz history for the players currently on the roster. No date, team-membership-start or age-band filter in the competency aggregation. “Focus this week” is a recommendation label, not a weekly data window. |
| Minimum evidence? | No attempt-count or distinct-question minimum. Any positive percentage can contribute. The individual GS report's three-session unlock is a separate display rule, not a per-concept evidence threshold. |
| Equal players or equal answers? | Equal positive player percentages for the competency card. The separate “Team accuracy” analytics tile pools answer rows instead. |
| Difficulty/speed? | Neither affects team competencies. The separate session score uses existing difficulty weights 1, 1.5 and 2.2; speed bonus does not enter that score. |
| Coach/self/parent ratings? | Not included in these quiz-derived competency/team calculations. Ratings are fetched and displayed separately in the player profile. |
| Practice points, XP or streaks? | Not included. Their current stores and reward rules are separate. |
| Missing evidence? | Individual competency result becomes 0. Team average drops it; the below-60% count may include it. This must be corrected before treating the output as a dependable measurement. |
| Are ages comparable? | No age normalization or established population norm in this team formula. A team label such as U11 does not supply that evidence. |

The separate Team Analytics section reports pooled all-time quiz accuracy and compares its recent seven-day accuracy with the preceding seven-day period, using stored date strings. Those are different figures from the all-history team competency bars. They do not add a recency window to the competency card.

## A second issue: the modern questions are not mapped

The current bank contains **262 questions; none of their IDs match the old competency regexes**. There are 28 additional scenario seed files with newer IDs. Of the bank's 262 questions, 156 have a concept ID and all have a category and difficulty. The 17 `next` questions can still feed the separate leadership rule, which is a format-based assignment rather than item-level competency evidence.

A correct modern gap-control question can therefore improve the ordinary quiz session score while contributing nothing to positioning in the competency report. Copying more practice answers into this resolver would not repair that inconsistency.

Before concept reporting goes live, create an explicit source-bound question→concept→assessed-competency registry. Keep the current curriculum's six domains distinct from the five GS competencies. Questions without a reviewed mapping remain “unmapped”; do not infer a skill from the answer format or silently parse an ID into an approved assessment category.

## What the detailed concept view should show next

Proposed, not implemented. A coach should be able to select **D-zone coverage** and inspect:

- **What is measured:** the precise decision or knowledge checked, the age scope, source concepts, rubric version and mapping status.
- **Who is represented:** eligible players / roster size, which players lack evidence, distinct reviewed situations and number of submitted reads. Include measured zeros and separate missing evidence.
- **Which attempts count:** first recorded responses, repeated learning attempts, changed-cue checks and later revisits shown separately. A new camera angle or shuffled answer order is not a new decision.
- **How recent:** an explicit selected date window, last checked date and stale-evidence label. A window and its minimum evidence policy must be reviewed before the score is enabled.
- **Why a number appears:** the visible numerator, denominator and weighting rule. A coach can inspect the source question, child's recorded answer, exact frozen scene when available, and feedback. Do not reconstruct an unavailable historical answer.
- **What to coach:** the specific supported misconception or changed cue the child missed, with practice suggestions. “Needs more evidence” must not become “weak at hockey.”

Coach ratings should appear alongside quiz evidence as a distinct perspective with their own date and rubric. They should not silently overwrite a child's quiz result or be blended into a score without an explicit policy.

## How practice fits

Keep earned practice points. Use practised concepts to invite a child into a **new reviewed play**. Save the first response and the source/scene identity, then keep retries as learning evidence. Draft drag regions and ungraded coach placements remain useful discussion records until their rubrics are approved. Optional explanations add context; leaving one blank earns no penalty.

The proposed bridge and event shape are in [Practice points and Game Sense](../superpowers/specs/2026-09-05-practice-game-sense-integration.md). No points-to-GS conversion, new weights, minimum evidence threshold or combined score has been approved here.

## Implementation references

- Landing sample and `TeamFocusCard`: [src/App.jsx](../../src/App.jsx), particularly the literal “Team IQ by concept” row array, `toggleRoster`, and `TeamFocusCard`.
- Player mapping and percentages: [src/utils/gameSense.js](../../src/utils/gameSense.js), `getQuestionCompetency`, `calcCompetencyScores`, `calcGameSenseScore`.
- Team average, missing handling and 60% threshold: [src/utils/coachStats.js](../../src/utils/coachStats.js), `calcTeamCompetencyAverages`. `calcTeamGameSenseScore` exists but has no caller in the current source search; it is not the formula behind the landing sample.
- Current roster → saved sessions: [src/supabase.js](../../src/supabase.js), `getTeamQuizHistory`; query reads `quiz_sessions` for current roster IDs, ordered by completion, without a date filter.
- Different pooled analytics and seven-day comparison: [src/coachAnalytics.jsx](../../src/coachAnalytics.jsx), `sessionAccuracy`, `computeAnalytics`.
- Individual GS/rating presentation: [src/screens.jsx](../../src/screens.jsx), `GameSenseReportScreen`; ratings feed the separate profile card, not the quiz calculation.
- First-response limitations: [src/utils/quizResults.js](../../src/utils/quizResults.js), `upsertResult` and `skipResult`.

Verification was read-only: source inspection, bank/seed inventory, and execution of the actual pure scoring declarations against the worked fixture above. No production data, live team claim, scoring retune or browser-render verification is implied.
