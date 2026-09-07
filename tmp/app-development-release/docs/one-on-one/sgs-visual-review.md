# SGS and scenario presentation review — September 5, 2026

This follows Thomas's rejection of the earlier top-down previews. The previous `22782f6` release is historical evidence, not approval of its visuals.

## Implemented in this review candidate

- The shared active scenario view defaults to 3D for guided curriculum and coach positioning, alongside the existing connected reads and new Scenario Lab. Broadcast, behind-net and overhead views plus explicit camera adjustment preserve the scenario state. Legacy source images, animated-play questions, Gym games and static inspection/recall views have refreshed artwork but are not all migrated to 3D.
- All 48 guided questions now have authored player/goalie facing and visible sticks in the tactical fallback, with the same poses passed to 3D. Navy/gold equipment includes helmets. Body artwork is provisional generated PNG art; free-camera characters remain procedural meshes, not finished production rigs.
- U11 question and reflection copy follows actual puck ownership. Replaying a completed two-event sequence shows both consequences. A loose puck remains at its actual position during a pause and across the view adapters.
- Scenario Lab starts with a 1v1 positioning exercise and extends to 5v5. It isolates one movable player, supports drag/tap, Stay/Back/Forward, coordinates and explanation, then continues from that placement. Saved drafts are per player and candidate, and resumed playback opens paused.
- The separate U7 rink tour accepts valid circles, blue lines, nets and puck locations. It offers read-aloud, keyboard alternatives, gentle retries and four session-only discovery stars.

## Measured engineering scope

The [benchmark](sgs-benchmark.md) enumerates 640 draft configurations of two teaching families. Across 17,280 predefined button paths, 15,834 complete and 1,446 stop at explicit illustration guards. All 640 separate placement probes complete and restore. These are exact geometry counts, not counts of independently reviewed tactical lessons. Added 4v4/5v5 players currently provide context within the same support family.

No new tactical AI assessment, physics certification, child-comprehension validation or live-bank admission is claimed. Input-method capture and per-attempt source-file hashes remain planned; saved attempts currently bind the registered template and exact source snapshot. The benchmark separately hashes its measured source files.

## Browser evidence recorded so far

Local checks use the actual components with an isolated QA player, leaving the user's existing records alone. At 390 × 844: curriculum rendered 3D, switched camera angles, and its tactical fallback showed five visible sticks and individual headings. Coach positioning accepted a 3D drag without changing facing; camera adjustment disabled placement and retained coordinates. U11 Shoot → loose-puck support → final explanation replayed both consequences without rewriting the saved reflection. Two complete Baylor sessions saved separately without changing the first record.

The new 3v3 workflow accepted a selected F2 position and explanation, continued to the next read, and preserved a half-completed pass at progress 0.5 across reload in a paused state. Its tactical puck matched the actual in-flight coordinates rather than snapping to centre ice.

The completed 3v3 draft reloaded exactly and its downloaded JSON matched the saved bytes (SHA-256 `e657377bd5b521a1784330c6cc80b44cfcaeecf525b59ae648067d34f3761510`). Fresh 1v1 configuration 009 completed all three Stay responses. A native 5v5 drag moved only YOU; actual `WEBGL_lose_context` fallback preserved the saved placement exactly and unmounted the canvas. The U7 tour passed miss/retry, keyboard Enter, direct rink taps and all four exact on-rink marker selections; solved markers disable and completion releases the canvas.

Representative 390 px/1440 px captures: `evidence/curriculum-sticks-phone.png`, `curriculum-3d-desktop.png`, `sgs-3v3-desktop.png`, `sgs-u7-phone.png` and the refreshed `read-scene-desktop.png`. The guided tactical capture visibly shows the five different poses and sticks from the reported problem. These checks are browser viewport/input checks, not a physical iPad performance test.

Final local verification: **325/325 practice tests pass**, plus 18 bank-content, 41 young-rink-view and 8 player-identity checks. The production build passes. Existing large-bundle and Three.js warnings remain; checked app flows recorded no page exceptions. Release/live checks are recorded in phone-preview.md when complete.

Planning conversation: [SGS plan](SGS-PLAN.md). Technical target: [template engine spec](../superpowers/specs/2026-09-05-connected-scenario-template-engine.md).
