// PlayEditorCanvas: the top-down schematic editor. Renders NHL_200X85_PROFILE's
// bounds as an SVG rink, lets the coach click to place actors/puck, click to
// add a straight-segment route waypoint per selected actor, set the freeze
// time + observable cues, and mark the declared-correct read. MVP: straight-
// segment waypoints only, no freehand curves (design doc §2).
//
// Field names produced here (actor.position, actor.role, action.toPosition,
// puck.position, rinkFrame.*) match scenario-engine/scenarioDefinition.js's
// validateScenarioDefinition exactly -- see coachDeclaredFixture.js for the
// real fixture this shape is drawn from.
import { useEffect, useState } from "react";
import { Card, Label, C, FONT } from "./shared.jsx";
import { getCoachPlayDraft, updateCoachPlayDraft, RevisionConflictError } from "./supabase.js";
import { NHL_200X85_PROFILE, isWithinBounds } from "./scenario-engine/rinkFrame.js";

const RINK_SVG_SCALE = 8; // px per rink-frame metre, arbitrary MVP constant

const ROLE_OPTIONS = [
  { value: "puckCarrier", label: "Puck carrier" },
  { value: "support", label: "Support" },
  { value: "defender", label: "Defender" },
  { value: "goalie", label: "Goalie" },
];

// Rink-frame metres (origin centre ice) -> SVG px (origin top-left).
function toSvg([x, y]) {
  return [
    (x + NHL_200X85_PROFILE.lengthM / 2) * RINK_SVG_SCALE,
    (y + NHL_200X85_PROFILE.widthM / 2) * RINK_SVG_SCALE,
  ];
}

export function PlayEditorCanvas({ draftId, teamId, coachId, onClose, onSaved }) {
  const [def, setDef] = useState(null);
  const [revision, setRevision] = useState(null);
  const [selectedActorId, setSelectedActorId] = useState(null);
  const [placeMode, setPlaceMode] = useState("actor"); // "actor" | "puck" -- ignored while an actor is selected (routing takes over)
  const [pendingRole, setPendingRole] = useState("puckCarrier");
  const [pendingTeam, setPendingTeam] = useState("home");
  const [newCue, setNewCue] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCoachPlayDraft(draftId).then((row) => {
      if (cancelled) return;
      if (!row) { setLoadError("This draft no longer exists."); return; }
      setDef(row.scenario_definition);
      setRevision(row.revision);
    }).catch((e) => { if (!cancelled) setLoadError(e.message); });
    return () => { cancelled = true; };
  }, [draftId]);

  function addActorAt(x, y) {
    if (!isWithinBounds([x, y], NHL_200X85_PROFILE)) return;
    const id = `actor-${(def.initialState.actors?.length || 0) + 1}`;
    setDef((d) => ({
      ...d,
      initialState: {
        ...d.initialState,
        actors: [...d.initialState.actors, { id, role: pendingRole, team: pendingTeam, position: [x, y] }],
      },
    }));
    // Immediately select the new actor so the coach can start drawing its
    // route with the next click. Click the same actor again to deselect and
    // go back to placing.
    setSelectedActorId(id);
  }

  function setPuckAt(x, y) {
    if (!isWithinBounds([x, y], NHL_200X85_PROFILE)) return;
    setDef((d) => ({ ...d, initialState: { ...d.initialState, puck: { position: [x, y] } } }));
  }

  function addRoutePointFor(actorId, x, y) {
    if (!isWithinBounds([x, y], NHL_200X85_PROFILE)) return;
    setDef((d) => {
      const existing = d.intendedActions.filter((a) => a.actorId === actorId);
      const startTime = existing.length ? existing[existing.length - 1].endTime : 0;
      const newAction = { actorId, kind: "skate", startTime, endTime: startTime + 1, toPosition: [x, y] };
      return { ...d, intendedActions: [...d.intendedActions, newAction] };
    });
  }

  function removeActor(actorId) {
    setDef((d) => ({
      ...d,
      initialState: { ...d.initialState, actors: d.initialState.actors.filter((a) => a.id !== actorId) },
      intendedActions: d.intendedActions.filter((a) => a.actorId !== actorId),
      declaredRead: d.declaredRead?.actorId === actorId ? null : d.declaredRead,
    }));
    setSelectedActorId((cur) => (cur === actorId ? null : cur));
  }

  function setFreeze(time) {
    setDef((d) => ({ ...d, decisionFreeze: { ...d.decisionFreeze, time: Number(time) } }));
  }

  function addObservableCue(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDef((d) => ({
      ...d,
      decisionFreeze: { ...d.decisionFreeze, observableCues: [...d.decisionFreeze.observableCues, trimmed] },
    }));
  }

  function removeObservableCue(index) {
    setDef((d) => ({
      ...d,
      decisionFreeze: { ...d.decisionFreeze, observableCues: d.decisionFreeze.observableCues.filter((_, i) => i !== index) },
    }));
  }

  function setDeclaredRead(actorId, description) {
    setDef((d) => {
      const next = { description: description || "" };
      if (actorId) next.actorId = actorId; // omit rather than "" -- validateScenarioDefinition treats a present actorId as a reference that must resolve
      return { ...d, declaredRead: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const row = await updateCoachPlayDraft(draftId, revision, def);
      setRevision(row.revision);
      onSaved(row);
    } catch (e) {
      if (e instanceof RevisionConflictError) {
        setError("Someone/something else saved this draft since you loaded it -- reload before retrying.");
      } else {
        setError(e.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <Card>
        <div style={{ color: C.red, fontSize: 13, fontFamily: FONT.body, marginBottom: ".75rem" }}>{loadError}</div>
        <button onClick={onClose}>← Back to plays</button>
      </Card>
    );
  }

  if (!def) return <Card><div style={{ color: C.dim, fontFamily: FONT.body }}>Loading...</div></Card>;

  const [svgW, svgH] = [NHL_200X85_PROFILE.lengthM * RINK_SVG_SCALE, NHL_200X85_PROFILE.widthM * RINK_SVG_SCALE];

  return (
    <Card>
      <button onClick={onClose} style={{ marginBottom: ".75rem" }}>← Back to plays</button>
      {error && <div style={{ color: C.red, fontSize: 12, marginBottom: ".5rem" }}>{error}</div>}

      <Label>Place</Label>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap", marginBottom: ".75rem" }}>
        <button onClick={() => setPlaceMode("actor")} disabled={placeMode === "actor" && !selectedActorId} style={{ fontWeight: placeMode === "actor" ? 800 : 400 }}>Place actor</button>
        <button onClick={() => setPlaceMode("puck")} disabled={placeMode === "puck" && !selectedActorId} style={{ fontWeight: placeMode === "puck" ? 800 : 400 }}>Place puck</button>
        {placeMode === "actor" && (
          <>
            <label style={{ fontSize: 12, color: C.dim, fontFamily: FONT.body }}>
              Role:{" "}
              <select value={pendingRole} onChange={(e) => setPendingRole(e.target.value)}>
                {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, color: C.dim, fontFamily: FONT.body }}>
              Team:{" "}
              <select value={pendingTeam} onChange={(e) => setPendingTeam(e.target.value)}>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </label>
          </>
        )}
      </div>

      {selectedActorId && (
        <div style={{ fontSize: 12, color: C.gold, fontFamily: FONT.body, marginBottom: ".5rem" }}>
          Drawing route for <strong>{selectedActorId}</strong> -- click the rink to add a waypoint. Click the actor again to stop.{" "}
          <button onClick={() => removeActor(selectedActorId)}>Remove this actor</button>
        </div>
      )}

      <svg
        width={svgW}
        height={svgH}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / RINK_SVG_SCALE - NHL_200X85_PROFILE.lengthM / 2;
          const y = (e.clientY - rect.top) / RINK_SVG_SCALE - NHL_200X85_PROFILE.widthM / 2;
          if (selectedActorId) addRoutePointFor(selectedActorId, x, y);
          else if (placeMode === "puck") setPuckAt(x, y);
          else addActorAt(x, y);
        }}
        style={{ border: "1px solid #333", background: "#eef", display: "block", maxWidth: "100%" }}
      >
        {def.initialState.actors.map((a) => {
          const routeActions = def.intendedActions.filter((ac) => ac.actorId === a.id);
          if (routeActions.length === 0) return null;
          const points = [a.position, ...routeActions.map((ac) => ac.toPosition)]
            .map((p) => toSvg(p).join(","))
            .join(" ");
          return (
            <polyline
              key={`route-${a.id}`}
              points={points}
              fill="none"
              stroke={a.id === selectedActorId ? "orange" : "#5BA4E8"}
              strokeWidth={2}
            />
          );
        })}

        {def.initialState.puck && (() => {
          const [cx, cy] = toSvg(def.initialState.puck.position);
          return <circle cx={cx} cy={cy} r={4} fill="black" />;
        })()}

        {def.initialState.actors.map((a) => {
          const [cx, cy] = toSvg(a.position);
          return (
            <g key={a.id}>
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill={a.id === selectedActorId ? "orange" : a.team === "away" ? "firebrick" : "steelblue"}
                onClick={(e) => { e.stopPropagation(); setSelectedActorId((cur) => (cur === a.id ? null : a.id)); }}
                style={{ cursor: "pointer" }}
              />
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fill="#333" pointerEvents="none">{a.id}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: "1rem" }}>
        <label style={{ fontSize: 13, color: C.dim, fontFamily: FONT.body }}>
          Decision freeze time (s):{" "}
          <input type="number" step="0.1" min="0" value={def.decisionFreeze.time} onChange={(e) => setFreeze(e.target.value)} />
        </label>
      </div>

      <div style={{ marginTop: ".75rem" }}>
        <Label>Observable cues at freeze</Label>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {def.decisionFreeze.observableCues.map((cue, i) => (
            <li key={i} style={{ fontSize: 13, color: C.white, fontFamily: FONT.body, marginBottom: ".25rem" }}>
              {cue} <button onClick={() => removeObservableCue(i)}>Remove</button>
            </li>
          ))}
        </ul>
        <input
          type="text"
          value={newCue}
          onChange={(e) => setNewCue(e.target.value)}
          placeholder="What's visible at the freeze..."
          style={{ marginRight: ".4rem" }}
        />
        <button onClick={() => { addObservableCue(newCue); setNewCue(""); }}>Add cue</button>
      </div>

      <div style={{ marginTop: ".75rem" }}>
        <Label>Declared-correct read</Label>
        <label style={{ fontSize: 13, color: C.dim, fontFamily: FONT.body, display: "block", marginBottom: ".4rem" }}>
          Actor:{" "}
          <select
            value={def.declaredRead?.actorId || ""}
            onChange={(e) => setDeclaredRead(e.target.value, def.declaredRead?.description || "")}
          >
            <option value="">-- choose --</option>
            {def.initialState.actors.map((a) => <option key={a.id} value={a.id}>{a.id} ({a.role})</option>)}
          </select>
        </label>
        <label style={{ fontSize: 13, color: C.dim, fontFamily: FONT.body }}>
          Description:{" "}
          <input
            type="text"
            value={def.declaredRead?.description || ""}
            onChange={(e) => setDeclaredRead(def.declaredRead?.actorId, e.target.value)}
            placeholder="e.g. Pass across to F2 -- the defender stepped toward you"
            style={{ width: "70%" }}
          />
        </label>
      </div>

      <button onClick={handleSave} disabled={saving} style={{ marginTop: "1rem" }}>{saving ? "Saving..." : "Save draft"}</button>
    </Card>
  );
}
