import test from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORIES, isCategory, sanitizeNote, buildFeedbackContext,
} from "../src/devtools/feedbackContext.js";

test("categories: five known chips, isCategory validates", () => {
  assert.equal(CATEGORIES.length, 5);
  assert.ok(CATEGORIES.includes("bug"));
  assert.equal(isCategory("idea"), true);
  assert.equal(isCategory("nonsense"), false);
});

test("sanitizeNote trims, caps at 2000, nulls empties and non-strings", () => {
  assert.equal(sanitizeNote("  hi  "), "hi");
  assert.equal(sanitizeNote("   "), null);
  assert.equal(sanitizeNote(""), null);
  assert.equal(sanitizeNote(123), null);
  assert.equal(sanitizeNote("x".repeat(3000)).length, 2000);
});

test("buildFeedbackContext includes set fields, rounds viewport, is JSON-safe", () => {
  const ctx = buildFeedbackContext({
    screen: "cogym", drillTitle: "Pick Your Spot", version: "0.1-beta",
    viewport: { w: 390.6, h: 844 }, userAgent: "UA",
    nowIso: "2026-06-13T10:00:00.000Z",
  });
  assert.equal(ctx.screen, "cogym");
  assert.equal(ctx.drill, "Pick Your Spot");
  assert.equal(ctx.appVersion, "0.1-beta");
  assert.deepEqual(ctx.viewport, { w: 391, h: 844 });
  assert.equal(ctx.userAgent, "UA");
  assert.equal(ctx.at, "2026-06-13T10:00:00.000Z");
  assert.ok(JSON.stringify(ctx).length > 0);
});

test("buildFeedbackContext omits missing fields", () => {
  const ctx = buildFeedbackContext({ screen: "home" });
  assert.deepEqual(Object.keys(ctx), ["screen"]);
});
