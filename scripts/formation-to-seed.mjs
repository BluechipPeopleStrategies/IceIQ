// formation-to-seed.mjs — compile a tiny INSTANCE (formation id + params + text)
// into a full, hockey-coherent scenario seed. The author never places a dot:
// actor positions, the read, and the correct answer all come from the chosen
// formation's parametric constructors (src/scenario/formations/). Geometry is
// correct BY CONSTRUCTION, so the compiled seed passes lintScenario.
//
// Usage:
//   node scripts/formation-to-seed.mjs <instance.json> [--out <dir>]
//   node scripts/formation-to-seed.mjs --dir <folder> [--out <dir>]
//
// Instance shape (zero coordinates):
// {
//   id, formation, params:{side,...}, nodeId, levels:[...]|level, difficulty?,
//   prompt?, mc?:{stem?,opts?,ok?}, feedback?:{right,wrong}, tip?, why?
// }

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { FORMATIONS } from "../src/scenario/formations/index.js";
import { wideY, onLane, goalSide, CREASE_RIGHT, CREASE_LEFT } from "../src/scenario/formations/geometry.js";
import { lineHitsCircle, PASS_INTERCEPT_RADIUS } from "../src/scenario/validators.js";
import { lintScenario } from "../tools/scenario-author/validate.mjs";
import { nodeInfo } from "../src/scenario/curriculum.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const rel = (p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "");

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const r3 = (n) => +n.toFixed(3);

// Build the slot-resolution context the formation geometry functions receive.
function makeContext(formation, params) {
  const view = formation.stage.view;
  const net = view === "left" ? CREASE_LEFT : CREASE_RIGHT;
  const resolved = {};
  const p = {
    ...params,
    side: params.side,
    other: params.side === "right" ? "left" : params.side === "left" ? "right" : params.side,
    net,
    resolved,
    wide(side, { x, spread }) { return { x, y: wideY(side, spread) }; },
    onLane(fromRole, toRole, opts = {}) { return onLane(resolved[fromRole], resolved[toRole], { ...opts, netX: net.x }); },
    goalSide(role, opts = {}) { return goalSide(resolved[role], net, opts); },
    crease() { return { ...net }; },
  };
  return { p, resolved, view, net };
}

// Compile one instance into { seed, lint }. Throws on author error (bad
// formation id, param, or a violated read invariant) with a clear message.
function compileInstance(instance) {
  const formation = FORMATIONS[instance.formation];
  if (!formation) throw new Error(`unknown formation "${instance.formation}" (have: ${Object.keys(FORMATIONS).join(", ")})`);

  // validate params against the formation's declared param spec
  const params = { ...defaultParams(formation), ...(instance.params || {}) };
  for (const [k, spec] of Object.entries(formation.params || {})) {
    if (spec.values && !spec.values.includes(params[k])) {
      throw new Error(`param "${k}"=${JSON.stringify(params[k])} not in allowed ${JSON.stringify(spec.values)}`);
    }
  }

  const { p, resolved, view } = makeContext(formation, params);

  // resolve slots in declaration order; puck rides its carrier
  const actors = [];
  for (const slot of formation.slots) {
    if (slot.when && !slot.when(p)) continue;
    if (slot.kind === "puck") {
      const carrier = resolved[slot.with];
      if (!carrier) throw new Error(`puck slot "${slot.role}" rides "${slot.with}" but that slot isn't resolved yet`);
      const coord = { x: r3(carrier.x + 0.002), y: r3(carrier.y - 0.002) };
      resolved[slot.role] = coord;
      actors.push({ id: slot.role, kind: "puck", x: coord.x, y: coord.y });
      continue;
    }
    const c = slot.geometry(p);
    const coord = { x: r3(c.x), y: r3(c.y) };
    resolved[slot.role] = coord;
    const a = { id: slot.role, kind: slot.kind, x: coord.x, y: coord.y };
    let tag = slot.tag;
    if (!tag && slot.kind === "teammate") tag = coord.y > 0.5 ? "RW" : "LW";
    if (tag) a.tag = tag;
    actors.push(a);
  }

  // assert the formation's read invariants with the real validator math
  assertReadInvariants(formation, resolved, actors);

  // interaction + correct
  const fi = formation.interaction;
  const prompt = instance.prompt || fi.prompt;
  let interaction, correct;
  if (fi.kind === "selection") {
    interaction = { kind: "selection", from: fi.from.slice(), order: fi.order || "any", prompt };
    correct = { kind: "selection", ids: fi.correct.slice() };
  } else if (fi.kind === "point") {
    interaction = { kind: "point", prompt };
    const t = fi.correctGeometry ? fi.correctGeometry(p) : (resolved[fi.target] || fi.correct);
    correct = { kind: "point", x: r3(t.x), y: r3(t.y), ...(fi.tolerance ? { tolerance: fi.tolerance } : {}) };
  } else {
    throw new Error(`formation interaction kind "${fi.kind}" not supported yet`);
  }

  // mc (board multiple-choice): instance opts win; else shuffle formation opts
  let mc = null;
  if (instance.mc && Array.isArray(instance.mc.opts)) {
    mc = { stem: instance.mc.stem || formation.mc?.stem, opts: instance.mc.opts, ok: instance.mc.ok };
  } else if (formation.mc) {
    const rng = mulberry32(hash(instance.id));
    const opts = formation.mc.opts.map((o) => ({ ...o }));
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    mc = { stem: instance.mc?.stem || formation.mc.stem, opts: opts.map((o) => o.text), ok: opts.findIndex((o) => o.correct) };
  }

  // Curriculum alignment: the nodeId determines age (level) + difficulty so a
  // question can't drift off its curriculum slot. Hand-set values that disagree
  // are overridden and warned.
  const info = instance.nodeId ? nodeInfo(instance.nodeId) : null;
  if (instance.nodeId && !info) throw new Error(`nodeId "${instance.nodeId}" is not in the curriculum ledger`);
  const alignWarns = [];
  if (info && instance.levels && info.level && !instance.levels.includes(info.level))
    alignWarns.push(`levels ${JSON.stringify(instance.levels)} don't match node age ${info.ageId} (${info.level}) — using the node's age`);
  if (info && instance.difficulty && instance.difficulty !== info.difficulty)
    alignWarns.push(`difficulty ${instance.difficulty} doesn't match curriculum depth ${info.depth} for ${instance.nodeId} (expected ${info.difficulty}) — using ${info.difficulty}`);
  const levels = info ? [info.level] : instance.levels || (instance.level ? [instance.level] : undefined);

  // difficulty: curriculum depth, raised to the complexity floor (mirror brief-to-seed)
  const skaters = actors.filter((a) => a.kind !== "puck").length;
  let floor = 0; if (skaters >= 9) floor = 3; else if (skaters >= 7) floor = 2;
  const difficulty = Math.max(info ? info.difficulty : (instance.difficulty || 1), floor || 1);

  const seed = {
    id: instance.id,
    type: "scenario",
    ...(instance.nodeId ? { nodeId: instance.nodeId } : {}),
    ...(levels ? { levels } : {}),
    themes: formation.themes,
    cat: instance.cat || formation.cat,
    difficulty,
    stage: { ...formation.stage },
    ...(mc ? { mc } : {}),
    actors,
    interaction,
    correct,
    feedback: instance.feedback || formation.feedback,
    ...(instance.tip || formation.tip ? { tip: instance.tip || formation.tip } : {}),
    ...(instance.why || formation.why ? { why: instance.why || formation.why } : {}),
  };

  const lint = lintScenario(seed);
  lint.warns = [...alignWarns, ...(lint.warns || [])];
  return { seed, lint };
}

function defaultParams(formation) {
  const out = {};
  for (const [k, spec] of Object.entries(formation.params || {})) {
    if (spec.default !== undefined) out[k] = spec.default;
  }
  return out;
}

// The defender(s) named in read.blockedBy must sit ON their declared lanes, and
// the open receiver's lane must be CLEAR — same math (lineHitsCircle) the
// validator uses, reported with role names for good errors.
function assertReadInvariants(formation, resolved, actors) {
  const read = formation.read;
  if (!read) return;
  const R = PASS_INTERCEPT_RADIUS;
  for (const [defRole, [fromRole, toRole]] of Object.entries(read.blockedBy || {})) {
    const d = resolved[defRole], a = resolved[fromRole], b = resolved[toRole];
    if (!d || !a || !b) throw new Error(`read.blockedBy references unresolved role(s): ${defRole}/${fromRole}/${toRole}`);
    if (!lineHitsCircle(a, b, d, R)) {
      throw new Error(`read invariant: "${defRole}" is not on the ${fromRole}→${toRole} lane (should block it) — adjust the formation geometry`);
    }
  }
  if (read.open) {
    const carrier = actors.find((x) => x.kind === "player");
    const open = resolved[read.open];
    const defs = actors.filter((x) => x.kind === "defender");
    if (carrier && open) {
      const blocker = defs.find((d) => lineHitsCircle(carrier, open, d, R));
      if (blocker) throw new Error(`read invariant: the OPEN receiver "${read.open}" is blocked by "${blocker.id}" — it isn't actually open`);
    }
  }
}

// ── per-file runner (mirrors scripts/brief-to-seed.mjs runOne)
function runOne(instancePath, outDir, fixDir) {
  let instance;
  try { instance = JSON.parse(readFileSync(instancePath, "utf8")); }
  catch (e) { console.error(`FAIL ${basename(instancePath)} — invalid JSON: ${e.message}`); return false; }
  let result;
  try { result = compileInstance(instance); }
  catch (e) { console.error(`FAIL ${instance.id || basename(instancePath)} — ${e.message}`); return false; }
  const { seed, lint } = result;
  for (const w of lint.warns || []) console.log(`  warn: ${w}`);
  if (lint.ok) {
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, `${instance.id}.json`);
    writeFileSync(outPath, JSON.stringify(seed, null, 2) + "\n", "utf8");
    console.log(`OK   ${instance.id}  → ${rel(outPath)}`);
    return true;
  }
  if (!existsSync(fixDir)) mkdirSync(fixDir, { recursive: true });
  const fixPath = join(fixDir, `${instance.id}.json`);
  writeFileSync(fixPath, JSON.stringify(seed, null, 2) + "\n", "utf8");
  for (const e of lint.errs || []) console.error(`  err:  ${e}`);
  console.error(`FAIL ${instance.id} — seed parked at ${rel(fixPath)}`);
  return false;
}

// ── CLI
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const fixDir = join(ROOT, "docs", "ai-pipeline", "_needs-fixing");
const dirIdx = args.indexOf("--dir");
const defaultOut = dirIdx > -1 ? join(ROOT, "docs", "ai-pipeline", "_pending-seeds") : join(ROOT, "src", "scenario", "seeds");
const outDir = outIdx > -1 ? args[outIdx + 1] : defaultOut;

if (dirIdx > -1) {
  const inDir = args[dirIdx + 1];
  if (!inDir) { console.error("usage: --dir <folder> [--out <dir>]"); process.exit(2); }
  const files = readdirSync(inDir).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) { console.error(`no .json instances in ${inDir}`); process.exit(2); }
  let ok = 0;
  for (const f of files) if (runOne(join(inDir, f), outDir, fixDir)) ok++;
  console.log(`\n── ${ok}/${files.length} OK · ${files.length - ok} need fixing`);
  process.exit(ok === files.length ? 0 : 1);
}

const instancePath = args[0];
if (!instancePath || instancePath.startsWith("--")) {
  console.error("usage: node scripts/formation-to-seed.mjs <instance.json> [--out <dir>]");
  console.error("       node scripts/formation-to-seed.mjs --dir <folder> [--out <dir>]");
  process.exit(2);
}
process.exit(runOne(instancePath, outDir, fixDir) ? 0 : 1);
