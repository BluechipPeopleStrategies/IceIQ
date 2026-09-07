# Wall-anchor investigation — findings and resolution

**Status:** investigation record, resolved and implemented same night. This
document captures the reasoning behind a real code change already made in
`src/play/rinkAnchors.js` and `src/play/validateAnchorFidelity.js` — it is a
record of why, not a pending proposal.

## The question

`docs/superpowers/specs/2026-07-30-anchor-fidelity-validator-design.md`'s
catalog audit flagged four "wall"/boards claims across three plays
(`forecheckPressure.js`, `forecheckTakeAwayReverse.js` ×2,
`backcheckRecovery.js`) sitting 8.0–11.66 units from the single point anchor
`wallBottomRight [168,71]` — the same magnitude as the confirmed
`dzBreakoutEscapePressure.js` "behind the net" bug (11.51 units). The open
question: are these four a second real content bug, or is a single point
anchor structurally the wrong shape to check a boards-length landmark
against?

## Investigation — per-instance findings

Full source of all three plays was read node-by-node, not just the flagged
positions:

- **`forecheckPressure.js` / `forcedWall`** — A1's puck position `[168,63]`
  is the resting state after a "removed the middle, forced a predictable
  wall play" outcome — no explicit motion carries it further toward the
  boards. It sits almost exactly on `circleBottomRight [169,63]` (~1.0
  units), a legitimate nearby landmark, not a miss. Directional outcome, not
  a fixed point.
- **`forecheckTakeAwayReverse.js` / `pressure`** — A1 `[172,62]` is reached
  via an explicit skate motion `[182,60]→[172,62]`, matching the node's own
  text ("the carrier **starts** up the wall") — an explicit mid-transit
  snapshot along a directional path, not arrival at a landmark.
- **`forecheckTakeAwayReverse.js` / `sealed`** — A1 `[162,64]`. The node's
  own text is explicit and forward-looking: the carrier "has to keep going
  up the wall **into your pinching defender**" (D1, at `[146,63]`).
  Concretely checkable: distance from A1 to D1 is 16.0 units today; moving A1
  to the point anchor `[168,71]` would *increase* that to 23.4 units,
  directly contradicting the node's own stated relationship. Moving this
  instance to the anchor would make the scenario measurably **less**
  correct, not more.
- **`backcheckRecovery.js` / `wallRecovery`** — reached via a
  `choiceMode:'lane-pick'` option (`go_wall`) whose own tap-zone is
  `[158,68,6]`. BC1's resolved position `[158,68]` matches that zone's
  center exactly (distance 0). This node's correctness is defined by its own
  UI interaction zone, not by proximity to any rink anchor — moving it to
  the point anchor (10.44 units away) would place the actor **outside its
  own tap-zone**, a direct mechanical regression.

**Cross-instance pattern:** all four are directional/behavioral uses of "the
wall" (a carrier starting a rush, being funneled toward a named teammate, or
picking one of four UI lanes) — never a discrete structure like a net with
one correct location. None needed a coordinate change.

## Correcting a real error in the initial research proposal

The research phase (informing this investigation) proposed treating
`wallTopRight [168,14]` and `wallBottomRight [168,71]` as the two endpoints
of one wall segment. **This was verified wrong before any code was written.**
Reading `rinkAnchors.js`'s own header comment (`goal lines x=11.7/188.3,
blue lines x=74-76/124-126, right-zone circles at [169,22]/[169,63], net
x=189-193`) confirms every existing Top/Bottom anchor pair is mirror-symmetric
across `midY=42.5` — the same pattern as `circleTopRight`/`circleBottomRight`
and `cornerTopRight`/`cornerBottomRight`. `wallTopRight` and `wallBottomRight`
sit on **opposite** side-boards; a segment between them would cut straight
across the ice through the slot, not run along any boards. The only
geometrically valid same-side pairing is wall + corner on the same side:
`wallBottomRight [168,71]` → `cornerBottomRight [184,68]` (and the mirrored
top/left variants).

## Resolution

**Verdict: modeling limitation, not a content bug.** Zero of the four
instances needed a coordinate change. Implemented instead, in
`src/play/rinkAnchors.js`:

- `WALL_SEGMENTS` (and flat `WALL_SEGMENT_NAMES` for validator lookup) — the
  corrected same-side wall+corner pairings, for both rink sides.
- `nearestPointOnSegment()` / `distanceToSegment()` — standard clamped-t
  point-to-segment projection.

And in `src/play/validateAnchorFidelity.js`: `intendedAnchor` now resolves
against a point (5-unit tolerance) or, if not found there, a named segment
(10-unit tolerance — wider because even the geometrically corrected boards
line still puts legitimate directional content at 7.9–9.2 units, per the
re-measured distances below).

**Re-measured against the corrected segment** (`wallBottomRight` →
`cornerBottomRight`): `forcedWall` 7.86 units, `pressure` 8.11 units,
`sealed` 9.22 units (clamps to the segment's own endpoint, since it sits
down-ice of the segment) — all comfortably inside the 10-unit tolerance.
`wallRecovery` is deliberately left untagged (see the comment in
`backcheckRecovery.js`) since its correctness is defined by its own
`choiceMode:'lane-pick'` zone, a check this validator doesn't yet implement.

Three plays now carry real `intendedAnchor: { A1: "wallSegmentRightBottom" }`
declarations as proof: `forecheckPressure.js`, and both flagged nodes in
`forecheckTakeAwayReverse.js`. All pass. Full test suite: 54/54 green.
