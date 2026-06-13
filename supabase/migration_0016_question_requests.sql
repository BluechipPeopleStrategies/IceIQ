-- Migration 0016: question_requests (owner asks for more questions on a scene)
-- See docs/superpowers/specs/2026-06-13-stem-questions-design.md
--
-- One row per request: from a board/scene the owner taps "add questions" on,
-- with a preset (one_each / couple / surprise). I pull open requests and
-- generate the questions (Decision-Test-constrained + coach-vetted), then mark
-- them done. RLS: a signed-in owner reads/writes only their own requests.
--
-- Paste into Supabase Dashboard → SQL Editor → New query → Run. Idempotent.

create table if not exists public.question_requests (
  id uuid primary key default gen_random_uuid(),
  scenario_id text not null,          -- the board/scene the request was made from
  stem_id text,                       -- the stem it belongs to (scenario_id if it has none)
  preset text not null check (preset in ('one_each','couple','surprise')),
  note text,
  requester_email text not null,
  status text not null default 'open' check (status in ('open','done','dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_requests_status_idx on public.question_requests(status);
create index if not exists question_requests_stem_idx on public.question_requests(stem_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists question_requests_updated_at on public.question_requests;
create trigger question_requests_updated_at
  before update on public.question_requests
  for each row execute function public.set_updated_at();

alter table public.question_requests enable row level security;

drop policy if exists question_requests_select_own on public.question_requests;
create policy question_requests_select_own on public.question_requests
  for select using (requester_email = auth.jwt() ->> 'email');

drop policy if exists question_requests_insert_own on public.question_requests;
create policy question_requests_insert_own on public.question_requests
  for insert with check (requester_email = auth.jwt() ->> 'email');

drop policy if exists question_requests_update_own on public.question_requests;
create policy question_requests_update_own on public.question_requests
  for update using (requester_email = auth.jwt() ->> 'email')
  with check (requester_email = auth.jwt() ->> 'email');
