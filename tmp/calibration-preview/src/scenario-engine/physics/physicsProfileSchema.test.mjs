#!/usr/bin/env node
// Run: node src/scenario-engine/physics/physicsProfileSchema.test.mjs
import { readFileSync } from "node:fs";
import { validatePhysicsProfile } from "./physicsProfileSchema.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const BANDS = ["u7", "u9", "u11", "u13", "u15", "u18"];
const profiles = {};
for (const band of BANDS) {
  profiles[band] = JSON.parse(readFileSync(new URL(`./profiles/${band}.json`, import.meta.url), "utf8"));
}

for (const band of BANDS) {
  const result = validatePhysicsProfile(profiles[band]);
  ok(`${band}.json passes schema validation`, result.ok && result.errs.length === 0);
  if (!result.ok) console.log("  ", result.errs);
}

// Every real profile's ageBand field actually matches its filename.
for (const band of BANDS) {
  ok(`${band}.json's ageBand field matches its filename`, profiles[band].ageBand.toLowerCase() === band);
}

// The exit gate's own requirement, checked mechanically: every numeric
// parameter in every profile has a non-empty source tag and citation --
// no bare number anywhere.
{
  let allTagged = true;
  const PLAYER_KEYS = ["topSpeedMPS", "accel0to10mS", "avgAccelMPS2", "turningRadiusM", "stoppingDistanceM", "reactionDelayS"];
  const PUCK_KEYS = ["passSpeedMPS", "iceDecelerationMPS2"];
  for (const band of BANDS) {
    const p = profiles[band];
    for (const k of PLAYER_KEYS) {
      if (!p.player[k]?.source || !p.player[k]?.citation) { allTagged = false; console.log(`  missing source/citation: ${band}.player.${k}`); }
    }
    for (const k of PUCK_KEYS) {
      if (!p.puck[k]?.source || !p.puck[k]?.citation) { allTagged = false; console.log(`  missing source/citation: ${band}.puck.${k}`); }
    }
  }
  ok("every numeric parameter in every profile carries a source and citation (no bare numbers)", allTagged);
}

// The parameters with real published data (U11 through U18 top speed) must
// actually be tagged "cited", not silently downgraded to an estimate --
// and the genuinely-invented ones (U7/U9 speed, turning radius/stopping
// distance everywhere, puck pass speed everywhere) must NOT claim to be cited.
ok("U11 topSpeedMPS is tagged cited (real PMC11358090 data)", profiles.u11.player.topSpeedMPS.source === "cited");
ok("U13 topSpeedMPS is tagged cited (real PMC12821503 data)", profiles.u13.player.topSpeedMPS.source === "cited");
ok("U15 topSpeedMPS is tagged cited (real, averaged from two sources)", profiles.u15.player.topSpeedMPS.source === "cited");
ok("U18 topSpeedMPS is tagged cited (real PMC12821503 data)", profiles.u18.player.topSpeedMPS.source === "cited");
ok("U7 topSpeedMPS is tagged as an estimate, not cited (no data exists below age 9)", profiles.u7.player.topSpeedMPS.source === "engineering-estimate-pending-source");
ok("U9 topSpeedMPS is tagged as an estimate, not cited", profiles.u9.player.topSpeedMPS.source === "engineering-estimate-pending-source");
for (const band of BANDS) {
  ok(`${band} turningRadiusM is tagged as an estimate (no published figure exists at any age)`, profiles[band].player.turningRadiusM.source === "engineering-estimate-pending-source");
  ok(`${band} stoppingDistanceM is tagged as an estimate (no published figure exists at any age)`, profiles[band].player.stoppingDistanceM.source === "engineering-estimate-pending-source");
  ok(`${band} puck passSpeedMPS is tagged as an estimate (no youth pass-velocity study exists)`, profiles[band].puck.passSpeedMPS.source === "engineering-estimate-pending-source");
  ok(`${band} puck iceDecelerationMPS2 IS tagged cited (real, age-independent physics constant)`, profiles[band].puck.iceDecelerationMPS2.source === "cited");
}

// Sanity: skating top speed increases monotonically with age band (the real
// data supports this cleanly across all 6 bands, unlike acceleration).
{
  const speeds = BANDS.map((b) => profiles[b].player.topSpeedMPS.value);
  let monotonic = true;
  for (let i = 1; i < speeds.length; i++) if (speeds[i] <= speeds[i - 1]) monotonic = false;
  ok("top speed increases monotonically from U7 to U18", monotonic);
}

// Puck ice deceleration is identical across every band -- it's a physical
// constant of the puck and ice, not a function of player age.
{
  const decels = BANDS.map((b) => profiles[b].puck.iceDecelerationMPS2.value);
  ok("puck ice deceleration is identical across every age band (age-independent physics)", decels.every((d) => d === decels[0]));
}

// Reaction delay is deliberately flat across bands (documented decision:
// no age-hockey reaction-time curve exists in the literature to justify
// scaling it, unlike skating speed which has 4 real anchor points).
{
  const delays = BANDS.map((b) => profiles[b].player.reactionDelayS.value);
  ok("reaction delay is deliberately flat across all bands (no data supports an age curve)", delays.every((d) => d === delays[0]));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
