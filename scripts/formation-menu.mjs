// formation-menu.mjs — the formation-first authoring surface. List the available
// formations, or scaffold instance files to fill in (text only; never
// coordinates). Then compile with scripts/formation-to-seed.mjs.
//
// Usage:
//   node scripts/formation-menu.mjs                       # list formations
//   node scripts/formation-menu.mjs new <id> [opts]       # scaffold an instance
//     --side left|right        param: which slot is open
//     --node <nodeId>          curriculum node (sets levels)
//     --out <dir>              default docs/ai-pipeline/_instances
//     --count N --vary side    emit N instances varying the named param

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATIONS } from "../src/scenario/formations/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const rel = (p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "");

// Age prefix → bank level string (extend as formations cover more ages).
const AGE_LEVEL = {
  U7: "U7 / Initiation", U9: "U9 / Novice", U11: "U11 / Atom",
  U13: "U13 / Peewee", U15: "U15 / Bantam", U18: "U18 / Midget",
};

function listFormations() {
  console.log("Formations:\n");
  for (const f of Object.values(FORMATIONS)) {
    console.log(`  ${f.id}  —  ${f.label}`);
    const params = Object.entries(f.params || {})
      .map(([k, s]) => `${k}=${(s.values || []).join("|")}${s.default !== undefined ? ` (default ${s.default})` : ""}`)
      .join(", ");
    console.log(`      params:    ${params || "(none)"}`);
    console.log(`      nodes:     ${(f.concepts?.nodeIds || []).join(", ")}`);
    console.log(`      read:      ${f.interaction?.kind} — open slot "${f.read?.open}", others tempting-but-covered`);
    console.log("");
  }
  console.log("Scaffold:  node scripts/formation-menu.mjs new <id> --side right --node <nodeId>");
}

function arg(args, name, dflt) { const i = args.indexOf(name); return i > -1 ? args[i + 1] : dflt; }

function scaffoldOne(formation, { side, node, dCount }) {
  const age = node ? node.split(".")[0].toUpperCase() : (formation.concepts?.ages?.[0] || "U13");
  const level = AGE_LEVEL[age] || "U13 / Peewee";
  const slug = `${age.toLowerCase()}_${formation.id.replace(/-/g, "")}_${side}_v1`;
  const instance = {
    id: slug,
    formation: formation.id,
    params: { side, ...(dCount ? { dCount: Number(dCount) } : {}) },
    nodeId: node || formation.concepts?.nodeIds?.[0],
    levels: [level],
    difficulty: 2,
    _note: "Optional overrides: prompt, mc:{stem,opts,ok}, feedback:{right,wrong}, tip, why. Omit to inherit the formation's defaults. Then: node scripts/formation-to-seed.mjs --dir <this dir>",
  };
  return { slug, instance };
}

function scaffold(args) {
  const id = args[1];
  const formation = FORMATIONS[id];
  if (!formation) { console.error(`unknown formation "${id}". Run with no args to list.`); process.exit(2); }
  const outDir = arg(args, "--out", join(ROOT, "docs", "ai-pipeline", "_instances"));
  const node = arg(args, "--node");
  const dCount = arg(args, "--dCount");
  const count = Number(arg(args, "--count", 1));
  const vary = arg(args, "--vary");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  let sides;
  if (vary === "side") sides = formation.params.side.values.slice(0, count || 2);
  else sides = [arg(args, "--side", formation.params?.side?.values?.[0] || "right")];

  for (const side of sides) {
    const { slug, instance } = scaffoldOne(formation, { side, node, dCount });
    const outPath = join(outDir, `${slug}.json`);
    writeFileSync(outPath, JSON.stringify(instance, null, 2) + "\n", "utf8");
    console.log(`scaffolded  ${slug}  → ${rel(outPath)}`);
  }
  console.log(`\nFill any text overrides, then: node scripts/formation-to-seed.mjs --dir ${rel(outDir)}`);
}

const args = process.argv.slice(2);
if (args[0] === "new") scaffold(args);
else listFormations();
