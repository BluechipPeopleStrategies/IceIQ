// src/play/artLint.js
// Deterministic visual-legibility lint for animated plays: the enforcement
// engine for docs/play-kernel-standards.md's art rules, computable from play
// data in rink feet (200x85) with no renderer and no tokens. Layer 1 of the
// art-QC design (docs/superpowers/specs/2026-07-21-art-qc-autolearning-design.md).
//
// Every rule carries provenance: the standard or art-lessons ledger entry it
// encodes. New lessons are promoted here as new rules + a golden case in
// scripts/test-art-lint.mjs — that promotion loop, not any single rule, is
// what makes art QC self-improving.

import { answerTarget, primaryAskNode } from "./noveltyGate.js";

// Thresholds calibrated against the hand-approved live catalog (2026-07-21):
// intentional contact (a check finishing on the carrier in a terminal node)
// stays legal; unreadable freezes and covering labels do not.
export const TOKEN_BLOCK_FT = 3.5; // decision freeze: tokens visually merge
export const TOKEN_WARN_FT = 6; // decision freeze: tight enough to review
export const TOKEN_STACKED_FT = 2; // any node: exactly stacked tokens look broken
export const CUE_BLOCK_FT = 3; // label sits ON the actor
export const CUE_WARN_FT = 5; // label crowds the actor
export const LEAK_RADIUS_FT = 6; // an arrow ending this close to the answer leaks it
export const PUCK_TETHER_FT = 8; // puck farther than this from the carrier reads adrift
export const MAX_CUE_LABEL_CHARS = 12; // Cue Label Size Rule (U13 and under)

const SHEET = { minX: 0, maxX: 200, minY: 0, maxY: 85 };

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function inBounds(p) {
  return p[0] >= SHEET.minX && p[0] <= SHEET.maxX && p[1] >= SHEET.minY && p[1] <= SHEET.maxY;
}

function isYoungBand(play) {
  return (play.ageBands || []).some((b) => ["U7", "U9", "U11", "U13"].includes(b));
}

// The string a young-band player actually SEES in the cue pill. This must stay
// in lockstep with cueLabelForAge() in AnimatedPlay.jsx — the lint used to
// measure cue.label while the renderer drew youngLabel, so a 30-char youngLabel
// paired with a short label passed the Cue Label Size Rule and then overflowed
// the pill on screen (S2-18, 2026-08-03). Measure what renders, not what the
// authoring data happens to call the canonical form.
export function renderedCueLabel(cue) {
  if (!cue) return "";
  return cue.youngLabel || cue.label || cue.shortLabel || "";
}

// Collect every [x, y] a node puts on the ice, labeled by what it is.
function nodePoints(node) {
  const pts = [];
  for (const key of ["enter", "pos"]) {
    for (const [actorId, p] of Object.entries(node[key] || {})) {
      if (Array.isArray(p)) pts.push({ kind: key, id: actorId, p });
    }
  }
  if (Array.isArray(node.puck)) pts.push({ kind: "puck", id: "puck", p: node.puck });
  if (Array.isArray(node.enterPuck)) pts.push({ kind: "puck", id: "enterPuck", p: node.enterPuck });
  return pts;
}

// The lint. Returns { blocks: [finding], warns: [finding] } where a finding is
// { rule, nodeId, detail }. Provenance lives on RULES for reporting.
export const RULES = {
  "token-overlap": { severity: "block", source: "play-kernel-standards.md Freeze-Point Rules" },
  "out-of-bounds": { severity: "block", source: "rink space 200x85; validators bound data, this bounds every drawn point" },
  "cue-covers-actor": { severity: "block", source: "play-kernel-standards.md Cue Label Size Rule" },
  "cue-label-length": { severity: "warn", source: "play-kernel-standards.md Cue Label Size Rule" },
  "answer-leak-arrow": { severity: "block", source: "play-kernel-standards.md Answer-Reveal / Question Reveal Rules" },
  "answer-leak-cue": { severity: "block", source: "play-kernel-standards.md Route-Choice Neutrality Rule" },
  "puck-adrift": { severity: "warn", source: "play-kernel-standards.md Freeze-Point Rules (puck visible, decision actor clear)" },
};

export function artLint(play) {
  const blocks = [];
  const warns = [];
  const add = (rule, nodeId, detail) => {
    (RULES[rule].severity === "block" ? blocks : warns).push({ rule, nodeId, detail });
  };
  const young = isYoungBand(play);
  const target = answerTarget(play);
  const askNode = primaryAskNode(play);

  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    // out-of-bounds: every drawn point stays on the sheet
    for (const pt of nodePoints(node)) {
      if (!inBounds(pt.p)) add("out-of-bounds", nodeId, `${pt.kind}:${pt.id} at ${pt.p.join(",")}`);
    }
    for (const m of node.motions || []) {
      for (const key of ["from", "to"]) {
        if (Array.isArray(m[key]) && !inBounds(m[key])) add("out-of-bounds", nodeId, `motion ${key} ${m[key].join(",")}`);
      }
    }

    // token-overlap: the decision freeze must be readable; terminal contact
    // (a finished check/block) is legal unless tokens are exactly stacked.
    const isAsk = !!node.ask;
    const settled = Object.entries(node.pos || {}).filter(([, p]) => Array.isArray(p));
    for (let i = 0; i < settled.length; i += 1) {
      for (let k = i + 1; k < settled.length; k += 1) {
        const d = dist(settled[i][1], settled[k][1]);
        const detail = `${settled[i][0]} and ${settled[k][0]} ${d.toFixed(1)}ft apart`;
        if (isAsk && d < TOKEN_BLOCK_FT) blocks.push({ rule: "token-overlap", nodeId, detail });
        else if (isAsk && d < TOKEN_WARN_FT) warns.push({ rule: "token-overlap", nodeId, detail });
        else if (!isAsk && d < TOKEN_STACKED_FT) warns.push({ rule: "token-overlap", nodeId, detail });
      }
    }

    // cue rules: cue markers and cue-like overlays must not cover an actor,
    // and rink labels stay short for young bands
    const cues = [];
    if (node.cue && typeof node.cue.x === "number") cues.push({ label: renderedCueLabel(node.cue), p: [node.cue.x, node.cue.y] });
    for (const o of node.overlays || []) {
      if (o.kind === "cue" && typeof o.x === "number") cues.push({ label: renderedCueLabel(o), p: [o.x, o.y] });
    }
    for (const c of cues) {
      for (const [actorId, p] of settled) {
        const d = dist(c.p, p);
        const detail = `cue "${c.label}" ${d.toFixed(1)}ft from ${actorId}`;
        if (d < CUE_BLOCK_FT) blocks.push({ rule: "cue-covers-actor", nodeId, detail });
        else if (d < CUE_WARN_FT) warns.push({ rule: "cue-covers-actor", nodeId, detail });
      }
      // Length is measured against the rendered string (see renderedCueLabel).
      if (young && c.label && c.label.length > MAX_CUE_LABEL_CHARS) {
        add("cue-label-length", nodeId, `"${c.label}" (${c.label.length} chars)`);
      }
    }
  }

  // answer-leak rules: only the ask node can leak, and only before the answer
  if (askNode && target) {
    const nodeId = askNode.id || play.start;
    for (const m of askNode.motions || []) {
      if ((m.kind === "pass" || m.kind === "shot") && Array.isArray(m.to) && dist(m.to, target.pos) < LEAK_RADIUS_FT) {
        add("answer-leak-arrow", nodeId, `${m.kind} arrow ends ${dist(m.to, target.pos).toFixed(1)}ft from the answer`);
      }
    }
    const cueLike = [];
    if (askNode.cue && typeof askNode.cue.x === "number") cueLike.push([askNode.cue.x, askNode.cue.y]);
    for (const o of askNode.overlays || []) {
      if (o.kind === "cue" && typeof o.x === "number") cueLike.push([o.x, o.y]);
    }
    for (const p of cueLike) {
      if (target.kind !== "keep" && dist(p, target.pos) < LEAK_RADIUS_FT) {
        add("answer-leak-cue", nodeId, `cue marker ${dist(p, target.pos).toFixed(1)}ft from the answer target`);
      }
    }

    // puck-adrift: only for on-puck reads — when the decision actor is the
    // puck carrier, the puck must read as on their stick at the freeze.
    // Off-puck reads (backcheck, forecheck, gap control) legitimately show
    // the puck with the opponent.
    const actorId = askNode.ask.actor || askNode.decisionActor;
    const actorRole = ((play.actors || []).find((a) => a.id === actorId) || {}).role;
    const actorPos = actorId && askNode.pos && askNode.pos[actorId];
    if (actorRole === "puckCarrier" && Array.isArray(actorPos) && Array.isArray(askNode.puck)) {
      const d = dist(askNode.puck, actorPos);
      if (d > PUCK_TETHER_FT) add("puck-adrift", askNode.id || play.start, `puck ${d.toFixed(1)}ft from ${actorId}`);
    }
  }

  return { blocks, warns, ok: blocks.length === 0 };
}

// Lint a whole catalog. Returns { ok, findings: [{ playId, blocks, warns }] }.
export function artLintCatalog(plays) {
  const findings = [];
  for (const play of plays) {
    const r = artLint(play);
    if (r.blocks.length || r.warns.length) findings.push({ playId: play.id, blocks: r.blocks, warns: r.warns });
  }
  return { ok: findings.every((f) => f.blocks.length === 0), findings };
}
