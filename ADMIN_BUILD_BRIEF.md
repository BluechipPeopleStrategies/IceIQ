# IceIQ Admin Dashboard — Build Brief

This document contains the full context, design decisions, and architecture for building the IceIQ unified admin dashboard. Read this completely before writing any code.

## What we're building (in one sentence)

A protected admin dashboard at `/admin` inside the existing IceIQ app that lets the admin (Thomas) manage all question content — both legacy text-only questions and new POV image-based questions — through a unified inline-edit interface with smart grouping by image.

## Why this exists

IceIQ currently has two parallel content systems:

1. **Existing text-only questions** — stored in `src/data/questions.json`, age-grouped, reviewed via the Supabase `review_questions` table using the `seed-review-questions.mjs` and `pull-review-to-bank.mjs` scripts.
2. **New POV image questions** — currently sitting in two Notion databases (144 questions across 4 images), authored manually in chat sessions.

Managing two systems is unsustainable. The admin dashboard consolidates everything into Supabase as the single source of truth, replacing the Notion workflow and the seed/pull JSON scripts.

## Core design decisions (locked, do not relitigate)

These were decided across long discussion. Don't second-guess them:

1. **Unified single dashboard** — both text and POV questions in one tool, not two separate tools.
2. **Smart grouping by image** as the default for POV content, but groupable by Age or flat list as alternatives.
3. **Each POV image is a separate row** — Variants A/B/C/D of an archetype are 4 distinct images, not nested under a parent.
4. **Image is linked-but-separate from question** in the data model. Image fields (read trigger, generation tool) are edited once on the image record. Question fields are edited per question.
5. **Inline editing only** — no modals, no separate pages. Clicking a row expands the editor in place.
6. **Soft delete by default** — "Kill" moves items to a Trash tab. Hard delete only available from Trash with extra confirmation. 30-second undo toast on kill action.
7. **Multi-age questions allowed** — one question can apply to multiple age groups (e.g. U9 + U11). Stored as array.
8. **Status workflow** — Draft → Approved → Live. Plus Flagged (for revisit) and Killed (soft deleted).
9. **Authorization** — only admin user (Thomas) initially, but build to allow `is_admin` role on any user so coaches can be granted access later.

## Pages of features (in build order)

**Session 1 — Foundation (this brief covers session 1 only):**
- Supabase schema (tables, indexes, RLS policies)
- Admin role flag on existing user/profile table
- Protected `/admin` route shell (just authentication + layout, no content)
- One-time data migration script (Notion → Supabase for 144 POV questions, JSON → Supabase for 500+ text questions)
- README documenting the new architecture

**Session 2 — Questions tab (later):**
- The main unified question list with filters, grouping, search
- Inline editor for all 6 question formats
- Bulk actions

**Session 3 — Images tab (later):**
- POV image library
- Image editor with prompt history, read clarity test
- Image upload to Supabase storage

**Session 4 — Stats + Trash + Engine integration (later):**
- Stats dashboard
- Trash recovery
- Wire dashboard data to the live IceIQ question engine

## Database schema (Supabase)

Use Postgres conventions. Tables go in the `public` schema. RLS enabled on every table.

### Table: `pov_images`

```sql
create table pov_images (
  id text primary key,                        -- e.g. 'IMG-2v1-001'
  archetype text not null,                    -- e.g. '2-on-1 Rush'
  variant text,                               -- e.g. 'A', 'B', 'C', 'D'
  cognitive_skill text,                       -- 'Decision-Making' | 'Reading the Play' | 'Spatial Awareness'
  age_groups text[] default '{}',             -- ['U7','U9','U11','U13']
  position text[] default '{}',               -- ['Forward','Defense','Goalie','Any']
  pov_type text,                              -- 'Puck Carrier' | 'Off-Puck Support' | 'Defender' | 'Goalie'
  zone text,                                  -- 'DZ' | 'NZ' | 'OZ'
  numerical_state text,                       -- 'Even' | '+1 Advantage' | etc.
  read_trigger text,
  distractors text,
  full_prompt text,
  negative_prompt text,
  generation_tool text,                       -- 'Midjourney' | 'DALL-E 3' | etc.
  tool_settings text,
  image_url text,                             -- URL to image in Supabase storage
  variants_generated int default 0,
  read_clarity text default 'Untested',       -- 'Untested' | 'Pass' | 'Fail'
  status text default 'Draft',                -- 'Draft' | 'Generated' | 'Testing' | 'Approved' | 'Live' | 'Killed'
  notes text,
  killed_at timestamptz,                      -- soft delete
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index pov_images_archetype_idx on pov_images(archetype);
create index pov_images_status_idx on pov_images(status);
create index pov_images_killed_at_idx on pov_images(killed_at);
```

### Table: `questions`

This replaces the existing `review_questions` table for new content. The migration script will move existing data over.

```sql
create table questions (
  id text primary key,                        -- e.g. 'u11_2v1_001a1' or 'u9q42'
  type text not null default 'text',          -- 'text' | 'pov_image'
  linked_image_id text references pov_images(id) on delete set null,
  age_groups text[] not null default '{}',    -- ['U7','U9'] — array because multi-age supported
  format text not null,                       -- 'Multiple Choice' | 'True/False' | 'Hotspot' | 'Multi-Select' | 'Open Response' | 'Sequence'
  difficulty text,                            -- 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite'
  question_text text not null,
  options jsonb default '[]',                 -- [{label:'A', text:'...'}, ...]
  correct_answer text,                        -- 'A' or 'A,C' for multi-select or full text for open response
  explanation text,
  concepts text[] default '{}',               -- ['Pass vs Shoot', 'Cross-Ice Read']
  status text default 'Draft',                -- 'Draft' | 'Approved' | 'Live' | 'Flagged' | 'Killed'
  is_auto_graded boolean default true,
  hotspot_coords jsonb,                       -- for hotspot questions: {x, y, radius}
  sequence_items jsonb,                       -- for sequence questions: ordered array
  flagged_reason text,
  killed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index questions_type_idx on questions(type);
create index questions_linked_image_idx on questions(linked_image_id);
create index questions_status_idx on questions(status);
create index questions_age_groups_idx on questions using gin(age_groups);
create index questions_concepts_idx on questions using gin(concepts);
create index questions_killed_at_idx on questions(killed_at);
```

### Auto-update triggers

Both tables get an `updated_at` trigger:

```sql
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger pov_images_updated_at before update on pov_images for each row execute function set_updated_at();
create trigger questions_updated_at before update on questions for each row execute function set_updated_at();
```

### Admin role

Check the existing schema first — there's likely a `profiles` or similar table linked to `auth.users`. Add an `is_admin boolean default false` column. If no profile table exists, create one:

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean default false,
  created_at timestamptz default now()
);
```

Set Thomas's user as admin (find the user_id from `auth.users` first):

```sql
update profiles set is_admin = true where id = 'THOMAS_USER_ID_HERE';
```

The migration script should output the SQL to run for this manually — don't try to do it in code without knowing the user_id.

### Row-Level Security (RLS) policies

```sql
alter table pov_images enable row level security;
alter table questions enable row level security;

-- Anyone authenticated can read non-killed content (for the main app)
create policy pov_images_read_published on pov_images for select to authenticated using (status = 'Live' and killed_at is null);
create policy questions_read_published on questions for select to authenticated using (status = 'Live' and killed_at is null);

-- Admins can do anything
create policy pov_images_admin_all on pov_images for all to authenticated using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);
create policy questions_admin_all on questions for all to authenticated using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
);
```

Service role bypasses RLS, so the migration script (using `SUPABASE_SERVICE_ROLE_KEY`) will work without policy issues.

## Data migration

### Source 1: Notion → `pov_images` and `questions`

The 144 POV questions and 4 images are currently in Notion. Don't try to access Notion directly — the export script attempt failed earlier in the session. Instead:

1. Ask Thomas to provide a JSON export of the Notion data (or do the export from chat using Notion access in a separate Claude session)
2. The expected format is documented in `scripts/export-pov-from-notion.mjs` (already in the repo) — it produces a structure like:

```json
{
  "version": "1.0",
  "lastSynced": "...",
  "counts": { "images": 4, "questions": 144 },
  "images": [
    {
      "id": "IMG-2v1-001",
      "archetype": "2-on-1 Rush",
      "cognitiveSkill": "Decision-Making",
      "ageGroups": ["U7","U9","U11","U13"],
      "questions": [
        {
          "id": "u7_2v1_001a1",
          "ageGroup": "U7",
          "format": "Multiple Choice",
          "difficulty": "Beginner",
          "questionText": "...",
          "options": [{"label":"A","text":"..."}],
          "correctAnswer": "B",
          "explanation": "...",
          "concepts": ["Pass vs Shoot"],
          "isAutoGraded": true
        }
      ]
    }
  ]
}
```

3. Build a migration script `scripts/migrate-pov-to-supabase.mjs` that reads this JSON and inserts into `pov_images` and `questions` tables. Make it idempotent (safe to re-run).

### Source 2: `src/data/questions.json` → `questions` table

The existing 500+ text questions need to come into the new `questions` table.

Existing format from `pull-review-to-bank.mjs`:

```json
{
  "U7 / Initiation": [{ id, question_text, options, correct_answer, ... }],
  "U9 / Novice": [...],
  ...
}
```

Map age levels to the new `age_groups` array format:
- "U5 / Timbits" → ["U5"]
- "U7 / Initiation" → ["U7"]
- "U9 / Novice" → ["U9"]
- "U11 / Atom" → ["U11"]
- "U13 / Peewee" → ["U13"]
- "U15 / Bantam" → ["U15"]
- "U18 / Midget" → ["U18"]

Set `type = 'text'`, `linked_image_id = null`, `status = 'Live'` (these are already shipped).

Build a script `scripts/migrate-text-to-supabase.mjs` that reads `src/data/questions.json` and bulk-inserts. Idempotent via `on conflict (id) do nothing`.

### What about the existing `review_questions` table?

Don't drop it yet. Migration script preserves any review state by reading from `review_questions` instead of `questions.json` if `review_questions` has more recent data. After session 4 confirms the new dashboard works end-to-end, a follow-up session can drop `review_questions` and the old seed/pull scripts.

## Frontend: admin route

Add a new route at `/admin` to the existing React Router setup.

### Authentication guard

```jsx
// src/admin/AdminRoute.jsx
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase"; // or wherever the client is initialized

export function AdminRoute({ children }) {
  const [state, setState] = useState({ loading: true, isAdmin: false });

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ loading: false, isAdmin: false });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      setState({ loading: false, isAdmin: profile?.is_admin === true });
    }
    check();
  }, []);

  if (state.loading) return <div>Loading...</div>;
  if (!state.isAdmin) return <Navigate to="/" replace />;
  return children;
}
```

### Empty admin shell for session 1

Build the layout shell with sidebar/header/main but no actual content yet:

```jsx
// src/admin/AdminLayout.jsx
export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header>
        <h1>IceIQ Admin</h1>
      </header>
      <nav>
        {/* Tabs: Questions / Images / Stats / Trash */}
      </nav>
      <main>
        {/* Placeholder: Coming in session 2 */}
      </main>
    </div>
  );
}
```

Use Tailwind (already in the project). Match the existing IceIQ design language — check existing components for patterns.

### Routes

```jsx
// In the main router
<Route path="/admin/*" element={
  <AdminRoute>
    <AdminLayout />
  </AdminRoute>
} />
```

## What NOT to do in session 1

To keep scope manageable:

- **No question editing UI yet** — that's session 2
- **No image editing UI yet** — that's session 3
- **No engine integration yet** — that's session 4
- **No image upload to Supabase storage yet** — questions have URL-only image references for now
- **No coach-facing features** — admin-only for v1
- **No drag-and-drop, no rich text editor, no fancy interactions** — basic forms first

## Files expected to be created/modified in session 1

**New files:**
- `supabase/migrations/YYYYMMDDHHMMSS_admin_schema.sql` — the schema migration
- `scripts/migrate-pov-to-supabase.mjs` — Notion JSON → Supabase
- `scripts/migrate-text-to-supabase.mjs` — questions.json → Supabase
- `src/admin/AdminRoute.jsx` — auth guard
- `src/admin/AdminLayout.jsx` — admin layout shell
- `ADMIN_DASHBOARD.md` — documentation of the new architecture

**Modified files:**
- `src/App.jsx` (or wherever routes are defined) — add `/admin/*` route
- `package.json` — add an `npm run admin:migrate` script if helpful
- `.env.example` — confirm `SUPABASE_SERVICE_ROLE_KEY` is documented (it is)

## Conventions to match

The existing codebase uses these patterns. Match them:

- Scripts are `.mjs` Node modules with `import` syntax
- Scripts load `.env` via the `loadEnv()` helper pattern (see `seed-review-questions.mjs`)
- Supabase client is created via `createClient(url, serviceKey, { auth: { persistSession: false } })` for scripts
- React components use functional components + hooks, no class components
- Tailwind utility classes for styling
- File names: kebab-case for scripts, PascalCase for React components

## Success criteria for session 1

You're done when:

1. ✅ Supabase migration runs cleanly and creates the schema
2. ✅ RLS policies are in place and tested (anonymous queries return nothing, admin queries return everything)
3. ✅ Thomas's user has `is_admin = true` (with the SQL command provided to run manually)
4. ✅ Visiting `/admin` while logged in as Thomas shows the empty admin shell
5. ✅ Visiting `/admin` while logged out or as a non-admin user redirects away
6. ✅ The text question migration script imports all 500+ questions from `src/data/questions.json` into the `questions` table
7. ✅ Either: (a) the POV migration script runs against a provided Notion JSON export, OR (b) the script is built but waiting for the JSON file
8. ✅ Both migration scripts are idempotent — running twice doesn't create duplicates
9. ✅ `ADMIN_DASHBOARD.md` documents the new architecture for future sessions

## Open questions to ask Thomas before you finish

- "Where should the Notion JSON export go? Should I build a placeholder script and you'll provide the file later?"
- "What's the existing user_id for Thomas in `auth.users`? I need it to set is_admin = true."
- "Is there an existing `profiles` table or do I need to create one?"

## Final note

This is session 1 of 4. Don't try to build the entire dashboard in one go. Stop after the success criteria above are met. Future sessions will build the UI on top of this foundation.
