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
