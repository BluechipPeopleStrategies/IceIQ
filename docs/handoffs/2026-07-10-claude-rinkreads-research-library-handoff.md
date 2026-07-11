# Claude Handoff: RinkReads Evidence-Led Curriculum Research Library

**Prepared:** 2026-07-10

**For:** Claude

**Project:** RinkReads / IceIQ

**Status:** Approved direction, ready for detailed planning and implementation
**Authoritative design:** `C:\Users\mtsli\IceIQ\docs\superpowers\specs\2026-07-10-evidence-led-curriculum-research-library-design.md`

**Amendment (2026-07-11, Thomas):** the coach-review requirement referenced
below is removed. Curriculum admission now requires documentary support alone
from independent corroborating sources — the same bar used to promote a
concept's crosswalk status to `supported`. See the amendment note in the
authoritative design spec; "coach review" language elsewhere in this document
is historical and superseded.

## Your Assignment

Plan and build an evidence-led hockey curriculum research system for RinkReads. The working research library must live primarily in Thomas's Obsidian vault. Original source documents belong in Google Drive when they can legally be retained. The IceIQ repository should hold only the technical automation, validated machine-readable curriculum data, and reports required by the product.

Do not restart the product-design discussion. The decisions in this handoff are approved. Begin by inspecting the live Obsidian and IceIQ structures, then propose or execute the smallest coherent implementation sequence consistent with the instructions in those systems.

Do not publish, push, deploy, purchase, message, or make externally visible changes without Thomas's confirmation.

## Live Locations

### IceIQ repository

`C:\Users\mtsli\IceIQ`

Read before making non-trivial changes:

- `C:\Users\mtsli\IceIQ\AGENTS.md`
- `C:\Users\mtsli\IceIQ\CLAUDE.md`
- `C:\Users\mtsli\IceIQ\ROUTING.md`
- `C:\Users\mtsli\IceIQ\docs\roadmap\TASKS.md`
- the authoritative design linked at the top of this file

The current working branch at handoff time is `feature/shareable-beta`. The worktree contains unrelated untracked work. Never use broad staging commands. Stage only files created or intentionally modified for this project.

### Obsidian vault

`C:\Users\mtsli\SecondBrain`

The current RinkReads project area is:

`C:\Users\mtsli\SecondBrain\Command Center\Projects\RinkReads`

Read these live notes before designing the Obsidian layer:

- `RinkReads - Project Hub.md`
- `RinkReads - Current State.md`
- `RinkReads - Workflow Contract.md`
- `C:\Users\mtsli\SecondBrain\Command Center\02 - Source of Truth Map.md`
- `C:\Users\mtsli\SecondBrain\Command Center\Templates\Source Record Template.md`

Do not use the obsolete `2-Areas` path. The vault was reorganized on 2026-07-10.

### Google Drive

Google Drive will own legally retained original source documents and shareable research artifacts. Confirm the connected Drive location and folder structure with Thomas before creating or moving files. Do not assume a folder ID from memory.

## Product Purpose

The research system should help RinkReads create original, defensible hockey learning content. Evidence should help shape and revise the curriculum rather than merely justify a curriculum designed in advance.

The initial curriculum serves:

- players learning independently;
- parents supporting player development;
- skater development first, with a goalie track later.

RinkReads should teach transferable hockey principles while presenting multiple legitimate systems. It must distinguish broadly supported principles from system-dependent coaching choices.

## Evidence-Led Model

Use this learning-development loop:

```text
Source document
  -> evidence note
  -> hockey concept
  -> age and competency progression
  -> observable decisions
  -> curriculum candidate
  -> original RinkReads scenario
  -> coach review
  -> player learning validation
```

Research is iterative. Broad research establishes a foundation. Targeted research supports active content families. Coach review and player evidence improve later curriculum versions.

## Settled Ownership Model

### Obsidian owns

- the human-facing source registry;
- evidence notes;
- curriculum concepts and progressions;
- research gaps and disagreements;
- coach-review state;
- the crosswalk to existing RinkReads content;
- operational status and durable product decisions.

### Google Drive owns

- legally retained original PDFs;
- downloadable manuals and presentations;
- other original research documents;
- shareable source artifacts.

### IceIQ owns

- source-ingestion and export automation;
- schemas and validation rules;
- reviewed machine-readable curriculum data consumed by the app;
- crosswalk reports and other generated technical reports;
- repository specifications, tests, and code.

### Do not duplicate authority

- The full technical design remains authoritative in IceIQ. Obsidian links to it rather than copying it wholesale.
- Obsidian owns evolving research reasoning and links to authoritative repository files and commits.
- Drive files are linked from Obsidian source records.
- Validated curriculum fields may export deterministically from Obsidian into IceIQ.
- Free-form research notes do not need to be duplicated into the repository.

## Source Tiers

### Tier 1: primary and authoritative

- Hockey Canada, USA Hockey, IIHF, and other national federations;
- formal player-development and coach-education programs;
- peer-reviewed research and academic repositories;
- university and recognized sport-science publications.

### Tier 2: established professional practice

- recognized coaching associations;
- reputable development programs and academies;
- university coaching resources;
- established clinics and detailed systems material.

### Tier 3: inspiration and corroboration

- experienced-coach articles and presentations;
- instructional videos and drill libraries;
- books, paid clinics, and subscription resources Thomas can legally access.

Tier 3 can inspire and corroborate, but it cannot define a universal correct answer by itself. Strong coaching consensus can support a concept when academic research is limited if its scope and limitations are explicit.

## Copyright, Trademark, and Access Rules

Use sources to understand hockey and inspire original RinkReads content. Do not reproduce protected prose, drills, diagrams, branding, videos, or proprietary program structures without permission.

- Retain documents only when access and licensing permit it.
- For restricted or copyrighted materials, retain citation metadata and original notes unless local retention is clearly allowed.
- Use short attributed quotations only when necessary.
- Rewrite teaching language, scenarios, diagrams, and questions as original RinkReads work.
- Keep trademarked program names as source metadata, not RinkReads curriculum labels.
- Do not bypass paywalls, authentication, download restrictions, rate limits, or anti-automation controls.

## Authenticated Coaches' Site

Thomas will provide access to a coaches' website through a Playwright-controlled browser session.

Required operating rules:

- Thomas performs login, multi-factor authentication, subscription acceptance, and account recovery himself.
- Keep collection read-only. Do not post, edit, message, purchase, or change account settings.
- Review visible terms, copyright notices, download controls, and applicable robots guidance before bulk collection.
- Prefer URL, title, author, date, topic tags, page references, and original evidence notes over full-page copies.
- Download only when the interface and Thomas's access clearly allow downloading and retention.
- Never bypass disabled copy or download functions.
- Use paced, resumable navigation rather than aggressive scraping.
- Maintain a crawl manifest with starting URL, included areas, exclusions, canonical URL, visit state, retention permission, and extraction state.
- Resume from the manifest instead of repeatedly crawling completed pages.
- Never store credentials, cookies, tokens, or browser-session artifacts in Obsidian, Drive, IceIQ, logs, screenshots, or research records.
- Label coach-site records as public, authenticated, paid, or restricted and record the permitted retention mode.
- Classify coach-site material as Tier 2 or Tier 3 unless its authorship and evidence justify another tier.

## Obsidian Workspace to Build

Build this workspace before large-scale source acquisition.

### 1. RinkReads Research Library hub

Link it from `RinkReads - Project Hub.md`. It should show:

- purpose and current research priorities;
- current acquisition wave and progress;
- source, evidence, concept, crosswalk, gap, and review views;
- unresolved research and coach-review decisions;
- links to the IceIQ design, roadmap, curriculum data, and relevant commits;
- links to the Google Drive source-document folders.

### 2. Source-record template

Extend the existing vault pattern with properties for:

- project and source type;
- title, author, organization, and publication date;
- canonical URL and Drive file ID or link;
- public, authenticated, paid, or restricted access;
- source tier and confidence;
- copyright and retention status;
- topics, age bands, systems, and curriculum concepts;
- acquisition, review, and supersession status;
- retrieval date and last-reviewed date.

The note body should explain why the source matters, summarize it in original language, identify useful pages or sections, and link related evidence and concept notes.

### 3. Evidence-note template

Use one note per distinct claim, principle, progression, or meaningful disagreement. Record:

- the claim in original RinkReads language;
- precise source and page or section references;
- whether it is research-supported, strong coaching consensus, or coaching preference;
- applicable ages, competencies, and systems;
- observable perception, decision, and action cues;
- supporting and contradicting evidence;
- confidence and review status;
- original scenario inspiration.

### 4. Curriculum-concept template

Each concept should synthesize multiple evidence notes and define:

- player-facing concept name;
- parent-facing explanation;
- transferable principle;
- legitimate system variations;
- suggested entry age and prerequisites;
- competency stages;
- observable mastery and misconceptions;
- scenario opportunities and interaction kinds;
- documentary-support and coach-review state;
- links to existing nodes, plays, and questions.

### 5. Existing-content crosswalk template

Connect existing curriculum nodes, scenarios, question families, and playtest decisions to the evidence library. Preserve repository IDs, file links, and commit references.

Use exactly one primary crosswalk status:

- Supported
- Supported with refinement
- System-dependent
- Unverified
- Superseded
- Original product convention

Nothing should be deleted automatically. Preserve IDs and history wherever possible. Remapping, revision, and retirement must be explicit and reviewable.

### 6. Research-gap and review notes

Track missing evidence, conflicting sources, thin age bands, system questions, and coach-review queues as linked records rather than burying them in long source summaries.

### 7. Obsidian Bases views

Create views for:

- all sources by tier, topic, age, access, and review state;
- evidence awaiting corroboration;
- concepts awaiting coach review;
- concepts by competency stage and entry age;
- universal versus system-dependent concepts;
- existing content needing evidence or refinement;
- current acquisition-wave progress;
- broken links, stale reviews, and superseded sources.

## Adaptive Curriculum Model

Age is the starting point. Demonstrated competency controls progression. Progress is concept-specific rather than one permanent overall player level.

A player may move:

- down when foundational cues are missing;
- sideways into another representation of the same concept;
- up after consistently recognizing and transferring the decision;
- into system variations after mastering the transferable principle.

Use six competency stages:

1. **Notice:** identify the important cue.
2. **Understand:** explain why it matters.
3. **Choose:** select an appropriate response.
4. **Adapt:** change the response when pressure, space, or support changes.
5. **Transfer:** apply the principle in a new visual or legitimate system.
6. **Anticipate:** recognize what is likely to happen next.

Each concept should define suggested entry age, prerequisites, competency stages, mastery evidence, easier and harder variations, legitimate systems, player language, parent explanation, and evidence/review state.

## Existing RinkReads Work Must Fit

Inventory and crosswalk:

- current curriculum domains, concepts, and ledger nodes;
- animated plays and scenario seeds;
- question families and interaction kinds;
- source references and research notes;
- coach-panel decisions;
- manual playtest findings;
- factory coverage gaps.

Existing work challenges and informs the research just as external evidence challenges and informs the existing curriculum. Do not assume either side is automatically correct.

## Acquisition Workflow

Run repeatable research waves:

1. **Discover:** search authoritative, academic, professional, and permissioned paid sources.
2. **Triage:** score authority, relevance, developmental value, tactical detail, accessibility, originality, and duplication.
3. **Capture:** create the Obsidian source record, retain permitted originals in Drive, and record stable links.
4. **Extract:** write evidence notes with precise citations and separate evidence from preference.
5. **Synthesize:** cluster evidence into concepts and progressions; record agreement, disagreement, and system variation.
6. **Crosswalk:** compare the evidence map with existing RinkReads work.
7. **Convert:** turn reviewed concepts into original scenario briefs.
8. **Validate:** require documentary support for curriculum admission; use player testing to validate teaching effectiveness.

## Validation

### Curriculum-ready

**(Amended 2026-07-11 — see note at top of document.)** Requires traceable
documentary support from independent corroborating sources. Coach review is
no longer required for admission.

### Player-validated

Player testing evaluates the experience, not whether a child can override the hockey principle. Measure:

- prompt comprehension;
- cue recognition;
- decision quality and reasoning;
- transfer to a similar but changed scenario;
- usefulness of feedback;
- engagement and guessing signals;
- age and competency fit.

Suggested test:

1. Present an unfamiliar scenario.
2. Ask for a decision and brief reason where appropriate.
3. Show coaching feedback or an animated outcome.
4. Present a structurally similar scenario with changed positions or pressure.
5. Measure transfer.
6. Record confusion, response time, answer changes, and optional confidence.
7. Ask, "What would you look for next time?"

Use these readiness labels:

- Curriculum-ready
- Player-validated
- Scaled evidence

Player validation does not block the first curriculum, but it is required before claiming that a scenario reliably teaches or measures a concept.

## First Research Wave

### Broad foundation

- individual tactics and technical decision-making;
- offensive and defensive team tactics;
- scanning, anticipation, and perception;
- age and competency development;
- small-area games and representative learning design;
- parent support for independent player learning.

### Immediate deep dives

- gap control;
- backcheck recovery;
- forecheck pressure;
- off-puck offensive support.

### Required outputs

- working Obsidian Research Library hub;
- source, evidence, concept, and crosswalk templates;
- required Bases views;
- acquisition log and crawl-manifest pattern;
- populated source registry;
- legally retained Drive archive;
- first evidence notes;
- preliminary evidence-derived curriculum outline;
- crosswalk of current RinkReads work;
- disagreement and research-gap report;
- ranked scenario opportunities;
- recommendations for the second research wave.

Do not begin mass question production during the first wave. Prove the research and synthesis method first.

## Quality Gates

- Every curriculum claim is traceable.
- No single low-tier source defines a universal answer.
- Universal and system-dependent guidance are explicit.
- Confidence ratings expose thin or conflicting evidence.
- Existing work is preserved until deliberately revised or retired.
- Protected wording, diagrams, drills, and program identity are not copied.
- Coach review verifies hockey validity.
- Player testing verifies comprehension and transfer.
- Links, duplicates, stale reviews, and superseded sources can be audited.
- Credentials and authenticated session data are absent from all artifacts.

## Planning Questions Claude Must Resolve

1. What is the smallest useful property schema for each Obsidian record type?
2. Which folder, naming, and linking conventions will remain usable with hundreds of notes?
3. Which Obsidian Bases views can be implemented with the current vault and plugin capabilities?
4. What is the seed process for crosswalking the current curriculum ledger, animated catalog, source references, and playtest decisions?
5. Which repositories and organizations belong in acquisition wave one?
6. How should source quality and concept confidence be calculated?
7. What review workflow distinguishes transferable principles from legitimate system variations?
8. Which validated fields export into IceIQ, and what deterministic format should carry them?
9. What remains human-reviewed rather than automated?
10. What Google Drive folder and retention convention should be used?
11. What scope, crawl rate, stopping rules, and retention permissions apply to the authenticated coaches' site?
12. What sample size and observation method are practical for early player validation?
13. What gate moves the project from curriculum discovery into content production?

## Recommended Implementation Sequence

1. Inspect the live vault, repository, and current curriculum data.
2. Confirm and document the Google Drive target without creating duplicate source-of-truth locations.
3. Draft the Obsidian property schemas and naming conventions.
4. Create the Research Library hub, templates, folders, and Bases views.
5. Generate a read-only inventory of existing RinkReads curriculum and scenario assets.
6. Seed a small crosswalk sample and validate the workflow manually.
7. Define the source-acquisition manifest and legal-retention checklist.
8. Run a small public-source pilot before authenticated browsing.
9. Ask Thomas to authenticate the coaches' site when the manifest and stopping rules are ready.
10. Run the first targeted research wave and produce the required outputs.

## Acceptance Criteria

The first implementation phase is complete when:

- the RinkReads Project Hub links to a working Research Library hub;
- all four core templates exist and create valid notes;
- the agreed Bases views render useful records;
- a sample source travels from registry to evidence to concept to existing-content crosswalk;
- a legally retainable original links correctly from Drive;
- a restricted-source sample proves that notes can work without copying the original;
- the repository can receive a reviewed deterministic export without ingesting free-form research prose;
- no credentials, session artifacts, or unrelated work are captured;
- the roadmap and Obsidian current-state notes reflect the implemented state;
- all modified repo files are verified and narrowly committed on the feature branch;
- nothing is pushed or deployed without Thomas's confirmation.

## Settled Decisions

- Use an evidence-led spiral rather than a fixed curriculum-first process.
- Preserve and crosswalk existing RinkReads work.
- Serve independent players and supporting parents first.
- Present multiple legitimate hockey systems.
- Accept strong coaching consensus when academic evidence is limited.
- Build skater curriculum first and goalie curriculum later.
- Use legally accessed paid sources without copying protected material.
- Require documentary support plus coach review for curriculum admission.
- Use player testing to validate teaching and assessment delivery.
- Start players by age and adapt by concept-specific competency.
- Make Obsidian the working research home.
- Keep retained originals in Google Drive.
- Keep product-executable data and technical automation in IceIQ.
- Build the Obsidian workspace before large-scale acquisition.
- Include permission-aware, read-only authenticated coaches' site collection.

## Handoff Instruction

Start by reading the live instruction and governance files listed above. Then inspect, do not assume, the current Obsidian structures and IceIQ data shapes. Present Thomas with the proposed implementation sequence and any true blockers. Do not reopen settled product decisions unless live evidence reveals a direct contradiction or safety issue.
