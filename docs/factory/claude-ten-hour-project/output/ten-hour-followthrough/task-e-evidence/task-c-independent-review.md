# Independent adversarial review of Task C (draft-revisions.json / source-ledger.json)

Method followed: raw evidence (prior-return/curriculum-drafts.json, draft-revisions.json,
source-ledger.json) was inspected and an independent view formed BEFORE reading
TASK-C-SUMMARY.md. TASK-C-SUMMARY.md was read last, purely for a divergence check.
Nothing was modified; no git commands were run.

## 0. Basic count sanity check (independent, before reading the summary)

`prior-return/curriculum-drafts.json`'s own `totalDraftCount` says `questionDrafts: 12`,
but manually counting the `questionDrafts` array gives exactly **10** entries:
`draft26-u15-skate-001-q1`, `draft26-u18-skate-002-q1`, `draft26-u7-vocab-001-q1`,
`draft26-u7-vocab-002-q1`, `draft26-u9-receive-001-q1`, `draft26-u9-receive-002-q1`,
`draft26-u11-cause-001-q1`, `draft26-u11-cause-001-q2`, `draft26-u11-cause-002-q1`,
`draft26-u11-cause-002-q2`. **Verdict: confirmed.** Task C's `countDefect` block
correctly identifies this as a real discrepancy in the prior file, not something Task C
introduced or mis-stated.

## 1. "Revised all 10, withdrew none" plausibility

**Independent view formed from the raw data:**

Grepped `draft-revisions.json` for `"originalCoordinatesInBounds"` — exactly 3 of the 10
draft entries are `false` (off-rink): `draft26-u15-skate-001-q1`,
`draft26-u11-cause-002-q1`, `draft26-u11-cause-002-q2` (the latter two are the two
questions of the same scenario, so it's 2 scenarios / 3 draft entries — matches Task C's
"3 had coordinates off the rink" claim precisely, no inflation).

I recomputed the geometry independently rather than trusting the claimed numbers:

- **Bounds.** Confirmed directly from source: `src/scenario-engine/rinkFrame.js` ->
  `NHL_200X85_PROFILE.bounds = {minX:-30.48, maxX:30.48, minY:-12.954, maxY:12.954}`
  (ran `node -e "require('./src/scenario-engine/rinkFrame.js')..."` in the worktree and
  printed it — exact match to what draft-revisions.json cites).
- **u15-skate-001-q1**: original y-values were -30, -34, -15, -32, all past the
  -12.954 bound — genuinely off-rink, not a marginal/debatable call.
- **Perpendicular-distance math (draft 1).** Recomputed from the corrected coordinates
  (YOU[-8,-11], F1[-14,-11.5], Gold1[-2,-3], Gold2[4,-10.5]) by hand: the projection of
  F1 onto both the YOU–Gold1 and YOU–Gold2 segments clamps to t<0 (behind YOU) in both
  cases, so distance-to-line reduces to distance-to-YOU = sqrt(6²+0.5²) = 6.0208m for
  both lanes — exactly the "6.021m, identical for both lanes" claim in the file. Not
  fabricated.
- **u11-cause-002 (both questions).** Recomputed the mirrored net landmark
  independently: `node` printed `NHL_200X85_PROFILE.landmarks.goalLineRight = [26.91384, 0]`,
  and mirrored across x=0 gives (-26.91384, 0) — exact match to the "~(-26.91, 0)" cited
  in the file. Recomputed the perpendicular-distance-to-net-line by hand from the
  corrected Gold1[-6,-10.5]/F1[-10,-11.5]: t = 0.1336 (file claims 0.134), perpendicular
  distance = 2.688m (file claims 2.69m). Both check out.
- **wallDistanceMetres** for both drafts recomputed from `12.954 - |y|` and matched the
  file's numbers in every case (1.954, 1.454, 9.954, 2.454, 2.454, 1.454).

So the geometry claims are real, not templated or fabricated — this is a meaningfully
higher bar of rigor than a typical "trust me" revision.

**On the withdraw-vs-revise judgment itself:** I looked specifically for a draft whose
PREMISE (not just its coordinates) was broken, since that's the actual withdrawal
trigger per the assignment. Two candidates surfaced:

- `draft26-u7-vocab-002-q1` (originally `type: "position"`, "tap the faceoff circle").
  Verified directly against `src/one-on-one/experimentalBankCore.js` (lines 48-52):
  a `position` question requires `!!actor` (an existing named actor to move) and forces
  `q.basis !== 'coaching'` to fail — i.e. `position` can NEVER be objectively graded and
  has no landmark-only-tap concept. The original premise ("tap a landmark using the
  app's position interaction") is schema-impossible, confirmed by reading the actual
  code, not just Task C's assertion. Task C's fix (change type to `choice`) is
  defensible, BUT it quietly defeats the *stated purpose of the pairing* — the brief's
  own objective was "two DIFFERENT delivery styles for the same concept" — and Task C's
  fix makes both u7-vocab questions `choice`, so the brief's actual design goal is now
  unmet. Task C does disclose this plainly (`lossOfDeliveryVariety` field, and again in
  the per-draft `rationale`), which is the right transparency move, but I'd call this a
  genuinely arguable case for "withdraw and let a real author decide the delivery
  format" rather than silently keeping it as a second near-duplicate landmark-ID
  question. **This is the strongest candidate for "should this have been withdrawn
  instead," and Task C's own summary undersells it slightly by folding it into the
  general "1 used position for a premise that type can't express... changed to choice"
  line without flagging that this specific fix defeats the brief's stated intent.**
- `draft26-u11-cause-002-q1`'s "Yes, clear lane" answer rests on F1 being 2.69m off the
  direct lane — Task C's own `optionAnalysis.caveat` calls this "a closer margin than
  other 'clear lane' claims in this set (e.g., 6.02m/6.04m elsewhere)... flagged as
  borderline, not a confident wide-open read." I agree this is a real weak point: 2.69m
  in an 85ft-wide rink is not obviously "clear" to a reviewing coach, and the fix
  preserved the ORIGINAL draft's relative geometry (converted via wall-distance) rather
  than re-authoring the scene so the intended answer would be unambiguous. Task C
  disclosed this itself rather than asserting confidence it didn't have — that's the
  right call, but it does mean this draft's correctness is closer to "plausible, needs a
  coach's eye" than "verified."

Neither of these rises to "the premise is invalid, contradicts stated roles, or is
physically impossible" — both are schema/format problems with defensible, disclosed
fixes, not fabricated content. I did not find any draft among the 10 where the
underlying tactical claim was actually wrong or where withdrawal was clearly the
correct call over revision.

**Option-analysis quality:** spot-checked draft 1 (u15-skate-001-q1), both u7-vocab
drafts, and both u11-cause-002 drafts. All of them supply real, non-templated
"whyItWorks"/"whyItFails"/"whenAlternativeWouldWork" reasoning grounded in the actual
computed distances (not boilerplate) — e.g. draft 1's rejected "Neither" option is
revised with an explanation of why equal perpendicular distance isn't equal threat, and
the file explicitly separately notes it changed that distractor's WORDING because the
original asserted future motion a static freeze can't show. This is genuine
option-level reasoning, not superficial filler.

**Verdict on Item 1: mostly confirmed, one point understated.** The "revised all 10,
withdrew none" claim is plausible and well-supported by real defect analysis and real
geometry, but the u7-vocab-002 type-change (position → choice) is a closer call for
"should have been withdrawn or kicked back to the brief author" than Task C's summary
conveys — it's disclosed in the detail file but smoothed over in TASK-C-SUMMARY.md's
one-line treatment.

## 2. Source-ledger receipt spot-check

`source-ledger.json` contains 6 distinct sources (used across all 10 drafts) plus 2
explicitly-excluded URLs. WebFetch on hockeycanada.ca URLs returned HTTP 403 for me too
(confirms the ledger's own claim that the WebFetch tool gets 403'd from this host and a
browser-UA fetch is required). A prior fetch pass in this session's shared scratchpad
directory had already pulled these exact pages via curl with a browser User-Agent
(matching Task C's stated method); I independently grepped the raw extracted text for
the specific claimed quotes rather than trusting summaries.

| # | Source (sourceId) | URL | Verdict | What I found |
|---|---|---|---|---|
| 1 | hc-skating-pathway | .../players/essentials/positions-skills/skating | **Verified** | Raw text line 186-188 and 198 contain the Introduce/Develop/Refine staging and "Tactical play can then be incorporated, such as gap control, angling, reading and reacting" verbatim as quoted. |
| 2 | hc-u9-skills | .../coaching/under-9/coaches/skills | **Verified** | Raw text lines 221-224 contain "Moving Passing and Receiving / Moving forehand pass / Moving backhand pass / Pass and Follow" verbatim. |
| 3 | hc-u11-skills | .../coaching/under-11/coaches/skills | **Verified** | Raw text lines 181-193 contain "Forward Skating & Striding / Linear crossovers / Evasive skating" and "Turning & Crossovers / Glide turns / Tight turns" verbatim. |
| 4 | hc-vision-scanning-2024 | .../news/seven-coaching-principles-vision-scanning-2024-ncw | **Verified** | Raw text lines 48-50 contain the "two main sources of information: where their teammates are and where the opposition's pressure is coming from" quote verbatim. Also confirmed the ledger's own **honest limitation** is true: grepped for "Suppose"/"hypothetical" in the full page text and found zero matches — the source genuinely does not use hypothetical-defender framing, exactly as Task C disclosed rather than overclaiming. |
| 5 | hc-u7-faq | .../coaching/under-7/faq | **Verified** | Raw text lines 163-183 contain the 200x85 / 100x60 dimensions, the "just inside the face-off circle" line, and the "primary focus... skating, puck control, passing, receiving and shooting. Concepts like offside, icing, positional play and face-offs can be introduced at a later age" caution — all quoted correctly, including the tension Task C flags as an honest limitation rather than resolving unilaterally. |
| 6 | hc-u7-cross-ice-rules | .../coaching/under-7/associations/game-play-rules | **Verified** | Raw text lines 163 and 169 contain "played cross-ice for the entire season" and "centre-ice spot should be marked to indicate where the face-off will take place" verbatim. |

Also independently checked both **excluded** sources named in
`sourcesConsideredButExcluded`:

- `hc-u9-half-ice-rules` (.../under-9/associations/game-play-rules) — Task C claims this
  page "contains only game-format, bench-rotation and ice-time-policy content, with zero
  mentions of passing or receiving." Grepped the raw fetched text for "pass"/"receiv" —
  the only hits are unrelated ("receive... ice time", "passion for player development").
  **Confirmed**: no real passing/receiving content, citation-swap justification is real.
- `hc-u15/u18-coaches-skills` pages — Task C calls these a "live 404." My own `curl -w
  "%{http_code}"` against the U15 URL returned HTTP 302 (redirect), not a bare 404
  status. However, reading the actual rendered page content shows the literal text
  "404 | Missing page for Hockey Canada" — i.e. it's a soft-404 (redirects to a 404
  landing page that returns 200/302 rather than a hard 404 status). Task C's substance
  ("this page doesn't exist / has no content") is correct; the word "404" is a slightly
  imprecise description of the HTTP mechanics but not a fabrication.

**Verdict on Item 2: confirmed, no fabricated or mismatched citations found across 6
verified + 2 excluded-source checks (8 total).** Every exact quote checked was present
verbatim on the actual page, and both claimed exclusions held up under independent
re-fetch.

## 3. Schema/geometry/affected-question closure spot check

Independently read the actual schema source rather than trusting draft-revisions.json's
paraphrase of it:

- `src/one-on-one/experimentalBankCore.js` line 4: `QUESTION_TYPES = {choice, multi,
  sequence, position, explain}` — matches the drafts' assumed type list exactly.
- Line 30: every actor requires `Number.isFinite(a.facing)` — a single scalar, no
  two-state support — matches the "facing-is-single-static-angle" finding.
- Lines 33-35: puck is unconditionally required (owned-by-skater or on-ice loose) —
  matches "puck-and-actor-fields-mandatory."
- Lines 48-52: `position`-type questions require an existing actor AND force
  `basis==='coaching'` (never objective) — matches "position-type-cannot-tap-landmarks"
  exactly, and independently confirms u7-vocab-002's original premise really was
  schema-impossible, not just asserted to be.
- Line 36: `s.questions.length<6||length>10` fails validation; line 55: fewer than 4
  distinct question types fails validation — matches "six-to-ten-questions-per-scenario"
  exactly (6-10 questions, ≥4 types).
- Line 91: `explain`-type answers are only checked for `typeof==='string'` with a length
  cap — there is genuinely no correctness/grading logic, confirming TASK-C-SUMMARY.md's
  "explain has no accepted-answer mechanism" claim.

**Affected-question closure**, checked for all 4 geometry-changed drafts:
- `draft26-u15-skate-001-q1` -> lists only itself (correct: its scenario has only 1
  question, nothing else could depend on it).
- `draft26-u11-cause-001-q1` and `-q2` -> BOTH list `["draft26-u11-cause-001-q1",
  "draft26-u11-cause-001-q2"]` as affected. Correct: fixing q1's baseline geometry
  necessarily affects q2, which is defined as sharing that exact setup.
- `draft26-u11-cause-002-q1` and `-q2` -> BOTH list `["draft26-u11-cause-002-q1",
  "draft26-u11-cause-002-q2"]`. Same correct closure.

No dropped or missed affected question found in any of the drafts inspected.

**Verdict on Item 3: confirmed.** Every schema claim I could check against the actual
source code was accurate, and affected-question closure was complete for all
geometry-changed scenarios inspected.

## Comparison against TASK-C-SUMMARY.md (read last, after forming the above independently)

TASK-C-SUMMARY.md's five numbered sections match my independent findings closely: the
10-vs-12 count defect, the "3 off-rink / all 10 missing puck / 2 with no actor / 1
schema-impossible position type / 2 hypothetical-as-rendered-motion" defect tally, the
explicit no-new-drafts decision and its reasoning, the one-setup-per-scenario finding,
and the citation swap are all stated accurately and match the underlying JSON with no
exaggeration I could find.

**One divergence:** the summary's one-line treatment of the `position`->`choice` fix
("1 used the position type for a premise that type can't express... changed to choice")
does not surface that this specific fix quietly defeats the brief's own stated design
goal (two different delivery formats for the same concept) — that nuance exists in
`draft-revisions.json`'s own `lossOfDeliveryVariety` field and per-draft `rationale`,
but a reader of the summary alone would not learn that this was arguably closer to a
withdrawal candidate than a routine type fix.

## Overall verdict

- Count-defect claim: **confirmed**.
- "Revised all 10, withdrew none" plausibility: **mostly confirmed, one point
  (u7-vocab-002's lost delivery-variety) understated in the top-level summary**, though
  fully disclosed in the underlying JSON.
- Geometry/coordinate-fix claims: **confirmed** — independently recomputed and matched
  exactly against real source-code bounds/landmarks, not fabricated.
- Source-ledger citations (6 verified + 2 excluded-source checks): **confirmed**, no
  fabricated, mismatched, or unreachable sources found.
- Schema claims (position type, puck mandatory, facing, 6-10 questions/≥4 types, explain
  grading): **confirmed** against actual source code, not just against Task C's own
  paraphrase of it.
- Affected-question closure: **confirmed**, no dropped questions found.
