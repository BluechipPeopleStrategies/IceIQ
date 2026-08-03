// Bound a promise that talks to the network.
//
// Every First-Five write used to be an unbounded `await` sitting in front of a
// navigation. A try/catch handles a REJECTION; it does nothing for a request
// that simply never settles. That is how the "Rate yourself" screen could sit
// on "Saving…" forever with no error, no retry and no way out (SHELL-4 in the
// 2026-08-03 playtest), and why the SMART Goals screen never returned home.
//
// Nothing in the app should ever gate what the user sees on a call that has no
// ceiling. Pair this with a durable local write that happens FIRST, so a
// timeout costs a sync, not the user's work.

export const WRITE_TIMEOUT_MS = 8000;

export function withTimeout(promise, ms = WRITE_TIMEOUT_MS, label = "write") {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
