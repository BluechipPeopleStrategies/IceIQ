# Connected reads: 3D visual layer

**Status:** Implemented locally, September 5, 2026. Integration browser QA is underway. This record does not claim deployment, physical-phone testing or classroom validation.

## Purpose and scope

The U9, U11 and U13 connected reads now open with recognizable hockey players on a 3D rink. **Tactical board** remains an available SVG presentation of the same lesson. The visual layer changes how the authored play is shown; it does not add decisions, alter the selected branch or create new tactical outcomes.

The implementation is in `ReadSequenceBoard.jsx`, `ReadSequenceScene.jsx`, their styles and `readSequenceVisuals.js`. It reuses the existing procedural `Skater.jsx` rig and the ice, arena, goal and puck from `PracticeScene.jsx`. The wrapper lazy-loads the scene and shows the usable tactical board while the module loads. Recall and changed-cue comparison boards retain their existing SVG presentation.

## Canonical positions and camera

`createReadSceneFrame` deep-clones the supplied state. Actor IDs, positions, facing, metadata, puck coordinates and puck ownership remain unchanged. It adds a finite visual clock and finite velocity components, defaulting missing or invalid values to zero. These rendering values never write back to the sequence session. Canonical metres map to Three world coordinates as `[y, height, -x]`; the visual layer introduces no different rink scale or puck attachment model.

The orthographic camera uses the complete authored sequence: opening, branch freezes, target coordinates, target result states, puck positions and the rear of the net. Its base bounds include a 1.5 m margin, clamped to the positive half of the canonical rink. A support point or route can expand those bounds but cannot shrink the authored frame. **Show more ice** fits the full positive half; **Focus on the play** returns to the sequence bounds. A moving player does not independently pull the camera along during playback.

Camera orientation depends on the canvas aspect ratio, not an actor's current position or a device name:

- **Portrait, aspect below 1:** a high end-zone view looks down ice, with the attacking net toward the top. The normalized camera-back direction is `[0, 1.6, 1]`. Canonical forward projects up and canonical positive width projects right.
- **Square and landscape:** the existing high broadcast view uses normalized `[1, 1.6, 0.3]`, with attack toward screen-right.

Both views use the same target and standard world-up direction. The camera fits all eight corners of the bounds prism from ice level to 2.1 m, then adds 8% framing padding and applies the viewport aspect. Resizing within either orientation changes the fit without rotating the camera; crossing the portrait threshold changes the view. The shared possession caption says **Attack toward the net**, avoiding a direction that is false in portrait.

## Players, puck and pose timing

Attackers wear navy and defenders wear gold. The procedural rigs have helmets, bodies, gloves, skates and sticks; the goalie adds distinct pads and a goalie stance. Label chips identify `YOU` and, in the older lessons, the existing actor labels. U9 keeps only the `YOU` chip; non-visible generic actor names remain available to accessible descriptions. Chip color and shape supplement the jersey colors. Chips lift above the helmet in screen space, with their actual displayed positions included in target placement checks.

The puck keeps its exact canonical position and gains a contrasting ring on the ice. The ring is a visibility aid, not a larger collision radius. Target rings and route lines likewise mark exact teaching coordinates; an offset target button connects back to its ring.

The scene receives the lesson's progress clock. During active playback it derives visual velocities from consecutive authored frames only when the time delta is positive and at most 0.25 seconds. These velocities drive the existing procedural stride. Frozen, paused and manually inspected states supply zero velocity and use a stationary pose rather than an independent idle animation. Player locations and headings still come from the supplied state. No new shot wind-up, save, rebound, possession recovery or defender reaction is inferred from the pose system.

`Canvas` uses demand rendering. Authored frame updates and user edits request renders; a frozen read has no continuous scene loop. Pixel ratio is capped at 1.5. These are implementation choices, not measured battery or physical-device performance results.

## Controls and fallback

Read-two choices are native HTML buttons with 44 × 44 CSS-pixel hit areas, visible numbers, accessible choice names and focus outlines. The number and complete hit area move together among four offsets. Placement considers the viewport edge, players, raised chips, puck and other target buttons. This improves clearance without moving the target's actual ice coordinate; it is not a proof that every possible overlay arrangement is collision-free. The ordinary choice list remains available.

In read three, the 3D rink accepts completed taps for **Move player** and **Plan route**. Pointer travel, cancelled gestures and multi-touch cancel a pending tap; vertical page scrolling is allowed. A ray through the current camera intersects the ice and converts back to canonical metres before the existing rounded-rink and lesson bounds apply. A drag across the 3D canvas does not reposition a player or add a route point. Numeric position controls and route **Add point** remain available. The retained tactical board also supports direct player dragging and arrow-key movement.

Route preview follows the actual saved polyline from its branch-specific origin. Only the selected support actor moves; other actors and the puck remain in the selected result state. Pause, progress inspection and reduced-motion controls remain owned by the lesson. This visual work does not change route limits, endpoint evidence, answers, persistence or AI eligibility.

The scene installs the existing native `webglcontextlost` listener. A real context-loss event invokes the failure callback once, removes the listener, switches the wrapper to the SVG tactical board and disables the failed 3D option for that mounted wrapper. React/lazy-load errors also hand off to the board. The board receives the same lesson state and controls, so fallback does not restart the exercise. This describes the implemented path; browser-triggered context-loss verification is recorded separately by integration QA.

## Teaching and asset boundaries

The source notes guide what should be readable:

- [Scanning](../library/scanning.md): visible teammates, pressure and space; generic U9 actors with only `YOU` tagged. Viewing this illustration does not measure a learner's shoulder check or head turn.
- [Off-puck support](../library/off-puck-support-offense.md): discuss both available space and the passing relationship to the carrier. A freely placed point or route is a plan to discuss, not a correctness score.
- [Odd-man reads](../library/odd-man-reads.md): show the actual defender and goalie movement in the authored sequence; distinguish a decision from a prediction about unknown opponent intent.
- [Pass lane removed](../library/two-on-one-pass-lane-removed.md) and [support too flat](../library/two-on-one-support-too-flat.md): preserve the visible lane and support differences behind the existing choices rather than decorating one option as automatically correct.

These notes do not supply the authored coordinates, animation durations, camera angles or body poses. The renderer does not turn their seed-authoring rules into new automatic grades. In U13, Carry's passing-support example and Shoot's loose-puck positioning remain different situations; a loose puck must not be pictured or described as a verified save or recovery.

The assets are existing code-built meshes and generated jersey textures, not motion capture, photoreal player scans or newly imported character artwork. Their size, stride and stick pose support recognition. They do not certify skating mechanics, reach, reaction time, puck physics, age suitability or on-ice learning transfer. The source and curriculum review boundaries of each connected-read draft remain in place.

## Automated evidence and remaining review

The ten tests in `src/one-on-one/readSequenceVisuals.test.mjs` cover:

- deep cloning, canonical actor/puck identity and finite clock/velocity defaults;
- inclusion of future targets, puck positions and net extent, stable bounds across all three age definitions, additive route/point framing and full-half mode;
- actual Three orthographic projection of the 2.1 m prism at phone and desktop aspects, including 330 × 420, either side of the portrait threshold, wide mode and extreme valid support/route bounds;
- stable orientation within each viewport class, correct attack direction, no portrait mirroring, high-oblique elevation and minimum projected body/ice separation at the tested phone size;
- finite, usable framing when the viewport aspect is unmeasured or invalid.

The portrait change first failed the new direction assertion against the old broadcast-only camera, then passed all nine visual tests. The combined visual, connected-read core and U13 run passed **47 tests**. These tests use Three's camera projection without creating WebGL; they establish the stated data and framing properties, not visual acceptance of every player pose, label overlap, touch gesture or GPU failure.

The pure-helper review found no blocker for the current validated U9/U11/U13 inputs. Integration browser QA owns actual rendering, branch interactions, labels, touch/scroll behavior, context-loss handoff and persistence checks. Live deployment and physical-device results require their own evidence and are not claimed here.
