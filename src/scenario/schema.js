// Unified scenario schema — JSDoc typedefs + a lightweight runtime validator.
// One schema expresses every interactive question type. Adding a new
// interaction kind = adding one primitive folder + one registry entry.
// This file holds the canonical shape; never edit a primitive's schema
// without bumping the version field on that primitive.

// ─────────────────────────────────────────────────────────────────────────
// COORDINATE SYSTEM
// All actor x/y values are normalized 0–1 — x left-to-right across the rink,
// y top-to-bottom. Renderers convert to the 600×300 RinkReadsRink coord space
// at draw time. This decouples the schema from the rink's internal sizing
// (per SPADL's normalization principle — see ENGINE_RESEARCH for sources).

/**
 * @typedef {"player"|"teammate"|"defender"|"goalie"|"puck"|"text"|"number"} ActorKind
 *
 * @typedef {Object} Actor
 * @property {string} id            // unique within scenario, referenced by interactions
 * @property {ActorKind} kind
 * @property {number} x             // 0..1 normalized
 * @property {number} y             // 0..1 normalized
 * @property {string} [tag]         // short label rendered ON the marker ("YOU", "C", "RD")
 * @property {string} [label]       // optional caption ABOVE the marker (rare callouts)
 * @property {{x:number,y:number}} [facing]  // optional point this actor's stick points toward (normalized 0..1)
 */

// ─────────────────────────────────────────────────────────────────────────
// STAGE (camera + rink overlay)

/**
 * @typedef {Object} Stage
 * @property {"full"|"left"|"right"|"neutral"} view
 * @property {"def-zone"|"neutral"|"off-zone"} [zone]   // optional semantic tag
 */

// ─────────────────────────────────────────────────────────────────────────
// SPADL-STYLE ACTION VERBS — first-class on every path interaction.
// Validated by SPADL (soccer) + FastDraw (basketball/hockey) — typed verbs
// are a battle-tested authoring shape across sports.

/**
 * @typedef {"skate"|"carry"|"pass"|"shoot"|"screen"|"check"|"backcheck"} ActionVerb
 */

// ─────────────────────────────────────────────────────────────────────────
// SEMANTIC ZONES — referenced by id, resolved to coords at scoring time.
// Authors and the LLM use zone IDs (e.g. "oz-slot", "dz-corner-strong") so
// they don't have to guess pixel coordinates. Numeric coords still win as
// ground truth when supplied.

/**
 * @typedef {Object} ZoneTarget
 * @property {string} zoneId        // e.g. "oz-slot", "neutral-strong"
 * @property {number} [tolerance]   // 0..1 of rink width; default 0.08
 */

/**
 * @typedef {Object} PointTarget
 * @property {number} x             // 0..1
 * @property {number} y             // 0..1
 * @property {number} [tolerance]   // 0..1 of rink width; default 0.05
 */

// ─────────────────────────────────────────────────────────────────────────
// FOUR INTERACTION PRIMITIVES.
// Validated by ed-tech (Khan Perseus widgets, Lichess solution-as-list)
// and sports (SPADL action stream, StatsBomb freeze-frame, FastDraw frame
// timeline). See ENGINE_RESEARCH for citations.
//
// 1) point     — user produces a single (x,y) or zone-id
// 2) path      — user draws an ordered list of points (with verb)
// 3) selection — user picks 1..N items from a candidate set
// 4) sequence  — ordered list of the above (composed; e.g. screen-and-roll)

/** @typedef {{kind:"point"} & PointTarget | {kind:"point"} & ZoneTarget} PointAnswer */

/**
 * @typedef {Object} PathInteraction
 * @property {"path"} kind
 * @property {ActionVerb} verb       // SPADL verb — drives the visual + scoring
 * @property {string} from           // actor id the path starts from
 * @property {string} prompt         // visible question text
 * @property {Array<PointTarget|ZoneTarget>} [waypoints]  // optional intermediate points
 */

/**
 * @typedef {Object} PathAnswer
 * @property {"path"} kind
 * @property {PointTarget|ZoneTarget} end   // where the path must terminate
 * @property {Array<PointTarget|ZoneTarget>} [waypoints]
 */

/**
 * @typedef {Object} PointInteraction
 * @property {"point"} kind
 * @property {string} prompt
 */

/**
 * @typedef {Object} SelectionInteraction
 * @property {"selection"} kind
 * @property {string} prompt
 * @property {string[]} from         // actor ids (or zone ids) selectable
 * @property {"any"|"ordered"} order
 */

/**
 * @typedef {Object} SelectionAnswer
 * @property {"selection"} kind
 * @property {string[]} ids          // correct actor/zone ids
 */

/**
 * @typedef {Object} SequenceInteraction
 * v1 sequences are ordered selections — user taps actors in order. Same
 * shape as SelectionInteraction with `order` implicitly "ordered".
 * Future v2 will support compositional sequences (pick → drag → tap).
 *
 * @property {"sequence"} kind
 * @property {string} prompt
 * @property {string[]} from              // candidate actor ids
 */

/**
 * @typedef {Object} SequenceAnswer
 * @property {"sequence"} kind
 * @property {string[]} ids               // expected order
 */

/**
 * @typedef {Object} Feedback
 * @property {string} right
 * @property {string} wrong
 * @property {string} [partial]
 */

/**
/**
 * @typedef {Object} TimerSpec
 * @property {number} duration   // milliseconds before the scenario auto-fails
 * @property {boolean} [hard]    // true = lock + fail on expire (default true)
 */

/**
 * @typedef {Object} ScanWindow
 * IntelliGym working-memory drill. Show the full scene for `showMs`, then
 * hide actors of the listed kinds (typically "defender") so the player
 * must REMEMBER where the pressure was when picking the right read.
 *
 * @property {number} showMs                     // visible duration before hide
 * @property {Array<"teammate"|"defender"|"goalie"|"puck">} [hideKinds]
 */

/**
 * @typedef {Object} PreviewWindow
 * IntelliGym pattern-recognition drill. Lock interaction for `lockMs`
 * before allowing input — forces the player to read the play before
 * they can act, training visual scanning + anticipation. Pairs with timer.
 *
 * @property {number} lockMs                     // interaction is disabled this long
 */

/**
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {"scenario"} type        // discriminator from legacy types in the bank
 * @property {string[]} [themes]      // tag layer (Lichess pattern); orthogonal to geometry
 * @property {string} cat
 * @property {1|2|3} [difficulty]
 * @property {Stage} stage
 * @property {Actor[]} actors
 * @property {PathInteraction|PointInteraction|SelectionInteraction|SequenceInteraction} interaction
 * @property {PathAnswer|PointAnswer|SelectionAnswer} correct
 * @property {Feedback} feedback
 * @property {string} [tip]
 * @property {string} [why]
 * @property {string[]} [levels]      // multi-age expansion, mirrors existing bank field
 * @property {TimerSpec} [timer]      // IntelliGym-style hard timer
 * @property {ScanWindow} [scanWindow]// IntelliGym working-memory drill
 * @property {PreviewWindow} [preview]// IntelliGym pattern-recognition lock
 */

import { ZONES } from "./zones.js";
import { runHockeyValidators } from "./validators.js";

// ─────────────────────────────────────────────────────────────────────────
// Lightweight validator. Throws on hard schema errors; returns warnings
// for soft issues (clipped coords, unknown zone ids, etc.).
// Hockey-logic + UX-sanity rules live in ./validators.js so this file
// stays scoped to schema shape.

const VALID_VIEWS = new Set(["full", "left", "right", "neutral"]);
const VALID_ACTOR_KINDS = new Set(["player", "teammate", "defender", "goalie", "puck", "text", "number"]);
const VALID_VERBS = new Set(["skate", "carry", "pass", "shoot", "screen", "check", "backcheck"]);
const VALID_INTERACTION_KINDS = new Set(["point", "path", "selection", "sequence"]);

// Mirror the path primitive's interception threshold so the validator
// rejects scenarios the engine itself would call wrong.
const VALIDATOR_INTERCEPT_RADIUS = 0.035;

function lineHitsCircle(a, b, c, r) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  const px = a.x + t * dx, py = a.y + t * dy;
  const d = Math.sqrt((c.x - px) ** 2 + (c.y - py) ** 2);
  return d < r;
}

export function validateScenario(s) {
  const errs = [];
  const warns = [];
  if (!s || typeof s !== "object") return { ok: false, errs: ["scenario is not an object"], warns };
  if (s.type !== "scenario") errs.push(`type must be "scenario", got ${JSON.stringify(s.type)}`);
  if (!s.id) errs.push("missing id");
  if (!s.stage || !VALID_VIEWS.has(s.stage.view)) errs.push(`stage.view must be one of ${[...VALID_VIEWS].join("|")}`);
  if (!Array.isArray(s.actors)) errs.push("actors must be an array");
  else {
    const seenIds = new Set();
    for (let i = 0; i < s.actors.length; i++) {
      const a = s.actors[i];
      if (!a || typeof a !== "object") { errs.push(`actors[${i}] not an object`); continue; }
      if (!a.id) errs.push(`actors[${i}] missing id`);
      else if (seenIds.has(a.id)) errs.push(`duplicate actor id "${a.id}"`);
      else seenIds.add(a.id);
      if (!VALID_ACTOR_KINDS.has(a.kind)) errs.push(`actors[${i}] invalid kind "${a.kind}"`);
      if (typeof a.x !== "number" || a.x < 0 || a.x > 1) warns.push(`actors[${i}] x=${a.x} out of [0,1]`);
      if (typeof a.y !== "number" || a.y < 0 || a.y > 1) warns.push(`actors[${i}] y=${a.y} out of [0,1]`);
    }
  }
  if (!s.interaction || !VALID_INTERACTION_KINDS.has(s.interaction.kind)) {
    errs.push(`interaction.kind must be one of ${[...VALID_INTERACTION_KINDS].join("|")}`);
  } else if (s.interaction.kind === "path") {
    if (!VALID_VERBS.has(s.interaction.verb)) errs.push(`interaction.verb invalid: ${s.interaction.verb}`);
    if (!s.interaction.from) errs.push("path interaction requires from (actor id)");
  }
  if (!s.correct || s.correct.kind !== s.interaction?.kind) {
    errs.push("correct.kind must match interaction.kind");
  }
  if (!s.feedback || typeof s.feedback.right !== "string" || typeof s.feedback.wrong !== "string") {
    errs.push("feedback.right and feedback.wrong are required strings");
  }

  // Authoring sanity check: for path interactions, reject scenarios where
  // the straight-line correct answer would be intercepted by a defender.
  // The runtime scorer would mark the user wrong for that pass, so
  // declaring it correct would be self-contradictory.
  if (s.interaction?.kind === "path" && s.correct?.kind === "path" && Array.isArray(s.actors)) {
    try {
      const fromActor = s.actors.find(a => a && a.id === s.interaction.from);
      const endTarget = s.correct.end;
      if (fromActor && endTarget) {
        // Resolve target inline (avoid circular import to zones.js).
        let endXY = null;
        if (typeof endTarget.x === "number" && typeof endTarget.y === "number") {
          endXY = { x: endTarget.x, y: endTarget.y };
        } else if (typeof endTarget.zoneId === "string" && ZONES[endTarget.zoneId]) {
          const z = ZONES[endTarget.zoneId];
          endXY = { x: z.x, y: z.y };
        }
        if (endXY) {
          const defenders = s.actors.filter(a => a && a.kind === "defender");
          for (const def of defenders) {
            if (lineHitsCircle(fromActor, endXY, def, VALIDATOR_INTERCEPT_RADIUS)) {
              errs.push(`correct path is intercepted by defender "${def.id}" — author the scene so the right answer has a clean lane`);
              break;
            }
          }
        }
      }
    } catch { /* best-effort — never crash the validator */ }
  }

  // Hockey-logic + UX-sanity layer. Only runs if the shape pass had no
  // errors, since those rules assume a structurally valid scenario.
  if (errs.length === 0) {
    const layered = runHockeyValidators(s);
    errs.push(...layered.errs);
    warns.push(...layered.warns);
  }

  return { ok: errs.length === 0, errs, warns };
}

// Convert normalized 0..1 coords to the RinkReadsRink 600×300 viewBox.
export const RINK_W = 600;
export const RINK_H = 300;
export function denorm(p) {
  return { x: p.x * RINK_W, y: p.y * RINK_H };
}
export function denormR(r) { return r * RINK_W; }
