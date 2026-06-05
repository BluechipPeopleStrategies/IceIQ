# Coverage gaps — what to fill next

> Snapshot 2026-06-05. Regenerate the counts with the one-liner at the bottom.
> This file tells Gemini/ChatGPT exactly which nodeIds are empty so the offline
> pipeline fills real holes instead of piling more onto U11.

## The state of the bank

152 curriculum nodes (6 ages x ~25-31 concepts). **32 questions total. Only 2 nodes have 3+.**
The bank is thin almost everywhere and nearly empty at the older ages.

| Age | Nodes | Questions | Empty | Thin (1-2) | OK (3+) |
|-----|------:|----------:|------:|-----------:|--------:|
| U7  | 7     | 0         | 7     | 0          | 0 |
| U9  | 21    | 10        | 16    | 4          | 1 |
| U11 | 31    | 16        | 22    | 8          | 1 |
| U13 | 31    | 4         | 28    | 3          | 0 |
| U15 | 31    | 1         | 30    | 1          | 0 |
| U18 | 31    | 1         | 30    | 1          | 0 |

## Priority order

Fill for **breadth first** (every age group has a usable spine) before depth:

1. **U7** — totally empty. 7 nodes. Highest priority: a brand-new player opening the app today hits nothing.
2. **U15 + U18** — 1 question each. The "hard tier" and the oldest players have no content.
3. **U13** — 28 empty; it's the bridge age and the natural home for the geometry scan-tests.
4. **Backfill U9 / U11 holes** — they look "covered" but are 16/22 empty respectively.

Target ~6-8 questions per node (Track A text). That's ~900 questions to fill every node once —
so this is a run-it-for-weeks effort, not one sitting. Breadth passes first.

---

## Text drivers (Track A) — paste after PROMPT A-BULK in Gemini

Each block is one bulk run (<=10 nodes, ~8 questions each ≈ 60-80 Q). Run, review in ChatGPT
with PROMPT B-BULK, paste into `_queue-bank.json`, then "Merge `_queue-bank.json` into bank.json."

### U7 (all 7 — one run)

```text
Generate 6 questions each for:
u7.edges-balance, u7.agility-mobility, u7.puck-control, u7.passing,
u7.receiving, u7.shooting, u7.battles-and-compete
```

### U15 (3 runs)

```text
Generate 8 questions each for:
u15.scanning, u15.decision-making, u15.time-and-space, u15.creativity-under-pressure,
u15.puck-carrier-options, u15.off-puck-support-offense, u15.attacking-1v1,
u15.cycle-and-possession, u15.zone-entry, u15.odd-man-reads
```
```text
Generate 8 questions each for:
u15.net-front-play, u15.gap-control, u15.angling-steering, u15.defensive-side-positioning,
u15.coverage-reads, u15.stick-and-body-detail, u15.transition-reads,
u15.breakout-and-regroup, u15.forecheck-pressure, u15.backcheck-recovery
```
```text
Generate 8 questions each for:
u15.battles-and-compete, u15.edges-balance, u15.agility-mobility, u15.backward-transitions,
u15.deception-with-feet, u15.puck-control, u15.puck-protection, u15.passing,
u15.receiving, u15.shooting
```

### U18 (3 runs)

```text
Generate 8 questions each for:
u18.scanning, u18.decision-making, u18.time-and-space, u18.creativity-under-pressure,
u18.puck-carrier-options, u18.off-puck-support-offense, u18.attacking-1v1,
u18.cycle-and-possession, u18.zone-entry, u18.odd-man-reads
```
```text
Generate 8 questions each for:
u18.net-front-play, u18.gap-control, u18.angling-steering, u18.defensive-side-positioning,
u18.coverage-reads, u18.stick-and-body-detail, u18.transition-reads,
u18.breakout-and-regroup, u18.forecheck-pressure, u18.backcheck-recovery
```
```text
Generate 8 questions each for:
u18.battles-and-compete, u18.edges-balance, u18.agility-mobility, u18.backward-transitions,
u18.deception-with-feet, u18.puck-control, u18.puck-protection, u18.passing,
u18.receiving, u18.shooting
```

### U13 (3 runs)

```text
Generate 8 questions each for:
u13.edges-balance, u13.agility-mobility, u13.backward-transitions, u13.deception-with-feet,
u13.puck-control, u13.puck-protection, u13.passing, u13.receiving, u13.shooting,
u13.reading-the-play
```
```text
Generate 8 questions each for:
u13.time-and-space, u13.creativity-under-pressure, u13.puck-carrier-options,
u13.off-puck-support-offense, u13.attacking-1v1, u13.cycle-and-possession, u13.zone-entry,
u13.odd-man-reads, u13.net-front-play, u13.angling-steering
```
```text
Generate 8 questions each for:
u13.defensive-side-positioning, u13.coverage-reads, u13.stick-and-body-detail,
u13.transition-reads, u13.breakout-and-regroup, u13.forecheck-pressure,
u13.backcheck-recovery, u13.battles-and-compete
```

### U9 backfill (2 runs)

```text
Generate 6 questions each for:
u9.edges-balance, u9.agility-mobility, u9.backward-transitions, u9.deception-with-feet,
u9.puck-control, u9.puck-protection, u9.receiving, u9.shooting
```
```text
Generate 6 questions each for:
u9.creativity-under-pressure, u9.puck-carrier-options, u9.off-puck-support-offense,
u9.attacking-1v1, u9.angling-steering, u9.defensive-side-positioning,
u9.stick-and-body-detail, u9.battles-and-compete
```

### U11 backfill (3 runs)

```text
Generate 8 questions each for:
u11.edges-balance, u11.agility-mobility, u11.backward-transitions, u11.deception-with-feet,
u11.puck-protection, u11.shooting, u11.creativity-under-pressure, u11.puck-carrier-options
```
```text
Generate 8 questions each for:
u11.off-puck-support-offense, u11.attacking-1v1, u11.cycle-and-possession, u11.zone-entry,
u11.net-front-play, u11.gap-control, u11.angling-steering, u11.defensive-side-positioning
```
```text
Generate 8 questions each for:
u11.coverage-reads, u11.stick-and-body-detail, u11.transition-reads,
u11.breakout-and-regroup, u11.forecheck-pressure, u11.backcheck-recovery
```

---

## Geometry versions (Track B) — for the concepts worth the premium feel

Don't make geometry versions of everything. Use PROMPT C (in START-HERE.md) for the concepts that
are genuinely spatial reads — scanning, reading-the-play, odd-man-reads, gap-control, zone-entry,
off-puck-support, coverage-reads. Skip pure-skill nodes (edges, puck-control, shooting) and
misconception/technique nodes — those stay text. Compile each with
`node scripts/brief-to-seed.mjs <brief.json>`.

---

## Regenerate this snapshot

```bash
node -e 'const l=require("./src/data/curriculum-ledger.json"),b=require("./src/data/bank.json");const c={};for(const a in b)for(const q of b[a]){if(q.nodeId)c[q.nodeId]=(c[q.nodeId]||0)+1}for(const a of ["U7","U9","U11","U13","U15","U18"]){const e=l.nodes.filter(n=>n.ageId===a&&!(c[n.id]>0)).map(n=>n.id);console.log("\n["+a+"] "+e.length+" empty:\n"+e.join(", "))}'
```
