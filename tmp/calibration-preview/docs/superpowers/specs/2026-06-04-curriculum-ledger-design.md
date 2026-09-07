# Curriculum Ledger — Design Spec

**Status:** approved 2026-06-04. Supersedes the prose `CURRICULUM_MAP.md` (v2) and the
machine-readable tables in `tools/lib/curriculum-classifier.mjs` as the single source of
truth for what RinkReads teaches, when, and from which development traditions.

**Relationship to the gauntlet:** this ledger is the artifact the gauntlet's G0 (3-agent
creator consensus) tags every question to — a question that is not bound to a ledger node
cannot advance. See `docs/factory/SPEC.md` §15 (gauntlet v2) and §16 (build decisions,
locked 2026-06-03): *"build the machine-readable curriculum ledger first; then the
generator reads from it and tags every question to it."* This spec is that first step.

---

## 1. Goal & non-goals

**Goal.** Produce one machine-readable curriculum ledger — `units × concepts × ages`,
rebuilt from a synthesis of global hockey development models — that the gauntlet generator
reads from and tags against, so "connected to the curriculum" is true by construction.

**In scope (this spec):**

- The ledger **schema** (`src/data/curriculum-ledger.json`).
- The **loader / validator** (`tools/lib/curriculum-ledger.mjs`) + a CI golden test.
- The **wipe** of the entire legacy/old question bank (blank-slate start).
- The **process** by which the rebuilt-from-scratch taxonomy gets populated (research →
  synthesize → review → lock).
- The app rendering an **empty bank** gracefully.

**Out of scope (each gets its own spec/plan):**

- The actual global-source research pass and the concrete concept list it produces.
- The gauntlet generator implementation that consumes the ledger.
- Migrating any legacy questions — there is no migration; the old bank is deleted.

---

## 2. Decisions locked in brainstorming (2026-06-04)

| Question | Decision |
|---|---|
| Taxonomy origin | **Rebuild from scratch** from global development models — do NOT carry forward the existing 28 concepts as-is. |
| The "unit" layer | **Thematic domains** (stable across all ages), stored under the key `domains`. The word "unit" is avoided because it implies a time-bounded teaching block, which this is not. |
| Lineage | A **tag**, not a structural layer — every concept references one or more `sourceModels`. |
| Age bands | **Keep the 6 bands U7–U18** — they are tied to the app's profile `level`s; changing them ripples through the whole app. |
| Old questions | **Wipe everything** — blank slate. The gauntlet becomes the only source of content. |
| Format | **JSON data + thin `.mjs` loader** (Approach A). Not a pure module; not a DB. |

---

## 3. Architecture

Two files, one responsibility each:

```
src/data/curriculum-ledger.json     # the data — the machine-readable ledger
tools/lib/curriculum-ledger.mjs     # the loader/validator + access helpers
```

`curriculum-classifier.mjs` is **retired** — its big back-mapping tables
(`CONCEPT_TAG_MAP`, `CAT_MAP`, `ARCHETYPE_MAP`) existed only to classify legacy questions
into concepts. With the legacy bank deleted, there is nothing to back-map; new questions
are born already carrying a `nodeId`. The constants worth keeping (`ANCHOR_CONCEPTS`,
`AGES`, `DEPTH_MATRIX`, `targetFor`) are re-expressed as ledger data + loader helpers.

**Consumers (all read the one source):**

- **Gauntlet generator** — picks a node, authors against it, tags the question with `nodeId`.
- **`tools/curriculum-audit.mjs`** — reports live coverage (questions per node) vs. `targetCount`.
- **App** — reads for display labels, filtering, and progress/mastery grouping.

---

## 4. Ledger schema (`curriculum-ledger.json`)

```jsonc
{
  "meta": {
    "version": "3.0.0",
    "locked": null,                 // ISO date set when the taxonomy is reviewed + frozen
    "ageBands": ["U7","U9","U11","U13","U15","U18"],
    "depthLegend": {
      "-": "not introduced (targets are 0)",
      "I": "introduced",
      "D": "developing",
      "M": "mastery emphasis",
      "R": "refinement"
    },
    "anchorMultiplier": 2           // anchor concepts get 2x targetCount
  },

  "sourceModels": [
    { "id": "hockey-canada",   "name": "Hockey Canada LTAD",        "tradition": "Canadian",      "contributes": "..." },
    { "id": "usa-adm",         "name": "USA Hockey ADM",            "tradition": "American",      "contributes": "station-based, age-appropriate cognitive load" },
    { "id": "tarasov-soviet",  "name": "Tarasov / Soviet school",   "tradition": "Soviet/Russian","contributes": "small-area games, skill density, creativity under pressure" },
    { "id": "swedish",         "name": "Swedish development model",  "tradition": "Swedish",       "contributes": "..." },
    { "id": "finnish",         "name": "Finnish development model",  "tradition": "Finnish",       "contributes": "..." },
    { "id": "czech",           "name": "Czech development model",    "tradition": "Czech",         "contributes": "..." },
    { "id": "pond-small-area", "name": "Pond / unsanctioned / SAG",  "tradition": "informal",      "contributes": "creativity, improvisation, puck touches" },
    { "id": "iihf",            "name": "IIHF Coach Development",      "tradition": "international",  "contributes": "tactical concepts at older bands" }
  ],

  "domains": [
    // the "unit" layer — thematic, stable across every age
    {
      "id": "hockey-sense",
      "name": "Hockey Sense",
      "definition": "Cognitive reads and decisions — the brand anchor.",
      "positions": ["skater"]       // or ["goalie"] or ["skater","goalie"]
    }
    // ... Skating, Puck Skills, Tactics, Compete, Goalie (final list from research)
  ],

  "concepts": [
    {
      "id": "reading-the-play",
      "name": "Reading the Play",
      "domainId": "hockey-sense",
      "definition": "Anticipating what is about to happen before it happens.",
      "readConnection": "Every rep asks: what is the read here?",   // brand hook
      "anchor": true,
      "positions": ["skater"],
      "lineage": [
        { "sourceModel": "tarasov-soviet", "note": "small-area games force constant reads" },
        { "sourceModel": "usa-adm",        "note": "age-laddered read complexity" }
      ]
    }
    // ... full concept list produced by the research pass
  ],

  "nodes": [
    // one per (age x concept) cell that is introduced (depth != "-").
    // This is the curriculum atom the gauntlet tags a question to.
    {
      "id": "u11.reading-the-play",
      "ageId": "U11",
      "conceptId": "reading-the-play",
      "depth": "D",
      "targetCount": 10,            // anchor (5) x anchorMultiplier (2)
      "difficultyMix": { "1": 0.3, "2": 0.5, "3": 0.2 },
      "approvedTypes": ["pov-mc", "scene-mc", "selection"]
    }
    // ...
  ]
}
```

**Node identity.** `nodeId = "{ageLower}.{conceptId}"`, e.g. `u11.reading-the-play`. Because
each concept belongs to exactly one domain, `(age, concept)` uniquely determines the node and
the domain is derived — this is the `(age, unit, concept)` triple G0 references.

**Multi-age tagging (primary + secondary).** A question often works across adjacent age
bands. Each question carries exactly one **primary** node via `nodeId` (the age it is
predominantly for, e.g. `u9.reading-the-play`) and lists every age band it should appear in
via the existing `levels[]` field, primary first — e.g.
`levels: ["U9 / Novice", "U7 / Initiation", "U11 / Atom"]`. `qbLoader` already surfaces a
question in every age in `levels[]`, so secondary ages need no new machinery; the secondary
ages are `levels[]` minus the primary. **Coverage counting:** `curriculum-audit` counts a
question only toward its **primary** node's target — secondary-age appearances add
availability but do not tick the secondary nodes' targets, so the generator keeps producing
age-tailored depth rather than leaning on overlap. (A little overlap between adjacent bands is
expected and fine.)

**Derived, not stored.** `domainId` lives on the concept, not repeated on every node.
`targetCount` may be stored explicitly OR computed by the loader from `depth` + `anchor`; the
loader is authoritative either way (see §5).

---

## 5. Loader / validator (`tools/lib/curriculum-ledger.mjs`)

Exports:

```
loadLedger()                 -> parsed + validated ledger object (throws on invalid)
getNode(ageId, conceptId)    -> node | null
nodeById(nodeId)             -> node | null
conceptsForAge(ageId)        -> concept[]  (depth != "-")
nodesForAge(ageId)           -> node[]
conceptById(conceptId)       -> concept | null
domainById(domainId)         -> domain | null
targetFor(node)              -> number   (depth target x anchor multiplier)
isAnchor(conceptId)          -> boolean
ALL_CONCEPTS, DOMAINS, AGE_BANDS, SOURCE_MODELS   // convenience exports
```

Depth → base target table lives in the loader (mirrors today's `DEPTH_TARGETS`:
`I:3, D:5, M:7, R:5, -:0`); `targetFor` applies `meta.anchorMultiplier` for anchor concepts.

**`validateLedger(ledger)`** returns `{ ok, errs, warns }` and is run as a **golden test**
in CI (alongside `tools/solver-golden.mjs`). Rules:

- Every `concept.domainId` resolves to a real domain.
- Every `concept` has **≥1 `lineage` entry**, and each `lineage.sourceModel` resolves.
- Every `node.ageId` is in `meta.ageBands`; every `node.conceptId` resolves.
- Every `node.depth` is a legend key; `targetCount` (if stored) matches the computed target.
- `node.id` matches `{ageLower}.{conceptId}` and is unique.
- `approvedTypes[]` are from the known type set.
- Anchor concepts are flagged and double-weighted.

If the golden test regresses, CI fails — the curriculum spine is wrong and the gauntlet
should not run against it.

---

## 6. The wipe (blank-slate start)

Delete (the gauntlet becomes the only content source):

- `src/data/questions.legacy.json`
- `src/data/questions.legacy-candidates.json`
- `src/data/questions.json`           (active base bank, ~95)
- `src/scenario/seeds/*`              (all seeds)
- `src/data/factoryQuestions.json`

**`qbLoader.js` consequences:** `loadQB()` composes from these three sources; with all
empty/absent it must return an empty bank without throwing. Bump the cache version
(`rinkreads_qb_cache_v26` → next) so stale composed banks are not served.

**Empty-bank UX:** the quiz/session entry points must detect a zero-length bank (globally or
for the selected age/position) and render a friendly **"new content coming"** state rather
than crashing or showing a broken session. This is a required part of the wipe, not a
follow-up.

---

## 7. Population process (rebuild-from-scratch)

The schema is fixed by this spec; the taxonomy content is produced afterward:

1. **Research** — a focused pass per source tradition (via the `deep-research` skill):
   ADM, Hockey Canada, Tarasov/Soviet, Swedish, Finnish, Czech, pond/small-area, IIHF.
   Each pass yields: the concepts that tradition emphasizes and what it uniquely contributes.
2. **Synthesize** — collapse into `domains` → `concepts` (with `lineage[]` + `readConnection`),
   keeping RinkReads's anchor discipline (Reading the Play / Decision Making weighted ×2).
3. **Build the matrix** — assign each concept a depth (I/D/M/R/—) across the 6 ages → `nodes`.
4. **Review** — coach/human review of the taxonomy (the user defers to coaching authorities
   on hockey content; structure is ours).
5. **Lock** — set `meta.locked`, run the golden test green, then the gauntlet may generate.

Go-live policy (from `docs/factory/SPEC.md` §16): approve-a-batch first, flip to true
auto-post once the queue is consistently clean.

---

## 8. Open questions / risks

- **Domain list is not finalized** — it falls out of step 2 (synthesis). Likely ≈6 domains
  (Skating, Puck Skills, Hockey Sense, Tactics, Compete, Goalie) but the research may split
  or merge; the schema does not hard-code a count.
- **Empty live app** — between the wipe and the first gauntlet batch, the app has zero
  questions. Acceptable per the blank-slate decision; the "new content coming" state covers it.
- **Two docs could still drift** — `CURRICULUM_MAP.md` should be marked superseded (point to
  the ledger) so it is not mistaken for source of truth.

---

## 9. Deliverables checklist

- [ ] `src/data/curriculum-ledger.json` — schema + (later) populated taxonomy.
- [ ] `tools/lib/curriculum-ledger.mjs` — loader, helpers, `validateLedger`.
- [ ] Golden test wired into CI; passes on the populated ledger.
- [ ] Wipe executed; `qbLoader.js` handles empty bank; cache version bumped.
- [ ] Empty-bank "new content coming" UX.
- [ ] `curriculum-audit.mjs` updated to read the ledger.
- [ ] `CURRICULUM_MAP.md` marked superseded; `curriculum-classifier.mjs` retired.
