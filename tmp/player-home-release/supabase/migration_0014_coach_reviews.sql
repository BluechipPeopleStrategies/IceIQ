-- Migration 0014: coach_reviews (LLM coach pre-review of boards)
-- See docs/superpowers/specs/2026-06-12-coach-pre-review-design.md
-- One upsertable row per scenario_id: the gauntlet coaches' verdict + notes,
-- written by `tools/gauntlet-audit.mjs --sink supabase` (service role).
-- Owner-readable so the /#triage deck can show it.
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Idempotent.

create table if not exists public.coach_reviews (
  scenario_id text primary key,
  verdict text not null check (verdict in ('keep','revise','retire')),
  confidence real,
  notes text,
  convened boolean not null default false,
  board_hash text,
  model text,
  reviewed_at timestamptz not null default now()
);

alter table public.coach_reviews enable row level security;

drop policy if exists coach_reviews_read on public.coach_reviews;
create policy coach_reviews_read on public.coach_reviews for select using (true);
-- No insert/update/delete policy: writes happen via the service-role key, which bypasses RLS.
