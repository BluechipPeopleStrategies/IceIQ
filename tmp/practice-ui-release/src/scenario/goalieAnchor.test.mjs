#!/usr/bin/env node
// Run: node src/scenario/goalieAnchor.test.mjs
//
// Regression lock for decision 4 of docs/manual-playtest/2026-08-03-decisions-round3.md.
//
// `u9_dz_positioning_v1` shipped with its goalie at (0.05, 0.27) — 1.0 m BEHIND
// its own goal line and 6.9 m off the net's center. Two validators already
// flagged it and it shipped anyway, because both were warnings and
// scripts/qa-sweep.mjs exited 0 whenever nothing was an error. So the fix is in
// two parts and this file locks both:
//
//   4a. goalieAnchoredToOwnNet is an ERROR, narrow enough to only catch
//       positions that are never right (a goalie legitimately leaves the crease
//       to challenge, so goalieInCrease stays a warning).
//   4b. qa-sweep records its accepted warnings in scripts/qa-warn-baseline.json
//       and exits non-zero on anything above it.

import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runHockeyValidators } from "./validators.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

// A minimal defensive-zone frame. Only the goalie moves between cases.
const frame = (goalie) => ({
  id: "test",
  stage: { view: "left", zone: "def-zone" },
  actors: [
    { id: "g", kind: "goalie", ...goalie },
    { id: "you", kind: "teammate", x: 0.19, y: 0.5, tag: "" },
    { id: "check", kind: "opponent", x: 0.115, y: 0.48 },
    { id: "p", kind: "puck", x: 0.30, y: 0.55 },
  ],
});

const errsFor = (goalie) =>
  runHockeyValidators(frame(goalie)).errs.filter(e => /goalie "g"/.test(e));

// ---- 4a: the rule catches what actually shipped -----------------------------

{
  const errs = errsFor({ x: 0.05, y: 0.27 });
  ok("the exact shipped position (0.05, 0.27) is now an ERROR, not a warning", errs.length > 0);
  ok("the error says how far behind the goal line it is",
    errs.some(e => /behind its own goal line/.test(e)));
}

ok("a goalie 1.0 m behind its own goal line errors",
  errsFor({ x: 0.05, y: 0.5 }).some(e => /behind its own goal line/.test(e)));

ok("a goalie 6.9 m off the net's center line errors",
  errsFor({ x: 0.079, y: 0.27 }).some(e => /off the net's center line/.test(e)));

// ---- 4a: and stays narrow ---------------------------------------------------

ok("the current, corrected u9 position is clean", errsFor({ x: 0.079, y: 0.5 }).length === 0);

ok("a goalie out challenging at the top of the crease is clean (that is a real choice)",
  errsFor({ x: 0.12, y: 0.5 }).length === 0);

ok("a goalie shaded 2 m to a post is clean — only >3 m off center errors",
  errsFor({ x: 0.079, y: 0.567 }).length === 0);

ok("a goalie 0.5 m behind the goal line is clean — the threshold is 0.7 m",
  errsFor({ x: 0.0584, y: 0.5 }).length === 0);

{
  // A placeable goalie starts off-position on purpose; its net position is the
  // answer. Same carve-out goalieInCrease already makes.
  const scn = frame({ x: 0.05, y: 0.27 });
  scn.interaction = { kind: "place", items: ["g"] };
  const errs = runHockeyValidators(scn).errs.filter(e => /goalie "g"/.test(e));
  ok("a placeable goalie is skipped — its position is the answer, not the start", errs.length === 0);
}

// ---- 4b: warnings actually gate now -----------------------------------------

const baseline = JSON.parse(readFileSync(new URL("../../scripts/qa-warn-baseline.json", import.meta.url), "utf8"));

// The baseline started at 8 accepted warnings and is now EMPTY, because all
// eight were resolved — five by fixing the seed and three by fixing validator
// rules that were firing on boards they did not apply to. An empty baseline is
// the goal state, not a broken file. This assertion used to require a non-empty
// baseline and failed the moment the work succeeded, which is the wrong shape
// for a ratchet: it should permit zero and forbid growth.
ok("the warning baseline is a valid record (empty is the goal, not a failure)",
  baseline && typeof baseline === "object" && !Array.isArray(baseline));

ok("every baselined signature has its numbers normalized out, so a nudged coordinate is not a new warning",
  Object.values(baseline).flat().every(s => !/\d/.test(s.replace(/#/g, ""))));

{
  // The real gate: run the sweep for real and read its exit code.
  const run = (args) => {
    try {
      execFileSync(process.execPath, ["scripts/qa-sweep.mjs", ...args], { cwd: ROOT, stdio: "pipe" });
      return 0;
    } catch (e) { return e.status ?? 1; }
  };
  ok("qa-sweep exits 0 on a clean catalog with an empty baseline", run(["--quiet"]) === 0);

  // Proving the gate bites can no longer be done by deleting a baseline entry —
  // there are none left to delete. So plant a seed that genuinely warns, and
  // confirm the sweep fails on it. Removed in `finally`, so a crash here cannot
  // leave a junk seed in the catalog.
  const planted = fileURLToPath(new URL("./seeds/__gate_probe_tmp.json", import.meta.url));
  const probe = {
    id: "__gate_probe_tmp",
    type: "scenario",
    level: "U13 / Peewee",
    levels: ["U13 / Peewee"],
    // Outside THEME_VOCAB on purpose: a small, unambiguous warning that does not
    // depend on geometry, so this proves the GATE rather than re-testing a rule.
    themes: ["not-a-real-theme"],
    cat: "Breakout",
    difficulty: 3,
    stage: { view: "left", zone: "def-zone" },
    actors: [
      { id: "you", kind: "player", x: 0.30, y: 0.50, tag: "" },
      { id: "g", kind: "goalie", x: 0.079, y: 0.50, tag: "" },
      { id: "puck", kind: "puck", x: 0.30, y: 0.50 },
    ],
    interaction: { kind: "point", prompt: "Probe seed — deleted by the test that wrote it." },
  };
  try {
    writeFileSync(planted, JSON.stringify(probe, null, 2) + "\n");
    ok("qa-sweep exits non-zero when a warning appears above the baseline", run(["--quiet"]) === 1);
  } finally {
    rmSync(planted, { force: true });
  }
  ok("the planted probe seed is gone and the catalog is clean again", run(["--quiet"]) === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
