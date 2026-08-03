// Which pre-app screen to render, if any.
//
// Extracted because the old inline rule -- `if (!profile) -> AuthScreen` -- had a
// dead end in it. An authenticated user whose `profiles` row is missing was sent
// back to the signup form, which then told them the email was already
// registered. There was no way out from the UI: the session persisted, so every
// reload landed in the same place, and creating another account did not help
// because the old session was still what loaded.
//
// Three accounts in production are in exactly that state, including the owner's
// own work address. Reproduced on production 2026-08-03 by injecting a valid
// session for one of them: signup screen, session intact, app never renders.
//
// Returns one of:
//   "unconfigured" | "auth" | "finish-setup" | null  (null = render the app)
export function preAppScreen({ hasSupabase, hasSession, hasProfile } = {}) {
  if (!hasSupabase) return "unconfigured";
  if (hasProfile) return null;
  // A session with no profile is recoverable, not a dead end: ask for the two
  // fields `profiles` actually requires and write the row.
  if (hasSession) return "finish-setup";
  return "auth";
}
