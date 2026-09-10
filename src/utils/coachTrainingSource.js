// Where the coach dashboard's "Training Activity" section reads from.
//
// QA 2026-09-10: the landing-page coach demo (team "demo-t1", roster ids
// dr1..dr16) asked Supabase for every roster player. Those ids are not UUIDs,
// so Postgres answered 400 sixteen times and the strict read threw, and the
// section showed "Training history could not be loaded" -- even though
// seedDemoTrainingForRoster had just written local sessions for exactly this
// roster. Demo rosters read the device log; real teams read the cloud.

export const DEMO_TEAM_ID = "demo-t1";

// All local demo teams: demo-t1..t3 (coach demo) and "demo-team" (player
// preview). Real team ids are UUIDs, so this can never match one.
export function isDemoTeam(teamId) {
  return typeof teamId === "string" && /^demo-(t\d+|team)$/.test(teamId);
}

/**
 * Resolve `{ [playerId]: sessions[] }` for a roster.
 *
 * @param {Array<{id:string}>} roster
 * @param {{ demo: boolean, remote: (id:string, opts:{strict:boolean}) => Promise<Array>, local: (id:string) => {sessions?:Array} }} io
 */
export async function loadRosterTraining(roster, { demo, remote, local }) {
  const out = {};
  await Promise.all((Array.isArray(roster) ? roster : []).map(async (p) => {
    if (!p?.id) return;
    if (demo) {
      let log = null;
      try { log = local(p.id); } catch { log = null; }
      out[p.id] = Array.isArray(log?.sessions) ? log.sessions : [];
      return;
    }
    const sessions = await remote(p.id, { strict: true });
    out[p.id] = sessions || [];
  }));
  return out;
}
