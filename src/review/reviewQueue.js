import { mergeQueue } from "./reviewCore.js";
import { upsertScenarioReview, listMyReviews } from "../supabase.js";

const QUEUE_KEY = "rr_review_queue_v1";
const REVIEWED_KEY = "rr_reviewed_ids_v1";

function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ } }

// Queue a verdict locally and mark the scenario reviewed (offline-safe).
export function enqueueReview(entry) {
  const e = { ...entry, updated_at: new Date().toISOString() };
  write(QUEUE_KEY, mergeQueue(read(QUEUE_KEY, []), e));
  const reviewed = new Set(read(REVIEWED_KEY, []));
  reviewed.add(e.scenario_id);
  write(REVIEWED_KEY, [...reviewed]);
}

export function getReviewedIds() { return new Set(read(REVIEWED_KEY, [])); }

// Try to push every queued verdict; keep the ones that fail. Returns pending count.
export async function flushQueue() {
  const queue = read(QUEUE_KEY, []);
  const remaining = [];
  for (const e of queue) {
    const res = await upsertScenarioReview(e);
    if (!res.ok) remaining.push(e);
  }
  write(QUEUE_KEY, remaining);
  return remaining.length;
}

// Pull this reviewer's server rows into the local reviewed set (cross-device).
export async function syncServerReviews() {
  const rows = await listMyReviews();
  if (!rows.length) return;
  const reviewed = new Set(read(REVIEWED_KEY, []));
  for (const r of rows) reviewed.add(r.scenario_id);
  write(REVIEWED_KEY, [...reviewed]);
}
