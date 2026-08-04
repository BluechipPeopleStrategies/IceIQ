# Migration drift — repo-side audit, 2026-08-03

**What this is, and what it is not.** This compares the tables the app actually
reads and writes against the migrations checked into `supabase/`. It is a
*repo-side* audit run with no database access, so it does **not** tell you what
exists in production. It tells you something narrower and still important: what
could not be recreated from this repository.

The open-work ledger said "`migration_0022` records five migrated tables absent"
and called for a full reconciliation rather than just the one table. This is the
half of that reconciliation that can be done without credentials.

---

## Every table the app touches, against the migrations we have

26 tables are referenced via `.from("…")` across `src/`. Eighteen have a
migration. **Eight do not.**

| Table | Migration in repo | Notes |
|---|---|---|
| `assignment_completions` | 0006 | |
| `assignments` | 0006 | |
| `challenge_results` | 0008 | |
| `coach_reviews` | 0014 | |
| `feedback_log` | 0015 | |
| `playtest_feedback` | 0019 | |
| `pov_images` | 0012 | |
| `question_overrides` | 0017 | |
| `question_reports` | 0002 | |
| `question_requests` | 0016 | |
| `question_results` | 0010 | |
| `question_stats` | 0003 | |
| `questions` | 0012 | |
| `quiz_feedback` | 0011 | |
| `review_questions` | 0004 | |
| `scenario_reviews` | 0013 | |
| `team_challenges` | 0008 | |
| `training_sessions` | 0007 | **exists in repo, never applied** — the known one |
| **`coach_ratings`** | — | none |
| **`goals`** | — | none |
| **`pov`** | — | none |
| **`profiles`** | — | none |
| **`quiz_sessions`** | — | none |
| **`self_ratings`** | — | none |
| **`team_members`** | — | none |
| **`teams`** | — | none |

## What the eight actually mean — two different problems

**1. The base schema was never version-controlled.** Migration numbering starts
at **0002**. There is no `migration_0001`. `profiles`, `teams`, `team_members`,
`quiz_sessions` and `pov` are the core tables the app has used since the
beginning, and they were almost certainly created by hand in the Supabase
dashboard before migrations existed. They work in production; they simply cannot
be rebuilt from this repo. A fresh environment — a staging project, a new
developer, a restore — starts broken and the failure looks like an app bug.

**2. Later tables added the same way.** `goals`, `self_ratings` and
`coach_ratings` are newer features whose tables never got a migration either. So
the practice that produced problem 1 did not stop; it just got quieter.

`goals` is worth calling out: **that is where SMART Goals saves.** It is the same
shape of risk as `training_sessions` — a feature writing to a table whose
existence nothing in this repo guarantees. `training_sessions` survived only
because that screen writes localStorage first and the failure was silent.

## What this does NOT say

- It does **not** say these eight are missing from production. Most are certainly
  there — the app works. The claim is only that the repo cannot recreate them.
- It does **not** cover columns. A table can exist and still be missing a column
  a later feature expects. `step_index` on the telemetry table is a known example
  already on the task list.
- Migrations **0020** and **0021** are absent from this branch by design: they
  belong to the parked `feature/coach-authoring-video-export` branch.

## Recommended order, cheapest first

1. **Apply `migration_0007`.** Already written, already reviewed, creates
   `training_sessions`. Thomas's to run. Unblocks the training-log dual-write
   that has been failing silently since it was written.
2. **Dump the live schema and check in the result as `migration_0001_baseline.sql`.**
   `supabase db dump --schema public` against production, committed as-is. This
   is the single highest-value item here: it turns eight unrepeatable tables into
   a file, and it is a read-only operation against the database.
3. **Write migrations for `goals`, `self_ratings`, `coach_ratings`** from that
   dump, so the three newer features are as reproducible as the older ones.
4. **Then reconcile columns**, which needs the dump from step 2 to be meaningful.

Steps 2-4 need database credentials and are Thomas's call; step 1 is already
queued for him.
