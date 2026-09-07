# Justification-step build — dz-breakout icon-proximity mitigation

**Status:** built and live-verified in the catalog, 2026-07-30. Implements the
recommendation from `2026-07-30-icon-proximity-shortcut-solution.md`.

## The problem being closed

`dzBreakoutEscapePressure.js`'s correct tap zone (`escape_open_side`) is also
the zone farthest from any opposing icon on the sheet (29.4 units vs.
25.4/15.0/5.7 for the other three). A player can land on it by "tap the
biggest gap" guessing, with zero rink-reading. The research's recommendation:
don't fight the geometry — verify the read with a lightweight follow-up
question, and gate full credit on both.

## What got built

No renderer changes. The fix is pure play-data, reusing `read-mc` — the
default question kind every other node in the catalog already uses (freeze +
buttons + consequence, available at every age band per
`interactionProfiles.js`). The `verdict` kind's judge+justify mechanism was
considered and rejected: it's hardcoded to `kind === "verdict"` in
`AnimatedPlay.jsx`'s `choose()`, so using it would mean either touching the
shared renderer (every catalog play's blast radius) or replacing the
scenario's "tap the ice" mechanic with "watch then pick a button" — the
`reRead` follow-up-question pattern (validator-supported, previously unused
by any real content) needed neither.

Shape: `retrieval`'s correct option now routes to a new node,
`confirmCommit`, instead of straight to `escaped`. `confirmCommit` re-shows
the exact same frozen moment (identical `pos`, no new motion — a genuine
re-look, not a new scene) and asks the player to identify which forechecker
committed and to which side. Only the correct identification routes to
`escaped` (full positive outcome, unchanged). Either wrong identification
routes to a new terminal, `escapedButGuessed`: right escape, wrong reason,
told to the player honestly rather than silently scored.

## Four adversarial rounds — each one found something real

Every round was an independently blind agent, given the file and rendering
code but not the prior rounds' findings, instructed to try to break it. This
is the same blind-second-pass discipline used for gate 8 tonight, applied to
one scenario instead of the judgment rubric.

**Round 1 — the cue leaked the answer.** `validateFactoryStandards.js`
requires a `reRead` follow-up to carry a new visible `cue`. The first
version's cue read "Committed low," positioned directly on F1 — the answer,
rendered on the ice, before the player picked anything. Fixed: the cue is
now neutral text ("Read the ice again") positioned on D1/the puck, the
shared vantage point, naming neither actor nor side.

**Round 2 — the distractor set was solvable by word-frequency counting.**
The first fix used 3 options built as single-attribute swaps of the correct
answer (F2-low, F1-low\*, F1-middle). "F1" and "low" each appeared in 2 of 3
options — the option satisfying both majorities is deterministically
correct, no hockey judgment required, just counting words across the
choices. A second, independent attack: retrieval's own prompt says the
forechecker is "charging down **one side**," which eliminates any option
using "middle" by wording alone. Fixed: rebuilt as a full 2×2 (actor × side:
F1-low\*, F1-far, F2-low, F2-far) so both attributes tie 2-2 across all
options — frequency-counting can't converge on one answer — and "far side"
replaced "middle" so the earlier prompt line can't eliminate anything.

**Round 3 — the letter codes broke the question at two of four target age
bands.** `interactionProfiles.js` gives U11/U13 the "token" representation,
and `AnimatedPlay.jsx`'s actor-label render condition (line ~471) never
draws a text label for either forechecker at that tier — both render as
identical unlabeled dots. Separately, `playerFacingTextForAge()` blind-regex-
rewrites literal `F1`/`F2` into "teammate with the puck"/"support teammate"
for any non-film-room profile — copy written for `twoOnOneRead.js`, where
F1/F2 really are teammates, silently wrong here, where they're the opposing
forecheckers. My "F1 —.../F2 —..." option text hit both bugs at once. Fixed:
rewrote every option to identify each forechecker by visible behavior
("already at full speed" vs. "still reading" — vocabulary this file already
uses) instead of by letter code, for the primary ask, the terminal reveal,
and the teaching notes. Zero literal F1/F2 tokens remain in any
player-facing text field.

**Round 4 — clean, with two residual notes, both lower severity.** Confirmed
the letter-code fix holds and re-confirmed rounds 1-3 stayed fixed under the
new wording. Two things surfaced, neither treated as urgent:

- Retrieval's own wrong-answer feedback (`into_pressure`'s "they are
  **arriving with speed** you do not have yet," `through_the_slot`'s "the
  second forechecker is already **reading** it") pre-echoes the exact
  vocabulary `confirmCommit` now relies on. A player who taps wrong once,
  reads why, and replays correctly could reconstruct the answer from
  earlier feedback text rather than the rink. This requires a prior wrong
  attempt — never available in a single clean correct-first-try run — and
  arguably isn't a shortcut at all: reading wrong-answer feedback and
  applying it on retry is the intended learning loop, not an exploit of it.
  Left as-is; flagging for awareness, not fixing.
- The "already at full speed" vs. "still reading" distinction is read from
  frozen positioning, never from rendered motion — `visibleMotions()`
  deliberately strips `skate`/`shot` trails from every non-terminal node
  catalog-wide, "so the picture never leaks the answer." This makes the
  inference harder at token-tier specifically (no label to anchor it to a
  dot), but it's the same category of read the original `retrieval` node
  already asks for from frozen positions alone — a pre-existing design
  property of the whole file, not a defect introduced by this change.

## What this does and doesn't close

**Closed:** a lucky tap alone no longer earns the clean pass. It now also
has to survive a 4-way follow-up with no deterministic textual or frequency
shortcut — verified across two full adversarial rounds after the 2×2
rebalance.

**Not closed, and never claimed to be:** the original tap-zone geometry
itself is unchanged — `escape_open_side` is still the zone farthest from any
opposing icon. Per the research's own framing, this was always a
mitigation, not an elimination; full closure needs a "twin" scenario
(mirrored geometry where the far-from-icon zone and the correct zone
diverge), which is explicitly future, not-yet-authorized work.

## Verification

Full catalog test suite (`play-catalog`, `play-factory`, `animated-play`,
`question-kinds`, `play-engine`, `play-kernels`, `play-anchors` — 141 tests)
green after every edit, including the final wording pass. Four independent
blind adversarial agent reviews, each given only the file and rendering
source, no prior-round context.

## File changed

`src/play/plays/dzBreakoutEscapePressure.js` — `retrieval`'s correct-option
routing, new `confirmCommit` node, new `escapedButGuessed` terminal.
