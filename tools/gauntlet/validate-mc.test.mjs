#!/usr/bin/env node
// Unit tests for the deterministic MC gate. Run: node tools/gauntlet/validate-mc.test.mjs
import { validateMC, structuralHash } from "./validate-mc.mjs";

let pass = 0, fail = 0;
const ok = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); cond ? pass++ : fail++; };

const good = {
  id: "g1", type: "mc", nodeId: "u11.passing",
  sit: "Your teammate is open up the middle with speed and a defender is on you. What is the best play?",
  opts: ["Pass to the open teammate", "Try to deke the defender", "Shoot it down the ice", "Wait for help"],
  ok: 0,
  explain: "An open teammate with speed is the highest-value option when pressured.",
  levels: ["U11 / Atom"],
};

ok("valid question passes", validateMC(good).ok === true);
ok("valid has no errs", validateMC(good).errs.length === 0);

const bad = (patch) => validateMC({ ...good, ...patch });
ok("wrong type fails", bad({ type: "tf" }).ok === false);
ok("missing nodeId fails", bad({ nodeId: undefined }).ok === false);
ok("short stem fails", bad({ sit: "too short" }).ok === false);
ok("2 options fails", bad({ opts: ["a", "b"], ok: 0 }).ok === false);
ok("5 options fails", bad({ opts: ["a","b","c","d","e"], ok: 0 }).ok === false);
ok("non-distinct options fail", bad({ opts: ["Pass", "Pass", "Shoot", "Wait"] }).ok === false);
ok("ok out of range fails", bad({ ok: 9 }).ok === false);
ok("ok non-integer fails", bad({ ok: 1.5 }).ok === false);
ok("short explain fails", bad({ explain: "ok" }).ok === false);
ok("unknown level fails", bad({ levels: ["U10 / Nope"] }).ok === false);
ok("empty levels fails", bad({ levels: [] }).ok === false);
ok("missing levels is allowed", validateMC({ ...good, levels: undefined }).ok === true);

// length-outlier tell: correct option absurdly longer than distractors
const outlier = bad({
  opts: ["Pass to the open teammate up the middle because the defender has committed and the lane is clearly open for a high-value scoring chance", "Shoot", "Wait", "Skate back"],
  ok: 0,
});
ok("length-outlier correct option fails", outlier.ok === false);

// dedupe via seen set
const seen = new Set([structuralHash(good)]);
ok("duplicate hash fails when seen", validateMC(good, { seen }).ok === false);
ok("fresh question passes against seen", validateMC({ ...good, id: "g2", sit: "A completely different situation arises on the rush with a 2-on-1 developing fast." , opts:["Drive the net","Pass across","Shoot far side","Curl back"], ok:1 }, { seen }).ok === true);

// structuralHash ignores option order + correct index
const reordered = { ...good, ok: 3, opts: ["Wait for help", "Shoot it down the ice", "Try to deke the defender", "Pass to the open teammate"] };
ok("hash stable across option order", structuralHash(good) === structuralHash(reordered));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
