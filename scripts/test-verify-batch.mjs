import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A structurally valid selection seed (verified to pass lintScenario).
function baseSeed(id) {
  return {
    id, type: "scenario", level: "U9 / Novice", levels: ["U9 / Novice"],
    themes: ["puck-support"], cat: "Offensive Play", difficulty: 1,
    stage: { view: "right", zone: "off-zone" },
    actors: [
      { id: "you", kind: "player", x: 0.80, y: 0.50, tag: "YOU" },
      { id: "puck", kind: "puck", x: 0.802, y: 0.498 },
      { id: "t1", kind: "teammate", x: 0.90, y: 0.30 },
      { id: "t2", kind: "teammate", x: 0.90, y: 0.74 },
      { id: "x1", kind: "defender", x: 0.86, y: 0.64 },
      { id: "g", kind: "goalie", x: 0.918, y: 0.50 }
    ],
    interaction: { kind: "selection", from: ["t1", "t2"], order: "any", prompt: "You have the puck in the offensive zone. Tap the open teammate who can support you." },
    correct: { kind: "selection", ids: ["t1"] },
    feedback: { right: "The open-side teammate has a clean lane.", wrong: "That teammate is covered by a defender in the lane." },
    tip: "Support is open ice and a clean lane.",
    why: "Support gives the carrier an option the defense cannot take away."
  };
}

function run(dir) {
  try {
    const out = execFileSync("node", ["scripts/verify-batch.mjs", "--dir", dir], { stdio: "pipe" });
    return { code: 0, out: out.toString() };
  } catch (e) {
    return { code: e.status, out: (e.stdout || "").toString() + (e.stderr || "").toString() };
  }
}

test("verify-batch passes a lint-clean seed that carries a sourceRef", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr-vb-ok-"));
  const seed = baseSeed("vb_ok_v1");
  seed.sourceRef = { note: "off-puck-support-offense", cite: "Hockey Canada LTPD" };
  writeFileSync(join(dir, "vb_ok_v1.json"), JSON.stringify(seed));
  const r = run(dir);
  assert.equal(r.code, 0, r.out);
});

test("verify-batch fails a lint-clean seed that is MISSING a sourceRef", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr-vb-bad-"));
  const seed = baseSeed("vb_bad_v1"); // no sourceRef
  writeFileSync(join(dir, "vb_bad_v1.json"), JSON.stringify(seed));
  const r = run(dir);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /missing sourceRef/);
});
