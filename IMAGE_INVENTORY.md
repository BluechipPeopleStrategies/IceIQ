# Image Inventory & Cleanup Plan

**Generated:** 2026-04-30. Survey of every RinkReads-related image across the user's machine.

---

## Where files live (high level)

| Location | Purpose | State |
|---|---|---|
| `IceIQ/public/assets/images/` | 🟢 **LIVE** production scenes for questions | 22 files, in use |
| `rinkreads-author/public/assets/scenes/` | 🟢 **LIVE** rink backgrounds (Scene Composer) | 3 files, in use |
| `rinkreads-author/public/assets/sprites/` | 🟢 **LIVE** player sprite sheets | 3 active + 2 dupes |
| `IceIQ/public/assets/coaches/` | 🟢 **LIVE** coach portraits | (not surveyed — separate) |
| `IceIQ/Pictures/` | 📚 Reference photos | 6 files, not shipped |
| `OneDrive/Desktop/RinkReads Workspace/1. Inbox/` | 📥 Staging area | 2 files (Gemini raws) |
| **`OneDrive/Desktop/assets/`** | ⚠️ **DUPLICATE** of ice-iq assets | 19 files — DELETE |
| **`OneDrive/Desktop/Pre-AI/`** | ⚠️ Older / abandoned work | 8+ files — KEEP for reference, ignore for production |
| **`Downloads/`** | 📦 Generated images, unsorted | 30+ files — needs triage |

---

## What's LIVE (these files are referenced by questions / engine — don't delete)

### Rink backgrounds (3) — rinkreads-author/public/assets/scenes/
- `rink-endzone.png` (1.3 MB) — DZ end-zone view
- `rink-fullrink.png` (1.4 MB) — top-down full rink
- `rink-fullrink-defense.png` (2.1 MB) — top-down DZ focus

### Player sprite sheets (3 active) — rinkreads-author/public/assets/sprites/
- `player-yellow.png` — yellow team skaters (4×2 grid, 8 poses)
- `player-black.png` — black team skaters (4×2 grid, 8 poses)
- `goalie.png` — both team goalies (4×4 grid, 16 poses)

### Question scenes (22) — IceIQ/public/assets/images/

Real scene images bound to live questions:
- `3on2-zone-entry.png` — used by 6 questions
- `breakaway-backchecker-chasing.png` — used by 1
- `breakaway-goalie-challenging.png` — (orphan? no questions ref)
- `breakaway-goalie-deep.png` — used by 1
- `breakaway-goalie-out-of-position.png` — (orphan)
- `dz-breakout-setup.png` — used by 3
- `dz-net-front-collapsed.png` — (orphan)
- `dz-point-coverage-high.png` — (orphan)
- `dz-rush-defense.png` — (orphan)
- `front-of-net-coverage.png` — (orphan)
- `nz-regroup-mid-ice.png` — used by 1
- `oz-net-front-scrum.png` — (orphan)
- `players-positions.png` — used by rink-drag/rink-match questions
- `rink-anatomy-diagram.png` — used by rink-label questions

Penalty diagram graphics (used by rule questions):
- `Boarding.png`, `Charging.png`, `Delayed Penalty.png`

Rink backgrounds duplicated here (probably should NOT be here — should be in scenes/):
- `Rink-Endzone.png`
- `Rink-fullrink-top.png`
- `Full Rink Defense.png`

Unknowns:
- `ChatGPT Image Apr 29, 2026, 01_09_00 PM.png` — orphan, unknown content
- `Unconfirmed 208942.crdownload` — **DELETE** (a partial download from Chrome, broken file)

---

## DELETE — duplicates and dead files

### Sprite folder dupes (rinkreads-author/public/assets/sprites/)
- `Goalie Black Sheet.png` — superseded by goalie.png; **DELETE**
- `Goalie Yellow Sheet.png` — superseded by goalie.png; **DELETE**

### ice-iq images dead files
- `Unconfirmed 208942.crdownload` — broken Chrome download; **DELETE**

### OneDrive Desktop /assets/ (19 files)
This entire folder appears to be a backup/duplicate of ice-iq's images folder. **Delete the whole folder if you're done with the backup**. Files:
- 3on2-zone-entry, breakaway-*, dz-*, nz-*, front-of-net-coverage, rink-anatomy-diagram, players-positions
- Boarding, Charging, Delayed Penalty
- Coach portraits: Danno, Kincaid, Marques (these belong in `IceIQ/public/assets/coaches/` if not already)
- Offsides.png — looks like an additional penalty diagram

**Verify first:** are any of these files NEWER than the ones in `IceIQ/public/assets/images/`? If yes, copy newer to ice-iq before deleting.

### OneDrive Desktop /Pre-AI/ (8+ files)
Old work, "pre-AI" suggests it's been superseded. Move to long-term storage or delete.

### players-positions.png on Desktop ROOT
- Stray file from earlier work. Same content as in ice-iq/images. **DELETE**.

---

## RENAME / RELOCATE — Downloads cleanup

You have **30+ unsorted images in Downloads**. Almost all are AI-generated and need:
1. **Identification** — what's actually in the image?
2. **Renaming** — to a slug like `dz-net-front-2v1.png` instead of `ChatGPT Image Apr 29, 2026, 09_22_49 AM.png`
3. **Relocation** — into the right project folder

### Downloads — what each file likely is (best guess from filename)

**Sprite sheets (probably superseded — verify before deleting):**
- `Black Goalie Sheet.png`, `Goalie Sheet.png`, `Goalie Sprite Sheet.png` — earlier goalie sheet attempts
- `Player Black Sheet.png` — earlier black skater attempt
- `Black Profile player.png` — single-pose black player image

**Coach portraits:**
- `Coach Marques.png` — should be in `IceIQ/public/assets/coaches/marques.png` (verify)

**Question scenes (named):**
- `Eyes up middle ice.png` → probably for IMG-eyesup-001
- `img-pass-nz-1E.png` → for IMG-pass-001
- `IMG-pp-002.png` → for IMG-pp-002
- `IMG-stickoi-001.png` → for IMG-stickoi-001
- `2o1read2.png` → 2-on-1 read variant (one of IMG-2v1-001..004)

**ChatGPT generated, unknown content (24 files):**
- 22 files named `ChatGPT Image Apr [25-29], 2026, [time].png`
- 2 files named with iPhone UUID format (66ED…, 706183…)

**These need YOUR eyes** — they could be anything. I can't tell what's in them without your visual confirmation. Plan: open each, decide what it is, rename + move OR delete.

---

## Recommended action plan

### Step 1 — Quick wins (5 min)
- Delete `Unconfirmed 208942.crdownload` from ice-iq images
- Delete `Goalie Black Sheet.png` + `Goalie Yellow Sheet.png` from rinkreads-author sprites
- Delete `players-positions.png` from Desktop root (it's a duplicate)

### Step 2 — Triage Downloads (~30 min — needs your eyes)
- Open each `ChatGPT Image…` file, decide:
  - Is this a question scene? → rename to `<imageId>-<short-desc>.png`, move to `IceIQ/public/assets/images/`
  - Is this a rink background? → rename to `rink-<view>.png`, move to `rinkreads-author/public/assets/scenes/`
  - Is this trash? → delete
- The named files (`Eyes up middle ice.png`, etc.) are clearly identifiable — rename + move now.

### Step 3 — Decide on `OneDrive/Desktop/assets/`
- Spot-check 2-3 files vs `IceIQ/public/assets/images/`. If identical, delete the Desktop one.
- If newer/different content, the Desktop version may be more recent — copy to ice-iq first.

### Step 4 — Pre-AI folder
- Tell me if you want to keep it (move to a `/archive/` folder somewhere) or delete it.

---

## What I can automate

If you give me a green-light:

1. **Auto-detect duplicates** — checksum every image, find identical files across folders, recommend deletions
2. **Auto-resolve broken question references** — find questions whose `media.url` doesn't exist on disk, flag them
3. **Auto-rename Downloads ChatGPT files** — by you giving me a quick label per file (or via image-content classification, though I can't do AI vision here)

The biggest unblock is **getting the Downloads folder cleared and the named files moved into ice-iq images**. After that, every question that's currently stuck on `/pov-placeholder.svg` can find its real image.

Want me to write that auto-rename + move helper script?
