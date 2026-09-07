# U11 / Atom question-type audit — CONTENT-1

**Date:** 2026-08-03
**Scope:** all 156 questions in `src/data/bank.json` → `"U11 / Atom"`
**Status:** PROPOSAL. Nothing was changed. No file outside this one was touched.
**Source finding:** [CONTENT-1](../2026-08-03-playtest-findings.md#content-1--every-u11-question-is-untyped-so-u11-is-mc-only)

---

## 1. What each type actually requires

Read from the engine, not inferred. Three places define the contract:

- **Renderers** — `src/App.jsx` `Quiz()` (L1843), dispatch switch at L2290, prompt
  cards at L2463-2509; `WeeklyQuiz()` (L3725), prompt cards at L3815-3870.
- **Widgets** — `MCQuestion` (L1066), `MultiMCQuestion` (L1111), `SeqQuestion` (L1206),
  `TFQuestion` (L1259), `NextQuestion` (L1292).
- **Validator** — `tools/preflight.mjs` L190-200 is the authoritative schema gate.

| Type | Required fields | `ok` means | Options | Prompt card | Widget |
|---|---|---|---|---|---|
| `mc` | `sit`, `opts[]` (≥2), `ok` | index into `opts` | 4 by convention (48/48 in bank) | 📋 Game Situation, or 👀 Read the Play when `media.url` present | `MCQuestion` |
| `next` | `sit`, `opts[]` (≥2), `ok` | index into `opts` | 4 in all 17 bank cases | 📋 Game Situation + "What Happens Next" badge | `NextQuestion` (Quiz) / `MCQuestion` (WeeklyQuiz) |
| `mistake` | `sit`, **`question`**, `opts[]`, `ok` | index into `opts` | 4 in all 16 bank cases | 🔍 Spot the Mistake — `sit` renders dim/subordinate, **`question` renders as the bold prompt** (L2491) | `MCQuestion` |
| `tf` | `sit`, `ok` — **no `opts`** | **boolean**. `true` → TRUE correct | none; TRUE/FALSE hard-coded | ⚡ True or False? | `TFQuestion` |
| `seq` | `sit`, **`items[]`**, **`correct_order[]`** | unused (absent in all 3 bank cases) | none | 🔢 Put in Order | `SeqQuestion` |
| `multi` | `q`, `opts[]`, **`correct[]`** | unused | any | ☑️ Select All That Apply | `MultiMCQuestion` |

Preflight's rule is blunt and decisive (L190-200):

```js
if (t === "tf") {
  if (typeof q.ok !== "boolean") err(`tf requires boolean ok`);
} else if (t === undefined || t === "mc" || t === "mistake" || t === "next") {
  if (!Array.isArray(q.opts) || q.opts.length < 2) err(`legacy mc requires opts[]`);
  if (typeof q.ok !== "number" || ...) err(`ok out of range`);
}
```

**`undefined`, `mc`, `mistake` and `next` are field-identical.** `tf` and `seq` are not.

### Shapes in the four typed bands (verified, not sampled)

| Type | n | `ok` type | `opts` len | Extra fields |
|---|---|---|---|---|
| `mc` | 48 | int (48/48) | 4 (48/48) | `explain` |
| `tf` | 22 | **bool (22/22)** | **none (22/22)** | `tip` + `why` |
| `mistake` | 16 | int | 4 | **`question`** + `explain` |
| `next` | 17 | int | 4 | `tip` + `explain` |
| `seq` | 3 | absent | none | **`items` + `correct_order`** |

### The U11 shape

All 156 are one of exactly two key-sets, and they differ only by `media`:

```
129 × (cat, conceptId, concepts, d, id, media, nodeId, ok, opts, sit, tip, why)
 27 × (cat, conceptId, concepts, d, id,        nodeId, ok, opts, sit, tip, why)
```

- `ok` is an **int in 156/156**
- `opts` is **length 4 in 156/156**
- `question` present in **0/156**
- `items` / `correct_order` present in **0/156**

---

## 2. What the missing field is actually costing

`question?.type || "mc"` (L1999) makes the omission *look* cosmetic. It is not — four
call sites test `q.type` by equality, and `undefined` fails all of them:

| Site | Code | Effect on the 156 |
|---|---|---|
| `src/App.jsx:635` | `onlyTypes.includes(q.type)` | **Excluded from every format drill.** This is the literal cause of "no true/false questions available for U11 / Atom" (`src/speedRound.jsx:149`) — and the same wall exists for mc, mistake and next drills. |
| `src/App.jsx:671` | `q.type === "mc"` | **Excluded from the demo-quiz MC top-up pool.** The demo builder cannot pad a U11 session with MC. |
| `src/App.jsx:648-650` | `matchType` | Excluded from the demo builder's `mc-image` / `mc-text` targets — 129 image-backed U11 questions are invisible to the format that the code comments call "the headline format". |
| `src/App.jsx:792` | `!q.type \|\| q.type === "mc" \|\| ...` | **Currently passing** the FREE-tier filter via the `!q.type` escape hatch. This is the one place the omission is load-bearing — see the warning in §5. |
| `src/App.jsx:511` | `shuffleOpts` guard | Currently shuffling (guard is `q.type && ...`). Declaring `mc`/`mistake`/`next` preserves this; `tf`/`seq` would stop it, correctly. |

So declaring `type: "mc"` is not a no-op relabel. It *adds* 156 questions to three pools
they are presently locked out of.

---

## 3. The convention finding that shapes every proposal

Counted across the whole bank:

| | stems containing `?` |
|---|---|
| `next` | **0 of 17** |
| `mistake` | **0 of 16** |
| `mc` | 22 of 48 |
| **U11 / Atom (untyped)** | **156 of 156** |

The bank's `next` and `mistake` stems are deliberately *declarative* — a situation with
no interrogative, and the type badge ("What Happens Next", "Spot the Mistake") supplies
the question. Example, `gen_u9_reading-the-play_rdp04`:

> "You are skating up the ice, and a teammate with the puck is skating right beside you.
> A defender steps up to block your teammate."

Every one of the 156 U11 stems instead asks its own question and ends in `?`. That is the
`mc` authoring convention.

**Conclusion: U11 was not authored as a mix of types with the field dropped. It was
authored wholesale in the mc convention.** The missing `type` is uniform authoring
practice, not 156 dropped fields. That materially changes the fix: this is a
declaration, not a reconstruction.

---

## 4. Hard limits — what would break

| Proposed type | Verdict for U11 | Why |
|---|---|---|
| `mc` | **Safe, all 156** | Fields already match exactly. Preflight-clean. Zero render risk. |
| `next` | **Field-safe, all 156** | Preflight treats it identically to `mc`. Convention-deviant (stem carries its own `?`) and PRO-gates the question — see §5. |
| `mistake` | **NOT safe, all 156** | Renders `q.question` as the bold prompt (L2491). 0/156 have it, so the card shows the situation in *dim subordinate* styling with an empty bold line under it — the exact "stem with no interrogative" defect logged as CONTENT-3. Requires authoring a `question` field: out of scope. |
| `tf` | **NOT safe, all 156** | Preflight **errors**: `tf requires boolean ok`, and `ok` is an int in 156/156. Even ignoring preflight, `TFQuestion` reads `q.ok ? 1 : 0`, so `ok: 0` would silently mark FALSE correct and `ok: 1,2,3` would silently mark TRUE correct — **the answer key inverts or randomises without any error**. Requires dropping `opts`, restating `sit` as a claim, and rewriting `ok` to boolean. |
| `seq` | **NOT safe, all 156** | `SeqQuestion` L1207 evaluates `q.items.length` on mount. `items` is absent in 156/156 → **TypeError, white screen**. Preflight has no legacy-branch rule for `seq`, so this crash would ship undetected. |
| `multi` | **NOT safe, all 156** | Needs `q` and `correct[]`; both absent in 156/156. Scores every answer wrong (`correctSet` empty). |

**Zero of the 156 can be given a non-`mc`/`next` type without editing content.**

---

## 5. Two things a reviewer must decide before any `next` is applied

**(a) `next` moves a question behind the PRO wall.** `src/App.jsx:792`:

```js
posFiltered = posFiltered.filter(q => !q.type || q.type === "mc" || q.type === "tf" || isBoardMC(q));
```

Untyped questions pass today via `!q.type`. `type: "mc"` also passes. `type: "next"`
does **not** — it becomes PRO surface. Every question typed `next` leaves the FREE U11
pool. The 13 proposed below are 8.3% of the band; that is the intended cost, but it is a
product decision, not a data cleanup.

**(b) `next` loses colorblind support in the main quiz.** The two renderers disagree:

- `Quiz` L2295: `<NextQuestion q={q} sel={sel} onPick={handlePick}/>` — `NextQuestion`
  (L1292) hardcodes `C.green` / `C.red` and takes no `colorblind` prop.
- `WeeklyQuiz` L3850: `<MCQuestion ... colorblind={player.colorblind}/>` — correct.

So a colorblind player answering a `next` question gets red/green in the main quiz and
blue/orange in the weekly. This is a pre-existing bug independent of this audit, but
typing 13 U11 questions `next` is the first time it would affect the flagship band.
**Recommend fixing L2295 before applying any `next`.**

---

## 6. Proposal summary

| Proposed type | Count | Share | Mechanically safe? |
|---|---|---|---|
| `mc` | **143** | 91.7% | Yes — declare and ship |
| `next` | **13** | 8.3% | Field-safe; gated on the two decisions in §5 |
| `mistake` | 0 | — | Blocked: needs a `question` field |
| `tf` | 0 | — | Blocked: needs boolean `ok`, no `opts` |
| `seq` | 0 | — | Blocked: needs `items` + `correct_order` |

**Apply mechanically without review: 143.** All 143 `mc` rows are mechanically identical
to the field shape they already have, so all 143 are safe to declare. Confidence within
them splits 112 high / 30 medium / 1 low, but medium here means "could arguably be typed
`next` instead", not "risky to declare `mc`" — `mc` is the correct and safe declaration
for every one of the 143 either way.

**Needs human review: 16** (not blocking the 143 above)
- 13 `next` proposals — semantic judgment plus the two §5 decisions
- `rr-u11-decision-making-4` — `mc` is right, but CONTENT-4 says the distractors do not
  belong to the stem; fix the content, not the type
- `rr-u11-attacking-1v1-4` — `mc` is right, but CONTENT-8 says the image contradicts the
  stem
- `rr-u11-agility-mobility-2` — `mc` is right, but CONTENT-2 says the stem omits zone and
  puck location

If the reviewer wants a strictly zero-risk first pass, **set all 156 to `mc`** and treat
the 13 `next` rows as pass two. That is fully reversible and unblocks the format drills
immediately.

---

## 7. Full table — all 156

`Conf` = confidence in the proposed type. Stems truncated to ~60 chars.

| # | id | Stem (truncated) | Proposed | Conf | Reason |
|---|---|---|---|---|---|
| 0 | `rr-u11-gap-control-1` | What is your 'gap' when defending against a puck carrier on… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 1 | `rr-u11-gap-control-2` | You're defending the rush with a huge gap, and the carrier… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 2 | `rr-u11-gap-control-3` | You're the lone defender on a 2-on-1. What's the classic jo… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 3 | `rr-u11-gap-control-4` | The carrier slows down through the neutral zone. What shoul… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 4 | `rr-u11-gap-control-5` | When is the right moment to close your gap completely and t… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 5 | `rr-u11-angling-steering-1` | What does it mean to 'angle' a puck carrier instead of chas… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 6 | `rr-u11-angling-steering-2` | Why do defenders steer carriers toward the boards instead o… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 7 | `rr-u11-angling-steering-3` | You're angling a carrier along the wall. Where should your… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 8 | `rr-u11-angling-steering-4` | You sprint straight at the carrier in open ice instead of a… | **next** | medium | Stem asks the outcome of an error ("What usually happens?"). The "What Happens Next" badge matches it exactly. Options are outcomes, not actions - the one next proposal where that is true. Also a mistake candidate (8b); pick one. |
| 9 | `rr-u11-angling-steering-5` | Your angle forces the carrier down the wall, right toward y… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 10 | `rr-u11-defensive-side-positioning-1` | You're covering an attacker near your net. Where should you… | **mc** | high | Technique or body position. Options are techniques. |
| 11 | `rr-u11-defensive-side-positioning-2` | The puck is in the corner and your check drifts toward the… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 12 | `rr-u11-defensive-side-positioning-3` | Your check is parked at the net front waiting for a pass. B… | **mc** | high | Technique or body position. Options are techniques. |
| 13 | `rr-u11-defensive-side-positioning-4` | Why is it a problem to end up on the wrong side — between y… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 14 | `rr-u11-defensive-side-positioning-5` | Your check keeps skating in loops trying to shake you near… | **mc** | high | Technique or body position. Options are techniques. |
| 15 | `rr-u11-coverage-reads-1` | You skate back into your defensive zone as the other team s… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 16 | `rr-u11-coverage-reads-2` | Two attackers cross paths in your zone, swapping sides. You… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 17 | `rr-u11-coverage-reads-3` | The puck is on the strong side (where the battle is). What… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 18 | `rr-u11-coverage-reads-4` | Your teammate gets beat and their attacker walks toward the… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 19 | `rr-u11-coverage-reads-5` | Why do coaches say d-zone coverage is a team picture, not f… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 20 | `rr-u11-stick-and-body-detail-1` | Coaches say to have an 'active stick' when defending. What… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 21 | `rr-u11-stick-and-body-detail-2` | The carrier is protecting the puck on their far side where… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 22 | `rr-u11-stick-and-body-detail-3` | A rebound is about to drop in front of your net with an att… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 23 | `rr-u11-stick-and-body-detail-4` | You go for a big poke check, miss, and the carrier is now p… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 24 | `rr-u11-stick-and-body-detail-5` | The pass is coming through your area but you can't reach th… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 25 | `rr-u11-scanning-1` | Coaches say to keep your 'head on a swivel.' What does that… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 26 | `rr-u11-scanning-2` | A pass is coming to you along the wall. When is the best ti… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 27 | `rr-u11-scanning-3` | You scanned two seconds ago and the ice looked open. Why sc… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 28 | `rr-u11-scanning-4` | You're skating into the offensive zone without the puck. Wh… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 29 | `rr-u11-scanning-5` | Two players receive the same pass under pressure. One makes… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 30 | `rr-u11-reading-the-play-1` | You hear coaches talk about it all the time. What does it m… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 31 | `rr-u11-reading-the-play-2` | The opposing defenseman at the point winds up for a big sla… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 32 | `rr-u11-reading-the-play-3` | The puck carrier's eyes and stick blade both point toward t… | **next** | high | Stem literally asks for the next event: "What is your best guess about the next play?" Options are predictions. Unambiguous. |
| 33 | `rr-u11-reading-the-play-4` | Your teammate wins a battle in the corner and gets the puck… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 34 | `rr-u11-reading-the-play-5` | The other team's defenseman pinches down the wall to keep t… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 35 | `rr-u11-decision-making-1` | You have the puck and four choices: pass, shoot, carry, or… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 36 | `rr-u11-decision-making-2` | You're the last player back with the puck in your own zone,… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 37 | `rr-u11-decision-making-3` | In the offensive zone, you have the puck with a defender gi… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 38 | `rr-u11-decision-making-4` | You could try a risky pass through two defenders for a brea… | **mc** | low | mc is right structurally, but CONTENT-4: the distractors do not belong to the stem, so it is answerable by elimination. Fix the content before trusting the type. |
| 39 | `rr-u11-decision-making-5` | On a 2-on-1, the defender stays perfectly in the middle, ta… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 40 | `rr-u11-time-and-space-1` | Coaches talk about 'time and space' constantly. What are th… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 41 | `rr-u11-time-and-space-2` | You receive the puck and your first scan shows no defender… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 42 | `rr-u11-time-and-space-3` | A defender is charging at you fast while you have the puck.… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 43 | `rr-u11-time-and-space-4` | Without the puck in the offensive zone, how do you CREATE t… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 44 | `rr-u11-time-and-space-5` | You gain the zone with speed, but the defense is set and th… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 45 | `rr-u11-creativity-under-pressure-1` | Your plan was to pass to the winger, but a defender just to… | **next** | high | Stem says "next": "What does a creative player do next?" Live moment, four action options. |
| 46 | `rr-u11-creativity-under-pressure-2` | You're trapped along the wall with a defender sealing the i… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 47 | `rr-u11-creativity-under-pressure-3` | On a rush, the defender takes away your shot AND the pass t… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 48 | `rr-u11-creativity-under-pressure-4` | Anyone can make plays in open ice. Why do coaches say press… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 49 | `rr-u11-creativity-under-pressure-5` | You try a second option and it fails — the puck turns over.… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 50 | `rr-u11-puck-carrier-options-1` | You're carrying the puck toward one defender. What question… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 51 | `rr-u11-puck-carrier-options-2` | The defender backs way off, giving you a huge gap as you cr… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 52 | `rr-u11-puck-carrier-options-3` | The defender charges you aggressively at the blue line with… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 53 | `rr-u11-puck-carrier-options-4` | On a 2-on-1, the defender slides early to block the passing… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 54 | `rr-u11-puck-carrier-options-5` | You're carrying wide and the defender angles you toward the… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 55 | `rr-u11-off-puck-support-offense-1` | Your teammate has the puck in the corner. What's your main… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 56 | `rr-u11-off-puck-support-offense-2` | You pass to a teammate and a defender steps up on them. Wha… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 57 | `rr-u11-off-puck-support-offense-3` | Your linemate carries into the zone alone while defenders b… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 58 | `rr-u11-off-puck-support-offense-4` | Why do coaches want you at a passing angle to the carrier i… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 59 | `rr-u11-off-puck-support-offense-5` | Your teammate is battling on the wall with the puck. How cl… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 60 | `rr-u11-attacking-1v1-1` | You're one-on-one against a defender. What two things about… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 61 | `rr-u11-attacking-1v1-2` | The defender has a tight gap and their feet are crossing ov… | **mc** | high | Binary yes/no or either-or semantics padded to 4 options. mc is correct as it stands; strong tf conversion candidate (see 8a). |
| 62 | `rr-u11-attacking-1v1-3` | The defender is set, balanced, with a perfect gap, and you… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 63 | `rr-u11-attacking-1v1-4` | You attack wide with speed and the defender turns their hip… | **mc** | medium | mc is right, but CONTENT-8: the bound image does not match the stem. Type is not the problem here. |
| 64 | `rr-u11-attacking-1v1-5` | You're 1v1 late in a close game with no teammates back if y… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 65 | `rr-u11-cycle-and-possession-1` | What does it mean to 'cycle' the puck in the offensive zone? | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 66 | `rr-u11-cycle-and-possession-2` | You're cycling in the corner and a defender chases you hard… | **mc** | high | Technique or body position. Options are techniques. |
| 67 | `rr-u11-cycle-and-possession-3` | Why does a good cycle eventually create a scoring chance in… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 68 | `rr-u11-cycle-and-possession-4` | Your teammate cycles the puck to you on the wall and skates… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 69 | `rr-u11-cycle-and-possession-5` | During the cycle, when should you stop rotating and take th… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 70 | `rr-u11-zone-entry-1` | You're carrying the puck toward the offensive blue line. Wh… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 71 | `rr-u11-zone-entry-2` | The defender backs off, giving you a soft gap at the blue l… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 72 | `rr-u11-zone-entry-3` | The defender stands you up with a tight gap right at the bl… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 73 | `rr-u11-zone-entry-4` | Carrying in is usually best, but not every time. When is du… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 74 | `rr-u11-zone-entry-5` | You hit the blue line with a defender on you, but your cent… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 75 | `rr-u11-odd-man-reads-1` | On a 2-on-1 rush, who is the player you should be reading t… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 76 | `rr-u11-odd-man-reads-2` | On your 2-on-1, the defender ignores your teammate and skat… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 77 | `rr-u11-odd-man-reads-3` | On a 3-on-2 rush, what does the third attacker without the… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 78 | `rr-u11-odd-man-reads-4` | You're the carrier on a 2-on-1 rush. When is shooting clear… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 79 | `rr-u11-odd-man-reads-5` | You get a 2-on-1 but you're still near the blue line, far f… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 80 | `rr-u11-net-front-play-1` | Your defenseman is about to shoot from the point and you're… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 81 | `rr-u11-net-front-play-2` | A low shot is coming through from the point and you're at t… | **next** | medium | Shot is inbound right now, "What is the play?" - immediate next action, four action options. |
| 82 | `rr-u11-net-front-play-3` | The goalie makes the first save and the rebound drops into… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 83 | `rr-u11-net-front-play-4` | The puck is behind the net with your teammate and the defen… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 84 | `rr-u11-net-front-play-5` | At the net front you can screen, tip, or hunt the rebound.… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 85 | `rr-u11-shooting-extra-1` | Why do coaches want your shots on net, even when the angle… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 86 | `rr-u11-puck-control-1` | Your coach keeps saying 'head up' when you stickhandle. Wha… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 87 | `rr-u11-puck-control-2` | You're carrying through the neutral zone staring down at th… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 88 | `rr-u11-puck-control-3` | You receive the puck with a defender closing fast. How shou… | **mc** | high | Technique or body position. Options are techniques. |
| 89 | `rr-u11-puck-control-4` | The ice is choppy late in the period and the puck keeps bou… | **mc** | high | Technique or body position. Options are techniques. |
| 90 | `rr-u11-puck-control-5` | You beat one defender but you're still stickhandling as fas… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 91 | `rr-u11-puck-protection-1` | A defender is chasing you for the puck along the wall. Wher… | **mc** | high | Technique or body position. Options are techniques. |
| 92 | `rr-u11-puck-protection-2` | You're shielding the puck in the corner and the defender le… | **mc** | high | Technique or body position. Options are techniques. |
| 93 | `rr-u11-puck-protection-3` | Why do coaches call puck protection a way to 'buy time' ins… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 94 | `rr-u11-puck-protection-4` | You're protecting the puck and the defender reaches around… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 95 | `rr-u11-puck-protection-5` | When is puck protection the WRONG choice, even though you'r… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 96 | `rr-u11-passing-1` | Your teammate is skating fast toward the net. Where should… | **mc** | high | Technique or body position. Options are techniques. |
| 97 | `rr-u11-passing-2` | Two teammates are open: one has a defender's stick in the p… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 98 | `rr-u11-passing-3` | Your teammate is only a few feet away and calls for the puc… | **mc** | high | Technique or body position. Options are techniques. |
| 99 | `rr-u11-passing-4` | You want to pass to your winger, but a forechecker is about… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 100 | `rr-u11-passing-5` | A saucer pass — lifting the puck a little off the ice — is… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 101 | `rr-u11-receiving-1` | A pass is coming to you. What should your stick blade do as… | **mc** | high | Technique or body position. Options are techniques. |
| 102 | `rr-u11-receiving-2` | The pass is on its way to you. What should you do in the se… | **next** | medium | Explicitly temporal: "What should you do in the second before it arrives?" |
| 103 | `rr-u11-receiving-3` | A hard pass comes in bouncing on its edge. What's the most… | **mc** | high | Technique or body position. Options are techniques. |
| 104 | `rr-u11-receiving-4` | You're skating full speed and a pass arrives slightly behin… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 105 | `rr-u11-receiving-5` | Why do coaches say the best receivers know their next play… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 106 | `rr-u11-shooting-1` | You have a clear look at the net from the slot. Where is a… | **mc** | high | Technique or body position. Options are techniques. |
| 107 | `rr-u11-shooting-2` | You're in tight to the net with almost no time. Which shot… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 108 | `rr-u11-shooting-3` | There's a defender between you and the net. Your teammate i… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 109 | `rr-u11-shooting-4` | Coming down the wing on a rush, when is shooting the better… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 110 | `rr-u11-shooting-5` | You just released a shot from the circle. After every shot… | **next** | medium | Post-shot follow-up ("After every shot you take, where should the follow-up happen?") - the next move by definition. |
| 111 | `rr-u11-edges-balance-1` | Your coach says to get in an athletic stance before the fac… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 112 | `rr-u11-edges-balance-2` | You spot an open teammate, but you're gliding upright with… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 113 | `rr-u11-edges-balance-3` | A defender bumps you as you cross the blue line with the pu… | **mc** | high | Technique or body position. Options are techniques. |
| 114 | `rr-u11-edges-balance-4` | You're turning hard around a defender in the corner. Which… | **mc** | high | Technique or body position. Options are techniques. |
| 115 | `rr-u11-edges-balance-5` | After a shot, the rebound sits two feet away. The player wh… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 116 | `rr-u11-agility-mobility-1` | Which skating move helps you keep your speed while changing… | **mc** | high | Technique or body position. Options are techniques. |
| 117 | `rr-u11-agility-mobility-2` | The puck squirts loose behind you while you're skating forw… | **mc** | medium | mc is right, but CONTENT-2: the stem omits zone and puck location. Also next-adjacent; resolve the content first. |
| 118 | `rr-u11-agility-mobility-3` | You planned to skate wide, but the defender slides over and… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 119 | `rr-u11-agility-mobility-4` | During a scramble in front of the net, the puck moves side… | **mc** | high | Technique or body position. Options are techniques. |
| 120 | `rr-u11-agility-mobility-5` | You're forechecking and the defender fakes left, then goes… | **mc** | high | Technique or body position. Options are techniques. |
| 121 | `rr-u11-backward-transitions-1` | You're defending a rush skating backward. Why is backward s… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 122 | `rr-u11-backward-transitions-2` | You're skating backward defending, and the attacker suddenl… | **next** | medium | Puck just chipped past you, "What is the move?" Immediate next action. |
| 123 | `rr-u11-backward-transitions-3` | Your team turns the puck over at the offensive blue line wh… | **next** | medium | Turnover just happened, "What footwork starts your defending?" - starts = next. |
| 124 | `rr-u11-backward-transitions-4` | Skating backward against a fast attacker, you feel yourself… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 125 | `rr-u11-backward-transitions-5` | During a neutral-zone regroup, your defenseman skates backw… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 126 | `rr-u11-deception-with-feet-1` | What is a 'change of pace' when you're carrying the puck up… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 127 | `rr-u11-deception-with-feet-2` | You fake a step to the left and the defender leans that way… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 128 | `rr-u11-deception-with-feet-3` | A defender is skating backward with a big gap, watching you… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 129 | `rr-u11-deception-with-feet-4` | Which of these is a footwork fake, rather than a stick move? | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 130 | `rr-u11-deception-with-feet-5` | You burst wide after a change of pace and the defender is n… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 131 | `rr-u11-transition-reads-1` | Your team just lost the puck in the offensive zone. What ha… | **next** | medium | Puck just lost, "What has to change in your head immediately?" Immediate transition read. |
| 132 | `rr-u11-transition-reads-2` | Your teammate steals the puck in your defensive zone. As th… | **next** | medium | Steal just happened, "what is the first read?" - first = next. |
| 133 | `rr-u11-transition-reads-3` | You lose the puck at the offensive blue line and their wing… | **next** | high | Stem asks "What is your first action?" after a turnover. Four action options. Cleanest next in the band. |
| 134 | `rr-u11-transition-reads-4` | Why do coaches say the first two seconds after a turnover a… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 135 | `rr-u11-transition-reads-5` | Your defenseman intercepts a pass and looks up. As a winger… | **next** | medium | Interception just happened, "where does your first stride go?" |
| 136 | `rr-u11-breakout-and-regroup-1` | Your coach draws the breakout on the whiteboard before ever… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 137 | `rr-u11-breakout-and-regroup-2` | You're the winger on the wall during a breakout. Where shou… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 138 | `rr-u11-breakout-and-regroup-3` | One forechecker chases your defenseman behind the net while… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 139 | `rr-u11-breakout-and-regroup-4` | Your team carries the puck to the neutral zone but nothing… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 140 | `rr-u11-breakout-and-regroup-5` | The forecheck takes away the wall pass on your breakout. Wh… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 141 | `rr-u11-forecheck-pressure-1` | You're the first forechecker (F1) chasing the puck into the… | **mc** | high | Definition / vocabulary. Options are meanings, not moves. |
| 142 | `rr-u11-forecheck-pressure-2` | As F1, you approach the defenseman behind their net with th… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 143 | `rr-u11-forecheck-pressure-3` | You're forechecking alone — your linemates are still changi… | **mc** | high | Binary yes/no or either-or semantics padded to 4 options. mc is correct as it stands; strong tf conversion candidate (see 8a). |
| 144 | `rr-u11-forecheck-pressure-4` | The defenseman bobbles the puck in the corner as you forech… | **next** | high | Stem is "Now what?" after a bobble. Cannot be read as anything but next. |
| 145 | `rr-u11-forecheck-pressure-5` | Your forecheck forces the defenseman into a rushed pass up… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 146 | `rr-u11-backcheck-recovery-1` | You're backchecking as the other team rushes toward your ne… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 147 | `rr-u11-backcheck-recovery-2` | Backchecking on a 3-on-2 against you, which attacker is the… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 148 | `rr-u11-backcheck-recovery-3` | While backchecking, why do coaches tell you to skate WITH y… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 149 | `rr-u11-backcheck-recovery-4` | You backcheck hard and catch up beside the trailing attacke… | **mc** | medium | Live moment, action options - reads next-adjacent. But the stem carries its own interrogative, which no bank `next` stem does (0/17). mc is the safe call; listed as a next conversion candidate. |
| 150 | `rr-u11-backcheck-recovery-5` | You got caught deep and the rush is going the other way. Wh… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 151 | `rr-u11-battles-and-compete-1` | You and an opponent race to a loose puck on the wall and ar… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |
| 152 | `rr-u11-battles-and-compete-2` | You win a hard battle in the corner and come out with the p… | **mc** | high | Explains a principle ("why..."). Options are explanations. |
| 153 | `rr-u11-battles-and-compete-3` | You make a bad giveaway and the other team scores. Your nex… | **mc** | high | Principle or standard ("when is X right", "what decides Y", role/job split). Options are conditions or rules, not moves. |
| 154 | `rr-u11-battles-and-compete-4` | A loose puck sits between you and an opponent who is slight… | **mc** | high | Binary yes/no or either-or semantics padded to 4 options. mc is correct as it stands; strong tf conversion candidate (see 8a). |
| 155 | `rr-u11-battles-and-compete-5` | You're tangled in a net-front battle when the puck pops loo… | **mc** | high | Asks what a cue means, not what to do. Options are reads/outcomes. |

**Table totals:** `mc` 143, `next` 13 — high confidence 112, medium confidence 43, low confidence 1. Total 156.


---

## 8. Conversion candidates — a separate, later, human-approved step

Nothing below is a proposal to apply now. Declaring a type is a data fix; everything here
is **authoring**, and it changes what the player reads. No converted content is written
here by design.

Variety target, for calibration. The three sizeable typed bands sit at 42-53% `mc`,
19-21% `tf`, 13-15% `mistake`, 13-18% `next` (U15's 10% `mc` is a 10-question sample, not
a target). Matching that mix at 156 questions would mean roughly 30 `tf`, 22 `next`,
22 `mistake` and 8 `seq` — about 80 conversions. That is a content project, not a
cleanup. The candidates below are the highest-yield ~30 to start from.

### 8a. `tf` candidates — strongest group, and the one the playtest actually hit

**Tier 1 — already binary, currently padded to four options.** These three ask a yes/no
or either/or question and then pad to four choices, two of which restate the same verdict.
They read awkwardly as MC today and are the cleanest conversions in the band.

| id | Stem | Why |
|---|---|---|
| `rr-u11-attacking-1v1-2` | "The defender has a tight gap and their feet are crossing over as they turn. Is this the moment to attack?" | Options are No / No / Yes-but / Yes. Two options carry each verdict; the real question is one bit. |
| `rr-u11-forecheck-pressure-3` | "You're forechecking alone… Pressure hard or contain?" | Explicit either/or. The two extra options are noise. |
| `rr-u11-battles-and-compete-4` | "A loose puck sits between you and an opponent who is slightly closer. Is the race already lost?" | Options are Yes / Yes / No / No. |

**Tier 2 — the myth is already written as a distractor.** The bank's `tf` voice is an
absolutist claim the player must reject — **20 of the 22 existing `tf` answers are
False**, so the format is functionally myth-busting rather than fact-checking. These
12 questions already contain 2+ wrong options phrased as absolutes ("always", "never",
"every single time", "no matter what"). Each of those distractors is a ready-made `tf`
statement — the conversion is lifting one out, not inventing one.

`rr-u11-coverage-reads-5`, `rr-u11-decision-making-4`, `rr-u11-time-and-space-5`,
`rr-u11-attacking-1v1-2`, `rr-u11-cycle-and-possession-5`, `rr-u11-zone-entry-4`,
`rr-u11-puck-protection-3`, `rr-u11-passing-5`, `rr-u11-shooting-3`, `rr-u11-shooting-4`,
`rr-u11-backward-transitions-4`, `rr-u11-battles-and-compete-2`.

Worked illustration (not content to apply): `rr-u11-zone-entry-4` carries the distractor
"Every single time — dumping is always safer than carrying it". That is already a `tf`
stem with answer False.

Conversion cost per question: delete `opts`, restate `sit` as a claim, set `ok` to a
boolean, keep `tip`/`why`. `tools/convert-mc-to-tf.mjs` already encodes these mechanics
and its header docstring is the reference — but it only auto-converts questions whose two
options are literally "True"/"False", so none of these qualify for it. Manual.

### 8b. `mistake` candidates

`mistake` needs third-person narration of a player erring, plus a `question` field
("What is the player's mistake?"), plus options phrased "They…". These eight already
narrate an error and its cost — they are in second person and need a voice shift, which
is why they are candidates and not proposals.

| id | The error already in the stem |
|---|---|
| `rr-u11-angling-steering-4` | sprinting straight at the carrier instead of angling |
| `rr-u11-stick-and-body-detail-4` | over-committing to a poke check and getting beaten |
| `rr-u11-defensive-side-positioning-4` | ending up puck-side instead of net-side |
| `rr-u11-puck-control-2` | carrying with the head down through the neutral zone |
| `rr-u11-puck-control-5` | over-stickhandling in open ice after beating a defender |
| `rr-u11-edges-balance-2` | gliding upright with straight legs, then missing the pass |
| `rr-u11-defensive-side-positioning-2` | ball-watching the corner battle and losing the check |
| `rr-u11-battles-and-compete-3` | a giveaway that led to a goal (mistake is off-puck/mental — weakest of the eight) |

Note the overlap: `rr-u11-angling-steering-4` appears both here and as a `next` proposal
in §7. It genuinely reads either way. If it is converted to `mistake`, drop the `next`
proposal for it.

### 8c. `seq` candidates

`seq` needs `items[]` and `correct_order[]`, so every one of these is net-new content
built *around* an existing concept rather than a conversion of it. Concepts in the band
that are inherently ordered:

- **Breakout** — `rr-u11-breakout-and-regroup-1` through `-5` already teach a five-part
  progression (D retrieves → reads pressure side → winger on the hash marks → wall pass →
  centre swings low as the second option). That maps to a 4-5 step `seq` almost directly.
- **Give-and-go** — `rr-u11-off-puck-support-offense-2` (pass → defender steps up → burst
  behind → receive) is a clean 4-step sequence.
- **Cycle** — `rr-u11-cycle-and-possession-2/-4/-5` (bump back on the wall → rotate →
  read the check → take it to the net).
- **Backward transition** — `rr-u11-backward-transitions-2/-3` (read the chip → pivot
  without stopping → match speed → recover position).

Highest yield: the breakout. U11 has 5 breakout questions and no ordering format, and it
is the concept where "the steps in order" *is* the teaching point.

### 8d. What should NOT be converted

The 60-odd `mc` rows tagged Definition or Principle in §7 — "What does 'gap' mean", "What
is a breakout", "When is puck protection the wrong choice". These are vocabulary and
judgment anchors. Forcing them into a format costs clarity and buys nothing; CONTENT-11
in the playtest asks for *more* of this vocabulary teaching, not less. Leave them `mc`.

---

## 9. What was verified vs. what is judgment

**Verified against code or a full pass over the data — not judgment:**
- Every field requirement in §1 (read from the widgets and `tools/preflight.mjs`)
- Every count in §1, §3 and §4 (full enumeration of all 254 bank questions, not a sample)
- The five `q.type` call sites in §2
- The `tf` answer-key inversion and the `seq` TypeError in §4
- The two renderer discrepancies in §5

**Judgment, and where a reviewer should push back:**
- The `next` / `mc` line for the 13 rows in §7 and the 33 rows marked "next-adjacent".
  The boundary is real but not sharp: "What's your read?" with four action options is
  defensible either way. It was drawn conservatively — `next` only where the stem's own
  words ask for the next move ("Now what?", "What's your first action?", "what does a
  creative player do next?"), so the badge and the stem agree rather than contradict.
- The candidate lists in §8. Those are content opinions.

## 10. Constraints honoured

- `src/data/bank.json` not modified. No source file modified. No git command run.
- This file is the only file created.
- No question rewritten, no stem edited, no option added, no answer key changed.

---

## Reviewer's note (Claude, after cross-checking against the incomplete-stems audit)

Two audits ran in parallel and reached **contradicting conclusions** about `next`-type
questions. Resolved by reading the render path directly:

**The claim in §"Three things that surprised me" — that `next` and `mistake` stems are
"deliberately declarative" because "the type badge supplies the interrogative" — is
wrong for `next`.** There is no badge.

- The live quiz renders `next` through the SAME branch as `mc`
  ([`App.jsx:2463`](../../../src/App.jsx#L2463)) under the header
  `📋 Game Situation` ([`:2466`](../../../src/App.jsx#L2466)). No "What Happens Next"
  chip appears on the question.
- `Q_TYPE_LABELS.next = "What Happens Next"` ([`:1328`](../../../src/App.jsx#L1328))
  is consumed at exactly one site, [`:3405`](../../../src/App.jsx#L3405) — the
  **results screen** "By Format" breakdown, after the question is over. Its helper
  `Q_TYPE_INFO` ([`:1337`](../../../src/App.jsx#L1337)) has no callers at all.
- `FORMAT_PREVIEW_LABELS` ([`:2315`](../../../src/App.jsx#L2315)) is a preview
  sentinel for locked PRO formats, not question chrome.

So all 17 existing `next` questions genuinely present as a declarative scenario plus
four options with no question anywhere on screen. The incomplete-stems audit's
finding stands; this audit's explanation of it does not.

**What this changes here, and what it doesn't:**

- The recommendation of `mc` for 143 is **unaffected** — those stems ask their own
  question and end in `?`.
- The 13 `next` candidates are **still safe**, but for a different reason than stated:
  their stems already contain the ask in their own words. They are not relying on a
  badge, because there is no badge to rely on.
- `mistake` was not checked here; the main Quiz branch does render `q.question`
  ([`:2491`](../../../src/App.jsx#L2491)), so the badge claim is closer to true for
  that type — but see below.

**Separately verified and now fixed:** `WeeklyQuiz` omitted `q.question` from its
`mistake` branch, so all 16 `mistake` questions rendered without their ask when served
in a weekly quiz. Fixed in the same commit as this note. The main `Quiz` render was
always correct, which is why it went unnoticed.

**Two safety findings from this audit independently confirmed — both worth heeding:**

- `tf` on an mc-shaped question silently corrupts the answer key.
  [`App.jsx:1264`](../../../src/App.jsx#L1264) reads `q.ok ? 1 : 0`, so numeric
  `ok: 0` marks FALSE correct and `ok: 1|2|3` marks TRUE correct. No error is raised.
- Typing anything `next` drops it from the FREE tier.
  [`App.jsx:792`](../../../src/App.jsx#L792) filters to
  `!q.type || "mc" || "tf" || isBoardMC`. Untyped questions pass today via the
  `!q.type` escape hatch; `mc` still passes; `next` does not. So typing those 13
  would silently remove them from the free U11 pool — a product decision, not a
  mechanical one.
