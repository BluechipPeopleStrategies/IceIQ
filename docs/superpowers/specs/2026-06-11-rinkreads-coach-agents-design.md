# RinkReads Coach Agents — Fable-5 Judgment Panel

**Status:** design, ready for review · **Date:** 2026-06-11
**Extends:** `docs/factory/2026-06-04-gauntlet-v2-design.md` (G6, G7, G7.5, G1b) and `docs/factory/SPEC.md` §15.
**Goal:** Turn the coach roles the gauntlet only described on paper into real, autonomous
agents that run on `claude-fable-5`, lean hard into professional-coach judgment, and slot
into the content workflow at low token cost with high payoff.

---

## 1. Why this exists

The gauntlet v2 design names a coach panel (G7), a Head Coach decider (G7.5), a graphic
designer (G6), and an expert-keyer for non-geometric residue (G1b). None of them exist as
actual agents yet. This spec builds that group.

Two constraints shape every decision:

1. **Non-deterministic judgment.** The coaches are professionals, not rubric-fillers. The
   plumbing around them is fixed; what they decide is theirs. We never script their verdicts.
2. **Low token, high payoff.** The group runs on Fable 5, sits downstream of the free
   deterministic gates, and uses a solo-first escalation so most items cost roughly one call.

---

## 2. Architecture

### 2.1 Position in the workflow

The coach group sits **after** the deterministic gates G1 through G5 (solver, validation,
format, diversity, render). Those gates are mechanical and free. Only an item that survives
them, and that genuinely needs human-grade judgment, reaches a coach. This positioning is the
primary token lever: no Fable-5 call is ever spent on something a free check already settled.

```
seed + solver answer
   -> [free gates G1..G5]
   -> head-coach (solo, 1 call)
        decides: is this clear?
          yes -> GO / SEND-BACK            (done, ~1 call)
          no  -> convene room:
                   tactical-coach
                   development-coach
                   adversarial-coach
                   diagram-coach (only if the visual is in question)
                 -> head-coach reconciles  -> final GO / SEND-BACK
```

### 2.2 Escalation model — "Head Coach gates the room"

The Head Coach reviews every item solo first. Her **first** judgment is "do I need the room
for this one?" Clear items ship on her call alone. Genuine judgment calls convene the
specialists. She convenes the room **herself**: the `head-coach` agent is granted the `Agent`
tool and dispatches the named specialists when she decides it is warranted. This keeps the
escalation decision non-deterministic (she chooses) and keeps orchestration on Fable 5 rather
than on the Opus main loop.

Fallback (not built in phase 1, noted for resilience): if nested subagent dispatch proves
flaky, a thin `/rink-review` command performs the routing while the judgments stay entirely
in the coaches.

---

## 3. The agents

All agents live in `IceIQ\.claude\agents\` as markdown files with frontmatter pinning
`model: claude-fable-5`. Each agent's body is its coach persona and contract. Every agent
reads the shared `coach-briefing.md` (see §5) for curriculum and house-style context.

| Agent | Tools | Job | Structured return |
|---|---|---|---|
| **head-coach** | Read, Agent | Decider and reconciler. Reviews solo, decides whether to convene, runs the room, sets the final call and confidence. | `{ decision: "go"\|"send-back", confidence: 0-1, note, convened: bool, sendBackTarget? }` |
| **tactical-coach** | Read | Is this the correct read for the situation on the ice? | `{ verdict: "pass"\|"concern", why }` |
| **development-coach** | Read | Age and stage fairness — is this teachable and fair for this band? | `{ verdict: "pass"\|"concern", why }` |
| **adversarial-coach** | Read | Paid to break it: can a smart kid defend the "wrong" answer? | `{ verdict: "pass"\|"concern", hole? }` |
| **diagram-coach** | Read | Age-appropriate board. Refines seed geometry and labels, not a freehand image. | `{ seedPatch, notes }` |

### 3.1 Persona notes

- **head-coach** is an expert across all ages and all concepts. She owns the G7-to-G8
  handoff and is the accountable voice. She reconciles split panels rather than averaging
  them (one adversarial nitpick does not automatically sink two passes).
- **tactical-coach**, **development-coach**, **adversarial-coach** are the three G7 lenses.
  Each returns a verdict plus a short reason. They do not see each other's answers.
- **diagram-coach** is the G6 role. It works in the engine's geometry primitives
  (point / path / selection / sequence) and applies the marker rules: U7/U9 generic players
  with no position tags, U11+ labeled, friendlier puck and goalie for the youngest bands. It
  returns a seed patch the engine renders, so there are no image tokens.

### 3.2 Inputs each coach receives

A compact item packet: the scenario seed JSON, the solver's computed answer and `breakdown`,
the curriculum tag, and the age band. The render is described by the seed; the diagram-coach
is the only one that proposes geometry changes.

---

## 4. How you run it: `/rink-review`

A project skill `/rink-review` is the entry point. It has two modes that share the exact same
Head Coach panel; only the input source and the verb of the verdict differ.

### 4.1 Gate mode (default) — new content

For freshly generated seeds heading toward ship (the factory's G6 through G7.5). Behavior:

1. Takes a batch of seed files (default 5 to 10 per sitting so context loads once).
2. Hands each item packet to **head-coach**.
3. Prints, per item: GO or SEND-BACK, the confidence, the reconciliation note, and whether
   the room was convened.
4. Routes SEND-BACK items to the existing `review_questions` queue (`src/supabase.js`).
5. Writes all verdicts to a dated run log under `docs/factory/coach-runs/` for an audit trail.

### 4.2 Audit mode (`--audit`) — retroactive pass over existing banks

Points the same panel at the content already shipped, to assess it after the fact. Sources:

- `src/data/bank.json` (text questions, keyed by age band: currently 148 across U7 to U18)
- `src/scenario/seeds/*.json` (geometry scenarios: currently 23)
- `src/data/povQuestions.json` (currently 4)

An input adapter normalizes each existing item into the same item packet the coaches already
take (text or geometry, age band, curriculum tag where present, and the solver answer for
geometry items). The Head Coach's call uses an assessment verb rather than a ship verb:

- **KEEP** — sound as is.
- **REVISE** — fixable; the note says what (wording, distractor, missing or wrong diagram,
  age-fit). For geometry items the diagram-coach may attach a seed patch.
- **RETIRE** — not salvageable for this band.

Output is a single assessment report (`docs/factory/coach-runs/audit-YYYY-MM-DD.md`) grouped
by age band, plus REVISE and RETIRE items routed to the review queue. Solo-first escalation
still applies, so a clean corpus is roughly one Fable-5 call per item. Default runs the whole
corpus; `--band U13` or a count limit can scope it for a cheaper first pass.

Text-only questions have no geometry for the solver to key and no board for the diagram-coach
to redraw; for those, the diagram-coach is invoked only when an item would clearly be better
as a diagram, and it flags that rather than patching geometry that is not there.

The command itself is thin in both modes: it loads the batch and invokes the Head Coach. All
judgment and all escalation happen inside the agents.

---

## 5. Token controls

- **Fable 5** for every coach call.
- **Downstream of free gates** — judgment is spent only on items that survived G1 to G5.
- **Solo-first escalation** — most items resolve in roughly one call; the four-extra-brain
  panel is reserved for items that earn it.
- **Batching** — 5 to 10 items per run amortizes context load.
- **Shared `coach-briefing.md`** — one small file (curriculum-ledger excerpt, marker rules,
  house style, the verdict schema) that every coach reads, so context is supplied once rather
  than re-derived per call. Kept deliberately short.
- **Small structured returns** — verdicts are compact JSON; reasoning stays terse.

Rough budget: a clear item is about 1 Fable-5 call; a convened item is about 5. With most
items clear, the expected cost is well under two calls per item on a cheap model.

---

## 6. Implementation surface

- `IceIQ\.claude\agents\head-coach.md` (+ `Agent` tool, `claude-fable-5`)
- `IceIQ\.claude\agents\tactical-coach.md`
- `IceIQ\.claude\agents\development-coach.md`
- `IceIQ\.claude\agents\adversarial-coach.md`
- `IceIQ\.claude\agents\diagram-coach.md`
- `IceIQ\.claude\skills\rink-review\SKILL.md` (the batch entry point; gate and `--audit` modes)
- `IceIQ\docs\factory\coach-briefing.md` (shared context the agents read)
- `IceIQ\docs\factory\coach-runs\` (run-log and audit-report output directory)
- An input adapter (in the skill or a small `tools/` helper) that normalizes existing
  `bank.json` / seed / `povQuestions.json` items into the standard item packet for audit mode.
- Reuses `src/supabase.js` `review_questions` routing; no schema changes.

---

## 7. Testing and validation

- **Golden judgment cases:** a small set of hand-labeled seeds with a known correct GO or
  SEND-BACK (including at least one clear pass, one clear fail, one genuine close call that
  should convene the room). Run the panel and confirm the Head Coach's call is sane and that
  she convened on the close call but not the clear ones.
- **Persona smoke test:** confirm each specialist returns its structured shape and that the
  adversarial-coach actually surfaces a hole when given a deliberately weak item.
- **No change to existing solver-golden tests** (`tools/solver-golden.mjs`); the coaches sit
  downstream of the solver and do not touch its keying.

---

## 8. Out of scope (this spec)

- The other gauntlet gates (misconception distractors, kinematic solver, diversity and
  reading-level gates, telemetry loop G10). Those remain in the gauntlet v2 plan.
- Learner-targeted generation (backlog, depends on G10).
- True freehand sketch output via the Excalidraw MCP. The engine renders from geometry, so
  it is unnecessary now; noted only as a future option.

---

## 9. Decisions locked (2026-06-11)

- **Run model:** autonomous Claude Code subagents, non-deterministic judgment, pinned to
  `claude-fable-5`.
- **Escalation:** Head Coach gates the room; she convenes the panel herself via the `Agent`
  tool.
- **Roster:** head-coach, tactical-coach, development-coach, adversarial-coach, diagram-coach.
- **Diagram output:** seed-geometry patch with age-appropriate markers, not an image.
- **Entry point:** a thin `/rink-review` batch command; verdicts logged, SEND-BACKs routed to
  the existing review queue.
- **Two modes, one panel:** gate mode for new seeds (GO / SEND-BACK) and `--audit` mode for a
  retroactive pass over the existing banks (KEEP / REVISE / RETIRE). Same agents, same
  escalation; only the input source and the verdict verb differ.
