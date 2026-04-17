# IceIQ Context (v2026.4)

## Core Specs
- **Goal:** Youth hockey analytics & IQ development.
- **Stack:** React + Vite (Single-file: `src/App.jsx`).
- **Platform:** Vercel (Auto-deploy on `main`).
- **Environment:** Claude Code (PS/Windows).
- **Architecture:** - STRICT: All logic/UI in `src/App.jsx`. NO `/components` or refactoring.
  - PERSISTENCE: `localStorage` ONLY. NO backend/APIs.
  - CSS: Inline/Style-block. NO `position: fixed`.

## Pricing & Gating (canAccess Logic)
- **Free:** UUID-locked. 1 AgeGroup. 5 Sessions. 1 Switch/Season (Reset Sept 1).
- **Pro ($12.99 CAD):** All groups, 5 formats, Position filters, Adaptive engine, SMART goals, Snapshots.
- **Family ($19.99 CAD):** 3 Child profiles (Independently locked).
- **Team ($49.99 CAD):** 20 players, Coach Dashboard, Reports. Season Pass (Sept 1 - Mar 31). Hard expiry Apr 1 (Read-only).

## Storage Schema (localStorage)
- `iceiq_device_id`: UUID.
- `iceiq_age_group_lock`: Free-tier selection.
- `iceiq_switch_count`: Track switches (Limit: 1).
- `iceiq_season_reset_year`: Current reset cycle.
- `iceiq_child_profiles`: JSON array (Max 3).
- `iceiq_season_pass`: {purchaseDate, expiryDate}.

## Token Optimization (CRITICAL)
- **Context Skip:** `App.jsx` contains 445 questions. Do NOT read lines 50-2100 (approx) unless editing content.
- **Output Rule:** Provide modified snippets ONLY. Use `// ... existing code` placeholders.
- **Yapping:** No preambles. No explanations unless requested. Code-first only.
- **Maintenance:** Run `/compact` after every UI/CSS tweak.

## Usage Triggers
- Surface "IceIQ Pro" prompt on: Position filter tap, >1 age switch attempt, viewing session 6+, 80% pool seen (Adaptive), tapping "Share".
- Family prompt: >1 profile creation.
- Team prompt: Coach view access or Expired Season Pass.
