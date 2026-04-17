// Single source of truth for feature gating across IceIQ.
// Every feature check in the app should go through canAccess().

import { TIERS } from "../config/pricing";
import * as deviceLock from "./deviceLock";
import * as profiles from "./profiles";
import { isReadOnly as seasonIsReadOnly } from "./seasonPass";

const FEATURE_KEYS = [
  "multipleAgeGroups",
  "allQuestionFormats",
  "positionFilter",
  "adaptiveEngine",
  "smartGoals",
  "progressSnapshots",
  "fullSessionHistory",
  "coachDashboard",
  "additionalProfiles",
  "weeklyChallenge",
];

// Per-tier allow list — what each tier can access.
// Anything not listed is denied.
const TIER_FEATURES = {
  FREE: new Set([
    "positionFilter",
  ]),
  PRO: new Set([
    "multipleAgeGroups",
    "allQuestionFormats",
    "positionFilter",
    "adaptiveEngine",
    "smartGoals",
    "progressSnapshots",
    "fullSessionHistory",
    "weeklyChallenge",
  ]),
  FAMILY: new Set([
    "multipleAgeGroups",
    "allQuestionFormats",
    "positionFilter",
    "adaptiveEngine",
    "smartGoals",
    "progressSnapshots",
    "fullSessionHistory",
    "additionalProfiles",
    "weeklyChallenge",
  ]),
  TEAM: new Set([
    "multipleAgeGroups",
    "allQuestionFormats",
    "positionFilter",
    "adaptiveEngine",
    "smartGoals",
    "progressSnapshots",
    "fullSessionHistory",
    "coachDashboard",
    "weeklyChallenge",
    // Team tier typically has a single coach-owned workspace, not additional child profiles
  ]),
};

// When a feature is denied, which tier should the user upgrade to?
const UPGRADE_TARGET = {
  multipleAgeGroups:   "pro",
  allQuestionFormats:  "pro",
  positionFilter:      "pro",
  adaptiveEngine:      "pro",
  smartGoals:          "pro",
  progressSnapshots:   "pro",
  fullSessionHistory:  "pro",
  additionalProfiles:  "family",
  coachDashboard:      "team",
  weeklyChallenge:     "pro",
};

const UPGRADE_MESSAGES = {
  multipleAgeGroups:   "Access all age groups with IceIQ Pro",
  allQuestionFormats:  "Unlock every question format with IceIQ Pro",
  positionFilter:      "Filter questions by position with IceIQ Pro",
  adaptiveEngine:      "Let IceIQ adapt to your level with Pro",
  smartGoals:          "Set SMART development goals with IceIQ Pro",
  progressSnapshots:   "See full progress snapshots with IceIQ Pro",
  fullSessionHistory:  "Unlock full session history with IceIQ Pro",
  additionalProfiles:  "Add up to 3 players with the Family plan",
  coachDashboard:      "Track your full roster with IceIQ Team",
  weeklyChallenge:     "Compete in weekly challenges with IceIQ Pro",
};

// ─────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────

/**
 * Return the user's current tier as a normalized key: "FREE" | "PRO" | "FAMILY" | "TEAM".
 * Falls back to FREE if nothing is passed or stored.
 */
export function getCurrentTier(explicit) {
  if (explicit) {
    if (typeof explicit === "string") {
      const key = explicit.toUpperCase();
      if (TIERS[key]) return key;
    } else if (explicit.name) {
      const key = explicit.name.toUpperCase();
      if (TIERS[key]) return key;
    }
  }
  // No persisted-tier infrastructure yet — default to FREE.
  // When subscription management ships, read from localStorage or server here.
  return "FREE";
}

/**
 * Check whether the current user (at `currentTier`) can access `feature`.
 *
 * Returns: { allowed: boolean, reason: string, upgradeTarget: string|null, readOnly?: boolean, extra?: object }
 *   - readOnly: true when the user has access but the Team season pass has expired
 *     (coach can view history, cannot take new actions)
 */
export function canAccess(feature, currentTier) {
  const tier = getCurrentTier(currentTier);

  // Unknown feature → deny fail-safe
  if (!FEATURE_KEYS.includes(feature)) {
    return { allowed: false, reason: "unknown_feature", upgradeTarget: null };
  }

  const tierSet = TIER_FEATURES[tier] || TIER_FEATURES.FREE;
  const allowed = tierSet.has(feature);

  // Team tier read-only: allow access but flag it for the UI
  let readOnly = false;
  if (allowed && tier === "TEAM" && seasonIsReadOnly()) {
    readOnly = true;
  }

  if (!allowed) {
    return {
      allowed: false,
      reason: "upgrade_required",
      upgradeTarget: UPGRADE_TARGET[feature] || null,
    };
  }

  // Special-case: additionalProfiles also gated by actual profile count
  if (feature === "additionalProfiles") {
    const existing = profiles.getProfiles().length;
    const limit = profiles.getProfileLimit(tier);
    if (existing >= limit) {
      return {
        allowed: false,
        reason: "profile_limit_reached",
        upgradeTarget: limit < 3 ? "family" : null,
        extra: { currentCount: existing, limit },
      };
    }
  }

  // Special-case: multipleAgeGroups also affected by the device-lock switch counter
  // for FREE tier. (FREE doesn't allow multipleAgeGroups at all — this is a belt-and-suspenders
  // check for when paid tiers call the same utility.)
  if (feature === "multipleAgeGroups" && tier === "FREE") {
    const lockStatus = deviceLock.canSwitchAgeGroup();
    if (!lockStatus.allowed) {
      return {
        allowed: false,
        reason: "device_lock_reached",
        upgradeTarget: "pro",
        extra: lockStatus,
      };
    }
  }

  return { allowed: true, reason: "ok", upgradeTarget: null, readOnly };
}

/** Get the upgrade prompt message for a given feature. */
export function getUpgradeTriggerMessage(feature) {
  return UPGRADE_MESSAGES[feature] || "Upgrade IceIQ to unlock this feature";
}

/** List of all gated feature keys (useful for admin/debug views). */
export const GATED_FEATURES = [...FEATURE_KEYS];
