import fs from "node:fs";

const qb = JSON.parse(fs.readFileSync("./src/data/questions.json", "utf8"));

function inferType(q) {
  if (q.type) return q.type;
  if (q.correctZone) return "zone-click";
  if (q.opts && q.opts.length === 2) return "tf";
  if (q.choices) return "seq";
  if (q.options) return "next";
  if (q.mistake) return "mistake";
  return "mc";
}

// Apply type inference to all qb questions
for (const level in qb) qb[level] = qb[level].map(q => ({ ...q, type: inferType(q) }));

// Parse ZONE_CLICK_QUESTIONS from App.jsx
const src = fs.readFileSync("./src/App.jsx", "utf8");
const zcStart = src.indexOf("const ZONE_CLICK_QUESTIONS = [");
const zcEnd = src.indexOf("];", zcStart) + 2;
const zcBlock = src.slice(zcStart, zcEnd);
const ZONE_CLICK_QUESTIONS = [];
const idMatches = [...zcBlock.matchAll(/id:\s*"([^"]+)"[\s\S]*?level:\s*(\[[^\]]+\])[\s\S]*?pos:\s*(\[[^\]]+\])/g)];
for (const m of idMatches) {
  ZONE_CLICK_QUESTIONS.push({
    id: m[1],
    type: "zone-click",
    level: JSON.parse(m[2].replace(/'/g, '"')),
    pos: JSON.parse(m[3].replace(/'/g, '"')),
  });
}

const DEMO_PROFILES = [
  { level: "U7 / Initiation",  position: "Not Sure", name: "Nora Orr" },
  { level: "U9 / Novice",      position: "Defense",  name: "Luca Lidstrom" },
  { level: "U11 / Atom",       position: "Forward",  name: "Cole Gretzky" },
  { level: "U13 / Peewee",     position: "Goalie",   name: "Maya Roy" },
  { level: "U15 / Bantam",     position: "Defense",  name: "Jack Bourque" },
  { level: "U18 / Midget",     position: "Forward",  name: "Eli Lemieux" },
];

function buildDemoQueue(qb, level, position) {
  const posCode = { Forward: "F", Defense: "D", Goalie: "G" }[position] || null;
  const posMatch = (q) => !q.pos || !posCode || q.pos.includes(posCode);
  const targetCounts = { "zone-click": 3, mc: 1, tf: 1, seq: 1, mistake: 1 };
  const result = [];
  const usedIds = new Set();

  for (const [type, count] of Object.entries(targetCounts)) {
    const pool = type === "zone-click"
      ? ZONE_CLICK_QUESTIONS
      : (qb[level] || []).filter(q => q.type === type);
    const levelMatch = pool.filter(q => {
      if (type === "zone-click" && !q.level?.includes(level)) return false;
      return posMatch(q);
    });
    const fallback = pool.filter(posMatch);
    const broadFallback = fallback.length > 0 ? fallback : pool;
    const source = (levelMatch.length > 0 ? levelMatch : broadFallback).filter(q => !usedIds.has(q.id));
    const shuffled = [...source].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(count, shuffled.length); i++) {
      result.push(shuffled[i]);
      usedIds.add(shuffled[i].id);
    }
  }

  const mcPool = (qb[level] || []).filter(q => q.type === "mc" && !usedIds.has(q.id) && posMatch(q));
  const mcShuffled = [...mcPool].sort(() => Math.random() - 0.5);
  while (result.length < 7 && mcShuffled.length > 0 && result.filter(q => q.type === "mc").length < 2) {
    const q = mcShuffled.shift();
    result.push(q);
    usedIds.add(q.id);
  }
  const anyPool = [...(qb[level] || []), ...ZONE_CLICK_QUESTIONS]
    .filter(q => !usedIds.has(q.id) && posMatch(q))
    .sort(() => Math.random() - 0.5);
  while (result.length < 7 && anyPool.length > 0) {
    const q = anyPool.shift();
    result.push(q);
    usedIds.add(q.id);
  }
  return result.slice(0, 7);
}

const TYPES = ["mc", "tf", "seq", "mistake", "next", "zone-click"];

console.log(`Parsed ${ZONE_CLICK_QUESTIONS.length} zone-click questions from App.jsx\n`);

console.log("=== DEMO QUEUE COMPOSITION (actual demo profile positions) ===\n");
for (const { level, position, name } of DEMO_PROFILES) {
  const queue = buildDemoQueue(qb, level, position);
  const counts = {};
  for (const q of queue) counts[q.type] = (counts[q.type] || 0) + 1;
  console.log(`${name} (${level}, ${position}): ${queue.length} questions`);
  for (const t of TYPES) {
    const n = counts[t] || 0;
    const mark = n > 0 ? "✓" : "✗";
    console.log(`  ${mark} ${t.padEnd(12)} ${n}`);
  }
  console.log(`  zone-click IDs: ${queue.filter(q => q.type === "zone-click").map(q => q.id).join(", ")}`);
  console.log();
}
