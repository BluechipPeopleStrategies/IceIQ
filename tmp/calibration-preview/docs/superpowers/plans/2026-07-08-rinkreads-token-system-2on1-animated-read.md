# RinkReads Token System and 2-on-1 Animated Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable RinkReads animated scenario kernel: original RinkReads player tokens, a source-backed 2-on-1 read, reveal/replay behavior, and basic telemetry behind the existing `#playtest` route.

**Architecture:** Keep the existing app route and `RinkPlay` public import stable, but move the new animated-play implementation into focused `src/play/` modules. The first playable slice stays behind `#playtest`; it does not enter the main quiz bank until the manual playtest gate passes. The play object is data-first so the next phase can compile it into the unified scenario engine or generate variations.

**Tech Stack:** React 18, Vite 5, plain JavaScript/JSX, Node built-in test runner for pure module tests, localStorage for prototype telemetry. No new dependencies.

## Global Constraints

- App brand is `RinkReads` as one word.
- Repo and deploy name remain `IceIQ`.
- Score metric remains `Game Sense Score`; do not introduce `Hockey IQ`.
- Use React + Vite with plain JS/JSX; do not add TypeScript.
- Do not add npm packages.
- Use original RinkReads tokens; do not copy AtomicRED player art.
- Visual meaning must never rely on color alone; shape, label, pattern, and motion must carry the read.
- The first implementation target is one 2-on-1 animated read, not a full generator.
- All play data must carry `sourceRef`.
- Existing untracked files in the worktree are unrelated; stage only files touched by this plan.

---

## File Structure

- Create `src/play/interactionProfiles.js`: age-band profile definitions and `profileForAge(ageBand)`.
- Create `src/play/motionVocabulary.js`: colorblind-safe route semantics for skate, pass, shot, blocked lane, freeze, and decision target.
- Create `src/play/tokenSystem.js`: pure token rules that decide representation, shape, label, and role semantics for each age band.
- Create `src/play/plays/twoOnOneRead.js`: the source-backed 2-on-1 animated play object.
- Create `src/play/validateAnimatedPlay.js`: deterministic validation for the new animated play object.
- Create `src/play/telemetry.js`: prototype event logging for accuracy, reaction time, replay, and unclear-read flag.
- Create `src/play/AnimatedPlay.jsx`: React renderer for the animated play object.
- Create `src/play/index.js`: public exports for play modules.
- Modify `src/RinkPlay.jsx`: turn it into a compatibility wrapper that exports the new play renderer/test harness under the existing import path.
- Modify `package.json`: add pure test scripts.
- Create `scripts/test-play-tokens.mjs`: token and motion vocabulary tests.
- Create `scripts/test-animated-play.mjs`: play object and validator tests.
- Create `scripts/test-play-telemetry.mjs`: telemetry tests with fake storage.
- Create `docs/library/odd-man-reads.md`: source note for the 2-on-1 read.
- Modify `docs/library/INDEX.md`: add `odd-man-reads`.
- Create `docs/manual-playtest/2026-07-08-two-on-one-animated-read.md`: manual playtest gate checklist.

---

### Task 1: Token And Motion Vocabulary

**Files:**
- Create: `src/play/interactionProfiles.js`
- Create: `src/play/motionVocabulary.js`
- Create: `src/play/tokenSystem.js`
- Create: `scripts/test-play-tokens.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: none.
- Produces:
  - `profileForAge(ageBand: string): InteractionProfile`
  - `motionStyle(kind: string): MotionStyle`
  - `tokenSpec({ actor, ageBand, isDecisionActor }): TokenSpec`
  - `validateTokenSystem(): string[]`

- [ ] **Step 1: Write the failing token and motion tests**

Create `scripts/test-play-tokens.mjs` with this content:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AGE_BANDS, profileForAge } from "../src/play/interactionProfiles.js";
import { MOTION_STYLES, motionStyle } from "../src/play/motionVocabulary.js";
import { tokenSpec, validateTokenSystem } from "../src/play/tokenSystem.js";

describe("RinkReads play token system", () => {
  it("defines all six age-band profiles", () => {
    assert.deepEqual(AGE_BANDS, ["U7", "U9", "U11", "U13", "U15", "U18"]);
    assert.equal(profileForAge("U7").token, "figure");
    assert.equal(profileForAge("U11").token, "token");
    assert.equal(profileForAge("U18").token, "symbol");
    assert.equal(profileForAge("unknown").token, "token");
  });

  it("keeps every token distinguishable without color alone", () => {
    assert.deepEqual(validateTokenSystem(), []);
    const young = tokenSpec({ actor: { id: "F1", role: "puckCarrier", team: "home" }, ageBand: "U7", isDecisionActor: true });
    const trainer = tokenSpec({ actor: { id: "F2", role: "support", team: "home" }, ageBand: "U11", isDecisionActor: false });
    const advanced = tokenSpec({ actor: { id: "D1", role: "defender", team: "away" }, ageBand: "U18", isDecisionActor: false });
    assert.equal(young.representation, "figure");
    assert.equal(young.caption, "YOU");
    assert.equal(trainer.shape, "circle");
    assert.equal(advanced.shape, "x-circle");
    assert.equal(advanced.colorOnly, false);
  });

  it("defines motion vocabulary by line pattern and label, not only color", () => {
    assert.equal(MOTION_STYLES.pass.dash, "4 3");
    assert.equal(MOTION_STYLES.shot.width > MOTION_STYLES.skate.width, true);
    assert.equal(MOTION_STYLES.blocked.pattern, "striped");
    assert.equal(motionStyle("missing").label, "Skate route");
  });
});
```

- [ ] **Step 2: Add package scripts**

Modify `package.json` inside the `"scripts"` object by adding these entries near the other `test:*` scripts:

```json
"test:play-tokens": "node --test scripts/test-play-tokens.mjs",
"test:animated-play": "node --test scripts/test-animated-play.mjs",
"test:play-telemetry": "node --test scripts/test-play-telemetry.mjs"
```

- [ ] **Step 3: Run the failing test**

Run:

```powershell
npm run test:play-tokens
```

Expected: FAIL because `src/play/interactionProfiles.js` does not exist.

- [ ] **Step 4: Create age interaction profiles**

Create `src/play/interactionProfiles.js` with this content:

```js
export const INTERACTION_PROFILES = {
  U7:  { label: "U7 - Playground", token: "figure", accent: "#2A6FDB", bg: "#EAF6FF", big: true, celebrate: true, timer: "none" },
  U9:  { label: "U9 - Mini-games", token: "figure", accent: "#2A6FDB", bg: "#EEF7FF", big: true, celebrate: true, timer: "none" },
  U11: { label: "U11 - The Trainer", token: "token", accent: "#C9A24B", bg: "#FBF8F0", big: false, celebrate: false, timer: "gentle" },
  U13: { label: "U13 - Read & React", token: "token", accent: "#C9A24B", bg: "#FBF8F0", big: false, celebrate: false, timer: "gentle" },
  U15: { label: "U15 - Pro Reps", token: "symbol", accent: "#0B1A33", bg: "#F3F5F8", big: false, celebrate: false, timer: "fast" },
  U18: { label: "U18 - Film Room", token: "symbol", accent: "#0B1A33", bg: "#EEF1F5", big: false, celebrate: false, timer: "fast" },
};

export const AGE_BANDS = Object.keys(INTERACTION_PROFILES);

export function profileForAge(ageBand = "U11") {
  return INTERACTION_PROFILES[ageBand] || INTERACTION_PROFILES.U11;
}
```

- [ ] **Step 5: Create motion vocabulary**

Create `src/play/motionVocabulary.js` with this content:

```js
export const MOTION_STYLES = {
  skate: {
    label: "Skate route",
    stroke: "#0B1A33",
    width: 1.6,
    dash: "",
    marker: "arrow",
    pattern: "solid",
  },
  pass: {
    label: "Pass lane",
    stroke: "#0B1A33",
    width: 1.6,
    dash: "4 3",
    marker: "arrow",
    pattern: "dotted",
  },
  shot: {
    label: "Shot lane",
    stroke: "#0B1A33",
    width: 2.8,
    dash: "",
    marker: "arrow",
    pattern: "thick",
  },
  blocked: {
    label: "Covered lane",
    stroke: "#6B7280",
    width: 2,
    dash: "2 2",
    marker: "none",
    pattern: "striped",
  },
  freeze: {
    label: "Read point",
    stroke: "#C9A24B",
    width: 1.8,
    dash: "3 2",
    marker: "none",
    pattern: "numbered-ring",
  },
  target: {
    label: "Open target",
    stroke: "#C9A24B",
    width: 1.8,
    dash: "3 2",
    marker: "none",
    pattern: "ring",
  },
};

export function motionStyle(kind = "skate") {
  return MOTION_STYLES[kind] || MOTION_STYLES.skate;
}
```

- [ ] **Step 6: Create token system**

Create `src/play/tokenSystem.js` with this content:

```js
import { profileForAge } from "./interactionProfiles.js";

const ROLE_SHAPES = {
  puckCarrier: "circle-double",
  support: "circle",
  defender: "x-circle",
  goalie: "rounded-square",
  puck: "disc",
};

const ROLE_LABELS = {
  puckCarrier: "YOU",
  support: "F2",
  defender: "D1",
  goalie: "G",
  puck: "PUCK",
};

export function tokenSpec({ actor, ageBand = "U11", isDecisionActor = false }) {
  const profile = profileForAge(ageBand);
  const role = actor?.role || "support";
  const shape = ROLE_SHAPES[role] || "circle";
  const fallbackLabel = ROLE_LABELS[role] || actor?.id || "";
  const caption = isDecisionActor ? "YOU" : (actor?.label || fallbackLabel);
  return {
    id: actor?.id || "",
    role,
    team: actor?.team || "home",
    representation: profile.token,
    shape,
    caption,
    interiorLabel: actor?.label || fallbackLabel,
    colorOnly: false,
  };
}

export function validateTokenSystem() {
  const errs = [];
  for (const role of ["puckCarrier", "support", "defender", "goalie", "puck"]) {
    if (!ROLE_SHAPES[role]) errs.push(`missing shape for ${role}`);
    if (!ROLE_LABELS[role]) errs.push(`missing label for ${role}`);
  }
  const specs = [
    tokenSpec({ actor: { id: "F1", role: "puckCarrier" }, ageBand: "U7", isDecisionActor: true }),
    tokenSpec({ actor: { id: "F2", role: "support" }, ageBand: "U11" }),
    tokenSpec({ actor: { id: "D1", role: "defender" }, ageBand: "U18" }),
    tokenSpec({ actor: { id: "G", role: "goalie" }, ageBand: "U18" }),
  ];
  for (const spec of specs) {
    if (!spec.shape) errs.push(`missing shape for ${spec.id}`);
    if (!spec.caption) errs.push(`missing caption for ${spec.id}`);
    if (spec.colorOnly) errs.push(`color-only token for ${spec.id}`);
  }
  return errs;
}
```

- [ ] **Step 7: Run the token test**

Run:

```powershell
npm run test:play-tokens
```

Expected: PASS with three subtests passing.

- [ ] **Step 8: Commit Task 1**

Run:

```powershell
git add package.json scripts/test-play-tokens.mjs src/play/interactionProfiles.js src/play/motionVocabulary.js src/play/tokenSystem.js
git commit -m "feat: add RinkReads play token vocabulary" -m "Co-Authored-By: Codex <codex@openai.com>"
```

---

### Task 2: Source-Backed 2-on-1 Play Data And Validator

**Files:**
- Create: `src/play/plays/twoOnOneRead.js`
- Create: `src/play/validateAnimatedPlay.js`
- Create: `src/play/index.js`
- Create: `scripts/test-animated-play.mjs`

**Interfaces:**
- Consumes:
  - `motionStyle(kind: string): MotionStyle`
  - `tokenSpec({ actor, ageBand, isDecisionActor }): TokenSpec`
- Produces:
  - `TWO_ON_ONE_READ_PLAY: AnimatedPlay`
  - `validateAnimatedPlay(play): { ok: boolean, errs: string[], warns: string[] }`

- [ ] **Step 1: Write the failing animated-play test**

Create `scripts/test-animated-play.mjs` with this content:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TWO_ON_ONE_READ_PLAY } from "../src/play/plays/twoOnOneRead.js";
import { validateAnimatedPlay } from "../src/play/validateAnimatedPlay.js";

describe("2-on-1 animated play object", () => {
  it("is valid, sourced, and has a terminal reveal", () => {
    const result = validateAnimatedPlay(TWO_ON_ONE_READ_PLAY);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
    assert.equal(TWO_ON_ONE_READ_PLAY.type, "animated-play");
    assert.equal(TWO_ON_ONE_READ_PLAY.sourceRef.note, "docs/library/odd-man-reads.md");
    assert.equal(TWO_ON_ONE_READ_PLAY.start, "rush");
    assert.equal(TWO_ON_ONE_READ_PLAY.nodes.finish.terminal, true);
  });

  it("has exactly one correct first read", () => {
    const opts = TWO_ON_ONE_READ_PLAY.nodes.rush.ask.opts;
    assert.equal(opts.filter((o) => o.ok).length, 1);
    assert.equal(opts.find((o) => o.ok).id, "pass_backdoor");
  });

  it("rejects missing sourceRef and dangling routes", () => {
    const noSource = { ...TWO_ON_ONE_READ_PLAY, sourceRef: null };
    assert.equal(validateAnimatedPlay(noSource).ok, false);

    const badRoute = {
      ...TWO_ON_ONE_READ_PLAY,
      nodes: {
        ...TWO_ON_ONE_READ_PLAY.nodes,
        rush: {
          ...TWO_ON_ONE_READ_PLAY.nodes.rush,
          ask: {
            ...TWO_ON_ONE_READ_PLAY.nodes.rush.ask,
            opts: [{ id: "bad", t: "Bad", ok: true, next: "missing" }],
          },
        },
      },
    };
    assert.equal(validateAnimatedPlay(badRoute).ok, false);
  });
});
```

- [ ] **Step 2: Run the failing animated-play test**

Run:

```powershell
npm run test:animated-play
```

Expected: FAIL because `src/play/plays/twoOnOneRead.js` does not exist.

- [ ] **Step 3: Create the 2-on-1 play object**

Create `src/play/plays/twoOnOneRead.js` with this content:

```js
export const TWO_ON_ONE_READ_PLAY = {
  id: "play_2v1_backdoor_read_u11_v1",
  type: "animated-play",
  title: "2-on-1: Defender steps up",
  concept: "odd-man-reads",
  ageBands: ["U9", "U11", "U13"],
  view: "half-right",
  start: "rush",
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
    rush: {
      id: "rush",
      q: "The lone defender steps up to you. What is the best read?",
      decisionActor: "F1",
      enter: { F1: [132, 61], F2: [154, 24], D1: [178, 43], G: [187, 42] },
      pos: { F1: [146, 60], F2: [162, 24], D1: [160, 50], G: [186, 42] },
      puck: [141, 60],
      freeze: { x: 146, y: 60, label: "1" },
      motions: [
        { kind: "skate", from: [132, 61], to: [146, 60], actor: "F1" },
        { kind: "skate", from: [154, 24], to: [162, 24], actor: "F2" },
        { kind: "blocked", from: [146, 60], to: [186, 42], label: "shot lane covered" },
      ],
      overlays: [
        { kind: "freeze", x: 146, y: 60, label: "1" },
      ],
      ask: {
        actor: "F1",
        q: "The lone defender steps up to you. What is the best read?",
        opts: [
          { id: "shoot_far", t: "Shoot through the defender", no: "The defender has stepped into the shooting lane.", outcome: "The shot is blocked and the rush slows down.", next: "blockedShot" },
          { id: "pass_backdoor", t: "Pass across to F2", ok: true, next: "catch" },
          { id: "deke_middle", t: "Deke into the defender", no: "That lets the lone defender play your body and the puck.", outcome: "The defender closes the gap and the 2-on-1 disappears.", next: "turnover" },
          { id: "delay_wait", t: "Wait for everyone to catch up", no: "Waiting gives the defender and goalie time to reset.", outcome: "The passing lane closes.", next: "turnover" },
        ],
      },
    },
    catch: {
      id: "catch",
      q: "F2 catches the pass while the goalie is sliding. What comes next?",
      decisionActor: "F2",
      enter: { F1: [146, 60], F2: [162, 24], D1: [160, 50], G: [186, 42] },
      pos: { F1: [162, 54], F2: [162, 24], D1: [170, 40], G: [187, 36] },
      puck: [160, 24],
      freeze: { x: 162, y: 24, label: "2" },
      motions: [
        { kind: "pass", from: [146, 60], to: [160, 24], label: "back-door pass" },
        { kind: "shot", from: [160, 24], to: [187, 45], label: "quick finish" },
      ],
      overlays: [
        { kind: "target", x: 187, y: 45, r: 5 },
      ],
      ask: {
        actor: "F2",
        q: "You catch it at the back door. What is the play?",
        opts: [
          { id: "quick_shot", t: "Shoot quickly before the goalie gets square", ok: true, next: "finish" },
          { id: "hold_puck", t: "Hold the puck", no: "Holding lets the goalie recover across the crease.", outcome: "The goalie gets square.", next: "turnover" },
          { id: "skate_corner", t: "Skate into the corner", no: "That takes the puck away from the open net.", outcome: "The scoring chance disappears.", next: "turnover" },
          { id: "pass_back", t: "Pass back to F1", no: "F1 is no longer the open option.", outcome: "The defender recovers to the middle.", next: "turnover" },
        ],
      },
    },
    finish: {
      id: "finish",
      terminal: true,
      q: "Goal. The defender stepped to F1, the back-door pass moved the goalie, and F2 shot before the goalie recovered.",
      pos: { F1: [162, 54], F2: [158, 27], D1: [170, 40], G: [181, 30] },
      puck: [191, 44],
      motions: [
        { kind: "shot", from: [158, 27], to: [191, 44], label: "finish" },
      ],
    },
    blockedShot: {
      id: "blockedShot",
      terminal: true,
      q: "The defender blocks the shot. The open support option was missed.",
      pos: { F1: [150, 60], F2: [162, 24], D1: [157, 55], G: [186, 42] },
      puck: [157, 55],
      motions: [
        { kind: "blocked", from: [150, 60], to: [157, 55], label: "blocked" },
      ],
    },
    turnover: {
      id: "turnover",
      terminal: true,
      q: "The window closes. On a 2-on-1, the read has to happen while the defender is committed.",
      pos: { F1: [160, 58], F2: [165, 26], D1: [163, 46], G: [186, 42] },
      puck: [163, 46],
      motions: [
        { kind: "blocked", from: [160, 58], to: [163, 46], label: "lane gone" },
      ],
    },
  },
};
```

- [ ] **Step 4: Create animated play validator**

Create `src/play/validateAnimatedPlay.js` with this content:

```js
const REQUIRED_NODE_FIELDS = ["id", "q", "pos"];

function isPoint(p) {
  return Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n));
}

export function validateAnimatedPlay(play) {
  const errs = [];
  const warns = [];

  if (!play || typeof play !== "object") return { ok: false, errs: ["play is not an object"], warns };
  if (play.type !== "animated-play") errs.push(`type must be animated-play, got ${JSON.stringify(play.type)}`);
  if (!play.id) errs.push("missing id");
  if (!play.sourceRef || !play.sourceRef.note || !play.sourceRef.cite) errs.push("sourceRef.note and sourceRef.cite are required");
  if (!Array.isArray(play.actors) || play.actors.length < 2) errs.push("actors must contain at least two actors");
  if (!play.nodes || typeof play.nodes !== "object") errs.push("nodes must be an object");
  if (!play.start) errs.push("missing start node");

  const actorIds = new Set((play.actors || []).map((a) => a.id));
  if (actorIds.size !== (play.actors || []).length) errs.push("actor ids must be unique");
  const nodeIds = new Set(Object.keys(play.nodes || {}));
  if (play.start && !nodeIds.has(play.start)) errs.push(`start node ${play.start} is missing`);

  let terminalCount = 0;
  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    for (const field of REQUIRED_NODE_FIELDS) {
      if (!node[field]) errs.push(`node ${nodeId} missing ${field}`);
    }
    if (node.terminal) terminalCount++;
    for (const [actorId, point] of Object.entries(node.pos || {})) {
      if (!actorIds.has(actorId)) errs.push(`node ${nodeId} positions unknown actor ${actorId}`);
      if (!isPoint(point)) errs.push(`node ${nodeId} position for ${actorId} must be [x,y]`);
    }
    if (node.puck && !isPoint(node.puck)) errs.push(`node ${nodeId} puck must be [x,y]`);
    if (node.decisionActor && !actorIds.has(node.decisionActor)) errs.push(`node ${nodeId} decisionActor ${node.decisionActor} is not an actor`);
    if (!node.terminal) {
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

  if (terminalCount === 0) errs.push("play must include at least one terminal node");
  return { ok: errs.length === 0, errs, warns };
}
```

- [ ] **Step 5: Create play module exports**

Create `src/play/index.js` with this content:

```js
export { AGE_BANDS, INTERACTION_PROFILES, profileForAge } from "./interactionProfiles.js";
export { MOTION_STYLES, motionStyle } from "./motionVocabulary.js";
export { tokenSpec, validateTokenSystem } from "./tokenSystem.js";
export { validateAnimatedPlay } from "./validateAnimatedPlay.js";
export { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";
export { default as AnimatedPlay, AnimatedPlayTest } from "./AnimatedPlay.jsx";
```

- [ ] **Step 6: Run the animated-play test**

Run:

```powershell
npm run test:animated-play
```

Expected: PASS with three subtests passing.

- [ ] **Step 7: Commit Task 2**

Run:

```powershell
git add scripts/test-animated-play.mjs src/play/plays/twoOnOneRead.js src/play/validateAnimatedPlay.js src/play/index.js
git commit -m "feat: add source-backed animated 2-on-1 play data" -m "Co-Authored-By: Codex <codex@openai.com>"
```

---

### Task 3: Animated Play Renderer Behind Existing Route

**Files:**
- Create: `src/play/AnimatedPlay.jsx`
- Modify: `src/RinkPlay.jsx`

**Interfaces:**
- Consumes:
  - `profileForAge(ageBand)`
  - `motionStyle(kind)`
  - `tokenSpec({ actor, ageBand, isDecisionActor })`
  - `TWO_ON_ONE_READ_PLAY`
- Produces:
  - `AnimatedPlay({ play, ageBand, onEvent }): JSX.Element`
  - `AnimatedPlayTest(): JSX.Element`
  - Existing `RinkPlayTest` import in `src/App.jsx` continues to work.

- [ ] **Step 1: Create the animated play renderer**

Create `src/play/AnimatedPlay.jsx` with this content:

```jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AGE_BANDS, profileForAge } from "./interactionProfiles.js";
import { motionStyle } from "./motionVocabulary.js";
import { tokenSpec } from "./tokenSystem.js";
import { TWO_ON_ONE_READ_PLAY } from "./plays/twoOnOneRead.js";

const TEAM_FILL = {
  home: "#0F4C8C",
  away: "#1A1A1A",
};

const VIEWS = {
  full: "0 0 200 85",
  "half-right": "104 0 96 85",
  "half-left": "0 0 96 85",
};

function RinkBackdrop() {
  return (
    <g>
      <rect x="2" y="2" width="196" height="81" rx="27" fill="#EEF5FB" stroke="#0B1A33" strokeWidth="1.4" />
      <rect x="99.2" y="2" width="1.6" height="81" fill="#D23A3A" />
      <rect x="74" y="2" width="2" height="81" fill="#2B6FD6" />
      <rect x="124" y="2" width="2" height="81" fill="#2B6FD6" />
      <rect x="11" y="9" width="0.7" height="67" fill="#D23A3A" />
      <rect x="188.3" y="9" width="0.7" height="67" fill="#D23A3A" />
      <circle cx="100" cy="42.5" r="13" fill="none" stroke="#D23A3A" strokeWidth="0.6" />
      <g fill="none" stroke="#D23A3A" strokeWidth="0.6">
        <circle cx="169" cy="22" r="13" />
        <circle cx="169" cy="63" r="13" />
        <circle cx="31" cy="22" r="13" />
        <circle cx="31" cy="63" r="13" />
      </g>
      <path d="M188.3,38 A6,6 0 0 0 188.3,47 Z" fill="#BCDcff" stroke="#D23A3A" strokeWidth="0.5" />
      <rect x="189" y="39" width="4" height="7" fill="none" stroke="#D23A3A" strokeWidth="1" />
      <path d="M11.7,38 A6,6 0 0 1 11.7,47 Z" fill="#BCDcff" stroke="#D23A3A" strokeWidth="0.5" />
      <rect x="7" y="39" width="4" height="7" fill="none" stroke="#D23A3A" strokeWidth="1" />
    </g>
  );
}

function RoutePath({ motion, index }) {
  const style = motionStyle(motion.kind);
  const [x1, y1] = motion.from;
  const [x2, y2] = motion.to;
  const mx = (x1 + x2) / 2;
  const my = Math.min(y1, y2) - 7;
  const marker = style.marker === "arrow" ? `url(#ap-arrow-${motion.kind})` : undefined;
  return (
    <g>
      <path
        d={`M${x1},${y1} Q ${mx},${my} ${x2},${y2}`}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.width}
        strokeDasharray={style.dash}
        markerEnd={marker}
        opacity={motion.kind === "blocked" ? 0.7 : 0.95}
      />
      {motion.label && (
        <text x={mx} y={my - 2 - index} textAnchor="middle" fontSize="3.1" fill="#0B1A33" fontWeight="800">
          {motion.label}
        </text>
      )}
    </g>
  );
}

function ActorToken({ actor, ageBand, isDecisionActor }) {
  const spec = tokenSpec({ actor, ageBand, isDecisionActor });
  const fill = TEAM_FILL[spec.team] || TEAM_FILL.home;
  const labelFill = spec.team === "home" ? "#FFFFFF" : "#FFFFFF";

  if (spec.role === "goalie") {
    return (
      <g>
        <rect x="-4.5" y="-5" width="9" height="10" rx="2.3" fill={fill} stroke="#FFFFFF" strokeWidth="0.8" />
        <text y="1.5" fontSize="3.4" fill={labelFill} fontWeight="900" textAnchor="middle">G</text>
      </g>
    );
  }

  if (spec.representation === "symbol") {
    if (spec.role === "defender") {
      return (
        <g stroke="#0B1A33" strokeWidth="1.2" strokeLinecap="round">
          <line x1="-3.4" y1="-3.4" x2="3.4" y2="3.4" />
          <line x1="-3.4" y1="3.4" x2="3.4" y2="-3.4" />
        </g>
      );
    }
    return <circle r={spec.role === "puckCarrier" ? 4.2 : 3.5} fill="none" stroke="#0B1A33" strokeWidth="1.2" />;
  }

  if (spec.representation === "figure") {
    return (
      <g>
        <ellipse rx="4.4" ry="5.4" fill={fill} stroke="#FFFFFF" strokeWidth="0.8" />
        <circle cy="-3.1" r="2.8" fill="#26344D" stroke="#FFFFFF" strokeWidth="0.55" />
        {isDecisionActor && <circle r="6.5" fill="none" stroke="#C9A24B" strokeWidth="0.9" strokeDasharray="2 1.5" />}
        <text y="2.7" fontSize="2.9" fill={labelFill} fontWeight="900" textAnchor="middle">{spec.interiorLabel}</text>
      </g>
    );
  }

  return (
    <g>
      <circle r={isDecisionActor ? 5.2 : 4.5} fill={fill} stroke="#FFFFFF" strokeWidth="0.75" />
      {isDecisionActor && <circle r="6.8" fill="none" stroke="#C9A24B" strokeWidth="0.9" strokeDasharray="2 1.5" />}
      {spec.role === "defender" && (
        <g stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round">
          <line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" />
          <line x1="-2.7" y1="2.7" x2="2.7" y2="-2.7" />
        </g>
      )}
      {spec.role !== "defender" && (
        <text y="1.4" fontSize="3.1" fill={labelFill} fontWeight="900" textAnchor="middle">{spec.interiorLabel}</text>
      )}
    </g>
  );
}

function NodeSummary({ node, profile, pickedOption, onReplay }) {
  if (!node.terminal) return null;
  return (
    <div>
      {profile.celebrate && pickedOption?.ok && <div style={{ fontSize: 24, marginBottom: 6 }}>Goal!</div>}
      <button onClick={onReplay} style={{ background: "#0B1A33", color: "#FFFFFF", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 800 }}>
        Replay
      </button>
    </div>
  );
}

export default function AnimatedPlay({ play, ageBand = "U11", onEvent }) {
  const profile = profileForAge(ageBand);
  const [nodeId, setNodeId] = useState(play.start);
  const [picked, setPicked] = useState(null);
  const [pickedOption, setPickedOption] = useState(null);
  const [entered, setEntered] = useState(false);
  const [showMotion, setShowMotion] = useState(false);
  const startedAtRef = useRef(Date.now());

  const actorMap = useMemo(() => Object.fromEntries(play.actors.map((a) => [a.id, a])), [play.actors]);
  const node = play.nodes[nodeId];

  useEffect(() => {
    setEntered(false);
    setShowMotion(false);
    startedAtRef.current = Date.now();
    const enterTimer = setTimeout(() => setEntered(true), 120);
    const motionTimer = setTimeout(() => setShowMotion(true), 680);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(motionTimer);
    };
  }, [nodeId, play.id, ageBand]);

  function choose(opt, index) {
    if (picked !== null || node.terminal) return;
    const ms = Date.now() - startedAtRef.current;
    setPicked(index);
    setPickedOption(opt);
    onEvent?.({ playId: play.id, nodeId, event: "answer", answerId: opt.id, ok: !!opt.ok, ms });
    setTimeout(() => {
      setNodeId(opt.next);
      setPicked(null);
    }, opt.ok ? 750 : 1050);
  }

  function replay() {
    setNodeId(play.start);
    setPicked(null);
    setPickedOption(null);
    onEvent?.({ playId: play.id, nodeId: play.start, event: "replay", ms: 0 });
  }

  const positions = (!entered && node.enter) ? node.enter : node.pos;
  const puck = node.puck;

  return (
    <div style={{ background: profile.bg, borderRadius: 12, padding: 12, border: "1px solid #E3E7EE" }}>
      <svg viewBox={VIEWS[play.view] || VIEWS.full} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          {["skate", "pass", "shot"].map((kind) => (
            <marker key={kind} id={`ap-arrow-${kind}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="#0B1A33" />
            </marker>
          ))}
          <filter id="ap-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="0.7" stdDeviation="0.7" floodColor="#0B1A33" floodOpacity="0.35" />
          </filter>
        </defs>
        <RinkBackdrop />
        {showMotion && (node.motions || []).map((motion, index) => <RoutePath key={`${motion.kind}-${index}`} motion={motion} index={index} />)}
        {(node.overlays || []).map((overlay, index) => {
          if (overlay.kind === "freeze") {
            return (
              <g key={`freeze-${index}`}>
                <circle cx={overlay.x} cy={overlay.y} r="6" fill="none" stroke="#C9A24B" strokeWidth="1.1" strokeDasharray="2 1.5" />
                <text x={overlay.x} y={overlay.y + 1.5} textAnchor="middle" fontSize="3.8" fill="#0B1A33" fontWeight="900">{overlay.label}</text>
              </g>
            );
          }
          if (overlay.kind === "target") {
            return <circle key={`target-${index}`} cx={overlay.x} cy={overlay.y} r={overlay.r || 5} fill="none" stroke="#C9A24B" strokeWidth="1.1" strokeDasharray="2 1.5" />;
          }
          return null;
        })}
        {play.actors.map((actor) => {
          const p = positions[actor.id];
          if (!p) return null;
          const isDecisionActor = node.decisionActor === actor.id;
          return (
            <g key={actor.id} transform={`translate(${p[0]},${p[1]})`} style={{ transition: "transform .65s cubic-bezier(.4,0,.2,1)" }} filter="url(#ap-shadow)">
              <ActorToken actor={actorMap[actor.id]} ageBand={ageBand} isDecisionActor={isDecisionActor} />
              {(isDecisionActor || ageBand === "U7" || ageBand === "U9") && (
                <text y="-8.5" textAnchor="middle" fontSize="3.2" fill="#0B1A33" fontWeight="900">{isDecisionActor ? "YOU" : actor.label}</text>
              )}
            </g>
          );
        })}
        {puck && (
          <g transform={`translate(${puck[0]},${puck[1]})`} style={{ transition: "transform .65s cubic-bezier(.4,0,.2,1)" }}>
            <circle r="2.4" fill="none" stroke="#C9A24B" strokeWidth="0.9" />
            <circle r="1.1" fill="#111111" />
          </g>
        )}
      </svg>

      <div style={{ padding: "8px 4px 2px" }}>
        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".5px", textTransform: "uppercase", color: profile.accent }}>
          {profile.label}{node.decisionActor ? ` - ${node.decisionActor === "F1" ? "you have the puck" : "support read"}` : ""}
        </div>
        <div style={{ fontSize: profile.big ? 19 : 15, fontWeight: 800, color: "#0B1A33", margin: "5px 0 10px", lineHeight: 1.35 }}>
          {node.q}
        </div>
        {node.terminal ? (
          <NodeSummary node={node} profile={profile} pickedOption={pickedOption} onReplay={replay} />
        ) : (
          node.ask.opts.map((opt, index) => {
            const isPicked = picked === index;
            const showOk = isPicked && opt.ok;
            const showBad = isPicked && !opt.ok;
            return (
              <button key={opt.id} onClick={() => choose(opt, index)} disabled={picked !== null}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontSize: profile.big ? 16 : 13.5,
                  padding: profile.big ? "13px 14px" : "10px 12px",
                  margin: "7px 0",
                  borderRadius: profile.big ? 14 : 10,
                  cursor: picked !== null ? "default" : "pointer",
                  border: `${showOk ? 2 : 1}px solid ${showOk ? "#0B6B3A" : showBad ? "#A32D2D" : "#CDD5E0"}`,
                  background: showOk ? "#F2FAF5" : showBad ? "#FDF3F1" : "#FFFFFF",
                  color: showOk ? "#155F38" : showBad ? "#7A2A1C" : "#2F3747",
                  fontWeight: showOk ? 800 : 600,
                }}>
                {opt.t}{showOk ? " - right read" : ""}
                {showBad && opt.no && <div style={{ fontSize: 12, marginTop: 5, color: "#7A2A1C", fontWeight: 500 }}>{opt.no}</div>}
              </button>
            );
          })
        )}
        <button onClick={() => onEvent?.({ playId: play.id, nodeId, event: "unclear", ms: Date.now() - startedAtRef.current })}
          style={{ marginTop: 8, background: "transparent", border: "1px dashed #8792A5", borderRadius: 8, color: "#4B5563", padding: "6px 8px", fontSize: 12, cursor: "pointer" }}>
          Mark this read unclear
        </button>
      </div>
    </div>
  );
}

export function AnimatedPlayTest() {
  const [age, setAge] = useState("U11");
  const [events, setEvents] = useState([]);
  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA", fontFamily: "Inter, system-ui, Arial, sans-serif", padding: "20px 16px 60px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "#C9A24B", fontWeight: 900 }}>Animated read kernel</div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#0B1A33" }}>{TWO_ON_ONE_READ_PLAY.title}</div>
          </div>
          <select value={age} onChange={(e) => setAge(e.target.value)} style={{ fontFamily: "inherit", fontSize: 14, padding: "8px 10px", borderRadius: 9, border: "1px solid #CDD5E0" }}>
            {AGE_BANDS.map((a) => <option key={a} value={a}>{profileForAge(a).label}</option>)}
          </select>
        </div>
        <AnimatedPlay play={TWO_ON_ONE_READ_PLAY} ageBand={age} onEvent={(event) => setEvents((prev) => [...prev.slice(-5), event])} />
        <div style={{ marginTop: 14, fontSize: 12, color: "#5B6575", lineHeight: 1.5 }}>
          One original RinkReads play object. The same coordinates render as friendly figures for U7/U9, trainer tokens for U11/U13, and playbook symbols for U15/U18.
        </div>
        <pre style={{ marginTop: 12, background: "#0B1A33", color: "#E5E7EB", borderRadius: 10, padding: 10, fontSize: 11, overflowX: "auto" }}>
          {JSON.stringify(events, null, 2)}
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace the old top-level RinkPlay module with a compatibility wrapper**

Replace the full contents of `src/RinkPlay.jsx` with:

```jsx
export { default as RinkPlay, AnimatedPlayTest as RinkPlayTest } from "./play/AnimatedPlay.jsx";
export { AGE_BANDS, INTERACTION_PROFILES } from "./play/interactionProfiles.js";
export { TWO_ON_ONE_READ_PLAY as SAMPLE_PLAY } from "./play/plays/twoOnOneRead.js";
```

- [ ] **Step 3: Verify the renderer compiles**

Run:

```powershell
npm run build
```

Expected: PASS. The Vite build must complete without JSX or import errors.

- [ ] **Step 4: Commit Task 3**

Run:

```powershell
git add src/play/AnimatedPlay.jsx src/RinkPlay.jsx
git commit -m "feat: render animated 2-on-1 read prototype" -m "Co-Authored-By: Codex <codex@openai.com>"
```

---

### Task 4: Prototype Telemetry

**Files:**
- Create: `src/play/telemetry.js`
- Create: `scripts/test-play-telemetry.mjs`
- Modify: `src/play/AnimatedPlay.jsx`

**Interfaces:**
- Consumes:
  - `AnimatedPlay` `onEvent` callback.
- Produces:
  - `ANIMATED_PLAY_EVENT_KEY`
  - `logAnimatedPlayEvent(event, storage = globalThis.localStorage)`
  - `readAnimatedPlayEvents(storage = globalThis.localStorage)`
  - `summarizeAnimatedPlayEvents(playId, storage = globalThis.localStorage)`

- [ ] **Step 1: Write telemetry tests**

Create `scripts/test-play-telemetry.mjs` with this content:

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATED_PLAY_EVENT_KEY, logAnimatedPlayEvent, readAnimatedPlayEvents, summarizeAnimatedPlayEvents } from "../src/play/telemetry.js";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

describe("animated play telemetry", () => {
  it("logs bounded events and summarizes read behavior", () => {
    const storage = fakeStorage();
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "answer", answerId: "pass", ok: true, ms: 1200 }, storage);
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "answer", answerId: "shoot", ok: false, ms: 900 }, storage);
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "replay", ms: 0 }, storage);
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "unclear", ms: 500 }, storage);

    const events = readAnimatedPlayEvents(storage);
    assert.equal(events.length, 4);
    assert.equal(events[0].source, "animated-play-v1");
    assert.ok(storage.getItem(ANIMATED_PLAY_EVENT_KEY).includes("answer"));

    const summary = summarizeAnimatedPlayEvents("p1", storage);
    assert.equal(summary.answers, 2);
    assert.equal(summary.correct, 1);
    assert.equal(summary.replays, 1);
    assert.equal(summary.unclear, 1);
    assert.equal(summary.mostCommonWrongAnswer, "shoot");
  });
});
```

- [ ] **Step 2: Run the failing telemetry test**

Run:

```powershell
npm run test:play-telemetry
```

Expected: FAIL because `src/play/telemetry.js` does not exist.

- [ ] **Step 3: Create telemetry module**

Create `src/play/telemetry.js` with this content:

```js
export const ANIMATED_PLAY_EVENT_KEY = "rinkreads_animated_play_events_v1";
const MAX_EVENTS = 200;

function nowIso() {
  return new Date().toISOString();
}

function safeParse(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readAnimatedPlayEvents(storage = globalThis.localStorage) {
  if (!storage) return [];
  return safeParse(storage.getItem(ANIMATED_PLAY_EVENT_KEY));
}

export function logAnimatedPlayEvent(event, storage = globalThis.localStorage) {
  if (!storage || !event || !event.playId || !event.event) return null;
  const next = {
    source: "animated-play-v1",
    at: nowIso(),
    playId: event.playId,
    nodeId: event.nodeId || "",
    event: event.event,
    answerId: event.answerId || "",
    ok: typeof event.ok === "boolean" ? event.ok : null,
    ms: typeof event.ms === "number" ? Math.max(0, Math.round(event.ms)) : null,
  };
  const events = readAnimatedPlayEvents(storage);
  const bounded = [...events, next].slice(-MAX_EVENTS);
  storage.setItem(ANIMATED_PLAY_EVENT_KEY, JSON.stringify(bounded));
  return next;
}

export function summarizeAnimatedPlayEvents(playId, storage = globalThis.localStorage) {
  const events = readAnimatedPlayEvents(storage).filter((event) => event.playId === playId);
  const answerEvents = events.filter((event) => event.event === "answer");
  const wrongCounts = new Map();
  for (const event of answerEvents) {
    if (event.ok === false && event.answerId) {
      wrongCounts.set(event.answerId, (wrongCounts.get(event.answerId) || 0) + 1);
    }
  }
  const mostCommonWrongAnswer = [...wrongCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  return {
    total: events.length,
    answers: answerEvents.length,
    correct: answerEvents.filter((event) => event.ok === true).length,
    replays: events.filter((event) => event.event === "replay").length,
    unclear: events.filter((event) => event.event === "unclear").length,
    mostCommonWrongAnswer,
  };
}
```

- [ ] **Step 4: Wire telemetry into the playtest harness**

In `src/play/AnimatedPlay.jsx`, add this import:

```jsx
import { logAnimatedPlayEvent, summarizeAnimatedPlayEvents } from "./telemetry.js";
```

Inside `AnimatedPlayTest`, replace the `onEvent` prop on `AnimatedPlay` with this exact callback:

```jsx
onEvent={(event) => {
  const logged = logAnimatedPlayEvent(event);
  setEvents((prev) => [...prev.slice(-5), logged || event]);
}}
```

Below the explanatory text and above the `<pre>`, add this summary block:

```jsx
<div style={{ marginTop: 12, background: "#FFFFFF", border: "1px solid #DDE3EC", borderRadius: 10, padding: 10, fontSize: 12, color: "#243044" }}>
  <strong>Prototype telemetry:</strong> {JSON.stringify(summarizeAnimatedPlayEvents(TWO_ON_ONE_READ_PLAY.id))}
</div>
```

- [ ] **Step 5: Run tests and build**

Run:

```powershell
npm run test:play-telemetry
npm run build
```

Expected: both commands PASS.

- [ ] **Step 6: Commit Task 4**

Run:

```powershell
git add scripts/test-play-telemetry.mjs src/play/telemetry.js src/play/AnimatedPlay.jsx
git commit -m "feat: track animated play prototype telemetry" -m "Co-Authored-By: Codex <codex@openai.com>"
```

---

### Task 5: Source Note And Manual Playtest Gate

**Files:**
- Create: `docs/library/odd-man-reads.md`
- Modify: `docs/library/INDEX.md`
- Create: `docs/manual-playtest/2026-07-08-two-on-one-animated-read.md`

**Interfaces:**
- Consumes:
  - `TWO_ON_ONE_READ_PLAY.sourceRef.note`
- Produces:
  - A cited source note matching the play object's `sourceRef.note`.
  - A manual playtest checklist for the prototype.

- [ ] **Step 1: Create the odd-man reads source note**

Create `docs/library/odd-man-reads.md` with this content:

```markdown
# Odd-Man Reads

**Domain:** Offensive Play
**Anchor:** Hockey Sense
**Ledger node ids:** odd-man-reads, off-puck-support-offense, decision-making

## Definition

An odd-man read is the puck carrier's decision when the attacking team has a temporary numbers advantage. The first read is whether the lone defender protects the shot lane, the pass lane, or neither. The supporting attacker reads the same cue and stays available in open ice.

## Objective Read

For the v1 2-on-1 animated read, the correct answer is the cross-ice support pass when the defender steps up into the puck carrier's shooting lane and cannot also cover the weak-side support player.

The wrong answers are objective in this scene:

- shooting through the defender is lower percentage because the defender has closed the shot lane,
- deking into the defender gives away the numbers advantage,
- waiting lets the defender and goalie recover.

## Age Calibration

- **U7:** identify the open teammate after the defender moves toward the puck.
- **U9:** tap the teammate who is open away from the defender.
- **U11:** choose the pass before the defender and goalie recover.
- **U13:** read defender commitment and goalie movement as one sequence.

## Authoring Notes

- The defender's motion must be visible before the freeze.
- The open support player must be separated from the defender by shape and space, not only color.
- The puck carrier must be labeled `YOU`.
- The correct answer must stay clean if the scene is mirrored.
- If both shot and pass are defensible, the scene is not a single-answer Stream-1 read.

## Citations

- USA Hockey Small-Area Games: https://www.usahockey.com/smallareagames
- USA Hockey Practice Plans: https://www.usahockey.com/practiceplans
- Internal source note: `docs/library/off-puck-support-offense.md`
```

- [ ] **Step 2: Update the library index**

In `docs/library/INDEX.md`, add this row to the concept list:

```markdown
| odd-man-reads | `odd-man-reads.md` | 2-on-1 / numbers-advantage read; defender commitment opens or closes pass and shot lanes. |
```

- [ ] **Step 3: Create the manual playtest checklist**

Create `docs/manual-playtest/2026-07-08-two-on-one-animated-read.md` with this content:

```markdown
# Manual Playtest: 2-on-1 Animated Read

**Route:** `/#playtest`
**Play:** `play_2v1_backdoor_read_u11_v1`
**Gate:** A new animated play template does not enter the main quiz flow until this checklist passes on desktop and mobile.

## Setup

1. Run `npm run dev`.
2. Open the local Vite URL.
3. Navigate to `/#playtest`.
4. Test U7, U11, and U18 from the age selector.

## Desktop Checklist

- [ ] The defender motion is visible before the first freeze.
- [ ] The decision actor is clearly marked `YOU`.
- [ ] The puck is visible and does not hide the `YOU` marker.
- [ ] The pass, shot, and blocked lane patterns are distinguishable without relying on color.
- [ ] The wrong answer explanations appear after the wrong choice.
- [ ] The correct choice advances to the next read.
- [ ] The terminal goal state appears after the second correct read.
- [ ] Replay returns to the first node.
- [ ] The unclear-read button logs an event without moving the play.

## Mobile Checklist

- [ ] All answer buttons fit without horizontal scrolling.
- [ ] Tokens are readable at phone width.
- [ ] The rink does not clip the open support player or goalie.
- [ ] The replay button is easy to tap.
- [ ] The telemetry summary still updates after choices.

## Pass Standard

The prototype passes this gate only when every checked item above passes. Any failed item gets a short note here and is fixed before the play enters the main session flow.
```

- [ ] **Step 4: Verify sourceRef path and docs**

Run:

```powershell
Test-Path -LiteralPath 'C:\Users\mtsli\IceIQ\docs\library\odd-man-reads.md'
Test-Path -LiteralPath 'C:\Users\mtsli\IceIQ\docs\manual-playtest\2026-07-08-two-on-one-animated-read.md'
```

Expected output:

```text
True
True
```

- [ ] **Step 5: Commit Task 5**

Run:

```powershell
git add docs/library/odd-man-reads.md docs/library/INDEX.md docs/manual-playtest/2026-07-08-two-on-one-animated-read.md
git commit -m "docs: add animated read source and playtest gate" -m "Co-Authored-By: Codex <codex@openai.com>"
```

---

### Task 6: End-To-End Verification And Handoff

**Files:**
- Modify only if verification reveals a failing item:
  - `src/play/AnimatedPlay.jsx`
  - `src/play/plays/twoOnOneRead.js`
  - `docs/manual-playtest/2026-07-08-two-on-one-animated-read.md`

**Interfaces:**
- Consumes:
  - all modules from Tasks 1-5.
- Produces:
  - verified `#playtest` prototype with documented pass/fail status.

- [ ] **Step 1: Run the pure tests**

Run:

```powershell
npm run test:play-tokens
npm run test:animated-play
npm run test:play-telemetry
```

Expected: all PASS.

- [ ] **Step 2: Run the production build**

Run:

```powershell
npm run build
```

Expected: PASS with Vite completing the production bundle.

- [ ] **Step 3: Start the dev server**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite reports a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 4: Manually verify the route**

Open:

```text
http://127.0.0.1:5173/#playtest
```

Check:

```text
U7: friendly figure tokens, large answer buttons, no color-only meaning.
U11: numbered tokens, clear YOU label, defender step-up visible.
U18: playbook symbols, X/circle distinction visible, route patterns visible.
Correct path: pass to F2 -> quick shot -> terminal goal.
Wrong path: each wrong answer routes to a teachable terminal outcome.
Replay: returns to the first read.
Telemetry: JSON event list and summary update after answer, replay, and unclear-read actions.
```

- [ ] **Step 5: Mark manual playtest status**

Update `docs/manual-playtest/2026-07-08-two-on-one-animated-read.md` by checking the items that pass. If an item fails, add one line under the relevant checklist item:

```markdown
  - Fix note: describe the visible failure and the file that needs the fix.
```

- [ ] **Step 6: Commit verification updates**

If Task 6 changed code or docs, run:

```powershell
git add src/play/AnimatedPlay.jsx src/play/plays/twoOnOneRead.js docs/manual-playtest/2026-07-08-two-on-one-animated-read.md
git commit -m "test: verify animated 2-on-1 play prototype" -m "Co-Authored-By: Codex <codex@openai.com>"
```

If Task 6 produced no file changes, do not create an empty commit.

---

## Self-Review

**Spec coverage:** This plan covers the approved v1 scope: original tokens, motion vocabulary, one source-backed 2-on-1 animated read, freeze-point questions, reveal/replay behavior, telemetry, and manual playtest gate. It intentionally excludes the full generator and main quiz integration until the kernel proves clear.

**Placeholder scan:** No red-flag placeholder language remains. Every code-creation step includes exact file content.

**Type consistency:** The play object uses `type: "animated-play"`, `sourceRef.note`, `nodes`, `start`, `actors`, `motions`, and `ask.opts` consistently across validator, tests, and renderer. `AnimatedPlay` accepts `play`, `ageBand`, and `onEvent`; the compatibility wrapper preserves the existing `RinkPlayTest` import used by `src/App.jsx`.
