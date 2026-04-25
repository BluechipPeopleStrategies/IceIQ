// Pure scorer for the sequence primitive. v1 sequences are ordered lists
// of actor IDs — the user taps them in order. Schema-wise it's a
// SelectionInteraction with order="ordered" plus a fixed expected length.

import { scoreSelection } from "./selection-scorer.js";

export function scoreSequence(picked, correct) {
  return scoreSelection(picked, correct, { ordered: true });
}
