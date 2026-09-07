// Surviving a deploy that lands while the app is open.
//
// Vite emits content-hashed chunks and a deploy removes the previous ones. A
// browser holding a page from the old build therefore 404s the moment it tries
// to open a lazy screen it had not already fetched -- the dynamic import
// rejects, and React's error boundary shows "Something went wrong".
//
// Observed in production 2026-08-03 after four deploys in an afternoon:
//   screens-erD1H7zd.js:1  Failed to load resource: 404
// which reached the user as a crash on "Rate yourself on 6 skills" and again on
// signup. It looks account-specific but is not: it happens to anyone whose tab
// predates the current deploy, which for an active beta is most people.
//
// The right response is to reload once, because the page itself is stale. The
// guard stops that becoming a refresh loop when the chunk is genuinely gone.

export const RELOAD_GUARD_MS = 10_000;

export function isChunkLoadError(err) {
  if (!err) return false;
  if (err.name === "ChunkLoadError") return true;
  const msg = String(err.message || err);
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);
}

export function shouldReloadForChunkError({ now, lastReloadAt } = {}) {
  if (!Number.isFinite(lastReloadAt)) return true;
  return now - lastReloadAt > RELOAD_GUARD_MS;
}
