# One-on-one practice rink implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement the bounded tasks below. Root integrates and reviews; only root commits shared files.

**Goal:** Build the approved three-mode browser game as a local development preview and make the remaining production-art requirements reviewable.

**Architecture:** Pure fixed-step simulation and stored replay frames feed one R3F scene. A React shell handles mode selection, keyboard/touch inputs and coach setup. Existing scenario-engine contracts supply units and rink geometry, not the live runtime.

**Tech Stack:** Existing JavaScript/JSX, React 18, Vite, Three.js, R3F; Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-04-one-on-one-practice-rink-design.md`.

## Global constraints

- No purchases, curriculum promotion, new dependency, auth/payment/cloud-data changes.
- Separate `src/one-on-one/` files; lazy route is development-only.
- Source units: metres/seconds, +x attack; renderer `[y,height,-x]`.
- Player art remains visibly provisional. No NHL-equivalence or youth-transfer claims.
- Main-worktree use follows the later explicit `CLAUDE.md` instruction. Preserve all pre-existing untracked assets and seeds. Root alone stages/commits named files.

## Task 1: Simulation and coach setup

Create `src/one-on-one/simulation.js`, `simulation.test.mjs`.

Public contract:

```js
export const DT = 1 / 60;
export const DEFAULT_SETUP = { pressure: 'contain', gap: 5, lane: 3, speed: 4, role: 'attacker' };
export function normalizeSetup(input) {} // validates and returns known fields
export function createGame(setup = DEFAULT_SETUP, seed = 7) {} // serializable snapshot
export function stepGame(state, input = {}, dt = DT) {} // next snapshot, never mutates prior
export function describeRep(state) {} // { title, detail }, event-based feedback
```

State: `{time,tick,seed,setup,attacker:{x,y,vx,vy,facing},defender:{...},goalie:{...},puck:{x,y,vx,vy,owner},outcome,events}`. Input `{moveX,moveY,action,auto,choice}` uses canonical axes; auto drives demonstration. Choices are `inside`, `outside`, `shoot`. Outcomes are null or `goal`, `save`, `turnover`, `timeout`. Include `shotAt`/`actionAt` or equivalent cooldown timestamps as needed. Actor positions adjustable via validated setup `attackerX`, `attackerY`, `defenderX`, `defenderY` optional numeric fields.

- [ ] Write meaningful red tests for immutable deterministic stepping, movement under directional input, defensive role input, bounds, clean goal crossing vs wide shot, goalie save, turnover and finite setup rejection.
- [ ] Run `node --test src/one-on-one/simulation.test.mjs`; confirm missing feature is the failure.
- [ ] Implement acceleration and bounded steering, policy-driven opponent and goalie, swept goal checks and cooldowns. Stop after terminal state.
- [ ] Run tests and inspect a seeded 10-second demo trace for useful separation of pressure modes.

## Task 2: Shared animated scene

Create `PracticeScene.jsx`, `Skater.jsx`, and `rinkMaterials.js` under `src/one-on-one/`. Consume Task 1 snapshots through a ref (no imports needed from simulation); scene is independently inspectable with a fixture.

```jsx
export default function PracticeScene({ frameRef, camera = 'broadcast', onPlace, selectedActor, showGuides = true }) {}
```

`frameRef.current` holds a Task 1 snapshot. R3F `useFrame` copies positions into scene objects; renderer never advances physics. Scene uses existing rink profile dimensions, runtime-generated ice texture, rounded boards, believable goal, lights and arena context. Articulated development skaters turn and skate from actual velocity and face state; goalie differs visibly. All displayed state comes from the frame, including scrubbed frames. `onPlace({x,y})` raycasts ice in coach placement mode. Expose accessible canvas name, safe WebGL failure and dispose generated resources.

- [ ] Build rink materials and mesh components without paid assets or new dependencies.
- [ ] Add player movement and cue rendering; keep blade and stick continuous.
- [ ] Verify actual scene from gameplay and tactical cameras. Label art provisional in shell.

## Task 3: Three-mode shell and replay

Create `OneOnOne.jsx`, `oneOnOne.css`, `replay.js`, `replay.test.mjs`.

```js
export function branchFrames(frames, index) {} // returns copied prefix, validates index
export function validateReplay(value) {} // validate version and bounded frame states
```

- [ ] Test that branching keeps the selected frame and removes only future frames; reject malformed/nonfinite replays.
- [ ] Implement a bounded fixed-step RAF clock; immutable snapshots become replay frames. Pause on hidden/blur, clear captured inputs on cancellation/unmount.
- [ ] Build Play controls, Read & React freeze at an early decision time, read choices and take-control action; Coach Lab parameter inputs, actor placement and local save/reopen.
- [ ] Add pause, speed, timeline scrub, branch, reset, camera switch, replay download and context feedback. Export development replay version, never a fabricated approved teaching artifact.
- [ ] Add `#one-on-one` lazy DEV route to `src/App.jsx`; preserve normal app load splitting.
- [ ] Browser-check all modes, keyboard/touch, replay and local save. Capture actual screenshots.

## Task 4: Production asset shortlist

Create `docs/one-on-one/asset-shortlist.md`. Inspect primary seller listings for model, rig, skating/goalie coverage, format and price. Record unavailable prices as unavailable. No purchase. Explain what an imported animation test must still prove and distinguish stock model appearance from target youth art.

## Task 5: Verification and integration

- [ ] Independent code review of gameplay/replay and shell, fix concrete findings.
- [ ] Run new tests, existing scenario suite, and production build.
- [ ] Browser render and flow verification at desktop and narrow/tablet sizes. Physical iPad gate remains pending unless actually tested.
- [ ] Update `docs/roadmap/TASKS.md`, record completed vs open gates in `docs/one-on-one/verification.md`, commit only this task's files with conventional message and Co-Authored-By trailer.

## Completion checkpoint — September 5

The development slice is implemented: lazy route, procedural scene, simulation/replay, setup persistence, actual browser flows and independent review fixes. It subsequently expanded into the integrated framework; current evidence is in `docs/one-on-one/verification.md` and `morning-review.md`. The combined practice suite passes 153 tests, the existing scenario-engine suite passes and the production build passes. Physical iPad and production character acceptance remain open. Checkboxes above preserve the original breakdown; this checkpoint is the current status.

## Execution ledger

Preflight review:

| Tasks | Shared boundary | Finding / ruling |
|---|---|---|
| 1 / 2 | Serializable actor/puck snapshot | Contract above fixes axes and ownership; scene reads without stepping. |
| 1 / 3 | createGame/stepGame + input | Root owns clock and replay; sim owns outcomes. |
| 2 / 3 | frameRef + placement callback | Root controls timeline; scene reports canonical points. |
| 1 | Tests vs runtime | Physics tuning is game feel, not new sourced youth constants. |
| 2 | Visual target vs available assets | Ruling: interim skater art is development-only; real asset acceptance remains open. |
| 3 | Persistence vs user-data boundary | Only local setup JSON, no profile/telemetry/cloud writes. |
| 4 | Commercial assets vs budget | Shortlist authorized; price review required before purchase. |
| 5 | Main/push instructions vs unapproved content | Commit implementation on main per current policy; DEV-only route keeps prototype out of normal product navigation. |

Ruling: The user's explicit approval of the presented first-build direction is the design go-ahead; do not ask them to repeat it for a written copy. Asset purchases and production gates remain distinct.
