# RinkReads Evidence-Led Curriculum and Research Library

**Date:** 2026-07-10  
**Status:** Planning brief for further development in Fable  
**Scope:** Research acquisition, curriculum discovery, existing-content crosswalk, and validation

## Purpose

Build a durable hockey research library that helps RinkReads create original, defensible learning content. The evidence should help shape the curriculum rather than merely justify a curriculum designed in advance.

The curriculum will primarily support:

- players learning independently;
- parents supporting player development;
- skater development first, with a goalie track added later.

RinkReads will teach broadly transferable principles while introducing multiple legitimate hockey systems. It will distinguish universal principles from system-dependent choices instead of presenting one coaching preference as the only correct way to play.

## Core Model

The curriculum-development loop is:

```text
Source document
  -> evidence notes
  -> hockey concept
  -> age and competency progression
  -> observable decisions
  -> curriculum candidate
  -> original RinkReads scenarios
  -> coach review
  -> player learning validation
```

This is an evidence-led spiral, not a one-time research phase. Broad research establishes the foundation, focused research supports active content families, and player and coach evidence improves later curriculum versions.

## Source Strategy

### Source tiers

**Tier 1: Primary and authoritative**

- Hockey Canada, USA Hockey, IIHF, and other national federations
- formal player-development frameworks and coach-education programs
- peer-reviewed research and academic repositories
- university or recognized sport-science publications

**Tier 2: Established professional practice**

- recognized coaching associations
- reputable development programs and academies
- university coaching resources
- established clinics and detailed systems material

**Tier 3: Inspiration and corroboration**

- experienced-coach articles and presentations
- instructional videos and drill libraries
- books, paid clinics, and subscription resources Thomas can legally access

Tier 3 material can inspire scenarios and corroborate concepts, but it cannot establish a universal correct answer by itself. Strong coaching consensus may support a curriculum concept when academic research is limited, provided that the consensus and its limits are documented.

### Copyright and trademark boundary

RinkReads will use source material to understand hockey principles and inspire original content. It will not reproduce protected drills, diagrams, prose, branding, or proprietary program structures without permission.

- Download and retain publicly available documents only when their access and licensing permit it.
- For paid, restricted, or copyrighted sources, retain citation metadata and original notes rather than copied source files unless local retention is clearly permitted.
- Use short quotations only when necessary and properly attributed.
- Rewrite teaching language, scenarios, diagrams, and questions as original RinkReads material.
- Record trademarked program names only as source metadata, not as RinkReads curriculum labels.

### Authenticated coach-site acquisition

Thomas may provide access to a coaches' website through an authenticated Playwright browser session. Treat that site as an authorized research source, not as an unrestricted public corpus.

- Thomas completes any login, multi-factor authentication, subscription acceptance, or account recovery himself in the browser.
- Collection remains read-only: browse, search, inventory, and extract permitted research notes without posting, editing, messaging, purchasing, or changing account settings.
- Review the site's terms, visible copyright notices, robots guidance where applicable, and download controls before bulk collection.
- Prefer a structured inventory of canonical page URLs, titles, authors, dates, topic tags, and original evidence notes over full-page copying.
- Download files only when the site's interface and Thomas's access clearly permit downloading and local retention.
- Do not bypass paywalls, access controls, rate limits, anti-automation controls, or disabled download/copy functions.
- Use paced, resumable browsing with a collection log so a failed session does not cause repeated requests or duplicate capture.
- Keep credentials, cookies, tokens, and browser-session data out of the repository, logs, screenshots, and research records.
- Mark each registry record as public, authenticated, paid, or restricted, along with its permitted retention mode.
- Treat coach-site material as Tier 2 or Tier 3 unless its authorship and evidence justify a stronger classification.

## Research Library Structure

Obsidian is the primary home for the research library and curriculum thinking. Google Drive holds retained original documents and shareable source files. The IceIQ repository holds only the technical structures and artifacts needed by the product and its automation.

```text
Obsidian: SecondBrain/Command Center/Projects/RinkReads/
  RinkReads - Research Library.md
  Research/
    Sources/
    Evidence Notes/
    Concepts/
    Crosswalk/
    Acquisition Log.md

Google Drive: RinkReads Research Library/
  Governing Bodies/
  Academic/
  Coaching Programs/
  Restricted or Paid Sources/

IceIQ repository:
  machine-readable schemas and validated exports
  source-ingestion and crosswalk automation
  technical reports and curriculum data consumed by the app
```

The exact Obsidian note organization may evolve with the vault, but the ownership boundary does not: Obsidian owns human-readable research knowledge, Drive owns original documents, and IceIQ owns product-executable truth.

### 1. Source registry

One record per source:

- title, author, organization, and publication date;
- canonical URL and retrieval date;
- source tier and format;
- licensing or retention status;
- local file path when applicable;
- topics, age bands, and curriculum relevance;
- source quality and confidence;
- duplicate or superseding relationships.

The Obsidian registry is the human-facing master index even when a source file is retained in Drive. A validated machine-readable export may be generated into IceIQ when the app or factory needs structured source or curriculum data.

### 2. Original source archive

Store legally retainable PDFs and other original documents in Google Drive by source class. Preserve original filenames where practical and link them from their Obsidian source records. Do not use the Git repository as a document archive.

### 3. Evidence notes

Write concise Obsidian notes in original language with page- or section-level references. Separate:

- supported principles;
- author or coach preferences;
- age and developmental progressions;
- observable cues, decisions, and actions;
- disagreements or limits;
- scenario inspiration.

### 4. Concept map

Combine evidence across sources into Obsidian curriculum-candidate notes. Each candidate records:

- what the player should perceive;
- what decision the player should make;
- what action follows;
- how the concept develops by age and competency;
- prerequisites and related concepts;
- supporting and contradicting sources;
- whether it is universal or system-dependent;
- potential visual scenarios and interaction kinds;
- confidence and review status.

### 5. Existing-work crosswalk

Inventory and connect the work already completed in RinkReads. Keep the reasoning and review state in Obsidian while linking to authoritative repo files and commits:

- curriculum domains, concepts, and ledger nodes;
- animated plays and scenario seeds;
- question families and interaction kinds;
- existing source references and research notes;
- coach-panel decisions and playtest findings;
- factory coverage gaps.

Assign every existing item one status:

- **Supported:** credible evidence aligns with it.
- **Supported with refinement:** sound concept requiring changes to wording, age placement, or scope.
- **System-dependent:** useful, but not a universal hockey rule.
- **Unverified:** retained while further evidence is sought.
- **Superseded:** stronger evidence supports restructuring it.
- **Original product convention:** a valid RinkReads design choice that does not require external hockey authority.

Nothing is deleted automatically. Preserve scenario IDs and history wherever possible. Remapping, revision, or retirement should be explicit and reviewable.

## Adaptive Curriculum Model

Age determines a player's initial entry point, while demonstrated competency determines progression. Progress is concept-specific rather than represented by one permanent overall level.

A player may move:

- down when foundational cues are missing;
- sideways into another representation of the same concept;
- up after consistently recognizing and transferring the decision;
- into system variations after mastering the transferable principle.

### Competency stages

1. **Notice:** identify the important cue.
2. **Understand:** explain why it matters.
3. **Choose:** select an appropriate response.
4. **Adapt:** change the response when pressure, space, or support changes.
5. **Transfer:** apply the principle in a new visual or legitimate system.
6. **Anticipate:** recognize what is likely to happen next.

Each curriculum concept should define:

- suggested entry age;
- prerequisites;
- competency stages;
- observable mastery evidence;
- easier, parallel, and harder scenario variations;
- legitimate system interpretations;
- player-facing teaching language;
- parent-facing explanation;
- documentary support and coach-review status.

## Acquisition Workflow

Research proceeds in repeatable waves.

### 1. Discover

Search governing bodies, national development programs, academic databases, university repositories, coaching associations, reputable clinics, books, legally accessible paid resources, and the authenticated coaches' site supplied by Thomas.

### 2. Triage

Score candidates for authority, relevance, developmental value, tactical detail, accessibility, originality, and duplication. Reject SEO summaries, unattributed collections, and sources that only repeat a stronger original.

### 3. Capture

Create or update the Obsidian source record, retrieve legally retainable original documents into Google Drive, and record stable links between them. Use Drive file identity or hashes where available to detect duplicates. Generate repo data only when a downstream RinkReads tool requires it.

For authenticated sites, capture through the user-authorized browser session. Maintain a crawl manifest containing the starting URL, included sections, exclusions, visit status, canonical URL, retention permission, and extraction status. Resume from the manifest rather than recrawling completed pages.

### 4. Extract

Create evidence notes with precise page or section references. Keep supported principles separate from coaching preferences and scenario ideas.

### 5. Synthesize

Cluster evidence into concepts and progressions. Document agreement, disagreement, evidence gaps, and system-dependent variations.

### 6. Crosswalk

Compare the emerging evidence map against existing RinkReads content. Preserve good work, refine weak mappings, and flag unsupported claims without automatically removing them.

### 7. Convert

Turn reviewed concepts into original scenario briefs. The evidence establishes the hockey decision; it does not dictate the wording or visual design.

### 8. Validate

Use documentary support and coach review to admit a concept into the curriculum. Use player testing to validate whether particular teaching and assessment experiences work.

## Validation Model

### Curriculum admission

A concept becomes curriculum-ready when it has:

- traceable documentary support; and
- coach review confirming hockey validity, scope, and system dependence.

Strong Tier 1 evidence is preferred. Corroborated professional consensus is acceptable where formal research is limited.

### Player testing

Player testing evaluates delivery and learning effectiveness, not the underlying hockey principle. A lightweight test should measure:

- comprehension of the prompt;
- recognition of important cues;
- decision quality and reasoning;
- transfer to a structurally similar scenario;
- usefulness of feedback;
- engagement and random-guessing signals;
- age and competency fit.

A practical test sequence is:

1. Present one unfamiliar scenario.
2. Ask for a decision and, where appropriate, a brief reason.
3. Show the coaching explanation or animated outcome.
4. Present a similar scenario with changed positions or pressure.
5. Measure whether the player transfers the principle.
6. Record confusion, response time, answer changes, and optional confidence.
7. Ask, "What would you look for next time?"

Readiness labels:

- **Curriculum-ready:** documentary support plus coach review.
- **Player-validated:** a small player group understands and transfers the concept.
- **Scaled evidence:** aggregate use suggests the content measures development rather than confusion.

Player validation does not block the initial curriculum, but it is required before claiming that a scenario reliably teaches or measures a concept.

## First Research Wave

The first wave should combine broad foundation-building with targeted depth.

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

These areas align with current RinkReads content gaps but should also test and improve the emerging research method.

### First-wave outputs

- populated Obsidian source registry and legally retained Drive archive;
- evidence notes for retained sources;
- preliminary evidence-derived curriculum outline;
- crosswalk of existing RinkReads work;
- disagreement and research-gap report;
- ranked scenario opportunities;
- recommendations for the next research wave.

Mass question production is not a first-wave output. The first wave should prove that the library and synthesis process produce defensible curriculum and useful scenario opportunities.

## Quality Controls

- No curriculum claim without traceable support.
- No single low-tier source defines a universal correct answer.
- Universal and system-dependent guidance are clearly distinguished.
- Confidence ratings expose thin or conflicting evidence.
- Existing RinkReads work is preserved until deliberately revised or retired.
- Protected wording, diagrams, drills, and program identities are not copied into RinkReads content.
- Coach review verifies hockey validity.
- Player testing verifies comprehension, teaching value, and transfer.
- Broken links, duplicate files, and superseded sources are checked periodically.

## Questions for Fable Planning

Use Fable to expand this brief around the following planning questions:

1. What is the smallest useful registry and evidence-note schema?
2. Which repositories and organizations should be searched in the first acquisition wave?
3. How should source-quality and concept-confidence scores be calculated?
4. How should the existing curriculum ledger and scenario catalog be inventoried without disrupting current production?
5. What is the review workflow for separating universal principles from legitimate system variations?
6. How should competency evidence change scenario selection without over-labelling a player?
7. What sample size and observation method are practical for early player validation?
8. Which first-wave deliverables require automation, and which should remain human-reviewed?
9. What copyright and retention checklist should be completed before a source file is archived?
10. What decision gate moves the project from curriculum discovery into content production?
11. What sections of the authenticated coaches' site are in scope, and what crawl rate, stopping rules, and retention permissions apply?
12. What browser-session handoff lets Thomas authenticate while ensuring credentials and session artifacts never enter the repository?
13. What Obsidian properties, links, and Bases views make the source registry, evidence map, and curriculum crosswalk easy to navigate?
14. Which validated fields must export from Obsidian into IceIQ, and which research notes should never be duplicated into the repository?

## Decisions Already Made

- Use an evidence-led spiral rather than a fixed curriculum-first approach.
- Preserve and crosswalk existing RinkReads work.
- Serve independent players and supporting parents first.
- Represent multiple legitimate hockey systems.
- Accept strong coaching consensus when academic research is limited.
- Begin with skater development and add a goalie track later.
- Use legally accessed paid sources through citations and original notes without copying protected material.
- Require documentary support plus coach review for curriculum admission.
- Use player testing to validate teaching and assessment delivery.
- Start players by age, then adapt by concept-specific competency.
- Include the authenticated coaches' site as a read-only, permission-aware acquisition channel through a Thomas-authenticated Playwright session.
- Use Obsidian as the primary home for research knowledge and curriculum thinking, Google Drive for retained original documents, and IceIQ for product-executable data and technical automation.
