// Pure helpers for the dev-bypass playtest feedback widget. No DOM, no network,
// so they are unit-testable in plain Node.

// Feedback categories shown as chips. First is the default selection.
export const CATEGORIES = ["bug", "idea", "difficulty", "art-visual", "copy"];

export function isCategory(x) {
  return CATEGORIES.includes(x);
}

// Trim and cap a note. Returns null for empty/whitespace or non-strings.
export function sanitizeNote(note, max = 2000) {
  if (typeof note !== "string") return null;
  const t = note.trim();
  if (!t) return null;
  return t.slice(0, max);
}

// Build the normalized context blob stored with a feedback note. The caller
// passes values in (no DOM access here). Empty/invalid fields are omitted.
export function buildFeedbackContext({
  screen, drillTitle, version, viewport, userAgent, nowIso,
} = {}) {
  const ctx = {};
  if (screen) ctx.screen = String(screen);
  if (drillTitle) ctx.drill = String(drillTitle);
  if (version) ctx.appVersion = String(version);
  if (viewport && Number.isFinite(viewport.w) && Number.isFinite(viewport.h)) {
    ctx.viewport = { w: Math.round(viewport.w), h: Math.round(viewport.h) };
  }
  if (userAgent) ctx.userAgent = String(userAgent);
  if (nowIso) ctx.at = String(nowIso);
  return ctx;
}
