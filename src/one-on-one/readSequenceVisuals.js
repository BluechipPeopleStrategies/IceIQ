import { NHL_200X85_PROFILE } from '../scenario-engine/rinkFrame.js';

const RINK_BOUNDS = NHL_200X85_PROFILE.bounds;
const GOAL_X = NHL_200X85_PROFILE.landmarks.goalLineRight[0];
const SCENE_MARGIN = 1.5;
const PLAYER_HEIGHT = 2.1;
const VIEW_PADDING = 1.08;

/** Keep a 44px target plus its focus outline inside the measured canvas. */
export function clampReadSceneTargetCenter(center, size) {
  const insetX = Math.min(28, size.width / 2);
  const insetY = Math.min(28, size.height / 2);
  return [
    Math.max(insetX, Math.min(size.width - insetX, center[0])),
    Math.max(insetY, Math.min(size.height - insetY, center[1])),
  ];
}

/** Rendering data only: never change the lesson's coordinates or puck model. */
export function createReadSceneFrame(state, { time = 0, velocityById = {} } = {}) {
  const frame = structuredClone(state);
  frame.time = Number.isFinite(time) ? time : 0;
  for (const actor of frame.actors) {
    const velocity = velocityById?.[actor.id];
    actor.vx = Number.isFinite(velocity?.vx) ? velocity.vx : 0;
    actor.vy = Number.isFinite(velocity?.vy) ? velocity.vy : 0;
  }
  return frame;
}

/** Use the complete authored sequence so playback itself cannot move the camera. */
export function getReadSceneBounds(definition, { supportPoint = null, route = null, wide = false } = {}) {
  const full = { minX: 0, maxX: RINK_BOUNDS.maxX, minY: RINK_BOUNDS.minY, maxY: RINK_BOUNDS.maxY };
  if (wide) return full;

  const points = [
    { x: GOAL_X, y: -1.2 }, { x: GOAL_X + 1.2, y: 1.2 },
  ];
  const addState = state => points.push(...state.actors, state.puck);
  addState(definition.initialState);
  for (const branch of Object.values(definition.branches)) {
    addState(branch.state);
    for (const target of branch.read2.targets) {
      points.push(target);
      addState(target.state);
    }
  }
  if (supportPoint) points.push(supportPoint);
  if (route) points.push(...route);

  return {
    minX: Math.max(full.minX, Math.min(...points.map(point => point.x)) - SCENE_MARGIN),
    maxX: Math.min(full.maxX, Math.max(...points.map(point => point.x)) + SCENE_MARGIN),
    minY: Math.max(full.minY, Math.min(...points.map(point => point.y)) - SCENE_MARGIN),
    maxY: Math.min(full.maxY, Math.max(...points.map(point => point.y)) + SCENE_MARGIN),
  };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalized = vector => {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
};

/**
 * Orthographic high-oblique view using Three's default up [0, 1, 0].
 * Canonical [x, y] maps to world [y, height, -x]. Portrait looks down ice
 * with +x attacking screen-up; landscape retains the screen-right broadcast view.
 * Fit the whole bounds prism, including skater height, before applying aspect.
 */
export function getReadSceneCamera(bounds, aspect) {
  const { minX, maxX, minY, maxY } = bounds;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const target = [(minY + maxY) / 2, PLAYER_HEIGHT / 2, -(minX + maxX) / 2];
  const backward = normalized(safeAspect < 1 ? [0, 1.6, 1] : [1, 1.6, 0.3]);
  const rightAxis = normalized(cross([0, 1, 0], backward));
  const upAxis = cross(backward, rightAxis);
  const distance = Math.hypot(maxX - minX, maxY - minY, PLAYER_HEIGHT) + 10;
  const position = target.map((value, index) => value + backward[index] * distance);

  let horizontal = 0;
  let vertical = 0;
  let depth = 0;
  for (const x of [minX, maxX]) {
    for (const y of [minY, maxY]) {
      for (const height of [0, PLAYER_HEIGHT]) {
        const relative = [y - target[0], height - target[1], -x - target[2]];
        horizontal = Math.max(horizontal, Math.abs(dot(relative, rightAxis)));
        vertical = Math.max(vertical, Math.abs(dot(relative, upAxis)));
        depth = Math.max(depth, Math.abs(dot(relative, backward)));
      }
    }
  }
  const halfHeight = Math.max(vertical, horizontal / safeAspect) * VIEW_PADDING;
  const halfWidth = halfHeight * safeAspect;
  return {
    position,
    target,
    left: -halfWidth,
    right: halfWidth,
    top: halfHeight,
    bottom: -halfHeight,
    near: 0.1,
    far: distance + depth + 5,
  };
}
