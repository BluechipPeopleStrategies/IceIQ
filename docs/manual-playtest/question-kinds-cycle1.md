# Manual Playtest Gate — Question Kinds Cycle 1

Status: PASS FOR ITEM 2 (Codex, 2026-07-09). Verdict and predict-next passed
for v1. Spot-mistake passed playtest 1 of 2; its factory gate remains locked
until the second clean playtest.

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
- [x] Watch chain plays once through; no skip button on first watch
- [x] U11 shows 2 judge options; U13 shows 3 (Right idea, wrong timing)
- [x] Judge pick swaps cleanly to the justify question
- [x] Justify evidence reads off the rink (defender commitment visible)
- [x] Debrief shows the pass lane; copy judges the read, never the player
- [x] DECISION (final review issue 3): the judge pick currently gives no
      feedback beat before the justify question, and the judge options'
      teaching copy never renders. Does the hard cut feel fine, or do we add
      a brief judge-feedback beat / fold the copy into the debrief?
      Decision: keep the hard cut for v1. The justify question carries the
      teaching point cleanly, and the debrief stays read-focused rather than
      judging the player.

### predict_2v1_defender_step_u13_v1 — U13
- [x] Freeze shows the problem only (no defender commitment, no cue leak)
- [x] All three options route to the truth node
- [x] "You predicted: X. Watch what actually happens." banner reads neutral
- [x] DECISION (final review issue 4): a wrong prediction still flashes the
      standard red button treatment for ~1s before the truth plays. Keep, or
      neutralize option styling for predict-next so the truth node carries
      all feedback (Prediction Reveal Rule, strict reading)?
      Decision: neutralize option styling for predict-next. 2026-07-09 run
      confirmed wrong predictions flashed red before the truth node. Fixed in
      `src/play/AnimatedPlay.jsx` and rerun with Playwright MCP: wrong
      predictions now stay neutral and route to truth.

### spotmistake_2v1_flat_support_u11_v1 — U11 and U13 (playtest 1 of 2)
- [x] Watch chain shows the pick-off clearly
- [x] Tap zones: tapping the actor glyph itself registers (not just the ring)
- [x] Exactly one defensible mistake: check against the sibling play
      twoOnOneSupportTooFlat + docs/library/two-on-one-support-too-flat.md —
      does F2-flat-support hold up as the single flaggable read, with F1's
      pass framed as the last domino?
- [x] Rewind node's "Flat" cue points at the read without clutter

### Regression spot-checks
- [x] One legacy play (2-on-1: Defender steps up) at U7: identical to before
- [x] Backcheck recovery at U7/U9: lane-pick zones unchanged (big radius)
- [x] Backcheck recovery at U11: zones render tight (4.5) with text fallback
- [x] U13 replay of the verdict play: "Skip to the question" appears on the
      second watch only

## Results

2026-07-09, Codex local dev run (`npm run dev`, Chrome/CDP, `#playtest`):

- Verdict U11/U13: pass. First watch had no skip button; U11 rendered 2 judge
  options; U13 rendered 3 including "Right idea, wrong timing"; judge choice
  swapped to justify; debrief rendered the pass lane and read-focused copy.
- Predict U13: pass after fix. Freeze and neutral truth banner passed, all
  three options routed to truth, and wrong predictions now stay visually neutral
  before the truth reveal.
- Spot-mistake U11/U13: playtest 1 of 2 passed. Actor-center taps on F2
  registered, the pick-off was clear, the rewind "Flat" cue was clean, and the
  single defensible mistake review held against the sibling play/source note.
- Regression: U7 2-on-1 rendered with playground labels/options; backcheck
  U7/U9 zones stayed at radius 6, U11 zones rendered at radius 4.5 with text
  labels; U13 verdict replay showed "Skip to the question" only after the first
  full watch.
- Console: no runtime exceptions. One harmless `splash.jpg` preload warning.

2026-07-09 follow-up fix verification:

- Added a regression check in `scripts/test-question-kinds.mjs` for neutral
  predict-next selection styling.
- `npm run test:question-kinds`: 35/35 pass.
- Playwright MCP on `#playtest`: wrong "defender sags" prediction stayed
  neutral (`rgb(205, 213, 224)` border, white background), then reached the
  truth node.
