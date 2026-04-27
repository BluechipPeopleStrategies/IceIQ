// In-browser question overrides — quick edits that apply on top of the
// bank questions without requiring a sync. Persisted to localStorage so
// edits survive a page refresh.
//
// Shape: { [questionId]: { sit?, q?, opts?, ok?, tip?, why? } }
//
// The Quiz wraps every question through `applyOverride(q)` so display +
// scoring use the latest edit. Edits do NOT auto-sync back to Notion or
// questions.json — use `getAllOverrides()` to export them later.

const LS_KEY = "rinkreads_question_overrides_v1";

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

export function getOverride(id) {
  if (!id) return null;
  const all = readAll();
  return all[id] || null;
}

export function setOverride(id, patch) {
  if (!id || !patch) return;
  const all = readAll();
  const prev = all[id] || {};
  // Strip empty/undefined fields so the override stays minimal
  const merged = { ...prev };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null || v === "") delete merged[k];
    else merged[k] = v;
  }
  if (Object.keys(merged).length === 0) {
    delete all[id];
  } else {
    all[id] = merged;
  }
  writeAll(all);
}

export function clearOverride(id) {
  if (!id) return;
  const all = readAll();
  if (all[id]) { delete all[id]; writeAll(all); }
}

export function getAllOverrides() {
  return readAll();
}

export function clearAllOverrides() {
  writeAll({});
}

// Apply override on top of a question. Returns a NEW object — does not
// mutate the input. Returns the original `q` if no override exists.
export function applyOverride(q) {
  if (!q || !q.id) return q;
  const o = getOverride(q.id);
  if (!o) return q;
  return { ...q, ...o, _hasOverride: true };
}
