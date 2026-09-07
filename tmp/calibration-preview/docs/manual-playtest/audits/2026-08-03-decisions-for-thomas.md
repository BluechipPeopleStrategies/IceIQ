# Decisions that need Thomas — 2026-08-03 remediation

**What this is.** Every open question from the two 2026-08-03 audits and the two
playtest sessions that cannot be settled by reading code, running a test, or applying a
rule already written down. Nine items. Seven of them were not on the remediation plan's
"four decisions" list.

**Already decided, not re-asked here:** Canadian spelling for player-facing prose;
half-wall geometry adopts ANCHORS; all 156 U11 questions declared `mc`.

**Read order:** the list below is already ranked by leverage — how much work each answer
unblocks. Answering 1-4 unblocks roughly 90% of the queued work.

---

## 1. The `next` questions now ask "What happens next?" but every answer is something YOU do

> **KNOWN — this is A1, reopened.** A1 as written was "render a badge, or edit 17
> stems?" The badge has since been rendered — `src/App.jsx:2507` and `:3865` both draw
> **"🔮 What Happens Next?"** above `next`-type questions in the main quiz and the
> weekly quiz. So A1's fork is taken. What is still open, and is now live on screen, is
> the *wording* of that badge.

**Question.** Seventeen questions now show a child "What happens next?" and then offer
four options that are all things the child should *do* ("Stop, pivot, and get back on
the puck"). Should the badge ask what you should DO, or should the questions be rewritten
so they genuinely ask what will HAPPEN?

**Why it needs Thomas.** Whether RinkReads teaches *prediction* (reading what the play
will become) as a separate skill from *decision-making* is a curriculum call, not a
copy call. Prediction is arguably the highest-value game-sense skill in the product's
whole thesis.

**Options.**

| Option | Consequence |
|---|---|
| **A. Change the badge to "What Do You Do Next?"** | One string, both render paths, fixes all 17 immediately. Keeps `next` as a decision type; the type name stops describing the type. |
| **B. Keep "What Happens Next?" and rewrite all 17 option sets into outcome predictions** | 17 new option sets authored from scratch, each needing a coach's sign-off. Creates a genuinely distinct question type. Weeks, not hours. |
| **C. Change the badge now (A), and add a real prediction type later as new content** | Fixes the live mismatch today, keeps the prediction skill on the roadmap without blocking anything. |
| **D. Leave it** | A child reads a prediction question and is graded on an action. |

**Recommendation: C.** The 17 keyed answers are all actions, so the badge is the thing
that is wrong today — and prediction is worth building properly rather than retrofitting
onto 17 stems that were not written for it.

**Blocks.** The interrogative preflight guard (it has to know what a valid `next` ask
looks like), and any further `next` authoring.

**Cost of getting it wrong: HIGH.** This is on screen right now. A mismatched ask means
a child picks the right outcome and is told they are wrong.

---

## 2. Should U7 and U9 questions be banned from using zone words at all?

**Question.** Hockey Canada plays U7 cross-ice and U9 half-ice — those kids have no blue
line, no point, no neutral zone in their actual game. The language audit wants U7/U9
questions to say "our end / attack end / the middle" and never "defensive zone / blue
line / the slot / the crease". Do you want that hard ban, or should the youngest bands
start learning the real words early?

**Why it needs Thomas.** This is a coaching-philosophy call about when a 7-year-old
should meet hockey vocabulary, and it depends on what Edmonton U7/U9 coaches actually say
on the bench. Nobody but him can settle it.

**Options.**

| Option | Consequence |
|---|---|
| **A. Hard ban (audit's Tier Y)** | 33 existing U7/U9 uses get rewritten; matches the on-rink banner the app already draws (`OUR END`/`ATTACK END`/`MIDDLE`); the youngest bands never see a word for ice they don't play on. |
| **B. No ban — one vocabulary for all ages** | Zero rewrites; simpler to author and validate; a 7-year-old reads "defensive zone" about a rink they have never been on. |
| **C. Ban only the geometry that does not exist cross-ice (blue line, the point, neutral zone), allow the rest (zone names, the slot, the crease)** | Middle path, ~17 of the 33 rewritten; needs a written line about which terms are in which bucket. |

**Recommendation: A.** The app already speaks Tier Y on the rink itself, so the
questions are the one place that disagrees — and it costs 33 strings today versus far
more once U7/U9 grows past 69 questions.

**Blocks.** All 60 zone-name rewrites (each U7/U9 row's target wording depends on this),
the U7/U9 half of decision 4, and the new `rinkFeatures` "teach the areas" entries you
asked for in CONTENT-11 — that build has to know which areas are teachable at which band.

**Cost of getting it wrong: MEDIUM.** Reversible, but it is a second pass over the same
60 strings.

> **Cross-audit conflict this resolves.** The language audit forbids zone names at U7/U9.
> The incomplete-stems audit says U7/U9 questions are *missing* zone information and need
> it added (its Category-2 items 3 and 16 are both U7 stems whose right answer changes by
> zone). Both cannot be right as written. Answering this decides which wins, and the
> likely reconciliation is "add the context, in Tier Y words."

---

## 3. Age-banded player identification, or one convention everywhere?

> **KNOWN — this is B3.**

**Question.** Should how players are labelled change by age band (no labels at U7/U9,
full position names at U11/U13, `F1`/`F2`/`D1` at U15/U18), or should one convention run
across the whole product?

**Why it needs Thomas.** It is a product-design call about whether a child re-learns
vocabulary as they age up, and it turns on what he wants the app to be at U15.

**Options.**

| Option | Consequence |
|---|---|
| **A. Age-banded, three tiers (audit's recommendation)** | 113 strings + 6 code changes; matches every other banded thing in the app; `F1` keeps its real meaning (a role in the moment, not a position). |
| **B. One global convention — position names everywhere** | Simpler to author and validate; "Left Wing" is a false description of a cross-ice U7 game; `F1` cannot be swapped for "Left Wing" without changing the hockey. |
| **C. One global convention — `F1`/`D1` everywhere** | Consistent, but a 9-year-old needs a glossary before they can read a question. |

**Recommendation: A.** What is actually broken today is four conventions inside a single
U11 board, not several conventions across the product.

**Blocks.** All 113 Axis-B strings, the marker-legend UI, and the validator tier check.

**Cost of getting it wrong: MEDIUM.** Reversible, but it is the largest single batch.

---

## 4. What do we call the position, now that "defenseman" is going away?

**Question.** The gendered-language sweep replaces `defenseman`/`defensemen` (90 strings,
70% of that whole batch) with **defender**. But "defender" already means *whoever is
defending on this play* in this bank — and three live stems say "You are a defenseman,"
which becomes "You are a defender," i.e. "you are the one defending." Is "defender" the
word, or do you want something else for the position?

**Why it needs Thomas.** This is the word a hockey parent and a hockey kid will read 90
times. It is a voice call and a hockey-clarity call at once.

**Options.**

| Option | Consequence |
|---|---|
| **A. "defender" everywhere, plus the rule "always possessive-qualify the position" ("your defender" = plays D; bare "the defender" = whoever is defending)** | Moves toward the app's own dominant word (596 uses vs 58); one ambiguity managed by a rule; the three "you are a defender" stems still read oddly. |
| **B. "defender" for opponents, and "playing D" / "your D" when the reader IS the position** | Reads the way a coach talks; adds a second term, so the standard is two rules instead of one. |
| **C. "defence" (Canadian, matches the spelling decision) for the position, "defender" for the role** | Cleanest split in meaning; "you are a defence" is awkward singular; adds a new word to 90 strings. |

**Recommendation: A with B's exception** — "defender" as the standard, "you're playing D"
for the handful of stems where the reader is the position.

**Blocks.** 90 of the 122 gendered-language strings — the bulk of the batch the plan calls
"ready now."

**Cost of getting it wrong: LOW.** A find-and-replace either way, no keyed answer moves.

---

## 5. The 25 questions that don't say enough to be answerable — fix, or accept some as concept questions?

**Question.** Twenty-five questions (a floor — the real number may be nearer 76) have a
right answer that changes depending on a detail the question never states: which zone
you're in, where the puck is, how far from the net, what the score is. Do we add the
missing detail to all of them, add it only where the answer genuinely flips, or accept
that some are fine as general concept questions rather than game situations?

**Why it needs Thomas.** The audit is explicit that it cannot detect these reliably and
expects a coach to reject some of its list. Deciding whether "generally speaking, keep
your feet moving" is a legitimate question or a defect is hockey judgment.

**Options.**

| Option | Consequence |
|---|---|
| **A. Every situational stem must state zone + puck location** | Strongest guarantee; adds words to short U7 questions and makes some of them wordy for a 7-year-old; ~25-76 edits. |
| **B. Add the detail only where the right answer changes without it** | Smallest edit set; requires a per-question ruling from him or a coach — a 25-row review sheet. |
| **C. Re-frame the vague ones as explicit concept questions ("In general, what's the quickest way back to a loose puck?")** | Honest about what they are; loses the game-situation feel that makes the app work. |
| **D. Retire the worst of them** | Shrinks a bank that is already thin outside U11. |

**Recommendation: B**, delivered as one review sheet — it is the only option that spends
his attention exactly where hockey judgment is actually required.

**Blocks.** Nothing can start on CONTENT-2 (his own most-repeated finding, four instances
in one session) until this is answered. It also sets the authoring rule going forward.

**Cost of getting it wrong: HIGH.** These are questions where the child can be right and
be marked wrong. His own Question-of-the-Day example is one of them.

> **Not in the remediation plan.** The plan covers the 45 incomplete stems and the 321
> language strings; the 25 under-specified stems (Category 2 of the same audit) are not
> in it at all.

---

## 6. Eight questions describe jersey colours but have no picture — cut the colours, or draw the picture?

**Question.** Eight questions ("the white-jersey teammate", "the gold defenceman") carry
colour references with no image attached, which is the exact inversion of the rule he
stated: *when there's no picture, only include the information we absolutely need*. Do we
strip the colours out, or commission the diagrams these questions were clearly written
for?

**Why it needs Thomas.** Five of the eight are "spot the mistake" questions where the
colour is the only thing identifying *whose* mistake it is — stripping it means
re-authoring the hockey, not just deleting an adjective. Whether that's worth an art
build is his call.

**Options.**

| Option | Consequence |
|---|---|
| **A. Strip the colours, name the subject another way ("the defender in this clip")** | Free, immediate, applies his stated rule; a couple of the U15 ones (four colour references each) need genuine rewriting to stay coherent. |
| **B. Build the eight diagrams** | The questions become what they were written to be, and colour becomes load-bearing rather than decorative; costs art time and a scene-manifest entry each. |
| **C. Strip the colours now, queue the diagrams as a later content build** | Removes the defect today without giving up the better version. |
| **D. Retire the eight** | Cheapest, and U9/U13/U15 are the thinnest bands in the bank. |

**Recommendation: C.** His rule already tells us what to do while there is no picture, and
the diagrams are a real improvement worth keeping on the list rather than pretending
away.

**Blocks.** The fix for those eight, and the precedent for every future generated question
that references a colour.

**Cost of getting it wrong: MEDIUM.** Rewriting a stem twice, not a wrong answer reaching a
child.

---

## 7. "Odd-man rush" — keep it, or find a non-gendered way to say it?

**Question.** "Odd-man rush" appears 90 times (29 in prose, 61 in ids and file paths that
cannot change). It is a real term of art with no accepted neutral equivalent. Keep it, or
change it?

**Why it needs Thomas.** He drew the line himself — "let's not have it gendered unless we
absolutely have to." This is the only item in the whole audit where the neutral wording is
*worse* copy than the gendered wording, so it is exactly the exception he carved out, and
only he can say whether it qualifies.

**Options.**

| Option | Consequence |
|---|---|
| **A. Keep "odd-man rush"** | Zero cost; one documented exception; the product ships a gendered term on purpose. |
| **B. Prefer the specific numbers in new copy — "2-on-1", "3-on-2" — and keep "odd-man rush" only where a generic is unavoidable** | ~15 strings; clearer for a 9-year-old regardless of the gender question; the term survives where it has to. |
| **C. Sweep all 29 prose uses to "odd-numbered rush"** | Fully neutral; reads foreign to a hockey parent; ids and asset paths still say "odd-man" forever. |

**Recommendation: B.** It improves comprehension independently of the gender question,
touches no ids, and keeps the term where hockey needs it.

**Blocks.** Closing out the gendered-language batch — this is the one item in it that
cannot be swept without an answer.

**Cost of getting it wrong: LOW.** Prose only, fully reversible.

---

## 8. Which coach persona is the woman?

**Question.** He asked for female coach feedback to be spoken in a female voice. All four
current personas (Kincaid, Danno, Marques, Kowalski) read male. Is one of them meant to be
a woman, is she somewhere else in the product, or does she not exist yet?

**Why it needs Thomas.** It is his cast. Nobody else can say whether this is a voice-
mapping job or an "add a persona" job.

**Options.**

| Option | Consequence |
|---|---|
| **A. Name one of the four as the woman** | Voice mapping only; the persona's written voice and avatar may need to follow. |
| **B. Add a fifth persona** | New character work — name, voice, coaching style, avatar — before any voice mapping lands. |
| **C. Drop gendered voices; give each persona a distinct voice, gender unmarked** | Fixes the real defect (all four share one system voice) with no casting decision at all. |

**Recommendation: A or C.** Right now all four personas speak in the identical system
voice, which is the bigger defect; if no woman is intended, C fixes it today.

**Blocks.** The entire coach-audio workstream (S2-20) — `src/speak.js` never assigns a
voice at all, and it cannot be written until we know how many voices there are.

**Cost of getting it wrong: LOW.** Reversible; no hockey content involved.

---

## 9. Rename the `Iron Man` badge to `Workhorse`?

> **KNOWN — this is B1.**

**Question.** The `Iron Man` badge (5 sessions completed) is the one gendered term a
player actually earns. Rename it to `Workhorse`?

**Why it needs Thomas.** Badge names are brand voice, and this one is player-visible.

**Options.**

| Option | Consequence |
|---|---|
| **A. Rename to "Workhorse"** | Consistent with the rest of the sweep; hockey-native word. |
| **B. Rename to something else** | Same cost, his word. |
| **C. Keep "Iron Man"** | One documented exception, alongside odd-man rush. |

**Recommendation: A.** "Workhorse" is what a coach actually calls that player.

**Blocks.** Nothing — it is one string.

**Cost of getting it wrong: LOW.** Verified: badges are recomputed from session stats on
every load and are **not persisted by key** (`src/App.jsx:151`, `:565`, `calcBadges`), so
nobody loses a badge they earned and nobody sees a broken reference. The
"someone-may-have-earned-it" concern does not apply.

---

## Ranked by leverage

| Rank | Decision | New? | Unblocks | Cost of wrong |
|---|---|---|---|---|
| 1 | `next` questions: ask what you DO, or what will HAPPEN? | **NEW** (reopens A1) | 17 live questions + the preflight guard | HIGH |
| 2 | Ban zone words at U7/U9? | **NEW** | 60 zone rewrites, U7/U9 half of #5, the rink-vocabulary build | MEDIUM |
| 3 | Age-banded player identification? | KNOWN (B3) | 113 strings + 6 code changes | MEDIUM |
| 4 | What do we call the position instead of "defenseman"? | **NEW** | 90 of 122 gendered strings | LOW |
| 5 | Under-specified stems: fix all, fix the flips, or accept as concept questions? | **NEW** | 25-76 questions, CONTENT-2 entirely | HIGH |
| 6 | Colour-coded questions with no picture: strip or draw? | **NEW** | 8 questions + future generated content | MEDIUM |
| 7 | "Odd-man rush": keep or replace? | **NEW** | closes the gendered batch | LOW |
| 8 | Which coach persona is the woman? | **NEW** | all coach-audio work | LOW |
| 9 | `Iron Man` → `Workhorse`? | KNOWN (B1) | one string | LOW |

---

## Considered and rejected — these do not need him

Each of these looked like a decision and is not. Listed so the filtering is auditable.

**Settled by a rule already written down**

- **The 26 `mc` stems needing "What is the best play?"** — that exact phrasing is already
  the bank's dominant ask, used verbatim in five existing questions across U7/U9/U13. It is
  precedent, not a choice.
- **The 2 `seq` purpose clauses** ("Order the steps for getting the puck out of your
  zone") — the audit flagged them as the only place it wrote more than a stock sentence,
  but both clauses are read directly off the option text and match the one good existing
  `seq` example. They become rows on the review sheet, not a decision.
- **"the wall" vs "the boards"** — the audit and `docs/references/rink-area-vocabulary.md`
  §3 already agree: grandfather existing use, prefer "the boards" in new copy. 200 strings
  saved by not asking.
- **"middle of the ice"** — 12 of 14 uses mean the lateral middle lane, not the neutral
  zone. Verified, do not sweep. No decision.
- **`linesman` → `linesperson`, `man-to-man` → `player-to-player`, `faceoff men` →
  `faceoff takers`, `guys` → `players`** — no hockey meaning changes, and the NHL renamed
  linesman itself in 2020.
- **`he`/`his` about named real players (Draisaitl, Makar, Knight…)** — changing them makes
  the facts wrong. The audit already excludes them; there is nothing to decide.
- **Which `rinkFeatures` fields to change** — R-A3 answers it: change `name`, never `id`,
  because `RinkReadsRinkQuestion.jsx` throws on an unknown id.
- **Whether to touch `F1`/`D1` ids** — R-B1 answers it: `label:` only, never `id:`; the ids
  are asserted in six test files.

**Answerable by reading the code or running a test**

- **Why a U9 question was served in a U11 session** (band filtering leak) — trace the
  filter, no judgment involved.
- **Whether any of the 45 stems are already killed by `review-queue.json` /
  `src/review/overrides.js`** — readable.
- **`isFilmRoomProfile` matching any profile containing the substring "u15" or "film"** —
  a bug with one correct fix.
- **The `WeeklyQuiz` `mistake`-render gap** — already fixed in `2f08ec5`.
- **The 4 seeds carrying only one of `level`/`levels`** — mechanical normalisation.
- **Whether the badge rename orphans earned badges** — verified it does not (see item 9).

**Better served by a draft he reacts to than a question he answers cold**

- **CONTENT-4, the "when is the risky pass worth it?" distractors** (`bank.json`, U11
  decision-making) — the distractors are unrelated assertions and the question is
  answerable by elimination. That needs a rewrite drafted first; asking him to specify one
  from scratch costs more of his attention than reviewing one.
- **CONTENT-12, the stick-tap-on-the-ice question** he flagged with "I'd be surprised if it
  would hold up to scrutiny" — a genuine coach-verification item, but it is already one of
  the 45 getting an ask appended, so it lands on the A2 review sheet as a row. No separate
  question needed.
- **S2-30b, the gym point scheme** — his sentence was cut off mid-thought
  ("I want the point scheme to be—"), so there is a real opinion we do not have. But the
  decay-constant defect underneath it (a correct answer at 1.5s scores 20 of 1000; at 2.9s
  it scores zero) is diagnosed and fixable now, and a proposed scoring model is cheaper for
  him to amend than a blank question is to answer.
- **"their zone" / "their own zone" possessive inversions** (6 rows) — each referent is
  resolvable from its own sentence; they go on the diff for review, not on this list.
- **Session length by tier** — he already gave the interim answer: "for now, let's just do
  five questions."

**Already decided**

- Canadian spelling for player-facing prose (2026-08-03).
- Half-wall zone geometry adopts the ANCHORS set.
- All 156 U11 questions declared `mc`.

---

## One thing to know before he answers

**The 45 incomplete stems contain no wrong keyed answers.** All 45 were read against their
option sets looking for a fix that would require guessing what the question meant to ask,
or a keyed answer that looks hockey-wrong. Neither turned up — every one of the 45 has an
option set that unambiguously answers the ask being appended, and every keyed answer is
defensible for its band. The only genuinely non-mechanical items in that batch are the two
`seq` purpose clauses (rejected above as review-sheet rows) and the `next` framing
(decision 1). That is why this list is nine items and not fifty.

---

## Answers — 2026-08-03

Thomas answered four of the nine in this round. Recorded verbatim with what each
one settles.

### #4 — What do we call the position?
> "Yeah, a defenseman's fine. Or LD/RD."

**Keep `defenceman`** (Canadian spelling per the B2 decision, so `defenceman` /
`defencemen`, not `defenseman`). `LD` / `RD` is acceptable for the position
abbreviations, and is a better fit than the `D1`/`D2` the B3 tier recommended —
LD/RD names the side, which is what a player actually hears.

**This does NOT mean the American spellings stay.** 90 strings still change, but as
a spelling normalisation rather than a degendering: `defenseman` (72) and
`defensemen` (14) → `defenceman` / `defencemen`.

### #7 — Odd-man rush?
> "Odd Man Rush is fine as well."

**Keep it.** No sweep. Prefer "2-on-1" / "3-on-2" in NEW copy where the specific
numbers are clearer for a young player, but nothing existing changes, and 61 of the
90 hits were ids and asset paths that were untouchable anyway.

### The rule these two imply — apply it without asking again

**Established hockey terms of art stay. Generic gendered phrasing goes.**

| Stays (term of art) | Goes (generic phrasing) |
|---|---|
| `defenceman` / `defencemen` | `open man` → open player |
| `odd-man rush` | `their` / `your` / `right man` → player |
| `man-to-man` (a real system name) | `Iron Man` badge → Workhorse |
| | `linesman` → linesperson |

This cuts batch B1 from 122 strings to roughly 27 real degendering changes, plus the
90 spelling normalisations that ride along with B2. It also resolves the question the
audit could not: the reason `defender` felt wrong as a replacement is that in this
bank `defender` already means *whoever is currently defending*, so "you are a
defender" is ambiguous where "you are a defenceman" is not.

### #8 — Which coach persona is the woman?
> "Coach Martinez is the woman, I think."

**Coach Marques.** There is no Martinez in the codebase — the roster is Kincaid,
Danno, Marques, Kowalski. Verified against the avatars in
`public/assets/coaches/`: Marques is the one woman; Kincaid, Danno and Kowalski all
read male. Recording the correction so the name does not propagate.

**Now implemented** in `src/speak.js`: `COACH_VOICES` maps each persona to a gender
and a variant, `pickVoice()` selects from the platform's voice list by name (the Web
Speech API exposes no gender field), and `speakParts()` accepts a `coachId`. Rate and
pitch carry each persona's written temperament — Kincaid clipped and flat, Danno warm,
Marques bright and quick, Kowalski slow and dry. Unknown voices are left
unclassified rather than guessed at, and if nothing matches the browser default is
used rather than forcing a possibly wrong-language voice.

**Caveat, and it matters:** coach feedback is **not spoken anywhere in the app today**
— TTS currently reads questions and choices, not persona lines. So this makes the
right voice available, but the defect Thomas described cannot actually be heard until
a coach-speech surface exists. That surface is not built. The capability is ready for
it.

### Still open — 5 of 9

1. **#1 (superseded but verify):** the badge now reads "What's Your Next Move?" rather
   than "What Happens Next?", because all 17 keyed answers are actions, not
   predictions. That resolves the conflict the audit raised — worth Thomas confirming
   the wording, but it is no longer a blocking fork.
2. **#2** — should U7/U9 questions be banned from zone words entirely? Resolves a
   genuine conflict between the two audits.
3. **#3 / B3** — age-banded player identification. ANSWERED (age-banded), with LD/RD
   now preferred over D1/D2 per #4.
4. **#5** — the 25 under-specified questions: add detail to all, only where the answer
   flips, or accept some as concept questions?
5. **#6** — eight questions describe jersey colours with no picture: strip the colours
   or draw the diagrams?
