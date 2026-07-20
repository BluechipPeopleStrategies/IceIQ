import { useState } from "react";
import { createQuestionRequest } from "../supabase.js";
import { C, FONT } from "../shared.jsx";

// "Want more questions on this scene?" — queues a request (preset) that I batch-
// generate offline (Decision-Test-constrained + coach-vetted). No in-app AI, so
// no metered spend on click; works from the phone. Self-contained.
const PRESETS = [
  { key: "one_each", label: "One of each type" },
  { key: "couple", label: "A couple" },
  { key: "surprise", label: "Surprise me" },
];

export default function AddQuestions({ scenario }) {
  const [state, setState] = useState(""); // "" | "saving" | "done" | "err"
  if (!scenario) return null;
  async function request(preset) {
    setState("saving");
    const res = await createQuestionRequest({
      scenario_id: scenario.id, stem_id: scenario.stemId || scenario.id, preset,
    });
    setState(res?.ok ? "done" : "err");
  }
  return (
    <div style={{ marginTop: "1rem", padding: ".5rem .6rem", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: ".78rem", color: C.dim, marginBottom: ".4rem" }}>➕ Want more questions on this scene? Queue a batch — I'll generate them.</div>
      <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => request(p.key)} disabled={state === "saving"}
            style={{ padding: ".4rem .7rem", borderRadius: 999, border: `1px solid ${C.border}`, background: "transparent", color: C.white, fontFamily: FONT.body, fontSize: ".75rem", cursor: state === "saving" ? "default" : "pointer" }}>{p.label}</button>
        ))}
      </div>
      {state === "done" && <div style={{ fontSize: ".72rem", color: C.green, marginTop: ".35rem" }}>Queued ✓ — I'll generate these (Decision-Test-checked + coach-vetted) next session.</div>}
      {state === "err" && <div style={{ fontSize: ".72rem", color: C.gold, marginTop: ".35rem" }}>Couldn't queue — sign in to save the request.</div>}
    </div>
  );
}
