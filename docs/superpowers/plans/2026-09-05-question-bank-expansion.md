# Experimental question expansion and Claude handoff

> **For agentic workers:** Use independent, bounded authoring and review lanes. User chose GPT-5.6 Luna for economical content work. After weak initial drafts were rejected, replacement authoring and review use Luna at high reasoning effort.

**Goal:** Add exactly 1,000 original questions, repair confirmed defects with versioned evidence, and provide a usable catalog and Claude authoring/import workflow.

**Architecture:** Append 100 new six-question scenarios and four questions to each existing scenario. Compose these files at the experimental loader only. Preserve existing IDs, versions and attempts; additions do not rewrite existing questions. Export the composed catalog and a self-contained browser catalog from the same data.

**Tech Stack:** React/Vite, JSON, Node built-ins, existing experimental-bank validator.

**Spec:** Extends `docs/superpowers/specs/2026-09-05-experimental-100-scenario-bank.md`; user approved the mixed expansion on September 5 and asked for a Claude authoring pack.

## Constraints

- New questions by age: U7 100, U9 150, U11 250, U13 250, U15 150, U18 100.
- Final bank: 200 scenarios, 1,600 questions; original scenarios have ten, new scenarios six.
- Preserve unaffected original questions and IDs. The user's later instruction explicitly authorizes repairs to existing questions: increment the affected scenario version and keep before/after evidence and independent rechecks. Existing historical receipts remain intact.
- Questions must add a distinct scene-specific learning target. Counts alone are not a quality gate.
- Coaching suggestions are ungraded; scene grading applies only to observable facts. No invented timing, physics, rule applicability or universal positional assignments.
- Retain source provenance and explicit limits. Public references support principles, not claims of licensed reuse or human approval.
- One independent Luna review per new question; a different reviewer checks every flag and high-risk question. Track exact content hashes. Label anything awaiting review honestly.
- Experimental isolation and no mastery credit persist. No promotion into the approved question bank.
- Claude imports are validated candidates. Validation does not publish, execute content, grant approval or overwrite existing IDs.

## Work

- [x] Author age-scoped append-only additions and new scenarios with supporting public references.
- [x] Compose the bank with version/collision checks; test saved-answer preservation and total/age counts.
- [x] Independently review all additions; reconcile every flag and high-risk item, retaining evidence receipts.
- [x] Finish the prior 55-question follow-up and provide a readable review artifact.
- [x] Create a searchable HTML catalog, full JSON/CSV exports, source catalog, copy-ready Claude prompt, example batch and read-only batch validator.
- [x] Verify malformed imports, stale targets, duplicate IDs, off-ice positioning and exact exports. Verify expanded practice in the browser, run relevant tests/build and update the roadmap.
- [x] Prepare the scoped content commit from a clean staged checkout: 33 focused tests, both coaching audits and the build pass independently of unrelated working changes.
- [ ] Finish scoped integration of the local UI/3D work separately from the content package; preserve unrelated player, goals, coach and engine changes.

## Owner refinements implemented in the local review build

- Number-only question tabs with accessible names; compact answer padding retains 44px targets and separate outer gaps.
- At most one optional reflection per scenario: 1,500 routine questions, 200 optional reflections (13.3%), 100 additional reflections retained in the 1,600-question authoring catalog.
- Initial camera framing follows the actors and relevant net; placement questions include their example point and keep the camera stable during movement.
- Show labels shades approximate rink regions; a puck symbol in the legend replaces repeated PUCK callouts.
- Local anonymous events record exact scene version and content hash for views, checks, retries, skips, camera choices and flag categories. Reports/export expose sample sizes and storage failures; no cross-player aggregation or mastery credit.
- Six worlds have a second-level mission journey with profile/age/world-scoped visited state and no invented completion awards.
- Nine formerly flat rink games now have 3D adapters alongside the two existing 3D games; final gameplay QA and repairs are tracked separately from the content release.

## Claude project handoff

The owner asked Claude to perform the full content repair and curriculum work, with explicit operating parameters and historical checks. `docs/factory/claude-project/` contains a versioned 200-scene/1,600-question snapshot split into 40 non-overlapping five-scene packets, the source/ledger references, earlier review findings and before/after receipts, and portable read-only validators. The ZIP is a transport artifact; there is no automatic Claude-to-Codex delivery.

Claude must return complete per-question coverage, scene evidence, recorded source reads, full versioned replacements, exact final-content self-checks or an explicit unrechecked state, and an unresolved-work ledger. Earlier AI passes do not certify the visuals. Owner-reported rim/board mismatches and the natural YOU grammar correction have exact-hash independent rechecks. The combined audit currently records 1,600 first reviews, 462 second reviews, 345 revision rechecks and zero unresolved reconciled findings; this remains separate from human coach approval.
