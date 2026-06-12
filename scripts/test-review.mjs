// Golden tests for src/review/reviewCore.js (pure logic). Run: npm run test:review
import { hasBoard, selectAndOrder, boardHash, mergeQueue, groupReviews } from "../src/review/reviewCore.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// hasBoard
check("hasBoard true for scenario w/ actors+stage", hasBoard({ type: "scenario", actors: [{ id: "a" }], stage: { view: "right" } }) === true);
check("hasBoard false for text mc", hasBoard({ type: "mc", opts: [] }) === false);
check("hasBoard false for empty actors", hasBoard({ type: "scenario", actors: [], stage: {} }) === false);

// boardHash
const s1 = { actors: [{ id: "a", x: 1, y: 2 }], stage: { view: "right", zone: "off-zone" }, interaction: { kind: "selection" }, correct: { ids: ["a"] } };
const s2 = { correct: { ids: ["a"] }, interaction: { kind: "selection" }, stage: { zone: "off-zone", view: "right" }, actors: [{ y: 2, x: 1, id: "a" }] };
check("boardHash stable across key order", boardHash(s1) === boardHash(s2));
check("boardHash changes when a coord changes", boardHash(s1) !== boardHash({ ...s1, actors: [{ id: "a", x: 9, y: 2 }] }));

// selectAndOrder
const qb = {
  "U9 / Novice": [{ id: "y", type: "scenario", actors: [{}], stage: {}, nodeId: "n2" }],
  "U13 / Peewee": [{ id: "x", type: "scenario", actors: [{}], stage: {}, nodeId: "n1" }, { id: "t", type: "mc" }],
};
const ordered = selectAndOrder(qb, new Set(["x"]));
check("selectAndOrder excludes non-board", ordered.every(q => q.id !== "t"));
check("selectAndOrder unreviewed-first", ordered[0].id === "y" && ordered.some(q => q.id === "x"));

// mergeQueue
const q1 = mergeQueue([{ scenario_id: "a", verdict: "keep" }], { scenario_id: "a", verdict: "retire" });
check("mergeQueue replaces same id (latest wins)", q1.length === 1 && q1[0].verdict === "retire");
check("mergeQueue appends new id", mergeQueue(q1, { scenario_id: "b", verdict: "keep" }).length === 2);

// groupReviews
const reviews = [
  { scenario_id: "a", verdict: "keep", board_hash: "h1", updated_at: "2026-06-11T00:00:00Z" },
  { scenario_id: "a", verdict: "retire", board_hash: "h1", updated_at: "2026-06-11T01:00:00Z" },
  { scenario_id: "b", verdict: "revise", note: "fix goalie", board_hash: "old", updated_at: "2026-06-11T00:00:00Z" },
];
const g = groupReviews(reviews, { b: "new" });
check("groupReviews latest verdict wins", g.retire.some(x => x.id === "a") && !g.keep.some(x => x.id === "a"));
check("groupReviews flags stale board", g.revise.find(x => x.id === "b")?.stale === true);
check("groupReviews carries note", g.revise.find(x => x.id === "b")?.note === "fix goalie");

console.log(`\n${failed ? failed + " FAILED" : "all passed"}`);
process.exit(failed ? 1 : 0);
