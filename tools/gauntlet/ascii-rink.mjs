// Render a scenario's normalized actor coords (0..1) to a compact ASCII rink so
// text-only review agents can "see" the geometry. Left = own end, right = net.
// Pure + unit-tested.
const TOKEN = { player: "Y", teammate: "T", defender: "D", goalie: "G", puck: "o" };

export function asciiRink(scenario, { cols = 24, rows = 11 } = {}) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(" "));
  // Draw the puck first so a player sharing its cell is drawn on top (visible).
  const actors = [...(scenario.actors || [])].sort((a, b) => (a.kind === "puck" ? -1 : 0) - (b.kind === "puck" ? -1 : 0));
  for (const a of actors) {
    const cx = Math.min(cols - 1, Math.max(0, Math.round((a.x ?? 0) * (cols - 1))));
    const cy = Math.min(rows - 1, Math.max(0, Math.round((a.y ?? 0) * (rows - 1))));
    grid[cy][cx] = TOKEN[a.kind] || "?";
  }
  const bar = "+" + "-".repeat(cols) + "+";
  const body = grid.map((r) => "|" + r.join("") + "|").join("\n");
  return `${bar}\n${body}\n${bar}\nleft = own end, right = net · Y=you T=teammate D=defender G=goalie o=puck`;
}
