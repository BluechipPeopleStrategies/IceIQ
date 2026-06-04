#!/usr/bin/env node
// Run: node tools/gauntlet/ascii-rink.test.mjs
import { asciiRink } from "./ascii-rink.mjs";
import { mockScenario } from "./visual-scenario.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const s = mockScenario({ id: "u9.passing", ageId: "U9", conceptId: "passing" }, "id1");
const art = asciiRink(s);

ok("returns a string", typeof art === "string" && art.length > 0);
ok("shows the player token Y", art.includes("Y"));
ok("shows a teammate token T", art.includes("T"));
ok("shows a defender token D", art.includes("D"));
ok("shows the goalie token G", art.includes("G"));
ok("has a legend", art.toLowerCase().includes("you") && art.toLowerCase().includes("net"));
// goalie at x=0.92 sits in the right half of the grid
{ const lines = art.split("\n").filter((l) => l.startsWith("|"));
  const gLine = lines.find((l) => l.includes("G"));
  ok("goalie drawn on the right half", gLine && gLine.indexOf("G") > Math.floor(gLine.length / 2)); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
