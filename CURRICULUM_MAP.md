# RinkReads Curriculum Map — v2

**Status:** locked 2026-04-29. Source-of-truth for what RinkReads teaches, when, and how.
**Authoring loop:** content edits happen in the Scenario Author (rinkreads-author project),
exported as `questions.json` + image assets, dropped back into ice-iq for shipping.

## Source frameworks

This map synthesizes:

- **Hockey Canada LTAD** (Long-Term Athlete Development) — primary spine; the
  Initiation/Novice/Atom/Peewee/Bantam/Midget age structure is Hockey Canada's
- **USA Hockey ADM** (American Development Model) — cross-reference for cognitive load
- **OMHA Coaching Standards** + **Hockey Alberta Skill Development Pathway** — Canadian regional refinements
- **IIHF Coach Development Program** — international layer for tactical concepts at U15+
- **NHL Player Development pathways** — for tactical depth at U18

Where frameworks conflict, Hockey Canada wins.

## Anchor concepts

**Decision Making** and **Reading the Play** are the curriculum's anchors. Weighted **2× normal counts** at every age. RinkReads's brand is hockey IQ — every other concept's questions should ideally connect back to "what's the read?" / "what's the decision?" rather than pure mechanics.

## Age stage mapping

| Age Group | Hockey Canada LTAD | USA Hockey ADM | Cognitive load | Lens |
|---|---|---|---|---|
| U7 / Initiation | FUNdamentals 1 | 8U | Single-concept, fun-first | "Can I do it once?" |
| U9 / Novice | FUNdamentals 2 / Learn-to-Train transition | 8U | Single concept, light situation | "Can I do it in a game-like rep?" |
| U11 / Atom | Learn to Train | 10U | Situational, 1–2 cues | "Can I read what's happening and pick?" |
| U13 / Peewee | Train to Train 1 | 12U | Multi-cue, system intro | "Can I do it inside a play structure?" |
| U15 / Bantam | Train to Train 2 | 14U | Tactical reads | "Can I anticipate the next 2 moves?" |
| U18 / Midget | Train to Compete | 16/18U | Pattern recognition | "Can I read the whole sheet and pick best of three?" |

## Concept taxonomy — 28 concepts, 5 themes

### 1. Skills (technical recognition — RinkReads teaches *recognition*, not execution)

- `skating-posture` — athletic stance, knee bend, crossovers, edge use
- `puck-control` — stickhandling, protection, head-up carrying
- `passing-receiving` — lane selection, soft hands, leading the receiver
- `shooting` — wrist/snap/slap selection, traffic, deflections
- `stick-position` — stick on ice, blade in lane, defensive stick discipline
- `body-position` — between puck and net, leverage on the wall, gap closure

### 2. Hockey Sense (cognitive — anchor theme)

- `eyes-up` — scanning, head on a swivel, peripheral awareness
- `reading-the-play` ★ **ANCHOR** — anticipating what's about to happen
- `decision-making` ★ **ANCHOR** — pass / shoot / carry; risk vs. reward
- `spatial-awareness` — where teammates and opponents are, where ice is
- `time-and-space` — when to slow it down, when to attack

### 3. Tactics (zone-based + situational)

- `dz-coverage` — man-on / zone / hybrid; net-front; weak-side D
- `gap-control` — closing time, angling, defensive stick
- `breakout` — D-to-D, wheel, reverse, support layers
- `neutral-zone` — regroup, stretch pass, NZ trap recognition
- `oz-entry` — controlled vs. dump; wide / cross / drop
- `oz-cycle` — low cycle, F1/F2/F3 roles, backdoor support
- `forecheck` — 1-2-2, 2-1-2, F1 angling
- `special-teams` — PP, PK, faceoff win/loss responsibilities
- `body-checking` — age-appropriate contact / angling / leverage

### 4. Compete (mental / habits)

- `battle-level` — 1-on-1 wall battles, net-front, recovery from a fall
- `communication` — verbal calls, support cues
- `recovery-resilience` — mistake → next play, get up fast, no quit

### 5. Goalie (parallel track for `pos: ['G']` questions)

- `goalie-angle-depth` — positioning relative to shooter (challenging vs. retreating)
- `goalie-save-selection` — butterfly / standup / VH / RVH appropriate to threat
- `goalie-recovery` — post integration, getting up after first save, second-shot reads
- `goalie-puck-handling` — when to play, when to leave, breakout support
- `goalie-communication` — calling out trapped pucks, screens, switches

## Age × concept depth matrix

Tags: **— (not introduced) · I (introduced) · D (developing) · M (mastery emphasis) · R (refinement)**

### Skater concepts

| Concept | U7 | U9 | U11 | U13 | U15 | U18 |
|---|---|---|---|---|---|---|
| skating-posture | I | D | M | R | R | R |
| puck-control | I | D | M | R | R | R |
| passing-receiving | I | D | M | R | R | R |
| shooting | — | I | D | M | R | R |
| stick-position | I | D | M | R | R | R |
| body-position | — | I | D | M | R | R |
| eyes-up | I | D | M | R | R | R |
| reading-the-play ★ | I | D | M | R | R | R |
| decision-making ★ | I | D | M | R | R | R |
| spatial-awareness | — | I | D | M | R | R |
| time-and-space | — | — | I | D | M | R |
| dz-coverage | I | D | M | R | R | R |
| gap-control | — | — | I | D | M | R |
| breakout | I | D | M | R | R | R |
| neutral-zone | — | — | I | D | M | R |
| oz-entry | I | D | M | R | R | R |
| oz-cycle | — | — | I | D | M | R |
| forecheck | — | — | I | D | M | R |
| special-teams | — | — | — | I | D | M |
| body-checking | — | — | — | I | D | R |
| battle-level | I | D | M | R | R | R |
| communication | I | D | M | R | R | R |
| recovery-resilience | I | D | M | R | R | R |

### Goalie concepts (only for `pos: ['G']` questions)

| Concept | U7 | U9 | U11 | U13 | U15 | U18 |
|---|---|---|---|---|---|---|
| goalie-angle-depth | I | D | M | R | R | R |
| goalie-save-selection | — | I | D | M | R | R |
| goalie-recovery | — | I | D | M | R | R |
| goalie-puck-handling | — | — | I | D | M | R |
| goalie-communication | — | I | D | M | R | R |

## Question type → teaching goal

| Question type | Best at | Concepts that pair well |
|---|---|---|
| `mc` (text) | Concept knowledge, verbal cue recall | All concepts at I/D depth |
| `tf` | Binary rule recognition | Skills at I; Compete at all ages |
| `pov-mc` | Visual recognition / read-the-play | Eyes-up, reading-the-play, body-position, all anchor concepts |
| `hot-spots` | Spatial decision (WHERE to be) | dz-coverage, oz-cycle, gap-control |
| `rink-label / drag / match` | Anatomy + position knowledge | Special-teams alignment, FO responsibilities |
| `drag-target / drag-place` | Movement + positioning | breakout, forecheck patterns, oz-entry |
| `path-draw / lane-select` | Execution + lane recognition | Pass selection, stretch pass, cycle path |
| `sequence-rink / seq` | Order of operations | Breakout sequence, NZ regroup, cycle support |
| `mistake` | "What did THAT player do wrong?" | dz-coverage, gap-control, reading-the-play |
| **`scene-mc`** (planned) | Animated read-the-play (multi-keyframe scene) | reading-the-play, decision-making (anchor heavy) |

## Type mix per age (priority on visual + animation for younger)

| Age | mc + tf (text) | pov-mc + scene-mc (visual / animated) | rink-* / hot-spots / drag (spatial) |
|---|---|---|---|
| U7 | 20% | **70%** | 10% |
| U9 | 25% | **60%** | 15% |
| U11 | 30% | 40% | 30% |
| U13 | 30% | 30% | 40% |
| U15 | 30% | 20% | 50% |
| U18 | 30% | 20% | 50% |

## Difficulty progression (within concept, within age)

- **d:1** — recognize: "Which option matches this rule?" (low context)
- **d:2** — apply: "In this scenario, what do you do?" (game context, single right answer)
- **d:3** — analyze: "Lesser of two evils" / multi-cue / time pressure (game context, defensible alternatives)

## Target question counts per (age × concept) cell

Anchor concepts get 2× the listed counts.

- Depth `I` → 2–3 questions
- Depth `D` → 4–6 questions
- Depth `M` → 6–8 questions, ≥2 visual/spatial types
- Depth `R` → 4–6 questions, weighted to d:2/d:3

Rough total bank target: **~700–900 skater questions + ~80–120 goalie questions** for full coverage.

## Fun layer (U7-U9 priority)

For the youngest ages, the engine should layer fun affordances on top of the question content. Tagged via `funTags[]` (display hints, not content):

- `mascot` — coach Kowalski / Marques / Kincaid / Danno cameo in the explanation
- `celebration` — successful answer triggers confetti / mascot-cheer animation
- `silly-distractor` — wrong-answer options include something obviously absurd to lower the stakes
- `streak-bonus` — chain correct answers for a small reward
- `follow-the-puck` — animated questions where the kid tracks the puck across keyframes

## Animation strategy (Option C)

Scene-composed questions ship as BOTH a static PNG (frame 1, the existing path) AND an animated GIF (full keyframe sequence). The engine consumes whichever is available — GIF preferred when present. Future work: a live `RinkRenderer` component in ice-iq that consumes the scene JSON directly for SVG-quality animation. Until then, GIFs.

The Scenario Author's Save & Ship will be extended to also export an animated GIF when the scene has multiple keyframes. Static-PNG questions don't change.
