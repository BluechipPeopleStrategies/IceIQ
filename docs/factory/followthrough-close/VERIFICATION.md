# Followthrough closure and release preparation

Code integrated on `codex/followthrough-close`, starting from Claude return commit `4185e6e`. Original Claude return artifacts remain unchanged. This branch is prepared for integration review, not pushed or deployed.

## Fixed and checked

- Feedback retries: new submission identity on both local player feedback and decision notebook. Server persists one receipt per owner/submission ID, returns it on identical retries, rejects changed payload reuse, and preserves distinct submissions. Before: eight concurrent retries created eight notes. After: one note, including after server restart. Unit and browser lost-response tests passed.
- Feedback end-to-end: actual question widget, draft reload, successful submission, administrator internal comment, public investigating disposition through the existing CLI, player history, other-owner isolation, failed-send retention, retry and reload. Mobile viewport 390x844 focus/overflow and desktop report checks passed. Physical phone keyboard not tested.
- Curriculum: includes all 26 animated decision nodes, 95 age-specific opportunities. Inventory totals distinguish 280 unreachable POV rows from live opportunities. U15/U18 zero primary skating bindings do not prove absent skating content: animated pivot/match-speed content is available. Withdrew the unsupported 171 hand-read disclosure and the product-wide absence claim.
- Report mobile CSS: earlier cascade hid both table and mobile cards; now row cards display and other report tables remain available on phone widths.
- Draft intake: all ten original hashes verified. Every draft reviewed for identity, coordinates, answer IDs and clarity/arithmetic. All ten held with individual findings in draft-adjudication.json. No content admitted; no new qualification claimed.

## Validation

32 targeted Node tests pass (tests.txt); Vite production build passed with existing chunk-size/mixed-import warnings. `node tools/check-feedback-release-boundary.mjs` passes: local feedback endpoint, browser-owner transport and admin HTML excluded from production. `git diff --check` passes. `tmp/coaching-feedback/` is ignored and no files there are tracked. Browser checks and limitations are in browser-verification.json.

## Release boundary

These are local development feedback tools and an offline curriculum/report update. No production behavior needs deployment for this work to be useful. Preserve Claude's source output as historical evidence; use this report as the corrected intake. Do not bulk merge unrelated worktrees or admit staged drafts. Release manifest binds the modified code and new artifacts; its baseline is the inspected Claude return, not a claim that origin/main has moved.
