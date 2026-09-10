#!/usr/bin/env node
// Run: node --test src/devtools/feedbackWidget.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./feedback-widget.css", import.meta.url), "utf8");
const nav = readFileSync(new URL("../ui/glass.css", import.meta.url), "utf8");

test("the feedback button is lifted above the bottom nav on narrow viewports (QA 2026-09-10)", () => {
  // At 390px the fixed .fbw-root (bottom:16px, right:16px, z-index 9999) sat on
  // the bottom nav's right-hand tab, so "Report" could not be tapped
  // (Playwright: "<button class=\"fbw-fab\"> intercepts pointer events").
  assert.match(css, /\.fbw-root \{[^}]*position: fixed;[^}]*bottom: 16px;/, "default placement unchanged");
  const rule = css.match(/@media \(max-width: ?(\d+)px\) \{\s*body:has\(\.rr-bottom-nav\) \.fbw-root \{ bottom: calc\(max\(12px, env\(safe-area-inset-bottom\)\) \+ (\d+)px\); \}/);
  assert.ok(rule, "narrow-viewport rule exists and is scoped to pages that render the bottom nav");
  const [, maxWidth, lift] = rule.map(Number);
  // The nav is min(560px, 100% - 24px) wide and centred; with a ~96px button at
  // right:16px they overlap below roughly 784px. The rule must cover that.
  assert.ok(maxWidth >= 784, `media query covers every overlapping width (got ${maxWidth})`);
  // Nav: 56px buttons + 6px padding x2 + 1px border x2 = 70px tall at bottom 12px.
  assert.match(nav, /\.rr-bottom-nav \{[^}]*bottom: max\(12px,env\(safe-area-inset-bottom\)\)/);
  assert.match(nav, /\.rr-bottom-nav button \{[^}]*min-height: 56px/);
  assert.ok(lift >= 70 + 12, `lift clears the 70px nav plus a gap (got ${lift})`);
});
