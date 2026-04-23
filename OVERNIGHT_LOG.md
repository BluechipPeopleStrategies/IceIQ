# Overnight hardening pass — change log

**Scope:** Audit HIGH + MED hardening (AUDIT.md findings H-2, H-4, H-5, M-1, M-2, M-3, M-4, M-5, M-6, M-9, M-10, M-13, M-15, L-1, L-3).

**Non-negotiable:** dev-bypass escape hatch (AuthScreen dev panel + `isDevBypassEnabled()`) must remain functional so you can always re-enter as a dev if anything breaks.

**Skipped (need you awake):** H-1 `.env` rotation, H-3 signup/role flow changes, M-7 demo-ID consolidation (touches tier logic), M-8 alert → toast (needs new UI system), M-11/M-12 radius/spacing token sweeps (200+ mechanical changes, low value), M-14 shared.jsx export-style sweep (risky import breakage).

**Discipline:**
- One logical change per commit.
- `npm run build` after each change; abort if it fails.
- Append a row to this log after each commit.

---

## Commits

| # | Commit | Finding | What changed |
|---|---|---|---|
| _pending_ | — | — | — |

---

## Final summary (written after all commits ship)

_Populated at end of run._
