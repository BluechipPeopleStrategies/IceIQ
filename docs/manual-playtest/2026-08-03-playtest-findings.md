# Playtest findings — 2026-08-03

First session run under [video-playtest-protocol.md](video-playtest-protocol.md).
It worked: ~30 distinct findings out of 18 minutes, versus four out of ten minutes
on 2026-08-02 with screenshots-plus-notes.

**Source:** `C:\Users\mtsli\Videos\2026-08-03_11-36-03.mkv` — 17:59, 11:36:03 →
11:54:02. Transcribed locally (faster-whisper), 188 segments.
**Screenshots:** `C:\Users\mtsli\Pictures\Screenshots\` (see alignment table at the
bottom).
**Context:** U11 / Atom, Forward, 2025-26, `localhost:5176`, first-time player state.

---

## Where the session actually ended

The recording captured the whole thing — nothing was lost mid-session. It ran the
full 17:59 and stopped at **11:54:02**, three seconds after the last sentence:

> [17:57] "…and then now I'm getting a whole bunch of five straight, ten straight,
> ten straight things, and I'm not actually seeing the finish and see results page.
> It's just info froze."

That is the end of the audio. The OBS timer in the 11:54:07 screenshot reads
`00:00:00`, so the stop was real, not a dropped file.

**You kept testing for another nine minutes after it stopped.** Four screenshots
exist past the end of the recording, and they carry findings with no narration
attached:

- **11:57:18** — Q5 of 10, "You're turning hard around a defender in the corner.
  Which part of your skates should you feel doing the work?" Session had silently
  become a 10-question session (see SHELL-1).
- **11:57:54** — the same `+70 XP · Edges Balance · best ★★★` toast rendered
  **three times** stacked (SHELL-3).
- **11:58:10** — close crop of that duplicate toast.
- **12:03:32** — SMART Goals, "Better backwards crossovers", 5/5 steps complete,
  a `Save Goal ✓` button inside the card *and* a second full-width `Save Goal ✓`
  below it, plus `Save` in the header. Three save affordances on one screen.

So: last thing on camera is the frozen post-quiz screen. Last thing you actually
did is the SMART Goals screen at 12:03. If you narrated anything between 11:54 and
12:03, it is gone — those four screenshots are all that survived.

---

## Shell defects (code)

### SHELL-1 — session length changes underneath you mid-session (root cause of three symptoms)

This one bug produces "Question 6 of 5", "Question 6 of 10", and the results page
that never arrives.

[`src/App.jsx:1859`](../../src/App.jsx#L1859):

```js
const qLen = idsLen > 0 ? idsLen : (isDemo ? 7 : (firstTime ? 5 : (player.sessionLength || 10)));
```

`firstTime` is derived live, not snapshotted —
[`src/App.jsx:1844-1849`](../../src/App.jsx#L1844-L1849):

```js
const isReturning = player.quizHistory.length > 0;
const firstTime = !isReturning;
```

`handleQuizComplete` appends to `quizHistory` and calls `setPlayer` **before** it
calls `setScreen("results")` — and `setScreen` sits behind an awaited Supabase
write ([`src/App.jsx:8271-8276`](../../src/App.jsx#L8271-L8276)). So on the very
first session the order is:

1. You answer Q5 of 5, click **Finish & See Results**
2. `setPlayer({...player, quizHistory: [session1]})` → re-render
3. `isReturning` flips true → `firstTime` false → **`qLen` recomputes 5 → 10**
4. `isLast = qNum >= qLen - 1` is now false, so the quiz keeps serving questions
5. `setScreen("results")` fires late, into a screen that already re-rendered as an
   in-progress 10-question quiz

Your words at [17:31] — "same question six of five up top… when I clicked finish
and see results, it now went to question six of ten" — are that sequence exactly.
The 11:57:18 screenshot (Q5 of 10) confirms it kept going.

**Fix:** snapshot `qLen` into state when the session starts. It must not be a
derived value that reads `player`.

### SHELL-2 — counter reads one past the end

[`src/App.jsx:2355`](../../src/App.jsx#L2355) renders `Question {qNum+1} of {qLen}`
where [`src/App.jsx:1983`](../../src/App.jsx#L1983) is
`const qNum = Math.min(answeredCount(results), qLen)`.

The clamp lands on `qLen`, then the display adds one — so after the last answer it
renders **"Question 6 of 5"** unconditionally. The 2026-08-02 fix clamped the
overrun but left the `+1` outside the clamp, so the off-by-one survived.

**Fix:** `Math.min(qNum + 1, qLen)`.

Separate from SHELL-1 — this one fires even when `qLen` is stable.

### SHELL-3 — celebration toasts stack and duplicate over the results screen

At [17:45] you get "5 straight / 10 straight / 20 straight" in Puck Skills, Hockey
Sense and Offensive Play simultaneously. Every category milestone fires its own
`toast.celebrate` in a loop ([`src/App.jsx:8264-8266`](../../src/App.jsx#L8264-L8266)),
with the weekly-streak and path-clear toasts on top. They cover the screen and read
as a freeze.

Worse in the 11:57:54 screenshot: the *same* `+70 XP · Edges Balance · best ★★★`
toast three times. Not three different milestones — one event rendered three times,
so the path-clear toast is firing on re-render rather than once per event.

**Fix:** dedupe by key, cap the visible stack, and queue milestone toasts to the
results screen instead of over the live quiz.

### SHELL-4 — "Rate yourself" hangs on Saving with no way out

[04:30ish, 02:09] "Once I get through it and it says saving, it is not allowing me
to proceed… there's no way for me to save the rate myself piece… I'm stuck and this
is on skill six of six."

[`src/screens.jsx:1705-1707`](../../src/screens.jsx#L1705-L1707):

```js
setSaving(true);
const merged = { ...(player.selfRatings || {}), ...next };
Promise.resolve(onSave(merged)).finally(() => setSaving(false));
```

`onSave` is `handleSkillsSave` ([`src/App.jsx:8278-8284`](../../src/App.jsx#L8278-L8284)),
which awaits `SB.saveSelfRatings` inside a try/catch and only then calls
`setScreen("home")`. The try/catch handles a *rejection*. It does not handle a
**hang** — and there is no timeout on the Supabase call anywhere in this path. A
stalled request leaves the button on "Saving…" forever, on the last skill, with no
error, no retry, and no escape.

**Fix:** timeout the write (~8s), save locally first and reconcile after, surface a
failure state, and never gate navigation on the network round-trip.

### SHELL-5 — back button silently destroys quiz progress

[13:44] "I clicked the back button when it was five of five and it auto took me
back to the main page. Now it started over the questions."

**Fix:** confirm-on-exit when a session is in progress, or persist and offer resume.

### SHELL-6 — profile settings don't persist unless you hit Save, and nothing says so

[07:00] "when I went through and I clicked and changed the session length and the
colorblind mode… but then I went right into the parent assessment, it lost that I
made that change."

`handleProfileSave` ([`src/App.jsx:8298`](../../src/App.jsx#L8298)) is the only
writer; the settings screen holds local state until then. Navigating away discards
it silently. Made worse by the training log, which saves *without* an explicit Save
([08:05] "I log 30 minutes and it's saved even though I didn't click save") — so
the app is inconsistent about it screen to screen.

**Fix:** pick one model. Recommend auto-save on change everywhere, with the Save
button kept as reassurance rather than as the commit.

### SHELL-7 — placement question timer starts immediately

[11:01] "we have the answer fast timeline and it starts ticking down immediately.
We should have some latency there."

Placement questions need reading time before the clock starts. Grace period, or
start the timer on first interaction.

### SHELL-8 — placement question auto-advanced before it was answered

[16:59] "it looked like it moved it to question five of five before I could even
advance it." Likely the same double-fire class as the 2026-08-02 `onAnswer` bug.
Worth checking against SHELL-1 — it may be the same re-render.

### SHELL-9 — a tap-target question with exactly one target can't be wrong

[16:50] "It only has a target and then you click that, so there's really no way to
get this question wrong." Single-target placement questions need distractor zones
or they aren't questions.

### SHELL-10 — training log has no visible affordance

[03:53] "if I click the training log, it says tap to log a session, but there's
really nothing to tap."
[`src/widgets.jsx:201`](../../src/widgets.jsx#L201) — copy tells you to tap; no
control renders. Plus: `+ Log` sits far from the pointer, the date field should
auto-open the calendar, and entered coaches should persist for reuse.

---

## Content defects

### CONTENT-1 — every U11 question is untyped, so U11 is MC-only

The app told you "there are no true/false questions available for U11 / Atom yet."
Verified against the bank — it's broader than T/F:

| Band | Questions | Types present |
|---|---|---|
| **U11 / Atom** | **156** | **none — 0 of 156 carry a `type` field** |
| U9 / Novice | 30 | mc 16, tf 6, mistake 4, next 4 |
| U7 / Initiation | 39 | mc 19, tf 8, next 7, mistake 5 |
| U13 / Peewee | 26 | mc 11, tf 5, mistake 4, next 4, seq 2 |
| U15 / Bantam | 10 | tf 3, mistake 3, next 2, mc 1, seq 1 |
| U18 / Midget | 1 | mc 1 |

Every U11 entry falls through `question?.type || "mc"`
([`src/App.jsx:1985`](../../src/App.jsx#L1985)) and renders as multiple choice.
U11 is the flagship band and it's the only one with zero question-type variety —
no T/F, no mistake-spotting, no what-happens-next, no sequencing. It's a one-line
field per question, not a content rewrite.

### CONTENT-2 — questions omit the information needed to answer them

The through-line of the whole session. Four instances:

- **Question of the Day** — [`bank.json:2916`](../../src/data/bank.json#L2916)
  "The puck squirts loose behind you while you're skating forward. What's the
  quickest way to get to it?" [00:24] "I got this question right, but it should
  have more information about where you are. If you cross the blue line and then
  lost the puck behind you, you'd have to wait till everyone tags up."
- **Jersey question** — [`bank.json:3947`](../../src/data/bank.json#L3947)
  [08:30] "The jersey color doesn't matter in this question… we don't know where
  the puck is. We need to have information about where the puck is."
- **Boards question** — [`bank.json:4960`](../../src/data/bank.json#L4960)
  [14:09] "Is this always on D zone, neutral zone, etc.? Some of these questions
  are too vague, they need more information to answer accurately."
- **Rule you stated** [08:35]: *"when there's no picture associated with it, let's
  have only information that we absolutely need"* — cut the decorative detail,
  add the situational detail. Both halves matter.

### CONTENT-3 — a question with no question in it

[`bank.json:4226`](../../src/data/bank.json#L4226) — `gen_u9_decision-making_dec05`:

> "Your teammate is battling for the puck on the boards. You are open in the slot.
> The puck pops right to you."

[09:33] "It doesn't ask you what you should do next. It doesn't say anything, but
it gives you options." Same defect class as 2026-08-02 #3. A stem with no
interrogative.

Also: this question is tagged `"levels": ["U9 / Novice"]` only, and it was served
in a U11 / Atom session. Worth confirming whether band filtering is leaking.

### CONTENT-4 — distractors that don't belong to the stem

[`bank.json:958`](../../src/data/bank.json#L958) — "When is the risky pass worth
it?" against options about being up two goals and breakaways being the best chance
in hockey. [10:40] "that question doesn't fit with the other answers… this question
is a little bit too vague." The correct answer is a judgment principle; the
distractors are unrelated assertions, so it's answerable by elimination without
understanding anything.

### CONTENT-5 — placement question contradicts its own diagram

[`u13_breakout_position_place_v1.json:26`](../../src/scenario/seeds/u13_breakout_position_place_v1.json#L26)
— "A forechecker has sealed your strong-side wall. Drag your three forwards to the
outlets that beat this pressure." Screenshot **11:49:01**.

[12:11] "They haven't actually sealed it in the image. So really what it looks like
is the players are already kind of in the correct spot… I moved the players based
on where the space was in the actual picture, and so it's coming back wrong. This
question logically doesn't really connect."

The prompt describes pressure the render doesn't show, and the starting positions
are close enough to the target that the correct move is invisible. This is the
2026-08-02 "positional language validated against actual coordinates" idea, now
with a second instance — it should become a rule.

Also served in a U11 session despite the `u13_` seed prefix.

### CONTENT-6 — placement feedback doesn't show the correct answer

[12:53] "it doesn't really explain or show me where each correct player should be…
it would be good to show the actual movement of the player in the correct answer,
from where they were when the question was asked to roughly where they should be."

An arrow from start position to target, per player. Currently you learn only that
you were wrong.

### CONTENT-7 — weak-side relocate question is good but geometrically wrong

[`u15_scanning_weakside_v1.json:80`](../../src/scenario/seeds/u15_scanning_weakside_v1.json#L80)
Screenshot **11:52:26**.

[16:21] "this question is a solid one… but this answer also depends on what the
left winger does, because if the winger goes there then you don't want to go
there… and also the winger would never be able to make this pass for a one-timer
because it would have to go right through the goalie."

The target zone is unreachable by the pass the question presumes. Same u15-seed-in-
a-U11-session note as CONTENT-5.

### CONTENT-8 — image doesn't match the prompt

[`bank.json:1566`](../../src/data/bank.json#L1566) — "You attack wide with speed and
the defender turns their hips to chase. What just opened up?" Screenshot
**11:51:38**. [15:46] "the picture doesn't really match the question."

### CONTENT-9 — scenario layouts are inconsistent between questions

[15:06] "Question three has got a different type of layout than previous
scenario-based questions… I'd like us to develop consistency on what the scenarios
look like in terms of the image that's being shown on the screen."

Visible across the frames: full-rink wide view, cropped D-zone, cropped O-zone,
with and without the legend strip, with and without the READ THE PLAY card. Needs a
scenario visual standard.

### CONTENT-10 — answers teach the what, not the why

[14:22] "I think 'keep your feet moving' is the correct answer, but let's have this
teaching concepts so people can understand why."
And [01:15] on the Question of the Day: "instead of a tight turn… I'd rather teach
the concept here, which is just take the shortest road back to the puck."

The concept is the durable takeaway; the correct option is disposable.

### CONTENT-11 — zone vocabulary isn't standardized

[09:55] "we also need some questions that talk about the different areas on the
ice: neutral zone, defensive zone, offensive zone, crease, slot, point, corners,
half wall, etc. Make sure that we're capturing that so the language is always
consistent."

Both a content gap (teach the vocabulary) and a consistency rule (use one name per
location bank-wide).

### CONTENT-12 — one question flagged for review, not defect

[`bank.json:4647`](../../src/data/bank.json#L4647) — tap your stick blade flat on
the ice where you want the puck. [15:00] "I like this question, I'd be surprised if
it would hold up to scrutiny." Logged as a coach-verification item.

---

## Product asks

- **PRO INSIGHTS — 132 is not enough.** [02:29] Confirmed: `hockeyInsights.js`
  holds exactly 132. [03:13] "even if we only allowed three per day and we rotated
  it so they were always new for a user, this would be completed in 40 days. We
  need to think about how we source and add this to make it a more robust
  feature." Two asks: a sourcing pipeline, and a view-gating/rotation model.
- **PARENT ASSESSMENT → 5-point Likert.** [04:51] Currently 3-4 points
  (often/sometimes/rarely). Wants always → never, five points.
- **PARENT ASSESSMENT → completion date** on the card, [06:07].
- **PARENT ASSESSMENT → graphs** once there are enough data points, [06:14]. You
  referenced "a graph document I downloaded to this computer" — I couldn't find it
  in `Downloads`. BlueChip has `references/chart-chooser.md`, which may be the one
  you meant; confirm and I'll wire the chart-type selection to it.
- **Save button placement** — [05:53] "I would like the save option along the side
  somewhere, so it's not always at the bottom." The 12:03:32 SMART Goals screenshot
  shows the opposite problem: three save affordances at once.
- **Session length by tier** — [04:25] "let's develop a strategy where people get a
  certain amount of questions based on what tier you are. For now, let's just do
  five questions."
- **Training log polish** — [07:29] `+ Log` closer to the pointer, calendar
  auto-opens, coach names persist across sessions.
- **Language check passed** — [02:02] "Overall the language looks good." The
  self-rating skill prompts are landing.

---

## Rules worth promoting

Three judgments recurred often enough to stop being one-offs:

1. **A question must contain everything needed to answer it, and nothing else.**
   Zone, puck location, and score/time state when they bear on the answer; no
   decorative jersey colours. (CONTENT-2, 4 × instances)
2. **Prompt text must be validated against the rendered coordinates.** Second
   session in a row producing this. If the prompt says "sealed", the render must
   show the seal; if it says "high in the zone", the coordinates must agree.
   (CONTENT-5, CONTENT-7, 2026-08-02 #4)
3. **Every question teaches a concept, not an answer.** The explanation carries the
   transferable rule ("take the shortest road back to the puck"), not a restatement
   of the correct option. (CONTENT-10)

---

## Screenshot alignment

| File | Video time | What you said |
|---|---|---|
| `…113332.png`, `…113517.png` | pre-recording | — |
| `…114901.png` | 12:53 | "for a question like this, screenshot" — breakout placement |
| `…115138.png` | 15:30 | "I'd screenshot that" — layout inconsistency |
| `…115225.png` | 16:17 | "this question is a solid one, I'm going to screenshot it" |
| `…115334.png` | 17:26 | "same question six of five up top, I'm going to screenshot that" |
| `…115345.png` | 17:38 | "it now went to question six of ten. I've screenshotted that" |
| `…115407.png` | 17:59 (end) | the frozen state; OBS timer reads 00:00:00 |
| `…115718.png` | post-recording | Q5 of 10 — session silently extended |
| `…115754.png`, `…115810.png` | post-recording | `+70 XP` toast ×3 |
| `…120332.png` | post-recording | SMART Goals, three save affordances |

---

## Protocol note

Reading the prompts aloud worked exactly as intended — 9 of 10 spoken quotes
resolved to an exact `bank.json` line or seed file on the first grep. The one miss
was the jersey question, where you paraphrased the colours; searching `"jersey"`
found it in one more step.

The frames were near-useless at 512px for anything except confirming which screen
you were on, which the protocol already predicted. The screenshots carried all the
geometry. Keep that split.

One change worth making: **say the age band out loud once at the start.** Two of
the scenarios served were `u13_` and `u15_` seeds inside a U11 session, and I can
only flag that as suspicious rather than confirm it, because I'm inferring the band
from a 512px header crop.
