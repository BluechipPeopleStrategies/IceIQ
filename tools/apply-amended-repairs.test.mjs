import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildPlan,
  PROPOSAL_PATH,
  writePlan,
  validateIndependentReceipt,
  reconstructPartsFromApplicationReceipt,
} from "./apply-amended-repairs.mjs";

const APPLICATION_RECEIPT_PATH = path.resolve(
  "docs/factory/research/question-review/packets-02-06/application-receipt.json",
);
const baselineParts = () => reconstructPartsFromApplicationReceipt(APPLICATION_RECEIPT_PATH);
const testPlan = options => buildPlan({ ...options, parts: baselineParts() });

function temporaryProposal(mutator) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rinkreads-amended-repairs-"));
  const file = path.join(dir, "proposal.json");
  const proposal = JSON.parse(fs.readFileSync(PROPOSAL_PATH, "utf8"));
  mutator(proposal);
  fs.writeFileSync(file, JSON.stringify(proposal));
  return file;
}

test("amended repair dry-run preserves the original/additive partition", () => {
  const plan = testPlan();
  assert.equal(plan.changedIds.size, 23);
  assert.equal(plan.changedRows.length, 115);
  assert.deepEqual(plan.validationErrors, []);
  for (const scenario of plan.proposal.packets.flatMap(packet => packet.scenarios)) {
    const original = plan.parts.original.find(s => s.id === scenario.scenarioId);
    const addition = plan.parts.additions.find(s => s.scenarioId === scenario.scenarioId);
    if (original) {
      assert.ok(addition, `${scenario.scenarioId}: original scenario must retain its addition partition`);
      assert.equal(plan.patched.original.find(s => s.id === scenario.scenarioId).questions.length, original.questions.length);
      assert.equal(plan.patched.additions.find(s => s.scenarioId === scenario.scenarioId).questions.length, addition.questions.length);
    } else {
      assert.ok(plan.parts.newScenarios.some(s => s.id === scenario.scenarioId));
      assert.equal(plan.patched.newScenarios.find(s => s.id === scenario.scenarioId).questions.length, scenario.replacement.questions.length);
    }
  }
});

test("dry-run rejects a stale before-scenario hash", () => {
  const file = temporaryProposal(proposal => {
    proposal.packets[0].scenarios[0].sourceReturn.computedCurrentScenarioHash = "stale";
  });
  assert.throws(() => testPlan({ proposalPath: file }), /stale before-scenario hash/);
});

test("dry-run rejects an affected-question closure mismatch", () => {
  const file = temporaryProposal(proposal => {
    proposal.packets[0].scenarios[0].finalAffectedQuestionIds = [];
  });
  assert.throws(() => testPlan({ proposalPath: file }), /final closure mismatch/);
});

test("dry-run rejects duplicate changed-question receipt rows", () => {
  const file = temporaryProposal(proposal => {
    const scenario = proposal.packets[0].scenarios[0];
    scenario.changedQuestions.push({ ...scenario.changedQuestions[0] });
  });
  assert.throws(() => testPlan({ proposalPath: file }), /changedQuestions contains duplicate IDs/);
});

test("dry-run rejects replacement identity drift", () => {
  const file = temporaryProposal(proposal => {
    proposal.packets[0].scenarios[0].replacement.id = "wrong-scenario";
  });
  assert.throws(() => testPlan({ proposalPath: file }), /replacement ID drift/);
});

test("normal CLI source remains stale after application", () => {
  assert.throws(() => buildPlan(), /stale (scenario version|before-scenario hash)/);
});

test("dry-run rejects replacement version drift", () => {
  const file = temporaryProposal(proposal => {
    proposal.packets[0].scenarios[0].replacement.version += 1;
  });
  assert.throws(() => testPlan({ proposalPath: file }), /replacement version drift/);
});

test("write mode is impossible without an independent exact-hash receipt", () => {
  assert.throws(() => buildPlan({ write: true }), /--write requires --receipt/);
  assert.throws(() => buildPlan({ write: true, receiptPath: "receipt.json", parts: baselineParts() }), /only permitted for dry-run tests/);
});

test("exported writePlan cannot bypass receipt validation", () => {
  assert.throws(() => writePlan(testPlan()), /receipt-validated write plan/);
});

test("independent receipt must bind the original Claude output bytes", () => {
  const plan = testPlan();
  const receipt = {
    schemaVersion: 1,
    kind: "independent-exact-hash-recheck",
    status: "approved-for-write",
    sourceSnapshotId: plan.proposal.sourceSnapshotId,
    proposalSha256: plan.proposalSha256,
    reviewer: "independent-reviewer",
    questions: plan.changedRows.map(row => ({ ...row, decision: "pass" })),
  };
  assert.throws(
    () => validateIndependentReceipt(receipt, plan.proposal, fs.readFileSync(PROPOSAL_PATH), plan.changedRows),
    /Claude output byte hashes changed or are absent/,
  );
});

test("independent receipt rejects duplicate question rows", () => {
  const plan = testPlan();
  const receipt = {
    schemaVersion: 1,
    kind: "independent-exact-hash-recheck",
    status: "approved-for-write",
    sourceSnapshotId: plan.proposal.sourceSnapshotId,
    proposalSha256: plan.proposalSha256,
    sourceReturnFileHashes: plan.sourceReturnFileHashes,
    reviewer: "independent-reviewer",
    questions: plan.changedRows.map(row => ({ ...row, decision: "pass" })),
  };
  receipt.questions.push({ ...receipt.questions[0] });
  assert.throws(
    () => validateIndependentReceipt(receipt, plan.proposal, fs.readFileSync(PROPOSAL_PATH), plan.changedRows),
    /duplicate question IDs/,
  );
});


test("source packet paths reject traversal and duplicate assignments", () => {
  for (const sourcePackets of [["../packet-07"], ["packet-07", "packet-07"]]) {
    const file = temporaryProposal(proposal => { proposal.sourcePackets = sourcePackets; });
    assert.throws(() => testPlan({ proposalPath: file }), /Invalid source packet IDs/);
  }
});

test("proposal cannot relabel its immutable source closure", () => {
  const file = temporaryProposal(proposal => { proposal.packets[0].scenarios[0].sourceAffectedQuestionIds = []; });
  assert.throws(() => testPlan({ proposalPath: file }), /source closure mismatch/);
});

test("source packet list must match packet payloads", () => {
  const file = temporaryProposal(proposal => { proposal.sourcePackets = ["packet-07"]; });
  assert.throws(() => testPlan({ proposalPath: file }), /Source packet assignment mismatch/);
});


test("packets 07-09 retain source closure and independently cover extra repairs", () => {
  const proposalPath = path.resolve("docs/factory/research/question-review/packets-07-09/proposed-repairs.json");
  const parts = reconstructPartsFromApplicationReceipt(path.resolve("docs/factory/research/question-review/packets-07-09/application-receipt.json"));
  const plan = buildPlan({ proposalPath, parts });
  assert.equal(plan.changedIds.size, 14);
  assert.equal(plan.changedRows.length, 72);
  assert.deepEqual(Object.keys(plan.sourceReturnFileHashes), ["packet-07", "packet-08", "packet-09"]);
  assert.ok(plan.changedRows.some(row => row.questionId === "exp26-u9-011-q6"));
  const receipt = JSON.parse(fs.readFileSync(path.resolve("docs/factory/research/question-review/packets-07-09/independent-final-recheck.json")));
  validateIndependentReceipt(receipt, plan.proposal, fs.readFileSync(proposalPath), plan.changedRows);
  assert.throws(() => buildPlan({ proposalPath }), /stale scenario version/);
});
