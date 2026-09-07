import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";

const traverse = traverseModule.default;
const here = path.dirname(fileURLToPath(import.meta.url));
const files = [
  "AnticipationScene3D.jsx",
  "BestOptionScene3D.jsx",
  "EyesUpScene3D.jsx",
  "RemainingDrillsScene3D.jsx",
  "ShootoutScene3D.jsx",
  "SnapshotScene3D.jsx",
  "TrackingScene3D.jsx",
  "gymRinkScene3D.jsx",
  path.join("..", "one-on-one", "Skater.jsx"),
];

// These are runtime globals used by the renderer, rather than module bindings.
// Keep this list deliberately small so a missing import fails the test.
const runtimeGlobals = new Set([
  "Array", "Boolean", "Date", "Error", "Infinity", "JSON", "Map", "Math",
  "NaN", "Number", "Object", "Promise", "RegExp", "Set", "String", "Symbol",
  "clearTimeout", "console", "document", "globalThis", "performance",
  "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "undefined",
  "window",
]);

function unresolvedBindings(relativeFile) {
  const file = path.join(here, relativeFile);
  const ast = parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"],
  });
  const unresolved = new Map();
  traverse(ast, {
    ReferencedIdentifier(bindingPath) {
      const name = bindingPath.node.name;
      if (runtimeGlobals.has(name) || bindingPath.scope.hasBinding(name)) return;
      const start = bindingPath.node.loc?.start;
      unresolved.set(name, `${start?.line ?? 0}:${start?.column ?? 0}`);
    },
  });
  return unresolved;
}

test("3D rink renderers have no unresolved identifier bindings", () => {
  const failures = [];
  for (const relativeFile of files) {
    const unresolved = unresolvedBindings(relativeFile);
    for (const [name, location] of unresolved) failures.push(`${relativeFile}:${location} ${name}`);
  }
  assert.deepEqual(failures, [], `unresolved renderer bindings:\n${failures.join("\n")}`);
});
