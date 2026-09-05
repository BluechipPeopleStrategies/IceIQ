# Paused handoff — September 5, 2026

Thomas explicitly requested: **pause everything; resume in a new chat.** All three implementation agents were interrupted. This checkpoint records work in progress, not a release. Do not resume until Thomas asks.

**Follow-up, clarified 11:32 Edmonton — template only:** Thomas confirmed that the **3D scenarios for questions** are the main template to preserve. He also likes the broader gameplay direction, but wants to incorporate it only if it fits naturally, without forcing it. Saved the [3D question scenario template](3d-question-template.md) as a design reference with current implementation links. No specific external gameplay reference was identified. Game integration remains deferred and implementation stays paused.

Paused at approximately 11:29 Edmonton. Workspace: `C:\Users\mtsli\IceIQ`, branch `main`, last commit `d51edc8`. The substantial implementation below remains uncommitted. No final build, deployment or push was performed for this batch. Preserve the working tree. Read `CLAUDE.md`, `ROUTING.md`, `AGENTS.md`, the scenario-engine decisions/design and `docs/roadmap/TASKS.md` before resuming.

## Latest requests, first to verify when resumed

1. Clicking Pass/Shoot/Carry must play the selected action immediately, before answer confirmation. Root just changed `src/one-on-one/ReadSequence.jsx` to create a temporary preview while the canonical session remains at read one. Confirmation commits the answer; changing the choice restarts from the original scene. This newest change is **untested**. Older tests still refer to the former “Play my choice” / “Play selected action” labels, now “Confirm my choice” / “Confirm and continue”. Test no premature record/save, actual puck transfer, repeat/change choice, confirm midway/end, reset and renderer failure/pause.
2. In the latest U13 screenshot, the goalie is visibly out of position. Thomas wants shooting to be the coherent option, plus a contrasting scenario with the goalie in position. **Not implemented.** Compare authored geometry, goalie/defender positions, feedback and outcomes together; do not merely change the answer label.
3. Hovering a player produced an opaque navy rectangle covering the skater. Root added higher-specificity transparent target styles in `ScenarioRinkView.css`, with an outline for focus/hover. **Not visually verified.** Reproduce hover and keyboard focus in the actual workshop.
4. Camera-view miniature images should look more three-dimensional. Current compact `CameraViewControls` still uses line thumbnails. **No further thumbnail redesign implemented.**
5. “Review build” was a noninteractive internal badge. Root removed it from `PracticeHub.jsx`; this latest edit has not been retested.

## Implemented WIP to preserve

- Shared 3D scenes now cover AnimatedPlay (25 plays / 98 nodes), source scenarios (28 seeds / 32 frames), and ScenarioImage (133 questions from authored image definitions). See the new adapters and tests under `src/play`, `src/scenario`, and `src/visuals`. Rendering conversion is not proof that every tactical/body-position cue is sound: some source questions depend on poses the neutral rig does not express.
- Consistent smaller player labels, visible puck, body focus markers, navy/gold player rigs, camera controls, goal rendering and readiness gates. Tactical fallback and redundant coach selection were removed from player flows. Failed 3D readiness must prevent answers and stale animation callbacks.
- `RinkActionCue.jsx/.css` provides matching glass Pass/Shoot/Carry pills. `RinkGoalAnswer`, `ReadSequenceScene` and `ScenarioRink3D` use it; AnimatedPlay supplies pass actor IDs. One 390 px screenshot (`.playwright-mcp/matching-cues-phone.png`) was visually checked before the immediate-preview changes.
- AnimatedPlay framing uses all authored poses, puck/routes/hit zones and needed rink landmarks instead of always showing full ice. Source explanatory prose was removed from the rink overlays. Unit checked; latest overhead browser inspection remains pending.
- `ReadThePlay.jsx/.css` now has skill filters, improved activity cards and actual recent-result status instead of every card saying New. AnimatedPlay answer/control glass styles are scoped to its own controls.
- `src/ui/RinkIcon.jsx`, `src/ui/glass.css`, `main.jsx` and the BottomNav portion of `widgets.jsx` add consistent SVG icons and a centered glass bottom dock. No final phone/footer-overlap QA yet; the rest of the home screen is not fully restyled.
- Drag/swap lineup work is in `src/coach/LineupCard*`, lineup gesture helpers, `src/utils/lineupMoves*`, `depthChart.js` and its App integration. Supports occupied swaps, empty slots/bench, keyboard alternatives and rollback on save failure. Unit checks passed; actual browser/touch drag QA remains.
- Optional “What did you see?” reasoning, mixed Learning/Challenge formats, named-player focus, U13/U18 authored defender motion, and one U15 tolerant placement exercise are present. The bounded U11 pass-to-D1 reflection saves separately; its repositioned defender is not fed into a generalized continuous tactical graph.

## Incomplete parallel lanes at interruption

All agents are interrupted: `mixed_question_ui`, `question_format_runtime`, `question_format_sources`.

- **Training:** agent audited collapsible recent sessions, upcoming plans and lifetime totals. At pause there are no diffs to `src/utils/trainingLog.js`; do not claim these features exist. Existing save truncation to 200 sessions needs removal without inventing previously lost history. Plans must stay separate from completed stats; completion must be idempotent. Keep minutes separate from puck counts. The existing training/coach audit is `2026-09-05-training-and-coach-view-audit.md` in this directory.
- **Daily Hockey Intel:** partial core/store and tests exist under `src/study/` (`dailyHockeyIntelCore*`, `dailyHockeyIntelStore*`, `DailyHockeyIntel.test.mjs`). The UI component and widget integration were not present in the pause inventory. Intended behavior: three date-stable, age-appropriate facts per player/day; no endless shuffle; no repeats until the eligible catalog is exhausted, then honest review. Root still needs to wire player ID and age into App's home/study/coach widget and InsightsScreen calls. Preserve existing completion callbacks.
- **Voice:** one energetic young adult hockey player/coach narrator was requested. No `src/speak.js` diff at pause. Agent planned deterministic English natural voice preference with restrained rate/pitch, preserving explicit slower young-age settings and explicit coach feedback voices. Browser TTS cannot guarantee a specific age/timbre; do not claim custom recorded voice.
- **Journey:** spec and `src/path/journeyPresentation.js` exist. The attempted JourneyMap/PathScreen UI patch failed validation and made no changes. Existing PathScreen/home still use the old journey. Generated original six-world winter artwork is saved at `public/assets/journey/worlds-v1.png`. Proposal: six worlds mapped to the existing 31 concepts, off-ice recognition missions rather than claiming physical skating mastery. Rank thresholds in the spec are proposals, **not implemented**. Fix the existing queue's unrelated-question fallback and avoid awarding mission progress from mismatched questions before presenting competency ranks.

## Research and measurement artifacts

- `docs/library/study-facts-seed-2026-09-05.json`: 40 sourced atoms, 31 eligible for daily delivery and nine held for review. The older-age eligible pool is small. This is not thousands of vetted facts. Existing legacy Intel entries do not supply URL-level provenance.
- `docs/superpowers/specs/2026-09-05-study-library-source-plan.md`: source inventory and scaling plan. Source eligibility for daily information does not admit a new tactical quiz answer automatically.
- `docs/one-on-one/team-iq-measurement.html` and `.md`: detailed current measurement audit and worked example. Not browser-reviewed/shown to Thomas yet. Existing Team IQ calculations have inconsistent domains, missing concept coverage and zero/missing-data handling; **scoring fixes were not implemented**.
- `docs/superpowers/specs/2026-09-05-practice-game-sense-integration.md`: proposed practice/Game Sense integration, not shipped scoring behavior.
- `docs/superpowers/specs/2026-09-05-journey-and-reading-ranks.md`: proposed journey/ranks. KidStrong inspired consistency/competency recognition; proposed thresholds are RinkReads choices, not claimed KidStrong rules.
- Broader SGS, source factory, question-variety and multi-perspective plans are under `docs/superpowers/specs/`. Continuous play, generalized role graphs, bulk admission and finished production character animation remain open.

## Verification limits and restart order

The earlier full practice suite passed **447/447** and production build passed, logged in `.playwright-mcp/current-practice-check.log` and `current-build.log`. Those results **predate the latest edits**. Later focused readiness checks passed 47, play/engine checks 104 plus catalog/identity checks, and lineup checks nine. Do not present these as verification of the paused tree. Immediate preview, hover, final bottom navigation, daily Intel, training and voice are not release-verified.

When Thomas resumes: inspect the actual diffs first; finish and verify the immediate action preview and paired goalie cue; inspect hover and camera thumbnails; then complete interrupted lanes and broad UI integration. Run appropriate tests/build after the new edits, followed by actual desktop/phone checks of each question family, overhead framing, pre-confirmation playback and lineup drag. Update the older review page/evidence and canonical task list before any release claim.

Do not stage everything. Preserve unrelated/pre-existing `docs/design/`, `public/assets/3d/`, `tools/blender/`, `tools/__pycache__/`, `docs/one-on-one/evidence/read-scene-phone-initial.png` and the two pending U13 seeds (`u13_dz_faceoff_win_breakout_v1.json`, `u13_nz_trap_read_v1.json`). `.playwright-mcp/` contains QA outputs, not a blanket staging target. Use explicit owned paths for any future commits. Leave user browser tabs and the local server in place.
