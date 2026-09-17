# RinkReads lesson layout lab

September 17, 2026 — four working comparison storyboards. Design review only; not deployed to RinkReads.

Open rinkreads-layout-lab.html in a browser. It is standalone and works without a server. Choose U7/U11, choose layout A/B, then Start lesson. Switching layouts starts a fresh attempt.

- U7 A: one step at a time. U7 B: scrolling lesson.
- U11 A: linear lesson with inline feedback. U11 B: missed authored answers lead to a separate review/retry route.
- Both layouts of each lesson contain all six original questions. Exact prompts, option text/IDs, answer keys, explanations, objectives and starting actor positions are embedded unchanged from version 2 of the source scenes.
- U11 branches navigate feedback only. Hypothetical hockey changes stay verbal and the board retains the original freeze.
- Placement uses numeric controls in this storyboard, with a preview and bounds checks. It receives ungraded coaching feedback. This is a layout prototype, not a replacement for the app's drag interaction.
- Optional reflection can be skipped. Sequence activities show the authored suggested routine without claiming it is the only valid order.
- No backend, storage, external assets, new dependencies or mastery awards. Responses exist in page memory only. Reload clears them.

## Verification

Source: C:/Users/mtsli/IceIQ/src/one-on-one/experimental-companions.json.
Scenes: draft26-u7-vocab-001 and draft26-u11-cause-001, both version 2. Rink landmark coordinates come from the existing metric rink profile; illustration is an original schematic, not a production 3D asset.

Build check: embedded source payloads exactly match source; JavaScript parses. Hashes are embedded in the page and recorded in storyboard-provenance.json.

Actual isolated Chromium browser checks:
- All four routes completed all six activities and reached recap.
- Every rendered prompt, option text and revealed explanation matched the embedded source payload.
- Empty answer submission blocked; Next remained disabled until feedback.
- U11 incorrect-choice review/retry branch exercised, then corrected answer continued.
- Optional reflection skip and typed reflection exercised.
- Sequence reorder, invalid placement rejection, valid placement preview and scrolling completion guard exercised.
- 1366px desktop screenshot inspected; 390px phone screenshot inspected.
- All four layouts at 390px: no horizontal overflow, minimum button height 44px, rink labels approximately 14.9px on screen.
- 320px scrolling layout: all six questions rendered, no horizontal overflow, rink labels approximately 11.5px. Source-details disclosure also checked open.

No child learner test, physical tablet test, screen-reader certification or teaching-effectiveness finding. The preferred default remains a design hypothesis. App tests were not repeated because this batch changes only standalone prototype/research files.

## What to judge

Start with U7 stepped versus scrolling. Then try a deliberately incorrect U11 answer in each layout. Judge whether the extra review step is helpful or interrupts the lesson. Keep the same content when comparing. Counterbalance order across learners to reduce recall/order effects. This activity does not qualify the underlying hockey content for mastery.

## Delegation

Qwen model qwen3.8-huihui:27b was observed loaded via localhost:11434/api/ps. One bounded first-pass critique used a compact UI-only brief (1K context, 170-token cap, thinking disabled), completed successfully, no retry. Input/output: work/storyboard-qwen-request.json and work/storyboard-qwen-result.json in this Codex task. Accepted counterbalancing advice. Did not adopt its suggestion to equalize all screen density, because segmentation/density is part of the layout variable being compared; its claimed performance bias is not observed evidence. Codex performed implementation, source fidelity and browser verification. No Claude or Codex worker launched. Savings unmeasured.