# Worlds as the container: unified player path, unlock progression, world backdrop

**Status:** design approved in conversation 2026-09-07, not yet implemented.
**Scope:** the player-facing learning path for all age bands. Does not change coach
tooling, the scenario engine, the content factory, or the spaced mastery record itself.

## Why

Today a player lands on a home page offering "Learn the game" and "Practise a read" as
two hero buttons, plus the same two again as cards lower down, plus an Experimental
scenarios card. Those buttons are not two destinations: both open Practice Arena
(`src/one-on-one/PracticeHub.jsx`) and differ only in which tab it lands on. Inside that
arena a player then chooses among four learning views or three practice views.

Counted from the player's side, entering a world costs up to three menu decisions before
the first hockey question. Thomas's direction, 2026-09-07: "I'm worried this is too
complicated for a lot of people. I want the decision points to be really simple to start,
and we can build in the complexity."

The six worlds already exist as browsable art and copy but carry no progression. They are
the natural container for the whole path.

## Decisions

1. **The world is the container.** The worlds grid is the single player entry point.
   Learn and practice stop being destinations and become steps inside a world.
2. **One button inside a world: Start.** The app sequences what comes next. Question
   varieties (choose the play, find your position, experimental scenarios, guided
   lessons) become kinds of question the sequence serves, never menu items.
3. **Worlds unlock through a World Challenge**, a boss gate, not through exposure.
4. **Unlock state is per player and per age band.** Moving up an age band starts a fresh
   progression against that band's material.
5. **Backdrop:** the current world's art sits faintly behind question screens reached
   inside a world, and nowhere else.
6. **Experimental scenarios stops being a labelled destination** and becomes part of the
   in-world mix.
7. **Copy goes to American spelling** ("practice", not "practise").
8. **Peripheral features appear gradually over roughly the first five to seven real
   sessions**, rather than all at once on day one.
9. **The progression must not be consumable in a week.** The intended arc is a single
   configurable constant, about twelve weeks today and raised toward a full hockey season
   as the bank grows. Worlds open early; mastery depth carries the long arc.
10. **Recurring comprehension checks gate new territory.** A cumulative retention check
    comes due off the spaced schedule; until it is passed no new world or concept opens,
    while everything already open stays playable.

## Player experience

**Home.** The worlds grid is the only way into the learning path, six cards, each showing
locked or open state. Goal setting, training log, progress and the "more ways to
practice" activities remain on the home page beside it. The two hero
buttons and their duplicate action cards are removed, as is the Experimental scenarios
card. The action grid keeps Set a hockey goal, Log your training, See your progress.
"More ways to practise" keeps Play, Brain Gym and Take a quiz, which sit outside worlds.
The default selected world becomes the first unlocked world, not Lookout Ridge as today.

**A locked world** still shows its art and name, dimmed, with a lock and a plain sentence
naming what opens it, for example "Pass the Passing Springs challenge to open this."
Never a bare locked box: knowing the next step is what makes a lock motivating rather
than annoying.

**Inside a world.** One Start button, the world's name and subtitle, and progress toward
the challenge. Play, Brain Gym and Coach Lab are not shown inside a world; they remain
reachable from home. Pressing Start runs a sequence: a short teach moment for a concept
the player has not met, then reads drawn from that world, mixing question formats.

**The World Challenge** becomes available once the player has seen five distinct
questions in that world. It is five mixed questions drawn from the world's concepts at
the player's age band, preferring unseen ones. Passing is four of five. Retries are
unlimited and free with a fresh mix each attempt. After two failed attempts the result
screen names the two concepts that were missed and offers to practise those directly
rather than repeating a bare failure. Passing opens the next world permanently for that
age band.

**Stars** on a world card come from the existing spaced mastery record and show depth of
learning. They never gate anything.

## Unlock rules

Linear chain in the existing `JOURNEY_WORLDS` order, which is already sound teaching
progression:

`skating-movement` (Frozen Trails) → `puck-skills` (Passing Springs) →
`hockey-sense` (Lookout Ridge) → `offensive-play` (Rush Arena) →
`defensive-play` (Blue Line Fortress) → `transition-compete` (Summit Switch)

Frozen Trails is open from the start. Each world's challenge opens the next.

**Two tiers over one system, not two systems.** The unlock gate reuses the accuracy and
distinct-question parts of the existing mastery machinery. The calendar-spanning part
(practice days across weeks) is not part of unlocking and stays exactly where it is as
the deeper mastery goal. Building a second progression system beside the existing one is
explicitly rejected: two progress systems eventually disagree and the resulting bugs are
expensive.

### Edge cases that would otherwise dead end the chain

- **A world with fewer than five questions at that age band.** The challenge uses every
  available question, and the pass bar is "all but one", with a floor of one correct. So
  four questions require three correct, two require one, one requires one.
- **A world with zero questions at that age band.** It cannot act as a gate, so it is
  skipped in the chain and the following world opens in its place. Content coverage is
  genuinely uneven across bands (Summit Switch shows a single learning focus at U9, and
  a world can render "No separate curriculum missions for this band yet"), so this is a
  real state, not a hypothetical.
- **At least one world is always open**, whatever the content situation.
- **Unlocks never revoke.** Once open for a band, a world stays open for that band.

## Architecture

Approach: extend the existing route rather than build a parallel one. The
`player-learning` route already carries `arena`, `age` and `world` params, and
`PracticeHub` already parses `world` into `navigation.worldId`.

**New, pure, testable:**

- `src/one-on-one/worldUnlockCore.js` — given a player id, an age band and the record of
  answered question ids and challenge results, returns which worlds are unlocked,
  progress toward the current challenge, and whether the challenge is available. No React,
  no direct storage access; storage is passed in. Mirrors the existing `*Core.js` pattern
  used by `learningWorldsCore`, `playerLearningHomeCore` and `readSequenceCore`.
- `src/one-on-one/worldSessionCore.js` — the sequencing policy behind Start: given a
  world, an age band and what the player has already seen, return the next thing to
  serve. This composes with the existing `selectPracticeQuestions`, which chooses
  questions *within* one scenario; picking which scenario comes next is new logic and
  belongs here.

**Changed:**

- `src/player/PlayerLearningHome.jsx`, `.css`, `playerLearningHomeCore.js` — worlds grid
  as sole entry, locked and open card states, removal of the hero buttons, the duplicate
  action cards and the Experimental scenarios card, default selection to first unlocked
  world.
- `src/one-on-one/PracticeHub.jsx` — world mode: when a world is in context, hide the
  tab bar, present the single Start flow, and route Experimental scenarios content into
  the in-world mix instead of a sub-nav item.
- `src/App.jsx` — home navigation ids and `HOME_ACTIONS` entries follow the above.
- Display copy across the player surfaces for the spelling change.

**Persistence.** Unlock state is stored on the device, keyed by player and age band,
mirroring the existing `masteryStorageKey(playerId)` pattern, consistent with the rest of
the practice record ("Saved on this device").

**Storage key safety.** The spelling change touches display copy only. No storage key,
persisted field name or question id is renamed, because renaming a persisted key silently
orphans every existing saved practice record.

## Progressive disclosure

Even with worlds as the container, the home page still carries goals, training log,
progress, Play, Brain Gym and Take a quiz. Shown all at once on a first visit that is
still a wall. So peripheral features appear gradually.

**The trigger is a qualifying session, not an app open.** A qualifying session is a visit
in which the player answered at least one question, with visits separated by at least
thirty minutes of inactivity so that closing and reopening the app does not count twice.
Counting raw logins would reveal "See your progress" to a player who has answered
nothing, which teaches them the feature is empty, and would let a player unlock the whole
interface in an afternoon without learning anything.

**Each step also requires the prerequisite that makes the feature worth seeing**, so a
feature never arrives before it has something to show.

| Qualifying session | Appears | Why then |
|---|---|---|
| 1 | Worlds and Start only | One decision: pick a world, press Start |
| 1, on finishing | See your progress | There is now a result worth looking at |
| 2 | Stars on world cards | Enough history for depth to mean something |
| 3 | Brain Gym, Play | Core loop established; variety is a reward, not a distraction |
| 4 | Log your training | Habit layer, and it draws a parent in |
| 5 | Set a hockey goal | Goals need history behind them to be grounded |
| 6 to 7 | Lesson library, guided lessons, explore the rink | Browse and go deeper, once there is something worth revisiting |

**The World Challenge is deliberately absent from this table.** It is governed solely by
its own rule (five distinct questions seen in that world). Gating it on both its own rule
and a session count would be two systems deciding one thing, which is the failure mode
this design rejects elsewhere.

**Rules.**

- Once revealed, a feature is never hidden again.
- Reveals are announced lightly, a small "new" marker, never an interrupting modal or a
  tutorial overlay.
- A feature that does not apply to the player's age band still does not appear. Existing
  gating wins over the ladder; for example, explore the rink stays U7 and U9 only via
  `allowsRinkDiscovery`.
- **A "Show everything" switch in settings**, default off, immediately reveals the full
  interface for anyone who wants it. This keeps a single code path while protecting the
  day one impression for a parent evaluating the app, who is the buyer, and giving older
  players an escape hatch.

**Storage, and a deliberate asymmetry.** Disclosure state is stored per player and is
*not* per age band, unlike unlock state which is. Onboarding is about the person, so a
player moving up an age band starts a fresh world progression but does not sit through
the interface being introduced to them a second time.

## Comprehension checks

A recurring, cumulative retention check. This is the primary mechanism that makes the arc
calendar bound, and the reason a limited bank can honestly fill a season: it makes
revisiting earlier material the point rather than filler.

**It is not the World Challenge, and the two must not blur:**

| | World Challenge | Comprehension check |
|---|---|---|
| Asks | Have you learned this world? | Does it still stick weeks later? |
| Drawn from | One world's concepts | Everything learned so far, weighted to weak and due |
| Occurs | Once per world | Recurring, on an interval |
| Opens | The next world | Continued advancement generally |

**Interval comes from the spaced schedule, not a session counter.** Retention decays with
time, not with sessions, so a check becomes due when enough previously learned items come
due under the existing spaced mastery scheduling. The rhythm emerges from the player's
real history rather than an arbitrary "every fifth session".

**Composition and pass bar.** Ten questions drawn from concepts already learned in that
age band, weighted toward the weak and the due. Passing is eight of ten. The bar is
higher than the World Challenge's four of five because this is material the player has
already met, so a higher standard is fair rather than punishing. Where fewer than ten
learned items exist, the check uses what exists and the bar is "all but two", floor of
one correct.

**What a due or failed check blocks.** New territory only: no new world unlocks and no
new concepts introduced until it is passed. Everything already open stays fully playable,
and review of the due material is always available. A failed check names the specific
concepts that were missed and routes directly to practising those, then allows an
immediate retry. Retries are unlimited.

This delivers "cannot move forward" without ever producing a dead end: there is always
something to do, and always a visible path back to advancing.

**Storage.** Per player and per age band, alongside unlock state, since what has been
learned is band specific.

## Pacing: the progression must not be consumable in a week

Thomas, 2026-09-07: "I effectively want to make it so somebody can't really get
everything the game offers in a week... maybe it's a month or three months as I build out
content, but that's going to be important to me."

**What the content actually supports today.** Questions per age band: U7 172, U9 252,
U11 412, U13 400, U15 246, U18 166. At ten questions per session and two or three
sessions a week, a U9 player exhausts every unique question in about 25 sessions, roughly
ten weeks. U18 is thinner, around seven. A full year at that cadence is about 130
sessions, or 1,300 question slots against 252 unique questions at U9, so repetition would
have to carry about four fifths of a year. The bank supports roughly a quarter of a year
of genuinely fresh questions, and the gap is widest exactly where the bands are thinnest.

**Therefore the duration is not hardcoded.** A single constant expresses the intended
arc, defaulting to about twelve weeks today, raised as the bank grows toward a full
September to March season. Nothing else in the design changes when it moves.

**The un-rushable property comes from the calendar, not from content.** Mastery of a
concept requires practice days spread across calendar weeks, which is already how the
existing spaced mastery system works. A player cannot compress that by playing more in
one day, regardless of how many questions exist. This is why the depth layer, not the
unlock chain, carries the long arc: six unlocks stretched over a year would mean one
every two months and five locked doors for months at a time, which demotivates rather
than paces.

So worlds open early and often through their challenges, and the long arc is depth:
each concept climbs mastery tiers through spaced return visits.

**Graceful degradation is mandatory.** When a player has seen every available question in
their band, the app shifts to mastery and review framing and says so honestly ("You have
seen every read here. Now let's make them stick."). It must never present a locked door
or a "come back tomorrow" with nothing behind it. A player who returns to find nothing
new and no path does not feel paced, they feel stonewalled, and that is the failure mode
that ends the season rather than filling it.

**A pacing report, so content work is informed.** A `report:progression-pacing` script,
following the existing `report:*` convention in `package.json`, reads the current bank
and prints per age band: unique questions, estimated sessions of fresh content, estimated
weeks at a stated cadence, and whether the band currently sustains the configured target.
This is the signal for when there is enough content to raise the target, and it names
which bands are starving.

## Backdrop

Reuses the existing sprite at `/assets/journey/worlds-v1.png` with the same CSS variable
positioning already used by the world cards (`background-size: 300% 200%`, position
derived from the world's `art` index). No new assets, no additional image request.

It renders as a fixed full bleed layer behind the page content at low opacity over the
navy base, with a scrim gradient like the one the world cards already apply.

**Legibility is the actual risk, not the art.** The rink diagrams are the teaching
content, they already sit on dark navy, and the app has a colorblind mode. Therefore the
backdrop sits behind the page chrome and never behind the rink board itself. The final
opacity is chosen by looking at rendered frames at phone width, not by picking a number
that sounds right, and those frames are reviewed before this is called done.

**Applies to:** question surfaces reached inside a world, plus the World Challenge.
**Does not apply to:** Brain Gym, Play, Coach Lab, quizzes and coach homework, which keep
today's plain background. The presence of world art is the signal that you are inside a
world.

## Testing

- `worldUnlockCore.test.mjs`: chain order, distinct-question counting, challenge
  availability threshold, the four-of-five pass bar, the fewer-than-five and zero-question
  worlds, per-band isolation, and that unlocks never revoke.
- `worldSessionCore.test.mjs`: sequencing returns a teach moment before reads for an
  unmet concept, prefers unseen questions, and terminates sensibly on a small world.
- Comprehension check tests: a check comes due off the spaced schedule rather than a
  session count; a due or failed check blocks new worlds and new concepts but leaves open
  worlds playable; failing names the missed concepts and permits immediate retry; the
  reduced bar applies when fewer than ten learned items exist; passing clears the block.
- Pacing tests: the configured target constant actually drives the mastery requirements
  rather than being decorative; a player cannot complete a concept's mastery inside one
  day by volume alone; running out of fresh questions produces the review framing rather
  than a locked door.
- Disclosure tests: a visit with no answered question does not count; two visits inside
  thirty minutes count once; revealed features never un-reveal; the "Show everything"
  switch reveals all; age-band gating still suppresses a feature whose ladder step has
  passed; disclosure state survives an age band change while unlock state resets.
- The existing practice suite stays green.
- **Verification includes an actual `npm run build` and a look at rendered frames.** On
  2026-09-07 a fully green 648-test suite coexisted with an app that could not load at
  all, because the suite never parses or builds `App.jsx`. A green unit suite is not
  evidence this works.

## Explicitly out of scope

- Changes to the spaced mastery record, the scenario engine or the content factory.
- New world art.
- Coach tooling. Coach Lab is untouched; it is simply not shown inside a world.
  An earlier idea of moving Experimental scenarios to coach-only was superseded on
  2026-09-07 by folding that content into the in-world mix instead.
- Cross-band progression carrying over. Each band starts fresh, by decision.
