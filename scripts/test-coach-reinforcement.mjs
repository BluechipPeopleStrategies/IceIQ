import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCoachAnswer, initialCoachReinforcement, loadCoachReinforcement, saveCoachReinforcement } from "../src/play/coachReinforcement.js";

test("coach feedback appears after every answer", () => {
  let state = initialCoachReinforcement("session-a");
  for (const answer of [
    { id: "first", correct: true },
    { id: "second", correct: true },
    { id: "wrong", correct: false },
    { id: "first", correct: true },
  ]) {
    const result = applyCoachAnswer(state, answer);
    assert.equal(result.showCoach, true);
    state = result.state;
  }
});

test("reinforcement state round-trips through storage", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const state = initialCoachReinforcement("saved");
  saveCoachReinforcement(storage, state);
  assert.deepEqual(loadCoachReinforcement(storage), state);
});
