-- Migration 0012: Admin dashboard foundation (Session 1 of 4)
-- See ADMIN_BUILD_BRIEF.md and ADMIN_DASHBOARD.md for context.
--
-- Creates:
--   * profiles.is_admin column (extends existing profiles table)
--   * pov_images table (POV scenario images)
--   * questions table (unified text + POV questions)
--   * shared set_updated_at() trigger function
--   * RLS policies that gate read access to Live + non-killed content,
--     and grant admins full write access via profiles.is_admin = true.
--
-- Paste into Supabase Dashboard → SQL Editor → New query → Run.
-- Idempotent: safe to re-run (uses if not exists / drop policy if exists).

-- ─────────────────────────────────────────────
-- 1. ADMIN FLAG ON EXISTING PROFILES TABLE
-- ─────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ─────────────────────────────────────────────
-- 2. SHARED updated_at TRIGGER FUNCTION
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 3. POV_IMAGES
-- ─────────────────────────────────────────────
create table if not exists public.pov_images (
  id text primary key,                          -- e.g. 'IMG-2v1-001'
  archetype text not null,                      -- e.g. '2-on-1 Rush'
  variant text,                                 -- 'A' | 'B' | 'C' | 'D'
  cognitive_skill text,                         -- 'Decision-Making' | 'Reading the Play' | 'Spatial Awareness'
  age_groups text[] not null default '{}',      -- ['U7','U9','U11','U13']
  position text[] not null default '{}',        -- ['Forward','Defense','Goalie','Any']
  pov_type text,                                -- 'Puck Carrier' | 'Off-Puck Support' | 'Defender' | 'Goalie'
  zone text,                                    -- 'DZ' | 'NZ' | 'OZ'
  numerical_state text,                         -- 'Even' | '+1 Advantage' | etc.
  read_trigger text,
  distractors text,
  full_prompt text,
  negative_prompt text,
  generation_tool text,                         -- 'Midjourney' | 'DALL-E 3' | etc.
  tool_settings text,
  image_url text,                               -- public URL (Supabase storage in session 3)
  variants_generated int not null default 0,
  read_clarity text not null default 'Untested',-- 'Untested' | 'Pass' | 'Fail'
  status text not null default 'Draft',         -- 'Draft' | 'Generated' | 'Testing' | 'Approved' | 'Live' | 'Killed'
  notes text,
  killed_at timestamptz,                        -- soft delete
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pov_images_archetype_idx on public.pov_images(archetype);
create index if not exists pov_images_status_idx    on public.pov_images(status);
create index if not exists pov_images_killed_at_idx on public.pov_images(killed_at);

drop trigger if exists pov_images_updated_at on public.pov_images;
create trigger pov_images_updated_at
  before update on public.pov_images
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. QUESTIONS
-- ─────────────────────────────────────────────
-- Single table for both legacy text questions (migrated from
-- src/data/questions.json) and the new POV image questions. The
-- `legacy_source` column preserves the original questions.json shape
-- for rink-type questions (zone-click, drag-target, hot-spots, etc.)
-- whose schemas don't fit the brief's `format` enum cleanly. Session 4
-- will use it to rehydrate those questions for the live engine.
create table if not exists public.questions (
  id text primary key,
  type text not null default 'text',            -- 'text' | 'pov_image'
  linked_image_id text references public.pov_images(id) on delete set null,
  age_groups text[] not null default '{}',      -- ['U7','U9'] — multi-age supported
  format text not null,                         -- 'Multiple Choice' | 'True/False' | 'Hotspot' | 'Multi-Select' | 'Open Response' | 'Sequence'
  difficulty text,                              -- 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite'
  question_text text not null,
  options jsonb not null default '[]',          -- [{label:'A', text:'...'}, ...]
  correct_answer text,                          -- 'A' or 'A,C' for multi-select or full text for open response
  explanation text,
  concepts text[] not null default '{}',        -- ['Pass vs Shoot']
  status text not null default 'Draft',         -- 'Draft' | 'Approved' | 'Live' | 'Flagged' | 'Killed'
  is_auto_graded boolean not null default true,
  hotspot_coords jsonb,                         -- {x, y, radius}
  sequence_items jsonb,                         -- ordered array
  flagged_reason text,
  killed_at timestamptz,                        -- soft delete
  legacy_source jsonb,                          -- original questions.json row, when migrated from legacy bank
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_type_idx          on public.questions(type);
create index if not exists questions_linked_image_idx  on public.questions(linked_image_id);
create index if not exists questions_status_idx        on public.questions(status);
create index if not exists questions_age_groups_idx    on public.questions using gin(age_groups);
create index if not exists questions_concepts_idx      on public.questions using gin(concepts);
create index if not exists questions_killed_at_idx     on public.questions(killed_at);

drop trigger if exists questions_updated_at on public.questions;
create trigger questions_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table public.pov_images enable row level security;
alter table public.questions  enable row level security;

-- Authenticated users can read Live, non-killed content (for the live app
-- in session 4). Service role bypasses RLS, so migration scripts work
-- regardless.
drop policy if exists pov_images_read_published on public.pov_images;
create policy pov_images_read_published on public.pov_images
  for select to authenticated
  using (status = 'Live' and killed_at is null);

drop policy if exists questions_read_published on public.questions;
create policy questions_read_published on public.questions
  for select to authenticated
  using (status = 'Live' and killed_at is null);

-- Admins (profiles.is_admin = true) can do anything. Wrapped in EXISTS so
-- the policy plays nicely with the JWT-only auth.uid() lookup.
drop policy if exists pov_images_admin_all on public.pov_images;
create policy pov_images_admin_all on public.pov_images
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

drop policy if exists questions_admin_all on public.questions;
create policy questions_admin_all on public.questions
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- ─────────────────────────────────────────────
-- 6. POST-MIGRATION
-- ─────────────────────────────────────────────
-- After this migration runs, grant Thomas admin access via:
--   node scripts/grant-admin.mjs <thomas-email>
--
-- Or manually in the SQL editor:
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'mtslifka@gmail.com');
