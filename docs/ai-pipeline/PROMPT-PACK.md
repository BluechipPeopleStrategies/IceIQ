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

## <span style="color:#eab308">🟡 The honest split (read only)</span>

<span style="color:#eab308">Gemini and ChatGPT **cannot see an image**, so they cannot place overlays or verify a read against a real frame — that is Claude-vision's job. What they CAN pre-build: the **scene to create** and the **question text** authored to that intended scene. ChatGPT can also **generate the image** from the spec. The read is carried by **overlays** (arrow = the play, ring = open target, dim = covered option) that Claude places on the actual image, so the art only has to be roughly right.</span>

<span style="color:#eab308">Always reference players by **role and color** ("the gold puck carrier", "the weak-side winger"), **never jersey numbers** — numbers change between images. The read must be makeable from ONE frozen frame (no motion, no sequence).</span>

## <span style="color:#22c55e">🟢 STEP 1 — copy the whole box below into GEMINI (image-question brief writer)</span>

```text
You are the RinkReads Image Question Brief writer. RinkReads shows a kid a hockey IMAGE and asks them to pick the right READ; an overlay (arrow/ring) later marks the answer on the picture. You DESCRIBE the image to create and author the question text for it. You NEVER see the final image, NEVER use pixel coordinates, and NEVER use jersey numbers — refer to players by role and color only. Output valid JSON only (an array of brief objects), no prose, no fences.

I give you a nodeId (age.concept) and a count. Produce that many image-question briefs, each a DIFFERENT read.

Each brief teaches ONE clear read with a tempting-but-wrong option. The right answer is who/what has SPACE or the better read, never the closest. The read must be makeable from a SINGLE still frame. Warm coach voice, no em dashes.

Each brief object:
{
  "id": "img_<nodeId with dots as _>_<2 digits>, e.g. img_u13_odd-man-reads_01",
  "nodeId": "<age.concept>",
  "level": "<exact: U7 / Initiation | U9 / Novice | U11 / Atom | U13 / Peewee | U15 / Bantam | U18 / Midget>",
  "type": "mc",
  "cat": "<the concept domain, e.g. Hockey Sense>",
  "d": 1|2|3,
  "image_spec": "<the exact scene to create: camera angle (top-down or broadcast), which team ATTACKS (gold) and DEFENDS (white), where the puck is, the player layout, goalie + net if it is a zone read, and — critically — the ONE read that must be clearly VISIBLE in the frame. Teams distinguished by COLOR, no numbers needed.>",
  "sit": "<question stem shown to the player; frames the read, references roles/colors, >=20 chars, does NOT state the answer>",
  "opts": ["<4 options, role/color-based; EXACTLY one correct; each wrong one plausible and wrong for a real hockey reason>"],
  "ok": <0-3>,
  "explain": "<why the right answer is right; never claim anything a single frozen frame cannot show>",
  "overlay_intent": "<what the overlay should mark, in WORDS: e.g. 'gold arrow from the puck carrier to the open weak-side winger (the correct lane); green ring on that winger; dim the covered strong-side shot'>"
}

Match age with the ladder: U7 one visible cue d1; U9 one cue + light pressure d1; U11 one clear read d2; U13 two linked cues d2; U15 layered reads d3; U18 adult-speed d3.

OUTPUT: one JSON array of brief objects. Nothing else.
```

<span style="color:#22c55e">🟢 Then type your driver into Gemini, e.g.</span> `Write 4 image question briefs for u13.odd-man-reads.`

## <span style="color:#5BA4E8">🔵 STEP 2 — copy the whole box below into CHATGPT (review the text AND generate the images)</span>

```text
You are the RinkReads Image Question Reviewer and Illustrator. You receive a JSON array of image-question briefs (a scene spec + an authored hockey read). Do BOTH jobs.

A) GENERATE THE IMAGE for each brief through a GRAPHIC-DESIGNER lens — imagine a senior sports graphic designer who has spent years rinkside and knows hockey cold (real rink dimensions, how players actually look). Produce a clean, premium "broadcast / coaching-graphic" look:
   - Real rink geometry and markings: accurate IIHF/NHL proportions, blue lines, center red line, faceoff circles and dots, goal lines, crease, and net.
   - Players as clear, well-proportioned figures (helmet, jersey, stick), not bare dots — instantly readable and distinguished by team COLOR (gold attacks, white defends). Goalie/net shown when the spec asks.
   - Considered color, contrast, line weight, and spacing. Clean vector / SVG style is ideal.
   GEOMETRY IS LOCKED — the design pass may change STYLE ONLY. Do NOT move any player, the puck, the net, or change who is open vs covered; every actor stays exactly where image_spec places them, because an overlay gets pinned to those coordinates. If making it prettier would shift the read, keep it plainer. Save each image and record its filename.

B) REVIEW THE TEXT for each brief:
1) FROZEN-FRAME TEST: can the read be made from ONE still image? Reject anything needing motion or a sequence.
2) HOCKEY ACCURACY: is the keyed answer correct at this age? Would a real coach object? Fix or flag.
3) SHARPEN DISTRACTORS: make each wrong option a real mistake a developing player makes, wrong for a stated reason; EXACTLY one defensible answer.
4) ROLE NOT NUMBER: every reference is by role/color, never a jersey number. No overclaim beyond what a still frame shows.
5) OVERLAY CHECK: confirm overlay_intent points at the keyed answer.

OUTPUT: the corrected JSON array, with an added "image_file" field per brief (the saved filename). Valid JSON only, no prose, no fences. Then one line "FLAGS:" listing anything Claude or a human must double-check (or "FLAGS: none").
```

<span style="color:#5BA4E8">🔵 ChatGPT both sharpens the text and makes each image. Save the images; each brief gets an `image_file`.</span>

## <span style="color:#c084fc">🟣 STEP 3 — hand the images + briefs to Claude</span>

<span style="color:#eab308">Drop the generated images in `public/assets/images/` and the reviewed briefs in `docs/ai-pipeline/image-briefs.json`, then</span> <span style="color:#c084fc">🟣 say to Claude:</span> `Bind the image briefs to their images.`

<span style="color:#eab308">Claude opens each real image, vision-reads the actual positions, places the overlays from `overlay_intent` at real coordinates, runs the overlay-accuracy gate, validates, and ships them as `type:"mc"` + `media` + `overlays[]` (the factory pipeline — see `docs/factory/SPEC.md`). Anything where the generated image does not actually show the read gets queued, not forced.</span>

---

## <span style="color:#eab308">🟡 Reference — age ladder (read only; already baked into the prompts)</span>

<span style="color:#eab308">- **U7:** one visible cue, open ice, puck safety, short plain words, `d:1`.<br>- **U9:** one cue plus light pressure or a simple support choice, `d:1`.<br>- **U11:** one clear read with one believable wrong option, `d:2`.<br>- **U13:** two linked cues, timing, support, or pressure detail, `d:2`.<br>- **U15:** layered reads, switches, second threats, faster pace, `d:3`.<br>- **U18:** adult-speed decisions, disguise, secondary options, consequences, `d:3`.</span>

## <span style="color:#eab308">🟡 Reference — valid nodeIds (read only; use the exact string)</span>

<span style="color:#eab308">`nodeId` = `u<age>.<concept-id>`. Hockey Sense is the anchor domain — prioritize it.</span>

<span style="color:#eab308">**Hockey Sense:** `scanning` `reading-the-play` `decision-making` `time-and-space` `creativity-under-pressure`<br>**Offensive Play:** `puck-carrier-options` `off-puck-support-offense` `attacking-1v1` `cycle-and-possession` `zone-entry` `odd-man-reads` `net-front-play`<br>**Defensive Play:** `gap-control` `angling-steering` `defensive-side-positioning` `coverage-reads` `stick-and-body-detail`<br>**Transition & Compete:** `transition-reads` `breakout-and-regroup` `forecheck-pressure` `backcheck-recovery` `battles-and-compete`<br>**Skating & Movement:** `edges-balance` `agility-mobility` `backward-transitions` `deception-with-feet`<br>**Puck Skills:** `puck-control` `puck-protection` `passing` `receiving` `shooting`</span>

<span style="color:#eab308">Combine with an age prefix → `u11.scanning`, `u15.gap-control`. Not every concept exists at every age (U7 is skills + battles only). The current empty-node list lives in **COVERAGE-GAPS.md**.</span>
