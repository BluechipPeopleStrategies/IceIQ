# U7 / Initiation Curriculum

**Source:** [CURRICULUM_MAP.md v2](./CURRICULUM_MAP.md) §"Age × concept depth matrix"
**Stage:** Hockey Canada FUNdamentals 1 / USA Hockey ADM 8U
**Cognitive load:** Single-concept, fun-first, "Can I do it once?"

This is the U7 slice extracted as an authoring spec. Use it alongside [AUTHORING_STANDARDS.md](./AUTHORING_STANDARDS.md) and the [U7 Workbook](./U7_WORKBOOK.md) (fillable template).

---

## What U7 covers (14 concepts at depth `I` — Introduce)

At U7 we **introduce** these concepts in principle. We're not building mastery — we're planting seeds. The kid should walk away with a "name" for the idea and a feel for what it looks like.

### Skills (5 concepts)
- **`skating-posture`** — athletic stance, knees bent, "ready position"
- **`puck-control`** — keeping the puck close, head up
- **`passing-receiving`** — flat passes, soft hands receiving
- **`stick-position`** — stick on the ice, blade in lane
- **`eyes-up`** — head up, look at teammates

### Hockey Sense (2 concepts — ★ ANCHOR — 2× target counts)
- **`reading-the-play` ★** — what's about to happen?
- **`decision-making` ★** — pass / shoot / carry the puck?

### Tactics (3 concepts — softened intro)
- **`dz-coverage`** — find a player to cover when they have the puck
- **`breakout`** — get the puck out of our zone safely
- **`oz-entry`** — crossing the offensive blue line

### Compete (3 concepts)
- **`battle-level`** — go after every puck, get up fast
- **`communication`** — talk to teammates ("man on", "open")
- **`recovery-resilience`** — fall down, get up, next play

### Goalie (1 concept — `pos: ['G']` only)
- **`goalie-angle-depth`** — stand between the puck and the net

---

## Target question counts

Per the **depth `I` rule** in CURRICULUM_MAP.md:
- Standard concepts: **3 questions each**
- Anchor concepts: **6 questions each** (2× standard)

| Theme | Concepts | Per concept | Subtotal |
|---|---|---|---|
| Skills | 5 | 3 | 15 |
| Hockey Sense | 2 (anchor) | 6 | 12 |
| Tactics | 3 | 3 | 9 |
| Compete | 3 | 3 | 9 |
| Goalie | 1 | 3 | 3 |
| **TOTAL** | **14** | | **48 questions** |

---

## Type mix targets at U7

From CURRICULUM_MAP.md §"Type mix per age" — U7 is **visual-heavy** because young kids learn from pictures, not paragraphs.

| Bucket | Target % | Question count (of 48) |
|---|---|---|
| Text (`mc` + `tf`) | 20% | 10 |
| Visual (`pov-mc` + `scene-mc`) | **70%** | **34** |
| Spatial / interactive (`hot-spots`, `rink-*`, `drag-*`) | 10% | 4 |

**Implication:** at U7, ~3 of every 4 questions need an image. Lean on the Scenario Author's Scene Composer to make these efficiently.

---

## Difficulty mix at U7

From AUTHORING_STANDARDS.md §6 — at depth `I`, almost everything is `d:1` (recognize). A small share can be `d:2` (apply) for the kids ready to push.

| Difficulty | Share | Count |
|---|---|---|
| `d:1` recognize | 75% | ~36 |
| `d:2` apply (game-context) | 25% | ~12 |
| `d:3` analyze | 0% | 0 (defer to U11+) |

---

## Fun layer (U7-specific)

Per CURRICULUM_MAP.md §"Fun layer" — these `funTags[]` are **encouraged at U7**:

- `mascot` — coach Kowalski / Marques / Kincaid / Danno cameo in the explanation
- `celebration` — confetti / mascot-cheer animation on correct answer
- `silly-distractor` — one obviously-absurd wrong option (e.g. *"Close your eyes and shoot"*) to lower the stakes. **Only at U7-U9.** Max one silly per question.
- `streak-bonus` — chain correct answers for a small reward
- `follow-the-puck` — animated questions (Phase 3) where the kid tracks the puck

Don't tag every question with a funTag — they're sprinkled, not blanketed.

---

## Stem rules at U7

From AUTHORING_STANDARDS.md §1 — the U7 floor is the strictest:

- **Stem length: 8-20 words.** Longer = vocabulary risk.
- **Active voice.** "You're carrying the puck through center" not "The puck is being carried."
- **Single concept per question.** No compound stems.
- **No jargon.** Test-drive against a 5-year-old ear: "D-zone" → "your end of the rink." "Forecheck" → "go after the puck in their zone."
- **No absolutes** ("always" / "never") unless `tf`.

---

## Coach voice at U7

The coach explanation (`why`) is the teaching moment. Per AUTHORING_STANDARDS.md §4:
- **1-2 sentences max** for U7.
- Names the concept ("Eyes up") AND the read.
- **No shame.** "If you'd just looked up…" is a no.
- Coach voice from `src/coachPersonas.js` — pick the persona consistent with the team color in the scene.

---

## Concrete example — U7 anchor question (decision-making, d:1)

```json
{
  "id": "u7q-decision-001",
  "type": "pov-mc",
  "cat": "Hockey Sense",
  "concepts": ["decision-making"],
  "pos": ["F", "D"],
  "d": 1,
  "levels": ["U7 / Initiation"],
  "sit": "You have the puck and a teammate is open near the net. What do you do?",
  "opts": [
    "Pass the puck to your teammate.",
    "Skate around all the other players.",
    "Wait for someone to take the puck.",
    "Stop skating and look at the goalie."
  ],
  "ok": 0,
  "why": "When a teammate is open near the net, the smart play is to pass. They have a better chance to score than you do from far away.",
  "tip": "Open teammate? Pass the puck.",
  "media": { "type": "image", "url": "/assets/images/u7-pass-to-open-teammate.png", "alt": "..." },
  "funTags": ["silly-distractor"]
}
```

Notice:
- Stem = 13 words ✓
- 4 options, length-balanced (within ±25%) ✓
- One absurd-ish option ("Stop skating and look at the goalie") for `silly-distractor` tag
- Why = 2 sentences naming the concept + the read
- Tip = 5 words, chant-worthy
- Visual (pov-mc) — counts toward U7's 70% visual target

---

## Workflow with the Scenario Author

1. **Open the Scenario Author** (`Start Scenario Author.bat` from your Desktop workspace).
2. **Connect to questions.json** (one-time FSA grant). Bank starts empty.
3. Open the [U7 Workbook](./U7_WORKBOOK.md) alongside.
4. For each row in the workbook:
   - **Visual question?** → Scene mode → compose → "+ New Question" → pick type → fills in stem/options → Save & Ship
   - **Text question?** → Questions mode → "+ MC" or "+ TF" button → fill in fields → save
5. After each batch of ~10, run `Run Curriculum Audit.bat` to see the U7 cells fill in.

The workbook tracks completion. Tick off each question as you author it.
