-- Migration 0015: feedback_log (permanent, append-only record of incorporated feedback)
-- See docs/superpowers/specs/2026-06-12-coach-pre-review-design.md
-- Written by scripts/resolve-feedback.mjs (service role) when a board's feedback is implemented.
-- Never deleted. Owner-readable so the deck shows "previously incorporated".
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Idempotent.

create table if not exists public.feedback_log (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,
  node text,
  iteration int not null default 1,
  source text not null check (source in ('owner','coach')),
  feedback text,
  change text,
  created_at timestamptz not null default now()
);

create index if not exists feedback_log_scenario_idx on public.feedback_log(scenario_id);

alter table public.feedback_log enable row level security;
drop policy if exists feedback_log_read on public.feedback_log;
create policy feedback_log_read on public.feedback_log for select using (true);
-- writes are service-role only.
