#!/usr/bin/env node
// Run: node src/scenario/placeReveal.test.mjs
//
// Guards the place primitive's post-answer reveal — the only teaching moment a
// misplaced player ever gets.
//
// Five of the six seeds that use `place` set showTargets:false (the sixth omits
// it, which is the same thing), so the ONLY time the correct spot is ever drawn
// is after the answer. On 2026-08-03 that reveal was actively misleading:
// place.jsx stroked the correct target RED whenever the player got that item
// wrong — the identical red as the player's own misplaced token — so the answer
// and the mistake were the same colour and nothing on the board said "here is
// where they should have gone". Its two sibling primitives already got this
// right (point.jsx keeps the target green and only fades it; selection.jsx
// gives missed-correct actors a green dashed glow), so this is the class of
// defect the file locks: THE TARGET IS THE ANSWER, NEVER THE ERROR.
//
// Three more holes are locked here too:
//   · the target rings carried no identity, so the three forwards of
//     u13_breakout_position_place_v1 revealed as three anonymous rings,
//   · there was no arrow from where a player started to where they belonged,
//   · nothing revealed at all on a timeout, because the parent locks the board
//     without calling check() so `score` stayed null.
//
// Structured as source-scan + pure-unit, the two patterns already used in this
// repo (colorblindCoverage.test.mjs scans, goalieAnchor.test.mjs computes),
// because a .jsx cannot be imported from plain node.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { revealPlan, shouldAutoReveal, arrowFor, verdictPalette } from "./primitives/place-reveal.js";
import { scorePlace } from "./primitives/place-scorer.js";
import { resolveTarget } from "./zones.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const JSX = readFileSync(join(HERE, "primitives", "place.jsx"), "utf8");

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

// ---------------------------------------------------------------- fixtures --
// Shaped after u13_breakout_position_place_v1: three forwards, tagged, dragged
// from their authored starts to three separate targets.
const actors = [
  { id: "sw", kind: "player", x: 0.34, y: 0.62, tag: "RW" },
  { id: "c", kind: "teammate", x: 0.46, y: 0.50, tag: "C" },
  { id: "ww", kind: "teammate", x: 0.34, y: 0.34, tag: "LW" },
];
const actorById = Object.fromEntries(actors.map(a => [a.id, a]));
const items = ["sw", "c", "ww"];
const correct = {
  kind: "place",
  placements: [
    { id: "sw", x: 0.11, y: 0.63, tolerance: 0.08 },
    { id: "c", x: 0.28, y: 0.50, tolerance: 0.09 },
    { id: "ww", x: 0.20, y: 0.20, tolerance: 0.08 },
  ],
};
const targets = Object.fromEntries(correct.placements.map(p => [p.id, resolveTarget(p)]));

// One right (sw dropped on its target), two wrong.
const positions = {
  sw: { x: 0.11, y: 0.63 },
  c: { x: 0.50, y: 0.20 },
  ww: { x: 0.60, y: 0.80 },
};
const allMoved = { sw: true, c: true, ww: true };

function planFor(pos, moved = allMoved, colorblind = false) {
  const score = scorePlace(pos, correct);
  const resultById = Object.fromEntries(score.placements.map(r => [r.id, r]));
  return { score, plan: revealPlan({ items, actorById, targets, resultById, moved, colorblind }) };
}

const { score, plan } = planFor(positions);

// ---- 1. a reveal exists for EVERY item, not just the ones they got wrong ----
ok("scorer sees one right and two wrong", score.ok === false
  && score.placements.filter(r => r.ok).length === 1);
ok(`reveal element for every item (got ${plan.length}/${items.length})`, plan.length === items.length);
ok("every reveal has finite ellipse geometry",
  plan.every(p => [p.cx, p.cy, p.rx, p.ry].every(Number.isFinite) && p.rx > 0 && p.ry > 0));

// ---- 2. the target is the ANSWER colour regardless of right/wrong -----------
// The original bug, stated as an assertion. If someone reintroduces "red when
// this item was wrong", these fail.
const P = verdictPalette(false);
ok("target stroke is the CORRECT colour on items the player got wrong",
  plan.filter(p => !p.ok).every(p => p.targetStroke === P.correct));
ok("target stroke is identical for right and wrong items",
  new Set(plan.map(p => p.targetStroke)).size === 1);
ok("no target is ever stroked the WRONG colour",
  plan.every(p => p.targetStroke !== P.wrong));
ok("only the WEIGHT differs between a hit and a miss",
  plan.find(p => p.ok).targetOpacity > plan.find(p => !p.ok).targetOpacity);
ok("the player's own wrong token IS the wrong colour (so the two are distinct)",
  plan.filter(p => !p.ok).every(p => p.ring === P.wrong && p.ring !== p.targetStroke));

// ---- 3. identity: three rings on one rink must be tellable apart ------------
ok("every reveal carries the actor's tag",
  plan.map(p => p.label).join(",") === "RW,C,LW");
ok("labels are placed inside the 0..300 board", plan.every(p => p.labelY > 0 && p.labelY < 300));

// ---- 4. the movement arrow -------------------------------------------------
const wrongPlans = plan.filter(p => !p.ok);
ok("wrong placements get a movement arrow", wrongPlans.every(p => p.arrow));
ok("correct placements get no arrow (ink without information)",
  plan.filter(p => p.ok).every(p => !p.arrow));
// The arrow answers "where should this player have gone", so it must start at
// the AUTHORED position — where they were when the question was asked — not at
// wherever the player happened to drop the token.
const cArrow = plan.find(p => p.id === "c").arrow;
ok("arrow tail sits at the authored start, not the drop point",
  Math.abs(cArrow.tailX - actorById.c.x * 600) < 0.001
  && Math.abs(cArrow.tailY - actorById.c.y * 300) < 0.001);
ok("arrow head stops on the target ring, not at its centre", (() => {
  const p = plan.find(x => x.id === "c");
  const d = Math.hypot(p.cx - cArrow.x2, p.cy - cArrow.y2);
  return d > 1 && d <= Math.max(p.rx, p.ry) + 0.5;
})());
ok("a movement too small to draw returns no arrow",
  arrowFor({ x: 100, y: 100 }, { x: 104, y: 100 }, 20, 10) === null);

// ---- 5. the timeout path ---------------------------------------------------
// The parent times a question out by locking the board WITHOUT calling check(),
// so `score` never lands. A reveal must still appear.
ok("reveal fires when locked goes true with no score",
  shouldAutoReveal({ locked: true, everUnlocked: true, hasScore: false }) === true);
ok("reveal does NOT fire during the preview lock (locked from the first render)",
  shouldAutoReveal({ locked: true, everUnlocked: false, hasScore: false }) === false);
ok("no duplicate reveal once a score exists",
  shouldAutoReveal({ locked: true, everUnlocked: true, hasScore: true }) === false);
ok("no reveal while the board is still live",
  shouldAutoReveal({ locked: false, everUnlocked: true, hasScore: false }) === false);

// A timed-out player has typically dragged nothing: every token still sits on
// its authored start, and the reveal must still draw all three targets.
const timedOut = planFor(
  Object.fromEntries(items.map(id => [id, { x: actorById[id].x, y: actorById[id].y }])),
  {},
);
ok(`timeout reveal still draws every target (${timedOut.plan.length}/${items.length})`,
  timedOut.plan.length === items.length);
ok("timeout reveal keeps the target on the CORRECT colour",
  timedOut.plan.every(p => p.targetStroke === P.correct));
ok("a token the player never dragged is marked neither right nor wrong",
  timedOut.plan.every(p => p.glyph === "" && p.ring !== P.wrong && p.ring !== P.correct));

// ---- 6. colour is never the only channel -----------------------------------
const cb = planFor(positions, allMoved, true).plan;
ok("colorblind mode swaps the verdict pair",
  cb.every(p => p.targetStroke === verdictPalette(true).correct)
  && cb.find(p => !p.ok).ring === verdictPalette(true).wrong);
ok("right/wrong is also carried by a glyph, not just hue",
  plan.find(p => p.ok).glyph === "✓" && plan.find(p => !p.ok).glyph === "✗");
ok("target vs token is also carried by the dash pattern",
  plan.every(p => typeof p.targetDash === "string" && p.targetDash.includes(" ")));
ok("the movement arrow is neither verdict colour",
  plan.every(p => p.arrowColor !== P.correct && p.arrowColor !== P.wrong
    && p.arrowColor !== verdictPalette(true).correct && p.arrowColor !== verdictPalette(true).wrong));

// ---- 7. the .jsx cannot quietly go back to deciding colours itself ----------
// place.jsx renders what place-reveal.js returns. A hardcoded verdict colour in
// the reveal path is how the original bug looked, so the raw literals are
// banned from the component outside the drag/idle affordances.
ok("place.jsx delegates the reveal to place-reveal.js",
  /from "\.\/place-reveal\.js"/.test(JSX) && /revealPlan\(/.test(JSX));
ok("place.jsx hardcodes no red", !/#ef4444/i.test(JSX));
// The one legitimate green left in the component is the Check button's enabled
// state, which is a control affordance and not a verdict.
ok("place.jsx hardcodes no verdict green outside the Check button",
  JSX.split("\n").filter(l => /#22c55e/i.test(l)).every(l => /allMoved/.test(l)));
ok("place.jsx no longer gates the reveal on score alone",
  !/const reveal = !!score/.test(JSX) && /revealed/.test(JSX));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
