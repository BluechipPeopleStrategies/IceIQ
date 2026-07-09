// Resolve the player's division string to a gym age-band key.
// `player.level` arrives as strings like "U11 / Atom" (see utils/ageGroup.js);
// this is the ONE place that turns any of those into a bare band key.

const BANDS = ["U7", "U9", "U11", "U13", "U15", "U18"];
const NAME_TO_BAND = {
  initiation: "U7",
  novice: "U9",
  atom: "U11",
  peewee: "U13",
  bantam: "U15",
  midget: "U18",
};

export function resolveBand(levelString) {
  const s = String(levelString || "").trim();
  if (!s) return null;
  const m = s.match(/u\s*(\d{1,2})/i);
  if (m) {
    const key = `U${m[1]}`;
    if (BANDS.includes(key)) return key;
  }
  const lower = s.toLowerCase();
  for (const name of Object.keys(NAME_TO_BAND)) {
    if (lower.includes(name)) return NAME_TO_BAND[name];
  }
  return null;
}
