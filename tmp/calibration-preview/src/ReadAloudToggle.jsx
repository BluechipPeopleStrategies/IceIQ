import { useState } from "react";
import { ttsSupported, getReadAloud, setReadAloud, speakParts } from "./speak.js";
import { C, FONT } from "./shared.jsx";

// Self-contained on/off toggle for "read questions aloud" (browser TTS). Writes
// the preference to localStorage; ScenarioRenderer reads it live and auto-reads
// each question's stem + choices when it's on. Hidden where the browser has no
// speech support. Toggling ON also speaks a confirmation — which doubles as the
// user gesture browsers require before they'll allow speech later in the session.
export default function ReadAloudToggle() {
  const [on, setOn] = useState(() => getReadAloud());
  if (!ttsSupported()) return null;
  function toggle() {
    const next = !on;
    setReadAloud(next);
    setOn(next);
    if (next) speakParts(["Read questions aloud is on."]);
  }
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: ".85rem" }}>
      <span style={{ fontSize: 13, color: C.dim }}>Read questions aloud 🔊</span>
      <button onClick={toggle}
        style={{ background: on ? C.purpleDim : "none", border: `1px solid ${on ? C.purpleBorder : C.border}`,
          borderRadius: 20, padding: ".55rem .9rem", cursor: "pointer", color: on ? C.purple : C.dimmer,
          fontSize: 12, fontFamily: FONT.body, fontWeight: 700 }}>
        {on ? "ON" : "OFF"}
      </button>
    </div>
  );
}
