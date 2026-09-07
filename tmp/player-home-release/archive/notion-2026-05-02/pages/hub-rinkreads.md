# 🏒 RinkReads

> Top-level Notion page for the RinkReads / IceIQ workspace. Archived 2026-05-02.
> Original URL: https://www.notion.so/34fc5405e7f681e5a96ff3f11bdd683c

The RinkReads / IceIQ hockey training app workspace. Image-backed scenario questions, the prompt template, the question bank, and the production roadmap all live here.

## Hub & databases

- **RinkReads — POV Image Scenarios Hub** — production system, prompt template, archetype list, workflow checklist (`pages/scenarios-hub.md`)
- **RinkReads Image Library** — visual asset inventory (each image: archetype, age groups, read trigger, status) (`databases/image-library.raw.json`)
- **RinkReads Image Questions** — question content tied to images (one image → many questions) (`databases/image-questions.raw.json`)

## Plans & roadmaps

- **IceIQ — 30-Day MVP Plan** — the sprint plan that scoped the current build (`pages/30-day-mvp-plan.md`)

## Dev workflow (legacy — superseded 2026-05-02)

1. Drop new scenario images in chat → I (Claude) batch-create Notion entries (Image Library + Image Questions)
2. User saves the image PNGs to `public/assets/images/` in the IceIQ repo
3. User runs `npm run sync:questions` → questions.json is regenerated from Notion + preflight
4. User commits + bumps qbLoader cache → live in app

**Status:** Notion was parked on 2026-05-02. The author tool (rinkreads-author) writes directly to questions.json; Notion is no longer source of truth. See `README.md` in this archive for the parking summary.
