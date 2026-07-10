import assert from "node:assert/strict";
import { test } from "node:test";
import { applyCoachAnswer, initialCoachReinforcement, loadCoachReinforcement, saveCoachReinforcement } from "../src/play/coachReinforcement.js";

test("bounded coach reinforcement is stable and never exceeds four correct answers", () => {
  let state = initialCoachReinforcement("session-a");
  let result = applyCoachAnswer(state, { id: "first", correct: true });
  assert.equal(result.showCoach, true);
  state = result.state;
  const duplicate = applyCoachAnswer(state, { id: "first", correct: true });
  assert.equal(duplicate.state.correctSinceCoach, state.correctSinceCoach);
  assert.equal(applyCoachAnswer(state, { id: "wrong", correct: false }).showCoach, true);
  let gap = 0;
  for (let index = 0; index < 30; index += 1) {
    result = applyCoachAnswer(state, { id: `c${index}`, correct: true });
    state = result.state;
    gap += 1;
    if (result.showCoach) { assert.ok(gap >= 2 && gap <= 4); gap = 0; }
  }
});

test("reinforcement state round-trips through storage", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const state = initialCoachReinforcement("saved");
  saveCoachReinforcement(storage, state);
  assert.deepEqual(loadCoachReinforcement(storage), state);
});
