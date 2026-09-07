// Deterministic parameter-space utilities for staged scenario generation.
// A seed controls which approved parameter sets are selected, never whether a
// tactical answer is true. The returned parameter sets contain only declared
// load-bearing axes; mirrors, prose rewrites, and cosmetic jitter do not
// belong in this module.

export const PARAMETER_SPACE_VERSION = "parameter-space-v1";

function assertSpace(space) {
  if (!space || typeof space !== "object") throw new Error("parameter space must be an object");
  if (typeof space.id !== "string" || !space.id) throw new Error("parameter space needs a non-empty id");
  if (!Array.isArray(space.axes) || space.axes.length === 0) throw new Error("parameter space needs at least one axis");

  const seen = new Set();
  for (const axis of space.axes) {
    if (!axis || typeof axis.id !== "string" || !axis.id) throw new Error("each parameter-space axis needs an id");
    if (seen.has(axis.id)) throw new Error(`duplicate parameter-space axis: ${axis.id}`);
    seen.add(axis.id);
    if (axis.loadBearing !== true) throw new Error(`axis ${axis.id} must be declared load-bearing`);
    if (!Array.isArray(axis.values) || axis.values.length < 2) throw new Error(`axis ${axis.id} needs at least two values`);
    if (new Set(axis.values.map((value) => JSON.stringify(value))).size !== axis.values.length) {
      throw new Error(`axis ${axis.id} contains duplicate values`);
    }
  }
}

export function enumerateParameterSpace(space) {
  assertSpace(space);
  let rows = [{}];
  for (const axis of space.axes) {
    rows = rows.flatMap((row) => axis.values.map((value) => ({ ...row, [axis.id]: value })));
  }
  return rows;
}

// Mulberry32 is compact, deterministic across JS runtimes, and has no global
// state. The selected seed is stored on every generated definition so a coach
// can reproduce the exact rollout.
export function mulberry32(seed) {
  if (!Number.isInteger(seed)) throw new Error("parameter-space seed must be an integer");
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function selectSeededParameterSets(space, { seed, count } = {}) {
  const sets = enumerateParameterSpace(space);
  if (!Number.isInteger(seed)) throw new Error("selectSeededParameterSets requires an integer seed");
  if (!Number.isInteger(count) || count < 1 || count > sets.length) {
    throw new Error(`count must be an integer between 1 and ${sets.length}`);
  }

  const rng = mulberry32(seed);
  const shuffled = [...sets];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
