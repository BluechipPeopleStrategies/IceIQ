# First assignment: shared 3D players and decisions

Status: prepared assignment, not a completed hockey review. This is the first
bounded use of the new role before extending reviewed patterns across scenarios.

Read `docs/art/animation-pack/STANDARD.md` and
`docs/art/animation-pack/2026-09-06-implementation-review.md`. Inspect the actual
current files under `src/visuals/player-lab/`, the shared player rig and motion
mapping, and matching Blender candidates when available. Resolve current paths
and record hashes; neither an old screenshot nor this brief is current proof.

Prepare hockey requirements and then review these four slices:

1. **Rim retrieval:** one defined age/skill and handedness, a trace covering
   approach through control and exit, pressure/opponents and puck-board travel.
   Identify when preparation begins and which cues support the chosen exit.
2. **Defensive skating:** backward containment, a real glide and a forward
   recovery/transition. Check the difference between travel, facing, gaze and
   leg action; a defender is not assigned a single universal skate cycle.
3. **Goalie:** crease movement, set and recovery tied to puck position with
   goalie-specific reference. Assess actual motion, not only a static mesh.
4. **First-person decision:** same canonical moment in player-eye and external
   views, own stick/gloves, one saved optional question angle, and a deliberate
   cue-occlusion variant. Review what the observer could know before grading.

Compare young rounded and older athletic characters without changing the
underlying scenario truth. Inspect phone and desktop framing. Tactical X/O
presentation does not substitute for a physical first-person body.

Known evidence limits to check rather than silently waive: the lab's rim mode
was a preparation study, not a validated contact/control sequence; a built GLB
or passing renderer test does not establish authentic skating. Human coach
calibration and actual invocation of this new authority remain pending.

Deliver the domain table and exact corrections from `review-contract.md`.
Use HOLD only for the checks whose indispensable evidence is missing; finish
the others. Keep subsequent review versions so overturned passes remain visible.
