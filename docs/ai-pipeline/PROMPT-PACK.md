# RinkReads AI Content Pipeline — Prompt Pack

> **New here? Open `START-HERE.md` instead.** This file is the deep reference (full Scenario-Brief
> pipeline for interactive rink reads). For day-to-day text-question work you only need START-HERE.md + CATALOG.md.

Three tools, three jobs. Nobody does coordinate math except Claude.

- **Gemini Pro (Gem)** = Generator. Research-backed Scenario Briefs in batches.
- **ChatGPT Plus (Project)** = Reviewer. Sharpens the wrong-but-tempting option, checks hockey accuracy.
- **Claude Code** = Compiler. Turns briefs into validator-passing seed JSON, runs the validator, loads the bank, commits.

The handoff currency between Gemini and ChatGPT is the **Scenario Brief** (below). No coordinates, no JSON geometry. That comes last, in Claude.

---

## Where to save every file (absolute paths)

Everything lives under the IceIQ repo so Claude can reach it directly.

| File | Path | Who writes it | What it's for |
|------|------|---------------|---------------|
| This prompt pack | `C:\Users\mtsli\IceIQ\docs\ai-pipeline\PROMPT-PACK.md` | reference | the prompts + rules |
| **Text-question queue** | `C:\Users\mtsli\IceIQ\docs\ai-pipeline\_queue-bank.json` | **you** (paste ChatGPT's corrected JSON arrays here while Claude is out) | one growing JSON array of finished mc/tf/seq/mistake/next questions, waiting to be merged |
| **Scenario brief queue** | `C:\Users\mtsli\IceIQ\docs\ai-pipeline\_queue-briefs.md` | **you** (paste reviewed Scenario Briefs here) | interactive rink reads waiting for Claude to add coordinates |
| Final text bank | `C:\Users\mtsli\IceIQ\src\data\bank.json` | **Claude** (on merge) | the live bank the app loads; keyed by age display name |
| Final interactive seeds | `C:\Users\mtsli\IceIQ\src\scenario\seeds\<id>.json` | **Claude** (on compile) | one file per validated rink read; auto-merged into the bank |

**You only ever touch the two `_queue-*` files.** Claude moves content from the queues into `bank.json` / `seeds/` when tokens are back. Never hand-edit `bank.json` or the `seeds/` files yourself; let the validator gate them.

How to start the queue file the first time: create `_queue-bank.json` containing just `[]`, then paste the *contents* of each ChatGPT array inside the brackets (comma-separated). Or simpler: paste each full array on its own and Claude will stitch them on merge. Either works.

---

## The Scenario Brief format

This is the only thing Gemini and ChatGPT produce and pass around. One brief = one read.

```
SCENARIO BRIEF
- age: U11 / Atom            # one of: U7 / Initiation, U9 / Novice, U11 / Atom, U13 / Peewee, U15 / Bantam, U18 / Midget
- nodeId: u11.scanning       # ledger node = u<age>.<concept-id> (valid list below)
- concept: Scanning
- primitive: selection       # one of: selection, point, path, sequence
- zone: neutral              # one of: def-zone, neutral, off-zone
- view: right                # one of: left, right, neutral
- the_read: <1-2 sentences: the on-ice situation the kid is looking at>
- correct_option: <what the right answer is, in plain hockey terms — "the RW on the far boards, unguarded">
- why_correct: <the hockey reason it's right>
- tempting_wrong_option: <the option that LOOKS right but isn't — "the LW who's closer but shadowed by a defender">
- why_wrong: <why the tempting option fails — must be a real read, not a dumb option>
- prompt_text: <the question shown to the player, >=25 chars, frames the read as a decision>
- feedback_right: <names WHY it was right, coaching voice>
- feedback_wrong: <names what they missed, coaching voice, points to the correct read>
- tip: <one transferable cue, different wording from feedback_right>
- why_teaching: <the underlying lesson / learning objective>
- source: <coaching authority backing this, e.g. "Swedish scanning study (2024 SHL/SDHL)"; "Hockey Canada LTPD">
```

### Hard rules every brief must satisfy (so Claude can compile it)
1. There must be a **wrong-but-tempting** option. A read with only a right answer is rejected. Never an obviously-dumb decoy.
2. `primitive: path` with a pass REQUIRES the tempting option to be a *different* teammate in a *blocked* lane (a defender sits in the passing lane). State that explicitly in `why_wrong`.
3. `def-zone` and `off-zone` reads include a goalie and the right number of defenders (def-zone >=2, off-zone >=1). Just describe them in `the_read`; Claude places them.
4. The right read is **who has space, not who's closest.** If the correct option is also the nearest, rewrite it.
5. Match age to concept depth: a U9 read is one cue under light pressure; a U15+ read can layer coverage/switching. Don't hand a U9 a five-option coverage puzzle.

---

## Valid nodeIds (age.concept — pick one per brief)

Concept depth by age is fixed in the ledger. Use the exact `nodeId` string.

**Hockey Sense (anchor domain — prioritize these):**
`u9.scanning` `u11.scanning` `u13.scanning` `u15.scanning` `u18.scanning`
`u9.reading-the-play` `u11.reading-the-play` `u13.reading-the-play` `u15.reading-the-play` `u18.reading-the-play`
`u9.decision-making` `u11.decision-making` `u13.decision-making` `u15.decision-making` `u18.decision-making`
`u9.time-and-space` `u11.time-and-space` `u13.time-and-space` `u15.time-and-space` `u18.time-and-space`
`u9.creativity-under-pressure` `u11.creativity-under-pressure` `u13...` `u15...` `u18...`

**Offensive Play:**
`u9.puck-carrier-options` … `u18.puck-carrier-options`
`u9.off-puck-support-offense` … `u18.off-puck-support-offense`
`u9.attacking-1v1` … `u18.attacking-1v1`
`u11.cycle-and-possession` `u13…` `u15…` `u18…`
`u11.zone-entry` `u13…` `u15…` `u18…`
`u11.odd-man-reads` `u13…` `u15…` `u18…`
`u11.net-front-play` `u13…` `u15…` `u18…`  (keep U11/U13 recognition-only, not net battles)

**Defensive Play:**
`u11.gap-control` `u13…` `u15…` `u18…`
`u9.angling-steering` … `u18.angling-steering`
`u9.defensive-side-positioning` … `u18.defensive-side-positioning`
`u11.coverage-reads` `u13…` `u15…` `u18…`  (heavy switching is U15+ only)
`u9.stick-and-body-detail` … `u18.stick-and-body-detail`

**Transition & Compete:**
`u11.transition-reads` `u13…` `u15…` `u18…`
`u11.breakout-and-regroup` `u13…` `u15…` `u18…`
`u11.forecheck-pressure` `u13…` `u15…` `u18…`
`u11.backcheck-recovery` `u13…` `u15…` `u18…`
`u7.battles-and-compete` … `u18.battles-and-compete`

**Skating / Puck Skills** exist in the ledger too (edges, agility, passing, receiving, shooting, puck-control/protection) but are weaker fits for a "read" question — use sparingly.

> If unsure a nodeId is valid, leave it as `u<age>.<concept>` and Claude will confirm against the ledger.

---

## PROMPT 1 — Gemini Gem ("RinkReads Scenario Generator")

Paste this into the Gem's instructions box.

```
You are the RinkReads Scenario Generator. RinkReads is a youth-hockey (U7–U18) game-sense
trainer: kids look at a top-down rink situation and pick the right READ (where to pass, who's
open, which threat to take). Your job is to produce research-backed Scenario Briefs that a
downstream system compiles into interactive questions. You do NOT write coordinates, JSON, or
geometry — only the hockey read, in the Brief format below.

PRINCIPLES
- A good read teaches "who has space," never "who's closest." The tempting-but-wrong option must
  look reasonable to a developing player and fail for a real hockey reason.
- Age-appropriate: U7–U9 = one cue, light pressure, simple. U11–U13 = a clear read with one
  tempting decoy. U15–U18 = layered reads, coverage/switching, speed.
- Ground every brief in a coaching authority. Use your research tools to confirm the read matches
  how Hockey Canada / USA Hockey ADM / the Swedish scanning model / Tarasov actually teach it.
  Put the source in the `source` field. If you can't ground it, don't invent it.
- Voice: warm, encouraging, like a good coach talking to a kid. No jargon a 10-year-old wouldn't get.

OUTPUT
- When I give you an age + concept (or a count + theme), output that many Scenario Briefs, each in
  EXACTLY this format, separated by `---`:

[paste the SCENARIO BRIEF format block here]

- After the briefs, add a one-line "SOURCES" list of what you grounded them in.
- Do not output anything else. No coordinates. No JSON. No preamble.
```

**How to drive it each batch (your chat message to the Gem):**
> Generate 5 Scenario Briefs for `u11.scanning`. Vary the situation (neutral-zone entry, d-zone breakout, offensive-zone support). Selection or point primitive. Ground each in the Swedish scanning research.

---

## PROMPT 2 — ChatGPT Project ("RinkReads Scenario Reviewer")

Create a ChatGPT **Project**, set its instructions to this, then paste Gemini's briefs in.

```
You are the RinkReads Scenario Reviewer — a skeptical youth-hockey development coach. You receive
Scenario Briefs (youth hockey "read" questions, U7–U18). Your job is to make each one HARDER TO
GET RIGHT BY GUESSING and to catch hockey errors. You are the adversarial second opinion before a
brief becomes a real question.

For each brief, do three things:

1) HOCKEY ACCURACY: Is the correct_option actually correct at this age? Would a real coach disagree?
   Is the read taught this way by an actual authority? Flag anything dubious. Be specific.

2) SHARPEN THE DECOY: The tempting_wrong_option is the most important part. Rewrite it so it is
   genuinely tempting to a developing player — the kind of mistake they actually make — while still
   being clearly wrong for a stated hockey reason. Kill any decoy that's obviously dumb or that an
   8-year-old would never pick. For `path`+pass reads, the decoy MUST be a different teammate in a
   lane a defender blocks; make `why_wrong` say so explicitly.

3) CLARITY: Is prompt_text understandable to a kid this age and >=25 chars? Does feedback name the
   WHY, not just "correct"? Is `tip` worded differently from feedback_right?

OUTPUT: Return each brief in the SAME Brief format, edited, with your changes applied. After each,
add one line `REVIEWER NOTE:` summarizing what you changed and any accuracy flag. Keep the format
clean so it can be pasted onward. Do not add coordinates or JSON.
```

**How to drive it:** paste the batch of Gemini briefs, send. Optionally prepend: *"Be ruthless on the decoys."*

---

## PROMPT 3 — Handoff to Claude (the compile step)

Once a batch is reviewed, paste the briefs into Claude Code with:

> Compile these Scenario Briefs into seed JSON, place valid coordinates, run `validate-seed.mjs` on each, fix any errors, and drop the passing ones in `src/scenario/seeds/`. Show me the validator output.

Claude handles: coordinate placement, on-stage/view constraints, the 0.035 intercept geometry, difficulty floors, the goalie/defender minimums, `id` naming, validation, and the commit.

---

## The loop, per batch

1. **Gemini Gem:** "Generate 5 briefs for `u13.gap-control`." → 5 briefs
2. **You:** copy briefs → **ChatGPT Project** → "Be ruthless on the decoys." → 5 sharpened briefs
3. **You:** copy sharpened briefs → **Claude Code** → "Compile, validate, load."
4. **Claude:** seeds written, validator green, committed.

Two pastes per batch. Batch 5–10 at a time to stay under free-tier-ish rate limits and keep momentum.

**Tiebreaker:** if Claude's validator or hockey check disagrees with a brief, paste that one brief back to ChatGPT (or Gemini Deep Research) to settle it, then re-compile.

---

# OFFLINE KIT — text-format questions (no Claude needed)

Use this when you're out of Claude tokens. Gemini + ChatGPT produce **complete,
ready-to-ship JSON** for the five text formats (mc, tf, seq, mistake, next). These
have NO coordinate geometry and NO strict validator, so they don't need Claude to
finish. You bank up a big queue; when tokens return, Claude does a light check and
merges into `src/data/bank.json` cheaply.

> Interactive rink reads (point/path/selection/sequence) still need Claude for
> coordinates. Keep generating those as Scenario Briefs (above) and queue them.

## Where these land
`src/data/bank.json` is an object keyed by exact age display name → array of question
objects. Gemini/ChatGPT output arrays; Claude merges them under the right level keys.

## The five text-format schemas (author to these EXACTLY)

```
MC (multiple choice)
{ "id", "type":"mc", "nodeId":"u11.scanning", "levels":["U11 / Atom"],
  "cat":"Hockey Sense", "d":2,
  "sit":"<the game situation / question stem>",
  "opts":["<opt0>","<opt1>","<opt2>","<opt3>"],   // exactly 4
  "ok":3,                                          // index 0-3 of the correct option
  "explain":"<why the right answer is right>" }

TF (true/false)
{ "id", "type":"tf", "nodeId", "levels":[...], "cat", "d",
  "sit":"<a statement to judge true or false>",
  "ok":false,                                      // boolean
  "tip":"<short coach cue>", "why":"<why it's true/false>" }

SEQ (put steps in order)
{ "id", "type":"seq", "nodeId", "levels":[...], "cat", "d",
  "sit":"<the play to order>",
  "items":["<step A>","<step B>","<step C>","<step D>"],  // 4-6, listed SHUFFLED
  "correct_order":[2,0,3,1],                              // indices INTO items, correct order
  "explain":"<why this order>" }

MISTAKE (spot the error)
{ "id", "type":"mistake", "nodeId", "levels":[...], "cat", "d",
  "sit":"<describe a play where the player errs>",
  "question":"What is the player's mistake?",
  "opts":["<m0>","<m1>","<m2>","<m3>"],            // exactly 4
  "ok":1, "explain":"<the real error and the right read>" }

NEXT (what should happen next)
{ "id", "type":"next", "nodeId", "levels":[...], "cat", "d",
  "sit":"<situation at a decision point>",
  "opts":["<n0>","<n1>","<n2>","<n3>"],            // exactly 4
  "ok":2, "explain":"<why this is the best next move>", "tip":"<optional cue>" }
```

### id rule
`id` = `gen_` + nodeId with the dot as `_` + a 3-letter situation slug + 2 digits.
e.g. `gen_u11_scanning_nzc01`. Just keep them unique within your session; Claude
de-dupes globally on merge.

### cat = the concept's domain (use the exact string)
- Hockey Sense: scanning, reading-the-play, decision-making, time-and-space, creativity-under-pressure
- Offensive Play: puck-carrier-options, off-puck-support-offense, attacking-1v1, cycle-and-possession, zone-entry, odd-man-reads, net-front-play
- Defensive Play: gap-control, angling-steering, defensive-side-positioning, coverage-reads, stick-and-body-detail
- Transition & Compete: transition-reads, breakout-and-regroup, forecheck-pressure, backcheck-recovery, battles-and-compete
- Skating & Movement: edges-balance, agility-mobility, backward-transitions, deception-with-feet
- Puck Skills: puck-control, puck-protection, passing, receiving, shooting

### difficulty by age (`d`)
U7/U9 → 1 · U11/U13 → 2 · U15/U18 → 3 (nudge ±1 if the read is unusually simple/hard).

### Valid nodeId + levels: use the lists in the main pack above.

---

## OFFLINE PROMPT 1 — Gemini (paste into a fresh chat or the Gem)

```
You are the RinkReads Question Generator. RinkReads is a youth-hockey (U7-U18) game-sense
trainer. Produce COMPLETE, ready-to-ship questions as JSON in the five text formats below.
No coordinates, no rink geometry. Output valid JSON only.

I will give you a nodeId (age.concept) and a count. Produce that many questions for it,
VARYING the situation every time (different zone, different game moment, different cue) so no
two are the same read. Mix formats: mostly mc, plus tf, mistake, and next; use seq only when
the read is genuinely a sequence of steps. Match the age:
- U7/U9: one simple cue, plain words a young kid gets, d:1.
- U11/U13: a clear read with one tempting-but-wrong distractor, d:2.
- U15/U18: layered reads, faster decisions, d:3.

QUALITY BAR (this is the threshold):
- mc/mistake/next have EXACTLY 4 options, EXACTLY one correct. Every wrong option must be
  PLAUSIBLE to a developing player and wrong for a real hockey reason. Kill obvious-dummy options.
- The right answer is who/what has SPACE or the better read, never just "the closest" or "shoot."
- tf statements target a real misconception, not a triviality. Vary ok between true and false.
- Ground each in how real coaches teach it (Hockey Canada / USA Hockey ADM / scanning research).
  Do not overclaim a named curriculum you can't cite.
- Warm coach voice a kid understands. NO em dashes anywhere; use commas, periods, or parentheses.
- explain names the WHY, not just "correct."

[paste the FIVE TEXT-FORMAT SCHEMAS block here]
[paste the id rule, cat mapping, difficulty, and valid nodeId/levels lists here]

OUTPUT: a single JSON array of the question objects. Nothing else, no prose, no markdown fences.
```

Drive it: `Generate 10 questions for u11.scanning.` Then `10 for u13.decision-making.` etc.

---

## OFFLINE PROMPT 2 — ChatGPT (paste into the Project or a fresh chat)

```
You are the RinkReads Question Reviewer, a skeptical youth-hockey development coach. You receive
a JSON array of RinkReads text-format questions (mc, tf, seq, mistake, next). Your job: make each
HARDER TO GUESS and catch hockey errors, then return corrected JSON.

For every question:
1) HOCKEY ACCURACY: is the keyed answer actually correct at this age? Would a real coach object?
   Fix or flag anything dubious.
2) SHARPEN THE DISTRACTORS: rewrite weak/obvious wrong options into mistakes a developing player
   really makes, each wrong for a stated reason. For tf, make sure the statement isn't trivially
   true/false. For seq, confirm correct_order actually indexes items correctly.
3) SCHEMA CHECK: exactly 4 opts for mc/mistake/next; ok is a valid index (0-3) or boolean for tf;
   nodeId, levels, cat, d all present and valid; no duplicate ids; remove any em dashes.
4) AGE FIT: language and concept depth match the age in levels.

OUTPUT: the corrected JSON array, same objects, edits applied. Valid JSON only, no prose, no fences.
After the array, on a separate line, a short "FLAGS:" note listing anything a human should double-check
(or "FLAGS: none").
```

Drive it: paste Gemini's array, optionally add `Be ruthless on the distractors.`

---

## Banking it up while Claude is out

1. Run Gemini for a nodeId → JSON array.
2. Paste into ChatGPT → corrected JSON array.
3. Append that array into ONE growing file, e.g. `docs/ai-pipeline/_queue-bank.json`
   (just keep concatenating the arrays' contents into a single big array).
4. Repeat across many nodeIds. No Claude needed for any of this.
5. When tokens return, tell Claude: "Merge `_queue-bank.json` into bank.json." Claude does a light
   validation pass (4 opts, ok in range, valid nodeId/level, dedupe ids, strip stragglers) and
   loads them. Cheap on tokens because there's no geometry to solve.

Interactive Scenario Briefs you generate in parallel go in a second file, `_queue-briefs.md`,
and wait for Claude to compile them with coordinates.
