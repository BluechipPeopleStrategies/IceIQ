# Board Legibility (Direction + Identity) — Design

**Date:** 2026-06-13
**Status:** Approved approach (build the legibility fix); design for review.

## Goal

Make every board self-evident about (1) which way the play is attacking / where the
net is, and (2) who each labelled skater is — so a reviewer (and a player) never has
to guess orientation or role. This resolves a cluster of review notes that were not
board errors but legibility gaps:

- `1gcu`: "passing to these guys would be offside" (geometry is actually onside — the
  reviewer couldn't tell which way was up-ice).
- `gap_steer`: "would be nice to know which way was which... D-zone off the right vs left."
- `c9qi`: "Who is YOU — LD or RD?"
- `scanning_slot`: "Who is F3? Right now it just says you, left wing, right wing."

## What already exists (don't rebuild)

`RinkStage.jsx` already:
- Renders a **zone badge** top-left ("ATTACKING ZONE" / "DEFENDING ZONE" / "NEUTRAL
  ZONE", friendlier for U7/U9).
- **Hides position tags for U7/U9**, shows `actor.tag` for U11+ (per the diagram-marker
  rule).
- Colors the goalie by zone and draws the rink/nets via `RinkReadsRink`.

The gaps are narrow: there is no **directional** cue (which end is the net / up-ice),
and the **role tags** don't disambiguate (YOU carries no D-side; no F3).

## Design

### Part A — Direction cue (shared renderer change, no per-board data)

Add a single "to the net" indicator so orientation is unmistakable. Direction is
derived, never hand-authored:

1. `netSide` = side of the attacking/defended net:
   - If a `goalie` actor exists → the side of its x (`x < 0.5` → left, else right).
   - Else fall back to `stage.view` (`left` → left, `right` → right, `neutral` → none).
2. Render a small pill at the **net-side edge**, vertically centered, with a goal glyph
   and an arrow pointing toward that edge — e.g. net on the right shows `NET ▸` hugging
   the right boards; net on the left shows `◂ NET` hugging the left boards. Neutral view
   with no goalie shows nothing (both nets off-frame).
3. Keep the existing zone badge. The two together read as "DEFENDING ZONE … net is to
   your left," which is exactly the missing orientation.

This alone resolves `1gcu` and `gap_steer` (and every future board) with zero data edits.

Implementation: compute `netSide` in `RinkStage` next to `zoneLabel`; render an
absolutely-positioned pill (same style language as the zone badge) on the net side.
Pure presentation; no change to coords, hit-testing, or the actor layer.

### Part B — Role identity (targeted data, minor render)

The renderer already shows `actor.tag` for U11+. The fix is mostly **data**: give the
flagged boards correct, standard role tags.

- Standard vocabulary: `LD`, `RD`, `C`, `LW`, `RW`, `F1`/`F2`/`F3`, `G`, plus `YOU`.
  `YOU` may be combined with a role on U11+ D boards so the marker reads `YOU · LD`.
- `c9qi`: set the YOU actor's role to the D-side the scenario intends (LD or RD — needs
  a hockey call; see Open Questions).
- `scanning_slot`: label the unlabelled high forward `F3`.
- Render: where an actor is `YOU` and also has a role, show both (`YOU · LD`). Small
  tweak to `ActorMarker`'s `positionTag` so a YOU marker can carry a secondary role.

Part B is per-board and small; it does not gate Part A.

## Non-goals

- No attack-direction field added to seeds — direction is derived.
- No change to U7/U9 (still generic markers, no tags).
- No re-coordinate of any board (1gcu is already onside; only the cue is missing).

## Testing

- `scripts/check-seeds.mjs` still passes for any seed whose tags change.
- Build compiles; manual grid check: each board shows a net-side cue that matches where
  the goalie is; U11+ boards show role tags; U7/U9 unchanged.

## Open questions (for the hockey authority)

1. `c9qi`: is YOU the **LD** or **RD** on that board? (Determines the label.)
2. `scanning_slot`: confirm the unlabelled high forward is **F3** (vs C/F2).
