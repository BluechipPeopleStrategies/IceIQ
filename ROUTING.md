# RinkReads Routing and Storage Map

**Current as of:** 2026-07-29

This file is the short current route map. Verify paths against code before a
destructive or public action.

## Read order

1. `docs/factory/SCENARIO-ENGINE-DECISIONS.md` owns scenario-engine decisions.
2. `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` owns the
   reconciled scenario, physics, judging, coach, and arcade architecture.
3. `docs/roadmap/TASKS.md` owns priority and sequencing.
4. `CLAUDE.md` owns the broader repository context.
5. Specialized standards own their narrow validation areas.

## Active content paths

| Content | Current source |
|---|---|
| Composed live question bank | `src/qbLoader.js` |
| Main bank data | `src/data/bank.json` |
| Unified scenario seeds | `src/scenario/seeds/*.json` |
| Animated-play catalog | `src/play/playCatalog.js` and `src/play/plays/` |
| Scenario validators | `src/scenario/schema.js` and `src/scenario/validators.js` |
| Animated-play validators | `src/play/validateAnimatedPlay.js` and `src/play/validateFactoryStandards.js` |
| Scenario-engine architecture | `docs/superpowers/specs/2026-07-29-scenario-engine-design.md` |
| Task sequence | `docs/roadmap/TASKS.md` |
| Question and scene images | `public/assets/` |
| Player, team, and progress data | Supabase, subject to current RLS and app code |

`src/qbLoader.js` composes `src/data/bank.json` with
`src/scenario/seeds/*.json`. The removed `src/data/questions.json` and
`factoryQuestions.json` routes are not live destinations.

## Scenario generation and promotion

- Generated candidates enter an isolated run and staging area first.
- No generator writes directly over `src/data/bank.json`.
- Promotion must pass the current tactical, physics, question, visual, and
  judgment gates and remain individually recallable.
- The current defensive-zone breakout prototype is uncommitted work. Preserve
  it until it is isolated and manually reviewed.
- The Windows overnight task is not an authority to bypass any gate. Keep it
  disabled until its runner boundary, preflight, and acceptance gates are
  implemented and explicitly approved.

## Coach and game routes

- `COACHES_WHITEBOARD.md` is legacy static-image guidance, not the
  coach-created animated-play/video specification.
- `docs/research/2026-07-11-content-factory-and-video-portal-research.md`
  describes a separate player-footage review product.
- Existing Daily Faceoff, Rush Hour, Brain Gym, Shootout, and youth mini-game
  material describes training shells, not a real-time physics hockey game.
- The coach MVP and future arcade game share the canonical hockey and
  physics core but require separate product designs and runtimes.

## Legacy routing history

The detailed May 2 author-tool, File System Access, symlink, and
`questions.json` workflow is archived at
`docs/roadmap/archive/2026-05-02-routing-storage-map.md`. It is retained for
history only. Do not follow its operational steps for current content.

## Repository boundaries

- RinkReads/IceIQ repository: `C:\Users\mtsli\IceIQ`
- BlueChip business repository: `C:\Users\mtsli\BlueChip`

Do not mix BlueChip business instructions, data, or brand rules into IceIQ.
Local edits and tests on a feature branch are allowed. Never auto-push, deploy,
publish, or commit directly to `main`.
