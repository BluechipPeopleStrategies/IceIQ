// Deterministic gate (G1-G3) for generated text-MC questions. No solver — for
// text MC the geometric solver does not apply (see playSolver.js); this gate
// enforces structure + assessment-integrity + dedupe. Pure + unit-tested.
import { createHash } from "node:crypto";

export const LEVELS = [
  "U7 / Initiation", "U9 / Novice", "U11 / Atom",
  "U13 / Peewee", "U15 / Bantam", "U18 / Midget",
];
const LEVEL_SET = new Set(LEVELS);

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

// Structural signature for dedupe: normalized stem + sorted normalized options.
// Two questions with the same stem and same option set collide regardless of
// option order or the correct index.
export function structuralHash(q) {
  const opts = (Array.isArray(q.opts) ? q.opts : []).map(norm).sort();
  return createHash("sha1").update(norm(q.sit) + "|" + opts.join("|")).digest("hex").slice(0, 16);
}

// validateMC(question, { seen }) -> { ok, errs }
// `seen` is an optional Set of structuralHash strings already accepted.
export function validateMC(q, { seen } = {}) {
  const errs = [];
  if (!q || typeof q !== "object") return { ok: false, errs: ["not an object"] };

  if (q.type && q.type !== "mc") errs.push(`type must be "mc" (got "${q.type}")`);
  if (typeof q.id !== "string" || !q.id.trim()) errs.push("id required");
  if (typeof q.nodeId !== "string" || !q.nodeId.includes(".")) errs.push("nodeId required (e.g. u11.passing)");

  const sit = typeof q.sit === "string" ? q.sit.trim() : "";
  if (sit.length < 20) errs.push("sit (stem) must be >= 20 chars");

  const opts = Array.isArray(q.opts) ? q.opts : null;
  if (!opts) errs.push("opts must be an array");
  else {
    if (opts.length < 3 || opts.length > 4) errs.push(`opts must have 3-4 entries (got ${opts.length})`);
    if (opts.some((o) => typeof o !== "string" || !o.trim())) errs.push("every option must be a non-empty string");
    const normed = opts.map(norm);
    if (new Set(normed).size !== normed.length) errs.push("options must be distinct");
    // Assessment-integrity: the correct option must not be a length outlier
    // (a classic "longest answer is correct" tell).
    if (typeof q.ok === "number" && opts[q.ok]) {
      const lens = opts.map((o) => o.length);
      const others = lens.filter((_, i) => i !== q.ok);
      const meanOther = others.reduce((a, b) => a + b, 0) / Math.max(1, others.length);
      if (lens[q.ok] > 1.8 * meanOther && lens[q.ok] - meanOther > 25) {
        errs.push("correct option is a length outlier (too long vs distractors)");
      }
    }
  }

  if (!Number.isInteger(q.ok)) errs.push("ok must be an integer index");
  else if (opts && (q.ok < 0 || q.ok >= opts.length)) errs.push(`ok index ${q.ok} out of range`);

  const explain = typeof q.explain === "string" ? q.explain.trim() : "";
  if (explain.length < 15) errs.push("explain must be >= 15 chars");

  if (q.levels !== undefined) {
    if (!Array.isArray(q.levels) || q.levels.length === 0) errs.push("levels, if present, must be a non-empty array");
    else for (const l of q.levels) if (!LEVEL_SET.has(l)) errs.push(`unknown level "${l}"`);
  }

  if (seen && opts && errs.length === 0) {
    const h = structuralHash(q);
    if (seen.has(h)) errs.push("duplicate of an existing question (structural hash)");
  }

  return { ok: errs.length === 0, errs };
}
