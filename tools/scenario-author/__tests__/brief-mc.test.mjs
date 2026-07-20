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
