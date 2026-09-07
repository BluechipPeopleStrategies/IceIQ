// Public entry point for the unified scenario engine. Consumers import
// from here only — the internal file structure is free to refactor as
// long as these names stay stable.

export { default as ScenarioRenderer } from "./ScenarioRenderer.jsx";
export { validateScenario, RINK_W, RINK_H, denorm, denormR } from "./schema.js";
export { ZONES, resolveTarget } from "./zones.js";
export { getPrimitive, listPrimitives } from "./registry.js";
