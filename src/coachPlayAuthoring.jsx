// CoachPlayAuthoringSection: inside expanded team on CoachHome. Coach places
// players/puck, draws routes, sets the decision freeze, and declares a read --
// producing a ScenarioDefinition (proofMode: "coach-declared") saved to
// coach_play_drafts. See docs/superpowers/specs/2026-07-31-coach-authoring-
// video-export-design.md for the full design.
//
// Structural analog: assignments.jsx's CoachAssignmentsSection (fetch-on-mount
// + optimistic local list state + window.confirm before delete).
import { useEffect, useState } from "react";
import { Card, Label, C, FONT, PrimaryBtn, SecBtn } from "./shared.jsx";
import {
  createCoachPlayDraft, getCoachPlayDraftsForTeam, deleteCoachPlayDraft,
} from "./supabase.js";
import { NHL_200X85_PROFILE, RINK_FRAME_VERSION } from "./scenario-engine/rinkFrame.js";
import { SCENARIO_DEFINITION_SCHEMA_VERSION } from "./scenario-engine/scenarioDefinition.js";
import { PlayEditorCanvas } from "./coachPlayEditorCanvas.jsx";

// crypto.randomUUID() isn't guaranteed everywhere (older browsers, some
// non-secure-context embeds) -- same fallback pattern already used by
// src/utils/profiles.js and src/utils/deviceLock.js.
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function CoachPlayAuthoringSection({ teamId, coachId, roster }) {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDraftId, setActiveDraftId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getCoachPlayDraftsForTeam(teamId)
      .then((rows) => { if (!cancelled) setDrafts(rows); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teamId]);

  async function handleCreate() {
    try {
      const row = await createCoachPlayDraft(coachId, teamId, blankScenarioDefinition());
      setDrafts((d) => [row, ...d]);
      setActiveDraftId(row.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(draftId) {
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    try {
      await deleteCoachPlayDraft(draftId);
      setDrafts((d) => d.filter((x) => x.id !== draftId));
      if (activeDraftId === draftId) setActiveDraftId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  if (activeDraftId) {
    return (
      <PlayEditorCanvas
        draftId={activeDraftId}
        teamId={teamId}
        coachId={coachId}
        onClose={() => setActiveDraftId(null)}
        onSaved={(row) => setDrafts((d) => d.map((x) => (x.id === row.id ? row : x)))}
      />
    );
  }

  return (
    <Card>
      <Label>🎬 Plays</Label>
      {error && <div style={{ color: C.red, fontSize: 12 }}>{error}</div>}
      {loading ? (
        <div style={{ color: C.dim, fontSize: 13, fontFamily: FONT.body }}>Loading drafts...</div>
      ) : (
        <>
          <PrimaryBtn onClick={handleCreate} style={{ width: "auto", marginBottom: ".75rem" }}>+ New play</PrimaryBtn>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {drafts.map((d) => (
              <li key={d.id} style={{ padding: ".5rem 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".5rem" }}>
                  <span style={{ fontSize: 13, fontFamily: FONT.body, color: C.white }}>
                    {d.status === "finalized" ? "✅" : "✏️"} {d.scenario_definition?.declaredRead?.description || "Untitled play"}
                  </span>
                  <span style={{ display: "flex", gap: ".4rem", flexShrink: 0 }}>
                    <SecBtn onClick={() => setActiveDraftId(d.id)} style={{ width: "auto" }}>Open</SecBtn>
                    {d.status === "draft" && <SecBtn onClick={() => handleDelete(d.id)} style={{ width: "auto" }}>Delete</SecBtn>}
                  </span>
                </div>
                {/* Export handoff: Task 8's render-worker.mjs is a standalone
                    CLI (no queue/worker infra, design §5 -- out of scope), so
                    the browser can't trigger it directly. Once a draft is
                    finalized, show the coach/admin the manual command to run
                    out-of-band; once someone has recorded the resulting
                    signed URL via setDraftExportInfo, show the video link
                    instead. */}
                {d.status === "finalized" && !d.export_url && (
                  <div style={{ marginTop: ".4rem", fontSize: 11.5, fontFamily: FONT.body, color: C.dim }}>
                    <p style={{ margin: "0 0 .25rem" }}>Export not yet generated. Run:</p>
                    <code style={{ display: "block", background: C.bgElevated, border: `1px solid ${C.border}`, borderRadius: 6, padding: ".4rem .5rem", fontSize: 11, wordBreak: "break-all" }}>
                      node remotion/render-worker.mjs {d.id}-compiled.json {d.id}.mp4
                    </code>
                    <p style={{ margin: ".25rem 0 0", color: C.dimmer }}>
                      (Export the compiled_artifact column for this row to that filename first, or automate this handoff in a later phase -- explicitly out of scope here, design §5.)
                    </p>
                  </div>
                )}
                {d.status === "finalized" && d.export_url && (
                  <div style={{ marginTop: ".4rem" }}>
                    <a href={d.export_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.gold }}>View exported video</a>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {drafts.length === 0 && (
            <div style={{ color: C.dimmer, fontSize: 13, fontFamily: FONT.body }}>No plays yet -- start one above.</div>
          )}
        </>
      )}
    </Card>
  );
}

// A blank, structurally-valid-shaped ScenarioDefinition (per
// scenario-engine/scenarioDefinition.js's validateScenarioDefinition and the
// real shape used by scenario-engine/coachDeclaredFixture.js). Deliberately
// incomplete where the editor hasn't been used yet (no actors/puck/declared
// read placed) -- coach_play_drafts stores drafts unvalidated; validation is
// enforced later, at finalize/compile time (a later task), not at draft-save
// time. Every FIELD NAME here still matches the real schema exactly so a
// draft is a genuine (if incomplete) ScenarioDefinition throughout, not a
// look-alike shape that only becomes correct after some later translation.
function blankScenarioDefinition() {
  return {
    schemaVersion: SCENARIO_DEFINITION_SCHEMA_VERSION,
    id: generateUUID(),
    version: 1,
    contentHash: null,
    family: "coach-authored",
    tacticalClaimVersion: null,
    proofMode: "coach-declared",
    ageSkillProfile: "unspecified",
    sources: [{ note: "coach-authored", cite: "Authored in-app by the coach via the play editor." }],
    rinkFrame: { profileId: NHL_200X85_PROFILE.id, units: "metres", attackingDirection: "+x" },
    initialState: { actors: [], puck: null },
    intendedActions: [],
    decisionFreeze: { time: 0, observableCues: [] },
    declaredRead: null,
    questionKindVariants: [],
    generationParams: null,
    dependencyVersions: { rinkFrame: RINK_FRAME_VERSION },
  };
}
