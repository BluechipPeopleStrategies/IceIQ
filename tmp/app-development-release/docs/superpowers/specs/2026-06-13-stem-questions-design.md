# Stem + Questions (Phase 1) — Design

**Status:** design, ready for review · **Date:** 2026-06-13
**Origin:** Thomas wants to take one scenario/scene (and later an image) and build many
questions of different types off it — and, in Browse, expand a board to see and open all
the question types built on that same scene.

**Approved model:** a **stem** (the shared scene) with a set of **questions** referencing
it. **Phase 1 storage (approved):** each question stays its own seed file + a shared
`stemId`; no engine refactor. Phase 2 factors the scene into a stem file + adds images;
Phase 3 serves variants to players.

---

## 1. The idea

Today, **one scenario seed = one question** (one interaction, optionally an `mc` overlay).
We add an optional **`stemId`**: seeds that share a `stemId` are different questions on the
**same scene** (same `stage` + `actors`). Browse groups by `stemId` and lets you expand a
board to see every question built on that scene and open any of them.

"Build a lot of questions off one scene" = create more seeds with the same `stemId` (the
content factory can mass-generate them). Nothing about the existing single-question engine,
player, or validators changes — `stemId` is additive metadata.

## 2. Data model

```jsonc
{
  "id": "u13_oz_read_mc_v1",
  "stemId": "u13_oz_winger_wall_scene",   // NEW: scenes share this; questions reference it
  "stemLabel": "OZ — winger has it on the wall",  // NEW optional: human name for the scene
  "type": "scenario",
  "stage": { ... }, "actors": [ ... ],    // the SCENE (duplicated across siblings in Phase 1)
  "interaction": { ... }, "mc": { ... }, "correct": { ... }, "feedback": { ... }
}
```

- `stemId` (optional string): groups sibling questions. A seed with no `stemId` is its own
  singleton stem (today's behaviour, unchanged).
- `stemLabel` (optional string): a readable scene name shown as the group header. If absent,
  derive from the first sibling's node/level.
- The **question type** is *derived*, not stored — see the helper below.

No `validateScenario` change is required (optional fields are allowed). A later, optional
lint can warn if siblings sharing a `stemId` have divergent `stage`/`actors` (scene drift);
out of scope for Phase 1.

## 3. Derived question-type label — `questionTypeLabel(scenario)` (pure, browseCore.js)

One place that names a scenario's question type for display:

```js
export function questionTypeLabel(s) {
  if (s?.nodes && s?.entry) return "Branching";
  if (Array.isArray(s?.steps) && s.steps.length) return "Multi-step";
  if (s?.mc?.opts) return s.mc.opts.length === 2 ? "True/False" : "Multiple choice";
  const k = s?.interaction?.kind;
  return ({ place: "Positioning", point: "Tap a spot", selection: "Pick the player",
            sequence: "Order them", path: "Draw the play" })[k] || "Question";
}
```

(True/False falls out for free: an `mc` with exactly two options. Authoring a T/F question
is just a 2-option `mc` on the scene — no new interaction kind needed in Phase 1.)

## 4. Grouping — `groupByStem(scenarios)` (pure, browseCore.js)

```js
// → [{ stemId, label, scene, questions: [scenario...] }], stable order.
// Seeds with no stemId become singleton groups keyed by their own id.
export function groupByStem(scenarios) {
  const groups = new Map();
  for (const s of scenarios || []) {
    const key = s.stemId || s.id;
    if (!groups.has(key)) groups.set(key, { stemId: key, label: s.stemLabel || "", scene: s, questions: [] });
    groups.get(key).questions.push(s);
  }
  return [...groups.values()];
}

// Siblings of a scenario (other questions on its scene), excluding itself.
export function siblingsOf(scenario, scenarios) {
  if (!scenario?.stemId) return [];
  return (scenarios || []).filter(s => s.id !== scenario.id && s.stemId === scenario.stemId);
}
```

## 5. Browse UI — "Questions on this scene"

In `BrowseScreen`'s focused (opened-board) view, below the board editor, add an expandable
section listing the scene's questions:

- Header row (click to expand/collapse, caret glyph — colorblind-safe): **"Questions on
  this scene (N)"**. Hidden when N ≤ 1 (a lone question has no siblings to show).
- Expanded: one row per sibling — the **question-type label** (`questionTypeLabel`) + a short
  prompt/stem snippet — clickable to open that sibling (`setFocused(sibling)` + reset note).
- The currently-open question is marked in the list (caret/✓), not removed, so you can see
  the full set including where you are.

`BrowseScreen` already holds `list` (all scenarios), so siblings come from
`siblingsOf(focused, list)`. No server change.

Grid tile (optional, small): a stem with multiple questions shows a count chip ("◳ 3") on
the tile. Nice-to-have; include if cheap, else defer.

## 6. Authoring (Phase 1)

To build many questions on a scene: copy the scene (`stage` + `actors`) into new seeds with
the same `stemId`, varying the `interaction`/`mc`/`type`. A small helper
`scripts/new-question-on-stem.mjs <stemId> <type>` can scaffold one (optional; the factory
will eventually generate these in bulk). Not required for Phase 1 to ship the Browse view.

## 7. Phase 1 scope

1. `stemId` + `stemLabel` optional fields (convention only; no schema change).
2. `questionTypeLabel`, `groupByStem`, `siblingsOf` in `browseCore.js` (pure + tested).
3. `BrowseScreen` "Questions on this scene" expandable sibling list in the focused view.
4. A demo: give 2–3 existing seeds on the same scene a shared `stemId` so the grouping is
   visible (e.g. an MC + a true/false + a positioning question on one OZ scene).
5. Tests in `scripts/test-browse.mjs` for the new helpers.

## 8. Non-goals (later phases)

- A real stem **file** (scene defined once, no duplication) — Phase 2.
- **Images** as stems / non-scenario source data — Phase 2.
- A dedicated `true-false` interaction kind — Phase 1 uses a 2-option `mc`.
- Players receiving the variants / scheduling across types — Phase 3.
- Scene-drift validation across siblings — later, optional.

## 9. Testing

- `npm run test:browse` green (new helpers: label for each type, grouping, siblings).
- Build compiles; manual: open a stem board in `#browse`, expand "Questions on this scene,"
  click between the siblings, confirm each opens with its own board + type.
