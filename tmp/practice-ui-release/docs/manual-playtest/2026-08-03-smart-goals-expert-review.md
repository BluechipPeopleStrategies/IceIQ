# SMART Goals — three-lens expert review, 2026-08-03

Three independent reviews of `src/data/goalStarters.js` (510 served slots, 381
unique strings), run separately and deliberately not merged:

- **Sport psychology** — youth motivation and goal-setting science
- **Developmental** — what children at each age can actually do
- **Hockey technical** — is the hockey right, for that band, in Canadian
  minor-hockey language

**What these are:** structured expert-lens reviews against the published
literature, Hockey Canada's stage model, and this repo's own curriculum ledger.
They are not a licensed practitioner's sign-off. Where they make an empirical
claim I could check in the code, I checked it and say so.

**Nothing has been changed.** The content is written but not wired to any chips,
so no player has seen any of it.

---

## The finding that outranks the content: index 0 is the entire product

All three reviews arrived at this independently, and I verified it.

`App.jsx` imports only `exampleFor`, which does `out[f] = opts[0]` — and renders
it as **greyed placeholder text that disappears the moment the child types**.

So today: a player sees **one** option per field, never three; the guidance
vanishes exactly when they start needing it; and roughly **266 of 381 strings are
unreachable**.

Two consequences that change the priority order below:

1. **Reordering every array so the best option is first is free, and is currently
   worth more than rewriting any string.** Ten of 33 categories presently lead
   their Measurable list with a coach verdict — see below — so that is the only
   measurable those players ever see.
2. Every criticism about reading load and blank-box paralysis is at its maximum
   right now, because the chips that were supposed to fix it are not rendered.

---

## Where all three agree — act on these

These need no adjudication. Three different lenses reached the same conclusion.

### 1. Cut `Hit top corners 3 out of 5 in practice drills` (U9 Shooting)

Most 7-to-8 year olds cannot reliably elevate a puck at all. Top-corner accuracy
at 60% is a U15+ practice standard. It is **`M[0]`** for U9 Shooting, so under
today's implementation it is the *only* measurable a seven-year-old ever sees for
shooting — a weekly failure generator aimed at the age with the least
accumulated evidence that they are any good.

The file argues against itself: the sibling options are `Get my wrist shot up off
the ice every time` and `Get 8 of 10 wrist shots up off the ice`, which is the
correct U9 target. It skips two rungs.

It is also the one string that was preserved *because* it was inherited. The
migration correctly rejected three old strings on content grounds and should have
rejected a fourth. Provenance is not justification.

> Replacement: `Hit the half of the net I picked, 3 of 5 in a drill`, or
> `Hit the net on 8 of 10 shots in a practice drill`.

### 2. Cut `Take the body cleanly, never from behind` (U15 Physical Play)

All three cut it, for three different and individually sufficient reasons:

- **Psychology:** you do not goal-set a rule floor. Hitting from behind is a
  match penalty; framing it as a development goal implies a spectrum a player
  might reasonably land anywhere on. And a negation about the most dangerous act
  in the sport is the worst possible framing, because suppressing an action
  requires holding it in mind.
- **Hockey:** it names the wrong hazard. Hockey Canada's first-year-checking
  emphasis is the *approach* and the *victim's posture* — don't hit a turned
  player, don't hit a player facing the boards, shoulder-to-shoulder. "From
  behind" catches one of those.
- **Both:** a phone app should not be prescribing how to deliver contact to a
  13-year-old in the first season it is legal, with no coach in the room.

**The bigger finding underneath it.** The category covers delivering contact four
ways and **receiving** it zero ways. In the one band where children get hurt,
there is no goal anywhere in the file about taking a hit safely — which is where
the injury data lives, and which Hockey Canada's own progression teaches *first*.

> Add: `Take a check with my head up and my feet under me` and
> `Keep my head up when I go back for a puck on the wall`.

Note both reviews were explicit that removing the category would be the **wrong**
instinct. At U15 contact is the game, and risk concentrates in players who lack
body-contact skill. Giving them nothing is worse than giving them the wrong
thing. Keep the category; point it at the controllable, self-protective side.

### 3. The coach-verdict template is the largest systemic problem

**35 strings** hand the success condition to an adult (`Coach rates my X
Consistent`, `My coach marks X as…`). Counted at category level, that is **28 of
99 Measurable options — and 28 of the 29 categories above U7 carry exactly one.**
That regularity means it is a template someone applied, not drift.

Three failures at once: the athlete cannot cause it, cannot observe it, and — in
minor hockey, where the ladder mostly never gets updated — it silently resolves
as **failed** for reasons they did not cause. That is an outcome uncoupled from
effort, which is worse than a vague goal, because a vague goal cannot be failed.

Compounding it, `ratingCopy.js` states in capitals that **MOST PLAYERS HAVE NO
TEAM**. So for the modal user these are goals nobody can ever mark done.

**The file already knows where coach belongs.** Every coach reference in the
*Achievable* field is correctly placed — `My coach has worked on it with me` is
coach input as evidence of feasibility. Move them there.

> Template replacement: `Ask my coach what Consistent looks like for this` —
> keeps the coach, makes the *asking* the thing the player controls.

### 4. Time horizons are too distal at every band

The shortest horizon in all 510 slots is **"In 4 weeks."** There is no proximal
option anywhere. The youth literature is unusually clean here: proximal subgoals
raise self-efficacy and intrinsic interest in children, while distal goals
perform no better than no goal at all.

U7's three options are `end of the month`, `in 4 weeks`, `end of the season` —
two of which are the same duration said twice, so it is a choice that is not one.

### 5. Streaks and absolutes

Twelve options use "in a row" / "straight games" / a zero-error requirement.
Streaks score all-or-nothing: nineteen clean crossovers out of twenty reads as
**zero**. `N of M` measures the same skill and gives partial credit.

The sharpest case: `Skate across the ice 5 times without falling` sits three
lines from `Get up fast every time I fall down` — which all three reviews named
as the best single line in the file. One says falling is the curriculum, the
other says falling is the failure condition. A five-year-old cannot hold both.

### 6. Self-contradictions between sibling options

Four cases where two options on the same screen teach opposite things:

| Band | Says | Also says |
|---|---|---|
| U7 | Teamwork: `Take my turn and share the puck` | Puck Control: `Keep the puck for a whole shift 3 practices in a row` |
| U11 | `Keep my feet moving backward as they come at me` | `Stand up 8 of 10 rushes at the blue line` |
| U9 | `Get my wrist shot up off the ice every time` | `Hit top corners 3 out of 5` |
| U15 | Physical Play teaches delivering contact | …and rewards *not* hitting |

The U7 one is the review's nominated worst option in the file: it rewards the
exact behaviour cross-ice hockey exists to un-teach, and it has no salvageable
rewrite because the idea it reached for is already covered by the option above it.

---

## Where they disagree — this one is yours

### U7: remove the band, or complete it?

| Lens | Position |
|---|---|
| **Developmental** | **Remove SMART goals from U7 entirely.** |
| **Hockey** | **Shooting is missing and should be added back.** |
| **Psychology** | **Net helpful, wrong shape** — fix the time horizon, a one-line change. |

They are answering different questions, so do not average them.

**The developmental case is the strongest single argument in all three reviews,
because it is built from your own decision.** `selfRating.js` records, in your
words this morning: *"asking a six- or eight-year-old to rank themselves against
peers is the wrong instrument regardless of how the scale is worded."* SMART goal
setting is that instrument **plus** a future-time axis **plus** a
self-measurement demand — strictly harder than the thing you already removed. The
goal content inherited the constraint (no U7 coach ratings) but not the reasoning.

Specific U7 items it says are not merely badly worded but impossible: `Do it right
8 times out of 10` (proportional reasoning is not available at 5-6), `Get up in 3
seconds every time` (a stopwatch nobody holds), `Keep the puck for a whole shift 3
practices in a row` (a three-part conjunction spanning a week).

And a measurement that matters: **the U7 chips are the same length as the U18
chips** — 8.3 words versus 7.9. There is no reading gradient at all, and U7
vocabulary includes *snowplow, stickhandle, teammate, direction, catching*. The
real user of the U7 goals screen is a parent reading 48 strings aloud, which
inverts the ownership the whole mechanism depends on.

**The hockey case is narrower but concrete:** shooting is a Hockey Canada U7 core
skill, it is in your own ledger at `u7.shooting`, and **the copy is already
written** — parked in a comment at the top of the file because the category list
was re-cut mid-task. A tooling accident dropped a core skill from the youngest
band.

**If you close the U7 door, the Shooting gap is moot.** If you keep the band, the
Shooting gap is real and cheap to fix.

> The developmental review's alternative, if you close it: a one-field "Try This"
> card — one picture-tap challenge, ≤6 decodable words, horizon of *the next
> practice*, and a binary "did you try it?" afterwards. Effort, not attainment.
> Implemented as a `canSetGoals(level)` predicate mirroring `canSelfRate`, so the
> door closes in one place rather than by wording.

---

## Findings only one lens caught

**Hockey — the category ladder inverts.** U7-U9 are pure skill; U15-U18 are
*entirely* tactical with no skill category at all. A U15 with a weak shot has
nowhere to put that goal — at exactly the age players start shooting a thousand
pucks in a driveway and skating power becomes the separator. Also: **U11 has no
shooting category at all** (biggest single-band gap), **U9 lost Puck Control**
(present at U7, back at U11, missing at the band Hockey Canada weights
stickhandling most), and **U13 has no compete/battle category** despite
`battles-and-compete` being the highest-depth concept at U13 in your own ledger.

**Hockey — special-teams volumes were not counted, they were sequenced.** Pucks
to the net on the power play run 3/4/5/6 per game across U11→U18. A U18 team gets
three or four power plays, about six minutes. One player is not putting six pucks
on net in six minutes. Same shape for penalty-kill entry break-ups.

**Psychology — the "why" field flips from mastery to ego at U15.** At U7-U9 the
Relevant options are genuinely excellent: *"Hockey is more fun when my whole team
is having fun."* By U15 roughly a third ground the goal in adult approval —
*"Special teams minutes are earned, not given"*, *"Power play time is where
scorers get noticed"*. Against the app's own prompt (*"How does this help you on
the ice?"*) those answer a different question: who will reward you. U15 is peak
attrition age in minor hockey, and an ego-oriented climate is the strongest known
predictor of leaving. **At U18 the same framing is fine** — a 17-year-old
genuinely is being evaluated.

**Psychology — six concurrent goals, and a UI pushing toward six.** The header
renders `2/6 set`, which is a completion meter, and completion meters get
completed. A child with six goals attends to none and then opens the screen to
six unmet items. Suggested cap: 1 goal at U7-U9, 2 at U11-U13, 3 at U15-U18,
with the rest parked as "Up next."

**Psychology — on whether starter chips undermine autonomy: no, and the premise
is wrong.** Structure and autonomy are independent, not a tradeoff. A blank
textarea labelled "Measurable:" is low on both — it is not freedom, it is
abandonment. But two specifics: tapping a chip should **seed editable text, not
set a value**; and the **Relevant field should have no tappable chips at all**,
because a goal only predicts wellbeing when the reason for it is genuinely the
athlete's own. Handing a 12-year-old their reason hands them a borrowed one.

**Developmental — the feature is write-only.** Goals are saved, counted, and
never read back. No check-in, no progress, no completion. Goal-setting's entire
effect depends on feedback toward the goal. Verified: one display site, no
review mechanism anywhere. *"A weekly 'how'd it go?' tap does more for a
nine-year-old than 500 better-worded chips."*

---

## What all three protected

Worth recording, because most of this file is good:

- **The Specific field**, across every band. Overwhelmingly process-oriented,
  observable, controllable. One review: "if you shipped only the S field, this
  would be unambiguously positive."
- **The Achievable field** — every coach reference in it is correctly placed.
- **U13 Leadership**, named by the psychology review as the template the rest of
  the file should follow: *"Say something positive after a teammate's mistake"*,
  *"How I act after a mistake sets the tone."*
- **U7-U9 Relevant options** — pure mastery framing, teaching the game rather
  than justifying the goal to an adult.
- **The U7/U9 vocabulary discipline.** The zone/line/position sweep came back
  clean. The guards work.

---

## Decisions needed

| # | Decision | Default if you say nothing |
|---|---|---|
| 1 | **U7: remove the feature, or keep and complete it?** | Keep, and add Shooting back — but nothing ships to U7 until you rule. |
| 2 | Move the 35 coach-verdict measurables to Achievable? | Yes — it is the largest systemic problem and all three flagged it. |
| 3 | Cut the U15 checking-technique option and add receiving-a-check goals? | Yes. Unanimous, and safety-adjacent. |
| 4 | Cap active goals per band? | Yes — 1 / 2 / 3 by band, rest parked. |
| 5 | Add skill categories at U15/U18 and shooting at U11? | Propose and bring back for review. |
| 6 | Rename the U9 category `Defense` → `Defending`? | **Needs care:** goals are stored keyed by category name, so a rename orphans saved goals. Migration required, not find-and-replace. |

## Cheapest three things, in order

1. **Reorder every array so index 0 is the most controllable, attainable,
   process-oriented option.** Free, no content decisions, and index 0 is the whole
   product until the chips are wired.
2. **Cut the two unanimous items** (U9 top corners, U15 checking technique).
3. **Fix the U7/U9 time horizons** to include "by next practice." One line each.
