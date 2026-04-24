-- Coach → Team homework assignments.
--   `assignments` rows are authored by the coach; players see the rows that
--   match their team membership (and target list, if one is set).
--   `assignment_completions` is one row per (assignment, player) marking done.

-- ─────────────────────────────────────────────
-- ASSIGNMENTS (coach-authored)
-- ─────────────────────────────────────────────
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  -- null = whole team. Non-null = only these players see it.
  target_players uuid[] default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assignments_team  on public.assignments(team_id);
create index if not exists idx_assignments_coach on public.assignments(coach_id);

alter table public.assignments enable row level security;

-- Coach owns the row. Full CRUD is scoped to `auth.uid() = coach_id`.
drop policy if exists "assignments coach crud" on public.assignments;
create policy "assignments coach crud"
  on public.assignments for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- Players on the team can read the row, provided they're either the whole-team
-- audience (target_players is null) or explicitly targeted.
drop policy if exists "assignments player read" on public.assignments;
create policy "assignments player read"
  on public.assignments for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = assignments.team_id
        and tm.player_id = auth.uid()
    )
    and (assignments.target_players is null or auth.uid() = any(assignments.target_players))
  );

-- ─────────────────────────────────────────────
-- ASSIGNMENT COMPLETIONS (player marks done)
-- ─────────────────────────────────────────────
create table if not exists public.assignment_completions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  note text,
  primary key (assignment_id, player_id)
);

create index if not exists idx_completions_player on public.assignment_completions(player_id);

alter table public.assignment_completions enable row level security;

-- Player owns their own completion row.
drop policy if exists "completions player crud" on public.assignment_completions;
create policy "completions player crud"
  on public.assignment_completions for all
  using (auth.uid() = player_id)
  with check (auth.uid() = player_id);

-- Coach can read completions for assignments they authored (dashboard rollup).
drop policy if exists "completions coach read" on public.assignment_completions;
create policy "completions coach read"
  on public.assignment_completions for select
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_completions.assignment_id
        and a.coach_id = auth.uid()
    )
  );
