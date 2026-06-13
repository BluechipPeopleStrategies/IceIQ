import { gradedPoints, MAX_REP } from "../src/cognitive-gym/gymPoints.js";
import { createAdaptiveLevel } from "../src/cognitive-gym/gymEngine.js";
import { careerPointsFromDrills } from "../src/cognitive-gym/gymStorage.js";
import { DIRECTIONS, guessAxis, scorePass, feetPerPixel, formatDistance, rateMiss, RINK_LENGTH_FT, RINK_WIDTH_FT } from "../src/cognitive-gym/anticipationCore.js";

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

check("four directions", DIRECTIONS.length === 4 && DIRECTIONS.join() === "lr,rl,tb,bt");
check("horizontal travel guesses in Y", guessAxis("lr") === "y" && guessAxis("rl") === "y");
check("vertical travel guesses in X", guessAxis("tb") === "x" && guessAxis("bt") === "x");

// feetPerPixel: Y axis measures rink width (85ft), X axis measures length (200ft)
check("feetPerPixel Y = width/H", feetPerPixel("y", 600, 300) === RINK_WIDTH_FT / 300);
check("feetPerPixel X = length/W", feetPerPixel("x", 600, 300) === RINK_LENGTH_FT / 600);

// scorePass in feet: errorFt = pixel gap * ftPerPx; success within toleranceFt
const ftpp = 0.5; // 0.5 ft per px for a clean test
const bang = scorePass(100, 100, ftpp, 6);
check("bang-on is success with max points and 0 ft", bang.success && bang.points === 1000 && bang.errorFt === 0);
const inside = scorePass(108, 100, ftpp, 6); // 8px * 0.5 = 4 ft, inside 6 ft
check("inside window but off scores less than bang-on", inside.success && inside.errorFt === 4 && inside.points < 1000);
const outside = scorePass(130, 100, ftpp, 6); // 30px * 0.5 = 15 ft, outside 6 ft
check("outside window fails", !outside.success && outside.errorFt === 15);
const near = scorePass(104, 100, ftpp, 6);
const far = scorePass(120, 100, ftpp, 6);
check("closer scores higher", near.points > far.points);

// THE BUG FIX: the same physical miss scores the same regardless of orientation.
// Horizontal pass (guess in Y, narrow axis) vs vertical pass (guess in X, long
// axis): a 5 ft miss must yield identical points and identical success.
const W = 600, H = 372;
const ftY = feetPerPixel("y", W, H); // horizontal travel
const ftX = feetPerPixel("x", W, H); // vertical travel
const missPxY = 5 / ftY; // pixels that equal 5 ft on the Y axis
const missPxX = 5 / ftX; // pixels that equal 5 ft on the X axis
const hPass = scorePass(100, 100 + missPxY, ftY, 6);
const vPass = scorePass(100, 100 + missPxX, ftX, 6);
check("same feet miss scores identically across orientations", hPass.points === vPass.points && hPass.success === vPass.success && Math.abs(hPass.errorFt - 5) < 1e-9 && Math.abs(vPass.errorFt - 5) < 1e-9);

// formatDistance — always a number now; the quality word comes from rateMiss
check("formatDistance feet", formatDistance(3.24) === "3.2 ft");
check("formatDistance meters converts", formatDistance(10, "m") === `${(10 * 0.3048).toFixed(1)} m`);

// rateMiss tiers — perfect is tight; great/good scale with the window
check("rateMiss perfect only when very close", rateMiss(0.4, 6).tier === "perfect" && rateMiss(0.6, 6).tier !== "perfect");
check("rateMiss great within half the window", rateMiss(2, 6).tier === "great");
check("rateMiss on target within window", rateMiss(5, 6).tier === "good");
check("rateMiss missed beyond window", rateMiss(7, 6).tier === "miss");

const drills = {
  anticipation: { sessions: [{ points: 800 }, { points: 600 }] },
  tracking: { sessions: [{ points: 400 }, {}] }, // legacy session, no points
};
check("career points sums and ignores missing", careerPointsFromDrills(drills) === 1800);
check("career points empty is 0", careerPointsFromDrills({}) === 0);

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
