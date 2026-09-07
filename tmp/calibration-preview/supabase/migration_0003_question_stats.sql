-- Per-question aggregate stats across all users.
-- Shown to players after they answer: "X% of players got this right" (gated to >= 10 attempts).

create table if not exists question_stats (
  question_id text primary key,
  attempts    integer not null default 0,
  correct     integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- Anyone (including anon) can read aggregate stats. No personal data here.
alter table question_stats enable row level security;

drop policy if exists "question_stats read all" on question_stats;
create policy "question_stats read all"
  on question_stats for select
  using (true);

-- Atomic upsert+increment via RPC. Called once per answer.
-- Only authenticated users can record (anon players in demo don't hit this).
create or replace function record_question_answer(p_question_id text, p_correct boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into question_stats (question_id, attempts, correct, updated_at)
  values (p_question_id, 1, case when p_correct then 1 else 0 end, now())
  on conflict (question_id) do update
    set attempts   = question_stats.attempts + 1,
        correct    = question_stats.correct + case when p_correct then 1 else 0 end,
        updated_at = now();
end;
$$;

revoke all on function record_question_answer(text, boolean) from public;
grant execute on function record_question_answer(text, boolean) to authenticated;
