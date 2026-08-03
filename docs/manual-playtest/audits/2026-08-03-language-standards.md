# Language standards audit — zones, player identification, gendered language

**Date:** 2026-08-03
**Status:** PROPOSAL. Nothing was changed. No file outside this one was touched.
**Source findings:**
[CONTENT-11](../2026-08-03-playtest-findings.md#content-11--zone-vocabulary-isnt-standardized) ·
[S2-16](../2026-08-03-playtest-findings-session2.md) ·
[S2-28](../2026-08-03-playtest-findings-session2.md)

**Method.** Every number below is counted, not estimated. Prose was extracted
structurally — JSON walked by key so that `sit` / `q` / `opts` / `why` / `tip` /
`explain` / `right` / `wrong` / `prompt` / `stem` are scanned and `id` / `conceptId` /
`nodeId` / `sceneId` / `url` are not; JS and JSX scanned as string literals with
import lines, comments and CSS values excluded. Age band comes from the bank key or the
seed's `levels` / `level` field, not from the filename. (Incidental finding: of the 29
live seeds, 24 carry **both** `levels` and `level`, 3 carry only `level`
— `u11_oz_corner_lw_crash_v1`, `u13_scanning_slot_v1`, `u15_scanning_weakside_v1` —
and 1 carries only `levels`. Any tool reading just one key mis-bands those four.
Worth normalising, but out of scope here.)

**Scanned:** `src/data/bank.json` (5,950 lines, 262 questions across 6 bands),
29 live seeds in `src/scenario/seeds/` (`_pending` and `_retired` excluded — the
loader glob in `src/qbLoader.js:9` is `./scenario/seeds/*.json`, non-recursive),
203 JS/JSX files under `src/`, plus `public/coach-authoring.html` and the
`tools/` generators. 21,334 distinct player-facing strings.

**Not scanned as live:** `src/data/povQuestions.json` (10,021 lines) — nothing in
`src/` imports it; the only references are archived scripts under
`scripts/archive/notion-sync/`. Same for `src/data/backups/`,
`tools/question-editor/data.js`, and `src/data/*.bak`.

---

## 0. Headline

| Axis | Variants in use | Strings that would change | Itemised below |
|---|---|---|---|
| A — zone / ice-area vocabulary | 9 competing zone names, 8 orthographic splits | **86** | 60 (capped) |
| B — player identification | **6** conventions, not 4 | **113** | 113 (full) |
| C — gendered language | 14 distinct terms | **122** live (+105 out of scope) | 122 (full) |

There is already a strong foundation to build on, and the standards below are written
to extend it rather than replace it:

- `docs/references/rink-area-vocabulary.md` (2026-08-02) already defines every ice
  area **geometrically**, with confidence ratings and a known-inconsistencies section.
  What it deliberately does not do is pick a **name**. That is the gap this document fills.
- `src/data/rinkFeatures.js` is already a canonical id→name vocabulary list.
- `src/scenario/validators.js` already gates position tags by age
  (`noPositionTagsOnYoungBoards`, L843).
- `src/play/AnimatedPlay.jsx` already translates `F1`/`F2`/`D1`/`A1`/`A2` into plain
  language for younger bands (`playerFacingTextForAge`, L79) — and it already outputs
  **"open player"**, the exact phrase asked for in S2-28.

So the app is not missing the idea of a standard. It has three partial ones that
disagree with each other, and no single place that states the rule.

---

## 1. Axis A — zone and ice-area vocabulary

### 1.1 What is actually in use

Counts are occurrences in player-facing prose (bank + live seeds + gym + play copy).

**Zone names — 9 ways to say 3 things.**

| Concept | Variant | Count | Where the weight sits |
|---|---|---|---|
| Defensive zone | `defensive zone` | 29 | bank 9, hockeyInsights 6, constants 3 |
| | `your zone` | 9 | bank |
| | `own zone` | 12 | bank 11 |
| | `own end` | 3 | bank, validators, constants |
| | `your end` | 2 | bank |
| | `d-zone` | 7 | bank 2, App.jsx 2, playFamilies, dzBreakout… |
| | `defending zone` | 1 | `RinkStage.jsx:270` (the on-rink label) |
| Offensive zone | `offensive zone` | 41 | bank 20, hockeyInsights 6 |
| | `their zone` | 4 | bank |
| | `attacking zone` | 2 | bank 1, `RinkStage.jsx:271` |
| | `o-zone` | 1 | previewPlayer |
| | `offensive end` | 1 | zones.js |
| Neutral zone | `neutral zone` | 44 | bank 14, constants 6 |
| | `centre/center ice` | 8 | bank 7 |
| | `middle of the ice` | 14 | bank 12 — **but see §1.4, most are correct** |

**Specific areas — mostly consistent already.**

| Area | Count | Competing forms |
|---|---|---|
| slot | 85 | `high slot` 16, `low slot` 1, `home plate` 0, `the house` 1 |
| net front | 38 | `net front` 7 / `net-front` 31 / `netfront` 0 in prose |
| corner(s) | 109 | `down low` 2 |
| crease | 20 | `blue paint`/`the paint` 2, `goal crease` 1 |
| the point | 18 | `top of the zone` 0, `up top` 4, `top of the circles` 6 |
| half-wall | 12 | `half-wall` 11 / `half wall` 1 |
| wall / boards | 102 / 108 | both used freely for the same ice |
| blue line | 69 | `blue line` 65 / `blueline` 4 (App.jsx) |
| backdoor | 30 | `backdoor` 17 / `back door` 7 / `back-door` 6 |
| faceoff | 27 | `faceoff` 22 / `face-off` 6 |
| strong / weak side | 20 / 32 | hyphenated vs open, both directions |

**Spelling split (Canadian vs American), prose only, CSS excluded.**

| Word | American | Canadian |
|---|---|---|
| centre / center | 61 | 3 |
| defence / defense (noun) | 61 | 6 |
| centre ice / center ice | 8 | 0 |

### 1.2 The age problem, which is bigger than the naming problem

`docs/references/rink-area-vocabulary.md` §5.8 makes the structural point: Hockey
Canada plays **U7 cross-ice** and **U9 half-ice**. There is no blue line in their game,
no point, no neutral zone. Zone vocabulary at those ages is not jargon — it describes
ice they never play on.

The bank does not respect that today:

| Term | U7 | U9 |
|---|---|---|
| blue line | 3 | 4 |
| slot | 0 | 4 |
| crease | 1 | 1 |
| offensive zone | 2 | 3 |
| defensive zone | 2 | 0 |
| neutral zone | 0 | 2 |
| centre ice | 2 | 2 |

That is 17 U7 and 16 U9 uses of ice vocabulary the player has no experience of.
`RinkStage.jsx` already hides position tags at U7/U9 and already swaps the on-rink zone
banner to `OUR END` / `ATTACK END` / `MIDDLE` (L266-273). The *questions* never got
the same treatment.

### 1.3 Recommended standard — Axis A

**One canonical name per area, plus a two-tier age rule.**

**Tier Y (U7 / U9) — net-relative only.** Permitted: *our end, attack end, the middle,
in front of the net, behind the net, the corner, the wall, the middle of the ice*.
Forbidden: zone names, blue line, the point, the slot, the crease, half-wall,
centre ice. This matches the on-rink banner `RinkStage.jsx` already renders and the
young-copy style the vocabulary doc §3 documents as existing house style.

**Tier S (U11+) — the full canonical list.** Exactly one name each:

| Area | Canonical | Never write |
|---|---|---|
| Defensive zone | **defensive zone** | your zone, own zone, own end, your end, d-zone, defending zone, DZ |
| Offensive zone | **offensive zone** | their zone, their end, attacking zone, o-zone, offensive end, OZ |
| Neutral zone | **neutral zone** | n-zone, NZ, "middle of the ice" *when a zone is meant* |
| Centre dot / circle | **centre ice** | center-ice, the centre dot |
| Blue line | **blue line** | blueline, blue-line |
| Goal line | **goal line** | goalline, goal-line (except attributive) |
| Centre red line | **centre red line** | red line (alone), the red |
| The point | **the point** | up top, top of the zone |
| The slot | **the slot** | the house, home plate, the scoring area |
| High slot | **high slot** | high-slot, the bumper |
| Low slot / net front | **the net front** (noun), **net-front** (adjective) | netfront, in tight, the doorstep |
| Crease | **the crease** | the paint, the blue paint |
| Corner | **the corner** | down low *when a corner is meant* |
| Half-wall | **the half-wall** | half wall, halfwall |
| Boards | **the boards** | prefer over "the wall" in new copy; existing "the wall" is grandfathered — see risk R-A3 |
| Backdoor | **backdoor** | back door, back-door |
| Faceoff | **faceoff** | face-off, face off |
| Strong / weak side | **strong side** / **weak side** (noun), **strong-side** / **weak-side** (adjective) | strongside, weakside |
| Hash marks | **hash marks** | hashmarks |
| Depth in zone | **up high / mid-zone / down low**, fenced by `d` per the vocabulary doc §2b | high in the zone / low in the zone are fine; bare "high"/"low" are not |

**Why this set, for a 9-year-old and their parent.** Every canonical term above is the
term a coach shouts from the bench and the term printed on a Hockey Canada practice
plan. A parent who has never played can look at the rink diagram and find "the slot",
"the point", "the corner" — they are places. Nothing here is an abbreviation, because
an abbreviation the child has to decode is a second question stacked on the hockey
question. `defensive zone` costs one extra word over `d-zone` and never has to be
taught. And a single name per place means the child can build one map, not three.

**Spelling: recommend Canadian.** *centre*, *defence*, *offence*, *centre ice*.
The app's own age bands are Hockey Canada's (`U11 / Atom`, `U9 / Novice`), the
governing body writes Centre and Defence, and an Edmonton U11 reads "Centre" on their
own team sheet. Cost: 67 prose strings. **This is the highest-risk item in the whole
audit** — see R-A1. The defensible alternative is to standardise on the American forms
already dominant (cost: 9 strings) and simply write the rule down. Either is
consistent; the status quo is not. Note the adjective **defensive** is identical in
both dialects, so `defensive zone` is unaffected either way.

### 1.4 Two things that look like defects and are not

- **"middle of the ice" (14).** In 12 of 14 uses this means the **lateral middle lane**
  ("steer carriers toward the boards instead of letting them use the middle of the
  ice", `bank.json:168`), not the neutral zone. Do **not** sweep it. Only
  `bank.json:893` / `3931` and similar carry-through-the-neutral-zone senses are
  candidates, and even those read fine.
- **"the wall" vs "the boards" (102 / 108).** Both are standard, and the vocabulary
  doc §3 records that young copy deliberately uses "the wall". Forcing one would rewrite
  200 strings for no comprehension gain. Recommend: prefer "the boards" in *new* copy,
  grandfather the rest, and reserve "half-wall" for the specific area.

### 1.5 The content gap CONTENT-11 also asked for

Thomas asked for questions that *teach* the areas, not just consistent naming.
`src/data/rinkFeatures.js` is the natural home and is already wired to a question type
(`rink-label`, validated in `RinkReadsRinkQuestion.jsx:211`). It currently lists 19
rink-anatomy entries and is **missing every area name in the ask**: no slot, no high
slot, no net front, no point, no corner, no half-wall, no strong/weak side, no
hash marks, no top of the circles, no backdoor.

**There are currently 0 `rink-label` questions in `bank.json`** (verified: no `correctId`
key anywhere in the bank). So the vocabulary feature exists and has never been used.
Adding the missing entries to `RINK_FEATURES` — with new ids, not renamed ones — plus
one label-the-rink question per area per band is the cheapest way to close CONTENT-11's
teaching half. That is a build task, not a rename, and is out of scope for this audit.

---

## 2. Axis B — player identification

### 2.1 What is actually in use — six conventions, not four

Thomas named four (F1/F2, positional, YOU, A1/A2). The scan found **six**.

| # | Convention | Occurrences | Where |
|---|---|---|---|
| 1 | **Situational forward numbers** `F1` `F2` `F3` | 49 (13 in player copy) | play kernels; `bank.json` 3522-3634 (U11), 5322-5330 (U13); 4 seed strings |
| 2 | **Numbered defenders** `D1` `D2` | 14 | `twoOnOneKernel.js`, `defenderHoldsMiddle.js` — on-rink labels |
| 3 | **Opponent letters** `A1` `A2` | 13 on-rink labels + 1 prose | `backcheckRecovery.js`, `defensiveAngling.js`, `forecheckPressure.js` (+4 more) |
| 4 | **Chalkboard X** `X1` | 5 | `u11_oz_corner_lw_crash_v1.json` — a **U11** board |
| 5 | **Positional** — full names and abbreviations | 190 full names, 48 abbreviations | bank 41 winger / 22 centre / 58 defence-noun; seed actor tags LW 15, RW 19, C 11, LD 6, RD 1, D 5, F 1, F3 1 |
| 6 | **Literal `YOU`** | 56 all-caps + 21 actor tags + 1,090 "you/your" | everywhere |

Plus two singletons: `W1` and `S1` and `P1` and `BC1` (one on-rink label each,
`playFamilies`-era plays).

**The four conventions Thomas saw on one screen are all real and all live at the same
age.** On a U11 board today a player can see: an actor tagged `LW`, prose saying "your
LW", prose saying "X1 has stepped up", a marker captioned `YOU`, and — on an animated
play at the same band — markers reading `A1`, `A2`, `D1`, `F2`.

**The reason the animated plays leak shorthand:** `AnimatedPlay.jsx:78` gates the
plain-language translation on `isFilmRoomProfile()`, which is
`JSON.stringify(profile).toLowerCase().includes("u15" | "u18" | "film")`. Everything
that is *not* U15/U18/film gets translated — but only in **question, option and
feedback text**. The marker labels themselves come from `actorDisplayLabel` (L47),
which returns `actor.label` verbatim for any non-`figure` token profile. So U11 and
U13 read "support teammate" in the sentence and see `F2` on the ice, in the same frame.

### 2.2 Age-banded or one global convention? — the argument both ways

**Case for one global convention.** Simpler to author and to validate. A child who
learns one vocabulary at U9 never re-learns it at U15. Every mixed system in the repo
today is a bug generator — the two age gates in `AnimatedPlay.jsx` and `RinkStage.jsx`
already disagree (one keys on `profile.token`, one on `levels`), and a third
(`validators.js:843`) keys on `youngestU`. Collapsing to one convention deletes that
whole class of drift. It is also the honest reading of "make sure the language is
always consistent."

**Case for age-banded.** Three things force it:

1. **The game itself changes under the child.** U7 is cross-ice and U9 is half-ice.
   There are no wingers and no defence pairing in a half-ice game. "Left Wing" is not
   simpler language for a 7-year-old, it is a **false** description of what they play.
   A global convention has to be either wrong at U7 or useless at U18.
2. **F1/F2/F3 is not a position, it is a role in the moment.** F1 is whoever is first
   in on the forecheck — it changes shift to shift and is often a defender. It cannot
   be swapped for "Left Wing" without changing the hockey meaning. Its correct home is
   forecheck / backcheck / coverage reads, which are U13+ concepts by the repo's own
   `advancedThemesGatedByAge` gate (`validators.js:872` blocks `backcheck` and
   `breakout` themes below U11).
3. **The repo already committed to age-banding everywhere else** — difficulty caps,
   skater-count caps, pressure mechanics, marker styling, theme gating, self-rating
   (`selfRating.js`: U7/U9 don't self-rate at all). A flat vocabulary would be the one
   un-banded thing in a banded product.

**Recommendation: age-banded, three tiers.** The consistency Thomas is asking for is
delivered by *one convention per band, no exceptions, enforced by a validator* — not by
one convention for all ages. What is unacceptable today is four conventions inside a
single band, which is what the U11 boards do.

### 2.3 Recommended standard — Axis B

| | **Tier Y — U7 / U9** | **Tier S — U11 / U13** | **Tier F — U15 / U18** |
|---|---|---|---|
| Self | `YOU` on the marker; "you / your" in prose | same | same |
| Teammates | "your teammate", "the other player on your team" | **full position name**: "your left winger", "your centre", "your defender" | position name **or** `F1`/`F2`/`F3`, `D1`/`D2` |
| Opponents | "the other team's player", "the checker" | "the defender", "their centre", "the checker" | same, plus `D1`/`D2` for the defending unit |
| On-rink marker tag | **none** (already enforced, `validators.js:843`) | `LW` `RW` `C` `LD` `RD` `G` **with an on-screen legend** | `F1` `F2` `F3` `D1` `D2` `G` `A1` `A2` |
| Never, at any age | `A1` `A2` `X1` `X2` `W1` `S1` `P1` `BC1` in **prose**; "open man" | | |

Four rules that make it a standard rather than a preference:

1. **`YOU` is always the literal word `YOU`, in caps, on the marker, and never a
   position.** Prose may say "you're on left wing" for context, but the marker is `YOU`.
   Already true in `RinkStage.jsx:100`, which strips a literal `YOU` tag so it isn't
   printed twice. Keep it.
2. **First mention introduces the shorthand.** `bank.json:3522` already does this
   correctly: *"You're the first forechecker (F1)…"*. Every Tier-F use of `F1`/`D1`
   must introduce it once in the same question. `bank.json:3531` (`"F1 steers the
   breakout into traffic."`) does not, and is a U11 tip besides.
3. **Opponents are described, never lettered, in prose.** `X1` in
   `u11_oz_corner_lw_crash_v1.json` is a U11 board using a chalkboard symbol that
   appears nowhere else in the product. Replace with "the defender".
4. **The marker legend is mandatory wherever a tag is drawn.** A U11 who sees `LD` and
   isn't told what it means learns nothing; a parent watching over the shoulder learns
   less. This is a small UI addition to `RinkStage.jsx` / `AnimatedPlay.jsx`, not a
   copy change, and it is what makes Tier S's abbreviations acceptable.

**Why full position names at U11/U13 rather than F1/F2.** At U11 the child has just
been given a position and is being taught what it means. The position name *is* the
lesson. `F2` is a systems abstraction that presumes the position is already automatic —
which is exactly why it is right at U15. And for the parent, who is the second reader
of every question, "your left winger" needs no glossary and "F2" needs one.

**Also fix `isFilmRoomProfile`.** Gating on `JSON.stringify(profile).includes("u15")`
means any profile that happens to contain the substring "film" or "u15" anywhere —
including in a team name or a region string — silently switches a 9-year-old into
film-room shorthand. Replace with the same `youngestU`-style numeric parse
`validators.js:79` already uses.

---

## 3. Axis C — gendered language

### 3.1 What is actually in use

**122 live player-facing strings** contain gendered language. Full itemisation in §6.

| Term | Live count | Verdict |
|---|---|---|
| `defenseman` | 72 | change → **defender** |
| `defensemen` | 14 | change → **defenders** |
| `defenceman` / `defencemen` | 4 | change → **defender(s)** |
| `open man` | 10 | change → **open player** (the S2-28 ask) |
| `their man` / `your man` / `right man` | 5 | change → **their check / your check** |
| `linesman` | 3 | change → **linesperson** (the NHL's own term since 2020) |
| `man-to-man` | 3 | change → **player-to-player** — second-order term of art, same shape as `odd-man` (§3.3); all 3 are `hockeyInsights.js:587-589` about KHL coverage, so "player-to-player coverage" reads fine |
| `faceoff men` | 2 | change → **faceoff takers** |
| `doorstep man` | 2 | change → **doorstep player** |
| `point man` | 1 | change → **the player at the point** |
| `guys` | 1 | change → **players** |
| `Iron Man` (badge name) | 1 | change → **Workhorse** |
| generic `he` / `his` for an unnamed goalie or player | 4 | change → **they / their** |

**Why "defender" and not "defence".** It is already the app's own dominant word:
`defender` appears **596 times** against `defenseman`'s 58 in prose. Standardising on
`defenseman → defender` moves *toward* existing usage rather than away from it, so the
copy gets more consistent on two axes at once. Hockey Canada and USA Hockey ADM both
use "defender" in parent-facing material. The abbreviations `D`, `LD`, `RD` are
ungendered and stay.

**One hazard this creates, and the rule that fixes it.** "Defender" already carries a
second sense in this bank — *whoever is defending on this play*, either team. Once the
position is also "defender", `"the defender"` is ambiguous. The rule:
**always possessive-qualify the position.** "your defender" / "their defender" =
the player playing D. Bare "the defender" = whoever is defending the play. The copy
already follows this in most places (`bank.json:4186` uses bare "defender" correctly
for an opponent), so it is a codification, not a rewrite.

### 3.2 What is *not* a defect — do not sweep these

- **Named real players in `hockeyInsights.js`.** `he` / `his` / `him` about Draisaitl,
  Gretzky, Makar, McDavid, Crosby, Price, Hedman, Ovechkin, Barkov, Rantanen, Forsberg,
  Panarin, Hischier, Josi, Meier, Lundqvist (18 strings) and `she` / `her` about Hilary
  Knight (1 string) are accurate about specific people. Changing them would make the
  facts wrong.
- **`women's hockey`, `men's leagues`, `girls' hockey`** (15 + 4 + 3). These name real
  leagues and real participation categories — PWHL, NCAA women's, "playing against men
  in the SHL at 16". Correct as written.
- **`odd-man rush`** — 90 occurrences, and the reason it needs its own decision below.

### 3.3 The one genuinely open question: `odd-man rush`

`odd-man` appears **90 times**, but the split matters:

| Where | Count | Changeable? |
|---|---|---|
| `id` / `conceptId` / `nodeId` / `sceneId` / asset paths (`/assets/images/img_u13_odd-man…`) | 61 | **No** — ids and file paths |
| Prose (`sit`, `why`, `opts`, `tip`) | 29 | Yes, if a replacement exists |

It is a genuine term of art with no accepted neutral equivalent — "odd-player rush" is
not something any coach says. Three options:

1. **Keep it**, and log it as the one gendered term the product accepts, on the same
   footing as "linesman" before the NHL renamed it. Cost: 0.
2. **Prefer the specific numbers in new copy** — "2-on-1", "3-on-2" — which the bank
   already uses heavily and which are *clearer* for a 9-year-old anyway, keeping
   "odd-man rush" only where a generic is unavoidable. Cost: ~15 strings, and it makes
   the copy better independent of the gender question.
3. **Sweep to "odd-numbered rush"** across all 29 prose uses. Cost: 29 strings, and it
   reads slightly foreign to a hockey parent.

**Recommendation: option 2.** It satisfies "not gendered unless we absolutely have to",
improves comprehension, and touches no ids. Flagging for Thomas because it is the only
item here where the neutral form is worse copy than the gendered one, and that is
exactly the "unless we absolutely have to" case he carved out.

### 3.4 Out of scope, counted for completeness

105 further hits sit outside the live player-facing surface. They need no change to fix
the product, but three of the four groups will re-inject the defect if left alone:

| Scope | Hits | Action |
|---|---|---|
| `tools/question-editor/data.js` — legacy editor data, generated from the retired `questions.json` | 56 | none; dormant |
| `tools/seed-*.mjs`, `tools/add-mvp-batch-2.mjs` — one-shot historical seed scripts | 30 | none; already run |
| `public/bank-dashboard.html` — generated report | 14 | regenerate after the bank fix |
| `tools/scene-forge.mjs` — **still used to author scene descriptions** | 5 | **fix**, or new scenes are born with "defenseman" |
| `tools/tcs-scraper/transcripts/index.json` — scraped external titles | 4 | none; quoting a real title |
| `src/cognitive-gym/cognitive-gym-demo.html` — built bundle | 1 | rebuilds from source |

---

## 4. Risks — things that must not be find-and-replaced

Ordered by how much damage a careless sweep would do.

**R-A1 — `center` is 450+ CSS values.** `\bcenter\b` matches 515 times in `src/`, of
which only **61 are prose**. The rest are `textAlign: "center"`, `justifyContent`,
`alignItems`, `textAnchor`, and the identifiers `centerIce`, `center_ice_dot`,
`center_red_line`. A global centre/center replace breaks the layout of the entire app
and the `RINK_FEATURES` lookup. If the Canadian-spelling decision is taken, it must be
done key-by-key on prose fields only.

**R-A2 — `netfront`, `net-front`, `blue-line`, `odd-man` are ids and file paths.**
In `bank.json` alone: 14 `netfront` hits are `sceneId` values and
`/assets/scenes-u11/oz-point-shot-netfront.png` URLs; 16 `blue-line` hits are
`sceneId` / asset paths; 26 of 27 `net-front` hits at U11 are `id` / `conceptId` /
`nodeId` (`rr-u11-net-front-play-1`, `u11.net-front-play`). These key into
`src/data/scene-manifest.json` and into PNG files on disk. Renaming any of them
silently blanks the scene image. **Only `sit` / `q` / `opts` / `why` / `tip` /
`explain` / `alt` / `right` / `wrong` / `prompt` / `stem` may be touched.**

**R-A3 — `RINK_FEATURES` ids are referenced by `question.correctId` and
`spots[].correctChip`.** `src/data/rinkFeatures.js:34` has `id: "defenseman"` and
`id: "linesman"`. `RinkReadsRinkQuestion.jsx:199,208` validate `correctChip` against
`RINK_FEATURES.some(f => f.id === …)` and *throw a validation error* on an unknown id.
Change **`name` only** (`"Defenseman"` → `"Defender"`, `"Linesman"` → `"Linesperson"`).
Leave the ids. Mitigating fact: there are currently **0** questions using them, so a
coordinated id change is cheap *today* and expensive later.

**R-A4 — `public/coach-authoring.html` embeds a hand-copied clone of `RINK_FEATURES`**
(L325-333), and `rinkFeatures.js:6-9` says so explicitly. Any change to the names must
be mirrored there in the same commit or the authoring tool and the app disagree.

**R-B1 — `F1` / `F2` / `D1` / `A1` are actor **ids**, not just labels.** In
`src/play/plays/*.js` and `src/play/kernels/*.js` the same token is both
`{ id: "F1", … }` and `label: "F1"`, and the id is the key in every `pos:` map, every
`motions[].actor`, and every `enter:` frame. It is also asserted in **6 test files** —
`animatedPlayV2Adapter.test.mjs:36`, `compiledTeachingPlay.test.mjs:35`,
`factoryPipeline.test.mjs:34`, `physics/simulator.test.mjs:39,138,182,237`,
`scenarioDefinition.test.mjs:26,32,35`, `dzBreakoutImpossibleVariants.test.mjs:61`.
**Change `label:` only. Never `id:`.**

**R-B2 — `AnimatedPlay.jsx:81-88` string-replaces `F1`/`F2`/`D1`/`A1`/`A2`/`BC1` in
copy.** If the copy is rewritten to say "support teammate" directly, those `.replace()`
calls become dead but harmless; if the *labels* are renamed without updating this
block, younger bands get untranslated shorthand. Treat the two as one change.

**R-B3 — `src/scenario/zones.js` zone ids (`oz-half-wall-strong`, `dz-point-weak`, …)
are the authoring contract.** They appear in `tools/scenario-author/prompt.js:16-19`,
in seed `target.zoneId` values, and in `resolveTarget()` which **throws** on an unknown
id. The prose standard in §1.3 does not touch them. Also note the vocabulary doc §7
already records that `zones.js`'s `slot`, `high slot` and `half-wall` sit 12-16 ft away
from `ANCHORS`' versions of the same names — a real inconsistency, but a **geometry**
one, out of scope here.

**R-B4 — `positionalLanguage.js` matches phrases literally.** `CLAIMS` (L~60) tests
`/\b(?:up\s+)?high\s+in\s+the\s+zone\b/`, `/\bat\s+the\s+top\s+of\s+the\s+zone\b/`,
`/\b(?:down\s+)?low\s+in\s+the\s+zone\b/`, `/\bdown\s+low\b(?!\s+side)/`. Rewriting
"at the top of the zone" to "at the point" per §1.3 **removes a claim the validator
currently checks**, silently reducing coverage. `positionalLanguage.test.mjs` pins
this. Update the validator and the copy together.

**R-C1 — `IRON_MAN` is the badge key, `"Iron Man"` is the display name.**
`src/App.jsx:151` and `:565` (`earned.add("IRON_MAN")`). Badges are recomputed from
session stats each time (`calcBadges`, L3344) and not persisted by key, so renaming the
**name** is safe and renaming the **key** is also safe — but change the name only, to
keep the diff honest.

**R-C2 — `validators.js:711,714` dev messages.** `"there's no odd man on the ice"` and
`"show your man-advantage"` are developer-facing validator output, not player copy.
Low priority, and "man-advantage" must not be swept by a `your man` rule — a naive
regex turns it into "your check-advantage".

**R-C3 — `bank.json:1986` `"The linesman needs to wave the rush onside first"` is a
*distractor* (a wrong option).** Changing its wording is safe; changing which index is
correct is not. Same for every `opts` edit below — **`ok` must not move.** No proposed
change in §5-§7 alters an option's meaning, only its wording.

**R-C4 — `hockeyInsights.js` `id` fields contain `women`** (`oly-women-growth`,
L997). Ids, not copy.

---

## 5. Remediation — Axis A (zone vocabulary)

**Total strings needing change: 86.** Itemised below: **60** — the highest-impact set,
being every zone-name inconsistency and every orthographic split in `bank.json` and the
live seeds. **Capped out (26):** the same orthographic splits in `src/cognitive-gym/`,
`src/play/`, `src/data/hockeyInsights.js`, `src/data/studyContent.js` and
`src/data/constants.js` — `back door`/`back-door` (7), `face-off` (6), `defence`/`centre`
spelling (9), `blueline` in `App.jsx` (4). Those are mechanical once the rule is set.

Bands shown are the question's own band, because the Tier Y / Tier S rule in §1.3
decides the target text. Two caveats a human must apply row by row — this is not a
mechanical substitution:

- **"their zone" / "their own zone" is possessive, not directional.** The other team's
  own zone is *your* offensive zone. Six rows below (`bank.json:825`, `1055`, `3522`,
  `4099`, `5760`, and the U9 pair) need the referent resolved before the swap, or the
  hockey meaning inverts.
- **U7 / U9 rows resolve to Tier Y wording** ("our end" / "attack end" / "the middle"),
  never to the zone names. 14 of the 60 rows are U7 or U9.

| file:line | band | variant | current line | -> standard |
|---|---|---|---|---|
| `src/data/bank.json:410` | U11 | d-zone | `"why": "D-zone coverage starts with claiming a threat — everyone covered means nobody open. Find your player first; the puck comes` | defensive zone |
| `src/data/bank.json:415` | U11 | your zone | `"alt": "Two attackers cross paths in your zone, swapping sides, while you and a teammate cover them. The far side of the ice sits ` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:428` | U11 | your zone | `"sit": "Two attackers cross paths in your zone, swapping sides. You and your teammate are covering them. What's the simple read?",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:441` | U11 | your zone | `"alt": "Two attackers cross paths in your zone, swapping sides, while you and a teammate cover them. The far side of the ice sits ` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:462` | U11 | back-door | `"why": "While everyone stares at the puck battle, the far side of the ice goes quiet — that's where back-door goals are born. Weak` | backdoor |
| `src/data/bank.json:493` | U11 | your zone | `"alt": "Two attackers cross paths in your zone, swapping sides, while you and a teammate cover them. The far side of the ice sits ` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:506` | U11 | d-zone | `"sit": "Why do coaches say d-zone coverage is a team picture, not five separate jobs?",` | defensive zone |
| `src/data/bank.json:519` | U11 | your zone | `"alt": "Two attackers cross paths in your zone, swapping sides, while you and a teammate cover them. The far side of the ice sits ` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:825` | U11 | their zone | `"They've decided to skate backward to their zone"` | offensive zone (U11+) / "attack end" (U7-U9) |
| `src/data/bank.json:893` | U11 | center ice | `"alt": "You carry the puck through center ice. A forechecker closes on you while two teammates are open, one on each wing.",` | centre ice (see spelling decision) |
| `src/data/bank.json:906` | U11 | own zone | `"sit": "You're the last player back with the puck in your own zone, and a forechecker is closing. Which choice fits the risk?",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:914` | U11 | your zone | `"why": "Risk and reward change with where you are — last player back means low-risk plays win. Cross-ice and through-the-middle pa` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:915` | U11 | own zone | `"tip": "Own zone, last back: boring is brilliant.",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:919` | U11 | own zone | `"alt": "You are the last player back with the puck in your own zone. A forechecker charges at you while your winger waits on the w` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:1055` | U11 | their zone | `"It doubled, since their zone now has one less defender"` | offensive zone (U11+) / "attack end" (U7-U9) |
| `src/data/bank.json:1063` | U11 | own zone | `"alt": "You are the last player back with the puck in your own zone. A forechecker charges at you while your winger waits on the w` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:1363` | U11 | center ice | `"Watch closely from center ice in case of a turnover"` | centre ice (see spelling decision) |
| `src/data/bank.json:1621` | U11 | center ice | `"Skating in circles at center ice to waste time",` | centre ice (see spelling decision) |
| `src/data/bank.json:1803` | U11 | own zone | `"Turn around and skate back to your own zone",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:2086` | U11 | back door | `"sit": "The puck is behind the net with your teammate and the defense is watching them. Where is the 'back door'?",` | backdoor |
| `src/data/bank.json:2094` | U11 | back door | `"why": "The back door is the far post the defense forgot while ball-watching. Slide in quietly and a short pass becomes a tap-in g` | backdoor |
| `src/data/bank.json:2177` | U11 | center ice | `"alt": "You carry the puck through center ice. A forechecker closes on you while two teammates are open, one on each wing.",` | centre ice (see spelling decision) |
| `src/data/bank.json:2203` | U11 | center ice | `"alt": "You carry the puck through center ice. A forechecker closes on you while two teammates are open, one on each wing.",` | centre ice (see spelling decision) |
| `src/data/bank.json:2229` | U11 | center ice | `"alt": "You carry the puck through center ice. A forechecker closes on you while two teammates are open, one on each wing.",` | centre ice (see spelling decision) |
| `src/data/bank.json:3057` | U11 | your zone | `"Skating forward in a big curve back to your zone",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3301` | U11 | your zone | `"alt": "Your defenseman intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an ins` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3371` | U11 | your zone | `"To the middle of your zone to protect the slot"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3379` | U11 | your zone | `"alt": "Your defenseman intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an ins` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3400` | U11 | own zone | `"why": "The breakout is how your team escapes its own zone with possession — set positions, support options, and a read of the for` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3421` | U11 | center ice | `"At center ice waiting for a long stretch pass",` | centre ice (see spelling decision) |
| `src/data/bank.json:3475` | U11 | own zone | `"Inviting the other team to chase you into your own zone"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3522` | U11 | their zone | `"sit": "You're the first forechecker (F1) chasing the puck into their zone. What's your main job?",` | offensive zone (U11+) / "attack end" (U7-U9) |
| `src/data/bank.json:3730` | U11 | your zone | `"sit": "You backcheck hard and catch up beside the trailing attacker just as the rush enters your zone. Where's your stick?",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3928` | U9 | attacking zone | `"sit": "You carry the puck into the corner of the attacking zone. A white-jersey teammate is standing alone right in front of the ` | offensive zone |
| `src/data/bank.json:3931` | U9 | center ice | `"Skate back toward center ice with the puck",` | centre ice (see spelling decision) |
| `src/data/bank.json:3947` | U9 | your end | `"sit": "You are a white-jersey player in the neutral zone. You see two black-jersey players racing toward your end, and they are a` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:3955` | U9 | your end | `"explain": "When two black-jersey players are ahead of all your white-jersey teammates, that is a sign a dangerous rush is heading` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4045` | U9 | center ice | `"Skate the puck back toward center ice",` | centre ice (see spelling decision) |
| `src/data/bank.json:4099` | U9 | own zone | `"They should have backed up toward their own zone before going after the puck",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4211` | U9 | your zone | `"Throw a blind pass through the middle of your zone"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4298` | U9 | own zone | `"sit": "You are on defense in your own zone. The puck comes to you, and you have plenty of time and space. No forechecker is near ` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4303` | U9 | your zone | `"Throw a blind pass through the middle of your zone"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4483` | U7 | own end | `"Turn back toward your own end in case the other team gets the puck"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4521` | U7 | own zone | `"Glide slowly toward your own zone and watch where the puck goes",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:4611` | U7 | center ice | `"Coast near center ice and watch the shot",` | centre ice (see spelling decision) |
| `src/data/bank.json:4909` | U7 | your zone | `"explain": "The front of your own net is dangerous. The boards are the safer path when you are leaving your zone.",` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:5038` | U7 | center ice | `"Shoot from center ice right away"` | centre ice (see spelling decision) |
| `src/data/bank.json:5111` | U7 | own zone | `"They should have shot from their own zone"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:5201` | U13 | back-door | `"explain": "On a 2-on-1 the defender takes away the pass and trusts the goalie to handle the shot. A shooter the goalie can see is` | backdoor |
| `src/data/bank.json:5212` | U13 | own zone | `"sit": "Your defenseman is about to send you a breakout pass in your own zone. Your eyes have been on the puck since the play star` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:5677` | U13 | own zone | `"Turn back toward your own zone and let the counterattack slow down"` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:5692` | U13 | your zone | `"sit": "The other team misses the net, and the puck rims hard around the boards to you. You are starting a quick transition out of` | defensive zone (U11+) / "our end" (U7-U9) |
| `src/data/bank.json:5760` | U15 | their zone | `"explain": "The black center racing to the boards signals the outlet is forming, and with your white center pinched deep, pressing` | offensive zone (U11+) / "attack end" (U7-U9) |
| `src/scenario/seeds/gvis_u11_decision-making_tufb.json:93` | U11 | back door | `"wrong": "The RW crashing the back door is a real threat, but the defender is right on their heels — that pass is a gamble. The LD` | backdoor |
| `src/scenario/seeds/gvis_u11_reading-the-play_b633.json:95` | U11 | high-slot | `"right": "Yes. That opponent is parked in the slot, right on the doorstep of your goalie. That is the highest-danger ice, so they ` | high slot |
| `src/scenario/seeds/gvis_u11_reading-the-play_b633.json:96` | U11 | high-slot | `"wrong": "The high-slot opponent is a threat, but they are farther out. The opponent on the doorstep is the bigger danger — a pass` | high slot |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:75` | U13 | back door | `"stem": "2-on-1 off the rush. You're carrying wide into the zone with a trailer cutting to the back door. What's your best read?",` | backdoor |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:85` | U13 | back door | `"right": "Yes. The D committed to you, so the back door is wide open. Move it across.",` | backdoor |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:131` | U13 | back door | `"prompt": "The pass is on your tape at the back door and the goalie is sliding across. Tap where you shoot."` | backdoor |
| `src/scenario/seeds/u15_scanning_weakside_v1.json:87` | U15 | half wall | `"right": "Yes. Three defenders shaded to the strong-side puck, so the weak-side half wall is the open ice. Relocating there gives ` | half-wall |

---

## 6. Remediation — Axis B (player identification)

**Total: 113.** Full list, no cap. Marker labels in `src/play/` are grouped at the end;
they are all the same one-line change (`label:` only — see R-B1).

| file:line | band | issue | current |
|---|---|---|---|
| `src/data/bank.json:3114` | U11 | bare 'the D'/'your D' | `"why": "Skating backward on a regroup keeps every option in view — the D can see all three forwards and the forecheck at` |
| `src/data/bank.json:3426` | U11 | bare 'the D'/'your D' | `"why": "The wall winger is the breakout's pressure valve — hash marks, stick on the ice, ready to receive and move it. Y` |
| `src/data/bank.json:3444` | U11 | bare 'the D'/'your D' | `"sit": "One forechecker chases your defenseman behind the net while a second waits high. What is the D reading before ch` |
| `src/data/bank.json:3504` | U11 | bare 'the D'/'your D' | `"why": "When the wall dies, the middle support lives — the low-swinging center gives the D a second layer. Breakouts sur` |
| `src/data/bank.json:3522` | U11 | F1/F2/F3 in prose | `"sit": "You're the first forechecker (F1) chasing the puck into their zone. What's your main job?",` |
| `src/data/bank.json:3530` | U11 | F1/F2/F3 in prose | `"why": "F1 sets the forecheck's tone — pressure the carrier on an angle that limits their options. You're not just chasi` |
| `src/data/bank.json:3531` | U11 | F1/F2/F3 in prose | `"tip": "F1 steers the breakout into traffic.",` |
| `src/data/bank.json:3548` | U11 | F1/F2/F3 in prose | `"sit": "As F1, you approach the defenseman behind their net with the puck. Why take an angled path instead of a straight` |
| `src/data/bank.json:3556` | U11 | F1/F2/F3 in prose | `"why": "An angled approach closes one exit, so the D must go where you allowed. Predictable breakouts get eaten by your ` |
| `src/data/bank.json:3556` | U11 | bare 'the D'/'your D' | `"why": "An angled approach closes one exit, so the D must go where you allowed. Predictable breakouts get eaten by your ` |
| `src/data/bank.json:3626` | U11 | F1/F2/F3 in prose | `"sit": "Your forecheck forces the defenseman into a rushed pass up the wall — right where your F2 is waiting. What made ` |
| `src/data/bank.json:3634` | U11 | F1/F2/F3 in prose | `"why": "Forecheck turnovers are manufactured: F1's pressure removes time, F1's angle removes choices, and F2 camps on th` |
| `src/data/bank.json:3686` | U11 | bare 'the D'/'your D' | `"why": "Recover the danger, not the convenience. The middle-lane driver is the tap-in threat — erase them and the rush s` |
| `src/data/bank.json:5322` | U13 | F1/F2/F3 in prose | `"sit": "Your team is cycling the puck low in the offensive zone. You are the high forward (F3). You scan the slot and se` |
| `src/data/bank.json:5330` | U13 | F1/F2/F3 in prose | `"explain": "F3 can become a scoring option when quiet ice opens, but they still need defensive awareness. Sliding into t` |
| `src/scenario/seeds/gvis_u11_decision-making_tufb.json:92` | U11 | LW/RW/LD/RD in prose | `"right": "The LW is open in the slot — right in front of the net where goals happen. That pass puts your team in the bes` |
| `src/scenario/seeds/gvis_u11_decision-making_tufb.json:93` | U11 | LW/RW/LD/RD in prose | `"wrong": "The RW crashing the back door is a real threat, but the defender is right on their heels — that pass is a gamb` |
| `src/scenario/seeds/gvis_u11_scanning_zz7u.json:81` | U11 | LW/RW/LD/RD in prose | `"right": "Your pre-receive scan paid off — the RW is completely unguarded on the far side. Hit them in stride for a clea` |
| `src/scenario/seeds/gvis_u11_scanning_zz7u.json:82` | U11 | LW/RW/LD/RD in prose | `"wrong": "The LW looks close, but a defender is already shadowing them in that lane. Your shoulder check should have spo` |
| `src/scenario/seeds/gvis_u11_time-and-space_4we8.json:87` | U11 | LW/RW/LD/RD in prose | `"right": "Your LW has clean ice — no opponent nearby. That means time to catch, turn, and make the next play without pre` |
| `src/scenario/seeds/gvis_u11_time-and-space_4we8.json:88` | U11 | LW/RW/LD/RD in prose | `"wrong": "A defender is right on your RW. Passing there means your teammate has no time and no space — the puck gets tie` |
| `src/scenario/seeds/gvis_u11_time-and-space_8bwk.json:84` | U11 | LW/RW/LD/RD in prose | `"right": "The LW up top has open ice — no defender within reach. That's time and space: room to receive, control, and ma` |
| `src/scenario/seeds/gvis_u11_time-and-space_8bwk.json:85` | U11 | LW/RW/LD/RD in prose | `"wrong": "The RW looks available, but there's a defender right on their hip. Even if the pass gets there, the receiver h` |
| `src/scenario/seeds/gvis_u11_time-and-space_d5md.json:92` | U11 | LW/RW/LD/RD in prose | `"right": "The LW on the strong-side wall has a huge gap — no defender within range. That open pocket is exactly where th` |
| `src/scenario/seeds/gvis_u11_time-and-space_d5md.json:93` | U11 | LW/RW/LD/RD in prose | `"wrong": "Check the defenders: one is tight on the C in the slot, and the other is glued to the RW down low. The LW on t` |
| `src/scenario/seeds/gvis_u11_time-and-space_d5md.json:96` | U11 | LW/RW/LD/RD in prose | `"why": "Both defenders collapsed toward the middle and down low, leaving the LW on the strong-side wall completely unche` |
| `src/scenario/seeds/u11_dz_breakout_center_support_v1.json:76` | U11 | bare 'the D'/'your D' | `"right": "Drop low to the strong side, just up the wall from your D, and give them a short, safe outlet they can actuall` |
| `src/scenario/seeds/u11_dz_breakout_center_support_v1.json:77` | U11 | bare 'the D'/'your D' | `"wrong": "Flying the zone or drifting away leaves your D with no short outlet under pressure. Come low to the strong-sid` |
| `src/scenario/seeds/u11_dz_breakout_center_support_v1.json:79` | U11 | bare 'the D'/'your D' | `"tip": "Read your D before you take off. If they are getting squeezed, come low and show your blade.",` |
| `src/scenario/seeds/u11_dz_breakout_center_support_v1.json:82` | U11 | bare 'the D'/'your D' | `"stem": "You are the center and your D is retrieving the puck under heavy forecheck pressure. Where do you go to give th` |
| `src/scenario/seeds/u11_dz_breakout_center_support_v1.json:84` | U11 | bare 'the D'/'your D' | `"Drop low to the strong-side wall, just up from your D, for a short, safe outlet",` |
| `src/scenario/seeds/u11_oz_corner_lw_crash_v1.json:21` | U11 | X1/X2 in prose | `"prompt": "You have the puck in the strong-side corner. X1 has stepped up to cover the slot. Drag your LW to the highest` |
| `src/scenario/seeds/u11_oz_corner_lw_crash_v1.json:21` | U11 | LW/RW/LD/RD in prose | `"prompt": "You have the puck in the strong-side corner. X1 has stepped up to cover the slot. Drag your LW to the highest` |
| `src/scenario/seeds/u11_oz_corner_lw_crash_v1.json:35` | U11 | X1/X2 in prose | `"right": "X1 stepped up to cover the slot, which opened the net-front behind them. Crashing there gives you a tip or reb` |
| `src/scenario/seeds/u11_oz_corner_lw_crash_v1.json:36` | U11 | X1/X2 in prose | `"wrong": "Staying in the slot looks natural, but X1 has already stepped up and owns that spot. The space X1 vacated — ri` |
| `src/scenario/seeds/u11_oz_corner_lw_crash_v1.json:39` | U11 | X1/X2 in prose | `"why": "X1 stepping up creates an inverse opening: the slot is now covered but the net-front is free. Reading that swap ` |
| `src/scenario/seeds/u13_breakout_position_place_v1.json:37` | U13 | bare 'the D'/'your D' | `"right": "You beat the pressure: the strong wall is sealed, so the weak-side winger is the open outlet, the centre suppo` |
| `src/scenario/seeds/u13_breakout_position_place_v1.json:38` | U13 | bare 'the D'/'your D' | `"wrong": "Putting a winger on the sealed strong-side wall plays right into the forecheck — that lane is gone. Beat the p` |
| `src/scenario/seeds/u13_nz_regroup_hinge_v1.json:89` | U13 | bare 'the D'/'your D' | `"right": "Hinge it horizontally to your D-partner swinging low into open ice. You keep possession, reset the angle, and ` |
| `src/scenario/seeds/u13_nz_regroup_hinge_v1.json:93` | U13 | bare 'the D'/'your D' | `"why": "Scanning full width lets you identify your D-partner's safe hinge lane and keep possession instead of throwing a` |
| `src/scenario/seeds/u13_oddman_pass_mc_v1.json:78` | U13 | LW/RW/LD/RD in prose | `"stem": "You carry the puck up the middle on a 3-on-1. The lone defender has stepped toward the LW side of the zone. Wha` |
| `src/scenario/seeds/u13_oddman_pass_mc_v1.json:80` | U13 | LW/RW/LD/RD in prose | `"Pass to the RW on the far side",` |
| `src/scenario/seeds/u13_oddman_pass_mc_v1.json:81` | U13 | LW/RW/LD/RD in prose | `"Pass to the LW — they look to have a step at the top",` |
| `src/scenario/seeds/u13_oddman_pass_mc_v1.json:89` | U13 | LW/RW/LD/RD in prose | `"wrong": "The defender's position closes the LW lane. Shooting from traffic or driving into the defender wastes your 3-o` |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:79` | U13 | bare 'the D'/'your D' | `"Drive harder into the D",` |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:187` | U13 | bare 'the D'/'your D' | `"prompt": "The D broke it up. On a 2-on-1 where the D takes the carrier, what should you have done?"` |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:206` | U13 | bare 'the D'/'your D' | `"right": "Right — when the D takes you, the trailer is the open man.",` |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:207` | U13 | bare 'the D'/'your D' | `"wrong": "When the D commits to you, forcing your own shot plays into the one defender. The trailer is open."` |
| `src/scenario/seeds/u13_oz_entry_trailer_branch.json:272` | U13 | bare 'the D'/'your D' | `"right": "Yes — the D is shading the trailer's lane. Your shooting lane is open. Shoot.",` |
| `src/scenario/seeds/u13_oz_entry_trailer_v1.json:88` | U13 | LW/RW/LD/RD in prose | `"wrong": "Neither winger is the read here. The far RW looks open but the defenseman has closed that cross-ice lane with ` |
| `src/scenario/seeds/u13_oz_entry_trailer_v2.json:81` | U13 | bare 'the D'/'your D' | `"prompt": "You carry in and the D steps up to challenge. Tap the option that makes the D commit so you can attack the sp` |
| `src/scenario/seeds/u13_oz_entry_trailer_v2.json:96` | U13 | bare 'the D'/'your D' | `"right": "Delay to the trailing center. Holding the puck a beat draws the D to you and opens the ice the trailer is skat` |
| `src/scenario/seeds/u13_oz_entry_trailer_v2.json:97` | U13 | LW/RW/LD/RD in prose | `"wrong": "The RW is covered wide and the point is a passive bail-out. Make the D respect you first — drop to the center ` |
| `src/scenario/seeds/u13_oz_entry_trailer_v2.json:97` | U13 | bare 'the D'/'your D' | `"wrong": "The RW is covered wide and the point is a passive bail-out. Make the D respect you first — drop to the center ` |
| `src/scenario/seeds/u13_oz_entry_trailer_v2.json:157` | U13 | bare 'the D'/'your D' | `"wrong": "Passing behind the trailer kills their speed. Lead them into the space the D just vacated."` |
| `src/scenario/seeds/u13_oz_highslot_mc_v1.json:76` | U13 | F1/F2/F3 in prose | `"prompt": "Your team is cycling low and the defense collapsed below the puck. Where should you go as F3?"` |
| `src/scenario/seeds/u13_oz_highslot_mc_v1.json:83` | U13 | F1/F2/F3 in prose | `"stem": "Your team is cycling low and the defense has collapsed below the puck. As F3 drifting through the middle, what ` |
| `src/scenario/seeds/u13_oz_structure_place_v1.json:90` | U13 | bare 'the D'/'your D' | `"right": "Good read. You saw the D stepping toward the net and got to the weak-side wall before they could lock it down ` |
| `src/scenario/seeds/u13_oz_structure_place_v1.json:91` | U13 | bare 'the D'/'your D' | `"wrong": "Watch the D's feet. They're moving toward the net, which means they're about to cover net-front. The ice they'` |
| `src/scenario/seeds/u13_scanning_slot_v1.json:80` | U13 | F1/F2/F3 in prose | `"prompt": "Your team is cycling the puck low. You are F3 up high. Read where the coverage went, then tap the open ice yo` |
| `src/scenario/seeds/u13_scanning_slot_v1.json:91` | U13 | F1/F2/F3 in prose | `"why": "Scanning before the puck comes free lets F3 find the soft spot the collapsing defenders leave behind instead of ` |
| `src/play/plays/backcheckRecovery.js:16` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/backcheckRecovery.js:17` | all | on-rink marker label "A2" | `{ id: "A2", team: "away", role: "support", label: "A2" },` |
| `src/play/plays/backcheckRecovery.js:19` | all | on-rink marker label "D1" | `{ id: "D1", team: "home", role: "defender", label: "D1" },` |
| `src/play/plays/backcheckRecoveryDefenderGetsBeat.js:18` | all | on-rink marker label "P1" | `{ id: "P1", label: "P1", team: "away", role: "puckCarrier" },` |
| `src/play/plays/backcheckRecoveryDefenderGetsBeat.js:19` | all | on-rink marker label "S1" | `{ id: "S1", label: "S1", team: "away", role: "support" },` |
| `src/play/plays/backcheckRecoveryDefenderGetsBeat.js:20` | all | on-rink marker label "D1" | `{ id: "D1", label: "D1", team: "home", role: "defender" },` |
| `src/play/plays/defenderHoldsMiddle.js:18` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/plays/defenderHoldsMiddle.js:19` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/plays/defensiveAngling.js:17` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/defensiveAngling.js:19` | all | on-rink marker label "A2" | `{ id: "A2", team: "away", role: "support", label: "A2" },` |
| `src/play/plays/dzBreakoutEscapePressure.js:26` | all | on-rink marker label "W1" | `{ id: "W1", team: "home", role: "support", label: "W1" },` |
| `src/play/plays/dzBreakoutEscapePressure.js:27` | all | on-rink marker label "F1" | `{ id: "F1", team: "away", role: "defender", label: "F1" },` |
| `src/play/plays/dzBreakoutEscapePressure.js:28` | all | on-rink marker label "F2" | `{ id: "F2", team: "away", role: "defender", label: "F2" },` |
| `src/play/plays/forecheckPressure.js:18` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/forecheckPressure.js:19` | all | on-rink marker label "A2" | `{ id: "A2", team: "away", role: "support", label: "A2" },` |
| `src/play/plays/forecheckPressure.js:20` | all | on-rink marker label "D1" | `{ id: "D1", team: "home", role: "defender", label: "D1" },` |
| `src/play/plays/forecheckTakeAwayReverse.js:17` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/forecheckTakeAwayReverse.js:18` | all | on-rink marker label "A2" | `{ id: "A2", team: "away", role: "support", label: "A2" },` |
| `src/play/plays/forecheckTakeAwayReverse.js:19` | all | on-rink marker label "D1" | `{ id: "D1", team: "home", role: "defender", label: "D1" },` |
| `src/play/plays/gapControlHold.js:17` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/gapControlHold.js:19` | all | on-rink marker label "A2" | `{ id: "A2", team: "away", role: "support", label: "A2" },` |
| `src/play/plays/gapControlPivotMatch.js:16` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/offPuckSupport.js:17` | all | on-rink marker label "F1" | `{ id: "F1", team: "home", role: "puckCarrier", label: "F1" },` |
| `src/play/plays/offPuckSupport.js:19` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/plays/offPuckSupport.js:20` | all | on-rink marker label "D2" | `{ id: "D2", team: "away", role: "defender", label: "D2" },` |
| `src/play/plays/predictTwoOnOneDefenderStep.js:20` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/plays/predictTwoOnOneDefenderStep.js:21` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/plays/spotMistakeFlatSupport.js:20` | all | on-rink marker label "F1" | `{ id: "F1", team: "home", role: "puckCarrier", label: "F1" },` |
| `src/play/plays/spotMistakeFlatSupport.js:21` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/plays/spotMistakeFlatSupport.js:22` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/plays/supportAngleFlat.js:16` | all | on-rink marker label "F1" | `{ id: "F1", team: "home", role: "puckCarrier", label: "F1" },` |
| `src/play/plays/supportAngleFlat.js:17` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/plays/supportAngleFlat.js:18` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/plays/twoOnOneGoalieLateAfterPass.js:18` | all | on-rink marker label "F1" | `{ id: "F1", label: "F1", team: "home", role: "support" },` |
| `src/play/plays/twoOnOneGoalieLateAfterPass.js:19` | all | on-rink marker label "F2" | `{ id: "F2", label: "F2", team: "home", role: "puckCarrier" },` |
| `src/play/plays/twoOnOneGoalieLateAfterPass.js:20` | all | on-rink marker label "D1" | `{ id: "D1", label: "D1", team: "away", role: "defender" },` |
| `src/play/plays/twoOnOnePassLaneRemoved.js:18` | all | on-rink marker label "F1" | `{ id: "F1", label: "F1", team: "home", role: "puckCarrier" },` |
| `src/play/plays/twoOnOnePassLaneRemoved.js:19` | all | on-rink marker label "F2" | `{ id: "F2", label: "F2", team: "home", role: "support" },` |
| `src/play/plays/twoOnOnePassLaneRemoved.js:20` | all | on-rink marker label "D1" | `{ id: "D1", label: "D1", team: "away", role: "defender" },` |
| `src/play/plays/twoOnOneRead.js:17` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/plays/twoOnOneRead.js:18` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/plays/twoOnOneReadVariants.js:12` | all | on-rink marker label "BC1" | `{ id: "BC1", team: "away", role: "defender", label: "BC1" },` |
| `src/play/plays/twoOnOneSupportTooFlat.js:18` | all | on-rink marker label "F1" | `{ id: "F1", label: "F1", team: "home", role: "puckCarrier" },` |
| `src/play/plays/twoOnOneSupportTooFlat.js:19` | all | on-rink marker label "F2" | `{ id: "F2", label: "F2", team: "home", role: "support" },` |
| `src/play/plays/twoOnOneSupportTooFlat.js:20` | all | on-rink marker label "D1" | `{ id: "D1", label: "D1", team: "away", role: "defender" },` |
| `src/play/plays/verdictGapControlBackingIn.js:20` | all | on-rink marker label "A1" | `{ id: "A1", team: "away", role: "puckCarrier", label: "A1" },` |
| `src/play/plays/verdictGapControlBackingIn.js:22` | all | on-rink marker label "A2" | `{ id: "A2", team: "away", role: "support", label: "A2" },` |
| `src/play/plays/verdictTwoOnOneForcedShot.js:19` | all | on-rink marker label "F1" | `{ id: "F1", team: "home", role: "puckCarrier", label: "F1" },` |
| `src/play/plays/verdictTwoOnOneForcedShot.js:20` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/plays/verdictTwoOnOneForcedShot.js:21` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |
| `src/play/kernels/twoOnOneKernel.js:131` | all | on-rink marker label "F2" | `{ id: "F2", team: "home", role: "support", label: "F2" },` |
| `src/play/kernels/twoOnOneKernel.js:132` | all | on-rink marker label "D1" | `{ id: "D1", team: "away", role: "defender", label: "D1" },` |

Additionally, not string edits but required for the standard to hold:

| File | Change |
|---|---|
| `src/play/AnimatedPlay.jsx:47-58` | `actorDisplayLabel` returns `actor.label` verbatim for non-`figure` profiles — route it through the same tier map so U11/U13 markers don't show `F2`/`A1` |
| `src/play/AnimatedPlay.jsx:78-79` | replace `isFilmRoomProfile`'s `JSON.stringify().includes("u15")` with a numeric band parse |
| `src/scenario/RinkStage.jsx:246-249` | `hideTags` is U7/U9 only; Tier S needs a legend, Tier F needs `F1`/`D1` tags permitted |
| `src/scenario/validators.js:843` | extend `noPositionTagsOnYoungBoards` into a tier check: reject `F#`/`A#`/`X#` in **prose** below U15, not just tags |
| `src/data/rinkFeatures.js:34-42` | `name` only: `"Defenseman"` → `"Defender"`, `"Left/Right Defenseman"` → `"Left/Right Defender"`, `"Linesman"` → `"Linesperson"` (ids unchanged — R-A3) |
| `public/coach-authoring.html:325-333` | mirror the above (R-A4) |

---

## 7. Remediation — Axis C (gendered language)

**Total: 122 live strings** (118 term hits + 4 generic-pronoun). Exhaustive, as asked.
Out-of-scope hits are counted in §3.4 and not listed.

Proposed text is the same line with only the gendered term swapped — no other wording,
no tone change, no change to which option is correct (R-C3).

**`public/coach-authoring.html`**

| line | current | proposed |
|---|---|---|
| 325 | `{ id: "defenseman",           name: "Defenseman" },` | `{ id: "defenseman",           name: "Defender" },` **id unchanged — R-A3** |
| 326 | `{ id: "left_defenseman",      name: "Left Defenseman" },` | `{ id: "left_defenseman",      name: "Left Defender" },` |
| 327 | `{ id: "right_defenseman",     name: "Right Defenseman" },` | `{ id: "right_defenseman",     name: "Right Defender" },` |
| 333 | `{ id: "linesman",             name: "Linesman" },` | `{ id: "linesman",             name: "Linesperson" },` **id unchanged — R-A3** |

**`src/App.jsx`**

| line | current | proposed |
|---|---|---|
| 151 | `IRON_MAN:   {icon:"🏒", name:"Iron Man",     desc:"5 sessions completed"},` | `IRON_MAN:   {icon:"🏒", name:"Workhorse",     desc:"5 sessions completed"},` |

**`src/coachPersonas.js`**

| line | current | proposed |
|---|---|---|
| 83 | `summary: "Low-key, high-reps, never loses the room. Gets guys to relax, skate through mistakes, and stack clean shifts.",` | `summary: "Low-key, high-reps, never loses the room. Gets players to relax, skate through mistakes, and stack clean shifts.",` |

**`src/cognitive-gym/CognitiveGym.jsx`**

| line | current | proposed |
|---|---|---|
| 40 | `why: "Knowing where your options are without staring at the puck is how you find the open man, break out cleanly, and see the check before it arrives.…` | `why: "Knowing where your options are without staring at the puck is how you find the open player, break out cleanly, and see the check before it arriv…` |
| 106 | `why: "…is how you find the open man and put the puck on the right tape instead of guessing."` | `…is how you find the open player and put the puck on the right tape instead of guessing."` |

**`src/cognitive-gym/SnapshotDrill.jsx`**

| line | current | proposed |
|---|---|---|
| 24 | `const REVEAL_HOLD_MS = 2400; // freeze the result so the player can study where the open man was` | `const REVEAL_HOLD_MS = 2400; // freeze the result so the player can study where the open player was` |
| 349 | `? `Found the open man! +${last.repPoints} (${last.distFt} ft off)`` | `? `Found the open player! +${last.repPoints} (${last.distFt} ft off)`` |

**`src/cognitive-gym/TrackingDrill.jsx`**

| line | current | proposed |
|---|---|---|
| 531 | `you find the open man, break out cleanly, and see the check before` | `you find the open player, break out cleanly, and see the check before` |

**`src/data/bank.json`**

| line | current | proposed |
|---|---|---|
| 794 | `"sit": "The opposing defenseman at the point winds up for a big slapshot. As a forward nearby, what does that cue tell you?",` | `"sit": "The opposing defender at the point winds up for a big slapshot. As a forward nearby, what does that cue tell you?",` |
| 807 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 860 | `"sit": "The other team's defenseman pinches down the wall to keep the puck in. What opportunity should you read the instant it happens?",` | `"sit": "The other team's defender pinches down the wall to keep the puck in. What opportunity should you read the instant it happens?",` |
| 863 | `"The ice behind that pinching defenseman is now open",` | `"The ice behind that pinching defender is now open",` |
| 1679 | `"tip": "Cycle until someone loses their man.",` | `"tip": "Cycle until someone loses their check.",` |
| 1700 | `"Your own defenseman standing at the far blue line",` | `"Your own defender standing at the far blue line",` |
| 1935 | `"Circle back to help the defensemen on the rush"` | `"Circle back to help the defenders on the rush"` |
| 1986 | `"The linesman needs to wave the rush onside first",` | `"The linesperson needs to wave the rush onside first",` |
| 2008 | `"sit": "Your defenseman is about to shoot from the point and you're at the net front. What's one job you can do there?",` | `"sit": "Your defender is about to shoot from the point and you're at the net front. What's one job you can do there?",` |
| 2012 | `"Turn and face your defenseman to watch the shot",` | `"Turn and face your defender to watch the shot",` |
| 2021 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 2047 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 2065 | `"The defenseman waiting back at the blue line"` | `"The defender waiting back at the blue line"` |
| 2125 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 2151 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 2725 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 3106 | `"sit": "During a neutral-zone regroup, your defenseman skates backward with the puck. What is that backward skating buying your team?",` | `"sit": "During a neutral-zone regroup, your defender skates backward with the puck. What is that backward skating buying your team?",` |
| 3119 | `"alt": "Your defenseman skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",` | `"alt": "Your defender skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",` |
| 3301 | `"alt": "Your defenseman intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",` | `"alt": "Your defender intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",` |
| 3319 | `"Coast back slowly and let the defensemen handle the rush"` | `"Coast back slowly and let the defenders handle the rush"` |
| 3366 | `"sit": "Your defenseman intercepts a pass and looks up. As a winger, where does your first stride go?",` | `"sit": "Your defender intercepts a pass and looks up. As a winger, where does your first stride go?",` |
| 3379 | `"alt": "Your defenseman intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",` | `"alt": "Your defender intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",` |
| 3405 | `"alt": "Your defenseman has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings lo…` | `"alt": "Your defender has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings low …` |
| 3418 | `"sit": "You're the winger on the wall during a breakout. Where should you be as your defenseman gets the puck?",` | `"sit": "You're the winger on the wall during a breakout. Where should you be as your defender gets the puck?",` |
| 3423 | `"Behind the net helping the defenseman carry it"` | `"Behind the net helping the defender carry it"` |
| 3431 | `"alt": "Your defenseman has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings lo…` | `"alt": "Your defender has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings low …` |
| 3444 | `"sit": "One forechecker chases your defenseman behind the net while a second waits high. What is the D reading before choosing a side?",` | `"sit": "One forechecker chases your defender behind the net while a second waits high. What is the D reading before choosing a side?",` |
| 3457 | `"alt": "Your defenseman has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings lo…` | `"alt": "Your defender has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings low …` |
| 3470 | `"sit": "Your team carries the puck to the neutral zone but nothing is open ahead. The defenseman turns back with the puck. What is this 'regroup' for?…` | `"sit": "Your team carries the puck to the neutral zone but nothing is open ahead. The defender turns back with the puck. What is this 'regroup' for?",` |
| 3483 | `"alt": "Your defenseman skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",` | `"alt": "Your defender skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",` |
| 3509 | `"alt": "Your defenseman has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings lo…` | `"alt": "Your defender has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings low …` |
| 3525 | `"Hit the biggest defenseman as hard as possible",` | `"Hit the biggest defender as hard as possible",` |
| 3535 | `"alt": "You are the first forechecker, closing on their defenseman behind the net on a curved angle while your linemate covers the near wall.",` | `"alt": "You are the first forechecker, closing on their defender behind the net on a curved angle while your linemate covers the near wall.",` |
| 3548 | `"sit": "As F1, you approach the defenseman behind their net with the puck. Why take an angled path instead of a straight line?",` | `"sit": "As F1, you approach the defender behind their net with the puck. Why take an angled path instead of a straight line?",` |
| 3553 | `"The angle hides you from the defenseman's view completely"` | `"The angle hides you from the defender's view completely"` |
| 3587 | `"alt": "You are the first forechecker, closing on their defenseman behind the net on a curved angle while your linemate covers the near wall.",` | `"alt": "You are the first forechecker, closing on their defender behind the net on a curved angle while your linemate covers the near wall.",` |
| 3600 | `"sit": "The defenseman bobbles the puck in the corner as you forecheck with a teammate right behind you. Now what?",` | `"sit": "The defender bobbles the puck in the corner as you forecheck with a teammate right behind you. Now what?",` |
| 3613 | `"alt": "You are the first forechecker, closing on their defenseman behind the net on a curved angle while your linemate covers the near wall.",` | `"alt": "You are the first forechecker, closing on their defender behind the net on a curved angle while your linemate covers the near wall.",` |
| 3626 | `"sit": "Your forecheck forces the defenseman into a rushed pass up the wall — right where your F2 is waiting. What made the turnover happen?",` | `"sit": "Your forecheck forces the defender into a rushed pass up the wall — right where your F2 is waiting. What made the turnover happen?",` |
| 3631 | `"The defenseman forgetting the breakout play they practiced"` | `"The defender forgetting the breakout play they practiced"` |
| 3639 | `"alt": "You are the first forechecker, closing on their defenseman behind the net on a curved angle while your linemate covers the near wall.",` | `"alt": "You are the first forechecker, closing on their defender behind the net on a curved angle while your linemate covers the near wall.",` |
| 3660 | `"why": "Your defensemen have the carrier — the backchecker's job is the free attacker, the one who'd get the dangerous pass. Take a lane, not just the…` | `"why": "Your defenders have the carrier — the backchecker's job is the free attacker, the one who'd get the dangerous pass. Take a lane, not just the …` |
| 3661 | `"tip": "Backcheckers take the open man.",` | `"tip": "Backcheckers take the open player.",` |
| 3708 | `"The puck carrier is your defensemen's parent's favorite",` | `"The puck carrier is your defenders's parent's favorite",` |
| 4134 | `"sit": "Your defenseman has the puck behind your net, looking to pass it up the ice to you. The other team's winger is standing right between you and …` | `"sit": "Your defender has the puck behind your net, looking to pass it up the ice to you. The other team's winger is standing right between you and yo…` |
| 4186 | `"sit": "…The player passes the puck back to their defenseman at the blue line."` | `…The player passes the puck back to their defender at the blue line."` |
| 4705 | `"sit": "The other team is attacking, but your goalie makes a save and the puck goes out to your defenseman.",` | `"sit": "The other team is attacking, but your goalie makes a save and the puck goes out to your defender.",` |
| 4709 | `"Skate slowly sideways and wait for your defenseman to carry it",` | `"Skate slowly sideways and wait for your defender to carry it",` |
| 4710 | `"Skate into the same corner as your defenseman"` | `"Skate into the same corner as your defender"` |
| 4713 | `"explain": "When your team gets the puck, you can help start offense. Skate up ice with your stick ready so your defenseman has a forward passing opti…` | `"explain": "When your team gets the puck, you can help start offense. Skate up ice with your stick ready so your defender has a forward passing option…` |
| 5212 | `"sit": "Your defenseman is about to send you a breakout pass in your own zone. Your eyes have been on the puck since the play started, so you have no …` | `"sit": "Your defender is about to send you a breakout pass in your own zone. Your eyes have been on the puck since the play started, so you have no id…` |
| 5215 | `"Let your defenseman know you are ready by calling out to them",` | `"Let your defender know you are ready by calling out to them",` |
| 5302 | `"sit": "A defenseman receives a D-to-D pass in the neutral zone. They look down to catch it cleanly, hold onto it for three seconds while looking for …` | `"sit": "A defender receives a D-to-D pass in the neutral zone. They look down to catch it cleanly, hold onto it for three seconds while looking for a …` |
| 5311 | `"explain": "Pre-scanning lets the defenseman know the next option before the puck arrives. Without that early look, they spend too long processing aft…` | `"explain": "Pre-scanning lets the defender know the next option before the puck arrives. Without that early look, they spend too long processing after…` |
| 5345 | `"Scan the offensive blue line to locate the defensemen's gap",` | `"Scan the offensive blue line to locate the defenders's gap",` |
| 5347 | `"Present a clear target with your stick to your passing defenseman"` | `"Present a clear target with your stick to your passing defender"` |
| 5366 | `"sit": "You are a defenseman defending a 2-on-1 rush. What should your eyes be doing as the play crosses your blue line?",` | `"sit": "You are a defender defending a 2-on-1 rush. What should your eyes be doing as the play crosses your blue line?",` |
| 5405 | `"sit": "A good habit for a center on a faceoff win in the offensive zone is to immediately look back at their own defenseman to make sure the puck was…` | `"sit": "A good habit for a center on a faceoff win in the offensive zone is to immediately look back at their own defender to make sure the puck was c…` |
| 5408 | `"why": "…get to the net-front or slot area for a screen, tip, or loose puck instead of watching the defenseman."` | `…instead of watching the defender."` |
| 5598 | `"sit": "The puck turns over in the neutral zone. The gold defenseman immediately backs all the way to the top of their crease, leaving the blue line a…` | `"sit": "The puck turns over in the neutral zone. The gold defender immediately backs all the way to the top of their crease, leaving the blue line and…` |
| 5771 | `"sit": "In defensive-zone coverage, if the opposing center cycles high and switches spots with their defenseman, the covering forward should chase tha…` | `"sit": "In defensive-zone coverage, if the opposing center cycles high and switches spots with their defender, the covering forward should chase that …` |
| 5785 | `"sit": "The opponent's puck carrier is tied up with a gold defenseman in the corner. The opposing center slides into the slot, but the gold center is …` | `"sit": "The opponent's puck carrier is tied up with a gold defender in the corner. The opposing center slides into the slot, but the gold center is pu…` |
| 5863 | `"sit": "You are a defenseman retrieving a dump-in. The forechecker takes an inside angle and cuts off your partner. Your strong-side winger is open on…` | `"sit": "You are a defender retrieving a dump-in. The forechecker takes an inside angle and cuts off your partner. Your strong-side winger is open on t…` |
| 5939 | `"sit": "You are a defenseman pinching at the left point in the offensive zone. Your center has the puck at the half-wall but is being angled hard into…` | `"sit": "You are a defender pinching at the left point in the offensive zone. Your center has the puck at the half-wall but is being angled hard into t…` |

**`src/data/constants.js`**

| line | current | proposed |
|---|---|---|
| 125 | `{id:"u11dm2",name:"Defensive Zone Assignment",desc:"Finds their man without being told every play",selfQ:"Do you find your check automatically in your…` | `{id:"u11dm2",name:"Defensive Zone Assignment",desc:"Finds their check without being told every play",selfQ:"Do you find your check automatically in yo…` |

**`src/data/curriculum-ledger.json`**

| line | current | proposed |
|---|---|---|
| 765 | `"definition": "Picking up the right man and taking away the dangerous lane on the way back.",` | `"definition": "Picking up the right check and taking away the dangerous lane on the way back.",` |

**`src/data/hockeyInsights.js`**

| line | current | proposed |
|---|---|---|
| 52 | `stat: "NHL: Best faceoff men win 55-60%",` | `stat: "NHL: Best faceoff takers win 55-60%",` |
| 54 | `lesson: "Even elite faceoff men lose 4 out of every 10 draws. Compete on every one, but losing a draw isn't the end of the play — it's the start of th…` | `lesson: "Even elite faceoff takers lose 4 out of every 10 draws. Compete on every one, but losing a draw isn't the end of the play — it's the start of…` |
| 80 | `context: "Cale Makar won the Norris Trophy as the NHL's top defenseman in 2024-25 with the Colorado Avalanche. He averaged over 25 minutes of ice time…` | `context: "Cale Makar won the Norris Trophy as the NHL's top defender in 2024-25 with the Colorado Avalanche. He averaged over 25 minutes of ice time p…` |
| 81 | `lesson: "The best defensemen are also your most offensive weapons. Great D see the whole ice and make the first pass — they start the attack.",` | `lesson: "The best defenders are also your most offensive weapons. Great D see the whole ice and make the first pass — they start the attack.",` |
| 88 | `stat: "NHL: Top defensemen play 25+ minutes per game",` | `stat: "NHL: Top defenders play 25+ minutes per game",` |
| 89 | `context: "Elite NHL defensemen like Cale Makar, Quinn Hughes, and Victor Hedman average 25+ minutes of ice time — nearly half the game. That's 3-4x mo…` | `context: "Elite NHL defenders like Cale Makar, Quinn Hughes, and Victor Hedman average 25+ minutes of ice time — nearly half the game. That's 3-4x mor…` |
| 304 | `stat: "NHL: Defensemen with tighter gaps allow 15% fewer zone entries",` | `stat: "NHL: Defenders with tighter gaps allow 15% fewer zone entries",` |
| 305 | `context: "When defensemen close their gap on the attacking forward (skating toward them rather than backing up), controlled zone entries drop signific…` | `context: "When defenders close their gap on the attacking forward (skating toward them rather than backing up), controlled zone entries drop significa…` |
| 414 | `stat: "SHL: Defensemen join the rush on 40%+ of breakouts",` | `stat: "SHL: Defenders join the rush on 40%+ of breakouts",` |
| 415 | `context: "In the SHL, defensemen are expected to be active in the attack. They jump into the rush, walk the blue line, and create numerical advantages…` | `context: "In the SHL, defenders are expected to be active in the attack. They jump into the rush, walk the blue line, and create numerical advantages …` |
| 587 | `stat: "KHL: Defensive zone coverage uses more man-to-man than NHL zone defense",` | `stat: "KHL: Defensive zone coverage uses more player-to-player than NHL zone defense",` |
| 588 | `context: "Many KHL teams use man-to-man defensive assignments rather than zone coverage. Each defender is responsible for an opponent, which demands c…` | `context: "Many KHL teams use player-to-player defensive assignments rather than zone coverage. Each defender is responsible for an opponent, which dem…` |
| 589 | `lesson: "Know your assignment. Whether it's man-to-man or zone, the worst thing you can do defensively is be unsure who or what you're covering.",` | `lesson: "Know your assignment. Whether it's player-to-player or zone, the worst thing you can do defensively is be unsure who or what you're covering.…` |
| 618 | `lesson: "Defense is not just for defensemen. The best teams have forwards who work just as hard without the puck as they do with it.",` | `lesson: "Defense is not just for defenders. The best teams have forwards who work just as hard without the puck as they do with it.",` |
| 708 | `lesson: "Playing different positions teaches you the whole game. If you play D for a few games, you'll understand what your defensemen need when you g…` | `lesson: "Playing different positions teaches you the whole game. If you play D for a few games, you'll understand what your defenders need when you go…` |

**`src/data/rinkFeatures.js`**

| line | current | proposed |
|---|---|---|
| 34 | `{ id: "defenseman",           name: "Defenseman",        abbr: "D" },` | `{ id: "defenseman",           name: "Defender",        abbr: "D" },` **id unchanged — R-A3** |
| 35 | `{ id: "left_defenseman",      name: "Left Defenseman",   abbr: "LD" },` | `{ id: "left_defenseman",      name: "Left Defender",   abbr: "LD" },` |
| 36 | `{ id: "right_defenseman",     name: "Right Defenseman",  abbr: "RD" },` | `{ id: "right_defenseman",     name: "Right Defender",  abbr: "RD" },` |
| 42 | `{ id: "linesman",             name: "Linesman",          abbr: "LM" },` | `{ id: "linesman",             name: "Linesperson",          abbr: "LM" },` **id unchanged — R-A3** |

**`src/data/scene-manifest.json`**

| line | current | proposed |
|---|---|---|
| 429 | `"alt": "Your defenseman skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",` | `"alt": "Your defender skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",` |
| 978 | `"alt": "Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` | `"alt": "Your defender winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",` |
| 2277 | `"alt": "Your defenseman has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings lo…` | `"alt": "Your defender has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings low …` |
| 2358 | `"alt": "You are the first forechecker, closing on their defenseman behind the net on a curved angle while your linemate covers the near wall.",` | `"alt": "You are the first forechecker, closing on their defender behind the net on a curved angle while your linemate covers the near wall.",` |
| 2520 | `"alt": "Your defenseman intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",` | `"alt": "Your defender intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",` |

**`src/data/studyContent.js`**

| line | current | proposed |
|---|---|---|
| 16 | `"Watch an NHL game and pick one defenseman to follow. Track their gap control on the rush — do they close early or back up?",` | `"Watch an NHL game and pick one defender to follow. Track their gap control on the rush — do they close early or back up?",` |
| 56 | `"Follow one defenseman for a full game — track every gap decision, pinch, and transition",` | `"Follow one defender for a full game — track every gap decision, pinch, and transition",` |

**`src/scenario/seeds/u11_dz_breakout_center_support_v1.json`**

| line | current | proposed |
|---|---|---|
| 80 | `"why": "Reading the defenseman's pressure before bolting up ice keeps a short outlet available, so the breakout starts with a completion instead of a …` | `"why": "Reading the defender's pressure before bolting up ice keeps a short outlet available, so the breakout starts with a completion instead of a fo…` |

**`src/scenario/seeds/u11_dz_coverage_place_v1.json`**

| line | current | proposed |
|---|---|---|
| 20 | `"cue": "a teammate is already locked onto the doorstep man, so the open threat is the weak-side point with a clear shooting lane",` | `"cue": "a teammate is already locked onto the doorstep player, so the open threat is the weak-side point with a clear shooting lane",` |
| 101 | `"right": "Yes. Your teammate already has the doorstep man, so charging the net just double-covers him and leaves the point wide open for a clean shot.…` | `"right": "Yes. Your teammate already has the doorstep player, so charging the net just double-covers him and leaves the point wide open for a clean sh…` |
| 101 | `"right": "Yes. Your teammate already has the doorstep man, so charging the net just double-covers him and leaves the point wide open for a clean shot.…` | `"right": "Yes. Your teammate already has the doorstep player, so charging the net just double-covers him and leaves the point wide open for a clean sh…` |
| 102 | `"wrong": "Your instinct screams 'net-front,' but a teammate is already there. Doubling up leaves the point man alone with a clear lane. Cover the OPEN…` | `"wrong": "Your instinct screams 'net-front,' but a teammate is already there. Doubling up leaves the player at the point alone with a clear lane. Cove…` |
| 104 | `"tip": "Don't double-cover. Check who your teammates already have, then take the open man.",` | `"tip": "Don't double-cover. Check who your teammates already have, then take the open player.",` |

**`src/scenario/seeds/u13_oz_entry_trailer_branch.json`**

| line | current | proposed |
|---|---|---|
| 18 | `"tip": "On a 2-on-1, read the lone defenceman. If they take you, the pass is open; if they sag to the pass, take it yourself.",` | `"tip": "On a 2-on-1, read the lone defender. If they take you, the pass is open; if they sag to the pass, take it yourself.",` |
| 86 | `"wrong": "The D stepped to you, so forcing a shot or driving in lets the one defender win. The trailer was the open man."` | `"wrong": "The D stepped to you, so forcing a shot or driving in lets the one defender win. The trailer was the open player."` |
| 206 | `"right": "Right — when the D takes you, the trailer is the open man.",` | `"right": "Right — when the D takes you, the trailer is the open player.",` |

**`src/scenario/seeds/u13_oz_entry_trailer_v1.json`**

| line | current | proposed |
|---|---|---|
| 88 | `"wrong": "Neither winger is the read here. The far RW looks open but the defenseman has closed that cross-ice lane with an active stick, and dropping …` | `"wrong": "Neither winger is the read here. The far RW looks open but the defender has closed that cross-ice lane with an active stick, and dropping th…` |

**`src/scenario/seeds/u13_oz_structure_place_v1.json`**

| line | current | proposed |
|---|---|---|
| 23 | `"cue": "the weak-side defenceman is beginning to step toward the net — they haven't arrived yet, but they're on their way",` | `"cue": "the weak-side defender is beginning to step toward the net — they haven't arrived yet, but they're on their way",` |
| 78 | `"prompt": "Your winger has the puck on the wall and the weak-side defenceman is beginning to step toward the net. Drag YOURSELF to the best spot to re…` | `"prompt": "Your winger has the puck on the wall and the weak-side defender is beginning to step toward the net. Drag YOURSELF to the best spot to rece…` |

**`src/scenario/seeds/u13_oz_winger_wall_tf_v1.json`**

| line | current | proposed |
|---|---|---|
| 76 | `"right": "The defenceman is standing in the net-front, so it's covered. The open ice is the weak side they vacated.",` | `"right": "The defender is standing in the net-front, so it's covered. The open ice is the weak side they vacated.",` |

**`src/scenario/seeds/u9_dz_positioning_v1.json`**

| line | current | proposed |
|---|---|---|
| 87 | `"why": "Young defenders chase the puck and lose their man at the net. Holding net-side position on your check takes away the most dangerous pass into …` | `"why": "Young defenders chase the puck and lose their check at the net. Holding net-side position on your check takes away the most dangerous pass int…` |

**`src/scenario/validators.js`**

| line | current | proposed |
|---|---|---|
| 714 | `…in frame — show your man-advantage` };` | `…in frame — show your extra-attacker advantage` };`  **(dev-facing validator message, low priority — R-C2)** |

**The 4 generic-pronoun strings**, listed separately because the fix is a pronoun, not
a noun:

| file:line | current | proposed |
|---|---|---|
| `src/cognitive-gym/CognitiveGym.jsx:139` | `…They read the goalie on the way in and shoot where he isn't. Every goalie has a tell…` | `…shoot where they aren't. Every goalie has a tell…` |
| `src/cognitive-gym/SnapshotDrill.jsx:350` | `Not quite, ${last.distFt} ft away. The gold ring shows where he was.` | `…The gold ring shows where they were.` |
| `src/scenario/seeds/u11_dz_coverage_place_v1.json:101` | `Yes. Your teammate already has the doorstep man, so charging the net just double-covers him and leaves the point wide open…` | `Yes. Your teammate already has the doorstep player, so charging the net just double-covers them and leaves the point wide open…` |
| `src/coachPersonas.js:83` | `Low-key, high-reps, never loses the room. Gets guys to relax…` | `…Gets players to relax…` |

---

## 8. Suggested order of work

1. **Write the standard down first** — extend `docs/references/rink-area-vocabulary.md`
   with §1.3's naming table and §2.3's tier table. It is the natural home; it already
   owns the geometry and already has a "copy synonyms" section (§3) that this replaces
   with a single canonical column.
2. **Axis C, live surface (122).** Purely mechanical, zero geometry risk, and it closes
   S2-28. Do `rinkFeatures.js` + `coach-authoring.html` in the same commit.
3. **Axis B validator + tier map (the 6 code changes in §6).** Do this *before* the
   copy edits so the new rule is enforced as the copy lands.
4. **Axis B copy (113).**
5. **Axis A zone names (60), then the orthography tail (26).** Leave the
   Canadian/American spelling decision until last — it is the only reversible-but-noisy
   one, and it is Thomas's call.
6. **`tools/scene-forge.mjs` (5)** so new scenes are born correct.
7. **Then, and separately:** the CONTENT-11 *teaching* gap — new `RINK_FEATURES`
   entries and the first `rink-label` questions (§1.5).

Steps 2-6 touch 281 strings and no ids, no tests, and no geometry.
