# SGS lesson plans: game-based learning and cross-sport ideas

**Date:** 2026-09-05. **Status:** implementation-ready design supplement; proposed lessons and fields, not approved hockey content or a completed build. **Owner direction:** include invasion games, a constraints-led approach and game-based basketball teaching, without adopting a particular commercial program. Consider other sports where a decision relationship may help teach hockey.

**Further accepted scope:** the supplied references become actual lesson formats: picture callouts/labels, matching, sorting, a player-bag checklist and packing interaction, dressing a player, and fill-in-the-blank with typed or picture/word-bank responses. Vocabulary develops across ages. Connected plays may change the learner-controlled role, such as a completed 2-on-1 pass followed by a defender-positioning read, and can have different bounded lengths. These requirements are included below; their implementations are not claimed complete.

**Latest completion rule:** “Why would you be there?” is **optional**. A committed position/choice—including a deliberate stay—can complete the read. A provided explanation supplies additional comprehension evidence; an omitted explanation is not wrong, failed or incomplete. Preserve it as not provided, and do not invent a reason, grade by keywords or make AI feedback penalize its absence.

**Latest focus rule:** the ring marks the named player the question is about, not automatically `YOU`. Declare `focusActorId` and `perspectiveMode: 'observer' | 'player'` separately from control, possession and camera angle. A read may ask about F1, the next about D1, and a later eligible read about D4. Every change needs an authored role/objective mapping and a real actor in the roster; random focus selection does not create a valid question.

Companion: [SGS factory blueprint](2026-09-05-sgs-thousands-question-factory.md). Preserve its source authority, age/surface eligibility, sequential state, question contracts, approval gates and honest counts.

## What we should borrow

Borrow **how a lesson creates a problem worth solving**: play a small situation, notice a relationship, act, see what changes, explain and try a different case. Basketball can suggest ways to expose spacing and movement; soccer can suggest checking for pressure before and after receiving; rugby can suggest contrasting a defender who commits with one who stays with the supporting player. The proposed hockey lessons below translate those relationships through hockey sources and physics. This is a design inference, not evidence that playing another sport—or this app—improves hockey performance.

Hockey Canada already describes small-area games as reduced-space activities built around game situations, with practice suited to the participant's age, size and skill. That supplies a hockey-specific basis for using small situations rather than importing an entire basketball or soccer practice. It does not validate our digital lesson outcomes. [Hockey Canada: small-area games](https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/small-area).

## Sources inspected and what they support

External sources were checked online on **2026-09-05**. Older publication dates are retained; online availability does not turn a coaching manual into a recent experiment. No external source below is evidence of RinkReads efficacy. These are short original summaries with direct references, not copied drills or diagrams.

| Primary source | Specific material inspected | Use and boundary |
| --- | --- | --- |
| [FIBA/WABC Mini-Basketball Coaches Manual](https://assets.fiba.basketball/image/upload/documents-corporate-mini-basketball-mini-basketball-coaches-manual-eng.pdf) | Sections 2.2–2.3, printed pp. 7–9: game-based activity and questioning. Section 5.3, printed pp. 35–40: 3x3, spacing, movement, pass/cut/replace and age-related passing distance. | Inspiration for short play–question–adjust cycles and contrasting off-ball relationships. Do not import court positions, exact distances, compulsory cuts or basketball rules as hockey answers. |
| [Australian Sports Commission: Game Sense](https://www.ausport.gov.au/schools/resource-hub/p4l/game-sense-approach) | Modified games, participant involvement, questions, observation and small amounts of specific feedback. The previous `sportaus.gov.au` link now routes through the updated resource hub. | A practical lesson-delivery pattern. It is not synonymous with constraints-led theory and does not require nonstop play or the absence of technical instruction. |
| [Renshaw et al., 2016: CLA and TGfU clarification](https://researchportal.ulisboa.pt/en/publications/why-the-constraints-led-approach-is-not-teaching-games-for-unders/) / [DOI](https://doi.org/10.1080/17408989.2015.1095870) | Author-institution abstract, including learner–environment interactions and task, environment and learner constraints; similarities and distinctions from Teaching Games for Understanding. | Conceptual terminology, not an intervention proving one method superior. Full-paper empirical appraisal was not performed. |
| [FIFA Training Centre: Scan to play forward](https://www.fifatrainingcentre.com/media/native/practice/talent-coach-programme/Christchruch_United-new.pdf) | Christchurch United session, pp. 2–4: inspect space and passing routes, account for a receiver's availability, adjust support around possession changes; small-sided positional games. | Inspiration for information checks and changing support. Do not import football foot/body technique, dimensions, touch limits or its timed rounds as hockey defaults. |
| [World Rugby: non-contact activities](https://www.world.rugby/the-game/game-participation/get-into-rugby/non-contact) | `2 v 1`: carrier/support/defender interaction; channel width and defender start position as variations. | Illustrates deliberate changes to the problem. Rugby passing restrictions and contact rules do not transfer. |
| [NRL Play Rugby League: Draw and Pass](https://www.playrugbyleague.com/settings/video-library/coaching-activities-pages/draw-and-pass/) | The written coaching description includes the alternative when a defender anticipates the pass and moves toward support. | Useful contrast against “always pass.” It is rugby coaching guidance, not hockey tactical proof. |
| [Hockey Canada: small-area games](https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/small-area) and [U9 skills](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-9/coaches/skills) | Age-appropriate skill development and small-area/station formats. | Hockey-specific context for the lesson structure; exact SGS tactics still require local claims, age profiles and review. |
| [Hockey Canada: equipment fitting](https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/equipment-fitting) and [parent FAQ](https://www.hockeycanada.ca/en-ca/hockey-programs/parents/faq) | Current player and goalie categories, separate playbooks, and parent equipment guidance. | Primary naming/catalog references for the foundation lessons. Recognition and virtual dressing do not establish protective fit or safe readiness; an adult handles the actual equipment check. Program-specific required/optional status must be resolved before a completeness score. |

The official [IHF teaching-handball booklet](https://www.ihf.info/sites/default/files/2020-03/H%40S_Booklet.pdf) was located, but direct retrieval failed in this review. Its search excerpt is not enough to establish a goalkeeper/shooter teaching contract. Handball goalie cues remain an acquisition/review lead, not an approved addition. No inaccessible manual was copied into the repository.

## Reconcile these ideas with the existing RinkReads decisions

The [July teaching decision](../../factory/SCENARIO-ENGINE-DECISIONS.md) and [decision-training philosophy](2026-07-29-decision-training-curriculum-philosophy-design.md) already adopted constrained-to-open progression and mechanism-based feedback. Keep that history, while presenting the new work as original RinkReads game-based teaching rather than a named basketball program.

Four distinctions matter:

1. **A simple rule is not, by itself, a constraints-led lesson.** A rule such as “make three passes” changes the task, but the designer must state which relationship it makes available to notice, how the learner can act on it, which solutions remain possible, and what unwanted habit it might encourage. CLA concerns interacting learner, task and environment conditions, not just restrictions or fewer answer buttons. This interpretation follows the conceptual distinction in [Renshaw et al.](https://doi.org/10.1080/17408989.2015.1095870); the SGS fields below are our proposed implementation.
2. **Openness, challenge, practice order and pacing are separate.** A clear one-opponent problem can still permit several useful positions. Repeating one cue before mixing cues is a practice schedule; it is not the same as opening more viable actions. Do not repeat the old local “most transfer” wording as a verified universal result.
3. **A constrained opener need not have one perfect coordinate.** Preserve the [family standards](../../scenario-family-standards.md) aim of a clear opening problem through a narrow objective, an unambiguous factual check or a supported action contrast. The user's approved open placement-and-why format can accept several positions. Do not manufacture a unique answer to satisfy an older closed-answer template.
4. **Current owner pacing overrides blanket time-pressure language.** U7 foundations are untimed; U11 Frozen and Continuous are available from the start. A static feature task remains legitimate. A digital token move tests an app decision/plan, not the child's skating technique or physical perception–action coupling.

Use the [existing hockey library](../../library/INDEX.md), [ledger](../../../src/data/curriculum-ledger.json) and factory-only approved claims for hockey meaning. Inspiration does not silently override them. In particular, do not reuse unverified young-age 2-on-1/forecheck suggestions, assume “square goalie = save,” or treat archived coaching-site triage as a fully acquired source.

## A compact cross-sport transfer map

Everything in the hockey-adaptation column is a **proposal**, with local source/claim review still required.

| Source sport and relationship | Proposed hockey lesson | What must stay sport-specific |
| --- | --- | --- |
| **Basketball: spacing, a cut and a replacement can change passing options.** [FIBA, §5.3](https://assets.fiba.basketball/image/upload/documents-corporate-mini-basketball-mini-basketball-coaches-manual-eng.pdf) | In 3v3, isolate the off-puck skater. Move to give a real passing option; after a pass, reassess whether to stay, change depth or enter different space. Bind `off-puck-support-offense` and `scanning`. | No automatic “pass then cut to the net,” basketball screening rule or court formation. Hockey lanes depend on sticks, skating trajectories, boards, possession and reach/timing. |
| **Soccer: inspect pressure and receiver availability, then recheck after the pass.** [FIFA session, pp. 2–4](https://www.fifatrainingcentre.com/media/native/practice/talent-coach-programme/Christchruch_United-new.pdf) | Identify useful information before reception; after actual possession changes, reposition relative to the new carrier. Use factual observation plus placement/why. | A full overhead view is not proof of a shoulder check. Football first-touch mechanics and body orientation do not specify hockey technique. Futsal-specific claims need their own source; this review inspected a football session. |
| **Rugby: a defender's commitment can change carry/pass opportunities.** [World Rugby 2v1](https://www.world.rugby/the-game/game-participation/get-into-rugby/non-contact), [NRL contrast](https://www.playrugbyleague.com/settings/video-library/coaching-activities-pages/draw-and-pass/) | A later U11 odd-man family contrasts a defender covering the carrier's route with one covering the receiver. Ask why a pass, carry or shot remains usable in the actual hockey state. | Do not teach skating into contact to “draw” a defender, mandatory backward passing, or “always pass in a 2-on-1.” Revalidate with the local odd-man claim, sticks, goalie, puck flight and receiving conditions. |
| **Handball: goalkeeper/shooter interaction—research lead only.** [IHF booklet, retrieval unresolved](https://www.ihf.info/sites/default/files/2020-03/H%40S_Booklet.pdf) | Potential future comparison for recognizing a changing shot opportunity. No handball-derived shot/goalie answer key proposed yet. | Hand release, goal dimensions, jumping, crease rules, protective equipment and saving techniques differ. Obtain an accessible primary source and hockey goalie authority first. |

The useful connection is the **relationship**—pressure, available support, movement and an opponent's response—not a promise of cross-sport transfer. An on-ice transfer claim needs a separate hockey evaluation; a new in-app example alone is not that evaluation.

## Reusable lesson cycle

This is an original SGS design informed by the sources above, not a reproduction of their activities.

**Try a small situation → inspect a cue → act → see the supported consequence → optionally explain/compare → change one meaningful condition → try again with the constraint relaxed where appropriate.**

Start with a playable problem and brief instructions. Offer short technical/help interjections where needed. A coach can select a constrained, limited-choice or open version; none guarantees the same answer. Coach personas vary tone, hints and follow-up wording while sharing the approved evidence/rubric. Avoid a forced pass quota in normal play unless it is explicitly labelled a temporary practice rule; later remove it to check whether the learner can choose when passing is useful.

At a single decision time, **simultaneous cues** are the information being related: carrier, defender, teammate and perhaps goalie. **Sequential reads** are later decisions after an actual carry, pass, movement or pressure change. Asking three formats at the same unchanged time is not three hockey reads. Multi-cue reasoning does not require multiple simultaneous physical clicks.

## Concrete lesson cards

All cards below are proposed content; their IDs are design identifiers, not catalog entries. They use the [question contracts](2026-09-05-sgs-question-variety.md) and require exact state/history, source provenance and age review before promotion.

### U7 — Ready for the rink

**Objective:** recognize familiar rink/equipment items through visual action. **Bindings:** existing rink-feature discovery; equipment catalog/source still required. **Method:** introductory discovery and sorting, not an invasion-game tactical lesson or a claim of CLA motor training.

- **Start:** “Find a faceoff circle.” Accept every visible eligible circle. Then “Put this hockey item in the bag,” using a named/pictured item from the approved catalog.
- **Constraint:** a small visible target set, large hit areas and a bag that accepts multiple eligible items. The purpose is recognition without reading overload, not memorizing one screen location.
- **Action and evidence:** actual drag or select-and-place, with keyboard/button equivalent; record selected item IDs and container assignment. No compulsory written reason or countdown. Gentle retry and a discovery reward.
- **Change:** move the item locations or change the viewing angle; later match the item to a picture/name. Those are recognition variants, not new hockey situations.
- **Do not infer:** selecting equipment does not establish correct fit, safety or game readiness. Optional/program-specific items cannot be universally scored as missing essentials.

**Current versus planned:** four rink targets already exist. Gear packing, equipment matching and an approved equipment catalog do not. Primary Hockey Canada naming/equipment sources have now been identified above; a versioned, program-checked catalog still needs to be created. This card cannot be admitted by borrowing basketball or rugby equipment lists.

### U7 — Picture words, my bag and my player

These are accepted **interaction formats**, not five different claims about what equipment is required. Reuse one source-bound term/item catalog across them, with original RinkReads artwork.

| Format | Concrete learner task | Contract and boundaries |
| --- | --- | --- |
| **Picture callouts / labels** | An original player picture marks skates, helmet and a nearby puck with numbered callouts. “Find the helmet,” or place its picture/word label at the corresponding callout. | Stable term and target IDs bind to the current image version; a display number is not the item's identity. Every callout remains visibly attached to the correct object at phone size. |
| **Matching** | Match a helmet picture to “helmet”; later match skates to the feet area on a clothed player. | Explicit acceptable pair set; U7 can hear/see a prompt and use pictures without reading. Audio narration is a planned capability, not assumed working. |
| **Sorting** | Put pictured gloves in “things a player wears” and a pictured puck in “things used to play.” | Define categories that do not overlap for the selected objects. A stick can be held and packed/carried, so do not use incompatible categories that make a defensible answer wrong. |
| **Checklist and pack the PLAYER bag** | Tap a picture checklist, then drag the named player items into a bag; show which catalog items are packed. | Multi-item set and duplicate rules; checklist completion refers to this exercise's selected set. A manager-bag reference supplies layout inspiration only—snacks, administrative supplies and team-manager items do not become player equipment doctrine. |
| **Dress the player** | Drag gloves to hands, skates to feet and helmet to head on a clothed/base-layer avatar; reveal labelled equipment layers where the catalog supports them. | Source-bound body-zone/item relations and accessible select-and-place alternative. Do not grade a universal dressing order or equipment fit from a picture. Keep sensitive/protective items described respectfully and age appropriately. |
| **Fill in the blank** | “My ___ go on my feet” with skates as a picture/word tile; “We play hockey with a ___” with puck; “I wear a ___ on my head” with helmet. | The blank references a term ID, accepted synonyms/inflections and a complete grammatical sentence. U7 uses tap/drag or supported narration with a picture/word bank; no compulsory typing or spelling score. Optional typed answers for suitable readers separate concept recognition from spelling. |

The supplied professional-game/rink poster is a reference for explaining landmarks, not authority for U7 periods, roster rules or positions. Under/outer-layer and around-the-body references inform the presentation; verify their labels against the catalog rather than tracing or copying commercial art. Adult/coach equipment resources should be linked separately from the child's recognition game.

### Vocabulary progression across the game

Use **name it → point to it → recognize it in a play → optionally explain its relevance**. U7 begins with rink, player, puck, net, circle and familiar equipment; the explicit rink tour may introduce blue line without an offside lesson. U9 adds simple space, teammate and pressure language when visible. U11 introduces carrier, receiver, passing lane and gap within their source-bound situations, with a plain-language explanation available.

Keep `termId`, preferred child wording, permitted synonyms, source, age/context, picture target, pronunciation/narration asset and explanation separate from the question format. A picture label, match and sentence blank can test the same term without claiming three new concepts. Optional age-appropriate slang is a separate, reviewed vocabulary collection; core teaching cannot depend on it. Do not import fighting, taunting or adult slang from a poster into U7 lessons. Voice input is not required or claimed implemented.

### U9 — Give a friend an option

**Objective:** recognize and create a simple support option. **Bindings:** `off-puck-support-offense` U9 I and `scanning` U9 I; use generic player roles and age-appropriate small-area ice. This particular example is explicitly player-perspective; its `YOU` copy is not a requirement for other lessons. [Support note](../../library/off-puck-support-offense.md), [scanning note](../../library/scanning.md), [U9 Hockey Canada context](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-9/coaches/skills).

- **Start:** a teammate visibly has the puck. One opponent stands between the carrier and YOU; another patch of ice has a usable route for a pass under the reviewed scene's conditions. “Move so your friend can pass to you.”
- **Constraint and purpose:** a 2v2 roster with only YOU movable and a clear area of play. Keep the cue load small; choose a reviewed opponent position that makes the passing relationship readable. This is a scaffolded support exercise, not an advanced forecheck/system.
- **Simultaneous information:** the carrier's location, the opponent and the route to YOU. No mandatory goalie reading or fixed position names.
- **Next read:** the carrier carries to a supported new location while YOU's exact chosen position remains. Ask, “Can your friend still reach you?” Use a true/false scene claim or another placement, not a forced repeated correct dot.
- **Adaptation:** offer a hint or clearer contrast if the child cannot see the relationship; later change the carrier's position with the same objective. Do not impose a speed penalty. If the placement invalidates the proposed continuation, preserve it and enter adjustment/discussion rather than inventing the pass.
- **Comprehension evidence:** an eligible support region and the visible lane can support the coach rubric; several positions may qualify. A short spoken/coached explanation may help, but no speech capture is claimed to exist. Pointer precision and reading speed are separate from hockey judgment.

This is original hockey content inspired by game-based spacing tasks. Wider space is not automatically better: the pass must remain feasible under the U9 profile. Neither the legacy normalized lane constant nor a football field dimension supplies the answer threshold.

### U11 — Pass, find new space, read again

**Objective:** maintain useful support as pressure and possession change. **Bindings:** `off-puck-support-offense` U11 D and `scanning` U11 D. **Roster:** 3v3; this named observer example sets `focusActorId: 'F2'`, `perspectiveMode: 'observer'` and permits F2 placement. The family can first be introduced through its eligible 2v2 sibling. Hockey source conditions determine all admissible positions.

| Read | Simultaneous information | Learner action and sequence |
| --- | --- | --- |
| **1: make an option** | F1 owns the puck; D1's location affects one route; F2 and F3 occupy different spaces. | “Where should F2 be?” Tap relevant evidence if scaffolded, then place F2; optionally explain the passing option. Start from the actual answer, not a prepared ideal formation. |
| **2: pressure changes** | A supported F1 carry and D1 approach change the lane/pressure relationship; the pupil's position persists. | Choose Stay / Back / Forward or move directly. Optionally explain what became available or closed. Other plausible locations remain eligible under the rubric. |
| **3: support the new carrier** | F1's supported pass has actually reached F3; possession and defender coverage now relate to that receiver. | Reposition F2 to support F3, with an optional explanation of the new option or reason to stay. If reception has not occurred, use the actual in-flight/loose state rather than saying F3 has it. |

**Constraint experiment:** begin with a clearly constrained defender approach that exposes one relationship, then permit another reviewed defensive approach and finally a case with more than one useful response. Record that a scripted defender is a scaffold; do not portray it as adaptive opponent intelligence. A future responsive defender policy needs validation of every reachable continuation class.

**What basketball contributes:** the design question “what does your movement make available after the pass?” **What it does not contribute:** an automatic cut, exact rink target or imported motion-offence system. The controlled hockey player may need to stay, support behind or move elsewhere. The counterexample where a cut blocks useful space is as important as the appealing cut animation.

**Check beyond the scaffold:** remove the temporary approach restriction in another reviewed case, preserve the same objective and ask the child to respond without the original cue hint. Success is evidence in that new app case; it is not proof of game transfer or lasting mastery.

### U11 — Read the chance, not just the target

**Objective:** relate defender coverage, a teammate's availability and the goalie's visible state before a shot/pass/carry decision. **Bindings:** local [odd-man reads](../../library/odd-man-reads.md) and [goalie late after pass](../../library/two-on-one-goalie-late-after-pass.md); fuller executable claims and appropriate goalie-state authority are still required.

Use a 2-on-1 contrast after the pilot claims are reviewed. At one moment, the learner relates the puck carrier, defender's stick/lane, teammate and goalie. After their actual action, ask the next read from the resulting possession and coverage. A shot question requires possession and a supported release; a pass response requires a reachable receiver. When both are defensible, the answer contract must permit both or ask for comparison.

Change one relationship deliberately—such as receiver depth or defender commitment—while retaining the others, then test a reviewed interaction. Do not create a guaranteed goal from a visual “open area,” reward aiming as hockey IQ, or use a handball analogy to certify a goalie position. Improve backdrop/net-area clarity only after this teaching contract is settled; answer-revealing highlights belong in released feedback or an explicitly recorded hint.

This is the proposed decision-training direction for the shooting game, not its current implemented behavior.

### A connected play can hand control to another role

The owner explicitly requested this pattern: **F1 chooses a pass → the puck visibly travels → F2 actually receives → the learner takes D1 → places D1, optionally explains → the next read follows the actual result**. Treat this as one causal graph with a role handoff, not separate reset scenes.

Show a neutral cue appropriate to the authored perspective: “Now look at D1” for observer mode, or “You control D1 now” when control is actually transferred in player mode. Keep the ring and named prompt aligned. `YOU` is an optional player-perspective alias, not the actor's identity. Record separately the question's focus actor, learner-controlled actor, permitted response actors, observed actors, actors acting during continuation, and puck owner. They often differ. Changing focus alone does not transfer control or alter state.

For example, “What should D4 look to do?” can offer recovery toward the slot only when the actual threat, uncovered responsibilities and feasible route support that response under the approved hockey context. Otherwise retain alternatives or route the question for review. The actor must exist in that family; D4 cannot be invented in a 3v3 roster. A focus ring identifies an already named question subject, not a correct location or action. When identifying an actor is itself the answer, avoid pre-highlighting that answer.

Handoff prerequisites include the declared event and current state; “pass released” does not imply “F2 received.” The decision graph can place a handoff during flight only if that is an explicitly authored objective with an in-flight state—not by pretending reception happened. The requested initial example hands off after reception. F1/F2 and other actors retain their actual positions, facing and ownership while D1 is moved. Validate the next continuation from D1's actual chosen point; never reset the previous attack to fit a preferred defensive answer.

Variable lesson lengths require declared entry/terminal nodes, permitted role transitions, branching limits and a maximum depth per reviewed family. Three reads remains the initial pilot pattern, not a permanent engine limit. Unsupported or ambiguous continuations stop in a preserved adjustment/review state. This does not authorize infinite generated chains or simultaneous multi-role control without its own contract. Current implementation work includes the shared focus contract and a named D1 extension; a general dynamic D4 curriculum and unrestricted handoff engine are not built or approved.

## Frozen/Continuous and Learning/Challenge

Retain the owner's four combinations without a proficiency unlock:

| Pacing | Learning | Challenge |
| --- | --- | --- |
| Frozen | Freeze for the committed action and optional why; release feedback after that completed read. | Freeze for the action and optional why; release feedback after the play. |
| Continuous | Keep the decision window live; bind response to commitment time/state; at its boundary, pause for brief reflection and feedback. | Keep supported decision windows live; preserve timestamped actions; reflect and release feedback after the play. |

A frozen layout move is a planning answer. A continuous destination command needs a feasible movement model; it is not teleportation. Timeouts record no-response or a supported default game event, never an invented child choice. Expired cues cannot be graded against an older freeze. Hints, help, replay and accessible inputs are recorded rather than hidden penalties. U7 foundations stay untimed.

Current SGS implements frozen answers, authored animated continuations and Learning/Challenge feedback. Full continuous learner decisions, these new lesson plans and adaptive constraint policies remain planned. U11 Continuous is an approved requirement, not a claim that its code has been delivered.

## Proposed SGS fields

Add a versioned `lessonDesign` extension to the family/lesson contract; do not create another independent scene state. The names below are recommendations for the implementation plan. None is claimed to exist today.

| Field | Required meaning and validation |
| --- | --- |
| `lessonDesign.version`, `methodTags` | Version plus tags such as `game-based`, `constraint-experiment`, `foundation-discovery`. Tags never confer tactical approval. |
| `objectiveId`, `hockeyClaimRefs`, `inspirationRefs` | Separate canonical objective/approved hockey evidence from cross-sport methodology. Include source locator, version and retention status. |
| `vocabularyRefs`, `equipmentCatalogRef`, `pictureTargetMap` | Versioned term/item IDs, synonyms, age/context, approved categories/body zones and targets bound to asset versions. Keep numbered callouts separate from semantic IDs. |
| `ageProfileRef`, `surfaceRef`, `rosterEligibility` | Sourced physical/age context and allowed actor configurations; no automatic all-ages/all-rosters multiplication. |
| `gameGoal`, `practiceRuleOverrides` | The task's visible aim and any temporary rule, its reason, scope and removal condition. Distinguish practice points from hockey scoring. |
| `constraints[]` | Each has `id`, `domain` (`task`, `environment`, `learner-support`), `parameterPath`, units, approved values, affected actors/events, purpose, predicted observable relationship and undesirable-side-effect check. Only allowlisted parameters may change. |
| `constraints[].evidence` | Link the cue predicate and boundary fixtures that make the constraint relevant; a rule count alone is not evidence. |
| `openness`, `challengeProfile`, `practiceSchedule` | Independently record admissible-option openness, cue/skill demand and repetition/interleaving policy. Do not reduce all three to a level number. |
| `cueSets[]` | Named simultaneous cues with actor/event IDs and visibility prerequisites at one time; no answer labels baked into learner highlights. |
| `readGraph`, `transitionPolicyRef` | Existing canonical sequential state/history plus supported movement/possession transitions; state whether opponent behavior is scripted or responsive. |
| `focusActorId`, `perspectiveMode`, `answerActorIds` | Bind the named subject, observer/player wording and permitted response targets to each read. Align ring, prompt and targets; preserve stable IDs and prevent answer-revealing focus. Camera angle does not change perspective mode or permissions. |
| `learnerControlledActorId`, `observedActorIds`, `actingActorIds`, `roleHandoffs` | Separate control, evidence and continuation roles from `puckOwnerId`. Each handoff records from/to actor, trigger event, effective state/time and neutral learner cue. Declare graph terminals and maximum depth. |
| `pacingModes`, `feedbackModes`, `decisionWindows` | Frozen/Continuous availability independent of Learning/Challenge; bind each live window to actual start/end conditions, commitment state and no-response behavior. |
| `answerContractRef`, `reasonRubricRef`, `inputCapabilities` | Typed selection/boolean/placement/path/matching data, admissible alternatives, input equivalence and exact evidence/reason scope. |
| `completionPolicy`, `reasonStatus` | Position/action confirmation can complete the read; `requiresReason: false`. Distinguish `not-provided` from a provided explanation. AI or coach analysis may use provided reasons as additional evidence; absence is neither a failed answer nor an inferred misunderstanding. |
| `blankSlots`, `sortingCategories`, `containerRules`, `dressTargets` | Per-slot term IDs and accepted wording, category cardinality, multi-item packing/duplicates and item/body-zone relations. Enforce actual promised interaction; U7 has no mandatory typing/spelling test. |
| `adaptationPolicyRef`, `adaptationLog` | Versioned allowed adjustments with trigger evidence, chosen change, reason and seed; apply between reads/attempts, never silently mutate a committed answer or its rubric. |
| `scaffoldRemovalProbe` | A reviewed later variant that relaxes the temporary constraint/hint while preserving the objective; outcome is app-case evidence, not an on-ice-transfer label. |
| `evidenceLimits`, `reviewState`, `dependencyHashes` | Current limitations, actor/goalie authority gaps, review status and recall dependencies. New claim/policy changes re-enter gates. |

Example adaptation record, for a proposed U11 support lesson:

```json
{
  "policyId": "support-contrast-pilot-v1",
  "trigger": "learner-requested-clearer-cue",
  "fromAttemptId": "recorded-attempt-id",
  "changes": [
    {
      "constraintId": "defender-approach-contrast",
      "parameterPath": "familyParams.defenderApproachClass",
      "from": "reviewed-borderline",
      "to": "reviewed-clear-contrast"
    }
  ],
  "applyAt": "next-attempt",
  "preserveOriginalAttempt": true,
  "pacingModeUnchanged": true,
  "tacticalScoreInferred": false
}
```

These are categorical design placeholders pending the reviewed family—not a hidden metre threshold or an implemented object. The next attempt must resolve to an eligible, validated candidate; if none exists, offer help or coach review rather than fabricate one.

Begin adaptation with explicit learner/coach requests and explainable coverage rules. Any later performance trigger needs a reviewed policy, enough meaningful evidence and recorded hint/input conditions. Do not label a motor miss or reading delay as tactical misunderstanding. Do not unlock Continuous based on success, let AI silently alter the acceptable answer set, or repeatedly expose the same cue under new words and count it as progress.

## Build and review sequence

1. Add these fields to the proposed lesson/family contract and source crosswalk before making a new generator. Preserve all existing draft and attempt versions.
2. Finish the U7 equipment catalog from the identified primary sources and bind all accepted picture/matching/sorting/packing/dressing/blank formats. Finish one U11 support family card and a bounded pass-to-defender handoff. Review clear, changed-cue, multiple-acceptable and invalid examples.
3. Build the input/evaluation adapters and approved pacing modes against the same canonical scene. Keep ordinary scaffolding and genuine responsive opposition labelled distinctly.
4. Verify both simultaneous visibility and sequential causality: no hidden required cue, overwritten placement, imagined pass reception or old-freeze continuous grading.
5. Test constraint side effects. Removing a pass quota should not make every non-pass wrong; increasing space should not create an impossible pass; a restricted defender should not appear able to make moves outside its policy.
6. Review source/tactical/age validity, then desktop and phone interaction, including direct drag/tap/path where promised, keyboard equivalence and every eligible target. A source citation or a working animation is insufficient alone.
7. Playtest one changed context after a scaffold is removed. Log what the learner noticed, chose and explained. Route ambiguity to review. Record uncertainty rather than claiming broad transfer or efficacy.

The [factory blueprint](2026-09-05-sgs-thousands-question-factory.md) still governs calibration, promotion, deterministic delivery and recall. New tactical doctrine remains outside the learner catalog until approved. The free-only provider policy is unchanged: mechanical tools can assist generation; they do not replace designated tactical judgment.
