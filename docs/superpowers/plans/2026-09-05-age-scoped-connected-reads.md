# Age-scoped connected reads

September 5, 2026. Owner-authorised overnight continuation: U11 first, then expand across ages. This follows the completed U11 route and mobile graphics release; it does not change the original quiz age policy or admit new content into the live bank.

## Bounded result

Add one U9 coach-review draft to the existing three-read practice framework. It uses the guiding scanning and support notes, short questions, two first actions and two next targets per branch. Only YOU is tagged on the U9 rink. Decisions change the next visible state. The third read accepts placement or a route and a short reason. Existing browser read-aloud is available on request, with no autoplay.

U11 remains the default, with unchanged data, branches, reflection format, legacy storage key and optional changed-cue exercise. U9 has its own stable scenario ID and device storage key. Age switching retains unfinished work in memory; completed reflections can reopen after reload. U9 has no AI judgment or changed-cue exercise until those are separately authored and validated.

## Implementation and review

1. Extract the unchanged U11 definition and shared validated state geometry. Resolve each transition and saved reflection through a small explicit scenario registry. Reject unknown IDs and cross-scenario restores.
2. Author U9 states and copy from `docs/library/scanning.md`, `off-puck-support-offense.md`, and the two-on-one lane/support notes. Review geometry and teaching claims independently.
3. Add age selection and definition-driven copy to the existing UI. Preserve route, replay, reduced-motion and saved-reflection controls. Reuse the existing speech helper; stop speech when the read or age changes.
4. Run regression tests for all U11 branches and U9 branch/route/storage boundaries, then build. Verify phone and desktop flows, age switching, short explanations, read-aloud invocation, replay and reload. Publish only after the required checks pass and record live verification.

The states remain authored illustrations for coach review. No validated skating physics, automatic tactical correctness, mastery mark, observed head-turn, real-device performance or live AI is claimed.
