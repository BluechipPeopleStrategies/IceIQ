# RinkReads overnight checkpoint

Updated September 5, 2026, 00:12 Edmonton. First integrated review build verified; broader overnight work remains active. Target: 7:00 a.m. Edmonton today (13:00 UTC).

## Continue from here

The same-task heartbeat `rinkreads-overnight-build` is active every 30 minutes through 13:00 UTC. Read this file and `docs/one-on-one/morning-review.md` before working. Do not repeat discovery or rebuild completed features. Check git log for the saved checkpoint commit. No purchases, production content admission, real account mutation, or live AI use has been performed.

## Owner direction

- Preserve every existing RinkReads feature: accounts, goals, progression, coaches, all question types and all 12 Brain Gym games.
- Use all guiding `docs/library` notes. U11 three connected reads first, then expand the same framework across ages. Latest instruction explicitly supersedes the older U11-single-read/deferred-chain rule.
- Sequence means the chosen action actually changes the next state. Never show a pass after a carry choice. Include positioning, target/action selection, free reasons, prediction, fixing, route drawing, comparisons and recall as appropriate; do not make everything MC.
- Nuanced tactical judgments depend on visible cues. Accept defensible alternatives. A goal/save or distance from a reference does not prove correctness.
- BlueChip People Strategies navy #0B1A33, gold #C9A24B, bone #F5EFE6, slate #5B6675; Playfair Display headings, Inter body. Verified brand file: C:/Users/mtsli/BlueChip/references/brand-guidelines.md. One navy team and one gold team. This supersedes black/yellow.
- Light complexion visible inside a cage, not white jerseys. GPT image references and local alpha extraction authorised. Paid asset prices may be researched; no purchases.
- Latest user asks a substantial quality review of every touched site surface, including usability and reliability.

## Verified implementation

- `#practice-arena` defaults to U11 ReadSequence: first action + explanation, branch-specific second target, off-puck movement + explanation. Actual pass/carry/shoot consequences, pause/replay, completed-reflection restore/export, final-only optional AI opinion. No tactical score. Unfinished sessions are not persisted.
- Coach Lab: 12 ready examples, two per age U7-U18; separate starting/reference/learner drafts, free question/reason, action or positioning, side-by-side/ghost comparison, source/open rubric, save/reopen/import/export. U9 facing arrows plus simple 45-degree turns, U11+ degree input. Canonical goalies fixed.
- Animation director: scalable teams, add/remove, placement, per-actor freeze, keyframes, explicit playback, local saved drafts and import/export. One-on-one free/read/setup modes, deterministic replay and touch/keyboard controls.
- Guided Curriculum: 24 lessons/48 paired MC-TF questions; four strands across six ages, coach personas, aligned boards/answer keys, age/own-net cues, retry and one-time credit. Original source bank/scenarios remain intact and accessible.
- All 12 Gym games retained. New Shootout/BestOption 3D visuals preserve score authority; 2D fallback. Six DOM shot targets, keys 1-6, honest result announcements. Shot/net/puck and offside geometry corrected.
- BlueChip glass styling across shell/Gym/main touched surfaces. Local licensed fonts. Gold button contrast fixed; radar Self blue/solid/circles vs Coach gold/dashed/diamonds. Lazy Gym avoids eagerly loading Three.js into initial production route.
- Per-player practice keys; SourceQuestion passes actual player ID; library starts at player age; CoachLab clears stale empty/corrupt scope; learner movement errors stay local.
- Server-only local AI adapter at /__practice/judge with source allowlist, strict payload/privacy bounds and mocked provider tests. Real GET configured:false; UI unavailable paths verified. No live AI judgment.
- Character Studio: four native 1254px actual RGBA navy/gold skater/goalie reference sheets, transparent/light/dark preview and downloads; exact generation/alpha record; 40 planned clips/cameras/pivots/schema. References are not atlases or rigged 3D. Earlier rejected R19-era assets untouched; old black/yellow shown only as Before.

## Evidence

`npm run test:practice`: 153 passing tests. `npm run test:scenario-engine`: all suites pass. `npm run build`: pass with existing chunk/import warnings. Final rerun at checkpoint covers last small copy/label edits. Detailed actual browser checks and screenshot paths: `docs/one-on-one/verification.md`. Independent findings all resolved: `site-quality-review.md`.

Browser covered all 12 Gym start/back flows, full keyboard/mouse shootouts, U11 pass/carry completion/replay/restore, drag/keyboard movement, Coach Questions save/reopen/compare/turn, guided U7 completion/retry/focus, source app local sample and desktop/tablet/phone viewports. No real iPad, full screen-reader study or authenticated production audit.

## Remaining work for useful overnight continuations

1. Review remaining Brain Gym teaching/introduction copy against actual stimuli and age fit. Existing old why-it-matters paragraphs sometimes claim automatic on-ice transfer or scold memory failure. Shootout was tightened; audit the others without changing scoring. Keep language short and observable.
2. Extend the U11 sequence with one clearly authored single-cue counterfactual (e.g. support covered versus useful, defender pass lane versus shot lane), using existing source notes, visible geometry and branch tests. Avoid cosmetic coordinate variants and do not certify drafts. Prefer a small complete interaction to adding many shallow examples.
3. Review original touched production sample/profile/goal/skills surfaces for regressions from shared colour/font changes using read-only/local sample state. Do not create/delete accounts or modify real records.
4. Measure/render tablet/phone performance and reduced-motion/fallback behavior, fixing actual issues. Do not report physical iPad proof from viewport emulation.
5. Keep final review page/report and roadmap current. At 7am provide the real working links, changed behaviors, tests and material limits.

Still open: route-drawing UI, more rich prediction/order sequences, whole-sequence AI judging, configured key, serverless judge deployment, cloud practice persistence, production Arena navigation, physical iPad performance, coach/player curriculum review and rigged/motion assets. These are not completed commercial-game features.

## Workspace and running preview

C:/Users/mtsli/IceIQ on main. Dev server http://127.0.0.1:5184, exec session 34893, command npm run dev -- --host 127.0.0.1 --port 5184 --strictPort. Correct live learning site: https://ice-iq.vercel.app/. Arena/comparison hash routes are DEV-only; main styling/Gym changes enter the production build. Browser HMR can require full reload; no persistent runtime error in final flows.

Repo rules: CLAUDE.md authorises scoped commit and push to main after relevant tests/build, with Co-Authored-By trailer. Do not add -A or dot. Preserve pre-existing untracked docs/design/, public/assets/3d/, tools/blender/, and pending u13_dz_faceoff_win_breakout_v1.json / u13_nz_trap_read_v1.json. Exclude .playwright-mcp/ logs. Do not touch memory files. The commit hook handles Obsidian sync.
