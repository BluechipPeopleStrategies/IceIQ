# Self-rating scale — anchors by age band and audience (DRAFT for Thomas to edit)

Draft, 2026-08-03. Nothing here is implemented. Edit the wording directly in this
file and I will build from it — reacting to words is faster than writing them
from a brief, and your edits tell me the voice better than instructions would.

## What prompted it

Thomas, playtesting: he wants a parameter around every rung (not just Advanced),
different wording per audience, anchors referencing age group and region, and
language that differs by age band.

## Live bug found while drafting — fix regardless of the wording

**`RATING_SCALES` has no `U7 / Initiation` entry.** `getSelfScale()` returns `[]`
for an unknown level, so a U7 player opening "Rate yourself" gets an empty
ladder with nothing to tap. U9 gets 4 rungs, U11-U18 get 5, U7 gets nothing.

Needs deciding, not guessing: does U7 self-rate at all? Hockey Canada plays U7
cross-ice with no standings, and asking a six-year-old to rank themselves may be
the wrong thing entirely. Options are a 3-rung picker in pictures, or no
self-rating at U7 and the screen simply never offers it.

## The voice, taken from what already exists

Not invented. The repo has an established kid-facing style in `youngQ` /
`youngT` / `youngWhy`, and `docs/references/rink-area-vocabulary.md` documents
it: short second-person sentences, concrete, no jargon.

> "Your teammate got beat, so YOU help inside."
> "The puck is dangerous now."
> "Shoot before the goalie is ready."

Rules carried over: **no "the point", "the slot", "half-wall", "blue line" or
"F3" in young copy**, and sentences stay around 5-9 words.

## The tokens

`{ageGroup}` — "U11", from the player's level.
`{region}` — pending your call on where it comes from. There is no region field
anywhere today; my suggestion is on the **team** (a coach sets "Edmonton" once
and every player inherits it) with a fallback for players not on a team, since
most current signups are not.

---

## U9 (4 rungs) — youngest that self-rates

| Rung | Athlete | Parent | Coach |
|---|---|---|---|
| Introduced | I'm just learning this one. | Just starting to learn this. | Introduced. Needs support every time. |
| Developing | I can do it if someone reminds me. | Can do it with reminders. | Emerging with prompting in practice. |
| Consistent | I do it in practice most times. | Reliable in practice. | Reliable in practice, not yet in games. |
| Proficient | I do it in games without being told. | Does it in games on their own. | Performs in games unprompted. Strong for {ageGroup}. |

No percentile language at U9 deliberately. Ranking a seven-year-old against
their peers is the wrong instrument, and Hockey Canada does not keep standings
at that age.

## U11-U13 (5 rungs)

| Rung | Athlete | Parent | Coach |
|---|---|---|---|
| Introduced | I'm learning what this is. | Being introduced to this. | Introduced. Needs consistent support. |
| Developing | I can do it sometimes, with reminders. | Can do it with reminders. | Progress with prompting or in practice. |
| Consistent | I do it reliably in practice. | Reliable in practice. | Reliable in practice, inconsistent in games. |
| Proficient | I do it in games without thinking. | Does it in games without prompting. | Performs reliably in games. Above average for {ageGroup}. |
| Advanced | I could show a teammate how. | One of the stronger {ageGroup} players around {region}. | Standout for age. Impacts teammates. Top of {ageGroup} in {region}. |

Note the athlete column stays self-referential — about where you can do it, not
who you are better than. Only the parent and coach columns carry the comparison.
That is a deliberate proposal, not a constraint: **if you want kids anchored
against peers too, say so and I will rewrite the athlete column that way.** My
worry is that kids under-rate themselves out of modesty when asked to rank.

## U15-U18 (5 rungs)

| Rung | Athlete | Parent | Coach |
|---|---|---|---|
| Introduced | New to this. Still working out what it means. | New to this skill. | Introduced. Requires structured teaching. |
| Developing | Inconsistent. I need reminders. | Inconsistent, needs reminders. | Developing. Inconsistent under pressure. |
| Consistent | I execute it in practice reliably. | Executes reliably in practice. | Executes in practice, breaks down under game speed. |
| Proficient | I execute it in games under pressure. | Executes in games under pressure. | Reliable under game pressure. Top third of {ageGroup} in {region}. |
| Advanced | Among the best in my age group in {region}. | Among the best {ageGroup} players in {region}. | Elite for {ageGroup} in {region}. Drives standards around him. |

Older players can handle direct comparison, so the athlete column takes the
anchor here where it does not at U11.

## N/A (all bands)

| Athlete | Parent | Coach |
|---|---|---|
| Haven't tried this yet. | Not yet exposed to this. | Not observed / not applicable. |

---

## Still open, and I cannot decide these for you

1. **Where does `{region}` live?** Team, player, or association. This decides
   the schema.
2. **What does "region" mean at the top rung?** Their association, their city,
   or their division. At U11 in Edmonton those are very different denominators,
   and it changes whether a kid honestly picks Advanced.
3. **Are parent and athlete genuinely different voices**, or is parent just the
   coach view in softer language? The code has only `sub_self` and `sub_coach`
   today, so a third voice is a real addition.
4. **U7** — see the bug above.
