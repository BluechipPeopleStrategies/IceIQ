// Generates a human-readable review file for all u11_rr_* questions in the
// bank so you can scan them, flag which are bad, and send me a kill list.
//
//   node tools/review-rink-reads.mjs
//
// Output: tools/rink-reads-review.md

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const qPath = path.join(here, "..", "src", "data", "questions.json");
const outPath = path.join(here, "rink-reads-review.md");

const qb = JSON.parse(fs.readFileSync(qPath, "utf8"));
const u11 = qb["U11 / Atom"] || [];
const reads = u11.filter(q => typeof q.id === "string" && q.id.startsWith("u11_rr_"));

function describeMarkers(markers = []) {
  return markers.map(m => {
    const lbl = m.label ? ` "${m.label}"` : "";
    return `${m.type}${lbl}@(${m.x},${m.y})`;
  }).join(", ");
}

function describeOptions(q) {
  if (q.lanes) {
    return q.lanes.map(l => `  • lane (${l.x1},${l.y1})→(${l.x2},${l.y2}) [${l.clear ? "CLEAR" : "blocked"}]: ${l.msg}`).join("\n");
  }
  if (q.spots) {
    return q.spots.map(s => `  • spot @(${s.x},${s.y}) [${s.correct ? "CORRECT" : "wrong"}]: ${s.msg}`).join("\n");
  }
  if (q.targets) {
    return q.targets.map(t => {
      const tag = t.correct === true ? "CORRECT" : t.correct === false ? "wrong" : (t.verdict || "?");
      return `  • target${t.id ? ` "${t.id}"` : ""} @(${t.x},${t.y}) [${tag.toUpperCase()}]: ${t.msg || t.feedback || ""}`;
    }).join("\n");
  }
  return "  (no options)";
}

const lines = [];
lines.push(`# U11 Rink-Reads Review (${reads.length} questions)`);
lines.push("");
lines.push("Scan each one. Reply with a list of IDs to kill (e.g., `u11_rr_15, u11_rr_47`).");
lines.push("Coordinate frame: right-zone view, goalie ~ (560,150), net-front 540–555, slot 490–525, blue line ~400.");
lines.push("");

const grouped = {};
for (const q of reads) {
  const t = q.type || "?";
  if (!grouped[t]) grouped[t] = [];
  grouped[t].push(q);
}

for (const [type, qs] of Object.entries(grouped)) {
  lines.push(`---`);
  lines.push(`## ${type} (${qs.length})`);
  lines.push("");
  for (const q of qs) {
    const levels = (q.levels || []).join(" / ") || "(no levels)";
    lines.push(`### \`${q.id}\` — ${q.cat} (d${q.d || "?"}) · pos: ${(q.pos || []).join("/")}`);
    lines.push(`tags: ${levels}`);
    lines.push(``);
    lines.push(`**Q:** ${q.q || q.sit || "(no question text)"}`);
    lines.push(``);
    lines.push(`**Tip:** ${q.tip || "(no tip)"}`);
    lines.push(``);
    const rink = q.rink || q.pov;
    if (rink) {
      const view = rink.view || (rink.camera ? "POV" : "?");
      const zone = rink.zone || "—";
      const markers = describeMarkers(rink.markers);
      lines.push(`**Layout:** view=${view}, zone=${zone}`);
      lines.push(`Markers: ${markers}`);
    }
    lines.push(``);
    lines.push(`**Options:**`);
    lines.push(describeOptions(q));
    lines.push(``);
  }
}

fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${reads.length} questions to ${path.relative(process.cwd(), outPath)}`);
