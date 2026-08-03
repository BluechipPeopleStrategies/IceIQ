# Coach Authoring & Video Export (Phase 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the protected coach MVP: a coach places players/puck, draws routes,
sets timing/freeze/declared-read, previews through the shared clock, finalizes
(compiles through the physics/decision pipeline), and exports one protected
watermarked-or-clean MP4 — without ever hand-editing JSON.

**Architecture:** The editor writes a `ScenarioDefinition` (`proofMode:
"coach-declared"`) directly into a new Supabase-backed `coach_play_drafts` table,
RLS-gated by existing `teams.coach_id` ownership plus an MVP allowlist. Preview
always renders through a new `DraftTeachingPlay` artifact (works even on a
physics-failed or disagreeing draft) via the existing shared `playbackClock.js`.
Finalize attempts the existing `compileTeachingPlay()`; success caches a real
`CompiledTeachingPlay` on the row. Export is an isolated Node/Remotion worker,
invoked out-of-band, that renders from whichever artifact type the caller has
(diagnostic = `DraftTeachingPlay`, watermarked; clean = cached
`CompiledTeachingPlay`, unwatermarked) to a private, signed, team-only MP4.

**Tech Stack:** React 18 (existing app), Supabase (Postgres + RLS + Storage),
Node ESM (`"type": "module"`), `@remotion/renderer`/`@remotion/cli` (React 19,
isolated package, never shares a runtime with the main app), the existing
hand-rolled `ok()` test-runner convention for `src/scenario-engine/*.test.mjs`.

## Global Constraints

- Free-only: no paid API calls anywhere in this feature (Decision 1). Nothing here
  calls Claude or any paid provider — export rendering and DB writes are the only
  moving parts, and both are local/Supabase.
- No `git push`, no PR, no merge to `master`/`main`, no deploy (standing overnight-
  build guardrail, still in force). Work stays on `feature/shareable-beta` or a
  local branch off it; commit after every task, never push without being asked.
- Never weaken, skip, or delete an existing test or gate to make something pass.
- A declared answer is never treated as validated truth — `compileTeachingPlay()`'s
  refusal to compile a non-AGREE/non-physicsClean read is never bypassed or patched
  around; failed drafts get `DraftTeachingPlay` instead, they never get a forced
  `CompiledTeachingPlay`.
- Coach-authored content never reaches `playCatalog.js`/`bank.json` or the
  promotion pipeline in this phase — private-per-team only.
- `src/scenario-engine/*.test.mjs` files use the existing hand-rolled `ok(name,
  condition)` runner (no framework), are directly executable
  (`#!/usr/bin/env node`), and must be manually appended to the `test:scenario-
  engine` chain in `package.json` to run under CI/local `npm run test:scenario-
  engine`.
- No React component test framework exists in this codebase (`@testing-library`
  is not a dependency) — UI tasks are verified by manual exercise in the dev
  server, matching how `assignments.jsx`/`teamChallenges.jsx` are verified today,
  not by writing a new test framework into the project.

Design reference for every decision below: `docs/superpowers/specs/2026-07-31-
coach-authoring-video-export-design.md` (sections cited inline as `§N`).

---

## Task 1: `hardFailuresOf()` helper + `deriveEventTimes()` extraction

**Files:**
- Modify: `src/scenario-engine/physics/findings.js`
- Modify: `src/scenario-engine/compiledTeachingPlay.js:48-54`
- Modify: `src/scenario-engine/compiledTeachingPlay.test.mjs` (add cases)
- Modify: `src/scenario-engine/findings.test.mjs` if it exists, else create
  `src/scenario-engine/physics/findings.test.mjs`
- Modify: `package.json` (`test:scenario-engine` script — append new test file)

**Interfaces:**
- Produces: `hardFailuresOf(findings)` exported from `physics/findings.js` —
  `(findings: Finding[]) => Finding[]`, the exact filter simulator.js already
  inlines at line 191 (`findings.filter((f) => !isUnsupportedModel(f) && f.severity
  === SEVERITY.HARD_FAILURE)`), factored out so it isn't duplicated by Task 2.
- Produces: `deriveEventTimes(definition)` exported from
  `compiledTeachingPlay.js` — `(definition: ScenarioDefinition) => number[]`,
  the exact logic currently inlined at lines 48-54.
- Consumes: nothing new — this task only extracts existing inline logic.

- [ ] **Step 1: Check for an existing findings test file**

Run: `ls src/scenario-engine/physics/findings.test.mjs 2>/dev/null || echo "none"`

If it exists, add cases to it. If not, create it fresh in Step 2 below with the
existing test-file header convention (see `rinkFrame.test.mjs` for the exact
shape: shebang, `Run:` comment, local `ok()` helper, `console.log` summary,
`process.exit(fail ? 1 : 0)`).

- [ ] **Step 2: Write the failing test for `hardFailuresOf`**

Add to `src/scenario-engine/physics/findings.test.mjs`:

```js
#!/usr/bin/env node
// Run: node src/scenario-engine/physics/findings.test.mjs
import { buildFinding, buildUnsupportedModel, hardFailuresOf, SEVERITY, ANSWER_IMPACT } from "./findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const hardFail = buildFinding({
  validatorCode: "test.hard", validatorVersion: "v1", eventTime: 1,
  measuredValue: 10, threshold: 5, units: "m/s", profileId: "p", profileVersion: "v1",
  solverVersion: "v1", severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
  explanation: "too fast",
});
const warning = buildFinding({
  validatorCode: "test.warn", validatorVersion: "v1", eventTime: 1,
  measuredValue: 6, threshold: 5, units: "m/s", profileId: "p", profileVersion: "v1",
  solverVersion: "v1", severity: SEVERITY.WARNING, answerImpact: ANSWER_IMPACT.NONE,
  explanation: "borderline",
});
const unsupported = buildUnsupportedModel({
  validatorCode: "test.unsupported", validatorVersion: "v1", eventTime: 1, reason: "not modeled",
});

const result = hardFailuresOf([hardFail, warning, unsupported]);
ok("returns only the hard-failure finding", result.length === 1 && result[0] === hardFail);
ok("excludes warnings", !result.includes(warning));
ok("excludes unsupported-model entries", !result.includes(unsupported));
ok("empty input returns empty array", hardFailuresOf([]).length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 3: Run it, confirm it fails**

Run: `node src/scenario-engine/physics/findings.test.mjs`
Expected: `FAIL` — `hardFailuresOf` is not exported yet (import error or
`hardFailuresOf is not a function`).

- [ ] **Step 4: Implement `hardFailuresOf` in `findings.js`**

Add to `src/scenario-engine/physics/findings.js`, after `isUnsupportedModel`:

```js
export function hardFailuresOf(findings) {
  return findings.filter((f) => !isUnsupportedModel(f) && f.severity === SEVERITY.HARD_FAILURE);
}
```

Then update `src/scenario-engine/physics/simulator.js:191` to use it instead of
the inline filter:

```js
const hardFailures = hardFailuresOf(findings);
```

Add `hardFailuresOf` to the existing `import { isUnsupportedModel, SEVERITY }
from "./findings.js";` line at `simulator.js:18`.

- [ ] **Step 5: Run the new test and the existing simulator test, confirm both pass**

Run: `node src/scenario-engine/physics/findings.test.mjs && node src/scenario-engine/physics/simulator.test.mjs`
Expected: both `PASS`, `0 failed`.

- [ ] **Step 6: Write the failing test for `deriveEventTimes`**

Add to `src/scenario-engine/compiledTeachingPlay.test.mjs` (append; do not remove
existing cases):

```js
import { deriveEventTimes } from "./compiledTeachingPlay.js"; // add to existing import line

{
  const def = {
    intendedActions: [{ startTime: 0.5, endTime: 1.2 }, { startTime: 1.2, endTime: 2 }],
    decisionFreeze: { time: 0.8 },
  };
  const times = deriveEventTimes(def);
  ok("deriveEventTimes includes 0", times.includes(0));
  ok("deriveEventTimes includes every action start/end", [0.5, 1.2, 2].every((t) => times.includes(t)));
  ok("deriveEventTimes includes decisionFreeze.time", times.includes(0.8));
  ok("deriveEventTimes is sorted ascending", times.every((t, i) => i === 0 || times[i - 1] <= t));
  ok("deriveEventTimes de-duplicates repeated times", times.filter((t) => t === 1.2).length === 1);
}
{
  const def = { intendedActions: [], decisionFreeze: {} };
  const times = deriveEventTimes(def);
  ok("deriveEventTimes with no decisionFreeze.time still returns [0]", times.length === 1 && times[0] === 0);
}
```

- [ ] **Step 7: Run it, confirm it fails**

Run: `node src/scenario-engine/compiledTeachingPlay.test.mjs`
Expected: `FAIL` — `deriveEventTimes` is not exported.

- [ ] **Step 8: Extract `deriveEventTimes` in `compiledTeachingPlay.js`**

Replace lines 48-54 of `src/scenario-engine/compiledTeachingPlay.js`:

```js
export function deriveEventTimes(definition) {
  const eventTimesSet = new Set([0]);
  for (const action of definition.intendedActions) {
    eventTimesSet.add(action.startTime);
    if (action.endTime !== undefined) eventTimesSet.add(action.endTime);
  }
  if (Number.isFinite(definition.decisionFreeze?.time)) eventTimesSet.add(definition.decisionFreeze.time);
  return [...eventTimesSet].sort((a, b) => a - b);
}
```

Then in `compileTeachingPlay()`, replace the inlined block with:

```js
const eventTimes = deriveEventTimes(definition);
```

- [ ] **Step 9: Run all scenario-engine tests, confirm everything still passes**

Run: `npm run test:scenario-engine`
Expected: every listed test file prints `PASS` lines and exits 0. This confirms
the extraction didn't change `compileTeachingPlay()`'s existing behavior.

- [ ] **Step 10: Add the new findings test to the npm script chain**

Edit `package.json`'s `test:scenario-engine` script: insert `node
src/scenario-engine/physics/findings.test.mjs &&` into the existing `&&` chain,
alongside the other `physics/*.test.mjs` entries (match the existing chain's
ordering convention — physics tests grouped together).

- [ ] **Step 11: Run the full chain once more to confirm the script edit is correct**

Run: `npm run test:scenario-engine`
Expected: all tests pass, including the newly-added findings test.

- [ ] **Step 12: Commit**

```bash
git add src/scenario-engine/physics/findings.js src/scenario-engine/physics/findings.test.mjs \
  src/scenario-engine/physics/simulator.js src/scenario-engine/compiledTeachingPlay.js \
  src/scenario-engine/compiledTeachingPlay.test.mjs package.json
git commit -m "refactor(scenario-engine): extract hardFailuresOf and deriveEventTimes helpers"
```

---

## Task 2: `DraftTeachingPlay` artifact

**Files:**
- Create: `src/scenario-engine/draftTeachingPlay.js`
- Create: `src/scenario-engine/draftTeachingPlay.test.mjs`
- Modify: `package.json` (`test:scenario-engine` — append)

**Interfaces:**
- Consumes: `compareDeclaredToDerived(declaredCandidateId, evaluation)` and
  `AGREEMENT` from `decisionEvaluation.js`; `hardFailuresOf(findings)` from
  `physics/findings.js` (Task 1); `deriveEventTimes(definition)` from
  `compiledTeachingPlay.js` (Task 1).
- Produces: `buildDraftTeachingPlay(definition, trace, evaluation,
  declaredCandidateId)` — returns a frozen object: `{schemaVersion, id, version,
  samples, eventTimes, questionFreezeTime, observableCues, declaredRead,
  physicsClean, comparison, failedChecks}`. `failedChecks: string[]`. Consumed by
  Task 5 (editor preview) and Task 7 (finalize-failure UI) and Task 8 (diagnostic
  export).
- Produces: `DRAFT_TEACHING_PLAY_SCHEMA_VERSION = "draft-teaching-play-v1"`.

- [ ] **Step 1: Write the failing test**

Create `src/scenario-engine/draftTeachingPlay.test.mjs`:

```js
#!/usr/bin/env node
// Run: node src/scenario-engine/draftTeachingPlay.test.mjs
import { buildDraftTeachingPlay, DRAFT_TEACHING_PLAY_SCHEMA_VERSION } from "./draftTeachingPlay.js";
import { AGREEMENT, EVALUATION_STATUS } from "./decisionEvaluation.js";
import { buildFinding, SEVERITY, ANSWER_IMPACT } from "./physics/findings.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const definition = {
  intendedActions: [{ startTime: 0, endTime: 1 }],
  decisionFreeze: { time: 0.5, observableCues: ["puck carrier's shoulders"] },
  declaredRead: { actorId: "a1", description: "pass to the weak side" },
};

const cleanTrace = { physicsClean: true, samples: [{ t: 0, pos: [0, 0], actorId: "a1" }], findings: [] };
const cleanEvaluation = {
  schemaVersion: "decision-evaluation-v1", status: EVALUATION_STATUS.RESOLVED,
  derivedRead: "a1", viableCandidateIds: ["a1"],
  proofChain: [{ candidateId: "a1", physicsClean: true, hardFailures: [] }],
  consultedClaimId: null, reason: "sole clean candidate",
};

{
  const draft = buildDraftTeachingPlay(definition, cleanTrace, cleanEvaluation, "a1");
  ok("schemaVersion is draft-teaching-play-v1", draft.schemaVersion === DRAFT_TEACHING_PLAY_SCHEMA_VERSION);
  ok("carries samples through verbatim", draft.samples === cleanTrace.samples);
  ok("eventTimes includes 0, 1, and 0.5", [0, 1, 0.5].every((t) => draft.eventTimes.includes(t)));
  ok("questionFreezeTime matches decisionFreeze.time", draft.questionFreezeTime === 0.5);
  ok("observableCues carried through", draft.observableCues === definition.decisionFreeze.observableCues);
  ok("physicsClean true for a clean trace", draft.physicsClean === true);
  ok("comparison.agreement is AGREE for a matching declared/derived read", draft.comparison.agreement === AGREEMENT.AGREE);
  ok("failedChecks is empty for a clean, agreeing draft", draft.failedChecks.length === 0);
  ok("draft is frozen", Object.isFrozen(draft));
}

const hardFail = buildFinding({
  validatorCode: "test.speed", validatorVersion: "v1", eventTime: 0.5,
  measuredValue: 20, threshold: 10, units: "m/s", profileId: "p", profileVersion: "v1",
  solverVersion: "v1", severity: SEVERITY.HARD_FAILURE, answerImpact: ANSWER_IMPACT.CHANGES_ANSWER,
  explanation: "actor a1 exceeds max skating speed",
});
const dirtyTrace = { physicsClean: false, samples: [], findings: [hardFail] };
const dirtyEvaluation = {
  schemaVersion: "decision-evaluation-v1", status: EVALUATION_STATUS.RESOLVED,
  derivedRead: "a2", viableCandidateIds: ["a2"],
  proofChain: [
    { candidateId: "a1", physicsClean: false, hardFailures: [hardFail] },
    { candidateId: "a2", physicsClean: true, hardFailures: [] },
  ],
  consultedClaimId: null, reason: "a1 disproven by physics",
};

{
  const draft = buildDraftTeachingPlay(definition, dirtyTrace, dirtyEvaluation, "a1");
  ok("physicsClean false for a dirty trace", draft.physicsClean === false);
  ok("comparison.agreement is DISAGREE when declared read is disproven", draft.comparison.agreement === AGREEMENT.DISAGREE);
  ok("failedChecks includes the hard-failure explanation", draft.failedChecks.includes(hardFail.explanation));
  ok("failedChecks includes the disagreement explanation", draft.failedChecks.some((c) => c.includes("disproven")));
  ok("failedChecks has exactly 2 entries (1 physics + 1 disagreement)", draft.failedChecks.length === 2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `node src/scenario-engine/draftTeachingPlay.test.mjs`
Expected: `FAIL` — cannot find module `./draftTeachingPlay.js`.

- [ ] **Step 3: Implement `draftTeachingPlay.js`**

Create `src/scenario-engine/draftTeachingPlay.js`:

```js
// DraftTeachingPlay: a preview/diagnostic-export artifact for coach-authored
// drafts that have NOT cleared compileTeachingPlay()'s AGREE/physicsClean gate
// (or haven't been finalized yet at all). Unlike CompiledTeachingPlay, this
// type carries no proof of correctness -- it exists so a coach can see their
// own work-in-progress, including a physics-failed or disagreeing draft,
// without that draft ever masquerading as validated. Never enters the
// catalog/promotion pipeline; never substitutes for CompiledTeachingPlay.
// Per docs/superpowers/specs/2026-07-31-coach-authoring-video-export-design.md §6.

import { compareDeclaredToDerived, AGREEMENT } from "./decisionEvaluation.js";
import { deriveEventTimes } from "./compiledTeachingPlay.js";
import { hardFailuresOf } from "./physics/findings.js";

export const DRAFT_TEACHING_PLAY_SCHEMA_VERSION = "draft-teaching-play-v1";

export function buildDraftTeachingPlay(definition, trace, evaluation, declaredCandidateId) {
  const comparison = compareDeclaredToDerived(declaredCandidateId, evaluation);

  const failedChecks = [
    ...hardFailuresOf(trace.findings).map((f) => f.explanation),
    ...(comparison.agreement === AGREEMENT.AGREE ? [] : [comparison.explanation]),
  ];

  return Object.freeze({
    schemaVersion: DRAFT_TEACHING_PLAY_SCHEMA_VERSION,
    id: definition.id,
    version: definition.version,
    samples: trace.samples,
    eventTimes: deriveEventTimes(definition),
    questionFreezeTime: definition.decisionFreeze.time,
    observableCues: definition.decisionFreeze.observableCues,
    declaredRead: definition.declaredRead,
    physicsClean: trace.physicsClean,
    comparison,
    failedChecks,
  });
}
```

- [ ] **Step 4: Run the test, confirm it passes**

Run: `node src/scenario-engine/draftTeachingPlay.test.mjs`
Expected: all `PASS`, `0 failed`.

- [ ] **Step 5: Add to the npm test chain**

Edit `package.json`'s `test:scenario-engine` script: append `&& node
src/scenario-engine/draftTeachingPlay.test.mjs` (place it near
`compiledTeachingPlay.test.mjs` in the chain for locality).

- [ ] **Step 6: Run the full chain**

Run: `npm run test:scenario-engine`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/scenario-engine/draftTeachingPlay.js src/scenario-engine/draftTeachingPlay.test.mjs package.json
git commit -m "feat(scenario-engine): add DraftTeachingPlay artifact for unproven coach drafts"
```

---

## Task 3: Supabase migration — `coach_play_drafts` table, RLS, allowlist, immutability trigger

**Files:**
- Create: `supabase/migration_0020_coach_play_drafts.sql`

**Interfaces:**
- Produces: table `public.coach_play_drafts` — columns `id, team_id, coach_id,
  scenario_definition, revision, status, compiled_artifact, export_url,
  export_expires_at, finalized_at, created_at, updated_at`. Consumed by Task 4's
  data-access functions.
- Produces: table `public.coach_play_drafts_allowlist` — column `coach_id`.
  Consumed by the RLS policy in this same task.

- [ ] **Step 1: Write the migration file**

Create `supabase/migration_0020_coach_play_drafts.sql`:

```sql
-- Coach play authoring: drafts a coach builds in the schematic editor, per
-- docs/superpowers/specs/2026-07-31-coach-authoring-video-export-design.md.
-- MVP-gated behind coach_play_drafts_allowlist until the feature graduates
-- past initial rollout (framework-fit decision 4).

create table public.coach_play_drafts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  scenario_definition jsonb not null,
  revision integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  compiled_artifact jsonb,
  export_url text,
  export_expires_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_coach_play_drafts_team on public.coach_play_drafts(team_id);
create index idx_coach_play_drafts_coach on public.coach_play_drafts(coach_id);

-- Belt-and-suspenders immutability: RLS alone can't cleanly express "no
-- updates once a specific column value is reached," so a trigger backs it up.
create or replace function public.reject_update_of_finalized_draft()
returns trigger as $$
begin
  if old.status = 'finalized' then
    raise exception 'coach_play_drafts: row % is finalized and immutable', old.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_coach_play_drafts_immutable
  before update on public.coach_play_drafts
  for each row execute function public.reject_update_of_finalized_draft();

create table public.coach_play_drafts_allowlist (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.coach_play_drafts enable row level security;
alter table public.coach_play_drafts_allowlist enable row level security;

create policy "coach manages own team drafts" on public.coach_play_drafts
  for all using (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  )
  with check (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

-- Allowlist itself is owner-managed only; no self-service. No policy is
-- created here that lets a coach add themselves -- rows are inserted
-- out-of-band (Supabase SQL editor) by Thomas during MVP rollout.
create policy "no client access to allowlist" on public.coach_play_drafts_allowlist
  for all using (false) with check (false);
```

- [ ] **Step 2: Manually verify the migration applies cleanly**

This repo has no automated migration runner (confirmed: no `supabase/config.toml`,
no `db:push`/`migrate` npm script). Apply manually: paste the file's contents into
the Supabase project's SQL editor (same process used for every prior
`migration_00XX_*.sql` in this repo) and run it against a dev/staging Supabase
project, not production, first.
Expected: no errors; `coach_play_drafts`, `coach_play_drafts_allowlist` appear in
the table list; both have RLS enabled (visible in the Supabase dashboard's Auth
> Policies view).

- [ ] **Step 3: Manually verify RLS behavior**

In the Supabase SQL editor, as a test: insert a row into
`coach_play_drafts_allowlist` for a real test coach's `auth.uid()`, then (using
that user's session, e.g. via the app or `supabase.auth.signInWithPassword` in a
scratch script) attempt an insert into `coach_play_drafts` for a team that coach
does NOT own. Expected: insert rejected by RLS. Then attempt the same insert for
a team they DO own. Expected: insert succeeds.
Expected: both behaviors confirmed before moving on — this is the one place a
silent RLS misconfiguration would be invisible until much later.

- [ ] **Step 4: Commit**

```bash
git add supabase/migration_0020_coach_play_drafts.sql
git commit -m "feat(supabase): add coach_play_drafts table, RLS, and MVP allowlist"
```

---

## Task 4: Data-access functions in `src/supabase.js`

**Files:**
- Modify: `src/supabase.js` (append new functions, following the existing
  `assignments`-style function-per-operation convention)

**Interfaces:**
- Consumes: `supabase` client already exported from this file.
- Produces (all `async`, all thin wrappers around `supabase.from("coach_play_drafts")`):
  - `createCoachPlayDraft(coachId, teamId, scenarioDefinition)` → inserted row
  - `getCoachPlayDraftsForTeam(teamId)` → array of rows
  - `getCoachPlayDraft(draftId)` → single row or null
  - `updateCoachPlayDraft(draftId, expectedRevision, scenarioDefinition)` → updated
    row, or throws a `RevisionConflictError` if `expectedRevision` doesn't match
    the current stored `revision`
  - `finalizeCoachPlayDraft(draftId, compiledArtifact)` → updated row with
    `status: 'finalized'`, `compiled_artifact` set, `finalized_at` set
  - `deleteCoachPlayDraft(draftId)` → void
  Consumed by Task 5 (editor UI) and Task 7 (finalize flow).

- [ ] **Step 1: Add the functions**

Append to `src/supabase.js` (after the existing assignment functions, matching
their style — thin async wrappers, no framework):

```js
export class RevisionConflictError extends Error {
  constructor(draftId) {
    super(`coach_play_drafts: revision conflict on draft ${draftId} -- reload before retrying`);
    this.name = "RevisionConflictError";
    this.draftId = draftId;
  }
}

export async function createCoachPlayDraft(coachId, teamId, scenarioDefinition) {
  const { data, error } = await supabase
    .from("coach_play_drafts")
    .insert({ coach_id: coachId, team_id: teamId, scenario_definition: scenarioDefinition })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCoachPlayDraftsForTeam(teamId) {
  const { data, error } = await supabase
    .from("coach_play_drafts")
    .select("*")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCoachPlayDraft(draftId) {
  const { data, error } = await supabase
    .from("coach_play_drafts")
    .select("*")
    .eq("id", draftId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCoachPlayDraft(draftId, expectedRevision, scenarioDefinition) {
  const { data, error } = await supabase
    .from("coach_play_drafts")
    .update({
      scenario_definition: scenarioDefinition,
      revision: expectedRevision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("revision", expectedRevision)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new RevisionConflictError(draftId);
  return data;
}

export async function finalizeCoachPlayDraft(draftId, compiledArtifact) {
  const { data, error } = await supabase
    .from("coach_play_drafts")
    .update({
      status: "finalized",
      compiled_artifact: compiledArtifact,
      finalized_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("status", "draft")
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`finalizeCoachPlayDraft: draft ${draftId} was not in 'draft' status`);
  return data;
}

export async function deleteCoachPlayDraft(draftId) {
  const { error } = await supabase.from("coach_play_drafts").delete().eq("id", draftId);
  if (error) throw error;
}
```

- [ ] **Step 2: Manually verify against the applied migration**

Since this codebase has no Supabase-backed test harness for `src/supabase.js`
(confirmed: `assignments.jsx`'s equivalent functions are untested the same way),
verify manually: run the dev server (`npm run dev`), open a browser console with
an authenticated allowlisted coach session, and call `createCoachPlayDraft`,
`getCoachPlayDraftsForTeam`, `updateCoachPlayDraft` (once with the correct
revision, once with a stale one to confirm `RevisionConflictError` throws) via
the console against the real dev Supabase project from Task 3.
Expected: create/read/update-with-correct-revision succeed; update-with-stale-
revision throws `RevisionConflictError`; a non-allowlisted or non-owning coach's
attempt is rejected by RLS (surfaces as a Postgres error from `error` above).

- [ ] **Step 3: Commit**

```bash
git add src/supabase.js
git commit -m "feat(supabase): add coach_play_drafts data-access functions"
```

---

## Task 5: `CoachPlayAuthoringSection` — draft list + create + schematic editor (place/route/freeze/declare)

**Files:**
- Create: `src/coachPlayAuthoring.jsx`

**Interfaces:**
- Consumes: `createCoachPlayDraft`, `getCoachPlayDraftsForTeam`,
  `getCoachPlayDraft`, `updateCoachPlayDraft`, `deleteCoachPlayDraft` (Task 4);
  `Card`, `Label`, `C`, `FONT` shared UI primitives from `./shared.jsx` (same
  imports `assignments.jsx` uses); `NHL_200X85_PROFILE`, `isWithinBounds` from
  `./scenario-engine/rinkFrame.js`.
- Produces: `export function CoachPlayAuthoringSection({teamId, coachId,
  roster})` — mounted by Task 9.

This task is the largest single UI surface in the plan. Scope it to exactly
decision 2 and design §2's MVP list — place actors/puck, draw straight-segment
routes, set freeze time + observable cues, name options, mark the declared
answer, save/reload as a draft. No freehand curves, no multi-team, no
collaboration (explicitly out of scope, design §"Explicitly out of scope").

- [ ] **Step 1: Scaffold the component shell and draft list (mirrors `CoachAssignmentsSection`'s fetch-on-mount + list pattern)**

Create `src/coachPlayAuthoring.jsx`:

```jsx
// CoachPlayAuthoringSection: inside expanded team on CoachHome. Coach places
// players/puck, draws routes, sets the decision freeze, and declares a read --
// producing a ScenarioDefinition (proofMode: "coach-declared") saved to
// coach_play_drafts. See docs/superpowers/specs/2026-07-31-coach-authoring-
// video-export-design.md for the full design.
import { useEffect, useState } from "react";
import { Card, Label, C, FONT } from "./shared.jsx";
import {
  createCoachPlayDraft, getCoachPlayDraftsForTeam, getCoachPlayDraft,
  updateCoachPlayDraft, deleteCoachPlayDraft, RevisionConflictError,
} from "./supabase.js";
import { NHL_200X85_PROFILE, isWithinBounds } from "./scenario-engine/rinkFrame.js";
import { PlayEditorCanvas } from "./coachPlayEditorCanvas.jsx";

export function CoachPlayAuthoringSection({ teamId, coachId, roster }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDraftId, setActiveDraftId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCoachPlayDraftsForTeam(teamId)
      .then((rows) => { if (!cancelled) setDrafts(rows); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  async function handleCreate() {
    try {
      const row = await createCoachPlayDraft(coachId, teamId, blankScenarioDefinition());
      setDrafts((d) => [row, ...d]);
      setActiveDraftId(row.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(draftId) {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    try {
      await deleteCoachPlayDraft(draftId);
      setDrafts((d) => d.filter((x) => x.id !== draftId));
      if (activeDraftId === draftId) setActiveDraftId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  if (activeDraftId) {
    return (
      <PlayEditorCanvas
        draftId={activeDraftId}
        teamId={teamId}
        coachId={coachId}
        onClose={() => setActiveDraftId(null)}
        onSaved={(row) => setDrafts((d) => d.map((x) => (x.id === row.id ? row : x)))}
      />
    );
  }

  return (
    <Card>
      <Label>🎬 Plays</Label>
      {error && <div style={{ color: C.danger, fontSize: FONT.small }}>{error}</div>}
      {loading ? (
        <div>Loading drafts...</div>
      ) : (
        <>
          <button onClick={handleCreate}>+ New play</button>
          <ul>
            {drafts.map((d) => (
              <li key={d.id}>
                <span>{d.status === "finalized" ? "✅" : "✏️"} {d.scenario_definition?.declaredRead?.description || "Untitled play"}</span>
                <button onClick={() => setActiveDraftId(d.id)}>Open</button>
                {d.status === "draft" && <button onClick={() => handleDelete(d.id)}>Delete</button>}
              </li>
            ))}
          </ul>
          {drafts.length === 0 && <div>No plays yet -- start one above.</div>}
        </>
      )}
    </Card>
  );
}

function blankScenarioDefinition() {
  return {
    schemaVersion: "scenario-definition-v1",
    id: crypto.randomUUID(),
    version: 1,
    contentHash: null,
    family: "coach-authored",
    tacticalClaimVersion: null,
    proofMode: "coach-declared",
    ageSkillProfile: "unspecified",
    sources: ["coach-authored"],
    rinkProfileId: NHL_200X85_PROFILE.id,
    initialState: { actors: [], puck: null },
    intendedActions: [],
    decisionFreeze: { time: 0, observableCues: [] },
    declaredRead: null,
    questionKindVariants: [],
    generationParams: {},
  };
}
```

- [ ] **Step 2: Manually verify list/create/delete against the applied migration and data functions**

Run: `npm run dev`, sign in as an allowlisted test coach, expand their team card.
Expected: `🎬 Plays` section renders (once mounted -- Task 9), empty state shows,
"+ New play" creates a row visible in the Supabase dashboard's table editor with
`proofMode: "coach-declared"` and `status: "draft"`, delete removes it and the
list updates.

- [ ] **Step 3: Build the schematic editor canvas (place actors/puck, draw straight-segment routes)**

Create `src/coachPlayEditorCanvas.jsx`:

```jsx
// PlayEditorCanvas: the top-down schematic editor. Renders NHL_200X85_PROFILE's
// bounds as an SVG rink, lets the coach click to place actors/puck, click-drag
// to add a straight-segment route point per selected actor, and exposes the
// freeze/declare/save controls. MVP: straight-segment waypoints only, no
// freehand curves (design §2).
import { useEffect, useState } from "react";
import { getCoachPlayDraft, updateCoachPlayDraft, RevisionConflictError } from "./supabase.js";
import { NHL_200X85_PROFILE, isWithinBounds } from "./scenario-engine/rinkFrame.js";

const RINK_SVG_SCALE = 8; // px per rink-frame metre, arbitrary MVP constant

export function PlayEditorCanvas({ draftId, teamId, coachId, onClose, onSaved }) {
  const [def, setDef] = useState(null);
  const [revision, setRevision] = useState(null);
  const [selectedActorId, setSelectedActorId] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCoachPlayDraft(draftId).then((row) => {
      setDef(row.scenario_definition);
      setRevision(row.revision);
    });
  }, [draftId]);

  function addActorAt(x, y) {
    if (!isWithinBounds([x, y], NHL_200X85_PROFILE)) return;
    const id = `actor-${(def.initialState.actors?.length || 0) + 1}`;
    setDef((d) => ({
      ...d,
      initialState: { ...d.initialState, actors: [...d.initialState.actors, { id, pos: [x, y] }] },
    }));
    setSelectedActorId(id);
  }

  function addRoutePointFor(actorId, x, y) {
    if (!isWithinBounds([x, y], NHL_200X85_PROFILE)) return;
    setDef((d) => {
      const existing = d.intendedActions.filter((a) => a.actorId === actorId);
      const startTime = existing.length ? existing[existing.length - 1].endTime : 0;
      const newAction = { actorId, kind: "skate", startTime, endTime: startTime + 1, to: [x, y] };
      return { ...d, intendedActions: [...d.intendedActions, newAction] };
    });
  }

  function setFreeze(time) {
    setDef((d) => ({ ...d, decisionFreeze: { ...d.decisionFreeze, time: Number(time) } }));
  }

  function toggleObservableCue(cue) {
    setDef((d) => {
      const cues = d.decisionFreeze.observableCues || [];
      const next = cues.includes(cue) ? cues.filter((c) => c !== cue) : [...cues, cue];
      return { ...d, decisionFreeze: { ...d.decisionFreeze, observableCues: next } };
    });
  }

  function setDeclaredRead(actorId, description) {
    setDef((d) => ({ ...d, declaredRead: { actorId, description } }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const row = await updateCoachPlayDraft(draftId, revision, def);
      setRevision(row.revision);
      onSaved(row);
    } catch (e) {
      if (e instanceof RevisionConflictError) {
        setError("Someone/something else saved this draft since you loaded it -- reload before retrying.");
      } else {
        setError(e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!def) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={onClose}>← Back to plays</button>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <svg
        width={NHL_200X85_PROFILE.lengthM * RINK_SVG_SCALE}
        height={NHL_200X85_PROFILE.widthM * RINK_SVG_SCALE}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / RINK_SVG_SCALE - NHL_200X85_PROFILE.lengthM / 2;
          const y = (e.clientY - rect.top) / RINK_SVG_SCALE - NHL_200X85_PROFILE.widthM / 2;
          if (selectedActorId) addRoutePointFor(selectedActorId, x, y);
          else addActorAt(x, y);
        }}
        style={{ border: "1px solid #333", background: "#eef" }}
      >
        {def.initialState.actors.map((a) => (
          <circle
            key={a.id}
            cx={(a.pos[0] + NHL_200X85_PROFILE.lengthM / 2) * RINK_SVG_SCALE}
            cy={(a.pos[1] + NHL_200X85_PROFILE.widthM / 2) * RINK_SVG_SCALE}
            r={6}
            fill={a.id === selectedActorId ? "orange" : "steelblue"}
            onClick={(e) => { e.stopPropagation(); setSelectedActorId(a.id); }}
          />
        ))}
      </svg>
      <div>
        <label>Decision freeze time (s): <input type="number" step="0.1" value={def.decisionFreeze.time} onChange={(e) => setFreeze(e.target.value)} /></label>
      </div>
      <div>
        <label>Declared read description: <input type="text" value={def.declaredRead?.description || ""} onChange={(e) => setDeclaredRead(selectedActorId, e.target.value)} disabled={!selectedActorId} /></label>
      </div>
      <button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save draft"}</button>
    </div>
  );
}
```

- [ ] **Step 4: Manually verify the editor produces a valid-shaped `ScenarioDefinition`**

Run: `npm run dev`, open a draft, click to place 2+ actors, click a selected
actor then click elsewhere to add a route point, set a freeze time, select an
actor and type a declared-read description, save. Reload the page, reopen the
same draft.
Expected: actors/routes/freeze/declared-read all persist across reload (proves
the Supabase round-trip and revision handling both work); opening the same
draft in two tabs and saving from both confirms the second save shows the
revision-conflict error message from Step 3 above.

- [ ] **Step 5: Commit**

```bash
git add src/coachPlayAuthoring.jsx src/coachPlayEditorCanvas.jsx
git commit -m "feat(coach-authoring): schematic editor -- place actors, draw routes, set freeze/declared-read"
```

---

## Task 6: Preview via `DraftTeachingPlay` and the shared `playbackClock`

**Files:**
- Modify: `src/coachPlayEditorCanvas.jsx` (add preview panel)

**Interfaces:**
- Consumes: `buildDraftTeachingPlay` (Task 2); `frameAt`, `eventTimes` from
  `./scenario-engine/playbackClock.js`; `simulate` from
  `./scenario-engine/physics/simulator.js`; `evaluateDecision` from
  `./scenario-engine/decisionEvaluation.js`.
- Produces: a live preview inside `PlayEditorCanvas`, driven by
  `DraftTeachingPlay` regardless of whether the current draft is physics-clean.

This task requires the editor to run the current in-progress `def` through
`simulate()` and `evaluateDecision()` on demand (not on every keystroke — an
explicit "Preview" button) to build candidates for `compareDeclaredToDerived`.
Building real multi-candidate generation from a single-declared-read editor
state is genuinely open-ended (the editor only tracks one declared read, but
`evaluateDecision` wants a candidate set) — for MVP, the only candidate
evaluated is the coach's own declared actor's intended action, matching design
§2's "genuinely minimal" framing. A richer multi-candidate preview (comparing
the declared read against alternatives the editor didn't draw) is a real
follow-on, not solved here.

- [ ] **Step 1: Add a Preview button and physics/evaluation call to `PlayEditorCanvas`**

Add to `src/coachPlayEditorCanvas.jsx`, inside the component (after the existing
state declarations):

```jsx
import { simulate } from "./scenario-engine/physics/simulator.js";
import { evaluateDecision } from "./scenario-engine/decisionEvaluation.js";
import { buildDraftTeachingPlay } from "./scenario-engine/draftTeachingPlay.js";
import { frameAt, eventTimes as clockEventTimes } from "./scenario-engine/playbackClock.js";

// ...inside PlayEditorCanvas, alongside the other state:
const [draftPlay, setDraftPlay] = useState(null);
const [previewT, setPreviewT] = useState(0);
const [previewError, setPreviewError] = useState(null);

async function handlePreview() {
  setPreviewError(null);
  try {
    const trace = await simulate(def, NHL_200X85_PROFILE);
    const candidate = { id: def.declaredRead?.actorId, declaredRead: def.declaredRead, trace };
    if (!candidate.id) throw new Error("Select an actor and set a declared read before previewing.");
    const evaluation = evaluateDecision([candidate]);
    const draft = buildDraftTeachingPlay(def, trace, evaluation, candidate.id);
    setDraftPlay(draft);
    setPreviewT(0);
  } catch (e) {
    setPreviewError(e.message);
  }
}
```

Add the button and a frame readout to the JSX (after the "Save draft" button):

```jsx
<button onClick={handlePreview}>Preview</button>
{previewError && <div style={{ color: "red" }}>{previewError}</div>}
{draftPlay && (
  <div>
    <div>Physics clean: {draftPlay.physicsClean ? "yes" : "no"}</div>
    <div>Declared/derived agreement: {draftPlay.comparison.agreement}</div>
    {draftPlay.failedChecks.length > 0 && (
      <ul>{draftPlay.failedChecks.map((c, i) => <li key={i} style={{ color: "orange" }}>{c}</li>)}</ul>
    )}
    <input
      type="range" min={0} max={Math.max(...clockEventTimes(draftPlay))} step={0.05}
      value={previewT} onChange={(e) => setPreviewT(Number(e.target.value))}
    />
    <div>{JSON.stringify(frameAt(draftPlay, previewT))}</div>
  </div>
)}
```

- [ ] **Step 2: Manually verify preview works on both a clean and a physics-failed draft**

Run: `npm run dev`, in the editor draw a route where the actor's implied speed
between two waypoints is realistic; click Preview. Expected: `physicsClean:
yes`, agreement `agree` (since the declared actor is the only candidate),
`failedChecks` empty, scrubbing the slider updates the frame readout.

Then edit the route so the same actor must cover a large distance in a very
short `startTime`/`endTime` window (e.g. 20 metres in 0.1s) and click Preview
again. Expected: `physicsClean: no`, at least one entry in `failedChecks`
describing the speed violation, and the preview still renders (proves
`DraftTeachingPlay` genuinely doesn't require a clean trace to exist and be
scrubbable, unlike `CompiledTeachingPlay`).

- [ ] **Step 3: Commit**

```bash
git add src/coachPlayEditorCanvas.jsx
git commit -m "feat(coach-authoring): preview via DraftTeachingPlay through the shared playback clock"
```

---

## Task 7: Finalize flow — attempt `compileTeachingPlay()`, cache the result

**Files:**
- Modify: `src/coachPlayEditorCanvas.jsx` (add Finalize button + handler)
- Modify: `src/supabase.js` (already has `finalizeCoachPlayDraft` from Task 4 — no change needed here, just consumed)

**Interfaces:**
- Consumes: `compileTeachingPlay` from `./scenario-engine/compiledTeachingPlay.js`;
  `finalizeCoachPlayDraft` from `./supabase.js` (Task 4); `draftPlay`'s
  `comparison`/`physicsClean` state from Task 6 (finalize is only offered once a
  preview has run and looks clean, though the compile call is the actual gate).

- [ ] **Step 1: Add the Finalize handler**

Add to `src/coachPlayEditorCanvas.jsx`, alongside `handlePreview`:

```jsx
import { compileTeachingPlay } from "./scenario-engine/compiledTeachingPlay.js";
import { finalizeCoachPlayDraft } from "./supabase.js";

const [finalizeError, setFinalizeError] = useState(null);
const [finalized, setFinalized] = useState(false);

async function handleFinalize() {
  setFinalizeError(null);
  try {
    const trace = await simulate(def, NHL_200X85_PROFILE);
    const candidate = { id: def.declaredRead?.actorId, declaredRead: def.declaredRead, trace };
    const evaluation = evaluateDecision([candidate]);
    // compileTeachingPlay refuses anything not a clean AGREE -- that refusal
    // is the finalize gate itself, never bypassed or caught-and-forced here.
    const compiled = await compileTeachingPlay(def, trace, evaluation, candidate.id);
    const row = await finalizeCoachPlayDraft(draftId, compiled);
    setFinalized(true);
    onSaved(row);
  } catch (e) {
    setFinalizeError(
      `Cannot finalize: ${e.message}. The draft stays editable -- fix the issue above and try again.`
    );
  }
}
```

Add to the JSX (after the preview block):

```jsx
{!finalized && (
  <button onClick={handleFinalize}>Finalize</button>
)}
{finalizeError && <div style={{ color: "red" }}>{finalizeError}</div>}
{finalized && <div style={{ color: "green" }}>Finalized -- ready to export.</div>}
```

- [ ] **Step 2: Manually verify finalize succeeds only on a clean draft**

Run: `npm run dev`. On the physics-failed draft from Task 6 Step 2, click
Finalize. Expected: `finalizeError` shown, exact reason from
`compileTeachingPlay()`'s thrown message, draft remains editable (status still
`draft` in the Supabase table). Fix the route back to a realistic speed, click
Finalize again. Expected: succeeds, Supabase row shows `status: 'finalized'`
and a populated `compiled_artifact` column; attempting to edit and save the
same draft again is rejected by the Task 3 trigger (`raise exception ...
finalized and immutable`).

- [ ] **Step 3: Commit**

```bash
git add src/coachPlayEditorCanvas.jsx
git commit -m "feat(coach-authoring): finalize flow -- compileTeachingPlay gate, cached artifact"
```

---

## Task 8: Isolated Remotion export worker

**Files:**
- Create: `remotion/src/CoachPlayComposition.jsx`
- Create: `remotion/src/Root.jsx`
- Create: `remotion/render-worker.mjs`
- Modify: `remotion/package.json` (add `react-dom` peer already present; add a
  small `render` script)

**Interfaces:**
- Consumes: a `CompiledTeachingPlay` or `DraftTeachingPlay` JSON file path as a
  CLI arg (worker reads `samples`, `eventTimes`, `questionFreezeTime` — the
  fields both artifact types share, per design §6).
- Produces: an MP4 file on disk, uploaded by the worker to the
  `coach-play-exports` private Supabase Storage bucket, with a signed URL
  printed to stdout for the caller (Task 9's export button) to store on the
  draft row via `updateCoachPlayDraft`-style write (a small dedicated
  `setDraftExportUrl` function, added here).

Per the design's answered question, this stays a genuinely isolated Node
package — its own React 19, its own render logic in plain SVG against
`rinkFrame.js`'s coordinate space, never importing the main app's components.

- [ ] **Step 1: Confirm the remotion package's current state**

Run: `ls remotion/` — expected: `package.json`, `package-lock.json`,
`node_modules/` only (confirmed empty scaffold during design research). If
`node_modules` is stale/missing, run `cd remotion && npm install` first.

- [ ] **Step 2: Write the composition**

Create `remotion/src/CoachPlayComposition.jsx`:

```jsx
// Renders a CompiledTeachingPlay or DraftTeachingPlay (both artifact types
// carry samples/eventTimes/questionFreezeTime identically -- see design doc
// §6) as plain SVG against the rink coordinate space. Never imports the main
// app's React components (isolated React 19 runtime, per design §5).
import { useCurrentFrame, useVideoConfig } from "remotion";

const RINK_LENGTH_M = 60.96; // NHL_200X85_PROFILE.lengthM, duplicated here
const RINK_WIDTH_M = 25.908; // deliberately -- this package does not import
                              // src/scenario-engine/rinkFrame.js (different
                              // React major version, kept fully isolated).
const SCALE = 30; // px per metre at 1080p-ish composition width

function sampleAt(samples, actorId, t) {
  const actorSamples = samples.filter((s) => s.actorId === actorId).sort((a, b) => a.t - b.t);
  if (actorSamples.length === 0) return null;
  let prev = actorSamples[0];
  for (const s of actorSamples) {
    if (s.t > t) break;
    prev = s;
  }
  return prev.pos;
}

export function CoachPlayComposition({ compiledPlay, watermark }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const actorIds = [...new Set(compiledPlay.samples.map((s) => s.actorId))];

  return (
    <svg width={RINK_LENGTH_M * SCALE} height={RINK_WIDTH_M * SCALE} style={{ background: "#eef" }}>
      {actorIds.map((id) => {
        const pos = sampleAt(compiledPlay.samples, id, t);
        if (!pos) return null;
        return (
          <circle
            key={id}
            cx={(pos[0] + RINK_LENGTH_M / 2) * SCALE}
            cy={(pos[1] + RINK_WIDTH_M / 2) * SCALE}
            r={12}
            fill="steelblue"
          />
        );
      })}
      {watermark && (
        <text x={20} y={40} fontSize={28} fill="red" fontWeight="bold">
          DRAFT — NOT VALIDATED
        </text>
      )}
    </svg>
  );
}
```

- [ ] **Step 3: Write the Remotion root registering the composition**

Create `remotion/src/Root.jsx`:

```jsx
import { Composition } from "remotion";
import { CoachPlayComposition } from "./CoachPlayComposition.jsx";

export const RemotionRoot = () => {
  return (
    <Composition
      id="CoachPlay"
      component={CoachPlayComposition}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ compiledPlay: { samples: [] }, watermark: false }}
    />
  );
};
```

- [ ] **Step 4: Write the render-worker CLI**

Create `remotion/render-worker.mjs`:

```js
#!/usr/bin/env node
// Usage: node render-worker.mjs <artifact.json> <output.mp4> [--watermark]
// Consumes a CompiledTeachingPlay or DraftTeachingPlay JSON file (design §6:
// diagnostic exports pass a DraftTeachingPlay with --watermark; clean exports
// pass a finalized draft row's cached CompiledTeachingPlay without it).
import { readFileSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

async function main() {
  const [, , artifactPath, outputPath, flag] = process.argv;
  if (!artifactPath || !outputPath) {
    console.error("Usage: node render-worker.mjs <artifact.json> <output.mp4> [--watermark]");
    process.exit(1);
  }
  const watermark = flag === "--watermark";
  const compiledPlay = JSON.parse(readFileSync(artifactPath, "utf8"));

  const bundleLocation = await bundle({ entryPoint: new URL("./src/Root.jsx", import.meta.url).pathname });
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "CoachPlay",
    inputProps: { compiledPlay, watermark },
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: { compiledPlay, watermark },
  });

  console.log(`Rendered ${outputPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

Add `@remotion/bundler` to `remotion/package.json` dependencies (same version
pin as the other `@remotion/*` packages already there, `^4.0.489`) and run `cd
remotion && npm install` to pull it in.

- [ ] **Step 5: Manually verify a render end-to-end**

Export one finalized draft's `compiled_artifact` from the Supabase table editor
(Task 7's output) to a local JSON file, e.g. `remotion/test-artifact.json`.
Run: `cd remotion && node render-worker.mjs test-artifact.json out.mp4`
Expected: `out.mp4` produced, playable, shows a moving circle per actor,
matching the route drawn in the editor, no watermark text. Then re-run with
`--watermark` against a `DraftTeachingPlay` JSON (export one from the browser
console during a Task 6 preview: `JSON.stringify(draftPlay)`).
Expected: `out.mp4` shows the same animation with the red `DRAFT — NOT
VALIDATED` text burned into every frame.

- [ ] **Step 6: Write the upload-and-sign step**

Add to `remotion/render-worker.mjs`, after the `renderMedia()` call (this step
needs Supabase credentials — reads `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`
from `process.env`, matching how other server-side scripts in this repo read
Supabase creds; do not hardcode keys):

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync as readFileSyncForUpload } from "node:fs";

// ...after console.log(`Rendered ${outputPath}`);
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const fileBuffer = readFileSyncForUpload(outputPath);
  const storagePath = `${Date.now()}-${outputPath.split("/").pop()}`;
  const { error: uploadError } = await supabase.storage
    .from("coach-play-exports")
    .upload(storagePath, fileBuffer, { contentType: "video/mp4" });
  if (uploadError) throw uploadError;
  const { data: signed, error: signError } = await supabase.storage
    .from("coach-play-exports")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 days, per design §5 retention
  if (signError) throw signError;
  console.log(`Signed URL: ${signed.signedUrl}`);
} else {
  console.log("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set -- skipping upload, local MP4 only.");
}
```

Add `@supabase/supabase-js` to `remotion/package.json` dependencies (same
version pin as the main app, `^2.103.0`).

- [ ] **Step 7: Manually verify upload against a real (dev) Supabase project**

First create the private `coach-play-exports` Storage bucket in the Supabase
dashboard if it doesn't exist (public: off). Then run with env vars set:
`SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node render-worker.mjs
test-artifact.json out.mp4`
Expected: a `Signed URL: https://...` line printed; opening that URL in a
browser plays the MP4; the bucket is confirmed still private (an unsigned
direct object URL to the same path returns an access error).

- [ ] **Step 8: Commit**

```bash
git add remotion/
git commit -m "feat(remotion): isolated export worker -- render CompiledTeachingPlay/DraftTeachingPlay to signed MP4"
```

---

## Task 9: Mount `CoachPlayAuthoringSection` in `CoachHome`, add the quick-access chip, wire export UI

**Files:**
- Modify: `src/App.jsx:7469-7500`
- Modify: `src/coachPlayAuthoring.jsx` (export trigger button, calls a small
  `requestExport` helper that shells out — see below)
- Modify: `src/supabase.js` (add `setDraftExportInfo(draftId, exportUrl,
  expiresAt)`)

**Interfaces:**
- Consumes: `CoachPlayAuthoringSection` (Task 5/6/7); the existing
  `canAccess("coachDashboard", ...)` gate already used for
  `CoachTrainingSection`.
- Produces: the mounted, reachable feature.

- [ ] **Step 1: Add the import**

In `src/App.jsx`, alongside the existing coach-section imports (near line 25-28):

```jsx
import { CoachPlayAuthoringSection } from "./coachPlayAuthoring.jsx";
```

- [ ] **Step 2: Mount the section**

In `src/App.jsx:7496-7499`, replace:

```jsx
                  <CoachChallengeSection teamId={t.id} coachId={profile.id} teamLevel={t.level} roster={roster}/>
                  {canAccess("coachDashboard", subscriptionTier || "FREE").allowed && (
                    <CoachTrainingSection teamId={t.id} roster={roster}/>
                  )}
```

with:

```jsx
                  <CoachChallengeSection teamId={t.id} coachId={profile.id} teamLevel={t.level} roster={roster}/>
                  {canAccess("coachDashboard", subscriptionTier || "FREE").allowed && (
                    <CoachPlayAuthoringSection teamId={t.id} coachId={profile.id} roster={roster}/>
                  )}
                  {canAccess("coachDashboard", subscriptionTier || "FREE").allowed && (
                    <CoachTrainingSection teamId={t.id} roster={roster}/>
                  )}
```

Note: gated behind the same `coachDashboard` tier check as `CoachTrainingSection`
— this is the route-level gate; the allowlist (Task 3) is the actual MVP
restriction on top of it, enforced server-side by RLS regardless of what the
client renders.

- [ ] **Step 3: Add the quick-access chip**

There is no separate `Chip` component — the collapsed-card chip row
(`src/App.jsx:7468-7483`) is a single inline `.map()` over a literal array of
`{icon, label}` objects, all sharing one `onClick` (`toggleRoster(t.id)`, which
expands the card). Replace the array literal at `src/App.jsx:7470-7474`:

```jsx
                  {[
                    {icon:"💪",label:"Training"},
                    {icon:"📋",label:"Homework"},
                    {icon:"🏆",label:"Challenges"},
                    {icon:"📊",label:"Analytics"},
                  ].map((chip, i) => (
```

with:

```jsx
                  {[
                    {icon:"💪",label:"Training"},
                    {icon:"📋",label:"Homework"},
                    {icon:"🏆",label:"Challenges"},
                    {icon:"📊",label:"Analytics"},
                    {icon:"🎬",label:"Plays"},
                  ].map((chip, i) => (
```

No other change needed — the existing `.map()` body (lines 7476-7480) already
renders whatever's in the array using the shared `onClick={(e)=>{e.stopPropagation();toggleRoster(t.id);}}`
handler, so the new entry gets identical click behavior for free.

- [ ] **Step 4: Add the export trigger to `coachPlayAuthoring.jsx`**

Since Task 8's `render-worker.mjs` is a standalone Node CLI script (no
queue/worker infrastructure, per design §5 explicitly out of scope), the MVP
export trigger in the browser cannot invoke it directly. Add a manual-trigger
affordance instead: once a draft is `finalized`, show its `id` and a copyable
shell command for Thomas/the coach's admin to run out-of-band:

```jsx
{draftRow.status === "finalized" && !draftRow.export_url && (
  <div>
    <p>Export not yet generated. Run:</p>
    <code>node remotion/render-worker.mjs {draftRow.id}-compiled.json {draftRow.id}.mp4</code>
    <p>(Export the compiled_artifact column for this row to that filename first, or automate this handoff in a later phase -- explicitly out of scope here, design §5.)</p>
  </div>
)}
{draftRow.export_url && (
  <a href={draftRow.export_url} target="_blank" rel="noreferrer">View exported video</a>
)}
```

This keeps Task 8's worker fully isolated (no new coupling from the browser
into a Node CLI) while giving the coach a real, visible next step — automating
the trigger (a queue, an Edge Function, a button that actually kicks off
rendering) is a real follow-on tracked in the design's out-of-scope list, not
solved here.

- [ ] **Step 5: Add `setDraftExportInfo` to `src/supabase.js`**

```js
export async function setDraftExportInfo(draftId, exportUrl, expiresAt) {
  const { data, error } = await supabase
    .from("coach_play_drafts")
    .update({ export_url: exportUrl, export_expires_at: expiresAt })
    .eq("id", draftId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
```

(Called manually via the Supabase dashboard or a scratch script for MVP, after
running the render-worker and getting its printed signed URL — same
out-of-band handoff as Step 4.)

- [ ] **Step 6: Manually verify the full end-to-end path**

Run: `npm run dev`, sign in as the allowlisted test coach, confirm the `🎬
Plays` chip appears on the collapsed card and expands it, confirm
`CoachPlayAuthoringSection` renders, create a draft, author a play (Task 5),
preview it (Task 6), finalize it (Task 7), export it via the CLI (Task 8), copy
the signed URL into `setDraftExportInfo` via a scratch console call, reload the
page, confirm the "View exported video" link appears and plays the MP4.
Expected: every step in this chain works without any manual JSON editing at
any point — the standing requirement this whole phase exists to satisfy.

- [ ] **Step 7: Run the full scenario-engine test suite one final time**

Run: `npm run test:scenario-engine`
Expected: every test passes — confirms nothing in this phase's UI/export work
regressed the underlying engine.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/coachPlayAuthoring.jsx src/supabase.js
git commit -m "feat(coach-authoring): mount in CoachHome, add Plays chip, wire manual export handoff"
```

---

## Explicitly out of scope for this plan (per the design doc, not solved here)

- In-app team-roster distribution UI (link-sharing only).
- Assistant-coach collaboration / multi-owner drafts.
- Catalog promotion path for coach-authored content.
- TEAM-tier lapse/read-only-season handling for this write path specifically.
- Freehand/curved route drawing.
- Automated export queue/worker (Task 9's manual CLI handoff is the MVP path).
- Multi-candidate preview (comparing the declared read against alternatives the
  editor didn't draw) — Task 6 evaluates only the coach's single declared
  candidate.
