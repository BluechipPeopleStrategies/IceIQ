# Coach, goals and training release verification

September 5, 2026. Local release assembled in `tmp/app-development-release` from the committed app with only the named dependency closure. No experimental question banks or Claude packets included.

## Delivered behavior

- Glass goal builder preserves legacy categories and wording, offers editable plans and optional check-ins. U7 uses one adult-assisted next-practice phrase, without SMART fields or numeric exertion.
- Optional perceived effort records zero separately from not reported; neither effort nor check-in completion awards mastery. Extended plan/check-in metadata stays on the device, as stated in the UI.
- Coach assessments scope editing to the author and player, require dated observations for changed ratings, and separate shared examples from private notes. Missing private-note reads lock that editor without blocking the rating workflow or overwriting an unread note.
- Coach assessment navigation hides the roster and opens at the top. The lineup card retains pointer and keyboard movement, with swaps, cancellations and safe persistence.
- Training entries retain stable IDs, all existing history, local dates, zero costs and separate minute/puck totals. Acknowledged cloud upserts, explicit retry and identity/legacy-aware merging prevent retry duplicates. Failed writes remain pending. Sample training survives reload.
- Coach report outages are reported as unavailable, not empty assessments.

## Verification

- 35 core/SQL checks pass: goal plans, coach evidence, lineup gestures, training storage/retry/merge/date boundaries, remote adapters and actual Postgres RLS via PGlite.
- 13 component checks pass: lineup keyboard/pointer/cancel/storage failures and age-aware world navigation.
- Isolated production build passes. Existing large-chunk advisories remain.
- Real browser: U11 check-in saves without navigating home and restores after reload. Explicit RPE 0 displays as 0/10 while older missing values remain missing. Phone viewport 390px has no horizontal overflow.
- Training form initially reproduced the UTC/local-date rejection. After repair, a sample 30-minute session increases history from six to seven and remains seven after reload.
- Coach demo opens its assessment, saves Developing with a dated example, shared next step and separate private note; reopening restores values. Desktop and 390px screenshots inspected. StrictMode lifecycle is handled on effect replay.
- U7 actual dev-preview route shows My next try, one focus, editable starters and no perceived-effort form.
- Production bundle on local port 5181 opens the sample GoalBuilder at 390px without overflow.

## Outstanding external verification

Migration `supabase/migration_0024_coach_privacy_training.sql` passes synthetic access-boundary tests and repeat application locally. It has NOT been applied remotely: Supabase CLI authentication is unavailable. Legacy private sentinel rows remain subject to existing deployed policies until this migration is deployed. Do not claim remote privacy remediation from the local test alone.

Live authenticated cloud save/restore and remote schema verification remain pending. Browser demos use synthetic records only. Physical mobile devices and assistive-technology sessions were not tested. No deployment is claimed.
