import { mergeQueue } from "./reviewCore.js";
import { upsertScenarioReview, listMyReviews, listFeedbackLog } from "../supabase.js";

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
  // 1. Drop any local verdict/note for a board that's since been RESOLVED — its note
  //    is captured in the pass-log (feedback_log), so the board comes back clean for a
  //    fresh look. feedback_log is readable without a session, so this ALSO reconciles
  //    dev-bypass / offline sessions that can't authoritatively pull per-user reviews.
  //    Only clears entries saved BEFORE the resolution (a re-review afterward is kept).
  try {
    const log = await listFeedbackLog();
    const resolvedAt = {};
    for (const r of log || []) {
      const t = r.created_at || "";
      if (!resolvedAt[r.scenario_id] || t > resolvedAt[r.scenario_id]) resolvedAt[r.scenario_id] = t;
    }
    const local = read(REVIEWS_KEY, {});
    let lc = false;
    for (const id of Object.keys(local)) {
      const ra = resolvedAt[id];
      if (ra && (local[id].updated_at || "") < ra) { delete local[id]; lc = true; }
    }
    if (lc) write(REVIEWS_KEY, local);
    const queue = read(QUEUE_KEY, []);
    const kept = queue.filter((e) => { const ra = resolvedAt[e.scenario_id]; return !(ra && (e.updated_at || "") < ra); });
    if (kept.length !== queue.length) write(QUEUE_KEY, kept);
  } catch { /* ignore — keep local cache on any fetch error */ }

  // 2. When signed in, rebuild the durable map authoritatively from the server.
  const { ok, rows } = await listMyReviews();
  if (!ok) return;
  const reviews = {};
  for (const r of rows) reviews[r.scenario_id] = { verdict: r.verdict, note: r.note || "", updated_at: r.updated_at };
  for (const e of read(QUEUE_KEY, [])) reviews[e.scenario_id] = { verdict: e.verdict, note: e.note || "", updated_at: e.updated_at };
  write(REVIEWS_KEY, reviews);
}
