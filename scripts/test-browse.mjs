// Golden tests for src/review/browseCore.js (pure logic). Run: npm run test:browse
import { ageTierOf, ageTiers, flagOf, applyFilters, iterationHeadline, groupIterations } from "../src/review/browseCore.js";

let failed = 0;
const check = (name, cond) => { console.log(`${cond ? "PASS" : "FAIL"}  ${name}`); if (!cond) failed++; };

const mk = (id, level, nodeId = "n") => ({ id, type: "scenario", stage: {}, actors: [{}], levels: [level], nodeId });
const scn = [mk("a", "U7"), mk("b", "U11"), mk("c", "U11"), mk("d", "U13")];

// ageTierOf / ageTiers
check("ageTierOf reads first level", ageTierOf(mk("x", "U9")) === "U9");
check("ageTierOf empty when no level", ageTierOf({ }) === "");
check("ageTiers sorted unique", JSON.stringify(ageTiers(scn)) === JSON.stringify(["U11", "U13", "U7"]));

// flagOf: coach != keep -> coach; my revise/retire -> mine; neither -> unreviewed; my keep + coach keep -> clean
check("flagOf coach when coach not keep", flagOf(mk("a","U7"), { verdict: "revise" }, null) === "coach");
check("flagOf mine when my verdict retire", flagOf(mk("a","U7"), null, { verdict: "retire" }) === "mine");
check("flagOf unreviewed when nothing", flagOf(mk("a","U7"), null, null) === "unreviewed");
check("flagOf clean when both keep", flagOf(mk("a","U7"), { verdict: "keep" }, { verdict: "keep" }) === "clean");
check("flagOf coach wins over my keep", flagOf(mk("a","U7"), { verdict: "revise" }, { verdict: "keep" }) === "coach");

// applyFilters
const coachById = { b: { verdict: "revise" } };
const myById = { d: { verdict: "retire" } };
check("applyFilters all returns everything", applyFilters(scn, { flagScope: "all", ageTier: "all" }, coachById, myById).length === 4);
check("applyFilters coach scope", applyFilters(scn, { flagScope: "coach", ageTier: "all" }, coachById, myById).map(s=>s.id).join() === "b");
check("applyFilters mine scope", applyFilters(scn, { flagScope: "mine", ageTier: "all" }, coachById, myById).map(s=>s.id).join() === "d");
check("applyFilters unreviewed scope", applyFilters(scn, { flagScope: "unreviewed", ageTier: "all" }, coachById, myById).map(s=>s.id).sort().join() === "a,c");
check("applyFilters age tier", applyFilters(scn, { flagScope: "all", ageTier: "U11" }, coachById, myById).map(s=>s.id).sort().join() === "b,c");
check("applyFilters flag + age combined", applyFilters(scn, { flagScope: "coach", ageTier: "U11" }, coachById, myById).map(s=>s.id).join() === "b");

// iterationHeadline: change wins; falls back to feedback; else "(no detail)"
check("headline uses change when present", iterationHeadline({ change: "added a 2nd read", feedback: "only one option" }) === "added a 2nd read");
check("headline falls back to feedback", iterationHeadline({ change: "", feedback: "only one option" }) === "only one option");
check("headline blank both -> placeholder", iterationHeadline({ change: "", feedback: "" }) === "(no detail)");
check("headline whitespace -> placeholder", iterationHeadline({ change: "   ", feedback: "" }) === "(no detail)");
check("headline trims", iterationHeadline({ change: "  trimmed  " }) === "trimmed");
check("headline null-safe", iterationHeadline(null) === "(no detail)");

// groupIterations: owner + coach rows of one resolve share an iteration + change → ONE group.
const owner1 = { scenario_id: "s", iteration: 1, source: "owner", change: "Moved YOU deep", feedback: "not in corner", node: "dz", created_at: "2026-06-13T12:00:00Z" };
const coach1 = { scenario_id: "s", iteration: 1, source: "coach", change: "Moved YOU deep", feedback: "single-option", node: "dz", created_at: "2026-06-13T12:00:00Z" };
const owner2 = { scenario_id: "s", iteration: 2, source: "owner", change: "Added end labels", feedback: "which way?", node: "dz", created_at: "2026-06-13T14:00:00Z" };
const g1 = groupIterations([owner1, coach1]);
check("group: owner+coach same iter -> 1 group", g1.length === 1);
check("group: change preserved", g1[0].change === "Moved YOU deep");
check("group: both feedbacks kept", g1[0].sources.length === 2);
check("group: sources carry source+feedback", g1[0].sources[0].source === "owner" && g1[0].sources[1].source === "coach");
check("group: date from row", g1[0].created_at === "2026-06-13T12:00:00Z");

const g2 = groupIterations([owner1, coach1, owner2]);
check("group: two iterations -> 2 groups", g2.length === 2);
check("group: newest iteration first", g2[0].iteration === 2 && g2[1].iteration === 1);

// dedupe identical source+feedback within a group (e.g. accidental duplicate insert)
const dupd = groupIterations([owner1, { ...owner1 }]);
check("group: dedupe identical rows", dupd.length === 1 && dupd[0].sources.length === 1);

// null iteration rows must not merge into one group
const nullA = { scenario_id: "s", iteration: null, source: "owner", change: "A", feedback: "a", created_at: "2026-06-13T10:00:00Z" };
const nullB = { scenario_id: "s", iteration: null, source: "owner", change: "B", feedback: "b", created_at: "2026-06-13T11:00:00Z" };
check("group: null iterations don't merge", groupIterations([nullA, nullB]).length === 2);

check("group: empty input -> []", JSON.stringify(groupIterations([])) === "[]");
check("group: null input -> []", JSON.stringify(groupIterations(null)) === "[]");

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
