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
