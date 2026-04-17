# IceIQ — Claude Code Instructions

## What this project is

IceIQ is a youth hockey player development app. Players answer hockey IQ questions across age groups, build knowledge through an adaptive engine, track progress, and set SMART goals. Coaches can view roster-level data on the Team tier.

Live URL: ice-iq.vercel.app  
Repo: BluechipPeopleStrategies/IceIQ  
Stack: React + Vite + Vercel  
Dev environment: Claude Code in PowerShell (Windows)

---

## Architecture — read this before touching anything

STRICT ARCHITECTURE: > - Root: src/App.jsx (Single-file ONLY).

NO /components folder. NO refactoring.

State: localStorage only. NO backend/API.

---

## Question bank

- 445 total questions across age groups U7, U9, U11, U13
- Includes goalie-specific questions
- Five question formats: multiple choice, true/false, scenario, fill-in-the-blank, image-based
- Questions are tagged by age group, position (forward / defence / goalie), and topic area
- Do not remove or modify existing questions without explicit instruction
- New questions must follow the existing data structure exactly

---

## Pricing tiers — locked spec

### Free (device-locked)
- 1 age group per device install
- Multiple choice format only
- 5 sessions saved in history
- 1 free age group switch allowed
- Annual re-select permitted on September 1 each year (seasonReset flag)
- No position filter, no adaptive engine, no SMART goals, no progress snapshots

### Pro — $12.99 CAD/month or $89.99/year
- 1 child profile
- All age groups (U7–U13)
- All 5 question formats
- Full session history
- Position filter including goalie
- Adaptive engine
- SMART goal tracking
- Shareable progress snapshots
- No coach dashboard

### Family — $19.99 CAD/month or $139.99/year
- Up to 3 child profiles under 1 parent account
- Each profile independently locked (own age group, history, goals)
- All Pro features for each profile
- No coach dashboard

### Team — $49.99 CAD/month or $249.99 season pass (Sept 1–Mar 31)
- Up to 20 players per roster
- All Pro features for every player
- Coach dashboard with individual and aggregate views
- Assign focus areas by position
- Exportable progress reports
- Hard expiry April 1 — read-only mode after expiry
- Re-enrollment prompt triggers August 15

---

## Device locking — implementation rules

Tier enforcement is device-first, not account-first. A new email address must not bypass the free tier age group lock.

**localStorage keys:**

| Key | Purpose |
|-----|---------|
| `iceiq_device_id` | UUID generated on first launch. Never overwrite. Survives logout/re-login. |
| `iceiq_age_group_lock` | Selected age group for free tier. Tied to device, not account. |
| `iceiq_switch_count` | Tracks age group switches. Free tier allows 1. After that, trigger Pro prompt. |
| `iceiq_season_reset_year` | Stores year of last September re-select. Reset switchCount to 0 on Sept 1 if year doesn't match current year. |
| `iceiq_child_profiles` | JSON array of child profiles for Family tier. Max 3. |
| `iceiq_season_pass` | Team tier season pass purchase and expiry dates. |
| `iceiq_reenrollment_prompt_shown` | Boolean flag. Show re-enrollment prompt once on August 15. |

**Logic:**
- Free user switches age group → increment `iceiq_switch_count`
- If `iceiq_switch_count` > 1 → block switch, surface Pro upgrade prompt
- On app load, check if current date is Sept 1 or later and `iceiq_season_reset_year` !== current year → allow one free re-select, reset switch count, write current year to `iceiq_season_reset_year`
- Team tier: on app load, check `iceiq_season_pass.expiryDate` → if past April 1, set `readOnly: true`

---

## Tier enforcement — feature gate rules

All feature gating runs through a single `canAccess(feature, currentTier)` check. Do not scatter tier logic throughout the app. Gate features in one place.

**Upgrade prompt copy by feature:**

| Feature | Prompt |
|---------|--------|
| positionFilter | "Filter by position with IceIQ Pro" |
| allAgeGroups | "Unlock all age groups with IceIQ Pro" |
| adaptiveEngine | "Get smarter practice with IceIQ Pro's adaptive engine" |
| smartGoals | "Set and track SMART goals with IceIQ Pro" |
| progressSnapshots | "Share your progress with IceIQ Pro" |
| fullSessionHistory | "See your full history with IceIQ Pro" |
| additionalProfiles | "Add up to 3 players with the IceIQ Family plan" |
| coachDashboard | "Track your full roster with IceIQ Team" |

**Never hard-block mid-session.** Surface upgrade prompts at the moment a gated feature is tapped — do not interrupt an active question session.

---

## Natural upgrade triggers

Build these moments into the UX. They are not popups — they are contextual prompts that appear at the right time:

- User taps position filter (free/unverified) → Pro prompt
- User tries to switch age group after free switch used → Pro prompt
- User views session 6+ in history → Pro prompt
- ~80% of free tier question pool seen → adaptive engine Pro prompt
- User taps "Share progress" → Pro prompt
- User tries to create a second child profile → Family prompt
- Coach tries to view player data without Team tier → Team prompt
- Season pass expires (Apr 1) → re-enrollment prompt

---

## What not to do

- Do not split App.jsx into multiple component files
- Do not add a backend or external database
- Do not modify the question bank structure without instruction
- Do not add npm packages without checking first — keep dependencies minimal
- Do not add hard session caps (daily question limits, etc.) — the free tier limit is depth, not access frequency
- Do not use position: fixed in CSS — causes Vercel iframe rendering issues
- Do not introduce TypeScript — the project is plain JavaScript/JSX
