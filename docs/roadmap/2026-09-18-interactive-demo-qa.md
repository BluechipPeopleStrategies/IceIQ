# Interactive demo review and repairs — September 18

## Owner direction
Test the public preview with a reviewer; repair camera-dependent stripes; make all rink landmarks selectable; make responsibility maps interactive; condense the layout; use glass-like position markers and BlueChip People Strategies fonts; add visual layering and restrained motion for MVP; let testers skip or open any section, especially Pack your gear; make walkthrough references open actual help.

## Implemented
- Public demo Home cards and all six stage buttons open their section directly. Skip for now is available beside Continue. Recommended order is guidance, not a lock. Section changes do not populate completion arrays, and Home/recap use actual activity evidence rather than the current stage number.
- Shared rink hit testing covers all 22 named landmark locations, both ends, boards, benches and overlapping areas. An Also here row exposes overlapping meanings. The label list remains available for keyboard use. 3D raycasting and 2D screen-to-SVG conversion share the same coordinates; camera dragging does not select an answer.
- Responsibility maps support direct player selection, puck placement, moving the selected player, keyboard sliders, reset, attack/defence and possession-change controls. The dotted connector is explicitly not a skating route. Movements are temporary exploration state; the heat areas retain their original illustrative, non-prescriptive meaning.
- Glass-like marker gradients, rim highlights and clearer labels; compact stage controls; layered cards; restrained hover/reveal motion with reduced-motion overrides. Inter and Playfair Display are served locally with their existing OFL licenses. BlueChip `references/brand-guidelines.md`, typography section, verified as the source. Anton is a cover-hook face, not the body/heading face for this app. No new fonts, packages or paid assets acquired.
- Wordmark returns to preview Home; selected age survives reload. Tour headings open the real activity, path or parent-help panel. Parent help explains shared sample progress, section selection, simpler views and practical adult support; no account/profile feature is advertised in the public demo.
- Ice drawing was only .005 m above the beveled base. Increased separation and improved near-plane depth precision. Camera fit uses projected rink/bench bounds across aspect ratios and rotations; explicit zoom remains available. A failed rink hides dead controls and offers Try 3D again plus the existing 2D choice.
- Freshly entered lessons no longer assert a successful save before an interaction. Referee distractors vary by signal instead of repeatedly using Holding.

## Independent reviewer and reconciliation
Qwen `qwen3.8-huihui:27b` was verified available and received only PreviewPortal source plus a compact critique brief. One loopback request timed out after 120 seconds without usable output. No retry or savings claim.

After disclosure, one bounded Claude review used existing subscription access and Read/Grep/Glob only. Existing desktop/VS Code Claude processes were observed and left alone. Earlier local usage receipts were read; no remaining allowance was inferred. CLI result reports success and 10 turns for a requested 8-turn limit. Observed usage: fresh input 16, cache creation 49,794, cache reads 276,584, output 17,253 (reasoning included). No follow-on broad batch or Codex worker was launched. Brief/result/usage receipts are in the active task's `work/live-qa-*` files.

Accepted: age reset, misleading initial save assertion, unavailable-3D controls and repetitive distractors. Home wordmark bug was independently reproduced. Corrected reviewer overclaims: full-app Back to site uses hash routing and is not inherently dead; returning to Home after reload is intentional if the selected age and checkpoint remain accessible; revision invalidation is an existing content boundary, not evidence that this release erases progress (content revision unchanged). Mobile camera-fit concern was tested with projected bounds. Reviewer saw the earlier preview, not every later owner-requested enhancement.

## Verification
- All 68 registered test scripts pass. Added meaningful depth separation, camera fitting, all-landmark reachability, moved role picking, rounded-rink placement and skip-without-completion regressions.
- Preview and full account builds checked separately. Chunk-size warning remains.
- Browser: completed all six original stages, including wrong-answer recovery and gear removal blocking normal Continue; checked direct stage jumps, empty recap counts, real parent-help opening, wordmark Home, U9 age after reload, 3D position picking, board picking, separate puck/player sliders and possession changes.
- All six sections checked at 320/390/768/1280px: no horizontal overflow. Rendered heading style is Playfair Display. Desktop screenshots inspected for marker appearance, labels and surface layering.
- The user supplied the striped-rink reproduction. It did not reproduce consistently on this browser/GPU; the geometry/depth defect is confirmed and the corrected depth/camera bounds pass. This is not a claim of testing every GPU or a physical phone.
- Backend account authorization, qualified hockey/equipment/official review and physical-device/family rehearsal remain open. Public preview uses no account backend.

## Release
Pending final production verification. Refresh the live page after release to load the new demo controls; existing local progress is preserved.
