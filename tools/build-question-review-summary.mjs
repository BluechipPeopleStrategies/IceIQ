import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const dir='docs/factory/research/question-review';
const read=file=>JSON.parse(readFileSync(join(dir,file),'utf8'));
const review=read('combined-review.json');
if(review.counts.questions!==1600||review.counts.openQuestionFlags)throw Error('Complete the final review audit first.');
const changes=readdirSync(join(dir,'repairs')).filter(f=>f.endsWith('.json')).flatMap(f=>read(`repairs/${f}`).changes||[]);
const repaired=new Set(changes.map(r=>r.questionId));
const expansion=review.coverage.filter(r=>r.questionId.startsWith('exp26b-')||Number(r.questionId.split('-q')[1])>6);
const output=`# Question bank review — 200 experimental scenarios

September 5, 2026. The mixed expansion adds 1,000 questions: 100 new scenarios with six questions each, plus four follow-ups on each of the original 100 scenes. The authoring catalog has 1,600 questions. Normal practice presents 1,500, including 200 optional reflections (13.3%); another 100 reflections remain available in authoring and direct links. All remain outside approved-bank and mastery admission.

| Evidence | Final result |
|---|---:|
| Questions with a complete first AI review | ${review.counts.firstPass} |
| Questions with an independent second AI review | ${review.counts.secondPass} |
| Added questions reviewed | ${review.counts.expansionQuestions} |
| Added questions receiving an independent second review | ${expansion.filter(r=>r.secondReviewed).length} |
| Added questions checked again after content or scene edits | ${expansion.filter(r=>r.revisionRechecked).length} |
| Unique question IDs in this turn's repair receipts | ${repaired.size} |
| Open reconciled AI findings | ${review.counts.openQuestionFlags} |

Reviewers used GPT-5.6 Luna. The initial 600-question review used medium reasoning. Weak expansion drafts were rejected; replacement authoring and review used Luna with high reasoning effort. A different reviewer checked every flag, high-risk question and subsequent repair. Every receipt is bound to the scene and question actually reviewed.

## Repairs and retained decisions

Repairs address wrong player references and movement targets, net direction and rink-area geometry, unstated possession changes, incorrect answer keys, repeated teaching targets, weak distractors, and conditional feedback. Scene corrections recheck all affected questions, even when the question text itself did not change. Some changes are wording or scene-context corrections; the repair count is not a count of separate tactical failures.

The original four repairs remain recorded in revisions.json and revisions-second-check.json. The later 55-item follow-up retained 54 scoped planning routines and repaired the U9 corner-pickup scan question. Further owner feedback corrected the U13 rim and board locations and the approved YOU grammar. These repairs have separate versioned receipts and independent rechecks of every affected scene/question hash. Unaffected original content is preserved.

Not every reviewer proposal was accepted. For example, F2 was correctly the nearest player in the disputed U11 loose-puck distance question; a suggested replacement point in the U18 rotation was still too low; and future branches were clarified as hypothetical rather than silently changing the freeze. Earlier findings remain available as history alongside the final adjudications.

The returned Claude calibration packet covered 50 questions. Codex adjudication and independent Luna review produced five scenario updates affecting 28 exact question hashes. Repairs include receiving-side geometry, net-front passing angle, YOU grammar, credible distractors and conditional feedback. A repeated rim-placement task now moves W to offer a shorter board-side outlet after control. The proposed goalie-contact rewrite was declined. A first independent recheck retained one finding; the revised W question resolved it. See [calibration decisions and operating lessons](calibration/calibration-adjudication.md). The original Claude ZIP stays frozen as the historical baseline; its processed packet 01 cannot be re-imported against newer live versions.

## Returned packets 02–06

The September 5 follow-up repairs 23 experimental scenarios and 115 affected question hashes. Codex read the full replacements; Luna independently rechecked 16 further question amendments and all six questions affected by a corrected blue-line briefing. Original Claude returns remain frozen. Packets 07–09 subsequently repaired 14 more scenarios and 72 question versions after an independent Luna recheck, including additional geometry, grammar and conditional-feedback corrections. See [packets 07–09 receipt](packets-07-09/application-receipt.json). Packets 10–11 then repaired nine scenarios / 45 question versions, including retained questions missed by the source review, with an independent exact-hash recheck: [receipt](packets-10-11/application-receipt.json). Packet 12 repaired three question versions in one rebound scenario: the circle/defender location, a placement that previously moved farther from the puck, and explicit whistle/stoppage feedback. Both retained-question defects were found during root adjudication and independently rechecked: [packet 12 receipt](packet-12/application-receipt.json). Full evidence: [packet application receipt](packets-02-06/application-receipt.json) and [independent recheck](packets-02-06/independent-final-recheck.json).

The U7 support/receiving bindings for exp26b-u7-007 and exp26b-u7-008 remain curriculum holds. A clean exact-content audit is not curriculum admission, human coach approval, or on-ice validation. The current 1,600 authored prompts yield 1,300 non-reflection questions and 200 optional reflections in normal practice (1,500 visible prompts).

## Use the result

- [Before-and-after samples with downloadable feedback](repair-samples.html)
- [Searchable catalog and Claude context builder](../../claude-question-kit/catalog.html)
- [Claude authoring contract](../../claude-question-kit/START-HERE.md)
- [Full Claude project parameters, historical checks and return contract](../../claude-project/RINKREADS-CLAUDE-PROJECT.md)
- [Curriculum coverage map](../../curriculum-map/index.html)
- [Original 55-item follow-up](followup/review.html)
- [Final combined review manifest](combined-review.json)

The local app's experimental workshop supports current-version flags, revision drafts and opening each question on the rink. Saving a draft or validating a Claude batch does not publish it. New batches need the same review and repair process.

## Reproduce the evidence

Run these from the repository root, in order:

1. \`node tools/audit-experimental-coaching.mjs\` — verifies the original 600 and their targeted versioned repairs.
2. \`node tools/audit-question-expansion.mjs\` — verifies all 1,000 additions, independent coverage, repair chains and final content hashes; produces combined-review.json.
3. \`node tools/build-question-catalog.mjs\` — regenerates the 200/1,600 HTML, JSON and CSV catalog.
4. \`node tools/build-question-repair-samples.mjs\` and \`node tools/build-coaching-followup.mjs\` — regenerate readable examples from actual receipts.
5. \`node tools/build-question-review-summary.mjs\` — regenerates this summary.

Files ending in first.json retain the frozen first-pass hashes. Second and recheck reports can reference later versions. Repair receipts preserve before/after evidence; their creation-time status is historical. The exact current status comes from combined-review.json, not a stale intermediate queue. Historical catalog-review.json covers only the original 600 and is superseded by the combined manifest for the workshop.

## Boundaries

AI review is not approval by a credentialed human coach. The rubric prioritizes puck management, fundamentals, time and space, scanning, communication and flexible responsibilities, with explicit North American rule and system differences. No universal positionless system is claimed.

The content audit checks text, answer logic, sources and canonical scene relationships. It does not certify every rendered camera angle, skating physics, on-ice transfer or measured frequency of real-world questions. Tactical and placement responses are coaching discussions without objective scores. Human feedback can still identify improvements after this audit.

The purchased Jack Han book was unavailable. Public descriptions informed topics only; no unseen book pages, proprietary diagrams or question wording were reproduced. Source references explain support for general principles, not permission to copy or certification of an original scenario.
`;
writeFileSync(join(dir,'README.md'),output);
console.log(JSON.stringify({repairedQuestionIds:repaired.size,...review.counts}));
