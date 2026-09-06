import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { questionContentHash } from "./question-batch-core.mjs";

const keyFor = (questionId, contentHash) => `${questionId}|${contentHash}`;

export function loadHistoricalQuestionSnapshots(repairDirectory) {
  const snapshots = new Map();
  const add = (questionId, contentHash, question, receipt, sceneVersion = null) => {
    if (!questionId || !contentHash || !question) return;
    const key = keyFor(questionId, contentHash);
    if (!snapshots.has(key)) snapshots.set(key, { question, receipt, sceneVersion });
  };
  for (const file of readdirSync(repairDirectory).filter(name => name.endsWith(".json")).sort()) {
    const receipt = JSON.parse(readFileSync(join(repairDirectory, file), "utf8"));
    for (const edit of receipt.sceneEdits || []) {
      for (const side of ["before", "after"]) {
        const scene = edit[side];
        if (!Array.isArray(scene?.questions)) continue;
        for (const question of scene.questions) add(question.id, questionContentHash(scene, question), question, file, scene.version ?? null);
      }
    }
    for (const change of receipt.changes || []) {
      add(change.questionId, change.beforeContentHash, change.before, file, change.baseVersion ?? null);
      add(change.questionId, change.afterContentHash, change.after, file, change.newVersion ?? null);
    }
  }
  return snapshots;
}

export function resolveHistoricalQuestion(row, current, snapshots) {
  const currentHash = questionContentHash(current.s, current.q);
  if (currentHash === row.contentHash) return { question: current.q, contentHash: currentHash, matchesCurrent: true, receipt: null, sceneVersion: current.s.version };
  const historical = snapshots.get(keyFor(row.questionId, row.contentHash));
  if (!historical) throw new Error(`No immutable historical snapshot matches ${row.questionId} hash ${row.contentHash}`);
  return { ...historical, contentHash: row.contentHash, matchesCurrent: false };
}
