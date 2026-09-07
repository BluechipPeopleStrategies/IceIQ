# Practice framework implementation

Active owner direction, September 4, 2026. Extends the approved 1v1 build.

Spec: `../specs/2026-09-04-rinkreads-practice-framework-expansion.md`.

## Tasks and contracts

1. Finish the pure 1v1 simulation and replay contracts. Implemented; 19 simulation tests reported passing; root review and final verification remain.
2. Add pure director and team simulation modules. Generic `actors` array with stable IDs, home/away teams, skater/goalie roles, canonical metres and radians. Director supports 1v1 through 5v5, add/remove, per-actor frozen state and time keys, deterministic sampling, versioned validated drafts. Team runtime provides real support movement, possession, passing and shots. Root integrates scene and authoring controls.
3. Reuse the live question bank, animated-play catalog, coach personas and concept documents in a searchable source library. Preserve source IDs, age bands, exact answers and rationale. Existing spatial questions keep their scorer. Add device-local lesson progress with no duplicate reward for repeated answers; retain the existing Brain Gym progression owner.
4. Upgrade the goal/decision games and Brain Gym presentation inside the new practice shell. Inspect actual games first. Improve the play surface, cues, interaction and feedback; preserve score semantics and adaptive levels. Keep all twelve games available. No invented transfer claims.
5. Verify complete source-to-lesson, director-to-playback and game flows on desktop/tablet-sized browsers, run build and relevant regression tests, review, update roadmap, commit scoped files and push per current repository instructions.

## Integrated checkpoint — September 5

The development framework, source library, director/team runtime, twelve-game Gym upgrade, 24-lesson/48-question curriculum, 12 coach examples and default U11 three-read sequence are implemented. BlueChip navy/gold, local fonts, accessible controls and profile-scoped storage are integrated. Independent findings were fixed and browser-checked. The practice suite passes 153 tests, the existing scenario-engine suite passes and the production build passes. Walkthrough and limits: `docs/one-on-one/morning-review.md` and `verification.md`.

Arena routes remain DEV-only. Curriculum admission, physical iPad testing, production AI/key setup, whole-sequence AI, additional response primitives and rigged animation remain open. Four navy/gold transparent reference sheets and a planned 40-clip pack are reviewable. No paid asset was purchased.

## Rulings and ledger

- Existing explicit owner approval covers this expansion; latest messages add scope, not an approval gate.
- Thomas supplied the corrected RinkReads URL, `https://ice-iq.vercel.app/`, and it was inspected. The earlier address without the hyphen is a different predictor app.
- Source lessons and editable drafts are separate: moving a player never silently inherits the source's answer key.
- Free procedural development art supports building the systems. It is not production character art or NHL visual parity.
- Use current `CLAUDE.md` main/commit/push direction; preserve unrelated untracked files and pending seeds.
- Shared interfaces: director/team modules produce generic actor frames; scene consumes them. Source adapter produces unchanged lesson records; shell selects them. Gym retains its own storage and scoring; shell supplies player identity.
- Tasks 2 and 3 have independent file ownership. Root owns the shell and shared renderer. One delegated implementer works on task 2 while root integrates sources. A separate read-only review may run concurrently.
- Task text consistency: team movement is actual simulation, director playback is explicit keyframe interpolation, source truth remains in original modules, game visual improvements do not redefine correct answers. Each has a distinct test surface.
