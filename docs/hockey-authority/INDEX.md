# RinkReads Hockey Authority

**PAUSED by Thomas, September 6, 2026.** Read [the saved handoff](PAUSED-HANDOFF.md)
when he explicitly resumes this work. Do not advance this workstream meanwhile.

Created September 6, 2026 at Thomas's request. Status: runtime invoked; initial
historical calibration FAILED with four false passes among eight known defects.
The role is unqualified for approval recommendations. It may research and
report findings while remediation proceeds. See [qualification](qualification.json)
and [the comparison](reviews/2026-09-06-calibration/comparison.json).
After remediation, all ten synthetic transfer verdicts matched their expected
labels. This limited regression check does not qualify the reviewer; the
required human-reviewed held-out calibration remains outstanding.

This is the project's dedicated AI hockey reviewer, operating within the
existing Claude Code judgment policy. Creating the role does not create human
credentials, an approved tactical knowledge base or an automatic release gate.

| Responsibility | Owner |
|---|---|
| Hockey requirements, evidence, tactical alternatives and movement review | Hockey Authority |
| Character modeling, materials, animation craft and visual execution | Moshey |
| Editorial clarity and whether the viewer understands the intended cue | Reel |
| Trace consistency, renderer behavior, deterministic validation and integration | Codex / engineering |
| New tactical-claim approval and uncertain/new-family calibration | Thomas or named human coach, under existing policy |

Use [the review contract](review-contract.md) for all scenario families, skaters
and goalies, every age style, first-person and external 3D views. Give Moshey the
hockey brief before production, then return the actual artifact for domain
review. Reel checks clarity against the same brief. Technical and domain
findings remain separate; neither reviewer can waive the other's unresolved
findings. The existing promotion process remains authoritative.

- [Agent definition](../../.claude/agents/hockey-authority.md)
- [Claude Code command](../../.claude/commands/hockey-review.md):
  `/hockey-review <scenario or artifact path and review scope>`
- [Source map and evidence rules](sources.md)
- [First 3D review assignment](first-3d-review.md)
- [Run results and preserved failures](reviews/INDEX.md)
- [Rim demonstration requirements candidate](rim-demonstration-requirements-draft.md)
- [Owner decisions](../factory/SCENARIO-ENGINE-DECISIONS.md)
- [Canonical architecture](../superpowers/specs/2026-07-29-scenario-engine-design.md)
- [Required question-review correction and calibration](../factory/CLAUDE-REVIEW-UPDATE.md)

Claude Code invocation was verified by an actual subscription-session return
from `--agent hockey-authority`. In Codex, read the same role and contract
through the project router; do not claim a native Codex agent registration.

Creation checks: six new role/command/reference files inspected, all local
Markdown links resolve, and basic agent frontmatter checks pass. The format
matches [Claude Code's documented project subagents](https://code.claude.com/docs/en/sub-agents).
`claude agents --json` lists background sessions, not installed definitions,
so its empty result was not treated as a discovery check. Those structural
checks did not establish judgment quality; the subsequent failed calibration
remains recorded and has not been replaced by a clean-looking revised result.

Save new standalone reviews in `reviews/` with unique dated names and exact
input/output hashes. The calling session persists the read-only agent's return.
Existing question-packet reviews keep their existing locations and schemas.
