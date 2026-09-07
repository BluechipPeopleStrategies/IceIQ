# One play, several perspectives: seven or eight connected reads

**Date:** 2026-09-05. **Status:** authoring proposal, grounded in the current source opening; no new executable scenario, approved claim, physics trace, tactical grading or live-bank admission is represented by this document.

## Accepted direction and scope

Thomas wants to keep one situation moving and ask about different participants: “What should F3 do to support the teammate?” and, after a turnover, “Where should the first forward back cover?” Seven or eight decisions may belong to one play. The ring marks the named player concerned by the current question, not automatically YOU or the puck carrier. A committed action or position completes the response; “Why would that help?” is optional additional evidence.

The player surface is **3D only for now**, including an overhead camera angle. Failure offers retry and preserves the answer/state; it does not silently switch to a tactical board. Camera changes never change the answer or world coordinates. Frozen/Continuous pacing and Learning/Challenge feedback remain independent choices. The general multi-role graph and full continuous decision runtime described below are planned; current three-read previews and the bounded D1 sidecar do not implement this eight-read family.

This is the concrete companion to the [SGS factory blueprint](2026-09-05-sgs-thousands-question-factory.md), [question-variety contract](2026-09-05-sgs-question-variety.md) and [connected template design](2026-09-05-connected-scenario-template-engine.md). The [canonical engine design](2026-07-29-scenario-engine-design.md) and [engine decisions](../../factory/SCENARIO-ENGINE-DECISIONS.md) still govern validation and approval.

## Exact source opening: U18, not U15

The quoted question “Which play uses the clear route after you read both defenders?” belongs to [curriculum-draft.json](../../../src/one-on-one/curriculum-draft.json), lesson **`practice-draft-u18-both-defenders`**, question **`practice-draft-u18-both-defenders-mc`**. The lesson is U18, `odd-man-reads`, `draft-for-review`. Its current correct option is index **0**, pass to F2. The paired true/false item uses the same frozen board; it is not another moving read.

The source reference is [odd-man-reads.md](../../library/odd-man-reads.md), with `approvedClaimId: null`. Its USA Hockey URL is recorded as a principle-level source that was not independently refreshed in that pack; this document does not claim to have reverified the external page or obtained approval for the new continuations. Preserve the existing source question, key and visual. A new family version binds to them rather than overwriting them.

Coordinates are **rink-centred metres**, not normalized 0–1 points. Navy/home attacks the right net in the opening.

| Stable source actor ID | Display identity in the new observer family | Team / opening role | Exact x, y | Exact facing, radians | Opening possession |
| --- | --- | --- | --- | --- | --- |
| `YOU` | **F1**; explicit display alias only | Navy / first carrier | 14, −4 | 0 | Has puck |
| `F2` | F2 | Navy / support | 21, 5 | −2.18992145975477 | No |
| `F3` | F3 | Navy / support | 21, −6 | 2.7354945952721774 | No |
| `D1` | D1 | Gold / defender | 18, −2.77 | −2.9282240114379854 | No |
| `D2` | D2 | Gold / defender | 19, −5.43 | 2.6759470452496616 | No |
| `G` | G | Gold / goalie | 25, −0.6 | −2.8667303157906203 | No |

The source stores possession as the one actor's `hasPuck`, not a separately measured puck transform. [GuidedCurriculum.jsx](../../../src/one-on-one/GuidedCurriculum.jsx) currently adapts it to owner `YOU` with visual puck offset `(+1, +0.58)`. That offset is presentation evidence, not a validated stick-contact measurement. A compiled family must author a stick-contact opening consistent with the renderer and pin the adaptation/version; it must not claim the source supplies a physical puck-release trace.

Keep the six identities throughout. `YOU` → display label F1 is a one-time alias for this derivative family, never a player substitution. F2 does not become F1 after receiving. D1 stays D1 when gold wins possession. The family initially contains **one goalie**, belonging to gold. Its proposed recovery section ends before a shot at navy's net; a later full-rink extension needing a navy goalie must declare that participant from the start of a separately reviewed roster, not spawn one mid-play.

## What the notes support, and what they do not

| Source | Use in this family | Boundary |
| --- | --- | --- |
| [Odd-man reads](../../library/odd-man-reads.md) | Carrier compares the defender's influence on pass/shot; support stays available; several actor perspectives can use one situation. | The note's objective example is a particular 2-on-1, not automatic proof of every 3-on-2. Its older always-YOU framing is superseded by Thomas's named-observer direction. |
| [Off-puck support, offense](../../library/off-puck-support-offense.md) | A receiving position needs space and a usable path **from the carrier to that receiver**. | The legacy normalized `0.035` lane check is a seed convention, not a universal tactical distance or an approved metre-scale region. The note has broad source labels rather than a directly verified citation for every new rule. |
| [Scanning](../../library/scanning.md) | Recheck after receiving and after a defender changes a relevant relationship. | Answering or turning the camera does not measure a shoulder check or prove an on-ice scanning habit. |
| [Backcheck recovery](../../library/backcheck-recovery.md) | Consider the dangerous inside support option when a teammate is handling the carrier. | No citation section or approved claim is supplied. It does not establish “first forward always goes to the slot.” |
| [Defender gets beat](../../library/backcheck-recovery-defender-gets-beat.md) | If the teammate handling the carrier loses that route, the returning player may need to become the next defender. | Conditional: verify the carrier threat, teammate coverage, recovery path and support responsibility in the actual state. It is not permission to abandon support whenever the puck moves. |
| [Gap control](../../library/gap-control.md) | Manage space and protect the middle while remaining able to adjust. | Speed, direction and help matter. A fixed distance from the carrier cannot by itself grade the decision. |
| [Curriculum ledger](../../../src/data/curriculum-ledger.json) | Canonical concept IDs: `odd-man-reads`, `off-puck-support-offense`, `scanning`, `backcheck-recovery`, `gap-control`. | Source lineage and age entries are not approval of these eight transitions. This exact family retains the source's U18 age; a U11/U15 sibling needs its own reduction and age review. |

The separate U15 support lesson is **`practice-draft-u15-two-angles`**, with F1 carrying and YOU receiving. It is useful for a first drag-to-area preview, but it must not be spliced into this opening as if it were the same board.

## The connected authoring map

**S0 is the existing source freeze. S1–S8 below are proposed states to author and validate.** They describe required relationships and possession events, not coordinates, speeds or animation that already exist. The table follows one possible pass–support–shot–turnover path. It does not decree that every action must produce that path.

An animation starts from the **actual** committed state. Free placements remain exactly where the learner put them. Each proposed next event must still be feasible; otherwise choose a supported branch or pause for adjustment/discussion. Do not snap a player to a reference spot to reach the next row.

| Read / entry state | Named focus and child question | Response format | Simultaneous evidence at this read | Proposed event producing the next read |
| --- | --- | --- | --- | --- |
| **1 · S0: opening 3-on-2. Owner `YOU` / F1.** | **F1:** “Where should F1 send the puck?” | Tap a receiver, or the existing clear-pass multiple choice. A different format is the same read. | D1 lies toward the shot; D2 affects the pass to F3; compare the whole F1→F2 and F1→F3 paths and receiving space. | Reference branch: F1 releases a pass, puck owner becomes null while in flight, then **F2 receives and controls**. D1/D2 responses require authored visible routes. S1 begins only after that reception. Other initial choices require their own continuation or a shorter supported terminal. |
| **2 · S1: F2 controls; defenders have reacted to the pass.** | **F3:** “Where could F3 go so F2 can pass to F3?” | Drag F3 into an area; select F3 then tap ice; equivalent keyboard position controls. Explicit **stay here** can count if already useful. | F2→F3 path, D2's current reach/pressure, F3's room, and the other navy support player. No “closest player wins” rule. | Animate F3's submitted movement from its real origin; F2 keeps the puck during the available time. A declared D1 movement changes pressure on F2. S2 keeps the exact F3 endpoint and records whether the new passing opportunity is still usable. |
| **3 · S2: F2 still controls after the supporting movement.** | **F2:** “Can F2 use the pass to F3 now, or keep the puck?” | Draw/select a pass to F3 or choose a carry destination; optional spoken/typed reason. | Actual F3 placement, D1's new pressure, D2's path and F1's alternative support. | Reference branch only if feasible: F2→F3 release, flight, **F3 controls**. A blocked pass cannot be animated through D2. Carry or another supported answer changes the next state; it cannot be relabelled as an F3 reception. |
| **4 · S3: F3 receives on the changed side.** | **F3:** “What should F3 do with the puck now?” | Choose a shot, carry or eligible pass; optionally tap the visible cue that influenced the decision. Cue selection is evidence within this read, not an extra read. | F3→net path, goalie position/movement, nearby defender and available teammate. | Reference branch: a physically possible shot, then an authored goalie contact/deflection leaves a **loose puck**. The source pack supplies no shot/save trace or approved goalie rule: author and review this consequence. A save does not retroactively make a supported shot wrong. A goal, controlled goalie cover or different chosen action leads to a truthful alternate terminal/branch. |
| **5 · S4: puck is loose after the shown deflection; nobody owns it.** | **F1:** “Where should F1 go while the puck is loose?” | Drag a recovery/support destination or short route. | Who can reach the loose puck, D1's visible approach, F2/F3 positions and the route back toward navy's end. Do not ask F1 to shoot without possession. | Reference branch: D1 reaches and **gains control** during the actual movements, while F1 keeps the submitted recovery route. If F1 or another navy player instead reaches/control first, follow that result; do not force a gold turnover to satisfy the outline. This read is omitted/merged if there is no distinct visible loose-puck decision window. |
| **6 · S5: D1 controls and gold turns toward the opposite end.** | **F1, only when verified as first navy forward back:** “F1 is the first forward back. Where should F1 go to protect the middle?” | Draw a recovery route or drag a reachable destination. | D1's carrying direction/speed, D2's support, F2/F3 recovery, and who can cover the carrier. “First back” is established by shown history and reachable coverage, not the F1 label or nearest x-coordinate alone. | Animate F1's actual recovery and D1's carry. Reference S6 has F1 established against the carrier and F2 recovering toward the inside support threat. If F1 is not first back or cannot establish cover, ask the actual eligible actor/different recovery question; never assert the role falsely. |
| **7 · S6: one navy player handles the carrier; support is also dangerous.** | **F2:** “F1 is with the puck carrier. Where should F2 go to help?” | Tap the relevant threat, then place F2. These are two parts of **one** read at one freeze; the threat must not be pre-highlighted as the answer. | Verify F1 actually contains D1; compare D2's inside support path with the puck chase; F3's current recovery matters too. | If coverage remains sound and no new decision cue occurs, finish after seven reads. An eighth is allowed only if a validated continuation from the actual placements shows D1 beating F1 and changing the immediate danger. Do not script F1 getting beaten regardless of the chosen position. |
| **8 · S7: the shown carrier route has beaten F1's coverage.** | **F2, if now the reachable next defender:** “D1 has got past F1. What should F2 do now?” | Move F2 into a reachable protective area or revise the recovery route. Optional compare-to-previous-position review after commitment. | The carrier's immediate route, F1's lost coverage, D2's support and F3's help. Distinguish this from the previous support-cover task. | Animate only a validated short continuation from F2's placement, then reflect. If another actor is the reachable next defender, use that authored role mapping. No automatic claim that one move guarantees a stop, a save or a covered slot. |

The final step is a **conditional eighth read**, not a demand to manufacture eight questions. Reads 2 and 5 may also merge or terminate when a meaningful decision window is absent. A proposed eight-node graph is not proof that an eight-read play has been completed.

## What makes a support area acceptable

Thomas explicitly wants drag-to-area answers with tolerance. Store a **reviewed set of acceptable regions and relational conditions**, not one coach dot as the only truth. The following is a rubric to author and calibrate, not a ready-made hockey score:

- The destination and route stay in the permitted rounded rink and are reachable from the actor's actual start during the stated opportunity.
- The pass goes **from the actual carrier/puck to the selected receiver's proposed location**. Assess the relevant defenders and any route that becomes blocked during the opportunity.
- The receiver has usable space under the shown pressure; a line through an opponent is not rescued by being close to a reference point.
- The position offers a distinct option rather than occupying the carrier's space or reproducing another already-covered route, when that is this read's teaching objective.
- Several regions may satisfy the rubric. An already-valid position supports an explicit stay answer. Direction toward or away from the net is not by itself correct.

Keep three tolerances separate: **input tolerance** for a child's finger/keyboard; **authored region boundary tolerance** for the reviewed acceptable area; and **physical reach/pressure parameters** tied to age/skill, units and the actual motion. Do not inflate the latter to make a drop pass. At an uncertain boundary return a gentle retry/review result, not a false precise tactical grade. A position outside all reviewed areas may be unreviewed rather than tactically disproven.

Each region requires positive examples across its interior and edges, negative examples just beyond relevant boundaries, and adversarial examples that are close to the coach point but have a blocked pass. Mirror/camera tests must preserve the same world-space result. On submission, the response records the real point and all predicate results. A canonical “correct reference” overlay appears only at the mode's feedback time and illustrates one solution among the accepted set.

### Existing primitive reuse audit

[point-scorer.js](../../../src/scenario/primitives/point-scorer.js) and [place-scorer.js](../../../src/scenario/primitives/place-scorer.js) resolve a single target/semantic zone through [zones.js](../../../src/scenario/zones.js), then compare Euclidean distance with a tolerance. They can support a **mechanical** one-target check. They do not assess possession, lane quality, pressure, reachable motion, multiple alternative regions or hockey correctness. The placement scorer requires all declared items to match; it is not an “any acceptable area” adapter.

These primitives use normalized x/y. Their circular tolerance maps to an ellipse in physical rink coordinates because rink length and width differ. The schema comment about “rink width” must not be mistaken for metre-scale distance: the implementation compares normalized axes directly. The default `0.05`, zone defaults and [path-scorer.js](../../../src/scenario/primitives/path-scorer.js)'s `0.035` intercept radius are not new tactical authority. Validate finite values and rounded-rink bounds before using them; the old scorers' type checks alone are not enough for a new world-space contract.

For the first U15 support-region preview, bind to `practice-draft-u15-two-angles-mc`: carrier **F1 (14, 0)**; movable **YOU (19, 6)**; F2 (20, −5); D1 (17, −2.5); D2 (21, −4); G (25, 0). Evaluate a region around a useful F1→YOU relationship rather than repurposing `oz-slot` or treating the old reference point as universally correct. Keep this derivative preview's responses and provisional result separate from the source MC index-0 scoring. No proposed polygon or physical threshold is approved in this document.

## A second connected family: adjust the gap as the attacker moves

The requested gap-control drag exercise uses the same graph and response contract:

1. Show a short approach with an attacker carrying toward the defender's net. Ask the named defender to choose a position that protects the middle while allowing adjustment.
2. Animate the **actual** defensive choice and the attacker's authored advance. If speed/direction changes the available space, ask the defender to adjust again.
3. Introduce an authored supporting attacker or recovering teammate only if already declared in the opening roster, then ask the defender to read the new carrier/support relationship. Alternatively finish after two meaningful reads.

Acceptable space depends on speed, direction, relative movement, the dangerous route and available help. A static screenshot cannot prove “matching speed”; motion context and a validated movement trace are prerequisites before automatically grading that criterion. A fixed metre radius around a defender dot is insufficient. If the carrier slows or changes direction, the next answer is evaluated against that changed state, not the first freeze. This is a planned family using [gap-control.md](../../library/gap-control.md), not an approval to transplant normalized seed thresholds.

## JSON-shaped graph contract for implementation

The following is valid JSON illustrating **proposed fields**, not a schema already accepted by the current engine. Null hashes, missing reviewed region coordinates and missing transition traces intentionally make it non-compilable. Before execution, all referenced versioned artifacts must resolve; no unresolved symbolic evaluator is allowed in a promoted lesson.

```json
{
  "familyId": "draft-u18-3v2-multiple-perspectives",
  "version": 1,
  "status": "authoring-proposal",
  "compileEligible": false,
  "ageBand": "U18",
  "source": {
    "file": "src/one-on-one/curriculum-draft.json",
    "lessonId": "practice-draft-u18-both-defenders",
    "questionId": "practice-draft-u18-both-defenders-mc",
    "questionHash": null,
    "approvedClaimIds": []
  },
  "actorIds": ["YOU", "F2", "F3", "D1", "D2", "G"],
  "displayNames": {"YOU": "F1", "F2": "F2", "F3": "F3", "D1": "D1", "D2": "D2", "G": "G"},
  "coordinateFrame": "rink-centred-metres",
  "presentation": {
    "rink": "3d-only",
    "perspectiveMode": "observer",
    "cameraChangesAnswer": false,
    "pacingChoices": ["frozen", "continuous"],
    "feedbackChoices": ["learning", "challenge"],
    "whyRequired": false
  },
  "entryReadId": "r1",
  "maxCommittedReads": 8,
  "reads": [
    {"id": "r1", "focusActorId": "YOU", "ownerRequired": "YOU", "contractRef": "choose-receiver-r1", "afterEvent": "F2-reception", "next": "r2"},
    {"id": "r2", "focusActorId": "F3", "ownerRequired": "F2", "contractRef": "support-regions-r2", "afterEvent": "F3-arrival-and-D1-pressure-change", "next": "r3"},
    {"id": "r3", "focusActorId": "F2", "ownerRequired": "F2", "contractRef": "pass-or-carry-r3", "afterEvent": "F3-reception", "next": "r4"},
    {"id": "r4", "focusActorId": "F3", "ownerRequired": "F3", "contractRef": "shot-carry-pass-r4", "afterEvent": "goalie-contact-loose-puck", "next": "r5"},
    {"id": "r5", "focusActorId": "YOU", "ownerRequired": null, "contractRef": "loose-puck-recovery-r5", "afterEvent": "D1-recovery-confirmed", "next": "r6"},
    {"id": "r6", "focusActorId": "YOU", "ownerRequired": "D1", "eligibilityRef": "first-returner-YOU-confirmed", "contractRef": "first-returner-regions-r6", "afterEvent": "carrier-coverage-established", "next": "r7"},
    {"id": "r7", "focusActorId": "F2", "ownerRequired": "D1", "contractRef": "inside-support-coverage-r7", "edges": [
      {"event": "coverage-held-no-new-cue", "terminal": "seven-read-reflection"},
      {"event": "F1-coverage-lost-F2-next-defender-confirmed", "next": "r8"}
    ]},
    {"id": "r8", "focusActorId": "F2", "ownerRequired": "D1", "contractRef": "next-defender-regions-r8", "terminal": "eight-read-reflection"}
  ],
  "responseContractExample": {
    "id": "support-regions-r2",
    "format": "place-actor",
    "answerActorIds": ["F3"],
    "acceptsExplicitStay": true,
    "inputMethods": ["drag", "select-and-tap", "keyboard-position", "stay-button"],
    "optionalReason": true,
    "evaluation": {
      "stateBindingRequired": true,
      "units": "metres",
      "regionSetRef": "pending-reviewed-F3-support-regions",
      "relationRefs": ["F2-to-F3-pass-availability", "F3-receiving-pressure", "reachable-F3-route", "rounded-rink-bounds"],
      "toleranceProfileRef": null,
      "unreviewedAnswerResult": "needs-review"
    },
    "playerCopy": {
      "prompt": "Where could F3 go so F2 can pass to F3?",
      "whyPrompt": "Why would that help? (optional)",
      "feedbackByRuleRef": "pending-reviewed-player-feedback"
    },
    "internalRationaleRef": "pending-source-bound-support-rubric"
  },
  "transitionPolicy": {
    "referencePathOnly": true,
    "missingAlternative": "preserve-answer-and-stop-for-review",
    "validateActualStateBeforePlayback": true,
    "resetActorsToTemplate": false,
    "possessionDuringPassFlight": null,
    "maxSameNodeVisits": 1
  },
  "transitionTraceRefs": [],
  "reviewStatus": {"tactics": "pending", "physics": "pending", "age": "pending", "playerCopy": "pending", "visual": "pending"}
}
```

The compact graph lists the reference route; a production version must resolve every offered option to a validated edge, a truthful terminal or an explicit review stop. “Next” is never permission to assign the named owner without the required event.

Every response record stores `readId`, actual entry state/time/hash, observed actor IDs, focus actor, any controlled/acting actor IDs, response/route, exact input method, optional explanation status/text, rubric/version and actual exit event/state. Role focus can change without any actor moving. The next **decision** requires a new relevant cue or authored changed objective; merely switching focus on an unchanged freeze is another perspective probe, not an additional temporal read.

## Delivery and feedback rules

- **Frozen:** each decision uses a definite shown freeze, followed by validated movement. **Continuous:** the same family runs in time and commits each response against its actual state/timestamp; a frozen key cannot grade a later situation. Timeout is no-response, not an inferred pass/shot or a penalty for an optional reason.
- **Learning:** release feedback after the complete committed read, including any optional reason the learner chose to supply. **Challenge:** keep correctness/reference areas hidden until the supported play ends. Neither mode should reveal the answer in a caption, focus ring, option label, tooltip or accessible name before commitment.
- A neutral focus ring may identify F3 when the task is to place F3. If the task is “Which teammate is in danger?”, the ring must not preselect the answer. Show possession where relevant; do not display irrelevant puck markers on a rink-feature identification task.
- Child copy names the relationship: “The pass from F2 to F3 is clear” or “D1 is between F3 and the net.” Internal predicate names, parameter values, lane checks and validation rationale belong in author/reviewer metadata. Separate player feedback is bound to the same meaning and supported answer set; missing copy must not fall back to raw rationale.
- A supported placement may receive “That gives F2 a way to pass to F3.” A blocked result may say “D2 is still between F2 and F3. Try giving the pass another way around.” Do not guarantee an outcome or infer a child's intent. AI may add a source-bound explanation when available; missing optional prose is not failure. Local mechanical scoring is not authority for unreviewed hockey judgments.

## Review and implementation order

1. Pin the exact source opening, label alias and source binding. Keep U18 here; create a separately reviewed simpler-age derivative if wanted.
2. Implement/reuse the region response contract in a bounded preview, starting with the separate U15 F1→YOU support board if that is the chosen first demo. Prove acceptable-set boundaries, counterexamples, stay answers and input/camera equivalence before calling it graded hockey comprehension.
3. Author reads 1–3 with actual possession transfers and two acceptable F3 placements. Show that each placement produces its own feasible continuation without snapping.
4. Author shot/loose-puck/turnover alternatives with reviewed motion. A controlled goalie cover, goal, failed pass or navy recovery must not be routed into fictitious D1 possession.
5. Author the returning-player eligibility and inside-support/coverage-lost contrast. Document any coaching-system-dependent responsibility. Review the seven-read terminal and conditional eighth independently.
6. Validate every offered action, finite/rounded coordinates, player/puck collision and reach, flight/reception ordering, no roster spawning, state/history restore/export, no-repeat bounds, camera/phone visibility, no pre-answer disclosure, and Frozen/Continuous × Learning/Challenge delivery. Run a hockey review separately from mechanical validation.

The next review artifact should be a playable, source-bound partial graph plus its branches and accepted-area examples. This blueprint does not admit seven or eight unvalidated questions to the bank or count a proposed path as approved factory output.
