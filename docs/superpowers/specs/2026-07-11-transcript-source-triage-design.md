# Transcript Source Triage — a new gauntlet entry point for scraped video sources

**Status:** design, approved by Thomas 2026-07-11 · **Date:** 2026-07-11
**Extends:** `tools/gauntlet/` (the existing coach harness), following the same
pattern as `tools/gauntlet-audit.mjs` (`docs/superpowers/specs/2026-06-11-rinkreads-coach-agents-design.md`).
**Goal:** Decide which of ~228 scraped YouTube transcripts are worth mining
for curriculum evidence, without Thomas (or anyone else) reading them by hand,
and without spending unnecessary tokens reading full transcripts that turn
out to be irrelevant.

---

## 1. Why this exists

A prior, out-of-process session ran an unauthorized scrape of 5 YouTube
channels (Hockey Canada, USA Hockey, Hockey Think Tank, Pavel Barber, and a
channel scraped from Thomas's authenticated coaches' site — "coaches-site-
glass-and-out") into `tools/tcs-scraper/transcripts/*/raw/`. Per the
Obsidian Acquisition Log (2026-07-11 entry), Thomas already ruled the
coaches-site scrape out of the authenticated/paced/citation-only manifest
process it should have gone through — but its content may still be worth
pursuing (re-acquired properly) on its own merits. The other 4 channels were
never triaged at all.

Thomas will not personally review ~228 files, and does not want to hand that
review to someone else. The evidence-led curriculum design doc's coach-review
requirement was removed as an *admission gate* on 2026-07-11 (curriculum
admission now runs on documentary support alone) — but a triage pass is still
needed before anyone spends time extracting evidence, or this pile just sits
unprocessed indefinitely.

This spec adds that triage pass, reusing the existing gauntlet coach harness
rather than building a new agent system (locked precedent, see the coach
agents design doc, decisions section).

---

## 2. Scope

**In scope:** deciding PURSUE / MAYBE-then-resolved / SKIP for each unique
scraped transcript, with a one-line rationale and a suggested source tier,
written to a report file.

**Out of scope (this spec):**

- Actually extracting evidence claims or writing Evidence/Source notes —
  that is a separate, later pass a human or a follow-up assisted session
  does using this report as its starting list.
- Auto-writing anything into the Obsidian vault. This mirrors the locked
  `gauntlet-audit` principle: the audit only assesses and queues; nothing is
  auto-edited.
- Cross-referencing every PURSUE candidate against the vault's existing
  Sources/Evidence notes to detect true duplication. The panel can flag
  "looks like standard, already-covered material" from general hockey
  knowledge, but it does not have vault access and cannot guarantee
  non-duplication.
- Re-running the authenticated TCS manifest crawl. That is a separate,
  already-designed workflow (`Research/Manifests/CRAWL - The Coaches Site`).

---

## 3. Input

All `*.en.vtt` files under `tools/tcs-scraper/transcripts/*/raw/` across all
5 channel folders (including `coaches-site-glass-and-out`, per Thomas's
explicit call to re-triage it on content merit even though its acquisition
method was already rejected). `*.en-orig.vtt` siblings are skipped — they are
the same captions in auto-generated form, redundant with `.en.vtt`.

Filenames encode date, title, and a YouTube video ID
(`YYYYMMDD__Title__videoId.en.vtt`); channel is the parent folder name. VTT
cue timestamps and numbering are stripped before anything is shown to a
judge — only the spoken text and the title/channel/date metadata matter for
this pass.

---

## 4. Three-stage funnel

Mirrors the existing `gauntlet-audit` escalation philosophy (Head Coach
gates the room, solo-first, convene only on genuine judgment calls) — here
applied to *read depth* instead of *panel size*, because the cost driver for
this job is transcript length, not debate complexity.

1. **Pre-filter (title/filename, no model call).** A small set of
   deterministic pattern checks catches unambiguous non-candidates: game
   recaps and scores ("Falls in Overtime", "Claim ... Championship"),
   equipment/gear reviews, and pure entertainment/challenge content
   ("Blind Hockey", "Michigan trick shot"). These auto-SKIP with a
   "pre-filtered" rationale and never reach a model call. This is a coarse
   filter — it is expected to under-skip (send borderline cases on to stage
   2) rather than over-skip.
2. **Excerpt judgment (one model call, capped transcript slice).** Every
   survivor gets read against the new rubric (§5) using a bounded excerpt —
   starting point: the first ~80 lines of spoken text plus a ~40-line sample
   from the middle third, capped around 3,000 words total — so token cost
   stays roughly constant regardless of the source video's length. Verdict:
   PURSUE, SKIP, or MAYBE. (Tunable; the smoke run in §8 is where this gets
   sanity-checked against real transcripts.)
3. **Full-read escalation (one additional model call, MAYBE only).** Only
   transcripts the excerpt judge could not confidently place get a second
   pass with the complete transcript text, chunked into ~8,000-word segments
   judged sequentially if the transcript exceeds that, resolving to a final
   PURSUE or SKIP after the last chunk.

Cost scales with how promising something looks: obvious junk costs nothing,
clear passes/fails cost one bounded call, and only genuine judgment calls
cost a second, fuller read.

---

## 5. Rubric (new — not the scenario-content rubric)

A dedicated prompt/rubric file (sibling to the existing `rubric.json` /
`visual-rubric.json`), judging three things per transcript:

1. **Curriculum relevance** — does this concern hockey IQ / decision-making
   content in this project's sense (tactics, systems, small-area games,
   scanning/anticipation, age-banded skill progression), as opposed to game
   results, equipment, or general entertainment?
2. **Source credibility, per-video** — apply the existing Tier 1/2/3
   definitions (`docs/superpowers/specs/2026-07-10-evidence-led-curriculum-research-library-design.md`,
   Source Strategy section) as a **per-video** judgment, not inherited
   automatically from the channel. A Hockey Canada highlight-reel video is
   not the same tier as their official coach-education manuals, even though
   Hockey Canada as an organization is Tier 1.
3. **Apparent novelty** — does this look like it might add something not
   already standard/covered, versus generic material any coaching source
   would say the same way?

**Output constraint (copyright boundary):** every rationale is written in
the judge's own words — a claim/topic summary, never a transcript excerpt.
This follows the existing design doc's rule directly ("retain citation
metadata and original notes rather than copied source files"; "use short
quotations only when necessary and properly attributed"). The triage report
should be safely shareable and committable on its own without raising the
same concerns as the raw transcripts do.

**Special case — `coaches-site-glass-and-out`:** any PURSUE verdict on this
channel gets an appended flag in the report: *valuable, but this copy was
not acquired through the authenticated/paced/citation-only manifest — do
not cite this scraped file directly; re-acquire via the real TCS manifest
workflow first.*

---

## 6. Output

One report per run: `docs/factory/coach-runs/source-triage-YYYY-MM-DD.md`,
grouped by channel folder. Per transcript: filename/title, verdict
(SKIP-prefiltered / SKIP / PURSUE), suggested tier (if PURSUE or the
escalation ran), one-line rationale, and whether it escalated to a full
read. A summary count (pursue / skip / escalated) heads each channel group.

Nothing is auto-written into Obsidian or the Acquisition Log. The report is
the deliverable Thomas (or a follow-up assisted pass) works from to decide
what actually gets mined into real Evidence/Source notes — matching the
locked `gauntlet-audit` principle exactly.

---

## 7. Implementation surface

- `tools/source-triage.mjs` — NEW. Enumerates the 5 channel folders, applies
  the pre-filter, runs the excerpt/escalation judgment via the existing
  `tools/lib/claude-agent.mjs` (model not pinned — inherits the run's
  default, `--coach-model` overrides it, matching the locked convention from
  the coach-agents design), writes the grouped report.
- `tools/gauntlet/source-triage-rubric.json` — NEW rubric file, separate
  from the scenario-content rubric.
- `tools/gauntlet/source-triage-prompts.mjs` — NEW prompt builder:
  title/channel/date + capped excerpt for stage 2, full chunked text for
  stage 3.
- `package.json` — `source:triage` script.
- `docs/factory/coach-runs/` — reused (already exists) as the report output
  directory.
- Reuses: `tools/lib/claude-agent.mjs`, `pool.mjs` for parallel calls. No
  changes to the existing scenario-content gauntlet path.

---

## 8. Testing

- **Pre-filter unit test:** a handful of known obvious-junk titles (game
  recap, gear review, entertainment) resolve to SKIP with zero model calls.
- **Escalation unit test:** mock the agent layer (as existing `*.test.mjs`
  files do via `opts.mockFail` / stubbed responses) so a MAYBE excerpt
  verdict triggers exactly one additional full-read call, and a confident
  PURSUE/SKIP from stage 2 does not.
- **Smoke run:** `source:triage --limit 5` against real files from one
  channel, confirm a grouped report is written in the expected format.
- No changes to existing gauntlet/audit tests; this is purely additive.

---

## 9. Decisions locked (2026-07-11)

- **Job:** triage only (PURSUE / MAYBE / SKIP + rationale + suggested tier).
  Not full evidence extraction — that is a separate, later step.
- **Build approach:** new sibling script extending the existing gauntlet
  harness (`tools/source-triage.mjs`), not a new `.claude/agents` panel —
  consistent with the locked precedent in the coach-agents design.
- **Rubric:** new, dedicated to source credibility/relevance — not a reuse
  of the scenario-content coach rubric.
- **Model:** not pinned to Fable 5 or any specific model; inherits the run
  default, overridable per the existing `--coach-model` convention.
- **Cost control:** three-stage funnel (title pre-filter -> capped-excerpt
  judgment -> full-read escalation only on MAYBE), mirroring the existing
  Head-Coach-gates-the-room escalation philosophy applied to read depth.
- **Scope:** all 5 scraped channels, including `coaches-site-glass-and-out`
  — re-triaged on content merit despite its acquisition method already
  being rejected; any PURSUE there carries a mandatory re-acquisition flag.
- **Output:** one grouped report per run in `docs/factory/coach-runs/`.
  Nothing is auto-written into Obsidian or the Acquisition Log — a human (or
  a follow-up assisted pass) decides what to actually pursue from the report.
