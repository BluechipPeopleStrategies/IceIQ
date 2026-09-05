# Phone-accessible review

September 5, 2026. Thomas requested phone access to the new demos. The earlier localhost-only restriction is superseded for these explicitly labelled review routes; this does not admit draft questions into the live curriculum.

Review landing: https://ice-iq.vercel.app/review/

- Arena: https://ice-iq.vercel.app/#practice-arena
- Shootout before: https://ice-iq.vercel.app/#shootout-before
- Shootout now: https://ice-iq.vercel.app/#shootout-now
- Brain Gym: https://ice-iq.vercel.app/#brain-gym
- Character Studio: https://ice-iq.vercel.app/review/characters/
- One-on-one: https://ice-iq.vercel.app/#one-on-one
- Older 2-on-1: https://ice-iq.vercel.app/#legacy-two-on-one

These routes use the existing production deployment, so a phone does not need the desktop's localhost server or Wi-Fi network. No main-app navigation or authenticated learning gate changes. Hosted arena practice uses a fixed device-local preview identity; development retains the active-player integration. Existing animated-play telemetry remains the older device-global local log, not a cloud record. Saves do not sync between devices.

The build packages an explicit allowlist: review landing, Character Studio, four screenshots and six PNG references. Existing public fonts and favicon are reused. It does not publish raw planning documents, manifests, generation prompts, workstation paths or local development-server tools. Source concepts already included in the user-authorized Practice Library remain available.

Hosted AI review returns a clear unavailable result before any network request. The local adapter remains usable in development when configured; production judge deployment remains future work.

Validation before deployment: 155 practice tests and production build pass. Two added tests verify packaged links/images and exclusion of internal documents. A 390 px browser check against the production build exercised landing to arena, coach movement/reason/comparison, unavailable AI with zero judge requests, and navy/gold character switching without overflow. This is phone-sized browser testing, not testing on Thomas's physical phone.
