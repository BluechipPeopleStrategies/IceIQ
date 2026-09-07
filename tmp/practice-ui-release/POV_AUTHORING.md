# POV Image Scenarios — Authoring Workflow

How to add new POV image scenarios and questions as you generate pictures.

> **Source of truth:** Notion. Everything else (the bundled JSON, Supabase tables, the live app) is downstream of what's in the [RinkReads — POV Image Scenarios Hub](https://www.notion.so/34dc5405e7f68179b9b5dc4ed104c217).
> **Single command to push everything live:** `npm run sync:pov`

## The three things that can happen

### 1. Add a question to an existing image

You're looking at a picture and notice another teaching moment.

1. Open the image's Notion page (RinkReads Image Library → click the row)
2. Scroll to **Linked Questions** → **+ New** → fill in:
   - Question Text
   - Option A / B / C / D
   - Correct Answer (A/B/C/D)
   - Explanation (the why — names the concept and the read)
   - Difficulty (Beginner / Intermediate / Advanced / Elite)
   - Age Group (single select per row — duplicate for multi-age coverage)
   - Concept Tag (multi)
   - Linked Image — should auto-fill since you opened it from the image page
3. From your terminal: `npm run sync:pov`
4. Done — the question is in the bundled bank and Supabase, ready to render in quizzes after the next page reload.

### 2. Add a totally new scenario (new image + 2-3 questions)

You spotted a teaching scenario that isn't represented yet.

1. Open RinkReads Image Library → **+ New** at the bottom of the table
2. Fill in (look at IMG-eyesup-001 for a reference example):
   - **Image ID** — `IMG-{shortcode}-{number}` e.g. `IMG-eyesup-003`
   - **Archetype** — pick one (or add a new option to the schema if your scenario needs it)
   - **Cognitive Skill** — Decision-Making / Reading the Play / Spatial Awareness
   - **Age Group**, **Position**, **POV Type**, **Zone**, **Numerical State**
   - **Read Trigger** — one sentence describing the dominant visual cue
   - **Distractors** — secondary visual elements that add realism but aren't the answer
   - **Full Prompt** — fill in from the master prompt template at the top of the Hub page
   - **Negative Prompt**, **Generation Tool**, **Tool Settings**
   - Status: **Draft**
3. Generate the image with your tool of choice → attach to the **Image File** field
4. Update Status: **Generated**
5. Open Linked Questions database → **+ New** → fill in 1-3 questions tied to this image (use the question fields from path #1)
6. From your terminal: `npm run sync:pov`
7. Done.

### 3. Add an idea to capture later

You're mid-image-generation and you spot something to capture but don't want to lose momentum.

Just paste a one-line idea anywhere — a quick text note, the bottom of the Hub page in Notion, or a bullet in your own scratchpad. Come back to it when you're ready and turn it into a question (path #1) or scenario (path #2).

## What `npm run sync:pov` actually does

Four steps in sequence, takes ~30 seconds total (longer if there are new
images to upload to Storage — those are several MB each):

```
1. node scripts/export-pov-from-notion.mjs        Notion -> src/data/povQuestions.json
2. node scripts/migrate-pov-to-supabase.mjs       JSON   -> Supabase pov_images + questions
3. node scripts/upload-pov-images-to-storage.mjs  Notion S3 -> Supabase Storage (permanent URLs)
4. node tools/seed-pov-to-bank.mjs                JSON (with permanent URLs) -> bundled bank
```

If any step fails it stops there — re-run after fixing whatever Notion thinks is wrong (usually a missing required field or an unknown select option).

## Field cheatsheet — bare minimum to be valid

For an image to make it through the sync chain you need:
- Image ID (title)
- Archetype
- One Age Group
- Status ≠ Rejected

For a question to make it through you need:
- Question ID (title)
- Question Text
- Option A and Option B (C and D optional — the seeder skips empty ones)
- Correct Answer
- Linked Image (relation, points at one image)
- Status ≠ Rejected

Everything else is metadata that helps with later filtering / curation but isn't strictly required.

## After the sync

- **Localhost**: refresh the browser. The Vite dev server picks up `src/data/questions.json` instantly. The qbLoader cache (sessionStorage `rinkreads_qb_cache_v5`) auto-invalidates when the JSON content changes.
- **Vercel**: commit + push the changed `src/data/questions.json` and `src/data/povQuestions.json` (and the Supabase row inserts went live during the sync command). Vercel deploys the new bank on the next build.

## URL durability

Notion's `Image File` URLs are 1-hour presigned S3 links — they expire fast.
The sync chain handles this for you:

- `sync:pov` includes `upload-pov-images-to-storage.mjs`, which downloads
  the bytes from the (still-fresh) Notion S3 URL and re-hosts them in the
  Supabase Storage `pov-images` bucket with a permanent public URL like
  `https://<project>.supabase.co/storage/v1/object/public/pov-images/IMG-…png`.
- The permanent URL is written back to `pov_images.image_url` and mirrored
  into `src/data/povQuestions.json` so the bundled bank ships permanent
  URLs (not expiring ones).
- Re-runs are idempotent: rows already on Storage are no-ops; only new
  images get downloaded and uploaded.

You don't need to do anything special — just attach images in Notion and
run `npm run sync:pov`. The first time a new image gets synced, the chain
both pulls it into Supabase metadata AND moves the bytes to permanent
storage in the same command.

## Templates (suggested, not yet auto-created)

You can speed up path #2 by setting up Notion templates inside each database:

- **Image Library** template — a duplicate-this-row that has the master prompt template pre-filled and Status defaulted to Draft.
- **Image Questions** template — a duplicate-this-row that has Question Format = Multiple Choice and Status = Draft pre-filled, plus 4 empty Option fields.

Set those up via the Notion UI (database → ⋯ menu → New template). One-time work, saves clicks every time you author.
