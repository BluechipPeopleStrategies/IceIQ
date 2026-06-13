import { gradedPoints, MAX_REP } from "../src/cognitive-gym/gymPoints.js";
import { createAdaptiveLevel } from "../src/cognitive-gym/gymEngine.js";
import { careerPointsFromDrills } from "../src/cognitive-gym/gymStorage.js";
import { DIRECTIONS, guessAxis, scorePass, feetPerPixel, formatDistance, rateMiss, RINK_LENGTH_FT, RINK_WIDTH_FT } from "../src/cognitive-gym/anticipationCore.js";
import { slotCount, flashMs, hitRadius, pickFlash, scoreTap, MIN_SLOTS, MAX_SLOTS } from "../src/cognitive-gym/eyesUpCore.js";
import { makeFormation, scoreTap as snapScoreTap, flashMs as snapFlashMs, markerCount, hitRadius as snapHitRadius, EASY_MARKERS, HARD_MARKERS } from "../src/cognitive-gym/snapshotCore.js";
import { laneClear, pointSegmentDist, makeFormation as makeLaneFormation, scoreLane, receiverCount, defenderCount, laneMargin, closeMs as laneCloseMs, EASY_RECEIVERS, HARD_RECEIVERS, EASY_DEFENDERS, HARD_DEFENDERS } from "../src/cognitive-gym/findLaneCore.js";
import { OPTIONS, makeSituation, scoreChoice, clockMs as boClockMs, teammateCount, defenderCount as boDefenderCount, EASY_TEAMMATES, HARD_TEAMMATES, EASY_DEFENDERS as BO_EASY_DEF, HARD_DEFENDERS as BO_HARD_DEF } from "../src/cognitive-gym/bestOptionCore.js";
import { digitsForLevel, travelMs, makeRound, scoreRead, CHOICES, MIN_DIGITS, MAX_DIGITS } from "../src/cognitive-gym/readNumbersCore.js";
import { changeProb, changeDelay, clockMs as lrClockMs, makeTrial, scoreTrial, teammateCount as lrTeammateCount, defenderCount as lrDefenderCount, EASY_TEAMMATES as LR_EASY_MATE, HARD_TEAMMATES as LR_HARD_MATE } from "../src/cognitive-gym/lateReadCore.js";

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

// Eyes Up (peripheral vision) — pure helpers ---------------------------------
const EW = 600, EH = 372; // a sample canvas

// difficulty climbs with level
check("eyesup slots climb with level", slotCount(1) === MIN_SLOTS && slotCount(20) === MAX_SLOTS && slotCount(10) > slotCount(1));
check("eyesup flash gets shorter with level", flashMs(1) > flashMs(10) && flashMs(10) > flashMs(20));
check("eyesup hit window tightens with level", hitRadius(1, EW, EH) > hitRadius(20, EW, EH));

// pickFlash is deterministic with an injected slot, stays inside the canvas,
// and sits farther out (closer to the boards) at higher levels.
const f1 = pickFlash(1, EW, EH, { slot: 0 });
const f1b = pickFlash(1, EW, EH, { slot: 0 });
check("eyesup pickFlash deterministic for a slot", f1.x === f1b.x && f1.y === f1b.y);
check("eyesup flash stays inside the canvas", f1.x > 0 && f1.x < EW && f1.y > 0 && f1.y < EH);
check("eyesup flash carries its slot + window", f1.slot === 0 && f1.hitR > 0 && f1.flashMs > 0);
const fLowPeriph = pickFlash(1, EW, EH, { slot: 1 }).peripheryFrac;
const fHighPeriph = pickFlash(20, EW, EH, { slot: 1 }).peripheryFrac;
check("eyesup periphery pushes outward with level", fHighPeriph > fLowPeriph);
// the flash is genuinely off-center (in the periphery), not at the middle
const offCenter = Math.hypot(f1.x - EW / 2, f1.y - EH / 2);
check("eyesup flash is off-center", offCenter > 40);

// rng injection picks a slot from the available ring
const fRng = pickFlash(1, EW, EH, { rng: () => 0.5 });
check("eyesup rng picks a valid slot", fRng.slot >= 0 && fRng.slot < fRng.slots);

// scoreTap: bang-on the flash spot = success + max points + 0 error
const flash = { x: 200, y: 150, hitR: 50 };
const euExact = scoreTap({ x: 200, y: 150 }, flash, EW, EH);
check("eyesup exact tap is success, max points, 0 error", euExact.success && euExact.points === 1000 && euExact.normError === 0);
// inside the window but off the spot: still a success, fewer points
const euInside = scoreTap({ x: 230, y: 150 }, flash, EW, EH); // 30px < 50px window
check("eyesup inside window scores less than exact", euInside.success && euInside.distPx === 30 && euInside.points < 1000);
// outside the window: a miss
const euOutside = scoreTap({ x: 200, y: 250 }, flash, EW, EH); // 100px > 50px window
check("eyesup outside window fails", !euOutside.success && euOutside.distPx === 100);
// closer tap scores higher than a farther one
const euNear = scoreTap({ x: 210, y: 150 }, flash, EW, EH);
const euFar = scoreTap({ x: 240, y: 150 }, flash, EW, EH);
check("eyesup closer tap scores higher", euNear.points > euFar.points);
// normError is normalized by the canvas diagonal
const diag = Math.sqrt(EW * EW + EH * EH);
check("eyesup normError is distance over diagonal", Math.abs(euInside.normError - 30 / diag) < 1e-9);

// Snapshot (glance memory / perception span) — pure helpers ------------------
const SW = 600, SH = 372; // a sample canvas

// difficulty climbs with level: shorter flash, more clutter, tighter window
check("snapshot flash gets shorter with level", snapFlashMs(1) > snapFlashMs(10) && snapFlashMs(10) > snapFlashMs(20));
check("snapshot markers grow with level", markerCount(1) === EASY_MARKERS && markerCount(20) === HARD_MARKERS && markerCount(10) > markerCount(1));
check("snapshot hit window tightens with level", snapHitRadius(1, SW, SH) > snapHitRadius(20, SW, SH));

// makeFormation: deterministic with an injected rng, in-bounds, non-overlapping,
// exactly one open teammate.
let snapSeed = 0;
const snapRng = () => { snapSeed = (snapSeed * 9301 + 49297) % 233280; return snapSeed / 233280; };
snapSeed = 12345;
const form = makeFormation(10, SW, SH, { rng: snapRng });
check("snapshot formation has the level's marker count", form.markers.length === markerCount(10));
check("snapshot has exactly one open teammate", form.markers.filter((m) => m.kind === "open").length === 1);
check("snapshot openIndex points at the open marker", form.markers[form.openIndex].kind === "open");
check("snapshot markers stay in-bounds", form.markers.every((m) => m.x > 0 && m.x < SW && m.y > 0 && m.y < SH));
check("snapshot markers do not overlap", form.markers.every((a, i) => form.markers.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= form.r * 2.4 - 1e-9)));
check("snapshot carries its flash + window", form.flashMs > 0 && form.hitR > 0);

// deterministic: same seed -> same formation
snapSeed = 777;
const formA = makeFormation(6, SW, SH, { rng: snapRng });
snapSeed = 777;
const formB = makeFormation(6, SW, SH, { rng: snapRng });
check("snapshot makeFormation deterministic for a seed", formA.openIndex === formB.openIndex && formA.markers[0].x === formB.markers[0].x && formA.markers[0].y === formB.markers[0].y);

// scoreTap: bang-on the open teammate = success + max points + 0 error
const openPos = { x: 200, y: 150, hitR: 50 };
const snExact = snapScoreTap({ x: 200, y: 150 }, openPos, SW, SH);
check("snapshot exact tap is success, max points, 0 error", snExact.success && snExact.points === 1000 && snExact.normError === 0);
// inside the window but off the spot: still a success, fewer points
const snInside = snapScoreTap({ x: 230, y: 150 }, openPos, SW, SH); // 30px < 50px window
check("snapshot inside window scores less than exact", snInside.success && snInside.distPx === 30 && snInside.points < 1000);
// outside the window: a miss
const snOutside = snapScoreTap({ x: 200, y: 250 }, openPos, SW, SH); // 100px > 50px window
check("snapshot outside window fails", !snOutside.success && snOutside.distPx === 100);
// closer tap scores higher than a farther one
const snNear = snapScoreTap({ x: 210, y: 150 }, openPos, SW, SH);
const snFar = snapScoreTap({ x: 240, y: 150 }, openPos, SW, SH);
check("snapshot closer tap scores higher", snNear.points > snFar.points);
// normError is normalized by the canvas diagonal
const snDiag = Math.sqrt(SW * SW + SH * SH);
check("snapshot normError is distance over diagonal", Math.abs(snInside.normError - 30 / snDiag) < 1e-9);

// Find the Lane (spatial pattern recognition) — pure helpers ------------------
const LW = 600, LH = 372; // a sample canvas

// difficulty climbs with level: more receivers, more defenders, faster close,
// tighter open margin.
check("findlane receivers grow with level", receiverCount(1) === EASY_RECEIVERS && receiverCount(20) === HARD_RECEIVERS && receiverCount(10) > receiverCount(1));
check("findlane defenders grow with level", defenderCount(1) === EASY_DEFENDERS && defenderCount(20) === HARD_DEFENDERS && defenderCount(10) > defenderCount(1));
check("findlane close gets faster with level", laneCloseMs(1) > laneCloseMs(10) && laneCloseMs(10) > laneCloseMs(20));
check("findlane open margin tightens with level", laneMargin(1, LW, LH) > laneMargin(20, LW, LH));

// pointSegmentDist: point on the segment is 0; perpendicular distance off it.
check("findlane point on segment has 0 distance", pointSegmentDist({ x: 50, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }) === 0);
check("findlane perpendicular distance off segment", Math.abs(pointSegmentDist({ x: 50, y: 10 }, { x: 0, y: 0 }, { x: 100, y: 0 }) - 10) < 1e-9);
// clamps to the nearest endpoint when the projection falls outside the segment
check("findlane clamps past the segment end", Math.abs(pointSegmentDist({ x: 130, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }) - 30) < 1e-9);

// laneClear: true when no defender sits near the segment, false when one is on it.
const you = { x: 0, y: 0 };
const recv = { x: 100, y: 0 };
check("findlane lane clear when defenders are far", laneClear(you, recv, [{ x: 50, y: 40 }, { x: 20, y: -50 }], 20) === true);
check("findlane lane blocked when a defender sits on it", laneClear(you, recv, [{ x: 50, y: 5 }], 20) === false);
check("findlane defender just outside the margin keeps the lane clear", laneClear(you, recv, [{ x: 50, y: 21 }], 20) === true);

// makeFormation: deterministic with an injected rng, in-bounds, non-overlapping,
// EXACTLY one open lane, and that lane is the openIndex.
let laneSeed = 0;
const laneRng = () => { laneSeed = (laneSeed * 9301 + 49297) % 233280; return laneSeed / 233280; };

function openLaneCount(form) {
  return form.receivers.filter((rc) => laneClear(form.you, rc, form.defenders, form.margin)).length;
}

// run several seeds and levels to be confident the invariant holds
let allExactlyOne = true;
let allInBounds = true;
let allNonOverlap = true;
let openIsOpen = true;
for (const lvl of [1, 5, 10, 15, 20]) {
  for (const seed of [1, 12345, 777, 90210, 31337]) {
    laneSeed = seed;
    const form = makeLaneFormation(lvl, LW, LH, { rng: laneRng });
    if (openLaneCount(form) !== 1) allExactlyOne = false;
    if (!laneClear(form.you, form.receivers[form.openIndex], form.defenders, form.margin)) openIsOpen = false;
    const all = [...form.receivers, ...form.defenders];
    if (!all.every((m) => m.x > 0 && m.x < LW && m.y > 0 && m.y < LH)) allInBounds = false;
    // receivers do not overlap each other; defenders are placed to block lanes so
    // they may sit on a lane near a receiver, but should not stack on receivers.
    if (!form.receivers.every((a, i) => form.receivers.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= form.r * 2.6 - 1e-9))) allNonOverlap = false;
  }
}
check("findlane formation has exactly one open lane across levels/seeds", allExactlyOne);
check("findlane the openIndex lane is the clear one", openIsOpen);
check("findlane markers stay in-bounds across levels/seeds", allInBounds);
check("findlane receivers do not overlap each other", allNonOverlap);

// formation carries the level's counts + timing
laneSeed = 42;
const lform = makeLaneFormation(10, LW, LH, { rng: laneRng });
check("findlane formation has the level's receiver count", lform.receivers.length === receiverCount(10));
check("findlane formation has the level's defender count is at least the level count", lform.defenders.length >= defenderCount(10));
check("findlane formation carries close + margin", lform.closeMs > 0 && lform.margin > 0);
check("findlane openIndex is a valid receiver index", lform.openIndex >= 0 && lform.openIndex < lform.receivers.length);

// deterministic: same seed -> same formation
laneSeed = 555;
const laneA = makeLaneFormation(8, LW, LH, { rng: laneRng });
laneSeed = 555;
const laneB = makeLaneFormation(8, LW, LH, { rng: laneRng });
check("findlane makeFormation deterministic for a seed", laneA.openIndex === laneB.openIndex && laneA.receivers[0].x === laneB.receivers[0].x && laneA.defenders.length === laneB.defenders.length);

// scoreLane: success only on the open index in time; faster = more points;
// wrong index or expired = miss worth 0.
const sFast = scoreLane(2, 2, 200, 2000); // tapped open, very fast
const sSlow = scoreLane(2, 2, 1800, 2000); // tapped open, barely in time
check("findlane success only on the open index", sFast.success && scoreLane(1, 2, 200, 2000).success === false);
check("findlane faster tap scores more points", sFast.points > sSlow.points && sFast.points > 0);
check("findlane instant tap is near max points", scoreLane(2, 2, 0, 2000).points === MAX_REP);
check("findlane wrong index is a miss worth 0", scoreLane(0, 2, 100, 2000).success === false && scoreLane(0, 2, 100, 2000).points === 0);
check("findlane no tap (-1) is a miss worth 0", scoreLane(-1, 2, 100, 2000).success === false && scoreLane(-1, 2, 100, 2000).points === 0);
check("findlane expired countdown is a miss even on the open index", scoreLane(2, 2, 2100, 2000).success === false && scoreLane(2, 2, 2100, 2000).points === 0);

// Best Option (decision speed) — pure helpers --------------------------------
const BW = 600, BH = 372; // a sample canvas

check("bestoption OPTIONS are the three reads", OPTIONS.length === 3 && OPTIONS.join() === "shoot,pass,carry");

// difficulty climbs with level: shorter clock, more teammates/defenders
check("bestoption clock gets shorter with level", boClockMs(1) > boClockMs(10) && boClockMs(10) > boClockMs(20));
check("bestoption teammates grow with level", teammateCount(1) === EASY_TEAMMATES && teammateCount(20) === HARD_TEAMMATES && teammateCount(20) > teammateCount(1));
check("bestoption defenders grow with level", boDefenderCount(1) === BO_EASY_DEF && boDefenderCount(20) === BO_HARD_DEF && boDefenderCount(20) > boDefenderCount(1));

// makeSituation: deterministic with an injected rng, valid best, in-bounds.
let boSeed = 0;
const boRng = () => { boSeed = (boSeed * 9301 + 49297) % 233280; return boSeed / 233280; };

let boBestValid = true;
let boInBounds = true;
let boReasonOk = true;
let boClockOk = true;
const seenBest = new Set();
for (const lvl of [1, 5, 10, 15, 20]) {
  for (const seed of [1, 12345, 777, 90210, 31337, 8675309]) {
    boSeed = seed;
    const s = makeSituation(lvl, BW, BH, { rng: boRng });
    if (!OPTIONS.includes(s.best)) boBestValid = false;
    seenBest.add(s.best);
    if (typeof s.reason !== "string" || s.reason.length === 0) boReasonOk = false;
    if (s.clockMs !== boClockMs(lvl)) boClockOk = false;
    const pts = [s.you, s.net, s.goalie, ...s.teammates, ...s.defenders];
    if (!pts.every((p) => p.x > 0 && p.x < BW && p.y > 0 && p.y < BH)) boInBounds = false;
  }
}
check("bestoption makeSituation returns a valid best in OPTIONS", boBestValid);
check("bestoption generates all three reads across seeds", seenBest.size === 3);
check("bestoption positions stay in-bounds across levels/seeds", boInBounds);
check("bestoption carries a non-empty reason", boReasonOk);
check("bestoption carries the level's clock", boClockOk);

// when best is pass, exactly one teammate is flagged open; when shoot/carry,
// none are flagged open (so passing is visibly not the call).
let passHasOpen = true;
let nonPassHasNoOpen = true;
for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
  boSeed = seed;
  const s = makeSituation(8, BW, BH, { rng: boRng });
  const opens = s.teammates.filter((m) => m.open).length;
  if (s.best === "pass" && opens !== 1) passHasOpen = false;
  if (s.best !== "pass" && opens !== 0) nonPassHasNoOpen = false;
}
check("bestoption a pass scene has exactly one open teammate", passHasOpen);
check("bestoption shoot/carry scenes have no open teammate", nonPassHasNoOpen);

// deterministic: same seed -> same situation
boSeed = 4242;
const boA = makeSituation(7, BW, BH, { rng: boRng });
boSeed = 4242;
const boB = makeSituation(7, BW, BH, { rng: boRng });
check("bestoption makeSituation deterministic for a seed", boA.best === boB.best && boA.you.x === boB.you.x && boA.you.y === boB.you.y && boA.defenders.length === boB.defenders.length);

// scoreChoice: success only on the matching option in time; faster = more points;
// wrong option or expired = miss worth 0.
const boFast = scoreChoice("shoot", "shoot", 200, 2000);
const boSlow = scoreChoice("shoot", "shoot", 1800, 2000);
check("bestoption success only on the matching option", boFast.success && scoreChoice("pass", "shoot", 200, 2000).success === false);
check("bestoption faster choice scores more points", boFast.points > boSlow.points && boFast.points > 0);
check("bestoption instant correct choice is max points", scoreChoice("carry", "carry", 0, 2000).points === MAX_REP);
check("bestoption wrong option is a miss worth 0", scoreChoice("pass", "carry", 100, 2000).success === false && scoreChoice("pass", "carry", 100, 2000).points === 0);
check("bestoption no pick (null) is a miss worth 0", scoreChoice(null, "shoot", 100, 2000).success === false && scoreChoice(null, "shoot", 100, 2000).points === 0);
check("bestoption expired clock is a miss even on the right option", scoreChoice("shoot", "shoot", 2100, 2000).success === false && scoreChoice("shoot", "shoot", 2100, 2000).points === 0);

// Read the Numbers (dynamic visual acuity) — pure helpers -------------------

// digit count climbs with level: 1 digit early, then 2, then 3 at the top.
check("readnumbers digits start at the minimum", digitsForLevel(1) === MIN_DIGITS);
check("readnumbers digits reach the maximum", digitsForLevel(20) === MAX_DIGITS);
check("readnumbers digits climb with level", digitsForLevel(20) > digitsForLevel(1) && digitsForLevel(10) >= digitsForLevel(1) && digitsForLevel(10) <= digitsForLevel(20));

// travel time shrinks with level (faster skater = shorter look)
check("readnumbers travel gets shorter with level", travelMs(1) > travelMs(10) && travelMs(10) > travelMs(20));

// makeRound: deterministic with an injected rng
let rnSeed = 0;
const rnRng = () => { rnSeed = (rnSeed * 9301 + 49297) % 233280; return rnSeed / 233280; };

// across levels and seeds: exactly one answer among CHOICES distinct choices,
// the answer sits at answerIndex, the number has the right digit count, and the
// travel time matches the level.
let rnDistinct = true;
let rnAnswerOnce = true;
let rnAnswerIndexOk = true;
let rnDigitsOk = true;
let rnTravelOk = true;
for (const lvl of [1, 5, 10, 15, 20]) {
  const expectDigits = digitsForLevel(lvl);
  for (const seed of [1, 12345, 777, 90210, 31337, 8675309]) {
    rnSeed = seed;
    const r = makeRound(lvl, { rng: rnRng });
    if (r.choices.length !== CHOICES) rnDistinct = false;
    if (new Set(r.choices).size !== CHOICES) rnDistinct = false;
    if (r.choices.filter((c) => c === r.number).length !== 1) rnAnswerOnce = false;
    if (r.choices[r.answerIndex] !== r.number) rnAnswerIndexOk = false;
    if (String(r.number).length !== expectDigits) rnDigitsOk = false;
    if (r.travelMs !== travelMs(lvl)) rnTravelOk = false;
  }
}
check("readnumbers round has CHOICES distinct choices", rnDistinct);
check("readnumbers answer appears exactly once among the choices", rnAnswerOnce);
check("readnumbers answerIndex points at the true number", rnAnswerIndexOk);
check("readnumbers number has the level's digit count", rnDigitsOk);
check("readnumbers round carries the level's travel time", rnTravelOk);

// deterministic: same seed -> same round
rnSeed = 4242;
const rnA = makeRound(8, { rng: rnRng });
rnSeed = 4242;
const rnB = makeRound(8, { rng: rnRng });
check("readnumbers makeRound deterministic for a seed", rnA.number === rnB.number && rnA.answerIndex === rnB.answerIndex && rnA.choices.join() === rnB.choices.join());

// scoreRead: success only on the answer index; faster answer = more points;
// wrong pick or no pick = miss worth 0.
const rnFast = scoreRead(2, 2, 200, 2000);
const rnSlow = scoreRead(2, 2, 1800, 2000);
check("readnumbers success only on the answer index", rnFast.success && scoreRead(1, 2, 200, 2000).success === false);
check("readnumbers faster answer scores more points", rnFast.points > rnSlow.points && rnFast.points > 0);
check("readnumbers instant correct answer is max points", scoreRead(2, 2, 0, 2000).points === MAX_REP);
check("readnumbers wrong pick is a miss worth 0", scoreRead(0, 2, 100, 2000).success === false && scoreRead(0, 2, 100, 2000).points === 0);
check("readnumbers no pick (-1) is a miss worth 0", scoreRead(-1, 2, 100, 2000).success === false && scoreRead(-1, 2, 100, 2000).points === 0);
check("readnumbers no pick (null) is a miss worth 0", scoreRead(null, 2, 100, 2000).success === false && scoreRead(null, 2, 100, 2000).points === 0);

// Late Read (cognitive flexibility / inhibition) — pure helpers --------------
const RW = 600, RH = 372; // a sample canvas

// difficulty climbs with level: more change reps, the switch fires LATER, the
// clock is shorter, and more teammates.
check("lateread change probability rises with level", changeProb(1) < changeProb(10) && changeProb(10) < changeProb(20));
check("lateread clock gets shorter with level", lrClockMs(1) > lrClockMs(10) && lrClockMs(10) > lrClockMs(20));
// the change fires later as a fraction of the clock (compare against a fixed clock)
check("lateread change fires later with level", changeDelay(1, 3000) < changeDelay(10, 3000) && changeDelay(10, 3000) < changeDelay(20, 3000));
check("lateread teammates grow with level", lrTeammateCount(1) === LR_EASY_MATE && lrTeammateCount(20) === LR_HARD_MATE && lrTeammateCount(20) > lrTeammateCount(1));
check("lateread defenders are present and grow with level", lrDefenderCount(20) > lrDefenderCount(1));

// makeTrial: deterministic with an injected rng; index invariants and in-bounds.
let lrSeed = 0;
const lrRng = () => { lrSeed = (lrSeed * 9301 + 49297) % 233280; return lrSeed / 233280; };

let lrIndexOk = true;     // on no-change first===final; on change they differ
let lrInBounds = true;
let lrValidIdx = true;    // first/final are valid teammate indices
let lrChangeAtOk = true;  // changeAtMs set iff a change rep, within (0, clock)
let lrClockOk = true;
let sawChange = false;
let sawNoChange = false;
for (const lvl of [1, 5, 10, 15, 20]) {
  for (const seed of [1, 12345, 777, 90210, 31337, 8675309, 555, 42]) {
    lrSeed = seed;
    const tr = makeTrial(lvl, RW, RH, { rng: lrRng });
    const n = tr.teammates.length;
    if (tr.firstIndex < 0 || tr.firstIndex >= n) lrValidIdx = false;
    if (tr.finalIndex < 0 || tr.finalIndex >= n) lrValidIdx = false;
    if (tr.changes) {
      sawChange = true;
      if (tr.firstIndex === tr.finalIndex) lrIndexOk = false;
      if (!(tr.changeAtMs > 0 && tr.changeAtMs < tr.clockMs)) lrChangeAtOk = false;
    } else {
      sawNoChange = true;
      if (tr.firstIndex !== tr.finalIndex) lrIndexOk = false;
      if (tr.changeAtMs !== null) lrChangeAtOk = false;
    }
    if (tr.clockMs !== lrClockMs(lvl)) lrClockOk = false;
    const pts = [tr.you, ...tr.teammates, ...tr.defenders];
    if (!pts.every((p) => p.x > 0 && p.x < RW && p.y > 0 && p.y < RH)) lrInBounds = false;
  }
}
check("lateread no-change has first===final, change has first!==final", lrIndexOk);
check("lateread first/final are valid teammate indices", lrValidIdx);
check("lateread changeAtMs set only on change reps and within the clock", lrChangeAtOk);
check("lateread carries the level's clock", lrClockOk);
check("lateread positions stay in-bounds across levels/seeds", lrInBounds);
check("lateread generates both change and no-change reps", sawChange && sawNoChange);

// deterministic: same seed -> same trial
lrSeed = 4242;
const lrA = makeTrial(8, RW, RH, { rng: lrRng });
lrSeed = 4242;
const lrB = makeTrial(8, RW, RH, { rng: lrRng });
check("lateread makeTrial deterministic for a seed", lrA.firstIndex === lrB.firstIndex && lrA.finalIndex === lrB.finalIndex && lrA.teammates[0].x === lrB.teammates[0].x && lrA.defenders.length === lrB.defenders.length);

// scoreTrial: success only on the FINAL index in time; faster after settle =
// more points; the pre-change index (and any wrong index / no tap / expiry) is a
// miss worth 0.
const lrFast = scoreTrial(2, 2, 1100, 1000, 3000); // tapped final, just after settle
const lrSlow = scoreTrial(2, 2, 2800, 1000, 3000); // tapped final, late
check("lateread success only on the final index", lrFast.success && scoreTrial(1, 2, 1100, 1000, 3000).success === false);
check("lateread faster tap after settle scores more points", lrFast.points > lrSlow.points && lrFast.points > 0);
check("lateread instant-after-settle tap is max points", scoreTrial(2, 2, 1000, 1000, 3000).points === MAX_REP);
check("lateread tapping the pre-change teammate is a miss worth 0", scoreTrial(0, 2, 1100, 1000, 3000).success === false && scoreTrial(0, 2, 1100, 1000, 3000).points === 0);
check("lateread no tap (-1) is a miss worth 0", scoreTrial(-1, 2, 1100, 1000, 3000).success === false && scoreTrial(-1, 2, 1100, 1000, 3000).points === 0);
check("lateread no tap (null) is a miss worth 0", scoreTrial(null, 2, 1100, 1000, 3000).success === false && scoreTrial(null, 2, 1100, 1000, 3000).points === 0);
check("lateread expired clock is a miss even on the final index", scoreTrial(2, 2, 3100, 1000, 3000).success === false && scoreTrial(2, 2, 3100, 1000, 3000).points === 0);
// a no-change rep settles at 0, so points reward speed from the start
check("lateread no-change settle 0 still grades speed", scoreTrial(2, 2, 0, 0, 3000).points === MAX_REP && scoreTrial(2, 2, 2900, 0, 3000).points < scoreTrial(2, 2, 100, 0, 3000).points);

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
