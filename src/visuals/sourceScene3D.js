import definitions from './sourceScene3DDefinitions.json' with { type: 'json' };
import { CARRY_OFFSET } from '../one-on-one/simulation.js';

const LENGTH = 60.96, WIDTH = 25.908;
const PNGS = new Map(definitions.scenes.map(scene => [`/assets/scenes-u11/${scene.id}.png`, scene]));
const SVGS = new Map(definitions.svgScenes.map(scene => [scene.file, scene]));
const fullBounds = { minX: -30.48, maxX: 30.48, minY: -12.954, maxY: 12.954 };
// These are explicit possession phrases in the authored scene description.
// No closest-player heuristic is used for the other frozen pictures.
const OWNER_REFS = {
  'nz-carry-open': [0, 'You carry the puck'],
  'oz-blue-line-contact': [0, 'You cross the offensive blue line with the puck'],
  'nz-gap-read': [0, 'An opponent carries the puck'],
  'nz-turnover-pivot': [1, 'Their winger takes off the other way with it'],
  'dz-regroup-backskate': [0, 'Your defenseman skates backward through the neutral zone with the puck'],
  'nz-head-up-carry': [0, 'You carry the puck'],
  'oz-corner-shield': [0, 'You shield the puck'],
  'oz-pass-lanes': [0, 'You have the puck'],
  'oz-lead-the-receiver': [0, 'You have the puck wide'],
  'oz-slot-shot': [0, 'You are alone in the slot with the puck'],
  'oz-point-shot-netfront': [0, 'Your defenseman winds up for a shot'],
  'oz-netfront-backdoor': [0, 'Your teammate has the puck'],
  'blue-line-gap-soft': [0, 'You approach the offensive blue line with the puck'],
  'oz-give-and-go': [1, 'You just passed to a teammate'],
  'oz-support-triangle': [0, 'Your teammate battles with the puck'],
  'oz-cycle-low': [0, 'you carry along the wall'],
  'oz-delay-high': [0, 'You hold the puck'],
  'dz-last-man-pressure': [0, 'You are the last player back with the puck'],
  'wall-angle-steer': [0, 'steers the puck carrier'],
  'dz-contain-patience': [0, 'The carrier hides the puck'],
  'dz-breakout-forecheck': [0, 'Your defenseman has the puck'],
  'dz-turnover-outlet': [0, 'Your defenseman intercepts a pass'],
};
const validMedia = media => !!media?.url && (!media.type || media.type === 'image');
const finitePoint = point => !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
const pair = point => [point.x, point.y];
const pngPoint = point => ({ x: (point.x - 300) * LENGTH / 600, y: (point.y - 150) * WIDTH / 300 });
function svgPoint(source, point) {
  const frame = source.sourceFrame.ice;
  if (source.sourceFrame.direction === 'bottom-to-top') return { x: (frame.y + frame.h / 2 - point.y) * LENGTH / frame.h, y: (point.x - frame.x - frame.w / 2) * WIDTH / frame.w };
  return { x: (point.x - frame.x - frame.w / 2) * LENGTH / frame.w, y: (point.y - frame.y - frame.h / 2) * WIDTH / frame.h };
}

/** Input is normalized to the complete IMAGE, including its padding/crop. */
export function sourceSceneImagePoint(media, point) {
  if (!validMedia(media) || !finitePoint(point)) return null;
  const png = PNGS.get(media.url), svg = SVGS.get(media.url);
  if (png) {
    const view = definitions.views[png.view];
    return pngPoint({ x: view.x + point.x * view.w, y: view.y + point.y * view.h });
  }
  return svg ? svgPoint(svg, { x: point.x * svg.sourceFrame.width, y: point.y * svg.sourceFrame.height }) : null;
}
function heading(map, origin, direction) {
  const from = map(origin), to = map({ x: origin.x + direction.x, y: origin.y + direction.y });
  return Math.atan2(to.y - from.y, to.x - from.x);
}
function addArrow(lines, id, points, { color = '#64748b', width = 2, dashed = true } = {}) {
  lines.push({ id, points: points.map(pair), color, width, dashed });
  const end = points.at(-1), previous = points.at(-2), angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  lines.push({ id: `${id}-head`, color, width, dashed: false, points: [
    [end.x - Math.cos(angle - .5) * .7, end.y - Math.sin(angle - .5) * .7], pair(end),
    [end.x - Math.cos(angle + .5) * .7, end.y - Math.sin(angle + .5) * .7],
  ] });
}
function visibleOverlays(media, overlays, lines) {
  for (const [index, overlay] of (overlays || []).entries()) {
    const map = point => sourceSceneImagePoint(media, point);
    if (overlay.kind === 'arrow' && [overlay.x1, overlay.y1, overlay.x2, overlay.y2].every(Number.isFinite)) {
      const from = { x: overlay.x1, y: overlay.y1 }, to = { x: overlay.x2, y: overlay.y2 };
      const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - .1 };
      const curve = Array.from({ length: 25 }, (_, i) => {
        const t = i / 24, u = 1 - t;
        return map({ x: u * u * from.x + 2 * u * t * control.x + t * t * to.x, y: u * u * from.y + 2 * u * t * control.y + t * t * to.y });
      });
      addArrow(lines, `overlay-${index}`, curve, { color: overlay.color || '#C9A24B', width: overlay.width || 2.4 });
    } else if (overlay.kind === 'ring' && [overlay.x, overlay.y, overlay.r].every(Number.isFinite)) {
      // The old ring used CSS aspect-ratio:1: its y radius depends on image ratio.
      const png = PNGS.get(media.url), ratio = png ? definitions.views[png.view].w / definitions.views[png.view].h : 1200 / 800;
      lines.push({ id: `overlay-${index}`, color: overlay.color || '#36d17a', width: 3, dashed: overlay.dashed !== false,
        points: Array.from({ length: 49 }, (_, i) => pair(map({ x: overlay.x + Math.cos(i * Math.PI / 24) * overlay.r, y: overlay.y + Math.sin(i * Math.PI / 24) * overlay.r * ratio }))) });
    }
  }
}

/** Read-only scene presentation; never imports a generator or changes grading. */
export function sourceScene3D({ media, overlays = [] } = {}) {
  if (!validMedia(media)) return null;
  const png = PNGS.get(media.url), svg = SVGS.get(media.url), source = png || svg;
  if (!source || !Array.isArray(overlays)) return null;
  const map = png ? pngPoint : point => svgPoint(svg, point);
  let carrierIndex = null, ownershipEvidence = 'Ownership is unspecified in this authored snapshot.';
  if (png && OWNER_REFS[png.id]) {
    const [index, phrase] = OWNER_REFS[png.id];
    if (!png.desc.includes(phrase)) return null;
    carrierIndex = index; ownershipEvidence = phrase;
  } else if (svg) {
    carrierIndex = svg.actors.findIndex(actor => actor.puckOffset);
    if (carrierIndex < 0) return null;
    ownershipEvidence = `${svg.file}: puck is a child of the gold carrier's actor group; source question identifies YOU as that carrier.`;
  }
  const actors = source.actors.map((actor, index) => {
    const isFocus = png ? !!actor.you : index === carrierIndex;
    const direction = png ? { x: Math.cos(actor.facing * Math.PI / 180), y: Math.sin(actor.facing * Math.PI / 180) }
      : { x: actor.stick.x2 - actor.stick.x1, y: actor.stick.y2 - actor.stick.y1 };
    const label = png ? actor.tag : isFocus ? 'YOU' : actor.goalie ? 'G' : actor.team === 'y' ? `F${index}` : `D${index}`;
    return { id: `${source.id}-actor-${index}`, label, name: label, role: actor.goalie ? 'goalie' : 'skater',
      team: actor.team === 'y' ? 'away' : 'home', ...map(actor), facing: heading(map, actor, direction), isLearner: isFocus };
  });
  const rawPuck = png ? png.puck : { x: svg.actors[carrierIndex].x + svg.actors[carrierIndex].puckOffset.x, y: svg.actors[carrierIndex].y + svg.actors[carrierIndex].puckOffset.y };
  const originalPuck = map(rawPuck), puckOverlay = overlays.filter(overlay => overlay.kind === 'puck' && finitePoint(overlay)).at(-1);
  const overlayPuck = puckOverlay ? sourceSceneImagePoint(media, puckOverlay) : null;
  const puck = { ...(overlayPuck || originalPuck), owner: carrierIndex === null ? null : actors[carrierIndex].id };
  if (svg) {
    const carrier = actors[carrierIndex], c = Math.cos(carrier.facing), s = Math.sin(carrier.facing);
    puck.x = carrier.x + c * CARRY_OFFSET.forward - s * CARRY_OFFSET.lateral;
    puck.y = carrier.y + s * CARRY_OFFSET.forward + c * CARRY_OFFSET.lateral;
  }
  const polylines = [];
  for (const [index, motion] of (png?.motions || []).entries()) addArrow(polylines, `context-${index}`, [map({ x: motion.x1, y: motion.y1 }), map({ x: motion.x2, y: motion.y2 })]);
  for (const [index, flight] of (png?.flights || []).entries()) polylines.push({ id: `flight-${index}`, color: '#64748b', dashed: true, width: 1.5, points: [pair(map({ x: flight.x1, y: flight.y1 })), pair(map({ x: flight.x2, y: flight.y2 }))] });
  visibleOverlays(media, overlays, polylines);
  const bounds = png?.view === 'oz' ? { ...fullBounds, minX: -5.08 } : png?.view === 'dz' ? { ...fullBounds, maxX: 5.08 } : { ...fullBounds };
  return { id: source.id, state: { actors, puck }, bounds, focusActorId: actors.find(actor => actor.isLearner)?.id ?? null,
    overlays: { polylines }, playing: false, showBothGoals: true, caption: media.alt || source.desc,
    teamLabels: { home: 'Opponents', away: 'Your team' },
    provenance: { sourceFile: png ? definitions.sourceFile : svg.file, sourceId: source.id,
      coordinateFrame: png ? `600x300 source rink; ${png.view} image crop decoded before metric conversion` : `1200x800 SVG; ${svg.sourceFrame.direction}; ice rectangle converted to metric rink`,
      ownershipEvidence, originalPuck, overlayPuck,
      puckPresentation: svg ? 'Oversized SVG icon offset replaced by the shared stick carry contact; original point retained.' : 'Authored puck coordinate retained.',
      motion: 'Untimed authored context marks only: no actor movement or continuation invented.',
    } };
}
