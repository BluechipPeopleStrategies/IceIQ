# Scenario Variation Generator — PARKED design (resume ~2026-06-18)

Status: **PARKED mid-brainstorm.** Direction agreed; not yet a finalized spec.
Two open questions remain (bottom). Resume by re-reading this, answering those
two, then writing the real spec + implementation plan.

## The question that started it
"How can we use Canva with RinkReads for mass creation of hockey scenario training?"

### Verdict on Canva
For **in-app interactive volume: Canva is the wrong tool.** Scenarios are JSON
data (coords + interaction + validated geometry) driving a live render engine
(`OverlayLayer.jsx`). Canva makes static designs — no tap-targets, can't enforce
geometry, no clean coordinate export. Building this on Canva fights the tool.

Canva's *real* home is a **separate, parked workstream**: social/marketing
derivative cards ("what would you do?" TikTok/IG posts from the best validated
reads) to drive traffic INTO the app. Worth doing later; not this project.

## Decisions locked
- **Goal:** more real, tappable, validated in-app scenarios (the JSON seeds), fast.
- **Production model to copy:** the **IXL / math-app template model** now, **film
  model later**. (Surveyed: chess puzzles = generate-and-verify from real games,
  which needs a digitized data source we don't have; math apps = template +
  parametric variation + per-item verify, which is exactly our fit; sports apps =
  film/clip moments, authentic but manual — deferred to a future premium layer.)
- **Pedagogical rule that defines "good volume":** a variation is good ONLY if the
  **correct answer moves and the distractors change**, forcing a genuine re-read
  (variable practice / contextual interference). A variant that leaves the answer
  in the same place is a **duplicate** and must be killed, not shipped.

## Architecture (agreed direction)
A **variation generator + novelty gate** on top of the existing validator
(`src/scenario/validators.js`, `.claude/skills/new-scenario/validate-seed.mjs`),
feeding the existing coach/gauntlet review. No Canva, no new app — a CLI in
`IceIQ/tools/` matching the `factory`/`gauntlet` pattern.

Three layers: **concepts** (~15–30 teaching atoms) → **parent scenes** (1–3
hand-authored, validated per concept) → **machine-generated validated variations**
(many per parent).

### Transform set (must MOVE the decision, then re-validate)
- **T1 Mirror top/bottom** (`y → 1−y`): stays on-stage (x unchanged), flips the
  open side. Cheapest/safest.
- **T2 Mirror ends** (`x → 1−x`, flip `stage.view`, move goalie): same read from
  the other zone.
- **T3 Lane reassignment** (move a defender so a *different* teammate is the clean
  option): highest value, hardest; validator confirms one clean lane + one
  tempting-blocked.
- **Re-level modifier (never standalone):** U7 generic markers → U11 labeled, bump
  difficulty floor. Alone it doesn't move the answer = duplicate; only valid
  stacked on T1/T2/T3.

### Novelty gate (kills clones) — child emitted only if ALL pass
1. **Answer-moved:** correct target differs from parent and every sibling beyond a
   distance threshold (different zone, or > X normalized units).
2. **Layout distance:** similarity score over actor positions vs. whole bank; too
   close → reject.
3. **Concept-cap:** max children per (concept, answer-zone, view) tuple.

### Pipeline
`parent seed → deterministic transform → LLM rewrites ONLY the prose
(feedback.right/wrong, tip, why; names the now-open player) → validator → novelty
gate → emit to staging dir → existing coach/gauntlet review (KEEP/REVISE/RETIRE) →
promote to src/scenario/seeds/`.

Geometry + gating are **free deterministic code**. The **only** token-spending step
is the prose rewrite, and it runs **only on children that already passed geometry +
novelty** — never waste tokens on a variant that won't ship (respects the
no-extra-usage rule).

### CLI shape
```
node tools/variator/expand.mjs src/scenario/seeds/<parent>.json --transforms mY,mX,lane --n 12
```
→ writes N candidate seeds to a staging folder for review. Point it at the ~20
existing seeds as parents → hundreds of candidates to triage.

## OPEN QUESTIONS to answer on resume
1. **Transform set completeness** — is mirror/mirror/lane-reassign the right set, or
   also want: add/remove a defender (change difficulty), or change the *interaction
   kind* (point↔path↔selection)?
2. **Auto-promote vs. stage-for-review** — recommend **stage for coach review**
   first (keeps the quality bar); confirm.

## Reference files (verified 2026-06-16)
- `IceIQ/src/scenario/seeds/*.json` — seed format (parents live here)
- `IceIQ/src/scenario/schema.js`, `validators.js`, `zones.js` — schema + rules
- `IceIQ/.claude/skills/new-scenario/{SKILL.md,validate-seed.mjs}` — authoring +
  validator to reuse
- `IceIQ/src/OverlayLayer.jsx` — how scenes render (sprites/puck/arrow/ring/text)
- `IceIQ/tools/gauntlet/` — existing coach review to feed into
