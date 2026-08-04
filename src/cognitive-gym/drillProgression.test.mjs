#!/usr/bin/env node
// Run: node src/cognitive-gym/drillProgression.test.mjs
//
// Every gym drill must both SEED its promote/relegate streak from storage and
// SAVE it back. Reaction did neither, and the consequence was invisible: its
// stored level simply never moved.
//
// Why it stayed hidden. `createAdaptiveLevel` needs `upStreak` consecutive
// clean reps (3) to promote. A session is 5 reps. So a player who finished a
// session 2-up had those two wiped on exit, started the next session at zero,
// and needed a single session containing 3 consecutive successes to ever gain a
// level. Every other drill accumulates across sessions; this one silently did
// not, and nothing in the UI said so — the level chip just kept reading the
// same number.
//
// Source-level assertions rather than behavioural ones, deliberately: the bug
// was an omission at two call sites, and the check that catches an omission is
// "does every drill do this", not "does this drill behave". A behavioural test
// would have passed on Reaction, because the engine itself was never broken.

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname, basename } from "node:path";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const HERE = dirname(fileURLToPath(import.meta.url));
const drills = readdirSync(HERE).filter(f => /Drill\.jsx$/.test(f)).sort();

ok(`found the gym drills (${drills.length})`, drills.length >= 12);

const src = Object.fromEntries(drills.map(f => [basename(f, ".jsx"), readFileSync(join(HERE, f), "utf8")]));

// ---- seeding: the streak a player earned last session must be restored ------

{
  const missing = Object.entries(src)
    .filter(([, s]) => s.includes("createAdaptiveLevel") && !s.includes("startUps"))
    .map(([n]) => n);
  ok(`every drill seeds startUps/startDowns from storage${missing.length ? ` — ${missing.join(", ")}` : ""}`,
    missing.length === 0);
}

// ---- saving: and the streak it ends on must be written back -----------------

{
  const missing = Object.entries(src)
    .filter(([, s]) => s.includes("saveSession(") && !/streak:\s*\{/.test(s))
    .map(([n]) => n);
  ok(`every drill persists its streak in saveSession${missing.length ? ` — ${missing.join(", ")}` : ""}`,
    missing.length === 0);
}

// ---- the two halves have to agree, or the round trip is still broken --------

{
  const asymmetric = Object.entries(src)
    .filter(([, s]) => s.includes("createAdaptiveLevel"))
    .filter(([, s]) => s.includes("startUps") !== /streak:\s*\{/.test(s))
    .map(([n]) => n);
  ok(`no drill seeds without saving, or saves without seeding${asymmetric.length ? ` — ${asymmetric.join(", ")}` : ""}`,
    asymmetric.length === 0);
}

// ---- the storage layer actually round-trips it ------------------------------

{
  const storage = readFileSync(join(HERE, "gymStorage.js"), "utf8");
  ok("storage defaults a missing streak rather than leaving it undefined",
    /streak:\s*\{\s*ups:\s*0,\s*downs:\s*0\s*\}/.test(storage));
  ok("saveSession writes the session's streak through to the stored drill",
    /drill\.streak\s*=\s*session\.streak/.test(storage));
}

// ---- and every drill shares the session length ------------------------------

{
  const missing = Object.entries(src)
    .filter(([, s]) => !s.includes("REPS_PER_SESSION"))
    .map(([n]) => n);
  ok(`every drill uses the shared session length${missing.length ? ` — ${missing.join(", ")}` : ""}`,
    missing.length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
