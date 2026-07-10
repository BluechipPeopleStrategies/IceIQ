# Visible-Cue Prediction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Replace hidden-intent prediction with a visible-cue geometry read.

- [ ] Add a failing test rejecting "What does the defender do next?" and requiring the prompt to ask what happens to the passing lane.
- [ ] Update the defender-step play's freeze positions, prompt, options, feedback, and truth copy so D1's step is visible and the lane behind D1 is the predicted consequence.
- [ ] Add a reusable validator error for predict-next prompts using hidden-intent wording such as "what does [actor] do next".
- [ ] Run question-kind, play-engine, telemetry, and build checks.
- [ ] Commit and return to manual play review.
