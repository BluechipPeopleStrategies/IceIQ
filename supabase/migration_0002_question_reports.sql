-- Migration 0002: question reports
-- Run this in Supabase SQL Editor after the initial schema

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  question_id text not null,
  level text,
  reason text not null,
  detail text,
  resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_question_reports_unresolved on public.question_reports(resolved, created_at desc);
create index if not exists idx_question_reports_question on public.question_reports(question_id);

alter table public.question_reports enable row level security;

-- Anyone authenticated can submit a report
drop policy if exists "authenticated can report" on public.question_reports;
create policy "authenticated can report" on public.question_reports
  for insert with check (auth.role() = 'authenticated');

-- Users can see their own reports (optional, for transparency)
drop policy if exists "user sees own reports" on public.question_reports;
create policy "user sees own reports" on public.question_reports
  for select using (auth.uid() = user_id);
