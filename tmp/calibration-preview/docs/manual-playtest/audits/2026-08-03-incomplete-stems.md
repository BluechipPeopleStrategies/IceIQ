# Audit — question stems with no question in them

**Date:** 2026-08-03
**Scope:** every question in `src/data/bank.json` (262) and every scenario-seed prompt
in `src/scenario/seeds/**` (49 prompt strings across 28 seed files).
**Trigger:** [CONTENT-3 in the 2026-08-03 playtest findings](../2026-08-03-playtest-findings.md)
— *"It doesn't ask you what you should do next. It doesn't say anything, but it gives
you options."* Recurring: also reported 2026-08-02 (#3).

**This audit changed nothing.** It is a read-only sweep. No bank, seed, or source file
was modified.

---

## Summary

| | Count |
|---|---|
| Questions scanned in `bank.json` | 262 |
| Scenario-seed prompts scanned | 49 |
| **Category 1 — stem never asks anything (confirmed)** | **45** |
| Category 1 in scenario seeds | **0** |
| Category 2 — asks, but omits information needed to answer | 25 listed (of ~76 candidates) |
| False positives in the final Category-1 set, after hand-check | **0 of 45** |

### Where the 45 live

| Band | Incomplete stems | Band total | Rate |
|---|---|---|---|
| U7 / Initiation | 25 | 39 | 64% |
| U9 / Novice | 12 | 30 | 40% |
| U13 / Peewee | 5 | 26 | 19% |
| U15 / Bantam | 3 | 10 | 30% |
| U11 / Atom | **0** | 156 | 0% |
| U18 / Midget | 0 | 1 | 0% |

### The real pattern: it tracks question *type*, not age band

| Type | Missing an ask | Type total | Rate |
|---|---|---|---|
| `next` ("what happens next") | **17** | **17** | **100%** |
| `seq` (sequencing) | 2 | 3 | 67% |
| `mc` (multiple choice) | 26 | 122 | 21% |
| `tf` | 0 | 23 | 0% (UI supplies the ask) |
| `mistake` | 0 | 16 | 0% (separate `question` field) |

Two things fall out of this:

1. **Every single `next`-type question in the bank is defective.** Not one of the 17
   contains an ask. Whatever generated them never emitted an interrogative, and the
   quiz UI does not add one — `next` renders under the same `📋 Game Situation` header
   as `mc` ([`src/App.jsx:2463-2470`](../../../src/App.jsx#L2463)). The
   `"What Happens Next"` label at [`src/App.jsx:2315`](../../../src/App.jsx#L2315) is
   a *format-preview* label only; the player never sees it during a quiz.
2. **U11 / Atom is completely clean** — all 156 stems end in a question. The defect is
   confined to the `gen_*` generated questions in U7/U9/U13/U15. The handwritten
   `rr-u11-*` set does not have this problem at all.

The instance the product owner hit — `gen_u9_decision-making_dec05`,
[bank.json:4226](../../../src/data/bank.json#L4226) — is #6 below.

---

## Method, and the honest false-positive rate

### The heuristic

For each question I reconstructed **the text the player actually sees**, because the
UI supplies part of the ask for some types. From
[`src/App.jsx:2463-2509`](../../../src/App.jsx#L2463):

| Type | What renders | Ask supplied by |
|---|---|---|
| `mc`, `next`, `seq` | `📋 Game Situation` + `sit` | **nothing** — the stem must carry it |
| `tf` | `⚡ True or False?` + `sit` | the chrome label |
| `mistake`, `zone-click` | `sit` + a separate bold `question` field | the `question` field |
| `multi` | `☑️ Select All That Apply` + `sit` + `q` | the chrome label + `q` |

A stem **asks something** if the rendered text contains any of:

- a `?`
- a trailing `:` (a valid completion stem — *"…the right read is:"*)
- a clause-initial directive verb — `tap`, `pick`, `choose`, `select`, `drag`, `place`,
  `order`, `name`, `identify`, `rank`, `find`, `draw`, `match`… — including after
  `and` / `then` / `;` / an em dash, so *"Read the defender's position **and tap** the
  teammate"* and *"Tap the weak-side ice you should relocate to"* both count as valid
  asks with no question mark
- `true or false`
- a bare wh-word with no `?`

Everything else is flagged.

### Recall checks I ran on the heuristic itself

- **Buried or rhetorical `?`** — for every stem containing a `?`, I measured how much
  text follows the *last* question mark. If an ask were buried mid-scenario, the tail
  would be long. **0 stems had more than 25 characters after their final `?`.** No
  stem hides its question in the middle.
- **Legacy schema** — checked for `q` / `choices` (the pre-normalization keys coalesced
  at [`src/App.jsx:2002-2013`](../../../src/App.jsx#L2002)). **Zero questions in
  `bank.json` use them.** Nothing was missed by only reading `sit` / `opts`.
- **`mistake`-type coverage** — all 16 `mistake` questions carry a populated `question`
  field, so none is silently relying on the `sit` alone.
- **Live-source check** — `src/data/povQuestions.json` and the `questions.json.*` files
  are **not imported anywhere**. [`src/qbLoader.js:1`](../../../src/qbLoader.js#L1)
  loads `bank.json` and nothing else, so 262 is the whole live bank.

### False-positive rate — stated honestly

I ran this in two stages and hand-checked all 68 stage-1 candidates:

| Stage | Flagged | Genuine | False positives |
|---|---|---|---|
| **Stage 1** — naive "no `?` anywhere" | 68 | 45 | **23 (33.8%)** |
| **Stage 2** — after the type-aware + directive rules | 45 | 45 | **0 (0%)** |

The 23 stage-1 false positives break down as:

- **22 `tf` questions.** A T/F stem is *supposed* to be a flat assertion — the ask is
  the `⚡ True or False?` label the UI draws above it. Excluding them is correct, not
  a fudge.
- **1 genuine imperative** — `gen_u13_scanning_scn05`, *"…Order the steps for a
  successful entry."* A real ask with no question mark, caught by the directive rule.

I then read all 45 survivors by hand. **All 45 are genuine** — every one is a purely
declarative narrative followed by options with nothing asked. So the final rule's
false-positive rate is 0%, but it only gets there because of the `tf` exclusion; the
raw signal on its own is a third noise.

**Scenario seeds:** stage 1 flagged 1 of 49 —
`u13_oddman_pass_mc_v1.json`, *"You carry the puck up the middle on a 3-on-1 rush. Read
the defender's position **and tap** the teammate with the open ice."* That is a false
positive; my first directive regex required a sentence boundary and missed `and tap`.
After the fix, **0 of 49 seed prompts lack an ask.** The seed authors are consistent —
every prompt ends in a `Tap…` / `Drag…` / `Where…?` instruction. This is a
bank-generation problem, not a seed problem.

### Voice used for the rewrites

Rewrites append the ask the bank already uses for that band and type, taken from
questions of the same type that *do* ask:

- U7/U9/U13 `mc` — **"What is the best play?"** (the dominant existing phrasing:
  `rev_u9_passing_seam`, `gen_u9_decision-making_5fy7`, `gen_u9_decision-making_35k9`,
  `gen_u13_decision-making_2v8q`, `rev_u7_passing_seam` all use it verbatim)
- `next` — **"What should you do next?"** (no precedent exists, because all 17 are
  defective; every `next` option set is an action *you* take, so this is the ask those
  options answer)
- `seq` — **"Order the steps for …"**, matching `gen_u13_scanning_scn05`

The scenario text is untouched in every case. Nothing is added but the ask, no correct
answer is changed, and no hockey content is invented.

---

## Category 1 — confirmed incomplete stems (45)

Index first, full detail below. Line numbers point at the `sit` field, which is the
line to edit.

| # | Question id | Band | Type | `sit` line | Ask to append |
|---|---|---|---|---|---|
| 1 | `gen_u9_reading-the-play_rdp01` | U9 / Novice | `mc` | [4061](../../../src/data/bank.json#L4061) | What is the best play? |
| 2 | `gen_u9_reading-the-play_rdp04` | U9 / Novice | `next` | [4114](../../../src/data/bank.json#L4114) | What should you do next? |
| 3 | `gen_u9_reading-the-play_rdp05` | U9 / Novice | `mc` | [4134](../../../src/data/bank.json#L4134) | What is the best play? |
| 4 | `gen_u9_decision-making_dec01` | U9 / Novice | `mc` | [4153](../../../src/data/bank.json#L4153) | What is the best play? |
| 5 | `gen_u9_decision-making_dec04` | U9 / Novice | `next` | [4206](../../../src/data/bank.json#L4206) | What should you do next? |
| 6 | `gen_u9_decision-making_dec05` | U9 / Novice | `mc` | [4226](../../../src/data/bank.json#L4226) | What is the best play? |
| 7 | `gen_u9_time-and-space_tas01` | U9 / Novice | `mc` | [4245](../../../src/data/bank.json#L4245) | What is the best play? |
| 8 | `gen_u9_time-and-space_tas04` | U9 / Novice | `next` | [4298](../../../src/data/bank.json#L4298) | What should you do next? |
| 9 | `gen_u9_time-and-space_tas05` | U9 / Novice | `mc` | [4318](../../../src/data/bank.json#L4318) | What is the best play? |
| 10 | `gen_u9_creativity-under-pressure_cup01` | U9 / Novice | `mc` | [4337](../../../src/data/bank.json#L4337) | What is the best play? |
| 11 | `gen_u9_creativity-under-pressure_cup04` | U9 / Novice | `next` | [4390](../../../src/data/bank.json#L4390) | What should you do next? |
| 12 | `gen_u9_creativity-under-pressure_cup05` | U9 / Novice | `mc` | [4410](../../../src/data/bank.json#L4410) | What is the best play? |
| 13 | `gen_u7_offense_sup01` | U7 / Initiation | `mc` | [4478](../../../src/data/bank.json#L4478) | What is the best play? |
| 14 | `gen_u7_hockey_sense_spc01` | U7 / Initiation | `next` | [4497](../../../src/data/bank.json#L4497) | What should you do next? |
| 15 | `gen_u7_transition_def01` | U7 / Initiation | `mc` | [4517](../../../src/data/bank.json#L4517) | What is the best play? |
| 16 | `gen_u7_offense_net01` | U7 / Initiation | `mc` | [4536](../../../src/data/bank.json#L4536) | What is the best play? |
| 17 | `gen_u7_transition_cmp01` | U7 / Initiation | `next` | [4575](../../../src/data/bank.json#L4575) | What should you do next? |
| 18 | `gen_u7_offense_sup02` | U7 / Initiation | `mc` | [4609](../../../src/data/bank.json#L4609) | What is the best play? |
| 19 | `gen_u7_defense_pos01` | U7 / Initiation | `mc` | [4628](../../../src/data/bank.json#L4628) | What is the best play? |
| 20 | `gen_u7_puck_skills_pas01` | U7 / Initiation | `mc` | [4647](../../../src/data/bank.json#L4647) | What is the best play? |
| 21 | `gen_u7_hockey_sense_rul01` | U7 / Initiation | `mc` | [4666](../../../src/data/bank.json#L4666) | What is the best play? |
| 22 | `gen_u7_hockey_sense_ovr01` | U7 / Initiation | `next` | [4685](../../../src/data/bank.json#L4685) | What should you do next? |
| 23 | `gen_u7_transition_off01` | U7 / Initiation | `mc` | [4705](../../../src/data/bank.json#L4705) | What is the best play? |
| 24 | `gen_u7_defense_gap01` | U7 / Initiation | `mc` | [4724](../../../src/data/bank.json#L4724) | What is the best play? |
| 25 | `gen_u7_offense_atk01` | U7 / Initiation | `mc` | [4757](../../../src/data/bank.json#L4757) | What is the best play? |
| 26 | `gen_u7_reading-the-play_rdp01` | U7 / Initiation | `mc` | [4776](../../../src/data/bank.json#L4776) | What is the best play? |
| 27 | `gen_u7_reading-the-play_rdp03` | U7 / Initiation | `next` | [4809](../../../src/data/bank.json#L4809) | What should you do next? |
| 28 | `gen_u7_reading-the-play_rdp05` | U7 / Initiation | `mc` | [4849](../../../src/data/bank.json#L4849) | What is the best play? |
| 29 | `gen_u7_decision-making_dec01` | U7 / Initiation | `mc` | [4868](../../../src/data/bank.json#L4868) | What is the best play? |
| 30 | `gen_u7_decision-making_dec03` | U7 / Initiation | `next` | [4901](../../../src/data/bank.json#L4901) | What should you do next? |
| 31 | `gen_u7_decision-making_dec05` | U7 / Initiation | `mc` | [4941](../../../src/data/bank.json#L4941) | What is the best play? |
| 32 | `gen_u7_time-and-space_tas01` | U7 / Initiation | `mc` | [4960](../../../src/data/bank.json#L4960) | What is the best play? |
| 33 | `gen_u7_time-and-space_tas03` | U7 / Initiation | `next` | [4993](../../../src/data/bank.json#L4993) | What should you do next? |
| 34 | `gen_u7_time-and-space_tas05` | U7 / Initiation | `mc` | [5033](../../../src/data/bank.json#L5033) | What is the best play? |
| 35 | `gen_u7_creativity-under-pressure_cup01` | U7 / Initiation | `mc` | [5052](../../../src/data/bank.json#L5052) | What is the best play? |
| 36 | `gen_u7_creativity-under-pressure_cup03` | U7 / Initiation | `next` | [5085](../../../src/data/bank.json#L5085) | What should you do next? |
| 37 | `gen_u7_creativity-under-pressure_cup05` | U7 / Initiation | `mc` | [5125](../../../src/data/bank.json#L5125) | What is the best play? |
| 38 | `gen_u13_scanning_scn04` | U13 / Peewee | `next` | [5322](../../../src/data/bank.json#L5322) | What should you do next? |
| 39 | `gen_u13_scanning_scn07` | U13 / Peewee | `next` | [5385](../../../src/data/bank.json#L5385) | What should you do next? |
| 40 | `gen_u13_off_puck_support_off01` | U13 / Peewee | `next` | [5618](../../../src/data/bank.json#L5618) | What should you do next? |
| 41 | `gen_u13_transition_reads_cmp01` | U13 / Peewee | `next` | [5672](../../../src/data/bank.json#L5672) | What should you do next? |
| 42 | `gen_u13_transition_reads_cmp02` | U13 / Peewee | `seq` | [5692](../../../src/data/bank.json#L5692) | Order the steps for getting the puck out of your zone. |
| 43 | `gen_u15_attacking_1v1_off01` | U15 / Bantam | `next` | [5805](../../../src/data/bank.json#L5805) | What should you do next? |
| 44 | `gen_u15_attacking_1v1_off02` | U15 / Bantam | `seq` | [5825](../../../src/data/bank.json#L5825) | Order the steps for beating the defender 1-on-1. |
| 45 | `gen_u15_breakout_and_regroup_cmp01` | U15 / Bantam | `next` | [5863](../../../src/data/bank.json#L5863) | What should you do next? |

### Full detail with proposed rewrites

#### 1. `gen_u9_reading-the-play_rdp01` — U9 / Novice, type `mc`, [bank.json:4061](../../../src/data/bank.json#L4061)

**Current stem (no ask):**
> Your teammate shoots, and the puck bounces off the goalie's pads into the slot. The goalie is down, and a defender is starting toward the loose puck.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Take an extra stickhandle to settle the puck before shooting
  --> 1. Stop near the net and tap the loose puck quickly before the defender gets there
        2. Peel away toward the boards to look for a pass
        3. Wait for your teammate to skate in for their own rebound
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate shoots, and the puck bounces off the goalie's pads into the slot. The goalie is down, and a defender is starting toward the loose puck. **What is the best play?**

#### 2. `gen_u9_reading-the-play_rdp04` — U9 / Novice, type `next`, [bank.json:4114](../../../src/data/bank.json#L4114)

**Current stem (no ask):**
> You are skating up the ice, and a teammate with the puck is skating right beside you. A defender steps up to block your teammate.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Slow down beside your teammate and wait for them to beat the defender
        1. Skate directly behind your teammate and hope for a drop pass in the same traffic
  --> 2. Skate away from the defender into an open lane so your teammate has a clear pass
        3. Cut in front of your teammate and skate toward the puck
```

**Proposed rewrite** (append only, scenario untouched):
> You are skating up the ice, and a teammate with the puck is skating right beside you. A defender steps up to block your teammate. **What should you do next?**

#### 3. `gen_u9_reading-the-play_rdp05` — U9 / Novice, type `mc`, [bank.json:4134](../../../src/data/bank.json#L4134)

**Current stem (no ask):**
> Your defenseman has the puck behind your net, looking to pass it up the ice to you. The other team's winger is standing right between you and your defenseman.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Stay exactly where you are and tap your stick on the ice
  --> 1. Skate to an open pocket of ice where the winger is not blocking the pass
        2. Skate closer to the boards where the winger is already blocking the lane
        3. Turn up ice without looking back for the puck
```

**Proposed rewrite** (append only, scenario untouched):
> Your defenseman has the puck behind your net, looking to pass it up the ice to you. The other team's winger is standing right between you and your defenseman. **What is the best play?**

#### 4. `gen_u9_decision-making_dec01` — U9 / Novice, type `mc`, [bank.json:4153](../../../src/data/bank.json#L4153)

**Current stem (no ask):**
> You are leading a 2-on-1 rush toward the net. The only defender slides over to block your pass, leaving you a clear path to the goalie.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Try to force a pass through the defender's skates to your teammate anyway
        1. Slow down and wait for the defender to choose again
  --> 2. Skate toward the net and take a quick shot yourself
        3. Dump the puck into the corner even though you have a shooting lane
```

**Proposed rewrite** (append only, scenario untouched):
> You are leading a 2-on-1 rush toward the net. The only defender slides over to block your pass, leaving you a clear path to the goalie. **What is the best play?**

#### 5. `gen_u9_decision-making_dec04` — U9 / Novice, type `next`, [bank.json:4206](../../../src/data/bank.json#L4206)

**Current stem (no ask):**
> You pick up the puck in your defensive corner. You look up the boards and see a defender waiting there to pressure you.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Skate the puck right across the front of your own goalie
  --> 1. Stop, turn back, and skate behind your own net to use the open ice on the other side
        2. Force the puck up the boards straight into the defender
        3. Throw a blind pass through the middle of your zone
```

**Proposed rewrite** (append only, scenario untouched):
> You pick up the puck in your defensive corner. You look up the boards and see a defender waiting there to pressure you. **What should you do next?**

#### 6. `gen_u9_decision-making_dec05` — U9 / Novice, type `mc`, [bank.json:4226](../../../src/data/bank.json#L4226)

**Current stem (no ask):**
> Your teammate is battling for the puck on the boards. You are open in the slot. The puck pops right to you.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Shoot the puck right away before the defenders can react
        1. Pass the puck back into the pile of players on the boards
        2. Stickhandle toward the boards to make a safer play
        3. Stop and wait for the goalie to get set
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate is battling for the puck on the boards. You are open in the slot. The puck pops right to you. **What is the best play?**

#### 7. `gen_u9_time-and-space_tas01` — U9 / Novice, type `mc`, [bank.json:4245](../../../src/data/bank.json#L4245)

**Current stem (no ask):**
> You are carrying the puck up the ice and see three defenders waiting at their blue line. Your teammate is skating fast into open ice on the outside wing.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Try to stickhandle straight through all three defenders by yourself
  --> 1. Pass the puck to your teammate in the open space before you reach the defenders
        2. Slow down at the blue line until a defender comes closer
        3. Turn around and skate all the way back to your own net
```

**Proposed rewrite** (append only, scenario untouched):
> You are carrying the puck up the ice and see three defenders waiting at their blue line. Your teammate is skating fast into open ice on the outside wing. **What is the best play?**

#### 8. `gen_u9_time-and-space_tas04` — U9 / Novice, type `next`, [bank.json:4298](../../../src/data/bank.json#L4298)

**Current stem (no ask):**
> You are on defense in your own zone. The puck comes to you, and you have plenty of time and space. No forechecker is near you.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Panic and ice the puck all the way down the rink
  --> 1. Keep your head up, skate forward into space, and make a good pass
        2. Stand still with the puck until a forechecker arrives
        3. Throw a blind pass through the middle of your zone
```

**Proposed rewrite** (append only, scenario untouched):
> You are on defense in your own zone. The puck comes to you, and you have plenty of time and space. No forechecker is near you. **What should you do next?**

#### 9. `gen_u9_time-and-space_tas05` — U9 / Novice, type `mc`, [bank.json:4318](../../../src/data/bank.json#L4318)

**Current stem (no ask):**
> Your teammate wins a faceoff in the offensive zone. The puck slides to you at the blue line, and you have a clear lane to the net.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Hold the puck until a defender gets close
  --> 1. Take a quick step into the open lane and shoot before the space closes
        2. Pass to a covered teammate along the boards
        3. Skate all the way into the corner with the puck
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate wins a faceoff in the offensive zone. The puck slides to you at the blue line, and you have a clear lane to the net. **What is the best play?**

#### 10. `gen_u9_creativity-under-pressure_cup01` — U9 / Novice, type `mc`, [bank.json:4337](../../../src/data/bank.json#L4337)

**Current stem (no ask):**
> You get the puck behind the other team's net. A defender chases you around the right side and cuts off your path.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Keep skating the same way and hope you can outrun the defender along the boards
  --> 1. Stop quickly, protect the puck, and go back out the left side where the ice is open
        2. Throw the puck to the front of the net without looking
        3. Freeze behind the net and wait for the defender to take the puck
```

**Proposed rewrite** (append only, scenario untouched):
> You get the puck behind the other team's net. A defender chases you around the right side and cuts off your path. **What is the best play?**

#### 11. `gen_u9_creativity-under-pressure_cup04` — U9 / Novice, type `next`, [bank.json:4390](../../../src/data/bank.json#L4390)

**Current stem (no ask):**
> You are skating up the wing, and a defender steps up right in front of you. Your teammate is skating into open ice behind the defender.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Try to skate straight through the defender with the puck
  --> 1. Chip the puck softly off the boards into space for your teammate
        2. Stop and wait for the defender to take the puck
        3. Turn all the way back without looking for your teammate
```

**Proposed rewrite** (append only, scenario untouched):
> You are skating up the wing, and a defender steps up right in front of you. Your teammate is skating into open ice behind the defender. **What should you do next?**

#### 12. `gen_u9_creativity-under-pressure_cup05` — U9 / Novice, type `mc`, [bank.json:4410](../../../src/data/bank.json#L4410)

**Current stem (no ask):**
> You have the puck in the slot, ready to shoot, but a defender drops down in front of you to block the lane.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Shoot it hard right into the defender's pads
  --> 1. Fake the shot, pull the puck to the side, and take a quick shot around the blocker
        2. Skate backward out of the slot right away
        3. Pass to a covered teammate behind you
```

**Proposed rewrite** (append only, scenario untouched):
> You have the puck in the slot, ready to shoot, but a defender drops down in front of you to block the lane. **What is the best play?**

#### 13. `gen_u7_offense_sup01` — U7 / Initiation, type `mc`, [bank.json:4478](../../../src/data/bank.json#L4478)

**Current stem (no ask):**
> Your teammate just picked up the puck along the boards. Three players from the other team are skating right toward them to try to steal it.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Skate away from the crowd into open ice and show your stick
        1. Skate right beside your teammate on the boards so you are close for a pass
        2. Stand near the puck and wait to see if it pops loose
        3. Turn back toward your own end in case the other team gets the puck
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate just picked up the puck along the boards. Three players from the other team are skating right toward them to try to steal it. **What is the best play?**

#### 14. `gen_u7_hockey_sense_spc01` — U7 / Initiation, type `next`, [bank.json:4497](../../../src/data/bank.json#L4497)

**Current stem (no ask):**
> You just picked up a loose puck. You look up and see two players from the other team straight ahead of you, but there is open ice on the left side.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Keep skating straight ahead and try to squeeze between the two defenders
        1. Stop with the puck and wait until a teammate tells you where to go
  --> 2. Steer your skates toward the open left side and keep your feet moving
        3. Shoot the puck down the ice before the defenders get closer
```

**Proposed rewrite** (append only, scenario untouched):
> You just picked up a loose puck. You look up and see two players from the other team straight ahead of you, but there is open ice on the left side. **What should you do next?**

#### 15. `gen_u7_transition_def01` — U7 / Initiation, type `mc`, [bank.json:4517](../../../src/data/bank.json#L4517)

**Current stem (no ask):**
> You are in the offensive zone trying to score, but a player on the other team steals the puck and starts skating fast toward your goalie.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Chase the puck carrier from behind and reach with your stick
        1. Stay near the other team's net in case your team steals it back
        2. Glide slowly toward your own zone and watch where the puck goes
  --> 3. Stop, turn around, and skate hard back toward your own net to help your goalie
```

**Proposed rewrite** (append only, scenario untouched):
> You are in the offensive zone trying to score, but a player on the other team steals the puck and starts skating fast toward your goalie. **What is the best play?**

#### 16. `gen_u7_offense_net01` — U7 / Initiation, type `mc`, [bank.json:4536](../../../src/data/bank.json#L4536)

**Current stem (no ask):**
> Your teammate is skating down the wing with the puck and is about to shoot on the goalie. You are skating down the middle of the ice.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Skate into the corner in case the shot misses the net
  --> 1. Stop near the front or side of the net with your stick on the ice, ready for a rebound
        2. Skate up beside your teammate and call for the puck right away
        3. Stop high in the zone and watch the shot
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate is skating down the wing with the puck and is about to shoot on the goalie. You are skating down the middle of the ice. **What is the best play?**

#### 17. `gen_u7_transition_cmp01` — U7 / Initiation, type `next`, [bank.json:4575](../../../src/data/bank.json#L4575)

**Current stem (no ask):**
> You are stickhandling up the ice, but you accidentally lose the puck off the toe of your blade. It is sitting just a few feet away from you.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Keep skating forward in a wide turn so you can come back around for it
  --> 1. Stop, pivot, and get right back on the puck before anyone else can reach it
        2. Slow down and wait for a teammate to pick it up
        3. Look down at your stick before you chase the puck
```

**Proposed rewrite** (append only, scenario untouched):
> You are stickhandling up the ice, but you accidentally lose the puck off the toe of your blade. It is sitting just a few feet away from you. **What should you do next?**

#### 18. `gen_u7_offense_sup02` — U7 / Initiation, type `mc`, [bank.json:4609](../../../src/data/bank.json#L4609)

**Current stem (no ask):**
> Your teammate intercepts a pass and has a clear breakaway. They are skating as fast as they can toward the other team's net.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Coast near center ice and watch the shot
        1. Turn toward the bench because the play is far away
        2. Stop at the blue line so you do not get too close
  --> 3. Skate hard behind them to follow up on the play
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate intercepts a pass and has a clear breakaway. They are skating as fast as they can toward the other team's net. **What is the best play?**

#### 19. `gen_u7_defense_pos01` — U7 / Initiation, type `mc`, [bank.json:4628](../../../src/data/bank.json#L4628)

**Current stem (no ask):**
> A player on the other team has the puck directly behind your net. You are the only defender back.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Stay in front of your goalie with your stick on the ice to protect the scoring area
        1. Chase the player all the way behind the net to try to steal the puck
        2. Stand beside one post and only watch the puck carrier
        3. Skate toward the corner boards before the puck carrier comes out
```

**Proposed rewrite** (append only, scenario untouched):
> A player on the other team has the puck directly behind your net. You are the only defender back. **What is the best play?**

#### 20. `gen_u7_puck_skills_pas01` — U7 / Initiation, type `mc`, [bank.json:4647](../../../src/data/bank.json#L4647)

**Current stem (no ask):**
> You are standing in open ice. Your teammate has the puck and looks right at you. You want them to pass it.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Yell loudly while your stick blade is off the ice
        1. Hold your stick near your skates without showing a clear target
        2. Turn away and skate into space where they cannot see your stick
  --> 3. Tap your stick blade flat on the ice where you want the puck
```

**Proposed rewrite** (append only, scenario untouched):
> You are standing in open ice. Your teammate has the puck and looks right at you. You want them to pass it. **What is the best play?**

#### 21. `gen_u7_hockey_sense_rul01` — U7 / Initiation, type `mc`, [bank.json:4666](../../../src/data/bank.json#L4666)

**Current stem (no ask):**
> You shoot the puck, and the goalie catches it in their glove. The referee blows the whistle.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Keep skating in and try to poke the puck loose before the goalie covers it
  --> 1. Stop right away, turn away from the goalie, and get ready for the next play
        2. Skate through the crease to see if the puck falls out
        3. Stand beside the goalie and wait for the referee to drop the puck there
```

**Proposed rewrite** (append only, scenario untouched):
> You shoot the puck, and the goalie catches it in their glove. The referee blows the whistle. **What is the best play?**

#### 22. `gen_u7_hockey_sense_ovr01` — U7 / Initiation, type `next`, [bank.json:4685](../../../src/data/bank.json#L4685)

**Current stem (no ask):**
> You skate into the offensive zone and see that two of your teammates are already in the right corner trying to get the puck from a defender.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Skate into the right corner to make it three teammates near the same puck
        1. Skate all the way back into your own defensive zone
  --> 2. Skate to the front of the net or the open left side and get your stick ready
        3. Stand right behind your two teammates in the corner
```

**Proposed rewrite** (append only, scenario untouched):
> You skate into the offensive zone and see that two of your teammates are already in the right corner trying to get the puck from a defender. **What should you do next?**

#### 23. `gen_u7_transition_off01` — U7 / Initiation, type `mc`, [bank.json:4705](../../../src/data/bank.json#L4705)

**Current stem (no ask):**
> The other team is attacking, but your goalie makes a save and the puck goes out to your defenseman.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Turn up the ice, start skating forward, and look back for a pass
        1. Stay in front of your goalie in case the puck comes back
        2. Skate slowly sideways and wait for your defenseman to carry it
        3. Skate into the same corner as your defenseman
```

**Proposed rewrite** (append only, scenario untouched):
> The other team is attacking, but your goalie makes a save and the puck goes out to your defenseman. **What is the best play?**

#### 24. `gen_u7_defense_gap01` — U7 / Initiation, type `mc`, [bank.json:4724](../../../src/data/bank.json#L4724)

**Current stem (no ask):**
> An attacker is skating fast right at you with the puck. You are the last defender back.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Reach only for the puck and let your body drift to one side
  --> 1. Keep your body between the attacker and your net, steering them toward the boards
        2. Back straight into your goalie so you do not get beaten
        3. Skate straight at the attacker and guess which way they will go
```

**Proposed rewrite** (append only, scenario untouched):
> An attacker is skating fast right at you with the puck. You are the last defender back. **What is the best play?**

#### 25. `gen_u7_offense_atk01` — U7 / Initiation, type `mc`, [bank.json:4757](../../../src/data/bank.json#L4757)

**Current stem (no ask):**
> You get a great pass in the middle of the ice. The only person between you and the goal is the goalie.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Stop skating right away so you can take a big shot from far away
        1. Pass the puck backward even though you have open ice
        2. Skate wide into the corner to stay away from pressure
  --> 3. Keep your feet moving, skate toward the net, and shoot
```

**Proposed rewrite** (append only, scenario untouched):
> You get a great pass in the middle of the ice. The only person between you and the goal is the goalie. **What is the best play?**

#### 26. `gen_u7_reading-the-play_rdp01` — U7 / Initiation, type `mc`, [bank.json:4776](../../../src/data/bank.json#L4776)

**Current stem (no ask):**
> Your goalie saves the puck to the corner. Two players from the other team skate toward it. You are the closest defender to your net.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Skate to the front of your net and keep your stick on the ice
        1. Chase both attackers deep into the corner
        2. Stand behind your own net and wait
        3. Skate up to the blue line for a pass
```

**Proposed rewrite** (append only, scenario untouched):
> Your goalie saves the puck to the corner. Two players from the other team skate toward it. You are the closest defender to your net. **What is the best play?**

#### 27. `gen_u7_reading-the-play_rdp03` — U7 / Initiation, type `next`, [bank.json:4809](../../../src/data/bank.json#L4809)

**Current stem (no ask):**
> Your teammate is skating down the side and is about to shoot. You are skating down the middle.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Skate into the corner in case the puck misses
  --> 1. Stop near the side of the net with your stick on the ice for a rebound
        2. Skate up to your teammate and crowd the puck
        3. Stop high in the zone and watch
```

**Proposed rewrite** (append only, scenario untouched):
> Your teammate is skating down the side and is about to shoot. You are skating down the middle. **What should you do next?**

#### 28. `gen_u7_reading-the-play_rdp05` — U7 / Initiation, type `mc`, [bank.json:4849](../../../src/data/bank.json#L4849)

**Current stem (no ask):**
> You are standing in front of the other team's net. Your teammate has the puck in the corner and looks at you.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Wave your hands while your stick is off the ice
        1. Skate right up to your teammate and bring traffic with you
  --> 2. Keep your stick blade flat on the ice as a target
        3. Turn your back and skate away from the net
```

**Proposed rewrite** (append only, scenario untouched):
> You are standing in front of the other team's net. Your teammate has the puck in the corner and looks at you. **What is the best play?**

#### 29. `gen_u7_decision-making_dec01` — U7 / Initiation, type `mc`, [bank.json:4868](../../../src/data/bank.json#L4868)

**Current stem (no ask):**
> You are skating down the ice with the puck. A defender is standing still in front of you. The side of the ice is empty.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Put your head down and skate straight at the defender
        1. Stop moving and wait for them to move away
  --> 2. Steer to the empty side and skate past them
        3. Shoot the puck from far away before you get closer
```

**Proposed rewrite** (append only, scenario untouched):
> You are skating down the ice with the puck. A defender is standing still in front of you. The side of the ice is empty. **What is the best play?**

#### 30. `gen_u7_decision-making_dec03` — U7 / Initiation, type `next`, [bank.json:4901](../../../src/data/bank.json#L4901)

**Current stem (no ask):**
> You dig the puck out of the corner beside your own goalie. A defender is standing in front of your net.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Skate the puck up the boards, keeping it close to the wall
        1. Skate the puck right across the front of your own net
        2. Leave the puck in the corner and skate away
        3. Pass it backward toward your own goalie
```

**Proposed rewrite** (append only, scenario untouched):
> You dig the puck out of the corner beside your own goalie. A defender is standing in front of your net. **What should you do next?**

#### 31. `gen_u7_decision-making_dec05` — U7 / Initiation, type `mc`, [bank.json:4941](../../../src/data/bank.json#L4941)

**Current stem (no ask):**
> You are on a breakaway with only the goalie in front of you. A player from the other team is skating hard behind you.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Stop skating and let them catch up
  --> 1. Keep skating fast toward the net and shoot
        2. Turn around and skate back toward the player chasing you
        3. Shoot the puck into the corner and chase it
```

**Proposed rewrite** (append only, scenario untouched):
> You are on a breakaway with only the goalie in front of you. A player from the other team is skating hard behind you. **What is the best play?**

#### 32. `gen_u7_time-and-space_tas01` — U7 / Initiation, type `mc`, [bank.json:4960](../../../src/data/bank.json#L4960)

**Current stem (no ask):**
> You get the puck near the boards. A player from the other team skates at you. The ice along the wall is open.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Keep your feet moving and skate up the boards into open ice
        1. Stop skating and hide the puck between your skates
        2. Pass across the front of your own net
        3. Stand still and wait for help
```

**Proposed rewrite** (append only, scenario untouched):
> You get the puck near the boards. A player from the other team skates at you. The ice along the wall is open. **What is the best play?**

#### 33. `gen_u7_time-and-space_tas03` — U7 / Initiation, type `next`, [bank.json:4993](../../../src/data/bank.json#L4993)

**Current stem (no ask):**
> You are skating with the puck, but it slips off your stick. It is only a few feet away.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Keep skating in a big circle to come back for it
        1. Give up and let the other team have it
        2. Look at your stick before chasing the puck
  --> 3. Stop, turn, and get back on the puck
```

**Proposed rewrite** (append only, scenario untouched):
> You are skating with the puck, but it slips off your stick. It is only a few feet away. **What should you do next?**

#### 34. `gen_u7_time-and-space_tas05` — U7 / Initiation, type `mc`, [bank.json:5033](../../../src/data/bank.json#L5033)

**Current stem (no ask):**
> You pick up a loose puck in the middle of the ice. Nobody is between you and the other team's goalie.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Pass to a teammate who is covered
  --> 1. Carry the puck toward the net as fast as you can
        2. Skate backward with the puck
        3. Shoot from center ice right away
```

**Proposed rewrite** (append only, scenario untouched):
> You pick up a loose puck in the middle of the ice. Nobody is between you and the other team's goalie. **What is the best play?**

#### 35. `gen_u7_creativity-under-pressure_cup01` — U7 / Initiation, type `mc`, [bank.json:5052](../../../src/data/bank.json#L5052)

**Current stem (no ask):**
> You are in the corner with the puck. A defender's stick blocks the direct pass, and your teammate is open nearby.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Bank the puck softly off the boards to your teammate
        1. Try to chop the puck through the defender's stick
        2. Cover the puck with your hand
        3. Shoot the puck high at the glass
```

**Proposed rewrite** (append only, scenario untouched):
> You are in the corner with the puck. A defender's stick blocks the direct pass, and your teammate is open nearby. **What is the best play?**

#### 36. `gen_u7_creativity-under-pressure_cup03` — U7 / Initiation, type `next`, [bank.json:5085](../../../src/data/bank.json#L5085)

**Current stem (no ask):**
> You have the puck near your goal line. A forechecker is coming to trap you on the wall.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Force the puck straight up the wall into pressure
        1. Throw the puck blindly to the front of your own net
  --> 2. Fake up the boards, turn back, and skate behind your net
        3. Stop on the wall and wait
```

**Proposed rewrite** (append only, scenario untouched):
> You have the puck near your goal line. A forechecker is coming to trap you on the wall. **What should you do next?**

#### 37. `gen_u7_creativity-under-pressure_cup05` — U7 / Initiation, type `mc`, [bank.json:5125](../../../src/data/bank.json#L5125)

**Current stem (no ask):**
> A defender slides on the ice in front of you to block your shot.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Shoot right into the defender's pads
  --> 1. Pull the puck around them and shoot through the open lane
        2. Pass backward right away even though you can shoot
        3. Leave the puck and skate away
```

**Proposed rewrite** (append only, scenario untouched):
> A defender slides on the ice in front of you to block your shot. **What is the best play?**

#### 38. `gen_u13_scanning_scn04` — U13 / Peewee, type `next`, [bank.json:5322](../../../src/data/bank.json#L5322)

**Current stem (no ask):**
> Your team is cycling the puck low in the offensive zone. You are the high forward (F3). You scan the slot and see it is open.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Back all the way out toward the red line to protect against a turnover
  --> 1. Slide into the open high slot, show your stick, and stay ready to recover if possession changes
        2. Skate down below the goal line to make it a three-player puck battle
        3. Stay wide near the boards and wait for a rim or rebound
```

**Proposed rewrite** (append only, scenario untouched):
> Your team is cycling the puck low in the offensive zone. You are the high forward (F3). You scan the slot and see it is open. **What should you do next?**

#### 39. `gen_u13_scanning_scn07` — U13 / Peewee, type `next`, [bank.json:5385](../../../src/data/bank.json#L5385)

**Current stem (no ask):**
> You pick up a loose puck in the high slot of your defensive zone. You feel pressure right on your back, but you have not scanned up the ice yet.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Chip a backhand pass toward the middle and hope a teammate is there
  --> 1. Protect the puck with your body and skate toward the safer boards to buy time to look up
        2. Turn back into the slot to keep possession in the middle of the ice
        3. Rim the puck hard around the boards before checking where your winger is
```

**Proposed rewrite** (append only, scenario untouched):
> You pick up a loose puck in the high slot of your defensive zone. You feel pressure right on your back, but you have not scanned up the ice yet. **What should you do next?**

#### 40. `gen_u13_off_puck_support_off01` — U13 / Peewee, type `next`, [bank.json:5618](../../../src/data/bank.json#L5618)

**Current stem (no ask):**
> Your winger is driving the puck wide down the right side. You are the center arriving late. The weak-side defender is locked onto the puck carrier and has not checked behind them.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Drive hard to the far post to occupy the defender and create a second threat
        1. Skate directly toward the puck carrier and crowd their lane
        2. Stop at the blue line for a drop pass while the rush moves below you
        3. Circle behind the net before the puck carrier has beaten the defender
```

**Proposed rewrite** (append only, scenario untouched):
> Your winger is driving the puck wide down the right side. You are the center arriving late. The weak-side defender is locked onto the puck carrier and has not checked behind them. **What should you do next?**

#### 41. `gen_u13_transition_reads_cmp01` — U13 / Peewee, type `next`, [bank.json:5672](../../../src/data/bank.json#L5672)

**Current stem (no ask):**
> You intercept a pass in the neutral zone. Two opponents are closing from the middle, but your winger is already moving up the wide lane with open ice.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Make a quick, firm pass to the winger who has speed and space
        1. Try to split the two middle defenders before they close their sticks
        2. Dump the puck in before checking whether the wide lane is open
        3. Turn back toward your own zone and let the counterattack slow down
```

**Proposed rewrite** (append only, scenario untouched):
> You intercept a pass in the neutral zone. Two opponents are closing from the middle, but your winger is already moving up the wide lane with open ice. **What should you do next?**

#### 42. `gen_u13_transition_reads_cmp02` — U13 / Peewee, type `seq`, [bank.json:5692](../../../src/data/bank.json#L5692)

**Current stem (no ask):**
> The other team misses the net, and the puck rims hard around the boards to you. You are starting a quick transition out of your zone.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Move your feet and snap a firm pass to the center's tape.
        1. Shoulder check before the puck arrives to read wall pressure.
        2. Cushion the puck off the boards so you have control.
        3. Locate your center curling low as the first support option.
```

**Proposed rewrite** (append only, scenario untouched):
> The other team misses the net, and the puck rims hard around the boards to you. You are starting a quick transition out of your zone. **Order the steps for getting the puck out of your zone.**

#### 43. `gen_u15_attacking_1v1_off01` — U15 / Bantam, type `next`, [bank.json:5805](../../../src/data/bank.json#L5805)

**Current stem (no ask):**
> You are attacking 1-on-1 off the rush. The defender has a tight gap and is matching your speed in the middle, but the outside lane is open.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Change pace with a hesitation, then accelerate into the wide lane
        1. Force a toe drag through the defender's stick and skates in the middle
        2. Stop completely and wait for the defender to back away on their own
        3. Shoot from the blue line even though the defender is set in the lane
```

**Proposed rewrite** (append only, scenario untouched):
> You are attacking 1-on-1 off the rush. The defender has a tight gap and is matching your speed in the middle, but the outside lane is open. **What should you do next?**

#### 44. `gen_u15_attacking_1v1_off02` — U15 / Bantam, type `seq`, [bank.json:5825](../../../src/data/bank.json#L5825)

**Current stem (no ask):**
> You are a forward receiving an outlet pass and preparing to attack a lone defender on a 1-on-1 rush.

**Options** (`-->` marks the correct answer, unchanged):
```
        0. Push the puck slightly wide to make the defender turn their hips.
        1. Build speed as you receive and move through the neutral zone.
        2. Cut back hard to the middle once the defender leans outside.
        3. Scan the defender's gap, stick, and feet before choosing your lane.
```

**Proposed rewrite** (append only, scenario untouched):
> You are a forward receiving an outlet pass and preparing to attack a lone defender on a 1-on-1 rush. **Order the steps for beating the defender 1-on-1.**

#### 45. `gen_u15_breakout_and_regroup_cmp01` — U15 / Bantam, type `next`, [bank.json:5863](../../../src/data/bank.json#L5863)

**Current stem (no ask):**
> You are a defenseman retrieving a dump-in. The forechecker takes an inside angle and cuts off your partner. Your strong-side winger is open on the wall.

**Options** (`-->` marks the correct answer, unchanged):
```
  --> 0. Shoulder check early, wheel the puck to the strong side, and make a firm wall pass
        1. Force the reverse to your partner even though the inside lane is covered
        2. Spin blind and fire the puck through the middle before pressure arrives
        3. Hide behind the net until the forechecker leaves the inside lane
```

**Proposed rewrite** (append only, scenario untouched):
> You are a defenseman retrieving a dump-in. The forechecker takes an inside angle and cuts off your partner. Your strong-side winger is open on the wall. **What should you do next?**

---

## Category 2 — stems that ask, but omit information needed to answer

This is [CONTENT-2](../2026-08-03-playtest-findings.md) — *"we don't know where the
puck is"*, *"is this always on D zone, neutral zone, etc.?"*

**No rewrites proposed.** Each of these needs a hockey judgment call about which detail
is load-bearing, and half of them may be fine as concept questions rather than
situational ones. They are listed so a coach can rule on them.

**Be sceptical of this list in a way you do not need to be about Category 1.** Category
2 does not admit a reliable mechanical detector. I tried three:

1. *situational stem missing a zone marker* — 163 hits, mostly noise (a question like
   *"What does it mean to 'read the play'?"* has no zone because it needs none)
2. *situational stem missing zone AND puck location* — 76 hits, still noisy
3. *stem with no zone but two or more zone-contingent options* — 7 hits, too strict

**Test 3 missed the product owner's own example** (`rr-u11-agility-mobility-2`,
[line 2916](../../../src/data/bank.json#L2916)), which is disqualifying. So the 25
below are **hand-selected** from the ~76-item candidate pool using one test: *would the
correct answer change if the missing detail were different?* That is a judgment, not a
measurement, and I would expect a coach to reject some of them.

The three the product owner named himself are #1, #2 and #3.

| # | Question id | Band | `sit` line | What is missing |
|---|---|---|---|---|
| 1 | `rr-u11-agility-mobility-2` | U11 | [2916](../../../src/data/bank.json#L2916) | **Owner-flagged.** No zone. "The puck squirts loose behind you… quickest way to get to it?" — if you have crossed the offensive blue line, the answer is constrained by offside/tag-up, not by turn radius. |
| 2 | `gen_u9_reading-the-play_128d` | U9 | [3947](../../../src/data/bank.json#L3947) | **Owner-flagged.** Jersey colours carry the whole stem but there is **no image** (`media` absent), and the puck's location is never stated. Decorative detail in, situational detail out — the exact inversion of his rule. |
| 3 | `gen_u7_time-and-space_tas01` | U7 | [4960](../../../src/data/bank.json#L4960) | **Owner-flagged.** No zone. "Pass across the front of your own net" is only clearly wrong in the D-zone. *Also appears as Category 1 #32 — this stem has no ask either.* |
| 4 | `gen_u9_decision-making_5fy7` | U9 | [3928](../../../src/data/bank.json#L3928) | Colour-coded players, **no image**. Same class as #2. |
| 5 | `gen_u13_scanning_bt2f` | U13 | [5231](../../../src/data/bank.json#L5231) | Colour-coded players, **no image**. |
| 6 | `gen_u13_gap_control_def02` | U13 | [5598](../../../src/data/bank.json#L5598) | "The gold defenseman" — colour-coded, **no image**. |
| 7 | `gen_u13_angling_steering_def02` | U13 | [5652](../../../src/data/bank.json#L5652) | "The gold defender" — colour-coded, **no image**. |
| 8 | `gen_u15_reading-the-play_sokd` | U15 | [5752](../../../src/data/bank.json#L5752) | Four colour references (white team / black team / black centre / white centre), **no image**, and the puck's location is inferable only from "moves to the puck in the corner". |
| 9 | `gen_u15_coverage_reads_def02` | U15 | [5785](../../../src/data/bank.json#L5785) | "Gold defenseman" / "gold center" — colour-coded, **no image**. |
| 10 | `gen_u15_backcheck_recovery_cmp02` | U15 | [5917](../../../src/data/bank.json#L5917) | "The gold team" — colour-coded, **no image**. |
| 11 | `rr-u11-decision-making-4` | U11 | [958](../../../src/data/bank.json#L958) | No zone, no score, no time. The correct option is *"when the reward is big and losing the puck won't hurt your team badly"* — which is precisely a score/time/zone judgment the stem never supplies. (Also logged as CONTENT-4 for its distractors.) |
| 12 | `rr-u11-puck-carrier-options-4` | U11 | [1312](../../../src/data/bank.json#L1312) | 2-on-1, but no distance to the net. "Take the shot they just gave you" is right in the slot and wrong from the blue line. |
| 13 | `rr-u11-odd-man-reads-2` | U11 | [1904](../../../src/data/bank.json#L1904) | Same as #12 — 2-on-1 with no stated distance or zone. |
| 14 | `rr-u11-reading-the-play-3` | U11 | [820](../../../src/data/bank.json#L820) | No zone and no statement of which end the play is in; one distractor ("dump the puck behind your net") is only coherent in one zone. |
| 15 | `rr-u11-backcheck-recovery-1` | U11 | [3652](../../../src/data/bank.json#L3652) | "Who should you pick up?" depends entirely on what your defencemen already have, which the stem never says. |
| 16 | `gen_u7_decision-making_dec04` | U7 | [4921](../../../src/data/bank.json#L4921) | "In the middle of the ice" is ambiguous between the neutral zone and the offensive slot; the mistake being taught only holds in the latter. |
| 17 | `gen_u13_scanning_scn01` | U13 | [5269](../../../src/data/bank.json#L5269) | "Bringing the puck up the ice on a rush" — no zone. The correct answer involves chipping into space and retrieving it, which is offside-constrained at the blue line. |
| 18 | `rr-u11-attacking-1v1-4` | U11 | [1566](../../../src/data/bank.json#L1566) | No zone. Already flagged as CONTENT-8 (image doesn't match the prompt); the missing zone is a second, independent problem. |
| 19 | `rr-u11-creativity-under-pressure-1` | U11 | [1122](../../../src/data/bank.json#L1122) | No zone. One distractor ("shoot the puck into the corner and give up the play") reads very differently in the O-zone than in your own end. |
| 20 | `rr-u11-attacking-1v1-5` | U11 | [1592](../../../src/data/bank.json#L1592) | The correct answer's justification is *"a turnover here is a breakaway against"* — true only in the neutral or offensive zone, which the stem never establishes. |
| 21 | `rr-u11-shooting-3` | U11 | [2712](../../../src/data/bank.json#L2712) | No distance to the net and no zone; "a low hard shot through traffic" is a different call from the point than from the slot. |
| 22 | `rr-u11-passing-4` | U11 | [2496](../../../src/data/bank.json#L2496) | "Forechecker" implies your own end but never says so; the timing read changes on a breakout versus a regroup. |
| 23 | `rr-u11-backward-transitions-2` | U11 | [3034](../../../src/data/bank.json#L3034) | No zone. Pivoting to the puck is right in the neutral zone; deep in your own end the goalie may be playing it. |
| 24 | `rr-u11-puck-control-3` | U11 | [2216](../../../src/data/bank.json#L2216) | No zone and no support information — "a spot you can pass or move from" presumes options the stem never establishes. |
| 25 | `rr-u11-deception-with-feet-3` | U11 | [3184](../../../src/data/bank.json#L3184) | No zone; a distractor explicitly turns on zone ("fakes are only allowed inside the offensive zone"). |

### Candidates I deliberately did not list

- Stems whose missing zone genuinely does not matter — pure skill or concept questions
  (*"What should your stick blade do as the puck arrives?"*, *"What is a 'breakout'?"*).
  The mechanical tests flagged dozens of these; they are not defects.
- `img_u13_odd-man-reads_01`–`04`. These use colour references too, but they **do**
  carry `media`, so the colours are load-bearing labels for a real diagram rather than
  decoration. They belong to CONTENT-5/CONTENT-9 (does the render agree with the
  prompt?), not here.

---

## Adjacent finding, not asked for

`WeeklyQuiz` ([`src/App.jsx:3828-3833`](../../../src/App.jsx#L3828)) renders
`mistake`-type questions as `🔍 Spot the Mistake` + `sit` and **never renders
`q.question`**. The main quiz renderer does
([`src/App.jsx:2487-2493`](../../../src/App.jsx#L2487)). So all 16 `mistake` questions
— which are clean in the main quiz — become Category-1 defects the moment they are
served in a weekly quiz: scenario, options, no ask. This is a one-line render fix, not
a content fix, and it is outside the scope of this audit. Not verified in a browser.

---

## What I could not determine

- **Whether the two `seq` rewrites are the right framing.** For `seq` I had to write
  the *purpose* clause ("…for getting the puck out of your zone", "…for beating the
  defender 1-on-1") rather than a fixed phrase, because the one good `seq` example
  states a purpose. Both clauses are read directly off the option text, but they are
  the only place in this audit where I wrote more than a stock sentence. Worth a
  second look.
- **Whether `next`-type questions want "What should you do next?" or a genuine
  prediction ask** ("What happens next?"). I chose the action framing because every
  `next` option set describes an action *you* take, not an outcome you predict — but
  the type name suggests prediction was the original intent. If the intent was
  prediction, these 17 need a content decision, not a one-line append.
- **The band-leakage question from CONTENT-3.** `gen_u9_decision-making_dec05` is
  tagged `"levels": ["U9 / Novice"]` and was served in a U11 session. I did not trace
  the filtering code — that is a separate investigation.
- **Whether any of the 45 are already dead.** I did not check `review-queue.json`,
  `review-log.jsonl`, or the local-override / kill-list mechanism
  ([`src/review/overrides.js`](../../../src/review/overrides.js)) to see whether any of
  these have already been edited or killed in someone's local state. The audit reads
  the committed `bank.json` only.
- **Category 2 completeness.** The 25 are a hand-picked sample of a ~76-item candidate
  pool, and the pool itself came from heuristics that demonstrably missed at least one
  known instance. Treat 25 as a floor, not a count.
