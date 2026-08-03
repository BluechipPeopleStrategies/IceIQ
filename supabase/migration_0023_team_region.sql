-- Migration 0023: region on teams
--
-- Free text a coach sets once per team ("Edmonton", "Zone 5", "NAIT district").
-- It is substituted into the top rungs of the self-rating scale, e.g.
-- "Among the best in my age group in Edmonton."
--
-- Deliberately free text rather than an enum: the coach frames it however their
-- hockey world actually works, which is more honest than us imposing a
-- denominator we cannot verify (Thomas, 2026-08-03).
--
-- Nullable on purpose. Most players are on no team at all today, so the missing
-- case is the COMMON path, not an edge case -- renderAnchor() drops the whole
-- clause when it is absent rather than printing "in ." Nothing breaks unset.
--
-- Additive and non-destructive: no existing row changes, no policy changes.
-- Paste into Supabase Dashboard -> SQL Editor -> Run. Idempotent.

alter table public.teams add column if not exists region text;

comment on column public.teams.region is
  'Free-text region the coach defines, substituted into self-rating anchors. Nullable; absent is normal.';
