# Play Engine Audit — vs. Animation / Game-Engine Practice

Date: 2026-07-09
Scope: the animated-play engine (`src/play/`) — renderer, motion vocabulary,
token system, question kinds, validators, telemetry. Audited against the
standard toolkits of animation software (keyframes, motion paths, easing),
game engines (state machines, tweens, named markers, replay ghosting), and
sports telestration (curved routes, sequenced reveals).

Purpose: pick the improvements that most help GENERATING BATCHES of native
plays — expressiveness, authoring safety, and visible consequences — before
the native rebuild of the inspiration backlog.

## What the engine already does like a real engine

These are genuine strengths; none of the improvements below should disturb them.

- **Data-driven state machine.** Plays are declarative objects; nodes are
  states, options are transitions. This is exactly how game engines model
  dialogue/behavior trees. Content ships without touching the renderer.
- **Question-kind registry** (`questionKinds.js`) — interaction modes are
  born in one registry and validated everywhere else (Kind Registry Rule).
- **Age profiles as presentation layers** (`interactionProfiles.js`) — one
  play renders six ways (figure/token/symbol, youngT text, kinds gating).
- **Watch chains** (`autoNext`) — cutscene sequencing with skip, capped at 3.
- **Validators + factory standards + generated reports** — a content CI
  most game teams would envy.
- **Prototype telemetry** with young-group text resolution.
- **Variants via deep-merge** (`makePlayVariant`) — prefab-style reuse.

## Gap analysis

| # | Engine-standard capability | Our engine today | Cost to batch generation |
|---|---|---|---|
| 1 | Motion paths / splines (waypoints) | Motions are single-segment `from`→`to`. Skate/blocked draw straight; pass/shot get one hard-coded upward bump (`min(y1,y2)-7`) with no authoring control — it can even bow the wrong way. | Whole play concepts are unbuildable: behind-the-net reverses/wraps, curl-and-drag routes, angling arcs, D pivots. Take-away-the-reverse had to be reframed as a wall bump-back because of this. |
| 2 | Timeline / tween sequencing (keyframes, stagger, easing control) | All motion lines pop in together at +500 ms; every token shares one 1.4 s ease. No per-motion delay or order. | Real plays are sequential (pass THEN shot; carrier commits THEN defender pivots). Without sequencing, multi-beat reads collapse into a simultaneous diagram and generated batches all feel identical. |
| 3 | Replay ghosting / telestration trails | Terminal nodes FILTER OUT skate motions (`AnimatedPlay.jsx` visible-motions rule), so the route that produced the outcome never renders; only token glide + text remain. | The QC checklist requires "wrong-answer consequences are visible." Today that's told, not shown — every batch play needs prose to compensate. |
| 4 | Named markers / spawn points | Every position is a hand-typed `[x, y]`. Nothing enforces that "the slot," "the point," "the corner" mean the same spot across plays. | Coordinate drift is the #1 visual-alignment QC risk when generating many plays (puck not matching the question, YOU ambiguous, lanes not lining up). |
| 5 | Sprite orientation (face velocity) | Tokens have no facing. | Minor at current art level. Backlog. |
| 6 | Camera moves (punch-in on the read) | Fixed viewBox per play. | Nice-to-have. Backlog. |
| 7 | Puck travels the pass path | Puck teleports via CSS transform, straight line, even on curved passes. | Cosmetic until paths curve; revisit after #1 beds in. Backlog. |
| 8 | Audio/juice on reveal | `celebrate` profile exists but no payoff in this renderer. | Gym owns juice for now. Backlog. |
| 9 | Headless frame exporter (QC stills) | Rink renders only in-browser. | Would speed batch QC; bank-dashboard iframes cover it today. Backlog. |

## The four improvements wired in (chosen for batch generation)

1. **Waypoint motion paths.** Motions accept optional `via: [[x,y], ...]`
   between `from` and `to`; 3+ points render as a smooth Catmull-Rom curve
   (any kind). Two-point motions render EXACTLY as before (straight, or the
   legacy pass bump), so all existing plays are pixel-identical. Validators
   check `via` points. Unlocks: behind-the-net reverses, wraps, curls,
   angling arcs.
2. **Motion choreography.** Motions accept optional `seq` (integer beat) or
   `delayMs`; by default motions reveal staggered in authored order instead
   of popping in together. Implemented as a deterministic pure function
   (`motionTimings`) + CSS fade-in with per-motion delay; honors
   `prefers-reduced-motion`. Batch specs can now express "then."
3. **Outcome ghost trails.** Terminal nodes now RENDER skate motions as
   faded, dashed, arrow-tipped trails (telestration ghosting) instead of
   dropping them. Zero authoring cost — every existing terminal already
   carries these motions; wrong-answer consequences become visible
   immediately, across all plays, old and new.
4. **Named rink anchors** (`rinkAnchors.js`). Landmark vocabulary
   (`slotRight`, `netFrontRight`, `behindNetRight`, `cornerBottomRight`,
   `pointTopRight`, ...) + `at(name, dx, dy)` offset helper + `mirrorX` for
   half-left authoring. Used at authoring/generation time, so play data
   stays plain `[x,y]` and the renderer/validators are untouched. Batch
   generators emit semantic positions; "the slot" is the same spot in every
   play. Bounds are unit-tested against the drawn rink.

Renderer-behavior change to be aware of during visual QC: terminals now show
ghost trails (improvement 3) and motions reveal in sequence (improvement 2).
Question nodes still hide skate and shot lines — no answer leaks.

## Authoring quick reference

```js
// Curved reverse behind the net (previously impossible):
{ kind: "pass", from: [184, 58], via: [[193, 50], [193, 35]], to: [184, 27], label: "reverse" }

// Beats: carrier commits (beat 0), defender pivots (beat 1), lane closes (beat 2):
{ kind: "skate", from: [145, 42], to: [160, 47], actor: "A1", seq: 0 }
{ kind: "skate", from: [160, 43], to: [166, 47], actor: "D1", seq: 1 }
{ kind: "blocked", from: [169, 55], to: [187, 42], label: "middle protected", seq: 2 }

// Semantic positions at authoring/generation time:
import { at } from "../rinkAnchors.js";
pos: { A1: at("slotRight"), D1: at("netFrontRight", -6, 2), G: at("goalieRight") }
```

## Backlog (documented, deliberately not built now)

Token facing, camera punch-ins, puck-follows-path, reveal audio/particles,
headless still exporter, seeded variation. Revisit after the first native
batch ships and telemetry says which of these earns its keep.
