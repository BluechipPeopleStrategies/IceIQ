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
