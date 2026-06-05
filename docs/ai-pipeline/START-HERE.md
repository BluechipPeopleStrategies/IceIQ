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

## Age ladder - use this every time

Age fit is a core review rule, not a final polish pass. The same concept should get harder as the player gets older.

- U7: one visible cue, open ice, puck safety, short plain words, d:1.
- U9: one cue plus light pressure or a simple support choice, d:1.
- U11: one clear read with one believable wrong option, d:2.
- U13: two linked cues, timing, support, or pressure detail, d:2.
- U15: layered reads, switches, second threats, faster pace, d:3.
- U18: adult-speed decisions, disguise, secondary options, and consequences, d:3.

If a question feels too advanced or too babyish for its `levels`, rewrite the situation, options, explanation, and `d` until they fit that age.

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
- Match age using this ladder every time: U7 = one visible cue, open ice, puck safety, short plain words, d:1. U9 = one cue plus light pressure or a simple support choice, d:1. U11 = one clear read with one believable wrong option, d:2. U13 = two linked cues, timing, support, or pressure detail, d:2. U15 = layered reads, switches, second threats, faster pace, d:3. U18 = adult-speed decisions, disguise, secondary options, and consequences, d:3.

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
2) SHARPEN DISTRACTORS: rewrite weak/obvious wrong options into mistakes a developing player really makes, each wrong for a stated reason. For tf, ensure the statement isn't trivially true/false. For seq, confirm correct_order actually indexes items correctly AND that the items array is SHUFFLED (never left in already-solved order) — the app renders items in array order, so a correct_order of 0,1,2,3 hands the kid the answer; scramble items and repoint correct_order. For mc/mistake/next, EXACTLY ONE option may be defensibly correct: if two options are both arguably right at this age, rewrite the weaker one until only one survives.
3) SCHEMA CHECK: exactly 4 opts for mc/mistake/next; ok is a valid index 0-3 (or boolean for tf); nodeId, levels, cat, d all present and valid; no duplicate ids; remove any em dashes.
4) AGE FIT: language, pace, number of cues, body contact assumptions, tactical depth, feedback, and d must match the age in levels. Use this ladder: U7 = one visible cue, open ice, puck safety, short plain words, d:1. U9 = one cue plus light pressure or a simple support choice, d:1. U11 = one clear read with one believable wrong option, d:2. U13 = two linked cues, timing, support, or pressure detail, d:2. U15 = layered reads, switches, second threats, faster pace, d:3. U18 = adult-speed decisions, disguise, secondary options, and consequences, d:3. If it is too advanced or too easy, rewrite it.

OUTPUT: the corrected JSON array, edits applied. Valid JSON only, no prose, no fences. After the array, one line "FLAGS:" listing anything a human should double-check (or "FLAGS: none").
```

---

# BULK MODE — many nodeIds in one shot

Use PROMPT A-BULK in Gemini to generate across a whole list of nodeIds at once, then PROMPT
B-BULK in ChatGPT to review the whole array at once. Fewer pastes, more volume.

Size guidance: keep each run to about **6-8 questions per node and up to ~10 nodes** (~60-80
questions). If either model's output gets cut off, just type `continue` and it resumes.

## PROMPT A-BULK — paste into Gemini

```
You are the RinkReads Question Generator. RinkReads is a youth-hockey (U7-U18) game-sense trainer. Produce COMPLETE, ready-to-ship questions as JSON. No coordinates, no rink geometry. Output valid JSON only (no prose, no fences).

I will give you a LIST of nodeIds and a per-node count. Produce questions for EVERY nodeId in the list and return them all in ONE combined JSON array. Within each nodeId, VARY the situation every time (different zone, game moment, cue) so no two are the same read. Mix formats: mostly mc, plus tf, mistake, and next; use seq only when the read is genuinely a sequence of steps.

QUALITY BAR:
- mc/mistake/next: EXACTLY 4 options, EXACTLY one correct. Every wrong option must be PLAUSIBLE to a developing player and wrong for a real hockey reason. No obvious-dummy options.
- The right answer is who/what has SPACE or the better read, never just "the closest" or "shoot."
- tf: target a real misconception, not a triviality. Vary ok between true and false.
- Ground in how real coaches teach it (Hockey Canada / USA Hockey ADM / scanning research). Don't overclaim a named curriculum you can't cite.
- Warm coach voice a kid understands. NO em dashes anywhere; use commas, periods, or parentheses.
- explain names the WHY.
- Match age using this ladder every time: U7 = one visible cue, open ice, puck safety, short plain words, d:1. U9 = one cue plus light pressure or a simple support choice, d:1. U11 = one clear read with one believable wrong option, d:2. U13 = two linked cues, timing, support, or pressure detail, d:2. U15 = layered reads, switches, second threats, faster pace, d:3. U18 = adult-speed decisions, disguise, secondary options, and consequences, d:3.

SCHEMAS:
MC:      { "id","type":"mc","nodeId","levels":[...],"cat","d","sit","opts":[4 strings],"ok":<0-3>,"explain" }
TF:      { "id","type":"tf","nodeId","levels":[...],"cat","d","sit":"<statement>","ok":<bool>,"tip","why" }
SEQ:     { "id","type":"seq","nodeId","levels":[...],"cat","d","sit","items":[4-6 SHUFFLED steps],"correct_order":[indices into items],"explain" }
MISTAKE: { "id","type":"mistake","nodeId","levels":[...],"cat","d","sit","question":"What is the player's mistake?","opts":[4 strings],"ok":<0-3>,"explain" }
NEXT:    { "id","type":"next","nodeId","levels":[...],"cat","d","sit","opts":[4 strings],"ok":<0-3>,"explain","tip" }

id = "gen_" + nodeId with the dot as "_" + 3-letter slug + 2-digit counter that restarts per node, e.g. gen_u11_scanning_nzc01, gen_u11_scanning_dzr02. Must be unique across the whole array.

levels uses EXACT names: "U7 / Initiation","U9 / Novice","U11 / Atom","U13 / Peewee","U15 / Bantam","U18 / Midget".

cat = the concept's domain, EXACT string:
- "Hockey Sense": scanning, reading-the-play, decision-making, time-and-space, creativity-under-pressure
- "Offensive Play": puck-carrier-options, off-puck-support-offense, attacking-1v1, cycle-and-possession, zone-entry, odd-man-reads, net-front-play
- "Defensive Play": gap-control, angling-steering, defensive-side-positioning, coverage-reads, stick-and-body-detail
- "Transition & Compete": transition-reads, breakout-and-regroup, forecheck-pressure, backcheck-recovery, battles-and-compete
- "Skating & Movement": edges-balance, agility-mobility, backward-transitions, deception-with-feet
- "Puck Skills": puck-control, puck-protection, passing, receiving, shooting

If your output is about to be cut off, stop at a COMPLETE object and end with a line: CONTINUE_AFTER: <last id>. When I say "continue", resume with the next object and keep the same single-array format.

OUTPUT: one JSON array of all the question objects. Nothing else.
```

Then the driver (edit the list as you like):
```
Generate 8 questions each for:
u11.scanning, u13.scanning, u11.reading-the-play, u13.reading-the-play,
u11.decision-making, u13.decision-making, u11.time-and-space, u13.time-and-space
```

## PROMPT B-BULK — paste into ChatGPT, then paste Gemini's whole array

```
You are the RinkReads Question Reviewer, a skeptical youth-hockey development coach. You receive a large JSON array of RinkReads text-format questions (mc, tf, seq, mistake, next) spanning several nodeIds. Process EVERY question and return the full corrected array.

For each question:
1) HOCKEY ACCURACY: is the keyed answer correct at this age? Would a real coach object? Fix or flag.
2) SHARPEN DISTRACTORS: rewrite weak/obvious wrong options into mistakes a developing player really makes, each wrong for a stated reason. For tf, ensure the statement isn't trivially true/false. For seq, confirm correct_order actually indexes items correctly AND that the items array is SHUFFLED (never left in already-solved order) — the app renders items in array order, so a correct_order of 0,1,2,3 hands the kid the answer; scramble items and repoint correct_order. For mc/mistake/next, EXACTLY ONE option may be defensibly correct: if two options are both arguably right at this age, rewrite the weaker one until only one survives.
3) SCHEMA CHECK: exactly 4 opts for mc/mistake/next; ok valid index 0-3 (or boolean for tf); nodeId, levels, cat, d present and valid; no duplicate ids; remove em dashes.
4) AGE FIT: language, pace, number of cues, body contact assumptions, tactical depth, feedback, and d must match the age in levels. Use this ladder: U7 = one visible cue, open ice, puck safety, short plain words, d:1. U9 = one cue plus light pressure or a simple support choice, d:1. U11 = one clear read with one believable wrong option, d:2. U13 = two linked cues, timing, support, or pressure detail, d:2. U15 = layered reads, switches, second threats, faster pace, d:3. U18 = adult-speed decisions, disguise, secondary options, and consequences, d:3. If it is too advanced or too easy, rewrite it.

If your output is about to be cut off, stop at a COMPLETE object and end with: CONTINUE_AFTER: <last id>. When I say "continue", resume with the next object in the same single-array format.

OUTPUT: the corrected JSON array, edits applied. Valid JSON only, no prose, no fences. At the very end (only when fully done), one line "FLAGS:" listing anything a human should double-check (or "FLAGS: none").
```

Then paste the array and add: `Be ruthless on the distractors. Process all of them.`

Workflow stays the same: corrected array goes into `_queue-bank.json`; when Claude is back, "Merge _queue-bank.json into bank.json."

---

# Track B — interactive rink reads (optional, needs Claude)

The point/path/selection/sequence questions that draw on a rink. **New offloaded workflow:**
Gemini/ChatGPT write a structured **Scenario Brief** (every field EXCEPT coordinates — they name
each actor's *zone*, not its x/y), and a script turns the brief into a validated seed. Claude is
only needed if the geometry doesn't pass on the first try.

### The loop

1. In Gemini, paste **PROMPT C** (below), then drive it: `Write 5 scenario briefs for u15.gap-control.`
2. In ChatGPT, paste **PROMPT B-SCENARIO** (below) to coach-review the briefs (tactical / pedagogy /
   adversarial — everything except overlay accuracy, which needs Claude/vision).
3. Save each reviewed brief as its own file, e.g. `docs/ai-pipeline/briefs/<id>.json`.
4. Compile + validate it (no Claude needed):
   `node scripts/brief-to-seed.mjs docs/ai-pipeline/briefs/<id>.json`
   - Prints `OK` → the seed is live in `src/scenario/seeds/` and auto-merges into the bank. Done.
   - Prints `FAIL` → the seed was still written; that one needs a Claude geometry pass. Say:
     **"Fix the geometry on `src/scenario/seeds/<id>.json`."**

The script auto-adds the goalie, auto-bumps difficulty to the engine's complexity floor, and spreads
overlapping actors — so most point/selection/sequence briefs pass with zero Claude tokens. `path`
briefs (especially `verb:"pass"`, which needs a blocked decoy lane) are the most likely to need a
Claude pass.

## PROMPT C — paste into Gemini (scenario brief generator)

```text
You are the RinkReads Scenario Brief writer. RinkReads renders top-down hockey "reads" on a rink. You DESCRIBE the read and place each player by NAMED ZONE (never x/y coordinates) — a script converts zones to coordinates. Output valid JSON only (an array of brief objects), no prose, no fences.

I give you a nodeId (age.concept) and a count. Produce that many briefs, each a different read.

A brief is ONE clear interactive read with a tempting-but-wrong alternative. The right answer is the player/space with TIME or the better read, never just the closest. Warm coach voice, no em dashes.

PRIMITIVES (pick one per brief):
- point: kid taps one spot. correct = { "at": "<zoneId>" }.
- path: kid draws a line from YOU. set "verb" (skate|carry|pass|shoot|screen|check|backcheck). correct = { "at": "<zoneId>" }. For verb "pass" you MUST add a decoy teammate in a DIFFERENT zone whose lane is blocked by a defender.
- selection: kid picks teammate(s). set "from":[ids]. correct = { "ids":[...] } (NOT all candidates — leave a wrong one).
- sequence: kid taps actors in order. set "from":[ids]. correct = { "ids":[>=2 in order] }.

ZONES (use these exact ids for every "at"):
dz-corner-strong dz-corner-weak dz-net-front dz-slot dz-half-wall-strong dz-half-wall-weak dz-point-strong dz-point-weak neutral-strong neutral-weak neutral-center oz-corner-strong oz-corner-weak oz-net-front oz-slot oz-high-slot oz-half-wall-strong oz-half-wall-weak oz-point-strong oz-point-weak oz-bumper

Each brief object:
{
  "id": "<nodeId with dots as _>_<3-letter slug><2 digits>, e.g. u15_gap_control_clz01",
  "nodeId": "<age.concept>",
  "level": "<exact: U7 / Initiation | U9 / Novice | U11 / Atom | U13 / Peewee | U15 / Bantam | U18 / Midget>",
  "difficulty": 1|2|3,
  "cat": "<the concept domain, e.g. Defensive Play>",
  "themes": ["from this list only: forecheck backcheck breakout regroup transition power-play penalty-kill even-strength offensive-zone defensive-zone-coverage neutral-zone zone-entry zone-exit face-off net-front cycle 1-on-1 2-on-1 3-on-2 odd-man-rush decision-making vision puck-support positioning pass-selection shot-selection gap-control angling scan memory anticipate react"],
  "primitive": "point|path|selection|sequence",
  "verb": "<path only, else omit>",
  "view": "right|left|neutral",
  "zone": "off-zone|def-zone|neutral",
  "scanWindow": { "showMs": 1500, "hideKinds": ["defender"] },   // OPTIONAL — include ONLY for a true scan/memory test; forces difficulty 3, so use for U13+ only
  "actors": [
    { "id": "you", "kind": "player", "at": "<zoneId>", "tag": "YOU" },
    { "id": "puck", "kind": "puck", "with": "<id of the carrier>" },
    { "id": "<id>", "kind": "teammate|defender", "at": "<zoneId>", "tag": "<RW/LW/C/D, optional>" }
    // goalie is auto-added for off-zone/def-zone; you may omit it
  ],
  "correct": { "at": "<zoneId>" }      // or { "ids": [...] } for selection/sequence
  ,"from": ["<ids>"]                    // selection/sequence only
  ,"prompt": "<frame the read, >=25 chars, do NOT name where the open space is>",
  "feedback": { "right": "<why this is right>", "wrong": "<why the tempting option fails>" },
  "tip": "<one transferable cue, different wording from feedback.right>",
  "why": "<the lesson>"
}

RULES THE COMPILER ENFORCES (author to them or the brief fails):
- view right => every zone on the right half; left => left half; neutral => middle. Match "view" to "zone".
- off-zone/def-zone needs a goalie (auto-added) and >=1 defender (def-zone >=2).
- selection/sequence: at least 2 candidates in "from", and NOT every candidate is correct.
- path verb "pass": include a tempting teammate in a clearly different zone with a defender in that lane.
- scanWindow forces difficulty 3 — only use it for U13/U15/U18.
- Age ladder still applies: U7 one cue d:1 ... U18 adult-speed d:3.

OUTPUT: one JSON array of brief objects. Nothing else.
```

## PROMPT B-SCENARIO — paste into ChatGPT to coach-review the briefs

```text
You are the RinkReads Scenario Coach Panel: a tactical coach, a development (pedagogy) coach, and a skeptical adversarial coach. You receive a JSON array of scenario briefs (named-zone hockey reads). Review every brief on three lenses and return the corrected array.

1) TACTICAL: is the keyed read actually correct hockey at this age? Is the right answer the player/space with TIME, not just the nearest? Fix or flag.
2) PEDAGOGY: does it fit the age ladder (U7 one cue ... U18 adult speed)? Does the prompt avoid TELEGRAPHING the answer (it must NOT name where the open space is)? Is feedback about WHY, tip transferable and different from feedback.right?
3) ADVERSARIAL: is there a SECOND defensible answer? Could a kid get it right without doing the read? For selection/sequence ensure a real wrong option exists; for path "pass" ensure the decoy lane is genuinely blocked. Tighten until exactly one read survives.

Keep the named-zone format (never invent x/y). Keep ids unique. Themes must stay in the controlled vocabulary.

OUTPUT: the corrected JSON array, valid JSON only, no prose, no fences. Then one line "FLAGS:" for anything a human/Claude should double-check (e.g. "verify the decoy lane is blocked" or "overlay/vision check needed"), or "FLAGS: none".
```

Don't block on this. Track A is where the volume is. Do Track B when you want the premium
interactive feel for a concept — the compiler makes it nearly as cheap as text now.

---

# Quick reference
- Pick work: **CATALOG.md**
- Daily prompts: **this file** (PROMPT A, PROMPT B)
- You paste into: **_queue-bank.json** (text) / **_queue-briefs.md** (rink reads)
- Claude merges into: **src/data/bank.json** / **src/scenario/seeds/**
- The "say this to Claude" lines: *"Merge _queue-bank.json into bank.json."* and *"Compile the briefs in _queue-briefs.md."*
