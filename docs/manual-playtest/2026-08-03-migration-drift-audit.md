# Migration drift — repo vs production, 2026-08-03

> **RESOLVED 2026-08-04.** All five missing migrations were applied by Thomas from the
> Supabase SQL editor, in order, one at a time. A REST probe of every one of the
> 25 tables the app touches now comes back present — including `goals`, whose
> status this document called genuinely unknown. SMART Goals had been saving to
> Supabase correctly all along.
>
> Two smoke tests that had never been able to run now pass against the live
> database: `smoke:training` (RLS proven both ways — the owning coach reads a
> session, an unrelated coach gets zero rows) and `smoke:challenge` (an
> unrelated coach blocked on both tables).
>
> One thing was changed rather than replayed: `migration_0002`'s insert policy
> was applied in its HARDENED form from `migration_0022` section 5. Replaying
> the file verbatim would have recreated the forgeable-attribution hole that
> 0022 was written to close, because the file predates the fix. That is the
> real hazard of replaying migrations against a drifted database, and it is
> worth remembering the next time this happens.
>
> The rest of this document is kept as the record of how the drift was found.

> **This document was rewritten after its first version got the main claim
> wrong.** The first pass concluded that eight tables "have no migration in the
> repo and cannot be recreated from it." That was false, and the correction is
> recorded here rather than quietly swapped, because the mistake is instructive:
> the scan globbed `supabase/migration_*.sql` and never looked at
> `supabase/schema.sql`, which is where the base schema actually lives. A second
> claimed-missing table, `pov`, was a regex artifact — the pattern matched the
> prefix of `pov_images`. **Nothing was missing. The scan was.**

---

## What is actually true

**Every table the app touches is defined in this repo.** 25 real tables are
referenced via `.from("…")` across `src/`. All of them resolve:

- **`supabase/schema.sql`** — the base schema, headed *"Paste this into Supabase
  Dashboard → SQL Editor → New query → Run"*. Defines `profiles`, `teams`,
  `team_members`, `quiz_sessions`, `goals`, `self_ratings`, `coach_ratings`.
- **`supabase/migration_0002`…`0023`** — everything since, one table or change
  per file.

So the repo *can* rebuild the database. The base schema is version-controlled;
it just isn't numbered, which is why a scan looking only for `migration_*`
missed it.

## The real drift, and it is the other direction

The problem is not repo → database. It is **database ← repo**: migration files
record *intent*, not what was actually applied. This is already documented, in
the repo, inside `migration_0022_rls_privilege_hardening.sql` (lines 246-256),
written when its first apply attempt failed:

> `public.question_reports` does not exist in the live database even though
> migration_0002 creates it. The migration files record intent, not what was
> actually applied — the two have drifted. Verified live on 2026-08-02, these
> five tables from the migration history are absent:

| Table | Created by | Live on 2026-08-02 |
|---|---|---|
| `question_reports` | 0002 | **absent** — and this explains 404s the app logs on load |
| `question_results` | 0010 | **absent** — same |
| `team_challenges` | 0008 | **absent** |
| `training_sessions` | 0007 | **absent** — the known one |
| `quiz_feedback` | 0011 | **absent** |

Verified **present** in the same check: `profiles`, `question_overrides`,
`teams`, `team_members`, `coach_reviews`, `feedback_log`.

That is the answer to "migrations and production have drifted": **five
migrations were never applied**, not one. `training_sessions` was simply the one
someone noticed.

## What is still genuinely unknown

**`goals` — where SMART Goals saves — is on neither list.** It is defined in
`schema.sql`, but the 2026-08-02 check neither confirmed nor denied it in
production. Its status is unknown.

The consequence if it is missing is milder than `training_sessions`, and worth
knowing: `SB.saveGoal` throws, the per-category `catch` in `handleGoalsSave`
collects the failure, and the player is told "Saved on this device — will sync
next time." The goal survives in localStorage. `saveTrainingSessionRemote`, by
contrast, silently no-ops. So a missing `goals` degrades honestly rather than
lying — bad, not catastrophic.

A read-only `to_regclass` check settles it in seconds. The SQL is already
written out in `docs/manual-playtest/audits/2026-08-03-save-path-trace.md`
(lines 220-227).

## Recommended order

1. **Apply `migration_0007`** — creates `training_sessions`. Already written and
   reviewed. Thomas's to run. Unblocks the training-log dual-write that has been
   failing silently since it was written.
2. **Apply the other four** — `0002`, `0008`, `0010`, `0011`. Two of them
   (`question_reports`, `question_results`) are causing 404s on every app load
   today, which is a live symptom nobody is currently chasing.
3. **Run the `to_regclass` check across all 25 tables**, not just the eleven that
   the 0022 note happened to cover, and commit the result next to that note. That
   turns "verified live on 2026-08-02" into something reproducible instead of a
   comment that ages.
4. **Then reconcile columns**, which the table check has to precede. `step_index`
   on the telemetry table is a known example already on the task list.

Steps 1-3 need database credentials and are Thomas's call.

## The process finding

`migration_0022` guards every reference to a possibly-missing table in a
`do $$ … if to_regclass(…) is not null`, because *"Postgres runs a
multi-statement batch in an implicit transaction, an unguarded reference to a
missing table rolls back the ENTIRE migration."* That is a good defensive habit
and it is why the security fixes in that file applied at all.

But it also means **a migration can now half-apply and report success.** The
guard makes the file survive drift; it does not fix the drift, and nothing warns
that a section was skipped. If step 3 produces a checked-in table inventory, the
natural follow-on is a script that diffs the inventory against what the migration
files claim to create — the same shape as the warning baseline that
`scripts/qa-sweep.mjs` now uses for seeds.
