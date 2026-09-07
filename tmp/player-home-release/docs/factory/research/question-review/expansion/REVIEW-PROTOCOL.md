# Review the 1,000-question addition

Use the critical-coaching-review rubric in the parent research directory. Read the full original/composed scenario and every assigned question. Authors do not independently approve their own content. These are GPT-5.6 Luna AI reviews, not human coach approvals.

Read only content files. Write only your named review file. `tools/experimental-bank-files.mjs` exposes `readBankFiles()` returning `{original,newScenarios,additions,bank}`. It composes all candidate files, irrespective of browser release status. `tools/question-batch-core.mjs` exposes `questionContentHash(s,q)`: SHA-256 of `JSON.stringify({scene,question:q})` where scene is the full scenario excluding `questions` and `version`.

Each first-review file:

```json
{"reviewer":"unique-reviewer-name","model":"gpt-5.6-luna","reviewedAt":"2026-09-05","coverage":[{"questionId":"ID","scenarioId":"ID","scenarioVersion":1,"contentHash":"sha256","status":"pass","highRisk":false,"riskReason":"","findingIds":[]}],"findings":[{"id":"unique-finding-id","questionIds":["ID"],"severity":"P2","category":"teaching","issue":"Specific observed defect","evidence":"Actual question/geometry evidence","recommendedChange":"Concrete change"}],"limits":["AI coaching review, not human approval; no rendered-image certification"]}
```

A coverage row is mandatory for every assigned new question, including passes. Flagged rows need matching findings. Grouped findings must enumerate every affected ID. Do not mass-pass questions from a few samples. Review learning value, factual keys, actor-label and geometric consistency, credible alternatives, genuine new teaching targets, age suitability, source scope and limits of the still diagram. Tactical suggestions are ungraded; do not misreport them as mandatory scored answers. High risk: rule dependence, contact/safety, goalie technique, narrow timing/offside claims, or high-consequence tactical certainty.

Each independent second-review file:

```json
{"reviewer":"different-reviewer-name","model":"gpt-5.6-luna","reviewedAt":"2026-09-05","coverage":[{"questionId":"ID","scenarioId":"ID","scenarioVersion":1,"contentHash":"sha256","decision":"pass","reason":"Specific reason that validates or rejects the first finding"}],"limits":[]}
```

Second decisions: `pass` (including explicitly rejected first findings), `revise`, or `hold`. Examine every first-pass flag and every high-risk row. Read the question in its full scenario context and the original finding, not just its ID. The second reviewer may add concrete replacement text in `proposedQuestion` but must not edit the bank. Any edit after review requires a fresh independent content-hash recheck; save such rows in `*-recheck.json` with the same second-review schema and a specific reason. Do not falsely certify an earlier hash as the final question.
