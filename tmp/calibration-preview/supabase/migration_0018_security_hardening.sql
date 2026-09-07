-- Migration 0018 — Security hardening (Supabase Security Advisor cleanup)
--
-- Resolves three SQL-side advisor findings. Paste into Supabase Dashboard →
-- SQL Editor → New query → Run. Idempotent; safe to re-run.
--
--   1. record_question_answer(text, boolean) — a SECURITY DEFINER function that
--      was executable by the `anon` role. The original intent (migration_0003)
--      was authenticated-only ("anon players in demo don't hit this"); the live
--      grant had drifted to include anon. We revoke anon + public and keep the
--      authenticated grant.
--
--      SECURITY DEFINER is kept on purpose: question_stats has RLS with a
--      read-only policy and no write policy, so this function is the single,
--      constrained, +1-increment write path. Its search_path is already pinned
--      (migration_0003), so it is not exploitable via search_path hijacking.
--      The remaining advisor note ("authenticated can call a DEFINER fn") is the
--      expected, intentional cost of this controlled-write telemetry pattern.
--
--   2. set_updated_at() — had a role-mutable search_path. Redefined below with a
--      pinned, empty search_path. This supersedes the identical inline
--      definitions in migrations 0012 / 0013 / 0016 / 0017 (functions are keyed
--      by name, so the last definition to run wins, and this migration runs last).
--
-- A fourth finding — leaked-password protection (HaveIBeenPwned) — is an Auth
-- dashboard setting, not SQL. Toggle it in:
--   Dashboard → Authentication → Providers → Email → "Leaked password protection"
--   (older UIs: Authentication → Policies / Settings).

-- ─────────────────────────────────────────────
-- 1. record_question_answer — restrict to authenticated only
-- ─────────────────────────────────────────────
revoke all    on function public.record_question_answer(text, boolean) from public;
revoke all    on function public.record_question_answer(text, boolean) from anon;
grant  execute on function public.record_question_answer(text, boolean) to authenticated;

-- ─────────────────────────────────────────────
-- 2. set_updated_at — pin search_path (clears the mutable search_path advisory)
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();   -- now() resolves from pg_catalog (always implicitly on path)
  return new;
end;
$$;
