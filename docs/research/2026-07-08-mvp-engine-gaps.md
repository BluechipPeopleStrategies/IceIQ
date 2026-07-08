# MVP Gap Analysis: Beefing Up the Animated Question Engine

Date: 2026-07-08
Branch: feature/shareable-beta
Scope: proposal only. No code was changed.

Grounded in a read of: `src/play/AnimatedPlay.jsx`, `src/play/plays/*.js` (12 plays),
`src/play/playFamilies.js`, `src/play/playVariants.js`, `src/play/playCatalog.js`,
`src/play/interactionProfiles.js`, `src/play/motionVocabulary.js`, `src/play/tokenSystem.js`,
`src/play/prototypeTelemetry.js`, `src/play/telemetry.js`, `src/play/validateAnimatedPlay.js`,
`src/play/validateFactoryStandards.js`, `docs/play-kernel-standards.md`,
`docs/factory/next-scenario-variants.md`, `docs/factory/bulk-batch-template.md`,
`scripts/check-bulk-gate.mjs`, `scripts/test-prototype-telemetry.mjs`, `package.json`,
and the legacy static-bank type system (`src/utils/ageQuestionTypes.js`, `src/utils/types.js`).

---

## 1. Current schema map, and what a question-type abstraction needs

### 1.1 The data contract as it exists today

Play level:

```
{ id, type: "animated-play", title, concept, ageBands[], view,
  start, space, sourceRef{note, cite, url?}, actors[], nodes{} }
```

Actor: `{ id, team: home|away, role: puckCarrier|support|defender|goalie, label }`
(internal IDs like F1/D1/BC1 are load-bearing per the Internal ID Safety Rule;
young-facing text is produced by renderer/telemetry translation layers).

Node:

```
{ id, q, youngQ?, trainerQ?, decisionActor?,
  enter?{actorId:[x,y]}, pos{actorId:[x,y]}, puck?[x,y],
  freeze?{x,y,label}, cue?{label, youngLabel?, shortLabel?, x, y},
  motions[{kind: skate|pass|shot|blocked, from, to, actor?, label?}],
  overlays[{kind: freeze|target, x, y, r?}],
  ask?, terminal?, reRead?, showCueOnQuestion? }
```

Ask / option:

```
ask: { actor?, choiceMode?: "lane-pick", q, youngQ?, opts[] }
opt: { id, t, youngT?, trainerT?, icon?, zone?[x,y,r],
       ok?, no?, why?, youngWhy?, trainerWhy?, outcome?, next }
```

### 1.2 The playback contract as it exists today (single implicit mode)

`AnimatedPlay.jsx` implements exactly one interaction loop per node:

1. Render `enter` positions, hide motions.
2. t+500ms: show motion lines. t+950ms: CSS-transition actors to `pos` (1.4s ease).
3. Non-terminal nodes loop this cycle every 4200ms until the learner answers.
4. `choose(opt)` logs `{event:"answer", answerId, ok, ms}` and after 750ms (correct)
   or 1050ms (wrong) jumps to `opt.next`.
5. Terminal nodes show shot motions (suppressed pre-answer), a reveal card, Replay.

That is: **every non-terminal node is simultaneously an animation beat and a question.**
There is no way to play a sequence of beats without asking, no per-motion timing, no
playback speed control, and the `timer` field on interaction profiles
(`none|gentle|fast`) is defined but never used.

### 1.3 The question "type" today is implicit

There is no `questionType` field anywhere. Type is inferred:

- Default: text multiple-choice buttons.
- `ask.choiceMode === "lane-pick"`: tap-a-rink-spot, but only rendered when
  `profile.token === "figure"` (U7/U9). U11/U13 fall back to text buttons even when
  zones exist.
- Chained second question: a second non-terminal node with `reRead: true` + a cue.

### 1.4 What a new question-type abstraction needs (six contracts)

Adding predict/verdict types touches six distinct contracts. Naming them explicitly is
the core of the MVP, because every downstream tool keys off them:

1. **Type declaration.** An explicit `ask.kind` field with a closed registry, e.g.
   `"read-mc"` (today's default), `"lane-pick"` (promote choiceMode into kind),
   `"predict-next"`, `"verdict"`. Default absent = `"read-mc"` so all 12 existing plays
   stay valid with zero edits. A renderer-side `QUESTION_KINDS` registry maps kind to
   {playback mode, answer UI, reveal behavior, telemetry shape, validator}.

2. **Playback contract per kind.** What happens before the ask:
   - `read-mc` / `lane-pick`: animate one beat, freeze, ask (today's behavior).
   - `predict-next`: animate up to the occlusion point, freeze, ask "what happens
     next"; requires nothing new structurally, but the freeze is an occlusion point,
     not a decision point (decisionActor may be omitted; the learner is an observer).
   - `verdict`: play the FULL play first. Requires a new node capability:
     `autoNext: { next, afterMs }` on non-terminal, non-ask "watch" nodes so beats can
     chain without a question. This is the one genuinely new renderer primitive.

3. **Routing/reveal contract per kind.**
   - Today: `opt.next` routes to the consequence of *that* choice; exactly one `ok`.
   - `predict-next` breaks this: all options must reveal the SAME true continuation
     (the play continues the way it continues regardless of the guess). Proposal:
     `ask.truthNext` at the ask level; options carry `ok` but no `next`. Reveal framing
     changes from "Not quite" to "You predicted X. Watch what actually happens."
     A wrong prediction is information, not a mistake; copy must not shame it.
   - `verdict`: options are judgments ("Right read" / "Wrong read", optionally
     "Right idea, wrong timing"), exactly one `ok`, each routes to a short reveal.
     Verdict pairs naturally with a justification step (see contract 4).

4. **Follow-up/justification contract.** The standards currently forbid a second
   question without a NEW visible cue (Second Question Must Show New Read Rule). A
   verdict "why" step justifies the SAME moment, so it needs an explicit carve-out:
   a follow-up node flagged `justify: true` is exempt from the new-cue requirement
   but must (a) immediately follow a verdict ask, (b) offer reason options that
   reference evidence visible on the rink, (c) never introduce new facts.

5. **Telemetry contract.** Two layers change:
   - Runtime events (`telemetry.js`): add `questionType` and `step`
     (`read|predict|verdict|justify`) to logged events; extend
     `summarizeAnimatedPlayEvents` to per-type accuracy. Predict events should log
     `predictedId` so "most common wrong prediction" works per family.
   - Prototype snapshots (`prototypeTelemetry.js`): add `questionType`,
     `truthNext`, `watchChain` (ordered node ids played before the ask), and
     justification text to the snapshot. The FNV signature covers whatever is in the
     snapshot, so signatures update for free once fields are added, but the
     shorthand check (`snapshotHasForbiddenYoungLanguage`) must also sweep the new
     justification/prediction reveal strings.

6. **Validator + factory contract.** `validateAnimatedPlay.js` currently enforces
   "every non-terminal node has an ask with 2+ opts, exactly one ok, opt.next resolves".
   Watch nodes violate all of that by design. Both validators need per-kind branches
   (details in section 3).

---

## 2. Candidate MVP additions (7)

### A. `ask.kind` type registry (foundation)

- **Learning mechanism:** none directly; it is the substrate for every other item.
- **Reuses:** all 12 plays unchanged (absent kind = read-mc); lane-pick folds in as a
  kind instead of a choiceMode special case.
- **New:** `kind` field, renderer registry switch, validator registry of allowed kinds.
- **Size:** S. **Risk:** low. The only risk is skipping it and accreting more
  choiceMode-style special cases that the factory cannot validate.

### B. Watch-segment primitive (`autoNext` chaining)

- **Learning mechanism:** enables observation-first mechanisms (verdict, worked
  examples); also fixes the Animation Runway problem properly (multi-beat entries
  instead of one stretched beat).
- **Reuses:** the entire existing node structure (enter/pos/motions/cue); a watch node
  is just a node with `autoNext` and no ask.
- **New:** renderer support for auto-advance, a skip/replay affordance, validator rules
  (watch chain must terminate in an ask or terminal node; cap chain length, suggest 3).
- **Size:** S. **Risk:** low-medium (timing bugs, learners missing the beat; mitigate
  with a "Watch" pill and replay-from-start).

### C. Predict-what's-next (`kind: "predict-next"`) — owner priority (a)

- **Learning mechanism:** anticipation/occlusion (the strongest evidence-based
  mechanism in sport perceptual training) + retrieval practice. "The play freezes;
  what does the defender do next?" forces the learner to run the pattern forward.
- **Reuses:** freeze-point rules, cue system, existing option schema, existing
  consequence nodes (the true continuation is authored exactly like today's terminal
  nodes). Existing plays convert cheaply: the 2-on-1 family's "defender steps up"
  becomes "the defender is closing... what happens to the pass lane?"
- **New:** `ask.truthNext` routing (all options reveal the same continuation),
  observer-perspective framing (no decisionActor required), non-punitive wrong-guess
  reveal copy ("You predicted X, here is what happened"), telemetry `predictedId`.
- **Size:** S-M (most of the cost is the routing/reveal change, not UI).
- **Risk:** low. Closest analog already proven in the static bank (`next` type, 17
  questions), so the pedagogy is pre-validated; this animates it.

### D. Verdict/judgment (`kind: "verdict"` + `justify` step) — owner priority (b)

- **Learning mechanism:** error-spotting + self-explanation + delayed feedback. The
  learner watches a full play (including deliberately wrong reads), judges it, then
  picks WHY. Two-step verdict-then-reason is where the "thought-stimulating" payoff
  lives; a bare yes/no is a coin flip.
- **Reuses:** huge content leverage: every existing play already contains authored
  wrong-path branches (blockedShot, wallRecovery, behindRecovery, missedTiming...)
  with teaching notes. A verdict item is "replay an existing branch as a watch chain,
  then ask." Roughly 2 verdict items per existing play are already 80% authored.
- **New:** depends on B (watch chains); `justify: true` follow-up node + standards
  carve-out; 2-3 option verdict UI (recommend including "right idea, wrong timing" as
  a third option at U13 to break yes/no guessing); reveal that names the read in
  family vocabulary.
- **Size:** M. **Risk:** medium. Two design risks: (1) verdict questions about
  "wrong" plays must not read as mocking a player (align with the growth-oriented
  voice: judge the read, not the kid); (2) the justify step must be exempted from the
  new-cue rule explicitly or the factory validator will fight it.

### E. Activate the gentle timer for U11/U13

- **Learning mechanism:** fluency/automaticity + difficulty progression. Reads on ice
  are time-boxed; `ms` is already logged on every answer but never used. A soft,
  non-failing timer ("gentle": a shrinking bar, no lockout; answer classified
  fast/on-time/late) turns the same questions into speed reps.
- **Reuses:** `profile.timer` field (already defined: none/gentle/fast), existing `ms`
  telemetry, existing plays with zero data changes.
- **New:** timer UI, per-kind time budgets, read-speed line on the reveal card.
- **Size:** S. **Risk:** low-medium (time pressure can spike anxiety; keep it
  informational at U11/U13, never a lockout, and off for U7/U9).

### F. Age-band presentation differentiation pass — owner's animation axis

- **Learning mechanism:** difficulty progression via presentation, plus engagement.
  Today U11 vs U18 differ only in token shape, bg color, text size. Proposal: move
  pacing and framing into the profile so the SAME play feels like a different product
  per band: `paceMs` (U7 slower entries, U15/U18 shorter runway), `promptFrame`
  (U7 "What should YOU do?" / U11-U13 "Make the read" / U15-U18 "Call it"),
  `revealStyle` (U7 celebrate, U11/U13 coaching card + streak, U15/U18 film-room
  annotation strokes on replay), and verdict/predict availability per band
  (mirror `RECOMMENDED_TYPES_BY_AGE` from the static bank: predict at U13+, verdict
  U11+, keeping lane-pick primary at U7/U9).
- **Reuses:** interactionProfiles as the single switch point; motionVocabulary.
- **New:** 4-5 profile fields consumed by the renderer; an age-availability map for
  question kinds.
- **Size:** M (S if scoped to pacing + prompt framing + kind availability first).
- **Risk:** low.

### G. Mistake-spotting recycler (`kind: "spot-mistake"`)

- **Learning mechanism:** error-spotting variant of D with a spatial answer: watch a
  play with one wrong read baked in, then TAP the actor (or moment) where it went
  wrong. Bridges lane-pick interaction and verdict judgment.
- **Reuses:** watch chains (B), lane-pick tap zones, existing wrong branches; static
  bank precedent (`mistake` type, 16 questions).
- **New:** tap-the-actor answer mode; distractor moments.
- **Size:** M. **Risk:** medium (ambiguity about "the" mistake moment; needs a strict
  one-defensible-answer authoring rule). Defer behind D, which teaches the same
  mechanism with less ambiguity.

### Deliberately excluded from MVP candidates

- **Order-the-reads / sequence** (static `seq` analog): breaks the exactly-one-correct
  invariant that validators, telemetry (`correctOptionIds`), reveal UI, and the bulk
  gate all assume. Highest schema blast radius for the least unique pedagogy
  (prediction covers anticipation already). Later.
- **Interleaved session queue** (mixed families/kinds per session): the single biggest
  retention win eventually, but it is a session-layer feature, not a kernel feature;
  it needs the kinds to exist first. MVP-next/later.
- **Confidence tag** (rate sureness before reveal, calibration telemetry): cheap and
  interesting, but adds a tap to every question; wait for evidence of need.

---

## 3. Factory implications

### 3.1 docs/play-kernel-standards.md — new/edited sections

| Section | Change |
|---|---|
| NEW: Question Kind Rule | Every ask declares `kind` from the closed registry; absent = read-mc. New kinds require a standards section + validator + telemetry support before factory use. |
| NEW: Watch Segment Rule | Watch nodes have `autoNext`, no ask; chains max 3 beats; must end in an ask or terminal; cue integrity and label rules apply to every beat, not just the freeze. |
| NEW: Prediction Reveal Rule | Predict asks route all options to one `truthNext`; options are plausible continuations (no absurd fillers); wrong-guess reveal uses "here is what happened" framing, never failure language; freeze must occlude the answer (no motion line may foreshadow the continuation, extends the Answer-Reveal Rule). |
| NEW: Verdict and Justification Rule | Verdict plays the full sequence first; 2-3 judgment options, exactly one ok; a `justify: true` follow-up is exempt from the new-cue requirement but must reference visible evidence; judge the read, never the player (growth-oriented voice). |
| EDIT: Second Question Must Show New Read Rule | Add the `justify: true` exemption explicitly so the reRead validator and the new rule cannot conflict. |
| EDIT: Young Player Interaction Rule | State kind availability per band (U7/U9: read-mc + lane-pick only; predict U13+; verdict U11+ with 2 options, U13+ with 3). |
| EDIT: Prototype Telemetry Rule | Snapshots must include questionType, watchChain, truthNext, and justification text; signature must change when any of these change. |
| EDIT: Bulk-Assisted Creation Rule | New kinds are barred from bulk batches until one hand-built exemplar per kind has passed the full gate plus manual playtest at U11 and U13; batch cap stays 3. |

### 3.2 Code validators

- `src/play/validateAnimatedPlay.js`: branch on kind. Watch nodes: require `autoNext`
  resolving to a real node, forbid ask, detect cycles. Predict: require `truthNext`,
  forbid per-opt `next`, still exactly one ok. Verdict: require a preceding watch
  chain from `start`, 2-3 opts. Justify: require immediately-preceding verdict.
- `src/play/validateFactoryStandards.js`: mirror the standards rows above as
  errs/warns; extend the reRead check with the justify exemption; extend youngT
  shorthand checks to justification and prediction reveal text.

### 3.3 npm scripts (all feed `check:bulk`, which is the commit gate)

| Script | Extension needed |
|---|---|
| `test:animated-play` | Unit cases for kind registry defaults, watch-node validation, predict truthNext routing, verdict+justify shape. |
| `test:play-factory` / `report:play-factory` | New standards rules above; report groups violations by kind. |
| `test:prototype-telemetry` / `report:prototype-telemetry` | Snapshot fields (questionType, watchChain, truthNext); signature-change tests per new field; shorthand sweep over justify/predict text; fixture play per kind. |
| `test:scenario-families` / `report:scenario-families` | Add per-family kind coverage: each family's report row gains counts by kind; warn when a "complete" family has 0 predict or 0 verdict items (families define the decision pattern; kinds define how it is exercised). |
| `report:next-variants` | Format enum grows from {single question + reveal, route choice, true re-read} to include {predict next, verdict + why}; the recommender should start suggesting a predict or verdict variant for families that are variant-complete but kind-thin (e.g. 2-on-1 at 8/6). |
| `check:bulk` | No structural change (it aggregates), but it only protects what the above tests assert, so it must not be treated as extended until they are. |
| `docs/factory/bulk-batch-template.md` | Add kind to each variant block + a per-kind checklist line (truthNext present? watch chain <= 3? justify references visible evidence?). |

### 3.4 Telemetry runtime

`telemetry.js`: event schema adds `questionType` and `step`; bump storage key to
`rinkreads_animated_play_events_v2` (the reader tolerates old records, but summaries
should not mix shapes silently); `summarizeAnimatedPlayEvents` reports per-kind
accuracy and per-kind most-common-wrong-answer.

---

## 4. Ranked recommendation (opinionated)

### MVP-now (U11/U13) — one coherent slice, in build order

1. **A: `ask.kind` registry** (S). Do this first even though it ships no new pedagogy.
   Every later item becomes a registry entry instead of a special case; skipping it is
   how choiceMode-style debt happens.
2. **B: watch-segment primitive** (S). Verdict depends on it, and it retroactively
   fixes runway pressure in existing families.
3. **C: predict-what's-next** (S-M). Cheapest new mechanism, pre-validated by the
   static bank, strongest evidence base (occlusion/anticipation), and it targets
   U13 exactly. Ship 2 hand-built exemplars in the 2-on-1 family (it is at 8/6
   variants, saturated for read-mc, ideal for kind diversification).
4. **D: verdict + justify** (M). The flagship "thought-stimulating" type; two-step
   judgment-then-why is the differentiator. Ship 2 exemplars recycled from existing
   wrong branches (backcheck wallRecovery, 2-on-1 blockedShot).
5. **Factory extensions from section 3** (M, spread across 1-4). Non-negotiable part
   of MVP-now: the standing rule is that the factory mass-produces; a type that
   `check:bulk` cannot police does not exist. Gate: no bulk batches containing new
   kinds until one exemplar per kind passes the full gate + manual U11/U13 playtest.
6. **F-lite: age-band differentiation, scoped** (S). Just `paceMs`, `promptFrame`,
   and the kind-availability map, so U11/U13 immediately feel distinct from U7/U9 and
   U15/U18 when the new kinds land. This covers the owner's animation axis without
   blocking on celebration/annotation polish.

Total MVP-now estimate: ~2 M-sized slices of work plus standards/tests. Deliberately
excludes any new answer-input UI (predict and verdict both reuse text buttons), which
keeps renderer risk near zero.

### MVP-next

7. **E: gentle timer for U11/U13** (S): turns the whole existing catalog into speed
   reps for free; do it right after MVP-now proves the kinds.
8. **F-full: reveal styling per band** (M): U7/U9 celebration moments, U11/U13
   coaching-card streaks, U15/U18 film-room annotation strokes on replay.
9. **G: spot-mistake tap mode** (M): extends verdict spatially; also the natural
   bridge for bringing lane-pick zones to U11/U13 (zones already exist in the data
   but render only for the figure profile today; that is a quick win to fold in).
10. **Per-family kind targets in the variant queue**: once 2-3 plays per kind exist,
    set targetKinds per family so `report:next-variants` drives kind coverage the way
    it drives variant coverage now.

### Later

11. **Order-the-reads (seq)**: wait until the multi-correct schema question is worth
    solving; prediction covers most of the anticipation value at far lower cost.
12. **Interleaved session queue + spaced retrieval**: the long-term retention engine;
    needs kind diversity and more catalog depth first.
13. **Confidence calibration tag**: cheap experiment once telemetry shows where
    learners are overconfident.
14. **Fast timer + film-room mode for U15/U18**: extend E/F upward once U11/U13 lands.

### The one-sentence bet

Ship `kind` + watch chains + predict + verdict with full factory gates at U11/U13,
recycling existing wrong-path branches as verdict content, and the engine goes from
"one question shape, twelve plays" to "three learning mechanisms over the same
catalog" with almost no new rink UI.
