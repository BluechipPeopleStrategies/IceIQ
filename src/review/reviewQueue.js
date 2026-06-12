import { mergeQueue } from "./reviewCore.js";
import { upsertScenarioReview, listMyReviews } from "../supabase.js";

const QUEUE_KEY = "rr_review_queue_v1";   // entries pending sync to Supabase
const REVIEWS_KEY = "rr_reviews_v1";      // durable map { [scenario_id]: { verdict, note, updated_at } }

function read(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function write(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota / private mode */ } }

// Save a verdict+note for a scenario: durable record + queued for sync (offline-safe).
export function enqueueReview(entry) {
  const e = { ...entry, updated_at: new Date().toISOString() };
  write(QUEUE_KEY, mergeQueue(read(QUEUE_KEY, []), e));
  const reviews = read(REVIEWS_KEY, {});
  reviews[e.scenario_id] = { verdict: e.verdict, note: e.note || "", updated_at: e.updated_at };
  write(REVIEWS_KEY, reviews);
}

// The saved { verdict, note } for one scenario, or null.
export function getSavedReview(scenario_id) {
  return read(REVIEWS_KEY, {})[scenario_id] || null;
}

export function getReviewedIds() { return new Set(Object.keys(read(REVIEWS_KEY, {}))); }

// Push every queued verdict; keep the ones that fail. Returns pending count.
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

// Merge this reviewer's server rows into the durable map (newest wins). Cross-device.
export async function syncServerReviews() {
  const rows = await listMyReviews();
  if (!rows.length) return;
  const reviews = read(REVIEWS_KEY, {});
  for (const r of rows) {
    const existing = reviews[r.scenario_id];
    if (!existing || (r.updated_at || "") > (existing.updated_at || "")) {
      reviews[r.scenario_id] = { verdict: r.verdict, note: r.note || "", updated_at: r.updated_at };
    }
  }
  write(REVIEWS_KEY, reviews);
}
