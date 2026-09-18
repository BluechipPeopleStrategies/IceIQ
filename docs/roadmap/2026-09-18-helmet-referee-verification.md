# Helmet, holding signal and spacing update

September 18, 2026 — local pilot candidate only.

## Implemented

- Step 3, Pack your gear: open **Explore helmet 3D sample**. Rotate the simplified helmet, choose front/side views, zoom/reset and select Outer shell, Face cage or Chin strap. Selection highlights the model part and explains its purpose. This does not pack an item or certify equipment fit.
- Step 4, Read the referee: while studying Holding, open **Explore holding signal 3D sample**. Starts on the held pose with a close-up of the hands. Replay, pause, resume, restart, a pose slider, held-pose button and camera controls are available. There is no autoplay or looping. Reduced-motion disables playback and retains manual pose inspection. Closing the sample stops playback.
- Step 5 matching remains unchanged and uses the original 2D signals. Viewing a sample cannot award progress or reveal a new answer in that activity.
- Both samples offer 2D alternatives. Simulated graphics-context loss shows the existing 2D illustration.
- Start button now has a measured 14px gap above the saved-progress text, leaving clearance for its raised lower edge. Wrapped labels and buttons stay within their containers. Checked pill/button intersections and page overflow at 320, 360, 390, 768 and 1280px widths.

## Source and content status

Helmet part descriptions use basic identification and adult fitting guidance. Source rechecked: [Hockey Canada equipment fitting](https://hockeycanada.ca/en-ca/hockey-programs/players/essentials/equipment-fitting), September 18. This generic model has no certification mark, brand or claim of correct real-world fit.

Holding cue checked against the existing local extraction from [Hockey Canada 2026–2028 rulebook](https://cdn.hockeycanada.ca/hockey-canada/Hockey-Programs/Officiating/Downloads/2026-28-hc-rulebook-e.pdf): grasp the opposite wrist in front of the chest. The web parser refused the current PDF because of its size; local source/extraction is `work/hc-rulebook-2026-28.pdf` and `work/hc-rulebook-text.txt`, lines 490–493. The model and transition are original authored geometry, not a certified motion capture. A qualified official must inspect the exact wrist grip, occlusion and transition. Arm lengths stay fixed throughout the interpolation; this is a geometry check, not a biomechanics or hockey qualification.

The 71-item review pack now includes the three part explanations inside the helmet review item and explicit 3D checks for helmet/holding. Its fingerprint includes the sample model, viewer, styling and pose/part data. Printable 2D drawings do not approve the 3D objects or camera views. Other gear and referee calls remain 2D.

## Verification

Production build passed (existing chunk-size warning); complete U7 flow/reload checks passed and production pilot access remained hidden. 30 focused tests passed, including fixed-length arm geometry over 101 poses, pose clamping, route boundaries, player/age isolation and save/resume. Browser checks passed: part selection; front/side/close-up and zoom/reset; 2D switching; simulated graphics loss; no progress mutation from inspection; replay/pause/resume/restart; reduced-motion and manual slider; no sample in matching; five-width overlap checks; no page errors. Screenshots were inspected and the referee's default framing was tightened to make the hands easier to see.

Physical phone/tablet performance, screen-reader audit, equipment-helper review and qualified official approval remain open. No dependencies, AI asset service or deployment added.

Evidence: `work/helmet-ref-verification.json`, `work/verify-helmet-ref.cjs`, `work/inspect-helmet-ref.cjs`, `work/helmet-ref-build.log`, `work/helmet-3d-desktop.png`, `work/referee-3d-desktop.png`, `work/pilot-spacing-fixed.png`.

## Local critique receipt

Qwen alias `qwen3.8-huihui:27b`, loopback Ollama, one sequential job, thinking disabled, 1600 context / 300 output cap. Compact proposal only; no account data. Request and result: `work/helmet-ref-qwen-request.json`, `work/helmet-ref-qwen-result.json`. No retry. Accepted clear targets, static initial pose, explicit playback and labelled fallback. Rejected extra double-tap/haptic mechanics and automatic frame-rate switching without measurements. Coordinator integrated and verified; no Claude or Codex worker. Savings unmeasured.
