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

import { readFileSync, writeFileSync } from "node:fs";
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

ok("the warning baseline is recorded, not empty", Object.keys(baseline).length > 0);

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
  ok("qa-sweep exits 0 while every warning is baselined", run(["--quiet"]) === 0);

  // The real proof: drop one seed from the baseline on disk and confirm the
  // sweep now FAILS. Restored in finally, so a crash here can't leave the
  // repo's baseline short an entry.
  const path = new URL("../../scripts/qa-warn-baseline.json", import.meta.url);
  const original = readFileSync(path, "utf8");
  try {
    const trimmed = JSON.parse(original);
    delete trimmed[Object.keys(trimmed)[0]];
    writeFileSync(path, JSON.stringify(trimmed, null, 2) + "\n");
    ok("qa-sweep exits non-zero when a warning appears above the baseline", run(["--quiet"]) === 1);
  } finally {
    writeFileSync(path, original);
  }
  ok("the baseline file is restored exactly", readFileSync(path, "utf8") === original);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
