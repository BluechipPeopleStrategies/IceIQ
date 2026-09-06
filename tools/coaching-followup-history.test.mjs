import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { projectRoot, readJson } from "./experimental-bank-files.mjs";
import { loadHistoricalQuestionSnapshots, resolveHistoricalQuestion } from "./coaching-followup-history.mjs";

const reviewRoot = join(projectRoot, "docs/factory/research/question-review");
const rows = ["mixed", "u13"].flatMap(lane => readJson(join(reviewRoot, "followup", `${lane}-proposals.json`)).entries);
const bank = ["u7", "u9", "u11", "u13", "u15", "u18"].flatMap(age => readJson(join(projectRoot, `src/one-on-one/experimental-bank/${age}.json`)));
const source = new Map(bank.flatMap(scenario => scenario.questions.map(question => [question.id, { s: scenario, q: question }])));
const snapshots = loadHistoricalQuestionSnapshots(join(reviewRoot, "repairs"));

test("all historical follow-ups resolve to exact archived or current content", () => {
  const resolved = rows.map(row => resolveHistoricalQuestion(row, source.get(row.questionId), snapshots));
  assert.equal(resolved.length, 55);
  // The later U11 retrieval q3 repair adds one archived version after packets 37–40.
  assert.equal(resolved.filter(row => !row.matchesCurrent).length, 26);
  const retrieval = resolved[rows.findIndex(row => row.questionId === "exp26-u11-001-q3")];
  assert.equal(retrieval.matchesCurrent, false);
  assert.ok(retrieval.receipt);
  resolved.forEach((result, index) => {
    assert.equal(result.contentHash, rows[index].contentHash);
    assert.equal(result.question.id, rows[index].questionId);
    if (!result.matchesCurrent) assert.ok(result.receipt, "Changed content must resolve through an immutable receipt");
  });
});

test("historical resolver rejects an unreceipted hash", () => {
  const row = { ...rows.find(row => row.questionId === "exp26-u13-001-q3"), contentHash: "forged" };
  assert.throws(() => resolveHistoricalQuestion(row, source.get(row.questionId), snapshots), /No immutable historical snapshot/);
});

test("archived U13 question remains the pre-repair wording", () => {
  const row = rows.find(row => row.questionId === "exp26-u13-001-q3");
  const resolved = resolveHistoricalQuestion(row, source.get(row.questionId), snapshots);
  assert.equal(resolved.matchesCurrent, false);
  assert.equal(resolved.receipt, "u13-original-repairs.json");
  assert.match(resolved.question.prompt, /Order one preparation routine/);
});
