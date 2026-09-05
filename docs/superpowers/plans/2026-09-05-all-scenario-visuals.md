# All scenario visual surfaces

> For agentic workers: use subagent-driven-development with independent renderer ownership. Root owns integration and browser verification.

**Goal:** Extend Thomas's approved navy/gold visual upgrade across every scenario-rendering family, preserving the comprehension task and source content.

**Architecture:** A decorative SVG player component and matching Canvas2D painter improve existing coordinate-based renderers. Existing 3D practice/game views remain. Image questions gain source-preserving inspection; their bitmap illustrations are not reconstructed from invented coordinates. Renderers retain their input, scoring, age, masking, replay and storage contracts.

**Tech stack:** React/JSX, SVG, Canvas2D, existing Three/R3F, Vite. No new dependency, paid asset, API key or AI call.

**Spec:** `../specs/2026-09-04-rinkreads-practice-framework-expansion.md`; additional owner instruction September 5: “All of them.” This expands the already authorized visual direction and does not add a new approval requirement.

## Constraints

- BlueChip navy #0B1A33, gold #C9A24B, bone #F5EFE6, slate #5B6675; preserve colors/shapes that carry a game's answer, tracking or memory cue.
- Preserve separate coordinate profiles: legacy 600×300/normalized 60×30 m; animated 200×85 feet; practice canonical metres; Gym CSS pixels; source-image relative overlays.
- No inferred ownership or tactical heading. Unknown headings use a neutral player emblem.
- No change to question text, source scene definitions, answer keys, scenario generation, scoring, elapsed-time rules or storage. Illustration paint may be rebuilt from the exact authored geometry.
- Keep U7/U9 half ice, hidden blue lines/role labels; keep scanWindow, hiddenIds and reveal-only information hidden at the same times.
- Static recall/browse thumbnails stay lightweight; do not mount a WebGL context for every card.
- Source discovery resolved the image lane: 37 PNGs have exact authored inputs in scene-forge.mjs and four are authored SVGs. Refresh those 41 assets serving 133 questions with fixed geometry, unchanged bank/manifest and white defenders where the prompt says white. Image framing alone is not an illustration upgrade.
- Preserve unrelated untracked files and pending seeds. Commit only named files; push on main under the current repository instruction after checks.

## Work packages

- [x] Shared SVG player art: bounded silhouette, neutral/authored-heading contract, goalie pads, unique gradient IDs, no pointer or accessibility interference.
- [x] Unified/legacy quiz: RinkReadsRink ice/markers, RinkStage actors/legend, Place-owned actors and dispatchable legacy overlays. Prove age/visibility/goalie/coordinate contracts.
- [x] Practice: coach opening/attempt/ghost comparison, 48 curriculum question boards, connected tactical boards, changed-cue comparison, recall thumbnails/inspection. Preserve source state and save records.
- [x] Animated and Gym: 25 play definitions/98 nodes through shared drawing primitives; ten rink-based drills and other cue surfaces through matching art while retaining task cues and timing. Snapshot defenders remain gray so the gold memory target stays unique.
- [x] Main/weekly/review/source image questions: shared read-only enlarge/zoom, exact original fit and overlay alignment, keyboard dismissal/focus return. All 41 authored source illustrations refreshed; six small concept diagrams and duplicate legacy overlay cleanup.
- [ ] Verify actual desktop/phone flows; no assertion that all authenticated journeys, image pixels or physical devices were reviewed. Run focused renderer/game tests, the practice suite and production build.
- [ ] Update coverage/evidence, roadmap and review, commit/push and verify the live release.

## Coverage audit

Current bundled source inspection: 262 unique bank rows, 133 image-backed MC; 28 unified scenarios / 32 expanded frames (13 selection, 13 point, 6 place, including 8 board-MC and 2 scan windows). All current unified frames omit facing. Legacy q.rink/q.scene remain dispatchable but have no current bundled bank rows. Animated catalog: 25 definitions, 98 nodes. This is code inventory, not a production authenticated-content audit.

The old `#dev-3d-scenario` disc prototype and explicit “before” views are historical comparisons; they must stay labelled as such. The new source renderer is the live question path, not that isolated debug prototype.

### Practice SVG coverage — implemented locally, browser review pending

Scope files: `CoachQuestionLab.jsx/.css`, `GuidedCurriculum.jsx/.css`, the `RinkStage` presentation inside `ReadSequence.jsx`, `ReadSequenceRecall.css`, and `CoachRouteBoard.jsx`.

- Coach opening, learner attempt and coach-reference boards now use shared `HockeyPlayerArt`. Existing hit areas, selection and reference rings, authored headings, labels and owned-puck positions remain outside the decorative art.
- The 24 curriculum lessons contain 48 question boards. Their shared `CurriculumBoard` uses the same art with neutral facing because the content does not author headings. Full/half ice, own-net context, hidden blue lines, arrows, YOU rings and the explicit puck offset stay unchanged.
- Connected tactical boards, the changed-cue pair, all three recall thumbnails and the enlarged recall picture inherit the upgraded `RinkStage`. Recall remains SVG and uses the original saved states and captions. Phone recall pictures use the full card width; there is no Canvas per card.
- The coach route fallback uses matching player art and ice in its existing portrait, whole-rink view. The `rotate(-90)` world transform, label counter-rotation, selected-player/start rings, numbered route points, puck and native completed-tap handling are unchanged.
- A scan of every `src/one-on-one` JSX renderer found no further current SVG actor drawing functions. `PracticeLibrary` delegates to the global quiz/animated renderers; `CoachLab`, `OneOnOne`, and connected 3D use the existing `PracticeScene`/`Skater` family. Explicit `Legacy*` files were not edited.

Verification for this scope: 83 question/curriculum/connected-read/recall tests passed; 25 director/route/native-input tests passed; the production build compiled with `build.write=false`, leaving the browser QA output untouched. Only the existing static/dynamic seed-import warning appeared. These checks cover code and state contracts; root's actual phone/desktop visual and interaction checks remain the release evidence.
