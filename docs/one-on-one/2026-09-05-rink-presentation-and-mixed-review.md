# Rink presentation and mixed-read review

**Checkpoint:** September 5, 2026, 10:24 a.m. Edmonton. **Scope:** current worktree implementation and local verification; release verification is recorded below when completed. This is not a curriculum-admission claim.

The mixed exercise is at [the local SGS preview](http://127.0.0.1:5184/?arena=sgs&sgs=mixed#practice-arena). Its intended public route after release is [RinkReads mixed reads](https://ice-iq.vercel.app/?arena=sgs&sgs=mixed#practice-arena). The query and hash are part of the route: `?arena=sgs&sgs=mixed#practice-arena`.

## What changed

The shared scenario renderer and connected ReadSequence renderer use the open arena and clear-board treatment. The opaque near-side wall no longer blocks the play; translucent rails retain the rink boundary. This is a presentation change: player coordinates, puck ownership and the underlying continuation remain authoritative.

Shared scenarios now offer **Broadcast, Rink side, Behind net and Overhead**, plus **Turn view / Move view**, zoom and **Reset view**. Move view pans parallel to the ice, with a bounded target. Camera adjustment temporarily disables answer input. Leaving adjustment preserves the selected view; Reset restores that preset without resetting the lesson. Both `ScenarioRinkView` and the older connected-read toolbar expose these controls.

Practice/scenario skaters and the Brain Gym `HockeySkater` use one procedural equipment rig. Jerseys and helmets are navy/gold; a lighter face is visible inside an open-bar full cage. The rig includes shaped jerseys, sleeve/sock trim, skate boots and steel, a flat hooked stick blade, and distinct goalie pads, blocker and catching glove. Static equipment is merged by material to limit draw calls. The stance is deliberately balanced and neutral: players glide when their position changes, without stride, lunge, shot-bob or goalie-squash animation. This is a bounded procedural improvement, not a production character asset or animation pack.

## Question and delivery variety

The [source-backed twelve-format matrix](../superpowers/specs/2026-09-05-sgs-question-variety.md#twelve-format-matrix) remains the wider design. This slice implements **three factual observation formats across seven eligible factual families**, followed by the existing positioning choice and explanation:

| Implemented formats | Eligible factual families |
| --- | --- |
| Tap a player; multiple choice; true/false | Current carrier; controlled player; goalie; player who carried; player who received; change in carrier-to-net distance; change in controlled-player-to-carrier distance. |

Actor taps use actor facts; distance comparisons use MC or true/false. This is not a claim that every one of the 21 possible format/family combinations is supported. Later reads prioritize a newly visible carry, receive or distance change. The first mixes vary the factual focus as well as the delivery format; stable seeds preserve the exact prompt and option order on reload. Both true and false claims are supported, and true/false responses are actual booleans.

Each observation binds to the actual read-entry freeze and its actual previous freeze. Answering it does not place a player or advance the play. The learner then positions the isolated player and optionally explains why. **Learning** reveals factual feedback after that position submission, then waits for an explicit **Watch next part** action. **Challenge** withholds results until all three reads finish. Factual feedback does not grade the tactical position or reason. The latest owner instruction makes explanations optional in regular and mixed SGS: an empty note neither blocks completion nor incurs a penalty.

The mixed draft is stored atomically in its own namespace; original positioning v1 records remain unchanged. Starting another mix archives the previous attempt under its own identity. Restore checks both the positioning and comprehension records together, including candidate, seed, typed responses, exact visited states and read order. These are browser-local saves and archives, not a new cloud storage or AI grading service.

## Local evidence recorded by the integrator

The following checks were performed through the actual browser controls and reported by the integration owner for this checkpoint:

- **Learning, 1v1:** completed three reads and reloaded the exact attempt. Twenty-five prior saved records remained byte-for-byte unchanged. On-rink actor identification assigned no positioning point. Feedback stayed hidden until position plus reason were submitted; playback waited for the explicit Watch action.
- **Challenge, 3v3, 390px phone viewport:** completed all three reads. Reads one and two exposed no factual feedback; final completion revealed all three results. F3 had possession after the actual completed pass.
- **Input and comparison:** mouse actor selection and tactical-SVG Enter activation worked. Viewing the previous freeze disabled answering until returning to the current freeze.
- **Camera, 390px viewport:** Move/Turn, pan and Reset worked without horizontal page overflow. These controls changed the view, not the answer state.
- **Dense 5v5, 320px:** selected F1 through the actual tactical SVG keyboard target, forced WebGL context loss on read two, and finished MC/TF observations plus all three positions in the fallback. Exactly one locator remained on the authored focus. The completed record reopened byte-for-byte; all 25 earlier nonmixed records stayed unchanged. No horizontal overflow.
- **Optional notes, 2v2, 390px:** completed three reads with all explanation boxes blank. Each submission button was enabled after a position was chosen. The saved reasons were exactly `['', '', '']`, the phase was complete, and reload preserved the complete envelope and the 25 prior records.
- **Shootout artwork:** all eight RGBA equipment assets loaded in the actual browser. Desktop and 390px screenshots were inspected after removing the generated torso's duplicate hanging sleeves. A keyboard shot into the currently open high blocker area produced a goal and the next-shot control; an earlier covered shot produced a save. The art does not change coverage/hit logic. These are layered front-view images; procedural fallback remains available.

The integrator reported **354 passing practice tests and a passing production build before the final face-visibility regression was added**. The final shared-rig suite was then run separately: **5/5 passed**, including a real raycast through the cage that hits the skin rather than an opaque helmet shell. Other rig checks cover finite geometry/proportions, the no-lunge stance, carry-offset blade proximity, palette and disposal. A fresh full-suite/build rerun after all final changes is still required; earlier green results are not a substitute for that release check.

These are local browser and automated checks. They do not establish physical iPad performance, every-camera visual quality, learning efficacy, hockey-physics certification or tactical approval for all generated configurations.

## Teaching and focus expansion

The owner clarified that the ring identifies the named subject of the question, which may be D1 or D4, rather than always a first-person avatar. The renderer extension keeps focus separate from selected actor, controlled actor and puck owner; omitted focus preserves existing authored YOU behavior. Named-role content must bind to a valid teaching situation. D4 returning to the slot is not an unconditional answer key.

The bounded U11 defender perspective uses the exact completed F1-to-F2 pass freeze. It is a separate position/optional-note reflection with an explicit named D1 handoff. Returning resumes the original attacking continuation; this reflection does not claim to re-simulate that continuation from D1's new point. Full role-changing causal graphs remain part of the factory design.

The [factory blueprint](../superpowers/specs/2026-09-05-sgs-thousands-question-factory.md) maps source atoms, reviewed families, valid variations, question contracts, deterministic delivery and approval. The [game-based supplement](../superpowers/specs/2026-09-05-sgs-game-based-learning.md) adds primary-source basketball/soccer/rugby teaching ideas, constraints with stated purposes, and U7 equipment/vocabulary formats. New format/lesson plans are not deployed curriculum. U11 Frozen and Continuous are both required from the start; only frozen decisions with animated continuations are implemented in the current mixed preview.

## Still pending at this checkpoint

- Finish the current puck/focus-marker and D1-perspective browser checks, then run the complete practice suite and production build after the final edits. Record release/deployment verification separately.
- Review remaining character quality and any production 3D asset/animation needs. New camera freedom does not make a flat raster image a fully viewable 3D model.
- The remaining SGS formats in the twelve-format matrix, additional age adaptation, tactical grading, AI judgment and content admission retain their stated source/review requirements. Three observation formats and draft scenario counts do not constitute approved lessons.

Design: [SGS question variety and delivery](../superpowers/specs/2026-09-05-sgs-question-variety.md). Implementation plan: [SGS question variety](../superpowers/plans/2026-09-05-sgs-question-variety.md).
