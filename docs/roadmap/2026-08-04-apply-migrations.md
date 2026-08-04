# Apply the five missing migrations — runbook

Supabase Dashboard -> SQL Editor -> New query.

**Run these ONE AT A TIME, in this order.** Not as a single paste: Postgres runs
a multi-statement batch in an implicit transaction, so one failure rolls back
everything in it. `migration_0022` learned that the hard way and documented it.

All five are safe and re-runnable: `create table if not exists` throughout, no
`drop table`, no `delete`, no `truncate`. The only drops are `drop policy if
exists`, which is an idempotent policy reset. Running one twice is a no-op.

After each: confirm "Success. No rows returned", then move to the next.

---

## Step 1 of 5 — creates `training_sessions`

> Every training-log sync has failed silently since it was written.

```sql
-- Off-ice training sessions, player-authored, coach-visible.
-- Powers the TEAM-tier "Coach-visible training activity" feature promised
-- on the pricing matrix. Player already logs to LS via utils/trainingLog.js;
-- this table is the dual-write destination so coaches can roll the data up
-- on their dashboard.

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  -- Free-form so we don't need a migration every time the player adds a new
  -- activity type in the UI. Current values: "ice_time", "practice",
  -- "off_ice", "stick_handling", "video", "power_skating", "skills_dev",
  -- "pucks_shot", "other".
  type text not null,
  value numeric not null,            -- minutes, puck count, etc.
  unit text not null,                -- "min", "pucks", etc.
  label text,
  notes text,
  coach text,                        -- free-form name of the coach who ran it
  price numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_sessions_player     on public.training_sessions(player_id);
create index if not exists idx_training_sessions_player_date on public.training_sessions(player_id, session_date desc);

alter table public.training_sessions enable row level security;

-- Player owns their own rows.
drop policy if exists "training_sessions player crud" on public.training_sessions;
create policy "training_sessions player crud"
  on public.training_sessions for all
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

-- Any coach who owns a team the player is on can read their training rows.
-- Matches the same join pattern coach_ratings uses.
drop policy if exists "training_sessions coach read" on public.training_sessions;
create policy "training_sessions coach read"
  on public.training_sessions for select
  using (
    exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.player_id = training_sessions.player_id
        and t.coach_id = auth.uid()
    )
  );
```

---

## Step 2 of 5 — creates `question_reports`

> LIVE 404 on every app load.

```sql
-- Migration 0002: question reports
-- Run this in Supabase SQL Editor after the initial schema

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  question_id text not null,
  level text,
  reason text not null,
  detail text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_question_reports_unresolved on public.question_reports(resolved, created_at desc);
create index if not exists idx_question_reports_question on public.question_reports(question_id);

alter table public.question_reports enable row level security;

-- Anyone authenticated can submit a report
drop policy if exists "authenticated can report" on public.question_reports;
create policy "authenticated can report" on public.question_reports
  for insert with check (auth.role() = 'authenticated');

-- Users can see their own reports (optional, for transparency)
drop policy if exists "user sees own reports" on public.question_reports;
create policy "user sees own reports" on public.question_reports
  for select using (auth.uid() = user_id);
```

---

## Step 3 of 5 — creates `question_results`

> LIVE 404 on every app load.

```sql
-- migration_0010_question_results.sql
-- Per-rep results table: one row per answered question, used as the
-- authoritative source for the Hockey IQ Score (rolling 60-140 EWMA).
--
-- This is intentionally separate from quiz_sessions:
--   - quiz_sessions stores bulk-session blobs (jsonb results array).
--   - question_results stores one flat row per answer with timing and
--     tag columns, so we can do windowed queries cheaply.
-- Both can coexist; existing flows are unchanged.

create table if not exists public.question_results (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references public.profiles(id) on delete cascade,
  question_id  text not null,
  correct      boolean not null,
  time_taken_ms integer,                  -- null when timing isn't captured
  difficulty   smallint not null check (difficulty between 1 and 3),
  zone         text,                      -- 'dz' | 'oz' | 'nz' | null
  skill        text,                      -- maps to question `cat` (Positioning, Tempo, ...)
  answered_at  timestamptz not null default now()
);

-- The EWMA window is "trailing 30 days" so the hot path is:
--   select * from question_results
--    where player_id = $1 and answered_at > now() - interval '30 days'
--    order by answered_at;
create index if not exists idx_question_results_player_time
  on public.question_results(player_id, answered_at desc);

alter table public.question_results enable row level security;

drop policy if exists "player manages own results" on public.question_results;
create policy "player manages own results" on public.question_results
  for all using (auth.uid() = player_id);

drop policy if exists "coach reads team results" on public.question_results;
create policy "coach reads team results" on public.question_results
  for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where t.coach_id = auth.uid() and tm.player_id = question_results.player_id
    )
  );
```

---

## Step 4 of 5 — creates `team_challenges + challenge_results`

> Team challenges cannot persist. Depends on `teams`, which 0022 verified present.

```sql
-- Team challenges — coach picks a fixed set of questions, every player on
-- the team takes the same quiz, coach sees a leaderboard. Mirrors the
-- assignments pattern (coach-owned row, player-scoped read via team).

create table if not exists public.team_challenges (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  -- Question bank ids, e.g. ["u11q1","u13tf4"]. Plain text so new question
  -- types don't require a schema change.
  question_ids text[] not null,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_team_challenges_team  on public.team_challenges(team_id);
create index if not exists idx_team_challenges_coach on public.team_challenges(coach_id);

alter table public.team_challenges enable row level security;

drop policy if exists "team_challenges coach crud" on public.team_challenges;
create policy "team_challenges coach crud"
  on public.team_challenges for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

drop policy if exists "team_challenges player read" on public.team_challenges;
create policy "team_challenges player read"
  on public.team_challenges for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_challenges.team_id
        and tm.player_id = auth.uid()
    )
  );

-- One result row per player per challenge. Players own it.
create table if not exists public.challenge_results (
  challenge_id uuid not null references public.team_challenges(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  score int not null,              -- 0..100
  results jsonb not null,          -- [{id, cat, ok}]
  completed_at timestamptz not null default now(),
  primary key (challenge_id, player_id)
);

create index if not exists idx_challenge_results_challenge on public.challenge_results(challenge_id);
create index if not exists idx_challenge_results_player    on public.challenge_results(player_id);

alter table public.challenge_results enable row level security;

drop policy if exists "challenge_results player crud" on public.challenge_results;
create policy "challenge_results player crud"
  on public.challenge_results for all
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

-- Coach who authored the challenge reads every team member's result
-- (powers the leaderboard). Team-mates can also read each other so the
-- leaderboard UI on the player side can show ranks.
drop policy if exists "challenge_results coach read" on public.challenge_results;
create policy "challenge_results coach read"
  on public.challenge_results for select
  using (
    exists (
      select 1 from public.team_challenges tc
      where tc.id = challenge_results.challenge_id
        and tc.coach_id = auth.uid()
    )
  );

drop policy if exists "challenge_results teammate read" on public.challenge_results;
create policy "challenge_results teammate read"
  on public.challenge_results for select
  using (
    exists (
      select 1
      from public.team_challenges tc
      join public.team_members tm on tm.team_id = tc.team_id
      where tc.id = challenge_results.challenge_id
        and tm.player_id = auth.uid()
    )
  );
```

---

## Step 5 of 5 — creates `quiz_feedback`

> Quiz feedback is silently dropped.

```sql
-- migration_0011_quiz_feedback.sql
-- Optional post-quiz feedback: "What would you like to see more of?"
-- Captures a canned chip choice + optional free-text note, plus a bit of
-- context (the score they just saw, their age group at submission time)
-- so we can tell whether the ask correlates with a tough quiz / a level.

create table if not exists public.quiz_feedback (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.profiles(id) on delete cascade,
  choice        text not null,
  note          text,
  score         int,
  level         text,
  submitted_at  timestamptz not null default now()
);

create index if not exists idx_quiz_feedback_submitted
  on public.quiz_feedback(submitted_at desc);

alter table public.quiz_feedback enable row level security;

-- Authenticated player writes their own feedback. Demo / preview / dev
-- accounts have no auth.uid() so they're naturally excluded; the UI
-- already gates the card to non-ephemeral player ids.
drop policy if exists "player submits own feedback" on public.quiz_feedback;
create policy "player submits own feedback" on public.quiz_feedback
  for insert with check (auth.uid() = player_id);

-- Admin reads all feedback (product review). Same admin sentinel as
-- migration_0004; flipping the admin email needs to update this too.
drop policy if exists "admin reads all feedback" on public.quiz_feedback;
create policy "admin reads all feedback" on public.quiz_feedback
  for select using (auth.jwt() ->> 'email' = 'mtslifka@gmail.com');
```

---

## Step 6 — verify (read-only, changes nothing)

Paste this last and send me the output. It settles `goals` — where SMART Goals
saves — which appeared on neither the present nor the absent list in the
2026-08-02 check, so its status is genuinely unknown.

```sql
select t.name, to_regclass('public.' || t.name) is not null as exists
from (values ('profiles'),('teams'),('team_members'),('quiz_sessions'),('goals'),
             ('self_ratings'),('coach_ratings'),('training_sessions'),
             ('question_reports'),('question_results'),('team_challenges'),
             ('challenge_results'),('quiz_feedback'),('question_stats'),
             ('review_questions'),('assignments'),('assignment_completions'),
             ('questions'),('pov_images'),('scenario_reviews'),('coach_reviews'),
             ('feedback_log'),('question_requests'),('question_overrides'),
             ('playtest_feedback')) as t(name)
order by exists, t.name;
```

Anything coming back `false` after this is a table the app touches that the
database does not have — send me the list and I will trace what breaks.

## If a step fails

Copy the error. The likely one is a missing dependency (`0008` needs `teams`).
Nothing is half-applied — the failed step rolls back on its own, and the steps
before it stay applied.
