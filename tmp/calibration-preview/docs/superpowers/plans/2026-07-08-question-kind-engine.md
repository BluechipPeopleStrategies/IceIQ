# Question-Kind Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the animated play engine from two question shapes (text MC, U7/U9 lane-pick) to five (`read-mc`, `lane-pick` at all bands, `predict-next`, `verdict`+justify, `spot-mistake`) at U11/U13, with every factory gate (validators, telemetry, family reports, bulk checks) kind-aware.

**Architecture:** A kind registry (`src/play/questionKinds.js`) is the single source of truth mapping each kind to playback/answer/reveal contracts. The renderer (`src/play/AnimatedPlay.jsx`) branches on the resolved kind; plays stay declarative data. One new engine primitive: watch chains (`node.autoNext`) that auto-advance without a question. Validators reject unknown kinds and kind/data mismatches so the factory can never emit unrenderable content.

**Tech Stack:** React 18 + Vite, plain JS (no TypeScript), SVG rendering, `node:test` + `node:assert/strict` test scripts in `scripts/*.mjs` run via `node scripts/<file>.mjs`.

**Spec:** `docs/proposals/2026-07-08-question-kind-engine-design.md`. Research basis: `docs/research/2026-07-08-question-engine-research.md`, `docs/research/2026-07-08-mvp-engine-gaps.md`.

## Global Constraints

- Branch: `feature/shareable-beta`. Never commit to `main`. Never push.
- No new npm dependencies.
- **Internal ID Safety Rule** (docs/play-kernel-standards.md): never rename internal actor IDs (`F1`, `F2`, `D1`, `A1`, `A2`, `BC1`, `G`) in play data. Player-facing wording goes through `youngT`/display helpers only.
- All player-facing copy: growth-oriented, judge the read never the player, no em dashes, no tactical shorthand displayed at U7-U13 (existing validators enforce the shorthand part).
- Bulk-batch cap stays at **3 plays** (Bulk-Assisted Creation Rule).
- Every task must leave ALL existing checks green: `node scripts/test-animated-play.mjs`, `node scripts/test-play-tokens.mjs`, `node scripts/test-play-telemetry.mjs`, `node scripts/test-scenario-families.mjs`, plus the suite behind `npm run check:bulk`.
- New question kinds are U11+ only. U7/U9 behavior must be byte-identical to today throughout this plan.
- Brand colors in the renderer: navy `#0B1A33`, gold `#C9A24B` (match existing constants; do not introduce new hues).

---

### Task 1: Kind registry, resolution, base validation, telemetry `kind` field

**Files:**
- Create: `src/play/questionKinds.js`
- Modify: `src/play/validateAnimatedPlay.js` (inside the non-terminal branch, after line 39)
- Modify: `src/play/prototypeTelemetry.js:107-137` (`createQuestionTelemetrySnapshot`)
- Modify: `package.json` (add `test:question-kinds` script)
- Test: `scripts/test-question-kinds.mjs`

**Interfaces:**
- Consumes: existing play data shape (`node.ask.opts`, `node.ask.choiceMode`, `node.terminal`).
- Produces: `QUESTION_KINDS` (object keyed by kind name, values `{ playback, answer, reveal, justify? }`), `resolveKind(node) -> string|null` (null for terminal nodes; `"read-mc"` default; `"lane-pick"` when legacy `choiceMode: "lane-pick"`), `kindSpec(kind) -> object|null`. Every later task branches on `resolveKind`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-question-kinds.mjs`:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { QUESTION_KINDS, resolveKind, kindSpec } from "../src/play/questionKinds.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";
import { TWO_ON_ONE_READ_PLAY } from "../src/play/plays/twoOnOneRead.js";
import { BACKCHECK_RECOVERY_PLAY } from "../src/play/plays/backcheckRecovery.js";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { collectPlayTelemetrySnapshots } from "../src/play/prototypeTelemetry.js";

describe("question kind registry", () => {
  it("defines the five kinds with full contracts", () => {
    assert.deepEqual(
      Object.keys(QUESTION_KINDS).sort(),
      ["lane-pick", "predict-next", "read-mc", "spot-mistake", "verdict"]
    );
    for (const spec of Object.values(QUESTION_KINDS)) {
      assert.ok(spec.playback && spec.answer && spec.reveal);
    }
  });

  it("defaults legacy plays to read-mc and choiceMode to lane-pick", () => {
    assert.equal(resolveKind(TWO_ON_ONE_READ_PLAY.nodes.rush), "read-mc");
    const lanePickNode = Object.values(BACKCHECK_RECOVERY_PLAY.nodes)
      .find((n) => n.ask?.choiceMode === "lane-pick");
    assert.ok(lanePickNode, "backcheckRecovery should contain a lane-pick node");
    assert.equal(resolveKind(lanePickNode), "lane-pick");
    assert.equal(resolveKind({ terminal: true }), null);
    assert.equal(kindSpec("read-mc").answer, "buttons");
    assert.equal(kindSpec("nope"), null);
  });

  it("rejects unknown kinds in validation", () => {
    const bad = structuredClone(TWO_ON_ONE_READ_PLAY);
    bad.nodes.rush.ask.kind = "mystery";
    const result = validateAnimatedPlay(bad);
    assert.equal(result.ok, false);
    assert.ok(result.errs.some((e) => e.includes("unknown question kind")));
  });

  it("keeps every existing play valid with zero data changes", () => {
    for (const play of ALL_ANIMATED_PLAYS) {
      assert.deepEqual(validateAnimatedPlay(play).errs, [], play.id);
    }
  });

  it("stamps kind onto telemetry snapshots", () => {
    const snaps = collectPlayTelemetrySnapshots(TWO_ON_ONE_READ_PLAY, "U11");
    const question = snaps.find((s) => !s.terminal);
    const reveal = snaps.find((s) => s.terminal);
    assert.equal(question.kind, "read-mc");
    assert.equal(reveal.kind, null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd C:\Users\mtsli\IceIQ && node scripts/test-question-kinds.mjs`
Expected: FAIL — `Cannot find module '.../src/play/questionKinds.js'`

- [ ] **Step 3: Create the registry**

Create `src/play/questionKinds.js`:

```js
// Single source of truth for question kinds. A kind can only be born here;
// validators reject anything not in this registry (Kind Registry Rule).
export const QUESTION_KINDS = {
  "read-mc":      { playback: "freeze",     answer: "buttons",     reveal: "consequence" },
  "lane-pick":    { playback: "freeze",     answer: "rink-zones",  reveal: "consequence" },
  "predict-next": { playback: "occlusion",  answer: "buttons",     reveal: "truth" },
  "verdict":      { playback: "watch-full", answer: "buttons",     reveal: "coaching", justify: true },
  "spot-mistake": { playback: "watch-full", answer: "rink-actors", reveal: "rewind-highlight" },
};

export function resolveKind(node) {
  if (!node || node.terminal) return null;
  if (node.ask?.kind) return node.ask.kind;
  // Back-compat: choiceMode predates the registry and keeps working.
  if (node.ask?.choiceMode === "lane-pick") return "lane-pick";
  return "read-mc";
}

export function kindSpec(kind) {
  return QUESTION_KINDS[kind] || null;
}
```

- [ ] **Step 4: Hook the registry into `validateAnimatedPlay.js`**

Add the import at the top of `src/play/validateAnimatedPlay.js`:

```js
import { QUESTION_KINDS, resolveKind } from "./questionKinds.js";
```

Inside the `if (!node.terminal) {` block (currently starting line 36), add as the first lines:

```js
      const kind = resolveKind(node);
      if (!QUESTION_KINDS[kind]) errs.push(`node ${nodeId} has unknown question kind ${JSON.stringify(kind)}`);
```

- [ ] **Step 5: Stamp `kind` onto telemetry snapshots**

In `src/play/prototypeTelemetry.js`, add the import at the top:

```js
import { resolveKind } from "./questionKinds.js";
```

In `createQuestionTelemetrySnapshot`, add a `kind` field to the `snapshot` object literal (after the `ageGroup` line):

```js
    kind: node?.terminal ? null : resolveKind(node),
```

(The `questionSignature` hash covers the whole snapshot, so signatures change automatically when a kind changes — that is intended.)

- [ ] **Step 6: Register the npm script**

In `package.json` `"scripts"`, next to the other `test:` entries, add:

```json
    "test:question-kinds": "node scripts/test-question-kinds.mjs",
```

- [ ] **Step 7: Run the new test and the existing suite**

Run: `node scripts/test-question-kinds.mjs`
Expected: PASS (all 5 tests)

Run: `node scripts/test-animated-play.mjs && node scripts/test-play-tokens.mjs && node scripts/test-play-telemetry.mjs && node scripts/test-scenario-families.mjs`
Expected: PASS. NOTE: if `test-play-telemetry.mjs` asserts on frozen `questionSignature` values, update those fixture hashes now (the new `kind` field legitimately changes every signature) and say so in the commit message.

- [ ] **Step 8: Commit**

```bash
git add src/play/questionKinds.js src/play/validateAnimatedPlay.js src/play/prototypeTelemetry.js package.json scripts/test-question-kinds.mjs
git commit -m "feat(play): question-kind registry with back-compat resolution"
```

---

### Task 2: Spatial answers at U11/U13 (promote lane-pick past the figure gate)

**Files:**
- Modify: `src/play/AnimatedPlay.jsx:350-364` (zone render block)
- Modify: `src/play/AnimatedPlay.jsx:1-7` (imports)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: `resolveKind` (Task 1); existing `opt.zone: [x, y, r?]` data on lane-pick options.
- Produces: no new exports. Behavior change only: rink tap zones render for token profiles (U11/U13), styled smaller. Text buttons keep rendering below the rink at every band (accessible fallback — existing behavior, do not remove).

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { readFileSync } from "node:fs";

describe("spatial answers at U11/U13", () => {
  it("zone rendering is gated by kind, not by the figure profile", () => {
    const src = readFileSync(new URL("../src/play/AnimatedPlay.jsx", import.meta.url), "utf8");
    assert.ok(!src.includes('profile.token === "figure" && !node.terminal && node.ask?.choiceMode'),
      "figure-profile gate on zones should be removed");
    assert.ok(src.includes('kind === "lane-pick"') || src.includes("effectiveKind === \"lane-pick\""),
      "zone render should branch on resolved kind");
  });
});
```

(Source-text assertion is the pragmatic level for JSX without a DOM test rig — this repo has no React test renderer, and adding one violates the no-new-dependencies constraint. Behavior is verified in Step 4.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — "figure-profile gate on zones should be removed"

- [ ] **Step 3: Modify the renderer**

In `src/play/AnimatedPlay.jsx`, add to the imports:

```js
import { resolveKind } from "./questionKinds.js";
```

In the `AnimatedPlay` component body, after `const node = play.nodes[nodeId];`, add:

```js
  const kind = resolveKind(node);
```

Replace the zone-render condition (line ~350):

```jsx
        {profile.token === "figure" && !node.terminal && node.ask?.choiceMode === "lane-pick" && (node.ask.opts || []).map((opt, index) => {
```

with:

```jsx
        {!node.terminal && kind === "lane-pick" && (node.ask.opts || []).map((opt, index) => {
```

And inside that map, replace the zone radius line:

```jsx
          const [zx, zy, zr = 6] = opt.zone;
```

with band-aware sizing (figure keeps today's big playground zones; token gets the tighter gold trainer ring):

```jsx
          const [zx, zy, zr] = opt.zone;
          const zoneR = zr ?? (profile.token === "figure" ? 6 : 4.5);
```

and use `zoneR` in the `<circle ... r={zoneR} ...>` that follows (replace `r={zr}`).

- [ ] **Step 4: Verify behavior in the dev harness**

Run: `grep -rn "AnimatedPlayTest" src --include="*.jsx" | grep -v "src/play/AnimatedPlay.jsx"` to find the mounted route, then `npm run dev`.
In the harness: select "Backcheck recovery" (a lane-pick play), age band "U11 - The Trainer". Expected: numbered tap zones now render on the rink (4.5 radius), text buttons still listed below, answering via a zone works and routes identically to the button. Switch to U7: zones render at radius 6 exactly as before.

- [ ] **Step 5: Run tests and commit**

Run: `node scripts/test-question-kinds.mjs && node scripts/test-animated-play.mjs && node scripts/test-play-telemetry.mjs`
Expected: PASS

```bash
git add src/play/AnimatedPlay.jsx scripts/test-question-kinds.mjs
git commit -m "feat(play): spatial answers - lane-pick zones render at U11/U13"
```

---

### Task 3: Watch-chain primitive (`node.autoNext`)

**Files:**
- Modify: `src/play/AnimatedPlay.jsx` (node effect ~lines 245-269; question/answer render block ~385-428)
- Modify: `src/play/validateAnimatedPlay.js` (non-terminal branch)
- Modify: `src/play/validateFactoryStandards.js` (skip watch nodes in follow-up-question rules)
- Modify: `src/play/prototypeTelemetry.js` (`collectPlayTelemetrySnapshots` includes watch nodes)
- Modify: `docs/play-kernel-standards.md` (append Watch Chain Rule)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: node graph shape from Task 1.
- Produces: node field `autoNext: { next: string, ms?: number }` (default `ms` 2600). A node with `autoNext` is a **watch node**: it must NOT have `ask`, plays its motions, then advances. Chains are 1-3 watch nodes ending at an ask node or terminal. Helper export from `src/play/questionKinds.js`: `watchChainInfo(play, startNodeId) -> { length, endNodeId, cyclic }`. Tasks 4 and 6 build on watch nodes.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { watchChainInfo } from "../src/play/questionKinds.js";

function watchFixture(overrides = {}) {
  return {
    id: "fixture_watch", type: "animated-play", title: "2-on-1 fixture", concept: "odd-man-reads",
    ageBands: ["U11"], view: "half-right", start: "watch",
    sourceRef: { note: "docs/library/odd-man-reads.md", cite: "fixture" },
    actors: [
      { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
      { id: "D1", team: "away", role: "defender", label: "D1" },
    ],
    nodes: {
      watch: { id: "watch", q: "Watch the play.", pos: { F1: [140, 60], D1: [160, 50] }, autoNext: { next: "ask", ms: 100 } },
      ask: {
        id: "ask", q: "Was that the right read?", decisionActor: "F1", pos: { F1: [146, 60], D1: [158, 52] },
        ask: { q: "Was that the right read?", opts: [
          { id: "yes", t: "Right read", no: "The lane was closed.", next: "end" },
          { id: "no", t: "Better option was there", ok: true, why: "The defender committed.", next: "end" },
        ] },
      },
      end: { id: "end", terminal: true, q: "The pass was the open play.", pos: { F1: [150, 58], D1: [156, 50] } },
    },
    ...overrides,
  };
}

describe("watch-chain primitive", () => {
  it("accepts a valid watch node without ask", () => {
    const result = validateAnimatedPlay(watchFixture());
    assert.deepEqual(result.errs, []);
  });

  it("rejects a watch node that also has ask", () => {
    const play = watchFixture();
    play.nodes.watch.ask = { q: "?", opts: [{ id: "a", t: "A", ok: true }, { id: "b", t: "B", no: "n" }] };
    assert.ok(validateAnimatedPlay(play).errs.some((e) => e.includes("must not have ask")));
  });

  it("rejects dangling and cyclic autoNext, and chains longer than 3", () => {
    const dangling = watchFixture();
    dangling.nodes.watch.autoNext = { next: "missing" };
    assert.ok(validateAnimatedPlay(dangling).errs.some((e) => e.includes("routes to missing node")));

    const cyclic = watchFixture();
    cyclic.nodes.watch.autoNext = { next: "watch" };
    assert.ok(validateAnimatedPlay(cyclic).errs.some((e) => e.includes("cyclic")));

    const long = watchFixture();
    long.nodes.w2 = { id: "w2", q: "…", pos: { F1: [141, 60] }, autoNext: { next: "w3" } };
    long.nodes.w3 = { id: "w3", q: "…", pos: { F1: [142, 60] }, autoNext: { next: "w4" } };
    long.nodes.w4 = { id: "w4", q: "…", pos: { F1: [143, 60] }, autoNext: { next: "ask" } };
    long.nodes.watch.autoNext = { next: "w2" };
    assert.ok(validateAnimatedPlay(long).errs.some((e) => e.includes("watch chain longer than 3")));
  });

  it("reports chain info", () => {
    const info = watchChainInfo(watchFixture(), "watch");
    assert.deepEqual(info, { length: 1, endNodeId: "ask", cyclic: false });
  });

  it("watch nodes appear in telemetry as reveal-style snapshots", () => {
    const snaps = collectPlayTelemetrySnapshots(watchFixture(), "U11");
    assert.ok(snaps.some((s) => s.nodeId === "watch"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — `watchChainInfo` is not exported / watch node flagged "must have at least two answer options"

- [ ] **Step 3: Implement `watchChainInfo` in `src/play/questionKinds.js`**

Append:

```js
export function isWatchNode(node) {
  return Boolean(node && !node.terminal && node.autoNext);
}

export function watchChainInfo(play, startNodeId) {
  let length = 0;
  let nodeId = startNodeId;
  const seen = new Set();
  while (isWatchNode(play?.nodes?.[nodeId])) {
    if (seen.has(nodeId)) return { length, endNodeId: nodeId, cyclic: true };
    seen.add(nodeId);
    length += 1;
    nodeId = play.nodes[nodeId].autoNext.next;
  }
  return { length, endNodeId: nodeId, cyclic: false };
}
```

- [ ] **Step 4: Teach `validateAnimatedPlay.js` about watch nodes**

Replace the non-terminal block's opening (from Task 1 it starts with the kind check) so watch nodes take their own path. The full non-terminal block becomes:

```js
    if (!node.terminal) {
      if (node.autoNext) {
        if (node.ask) errs.push(`node ${nodeId} is a watch node and must not have ask`);
        if (!node.autoNext.next) errs.push(`node ${nodeId} autoNext missing next`);
        else if (!nodeIds.has(node.autoNext.next)) errs.push(`node ${nodeId} autoNext routes to missing node ${node.autoNext.next}`);
      } else {
        const kind = resolveKind(node);
        if (!QUESTION_KINDS[kind]) errs.push(`node ${nodeId} has unknown question kind ${JSON.stringify(kind)}`);
        const opts = node.ask?.opts || [];
        if (!node.ask || !Array.isArray(opts) || opts.length < 2) errs.push(`node ${nodeId} must have at least two answer options`);
        if (opts.filter((o) => o.ok).length !== 1) errs.push(`node ${nodeId} must have exactly one correct option`);
        for (const opt of opts) {
          if (!opt.id) errs.push(`node ${nodeId} has option with no id`);
          if (!opt.t) errs.push(`node ${nodeId} option ${opt.id || "unknown"} has no text`);
          if (opt.next && !nodeIds.has(opt.next)) errs.push(`node ${nodeId} option ${opt.id || "unknown"} routes to missing node ${opt.next}`);
          if (!opt.ok && !opt.no) warns.push(`node ${nodeId} wrong option ${opt.id || "unknown"} has no teaching note`);
        }
      }
    }
```

After the node loop (before the `terminalCount` check), add chain-shape checks:

```js
  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    if (!node.autoNext || node.terminal) continue;
    const info = watchChainInfo(play, nodeId);
    if (info.cyclic) errs.push(`node ${nodeId} starts a cyclic watch chain`);
    else if (info.length > 3) errs.push(`node ${nodeId} starts a watch chain longer than 3`);
  }
```

with the import updated to:

```js
import { QUESTION_KINDS, resolveKind, watchChainInfo } from "./questionKinds.js";
```

- [ ] **Step 5: Exempt watch nodes in `validateFactoryStandards.js`**

In the node loop of `src/play/validateFactoryStandards.js` (line 15), immediately after `if (node.terminal) continue;`, add:

```js
    if (node.autoNext) continue; // watch nodes carry no question; chain shape is validated in validateAnimatedPlay
```

- [ ] **Step 6: Include watch nodes in telemetry collection**

In `src/play/prototypeTelemetry.js`, change the filter in `collectPlayTelemetrySnapshots` (line 141) from:

```js
    .filter(([, node]) => node.ask || node.terminal)
```

to:

```js
    .filter(([, node]) => node.ask || node.terminal || node.autoNext)
```

- [ ] **Step 7: Renderer — auto-advance and skip**

In `src/play/AnimatedPlay.jsx`:

Add state and a watched-chains ref near the other state hooks in `AnimatedPlay`:

```js
  const watchedChainsRef = useRef(new Set());
```

In the node `useEffect` (currently lines 245-269), after the `runCycle()` call and the existing `if (!node.terminal)` loop setup, add auto-advance handling. The effect body becomes:

```js
    startedAtRef.current = Date.now();
    runCycle();

    let advanceTimer;
    if (!node.terminal && node.autoNext) {
      advanceTimer = setTimeout(() => {
        const nextNode = play.nodes[node.autoNext.next];
        if (!nextNode?.autoNext) watchedChainsRef.current.add(`${play.id}:${nodeId}`);
        setNodeId(node.autoNext.next);
      }, node.autoNext.ms ?? 2600);
    } else if (!node.terminal) {
      loopTimer = setInterval(runCycle, 4200);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(motionTimer);
      clearTimeout(advanceTimer);
      clearInterval(loopTimer);
    };
```

(Watch nodes do not loop — they play once and advance. The `watchedChainsRef` key marks a chain as seen once its last watch node completes.)

In the answer area (the `node.terminal ? ... : ...` block at ~line 392), render watch nodes as a third branch. Change the condition to:

```jsx
        {node.terminal ? (
          <NodeSummary node={node} profile={profile} pickedOption={pickedOption} onReplay={replay} />
        ) : node.autoNext ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 12, color: "#5B6575", fontWeight: 700 }}>Watch the play…</div>
            {["U13", "U15", "U18"].includes(ageBand) && [...watchedChainsRef.current].some((k) => k.startsWith(`${play.id}:`)) && (
              <button
                onClick={() => {
                  onEvent?.({ playId: play.id, nodeId, event: "watch_skip", ms: Date.now() - startedAtRef.current });
                  let cursor = nodeId;
                  while (play.nodes[cursor]?.autoNext && !play.nodes[cursor].terminal) cursor = play.nodes[cursor].autoNext.next;
                  setNodeId(cursor);
                }}
                style={{ background: "transparent", border: "1px solid #CDD5E0", borderRadius: 8, color: "#4B5563", padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                Skip to the question
              </button>
            )}
          </div>
        ) : (
          node.ask.opts.map((opt, index) => {
```

(U11 always watches through — the skip button is band-gated. It only appears on a replay, because the chain key is added when the chain completes the first time.)

- [ ] **Step 8: Append the Watch Chain Rule to the standards doc**

Append to `docs/play-kernel-standards.md`:

```markdown

## Watch Chain Rule

A watch node (`autoNext`) plays a segment with no question, then advances.

- Watch chains are 1-3 nodes and must end at a question or a terminal node.
- A watch node must not carry `ask`.
- U11 always watches a chain through once. U13 and older get a
  "Skip to the question" affordance on replays only.
- Watch chains exist to set up verdict and spot-mistake reads. They are not
  decoration; every watch node must show something the question needs.
```

- [ ] **Step 9: Run tests and commit**

Run: `node scripts/test-question-kinds.mjs && node scripts/test-animated-play.mjs && node scripts/test-play-telemetry.mjs && node scripts/test-scenario-families.mjs`
Expected: PASS

```bash
git add src/play/questionKinds.js src/play/validateAnimatedPlay.js src/play/validateFactoryStandards.js src/play/prototypeTelemetry.js src/play/AnimatedPlay.jsx docs/play-kernel-standards.md scripts/test-question-kinds.mjs
git commit -m "feat(play): watch-chain primitive (autoNext) with validators and skip affordance"
```

---

### Task 4: Verdict kind (+ justify step) with one recycled proof play

**Files:**
- Create: `src/play/plays/verdictTwoOnOneForcedShot.js`
- Modify: `src/play/AnimatedPlay.jsx` (choose() ~line 271; answer render block)
- Modify: `src/play/validateAnimatedPlay.js` (verdict contract)
- Modify: `src/play/playCatalog.js` (register play)
- Modify: `docs/play-kernel-standards.md` (Verdict Voice Rule)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: watch chains (Task 3), kind registry (Task 1).
- Produces: verdict ask shape — `ask: { kind: "verdict", q, opts, justify: { q, opts: [{ id, t, evidence, ok?, no? }] } }`. Option flag `u13Only: true` hides an option below U13. Telemetry event on answer: `{ event: "answer", kind: "verdict", answerId, justifyId, ok }`. Task 8's family report counts this play under `two_on_one`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { VERDICT_TWO_ON_ONE_FORCED_SHOT } from "../src/play/plays/verdictTwoOnOneForcedShot.js";

describe("verdict kind", () => {
  it("proof play is valid and registered", async () => {
    assert.deepEqual(validateAnimatedPlay(VERDICT_TWO_ON_ONE_FORCED_SHOT).errs, []);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === VERDICT_TWO_ON_ONE_FORCED_SHOT.id));
    assert.deepEqual(VERDICT_TWO_ON_ONE_FORCED_SHOT.ageBands, ["U11", "U13"]);
  });

  it("verdict nodes require an anchored justify block", () => {
    const play = structuredClone(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    const judge = Object.values(play.nodes).find((n) => n.ask?.kind === "verdict");
    delete judge.ask.justify;
    assert.ok(validateAnimatedPlay(play).errs.some((e) => e.includes("justify")));

    const play2 = structuredClone(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    const judge2 = Object.values(play2.nodes).find((n) => n.ask?.kind === "verdict");
    delete judge2.ask.justify.opts[0].evidence;
    assert.ok(validateAnimatedPlay(play2).errs.some((e) => e.includes("evidence")));
  });

  it("justify has exactly one correct option", () => {
    const judge = Object.values(VERDICT_TWO_ON_ONE_FORCED_SHOT.nodes).find((n) => n.ask?.kind === "verdict");
    assert.equal(judge.ask.justify.opts.filter((o) => o.ok).length, 1);
  });

  it("verdict copy judges the read, never the player", () => {
    const text = JSON.stringify(VERDICT_TWO_ON_ONE_FORCED_SHOT);
    assert.ok(!/you were wrong|you failed|bad choice/i.test(text));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — cannot find `verdictTwoOnOneForcedShot.js`

- [ ] **Step 3: Author the proof play (recycled from `twoOnOneRead`'s blocked-shot wrong branch)**

Create `src/play/plays/verdictTwoOnOneForcedShot.js`:

```js
// Verdict proof play. Content recycled from play_2v1_backdoor_read_u11_v1's
// "shoot through the defender" wrong branch: here the skater on screen makes
// that read, and the learner judges it. Judge the read, never the player.
export const VERDICT_TWO_ON_ONE_FORCED_SHOT = {
  id: "verdict_2v1_forced_shot_u11_v1",
  type: "animated-play",
  title: "2-on-1: Judge the shot into the defender",
  concept: "odd-man-reads",
  ageBands: ["U11", "U13"],
  view: "half-right",
  start: "watch",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/odd-man-reads.md",
    cite: "Odd-man rush read: when the lone defender steps to the puck carrier, the support option behind the defender becomes the clean next play.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "F1" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    watch: {
      id: "watch",
      q: "Watch the rush. The puck carrier shoots into the stepping defender.",
      pos: { F1: [146, 60], F2: [162, 24], D1: [158, 52], G: [186, 42] },
      enter: { F1: [132, 61], F2: [154, 24], D1: [176, 44], G: [187, 42] },
      puck: [141, 60],
      motions: [
        { kind: "skate", from: [132, 61], to: [146, 60], actor: "F1" },
        { kind: "blocked", from: [146, 60], to: [158, 52], label: "blocked" },
      ],
      autoNext: { next: "judge", ms: 2600 },
    },
    judge: {
      id: "judge",
      q: "The shot went into the defender. Was that the right read?",
      decisionActor: "F1",
      pos: { F1: [148, 60], F2: [162, 24], D1: [156, 53], G: [186, 42] },
      puck: [156, 53],
      ask: {
        kind: "verdict",
        q: "The shot went into the defender. Was that the right read?",
        opts: [
          { id: "right_read", t: "Right read", no: "The defender had stepped into the shot lane, so the shot had nowhere to go.", next: "debrief" },
          { id: "better_option", t: "A better option was there", ok: true, why: "The defender committed to the shooter, which is exactly when the cross-ice pass opens up.", next: "debrief" },
          { id: "timing", t: "Right idea, wrong timing", u13Only: true, no: "A shot works earlier, before the defender closes the lane. By this moment the lane was gone.", next: "debrief" },
        ],
        justify: {
          q: "What made the pass the better play?",
          opts: [
            { id: "d1_committed", t: "The defender stepped to the shooter and left the pass lane", evidence: "D1", ok: true },
            { id: "goalie_deep", t: "The goalie was playing deep in the net", evidence: "G", no: "The goalie's depth was not the read here. Watch the defender's commitment." },
          ],
        },
      },
    },
    debrief: {
      id: "debrief",
      terminal: true,
      q: "The defender took the shot away. The cross-ice pass to the support skater was the open play.",
      pos: { F1: [148, 60], F2: [162, 25], D1: [156, 53], G: [184, 40] },
      puck: [148, 60],
      motions: [
        { kind: "pass", from: [148, 60], to: [162, 25], label: "open" },
      ],
    },
  },
};
```

- [ ] **Step 4: Validator — verdict contract**

In `src/play/validateAnimatedPlay.js`, inside the non-terminal / non-watch branch (after the option loop from Task 3), add:

```js
        if (kind === "verdict") {
          const justify = node.ask?.justify;
          if (!justify || !Array.isArray(justify.opts) || justify.opts.length < 2) {
            errs.push(`node ${nodeId} verdict requires a justify block with at least two options`);
          } else {
            if (justify.opts.filter((o) => o.ok).length !== 1) errs.push(`node ${nodeId} justify must have exactly one correct option`);
            for (const jopt of justify.opts) {
              if (!jopt.id || !jopt.t) errs.push(`node ${nodeId} justify option missing id or text`);
              if (!jopt.evidence) errs.push(`node ${nodeId} justify option ${jopt.id || "unknown"} missing evidence (must name a visible actor or motion)`);
              else if (!actorIds.has(jopt.evidence)) errs.push(`node ${nodeId} justify evidence ${jopt.evidence} is not an actor`);
            }
          }
        }
```

- [ ] **Step 5: Renderer — two-phase verdict**

In `src/play/AnimatedPlay.jsx`, add state next to `picked`:

```js
  const [judgePick, setJudgePick] = useState(null);
```

Reset it in `replay()` (`setJudgePick(null);`) and when a new node mounts — add `setJudgePick(null);` inside the node `useEffect` right after `startedAtRef.current = Date.now();`.

Rework `choose(opt, index)` to handle the verdict phases (full replacement of the function):

```js
  function choose(opt, index) {
    if (picked !== null || node.terminal) return;
    const ms = Date.now() - startedAtRef.current;

    if (kind === "verdict" && node.ask.justify && !judgePick) {
      setJudgePick(opt);
      onEvent?.({ playId: play.id, nodeId, event: "judge", kind, answerId: opt.id, ok: !!opt.ok, ms });
      return;
    }

    setPicked(index);
    setPickedOption(opt);
    if (kind === "verdict" && judgePick) {
      onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: judgePick.id, justifyId: opt.id, ok: !!judgePick.ok, ms });
      setTimeout(() => {
        setNodeId(judgePick.next);
        setPicked(null);
        setJudgePick(null);
      }, judgePick.ok && opt.ok ? 750 : 1050);
      return;
    }

    onEvent?.({ playId: play.id, nodeId, event: "answer", kind, answerId: opt.id, ok: !!opt.ok, ms });
    setTimeout(() => {
      setNodeId(opt.next);
      setPicked(null);
    }, opt.ok ? 750 : 1050);
  }
```

In the answer render block, the options list must show the justify options once a judge pick exists, and hide `u13Only` options below U13. Immediately before `node.ask.opts.map(...)` insert:

```jsx
          (kind === "verdict" && judgePick ? node.ask.justify.opts : node.ask.opts)
            .filter((opt) => !opt.u13Only || ["U13", "U15", "U18"].includes(ageBand))
            .map((opt, index) => {
```

(i.e., replace the existing `node.ask.opts.map((opt, index) => {` line with the three lines above; the rest of the map body stays.) Also, above the options, show the justify prompt: in the question-text `<div>` (line ~389), replace `{questionTextForAge(node, profile)}` with:

```jsx
          {kind === "verdict" && judgePick ? node.ask.justify.q : questionTextForAge(node, profile)}
```

- [ ] **Step 6: Register in the catalog**

In `src/play/playCatalog.js`, add the import and append to `ALL_ANIMATED_PLAYS`:

```js
import { VERDICT_TWO_ON_ONE_FORCED_SHOT } from "./plays/verdictTwoOnOneForcedShot.js";
```

```js
  VERDICT_TWO_ON_ONE_FORCED_SHOT,
```

- [ ] **Step 7: Append the Verdict Voice Rule to the standards doc**

Append to `docs/play-kernel-standards.md`:

```markdown

## Verdict Voice Rule

Verdict questions judge the read, never the player.

- Copy says "the read", "the play", "the shot" - never "you were wrong".
- The watched skater is a neutral third player (F1), not YOU.
- U11 verdicts use two options. U13 may add a third option flagged
  `u13Only: true` (for example "Right idea, wrong timing").
- Every verdict includes a justify step whose options each carry an
  `evidence` field naming a visible actor. No abstract justifications.
```

- [ ] **Step 8: Run tests, verify in dev harness, commit**

Run: `node scripts/test-question-kinds.mjs && node scripts/test-animated-play.mjs && node scripts/test-play-telemetry.mjs && node scripts/test-scenario-families.mjs`
Expected: PASS

Dev harness check: select "2-on-1: Judge the shot into the defender" at U11 — watch chain plays once, judge question shows 2 options (no timing option), picking one swaps to the justify question, then routes to the debrief with the pass line drawn. At U13 the third option appears.

```bash
git add src/play/plays/verdictTwoOnOneForcedShot.js src/play/AnimatedPlay.jsx src/play/validateAnimatedPlay.js src/play/playCatalog.js docs/play-kernel-standards.md scripts/test-question-kinds.mjs
git commit -m "feat(play): verdict kind with justify step and recycled 2-on-1 proof play"
```

---

### Task 5: Predict-next kind with one proof play

**Files:**
- Create: `src/play/plays/predictTwoOnOneDefenderStep.js`
- Modify: `src/play/AnimatedPlay.jsx` (choose() routing + truth banner)
- Modify: `src/play/validateAnimatedPlay.js` (predict contract)
- Modify: `src/play/playCatalog.js` (register play)
- Modify: `docs/play-kernel-standards.md` (Prediction Reveal Rule)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: kind registry; `choose()` shape from Task 4.
- Produces: predict ask shape — `ask: { kind: "predict-next", q, truthNext: string, opts }` where every option's `next` equals `truthNext` and exactly one option (the one matching the true continuation) has `ok: true`. Renderer state `lastKind` (string) — the kind of the question just answered, used by the truth node's banner.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { PREDICT_TWO_ON_ONE_DEFENDER_STEP } from "../src/play/plays/predictTwoOnOneDefenderStep.js";

describe("predict-next kind", () => {
  it("proof play is valid, U13-only, and registered", async () => {
    assert.deepEqual(validateAnimatedPlay(PREDICT_TWO_ON_ONE_DEFENDER_STEP).errs, []);
    assert.deepEqual(PREDICT_TWO_ON_ONE_DEFENDER_STEP.ageBands, ["U13"]);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === PREDICT_TWO_ON_ONE_DEFENDER_STEP.id));
  });

  it("requires truthNext and all options routing to it", () => {
    const noTruth = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    const ask = Object.values(noTruth.nodes).find((n) => n.ask?.kind === "predict-next").ask;
    delete ask.truthNext;
    assert.ok(validateAnimatedPlay(noTruth).errs.some((e) => e.includes("truthNext")));

    const forked = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    const ask2 = Object.values(forked.nodes).find((n) => n.ask?.kind === "predict-next").ask;
    ask2.opts[1].next = Object.keys(forked.nodes)[0];
    assert.ok(validateAnimatedPlay(forked).errs.some((e) => e.includes("must route to truthNext")));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — cannot find `predictTwoOnOneDefenderStep.js`

- [ ] **Step 3: Author the proof play**

Create `src/play/plays/predictTwoOnOneDefenderStep.js`:

```js
// Predict-next proof play. Occlusion point: the rush is live and the lone
// defender has not committed yet. The freeze shows the problem, not the
// solution (Question Reveal Rule); the truth node replays what happens.
export const PREDICT_TWO_ON_ONE_DEFENDER_STEP = {
  id: "predict_2v1_defender_step_u13_v1",
  type: "animated-play",
  title: "2-on-1: Predict the defender",
  concept: "odd-man-reads",
  ageBands: ["U13"],
  view: "half-right",
  start: "entry",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/odd-man-reads.md",
    cite: "Odd-man rush read: when the lone defender steps to the puck carrier, the support option behind the defender becomes the clean next play.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "YOU" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    entry: {
      id: "entry",
      q: "Freeze. You carry the puck into a 2-on-1. What does the defender do next?",
      decisionActor: "F1",
      enter: { F1: [126, 60], F2: [150, 24], D1: [172, 45], G: [187, 42] },
      pos: { F1: [138, 60], F2: [158, 24], D1: [166, 47], G: [186, 42] },
      puck: [133, 60],
      motions: [
        { kind: "skate", from: [126, 60], to: [138, 60], actor: "F1" },
        { kind: "skate", from: [150, 24], to: [158, 24], actor: "F2" },
      ],
      ask: {
        kind: "predict-next",
        q: "Freeze. You carry the puck into a 2-on-1. What does the defender do next?",
        truthNext: "truth",
        opts: [
          { id: "steps_up", t: "The defender steps up to the puck", ok: true, why: "The gap was already tight. When the defender's feet turn to the puck carrier, the pass behind is the next read.", next: "truth" },
          { id: "sags_pass", t: "The defender sags to take away the pass", no: "Watch the defender's gap. It was closing on the puck side, not sliding to the pass lane.", next: "truth" },
          { id: "backs_in", t: "The defender keeps backing in with the rush", no: "Backing in gives up the shot. This defender had already stopped giving ground.", next: "truth" },
        ],
      },
    },
    truth: {
      id: "truth",
      terminal: true,
      q: "The defender steps up to the puck. That is the trigger: the support pass behind the step is now the read.",
      pos: { F1: [146, 60], F2: [162, 24], D1: [158, 51], G: [186, 42] },
      puck: [141, 60],
      motions: [
        { kind: "skate", from: [166, 47], to: [158, 51], actor: "D1" },
      ],
      cue: { label: "Step", shortLabel: "Step", x: 158, y: 44 },
    },
  },
};
```

- [ ] **Step 4: Validator — predict contract**

In `src/play/validateAnimatedPlay.js`, in the same per-kind section as Task 4's verdict block, add:

```js
        if (kind === "predict-next") {
          const truthNext = node.ask?.truthNext;
          if (!truthNext) errs.push(`node ${nodeId} predict-next requires ask.truthNext`);
          else if (!nodeIds.has(truthNext)) errs.push(`node ${nodeId} truthNext routes to missing node ${truthNext}`);
          for (const opt of node.ask?.opts || []) {
            if (truthNext && opt.next !== truthNext) errs.push(`node ${nodeId} predict-next option ${opt.id || "unknown"} must route to truthNext`);
          }
        }
```

- [ ] **Step 5: Renderer — truth banner**

In `src/play/AnimatedPlay.jsx`, add state next to `judgePick`:

```js
  const [lastKind, setLastKind] = useState(null);
```

In `choose()`, in the final (non-verdict-phase) branch, before the `setTimeout`, add:

```js
    setLastKind(kind);
```

Reset it in `replay()` (`setLastKind(null);`). Do NOT reset it in the node effect — the truth node needs it after the transition.

In the question-text area, render the prediction banner on the truth node. Directly above the question-text `<div>` (line ~389), add:

```jsx
        {node.terminal && lastKind === "predict-next" && pickedOption && (
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5B6575", margin: "4px 0 2px" }}>
            You predicted: {optionTextForAge(pickedOption, actorMap, profile)}. Watch what actually happens.
          </div>
        )}
```

(No red/green tone, no "wrong" framing — a wrong prediction is information. The `pickedOption` state already survives the node transition; only `picked` resets.)

- [ ] **Step 6: Register in the catalog**

In `src/play/playCatalog.js`:

```js
import { PREDICT_TWO_ON_ONE_DEFENDER_STEP } from "./plays/predictTwoOnOneDefenderStep.js";
```

```js
  PREDICT_TWO_ON_ONE_DEFENDER_STEP,
```

- [ ] **Step 7: Append the Prediction Reveal Rule to the standards doc**

Append to `docs/play-kernel-standards.md`:

```markdown

## Prediction Reveal Rule

Predict-next questions treat a wrong prediction as information, never a fault.

- The freeze (occlusion point) must show the problem, not the solution, and
  the correct continuation must be objective from visible cues.
- All options route to the same `truthNext` node; the truth plays regardless
  of the prediction.
- The reveal frame is "You predicted X. Watch what actually happens." No red
  flash, no "wrong" framing. The option's `why`/`no` copy explains the cue
  that signaled the true outcome.
- Predict-next is available at U13 first. U11 rollout waits for a telemetry
  review of U13 sessions.
```

- [ ] **Step 8: Run tests, verify in dev harness, commit**

Run: `node scripts/test-question-kinds.mjs && node scripts/test-animated-play.mjs && node scripts/test-play-telemetry.mjs && node scripts/test-scenario-families.mjs`
Expected: PASS

Dev harness check: select "2-on-1: Predict the defender" at U13 — freeze shows no committed defender, pick any option, truth node plays the defender's step with the "You predicted…" banner and the gold "Step" cue.

```bash
git add src/play/plays/predictTwoOnOneDefenderStep.js src/play/AnimatedPlay.jsx src/play/validateAnimatedPlay.js src/play/playCatalog.js docs/play-kernel-standards.md scripts/test-question-kinds.mjs
git commit -m "feat(play): predict-next kind with occlusion proof play"
```

---

### Task 6: Spot-mistake kind with one proof play

**Files:**
- Create: `src/play/plays/spotMistakeFlatSupport.js`
- Modify: `src/play/AnimatedPlay.jsx` (actor tap zones)
- Modify: `src/play/validateAnimatedPlay.js` (spot-mistake contract)
- Modify: `src/play/playCatalog.js` (register play)
- Modify: `docs/play-kernel-standards.md` (One Defensible Mistake Rule)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: watch chains (Task 3); kind registry.
- Produces: spot-mistake ask shape — `ask: { kind: "spot-mistake", q, mistakeActor: string, opts: [{ id, actorId, t, ok?, no?, why?, next }] }`. Renderer renders tap zones over each option's actor position. The reveal node (each opt's `next`) repositions at the mistake moment with a `cue` — the "rewind-highlight" is data, not new renderer machinery.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { SPOT_MISTAKE_FLAT_SUPPORT } from "../src/play/plays/spotMistakeFlatSupport.js";

describe("spot-mistake kind", () => {
  it("proof play is valid and registered", async () => {
    assert.deepEqual(validateAnimatedPlay(SPOT_MISTAKE_FLAT_SUPPORT).errs, []);
    const { ALL_ANIMATED_PLAYS: catalog } = await import("../src/play/playCatalog.js");
    assert.ok(catalog.some((p) => p.id === SPOT_MISTAKE_FLAT_SUPPORT.id));
  });

  it("enforces one defensible mistake", () => {
    const noActor = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    const ask = Object.values(noActor.nodes).find((n) => n.ask?.kind === "spot-mistake").ask;
    delete ask.mistakeActor;
    assert.ok(validateAnimatedPlay(noActor).errs.some((e) => e.includes("mistakeActor")));

    const mismatch = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    const ask2 = Object.values(mismatch.nodes).find((n) => n.ask?.kind === "spot-mistake").ask;
    ask2.mistakeActor = "D1"; // correct option still points at F2
    assert.ok(validateAnimatedPlay(mismatch).errs.some((e) => e.includes("must match mistakeActor")));

    const noActorId = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    const ask3 = Object.values(noActorId.nodes).find((n) => n.ask?.kind === "spot-mistake").ask;
    delete ask3.opts[0].actorId;
    assert.ok(validateAnimatedPlay(noActorId).errs.some((e) => e.includes("actorId")));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — cannot find `spotMistakeFlatSupport.js`

- [ ] **Step 3: Author the proof play**

Create `src/play/plays/spotMistakeFlatSupport.js`:

```js
// Spot-mistake proof play. Exactly one wrong read on screen (One Defensible
// Mistake Rule): the support skater stays flat beside the carrier, so the
// cross-ice pass has no angle and the defender picks it off. F1's pass and
// D1's read are both defensible.
export const SPOT_MISTAKE_FLAT_SUPPORT = {
  id: "spotmistake_2v1_flat_support_u11_v1",
  type: "animated-play",
  title: "2-on-1: Spot the wrong read",
  concept: "odd-man-reads",
  ageBands: ["U11", "U13"],
  view: "half-right",
  start: "watch",
  space: { units: "rink-200x85" },
  sourceRef: {
    note: "docs/library/two-on-one-support-too-flat.md",
    cite: "On a 2-on-1 the support skater stays slightly behind the puck line; flat support removes the passing angle and lets one defender take both options.",
    url: "https://www.usahockey.com/smallareagames",
  },
  actors: [
    { id: "F1", team: "home", role: "puckCarrier", label: "F1" },
    { id: "F2", team: "home", role: "support", label: "F2" },
    { id: "D1", team: "away", role: "defender", label: "D1" },
    { id: "G", team: "away", role: "goalie", label: "G" },
  ],
  nodes: {
    watch: {
      id: "watch",
      q: "Watch the 2-on-1. The pass gets picked off.",
      enter: { F1: [130, 58], F2: [132, 30], D1: [168, 44], G: [187, 42] },
      pos: { F1: [146, 58], F2: [148, 30], D1: [158, 44], G: [186, 42] },
      puck: [141, 58],
      motions: [
        { kind: "skate", from: [130, 58], to: [146, 58], actor: "F1" },
        { kind: "skate", from: [132, 30], to: [148, 30], actor: "F2" },
        { kind: "blocked", from: [146, 58], to: [148, 30], label: "picked off" },
      ],
      autoNext: { next: "spot", ms: 2600 },
    },
    spot: {
      id: "spot",
      q: "One skater made the wrong read. Tap that skater.",
      pos: { F1: [146, 58], F2: [148, 30], D1: [156, 42], G: [186, 42] },
      puck: [156, 42],
      ask: {
        kind: "spot-mistake",
        q: "One skater made the wrong read. Tap that skater.",
        mistakeActor: "F2",
        opts: [
          { id: "pick_f2", actorId: "F2", t: "The support skater", ok: true, why: "F2 skated even with the puck carrier. Flat support means the pass has no angle, so one defender can take both players.", next: "rewind" },
          { id: "pick_f1", actorId: "F1", t: "The puck carrier", no: "The pass was a fair idea. It only failed because the support angle was gone.", next: "rewind" },
          { id: "pick_d1", actorId: "D1", t: "The defender", no: "The defender made the right read: with support flat, sitting in the middle takes away the pass.", next: "rewind" },
        ],
      },
    },
    rewind: {
      id: "rewind",
      terminal: true,
      q: "Rewind to the read: the support skater was even with the puck. Support wins by staying just behind the puck line, so the pass has an angle the defender cannot cut.",
      pos: { F1: [146, 58], F2: [148, 30], D1: [158, 44], G: [186, 42] },
      puck: [141, 58],
      cue: { label: "Flat", shortLabel: "Flat", x: 148, y: 23 },
    },
  },
};
```

- [ ] **Step 4: Validator — spot-mistake contract**

In `src/play/validateAnimatedPlay.js`, in the per-kind section, add:

```js
        if (kind === "spot-mistake") {
          const mistakeActor = node.ask?.mistakeActor;
          if (!mistakeActor) errs.push(`node ${nodeId} spot-mistake requires ask.mistakeActor`);
          else if (!actorIds.has(mistakeActor)) errs.push(`node ${nodeId} mistakeActor ${mistakeActor} is not an actor`);
          for (const opt of node.ask?.opts || []) {
            if (!opt.actorId) errs.push(`node ${nodeId} spot-mistake option ${opt.id || "unknown"} missing actorId`);
            else if (!actorIds.has(opt.actorId)) errs.push(`node ${nodeId} spot-mistake option ${opt.id || "unknown"} actorId ${opt.actorId} is not an actor`);
            if (opt.ok && mistakeActor && opt.actorId !== mistakeActor) {
              errs.push(`node ${nodeId} correct spot-mistake option must match mistakeActor`);
            }
          }
        }
```

- [ ] **Step 5: Renderer — actor tap zones**

In `src/play/AnimatedPlay.jsx`, directly after the lane-pick zone block (Task 2), add a parallel block for `spot-mistake`:

```jsx
        {!node.terminal && kind === "spot-mistake" && (node.ask.opts || []).map((opt, index) => {
          const p = positions[opt.actorId];
          if (!p) return null;
          return (
            <g
              key={`spot-zone-${opt.id}`}
              onClick={() => choose(opt, index)}
              style={{ cursor: picked !== null ? "default" : "pointer" }}
              opacity={picked !== null ? 0.45 : 0.9}
            >
              <circle cx={p[0]} cy={p[1]} r="7.5" fill="transparent" stroke="#C9A24B" strokeWidth="1.1" strokeDasharray="2 1.5" />
            </g>
          );
        })}
```

(Text buttons below the rink keep rendering — same accessible-fallback pattern as lane-pick. No index numbers inside the rings: an unexplained number on the rink violates the Freeze Marker Rule, and the tap target IS the actor.)

- [ ] **Step 6: Register in the catalog**

In `src/play/playCatalog.js`:

```js
import { SPOT_MISTAKE_FLAT_SUPPORT } from "./plays/spotMistakeFlatSupport.js";
```

```js
  SPOT_MISTAKE_FLAT_SUPPORT,
```

- [ ] **Step 7: Append the One Defensible Mistake Rule to the standards doc**

Append to `docs/play-kernel-standards.md`:

```markdown

## One Defensible Mistake Rule

A spot-mistake play must contain exactly one wrong read that a coach would
flag. Every other actor's behavior must be defensibly correct, and each wrong
option's teaching note must say WHY that actor's read was fine.

- Data shape: `ask.mistakeActor` names the actor; exactly one option is
  correct and must point at that actor.
- The validator enforces the data shape. The judgment call - is the mistake
  truly the only flaggable read? - is a manual playtest item and must be
  reviewed before this kind's factory gate opens.
- Spot-mistake stays factory-locked (no bulk production) until two manual
  playtest reviews pass cleanly.
```

- [ ] **Step 8: Run tests, verify in dev harness, commit**

Run: `node scripts/test-question-kinds.mjs && node scripts/test-animated-play.mjs && node scripts/test-play-telemetry.mjs && node scripts/test-scenario-families.mjs`
Expected: PASS

Dev harness check: select "2-on-1: Spot the wrong read" at U11 — watch chain plays the pick-off, gold dashed rings appear on F1/F2/D1, tapping F2 (or its text button) routes to the rewind node with the "Flat" cue.

```bash
git add src/play/plays/spotMistakeFlatSupport.js src/play/AnimatedPlay.jsx src/play/validateAnimatedPlay.js src/play/playCatalog.js docs/play-kernel-standards.md scripts/test-question-kinds.mjs
git commit -m "feat(play): spot-mistake kind with one-defensible-mistake proof play"
```

---

### Task 7: Age gating (`profile.kinds` + read-mc fallback)

**Files:**
- Modify: `src/play/interactionProfiles.js`
- Modify: `src/play/AnimatedPlay.jsx` (effectiveKind)
- Modify: `src/play/validateAnimatedPlay.js` (band/kind warning + young hard error)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: everything above.
- Produces: `INTERACTION_PROFILES[band].kinds` (array of kind names), export `kindsForAge(ageBand) -> string[]` from `interactionProfiles.js`. Renderer rule: `effectiveKind = profile.kinds.includes(kind) ? kind : "read-mc"` — a kind the band can't render falls back to its text buttons (every kind's options carry `t`, so the fallback always renders). Validator: ERROR when a play with a non-U7/U9 kind lists U7 or U9 in `ageBands`; WARN when any listed band lacks the kind (fallback presentation).

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { kindsForAge } from "../src/play/interactionProfiles.js";

describe("age gating", () => {
  it("bands expose their kind lists", () => {
    assert.deepEqual(kindsForAge("U7"), ["read-mc", "lane-pick"]);
    assert.deepEqual(kindsForAge("U9"), ["read-mc", "lane-pick"]);
    assert.deepEqual(kindsForAge("U11"), ["read-mc", "lane-pick", "verdict", "spot-mistake"]);
    assert.deepEqual(kindsForAge("U13"), ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"]);
    assert.deepEqual(kindsForAge("U18"), ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"]);
  });

  it("errors when a new kind targets U7/U9 and warns on fallback bands", () => {
    const young = structuredClone(SPOT_MISTAKE_FLAT_SUPPORT);
    young.ageBands = ["U9", "U11"];
    assert.ok(validateAnimatedPlay(young).errs.some((e) => e.includes("not available at U9")));

    const fallback = structuredClone(PREDICT_TWO_ON_ONE_DEFENDER_STEP);
    fallback.ageBands = ["U11", "U13"]; // U11 cannot natively render predict-next yet
    const result = validateAnimatedPlay(fallback);
    assert.deepEqual(result.errs, []);
    assert.ok(result.warns.some((w) => w.includes("falls back to read-mc")));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — `kindsForAge` is not exported

- [ ] **Step 3: Extend `interactionProfiles.js`**

Add a `kinds` array to each profile in `INTERACTION_PROFILES` (keep every existing field untouched):

```js
export const INTERACTION_PROFILES = {
  U7:  { label: "U7 - Playground", token: "figure", accent: "#2A6FDB", bg: "#EAF6FF", big: true, celebrate: true, timer: "none", kinds: ["read-mc", "lane-pick"] },
  U9:  { label: "U9 - Mini-games", token: "figure", accent: "#2A6FDB", bg: "#EEF7FF", big: true, celebrate: true, timer: "none", kinds: ["read-mc", "lane-pick"] },
  U11: { label: "U11 - The Trainer", token: "token", accent: "#C9A24B", bg: "#FBF8F0", big: false, celebrate: false, timer: "gentle", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake"] },
  U13: { label: "U13 - Read & React", token: "token", accent: "#C9A24B", bg: "#FBF8F0", big: false, celebrate: false, timer: "gentle", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"] },
  U15: { label: "U15 - Pro Reps", token: "symbol", accent: "#0B1A33", bg: "#F3F5F8", big: false, celebrate: false, timer: "fast", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"] },
  U18: { label: "U18 - Film Room", token: "symbol", accent: "#0B1A33", bg: "#EEF1F5", big: false, celebrate: false, timer: "fast", kinds: ["read-mc", "lane-pick", "verdict", "spot-mistake", "predict-next"] },
};
```

Append:

```js
export function kindsForAge(ageBand = "U11") {
  return profileForAge(ageBand).kinds || ["read-mc", "lane-pick"];
}
```

- [ ] **Step 4: Renderer — effectiveKind fallback**

In `src/play/AnimatedPlay.jsx`, replace the `const kind = resolveKind(node);` line (Task 2) with:

```js
  const rawKind = resolveKind(node);
  const kind = rawKind && profile.kinds?.includes(rawKind) ? rawKind : rawKind ? "read-mc" : null;
```

(Everything downstream already branches on `kind`, so an unavailable kind renders as plain text MC. For verdict the justify step still runs — that is intended; justify is copy, not a rink mechanic. For predict-next the banner is gated on `lastKind === "predict-next"`, which can no longer be set at a band where the kind fell back, so no dangling banner.)

NOTE: `lastKind` must record the EFFECTIVE kind — in Task 5's `choose()` it already reads the component-level `kind`, which is now the effective kind. No change needed; verify by reading the function.

- [ ] **Step 5: Validator — band availability**

`validateAnimatedPlay.js` needs the band map. Import at top:

```js
import { kindsForAge } from "./interactionProfiles.js";
```

In the per-node non-terminal/non-watch branch (after the per-kind contracts), add:

```js
        for (const band of play.ageBands || []) {
          const available = kindsForAge(band).includes(kind);
          if (!available && ["U7", "U9"].includes(band)) {
            errs.push(`node ${nodeId} kind ${kind} is not available at ${band}`);
          } else if (!available) {
            warns.push(`node ${nodeId} kind ${kind} falls back to read-mc at ${band}`);
          }
        }
```

- [ ] **Step 6: Run tests and commit**

Run: `node scripts/test-question-kinds.mjs && node scripts/test-animated-play.mjs && node scripts/test-play-tokens.mjs && node scripts/test-play-telemetry.mjs && node scripts/test-scenario-families.mjs`
Expected: PASS

```bash
git add src/play/interactionProfiles.js src/play/AnimatedPlay.jsx src/play/validateAnimatedPlay.js scripts/test-question-kinds.mjs
git commit -m "feat(play): per-band kind availability with read-mc fallback"
```

---

### Task 8: Factory reports, variant queue, bulk gate

**Files:**
- Modify: `src/play/playFamilies.js` (kind coverage in the family report)
- Modify: `scripts/report-scenario-families.mjs` (print kind coverage)
- Modify: `scripts/report-next-variants.mjs` — CHECK THE ACTUAL FILENAME first with `grep -n "next-variants" package.json` (recommend a kind per queued variant)
- Modify: `package.json` (`check:bulk` chain)
- Modify: `docs/factory/bulk-batch-template.md` (kind column)
- Test: `scripts/test-question-kinds.mjs` (extend)

**Interfaces:**
- Consumes: `resolveKind` (Task 1), family report shape from `buildScenarioFamilyReport`.
- Produces: family report rows gain `kindCounts` (object mapping kind -> play count) and a warning `"family has N/M target variants but only 1 question kind"` when `count >= targetVariants` and kinds < 2. Export `playKinds(play) -> string[]` from `playFamilies.js`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-question-kinds.mjs`:

```js
import { buildScenarioFamilyReport, playKinds } from "../src/play/playFamilies.js";

describe("factory kind coverage", () => {
  it("reports kinds per play and per family", () => {
    assert.deepEqual(playKinds(TWO_ON_ONE_READ_PLAY), ["read-mc"]);
    assert.deepEqual(playKinds(VERDICT_TWO_ON_ONE_FORCED_SHOT), ["verdict"]);

    const report = buildScenarioFamilyReport();
    const twoOnOne = report.families.find((f) => f.id === "two_on_one");
    assert.ok(twoOnOne.kindCounts["read-mc"] >= 1);
    assert.ok(twoOnOne.kindCounts["verdict"] >= 1);
    assert.ok(twoOnOne.kindCounts["predict-next"] >= 1);
    assert.ok(twoOnOne.kindCounts["spot-mistake"] >= 1);
  });

  it("warns when a complete family is single-kind", () => {
    const report = buildScenarioFamilyReport([
      structuredClone(TWO_ON_ONE_READ_PLAY),
    ].map((p, i) => ({ ...p, id: `${p.id}_${i}` })));
    // gap_control etc. will warn for zero plays; the single-kind warning needs a full family:
    const fakeFamilyPlays = Array.from({ length: 6 }, (_, i) => ({
      ...structuredClone(TWO_ON_ONE_READ_PLAY),
      id: `fake_2v1_${i}`,
    }));
    const full = buildScenarioFamilyReport(fakeFamilyPlays);
    assert.ok(full.warnings.some((w) => w.familyId === "two_on_one" && w.message.includes("only 1 question kind")));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-question-kinds.mjs`
Expected: FAIL — `playKinds` is not exported

- [ ] **Step 3: Extend `playFamilies.js`**

Import at top of `src/play/playFamilies.js`:

```js
import { resolveKind } from "./questionKinds.js";
```

Append:

```js
export function playKinds(play) {
  const kinds = new Set();
  for (const node of Object.values(play?.nodes || {})) {
    const kind = resolveKind(node);
    if (kind) kinds.add(kind);
  }
  return [...kinds].sort();
}
```

In `buildScenarioFamilyReport`, extend each family row. Inside the `familyRows` map, after `count: matchedPlays.length,` add:

```js
      kindCounts: matchedPlays.reduce((acc, play) => {
        for (const kind of playKinds(play)) acc[kind] = (acc[kind] || 0) + 1;
        return acc;
      }, {}),
```

In the warnings loop over `familyRows`, add:

```js
    const kindCount = Object.keys(row.kindCounts || {}).length;
    if (row.targetVariants && row.count >= row.targetVariants && kindCount < 2) {
      warnings.push({
        familyId: row.id,
        message: `family has ${row.count}/${row.targetVariants} target variants but only ${kindCount} question kind`,
      });
    }
```

- [ ] **Step 4: Print kind coverage in the reports**

Open `scripts/report-scenario-families.mjs`. In its per-family markdown emit (it renders `count`, `targetVariants`, and play lists from `buildScenarioFamilyReport()` — match its existing style), add one line per family:

```js
  const kindLine = Object.entries(row.kindCounts || {})
    .map(([kind, n]) => `${kind}: ${n}`)
    .join(", ");
  // emit e.g.:  `- **Kinds:** read-mc: 6, verdict: 1, predict-next: 1, spot-mistake: 1`
```

Then run `grep -n "next-variants" package.json` to get the actual next-variants script path, open it, and where each queued variant is emitted with its `Format` field, add a recommended kind line derived from the family's `kindCounts` — recommend the first kind from `["verdict", "predict-next", "spot-mistake"]` that the family has zero of (falling back to `"read-mc"`), e.g.:

```js
  const NEW_KINDS = ["verdict", "predict-next", "spot-mistake"];
  const missingKind = NEW_KINDS.find((k) => !(row.kindCounts || {})[k]) || "read-mc";
  // emit e.g.:  `- **Recommended kind:** ${missingKind}`
```

Regenerate both reports with the same npm scripts the standards doc names (`npm run report:scenario-families`, `npm run report:next-variants`) and commit the regenerated markdown.

- [ ] **Step 5: Add the kind column to the bulk-batch template**

Open `docs/factory/bulk-batch-template.md` and add a `Kind` column to its play table (keep every existing column), plus this checklist line to its pre-commit checks:

```markdown
- [ ] Per-kind playtest items reviewed: occlusion point objective (predict), exactly one defensible mistake (spot-mistake), justify evidence visible on the rink (verdict)
```

Also append to the checklist: `- [ ] spot-mistake plays: factory gate still locked unless two clean manual playtests are on file (One Defensible Mistake Rule)`.

- [ ] **Step 6: Wire the new test into `check:bulk`**

Run `grep -n "check:bulk" package.json` to see the existing chain, then append `&& node scripts/test-question-kinds.mjs` to it (keep everything already there).

- [ ] **Step 7: Full gate run and commit**

Run: `npm run check:bulk`
Expected: PASS end-to-end (catalog tests, factory standards, telemetry, families, reports, build).

Run: `npm run build`
Expected: production build succeeds.

```bash
git add src/play/playFamilies.js scripts/report-scenario-families.mjs scripts/report-next-variants.mjs package.json docs/factory/bulk-batch-template.md docs/scenario-families-report.md docs/factory/next-scenario-variants.md scripts/test-question-kinds.mjs
git commit -m "feat(factory): kind-aware family reports, variant queue, and bulk gate"
```

(If the next-variants script or report files have different names than assumed here, use the names `grep` found in Step 4/6 — the content changes are as specced.)

---

## Manual playtest gate (after Task 8)

Per the design's testing section and the Bulk-Assisted Creation Rule, before any NEW kind's factory gate opens for bulk production:

- [ ] Create `docs/manual-playtest/question-kinds-cycle1.md` recording a playtest of each proof play at U11 and U13 (and U7 regression spot-check on one legacy play + one lane-pick play): what was shown, what was tapped, whether the read stayed objective, any reveal that leaked the answer.
- [ ] Predict-next and verdict: factory gates may open after ONE clean playtest each.
- [ ] Spot-mistake: stays factory-locked until TWO clean playtests (One Defensible Mistake Rule).
- [ ] Commit the playtest doc.

## Self-review results (already applied)

- Spec coverage: registry (Task 1), spatial answers (Task 2), watch chains + skip + Watch Chain Rule (Task 3), verdict + justify + Verdict Voice Rule (Task 4), predict-next + Prediction Reveal Rule (Task 5), spot-mistake + One Defensible Mistake Rule (Task 6), age gating + fallback + U7/U9 hard error (Task 7), telemetry `kind` (Task 1) + watch-node snapshots (Task 3), family kind coverage + variant queue + bulk gate (Task 8), manual playtest gate (final section). All spec sections have tasks.
- Known deliberate deviation from the spec: the spec's "moment marker" option for spot-mistake taps is dropped (actor taps only) — YAGNI for Cycle 1; a moment marker needs scrubbing UI that belongs with the arcade cycle if ever.
- Type consistency check: `resolveKind(node)`, `kindSpec(kind)`, `watchChainInfo(play, nodeId)`, `kindsForAge(ageBand)`, `playKinds(play)` — names match across all tasks; `ask.truthNext`, `ask.justify.opts[].evidence`, `ask.mistakeActor`, `opt.actorId`, `opt.u13Only`, `node.autoNext.{next,ms}` used consistently.
