# RinkReads Content Catalog — what to ask Gemini + ChatGPT

The full menu. Every concept, every valid age (nodeId), and the question types. Work top to
bottom, or jump to the anchor domain first (recommended order at the bottom).

**Driver line** (paste into Gemini after the generator prompt):
`Generate 10 questions for <nodeId>.`
Then paste the result into ChatGPT with `Be ruthless on the distractors.`, then drop the
corrected array into `docs/ai-pipeline/_queue-bank.json`.

---

## Question types you can ask for

**Text formats — generate these offline (no Claude needed):**
| type | what it is | best for |
|------|-----------|----------|
| `mc` | multiple choice, 4 options, 1 right | the workhorse; any read |
| `tf` | true/false statement | misconceptions, rules of thumb |
| `mistake` | spot the player's error (4 options) | "what went wrong" reads |
| `next` | what should happen next (4 options) | decision-at-a-moment reads |
| `seq` | put 4-6 steps in order | processes (scan→receive→act), breakouts |

**Interactive formats — draft as Briefs, Claude adds coordinates later:**
`selection` (tap the open teammate) · `point` (tap a spot) · `path` (draw a lane) ·
`sequence` (tap actors in order). These become rink seeds. Queue them in `_queue-briefs.md`.

Difficulty `d`: U7/U9 → 1 · U11/U13 → 2 · U15/U18 → 3.

---

## The catalog, by domain

Each row = one concept and the ages that have a node. The nodeId is `u<age>.<concept>`.

### Hockey Sense  (cat: "Hockey Sense")  — ANCHOR DOMAIN, do first
| concept | nodeIds (one per age) |
|---------|------------------------|
| scanning | u9.scanning · u11.scanning · u13.scanning · u15.scanning · u18.scanning |
| reading-the-play | u9.reading-the-play · u11… · u13… · u15… · u18.reading-the-play |
| decision-making | u9.decision-making · u11… · u13… · u15… · u18.decision-making |
| time-and-space | u9.time-and-space · u11… · u13… · u15… · u18.time-and-space |
| creativity-under-pressure | u9.creativity-under-pressure · u11… · u13… · u15… · u18… |

### Offensive Play  (cat: "Offensive Play")
| concept | nodeIds |
|---------|---------|
| puck-carrier-options | u9 · u11 · u13 · u15 · u18 .puck-carrier-options |
| off-puck-support-offense | u9 · u11 · u13 · u15 · u18 .off-puck-support-offense |
| attacking-1v1 | u9 · u11 · u13 · u15 · u18 .attacking-1v1 |
| cycle-and-possession | u11 · u13 · u15 · u18 .cycle-and-possession |
| zone-entry | u11 · u13 · u15 · u18 .zone-entry |
| odd-man-reads | u11 · u13 · u15 · u18 .odd-man-reads |
| net-front-play | u11 · u13 · u15 · u18 .net-front-play  (U11/U13 recognition-only) |

### Defensive Play  (cat: "Defensive Play")
| concept | nodeIds |
|---------|---------|
| gap-control | u11 · u13 · u15 · u18 .gap-control |
| angling-steering | u9 · u11 · u13 · u15 · u18 .angling-steering |
| defensive-side-positioning | u9 · u11 · u13 · u15 · u18 .defensive-side-positioning |
| coverage-reads | u11 · u13 · u15 · u18 .coverage-reads  (heavy switching U15+) |
| stick-and-body-detail | u9 · u11 · u13 · u15 · u18 .stick-and-body-detail |

### Transition & Compete  (cat: "Transition & Compete")
| concept | nodeIds |
|---------|---------|
| transition-reads | u11 · u13 · u15 · u18 .transition-reads |
| breakout-and-regroup | u11 · u13 · u15 · u18 .breakout-and-regroup |
| forecheck-pressure | u11 · u13 · u15 · u18 .forecheck-pressure |
| backcheck-recovery | u11 · u13 · u15 · u18 .backcheck-recovery |
| battles-and-compete | u7 · u9 · u11 · u13 · u15 · u18 .battles-and-compete |

### Puck Skills  (cat: "Puck Skills")  — judge as decisions (when/where/whether), not mechanics
| concept | nodeIds |
|---------|---------|
| puck-control | u7 · u9 · u11 · u13 · u15 · u18 .puck-control |
| puck-protection | u9 · u11 · u13 · u15 · u18 .puck-protection |
| passing | u7 · u9 · u11 · u13 · u15 · u18 .passing |
| receiving | u7 · u9 · u11 · u13 · u15 · u18 .receiving |
| shooting | u7 · u9 · u11 · u13 · u15 · u18 .shooting |

### Skating & Movement  (cat: "Skating & Movement")  — weakest fit for "reads", do last / lightly
| concept | nodeIds |
|---------|---------|
| edges-balance | u7 · u9 · u11 · u13 · u15 · u18 .edges-balance |
| agility-mobility | u7 · u9 · u11 · u13 · u15 · u18 .agility-mobility |
| backward-transitions | u9 · u11 · u13 · u15 · u18 .backward-transitions |
| deception-with-feet | u9 · u11 · u13 · u15 · u18 .deception-with-feet |

---

## Recommended run order

1. **Hockey Sense, U11 + U13** (your core users, your anchor domain) — 10 nodes.
2. **Hockey Sense, U9 + U15** — broaden the anchor.
3. **Offensive Play + Transition, U11 + U13** — the most "game-sense-y" reads.
4. **Defensive Play, U11 + U13**.
5. **U18 across Hockey Sense / Offensive / Defensive / Transition**.
6. **Puck Skills** (decision-framed) and **U7** simple cues.
7. **Skating & Movement** last, and lightly.

10 questions per node × ~152 nodes = a very deep bank. You don't need all of it. Aim for
~10/node on the anchor domain first; that alone fills U11/U13 richly.

---

## Flat checklist (tick as you queue them)

### Hockey Sense
- [ ] u9.scanning  - [ ] u11.scanning  - [ ] u13.scanning  - [ ] u15.scanning  - [ ] u18.scanning
- [ ] u9.reading-the-play  - [ ] u11.reading-the-play  - [ ] u13.reading-the-play  - [ ] u15.reading-the-play  - [ ] u18.reading-the-play
- [ ] u9.decision-making  - [ ] u11.decision-making  - [ ] u13.decision-making  - [ ] u15.decision-making  - [ ] u18.decision-making
- [ ] u9.time-and-space  - [ ] u11.time-and-space  - [ ] u13.time-and-space  - [ ] u15.time-and-space  - [ ] u18.time-and-space
- [ ] u9.creativity-under-pressure  - [ ] u11.creativity-under-pressure  - [ ] u13.creativity-under-pressure  - [ ] u15.creativity-under-pressure  - [ ] u18.creativity-under-pressure

### Offensive Play
- [ ] u9.puck-carrier-options  - [ ] u11.puck-carrier-options  - [ ] u13.puck-carrier-options  - [ ] u15.puck-carrier-options  - [ ] u18.puck-carrier-options
- [ ] u9.off-puck-support-offense  - [ ] u11.off-puck-support-offense  - [ ] u13.off-puck-support-offense  - [ ] u15.off-puck-support-offense  - [ ] u18.off-puck-support-offense
- [ ] u9.attacking-1v1  - [ ] u11.attacking-1v1  - [ ] u13.attacking-1v1  - [ ] u15.attacking-1v1  - [ ] u18.attacking-1v1
- [ ] u11.cycle-and-possession  - [ ] u13.cycle-and-possession  - [ ] u15.cycle-and-possession  - [ ] u18.cycle-and-possession
- [ ] u11.zone-entry  - [ ] u13.zone-entry  - [ ] u15.zone-entry  - [ ] u18.zone-entry
- [ ] u11.odd-man-reads  - [ ] u13.odd-man-reads  - [ ] u15.odd-man-reads  - [ ] u18.odd-man-reads
- [ ] u11.net-front-play  - [ ] u13.net-front-play  - [ ] u15.net-front-play  - [ ] u18.net-front-play

### Defensive Play
- [ ] u11.gap-control  - [ ] u13.gap-control  - [ ] u15.gap-control  - [ ] u18.gap-control
- [ ] u9.angling-steering  - [ ] u11.angling-steering  - [ ] u13.angling-steering  - [ ] u15.angling-steering  - [ ] u18.angling-steering
- [ ] u9.defensive-side-positioning  - [ ] u11.defensive-side-positioning  - [ ] u13.defensive-side-positioning  - [ ] u15.defensive-side-positioning  - [ ] u18.defensive-side-positioning
- [ ] u11.coverage-reads  - [ ] u13.coverage-reads  - [ ] u15.coverage-reads  - [ ] u18.coverage-reads
- [ ] u9.stick-and-body-detail  - [ ] u11.stick-and-body-detail  - [ ] u13.stick-and-body-detail  - [ ] u15.stick-and-body-detail  - [ ] u18.stick-and-body-detail

### Transition & Compete
- [ ] u11.transition-reads  - [ ] u13.transition-reads  - [ ] u15.transition-reads  - [ ] u18.transition-reads
- [ ] u11.breakout-and-regroup  - [ ] u13.breakout-and-regroup  - [ ] u15.breakout-and-regroup  - [ ] u18.breakout-and-regroup
- [ ] u11.forecheck-pressure  - [ ] u13.forecheck-pressure  - [ ] u15.forecheck-pressure  - [ ] u18.forecheck-pressure
- [ ] u11.backcheck-recovery  - [ ] u13.backcheck-recovery  - [ ] u15.backcheck-recovery  - [ ] u18.backcheck-recovery
- [ ] u7.battles-and-compete  - [ ] u9.battles-and-compete  - [ ] u11.battles-and-compete  - [ ] u13.battles-and-compete  - [ ] u15.battles-and-compete  - [ ] u18.battles-and-compete

### Puck Skills
- [ ] u7.puck-control  - [ ] u9.puck-control  - [ ] u11.puck-control  - [ ] u13.puck-control  - [ ] u15.puck-control  - [ ] u18.puck-control
- [ ] u9.puck-protection  - [ ] u11.puck-protection  - [ ] u13.puck-protection  - [ ] u15.puck-protection  - [ ] u18.puck-protection
- [ ] u7.passing  - [ ] u9.passing  - [ ] u11.passing  - [ ] u13.passing  - [ ] u15.passing  - [ ] u18.passing
- [ ] u7.receiving  - [ ] u9.receiving  - [ ] u11.receiving  - [ ] u13.receiving  - [ ] u15.receiving  - [ ] u18.receiving
- [ ] u7.shooting  - [ ] u9.shooting  - [ ] u11.shooting  - [ ] u13.shooting  - [ ] u15.shooting  - [ ] u18.shooting

### Skating & Movement
- [ ] u7.edges-balance  - [ ] u9.edges-balance  - [ ] u11.edges-balance  - [ ] u13.edges-balance  - [ ] u15.edges-balance  - [ ] u18.edges-balance
- [ ] u7.agility-mobility  - [ ] u9.agility-mobility  - [ ] u11.agility-mobility  - [ ] u13.agility-mobility  - [ ] u15.agility-mobility  - [ ] u18.agility-mobility
- [ ] u9.backward-transitions  - [ ] u11.backward-transitions  - [ ] u13.backward-transitions  - [ ] u15.backward-transitions  - [ ] u18.backward-transitions
- [ ] u9.deception-with-feet  - [ ] u11.deception-with-feet  - [ ] u13.deception-with-feet  - [ ] u15.deception-with-feet  - [ ] u18.deception-with-feet
