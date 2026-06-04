# Founder Approval Layer — Design Spec

**Status:** approved 2026-06-04. Adds the final two gates to the gauntlet: a
Thomas-proxy strategic/brand gate, then Thomas as the human gate before public.

**Relationship to the gauntlet:** the gauntlet (`docs/factory/SPEC.md` §15) runs
methodology gates that judge **correctness and pedagogy** (creators → solver →
validation → curriculum confirmers → graphic designer → coach panel → rationale).
None of them judge whether a *correct* question actually belongs in RinkReads given
the brand, the learner experience, and the business plan — nor do they put a human
in the loop. This spec adds that. It extends `docs/factory/SPEC.md` §15 with two new
gates after G8 (Rationale).

---

## 1. Goal & non-goals

**Goal.** Insert a two-layer final-approval stage so nothing reaches the public until
(a) a "digital Thomas" agent has judged its big-picture fit, and (b) the real Thomas
has personally approved it.

**In scope (this spec):**
- **G9 — Founder-Proxy gate:** an agent that judges brand/voice, learner experience &
  fairness, and strategic/business fit; can forward, send back for rework, or kill.
- **G10 — Founder Review dashboard:** the surface where Thomas reviews the
  proxy-forwarded queue, each question rendered exactly as a player sees it, with
  per-item Approve / Send back / Edit / Reject.
- The **review-queue** data format and the **Approve → `bank.json`** path.

**Out of scope (separate specs/efforts):**
- The **gauntlet generator** itself (the creators/solver/coach pipeline that produces
  questions). It feeds G9/G10 but is built separately. This spec assumes its output
  shape only loosely (a question object + a gate-history record).
- The **ledger research pass** that populates `curriculum-ledger.json`.
- Any future "spot-check ramp" that lets Thomas step back to sampling (see §8).

---

## 2. Decisions locked in brainstorming (2026-06-04)

| Question | Decision |
|---|---|
| What is the super-agent? | A **proxy of Thomas** ("digital founder") that vets a question the way Thomas would, BEFORE it reaches the real Thomas. Two distinct layers: proxy agent, then human. |
| Proxy mandate | **Brand & voice fit · Learner experience & fairness · Strategic/business fit.** (Game-sense "north star" is left to the curriculum confirmers; the proxy owns what they don't.) |
| Proxy source of truth | **Stitch from existing docs** — CLAUDE.md branding, `docs/factory/SPEC.md`, `src/config/pricing.js`, project memory. No new founder-brief doc required (a short one is a cheap add later if the proxy reasons too thinly). |
| Proxy authority | **Filter + forward.** Off-brand/off-strategy items go BACK for rework (kill only after the rework cap); only items the proxy would personally approve reach Thomas, each with a verdict + rationale. |
| Thomas's review UX | **Render-as-player + per-item actions:** Approve → public · Send back (with note) · Edit inline · Reject. |
| Build sequence | **One spec, dashboard first.** The dashboard is buildable now against sample forwarded items (and is how anything enters the empty `bank.json`); the proxy gate is built with the gauntlet. |

---

## 3. Architecture

```
… gauntlet methodology gates … → G8 Rationale
   → G9  Founder-Proxy gate     (agent; forward | send-back | kill)
   → G10 Founder Review         (human, via dashboard; approve | send-back | edit | reject)
   → PUBLIC  (src/data/bank.json)
```

Two components, one responsibility each:

| Component | Responsibility | Built |
|---|---|---|
| **Founder-Proxy gate** | Agent + rubric in the gauntlet workflow; emits a verdict and routes the item | With the gauntlet (designed here) |
| **Founder Review dashboard** | UI that renders the review-queue as a player sees it and applies Thomas's decision | **First** (usable standalone) |

Data flow: gauntlet → proxy gate → **review-queue** (`src/data/review-queue.json`) →
dashboard → on Approve, item moves to **`src/data/bank.json`** (live, per the
2026-06-04 blank-slate loader).

---

## 4. G9 — Founder-Proxy gate

**Position:** after G8 (Rationale), so the item is fully formed (question + options +
answer key + rendered art + explanation) and already blessed for correctness/pedagogy.

**Inputs:**
- The complete question object (incl. `nodeId` curriculum tag, render, overlays, rationale).
- Its **gate history** — which gates passed, coach notes — so the proxy trusts correctness
  and focuses only on fit.
- A **context pack** stitched at runtime from: CLAUDE.md (branding, Game Sense vocabulary,
  accessibility rules incl. the red/green colorblind rule), `docs/factory/SPEC.md`,
  `src/config/pricing.js` (tier/strategy), and relevant project memory.

**Rubric — three lenses (the proxy must reason on each):**
1. **Brand & voice fit** — RinkReads identity (navy/gold; "Game Sense" not "IQ"; warm,
   encouraging for kids); does it *sound like* RinkReads.
2. **Learner experience & fairness** — would a real kid at this age band enjoy and learn
   from it; not frustrating, ambiguous, or time-wasting; accessible (never color-alone).
3. **Strategic/business fit** — does it earn its place: teaser/"wow" value that drives
   free→paid, contributes to age-ladder coverage, not filler.

**Outcomes (it has teeth, like the coach panel):**
- **Forward** → write the item to the review-queue with `proxyVerdict` = `{ decision:
  "forward", scores:{brand, learner, strategy}, rationale }`.
- **Send back** → return to the gauntlet rework loop with specific notes (counts against
  the existing per-gate rework cap, default 3).
- **Kill** → only after the rework cap; logged, never silently dropped (consistent with
  the gauntlet's "queue, don't force" / logged-drop discipline).

**Output record:** every proxy decision is logged (item id, decision, scores, rationale,
round) for auditability and as future learning signal.

---

## 5. G10 — Founder Review dashboard

**The surface.** A dashboard (dev/owner-only route, e.g. `#review`, gated like the
existing `?dev=1` affordances) listing the proxy-forwarded queue. It reuses the app's
real renderers so each item appears **exactly as a player sees it** — building on the
existing single-question preview (`QuestionPreviewPage`, route `#q=<id>`, which already
renders one question "exactly what a player sees" via `RinkReadsRinkQuestion` /
`ScenarioRenderer` / MC fallback). The dashboard renders each queued item the same way,
with the proxy's verdict + rationale shown beside it.

**Per-item actions:**
- **Approve → public.** Moves the item from `review-queue.json` into `bank.json` under its
  age level(s); bump the qb cache version so the live app picks it up. This is the only
  path to public.
- **Send back.** Returns the item to the gauntlet with a Thomas note (same rework channel
  as the proxy's send-back); removed from the queue.
- **Edit inline.** Adjust fields (stem, options, overlay text, explanation), then approve.
  Edits are recorded.
- **Reject.** Kill the item (logged); removed from the queue.

**Decision log.** Every Thomas action (approve/edit/send-back/reject + any note) is
appended to a log — the audit trail and the corpus a future learning loop could use.

**Scale note.** The proxy pre-filters, so the forwarded queue is smaller and higher-signal;
per-item review is the v1. Batch operations are deliberately deferred (§8).

---

## 6. Data shapes

**`src/data/review-queue.json`** — items awaiting Thomas:
```jsonc
{
  "items": [
    {
      "question": { /* full bank-schema question. nodeId = PRIMARY (age,concept) tag;
                       levels[] = every age band it appears in, primary first (secondary =
                       levels[] minus primary). See curriculum-ledger spec §4. */ },
      "gateHistory": { "coachPanel": "pass", "notes": ["…"] },
      "proxyVerdict": {
        "decision": "forward",
        "scores": { "brand": 0.9, "learner": 0.85, "strategy": 0.8 },
        "rationale": "On-brand Game-Sense read; strong teaser value for U11."
      },
      "queuedAt": "2026-06-04"
    }
  ]
}
```

**`src/data/bank.json`** — the live/public bank (already exists, currently `{}`),
keyed by age-level display name → question[]. Approve appends here.

**`src/data/review-log.jsonl`** (or `.json`) — append-only decision log (proxy + human).

---

## 7. Build sequence

1. **Dashboard first (buildable now).** Define `review-queue.json` + the `#review` route +
   render-as-player + the four actions + the Approve→`bank.json` path + the decision log.
   Seed it with a few hand-authored sample forwarded items to develop against. This makes
   the dashboard immediately useful: it is the mechanism that puts the first questions into
   the currently-empty bank.
2. **Proxy gate (with the gauntlet).** Implement G9 as an agent + rubric in the gauntlet
   workflow, writing forwarded items into `review-queue.json`. Until the gauntlet exists,
   the dashboard runs on hand-seeded queue items.

---

## 8. Open questions / deferred

- **Spot-check ramp (deferred).** `docs/factory/SPEC.md` §16 envisions eventually flipping
  from approve-each to auto-post once the live answer-disagreement rate is near zero. This
  spec keeps Thomas as the standing per-item gate; a future change can let high-confidence
  proxy-forwarded items batch or auto-post. Not built now.
- **Founder brief (deferred).** If the proxy reasons too thinly from stitched docs, write a
  short `docs/founder-brief.md` capturing voice/standards in Thomas's words. Cheap add.
- **Batch actions (deferred).** Select-all / batch-approve once volume warrants.
- **Learning loop (deferred).** The decision log is captured from day one; using it as
  few-shot signal for the proxy is a later enhancement.
- **Gauntlet output contract.** The exact question + gate-history shape is finalized by the
  gauntlet generator spec; the dashboard depends only on the `review-queue.json` shape in §6.

---

## 9. Deliverables checklist (dashboard-first slice)

- [ ] `src/data/review-queue.json` format + a few sample forwarded items.
- [ ] `#review` owner-gated route + dashboard listing.
- [ ] Render-as-player for every question type (reuse `QuestionPreviewPage` renderers).
- [ ] Proxy verdict/rationale panel beside each item.
- [ ] Actions: Approve→`bank.json` (+ cache bump), Send back (note), Edit inline, Reject.
- [ ] Append-only decision log.
- [ ] (Later, with gauntlet) G9 Founder-Proxy agent + rubric writing into the queue.
- [ ] `docs/factory/SPEC.md` §15 updated to show G9/G10.
