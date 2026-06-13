import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("brief-to-seed carries sourceRef into the compiled seed", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr-sref-"));
  const brief = {
    id: "test_sref_v1",
    nodeId: "u9.off-puck-support-offense",
    levels: ["U9 / Novice"],
    cat: "Offensive Play",
    themes: ["puck-support"],
    difficulty: 1,
    primitive: "selection",
    view: "right",
    zone: "off-zone",
    sourceRef: { note: "off-puck-support-offense", cite: "Hockey Canada LTPD" },
    actors: [
      { id: "you", kind: "player", x: 0.80, y: 0.50, tag: "YOU" },
      { id: "puck", kind: "puck", with: "you" },
      { id: "t1", kind: "teammate", x: 0.90, y: 0.30 },
      { id: "t2", kind: "teammate", x: 0.90, y: 0.74 },
      { id: "x1", kind: "defender", x: 0.86, y: 0.64 }
    ],
    from: ["t1", "t2"],
    correct: { ids: ["t1"] },
    prompt: "You have the puck in the offensive zone. Tap the open teammate who is in a good spot to support you.",
    feedback: {
      right: "The teammate up the open side has clear ice and a clean passing lane. That is real support.",
      wrong: "That teammate is covered. A defender sits in the lane, so closest is not the same as open."
    },
    tip: "Support means open ice and a clean lane, not just the nearest jersey.",
    why: "Good off-puck support gives the carrier a passing option the defense cannot take away."
  };
  const briefPath = join(dir, "brief.json");
  writeFileSync(briefPath, JSON.stringify(brief));
  execFileSync("node", ["scripts/brief-to-seed.mjs", briefPath, "--out", dir], { stdio: "pipe" });
  const seed = JSON.parse(readFileSync(join(dir, "test_sref_v1.json"), "utf8"));
  assert.deepEqual(seed.sourceRef, { note: "off-puck-support-offense", cite: "Hockey Canada LTPD" });
});
