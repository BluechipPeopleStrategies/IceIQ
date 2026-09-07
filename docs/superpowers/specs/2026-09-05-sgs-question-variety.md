# SGS question variety and delivery

**Date:** 2026-09-05. **Status:** owner-approved bounded preview design; implementation and verification are recorded separately. This document does not admit content to the live bank.

## Owner direction

Thomas wants multiple ways to test comprehension, with many meaningful variants **within** each type and variety in how questions are delivered. A sequence should feel like successive hockey decisions. The agreed delivery modes are **Learning**, with feedback after each read, and **Challenge**, with feedback after the complete play.

The current build adds three factual observation formats before each existing SGS positioning read: **tap a player**, **multiple choice**, and **true/false**. The positioning choice is the hockey decision; an explanation is optional additional evidence. Observation prompts do not turn three visible reads into six hockey decisions.

**Latest owner update — optional explanations:** “Why would you be there?” must never block a valid position submission. Save an omitted explanation as an empty value, preserve supplied text on reload/export, and treat absence as no explanation evidence rather than a wrong answer, incomplete read or penalty. Learning feedback follows a completed position submission whether or not a reason was added. This supersedes earlier mandatory “position-and-reason” wording in this design and its implementation plan.

## Source and authority

| Source | Decision carried into SGS | Boundary |
| --- | --- | --- |
| [Question types and coach sign-off](2026-06-11-question-types-coach-signoff-design.md) | One situation supports point, selection, ordering, placement, paths and matching. State the acceptable answer set explicitly. | Its proposed value model is not proof that an arbitrary hockey position is correct. |
| [Stem + Questions](2026-06-13-stem-questions-design.md) | Link several question types to the same immutable situation. | Do not infer true/false from an option count of two; Pass/Carry is still an action choice. SGS does not use the old seed-copy authoring route. |
| [Question-kind design](../../proposals/2026-07-08-question-kind-engine-design.md) and [research menu](../../research/2026-07-08-question-engine-research.md) | Spatial response, verdict plus evidence, prediction and error detection test different aspects of understanding. | Research recommendations are not new claims about RinkReads efficacy. No clinical, transfer or retention effect is asserted here. |
| [Direct-manipulation contract](2026-07-10-direct-manipulation-question-contract-design.md) | A tap, move or draw instruction must provide that actual interaction, including an equivalent keyboard path. | No silent replacement with unrelated multiple-choice buttons. |
| [Decision-training philosophy](2026-07-29-decision-training-curriculum-philosophy-design.md) and [family standards](../../scenario-family-standards.md) | Begin with constrained reads, then increase openness; explain what a choice changes. Difficulty, format and openness are separate axes. | A reworded prompt or shuffled options do not create a new hockey situation. |
| [Play standards](../../play-kernel-standards.md) | New reads require new visible cues. Keep options neutral before reveal and explain the mechanism afterward. | Current U13-first prediction and one-defensible-mistake constraints remain in force for their existing kinds. |
| [Coach question workflow](../../one-on-one/coach-question-workflow.md) | Preserve independent learner/reference attempts and explanations; allow defensible alternatives. | Distance from the coach's drawing is descriptive, not a tactical score. |
| [Owner engine decisions](../../factory/SCENARIO-ENGINE-DECISIONS.md) and [canonical architecture](2026-07-29-scenario-engine-design.md) | Source-bound claims, physics/tactical separation, staged review and recall govern promotion. | Existing question-kind UI approval does not approve new scenarios, templates or answer keys. No paid API or fabricated AI judge. |

Current user direction explicitly adds connected U11 reads and U7 rink-feature discovery. Older single-read deferrals or blanket exclusions of static identification do not cancel those requests. Other source, age and promotion requirements remain applicable.

## Twelve-format matrix

“Existing” describes a capability in the repository, not universal availability or approved content in every age band. “This build” means the bounded SGS preview work defined below. Unchecked implementation-plan items are not completion evidence.

| Format | Comprehension demonstrated | Age and answer constraints | Existing / this build / planned |
| --- | --- | --- | --- |
| **1. Multiple choice** | Select a visible fact or a supported action. | Young prompts are short and concrete. Factual keys and tactical rubrics are different authorities. Stable option IDs survive shuffling. | Existing quiz and animated-play format. **This build:** several factual observation families. |
| **2. True/false** | Judge whether one specific claim matches the current freeze. | Use an actual boolean response and truth key. Avoid compound claims, trick negatives and treating a two-button verdict as true/false. | Existing legacy format. **This build:** real boolean scene claims, including both true and false examples. |
| **3. Tap a player or feature** | Identify possession, an actor, a visible change or a rink landmark. | Generous distinct hit targets, visible selection, keyboard access. U7 uses simple labels and the separately requested untimed rink tour. | Existing actor selection and U7 discovery. **This build:** direct actor answers in the shared SGS scene. |
| **4. Pick a spot or lane** | Recognize where an action or support option is available. | Accept all eligible regions allowed by the wording. Do not show the correct destination before the response. | Existing point/lane primitives. SGS scored spatial regions remain **planned**, subject to a justified answer set. |
| **5. Move a player / arrange players** | Apply positioning, spacing and coverage. | Freeze all non-controlled context during input. Multiple defensible points need criteria, not one nearest-dot key. | Existing SGS isolated-player placement and reasons. **This build:** preserved as each read's decision. Multi-player scored arrangements remain **planned**. |
| **6. Draw a route** | Connect an intended action to a path and destination. | Drawing must be available when requested. Distinguish legal geometry from supported timing and tactical value. | Existing path primitive. Connected SGS route decisions are **planned**. |
| **7. Order the actions** | Recall or anticipate causal/temporal order. | Use events that the shown sequence supports; exact order is not always the same as a uniquely best tactical plan. | Existing sequence primitive. SGS event-order checks are **planned**. |
| **8. Match responsibilities** | Pair attacker with covering defender, player with space/role, or situation with response. | Declare one-to-one or many-to-one mappings and all acceptable pairs. System-dependent assignments require the coach's source/rubric. | Explicit June design; no matching primitive in the current directory. **Planned**. |
| **9. Watch and judge + why** | Evaluate a read using visible evidence. | U11 has two verdicts; U13 may add “Right idea, wrong timing.” Judge the neutral skater's read, never the child. Evidence names a shown cue. | Existing verdict kind. Connected SGS verdict items are **planned**, requiring authored and reviewed examples. |
| **10. Spot the mistake** | Detect a missed cue and explain its consequence. | Exactly one defensible mistake. Every other actor's behavior must be defensible; validate the scene, not only the shape of the key. | Existing reviewed UI kind. New SGS mistake content is **planned** and requires review. |
| **11. Pause and predict** | Anticipate a continuation and update after seeing it. | Existing standard starts U13; U11 expansion needs its stated review. All options reveal the same actual continuation, without punitive wrong-prediction framing. | Existing prediction kind. New SGS prediction items are **planned**. |
| **12. Explain, compare and reconsider** | Connect a reason to evidence, consider an alternative and adapt when a cue changes. | U7 discovery does not require written reasons. For positioning, support expression without keyword grading. Keep factual observations separate from tactical judgment. | Existing SGS reasons and coach comparison. **This build:** reasons preserved alongside the factual record; new AI judging is **not included**. |

## What variety means

### Accepted foundation formats added September 5

The owner subsequently asked to include all of the pictured teaching formats, including fill-in-the-blank and vocabulary. These extend the matrix; they are **planned for SGS**, not shipped by the three-format observation slice. Vocabulary and equipment are subject strands, rather than extra interaction types.

| Additional format or application | Example | Answer contract and age adaptation |
| --- | --- | --- |
| **Fill the blank** | “Players wear ___ on their feet to glide.” | For U7, tap/drag a skate picture or a short word-bank label; older players may type. Stable concept IDs and declared accepted synonyms; spelling is not the hockey score. One blank per first activity. |
| **Label a picture** | Match “puck,” “helmet” and “skates” to numbered callouts. | Callouts must bind to actual visible parts, with nonoverlapping targets and a keyboard equivalent. Avoid arbitrary number memorization. |
| **Match and sort** | Pair an item with the body area it covers; sort rink landmarks from equipment. | Extends row 8 beyond responsibilities. Explicit one-to-one/many-to-one mapping and category membership; no uncited safety claims. |
| **Complete a visual checklist** | Pack the required player equipment into a bag. | Preserve a set of selected item IDs, allow undo and gentle hints, and show missing items only at the chosen feedback boundary. Source the actual youth-player list; the manager-bag reference supplies layout inspiration only. |
| **Assemble a player** | Drag visible equipment to the corresponding body region. | Uses matching/placement, with an explicit target and item state. Dressing order is only scored if a reviewed source establishes the required dependencies. Recognition is not an equipment-fit certification. |

Foundation progression: **hear or see the term → identify the object → use it in context → explain or compare when age-appropriate**. Core hockey vocabulary precedes optional slang. No mandatory written explanation, spelling assessment or timer for U7. A professional-game infographic is not the rule source for U7 cross-ice play.

Each format needs original or licensed art, a reviewed source/concept binding, alternate response access, a typed response schema, coherent feedback and repeatable variant selection before release. Merely changing the activity title does not add a format. See the [game-based learning supplement](2026-09-05-sgs-game-based-learning.md) and [factory blueprint](2026-09-05-sgs-thousands-question-factory.md) for lesson examples and source gaps.

### Effects and changes of perspective

An action must have its actual visible consequence before a dependent question: **choose Pass → puck travels → F2 receives → explicitly switch the learner to D1 → place D1 and explain**. The puck is unowned in flight and owned by F2 only on reception. The controlled learner role, puck carrier and selected editor actor are separate fields. A role change moves the learner locator only after an explicit handoff. Subsequent branches must consume the resulting state; an independent reflection must be labelled as such and must not claim to alter the original continuation.

The factory supports this as a reviewed state graph with bounded read counts and termination, not an unvalidated endless chain. Pacing (**Frozen / Continuous**, both available from the start for the planned U11 engine) is independent of feedback (**Learning / Challenge**). Current mixed reads still freeze for decisions; animated continuation is not continuous learner decision-making.

Each generated question records its format, factual family, exact freeze/read identity, relevant actors, selected variant and answer contract. The candidate and source scene remain reproducible.

- **Meaningful factual variants in this slice:** current puck carrier, controlled player, goalie, carrier who moved, player who received the pass, change in carrier-to-net distance, and change in controlled-player-to-carrier distance. Only offer a family when its required state and comparison evidence exist. Actor taps use actor facts; MC and true/false also support the distance comparisons.
- **Meaningful tactical variants:** a changed gap, commitment, lane, support relationship or time window. These remain the scenario family's responsibility and need tactical review.
- **Delivery variants:** direct on-rink answer, concise text choice, boolean claim, Learning or Challenge feedback timing. Delivery changes do not count as new tactical states.
- **Presentation variation:** option order and alternate plain-language phrasing reduce repetition. They are reported as presentation variants, not additional learning objectives or new scenarios.

Use deterministic selection from a new-attempt seed; restore and replay must not reroll the prompt or options. A new attempt may choose new valid factual variants and ordering without changing or overwriting a previous attempt. Different seeds are not themselves proof of meaningful variation. Report factual families, generated questions and tactical states separately. Distance-change facts group changes within 0.5 metres as “about the same”; that is an explicit observation/display tolerance, not a tactical gap standard or validated hockey threshold.

## Bounded mixed-question flow

The mixed preview opens through `?arena=sgs&sgs=mixed#practice-arena`. Regular SGS and its v1 drafts remain available unchanged.

For each of the **three existing reads**:

1. Show the exact current freeze, including actual possession and the player's prior position.
2. Present one supported factual observation prompt using actor-tap, multiple choice or true/false.
3. Record the answer against that freeze. A selected option/actor is visibly acknowledged without revealing correctness early.
4. Let the learner place the isolated player, or choose Stay / Back / Forward, and optionally explain why.
5. Commit the read. In **Learning**, show the factual feedback and saved decision reflection now. In **Challenge**, retain them for the final review.
6. Run the existing supported continuation and show its next real freeze. The question generator consumes that state; it does not invent an event to fit a prompt.

After read three, both modes show the three factual responses with evidence and the three positioning decisions/reasons. Factual correctness is labelled as an observation result. No positioning mark, inferred game-sense gain, tactical approval or AI opinion is added.

The modes change feedback timing, not the source truth, accepted answers, continuation, attempt seed or optional-reason policy. A wrong factual observation does not silently relocate actors, change possession, cancel a defensible position or overwrite the answer on retry.

## Contracts and persistence

- Keep the pure observation generator and answer recorder in `src/one-on-one/sgsComprehensionCore.js`, separate from `positioningSequenceCore.js`.
- Derive the question from the current canonical read and, only when needed, its actual previous freeze. Treat the returned key as implementation data; no pre-answer rendering, colour or accessibility text reveals it.
- Actor answers store actor IDs; multiple choice stores stable option IDs; true/false stores booleans. Reject type-coerced booleans, absent actor references, unknown option IDs and stale question/state bindings.
- Record the actual input method, response, question/variant identity and read index. The positioning core continues to own positions, reasons and continuations.
- Persist one **separate mixed envelope** atomically, containing the unchanged positioning draft plus its comprehension attempt and paused state. The second workshop contract is independently versioned `rinkreads-sgs-mixed-v1`, stored at `rinkreads_sgs_mixed_v1:<encoded-player>:<candidate>`; its inner positioning envelope remains v1. This implements the requested isolated extension without rewriting or migrating any original workshop v1 key. The independent seed counter is `rinkreads_sgs_mixed_seed_v1:<encoded-player>`.
- Restore validates both halves together. Reject mismatched candidate/read/seed, duplicated or reordered observation records, mutated facts or a comprehension record that claims future positioning reads. A missing/corrupt half must not produce partial apparent progress.
- Camera rotation and 3D/tactical fallback are presentation changes. They never alter an answer, prompt seed, possession or the selected player's world coordinates.
- Read-only actor answer selection is distinct from player movement. Selecting the puck carrier for an observation must not grant permission to move that actor.

## Acceptance and evidence

Automated checks must exercise all three response shapes, multiple factual families per supported format, true and false claims, more than one roster size, multiple seeds, option stability, every read boundary and corrupted restores. Preserve legacy positioning and connected-read fixtures.

Browser checks use the actual preview on phone and desktop: actor-tap/keyboard, MC, true/false, Learning feedback after a read, Challenge withholding until the end, all three continuations, reload during an attempt, independent v1 bytes, changed camera angle and graphics fallback. Inspect questions against the visible players and puck; test scores alone do not prove visual coherence.

The implementation report must distinguish factual checks, completed three-read attempts, draft tactical configurations and approved lessons. This slice leaves live-bank admission, AI judging, new physics certification, additional ages and the remaining SGS formats outside its scope.

Implementation plan: [SGS question variety](../plans/2026-09-05-sgs-question-variety.md).

## Implementation checkpoint — September 5

The three-format mixed preview, exact-state persistence, local attempt archives and Learning/Challenge timing are implemented in the current worktree. The [rink presentation and mixed-read review](../../one-on-one/2026-09-05-rink-presentation-and-mixed-review.md) records the local 1v1/3v3 browser evidence, camera/neutral-rig changes and remaining verification. It distinguishes completed checks from the pending final suite/build and Shootout artwork review; it does not claim live release or approval of the remaining matrix formats.
