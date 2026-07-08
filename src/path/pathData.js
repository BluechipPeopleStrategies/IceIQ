// Skill Path data model — Duolingo-style path built from the LOCKED
// curriculum ledger (src/data/curriculum-ledger.json, v3.1.0).
//
// The ledger is the single source of truth: domains → units, per-age
// nodes → lesson bubbles. Nothing here invents curriculum; it only
// projects the spine into a walkable path. When the gauntlet ships
// ledger-tagged questions, lessons scope to the node's conceptId
// (see buildQueue focus filter in App.jsx) — until then a node lesson
// gracefully falls back to the full bank for the player's level.

import ledger from "../data/curriculum-ledger.json";

// "U11 / Atom" → "U11". Ledger ageIds are the bare bands.
export function levelToBand(level) {
  return String(level || "").split("/")[0].trim() || "U11";
}

export const DEPTH_LABEL = {
  I: "Introduce",
  D: "Develop",
  M: "Mastery",
  R: "Refine",
};

export const DEPTH_BLURB = {
  I: "First exposure — see it in controlled situations.",
  D: "Game-like reps with light pressure.",
  M: "Stable reads with more options on the ice.",
  R: "At speed, under real game chaos.",
};

// Stable per-domain accent colors (cycled onto unit banners + nodes).
// Derived from the app palette family — navy surfaces, warm accents.
export const DOMAIN_COLORS = [
  { main: "#FC4C02", dim: "rgba(252,76,2,0.16)" },   // brand orange
  { main: "#5BA4E8", dim: "rgba(91,164,232,0.16)" }, // data blue
  { main: "#22c55e", dim: "rgba(34,197,94,0.14)" },  // green
  { main: "#eab308", dim: "rgba(234,179,8,0.14)" },  // yellow
  { main: "#CF4520", dim: "rgba(207,69,32,0.16)" },  // dynasty orange
  { main: "#a78bfa", dim: "rgba(167,139,250,0.16)" },// violet
];

const conceptById = new Map(ledger.concepts.map(c => [c.id, c]));
const conceptOrder = new Map(ledger.concepts.map((c, i) => [c.id, i]));

/**
 * Build the path for one age band.
 * Returns { band, units, nodes } where:
 *  - units: [{ id, name, definition, color, nodes: [pathNode] }]
 *  - nodes: flat ordered list (unlock order) of the same pathNode objects
 * pathNode: { id, conceptId, name, depth, depthLabel, anchor,
 *             definition, readConnection, unitIdx, idxInUnit, flatIdx }
 */
export function getPath(band) {
  const bandNodes = (ledger.nodes || []).filter(n => n.ageId === band);
  const units = [];
  const flat = [];

  ledger.domains.forEach((domain, di) => {
    const nodes = bandNodes
      .filter(n => conceptById.get(n.conceptId)?.domainId === domain.id)
      .sort((a, b) => {
        const ca = conceptById.get(a.conceptId);
        const cb = conceptById.get(b.conceptId);
        // Anchor concepts lead their unit; otherwise ledger order.
        if (!!cb?.anchor !== !!ca?.anchor) return (cb?.anchor ? 1 : 0) - (ca?.anchor ? 1 : 0);
        return (conceptOrder.get(a.conceptId) ?? 0) - (conceptOrder.get(b.conceptId) ?? 0);
      });
    if (!nodes.length) return;

    const color = DOMAIN_COLORS[di % DOMAIN_COLORS.length];
    const unit = { id: domain.id, name: domain.name, definition: domain.definition, color, nodes: [] };

    nodes.forEach((n, i) => {
      const c = conceptById.get(n.conceptId) || {};
      const pn = {
        id: n.id,
        conceptId: n.conceptId,
        name: c.name || n.conceptId,
        depth: n.depth,
        depthLabel: DEPTH_LABEL[n.depth] || n.depth,
        anchor: !!c.anchor,
        definition: c.definition || "",
        readConnection: c.readConnection || "",
        unitIdx: units.length,
        idxInUnit: i,
        flatIdx: flat.length,
        band,
      };
      unit.nodes.push(pn);
      flat.push(pn);
    });
    units.push(unit);
  });

  return { band, units, nodes: flat };
}

export function bandsAvailable() {
  return ledger.meta?.ageBands || ["U7", "U9", "U11", "U13", "U15", "U18"];
}
