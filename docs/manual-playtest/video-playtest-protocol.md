# Video playtest protocol

How to hand off a playtest session as a screen recording instead of screenshots
plus typed notes. Written 2026-08-03 after the 2026-08-02 playtest, where four
defects came out of ten minutes of play and the write-up cost more than the play.

**Short version:** record the screen, keep talking, say the on-screen text out
loud. The audio is the payload.

---

## Why video is better here (and where it isn't)

Claude does not watch video. `/watch` transcribes the audio locally
(faster-whisper, free, no key) and samples frames at intervals, downscaled. So
the value is asymmetric:

**Video wins on:**

- **Reasoning.** You say why something is wrong; you rarely type it. That's the
  part that becomes a rule instead of a one-off patch. #3 in the 2026-08-02
  findings was entirely your sentence — "this question doesn't really finish" —
  and that sentence is the fix spec.
- **Sequence.** The shell bugs (#1 contradictory verdict, #2 "Question 6 of 5")
  are caused by *what you did*, not what the screen showed. A screenshot of
  "Question 6 of 5" is a dead end. A recording of the multi-step scenario that
  double-fired `onAnswer` points straight at the cause.
- **Volume.** Talking is roughly 5x cheaper than typing, so you report the small
  stuff you'd otherwise skip. The small stuff is where the patterns are.

**Video loses on:**

- **Geometry and pixel detail.** #4 — prompt says "high in the zone", render
  shows you mid-zone — needs the actual frame at full resolution. Sampled,
  downscaled frames won't settle where LW is relative to the blue line.
- **Pointing.** "This one right here" is unrecoverable. There's no cursor in the
  transcript and maybe no frame at that instant.

---

## The rules

### 1. Read the on-screen text out loud

This is the single highest-value habit, and it's why video beats screenshots for
identification rather than losing to it. A spoken quote is a **grep key**. Say
six or eight words of the prompt and the question is located exactly:

> "Okay, this one says 'your teammate is skating down the wing with the puck' —
> this question doesn't finish, it never actually asks anything."

That resolves to `src/data/bank.json:4536` in one search. A screenshot requires
me to read it off an image and hope the text is legible.

Do the same for scenario seeds: the prompt line locates the JSON in
`src/scenario/seeds/`.

### 2. Say the verdict as a full sentence

What's wrong → why → what it should be. Rough is fine:

> "It's telling me right read and incorrect at the same time. Both panels, same
> tip text. That can't both be true."

Even a guess at the cause is worth recording — it's a hypothesis to test, and
you're right often enough that it saves a search.

### 3. Name the context when it changes

Age band, play family, animated vs static, first-time session vs returning.
These decide which code path you were in and I can't infer them from a frame.

### 4. Screenshot the geometry ones

When the complaint is *where things are on the ice* — spacing, angles, who's
higher in the zone, a diagram that contradicts the copy — stop and take one
screenshot. Say "screenshot" out loud so I know to look for it. Everything else
can stay in the video.

### 5. Don't edit it

Rambling, dead air, false starts, backing up to re-check something — all fine.
Whisper handles it and I skim the transcript. Editing costs you the time savings
that made this worth doing.

---

## Capture settings

Recording resolution matters far less than you'd think, and higher is not
better. `/watch` extracts frames at **512px wide by default** (`frames.py`
`--resolution`, bumpable to 1024 at ~4x the token cost) and never upscales. A 4K
recording and a 720p recording both arrive as 512px-wide frames.

What actually decides whether I can read the screen is **how large the app is
relative to the frame** — so:

- **Fill the frame with the app.** Record the browser window alone, not a 4K
  desktop with the app in one corner. A maximized app at 1280x720 beats a
  quarter-screen app at 4K by a wide margin.
- **Browser zoom 125-150%.** Free legibility, costs nothing.
- 1080p or 720p capture is plenty. Don't bother with 4K; it gets thrown away.

The harder limit is the **frame budget: 100 frames for the whole video**
(`auto_fps`). A 15-minute recording samples roughly one frame every 9 seconds.
Frames are a garnish. The transcript is the record — which is the real reason
rule #1 (read it aloud) carries the protocol.

- Win+G (Game Bar) or OBS. Either is fine.
- **Mic hot.** A recording with no narration is worth less than a screenshot; the
  narration is the whole point.
- 10-15 minutes is a good session. Longer is fine, but findings cluster early.
- Drop the file anywhere (`Downloads` is fine) and say it's a playtest video.

## Screenshots — how to hand them over

No tagging, no renaming. Two things:

1. **Say "screenshot" out loud** as you take it, ideally with a couple of words
   of what's on screen ("screenshot — the time-and-space one"). That's the
   alignment key.
2. **Leave the default filenames** and keep them in one folder. Windows names
   them with a timestamp, so they sort chronologically and match the order you
   called them out in the audio.

Order plus your spoken cue is enough to match every screenshot to its moment. If
you want zero ambiguity on a long session, count them aloud — "screenshot one",
"screenshot two" — but it's rarely needed.

Screenshots are full resolution, so they're the *only* place fine detail
survives. That's why the geometry complaints go here and not in the video.

## What happens on my end

1. `/watch` on the file → local transcript + sampled frames.
2. Each spoken quote grepped against `src/data/bank.json` and
   `src/scenario/seeds/` to resolve exact file and line.
3. Findings written to `docs/manual-playtest/<date>-playtest-findings.md`,
   classified content vs shell, with the root-cause trace for shell bugs.
4. Recurring judgments promoted into written rules so you stop re-explaining the
   same call — the same way the 2026-08-02 session produced the "positional
   language should be validated against actual coordinates" idea.

Screenshots aren't retired. Hybrid: video as the default pass, screenshots as
the exception for anything pixel-exact.
