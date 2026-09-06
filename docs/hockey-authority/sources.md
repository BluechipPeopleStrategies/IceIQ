# Hockey evidence map

Initial discovery checked September 6, 2026. These are source entry points,
not a claim that their linked videos/PDFs have all been inspected or ingested.

| Source | Supported use | Limit |
|---|---|---|
| [Hockey Canada skating pathway](https://hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/skating) | Age-progressive skating foundation; distinct forward/backward skating, turns, crossovers and transitions; game-like progression. | Does not validate a particular rig, exact movement timing, friction coefficient or rim pickup. |
| [Hockey Canada U11 skills](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/under-11/coaches/skills) | U11 skill-development reference and progression. | Does not establish applicability to every U7/U18 scenario or certify an answer. |
| [Hockey Alberta minor hockey](https://www.hockeyalberta.ca/players/minor-hockey/) | Entry point to applicable minor hockey regulations and local program context. | Open the actual current season/league rule and record the section before deciding a rule-dependent question. |

Start with the applicable governing body and development program. Canada and
Alberta are useful starting points for this project, not assumed rules for
every user. Use USA Hockey, IIHF or the relevant league's primary material when
the scenario context calls for it. Never import NHL rules by default.

Local tactical claims currently live under `docs/factory/tactics/claims/`;
schema code is `src/scenario-engine/tactics/claimSchema.js`. Check each claim's
status, approving authority, content hash, conditions and linked validator.
The architecture's proposed `src/data/tactics/claims/` path is not the current
implemented store. A review may propose additions but cannot self-approve them.

For each consequential coaching claim record: claim text, applicability,
source title/organization, URL or local path, version/date accessed, exact
section/page or video timestamp, what it supports, exceptions and what remains
inferred. A topic match is not evidence of the precise answer. Prefer a small
set of inspected relevant sources over an unread link collection.

For movement, inspect an authorized reference clip or sequence at the relevant
contact and transition frames. Attribute any named coach's guidance accurately;
do not pretend the coach reviewed RinkReads. Record conflicting evidence and
hold the dependent claim until resolved. No paid model APIs or unapproved
paid-content purchases; unavailable sources remain unavailable.
