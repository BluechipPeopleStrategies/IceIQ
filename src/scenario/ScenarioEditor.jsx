// In-playground scenario fixer. Mounted by ScenarioPlayground when you flip a
// seed into Edit mode. Drag the actual actors on the real RinkStage board,
// retype/add/remove them, nudge the correct-answer target, edit the copy —
// all with LIVE validation (the same schema + hockey rules that gate a seed)
// and a one-click Save that writes the file back via the dev-only
// /__seed/save endpoint (tools/seed-editor-plugin.mjs).
//
// Dev/owner-only: the save endpoint exists only under `npm run dev`.

import { useMemo, useRef, useState } from "react";
import RinkStage from "./RinkStage.jsx";
import { validateScenario, denorm, RINK_W, RINK_H } from "./schema.js";
import { runHockeyValidators } from "./validators.js";
import { ZONES } from "./zones.js";
import { levelsOf } from "./youngRink.js";
import { C, FONT } from "../shared.jsx";

const ACTOR_KINDS = ["player", "teammate", "defender", "goalie", "puck"];
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const round3 = (v) => Math.round(v * 1000) / 1000;
const clone = (o) => JSON.parse(JSON.stringify(o));

// Snap every coord to 3 decimals so the saved file stays tidy.
function rounded(scn) {
  const c = clone(scn);
  for (const a of c.actors || []) { a.x = round3(a.x); a.y = round3(a.y); }
  if (c.correct?.x != null) { c.correct.x = round3(c.correct.x); c.correct.y = round3(c.correct.y); }
  if (c.correct?.end?.x != null) { c.correct.end.x = round3(c.correct.end.x); c.correct.end.y = round3(c.correct.end.y); }
  return c;
}

export function ScenarioEditor({ scenario, onClose }) {
  const [draft, setDraft] = useState(() => clone(scenario));
  const [drag, setDrag] = useState(null); // { kind: "actor"|"target", id? }
  const [saveState, setSaveState] = useState(null); // { ok, errs, warns, msg }
  const seedRef = useRef(scenario.id);

  // Mutate the draft immutably via a recipe fn.
  const update = (recipe) => setDraft((d) => { const n = clone(d); recipe(n); return n; });

  // ---- live validation (the real gate) ----
  const lint = useMemo(() => {
    const schema = validateScenario(draft);
    const hockey = runHockeyValidators(draft);
    return {
      errs: [...(schema.errs || []), ...(hockey.errs || [])],
      warns: [...(schema.warns || []), ...(hockey.warns || [])],
    };
  }, [draft]);
  const clean = lint.errs.length === 0;

  // ---- correct-answer target (point / path with numeric coords) ----
  const interKind = draft.interaction?.kind;
  const targetObj = interKind === "point" ? draft.correct
                  : interKind === "path" ? draft.correct?.end
                  : null;
  const hasNumericTarget = !!targetObj && typeof targetObj.x === "number";
  const targetZoneId = targetObj && typeof targetObj.zoneId === "string" ? targetObj.zoneId : "";

  // ---- drag on the board ----
  function onMove(svgPoint, e) {
    if (!drag) return;
    const p = svgPoint(e);
    const x = clamp01(p.x), y = clamp01(p.y);
    if (drag.kind === "actor") {
      update((n) => { const a = n.actors.find((a) => a.id === drag.id); if (a) { a.x = x; a.y = y; } });
    } else if (drag.kind === "target") {
      update((n) => {
        const t = interKind === "point" ? n.correct : n.correct.end;
        t.x = x; t.y = y; delete t.zoneId;
      });
    }
  }

  // ---- actor edits ----
  const setActor = (id, patch) => update((n) => { const a = n.actors.find((a) => a.id === id); if (a) Object.assign(a, patch); });
  const removeActor = (id) => update((n) => {
    n.actors = n.actors.filter((a) => a.id !== id);
    if (Array.isArray(n.interaction?.from)) n.interaction.from = n.interaction.from.filter((x) => x !== id);
    if (Array.isArray(n.correct?.ids)) n.correct.ids = n.correct.ids.filter((x) => x !== id);
  });
  const addActor = () => update((n) => {
    let i = 1; while (n.actors.some((a) => a.id === "new" + i)) i++;
    n.actors.push({ id: "new" + i, kind: "teammate", x: 0.6, y: 0.5, tag: "" });
  });

  // ---- selection / sequence membership toggles ----
  const isSelKind = interKind === "selection" || interKind === "sequence";
  const toggleIn = (listPath, id) => update((n) => {
    const ref = listPath === "from" ? n.interaction : n.correct;
    const key = listPath === "from" ? "from" : "ids";
    const arr = Array.isArray(ref[key]) ? ref[key] : (ref[key] = []);
    const at = arr.indexOf(id);
    if (at >= 0) arr.splice(at, 1); else arr.push(id);
  });

  // ---- save ----
  async function save(force = false) {
    setSaveState({ msg: "saving…" });
    try {
      const r = await fetch("/__seed/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seedRef.current, scenario: rounded(draft), force }),
      });
      const j = await r.json();
      setSaveState(j.ok
        ? { ok: true, warns: j.warns || [], msg: `saved → ${j.path}` }
        : { ok: false, errs: j.errs || [], warns: j.warns || [], msg: "save blocked" });
    } catch (e) {
      setSaveState({ ok: false, errs: [String(e.message || e)], msg: "save failed (dev server only)" });
    }
  }

  // ---- styles ----
  const btn = (active) => ({
    padding: "7px 12px", borderRadius: 9, border: `1px solid ${active ? C.gold : C.border}`,
    background: active ? C.goldDim : C.bgElevated, color: active ? C.gold : C.white,
    fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: FONT.body,
  });
  const sml = { padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.white, fontSize: 11, fontFamily: FONT.body };
  const card = { border: `1px solid ${C.border}`, borderRadius: 10, padding: 10, marginTop: 10, background: C.bgCard };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <button style={btn(false)} onClick={onClose}>‹ Done editing</button>
        <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: C.dim }}>{draft.id}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: clean ? "#34d399" : "#f87171" }}>
          {clean ? "✓ valid" : `${lint.errs.length} error${lint.errs.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Editable board: drag the actors / target right on the real rink. */}
      {/* levelsOf reads BOTH `level` and `levels` — the editor must show the
          author exactly the board a U7/U9 player will see, half-ice included. */}
      <RinkStage stage={draft.stage} actors={draft.actors} levels={levelsOf(draft)}>
        {(svgPoint) => (
          <g
            onPointerMove={(e) => onMove(svgPoint, e)}
            onPointerUp={(e) => { setDrag(null); try { e.target.releasePointerCapture?.(e.pointerId); } catch {} }}
          >
            {/* numeric correct-answer target handle (point / path) */}
            {hasNumericTarget && (() => {
              const t = denorm(targetObj);
              return (
                <g
                  transform={`translate(${t.x},${t.y})`}
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => { setDrag({ kind: "target" }); e.target.setPointerCapture?.(e.pointerId); }}
                >
                  <ellipse rx={(targetObj.tolerance || 0.08) * RINK_W} ry={(targetObj.tolerance || 0.08) * RINK_H} fill="#22c55e" opacity="0.12" stroke="#22c55e" strokeDasharray="4 3" strokeWidth="1.5" />
                  <path d="M0,-9 L9,0 L0,9 L-9,0 Z" fill="#22c55e" stroke="#0b1220" strokeWidth="1.5" />
                  <text x="0" y="-13" textAnchor="middle" fontSize="9" fontWeight="800" fill="#22c55e" style={{ pointerEvents: "none" }}>TARGET</text>
                </g>
              );
            })()}
            {/* transparent grab handles over each actor */}
            {draft.actors.map((a) => {
              const p = denorm(a);
              return (
                <circle key={a.id} cx={p.x} cy={p.y} r="20" fill="transparent"
                  style={{ cursor: drag ? "grabbing" : "grab" }}
                  onPointerDown={(e) => { setDrag({ kind: "actor", id: a.id }); e.target.setPointerCapture?.(e.pointerId); }} />
              );
            })}
          </g>
        )}
      </RinkStage>
      <div style={{ fontSize: 11, color: C.dimmer, marginTop: -2 }}>Drag the markers (and the green TARGET) to reposition. Changes validate live.</div>

      {/* Validation panel */}
      <div style={card}>
        {lint.errs.length === 0 && lint.warns.length === 0 && (
          <div style={{ color: "#34d399", fontSize: 12, fontWeight: 700 }}>No errors or warnings — ready to save.</div>
        )}
        {lint.errs.map((m, i) => <div key={"e" + i} style={{ color: "#f87171", fontSize: 12, marginBottom: 3 }}>✗ {m}</div>)}
        {lint.warns.map((m, i) => <div key={"w" + i} style={{ color: "#fbbf24", fontSize: 12, marginBottom: 3 }}>⚠ {m}</div>)}
      </div>

      {/* Actor editor */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.dim, marginBottom: 6 }}>ACTORS</div>
        {draft.actors.map((a) => (
          <div key={a.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, color: C.dimmer, width: 54 }}>{a.id}</span>
            <select style={sml} value={a.kind} onChange={(e) => setActor(a.id, { kind: e.target.value })}>
              {ACTOR_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <input style={{ ...sml, width: 46 }} placeholder="tag" value={a.tag || ""} onChange={(e) => setActor(a.id, { tag: e.target.value })} />
            <span style={{ fontSize: 10, color: C.dimmer }}>{round3(a.x)},{round3(a.y)}</span>
            <button style={{ ...sml, color: "#f87171", cursor: "pointer", marginLeft: "auto" }} onClick={() => removeActor(a.id)}>× del</button>
          </div>
        ))}
        <button style={{ ...btn(false), marginTop: 4 }} onClick={addActor}>+ Add actor</button>
      </div>

      {/* selection / sequence membership */}
      {isSelKind && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.dim, marginBottom: 6 }}>
            {interKind === "sequence" ? "SEQUENCE" : "SELECTION"} — options & correct
          </div>
          {draft.actors.filter((a) => a.kind !== "puck" && a.kind !== "goalie").map((a) => {
            const inFrom = (draft.interaction?.from || []).includes(a.id);
            const inCorrect = (draft.correct?.ids || []).includes(a.id);
            return (
              <div key={a.id} style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, marginBottom: 4 }}>
                <span style={{ width: 70, fontFamily: "ui-monospace,monospace", color: C.dimmer }}>{a.id}{a.tag ? ` (${a.tag})` : ""}</span>
                <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer", color: C.dim }}>
                  <input type="checkbox" checked={inFrom} onChange={() => toggleIn("from", a.id)} /> option
                </label>
                <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer", color: inCorrect ? "#34d399" : C.dim }}>
                  <input type="checkbox" checked={inCorrect} onChange={() => toggleIn("ids", a.id)} /> correct
                </label>
              </div>
            );
          })}
        </div>
      )}

      {/* numeric/zone target controls */}
      {(interKind === "point" || interKind === "path") && (
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.dim, marginBottom: 6 }}>CORRECT TARGET</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontSize: 12, color: C.dim }}>
            <span>zone:</span>
            <select style={sml} value={targetZoneId} onChange={(e) => update((n) => {
              const t = interKind === "point" ? n.correct : n.correct.end;
              if (e.target.value) { t.zoneId = e.target.value; delete t.x; delete t.y; delete t.tolerance; }
              else { delete t.zoneId; t.x = 0.7; t.y = 0.5; if (interKind === "point") t.tolerance = 0.08; }
            })}>
              <option value="">(numeric x/y)</option>
              {Object.keys(ZONES).sort().map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            {hasNumericTarget && <span style={{ fontSize: 11, color: C.dimmer }}>drag the green TARGET on the board</span>}
          </div>
        </div>
      )}

      {/* text */}
      <div style={card}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.dim, marginBottom: 6 }}>COPY</div>
        <textarea style={{ ...sml, width: "100%", minHeight: 38, resize: "vertical" }} placeholder="prompt"
          value={draft.interaction?.prompt || ""} onChange={(e) => update((n) => { n.interaction.prompt = e.target.value; })} />
        <textarea style={{ ...sml, width: "100%", minHeight: 32, marginTop: 6, resize: "vertical" }} placeholder="feedback.right"
          value={draft.feedback?.right || ""} onChange={(e) => update((n) => { (n.feedback ||= {}).right = e.target.value; })} />
        <textarea style={{ ...sml, width: "100%", minHeight: 32, marginTop: 6, resize: "vertical" }} placeholder="feedback.wrong"
          value={draft.feedback?.wrong || ""} onChange={(e) => update((n) => { (n.feedback ||= {}).wrong = e.target.value; })} />
      </div>

      {/* save */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button style={{ ...btn(clean), opacity: clean ? 1 : 0.5 }} disabled={!clean} onClick={() => save(false)}>
          Save to seed file
        </button>
        {!clean && <button style={btn(false)} onClick={() => save(true)} title="write despite errors">Force save</button>}
        {saveState && (
          <span style={{ fontSize: 12, fontWeight: 700, color: saveState.ok ? "#34d399" : "#f87171" }}>
            {saveState.msg}
          </span>
        )}
      </div>
      {saveState?.errs?.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {saveState.errs.map((m, i) => <div key={i} style={{ color: "#f87171", fontSize: 11 }}>✗ {m}</div>)}
        </div>
      )}
    </div>
  );
}
