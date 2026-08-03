import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

// App.jsx can't be imported directly under plain node --test (JSX, no
// transform in this runner) -- same constraint as AnimatedPlay.jsx's tests.
// Verify the real file wires conceptLabel() in, and test the same
// de-slugify algorithm here in isolation.
function conceptLabel(concept) {
  const s = String(concept || "").trim();
  if (!s) return "";
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

test("conceptLabel de-slugifies raw internal taxonomy strings", () => {
  assert.equal(conceptLabel("puck-control"), "Puck Control");
  assert.equal(conceptLabel("oz-entry"), "Oz Entry");
  assert.equal(conceptLabel("dz_coverage"), "Dz Coverage");
  assert.equal(conceptLabel("goalie-angle-depth"), "Goalie Angle Depth");
  // Already-clean values pass through unchanged (idempotent on title case).
  assert.equal(conceptLabel("Decision Quality"), "Decision Quality");
  assert.equal(conceptLabel(""), "");
  assert.equal(conceptLabel(undefined), "");
  assert.equal(conceptLabel(null), "");
});

test("App.jsx renders q.concept through conceptLabel, not raw", () => {
  const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.ok(app.includes("function conceptLabel(concept)"),
    "conceptLabel helper should exist");
  assert.ok(app.includes("{q.concept && <Pill color={C.dimmer} bg={C.dimmest}>{conceptLabel(q.concept)}</Pill>}"),
    "the concept pill should render through conceptLabel(), not the raw slug");
  assert.equal(app.includes("<Pill color={C.dimmer} bg={C.dimmest}>{q.concept}</Pill>"), false,
    "the old raw-slug render should be gone");
});
