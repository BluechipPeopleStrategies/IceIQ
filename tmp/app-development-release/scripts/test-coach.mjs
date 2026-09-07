// Golden tests for tools/lib/coach-core.mjs. Run: npm run test:coach
import { coachRow, buildLogRows, groupByNode } from "../tools/lib/coach-core.mjs";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// coachRow
const seed = { id: "x1", actors: [{ id: "a", x: 1, y: 2 }], stage: { view: "right" }, interaction: { kind: "selection" }, correct: { ids: ["a"] } };
const row = coachRow({ seed, result: { verdict: "REVISE", confidence: 0.8, notes: ["only one option", "D off-rink"], convened: true }, model: "sonnet" });
check("coachRow lowercases verdict", row.verdict === "revise");
check("coachRow joins notes", row.notes === "only one option · D off-rink");
check("coachRow carries convened + model", row.convened === true && row.model === "sonnet");
check("coachRow sets a board_hash", typeof row.board_hash === "string" && row.board_hash.length === 8);
check("coachRow has no reviewed_at (DB default)", !("reviewed_at" in row));

// buildLogRows
const rows = buildLogRows({
  scenario_id: "x1", node: "u13.gap-control", change: "added a 2nd read", priorMaxIteration: 1,
  ownerReview: { verdict: "revise", note: "only one option" },
  coachReview: { notes: "antagonistic: only one viable option" },
});
check("buildLogRows iteration = prior+1", rows.every(r => r.iteration === 2));
check("buildLogRows one row per source", rows.length === 2 && rows.some(r => r.source === "owner") && rows.some(r => r.source === "coach"));
check("buildLogRows owner feedback is the note", rows.find(r => r.source === "owner").feedback === "only one option");
check("buildLogRows carries change + node", rows.every(r => r.change === "added a 2nd read" && r.node === "u13.gap-control"));
const ownerOnly = buildLogRows({ scenario_id: "x2", node: null, change: "fix", priorMaxIteration: 0, ownerReview: { note: "n" }, coachReview: null });
check("buildLogRows skips missing source", ownerOnly.length === 1 && ownerOnly[0].iteration === 1);

// groupByNode
const grouped = groupByNode([{ node: "a", scenario_id: "1" }, { node: "a", scenario_id: "2" }, { node: null, scenario_id: "3" }]);
check("groupByNode groups by node", grouped["a"].length === 2 && grouped["(unknown)"].length === 1);

console.log(`\n${failed ? failed + " FAILED" : "all passed"}`);
process.exit(failed ? 1 : 0);
