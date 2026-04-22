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

// NHL-style lineup card: 3 forward lines × (LW, C, RW), 3 D pairs × (LD, RD),
// starter + backup goalie. Each slot id is unique so `setAssignment` can pin
// a specific player to a specific spot on a line.
export const DEPTH_SLOTS = [
  { id: "1-LW", label: "LW", line: 1, role: "F",  order: 0 },
  { id: "1-C",  label: "C",  line: 1, role: "F",  order: 1 },
  { id: "1-RW", label: "RW", line: 1, role: "F",  order: 2 },
  { id: "2-LW", label: "LW", line: 2, role: "F",  order: 0 },
  { id: "2-C",  label: "C",  line: 2, role: "F",  order: 1 },
  { id: "2-RW", label: "RW", line: 2, role: "F",  order: 2 },
  { id: "3-LW", label: "LW", line: 3, role: "F",  order: 0 },
  { id: "3-C",  label: "C",  line: 3, role: "F",  order: 1 },
  { id: "3-RW", label: "RW", line: 3, role: "F",  order: 2 },
  { id: "1-LD", label: "LD", line: 1, role: "D",  order: 0 },
  { id: "1-RD", label: "RD", line: 1, role: "D",  order: 1 },
  { id: "2-LD", label: "LD", line: 2, role: "D",  order: 0 },
  { id: "2-RD", label: "RD", line: 2, role: "D",  order: 1 },
  { id: "3-LD", label: "LD", line: 3, role: "D",  order: 0 },
  { id: "3-RD", label: "RD", line: 3, role: "D",  order: 1 },
  { id: "G-S",  label: "Starter", line: 1, role: "G", order: 0 },
  { id: "G-B",  label: "Backup",  line: 2, role: "G", order: 0 },
];
export const DEPTH_LINES = {
  F: [1, 2, 3],
  D: [1, 2, 3],
  G: [1, 2],
};

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
  // Build a realistic lineup: highest-IQ forwards on the top line (C), wings
  // by position, defense sorted by IQ, goalies last.
  const fwds = roster.filter(p => p.position === "Forward" || p.position === "Multiple" || !p.position);
  const defs = roster.filter(p => p.position === "Defense");
  const goalies = roster.filter(p => p.position === "Goalie");
  const byIqDesc = (a, b) => (b.iq || 0) - (a.iq || 0);
  fwds.sort(byIqDesc); defs.sort(byIqDesc); goalies.sort(byIqDesc);

  const assignments = {};
  // Forward lines: top-iq go C, alternating LW/RW by index. 3 lines = 9 slots.
  const fSlots = ["1-C","1-LW","1-RW","2-C","2-LW","2-RW","3-C","3-LW","3-RW"];
  fwds.slice(0, fSlots.length).forEach((p, i) => { assignments[p.id] = fSlots[i]; });
  // D pairs: top-IQ D anchors each pair, partner on the opposite side.
  const dSlots = ["1-LD","1-RD","2-LD","2-RD","3-LD","3-RD"];
  defs.slice(0, dSlots.length).forEach((p, i) => { assignments[p.id] = dSlots[i]; });
  // Goalies
  if (goalies[0]) assignments[goalies[0].id] = "G-S";
  if (goalies[1]) assignments[goalies[1].id] = "G-B";

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
