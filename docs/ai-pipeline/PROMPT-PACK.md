# RinkReads AI Content Pipeline — Prompt Pack

> ## Color key (this is the whole point of this file)
>
> - 🟡 **YELLOW = READ ONLY.** Background and rules *for you*. **Never paste these anywhere.**
> - 🟢 **GREEN = COPY INTO GEMINI.** The generator prompt + the line you type to drive it.
> - 🔵 **BLUE = COPY INTO CHATGPT.** The reviewer prompt.
> - 🟣 **PURPLE = SAY TO CLAUDE / run a command.** The compile + merge triggers.
>
> Rule of thumb: **if it's inside a 🟢 or 🔵 box, it's meant to be copied whole.** Everything
> else is yellow — for your eyes only. The green/blue prompts are self-contained: copy the
> *entire* box, nothing else needs to be assembled.
>
> If a prompt here ever disagrees with `START-HERE.md`, **START-HERE wins** (it's the runbook).

---

## 🟡 How the pipeline works (read only)

Three tools, three jobs. Two tracks.

| Tool | Job |
|------|-----|
| **Gemini** (Gem or chat) | **Generator** — writes the questions/briefs |
| **ChatGPT** (Project or chat) | **Reviewer** — sharpens distractors, catches hockey errors |
| **Claude Code** | **Compiler/merge** — only for geometry coords + loading the bank |

- **TRACK A — Text questions:** 90% of the work. Gemini → ChatGPT → queue file. **No Claude needed**
  until a one-line merge.
- **TRACK B — Geometry (rink) questions:** Gemini → ChatGPT → a script compiles the brief into a
  validated rink scenario. Claude only steps in if the geometry fails to validate.

## 🟡 Where files live (read only)

**You only ever touch the `_queue-*` files.** Never hand-edit `bank.json` or `seeds/` — let the merge/validator gate them.

| File | Path | Who writes it |
|------|------|---------------|
| Text-question queue | `docs/ai-pipeline/_queue-bank.json` | **you** (paste ChatGPT's corrected arrays) |
| Live text bank | `src/data/bank.json` | Claude, on merge |
| Geometry briefs | `docs/ai-pipeline/briefs/<id>.json` | **you** (paste reviewed briefs, one file each) |
| Live geometry seeds | `src/scenario/seeds/<id>.json` | the compiler script |

---

# TRACK A — TEXT QUESTIONS (the main content engine)

This is what you run to **add more content**. Two copies per batch: one into Gemini, one into ChatGPT.

## 🟢 STEP 1 — copy this whole box into GEMINI

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

🟢 **Then type your driver line** (also into Gemini), e.g.:

```text
Generate 10 questions for u11.scanning.
```

## 🔵 STEP 2 — copy this whole box into CHATGPT, then paste Gemini's array under it

```text
You are the RinkReads Question Reviewer, a skeptical youth-hockey development coach. You receive a JSON array of RinkReads text-format questions (mc, tf, seq, mistake, next). Make each HARDER TO GUESS, catch hockey errors, and return corrected JSON.

For every question:
1) HOCKEY ACCURACY: is the keyed answer correct at this age? Would a real coach object? Fix or flag.
2) SHARPEN DISTRACTORS: rewrite weak/obvious wrong options into mistakes a developing player really makes, each wrong for a stated reason. For tf, ensure the statement isn't trivially true/false. For seq, confirm correct_order actually indexes items correctly AND that the items array is SHUFFLED (never left in already-solved order) — the app renders items in array order, so a correct_order of 0,1,2,3 hands the kid the answer; scramble items and repoint correct_order. For mc/mistake/next, EXACTLY ONE option may be defensibly correct: if two options are both arguably right at this age, rewrite the weaker one until only one survives.
3) SCHEMA CHECK: exactly 4 opts for mc/mistake/next; ok is a valid index 0-3 (or boolean for tf); nodeId, levels, cat, d all present and valid; no duplicate ids; remove any em dashes.
4) AGE FIT: language, pace, number of cues, body contact assumptions, tactical depth, feedback, and d must match the age in levels. Use this ladder: U7 = one visible cue, open ice, puck safety, short plain words, d:1. U9 = one cue plus light pressure or a simple support choice, d:1. U11 = one clear read with one believable wrong option, d:2. U13 = two linked cues, timing, support, or pressure detail, d:2. U15 = layered reads, switches, second threats, faster pace, d:3. U18 = adult-speed decisions, disguise, secondary options, and consequences, d:3. If it is too advanced or too easy, rewrite it.

OUTPUT: the corrected JSON array, edits applied. Valid JSON only, no prose, no fences. After the array, one line "FLAGS:" listing anything a human should double-check (or "FLAGS: none").
```

🔵 **Then add** (under the pasted array): `Be ruthless on the distractors.`

## 🟡 STEP 3 — bank it (read only — no copying)

1. Paste ChatGPT's corrected array into `docs/ai-pipeline/_queue-bank.json` (inside the `[ ]`, comma-separated).
2. Repeat across nodeIds. Build up a big queue while Claude is capped.
3. 🟣 **When Claude is back, say:** `Merge _queue-bank.json into bank.json.`

> 🟡 Want to fill many nodeIds at once? There are bulk versions of both prompts in **START-HERE.md**
> (PROMPT A-BULK / B-BULK) plus paste-ready driver lists for every empty age group in **COVERAGE-GAPS.md**.

---

# TRACK B — GEOMETRY QUESTIONS (interactive rink reads)

## 🟡 How it works now (read only)

The brief is **JSON with named zones** (e.g. `"at": "oz-slot"`), never x/y coordinates. A script turns
it into a validated rink scenario, so **Claude is only needed if the geometry fails to validate.**

The two geometry prompts (🟢 PROMPT C for Gemini, 🔵 PROMPT B-SCENARIO for ChatGPT) live in
**START-HERE.md** — they're long and tied to the compiler, so they have a single home there to avoid drift.

## 🟢🔵 STEP 1 + 2 — generate + review

- 🟢 Copy **PROMPT C** from START-HERE.md into Gemini, then drive it: `Write 5 scenario briefs for u15.gap-control.`
- 🔵 Copy **PROMPT B-SCENARIO** from START-HERE.md into ChatGPT, paste the briefs, send.

## 🟣 STEP 3 — compile (you run this, not a chat tool)

Save each reviewed brief as `docs/ai-pipeline/briefs/<id>.json`, then run:

```text
node scripts/brief-to-seed.mjs docs/ai-pipeline/briefs/<id>.json
```

- Prints `OK` → the seed is live in `src/scenario/seeds/` and auto-merges into the bank. Done, zero Claude.
- Prints `FAIL` → 🟣 say to Claude: `Fix the geometry on src/scenario/seeds/<id>.json.`

---

## 🟡 Reference — age ladder (read only; already baked into the prompts above)

Age fit is a core rule, not a polish pass. The same concept gets harder as the player ages.

- **U7:** one visible cue, open ice, puck safety, short plain words, `d:1`.
- **U9:** one cue plus light pressure or a simple support choice, `d:1`.
- **U11:** one clear read with one believable wrong option, `d:2`.
- **U13:** two linked cues, timing, support, or pressure detail, `d:2`.
- **U15:** layered reads, switches, second threats, faster pace, `d:3`.
- **U18:** adult-speed decisions, disguise, secondary options, consequences, `d:3`.

## 🟡 Reference — valid nodeIds (read only; use the exact string)

`nodeId` = `u<age>.<concept-id>`. Hockey Sense is the anchor domain — prioritize it.

**Hockey Sense:** `scanning` `reading-the-play` `decision-making` `time-and-space` `creativity-under-pressure`
**Offensive Play:** `puck-carrier-options` `off-puck-support-offense` `attacking-1v1` `cycle-and-possession` `zone-entry` `odd-man-reads` `net-front-play`
**Defensive Play:** `gap-control` `angling-steering` `defensive-side-positioning` `coverage-reads` `stick-and-body-detail`
**Transition & Compete:** `transition-reads` `breakout-and-regroup` `forecheck-pressure` `backcheck-recovery` `battles-and-compete`
**Skating & Movement:** `edges-balance` `agility-mobility` `backward-transitions` `deception-with-feet`
**Puck Skills:** `puck-control` `puck-protection` `passing` `receiving` `shooting`

Combine with an age prefix → `u11.scanning`, `u15.gap-control`, etc. Not every concept exists at every age
(U7 is skills + battles only). If unsure, leave it as `u<age>.<concept>` and Claude confirms against the
ledger on merge. **The current empty-node list lives in `COVERAGE-GAPS.md`.**
