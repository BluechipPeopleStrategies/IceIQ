// npm run test:promote-scenario
// Tests scripts/promote-scenario.mjs's idempotency (Task 6's own explicit
// requirement: "prove idempotency with a test -- running promotion twice
// produces no duplicate entries and no diff on the second run"), its
// state-machine gating (refuses to promote anything not staged), and its
// judgment-record enforcement (refuses an invalid record, a non-approve
// verdict, or a non-eligible record with no explicit manual override).
//
// Uses an ISOLATED, test-only promotedRoot (never the real, shared
// docs/factory/promoted/) -- the first version of this suite imported the
// real production PROMOTED_ROOT and its cleanup step deleted the real,
// shared index.json every time the test ran, destroying Task 6's own
// "deterministic, regeneratable index" deliverable. (Caught by both of
// Phase 6's independent adversarial reviews, 2026-07-31.)

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { startRun, readEvents } from "../src/scenario-engine/factoryRun.js";
import { appendStateTransition, globalCurrentState, STATES } from "../src/scenario-engine/stateMachine.js";
import { readPromotedArtifact } from "../src/scenario-engine/promotedArtifact.js";
import { buildJudgmentRecord, JUDGMENT_VERDICT, JUDGMENT_GATE } from "../src/scenario-engine/judgmentRecord.js";
import { promoteScenario, buildCatalogDiffReport } from "./promote-scenario.mjs";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";

const TEST_PROMOTED_ROOT = join(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]):/, "$1:"), "_test_promote_scenario_scratch_promoted");

function fakeArtifacts(id) {
  return {
    definition: { id, family: "test_family" },
    compiledPlay: { id, version: 1, compiledHash: `hash-${id}` },
    dependencyRecord: { artifactId: id, physicsProfile: "physics-u13-v1" },
  };
}

function approvedJudgmentRecord(id, overrides = {}) {
  return buildJudgmentRecord({
    artifactId: id, artifactHash: `hash-${id}`, gateId: JUDGMENT_GATE.GATE8_HOCKEY_JUDGMENT,
    provider: "anthropic-claude-code-attended-session", sessionId: "test-session",
    model: "claude-sonnet-5", reasoningConfig: { effort: "high" }, calibrationCorpusVersion: "corpus-v1",
    rubricHash: "rubrichash", promptContextManifestHash: "manifesthash", toolManifestHash: "toolhash",
    engineCommit: "deadbeef", verdict: JUDGMENT_VERDICT.APPROVE, rationale: "test rationale", confidence: "high",
    ...overrides,
  });
}

async function stageArtifact(runDir, id) {
  let events = readEvents(runDir);
  for (const [state, reason] of [
    [STATES.GENERATED, "created"], [STATES.VALIDATED, "validated"], [STATES.JUDGED, "judged"],
    [STATES.PROMOTION_ELIGIBLE, "eligible"], [STATES.STAGED, "staged"],
  ]) {
    appendStateTransition(runDir, id, "h1", state, reason);
  }
}

describe("promoteScenario: idempotency, state-machine gating, judgment enforcement", () => {
  const testRunDirs = [];

  it("refuses to promote an artifact that was never staged", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_never_staged");
    appendStateTransition(runDir, definition.id, "h1", STATES.GENERATED, "created");

    await assert.rejects(() => promoteScenario({
      runDir, family: "test_family", definition, compiledPlay, judgmentRecord: approvedJudgmentRecord(definition.id), dependencyRecord, promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT,
    }));
  });

  it("EXIT GATE: refuses to promote an INVALID judgment record, even if the artifact is staged", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_invalid_judgment");
    await stageArtifact(runDir, definition.id);

    // The bare, schema-incomplete object a naive caller might construct --
    // this is EXACTLY the shape that previously slipped through unchecked.
    const invalidJudgmentRecord = { verdict: "approve", rationale: "test", confidence: "high" };
    await assert.rejects(() => promoteScenario({
      runDir, family: "test_family", definition, compiledPlay, judgmentRecord: invalidJudgmentRecord, dependencyRecord, promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT,
    }));
    assert.equal(readPromotedArtifact(TEST_PROMOTED_ROOT, "test_family", "sd_invalid_judgment"), null, "nothing was written for the rejected invalid record");
  });

  it("EXIT GATE: refuses to promote a REJECT verdict, even from an otherwise well-formed judgment record", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_rejected_judgment");
    await stageArtifact(runDir, definition.id);

    await assert.rejects(() => promoteScenario({
      runDir, family: "test_family", definition, compiledPlay, judgmentRecord: approvedJudgmentRecord(definition.id, { verdict: JUDGMENT_VERDICT.REJECT }), dependencyRecord, promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT,
    }));
  });

  it("EXIT GATE: refuses to promote a non-eligible judgment record (incomplete metadata) with no manualPromotionReason", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_no_override");
    await stageArtifact(runDir, definition.id);

    const incompleteRecord = approvedJudgmentRecord(definition.id, { calibrationCorpusVersion: null });
    assert.equal(incompleteRecord.autoPromotionEligible, false);
    await assert.rejects(() => promoteScenario({
      runDir, family: "test_family", definition, compiledPlay, judgmentRecord: incompleteRecord, dependencyRecord, promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT,
    }));
  });

  it("promotes a non-eligible judgment record WHEN an explicit manualPromotionReason is supplied (Task 8's own manual-override path)", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_manual_override");
    await stageArtifact(runDir, definition.id);

    const incompleteRecord = approvedJudgmentRecord(definition.id, { calibrationCorpusVersion: null });
    const result = await promoteScenario({
      runDir, family: "test_family", definition, compiledPlay, judgmentRecord: incompleteRecord, dependencyRecord,
      manualPromotionReason: "first-of-class item, clean judgment, calibration gap only", promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT,
    });
    assert.equal(result.writeResult.wrote, true);
    assert.equal(result.record.manualPromotionReason, "first-of-class item, clean judgment, calibration gap only");
  });

  it("promotes a genuinely staged, validly-approved artifact, writes the record, transitions to promoted", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_promote_test");
    await stageArtifact(runDir, definition.id);

    const result = await promoteScenario({
      runDir, family: "test_family", definition, compiledPlay, judgmentRecord: approvedJudgmentRecord(definition.id), dependencyRecord, promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT,
    });

    assert.equal(result.writeResult.wrote, true);
    assert.equal(result.alreadyPromoted, false);
    assert.notEqual(result.transitionEvent, null);
    assert.equal(readPromotedArtifact(TEST_PROMOTED_ROOT, "test_family", "sd_promote_test").artifactId, "sd_promote_test");
    assert.equal(globalCurrentState(join(runDir, ".."), definition.id), STATES.PROMOTED);
  });

  it("EXIT GATE: running promotion TWICE produces no duplicate entries and no diff on the second run", async () => {
    const { runDir } = startRun({ family: "test_family", requestedCounts: { candidates: 1 }, versions: { test: "v1" } });
    testRunDirs.push(runDir);
    const { definition, compiledPlay, dependencyRecord } = fakeArtifacts("sd_idempotent_test");
    await stageArtifact(runDir, definition.id);
    const judgmentRecord = approvedJudgmentRecord(definition.id);

    const first = await promoteScenario({ runDir, family: "test_family", definition, compiledPlay, judgmentRecord, dependencyRecord, promotedAt: "2026-07-31T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT });
    const eventCountAfterFirst = readEvents(runDir).length;

    const second = await promoteScenario({ runDir, family: "test_family", definition, compiledPlay, judgmentRecord, dependencyRecord, promotedAt: "2026-08-15T00:00:00.000Z", promotedRoot: TEST_PROMOTED_ROOT });

    assert.equal(first.record.recordHash, second.record.recordHash, "same underlying content -> same recordHash across both calls");
    assert.equal(second.writeResult.wrote, false, "the second call is a genuine no-op write");
    assert.equal(second.alreadyPromoted, true, "the second call recognizes the artifact was already promoted");
    assert.equal(second.transitionEvent, null, "the second call does NOT append another state-transition event");
    assert.equal(readEvents(runDir).length, eventCountAfterFirst, "no new events were appended by the second (idempotent) promotion call");
  });

  it("buildCatalogDiffReport correctly reports an already-live catalog play, using the real catalog", () => {
    const realLivePlayId = ALL_ANIMATED_PLAYS[0].id;
    const report = buildCatalogDiffReport({ id: "sd_whatever" }, { linkedLiveCatalogPlayId: realLivePlayId });
    assert.equal(report.alreadyLive, true);
  });

  it("buildCatalogDiffReport correctly reports a genuinely NOT-live id", () => {
    const report = buildCatalogDiffReport({ id: "sd_whatever" }, { linkedLiveCatalogPlayId: "play_this_does_not_exist_anywhere_v1" });
    assert.equal(report.alreadyLive, false);
  });

  it("buildCatalogDiffReport with no linked id supplied is honest about not knowing", () => {
    const report = buildCatalogDiffReport({ id: "sd_whatever" }, {});
    assert.equal(report.alreadyLive, false);
    assert.equal(report.linkedLiveCatalogPlayId, null);
  });

  it("cleanup", () => {
    for (const dir of testRunDirs) rmSync(dir, { recursive: true, force: true });
    // Scoped to this test's OWN isolated scratch root only -- never the
    // real, shared docs/factory/promoted/.
    rmSync(TEST_PROMOTED_ROOT, { recursive: true, force: true });
    assert.equal(existsSync(TEST_PROMOTED_ROOT), false);
  });
});
