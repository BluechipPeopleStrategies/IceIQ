// board-svg.mjs — deterministic top-down "coach's board" diagram renderer.
// Takes actor positions (normalized 0..1) + the read (arrows/rings) and emits
// a clean flat SVG: players are DOTS, not figurines. No 3D, no rotation, no
// figures — exactly what a coach draws on a whiteboard. This replaces letting
// an LLM hand-draw players (which produced rotated, head-and-stick figurines).
//
// A spec:
// {
//   actors: [ { kind:"home"|"opp"|"goalie"|"puck", x, y, tag? } ],
//   arrows: [ { x1,y1,x2,y2, color? } ],   // the read (gold by default)
//   rings:  [ { x,y, r?, color? } ],       // open target (green dashed)
//   nets:   ["left"|"right"|"top"|"bottom"] // which ends to draw a net+crease
// }
//
// Usage:  node scripts/board-svg.mjs <spec.json> <out.svg>
//   (no args → writes a built-in demo to /c/tmp/board-demo.svg)

import { readFileSync, writeFileSync } from "node:fs";

const W = 1200, H = 800;
const PX = (v, dim) => (v * (dim === "y" ? H : W)).toFixed(1);
const HOME = "#d6a300", HOME_RING = "#7c5a12";
const GOLD = "#C9A24B", GREEN = "#36d17a";

function rink(nets) {
  const x = (v) => (v * W).toFixed(1), y = (v) => (v * H).toFixed(1);
  const L = [];
  L.push(`<rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="90" fill="#f6fbff" stroke="#a9c6da" stroke-width="6"/>`);
  // blue lines + center red
  L.push(`<line x1="${W * 0.305}" y1="48" x2="${W * 0.305}" y2="${H - 48}" stroke="#2467d8" stroke-width="10" opacity="0.7"/>`);
  L.push(`<line x1="${W * 0.695}" y1="48" x2="${W * 0.695}" y2="${H - 48}" stroke="#2467d8" stroke-width="10" opacity="0.7"/>`);
  L.push(`<line x1="${W * 0.5}" y1="48" x2="${W * 0.5}" y2="${H - 48}" stroke="#d8212a" stroke-width="5" opacity="0.7"/>`);
  L.push(`<circle cx="${W * 0.5}" cy="${H * 0.5}" r="78" fill="none" stroke="#d8212a" stroke-width="4" opacity="0.35"/>`);
  // faceoff circles + dots
  for (const [fx, fy] of [[0.21, 0.3], [0.21, 0.7], [0.79, 0.3], [0.79, 0.7]]) {
    L.push(`<circle cx="${x(fx)}" cy="${y(fy)}" r="70" fill="none" stroke="#d8212a" stroke-width="4" opacity="0.32"/>`);
    L.push(`<circle cx="${x(fx)}" cy="${y(fy)}" r="6" fill="#d8212a" opacity="0.6"/>`);
  }
  // goal lines + nets + creases
  const ends = { left: 0.12, right: 0.88 };
  for (const side of (nets || [])) {
    if (side === "left" || side === "right") {
      const gx = ends[side], dir = side === "left" ? 1 : -1;
      L.push(`<line x1="${x(gx)}" y1="${y(0.20)}" x2="${x(gx)}" y2="${y(0.80)}" stroke="#d8212a" stroke-width="4"/>`);
      // crease (half-circle facing ice)
      L.push(`<path d="M ${x(gx)} ${y(0.4)} q ${dir * 70} 0 ${dir * 70} ${0} q 0 ${65} ${-dir * 70} ${65} z" transform="translate(0,${y(0.1) - 80})" fill="#cfe8fb" stroke="#65a9d9" stroke-width="3" opacity="0.85"/>`);
      // net
      const nx = side === "left" ? x(gx) - 42 : x(gx);
      L.push(`<rect x="${side === "left" ? x(gx) - 42 : x(gx)}" y="${y(0.43)}" width="42" height="${(0.14 * H).toFixed(0)}" fill="none" stroke="#c92f2f" stroke-width="6"/>`);
    }
  }
  return L.join("\n  ");
}

function marker(a) {
  const cx = PX(a.x, "x"), cy = PX(a.y, "y");
  if (a.kind === "puck") {
    return `<circle cx="${cx}" cy="${cy}" r="11" fill="#0a0a0a" stroke="#fff" stroke-width="2"/>`;
  }
  if (a.kind === "goalie") {
    return `<g transform="translate(${cx},${cy})"><rect x="-22" y="-22" width="44" height="44" rx="13" fill="#51607A" stroke="#fff" stroke-width="3"/><text y="7" text-anchor="middle" font-family="Arial" font-size="22" font-weight="900" fill="#fff">G</text></g>`;
  }
  if (a.kind === "opp") {
    // other team — open white disc with an X (playbook opponent), upright.
    return `<g transform="translate(${cx},${cy})"><circle r="26" fill="#ffffff" stroke="#5b6b78" stroke-width="4"/><line x1="-12" y1="-12" x2="12" y2="12" stroke="#5b6b78" stroke-width="5" stroke-linecap="round"/><line x1="-12" y1="12" x2="12" y2="-12" stroke="#5b6b78" stroke-width="5" stroke-linecap="round"/></g>`;
  }
  // home — filled gold disc, upright tag.
  return `<g transform="translate(${cx},${cy})"><circle r="26" fill="${HOME}" stroke="#fff" stroke-width="3"/><circle r="29" fill="none" stroke="${HOME_RING}" stroke-width="2"/>${a.tag ? `<text y="7" text-anchor="middle" font-family="Arial" font-size="20" font-weight="900" fill="#2a1c00">${a.tag}</text>` : ""}</g>`;
}

function arrow(a, i) {
  const x1 = PX(a.x1, "x"), y1 = PX(a.y1, "y"), x2 = PX(a.x2, "x"), y2 = PX(a.y2, "y");
  const col = a.color || GOLD;
  const mx = (+x1 + +x2) / 2, my = Math.min(+y1, +y2) - 60;
  return `<path d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="9" stroke-linecap="round" stroke-dasharray="2 0" marker-end="url(#ba${i})"/>`;
}

export function renderBoard(spec) {
  const defs = (spec.arrows || []).map((a, i) =>
    `<marker id="ba${i}" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${a.color || GOLD}"/></marker>`).join("");
  const rings = (spec.rings || []).map(r =>
    `<circle cx="${PX(r.x, "x")}" cy="${PX(r.y, "y")}" r="${(r.r ?? 0.045) * W}" fill="none" stroke="${r.color || GREEN}" stroke-width="6" stroke-dasharray="14 9"/>`).join("\n  ");
  const markers = (spec.actors || []).filter(a => a.kind !== "puck").map(marker).join("\n  ");
  const pucks = (spec.actors || []).filter(a => a.kind === "puck").map(marker).join("\n  ");
  const arrows = (spec.arrows || []).map(arrow).join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${defs}</defs>
  ${rink(spec.nets)}
  ${rings}
  ${arrows}
  ${markers}
  ${pucks}
</svg>
`;
}

const specPath = process.argv[2];
const outPath = process.argv[3] || "/c/tmp/board-demo.svg";
const demo = {
  nets: ["left"],
  actors: [
    { kind: "home", x: 0.704, y: 0.70, tag: "C" },
    { kind: "puck", x: 0.66, y: 0.70 },
    { kind: "home", x: 0.508, y: 0.498, tag: "W" },
    { kind: "opp",  x: 0.60, y: 0.588 },
    { kind: "goalie", x: 0.12, y: 0.5 },
  ],
  arrows: [ { x1: 0.70, y1: 0.70, x2: 0.165, y2: 0.5 } ],
};
import { pathToFileURL } from "node:url";
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const spec = specPath ? JSON.parse(readFileSync(specPath, "utf8")) : demo;
  writeFileSync(outPath, renderBoard(spec), "utf8");
  console.log(`wrote clean top-down board → ${outPath}`);
}
