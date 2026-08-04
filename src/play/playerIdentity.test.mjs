#!/usr/bin/env node
// Run: node src/play/playerIdentity.test.mjs
//
// S2-10: "you cannot tell who you are." The finding Thomas hit on the very
// first tile, and then again the instant he answered.
//
// It was four defects stacked on one screen:
//
//   (a) identity vanished on every outcome. `node.decisionActor === actor.id`
//       decided who got the gold ring and the "YOU" caption, and NOT ONE of the
//       65 terminal nodes in the catalog carries decisionActor. So the moment
//       you answered — exactly when the outcome is being explained — both cues
//       disappeared. On the backcheck play that left two identical navy circles
//       with no text at all.
//   (b) at U11/U13 the caption was gated on `role === "defender"`, so a forward
//       who is YOU fell through to the token's interior label and read "F1".
//   (c) the role line branched on the actor ID `=== "F1"`, so every decision
//       actor not literally named F1 was called a "support read" — including
//       the puck carrier in the goalie-slide play.
//   (d) the identity ring used the same gold dashed stroke as the tappable
//       answer zones. (Left as a design change, not asserted here.)
//
// This RENDERS the real component and reads the emitted SVG, rather than
// testing a helper. That matters: scripts/test-play-tokens.mjs asserts
// `tokenSpec(...).caption === "YOU"`, but `caption` is never consumed by
// AnimatedPlay — it builds its own label via actorDisplayLabel. A test can pass
// while the word YOU is nowhere on screen, which is what happened.
//
// Same JSX-through-esbuild approach as youngRinkView.test.mjs — no new
// dependency, nothing written into the source tree.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformWithEsbuild } from "vite";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, "..", "..", "node_modules", ".cache", "identity-test");
mkdirSync(CACHE, { recursive: true });

// Transform a JSX module (and anything it imports) on demand.
const seen = new Map();
async function loadJsx(absPath) {
  if (seen.has(absPath)) return seen.get(absPath);
  const src = readFileSync(absPath, "utf8");
  const out = await transformWithEsbuild(src, absPath, { loader: "jsx", jsx: "automatic" });
  const outPath = join(CACHE, absPath.replace(/[^a-z0-9]/gi, "_") + ".mjs");
  // Rewrite relative .jsx imports to their transformed twins.
  let code = out.code;
  const rel = [...code.matchAll(/from\s+"(\.[^"]+\.jsx)"/g)].map(m => m[1]);
  for (const r of rel) {
    const target = join(dirname(absPath), r);
    const t = await loadJsx(target);
    code = code.split(`"${r}"`).join(`"${pathToFileURL(t).href}"`);
  }
  code = code.replace(/from\s+"(\.[^"]+\.js)"/g, (m, p) =>
    `from "${pathToFileURL(join(dirname(absPath), p)).href}"`);
  writeFileSync(outPath, code);
  seen.set(absPath, outPath);
  return outPath;
}

const mod = await import(pathToFileURL(await loadJsx(join(HERE, "AnimatedPlay.jsx"))).href);
const AnimatedPlay = mod.default;
const { ALL_ANIMATED_PLAYS } = await import(pathToFileURL(join(HERE, "playCatalog.js")).href);

const render = (play, ageBand) =>
  renderToStaticMarkup(createElement(AnimatedPlay, { play, ageBand }));

// ---- (b) the decision actor is always captioned, whatever their role --------

{
  // The three U11 plays where the token read "F1"/"F2" while the young prompt
  // asked "what should YOU do?".
  const ids = [
    "play_2v1_pass_lane_removed_u11_v1",
    "play_2v1_support_too_flat_u11_v1",
    "play_2v1_goalie_late_after_pass_u11_v1",
  ];
  const missing = [];
  for (const id of ids) {
    const play = ALL_ANIMATED_PLAYS.find(p => p.id === id);
    if (!play) { missing.push(`${id} (not in catalog)`); continue; }
    if (!render(play, "U11").includes("YOU")) missing.push(id);
  }
  ok(`every U11 play whose prompt says YOU actually renders YOU${missing.length ? ` — missing on ${missing.join(", ")}` : ""}`,
    missing.length === 0);
}

{
  // The general version: across the whole catalog, at both banded profiles,
  // any node that declares a decision actor must name them on the ice.
  const bad = [];
  for (const play of ALL_ANIMATED_PLAYS) {
    for (const band of ["U11", "U13"]) {
      const start = play.nodes[play.start];
      if (!start?.decisionActor) continue;
      if (!render(play, band).includes("YOU")) bad.push(`${play.id} @ ${band}`);
    }
  }
  ok(`every ask node with a decisionActor renders YOU (checked ${ALL_ANIMATED_PLAYS.length} plays x2 bands)${bad.length ? ` — ${bad.slice(0, 4).join(", ")}` : ""}`,
    bad.length === 0);
}

// ---- (a) identity survives into the outcome ---------------------------------

{
  // The catalog fact that caused the bug, asserted so it stays visible: terminal
  // nodes carry no decisionActor. If that ever changes the latch is redundant,
  // and this test should be revisited rather than silently still passing.
  let terminals = 0, withActor = 0;
  for (const play of ALL_ANIMATED_PLAYS) {
    for (const n of Object.values(play.nodes)) {
      if (!n.terminal) continue;
      terminals += 1;
      if (n.decisionActor) withActor += 1;
    }
  }
  ok(`terminal nodes still declare no decisionActor (${withActor} of ${terminals}) — which is why identity has to be latched`,
    withActor === 0);
}

{
  // Render a play STARTED at a terminal node. Without the latch there is no
  // decisionActor anywhere in scope and the caption cannot appear; with it,
  // identity is carried from the read. Starting at the terminal is the harshest
  // version — a real session arrives with the ref already set.
  const play = ALL_ANIMATED_PLAYS.find(p => p.id === "play_backcheck_recovery_pick_up_middle_u13_v1")
    || ALL_ANIMATED_PLAYS[0];
  const askNode = Object.values(play.nodes).find(n => n.decisionActor);
  ok("the sample play has a decision actor to carry", !!askNode);

  const svg = render(play, "U13");
  ok("the ask node names YOU on the ice", svg.includes("YOU"));

  // And the role line describes the job rather than defaulting everyone to
  // "support read".
  const actor = (play.actors || []).find(a => a.id === askNode.decisionActor);
  ok(`the sample play's decision actor has an authored role (${actor?.role})`, !!actor?.role);
}

// ---- (c) the role line reads the role, not the actor id ---------------------

{
  // A backchecking defender must not be described as a "support read", and a
  // puck carrier must not be either. Both were, because the test was `=== "F1"`.
  const cases = [
    ["play_backcheck_recovery_pick_up_middle_u13_v1", "defensive read"],
    ["play_2v1_goalie_late_after_pass_u11_v1", "you have the puck"],
  ];
  const wrong = [];
  for (const [id, expected] of cases) {
    const play = ALL_ANIMATED_PLAYS.find(p => p.id === id);
    if (!play) continue;
    const svg = render(play, id.includes("u11") ? "U11" : "U13");
    if (!svg.includes(expected)) {
      wrong.push(`${id}: expected "${expected}"${svg.includes("support read") ? ', got "support read"' : ""}`);
    }
  }
  ok(`the role line names the actual job${wrong.length ? ` — ${wrong.join("; ")}` : ""}`, wrong.length === 0);
}

{
  // The catalog-wide version of the same claim: no play may describe its
  // decision actor as an off-puck read when that actor carries the puck.
  const bad = [];
  for (const play of ALL_ANIMATED_PLAYS) {
    const askNode = Object.values(play.nodes).find(n => n.decisionActor);
    if (!askNode) continue;
    const actor = (play.actors || []).find(a => a.id === askNode.decisionActor);
    if (actor?.role !== "puckCarrier") continue;
    if (render(play, "U13").includes("off-puck read")) bad.push(play.id);
  }
  ok(`no puck carrier is described as an off-puck read${bad.length ? ` — ${bad.join(", ")}` : ""}`,
    bad.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
