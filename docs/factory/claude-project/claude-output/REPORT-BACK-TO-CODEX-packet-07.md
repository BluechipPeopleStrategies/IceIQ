# Report back to Codex — packet-07

**Snapshot:** `rr-20260905-c8403be16748c919`
**Packet:** `packet-07`
**Prepared by:** Claude (Claude Code, with the repository available locally)
**Date:** 2026-09-05
**Status of this file and its JSON companion:** `draft-not-reviewed`. Structural validation
was run and passed; that is not hockey approval, not a rendered-scene check, and not human
coach approval. No repository content was modified, no git operation was run, and no
application state was touched.

---

## 1. Counts

| Item | Count |
|---|---|
| Scenarios assigned | 5 (`exp26-u9-008` through `exp26-u9-012`, all U9) |
| Questions assigned | 50 |
| Questions reviewed | 50 |
| Retained | 33 |
| Repair proposed | 17 |
| Blocked | 0 |
| Unreviewed | 0 (`completion: "complete"`) |
| Scenario replacements proposed | 5 (each `version: 1 -> 2`) |

Per-scene repair counts: `exp26-u9-008` 5, `exp26-u9-009` 4, `exp26-u9-010` 2,
`exp26-u9-011` 2, `exp26-u9-012` 4.

Every scenario ID, age band and question ID is preserved. Version is incremented exactly
once per scene. Setup, briefing, cues, tags, sources and limits are byte-identical to v1 in
all five replacements, so the hashes of untouched questions are unchanged. The validator
confirms `affectedQuestionIds` lists exactly the 17 questions whose content hash moved.

---

## 2. The dominant finding: the `expansion/youth-first.json` block, again

All 50 questions carry `no-open-ai-finding` in `combined-review.json`. That label is not
load-bearing here. Splitting the packet by provenance explains almost every defect found:

| Provenance | Questions | Repairs proposed |
|---|---|---|
| Original q1-q6 (reviewed by `catalog-review.json` / `young-first.json`) | 30 | 3 |
| `expansion/youth-first.json` q7-q10, **with** a repair receipt in `repairs/youth-repairs.json` (`exp26-u9-010`, `exp26-u9-011`) | 8 | 1 |
| `expansion/youth-first.json` q7-q10, **no** repair receipt (`exp26-u9-008`, `exp26-u9-009`, `exp26-u9-012`) | 12 | **12 of 12** |

**Repair-receipt coverage check, as asked.** I searched
`docs/factory/research/question-review/repairs/` and the sibling directories. Only
`repairs/youth-repairs.json` touches this packet, and only for `exp26-u9-010-q7` through
`-q10` and `exp26-u9-011-q7` through `-q10`. `exp26-u9-008`, `exp26-u9-009` and
`exp26-u9-012` have no repair receipt anywhere in that tree. Their twelve expansion
questions were all marked `pass`, `highRisk: false`, `findingIds: []` by
`expansion/youth-first.json`, and all twelve are being repaired here. This is the fourth
consecutive packet where a zero-finding first-pass review on an expansion batch has failed
to hold.

The failure is not random. Each of the three unrepaired blocks imported a *different
scene's* situation:

- `exp26-u9-008` got a board-side puck-protection block, into a scene set at centre ice.
- `exp26-u9-009` got a carrier's passing block, into a scene where gold has the puck.
- `exp26-u9-012` got a defensive-coverage block, into a scene where navy has the puck.

`curriculum-coverage.json` is a plausible mechanism, not proof: its keyword signal for
`exp26-u9-012` matches **defensive-play** on the tokens `angle` and `pressure`, drawn from
an objective that is entirely about offensive support. Its own `meta.signalMethod` warns
that these signals "do not replace explicit concept binding or coach review." A generator
steering off that signal would produce exactly this drift. Worth checking before the next
expansion batch runs.

---

## 3. Five highest-impact before/after examples

### 3.1 `exp26-u9-012-q8` — the answer key states the wrong team has the puck

The most serious defect in the packet, and it is on a keyed answer, not in prose.

- **Before** — prompt "What two players should YOU name when helping Navy2?", keyed answers
  `a` "Gold1 with the puck" and `b` "Gold2 away from it"; explanation "Gold1 is the puck
  carrier and Gold2 is the away-side option."
- **Scene** — `setup.puck.owner` is `home-skater-2`, which is **Navy2**. The briefing says
  "Navy2 has the puck." `q1` and `q2` both say so. No gold player owns the puck.
- **After** — a `basis: scene` item keyed on two facts that are actually true in the freeze:
  "Navy2 has the puck" and "Gold1 and Gold2 are on opposite sides of Navy2" (verified:
  `(2, 1.5)` and `(2, -1.5)` straddle Navy2's facing line, each 2.5 m away). The third
  option covers something a still picture cannot show, whether Navy3 is calling.

### 3.2 `exp26-u9-009-q7`, `-q8`, `-q10` — possession invented for the whole back half

- **Before** — `q7` keys "Carry or move to a new clear angle" as something YOU can do; `q8`
  asks, on `basis: scene`, "Which two players should YOU compare before passing?" and its
  explanation calls Gold1 "the blocker"; `q10` reasons about "the line to Navy2."
- **Scene** — `setup.puck.owner` is `away-skater-1`, **Gold1**, whose carried puck renders
  at `(2, -1.7)`. The briefing states twice that navy no longer has possession, and `q1`,
  `q2` and `q6` of the same scene are built on that. Gold1 is the carrier, not a blocker.
- **After** — all three rewritten from gold possession: read the carrier and the ice in
  front of the carrier (`q7`); two visible facts plus a motion claim the freeze cannot
  support (`q8`); an off-puck reflection about two navy players on opposite sides watching
  different ice (`q10`).
- **Class** — this is the same failure the historical record logs for `exp26-u7-001-q7`
  and `-q8`.

### 3.3 `exp26-u9-008-q7`, `-q8`, `-q9`, `-q10` — a boards scene that is not this scene

- **Before** — "If Gold1 closes the boards..." (`q7`); "The boards beside YOU" keyed as a
  visible fact on `basis: scene` (`q8`); "Place YOU inside..." with reference `(19, 5)`
  (`q9`); "How can the boards help..." (`q10`).
- **Scene** — YOU stand at `(-2, -2)`, about **10.95 m** from the nearest side boards
  (half-width 12.954 m). No board is adjacent to any actor. `q9`'s reference is **22.14 m**
  from YOU and 10 m past Navy2, deep toward the end navy attacks; after that move the
  receiver would be behind the carrier. `q7` also keys "Inside toward Navy2" as the open
  option when Navy2 is the receiver the briefing and `q1` establish as covered.
- **After** — the open angle to Navy3 (`q7`); visible facts including the freeze's inability
  to show Gold1 moving (`q8`); a Navy3 receiving-angle placement at `(5, 8)` (`q9`); a
  reflection on what a covered lane tells the carrier (`q10`). No board, contact or
  puck-protection claim survives anywhere in the scene.

### 3.4 `exp26-u9-009-q9` — the +y orientation defect, present here too

- **Before** — "Place YOU **above** the side lane to see Navy2 around Gold1", reference
  `(8, -4)`.
- **Three defects.** (a) `above` is camera-dependent y language on a scored placement, and
  the two renderers disagree, see section 5. (b) Even on the 2D board it points the wrong
  way: the reference is a **9 m decrease** in y from YOU at `(6, 5)`. (c) `(8, -4)` sits 2 m
  from Navy2 at `(10, -4)`, stacking YOU on the teammate the prompt says YOU are trying to
  see around, and the prompt presumes YOU are the passer while gold holds the puck.
- **After** — "Move YOU to a spot between Gold1 and the end navy defends", reference
  `(-1, 2)`. Defined against a named actor and an attack direction; no up/down word anywhere.

### 3.5 `exp26-u9-010-q10` — a calibration-adjudicated grammar defect, recurring

- **Before** — "YOU still **checks** while moving."
- **After** — "YOU still **check** while moving." Nothing else in the question changes.
- **Why it matters** — the calibration adjudication corrected this exact string at
  `U9-006-q7`, and lesson 2 says to validate agreement across the whole scene rather than
  copying a prior pass label. A regex sweep of all 50 packet-07 questions for `YOU` followed
  by a third-person verb returned two hits: this one, and "while YOU **protects** the puck"
  in `exp26-u9-008-q10`, which is replaced outright as part of that scene's block. Both are
  fixed.

### Also repaired (lower impact, same discipline)

- `exp26-u9-008-q5`, `exp26-u9-010-q1`, `exp26-u9-011-q1` — giveaway distractors of the
  class the calibration adjudication struck from `U7-001-q5` and `U9-006-q5`: "Only if Navy2
  changes teams", "Straight up in the air", "The net controls it". Prompts and keyed option
  IDs are preserved in all three; only the implausible options and the explanations move.
- `exp26-u9-011-q9` — the stated condition was already true before the move (YOU at
  `(10, -3)` are already nearer the end navy defends than the loose puck at `(12, -1)`), and
  it was a near-duplicate of `q4`: both moved YOU 1.41 m within the same 2 m neighbourhood on
  the same approach task. Retargeted to Navy2 at `(5, 1)`, which gives the scene a second
  distinct job and a scene reference for `q10`'s pass-back reflection. Note this question
  *does* carry a repair receipt; neither point was addressed by it.

---

## 4. Scene/answer conflicts and rule/system uncertainty

**Scene/answer conflicts** (flagged high-risk, all repaired):

| Question | Conflict |
|---|---|
| `exp26-u9-012-q8` | Keyed answer and explanation name Gold1 as carrier; `puck.owner` is Navy2. |
| `exp26-u9-012-q10` | Explanation inverts possession twice: "Gold2 can become a pass option while Navy2 pressures Gold1." |
| `exp26-u9-012-q7`, `-q9` | Defensive-coverage framing in a scene where navy has the puck; `q9`'s reference `(12, 5)` is not between Gold2 and either net (the segment from Gold2 to the net navy attacks passes y = -0.90 at x = 12). |
| `exp26-u9-009-q7`, `-q8`, `-q10` | Passing/carrying framing while gold owns the puck. |
| `exp26-u9-008-q7`, `-q8`, `-q10` | Board pressure asserted in a centre-ice scene; `q8` keys it on `basis: scene`. |
| `exp26-u9-008-q9` | "Inside" with no referent; reference 22.14 m away, past the receiver. |

**No rule, contact or safety claim was added anywhere.** None of the replacements describes
body contact, checking, stick contact, goalie interference or any officiating rule. Where a
teaching point could have been stated as a rule, it is stated as a condition instead ("if the
lane is clear", "if Navy2 can see YOU", "it does not decide who reaches the puck first"). No
jurisdictional claim is made beyond what the read sources support.

**Rule/system uncertainty carried forward, not resolved:**

1. The bank displays home skaters as `H2`/`H3` and away skaters as `A1`/`A2` on the board,
   while `actorDisplayName()` renders them "Navy 2", "Gold 1" and player-facing text writes
   them "Navy2", "Gold1". The validator's `questionActorWarnings` normalises whitespace, so
   this passes, and it is bank-wide rather than a packet-07 issue. But a U9 player reading
   "Navy2" and looking for a disc labelled `2` on the board is doing a translation step. Not
   changed here; flagged as a product decision for Thomas.
2. `exp26-u9-011-q7` uses "a useful route toward the navy net". Navy attacks +x, so the navy
   net is the one navy defends, and the phrase is consistent with `q9`'s "navy-net side". But
   "the navy net" is inherently ambiguous to a beginner. Retained because it is correct and
   already receipted; worth a naming convention decision across the bank.
3. `exp26-u9-010-q9`'s explanation writes "YOUR path" where the approved style is lower-case
   "your". Not repaired: it is a style deviation, not a grammar error, and repairing it would
   put another hash in front of an independent reviewer for one character. Recorded in the
   coverage row so Codex can decide.

**Visual checks not performed.** I did not open the application, run a browser, or render a
single scene. Every geometric claim in this return is computed from the JSON against
`rinkFrame.js`, `coachRouteSurfaceInput.js` and `experimentalBankCore.js`'s own
`makeScene()` puck formula. Camera framing, legibility, label overlap, stick appearance and
which cues are actually visible at each preset remain **unverified**. Nothing here was
tested in 3D.

---

## 5. The +y orientation defect, independently re-derived, and present in this packet

Re-derived from source rather than inherited from packets 05 and 06, as instructed.

- **2D board.** `src/one-on-one/ExperimentalPractice.jsx` draws every actor with a
  `translate(a.x, -a.y)` transform and the puck at `cy={-scene.puck.y}`, inside an SVG whose
  y grows downward. Negating y means **rink +y renders at the top of the screen**.
- **Canonical frame.** `src/scenario-engine/rinkFrame.js` states the opposite convention in
  its own header: "+y: toward the **bottom** of the canonical top-down view". The 2D board is
  flipped relative to the frame it draws.
- **3D camera.** `readSequenceVisuals.getReadSceneCamera` maps canonical `[x, y]` to world
  `[y, height, -x]`. For the default landscape `broadcast` preset,
  `backward = [1, 1.6, .3]` normalised gives `rightAxis ~ (0.287, 0, -0.958)` and
  `upAxis ~ (-0.802, 0.546, -0.241)`. Canonical +y rides the world-X axis, whose screen-up
  component is **-0.80**, so **+y is at screen-bottom in landscape**. Portrait
  (`[0, 1.6, 1]`) yields `rightAxis = (1, 0, 0)`, so **+y is screen-right**. `behind-net`
  (`[0, 1.45, -1]`) yields `rightAxis = (-1, 0, 0)`, so **+y is screen-left**.

So the same rink +y appears top, bottom, right or left depending on which surface the learner
is looking at. Any "above/below/upper/lower" wording tied to y is unreliable on a scored item.

**Occurrence in packet-07:** a full regex sweep of every prompt, option, explanation,
briefing, cue, objective and limits field across all 50 questions for
`above|below|upper|lower|higher|top|bottom|beneath|underneath` returned **one** hit,
`exp26-u9-009-q9`, "Place YOU **above** the side lane". **1 scene, 1 question.** That is
markedly lighter than packet-06. It is repaired, and the same sweep over the five replacement
scenes returns zero hits.

Remaining directional language in the packet was checked and is **not** camera-dependent:
`behind` and `ahead` are resolved against an actor's drawn facing (`exp26-u9-010`, facing
0 rad), and `ahead`/`back` in `exp26-u9-011-q10` resolves against the stated attack
direction. Gold2 at `(20, -5)` genuinely is ahead of YOU at `(10, -3)` for a team attacking
+x. Those are retained as written. All new wording I introduced is defined against named
actors, named ends, or actor-to-actor relations, never against a screen direction.

**This remains an application defect and is out of scope for this assignment.** No app
source, no scenario engine file and no `bank-snapshot.json` entry was modified. Only content
that relied on the ambiguous language was rewritten.

---

## 6. Proposed curriculum bindings and ranked gaps

`curriculum-coverage.json`'s `domainSignals` are keyword matches on tags, topic, family and
objective text. Its own metadata says they do not replace explicit binding. Below are
proposed **bindings** derived from what each scene actually teaches, against
`curriculum-ledger.json` v3.1.0's U9 nodes. These are proposals for Codex and a coach, not
approved assignments.

| Scenario | Keyword signal (existing) | Proposed primary binding | Proposed secondary | Ledger U9 depth |
|---|---|---|---|---|
| `exp26-u9-008` | puck-skills, offensive-play | `puck-carrier-options` (offensive-play) | `scanning`, `time-and-space` | I / I / I |
| `exp26-u9-009` | puck-skills | `reading-the-play` (hockey-sense, **anchor**) | `scanning`, `defensive-side-positioning` | I / I / I |
| `exp26-u9-010` | skating-movement, hockey-sense | `backward-transitions` (skating-movement) | `scanning` | I / I |
| `exp26-u9-011` | puck-skills, offensive-play | `receiving` (puck-skills) | `reading-the-play`, `battles-and-compete` | D / I / D |
| `exp26-u9-012` | puck-skills, hockey-sense, offensive-play, **defensive-play** | `off-puck-support-offense` (offensive-play) | `time-and-space`, `passing` | I / I / D |

The `defensive-play` signal on `exp26-u9-012` is the one to reject explicitly. It comes from
the tokens `angle` and `pressure` in an objective that reads "Notice concentrated pressure
and offer a different support angle", an entirely offensive brief. That mis-signal is the
best available explanation for the defensive question block that got written into it.

**Ranked gaps evidenced by this packet.** Ranked by evidence strength, each labelled as a
*tactical* gap or a *delivery-format* gap, per the remit's distinction:

1. **Process gap, not content (highest confidence).** Twelve of twelve unreceipted expansion
   questions in this packet needed repair. Across packets 04-07 the pattern holds. The
   evidenced gap is a **provenance-aware review gate**: an expansion question should not be
   able to reach `no-open-ai-finding` without a check that its named situation matches the
   scene's `setup`, `briefing` and `puck.owner`. Three of the five defects in section 3 would
   have been caught by a single mechanical assertion: does the question's implied puck owner
   match `setup.puck.owner`? That is a tooling proposal for Codex, not new content.
2. **Tactical gap: U9 `receiving` under light pressure** (ledger depth D, the highest U9
   depth in puck-skills alongside `passing` and `puck-control`). `exp26-u9-011` is the only
   scene in this packet touching reception, and it does so only to distinguish attempt from
   completion. Nothing in the five scenes asks a player to prepare a reception: where the
   stick is, whether the pass is on the forehand side, what to do with the first touch. A
   D-depth concept carried by a single recognition scene is thin.
3. **Tactical gap: U9 `angling-steering` and `defensive-side-positioning`** (both depth I).
   `exp26-u9-009` is the packet's only turnover scene, and its original six questions stop at
   *recognising* the change of possession. The repaired `q7`/`q9` add a first positional read,
   but there is no scene in this packet where the learner's job is defensive from the outset.
   Any new content here must stay recognition-only and must not introduce contact: the USA
   Hockey 8-and-Under section explicitly says no time should go to team systems at this age.
4. **Delivery-format gap, not tactical.** Every scene in this packet uses the same shape:
   `choice, multi, position, sequence, choice, explain` for q1-q6 and a broadly parallel
   q7-q10. `AUTHORING-CONTRACT.md` asks authors not to force the same question order on every
   scenario. This is a format-variety observation about how the bank was generated, not a
   missing tactical situation, and it should not be "fixed" by adding scenes.
5. **Delivery observation, no action proposed.** `selectPracticeQuestions()` shows every
   question except a second and later `explain`. So in these five scenes q7, q8 and q9 **are**
   delivered in normal practice, and only q10 stays in the authoring bank. The defective
   expansion questions were therefore live-facing, not archived, which raises the priority of
   item 1. All five replacements preserve exactly one delivered reflection (q6) plus one
   retained authoring reflection (q10), so the 200-in-1,500 delivery ratio is unchanged.

**No new content is proposed in this return.** Remit item 3 (five new situations / thirty
questions) stays sequenced after the repair audit, per the project instructions, and would
arrive in the separate `AUTHORING-CONTRACT.md` batch envelope rather than mixed into a
repair.

---

## 7. Source checks actually performed

All five source URLs referenced by these scenes were fetched on 2026-09-05 with an explicit
browser User-Agent and read. None returned `unavailable`; no retry escalation was needed.

| URL | Access | What it actually supports here |
|---|---|---|
| USA Hockey, *Skill Progressions for Youth Hockey* (2019) PDF | read | Read PDF pp. 12-14, which carry printed page numbers 6, 7, 8, so the section citation in every packet-07 scenario is **accurate**. PLAYER KNOWLEDGE gives puck pursuit and puck support ("making themselves available to receive a pass... the beginning of the idea of getting open"); TEAM CONCEPTS gives "near- and far-support concepts, as well as creating and finding passing lanes", and states that no time should be spent teaching team systems at 8-and-Under. Supports the off-puck support teaching and supports keeping these scenes free of system prescriptions. Establishes no Canadian playing rule. |
| Hockey Canada, *7 Principles: Vision & Scanning* (2024) | read | Names the two things a scanning player looks for, teammate location and the direction of opposing pressure, and says looking is not the same as seeing. Supports the locate-teammates-and-pressure teaching in all five scenes. Supports nothing about where a drawn player is looking. |
| Hockey Canada, *7 Principles: Puck Control* (2024) | read | Enhancing Time & Space, Building Skills Through Progression, Incorporating Vision & Scanning. Supports the carry-or-pass framing in `exp26-u9-008`. Supports no specific route or defender response. |
| Hockey Canada, *Skating Skill Development, The Skating Pathway* | read | Lists eight specialized skating skills including backward skating, turning and transition; sets the Introduce stage at Timbits U7 and U9; its teaching keys are all on-ice. Supports `exp26-u9-010`'s topic and its "no technique certified" limit. Supports no gap distance or timing. |
| Hockey Canada, *Fundamental skill development for Timbits U7* | read | U7 Skills matrix lists backward-skating C-cuts and gliding, forward/backward pivots, and stationary and moving passing and receiving; states 85% of practice time should go to skills rather than tactics. Confirms the packet's topics sit at or below the U9 band. A U7 document; establishes no U9 rule or format. |

Every `sourceUrls` entry backing a `sources: pass` in the coverage ledger has a matching
`access: "read"` entry in `sourceChecks`. No paid book pages, no proprietary diagrams and no
Jack Han material were accessed or reconstructed.

---

## 8. Files, validation run, and what to continue

**Files returned**

- `docs/factory/claude-project/claude-output/review-packet-07.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX-packet-07.md` (this file)

**Structural validation actually run**

    $ node validation/validate-return.mjs claude-output/review-packet-07.json
    {
      "errors": [],
      "warnings": [],
      "counts": { "assigned": 50, "reviewed": 50, "remaining": 0, "repairedScenarios": 5 },
      "limits": ["Structure and stale-content checks only. Independent hockey review and
                  rendered-scene verification remain required. No files were imported or
                  changed."]
    }

Zero errors, zero warnings. That covers envelope shape, snapshot match, base-hash freshness
against the live bank, seven explicit checks per row, evidence ledgers, coaching
alternatives, source-read backing for every `sources: pass`, complete coverage,
`affectedQuestionIds` exactness, replacement structure via `validateExperimentalBank`,
position-subject agreement, actor-name warnings, and carried-puck-on-ice. It does **not**
cover hockey truth.

I additionally re-verified, outside the validator, that every `baseScenarioHash` and
`baseContentHash` in `packets/packet-07.json` matches `bank-snapshot.json`, zero mismatches,
so no stale-baseline condition exists for this return.

**Checks not run**

- No independent second review. My `replacementReview.status` is `self-checked`; per the
  project instructions that is explicitly **not** an independent review.
- No rendered-scene verification, no application screenshots, no browser, no camera-preset
  check. Marked unavailable.
- No human coach approval. That remains a separate event.
- I did not re-verify the 195 scenes outside this packet.

**Two things worth checking on integration**

1. `expansion/youth-second.json` records content hashes for `exp26-u9-010-q9`/`-q10` and
   `exp26-u9-011-q7` through `-q10` that do not match the current manifest hashes for those
   questions. The current bank content matches `repairs/youth-repairs.json`'s
   `afterContentHash` values. Worth confirming which receipt is current before treating
   `youth-second`'s `pass` decisions as bound to today's content. I did not rely on them
   either way.
2. The five replacements are independent of each other; if any one is rejected, the other
   four still apply cleanly.

**Next packet:** packet-08. Recommend carrying forward the same provenance split: check which
questions in the assigned scenes came from an expansion batch and whether a real repair
receipt exists for each, before reading anything else.
