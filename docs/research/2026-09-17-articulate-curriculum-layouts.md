# What RinkReads can borrow from Articulate

September 17, 2026. Research and proposed direction, not an approved app redesign.

Thomas's intent: glean useful curriculum/course-layout ideas from wherever they help. No preferred Articulate product or specific reference course. This comparison uses current official Rise/Storyline documentation and the local RinkReads code/design; no private Articulate course was accessed.

## Recommendation

Keep the six hockey worlds as the curriculum map. Inside each world, offer one clear Start/Continue action that launches a short, coherent mission. Borrow Rise's reusable lesson blocks and Storyline's decision branching to organize the mission. Let the learning objective determine the interaction; the player should not have to choose a format before learning.

Proposed hierarchy: **World → learning goal/mission → teaching and practice steps → challenge → later recall.** This is a content hierarchy, not five menus to click through. The app chooses the next useful step. A course outline can be available as a secondary view for older learners, parents and coaches.

This extends the approved September 7 worlds-as-container direction. It does not require buying Articulate or moving RinkReads into it. Authoring/export integration would be a separate evaluation if wanted.

## The useful patterns

| Articulate pattern | RinkReads application | Caution / decision |
|---|---|---|
| Rise: lessons assembled from text, media, interactive and check blocks | A reusable sequence of Show a cue → try it → receive feedback → try a meaningful variation | Blocks are teaching tools, not additional navigation destinations. Avoid decorative interactions that add no learning. |
| Rise: continuous or stepped microlearning | Use one focused screen at a time as the first candidate for younger players; consider a short scrolling recap/reference for parents and older players | Age fit is a proposal to test, not evidence that either navigation style improves learning. |
| Rise: ungraded knowledge checks, distinct from quiz lessons | Make coached practice safe to retry; keep World Challenge results and spaced mastery evidence distinct | Finishing a page or revealing a hint must not award mastery. |
| Storyline: scenes/slides connected by branching triggers | A player's read leads to a supported next state, then another decision; missed cues can lead to a focused explanation and retry | In RinkReads, preserve actual puck/player state. Branches cannot manufacture a hockey consequence to reward a preferred answer. |
| Rise: adjustable sidebar navigation | An optional mission outline showing where the player is and what comes next | Do not reinstate the multiple competing menus the worlds design was meant to remove. |

Sources: [Rise lesson/block types](https://www.articulatesupport.com/article/Rise-Lesson-and-Block-Types), [Rise microlearning navigation](https://www.articulatesupport.com/article/Rise-360-Create-New-Microlearning), [Rise knowledge checks](https://www.articulatesupport.com/article/Rise-How-to-Use-Knowledge-Check-Blocks), [Storyline Story View and branching](https://www.articulatesupport.com/article/Storyline-360-Using-Story-View), [Rise navigation controls](https://www.articulatesupport.com/article/Rise-360-Control-Course-Navigation). Product capabilities are source-supported; their suitability for RinkReads is our design inference.

## Three layouts worth comparing

### 1. Guided mission — proposed default

**One goal → see/hear an example → try → explain/replay → try a changed example → recap.**

Best initial candidate: the existing U7 vocabulary companions. Keep the visible landmark central, use short prompts, and provide a tap alternative to any drag. Do not add a changed-cue step where simple recognition is the objective. Risk: too much explanation before the player acts. Alternate brief teaching with action.

### 2. Decision story — for connected reads

**See the situation → choose → inspect the resulting supported state → read again → compare.**

Best initial candidate: the existing U11 cause-and-effect companions. A before/after comparison can test a changed cue without claiming a complete new simulation. Full consequence branches require the existing scenario/state validation and coaching review. Risk: branching creates many unreviewed paths; begin with one bounded, source-supported comparison.

### 3. Return practice — for later visits

**Recall a prior idea → one variation → focused feedback → next useful practice.**

Use the existing spaced practice record to select eligible material. This is a proposed arrangement of current practice, not an Articulate-proven spaced-learning feature. Risk: a stream of isolated questions can hide the goal. Name the concept and give the player a clear ending.

These layouts can coexist behind the same Start/Continue action. Do not add three new player-facing mode buttons.

## Current RinkReads fit

- `src/player/PlayerLearningHome.jsx` still has Learn the game / Practise a read buttons, worlds and a separate experimental action. `src/one-on-one/PracticeHub.jsx` exposes worlds/guided/library/discovery learning views.
- `docs/superpowers/specs/2026-09-07-world-container-progression-design.md` is marked approved but unimplemented. It already specifies worlds as the single learning entry, one Start button inside a world, mixed question formats, separate challenge unlocking and spaced mastery. Preserve those decisions unless Thomas revises them.
- `docs/one-on-one/SGS-PLAN.md` already supports source concept → scene → connected reads → checks → coach review. Articulate supplies useful presentation patterns around that structure.
- `docs/factory/companion-lessons-8/RELEASE.md` identifies existing U7/U11 experimental material suitable for a layout comparison. Its availability does not establish qualified human calibration or mastery eligibility.

## Smallest useful next experiment

Storyboard the same existing U7 lesson as a stepped mission and a short scrolling lesson. Storyboard one U11 lesson as a linear before/after comparison and a bounded decision story. Hold the question content and learning objective constant so layout is what changes. These four storyboards are proposed next work, not delivered prototypes.

Compare: can a player begin without adult navigation help; find the relevant cue; recover after an error; explain what changed; return later and handle a new example? Inspect phone/tablet readability and keyboard/tap alternatives. Record observed behavior before choosing a default; completion speed alone does not demonstrate learning.

No app, authored question, unlock threshold, mastery rule or paused 3D work changed for this research.
## Research/delegation record

Official Articulate sources checked September 17, 2026. Some support pages returned empty bodies on direct open; indexed official documentation supplied the stated feature evidence. No claim of inspecting a finished private course or conducting learner testing.

Local Qwen first-pass critique attempted via localhost:11434 using the installed qwen3.8-huihui:27b model, a compact verified-facts brief, 2K context and 400-token cap, thinking disabled. It timed out after 60 seconds with no draft. No retry or worker escalation; coordinator retained source checking and final synthesis. Files: work/articulate-qwen-request.json and work/articulate-qwen-error.txt in the active Codex task. Savings unmeasured. No Claude/Codex worker used.
