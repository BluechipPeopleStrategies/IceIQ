#!/usr/bin/env node
// Unit tests for the curriculum-ledger loader/validator. Inline fixtures only —
// does NOT read src/data/curriculum-ledger.json (that's the golden test's job).
// Run: node tools/lib/curriculum-ledger.test.mjs
import {
  validateLedger, getNode, nodeById, conceptsForAge, nodesForAge,
  conceptById, domainById, targetFor, isAnchor, DEPTH_TARGETS,
} from "./curriculum-ledger.mjs";

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  → got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
  ok ? pass++ : fail++;
};
const truthy = (name, got) => eq(name, !!got, true);

// A minimal valid ledger fixture.
const good = {
  meta: {
    version: "test", locked: null,
    ageBands: ["U7", "U11"],
    depthLegend: { "-": "x", I: "x", D: "x", M: "x", R: "x" },
    anchorMultiplier: 2,
  },
  sourceModels: [{ id: "usa-adm", name: "ADM", tradition: "American", contributes: "x" }],
  domains: [{ id: "hockey-sense", name: "Hockey Sense", definition: "x", positions: ["skater"] }],
  concepts: [
    { id: "reading-the-play", name: "Reading the Play", domainId: "hockey-sense", definition: "x",
      readConnection: "x", anchor: true, positions: ["skater"],
      lineage: [{ sourceModel: "usa-adm", note: "x" }] },
  ],
  nodes: [
    { id: "u11.reading-the-play", ageId: "U11", conceptId: "reading-the-play",
      depth: "D", targetCount: 10, difficultyMix: { 1: 0.3, 2: 0.5, 3: 0.2 }, approvedTypes: ["pov-mc"] },
  ],
};

// validateLedger accepts a good ledger
eq("valid ledger ok", validateLedger(good).ok, true);
eq("valid ledger no errs", validateLedger(good).errs, []);

// An empty-taxonomy ledger is still valid (vacuously) — this is the skeleton case.
const empty = { ...good, domains: [], concepts: [], nodes: [] };
eq("empty taxonomy ok", validateLedger(empty).ok, true);

// concept with no lineage fails
const noLineage = { ...good, concepts: [{ ...good.concepts[0], lineage: [] }] };
eq("no-lineage fails", validateLedger(noLineage).ok, false);

// node with bad ageId fails
const badAge = { ...good, nodes: [{ ...good.nodes[0], ageId: "U99" }] };
eq("bad ageId fails", validateLedger(badAge).ok, false);

// node id not matching {ageLower}.{conceptId} fails
const badId = { ...good, nodes: [{ ...good.nodes[0], id: "wrong.id" }] };
eq("bad node id fails", validateLedger(badId).ok, false);

// concept.domainId pointing nowhere fails
const badDomain = { ...good, concepts: [{ ...good.concepts[0], domainId: "nope" }] };
eq("dangling domainId fails", validateLedger(badDomain).ok, false);

// lineage sourceModel pointing nowhere fails
const badSource = { ...good, concepts: [{ ...good.concepts[0], lineage: [{ sourceModel: "nope", note: "x" }] }] };
eq("dangling sourceModel fails", validateLedger(badSource).ok, false);

// targetCount mismatch (stored != computed) fails
const badCount = { ...good, nodes: [{ ...good.nodes[0], targetCount: 999 }] };
eq("targetCount mismatch fails", validateLedger(badCount).ok, false);

// helpers
eq("getNode", getNode(good, "U11", "reading-the-play").id, "u11.reading-the-play");
eq("getNode miss", getNode(good, "U7", "reading-the-play"), null);
eq("nodeById", nodeById(good, "u11.reading-the-play").conceptId, "reading-the-play");
eq("conceptsForAge", conceptsForAge(good, "U11").map(c => c.id), ["reading-the-play"]);
eq("nodesForAge", nodesForAge(good, "U11").map(n => n.id), ["u11.reading-the-play"]);
eq("conceptById", conceptById(good, "reading-the-play").name, "Reading the Play");
eq("domainById", domainById(good, "hockey-sense").name, "Hockey Sense");
eq("isAnchor true", isAnchor(good, "reading-the-play"), true);
eq("DEPTH_TARGETS D", DEPTH_TARGETS.D, 5);
// anchor (D base 5) x multiplier 2 = 10
eq("targetFor anchor", targetFor(good, good.nodes[0]), 10);
// non-anchor target = base, no multiplier
const plain = { ...good,
  concepts: [{ ...good.concepts[0], id: "breakout", anchor: false }],
  nodes: [{ ...good.nodes[0], id: "u11.breakout", conceptId: "breakout", targetCount: 5 }] };
eq("targetFor non-anchor", targetFor(plain, plain.nodes[0]), 5);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
