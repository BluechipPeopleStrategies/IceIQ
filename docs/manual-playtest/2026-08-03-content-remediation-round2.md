# Content remediation — round 2

Three decisions Thomas made 2026-08-03, what shipped from each, and the design for
the one he asked me to work out.

---

## 1. Zone words at U7/U9 — DECIDED and APPLIED

> "let's get rid of the [zone] words from U7 and U9"

This settles a **direct conflict between the two audits**: the language audit's tier
rule *forbids* zone names at U7/U9, while the incomplete-stems audit's Category 2
flagged U7/U9 stems as *missing* zone information. Thomas's call resolves it — at these
bands the answer is neither "add the zone" nor "leave it vague", it is
**net-relative language**.

The reason it is the right call: Hockey Canada plays U7 and U9 cross-ice and half-ice.
There is no neutral zone, no point and no blue line in the game these children actually
play. A zone name at U7 names a thing the child has never stood on.

### Applied — 19 strings across 14 questions

| Was | Now |
|---|---|
| the offensive zone | the end you are attacking |
| the defensive zone / your own zone | your own end |
| their defensive zone | their own end |
| the neutral zone | the middle of the ice |
| the slot | the front of the net |

Verified: **0 zone words remain at U7/U9**, no answer key moved, no option count
changed, and no question outside U7/U9 was touched.

### Held back — 6 questions using "blue line"

`gen_u7_offense_sup02` · `gen_u7_reading-the-play_rdp01` ·
`gen_u7_reading-the-play_rdp04` · `gen_u9_decision-making_dec03` ·
`gen_u9_time-and-space_tas01` · `gen_u9_time-and-space_tas05`

**Not a mechanical substitution, which is why they are not done.** The others name a
*place* and swap cleanly for a net-relative phrase. The blue line names a *rule* — the
distractors here are about waiting at the line and not getting too far ahead, which is
the offside concept. There is no offside in cross-ice U7, so removing the phrase does
not just reword the question, it removes what the question teaches.

Three ways to go, and this needs Thomas:

1. **Rewrite around the concept without the line** — "wait until your teammate is ready
   before you go" — keeps the support idea, drops the rule. Recommended: it is the
   idea that actually transfers at this age.
2. **Retire the six from U7/U9 and re-band them to U11+**, where the blue line is real.
   Cleanest, but costs six questions from the youngest bands, which are already the
   thinnest.
3. **Keep the blue line** as the one zone term allowed at U7/U9, on the grounds that
   kids hear it at the rink even if they do not play with it.

---

## 2. Jersey colours — DECIDED and APPLIED

> "instead of jersey colour, let's differentiate them some other way"

**Differentiated by team relationship instead.** Nine questions identify players by
colour, but only **3 had no image**, and those are the broken ones — the colour named
something the player could not see. Thomas hit exactly this: *"The jersey colour
doesn't matter in this question."*

The colour turned out to be carrying no information at all. Every one of the three
already said "teammate" or "defender" in the same sentence:

| Was | Now |
|---|---|
| "A **white-jersey** teammate is standing alone in front of the net" | "A teammate is standing alone in front of the net" |
| "You are a **white-jersey** player… two **black-jersey** players racing toward your end… ahead of all your **white-jersey** teammates" | "You are in the middle of the ice… two players from the other team racing toward your end… ahead of all your teammates" |
| "Your **black-jersey** teammate has the puck… a **white-jersey** defender is nearby" | "Your teammate has the puck… a defender is nearby" |

The other six keep their colours: all six have images, so the colour resolves to
something visible and is a legitimate referent.

Verified: **0 colour-identified players without an image remain**, keys unmoved.

**Standing rule going forward:** colour may identify a player only when an image makes
it visible. With no image, use the relationship — teammate, defender, the other team.

---

## 3. The 25 under-specified questions — the design he asked for

> "let's figure out a remediation for the underspecified questions"

These are CONTENT-2, his single most-repeated finding across both playtests: a question
that asks something real but omits what you need to answer it. His words:

> "I got this question right, but it should have more information about where you are."
> "The jersey colour doesn't matter in this question… we don't know where the puck is."
> "Is this always on D-zone, neutral zone, etc.? Some of these questions are too vague."

And the rule he stated himself, which is the whole design in one line:

> "when there's no picture associated with it, let's have only information that we
> absolutely need."

**Both halves matter.** Cut the decorative detail, add the deciding detail. A question
is not improved by more words — it is improved by the *right* words.

### Why this cannot be a sweep

The incomplete-stems audit was honest about this: its best automated detector **missed
Thomas's own example**. There is no pattern that separates "vague" from "concise",
because the missing fact is different every time — sometimes the zone, sometimes the
puck, sometimes the score, sometimes nothing at all. The 25 are a floor, not a count.

### The triage, and it is the part that saves the effort

Sort each of the 25 by one question: **does the missing detail change the answer?**

| Class | Test | Action | Needs Thomas? |
|---|---|---|---|
| **A — the answer flips** | With detail X the key is right; without it, a different option is defensible | Add X. Highest priority — these are questions a player can get "wrong" while reasoning correctly | Confirm the fact, not the wording |
| **B — the answer holds, but the read is guessy** | The key is right either way, but the player is guessing rather than reading | Add X if it is one clause. Skip if it needs a diagram | Batch review |
| **C — deliberately general** | It is a concept or vocabulary question; specifics would narrow a principle that is meant to be broad | Leave it. Not every question is a scenario | No |

Class A is the only one that can mark a correct reader wrong, and I would expect it to
be a minority of the 25. That is where the attention goes.

### Workflow

1. I classify all 25 into A/B/C with the reasoning shown, and for A and B propose the
   exact clause to add — one clause, in the existing voice, never touching which option
   is correct.
2. One review sheet: current stem, proposed clause, options, keyed answer, class.
3. Thomas marks accept / fix / reject. Class C is listed so he can overrule, not so he
   has to read it.
4. I apply the accepted ones, verify by semantic diff that only the stem changed and no
   key moved, then preflight + qa.

### The guard that stops it recurring

A preflight rule cannot detect vagueness. What it *can* detect is the specific,
checkable subset:

- a question naming a **zone** at U7/U9 (now zero — regression guard)
- a question identifying a player by **colour with no image** (now zero — regression guard)
- a **scenario** stem with no puck location and no image

The first two are the two batches above, so those guards are free and worth landing
now. The third is a genuine heuristic and will need tuning against false positives
before it can gate anything.

---

## Status

| Item | State |
|---|---|
| Zone words at U7/U9 | Applied — 19 strings, 14 questions, 0 remaining |
| `blue line` at U7/U9 | **Held — needs Thomas**, 3 options above |
| Jersey colours | Applied — 3 questions, 0 unresolvable colours remaining |
| Under-specified 25 | Design above. Classification is the next step |
