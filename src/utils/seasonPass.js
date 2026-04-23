// Season pass expiry logic for the Team tier.
//
// Season: September 1 through March 31.
// Hard expiry: April 1 — Team features become read-only (historical data
//   visible, but no new focus areas / no new reports).
// Re-enrollment nudge: August 15 each year, shown once.

import { lsGet, lsSet, lsGetJSON } from "./storage.js";

const KEYS = {
  seasonPass:            "iceiq_season_pass",
  reenrollmentShown:     "iceiq_reenrollment_prompt_shown",
};

function readPass() {
  return lsGetJSON(KEYS.seasonPass, null);
}

/**
 * Compute expiry date (April 1) for the season that contains the given purchase date.
 * A purchase in Sep-Dec of year Y → expires April 1 of year Y+1
 * A purchase in Jan-Mar of year Y → expires April 1 of year Y
 * A purchase in Apr-Aug: treat as next season (Sep of same year → Apr 1 next year)
 */
function computeExpiryFor(purchaseDate) {
  const d = new Date(purchaseDate);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0 = Jan
  let expiryYear;
  if (m >= 8) expiryYear = y + 1;          // Sep-Dec → next calendar year
  else if (m <= 2) expiryYear = y;         // Jan-Mar → current year
  else expiryYear = y + 1;                 // Apr-Aug → treat as next season's pass
  return new Date(Date.UTC(expiryYear, 3, 1)); // April 1 at 00:00 UTC
}

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────

/**
 * Get current season pass status.
 * Returns { active, expiryDate, readOnly }.
 *   active:  pass exists
 *   readOnly: pass exists but today is >= April 1 of expiry year
 */
export function getSeasonPassStatus() {
  const pass = readPass();
  if (!pass || !pass.expiryDate) {
    return { active: false, expiryDate: null, readOnly: false };
  }
  const now = Date.now();
  const expiryMs = new Date(pass.expiryDate).getTime();
  const readOnly = now >= expiryMs;
  return {
    active: true,
    expiryDate: pass.expiryDate,
    purchaseDate: pass.purchaseDate || null,
    readOnly,
  };
}

/**
 * Activate (record) a season pass purchase. If no date provided, uses now.
 * Returns the stored pass record.
 */
export function activateSeasonPass(purchaseDate) {
  const purchase = purchaseDate ? new Date(purchaseDate) : new Date();
  const expiry = computeExpiryFor(purchase);
  const record = {
    purchaseDate: purchase.toISOString(),
    expiryDate: expiry.toISOString(),
  };
  lsSet(KEYS.seasonPass, JSON.stringify(record));
  return record;
}

/**
 * Check whether to show the August 15 re-enrollment prompt.
 * Only triggers on or after Aug 15, and only once per calendar year.
 * Returns { show: boolean, year: number }.
 */
export function checkReenrollmentPrompt() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // Aug = 7
  const day = now.getDate();
  const onOrAfterAug15 = (month > 7) || (month === 7 && day >= 15);
  if (!onOrAfterAug15) return { show: false, year };
  const stored = lsGet(KEYS.reenrollmentShown);
  if (stored === String(year)) return { show: false, year };
  return { show: true, year };
}

/** Mark the re-enrollment prompt as shown for this year. Call after displaying it. */
export function markReenrollmentShown() {
  const year = new Date().getFullYear();
  lsSet(KEYS.reenrollmentShown, String(year));
}

/** Shortcut: is the current Team subscription in read-only mode? */
export function isReadOnly() {
  const { active, readOnly } = getSeasonPassStatus();
  return !!(active && readOnly);
}
