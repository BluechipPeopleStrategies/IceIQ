import { sampleDraft, validateDraft } from './director.js';
import { normalizeFacingRadians } from '../scenario-engine/rinkFrame.js';

const MIN_ROUTE_SECONDS = 0.05;
const KEY_TIME_TOLERANCE = 1e-9;
const MAX_ROUTE_POINTS = 12;

function assertDraft(draft) {
  const validation = validateDraft(draft);
  if (!validation.ok) throw new TypeError(`Invalid director draft: ${validation.errs.join('; ')}`);
}

// This composes ordinary director-v1 keys. It replaces the selected actor's
// remaining motion and does not certify skating speed, turns or puck physics.
export function createDirectorRoutePlan(draft, { actorId, startTime, endTime, points, facingMode = 'keep' }) {
  assertDraft(draft);
  const actor = draft.actors.find(item => item.id === actorId);
  if (!actor) throw new RangeError('Choose an actor in this draft.');
  if (actor.frozen) throw new Error('Unfreeze this player before planning a route.');
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime < 0 || endTime > draft.duration || endTime <= startTime) {
    throw new RangeError('Route times must increase within the draft duration.');
  }
  // Allow floating-point subtraction at the 0.05-second editor boundary.
  const roundingTolerance = Number.EPSILON * Math.max(1, Math.abs(startTime), Math.abs(endTime)) * 4;
  if (endTime - startTime + roundingTolerance < MIN_ROUTE_SECONDS) throw new RangeError('Give the route at least 0.05 seconds.');
  if (facingMode !== 'keep' && facingMode !== 'travel') throw new RangeError('Facing mode must be keep or travel.');
  if (!Array.isArray(points) || points.length < 1 || points.length > MAX_ROUTE_POINTS) {
    throw new RangeError('A route needs from 1 through 12 destination points.');
  }

  const sampled = sampleDraft(draft, startTime).actors.find(item => item.id === actorId);
  const origin = { x: sampled.x, y: sampled.y, facing: sampled.facing };
  let previous = origin;
  let distanceM = 0;
  const destinations = Array.from(points, point => {
    if (!point || typeof point !== 'object' || Array.isArray(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new TypeError('Each route point needs finite x and y coordinates.');
    }
    const dx = point.x - previous.x;
    const dy = point.y - previous.y;
    const length = Math.hypot(dx, dy);
    if (!Number.isFinite(length) || length === 0) throw new RangeError('Adjacent route points must form a finite, non-zero segment.');
    distanceM += length;
    const destination = {
      x: point.x,
      y: point.y,
      facing: facingMode === 'keep' ? origin.facing : normalizeFacingRadians(Math.atan2(dy, dx)),
      distance: distanceM,
    };
    previous = destination;
    return destination;
  });

  let previousTime = startTime;
  const timedPoints = destinations.map(({ x, y, facing, distance }, index) => {
    const time = index === destinations.length - 1
      ? endTime
      : startTime + (endTime - startTime) * distance / distanceM;
    if (!Number.isFinite(time) || time - previousTime <= KEY_TIME_TOLERANCE) {
      throw new RangeError('Route key times are too close. Increase the interval or move the points farther apart.');
    }
    previousTime = time;
    return { time, x, y, facing };
  });

  const next = structuredClone(draft);
  const selected = next.actors.find(item => item.id === actorId);
  const earlierKeys = selected.keys.filter(key => key.time < startTime);
  if (earlierKeys.length && startTime - earlierKeys.at(-1).time <= KEY_TIME_TOLERANCE) {
    throw new RangeError('The route start time is too close to an earlier key.');
  }
  const replacedKeys = selected.keys.length - earlierKeys.length;
  // The start anchor protects earlier interpolation. With no later keys, the
  // existing sampler holds the last destination through the draft's end.
  selected.keys = [...earlierKeys, { time: startTime, ...origin }, ...timedPoints.map(point => ({ ...point }))];
  assertDraft(next);

  return { draft: next, origin, timedPoints, distanceM, replacedKeys, actorLabel: actor.label, startTime, endTime };
}
