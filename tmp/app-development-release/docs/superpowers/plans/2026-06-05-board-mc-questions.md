# Board-MC Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a scenario carry an optional `mc` block so it can be asked as a multiple-choice question on a validated rink board — the picture, the validation, and the correct answer are all the same validated read.

**Architecture:** A scenario with an `mc: {stem?, opts[4], ok}` block renders in "MC mode": the engine draws the validated board (RinkStage) with no tap-layer, shows 4 text options, grades against `mc.ok`, then reveals the geometric `correct` read on the board. The scene rides every existing scenario validator (so it can't be hockey-nonsense). Board-MC counts as a FREE multiple-choice format; interactive scenarios stay paid.

**Tech Stack:** React + Vite (plain JS/JSX), the existing `src/scenario/` engine. **No unit-test framework** — "tests" are node assertion scripts run with `node`, the existing `validate-seed.mjs`, `npm run build`, and the `#scenarios` playground for visual checks.

**Spec:** `docs/superpowers/specs/2026-06-05-board-mc-questions-design.md`

**Conventions for this plan**
- `mc` block shape: `{ stem?: string, opts: string[] (length 4), ok: 0|1|2|3 }`.
- A scenario "is board-MC" iff `scenario.mc` is a non-null object.
- ScenarioRenderer render mode: `mode` prop, `"mc"` | `"interactive"`. Default: `"mc"` when `scenario.mc` exists, else `"interactive"`.
- Age style tier: `"playbook"` for any level matching U11/U13/U15/U18; `"friendly"` for U7/U9.

---

### Task 1: Validator rules for the `mc` block

**Files:**
- Modify: `src/scenario/validators.js` (add rules to the `rules` array, before the `// ── SOFT WARNINGS` section)
- Modify: `src/scenario/schema.js:163-181` (add the `mc` typedef to the `Scenario` JSDoc — documentation only, no logic)
- Test: `tools/scenario-author/__tests__/mc-validator.test.mjs` (create)

- [ ] **Step 1: Write the failing test**

Create `tools/scenario-author/__tests__/mc-validator.test.mjs`:

```js
// Node assertion test for the mc-block validator rules. Run: node <thisfile>
import assert from "node:assert";
import { lintScenario } from "../validate.mjs";

// A minimal VALID scenario (point read, off-zone) we can attach mc to.
const base = () => ({
  id: "t_mc", type: "scenario", level: "U13 / Peewee", difficulty: 2,
  cat: "Hockey Sense", stage: { view: "right", zone: "off-zone" },
  actors: [
    { id: "you", kind: "player", x: 0.60, y: 0.30, tag: "YOU" },
    { id: "g", kind: "goalie", x: 0.918, y: 0.5 },
    { id: "x1", kind: "defender", x: 0.82, y: 0.55 },
    { id: "puck", kind: "puck", x: 0.602, y: 0.30 },
  ],
  interaction: { kind: "point", prompt: "Tap the open ice you should fill for a scoring chance." },
  correct: { kind: "point", zoneId: "oz-high-slot" },
  feedback: { right: "Yes.", wrong: "No." },
});

// VALID mc passes.
let s = base();
s.mc = { stem: "What is the best play?", opts: ["Fill the high slot", "Drive the net", "Curl back", "Dump it in"], ok: 0 };
assert.equal(lintScenario(s).ok, true, "valid mc should pass: " + JSON.stringify(lintScenario(s).errs));

// 3 opts fails.
s = base(); s.mc = { opts: ["a", "b", "c"], ok: 0 };
assert.equal(lintScenario(s).ok, false, "3 opts must fail");

// ok out of range fails.
s = base(); s.mc = { opts: ["a", "b", "c", "d"], ok: 4 };
assert.equal(lintScenario(s).ok, false, "ok=4 must fail");

// duplicate opts fail.
s = base(); s.mc = { opts: ["a", "a", "c", "d"], ok: 0 };
assert.equal(lintScenario(s).ok, false, "duplicate opts must fail");

// empty option fails.
s = base(); s.mc = { opts: ["a", "", "c", "d"], ok: 0 };
assert.equal(lintScenario(s).ok, false, "empty option must fail");

console.log("OK mc-validator");
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node tools/scenario-author/__tests__/mc-validator.test.mjs`
Expected: throws `AssertionError` on the "3 opts must fail" case (the rule doesn't exist yet, so a bad mc still passes).

- [ ] **Step 3: Add the validator rules**

In `src/scenario/validators.js`, inside the `const rules = [ ... ]` array, add these three rules immediately before the `// ── SOFT WARNINGS` comment:

```js
  // ── BOARD-MC (optional multiple-choice over the validated board)

  function mcShapeValid(s) {
    if (!s.mc) return null;
    const opts = s.mc.opts;
    if (!Array.isArray(opts) || opts.length !== 4) {
      return { kind: "err", msg: `mc.opts must be exactly 4 options (got ${Array.isArray(opts) ? opts.length : typeof opts})` };
    }
    if (opts.some(o => typeof o !== "string" || o.trim().length === 0)) {
      return { kind: "err", msg: `every mc.opts entry must be a non-empty string` };
    }
    const seen = new Set(opts.map(o => o.trim().toLowerCase()));
    if (seen.size !== opts.length) {
      return { kind: "err", msg: `mc.opts has duplicate options — every option must be distinct` };
    }
    return null;
  }

  function mcOkInRange(s) {
    if (!s.mc) return null;
    if (!Number.isInteger(s.mc.ok) || s.mc.ok < 0 || s.mc.ok > 3) {
      return { kind: "err", msg: `mc.ok must be an integer 0..3 (got ${JSON.stringify(s.mc.ok)})` };
    }
    return null;
  }

  function mcStemSane(s) {
    if (!s.mc || s.mc.stem == null) return null;
    if (typeof s.mc.stem !== "string" || s.mc.stem.trim().length < 10) {
      return { kind: "warn", msg: `mc.stem is very short — give the question an actual prompt or omit it to reuse interaction.prompt` };
    }
    return null;
  }
```

- [ ] **Step 4: Add the typedef to schema.js (docs only)**

In `src/scenario/schema.js`, in the `@typedef {Object} Scenario` block (around line 163-181), add this line after the `@property {PreviewWindow} [preview]` line:

```js
 * @property {{stem?:string, opts:string[], ok:0|1|2|3}} [mc]  // board-MC: ask this scene as multiple choice
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node tools/scenario-author/__tests__/mc-validator.test.mjs`
Expected: `OK mc-validator`

- [ ] **Step 6: Confirm no regression on existing seeds**

Run: `for s in src/scenario/seeds/*.json; do node .claude/skills/new-scenario/validate-seed.mjs "$s" || echo "FAIL $s"; done`
Expected: every seed still prints `OK` (none have an `mc` block yet, so the new rules are no-ops).

- [ ] **Step 7: Commit**

```bash
git add src/scenario/validators.js src/scenario/schema.js tools/scenario-author/__tests__/mc-validator.test.mjs
git commit -m "feat(scenario): validate optional mc block (4 opts, ok range, no dup)"
```

---

### Task 2: `brief-to-seed.mjs` passes the `mc` block through

**Files:**
- Modify: `scripts/brief-to-seed.mjs` (the seed-assembly object, near the end — the `const seed = { ... }` block)
- Test: `tools/scenario-author/__tests__/brief-mc.test.mjs` (create)

- [ ] **Step 1: Write the failing test**

Create `tools/scenario-author/__tests__/brief-mc.test.mjs`:

```js
// Run: node tools/scenario-author/__tests__/brief-mc.test.mjs
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "briefmc-"));
const brief = {
  id: "t_briefmc_v1", nodeId: "u13.scanning", level: "U13 / Peewee", difficulty: 2,
  cat: "Hockey Sense", view: "right", zone: "off-zone", primitive: "point",
  actors: [
    { id: "you", kind: "player", at: "oz-point-weak", tag: "YOU" },
    { id: "g", kind: "goalie", x: 0.918, y: 0.5 },
    { id: "x1", kind: "defender", at: "oz-slot" },
    { id: "puck", kind: "puck", with: "you" },
  ],
  correct: { at: "oz-high-slot" },
  mc: { stem: "Best play?", opts: ["Fill the high slot", "Curl low", "Dump it", "Stop"], ok: 0 },
  prompt: "Tap the open ice you should fill for a scoring chance.",
  feedback: { right: "Yes.", wrong: "No." },
};
const briefPath = join(dir, "brief.json");
writeFileSync(briefPath, JSON.stringify(brief));
execFileSync("node", ["scripts/brief-to-seed.mjs", briefPath, "--out", dir]);
const seed = JSON.parse(readFileSync(join(dir, "t_briefmc_v1.json"), "utf8"));
assert.ok(seed.mc, "seed must carry the mc block");
assert.equal(seed.mc.ok, 0);
assert.equal(seed.mc.opts.length, 4);
console.log("OK brief-mc");
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/scenario-author/__tests__/brief-mc.test.mjs`
Expected: `AssertionError: seed must carry the mc block` (brief-to-seed drops `mc` today).

- [ ] **Step 3: Pass `mc` through in brief-to-seed.mjs**

In `scripts/brief-to-seed.mjs`, find the `const seed = {` assembly object. Add this line right after the `...(brief.preview ? { preview: brief.preview } : {}),` line (or alongside the other optional spreads):

```js
  ...(brief.mc ? { mc: brief.mc } : {}),
```

- [ ] **Step 4: Run to verify it passes**

Run: `node tools/scenario-author/__tests__/brief-mc.test.mjs`
Expected: `OK brief-mc`

- [ ] **Step 5: Commit**

```bash
git add scripts/brief-to-seed.mjs tools/scenario-author/__tests__/brief-mc.test.mjs
git commit -m "feat(pipeline): brief-to-seed passes the mc block through"
```

---

### Task 3: Author one example board-MC seed (proves the data path end-to-end)

**Files:**
- Create: `src/scenario/seeds/u13_oz_highslot_mc_v1.json`

- [ ] **Step 1: Write the seed**

Create `src/scenario/seeds/u13_oz_highslot_mc_v1.json`:

```json
{
  "id": "u13_oz_highslot_mc_v1",
  "type": "scenario",
  "nodeId": "u13.scanning",
  "level": "U13 / Peewee",
  "levels": ["U13 / Peewee"],
  "themes": ["scan", "cycle", "positioning", "offensive-zone"],
  "cat": "Hockey Sense",
  "difficulty": 2,
  "stage": { "view": "right", "zone": "off-zone" },
  "actors": [
    { "id": "you",   "kind": "player",   "x": 0.680, "y": 0.240, "tag": "YOU" },
    { "id": "tmlow", "kind": "teammate", "x": 0.900, "y": 0.800, "tag": "RW" },
    { "id": "puck",  "kind": "puck",     "x": 0.902, "y": 0.798 },
    { "id": "tmwall","kind": "teammate", "x": 0.900, "y": 0.240, "tag": "LW" },
    { "id": "x1",    "kind": "defender", "x": 0.840, "y": 0.720 },
    { "id": "x2",    "kind": "defender", "x": 0.820, "y": 0.520 },
    { "id": "x3",    "kind": "defender", "x": 0.840, "y": 0.320 },
    { "id": "g",     "kind": "goalie",   "x": 0.918, "y": 0.500 }
  ],
  "interaction": {
    "kind": "point",
    "prompt": "Your team is cycling low and the defense collapsed below the puck. Where should you go as F3?"
  },
  "correct": { "kind": "point", "zoneId": "oz-high-slot" },
  "mc": {
    "stem": "Your team is cycling low and the defense has collapsed below the puck. As the high forward, what is the best play?",
    "opts": [
      "Fill the open high slot for a quick scoring pass",
      "Drop low to make it a three-player battle in the corner",
      "Hug the boards and wait for a rim around",
      "Back out to the blue line to protect against a turnover"
    ],
    "ok": 0
  },
  "feedback": {
    "right": "Yes. With the defense pulled below the puck, the high slot is wide open for a quick scoring chance.",
    "wrong": "Crowding the corner or hugging the boards just adds a body where the defense already is. The vacated high slot is the open ice."
  },
  "tip": "When the defense collapses low, the high slot is the open ice, so fill it.",
  "why": "Filling the soft spot the collapsing defenders leave behind turns a low cycle into a scoring chance."
}
```

- [ ] **Step 2: Validate it**

Run: `node .claude/skills/new-scenario/validate-seed.mjs src/scenario/seeds/u13_oz_highslot_mc_v1.json`
Expected: `OK u13_oz_highslot_mc_v1`

- [ ] **Step 3: Commit**

```bash
git add src/scenario/seeds/u13_oz_highslot_mc_v1.json
git commit -m "content(scenario): first board-MC seed (validates clean)"
```

---

### Task 4: Age-scaled board style in RinkStage

**Files:**
- Modify: `src/scenario/RinkStage.jsx` (`ActorMarker` + `RinkStage` — compute an age style tier and pass it to markers)

- [ ] **Step 1: Compute the style tier in `RinkStage`**

In `src/scenario/RinkStage.jsx`, find the `hideTags` useMemo inside `RinkStage` (it tests `/^U7\b|^U9\b/`). Right after it, add:

```jsx
  // Diagram tone scales with age: U7/U9 keep the friendly markers; U11+ render
  // austere "X's-and-O's" playbook (thinner strokes, plain goalie box, no
  // decorative double-ring) so a 14-year-old gets a chalk-talk, not a cartoon.
  const ageStyle = useMemo(() => {
    const ls = Array.isArray(levels) ? levels : [];
    return ls.some(l => /^U7\b|^U9\b/.test(String(l))) ? "friendly" : "playbook";
  }, [levels]);
```

- [ ] **Step 2: Thread `ageStyle` into the marker render**

In `RinkStage`, find where `visibleActors.map(a => <ActorMarker .../>)` is rendered and add the prop:

```jsx
        {visibleActors.map(a => (
          <ActorMarker key={a.id} actor={a} highlight={highlightSet.has(a.id)}
            hideTag={hideTags} offset={puckOffsets[a.id]} ageStyle={ageStyle}/>
        ))}
```

- [ ] **Step 3: Branch the marker visuals on `ageStyle`**

In `ActorMarker`, change the signature to accept `ageStyle` and make the goalie + player austere in playbook mode. Update the function signature:

```jsx
function ActorMarker({ actor, highlight, hideTag, offset, ageStyle = "playbook" }) {
```

Then, for the GOALIE block, replace the friendly "pad block with leg pads" with a conditional — in playbook mode draw a plain box, in friendly mode keep the pads:

```jsx
      {actor.kind === "goalie" && (
        ageStyle === "playbook" ? (
          <>
            <rect x="-11" y="-11" width="22" height="22" rx="3"
              fill={palette.fill} stroke={palette.stroke} strokeWidth="1.6"/>
            <text x="0" y="4" textAnchor="middle" fill={palette.text}
              fontSize="11" fontWeight="800" style={labelStyle}>G</text>
          </>
        ) : (
          <>
            <rect x="-9" y="6" width="7" height="9" rx="3" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.2"/>
            <rect x="2" y="6" width="7" height="9" rx="3" fill={palette.fill} stroke={palette.stroke} strokeWidth="1.2"/>
            <rect x="-11" y="-13" width="22" height="24" rx="8"
              fill={palette.fill} stroke={palette.stroke} strokeWidth="1.8"/>
            <text x="0" y="3" textAnchor="middle" fill={palette.text}
              fontSize="12" fontWeight="800" style={labelStyle}>G</text>
          </>
        )
      )}
```

For the PLAYER (YOU) block, drop the decorative outer ring in playbook mode (keep it friendly mode):

```jsx
      {actor.kind === "player" && (
        <>
          <circle cx="0" cy="0" r={ageStyle === "playbook" ? 12 : 14} fill={palette.fill}
            stroke="#fff" strokeWidth="1.6"/>
          {ageStyle !== "playbook" && (
            <circle cx="0" cy="0" r="17" fill="none" stroke="#fff" strokeWidth="1.6"/>
          )}
          {positionTag && (
            <text x="0" y="4" textAnchor="middle" fill={palette.text}
              fontSize="11" fontWeight="800" style={labelStyle}>{positionTag}</text>
          )}
        </>
      )}
```

(Teammate = filled circle and defender = X are already austere; leave them.)

- [ ] **Step 4: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built in ...` (no errors).

- [ ] **Step 5: Visual check**

Run `npm run dev`, open `#scenarios`, step to a U13 seed (e.g. `u13_scanning_slot_v1`) and a U9 seed (`u9_dz_positioning_v1`). Confirm the U13 goalie/player are plain (no leg-pads, no double-ring) and the U9 ones keep the friendly look.

- [ ] **Step 6: Commit**

```bash
git add src/scenario/RinkStage.jsx
git commit -m "feat(scenario): age-scaled board style (U7/U9 friendly vs U11+ playbook)"
```

---

### Task 5: ScenarioRenderer MC mode (board + options + reveal)

**Files:**
- Modify: `src/scenario/ScenarioRenderer.jsx` (add MC mode; default mode from `scenario.mc`)

- [ ] **Step 1: Decide the render mode**

In `src/scenario/ScenarioRenderer.jsx`, change the component signature to accept a `mode` prop and compute the effective mode:

```jsx
export default function ScenarioRenderer({ scenario, playerId, mode, onAnswer }) {
```

Right after the `validateScenario` early-return block, add:

```jsx
  const effectiveMode = mode || (scenario.mc ? "mc" : "interactive");
```

- [ ] **Step 2: Add the MC render branch**

Below the existing `const primitive = getPrimitive(...)` block, add an early MC render path. When `effectiveMode === "mc"`, render the board (RinkStage with NO interactive child) + the options. Insert this block right before the final `return (` of the component:

```jsx
  if (effectiveMode === "mc" && scenario.mc) {
    return (
      <BoardMC
        scenario={scenario}
        playerId={playerId}
        onAnswer={onAnswer}
      />
    );
  }
```

- [ ] **Step 3: Implement the `BoardMC` sub-component**

Add this component to `src/scenario/ScenarioRenderer.jsx` (above the default export). It renders the board with a static reveal layer (derived from `correct`) and the option buttons:

```jsx
import { resolveTarget } from "./zones.js";
import { denorm } from "./schema.js";

// Static reveal of the geometric `correct` read, drawn over the board AFTER the
// player answers. Selection -> ring the correct actor(s); point -> mark the spot;
// path -> arrow from the `from` actor to the end. Derived from `correct`, never
// authored separately, so it can't contradict the question.
function RevealLayer({ scenario }) {
  const c = scenario.correct;
  if (!c) return null;
  const actorById = Object.fromEntries((scenario.actors || []).map(a => [a.id, a]));
  if (c.kind === "selection") {
    return (
      <>
        {(c.ids || []).map(id => {
          const a = actorById[id]; if (!a) return null;
          const p = denorm(a);
          return <circle key={id} cx={p.x} cy={p.y} r="20" fill="none"
            stroke="#22c55e" strokeWidth="2.6" strokeDasharray="4 3"/>;
        })}
      </>
    );
  }
  if (c.kind === "point") {
    let t; try { t = resolveTarget(c); } catch { return null; }
    const p = denorm(t);
    return <circle cx={p.x} cy={p.y} r={t.tolerance * 600} fill="rgba(34,197,94,.22)"
      stroke="#22c55e" strokeWidth="1.8"/>;
  }
  if (c.kind === "path") {
    const from = actorById[scenario.interaction?.from];
    let t; try { t = resolveTarget(c.end); } catch { return null; }
    if (!from) return null;
    const a = denorm(from), b = denorm(t);
    const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 24;
    return (
      <>
        <defs><marker id="mcrev" markerWidth="5" markerHeight="5" refX="2.4" refY="2.5" orient="auto">
          <path d="M0,0 L5,2.5 L0,5 Z" fill="#C9A24B"/></marker></defs>
        <path d={`M${a.x},${a.y} Q ${mx},${my} ${b.x},${b.y}`} fill="none"
          stroke="#C9A24B" strokeWidth="2.6" strokeDasharray="5 3"
          markerEnd="url(#mcrev)" vectorEffect="non-scaling-stroke"/>
      </>
    );
  }
  return null;
}

function BoardMC({ scenario, playerId, onAnswer }) {
  const [picked, setPicked] = useState(null);
  const startedAtRef = useRef(Date.now());
  const mc = scenario.mc;
  const stem = mc.stem || scenario.interaction?.prompt || "What is the best play?";

  function pick(i) {
    if (picked != null) return;
    setPicked(i);
    const ok = i === mc.ok;
    const ms = Date.now() - startedAtRef.current;
    logReactionTime(playerId || "__anon__", { id: scenario.id, cat: scenario.cat, ms, ok, reason: ok ? "ok" : "wrong" });
    onAnswer?.({ ok, reason: ok ? "ok" : "wrong", ms, picked: i });
  }

  return (
    <div>
      <Card style={{ marginBottom: ".75rem", background: C.purpleDim, border: `1px solid ${C.purpleBorder}` }}>
        <div style={{ fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase", color: "#5BA4E8", fontWeight: 800, marginBottom: ".5rem" }}>
          📋 Read the play{scenario.cat ? ` · ${scenario.cat}` : ""}
        </div>
        <div style={{ fontSize: 15, lineHeight: 1.6, color: C.white, fontWeight: 500 }}>{stem}</div>
      </Card>

      <RinkStage stage={scenario.stage} actors={scenario.actors} levels={scenario.levels}>
        {() => (picked != null ? <RevealLayer scenario={scenario}/> : null)}
      </RinkStage>

      <div style={{ display: "grid", gap: ".5rem", marginTop: ".6rem" }}>
        {mc.opts.map((opt, i) => {
          const isCorrect = picked != null && i === mc.ok;
          const isWrongPick = picked === i && i !== mc.ok;
          const bg = isCorrect ? "rgba(34,197,94,.12)" : isWrongPick ? "rgba(239,68,68,.10)" : C.dimmest;
          const bd = isCorrect ? "#22c55e" : isWrongPick ? "#ef4444" : C.border;
          return (
            <button key={i} onClick={() => pick(i)} disabled={picked != null}
              style={{ display: "flex", gap: ".6rem", alignItems: "flex-start", textAlign: "left",
                background: bg, border: `1.5px solid ${bd}`, borderRadius: 12, padding: ".85rem 1rem",
                color: C.white, fontFamily: FONT.body, fontSize: 14, lineHeight: 1.5, cursor: picked != null ? "default" : "pointer" }}>
              <span style={{ fontWeight: 800, color: C.dimmer }}>{"ABCD"[i]}</span>
              <span style={{ flex: 1 }}>{opt}</span>
              {isCorrect && <span style={{ color: "#22c55e", fontWeight: 800 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {picked != null && (
        <Card style={{ marginTop: ".6rem", background: picked === mc.ok ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
          border: `1px solid ${picked === mc.ok ? "rgba(34,197,94,.3)" : "rgba(239,68,68,.3)"}` }}>
          <div style={{ fontWeight: 800, color: picked === mc.ok ? C.green : C.red, marginBottom: ".35rem", fontSize: 12 }}>
            {picked === mc.ok ? "✓ Right read" : "✗ Not the best read"}
          </div>
          <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6 }}>
            {picked === mc.ok ? scenario.feedback.right : scenario.feedback.wrong}
          </div>
          {scenario.tip && <div style={{ marginTop: ".4rem", fontSize: 12, color: C.dimmer, fontStyle: "italic" }}>💡 {scenario.tip}</div>}
        </Card>
      )}
    </div>
  );
}
```

Make sure the imports at the top of the file include `useState`, `useRef` (already imported for the timer), and that `RinkStage`, `C`, `FONT`, `Card`, `logReactionTime` are imported (they already are in this file).

- [ ] **Step 4: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built in ...`

- [ ] **Step 5: Visual check in the playground**

The playground (`src/scenario/ScenarioPlayground.jsx`) renders `<ScenarioRenderer scenario={s} .../>` with no `mode` — so a seed with `mc` will default to MC mode. Run `npm run dev` → `#scenarios` → step to `u13_oz_highslot_mc_v1`. Confirm: board shows (no tap layer), 4 options below, picking grades, and the high-slot point target reveals on answer.

- [ ] **Step 6: Commit**

```bash
git add src/scenario/ScenarioRenderer.jsx
git commit -m "feat(scenario): board-MC render mode (board + options + read reveal)"
```

---

### Task 6: Quiz integration — render board-MC in the quiz + score it

**Files:**
- Modify: `src/App.jsx` (the scenario render call ~line 1995; board-MC is already a `type:"scenario"`, so it flows through the existing scenario path — confirm scoring + the "MC format" label)

- [ ] **Step 1: Confirm scenario-with-mc renders in MC mode**

`App.jsx:1995` already renders `<ScenarioRenderer scenario={q} playerId={player?.id} onAnswer={p => handleSeqAnswer(!!p.ok)} />` for `qtype === "scenario"`. Because Task 5 makes ScenarioRenderer default to MC mode when `scenario.mc` exists, **no change is needed for rendering** — a board-MC seed (type `scenario`, with `mc`) already routes here and renders as MC. Verify by reading the line and confirming `onAnswer` maps `p.ok` into `handleSeqAnswer`.

- [ ] **Step 2: Treat board-MC as an answerable scenario for the "answered" state**

`App.jsx:1913` computes `answered` for `qtype === "scenario"` via `seqAnswered`. ScenarioRenderer's `onAnswer` already calls `handleSeqAnswer`, which sets `seqAnswered`. **No change needed** — confirm by reading lines 1910-1915 that `scenario` is in the `seqAnswered` branch.

- [ ] **Step 3: Label board-MC as "Read the Play" in the question header (optional polish)**

In `App.jsx`, find the type-label block (around line 2144-2147, where `qtype === "mc" && q.media?.url` shows "👀 Read the Play"). Board-MC is `type:"scenario"`, so it already gets the scenario badge from ScenarioRenderer's own prompt card (Task 5 renders its own "📋 Read the play" header). No App.jsx label change required. Note this in the commit message so reviewers know it was considered.

- [ ] **Step 4: Build + session check**

Run: `npm run build` → expect success.
Then `npm run dev`, start a quiz that includes a U13 scenario seed with `mc` (e.g. add `u13_oz_highslot_mc_v1` to a session), confirm it renders as MC and a correct/incorrect pick advances the quiz and counts toward the score.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(quiz): board-MC scenarios render+score via existing scenario path (no-op confirm)"
```

> If Steps 1-3 confirm no code change is genuinely needed, commit an empty doc note instead: `git commit --allow-empty -m "chore: confirm board-MC routes through existing scenario render+score path"`.

---

### Task 7: Tier gating — board-MC is a FREE multiple-choice format

**Files:**
- Modify: `src/App.jsx` (`buildQueue` / question selection — where scenarios are filtered by tier) **or** `src/utils/tierGate.js`
- Read first: `src/utils/tierGate.js` (the `TIER_FEATURES.FREE` set + how rink/scenario questions are currently gated), and `src/App.jsx` `buildQueue` (search for where `type === "scenario"` or formats are filtered for FREE)

- [ ] **Step 1: Find where scenarios get gated for FREE**

Run: `grep -n "scenario\|rinkQuestions\|allQuestionFormats\|FREE_FORMATS\|formats\b" src/utils/tierGate.js src/App.jsx | head -40`
Read the surrounding code. FREE currently = "MC format + core scenarios." Identify the predicate that decides whether a `type:"scenario"` question is shown to a FREE player.

- [ ] **Step 2: Make board-MC FREE-eligible**

Add a helper near the gating logic (in `tierGate.js` if formats live there, else in `App.jsx`):

```js
// A scenario presented as multiple choice (has an `mc` block) is a FREE MC
// format. An interactive scenario (no `mc`) is the paid upsell.
export function isBoardMC(q) {
  return q && q.type === "scenario" && q.mc && Array.isArray(q.mc.opts);
}
```

Then, wherever the FREE filter rejects `type:"scenario"` questions, allow them through when `isBoardMC(q)` is true. Concretely, the FREE predicate becomes: allow `q` if it is a text MC format **or** `isBoardMC(q)`; gate interactive scenarios (`type:"scenario"` without `mc`) to Pro+.

- [ ] **Step 3: Build + verify**

Run: `npm run build` → expect success.
Add a quick node assertion (`tools/scenario-author/__tests__/board-mc-gate.test.mjs`):

```js
import assert from "node:assert";
import { isBoardMC } from "../../../src/utils/tierGate.js"; // adjust path if helper landed in App.jsx
assert.equal(isBoardMC({ type: "scenario", mc: { opts: ["a","b","c","d"], ok: 0 } }), true);
assert.equal(isBoardMC({ type: "scenario" }), false);
assert.equal(isBoardMC({ type: "mc" }), false);
console.log("OK board-mc-gate");
```

Run: `node tools/scenario-author/__tests__/board-mc-gate.test.mjs` → `OK board-mc-gate`.
(If `isBoardMC` landed in App.jsx instead of tierGate.js, move it to tierGate.js so the test can import it without pulling in the React app.)

- [ ] **Step 4: Manual gating check**

In `npm run dev`, as a FREE profile, confirm a board-MC question appears in a session; confirm an interactive-only scenario (no `mc`) is gated/hidden for FREE.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tierGate.js src/App.jsx tools/scenario-author/__tests__/board-mc-gate.test.mjs
git commit -m "feat(tier): board-MC is a FREE multiple-choice format; interactive scenarios stay paid"
```

---

### Task 8: Authoring — PROMPT C gains `mc`; retire the freehand image pipeline

**Files:**
- Modify: `docs/ai-pipeline/PROMPT-PACK.md` (PROMPT C: add the `mc` field to the brief; Track C: replace the freehand "render an image" flow with "board-MC = geometry brief + mc options")

- [ ] **Step 1: Add `mc` to PROMPT C's brief schema**

In `docs/ai-pipeline/PROMPT-PACK.md`, in the PROMPT C box (geometry brief writer), add an optional field to the brief object, after `why`:

```text
  ,"mc": { "stem": "<the multiple-choice question text>", "opts": ["<4 options>"], "ok": <0-3> }
```

And add a line to PROMPT C's instructions:

```text
OPTIONAL board-MC: to make this scene a multiple-choice question, add an "mc" block — a stem plus 4 options where exactly one (mc.ok) describes the SAME read as `correct`, and the other three are real wrong reads (no obvious-dummy options). The picture is the validated board; the answer is the words.
```

- [ ] **Step 2: Retire the freehand image flow in Track C**

Replace Track C's "STEP 3 — render + ship" freehand-SVG instructions with a pointer to the scenario path: a board-MC is a geometry brief (PROMPT C) with an `mc` block → `brief-to-seed.mjs` → `validate-seed.mjs` → auto-merges. Mark the old `brief-to-image.mjs` freehand path and the figurine-SVG approach as **deprecated**. (Keep PROMPT B-SCENARIO as the coach-panel review of the read + options.)

- [ ] **Step 3: Commit**

```bash
git add docs/ai-pipeline/PROMPT-PACK.md
git commit -m "docs(pipeline): board-MC authoring via PROMPT C mc block; retire freehand image flow"
```

---

### Task 9: Migrate the 20 existing image-MC questions to board-MC seeds

**Files:**
- Read: `docs/ai-pipeline/image-figurine-pulled.json` (16 pulled, with text + read) and the 4 live odd-man entries in `src/data/bank.json`
- Create: 20 board-MC seeds in `src/scenario/seeds/`
- Modify: `src/data/bank.json` (remove the 4 odd-man image-MC entries once migrated)
- Delete: the figurine + odd-man SVGs in `public/assets/images/img_u7_*`, `img_u9_*`, `img_u13_odd-man-reads_*` once unreferenced

This is **iterative content work**, one question at a time, not a single code change. For each of the 20:

- [ ] **Step 1 (per question): Build the validated scene**

From the pulled/live entry, take the `sit`/`opts`/`ok`/`explain`. Author a scenario that *geometrically* matches the keyed read: place the actors (by zone), set `interaction` + `correct` to the read the correct option describes (e.g. correct option "pass to the open winger" → a `selection`/`path` whose `correct` is that winger; "shoot" → a `path`/`shoot` ending at the net with the carrier a believable shooting distance away — **the validator now enforces this**). Attach `mc: { stem: <sit>, opts, ok }`.

- [ ] **Step 2 (per question): Validate**

Run: `node .claude/skills/new-scenario/validate-seed.mjs src/scenario/seeds/<id>.json`
Expected: `OK`. If it fails (e.g. the read can't be placed sanely — the original "shoot from the far blue line"), that question was geometrically broken; fix the scene or **queue it** rather than force it.

- [ ] **Step 3 (per question): Spot-check in the playground**

`npm run dev` → `#scenarios` → confirm the board reads cleanly at the right age tone and the reveal matches the answer.

- [ ] **Step 4 (after a batch): Remove the old entries + assets**

Once a question is migrated and validated, remove its old `mc`+`media` entry from `src/data/bank.json` (for the 4 odd-man) and delete its now-unreferenced SVG from `public/assets/images/`. Re-run `node scripts/image-gallery.mjs` to confirm the figurine set is empty.

- [ ] **Step 5: Commit per batch**

```bash
git add src/scenario/seeds/ src/data/bank.json public/assets/images/
git commit -m "content(migrate): rebuild <N> image-MC questions as validated board-MC seeds"
```

> Order: do the 4 live odd-man first (they're on the site), then the 16 pulled. Anything that can't be placed into a sane scene gets queued in `docs/ai-pipeline/` with a note, never forced.

---

## Self-Review

- **Spec coverage:** schema/`mc` block (T1), validation gate (T1), `mc` shape rules (T1), brief passthrough (T2), example seed (T3), age-scaled style (T4), MC render + reveal-from-`correct` (T5), quiz render+score (T6), FREE gating (T7), authoring + retire freehand (T8), migrate the 20 (T9). The 3-gate gauntlet = engine validator (T1) + PROMPT B-SCENARIO coach review (T8, existing) + validate-seed (T3/T9). The self-correcting loop is an authoring-process behavior, not new code, and is exercised in T9 (fix-or-queue). ✅ all spec sections map to a task.
- **Placeholders:** none — every code step shows the code; UI tasks include the exact JSX. The migration (T9) is intentionally per-question iterative (content, not code) and says so.
- **Type consistency:** `mc = {stem?, opts[4], ok}`, `isBoardMC(q)`, `ageStyle "friendly"|"playbook"`, `effectiveMode "mc"|"interactive"`, `RevealLayer`/`BoardMC` — names consistent across tasks.
- **Note:** the self-correcting *automation* loop (headless re-revise via `claude -p`) from the spec is a pipeline tool, not part of shipping the format; it is out of scope for this plan and belongs to a follow-on once the format exists. Flagged here so it isn't mistaken for a gap.
