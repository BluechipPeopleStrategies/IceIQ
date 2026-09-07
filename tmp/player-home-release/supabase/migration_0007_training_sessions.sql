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
