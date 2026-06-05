# START HERE — RinkReads content workflow

This is the only file you need open day-to-day. Everything else is reference.

## The 3 files (what lives where)
- **START-HERE.md** (this) — the runbook. Open this.
- **CATALOG.md** — the menu of what to ask for (every nodeId). Open this to pick your next batch.
- **PROMPT-PACK.md** — deep reference. Only needed for the interactive rink-read pipeline (Track B below). Ignore it for normal work.

## Two folders things end up in
- You paste into: `C:\Users\mtsli\IceIQ\docs\ai-pipeline\_queue-bank.json`  ← create it once, put `[]` inside.
- Claude later writes: `C:\Users\mtsli\IceIQ\src\data\bank.json`  ← the live app bank. Don't touch it.

---

# Track A — text questions (do this; no Claude needed)

This is 90% of the work and you can do it entirely in Gemini + ChatGPT while Claude is capped.

### The loop (repeat per nodeId)
1. Open **CATALOG.md**, pick a nodeId (start: `u11.scanning`). Tick its box.
2. In **Gemini**, paste **PROMPT A** (below) once per chat, then type: `Generate 10 questions for u11.scanning.`
3. Copy Gemini's JSON array. In **ChatGPT**, paste **PROMPT B** (below) once per chat, then paste the array and type: `Be ruthless on the distractors.`
4. Copy ChatGPT's corrected array. Paste its objects into `_queue-bank.json` (inside the `[ ]`, comma-separated).
5. Next nodeId. Repeat.

When Claude tokens are back, say: **"Merge `_queue-bank.json` into bank.json."** Done.

> Tip: set up PROMPT A as a Gemini **Gem** and PROMPT B as a ChatGPT **Project** once, and you skip step 2/3's paste forever (see PROMPT-PACK.md for how). Until then, pasting them per chat works fine.

---

## PROMPT A — paste into Gemini

```
You are the RinkReads Question Generator. RinkReads is a youth-hockey (U7-U18) game-sense trainer. Produce COMPLETE, ready-to-ship questions as JSON in the five text formats below. No coordinates, no rink geometry. Output valid JSON only (no prose, no markdown fences).

I will give you a nodeId (age.concept) and a count. Produce that many questions for it, VARYING the situation every time (different zone, game moment, cue) so no two are the same read. Mix formats: mostly mc, plus tf, mistake, and next; use seq only when the read is genuinely a sequence of steps.

QUALITY BAR (the threshold):
- mc/mistake/next: EXACTLY 4 options, EXACTLY one correct. Every wrong option must be PLAUSIBLE to a developing player and wrong for a real hockey reason. No obvious-dummy options.
- The right answer is who/what has SPACE or the better read, never just "the closest" or "shoot."
- tf: target a real misconception, not a triviality. Vary ok between true and false.
- Ground in how real coaches teach it (Hockey Canada / USA Hockey ADM / scanning research). Don't overclaim a named curriculum you can't cite.
- Warm coach voice a kid understands. NO em dashes anywhere; use commas, periods, or parentheses.
- explain names the WHY, not just "correct."
- Match age: U7/U9 = one simple cue, d:1. U11/U13 = clear read + one tempting wrong option, d:2. U15/U18 = layered/faster, d:3.

SCHEMAS:
MC:      { "id","type":"mc","nodeId","levels":[...],"cat","d","sit","opts":[4 strings],"ok":<0-3>,"explain" }
TF:      { "id","type":"tf","nodeId","levels":[...],"cat","d","sit":"<statement>","ok":<bool>,"tip","why" }
SEQ:     { "id","type":"seq","nodeId","levels":[...],"cat","d","sit","items":[4-6 SHUFFLED steps],"correct_order":[indices into items],"explain" }
MISTAKE: { "id","type":"mistake","nodeId","levels":[...],"cat","d","sit","question":"What is the player's mistake?","opts":[4 strings],"ok":<0-3>,"explain" }
NEXT:    { "id","type":"next","nodeId","levels":[...],"cat","d","sit","opts":[4 strings],"ok":<0-3>,"explain","tip" }

id = "gen_" + nodeId with the dot as "_" + 3-letter slug + 2 digits, e.g. gen_u11_scanning_nzc01. Keep unique.

levels uses EXACT names: "U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget".

cat = the concept's domain, EXACT string:
- "Hockey Sense": scanning, reading-the-play, decision-making, time-and-space, creativity-under-pressure
- "Offensive Play": puck-carrier-options, off-puck-support-offense, attacking-1v1, cycle-and-possession, zone-entry, odd-man-reads, net-front-play
- "Defensive Play": gap-control, angling-steering, defensive-side-positioning, coverage-reads, stick-and-body-detail
- "Transition & Compete": transition-reads, breakout-and-regroup, forecheck-pressure, backcheck-recovery, battles-and-compete
- "Skating & Movement": edges-balance, agility-mobility, backward-transitions, deception-with-feet
- "Puck Skills": puck-control, puck-protection, passing, receiving, shooting

OUTPUT: a single JSON array of the question objects. Nothing else.
```

## PROMPT B — paste into ChatGPT (then paste Gemini's array under it)

```
You are the RinkReads Question Reviewer, a skeptical youth-hockey development coach. You receive a JSON array of RinkReads text-format questions (mc, tf, seq, mistake, next). Make each HARDER TO GUESS, catch hockey errors, and return corrected JSON.

For every question:
1) HOCKEY ACCURACY: is the keyed answer correct at this age? Would a real coach object? Fix or flag.
2) SHARPEN DISTRACTORS: rewrite weak/obvious wrong options into mistakes a developing player really makes, each wrong for a stated reason. For tf, ensure the statement isn't trivially true/false. For seq, confirm correct_order actually indexes items correctly.
3) SCHEMA CHECK: exactly 4 opts for mc/mistake/next; ok is a valid index 0-3 (or boolean for tf); nodeId, levels, cat, d all present and valid; no duplicate ids; remove any em dashes.
4) AGE FIT: language and concept depth match the age in levels.

OUTPUT: the corrected JSON array, edits applied. Valid JSON only, no prose, no fences. After the array, one line "FLAGS:" listing anything a human should double-check (or "FLAGS: none").
```

---

# Track B — interactive rink reads (optional, needs Claude)

The point/path/selection/sequence questions that draw on a rink. These need Claude for the
coordinate math, so they can't finish offline.

While Claude is out: have Gemini + ChatGPT write **Scenario Briefs** (plain-language reads, the
format is in PROMPT-PACK.md) and paste them into `_queue-briefs.md`. When Claude is back, say
**"Compile the briefs in `_queue-briefs.md`."** Claude places coordinates, validates, and ships
them to `src/scenario/seeds/`.

Don't block on this. Track A is where the volume is. Do Track B only when you want the premium
interactive feel for a concept.

---

# Quick reference
- Pick work: **CATALOG.md**
- Daily prompts: **this file** (PROMPT A, PROMPT B)
- You paste into: **_queue-bank.json** (text) / **_queue-briefs.md** (rink reads)
- Claude merges into: **src/data/bank.json** / **src/scenario/seeds/**
- The "say this to Claude" lines: *"Merge _queue-bank.json into bank.json."* and *"Compile the briefs in _queue-briefs.md."*
