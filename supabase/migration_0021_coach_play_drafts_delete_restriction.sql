-- Migration 0021: restrict coach_play_drafts delete to draft-status rows
--
-- Narrow coach_play_drafts' delete access: a finalized row is meant to be
-- durable proof (immutable via the existing before-update trigger), but the
-- original "coach manages own team drafts" for-all policy still permitted
-- DELETE on a finalized row -- for-all covers every command, and the
-- immutability trigger only guards UPDATE. Split delete out into its own
-- policy, restricted to status = 'draft'.
-- See docs/superpowers/plans/2026-07-31-coach-authoring-followon-fixes.md
-- Task 4 and the final-review finding it fixes.
--
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run. Idempotent.

drop policy if exists "coach manages own team drafts" on public.coach_play_drafts;

create policy "coach manages own team drafts" on public.coach_play_drafts
  for select using (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

drop policy if exists "coach inserts own team drafts" on public.coach_play_drafts;
create policy "coach inserts own team drafts" on public.coach_play_drafts
  for insert with check (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

drop policy if exists "coach updates own team drafts" on public.coach_play_drafts;
create policy "coach updates own team drafts" on public.coach_play_drafts
  for update using (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  ) with check (
    auth.uid() = coach_id
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );

drop policy if exists "coach deletes own draft-status team drafts" on public.coach_play_drafts;
create policy "coach deletes own draft-status team drafts" on public.coach_play_drafts
  for delete using (
    auth.uid() = coach_id
    and status = 'draft'
    and exists (select 1 from public.teams t where t.id = team_id and t.coach_id = auth.uid())
    and exists (select 1 from public.coach_play_drafts_allowlist a where a.coach_id = auth.uid())
  );
