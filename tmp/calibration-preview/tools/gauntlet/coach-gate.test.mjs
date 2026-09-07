#!/usr/bin/env node
// Run: node tools/gauntlet/coach-gate.test.mjs
import { coachGate, visualCoachGate, auditScenario } from "./coach-gate.mjs";

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

const node = { id: "u11.x", ageId: "u11", conceptId: "x" };
const concept = { name: "X", definition: "d", readConnection: "r" };
const q = { id: "q1", ok: 0 };

// stubs record whether they were called
const mkPanel = (okv) => { let called = false; const fn = async () => { called = true; return { ok: okv, critiques: okv ? [] : ["nope"] }; }; fn.was = () => called; return fn; };
const mkHead = (okv) => async () => ({ ok: okv, notes: okv ? [] : ["kick"] });

await (async () => {
  // APPROVE solo -> ok, panel NOT convened
  const panel = mkPanel(true);
  const r1 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "APPROVE" }, runPanel: panel, runHeadCoach: mkHead(true) });
  ok("solo APPROVE -> ok", r1.ok === true);
  ok("solo APPROVE -> not convened", r1.convened === false);
  ok("solo APPROVE -> panel untouched", panel.was() === false);

  // KICK_BACK solo -> not ok, panel NOT convened
  const panel2 = mkPanel(true);
  const r2 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "KICK_BACK" }, runPanel: panel2, runHeadCoach: mkHead(true) });
  ok("solo KICK_BACK -> not ok", r2.ok === false);
  ok("solo KICK_BACK -> panel untouched", panel2.was() === false);

  // CONVENE solo + panel passes + head approves -> ok, convened
  const panel3 = mkPanel(true);
  const r3 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "CONVENE" }, runPanel: panel3, runHeadCoach: mkHead(true) });
  ok("CONVENE + pass -> ok", r3.ok === true);
  ok("CONVENE -> convened true", r3.convened === true);
  ok("CONVENE -> panel was run", panel3.was() === true);

  // CONVENE + panel fails -> not ok
  const r4 = await coachGate({ question: q, node, concept, opts: { mock: true, mockSolo: "CONVENE" }, runPanel: mkPanel(false), runHeadCoach: mkHead(true) });
  ok("CONVENE + panel fail -> not ok", r4.ok === false);
})();

await (async () => {
  const scenario = { id: "s1", type: "scenario", actors: [] };
  const ascii = "RINK";
  const mkP = (okv) => { let c = false; const fn = async () => { c = true; return { ok: okv, critiques: okv ? [] : ["x"] }; }; fn.was = () => c; return fn; };
  const mkH = (okv) => async () => ({ ok: okv, notes: [] });

  // visual APPROVE -> panels untouched
  const hp = mkP(true), vp = mkP(true);
  const rv = await visualCoachGate({ scenario, ascii, node, concept, opts: { mock: true, mockSolo: "APPROVE" }, runHockeyPanel: hp, runVisualPanel: vp, runVisualHeadCoach: mkH(true) });
  ok("visual APPROVE -> ok", rv.ok === true);
  ok("visual APPROVE -> hockey panel untouched", hp.was() === false);

  // audit returns the verdict verb straight through (mock)
  const a1 = await auditScenario({ scenario, ascii, node, concept, opts: { mock: true, mockAudit: "REVISE" }, runHockeyPanel: mkP(true), runVisualPanel: mkP(true), runVisualHeadCoach: mkH(true) });
  ok("audit REVISE passthrough", a1.verdict === "REVISE");
  // audit CONVENE in mock resolves to KEEP when panels pass
  const a2 = await auditScenario({ scenario, ascii, node, concept, opts: { mock: true, mockAudit: "CONVENE" }, runHockeyPanel: mkP(true), runVisualPanel: mkP(true), runVisualHeadCoach: mkH(true) });
  ok("audit CONVENE+pass -> KEEP", a2.verdict === "KEEP");
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
