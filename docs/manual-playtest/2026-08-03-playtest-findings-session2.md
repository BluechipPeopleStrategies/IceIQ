# Playtest findings — 2026-08-03, session 2

Continuation of [session 1](2026-08-03-playtest-findings.md). Picks up on the SMART
Goals screen where session 1's last screenshot left off.

**Source:** `C:\Users\mtsli\Videos\2026-08-03_12-02-17.mkv` — 20:36, 12:02:17 →
12:22:54. Transcribed locally (faster-whisper), 180 segments.
**Screenshots:** nine, 12:03:32 → 12:16:12.
**Coverage:** SMART Goals, home quests, Journey, Read the Play, and eight of the
Cognitive Gym drills.

**It cut off again.** Last words at [20:21] are *"I want the point scheme to make
sense, I want the point scheme to be—"* and the file ends 15 seconds later. Same as
session 1. Whatever you said after that is gone, and there are no screenshots past
12:16:12, so the last seven minutes (Read the Numbers onward) are audio-only.

---

## The one that matters most

### S2-SAVE — most of the First-Six progress is not persisting

[03:02] "it's still showing 'set my first goal' at the beginning. In fact, it's also
saying rate myself on six skills, three pro insights, and set your first goal. Like,
no, I haven't done any of those… it didn't save my SMART Goals number one that I
did. So it seems like it just lost it."

[03:58] "the first five as a player did not save, aside from the log a past or future
training session. So there's something there with the save button."

Five of six First-Six quests lost their state. The training log is the only one that
survived — and the training log is precisely the screen that saves *without* an
explicit Save button ([session 1, SHELL-6](2026-08-03-playtest-findings.md)). That
is not a coincidence; it is the diagnosis. Every screen that gates its write behind
an explicit Save is losing data, and the one that writes on change is fine.

This supersedes SHELL-6 in priority. It is not a UX inconsistency, it is data loss,
and it makes the whole onboarding sequence untrustworthy. Related: SHELL-4 (the
Rate-yourself screen hanging on "Saving…") is very likely the same failure wearing a
different mask — a write that never completes.

**Do this one first.**

### S2-SESSIONS — quiz sessions still aren't discrete

[02:11] "it says nine of nine quizzes taken… that number was jacked up because I kept
clicking the end quiz or final quiz. So that's why it kept giving me the high
[numbers], because it was miscalculating all of those. So it didn't treat it as a
discrete session."

This is [SHELL-1](2026-08-03-playtest-findings.md) seen from the other end — the same
run-on session, now inflating the session counter. The fix in `f8deb14` freezes the
session length so the quiz ends when it should, which should stop new inflation, but
**it does not clean up the counts already written**. Worth checking whether
`quizHistory` needs a repair pass, and whether `saveQuizSession` can be made
idempotent so a double-fired finish can't write twice.

---

## SMART Goals

- **S2-1 — nothing challenges a weak goal.** [00:15] "I want us to give options and
  really have AI or something challenge when it's not good enough. So for example,
  the goal 'better backwards crossovers' — if that's not a good enough goal then I
  need the system to prompt it." The screen currently marks every field `yes` and
  calls it complete; "Better backwards crossovers" passed as Specific and Measurable
  when it is neither.
- **S2-2 — give options plus a fill-in.** [00:33] "Specific: what specifically will
  I work on? Give some high level options, but then also give an option to just fill
  in myself." Applies per SMART field, not just the goal title.
- **S2-3 — three Save Goal affordances on one screen.** [01:04] "When I click save
  goal, it says goal complete, but then it has three save goal options." Screenshot
  **12:03:32**: `Save` in the header, `Save Goal ✓` inside the card, `Save Goal ✓`
  full-width below.
- **S2-4 — saving doesn't take you anywhere.** [01:18] "it looks like I have to go
  back to make that happen… if there's a way that we can save the goal and then have
  it go back, that would be ideal."
- **S2-5 — celebrate the first goal.** [01:47] "if there's a way that we can
  encourage or celebrate the goal setting. So once someone saves their first goal, we
  have confetti, some sort of badge or banner."

## Home / Journey

- **S2-6 — Daily Drill challenge errors out.** [02:41] "let's go daily drill. When I
  click it, it says something went wrong. When I reload it, it reloads back at my
  main landing page." A hard error plus a reload that dumps you out of context.
- **S2-7 — show recent sessions on the training tile.** [03:43] "before we click it,
  maybe show recent sessions in that pill on the main page." Screenshot **12:06:12**.
- **S2-8 — Journey needs a rethink.** [04:15] "the Journey world, again, we have to
  revisit and think about more what that looks like." Parked, not actionable yet.

## Read the Play

Overall: [04:30] "There's a whole bunch of Read the Play options, which is awesome."
[04:35] "if there's a way that we can make these scenario based or animated, that
would be perfect."

- **S2-9 — questions depend on what a teammate does, with no way to express it.**
  [05:22] on Backcheck Recovery: "this is a question that also relies on what my
  teammate does. So having options where my teammate does something would be very
  good for a question like this." Then [05:45] "based on what my defender is doing,
  going to one doesn't really make sense." Screenshot **12:07:32**.
  This is the same defect as session 1's CONTENT-7 (the weak-side one-timer that
  depended on the winger). Two sessions, three instances — it belongs in the rules.
- **S2-10 — you can't tell who you are.** [05:11] "it didn't really show when I can
  recall who I am."
- **S2-11 — prompt contradicts the diagram, again.** [06:27] Forecheck Pressure /
  Force the Wall: "You are first forechecker, but in this image they're actually
  second forechecker." Screenshot **12:08:59** confirms it — `YOU` sits at the blue
  line with an unlabelled teammate already closer to the carrier. And [06:47] "the
  reality is they're in a scoring position there. It's not really pushing them to the
  wall, it's actually just making a shot tougher." The answer copy describes a play
  the geometry doesn't support. Same class as session 1 CONTENT-5.
- **S2-12 — no way forward, only Replay or "Mark this read unclear".** [07:13] "it
  doesn't give me an option to go to next… and I don't want to 'mark this read
  unclear' to be more prominent than the replay button." Recurs at [10:25]: "I cannot
  move forward, I can only click the back button up top, or replay."
- **S2-13 — "Mark this read unclear" isn't useful feedback.** [07:32] "that doesn't
  give us much information. We really need feedback." Note there is already a
  Feedback button bottom-right; consider routing to it rather than a binary flag.
- **S2-14 — angle framing doesn't match positions.** [08:38] Take Away the Reverse:
  "it's hard to angle in behind the carrier based on where they are, so we need to
  think about how we're going to frame these questions."
- **S2-15 — only one of two reads offered.** [08:52] "this one only had one of two
  reads, yet it didn't give us an option to go to the second one." Also [07:48] "it
  does save the forecheck pressure question, and this one's for one-on-one, so maybe
  there's only one question option."
- **S2-16 — player-identification language is inconsistent.** [09:00] "F1, F2 — I've
  seen it where it's F1/F2, it's Center/Left Wing, it has YOU. I want us to think
  about what language it looks like to identify players on the ice." The 12:08:59
  screenshot shows a fourth convention in play: `A1`/`A2` for opponents with the
  teammate unlabelled. Pairs with session 1's CONTENT-11 (zone vocabulary) — same
  problem, different axis.
- **S2-17 — feedback length is inconsistent.** [10:05] "if we're going to be
  providing feedback, which we should, it needs to be consistent in terms of length,
  where possible."
- **S2-18 — an unexplained "angle" pill.** [10:18] "There's also an angle pill that
  has showed up here, but I don't really know what it's for." Screenshot **12:12:45**.
- **S2-19 — "1 of 1 reads" is the wrong wording.** [10:37] "It did capture that as
  completed, but it's captured as 1 of 1 reads, and I feel like that's not the right
  wording."

## Audio

- **S2-20 — coach voices don't match the coach.** [06:09] "we need to make sure that
  for the audio feedback, when the female's giving feedback it's a female coach voice,
  and when the male's giving feedback it's a male voice. And they also have to be
  different based on the coaching personalities we have."

  Verified: [`src/speak.js`](../../src/speak.js) never assigns `utterance.voice` at
  all — it sets only `rate` and `pitch`, so every persona speaks in the one system
  default voice. There are four personas
  ([`coachPersonas.js`](../../src/coachPersonas.js)): Kincaid, Danno, Marques,
  Kowalski, each with a distinct avatar and distinct written voice, all sharing one
  spoken voice.

  **Open question for you:** which persona is the female one? All four current
  personas read male by name. If the female coach is somewhere else in the product,
  point me at it; if she doesn't exist yet, this is "add a persona" as well as "map
  voices".

## Cognitive Gym

### S2-21 — Shootout: the rendering needs replacing

[11:20] "there's got to be a better way we can do this. I mean, just look at this,
there's got to be something we can model from the internet that would help us with
the 3D rendering of this, but this is pretty atrocious." Screenshot **12:13:50**.

Confirmed from the screenshot: a flat perspective floor, a small rectangular target
grid holding five green circles and one black square, a stick shape and a puck. It
does not read as a net.

What you liked, [11:51]: "I do like how it zooms in, and you're actually moving it
into attack." Keep the camera move.

Also:
- [12:05] next iteration should attack **from different angles**
- [12:10] the poke check should **actually poke the puck away**
- [12:24] "the shapes aren't really consistent" — five circles and one square
- [12:33] only a back button
- [12:33] "I do like the O and X up top"
- [12:38] **five trials**, not the current count
- [11:45] Screenshot **12:14:38** for the poke check

### S2-22 — Run the Play: the play would be offside

[12:54] "we've got a bunch of numbers on the ice, don't know where the puck is…
the concept here is fine, but it would actually be offside, and we don't really want
to shoot something 200 feet." [13:28] "the actual fundamentals of this game aren't
too bad." Screenshot **12:15:43**.

### S2-23 — Late Read needs significant work

[13:35] "again we have a couple of players offside." [14:14] "it's really tough to
comprehend, it's too fast, so late read needs significant work, the positioning of
the players doesn't really make sense." Screenshot **12:16:12**.
Also [13:45] "I would like us to add the Read It button to more of the middle of the
page."

### S2-24 — Read the Numbers: liked, wants four changes

[14:56] "I like this question in theory."
- [14:45] button at the top so you don't have to scroll
- [15:13] "let's do something with the points system, because when you go 'number
  two' and then '+2', it just looks kind of amateurish"
- [15:26] **five reps**, not ten — "why don't we do five reps on all of these games"
- [15:41] difficulty progression: "have these numbers moving, have them be covered up
  by other players… where we make it complicated and add in different aspects to
  continue to increase the difficulty"

### S2-25 — Two Things at Once is far too hard

[16:39] "it says 'miss the crossing' — this game is way too hard at level four, so we
need to nerf this difficulty. This is a tough game that might require some more
feedback." Also [16:24] the instructions didn't land: "I don't know what I'm supposed
to do."

### S2-26 — Snapshot: show the answer, and respect rink dimensions

- [17:03] "when we click and get the answer wrong, I want to see where the players
  actually were, just to confirm that I got it wrong." (Identical ask to session 1's
  CONTENT-6 on placement questions — show the correct answer, don't just score it.)
- [17:50] "find a way to have the answers be consistent with the rink dimensions,
  based on what the actual rink dimensions are, and make sure that we are capturing
  the distance."

### S2-27 — progression isn't legible

[18:17] "we need to have it be session complete… it says level nine, new best. So
does that mean I've gone to level nine now? What was I before? Maybe we show some
sort of sliding improvement from where they were before to the next level, just to
see progression. I want to find a way to capture progression in these games."

### S2-28 — Baylor's Pick (`TrackingDrill.jsx`)

*Transcribed as "Baller's Pick" — the drill is **Baylor's Pick**
([`CognitiveGym.jsx:36`](../../src/cognitive-gym/CognitiveGym.jsx#L36)), which is
`TrackingDrill.jsx`, not BestOptionDrill. Confirmed by his own words at [19:05]
matching that drill's `why` copy verbatim, plus the three-tap and lock-in mechanics.*

- [19:05] **"open man" → "open player"** — "let's not have it gendered unless we
  absolutely have to." Worth a bank-wide sweep for gendered language, not just this
  string.
- [19:13] "if there's a way we can have a keyboard piece in here that would be ideal"
- [19:29] "I want the lock-in pill somewhere on the screen that doesn't have any
  spots, so I don't want to move too far to click"

### S2-29 — Read the Pass: corner physics

[19:55] "depending on where the line is, it would never cross — so if it's up against
the wall, it would never cross that line. I want us to be mindful of the physics in
the corners, as something might not just bounce off of the corner, it might actually
ride the corner."

### S2-30 — the point scheme (cut off mid-sentence) — the `+2` is a real defect

[20:21] "And again the point scheme, I want it to be, I want the point scheme to make
sense—" and the recording ends.

**But the `+2` half of this doesn't need his missing sentence.** Verified against
[`gymPoints.js`](../../src/cognitive-gym/gymPoints.js) and
[`readNumbersCore.js`](../../src/cognitive-gym/readNumbersCore.js): points are
`round(1000 × exp(−(answerMs / 3200) / 0.12))`. That decay is far too steep for the
3.2-second window it runs over:

| Correct answer in | Points |
|---|---|
| 0.20s | 594 |
| 0.50s | 272 |
| 1.00s | 74 |
| 1.50s | 20 |
| 2.40s | **2** |
| 2.92s and later | **0** |

A **correct** answer at a normal 1.5-second reaction time scores 20 out of a nominal
1000, and from 2.92s onward a correct answer scores literally zero. The 2.4s case is
exactly the `+2` he saw — and on a drill about jersey numbers, "which one was #2?"
answered correctly can print "+2", which is where the amateurish reading comes from.

This is the decay constant, not the display. Fixable now, independent of whatever he
was about to say.

### S2-30b — the rest of the point scheme (unknown)

[20:21] "And again the point scheme, I want it to be, I want the point scheme to make
sense—" and the recording ends. Combined with [15:13] on the amateurish `+2`, the ask
is at least: a coherent, explained scoring model across all gym drills. Whatever else
you were about to say is lost.

---

## Cross-cutting patterns

Three things you said in more than one place, which makes them rules rather than
tickets:

1. **Put the action control where the hand already is.** [10:18] the angle pill,
   [13:45] Read It to the middle, [14:45] the watch button up top, [16:24] the pill in
   the middle, [19:29] the lock-in pill away from the tap spots, and session 1's
   `+ Log` button. Six instances across two sessions. This is a layout standard, not
   six bugs.
2. **Show the correct answer, don't just mark it wrong.** S2-26 and session 1's
   CONTENT-6. A wrong answer with no reveal teaches nothing.
3. **A question must not depend on an actor whose behaviour isn't specified.** S2-9,
   S2-14, and session 1's CONTENT-7. Either pin the other player's action in the
   prompt or make it a variable the question asks about.

Plus the one from session 1 that just got its third and fourth instances:
**prompt text must be validated against the rendered coordinates** (S2-11, S2-22,
S2-23 — all three are "the diagram says something the words don't").

---

## Screenshot alignment

| File | Video time | What you said |
|---|---|---|
| `…120332.png` | 01:14 | three Save Goal affordances |
| `…120612.png` | 03:55 | training tile — show recent sessions |
| `…120732.png` | 05:15 | backcheck recovery lane question unclear |
| `…120859.png` | 06:42 | forecheck "force the wall" — YOU is F2, not F1 |
| `…121244.png` | 10:28 | the unexplained angle pill |
| `…121349.png` | 11:32 | shootout rendering |
| `…121438.png` | 12:21 | poke check should poke the puck away |
| `…121543.png` | 13:26 | Run the Play — would be offside |
| `…121612.png` | 13:55 | Late Read — offside players, Read It placement |
| *(none after 12:16:12)* | 14:00 → 20:36 | Read the Numbers, Two Things, Snapshot, Baller's Pick, Read the Pass — audio only |

---

## Protocol note

Reading prompts aloud worked again. Two suggestions for next time, both cheap:

- **Screenshot the gym drills.** The last seven minutes covered five drills with no
  screenshots, and these are visual/geometry complaints — exactly the category the
  protocol says video loses on.
- **Check the OBS timer before you start talking.** Two sessions in a row ended
  mid-sentence. Neither loss was large, but S2-30 is a genuine gap: you were setting
  out a scoring model and I only have the first half of the sentence.
