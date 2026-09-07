#!/usr/bin/env node
// Run: node src/scenario-engine/canonicalHash.test.mjs
import { canonicalStringify, contentHash, versionedContentHash } from "./canonicalHash.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

ok("key order does not affect canonicalStringify output", canonicalStringify({ b: 1, a: 2 }) === canonicalStringify({ a: 2, b: 1 }));
ok("array order DOES affect output (order is semantically meaningful)", canonicalStringify([1, 2]) !== canonicalStringify([2, 1]));
ok("nested objects are sorted at every level", canonicalStringify({ z: { b: 1, a: 2 } }) === canonicalStringify({ z: { a: 2, b: 1 } }));
ok("primitives pass through unchanged", canonicalStringify(42) === "42" && canonicalStringify("x") === '"x"');

const digest = await contentHash({ a: 1, b: [1, 2, 3] });
ok("contentHash returns a 64-char hex string (SHA-256)", typeof digest === "string" && /^[0-9a-f]{64}$/.test(digest));

const digestReordered = await contentHash({ b: [1, 2, 3], a: 1 });
ok("contentHash is stable under key reordering (same content, same hash)", digest === digestReordered);

const digestDifferent = await contentHash({ a: 1, b: [1, 2, 4] });
ok("contentHash differs for genuinely different content", digest !== digestDifferent);

const runTwice1 = await contentHash({ x: "same" });
const runTwice2 = await contentHash({ x: "same" });
ok("contentHash is deterministic across repeated calls", runTwice1 === runTwice2);

const versioned1 = await versionedContentHash("scenario-definition", "v1", { id: "a" });
const versioned2 = await versionedContentHash("scenario-definition", "v2", { id: "a" });
ok("versionedContentHash differs when only the version tag changes", versioned1 !== versioned2);

const versioned3 = await versionedContentHash("simulation-trace", "v1", { id: "a" });
ok("versionedContentHash differs when only the kind tag changes", versioned1 !== versioned3);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
