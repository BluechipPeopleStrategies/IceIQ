// Remember which screen the player was on, so a reload does not send them Home.
//
// `screen` is in-memory React state with no URL routing behind it (the only
// hash routes are the public marketing pages). So ANY reload, from anywhere,
// returned to Home — which is why the error boundary's own Reload button always
// lost your place, and why the Daily Drill crash felt total rather than local:
// the crash dumped you out, and the recovery dumped you again.
//
// Three rules, and each one exists because the naive version is wrong:
//
// 1. STRINGS ONLY. `screen` can also be an object carrying live data —
//    {kind:"qotd", question}, {kind:"rate", player}, {kind:"challenge",
//    challenge}. Those payloads cannot survive a reload, and restoring the kind
//    without them is exactly the crash that was just fixed. An object screen
//    CLEARS the memory rather than writing a half-record.
//
// 2. STABLE DESTINATIONS ONLY. Restoring `quiz` would drop the player into a
//    fresh quiz having lost the one they were in — worse than Home, because it
//    looks like their progress was thrown away rather than simply forgotten.
//    Same for results, which describe a session that no longer exists. The
//    allow-list is places it is safe to arrive at cold.
//
// 3. sessionStorage, NOT localStorage. This should survive a reload or a crash,
//    not a week. Coming back tomorrow should start at Home.

const KEY = "rinkreads_last_screen_v1";

// Screens that mean something when you arrive at them with no prior context.
// Deliberately excludes: quiz, weekly, results (in-progress or spent sessions),
// password-reset and the admin/marketing routes (reached deliberately, and the
// auth ones must not be restorable at all).
export const RESTORABLE = new Set([
  "home", "profile", "report", "study", "training", "insights",
  "challenges", "goals", "skills", "readplay", "cogym", "gamesense",
  "journey", "path", "question-review", "parent",
]);

export function rememberScreen(screen, storage = safeSession()) {
  if (!storage) return;
  try {
    if (typeof screen !== "string" || !RESTORABLE.has(screen)) {
      storage.removeItem(KEY);
      return;
    }
    storage.setItem(KEY, screen);
  } catch { /* private mode, quota — never break navigation over this */ }
}

export function recallScreen(storage = safeSession()) {
  if (!storage) return null;
  try {
    const v = storage.getItem(KEY);
    return v && RESTORABLE.has(v) ? v : null;
  } catch {
    return null;
  }
}

export function forgetScreen(storage = safeSession()) {
  if (!storage) return;
  try { storage.removeItem(KEY); } catch { /* ignore */ }
}

function safeSession() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null; // sessionStorage throws outright in some privacy modes
  }
}
