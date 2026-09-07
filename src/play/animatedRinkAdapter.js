import { playSpaceToRinkFrame } from '../scenario-engine/frameAdapters.js';
import { motionPoints, motionTimings, visibleMotions } from './motionGeometry.js';
import { motionStyle } from './motionVocabulary.js';
import { NHL_200X85_PROFILE, feetPointToRinkFrame } from '../scenario-engine/rinkFrame.js';

const finitePoint = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite);
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (from, to, progress) => from.map((value, index) => value + (to[index] - value) * progress);
export function animatedPointToRink(point) { const [x, y] = playSpaceToRinkFrame(point); return { x, y }; }

// Presentation interpolation between the source's explicit entry/freeze poses;
// this is not a simulated skate route or inferred hockey outcome.
export function animatedEntryDuration(node) {
  const moves = Object.entries(node.enter || {}).some(([id, p]) => finitePoint(node.pos?.[id]) && (p[0] !== node.pos[id][0] || p[1] !== node.pos[id][1]))
    || (finitePoint(node.enterPuck) && finitePoint(node.puck) && (node.enterPuck[0] !== node.puck[0] || node.enterPuck[1] !== node.puck[1]));
  return moves ? Math.min(1400, node.autoNext?.ms ?? 1400) : 0;
}

export function sampleAnimatedRink(play, node, progress = 1, youId = node.decisionActor, labels = {}) {
  const t = clamp(progress), eased = t * t * (3 - 2 * t);
  const positions = Object.fromEntries(Object.entries(node.pos).map(([id, end]) => [id, finitePoint(node.enter?.[id]) ? mix(node.enter[id], end, eased) : end]));
  const puckFeet = finitePoint(node.enterPuck) ? mix(node.enterPuck, node.puck, eased) : node.puck;
  const puck = animatedPointToRink(puckFeet);
  // Initial actor roles do not establish later possession. Preserve the puck
  // coordinates exactly and only attribute an explicitly declared change.
  const owner = node.possessionChange?.toActor;
  const actors = play.actors.filter(actor => positions[actor.id]).map(actor => {
    const at = animatedPointToRink(positions[actor.id]);
    const from = node.enter?.[actor.id], end = node.pos[actor.id];
    const moving = finitePoint(from) && Math.hypot(end[0] - from[0], end[1] - from[1]) > .01;
    const aim = moving && t < 1 ? animatedPointToRink(end) : puck;
    // Catalog v1 supplies no body headings. This neutral facing helps read the
    // scene and is presentation-only; it does not change an answer or a route.
    const facing = Math.hypot(aim.x - at.x, aim.y - at.y) > .001 ? Math.atan2(aim.y - at.y, aim.x - at.x)
      : play.view === 'half-left' ? Math.PI : 0;
    return { id: actor.id, name: actor.label || actor.id, label: actor.id === youId ? 'YOU' : labels[actor.id] ?? actor.label ?? actor.id,
      team: actor.team, role: actor.role === 'goalie' ? 'goalie' : 'skater', ...at, facing };
  });
  return { actors, puck: { ...puck, owner: actors.some(actor => actor.id === owner) ? owner : null } };
}

/** Camera bounds cover every authored node, so an outcome cannot move the camera. */
export function animatedRinkBounds(play) {
  const points = [], goalSides = new Set();
  for (const node of Object.values(play.nodes)) {
    points.push(...Object.values(node.pos || {}), ...Object.values(node.enter || {}), node.puck);
    if (node.enterPuck) points.push(node.enterPuck);
    for (const actor of play.actors.filter(actor => actor.role === 'goalie')) if (finitePoint(node.pos?.[actor.id])) goalSides.add(node.pos[actor.id][0] < 100 ? -1 : 1);
    for (const option of node.ask?.opts || []) if (option.zone) {
      const [x, y, radius = 6] = option.zone;
      // Include the full authored hit area, not only its centre.
      points.push([x - radius, y - radius], [x + radius, y + radius]);
    }
  }
  const canonical = points.filter(finitePoint).map(point => {
    // A hit area may extend to the boards; source actor/puck points still use
    // the strict adapter and are never moved or clamped by camera framing.
    const [x, y] = feetPointToRinkFrame(point);
    return { x, y };
  });
  for (const node of Object.values(play.nodes)) for (const motion of node.motions || []) for (const [x, y] of animatedMotionPolyline(motion)) canonical.push({ x, y });
  const { bounds, landmarks } = NHL_200X85_PROFILE;
  const goalX = landmarks.goalLineRight[0];
  if (!goalSides.size && ['half-right', 'half-left'].includes(play.view)) goalSides.add(play.view === 'half-left' ? -1 : 1);
  for (const side of goalSides) canonical.push({ x: side * goalX, y: -1.2 }, { x: side * (goalX + 1.2), y: 1.2 });
  const context = [play.title, ...Object.values(play.nodes).flatMap(node => [node.q, node.youngQ, node.ask?.q, node.ask?.youngQ, ...(node.ask?.opts || []).flatMap(option => [option.t, option.youngT, option.why, option.no]), node.ask?.justify?.q, ...(node.ask?.justify?.opts || []).map(option => option.t)])].filter(Boolean).join(' ');
  // Named rule landmarks remain visible even when every skater is farther
  // down ice. These are framing guards only, never a tactical interpretation.
  if (/blue[ -]line|offside/i.test(context)) for (const side of goalSides.size ? goalSides : [1]) canonical.push({ x: side * landmarks.blueLineRightMid[0], y: 0 });
  if (/cent(?:er|re)[ -]line|red[ -]line|icing/i.test(context)) canonical.push({ x: 0, y: 0 });
  if (/icing/i.test(context)) canonical.push({ x: -goalX, y: 0 }, { x: goalX, y: 0 });
  if (/\bwall|\bboards|\bcorner/i.test(context)) canonical.push({ x: canonical[0]?.x || 0, y: bounds.minY }, { x: canonical[0]?.x || 0, y: bounds.maxY });
  if (!canonical.length) return { ...bounds };
  function fit(low, high, limitLow, limitHigh, minimum) {
    const extra = Math.max(0, minimum - (high - low)) / 2; low -= extra; high += extra;
    if (low < limitLow) { high += limitLow - low; low = limitLow; }
    if (high > limitHigh) { low -= high - limitHigh; high = limitHigh; }
    return [Math.max(limitLow, low), Math.min(limitHigh, high)];
  }
  const [minX, maxX] = fit(Math.min(...canonical.map(point => point.x)) - 3.2, Math.max(...canonical.map(point => point.x)) + 2, bounds.minX, bounds.maxX, 16);
  const [minY, maxY] = fit(Math.min(...canonical.map(point => point.y)) - 2.5, Math.max(...canonical.map(point => point.y)) + 2.5, bounds.minY, bounds.maxY, 16);
  return { minX, maxX, minY, maxY };
}

/** Sample exactly the existing drawn route's line/quad/Catmull-Rom geometry. */
export function animatedMotionPolyline(motion) {
  const points = motionPoints(motion), sampled = [];
  if (points.length === 2) {
    const [a, b] = points;
    if (motion.kind === 'skate' || motion.kind === 'blocked') return points.map(point => Object.values(animatedPointToRink(point)));
    const control = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 7];
    for (let i = 0; i <= 24; i++) { const t = i / 24, u = 1 - t; sampled.push([u * u * a[0] + 2 * u * t * control[0] + t * t * b[0], u * u * a[1] + 2 * u * t * control[1] + t * t * b[1]]); }
  } else {
    const padded = [points[0], ...points, points.at(-1)];
    for (let segment = 1; segment < padded.length - 2; segment++) {
      const [a, b, c, d] = padded.slice(segment - 1, segment + 3);
      for (let i = segment === 1 ? 0 : 1; i <= 16; i++) {
        const t = i / 16;
        sampled.push([0, 1].map(axis => .5 * (2 * b[axis] + (-a[axis] + c[axis]) * t + (2 * a[axis] - 5 * b[axis] + 4 * c[axis] - d[axis]) * t * t + (-a[axis] + 3 * b[axis] - 3 * c[axis] + d[axis]) * t * t * t)));
      }
    }
  }
  return sampled.map(point => { const p = animatedPointToRink(point); return [p.x, p.y]; });
}

export function animatedRinkOverlays(node, { elapsed = Infinity, kind, young = false } = {}) {
  const shown = visibleMotions(node), timings = motionTimings(shown.map(item => item.motion));
  const polylines = shown.flatMap(({ motion, trail }, index) => {
    if (elapsed < 500 + timings[index].delayMs) return [];
    const style = motionStyle(motion.kind);
    return [{ id: `motion-${index}`, points: animatedMotionPolyline(motion), color: style.stroke, width: trail ? 1.5 : style.width * 1.5,
      dashed: trail || !!style.dash, opacity: trail ? .38 : motion.kind === 'blocked' ? .6 : .95 }];
  });
  const targets = !node.terminal && kind === 'lane-pick' ? (node.ask?.opts || []).flatMap((option, index) => finitePoint(option.zone?.slice(0, 2))
    ? [{ id: option.id, ...animatedPointToRink(option.zone), label: String(index + 1), radius: (young ? option.zone[2] ?? 6 : 4.5) * .3048 }] : []) : [];
  const ghosts = (node.overlays || []).filter(overlay => ['freeze', 'target'].includes(overlay.kind)).map((overlay, index) => ({ id: `source-${index}`, ...animatedPointToRink([overlay.x, overlay.y]), radius: (overlay.r || 6) * .3048 }));
  // Authored cue prose is shown below the rink by AnimatedPlay. Keeping long
  // sentences out of3D prevents them covering the actors or action targets.
  return { targets, polylines, ghosts, labels: [] };
}

export function animatedZoneChoice(node, point, { young = false } = {}) {
  const options = node.ask?.opts || [];
  const hits = options.map((option, index) => {
    if (!option.zone) return null;
    const center = animatedPointToRink(option.zone);
    const radius = (young ? option.zone[2] ?? 6 : 4.5) * .3048;
    const distance = Math.hypot(point.x - center.x, point.y - center.y);
    return distance <= radius ? { option, index, distance } : null;
  }).filter(Boolean).sort((a, b) => a.distance - b.distance || a.index - b.index);
  return hits[0] || null;
}
