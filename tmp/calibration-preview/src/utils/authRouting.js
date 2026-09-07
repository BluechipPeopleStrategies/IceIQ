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
// `probe` is what separates the two DIFFERENT states that both look like
// "session, no profile", and getting them confused is not cosmetic:
//
//   "pending" — we have not finished looking. This is every brand-new signup:
//               SIGNED_IN fires DURING supabase.auth.signUp(), before signUp()
//               has even started the profiles write, so the very first render
//               after creating an account has a session and no profile row.
//   "missing" — we looked until the retry budget ran out. The row is genuinely
//               absent. This is the stranded-account case the screen exists for.
//
// Without this distinction every new signup was shown "Finish setting up your
// account" for a moment, and a coach who completed it during that window had
// their role overwritten as `player` by the recovery write racing the signup
// write. Showing a form while a query is still in flight was the bug; the
// answer is to show nothing yet.
//
// Defaults to "missing" so a caller that does not know still gets the
// recovery screen rather than being bounced to auth — the dead end this
// module was extracted to prevent stays prevented.
//
// Returns one of:
//   "unconfigured" | "auth" | "loading" | "finish-setup" | null  (null = render the app)
export function preAppScreen({ hasSupabase, hasSession, hasProfile, probe = "missing" } = {}) {
  if (!hasSupabase) return "unconfigured";
  if (hasProfile) return null;
  // A session with no profile is recoverable, not a dead end: ask for the two
  // fields `profiles` actually requires and write the row — but only once we
  // know the row is really absent.
  if (hasSession) return probe === "pending" ? "loading" : "finish-setup";
  return "auth";
}
