#!/usr/bin/env node
// Run: node src/scenario/positionalLanguage.test.mjs
import { readFileSync } from "node:fs";
import { validatePositionalLanguage, zoneDepth } from "./positionalLanguage.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };
const near = (a, b, eps = 0.005) => Math.abs(a - b) < eps;

const LIVE_SEED = JSON.parse(
  readFileSync(new URL("./seeds/gvis_u11_time-and-space_4we8.json", import.meta.url), "utf8")
);

// ---- zone-depth fraction ----------------------------------------------------
// Derived from RinkReadsRink's RINK_DIMENSIONS: 60m x 30m, goal line 4m from
// the end (x=56m -> 0.9333 normalized), blue line 17.3m up-ice from the goal
// line (x=38.7m -> 0.645). d = 0 at the blue line, 1 at the goal line.
ok("d is 0 at the blue line", near(zoneDepth(0.645, "right"), 0));
ok("d is 1 at the goal line", near(zoneDepth(0.9333, "right"), 1));
ok("d exceeds 1 behind the net", zoneDepth(0.96, "right") > 1);
ok("the left end mirrors the right", near(zoneDepth(1 - 0.645, "left"), 0));
ok("a mid-zone actor lands mid-band", near(zoneDepth(0.8, "right"), 0.538, 0.01));

// ---- the original defect, as a fixture --------------------------------------
// gvis_u11_time-and-space_4we8 shipped claiming "You have the puck up high in
// the zone" while YOU sits at x=0.80 -> d=0.538. "High" requires d <= 0.30
// (grey to 0.38), so it was 0.16 of zone depth outside the grey band.
//
// The copy has since been corrected, so this asserts against the ORIGINAL text
// re-applied to the real geometry rather than reading the live file. A
// regression test that only passes while the content is still broken stops
// testing anything the moment someone fixes it.
{
  const asShipped = structuredClone(LIVE_SEED);
  asShipped.interaction = {
    ...asShipped.interaction,
    prompt: "You have the puck up high in the zone. One teammate has open ice; the other is covered by a defender. Tap the teammate with the most time and space.",
  };
  const findings = validatePositionalLanguage(asShipped);
  const depth = findings.find((f) => f.code === "positional-depth-mismatch");
  ok("flags the live 'up high in the zone' seed", !!depth);
  ok("names the actor the claim is about", depth?.actorId === "you");
  ok("reports the measured depth, not just a verdict", near(depth?.measured ?? -1, 0.538, 0.01));
  ok("reports the band the copy claimed", depth?.claimed === "high");
  ok("explanation quotes the offending phrase", /high in the zone/i.test(depth?.explanation || ""));
}

// The live seed, as authored today, must be clean.
ok("the corrected live seed passes", validatePositionalLanguage(LIVE_SEED).length === 0);

// ---- a compliant seed passes ------------------------------------------------
{
  const good = structuredClone(LIVE_SEED);
  good.actors = good.actors.map((a) => (a.id === "you" || a.id === "puck" ? { ...a, x: 0.68 } : a));
  const findings = validatePositionalLanguage(good);
  ok("an actor genuinely high in the zone passes", !findings.some((f) => f.code === "positional-depth-mismatch"));
}

// ---- the grey band must pass ------------------------------------------------
// d = 0.35 is outside the 0.30 core but inside the 0.38 grey bound. A validator
// that fails this would reject legitimate authoring judgment.
{
  const grey = structuredClone(LIVE_SEED);
  const greyX = 0.645 + 0.35 * (0.9333 - 0.645);
  grey.actors = grey.actors.map((a) => (a.id === "you" || a.id === "puck" ? { ...a, x: greyX } : a));
  const findings = validatePositionalLanguage(grey);
  ok("an actor inside the grey band is not flagged", !findings.some((f) => f.code === "positional-depth-mismatch"));
}

// ---- false positives: "high"/"low" that are not about depth ------------------
// These three senses are live in this repo's copy. A naive string match fails
// all of them wrongly.
for (const [label, prompt] of [
  ["shot placement", "Pick the shot: go high glove side on the goalie."],
  ["role", "The high forward, F3, is your outlet. Tap them."],
  ["quality", "That is a low-percentage shot from there. Pick the better option."],
  ["width, not depth", "Your teammate is on the low side. Tap them."],
]) {
  const s = structuredClone(LIVE_SEED);
  s.interaction = { ...s.interaction, prompt };
  const findings = validatePositionalLanguage(s);
  ok(`no depth claim inferred from ${label}`, !findings.some((f) => f.code === "positional-depth-mismatch"));
}

// ---- no stage / no actors is not a claim ------------------------------------
{
  const bare = { id: "x", interaction: { prompt: "Tap the open teammate." }, actors: [], stage: {} };
  ok("a prompt with no positional language yields nothing", validatePositionalLanguage(bare).length === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
