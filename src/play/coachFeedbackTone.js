const CORRECT_HEADLINES = [
  "Correct read",
  "That's the play",
  "Good decision",
  "You saw it",
];

const INCORRECT_HEADLINES = [
  "Not quite",
  "Take another look",
  "Try another option",
  "Re-read the play",
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
