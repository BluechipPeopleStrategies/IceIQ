# Notion archive — 2026-05-02

Cold storage of the RinkReads Notion workspace, captured the day Notion was parked as a source of truth.

## Why this exists

From ~2026-04-27 to 2026-04-29 the workflow was:

1. Generate a hockey scenario image
2. Create a row in **RinkReads Image Library** + 5–10 rows in **RinkReads Image Questions** in Notion (via Claude MCP)
3. `npm run sync:questions` — exported Notion → `src/data/povQuestions.json` → seeded into `src/data/questions.json`

Two issues drove the move away from Notion:

1. **Presigned-S3-URL secret-scanning fiasco (2026-04-28)** — Notion's auto-uploaded `Image File` property returns 1-hour presigned `prod-files-secure.s3` URLs that contain `X-Amz-Credential=ASIA…` strings. GitHub's secret scanner flagged 6 alerts on those (false alarm — keys expire in 60 minutes — but real friction).
2. **Drift** — The author tool (rinkreads-author, FSA-direct writes to `src/data/questions.json`) became canonical for new work, with no read-back to Notion. By 2026-05-02 the live bank had 270 questions and zero `pov-mc` (everything was merged into `mc` with `media.url`); Notion still held the original 280 question rows under the `Q-{archetype}-…` IDs that we just bulk-renamed away.

The archive captures everything before it goes stale.

## Folder map

```
archive/notion-2026-05-02/
├── README.md                                     ← you are here
├── databases/
│   ├── image-library.raw.json                    ← 29 rows, full Notion property shape
│   ├── image-questions.raw.json                  ← 286 rows, full Notion property shape
│   └── image-questions.flat.json                 ← copy of src/data/povQuestions.json (12-prop app shape, 280 q's)
└── pages/
    ├── hub-rinkreads.md                          ← top-level RinkReads hub
    ├── scenarios-hub.md                          ← v2.5 prompt template + camera angles + archetype list
    ├── coach-personas.md                         ← Kincaid / Danno / Marques / Kowalski portrait prompts
    └── 30-day-mvp-plan.md                        ← April-May sprint plan
```

The raw JSON files preserve every Notion property (24 on Image Library, ~13 on Image Questions). Presigned `prod-files-secure.s3` URLs in the `Image File` property are pre-redacted at archive time as `[redacted-presigned-s3-url]` so the JSON can be uploaded anywhere without re-tripping secret scanning.

## What was retired alongside

- `scripts/export-pov-from-notion.mjs` → moved to `scripts/archive/notion-sync/`
- `scripts/migrate-pov-to-supabase.mjs` → moved to `scripts/archive/notion-sync/`
- `scripts/upload-pov-images-to-storage.mjs` → moved to `scripts/archive/notion-sync/`
- `tools/seed-pov-to-bank.mjs` → moved to `scripts/archive/notion-sync/`
- `package.json` npm scripts `sync:questions` / `sync:pov` / `seed:pov` / `pov:upload-images` / `admin:migrate-pov` are renamed `_retired_*` with a one-line note. Restore by removing the `_retired_` prefix and putting the scripts back if you ever rehydrate Notion.

## Pushing this archive to Google Cloud

The directory is self-contained — drop it into any cloud cold-storage you trust. Two options:

### Option A — Google Drive (zero-setup)

Easiest, no `gcloud` required. From your Windows machine:

1. Open File Explorer at `C:\Users\mtsli\IceIQ\archive\notion-2026-05-02`
2. Right-click → **Send to → Compressed (zipped) folder** to make `notion-2026-05-02.zip`
3. Open https://drive.google.com in a browser, sign in as `mtslifka@gmail.com`
4. Create a folder called `RinkReads / Notion Archive` (or wherever you want cold storage to live)
5. Drag `notion-2026-05-02.zip` into the folder

That's it. The zip is ~2 MB.

### Option B — Google Cloud Storage (proper bucket)

Use this if you already have a GCS project, or want stable URLs you can link to from a doc.

Prerequisites: install the Google Cloud SDK (https://cloud.google.com/sdk/docs/install), authenticate, pick a project.

```bash
# One-time setup
gcloud auth login
gcloud config set project <your-project-id>

# Create a bucket (only needed once)
gsutil mb -l US gs://rinkreads-archive

# Upload this archive folder (preserves directory structure)
gsutil -m cp -r archive/notion-2026-05-02 gs://rinkreads-archive/
```

To make it browsable in the GCS console only (private), no extra steps.

To make individual files publicly URL-addressable (for sharing), add per-object public-read or set the bucket to `--uniform-bucket-level-access` and use IAM. Don't make the bucket fully public unless you want the contents indexed by search engines.

### What NOT to upload

- The actual image PNGs in `public/assets/images/` — those are already in the GitHub repo. The archive is metadata-only.
- `src/data/povQuestions.json` is duplicated as `databases/image-questions.flat.json` here, but it ALSO still lives in the IceIQ repo for now (delete from `src/data/` only after confirming nothing reads it; `qbLoader.js` does NOT).

## Restoring from this archive

If you ever want to rehydrate Notion:

1. Restore the `scripts/archive/notion-sync/` files back to `scripts/` and `tools/`.
2. Restore the `_retired_*` npm scripts to their original names in `package.json`.
3. Re-run the export script (it'll over-write `src/data/povQuestions.json` with whatever Notion currently has — note that it'll be stale relative to `src/data/questions.json` since author-tool writes never round-tripped to Notion).

The raw JSON dumps in `databases/` carry the full Notion property shape, so a parallel restore pipeline could re-create the database rows via the Notion API if the live workspace ever gets nuked.

## Notion workspace state at archive time

- Top-level page: **🏒 RinkReads** (`34fc5405e7f681e5a96ff3f11bdd683c`) under workspace root, sibling to **BlueChip Strategic Layout**.
- Children: scenarios-hub (with 2 sub-databases + coach-personas sub-page) + 30-day-mvp-plan.
- Last MCP write to Notion: 2026-04-28 (breakaway image batch).
- Last `npm run sync:questions` run: 2026-04-29 (per `src/data/povQuestions.json` `lastSynced` field — superseded by this archive's fresh dump).
