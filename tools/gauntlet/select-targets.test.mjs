#!/usr/bin/env node
// Unit tests for target selection. Uses an inline mini-ledger. Run: node tools/gauntlet/select-targets.test.mjs
import { selectTargets } from "./select-targets.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

// Mini-ledger: targetFor uses DEPTH_TARGETS {I:3,D:5,M:7,R:5} x (anchor?2:1).
const ledger = {
  meta: { anchorMultiplier: 2 },
  concepts: [
    { id: "decision-making", anchor: true },
    { id: "passing", anchor: false },
  ],
  nodes: [
    { id: "u11.decision-making", ageId: "U11", conceptId: "decision-making", depth: "D" }, // anchor D -> 5*2=10
    { id: "u11.passing", ageId: "U11", conceptId: "passing", depth: "M" },                 // M -> 7
    { id: "u9.passing", ageId: "U9", conceptId: "passing", depth: "I" },                   // I -> 3
  ],
};

// no coverage yet -> all three under target, anchor first
{
  const r = selectTargets(ledger, {});
  ok("returns all under-target", r.length === 3);
  ok("anchor node first", r[0].node.id === "u11.decision-making");
  ok("anchor target is 10", r[0].want === 10 && r[0].gap === 10);
}

// fully-covered node drops out
{
  const r = selectTargets(ledger, { "u11.passing": 7 });
  ok("covered node excluded", !r.some((x) => x.node.id === "u11.passing"));
  ok("two remain", r.length === 2);
}

// among non-anchors, bigger gap first (passing M gap7 before passing I gap3)
{
  const r = selectTargets(ledger, { "u11.decision-making": 10 }); // remove anchor
  ok("non-anchor bigger gap first", r[0].node.id === "u11.passing" && r[1].node.id === "u9.passing");
}

// max caps the list
{
  const r = selectTargets(ledger, {}, { max: 1 });
  ok("max=1 returns one", r.length === 1 && r[0].node.id === "u11.decision-making");
}

// ages filter restricts to the given age bands
{
  const r = selectTargets(ledger, {}, { ages: ["U9"] });
  ok("ages filter keeps only U9", r.length === 1 && r.every((x) => x.node.ageId === "U9"));
  const r2 = selectTargets(ledger, {}, { ages: ["U11"] });
  ok("ages U11 keeps only U11 nodes", r2.length === 2 && r2.every((x) => x.node.ageId === "U11"));
  const r3 = selectTargets(ledger, {}, { ages: [] });
  ok("empty ages = no filter (all under-target)", r3.length === 3);
}

// partial coverage reduces gap
{
  const r = selectTargets(ledger, { "u11.decision-making": 8 });
  const dm = r.find((x) => x.node.id === "u11.decision-making");
  ok("partial coverage gap = want-have", dm.have === 8 && dm.gap === 2);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
