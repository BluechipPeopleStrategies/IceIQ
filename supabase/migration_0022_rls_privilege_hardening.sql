-- Migration 0022: RLS privilege hardening
--
-- Fixes findings from the 2026-08-01 whole-app security review
-- (docs/security/2026-08-01-security-review.md). Paste into Supabase
-- Dashboard -> SQL Editor -> New query -> Run. Idempotent, safe to re-run.
--
-- Ordered by severity. Each section states the hole, the exploit, and why the
-- chosen mechanism is the right one.

-- ─────────────────────────────────────────────────────────────
-- 1. CRITICAL — self-promotion to admin (and to a paid tier)
-- ─────────────────────────────────────────────────────────────
-- schema.sql's "update own profile" policy is `for update using (auth.uid() =
-- id)` with no WITH CHECK and no column restriction. Postgres falls back to
-- the USING expression as the check, so the row's `id` is pinned -- but every
-- OTHER column is freely writable by its owner. Two of those columns are
-- privilege bits:
--
--   * profiles.is_admin (migration_0012) gates `questions_admin_all` and
--     `pov_images_admin_all`, both `for all`. Any signed-in user could run
--     `update profiles set is_admin = true where id = auth.uid()` and gain
--     full read/write/delete over the entire live question bank.
--   * profiles.tier (migration_0009) drives canAccess() paywall gating, so the
--     same one-liner grants TEAM/PRO for free.
--
-- Mechanism: a trigger, not column-level GRANTs. A column REVOKE does not
-- override an existing table-level UPDATE grant -- you would have to revoke
-- UPDATE on the table and re-grant every non-privileged column by name, which
-- silently makes any future column non-updatable. The trigger states the rule
-- once and keeps working as the table grows. Same belt-and-suspenders pattern
-- (and the same pinned search_path) as migration_0020's finalized-draft guard
-- and migration_0018's set_updated_at hardening.
--
-- End users are blocked; the service-role key and the SQL editor are not, so
-- scripts/grant-admin.mjs and manual tier changes keep working.
create or replace function public.reject_client_privilege_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'profiles.is_admin is not client-writable (set it with the service-role key)';
    end if;
    if new.tier is distinct from old.tier then
      raise exception 'profiles.tier is not client-writable (entitlements are granted server-side)';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reject_client_privilege_change on public.profiles;
create trigger trg_reject_client_privilege_change
  before update on public.profiles
  for each row execute function public.reject_client_privilege_change();

-- ─────────────────────────────────────────────────────────────
-- 2. HIGH — anyone signed in could rewrite the question bank
-- ─────────────────────────────────────────────────────────────
-- migration_0017 gated question_overrides writes on `auth.role() =
-- 'authenticated'`, i.e. on being logged in at all -- no ownership, no admin
-- check. Overrides are applied on top of live questions for every player, so
-- one free account could silently change what the whole product teaches.
--
-- Writers are admins or the two owner emails already hardcoded in
-- migration_0019. Both are accepted so this cannot lock the owner out if the
-- is_admin flag is not set on his profile. WITH CHECK also pins editor_email
-- to the caller, so the audit column cannot be forged.
drop policy if exists question_overrides_write_auth on public.question_overrides;
drop policy if exists question_overrides_update_auth on public.question_overrides;
drop policy if exists question_overrides_admin_insert on public.question_overrides;
drop policy if exists question_overrides_admin_update on public.question_overrides;
drop policy if exists question_overrides_admin_delete on public.question_overrides;

create policy question_overrides_admin_insert on public.question_overrides
  for insert to authenticated
  with check (
    lower(auth.jwt() ->> 'email') = lower(editor_email)
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
      or lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
    )
  );

create policy question_overrides_admin_update on public.question_overrides
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    or lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  )
  with check (
    lower(auth.jwt() ->> 'email') = lower(editor_email)
    and (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
      or lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
    )
  );

create policy question_overrides_admin_delete on public.question_overrides
  for delete to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    or lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

-- ─────────────────────────────────────────────────────────────
-- 3. HIGH — any user could join any team and read minors' rosters
-- ─────────────────────────────────────────────────────────────
-- Two policies combined into a children's-PII exposure:
--
--   * teams: "authenticated can lookup team by code" is `for select using
--     (auth.role() = 'authenticated')` -- despite the name it does not check a
--     code at all. Every signed-in user could read EVERY team row, including
--     its join `code`.
--   * team_members: "player manages own membership" is `for all using
--     (auth.uid() = player_id)`, which for INSERT only requires that the row
--     be about yourself -- not that you knew the team's code. So a user could
--     insert themselves into any team_id directly.
--
-- Once on a team, schema.sql's "read teammates profile" exposes those
-- teammates' profile rows. The roster is youth hockey players, so this is
-- names and birth years of minors readable by any account that signs up.
--
-- Fix: joining moves behind a SECURITY DEFINER function that requires the
-- actual code, and the blanket read/insert paths are withdrawn. The function
-- is the only way in, so possession of the code becomes a real gate instead of
-- a decorative one.
create or replace function public.join_team_by_code(p_code text)
returns public.teams
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team public.teams;
begin
  if auth.uid() is null then
    raise exception 'must be signed in to join a team';
  end if;

  select * into v_team from public.teams where code = upper(trim(p_code));
  if not found then
    raise exception 'Team not found';
  end if;

  insert into public.team_members (team_id, player_id)
  values (v_team.id, auth.uid())
  on conflict do nothing;

  return v_team;
end;
$$;

revoke all    on function public.join_team_by_code(text) from public, anon;
grant  execute on function public.join_team_by_code(text) to authenticated;

-- Teams are readable by their coach and their own members. Lookup-by-code now
-- happens inside join_team_by_code(), which runs as definer and is not
-- constrained by this policy.
drop policy if exists "authenticated can lookup team by code" on public.teams;
drop policy if exists "coach or member reads team" on public.teams;
create policy "coach or member reads team" on public.teams
  for select using (
    auth.uid() = coach_id
    or exists (
      select 1 from public.team_members tm
      where tm.team_id = teams.id and tm.player_id = auth.uid()
    )
  );

-- Membership: you may see and leave your own; you may no longer insert
-- yourself directly. join_team_by_code() performs the insert.
drop policy if exists "player manages own membership" on public.team_members;
drop policy if exists "player reads own membership" on public.team_members;
drop policy if exists "player leaves own team" on public.team_members;

create policy "player reads own membership" on public.team_members
  for select using (auth.uid() = player_id);

create policy "player leaves own team" on public.team_members
  for delete using (auth.uid() = player_id);

-- ─────────────────────────────────────────────────────────────
-- 4. MEDIUM — internal review tables were world-readable
-- ─────────────────────────────────────────────────────────────
-- migration_0014 and migration_0015 set `for select using (true)` with no
-- `to authenticated` clause, so both tables were readable with the anon key --
-- which ships in the client bundle and is public by design. That exposed
-- internal review verdicts, confidence scores, reviewer notes, and the
-- iteration feedback log to anyone on the internet.
--
-- The client only reads these from the owner dashboard (listCoachReviews /
-- listFeedbackLog in src/supabase.js), and both return [] on error, so a
-- non-owner now simply sees an empty list rather than an error.
drop policy if exists coach_reviews_read on public.coach_reviews;
drop policy if exists coach_reviews_read_admin on public.coach_reviews;
create policy coach_reviews_read_admin on public.coach_reviews
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    or lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

drop policy if exists feedback_log_read on public.feedback_log;
drop policy if exists feedback_log_read_admin on public.feedback_log;
create policy feedback_log_read_admin on public.feedback_log
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    or lower(auth.jwt() ->> 'email') in ('mtslifka@gmail.com', 'thomas@bluechip-people-strategies.com')
  );

-- ─────────────────────────────────────────────────────────────
-- 5. LOW — report attribution could be forged
-- ─────────────────────────────────────────────────────────────
-- migration_0002's insert policy checks only that the caller is signed in, so
-- user_id could be set to somebody else's id, planting reports under another
-- user's name. Pin it to the caller.
drop policy if exists "authenticated can report" on public.question_reports;
create policy "authenticated can report" on public.question_reports
  for insert to authenticated
  with check (auth.uid() = user_id);
