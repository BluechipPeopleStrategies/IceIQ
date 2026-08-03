# Self-rating scale — anchors by age band and audience (DRAFT for Thomas to edit)

Draft, 2026-08-03. Nothing here is implemented. Edit the wording directly in this
file and I will build from it — reacting to words is faster than writing them
from a brief, and your edits tell me the voice better than instructions would.

## What prompted it

Thomas, playtesting: he wants a parameter around every rung (not just Advanced),
different wording per audience, anchors referencing age group and region, and
language that differs by age band.

## Decisions (Thomas, 2026-08-03) — these are settled

1. **Self-rating starts at U11.** U7 and U9 are never asked. Already implemented
   and verified (`canSelfRate`, commit d1b77ca). The U9 table below is therefore
   dead and has been removed.
2. **`{region}` lives on the TEAM, set once by the coach.** Free text, so the
   coach frames it however their hockey world actually works -- "Edmonton",
   "Zone 5", "NAIT district". That also answers what "region" means at the top
   rung: whatever the coach says it means, which is more honest than us imposing
   a denominator we cannot verify.
3. **Parent and athlete are ONE voice, not two.** A parent signs up on behalf of
   the player, so they are reading the same words about the same child. Keeps the
   existing `sub_self` / `sub_coach` shape -- no third column, no schema change
   to the ladder.

### Still to build

- Migration 0023: `region text` on `public.teams`, nullable.
- Coach UI to set it on a team.
- Token substitution at render for `{ageGroup}` and `{region}`.
- **Fallback when there is no region** (player not on a team, or coach has not
  set one): the anchor must degrade to a sentence that still reads properly
  rather than printing "in {region}" or "in null". Draft below assumes the region
  clause is simply dropped, e.g. "One of the stronger U11 players around" becomes
  "One of the stronger U11 players" -- the wording needs to survive that, which
  is a real constraint on how the sentences are written.

---

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

## U11-U13 (5 rungs)

| Rung | Player / Parent | Coach |
|---|---|---|
| Introduced | I'm learning what this is. | Introduced. Needs consistent support. |
| Developing | I can do it sometimes, with reminders. | Progress with prompting or in practice. |
| Consistent | I do it reliably in practice. | Reliable in practice, inconsistent in games. |
| Proficient | I do it in games without thinking. | Performs reliably in games. Above average for {ageGroup}. |
| Advanced | I could show a teammate how. | Standout for age. Impacts teammates. Top of {ageGroup} in {region}. |

Note the athlete column stays self-referential — about where you can do it, not
who you are better than. Only the parent and coach columns carry the comparison.
That is a deliberate proposal, not a constraint: **if you want kids anchored
against peers too, say so and I will rewrite the athlete column that way.** My
worry is that kids under-rate themselves out of modesty when asked to rank.

## U15-U18 (5 rungs)

| Rung | Player / Parent | Coach |
|---|---|---|
| Introduced | New to this. Still working out what it means. | Introduced. Requires structured teaching. |
| Developing | Inconsistent. I need reminders. | Developing. Inconsistent under pressure. |
| Consistent | I execute it in practice reliably. | Executes in practice, breaks down under game speed. |
| Proficient | I execute it in games under pressure. | Reliable under game pressure. Top third of {ageGroup} in {region}. |
| Advanced | Among the best in my age group in {region}. | Elite for {ageGroup} in {region}. Drives standards around him. |

Older players can handle direct comparison, so the athlete column takes the
anchor here where it does not at U11.

## N/A (all bands)

| Player / Parent | Coach |
|---|---|
| Haven't tried this yet. | Not observed / not applicable. |

---

## Still open

Only the wording itself. Edit the tables above directly and I will build from
what is there. The mechanism (migration, coach UI, token substitution) is
unblocked and can proceed in parallel.
