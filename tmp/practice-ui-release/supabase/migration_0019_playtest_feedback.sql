-- Migration 0019: playtest_feedback (in-app dev-bypass feedback while playtesting).
-- Owner-only insert and read. Paste into Supabase Dashboard -> SQL Editor -> Run. Idempotent.
create table if not exists public.playtest_feedback (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  screen      text,
  drill       text,
  category    text,
  note        text,
  context     jsonb,
  screenshot  text,          -- downscaled JPEG dataURL (inline; dev-only, low volume)
  app_version text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_playtest_feedback_created
  on public.playtest_feedback(created_at desc);

alter table public.playtest_feedback enable row level security;

-- Owner emails allowed to write and read. lower() guards against case
-- (Supabase stores emails lowercased). Keep BOTH policy lists in sync.
drop policy if exists "owner inserts playtest feedback" on public.playtest_feedback;
create policy "owner inserts playtest feedback" on public.playtest_feedback
  for insert with check (
    lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

drop policy if exists "owner reads playtest feedback" on public.playtest_feedback;
create policy "owner reads playtest feedback" on public.playtest_feedback
  for select using (
    lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );
