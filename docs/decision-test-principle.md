# The Decision Test — what makes a board a real read

**Date:** 2026-06-13 · **Status:** standing design principle

## The problem this solves

Across MC boards, gap-control boards, and positioning boards, the coaches (and
Thomas) keep flagging the same failure: **"only one option / not a real read."** The
board asks the player to recall the textbook answer instead of READING the ice and
deciding. We keep rediscovering this one board at a time and reworking reactively. We
need a single test, applied *before* a board ships, that prevents it.

## The solution: two conditions, both required

A board tests decision-making **if and only if** it passes BOTH tests.

### 1. The Mirror Test — is it a read, or recall?

> There must be a **cue** on the board such that, if you changed only that cue, a
> **different answer would be correct.**

- **Pass:** "The forecheck sealed the strong-side wall → break out weak-side." Mirror
  the forecheck to the other wall and the answer flips. The player must read the cue.
- **Fail:** "Where does the winger stand on a breakout?" The answer is the same in every
  game. That's recall. Kill it or reframe it.

The **cue** is the thing the player must read: where the pressure is, which way the D
shaded, where the puck is, what the goalie did, who is open.

### 2. The Decoy Test — is the read actually tested?

> There must be a plausible **wrong answer a non-reader would choose** — usually the
> default/textbook spot, the spot that's covered here, or the answer to the mirror
> situation.

- **Pass:** a tempting covered lane right next to the open one; the textbook wall that's
  sealed in this look.
- **Fail:** the only sensible answer is the right one and every alternative is obviously
  dumb. That's trivial. Add a real decoy.

**Fail the Mirror Test → it's RECALL. Pass Mirror but fail Decoy → it's TRIVIAL. Only
both → a real decision.**

## Why this unifies every single-option flag we've hit

- MC "only one option" → failed the **Decoy** Test (no plausible alternative).
- Gap-control tap boards → failed the **Decoy** Test (one obvious spot).
- Positioning "drag into the textbook structure" → failed **both** (no cue, no decoy).

One test explains all of them.

## Applying it to positioning questions

"Place everyone into the empty textbook structure" fails both: the structure is the same
every time (no cue), and the textbook spots are the only answer (no decoy). Every
positioning board needs:

1. A readable **cue** — a specific defensive look / pressure / puck location.
2. A tempting **decoy** position — the default spot the cue makes wrong.
3. A prompt that states the **situation, never the destination.**

### Four reusable positioning formats that pass both tests

- **A. Read-the-coverage** — the defence's shape leaves specific ice open; place into the
  gap. *Decoy = the textbook spot the defence covers.* (D overloads strong-side → the
  weak side is the read.)
- **B. Beat-the-pressure** — a forecheck/checker takes away the default outlet; place into
  the counter. *Decoy = the sealed default.* (Sealed strong wall → break out weak / under.)
- **C. Fix-the-broken-structure** — show a near-correct structure with ONE player out of
  position; find and fix it. *Decoy = leaving it, or moving the wrong player.* The read =
  diagnose the error. (This is how coaches actually teach: "what's wrong with this picture?")
- **D. Read-then-reposition (branching)** — the puck/possession just changed; anticipate
  the new spot. *Decoy = where you'd be in the OLD situation.* The read = anticipation.
  Uses the branching engine.

## How we enforce it from now on

1. **Coach gate** already catches it (it flagged all 4 positioning boards). Add the
   Decision Test explicitly to the coach prompt so it's the first thing checked, named.
2. **Validator** for `place` boards: require a covering defender within a small radius of a
   plausible alternative target — a concrete reason the obvious spot is wrong. Otherwise
   warn `single-option positioning — no decoy`. (Generalizes the existing
   `selectionSingleClearLane` idea to placement.)
3. **Authoring checklist** (new-scenario skill): before writing any board, state the cue
   and the decoy out loud. If you can't name both, it's recall — don't author it.
4. **The one-line gut check for any board:**
   > "If I mirrored the cue, would the answer change? And would a non-reader pick the decoy?"
   Both yes → ship-worthy. Either no → rework.

## The 4 positioning boards, re-cast through this lens

- **`u9_support`** → Format A. Second defender covers the middle lane; the open far-side
  lane is the read. Decoy = the covered middle. (Reworked.)
- **`u11_dz_coverage`** → Format A/C. Strip the prompt; the read is *which* threat each
  player covers given where the opponents are. Decoy = covering the wrong (less dangerous)
  man, or leaving the slot open.
- **`u13_oz_structure`** → Format A. Defence overloads the strong side; the read is the
  open weak-side + net-front. Decoy = stacking the strong side where the D already is.
- **`u13_breakout`** → Format B. A forechecker seals the strong-side wall; the read is the
  open outlet (weak-side / reverse / under). Decoy = the sealed strong-side wall (the
  textbook spot).
