# Pilot home and content-review update — September 18

## Open the results

- Local app: http://127.0.0.1:5190/?arena=pilot&age=U7#practice-arena
- Offline content pack: [rinkreads-content-review-pack.html](../research/2026-09-18-foundations-review-pack.html)
- Reviewer handoff: [rinkreads-reviewer-instructions.md](../research/2026-09-18-reviewer-instructions.md)
- Next visual milestone: [rinkreads-3d-milestones.md](2026-09-18-foundations-3d-milestones.md)

## Delivered

One Start / Continue / View recap action, exact next-step title and six-step path. Parent options are collapsed. The simplified local home also replaces the competing learning/menu cards for U7–U11 in the app's player Home, with profile/history/world browsing retained under parent options. It is not enabled in the production build.

Rink and referee visuals now support pointer dragging, keyboard movement, zoom and reset. Gear still drags into the bag and has an expandable closer-view panel for inspecting each item. All are interactive 2D illustrations; full 3D remains the next milestone. Panning is viewing state, not movement of players or a scored answer.

The standalone pack is generated from current app files. It contains 52 coach items (22 spots, six roles, 24 maps), 13 equipment items and six officiating items. Each item carries a hash; the aggregate fingerprint covers the content, rendering helpers, learning flow and movement component. Review decisions include name/date/role, ages, game format, notes and accept/revise/hold. Partial exports preserve pending IDs. The pack cannot publish, qualify itself or change an application gate.

## Checks

- 28 focused player-home, route, checkpoint and local-session tests passed; 15 existing auth-routing checks also passed. New home-state tests were run failing before implementation, then passed.
- Production build passed; existing large-chunk warning remains.
- One visible learning button on the closed pilot home; Start/Continue after progress and reload; age isolation; parent controls; mobile layout checked.
- Full U7 flow with the new controls passed. Existing rapid-input, keyboard-marker focus, desktop gear dragging and 320px checks passed.
- Pointer pan, keyboard pan, zoom/reset and no answer/visit mutation from panning passed. Touch-emulated pan and the actual app sample-player Home → lesson → Home path passed. This does not replace physical-device or screen-reader testing.
- Production preview hides the pilot home/flow, including direct review URLs.
- Pack: 71 items; correct 52/13/6 role filters; invalid/incomplete review prevented from export; completed synthetic row exports with 70 pending; reload restores the row; no duplicate SVG IDs; no horizontal overflow at 390px. The synthetic export is test-only under work, not a human acceptance.
- Source changes require pack regeneration and affected content re-review, especially new 3D views. Live account access and qualified human reviews remain open.

Evidence: work/pilot-home-tests.log, work/pilot-home-build.log, work/pilot-home-review-checks.json; verify-pilot-home-review.cjs, verify-pilot-app-touch.cjs and existing integrated-flow regression scripts. Screenshots: work/pilot-home-mobile.png and work/review-pack-mobile.png. Cold-entry checks reproduced a sample-preview/auth-callback race (two of four fresh contexts failed). The preview guard now updates synchronously before React commits, and the initial session lookup respects that guard. Four subsequent fresh mobile contexts all reached Home; the app Home/lesson/return and touch-pan checks also passed. No live-auth readiness is inferred from the sample preview.

## Local model review

Verified installed qwen3.8-huihui:27b, loopback only. Compact home/pack critique (1.5K context/210-token cap) plus scoped movement/home-core code review (4K context/240-token cap), followed by one corrective retry (160-token cap). Jobs were sequential. Request/results are work/pilot-home-qwen-* and work/movement-review-qwen-*.

Accepted explicit player/age scope, distinct pending/hold and clear version binding. Rejected bulk accept and the incorrect suggestion that exported reviews automatically make production approved. The movement review was unreliable: it first retracted its own delta claim, then repeated false drift/zoom claims after the corrective retry. Coordinator escalation was direct code inspection and browser verification of this small component; no further model loop, Claude or Codex worker. Delta coordinates update each event; zoom is bounded with min/max; keyboard panning intentionally targets the focusable viewport and leaves child marker controls intact. Model output did not qualify hockey content. Savings unmeasured.

## Next

Name the human reviewers and use the pack; verify hosted access with a pilot identity; test actual family devices. The proposed next 3D reference set is one rink, one helmet and one referee pose, followed by the remaining equipment/poses only after quality, interaction and content review. Target September 22–25 is provisional; September 27 decides whether 3D is ready for the pilot candidate. October 7 remains go/no-go for the October 12 target.
