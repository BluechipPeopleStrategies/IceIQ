# Off-Puck Support, Offense (`off-puck-support-offense`)

**Domain:** Offensive Play  ·  **Anchor:** no  ·  **Ledger node ids:** u9.off-puck-support-offense, u11.off-puck-support-offense (no u7 node)

## Definition
Getting open for the carrier: support angles and distance, give-and-go timing, and driving to be the best option. Reading where to go without the puck so the carrier has a real option.

## The read (objective rule)
The correct support teammate is the one with BOTH (a) open ice and (b) a passing lane from the carrier that no defender crosses within ~0.035 of the lane. "Closest teammate" is the classic wrong answer when a defender sits in that near lane.

## Age calibration (wedge)
- **U9 (I):** one supporter open, one covered. Tap the open one.
- **U11 (D):** two plausible supporters; the better one has the cleaner lane and more space to attack from.

## Authoring notes for seeds
`selection` primitive fits best (tap the supporter). Place one teammate covered (a defender squarely in that lane) and one with a clean lane and space. Off-zone, view right, so a goalie auto-fills.

Validator reminders (verified against the compiler):
- U7/U9 use generic players: drop position tags from teammates and defenders; only `YOU` is tagged.
- Keep the carrier clearly inside the zone (x >= ~0.78 for a right-view off-zone) so it does not read as offside.
- Put a defender goal-side of the puck (between the puck and the net), and let that same defender be the one covering the wrong teammate's lane. Keep the correct teammate's lane clean (no defender within 0.035 of it).

## Citations
- Hockey Canada LTPD — support layers and off-puck movement in the development model.
- IIHF small-area-games research — support and decision load in 2v2/3v3.
- Pond / small-area — positionless read-and-react support.
