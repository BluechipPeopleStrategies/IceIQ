import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AGE_BANDS, profileForAge } from "../src/play/interactionProfiles.js";
import { MOTION_STYLES, motionStyle } from "../src/play/motionVocabulary.js";
import { tokenSpec, validateTokenSystem } from "../src/play/tokenSystem.js";

describe("RinkReads play token system", () => {
  it("defines all six age-band profiles", () => {
    assert.deepEqual(AGE_BANDS, ["U7", "U9", "U11", "U13", "U15", "U18"]);
    assert.equal(profileForAge("U7").token, "figure");
    assert.equal(profileForAge("U11").token, "token");
    assert.equal(profileForAge("U18").token, "symbol");
    assert.equal(profileForAge("unknown").token, "token");
  });

  it("keeps every token distinguishable without color alone", () => {
    assert.deepEqual(validateTokenSystem(), []);
    const young = tokenSpec({ actor: { id: "F1", role: "puckCarrier", team: "home" }, ageBand: "U7", isDecisionActor: true });
    const trainer = tokenSpec({ actor: { id: "F2", role: "support", team: "home" }, ageBand: "U11", isDecisionActor: false });
    const advanced = tokenSpec({ actor: { id: "D1", role: "defender", team: "away" }, ageBand: "U18", isDecisionActor: false });
    assert.equal(young.representation, "figure");
    assert.equal(young.caption, "YOU");
    assert.equal(trainer.shape, "circle");
    assert.equal(advanced.shape, "x-circle");
    assert.equal(advanced.colorOnly, false);
  });

  it("defines motion vocabulary by line pattern and label, not only color", () => {
    assert.equal(MOTION_STYLES.pass.dash, "4 3");
    assert.equal(MOTION_STYLES.shot.width > MOTION_STYLES.skate.width, true);
    assert.equal(MOTION_STYLES.blocked.pattern, "striped");
    assert.equal(motionStyle("missing").label, "Skate route");
  });
});

