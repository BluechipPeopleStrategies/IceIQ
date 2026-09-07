# Breakout Fixture Provenance (recorded 2026-07-29, Phase 0)

Per `docs/superpowers/plans/2026-07-29-scenario-engine-foundation-plan.md` Phase 0,
task 4: this record captures the defensive-zone breakout prototype's exact source
state *before* any scenario-engine implementation phase touches it. Every later
phase's "did we preserve the original prototype" check compares against this record,
not against memory or assumption.

**Base commit (HEAD at time of recording):** `a743700e1bb667c9cf4946b44a44149f12fd6fb5`

## Untracked files (new, not yet committed)

| Path | Git blob hash (`git hash-object`) |
|---|---|
| `src/play/plays/dzBreakoutEscapePressure.js` | `cd5f75f16f28bdff1dab2e344b52d5259190f6cf` |
| `docs/library/dz-breakout-retrieval-under-pressure.md` | `5f8c23ebaa0f79c64cd215cfc468b64545b17f13` |

## Modified files (diff against HEAD)

| Path | Diff hash (`git diff HEAD -- <path> \| git hash-object --stdin`) |
|---|---|
| `src/play/playCatalog.js` | `a60d5099de933c61c00ba5b7085bbf2ae5d99613` |
| `src/play/playFamilies.js` | `424216bf0d355c8a810c5c7692d29aad9ec79c4a` |

The wiring is minimal and exactly this: one import + one catalog-array entry in
`playCatalog.js`, and one new `dz_breakout` family entry + a concept-first
classifier branch in `playFamilies.js` (see full diff below). Nothing else changed
in either file.

### Full diff (`git diff HEAD -- src/play/playCatalog.js src/play/playFamilies.js`)

```diff
diff --git a/src/play/playCatalog.js b/src/play/playCatalog.js
index aafe859..fb4bf20 100644
--- a/src/play/playCatalog.js
+++ b/src/play/playCatalog.js
@@ -18,6 +18,7 @@ import { VERDICT_GAP_CONTROL_BACKING_IN } from "./plays/verdictGapControlBacking
 import { PREDICT_TWO_ON_ONE_DEFENDER_STEP } from "./plays/predictTwoOnOneDefenderStep.js";
 import { SPOT_MISTAKE_FLAT_SUPPORT } from "./plays/spotMistakeFlatSupport.js";
 import { SUPPORT_ANGLE_FLAT } from "./plays/supportAngleFlat.js";
+import { DZ_BREAKOUT_ESCAPE_PRESSURE } from "./plays/dzBreakoutEscapePressure.js";
 import { mirrorPlayY } from "./playVariants.js";
 
 export const CORE_ANIMATED_PLAYS = [
@@ -77,6 +78,8 @@ export const ALL_ANIMATED_PLAYS = [
   SPOT_MISTAKE_FLAT_SUPPORT,
 
   SUPPORT_ANGLE_FLAT,
+
+  DZ_BREAKOUT_ESCAPE_PRESSURE,
 ];
 
 export function playById(id) {
diff --git a/src/play/playFamilies.js b/src/play/playFamilies.js
index bd68539..a53928b 100644
--- a/src/play/playFamilies.js
+++ b/src/play/playFamilies.js
@@ -69,6 +69,19 @@ export const SCENARIO_FAMILIES = [
       "Give puck carrier a safe option"
     ]
   },
+  {
+    id: "dz_breakout",
+    title: "D-Zone Breakout",
+    description: "Retrieval and breakout reads where the player escapes pressure and moves the puck out of the defensive zone on purpose.",
+    targetVariants: 4,
+    matchTerms: ["dz-breakout", "dz_breakout", "breakout", "retrieval"],
+    teachingArc: [
+      "Escape away from the forechecker's committed side",
+      "Pressure-side outlet is a red herring → still escape first",
+      "Escape lane taken away → reverse or rim",
+      "Outlet covered → middle support or glass-and-out"
+    ]
+  },
   {
     id: "defensive_angling",
     title: "Defensive Angling",
@@ -98,6 +111,18 @@ function haystackForPlay(play) {
 }
 
 export function classifyPlayFamily(play) {
+  // Concept is the authored intent — match it first, so a play whose prose
+  // happens to mention another family's terms (a breakout play describing the
+  // "forechecker", say) still files where its author put it. The haystack scan
+  // stays as the fallback for plays without a matching concept.
+  const concept = String(play?.concept || "").toLowerCase();
+  if (concept) {
+    const byConcept = SCENARIO_FAMILIES.find((family) =>
+      family.matchTerms.some((term) => concept.includes(term.toLowerCase()))
+    );
+    if (byConcept) return byConcept;
+  }
+
   const haystack = haystackForPlay(play);
 
   return SCENARIO_FAMILIES.find((family) =>
```

## How to re-verify this record later

From the repo root, on the branch this was recorded on (`feature/shareable-beta`):

```sh
git hash-object src/play/plays/dzBreakoutEscapePressure.js
git hash-object docs/library/dz-breakout-retrieval-under-pressure.md
git diff HEAD -- src/play/playCatalog.js | git hash-object --stdin
git diff HEAD -- src/play/playFamilies.js | git hash-object --stdin
```

If any hash no longer matches the table above, something touched the breakout
fixture or its wiring after this record was made — check `git log` / `git diff`
for what changed before proceeding with Phase 5's adaptation step.
