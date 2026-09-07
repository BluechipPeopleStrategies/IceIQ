import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';
import { isCoachRoutePoint } from './coachRouteSurfaceInput.js';

// Match the shared Ice/Goal renderer exactly. The 15ft circles and blue lines
// 25ft either side of centre agree with NHL Rule 1's rink diagram:
// https://media.d3.nhle.com/image/private/t_document/prd/slwjuaqwmuvj5bkplixo.pdf
// The existing renderer's goal line remains its authored profile position;
// this tour does not silently change that legacy anchor or teach dimensions.
export const RINK_DISCOVERY_GEOMETRY = Object.freeze({
  bounds: NHL_200X85_PROFILE.bounds,
  goalX: NHL_200X85_PROFILE.landmarks.goalLineRight[0],
  circleRadius: 4.572,
  circleCentres: Object.freeze([{ x: 0, y: 0 }, ...[-20.7264, 20.7264].flatMap(x => [-6.7056, 6.7056].map(y => ({ x, y })))].map(Object.freeze)),
  blueLines: Object.freeze([-7.62, 7.62]),
  puck: Object.freeze({ x: 12, y: -2 }),
});

export const RINK_DISCOVERY_PROMPTS = Object.freeze([
  { id: 'circle', prompt: 'Where is a faceoff circle?', hint: 'Look for a big circle painted on the ice.', found: 'You found a faceoff circle!' },
  { id: 'blue-line', prompt: 'Where is a blue line?', hint: 'Look for a straight blue stripe across the ice.', found: 'You found a blue line!' },
  { id: 'net', prompt: 'Where is a net?', hint: 'Look for the red frame with a net at one end.', found: 'You found a net!' },
  { id: 'puck', prompt: 'Where is the puck?', hint: 'Look for the little black puck resting on the ice.', found: 'You found the puck!' },
].map(Object.freeze));

// Neutral numbered locations are available for keyboard selection as well as
// direct ice taps. Every question uses the same four spots and checker.
export const RINK_DISCOVERY_SPOTS = Object.freeze([
  { id: 'spot-1', label: '1', x: 7.62, y: -8 },
  { id: 'spot-2', label: '2', x: RINK_DISCOVERY_GEOMETRY.goalX + .4, y: 0 },
  { id: 'spot-3', label: '3', x: 20.7264, y: 6.7056 },
  { id: 'spot-4', label: '4', ...RINK_DISCOVERY_GEOMETRY.puck },
].map(Object.freeze));

export function checkRinkDiscoveryPoint(featureId, point) {
  if (!isCoachRoutePoint(point)) return false;
  const { x, y } = point;
  const geometry = RINK_DISCOVERY_GEOMETRY;
  // These are generous interaction tolerances, not changed rink dimensions or
  // a precision test. Circle interiors count; the net includes raised-frame
  // projection onto the ice behind it in an oblique camera.
  if (featureId === 'circle') return geometry.circleCentres.some(centre => Math.hypot(x - centre.x, y - centre.y) <= geometry.circleRadius + .45);
  if (featureId === 'blue-line') return geometry.blueLines.some(line => Math.abs(x - line) <= .9);
  if (featureId === 'net') return Math.abs(y) <= 1.65 && Math.abs(x) >= geometry.goalX - .85 && Math.abs(x) <= geometry.goalX + 2.2;
  if (featureId === 'puck') return Math.hypot(x - geometry.puck.x, y - geometry.puck.y) <= 1.25;
  return false;
}

export function createRinkDiscoverySession() {
  return { index: 0, found: [], status: 'ready', complete: false };
}

export function answerRinkDiscovery(session, point) {
  if (session.complete || session.status === 'found') return session;
  const feature = RINK_DISCOVERY_PROMPTS[session.index];
  if (!feature || !checkRinkDiscoveryPoint(feature.id, point)) return { ...session, status: 'try-again' };
  return { ...session, found: session.found.includes(feature.id) ? [...session.found] : [...session.found, feature.id], status: 'found' };
}

export function advanceRinkDiscovery(session) {
  if (session.complete || session.status !== 'found') return session;
  const index = session.index + 1;
  return { ...session, found: [...session.found], index, status: 'ready', complete: index === RINK_DISCOVERY_PROMPTS.length };
}
