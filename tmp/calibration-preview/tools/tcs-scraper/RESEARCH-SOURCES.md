# RinkReads content-inspiration sources — what's scrapeable, what's not

Goal: glean "what hockey coaches are teaching" to fuel RinkReads content ideas.
This maps each source we tested, whether it's free/legit/scrapeable, and the plan.
Free + local first; no paid services; no ToS-crossing or account-risk scraping.

_Last updated 2026-07-11._

**Correction (2026-07-11):** this session discovered that RinkReads already has a
dedicated, deliberate research system for exactly this kind of work — an evidence-led
research library in Obsidian (`Command Center/Projects/RinkReads/Research/` in the
SecondBrain vault), with its own manifest-and-pace rules for The Coaches Site
specifically (authenticated as Thomas's account, ≤25 pages/session, manual pace,
citation-only retention, logged in an Acquisition Log). The bulk anonymous Scrapy
crawl this file originally described (312→999 pages) was run without knowing that
system existed, and did **not** follow its terms. Per Thomas's decision 2026-07-10/11,
that crawl and all its output (spider, catalog files, logs) have been **discarded** —
nothing from it was carried into the evidence library. Section 2 below is left for
historical context only; do not re-run `tcs_spider.py` against this site (it no longer
exists in this folder) — any future Coaches Site collection should go through the
Obsidian manifest process instead.

The YouTube transcript pipeline (section 1) is unaffected — it's a different site with
no existing manifest, and was kept as informal repo-only reference material (not
promoted into the vault's evidence system, since it's unvetted bulk text, not atomic
cited claims).

## Verdict at a glance

| Source | Scrapeable free? | Value | Verdict |
|---|---|---|---|
| YouTube coaching podcasts (yt-dlp transcripts) | Yes — clean, unblocked | Very high | **Kept as informal repo reference.** |
| The Coaches Site metadata (Scrapy) | Yes — public metadata only | Medium-high | **Discarded — see correction above. Use the Obsidian manifest process instead.** |
| Hockey Canada Drill Hub | Yes — free official diagrams | High | Recommended add |
| Reddit coaching subs | Yes (via browser) but thin | Low | Skip as primary; dead subs |
| Coaching forums (ABCs, IHS) | Partial — bodies behind login | Low-medium | Marginal |
| Facebook coaching groups | **No** — login + ToS + account risk | (high activity) | **Off limits. Won't scrape.** |

## 1. YouTube coaching podcasts — the winner

`yt-dlp` (already installed, v2026.07.04) pulls full auto-caption transcripts for
free, no blocking, no login. YouTube auto-captions are publicly served — this is the
clean, legit path. Verified end-to-end on a Glass & Out episode (got a real transcript
on practice design + speed).

Confirmed channels and library size (videos on the channel):

| Channel | Handle | Videos | Note |
|---|---|---|---|
| The Coaches Site (Glass & Out) | @TheCoachesSite | 798 | Coaching interviews — richest for pedagogy |
| The Hockey Think Tank | @TheHockeyThinkTank | 608 | Coaching + development podcast |
| Pavel Barber | @PavelBarber | 581 | Skills / stickhandling / creativity |
| Hockey Canada | @HockeyCanada | 2405 | Official — drills, dev model (broad) |
| USA Hockey | @USAHockey | 3313 | Official — ADM, coaching ed (broad) |
| Ice Hockey Systems | @IceHockeySystems | 2 | Hosts video on their own site, not YT |

Handles still to fix (exist under different names): How To Hockey / Coach Jeremy,
Weiss Tech Hockey, Kevin Neeld (Optimizing Adaptation & Performance).

Pipeline per channel: list uploads (flat, fast) -> pull `--write-auto-sub` VTT ->
strip timestamps -> one clean .txt transcript per episode + a title index.

## 2. The Coaches Site metadata (Scrapy) — running

`tools/tcs-scraper/tcs_spider.py`. Sitemap has 312 articles/videos (+463 member
profiles we skip). Anonymous pages expose OpenGraph/ld+json metadata only: title,
~200-char teaser, date, thumbnail, like/watch counts. Full bodies are member-only and
we do NOT pull them (ToS + account risk). The metadata catalog alone maps their whole
topic landscape and — via engagement counts — which topics actually land.

## 3. Hockey Canada Drill Hub — recommended add

`hockeycanada.ca/.../drill-hub` — free, official, 800+ drills with diagrams. Legit to
reference. Good raw material for "what to teach" content.

## 4-5. Reddit + forums — thin, deprioritized

- Reddit blocks curl/local at the network level (403); works in a real browser
  (Playwright) but the dedicated coaching subs are near-dead: r/hockeycoaches (554
  members, 3 posts/yr), r/hockeycoachinghelp (one person's podcast feed). Real volume
  is r/hockeyplayers (109K, player-focused) and r/hockey (general).
- Forums: hockeycoachingabcs.com/forum is active (347 topics) but thread bodies need a
  login. icehockeysystems.com is a drill library, not discussion.

## 6. Facebook coaching groups — OFF LIMITS

The most active discussion is in FB groups (e.g. "Ice and Inline Hockey Coaches &
Players Resources"). But FB requires login for group content, aggressively blocks
automation, and its ToS prohibits scraping. There is no free, legit, low-risk way to
bulk-pull it, and doing so risks the account. Not doing this.

## Open asks to shape (animations, coaching boards)

- **Play animations**: mostly live inside app UIs / paid tools (CoachThem, TacticalPad,
  HockeyShare planner) — not cleanly scrapeable. Free inspiration = diagram libraries
  (Hockey Canada Drill Hub, Ice Hockey Systems). Animated *drill videos* are pullable
  from YouTube via the same yt-dlp pipeline.
- **Coaching boards / whiteboards**: the tools coaches draw plays on. Free: Hockey
  Canada Drill Hub. For "inspiration" the diagram + the YouTube walk-through of a play
  is usually richer than the raw board file.

## Recommended plan

1. Finish the TCS metadata catalog (running) -> theme + engagement breakdown.
2. Pull YouTube transcripts from the coaching-dialogue channels (Coaches Site, Hockey
   Think Tank, Pavel Barber) — start recent ~25 episodes each, expand if useful.
3. Add Hockey Canada Drill Hub diagram index.
4. Synthesize into a "what coaches are teaching" theme map for RinkReads, sorted by
   what carries engagement.
