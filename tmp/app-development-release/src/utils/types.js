// Shared JSDoc type definitions.
//
// Purpose: the Player / Coach / Team / Session objects are constructed
// inline in 10+ places across App.jsx, screens.jsx, and utils/*. Fields
// drift — sometimes `id+name`, sometimes with `quizHistory`, sometimes
// `iq`, sometimes `__dev`. These typedefs record the agreed shape so
// drift is at least visible (and IDEs can offer completion).
//
// This is JSDoc, not TypeScript — nothing enforces it at build time.
// Reference with:
//     /** @typedef {import("../utils/types").Player} Player */
// or inline:
//     /** @param {import("../utils/types").Player} player */
//
// Addresses AUDIT.md M-15.

// ─── Player ─────────────────────────────────────────────
/**
 * @typedef {Object} Player
 * @property {string} id               Supabase UUID, or `__demo__` / `__preview__` / `__dev__` sentinel
 * @property {string} name             Display name
 * @property {string} level            LEVELS entry, e.g. "U11 / Atom"
 * @property {("Forward"|"Defense"|"Goalie"|"Multiple"|"Not Sure")} position
 * @property {string} [season]         e.g. "2025-26"
 * @property {number} [sessionLength]  Default quiz length
 * @property {boolean} [colorblind]
 * @property {string} [coachCode]      6-char team join code
 * @property {QuizSession[]} quizHistory
 * @property {Object.<string,string>} selfRatings  Keyed by skillId → ladder value
 * @property {Object.<string,Goal>} goals          Keyed by category
 * @property {ParentRatings|null} parentRatings
 * @property {TrainingSession[]} trainingSessions
 * @property {number} [iq]             Computed Game Sense score (coach-roster view only)
 * @property {string} [jersey]         Display jersey number (demo/roster only)
 * @property {string} [team]           Display team name (demo/roster only)
 * @property {boolean} [__dev]         Dev-bypass session marker — skip Supabase writes
 */

// ─── Coach ──────────────────────────────────────────────
/**
 * @typedef {Object} Coach
 * @property {string} id               Supabase UUID, or `__demo_coach__` / `__dev_coach__` sentinel
 * @property {string} name
 * @property {"coach"} role
 * @property {string} [email]
 * @property {string[]} [tilts]        Skill-domain prefixes that bump ratings in that area
 * @property {string} [persona]        Role tag ("Head", "Assistant", "Skills", "Goalie", ...)
 */

// ─── Team ───────────────────────────────────────────────
/**
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} coach_id
 * @property {string} name
 * @property {string} level
 * @property {string} [season]
 * @property {string} code             6-char join code (upper, no ambiguous chars)
 * @property {string} created_at
 */

// ─── Quiz Session ───────────────────────────────────────
/**
 * @typedef {Object} QuizResult
 * @property {string} id               Question id
 * @property {string} cat              Skill category
 * @property {boolean} ok              Correct (or partial→ok collapse for rink)
 * @property {number} d                Difficulty 1–3
 * @property {string} [type]           "mc" | "tf" | "seq" | "mistake" | "next" | "zone-click" | "rink"
 * @property {string} [verdict]        For rink: "correct" | "partial" | "wrong"
 * @property {string} [choice]         Selected option id
 */

/**
 * @typedef {Object} QuizSession
 * @property {string} [id]             Supabase session UUID (not present for LS-only)
 * @property {QuizResult[]} results
 * @property {number} score            0–100
 * @property {number} sessionLength
 * @property {string} [completed_at]
 */

// ─── Ancillary ──────────────────────────────────────────
/**
 * @typedef {Object} Goal
 * @property {string} goal
 * @property {string} S
 * @property {string} M
 * @property {string} A
 * @property {string} R
 * @property {string} T
 * @property {boolean} [completed]
 */

/**
 * @typedef {Object.<string,("rarely"|"sometimes"|"often"|null)>} ParentRatings
 * Keyed by PARENT_DIMENSIONS id; null = "not sure — skip this".
 */

/**
 * @typedef {Object} TrainingSession
 * @property {string} date             YYYY-MM-DD
 * @property {string} type             "ice_time" | "practice" | "off_ice" | "stick_handling" | "video" | ...
 * @property {number} value            Duration or count
 * @property {string} unit             "min" | "reps" | ...
 * @property {string} [label]
 * @property {string} [notes]
 * @property {string} [coach]
 * @property {number} [price]          USD
 */

// Nothing to export — this file exists for its JSDoc side effects only.
// Keeping a named export prevents tree-shaking from dropping it entirely
// in some bundler configurations.
export const __TYPES_MODULE__ = true;
