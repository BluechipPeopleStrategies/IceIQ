-- migration_0009_profile_tier.sql
-- Adds a `tier` column to profiles so real accounts can be marked
-- FREE / PRO / FAMILY / TEAM. Until this runs, resolveTier() reads
-- profile.tier as undefined and everyone defaults to FREE.

alter table public.profiles
  add column if not exists tier text default 'FREE';

alter table public.profiles
  drop constraint if exists profiles_tier_check;

alter table public.profiles
  add constraint profiles_tier_check
  check (tier in ('FREE', 'PRO', 'FAMILY', 'TEAM'));

-- Backfill existing rows that pre-date this column.
update public.profiles set tier = 'FREE' where tier is null;
