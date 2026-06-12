-- Migration 0013: scenario_reviews (mobile board-review triage)
-- See docs/superpowers/specs/2026-06-11-mobile-scenario-review-design.md
--
-- One upsertable row per (scenario_id, reviewer_email): a Keep/Revise/Retire
-- verdict + optional note from the /review deck. RLS: a signed-in reviewer can
-- only read/write their own rows.
--
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run.

create table if not exists public.scenario_reviews (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  reviewer_email text not null,
  verdict text not null check (verdict in ('keep','revise','retire')),
  note text,
  board_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scenario_id, reviewer_email)
);

create index if not exists scenario_reviews_scenario_idx on public.scenario_reviews(scenario_id);
create index if not exists scenario_reviews_reviewer_idx on public.scenario_reviews(reviewer_email);

-- Shared trigger fn (already created in migration_0012); redefine if absent.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists scenario_reviews_updated_at on public.scenario_reviews;
create trigger scenario_reviews_updated_at
  before update on public.scenario_reviews
  for each row execute function public.set_updated_at();

alter table public.scenario_reviews enable row level security;

drop policy if exists scenario_reviews_select_own on public.scenario_reviews;
create policy scenario_reviews_select_own on public.scenario_reviews
  for select using (reviewer_email = auth.jwt() ->> 'email');

drop policy if exists scenario_reviews_insert_own on public.scenario_reviews;
create policy scenario_reviews_insert_own on public.scenario_reviews
  for insert with check (reviewer_email = auth.jwt() ->> 'email');

drop policy if exists scenario_reviews_update_own on public.scenario_reviews;
create policy scenario_reviews_update_own on public.scenario_reviews
  for update using (reviewer_email = auth.jwt() ->> 'email')
  with check (reviewer_email = auth.jwt() ->> 'email');
