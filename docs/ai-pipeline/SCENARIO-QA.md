# Geometric Scenario QA

Quality control for the **geometric scenarios** (`src/scenario/seeds/*.json`) — the
interactive rink reads where actors are placed as dots on the board. Two halves:

1. **Automated rules** — deterministic checks that run on every seed (the engine
   gates on them; `npm run qa` sweeps them all at once). Fast, free, permanent.
2. **AI QA coach** — a judgment pass that reads each scenario the way a coach
   reads a whiteboard and asks "does this actually make hockey sense?" Catches
   the subtle illogic rules can't express. Run on demand.

**This file is the living rubric.** Every piece of feedback Thomas gives about a
scenario gets logged below and, where possible, becomes a new automated rule —
so the QA specialist gets sharper over time instead of repeating the same misses.

---

## How to run

```bash
npm run qa            # full triage of every seed (errors, warnings, clean count)
npm run qa:flagged    # only seeds with errors or warnings
node .claude/skills/new-scenario/validate-seed.mjs src/scenario/seeds/<id>.json   # one seed
```

The **AI QA coach** is run by dispatching a review agent (or pasting the prompt
below into ChatGPT/Gemini) over a batch of seeds. It returns a verdict per
scenario. Its rubric is the table below — when the table grows, so does the coach.

---

## The rubric

Severity: **ERR** = blocks the seed (won't ship); **WARN** = surfaces for a look;
**COACH** = judged by the AI coach; **RENDER** = handled by the renderer, not the seed.

| # | Dimension | What "wrong" looks like | Severity | Enforced by |
|---|-----------|-------------------------|----------|-------------|
| 1 | Schema shape | wrong/missing fields, `correct.kind` ≠ `interaction.kind` | ERR | `validateScenario` |
| 2 | One POV player | not exactly one `kind:"player"` | ERR | hockey rules |
| 3 | On-stage | actor off-screen for the view's x-range | ERR | `actorsOnStage` |
| 4 | No overlaps | two skaters within 0.05 on both axes | ERR | overlap guard |
| 5 | Goalie present | off-zone/def-zone with no goalie | ERR | `goalieRequiredInZone` |
| 6 | Defender minimums | def ≥2, off ≥1 (≥3 power-play), neutral ≥1 | ERR | hockey rules |
| 7 | Real read | every selection candidate is "correct" (no wrong option) | ERR | `selection`/`sequence` rules |
| 8 | Clean correct lane | the keyed pass/path runs through a defender | ERR | `pathNotBlocked` |
| 9 | Tempting wrong lane | pass scenario has no blocked-but-tempting alternative | ERR | path rules |
| 10 | Difficulty floor | difficulty too low for actor count / timer / scanWindow | ERR | `difficultyFloor` |
| 11 | **No offsides** | teammate past the offensive blue line while the puck is behind it | **ERR** | `noOffsides` |
| 12 | **Place targets distinct** | drop-target guides overlap into one ambiguous blob | **WARN** | `placeTargetsDontOverlap` |
| 13 | **Copy color match** | text says "white/red/… jersey" but board draws blue (us) / black (them) | **WARN** | `copyMatchesColors` |
| 14 | **Board matches copy (puck)** | prompt says "corner"/"net-front" but the puck isn't there | **WARN** | `puckLocationMatchesCopy` |
| 15 | Board matches copy (subtle) | "half-wall"/"slot"/"point" claims, who's covered, who's open | COACH | AI QA coach |
| 16 | Read is hockey-true | the "right" answer is genuinely the best read at this age | COACH | AI QA coach |
| 17 | Age fit | diagram complexity / wording matches the age band | COACH | AI QA coach |
| 18 | Zone label correct | the on-screen zone badge matches the actual situation | RENDER + COACH | RinkStage + coach |
| 19 | Goalie team color | our goalie blue, opposing goalie black | RENDER | RinkStage (by zone) |
| 20 | Controls usable | Check button / tokens reachable, not clipped by the board edge | RENDER | place primitive |

---

## AI QA coach prompt

Paste with a batch of scenario JSON. (Coordinates are normalized 0–1; x 0–0.5 is
our defending end, 0.5–1 the offensive end; the offensive blue line is x≈0.645 in
a right view, x≈0.355 in a left view; the goalie crease is x≈0.92 right / 0.08 left.)

> You are the RinkReads Scenario QA Coach — a skeptical youth-hockey development
> coach reviewing interactive rink diagrams. For each scenario you get the actor
> layout (ids, kinds, normalized x/y), the prompt, the keyed correct answer, and
> the feedback copy. The automated rules already passed; your job is the judgment
> the rules can't make. For EACH scenario check:
>
> 1. **Board matches the words.** Does every location the copy names ("half-wall",
>    "slot", "point", "in the corner", "net-front", "weak side", "in front of the
>    net") actually match where that actor/puck sits? Flag any mismatch.
> 2. **The read is hockey-true.** Is the keyed answer really the best option at
>    this age — who has SPACE, not who's closest? Could a real coach defend a
>    different option? If two answers are defensible, the scenario is broken.
> 3. **Coverage is consistent.** Players described as "covered" have a defender on
>    them; players described as "open" don't. Defenders are where a real defender
>    would be, not floating in dead ice.
> 4. **Zone & direction sanity.** The situation matches the stage zone (a forecheck
>    isn't tagged def-zone, an entry isn't already deep in the zone). Nobody is
>    offsides; the attack direction is coherent.
> 5. **Age fit.** Cue count, pace, and wording match the age band (U7 = one cue,
>    open ice; U18 = adult-speed, disguise, second threats).
>
> Output JSON: `[{ "id", "verdict": "pass"|"revise"|"reject", "issues": [".."],
> "fix": "one concrete suggested change" }]`. Be specific (name the actor and the
> coordinate). If a scenario is clean, verdict "pass", issues []. Nothing else.

---

## Feedback log

Append-only. Each entry: the feedback → the QA dimension it became. New feedback
that isn't yet covered by a rule should get a row here first, then (if codifiable)
a new automated check, then a `#` in the rubric table.

| Date | Feedback (paraphrased) | Became |
|------|------------------------|--------|
| 2026-06-05 | "This would be offsides" (zz7u, entry_trailer) | Rule #11 `noOffsides` (ERR) |
| 2026-06-05 | "say what zone we're in on the screen" | Render #18 zone badge |
| 2026-06-05 | "our goalie same color as our players, opposing same as theirs" | Render #19 goalie team color |
| 2026-06-06 | "the circles overlap" (u9 place drill) | Rule #12 `placeTargetsDontOverlap` (WARN) |
| 2026-06-06 | "the Check mark came off the edge" | Render #20 button centered in crop |
| 2026-06-06 | "call them opponents/black, not white players" | Rule #13 `copyMatchesColors` (WARN) |
| 2026-06-06 | "the puck isn't on the half-wall — board must match the question" | Rule #14 `puckLocationMatchesCopy` (corner/net-front) + Coach #15 (half-wall/slot/point) |

### How to add the next one
1. Add a row to the feedback log with today's date and the gist.
2. Decide: can a deterministic rule catch it? If yes, add a function to
   `src/scenario/validators.js` (ERR if it makes the scenario wrong, WARN if it's
   a quality smell), then add it to the rubric table with its `#`.
3. If it needs judgment, add it to the AI QA coach prompt's checklist instead.
4. Run `npm run qa` to confirm no false positives on the existing clean seeds.
