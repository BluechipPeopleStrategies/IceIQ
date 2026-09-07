# Task B independent adversarial review

Reviewer: separate agent, read-only. Method: formed independent conclusions from raw
evidence (grep, git log, `curriculum-matrix.json`, source data files, code) first, then
read `TASK-B-SUMMARY.md` and compared. All commands run from
`C:/Users/mtsli/IceIQ/.worktrees/claude-ten-hour-followthrough`.

---

## 1. "pov-questions is dead code" claim

### Independent finding

Ran `grep -rniI "povQuestions" .` across the entire repo (not just `src/`), excluding
`.git`/`node_modules`. Every hit resolves to one of:

- Live code that **defines** the path but does not consume it:
  `tools/build-full-curriculum-matrix.mjs:289` (`resolve(ROOT, 'src/data/povQuestions.json')`),
  which is Task B's own new tool, not a pre-existing consumer.
- Historical/archived tooling, explicitly retired: `scripts/archive/notion-sync/*.mjs`
  (four files, all under `scripts/archive/`), `package.json` scripts prefixed
  `_retired_*` (`_retired_sync:pov`, `_retired_seed:pov`, `_retired_pov:upload-images`,
  `_retired_admin:migrate-pov`, `_retired_sync:questions` — all annotated "moved to
  scripts/archive/notion-sync/ ... Notion parked").
- Docs/specs that **note the same dead-code fact themselves**, independently, on
  earlier dates: `docs/manual-playtest/audits/2026-08-03-language-standards.md:27`
  ("Not scanned as live: `src/data/povQuestions.json`... nothing in [src] imports it"),
  `docs/superpowers/specs/2026-06-11-rinkreads-coach-agents-design.md:148`
  ("The 148-question `bank.json` and `povQuestions.json` (the old content) — explicitly
  not [used]"), `archive/notion-2026-05-02/README.md:87` ("delete from `src/data/` only
  after confirming nothing reads it; `qbLoader.js` does NOT").
- `.gitignore` entries for `.bak` sync artifacts, and reference docs describing the
  file's size/shape (`PROJECT-MAP.md`, `rink-area-vocabulary.md`, capability inventory).

Checked every load mechanism the app actually uses for its four data-loading patterns
(`import.meta.glob`, `readdirSync` scans, explicit `import`/`require`, `fetch`):

```
src/one-on-one/experimentalBank.js:3   import.meta.glob('./experimental-bank/u*.json', ...)
src/one-on-one/experimentalBank.js:6-7 import.meta.glob('./experimental-expansion/u*-*.json', ...)
src/qbLoader.js:9                      import.meta.glob("./scenario/seeds/*.json", ...)
src/scenario/ScenarioPlayground.jsx:14 import.meta.glob("./seeds/*.json", ...)
src/one-on-one/PracticeLibrary.jsx:17  import.meta.glob('../../docs/library/*.md', ...)
```

None of these glob patterns match `src/data/povQuestions.json` or any `data/*` path.
Confirmed no `.ts`/`.tsx` files exist anywhere in the repo (`find src -name "*.ts" -o
-name "*.tsx"` → empty), so the "exhaustive grep of `src/**/*.{js,jsx}`" scoping Task B
describes is not actually narrower than the real file universe — there's nothing else to
miss on that extension front. `tools/lib/deadcode-scan.mjs` (a pre-existing dead-code
scanner used by `rinkreads-doctor.mjs`) parses exactly these `import.meta.glob` patterns
and would not surface `povQuestions.json` either, consistent with the conclusion.

`git log --all --oneline -- src/data/povQuestions.json` shows the file was created in
`30c9d85` ("admin: POV migration — 4 images + 145 questions from Notion to Supabase")
and has 11 subsequent commits, all content syncs/fixes/copy edits, never a commit that
wires it into a runtime import path.

**Verdict: TRUE.** "Completely unused/unreachable dead code" holds up under an
independent, full-repo, non-extension-scoped grep. This is also not a novel discovery —
at least two earlier docs (2026-06-11, 2026-08-03) already recorded the same fact; Task B
re-verified it rather than being first to find it, which the write-up doesn't claim
either way but is worth naming for full-repo history context.

### TASK-B-SUMMARY.md comparison

`TASK-B-SUMMARY.md` §"Catalogs found", item 4, states the same conclusion with the same
scope caveat ("exhaustive grep of `src/**/*.{js,jsx}`"). Matches independent finding.

**Verdict: CONFIRMED.**

---

## 2. U11 changed-cue reclassification claim

### The rule, in my own words

From `tools/lib/curriculum-changed-cue.mjs`: a question is "genuine changed-cue" only if
its prompt (a) narrates or hypothesizes a concrete change to an actor/puck relative to
the base freeze (via "Imagine"/"Suppose", an "If <actor>..." conditional, or a
declarative narration like "D1 turns...") **and** (b) asks the learner to update,
reconsider, or re-derive a tactical read because of that change (not a plain fact about
the frozen picture). Four explicit exclusions override any keyword match: `position`-type
"Move YOU..." placement instructions, `sequence`-type "Arrange/Order..." prompts,
`basis:'scene'` "What has changed..." fact questions, and "value of your movement even if
X never happens" prompts (a different, adjacent skill).

Critically, the U11 age band is **not classified by the regex alone** — a hand-curated
override table (`U11_MANUAL_VERIFICATION`, 64 entries) takes precedence over the
automated `classifyChangedCue()` result for any question ID it lists.

### Independent reproduction of the headline numbers

Loaded the real U11 experimental-bank data (`src/one-on-one/experimental-bank/u11.json`
+ `experimental-expansion/u11-*.json`, composed via `readBankFiles()`) and ran the
shipped classifier directly:

```
scenario count 50, total questions 400
autoGenuineCount (regex only, no override): 38
overrideTrue: 53   overrideFalse: 11   (64 total override entries)
finalGenuine (override-applied, matches curriculum-matrix.json): 53
```

`curriculum-matrix.json`'s `u11ChangedCue` block: `totalU11Questions: 400,
genuineChangedCueQuestions: 53, manuallyVerifiedCount: 64, manuallyVerifiedGenuineCount:
53, naiveImagineSupposeKeywordCount: 14`. **53/400 reproduces exactly.**

Naive-count check: the actual code
(`naiveImagineSupposeKeywordCount: u11Prompts.filter(prompt => /^\s*(imagine|suppose)/i
.test(prompt)).length`) only counts prompts that **open** with Imagine/Suppose. A
whole-word (not anchored-to-start) count of "imagine"/"suppose" anywhere in the 400
prompts gives **15**, not 14 — the one extra is `exp26-u11-019-q10`, "After D1 regains
possession, **suppose** gold F1 wins it back...", where "suppose" appears mid-sentence.
The 14 figure is correct **for the specific, narrower definition actually coded**
(sentence-opening hypothetical), but neither `TASK-B-SUMMARY.md` nor the in-tool
disclosure states that narrower definition explicitly — a reader would reasonably assume
"14 occurrences of the words Imagine/Suppose" (whole-repo-style match), which is actually
15. Minor, but a real precision gap in how the baseline is described.

### Manual read of 8 "true" and 8 "false" examples

**Marked genuine (TRUE), representative sample:**
- `exp26-u11-001-q8`: "Suppose YOU recover the puck and plan to pass toward F2 in the
  middle. Which two changes would make that outlet less useful?" — narrates a
  hypothetical state (recovering the puck) + asks for a re-derived read. Correct.
- `exp26-u11-002-q10`: "D1 reaches your inside shoulder as the puck arrives. Explain the
  changed reception and next scan." — declarative narrated change + explicit "changed...
  next scan" ask. Correct.
- `exp26-u11-004-q10`: "F2 carries toward the middle and D1 turns with F2. What do you do
  next?" — narrated actor change + forward-looking read-update. Correct.
- `exp26-u11-005-q5`: "Suppose D2 now moves into your reset lane. What would you
  reconsider?" — textbook match to both rule halves. Correct.

I agree with all 8 sampled TRUE calls; no false positives found in this sample.

**Marked excluded (FALSE), representative sample:**
- `exp26-u11-002-q7`: "What should YOU learn before F1 releases the pass?" — asks about
  *before* a change, no narrated change occurs. Correctly excluded (no state-change).
- `exp26-u11-003-q10`: "F1 carries while D1 follows you. Explain the value of your
  movement." — matches `EXCLUDE_VALUE_REGARDLESS` exactly as documented (adjacent skill,
  not a changed-cue update ask). Correctly excluded.
- `exp26-u11-008-q9`: "Move YOU farther into the forward lane before D1 closes." —
  `position`-type placement instruction, matches `EXCLUDE_PLACEMENT`. Correctly excluded.
- `exp26-u11-014-q8`: "Which two changes should make YOU reassess your support spot?" —
  no *narrated* change actually occurs in the prompt (it's asking the learner to name
  hypothetical changes in the abstract, not reacting to a stated one) — defensible
  exclusion, consistent with the rule's letter, though this is the single closest call in
  my sample to a legitimate borderline case.

I agree with all 8 sampled FALSE calls; the rule is applied consistently in every example
I read, including the borderline one.

### The one concrete problem: the "171 candidates" figure does not reproduce

Both `TASK-B-SUMMARY.md` ("a two-pass regex swept all 400 U11 prompts for candidate
markers (171 found)") and the matrix's own embedded `disclosure` string repeat this
number, presented as the size of the hand-read pool. I attempted to reproduce it using
the two exported detector functions the classifier actually ships
(`hasNarratedStateChange`, `hasReadUpdateAsk`) against the real 400 U11 prompts:

```
change-only matches:  60
update-only matches:  51
union (either):       73
intersection (both, i.e. automated "genuine"): 38   -- matches autoGenuineCount above
```

Union with the 64-entry manual override list: **74** distinct question IDs total (63 of
the 64 override IDs already fall inside the 73-prompt "union" set; one,
`exp26-u11-023-q2`, is override-only and matches neither detector). There is no
combination of the shipped regex logic that produces anything close to 171. The
manually-reviewed, auditable trail (`U11_MANUAL_VERIFICATION`) has exactly 64 entries —
if 171 prompts were genuinely "read by hand," the other 107 leave **zero trace** anywhere
in the shipped code, data, or docs: no ID list, no count breakdown, nothing. The only
numbers that are independently reproducible from what's in the repo are 400 (total), 73
or 74 (candidates under the shipped detectors), 38 (automated-only genuine), 64
(hand-reviewed/overridden), and 53 (final genuine after override) — all of which check
out. "171" does not check out against anything currently in the repository.

This doesn't undermine the final 53/400 number, which is fully reproducible and whose
individual calls I spot-checked and agree with. But the specific "171 candidates, every
one hand-read" methodology claim is **not verifiable from the artifacts actually
delivered** — either an intermediate/looser regex pass that never made it into the
shipped `curriculum-changed-cue.mjs` was used and then discarded (plausible, but then say
so and don't state it as if the code still demonstrates it), or the number is simply
wrong. Either way, a skeptical reader cannot confirm it, which matters given the
disclosure explicitly markets this as "EXHAUSTIVE, not sampled."

### TASK-B-SUMMARY.md comparison

`TASK-B-SUMMARY.md` states the rule correctly (matches my independent read) and repeats
53/400, 14/400, and 171 exactly as coded/disclosed.

**Verdict: CONFIRMED** on the 53/400 vs. 14/400 headline claim and on rule-consistency
(agreed with all 16 sampled classifications). **OVERSTATED / minor-ERROR-FOUND** on the
"171 candidates, all hand-read" audit-trail claim, which is not reproducible from the
shipped detector code or data (max reproducible candidate pool: 73–74, not 171), and on
the unstated "sentence-opening only" scope of the naive-count baseline (whole-word count
is 15, not 14).

---

## 3. U15/U18 "Skating & Movement" absence recheck

### Independent finding

Checked all four "live" catalogs (per claim 1's finding, pov-questions has no U15/U18
rows at all, so only three catalogs are relevant) for skating/movement content at
U15/U18, going well beyond a literal "Skating & Movement" tag search:

- **`src/one-on-one/experimental-bank/u15.json` + `u18.json`** (15 + 10 scenarios, ~400
  questions): extracted every string field recursively and searched for `skat*`
  (excluding the `home-skater-N`/`skater` actor-id false positive), `edge*` (excluding
  the "ackn**owledge**" substring false positive), `pivot`, `footwork`, `agility`,
  `crossover`, `stride`, `c-cut`, `mohawk`, `backward`, "quick feet", "first step",
  `transition` (only hits: `usa-transition-drill-2016` source-attribution IDs and
  "Transition support" — both puck-transition/tactical terms, not skating-technique
  content). **Zero genuine skating-mechanics hits.**
- **`src/data/bank.json`** (`U15 / Bantam`: 10 rows, `U18 / Midget`: 1 row — confirmed
  the U18 legacy bank is genuinely this small, not a parsing artifact; read the single
  U18 row in full, it's a hockey-sense defensive-read question). Same term sweep with
  word-boundary regex: **zero hits** on any skating term.
- **`src/scenario/seeds/`** top-level (28 files) plus `_pending/` (2 files) and
  `_retired/` (4 files, all U13): exactly one U15 seed exists
  (`u15_scanning_weakside_v1.json`, a scanning/hockey-sense scenario, not skating), zero
  U18 seeds anywhere including retired/pending. The four retired seeds are U13
  (`u13_gap_pivot_match_mc_v1.json` uses "pivot" but is U13, not U15/U18, and retired).
- **Ledger cross-check**: `src/data/curriculum-ledger.json` domain `skating-movement`
  has 4 concepts (`edges-balance`, `agility-mobility`, `backward-transitions`,
  `deception-with-feet`), and the ledger's own depth targets
  (`skatingMovementLedgerDepth` in the matrix output) show all four concepts targeted at
  depth **R** ("refinement... at speed under random/opposed conditions") for **both** U15
  and U18 — i.e., the curriculum design explicitly expects this content to exist at
  these ages, making the absence a real gap against the ledger's own stated intent, not
  just an observation that nothing happened to get tagged that way.

**Verdict: TRUE, absence confirmed.** I could not find genuine skating/movement content
at U15/U18 under any framing (literal tag, domain keyword, or a manual read of every
scenario/question string at those two age bands across all three reachable catalogs).

### TASK-B-SUMMARY.md comparison

Matches exactly: "Zero skating-movement matches at U15/U18 in every catalog above, using
both explicit bindings... and the loosest keyword signal... Verdict: genuine content
gap." The domain-keyword token list used (`skating, skate, backward, pivot, agility,
edge, footwork` — from `DOMAIN_RULES` in `tools/build-curriculum-coverage.mjs`) is
narrower than my manual sweep (missing `crossover`, `stride`, `c-cut`, `mohawk`, "quick
feet"), but since my broader manual sweep of the raw text also found zero genuine hits, a
richer keyword list would not have changed the verdict here.

**Verdict: CONFIRMED.**

---

## 4. Remaining `unknown`/`unmapped` entries

### Independent finding: scale is much larger than "dozens"

Queried every field in all 2170 `curriculum-matrix.json` rows for literal `"unknown"` or
`"unmapped"` values:

| Field | unknown | unmapped | Which catalog(s) |
|---|---|---|---|
| `conceptId`/`conceptName` | 0 | 192 | experimental-bank 52, scenario-engine-seed 6, pov-questions 134 |
| `learningObjective`/`objectiveSource` | 262 | 0 | legacy-live-bank **262/262 (100% of that catalog)** |
| `format` | 280 | 0 | pov-questions **280/280 (100% of that catalog)** |
| `cognitiveDemand` | 308 | 0 | scenario-engine-seed 28/28 (100%), pov-questions 280/280 (100%) |
| `contextZone` | 1246 | 0 | experimental-bank 1114/1600 (70%), legacy-live-bank 127/262 (48%), scenario-engine-seed 5/28 |

This is not "dozens" — `contextZone` alone is 1246/2170 rows (57% of the entire matrix).
The assignment's framing ("there should be a manageable number, likely dozens not
thousands") does not match what Task B actually shipped, so rather than resolve
individual IDs one-by-one (infeasible at this volume in the time available), I traced
each field to its root cause in the extraction code and found that **most of this volume
is a small number of systemic, and in three cases mechanically fixable, code gaps** —
not "the evidence genuinely doesn't exist."

**(a) `format: 'unknown'` for all 280 pov-questions rows — a field-name bug, not a
missing-evidence case.**
`tools/build-full-curriculum-matrix.mjs:318`: `format: q.type || 'unknown'`. But the real
`povQuestions.json` question objects (verified directly, e.g. `Q-2v1-001-A`) use the
field name **`format`** (`"format": "Multiple Choice"`), not `type` — `q.type` does not
exist on these objects at all, so every single row falls through to `'unknown'` even
though the actual format string sits right there in the source data.
- Proposed fix: `format: q.format || 'unknown'`.
- Affects: all 280 pov-questions rows.

**(b) `learningObjective`/`objectiveSource: 'unknown'` for all 262 legacy-live-bank rows
— evidence exists and is already loaded, just not reused.**
`tools/build-full-curriculum-matrix.mjs:202-203`: `learningObjective: q.concept ||
'unknown'`. Checked every one of the 262 `bank.json` rows: **zero** have a `q.concept`
field (confirmed: `hasConceptField: 0`), but **all 262** have a valid `nodeId` that
resolves to a real ledger concept (confirmed: `validNodeId: 262`) — and the code already
computes that `concept` object two lines earlier (line 174, used for `domainId`/
`conceptId`). The ledger concept's `name` (e.g., "Reading The Play") is sitting in scope,
unused, for this field.
- Proposed fix: `learningObjective: concept?.name || 'unknown'`, `objectiveSource:
  concept ? 'ledger-concept-via-nodeId' : 'unknown'`.
- Affects: all 262 legacy-live-bank rows (would resolve from unknown to a real,
  evidence-backed value for effectively all of them, since 262/262 have valid nodeIds).

**(c) `contextZone: 'unknown'` for 1114/1600 experimental-bank rows — partially
resolvable, richer text exists but isn't fed to the matcher.**
`contextZoneForText()` is called with only `[scenario.topic, scenario.family,
...tags].join(' ')` (line 145) — it never sees `scenario.briefing`, which is a full
prose description of the scene. Sampled: of 200 experimental-bank scenarios, 135 have no
zone keyword in topic/family/tags; of those 135, **62 (46%)** have an unambiguous zone
keyword in `briefing` text that the matcher never sees, e.g. `exp26-u7-004`: "YOU are
**near the side boards**..." (would resolve to `wall-boards`), `exp26b-u7-006`: "YOU have
the puck **beside the boards**..." For the remaining ~73 scenarios (and the parallel gap
in legacy-live-bank, where the matcher also omits `q.sit`'s full text... actually `q.sit`
*is* included for legacy-bank per line 207, so that catalog's 127 unknowns are closer to
genuine absence), no zone language exists anywhere in the available text — a genuine
"leave as unknown" case.
- Proposed fix: include `scenario.briefing` in the zone-matching text for
  experimental-bank rows.
- Affects: an estimated 62/200 scenarios' worth of experimental-bank question rows
  (proportionally several hundred of the 1114 unknown rows, since each scenario carries
  ~8 questions) — not all 1114, but a meaningful fraction; the rest appear to be genuine
  absence of zone-identifying language.

**(d) `conceptId: 'unmapped'` for 134/280 pov-questions rows — real per-question evidence
exists and is unused.**
`loadPovQuestionRows()` (line 295) builds its keyword-matching text from only
`[image.archetype, image.cognitiveSkill, image.readTrigger, image.povType]` — **image**
(scene)-level metadata. But every one of the 280 individual **question** objects also
carries an authored `concepts` array (confirmed 280/280 populated), e.g. `["Pass vs
Shoot", "Lane Support", "Cross-Ice Read"]` for `Q-2v1-001-A`, or terms like "Crossover
Power", "Gap Control", "Force Outside" elsewhere in the file — none of which are ever
read by the matrix builder. This is not a trivial one-line fix like (a)/(b) (the authored
concept labels are free-text coaching terms, not ledger concept IDs, so mapping them to
`src/data/curriculum-ledger.json` concept IDs would need a human/coach judgment pass or a
fuzzy-match table), but it is real, existing, unused evidence, not an absence of evidence
— the current `'unmapped'` framing ("no keyword signal") is not accurate for these 134
rows; the accurate framing is "authored evidence exists but hasn't been reconciled
against the ledger taxonomy yet."
- Recommendation: leave the matrix value as-is for now (a semantic mapping pass is
  out of scope for a mechanical fix), but correct the `evidenceRationale` text for
  pov-questions concept-unmapped rows, which currently would read as "no keyword signal
  in tags/topic/family/objective" — that's true only of the image-level fields checked,
  not of the question's own `concepts` field, so the rationale currently overstates how
  little evidence exists.

**Concrete list (representative, not exhaustive given volume):**

| id | field | current | proposed | evidence |
|---|---|---|---|---|
| all 280 pov-questions rows (e.g. `Q-2v1-001-A`) | format | unknown | value of `q.format` (e.g. "Multiple Choice") | field exists under a different name than the code reads |
| all 262 legacy-live-bank rows (e.g. `gen_u18_reading-the-play_5bjz`) | learningObjective | unknown | ledger concept name via existing `nodeId` resolution (e.g. "Reading The Play") | `nodeId` already resolves; concept object already computed in-scope |
| `exp26-u7-004` and ~61 other experimental-bank scenarios | contextZone (per question) | unknown | `wall-boards` (or scenario-specific zone) | zone language present in `scenario.briefing`, not fed to matcher |
| `Q-2v1-001-A` and ~133 other pov-questions rows | conceptId | unmapped | leave as unmapped for now; rationale text should say "authored concept label present but not yet reconciled to ledger", not "no signal" | `q.concepts` field populated but unread by the matrix builder |
| remaining experimental-bank/legacy-bank contextZone unknowns not covered above | contextZone | unknown | leave as unknown | no zone language found anywhere in available text after manual sampling |

### TASK-B-SUMMARY.md comparison

`TASK-B-SUMMARY.md` does not discuss the `unknown`/`unmapped` volume or root causes at
all — its only related statement is "One real bug found+fixed: `loadExperimentalRows`
could report `mappingMethod:'unmapped'` while still carrying a domain id from a
keyword-only signal; now consistent" (a different, narrower bug than any of the four
above). None of (a)-(d) are mentioned anywhere in the summary or in
`tools/build-full-curriculum-matrix.test.mjs`'s 17 tests.

**Verdict: UNDERSTATED / additional issues not disclosed.** The claim that "unknown"/
"unmapped" cells reflect a lack of evidence is only accurate for a portion of them.
Three concrete, code-level gaps ((a) a one-line field-name bug, (b) unused in-scope
data, (c) a partially-missing text source) collectively touch roughly 550-800+ rows
across pov-questions, legacy-live-bank, and experimental-bank that could be resolved with
real evidence already present in the source files, plus a fourth (d) where the
`evidenceRationale` text is more confident about "no signal" than is actually true. None
of this was surfaced in Task B's own summary or caught by its test suite.

---

## Summary of verdicts

1. pov-questions dead code: **CONFIRMED** — independently reproduced with a full,
   non-scoped repo grep; also independently corroborated by two pre-existing docs.
2. U11 changed-cue 53 vs 14: **CONFIRMED** on the headline numbers and rule-consistency
   (16/16 sampled classifications agreed with); **minor ERROR-FOUND** on the "171
   candidates, all hand-read" audit trail (not reproducible from shipped code — max
   reproducible candidate pool is 73-74) and the unstated "sentence-opening-only" scope
   of the naive baseline (true count of the word anywhere is 15, not 14).
3. U15/U18 skating absence: **CONFIRMED** — independently verified via full-text manual
   sweep across all three reachable catalogs (including `_pending`/`_retired` seeds),
   corroborated by the ledger's own depth-R target for both ages.
4. Unknown/unmapped resolution: **UNDERSTATED** — volume is far larger than the
   assignment anticipated (1246 for `contextZone` alone, not "dozens"), and three
   separate root causes (a field-name bug, unused in-scope ledger data, and a missing
   text source) are fixable/resolvable with existing evidence and were not disclosed or
   caught by Task B's own tests.
