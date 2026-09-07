// Validates positional language in question copy against the actors' real
// coordinates. Tier 1 of docs/references/rink-area-vocabulary.md.
//
// Why this exists: a live seed (gvis_u11_time-and-space_4we8) tells the player
// "You have the puck up high in the zone" while YOU is rendered mid-zone. Copy
// and geometry are authored separately and nothing compared them.
//
// ── Frames ───────────────────────────────────────────────────────────────────
// This repo contains TWO rink geometries:
//   - src/play/rinkAnchors.js  NHL 200 x 85 ft   (aspect 2.353)
//   - src/RinkReadsRink.jsx    60m x 30m IIHF    (aspect 2.0)
// Scenario seeds render through the SECOND. Converting seed coords by x * 200
// misplaces the blue line and distorts lateral distance by ~18%, so this module
// never converts to feet. It measures depth as a FRACTION of zone depth, which
// is exact in either frame.
//
// The constants below mirror RinkReadsRink's RINK_DIMENSIONS. They are restated
// rather than imported because that module is .jsx and cannot be loaded by a
// plain node test; the derivation is shown so the two can be checked by eye.
//   length 60m, goalLineFromEnd 4m  -> right goal line at 56m  -> 0.933333
//   goalLineToBlue 17.3m            -> right blue line at 38.7m -> 0.645
const GOAL_LINE_X = (60 - 4) / 60;               // 0.933333
const BLUE_LINE_X = (60 - 4 - 17.3) / 60;        // 0.645

// d = 0 at the blue line, 1 at the goal line, >1 behind the net.
// Keyed to the END OF THE RINK the play attacks, taken from stage.view, because
// the repo resolves attacking direction inconsistently elsewhere.
export function zoneDepth(x, view = "right") {
  if (!Number.isFinite(x)) return null;
  return view === "left"
    ? ((1 - BLUE_LINE_X) - x) / ((1 - BLUE_LINE_X) - (1 - GOAL_LINE_X))
    : (x - BLUE_LINE_X) / (GOAL_LINE_X - BLUE_LINE_X);
}

// Depth bands, per the vocabulary doc. `grey` is the tolerance a validator MUST
// pass: authoring judgment near a fence is not an error, and the bands' own
// fences are partly judgment (there is no line on the ice at d = 0.30).
const BANDS = {
  high: { max: 0.30, greyMax: 0.38 },
  low:  { min: 0.69, greyMin: 0.61 },
};

// Phrases that make a DEPTH claim about the puck carrier / "you".
// Deliberately narrow. Every pattern requires the zone word, because "high" and
// "low" have at least three live non-spatial senses in this repo's copy:
//   shot placement  "high glove", "low blocker"
//   role            "the high forward, F3"
//   quality         "low-percentage shot"
// and kid copy uses "low side" for WIDTH. Matching a bare "high" would fail all
// of those wrongly, which is worse than missing a real one.
const CLAIMS = [
  { band: "high", re: /\b(?:up\s+)?high\s+in\s+the\s+zone\b/i },
  { band: "high", re: /\bat\s+the\s+top\s+of\s+the\s+zone\b/i },
  { band: "low",  re: /\b(?:down\s+)?low\s+in\s+the\s+zone\b/i },
  { band: "low",  re: /\bdown\s+low\b(?!\s+side)/i },
];

// The actor a first-person prompt is about. Seeds tag the player "YOU"/"you";
// fall back to whoever holds the puck.
function subjectActor(seed) {
  const actors = seed?.actors || [];
  return (
    actors.find((a) => a.id === "you" || /^you$/i.test(a.tag || "")) ||
    actors.find((a) => a.kind === "puckCarrier") ||
    null
  );
}

function promptText(seed) {
  const i = seed?.interaction || {};
  return [i.prompt, i.q, seed?.prompt, seed?.sit, seed?.q].filter(Boolean).join(" ");
}

/**
 * @returns {Array<{code,seedId,actorId,claimed,measured,greyBound,phrase,explanation}>}
 * Empty when the copy makes no depth claim, or the geometry supports it, or the
 * actor sits inside the grey band.
 */
export function validatePositionalLanguage(seed) {
  const findings = [];
  const text = promptText(seed);
  if (!text) return findings;

  const claim = CLAIMS.find((c) => c.re.test(text));
  if (!claim) return findings;

  const actor = subjectActor(seed);
  if (!actor || !Number.isFinite(actor.x)) return findings;

  const view = seed?.stage?.view === "left" ? "left" : "right";
  const d = zoneDepth(actor.x, view);
  if (d === null) return findings;

  const band = BANDS[claim.band];
  const violates = claim.band === "high" ? d > band.greyMax : d < band.greyMin;
  if (!violates) return findings;

  const bound = claim.band === "high" ? band.greyMax : band.greyMin;
  const phrase = text.match(claim.re)?.[0] ?? claim.band;
  findings.push({
    code: "positional-depth-mismatch",
    seedId: seed?.id ?? null,
    actorId: actor.id,
    claimed: claim.band,
    measured: Number(d.toFixed(3)),
    greyBound: bound,
    phrase,
    explanation:
      `Copy says "${phrase}", which puts ${actor.id} in the ${claim.band} band ` +
      `(d ${claim.band === "high" ? "<=" : ">="} ${claim.band === "high" ? band.max : band.min}, ` +
      `grey to ${bound}), but ${actor.id} is at d=${d.toFixed(3)} of zone depth. ` +
      `d is measured from the blue line (0) to the goal line (1).`,
  });
  return findings;
}
