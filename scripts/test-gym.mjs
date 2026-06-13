import { gradedPoints, MAX_REP } from "../src/cognitive-gym/gymPoints.js";
import { createAdaptiveLevel } from "../src/cognitive-gym/gymEngine.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// gradedPoints
check("exact gives max", gradedPoints(0) === MAX_REP);
check("clamps negative error to max", gradedPoints(-0.5) === MAX_REP);
check("error past 1 same as 1", gradedPoints(2) === gradedPoints(1));
check("monotonic decreasing", gradedPoints(0.05) > gradedPoints(0.2) && gradedPoints(0.2) > gradedPoints(0.6));
check("bang-on beats barely-right", gradedPoints(0) > gradedPoints(0.05));

// leveling: earn promotion, relegation, mixed resets, seeding, clamps
const up3 = createAdaptiveLevel(5);
up3.record(true); up3.record(true);
check("two wins not yet promoted", up3.level === 5 && up3.toPromote === 1);
check("third win promotes", up3.record(true) === 6 && up3.ups === 0);

const down = createAdaptiveLevel(5);
down.record(false);
check("one loss not yet relegated", down.level === 5 && down.toRelegate === 1);
check("second loss relegates", down.record(false) === 4);

const mix = createAdaptiveLevel(5);
mix.record(true); mix.record(true); mix.record(false);
check("a loss resets the up-streak", mix.ups === 0 && mix.level === 5);

const seeded = createAdaptiveLevel(7, { startUps: 2 });
check("seeded streak promotes on first win", seeded.record(true) === 8);

const floor = createAdaptiveLevel(1);
check("cannot relegate below 1", floor.record(false) === 1 && floor.record(false) === 1);
const ceil = createAdaptiveLevel(20);
check("cannot promote above max", ceil.record(true) === 20 && ceil.record(true) === 20 && ceil.record(true) === 20);

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
