import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import {
  SCENARIO_FAMILIES,
  buildScenarioFamilyReport,
  classifyPlayFamily,
} from "../src/play/playFamilies.js";

describe("scenario families", () => {
  it("has unique family ids", () => {
    const ids = SCENARIO_FAMILIES.map((family) => family.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("classifies every animated play into a scenario family", () => {
    const report = buildScenarioFamilyReport(ALL_ANIMATED_PLAYS);
    assert.deepEqual(report.unclassified, []);
    assert.equal(report.ok, true);
  });

  it("keeps family definitions useful for generation", () => {
    for (const family of SCENARIO_FAMILIES) {
      assert.ok(family.title);
      assert.ok(family.description);
      assert.ok(Array.isArray(family.matchTerms));
      assert.ok(family.matchTerms.length > 0);
      assert.ok(Array.isArray(family.teachingArc));
      assert.ok(family.teachingArc.length >= 3);
    }
  });

  it("has an implemented 2-on-1 family base", () => {
    const twoOnOnePlays = ALL_ANIMATED_PLAYS.filter((play) => classifyPlayFamily(play)?.id === "two_on_one");
    assert.ok(twoOnOnePlays.length >= 2);
  });
});
