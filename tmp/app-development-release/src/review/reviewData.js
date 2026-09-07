import { loadQB } from "../qbLoader.js";
import { selectAndOrder } from "./reviewCore.js";

// All reviewable board scenarios, ordered unreviewed-first.
export async function loadReviewScenarios(reviewedIds = new Set()) {
  const qb = await loadQB();
  return selectAndOrder(qb, reviewedIds);
}
