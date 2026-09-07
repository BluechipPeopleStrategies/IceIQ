import { useState } from "react";
import { buildPatch, applyOverride } from "./overrides.js";
import { upsertQuestionOverride } from "../supabase.js";
import { validateScenario } from "../scenario/schema.js";
import { runHockeyValidators } from "../scenario/validators.js";
import { C, FONT } from "../shared.jsx";

// Edit a question's TEXT in place (stem, options, correct, feedback, tip).
// Saving writes a DB override that's live immediately. Geometry/positions are
// Phase 3. A scenario edit is validated (schema + hockey) before it can save.
const field = { width: "100%", padding: ".5rem", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.white, fontFamily: FONT.body, fontSize: ".85rem", boxSizing: "border-box", marginBottom: ".4rem" };
const lbl = { fontSize: ".7rem", color: C.dimmer, display: "block", marginBottom: ".15rem" };

export default function EditQuestion({ question, onSaved, onCancel }) {
  const hasMc = !!question.mc;
  const isBank = !question.interaction && !hasMc;
  const editableOpts = hasMc || isBank;
  const [stem, setStem] = useState(question.interaction?.prompt || question.mc?.stem || question.sit || question.q || "");
  const [opts, setOpts] = useState((question.mc?.opts || question.opts || []).slice());
  const [ok, setOk] = useState(question.mc?.ok != null ? question.mc.ok : (question.ok != null ? question.ok : 0));
  const [right, setRight] = useState(question.feedback?.right || question.why || "");
  const [wrong, setWrong] = useState(question.feedback?.wrong || "");
  const [tip, setTip] = useState(question.tip || "");
  const [state, setState] = useState("");
  const [errs, setErrs] = useState([]);

  async function save() {
    const edits = { stem, right, wrong, tip };
    if (editableOpts) { edits.opts = opts; edits.ok = ok; }
    const patch = buildPatch(question, edits);
    if (question.type === "scenario") {
      const merged = applyOverride(question, patch);
      const v = validateScenario(merged);
      const hv = runHockeyValidators(merged);
      const all = [...(v.ok ? [] : v.errs), ...hv.errs];
      if (all.length) { setErrs(all); setState("err"); return; }
    }
    setState("saving"); setErrs([]);
    const res = await upsertQuestionOverride({ question_id: question.id, patch });
    if (!res.ok) { setErrs([res.error || "save failed"]); setState("err"); return; }
    onSaved?.(patch);
  }

  return (
    <div style={{ marginTop: ".6rem", padding: ".6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.gold}` }}>
      <div style={{ fontSize: ".78rem", fontWeight: 800, color: C.gold, marginBottom: ".5rem" }}>✎ Edit question · live</div>
      <label style={lbl}>Question / stem</label>
      <textarea value={stem} onChange={e => setStem(e.target.value)} rows={3} style={field} />
      {editableOpts && (
        <>
          <label style={lbl}>Options (tap the dot for the correct one)</label>
          {opts.map((o, i) => (
            <div key={i} style={{ display: "flex", gap: ".4rem", alignItems: "center", marginBottom: ".3rem" }}>
              <input type="radio" checked={ok === i} onChange={() => setOk(i)} title="correct answer" />
              <input value={o} onChange={e => setOpts(opts.map((x, j) => j === i ? e.target.value : x))} style={{ ...field, marginBottom: 0 }} />
            </div>
          ))}
        </>
      )}
      <label style={lbl}>Right feedback</label>
      <textarea value={right} onChange={e => setRight(e.target.value)} rows={2} style={field} />
      {(question.feedback || question.interaction) && (
        <>
          <label style={lbl}>Wrong feedback</label>
          <textarea value={wrong} onChange={e => setWrong(e.target.value)} rows={2} style={field} />
        </>
      )}
      <label style={lbl}>Tip</label>
      <input value={tip} onChange={e => setTip(e.target.value)} style={field} />
      {errs.length > 0 && <div style={{ fontSize: ".72rem", color: C.red, marginBottom: ".3rem" }}>{errs.map((e, k) => <div key={k}>· {e}</div>)}</div>}
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button onClick={save} disabled={state === "saving"} style={{ flex: 1, padding: ".55rem", borderRadius: 8, border: "none", background: C.gold, color: C.bg, fontWeight: 800, fontFamily: FONT.body, cursor: state === "saving" ? "default" : "pointer" }}>{state === "saving" ? "Saving…" : "Save (live)"}</button>
        <button onClick={onCancel} style={{ padding: ".55rem .9rem", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontFamily: FONT.body, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
