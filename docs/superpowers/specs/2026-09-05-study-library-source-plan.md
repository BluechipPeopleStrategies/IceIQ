# Study library: source plan and first fact collection

Date: 2026-09-05  
Status: Source plan plus a reviewed daily-reading subset; not a new scored question bank.

## Decision and boundary

Build the Study library from small, attributable claims, then connect those claims to original learning missions. A large collection of sentences is not a curriculum. A claim states something supportable; an objective says what the child should understand; a question or action provides evidence of that understanding.

The owner has now requested a few fresh sourced facts each day. The accompanying [40-atom seed](../../library/study-facts-seed-2026-09-05.json) marks **31 statements eligible for unscored Daily Hockey Intel** and keeps nine in research only. This is a narrow reading-content decision. None of the 40 is admitted as a scored scenario question or as proof of physical hockey ability.

Keep this work connected to the [SGS factory blueprint](2026-09-05-sgs-thousands-question-factory.md), [question-variety design](2026-09-05-sgs-question-variety.md), and [game-based learning supplement](2026-09-05-sgs-game-based-learning.md). Existing source authority remains the [engine decisions](../../factory/SCENARIO-ENGINE-DECISIONS.md) and [canonical engine design](2026-07-29-scenario-engine-design.md). The July 11 amendment in the [research-library design](2026-07-10-evidence-led-curriculum-research-library-design.md) removed mandatory coach approval for curriculum concepts; documentary corroboration remains required. Daily reading, concept admission and scenario promotion are separate decisions.

## What the repository actually contains

This inventory was checked before the parallel Daily Intel implementation. It describes the starting content, not a claim that the new daily UI is already finished.

| Existing material | Verified inventory | Reuse and gap |
| --- | --- | --- |
| [Study content](../../../src/data/studyContent.js) | Five age bundles, U9–U18: 18 watching prompts, 22 focus/drill records and 15 suggested games | Useful organization and homework ideas; no direct source fields. These are 55 mixed records, not 55 factual claims. |
| [StudyScreen](../../../src/App.jsx) | Weak self-ratings and recent quiz categories inform suggestions; watching/homework flags are stored per player | U7 has no bundle and currently falls back to U11. Reading/completion flags are not comprehension evidence. |
| [Hockey insights](../../../src/data/hockeyInsights.js) | 132 entries in 30 categories; all have a source string, none has a direct HTTP source URL | Treat as an audit queue, not 132 verified facts. Numerical claims need a numerator, denominator, population, season and direct receipt. |
| [Curriculum ledger](../../../src/data/curriculum-ledger.json) | 31 concepts, 157 age nodes, seven source-model tags | Model tags help find evidence but do not themselves substantiate a particular claim or answer. |
| [Concept library](../../library/) | 12 substantive notes; the index is incomplete | Reuse local teaching concepts after tracing each claim to the relevant source passage. |
| [Source folder](../../library/sources/README.md) | An acquisition/checklist README; no collected PDF corpus in that folder | Do not describe this as an already indexed research library. |

Before reuse, remove unsupported universals from Study suggestions. Examples needing contextual review include “one stick length” as a fixed gap, fixed decision-time targets, and backchecking to a particular line before anything else. The insight about actual puck possession also needs its time denominator checked before using a precise percentage. This audit does not establish that every historical statement is wrong; it identifies what is not yet traceable.

## Source collection that can grow

Use named official sources first, retain exact section references, and keep the learner wording original.

| Collection | Suitable coverage | Current receipt and limitation |
| --- | --- | --- |
| Hockey Canada equipment education | Names, locations, clothing layers, player/goalie gear recognition and preparing a player bag | [Equipment index](https://hockeycanada.ca/en-ca/hockey-programs/players/essentials/equipment-fitting) and linked 2026 fitting-page descriptions. The seed uses page text; the embedded videos were not watched. Digital recognition does not certify fit or protection. |
| Hockey Canada age pathways | Age, playing surface, introductory activities and program-specific context | [U7](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-7) and [U9 FAQ](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-9/faq). Do not import NHL restarts or full-ice assumptions into a small-ice lesson. U9 transition guidance and Member choices matter. |
| Hockey Canada rules | Restarts, possession events, legal actions, penalties and jurisdiction-specific situations | The [official downloads page](https://www.hockeycanada.ca/en-ca/hockey-programs/officiating/downloads) lists the 2026–2028 rules, updated July 2026. That complete PDF was not retrievable in this audit. Indexed rule-page text was available, but its edition was not established. Six seed rules therefore remain excluded from daily delivery. |
| USA Hockey coaching | Support, changing space, lane relationships, changes of pace and small-area learning | [Zone entries and puck support](https://www.usahockey.com/news_article/show/775908), dated March 30, 2017, and [small-area games](https://www.usahockey.com/news_article/show/723494), dated November 17, 2016. The indexed primary article text was inspected; direct page opening returned an access error. Their concepts are conditional, not universal correct positions. US age labels are not an automatic Canadian age crosswalk. |
| IIHF terminology and current rules registry | Rink/equipment vocabulary; later, explicitly IIHF-scoped rule comparisons | [Terminology](https://www.iihf.com/en/events/2026/olympic-m/static/71791/ice_hockey_terminology) and [rules registry](https://www.iihf.com/en/static/55352/rules_regulations_guidelines). The glossary's attacking-zone row has an unrelated description; reject that row. An official publisher still needs passage-level checking. The current full rulebook was not inspected. |
| NHL education and records | Older-player professional-game context, positions and dated historical facts | [Positions](https://www.nhl.com/kraken/news/hockey-positions-explained-323011708) and [historical rules](https://records.nhl.com/history/historical-rule-changes). Professional-game facts must carry NHL scope and a relevant date, rather than teaching them as U7 program rules. |

No paid acquisition is needed for this initial collection. Public access alone does not authorize a bulk archive of videos, artwork, drills or complete publications. Retain citations and short original evidence notes by default; record any permission before retaining or adapting protected assets. Do not clone commercial checklists or the owner's reference posters. Their interaction layouts can inform original designs.

## Taxonomy and age progression

Content topics and interaction formats are separate axes.

| Topic | Initial learning | Later application |
| --- | --- | --- |
| Equipment and preparation | U7: recognize a helmet, match gear to body, pack a player bag, distinguish an under-layer | U9: notice a missing item; later distinguish roles/equipment. An adult checks actual fit. |
| Rink and vocabulary | U7: find a line, circle, net, puck or boards using pictures or a 3D rink | U9–U11: describe relative position and direction; introduce zones in the appropriate surface context. |
| Game events and rules | U9: recognize simple events within the actual program | U11+: reviewed possession/restart/rule cases, with exceptions and current jurisdiction identified. |
| Support, space and pressure | U9: find an available teammate in a simple scene | U11+: read simultaneous cues, act, watch the actual consequence, and make the next read. |
| Team roles and transitions | Recognize named players without a fixed first-person assumption | U13–U18: responsibility changes, alternative systems and multiple defensible decisions. |
| Observing physical technique | Recognize equipment, body position, motion or a coach's demonstrated cue | No digital claim of edge control, balance, strength, skating or shot execution. Real practice evidence belongs in training/coach records. |
| Professional and historical context | Optional interest content when developmentally useful | Every statistic has an official dated receipt; trivia does not substitute for playing understanding. |

For U7, use pictures, matching, sorting, picture labels, word banks, packing and dressing interactions. Narration is a planned access option. Do not require typing, spelling, written explanations or time pressure. A vocabulary item can progress from name → point to it → recognize it in play → explain its role. Explanations remain optional; omitted text is not a wrong or incomplete action.

Example: the atom “neutral zone lies between the blue lines” supports an initial visual label and later a zone-entry scene. Rotating the camera creates another presentation of the same atom, not another hockey fact. Reading its card does not establish that the player can make a safe zone-entry decision.

## Content and evidence contract

The JSON seed supplies:

- Stable semantic `id` and `conceptId`, version, topic, term, original learner text and eligible age bands.
- An original application prompt and candidate interaction formats. These are authoring suggestions, not validated question renderings.
- Context fields for ruleset, surface and role; explicit conditions for conditional claims.
- A direct URL and section for every source reference, plus source publisher, publication/edition data when known, check date and inspection method.
- Separate evidence, edition, age, daily-delivery and curriculum states. `deliveryEligible` is the sole daily-content allowlist flag; `curriculumAdmission` remains false.
- An explicit absence of a physical-transfer claim.

Before broader ingestion, add nullable `definition`, `example`, `counterexample`, `exceptions`, `effectiveFrom`, `effectiveTo`, `jurisdiction`, `sourcePassageLocator`, `evidenceFingerprint`, `reviewer`, `reviewedAt`, `supersedes`, `claimRelations` and `assetRights`. Null means unknown; it must not silently imply universal scope.

Separate internal and player presentation fields:

```json
{
  "claimId": "play.puck-support",
  "internal": {
    "sourceRefs": ["exact passage"],
    "conditions": ["receiving space and passing route are available"],
    "evaluationRationale": "authored scenario-specific geometry and tactical rubric"
  },
  "player": {
    "term": "Puck support",
    "lessonText": "Move into space where your teammate can pass to you.",
    "prompt": "Where can F3 help?",
    "feedbackByOutcome": {"supported": "That gives F3 room to receive the pass."}
  },
  "evidence": {
    "readingReceipt": true,
    "comprehensionEvidence": null,
    "physicalCompetenceEvidence": null
  }
}
```

That example is a proposed contract, not new executable grading. A source claim does not establish the pictured pass is open. The scenario state and reviewed answer contract must establish that. In particular, no “shoot” prompt may assume a carrier while the puck is still loose or in flight. Named focus, observed actor, learner role and possession remain separate.

## Deterministic collection and expansion

1. Inventory canonical source URLs and accessible sections. Record edition and retention mode before extraction.
2. Extract one bounded claim per record. Keep wording, examples and scope separate. Reject incomplete passages and unresolved contradictions.
3. Normalize term aliases, units and jurisdiction. Hash the canonical claim/context, not just its sentence.
4. Detect exact duplicates and nearby semantic candidates. Present suspected duplicates for evidence reconciliation; a text model's similarity score is not a factual ruling.
5. Crosswalk concepts and ages to the ledger. A null concept match is an explicit research gap.
6. Validate citations, versions, fields and rule effective dates. Check arithmetic and denominators independently for quantitative facts.
7. Review support and suitability. Publish a versioned daily-reading allowlist separately from curriculum and scenario admission.
8. Generate questions only from admitted objectives and approved format contracts. Validate answerability, state continuity, source/rules context, visible cues, plausible alternatives and age-appropriate copy.
9. Preserve old claim/question versions in attempt history. A revised source can retire future delivery without rewriting what a child actually saw.

A repeatable ingestion tool, review UI and automated duplicate report are proposed work. This artifact does not claim they exist.

Count four different things: **unique approved claims**, **reviewed question instances**, **presentation variants**, and **deliveries**. One fact with four wordings is still one fact. One scene asked from three roles may test three objectives, but each needs an actual objective and answer contract. Replaying the same mission is another attempt, not new competency evidence by itself.

There is no verified basis yet to promise thousands of unique useful hockey facts. Thousands of worthwhile question deliveries are plausible from an expanding reviewed claim set and scenario families; the actual count must come after validity, duplication, rights, age and review filters. Do not generate filler to meet a numerical target.

## Daily reading and a meaningful journey

The first daily subset has 31 eligible atoms. Age overlap currently yields U7: 19, U9: 25, U11: 16, U13: 12, U15: 7 and U18: 7. These are eligibility counts, not distinct new sets; the total remains 31. Older-player coverage needs expansion before claiming a long-running fresh feed.

Daily selection should be stable for player, local calendar day, age and catalog version; prefer distinct concepts and avoid repeats until the eligible catalog round is exhausted. Three cards per day does not make the pool inexhaustible. Catalog changes need a recorded version and migration policy. Viewing a card earns a reading receipt, not GS or tactical mastery.

The owner's journey request calls for an original explorable progression with meaningful missions. Use completed learning objectives and later demonstrated comprehension to open new challenges. Keep recognition of physical techniques distinct from performing them. Preserve current training logs and coach feedback as the appropriate place for real practice evidence.

The apparent KidStrong reference is supported in a limited way: its [official Summerville page](https://summerville.kidstrong.com/) describes ranks, increased responsibilities and celebrating progress; it also describes repeated practice/testing and weekly recognition. The page does not publish exact rank thresholds. Borrow the general idea of visible milestones, not its proprietary curriculum or an invented ranking formula.

For RinkReads, keep two visible records: **consistency** from distinct practice days and **competency** from relevant completed concept missions. Scrolling, raw XP and repeated identical answers cannot establish the latter. No faster rank for a paid tier, no loss of demonstrated competency for a rest day, and no claim that digital rank certifies physical skill. Exact rank thresholds and journey implementation belong to the parallel journey design, not this source artifact.

Frozen/Continuous pacing remains independent from Learning/Challenge feedback. A mission can use both options around the same objective. Silence or elapsed time must not become a fabricated learner answer.

## Delivery sequence and acceptance

1. Ship only the explicitly eligible daily facts through the separate reader. Preserve old Study read flags and quest callbacks.
2. Replace the U7→U11 fallback with actual foundation content in its own implementation slice.
3. Audit the 132 legacy insights by claim, starting with unsupported precise numbers and universal tactical advice.
4. Expand source coverage into useful gaps, especially U15/U18, and corroborate concepts before curriculum admission.
5. Bind reviewed claims to the existing SGS factory and original journey missions. Keep physical-practice achievement in its own evidence stream.

Before release, check that every eligible atom resolves to a primary URL and a supporting passage; no rule with an unverified edition is delivered; all age labels are valid; IDs and versions are unique; daily reading cannot alter scored answers; and internal source/scoring notes do not appear in the child prompt. Then inspect actual age-specific delivery and repeated-day behavior. This document and JSON alone do not establish those UI checks passed.

