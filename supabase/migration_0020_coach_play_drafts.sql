-- Migration 0020: coach_play_drafts (coach-authoring / video-export MVP)
--
-- Drafts a coach builds in the schematic editor, per
-- docs/superpowers/specs/2026-07-31-coach-authoring-video-export-design.md.
-- MVP-gated behind coach_play_drafts_allowlist until the feature graduates
-- past initial rollout (framework-fit decision 4).
--
-- Ownership pattern deliberately mirrors public.teams's "coach manages own
-- teams" policy (auth.uid() = coach_id), NOT the two known anti-patterns
-- elsewhere in this schema: profiles.tier is client-writable with no
-- ownership check, and question_overrides accepts writes from any
-- authenticated user rather than an owner. Here, every read/write additionally
-- requires (a) owning the draft row, (b) owning the referenced team, and
-- (c) allowlist membership.
--
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Idempotent.

create table if not exists public.coach_play_drafts (
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

create index if not exists idx_coach_play_drafts_team on public.coach_play_drafts(team_id);
create index if not exists idx_coach_play_drafts_coach on public.coach_play_drafts(coach_id);

-- Belt-and-suspenders immutability: RLS alone can't cleanly express "no
-- updates once a specific column value is reached," so a trigger backs it up.
-- search_path pinned per migration_0018's hardening pattern (clears the
-- Supabase Security Advisor "function search_path mutable" finding).
--
-- Only the proof/status/revision fields are frozen once finalized. export_url,
-- export_expires_at, and updated_at stay writable after finalization on
-- purpose: setDraftExportInfo() (src/supabase.js) legitimately updates those
-- columns on an already-finalized row once the export render completes --
-- that's the whole point of exporting a finalized draft. A blanket freeze
-- here made that path permanently unreachable (fixed 2026-07-31 per code
-- review finding).
create or replace function public.reject_update_of_finalized_draft()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'finalized'
     and (new.scenario_definition is distinct from old.scenario_definition
       or new.compiled_artifact  is distinct from old.compiled_artifact
       or new.status             is distinct from old.status
       or new.revision           is distinct from old.revision) then
    raise exception 'coach_play_drafts: row % is finalized -- the proof/status/revision fields are immutable', old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_coach_play_drafts_immutable on public.coach_play_drafts;
create trigger trg_coach_play_drafts_immutable
  before update on public.coach_play_drafts
  for each row execute function public.reject_update_of_finalized_draft();

create table if not exists public.coach_play_drafts_allowlist (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.coach_play_drafts enable row level security;
alter table public.coach_play_drafts_allowlist enable row level security;

drop policy if exists "coach manages own team drafts" on public.coach_play_drafts;
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

-- Allowlist itself is owner-managed only; no self-service write path. A
-- narrow read policy (own row only) IS required: Postgres subjects a
-- cross-table subquery to the target table's own RLS for the querying role,
-- so the `exists (select ... from coach_play_drafts_allowlist ...)` check
-- inside the drafts policy above would otherwise see zero rows for every
-- role -- including an allowlisted coach -- making the drafts table
-- permanently inert. Fixed 2026-07-31 per code review finding.
drop policy if exists "no client access to allowlist" on public.coach_play_drafts_allowlist;
drop policy if exists "coach reads own allowlist row" on public.coach_play_drafts_allowlist;
create policy "coach reads own allowlist row" on public.coach_play_drafts_allowlist
  for select using (auth.uid() = coach_id);

-- Writes stay fully client-locked: rows are inserted out-of-band (Supabase
-- SQL editor, service-role context, which bypasses RLS) by Thomas during
-- MVP rollout. Split into per-command policies (rather than one `for all`)
-- so the deny is unambiguous and never accidentally OR'd with the select
-- policy above.
drop policy if exists "no client insert to allowlist" on public.coach_play_drafts_allowlist;
create policy "no client insert to allowlist" on public.coach_play_drafts_allowlist
  for insert with check (false);

drop policy if exists "no client update to allowlist" on public.coach_play_drafts_allowlist;
create policy "no client update to allowlist" on public.coach_play_drafts_allowlist
  for update using (false) with check (false);

drop policy if exists "no client delete to allowlist" on public.coach_play_drafts_allowlist;
create policy "no client delete to allowlist" on public.coach_play_drafts_allowlist
  for delete using (false);
