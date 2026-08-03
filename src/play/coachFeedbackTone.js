// Coach feedback headlines. Chosen by a stable hash of the (play:node:option)
// id, so the same option always gets the same headline while different reads
// across the app get variety. Rules: warm, growth-oriented, hockey-voiced,
// max 24 chars, never harsh (see scripts/test-coach-feedback-tone.mjs).
const CORRECT_HEADLINES = [
  "Correct read",
  "That's the play",
  "Good decision",
  "You saw it",
  "Tape to tape",
  "That's hockey sense",
  "Right read, right time",
  "You found the ice",
  "Heads-up play",
  "That's the open look",
  "Quick read, good play",
  "Coach would take that",
];

const INCORRECT_HEADLINES = [
  "Not quite",
  "Take another look",
  "Try another option",
  "Re-read the play",
  "Watch it again",
  "The ice says otherwise",
  "There's a better option",
  "Check the other side",
  "Close. Look again",
  "See what the checker did",
  "Find the open teammate",
  "Good try. Keep reading",
];

function stableIndex(value, length) {
  const hash = String(value || "").split("").reduce(
    (result, char) => ((result * 31) + char.charCodeAt(0)) >>> 0,
    7
  );
  return hash % length;
}

export function coachFeedbackHeadline({ id, correct }) {
  const pool = correct ? CORRECT_HEADLINES : INCORRECT_HEADLINES;
  return pool[stableIndex(`${id}:${correct ? "correct" : "incorrect"}`, pool.length)];
}
