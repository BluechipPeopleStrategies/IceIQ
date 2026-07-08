// tools/scene-forge.mjs — RinkReads scene image library generator.
//
// Renders top-down rink scene images (the house style: clean diagram
// scenes that overlays annotate later) from data definitions, and emits
// a coordinate manifest per docs/factory/SPEC.md stage [2]: normalized
// puck / actors / lane / openTarget coords so overlay placement needs
// zero hand work.
//
// Design rules baked in:
// - Scenes depict the SITUATION only. The read (gold arrow, green ring)
//   is never drawn into the image — it ships as manifest coords for
//   q.overlays so the answer isn't telegraphed before the kid answers.
// - Colorblind-safe teams: yellow team = circles, black team = squares
//   (shape + color, never color alone).
// - Gray dashed arrows = motion context (where someone is skating),
//   which describes the situation, not the answer.
// - Rink geometry matches RinkReadsRink.jsx: 600x300 units, goal lines
//   x=40/560, blue lines x=213/387, center x=300.
//
// Usage: node tools/scene-forge.mjs
// Output: public/assets/scenes-u11/<id>.png + src/data/scene-manifest.json

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "assets", "scenes-u11");
const MANIFEST = join(ROOT, "src", "data", "scene-manifest.json");

// ── palette (from RinkReadsRink.jsx + shared.jsx) ────────────────────
const P = {
  ice: "#eef6fb", iceEdge: "#dcebf5",
  boards: "#0a2850", red: "#CC1F2B", blue: "#185FA5",
  creaseFill: "rgba(55,138,221,0.18)", creaseLine: "#378ADD",
  yFill: "#EF9F27", yEdge: "#854F0B", yText: "#041E42",
  bFill: "#2C2C2A", bEdge: "#0a0a0a", bText: "#ffffff",
  puck: "#111111", glow: "#FC4C02",
  motion: "#64748b", you: "#FC4C02", label: "#041E42",
};

// ── views: what slice of the 600x300 rink the image shows ────────────
const VIEWS = {
  full: { x: -12, y: -12, w: 624, h: 324, out: [1248, 648] },
  oz:   { x: 250, y: -12, w: 362, h: 324, out: [1086, 972] }, // right end
  dz:   { x: -12, y: -12, w: 362, h: 324, out: [1086, 972] }, // left end
};

// ── rink drawing ─────────────────────────────────────────────────────
function rink() {
  const s = [];
  s.push(`<rect x="0" y="0" width="600" height="300" rx="56" fill="${P.ice}" stroke="${P.boards}" stroke-width="7"/>`);
  s.push(`<rect x="0" y="0" width="600" height="300" rx="56" fill="none" stroke="${P.iceEdge}" stroke-width="1" transform="translate(0,0)"/>`);
  // center + blue + goal lines (clipped by rounded boards via clipPath)
  s.push(`<clipPath id="rk"><rect x="3" y="3" width="594" height="294" rx="52"/></clipPath>`);
  s.push(`<g clip-path="url(#rk)">`);
  s.push(`<line x1="300" y1="0" x2="300" y2="300" stroke="${P.red}" stroke-width="5"/>`);
  s.push(`<line x1="213" y1="0" x2="213" y2="300" stroke="${P.blue}" stroke-width="6"/>`);
  s.push(`<line x1="387" y1="0" x2="387" y2="300" stroke="${P.blue}" stroke-width="6"/>`);
  s.push(`<line x1="40" y1="0" x2="40" y2="300" stroke="${P.red}" stroke-width="3"/>`);
  s.push(`<line x1="560" y1="0" x2="560" y2="300" stroke="${P.red}" stroke-width="3"/>`);
  // center circle + dot
  s.push(`<circle cx="300" cy="150" r="34" fill="none" stroke="${P.blue}" stroke-width="2.5"/>`);
  s.push(`<circle cx="300" cy="150" r="3.5" fill="${P.blue}"/>`);
  // end-zone circles + dots
  for (const [cx, cy] of [[100,80],[100,220],[500,80],[500,220]]) {
    s.push(`<circle cx="${cx}" cy="${cy}" r="34" fill="none" stroke="${P.red}" stroke-width="2.5"/>`);
    s.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${P.red}"/>`);
  }
  // neutral-zone dots
  for (const [cx, cy] of [[228,80],[228,220],[372,80],[372,220]])
    s.push(`<circle cx="${cx}" cy="${cy}" r="4" fill="${P.red}"/>`);
  // creases + nets
  for (const gx of [40, 560]) {
    const dir = gx === 40 ? 1 : -1;
    s.push(`<path d="M ${gx} ${150-26} A 26 26 0 0 ${gx===40?1:0} ${gx} ${150+26} Z" fill="${P.creaseFill}" stroke="${P.creaseLine}" stroke-width="2"/>`);
    s.push(`<rect x="${gx - (dir===1?13:0)}" y="${150-15}" width="13" height="30" fill="none" stroke="${P.red}" stroke-width="3" rx="3"/>`);
  }
  s.push(`</g>`);
  return s.join("");
}

// ── actors ───────────────────────────────────────────────────────────
function actor(a) {
  const r = a.goalie ? 11 : 13;
  const fill = a.team === "y" ? P.yFill : P.bFill;
  const edge = a.team === "y" ? P.yEdge : P.bEdge;
  const text = a.team === "y" ? P.yText : P.bText;
  const s = [];
  const face = (a.facing ?? 0) * Math.PI / 180;
  // stick wedge shows facing
  const sx = a.x + Math.cos(face) * (r + 1), sy = a.y + Math.sin(face) * (r + 1);
  const ex = a.x + Math.cos(face) * (r + 13), ey = a.y + Math.sin(face) * (r + 13);
  s.push(`<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${edge}" stroke-width="3.5" stroke-linecap="round"/>`);
  s.push(`<circle cx="${ex}" cy="${ey}" r="2.6" fill="${edge}"/>`); // blade
  if (a.team === "y") {
    s.push(`<circle cx="${a.x}" cy="${a.y}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width="2.5"/>`);
  } else {
    const d = r * 1.75;
    s.push(`<rect x="${a.x - d/2}" y="${a.y - d/2}" width="${d}" height="${d}" rx="5" fill="${fill}" stroke="#555" stroke-width="2" transform="rotate(${(a.facing ?? 0)} ${a.x} ${a.y})"/>`);
  }
  s.push(`<text x="${a.x}" y="${a.y + 4.2}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="800" font-size="11.5" fill="${text}">${a.tag}</text>`);
  if (a.you) {
    s.push(`<circle cx="${a.x}" cy="${a.y}" r="${r + 6.5}" fill="none" stroke="${P.you}" stroke-width="3"/>`);
    s.push(`<text x="${a.x}" y="${a.y - r - 12}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="900" font-size="12.5" fill="${P.you}" letter-spacing="1">YOU</text>`);
  }
  return s.join("");
}

function puckAt(p, carrier) {
  const s = [];
  s.push(`<circle cx="${p.x}" cy="${p.y}" r="10" fill="${P.glow}" opacity="0.22"/>`);
  s.push(`<circle cx="${p.x}" cy="${p.y}" r="4.6" fill="${P.puck}"/>`);
  return s.join("");
}

// gray dashed motion arrow — situation context, never the answer
function motion(m) {
  return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${P.motion}" stroke-width="3" stroke-dasharray="7 6" marker-end="url(#mArr)" opacity="0.85"/>`;
}
// puck-in-flight (pass being made in the scene) — thin solid gray
function flight(m) {
  return `<line x1="${m.x1}" y1="${m.y1}" x2="${m.x2}" y2="${m.y2}" stroke="${P.motion}" stroke-width="2" stroke-dasharray="2 5" opacity="0.9"/>`;
}

function render(scene) {
  const v = VIEWS[scene.view];
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${v.x} ${v.y} ${v.w} ${v.h}" width="${v.out[0]}" height="${v.out[1]}">`);
  parts.push(`<defs><marker id="mArr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${P.motion}"/></marker></defs>`);
  parts.push(`<rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" fill="#f7fbfd"/>`);
  parts.push(rink());
  for (const m of scene.motions || []) parts.push(motion(m));
  for (const f of scene.flights || []) parts.push(flight(f));
  for (const a of scene.actors) parts.push(actor(a));
  if (scene.puck) parts.push(puckAt(scene.puck));
  parts.push(`</svg>`);
  return parts.join("\n");
}

// normalize a rink-space point into image-space 0-1 for the manifest
function norm(scene, pt) {
  const v = VIEWS[scene.view];
  return { x: +(((pt.x - v.x) / v.w).toFixed(4)), y: +(((pt.y - v.y) / v.h).toFixed(4)) };
}

// ═════════════════════════════════════════════════════════════════════
// SCENE LIBRARY — attack → right net (x=560); defend ← left net (x=40)
// lane/openTarget = the READ, manifest-only, never drawn.
// ═════════════════════════════════════════════════════════════════════
const SCENES = [
{ id:"nz-carry-open", view:"full",
  desc:"You carry the puck through the neutral zone with speed. One defender waits far ahead with a big gap, watching you.",
  actors:[
    {team:"y",tag:"YOU",x:250,y:150,facing:0,you:true},
    {team:"y",tag:"W",x:255,y:60,facing:0},{team:"y",tag:"W",x:255,y:240,facing:0},
    {team:"b",tag:"D",x:430,y:150,facing:180},{team:"b",tag:"D",x:470,y:230,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:180,goalie:true},
  ],
  puck:{x:266,y:150},
  motions:[{x1:270,y1:150,x2:330,y2:150}],
  lane:{x1:266,y1:150,x2:400,y2:150}, open:{x:400,y:150,r:30},
  serves:["rr-u11-deception-with-feet-1","rr-u11-deception-with-feet-3","rr-u11-puck-control-5"] },

{ id:"oz-blue-line-contact", view:"oz",
  desc:"You cross the offensive blue line with the puck as a defender bumps into you shoulder to shoulder.",
  actors:[
    {team:"y",tag:"YOU",x:398,y:118,facing:15,you:true},
    {team:"b",tag:"D",x:416,y:100,facing:150},
    {team:"b",tag:"D",x:470,y:210,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:180,goalie:true},
    {team:"y",tag:"W",x:405,y:235,facing:0},
  ],
  puck:{x:410,y:132},
  lane:{x1:410,y1:132,x2:470,y2:150}, open:{x:470,y:150,r:26},
  serves:["rr-u11-edges-balance-3"] },

{ id:"oz-corner-turn-loose", view:"oz",
  desc:"A loose puck sits behind you near the corner. You are turning back hard toward it, the short way, with a defender closing.",
  actors:[
    {team:"y",tag:"YOU",x:470,y:120,facing:130,you:true},
    {team:"b",tag:"D",x:520,y:80,facing:120},
    {team:"b",tag:"G",x:552,y:150,facing:200,goalie:true},
  ],
  puck:{x:520,y:230},
  motions:[{x1:478,y1:132,x2:512,y2:214}],
  lane:{x1:478,y1:132,x2:512,y2:214}, open:{x:520,y:230,r:24},
  serves:["rr-u11-agility-mobility-2","rr-u11-edges-balance-4"] },

{ id:"oz-crease-scramble", view:"oz",
  desc:"A rebound sits in front of the net during a scramble. You are beside the crease in a low, loaded stance; defenders and the goalie are reacting.",
  actors:[
    {team:"y",tag:"YOU",x:522,y:178,facing:340,you:true},
    {team:"y",tag:"F",x:498,y:120,facing:20},
    {team:"b",tag:"D",x:530,y:120,facing:70},
    {team:"b",tag:"D",x:505,y:205,facing:20},
    {team:"b",tag:"G",x:552,y:158,facing:210,goalie:true},
  ],
  puck:{x:536,y:168},
  serves:["rr-u11-edges-balance-5","rr-u11-agility-mobility-4","rr-u11-battles-and-compete-5","rr-u11-net-front-play-3"] },

{ id:"nz-gap-read", view:"full",
  desc:"An opponent carries the puck through the neutral zone toward you. You are the defender skating backward, managing the gap between you.",
  actors:[
    {team:"b",tag:"C",x:250,y:150,facing:0},
    {team:"b",tag:"W",x:240,y:70,facing:0},
    {team:"y",tag:"YOU",x:360,y:150,facing:0,you:true},
    {team:"y",tag:"D",x:380,y:230,facing:0},
    {team:"y",tag:"G",x:48,y:150,facing:0,goalie:true},
  ],
  puck:{x:264,y:150},
  motions:[{x1:268,y1:150,x2:308,y2:150},{x1:352,y1:150,x2:318,y2:150}],
  lane:{x1:360,y1:150,x2:300,y2:150}, open:{x:300,y:150,r:24},
  serves:["rr-u11-gap-control-1","rr-u11-gap-control-2","rr-u11-gap-control-4","rr-u11-gap-control-5","rr-u11-backward-transitions-1","rr-u11-backward-transitions-4"] },

{ id:"nz-turnover-pivot", view:"full",
  desc:"You just lost the puck at the offensive blue line. Their winger takes off the other way with it while you pivot to chase.",
  actors:[
    {team:"y",tag:"YOU",x:392,y:130,facing:200,you:true},
    {team:"b",tag:"W",x:352,y:150,facing:180},
    {team:"y",tag:"D",x:230,y:100,facing:0},{team:"y",tag:"D",x:230,y:200,facing:0},
    {team:"y",tag:"G",x:48,y:150,facing:0,goalie:true},
  ],
  puck:{x:338,y:150},
  motions:[{x1:330,y1:150,x2:270,y2:150},{x1:384,y1:136,x2:340,y2:160}],
  lane:{x1:392,y1:130,x2:310,y2:152}, open:{x:310,y:152,r:24},
  serves:["rr-u11-backward-transitions-3","rr-u11-transition-reads-1","rr-u11-transition-reads-3","rr-u11-transition-reads-4"] },

{ id:"dz-regroup-backskate", view:"full",
  desc:"Your defenseman skates backward through the neutral zone with the puck on a regroup. All three forwards are ahead, swinging for a pass.",
  actors:[
    {team:"y",tag:"D",x:200,y:150,facing:0},
    {team:"y",tag:"C",x:280,y:150,facing:180},
    {team:"y",tag:"W",x:300,y:70,facing:0},{team:"y",tag:"W",x:300,y:230,facing:0},
    {team:"b",tag:"F",x:340,y:120,facing:180},
    {team:"b",tag:"D",x:470,y:100,facing:180},{team:"b",tag:"D",x:470,y:200,facing:180},
  ],
  puck:{x:214,y:150},
  motions:[{x1:196,y1:142,x2:170,y2:142},{x1:284,y1:158,x2:250,y2:180}],
  lane:{x1:214,y1:150,x2:300,y2:230}, open:{x:300,y:230,r:26},
  serves:["rr-u11-backward-transitions-5","rr-u11-breakout-and-regroup-4"] },

{ id:"oz-footwork-fake", view:"oz",
  desc:"You sell a hard crossover step to the left. The defender leans that way, hips turning, as you prepare to cut back the other way.",
  actors:[
    {team:"y",tag:"YOU",x:440,y:150,facing:330,you:true},
    {team:"b",tag:"D",x:478,y:128,facing:225},
    {team:"b",tag:"G",x:552,y:150,facing:190,goalie:true},
  ],
  puck:{x:452,y:140},
  motions:[{x1:448,y1:138,x2:470,y2:118},{x1:482,y1:122,x2:498,y2:104}],
  lane:{x1:452,y1:140,x2:505,y2:185}, open:{x:505,y:185,r:24},
  serves:["rr-u11-deception-with-feet-2","rr-u11-deception-with-feet-4","rr-u11-deception-with-feet-5","rr-u11-attacking-1v1-4"] },

{ id:"nz-head-up-carry", view:"full",
  desc:"You carry the puck through center ice. A forechecker closes on you while two teammates are open, one on each wing.",
  actors:[
    {team:"y",tag:"YOU",x:295,y:150,facing:0,you:true},
    {team:"y",tag:"W",x:330,y:60,facing:0},{team:"y",tag:"W",x:330,y:240,facing:0},
    {team:"b",tag:"F",x:345,y:135,facing:190},
    {team:"b",tag:"D",x:460,y:110,facing:180},{team:"b",tag:"D",x:460,y:190,facing:180},
  ],
  puck:{x:309,y:150},
  motions:[{x1:340,y1:138,x2:318,y2:146}],
  lane:{x1:309,y1:150,x2:330,y2:240}, open:{x:330,y:240,r:26},
  serves:["rr-u11-puck-control-1","rr-u11-puck-control-2","rr-u11-puck-control-3","rr-u11-decision-making-1"] },

{ id:"oz-corner-shield", view:"oz",
  desc:"You shield the puck in the corner with your body between it and a defender who leans on your back reaching around.",
  actors:[
    {team:"y",tag:"YOU",x:522,y:238,facing:120,you:true},
    {team:"b",tag:"D",x:502,y:220,facing:60},
    {team:"y",tag:"C",x:462,y:180,facing:60},
    {team:"b",tag:"G",x:552,y:150,facing:230,goalie:true},
  ],
  puck:{x:536,y:252},
  lane:{x1:536,y1:252,x2:462,y2:180}, open:{x:462,y:180,r:24},
  serves:["rr-u11-puck-protection-1","rr-u11-puck-protection-2","rr-u11-puck-protection-3","rr-u11-puck-protection-4","rr-u11-puck-protection-5","rr-u11-battles-and-compete-1","rr-u11-battles-and-compete-2"] },

{ id:"oz-pass-lanes", view:"oz",
  desc:"You have the puck on the half-wall. One teammate's lane has a defender's stick lying across it; another teammate's lane is completely clear.",
  actors:[
    {team:"y",tag:"YOU",x:420,y:238,facing:300,you:true},
    {team:"y",tag:"F",x:500,y:130,facing:240},
    {team:"b",tag:"D",x:465,y:190,facing:300},
    {team:"y",tag:"D",x:405,y:80,facing:330},
    {team:"b",tag:"G",x:552,y:150,facing:210,goalie:true},
  ],
  puck:{x:430,y:226},
  lane:{x1:430,y1:226,x2:405,y2:80}, open:{x:405,y:80,r:26},
  serves:["rr-u11-passing-2","rr-u11-passing-4","rr-u11-passing-5","rr-u11-creativity-under-pressure-1"] },

{ id:"oz-lead-the-receiver", view:"oz",
  desc:"Your teammate skates fast toward the net. You have the puck wide, choosing where to aim the pass for them.",
  actors:[
    {team:"y",tag:"YOU",x:430,y:60,facing:20,you:true},
    {team:"y",tag:"C",x:440,y:170,facing:20},
    {team:"b",tag:"D",x:490,y:110,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:200,goalie:true},
  ],
  puck:{x:444,y:68},
  motions:[{x1:452,y1:180,x2:498,y2:200}],
  lane:{x1:444,y1:68,x2:512,y2:206}, open:{x:512,y:206,r:26},
  serves:["rr-u11-passing-1","rr-u11-passing-3"] },

{ id:"dz-wall-receive-scan", view:"dz",
  desc:"A pass slides along the wall toward you. Behind your shoulder, out of easy view, a checker is closing in fast.",
  actors:[
    {team:"y",tag:"D",x:70,y:250,facing:40},
    {team:"y",tag:"YOU",x:170,y:272,facing:180,you:true},
    {team:"b",tag:"F",x:222,y:238,facing:210},
    {team:"y",tag:"C",x:150,y:180,facing:300},
  ],
  puck:{x:112,y:272},
  flights:[{x1:86,y1:262,x2:158,y2:272}],
  motions:[{x1:216,y1:244,x2:190,y2:262}],
  lane:{x1:170,y1:272,x2:150,y2:180}, open:{x:150,y:180,r:24},
  serves:["rr-u11-scanning-2","rr-u11-scanning-5","rr-u11-receiving-2","rr-u11-receiving-5"] },

{ id:"oz-slot-shot", view:"oz",
  desc:"You are alone in the slot with the puck and a clear look. The goalie is set in the middle; the far corner of the net is open.",
  actors:[
    {team:"y",tag:"YOU",x:470,y:150,facing:0,you:true},
    {team:"b",tag:"D",x:440,y:220,facing:300},
    {team:"b",tag:"G",x:550,y:143,facing:185,goalie:true},
  ],
  puck:{x:484,y:150},
  lane:{x1:484,y1:150,x2:558,y2:168}, open:{x:558,y:168,r:12},
  serves:["rr-u11-shooting-1","rr-u11-shooting-2"] },

{ id:"oz-point-shot-netfront", view:"oz",
  desc:"Your defenseman winds up for a shot from the point. You are at the net front, in the goalie's sightline, with your stick blade on the ice.",
  actors:[
    {team:"y",tag:"D",x:410,y:70,facing:35},
    {team:"y",tag:"YOU",x:526,y:150,facing:180,you:true},
    {team:"b",tag:"D",x:508,y:172,facing:120},
    {team:"b",tag:"D",x:470,y:110,facing:270},
    {team:"b",tag:"G",x:550,y:150,facing:190,goalie:true},
  ],
  puck:{x:422,y:78},
  lane:{x1:422,y1:78,x2:548,y2:158}, open:{x:526,y:150,r:22},
  serves:["rr-u11-shooting-3","rr-u11-reading-the-play-2","rr-u11-net-front-play-1","rr-u11-net-front-play-2","rr-u11-net-front-play-5","rr-u11-shooting-extra-1"] },

{ id:"oz-netfront-backdoor", view:"oz",
  desc:"Your teammate has the puck behind their net and every defender is turned watching them. The far post is unguarded.",
  actors:[
    {team:"y",tag:"F",x:565,y:186,facing:250},
    {team:"b",tag:"D",x:530,y:190,facing:70},
    {team:"b",tag:"D",x:508,y:130,facing:60},
    {team:"y",tag:"YOU",x:472,y:112,facing:60,you:true},
    {team:"b",tag:"G",x:550,y:158,facing:230,goalie:true},
  ],
  puck:{x:572,y:176},
  lane:{x1:472,y1:112,x2:534,y2:132}, open:{x:534,y:132,r:16},
  serves:["rr-u11-net-front-play-4"] },

{ id:"rush-2v1", view:"oz",
  desc:"A two-on-one rush: the puck carrier drives one wing, a teammate drives the other, and a single defender holds the middle between them.",
  actors:[
    {team:"y",tag:"YOU",x:400,y:95,facing:10,you:true},
    {team:"y",tag:"W",x:400,y:205,facing:350},
    {team:"b",tag:"D",x:462,y:150,facing:180},
    {team:"b",tag:"G",x:550,y:150,facing:185,goalie:true},
  ],
  puck:{x:414,y:100},
  motions:[{x1:408,y1:104,x2:446,y2:118},{x1:408,y1:198,x2:446,y2:184}],
  lane:{x1:414,y1:100,x2:540,y2:140}, open:{x:540,y:140,r:14},
  serves:["rr-u11-odd-man-reads-1","rr-u11-odd-man-reads-2","rr-u11-odd-man-reads-4","rr-u11-odd-man-reads-5","rr-u11-puck-carrier-options-4","rr-u11-decision-making-5","rr-u11-gap-control-3"] },

{ id:"rush-3v2-middle-drive", view:"full",
  desc:"A three-on-two rush. The middle attacker drives hard toward the net between the two defenders while the puck moves up the wing.",
  actors:[
    {team:"y",tag:"W",x:380,y:70,facing:10},
    {team:"y",tag:"C",x:365,y:150,facing:0},
    {team:"y",tag:"W",x:380,y:230,facing:350},
    {team:"b",tag:"D",x:455,y:115,facing:180},{team:"b",tag:"D",x:455,y:185,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:185,goalie:true},
  ],
  puck:{x:394,y:74},
  motions:[{x1:372,y1:150,x2:430,y2:150}],
  lane:{x1:365,y1:150,x2:470,y2:150}, open:{x:470,y:150,r:26},
  serves:["rr-u11-odd-man-reads-3","rr-u11-backcheck-recovery-2"] },

{ id:"blue-line-gap-soft", view:"full",
  desc:"You approach the offensive blue line with the puck. The defender keeps backing away, leaving a big soft gap of open ice in front of you.",
  actors:[
    {team:"y",tag:"YOU",x:330,y:150,facing:0,you:true},
    {team:"y",tag:"W",x:330,y:60,facing:0},
    {team:"b",tag:"D",x:465,y:150,facing:180},
    {team:"b",tag:"D",x:475,y:235,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:180,goalie:true},
  ],
  puck:{x:344,y:150},
  motions:[{x1:460,y1:150,x2:490,y2:150}],
  lane:{x1:344,y1:150,x2:420,y2:150}, open:{x:420,y:150,r:28},
  serves:["rr-u11-zone-entry-1","rr-u11-zone-entry-2","rr-u11-puck-carrier-options-2"] },

{ id:"blue-line-gap-tight-chip", view:"full",
  desc:"The defender stands you up with a tight gap right at the blue line. Your winger is flying wide with speed, and the ice behind the defender is open.",
  actors:[
    {team:"y",tag:"YOU",x:365,y:150,facing:0,you:true},
    {team:"b",tag:"D",x:392,y:150,facing:180},
    {team:"y",tag:"W",x:352,y:55,facing:10},
    {team:"b",tag:"D",x:470,y:220,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:180,goalie:true},
  ],
  puck:{x:379,y:150},
  motions:[{x1:362,y1:58,x2:412,y2:70}],
  lane:{x1:379,y1:150,x2:445,y2:90}, open:{x:445,y:90,r:26},
  serves:["rr-u11-zone-entry-3","rr-u11-zone-entry-4"] },

{ id:"blue-line-delay-drop", view:"full",
  desc:"You reach the blue line with a defender on you while your center trails open in space behind the play.",
  actors:[
    {team:"y",tag:"YOU",x:388,y:100,facing:20,you:true},
    {team:"b",tag:"D",x:412,y:112,facing:200},
    {team:"y",tag:"C",x:330,y:160,facing:10},
    {team:"b",tag:"D",x:465,y:200,facing:180},
    {team:"b",tag:"G",x:552,y:150,facing:180,goalie:true},
  ],
  puck:{x:400,y:108},
  motions:[{x1:338,y1:158,x2:372,y2:148}],
  lane:{x1:400,y1:108,x2:344,y2:156}, open:{x:344,y:156,r:24},
  serves:["rr-u11-zone-entry-5","rr-u11-puck-carrier-options-3"] },

{ id:"oz-give-and-go", view:"oz",
  desc:"You just passed to a teammate and their defender steps up on them. Open ice waits behind that committed defender for your burst.",
  actors:[
    {team:"y",tag:"YOU",x:420,y:200,facing:40,you:true},
    {team:"y",tag:"F",x:462,y:236,facing:300},
    {team:"b",tag:"D",x:446,y:214,facing:120},
    {team:"b",tag:"G",x:552,y:150,facing:215,goalie:true},
  ],
  puck:{x:472,y:228},
  flights:[{x1:432,y1:208,x2:460,y2:224}],
  motions:[{x1:428,y1:192,x2:472,y2:158}],
  lane:{x1:420,y1:200,x2:484,y2:150}, open:{x:484,y:150,r:26},
  serves:["rr-u11-off-puck-support-offense-2"] },

{ id:"oz-support-triangle", view:"oz",
  desc:"Your teammate battles with the puck in the corner. You are open at a passing angle, and another teammate drives toward the net, pulling a defender along.",
  actors:[
    {team:"y",tag:"F",x:528,y:240,facing:140},
    {team:"b",tag:"D",x:508,y:224,facing:60},
    {team:"y",tag:"YOU",x:452,y:196,facing:320,you:true},
    {team:"y",tag:"C",x:462,y:110,facing:30},
    {team:"b",tag:"D",x:492,y:120,facing:250},
    {team:"b",tag:"G",x:552,y:152,facing:225,goalie:true},
  ],
  puck:{x:540,y:252},
  motions:[{x1:470,y1:114,x2:508,y2:132}],
  lane:{x1:540,y1:252,x2:452,y2:196}, open:{x:452,y:196,r:24},
  serves:["rr-u11-off-puck-support-offense-1","rr-u11-off-puck-support-offense-3","rr-u11-off-puck-support-offense-4","rr-u11-off-puck-support-offense-5"] },

{ id:"oz-1v1-gap-balance", view:"oz",
  desc:"You attack one-on-one. The defender is between you and the net — you are reading how much gap they give and how balanced their feet are.",
  actors:[
    {team:"y",tag:"YOU",x:415,y:150,facing:0,you:true},
    {team:"b",tag:"D",x:472,y:150,facing:180},
    {team:"y",tag:"W",x:420,y:235,facing:10},
    {team:"b",tag:"G",x:552,y:150,facing:185,goalie:true},
  ],
  puck:{x:429,y:150},
  lane:{x1:429,y1:150,x2:429,y2:235}, open:{x:420,y:235,r:24},
  serves:["rr-u11-attacking-1v1-1","rr-u11-attacking-1v1-2","rr-u11-attacking-1v1-3","rr-u11-attacking-1v1-5","rr-u11-puck-carrier-options-1"] },

{ id:"oz-cycle-low", view:"oz",
  desc:"A low cycle: you carry along the wall with a defender chasing, while a teammate rotates in behind you to fill your spot.",
  actors:[
    {team:"y",tag:"YOU",x:520,y:236,facing:150,you:true},
    {team:"b",tag:"D",x:498,y:214,facing:330},
    {team:"y",tag:"F",x:452,y:250,facing:20},
    {team:"y",tag:"C",x:470,y:140,facing:60},
    {team:"b",tag:"G",x:552,y:152,facing:230,goalie:true},
  ],
  puck:{x:534,y:248},
  motions:[{x1:462,y1:250,x2:498,y2:252}],
  lane:{x1:534,y1:248,x2:466,y2:252}, open:{x:452,y:250,r:24},
  serves:["rr-u11-cycle-and-possession-1","rr-u11-cycle-and-possession-2","rr-u11-cycle-and-possession-3","rr-u11-cycle-and-possession-4","rr-u11-cycle-and-possession-5"] },

{ id:"oz-delay-high", view:"oz",
  desc:"You hold the puck high in the zone with lots of room. Every teammate is covered right now — the defense is set and waiting.",
  actors:[
    {team:"y",tag:"YOU",x:410,y:110,facing:20,you:true},
    {team:"y",tag:"F",x:490,y:200,facing:300},{team:"b",tag:"D",x:478,y:214,facing:120},
    {team:"y",tag:"C",x:500,y:110,facing:270},{team:"b",tag:"D",x:512,y:124,facing:290},
    {team:"b",tag:"F",x:452,y:120,facing:200},
    {team:"b",tag:"G",x:552,y:150,facing:200,goalie:true},
  ],
  puck:{x:424,y:116},
  lane:{x1:424,y1:116,x2:404,y2:70}, open:{x:404,y:70,r:24},
  serves:["rr-u11-decision-making-3","rr-u11-time-and-space-2","rr-u11-time-and-space-5","rr-u11-creativity-under-pressure-3"] },

{ id:"dz-last-man-pressure", view:"dz",
  desc:"You are the last player back with the puck in your own zone. A forechecker charges at you while your winger waits on the wall.",
  actors:[
    {team:"y",tag:"YOU",x:96,y:190,facing:30,you:true},
    {team:"b",tag:"F",x:158,y:160,facing:210},
    {team:"y",tag:"W",x:190,y:272,facing:0},
    {team:"y",tag:"G",x:48,y:150,facing:10,goalie:true},
  ],
  puck:{x:110,y:196},
  motions:[{x1:150,y1:166,x2:122,y2:182}],
  lane:{x1:110,y1:196,x2:184,y2:268}, open:{x:190,y:272,r:24},
  serves:["rr-u11-decision-making-2","rr-u11-time-and-space-3"] },

{ id:"wall-angle-steer", view:"full",
  desc:"You are the defender, skating a curved path that steers the puck carrier toward the boards, your stick on the ice in their lane.",
  actors:[
    {team:"b",tag:"W",x:280,y:80,facing:355},
    {team:"y",tag:"YOU",x:322,y:120,facing:300,you:true},
    {team:"y",tag:"D",x:420,y:70,facing:200},
    {team:"y",tag:"G",x:48,y:150,facing:0,goalie:true},
  ],
  puck:{x:294,y:76},
  motions:[{x1:290,y1:76,x2:340,y2:62},{x1:328,y1:112,x2:364,y2:84}],
  lane:{x1:322,y1:120,x2:372,y2:70}, open:{x:372,y:70,r:24},
  serves:["rr-u11-angling-steering-1","rr-u11-angling-steering-2","rr-u11-angling-steering-3","rr-u11-angling-steering-4","rr-u11-angling-steering-5","rr-u11-forecheck-pressure-2"] },

{ id:"dz-netside-coverage", view:"dz",
  desc:"The puck battle is in your corner. Your check waits near the net front, and you hold position between them and your net, watching both.",
  actors:[
    {team:"b",tag:"F",x:74,y:250,facing:60},
    {team:"y",tag:"D",x:96,y:236,facing:220},
    {team:"b",tag:"C",x:118,y:150,facing:180},
    {team:"y",tag:"YOU",x:92,y:150,facing:150,you:true},
    {team:"b",tag:"W",x:190,y:64,facing:200},
    {team:"y",tag:"G",x:48,y:150,facing:20,goalie:true},
  ],
  puck:{x:82,y:260},
  lane:{x1:92,y1:150,x2:118,y2:150}, open:{x:92,y:150,r:20},
  serves:["rr-u11-defensive-side-positioning-1","rr-u11-defensive-side-positioning-2","rr-u11-defensive-side-positioning-3","rr-u11-defensive-side-positioning-4","rr-u11-defensive-side-positioning-5","rr-u11-coverage-reads-3"] },

{ id:"dz-coverage-switch", view:"dz",
  desc:"Two attackers cross paths in your zone, swapping sides, while you and a teammate cover them. The far side of the ice sits quiet and open.",
  actors:[
    {team:"b",tag:"F",x:150,y:120,facing:60},
    {team:"b",tag:"F",x:150,y:190,facing:300},
    {team:"y",tag:"YOU",x:118,y:128,facing:40,you:true},
    {team:"y",tag:"D",x:118,y:182,facing:320},
    {team:"b",tag:"D",x:230,y:250,facing:270},
    {team:"y",tag:"G",x:48,y:150,facing:10,goalie:true},
  ],
  puck:{x:238,y:242},
  motions:[{x1:154,y1:128,x2:158,y2:180},{x1:154,y1:182,x2:158,y2:130}],
  lane:{x1:118,y1:128,x2:118,y2:182}, open:{x:118,y:155,r:22},
  serves:["rr-u11-coverage-reads-1","rr-u11-coverage-reads-2","rr-u11-coverage-reads-4","rr-u11-coverage-reads-5"] },

{ id:"dz-stick-lane-boxout", view:"dz",
  desc:"A pass is about to come through your area to an attacker you can't reach. Your stick blade slides into the lane while you hold body position.",
  actors:[
    {team:"b",tag:"W",x:200,y:240,facing:130},
    {team:"y",tag:"YOU",x:126,y:186,facing:120,you:true},
    {team:"b",tag:"F",x:96,y:120,facing:120},
    {team:"y",tag:"G",x:48,y:150,facing:30,goalie:true},
  ],
  puck:{x:212,y:250},
  flights:[{x1:206,y1:242,x2:112,y2:132}],
  lane:{x1:126,y1:186,x2:150,y2:198}, open:{x:150,y:198,r:18},
  serves:["rr-u11-stick-and-body-detail-1","rr-u11-stick-and-body-detail-3","rr-u11-stick-and-body-detail-5"] },

{ id:"dz-contain-patience", view:"dz",
  desc:"The carrier hides the puck on their far side along the wall. You stay on them with body position, waiting for the puck to show.",
  actors:[
    {team:"b",tag:"F",x:150,y:262,facing:200},
    {team:"y",tag:"YOU",x:126,y:236,facing:60,you:true},
    {team:"y",tag:"G",x:48,y:150,facing:30,goalie:true},
    {team:"y",tag:"D",x:80,y:200,facing:80},
  ],
  puck:{x:162,y:274},
  lane:{x1:126,y1:236,x2:150,y2:262}, open:{x:150,y:262,r:20},
  serves:["rr-u11-stick-and-body-detail-2","rr-u11-stick-and-body-detail-4"] },

{ id:"dz-breakout-forecheck", view:"dz",
  desc:"Your defenseman has the puck behind your net with a forechecker chasing from one side. Your winger waits on the wall and your center swings low in support.",
  actors:[
    {team:"y",tag:"D",x:52,y:196,facing:70},
    {team:"b",tag:"F1",x:80,y:232,facing:230},
    {team:"y",tag:"YOU",x:180,y:272,facing:180,you:true},
    {team:"y",tag:"C",x:140,y:170,facing:250},
    {team:"b",tag:"F2",x:196,y:200,facing:230},
    {team:"y",tag:"G",x:48,y:150,facing:60,goalie:true},
  ],
  puck:{x:60,y:208},
  motions:[{x1:86,y1:226,x2:70,y2:214},{x1:146,y1:176,x2:118,y2:196}],
  lane:{x1:60,y1:208,x2:172,y2:268}, open:{x:180,y:272,r:24},
  serves:["rr-u11-breakout-and-regroup-1","rr-u11-breakout-and-regroup-2","rr-u11-breakout-and-regroup-3","rr-u11-breakout-and-regroup-5"] },

{ id:"oz-forecheck-f1", view:"oz",
  desc:"You are the first forechecker, closing on their defenseman behind the net on a curved angle while your linemate covers the near wall.",
  actors:[
    {team:"b",tag:"D",x:548,y:196,facing:110},
    {team:"y",tag:"YOU",x:512,y:232,facing:40,you:true},
    {team:"y",tag:"F2",x:452,y:262,facing:0},
    {team:"b",tag:"W",x:430,y:250,facing:180},
    {team:"b",tag:"G",x:550,y:150,facing:220,goalie:true},
  ],
  puck:{x:556,y:208},
  motions:[{x1:518,y1:226,x2:540,y2:210}],
  lane:{x1:512,y1:232,x2:544,y2:214}, open:{x:452,y:262,r:22},
  serves:["rr-u11-forecheck-pressure-1","rr-u11-forecheck-pressure-3","rr-u11-forecheck-pressure-4","rr-u11-forecheck-pressure-5"] },

{ id:"backcheck-rush", view:"full",
  desc:"The other team rushes toward your net. You backcheck through the middle of the ice, closing on the open attacker who drives the middle lane.",
  actors:[
    {team:"b",tag:"W",x:230,y:70,facing:180},
    {team:"b",tag:"C",x:250,y:150,facing:180},
    {team:"b",tag:"W",x:240,y:230,facing:180},
    {team:"y",tag:"YOU",x:310,y:150,facing:190,you:true},
    {team:"y",tag:"D",x:160,y:110,facing:0},{team:"y",tag:"D",x:160,y:190,facing:0},
    {team:"y",tag:"G",x:48,y:150,facing:0,goalie:true},
  ],
  puck:{x:216,y:74},
  motions:[{x1:302,y1:152,x2:268,y2:152},{x1:244,y1:150,x2:206,y2:150}],
  lane:{x1:310,y1:150,x2:256,y2:150}, open:{x:250,y:150,r:24},
  serves:["rr-u11-backcheck-recovery-1","rr-u11-backcheck-recovery-3","rr-u11-backcheck-recovery-4","rr-u11-backcheck-recovery-5"] },

{ id:"dz-turnover-outlet", view:"full",
  desc:"Your defenseman intercepts a pass in your zone and looks up. You stretch up the wall ahead of the play, giving them an instant outlet.",
  actors:[
    {team:"y",tag:"D",x:130,y:170,facing:20},
    {team:"y",tag:"YOU",x:262,y:58,facing:0,you:true},
    {team:"b",tag:"F",x:180,y:130,facing:150},
    {team:"b",tag:"D",x:330,y:110,facing:180},
    {team:"y",tag:"G",x:48,y:150,facing:20,goalie:true},
  ],
  puck:{x:142,y:164},
  motions:[{x1:254,y1:58,x2:296,y2:58}],
  lane:{x1:142,y1:164,x2:252,y2:60}, open:{x:262,y:58,r:26},
  serves:["rr-u11-transition-reads-2","rr-u11-transition-reads-5"] },

{ id:"nz-loose-puck-race", view:"full",
  desc:"A loose puck sits in the neutral zone between you and an opponent who is slightly closer to it. The race is on.",
  actors:[
    {team:"y",tag:"YOU",x:250,y:170,facing:20,you:true},
    {team:"b",tag:"F",x:344,y:120,facing:160},
    {team:"y",tag:"D",x:170,y:220,facing:0},
    {team:"b",tag:"D",x:430,y:150,facing:180},
  ],
  puck:{x:302,y:146},
  motions:[{x1:258,y1:166,x2:288,y2:152},{x1:336,y1:124,x2:314,y2:138}],
  lane:{x1:250,y1:170,x2:296,y2:148}, open:{x:302,y:146,r:20},
  serves:["rr-u11-battles-and-compete-4"] },
];

// ── build ────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
const manifest = { generated: new Date().toISOString(), style: "top-down-diagram-v1",
  legend: { yellowCircles: "your team", blackSquares: "opponents", orangeRing: "you (POV)", grayDashed: "skating direction (context)", thinDotted: "pass in flight" },
  scenes: [] };

for (const sc of SCENES) {
  const svg = render(sc);
  const png = join(OUT_DIR, `${sc.id}.png`);
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(png);
  const entry = {
    id: sc.id, file: `/assets/scenes-u11/${sc.id}.png`, view: sc.view, alt: sc.desc,
    puck: norm(sc, sc.puck),
    actors: sc.actors.map(a => ({ role: a.tag, team: a.team === "y" ? "yellow" : "black", you: !!a.you, goalie: !!a.goalie, ...norm(sc, a) })),
    lane: sc.lane ? { from: norm(sc, { x: sc.lane.x1, y: sc.lane.y1 }), to: norm(sc, { x: sc.lane.x2, y: sc.lane.y2 }) } : null,
    openTarget: sc.open ? { ...norm(sc, sc.open), r: +(sc.open.r / VIEWS[sc.view].w).toFixed(4) } : null,
    serves: sc.serves,
  };
  manifest.scenes.push(entry);
  console.log(`✓ ${sc.id}.png (${sc.serves.length} questions)`);
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
const total = manifest.scenes.reduce((s, x) => s + x.serves.length, 0);
console.log(`\n${manifest.scenes.length} scenes → ${total} question bindings\nmanifest: src/data/scene-manifest.json`);
