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

// Rebuild the durable map from the server (authoritative) when the fetch succeeds:
// a review that was resolved/wiped server-side disappears here too, so the deck
// stops showing its note and the board is ready for a fresh pass. Locally-queued
// (not-yet-synced) entries are preserved so offline work isn't lost. On a fetch
// failure we leave the local cache untouched.
export async function syncServerReviews() {
  const { ok, rows } = await listMyReviews();
  if (!ok) return;
  const reviews = {};
  for (const r of rows) reviews[r.scenario_id] = { verdict: r.verdict, note: r.note || "", updated_at: r.updated_at };
  for (const e of read(QUEUE_KEY, [])) reviews[e.scenario_id] = { verdict: e.verdict, note: e.note || "", updated_at: e.updated_at };
  write(REVIEWS_KEY, reviews);
}
