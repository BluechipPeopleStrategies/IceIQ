#!/usr/bin/env node
// Run: node src/utils/playerCache.test.mjs
//
// The 2026-08-03 data loss: five of six First-Five quests lost their state
// because `player` lived only in React state whose sole durable home was
// Supabase, written last and unbounded. These assertions pin the rule that
// replaces it — the local cache is authoritative on merge, because it was
// written synchronously at the moment of the user's action while the server
// copy may be missing a write that failed, timed out, or is still in flight.

import { webcrypto } from "node:crypto";

// Minimal localStorage before importing anything that touches it.
// storage.js guards on `typeof window !== "undefined" && window.localStorage`,
// so stubbing a bare global localStorage is not enough — it needs `window`.
const store = new Map();
const localStorageStub = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear(),
};
globalThis.localStorage = localStorageStub;
globalThis.window = { localStorage: localStorageStub };
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const { cachePlayer, readCachedPlayer, mergeCachedPlayer, clearCachedPlayer } =
  await import("./playerCache.js");

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const reset = () => store.clear();

// ---- the basic round trip ---------------------------------------------------
{
  reset();
  cachePlayer({ id: "p1", selfRatings: { edges: 3 }, sessionLength: 5 });
  const back = readCachedPlayer("p1");
  ok("caches a player's own fields", back.selfRatings.edges === 3 && back.sessionLength === 5);
  ok("stamps an updated time", typeof back.__updatedAt === "number");
  ok("an unknown player reads back null", readCachedPlayer("nope") === null);
  ok("a player with no id is ignored rather than throwing",
    (() => { cachePlayer({ selfRatings: {} }); return true; })());
}

// ---- server-owned fields never come back from the cache ---------------------
// A stale local copy must not be able to resurrect a revoked flag.
{
  reset();
  cachePlayer({ id: "p1", isAdmin: true, selfRatings: { a: 1 } });
  ok("isAdmin is not cached", readCachedPlayer("p1").isAdmin === undefined);
  const merged = mergeCachedPlayer({ id: "p1", isAdmin: false, selfRatings: {} });
  ok("a revoked isAdmin stays revoked after a merge", merged.isAdmin === false);
}

// ---- the merge rule: local wins ---------------------------------------------
{
  reset();
  // The player rated six skills; the server write never landed.
  cachePlayer({ id: "p1", selfRatings: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } });
  const server = { id: "p1", selfRatings: {}, name: "Alex" };
  const merged = mergeCachedPlayer(server);
  ok("ratings the server never received survive the merge",
    Object.keys(merged.selfRatings).length === 6);
  ok("fields only the server has are preserved", merged.name === "Alex");
}

// ---- maps merge key-by-key, they do not replace -----------------------------
// A rating saved on another device must not be dropped by this device's cache.
{
  reset();
  cachePlayer({ id: "p1", selfRatings: { local: 1 } });
  const merged = mergeCachedPlayer({ id: "p1", selfRatings: { remote: 9 } });
  ok("a server-only rating is not dropped", merged.selfRatings.remote === 9);
  ok("the local rating is present too", merged.selfRatings.local === 1);
  ok("local wins on a genuine conflict",
    mergeCachedPlayer({ id: "p1", selfRatings: { local: 99 } }).selfRatings.local === 1);
}

// ---- quizHistory takes the longer side, never concatenates ------------------
// The two are the same list at different times. Appending would double-count,
// which is the "nine of nine quizzes" inflation Thomas reported.
{
  reset();
  cachePlayer({ id: "p1", quizHistory: [{ score: 1 }, { score: 2 }, { score: 3 }] });
  ok("a longer local history wins",
    mergeCachedPlayer({ id: "p1", quizHistory: [{ score: 1 }] }).quizHistory.length === 3);
  ok("a longer server history wins",
    mergeCachedPlayer({ id: "p1", quizHistory: [{s:1},{s:2},{s:3},{s:4},{s:5}] }).quizHistory.length === 5);
  ok("histories are never concatenated",
    mergeCachedPlayer({ id: "p1", quizHistory: [{ score: 9 }] }).quizHistory.length === 3);
}

// ---- no cache at all is a clean pass-through --------------------------------
{
  reset();
  const server = { id: "fresh", selfRatings: { a: 1 }, quizHistory: [{ s: 1 }] };
  ok("a player with no cache returns the server copy untouched",
    mergeCachedPlayer(server) === server);
  ok("a null player does not throw", mergeCachedPlayer(null) === null);
}

// ---- caches are per-player, and sign-out clears only one --------------------
{
  reset();
  cachePlayer({ id: "p1", selfRatings: { a: 1 } });
  cachePlayer({ id: "p2", selfRatings: { b: 2 } });
  ok("two players cache independently",
    readCachedPlayer("p1").selfRatings.a === 1 && readCachedPlayer("p2").selfRatings.b === 2);
  clearCachedPlayer("p1");
  ok("clearing one player drops only that player", readCachedPlayer("p1") === null);
  ok("the other player is untouched", readCachedPlayer("p2").selfRatings.b === 2);
}

// ---- the full loss scenario, replayed ---------------------------------------
// Rate six skills, set a goal, finish a quiz — then the server returns nothing,
// exactly as it did on 2026-08-03. Everything must still be there.
{
  reset();
  let player = { id: "p1", selfRatings: {}, goals: {}, quizHistory: [] };
  for (const s of ["a","b","c","d","e","f"]) {
    player = { ...player, selfRatings: { ...player.selfRatings, [s]: 4 } };
    cachePlayer(player);
  }
  player = { ...player, goals: { skating: { goal: "Better backwards crossovers" } } };
  cachePlayer(player);
  player = { ...player, quizHistory: [{ score: 80 }] };
  cachePlayer(player);

  const serverAfterReload = { id: "p1", selfRatings: {}, goals: {}, quizHistory: [] };
  const recovered = mergeCachedPlayer(serverAfterReload);
  ok("all six ratings survive a reload the server knows nothing about",
    Object.keys(recovered.selfRatings).length === 6);
  ok("the SMART goal survives", recovered.goals.skating.goal === "Better backwards crossovers");
  ok("the completed quiz survives", recovered.quizHistory.length === 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
