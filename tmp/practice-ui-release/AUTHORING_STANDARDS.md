# RinkReads Authoring Standards

**Status:** locked 2026-04-29 alongside CURRICULUM_MAP.md v2.
**Purpose:** the rules every question must follow. Quality bar for the rebuilt bank.

These standards are enforced by review (you + me) and ideally by automated lint
in the Scenario Author. Capture from years of authoring the previous bank +
established multiple-choice writing principles (Haladyna's MC item-writing
guidelines, NCME standards) adapted for hockey teaching.

---

## 1. Stem (the question text)

### Required
- One concept per question. No compound questions ("What should you do AND where should you be?").
- Age-appropriate vocabulary. Test mentally against the LOWEST age in `levels[]`. If U7 is in scope, no jargon ("D-zone backside pressure release").
- Active voice. "You're carrying the puck through center" beats "The puck is being carried through center."
- Single perspective: second person ("you") for player-POV scenarios, third person ("the player in red") for observational/mistake-spot questions.

### Forbidden
- Double-negatives ("Which is NOT something you should NEVER do?").
- Absolutes ("always" / "never") unless the rule is genuinely binary (offside = always offside).
- Trick wording ("technically", "in some cases").
- Pure trivia (NHL history, player names, team facts).
- Date-sensitive references (current standings, specific season).
- Brand/sponsor mentions.

### Length targets
| Age | Stem length (words) |
|---|---|
| U7 | 8–20 |
| U9 | 10–25 |
| U11 | 12–35 |
| U13 | 15–40 |
| U15 | 20–50 |
| U18 | 20–60 |

---

## 2. Answer choices (mc / pov-mc)

### Required
- **4 options at U7–U9**, **4 at U11+** (3 acceptable when a 4th feels forced).
- **Length consistency**: each option within **±25% of the average option length** (in characters). The correct answer must NOT be conspicuously longer or shorter than distractors — it's the most common giveaway in poorly-written MC.
- **Distribution of correct answers**: across each authoring set (e.g., 5 questions on the same concept), the correct-answer position should approximate uniform distribution. A=B=C=D ≈ 25% each. **Lint check**: the Scenario Author should warn if a batch shows >50% in any single position.
- **Plausibility**: every wrong answer must be a defensible mistake a kid could actually make. Each distractor should pull on a real misconception, not be a throwaway.
- **One unambiguous winner**: if two options could plausibly be correct, the stem is under-specified — rewrite the stem.
- **Parallel structure**: "Pass to F1 / Pass to D2 / Carry the puck / Shoot" — all start with a verb. Don't mix nouns and verbs.

### Forbidden
- "All of the above" / "None of the above" — encourages guessing strategies, not reasoning.
- Partial-overlap options ("Pass" + "Pass to F1" + "Pass to D2") — pick one level of specificity.
- Stylistic giveaways (correct option uses precise hockey vocabulary; distractors use vague language).
- Identical-stem-prefix options — cut the shared prefix into the stem.

### Silly distractors
- Allowed ONLY when `funTags` includes `silly-distractor` AND age is U7 or U9.
- Maximum 1 silly option per 4 — the other distractors must still be plausible.
- Examples: "Close your eyes and shoot" / "Skate backwards into the net". The point is to lower the stakes for young kids, not to make the question dumb.

---

## 3. True / False (`tf`)

- Use only when the answer is genuinely binary (rules, habits, fundamental cues).
- Stem must NOT contain "always" / "never" — that telegraphs the answer.
- Provide a "why" that handles BOTH directions ("Yes because…" and "Why someone might think no…").
- Avoid TF for situational/tactical reads — those have nuance MC handles better.

---

## 4. Coach explanation (`why`)

### Required
- **1-2 sentences for U7–U9**; **2-3 for U13+**.
- Names the concept ("Eyes up") AND the read ("you see teammates and trouble before it arrives").
- Teaches the lesson — doesn't shame the wrong answer.
- Coach voice consistent across the bank. The 4 coach personas are defined in [src/coachPersonas.js](src/coachPersonas.js); use the assigned coach's voice for the question's age tier.

### Forbidden
- "If you'd just…" or any phrasing that punishes the wrong choice.
- More than one teaching point — add a follow-up question instead.
- Acronyms without definition (RVH, OZF, NZP).
- Pulling-back hedges ("usually", "sometimes you might…") — be definitive.

---

## 5. Tip (`tip`) — the one-liner takeaway

- **≤15 words**.
- Memorable, chant-worthy, kid-shareable.
- Repeats the concept name where possible ("Eyes up wins reads.").
- Stands alone — must make sense without the question context.
- One per question — never empty for editable types.

Examples that work:
- "Stick on ice, blade in the lane."
- "Above the puck, eyes both ways."
- "Fall down? Get up. Next play."

---

## 6. Difficulty (`d`)

### d:1 — Recognize
- Stem is context-light or pure rule recall.
- "What's eyes up?" / "Where does the goalie stand on a shot from the point?"
- Default for U7–U9 mc/tf.

### d:2 — Apply
- Stem has full game-context. One right answer; distractors are misreads of the same scenario.
- "You're carrying through the slot, two defenders converging. What do you do?"
- Default for U11+ mc/pov-mc.

### d:3 — Analyze
- Multi-cue or "lesser of two evils." Two options could be defensible; one is best.
- Time pressure may apply.
- Reserved for U13+ unless the concept is anchor-level for the age.

### Distribution within an age × concept cell
- 30–40% d:1 (foundational recall)
- 40–50% d:2 (game-context application)
- 20–30% d:3 (analyze, only at appropriate ages)

---

## 7. Visual questions (`pov-mc`, `scene-mc`, `hot-spots`, `rink-*`)

### Required
- **Image / scene must depict what the stem describes**. No "imagine a 3-on-2" with a static neutral-zone shot.
- **`media.alt`** required. Two purposes: screen-reader accessibility AND a coach-readable description for review/audit.
- **Visual-first authoring**: write the stem AFTER you have the image. Stems written before the visual tend to mismatch.

### Hot-spots specifics
- 3–5 spots per question. One correct, others educational.
- Each `spot.msg` must teach (`✓ Net-front, stick in the backdoor lane`) — not just confirm/deny.
- Coordinates verified by clicking through in the dashboard preview before shipping.

### Rink-label / rink-drag / rink-match
- Chip-pool size = spot count. No leftover chips, no insufficient chips.
- Distractors in the chip pool: include 1–2 plausible wrong chips (e.g., when teaching "Where's the right wing?", include "Left wing" as a chip).

---

## 8. Multi-age questions (`levels[]`)

- Questions MUST work at the LOWEST age in `levels[]`. If `levels: ['U7 / Initiation', 'U11 / Atom']`, the U7 standards govern stem length, vocabulary, and concept depth.
- A question covering depth `D` at U11 cannot also be tagged for U7 if the curriculum says depth `I` at U7 — the cognitive load mismatches.

---

## 9. Position tagging (`pos[]`)

- `['G']` only — goalie-specific reads. Routed through goalie concept track.
- `['D']` — defenseman-specific (gap, weak-side coverage, breakout from the back).
- `['F']` — forward-specific (forecheck angles, cycle support).
- `['F','D']` — universal reads (eyes up, decision-making anchors, transition).
- `['F','D','G']` — applies to all positions (rare; usually compete/team-habit questions).

The position tag means "this question is most relevant to a player who plays X" — not that only X-position kids see it. The engine uses pos to weight, not to filter.

---

## 10. Concept tagging (`concepts[]`)

- Use the curriculum vocabulary from [CURRICULUM_MAP.md](./CURRICULUM_MAP.md) (28 concepts).
- **Tag the primary concept first** — `concepts[0]` is treated as the anchor concept by the audit.
- Up to 2 secondary concepts allowed (most questions teach one thing).
- Avoid generic tags. "Hockey Sense" is too vague — pick `decision-making` or `reading-the-play`.

---

## 11. Question type — when to use each

| Goal | Right type |
|---|---|
| Concept knowledge / verbal recall | `mc` |
| Binary rule / habit | `tf` |
| Visual recognition (still image) | `pov-mc` |
| Animated read-the-play (planned) | `scene-mc` |
| "Where do you go?" spatial decision | `hot-spots` |
| Anatomy / position labels | `rink-label` / `rink-drag` / `rink-match` |
| Movement + positioning | `drag-target` / `drag-place` |
| Lane recognition / pass selection | `path-draw` / `lane-select` |
| Order of operations | `seq` / `sequence-rink` |
| "What did that player do wrong?" | `mistake` |

If your stem could work as either `mc` or `pov-mc`, **choose pov-mc** — visual context lifts retention. Reserve `mc` for concept-knowledge cues that don't need a picture.

---

## 12. Anti-patterns (don't ship questions that have these)

- Trick questions ("What's the EXACT distance to the blue line?")
- Pure trivia (NHL history, specific players, team facts)
- Specific brands or sponsors in stems/options
- "Always" / "Never" absolutes outside genuinely binary rules
- Over-Canadian references (keep universal — kids in California play hockey too)
- Negation in both stem AND option ("Which is NOT a good time to NOT pass?")
- Compound stems ("What and where and when…")
- Vocabulary above the lowest age in `levels[]`

---

## 13. Process — when authoring a new question

1. **Check the curriculum.** Is this concept × age cell under-target per the audit? Author there first.
2. **Write the stem.** Single concept, age-appropriate, active voice.
3. **For visual types:** find or compose the image FIRST, then write the stem to match.
4. **Write 4 options.** Length-balanced, parallel structure, one unambiguous winner.
5. **Distribute correct answers** across the batch you're authoring — don't make them all A.
6. **Write the `why`.** Names the concept + the read. No shame.
7. **Write the `tip`** — ≤15 words, memorable.
8. **Tag concepts/age/pos/d.** Match the curriculum.
9. **Self-review:**
   - Does the correct option stand out by length / vocabulary? Rewrite.
   - Could a kid argue for a different option? Either accept it (d:3 design intent) or rewrite.
   - Does the stem work at the LOWEST age in levels[]?
10. **Save & Ship** in the Scenario Author.

---

## 14. Lint targets (for future tooling)

These are checks the Scenario Author should eventually flag automatically. Documenting now so they're built into v3 of the editor:

- Option length variance >25% from mean → warn
- Correct-answer position frequency >50% in a session-batch → warn
- Stem length outside age window → warn
- Missing `tip` on editable type → block
- Missing `media.alt` on visual type → block
- "all of the above" / "none of the above" present → block
- Stem contains "always" / "never" + no `tf` type → warn
- `silly-distractor` funTag without U7/U9 in `levels[]` → block
