# Packets 15–16 release evidence

Date: 2026-09-05. Scope: experimental question bank only.

- Local content commit: `624a30a`.
- Production candidate: `d3a94589568bb6db88a6e6a9ed3e4063c6dad65f`, parent `d9f06fab49a8a15fbde392d06dd8f2644f04b4f9`.
- 88 source question rows reviewed; 29 question versions changed across eight scenarios. Shared scene changes count as changes to every affected question, not as separate tactical defects.
- All 29 applied content hashes match the independently checked after-hashes.
- Original Claude returns preserved; packet 16 report counts disagree with its JSON and the discrepancy is recorded in the adjudication.
- Focused suite: 35 tests passed, zero failed. Isolated Vite production build passed. Existing large-chunk/dynamic-import warnings remain; local build has no Supabase environment and does not verify authenticated flows.
- Local browser at 390x844: wall puck visibly near the side boards, player placement at (-21, -10.7) submits and shows the intended conditional coaching suggestion; no horizontal overflow. Turnover question visibly distinguishes navy regain from gold possession.
- Supabase unchanged and deferred. Independent AI review is not human coach approval or mastery admission.

Production verified: GitHub commit status reports Vercel deployment completed for d3a94589568bb6db88a6e6a9ed3e4063c6dad65f. Deployment: https://vercel.com/bluechippeoplestrategies-projects/ice-iq/DyPH7MH3ebUgN5uiFcGst51AetZa . Live ice-iq.vercel.app at 390x844 showed the corrected near-board puck and scenario briefing. The repaired exp26-u11-019-q7 answer submitted successfully, displayed the navy-regain attacking-support feedback, and retained feedback after a cache-bypassing reload. No horizontal overflow on these checked screens. Packets 01–16 are now live; these representative browser checks do not claim a manual playthrough of every question.

