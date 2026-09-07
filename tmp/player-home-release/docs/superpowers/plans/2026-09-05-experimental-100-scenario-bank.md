# Experimental Scenario Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make 100 original situations and 600 linked questions browsable and usable in experimental practice.

**Architecture:** An isolated versioned JSON catalog feeds a small practice reader and descriptive response engine. Existing shared rink controls render canonical original setups; approved bank loading and mastery remain separate.

**Tech Stack:** React/Vite JSX, JSON, Node tests, existing Three.js rink.

**Spec:** `docs/superpowers/specs/2026-09-05-experimental-100-scenario-bank.md`.

## Global constraints

- U7 10, U9 15, U11 25, U13 25, U15 15, U18 10; six questions per scenario initially.
- Public source discovery and original authorship; no unseen-book claims, copied diagrams or restricted corpus.
- Experimental learner access is authorized; approved-bank promotion is not implied.
- Preserve all existing attempt histories and unrelated working-tree changes.

### 1. Source research and original authorship

- [ ] Record primary-source receipts in `docs/factory/research/`.
- [ ] Author age arrays in `src/one-on-one/experimental-bank/` using the shared spec.
- [ ] Cross-review scene relationships, answer membership, age fit and meaningful variety; fix identified defects.

### 2. Catalog contracts and response model

- [ ] Write failing `experimentalBankCore.test.mjs` for format validation, filtering, responses and isolated restore.
- [ ] Implement `experimentalBankCore.js` and explicit `experimentalBank.js` loader.
- [ ] Run tests; add full bank audit after content arrives.

### 3. Experimental practice reader

- [ ] Implement `ExperimentalPractice.jsx/.css`, original rink, accessible alternative board, selection/multi/sequence/position/explanation controls, feedback, source review and exports.
- [ ] Add PracticeHub entry and a direct local review URL; preserve existing defaults and activity routing.
- [ ] Exercise actual mobile and desktop filter, answer, player movement, save/reload, export and graphics fallback.

### 4. Reconcile and record

- [ ] Complete prior worlds/camera/player QA, run complete practice tests and build.
- [ ] Update TASKS and evidence report with accurate experimental/approved distinctions and remaining review limits.
- [ ] Commit only scoped, verified work without sweeping the pre-existing paused WIP or claiming deployment.
