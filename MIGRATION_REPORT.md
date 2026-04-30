# MVP Bank Migration Report

**Generated:** 2026-04-30. Promotion of high-quality legacy candidates into the live bank.

---

## What just happened

`src/data/questions.json` went from **0 → 246 questions**. All scored ≥80 on the
authoring-standards rubric (see [QUALITY_REPORT.md](./QUALITY_REPORT.md)). Each row
lives in one "primary" level inside `questions.json`; `src/qbLoader.js` fans
multi-age questions out into every level in `levels[]` at runtime, so the
preflight `duplicate id` rule stays satisfied.

**Tool:** [tools/promote-legacy-candidates.mjs](./tools/promote-legacy-candidates.mjs)
**Npm script:** `npm run promote:legacy` (dry-run) or `npm run promote:legacy -- --apply`

## Per-age coverage

| Level | Rows in `questions.json` | Effective at runtime (after fan-out) |
|---|---:|---:|
| U7 / Initiation | 25 | 25 |
| U9 / Novice | 37 | 41 |
| U11 / Atom | 55 | 75 |
| U13 / Peewee | 70 | 108 |
| U15 / Bantam | 32 | 81 |
| U18 / Midget | 27 | 49 |
| **Total** | **246** | **379 slot-fills** |

## By type

- `mc`: 193
- `pov-mc`: 53

## Image coverage (pov-mc)

- 7 with real images on disk
- 46 still on `/pov-placeholder.svg` — gated on the IMG-2v1 series being authored

| Image ID | Questions waiting |
|---|---:|
| IMG-2v1-001 | 12 |
| IMG-2v1-002 | 11 |
| IMG-2v1-003 | 11 |
| IMG-2v1-004 | 10 |
| IMG-eyesup-002 | 1 |
| IMG-pp-001 | 1 |

The 4 IMG-2v1 images unlock 44 of those 46 questions. Briefs in
[COACHES_WHITEBOARD.md](./COACHES_WHITEBOARD.md). Use the Scenario Author
to compose the scene → Save & Ship → drop the PNG at
`public/assets/images/IMG-2v1-00X.png` → bulk-bind → done.

## What's still in the legacy candidates file (623 below the bar)

| Tier | Count |
|---|---:|
| 70–79 | 93 |
| 60–69 | 336 |
| 50–59 | 102 |
| <50 | 92 |

These stay in `src/data/questions.legacy-candidates.json` for triage —
they need rewriting (length variance, missing fields, anti-patterns) before
they're publishable. Mid-tier (70–79) is the next-best candidate pool;
1-line fixes (option-length normalization, missing tip, alt text) can bump
many into 80+.

## Next step

1. Author the 4 IMG-2v1 images (highest leverage — 44 questions unlock).
2. Re-run `npm run promote:legacy -- --apply` after each round of legacy
   fixes — it's idempotent, just rewrites `questions.json` from candidates.
3. Hand-author U7 anchor gaps using [U7_WORKBOOK_MVP.md](./U7_WORKBOOK_MVP.md)
   to lift the U7 count toward the 48-question target.
