# REPORT BACK TO CODEX — packet-01-calibration

**Snapshot:** `rr-20260905-c8403be16748c919`
**Packet:** `packet-01-calibration` — 5 scenarios, 50 questions (matches `expected`)
**Returned by:** Claude Code session, 2026-09-05, working in `C:\Users\mtsli\IceIQ`
**Status of everything below:** `draft-not-reviewed`. Nothing here has been reviewed by a
human coach, tested in the running application, rendered, published, or committed to git.
No file outside `docs/factory/claude-project/claude-output/` was created or modified.

---

## 1. Counts

| | |
|---|---:|
| Assigned | 50 |
| Reviewed (one full independent record each) | 50 |
| Retained | 35 |
| Repair proposed | 14 |
| Blocked | 1 |
| Unreviewed | 0 |
| Scenarios with a proposed replacement | 5 of 5 |

`completion: "complete"` — every assigned question has a coverage row.
**Complete review coverage is not release readiness.** One question is blocked, one
repaired option is flagged high risk pending a rules review, and no scene in this packet
has been visually verified.

Per scenario:

| Scenario | Ver | Retain | Repair | Blocked | Replacement | Affected hashes |
|---|---|---:|---:|---:|---|---:|
| `exp26-u7-001` | 1 -> 2 | 7 | 3 | 0 | question-only | 3 |
| `exp26-u9-006` | 2 -> 3 | 8 | 2 | 0 | question-only | 2 |
| `exp26-u11-002` | 1 -> 2 | 7 | 3 | 0 | **setup change** | 10 |
| `exp26-u13-001` | 2 -> 3 | 7 | 3 | 0 | **briefing + cue change** | 10 |
| `exp26-u13-010` | 2 -> 3 | 6 | 3 | 1 | question-only | 3 |

The two 10-hash rows are correct and expected: `questionContentHash` covers the whole
scene minus `questions` and `version`, so touching `setup` or `briefing` rehashes every
linked question. Both are listed in full in `affectedQuestionIds` and every question in
both scenes was re-checked against the replacement.

---

## 2. Five highest-impact before/after examples

### 2.1 `exp26-u13-010-q9` — reference point sits directly behind the defender

- **Before:** `reference: {x: 24, y: 1}`, prompt "...into a visible net-front lane **outside
  Gold 1**", feedback "makes YOU visible **without standing on Gold 1's body line**".
- **Evidence:** F1 (17, 8) -> Gold 1 (21, 4) has slope -1. Gold 1 + (3, -3) = **(24, 1)**.
  The three points are exactly collinear, so the example point parks YOU screened behind
  the defender in F1's passing lane — the precise opposite of both the prompt and its own
  feedback. "Outside" is also undefined here: (24, 1) is *nearer* the centre line than
  Gold 1, so by the ordinary reading it is inside.
- **After:** `reference: {x: 24, y: 4.5}`; prompt reworded to the checkable claim "Move YOU
  into a strong-side net-front lane that is not directly behind Gold 1." The F1 -> reference
  line now passes through y = 6.0 at x = 21, clear of Gold 1 by 2.0 m. On ice (2.06 m from
  the corner centre, radius 8.5344), 4.92 m off the goalie, 6.58 m from the q4 reference.
- **Why it matters:** two AI review files record this question as reviewed; a coordinate
  contradiction of the feedback survived both.

### 2.2 `exp26-u13-010-q7` — the exact grammar the owner rejected, still present

- **Before:** "**Why is YOU** beside the net rather than already in the slot?"
- **Evidence:** `u13-original-repairs.json` applied "Where is YOU" -> "Where are YOU" to
  **q1 of this same scenario** and did not check q7. Both historical review files then
  logged q7 as `no-open-ai-finding`.
- **After:** "Why **are** YOU beside the net rather than already in the slot?" Options, key,
  basis and feedback unchanged.

### 2.3 `exp26-u11-002` — the scene says "inside" four times; the coordinates say the opposite

- **Before:** D1 (`a1`) at **(-3, 6)**, YOU (`h2`) at (-6, 5). D1 is therefore **1 m further
  from the centre line** than YOU — board-side, not inside. Meanwhile q8 keys option (b)
  "**D1 remains inside** rather than closing the target", q9's prompt says "**leaves D1
  inside**", q10 hypothesises "D1 reaches your **inside** shoulder", and q7 offers "the
  **wider** shoulder" as the reachable one. Because q8 is a keyed answer, this is a
  scene/answer disagreement, not a wording preference.
- **After:** D1 moved to **(-3, 2)** — 3 m inside of YOU, still up-ice, facing unchanged.
  Every "inside" claim becomes true; the briefing ("D1 waits behind your up-ice shoulder")
  and the cue ("D1 is behind YOU relative to that facing") depend only on x and survive
  untouched. The consequential reference updates are q4 (-7, 2) -> (-7, 8.5) and
  q9 (-5.7, 5.5) -> (-4, 8).
- **Independent support:** USA Hockey *Skill Progressions*, 10-and-Under Defensive
  Concepts, lists "protect center of the ice" — I read those pages (PDF pp. 23-25).

### 2.4 `exp26-u11-002-q9` — a 0.58 m "move"

- **Before:** `reference: {x: -5.7, y: 5.5}`. hypot(-6 - -5.7, 5 - 5.5) = **0.583 m**,
  barely over `validateExperimentalBank`'s 0.1 m floor. A 58 cm example cannot demonstrate
  "a shoulder that opens F1's lane."
- **Evidence trail:** `u11-actor-repairs.json` corrected this question's `actorId`
  (`h1` -> `h2`) and never re-checked the reference that actorId was now bound to. The fix
  was right; the thing it pointed at was never looked at.
- **After:** (-4, 8) — 3.61 m of travel, up-ice and wide of the corrected inside defender,
  3.04 m clear of the q4 reference.

### 2.5 `exp26-u7-001-q5` — the forbidden distractor, named verbatim in the instructions

- **Before:** option (c) "**Close your eyes**".
- **Evidence:** RINKREADS-CLAUDE-PROJECT.md, Writing parameters: *"Avoid giveaway
  distractors such as 'Close your eyes', absurd actions or repeated absolute words."* Both
  `catalog-review.json` and `combined-review.json` record this question as
  `no-open-ai-finding`.
- **After:** "Shoot the puck away without looking for Navy2" — a real U7 panic clear — with
  the feedback extended to say what it costs. Same class fixed in `exp26-u9-006-q5`, where
  option (b) was "Only the puck colour" (a puck has no colour choice) and option (c) was
  the bare absolute "Nothing".

**The other nine repairs**, in brief: `exp26-u7-001-q9` (reference 0.40 m off the original
passing line, so "a different passing angle" changed nothing — stale reference left behind
when the prompt was rewritten); `exp26-u7-001-q10` (asserted "when Gold1 got closer" as a
past event the still frame cannot show — now an explicit hypothetical, matching siblings q7
and q8); `exp26-u9-006-q7` ("YOU still **checks** the play"); `exp26-u13-001-q2` (option
"Which player last scored" — unrelated trivia, same class as recorded finding
`u13-p2-dummy-distractors`); `exp26-u13-001-q7` (**`basis: "scene"` on a hypothetical
changed condition**, plus "if YOU **arrives** first"); `exp26-u13-001-q9` (duplicate of q4,
references 1.04 m apart); `exp26-u13-010-q8` (duplicates q6 exactly, in a different format);
plus the consequential reference update in `exp26-u11-002` (q4) and the briefing correction
in `exp26-u13-001` (q2/q7/q8).

---

## 3. Scene/answer conflicts, uncertainty, and checks not performed

### 3.1 Historical findings I re-adjudicated

| Finding | My verdict |
|---|---|
| `u13-001-puck-outside-rink` (superseded) | **Refuted again, independently.** The puck at (-23, 12.2) is **7.851 m** from the rounded-corner centre (-21.9456, 4.4196) against a radius of **8.5344 m** — on the ice, and **0.68 m off the curved boards**, closer to the boards than any actor. `isCoachRoutePoint` returns `true`. The owner-reported rim/open-ice mismatch **is resolved in this snapshot**. Preserved as history; not reopened. |
| `u13-001-reference-placements` (superseded) | **Half right, and the right half was lost.** Its out-of-bounds claim is false — q4 (-21, 10.5) and q9 (-20, 10.2) are both on ice, 2.45 m and 2.75 m off the boards. But its other claim, that they are "only about 1.04 m apart", is **exactly true** (1.044 m) and, with two near-identical prompts moving the same actor, is a real duplication defect. When the false half was rejected, the true half went with it. Re-raised as a duplication finding, not a geometry one. |
| `u13-010-q1-ambiguous-reference` (superseded) | **Agree with the adjudication; not reopened.** Option (c) carries its own qualifier and the two distractors are false by tens of metres, so the question is answerable as written. |
| `youth-u9-006-missing-navy3` and `youth-u9-006-state` (P1) | **Applied and holding.** The current q7 contains no Navy3, and q7-q10 now match the loose-puck freeze rather than a planned pass. |
| `teaching-exp26-u13-010-q3` (P3, open) | **Left open — blocked, not closed.** See 3.3. |
| Possession / impossible-positioning repairs on `exp26-u7-001` q7/q8/q9 | **Applied and holding for possession** — but q9's *reference* was never updated with its prompt. New finding. |

### 3.2 Scene/answer conflicts found (all high risk, all flagged)

1. `exp26-u11-002-q8` — keyed option asserts a defender position the coordinates contradict.
2. `exp26-u13-010-q9` — reference point contradicts its own prompt and feedback (collinear).
3. `exp26-u13-001` briefing/cue — "D2 waits **behind the puck**" while D2 at x = -22 is **1 m
   up-ice** of the puck at x = -23 relative to Navy's +x attack, and 16.2 m across the ice.
   I corrected the **words**, not the coordinates: the drawn position is defensible low
   far-side support (Hockey Canada, *Developing Skilled Defencemen*, PDF p.13: "Good
   decision from net front to creating an open passing lane"), and moving a reviewed actor
   is the larger, riskier change. New wording: "D2 waits low on the far side as a possible
   outlet."
4. `exp26-u7-001-q10` — asserted a movement the freeze does not show.
5. `exp26-u13-001-q7` — `basis: "scene"` on a hypothetical. This one has a runtime
   consequence, not just a contract one: `reviewResponse()` in `experimentalBankCore.js`
   grades objectively when `basis === "scene"` and the type is choice/multi/sequence, so as
   written the app marks a tactical inference right or wrong. Changed to `coaching`. It is
   the **only** basis mismatch in the packet — `exp26-u13-010-q7` keys on an explicitly
   stated briefing fact and correctly stays on scene basis.

### 3.3 Blocked — one question, and why I did not resolve it

`exp26-u13-010-q3` (`feedback: blocked`, verdict `blocked`). The three ordered steps
overlap in real play, and unlike the equivalent sequence questions in the other four
scenes, this explanation never tells the learner the order can overlap. I agree with
`catalog-review.json` that this is an editorial opportunity rather than an established
tactical error — which is exactly why I did not rewrite it. Whether the ordering teaches
here is a coaching call, not a computable one. **Held for the owner or a coach.**

### 3.4 High-risk item I introduced and am flagging against myself

`exp26-u13-010-q8` replacement option (a) — "Enough separation to stay off the goalie" — is
a **contact/safety-adjacent claim**. Its `replacementReview` row carries `sources: blocked`
because **I read no goaltender-interference rule text in any jurisdiction.** The claim is
consistent with the scene's own stated limit ("No contested net battles, screening-contact
rules or tip execution are certified") and with the ledger's own open nit for
`net-front-play` ("keep U11/U13 items recognition-only"), but it must not ship without an
independent rules review. Everything else in that replacement self-checks clean.

### 3.5 Rule and system uncertainty

- **No rule text was read.** No Hockey Canada or USA Hockey playing rule (offside, icing,
  goaltender interference, U7/U9 cross-ice or half-ice format) was verified in this run.
  Nothing in the packet keys on a rule, so nothing failed on this basis, but no rule claim
  in this return is sourced either.
- **No system is prescribed anywhere in this packet** and none should be inferred. Every
  tactical suggestion carries a `coaching` basis and a stated alternative in the coverage
  rows.
- **Jurisdiction/age mismatch, recorded honestly:** the only Canadian U7-specific source
  either U7-adjacent scene declares (`hc-u7-skills`) returned HTTP 403 to an automated
  fetch, so **the U7 age judgement in this return is my own coaching judgement, not a
  sourced one.** The USA Hockey material I substituted is 8-and-Under, roughly ages 7-8,
  which is nearer Hockey Canada U9 than U7.

### 3.6 Visual checks NOT performed

**No rendered scene was inspected. I have no access to the running application.** Not one
of these five scenes was opened, screenshotted, or viewed in 3D or 2D. Specifically not
established by anything in this return:

- camera framing, zoom, or whether the corner puck in `exp26-u13-001` reads as
  board-adjacent on screen at its 0.68 m clearance;
- jersey colour contrast and label legibility — in particular whether `H2`/`A1` render on
  the jersey as the bare digits `2`/`1` (which `compactActorLabel` produces) while the
  question prose says "Navy2"/"Gold1"; the prose does resolve to the correct actors via
  `actorDisplayName`, but the on-screen spelling drops the space, and I could not see it;
- whether the new net-front reference in `exp26-u13-010-q9` reads as a distinct pocket from
  the q4 back-door reference at the delivered zoom;
- stick appearance, marker overlap, and which cues are actually visible.

Everything I state as geometry was computed against the repo's own
`isCoachRoutePoint` / `makeScene` / `questionContentHash`, not eyeballed. Everything about
the picture is unverified.

### 3.7 Source checks

Seven URLs checked, all dated 2026-09-05, all recorded in `sourceChecks`.

| URL | Access |
|---|---|
| `cdn.hockeycanada.ca/.../developing-defence-overview-e.pdf` | **read** (PDF pp. 12-13, "BREAKOUTS") |
| `cdn.hockeycanada.ca/.../u13-core-skills-e.pdf` | **read** (single-page U13 skills matrix) |
| `cdn1.sportngin.com/.../Skill_Progression_Manual_19_FINAL.pdf` | **read** (8U pp. 12-14; 10U pp. 23-25) |
| `hockeycanada.ca/.../vision-scanning-2024-ncw` | **unavailable** — HTTP 403 |
| `hockeycanada.ca/.../puck-control-2024-ncw` | **unavailable** — HTTP 403 |
| `hockeycanada.ca/.../under-7/coaches/skills` | **unavailable** — HTTP 403 |
| `usahockey.com/news_article/show/1093178` | **unavailable** — HTTP 403 |

`hockeycanada.ca` and `usahockey.com` HTML pages refuse automated fetch; the
`cdn.hockeycanada.ca` PDFs do not. Those pages may be perfectly readable in a browser —
I simply could not read them, so **nothing in this return relies on what they say.** Where
the scanning principle needed backing, I substituted the Hockey Canada defencemen PDF I did
read, which states "Retrievals: Picking up the puck: **shoulder check**, angle, and
deception" and "Support: **Look for both support and pressure and make a decision**".
The catalog's page references for the USA Hockey manual are accurate — I verified both
ranges land where `sources.json` says they do.

**No claim about Jack Han's *Hockey Tactics 2026* is made anywhere in this return.** The
gumroad link was not fetched, no preview was relied on, and no content was derived from it.

---

## 4. Proposed curriculum bindings and ranked gaps

The keyword `domainSignals` in `curriculum-coverage.json` are planning signals only. These
are proposed bindings against `curriculum-ledger.json` v3.1.0, with the ledger's own depth
for that age.

| Scenario | Age | Primary binding | Secondary | Ledger depth check |
|---|---|---|---|---|
| `exp26-u7-001` | U7 | `passing` (U7 : I) | `reading-the-play` (U7 : I), `time-and-space` (U7 : I) | Correctly avoids `off-puck-support-offense` and `puck-protection`, neither of which is introduced before U9. |
| `exp26-u9-006` | U9 | `scanning` (U9 : I) | `battles-and-compete` (U9 : D), `off-puck-support-offense` (U9 : I) | Correctly **not** `breakout-and-regroup` or `forecheck-pressure` — neither exists before U11 — and the scene's own limits already say "no full breakout-system claim". |
| `exp26-u11-002` | U11 | `receiving` (U11 : **M**) | `scanning` (U11 : D), `puck-protection` (U11 : D) | Receiving is at mastery emphasis at U11 and this is a mastery-emphasis read, not an introduction. Good fit. |
| `exp26-u13-001` | U13 | `breakout-and-regroup` (U13 : D) | `scanning` (U13 : M), `forecheck-pressure` (U13 : D), `puck-protection` (U13 : M) | Source-anchored: the U13 matrix I read lists "Puck retrievals" (Individual Defensive Tactics) and "Basic Breakouts" (Team Play). |
| `exp26-u13-010` | U13 | `net-front-play` (U13 : D) | `off-puck-support-offense` (U13 : M) | The scene's objective is literally "Recognize a receiving or deflection area **without prescribing a net battle**", which satisfies the ledger's own recorded openNit for this concept. Source-anchored: "Net Drives" and "Tips / Deflections" are U13 items in the matrix I read. |

Binding gap noticed in passing: `exp26-u7-001`'s only keyword signal is `hockey-sense` (via
the word "awareness" in the topic "Rink awareness"). Its actual teaching — identify a
teammate, then find a lane to them — never touches `passing` in the generated map at all.

### Ranked gaps

Separated deliberately, because these are three different kinds of problem.

**Rank 1 — DELIVERY FORMAT, not a tactical gap. Format templating is the mechanism behind
most of this packet's defects.** Four of the five calibration scenes have byte-identical
`typeCounts` — `{choice: 3, explain: 2, multi: 2, position: 2, sequence: 1}` — and
identical `basisCounts` `{coaching: 8, scene: 2}`; the fifth swaps its sequence for a
fourth choice. Bank-wide the same shape holds: 507 choice / 300 explain / 300 multi /
296 position / 197 sequence across 200 scenes. The consequence is not aesthetic. Filling a
fixed slot is what forced q7-q10 to re-tread q1-q6, and it produced **four of my fourteen
repairs**: `u13-010-q6`/`q8` (same question, two formats), `u13-001-q4`/`q9` (1.04 m
apart), `u11-002-q4`/`q9`, `u13-010-q4`/`q9`. Recommend varying the format mix per scene
rather than per bank.

**Rank 2 — DELIVERY FORMAT. The second `position` question has no distinct job.** All four
10-question scenes carry two position questions moving the same actor toward the same idea,
and three of those four had a reference that was duplicative, collinear, or sub-metre. Two
patterns in the bank already solve this and should be generalised: give the second one a
**different subject** (`exp26-u9-006-q9` correctly moves Navy2, not YOU) or a **different
branch** (my `exp26-u13-001-q9` repair places the contain case rather than the pickup case).

**Rank 3 — TEACHING CONCEPT. The ledger has no `communication` concept.**
`curriculum-ledger.json` emits zero nodes for communication, yet `exp26-u13-001-q8` and
`exp26-u9-006-q7` both teach a call, and the Hockey Canada defencemen PDF I read explicitly
names a breakout communication vocabulary ("quick up, wheel, overs, reverse, rim, set, move
it, flip, glass"). Those questions currently have nowhere honest to bind. **Owner decision,
not a content fix** — surfacing rather than resolving, per the framework-conflict rule.

**Rank 4 — TACTICAL SITUATION. The opponent's side of the same freeze is missing.** Every
scene in this packet is authored from the puck-side player's view. `forecheck-pressure`
reaches I at U11 and D at U13, but no scene here puts YOU as the forechecker or the
defender. `exp26-u13-001` has a ready-made mirror sitting in it — be Gold 1 closing on the
rim — so this is cheap to fill because the geometry already exists. Genuine tactical gap.

**Rank 5 — TACTICAL SITUATION, provisional on one packet.** The introduce bands are the
thinnest in the bank: 20 U7 and 30 U9 scenes against 50 U11 and 50 U13, while `scanning`,
`receiving`, `passing`, `reading-the-play`, `decision-making` and `time-and-space` all
begin at U7 : I or U9 : I. Flagged for the gap plan; **not acted on**, because the remit
puts the full repair audit before new content and one packet is not enough evidence to
rank age bands.

**Explicitly not proposed in this run:** the five new situations / thirty questions of
remit item 3. The remit puts them after the repair audit, and 39 packets remain.

---

## 5. Files, validation run, checks not run, next packet

### Files returned

- `docs/factory/claude-project/claude-output/review-packet-01-calibration.json`
- `docs/factory/claude-project/claude-output/REPORT-BACK-TO-CODEX.md` (this file)

Nothing else was written. `bank-snapshot.json`, the packets, the app source and the
scenario engine are untouched — verified with `git status`, which shows only the new
`claude-output/` directory as untracked. **No git command that writes was run:** no `add`,
no `commit`, no `push`, no branch operation.

### Structural validation actually run

    $ cd docs/factory/claude-project/validation
    $ node validate-return.mjs ../claude-output/review-packet-01-calibration.json
    {
      "errors": [],
      "warnings": [],
      "counts": {
        "assigned": 50,
        "reviewed": 50,
        "remaining": 0,
        "repairedScenarios": 5
      },
      "limits": [
        "Structure and stale-content checks only. Independent hockey review and rendered-scene verification remain required. No files were imported or changed."
      ]
    }

Clean: zero errors, zero warnings, including zero `questionActorWarnings` on any of the
five replacements. Taking the validator at its own word: this confirms structure, base
hashes, version increments, question-ID preservation, `affectedQuestionIds` exactness, the
`positionSubjectIssue` binding, carried-puck placement, and that no source `pass` lacks a
recorded read. **It confirms no hockey.**

Beyond the bundled validator I also ran, against the repo's own modules rather than by eye:
`isCoachRoutePoint` on every actor, every loose puck, every position reference and every
post-move carried-puck position; `makeScene` for the carried-puck formula; and
`questionContentHash` for all 50 base hashes (all 50 matched the packet manifest) and for
all 50 replacement hashes recorded in `replacementReview`.

### Checks NOT run

- **No rendered-scene or application verification of any kind** (section 3.6).
- **No independent second review.** Every `replacementReview` is `self-checked`, which the
  contract is explicit is not an independent review. Luna coordination is yours.
- **No human coach approval.** Nothing here earns mastery or enters the approved bank.
- **No rule-text verification** in any jurisdiction (section 3.5), which is why
  `exp26-u13-010-q8` carries `sources: blocked` in its self-check.
- **Three Hockey Canada pages and one USA Hockey page could not be read** (section 3.7).
- **No cross-packet duplicate check.** I compared prompts within each scene and across the
  five scenes in this packet only. Whether these scenes duplicate any of the other 195 is
  not established — I read `bank-snapshot.json` for structure and counts, not scene by
  scene.

### Next packet

**`packet-02`** — 5 scenarios, 50 questions, all U7. Then `packet-03` through `packet-40`
in order per `PACKET-INDEX.md`. **39 packets / 195 scenarios / 1,550 questions remain
unreviewed.** No question outside this packet has been looked at, and no verdict in this
return should be generalised to a similar ID elsewhere.

Two things worth carrying into packet-02 specifically, since it is entirely U7: the
`hc-u7-skills` source is unreadable to an automated fetch, so U7 age judgements will keep
being unsourced unless you can supply that page's text; and the giveaway-distractor class
("Close your eyes", "Only the puck colour") turned up in both youth scenes here, so it is
worth a targeted sweep rather than a per-question discovery.
