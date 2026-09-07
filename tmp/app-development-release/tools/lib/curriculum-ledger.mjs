// Curriculum ledger loader, access helpers, and validator. Single source of
// truth for what RinkReads teaches; the artifact the gauntlet tags questions
// to. Replaces the retired tools/lib/curriculum-classifier.mjs.
//
// Helpers are pure: they take the ledger object as the first argument so the
// validator is unit-testable with fixtures and the browser can pass an
// imported JSON. loadLedger() is the Node convenience that reads the file.
//
// Run the unit tests:  node tools/lib/curriculum-ledger.test.mjs
// Run the golden test:  npm run test:ledger
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const LEDGER_PATH = resolve(__dirname, "../../src/data/curriculum-ledger.json");

// depth → base target count. Anchor concepts multiply by meta.anchorMultiplier.
export const DEPTH_TARGETS = { "-": 0, I: 3, D: 5, M: 7, R: 5 };

export function loadLedger(path = LEDGER_PATH) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function conceptById(ledger, conceptId) {
  return ledger.concepts.find(c => c.id === conceptId) || null;
}
export function domainById(ledger, domainId) {
  return ledger.domains.find(d => d.id === domainId) || null;
}
export function isAnchor(ledger, conceptId) {
  return !!conceptById(ledger, conceptId)?.anchor;
}
export function nodeById(ledger, nodeId) {
  return ledger.nodes.find(n => n.id === nodeId) || null;
}
export function getNode(ledger, ageId, conceptId) {
  return ledger.nodes.find(n => n.ageId === ageId && n.conceptId === conceptId) || null;
}
export function nodesForAge(ledger, ageId) {
  return ledger.nodes.filter(n => n.ageId === ageId);
}
export function conceptsForAge(ledger, ageId) {
  const ids = new Set(nodesForAge(ledger, ageId).filter(n => n.depth !== "-").map(n => n.conceptId));
  return ledger.concepts.filter(c => ids.has(c.id));
}
export function targetFor(ledger, node) {
  const base = DEPTH_TARGETS[node.depth] ?? 0;
  const mult = isAnchor(ledger, node.conceptId) ? (ledger.meta.anchorMultiplier ?? 1) : 1;
  return base * mult;
}

// Expected node id from its age + concept: "{ageLower}.{conceptId}".
export function expectedNodeId(node) {
  return `${String(node.ageId).toLowerCase()}.${node.conceptId}`;
}

export function validateLedger(ledger) {
  const errs = [];
  const warns = [];
  const ageBands = new Set(ledger?.meta?.ageBands || []);
  const depthKeys = new Set(Object.keys(ledger?.meta?.depthLegend || {}));
  const domainIds = new Set((ledger?.domains || []).map(d => d.id));
  const sourceIds = new Set((ledger?.sourceModels || []).map(s => s.id));
  const conceptIds = new Set((ledger?.concepts || []).map(c => c.id));
  const knownTypes = new Set([
    "mc", "tf", "pov-mc", "scene-mc", "selection", "point", "path", "sequence",
    "hot-spots", "drag-target", "drag-place", "rink-label", "lane-select",
  ]);

  // concepts
  for (const c of ledger?.concepts || []) {
    if (!domainIds.has(c.domainId)) errs.push(`concept ${c.id}: domainId '${c.domainId}' not a domain`);
    if (!Array.isArray(c.lineage) || c.lineage.length === 0) {
      errs.push(`concept ${c.id}: needs >=1 lineage entry`);
    } else {
      for (const l of c.lineage) {
        if (!sourceIds.has(l.sourceModel)) errs.push(`concept ${c.id}: lineage sourceModel '${l.sourceModel}' unknown`);
      }
    }
  }

  // nodes
  const seen = new Set();
  for (const n of ledger?.nodes || []) {
    if (!ageBands.has(n.ageId)) errs.push(`node ${n.id}: ageId '${n.ageId}' not in meta.ageBands`);
    if (!conceptIds.has(n.conceptId)) errs.push(`node ${n.id}: conceptId '${n.conceptId}' unknown`);
    if (!depthKeys.has(n.depth)) errs.push(`node ${n.id}: depth '${n.depth}' not a legend key`);
    const want = expectedNodeId(n);
    if (n.id !== want) errs.push(`node ${n.id}: id should be '${want}'`);
    if (seen.has(n.id)) errs.push(`node ${n.id}: duplicate id`);
    seen.add(n.id);
    if (typeof n.targetCount === "number") {
      const computed = targetFor(ledger, n);
      if (n.targetCount !== computed) errs.push(`node ${n.id}: targetCount ${n.targetCount} != computed ${computed}`);
    }
    for (const t of n.approvedTypes || []) {
      if (!knownTypes.has(t)) warns.push(`node ${n.id}: approvedType '${t}' not in known set`);
    }
  }

  return { ok: errs.length === 0, errs, warns };
}
