# Question Quality Report

**Generated:** 2026-04-30 against `questions.legacy-candidates.json`
**Total scored:** 869 unique questions across 6 age groups
**Scoring:** runs every question through [tools/mine-legacy-bank.mjs](./tools/mine-legacy-bank.mjs) which scores against [AUTHORING_STANDARDS.md](./AUTHORING_STANDARDS.md): option length variance, stem length, anti-pattern checks, curriculum classification, completeness of `why`/`tip` fields.

---

## Score distribution

| Tier | Count | % | What it means |
|---|---|---|---|
| **95+** | 10 | 1% | Reference-quality. Use as exemplars for new authoring. |
| **90-94** | 16 | 2% | Excellent. Ship as-is or with cosmetic edits. |
| **85-89** | 116 | 13% | Very good. One or two small issues. Quick polish. |
| **80-84** | 104 | 12% | Good. A flagged issue (length variance, missing tip, etc.) needs a fix. |
| **70-79** | 93 | 11% | Borderline. Read carefully — kill if the issue is structural. |
| **60-69** | 336 | 39% | Below quality bar. Most need rewriting. |
| **50-59** | 102 | 12% | Significant issues. Triage individually. |
| **<50** | 92 | 11% | Likely unsalvageable. Candidates for archive/delete. |

**Headline:** ~30% (262 questions) score 80+. That's your high-quality migration pool. Combined with the ~17 you'd hand-author for U7 anchors, this comfortably exceeds the MVP target of 108.

## Missing images — 174 questions waiting

These pov-mc questions reference `/pov-placeholder.svg` instead of a real image. Each `imageId` group can SHARE one image (multi-question-per-scene).

| Image ID | Archetype | # questions waiting |
|---|---|---|
| `IMG-2v1-001` | 2-on-1 Rush (defender between carrier and teammate) | **37** |
| `IMG-2v1-002` | 2-on-1 Rush (stick blocking pass lane) | **35** |
| `IMG-2v1-003` | 2-on-1 Rush (defender far away, lots of room) | **36** |
| `IMG-2v1-004` | 2-on-1 Rush (aggressive defender) | **36** |
| `IMG-cross-001` | Skating Crossovers | 3 |
| `IMG-eyesup-001` | Eyes Up | 3 |
| `IMG-eyesup-002` | Eyes Up | 3 |
| `IMG-pass-001` | Receiving a Pass | 3 |
| `IMG-pp-001` | Puck Protection | 3 |
| `IMG-pp-002` | Puck Protection | 3 |
| `IMG-stance-001` | Athletic Stance | 3 |
| `IMG-stance-002` | Athletic Stance | 3 |
| `IMG-stickoi-001` | Stick on Ice | 3 |
| `IMG-stickoi-002` | Stick on Ice | 3 |

**You only need 14 images to unlock all 174 questions.** 4 of them (the 2-on-1 series) carry the bulk — generate those first and 144 questions go live.

## Top 10 highest-scored questions (95+)

These are reference-quality. Author new questions in the same voice/structure.

```
u7_eyesup_001a1     pov-mc  Eyes Up · U7
u9_eyesup_002a1     pov-mc  Eyes Up · U9
u11_2v1_001a1       pov-mc  2-on-1 Rush · U11
u11_2v1_002a1       pov-mc  2-on-1 Rush · U11
u11_entry_001a      pov-mc  3-on-2 Entry · U11/U13
u11_entry_001c      pov-mc  3-on-2 Entry · U11/U13
u13_2v1_001a1       pov-mc  2-on-1 Rush · U13
u13_2v1_001a5       pov-mc  2-on-1 Rush · U13
u13_2v1_002a5       pov-mc  2-on-1 Rush · U13
u13_2v1_003a9       pov-mc  2-on-1 Rush · U13
```

## What "rate as high as possible" means in the current rubric

The scorer caps at 100. The +95-100 ceiling is reached by questions that hit:
- ✓ stem length in age window (not too short, not too long)
- ✓ 4 options
- ✓ option length variance ≤25%
- ✓ correct option doesn't visibly stand out by length
- ✓ no anti-patterns (all/none of the above, double negatives, "always/never" outside tf)
- ✓ tip present and ≤18 words
- ✓ why present and 5-60 words
- ✓ classifies cleanly into a curriculum concept (anchor concepts ★)
- ✓ has `levels[]` tag
- ✓ for pov-mc: image + alt text both present

Most questions stuck at 80-89 are missing ONE of: tip, alt text, or have option-length variance just over 25%. Those are 1-line fixes.

## Recommended workflow

1. **Generate the 4 IMG-2v1 images** first (highest leverage — 144 questions unlock).
2. **Run the bulk-bind script** I'll write to attach them to the right question groups.
3. **Triage the 80+ score tier** (262 questions) — Save & Ship that subset.
4. **Hand-author the U7 anchor gaps** (4-6 questions) using the U7_WORKBOOK_MVP.md template.
5. **Bank lands at ~270-280 questions** — well over MVP, all curriculum-aligned and high-quality.
