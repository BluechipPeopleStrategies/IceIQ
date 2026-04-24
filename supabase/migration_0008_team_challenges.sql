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
