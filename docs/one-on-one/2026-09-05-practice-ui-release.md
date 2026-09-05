# Practice UI release — September 5, 2026

## Scope and decisions

Thomas approved finishing the remaining local practice UI as one release. The
release adds the six learning worlds and their winding mission journeys,
experimental practice and its question workshop, optional reflections, local
learning-data reports, shaded rink areas, closer opening views and direct camera
controls. It preserves the original six-world art sheet and the navy/gold glass
presentation. Visits indicate exploration; they do not award mastery.

World actions open the selected age, authored guided lesson or exact library
concept. Node IDs provide a deterministic concept fallback; ambiguous animated
play aliases remain for the explicit curriculum-binding work. No question bank,
answer key, coaching source, mastery policy or approved-content status changes
in this release.

The release was assembled from HEAD in `tmp/practice-ui-release`, with an explicit
file list. Broader local player-home, goals/RPE, coach assessment, guided motion,
position exercises, SGS and engine work remains separate. The new teaching rig
is scoped to `ScenarioSkater`: legacy games retain their existing stride,
stick-action and goalie-save animation. Canonical player movement is unchanged.

## Review repairs

- Answer overlays disable during actor dragging, alongside goal/pass/ice input.
- Exact question receipts now normalize the real manifest shape. Old receipts
  cannot initialize a current revision editor or carry an old draft into a new flag.
- Revision exports include scenario ID, base version, question ID, content hash,
  original question and proposed replacement. They remain unpublished drafts.
- Optional reflection skips persist as reviewed empty responses. The catalog
  counts routine questions and current-version answers, excluding extra authoring
  reflections and stale attempts. Scenario version changes reset local view state.
- World links preserve the chosen lesson/concept and the existing library-to-
  Coach Lab route. Learning and workshop controls retain 44 px touch targets.
- A review concern about touch ownership was checked against the installed
  OrbitControls implementation and the browser: it sets `touchAction: none` while
  connected; cleanup restores the original value. No speculative fix was added.

## Verification of the isolated release

- `npm run test:practice`: **437 passed**, zero failed, skipped or cancelled.
- The final independent review found no blockers in the question/receipt/drag scope.
- The production package explicitly includes the curriculum HTML, data, README and
  byte-identical Claude ZIP; no other documents are copied by that plugin.
- `npm run build`: passed. Existing large-chunk warnings remain; no performance
  improvement claim is made.
- Chrome at 1280 px and an emulated 390 px mobile/touch viewport: no horizontal
  overflow in checked scenario, world, lesson-library, workshop and report flows.
- U13 rim question: visible puck beside the rounded boards, focused opening,
  shaded named regions, number-only tabs and puck legend. Canvas touch ownership
  is `none`; input tests cover taps, drag cancellation and second fingers.
- Rush Arena: seven journey stops, explicit visit recording, 1/7 restored after
  reload, and support mission linked to **Offer the next pass** for U13. Its library
  action opens three lessons filtered to `off-puck-support-offense` and U13.
- Optional reflection: skip persisted after reload. Flag saved, triaged, revised,
  exported and reopened with the exact base hash. Current question stayed unchanged.
- Practice report: viewed/check/retry/skip/flag/camera events available; exported
  JSON excludes the written flag note and proposed question wording. No browser
  console errors in the checked final flows.
- Preserved artwork SHA-256:
  `2008c6d669ba9a9e4885046cebebbb089d3ad56c7483a79854447e78410bb478`.

These are software and browser checks, not human hockey-coach approval. Physical
touch devices, every scenario/camera combination and production performance have
not been exhaustively verified. Human/Claude calibration and explicit curriculum
bindings remain the next content-quality work.
