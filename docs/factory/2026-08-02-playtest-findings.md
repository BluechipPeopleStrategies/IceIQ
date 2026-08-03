# Playtest findings — 2026-08-02

Thomas playtested the live app immediately after the account-creation hotfix
merged. Four defects in a handful of questions. Two are content, two are the
quiz shell mishandling `type: "scenario"` questions.

Root theme for the shell bugs: **the outer quiz shell assumes one answer per
question and a simple `sel === q.ok` correctness test.** Scenario questions
break both assumptions — they render their own interaction, compute their own
result, and can emit more than one answer. Nothing reconciles the two layers.

---

## 1. FIXED — contradictory verdict on scenario questions

**Seen twice**, on a selection question and on a 2-on-1 with a Continue step:
the same answer rendered as **"✓ Right read"** (green) and **"✗ INCORRECT"**
(red, with a coach avatar) simultaneously, with the identical tip text
duplicated in both panels.

Two independent verdicts:

- `ScenarioRenderer.jsx:377` renders from `result.ok` — the interaction's real
  outcome. Correct.
- `App.jsx:3747` renders from
  `const wasCorrect = qtype === "tf" ? (sel === "true") === q.ok : sel === q.ok;`

That card's guard excluded only `seq` and `multi`, so `scenario` questions got
it too. For a tap/selection answer `sel` is the tapped target and `q.ok` is not
comparable to it, so `sel === q.ok` is false by construction — "Incorrect"
regardless of what the player actually did.

**Scoring was NOT affected.** `wasCorrect` is local to that render block; the
recorded result comes from the interaction. The defect was what the player was
shown, which is bad enough — being told you were right and wrong at once.

Fixed by excluding `scenario` from that card, for the same reason `seq` and
`multi` already are.

## 2. FIXED — question counter reads "Question 6 of 5" (and it WAS a scoring bug)

**Traced and fixed.** My first read called this possibly-cosmetic; it was not.
`handleSeqAnswer` serves seq, multi *and* scenario questions and had no dedupe,
while `handleRinkQAnswer` immediately below it already guards the identical case
("so a player toggling/retrying inside the rink widget can't double-record").
A multi-step scenario fires `onAnswer` once per step, so every step appended
another row to `results`.

That array is shared by the counter, the progress bar, the "N/M correct" line,
**and `calcWeightedIQ()`** — so a player's score was being divided by an
inflated denominator, depressed by every multi-step question they encountered.
Guarded on `seqAnswered`, which resets per question alongside `rinkQResult`.

Open design question, not decided: for a genuine two-step question (judge then
justify) only the first answer now counts. Whether the second step should
influence correctness is a content call.

### Original analysis (kept for the record)

`qNum = results.length` (App.jsx:1949) and `qLen` is 5 for a first-time
session, so the header renders `qNum + 1` = 6.

A scenario/verdict question can record more than one result — the two-step
judge/justify plays and the Continue-step flows both do. So five questions
produce six results, and the counter (plus the progress bar at
`(qNum/qLen)*100`, which would exceed 100%) overruns.

**Needs checking, not yet verified:** whether scoring uses `results.length` as
its denominator. If it does, a 5-question session is being scored out of 6 and
every multi-step question depresses the player's percentage. That would make
this a scoring bug rather than a cosmetic one. Do not assume either way without
tracing it.

## 3. OPEN (content) — a question that never asks anything

`src/data/bank.json:4536`

> "Your teammate is skating down the wing with the puck and is about to shoot
> on the goalie. You are skating down the middle of the ice."

That is a situation with no question. The four options are answers to an unasked
prompt. Thomas's words: "this question doesn't really finish."

Fix is a copy edit — append the actual ask (e.g. "What should you do?") — but it
is content, so it wants a human eye rather than a scripted rewrite. Worth
sweeping the bank for other `sit` strings that end without a question, since a
missing prompt is mechanically detectable.

## 4. OPEN (content) — copy contradicts the diagram

`src/scenario/seeds/gvis_u11_time-and-space_4we8.json`,
`interaction.prompt`:

> "You have the puck up high in the zone."

The render shows YOU mid-zone: LW is clearly higher (nearer the blue line) and
RW is lower, toward the goal line. "High in the zone" means near the blue line,
so the copy describes a position the player is not in.

This is the same class as the surface-fit work parked earlier the same day —
**copy making a spatial claim that the geometry does not support.** Unlike
surface fit, this one is mechanically checkable: positional language in a prompt
("high in the zone", "down low", "at the point", "behind the net") can be
validated against the actor's actual coordinates in the rink frame. That would
be a genuinely useful addition to the validator chain, and unlike the parked
surface work it has confirmed live findings.

---

## Suggested order

1. Trace whether `results.length` corrupts scoring (#2). If it does, it is the
   most serious item here and outranks everything else.
2. Copy fixes for #3 and #4 — quick, but human judgment.
3. Consider a positional-language validator off the back of #4. It has real
   findings behind it, which the parked surface-fit validator did not.

Everything here was found by ten minutes of actually playing the app. The Brain
Gym playtest still sitting in NOW is likely to surface more.
