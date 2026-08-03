# Remediation plan — incomplete stems and language strings

The two batches from the 2026-08-03 playtests that are **not** mechanical. Together
they touch 366 strings of player-facing content. Neither should be swept.

Why they are separate from everything else already shipped: every other fix this
session was verifiable by machine — a coordinate cleared a radius, a semantic diff
showed only the intended key, a mutation test failed and then passed. These two
cannot be. They change what a child is told is correct, and the project's own
standing principle is that a wrong "correct answer" reaching a child is the worst
defect this system can produce. So the plan below is built to keep a human in the
loop at exactly the points where hockey judgment is required, and to spend that
attention only where it is actually needed.

---

## Batch A — 45 incomplete stems

**Source:** [`audits/2026-08-03-incomplete-stems.md`](audits/2026-08-03-incomplete-stems.md)
**What it is:** 45 questions that present a scenario and four options but never ask
anything. Zero false positives after the auditing agent hand-read all 45.

### The shape of the work

The defect tracks question TYPE, not age band, which makes it far more tractable than
45 individual rewrites:

| Group | Count | What is actually wrong | Effort |
|---|---|---|---|
| **A1** — all 17 `next` questions | 17 | Nothing wrong with any individual stem. They were authored in a declarative convention on the assumption a "What Happens Next" badge supplies the interrogative. **There is no badge** — `next` renders under the same `📋 Game Situation` header as `mc`. | One decision, then either 1 UI change or 17 edits |
| **A2** — `mc` questions missing an ask | 26 | Genuinely incomplete. Each needs its own question added. | 26 reviews |
| **A3** — `seq` | 2 | Same as A2. | 2 reviews |

### A1 is a fork in the road, and it is the highest-leverage decision here

Two ways to fix 17 questions:

1. **Render the badge.** Add a "🔮 What Happens Next" header to the `next` branch, the
   way `tf`, `mistake` and `seq` all already have one. **One UI change fixes all 17
   questions and every future one.** No content is touched, so no hockey judgment is
   required and nothing needs your review.
2. **Add an interrogative to all 17 stems.** 17 content edits, each needing review.

**Recommend option 1.** It is the smaller change, it fixes the class rather than the
instances, and it matches what every other question type already does. Option 2 also
leaves the underlying inconsistency in place — the next `next` question authored will
have the same problem.

There is a wrinkle worth knowing before you pick: the U11 audit found that **0 of 17
`next` stems and 0 of 16 `mistake` stems contain a question mark**, while all 156 U11
stems do. So the declarative style is a real, deliberate authoring convention across
the bank — it just never got the UI support the other types got. That is evidence for
option 1.

### A2 and A3 — 28 questions needing real review

The audit has a proposed minimal rewrite for each: add the missing question, change
nothing else, never touch which option is correct. What is needed from you is a yes/no
per question, not authoring.

**Proposed workflow, cheapest first:**

1. I generate a single review sheet — current stem, proposed added question, the four
   options, and the keyed answer, 28 rows.
2. You go down it marking accept / fix / reject. Most will be accept; the proposed
   additions are mechanical ("What should you do?" style) precisely because inventing
   anything more is out of scope.
3. I apply only the accepted ones, verify by semantic diff that nothing but the stem
   changed, and run preflight + qa.

**Estimate:** one sitting. The 28 are concentrated in the `gen_*` generated questions —
U7 is worst at 25 of 39 — so they read as a batch rather than 28 unrelated problems.

### A guard, so the class cannot come back

Once the backlog is clear, a preflight rule: **every question must contain an
interrogative, or be of a type whose UI supplies one.** The audit's detector is already
written and validated at zero false positives across 262 questions and 49 seeds. This
is the piece that stops us doing this again in three months.

### Also in scope, found while auditing

`WeeklyQuiz` rendered `mistake` questions without their `question` field, so all 16
became this same defect when served in a weekly quiz. **Already fixed** (`2f08ec5`) —
noted here because it is the same class and it was found by sweeping, not by report.

---

## Batch B — 321 language strings

**Source:** [`audits/2026-08-03-language-standards.md`](audits/2026-08-03-language-standards.md)

Three axes, and they are **not** equally ready. Do them in this order.

### B1 — Gendered language (122 strings) — ready now, needs one decision

Dominated by one word: `defenseman` ×72 and `defensemen` ×14 are 70% of the batch, and
the app's own dominant word is already `defender` (596 uses vs 58). So this is mostly a
single find-and-replace against a term the codebase has already effectively chosen.

- `defenseman` / `defensemen` / `defenceman` → **defender** (90)
- `open man` → **open player** (10) — the one you flagged
- `their/your/right man` → **player** (5)
- `linesman` → **linesperson** (3), `man-to-man` (3), `faceoff men` (2), `doorstep man` (2), `point man` (1)
- `Iron Man` badge → **Workhorse** (1)

**Explicitly NOT swept**, and I agree with the audit on both: the `he`/`his` about named
real players in `hockeyInsights.js` (18 strings — changing them makes the facts wrong),
and "women's hockey" / "men's leagues" / "girls' hockey" (22 strings — real leagues).

**Your decision:** the `Iron Man` badge rename. It is player-visible and someone may
already have earned it. Everything else here I would just do.

### B2 — Zone vocabulary (86 strings) — one real decision, then mechanical

Nine competing names for three zones, plus eight orthographic splits (`net front` vs
`net-front`, `blue line` vs `blueline`, `faceoff` vs `face-off`).

**DECIDED 2026-08-03 — Canadian spelling.** Thomas's call. `centre`, `defence`, and the
Canadian forms throughout player-facing prose. Cost is 67 strings; the bank is 95%
American today (`center` 61 / `centre` 3, `defense` 61 / `defence` 6), so this is a
one-time correction on a product whose whole voice is Edmonton minor hockey, and it only
gets more expensive as the bank grows.

Scope of the decision: **player-facing prose only.** It does not touch code identifiers,
CSS values, ids, asset paths, or `scene-manifest.json` keys — see the traps below.

**The trap, and it is a real one:** `center` appears 515 times in `src/` and **only 61
are prose**. The rest are CSS values (`textAlign: "center"`, `justifyContent`) and
identifiers (`centerIce`, `center_ice_dot`). A global replace breaks the entire layout.
This has to be a reviewed, prose-only pass — which is exactly why it is not in the
"ready to apply" pile.

Second trap: `netfront`, `net-front`, `blue-line` and `odd-man` are **ids and asset
paths**, not just prose. In `bank.json` alone, 14 `netfront` are `sceneId` values
pointing at real PNGs under `/assets/scenes-u11/`, and 26 of 27 U11 `net-front` are
`id`/`conceptId`/`nodeId`. Those key into `scene-manifest.json`. Prose only.

### B3 — Player identification (113 strings) — needs your call on the model first

Six conventions in play, not the four you spotted: `F1/F2/F3` (49), positional names
(190 + 48 abbreviations + 66 seed tags), literal `YOU` (56 + 21), `A1/A2` (14),
`D1/D2` (14), plus stray `X1`/`W1`/`S1`/`P1` on-rink labels.

**The audit recommends age-banding rather than one global convention**, and argues it
well:

- **U7/U9** — no labels but `YOU`. Hockey Canada plays these bands cross-ice and
  half-ice, so there is no blue line, no point and no neutral zone in their actual game.
  The bank already uses net-relative language 33 times at U7/U9.
- **U11/U13** — full position names ("your left winger"), marker tags `LW`/`RW`/`C`
  with a legend.
- **U15/U18** — `F1/F2/F3` and `D1/D2`, introduced once per question.

The case against — one convention is simpler to validate and nobody re-learns anything —
is real. What beats it: the game itself changes under the child at U11, and **`F1`/`F2`
is a role in the moment, not a position**, so it cannot be swapped for "Left Wing"
without changing the hockey meaning. What is broken today is not "several conventions in
the app", it is **four conventions inside a single band**.

**The trap:** `F1`, `D1` and `A1` are actor **ids**, not just labels — the same token is
`id:` and `label:`, and the id is the key in every `pos:` map and every
`motions[].actor`. They are asserted in **six test files**. Change `label:` only.

**This one is the largest and I would do it last**, after A and B1, because it is the
only batch where the fix is a design decision rather than a correction.

### Two bonus findings worth acting on separately

- **`rinkFeatures.js` is missing every area name CONTENT-11 asked for** — no slot, no
  point, no corner, no half-wall, no net front — and has never been used by a single
  question. So the "teach the zones" content gap you raised has no vocabulary to teach
  from yet. That is a prerequisite, not a follow-on.
- **4 of 29 seeds carry only one of `level` / `levels`**, so any tool reading the other
  key mis-bands them. Small, mechanical, and I can fix it without review.

---

## Suggested order

1. **A1 decision** (badge vs 17 edits) — 17 questions fixed by one UI change if you take
   the recommendation. Highest leverage in the whole plan.
2. **B1 gendered language** — 122 strings, one decision (the badge rename), mostly a
   single word.
3. **A2/A3 review sheet** — 28 questions, one sitting.
4. **The interrogative preflight guard** — stops the class recurring.
5. **B2 zone vocabulary** — after you pick a spelling.
6. **B3 player identification** — largest, most design-led, last.
7. `rinkFeatures.js` area names, and the 4 seeds with a missing `level`/`levels` key.

## What I need from you

Four decisions, and none of them need research:

1. **A1:** render a "What Happens Next" badge (recommended), or edit 17 stems?
2. ~~**B2:** Canadian or American spelling?~~ — **DECIDED: Canadian**, 2026-08-03.
3. **B3:** age-banded player identification (recommended), or one global convention?
4. **B1:** rename the `Iron Man` badge to `Workhorse`?

Everything else in this plan I can carry without asking.
