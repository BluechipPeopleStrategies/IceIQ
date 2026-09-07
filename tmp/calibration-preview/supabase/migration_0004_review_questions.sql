-- Review-questions table: admin-only workspace for curating the question bank.
-- Rows mirror src/data/questions.json entries. Admin edits `current`, sets `status`,
-- and runs scripts/pull-review-to-bank.mjs to rewrite questions.json from `keep` rows.

create table if not exists review_questions (
  id              text primary key,                 -- "u7q1"; tool-created rows get "{age}q{n}"
  level           text not null,                    -- "U7 / Initiation" | "U5 / Timbits" | ...
  age             text not null,                    -- "u5" | "u7" | "u9" | "u11" | "u13" | "u15" | "u18"
  original        jsonb,                            -- frozen seed from questions.json (null for tool-created)
  current         jsonb not null,                   -- editable copy; starts = original for seeded rows
  status          text not null default 'unreviewed',
  created_in_tool boolean not null default false,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users(id),
  constraint review_questions_status_check check (status in ('unreviewed','keep','flag','kill'))
);

create index if not exists review_questions_age_idx    on review_questions (age);
create index if not exists review_questions_status_idx on review_questions (status);

alter table review_questions enable row level security;

-- Admin-only: email match on the JWT. Other users (and anon) get nothing.
drop policy if exists "review_questions admin all" on review_questions;
create policy "review_questions admin all"
  on review_questions for all
  using (auth.jwt() ->> 'email' = 'mtslifka@gmail.com')
  with check (auth.jwt() ->> 'email' = 'mtslifka@gmail.com');
