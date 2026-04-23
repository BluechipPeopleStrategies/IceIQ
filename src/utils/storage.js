// Single source of truth for localStorage access.
//
// Every browser-storage read/write in the app should come through one of
// these helpers. They all guard the `window` global (so SSR/node callers
// don't crash) and swallow storage exceptions (quota, privacy mode, corrupted
// JSON) so a misbehaving browser can't take down the render tree.
//
// Naming matches the helpers that already lived inline in App.jsx — strings
// use `Str`, JSON-encoded values use `JSON`. Writes return void; reads return
// `null` (string) or the provided fallback (JSON).

function hasLS() {
  try { return typeof window !== "undefined" && !!window.localStorage; }
  catch { return false; }
}

/** Read a raw string value. Returns null on miss or any failure. */
export function lsGetStr(key) {
  if (!hasLS()) return null;
  try { return window.localStorage.getItem(key); }
  catch { return null; }
}

/** Write a raw string value. Silently drops on quota/privacy failure. */
export function lsSetStr(key, value) {
  if (!hasLS()) return;
  try { window.localStorage.setItem(key, value); }
  catch {}
}

/** Remove a key. Silent on failure. */
export function lsRemove(key) {
  if (!hasLS()) return;
  try { window.localStorage.removeItem(key); }
  catch {}
}

/**
 * Read a JSON-encoded value. Returns the parsed value on success,
 * or `fallback` for missing keys, parse errors, or any other failure.
 * Callers should always pass a fallback that matches the expected shape.
 */
export function lsGetJSON(key, fallback) {
  if (!hasLS()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

/** Write a JSON-encoded value. Silent on failure. */
export function lsSetJSON(key, value) {
  if (!hasLS()) return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); }
  catch {}
}

// Aliases — some call sites prefer the short form without the Str suffix
// for raw strings. Both resolve to the same function.
export const lsGet = lsGetStr;
export const lsSet = lsSetStr;
