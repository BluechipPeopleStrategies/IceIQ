// src/play/noveltyGate.js
// The duplicate-killer from the variation-generator design (2026-06-16),
// now real: volume only counts if the correct answer MOVES and the layout
// genuinely changes. A variant that leaves the answer in the same place is a
// clone and dies here — this is what makes kernel/transform expansion produce
// variety instead of repetition.
//
// Pure module, no DOM. Operates on animated-play objects.

const RINK_DIAG = Math.hypot(200, 85);

// The play's primary ask node (the start node with an ask, else the first
// node that has one).
export function primaryAskNode(play) {
  const start = play.nodes && play.nodes[play.start];
  if (start && start.ask) return start;
  return Object.values(play.nodes || {}).find((n) => n && n.ask) || null;
}

// Where the correct answer "lives" on the ice: the position that receives the
// puck when the correct option is taken. For a pass that is the supporting
// actor's freeze position; for a shot, the net mouth; fallback is the
// decision actor's own spot (carry/hold reads).
const NET_POS = [190, 43];
export function answerTarget(play) {
  const node = primaryAskNode(play);
  if (!node) return null;
  const ok = node.ask.opts.find((o) => o.ok);
  if (!ok) return null;
  const id = String(ok.id || "");
  if (/shoot|shot/.test(id)) return { kind: "shot", pos: NET_POS, optId: ok.id };
  if (/pass/.test(id)) {
    // the receiver: the support-role actor's position at the freeze
    const support = (play.actors || []).find((a) => a.role === "support");
    const pos = support && node.pos && node.pos[support.id];
    if (pos) return { kind: "pass", pos, optId: ok.id };
  }
  const actorPos = node.pos && node.pos[node.ask.actor];
  return { kind: "keep", pos: actorPos || [0, 0], optId: ok.id };
}

// Coarse signature for capping: correct option + which vertical third of the
// rink the answer lands in (high / middle / low side).
export function answerSignature(play) {
  const t = answerTarget(play);
  if (!t) return "none";
  const band = t.pos[1] < 85 / 3 ? "high" : t.pos[1] > (85 * 2) / 3 ? "low" : "mid";
  return `${t.optId}:${band}`;
}

// Mean displacement of the shared actors at the decision freeze, normalized
// by the rink diagonal. 0 = identical layout.
export function layoutDistance(a, b) {
  const na = primaryAskNode(a);
  const nb = primaryAskNode(b);
  if (!na || !nb || !na.pos || !nb.pos) return 1;
  const ids = Object.keys(na.pos).filter((id) => nb.pos[id]);
  if (!ids.length) return 1;
  let sum = 0;
  for (const id of ids) {
    sum += Math.hypot(na.pos[id][0] - nb.pos[id][0], na.pos[id][1] - nb.pos[id][1]);
  }
  return sum / ids.length / RINK_DIAG;
}

// How far apart two plays' answers land, normalized by the rink diagonal.
export function answerDistance(a, b) {
  const ta = answerTarget(a);
  const tb = answerTarget(b);
  if (!ta || !tb) return 1;
  if (ta.optId !== tb.optId) return 1; // different correct action = fully moved
  return Math.hypot(ta.pos[0] - tb.pos[0], ta.pos[1] - tb.pos[1]) / RINK_DIAG;
}

export const DEFAULTS = {
  minAnswerMove: 0.06, // answer must move > ~13 ft, or the action must change
  minLayoutDist: 0.045, // vs same-signature keepers: layout must differ > ~10 ft avg
  capPerSignature: 3, // max kept plays per (option, band) tuple, existing included
};

// Filter candidates against the existing catalog and each other.
// Returns { kept: [play], rejected: [{ play, reason }] }.
// A candidate survives only if, against EVERY already-kept play (existing
// catalog first, then earlier survivors):
//   1. answer moved (different correct action, or same action landing far
//      enough away), OR the layout is meaningfully different; AND
//   2. its answer signature's cap is not exhausted.
export function filterNovel(candidates, existing = [], opts = {}) {
  const { minAnswerMove, minLayoutDist, capPerSignature } = { ...DEFAULTS, ...opts };
  const kept = [];
  const rejected = [];
  const sigCount = new Map();
  for (const p of existing) {
    const s = answerSignature(p);
    sigCount.set(s, (sigCount.get(s) || 0) + 1);
  }
  const pool = () => [...existing, ...kept];

  for (const cand of candidates) {
    const sig = answerSignature(cand);
    let reason = null;
    for (const other of pool()) {
      const aMove = answerDistance(cand, other);
      const lDist = layoutDistance(cand, other);
      if (aMove < minAnswerMove && lDist < minLayoutDist) {
        reason = `clone of ${other.id} (answer ${aMove.toFixed(3)}, layout ${lDist.toFixed(3)})`;
        break;
      }
    }
    if (!reason && (sigCount.get(sig) || 0) >= capPerSignature) {
      reason = `signature cap ${capPerSignature} reached for ${sig}`;
    }
    if (reason) {
      rejected.push({ play: cand, reason });
    } else {
      kept.push(cand);
      sigCount.set(sig, (sigCount.get(sig) || 0) + 1);
    }
  }
  return { kept, rejected };
}
