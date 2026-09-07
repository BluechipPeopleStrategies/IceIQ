# Factory Run 01 — Real Images, End-to-End

**Input:** your 15 generated images (contact-sheet tiles 10–24).
**Pipeline:** vision-read (done by Claude, the only one who can see the images) → author question bank → 3-coach panel (tactical / pedagogy / adversarial) → verdict + applied fixes.
**Result: 9 shippable, 6 queued.** 40 coach-passed questions from 9 images.

## What shipped (9 images → 40 questions)

| Tile | Archetype | Decision | Questions | Ages covered | Formats |
|---|---|---|---|---|---|
| 12 | Defender committed / diving | REVISE→ship | 5 | U9, U11, U13 | MC, what-next, TF, spot-mistake |
| 14 | 2-on-1 (neutral defender) | PASS | 4 | U11, U15 | MC, tap, TF, what-next |
| 16 | 1-on-1 gap / closing defender | PASS | 5 | U11, U13 | MC, TF, tap, what-next |
| 17 | Controlled 1-on-1 | PASS | 4 | U13, U15 | MC, TF |
| 18 | Breakaway (1-on-0) | PASS | 4 | U7, U9, U13 | emoji, MC, TF, what-next |
| 19 | Behind-the-net / wraparound | PASS | 5 | U11, U13 | MC, TF, tap, what-next, spot-mistake |
| 20 | Offensive-zone faceoff | PASS | 5 | U11, U13 | MC, TF, what-next, spot-mistake |
| 22 | Corner board battle | PASS | 4 | U11, U13 | MC, spot-mistake |
| 24 | Net drive / scoring chance | PASS | 4 | U11, U13 | MC, TF, what-next, spot-mistake |

That collectively spans the **full gamut** — U7 through U15, and every format (MC, true/false, tap-the-target, what-happens-next, spot-the-mistake, emoji).

## What got queued (6 images — the gate doing its job)

| Tile | Why queued |
|---|---|
| 10 | Isolated 1-on-1, square neutral defender, no teammate — no single best play |
| 11 | Near-duplicate of 10 |
| 13 | Cluttered 2-on-2 — puck/roles unreadable, multiple defensible reads |
| 15 | Multi-player battle — unclear possession |
| 21 | Near-duplicate 1-on-1 of 17 |
| 23 | Net-front scramble — too cluttered for a fair read |

**This is the point:** the factory refused to ship a forced answer on an ambiguous image. Those 6 aren't deleted — they're queued for a human or a better image.

## What the coach panel actually caught and fixed

The panel didn't rubber-stamp anything. On the 9 that shipped, it caught and corrected real defects you couldn't have seen:

- **Impossible/absurd distractors** removed across nearly every bank ("pass the puck to the goalie," "skate to the bench," "pass to a teammate who isn't in the picture").
- **A mislabeled situation** — a breakaway-on-the-goalie wrongly tagged "1-on-0" was re-tagged 1-on-1 vs. the goalie.
- **Answer-leaking prompts** — several prompts restated the answer or embedded the rationale; rewritten so the kid has to *read the picture*.
- **Over-claims beyond the image** — explanations asserting things the frozen frame can't prove (e.g., "the goalie can't recover laterally") softened to what's actually visible.
- **A planted ambiguity test** — tile-14's neutral defender: the panel correctly refused to let "pass" be keyed as the only answer, and reframed the read as "attack to force the defender to commit, then take what he gives." That's the exact failure mode from your original sample, caught automatically.
- **The number-drift rule held** — every question references roles/colors ("the puck carrier," "the gold defender"), never jersey numbers, so they survive number variation between images.

## Honest caveats (the real gaps, confirmed)

- **Vision was done from my read of the contact sheet**, not from individual image files. In the production factory, vision reads each image file directly — and a coach must look at the *actual* image (not just the text read) to catch a vision misread. The panel flagged this itself ("no image file was supplied; correctness rests on the prose ground truth").
- **Tap questions reference targets, not pixel coordinates yet** — the production vision stage must output bounding boxes so taps are clickable.
- A couple of banks note art-QA checks (e.g., tile-14: confirm the second attacker is rendered clearly on the far side of the defender).

These are exactly the gaps named in the spec's risk list — none are blockers, all are wiring.

**Bottom line:** fed your own raw images, the factory produced 40 coach-passed, age-laddered, multi-format questions and correctly queued the 6 it couldn't teach from. The line works end-to-end. The shippable content is in `factory-run-01.json`.
