// Dev/review playground — flip through every scenario seed and PLAY it in
// the real engine (ScenarioRenderer), so the interaction can be felt and
// judged before shipping. Reached at `#scenarios` under `npm run dev`.
//
// Filter by interaction kind (jump straight to the `place` drag ones),
// step prev/next, and replay after answering. Seeds are globbed the same
// way qbLoader composes the bank, so anything dropped in seeds/ shows up.

import { useMemo, useState } from "react";
import { ScenarioRenderer } from "./index.js";
import { C, FONT } from "../shared.jsx";

const MODS = import.meta.glob("./seeds/*.json", { eager: true });
const ALL = Object.values(MODS)
  .map((m) => m.default || m)
  .filter((s) => s && s.type === "scenario");

const KINDS = ["all", "place", "point", "path", "selection", "sequence"];

export function ScenarioPlayground() {
  const [kind, setKind] = useState("all");
  const [idx, setIdx] = useState(0);
  const [nonce, setNonce] = useState(0);

  const list = useMemo(() => {
    const l = kind === "all" ? ALL : ALL.filter((s) => s.interaction?.kind === kind);
    return l.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
  }, [kind]);

  const i = Math.min(idx, Math.max(0, list.length - 1));
  const s = list[i];
  function go(d) { setIdx(() => (i + d + list.length) % list.length); setNonce(0); }

  const wrap = { maxWidth: 560, margin: "0 auto", padding: "18px 14px 70px" };
  const chip = (active) => ({
    padding: "5px 11px", borderRadius: 999, border: `1px solid ${active ? C.gold : C.border}`,
    background: active ? C.goldDim : "transparent", color: active ? C.gold : C.dim,
    fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: FONT.body,
  });
  const btn = {
    padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
    background: C.bgElevated, color: C.white, fontWeight: 800, fontSize: 13,
    cursor: "pointer", fontFamily: FONT.body,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.white, fontFamily: FONT.body }}>
      <div style={wrap}>
        <div style={{ fontFamily: FONT.display, fontSize: 22, letterSpacing: ".01em", marginBottom: 3 }}>
          <span style={{ color: C.gold }}>Rink</span>Reads Scenario Playground
        </div>
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 14 }}>
          {ALL.length} seeds · play the real engine, feel the interaction before it ships.
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
          {KINDS.map((k) => (
            <button key={k} style={chip(kind === k)} onClick={() => { setKind(k); setIdx(0); setNonce(0); }}>
              {k}{k !== "all" ? ` (${ALL.filter((x) => x.interaction?.kind === k).length})` : ""}
            </button>
          ))}
        </div>

        {!s ? (
          <div style={{ color: C.dim, padding: 30, textAlign: "center" }}>No scenarios for "{kind}".</div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
              <button style={btn} onClick={() => go(-1)}>‹ Prev</button>
              <div style={{ textAlign: "center", fontSize: 11, color: C.dimmer, lineHeight: 1.45 }}>
                <div style={{ fontFamily: "ui-monospace,monospace", color: C.dim }}>{s.id}</div>
                <div>{(s.levels?.[0] || s.level || "")} · d{s.difficulty} · {s.interaction?.kind}{s.interaction?.verb ? "/" + s.interaction.verb : ""} · {i + 1}/{list.length}</div>
              </div>
              <button style={btn} onClick={() => go(1)}>Next ›</button>
            </div>

            <ScenarioRenderer key={s.id + ":" + nonce} scenario={s} onAnswer={() => {}} />

            <button style={{ ...btn, width: "100%", marginTop: 10 }} onClick={() => setNonce((n) => n + 1)}>
              ↻ Replay this scenario
            </button>
          </>
        )}
      </div>
    </div>
  );
}
