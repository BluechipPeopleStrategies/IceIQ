# Scenario Engine — Owner Decisions (2026-07-29)

**Status:** AUTHORITATIVE. Where this file and
`docs/superpowers/specs/2026-07-29-scenario-engine-design.md` disagree, **this file wins**.
The spec was drafted by an audit before these decisions were made; it must be reconciled
to them, not the other way round.

Decided by Thomas, 2026-07-29, ahead of the overnight autonomous build.

---

## The ask, verbatim

> "Review all of my RinkReads stuff around scenario creation. Create a scenario engine
> that will allow for the mass production of content for the training app with limited
> input needed. In addition, build this out so that coaches can create videos. I just
> want to get to a minimal viable product. Do not stop until you have an engine that can
> realistically create hundreds of scenarios and questions a day that would then go into
> the app."

> "Really tighten the app up so we can have generative AI use judgment to create hockey
> questions that are meaningful and accurate for people to answer."

> "Do not stop until you have hockey strategies and tactics that can be used in
> questions, and self-verifies and updates based on the judgment that it would create
> for itself."

---

## Decision 1 — What powers generation and hockey judgment: FREE ONLY

**No paid API. No Anthropic or OpenAI key.** `.env` holds Supabase and Notion only, and
it stays that way. Do not add a paid provider, do not write code whose primary path
requires one, and do not tell Thomas the engine needs one.

The two sanctioned engines:

| Role | Runs on | Why |
|---|---|---|
| Hockey judgment, tactical correctness, pedagogy, final prose | **The Claude Code session itself** (this agent, plus its subagents) | Best judgment available, already paid for by subscription, no marginal cost |
| Bulk mechanical work — prose variation, deduplication, first-pass screening, embedding/dedupe, cheap classification | **Local Ollama** at `http://localhost:11434` (`llama3.1:8b`, `hermes3:8b`, `deepseek-r1:8b`, `nomic-embed-text`) | Free, unlimited, always on, good enough for mechanical passes |

**Hard rule on the split:** an 8B local model must NEVER be the authority on whether a
hockey read is correct. It screens, varies, and dedupes. Correctness is decided by kernel
geometry (correct-by-construction) or by the Claude session's judgment against the
knowledge base — never by Ollama.

**Consequence to design around honestly:** generation happens when a session runs, not
24/7 unattended. So "hundreds per day" means a batch run must be able to produce hundreds
in one sitting. Design for high-yield batch throughput, and build the runner so a
scheduled nightly session can execute it. Do not fake unattended operation.

## Decision 2 — Coach video MVP: COACHES BUILD THEIR OWN PLAY

Not "export a play from the catalog." The MVP is an **authoring tool**: a coach places
players on a rink, draws routes and passes, sets the read and the correct answer, and the
engine renders it to a shareable video.

This is the bigger build and Thomas chose it knowingly. Build toward the coach as a
*creator*, not a consumer. Reuse the existing play engine, `rinkAnchors.js`, waypoint
curves, and choreography beats as the render target — the coach's drawing should compile
down to the same play format the engine already animates, so authored plays flow into the
same pipeline, gates, and catalog as generated ones.

MVP scope is genuinely minimal: place players, draw a route or two, mark the read, name
the options, preview, export. Polish is not the goal tonight; a working end-to-end path
from a coach's drawing to a playable/exportable artifact is.

See `COACHES_WHITEBOARD.md` for prior thinking before designing this from scratch.

## Decision 3 — Review posture: TIERED AUTO-APPROVE

The engine's own self-judgment decides the tier:

- **High confidence, clears every gate** → auto-promote into the app.
- **Anything less than certain** → Thomas's review queue, **with the reason stated** —
  which gate was borderline, which tactical claim the engine could not fully justify.

Thomas reviews the interesting ones, not all of them. The engine's job is to make the
queue high-yield, not to bypass it.

**The confidence threshold must be conservative and must be tunable in one place.** Start
strict: when in doubt, queue it. A wrong "correct answer" reaching a child is the worst
defect this system can produce, and it is worse than a queue that is slightly too long.
The auto-approve rate can be raised later, from evidence, once the judge is calibrated
against Thomas's actual accept/reject decisions.

Auto-promoted items must remain individually reversible: record which engine version,
knowledge-base version, and judgment promoted each item, so a bad tier can be recalled.

---

## Standing guardrails for the overnight build

- No `git push`, no PR, no merge to `master`/`main`, no deploy, nothing posted or sent.
  Thomas reviews in the morning.
- Never overwrite `src/data/bank.json` or `src/data/povQuestions.json` in place with
  generated content. Stage, then promote through the existing gate.
- Never weaken, skip, or delete an existing test or gate to make something pass.
- Never ship a question whose correctness the engine cannot justify from the knowledge
  base or from kernel geometry.
- Work on `feature/shareable-beta` or a local branch off it.

## Open at time of writing

- Which tactical families to seed the knowledge base with first. Default without further
  input: the thinnest families named in `docs/roadmap/TASKS.md` — `gap_control` (1/4),
  `backcheck_recovery` (2/4), `forecheck_pressure` (2/4) — plus the `2-on-1` family that
  already has a working kernel to build the pattern from.
- Whether authored coach plays share the same review tiering as generated ones. Default:
  yes, but a coach's own play is visible to that coach immediately regardless of tier.
