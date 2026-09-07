// ASCII rink preview for sanity-checking a scenario in the terminal.
// Renders a normalized 0..1 actor list onto a small character grid with
// hockey-playbook-ish glyphs (Y for player, T# for teammates, X for
// defenders, G for goalie, • for puck). Coords are simple — just bin
// each actor into the nearest cell and overprint.

const COLS = 60;
const ROWS = 14;

function glyph(actor, idx) {
  switch (actor.kind) {
    case "player":   return "Y";
    case "teammate": return actor.tag ? actor.tag[0] : "T";
    case "defender": return "X";
    case "goalie":   return "G";
    case "puck":     return "•";
    default:         return "?";
  }
}

export function asciiRink(actors, view = "full") {
  // Pick visible x range based on view so the same coords scale right.
  const xMin = view === "right" ? 0.5 : 0;
  const xMax = view === "left"  ? 0.5 : 1;
  const xSpan = xMax - xMin;

  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(" "));

  // Border + center markers so readers can orient.
  for (let c = 0; c < COLS; c++) {
    grid[0][c] = "─";
    grid[ROWS - 1][c] = "─";
  }
  for (let r = 0; r < ROWS; r++) {
    grid[r][0] = "│";
    grid[r][COLS - 1] = "│";
  }
  // Goal line tick at the OZ end (right side) when view shows it.
  if (view === "full" || view === "right") {
    const c = Math.floor((0.933 - xMin) / xSpan * (COLS - 2)) + 1;
    if (c > 0 && c < COLS - 1) for (let r = 1; r < ROWS - 1; r++) grid[r][c] = ":";
  }
  if (view === "full" || view === "left") {
    const c = Math.floor((0.067 - xMin) / xSpan * (COLS - 2)) + 1;
    if (c > 0 && c < COLS - 1) for (let r = 1; r < ROWS - 1; r++) grid[r][c] = ":";
  }
  // Center line.
  if (view === "full") {
    const c = Math.floor((0.5 - xMin) / xSpan * (COLS - 2)) + 1;
    for (let r = 1; r < ROWS - 1; r++) grid[r][c] = "│";
  }

  // Plot actors.
  for (let i = 0; i < actors.length; i++) {
    const a = actors[i];
    if (a.x < xMin || a.x > xMax) continue;
    const cx = Math.floor((a.x - xMin) / xSpan * (COLS - 2)) + 1;
    const cy = Math.floor(a.y * (ROWS - 2)) + 1;
    if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) continue;
    grid[cy][cx] = glyph(a, i);
  }

  return grid.map(row => row.join("")).join("\n");
}
