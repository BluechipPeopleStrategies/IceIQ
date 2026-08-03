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
seed's `levels`, not from the filename.

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
| `man-to-man` | 3 | change → **player-to-player** |
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
decides the target text.

<!--TABLE_A-->

---

## 6. Remediation — Axis B (player identification)

**Total: 113.** Full list, no cap. Marker labels in `src/play/` are grouped at the end;
they are all the same one-line change (`label:` only — see R-B1).

<!--TABLE_B-->

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

<!--TABLE_C-->

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
