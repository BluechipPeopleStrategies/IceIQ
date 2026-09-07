# Scenario Board Review Rubric

What "good" looks like for a generated diagram question. Both the **deterministic
gates** (validators + value model) and the **AI coach panel** check against this.
Every item that can be made mechanical should become a validator rule (see
`src/scenario/LESSONS.md`); the panel exists to find the items that aren't rules
*yet*, so they can be promoted.

Each finding should be tagged:
- **MECHANICAL** — already (or could be) a deterministic rule → a board failing
  this should never have reached review; if it did, the rule is missing/broken.
- **RULE-CANDIDATE** — a general truth the panel caught that isn't a rule yet →
  promote it to `validators.js` + a golden test.
- **ONE-OFF** — specific to this board, fix in place; not generalizable.

## 1. Hockey coherence
- The labeled answer is the **best play** for the situation. *(value gate)*
- An off-zone attack has a defender **goal-side** of the puck. *(defenderGoalSide)*
- No **offsides**: on an entry, no teammate is deeper than the puck. *(offsidesOnEntry)*
- Players sit in **realistic positions** for the named situation (a 2-on-1 D is
  net-side; forwards aren't behind the puck on a rush; goalie in the crease).
- Attack direction and which net is in play are **unambiguous**.

## 2. The read is a real choice
- Exactly **one clearly-best answer** (or the declared `expectCorrect`). *(cardinality gate)*
- The geometry **is** the read: the open option's lane is clear; at least one
  tempting option is genuinely covered. *(selectionOpenLaneClear)*
- Wrong options are **plausible but distinguishable** — not obviously silly, not
  secretly also correct.

## 3. Concrete, understandable target
- A "pick the spot" answer targets a **player or a self-relative position**
  (e.g. "where YOU step up"), **never abstract empty ice** or "the lane."
  *(recurring lesson — backdoor, nz-gap)*
- A kid can tell **what's being asked** from the prompt + board alone.
- The prompt names what's on the board (no "white jersey" when it's drawn blue).

## 4. Age-appropriateness
- Difficulty matches the curriculum **depth** of the node. *(curriculum alignment)*
- Spacing/complexity scales with depth: introduced = wider, simpler; refinement =
  tighter, subtler. *(age-scaled geometry)*
- Player count and read complexity suit the age band.

## 5. Visual correctness
- Net, crease, goalie, and goal line are drawn consistently; goalie in the crease.
- No two skaters overlap; every actor reads as distinct. *(actorsDoNotOverlap)*
- The revealed read (arrow/ring) lands on the right actor/spot.

## 6. UX / clarity
- Decision-type reads (gap control: step up vs back off) are **multiple choice**
  with clear options — not a fuzzy tap zone.
- Feedback explains the *why*, briefly, in a coach's voice.
