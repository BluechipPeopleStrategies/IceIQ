# RinkReads / IceIQ — Day-One MVP Recommendations

Date: 2026-06-04
Author: research + product synthesis

## Context

- Live: https://ice-iq.vercel.app — currently renders only the headline ("RinkReads — Know the Game. Own Your Development.") to a crawler; the bank is wiped, so a real visitor lands on the EmptyBankScreen. **The single biggest day-one risk is launching with no content.**
- App model: scenario-based youth-hockey decision trainer (U7–U18), image-first overlay questions (OverlayLayer.jsx), localStorage-only React/Vite app on Vercel.
- Wedge vs. the market: free, browser-based, phone-friendly. Competitors are paid and/or hardware-gated (see below).

## What the market is actually asking for (research findings)

Convergent themes across USA Hockey, The Coaches Site, Ice Hockey Systems, Edge Ice Academy, and competitor product pages:

1. **Scanning / head-up awareness is THE cited core skill.** "Players with more hockey sense first take a look away from the puck to check their surroundings." Repeated everywhere as the #1 trainable habit. ([USA Hockey](https://www.usahockey.com/news_article/show/1296361), [Hockey Training](https://hockeytraining.com/improve-hockey-sense/))
2. **Parents want simple at-home reinforcement.** "Hockey IQ is built through small conversations, simple video clips, and diagrams reviewed at home... when players visualize the game outside practice, they internalize it faster." ([The Coaches Site](https://members.thecoachessite.com/article/building-hockey-iq-off-the-ice-how-parents-can-reinforce-learning-at-home))
3. **Position- and age-specific learning.** "A young defenseman should study how pros close gaps, pivot, and move the puck." U10/U12 have distinct development philosophies. ([Edge Ice Academy](https://www.edgeiceacademy.com/article/how-to-build-hockey-iq-teaching-players-to-think-the-game), [Ice Hockey Systems](https://www.icehockeysystems.com/education/philosophies/u12-development))
4. **Decisions must be taught, not just drilled.** "Small-area games don't teach hockey sense on their own... decision-making requires information." The teaching/"why" layer is the value, not the quiz itself. ([The Coaches Site](https://members.thecoachessite.com/article/small-area-games-don-t-teach-hockey-sense.-coaches-do))
5. **Price/hardware is a wide-open gap.** Sense Arena (official USA Hockey VR tool) is **$33–59/mo + a VR headset**; parents balk at the cost. The closest direct analog to RinkReads is **Prodigy Hockey's "Hockey Sense Quizzes"** ("What Will The Defender Do Next?", "Who Is Open?") and **Project Hockey IQ** (daily lessons). Both validate the exact "what would you do" format RinkReads uses, and none is a free web app. ([Sense Arena pricing](https://hockey.sensearena.com/pricing), [Prodigy Hockey](https://www.prodigy-hockey.com/product/hockey-sense-quizzes/), [Project Hockey](https://www.projecthockey.com/))

---

## The 5 high-ROI MVP features (build now)

### 1. Seed the "Daily Read" — content + a streak loop
Nothing else matters if the app is empty on launch. Ship ~30–50 scenarios and surface them as a **daily set of 3–5 reads with a streak counter**. This fixes the EmptyBankScreen problem AND installs the habit loop that Project Hockey IQ / Duolingo prove drives retention.
- **Why high ROI:** turns a dead screen into a reason to come back tomorrow; the streak is the cheapest retention mechanic that exists.
- **Build:** populate the ledger/bank you wiped; add a "today's set" selector + a localStorage streak count. Mostly content + a thin wrapper on the existing engine.

### 2. 30-second onboarding: pick age (U-level) + position
First scenario should feel made for the player. Ask two questions on first load, store in localStorage, and filter scenarios so a defenseman gets gap/breakout reads and a forward gets support/timing reads.
- **Why high ROI:** position- and age-fit is the #1 thing parents/coaches say they want; it makes scenario #1 land instead of feeling generic. Directly addresses the "study how pros in *your* position do it" demand.
- **Build:** the engine already tags content; add an entry gate + a filter on the tag/curriculum ledger.

### 3. A "why" coaching card after every answer
After the player picks, don't just say right/wrong — show the correct read plus **one line of the principle** ("Face the puck and support the strong side," "Close the gap, don't reach"). This is the difference between a quiz and a trainer, and it's exactly the "small conversation + diagram" parents are told to have at home.
- **Why high ROI:** it's the actual value proposition and the thing every coaching source says is mandatory; also makes results screenshot-worthy (feeds #5).
- **Build:** add an `explanation` field per scenario; render it on the answer reveal.

### 4. A scan/awareness scenario type ("read before you react")
Build at least one scenario mode around scanning: briefly show the play, then ask "where's the open teammate?" or "where's the pressure coming from?" *before* the decision. This maps to the single most-cited hockey-sense skill and is a mechanic no cheap web competitor offers.
- **Why high ROI:** it's your differentiator and your marketing hook ("trains the head-up scan coaches keep yelling about"); leverages OverlayLayer.jsx hotspot tapping you already have.
- **Build:** a variant of the overlay question — tap-the-spot answer + optional reveal timer. Start with a handful; expand later.

### 5. Free shareable scorecard + a "send 5 reads" link (the growth lever)
On finishing a set, generate a clean shareable result ("I scored 4/5 on today's RinkReads — can you beat it?") and let a parent/coach copy a link to a specific set. Drop these into the exact FB groups and subreddits where the "how do I teach my kid hockey IQ" conversations already happen.
- **Why high ROI:** your wedge is *free + no headset* against $33–59/mo VR; a share loop turns that price advantage into day-one organic acquisition in communities that are actively asking for this.
- **Build:** a results card (canvas/CSS-to-image or just a styled screen) + a URL param that preloads a set from localStorage/config. No backend needed.

---

## Suggested day-one priority order
1 (content/streak) and 3 ("why" card) are non-negotiable for a credible launch. 2 (onboarding fit) is the cheapest "wow." 4 (scan mode) is the differentiator to lead marketing with. 5 (share) is the growth multiplier once 1–4 feel good.

## Sources
- https://www.usahockey.com/news_article/show/1296361
- https://hockeytraining.com/improve-hockey-sense/
- https://members.thecoachessite.com/article/building-hockey-iq-off-the-ice-how-parents-can-reinforce-learning-at-home
- https://members.thecoachessite.com/article/small-area-games-don-t-teach-hockey-sense.-coaches-do
- https://members.thecoachessite.com/article/teaching-for-decision-making-not-just-execution
- https://www.edgeiceacademy.com/article/how-to-build-hockey-iq-teaching-players-to-think-the-game
- https://www.icehockeysystems.com/education/philosophies/u12-development
- https://www.icehockeysystems.com/blog/coaching-tips/12-small-area-games-practice-decision-making
- https://hockey.sensearena.com/pricing
- https://www.prodigy-hockey.com/product/hockey-sense-quizzes/
- https://www.projecthockey.com/
- https://www.usahockeyintelligym.com/
