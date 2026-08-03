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

- Win+G (Game Bar) or OBS. Either is fine.
- **1080p or better** — frame sampling downscales, so start high.
- **Mic hot.** A recording with no narration is worth less than a screenshot; the
  narration is the whole point.
- 10-15 minutes is a good session. Longer is fine, but findings cluster early.
- Drop the file anywhere (`Downloads` is fine) and say it's a playtest video.

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
