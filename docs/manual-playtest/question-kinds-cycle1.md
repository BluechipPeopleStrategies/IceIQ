# Manual Playtest Gate — Question Kinds Cycle 1

Status: PENDING (Thomas). Per the plan, this gate must pass before any new
kind's factory gate opens for bulk production.

How to run: `npm run dev`, open the Animated read kernel harness (`#playtest`),
select each play below at each band listed.

## Gate rules

- predict-next and verdict: factory gate opens after ONE clean playtest each.
- spot-mistake: stays factory-locked until TWO clean playtests
  (One Defensible Mistake Rule).
- Record what was shown, what was tapped, whether the read stayed objective,
  and any reveal that leaked the answer.

## Plays to test

### verdict_2v1_forced_shot_u11_v1 — U11 and U13
- [ ] Watch chain plays once through; no skip button on first watch
- [ ] U11 shows 2 judge options; U13 shows 3 (Right idea, wrong timing)
- [ ] Judge pick swaps cleanly to the justify question
- [ ] Justify evidence reads off the rink (defender commitment visible)
- [ ] Debrief shows the pass lane; copy judges the read, never the player
- [ ] DECISION (final review issue 3): the judge pick currently gives no
      feedback beat before the justify question, and the judge options'
      teaching copy never renders. Does the hard cut feel fine, or do we add
      a brief judge-feedback beat / fold the copy into the debrief?

### predict_2v1_defender_step_u13_v1 — U13
- [ ] Freeze shows the problem only (no defender commitment, no cue leak)
- [ ] All three options route to the truth node
- [ ] "You predicted: X. Watch what actually happens." banner reads neutral
- [ ] DECISION (final review issue 4): a wrong prediction still flashes the
      standard red button treatment for ~1s before the truth plays. Keep, or
      neutralize option styling for predict-next so the truth node carries
      all feedback (Prediction Reveal Rule, strict reading)?

### spotmistake_2v1_flat_support_u11_v1 — U11 and U13 (playtest 1 of 2)
- [ ] Watch chain shows the pick-off clearly
- [ ] Tap zones: tapping the actor glyph itself registers (not just the ring)
- [ ] Exactly one defensible mistake: check against the sibling play
      twoOnOneSupportTooFlat + docs/library/two-on-one-support-too-flat.md —
      does F2-flat-support hold up as the single flaggable read, with F1's
      pass framed as the last domino?
- [ ] Rewind node's "Flat" cue points at the read without clutter

### Regression spot-checks
- [ ] One legacy play (2-on-1: Defender steps up) at U7: identical to before
- [ ] Backcheck recovery at U7/U9: lane-pick zones unchanged (big radius)
- [ ] Backcheck recovery at U11: zones render tight (4.5) with text fallback
- [ ] U13 replay of the verdict play: "Skip to the question" appears on the
      second watch only

## Results

(record per session: date, band, pass/fail per item, notes)
