# Coaching podcast theme scan — informal reference, not curriculum evidence

**Status (2026-07-11): superseded/corrected.** This doc originally cross-referenced
podcast transcript themes against The Coaches Site's content-engagement data (likes per
article/video). That TCS data came from an anonymous, automated, 999-page crawl run
before this session knew RinkReads already has a dedicated evidence-led research system
in Obsidian (`Command Center/Projects/RinkReads/Research/`) with its own manifest for
that exact site (authenticated, paced, citation-only). The crawl didn't follow those
terms, so per Thomas's decision it was **discarded** — the engagement rankings and the
content-idea backlog below it are gone, not carried forward. See
`tools/tcs-scraper/RESEARCH-SOURCES.md` for the full correction.

Also: the video/clip content-backlog use case is deprioritized anyway — Thomas clarified
(2026-07-11) that content/marketing rollout for RinkReads is a later phase, not current
work. The current focus is the app's curriculum itself.

**What's left and still valid:** a plain concept-frequency scan over 114 kept YouTube
podcast transcripts (330K words, 5 channels — see `tools/tcs-scraper/transcripts/`).
This is informal, unvetted, repo-only background reading — keyword frequency over
podcast talk, not a corroborated claim. It has **not** been promoted into the vault's
evidence library and shouldn't be treated as curriculum-grade until/unless specific
claims from it are independently corroborated through that system's normal process
(Source → Evidence Note, tier + confidence assigned, cross-checked against other
sources).

---

## Concept frequency across 114 podcast transcripts

Source channels: The Coaches Site (Glass & Out), Hockey Think Tank, Pavel Barber,
Hockey Canada, USA Hockey. Method: keyword/regex tally + data-driven n-grams over
cleaned transcripts (`tools/tcs-scraper/analyze_themes.py` →
`transcripts/theme-analysis.json`).

| Concept | Mentions |
|---|---|
| communication | 930 |
| goaltending | 906 |
| mindset / psychology | 453 |
| passing | 386 |
| shooting | 368 |
| leadership | 340 |
| penalty kill | 269 |
| practice design | 218 |
| skill development | 199 |
| compete / battle | 186 |
| power play | 170 |
| culture | 135 |
| forecheck | 114 |

(Note: "communication" and "goaltending" tallies are inflated by broad keyword matching
— e.g. "net", "talk" — take as rough signal, not precise counts.)

Per-channel skew: **Hockey Think Tank** and **Glass & Out** lean almost entirely
human-side (communication, mindset, leadership). **Pavel Barber** and **USA Hockey**
skew to concrete skills (shooting, passing, puck handling). **Hockey Canada** leans
skills + development model.

**Read with caution:** this only shows what coaches *talk about most* in long-form
podcasts — it says nothing about what's highest-value to teach or what engages an
audience (the engagement half of the original analysis is the part that got discarded).
If this is worth acting on, the individual claims (e.g. "deception is emphasized across
skating/passing/shooting") should go through the vault's real process — checked against
the already-captured USA Hockey Skill Progression Manual and Hockey Canada pathways,
which are actual tier-1 sources with proper citation, not talk-frequency in podcasts.

---

_Full raw material: `tools/tcs-scraper/transcripts/` (114 .txt files + index.json +
theme-analysis.json). Kept as informal reference per Thomas's decision 2026-07-11 —
not registered as a vault source._
