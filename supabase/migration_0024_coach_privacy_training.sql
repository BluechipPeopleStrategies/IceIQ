-- No player records are deleted or rewritten. Legacy private notes remain
-- available to their author, while a restrictive policy closes player reads.
-- PostgreSQL combines this guard with existing permissive policies using AND.
begin;

alter table public.coach_ratings enable row level security;
drop policy if exists "private coach note visibility guard" on public.coach_ratings;
create policy "private coach note visibility guard" on public.coach_ratings
  as restrictive for select
  using (skill_id <> '__general_notes__' or coach_id = auth.uid());

create table if not exists public.coach_private_notes (
  coach_id uuid not null references public.profiles(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  note text not null default '',
  updated_at timestamptz not null default now(),
  primary key (coach_id, player_id)
);
alter table public.coach_private_notes enable row level security;
revoke all on public.coach_private_notes from public;
grant select, insert, update, delete on public.coach_private_notes to authenticated;
drop policy if exists "author manages private notes" on public.coach_private_notes;
create policy "author manages private notes" on public.coach_private_notes
  for all to authenticated
  using (coach_id = auth.uid())
  with check (
    coach_id = auth.uid() and exists (
      select 1 from public.teams t join public.team_members tm on tm.team_id=t.id
      where t.coach_id=auth.uid() and tm.player_id=coach_private_notes.player_id
    )
  );

-- Some installations did not apply migration 0007. Reconcile without dropping
-- an existing training table or changing historical entries.
create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null, type text not null, value numeric not null,
  unit text not null, label text, notes text, coach text, price numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_training_sessions_player_date on public.training_sessions(player_id,session_date desc);
alter table public.training_sessions enable row level security;
grant select, insert, update, delete on public.training_sessions to authenticated;
drop policy if exists "training_sessions player crud" on public.training_sessions;
create policy "training_sessions player crud" on public.training_sessions for all to authenticated
  using (auth.uid()=player_id) with check (auth.uid()=player_id);
drop policy if exists "training_sessions coach read" on public.training_sessions;
create policy "training_sessions coach read" on public.training_sessions for select to authenticated
  using (exists (select 1 from public.team_members tm join public.teams t on t.id=tm.team_id
    where tm.player_id=training_sessions.player_id and t.coach_id=auth.uid()));

commit;
