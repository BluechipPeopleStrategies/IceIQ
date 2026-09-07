// brief-to-image.mjs — turn an image-question brief that carries a `board`
// spec (actor POSITIONS, not freehand art) into (a) a clean top-down board SVG
// rendered by board-svg.mjs and (b) the live bank MC entry, with the read
// overlays (arrow/ring) auto-derived from the actors' coordinates.
//
// This replaces letting an LLM draw players: the diagram is now DATA → a
// deterministic renderer, so every board is coach-legit and consistent, and
// the overlays land exactly on the players (no hand-reading coordinates).
//
// Usage:  node scripts/brief-to-image.mjs <brief.json> [out-bank-entry.json]
//
// brief.board = {
//   nets: ["left"|"right"],
//   actors: [ { id, kind:"home"|"opp"|"goalie", at:"<zone>"|x,y, tag?, hasPuck? } ],
//   read:  { from:"<actorId>", to:"<actorId>|<zoneId>", ringOn?:"<actorId>|<zoneId>" }
// }

import { readFileSync, writeFileSync } from "node:fs";
import { renderBoard } from "./board-svg.mjs";
import { resolveTarget } from "../src/scenario/zones.js";

const briefPath = process.argv[2];
if (!briefPath) { console.error("usage: node scripts/brief-to-image.mjs <brief.json> [out.json]"); process.exit(2); }
const brief = JSON.parse(readFileSync(briefPath, "utf8"));
const board = brief.board;
if (!board || !Array.isArray(board.actors)) { console.error("brief is missing a board.actors spec"); process.exit(2); }

function coordOf(a) {
  if (typeof a.x === "number" && typeof a.y === "number") return { x: a.x, y: a.y };
  if (a.at) { const t = resolveTarget({ zoneId: a.at }); return { x: t.x, y: t.y }; }
  throw new Error(`board actor "${a.id}" needs {x,y} or {at:"<zone>"}`);
}
const actors = board.actors.map((a) => ({ ...a, ...coordOf(a) }));
const byId = Object.fromEntries(actors.map((a) => [a.id, a]));
const pt = (ref) => {
  if (byId[ref]) return { x: byId[ref].x, y: byId[ref].y };
  const t = resolveTarget(typeof ref === "string" ? { zoneId: ref } : ref);
  return { x: t.x, y: t.y };
};

// Render the STATIC board (rink + players, no answer arrow — that's an overlay).
const renderActors = actors.map((a) => ({ kind: a.kind, x: a.x, y: a.y, tag: a.tag }));
const carrier = actors.find((a) => a.hasPuck);
if (carrier) renderActors.push({ kind: "puck", x: +(carrier.x - 0.028).toFixed(3), y: carrier.y });
const url = `/assets/images/${brief.id}.svg`;
writeFileSync(`public${url}`, renderBoard({ nets: board.nets, actors: renderActors }), "utf8");

// Derive the read overlays from the actor coordinates.
const overlays = [];
if (board.read) {
  const f = pt(board.read.from), t = pt(board.read.to);
  overlays.push({ kind: "arrow", x1: +f.x.toFixed(3), y1: +f.y.toFixed(3), x2: +t.x.toFixed(3), y2: +t.y.toFixed(3), color: "#C9A24B" });
  if (board.read.ringOn) { const r = pt(board.read.ringOn); overlays.push({ kind: "ring", x: +r.x.toFixed(3), y: +r.y.toFixed(3), r: 0.05, color: "#36d17a", dashed: true }); }
}

const entry = {
  id: brief.id, type: "mc", nodeId: brief.nodeId, levels: [brief.level], cat: brief.cat, d: brief.d,
  sit: brief.sit, opts: brief.opts, ok: brief.ok, explain: brief.explain,
  media: { url, alt: brief.alt || "", ratio: "3 / 2" }, overlays,
};
const out = process.argv[3] || `docs/ai-pipeline/${brief.id}.bank.json`;
writeFileSync(out, JSON.stringify(entry, null, 2) + "\n", "utf8");
console.log(`rendered clean board → public${url}`);
console.log(`bank MC entry (media + ${overlays.length} auto-overlays) → ${out}`);
