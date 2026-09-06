# Packet 18 production evidence

Date: 2026-09-06. Scope: experimental packet 18 only.

- Root content commit: fb55696.
- Release commit: bca7f41f7bc2d8a52fc828fe29de163bfdcc65b3; parent 1cb12a388f4e4839eefd8c859fd686cdc98cbdbd.
- All 30 questions reviewed; final changes affect 30 versions across five scenes. Shared scene changes are not separate tactical defects.
- Original Claude source byte hash and final proposal byte hash are preserved in independent-final-recheck.json. All 30 applied after-hashes match the independently reviewed payload.
- Source prose report says 18 repair / 12 retain, but its JSON contains 25 repair / 5 retain. Root adjudication records this discrepancy without rewriting the original return.
- All five position references confirmed on ice. Claude's b010 separation correction is preserved (D1 distance 4.47 to 5.01 m). Root's b011 target is 1.45 m from the boards instead of 4.45 m. The b012 recovery reduces puck distance 3.61 to 1.49 m.
- Focused suite: 35 passed, zero failed. Isolated production build passed. Existing large-chunk/mixed-import warnings remain. Local build does not verify authenticated Supabase flows.
- Local browser at 390x844: b011 q4 coordinates 20.2,11.5 accepted, rendered near the boards, and produced the correct conditional coaching suggestion; no horizontal overflow.
- Curriculum classifier follow-up for b009/b010 is recorded separately; not claimed fixed by content edits.
- Supabase unchanged. Independent AI review is not human coach approval or mastery admission.

Production verified: Vercel reports success for bca7f41f7bc2d8a52fc828fe29de163bfdcc65b3 (https://vercel.com/bluechippeoplestrategies-projects/ice-iq/CBxTQmpxKzeARJHRqUGSRP26jx41). Live b012 q5 rendered the explicit gain-of-control prompt, accepted the gold-possession response, displayed corrected navy-defence feedback and retained it after cache-bypassing reload. No horizontal overflow in the checked 390x844 flow. Packets 01–18 are live. Representative checks do not claim every question was manually played.

