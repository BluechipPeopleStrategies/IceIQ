# Curriculum coverage map

Generated 2026-09-06T18:02:49.683Z by tools/build-curriculum-coverage.mjs from tools/experimental-bank-files.mjs and the current composed bank.

## What this measures

The current inventory contains **200 scenarios**, **1600 questions**, and **200 unique opening geometries**. The ratio is **8 questions per geometry**. Geometry is a canonical hash of each scenario setup's actors and puck; it does not inspect question wording or prove that two prompts teach the same thing.

The report retains each scenario's authored age, topic, family, tags, objective and source references. It also keeps compact question rows with the current question ID, type, basis and prompt. Use coverage.json for the complete data and index.html for the interactive age/topic views.

## Delivery formats

Observed current types are: Multiple choice (508), Choose all that apply (300), Move / arrange players (295), Order actions (197), Explain, compare and reconsider (300). The format table also lists delivery modes that are not present in this composed bank, including true/false, feature taps, routes, responsibility matching, mistake spotting, prediction and vocabulary activities. Unseen formats are backlog signals, not automatic quality findings.

## Curriculum mapping boundary

The six domains and 31 concepts come from src/data/curriculum-ledger.json. Scenario-level domain counts are transparent signals from the actual tags, topic, family and objective fields. They are an inventory aid; they are not explicit authored concept bindings. Concept rows show exact concept-name/id phrase matches where they exist, alongside each ledger node's age depth. Counts do not estimate mastery, learning transfer or question quality.

The separate **Concept bindings** tab contains explicit provisional scene-level mappings with a rationale, scene version and current question hashes. All 200 scenes are accounted for; six remain taxonomy holds rather than being forced into unsuitable concepts. A scene binding does not assert that every question assesses that skill. Rebuild bindings with tools/build-experimental-curriculum-bindings.mjs after reviewing a content change, then rebuild this report.

Open the linked practice report to connect current-version browser-local views, checks, retries and flags to these bindings. Historical hashes are excluded, small samples are labelled, and exported curriculum feedback contains aggregate counts rather than written responses. Supabase is deferred. The separate four-scene calibration catalog contains 24 draft questions and does not alter these bank totals or close skating-technique gaps.

## Review before authoring

Use the short rubric in coverage.json and the Backlog view:

1. **Context:** the age-appropriate situation is readable from the displayed freeze.
2. **Complexity:** the question requires a meaningful cue combination or change, not a reworded duplicate.
3. **Answer contract:** accepted choices are supported by visible facts; distractors are plausible; no outcome is guaranteed.
4. **Transfer:** the learner updates or compares a read under a stated condition.
5. **Source and scope:** factual/rule claims have a reviewed source, with observation, coaching and execution kept distinct.

## Official development references used for backlog prompts

These links are primary or official development resources used to frame candidate work. They support design context; they do not automatically establish a RinkReads answer key:

- [Hockey Canada Skill Development | Small Area Games and Drill Stations](https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/small-area) — Context for scaling space and player count for younger development; not a question answer key.
- [Hockey Canada Skill Development | Skating](https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/positions-skills/skating) — Context for skating, puck handling, passing and receiving progressions.
- [Hockey Canada Player Development Downloads](https://www.hockeycanada.ca/en-ca/hockey-programs/players/essentials/downloads) — Official entry point for age-specific pathways, core skills and practice resources; inspect the relevant document before authoring a claim.
- [Hockey Canada Canadian Player Pathway: U9 Hockey](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Coaching/u9-program/downloads/2026/u9-player-pathway-e.pdf) — Supports U9 emphasis on skating, puck control, passing, receiving and shooting, with rules introduced in age-appropriate sequence.
- [USA Hockey American Development Model](https://portal.usahockey.com/cx/president/hockey-devlopment/adm_one-sheet.pdf) — Cross-reference for small spaces, constant motion and age-banded development; Canadian rules remain separate.
- [IIHF Research on Small-Area Games](https://www.iihf.com/en/static/20840/research-on-small-area-games) — Research context for changing game format, player involvement, action density and decision opportunities.
- [IIHF: Passing and stick handling while moving](https://www.iihf.com/en/coaching/18608/passing-and-stick-handling-while-moving) — Practice example combining passing, moving, reaction and reading the game; not a universal scoring rubric.
- [IIHF: 3vs3](https://www.iihf.com/en/coaching/18775/3vs3) — Practice context for playing skills, game sense, roles and competing.
- [IIHF Development Hub](https://www.iihf.com/en/statichub/4625/development) — Official coaching and development resource index; specific goalie claims need a specific reviewed source.

## Limits

- This is a current-bank inventory and planning artifact, not a curriculum-admission report.
- Counts are not targets, quotas, mastery coverage or a quality ranking.
- Domain signals may overlap; a scenario can contribute to several domains.
- Backlog candidates need authored geometry, exact answer contracts, age review and source review before they become content.
