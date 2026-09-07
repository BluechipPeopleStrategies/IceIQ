# One-on-one practice rink

Date: 2026-09-04. Thomas approved this direction in the current task: realistic browser-based 1v1, integrated with RinkReads, with Play, Read & React, and Coach Lab. Tablets and computers are the first targets. Commercial asset research is authorized; purchases require a separate price review.

## Outcome

A child plays a short hockey rush, sees what their decision caused, and can try the same moment again. The first slice contains an attacker, defender, goalie, and one end of a rink. Both attacking and defending are playable. Start with gap control and finding space, initially targeted at U11/U13; these are design candidates for coach review, not newly approved tactical claims.

The visual goal is realistic, fully animated youth hockey. NHL 26 is a quality reference, not a claim of equivalent production scope or current quality. A functional preview does not close the player-art, animation, iPad-performance, or teaching-validation gates.

## Three modes, one state

1. **Play:** touch stick or keyboard steers the selected skater, with a contextual shoot/poke action. Short repetitions finish on goal, save, turnover, or time expiry. Inertia and acceleration matter; the defender and goalie react to actual play.
2. **Read & React:** a seeded rush plays toward a visible decision. Pause before the opening closes, choose a route/read, see the result, or take over from that exact state. Feedback explains observed geometry and consequences without declaring one universally correct hockey move.
3. **Coach Lab:** edit starting positions, pressure behaviour, initial speed and player role; run, pause, scrub, resume from a frame, and reset. Save/reopen a local setup and download a replay. No cloud drafts or team sharing in this slice.

Mode changes explicitly reset the repetition. Taking control of a recorded frame branches the replay and discards its future, while retaining the earlier frames. Scrubbing never reruns random AI. The elapsed time and all actor/puck states come from the recorded simulation.

## Scenario authoring

Author a small starting situation plus opponent policy rather than a complete path for every actor. Template parameters: initial gap, lateral alignment, starting speed, defender pressure policy, and controlled role. A scenario family then progresses from a clearly visible cue to mixed behaviours and fewer aids. Changing shirt colour or mirroring the rink is presentation variety, not evidence of a new tactical lesson.

Examples for review:

| Situation | Observable cue | Learning question |
|---|---|---|
| Defender gives space | Distance closes slowly | Where is the available space? |
| Defender closes early | Gap and reach change quickly | When should you change your route? |
| Defender holds inside | Body and stick protect the central lane | Can you keep possession while using outside space? |
| Child defends | Attacker changes lateral position | Can you stay between the attacker and the net? |

Keep decision feedback distinct from goal outcome. A save does not establish a bad decision and a goal does not validate the read. Prototype feedback describes events; curriculum correctness requires the existing claim and coach-review process.

## Architecture

Use existing React 18, Vite, Three.js and React Three Fiber. The live physics loop is separate from React rendering and from the existing scenario timeline. Canonical simulation units are metres and seconds with +x attacking, matching `src/scenario-engine/rinkFrame.js`; render coordinates are `[canonicalY, height, -canonicalX]`. Use the existing 200x85-foot rink profile, not the alternate 60x30 prototype's dimensions.

New work lives under `src/one-on-one/`. A lazy development route `#one-on-one` is enabled only by Vite's development flag until art, hockey and owner playtest gates pass. Existing quizzes, 3D marker prototype, catalog, claims and Supabase are untouched. No new dependency is required for the first functional preview.

The pure simulation supplies actor positions/velocities/facing, puck state/ownership, deterministic time/seed, terminal outcome and observed event data. A fixed 60Hz step owns movement; rendering reads snapshots. Simulated speeds are tunable game parameters, not measured youth-performance claims. Clamp frame backlog and pause on blur/hidden-tab so returning to the game cannot silently consume a repetition.

Persist only the local coach setup, with a versioned key and validation. Exports are development replays, not `CompiledTeachingPlay` or approved curriculum. Later replay-to-scenario projection must go through the existing validator and promotion pipeline. Reject non-finite/out-of-bounds imports and unknown modes rather than corrupting the game state.

## Visual and animation work

Build a polished practice environment: real rink proportions, rounded boards, regulation-size goal mouth, ice markings and surface texture, restrained lights/shadows, a stable elevated gameplay camera and an alternate teaching view. Keep bodies, sticks, puck and cues legible on a tablet. No camera shake or forced motion blur.

The functional preview may use original articulated development skaters so controls and teaching can be tested while assets are selected. Mark player art provisional. These are not canonical R19 assets and do not supersede any rejected or paused asset evidence.

Production assets require a licensed rigged player and goalie, readable youth proportions, validated handedness and stick continuity, skating forward/backward, glide, left/right turns, stop, pivot, puck carry, release, poke, goalie set/shuffle/save/recover. Animation follows simulation state; it cannot teleport the puck to make contact look plausible. Prefer separate locomotion and upper-body action layers, then two-hand/stick corrections. Stock animation claims remain unverified until imported and played.

Asset acceptance: inspect real runtime clips front/side/gameplay camera; check transitions and skating contact in slow motion; record licenses and source hashes; test actual tablet frame times. A still render or screenshot is not an animation pass.

## Interaction and verification

- Tablet landscape is preferred, but controls and menus must remain reachable in portrait. Touch controls use pointer capture and release on cancellation. Keyboard shortcuts do not fire while editing fields.
- Replay slider and buttons have accessible names; no colour-only indicators. Mute is available; sound starts only after a gesture. A WebGL failure displays a usable explanation and back navigation.
- Target 60fps desktop, stable 30fps on the chosen baseline iPad. These are targets until physical-device measurement. Reduce pixel ratio/shadows before sacrificing readable players.
- Unit tests cover deterministic replay, acceleration, bounds, puck/goal crossing, terminal-state stability and coach-setup rejection. Browser checks cover live control, read freeze/choice, replay branching, coach editing/save/reload, touch release, and narrow layout.
- `npm run build`, relevant existing scenario tests, and new gameplay tests must pass. Verify actual browser pixels, not only DOM. Record desktop vs physical-iPad limits honestly.

## Release scope

First deliverable: local playable development preview and tested game systems, plus an asset shortlist with verified price availability and gaps. Production visual quality, approved learning content, physical iPad verification and live navigation remain open until demonstrated. No stock purchase, cloud persistence or public release is implied by the preview.

## References checked 2026-09-04

- [Three.js animation system](https://threejs.org/manual/en/animation-system.html): skeletal clips, blending and playback controls support the proposed asset path.
- [Hockey Canada U11 skills](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-11/coaches/skills): individual offensive/defensive tactics include basic 1v1, angling and gap control. This supports topic selection, not the correctness of an arbitrary simulated decision.
- [EA NHL 26 gameplay](https://www.ea.com/games/nhl/nhl-26/news/nhl-26-gameplay-iceq2-deep-dive): gameplay and presentation reference; no EA assets are used.
- Existing source boundaries: `docs/factory/SCENARIO-ENGINE-DECISIONS.md`, `docs/superpowers/specs/2026-07-29-scenario-engine-design.md`, `docs/library/gap-control.md`.
