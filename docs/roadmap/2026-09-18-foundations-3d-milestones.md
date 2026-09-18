# RinkReads visual milestones — September 18

Owner decision: interactive movement now; full 3D is the next milestone.

## Delivered now

- Rink illustrations: drag/pan, zoom, reset and keyboard movement. Markers remain selectable. Viewing controls do not move hockey coordinates, score answers or mark an activity explored.
- Referee illustrations: drag/pan, zoom and reset; motion cues remain outside the movable drawing.
- Equipment: drag-to-bag plus a closer-view panel for the selected item with drag/pan, zoom and reset. Tap/keyboard packing remains available.
- The pilot home presents one Start/Continue action. Parent controls are collapsed. Draft flow remains development-only.

Update September 18: the first local 3D rink, helmet and holding-referee samples now exist. The helmet identifies shell/cage/strap; the referee has close-up, replay, pause and manual pose inspection. These are review candidates, not qualified production assets. The other gear and signals remain 2D. See [sample verification](2026-09-18-helmet-referee-verification.md).

## Next milestone: prove the 3D visual approach

**Proposed target: September 22–25**, subject to asset quality and review availability. Use the existing Three.js / React Three Fiber stack; no additional package or paid service is authorized by this plan.

Review and refine these three representative objects before expanding the set:
1. The rink: orbit, zoom and reset, with accurate landmark geometry, readable labels, selected-role highlight and a reliable overhead view.
2. A helmet: clearly recognizable protective equipment, rotatable on touch/mouse, resettable front/side views. It must not imply that a generic model demonstrates correct fit or certification.
3. A referee holding pose: readable hands/wrist relationship from the teaching camera, with controlled inspection angles. Have the qualified official assess the actual pose; future animated motions also need exact signal review.

Acceptance: owner approves the visual quality; interaction works on an actual phone/tablet; keyboard and static fallback remain usable; frame rate and loading are measured on those devices; orientation cannot silently change left/right teaching; neither model movement nor camera movement changes an answer. Preserve the existing world-art direction and source geometry. Do not treat the previous paused shared-3D redesign as globally restarted.

## Expand only after the reference set passes

Reuse one rink across the 22 landmarks, six roles and 24 map states. Expand to all 13 gear categories and six referee poses. These are not 71 independent 3D models. Review each category and pose, plus camera constraints that affect visible cues.

Assign exact asset revisions and regenerate the content-review fingerprint after visual changes. Earlier static-image acceptance does not automatically approve a new 3D pose or viewpoint. Human reviewers can accept, request revision or hold individual assets/ages/formats.

**September 27 content checkpoint:** decide whether the 3D set is ready for the pilot candidate. If it misses the quality/device/review gates, retain the tested interactive 2D version for Thanksgiving and continue 3D afterward. Do not sacrifice the October 7 go/no-go or assume an unreviewed model is ready because the calendar is tight.
