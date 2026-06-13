// Golden tests for tools/lib/auto-revise-core.mjs (pure logic). Run: npm run test:auto-revise
import { applyEdit, decideApply, buildReviseLogRow, reviseReport } from "../tools/lib/auto-revise-core.mjs";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

// applyEdit: deep-merge, arrays replaced wholesale, no mutation
const base = { id: "x", tip: "old", read: { cue: "c", decoy: { x: 0.1, y: 0.2 } }, actors: [{ id: "a" }, { id: "b" }] };
const edited = applyEdit(base, { tip: "new", read: { decoy: { x: 0.9 } }, actors: [{ id: "z" }] });
check("applyEdit replaces scalar", edited.tip === "new");
check("applyEdit deep-merges nested object", edited.read.cue === "c" && edited.read.decoy.x === 0.9 && edited.read.decoy.y === 0.2);
check("applyEdit replaces array wholesale", edited.actors.length === 1 && edited.actors[0].id === "z");
check("applyEdit preserves untouched top-level", edited.id === "x");
check("applyEdit does not mutate input", base.tip === "old" && base.actors.length === 2 && base.read.decoy.x === 0.1);
check("applyEdit empty edit is no-op clone", JSON.stringify(applyEdit(base, {})) === JSON.stringify(base));
check("applyEdit null edit returns scenario", applyEdit(base, null) === base);

// decideApply: errs -> reject; warns only -> apply-marked; clean -> apply
check("decideApply reject on errors", decideApply({ errs: ["bad"], warns: [] }) === "reject");
check("decideApply apply-marked on warnings", decideApply({ errs: [], warns: ["meh"] }) === "apply-marked");
check("decideApply apply when clean", decideApply({ errs: [], warns: [] }) === "apply");
check("decideApply tolerates missing fields", decideApply({}) === "apply");

// buildReviseLogRow: one coach row, iteration = prior+1
const row = buildReviseLogRow({ scenario_id: "x", node: "u9.support", change: "moved YOU deep", coachNotes: "single option", priorMaxIteration: 2 });
check("logRow source coach", row.source === "coach");
check("logRow iteration prior+1", row.iteration === 3);
check("logRow carries change + feedback", row.change === "moved YOU deep" && row.feedback === "single option");
check("logRow node + scenario_id", row.scenario_id === "x" && row.node === "u9.support");
check("logRow iteration defaults to 1", buildReviseLogRow({ scenario_id: "x" }).iteration === 1);

// reviseReport: markdown with tally + per-board lines
const md = reviseReport([
  { id: "a", action: "applied", change: "fix", errs: [], warns: [] },
  { id: "b", action: "applied-marked", change: "fix2", errs: [], warns: ["w1"] },
  { id: "c", action: "flagged", error: "hard errors after retry", errs: ["e1"], warns: [] },
  { id: "d", action: "retired", change: "archived" },
], "2026-06-13");
check("report has heading", md.includes("# Coach Auto-Revise — 2026-06-13"));
check("report lists each board", md.includes("## a") && md.includes("## b") && md.includes("## c") && md.includes("## d"));
check("report marks warnings", md.includes("## b — applied-marked ⚠"));
check("report shows tally", md.includes("applied 1") && md.includes("retired 1"));

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
