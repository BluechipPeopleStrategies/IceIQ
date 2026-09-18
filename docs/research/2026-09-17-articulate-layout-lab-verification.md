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
## September 17 foundation expansion

Added Know the Ice (22 landmarks/tactical areas), six lineup roles with responsibilities, and 24 illustrative map states (six roles × attack/defend/win possession/lose possession). Maps are hand-authored emphasis examples, not tracking data or fixed assignments. Full-ice board is an orientation illustration, not the required U7/U9 game format.

Added U7/U9/U11 Pack Your Gear: 13 equipment categories with original SVG icons, drag or tap/keyboard packing, removal, reset, persistent-on-scroll count and adult fitting guidance. Added Read the Referee: holding, roughing, head contact, goal scored, interference and slashing; 2/3/4 options by age, descriptions of motion, retry/reveal/next/restart. No production integration, storage or mastery credit.

Sources checked September 17: Hockey Canada parent FAQ and fitting guidance (linked in page); 2026–2028 Playing Rules, signal pages 2–3, glossary and relevant rule sections. Downloaded current PDF from the live official downloads page and visually inspected signal pages. High-sticking starter replaced with roughing after verifying Rule 9.5 is Junior/Senior-specific. The simplified original drawings and youth explanations still require qualified official review, alongside coach review of maps and adult equipment review.

Fresh verification:
- Build: exact original two-scene payloads unchanged; all script blocks parse.
- Actual Chromium: all 13 gear items pack; remove, reset and synthetic drop work; actual desktop dragTo works; keyboard Enter packs. Narrow-screen dragTo failed when source and bag required scrolling; phones have a tested click fallback, not a claim of native mobile drag support. Physical touch testing remains open.
- All six signals: incorrect-answer retry, reveal, correct answer, next and restart exercised. Age settings produce 2/3/4 choices. Explored count is not accuracy or mastery.
- 22 landmark selections, 24 map combinations with finite coordinates, six lineup markers and SVG keyboard selection verified.
- Collection switching correctly hides other modules, including the original lesson controls. All four collection screens checked at 1280/390/320px: no horizontal overflow; buttons at least 44px tall. No page errors in final headless checks.
- Desktop referee, mobile gear and all-six-signal contact-sheet screenshots visually inspected. Original four lesson flows were verified earlier; final change rechecks visibility/source preservation, not a repeat of every lesson completion path.
- Chrome DevTools screenshot/emulation stalled; completed visual and interaction verification with already-installed Playwright/Chrome in an isolated headless instance. No new dependencies.

Evidence in this task: work/foundations-browser-checks.json; work/tour-final-checks.json; work/verify-foundations.cjs; work/verify-tour-final.cjs; work/gear-mobile.png; work/signals-desktop.png; work/all-signals.png. App test suite was not rerun for standalone HTML/doc changes.

Local delegation: qwen3.8-huihui:27b on localhost:11434 supplied three compact critiques (ice-tour UI, MVP schedule, foundations UI); request/result pairs are work/ice-tour-qwen-*.json, work/mvp-qwen-*.json, work/foundations-qwen-*.json. One job at a time; no retries; 190/260/170 output-token caps. Accepted clear orientation/data labels, critical-path/buffer and explicit tap alternative. Rejected removing user-requested drag, equal-height layouts regardless of device, and single-family rehearsal. It generated no hockey facts and did not qualify content. No Claude or Codex workers. Savings unmeasured.

Plan saved as rinkreads-thanksgiving-mvp-plan.md: U7–U11 family pilot target October 10–12; October 7 go/no-go; October 8–9 buffer. Named coach, official and equipment review, access/entitlement decision, actual devices and 2–3-family rehearsal are dependencies. Dates and effort are proposed, not scheduled commitments.


## September 18 marker sizing
Standardized position labels to 19 SVG units and landmark numbers to 16, removing mobile enlargement; vertically centered both within their circles. Added a dynamic gold-selected/navy-other explanation, including why centre is initially gold. Chromium bounding-box checks confirm all six position labels fit inside their circles at 1280, 760, 390 and 320px. Verified selecting LW moves the highlight and explanation. Screenshot inspected. Source payload and script syntax checks pass.
