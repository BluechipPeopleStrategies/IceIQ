# Anchor-fidelity validator — design + research

**Design/research document. Dated 2026-07-30. No code changes made in producing
this doc, nothing authorized by it.** Matching tonight's standing pattern:
research and design first, content/code changes need an explicit go-ahead
before anything ships. This document reports a confirmed bug, audits the rest
of the play catalog for the same class, and proposes a concrete validator —
it does not fix a single coordinate or write a line of the validator itself.

---

## The bug pattern

`src/play/plays/dzBreakoutEscapePressure.js`, node `retrieval`, actor `D1`:

```js
pos: {
  D1: [193, 54],
  ...
},
puck: [193, 54],
```

The node's own `q` text says: *"You have the puck behind your net..."*, and
the play's `sourceRef.cite` frames the whole scenario as a retrieval "behind
the net." So `[193, 54]` is supposed to represent **behind the net**.

`src/play/rinkAnchors.js` already has a named anchor for exactly that spot:

```js
behindNetRight: [192.5, 42.5],
```

Distance from the play's actual coordinate to the canonical anchor:

```
dx = 193 - 192.5 = 0.5
dy = 54 - 42.5   = 11.5
distance ≈ 11.51 units
```

11.5 of that 11.51 is pure y-drift — the puck carrier is sitting well down
toward the boards, not tucked in behind the net the way `behindNetRight`
defines it. On a 200×85 rink space that's not a rounding error; it's roughly
a quarter of the rink's width.

The frustrating part: `rinkAnchors.js` exists *specifically* to prevent this.
Its own header comment says so:

> "Anchors are an AUTHORING/GENERATION vocabulary: use `at()` while writing a
> play... so 'the slot' is the same spot in every play."

`dzBreakoutEscapePressure.js` never calls `at()` or imports from
`rinkAnchors.js` at all. It hardcoded raw `[x, y]` pairs everywhere, and one
of them drifted 11.5 units from the landmark it was supposed to represent —
with nothing in the codebase positioned to notice.

---

## What other developers do

Three independent research passes went looking for how other teams keep
hand-authored spatial/semantic content from drifting off a named canonical
reference. Honest read on the three streams: **stream 3 (magic-number /
semantic-drift lint patterns) was the richest and most directly actionable**
— it's the one that supplied the actual validator shape used below (tolerance
bands, claim-vs-actual comparison, where the check should live). **Stream 1
(game-engine editor tooling)** was useful for confirming the *architecture*
is already right but thin on *enforcement* mechanics — Godot/Unreal/Tiled all
solve this by having designers drag a reusable object into a scene, which
isn't really a diagnosis so much as "yes, `rinkAnchors.js` is the correct
shape, the gap is elsewhere." **Stream 2 (game/narrative content-linting)**
sat in between — strong on the *framing* (claimed intent vs. measured
reality as a first-class, automatable check) via the Avalon match-3 paper and
the Sea of Thieves talk, but light on ready-to-copy mechanics for a small JS
codebase specifically.

### Stream 1 — level-editor / game-tooling patterns for named anchors

| Technique | Core idea | Source | RinkReads translation |
|---|---|---|---|
| Godot `Marker2D`/`Marker3D` | A no-footprint node whose only job is holding a named, editor-placed position; scripts reference it by name instead of typing coordinates, explicitly to "avoid hardcoding coordinates directly into scripts." | Godot Engine docs, `class_marker2d`; GameDevAcademy, "Marker2D in Godot" | `ANCHORS` + `at()` in `rinkAnchors.js` is already the code-only equivalent of `Marker2D`. The architecture is right; the gap is that nothing forces authors to use it. |
| Unreal `PlayerStart` actor | Canonical spawn is a placeable actor, not a config number; code looks it up by class. A level with none defaults to `(0,0,0)` — a loud, obvious failure rather than a silently wrong number. | Unreal Engine docs, "Player Start Actor in Unreal Engine" | Reinforces the same conclusion, plus a specific instinct worth borrowing: a validator that can't match a play's claimed intent to an anchor should fail loudly with the exact numbers, never fall back to silently accepting whatever was typed. |
| Tiled reusable object templates + explicit "Detach" | Instances stay live-linked to a named template until the author performs a deliberate, visible Detach action. | Tiled docs, "Using Templates" | Model the escape hatch the same way: a raw literal that intentionally isn't anchor-derived should go through an explicit `raw(x, y, "reason")` call, not a bare array that's indistinguishable from an `at()` result by eye. |
| Magic-number anti-pattern | Unnamed numeric literals obscure intent and create N places to update instead of one; the fix is a named constant with one point of definition. | Wikipedia, "Magic number (programming)" | Treat every bare `[x, y]` in a position field of a play file as a magic number. Argues for *author-time enforcement*, not just a "use `at()`" convention in a comment — which is exactly what's been silently leaking, per the catalog audit below. |
| Unreal Data Validation plugin (`UEditorValidatorBase`) | Project-defined rules run automatically on save in-editor AND headless in CI, exiting non-zero on failure — same rule, two trigger points. | Unreal Engine docs, "Data Validation in Unreal Engine"; Unreal Directive | Dual-trigger shape for the RinkReads validator: one function, two call sites — a local `npm run` / pre-commit hook an author sees while still writing the play, and the same function run in CI over every file in `src/play/plays/*.js`. |
| AST-based custom lint (ESLint custom rules) | Walk a file's parsed AST, pattern-match a structural shape, `context.report()` on a match — the standard way to ban "literal X unless produced via approved call Y." | ESLint docs, "Custom Rules" | A project-local rule flagging every 2-element numeric literal in a position-bearing key unless it's the direct return of `at(...)`/`mirrorX(at(...))`. Explicitly **not** a proximity heuristic — that would have *missed* this exact bug, since `[193,54]` is 11.5 units out, arguably past a tight "near" threshold. Ban the bare-literal shape outright, with a `raw()` escape hatch. |
| Reverse-geocoding nearest-match + tolerance | Real coordinates never land exactly on a reference point, so lookup is inherently distance-plus-threshold, not exact match. | Wikipedia, "Reverse geocoding"; Esri/Google Maps geocoding docs | This is the actual shape of the *semantic* check (as opposed to the syntactic lint above): given a raw coordinate and a claimed name, look up the reference point and check distance against a domain-sized tolerance. Run against `dzBreakoutEscapePressure.js`, this is precisely what would report the bug as filed. |

### Stream 2 — content-linting / semantic-invariant validation from game & narrative pipelines

| Technique | Core idea | Source | RinkReads translation |
|---|---|---|---|
| Unreal Data Validation (again, framed as post-hoc data check) | Validators inspect an asset's *resolved* data and call pass/fail against project rules — a check on outcome, not authoring method. | Unreal Engine docs; Unreal Directive; Unreal Community Wiki | Build the equivalent as a small Node script every play runs through in CI/pre-commit, failing loudly with actual-vs-expected anchor and delta, mirroring Unreal's Message Log format. |
| "Improving Conditional Level Generation using Automated Validation in Match-3 Games" (Avalon, SEED/EA) | Content is authored with a *claimed* property; a separate automated step measures the *actual* property and rejects/flags divergence. Treats "does the data match what it says it is" as a first-class automatable check. | Villanueva Aylagas et al., IEEE Transactions on Games 2024, arXiv:2409.06349 | Direct template for the RinkReads validator — but the paper's lesson is to make the claim *structured*, not NLP-parsed prose. This is the strongest single argument in all three streams for adding explicit `intendedAnchor` metadata rather than pattern-matching `q` text (see the proposed fix below). |
| ESLint/Biome/Oxlint `no-magic-numbers` family | Flags numeric literals without a bound named constant. | ESLint docs; Biome docs; Oxlint docs | Precedent for an author-time lint, but generic `no-magic-numbers` would *not* catch this bug on its own (it can't tell `[193,54]` is wrong, only that it's a literal). Needs to be narrower and spatially aware — see stream 3's version below, which is the one actually worth building. |
| Unity `MonoBehaviour.OnValidate()` | Editor-only callback firing on field change, used to assert invariants the instant hand-placed data changes, not just at a later build step. | Unity Scripting API docs; Wayline guide | Less directly portable (plays are plain JS modules, no scene inspector) but the lesson generalizes: wire the check into a fast local dev loop (watch script or pre-commit hook scoped to `src/play/plays/**`), not only CI. |
| Rare's automated gameplay-feature testing (Sea of Thieves, GDC 2019) | Integration tests that actually *run* content and assert on runtime behavior, catching drift a pure data-shape check misses. | GDC Vault, "Automated Testing of Gameplay Features in Sea of Thieves" | Push the check past a single-node static comparison: also verify a `motions[].to` endpoint lands within tolerance when the node's prose claims a landmark, and that the *same* actor's "behind the net" position doesn't silently mean two different spots across nodes in one play — the exact shape of the module's own stated purpose for `at()`. |
| Yarn Spinner compiler static analysis (declared vs. actual graph reachability) | Compiler-level diagnostics comparing what the author's structure implies against what's actually compiled, as build errors rather than a separate QA pass. | Yarn Spinner docs, "Errors" | Precedent for *where* the check should live: inside whatever RinkReads already runs to validate play data (`validateFactoryStandards.js` or the `test:play-*` suite), not a standalone script someone has to remember to run. Also a severity-tiering idea: raw-literal-near-an-anchor-with-no-`at()` is a warning; an explicit claim that fails tolerance is a build error. |
| Twee3 Language Tools (live in-editor Twine diagnostics) | Real-time in-editor diagnostics for narrative content, not CI-only. | `cyrusfirheir/twee3-language-tools`, VS Code Marketplace | Reinforces pairing a CI check with an editor-visible signal (a VS Code problem-matcher / watch mode), not replacing CI with it. |
| "Test what matters! Ensuring Data Integrity in Game Development" | Argues data deserves the same test discipline as logic: bad/inconsistent data is as costly as a logic bug and far less likely to be caught because teams reflexively test code paths, not the data those paths consume. | Omid Reza Izadi, Medium | Frames this as a permanent regression-style test (`__tests__/anchor-invariants.test.js`), not a one-off patch to the one play that got caught. |

### Stream 3 — magic-number / named-constant lint and semantic-drift (claimed-intent vs. actual) detection

This was the richest stream and supplied the concrete shape used in the
proposed fix below.

| Technique | Core idea | Source | RinkReads translation |
|---|---|---|---|
| ESLint `no-magic-numbers` / SonarQube S109 | Flags unnamed numeric literals; purely syntactic, doesn't know what a number *means*. | eslint.org; SonarSource S109 | Would not catch this bug by itself. Useful narrowed: a rule scoped to play-authoring files flagging raw 2-element numeric arrays in position fields unless inside `rinkAnchors.js` itself or a literal arg to `at()`. |
| Fowler's "Replace Magic Literal" refactoring | Catalog refactoring: extract a bare literal into a symbolic constant. `at()`/`ANCHORS` is effectively this refactoring already applied at the coordinate-system level. | refactoring.com | The bug isn't "a wrong number," it's "a literal that was never refactored into the symbolic constant that already exists." Useful framing for how the fix docs/commit messages should describe the defect class. |
| `stylelint-declaration-strict-value` | A real, shipping linter banning raw hardcoded CSS values for *specific properties*, requiring a token/variable reference instead — configured per-property, not a blanket ban. | GitHub, `AndyOGo/stylelint-declaration-strict-value` | Closest real-world precedent for "ban raw literals in exactly this field, require the named accessor." Scope the ban to semantic position fields (`pos`, `puck`, `freeze`, `motions[].from/to`), not every number in a play (durations, counts, zone radii are legitimately raw). |
| Design-system drift detection (token-pipeline vs. rendered-value audits) | Diffing declared tokens against each other does **not** catch values that bypassed the token system entirely — that needs a separate pass auditing actually-authored values. | overlayqa.com, "Design system drift" | Directly explains why a lint on `at()` call sites alone is insufficient: this play never called `at()` at all, so a lint watching for misused `at()` calls would see nothing. Need a second, independent pass over *resolved* coordinates regardless of how they were produced. |
| `pytest.approx` / tolerance-banded float assertions | Compare against a reference with an explicit tolerance, not exact equality, because legitimate small offsets are expected. | pytest docs; codecut.ai | The concrete mechanism for the tolerance check: `distance(actual, ANCHORS[claimed]) <= TOLERANCE`, tolerance derived empirically (see "Proposed fix" below), not picked arbitrarily. |
| Great Expectations / `dbt-expectations` tolerance-band data-quality tests | Declarative "value within N of reference" checks, run automatically across an entire dataset every run, not just the row someone happened to inspect. | GitHub, `calogica/dbt-expectations` | Package the check as a small reusable assertion run over *every* play file in CI on every commit — this is what would have caught the bug, since nobody was going to eyeball all 20 files by hand. |
| Terraform `plan` drift detection | Diffs deployed state against declared `.tf` source of truth, run on a schedule/in CI because drift accumulates between deploys. | HashiCorp blog; Spacelift blog | `ANCHORS` is the declared configuration; every play file's coordinates are live state that can silently diverge from it. Run the drift check on every commit touching play files, not just when someone suspects a problem. |
| DRY / Single Source of Truth | Duplicated knowledge inevitably drifts apart because nothing forces the copies to stay in sync. | faros.ai; algomaster.io | A *constraint on the validator's own implementation*: it must import `ANCHORS` directly from `rinkAnchors.js`, never maintain a second "known-good anchors" table — that would recreate the exact duplication-drift bug one layer up. |
| TypeScript branded/nominal types | A raw `[number, number]` tuple is structurally interchangeable with an anchor-derived one; branding tags the anchor-derived type so a raw literal fails to typecheck where an anchored value is required. | Medium, "TypeScript nominal typing and branded types"; oneuptime.com | A stronger prevention layer than any lint, but only if the play format is (or becomes) typed enough for it to bite — RinkReads' plays are plain `.js` data modules today, so this is a "worth checking, not the near-term move" item. |
| Semantic Drift / Intent Drift taxonomy | Distinguishes "label no longer reflects what a thing does" (Semantic Drift) from "behavior diverges from stated purpose despite passing every existing check" (Intent Drift) — explicitly framed as invisible to tests because the code still runs fine. | reweaver.ai, "What is drift" | The most literal description of what actually happened here: the play's own `q`/`sourceRef` text is the label, `[193,54]` is the behavior, and it passed every existing check (nothing crashes, nothing renders wrong) because nothing was cross-checking the two against each other. |
| Comment-inconsistency detection research (iComment and follow-ons) | An established research area automatically cross-checks natural-language comments/docs against code, confirmed common and bug-correlated on real codebases; lightweight keyword/pattern approaches are a legitimate first line before anything ML-based. | arXiv:2409.10781; Tan et al., iComment | Validates that "check prose against data" is a legitimate, precedented technique — and that RinkReads doesn't need anything heavier than a hand-rolled keyword-to-anchor lookup table plus a numeric tolerance check, right-sized for a small codebase. |
| Golden master / characterization testing | Snapshot current presumed-correct output; future changes must be explicitly re-approved against the diff. | Wikipedia, "Characterization test"; Medium, "Golden Master Testing" | Secondary, follow-on protection: once the catalog is validated and clean, snapshot every play's resolved coordinates so any future retuning of `rinkAnchors.js` itself (e.g. rink-dimension changes) forces an explicit look at every play whose resolved position moved. |

---

## Real audit: how widespread is this in RinkReads today

Full catalog scan, `src/play/plays/*.js`, 20 files (confirmed by direct glob;
`twoOnOneReadVariants.js` packs 3 additional play objects via
`makePlayVariant()` inside one file, so the underlying play-object count is
closer to 22 — near the earlier "roughly 25" estimate, but the file count is
20).

**`at()` usage: zero.** No play file imports anything from `rinkAnchors.js`.
`ANCHORS`, `ANCHOR_NAMES`, `at()`, and `mirrorX()` are fully defined and
completely unused across the entire catalog — confirmed by direct read of
`rinkAnchors.js` (values match exactly what's referenced above) and a repo
grep for `rinkAnchors` imports across `src/play/plays/*.js`, which returned
nothing. All 20 files hardcode raw `[x, y]` literals for every actor/puck
position. Structurally, the whole catalog is exposed to this bug class, not
just the one confirmed play.

**Canonical-location claims checked.** Every place a play's own prose (a
node's `q`, an option's `t`/`youngT`, or `sourceRef.cite`) names a landmark
tied to an actual enacted actor/puck coordinate, checked against the nearest
matching anchor family. Complete list, good and bad together:

| Play | Claim | Claim source | Actual coord | Nearest anchor | Anchor coord | Drift |
|---|---|---|---|---|---|---|
| `dzBreakoutEscapePressure.js` | "behind your net" (primary retrieval position) | node `retrieval` q, D1/puck pos | `[193, 54]` | `behindNetRight` | `[192.5, 42.5]` | **11.51** |
| `dzBreakoutEscapePressure.js` | "behind the net" (tap-zone marker for `hold_behind_net`) | opt `hold_behind_net`, `zone:[196.5,42.5,3.5]` | `[196.5, 42.5]` | `behindNetRight` | `[192.5, 42.5]` | 4.0 |
| `dzBreakoutEscapePressure.js` | "behind the net" (resulting position after holding) | node `heldTooLong`, D1 pos | `[195, 46]` | `behindNetRight` | `[192.5, 42.5]` | 4.3 |
| `dzBreakoutEscapePressure.js` | "the slot" (tap-zone marker, `through_the_slot`) | opt `through_the_slot`, `zone:[177,42.5,5]` | `[177, 42.5]` | `slotRight` | `[176, 42.5]` | 1.0 |
| `dzBreakoutEscapePressure.js` | "the slot" (puck ends up there, `pinned` outcome) | node `pinned` motion "loose to the slot" | `[176, 44]` | `slotRight` | `[176, 42.5]` | 1.5 |
| `dzBreakoutEscapePressure.js` | "the most dangerous spot on the sheet" (the slot) | node `slotTurnover` q, puck pos | `[176, 43]` | `slotRight` | `[176, 42.5]` | 0.5 |
| `gapControlPivotMatch.js` | "retreat deep into the slot" | opt `retreat_deep` → node `tooMuchSpace`, D1 pos | `[178, 43]` | `slotRight` | `[176, 42.5]` | 2.06 |
| `forecheckPressure.js` | "a predictable wall play" | node `forcedWall` q, A1 pos | `[168, 63]` | `wallBottomRight` | `[168, 71]` | 8.0 |
| `forecheckTakeAwayReverse.js` | "starts up the wall" | node `pressure` q, A1 pos | `[172, 62]` | `wallBottomRight` | `[168, 71]` | 9.85 |
| `forecheckTakeAwayReverse.js` | "has to keep going up the wall" | node `sealed` q, A1 pos | `[162, 64]` | `wallBottomRight` | `[168, 71]` | 9.22 |
| `forecheckTakeAwayReverse.js` | "committed to the wall too early" | node `cutInside` q, P1 pos | `[158, 65]` | `wallBottomRight` | `[168, 71]` | 11.66 |
| `backcheckRecovery.js` | "recover wide toward the wall" | opt `go_wall` → node `wallRecovery`, BC1 pos | `[158, 68]` | `wallBottomRight` | `[168, 71]` | 10.44 |

**Reading the table honestly, not selectively:**

- The confirmed `dzBreakoutEscapePressure.js` "behind the net" miss (11.51
  units) is the worst single instance found, anywhere in the catalog.
- Strikingly, **every "the slot" reference in that same file** — a tap-zone
  marker, a puck-motion endpoint, and a terminal node's puck position — lands
  within 0.5–1.5 units of `slotRight`, essentially exact. Same author, same
  file, same session presumably: nailed "the slot" by feel, badly missed
  "behind the net." That argues the net miss is a one-off placement error,
  not a systemic net-vs-slot confusion.
- The other two "behind the net" claims in the *same play* (the tap-zone
  marker and the `heldTooLong` outcome position) are both noticeably tighter
  — 4.0 and 4.3 units — than the primary retrieval-node miss. So even within
  one play, "behind the net" isn't uniformly wrong; the `retrieval` node
  specifically drifted.
- `gapControlPivotMatch.js`'s one slot claim is reasonably tight (2.06).
- **Four "the wall" claims, across three different plays**
  (`forecheckPressure.js`, `forecheckTakeAwayReverse.js` ×3,
  `backcheckRecovery.js`) all drift 8.0–11.66 units from `wallBottomRight`,
  and in a consistent direction — actual x's cluster 158–172 against the
  anchor's x=168, actual y's cluster 62–68 against the anchor's y=71 (i.e.
  consistently short of the anchor's boards-hugging y). This is a second,
  independently-discovered pattern of moderate, consistent drift, distinct
  from the original find. Worth a caveat though: "the wall" names a whole
  stretch of boards, not a single point the way "behind the net" or "the
  slot" do, so comparing against one anchor per side is a blunter instrument
  here — whether these four count as the same bug class or are an artifact
  of having only one point-anchor per wall side is a judgment call, not a
  clear-cut finding the way the net miss is.
- `defenderHoldsMiddle.js`'s "skate away into the corner" wrong-answer
  option produces no actual corner-adjacent coordinate in its outcome node
  (F1 stays on its rush path), so there's nothing to measure — it's not
  listed as a claim because nothing was actually hardcoded to represent "the
  corner."
- No play's prose ties "the point," "high slot," or "the circle(s)" to an
  enacted actor/puck position, so those anchor families have zero claims to
  check against.

**Net read:** the confirmed `dzBreakoutEscapePressure.js` behind-net miss
looks like an isolated authoring slip, not the tip of a systemic net-anchor
problem. The wall-family claims (four instances, 8–11.7 units off, spanning
three separate plays) are a second, real, independently-discovered pattern
worth a look, even though no single instance there is as dramatic as the
original find. This is not a "just fix the one play" situation, but it's
also not "the whole catalog is on fire" — it's a mixed, honest picture, and
the structural exposure (zero plays use `at()`) is the bigger long-term risk
than any one drifted coordinate.

---

## Proposed fix — a concrete validator design

**What it checks.** For every actor/puck coordinate in a play that carries a
*declared semantic intent* (a claim that it represents a named rink
landmark), compute Euclidean distance from that coordinate to the matching
entry in `ANCHORS` (respecting `view`/mirroring for half-left plays) and fail
if the distance exceeds a tolerance band. This is the reverse-geocoding /
`pytest.approx` / Great-Expectations shape from the research above: nearest-
match-plus-tolerance, not exact equality, because a legitimate `at(name, dx,
dy)` offset is expected and fine — only *unbounded* drift is the bug.

**Tolerance, and how it's chosen.** Not an arbitrary number. Derive it from
the offset magnitudes real, correctly-placed content already uses elsewhere
in the catalog — e.g. the tight "slot" and near-tight "behind the net"
claims found in the audit above run 0.5–4.3 units. A tolerance in the
**3–5 unit range for a point-like landmark** ("behind the net," "the slot,"
"the point") comfortably passes every legitimately-placed claim found in the
audit (worst clean case: 4.3) while clearly failing the confirmed bug
(11.51) and the wall cluster (8.0–11.66) with margin either side of the
threshold — no case in the audit sits close enough to the boundary to be
ambiguous. Region-shaped landmarks ("the wall," a stretch of boards rather
than a dot) need either a wider band or a different check entirely (nearest
point on a line segment rather than nearest point on a point-anchor) — flag
this as a follow-on design question rather than picking a number now, since
the audit itself flagged the wall comparisons as a blunter instrument.

**Where it lives.** Follow the codebase's existing convention rather than
inventing a new one. RinkReads already has `src/play/validateFactoryStandards.js`
(wired to `npm run test:play-factory` → `scripts/test-play-factory-standards.mjs`)
enforcing structural authoring rules per play (exactly-one-correct-answer,
re-read cue rules, young-age shorthand, etc.) — the anchor check is the same
*kind* of rule (a per-node, per-play authoring invariant) and belongs
alongside it, either as a new check inside `validateFactoryStandards.js` or
as a sibling module it imports and calls, with its own `npm run
test:play-anchors` script following the existing `test:play-*` naming
pattern. It must import `ANCHORS` directly from `rinkAnchors.js` — never a
second hand-maintained "known good anchors" table, per the DRY finding above,
or the validator becomes exactly the kind of duplicated, driftable source of
truth it exists to prevent. Two call sites, per the Unreal Data Validation /
dual-trigger pattern: the `npm run test:play-*` suite (so it runs wherever
that suite already runs — presumably CI, given the existing `test:*` script
list) and, ideally, a fast local pre-commit/watch hook scoped to
`src/play/plays/**` so an author sees the failure while still writing the
play, not after merge.

**How semantic intent gets determined — the actual recommendation.**
This is the fork the research disagreed most on, and it's worth being
concrete rather than listing options:

- **Pattern-matching prose against anchor names is fragile** and shouldn't
  be the long-term mechanism — a keyword table ("behind the net" →
  `behindNet*`, "the slot" → `slot*`) is guessable-but-brittle: prose changes
  break it silently, and it can't distinguish "the slot" as a described
  landmark from "the slot" mentioned in passing without an enacted position.
- **Requiring new `intendedAnchor` metadata on every node going forward is
  the right long-term mechanism** — this is the Avalon paper's core lesson
  applied directly: make the claim structured and machine-checkable instead
  of living only in prose. Concretely, an optional per-actor-per-node field,
  e.g. `intendedAnchor: { D1: "behindNetRight" }` alongside `pos`, checked
  exactly like the Avalon paper checks claimed-vs-measured difficulty.
- **The right move is a hybrid, split by direction, not by ambiguity:**
  1. **For the existing 20-file catalog (audit pass, now):** run the
     prose-matching version once, exactly as this document's audit did by
     hand — it is what actually caught both the confirmed bug and the wall
     cluster, cheaply, without requiring anyone to retrofit metadata onto 20
     files first. It's an honest one-time or occasional tool, not a
     permanent gate, precisely because it's fragile.
  2. **For all new plays going forward:** require the explicit
     `intendedAnchor` field whenever a node's `q`/`sourceRef` claims a named
     landmark, enforced the same way `validateFactoryStandards.js` already
     enforces `sourceRef.note`/`sourceRef.cite` presence today (an `errs.push`
     that blocks the play). This is the durable fix — it turns "does the
     data match what it says it is" from an occasional audit into a standing,
     unbypassable authoring requirement, the same way `sourceRef` presence
     already is.
  3. **Backfill `intendedAnchor` into the current catalog opportunistically**
     when a play is next touched for any other reason, rather than as a
     dedicated migration sprint — the one-time prose audit in (1) already
     did the expensive discovery work; adding the field to an existing play
     is then a small, low-risk edit.

This hybrid avoids two failure modes: shipping only the fragile prose-matcher
forever (it would eventually miss something the way generic proximity
heuristics would have missed *this* bug, since 11.5 units is arguably past a
tight "near" threshold), and demanding a metadata migration across the whole
catalog before any protection exists at all (which delays the fix
indefinitely for a research-and-design-first codebase).

**Syntactic companion, not a substitute.** Separately from the semantic
tolerance check, a narrower author-time lint (ESLint custom rule or a short
Node AST walk) flagging any bare `[number, number]` literal in a
`pos`/`enter`/`puck`/`freeze`/`motions[].from|to|via` field that isn't the
direct return of `at(...)`/`mirrorX(at(...))` closes the *mechanical* hole —
it's what would nudge an author toward `at()` in the first place, the way
`stylelint-declaration-strict-value` bans raw CSS values property-by-property.
It cannot catch this specific bug on its own (no `at()` call was ever made
for it to inspect), which is why the semantic tolerance check above is the
primary mechanism and this is the secondary one — build the semantic
validator first, add the lint second.

---

## What this document does not do

This document does not fix `dzBreakoutEscapePressure.js`'s `[193, 54]`
coordinate, or any of the four wall-family drift instances found in the
audit. It does not build the validator, the `intendedAnchor` schema field,
or the companion lint rule described above. It does not touch any file under
`src/play/`. Those are three real, contained follow-on tasks this document
sets up but stops short of: (1) correct the confirmed coordinate drift(s),
(2) implement the anchor-fidelity validator and wire it into
`test:play-factory` (or a new `test:play-anchors` script), and (3) add
`intendedAnchor` metadata support to the play schema and
`validateFactoryStandards.js`. Each needs its own explicit go-ahead before
any code changes.
