// Tests for src/scenario/branching.js (pure). Run: npm run test:branching
import { toGraph, flattenNode, framesOf, start, frameFor, record, routeFor, advance, isTerminal, summary } from "../src/scenario/branching.js";
import { validateScenario } from "../src/scenario/schema.js";

let failed = 0;
const check = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); if (!c) failed++; };

// Minimal valid frame: a point read with one placed actor.
const frame = (aid) => ({
  actors: [{ id: aid, kind: "player", x: 0.5, y: 0.5 }],
  interaction: { kind: "point", prompt: "p" },
  correct: { kind: "point", x: 0.5, y: 0.5, tolerance: 0.1 },
  feedback: { right: "r", wrong: "w" },
});
const flat = { id: "f", type: "scenario", stage: { view: "right" }, ...frame("a") };
const stepped = { id: "s", type: "scenario", stage: { view: "right" }, steps: [
  { ...frame("a"), outcome: "o1" },
  { ...frame("b") },
] };
const branched = { id: "b", type: "scenario", stage: { view: "right" }, entry: ["start"], nodes: {
  start: { ...frame("a"), routes: [{ on: "correct", outcome: "good", next: "win" }, { on: "else", outcome: "bad", next: "lose" }] },
  win:  { ...frame("w"), routes: [] },
  lose: { ...frame("l"), routes: [] },
} };

// toGraph
check("toGraph flat -> 1 node", Object.keys(toGraph(flat).nodes).length === 1 && toGraph(flat).entry[0] === "s0");
check("toGraph steps -> chain", (() => { const g = toGraph(stepped); return g.nodes.s0.routes[0].next === "s1" && g.nodes.s1.routes.length === 0; })());
check("toGraph nodes -> passthrough", toGraph(branched).entry[0] === "start" && Object.keys(toGraph(branched).nodes).length === 3);

// flattenNode carries top-level + node fields, drops graph keys
const fn = flattenNode(branched, "win");
check("flattenNode has top id + stage", fn.id === "b" && fn.stage.view === "right");
check("flattenNode has node actors, no routes/nodes/entry", fn.actors[0].id === "w" && !fn.routes && !fn.nodes && !fn.entry);

// framesOf
check("framesOf flat -> 1", framesOf(flat).length === 1);
check("framesOf branched -> 3", framesOf(branched).length === 3);

// state machine: correct path
let st = start(branched);
check("start at entry", st.nodeId === "start");
check("frameFor start", frameFor(st).actors[0].id === "a");
st = record(st, { ok: true });
const rc = routeFor(st, { ok: true });
check("route correct -> win", rc.next === "win" && rc.outcome === "good");
st = advance(st, rc);
check("advanced to win", st.nodeId === "win" && isTerminal(st));
check("summary correct path", summary(st).correct === 1 && summary(st).total === 2);

// wrong path -> lose
let st2 = start(branched);
const rw = routeFor(st2, { ok: false });
check("route wrong -> lose", rw.next === "lose");

// validation (Task 2)
check("validate good graph ok", validateScenario(branched).ok);
const danglingNext = { ...branched, nodes: { ...branched.nodes, start: { ...branched.nodes.start, routes: [{ on: "correct", next: "nope" }, { on: "else", next: "lose" }] } } };
check("validate dangling next -> error", !validateScenario(danglingNext).ok);
const badEntry = { ...branched, entry: ["missing"] };
check("validate bad entry -> error", !validateScenario(badEntry).ok);
const combined = { ...branched, steps: [{}] };
check("validate nodes+steps -> error", !validateScenario(combined).ok);

console.log(failed ? `\n${failed} FAILED` : "\nAll passed");
process.exit(failed ? 1 : 0);
