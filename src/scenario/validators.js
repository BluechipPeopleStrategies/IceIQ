// Layered validation rules for scenarios. validateScenario in schema.js
// covers shape (required fields, enum membership). This file owns the
// HOCKEY-LOGIC + UX-SANITY checks that catch authoring drift before it
// reaches a coach.
//
// Each rule returns either:
//   { kind: "err",  msg }   — hard failure, scenario won't ship
//   { kind: "warn", msg }   — author should look but can override
//   null                    — pass

import { ZONES } from "./zones.js";

const INTERCEPT_RADIUS = 0.035;

// Controlled vocabulary for `themes`. The LLM is told to pick from this
// list; runtime warns on anything else so the catalog stays filterable.
export const THEME_VOCAB = new Set([
  // Tactical phases of play
  "forecheck", "backcheck", "breakout", "regroup", "transition",
  "power-play", "penalty-kill", "even-strength",
  "offensive-zone", "defensive-zone-coverage", "neutral-zone",
  "zone-entry", "zone-exit", "face-off", "net-front", "cycle",
  // Numbers
  "1-on-1", "2-on-1", "3-on-2", "odd-man-rush",
  // Skill / cognitive concepts
  "decision-making", "vision", "puck-support", "positioning",
  "pass-selection", "shot-selection", "gap-control", "angling",
  // IntelliGym training dimensions
  "scan", "memory", "anticipate", "react",
]);

// ───────────────────────────────────────────────────────────────────────
// Geometry helpers (kept local to avoid a runtime dep on the React side).

function distance(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

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

function resolveTargetCoords(target) {
  if (!target) return null;
  if (typeof target.x === "number" && typeof target.y === "number") {
    return { x: target.x, y: target.y, tolerance: target.tolerance ?? 0.05 };
  }
  if (typeof target.zoneId === "string" && ZONES[target.zoneId]) {
    const z = ZONES[target.zoneId];
    return { x: z.x, y: z.y, tolerance: target.tolerance ?? z.tol };
  }
  return null;
}

// View-clip ranges mirror RinkReadsRink's half-view crops.
function actorOnStage(actor, view) {
  if (view === "right")   return actor.x >= 0.45;
  if (view === "left")    return actor.x <= 0.55;
  if (view === "neutral") return actor.x >= 0.30 && actor.x <= 0.70;
  return true;
}

// ───────────────────────────────────────────────────────────────────────
// Individual rules — small, focused, composable.

const rules = [
  // ── HARD ERRORS

  function fromActorIsPlayer(s) {
    if (s.interaction?.kind !== "path") return null;
    const from = s.actors.find(a => a.id === s.interaction.from);
    if (!from) return null; // separate rule catches this
    if (from.kind !== "player") {
      return { kind: "err", msg: `interaction.from "${from.id}" is kind="${from.kind}" — must be "player" (the user's POV)` };
    }
    return null;
  },

  function exactlyOnePlayer(s) {
    if (!Array.isArray(s.actors)) return null;
    const players = s.actors.filter(a => a.kind === "player");
    if (players.length === 0) return { kind: "err", msg: "scenario has no player actor — every scene needs exactly one 'YOU'" };
    if (players.length > 1) return { kind: "err", msg: `scenario has ${players.length} player actors — only one 'YOU' allowed` };
    return null;
  },

  function goalieRequiredInZone(s) {
    const zone = s.stage?.zone;
    if (zone !== "off-zone" && zone !== "def-zone") return null;
    const hasGoalie = s.actors?.some(a => a.kind === "goalie");
    if (!hasGoalie) return { kind: "err", msg: `stage.zone="${zone}" requires a goalie actor` };
    return null;
  },

  function pathNotTooShort(s) {
    if (s.interaction?.kind !== "path") return null;
    const from = s.actors?.find(a => a.id === s.interaction.from);
    const target = resolveTargetCoords(s.correct?.end);
    if (!from || !target) return null;
    if (distance(from, target) < target.tolerance) {
      return { kind: "err", msg: `path from "${from.id}" to correct target is shorter than the target tolerance — there's no real distance to draw` };
    }
    return null;
  },

  function actorsDoNotOverlap(s) {
    if (!Array.isArray(s.actors)) return null;
    // The puck is allowed to sit on top of its carrier — exempt that pair.
    const skaters = s.actors.filter(a => a.kind !== "puck");
    for (let i = 0; i < skaters.length; i++) {
      for (let j = i + 1; j < skaters.length; j++) {
        if (distance(skaters[i], skaters[j]) < 0.025) {
          return { kind: "err", msg: `actors "${skaters[i].id}" and "${skaters[j].id}" overlap (within 0.025) — visually indistinguishable` };
        }
      }
    }
    return null;
  },

  function actorsOnStage(s) {
    if (!Array.isArray(s.actors) || !s.stage) return null;
    for (const a of s.actors) {
      if (!actorOnStage(a, s.stage.view)) {
        return { kind: "err", msg: `actor "${a.id}" at x=${a.x} is off-stage for view="${s.stage.view}" — it would never render` };
      }
    }
    return null;
  },

  function unknownZoneIds(s) {
    const target = s.correct?.end;
    if (!target || typeof target.zoneId !== "string") return null;
    if (!ZONES[target.zoneId]) {
      return { kind: "err", msg: `correct.end.zoneId="${target.zoneId}" is not a known zone` };
    }
    return null;
  },

  // No offsides: on an attacking scene (off-zone or neutral, half-view), a
  // teammate can't be PAST the offensive blue line while the puck is still
  // behind it — that's offsides. Catches "pass to a winger already in the
  // zone" and "carrier behind the line while teammates are deep". Skips
  // def-zone (we're defending) and established in-zone plays (puck already in).
  function noOffsides(s) {
    const zone = s.stage?.zone;
    if (zone !== "off-zone" && zone !== "neutral") return null;
    const view = s.stage?.view;
    // Offensive blue line by attack direction: right-view attacks right (0.645),
    // left-view attacks left (0.355). A neutral VIEW crops out the OZ — skip.
    const blue = view === "right" ? 0.645 : view === "left" ? 0.355 : null;
    if (blue == null) return null;
    const inOZ = (x) => (view === "right" ? x > blue : x < blue);
    const puck = (s.actors || []).find(a => a.kind === "puck");
    if (!puck || inOZ(puck.x)) return null; // no puck, or puck already in the zone → onside
    const offside = (s.actors || []).filter(a => (a.kind === "player" || a.kind === "teammate") && inOZ(a.x));
    if (offside.length) {
      return { kind: "err", msg: `offsides — teammate(s) ${offside.map(a => a.id).join(", ")} ${offside.length > 1 ? "are" : "is"} past the offensive blue line but the puck is still behind it (x=${puck.x.toFixed(2)}). Carry the puck into the zone, or pull the teammate(s) back behind the line.` };
    }
    return null;
  },

  // Place-drill drop targets must not overlap when their guides are shown —
  // merged circles read as one ambiguous blob. Pixel-space check because the
  // rink is 600×300 (a 0.05 tol is 30px wide but the same normalized gap is
  // half as tall). Warn (not err): the scenario still scores, but it's a UX bug.
  function placeTargetsDontOverlap(s) {
    if (s.interaction?.kind !== "place" || !s.interaction.showTargets) return null;
    const places = s.correct?.placements;
    if (!Array.isArray(places) || places.length < 2) return null;
    const circles = places
      .map(p => { const t = resolveTargetCoords(p); return t ? { id: p.id, ...t } : null; })
      .filter(Boolean);
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i], b = circles[j];
        // Tolerance regions are normalized circles (radius = tol); they overlap
        // when the centers are closer than the sum of the tolerances.
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < a.tolerance + b.tolerance) {
          return { kind: "warn", msg: `place targets for "${a.id}" and "${b.id}" overlap (centers ${dist.toFixed(3)} apart, tolerances sum ${(a.tolerance + b.tolerance).toFixed(3)}) — the drop guides merge into one ambiguous blob. Space them out or shrink the tolerances.` };
        }
      }
    }
    return null;
  },

  function promptLengthSane(s) {
    const p = s.interaction?.prompt;
    if (typeof p !== "string" || p.length < 25) {
      return { kind: "err", msg: `interaction.prompt is too short (${p?.length ?? 0} chars) — minimum 25 to actually frame the read` };
    }
    return null;
  },

  // QA: copy must name jersey colors the renderer actually draws. Our side is
  // BLUE, opponents are BLACK (white X). Authors transcribing a source image
  // wrote "white jersey/player" for opponents — which contradicts the board.
  // Warn on any player-color word that isn't blue/black. (From user feedback.)
  function copyMatchesColors(s) {
    const text = [s.interaction?.prompt, s.feedback?.right, s.feedback?.wrong, s.tip]
      .filter(t => typeof t === "string").join(" ");
    const m = text.match(/\b(white|yellow|red|green|orange|purple)\s+(jersey|jerseys|sweater|sweaters|player|players|defender|defenders|teammate|teammates|skater|skaters)\b/i);
    if (m) {
      return { kind: "warn", msg: `copy says "${m[0]}" but the renderer draws our side BLUE and opponents BLACK — no ${m[1].toLowerCase()} jerseys exist on the board. Call them "opponent"/"teammate" or match the actual color.` };
    }
    return null;
  },

  // QA: the puck's position must match a location the prompt claims. If the
  // prompt says the puck is in the "corner" or at the "net-front/crease",
  // verify the puck is actually there. (From the c9qi "puck isn't on the
  // half-wall" feedback — codifying the unambiguous cases; the AI QA coach
  // handles subtler spots like half-wall/slot/point.)
  function puckLocationMatchesCopy(s) {
    const puck = (s.actors || []).find(a => a.kind === "puck");
    if (!puck) return null;
    const text = (s.interaction?.prompt || "").toLowerCase();
    const zone = s.stage?.zone;
    // "deep" (near a net) depends on which net the scene shows.
    const netX = zone === "def-zone" ? 0.08 : zone === "off-zone" ? 0.92 : null;
    if (netX == null) return null; // neutral: no net reference
    const depth = Math.abs(puck.x - netX);     // 0 = on the net, larger = toward the blue line
    const offBoards = Math.abs(puck.y - 0.5);  // 0 = center ice, ~0.5 = on the boards
    if (/\bcorner\b/.test(text) && (depth > 0.35 || offBoards < 0.18)) {
      return { kind: "warn", msg: `prompt says "corner" but the puck (x=${puck.x.toFixed(2)}, y=${puck.y.toFixed(2)}) isn't in one — a corner is deep near the goal line AND wide against the boards.` };
    }
    if (/(net[- ]front|front of the net|\bcrease\b)/.test(text) && (depth > 0.25 || offBoards > 0.32)) {
      return { kind: "warn", msg: `prompt says net-front/crease but the puck (x=${puck.x.toFixed(2)}, y=${puck.y.toFixed(2)}) is depth ${depth.toFixed(2)} from the net — it's not at the net.` };
    }
    return null;
  },

  // QA: "below the puck" / "above the puck" must match the geometry. "Below the
  // puck" = deeper, between the puck and the net; "above" = higher, toward the
  // blue line. Net reference = the goalie's x (works for any view/zone). If the
  // copy claims the defense collapsed below the puck but the defenders are
  // actually farther from the net than the puck, that's the contradiction.
  // (From user feedback: defenders can't be "below" a puck sitting on the goal line.)
  function copyMatchesDepth(s) {
    const text = [s.interaction?.prompt, s.mc?.stem, s.feedback?.right, s.feedback?.wrong]
      .filter(t => typeof t === "string").join(" ").toLowerCase();
    const below = /(below the puck|collapsed below|sagged below|pulled below|sag below|sunk below)/.test(text);
    const above = /(above the puck|collapsed above|stayed above|stay above)/.test(text);
    if (!below && !above) return null;
    const goalie = (s.actors || []).find(a => a.kind === "goalie");
    const puck = (s.actors || []).find(a => a.kind === "puck");
    const defs = (s.actors || []).filter(a => a.kind === "defender");
    if (!goalie || !puck || !defs.length) return null;
    const puckToNet = Math.abs(puck.x - goalie.x);             // smaller = deeper (closer to net)
    const deeper = defs.filter(d => Math.abs(d.x - goalie.x) < puckToNet).length; // "below the puck"
    const need = Math.ceil(defs.length / 2);
    if (below && deeper < need) {
      return { kind: "warn", msg: `copy says the defense is "below the puck" (deeper, between the puck and the net) but ${defs.length - deeper}/${defs.length} defenders are ABOVE it (farther from the net than the puck at x=${puck.x.toFixed(2)}). Move the puck higher (less deep) or collapse the defenders toward the net.` };
    }
    if (above && (defs.length - deeper) < need) {
      return { kind: "warn", msg: `copy says the defense is "above the puck" but most defenders are below it (closer to the net than the puck at x=${puck.x.toFixed(2)}).` };
    }
    return null;
  },

  // ── SELECTION-SPECIFIC

  function selectionHasMultipleCandidates(s) {
    if (s.interaction?.kind !== "selection") return null;
    const from = s.interaction.from;
    if (!Array.isArray(from) || from.length < 2) {
      return { kind: "err", msg: `selection scenarios need at least 2 candidates in interaction.from (got ${from?.length ?? 0}) — otherwise it's not a choice` };
    }
    return null;
  },

  function selectionCandidatesExist(s) {
    if (s.interaction?.kind !== "selection") return null;
    const from = s.interaction.from || [];
    const ids = new Set((s.actors || []).map(a => a.id));
    const missing = from.filter(id => !ids.has(id));
    if (missing.length) {
      return { kind: "err", msg: `selection.from references unknown actor ids: ${missing.join(", ")}` };
    }
    return null;
  },

  function selectionCorrectIsSubsetOfFrom(s) {
    if (s.interaction?.kind !== "selection") return null;
    const from = new Set(s.interaction.from || []);
    const correct = s.correct?.ids || [];
    if (!Array.isArray(correct) || correct.length === 0) {
      return { kind: "err", msg: `selection.correct.ids must be a non-empty array of candidate ids` };
    }
    const stray = correct.filter(id => !from.has(id));
    if (stray.length) {
      return { kind: "err", msg: `correct.ids contains ids not in interaction.from: ${stray.join(", ")}` };
    }
    return null;
  },

  function selectionHasWrongAnswerOption(s) {
    if (s.interaction?.kind !== "selection") return null;
    const fromCount = (s.interaction.from || []).length;
    const correctCount = (s.correct?.ids || []).length;
    if (fromCount > 0 && fromCount === correctCount) {
      return { kind: "err", msg: `every candidate is correct — there's no wrong answer to make this a real choice` };
    }
    return null;
  },

  // ── POINT-SPECIFIC

  function pointTargetWellFormed(s) {
    if (s.interaction?.kind !== "point") return null;
    const c = s.correct;
    if (!c || c.kind !== "point") return { kind: "err", msg: `correct.kind must be "point" for a point interaction` };
    const hasNumeric = typeof c.x === "number" && typeof c.y === "number";
    const hasZone = typeof c.zoneId === "string";
    if (!hasNumeric && !hasZone) {
      return { kind: "err", msg: `point answer requires either {x,y} or {zoneId}` };
    }
    if (hasZone && !ZONES[c.zoneId]) {
      return { kind: "err", msg: `correct.zoneId="${c.zoneId}" is not a known zone` };
    }
    return null;
  },

  // ── SEQUENCE-SPECIFIC

  function sequenceCandidatesMatch(s) {
    if (s.interaction?.kind !== "sequence") return null;
    const from = s.interaction.from || [];
    if (!Array.isArray(from) || from.length < 2) {
      return { kind: "err", msg: `sequence scenarios need at least 2 candidates in interaction.from (got ${from.length})` };
    }
    const ids = new Set((s.actors || []).map(a => a.id));
    const missing = from.filter(id => !ids.has(id));
    if (missing.length) {
      return { kind: "err", msg: `sequence.from references unknown actor ids: ${missing.join(", ")}` };
    }
    const correct = s.correct?.ids || [];
    if (!Array.isArray(correct) || correct.length < 2) {
      return { kind: "err", msg: `sequence.correct.ids must be at least 2 ids (got ${correct.length}) — otherwise it's just a selection` };
    }
    const fromSet = new Set(from);
    const stray = correct.filter(id => !fromSet.has(id));
    if (stray.length) {
      return { kind: "err", msg: `sequence.correct.ids contains ids not in interaction.from: ${stray.join(", ")}` };
    }
    return null;
  },

  // ── DECISION-MAKING REQUIRED (path scenarios only)
  // The scenario must show at least one tempting-but-blocked alternative.
  // Without this, the LLM happily authors trivial questions where the
  // only option is the right one.

  // ── PLACE-SPECIFIC (drag actors onto target spots)

  function placeHasItems(s) {
    if (s.interaction?.kind !== "place") return null;
    const items = s.interaction.items;
    if (!Array.isArray(items) || items.length < 1) {
      return { kind: "err", msg: `place scenarios need at least 1 actor id in interaction.items` };
    }
    const ids = new Set((s.actors || []).map(a => a.id));
    const missing = items.filter(id => !ids.has(id));
    if (missing.length) return { kind: "err", msg: `place.items references unknown actor ids: ${missing.join(", ")}` };
    return null;
  },

  function placeCorrectCoversItems(s) {
    if (s.interaction?.kind !== "place") return null;
    const pl = s.correct?.placements;
    if (!Array.isArray(pl) || pl.length < 1) {
      return { kind: "err", msg: `place.correct.placements must be a non-empty array of {id, zoneId|x,y}` };
    }
    const placed = new Set(pl.map(p => p.id));
    const missing = (s.interaction.items || []).filter(id => !placed.has(id));
    if (missing.length) return { kind: "err", msg: `every placed actor needs a target — missing placements for: ${missing.join(", ")}` };
    for (const p of pl) {
      if (!resolveTargetCoords(p)) return { kind: "err", msg: `placement for "${p.id}" needs a valid zoneId or {x,y}` };
    }
    return null;
  },

  function placeNotTriviallyCorrect(s) {
    if (s.interaction?.kind !== "place") return null;
    const byId = Object.fromEntries((s.actors || []).map(a => [a.id, a]));
    for (const p of (s.correct?.placements || [])) {
      const a = byId[p.id], t = resolveTargetCoords(p);
      if (!a || !t) continue;
      if (distance(a, t) <= t.tolerance) {
        return { kind: "err", msg: `placeable actor "${p.id}" already starts within tolerance of its target — there's no placement to make. Start it on a bench/neutral spot, not on the answer.` };
      }
    }
    return null;
  },

  function decisionMakingPresent(s) {
    if (s.interaction?.kind !== "path") return null;
    const verb = s.interaction.verb;
    if (verb !== "pass") return null; // only pass scenarios need a recipient choice
    const from = s.actors?.find(a => a.id === s.interaction.from);
    const target = resolveTargetCoords(s.correct?.end);
    if (!from || !target) return null;
    const teammates = s.actors.filter(a => a.kind === "teammate");
    const defenders = s.actors.filter(a => a.kind === "defender");
    // Find at least one teammate that's NOT near the correct target AND
    // has a defender on the line from the puck-carrier — that's the
    // "tempting but blocked" alternative.
    for (const t of teammates) {
      if (distance(t, target) < 0.10) continue;     // skip the correct receiver
      const blocked = defenders.some(d => lineHitsCircle(from, t, d, INTERCEPT_RADIUS));
      if (blocked) return null;                      // found one — pass
    }
    return { kind: "err", msg: "no tempting-but-blocked alternative — every pass scenario needs at least one OTHER teammate the player might pass to but can't (defender in the lane). Otherwise it's not a read." };
  },

  // ── DEFENDER COUNT BY ZONE / THEME

  function defenderCountByZone(s) {
    const defenders = (s.actors || []).filter(a => a.kind === "defender");
    const n = defenders.length;
    const zone = s.stage?.zone;
    const themes = new Set(s.themes || []);
    if (zone === "def-zone" && n < 2) {
      return { kind: "err", msg: `def-zone scenarios need at least 2 defenders (got ${n}) — otherwise it's not a coverage situation` };
    }
    if (zone === "off-zone" && themes.has("power-play") && n < 3) {
      return { kind: "err", msg: `power-play scenarios need at least 3 defenders (got ${n}) — a PK has 4 skaters; show at least 3` };
    }
    if (zone === "off-zone" && !themes.has("power-play") && n < 1) {
      return { kind: "err", msg: `off-zone scenarios need at least 1 defender (got ${n})` };
    }
    if (zone === "neutral" && n < 1) {
      return { kind: "err", msg: `neutral-zone scenarios need at least 1 defender (got ${n})` };
    }
    return null;
  },

  // ── DIFFICULTY CAP BY COMPLEXITY
  // Rough complexity score; difficulty must be ≥ derived floor. Stops
  // U11/difficulty=1 questions from sneaking through with timers + 9
  // actors + scan-window stacked on top.

  function difficultyMatchesComplexity(s) {
    const skaterCount = (s.actors || []).filter(a => a.kind !== "puck").length;
    let complexity = 0;
    if (skaterCount >= 7) complexity = 2;
    if (skaterCount >= 9) complexity = 3;
    if (s.timer) complexity = Math.max(complexity, 2);
    if (s.scanWindow) complexity = Math.max(complexity, 3);
    if (s.preview && (s.timer || s.scanWindow)) complexity = Math.max(complexity, 3);
    if ((s.themes || []).some(t => t === "power-play" || t === "penalty-kill")) {
      complexity = Math.max(complexity, 2);
    }
    if (complexity > 0 && (s.difficulty || 1) < complexity) {
      return { kind: "err", msg: `difficulty=${s.difficulty} is too low for this scenario (complexity floor=${complexity}: ${skaterCount} skaters${s.timer ? " + timer" : ""}${s.scanWindow ? " + scan-window" : ""}${s.preview ? " + preview-lock" : ""})` };
    }
    return null;
  },

  // ── BOARD-MC (optional multiple-choice over the validated board)

  function mcShapeValid(s) {
    if (!s.mc) return null;
    const opts = s.mc.opts;
    if (!Array.isArray(opts) || opts.length !== 4) {
      return { kind: "err", msg: `mc.opts must be exactly 4 options (got ${Array.isArray(opts) ? opts.length : typeof opts})` };
    }
    if (opts.some(o => typeof o !== "string" || o.trim().length === 0)) {
      return { kind: "err", msg: `every mc.opts entry must be a non-empty string` };
    }
    const seen = new Set(opts.map(o => o.trim().toLowerCase()));
    if (seen.size !== opts.length) {
      return { kind: "err", msg: `mc.opts has duplicate options — every option must be distinct` };
    }
    return null;
  },

  function mcOkInRange(s) {
    if (!s.mc) return null;
    if (!Number.isInteger(s.mc.ok) || s.mc.ok < 0 || s.mc.ok > 3) {
      return { kind: "err", msg: `mc.ok must be an integer 0..3 (got ${JSON.stringify(s.mc.ok)})` };
    }
    return null;
  },

  function mcStemSane(s) {
    if (!s.mc || s.mc.stem == null) return null;
    if (typeof s.mc.stem !== "string" || s.mc.stem.trim().length < 10) {
      return { kind: "warn", msg: `mc.stem is very short — give the question an actual prompt or omit it to reuse interaction.prompt` };
    }
    return null;
  },

  // ── SOFT WARNINGS

  function goalieInCrease(s) {
    const g = s.actors?.find(a => a.kind === "goalie");
    if (!g) return null;
    // A placeable goalie starts on a bench/neutral spot by design — its
    // crease position is the answer, not the start, so don't warn on it.
    if (s.interaction?.kind === "place" && (s.interaction.items || []).includes(g.id)) return null;
    // Crease lives at x ≥ 0.91 (right) or x ≤ 0.09 (left); y around 0.5.
    const inRightCrease = g.x >= 0.88 && g.x <= 0.95 && Math.abs(g.y - 0.5) < 0.10;
    const inLeftCrease  = g.x >= 0.05 && g.x <= 0.12 && Math.abs(g.y - 0.5) < 0.10;
    if (!inRightCrease && !inLeftCrease) {
      return { kind: "warn", msg: `goalie "${g.id}" at (${g.x.toFixed(2)},${g.y.toFixed(2)}) isn't in either crease — verify position` };
    }
    return null;
  },

  function positionTagsAlignWithLocation(s) {
    if (!Array.isArray(s.actors)) return null;
    const issues = [];
    for (const a of s.actors) {
      if (a.kind !== "teammate" || !a.tag) continue;
      const tag = a.tag.toUpperCase();
      // Right-side tags should sit at y > 0.5; left-side at y < 0.5.
      if ((tag === "RD" || tag === "RW") && a.y < 0.4) issues.push(`${a.id} tagged ${tag} but at y=${a.y.toFixed(2)} (top half)`);
      if ((tag === "LD" || tag === "LW") && a.y > 0.6) issues.push(`${a.id} tagged ${tag} but at y=${a.y.toFixed(2)} (bottom half)`);
    }
    if (issues.length) return { kind: "warn", msg: `position-tag drift: ${issues.join("; ")}` };
    return null;
  },

  function verbMatchesContext(s) {
    if (s.interaction?.kind !== "path") return null;
    const verb = s.interaction.verb;
    const target = resolveTargetCoords(s.correct?.end);
    if (!target) return null;
    if (verb === "pass") {
      // A pass should end near a teammate.
      const teammates = (s.actors || []).filter(a => a.kind === "teammate");
      const nearby = teammates.some(t => distance(t, target) < 0.15);
      if (!nearby) {
        return { kind: "warn", msg: `verb="pass" but no teammate near correct.end — passing to no one?` };
      }
    }
    if (verb === "shoot") {
      // A shot should end near the offensive net (right end of rink) or
      // defensive net depending on stage zone.
      const nearRightNet = target.x > 0.85 && Math.abs(target.y - 0.5) < 0.20;
      const nearLeftNet  = target.x < 0.15 && Math.abs(target.y - 0.5) < 0.20;
      if (!nearRightNet && !nearLeftNet) {
        return { kind: "warn", msg: `verb="shoot" but correct.end isn't near a net` };
      }
    }
    return null;
  },

  function tipNotIdenticalToFeedback(s) {
    if (!s.tip || !s.feedback?.right) return null;
    if (s.tip.trim().toLowerCase() === s.feedback.right.trim().toLowerCase()) {
      return { kind: "warn", msg: `tip is identical to feedback.right — tip should add something the right-answer copy doesn't already say` };
    }
    return null;
  },

  function themesInVocab(s) {
    if (!Array.isArray(s.themes)) return null;
    const offenders = s.themes.filter(t => !THEME_VOCAB.has(t));
    if (offenders.length) {
      return { kind: "warn", msg: `themes outside the controlled vocabulary: ${offenders.join(", ")} — use the canonical names so filtering keeps working` };
    }
    return null;
  },
];

// ───────────────────────────────────────────────────────────────────────
// Public entry — runs all rules, partitions errors vs warnings.

export function runHockeyValidators(scenario) {
  const errs = [];
  const warns = [];
  for (const rule of rules) {
    let result;
    try { result = rule(scenario); }
    catch (e) { errs.push(`validator "${rule.name}" threw: ${e.message}`); continue; }
    if (!result) continue;
    if (result.kind === "err") errs.push(result.msg);
    else if (result.kind === "warn") warns.push(result.msg);
  }
  return { errs, warns };
}
