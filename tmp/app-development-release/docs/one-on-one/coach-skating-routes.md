# Coach Lab player routes

**Status:** deployed in `106ec3e` and verified on the live phone-sized HTTPS site at 03:59 Edmonton, September 5. Release evidence is in `phone-preview.md`.
**Date:** 2026-09-05.

Coach Lab's **Plan player route** control turns a coach's chosen points and
finish time into ordinary director position keys. It supports discussion of
space, pressure direction and support lanes. The points and timing are authored
by the coach; the source notes do not generate them or certify the route.

## Planning and applying movement

1. Choose a player in the director and pause at the intended start. The player
   must be unfrozen, live practice must be closed, and at least 0.05 seconds must
   remain in the draft. **Plan player route** captures that player, draft and
   moment. The editor shows the sampled Start coordinates and time.
2. Add 1–12 destination points after Start. Tap inside the boards in the 3D
   whole-rink or broadcast view, use the SVG **Rink board**, or enter both
   canonical metre coordinates and press **Add route point**. The numeric form
   retains blank/minus intermediates and rejects incomplete, non-finite or
   out-of-rink points. Consecutive identical points are rejected; a later return
   to an earlier point is allowed.
3. Set **Finish route at (seconds)** within the draft duration. The list shows
   numbered destinations and their assigned times. **Undo last point** and
   **Clear points** edit the pending route. Ice taps add points only while paused
   at Start; **Return to Start** restores that view.
4. **Preview planned movement** follows the points and shows preview time and
   planned distance. Pause or use the progress slider to inspect a moment. The
   preview controls scroll into view when playback starts. With reduced motion,
   **Inspect route finish** jumps to the endpoint and the slider remains usable.
5. **Cancel route** discards the pending plan. **Apply player route** replaces the
   selected player's remaining movement from Start and returns to that moment
   in the director. Other authoring controls are disabled while planning; an
   unexpected draft, player or start-time change prevents applying a stale plan.

The pending editor does not alter the director draft or saved library. After
Apply, **Undo route** restores the preceding draft while that applied draft is
still current; another draft edit clears this one-step undo. Use the existing
**Save draft** or **Export** controls to retain applied keys. There is no new
route storage format or automatic save of pending points.

## Timing, facing and playback

The route joins positions with straight segments. Segment time is proportional
to segment length, producing a constant planned travel rate over the chosen
interval. The player holds the endpoint through the rest of the draft.

**Keep the current facing direction** is the default and holds the sampled
absolute facing. **Turn toward each segment's direction** sets each destination
key's facing to its incoming segment bearing; the director blends facing from
one key to the next while the player moves. Neither mode tracks the puck or
demonstrates footwork, edge use or validated turning mechanics.

In this preview, other players follow their own existing director keys and the
puck follows its unchanged current carrier. Applying a route preserves those
keys and puck ownership. **Animate play** follows the authored director keys.
**Play this setup** starts the separate live-practice simulation from the
initial setup and uses that simulation's movement.

The [U9/U11 support-route planner](u11-read-sequence.md) is a separate learner
interaction: only the selected off-puck marker follows the learner's route,
while other players and the puck remain frozen. Its saved reflection and reason
do not become Coach Lab director movement automatically.

## Helper contract

Implementation: [directorRoutes.js](../../src/one-on-one/directorRoutes.js),
[CoachRouteEditor.jsx](../../src/one-on-one/CoachRouteEditor.jsx),
[CoachRouteBoard.jsx](../../src/one-on-one/CoachRouteBoard.jsx) and
[CoachLab.jsx](../../src/one-on-one/CoachLab.jsx).

```js
createDirectorRoutePlan(draft, {
  actorId, startTime, endTime, points, facingMode: 'keep' // or 'travel'
})
// => { draft, origin, timedPoints, distanceM, replacedKeys,
//      actorLabel, startTime, endTime }
```

The helper validates the input and resulting director draft, finite rink
coordinates, an increasing interval of at least 0.05 seconds, 1–12 destinations
and distinct key times. It returns a cloned draft. For the selected player, it
keeps keys strictly before Start, adds an exact sampled Start anchor, and
replaces every key at or after Start with the route. The anchor preserves the
earlier position and facing interpolation. Other actors, puck ownership and
source metadata are retained. The endpoint holds because no later player keys
remain. The result uses the existing `rinkreads-director-draft-v1` schema.

## Source teaching uses

These are uses of the authoring tool, not newly completed source-specific
lessons. Each requires an explicit board, visible cue and coach-authored route.

| Exact source note | Route discussion it can support | Cue or limit that must remain explicit |
|---|---|---|
| [Off-puck support, offense](../library/off-puck-support-offense.md), Definition / The read / Age calibration | Plan movement toward separate open ice and discuss the passing line from the carrier. | Show the carrier, defender and space. The note's approximate normalized lane-clearance reminder is not a metre threshold or route score. U9 uses a simple open/covered cue and only `YOU` as a visible player tag. |
| [Forecheck pressure](../library/forecheck-pressure.md), Objective Read / Second Read: The Reverse / Authoring Notes | Draw a pressure angle and discuss which middle or reverse outlet remains visible. | Carrier movement or a turn-back must be separately authored. A forecheck route does not cause an inferred carrier response or pass. |
| [Backcheck recovery](../library/backcheck-recovery.md), Objective Read / Authoring Notes | Draw an inside recovery route and explain which support threat it addresses. | Show the inside threat and the player already covering the carrier. The route does not guarantee that an outlet is removed. |
| [Backcheck recovery: defender gets beat](../library/backcheck-recovery-defender-gets-beat.md), Teaching Point / Main Cue | Discuss a change from support coverage to becoming the next inside defender. | The first defender's loss of the carrier must be visible in an authored state or movement; the tool does not detect or manufacture that event. |
| [Defensive angling](../library/defensive-angling.md) | Compare a planned inside approach with the visible middle lane. | Author the carrier threat explicitly. Facing interpolation is a diagram cue, not a skating demonstration. |
| [D-zone retrieval under pressure](../library/dz-breakout-retrieval-under-pressure.md) | Plan a carry route away from an already visible forecheck commitment. | Author the commitment and net-side cue. The tool does not supply the approach, a reverse pass or a successful escape. |

No route receives a correctness score, AI judgment, collision-success result or
on-ice transfer claim. A pass-transfer timeline, pass-path authoring and automatic
opponent reactions remain unbuilt in this editor. Existing live-practice pass
controls and authored connected-read pass branches are separate capabilities.

The 225-test practice suite and production build pass. Browser checks include
actual touch, both cameras, board/numeric points, cancellation, scoped Apply and
Undo, nonzero Start, animation and exact Save/Export/Reload. See
[verification.md](verification.md) for the local production-preview record and
[phone-preview.md](phone-preview.md) for publication. No physical-phone,
skating-validity or curriculum-admission result is asserted.
