-- Migration 0017: question_overrides (edit a question in the dashboard, live)
-- See docs/superpowers/specs/2026-06-13-question-dashboard-design.md
--
-- One row per edited question: a JSON `patch` of the changed fields, merged over
-- the base (seed/bank) question at runtime so edits are live without a rebuild.
-- I periodically bake patches back into the source files and clear the rows.
-- Readable by everyone (the app applies them at render); writable by signed-in
-- owners (the dashboard is owner-gated).
--
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Idempotent.

create table if not exists public.question_overrides (
  question_id text primary key,
  patch jsonb not null,
  editor_email text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists question_overrides_updated_at on public.question_overrides;
create trigger question_overrides_updated_at
  before update on public.question_overrides
  for each row execute function public.set_updated_at();

alter table public.question_overrides enable row level security;

drop policy if exists question_overrides_select_all on public.question_overrides;
create policy question_overrides_select_all on public.question_overrides
  for select using (true);

drop policy if exists question_overrides_write_auth on public.question_overrides;
create policy question_overrides_write_auth on public.question_overrides
  for insert with check (auth.role() = 'authenticated');

drop policy if exists question_overrides_update_auth on public.question_overrides;
create policy question_overrides_update_auth on public.question_overrides
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
