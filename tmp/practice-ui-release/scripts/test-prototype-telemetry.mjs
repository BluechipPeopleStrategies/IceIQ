import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import {
  collectPlayTelemetrySnapshots,
  createQuestionTelemetrySnapshot,
  snapshotHasForbiddenYoungLanguage,
} from "../src/play/prototypeTelemetry.js";

describe("prototype telemetry snapshots", () => {
  it("captures player-facing text after age translation", () => {
    const play = {
      id: "sample_2v1",
      title: "Sample 2-on-1",
      concept: "2-on-1",
      nodes: {
        rush: {
          q: "Pass to F2 or shoot through D1?",
          youngQ: "What should YOU do?",
          ask: {
            opts: [
              {
                id: "pass",
                t: "Pass to F2",
                youngT: "Pass to Helper",
                ok: true,
                why: "F2 is open.",
              },
              {
                id: "shoot",
                t: "Shoot through D1",
                ok: false,
                no: "D1 blocks the lane.",
              },
            ],
          },
        },
      },
    };

    const young = createQuestionTelemetrySnapshot({
      play,
      nodeId: "rush",
      node: play.nodes.rush,
      ageBand: "U7 - Playground",
    });

    assert.equal(young.displayedQuestion, "What should YOU do?");
    assert.equal(young.options[0].displayedText, "Pass to Helper");
    assert.equal(young.options[0].displayedRevealText, "Helper is open.");
    assert.equal(snapshotHasForbiddenYoungLanguage(young), false);

    const trainer = createQuestionTelemetrySnapshot({
      play,
      nodeId: "rush",
      node: play.nodes.rush,
      ageBand: "U11 - The Trainer",
    });

    assert.equal(trainer.displayedQuestion, "Pass to support teammate or shoot through defender?");
    assert.equal(trainer.options[0].displayedText, "Pass to support teammate");
    assert.equal(trainer.options[0].displayedRevealText, "support teammate is open.");

    const film = createQuestionTelemetrySnapshot({
      play,
      nodeId: "rush",
      node: play.nodes.rush,
      ageBand: "U15 - Film Room",
    });

    assert.equal(film.displayedQuestion, "Pass to F2 or shoot through D1?");
    assert.equal(film.options[0].displayedText, "Pass to F2");
  });

  it("changes signature when the player-facing question changes", () => {
    const play = {
      id: "signature_test",
      title: "Signature Test",
      concept: "test",
      nodes: {
        start: {
          q: "Question A?",
          ask: {
            opts: [
              { id: "a", t: "Option A", ok: true },
              { id: "b", t: "Option B", no: "No." },
            ],
          },
        },
      },
    };

    const first = createQuestionTelemetrySnapshot({
      play,
      nodeId: "start",
      node: play.nodes.start,
      ageBand: "U11 - The Trainer",
    });

    play.nodes.start.q = "Question B?";

    const second = createQuestionTelemetrySnapshot({
      play,
      nodeId: "start",
      node: play.nodes.start,
      ageBand: "U11 - The Trainer",
    });

    assert.notEqual(first.questionSignature, second.questionSignature);
  });

  it("keeps catalog telemetry free of young-player shorthand for U7 through U13", () => {
    const checkedAges = ["U7 - Playground", "U9 - Explorer", "U11 - The Trainer", "U13 - The Reader"];

    for (const play of ALL_ANIMATED_PLAYS) {
      for (const ageBand of checkedAges) {
        const snapshots = collectPlayTelemetrySnapshots(play, ageBand);

        for (const snapshot of snapshots) {
          assert.equal(
            snapshotHasForbiddenYoungLanguage(snapshot),
            false,
            `${snapshot.playId} / ${snapshot.nodeId} / ${ageBand} still has shorthand in telemetry`
          );
        }
      }
    }
  });
});
