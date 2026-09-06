# Shared 3D local review

Run the existing Vite server and open `/player-lab.html`. Optional initial query settings: `?view=eyes&age=U18`, `?view=side&age=U7`, or `?view=overhead&age=U11`.

This page uses the actual shared ScenarioRinkView/ScenarioRink3D/ScenarioSkater renderer and source-time movement adapter. It is a local development review entry, not a published route or approved coaching lesson.

- Age stages: U7, U11, U18.
- Finish comparison: rounded study (lab default only) or existing integration candidate.
- Characters or tactical markers; player-eye views force physical characters.
- Movement examples: forward, backward, glide and authored rim preparation poses. The rim example does not claim correct puck contact or a completed pickup.
- Question starting views: ordinary presets, explicit external perspective, either team's player eyes, and a locally saved perspective.
- Re-enter question restores its saved view. Play/pause and timeline seeking remain separate.
- Save current perspective records actual first-person look angles or external perspective position/target/FOV. Adjusted orthographic cameras are not serialized; named presets are supported.

## Browser verification, September 6, 2026

Isolated headless agent-browser sessions, desktop 1440x1100 and phone viewport 390x844, served from http://127.0.0.1:5198/player-lab.html. No physical iPad or production deployment was tested.

Verified in the real renderer:

- Player-eye look-around: keyboard changes lookYaw from 0 to 0.08 without moving scene time. Question re-entry restores 0; saving and entering the saved viewpoint restores 0.08. Phone resize preserves 0.08 and older eye height 1.6737.
- External perspective: Move left changes target to [0,1,-15.32028058759122]. Leaving adjustment retains it. Saving, switching to broadcast and returning restores both target and position within floating-point precision.
- Play advanced source time, Pause stopped it and Home on the timeline sought to 0.
- Navy/gold player eyes, younger external view and older tactical overhead rendered. First-person hides the observer's body/label, retaining the other physical players even when tactical is selected.
- Tactical labels were moved above symbols after actual screenshot inspection showed them covering the markers.
- Fresh isolated browser run had no page errors. The console contains the existing THREE.Clock deprecation warning. An earlier development session accumulated hot-reload errors while files changed; the lab now reuses its React root during hot reload and fresh-session verification is reported separately.

Screenshots are under `tmp/shared-3d-20260906/browser/`, including `eyes-older-desktop.png`, `eyes-older-phone-full.png`, `side-young-desktop.png`, `eyes-tactical-override-phone.png`, and `tactical-older-desktop-labels.png`.

## Open visual limits

The procedural characters and sparse arena remain candidates below the owner's reference quality. The first-person observer's whole model is hidden to prevent self-occlusion; no first-person hands/stick model is claimed. The final player-eye enclosure adds simple light walls, ceiling and stands; it is not a detailed arena. Screenshots prove only this review scene; they do not establish all-catalog hockey motion or decision readability. Physical device and coach/art review remain necessary.


Final enclosure/finish follow-up: a fresh isolated browser session had no page errors after the simple light enclosure was integrated. Inspected `eyes-enclosed-final-desktop.png` and `eyes-enclosed-final-phone.png`. The rounded finish was forwarded through the actual shared rig, selected by default only in this lab, and both finish options were exercised. `rounded-young-live-final.png` was visually compared with `rounded-study/blender/age-family-review.png`: both show the same rounded head/shoulder/jersey family under different lighting and poses. Portrait first-person retains perspective and therefore clips off-axis players until the learner looks around; question composition still requires review on each target viewport.
