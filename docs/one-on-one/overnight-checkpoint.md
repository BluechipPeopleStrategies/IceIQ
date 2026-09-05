# RinkReads overnight checkpoint

Updated September 5, 2026, 04:00 Edmonton. Target: **7:00 a.m. Edmonton today (13:00 UTC)**. The existing `rinkreads-overnight-build` heartbeat is active every 30 minutes until the deadline; do not duplicate it.

## Continue from here

**Current release complete: `106ec3e`, Coach Lab player routes.** Vercel succeeded and live phone verification finished at 03:59 Edmonton. The public review shows 225; native touch/numeric points, reduced-motion inspection, Apply/Save/Export/full reload/Reopen preserve exact JSON and endpoint hold. All 3 prior read/recall records are unchanged, with no failed requests, page exceptions or overflow. Code, independent review, 225 practice tests, build, local production-preview and live checks are complete. Commit/push this verification record if still modified, then choose the next bounded slice. Do not redo this implementation or deployment. Evidence: `phone-preview.md`, `verification.md`, `coach-skating-routes.md`.

Thomas asked whether everything was still getting worked on. Root answered yes and continued this slice. The broader build is still active; no claim that the commercial app, production animation or AI judging is finished.

## Completed work to preserve

- **Phone review:** https://ice-iq.vercel.app/review/ and `/#practice-arena`, `/#brain-gym`, `/#shootout-before`, `/#shootout-now`, `/review/characters/`, `/#one-on-one`, `/#legacy-two-on-one`. No localhost or shared Wi-Fi requirement. These are explicitly labelled prototype review routes; main-app navigation and account/tier gates are unchanged.
- **U11 connected reads:** default opening action plus reason, branch-specific target and an off-puck placement or support route plus reason. Seven real authored paths, replay, separate final reflection and optional single-D1 changed-cue comparison. No tactical score. Optional final-position AI is hidden for support-route reflections and has no configured live key.
- **U9 connected reads:** four simpler pass/carry paths, generic visible players with only YOU tagged, optional device speech and short reasons. Age-scoped saved reflections; unfinished work survives age switches in memory. U11 definition, branch outputs and AI payloads retain their golden fixture. U9 has no AI or changed-cue comparison.
- **Learner support routes:** up to 12 points from the selected branch's exact off-puck Start; touch/numeric Add, Undo/Clear, pause/manual inspection, saved route and explanation. Only that support marker moves; other actors and puck stay frozen. Implemented in both U9/U11.
- **Actual-branch recall (`8a2a5e9`, live verified 03:17):** three exact branch freezes, U9 opening fixed and U11 all-three order. Touch/keyboard movement, larger pictures, optional speech/note, separate bound local records/download. Check chronology only; Show the order persists help immediately. Original U9/U11 hockey reflections are unchanged. 208 tests at that release.
- **Coach Questions:** 12 ready examples, two per U7-U18 age; independent opening/reference/attempt, action or positioning, explanation, ghost/side-by-side comparison, source/open rubric, local save/reopen/import/export. Goalies fixed in this question format. Guided curriculum has 24 draft lessons/48 paired MC-TF questions, age filtering, personas and one-time credit. Source bank, scenarios and animated plays remain intact.
- **Coach Lab director (`106ec3e`):** 1v1-5v5 templates, add/remove, freeze, time keys, save/reopen/import/export, plus new pending player-route editor. Capture exact paused Start; full/broadcast 3D or full-rink SVG and numeric points; timing/facing controls; isolated preview; explicit Apply/Cancel; one-step Undo invalidated by later edits. Apply replaces only the selected player's remaining keys and holds the finish; earlier motion, other actor keys, source metadata and puck ownership remain. Unfrozen goalies may have director routes. Animate play follows keys; Play this setup uses separate live simulation from zero. No timed pass-transfer authoring.
- **Phone/coach input (`cabeee0`, live verified 02:46):** prompt above rink on stacked layouts; successful choices return there without scroll during editing/playback. Focused running rink alone captures play keys; Escape pauses, paused Tab navigates, Resume retains frame. Coordinate editing pauses the clock, preserves negative decimals and never commits incomplete blank/minus as zero.
- **Brain Gym:** all 12 games/scoring/adaptation retained. Shootout/Best Option improved 3D, six accessible shot targets, corrected geometry and real 2D fallback on context loss; completed/hidden 3D unmounts. Eleven non-Shootout instructions audited against actual tasks with honest discussion prompts. Source notes: `brain-gym-copy-review.md`.
- **Brand:** BlueChip navy #0B1A33, gold #C9A24B, bone #F5EFE6, slate #5B6675; local Playfair Display and Inter; glass panels/buttons/pills. Secondary text checks >=4.9:1 on three shared navy surfaces. Goals/skills sample views checked, not every authenticated journey.
- **Characters:** four native 1254 px actual RGBA navy/gold skater/goalie references with visible light skin, plus a 40-clip brief. References are not rigged assets or animation atlases. No purchases; old R19-era work untouched.

## Verification and boundaries

**Current:** 225 practice tests, build and scoped diff checks pass. Local route browser checks include actual touch, both 3D cameras, SVG/numeric input, canvas scrolling with no added points, nonzero Start, locked outside controls, preview/pause/reduced motion, Apply/Cancel/Undo exact JSON, frozen/goalie and final .05-second guards, movement, save/export/full reload. Production preview 5185 retains exact saved routes and endpoint hold. No page exceptions, failed requests or document overflow in checked 320/390/1280 px flows. Independent final code audit found no P1/P2 blocker. Evidence: `verification.md` and `evidence/coach-route-phone.png`/`coach-route-desktop.png`.

Prior integrated scenario-engine suite passed; current route slice does not modify that engine. Existing chunk/import, clock-deprecation and splash-preload warnings remain. Browser viewport and browser-generated touch evidence is not a physical phone/iPad or child comprehension test.

Hosted practice uses fixed `practice-preview` identity with device-local saves. Development follows the active player. Records do not sync between devices; older animated telemetry remains device-global. Server-only local judge adapter is mocked/tested, but neither local nor hosted preview has a live key; unavailable is returned before sending AI. No paid calls or assets.

New content and geometry stay coach-review drafts, not admitted curriculum. The original quiz's existing mixed-age `ALL_AGES_MODE` policy remains unresolved. Do not silently alter that policy or claim age validation. Authoritative source notes are in `docs/library`; the concept interaction map preserves their provenance and limits.

## Next useful bounded work

1. Current route release and live verification are complete. Continue source-led teaching improvements rather than repeating completed slices.
2. Simplify technical U11 player-facing words such as authored shot, with deliberate golden-fixture review preserving all actual states. A source-bound U13 inside-support/backcheck sequence is a possible next age slice: visible teammate covering carrier, inside threat, learner route/reason. Do not invent opponent intent or a defender getting beaten without explicit authored movement.
3. Route-to-question integration, timed passes, richer prediction/changed-cue sequences and remaining ages need bounded designs. Live AI, whole-sequence judging, cloud persistence, main-app navigation, physical-device performance, coach/player comprehension, curriculum admission and rigged character motion remain open.
4. At 7:00 a.m., stop this overnight run and leave a self-contained review with working hosted links, deployed changes, actual checks and material limits. Keep `morning-review.md` and the canonical `docs/roadmap/TASKS.md` current.

## Workspace

Work in `C:/Users/mtsli/IceIQ` on main. CLAUDE.md authorises scoped commit/push after checks with `Co-Authored-By: Codex <noreply@openai.com>`. Never stage -A or dot. Preserve pre-existing untracked `.playwright-mcp/`, `docs/design/`, `public/assets/3d/`, `tools/blender/` and the pending U13 faceoff/trap seed files. Do not write memory. The commit hook syncs Obsidian.

Verify running servers before relying on session IDs; current dev 5184 and production preview 5185. Full reload after bundle changes. Root owns the browser. The three agents are idle after scoped helper/surface/docs/review work and can receive a new independent bounded task.
