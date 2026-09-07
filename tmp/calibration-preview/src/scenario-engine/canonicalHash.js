// Deterministic serialization + content-addressed hashing, shared by every
// scenario-engine artifact type (ScenarioDefinition, SimulationTrace,
// DecisionEvaluation, CompiledTeachingPlay -- Phase 1 note: this module is
// pure and artifact-agnostic; each artifact type's own schema module is
// responsible for calling it).
//
// Uses the standard Web Crypto API (globalThis.crypto.subtle), not a new
// dependency -- available natively in every modern browser and in Node
// (stable since Node 20; this repo runs Node 24). No cryptographic-security
// requirement here (content-addressing needs collision resistance, not
// secrecy), but SHA-256 is the standard, well-tested choice and avoids
// hand-rolling a hash function.

// Deep, deterministic key ordering. Arrays keep their order (order is
// semantically meaningful for e.g. time-ordered intended actions); only
// object keys are sorted.
//
// Known, deliberately-unaddressed edge case (flagged by adversarial review,
// 2026-07-30): Object.keys().sort() puts any purely-numeric string keys
// first, per JS's own integer-key enumeration order, ahead of the
// lexicographic sort applied to everything else. Output is still
// deterministic (same input always hashes the same), just not strictly
// lexicographic if that ever occurs -- and it doesn't: no artifact schema
// in this engine uses numeric-string object keys anywhere. Not worth a fix
// for a case that can't currently arise; noted so it isn't silently missed
// if a future schema ever introduces one.
export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const sorted = {};
    for (const key of Object.keys(value).sort()) sorted[key] = sortKeysDeep(value[key]);
    return sorted;
  }
  return value;
}

export function canonicalStringify(value) {
  return JSON.stringify(sortKeysDeep(value));
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Async: Web Crypto's digest() is promise-based in every environment. Every
// caller in this engine (schema validators, run envelope, judgment records)
// is already async-friendly, so this is not a constraint in practice.
export async function contentHash(value) {
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

// Convenience: hash a value plus an explicit version/kind tag, so two
// artifacts with identical content but different schema versions never
// collide. Every canonical-bundle hash in this engine should use this, not
// bare contentHash(), per the "version field convention" the spec calls for.
export async function versionedContentHash(kind, version, value) {
  return contentHash({ kind, version, value });
}
