import assert from "node:assert/strict";
import test from "node:test";

import {
  SHOOTOUT_CELL_LAYOUT,
  goalieTargetForCell,
  describeShootoutCells,
  shiftPausedTimestamp,
  shootoutHitRegion, SHOOTOUT_MOUTH, BEST_OPTION_BLUE_LINES, normalizedRinkPoint,
} from "./gymVisualCore.js";

const shot = {
  coveredAtStart: ["midHi", "fiveHole"],
  closeSchedule: [
    { cellId: "gloveHi", atMs: 900 },
    { cellId: "blkrLo", atMs: 1200 },
  ],
  shotClockMs: 1800,
};

test('hit regions cover the whole mouth without dead seams or margins', () => {
  const boxes = SHOOTOUT_CELL_LAYOUT.map(shootoutHitRegion);
  for (let col=0;col<3;col++) for(let row=0;row<2;row++) {
    const b=boxes[row*3+col];
    assert.ok(Math.abs(b.x-b.width/2-(-2.05+col*4.1/3))<1e-9);
    assert.ok(Math.abs(b.y+b.height/2-(1.32-row*1.32))<1e-9);
  }
  assert.ok(Math.abs(boxes.reduce((n,b)=>n+b.width*b.height,0)-(SHOOTOUT_MOUTH.right-SHOOTOUT_MOUTH.left)*2.64)<1e-9);
});

test('offside teaching lines use the same projection as graded player positions',()=>{
  assert.deepEqual(BEST_OPTION_BLUE_LINES,[.375,.625].map(x=>normalizedRinkPoint({x:x*600,y:0},600,372).x));
});

test("3D shootout layout preserves the core's exact six-cell order and geometry", () => {
  assert.deepEqual(
    SHOOTOUT_CELL_LAYOUT.map(({ id }) => id),
    ["gloveHi", "midHi", "blkrHi", "gloveLo", "fiveHole", "blkrLo"]
  );
  assert.deepEqual(
    SHOOTOUT_CELL_LAYOUT.map(({ column, row }) => [column, row]),
    [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]
  );
});

test("shootout cell presentation delegates coverage truth to the scoring core", () => {
  const early = describeShootoutCells(shot, 400);
  assert.equal(early.find(({ id }) => id === "gloveHi").state, "open");
  assert.equal(early.find(({ id }) => id === "midHi").state, "covered");
  assert.equal(early.find(({ id }) => id === "fiveHole").state, "covered");
  assert.equal(early.find(({ id }) => id === "gloveHi").cue, "OPEN");
  assert.equal(early.find(({ id }) => id === "midHi").cue, "COVERED");

  const late = describeShootoutCells(shot, 1000);
  assert.equal(late.find(({ id }) => id === "gloveHi").state, "covered");
  assert.equal(late.find(({ id }) => id === "blkrLo").state, "open");
});

test("goalie animation targets the same normalized centre as the selected cell", () => {
  for (const cell of SHOOTOUT_CELL_LAYOUT) {
    const target = goalieTargetForCell(cell.id);
    assert.equal(target.x, cell.x);
    assert.equal(target.y, cell.y);
  }
});

test("hidden-tab pauses shift live and animation timestamps without changing null values", () => {
  assert.equal(shiftPausedTimestamp(1_000, 725), 1_725);
  assert.equal(shiftPausedTimestamp(null, 725), null);
  assert.equal(shiftPausedTimestamp(undefined, 725), undefined);
});
