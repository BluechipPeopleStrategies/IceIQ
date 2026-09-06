// Dry-run-first applicator for reviewed packet proposals (02–06 by default).
// It never writes unless --write and a matching independent exact-hash receipt
// are both supplied. No source bank is imported or approved by this module.
// Receipt contract for the eventual writer:
// {schemaVersion:1,kind:"independent-exact-hash-recheck",status:"approved-for-write",
//  sourceSnapshotId,proposalSha256,sourceReturnFileHashes,reviewer,
//  questions:[{questionId,decision:"pass",beforeHash,afterHash}]}.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readBankFiles, readJson } from "./experimental-bank-files.mjs";
import { questionContentHash } from "./question-batch-core.mjs";
import { scenarioSnapshotHash } from "./claude-return-core.mjs";
import { composeExperimentalBank } from "../src/one-on-one/experimentalExpansionCore.js";
import { validateExperimentalBank } from "../src/one-on-one/experimentalBankCore.js";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PROPOSAL_PATH = path.join(REPO_ROOT, "docs/factory/research/question-review/packets-02-06/proposed-repairs.json");
export const SOURCE_SNAPSHOT_ID = "rr-20260905-c8403be16748c919";
const AGES = ["u7", "u9", "u11", "u13", "u15", "u18"];
function sourceReturnFiles(proposal) {
  const ids = proposal.sourcePackets;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !/^packet-\d{2}$/.test(id)) || new Set(ids).size !== ids.length) fail("Invalid source packet IDs");
  assert.deepEqual(proposal.packets.map(packet => packet.packetId), ids, "Source packet assignment mismatch");
  return Object.fromEntries(ids.map(id => [id, path.join(REPO_ROOT, `docs/factory/claude-project/claude-output/review-${id}.json`)]));
}

const clone = value => structuredClone(value);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const readProposalBytes = proposalPath => readFileSync(proposalPath);

/**
 * Reconstruct the pre-application source partitions from the immutable
 * application receipt. This exists for repeatable dry-run tests after the
 * source bank has been applied; production CLI runs always read live files.
 */
export function reconstructPartsFromApplicationReceipt(receiptPath) {
  const receipt = readJson(receiptPath);
  if (!Array.isArray(receipt.sceneEdits) || receipt.sceneEdits.length === 0) {
    fail("Application receipt has no immutable sceneEdits baseline");
  }
  const current = readBankFiles();
  const beforeById = new Map(receipt.sceneEdits.map(edit => [edit.scenarioId, edit.before]));
  const original = current.original.map(scenario => {
    const before = beforeById.get(scenario.id);
    if (!before) return scenario;
    const baseIds = new Set(scenario.questions.map(question => question.id));
    return { ...clone(before), questions: before.questions.filter(question => baseIds.has(question.id)) };
  });
  const newScenarios = current.newScenarios.map(scenario => beforeById.get(scenario.id) || scenario);
  const additions = current.additions.map(addition => {
    const before = beforeById.get(addition.scenarioId);
    if (!before) return addition;
    const base = current.original.find(scenario => scenario.id === addition.scenarioId);
    const baseIds = new Set((base?.questions || []).map(question => question.id));
    return {
      ...clone(addition),
      scenarioVersion: before.version,
      questions: before.questions.filter(question => !baseIds.has(question.id)),
    };
  });
  return { original, newScenarios, additions, bank: composeExperimentalBank(original, newScenarios, additions) };
}

function fail(message) {
  throw new Error(message);
}

function mapParts(parts) {
  return {
    original: new Map(parts.original.map(s => [s.id, s])),
    newScenarios: new Map(parts.newScenarios.map(s => [s.id, s])),
    additions: new Map(parts.additions.map(s => [s.scenarioId, s])),
  };
}

function locateScenario(parts, scenarioId) {
  if (parts.original.has(scenarioId)) return "original";
  if (parts.newScenarios.has(scenarioId)) return "newScenarios";
  fail(`Proposal scenario is absent from source partitions: ${scenarioId}`);
}

function assertSourceRow(proposal, currentById, scenario) {
  const current = currentById.get(scenario.scenarioId);
  if (!current) fail(`Current composed bank is missing ${scenario.scenarioId}`);
  const expected = scenario.sourceReturn;
  const actual = scenarioSnapshotHash(current);
  if (current.version !== scenario.baseVersion) fail(`${scenario.scenarioId}: stale scenario version ${current.version}; expected ${scenario.baseVersion}`);
  if (expected.baseScenarioHash !== actual || expected.computedCurrentScenarioHash !== actual) {
    fail(`${scenario.scenarioId}: stale before-scenario hash`);
  }
  return current;
}

function assertQuestionClosure(current, scenario) {
  const oldById = new Map(current.questions.map(q => [q.id, q]));
  const nextById = new Map(scenario.replacement.questions.map(q => [q.id, q]));
  assert.deepEqual([...nextById.keys()], [...oldById.keys()], `${scenario.scenarioId}: question order/IDs changed`);
  const actual = scenario.replacement.questions
    .filter(q => questionContentHash(current, oldById.get(q.id)) !== questionContentHash(scenario.replacement, q))
    .map(q => q.id);
  const rowIds = scenario.changedQuestions.map(row => row.questionId);
  if (new Set(rowIds).size !== rowIds.length) fail(`${scenario.scenarioId}: changedQuestions contains duplicate IDs`);
  assert.deepEqual([...rowIds].sort(), [...actual].sort(), `${scenario.scenarioId}: changedQuestions coverage mismatch`);
  assert.deepEqual([...scenario.finalAffectedQuestionIds].sort(), [...actual].sort(), `${scenario.scenarioId}: final closure mismatch`);
  // The final review may repair additional retained questions. Preserve the
  // Claude closure separately and verify it against the immutable source return.
  for (const id of scenario.sourceAffectedQuestionIds) if (!actual.includes(id)) fail(`${scenario.scenarioId}: source closure mismatch`);
  for (const row of scenario.changedQuestions) {
    const old = oldById.get(row.questionId);
    const next = nextById.get(row.questionId);
    if (!old || !next) fail(`${scenario.scenarioId}/${row.questionId}: changed question disappeared`);
    if (row.beforeHash !== questionContentHash(current, old)) fail(`${row.questionId}: stale before-content hash`);
    if (row.afterHash !== questionContentHash(scenario.replacement, next)) fail(`${row.questionId}: after-content hash mismatch`);
  }
}

function applyToParts(parts, proposal) {
  const patched = {
    original: clone(parts.original),
    newScenarios: clone(parts.newScenarios),
    additions: clone(parts.additions),
  };
  const currentById = new Map(parts.bank.map(s => [s.id, s]));
  const changedIds = new Set();
  for (const packet of proposal.packets) {
    if (packet.snapshotId !== proposal.sourceSnapshotId) fail(`${packet.packetId}: snapshot mismatch`);
    for (const scenario of packet.scenarios) {
      const current = assertSourceRow(proposal, currentById, scenario);
      assert.equal(scenario.proposedVersion, current.version + 1, `${scenario.scenarioId}: version must increment once`);
      assert.equal(scenario.replacement.id, scenario.scenarioId, `${scenario.scenarioId}: replacement ID drift`);
      assert.equal(scenario.replacement.version, scenario.proposedVersion, `${scenario.scenarioId}: replacement version drift`);
      assert.equal(scenario.replacement.ageBand, current.ageBand, `${scenario.scenarioId}: replacement age drift`);
      assertQuestionClosure(current, scenario);
      if (changedIds.has(scenario.scenarioId)) fail(`Duplicate scenario proposal: ${scenario.scenarioId}`);
      changedIds.add(scenario.scenarioId);
      const partition = locateScenario(mapParts(parts), scenario.scenarioId);
      const target = partition === "original" ? patched.original : patched.newScenarios;
      const targetIndex = target.findIndex(s => s.id === scenario.scenarioId);
      if (targetIndex < 0) fail(`${scenario.scenarioId}: partition entry disappeared`);
      const baseQuestionIds = new Set((parts.original.find(s => s.id === scenario.scenarioId)?.questions || []).map(q => q.id));
      target[targetIndex] = partition === "original"
        ? { ...clone(scenario.replacement), questions: scenario.replacement.questions.filter(q => baseQuestionIds.has(q.id)) }
        : clone(scenario.replacement);
      const addition = patched.additions.find(s => s.scenarioId === scenario.scenarioId);
      if (addition) {
        addition.scenarioVersion = scenario.proposedVersion;
        addition.questions = scenario.replacement.questions.filter(q => !baseQuestionIds.has(q.id));
      }
    }
  }
  return {patched, changedIds};
}

export function validateIndependentReceipt(receipt, proposal, proposalBytes, changedRows) {
  if (!receipt || receipt.schemaVersion !== 1 || receipt.kind !== "independent-exact-hash-recheck") fail("Missing independent exact-hash recheck receipt");
  if (receipt.status !== "approved-for-write") fail(`Receipt status must be approved-for-write, got ${receipt.status}`);
  if (receipt.proposalSha256 !== sha256(proposalBytes)) fail("Independent receipt is bound to different proposal bytes");
  if (receipt.sourceSnapshotId !== proposal.sourceSnapshotId) fail("Independent receipt snapshot mismatch");
  assert.deepEqual(receipt.sourceReturnFileHashes, readSourceReturnFileHashes(proposal), "Claude output byte hashes changed or are absent");
  if (!receipt.reviewer || receipt.reviewer === (proposal.author || "goals_finish")) fail("Independent reviewer must differ from proposal author");
  const rows = new Map((receipt.questions || []).map(row => [row.questionId, row]));
  assert.equal(rows.size, (receipt.questions || []).length, "Independent receipt contains duplicate question IDs");
  const expected = new Map(changedRows.map(row => [row.questionId, row]));
  assert.equal(rows.size, expected.size, "Independent receipt question coverage count mismatch");
  for (const [id, expectedRow] of expected) {
    const row = rows.get(id);
    if (!row || row.decision !== "pass" || row.beforeHash !== expectedRow.beforeHash || row.afterHash !== expectedRow.afterHash) {
      fail(`${id}: independent exact-hash receipt is missing or stale`);
    }
  }
}

export function buildPlan({ proposalPath = PROPOSAL_PATH, receiptPath = null, write = false, parts: injectedParts = null } = {}) {
  if (write && !receiptPath) fail("--write requires --receipt <independent exact-hash receipt>");
  if (write && injectedParts) fail("Injected source parts are only permitted for dry-run tests");
  const proposalBytes = readProposalBytes(proposalPath);
  const proposal = JSON.parse(proposalBytes.toString("utf8"));
  if (proposal.status !== "proposed-not-independently-rechecked") fail("Only the proposed-not-independently-rechecked artifact is accepted");
  if (proposal.sourceSnapshotId !== SOURCE_SNAPSHOT_ID) fail("Unexpected source snapshot");
  for (const [packetId, file] of Object.entries(sourceReturnFiles(proposal))) {
    const returned = readJson(file);
    const packet = proposal.packets.find(row => row.packetId === packetId);
    for (const scenario of packet.scenarios) {
      const source = returned.repairs.find(row => row.scenarioId === scenario.scenarioId);
      if (!source) {
        if (scenario.sourceRetainedReview !== true) fail(`${scenario.scenarioId}: absent from source return`);
        const coverage = returned.coverage.filter(row => row.scenarioId === scenario.scenarioId);
        const current = (injectedParts || readBankFiles()).bank.find(row => row.id === scenario.scenarioId);
        if (!current || coverage.length !== current.questions.length || new Set(coverage.map(row => row.questionId)).size !== coverage.length) fail(`${scenario.scenarioId}: incomplete retained-source coverage`);
        for (const question of current.questions) {
          const row = coverage.find(row => row.questionId === question.id);
          if (row?.verdict !== "retain" || row.baseContentHash !== questionContentHash(current, question)) fail(`${question.id}: stale retained-source review`);
        }
        assert.deepEqual(scenario.sourceAffectedQuestionIds, [], `${scenario.scenarioId}: retained source has no repair closure`);
      } else {
        assert.deepEqual([...scenario.sourceAffectedQuestionIds].sort(), [...source.affectedQuestionIds].sort(), `${scenario.scenarioId}: source closure mismatch`);
      }
    }
  }
  const parts = injectedParts || readBankFiles();
  const { patched, changedIds } = applyToParts(parts, proposal);
  const patchedOriginal = [...patched.original.values()];
  const patchedNew = [...patched.newScenarios.values()];
  const patchedAdditions = [...patched.additions.values()];
  const composed = composeExperimentalBank(patchedOriginal, patchedNew, patchedAdditions);
  for (const packet of proposal.packets) for (const scenario of packet.scenarios) {
    assert.deepEqual(composed.find(row => row.id === scenario.scenarioId), scenario.replacement, `${scenario.scenarioId}: partition composition differs from intended replacement`);
  }
  const validationErrors = validateExperimentalBank(composed, {U7:20,U9:30,U11:50,U13:50,U15:30,U18:20});
  assert.equal(composed.reduce((sum, row) => sum + row.questions.length, 0), 1600, "Bank question count drift");
  if (validationErrors.length) fail(`Hypothetical composed bank failed validation: ${validationErrors.join("; ")}`);
  for (const old of parts.bank) {
    if (!changedIds.has(old.id)) assert.deepEqual(composed.find(s => s.id === old.id), old, `Unrelated scenario changed: ${old.id}`);
  }
  const changedRows = proposal.packets.flatMap(packet => packet.scenarios.flatMap(scenario => scenario.changedQuestions.map(row => ({ ...row, scenarioId: scenario.scenarioId }))));
  if (write) {
    validateIndependentReceipt(readJson(receiptPath), proposal, proposalBytes, changedRows);
  }
  return {
    proposal, proposalPath, receiptPath, parts, patched, composed, changedIds, changedRows,
    proposalSha256: sha256(proposalBytes), sourceReturnFileHashes: readSourceReturnFileHashes(proposal),
    validationErrors, writeAuthorized: Boolean(write && receiptPath),
  };
}

function readSourceReturnFileHashes(proposal) {
  return Object.fromEntries(Object.entries(sourceReturnFiles(proposal)).map(([packetId, file]) => [packetId, sha256(readFileSync(file))]));
}

export function writePlan(plan) {
  if (!plan?.writeAuthorized) fail("writePlan requires a receipt-validated write plan");
  // Re-read every source partition and receipt immediately before writes.
  // This closes the stale window between an earlier dry-run and invocation.
  const fresh = buildPlan({ proposalPath: plan.proposalPath, receiptPath: plan.receiptPath, write: true });
  assert.equal(fresh.proposalSha256, plan.proposalSha256, "Proposal changed after write preflight");
  assert.deepEqual(fresh.sourceReturnFileHashes, plan.sourceReturnFileHashes, "Claude output changed after write preflight");
  const byAge = new Map();
  const stage = (age, key, file) => { if (!byAge.has(age)) byAge.set(age, {}); byAge.get(age)[key] = file; };
  for (const age of AGES) {
    stage(age, "original", path.join(REPO_ROOT, `src/one-on-one/experimental-bank/${age}.json`));
    stage(age, "newScenarios", path.join(REPO_ROOT, `src/one-on-one/experimental-expansion/${age}-scenarios.json`));
    stage(age, "additions", path.join(REPO_ROOT, `src/one-on-one/experimental-expansion/${age}-additions.json`));
  }
  const changed = new Set(fresh.changedIds);
  const patchedOriginal = new Map(fresh.patched.original.map(s => [s.id, s]));
  const patchedNew = new Map(fresh.patched.newScenarios.map(s => [s.id, s]));
  const patchedAdditions = new Map(fresh.patched.additions.map(s => [s.scenarioId, s]));
  const writes = [];
  for (const [age, files] of byAge) {
    const original = readJson(files.original);
    assert.deepEqual(original, fresh.parts.original.filter(s => s.ageBand.toLowerCase() === age), `${age}: original source changed after final preflight`);
    const nextOriginal = original.map(s => changed.has(s.id) ? patchedOriginal.get(s.id) : s);
    const newScenarios = readJson(files.newScenarios);
    assert.deepEqual(newScenarios, fresh.parts.newScenarios.filter(s => s.ageBand.toLowerCase() === age), `${age}: new scenario source changed after final preflight`);
    const nextNew = newScenarios.map(s => changed.has(s.id) ? patchedNew.get(s.id) : s);
    const additions = readJson(files.additions);
    const ageScenarioIds = new Set([...fresh.parts.original, ...fresh.parts.newScenarios].filter(s => s.ageBand.toLowerCase() === age).map(s => s.id));
    assert.deepEqual(additions, fresh.parts.additions.filter(s => ageScenarioIds.has(s.scenarioId)), `${age}: additions source changed after final preflight`);
    const nextAdditions = additions.map(s => changed.has(s.scenarioId) ? patchedAdditions.get(s.scenarioId) : s);
    if (JSON.stringify(original) !== JSON.stringify(nextOriginal)) writes.push([files.original, JSON.stringify(nextOriginal, null, 2) + "\n"]);
    if (JSON.stringify(newScenarios) !== JSON.stringify(nextNew)) writes.push([files.newScenarios, JSON.stringify(nextNew, null, 2) + "\n"]);
    if (JSON.stringify(additions) !== JSON.stringify(nextAdditions)) writes.push([files.additions, JSON.stringify(nextAdditions, null, 2) + "\n"]);
  }
  // Every read, target partition, and intended post-compose result is checked
  // before the first write.
  for (const [file] of writes) readFileSync(file);
  for (const [file, contents] of writes) writeFileSync(file, contents);
  const after = readBankFiles();
  const afterComposed = composeExperimentalBank(after.original, after.newScenarios, after.additions);
  assert.deepEqual(afterComposed, fresh.composed, "Post-write composed bank differs from intended replacement");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes("--write");
  const receiptIndex = process.argv.indexOf("--receipt");
  const receiptPath = receiptIndex >= 0 ? process.argv[receiptIndex + 1] : null;
  const proposalIndex = process.argv.indexOf("--proposal");
  if (proposalIndex >= 0 && (!process.argv[proposalIndex + 1] || process.argv[proposalIndex + 1].startsWith("--"))) fail("--proposal requires a path");
  const proposalPath = proposalIndex >= 0 ? path.resolve(process.argv[proposalIndex + 1]) : PROPOSAL_PATH;
  const plan = buildPlan({ proposalPath, receiptPath, write });
  if (write) writePlan(plan);
  console.log(JSON.stringify({ mode: write ? "write" : "dry-run", proposalSha256: plan.proposalSha256, scenarios: plan.changedIds.size, changedQuestions: plan.changedRows.length, validationErrors: plan.validationErrors }, null, 2));
}
