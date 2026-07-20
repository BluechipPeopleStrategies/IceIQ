# Forced-Pass and Support-Angle Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct turnover responsibility to F1 and add a separate playable support-angle question where F2 is the correct selection.

**Architecture:** Update the existing staged interception play without changing its choreography, then add one sibling animated play using the existing actor-selection renderer and catalog. Protect the responsibility distinction with focused tests and rerun the manual gate on both plays.

**Tech Stack:** React/Vite, plain JavaScript play objects, Node test runner.

## Global Constraints

- F1 owns the visible forced-pass turnover.
- F2's sibling question asks about creating availability, not blame.
- Do not add dependencies or a new interaction kind.
- Preserve direct actor tapping, coach feedback, telemetry, and age behavior.

### Task 1: Correct the forced-pass play

**Files:** Modify `src/play/plays/spotMistakeFlatSupport.js`; test `scripts/test-question-kinds.mjs`.

- [ ] Add a failing test asserting `mistakeActor === "F1"`, only F1 is correct, F1's feedback names the covered pass, and F2's feedback preserves puck-carrier responsibility.
- [ ] Run `npm run test:question-kinds` and confirm the responsibility test fails.
- [ ] Update the title, correct option, feedback, rewind copy, and cue to teach the forced-pass decision while preserving choreography.
- [ ] Run the focused suite and commit `fix(play): assign forced-pass turnover to puck carrier`.

### Task 2: Add the support-angle sibling

**Files:** Create `src/play/plays/supportAngleFlat.js`; modify `src/play/playCatalog.js`; test `scripts/test-question-kinds.mjs`.

- [ ] Add a failing test asserting the sibling is cataloged, valid, asks who should create a better angle, selects F2, and contains no turnover/blame wording.
- [ ] Run the focused test and confirm it fails because the play is missing.
- [ ] Author a frozen pre-pass actor-selection node with F1 `[146,58]`, F2 `[148,30]`, D1 `[158,44]`; route every option to a terminal teaching frame where F2 moves to `[140,26]` behind the puck line and a `Better angle` cue marks the new lane.
- [ ] Add the play to `ALL_ANIMATED_PLAYS`, run question/engine/telemetry/build verification, and commit `feat(play): add support-angle actor read`.

### Task 3: Manual gate and durable capture

- [ ] Open both plays at U11 and U13 in `#playtest`.
- [ ] Confirm forced-pass play makes F1 the defensible answer and support-angle play makes F2 the availability answer.
- [ ] Record the gate result in `docs/manual-playtest/question-kinds-cycle1.md` only after Thomas confirms the actual plays.
- [ ] Merge locally after fresh verification and update the Obsidian RinkReads current-state note.
