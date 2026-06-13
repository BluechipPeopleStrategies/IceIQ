import { gradedPoints, MAX_REP } from "../src/cognitive-gym/gymPoints.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// gradedPoints
check("exact gives max", gradedPoints(0) === MAX_REP);
check("clamps negative error to max", gradedPoints(-0.5) === MAX_REP);
check("error past 1 same as 1", gradedPoints(2) === gradedPoints(1));
check("monotonic decreasing", gradedPoints(0.05) > gradedPoints(0.2) && gradedPoints(0.2) > gradedPoints(0.6));
check("bang-on beats barely-right", gradedPoints(0) > gradedPoints(0.05));

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
