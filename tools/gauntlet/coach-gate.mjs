// Head-Coach-gates-the-room escalation, extracted as a pure, injectable unit so
// it is testable without gauntlet-run.mjs's side-effecting main(). The caller
// injects the existing panel + reconcile-head-coach functions.
import { runAgent } from "../lib/claude-agent.mjs";
import { buildHeadCoachSoloPrompt } from "./prompts.mjs";
import { buildVisualHeadCoachSoloPrompt, buildAuditHeadCoachPrompt } from "./visual-prompts.mjs";

// Solo Head Coach (text). Returns { verdict, confidence, notes }.
async function headCoachSolo({ question, node, concept, opts }) {
  if (opts.mock) {
    const v = opts.mockSolo || "APPROVE";
    return { verdict: v, confidence: 1, notes: v === "KICK_BACK" ? ["[mock] solo kick"] : [] };
  }
  try {
    const r = await runAgent({ ...buildHeadCoachSoloPrompt({ question, node, concept }), model: opts.coachModel });
    return { verdict: r.verdict, confidence: r.confidence ?? null, notes: r.notes || [] };
  } catch (e) { return { verdict: "CONVENE", confidence: 0, notes: [`solo error: ${e.message}`] }; }
}

// Text escalation: solo first; convene the injected panel only on CONVENE.
// Returns { ok, convened, confidence, notes }.
export async function coachGate({ question, node, concept, opts, runPanel, runHeadCoach }) {
  const solo = await headCoachSolo({ question, node, concept, opts });
  if (solo.verdict === "APPROVE") return { ok: true, convened: false, confidence: solo.confidence, notes: [] };
  if (solo.verdict === "KICK_BACK") return { ok: false, convened: false, confidence: solo.confidence, notes: solo.notes.length ? solo.notes : ["head coach kickback"] };
  // CONVENE
  const panel = await runPanel(question, node, concept, opts);
  if (!panel.ok) return { ok: false, convened: true, confidence: solo.confidence, notes: panel.critiques.length ? panel.critiques : ["panel not unanimous"] };
  const head = await runHeadCoach(question, node, concept, opts);
  if (!head.ok) return { ok: false, convened: true, confidence: solo.confidence, notes: head.notes.length ? head.notes : ["head coach kickback"] };
  return { ok: true, convened: true, confidence: solo.confidence, notes: [] };
}

// Solo Head Coach (visual). Returns { verdict, confidence, notes }.
async function visualHeadCoachSolo({ scenario, ascii, node, concept, opts }) {
  if (opts.mock) {
    const v = opts.mockSolo || "APPROVE";
    return { verdict: v, confidence: 1, notes: v === "KICK_BACK" ? ["[mock] solo kick"] : [] };
  }
  try {
    const r = await runAgent({ ...buildVisualHeadCoachSoloPrompt({ scenario, ascii, node, concept }), model: opts.coachModel });
    return { verdict: r.verdict, confidence: r.confidence ?? null, notes: r.notes || [] };
  } catch (e) { return { verdict: "CONVENE", confidence: 0, notes: [`solo error: ${e.message}`] }; }
}

// Convene the drawn-question panels (hockey read, then geometry) + reconcile.
// Returns { ok, notes }.
async function conveneVisualPanels({ scenario, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach }) {
  const hockey = await runHockeyPanel(scenario, node, concept, opts);
  if (!hockey.ok) return { ok: false, notes: hockey.critiques.length ? hockey.critiques : ["hockey panel not unanimous"] };
  const visual = await runVisualPanel(scenario, node, concept, opts);
  if (!visual.ok) return { ok: false, notes: visual.critiques.length ? visual.critiques : ["visual panel not unanimous"] };
  const head = await runVisualHeadCoach(scenario, node, concept, opts);
  if (!head.ok) return { ok: false, notes: head.notes.length ? head.notes : ["head coach kickback"] };
  return { ok: true, notes: [] };
}

// Visual generation escalation: solo first, convene only on CONVENE.
export async function visualCoachGate({ scenario, ascii, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach }) {
  const solo = await visualHeadCoachSolo({ scenario, ascii, node, concept, opts });
  if (solo.verdict === "APPROVE") return { ok: true, convened: false, confidence: solo.confidence, notes: [] };
  if (solo.verdict === "KICK_BACK") return { ok: false, convened: false, confidence: solo.confidence, notes: solo.notes.length ? solo.notes : ["head coach kickback"] };
  const r = await conveneVisualPanels({ scenario, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach });
  return { ok: r.ok, convened: true, confidence: solo.confidence, notes: r.notes };
}

// Retroactive audit of an existing scenario. Returns { verdict: KEEP|REVISE|RETIRE,
// confidence, notes, convened }. On CONVENE she pulls the panels in; if they hold
// the question it resolves to KEEP, otherwise REVISE (with the panel notes).
export async function auditScenario({ scenario, ascii, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach }) {
  let verdict, confidence, notes;
  if (opts.mock) {
    verdict = opts.mockAudit || "KEEP"; confidence = 1; notes = [];
  } else {
    try {
      const r = await runAgent({ ...buildAuditHeadCoachPrompt({ scenario, ascii, node, concept }), model: opts.coachModel });
      verdict = r.verdict; confidence = r.confidence ?? null; notes = r.notes || [];
    } catch (e) { return { verdict: "REVISE", confidence: 0, notes: [`audit error: ${e.message}`], convened: false }; }
  }
  if (verdict !== "CONVENE") return { verdict, confidence, notes, convened: false };
  const r = await conveneVisualPanels({ scenario, node, concept, opts, runHockeyPanel, runVisualPanel, runVisualHeadCoach });
  return r.ok
    ? { verdict: "KEEP", confidence, notes, convened: true }
    : { verdict: "REVISE", confidence, notes: r.notes, convened: true };
}
