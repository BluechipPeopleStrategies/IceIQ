# U11 support routes and mobile fallback

September 5, 2026. Bounded continuation of the owner-approved overnight practice framework. The user explicitly requested routes, player movement, sequential comprehension, phone access and review of every touched surface. Existing U11 draft and public-preview boundaries apply.

## Intended behavior

Read three keeps direct player placement and adds **Plan route**. The child taps up to twelve waypoints from the actual off-puck player's position after their chosen second action. A numbered line and endpoint show the plan. Undo, Clear and coordinate-based Add point provide reversible touch and keyboard alternatives. The child can preview only that route while every other actor and the puck remain frozen, then explain the lane or space they are trying to use.

Route preview is a diagram of the child's plan, not validated skating, a new defender response, or a scored tactical outcome. It follows every segment, with no shortcut to the destination. It supports pause, restart and a progress control, including a static/manual reduced-motion path. Completion saves the route and reason alongside the existing branch reflection; old v1 reflections still restore. Direct placement clears a stale route. Route reflections do not show the final-position AI panel because its current payload cannot evaluate the path.

Independent mobile review found that losing a WebGL context after startup leaves the existing playable 2D canvas hidden while its game timer continues. Add a lifecycle listener that immediately exposes the existing 2D game, cleans up on unmount, and avoids repeated WebGL retries for that drill mount. Preserve score authority and controls.

## Work and ownership

1. Core agent: failing-first route origin/polyline/bounds/roundtrip/replay tests, then bounded route setters and sampler in `readSequenceCore.js`. Verify every action/target branch.
2. Root: route controls in a small `RoutePlanner.jsx`, route drawing hooks in `ReadSequence.jsx`, scoped CSS; integrate core API and keep comparison/replay/storage behavior intact.
3. Mobile agent: context-loss fallback and lifecycle tests in `GymVisualStage.jsx` plus a focused helper if needed.
4. Root: production-build phone/tablet route interaction, numeric/keyboard/undo/clear, actual saved/exported route, replay/reload and reduced-motion checks. Trigger genuine WebGL context loss through the browser extension and confirm usable 2D targets.
5. Independent final review; `npm run test:practice`, build, scoped commit/push, live phone verification. Update roadmap, morning review and checkpoint.

## Evidence boundary

The route asks about off-puck space and support from `docs/library/off-puck-support-offense.md`; it adds no coaching rule or live curriculum admission. No real account mutation, live AI request, purchase or physical-device performance claim. Preserve unrelated work and earlier character assets.
