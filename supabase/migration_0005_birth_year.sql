-- Migration 0005 — birth_year + signup_mode on profiles
-- ─────────────────────────────────────────────────────────
-- Run this in the Supabase SQL editor once. Existing rows are fine
-- with both columns NULL — the app falls back to profiles.level for
-- display when birth_year is absent, and signup_mode is purely
-- advisory (drives wizard pronoun copy on later visits).
-- Safe to re-run: `if not exists` guards both columns.

alter table public.profiles
  add column if not exists birth_year int;

alter table public.profiles
  add column if not exists signup_mode text
    check (signup_mode in ('self','parent'));

-- No policy changes needed — existing row-level security on profiles
-- (read own / read teammates) covers these columns automatically.
