// Coach-private depth chart. Lives in localStorage only; never written to
// Supabase, never rendered for player accounts.
//
// Shape:
//   localStorage["iceiq_depth_charts_v1"] =
//     { [teamId]: { [playerId]: "1L" | "2L" | "3L" | "4L"
//                              | "1D" | "2D" | "3D"
//                              | "1G" | "2G" } }
//
// setAssignment also flips `iceiq_depth_chart_set_v1` to "1" so the
// depth1 quest (see QUESTS_COACH) can read a single flag without
// scanning the chart. The flag is sticky — once the coach has tried
// the feature, the quest stays completed.

const STORE_KEY = "iceiq_depth_charts_v1";
const FLAG_KEY  = "iceiq_depth_chart_set_v1";

export const DEPTH_SLOTS = [
  { id: "1L", label: "1st Line F",  group: "F" },
  { id: "2L", label: "2nd Line F",  group: "F" },
  { id: "3L", label: "3rd Line F",  group: "F" },
  { id: "4L", label: "4th Line F",  group: "F" },
  { id: "1D", label: "1st Pair D",  group: "D" },
  { id: "2D", label: "2nd Pair D",  group: "D" },
  { id: "3D", label: "3rd Pair D",  group: "D" },
  { id: "1G", label: "Starting G",  group: "G" },
  { id: "2G", label: "Backup G",    group: "G" },
];

function readAll() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeAll(all) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(all)); } catch {}
}

export function getDepthChart(teamId) {
  if (!teamId) return {};
  const all = readAll();
  return all[teamId] || {};
}

export function setAssignment(teamId, playerId, slot) {
  if (!teamId || !playerId) return;
  const all = readAll();
  const team = { ...(all[teamId] || {}) };
  if (slot) team[playerId] = slot;
  else delete team[playerId];
  all[teamId] = team;
  writeAll(all);
  try { localStorage.setItem(FLAG_KEY, "1"); } catch {}
}

export function clearAssignment(teamId, playerId) {
  setAssignment(teamId, playerId, null);
}

export function seedDemoDepthChart(teamId, roster) {
  if (!teamId || !Array.isArray(roster) || !roster.length) return;
  // Assign up to 3 players to plausible slots (1L, 2L, 1D) so demo
  // coaches see a filled chart without it looking auto-generated.
  const slots = ["1L", "2L", "1D"];
  const assignments = {};
  roster.slice(0, slots.length).forEach((p, i) => {
    if (p?.id) assignments[p.id] = slots[i];
  });
  const all = readAll();
  all[teamId] = assignments;
  writeAll(all);
  try { localStorage.setItem(FLAG_KEY, "1"); } catch {}
}

export function clearDemoDepthChart(teamId) {
  if (!teamId) return;
  const all = readAll();
  if (all[teamId]) {
    delete all[teamId];
    writeAll(all);
  }
  // Also clear the "has tried" flag so a real signup starts with an
  // unchecked quest.
  try { localStorage.removeItem(FLAG_KEY); } catch {}
}
