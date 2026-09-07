// Birth-year → division mapping + user-facing display helpers.
//
// Two ways a player's level gets set:
//   (a) they pick a division directly from the wizard → player.level = "U11 / Atom"
//   (b) they enter year of birth → we derive the matching division and ALSO
//       remember the birth year so the UI can show "Born 2015" instead of
//       "U11 / Atom" everywhere the user sees their division.
//
// `player.level` is always populated (it's the internal key for question
// lookups, SKILLS[level], qb[level], etc.). `player.birthYear` is optional
// — when present, display helpers prefer it.

const BUCKETS = [
  { min: 6,  max: 7,  level: "U7 / Initiation" },
  { min: 8,  max: 9,  level: "U9 / Novice" },
  { min: 10, max: 11, level: "U11 / Atom" },
  { min: 12, max: 13, level: "U13 / Peewee" },
  { min: 14, max: 15, level: "U15 / Bantam" },
  { min: 16, max: 17, level: "U18 / Midget" },
];

// Season year = calendar year the season *started* in. Hockey Canada / USA
// Hockey use "age as of Dec 31 of the season-start year" to slot players.
function currentSeasonYear(now = new Date()) {
  // Season turns over Sept 1. Before Sept, we're still in last year's season.
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Given a year of birth, return the division level string (e.g. "U11 / Atom")
 * a player of that age would be in this season. Returns null if out of range
 * (too young or too old for our U7–U18 buckets).
 */
export function deriveLevelFromBirthYear(birthYear, now = new Date()) {
  if (!birthYear || typeof birthYear !== "number") return null;
  const seasonYear = currentSeasonYear(now);
  const age = seasonYear - birthYear;
  const bucket = BUCKETS.find(b => age >= b.min && age <= b.max);
  return bucket ? bucket.level : null;
}

/**
 * Valid birth years that map into one of our divisions for the current season.
 * Useful for populating a dropdown in the wizard — avoids users picking a year
 * we can't actually slot them into.
 */
export function validBirthYears(now = new Date()) {
  const seasonYear = currentSeasonYear(now);
  const youngest = seasonYear - 6;  // oldest age 6 → born in seasonYear - 6
  const oldest = seasonYear - 17;   // youngest age 17 → born in seasonYear - 17
  const years = [];
  for (let y = youngest; y >= oldest; y--) years.push(y);
  return years;
}

/**
 * Level string used for internal data lookups. Always prefer player.level
 * (always set); derive from birthYear only as a fallback for partially
 * migrated profiles.
 */
export function getLevel(player) {
  if (player?.level) return player.level;
  if (player?.birthYear) return deriveLevelFromBirthYear(player.birthYear) || null;
  return null;
}

/**
 * User-facing display for the player's age group. When the user chose to
 * enter a year of birth, show "Born 2015" — the division label (U11, etc.)
 * is an internal detail they didn't pick and shouldn't see.
 */
export function getLevelDisplay(player) {
  if (player?.birthYear) return `Born ${player.birthYear}`;
  return player?.level || "";
}
