// Primitive registry — Perseus widget-pattern. Adding a new interaction
// kind means importing the primitive and registering it here. ScenarioRenderer
// looks up `interaction.kind` and delegates to the matching component +
// scorer. No central switch statement.

import { pathPrimitive } from "./primitives/path.jsx";
import { selectionPrimitive } from "./primitives/selection.jsx";

const REGISTRY = {
  [pathPrimitive.kind]: pathPrimitive,
  [selectionPrimitive.kind]: selectionPrimitive,
};

export function getPrimitive(kind) {
  return REGISTRY[kind] || null;
}

export function listPrimitives() {
  return Object.keys(REGISTRY);
}
