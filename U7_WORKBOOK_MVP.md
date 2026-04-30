# U7 MVP Workbook

**Target:** 17 questions (matches the live Tracker's MVP scope).
**Companion:** [CURRICULUM_U7.md](./CURRICULUM_U7.md) (full reference) · [AUTHORING_STANDARDS.md](./AUTHORING_STANDARDS.md) · [CURRICULUM_MAP.md](./CURRICULUM_MAP.md).

This is the **launch-ready** U7 cut — 1 question per non-anchor concept, 2 per anchor concept (★). The full 48-question version lives in [U7_WORKBOOK.md](./U7_WORKBOOK.md) for post-MVP expansion.

Run `npm run audit:curriculum` after every batch of ~5 to confirm cells fill.

---

## Type allocation (17 questions)

| Bucket | Target % | # questions |
|---|---|---|
| Text (`mc` + `tf`) | 20% | 3-4 |
| Visual (`pov-mc`) | 70% | 12 |
| Spatial (`hot-spots`, `rink-*`) | 10% | 2 |

The rows below are pre-assigned types to land the mix automatically. Author what's listed.

---

## §1 SKILLS — 5 questions

- [ ] **Q1 · skating-posture · pov-mc · d:1** — Concept cue: athletic stance, knees bent, ready position
- [ ] **Q2 · puck-control · pov-mc · d:1** — Concept cue: puck close to stick, head up
- [ ] **Q3 · passing-receiving · pov-mc · d:1** — Concept cue: stick on ice for the receiver
- [ ] **Q4 · stick-position · mc · d:1** — Concept cue: where should the stick be in the defensive zone?
- [ ] **Q5 · eyes-up · pov-mc · d:1** — Concept cue: head up to find teammates and trouble

---

## §2 HOCKEY SENSE — 4 questions (★ ANCHOR — 2× weighted)

- [ ] **Q6 · reading-the-play ★ · pov-mc · d:1** — Concept cue: who's open / where's the play going next
- [ ] **Q7 · reading-the-play ★ · pov-mc · d:1** — Concept cue: anticipating the next pass
- [ ] **Q8 · decision-making ★ · pov-mc · d:1** — Concept cue: pass to open teammate
- [ ] **Q9 · decision-making ★ · pov-mc · d:1** — Concept cue: shoot when the net is open

---

## §3 TACTICS — 3 questions

- [ ] **Q10 · dz-coverage · pov-mc · d:1** — Concept cue: stay between attacker and net
- [ ] **Q11 · breakout · hot-spots · d:1** — Concept cue: tap where you should skate to receive the breakout pass
- [ ] **Q12 · oz-entry · pov-mc · d:1** — Concept cue: cross blue line with control, don't go offside

---

## §4 COMPETE — 3 questions

- [ ] **Q13 · battle-level · pov-mc · d:1** — Concept cue: race to every puck
- [ ] **Q14 · communication · mc · d:1** — Concept cue: what to yell when you're open
- [ ] **Q15 · recovery-resilience · tf · d:1** — Concept cue: if you fall down, get up fast (true/false)

---

## §5 GOALIE — 1 question (`pos: ['G']`)

- [ ] **Q16 · goalie-angle-depth · pov-mc · d:1** — Concept cue: stand between puck and net
- [ ] **Q17 · goalie-angle-depth · rink-label · d:1** — Concept cue: tap where the goalie should stand

---

## Tracking

**Progress:** 0 / 17 (0%)

By bucket:
- Text: 0 / 3 (mc / tf)
- Visual: 0 / 12 (pov-mc)
- Spatial: 0 / 2 (hot-spots, rink-label)

---

## Authoring sequence

1. **Anchor concepts first** (Q6-Q9) — these set the brand voice. 4 questions, 2 each on Reading-the-Play and Decision-Making.
2. **Skills next** (Q1-Q5) — concrete and easy.
3. **Compete + Goalie** (Q13-Q17) — habits and rules.
4. **Tactics last** (Q10-Q12) — softened-at-U7, save for when you've got the rhythm.

For visual questions, **batch by scene**: compose ONE rink scene in Scene Composer, then use "+ New Question" multiple times against it. A single rink-front-of-net scene can spawn questions on dz-coverage, decision-making, reading-the-play. Same image, different stems.

After 17 land, U7 is shipped. Move to U9 (target 39). Then U11 (target 52). MVP done at ~108 total.
