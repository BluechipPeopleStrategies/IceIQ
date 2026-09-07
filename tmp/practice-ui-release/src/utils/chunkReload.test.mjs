#!/usr/bin/env node
// Run: node src/utils/chunkReload.test.mjs
import { isChunkLoadError, shouldReloadForChunkError, RELOAD_GUARD_MS } from "./chunkReload.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// A deploy replaces content-hashed chunks and deletes the old ones, so a page
// left open across a deploy 404s on the next lazy screen it opens. Observed in
// production 2026-08-03: "screens-erD1H7zd.js:1 Failed to load resource: 404",
// surfaced to the user as "Something went wrong".
ok("recognises Vite's dynamic import failure",
  isChunkLoadError(new Error("Failed to fetch dynamically imported module: https://x/screens-erD1H7zd.js")));
ok("recognises a webpack-style ChunkLoadError", isChunkLoadError(Object.assign(new Error("boom"), { name: "ChunkLoadError" })));
ok("recognises an importing-module error", isChunkLoadError(new Error("error loading dynamically imported module")));
ok("does NOT treat an ordinary error as a chunk failure", isChunkLoadError(new TypeError("x is not a function")) === false);
ok("is safe on null", isChunkLoadError(null) === false);

// Reload once, then stop: if the chunk is genuinely gone, looping would trap
// the user in a refresh cycle instead of showing them the error.
ok("reloads when nothing has been tried yet", shouldReloadForChunkError({ now: 1000, lastReloadAt: null }) === true);
ok("does NOT reload twice in quick succession",
  shouldReloadForChunkError({ now: 1000, lastReloadAt: 1000 - (RELOAD_GUARD_MS - 1) }) === false);
ok("reloads again once the guard window has passed",
  shouldReloadForChunkError({ now: 1000 + RELOAD_GUARD_MS + 1, lastReloadAt: 1000 }) === true);
ok("treats a garbage timestamp as no previous reload",
  shouldReloadForChunkError({ now: 1000, lastReloadAt: NaN }) === true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
