# RinkReads overnight checkpoint

Updated September 5, 2026, 00:35 Edmonton. Phone access is live; the follow-up quality pass is implemented and tested locally. Target: 7:00 a.m. Edmonton today (13:00 UTC).

## Continue from here

**Live release:** [Shared phone review](https://ice-iq.vercel.app/review/) deployed in `019e8d9`; `5396ec1` records live verification. The hosted Arena, Gym, Shootout comparisons and Character Studio work without a desktop server or shared Wi-Fi. The phone-access request supersedes the earlier DEV-only restriction. Do not restore it. [Phone-preview.md](phone-preview.md) records the boundaries and public-origin checks. The static allowlist publishes review pages/images, not raw planning documents, manifests or workstation paths.

**Current follow-up, not yet deployed:** optional U11 **One thing changes**, all eleven non-Shootout Gym introduction corrections, shared secondary-text contrast fixes, and review of local sample goals/skills. **158 practice tests and the production build pass.** Comparison replay/export and production-preview reload checks pass; the 390 px packaged review has no overflow or broken images. Verification, review HTML and roadmap are updated. Check those results and git status before committing, pushing and verifying the follow-up on the live origin; do not treat local implementation as deployed.

The existing same-task heartbeat is `rinkreads-overnight-build`, scheduled every 30 minutes through 13:00 UTC. Verify its current status before assuming another run will occur. Read this file and [morning-review.md](morning-review.md), then check git log and the current diff. Do not repeat completed discovery, the eleven-intro copy audit, or the changed-cue implementation. No purchases, production content admission, real account mutation or live AI use has been performed.

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
- The local follow-up adds **One thing changes** after completion. It compares the original freeze with only D1 moved from `(16.1, 1.5)` to `(12.05, 0.1)`, the midpoint of the actual puck-to-F2 pass line. Other actors, facing and puck are unchanged. The saved new action/reason is an optional v1 `changedCue` field; original answers, replay and final-only AI payload remain intact. Old v1 reflections restore. No new outcome, score or AI opinion is created. See [u11-read-sequence.md](u11-read-sequence.md).
- Coach Lab: 12 ready examples, two per age U7-U18; separate starting/reference/learner drafts, free question/reason, action or positioning, side-by-side/ghost comparison, source/open rubric, save/reopen/import/export. U9 facing arrows plus simple 45-degree turns, U11+ degree input. Canonical goalies fixed.
- Animation director: scalable teams, add/remove, placement, per-actor freeze, keyframes, explicit playback, local saved drafts and import/export. One-on-one free/read/setup modes, deterministic replay and touch/keyboard controls.
- Guided Curriculum: 24 lessons/48 paired MC-TF questions; four strands across six selected ages, coach personas, aligned boards/answer keys, age/own-net cues, retry and one-time credit. It explicitly filters lessons by selected age. Original source bank/scenarios remain intact and accessible; age-comprehension review and curriculum admission remain open.
- All 12 Gym games retained. New Shootout/BestOption 3D visuals preserve score authority; 2D fallback. Six DOM shot targets, keys 1-6, honest result announcements. Shot/net/puck and offside geometry corrected.
- All eleven non-Shootout Gym introductions are now audited and corrected against actual stimuli and inputs. Short task descriptions remove unsupported automatic hockey-transfer claims, scolding language and stale controls; **Talk hockey** prompts invite discussion. Scoring, timers and adaptation are unchanged. The revised Shootout intro was reviewed and retained. See [brain-gym-copy-review.md](brain-gym-copy-review.md).
- BlueChip glass styling across shell/Gym/main touched surfaces. Local licensed fonts. Gold button contrast fixed; radar Self blue/solid/circles vs Coach gold/dashed/diamonds. Lazy Gym avoids eagerly loading Three.js into initial production route.
- Shared `C.dimmer` text now measures at least **4.9:1 on the three shared navy surfaces**. Local sample goals/skills and phone-sized layouts were reviewed. This does not establish contrast for every background or validate all authenticated workflows.
- Hosted practice uses a fixed `practice-preview` identity in device-local storage; development follows the active player. Saves do not sync between devices. Existing animated-play telemetry remains a device-global local log. SourceQuestion passes the applicable scope, the library starts at the selected/player age, CoachLab clears stale empty/corrupt scope, and learner movement errors stay local.
- Server-only local AI adapter at `/__practice/judge` with source allowlist, strict payload/privacy bounds and mocked provider tests. No live key is configured. Hosted status/grading returns unavailable before any request; the local unconfigured status and UI paths were verified. No live AI judgment.
- Character Studio: four native 1254px actual RGBA navy/gold skater/goalie reference sheets, transparent/light/dark preview and downloads; exact generation/alpha record; 40 planned clips/cameras/pivots/schema. References are not atlases or rigged 3D. Earlier rejected R19-era assets untouched; old black/yellow shown only as Before.

## Evidence

Current follow-up: `npm run test:practice` reports **158 passing tests** and `npm run build` passes with existing chunk/import warnings. The three new comparison tests cover pass-line geometry including the puck offset, immutable original answers/AI payload, legacy save compatibility, comparison persistence and replay. An independent core check also covered save/restore/replay across all seven action/target branches. The previous integrated scenario-engine suite passed; consult [verification.md](verification.md) for the final rerun and browser persistence/export record. The introduction-copy audit has its own source and verification record in [brain-gym-copy-review.md](brain-gym-copy-review.md).

Earlier browser coverage includes all twelve Gym start/back flows, mouse/keyboard shootouts, U11 branch completion/replay/restore, Coach Questions movement/save/reopen/compare, guided completion/retry/focus, and desktop/tablet/phone viewports. The `019e8d9` release was checked on the public HTTPS origin at 390 px: landing/Arena/Gym/Shootout/characters loaded with no horizontal overflow, failed HTTP requests or page exceptions in the checked flows. Follow-up evidence includes `evidence/u11-changed-cue-phone.png`, `evidence/u11-changed-cue-tablet.png`, `evidence/goals-bluechip-readable-phone.png` and `evidence/skills-bluechip-readable-phone.png`; see the final verification record for actions and limits.

No physical phone/iPad test, sustained low-power GPU benchmark, full screen-reader user study or authenticated production journey audit is claimed. New content remains coach-review drafts. The original quiz's existing `ALL_AGES_MODE` still combines ages; its intended policy remains unresolved. Explicit age selection in the new guided curriculum does not validate child comprehension or approve curriculum admission.

## Remaining work for useful overnight continuations

1. Perform the scoped commit/push and live follow-up check; local comparison persistence/export and document reconciliation are complete. Confirm the public review actually contains the changed-cue and copy/contrast changes before reporting them as live.
2. Check reduced-motion, tablet/phone interaction and sustained rendering/fallback behaviour against the actual build. Fix concrete issues and preserve the distinction between viewport testing and physical-device evidence.
3. Record the original quiz's unresolved mixed-age `ALL_AGES_MODE` policy for the owner. Keep new guided lessons explicitly age-scoped and all new examples marked as drafts; do not silently claim or introduce age validation.
4. Continue only bounded useful improvements supported by the source notes and actual gaps. Route drawing, richer prediction/order/recall sequences and expansion beyond the first U11 chain remain open; the single-D1 comparison and sample goals/skills review are already done.
5. Keep the final review and canonical roadmap current. At 7:00 a.m. provide working hosted links, deployed changes, actual checks and material limits.

Still open: route-drawing UI, richer prediction/order/recall sequences, configured/live AI, whole-sequence judgment, serverless judge deployment, cloud practice persistence, main-app Arena navigation, physical-device performance, coach/player comprehension review, curriculum admission and rigged motion assets. Do not infer any of these from the completed visual or automated checks.

## Workspace and running preview

Work in `C:/Users/mtsli/IceIQ` on `main`. Use [shared review](https://ice-iq.vercel.app/review/), [Arena](https://ice-iq.vercel.app/#practice-arena), [Brain Gym](https://ice-iq.vercel.app/#brain-gym), [Shootout before](https://ice-iq.vercel.app/#shootout-before), [Shootout now](https://ice-iq.vercel.app/#shootout-now) and [Character Studio](https://ice-iq.vercel.app/review/characters/). Review hashes are included in production; main-app navigation is unchanged. For local work, inspect running servers before starting another or relying on an old session ID. Browser HMR may require a full reload.

Repo rules: CLAUDE.md authorises scoped commit and push to main after relevant tests/build, with Co-Authored-By trailer. Do not add -A or dot. Preserve pre-existing untracked docs/design/, public/assets/3d/, tools/blender/, and pending u13_dz_faceoff_win_breakout_v1.json / u13_nz_trap_read_v1.json. Exclude .playwright-mcp/ logs. Do not touch memory files. The commit hook handles Obsidian sync.
