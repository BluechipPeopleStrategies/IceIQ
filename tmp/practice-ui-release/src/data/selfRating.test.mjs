#!/usr/bin/env node
// Run: node src/data/selfRating.test.mjs
import { canSelfRate, SELF_RATING_MIN_BAND } from "./selfRating.js";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// Thomas, 2026-08-03: U7 and U9 do not self-rate. U11 is the first band that does.
// Hockey Canada plays those bands cross-ice/half-ice with no standings, and
// asking a six- or eight-year-old to rank themselves is the wrong instrument.
ok("U7 does not self-rate", canSelfRate("U7 / Initiation") === false);
ok("U9 does not self-rate", canSelfRate("U9 / Novice") === false);
ok("U11 is the first band that does", canSelfRate("U11 / Atom") === true);
ok("U13 self-rates", canSelfRate("U13 / Peewee") === true);
ok("U15 self-rates", canSelfRate("U15 / Bantam") === true);
ok("U18 self-rates", canSelfRate("U18 / Midget") === true);

// Safety: an unknown or missing level must not silently enable self-rating for a
// young player whose band we failed to parse.
ok("an unknown level does not self-rate", canSelfRate("something else") === false);
ok("null does not self-rate", canSelfRate(null) === false);
ok("undefined does not self-rate", canSelfRate(undefined) === false);
ok("the minimum band is stated once, not scattered", SELF_RATING_MIN_BAND === 11);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
