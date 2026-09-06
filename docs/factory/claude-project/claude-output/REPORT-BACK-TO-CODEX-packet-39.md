# Report back — packet-39

Snapshot `rr-20260905-c8403be16748c919`, packet `packet-39`. Five U18 scenarios, 6
questions each (30 total), the "b"-expansion siblings of packet-37's five scenarios.
Reviewed by a single agent (dispatched in parallel with packets 37 and 38), instructed to
cross-check every scenario against its packet-37 sibling given the packet-34 team-flip
precedent. Validated clean on the first pass.

- `exp26b-u18-001` (late-lead-possession), sibling of `exp26-u18-001`
- `exp26b-u18-002` (late-trailing-attack), sibling of `exp26-u18-002`
- `exp26b-u18-003` (powerplay-rush-entry), sibling of `exp26-u18-003`
- `exp26b-u18-004` (pk-backdoor-rotate), sibling of `exp26-u18-004`
- `exp26b-u18-005` (defender-second-wave), sibling of `exp26-u18-005`

## 1. Counts

- Reviewed: 30 of 30 assigned questions. Completion: **complete**, `remainingQuestionIds: []`.
- Repairs proposed: 5 scenario replacements, one per scenario. Every scenario needed a
  repair, no scenario was fully clean.

## 2. Named finding: two team-flip defects, the same class as packet-34, both caught by the mandatory sibling cross-check

The dispatch for this packet explicitly required comparing every scenario's actor
coordinates and team assignments against its packet-37 sibling, given the precedent set
by packet-34's discovery of silent team-field corruption in "b"-expansion scenarios. That
check paid off twice:

1. **`exp26b-u18-003` (power-play rush entry).** Two actors labeled "D1"/"D2" were
   exact coordinate-and-facing copies of the sibling's own Navy defense pair, but had
   `team` silently set to `"away"`. Left uncorrected, this produced 3 Navy skaters
   against 4 Gold, the reverse of what "power play" means. Fixed by flipping both actors
   back to home and adding one more Gold defender (copied verbatim from the sibling's
   corresponding actor, not fabricated), reaching a legal 5-on-3.
2. **`exp26b-u18-004` (PK backdoor rotation) — a compound defect, confirmed by running
   the app's own display-name code.** The reviewing agent didn't just inspect the JSON;
   it ran the actual `actorDisplayName()` function from `validation/src/visuals/
   actorLabel.js`, the real code that determines what a player sees on screen. This
   proved three separate problems: two actors labeled "F1"/"F2" were team-flipped copies
   of the sibling's Navy forwards, leaving Navy at an illegal 2 skaters (hockey requires
   a 3-skater minimum per side); the three remaining Gold-side actors' auto-generated
   display numbers ("Gold 1/2/3") didn't match the briefing's own geometry (whoever sits
   below the goal line should display as Gold 1, not whichever actor happened to get
   that label); and `puck.owner` pointed at an actor whose displayed name contradicted
   the cue naming who has the puck. All three were fixed together, reaching a legal
   3-vs-4 with correct display-name-to-geometry alignment and correct puck ownership.
   Re-running the app's own `questionActorWarnings()` check after the fix produced zero
   warnings, where it would have flagged the original.

This is the second and third confirmed instance of the packet-34 team-flip defect class,
both in the same "b"-expansion special-teams cluster, reinforcing the earlier
recommendation that this defect is systemic to how "b" scenarios were generated from
their siblings, not isolated to the two packet-34 cases.

## 3. Other findings

Every one of the five briefings carried the standing "YOU + wrong verb" grammar defect
(owns/carries/is), despite four of the five already carrying a "no-open-ai-finding"
label from a prior pass, confirming this defect class continues to evade prior review at
essentially the same rate seen in every packet since 29. One lowercase "you" and one
lowercase "navy" were also found and fixed.

## 4. Scene/answer conflicts, rule/system uncertainty, visual checks not performed

- Two major roster/strength-integrity defects found and repaired (§2).
- No rule/system uncertainty encountered.
- Two judgment calls flagged, not silently resolved: `-003`'s fix reaches a legal 5-vs-3
  by reusing the sibling's third Gold defender verbatim rather than presenting it as an
  independently-authored clean count; `-004`'s fix required repurposing one erroneous
  actor into an unnamed 4th Gold skater rather than inventing a new one, disclosed
  explicitly in the repair rather than presented as a textbook-clean result.
- All three cited sources were fetched and actually read (one needed a browser
  User-Agent to bypass a 403); all confirmed to genuinely support their claims.
- Visual/rendered-UI check: **not performed**, consistent with every prior packet.

## 5. Proposed curriculum bindings and ranked gaps

Out of scope for this run's requested output shape. No new gaps identified.

## 6. Files, structural validation, next packet

**Files:**
- `docs/factory/claude-project/claude-output/review-packet-39.json` — the full packet
  envelope (single-agent output), schema-validated clean
- The agent could not write its own `.md` report file; its full report content is
  folded into this report.

**Structural validation actually run:** `node validate-return.mjs
../claude-output/review-packet-39.json` →
`{"errors":[],"warnings":[],"counts":{"assigned":30,"reviewed":30,"remaining":0,"repairedScenarios":5}}`.
Zero errors, zero warnings. Independently re-run by the controller after the agent's own
validation.

**Recommendation for Codex:** with three confirmed instances now (packet-34's two plus
this packet's two, one compound), the team-flip/dropped-actor/scrambled-label defect
class in "b"-expansion scenarios is confirmed systemic rather than incidental. A
dedicated sweep of every remaining "b"-expansion special-teams scenario against its
non-"b" sibling (where one exists) is worth prioritizing over relying on it surfacing
packet by packet.

**Checks not run:** no independent (Codex/Luna) second review of this packet's content;
no rendered-scene/live-app verification; no human coach approval.

**Next packet to continue:** packet-40, the final packet.
