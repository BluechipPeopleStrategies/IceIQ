import assert from "node:assert/strict";
import { test } from "node:test";
import { coachFeedbackHeadline } from "../src/play/coachFeedbackTone.js";

test("coach feedback uses stable, bounded language", () => {
  const correct = Array.from({ length: 20 }, (_, index) => coachFeedbackHeadline({ id: `play-${index}`, correct: true }));
  const incorrect = Array.from({ length: 20 }, (_, index) => coachFeedbackHeadline({ id: `play-${index}`, correct: false }));

  assert.ok(new Set(correct).size >= 3);
  assert.ok(new Set(incorrect).size >= 3);
  assert.equal(coachFeedbackHeadline({ id: "same-play", correct: true }), coachFeedbackHeadline({ id: "same-play", correct: true }));

  for (const headline of [...correct, ...incorrect]) {
    assert.doesNotMatch(headline, /elite|amazing|perfect|terrible|awful|bad|failure|stupid/i);
    assert.ok(headline.length <= 24);
  }
});
