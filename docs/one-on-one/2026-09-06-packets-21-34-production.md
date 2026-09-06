# Packets 21–34 production evidence

Date: 2026-09-06.

- Root commit: `7b78911`.
- Isolated production commit: `9f9a778e63cfabab3ec7d543f1e7461b980816df`.
- Vercel reported successful deployment for that commit: https://vercel.com/bluechippeoplestrategies-projects/ice-iq/7BWQ9ocUPVTLqJhKTThbRiCusz1p
- 14 completed packets covered 572 records. Repairs changed 404 question versions in 68 scenes. Counts of affected versions include shared scene changes; they are not a count of independent defects.
- All 404 post-application hashes matched the current composed bank. The isolated release passed 44 focused tests and its production build. Five new regression tests failed before repairs and passed afterwards.
- The historical follow-up test initially failed because 20 rather than 5 records now differ from their archived versions. The assertion was updated for the 15 newly changed records, and exact question ID/hash plus immutable-receipt checks remain in place.
- Local 390×844 browser: four Navy/five Gold skaters visually inspected in `exp26b-u15-003`; Gold answer submitted with correct feedback. `exp26b-u15-005-q4` accepted coordinates 15,4 and showed the corrected high-support explanation. The position and feedback persisted after cache-bypassing reload. No horizontal overflow in these flows.
- Live 390×844 browser: `exp26-u13-015-q1` displayed and accepted “In a wide neutral-zone lane”; correct feedback persisted after cache-bypassing reload. No horizontal overflow.
- The viewport resize request remained under 390×844 device emulation, so this turn does not claim a desktop rendering check. Browser screenshots were viewed inline; the browser tool refused a requested local screenshot output path, so no saved screenshot file is claimed.
- Known build warnings remain: large chunks, one mixed static/dynamic scenario import, and the local empty Supabase vendor chunk. No auth or database change was released.
- Camera framing can still omit a distant defended net in some recovery scenes, as previously recorded. This release does not close that visual follow-up or certify all scenes as defect-free.
- Earlier AI review failures and rejected false positives are preserved in `docs/factory/research/question-review/packets-21-34-review.md`.

Packet 35 arrived while this batch was being verified and is handled in a separate follow-up release.
