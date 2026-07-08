import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ANIMATED_PLAY_EVENT_KEY, logAnimatedPlayEvent, readAnimatedPlayEvents, summarizeAnimatedPlayEvents } from "../src/play/telemetry.js";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}

describe("animated play telemetry", () => {
  it("logs bounded events and summarizes read behavior", () => {
    const storage = fakeStorage();
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "answer", answerId: "pass", ok: true, ms: 1200 }, storage);
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "answer", answerId: "shoot", ok: false, ms: 900 }, storage);
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "replay", ms: 0 }, storage);
    logAnimatedPlayEvent({ playId: "p1", nodeId: "rush", event: "unclear", ms: 500 }, storage);

    const events = readAnimatedPlayEvents(storage);
    assert.equal(events.length, 4);
    assert.equal(events[0].source, "animated-play-v1");
    assert.ok(storage.getItem(ANIMATED_PLAY_EVENT_KEY).includes("answer"));

    const summary = summarizeAnimatedPlayEvents("p1", storage);
    assert.equal(summary.answers, 2);
    assert.equal(summary.correct, 1);
    assert.equal(summary.replays, 1);
    assert.equal(summary.unclear, 1);
    assert.equal(summary.mostCommonWrongAnswer, "shoot");
  });
});

