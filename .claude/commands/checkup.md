---
description: Run a full RinkReads health checkup now and offer to fix what is safe.
---

Run a fresh, full RinkReads Doctor pass regardless of the 24h gate, then help fix.

1. Run `npm run doctor` (the full pass, including the audit scripts). It writes
   `docs/checkups/latest.{md,json}`.
2. Read `docs/checkups/latest.json` and give the user a tight summary grouped as
   Errors, Warnings, and Cleanup candidates, worst first.
3. Ask whether to fix. If yes, dispatch the `rinkreads-doctor` agent to apply only
   high-confidence fixes on the current branch (it will refuse on `main`), then report
   what changed and the new counts.

Do not push. Do not commit to `main`.
