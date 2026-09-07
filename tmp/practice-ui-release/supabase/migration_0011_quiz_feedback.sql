-- migration_0011_quiz_feedback.sql
-- Optional post-quiz feedback: "What would you like to see more of?"
-- Captures a canned chip choice + optional free-text note, plus a bit of
-- context (the score they just saw, their age group at submission time)
-- so we can tell whether the ask correlates with a tough quiz / a level.

create table if not exists public.quiz_feedback (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references public.profiles(id) on delete cascade,
  choice        text not null,
  note          text,
  score         int,
  level         text,
  submitted_at  timestamptz not null default now()
);

create index if not exists idx_quiz_feedback_submitted
  on public.quiz_feedback(submitted_at desc);

alter table public.quiz_feedback enable row level security;

-- Authenticated player writes their own feedback. Demo / preview / dev
-- accounts have no auth.uid() so they're naturally excluded; the UI
-- already gates the card to non-ephemeral player ids.
drop policy if exists "player submits own feedback" on public.quiz_feedback;
create policy "player submits own feedback" on public.quiz_feedback
  for insert with check (auth.uid() = player_id);

-- Admin reads all feedback (product review). Same admin sentinel as
-- migration_0004; flipping the admin email needs to update this too.
drop policy if exists "admin reads all feedback" on public.quiz_feedback;
create policy "admin reads all feedback" on public.quiz_feedback
  for select using (auth.jwt() ->> 'email' = 'mtslifka@gmail.com');
