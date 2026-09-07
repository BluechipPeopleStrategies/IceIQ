# Experimental bank: critical coaching review

Owner decisions, September 5, 2026: one full review of all 600 questions, with an independent second review of every flag and high-risk question. Use lower-cost GPT-5.6 Luna agents, medium reasoning, compact context. These are AI coaching reviews, not approval by credentialed human coaches.

## Coaching standard

Prioritize puck management, sound fundamentals, decisions based on time and space, scanning, support, pressure, and risk in the given situation. Use a broad North American development perspective. Explain Canadian/US, age, checking, offside, icing, rink-format and team-system differences where material. Do not import professional systems into youth without adaptation.

Prefer flexible responsibilities over rigid jersey-position rules: puck carrier, supporting attacker, defender pressuring the puck, defender supporting away from it. This is a teaching lens, not a claim that one positionless system is universally prescribed. Roles still require coverage, communication, timing and awareness. Accept defensible alternatives when the question and feedback state the conditions. Flag false certainty, including implied certainty in a suggested answer.

Source leads checked September 5: USA Hockey, Culture & Coaching Tips with Grace Hoene (March 6, 2020), https://www.usahockey.com/news_article/show/1093178, identifies four situational roles at 14U; USA Hockey 12U Learn to Train document, https://portal.usahockey.com/cx/vice-president/hockey-development/12u_learn_to_train_stage-adm.pdf, introduces situational roles and decisions in small-area play. Massachusetts Hockey, Stay in Your Lane? Not in Today's Game (2023), https://www.mahockey.org/news_article/show/1291500, discusses flexible roles. Search excerpts were accessible; direct article fetches returned 403. These support the role-based lens, not every bank answer. Reviewers must verify precise rules using current official rulebooks where relevant.

## Every question must be examined

Read the complete scenario and all six questions, not merely sample representative questions or run a validator. Check:

1. Hockey accuracy and whether the claimed best/suggested answer follows from visible or explicitly stated cues.
2. Canonical geometry: navy attacks +x, gold -x; actors, puck, named space, passing lane, defensive side, reference position and facing agree with prose. A static diagram cannot prove timing, future possession, offside skate status or execution success.
3. Fundamental technique, puck protection, skating, support and pressure; distinguish direction from unsupported handedness/reach claims.
4. Age/readability and actual rink format: U7/U9 simple, adult-supported where needed; no silent full-ice rules in cross-ice tasks.
5. Plausible alternatives and useful wrong-answer choices. Reject trivial distractors, word-matching, false certainty, ambiguous factual keys and fake mandatory action order.
6. Six-question variety and learning value: distinct purposes, useful reflection, meaningful placement. Flag generic repeated templates when they fail to test the scenario.
7. Evidence: sources support their stated scope; book marketing is inspiration only. No copied passages/diagrams, unseen-source endorsement or claims that curricular topics are measured common questions.

High-risk means rule-dependent, injury/contact/safety, goaltending technique, narrow timing/offside assertions, or high-consequence tactical certainty. Mark these even if no issue is found, for a second reviewer. Do not classify every tactical question as high-risk solely because it is tactical.

## Deliverable contract

Write only your assigned review JSON under docs/factory/research/question-review/. Do not edit bank or app. Use schema:

```json
{"reviewer":"age lane / GPT-5.6 Luna","reviewKind":"AI coaching review","reviewedAt":"2026-09-05","coverage":[{"questionId":"...","scenarioVersion":1,"status":"pass|flag","highRisk":false,"riskReason":"","findingIds":[]}],"findings":[{"id":"lane-001","severity":"P1|P2|P3","questionIds":["..."],"scenarioIds":["..."],"category":"hockey|geometry|age|ambiguity|rules|teaching|source","issue":"Specific observed problem","evidence":"Exact option, coordinates or source receipt","recommendedChange":"Concrete repair","sourceUrls":[]}],"limits":[]}
```

One coverage row for every assigned question. A grouped finding may cover a repeated defect, but enumerate every affected question ID. P1 wrong/unsafe/key contradicts scene; P2 material ambiguity or weak learning/age fit; P3 polish. Report uncertainty instead of inventing a rule. Do not certify unseen rendering; root verifies browser behavior separately. Include exact reviewed file SHA-256 hashes in a top-level fileHashes object so later changes cannot silently inherit this review.
