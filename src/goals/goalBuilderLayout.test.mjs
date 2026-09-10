#!/usr/bin/env node
// Run: node --test src/goals/goalBuilderLayout.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./GoalBuilder.css", import.meta.url), "utf8");

test("the narrow goal-builder layout cannot be stretched by the category strip (QA 2026-09-10)", () => {
  // At 390px the Goals screen scrolled sideways to ~1092px: the single grid
  // track was `1fr` (= minmax(auto, 1fr)), so the horizontally-scrolling
  // category strip's min-content width became the track width. The strip's
  // own overflow-x:auto only works when the track is allowed to shrink.
  const narrow = css.match(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/);
  assert.ok(narrow, "narrow-viewport block exists");
  const block = narrow[1];
  assert.match(block, /\.goal-builder__layout \{[^}]*grid-template-columns: minmax\(0, 1fr\)/, "single track is minmax(0, 1fr)");
  assert.doesNotMatch(block, /\.goal-builder__layout \{[^}]*grid-template-columns: 1fr;/, "no bare 1fr track");
  assert.match(block, /\.goal-builder__categories \{[^}]*overflow-x: auto/, "the strip scrolls inside the panel");
  // The wide layout keeps its fixed sidebar + flexible content column.
  assert.match(css, /\.goal-builder__layout \{[^}]*grid-template-columns: 264px minmax\(0, 1fr\)/);
});
