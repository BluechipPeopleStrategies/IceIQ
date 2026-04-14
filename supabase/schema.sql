-- IceIQ database schema
-- Paste this into Supabase Dashboard → SQL Editor → New query → Run

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('player','coach')),
  name text not null,
  level text,
  position text,
  season text default '2025-26',
  session_length int default 15,
  colorblind boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- TEAMS (owned by coaches)
-- ─────────────────────────────────────────────
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  level text not null,
  season text not null,
  code text not null unique,
  created_at timestamptz default now()
);

create index if not exists idx_teams_coach on public.teams(coach_id);
create index if not exists idx_teams_code on public.teams(code);

-- ─────────────────────────────────────────────
-- TEAM MEMBERSHIP (players join teams)
-- ─────────────────────────────────────────────
create table if not exists public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (team_id, player_id)
);

create index if not exists idx_team_members_player on public.team_members(player_id);

-- ─────────────────────────────────────────────
-- QUIZ SESSIONS
-- ─────────────────────────────────────────────
create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  results jsonb not null,
  score int not null,
  session_length int,
  completed_at timestamptz default now()
);

create index if not exists idx_quiz_sessions_player on public.quiz_sessions(player_id, completed_at desc);

-- ─────────────────────────────────────────────
-- GOALS (SMART goals per category)
-- ─────────────────────────────────────────────
create table if not exists public.goals (
  player_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  goal text not null,
  s text, m text, a text, r text, t text,
  completed boolean default false,
  updated_at timestamptz default now(),
  primary key (player_id, category)
);

-- ─────────────────────────────────────────────
-- SELF RATINGS (player rates themselves on skills)
-- ─────────────────────────────────────────────
create table if not exists public.self_ratings (
  player_id uuid not null references public.profiles(id) on delete cascade,
  skill_id text not null,
  value text not null,
  updated_at timestamptz default now(),
  primary key (player_id, skill_id)
);

-- ─────────────────────────────────────────────
-- COACH RATINGS (coaches rate players on skills)
-- ─────────────────────────────────────────────
create table if not exists public.coach_ratings (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  skill_id text not null,
  value text not null,
  note text,
  updated_at timestamptz default now(),
  primary key (coach_id, player_id, skill_id)
);

create index if not exists idx_coach_ratings_player on public.coach_ratings(player_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.goals enable row level security;
alter table public.self_ratings enable row level security;
alter table public.coach_ratings enable row level security;

-- PROFILES: anyone authenticated can read profiles of users they share a team with,
-- and everyone can read their own. Only self-update.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "read teammates profile" on public.profiles;
create policy "read teammates profile" on public.profiles
  for select using (
    exists (
      select 1 from public.team_members tm_self
      join public.team_members tm_other on tm_self.team_id = tm_other.team_id
      where tm_self.player_id = auth.uid() and tm_other.player_id = profiles.id
    )
    or exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where t.coach_id = auth.uid() and tm.player_id = profiles.id
    )
    or exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where tm.player_id = auth.uid() and t.coach_id = profiles.id
    )
  );

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- TEAMS: coach owns; anyone with code can look up to join
drop policy if exists "coach manages own teams" on public.teams;
create policy "coach manages own teams" on public.teams
  for all using (auth.uid() = coach_id);

drop policy if exists "authenticated can lookup team by code" on public.teams;
create policy "authenticated can lookup team by code" on public.teams
  for select using (auth.role() = 'authenticated');

-- TEAM MEMBERS: player can add/remove self; coach can see their team's roster
drop policy if exists "player manages own membership" on public.team_members;
create policy "player manages own membership" on public.team_members
  for all using (auth.uid() = player_id);

drop policy if exists "coach views team roster" on public.team_members;
create policy "coach views team roster" on public.team_members
  for select using (
    exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
  );

-- QUIZ SESSIONS: player owns; coach can read their team members' sessions
drop policy if exists "player manages own sessions" on public.quiz_sessions;
create policy "player manages own sessions" on public.quiz_sessions
  for all using (auth.uid() = player_id);

drop policy if exists "coach reads team sessions" on public.quiz_sessions;
create policy "coach reads team sessions" on public.quiz_sessions
  for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where t.coach_id = auth.uid() and tm.player_id = player_id
    )
  );

-- GOALS: player owns; coach of player's team can read
drop policy if exists "player manages own goals" on public.goals;
create policy "player manages own goals" on public.goals
  for all using (auth.uid() = player_id);

drop policy if exists "coach reads team goals" on public.goals;
create policy "coach reads team goals" on public.goals
  for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where t.coach_id = auth.uid() and tm.player_id = player_id
    )
  );

-- SELF RATINGS: player owns; coach of player's team can read
drop policy if exists "player manages own ratings" on public.self_ratings;
create policy "player manages own ratings" on public.self_ratings
  for all using (auth.uid() = player_id);

drop policy if exists "coach reads team self ratings" on public.self_ratings;
create policy "coach reads team self ratings" on public.self_ratings
  for select using (
    exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where t.coach_id = auth.uid() and tm.player_id = player_id
    )
  );

-- COACH RATINGS: coach writes for their team players; player reads their own
drop policy if exists "coach manages own ratings of team players" on public.coach_ratings;
create policy "coach manages own ratings of team players" on public.coach_ratings
  for all using (
    auth.uid() = coach_id
    and exists (
      select 1 from public.teams t
      join public.team_members tm on t.id = tm.team_id
      where t.coach_id = auth.uid() and tm.player_id = coach_ratings.player_id
    )
  );

drop policy if exists "player reads own coach ratings" on public.coach_ratings;
create policy "player reads own coach ratings" on public.coach_ratings
  for select using (auth.uid() = player_id);

-- ─────────────────────────────────────────────
-- HELPER: auto-create profile row on signup
-- (Run this after the tables above)
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Profile row is created by the app after signup, not here,
  -- because role/name come from the signup form.
  return new;
end;
$$;
