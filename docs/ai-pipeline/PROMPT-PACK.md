# RinkReads AI Content Pipeline — Prompt Pack

> ## Color key
>
> **The body text itself is colored** so you can tell at a glance, mid-page, without scrolling back here:
>
> - <span style="color:#eab308">🟡 **YELLOW text = READ ONLY.** For you. Never paste it anywhere.</span>
> - <span style="color:#22c55e">🟢 **GREEN text = COPY INTO GEMINI.**</span>
> - <span style="color:#5BA4E8">🔵 **BLUE text = COPY INTO CHATGPT.**</span>
> - <span style="color:#c084fc">🟣 **PURPLE text = SAY TO CLAUDE / run a command.**</span>
>
> Each big ``` box ``` directly under a 🟢 or 🔵 line is the thing to copy — **copy the whole box.**
> <span style="color:#eab308">If anything here disagrees with `START-HERE.md`, START-HERE wins.</span>

---

## <span style="color:#eab308">🟡 How the pipeline works (read only)</span>

<span style="color:#eab308">Three tools, three jobs, two tracks.</span>

- <span style="color:#eab308">**Gemini** = Generator (writes the questions/briefs).</span>
- <span style="color:#eab308">**ChatGPT** = Reviewer (sharpens distractors, catches hockey errors).</span>
- <span style="color:#eab308">**Claude Code** = Compiler/merge (geometry coords + loading the bank).</span>

<span style="color:#eab308">**TRACK A — Text questions:** 90% of the work. Gemini → ChatGPT → queue file. No Claude until a one-line merge. **TRACK B — Geometry (rink) questions:** Gemini → ChatGPT → a script compiles the brief. Claude only if the geometry fails to validate.</span>

## <span style="color:#eab308">🟡 Where files live (read only)</span>

<span style="color:#eab308">**You only ever touch the `_queue-*` files.** Never hand-edit `bank.json` or `seeds/` — let the merge/validator gate them.</span>

- <span style="color:#eab308">Text-question queue → `docs/ai-pipeline/_queue-bank.json` (you paste ChatGPT's corrected arrays here).</span>
- <span style="color:#eab308">Live text bank → `src/data/bank.json` (Claude writes, on merge).</span>
- <span style="color:#eab308">Geometry briefs → `docs/ai-pipeline/briefs/<id>.json` (you paste reviewed briefs, one file each).</span>
- <span style="color:#eab308">Live geometry seeds → `src/scenario/seeds/<id>.json` (the compiler script writes).</span>

---

# TRACK A — TEXT QUESTIONS (the main content engine)

<span style="color:#eab308">🟡 This is what you run to **add more content**. Two copies per batch: one into Gemini, one into ChatGPT.</span>

## <span style="color:#22c55e">🟢 STEP 1 — copy the whole box below into GEMINI</span>

```text
You are the RinkReads Question Generator. RinkReads is a youth-hockey (U7-U18) game-sense trainer. Produce COMPLETE, ready-to-ship questions as JSON in the five text formats below. No coordinates, no rink geometry. Output valid JSON only (no prose, no markdown fences).

I will give you a nodeId (age.concept) and a count. Produce that many questions for it, VARYING the situation every time (different zone, game moment, cue) so no two are the same read. Mix formats: mostly mc, plus tf, mistake, and next; use seq only when the read is genuinely a sequence of steps.

QUALITY BAR:
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

<span style="color:#22c55e">🟢 Then type your driver line into Gemini, e.g.</span> `Generate 10 questions for u11.scanning.`

## <span style="color:#5BA4E8">🔵 STEP 2 — copy the whole box below into CHATGPT, then paste Gemini's array under it</span>

```text
You are the RinkReads Question Reviewer, a skeptical youth-hockey development coach. You receive a JSON array of RinkReads text-format questions (mc, tf, seq, mistake, next). Make each HARDER TO GUESS, catch hockey errors, and return corrected JSON.

For every question:
1) HOCKEY ACCURACY: is the keyed answer correct at this age? Would a real coach object? Fix or flag.
2) SHARPEN DISTRACTORS: rewrite weak/obvious wrong options into mistakes a developing player really makes, each wrong for a stated reason. For tf, ensure the statement isn't trivially true/false. For seq, confirm correct_order actually indexes items correctly AND that the items array is SHUFFLED (never left in already-solved order) — the app renders items in array order, so a correct_order of 0,1,2,3 hands the kid the answer; scramble items and repoint correct_order. For mc/mistake/next, EXACTLY ONE option may be defensibly correct: if two options are both arguably right at this age, rewrite the weaker one until only one survives.
3) SCHEMA CHECK: exactly 4 opts for mc/mistake/next; ok is a valid index 0-3 (or boolean for tf); nodeId, levels, cat, d all present and valid; no duplicate ids; remove any em dashes.
4) AGE FIT: language, pace, number of cues, body contact assumptions, tactical depth, feedback, and d must match the age in levels. Use this ladder: U7 = one visible cue, open ice, puck safety, short plain words, d:1. U9 = one cue plus light pressure or a simple support choice, d:1. U11 = one clear read with one believable wrong option, d:2. U13 = two linked cues, timing, support, or pressure detail, d:2. U15 = layered reads, switches, second threats, faster pace, d:3. U18 = adult-speed decisions, disguise, secondary options, and consequences, d:3. If it is too advanced or too easy, rewrite it.

OUTPUT: the corrected JSON array, edits applied. Valid JSON only, no prose, no fences. After the array, one line "FLAGS:" listing anything a human should double-check (or "FLAGS: none").
```

<span style="color:#5BA4E8">🔵 Then add under the pasted array:</span> `Be ruthless on the distractors.`

## <span style="color:#eab308">🟡 STEP 3 — bank it (read only, no copying)</span>

<span style="color:#eab308">1. Paste ChatGPT's corrected array into `docs/ai-pipeline/_queue-bank.json` (inside the `[ ]`, comma-separated).<br>2. Repeat across nodeIds. Build up a queue while Claude is capped.<br>3. When Claude is back,</span> <span style="color:#c084fc">🟣 say to Claude:</span> `Merge _queue-bank.json into bank.json.`

> <span style="color:#eab308">🟡 Filling many nodeIds at once? Bulk versions of both prompts are in **START-HERE.md** (PROMPT A-BULK / B-BULK), and paste-ready driver lists for every empty age group are in **COVERAGE-GAPS.md**.</span>

---

# TRACK B — GEOMETRY QUESTIONS (interactive rink reads)

## <span style="color:#eab308">🟡 How it works now (read only)</span>

<span style="color:#eab308">The brief is **JSON with named zones** (e.g. `"at": "oz-slot"`), never x/y coordinates. A script turns it into a validated rink scenario, so **Claude is only needed if the geometry fails to validate.** The two geometry prompts live in **START-HERE.md** (they're long and tied to the compiler, so they have a single home there to avoid drift).</span>

## <span style="color:#22c55e">🟢</span>/<span style="color:#5BA4E8">🔵</span> <span style="color:#eab308">STEP 1 + 2 — generate, then review</span>

- <span style="color:#22c55e">🟢 Copy **PROMPT C** from START-HERE.md into Gemini,</span> <span style="color:#eab308">then drive it:</span> `Write 5 scenario briefs for u15.gap-control.`
- <span style="color:#5BA4E8">🔵 Copy **PROMPT B-SCENARIO** from START-HERE.md into ChatGPT,</span> <span style="color:#eab308">paste the briefs, send.</span>

## <span style="color:#c084fc">🟣 STEP 3 — compile (you run this, not a chat tool)</span>

<span style="color:#eab308">Save each reviewed brief as `docs/ai-pipeline/briefs/<id>.json`, then run:</span>

```text
node scripts/brief-to-seed.mjs docs/ai-pipeline/briefs/<id>.json
```

- <span style="color:#eab308">Prints `OK` → the seed is live in `src/scenario/seeds/` and auto-merges. Done, zero Claude.</span>
- <span style="color:#eab308">Prints `FAIL` →</span> <span style="color:#c084fc">🟣 say to Claude:</span> `Fix the geometry on src/scenario/seeds/<id>.json.`

---

# TRACK C — IMAGE QUESTIONS (photo / annotated reads)

## <span style="color:#eab308">🟡 How it works now — DATA-DRIVEN, no LLM draws players (read only)</span>

<span style="color:#eab308">An LLM hand-drawing players makes rotated 3D figurines that no coach would put on a board. So **nothing draws the players anymore.** Gemini outputs the players' **positions** (by named zone) plus the read; a deterministic renderer (`scripts/board-svg.mjs`) makes a clean **top-down coach's-board** SVG every time — flat dots, a pad goalie, the read as a gold arrow. ChatGPT only reviews the **text**. Always legit, always consistent.</span>

<span style="color:#eab308">Always reference players by **role and color** (gold = your team, white = the other team), **never jersey numbers**. The read must be makeable from ONE still board.</span>

## <span style="color:#22c55e">🟢 STEP 1 · PROMPT D — copy the whole box below into GEMINI (board-spec writer)</span>

```text
You are the RinkReads Image Question writer. RinkReads shows a kid a TOP-DOWN board diagram and asks them to pick the right READ; an arrow/ring marks the answer. You do NOT draw anything — you PLACE players by NAMED ZONE and a script renders a clean coach's board. Never use pixel coordinates or jersey numbers; refer to players by role and color. Output valid JSON only (an array of brief objects), no prose, no fences.

I give you a nodeId (age.concept) and a count. Produce that many briefs, each a DIFFERENT read makeable from one still board. The right answer is who/what has SPACE or the better read, never the closest. Warm coach voice, no em dashes.

ZONES (use these exact ids for every "at"):
dz-corner-strong dz-corner-weak dz-net-front dz-slot dz-half-wall-strong dz-half-wall-weak dz-point-strong dz-point-weak neutral-strong neutral-weak neutral-center oz-corner-strong oz-corner-weak oz-net-front oz-slot oz-high-slot oz-half-wall-strong oz-half-wall-weak oz-point-strong oz-point-weak oz-bumper

Each brief object:
{
  "id": "img_<nodeId with dots as _>_<2 digits>",
  "nodeId": "<age.concept>",
  "level": "<exact: U7 / Initiation | U9 / Novice | U11 / Atom | U13 / Peewee | U15 / Bantam | U18 / Midget>",
  "cat": "<the concept domain, e.g. Hockey Sense>",
  "d": 1|2|3,
  "board": {
    "nets": ["left"],                       // or "right" — which end has the attacked net; lay the play out HORIZONTALLY
    "actors": [
      { "id": "you", "kind": "home", "at": "<zone>", "tag": "C", "hasPuck": true },
      { "id": "rw",  "kind": "home", "at": "<zone>", "tag": "RW" },
      { "id": "x1",  "kind": "opp",  "at": "<zone>" },
      { "id": "g",   "kind": "goalie", "at": "<zone in the crease>" }
    ],
    "read": { "from": "you", "to": "<actorId or zoneId of the correct answer>", "ringOn": "<actorId, optional — an open teammate to ring>" }
  },
  "alt": "<one-line description of the board, for accessibility>",
  "sit": "<question stem; frames the read, role/color, >=20 chars, does NOT state the answer>",
  "opts": ["<4 options, role/color-based; EXACTLY one correct; each wrong for a real hockey reason>"],
  "ok": <0-3>,
  "explain": "<why the right answer is right>"
}

kind: "home" (your team), "opp" (other team), "goalie". Exactly one actor has hasPuck:true.
"read" is the answer the overlay draws: an arrow from the carrier to the correct target, plus an optional ring on an open teammate. Make board.read.to match the keyed correct option.
Age ladder: U7 one cue d1; U9 one cue + light pressure d1; U11 one clear read d2; U13 two cues d2; U15 layered d3; U18 adult-speed d3.

OUTPUT: one JSON array of brief objects. Nothing else.
```

<span style="color:#22c55e">🟢 Then drive it, e.g.</span> `Write 4 board briefs for u13.odd-man-reads.`

## <span style="color:#5BA4E8">🔵 STEP 2 · PROMPT E — copy the whole box below into CHATGPT (review the TEXT only)</span>

```text
You are the RinkReads Image Question Reviewer, a skeptical youth-hockey coach. You receive a JSON array of board briefs (each has a top-down board spec + MC text). A script renders the diagram from the board data — you do NOT draw anything. Review the text and the read, return corrected JSON.

For each brief:
1) FROZEN-FRAME TEST: can the read be made from one still board? Reject anything needing motion.
2) HOCKEY ACCURACY: is the keyed answer correct at this age? Would a coach object? Fix or flag.
3) SHARPEN DISTRACTORS: each wrong option is a real mistake a developing player makes, wrong for a stated reason; EXACTLY one defensible answer.
4) ROLE NOT NUMBER: every reference is by role/color, never a number.
5) READ POINTS AT THE ANSWER: confirm board.read.to is the keyed correct option (and ringOn, if present, marks an open target).

OUTPUT: the corrected JSON array, edits applied. Valid JSON only, no prose, no fences. Then one line "FLAGS:" for anything to double-check (or "FLAGS: none").
```

## <span style="color:#c084fc">🟣 STEP 3 — render + ship (you run this; no LLM draws anything)</span>

<span style="color:#eab308">Save each reviewed brief as its own file (e.g. `docs/ai-pipeline/briefs/<id>.json`), then run:</span>

```text
node scripts/brief-to-image.mjs docs/ai-pipeline/briefs/<id>.json
```

<span style="color:#eab308">That renders a clean top-down board SVG into `public/assets/images/<id>.svg` AND writes the bank MC entry (`media` + the read overlays auto-placed on the players — no hand-reading coordinates). Then merge the entries into `bank.json` (or</span> <span style="color:#c084fc">🟣 say to Claude:</span> `merge the image entries into the bank`<span style="color:#eab308">). The board is deterministic, so it is coach-legit every time — open `public/assets/images/board-style-demo.svg` to see the house style.</span>

---

## <span style="color:#eab308">🟡 Reference — age ladder (read only; already baked into the prompts)</span>

<span style="color:#eab308">- **U7:** one visible cue, open ice, puck safety, short plain words, `d:1`.<br>- **U9:** one cue plus light pressure or a simple support choice, `d:1`.<br>- **U11:** one clear read with one believable wrong option, `d:2`.<br>- **U13:** two linked cues, timing, support, or pressure detail, `d:2`.<br>- **U15:** layered reads, switches, second threats, faster pace, `d:3`.<br>- **U18:** adult-speed decisions, disguise, secondary options, consequences, `d:3`.</span>

## <span style="color:#eab308">🟡 Reference — valid nodeIds (read only; use the exact string)</span>

<span style="color:#eab308">`nodeId` = `u<age>.<concept-id>`. Hockey Sense is the anchor domain — prioritize it.</span>

<span style="color:#eab308">**Hockey Sense:** `scanning` `reading-the-play` `decision-making` `time-and-space` `creativity-under-pressure`<br>**Offensive Play:** `puck-carrier-options` `off-puck-support-offense` `attacking-1v1` `cycle-and-possession` `zone-entry` `odd-man-reads` `net-front-play`<br>**Defensive Play:** `gap-control` `angling-steering` `defensive-side-positioning` `coverage-reads` `stick-and-body-detail`<br>**Transition & Compete:** `transition-reads` `breakout-and-regroup` `forecheck-pressure` `backcheck-recovery` `battles-and-compete`<br>**Skating & Movement:** `edges-balance` `agility-mobility` `backward-transitions` `deception-with-feet`<br>**Puck Skills:** `puck-control` `puck-protection` `passing` `receiving` `shooting`</span>

<span style="color:#eab308">Combine with an age prefix → `u11.scanning`, `u15.gap-control`. Not every concept exists at every age (U7 is skills + battles only). The current empty-node list lives in **COVERAGE-GAPS.md**.</span>
